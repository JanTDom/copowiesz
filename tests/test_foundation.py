import copy
from contextlib import closing
import importlib.util
import json
from pathlib import Path
import sqlite3
import tempfile
import unittest
from unittest.mock import patch

from copowiesz.core import (add_observation, add_pet, build_knowledge, delete_pet,
                            descriptive_profile, fold, load_raw, open_memory,
                            prepare_context, search_knowledge, validate_knowledge)

ROOT = Path(__file__).resolve().parents[1]


class FoundationTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.shared = tempfile.TemporaryDirectory()
        cls.kb = Path(cls.shared.name) / "knowledge.sqlite3"
        cls.manifest = build_knowledge(target=cls.kb)

    @classmethod
    def tearDownClass(cls):
        cls.shared.cleanup()

    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.memory = Path(self.temp.name) / "memory.sqlite3"

    def tearDown(self):
        self.temp.cleanup()

    def test_source_references_and_species_are_complete(self):
        sources, cards, _ = load_raw()
        self.assertGreaterEqual(len(sources), 24)
        for species in ["dog", "cat"]:
            self.assertGreaterEqual(sum(species in c["species"] for c in cards), 30)
        self.assertEqual(self.manifest["card_count"], len(cards))

    def test_missing_source_is_rejected(self):
        sources, cards, _ = load_raw()
        broken = copy.deepcopy(cards[:1])
        broken[0]["source_ids"] = ["missing_reference"]
        with self.assertRaises(ValueError):
            validate_knowledge(sources, broken)

    def test_duplicate_cards_are_rejected(self):
        sources, cards, _ = load_raw()
        with self.assertRaises(ValueError):
            validate_knowledge(sources, cards[:1] * 2)

    def test_wrong_types_and_unsupported_evidence_are_rejected(self):
        sources, cards, _ = load_raw()
        for field, bad_value in [("title", 123), ("year", "not a year"), ("year", True), ("species", "dog")]:
            invalid = copy.deepcopy(sources)
            invalid[0][field] = bad_value
            with self.assertRaises(ValueError):
                validate_knowledge(invalid, cards)
        invalid = copy.deepcopy(cards[:1])
        invalid[0]["evidence_level"] = "technical_documentation"
        invalid[0]["source_ids"] = [s["id"] for s in sources if s["evidence_level"] == "primary_study"
                                    and set(invalid[0]["species"]) <= set(s["species"])][:1]
        with self.assertRaises(ValueError):
            validate_knowledge(sources, invalid)

    def test_manifest_hashes_bytes_actually_indexed(self):
        raw = Path(self.temp.name) / "raw"
        raw.mkdir()
        sources, cards, _ = load_raw()
        source_file = raw / "test_sources.json"
        source_file.write_text(json.dumps(sources))
        (raw / "test_cards.json").write_text(json.dumps(cards))
        import hashlib
        expected = hashlib.sha256(source_file.read_bytes()).hexdigest()
        original_connect = sqlite3.connect

        def connect_after_edit(*args, **kwargs):
            source_file.write_text("[]")
            return original_connect(*args, **kwargs)

        target = Path(self.temp.name) / "new.sqlite3"
        with patch("copowiesz.core.sqlite3.connect", side_effect=connect_after_edit):
            manifest = build_knowledge(raw=raw, target=target)
        self.assertEqual(next(x["sha256"] for x in manifest["inputs"] if x["file"] == source_file.name), expected)
        with closing(original_connect(target)) as db:
            internal = json.loads(db.execute("SELECT payload FROM metadata WHERE key='build_manifest'").fetchone()[0])
        self.assertEqual(internal, manifest)

    def test_species_filter_and_citations(self):
        for species in ["dog", "cat"]:
            found = search_knowledge("ból zabawa kontakt", species, database=self.kb)
            self.assertTrue(found)
            self.assertTrue(all(species in c["species"] and c["sources"] for c in found))

    def test_polish_normalization_and_fts_operators(self):
        self.assertEqual(fold("ŁÓDŹ ból"), "lodz bol")
        found = search_knowledge('" OR * NEAR() ból', "cat", database=self.kb)
        self.assertIsInstance(found, list)
        self.assertEqual(search_knowledge("  ", "dog", database=self.kb), [])

    def test_missing_knowledge_does_not_create_empty_database(self):
        missing = Path(self.temp.name) / "missing.sqlite3"
        with self.assertRaises(sqlite3.OperationalError):
            search_knowledge("zabawa", "cat", database=missing)
        self.assertFalse(missing.exists())

    def test_observations_preserve_context_and_do_not_invent_traits(self):
        add_pet("luna", "Luna", "cat", self.memory)
        for context in ["Przed posiłkiem", "Po zabawie"]:
            add_observation("luna", "Miauczy przy drzwiach", context, path=self.memory)
        profile = descriptive_profile("luna", self.memory, persist=True)
        self.assertEqual(profile["observation_count"], 2)
        self.assertEqual(profile["stable_traits"], [])
        self.assertEqual(profile["inferred_emotions"], [])
        self.assertEqual(profile["reported_behavior_counts"]["Miauczy przy drzwiach"], 2)
        self.assertEqual({o["context"] for o in profile["observations"]}, {"Przed posiłkiem", "Po zabawie"})

    def test_nonexistent_pet_cannot_receive_observations(self):
        with self.assertRaises(ValueError):
            add_observation("unknown", "Biegnie", "Podwórko", path=self.memory)

    def test_model_analysis_cannot_be_claimed_as_manual_evidence(self):
        add_pet("reks", "Reks", "dog", self.memory)
        with self.assertRaises(ValueError):
            add_observation("reks", "Machanie ogonem", "Dom", "automatic_video_analysis", path=self.memory)
        with self.assertRaises(ValueError):
            add_observation("reks", "Machanie ogonem", "Dom", "human_video_annotation", path=self.memory)

    def test_time_requires_timezone_and_is_normalized(self):
        add_pet("reks", "Reks", "dog", self.memory)
        with self.assertRaises(ValueError):
            add_observation("reks", "Leży", "Dom", observed_at="2020-01-01T12:00:00", path=self.memory)
        result = add_observation("reks", "Leży", "Dom", observed_at="2020-01-01T12:00:00+01:00", path=self.memory)
        self.assertEqual(result["observed_at"], "2020-01-01T11:00:00+00:00")

    def test_pet_memories_do_not_mix(self):
        add_pet("dog", "Reks", "dog", self.memory)
        add_pet("cat", "Luna", "cat", self.memory)
        add_observation("dog", "Szczeka", "Na spacerze", path=self.memory)
        context = prepare_context("cat", "ból kontakt", self.memory, self.kb)
        self.assertEqual(context["pet_memory"]["observation_count"], 0)
        self.assertTrue(all("cat" in c["species"] for c in context["knowledge"]))
        self.assertFalse(context["external_model_called"])
        self.assertFalse(context["video_analyzed"])

    def test_delete_cascades_only_target_pet(self):
        for pet in ["one", "two"]:
            add_pet(pet, pet, "dog", self.memory)
            add_observation(pet, "Śpi", "Dom", path=self.memory)
            descriptive_profile(pet, self.memory, persist=True)
        delete_pet("one", self.memory)
        db = open_memory(self.memory)
        try:
            self.assertEqual(db.execute("SELECT count(*) FROM observations").fetchone()[0], 1)
            self.assertEqual(db.execute("SELECT count(*) FROM profile_versions").fetchone()[0], 1)
        finally:
            db.close()
        self.assertEqual(descriptive_profile("two", self.memory)["observation_count"], 1)

    def test_deleted_observation_and_snapshot_text_is_cleared_from_database(self):
        marker = "PRIVATE_TEST_MARKER_6bd692603fde"
        add_pet("one", "One", "cat", self.memory)
        add_observation("one", marker, "Dom", path=self.memory)
        descriptive_profile("one", self.memory, persist=True)
        self.assertIn(marker.encode(), self.memory.read_bytes())
        delete_pet("one", self.memory)
        self.assertNotIn(marker.encode(), self.memory.read_bytes())

    def test_questionnaire_integrity(self):
        questionnaire = json.loads((ROOT / "data/raw/manual/questionnaires/owner_questionnaire_v1.json").read_text())
        self.assertEqual(questionnaire["status"], "unvalidated_research_prototype")
        self.assertGreaterEqual(len(questionnaire["questions"]), 70)
        sections = {s["id"] for s in questionnaire["sections"]}
        ids = [q["id"] for q in questionnaire["questions"]]
        self.assertEqual(len(ids), len(set(ids)))
        for q in questionnaire["questions"]:
            self.assertIn(q["section_id"], sections)
            self.assertTrue(set(q["species"]) <= {"dog", "cat"})
            self.assertFalse(q["required"])
            if q["type"] in {"frequency", "single_choice", "multi_choice"}:
                values = {o["value"] for o in q["options"]}
                self.assertTrue({"unknown", "not_applicable"} <= values, q["id"])

    def test_metadata_adapters_exclude_abstracts(self):
        spec = importlib.util.spec_from_file_location("literature", ROOT / "scripts/fetch_literature.py")
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)
        item = {"title": "Example", "source": "MED", "id": "1", "abstractText": "Do not persist"}
        normalized = module.normalize_europepmc({"resultList": {"result": [item]}})
        self.assertNotIn("Do not persist", json.dumps(normalized))
        crossref = module.normalize_crossref({"message": {"items": [{"title": ["Example"], "abstract": "Do not persist"}]}})
        self.assertNotIn("Do not persist", json.dumps(crossref))


if __name__ == "__main__":
    unittest.main()
