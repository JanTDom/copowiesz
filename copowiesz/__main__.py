import argparse
import json
import sqlite3
import sys
from pathlib import Path

from .core import (MEMORY, add_observation, add_pet, build_knowledge, delete_pet,
                   descriptive_profile, dump, prepare_context, search_knowledge)


def main():
    parser = argparse.ArgumentParser(description="COPOWIESZ — lokalna wiedza i pamięć obserwacji psa/kota")
    parser.add_argument("--memory", type=Path, default=MEMORY, help="Ścieżka prywatnej bazy SQLite")
    commands = parser.add_subparsers(dest="command", required=True)
    commands.add_parser("build-kb", help="Sprawdź źródła/karty i zbuduj indeks")
    search = commands.add_parser("search", help="Wyszukaj wiedzę behawiorystyczną")
    search.add_argument("query")
    search.add_argument("--species", choices=["dog", "cat"], required=True)
    search.add_argument("--limit", type=int, default=5)
    search.add_argument("--domain", choices=["behavior", "methods", "health"], help="Opcjonalny filtr rodzaju wiedzy")
    pet = commands.add_parser("add-pet")
    pet.add_argument("id")
    pet.add_argument("name")
    pet.add_argument("--species", choices=["dog", "cat"], required=True)
    observe = commands.add_parser("observe")
    observe.add_argument("pet_id")
    observe.add_argument("--behavior", required=True)
    observe.add_argument("--context", required=True)
    observe.add_argument("--evidence-kind", choices=["owner_report", "human_video_annotation", "clinician_note"], default="owner_report")
    observe.add_argument("--evidence-ref")
    observe.add_argument("--observed-at")
    profile = commands.add_parser("profile")
    profile.add_argument("pet_id")
    profile.add_argument("--save-version", action="store_true")
    context = commands.add_parser("prepare-context")
    context.add_argument("pet_id")
    context.add_argument("question")
    delete = commands.add_parser("delete-pet")
    delete.add_argument("pet_id")
    args = parser.parse_args()
    try:
        if args.command == "build-kb":
            result = build_knowledge()
        elif args.command == "search":
            result = search_knowledge(args.query, args.species, args.limit, domain=args.domain)
        elif args.command == "add-pet":
            result = add_pet(args.id, args.name, args.species, args.memory)
        elif args.command == "observe":
            result = add_observation(args.pet_id, args.behavior, args.context, args.evidence_kind,
                                     args.evidence_ref, args.observed_at, args.memory)
        elif args.command == "profile":
            result = descriptive_profile(args.pet_id, args.memory, args.save_version)
        elif args.command == "prepare-context":
            result = prepare_context(args.pet_id, args.question, args.memory)
        else:
            result = delete_pet(args.pet_id, args.memory)
        print(dump(result))
    except (ValueError, sqlite3.Error, OSError, json.JSONDecodeError) as exc:
        print(f"Błąd: {exc}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
