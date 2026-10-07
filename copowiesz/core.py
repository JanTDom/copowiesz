"""Offline knowledge retrieval and descriptive pet memory; no emotion classifier."""

import hashlib
from contextlib import closing
import json
import os
from pathlib import Path
import re
import sqlite3
import unicodedata
from datetime import datetime, timezone
from uuid import uuid4

ROOT = Path(__file__).resolve().parents[1]
RAW = ROOT / "data/raw/manual/behavior_knowledge"
KB = ROOT / "data/processed/behavior_knowledge/knowledge.sqlite3"
MEMORY = ROOT / "data/private/pet_memory.sqlite3"
SPECIES = {"dog", "cat"}
EVIDENCE = {"guideline", "primary_study", "technical_documentation", "clinical_reference"}
ESCALATIONS = {"none", "behaviorist", "veterinarian", "urgent_veterinarian"}
DOMAINS = {"behavior", "methods", "health"}
STOPWORDS = set("a aby ale albo bo by czy dla do gdy i jak jaki jaka jakie jest juz kiedy lub ma moze moga mozna moj moja moje na nie o od oraz po przy sie to w we z ze pies psa psu kot kota koty".split())
# A small, explicit Polish vocabulary, applied symmetrically to documents and queries.
# It improves retrieval only; it does not interpret a sentence, negation or symptoms.
TERM_GROUPS = {
    "zoltaczka": "zolty zolta zolte zoltawe zoltymi zoltych zoltawy zolknie",
    "mocz": "moczu moczem sika sikac sikanie sikania wysikac siusiac siusia siusianie",
    "oddech": "oddychanie oddychac oddycha zipie zipac",
    "wymioty": "wymiotuje wymiotowac wymiotowanie wymiotowania wymiotami rzyga",
    "ucho": "ucha uszy uszu uchu uszach uchem",
    "oko": "oczy oczach oka okiem oku oczami",
    "glowa": "glowe glowa glowy glowie",
    "szyja": "szyje szyi",
    "pysk": "pyskiem pyska pysku",
    "otwarty": "otwartym otwarte otwarta otwartymi",
    "brzuch": "brzucha brzuchem brzuchu",
    "lapa": "lapy lapami lape lapie lap",
    "zabawa": "zabawy zabawie zabawe zabawami bawi bawic",
    "sen": "snu snie spi spanie spac spaniem",
    "wech": "weszy weszenie weszyc wacha wachanie wachac wechu",
    "bol": "bolu bolem boli bolesny bolesne bolesna",
}
TERM_ALIASES = {word: canonical for canonical, variants in TERM_GROUPS.items()
                for word in variants.split()}


def now():
    return datetime.now(timezone.utc).isoformat()


def dump(value):
    return json.dumps(value, ensure_ascii=False, indent=2)


def species_check(species):
    if species not in SPECIES:
        raise ValueError("Gatunek musi być dog albo cat.")


def fold(text):
    text = text.casefold().replace("ł", "l")
    return "".join(c for c in unicodedata.normalize("NFD", text)
                   if unicodedata.category(c) != "Mn")


def retrieval_tokens(text):
    tokens = []
    for token in re.findall(r"\w+", fold(text)):
        tokens.append(token)
        alias = TERM_ALIASES.get(token)
        if alias and alias != token:
            tokens.append(alias)
    return tokens


def _require(record, fields, label):
    if not isinstance(record, dict):
        raise ValueError(f"{label}: rekord nie jest obiektem.")
    for field in fields:
        if field not in record or record[field] is None or record[field] == "":
            raise ValueError(f"{label}: brak {field}.")


def _texts(record, fields):
    for field in fields:
        if not isinstance(record[field], str) or not record[field].strip():
            raise ValueError(f"{record.get('id', 'rekord')}: {field} wymaga tekstu.")


def _species_list(record):
    value = record["species"]
    if (not isinstance(value, list) or not value or
            not all(isinstance(s, str) and s in SPECIES for s in value) or len(value) != len(set(value))):
        raise ValueError(f"{record.get('id', 'rekord')}: nieprawidłowa lista gatunków.")


def effective_domain(card):
    return card.get("domain", "methods" if card["id"].startswith("methods_") else "behavior")


def validate_knowledge(sources, cards):
    source_map = {}
    for source in sources:
        _require(source, ["id", "title", "url", "publisher", "kind", "species",
                          "evidence_level", "license_status", "reviewed_at", "notes"], "źródło")
        _texts(source, ["id", "title", "url", "publisher", "kind", "evidence_level", "reviewed_at", "notes", "license_status"])
        if "year" not in source or (source["year"] is not None and
                                   (type(source["year"]) is not int or not 1000 <= source["year"] <= 9999)):
            raise ValueError(f"{source['id']}: year wymaga roku lub null.")
        if source["id"] in source_map:
            raise ValueError(f"Powtórzone źródło: {source['id']}")
        if not source["url"].startswith("https://"):
            raise ValueError(f"Źródło wymaga URL HTTPS: {source['id']}")
        if source["kind"] not in {"guideline", "study", "dataset", "official_documentation", "review"}:
            raise ValueError(f"Nieznany rodzaj źródła: {source['id']}")
        if source["evidence_level"] not in EVIDENCE:
            raise ValueError(f"Nieznany rodzaj dowodu: {source['id']}")
        _species_list(source)
        datetime.strptime(source["reviewed_at"], "%Y-%m-%d")
        if "access_basis" in source and source["access_basis"] not in {
                "abstract", "full_text_sections", "official_guideline", "publisher_record"}:
            raise ValueError(f"{source['id']}: nieznany zakres odczytu źródła.")
        for field in ["study_design", "population", "review_status", "retraction_check"]:
            if field in source:
                _texts(source, [field])
        source_map[source["id"]] = source
    card_ids = set()
    for card in cards:
        _require(card, ["id", "species", "topic", "title", "observation",
                        "possible_interpretations", "confounders", "safe_next_steps",
                        "escalation", "evidence_level", "source_ids", "limitations", "tags"], "karta")
        _texts(card, ["id", "topic", "title", "observation", "escalation", "evidence_level", "limitations"])
        if card["id"] in card_ids:
            raise ValueError(f"Powtórzona karta: {card['id']}")
        card_ids.add(card["id"])
        _species_list(card)
        if effective_domain(card) not in DOMAINS:
            raise ValueError(f"{card['id']}: nieznana domena wiedzy.")
        if card["escalation"] not in ESCALATIONS or card["evidence_level"] not in EVIDENCE:
            raise ValueError(f"Nieznana eskalacja lub dowód: {card['id']}")
        for field in ["possible_interpretations", "confounders", "safe_next_steps", "source_ids", "tags"]:
            if not isinstance(card[field], list) or not card[field] or not all(isinstance(v, str) and v for v in card[field]):
                raise ValueError(f"{card['id']}: {field} wymaga niepustej listy tekstów.")
        for source_id in card["source_ids"]:
            if source_id not in source_map:
                raise ValueError(f"{card['id']}: brak źródła {source_id}.")
            if not set(card["species"]) <= set(source_map[source_id]["species"]):
                raise ValueError(f"{card['id']}: źródło nie obejmuje tego gatunku.")
        if not any(source_map[s]["evidence_level"] == card["evidence_level"] for s in card["source_ids"]):
            raise ValueError(f"{card['id']}: kategoria dowodu nie jest wsparta źródłami.")
        if "claims" in card:
            claims = card["claims"]
            if not isinstance(claims, list) or not claims:
                raise ValueError(f"{card['id']}: claims wymaga niepustej listy.")
            claim_ids = set()
            for claim in claims:
                _require(claim, ["id", "text", "basis", "source_ids", "locator", "uncertainty"], "twierdzenie")
                _texts(claim, ["id", "text", "basis", "locator", "uncertainty"])
                if claim["id"] in claim_ids:
                    raise ValueError(f"{card['id']}: powtórzone ID twierdzenia.")
                claim_ids.add(claim["id"])
                if claim["basis"] not in {"source_finding", "project_recommendation"}:
                    raise ValueError(f"{card['id']}: nieznana podstawa twierdzenia.")
                refs = claim["source_ids"]
                if (not isinstance(refs, list) or not refs or
                        not all(isinstance(s, str) and s in card["source_ids"] for s in refs)):
                    raise ValueError(f"{card['id']}: twierdzenie wymaga źródła przypisanego karcie.")
        if card.get("domain") == "health":
            if card.get("not_diagnostic") is not True or "claims" not in card:
                raise ValueError(f"{card['id']}: karta zdrowia wymaga zastrzeżenia i jawnych twierdzeń.")
            if card["escalation"] not in {"veterinarian", "urgent_veterinarian"}:
                raise ValueError(f"{card['id']}: karta objawu zdrowotnego wymaga konsultacji weterynaryjnej.")
    return source_map


def _read_raw(raw=RAW):
    files = sorted(Path(raw).glob("*_sources.json")) + sorted(Path(raw).glob("*_cards.json"))
    sources, cards, digests = [], [], []
    for path in files:
        snapshot = path.read_bytes()
        data = json.loads(snapshot)
        digests.append({"file": path.name, "sha256": hashlib.sha256(snapshot).hexdigest()})
        if not isinstance(data, list):
            raise ValueError(f"{path.name}: wymagana tablica rekordów.")
        (sources if path.name.endswith("_sources.json") else cards).extend(data)
    if not sources or not cards:
        raise ValueError("Brak źródeł lub kart w katalogu wiedzy.")
    validate_knowledge(sources, cards)
    return sources, cards, files, digests


def load_raw(raw=RAW):
    sources, cards, files, _ = _read_raw(raw)
    return sources, cards, files


def build_knowledge(raw=RAW, target=KB):
    sources, cards, _, digests = _read_raw(raw)
    target = Path(target)
    target.parent.mkdir(parents=True, exist_ok=True)
    temporary = target.with_name(target.name + "." + uuid4().hex + ".tmp")
    manifest = {"format_version": "2.0", "built_at": now(), "source_count": len(sources),
                "card_count": len(cards), "species_counts": {s: sum(s in c["species"] for c in cards) for s in sorted(SPECIES)},
                "domain_counts": {d: sum(effective_domain(c) == d for c in cards) for d in sorted(DOMAINS)},
                "inputs": digests,
                "retrieval": "SQLite FTS5; jawne polskie warianty słów i filtr gatunku/domeny; max 24 tokeny, bez rozumienia negacji ani oceny klinicznej"}
    try:
        with closing(sqlite3.connect(temporary)) as db, db:
            db.executescript("""
                PRAGMA foreign_keys=ON;
                CREATE TABLE sources(id TEXT PRIMARY KEY, payload TEXT NOT NULL);
                CREATE TABLE metadata(key TEXT PRIMARY KEY, payload TEXT NOT NULL);
                CREATE TABLE cards(id TEXT PRIMARY KEY, domain TEXT NOT NULL, payload TEXT NOT NULL);
                CREATE TABLE card_species(card_id TEXT REFERENCES cards(id), species TEXT,
                                          PRIMARY KEY(card_id,species));
                CREATE TABLE card_sources(card_id TEXT REFERENCES cards(id), source_id TEXT REFERENCES sources(id),
                                          PRIMARY KEY(card_id,source_id));
                CREATE VIRTUAL TABLE search_index USING fts5(card_id UNINDEXED, text, tokenize='unicode61');
            """)
            db.execute("INSERT INTO metadata VALUES (?,?)", ("build_manifest", dump(manifest)))
            db.executemany("INSERT INTO sources VALUES (?,?)", [(s["id"], dump(s)) for s in sources])
            for card in cards:
                domain = effective_domain(card)
                db.execute("INSERT INTO cards VALUES (?,?,?)", (card["id"], domain, dump(card)))
                db.executemany("INSERT INTO card_species VALUES (?,?)", [(card["id"], s) for s in card["species"]])
                db.executemany("INSERT INTO card_sources VALUES (?,?)", [(card["id"], s) for s in card["source_ids"]])
                body = " ".join([card["title"], card["topic"], card["observation"], card["limitations"]]
                                + card["tags"] + card["possible_interpretations"] + card["confounders"] + card["safe_next_steps"]
                                + [claim["text"] for claim in card.get("claims", [])])
                db.execute("INSERT INTO search_index VALUES (?,?)", (card["id"], " ".join(retrieval_tokens(body))))
            if db.execute("PRAGMA foreign_key_check").fetchall():
                raise ValueError("Niespójne referencje wiedzy.")
        os.replace(temporary, target)
    finally:
        temporary.unlink(missing_ok=True)
    target.with_suffix(".manifest.json").write_text(dump(manifest) + "\n", encoding="utf-8")
    return manifest


def search_knowledge(query, species, limit=5, database=KB, domain=None):
    species_check(species)
    if domain is not None and domain not in DOMAINS:
        raise ValueError("Domena musi być behavior, methods albo health.")
    if type(limit) is not int or not 1 <= limit <= 20:
        raise ValueError("Limit musi należeć do zakresu 1–20.")
    tokens = list(dict.fromkeys(t for t in retrieval_tokens(query) if t not in STOPWORDS))[:24]
    if not tokens:
        return []
    # Quoted tokens cannot become FTS operators or SQL code.
    expression = " OR ".join('"' + t + '"' for t in tokens)
    uri = Path(database).resolve().as_uri() + "?mode=ro"
    with closing(sqlite3.connect(uri, uri=True)) as db:
        rows = db.execute("""
            SELECT c.payload FROM search_index
            JOIN cards c ON c.id=search_index.card_id
            JOIN card_species cs ON cs.card_id=c.id
            WHERE search_index MATCH ? AND cs.species=? AND (? IS NULL OR c.domain=?)
            ORDER BY bm25(search_index), c.id LIMIT ?
        """, (expression, species, domain, domain, limit)).fetchall()
        results = []
        for (payload,) in rows:
            card = json.loads(payload)
            card["support_granularity"] = "claim_level" if card.get("claims") else "card_topic_only_pending_claim_review"
            card["sources"] = [json.loads(db.execute("SELECT payload FROM sources WHERE id=?", (sid,)).fetchone()[0])
                               for sid in card["source_ids"]]
            results.append(card)
        return results


def open_memory(path=MEMORY):
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    db = sqlite3.connect(path)
    path.chmod(0o600)
    db.row_factory = sqlite3.Row
    db.executescript("""
        PRAGMA foreign_keys=ON;
        PRAGMA secure_delete=ON;
        CREATE TABLE IF NOT EXISTS pets(
            id TEXT PRIMARY KEY, name TEXT NOT NULL, species TEXT NOT NULL CHECK(species IN ('dog','cat')),
            created_at TEXT NOT NULL);
        CREATE TABLE IF NOT EXISTS observations(
            id TEXT PRIMARY KEY, pet_id TEXT NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
            behavior TEXT NOT NULL, context TEXT NOT NULL, observed_at TEXT NOT NULL,
            recorded_at TEXT NOT NULL, evidence_kind TEXT NOT NULL CHECK(evidence_kind IN
                ('owner_report','human_video_annotation','clinician_note')),
            evidence_ref TEXT, provenance_status TEXT NOT NULL DEFAULT 'unverified');
        CREATE INDEX IF NOT EXISTS observations_pet_time ON observations(pet_id,observed_at);
        CREATE TABLE IF NOT EXISTS profile_versions(
            id TEXT PRIMARY KEY, pet_id TEXT NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
            created_at TEXT NOT NULL, payload TEXT NOT NULL);
    """)
    return db


def add_pet(pet_id, name, species, path=MEMORY):
    species_check(species)
    if not re.fullmatch(r"[a-zA-Z0-9_-]{1,64}", pet_id):
        raise ValueError("ID: 1–64 liter ASCII, cyfr, _ lub -.")
    if not name.strip() or len(name) > 100:
        raise ValueError("Imię wymaga 1–100 znaków.")
    db = open_memory(path)
    try:
        with db:
            db.execute("INSERT INTO pets VALUES (?,?,?,?)", (pet_id, name.strip(), species, now()))
    finally:
        db.close()
    return {"id": pet_id, "name": name.strip(), "species": species}


def _pet(db, pet_id):
    row = db.execute("SELECT * FROM pets WHERE id=?", (pet_id,)).fetchone()
    if row is None:
        raise ValueError("Nie znaleziono zwierzaka.")
    return dict(row)


def add_observation(pet_id, behavior, context, evidence_kind="owner_report", evidence_ref=None,
                    observed_at=None, path=MEMORY):
    if evidence_kind not in {"owner_report", "human_video_annotation", "clinician_note"}:
        raise ValueError("Nieobsługiwany rodzaj dowodu; analiza automatyczna nie jest wdrożona.")
    if evidence_kind != "owner_report" and not evidence_ref:
        raise ValueError("Adnotacja wideo/notatka kliniczna wymaga identyfikatora dowodu.")
    if not behavior.strip() or not context.strip() or max(len(behavior), len(context)) > 4000:
        raise ValueError("Zachowanie i kontekst: 1–4000 znaków każde.")
    timestamp = observed_at or now()
    parsed = datetime.fromisoformat(timestamp)
    if parsed.tzinfo is None or parsed.utcoffset() is None:
        raise ValueError("Czas obserwacji musi mieć strefę, np. +02:00.")
    if parsed > datetime.now(timezone.utc):
        raise ValueError("Czas obserwacji nie może być w przyszłości.")
    timestamp = parsed.astimezone(timezone.utc).isoformat()
    record = {"id": uuid4().hex, "pet_id": pet_id, "behavior": behavior.strip(), "context": context.strip(),
              "observed_at": timestamp, "recorded_at": now(), "evidence_kind": evidence_kind,
              "evidence_ref": evidence_ref, "provenance_status": "unverified"}
    db = open_memory(path)
    try:
        _pet(db, pet_id)
        with db:
            db.execute("INSERT INTO observations VALUES (?,?,?,?,?,?,?,?,?)", tuple(record.values()))
    finally:
        db.close()
    return record


def descriptive_profile(pet_id, path=MEMORY, persist=False):
    db = open_memory(path)
    try:
        pet = _pet(db, pet_id)
        rows = [dict(r) for r in db.execute("SELECT * FROM observations WHERE pet_id=? ORDER BY observed_at,id", (pet_id,))]
        counts = {}
        for row in rows:
            counts[row["behavior"]] = counts.get(row["behavior"], 0) + 1
        profile = {"version": "descriptive_v1", "pet": pet, "created_at": now(),
                   "status": "insufficient_for_validated_personality", "observations": rows,
                   "reported_behavior_counts": counts, "observation_count": len(rows),
                   "counts_meaning": "Liczba zapisów; brak mianownika, więc nie jest to częstość w życiu zwierzaka.",
                   "stable_traits": [], "inferred_emotions": [], "clinical_diagnosis": None,
                   "limitations": ["Relacje i adnotacje mają niezweryfikowane pochodzenie.",
                                   "Nie wyliczamy cech osobowości ani procentów pewności z liczby wpisów."]}
        if persist:
            with db:
                db.execute("INSERT INTO profile_versions VALUES (?,?,?,?)", (uuid4().hex, pet_id, now(), dump(profile)))
        return profile
    finally:
        db.close()


def prepare_context(pet_id, question, path=MEMORY, knowledge=KB):
    profile = descriptive_profile(pet_id, path)
    cards = search_knowledge(question, profile["pet"]["species"], database=knowledge)
    return {"language": "pl", "question": question, "mode": "explanation",
            "system_prompt": (ROOT / "prompts/pet_conversation_pl.md").read_text(encoding="utf-8"),
            "pet_memory": profile, "knowledge": cards,
            "needs_human_review": any(c["escalation"] != "none" for c in cards),
            "review_meaning": "Flaga z metadanych znalezionych kart; nie jest oceną objawów ani triage'em.",
            "external_model_called": False, "video_analyzed": False}


def delete_pet(pet_id, path=MEMORY):
    db = open_memory(path)
    try:
        _pet(db, pet_id)
        with db:
            db.execute("DELETE FROM pets WHERE id=?", (pet_id,))
    finally:
        db.close()
    return {"deleted_pet_id": pet_id, "scope": "pets, observations, profile_versions in local memory database",
            "not_deleted": "Osobno zapisane eksporty, oryginały nagrań i kopie zapasowe wymagają osobnego usunięcia."}
