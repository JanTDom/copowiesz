# Wygląd aplikacji COPOWIESZ

Stan na 8 października 2026. Źródłem tokenów i responsywnych reguł jest
`web/src/app/globals.css`; fonty są importowane lokalnie w `web/src/app/layout.tsx`.
Wygląd ma wspierać spokojną rozmowę o bliskim zwierzęciu oraz czytelne przejście przez test
i nagrania. Nie używać dekoracyjnych wskaźników pewności lub osobowości.

## Znak i obrazy

Znak łączy kontury psa i kota w ciepłym złotym kolorze. Plik `web/public/brand/logo.png`
wykorzystuje sidebar i mobilny nagłówek; napis „copowiesz” towarzyszy mu w typografii marki.
Zachować proporcje znaku i czytelność na ciemnym tle.

Pięć dostarczonych grafik produktowych znajduje się w `web/public/images/`:

| Plik | Zastosowanie |
|---|---|
| `pet-connection.png` | Główny obraz idei cyfrowej rozmowy na stronie startowej |
| `pet-pair.png` | Dialog dodawania zwierzaka |
| `pet-cat.png` | Przykładowa Luna, ilustracja kota i kontekst instrukcji |
| `pet-dog.png` | Ilustracja psa i kontekst instrukcji |
| `pet-memory.png` | Obraz wspólnej historii i pamięci |

Te zdjęcia/ilustracje budują nastrój, bez udawania zdjęcia konkretnego zwierzaka użytkownika.
Własne zdjęcie profilu jest osobnym materiałem opiekuna. Dla dekoracyjnych obrazów stosować
pusty `alt`; gdy obraz objaśnia ideę lub przykład, opisać ją bez przypisywania mu prawdziwej historii.
Nie używać grafiki produktu jako dowodu zachowania lub wyniku analizy.

## Paleta

| Token | Kolor | Rola |
|---|---|---|
| `--bg` | `#0c1220` | Główne granatowe tło |
| `--surface` | `#141d2c` | Panele i karty |
| `--surface2` | `#182437` | Podniesiony panel i komunikaty |
| `--border` | `#29354a` | Delikatne granice |
| `--text` | `#f6f2e9` | Jasny tekst podstawowy |
| `--muted` | `#a6b2c7` | Tekst wspierający |
| `--gold` | `#edc78c` | Główna akcja, aktywna nawigacja i fokus |
| `--blue` | `#a6bee8` | Linki i akcje pomocnicze |
| `--danger` | `#ffb4b4` | Błąd lub działanie wymagające uwagi |
| `--green` | `#b5dcc9` | Potwierdzenie zapisu |

Stan musi mieć również tekst lub ikonę, bez polegania wyłącznie na kolorze. Przycisk główny
jest złoty z ciemnym tekstem; pomocniczy ma ciemną powierzchnię i obrys. Zachować wyraźny
fokus klawiatury (`focus-visible`) i widoczne komunikaty błędu/zapisu.

## Typografia i układ

`DM Serif Display` służy nagłówkom i nazwie marki; `Manrope Variable` treści, formularzom,
przyciskom i metadanym. Fonty są dostarczane przez przypięte pakiety Fontsource, bez pobierania
ich przez przeglądarkę z zewnętrznego serwera fontów. Unikać zbyt długich wierszy formularza;
rozmowa zachowuje osobną historię i pole wpisywania wiadomości.

Na desktopie sidebar ma 238 px. Na ekranach do 800 px przechodzi w wysuwane menu; konteksty
testu i nagrań mogą przewijać się poziomo, a karty wiedzy przechodzą do jednej kolumny.
Karty mają zwykle promień 9–14 px, delikatny obrys i umiarkowane odstępy. Nie mnożyć paneli,
gdy jeden prosty krok wystarcza. Respektować `prefers-reduced-motion`.

Najważniejszą akcją produktu jest rozmowa. Test pokazuje jedno pytanie i jawne braki;
nagranie pokazuje instrukcję, zgodę na model, zapis i bezpieczne przerwanie. Komunikaty
„demonstracja”, „kontrola parametrów” i „opis modelu do sprawdzenia” muszą pozostać czytelne
przy wyniku, również w mobilnym układzie.

Strona `/kontakt` ma prosty nagłówek „Kontakt”, adres e-mail i neutralne dane firmy oraz
odnośniki do informacji. Nie umieszczać na niej adresu ulicznego ani zachęt do rozmowy.

Historia ma trzy zakładki: zapisy, album i tydzień. Album zachowuje szerokość kolumn także
przy pojedynczej chwili, aby zdjęcie nie wypychało podpisu i działań. Tematy oraz opis sytuacji
wypełniają edytowalną wiadomość. Panel głosowy jasno rozdziela rozpoczęcie mikrofonu, odczyt
i ręczne wysłanie. Karta PNG 1080 × 1350 korzysta z logo i typografii; podgląd zachowuje
czytelne oznaczenie podstawy oraz demonstracji. Wyboru faktów nie zaznacza się automatycznie.

Dotychczasowy QA obejmował 1440 × 1000 i 390 × 844 oraz brak poziomego przepełnienia głównego
ekranu. To nie jest pełny audyt dostępności. Przed pilotażem sprawdzić klawiaturę, czytniki,
powiększenie tekstu, kontrast rzeczywistych stanów i większą zawartość na fizycznych telefonach.
