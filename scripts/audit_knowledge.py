#!/usr/bin/env python3
"""Odtwarzalny audyt struktury, pokrycia i jawnych braków wiedzy; bez oceny klinicznej."""
from collections import Counter, defaultdict
import json
from pathlib import Path
import re
import sys

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from copowiesz.core import dump, effective_domain, fold, load_raw


def audit():
    sources, cards, _ = load_raw()
    source_map = {s['id']: s for s in sources}
    identities = defaultdict(list)
    for source in sources:
        doi = source.get('doi')
        if doi:
            identity = 'doi:' + doi.casefold().strip()
        else:
            identity = 'title:' + ' '.join(re.findall(r'\w+', fold(source['title'])))
        identities[identity].append(source['id'])
    used = {sid for c in cards for sid in c['source_ids']}
    legacy = [c['id'] for c in cards if not c.get('claims')]
    cases = json.loads((ROOT / 'data/raw/manual/evaluation/retrieval_queries_v1.json').read_text())
    etho = json.loads((ROOT / 'data/raw/manual/ethogram/ethogram_v1.json').read_text())
    report = {
        'format_version': '1.0', 'reviewed_at': '2026-10-07',
        'status': 'structural_audit_not_expert_or_clinical_validation',
        'card_count': len(cards), 'source_record_count': len(sources),
        'distinct_source_urls': len({s['url'] for s in sources}),
        'source_identity_candidates': len(identities),
        'identity_meaning': 'DOI gdy podany, inaczej znormalizowany tytuł; nie potwierdza unikalności badania/próby ani nie rozwiązuje wersji.',
        'domain_counts': dict(Counter(effective_domain(c) for c in cards)),
        'species_card_counts': {sp:sum(sp in c['species'] for c in cards) for sp in ['dog','cat']},
        'shared_cards': sum(len(c['species']) == 2 for c in cards),
        'evidence_types': dict(Counter(s['evidence_level'] for s in sources)),
        'source_access': dict(Counter(s.get('access_basis','legacy_not_structured') for s in sources)),
        'source_review_status': dict(Counter(s.get('review_status','legacy_editorial_only') for s in sources)),
        'retraction_check_status': dict(Counter(s.get('retraction_check','legacy_not_structured') for s in sources)),
        'claim_count': sum(len(c.get('claims',[])) for c in cards),
        'cards_with_claims': len(cards)-len(legacy),
        'legacy_cards_pending_claim_review': legacy,
        'sources_unused_by_cards': sorted(set(source_map)-used),
        'possible_duplicate_identities': [{'identity':k,'source_ids':v} for k,v in identities.items() if len(v)>1],
        'health': {'cards':sum(effective_domain(c)=='health' for c in cards),
                   'urgent_card_metadata':sum(effective_domain(c)=='health' and c['escalation']=='urgent_veterinarian' for c in cards),
                   'is_automatic_triage':False, 'diagnostic_accuracy_measured':False},
        'ethogram': {'behaviors':len(etho['behaviors']), 'status':'unvalidated_project_operational_definitions'},
        'retrieval_regression_cases': len(cases['cases']),
        'known_gaps': [
            'Brak niezależnego przeglądu wszystkich kart przez behawiorystę i lekarza weterynarii.',
            'Nie przeprowadzono kompletnego sprawdzenia korekt i retrakcji; jedna odczytana korekta VIDOPET nie jest audytem bibliografii.',
            '80 kart pierwotnej wersji wymaga dokładniejszych cytowań na poziomie twierdzeń.',
            'Część źródeł odczytano jako abstrakt lub publiczny fragment; nie pełny artykuł/rozdział.',
            'Brak zwalidowanego polskiego kwestionariusza, norm osobowości i danych długoterminowych konkretnych zwierząt.',
            'Brak walidacji video, emocji, pilności medycznej i rzeczywistego dialogu.',
            'Wyszukiwanie leksykalne nie rozumie negacji, współwystępowania ani czasu objawu.',
            'Znalezienie repozytorium HF nie potwierdza licencji, gatunku, jakości ani wdrożenia modelu.'
        ],
    }
    path = ROOT / 'data/processed/behavior_knowledge/coverage_report.json'
    path.write_text(dump(report)+'\n',encoding='utf-8')
    lines = ['# Pokrycie wiedzy i stan jakości', '',
        'Audyt strukturalny z 7 października 2026. Nie ocenia trafności klinicznej ani kompletności nauki.', '',
        f"{len(cards)} kart, {len(sources)} wpisy źródłowe, {report['distinct_source_urls']} różnych URL. Liczba wpisów nie jest liczbą niezależnych badań.", '',
        '| Domena | Karty |', '|---|---:|']
    lines += [f'| {d} | {n} |' for d,n in sorted(report['domain_counts'].items())]
    lines += ['',f"Dla psa dostępnych jest {report['species_card_counts']['dog']} kart, dla kota {report['species_card_counts']['cat']}; {report['shared_cards']} wspólnych kart występuje w obu wynikach.", '',
        f"{report['cards_with_claims']} kart ma {report['claim_count']} jawnych twierdzeń. {len(legacy)} starszych kart zachowuje wsparcie na poziomie całej karty i wymaga dalszej redakcji.", '',
        '## Zakres dostępu do źródeł', '', '| Odczyt | Wpisy |', '|---|---:|']
    lines += [f'| {k} | {v} |' for k,v in sorted(report['source_access'].items())]
    lines += ['', 'Odczyt publisher_record w module zdrowia może oznaczać publiczny opis lub fragment w wyszukiwaniu. Nie deklaruje przeczytania pełnego rozdziału. reviewed_at jest datą redakcyjnego sprawdzenia, nie opinią lekarza.', '',
        '## Luki wymagające dalszej pracy', ''] + ['- '+gap for gap in report['known_gaps']]
    lines += ['', 'Dokładny raport z ID kart oczekujących i kandydatami do deduplikacji: [coverage_report.json](../data/processed/behavior_knowledge/coverage_report.json).', '',
        'Odtwarzanie: `python3 scripts/audit_knowledge.py`. Raport nie importuje danych do prywatnej pamięci.']
    (ROOT/'docs/KNOWLEDGE_COVERAGE.md').write_text('\n'.join(lines)+'\n',encoding='utf-8')
    print(dump({k:report[k] for k in ['card_count','source_record_count','distinct_source_urls','domain_counts','claim_count','cards_with_claims']}))
    return report


if __name__ == '__main__':
    audit()
