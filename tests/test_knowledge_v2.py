import copy
from contextlib import closing
import json
from pathlib import Path
import sqlite3
import tempfile
import unittest

from copowiesz.core import (build_knowledge, effective_domain, load_raw,
                            retrieval_tokens, search_knowledge, validate_knowledge)

ROOT = Path(__file__).resolve().parents[1]


class KnowledgeV2Tests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.temp = tempfile.TemporaryDirectory()
        cls.kb = Path(cls.temp.name) / 'kb.sqlite3'
        cls.manifest = build_knowledge(target=cls.kb)

    @classmethod
    def tearDownClass(cls):
        cls.temp.cleanup()

    def test_claims_cannot_use_uncited_source_or_wrong_basis(self):
        sources, cards, _ = load_raw()
        card = next(c for c in cards if c.get('claims'))
        outside = next(s['id'] for s in sources if s['id'] not in card['source_ids'])
        for field, value in [('source_ids', [outside]), ('source_ids', []),
                             ('basis', 'proven_diagnosis'), ('locator', ''), ('text', 123)]:
            broken = copy.deepcopy(card)
            broken['claims'][0][field] = value
            with self.assertRaises(ValueError):
                validate_knowledge(sources, [broken])

    def test_health_cards_require_explicit_nondiagnostic_contract(self):
        sources, cards, _ = load_raw()
        card = next(c for c in cards if c.get('domain') == 'health')
        for field, value in [('not_diagnostic', False), ('escalation', 'none'), ('claims', [])]:
            broken = copy.deepcopy(card)
            broken[field] = value
            with self.assertRaises(ValueError):
                validate_knowledge(sources, [broken])

    def test_default_domain_and_claim_only_text_are_indexed_consistently(self):
        sources, cards, _ = load_raw()
        card = copy.deepcopy(next(c for c in cards if c.get('domain') == 'methods'))
        card['id'] = 'methods_regression_fixture'
        card.pop('domain')
        card['claims'][0]['text'] += ' ultrararefixturetoken'
        with tempfile.TemporaryDirectory() as directory:
            raw = Path(directory) / 'raw'
            raw.mkdir()
            (raw / 'fixture_sources.json').write_text(json.dumps(sources))
            (raw / 'fixture_cards.json').write_text(json.dumps([card]))
            kb = Path(directory) / 'kb.sqlite3'
            manifest = build_knowledge(raw=raw, target=kb)
            self.assertEqual(manifest['domain_counts']['methods'], 1)
            with closing(sqlite3.connect(kb)) as db:
                self.assertEqual(db.execute('SELECT domain FROM cards').fetchone()[0], 'methods')
            species = card['species'][0]
            self.assertEqual(len(search_knowledge('ultrararefixturetoken', species, database=kb, domain='methods')), 1)
            self.assertEqual(search_knowledge('ultrararefixturetoken', species, database=kb, domain='health'), [])

    def test_manifest_domains_match_actual_records(self):
        _, cards, _ = load_raw()
        for domain, count in self.manifest['domain_counts'].items():
            self.assertEqual(count, sum(effective_domain(c) == domain for c in cards))
        self.assertEqual(sum(self.manifest['domain_counts'].values()), len(cards))

    def test_health_retrieval_queries_and_species_isolation(self):
        queries = json.loads((ROOT / 'data/raw/manual/evaluation/retrieval_queries_v1.json').read_text())
        for case in queries['cases']:
            with self.subTest(case=case['id']):
                found = search_knowledge(case['query'], case['species'], case['limit'], database=self.kb, domain=case['domain'])
                self.assertIn(case['expected_card_id'], [c['id'] for c in found])
                self.assertTrue(all(case['species'] in c['species'] for c in found))
                self.assertTrue(all(effective_domain(c) == case['domain'] for c in found))

    def test_limits_and_stopwords_do_not_create_medical_tokens(self):
        for limit in [True, 1.5, 0, 21]:
            with self.assertRaises(ValueError):
                search_knowledge('oddech', 'cat', limit, database=self.kb)
        self.assertEqual(retrieval_tokens('się'), ['sie'])
        self.assertEqual(search_knowledge('mój kot', 'cat', database=self.kb), [])

    def test_ethogram_is_observable_prototype_with_valid_sources(self):
        ethogram = json.loads((ROOT / 'data/raw/manual/ethogram/ethogram_v1.json').read_text())
        sources, _, _ = load_raw()
        source_map = {s['id']: s for s in sources}
        behaviors = ethogram['behaviors']
        self.assertEqual(len({b['id'] for b in behaviors}), len(behaviors))
        for behavior in behaviors:
            self.assertEqual(behavior['basis'], 'project_operational_definition')
            for field in ['operational_definition', 'onset_rule', 'offset_rule', 'required_visibility', 'not_inferable']:
                self.assertTrue(behavior[field])
            for sid in behavior['source_ids']:
                self.assertTrue(set(behavior['species']) <= set(source_map[sid]['species']))


if __name__ == '__main__':
    unittest.main()
