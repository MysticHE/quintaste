-- Checks on a loaded library (run after load.py, values.sql and seed.py). Every query should return the counts shown in
-- its comment; anything else is a fault to fix in the build, not in the database.
\set ON_ERROR_STOP on
\pset footer off
-- 1. Every food has an English and a Chinese name (expect 0).
SELECT 'foods without both names' AS check, count(*) FROM library.food WHERE name_en = '' OR name_zh = '';
-- 2. Every food has at least one measured record (expect 0).
SELECT 'foods without a measured record', count(*) FROM library.food f
  WHERE NOT EXISTS (SELECT 1 FROM library.food_source s WHERE s.food = f.key AND s.role = 'measured');
-- 3. Foods holding two records of one dataset: only same-named records whose figures agree (report).
SELECT 'foods with two records of one dataset', count(*) FROM (
  SELECT food, dataset FROM library.food_source WHERE role = 'measured' GROUP BY 1, 2 HAVING count(*) > 1) x;
-- 4. Every normalised food is either in the library or says why not (expect 0).
SELECT 'records neither used nor explained', count(*) FROM library.source_food f
  WHERE f.left_out = '' AND NOT EXISTS (SELECT 1 FROM library.food_source s WHERE s.dataset = f.dataset AND s.source_id = f.source_id);
-- 5. Every food has an energy figure (expect 0); protein or fat can be missing where a table leaves them blank (report).
SELECT 'foods without energy', count(*) FROM library.food f
  WHERE NOT EXISTS (SELECT 1 FROM library.food_value v WHERE v.food = f.key AND v.nutrient = 'kcal');
SELECT 'foods without protein or fat', count(*) FROM library.food f
  WHERE (SELECT count(*) FROM library.food_value v WHERE v.food = f.key AND v.nutrient IN ('protein', 'fat')) < 2;
-- 6. Names that repeat within a kind, group and state: candidates for a missed merge or a missing qualifier (report).
SELECT 'repeated English names', count(*) FROM (
  SELECT lower(name_en), kind, category, state FROM library.food GROUP BY 1, 2, 3, 4 HAVING count(*) > 1) x;
-- 7. Library at a glance (report).
SELECT kind, category, count(*) AS foods,
       count(*) FILTER (WHERE (SELECT count(DISTINCT dataset) FROM library.food_source s WHERE s.food = f.key AND s.role = 'measured') > 1)
         AS multi_source
FROM library.food f GROUP BY ROLLUP (kind, category) ORDER BY kind NULLS LAST, category NULLS LAST;
-- 8. Nutrient coverage for ingredients (report): share of ingredient foods with each figure.
SELECT n.key, round(100.0 * count(v.food) / NULLIF((SELECT count(*) FROM library.food WHERE kind = 'ingredient'), 0), 1) AS pct
FROM library.nutrient n LEFT JOIN library.food_value v ON v.nutrient = n.key
  AND v.food IN (SELECT key FROM library.food WHERE kind = 'ingredient')
GROUP BY n.key, n.position ORDER BY n.position;
-- 9. Kitchen layer: keys linked to a food, and figures that spread widely (report).
SELECT 'kitchen keys', count(*), count(food) AS linked FROM library.ingredient;
SELECT 'figures flagged disagree', count(*) FROM library.food_value WHERE 'disagree' = ANY(flags);
