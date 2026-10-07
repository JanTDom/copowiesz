#!/usr/bin/env python3
"""Fetch bibliographic metadata only; never promote unreviewed papers into the KB."""

import argparse
from datetime import datetime, timezone
import hashlib
import json
from pathlib import Path
import sys
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "data/raw/api/literature"


def request_json(url):
    request = Request(url, headers={"User-Agent": "COPOWIESZ-research-prototype/0.1 (bibliographic-metadata-only)",
                                    "Accept": "application/json"})
    with urlopen(request, timeout=30) as response:
        return json.load(response)


def normalize_europepmc(data):
    return [{"provider_id": item.get("id"), "provider_source": item.get("source"),
             "title": item.get("title"), "authors": item.get("authorString"), "year": item.get("pubYear"),
             "doi": item.get("doi"), "pmid": item.get("id") if item.get("source") == "MED" else None,
             "pmcid": item.get("pmcid"), "journal": item.get("journalTitle"),
             "is_open_access": item.get("isOpenAccess"),
             "url": f"https://europepmc.org/article/{item.get('source')}/{item.get('id')}",
             "license_status": "not_verified", "review_status": "candidate_not_behavioral_evidence"}
            for item in data.get("resultList", {}).get("result", [])]


def normalize_crossref(data):
    return [{"doi": item.get("DOI"), "title": " ".join(item.get("title", [])),
             "authors": [{key: author[key] for key in ("given", "family", "ORCID") if key in author}
                         for author in item.get("author", [])],
             "publication_date": item.get("published", {}).get("date-parts"),
             "publisher": item.get("publisher"), "type": item.get("type"), "url": item.get("URL"),
             "declared_licenses": item.get("license", []), "license_status": "requires_version_and_rights_review",
             "review_status": "candidate_not_behavioral_evidence"}
            for item in data.get("message", {}).get("items", [])]


def fetch(provider, query, limit=20, email=None):
    if not query.strip() or not 1 <= limit <= 100:
        raise ValueError("Podaj zapytanie i limit 1–100.")
    if provider == "europepmc":
        url = "https://www.ebi.ac.uk/europepmc/webservices/rest/search?" + urlencode(
            {"query": query, "format": "json", "resultType": "lite", "pageSize": limit})
        items = normalize_europepmc(request_json(url))
    elif provider == "crossref":
        params = {"query.bibliographic": query, "rows": limit}
        if email:
            if "@" not in email or any(c.isspace() for c in email):
                raise ValueError("Nieprawidłowy kontakt email.")
            params["mailto"] = email
        url = "https://api.crossref.org/works?" + urlencode(params)
        items = normalize_crossref(request_json(url))
    else:
        raise ValueError("Nieznany katalog.")
    # Only allowlisted bibliographic fields are persisted. No abstracts/full texts.
    return {"provider": provider, "query": query, "requested_limit": limit,
            "retrieved_at": datetime.now(timezone.utc).isoformat(), "record_count": len(items),
            "contains_full_text": False, "contains_abstracts": False,
            "review_status": "not_reviewed", "records": items}


def save_snapshot(snapshot, output=OUT):
    directory = Path(output)
    directory.mkdir(parents=True, exist_ok=True)
    query_hash = hashlib.sha256(snapshot["query"].encode()).hexdigest()[:10]
    timestamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%S%fZ")
    path = directory / f"{snapshot['provider']}_{timestamp}_{query_hash}.json"
    with path.open("x", encoding="utf-8") as handle:
        json.dump(snapshot, handle, ensure_ascii=False, indent=2)
        handle.write("\n")
    return path


def main():
    parser = argparse.ArgumentParser(description="Pobierz bibliografię do ręcznego przeglądu")
    parser.add_argument("query", help="Zapytanie naukowe, zwykle po angielsku")
    parser.add_argument("--provider", choices=["europepmc", "crossref"], default="europepmc")
    parser.add_argument("--limit", type=int, default=20)
    parser.add_argument("--contact-email", help="Opcjonalny kontakt dla polite pool Crossref")
    parser.add_argument("--output", type=Path, default=OUT)
    args = parser.parse_args()
    try:
        snapshot = fetch(args.provider, args.query, args.limit, args.contact_email)
        path = save_snapshot(snapshot, args.output)
        print(json.dumps({"provider": args.provider, "record_count": snapshot["record_count"],
                          "saved": str(path), "review_status": "not_reviewed"}, ensure_ascii=False))
    except (ValueError, OSError, HTTPError, URLError, json.JSONDecodeError) as exc:
        print(f"Nie pobrano bibliografii: {exc}. Sprawdź sieć/limity; ponów później, bez pętli żądań.", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
