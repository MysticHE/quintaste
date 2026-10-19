"""Nutrition estimates from the v2 ingredient table: weights from units, honest gaps, page figures first."""
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

import nutrition as n

TABLE = {
    'version': 2, 'units': {'ml': 1, 'tbsp': 15, 'tsp': 5, 'cup': 240},
    'foods': {
        'water': {'name': 'Water', 'negligible': True, 'match': ['^water']},
        'tofu_firm': {'name': 'Tofu, firm', 'match': ['firm tofu', '^tofu'], 'per100g': {'kcal': 78, 'protein': 8, 'fat': 4, 'carbs': 2, 'fibre': 1, 'sugar': 0.5, 'sodium': 12}},
        'soy_sauce': {'name': 'Soy sauce', 'gPerMl': 1.0, 'match': ['soy sauce', 'light soy'], 'per100g': {'kcal': 53, 'protein': 8, 'fat': 0.6, 'carbs': 5, 'fibre': 0.8, 'sugar': 0.4, 'sodium': 5493}},
        'garlic': {'name': 'Garlic', 'each': 3, 'per': {'cloves': 3}, 'match': ['garlic'], 'per100g': {'kcal': 149, 'protein': 6, 'fat': 0.5, 'carbs': 33, 'fibre': 2, 'sugar': 1, 'sodium': 17}},
        'tempeh': {'name': 'Tempeh', 'match': ['tempeh'], 'per100g': {'kcal': 192, 'protein': 20, 'fat': 11, 'carbs': 8, 'fibre': None, 'sugar': None, 'sodium': 9}},
        'legacy_almonds': {'name': 'Nuts, almonds', 'legacy': True, 'match': ['(?<![a-z])almonds(?![a-z])'], 'per100g': {'kcal': 579, 'protein': 21, 'fat': 50, 'carbs': 22, 'fibre': 12.5, 'sugar': 4, 'sodium': 1}},
    },
}


class Estimates(unittest.TestCase):
    def setUp(self):
        self.dir = tempfile.TemporaryDirectory()
        self.root = Path(self.dir.name)
        (self.root / 'nutrition_sg.json').write_text(json.dumps(TABLE), encoding='utf-8')

    def tearDown(self):
        self.dir.cleanup()

    def test_weights_come_from_units_and_to_taste_is_skipped(self):
        recipe = {'servings': 2, 'ingredients': [
            {'name': 'Firm tofu, cubed', 'amount': 300, 'unit': 'g'},
            {'name': 'Light soy sauce', 'amount': 2, 'unit': 'tbsp'},
            {'name': 'Garlic, minced', 'amount': 2, 'unit': 'cloves'},
            {'name': 'Water', 'amount': 500, 'unit': 'ml'},
            {'name': 'Salt', 'amount': None, 'unit': ''}]}
        found = n.estimate(self.root, recipe)
        self.assertEqual(found['basis'], 'estimate')
        self.assertEqual(found['coverage'], 1.0)
        per = found['perServing']
        # 300 g tofu (234 kcal) + 30 g soy (15.9) + 6 g garlic (8.9) = 258.8 kcal, halved.
        self.assertEqual(per['kcal'], 129)
        self.assertAlmostEqual(per['sodium'], (36 + 1647.9 + 1.02) / 2, places=0)
        self.assertEqual(set(per), {'kcal', 'protein', 'fat', 'carbs', 'fibre', 'sugar', 'sodium'})

    def test_longest_alias_wins(self):
        loaded = n.table(self.root)
        self.assertEqual(n._match('Light soy sauce', loaded)[0], 'soy_sauce')
        self.assertEqual(n._match('Firm tofu', loaded)[0], 'tofu_firm')
        self.assertEqual(n._match('Roasted almonds', loaded)[0], 'legacy_almonds')
        self.assertIsNone(n._match('Almondsmilk', loaded))

    def test_unweighable_line_without_cooker_grams_gives_no_figures(self):
        recipe = {'servings': 2, 'ingredients': [{'name': 'Firm tofu', 'amount': 300, 'unit': 'g'}, {'name': 'Mystery leaf', 'amount': 1, 'unit': 'bunch'}]}
        self.assertIsNone(n.estimate(self.root, recipe))
        recipe['ingredients'][1]['grams'] = 20
        found = n.estimate(self.root, recipe)
        self.assertEqual(found['coverage'], 0.94)  # 300 of 320 g matched; the Cooker's weight counts against coverage only
        recipe['ingredients'][1]['grams'] = 60
        self.assertIsNone(n.estimate(self.root, recipe))  # 300 of 360 g is below 90%

    def test_cooker_grams_do_not_override_table_weights(self):
        recipe = {'servings': 1, 'ingredients': [{'name': 'Soy sauce', 'amount': 1, 'unit': 'tbsp', 'grams': 900}]}
        self.assertEqual(n.estimate(self.root, recipe)['perServing']['sodium'], round(15 * 54.93, 1))

    def test_nutrient_missing_from_a_large_share_is_left_out(self):
        recipe = {'servings': 1, 'ingredients': [{'name': 'Tempeh, cubed', 'amount': 150, 'unit': 'g'}, {'name': 'Firm tofu', 'amount': 100, 'unit': 'g'}]}
        per = n.estimate(self.root, recipe)['perServing']
        self.assertNotIn('fibre', per)
        self.assertNotIn('sugar', per)
        self.assertEqual(per['kcal'], 366)
        small = {'servings': 1, 'ingredients': [{'name': 'Tempeh', 'amount': 10, 'unit': 'g'}, {'name': 'Firm tofu', 'amount': 300, 'unit': 'g'}]}
        self.assertIn('fibre', n.estimate(self.root, small)['perServing'])

    def test_page_figures_come_first_and_only_for_matching_servings(self):
        page = {'recipeYield': ['4'], 'nutrition': {'calories': '210 kcal', 'proteinContent': '9 g', 'fatContent': '7 g', 'carbohydrateContent': '28 g', 'sodiumContent': '0.4 g'}}
        recipe = {'servings': 4, 'ingredients': [{'name': 'Firm tofu', 'amount': 300, 'unit': 'g'}]}
        found = n.attach(self.root, recipe, page, 'example.org')
        self.assertEqual(found['basis'], 'source')
        self.assertEqual(found['perServing']['sodium'], 400.0)
        recipe['servings'] = 2
        self.assertEqual(n.attach(self.root, recipe, page, 'example.org')['basis'], 'estimate')

    def test_old_table_format_is_refused(self):
        (self.root / 'nutrition_sg.json').write_text(json.dumps({'version': 1, 'items': {}}), encoding='utf-8')
        with self.assertRaises(ValueError):
            n.table(self.root)


class Backfill(unittest.TestCase):
    def test_live_recipe_without_page_figures_gets_an_estimate_revision(self):
        import publisher as p
        live = {'records': [{'kind': 'recipe', 'id': 'r1', 'data': {'name': 'Tofu', 'servings': 2, 'revision': 1, 'adaptationNote': 'x',
                 'sourceRating': {'url': 'https://example.org/r', 'site': 'example.org'}, 'provenance': {'sources': ['https://example.org/r']},
                 'ingredients': [{'id': 'a', 'name': 'Firm tofu', 'amount': 300, 'unit': 'g'}]}}]}
        figures = {'basis': 'estimate', 'perServing': {'kcal': 117}, 'coverage': 1.0, 'checkedAt': '2026-10-19'}
        candidates, held = [], []
        with patch('recipe_quality.fetch', return_value={'recipe': {}}), patch.object(n, 'estimate', return_value=figures), \
             patch.object(p, 'sources', return_value=[{'url': 'https://example.org/r', 'checkedAt': '2026-10-19'}]), patch.object(p, 'server_recipe_problem', return_value=None):
            p.nutrition_candidates(live, {('recipe', 'r1'): 'h'}, {}, candidates, held)
        self.assertEqual(held, [])
        self.assertEqual(len(candidates), 1)
        self.assertEqual(candidates[0]['data']['nutrition'], figures)
        self.assertEqual(candidates[0]['data']['revision'], 2)
        self.assertEqual(candidates[0]['sources'][0]['url'], 'https://example.org/r')

    def test_live_recipe_with_no_figures_at_all_stays_unchanged(self):
        import publisher as p
        live = {'records': [{'kind': 'recipe', 'id': 'r1', 'data': {'name': 'Tofu', 'servings': 2, 'revision': 1, 'sourceRating': {'url': 'https://example.org/r', 'site': 'example.org'},
                 'provenance': {'sources': ['https://example.org/r']}, 'ingredients': [{'id': 'a', 'name': 'Mystery', 'amount': 1, 'unit': 'bunch'}]}}]}
        candidates, held = [], []
        with patch('recipe_quality.fetch', return_value={'recipe': {}}), patch.object(n, 'estimate', return_value=None):
            p.nutrition_candidates(live, {}, {}, candidates, held)
        self.assertEqual((candidates, held), ([], []))


if __name__ == '__main__':
    unittest.main()
