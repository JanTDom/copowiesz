#!/usr/bin/env python3
"""Synthetic example in a temporary memory database."""

import argparse
from pathlib import Path
import sys
import tempfile

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from copowiesz.core import add_pet, add_observation, build_knowledge, dump, prepare_context


def main():
    parser = argparse.ArgumentParser(description="Syntetyczne demo pamięci i kontekstu")
    parser.add_argument("--output", type=Path, help="Opcjonalny eksport syntetycznego JSON")
    args = parser.parse_args()
    manifest = build_knowledge()
    with tempfile.TemporaryDirectory(prefix="copowiesz_demo_") as directory:
        memory = Path(directory) / "synthetic_memory.sqlite3"
        add_pet("demo_luna", "Luna — przykład syntetyczny", "cat", memory)
        add_pet("demo_reks", "Reks — przykład syntetyczny", "dog", memory)
        add_observation("demo_luna", "Odsuwa się od ręki", "Po dwóch pogłaskaniach podczas odpoczynku; może odejść", path=memory)
        add_observation("demo_luna", "Podchodzi do opiekuna", "Wieczorem przed zabawą; bez dotykania", path=memory)
        add_observation("demo_reks", "Przynosi zabawkę", "W salonie po odpoczynku", path=memory)
        context = prepare_context("demo_luna", "dotyk kontakt ból zabawa", memory)
        context["example_notice"] = "Wszystkie zwierzęta i obserwacje są syntetyczne. Nie wygenerowano odpowiedzi LLM."
        if args.output:
            args.output.parent.mkdir(parents=True, exist_ok=True)
            args.output.write_text(dump(context) + "\n", encoding="utf-8")
        print(dump({"knowledge_cards": manifest["card_count"], "knowledge_sources": manifest["source_count"],
                    "pet": context["pet_memory"]["pet"]["name"],
                    "observation_count": context["pet_memory"]["observation_count"],
                    "retrieved_cards": [c["id"] for c in context["knowledge"]],
                    "external_model_called": context["external_model_called"],
                    "video_analyzed": context["video_analyzed"],
                    "export": str(args.output.resolve()) if args.output else None}))
    return 0


if __name__ == "__main__":
    sys.exit(main())
