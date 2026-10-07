#!/usr/bin/env python3
"""Rebuild bibliographic catalogs from captured metadata and reviewed source registries."""

import json
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from copowiesz.core import dump, load_raw


def build():
    raw = ROOT / "data/raw/api/literature"
    topic_files = {}
    for path in sorted(raw.glob("batch_*.json")):
        batch = json.loads(path.read_text(encoding="utf-8"))
        for item in batch["topics"]:
            topic_files.setdefault(item["file"], []).append({"topic": item["topic"], "species": item["species"]})
    merged = {}
    snapshots = []
    for path in sorted(raw.glob("*.json")):
        snapshot = json.loads(path.read_text(encoding="utf-8"))
        if snapshot.get("provider") not in {"europepmc", "crossref"}:
            continue
        snapshots.append(path.name)
        for record in snapshot["records"]:
            doi = (record.get("doi") or "").casefold().strip()
            pmid = record.get("pmid")
            key = ("doi:" + doi if doi else "pmid:" + pmid if pmid else
                   "provider:" + str(record.get("provider_source")) + ":" + str(record.get("provider_id") or record.get("url")))
            if key not in merged:
                merged[key] = {"key": key, "metadata": record, "retrieval_contexts": [],
                               "review_status": "candidate_not_reviewed"}
            merged[key]["retrieval_contexts"].append({"file": path.name, "provider": snapshot["provider"],
                                                     "query": snapshot["query"], "topics": topic_files.get(path.name, [])})
    records = sorted(merged.values(), key=lambda r: r["key"])
    counts = {"snapshot_count": len(snapshots), "record_count_with_duplicates": sum(len(r["retrieval_contexts"]) for r in records),
              "deduplicated_record_count": len(records), "deduplication": "DOI casefold, else PMID, else provider identity",
              "manual_review_complete": False}
    output = ROOT / "data/processed/literature/catalog.json"
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(dump({"format_version": "1.0", **counts, "input_files": snapshots, "records": records}) + "\n", encoding="utf-8")
    sources, _, _ = load_raw()
    lines = ["# Katalog opracowanych źródeł", "", "Stan przeglądu: 2026-10-07. Źródła to publikacje, wytyczne, przeglądy kliniczne i opisy narzędzi; nie wszystkie są badaniami eksperymentalnymi.", "",
             f"{len(sources)} wpisy gatunkowe; {len({s['url'] for s in sources})} różnych URL. Wspólna wytyczna może mieć osobny wpis dla psa i kota.", "",
             "Podane prawa dotyczą wyłącznie sprawdzonych deklaracji. Nie skopiowano pełnych publikacji ani pytań instrumentów.", "",
             "Wpis obu gatunków występuje w obu tabelach. Źródła metodologiczne mogą opisywać technologię lub AI, a nie biologię zwierząt. Zakres odczytu i przeglądu zapisano przy każdym źródle w JSON; status redakcyjny nie oznacza recenzji eksperckiej.", ""]
    for species, label in [("dog", "Pies"), ("cat", "Kot")]:
        lines += ["## " + label, "", "| ID | Publikacja / źródło | Rok | Rodzaj | Prawa |", "|---|---|---:|---|---|"]
        for source in sources:
            if species in source["species"]:
                title = source["title"].replace("|", "\\|").replace("[", "(").replace("]", ")")
                license_status = str(source["license_status"]).replace("|", "\\|").replace("\n", " ")
                lines.append(f"| {source['id']} | [{title}]({source['url']}) | {source['year'] or '—'} | {source['evidence_level']} | {license_status} |")
        lines.append("")
    (ROOT / "docs/SOURCES.md").write_text("\n".join(lines) + "\n", encoding="utf-8")
    topic_lines = ["# Bibliografia do dalszego przeglądu", "", f"Pobrano {counts['record_count_with_duplicates']} rekordów w {counts['snapshot_count']} snapshotach; po deduplikacji {len(records)} kandydatów.", "",
                   "To metadane wyszukiwania, nie zweryfikowane wnioski behawiorystyczne. Temat zapytania nie potwierdza gatunku ani przydatności każdego wyniku.", "",
                   "Przetworzony katalog: [catalog.json](../data/processed/literature/catalog.json). Odtwarzanie: `python3 scripts/build_catalog.py`.", "",
                   "| Temat | Gatunek w zapytaniu | Liczba pobranych wyników | Snapshot |", "|---|---|---:|---|"]
    for filename, contexts in topic_files.items():
        snapshot = json.loads((raw / filename).read_text())
        for context in contexts:
            topic_lines.append(f"| {context['topic']} | {context['species']} | {snapshot['record_count']} | [{filename}](../data/raw/api/literature/{filename}) |")
    topic_lines += ["", "## Kandydaci", "", "| DOI / identyfikator | Tytuł |", "|---|---|"]
    for record in records:
        metadata = record["metadata"]
        title = (metadata.get("title") or "Brak tytułu").replace("|", "\\|").replace("[", "(").replace("]", ")").replace("\n", " ")
        url = metadata.get("url")
        display = f"[{title}]({url})" if url else title
        topic_lines.append(f"| {record['key']} | {display} |")
    (ROOT / "docs/LITERATURE_CANDIDATES.md").write_text("\n".join(topic_lines) + "\n", encoding="utf-8")
    print(dump(counts))
    return counts


if __name__ == "__main__":
    build()
