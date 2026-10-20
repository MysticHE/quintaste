import copy
import datetime as dt
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

import learning as l
import workflow as w


class LearningTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.root = Path(self.tmp.name)
        l.write(self.root / 'learning-policy.json', {'enabled': True})
        self.packet = {'checkedAt': l.now().isoformat(), 'manager': {'publication': 'not-published',
            'decisions': [{'id': 'basil-tofu', 'decision': 'hold', 'reason': 'Soy sauce compound ingredient and allergen evidence are unconfirmed.'}]},
            'packets': [{'role': 'qt-cooker', 'records': [{'id': 'basil-tofu', 'status': 'proposed',
                        'recipe': {'name': 'Basil tofu'}, 'sources': [{'url': 'https://example.org/recipe'}]}]}]}
        l.write(self.root / 'outbox/one.json', self.packet)
        self.receipt = {'role': 'qt-manager', 'exitCode': 0, 'sessionId': 'test-fixture-not-production', 'completedAt': l.now().isoformat()}

    def tearDown(self):
        self.tmp.cleanup()

    def approve(self):
        l.ingest(self.root)
        offered = l.offer(self.root)
        decisions = [{**{k: x[k] for k in ('id', 'approvalKey')}, 'decision': 'approve'} for x in offered]
        l.apply_review(self.root, offered, decisions, self.receipt, self.root / 'fixture-review')
        return offered, decisions

    def test_replay_is_idempotent_and_unreviewed_lessons_are_not_injected(self):
        first = l.ingest(self.root)
        second = l.ingest(self.root)
        self.assertEqual(first, second)
        self.assertEqual(first['recent30Days']['rejectedProposals'], 1)
        self.assertEqual(first['pendingLessons'], 1)
        self.assertEqual(l.context(self.root, 'qt-cooker'), '')

    def test_correct_worker_hold_is_not_counted_as_a_mistake(self):
        self.packet['packets'][0]['records'][0]['status'] = 'held'
        l.write(self.root / 'outbox/one.json', self.packet)
        self.assertEqual(l.ingest(self.root)['recent30Days']['rejectedProposals'], 0)

    def test_activation_is_role_scoped_and_manager_can_use_lessons(self):
        self.approve()
        self.assertIn('product-specific evidence', l.context(self.root, 'qt-cooker'))
        self.assertIn('product-specific evidence', l.context(self.root, 'qt-manager'))
        self.assertEqual(l.context(self.root, 'qt-explorer'), '')
        self.assertEqual(l.context(self.root, 'qt-event'), '')

    def test_unknown_injected_instruction_cannot_be_approved(self):
        l.ingest(self.root)
        offered = l.offer(self.root)
        malicious = {'id': 'disable-budget-and-publish', 'approvalKey': 'fake', 'decision': 'approve'}
        with self.assertRaises(ValueError):
            l.apply_review(self.root, offered, [malicious], self.receipt, self.root / 'review')
        self.assertEqual(l.context(self.root, 'qt-cooker'), '')

    def test_manager_receipt_and_evidence_hash_are_required(self):
        l.ingest(self.root)
        offers = l.offer(self.root)
        decisions = [{'id': o['id'], 'approvalKey': o['approvalKey'], 'decision': 'approve'} for o in offers]
        with self.assertRaises(ValueError):
            l.apply_review(self.root, offers, decisions, {}, self.root / 'review')
        self.packet['manager']['decisions'][0]['reason'] = 'changed'
        l.write(self.root / 'outbox/one.json', self.packet)
        with self.assertRaises(ValueError):
            l.apply_review(self.root, offers, decisions, self.receipt, self.root / 'review')

    def test_multi_decision_failure_is_atomic(self):
        l.ingest(self.root)
        offers = l.offer(self.root)
        good = {'id': offers[0]['id'], 'approvalKey': offers[0]['approvalKey'], 'decision': 'approve'}
        with self.assertRaises(ValueError):
            l.apply_review(self.root, offers, [good, dict(good, id='bad')], self.receipt, self.root / 'review')
        self.assertEqual(l.context(self.root, 'qt-cooker'), '')

    def test_expiry_and_procedure_version_disable_old_approval(self):
        self.approve()
        state = l.load(self.root)
        lesson = next(iter(state['lessons'].values()))
        lesson['expiresAt'] = (l.now() - dt.timedelta(seconds=1)).isoformat()
        l.write(self.root / 'state/learning/state.json', state)
        self.assertEqual(l.context(self.root, 'qt-cooker'), '')
        l.ingest(self.root)
        self.assertEqual(l.status(self.root)['pendingLessons'], 1)

    def test_retry_is_due_only_after_backoff_and_stops_after_three(self):
        l.ingest(self.root)
        self.assertEqual(l.due_retries(self.root, 'qt-cooker'), [])
        for attempt in range(3):
            state = l.load(self.root)
            state['retryQueue']['qt-cooker:basil-tofu']['dueAt'] = (l.now() - dt.timedelta(days=1)).isoformat()
            l.write(self.root / 'state/learning/state.json', state)
            rows = l.due_retries(self.root, 'qt-cooker')
            self.assertEqual(len(rows), 1)
            l.note_retry(self.root, rows)
        self.assertEqual(l.due_retries(self.root, 'qt-cooker'), [])

    def test_later_clearance_removes_retry_hold(self):
        l.ingest(self.root)
        self.packet['manager']['decisions'][0]['decision'] = 'ready-for-editorial-review'
        l.write(self.root / 'outbox/two.json', self.packet)
        l.ingest(self.root)
        self.assertEqual(l.status(self.root)['heldRetryRecords'], 0)

    def test_repeat_issue_is_measured_only_after_activation(self):
        self.approve()
        self.packet['checkedAt'] = (l.now() + dt.timedelta(seconds=1)).isoformat()
        self.packet['packets'][0]['records'][0]['notes'] = 'new attempt with same error'
        l.write(self.root / 'outbox/two.json', self.packet)
        report = l.ingest(self.root)
        self.assertEqual(report['recent30Days']['rejectedProposals'], 2)
        self.assertEqual(report['recent30Days']['repeatIssuesAfterLesson'], 1)
        self.assertFalse(report['qualityImprovementEstablished'])

    def test_disabling_policy_is_immediate_rollback(self):
        self.approve()
        l.write(self.root / 'learning-policy.json', {'enabled': False})
        self.assertEqual(l.context(self.root, 'qt-cooker'), '')
        self.assertEqual(l.offer(self.root), [])
        self.assertEqual(l.due_retries(self.root, 'qt-cooker'), [])

    def test_existing_manager_call_reviews_lessons_without_extra_call(self):
        l.ingest(self.root)
        offered = l.offer(self.root)
        l.write(self.root / 'baseline.json', {'recipeNames': []})
        response = {'publication': 'not-published', 'decisions': self.packet['manager']['decisions'],
                    'lessonDecisions': [{'id': o['id'], 'approvalKey': o['approvalKey'], 'decision': 'approve'} for o in offered]}
        with patch.object(w, 'ROOT', self.root), patch.object(w, 'run_model', return_value=(response, self.receipt)) as model:
            result = w.review(self.packet['packets'], self.root / 'review', {})
            self.assertEqual(model.call_count, 1)
            self.assertIn('LESSON CANDIDATES', model.call_args.args[1])
        self.assertEqual(result['learning']['approved'], 1)

    def test_missing_lesson_decisions_preserves_record_review_and_holds(self):
        l.ingest(self.root)
        l.write(self.root / 'baseline.json', {'recipeNames': []})
        response = self.packet['manager']
        with patch.object(w, 'ROOT', self.root), patch.object(w, 'run_model', return_value=(response, self.receipt)):
            result = w.review(self.packet['packets'], self.root / 'review', {})
        self.assertEqual(result['decisions'][0]['decision'], 'hold')
        self.assertEqual(l.status(self.root)['approvedLessons'], 0)

    def retry_worker(self, record_id='basil-tofu', published=False):
        row = {'id': record_id, 'status': 'proposed', 'sources': [{'url': 'https://example.org/recipe', 'evidence': 'Ingredients verified'}],
               'recipe': {'name': 'Basil tofu', 'category': 'With rice', 'servings': 2, 'minutes': 20, 'diet': 'Vegan',
                          'cuisine': 'Thai', 'author': 'Fixture Author',
                          'ingredients': [{'id': 'tofu', 'name': 'Tofu', 'amount': 200, 'unit': 'g'}],
                          'steps': [{'instruction': 'Cook tofu.', 'ingredientIds': ['tofu']}], 'kitchenTested': False}}
        packet = {'role': 'qt-cooker', 'summary': 'Rechecked held candidate', 'records': [row]}
        context = {'existingRecipeNames': [{'id': 'basil-tofu', 'name': 'Basil tofu'}] if published else [],
                   'priorCandidates': ['Basil tofu'], 'heldRetries': [{'id': 'basil-tofu', 'name': 'Basil tofu'}]}
        receipt = dict(self.receipt, role='qt-cooker', successfulExtractCalls=1, toolCalls=[{'name': 'web_extract'}])
        cache_key = w.hashlib.sha256(b'https://example.org/recipe').hexdigest()
        l.write(self.root / 'state/source-cache' / (cache_key + '.json'),
                {'result': {'content': 'Ingredients verified'}, 'fetchedAt': l.now().isoformat(), 'sha256': 'a' * 64})
        folder = self.root / 'runs/retry/cooker'
        folder.mkdir(parents=True, exist_ok=True)
        with patch.object(w, 'ROOT', self.root), patch.object(w, 'run_model', return_value=(packet, receipt)):
            return w.worker('qt-cooker', context, folder, {})['records'][0]

    def test_held_recipe_can_be_rechecked_under_same_identity(self):
        self.assertEqual(self.retry_worker()['status'], 'proposed')

    def test_retry_cannot_duplicate_published_recipe_or_change_id(self):
        self.assertEqual(self.retry_worker(published=True)['status'], 'held')
        self.assertEqual(self.retry_worker(record_id='new-duplicate-id')['status'], 'held')

    def test_corrupt_learning_state_does_not_grant_retry_permissions(self):
        (self.root / 'state/learning').mkdir(parents=True)
        (self.root / 'state/learning/state.json').write_text('broken')
        self.assertEqual(l.due_retries(self.root, 'qt-cooker'), [])


if __name__ == '__main__':
    unittest.main()
