# Pies: fundament wiedzy behawiorystycznej

Przegląd źródeł: **2026-10-07**. Wersja początkowa zawiera **23 źródła i 40 kart**: 7 wytycznych lub stanowisk towarzystw, 15 badań pierwotnych i 1 oficjalny opis narzędzia. Katalog znajduje się w `data/raw/manual/behavior_knowledge/dog_sources.json`, a karty w `dog_cards.json`. Nie pobrano całych publikacji ani zbiorów uczestników.

To podstawa do opisywania obserwacji, zadawania trafniejszych pytań i wyszukiwania wiedzy. Nie jest walidowanym systemem diagnozy, dekoderem myśli ani dowodem „przeniesienia osobowości”. Rozmowa po polsku może korzystać z profilu psa, ale wypowiedź generowana w jego imieniu powinna być jawnie oznaczoną narracją opartą na hipotezach.

## Zakres

Karty obejmują komunikację z człowiekiem, uczenie, stres, wczesne doświadczenia, problemy separacyjne, indywidualne różnice, ból, starzenie, pomiar ankietowy i dobrostan. Każda wskazuje źródło, możliwe wyjaśnienia, czynniki zakłócające, ograniczenia oraz bezpieczny następny krok.

Zalecenia kliniczne i projektowe trzeba rozróżniać. `evidence_level` oznacza **typ źródła**, a nie potwierdzoną skuteczność konkretnej karty lub modelu. `safe_next_steps` oraz `escalation` są autorską adaptacją do produktu i wymagają zatwierdzenia przez lekarza oraz specjalistę zachowania. Szczególnie reguła pilnej eskalacji jest konserwatywną decyzją bezpieczeństwa projektu.

[AAHA Behavior Management Guidelines](https://www.aaha.org/resources/2015-aaha-canine-and-feline-behavior-management-guidelines/behavior-management-home-2/) stanowią kliniczną podstawę wczesnego dostrzegania zmian i ograniczania lęku. [AVSAB Humane Dog Training](https://avsab.org/wp-content/uploads/2021/08/AVSAB-Humane-Dog-Training-Position-Statement-2021.pdf) uzasadnia wybór metod opartych na nagrodach. [WSAVA Animal Welfare Guidelines](https://wsava.org/wp-content/uploads/2019/12/WSAVA-Animal-Welfare-Guidelines-2018.pdf) rozszerzają ocenę o potrzeby środowiskowe i behawioralne.

## C-BARQ i autorski wywiad

[C-BARQ](https://vetapps.vet.upenn.edu/cbarq/about.cfm) jest osobnym, standaryzowanym instrumentem oceny raportowanej przez opiekuna, z [pierwotną walidacją Hsu i Serpella](https://pubmed.ncbi.nlm.nih.gov/14621216/). W repozytorium nie ma jego pozycji ani algorytmu punktowania.

Komercyjne osadzenie, tłumaczenie, skrócenie, redystrybucja wyników referencyjnych i dostęp do bazy wymagają odrębnego ustalenia praw z podmiotem odpowiedzialnym za instrument. Dostępność strony oraz licencja artykułu o walidacji nie udzielają automatycznie licencji na kwestionariusz. Nie zweryfikowano zgody na wykorzystanie instrumentu w tym produkcie.

[Walidacja wersji skróconej z 2024](https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0299973) porównuje konkretne wersje. Nie stanowi walidacji dowolnego skrótu ani polskiego przekładu. Autorski wywiad projektu należy nazywać wywiadem, dopóki nie przejdzie badania rzetelności i trafności. Odpowiedź „nie obserwowano” powinna pozostać odrębna od „nie występuje”.

## Reguły modelowania proponowane dla COPOWIESZ

Poniższe zasady są decyzjami projektowymi, inspirowanymi źródłami; nie zostały jeszcze zweryfikowane dla aplikacji.

1. Zapisuj najpierw obserwację: czas, bodziec, ruch, postawę, dźwięk, kolejność, reakcję otoczenia i jakość nagrania. Interpretację przechowuj oddzielnie.
2. Buduj profil z powtarzanych naturalnych epizodów i wywiadu. Oznaczaj, czy informacja pochodzi z wideo, opiekuna czy specjalisty.
3. Oddzielaj chwilowy stan, długotrwałą skłonność, preferencję i problem zdrowotny. Nowa zmiana nie powinna automatycznie nadpisywać charakteru.
4. Przechowuj konkurencyjne hipotezy i brak danych. Sprzeczne pomiary powinny prowadzić do sprawdzenia kontekstu, zamiast wymuszonego uzgodnienia.
5. Nie określaj osobowości ze zdjęcia lub rasy. [Morrill et al.](https://pubmed.ncbi.nlm.nih.gov/35482869/) pokazują ograniczoną wartość rasy w przewidywaniu zachowania jednostki.
6. Nie prowokuj lęku, bólu, konfliktu ani dłuższej separacji dla uzyskania materiału. Uwzględniaj możliwość wycofania się psa.
7. Nie podawaj leków, dawek ani rozpoznań na podstawie kart. Plan medyczny pozostaje zadaniem lekarza.

## Luki wymagające walidacji

| Obszar | Co trzeba sprawdzić przed deklaracją działania |
| --- | --- |
| Etykietowanie wideo | Zgodność niezależnych specjalistów, jasne definicje obserwacji i rozbieżności. |
| Rozpoznawanie sygnałów | Czułość i precyzja dla różnych sylwetek, sierści, wieku, oświetlenia i przesłonięć. |
| Interpretacja emocji | Trafność poza sytuacją laboratoryjną; nie utożsamiać etykiety ruchu z emocją. |
| Profil osobowości | Powtarzalność w czasie, wiele kontekstów, rozdzielenie zdrowia i doświadczeń. |
| Polski wywiad | Zrozumiałość, zgodność tłumaczenia, rzetelność i trafność w polskiej populacji. |
| Eskalacja | Ocena kliniczna błędnych alarmów i przeoczonych stanów wymagających pomocy. |
| Warstwa rozmowy | Jawność narracji, zgodność ze źródłami i odporność na wymyślanie wspomnień. |

Próby z badań bywają małe, samodobrane, kliniczne albo ograniczone geograficznie. Raporty opiekunów i korelacje nie są dowodem przyczynowości. Dane psa należy dzielić między trening i test na poziomie **osobnika**, aby kolejne klipy tego samego zwierzęcia nie dawały pozornej skuteczności.

`license_status` opisuje tylko sprawdzone deklaracje. Materiały bez potwierdzonej licencji pozostają katalogiem i zwięzłymi własnymi streszczeniami. Potwierdzone CC BY wymaga atrybucji; prawa do materiałów osób trzecich i instrumentów sprawdza się odrębnie. Wszystkie teksty kart są oryginalnymi polskimi streszczeniami lub projektowymi zastosowaniami, bez cytatów z publikacji.
