import { pool,logger } from '../config.mjs';
import { transaction } from '../community/http.mjs';
import { foodReviewEnabled,stageFoodReview } from './core.mjs';
import { tellAuthor } from '../reactions/router.mjs';

/** Fair, bounded catch-up of existing submitted food. Visibility changes only after an actual reviewed verdict. */
export async function scanFood(){
  if(!await foodReviewEnabled(pool))return;
  await transaction(async db=>{
    if(!(await db.query("SELECT pg_try_advisory_xact_lock(hashtextextended('food-scan',0)) AS ok")).rows[0].ok)return;
    const cursor=(await db.query('SELECT cursor FROM ops.food_scan WHERE id FOR UPDATE')).rows[0]?.cursor??'';
    const rows=(await db.query(`SELECT * FROM (
      SELECT 'recipe' AS kind,id::text AS target FROM recipes.recipe WHERE NOT private AND pending_state='review'
      UNION ALL SELECT 'listing',id::text FROM market.listing WHERE status='active' OR status='draft' AND removed_reason='QT food review pending'
      UNION ALL SELECT 'class',id::text FROM social.class WHERE status='posted'
      UNION ALL SELECT 'gathering',id::text FROM social.gathering WHERE state='posted'
      UNION ALL SELECT 'cooked-photo',id::text FROM community.cooked_photo
    ) t WHERE kind||':'||target>$1 ORDER BY kind,target LIMIT 20`,[cursor])).rows;
    for(const row of rows)await stageFoodReview(db,row.kind,row.target,'pending',false);
    await db.query('UPDATE ops.food_scan SET cursor=$1 WHERE id',[rows.length?rows.at(-1).kind+':'+rows.at(-1).target:'']);
    await db.query("DELETE FROM ops.food_review_photo p USING ops.food_review r WHERE p.review_id=r.id AND r.state IN ('clear','held','superseded') AND r.updated_at<now()-interval '30 days'");
  });
  // The existing alert ledger deduplicates by author/member/recipe; pending photos never notify their author early.
  const cleared=(await pool.query(`SELECT DISTINCT p.recipe_id,p.user_id FROM ops.food_review r JOIN community.cooked_photo p ON p.id::text=r.target
    JOIN recipes.recipe mr ON p.recipe_id='member-'||mr.id::text
    WHERE r.kind='cooked-photo' AND r.state='clear' AND p.hidden_at IS NULL AND mr.author_id IS NOT NULL AND mr.author_id<>p.user_id
    AND NOT EXISTS(SELECT 1 FROM community.push_once po WHERE po.key='cookedPhoto:'||p.user_id||':'||p.recipe_id) LIMIT 100`)).rows;
  for(const row of cleared)await tellAuthor(row.recipe_id,row.user_id,'cookedPhoto');
}
export function startFoodScan(){
  let busy=false,closed=false;
  const tick=async()=>{if(busy||closed)return;busy=true;try{await scanFood();}catch(error){logger.warn({event:'food_scan_failed',code:error?.code});}finally{busy=false;}};
  const first=setTimeout(tick,10000).unref(),timer=setInterval(tick,60000).unref();
  return ()=>{closed=true;clearTimeout(first);clearInterval(timer);};
}
