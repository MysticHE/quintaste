import unittest
from unittest.mock import patch
import recipe_policy as r
import publisher as p
import workflow as w


class RecipePolicy(unittest.TestCase):
    def test_named_pungent_ingredients_and_derivatives_are_blocked(self):
        for name in ['Garlic chives','Garlic powder','Onion oil','Spring onions','Scallions',
                     'Shallot sauce','Leeks','Asafoetida','Hing','Heeng','Bawang merah',
                     'Kucai','蒜粉','韭菜','青蔥','興渠']:
            with self.subTest(name=name):
                self.assertIsNotNone(r.problem({'ingredients':[{'name':name}]}))
                with self.assertRaises(ValueError):p.recipe_data({'recipe':{'ingredients':[{'name':name}]}},[])

    def test_simple_eligible_recipe_and_unknown_composition(self):
        soup={'name':'Sweet potato soup','ingredients':[{'name':n} for n in ['Sweet potato','Pandan','Ginger','Sugar','Water']]}
        self.assertIsNone(r.problem(soup))
        self.assertIsNotNone(r.problem(dict(soup,compoundIngredientsUnconfirmed=['sauce'])))
        self.assertIsNotNone(r.problem(dict(soup,steps=[{'instruction':'Add garlic'}])))
        self.assertIsNotNone(r.problem(dict(soup,dietary={'contains':['Chives']})))

    def test_old_approved_pungent_recipe_never_starts_image_work(self):
        packet={'role':'qt-cooker','records':[{'id':'old','status':'proposed','recipe':{'name':'Garlic eggs','ingredients':[]}}]}
        with patch.object(w,'reserve') as reserve:
            self.assertEqual(w.recipe_image([packet],{'decisions':[{'id':'old','decision':'ready-for-editorial-review'}]}, {})['status'],'no-eligible-new-recipe')
            reserve.assert_not_called()

