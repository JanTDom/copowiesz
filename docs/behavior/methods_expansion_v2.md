# Metody COPOWIESZ — rozszerzenie v2

Przygotowano 2026-10-07. **40 kart metod, 20 nowych źródeł pierwotnych lub oficjalnych i 80 autorskich definicji zachowań.** Stan: przegląd redakcyjny, recenzja ekspercka oczekiwana. Nie jest to kompletna ani „perfekcyjna” walidowana baza.

Zakres obejmuje pomiar powtarzany, błędy obserwatora, braki danych, mianowniki, rozdzielenie kontekstu, stanu i tendencji, granice wnioskowania o afekcie, walidację konstruktów, zadania poznawcze, dobrostan oraz cele analizy wideo i generacji języka. Korzystano z bezpłatnego odczytu witryn, abstraktów i wskazanych sekcji. Nie użyto Scite, okresów próbnych, płatnych usług ani Hugging Face. Nie zakupiono tekstów i nie pobrano danych, instrukcji psychometrycznych, klipów lub wag.

Pliki danych: [źródła metod](../../data/raw/manual/behavior_knowledge/methods_expansion_v2_sources.json), [karty metod](../../data/raw/manual/behavior_knowledge/methods_expansion_v2_cards.json), [etogram v1](../../data/raw/manual/ethogram/ethogram_v1.json). Notatki z lektury: [methods_expansion_v2.md](../papers/summaries/methods_expansion_v2.md).

## Dowód biologiczny a metoda techniczna

Badania psów pozostają przypisane do psa, a badania kotów do kota. Ani walidacja narzędzia gatunku, ani wynik jednego kontekstu nie przenosi się automatycznie na drugi gatunek. Ogólne ARRIVE obejmuje raportowanie badań wszystkich żywych zwierząt; ogólne definicje dobrostanu WOAH są zasadami, a nie normami zachowania konkretnego pupila. Korzystamy z oznaczonego PDF WOAH z nadrukiem 2024, bez deklaracji aktualności wszystkich standardów.

AP-10K, Oxford-IIIT Pet, Animal Kingdom i COCO obejmują psa i kota w zakresie technicznych zadań obrazu. Są dowodami dotyczącymi celu pomiaru: punktów, obiektów albo czynności. Nie są dowodami osobowości, przeżyć czy skuteczności klinicznej COPOWIESZ. NIST dotyczy generatywnej AI i ludzi; pole gatunku oznacza tu zastosowanie zasad generatora w obu ścieżkach produktu. Źródło ma jawne `species_scope_basis: general_ai_methodology_not_animal_evidence`. Nie przypisujemy mu biologicznych ustaleń o psie/kocie.

Każda karta zawiera `claims`: krótki opis zakresu źródła ma `basis: source_finding`, a własna reguła działania ma `basis: project_recommendation`. Odsyłacz źródłowy przy rekomendacji jest kontekstem metodologicznym (`source_reference_role`), a nie przypisaniem naszego zalecenia do wyniku publikacji. Łączymy w ten sposób konkretny dowód z jasno oznaczoną decyzją projektu.

## Zapis, który umożliwia późniejszy pomiar

| Element | Autorska zasada zapisu | Czego nie wnioskować |
|---|---|---|
| Jednostki | Osobnik, dom, sesja, klip i klatka mają osobne identyfikatory | Wielu niezależnych zwierząt z liczby klatek |
| Okno czasu | Daty obserwacji i zakres odpowiedzi zachować przy zapisie | Zmiany zachowania z ponownego kodowania tego samego filmu |
| Okazja | Rzeczywiście zaistniała naturalna sytuacja z możliwością oceny | „Nigdy” z braku sytuacji |
| Widoczność | Widoczne / nieobserwowane przy widoczności / niewidoczne / nieocenione | Nieruchomego ogona, którego nie ma w kadrze |
| Mianownik czasu | Liczba zdarzeń na czas nieprzerwanej możliwej obserwacji | Częstości życiowej z liczby notatek |
| Mianownik okazji | Liczba sytuacji z zachowaniem na liczbę porównywalnych okazji | Procentu przy nieznanej liczbie okazji |
| Stan / tendencja | Bieżący kontekst, zdrowie i przykłady z różnych dni osobno | Trwałej cechy z jednej reakcji |
| Źródło | Obserwacja, relacja, model, hipoteza i decyzja eksperta oddzielnie | Pewnego emocjonalnego znaczenia ruchu |

Są to reguły projektu do pilotażu, nie nowe wyniki wymienionych badań. Gdy mianownika nie znamy, wynik brzmi „liczba zapisów”. Czas zwierzęcia poza kadrem nie wchodzi do czasu umożliwiającego ocenę kodu. Długość filmu i liczba widocznych sekund mogą być różne. Po selektywnym zapisie ciekawych zdarzeń nie tworzymy reprezentatywnego budżetu aktywności. Nie wprowadzono klinicznych progów, wspólnego wyniku osobowości ani procentów pewności.

## Etogram: autorskie definicje, bez diagnozy

Etogram ma 80 wpisów: 69 wspólnych, 4 wyłącznie dla psa i 7 wyłącznie dla kota. Dla psa dostępne są 73, dla kota 76. Każdy wpis zawiera gatunek, polską nazwę, definicję, granice czasu, wymaganą widoczność, zakazane wnioski i znany identyfikator własnego źródła metodologicznego. Wszystkie definicje mają `basis: project_operational_definition` oraz `source_reference_role: methodological_context_not_definition_origin`. Nie są kopiami katalogów DogFACS/CatFACS i nie oznaczają certyfikowanego stosowania tych systemów.

Wpisy dotyczą ruchu, podparcia, postury, orientacji, kontaktu, pielęgnacji, karmienia, audio i widocznych zdarzeń fizycznych. Chód, obciążanie kończyn, ruch klatki, wydalenie materiału i pozycja eliminacyjna mogą porządkować opis do późniejszej konsultacji. Ich kody nie rozpoznają choroby, bólu ani pilności. Nie zlecamy wywoływania tych zdarzeń ani dodatkowego nagrywania niepokojących objawów.

Początek i koniec odnoszą się do oryginalnej osi klipu. Wejście zachowania w trakcie nagrania lub wyjście poza kadr pozostawia granicę niepełną; nie zapisujemy fikcyjnej pełnej długości. Kody różnych warstw mogą zachodzić na siebie, np. chód i wokalizacja. Oceny niewidocznych części ciała oraz audio bez potwierdzonego źródła pozostają nierozstrzygnięte. Nie ustalono jeszcze zwalidowanych progów minimalnej długości lub tolerowanych przerw.

Kategorie wpisów:
- `contact`: 8.
- `elimination`: 5.
- `face`: 3.
- `feeding`: 4.
- `grooming`: 5.
- `movement`: 15.
- `object_interaction`: 2.
- `orientation`: 11.
- `physical_observation`: 5.
- `posture`: 15.
- `vocalization`: 7.

## Katalog kart

| ID | Zakres gatunku | Temat |
|---|---|---|
| `methods_v2_001` | dog | Powtórzenie odpowiedzi i zmiana zachowania |
| `methods_v2_002` | dog | Tendencja psa ma datę i kontekst |
| `methods_v2_003` | dog | Zgodność opiekunów a trafność opisu psa |
| `methods_v2_004` | dog | Ludzkie słowo nie stanowi automatycznie cechy psa |
| `methods_v2_005` | cat | Powtarzalność kota nie oznacza niezmienności |
| `methods_v2_006` | cat | Jedna fizjologia nie jest całym temperamentem kota |
| `methods_v2_007` | dog | Ruch twarzy psa a nazwa emocji |
| `methods_v2_008` | dog | Bezpłatna instrukcja nie uwalnia cudzych filmów |
| `methods_v2_009` | cat | Ruchy kota kodujemy według gatunku |
| `methods_v2_010` | cat | Wybór adopcyjny nie jest pełnym profilem kota |
| `methods_v2_011` | dog | Sygnał psa wymaga sprawdzenia w innym kontekście |
| `methods_v2_012` | dog | Trafność wskaźnika psa jest odrębnym zadaniem |
| `methods_v2_013` | cat | Etykieta stanu kota pozostaje hipotezą |
| `methods_v2_014` | cat | Etykieta kota nie bierze się z pierwszego wrażenia |
| `methods_v2_015` | cat | Układ sygnałów społecznych kota |
| `methods_v2_016` | cat | Jedna grupa kotów nie tworzy norm gatunku |
| `methods_v2_017` | cat | Punkty twarzy kota bez osobowości |
| `methods_v2_018` | cat | Publikacja kota a dostęp do zbioru |
| `methods_v2_019` | dog | Twarz psa: geometria ma własną ocenę jakości |
| `methods_v2_020` | dog | Ten sam pies w różnych zdjęciach |
| `methods_v2_021` | dog, cat | Poza, czynność i stan są osobnymi celami |
| `methods_v2_022` | dog, cat | Zasłonięta kończyna nie jest nieruchoma |
| `methods_v2_023` | dog, cat | Klasyfikacja wyglądu nie jest indywidualnym charakterem |
| `methods_v2_024` | dog, cat | Segmentacja zwierzęcia nie identyfikuje osobnika |
| `methods_v2_025` | dog, cat | Jednoczesne czynności nie wymagają jednej etykiety |
| `methods_v2_026` | dog, cat | Klip i długi film mają wspólne pochodzenie |
| `methods_v2_027` | dog, cat | Klatki nie mnożą liczby niezależnych zwierząt |
| `methods_v2_028` | dog, cat | Wykluczenia przed poznaniem wyniku |
| `methods_v2_029` | dog, cat | Liczba wpisów bez mianownika |
| `methods_v2_030` | dog, cat | Brak okazji, brak wiedzy i brak zdarzenia |
| `methods_v2_031` | dog, cat | Fikcyjny głos ma jawny status |
| `methods_v2_032` | dog, cat | Wygenerowane cytowanie wymaga weryfikacji |
| `methods_v2_033` | dog, cat | Detekcja psa/kota nie oznacza rozpoznania czynności |
| `methods_v2_034` | dog, cat | Publiczny benchmark a własny dom |
| `methods_v2_035` | dog, cat | Dobrostan nie jest jednym sygnałem ruchowym |
| `methods_v2_036` | dog, cat | Zdrowie i tendencja pozostają osobnymi warstwami |
| `methods_v2_037` | dog | Wynik zadania psa nie mierzy całej kontroli |
| `methods_v2_038` | dog | Nazwa zadania nie gwarantuje wspólnego konstruktu |
| `methods_v2_039` | dog | Preferencja człowieka a fakt na twarzy psa |
| `methods_v2_040` | dog | Kod ruchu nie jest kodem intencji psa |

## Bibliografia i rzeczywisty zakres odczytu

Tytuły są informacją bibliograficzną. Szczegóły próby, projektu, praw, zakresu gatunku i odczytu znajdują się w JSON. `doi: null` oznacza, że DOI nie ustalono dla wykorzystanego rekordu; nie dopisujemy go z pamięci. Dwa rekordy FLW są preprintami. `retraction_check: not_checked` uczciwie oznacza brak pełnego sprawdzenia retrakcji. Dla VIDOPET odczytano odrębną korektę dostępności danych, bez deklaracji kompletnego audytu.

| ID | Źródło | Odczyt |
|---|---|---|
| `methods_src_v2_vidopet` | [Personality traits in companion dogs—Results from the VIDOPET](https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0195448) | `full_text_sections` |
| `methods_src_v2_gosling` | [A dog’s got personality: a cross-species comparative approach to personality judgments in dogs and humans](https://pubmed.ncbi.nlm.nih.gov/14674821/) | `abstract` |
| `methods_src_v2_cat_temperament` | [Validation of a temperament test for domestic cats](https://www.tandfonline.com/doi/abs/10.2752/089279303786991982) | `abstract` |
| `methods_src_v2_dogfacs_official` | [DogFACS — official observational tool documentation](https://animalfacs.github.io/AnimalFACS/DogFACS) | `official_guideline` |
| `methods_src_v2_catfacs` | [Development and application of CatFACS: Are human cat adopters influenced by cat facial expressions?](https://www.sciencedirect.com/science/article/pii/S0168159117300102) | `abstract` |
| `methods_src_v2_dog_context_affect` | [Evaluating the accuracy of facial expressions as emotion indicators across contexts in dogs](https://link.springer.com/article/10.1007/s10071-021-01532-1) | `full_text_sections` |
| `methods_src_v2_cat_affect_hypotheses` | [Facial correlates of emotional behaviour in the domestic cat (Felis catus)](https://pubmed.ncbi.nlm.nih.gov/28341145/) | `abstract` |
| `methods_src_v2_cat_social_faces` | [Feline faces: Unraveling the social function of domestic cat facial signals](https://www.sciencedirect.com/science/article/pii/S0376635723001419) | `abstract` |
| `methods_src_v2_catflw` | [CatFLW: Cat Facial Landmarks in the Wild Dataset](https://arxiv.org/abs/2305.04232) | `abstract` |
| `methods_src_v2_dogflw` | [DogFLW: Dog Facial Landmarks in the Wild Dataset](https://arxiv.org/abs/2405.11501) | `abstract` |
| `methods_src_v2_ap10k` | [AP-10K: A Benchmark for Animal Pose Estimation in the Wild](https://arxiv.org/abs/2108.12617) | `abstract` |
| `methods_src_v2_oxford_pet` | [Cats and Dogs — Oxford-IIIT Pet Dataset](https://www.robots.ox.ac.uk/~vgg/publications/2012/parkhi12a/) | `abstract` |
| `methods_src_v2_animal_kingdom` | [Animal Kingdom: A Large and Diverse Dataset for Animal Behavior Understanding](https://arxiv.org/abs/2204.08129) | `abstract` |
| `methods_src_v2_arrive` | [The ARRIVE guidelines 2.0: Updated guidelines for reporting animal research](https://journals.plos.org/plosbiology/article?id=10.1371/journal.pbio.3000410) | `official_guideline` |
| `methods_src_v2_arrive_e` | [Reporting animal research: Explanation and elaboration for the ARRIVE guidelines 2.0](https://journals.plos.org/plosbiology/article?id=10.1371/journal.pbio.3000411) | `official_guideline` |
| `methods_src_v2_nist_gai` | [Artificial Intelligence Risk Management Framework: Generative Artificial Intelligence Profile](https://nvlpubs.nist.gov/nistpubs/ai/NIST.AI.600-1.pdf) | `official_guideline` |
| `methods_src_v2_coco` | [Microsoft COCO: Common Objects in Context](https://arxiv.org/abs/1405.0312) | `abstract` |
| `methods_src_v2_woah_welfare` | [Terrestrial Animal Health Code, Chapter 7.1: Introduction to the recommendations for animal welfare — 2024 PDF](https://www.woah.org/fileadmin/Home/eng/Health_standards/tahc/2023/chapitre_aw_introduction.pdf) | `official_guideline` |
| `methods_src_v2_dog_inhibition` | [Measures of Dogs’ Inhibitory Control Abilities Do Not Correlate across Tasks](https://www.frontiersin.org/journals/psychology/articles/10.3389/fpsyg.2017.00849/full) | `full_text_sections` |
| `methods_src_v2_dogfacs_study` | [Paedomorphic Facial Expressions Give Dogs a Selective Advantage](https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0082686) | `full_text_sections` |

## Co zostało sprawdzone i co pozostaje luką

JSON, identyfikatory, relacje źródeł, zgodność gatunku i kontrakt kart można sprawdzić walidatorem projektu. Merytoryczna ocena obejmowała źródłowe abstrakty lub wskazane sekcje i kontrolę zakresu; nie jest przeglądem systematycznym. Nie czytano wszystkich pełnych tekstów, nie sprawdzono kompletnie retrakcji i nie uzyskano recenzji eksperckiej. Prawa do konkretnych danych, wideo, instrukcji i wag pozostają odrębnym zadaniem.

Etogram potrzebuje obserwacji pilotażowych, dwóch niezależnych oceniających, analizy zgodności i poprawienia niejednoznacznych granic kodów. Szczególnie trudne są warianty chodu, dźwięki nakładające się, ocena oczu przez sierść, niepełny kadr oraz rozróżnienie pozycji od rzeczywistej eliminacji. Nie ma modelu analizy wideo, walidowanego wyniku osobowości, modelu rozumienia emocji ani działającego czatu LLM.

Dalsza walidacja wymaga wcześniej zapisanego celu i metryki, grupowania danych według osobnika/domu/filmu, niezależnego testu w nowych warunkach i możliwości odmowy oceny. Należy badać również nieobecność dowodów i kontrprzykłady; liczba kart sama nie określa jakości bazy.
