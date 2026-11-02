-- Clean figures (docs/AI_FOOD_LIBRARY_PLAN.md §2, best value per nutrient): rebuilds library.food_value from the measured
-- records of each food (copies never count). One record: its figure (rule single). Several: their median (rule median),
-- flagged "disagree" when the highest is more than 1.5 times the lowest AND further apart than a difference that matters
-- for that nutrient (fat 0.1 g against 0.3 g is not a disagreement; mascarpone at 28 g against 44 g fat is).
-- scripts/library/load.py runs this inside its own transaction after loading the clean layer. On its own:
--   docker exec -i quintaste-dev-db psql -U quintaste -d quintaste -1 -v ON_ERROR_STOP=1 < scripts/library/values.sql
CREATE TEMP TABLE matters (nutrient text PRIMARY KEY, gap numeric NOT NULL) ON COMMIT DROP;
INSERT INTO matters VALUES
  ('kcal', 20), ('protein', 1.5), ('fat', 1.5), ('satFat', 1), ('carbs', 3), ('carbsAvailable', 3), ('sugar', 2),
  ('fibre', 1), ('sodium', 50), ('water', 4), ('ash', 0.5), ('vitA', 50), ('vitC', 5), ('vitD', 1), ('vitE', 1), ('b12', 0.3),
  ('folate', 20), ('iron', 1), ('calcium', 30), ('zinc', 0.5), ('magnesium', 15), ('potassium', 100), ('iodine', 10),
  ('ala', 0.1), ('lysine', 100), ('methionine', 50);
-- A nutrient without a gap here would get no figures at all: stop instead of dropping it.
DO $$
DECLARE missing text;
BEGIN
  SELECT string_agg(key, ', ') INTO missing FROM library.nutrient WHERE key NOT IN (SELECT nutrient FROM matters);
  IF missing IS NOT NULL THEN
    RAISE EXCEPTION 'values.sql: add a gap for nutrient(s) %', missing;
  END IF;
END $$;
DELETE FROM library.food_value;
WITH figures AS (
  SELECT s.food, v.nutrient, v.dataset, v.source_id, v.value
  FROM library.food_source s
  JOIN library.source_value v ON v.dataset = s.dataset AND v.source_id = s.source_id
  WHERE s.role = 'measured'
), chosen AS (
  SELECT food, nutrient, count(*) AS n, min(value) AS low, max(value) AS high,
         percentile_cont(0.5) WITHIN GROUP (ORDER BY value) AS median,
         jsonb_agg(jsonb_build_object('dataset', dataset, 'id', source_id, 'value', value) ORDER BY dataset, source_id) AS sources
  FROM figures GROUP BY food, nutrient
)
INSERT INTO library.food_value (food, nutrient, value, rule, sources, flags)
SELECT c.food, c.nutrient, round(c.median::numeric, 4), CASE WHEN c.n = 1 THEN 'single' ELSE 'median' END, c.sources,
       CASE WHEN c.n > 1 AND c.high > c.low * 1.5 AND c.high - c.low > m.gap THEN ARRAY['disagree'] ELSE '{}' END
FROM chosen c JOIN matters m ON m.nutrient = c.nutrient;
SELECT rule, count(*) AS figures, count(*) FILTER (WHERE 'disagree' = ANY(flags)) AS disagree FROM library.food_value
GROUP BY rule ORDER BY rule;
