import importlib.util
import io
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch
from urllib.parse import parse_qs, urlsplit

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location("fetch_hf_catalog", ROOT / "scripts/fetch_hf_catalog.py")
catalog = importlib.util.module_from_spec(spec)
spec.loader.exec_module(catalog)


class HuggingFaceCatalogTests(unittest.TestCase):
    def test_small_list_request_has_no_download_or_inference_endpoint(self):
        for kind in ("models", "datasets"):
            parsed = urlsplit(catalog.catalog_url(kind, "synthetic catalog", 20))
            self.assertEqual(parsed.netloc, "huggingface.co")
            self.assertEqual(parsed.path, f"/api/{kind}")
            params = parse_qs(parsed.query)
            self.assertEqual(params["limit"], ["20"])
            self.assertIn("cardData", params["expand[]"])
            self.assertNotIn("siblings", params["expand[]"])

    def test_limit_is_validated_before_any_network_request(self):
        with patch.object(catalog, "request_json") as request:
            for limit in (0, 21, True, 1.5):
                with self.assertRaises(ValueError):
                    catalog.fetch("models", "synthetic", limit)
            with self.assertRaises(ValueError):
                catalog.fetch("spaces", "synthetic", 1)
            request.assert_not_called()

    def test_licenses_remain_unverified_and_content_is_discarded(self):
        raw = [{"id": "synthetic/test", "private": False, "gated": "manual",
                "tags": ["license:other", "video-classification"],
                "cardData": {"license": "other", "license_name": "synthetic-license",
                             "license_link": "LICENSE", "description": "CARD_TEXT_MARKER"},
                "siblings": [{"rfilename": "WEIGHTS_MARKER"}], "description": "DATA_MARKER"}]
        record = catalog.normalize_records(raw, "models", 1)[0]
        self.assertEqual(record["declared_licenses"], ["other"])
        self.assertEqual(record["declared_license_link"], "LICENSE")
        self.assertEqual(record["license_status"], "not_verified")
        self.assertEqual(record["gated"], "manual")
        self.assertEqual(record["review_status"], "candidate_not_behavioral_evidence")
        serialized = json.dumps(record)
        for marker in ("CARD_TEXT_MARKER", "WEIGHTS_MARKER", "DATA_MARKER"):
            self.assertNotIn(marker, serialized)

    def test_missing_license_is_not_filled_from_popularity(self):
        raw = [{"id": "synthetic/test", "downloads": 1000, "likes": 20}]
        record = catalog.normalize_records(raw, "datasets", 1)[0]
        self.assertEqual(record["declared_licenses"], [])
        self.assertEqual(record["license_status"], "not_verified")
        self.assertEqual(record["url"], "https://huggingface.co/datasets/synthetic/test")

    def test_private_records_and_excess_results_are_not_saved(self):
        self.assertEqual(catalog.normalize_records([{"id": "synthetic/private", "private": True}],
                                                   "models", 1), [])
        with self.assertRaises(ValueError):
            catalog.normalize_records([{"id": "synthetic/a"}, {"id": "synthetic/b"}], "models", 1)

    def test_arbitrary_network_destination_is_rejected(self):
        for url in ("https://example.org/api/models", "https://huggingface.co/api/spaces",
                    "https://huggingface.co/test/resolve/main/weights.bin"):
            with self.assertRaises(ValueError):
                catalog.request_json(url)

    def test_fetch_does_not_make_per_repository_or_paginated_requests(self):
        with patch.object(catalog, "request_json", return_value=[{"id": "synthetic/test"}]) as request:
            snapshot = catalog.fetch("models", "synthetic", 1)
        request.assert_called_once()
        self.assertEqual(snapshot["authentication"], "none")
        self.assertFalse(snapshot["contains_model_weights"])
        self.assertFalse(snapshot["contains_dataset_examples"])

    def test_public_request_ignores_token_and_uses_get_without_body(self):
        with patch.dict("os.environ", {"HF_TOKEN": "SYNTHETIC_TOKEN_MARKER"}):
            with patch.object(catalog, "build_opener") as opener:
                opener.return_value.open.return_value = io.BytesIO(b"[]")
                self.assertEqual(catalog.request_json(catalog.catalog_url("models", "synthetic", 1)), [])
        request = opener.return_value.open.call_args.args[0]
        self.assertEqual(request.get_method(), "GET")
        self.assertIsNone(request.data)
        self.assertIsNone(request.get_header("Authorization"))
        self.assertNotIn("SYNTHETIC_TOKEN_MARKER", request.full_url)

    def test_new_snapshots_do_not_replace_existing_files(self):
        with patch.object(catalog, "request_json", return_value=[]):
            snapshot = catalog.fetch("models", "synthetic", 1)
        with tempfile.TemporaryDirectory() as directory:
            first = catalog.save_snapshot(snapshot, directory)
            original = first.read_bytes()
            second = catalog.save_snapshot(snapshot, directory)
            self.assertNotEqual(first, second)
            self.assertEqual(first.read_bytes(), original)


if __name__ == "__main__":
    unittest.main()
