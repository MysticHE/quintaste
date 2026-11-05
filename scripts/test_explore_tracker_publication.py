"""Publication evidence and independently optional workbook-sheet regressions."""
import json
from pathlib import Path
from tempfile import TemporaryDirectory
from types import SimpleNamespace
import subprocess
import sys
import unittest

import openpyxl
import explore_tracker as t


def workbook():
    wb = openpyxl.Workbook()
    wb.active.title = 'Read me'
    wb['Read me'].append(['Item', 'Value'])
    wb['Read me'].append(['Schema version', t.SCHEMA])
    wb['Read me'].append(['Workbook revision', 'TEST-EXPORT'])
    for name, columns in t.SHEETS.items():
        t.replace_sheet(wb, name, columns, [])
    return wb


class OptionalSheets(unittest.TestCase):
    def test_validate_returns_summary_without_optional_hours_reviews(self):
        wb = workbook()
        del wb['Hours reviews']
        self.assertIsInstance(t.validate(wb), dict)

    def test_cli_validate_without_optional_hours_reviews(self):
        with TemporaryDirectory() as directory:
            path = Path(directory) / 'tracker.xlsx'
            wb = workbook()
            del wb['Hours reviews']
            wb.save(path)
            result = subprocess.run([sys.executable, '-X', 'utf8', str(Path(t.__file__)), '--workbook', str(path), 'validate'], capture_output=True, text=True)
            self.assertEqual(result.returncode, 0, result.stderr)
            self.assertTrue(json.loads(result.stdout)['passed'])

    def test_cover_validation_still_runs_without_hours_reviews(self):
        wb = workbook()
        del wb['Hours reviews']
        row = {column: t.ENUMS[column][0] if column in t.ENUMS else None for column in t.COVER_ACQUISITION_COLUMNS}
        row.update({'Acquisition ID': 'cover-1', 'Location ID': 'missing-location', 'Acquisition batch ID': 'TEST-1',
                    'Kitchen': 'VEG_KITCHEN', 'Live cover present': False, 'Input assessment status': 'NOT_CHECKED', 'Acquisition status': 'HELD_INPUT'})
        t.replace_sheet(wb, 'Cover acquisition', t.COVER_ACQUISITION_COLUMNS, [row])
        with self.assertRaises(AssertionError):
            t.validate(wb)


class VegPublicationEvidence(unittest.TestCase):
    def setUp(self):
        self.directory = TemporaryDirectory(dir=t.ROOT / '.local')
        self.addCleanup(self.directory.cleanup)
        root = Path(self.directory.name)
        self.path = root / 'tracker.xlsx'
        self.wb = workbook()
        self.pid = 'fixture-veg-place'
        location = {key: t.ENUMS[key][0] if key in t.ENUMS else None for key in t.LOCATION_COLUMNS}
        location.update({'Location ID': self.pid, 'Name': 'Fixture kitchen', 'Address': 'Fixture address', 'Kitchen': 'VEG_KITCHEN',
                         'Allium-free claim value': False, 'Publication status': 'NOT_PUBLISHED'})
        t.replace_sheet(self.wb, 'Locations', t.LOCATION_COLUMNS, [location])
        t.replace_sheet(self.wb, 'Publication batches', t.BATCH_COLUMNS, [{'Batch ID': 'VEG-TEST-1', 'Status': 'AUTHORIZED', 'Authorized count': 1}])
        self.wb.save(self.path)
        self.packet = {'batchId': 'VEG-TEST-1', 'workbookSha256': t.sha(self.path), 'workbookRevision': 'TEST-EXPORT',
                       'creations': [{'id': self.pid, 'data': {'name': 'Fixture kitchen'}}]}
        self.args = SimpleNamespace(**{key: str(root / (key + '.json')) for key in ['packet', 'receipt', 'verification', 'content', 'catalogue']})
        self.write('packet', self.packet)
        self.receipt = {'applied': True, 'reviewedInputSha256': t.sha(self.args.packet), 'appliedAt': '2026-11-05T12:00:00Z', 'backup': 'protected-test-backup'}
        self.proof = {'passed': True, 'internalExactFieldsVerified': True, 'deployedBrowserChecksPassed': True,
                      'reviewedInputSha256': t.sha(self.args.packet), 'checkedAt': '2026-11-05T12:01:00Z'}
        self.write('content', {'items': [{'id': self.pid, 'kind': 'place', 'data': {'name': 'Fixture kitchen'}, 'version': 1, 'hidden': False}]})
        self.write('catalogue', {'checkedAt': '2026-11-05T12:01:00Z', 'veg': {'venues': [{'id': self.pid}]}, 'mixed': {'venues': []}})

    def write(self, key, value):
        Path(getattr(self.args, key)).write_text(json.dumps(value), encoding='utf-8')

    def record(self):
        self.write('receipt', self.receipt)
        self.write('verification', self.proof)
        return t.record(self.wb, self.path, self.args)

    def rejected_without_changes(self):
        before = self.path.read_bytes()
        sheets = {s: list(self.wb[s].values) for s in self.wb.sheetnames}
        with self.assertRaises(AssertionError):
            self.record()
        self.assertEqual(self.path.read_bytes(), before)
        self.assertEqual({s: list(self.wb[s].values) for s in self.wb.sheetnames}, sheets)

    def test_verification_from_another_packet_is_rejected_without_mutating_workbook(self):
        self.proof['reviewedInputSha256'] = 'a' * 64
        self.rejected_without_changes()

    def test_missing_packet_binding_is_rejected(self):
        del self.proof['reviewedInputSha256']
        self.rejected_without_changes()

    def test_required_results_must_be_present_and_boolean_true(self):
        for key in ['passed', 'internalExactFieldsVerified', 'deployedBrowserChecksPassed']:
            original = dict(self.proof)
            for value in [False, None, 1, 'true']:
                with self.subTest(key=key, value=value):
                    self.proof = {**original, key: value}
                    self.rejected_without_changes()
            self.proof = {k: v for k, v in original.items() if k != key}
            with self.subTest(key=key, missing=True):
                self.rejected_without_changes()
            self.proof = original

    def test_matching_complete_proof_is_accepted(self):
        result = self.record()
        self.assertIsInstance(result, dict)
        saved = openpyxl.load_workbook(self.path)
        self.addCleanup(saved.close)
        self.assertEqual(t.records(saved, 'Locations')[0]['Publication status'], 'PUBLISHED_VERIFIED')
        self.assertEqual(t.records(saved, 'Publication batches')[0]['Status'], 'PUBLISHED_VERIFIED')
        self.assertEqual(len(t.records(saved, 'Publication events')), 1)

    def test_unapplied_or_unrelated_receipt_is_rejected(self):
        for key, value in [('applied', False), ('reviewedInputSha256', 'b' * 64)]:
            original = dict(self.receipt)
            self.receipt[key] = value
            with self.subTest(key=key):
                self.rejected_without_changes()
            self.receipt = original


if __name__ == '__main__':
    unittest.main()
