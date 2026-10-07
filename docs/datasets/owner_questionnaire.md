# Zbiór owner_questionnaire

Autorski polski formularz badawczy v1, utworzony 2026-10-07. Nie zawiera pozycji C-BARQ
ani Fe-BARQ, nie ma klinicznej punktacji i nie przeszedł walidacji psychometrycznej.

Surowy plik: `data/raw/manual/questionnaires/owner_questionnaire_v1.json`.
94 pytania, 12 sekcji; 76 wspólnych i po 9 specyficznych dla gatunku. Formularz jednego
gatunku obejmuje 85 możliwych pytań; aplikacja webowa pokazuje je etapami.

Pola: version, language, status, recall_window_days, scoring_policy, sections i questions.
Każde pytanie ma id, section_id, species, prompt, type, optional/required, construct,
recall_window_days i notes; pytania wyboru mają opcje z unknown oraz not_applicable.
Kontrakt odpowiedzi i flagi jakości zapisano w tym samym pliku.

Historia i metadane mogą mieć recall_window_days=null. Pytania o obserwację dotyczą 14 dni.
„Nie wiem”, „nie dotyczy”, „pominięto” i „zero” muszą pozostać różnymi stanami.

Nie zebrano publicznego zbioru prawdziwych odpowiedzi. Adapter aplikacji webowej zapisuje
odpowiedzi w prywatnej pamięci IndexedDB i, po jawnej synchronizacji, w Supabase. Zachowuje
identyfikator pytania, czas, gatunek i odrębne stany braków danych. Fundament Python ma
osobny magazyn; nie synchronizuje odpowiedzi aplikacji automatycznie. Wyniki opisowe
powinny być odtwarzalne, bez nazywania ich osobowością lub diagnozą.

Walidacja struktury jest objęta testami. Trafność pytań, powtarzalność, obciążenie opiekuna
i polskie konstrukty wymagają osobnych badań. Instrukcja: `docs/QUESTIONNAIRES.md`.
