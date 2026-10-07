#!/usr/bin/env python3
"""One bounded manual research batch; no scheduler, no full texts, no automatic KB import."""

import argparse
from datetime import datetime, timezone
import json
from pathlib import Path
import sys
import time
from fetch_literature import OUT, fetch, save_snapshot


def main():
    parser = argparse.ArgumentParser(description="Zbierz kandydatów bibliografii dla tematów psa/kota")
    parser.add_argument("--limit", type=int, default=10, help="Liczba wyników na temat: 1–100")
    parser.add_argument("--output", type=Path, default=OUT)
    args = parser.parse_args()
    if not 1 <= args.limit <= 100:
        parser.error("Limit 1–100")
    queries = json.loads(Path(__file__).with_name("research_queries.json").read_text())["queries"]
    records = []
    failures = []
    for index, topic in enumerate(queries):
        if index:
            time.sleep(1)
        try:
            snapshot = fetch("europepmc", topic["query"], args.limit)
            path = save_snapshot(snapshot, args.output)
            records.append({"topic": topic["id"], "species": topic["species"],
                            "record_count": snapshot["record_count"], "file": path.name})
            print(json.dumps(records[-1], ensure_ascii=False), flush=True)
        except Exception as exc:
            failures.append({"topic": topic["id"], "error": str(exc)})
            print(json.dumps(failures[-1], ensure_ascii=False), file=sys.stderr, flush=True)
    manifest = {"created_at": datetime.now(timezone.utc).isoformat(), "requested_per_topic": args.limit,
                "topics": records, "failures": failures, "review_status": "candidates_not_reviewed",
                "record_count_with_duplicates": sum(r["record_count"] for r in records)}
    args.output.mkdir(parents=True, exist_ok=True)
    target = args.output / ("batch_" + datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%S%fZ") + ".json")
    with target.open("x", encoding="utf-8") as handle:
        json.dump(manifest, handle, ensure_ascii=False, indent=2)
        handle.write("\n")
    print(json.dumps({"batch_manifest": str(target), "records": manifest["record_count_with_duplicates"],
                      "failed_topics": len(failures)}, ensure_ascii=False))
    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(main())
