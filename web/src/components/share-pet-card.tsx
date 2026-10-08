"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, Download, ImagePlus, LoaderCircle, LockKeyhole, Share2 } from "lucide-react";
import { getShareableFacts } from "@/lib/engagement";
import { downloadBlob, loadPhotoBlob } from "@/lib/local-store";
import { buildShareCardModel, localPhotoSource, MAX_CARD_FACTS, prepareAlbumPhoto, renderShareCard, shareCardFileName } from "@/lib/share-card";
import type { PetRecord } from "@/lib/types";
import { Modal } from "./ui";
import styles from "./share-pet-card.module.css";

export interface SharePetCardProps { record: PetRecord; onClose?: () => void }

export function SharePetCard({ record, onClose }: SharePetCardProps) {
  const facts = useMemo(() => getShareableFacts(record), [record]);
  const photos = useMemo(() => (record.moments ?? []).filter((moment) => moment.photoId), [record.moments]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [imageChoice, setImageChoice] = useState(() => localPhotoSource(record.pet.photo) ? "profile" : "none");
  const [customPhoto, setCustomPhoto] = useState<Blob | null>(null);
  const [photoSource, setPhotoSource] = useState<string | undefined>(() => localPhotoSource(record.pet.photo));
  const [photoLoading, setPhotoLoading] = useState(false);
  const [photoError, setPhotoError] = useState("");
  const [error, setError] = useState(""); const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [generated, setGenerated] = useState<{ blob: Blob; url: string; signature: string; photoSource?: string; imageChoice: string } | null>(null);
  const [canShare, setCanShare] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null); const generatedUrl = useRef<string | null>(null);
  const alive = useRef(true); const generation = useRef(0); const ownerId = useRef(record.pet.id); ownerId.current = record.pet.id;
  const model = useMemo(() => buildShareCardModel(record, selectedIds), [record, selectedIds]);
  const signature = JSON.stringify(model);
  const readyFile = generated?.signature === signature && generated.photoSource === photoSource && generated.imageChoice === imageChoice ? generated : null;
  const title = `Karta ${record.pet.name}`;

  useEffect(() => {
    alive.current = true;
    return () => { alive.current = false; generation.current += 1; if (generatedUrl.current) URL.revokeObjectURL(generatedUrl.current); };
  }, []);

  useEffect(() => {
    setSelectedIds([]); setImageChoice(localPhotoSource(record.pet.photo) ? "profile" : "none"); setCustomPhoto(null); setError(""); setNotice(""); setGenerated(null); setCanShare(false);
    if (generatedUrl.current) URL.revokeObjectURL(generatedUrl.current); generatedUrl.current = null;
    // A different pet starts a new explicit selection; answer edits preserve the selection.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [record.pet.id]);

  useEffect(() => {
    let active = true; let objectUrl: string | undefined;
    setPhotoSource(undefined); setPhotoError("");
    if (imageChoice === "none") { setPhotoLoading(false); return; }
    if (imageChoice === "profile") { setPhotoSource(localPhotoSource(record.pet.photo)); setPhotoLoading(false); return; }
    setPhotoLoading(true);
    const photoId = (record.moments ?? []).find((moment) => moment.id === imageChoice)?.photoId;
    void (imageChoice === "custom" ? Promise.resolve(customPhoto) : photoId ? loadPhotoBlob(photoId) : Promise.resolve(undefined)).then((blob) => {
      if (!active) return;
      if (!blob) { setPhotoError("Tego zdjęcia nie ma na tym urządzeniu. Import JSON zachowuje odnośnik, bez pliku zdjęcia. Wybierz inne zdjęcie albo kartę bez zdjęcia."); return; }
      objectUrl = URL.createObjectURL(blob); setPhotoSource(objectUrl);
    }).catch(() => { if (active) setPhotoError("Nie udało się odczytać lokalnego zdjęcia. Możesz wybrać inne lub przygotować kartę bez zdjęcia."); }).finally(() => { if (active) setPhotoLoading(false); });
    return () => { active = false; if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [imageChoice, customPhoto, record.pet.photo, record.moments]);

  function toggleFact(id: string) {
    setSelectedIds((previous) => {
      const current = previous.filter((item) => facts.some((fact) => fact.id === item));
      return current.includes(id) ? current.filter((item) => item !== id) : current.length < MAX_CARD_FACTS ? [...current, id] : current;
    });
    setNotice(""); setError("");
  }
  async function choosePhoto(file?: File) {
    if (!file) return;
    const chosenOwner = record.pet.id; const chosenGeneration = ++generation.current;
    setPhotoLoading(true); setPhotoError(""); setError("");
    try {
      const blob = await prepareAlbumPhoto(file);
      if (!alive.current || chosenOwner !== ownerId.current || chosenGeneration !== generation.current) return;
      setCustomPhoto(blob); setImageChoice("custom"); setNotice("Zdjęcie przygotowano lokalnie do tej karty. Nie dodano go do albumu ani nie wysłano do chmury.");
    } catch (problem) { if (alive.current && chosenOwner === ownerId.current && chosenGeneration === generation.current) setPhotoError(problem instanceof Error ? problem.message : "Wybierz inne zdjęcie."); }
    finally { if (alive.current && chosenOwner === ownerId.current && chosenGeneration === generation.current) setPhotoLoading(false); }
  }
  async function generateCard() {
    if (busy || photoLoading || photoError) return;
    const chosenOwner = record.pet.id; const chosenGeneration = ++generation.current;
    setBusy(true); setError(""); setNotice("");
    try {
      const blob = await renderShareCard(model, photoSource);
      if (!alive.current || chosenOwner !== ownerId.current || chosenGeneration !== generation.current) return;
      if (generatedUrl.current) URL.revokeObjectURL(generatedUrl.current);
      generatedUrl.current = URL.createObjectURL(blob);
      setGenerated({ blob, url: generatedUrl.current, signature, photoSource, imageChoice });
      const file = new File([blob], shareCardFileName(record.pet.name), { type: "image/png" });
      let supported = false;
      try { supported = !!navigator.share && !!navigator.canShare?.({ files: [file] }); } catch { /* Download is always offered. */ }
      setCanShare(supported); setNotice("Karta PNG jest gotowa. Sprawdź finalny obraz poniżej; pobranie lub udostępnienie wymaga osobnego przycisku.");
    } catch (problem) { if (alive.current && chosenOwner === ownerId.current) setError(problem instanceof Error ? problem.message : "Nie udało się utworzyć karty."); }
    finally { if (alive.current) setBusy(false); }
  }
  function downloadCard() {
    if (!readyFile) return;
    downloadBlob(readyFile.blob, shareCardFileName(record.pet.name));
    setNotice("Pobrano kartę PNG. To osobny plik, który możesz zachować lub samodzielnie udostępnić.");
  }
  async function shareCard() {
    if (!readyFile || !canShare || busy) return;
    setError(""); setBusy(true);
    try {
      const file = new File([readyFile.blob], shareCardFileName(record.pet.name), { type: "image/png" });
      await navigator.share({ files: [file], title, text: record.isDemo ? "Demonstracja COPOWIESZ · dane syntetyczne" : `Karta ${record.pet.name} z informacjami wybranymi przez opiekuna.` });
      if (alive.current) setNotice("Zamknięto okno udostępniania urządzenia. Odbiorców i aplikację wybierasz samodzielnie.");
    } catch (problem) { if (alive.current && !(problem instanceof DOMException && problem.name === "AbortError")) setError("Urządzenie nie udostępniło pliku. Pobierz PNG i wybierz odbiorcę w swojej aplikacji."); }
    finally { if (alive.current) setBusy(false); }
  }

  const content = <div className={styles.root}>
    <p className={styles.intro}>Mała karta o {record.pet.name}, przygotowana z tego, co wybierzesz. Pomijamy rozmowy, opisy modeli i zapisy oznaczone jako zdrowotne. Przed udostępnieniem sprawdź wybraną treść; nie wybieraj informacji o zdrowiu ani prywatnych danych.</p>
    <p className={styles.privacy}><LockKeyhole size={16} aria-hidden />Podgląd i generowanie działają na tym urządzeniu. Niczego nie publikujemy automatycznie.</p>
    {record.isDemo && <p className="notice">To profil demonstracyjny. Na karcie pozostaje widoczne oznaczenie „dane syntetyczne”; przykładowe wspomnienia nie stają się faktami.</p>}
    <div className={styles.layout}>
      <div className={styles.options}>
        <label htmlFor="share-card-image">Zdjęcie na karcie<select id="share-card-image" value={imageChoice} disabled={busy || photoLoading} onChange={(event) => { setImageChoice(event.target.value); setNotice(""); }}><option value="none">Bez zdjęcia · znak COPOWIESZ</option>{localPhotoSource(record.pet.photo) && <option value="profile">Moje zdjęcie profilu</option>}{photos.map((moment) => <option key={moment.id} value={moment.id}>Z albumu: {moment.title}</option>)}{customPhoto && <option value="custom">Zdjęcie wybrane do tej karty</option>}</select></label>
        <input ref={fileInput} type="file" accept="image/jpeg,image/png,image/webp" className="hidden-input" aria-label="Wybierz lokalne zdjęcie do karty" onChange={(event) => { void choosePhoto(event.target.files?.[0]); event.target.value = ""; }} />
        <button type="button" className="text-button" disabled={busy || photoLoading} onClick={() => fileInput.current?.click()}><ImagePlus size={16} aria-hidden />Wybierz inne zdjęcie</button><p className={styles.hint}>JPEG, PNG lub WebP do 5 MiB. Karta nie kopiuje oryginalnych metadanych zdjęcia. Sprawdź, czy w kadrze nie ma innych osób i prywatnych informacji.</p>
        {photoLoading && <p className={styles.loading} role="status"><LoaderCircle className="spin" size={16} aria-hidden />Wczytuję wybrane zdjęcie…</p>}{photoError && <p className="error" role="alert">{photoError}</p>}
        <fieldset className={styles.facts} disabled={busy}><legend>Wybierz informacje <span>{model.facts.length}/{MAX_CARD_FACTS}</span></legend><p>Relacje opiekuna o preferencjach i zwyczajach. Domyślnie żadnej nie zaznaczamy.</p>{facts.length ? facts.map((fact) => <label key={fact.id} className={styles.fact}><input type="checkbox" checked={selectedIds.includes(fact.id)} disabled={!selectedIds.includes(fact.id) && model.facts.length >= MAX_CARD_FACTS} onChange={() => toggleFact(fact.id)} /><span><strong>{fact.title}</strong><small>{fact.excerpt}</small></span></label>) : <div className={styles.noFacts}>Brak odpowiednich zapisów do karty. Możesz przygotować ją z samym imieniem i zdjęciem, a preferencje lub codzienne zwyczaje uzupełnić w Waszej historii.</div>}</fieldset>
      </div>
      <div className={styles.previewArea}><span className="eyebrow">Podgląd wybranej treści</span><article className={styles.cardPreview} aria-label={`Podgląd karty ${record.pet.name}`}>
        <header><span><img src="/brand/logo.png" alt="" />copowiesz</span><small>{record.isDemo ? "Demonstracja" : "Nasza mała historia"}</small></header>
        <div className={styles.previewPhoto}>{photoSource ? <img src={photoSource} alt={`Wybrane zdjęcie ${record.pet.name}`} /> : <img src="/brand/logo.png" alt="Znak COPOWIESZ zamiast zdjęcia" className={styles.placeholderLogo} />}</div>
        <div className={styles.cardContent}><small className={styles.species}>{record.isDemo ? "Przykładowy profil · dane syntetyczne" : `${record.pet.species === "dog" ? "Pies" : "Kot"} · zapisane przez opiekuna`}</small><h3>{model.name}</h3><p>Każdy ma swoje małe zwyczaje.</p>{model.facts.length ? <ol>{model.facts.map((fact) => <li key={fact.id}><strong>{fact.title}</strong><span>{fact.text}</span></li>)}</ol> : <div className={styles.cardTagline}>Poznajemy się. Po polsku.</div>}<footer><span>{model.attribution}</span><span>copowiesz.pl</span></footer></div>
      </article><p className={styles.hint}>Dłuższe zapisy skracamy. Dokładny obraz PNG pojawi się po utworzeniu karty — sprawdź go przed pobraniem.</p></div>
    </div>
    <div className={styles.actions}><button type="button" className="button primary" disabled={busy || photoLoading || !!photoError} onClick={() => void generateCard()}>{busy ? <LoaderCircle className="spin" size={18} aria-hidden /> : <Check size={18} aria-hidden />}{busy ? "Tworzymy kartę lokalnie…" : readyFile ? "Utwórz ponownie" : "Utwórz kartę PNG"}</button>{readyFile && <button type="button" className="button secondary" disabled={busy} onClick={downloadCard}><Download size={18} aria-hidden />Pobierz PNG</button>}{readyFile && canShare && <button type="button" className="button secondary" disabled={busy} onClick={() => void shareCard()}><Share2 size={18} aria-hidden />Udostępnij plik…</button>}</div>
    {notice && <p className="info-box" role="status">{notice}</p>}{error && <p className="error" role="alert">{error}</p>}
    {readyFile && <figure className={styles.finalImage}><img src={readyFile.url} alt={`Gotowa karta PNG ${record.pet.name}. ${model.attribution}. Wybrane informacje: ${model.facts.map((fact) => fact.text).join("; ") || "Bez informacji z historii"}.`} /><figcaption>Gotowy obraz do pobrania · 1080 × 1350 px. To wybrany opis opiekuna, nie naukowy wynik osobowości.</figcaption></figure>}
  </div>;

  return onClose ? <Modal title={title} onClose={onClose}>{content}</Modal> : <section aria-label={title}><h2>{title}</h2>{content}</section>;
}
