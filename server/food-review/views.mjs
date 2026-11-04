/** Owner-only finding for the exact current food revision. Never use a client-supplied kind or table alias. */
export function foodMessageSql(kind,alias){
  if(!['listing','class','cooked-photo'].includes(kind)||!['l','c','cp'].includes(alias))throw new Error('Unknown food view');
  return `(SELECT fr.message FROM ops.food_review fr WHERE fr.kind='${kind}' AND fr.target=${alias}.id::text AND fr.state='held'
    AND fr.payload->'data'->>'submittedAt'=(extract(epoch FROM ${alias}.updated_at)*1000000)::bigint::text ORDER BY fr.created_at DESC LIMIT 1)`;
}
