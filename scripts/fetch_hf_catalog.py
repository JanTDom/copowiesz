#!/usr/bin/env python3
"""Publiczny katalog Hugging Face: tylko anonimowy GET i ograniczone metadane."""

import argparse
from datetime import datetime, timezone
import hashlib
import json
from pathlib import Path
import sys
from urllib.error import HTTPError, URLError
from urllib.parse import quote, urlencode, urlsplit
from urllib.request import HTTPRedirectHandler, Request, build_opener

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "data/raw/api/huggingface"
MAX_LIMIT = 20
MAX_RESPONSE_BYTES = 2_000_000
EXPAND = ("author", "createdAt", "lastModified", "downloads", "likes",
          "private", "gated", "tags", "cardData")


class NoRedirect(HTTPRedirectHandler):
    """Nie podążaj za przekierowaniem poza dozwolone endpointy katalogu."""

    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None


def catalog_url(kind, query, limit):
    if kind not in {"models", "datasets"}:
        raise ValueError("Dozwolony katalog to models albo datasets.")
    if not isinstance(query, str) or not query.strip() or len(query) > 160:
        raise ValueError("Podaj ogólne zapytanie katalogowe o długości 1–160 znaków.")
    if type(limit) is not int or not 1 <= limit <= MAX_LIMIT:
        raise ValueError("Limit musi być liczbą całkowitą 1–20.")
    fields = EXPAND + (("pipeline_tag",) if kind == "models" else ())
    params = [("search", query.strip()), ("limit", str(limit))]
    params.extend(("expand[]", field) for field in fields)
    return "https://huggingface.co/api/" + kind + "?" + urlencode(params)


def request_json(url):
    parsed = urlsplit(url)
    if (parsed.scheme != "https" or parsed.netloc != "huggingface.co"
            or parsed.path not in {"/api/models", "/api/datasets"}
            or parsed.fragment):
        raise ValueError("Dozwolony jest tylko publiczny endpoint listy modeli lub datasetów.")
    request = Request(url, method="GET", headers={
        "User-Agent": "COPOWIESZ-catalog/0.1 (public-metadata-only)",
        "Accept": "application/json",
    })
    # Biblioteka standardowa nie odczytuje HF_TOKEN ani konfiguracji logowania HF.
    with build_opener(NoRedirect()).open(request, timeout=30) as response:
        payload = response.read(MAX_RESPONSE_BYTES + 1)
    if len(payload) > MAX_RESPONSE_BYTES:
        raise ValueError("Odpowiedź przekroczyła limit 2 MB; snapshot nie został zapisany.")
    return json.loads(payload)


def _text(value, limit=512):
    return value[:limit] if isinstance(value, str) else None


def _texts(value, max_items=100):
    if isinstance(value, str):
        return [value[:512]]
    if isinstance(value, list):
        return [item[:512] for item in value[:max_items] if isinstance(item, str)]
    return []


def normalize_records(data, kind, limit):
    if not isinstance(data, list) or len(data) > limit:
        raise ValueError("API nie zwróciło listy zgodnej z żądanym limitem.")
    records = []
    for item in data:
        if not isinstance(item, dict) or not isinstance(item.get("id"), str):
            raise ValueError("Rekord katalogu nie ma prawidłowego identyfikatora.")
        if item.get("private") is True:
            continue
        repo_id = item["id"]
        if not repo_id or len(repo_id) > 255:
            raise ValueError("Nieprawidłowy identyfikator repozytorium.")
        card = item.get("cardData")
        card = card if isinstance(card, dict) else {}
        tags = _texts(item.get("tags"))
        prefix = "datasets/" if kind == "datasets" else ""
        record = {
            "provider_id": repo_id,
            "catalog": kind,
            "url": "https://huggingface.co/" + prefix + quote(repo_id, safe="/"),
            "author": _text(item.get("author")),
            "created_at": _text(item.get("createdAt")),
            "last_modified": _text(item.get("lastModified")),
            "downloads": item.get("downloads") if type(item.get("downloads")) is int else None,
            "likes": item.get("likes") if type(item.get("likes")) is int else None,
            "private": item.get("private") if type(item.get("private")) is bool else None,
            "gated": item.get("gated") if type(item.get("gated")) is bool else _text(item.get("gated")),
            "tags": tags,
            "declared_licenses": _texts(card.get("license")),
            "declared_license_name": _text(card.get("license_name")),
            "declared_license_link": _text(card.get("license_link")),
            "declared_license_tags": [tag for tag in tags if tag.startswith("license:")],
            "license_status": "not_verified",
            "review_status": "candidate_not_behavioral_evidence",
        }
        if kind == "models":
            record["pipeline_tag"] = _text(item.get("pipeline_tag"))
        records.append(record)
    return records


def fetch(kind, query, limit=5):
    url = catalog_url(kind, query, limit)
    records = normalize_records(request_json(url), kind, limit)
    return {
        "provider": "huggingface_public_hub",
        "catalog": kind,
        "query": query.strip(),
        "requested_limit": limit,
        "request_url": url,
        "http_method": "GET",
        "authentication": "none",
        "retrieved_at": datetime.now(timezone.utc).isoformat(),
        "record_count": len(records),
        "contains_model_weights": False,
        "contains_dataset_examples": False,
        "contains_card_text": False,
        "license_status": "not_verified",
        "review_status": "not_reviewed",
        "records": records,
    }


def save_snapshot(snapshot, output=OUT):
    directory = Path(output)
    directory.mkdir(parents=True, exist_ok=True)
    query_hash = hashlib.sha256(snapshot["query"].encode()).hexdigest()[:10]
    timestamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%S%fZ")
    path = directory / f"{snapshot['catalog']}_{timestamp}_{query_hash}.json"
    with path.open("x", encoding="utf-8") as handle:
        json.dump(snapshot, handle, ensure_ascii=False, indent=2)
        handle.write("\n")
    return path


def main(argv=None):
    parser = argparse.ArgumentParser(description="Bezpłatny publiczny katalog HF: tylko metadane")
    parser.add_argument("query", help="Ogólna nazwa/fragment nazwy repozytorium; bez prywatnych danych")
    parser.add_argument("--kind", choices=["models", "datasets"], default="models")
    parser.add_argument("--limit", type=int, default=5, help="Liczba wyników: 1–20; bez paginacji")
    parser.add_argument("--output", type=Path, default=OUT)
    args = parser.parse_args(argv)
    try:
        snapshot = fetch(args.kind, args.query, args.limit)
        path = save_snapshot(snapshot, args.output)
        print(json.dumps({"provider": snapshot["provider"], "catalog": args.kind,
                          "record_count": snapshot["record_count"], "saved": str(path),
                          "license_status": "not_verified"}, ensure_ascii=False))
    except HTTPError as exc:
        print(f"Nie pobrano katalogu HF: HTTP {exc.code}. Przerwano bez ponawiania; "
              "dla 429 poczekaj na odnowienie limitu. Nie aktywuj płatnego planu.", file=sys.stderr)
        return 1
    except (ValueError, OSError, URLError) as exc:
        print(f"Nie pobrano katalogu HF: {exc}. Sprawdź sieć; ponów ręcznie później.", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
