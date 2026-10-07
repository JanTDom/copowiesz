# Technologie analizy wideo — katalog do wyboru

Stan przeglądu: 2026-10-07. Żaden z poniższych modeli nie został zainstalowany, wytrenowany
ani uruchomiony w COPOWIESZ. To źródła technologiczne i możliwe komponenty kolejnego etapu.

| Komponent | Zastosowanie | Sprawdzony stan i granice |
|---|---|---|
| DeepLabCut | Punkty ciała i ruch | Oficjalny kod LGPL-3.0; gotowe modele SuperAnimal mają osobne ograniczenie badawcze/niekomercyjne. [Repozytorium](https://github.com/DeepLabCut/DeepLabCut). |
| SLEAP | Śledzenie pozy wielu zwierząt | Kod BSD-3-Clause-Clear; wymaga własnych adnotacji i oceny domeny. [Repozytorium](https://github.com/talmolab/sleap), [publikacja](https://www.nature.com/articles/s41592-022-01426-1). |
| AP-10K | Dane do punktów ciała różnych gatunków | Oficjalny README deklaruje CC BY 4.0; dokumentacja MMPose podaje ograniczenie niekomercyjne. Trzeba wyjaśnić wersję i prawa przed użyciem; sam zbiór nie oznacza emocji. [Autorzy](https://github.com/AlexTheBad/AP-10K), [MMPose](https://github.com/open-mmlab/mmpose/blob/main/docs/en/dataset_zoo/2d_animal_keypoint.md). |
| Animal Kingdom | Badania rozpoznawania czynności | Repozytorium i publikacja dostępne; prawa do konkretnych klipów wymagają osobnego sprawdzenia. Dane wielu gatunków nie walidują profilu domowego psa/kota. [Repozytorium](https://github.com/sutdcv/Animal-Kingdom), [publikacja](https://arxiv.org/abs/2204.08129). |

Do oceny porównawczej najpierw przygotować mały zgodny etogram i niezależne adnotacje,
następnie wybrać narzędzie na podstawie licencji, jakości przy zasłonięciach, czasu analizy
i możliwości działania na docelowym sprzęcie. Bez własnych nagrań nie da się uczciwie wskazać
zwycięskiego modelu. Nie instalujemy wszystkich frameworków jednocześnie.

Detekcja pozy, klasyfikacja czynności, estymacja stanu i profil osobowości są osobnymi zadaniami.
Każde wymaga swojej walidacji. Wczesny model multimodalny może proponować opis do poprawy przez
człowieka, ale jego swobodny tekst nie staje się etykietą referencyjną.

Audio jest osobnym pomiarem: dźwięk, czas, otoczenie i zdarzenie. Rozpoznawanie cech akustycznych
nie daje uniwersalnego słownika psich/kocich zdań. Głos polskiej reprezentacji generuje się
z pamięci i hipotez, z oznaczeniem jego fikcyjnego charakteru.

Protokół zbierania materiału: `docs/VIDEO_PROTOCOL.md`. Plan testów: `docs/ROADMAP.md`.
