# Zbiór pet_memory

Dane opiekuna w `data/private/pet_memory.sqlite3`; katalog wyłączony z przyszłego Git.
To lokalny prywatny magazyn pojedynczego użytkownika, bez nagrań i bez kwestionariusza w runtime.

Tabele: pets, observations, profile_versions. Zapis obserwacji pozostaje zapisem źródłowym;
profil jest przetworzoną wersją opisową. Kwestionariusz ma osobny kontrakt i dopiero wymaga
adaptera odpowiedzi. CLI nie prowadzi produkcyjnego audytu korekt ani nie zarządza plikami wideo.

Używać funkcji `add_pet`, `add_observation`, `descriptive_profile`, `delete_pet`.
Wymagany kontekst i czas ze strefą. Rodzaje pochodzenia: relacja opiekuna, adnotacja człowieka,
notatka kliniczna; wszystkie mają status `unverified`, dopóki nie powstanie proces weryfikacji.

Zagregowana liczba zapisów nie stanowi częstości zachowania ani wyniku osobowości.
Brakujące emocje/cechy pozostają pustą listą, a diagnoza null. Nie ma niejawnego uzupełniania.

Plik ma prawa 0600, bez szyfrowania. Usunięcie zwierzaka kaskadowo usuwa wiersze;
`secure_delete=ON` nadpisuje ich usuniętą treść w aktywnym SQLite. To nie obejmuje kopii na poziomie systemu plików.
Operacja
nie usuwa oddzielnych eksportów, plików wideo lub backupów. Syntetyczne demo jest generowane
w katalogu tymczasowym; nie zapisujemy go jako rzeczywistego zwierzaka użytkownika.
