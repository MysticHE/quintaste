"""Guard against false certification and lost identity in the Mixed tracker."""
import unittest
from pathlib import Path
from tempfile import TemporaryDirectory
from unittest.mock import patch

import openpyxl

import explore_tracker as t


class MixedTrackerGuards(unittest.TestCase):
    def setUp(self):
        self.wb = openpyxl.Workbook()
        self.wb.active.title = 'Read me'
        self.wb['Read me'].append(['Item', 'Value'])
        self.wb['Read me'].append(['Schema version', t.SCHEMA])
        for name, columns in t.SHEETS.items():
            t.replace_sheet(self.wb, name, columns, [])
        self.candidate = {key: t.ENUMS[key][0] if key in t.ENUMS else None for key in t.MIXED_COLUMNS}
        self.candidate.update({'Candidate ID': 'vo-example-123456', 'Google place ID': 'ChIJexample1234',
                               'Postcode': '018984', 'Historical website name match': False,
                               'Owner suppression': False, 'Bot attempts': 0,
                               'Publication status': 'NOT_PUBLISHED', 'Review batch ID': 'MK-001'})
        self.batch = {'Review batch ID': 'MK-001', 'Kitchen': 'MIXED_KITCHEN',
                      'Review batch status': 'PLANNED', 'Candidate count': 1,
                      'Research checked count': 0, 'Pending count': 1, 'Held count': 0,
                      'Not qualified count': 0, 'Published reported count': 0}

    def write(self, candidates=None):
        t.replace_sheet(self.wb, 'Mixed candidates', t.MIXED_COLUMNS, candidates or [self.candidate])
        t.replace_sheet(self.wb, 'Mixed batches', t.RESEARCH_BATCH_COLUMNS, [self.batch])

    def test_save_retries_temporary_windows_destination_lock(self):
        self.write()
        original_replace = Path.replace
        attempts = []
        def replace(source, destination):
            attempts.append(source)
            if len(attempts) == 1:
                raise PermissionError('Temporary destination lock')
            return original_replace(source, destination)
        with TemporaryDirectory() as directory:
            target = Path(directory) / 'tracker.xlsx'
            target.write_bytes(b'previous workbook')
            with patch.object(Path, 'replace', replace), patch.object(t.time, 'sleep') as sleep:
                t.save(self.wb, target)
            saved = openpyxl.load_workbook(target)
            try:
                self.assertEqual(t.validate(saved)['mixedCandidates']['total'], 1)
            finally:
                saved.close()
            self.assertEqual(len(attempts), 2)
            sleep.assert_called_once_with(1)

    def test_persistent_destination_lock_preserves_previous_workbook(self):
        self.write()
        with TemporaryDirectory() as directory:
            target = Path(directory) / 'tracker.xlsx'
            target.write_bytes(b'previous workbook')
            with patch.object(Path, 'replace', side_effect=PermissionError('Still locked')), patch.object(t.time, 'sleep'):
                with self.assertRaises(PermissionError):
                    t.save(self.wb, target)
            self.assertEqual(target.read_bytes(), b'previous workbook')
            self.assertTrue(target.with_suffix('.tmp.xlsx').exists())

    def test_unverified_import_is_allowed(self):
        self.write()
        self.assertEqual(t.validate(self.wb)['mixedCandidates']['researchChecked'], 0)

    def test_duplicate_google_identity_is_rejected(self):
        other = dict(self.candidate, **{'Candidate ID': 'vo-other-234567'})
        self.batch.update({'Candidate count': 2, 'Pending count': 2})
        self.write([self.candidate, other])
        with self.assertRaisesRegex(AssertionError, 'Google ID duplicated'):
            t.validate(self.wb)

    def test_bot_publication_cannot_certify_live_publication(self):
        self.candidate.update({'Bot status': 'PUBLISHED', 'Publication status': 'PUBLISHED_VERIFIED'})
        self.batch.update({'Pending count': 0, 'Published reported count': 1})
        self.write()
        with self.assertRaisesRegex(AssertionError, 'Bot publication alone'):
            t.validate(self.wb)

    def test_research_checked_requires_actual_evidence_date_and_scope(self):
        self.candidate['Research status'] = 'CHECKED'
        self.write()
        with self.assertRaisesRegex(AssertionError, 'lacks evidence/scope/date'):
            t.validate(self.wb)

    def test_venue_cover_is_supported_without_a_food_menu(self):
        self.candidate.update({'Cover status': 'VERIFIED', 'Cover type': 'VENUE',
                               'Cover source': 'https://example.com/venue.jpg',
                               'Cover rights': 'Owner-authorized exact-outlet exterior photo; inspected.'})
        self.write()
        self.assertEqual(t.validate(self.wb)['mixedCandidates']['total'], 1)

    def test_unlicensed_venue_cover_is_rejected(self):
        self.candidate.update({'Cover status': 'VERIFIED', 'Cover type': 'VENUE',
                               'Cover source': 'https://example.com/venue.jpg'})
        self.write()
        with self.assertRaisesRegex(AssertionError, 'Cover lacks'):
            t.validate(self.wb)

    def test_incomplete_batch_cannot_be_marked_checked(self):
        self.batch['Review batch status'] = 'RESEARCH_CHECKED'
        self.write()
        with self.assertRaisesRegex(AssertionError, 'Incomplete research batch'):
            t.validate(self.wb)

    def test_retained_bot_evidence_cannot_certify_eligibility(self):
        self.candidate.update({'Identity validation':'VERIFIED', 'Operation validation':'VERIFIED',
                               'Mixed eligibility':'VERIFIED', 'Menu status':'VERIFIED_PARTIAL',
                               'Evidence IDs':'import-only'})
        self.wb['Evidence'].append(['import-only','MIXED_CANDIDATE',self.candidate['Candidate ID'],
                                   'SECONDARY','snapshot.json','RETAINED_FACT',None,None,
                                   'Workflow import','Bot reported verified','IMPORT_ONLY',False,None,None])
        self.write()
        with self.assertRaisesRegex(AssertionError, 'accepted menu evidence'):
            t.validate(self.wb)

    def google_gate_fixture(self, result='ACCESS_LIMITED'):
        t.setmeta(self.wb, 'Required Google source checks', 'GOOGLE_SEARCH\nGOOGLE_MAPS_METADATA')
        self.candidate.update({'Research status':'CHECKED','Research checked date':'2026-10-24',
                               'Verification scope':'Actual source attempts; blocked access is not a negative finding.',
                               'Evidence IDs':'google-search\ngoogle-maps'})
        self.batch.update({'Research checked count':1,'Review batch status':'RESEARCH_CHECKED',
                           'Completed at':'2026-10-24T09:00:00Z'})
        for suffix,category,url in [('search','GOOGLE_SEARCH','https://www.google.com/search?q=example'),
                                    ('maps','GOOGLE_MAPS_METADATA','https://www.google.com/maps/search/?api=1&query=example')]:
            self.wb['Evidence'].append(['google-'+suffix,'MIXED_CANDIDATE',self.candidate['Candidate ID'],
                                       'BUSINESS_METADATA',url,result,None,'2026-10-24',
                                       'Actual attempt','Reader access limited','ACCESS_ONLY',False,None,None])
            self.wb['Source checks'].append(['check-'+suffix,'MIXED_CANDIDATE',self.candidate['Candidate ID'],
                                            category,result,'2026-10-24','google-'+suffix,'Actual direct URL attempt'])
        self.write()

    def test_required_google_checks_reject_website_only_completion(self):
        self.google_gate_fixture()
        self.wb['Source checks'].delete_rows(2)
        with self.assertRaisesRegex(AssertionError, 'Required GOOGLE_SEARCH check missing'):
            t.validate(self.wb)

    def test_documented_google_access_limits_remain_separate_from_eligibility(self):
        self.google_gate_fixture()
        result=t.validate(self.wb)['mixedCandidates']['requiredGoogleChecks']
        self.assertEqual(result['bothAttempted'],1)
        self.assertEqual(result['bothChecked'],0)
        self.assertEqual(result['bySource']['GOOGLE_SEARCH'],{'checked':0,'accessLimited':1,'notAttempted':0})
        self.assertEqual(result['bySource']['GOOGLE_MAPS_METADATA'],{'checked':0,'accessLimited':1,'notAttempted':0})
        self.assertEqual(self.candidate['Mixed eligibility'],'UNVERIFIED')

    def test_source_coverage_does_not_count_unattempted_or_missing_proof(self):
        self.google_gate_fixture('CHECKED')
        self.wb['Source checks'].delete_rows(2)
        result=t.google_check_coverage(self.wb,[self.candidate])
        self.assertEqual(result['bySource']['GOOGLE_SEARCH']['notAttempted'],1)
        self.assertEqual(result['bySource']['GOOGLE_MAPS_METADATA']['checked'],1)
        self.wb['Source checks'].cell(2,t.CHECK_COLUMNS.index('Evidence IDs')+1).value=None
        result=t.google_check_coverage(self.wb,[self.candidate])
        self.assertEqual(result['bySource']['GOOGLE_MAPS_METADATA']['checked'],0)

    def test_generic_web_url_cannot_satisfy_google_search(self):
        self.google_gate_fixture()
        self.wb['Evidence'].cell(2,t.EVIDENCE_COLUMNS.index('URL')+1).value='https://example.com/menu'
        with self.assertRaisesRegex(AssertionError, 'lacks direct Google URL'):
            t.validate(self.wb)


if __name__ == '__main__':
    unittest.main()
