"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, HeartHandshake, MessageCircle, Search, ShieldCheck, Sparkles, Volume2 } from "lucide-react";
import styles from "./public-info.module.css";

const categories = ["Wszystko", "Pierwsze kroki", "Test", "Nagrania", "Rozmowa", "Twoje dane", "Rozwiąż problem"] as const;
type Category = (typeof categories)[number];
type GuideEntry = {
  id: string;
  category: Exclude<Category, "Wszystko">;
  question: string;
  paragraphs: string[];
  steps?: string[];
  tip?: string;
  keywords?: string;
};

const guideEntries: GuideEntry[] = [
  {
    id: "pierwszy-profil", category: "Pierwsze kroki", question: "Od czego zacząć z własnym psem lub kotem?",
    paragraphs: ["Otwórz aplikację i wybierz „Poznajmy się”. Wpisz imię zwierzaka i wybierz psa albo kota. Wiek i zdjęcie możesz uzupełnić, jeśli je znasz i chcesz je dodać. Każdy zwierzak ma osobny profil, odpowiedzi, nagrania i historię.", "Przygotowanie osobistego profilu obejmuje pełny test i cztery kierowane sytuacje do nagrania. Możesz rozłożyć je na kilka spokojnych sesji. Rozmowa pokazana przed ukończeniem przygotowania jest oznaczona jako demonstracja; nie oznacza gotowej personalizacji Twojego zwierzaka."],
    tip: "Najpierw chcesz zobaczyć pomysł? Wybierz „Zobacz rozmowę z Luną”. Luna jest przykładem z wymyślonymi danymi.", keywords: "start nowy zwierzak dodaj imię pies kot wiek zdjęcie",
  },
  {
    id: "demo-i-profil", category: "Pierwsze kroki", question: "Czym różni się demonstracja od rozmowy z moim zwierzakiem?",
    paragraphs: ["Demonstracja pozwala poznać formę rozmowy. Przykładowa Luna ma syntetyczne wspomnienia. Nie mówi w imieniu Twojego kota ani psa.", "Własny profil budujesz z odpowiedzi, rzeczywistych nagrań i informacji, które sam potwierdzisz. Aplikacja pokazuje, co pozostało do przygotowania. Nawet po jego ukończeniu cyfrowa reprezentacja pozostaje interpretacją danych, a nie odczytywaniem myśli zwierzęcia."],
    keywords: "Luna Borys fikcja przykład osobowość gotowy",
  },
  {
    id: "dostep-do-rozmowy", category: "Pierwsze kroki", question: "Dlaczego nie mogę jeszcze uruchomić rozmowy Gemini?",
    paragraphs: ["Publiczny dostęp do generowania przez Gemini jest obecnie wyłączony. Uruchomienie tej funkcji wymaga dostępu do konta oraz konfiguracji zgodnej z warunkami Google dla Polski i Europejskiego Obszaru Gospodarczego. Samo zalogowanie nie omija tego ograniczenia.", "Konta gości są obecnie wyłączone, a ogólna rejestracja przez e-mail czeka na uruchomienie wysyłki wiadomości potwierdzających. Możesz nadal przygotowywać profil na tym urządzeniu, wypełniać test, zapisywać filmy i własne obserwacje oraz korzystać z wiedzy. Dostępna odpowiedź lokalna jest oznaczana osobno — nie jest odpowiedzią Gemini."],
    tip: "Jeśli masz już konto, możesz je obsługiwać w Ustawieniach → „Mam konto z adresem e-mail”. Aktualny zakres funkcji znajdziesz na stronie „Dostęp i płatności”. W razie problemów napisz na kontakt@copowiesz.pl.", keywords: "logowanie konto hasło rejestracja email poczta SMTP niedostępne bezpłatna płatna EOG EEA Polska",
  },
  {
    id: "pelny-test", category: "Test", question: "Jak przejść 85 pytań bez pośpiechu?",
    paragraphs: ["Test jest podzielony na 11 obszarów: obejmuje codzienne zachowanie, relacje, preferencje, konteksty i historię zwierzaka. Wybierz „Poznajmy się” i przechodź przez kolejne części. Odpowiedzi zapisują się w tej przeglądarce, więc możesz wrócić do nich później.", "Opisuj własne obserwacje z okresu wskazanego w pytaniu. Jedno zachowanie w jednej sytuacji nie musi być stałą cechą. Jeśli zachowanie zależy od miejsca, osoby lub pory dnia, zachowaj ten kontekst w dostępnej odpowiedzi albo w swojej notatce."],
    tip: "Przejrzenie wszystkich pytań nie jest kliniczną oceną ani naukowo potwierdzonym wynikiem osobowości. Test służy uporządkowaniu informacji o tym konkretnym zwierzaku.", keywords: "kwestionariusz moduły części osobowość ile długo odpowiedzi zapisywanie",
  },
  {
    id: "nie-wiem", category: "Test", question: "Nie znam odpowiedzi albo dana sytuacja nas nie dotyczy. Co wybrać?",
    paragraphs: ["Wybierz „Nie wiem”, gdy nie masz obserwacji, oraz „Nie dotyczy”, gdy sytuacja nie występuje u Twojego zwierzaka. Są to uczciwe odpowiedzi. Aplikacja zachowuje brak wiedzy; nie zamienia go w ocenę zachowania.", "Nie organizuj sztucznej sytuacji tylko po to, aby odpowiedzieć na pytanie. Nie sprawdzaj reakcji na ból, strach, odbieranie jedzenia czy przymusowy dotyk. Kiedy w przyszłości pojawi się spokojna, naturalna obserwacja, możesz poprawić odpowiedź."],
    keywords: "nie znam brak danych pomiń niewiadome nieobserwowane",
  },
  {
    id: "zmiana-odpowiedzi", category: "Test", question: "Zwierzak się zmienił albo pomyliłem się w odpowiedzi. Jak to poprawić?",
    paragraphs: ["Wróć do odpowiedniego pytania w sekcji „Poznajmy się” i zmień odpowiedź. W sekcji „Wasza historia” możesz dopisać, kiedy i w jakim kontekście zauważyłeś zmianę. Błędne wspomnienie usuń i dodaj poprawny wpis, aby rozmowa nie opierała się na nieaktualnych danych.", "Rozdzielaj zwykłą tendencję od chwilowego stanu. Na przykład „zwykle podchodzi do gości” i „dzisiaj po podróży został w legowisku” opisują różne informacje. Nagła zmiana zachowania może wymagać konsultacji, zamiast dopisania nowej cechy osobowości."], keywords: "edycja aktualizacja popraw odpowiedź zmiana zdrowie",
  },
  {
    id: "cztery-nagrania", category: "Nagrania", question: "Jakie cztery sytuacje mam nagrać?",
    paragraphs: ["W „Nagraniach” aplikacja prowadzi przez cztery konteksty: chwilę codzienności, znany głos i imię, zaproszenie do znanej zabawy oraz dobrowolny kontakt. Każde zadanie ma własną instrukcję i zasady przerwania. Dobierz spokojną chwilę do potrzeb psa lub kota.", "Klip przypisz do sytuacji, którą rzeczywiście pokazuje. Kilka filmów z zabawy nie zastępuje pozostałych kontekstów. Aplikacja wskazuje kolejny brakujący kontekst; techniczne przyjęcie filmu nie potwierdza, że model poprawnie zrozumiał zachowanie."],
    tip: "Odejście, brak podejścia albo brak widocznej reakcji też mogą być obserwacją. Nie trzeba uzyskać efektownej odpowiedzi zwierzaka.", keywords: "baseline name play contact zadania imię odpoczynek kontakt reakcje kolejne co dalej",
  },
  {
    id: "przygotowanie-kamery", category: "Nagrania", question: "Jak ustawić telefon i rozpocząć nagrywanie?",
    paragraphs: ["Otwórz aplikację w przeglądarce telefonu przez bezpieczny adres https://copowiesz.pl. Wybierz „Nagrania”, przeczytaj instrukcję aktualnego zadania, a potem „Włącz kamerę”. Przeglądarka poprosi o dostęp do kamery i, jeśli pozostawisz zaznaczone „Nagraj również dźwięk”, do mikrofonu."],
    steps: ["Ustaw telefon stabilnie. Pokaż całe ciało zwierzaka i przestrzeń, w której może odejść. Nie zbliżaj obiektywu do pyska.", "Wybierz zwykłe, znajome miejsce z dostępnym światłem. Zadbaj, by nie nagrywać innych osób ani prywatnych rozmów.", "Wybierz „Rozpocznij nagranie”. Aplikacja kończy nagranie po 30 sekundach; możesz zakończyć je wcześniej.", "Zostań na ekranie nagrywania. Po zakończeniu poczekaj na zapis, obejrzyj film i sprawdź, co rzeczywiście się nagrało."],
    keywords: "komórka kamera telefon iphone android safari chrome światło mikrofon uprawnienia 30 sekund",
  },
  {
    id: "przerwanie-nagrania", category: "Nagrania", question: "Zwierzak odchodzi, nie chce zabawy albo wygląda na niespokojnego. Co teraz?",
    paragraphs: ["Pozwól mu odejść. Nie przywołuj wielokrotnie, nie blokuj wyjścia, nie budź i nie wyciągaj z kryjówki. Jeśli sytuacja przestaje być komfortowa, wybierz „Przerwij dla komfortu”. Zapisana informacja o przerwaniu nie jest oceną ani porażką zwierzaka.", "Zadanie, którego nie możesz bezpiecznie wykonać, pomiń jako brak danych. Przerwane i pominięte zadania nie są zaliczane jako ukończone konteksty profilu. Możesz wrócić później, ale nie musisz wymuszać zachowania, aby domknąć przygotowanie."],
    tip: "Komfort zwierzaka ma pierwszeństwo przed postępem w aplikacji. Jeśli niepokoją Cię objawy lub nagła zmiana zachowania, skontaktuj się z lekarzem weterynarii.", keywords: "stop pominięcie stres lęk ból agresja ucieka nie chce nie reaguje",
  },
  {
    id: "import-filmu", category: "Nagrania", question: "Mam film w telefonie. Jak go dodać i jakie są limity?",
    paragraphs: ["Wybierz właściwe zadanie w „Nagraniach”, a następnie „Dodaj film z telefonu”. Wybierz film, który pokazuje ten kontekst. Import przyjmuje klip do 60 sekund i do 50 MiB, czyli około 52 MB. Większy lub dłuższy materiał skróć w edytorze telefonu przed dodaniem.", "Najpraktyczniejsze formaty to MP4 i WebM. Film musi dać się odczytać w Twojej przeglądarce; pliki MOV lub OGG mogą działać zależnie od urządzenia. Jeśli widzisz błąd formatu, wyeksportuj kopię jako MP4 i dodaj ją ponownie. Nie trzeba ponownie nagrywać zwierzaka."],
    keywords: "MP4 WebM MOV QuickTime OGG plik format megabajty MiB MB 50 60 sekund galeria album limit",
  },
  {
    id: "zgoda-na-analize", category: "Nagrania", question: "Czy film automatycznie trafia do Google?",
    paragraphs: ["Nie. Zgoda na analizę przez Gemini na ekranie nagrywania jest osobnym wyborem dla materiału, który analizujesz. Bez zaznaczenia zgody aplikacja zapisuje klip lokalnie i sprawdza jego parametry techniczne. Nie tworzy wtedy opisu zachowania z obrazu.", "Po zaznaczeniu zgody i przy dostępnym koncie oraz połączeniu film lub wybrane klatki są wysyłane do Google. To osobna czynność od ręcznego zapisania filmów w chmurze. O zasadach przetwarzania danych przeczytasz w polityce prywatności."],
    tip: "Przed zgodą obejrzyj kadr. Usuń z niego osoby, dane na dokumentach, prywatne rozmowy i inne informacje, których nie chcesz przekazać do analizy.", keywords: "prywatność Gemini AI sztuczna inteligencja wysyłka consent zgoda techniczne lokalnie Google",
  },
  {
    id: "film-czy-klatki", category: "Nagrania", question: "Dlaczego analiza czasem obejmuje tylko klatki bez dźwięku?",
    paragraphs: ["Krótki plik MP4 lub WebM do 2 MiB może zostać przekazany w całości do analizy Gemini. Dla większego materiału lub innych obsługiwanych lokalnie formatów aplikacja przygotowuje do sześciu klatek z oznaczeniem czasu. Pełny film pozostaje zapisany w przeglądarce.", "Próbki nie pokazują wszystkich ruchów i nie zawierają dźwięku. Opis oparty na klatkach powinien wskazywać to ograniczenie. Z takiego wyniku nie można pewnie ocenić reakcji na słowa, kolejności wszystkich zdarzeń ani znaczenia szczekania czy miauczenia."],
    keywords: "audio dźwięk sześć 6 klatki cały film próbki rozmiar 2MB 2MiB ograniczenia",
  },
  {
    id: "potwierdz-obserwacje", category: "Nagrania", question: "Jak zamienić nagranie w przydatne wspomnienie?",
    paragraphs: ["Obejrzyj zapisany klip. Pod nim znajdziesz „Moja obserwacja z filmu”. Opisz własnymi słowami to, co widzisz: co działo się przed reakcją, co zrobił zwierzak i co nastąpiło później. Potem zaznacz „Obejrzałem film i potwierdzam swoją obserwację” i wybierz „Zapisz moją obserwację”.", "Na przykład: „Gdy usiadłem obok legowiska, podszedł po kilku sekundach i położył się przy mojej nodze”. To lepsza informacja niż „kocha wszystkich”. Opis modelu nie trafia automatycznie do pamięci jako potwierdzony fakt. Twoja adnotacja zachowuje powiązanie z konkretnym filmem."],
    keywords: "pamięć historia notatka adnotacja potwierdzenie weryfikacja zapisz fakt źródło",
  },
  {
    id: "bledny-opis", category: "Nagrania", question: "Model pomylił zachowanie albo dopisał emocję. Jak zareagować?",
    paragraphs: ["Potraktuj opis jako propozycję do sprawdzenia. Porównaj go z filmem i zapisz własną obserwację. Nie potwierdzaj zdania tylko dlatego, że brzmi przekonująco. Rozmazany obraz, pojedyncze klatki i brak kontekstu mogą prowadzić do błędów.", "Oddziel widoczne zdarzenie od interpretacji: „odwrócił głowę” jest obserwacją, a „poczuł się obrażony” jest domysłem. Nie zapisuj wyniku modelu jako rozpoznania choroby ani stałej cechy osobowości. Jeśli błędna informacja znalazła się w Twojej historii, usuń ją i dodaj właściwy zapis."],
    keywords: "halucynacja AI błąd źle rozpoznaje emocje analiza nieprawda",
  },
  {
    id: "rozmowa-po-polsku", category: "Rozmowa", question: "O co pytać, żeby rozmowa była przydatna?",
    paragraphs: ["Pisz po polsku i podawaj konkretną sytuację. Zamiast „Dlaczego zawsze jesteś niegrzeczny?” spróbuj „Gdy przychodzą goście, chowasz się pod stołem. Co w moich obserwacjach może pomóc mi to zrozumieć?”. Możesz zapytać o preferencje, znane rytuały, różnice między sytuacjami i braki w profilu.", "Poproś o wskazanie, na jakiej odpowiedzi, wspomnieniu lub źródle opiera się wypowiedź. Sprawdzaj oznaczenia demonstracji, dostawcy odpowiedzi i źródła wiedzy. Słowa wypowiadane w pierwszej osobie są sposobem przedstawienia cyfrowej reprezentacji; nie są dosłowną wypowiedzią zwierzęcia."],
    tip: "Przykłady: „Co już wiesz o mojej zabawie?”, „Które zachowania opisałem za ogólnie?”, „Co mogę spokojnie zaobserwować następnym razem?”.", keywords: "czat rozmawiać pytania polski głos osobowość źródła pamięć",
  },
  {
    id: "brak-wiedzy", category: "Rozmowa", question: "Rozmowa wie o zwierzaku za mało. Co uzupełnić?",
    paragraphs: ["Sprawdź postęp testu i czterech kontekstów nagrań. Wróć do odpowiedzi „Nie wiem”, jeśli masz już spokojne obserwacje. Dodaj w sekcji „Wasza historia” konkretne preferencje i zdarzenia, a do istniejących filmów — własne adnotacje.", "Uzupełniaj kontekst zamiast mnożyć ogólne etykiety. „Najczęściej wybiera wędkę, ale po kilku minutach odchodzi” daje więcej informacji niż „jest zabawowy”. Aplikacja powinna przyznawać, że czegoś nie wie. Nie należy zastępować braków stereotypem rasy."],
    keywords: "personalizacja mało informacji brak danych nie wiem rasa wspomnienia",
  },
  {
    id: "zdrowie", category: "Rozmowa", question: "Czy aplikacja rozpozna chorobę z wyglądu albo zachowania?",
    paragraphs: ["Nie rozpoznaje chorób z filmu, zdjęcia ani testu. Informacje o zdrowiu mają pomóc uporządkować zauważone objawy, możliwe wyjaśnienia i potrzebę konsultacji. W takim temacie odpowiedź powinna wychodzić poza fikcyjny głos zwierzaka i wskazywać źródła.", "Nie podawaj leków ani nie zmieniaj leczenia na podstawie rozmowy. Jeśli zwierzak wygląda na poważnie chorego, ma nagłe objawy albo niepokoi Cię jego stan, skontaktuj się z lekarzem weterynarii. Nie czekaj na ukończenie profilu lub analizę nagrania."],
    keywords: "weterynarz choroba diagnoza objawy leczenie leki ból pilność nagła zmiana",
  },
  {
    id: "dyktowanie-odsluch", category: "Rozmowa", question: "Jak użyć mikrofonu i przycisku „Posłuchaj”?",
    paragraphs: ["Jeśli przeglądarka obsługuje dyktowanie, przycisk mikrofonu pozwala wprowadzić tekst głosem. Przeczytaj rozpoznaną wiadomość przed wysłaniem — imiona i krótkie słowa mogą zostać zapisane błędnie. Gdy dyktowanie jest niedostępne, wpisz wiadomość zwyczajnie.", "„Posłuchaj” odczytuje tekst przez funkcję głosową urządzenia. Dostępność polskiego głosu zależy od przeglądarki i systemu. Sprawdź głośność oraz wyciszenie telefonu. To odczyt odpowiedzi aplikacji, a nie tłumaczenie odgłosów zwierzaka."],
    keywords: "mikrofon mowa głos dźwięk TTS speech safari chrome dyktuj odsłuchaj posłuchaj polski",
  },
  {
    id: "zapis-lokalny", category: "Twoje dane", question: "Gdzie są zapisane moje odpowiedzi, rozmowy i filmy?",
    paragraphs: ["Domyślnie profile, odpowiedzi, wspomnienia, rozmowy i pliki nagrań są przechowywane w tej przeglądarce na tym urządzeniu. Inna przeglądarka lub telefon nie pokaże ich automatycznie. W trybie prywatnym dane mogą zniknąć po zamknięciu sesji.", "Wyczyszczenie danych strony albo usunięcie przeglądarki może usunąć lokalną historię. Przed taką zmianą wykonaj kopię profili i pobierz filmy. Zapis lokalny nie oznacza, że wiadomość wysłana do Gemini pozostaje wyłącznie na urządzeniu: treść potrzebna do odpowiedzi trafia do dostawcy modelu."],
    keywords: "IndexedDB prywatność incognito safari pamięć przeglądarka urządzenie telefon gdzie",
  },
  {
    id: "kopia-danych", category: "Twoje dane", question: "Jak zrobić kopię i przenieść profil na inne urządzenie?",
    paragraphs: ["W Ustawieniach znajdź „Twoja kopia danych” i wybierz „Pobierz dane JSON”. Kopia zawiera profile, odpowiedzi, historię i rozmowy. Nie zawiera plików wideo ani klucza API. Filmy pobierz osobno przy każdym klipie w „Nagraniach”."],
    steps: ["Zapisz kopię JSON i potrzebne filmy w miejscu, do którego masz dostęp, a inne osoby nie mają przypadkowego dostępu.", "Na drugim urządzeniu otwórz aplikację i w Ustawieniach wybierz „Wczytaj kopię”.", "Sprawdź komunikat o liczbie profili. Wczytanie zastępuje obecne dane w tej przeglądarce — najpierw pobierz ich kopię, jeśli chcesz je zachować.", "Pliki wideo pozostają osobną kopią. Sam import JSON nie przywraca filmów w odtwarzaczu ani nie pobiera ich z chmury."],
    keywords: "backup export import eksport JSON pobierz wczytaj zmiana komórki utrata danych",
  },
  {
    id: "chmura", category: "Twoje dane", question: "Czy logowanie automatycznie wysyła profil i filmy do chmury?",
    paragraphs: ["Samo logowanie nie wysyła profilu. Zapis w chmurze jest ręczny i wymaga dostępnego konta. W Ustawieniach wybierz „Zapisz profile w chmurze”, jeśli chcesz przekazać swoje profile, odpowiedzi, pamięć i rozmowy do prywatnego miejsca przypisanego do konta.", "Filmy wysyła się osobno opcją „Wyślij także lokalne filmy do prywatnej chmury”. „Pobierz profile” przywraca dane profilu, ale nie pobiera automatycznie plików wideo. Kopia lokalna i chmurowa mogą różnić się, jeśli od ostatniego ręcznego zapisu coś zmieniłeś."],
    tip: "Analiza nagrania przez Google i przechowywanie filmów w chmurze są odrębnymi wyborami. Zgoda na jedno nie zastępuje decyzji o drugim.", keywords: "Supabase synchronizacja ręczna upload download logowanie prywatna chmura",
  },
  {
    id: "usun-profil", category: "Twoje dane", question: "Jak usunąć profil i jego dane?",
    paragraphs: ["Wybierz właściwego zwierzaka, otwórz Ustawienia i znajdź „Usuń profil … i jego lokalne dane”. Przed potwierdzeniem możesz pobrać kopię. Usunięcie obejmuje lokalny profil, odpowiedzi, rozmowy, pamięć i jego pliki wideo.", "Jeżeli jesteś zalogowany i masz kopię w chmurze, w oknie potwierdzenia zaznacz także usunięcie profilu i filmów z konta w chmurze. Usunięcie tylko lokalnej kopii nie usuwa kopii chmurowej. Osobno usuń wyeksportowane pliki, które sam zachowałeś."],
    keywords: "kasowanie usuń prywatność zapomnij lokalnie chmura RODO dane",
  },
  {
    id: "kamera-nie-dziala", category: "Rozwiąż problem", question: "Kamera lub mikrofon nie działa. Co sprawdzić?",
    paragraphs: ["Nie musisz nagrywać reakcji ponownie, aby rozwiązać problem techniczny. Jeśli masz już odpowiedni film, użyj „Dodaj film z telefonu”."],
    steps: ["Sprawdź, czy otwierasz https://copowiesz.pl w przeglądarce, a nie w podglądzie strony wewnątrz innej aplikacji. Możesz otworzyć ten sam adres w Safari lub Chrome.", "W ustawieniach strony w przeglądarce dopuść kamerę. Jeśli chcesz dźwięk, dopuść również mikrofon; bez niego odznacz „Nagraj również dźwięk”.", "Zamknij inną aplikację używającą kamery. Wróć do strony i ponownie wybierz „Włącz kamerę”.", "Jeżeli urządzenie nadal nie pozwala nagrać filmu w przeglądarce, użyj zwykłego aparatu telefonu i zaimportuj krótki klip."],
    keywords: "NotAllowedError uprawnienia zablokowana odmowa nie działa kamera czarny ekran iPhone Android",
  },
  {
    id: "analiza-nie-dziala", category: "Rozwiąż problem", question: "Film jest zapisany, ale analiza się nie udała. Czy nagrywać jeszcze raz?",
    paragraphs: ["Najpierw sprawdź, czy możesz odtworzyć zapisany klip. Jeśli tak, zachowaj go i nie powtarzaj sytuacji z udziałem zwierzaka tylko z powodu błędu połączenia. Własną obserwację możesz dodać bez opisu modelu."],
    steps: ["Sprawdź komunikat przy nagraniu. „Parametry techniczne” oznaczają sprawdzenie pliku, a nie analizę zachowania.", "Jeśli chcesz analizę Gemini, sprawdź osobną zgodę na ekranie nagrywania, zalogowanie i dostępność połączenia w Ustawieniach.", "Przy istniejącym klipie użyj „Ponów sprawdzenie” lub „Sprawdź ponownie”. Jeśli limit modelu albo połączenie nadal blokuje analizę, wróć później.", "Jeśli zapis nie powiódł się, a aplikacja udostępnia „Pobierz ten klip”, pobierz go od razu. Nie zamykaj strony przed zachowaniem dostępnego filmu."],
    keywords: "API limit quota Gemini timeout błąd 401 429 ponów brak zgody parametry techniczne nie analizuje",
  },
  {
    id: "brak-profili", category: "Rozwiąż problem", question: "Mój profil lub filmy zniknęły. Gdzie szukać?",
    paragraphs: ["Sprawdź, czy używasz tego samego telefonu, tej samej przeglądarki i zwykłego trybu, w którym utworzyłeś profil. Adres strony również ma znaczenie: dane zapisane na lokalnym adresie testowym lub innej domenie nie pojawią się automatycznie na copowiesz.pl.", "Jeżeli masz kopię JSON, wczytaj ją w Ustawieniach. Jeśli wcześniej ręcznie zapisałeś profile w chmurze, zaloguj się na to samo konto i wybierz „Pobierz profile”. Nagrania zachowane osobno sprawdź w plikach telefonu. Po wyczyszczeniu danych przeglądarki bez kopii aplikacja nie ma lokalnych plików, z których mogłaby je odzyskać."],
    keywords: "zgubiony profil pusty ekran utrata pamięci zniknął nagrania brak film incognito restore",
  },
];

const quickSteps = [
  { title: "Dodaj swojego zwierzaka", text: "Imię i gatunek wystarczą na początek. Luna jest tylko oznaczonym przykładem.", target: "pierwszy-profil", link: "Utworzenie profilu" },
  { title: "Przejdź test w swoim tempie", text: "85 pytań w 11 obszarach. Możesz wracać do odpowiedzi i wybrać „Nie wiem”.", target: "pelny-test", link: "Wypełnianie testu" },
  { title: "Nagraj cztery spokojne sytuacje", text: "Codzienność, Twój głos, znana zabawa i dobrowolny kontakt. Bez wymuszania reakcji.", target: "cztery-nagrania", link: "Prowadzone nagrania" },
  { title: "Zdecyduj o analizie", text: "Klip zostaje lokalnie. Przekazanie obrazu do Google wymaga osobnej zgody i dostępu.", target: "zgoda-na-analize", link: "Zgoda i ograniczenia" },
  { title: "Potwierdź to, co widzisz", text: "Obejrzyj film i zapisz własną obserwację. Model może się pomylić.", target: "potwierdz-obserwacje", link: "Budowanie pamięci" },
  { title: "Rozmawiaj po polsku", text: "Pytaj o konkretne sytuacje. Sprawdzaj, z jakich informacji wynika odpowiedź.", target: "rozmowa-po-polsku", link: "Przydatne pytania" },
];

function searchable(text: string) {
  return text.toLocaleLowerCase("pl").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replaceAll("ł", "l");
}

export function HelpGuide() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<Category>("Wszystko");
  const [requestedEntry, setRequestedEntry] = useState<string | null>(null);
  const words = searchable(query.trim()).split(/\s+/).filter(Boolean);
  const matches = guideEntries.filter((entry) => {
    if (category !== "Wszystko" && entry.category !== category) return false;
    const text = searchable([entry.question, entry.category, ...entry.paragraphs, ...(entry.steps ?? []), entry.tip ?? "", entry.keywords ?? ""].join(" "));
    return words.every((word) => text.includes(word));
  });

  useEffect(() => {
    const anchor = window.location.hash.slice(1);
    if (guideEntries.some((entry) => entry.id === anchor)) setRequestedEntry(anchor);
  }, []);

  useEffect(() => {
    if (!requestedEntry) return;
    const entry = document.getElementById(requestedEntry);
    if (entry instanceof HTMLDetailsElement) {
      entry.open = true;
      entry.scrollIntoView({ block: "start", behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" });
      entry.querySelector("summary")?.focus({ preventScroll: true });
    }
    setRequestedEntry(null);
  }, [requestedEntry]);

  function openEntry(id: string) {
    setCategory("Wszystko");
    setQuery("");
    setRequestedEntry(id);
    window.history.replaceState(window.history.state, "", `#${id}`);
  }

  return (
    <>
      <div className={styles.statusNote}>
        <ShieldCheck size={20} aria-hidden="true" />
        <p><strong>Co możesz zrobić już teraz:</strong> przygotować lokalny profil, test, filmy i własne obserwacje. Publiczne generowanie przez Gemini jest obecnie wyłączone; konta gości i otwarta rejestracja przez e-mail też nie są dostępne. <a href="#dostep-do-rozmowy" onClick={(event) => { event.preventDefault(); openEntry("dostep-do-rozmowy"); }}>Sprawdź wskazówki dotyczące dostępu.</a></p>
      </div>

      <section className={styles.quickStart} id="szybki-start" aria-labelledby="szybki-start-heading">
        <div className={styles.sectionHeading}>
          <div><p className={styles.sectionKicker}>Od pierwszego kroku</p><h2 id="szybki-start-heading">Wasz profil w sześciu krokach</h2></div>
          <p>Nie musisz zrobić wszystkiego jednego dnia. Przygotowanie ma pasować do codzienności Was obojga.</p>
        </div>
        <ol className={styles.quickSteps}>
          {quickSteps.map((step, index) => (
            <li className={styles.quickStep} key={step.target}>
              <span className={styles.stepNumber} aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
              <div><h3>{step.title}</h3><p>{step.text}</p><a href={`#${step.target}`} onClick={(event) => { event.preventDefault(); openEntry(step.target); }}>{step.link}<ArrowRight size={13} aria-hidden="true" /></a></div>
            </li>
          ))}
        </ol>
      </section>

      <section className={styles.recordingGuide} id="spokojne-nagrania" aria-labelledby="spokojne-nagrania-heading">
        <div>
          <p className={styles.sectionKicker}>Najpierw komfort</p>
          <h2 id="spokojne-nagrania-heading">Cztery zwykłe chwile.<br />Żadnego występu.</h2>
          <p>Pokaż całe ciało i możliwość odejścia. Nagrywaj w znajomym miejscu, bez przymusu, niespodziewanych bodźców ani powtarzania zadania dla lepszego efektu.</p>
          <div className={styles.recordingRules}><ShieldCheck size={19} aria-hidden="true" /><p>Jeśli zwierzak nie chce uczestniczyć, przerwij lub pomiń. Komfort jest ważniejszy od zaliczenia zadania.</p></div>
        </div>
        <ul className={styles.contexts}>
          <li><Sparkles size={21} aria-hidden="true" /><div><h3>Chwila codzienności</h3><p>Spokojna, zwykła aktywność. Niczego nie wywołuj — pokaż punkt odniesienia.</p></div></li>
          <li><Volume2 size={21} aria-hidden="true" /><div><h3>Znany głos i imię</h3><p>Użyj swojego zwykłego głosu zgodnie z instrukcją zadania. Nie powtarzaj przywołania, by wymusić podejście.</p></div></li>
          <li><MessageCircle size={21} aria-hidden="true" /><div><h3>Znana zabawa</h3><p>Zaproponuj zabawę, którą zwierzak już zna. Pozwól mu uczestniczyć, odpocząć albo odejść.</p></div></li>
          <li><HeartHandshake size={21} aria-hidden="true" /><div><h3>Dobrowolny kontakt</h3><p>Obserwuj, czy chce być blisko i jaki dystans wybiera. Nie sprawdzaj tolerancji na przymusowy dotyk.</p></div></li>
        </ul>
      </section>

      <section className={styles.faqSection} id="instrukcje" aria-labelledby="instrukcje-heading">
        <div className={styles.sectionHeading}>
          <div><p className={styles.sectionKicker}>Pomoc na konkretny moment</p><h2 id="instrukcje-heading">Znajdź swoją odpowiedź</h2></div>
          <p>Wpisz na przykład „kamera”, „nie wiem” lub „kopia”. Otwórz pytanie, by zobaczyć dokładne wskazówki.</p>
        </div>
        <div className={styles.helpSearch}>
          <label className={styles.searchField}>
            <span className={styles.srOnly}>Szukaj w pomocy</span>
            <Search size={19} aria-hidden="true" />
            <input type="search" placeholder="Czego potrzebujesz?" value={query} onChange={(event) => setQuery(event.target.value)} maxLength={120} aria-controls="odpowiedzi-pomocy" />
          </label>
          <p className={styles.resultCount} role="status" aria-live="polite">{matches.length} z {guideEntries.length} tematów</p>
        </div>
        <div className={styles.filters} role="group" aria-label="Tematy pomocy">
          {categories.map((item) => <button type="button" key={item} aria-pressed={category === item} aria-controls="odpowiedzi-pomocy" onClick={() => setCategory(item)}>{item}</button>)}
        </div>
        <div className={styles.faqList} id="odpowiedzi-pomocy">
          {matches.map((entry) => (
            <details className={styles.faqItem} id={entry.id} key={entry.id}>
              <summary><span className={styles.faqCategory}>{entry.category}</span><span className={styles.faqTitle}>{entry.question}</span></summary>
              <div className={styles.faqAnswer}>
                {entry.paragraphs.map((paragraph, index) => <p key={index}>{paragraph}</p>)}
                {entry.steps && <ol>{entry.steps.map((step) => <li key={step}>{step}</li>)}</ol>}
                {entry.tip && <p className={styles.faqTip}>{entry.tip}</p>}
                {entry.id === "zgoda-na-analize" && <Link href="/polityka-prywatnosci">Przeczytaj politykę prywatności<ArrowRight size={13} aria-hidden="true" /></Link>}
                {entry.id === "zdrowie" && <Link href="/jak-to-dziala#zdrowie-poza-rola">Zobacz zasady informacji o zdrowiu i źródła</Link>}
                {entry.id === "dostep-do-rozmowy" && <><Link href="/platnosci">Sprawdź aktualny dostęp do funkcji</Link><p><a href="mailto:kontakt@copowiesz.pl">Napisz do nas: kontakt@copowiesz.pl</a></p></>}
              </div>
            </details>
          ))}
          {!matches.length && <div className={styles.emptyResults}><h3>Nie znaleźliśmy pasującego tematu.</h3><p>Spróbuj krótszego hasła, wybierz inny temat lub pokaż wszystkie odpowiedzi. Możesz też napisać do nas, opisując problem bez przesyłania prywatnych filmów.</p><button className={styles.resetButton} type="button" onClick={() => { setCategory("Wszystko"); setQuery(""); }}>Pokaż wszystkie tematy</button></div>}
        </div>
      </section>

      <section className={styles.closing} aria-labelledby="help-closing-heading">
        <div><h2 id="help-closing-heading">Wróć do Waszej historii</h2><p>Jeden konkretny szczegół, spokojne nagranie lub poprawiona odpowiedź pomagają zbudować pełniejszy obraz Twojego zwierzaka. Jeśli utkniesz, opisz nam krok, na którym pojawił się problem.</p></div>
        <div className={styles.closingActions}><Link className={styles.primaryLink} href="/">Otwórz aplikację<ArrowRight size={16} aria-hidden="true" /></Link><Link className={styles.secondaryLink} href="/kontakt">Potrzebuję pomocy</Link></div>
      </section>
    </>
  );
}
