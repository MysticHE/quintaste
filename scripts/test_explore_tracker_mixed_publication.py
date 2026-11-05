import unittest
from explore_tracker_mixed_publication import menu_items, publication_hours, reviewed_dishes

class MixedPublicationProjection(unittest.TestCase):
    def dish(self,**changes):
        value={'Dish ID':'review-dish-1','Dish':'Vegetarian Dumplings','Portion':'6 pieces','Channel':'Foodpanda delivery','Amount':12.5,'Currency':'SGD','Price qualifier':'From S$12.50','Merchant label':'Vegetarian section'}
        value.update(changes);return value

    def test_delivery_from_price_and_portion_survive(self):
        items,observations=menu_items([self.dish()],'')
        self.assertEqual(items[0]['price'],{'amount':12.5,'currency':'SGD','type':'from'})
        self.assertIn('6 pieces',items[0]['name']);self.assertEqual(items[0]['category'],'Delivery menu')
        self.assertIn('may differ from dine-in',items[0]['qualifier'])
        self.assertEqual(next(iter(observations.values())),['review-dish-1'])

    def test_unknown_currency_is_never_assumed_sgd(self):
        items,_=menu_items([self.dish(Currency='UNKNOWN',Amount=25,**{'Price qualifier':'Printed25'})],'')
        self.assertEqual(items[0]['price'],{'amount':25,'currency':'unknown','type':'displayed'})

    def test_page_labels_are_not_servings_or_blanket_vegan_claims(self):
        items,_=menu_items([self.dish(Portion='Vegan page1',**{'Merchant label':'Vegetarian/Vegan legend'})],'')
        self.assertEqual(items[0]['name'],'Vegetarian Dumplings');self.assertEqual(items[0]['diet'],'V')

    def test_repeated_observations_keep_all_evidence_ids(self):
        one=self.dish();two=self.dish(**{'Dish ID':'review-dish-2'})
        items,observations=menu_items([one,two],'')
        self.assertEqual(len(items),1);self.assertEqual(next(iter(observations.values())),['review-dish-1','review-dish-2'])

    def test_sides_and_required_broth_are_not_silently_certified(self):
        items,_=menu_items([self.dish()],'Mains only. Choose vegetarian broth and sauces.')
        self.assertIn('Choose vegetarian broth',items[0]['qualifier']);self.assertIn('omit unconfirmed soup and sides',items[0]['qualifier'])

    def test_source_reference_from_is_not_a_minimum_price(self):
        items,_=menu_items([self.dish(**{'Price qualifier':'Displayed S$12.50; not borrowed from another branch.'})],'')
        self.assertEqual(items[0]['price']['type'],'displayed')

    def test_starting_price_without_adjacent_number_is_not_fixed(self):
        for qualifier in ['Displayed SGD starting price; modifiers may increase price.', 'Displayed starting SGD delivery price; modifiers unknown.', 'FromS$6.75; options unconfirmed']:
            items,_=menu_items([self.dish(**{'Price qualifier':qualifier})],'')
            self.assertEqual(items[0]['price']['type'],'from')

    def test_unknown_portion_is_not_displayed_as_a_serving(self):
        items,_=menu_items([self.dish(Portion='Not stated')],'')
        self.assertEqual(items[0]['name'],'Vegetarian Dumplings')

    def test_buffet_choice_is_not_presented_as_standalone_food_order(self):
        items,_=menu_items([self.dish(Portion='Foodchoicewithin8/9coursebuffet',Amount=None)],'')
        self.assertEqual(items[0]['category'],'Set-menu choices')
        self.assertIsNone(items[0]['price']['amount'])

    def test_reviewed_shared_note_keeps_time_and_promotion_conditions_visible(self):
        note='Menu and availability may change. Breakfast until 11:00. Delivery promotional prices; confirm offers.'
        items,_=menu_items([self.dish(),self.dish(**{'Dish ID':'other','Dish':'Vegetarian Toast'})],'',note)
        self.assertTrue(all(i['qualifier']==note for i in items))
        with self.assertRaises(AssertionError):menu_items([self.dish()],'','Menu and availability may change.'+'x'*400)

    def test_hours_keep_partial_week_without_inventing_days(self):
        detail='Partner delivery Monday/Tuesday11:30-14:15 only retained. Remaining weekdays, walk-in and holidays unverified.'
        h=publication_hours({'summary':detail,'schedule':[],'notes':detail,'sourceUrl':'https://example.com/outlet','checkedAt':'2026-10-24','timezone':'Asia/Singapore'},'QUALIFIED')
        self.assertEqual(h['summary'],'Partial or qualified hours');self.assertEqual(' '.join(h['schedule']),detail)
        self.assertEqual(h['notes'],detail)

    def test_explicit_excel_selection_keeps_unapproved_observations_out(self):
        safe=self.dish();conditional=self.dish(**{'Dish ID':'conditional','Dish':'Unresolved sauce variant'})
        self.assertEqual(reviewed_dishes([safe,conditional],'Publication dish IDs: ["review-dish-1"]'),[safe])
        self.assertEqual(reviewed_dishes([safe,conditional],'No selection'),[safe,conditional])
        for ids in ['["missing"]','["review-dish-1","review-dish-1"]','[]']:
            with self.assertRaises(AssertionError):reviewed_dishes([safe,conditional],'Publication dish IDs: '+ids)

if __name__=='__main__':unittest.main()
