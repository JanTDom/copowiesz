"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, Download, ImagePlus, LoaderCircle, LockKeyhole, MessageCircle, Pencil, Play, Plus, Trash2, Video, X } from "lucide-react";
import { deletePhotoBlob, downloadBlob, loadClipBlob, loadPhotoBlob, savePhotoBlob } from "@/lib/local-store";
import { prepareAlbumPhoto, validatePhotoFile } from "@/lib/share-card";
import type { Clip, Moment, PetRecord } from "@/lib/types";
import { Modal } from "./ui";
import styles from "./moments-album.module.css";

export interface MomentsAlbumProps {
  record: PetRecord;
  onUpdate: (record: PetRecord) => void;
  onDiscuss: (moment: Moment) => void;
  onCapture: () => void;
}

function dateInput(value = new Date().toISOString()): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
function displayDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Data nieznana" : date.toLocaleDateString("pl-PL", { day: "numeric", month: "long", year: "numeric" });
}
function mediaName(title: string, extension: string): string {
  const clean = title.replace(/[^\p{L}\p{N}_-]/gu, "-").replace(/-+/g, "-").slice(0, 70);
  return `copowiesz-${clean || "chwila"}.${extension}`;
}
function usableAlbumClip(clip: Clip, petId: string): boolean {
  return clip.petId === petId && clip.durationSec > 0 && clip.width > 0 && clip.height > 0 && ["technical_only", "ai_reviewed"].includes(clip.status);
}

function MomentCard({ moment, clip, onEdit, onDelete, onDiscuss }: { moment: Moment; clip?: Clip; onEdit: () => void; onDelete: () => void; onDiscuss: () => void }) {
  const [photo, setPhoto] = useState<{ url: string; blob: Blob } | null>(null);
  const [photoStatus, setPhotoStatus] = useState<"loading" | "ready" | "missing" | "error">("loading");
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const active = useRef(true);
  const videoRef = useRef<string | null>(null);
  const clipRef = useRef(moment.clipId); clipRef.current = moment.clipId;

  useEffect(() => {
    let alive = true; let url: string | undefined;
    setPhoto(null); setPhotoStatus("loading");
    if (moment.photoId) void loadPhotoBlob(moment.photoId).then((blob) => {
      if (!alive) return;
      if (!blob) { setPhotoStatus("missing"); return; }
      url = URL.createObjectURL(blob); setPhoto({ url, blob }); setPhotoStatus("ready");
    }).catch(() => { if (alive) setPhotoStatus("error"); });
    return () => { alive = false; if (url) URL.revokeObjectURL(url); };
  }, [moment.photoId]);

  useEffect(() => {
    active.current = true;
    return () => { active.current = false; if (videoRef.current) URL.revokeObjectURL(videoRef.current); };
  }, []);
  useEffect(() => {
    if (videoRef.current) URL.revokeObjectURL(videoRef.current);
    videoRef.current = null; setVideoUrl(null); setError("");
  }, [moment.clipId]);

  async function openVideo() {
    if (!moment.clipId || busy) return;
    const chosenClipId = moment.clipId;
    setBusy(true); setError("");
    try {
      const blob = await loadClipBlob(moment.clipId);
      if (!blob) throw new Error("Pliku tego filmu nie ma na tym urządzeniu. Import JSON zachowuje odnośnik, ale nie przywraca plików.");
      if (!active.current || clipRef.current !== chosenClipId) return;
      if (videoRef.current) URL.revokeObjectURL(videoRef.current);
      videoRef.current = URL.createObjectURL(blob); setVideoUrl(videoRef.current);
    } catch (problem) { if (active.current) setError(problem instanceof Error ? problem.message : "Nie udało się otworzyć filmu."); }
    finally { if (active.current) setBusy(false); }
  }
  async function downloadVideo() {
    if (!moment.clipId || busy) return;
    const chosenClipId = moment.clipId;
    setBusy(true); setError("");
    try {
      const blob = await loadClipBlob(moment.clipId);
      if (!blob) throw new Error("Pliku filmu nie ma na tym urządzeniu. Poszukaj osobnej kopii w swoich plikach.");
      if (active.current && clipRef.current === chosenClipId) downloadBlob(blob, mediaName(moment.title, blob.type.includes("mp4") ? "mp4" : blob.type.includes("quicktime") ? "mov" : blob.type.includes("ogg") ? "ogg" : "webm"));
    } catch (problem) { if (active.current) setError(problem instanceof Error ? problem.message : "Nie udało się pobrać filmu."); }
    finally { if (active.current) setBusy(false); }
  }
  function closeVideo() { if (videoRef.current) URL.revokeObjectURL(videoRef.current); videoRef.current = null; setVideoUrl(null); }

  return <article className={styles.moment}>
    {moment.photoId ? <div className={styles.photo}>
      {photo ? <img src={photo.url} alt={`Zdjęcie chwili: ${moment.title}`} loading="lazy" /> : <div className={styles.missingPhoto}><ImagePlus size={30} aria-hidden /><span>{photoStatus === "loading" ? "Wczytuję lokalne zdjęcie…" : photoStatus === "missing" ? "Zdjęcia nie ma na tym urządzeniu" : "Nie udało się odczytać zdjęcia"}</span>{photoStatus === "missing" && <small>Import profilu zawiera opis i odnośnik. Zdjęcia trzeba zachować osobno.</small>}</div>}
    </div> : <div className={styles.textMoment}><span><MessageCircle size={24} aria-hidden />Z Waszej historii</span></div>}
    <div className={styles.momentBody}>
      <div className={styles.meta}><time dateTime={moment.occurredAt}>{displayDate(moment.occurredAt)}</time><span><LockKeyhole size={12} aria-hidden />Prywatne</span></div>
      <h3>{moment.title}</h3>{moment.caption && <p className={styles.caption}>{moment.caption}</p>}
      {moment.clipId && <div className={styles.videoBlock}>
        {clip ? <span className={styles.clipLabel}><Video size={15} aria-hidden />Film z Twoich nagrań · {Math.round(clip.durationSec)} s</span> : <p className={styles.missingClip}>Odnośnik do filmu pozostał w opisie, ale nie ma go w tym profilu.</p>}
        <div className={styles.mediaActions}><button type="button" className="text-button" disabled={busy} onClick={() => void openVideo()}><Play size={15} aria-hidden />Obejrzyj film</button><button type="button" className="text-button" disabled={busy} onClick={() => void downloadVideo()}><Download size={15} aria-hidden />Pobierz film</button></div>
      </div>}
      {videoUrl && <div className={styles.videoPreview}><video controls playsInline src={videoUrl} aria-label={`Film chwili: ${moment.title}`} /><button type="button" className="text-button" onClick={closeVideo}><X size={14} aria-hidden />Zamknij film</button></div>}
      {photo && <button type="button" className="text-button" onClick={() => downloadBlob(photo.blob, mediaName(moment.title, photo.blob.type.includes("png") ? "png" : photo.blob.type.includes("webp") ? "webp" : "jpg"))}><Download size={15} aria-hidden />Pobierz zdjęcie</button>}
      {error && <p className="error" role="alert">{error}</p>}
      <div className={styles.momentActions}><button type="button" className="button secondary compact" onClick={onDiscuss}><MessageCircle size={16} aria-hidden />Porozmawiaj o tej chwili</button><div><button type="button" className="icon-button" aria-label={`Zmień opis chwili: ${moment.title}`} onClick={onEdit}><Pencil size={16} /></button><button type="button" className="icon-button" aria-label={`Usuń chwilę: ${moment.title}`} onClick={onDelete}><Trash2 size={16} /></button></div></div>
    </div>
  </article>;
}

export function MomentsAlbum({ record, onUpdate, onDiscuss, onCapture }: MomentsAlbumProps) {
  const [editor, setEditor] = useState(false);
  const [editing, setEditing] = useState<Moment | null>(null);
  const [title, setTitle] = useState(""); const [caption, setCaption] = useState("");
  const [date, setDate] = useState(() => dateInput()); const [clipId, setClipId] = useState("");
  const [file, setFile] = useState<File | null>(null); const [filePreview, setFilePreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false); const [error, setError] = useState(""); const [notice, setNotice] = useState("");
  const [deleting, setDeleting] = useState<Moment | null>(null);
  const input = useRef<HTMLInputElement>(null); const current = useRef(record); current.current = record;
  const active = useRef(true); const saving = useRef(false);
  const moments = [...(record.moments ?? [])].sort((a, b) => b.occurredAt.localeCompare(a.occurredAt));
  const clips = record.clips.filter((clip) => usableAlbumClip(clip, record.pet.id));

  useEffect(() => { active.current = true; return () => { active.current = false; }; }, []);
  useEffect(() => { setEditor(false); setDeleting(null); setError(""); setNotice(""); setFile(null); }, [record.pet.id]);
  useEffect(() => {
    if (!file) { setFilePreview(null); return; }
    const url = URL.createObjectURL(file); setFilePreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  function openEditor(moment?: Moment) {
    setEditing(moment ?? null); setTitle(moment?.title ?? ""); setCaption(moment?.caption ?? ""); setDate(dateInput(moment?.occurredAt)); setClipId(moment?.clipId ?? ""); setFile(null); setError(""); setEditor(true);
  }
  function choosePhoto(chosen?: File) {
    if (!chosen) return;
    try { validatePhotoFile(chosen); setFile(chosen); setError(""); }
    catch (problem) { setError(problem instanceof Error ? problem.message : "Wybierz inne zdjęcie."); }
  }
  async function saveMoment(event: React.FormEvent) {
    event.preventDefault();
    if (saving.current) return;
    const occurredAt = new Date(`${date}T12:00:00`);
    if (!title.trim() || title.trim().length > 120 || caption.length > 2000 || Number.isNaN(occurredAt.getTime())) { setError("Dodaj tytuł do 120 znaków i prawidłową datę. Podpis może mieć do 2000 znaków."); return; }
    if (!editing && (current.current.moments ?? []).length >= 1000) { setError("Album zawiera już 1000 chwil. Pobierz potrzebne zdjęcia i usuń niepotrzebny zapis przed dodaniem kolejnego."); return; }
    if (clipId && !current.current.clips.some((clip) => clip.id === clipId && usableAlbumClip(clip, current.current.pet.id))) { setError("Wybrany film nie jest gotowym nagraniem tego zwierzaka. Wybierz inny film lub opcję „Bez filmu”."); return; }
    const ownerId = current.current.pet.id;
    saving.current = true; setBusy(true); setError("");
    let newPhotoId: string | undefined;
    try {
      if (file && !editing) { const blob = await prepareAlbumPhoto(file); newPhotoId = crypto.randomUUID(); await savePhotoBlob(newPhotoId, blob); }
      if (!active.current || current.current.pet.id !== ownerId) { if (newPhotoId) await deletePhotoBlob(newPhotoId); return; }
      if (clipId && !current.current.clips.some((clip) => clip.id === clipId && usableAlbumClip(clip, ownerId))) throw new Error("Wybrany film zmienił się podczas zapisu. Wybierz gotowe nagranie lub opcję „Bez filmu”.");
      const previous = editing && (current.current.moments ?? []).find((moment) => moment.id === editing.id);
      if (editing && !previous) throw new Error("Ta chwila została już usunięta. Zamknij formularz i sprawdź album.");
      const moment: Moment = { id: previous?.id ?? crypto.randomUUID(), title: title.trim(), caption: caption.trim(), occurredAt: occurredAt.toISOString(), createdAt: previous?.createdAt ?? new Date().toISOString(), ...(newPhotoId || previous?.photoId ? { photoId: newPhotoId ?? previous?.photoId } : {}), ...(clipId ? { clipId } : {}) };
      onUpdate({ ...current.current, moments: [...(current.current.moments ?? []).filter((item) => item.id !== moment.id), moment] });
      setEditor(false); setFile(null); setNotice(previous ? "Opis i data chwili zostały zapisane na tym urządzeniu." : "Chwila została dodana do prywatnego albumu. Nie wysłano zdjęcia ani filmu do chmury.");
    } catch (problem) {
      if (newPhotoId) await deletePhotoBlob(newPhotoId).catch(() => undefined);
      if (active.current && current.current.pet.id === ownerId) setError(problem instanceof Error ? problem.message : "Nie udało się zapisać chwili. Sprawdź miejsce w przeglądarce.");
    } finally { saving.current = false; if (active.current) setBusy(false); }
  }
  async function deleteMoment() {
    if (!deleting || saving.current) return;
    const ownerId = current.current.pet.id; const chosen = deleting;
    saving.current = true; setBusy(true); setError("");
    try {
      const remaining = (current.current.moments ?? []).filter((item) => item.id !== chosen.id);
      if (chosen.photoId && !remaining.some((item) => item.photoId === chosen.photoId)) await deletePhotoBlob(chosen.photoId);
      if (!active.current || current.current.pet.id !== ownerId) return;
      onUpdate({ ...current.current, moments: (current.current.moments ?? []).filter((item) => item.id !== chosen.id) });
      setDeleting(null); setNotice("Usunięto chwilę i jej lokalne zdjęcie. Powiązany film pozostaje w Nagraniach; pobrane wcześniej kopie usuń osobno.");
    } catch (problem) { if (active.current && current.current.pet.id === ownerId) setError(problem instanceof Error ? problem.message : "Nie udało się usunąć lokalnego zdjęcia. Spróbuj ponownie."); }
    finally { saving.current = false; if (active.current) setBusy(false); }
  }

  return <section className={styles.album} aria-labelledby="moments-album-heading">
    <header className={styles.heading}><div><span className="eyebrow">Wasza wspólna historia</span><h2 id="moments-album-heading">Chwile, do których chce się wracać</h2><p>Zdjęcie, kilka słów, zwykły dzień. Zachowaj to, co chcesz pamiętać o {record.pet.name}.</p></div><button type="button" className="button primary" onClick={() => openEditor()}><Plus size={18} aria-hidden />Dodaj chwilę</button></header>
    <p className={styles.privacy}><LockKeyhole size={16} aria-hidden /><span>Prywatny album na tym urządzeniu. Zdjęcia nie synchronizują się automatycznie i nie trafiają do modelu. Kopia JSON zawiera opisy i odnośniki; zdjęcia i filmy pobierz osobno.</span></p>
    {record.isDemo && <p className="notice">Profil demonstracyjny: przykładowe dane są syntetyczne. Własne chwile dodawaj w profilu swojego zwierzaka.</p>}
    {notice && <p className="success-box" role="status">{notice}</p>}
    {error && !editor && !deleting && <p className="error" role="alert">{error}</p>}
    {!moments.length ? <div className={styles.empty}><ImagePlus size={38} aria-hidden /><h3>Pierwsza chwila nie musi być wyjątkowa</h3><p>Ulubione miejsce, wspólny spacer albo odpoczynek obok Ciebie. Twój opis zachowuje tę sytuację bez dopisywania myśli zwierzaka.</p><div><button type="button" className="button secondary" onClick={() => openEditor()}><Plus size={17} aria-hidden />Dodaj pierwszą chwilę</button><button type="button" className="text-button" onClick={onCapture}><Camera size={17} aria-hidden />Przejdź do nagrań</button></div></div> : <div className={styles.grid}>{moments.map((moment) => <MomentCard key={moment.id} moment={moment} clip={record.clips.find((clip) => clip.id === moment.clipId)} onEdit={() => openEditor(moment)} onDelete={() => { setError(""); setDeleting(moment); }} onDiscuss={() => onDiscuss(moment)} />)}</div>}
    {editor && <Modal title={editing ? "Zmień opis chwili" : "Dodaj do Waszego albumu"} onClose={() => { if (!busy) { setEditor(false); setFile(null); setError(""); } }}>
      <form className={styles.form} onSubmit={(event) => void saveMoment(event)}>
        <p className={styles.formIntro}>Zapis pozostaje Twoją relacją. Opisz sytuację, którą pamiętasz; nie trzeba nadawać jej cechy osobowości.</p>
        <label htmlFor="moment-title">Tytuł chwili<input id="moment-title" value={title} onChange={(event) => setTitle(event.target.value)} maxLength={120} required placeholder="Np. Popołudnie na naszej kanapie" disabled={busy} /></label>
        <label htmlFor="moment-date">Kiedy to było?<input id="moment-date" type="date" value={date} onChange={(event) => setDate(event.target.value)} required disabled={busy} /></label>
        <label htmlFor="moment-caption">Co chcesz zapamiętać?<textarea id="moment-caption" value={caption} onChange={(event) => setCaption(event.target.value)} rows={4} maxLength={2000} placeholder="Co działo się przed, co zrobił zwierzak i co wydarzyło się później?" disabled={busy} /></label>
        {!editing && <div className={styles.photoPicker}><input ref={input} type="file" accept="image/jpeg,image/png,image/webp" className="hidden-input" aria-label="Wybierz zdjęcie do prywatnego albumu" onChange={(event) => { choosePhoto(event.target.files?.[0]); event.target.value = ""; }} /><button type="button" className="button secondary" disabled={busy} onClick={() => input.current?.click()}><ImagePlus size={18} aria-hidden />{file ? "Wybierz inne zdjęcie" : "Dodaj zdjęcie"}</button><span>Opcjonalnie · JPEG, PNG lub WebP do 5 MiB</span>{filePreview && <div className={styles.selectedPhoto}><img src={filePreview} alt="Wybrane zdjęcie do albumu" /><button type="button" className="text-button" disabled={busy} onClick={() => setFile(null)}><X size={14} aria-hidden />Usuń wybrane zdjęcie</button></div>}<small>Przy zapisie przygotowujemy lokalną kopię zdjęcia do 2400 px, bez oryginalnych metadanych. Oryginał na Twoim urządzeniu pozostaje osobno.</small></div>}
        {editing?.photoId && <p className={styles.formIntro}>Zdjęcie przypisane do tej chwili pozostanie bez zmian.</p>}
        <label htmlFor="moment-clip">Powiąż z istniejącym filmem<select id="moment-clip" value={clipId} onChange={(event) => setClipId(event.target.value)} disabled={busy}><option value="">Bez filmu</option>{editing?.clipId && !clips.some((clip) => clip.id === editing.clipId) && <option value={editing.clipId}>Dotychczasowy film · brak w tym profilu</option>}{clips.map((clip) => <option value={clip.id} key={clip.id}>{displayDate(clip.createdAt)} · {clip.fileName || "Nagranie"} · {Math.round(clip.durationSec)} s</option>)}</select></label>
        <p className={styles.formIntro}>Powiązanie nie kopiuje ani nie wysyła filmu. Możesz go obejrzeć z albumu, jeśli jest zapisany na tym urządzeniu.</p>
        {error && <p className="error" role="alert">{error}</p>}
        <div className={styles.formActions}><button type="submit" className="button primary" disabled={busy || !title.trim() || !date}>{busy ? <LoaderCircle className="spin" size={18} aria-hidden /> : <Plus size={18} aria-hidden />}{busy ? "Zapisujemy lokalnie…" : editing ? "Zapisz zmiany" : "Zapisz chwilę"}</button><button type="button" className="text-button" disabled={busy} onClick={() => { setEditor(false); setFile(null); setError(""); }}>Anuluj</button></div>
      </form>
    </Modal>}
    {deleting && <Modal title="Usunąć tę chwilę?" onClose={() => { if (!busy) { setDeleting(null); setError(""); } }}><p>Usuniesz „{deleting.title}” oraz przypisane lokalne zdjęcie. Powiązany film pozostanie w Nagraniach. Pobrane kopie są osobnymi plikami.</p>{error && <p className="error" role="alert">{error}</p>}<div className={styles.formActions}><button type="button" className="button danger-button" disabled={busy} onClick={() => void deleteMoment()}><Trash2 size={17} aria-hidden />{busy ? "Usuwamy…" : "Usuń chwilę"}</button><button type="button" className="button secondary" disabled={busy} onClick={() => setDeleting(null)}>Zachowaj</button></div></Modal>}
  </section>;
}
