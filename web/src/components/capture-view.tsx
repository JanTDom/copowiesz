"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { ArrowRight, Camera, Check, ChevronRight, Download, LoaderCircle, Play, RefreshCw, Square, Upload, Video, X } from "lucide-react";
import { getNextTask, getReadiness, getTasks } from "@/lib/domain";
import { apiFetch, apiRecord } from "@/lib/client-api";
import { blobDataUrl, extractVideoFrames, readVideoMetadata, recorderMimeType } from "@/lib/capture";
import { downloadBlob, loadClipBlob, saveClipBlob } from "@/lib/local-store";
import type { Clip, ClipAnalysis, GuidedTask, PetRecord } from "@/lib/types";
import { ViewHeading } from "./ui";

type CaptureState = "idle" | "recording" | "saving" | "analyzing";
type AnalysisResult = { analysis: ClipAnalysis; nextTaskId?: string | null; nextTaskReason?: string };
type AnalysisProviderStatus = { configured: boolean; available: boolean | null; publicAccessAllowed?: boolean; policyNotice?: string | null };

function safeFileName(clip: Clip): string {
  return (clip.fileName || `copowiesz-${clip.id}.${clip.mimeType.includes("mp4") ? "mp4" : "webm"}`).replace(/[^\p{L}\p{N}_.-]/gu, "_").slice(0, 180);
}
function statusLabel(clip: Clip) {
  return clip.status === "stopped" ? "Przerwane dla komfortu" : clip.status === "skipped" ? "Pominięte · brak danych" : clip.status === "pending" ? "Zapisane · oczekuje na analizę" : clip.analysis?.source === "technical" ? "Parametry techniczne" : "Opis modelu · do sprawdzenia";
}

export function CaptureView({ record, onUpdate, onSettings, onChat }: { record: PetRecord; onUpdate: (record: PetRecord) => void; onSettings: () => void; onChat: () => void }) {
  const tasks = getTasks(record.pet.species);
  const [taskId, setTaskId] = useState(() => getNextTask(record)?.id ?? tasks[0].id);
  const task = tasks.find((item) => item.id === taskId) ?? tasks[0];
  const [state, setState] = useState<CaptureState>("idle");
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraOpening, setCameraOpening] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [audio, setAudio] = useState(true);
  const [geminiConsent, setGeminiConsent] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [suggestion, setSuggestion] = useState<{ id: string; reason?: string } | null>(null);
  const [lastClipId, setLastClipId] = useState<string | null>(null);
  const [preview, setPreview] = useState<{ id: string; url: string } | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [confirmed, setConfirmed] = useState<Record<string, boolean>>({});
  const [provider, setProvider] = useState<AnalysisProviderStatus | null>(null);
  const providerRef = useRef<AnalysisProviderStatus | null>(null);
  const [recovery, setRecovery] = useState<{ blob: Blob; name: string } | null>(null);
  const mounted = useRef(true);
  const recordRef = useRef(record); const updateRef = useRef(onUpdate);
  const stream = useRef<MediaStream | null>(null); const recorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]); const recordingStart = useRef(0); const stopped = useRef(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null); const deadline = useRef<ReturnType<typeof setTimeout> | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null); const importRef = useRef<HTMLInputElement>(null);
  const previewUrl = useRef<string | null>(null);
  const cameraGeneration = useRef(0);
  const busy = state !== "idle" || cameraOpening;
  const publicGeminiBlocked = provider?.publicAccessAllowed === false;
  const progress = getReadiness(record);

  recordRef.current = record; updateRef.current = onUpdate;

  function clearTimers() {
    if (timer.current) clearInterval(timer.current); if (deadline.current) clearTimeout(deadline.current);
    timer.current = null; deadline.current = null;
  }
  function releaseCamera() {
    cameraGeneration.current += 1;
    stream.current?.getTracks().forEach((track) => track.stop()); stream.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    if (mounted.current) { setCameraReady(false); setCameraOpening(false); }
  }
  function closePreview() {
    if (previewUrl.current) URL.revokeObjectURL(previewUrl.current);
    previewUrl.current = null; setPreview(null);
  }
  function updateClip(owner: PetRecord, next: Clip) {
    const current = recordRef.current.pet.id === owner.pet.id ? recordRef.current : owner;
    const updated = { ...current, clips: [...current.clips.filter((item) => item.id !== next.id), next] };
    if (recordRef.current.pet.id === owner.pet.id) recordRef.current = updated;
    updateRef.current(updated);
    return updated;
  }

  useEffect(() => {
    mounted.current = true;
    void apiFetch("/api/status").then((result) => {
      if (!mounted.current) return;
      providerRef.current = result.chat;
      setProvider(result.chat);
      if (result.chat.publicAccessAllowed === false) setGeminiConsent(false);
    }).catch(() => { /* Recording also works without a connection. */ });
    return () => {
      mounted.current = false; cameraGeneration.current += 1; clearTimers(); stopped.current = true;
      if (recorder.current?.state === "recording") recorder.current.stop();
      stream.current?.getTracks().forEach((track) => track.stop()); stream.current = null;
      if (previewUrl.current) URL.revokeObjectURL(previewUrl.current);
    };
  }, []);

  useEffect(() => {
    if (cameraReady && videoRef.current && stream.current) videoRef.current.srcObject = stream.current;
  }, [cameraReady]);

  useEffect(() => {
    stopped.current = true;
    if (recorder.current?.state === "recording") recorder.current.stop();
    clearTimers(); releaseCamera(); closePreview();
    setTaskId(getNextTask(record)?.id ?? getTasks(record.pet.species)[0].id);
    setSuggestion(null); setLastClipId(null); setNotes({}); setConfirmed({}); setError(""); setNotice(""); setRecovery(null); setState("idle");
    // Reset when the selected pet changes; answer/history updates do not reset a session.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [record.pet.id]);

  async function enableCamera() {
    setError(""); setNotice("");
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setError("Ta przeglądarka nie udostępnia nagrywania. Możesz dodać film z telefonu. Kamera działa przez HTTPS lub na localhost."); return;
    }
    releaseCamera(); const generation = cameraGeneration.current; const petId = recordRef.current.pet.id; setCameraOpening(true);
    try {
      const next = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } }, audio });
      if (!mounted.current || generation !== cameraGeneration.current || recordRef.current.pet.id !== petId) { next.getTracks().forEach((track) => track.stop()); return; }
      stream.current = next; setCameraReady(true);
    } catch (problem) {
      if (mounted.current && generation === cameraGeneration.current) { const name = problem instanceof DOMException ? problem.name : ""; setError(name === "NotAllowedError" ? "Kamera lub mikrofon nie dostały zgody. Sprawdź uprawnienia przeglądarki; możesz wyłączyć dźwięk albo dodać istniejący film." : "Nie udało się uruchomić kamery. Zamknij inne aplikacje korzystające z niej albo dodaj film z telefonu."); }
    } finally { if (mounted.current && generation === cameraGeneration.current) setCameraOpening(false); }
  }

  async function analyzeClip(owner: PetRecord, saved: Clip, blob: Blob, consent: boolean) {
    const active = () => mounted.current && recordRef.current.pet.id === owner.pet.id;
    if (!active()) return;
    setState("analyzing");
    let media: { videoData?: string; frames?: string[]; frameTimes?: number[] } = {};
    let preparationNotice = "";
    if (consent && providerRef.current?.publicAccessAllowed !== false && active()) {
      const mime = saved.mimeType.split(";")[0].trim().toLowerCase();
      try {
        if (["video/webm", "video/mp4"].includes(mime) && blob.size <= 2 * 1024 * 1024) media = { videoData: await blobDataUrl(blob, mime) };
        else { media = await extractVideoFrames(blob, saved.durationSec); preparationNotice = "Do analizy przygotowano do sześciu klatek bez dźwięku. Cały film pozostaje na tym urządzeniu."; }
      } catch {
        preparationNotice = "Nie udało się przygotować obrazu do analizy. Zachowano klip i sprawdzono tylko jego parametry; możesz obejrzeć film i dodać własną obserwację.";
      }
    }
    if (!active()) return;
    if (providerRef.current?.publicAccessAllowed === false) {
      media = {};
      preparationNotice = "Nagranie zapisano lokalnie. Analiza Google jest obecnie niedostępna; film ani klatki nie zostały wysłane do Google. Możesz obejrzeć film i dodać własną obserwację.";
    }
    const current = recordRef.current.pet.id === owner.pet.id ? recordRef.current : owner;
    const result = await apiFetch("/api/analyze", { record: apiRecord(current), clip: saved, ...media, geminiConsent: consent && !!(media.videoData || media.frames?.length) }) as AnalysisResult;
    const inherited = saved.analysis?.limitations.filter((limitation) => limitation.startsWith("Długość oszacowano")) ?? [];
    const analysis = { ...result.analysis, limitations: [...new Set([...inherited, ...result.analysis.limitations])].slice(0, 12) };
    const updatedClip: Clip = { ...saved, analysis, status: result.analysis.source === "technical" ? "technical_only" : "ai_reviewed" };
    updateClip(owner, updatedClip);
    if (mounted.current && recordRef.current.pet.id === owner.pet.id) {
      setSuggestion(result.nextTaskId ? { id: result.nextTaskId, reason: result.nextTaskReason } : null);
      setNotice(preparationNotice || (result.analysis.source === "technical" ? "Klip zapisany. Zachowanie nie zostało rozpoznane automatycznie; możesz dodać własną obserwację." : "Klip zapisany i opisany przez model. Obejrzyj film i sprawdź opis, zanim zapiszesz własną obserwację."));
    }
  }

  async function saveRecording(blob: Blob, owner: PetRecord, chosen: GuidedTask, isStopped: boolean, durationHint?: number) {
    const active = () => mounted.current && recordRef.current.pet.id === owner.pet.id;
    if (active()) { setState("saving"); setError(""); setNotice(""); setRecovery(null); }
    try {
      if (!blob.size && !isStopped) throw new Error("Nagranie jest puste. Nie zapisaliśmy go jako wykonanej próby. Możesz pominąć zadanie bez wymuszania reakcji.");
      if (blob.size > 50 * 1024 * 1024) throw new Error("Wybierz klip do 50 MB. Krótki fragment zwykłej sytuacji wystarczy.");
      const metadata = isStopped
        ? blob.size ? await readVideoMetadata(blob, durationHint).catch(() => ({ durationSec: durationHint ?? 0, width: 0, height: 0, durationEstimated: true })) : { durationSec: 0, width: 0, height: 0, durationEstimated: false }
        : await readVideoMetadata(blob, durationHint);
      if (metadata.durationSec > 60) throw new Error("Wybierz klip do jednej minuty. Nagrywanie w aplikacji trwa maksymalnie 30 sekund.");
      const mime = blob.type || (blob instanceof File && /\.(mp4|m4v)$/i.test(blob.name) ? "video/mp4" : "video/webm");
      if (!/^video\/(webm|mp4|quicktime|ogg)(;|$)/i.test(mime)) throw new Error("Wybierz film MP4, WebM lub MOV, który możesz odtworzyć w tej przeglądarce.");
      const saved: Clip = {
        id: crypto.randomUUID(), petId: owner.pet.id, taskId: chosen.id, createdAt: new Date().toISOString(),
        durationSec: metadata.durationSec, width: metadata.width, height: metadata.height, mimeType: mime,
        fileName: blob instanceof File ? blob.name : `${chosen.id}-${new Date().toISOString().replaceAll(":", "-")}.${mime.includes("mp4") ? "mp4" : "webm"}`,
        status: isStopped ? "stopped" : "pending",
      };
      if (isStopped) saved.analysis = { source: "technical", summary: blob.size ? "Zadanie przerwano dla komfortu. Nagranie nie liczy się jako ukończony kontekst." : "Zadanie przerwano przed zapisaniem filmu. Zachowano informację o przerwaniu, bez materiału wideo.", observations: [], limitations: ["Nie oceniano zachowania. Nie powtarzaj bodźca do skutku."], needsReview: true };
      if (metadata.durationEstimated) saved.analysis = { ...(saved.analysis ?? { source: "technical", summary: "Klip zapisany. Metadane wymagają sprawdzenia.", observations: [], needsReview: true }), limitations: [...(saved.analysis?.limitations ?? []), "Długość oszacowano na podstawie czasu nagrywania. Plik nie udostępnił pełnych metadanych; brakujących wymiarów nie uzupełniono domysłem."] };
      if (blob.size) await saveClipBlob(saved.id, blob);
      const updated = updateClip(owner, saved);
      if (active()) setLastClipId(saved.id);
      if (isStopped || !active()) {
        if (active()) { setNotice(blob.size ? "Przerwano i zachowano klip lokalnie. Nie wysłano go do modelu. Możemy przejść do innego spokojnego kontekstu." : "Zapisano przerwanie, bez filmu i bez wysyłania do modelu. Możemy przejść do innego spokojnego kontekstu."); setSuggestion(getNextTask(updated) ? { id: getNextTask(updated)!.id } : null); }
      } else {
        if (metadata.durationEstimated) setNotice("Długość oszacowano na podstawie rzeczywistego czasu nagrywania; plik nie udostępnił jej w metadanych.");
        await analyzeClip(updated, saved, blob, geminiConsent);
      }
    } catch (problem) {
      if (active()) { setError(problem instanceof Error ? problem.message : "Nie udało się zapisać filmu. Spróbuj ponownie."); if (blob.size) setRecovery({ blob, name: `copowiesz-${chosen.id}.${blob.type.includes("mp4") ? "mp4" : "webm"}` }); }
    } finally { if (active()) setState("idle"); }
  }

  function startRecording() {
    if (!stream.current || recorder.current?.state === "recording") return;
    setError(""); setNotice(""); setSuggestion(null); closePreview();
    const owner = recordRef.current; const chosen = task; const mimeType = recorderMimeType();
    try {
      const next = new MediaRecorder(stream.current, { ...(mimeType ? { mimeType } : {}), videoBitsPerSecond: 450000, audioBitsPerSecond: 32000 });
      recorder.current = next; chunks.current = []; stopped.current = false; recordingStart.current = performance.now();
      next.ondataavailable = (event) => { if (event.data.size) chunks.current.push(event.data); };
      next.onstop = () => {
        clearTimers(); const duration = Math.min(60, Math.max(0.1, (performance.now() - recordingStart.current) / 1000));
        const blob = new Blob(chunks.current, { type: next.mimeType || mimeType || "video/webm" });
        const interrupted = stopped.current; recorder.current = null; releaseCamera();
        void saveRecording(blob, owner, chosen, interrupted, duration);
      };
      next.onerror = () => { stopped.current = true; if (mounted.current) setError("Nagrywanie zostało przerwane przez przeglądarkę. Zachowamy dostępny fragment bez zaliczania zadania."); if (next.state === "recording") next.stop(); };
      next.start(1000); setState("recording"); setElapsed(0);
      timer.current = setInterval(() => { if (mounted.current) setElapsed(Math.min(30, Math.floor((performance.now() - recordingStart.current) / 1000))); }, 250);
      deadline.current = setTimeout(() => { if (next.state === "recording") next.stop(); }, 30000);
    } catch { releaseCamera(); setError("Ta przeglądarka nie mogła rozpocząć nagrywania. Dodaj gotowy film MP4 lub WebM."); setState("idle"); }
  }

  function stopRecording(forComfort = false) { if (recorder.current?.state === "recording") { stopped.current = forComfort; recorder.current.stop(); } }

  function skipTask() {
    releaseCamera();
    const saved: Clip = { id: crypto.randomUUID(), petId: record.pet.id, taskId: task.id, createdAt: new Date().toISOString(), durationSec: 0, width: 0, height: 0, mimeType: "video/webm", fileName: "", status: "skipped" };
    const updated = updateClip(record, saved); const next = getNextTask(updated);
    setSuggestion(next ? { id: next.id } : null); setLastClipId(saved.id); setNotice("Zadanie pominięte. Brak danych pozostaje widoczny i nie zalicza się do wykonanych nagrań."); setError("");
  }

  async function showClip(saved: Clip) {
    setError("");
    try {
      const blob = await loadClipBlob(saved.id);
      if (!blob) throw new Error("Plik filmu nie jest dostępny na tym urządzeniu. Eksport profilu zawiera metadane, a filmy pobiera się osobno.");
      closePreview(); const url = URL.createObjectURL(blob); previewUrl.current = url; setPreview({ id: saved.id, url });
    } catch (problem) { setError(problem instanceof Error ? problem.message : "Nie udało się otworzyć klipu."); }
  }
  async function downloadClip(saved: Clip) {
    try { const blob = await loadClipBlob(saved.id); if (!blob) throw new Error("Nie ma pliku filmu na tym urządzeniu."); downloadBlob(blob, safeFileName(saved)); }
    catch (problem) { setError(problem instanceof Error ? problem.message : "Nie udało się pobrać klipu."); }
  }
  async function retryAnalysis(saved: Clip) {
    setError("");
    try { const blob = await loadClipBlob(saved.id); if (!blob) throw new Error("Plik filmu nie jest dostępny na tym urządzeniu."); await analyzeClip(recordRef.current, saved, blob, geminiConsent); }
    catch (problem) { setError(problem instanceof Error ? problem.message : "Analiza nie powiodła się. Film pozostaje lokalnie."); }
    finally { if (mounted.current) setState("idle"); }
  }
  function saveAnnotation(saved: Clip) {
    const text = notes[saved.id]?.trim();
    if (!text || !confirmed[saved.id]) return;
    const current = recordRef.current;
    const updated = { ...current, memories: [...current.memories, { id: crypto.randomUUID(), text, category: "event" as const, createdAt: new Date().toISOString(), source: "video_annotation" as const, clipId: saved.id }] };
    recordRef.current = updated; onUpdate(updated); setNotes((previous) => ({ ...previous, [saved.id]: "" })); setConfirmed((previous) => ({ ...previous, [saved.id]: false })); setNotice("Zapisano Twoją obserwację z odnośnikiem do filmu. Wynik modelu pozostaje osobnym materiałem do przeglądu.");
  }
  function selectTask(next: string) { releaseCamera(); setTaskId(next); setSuggestion(null); setLastClipId(null); setError(""); setNotice(""); }

  const nextTask = suggestion ? tasks.find((item) => item.id === suggestion.id) : null;
  const clips = [...record.clips].reverse();

  return <div className="capture-view">
    <ViewHeading title={`Poznajmy reakcje ${record.pet.name}`} description="Jedna spokojna sytuacja naraz. Nagrania zapisują się na tym urządzeniu."><button className="button secondary" onClick={onChat} disabled={busy}>Przejdź do rozmowy<ArrowRight size={17} /></button></ViewHeading>
    <div className="progress-line"><span>{progress.clips} z {progress.totalClips} kontekstów nagranych</span><span>Przerwanie i pominięcie pozostają brakami danych</span></div>
    <div className="capture-layout">
      <aside className="capture-tasks" aria-label="Konteksty nagrywania">{tasks.map((item, index) => {
        const attempts = record.clips.filter((saved) => saved.taskId === item.id);
        const done = attempts.some((saved) => ["technical_only", "ai_reviewed"].includes(saved.status) && saved.durationSec > 0);
        return <button key={item.id} className={task.id === item.id ? "active" : ""} disabled={busy} onClick={() => selectTask(item.id)}><span>{String(index + 1).padStart(2, "0")}</span><div>{item.title}<small>{done ? "Zapisany klip" : attempts.length ? "Brak pełnego materiału" : "Do poznania"}</small></div>{done && <Check size={16} />}</button>;
      })}</aside>
      <section className="capture-card">
        <div className="capture-instruction-heading"><div><span className="eyebrow">Kierowane nagranie</span><h2>{task.title}</h2><p className="muted">{task.description}</p></div><Image src={`/images/pet-${record.pet.species}.png`} alt="" width={150} height={130} className="instruction-art" /></div>
        <ol className="capture-instructions">{task.instructions.map((instruction) => <li key={instruction}>{instruction}</li>)}</ol>
        <details className="capture-safety"><summary>Kiedy przerwać?</summary><ul>{task.stopConditions.map((condition) => <li key={condition}>{condition}</li>)}</ul></details>
        <div className={`camera-stage ${state === "recording" ? "recording" : ""}`}>
          {cameraReady ? <video ref={videoRef} autoPlay muted playsInline aria-label="Podgląd kamery" /> : <div className="camera-placeholder"><Camera size={42} /><strong>Najpierw spokojna, naturalna chwila</strong><p>Telefon ustaw tak, żeby było widać całe ciało i możliwość odejścia.</p></div>}
          {state === "recording" && <span className="recording-time" role="status"><span />{elapsed}s / 30s</span>}
          {(state === "saving" || state === "analyzing") && <div className="camera-processing" role="status"><LoaderCircle className="spin" size={30} /><strong>{state === "saving" ? "Zapisujemy klip na urządzeniu…" : "Sprawdzamy zapisany materiał…"}</strong><p>Nie trzeba ponownie wywoływać reakcji zwierzaka.</p></div>}
        </div>
        <div className="capture-options"><label><input type="checkbox" checked={audio} disabled={busy || cameraReady} onChange={(event) => setAudio(event.target.checked)} />Nagraj również dźwięk</label><label className="video-consent"><input type="checkbox" checked={geminiConsent && !publicGeminiBlocked} disabled={busy || publicGeminiBlocked} onChange={(event) => setGeminiConsent(event.target.checked)} /><span>{publicGeminiBlocked ? "Analiza Google (Gemini) obecnie niedostępna" : "Chcę analizę tego nagrania przez Gemini"}<small>{publicGeminiBlocked ? "Nagranie zapisujemy lokalnie i sprawdzamy jego parametry. Możesz je obejrzeć i dodać własną obserwację. Film ani klatki nie trafią do Google." : "Po zaznaczeniu zgody, przy dostępnym modelu i zgodnej konfiguracji, film lub wybrane klatki mogą zostać wysłane do Google. Wynik modelu trzeba sprawdzić. Bez zgody zapisujemy klip lokalnie i jego parametry."}</small></span></label></div>
        {publicGeminiBlocked && <p className="info-box" role="status">{provider?.policyNotice || "Publiczna analiza Gemini jest wyłączona. Sam klucz ani konto nie odblokowują dostępu."} Nagrywanie i własne adnotacje pozostają dostępne.<button className="text-button" disabled={busy} onClick={onSettings}>Sprawdź dostęp w ustawieniach<ChevronRight size={15} /></button></p>}
        {geminiConsent && !publicGeminiBlocked && !provider?.configured && <p className="info-box">Analiza Gemini wymaga konfiguracji i dostępnego modelu. Film możesz już zapisać lokalnie i opisać własnymi słowami.<button className="text-button" disabled={busy} onClick={onSettings}>Otwórz ustawienia<ChevronRight size={15} /></button></p>}
        <div className="capture-actions">{state === "recording" ? <><button className="button primary" onClick={() => stopRecording()}><Square size={17} />Zakończ nagranie</button><button className="button secondary" onClick={() => stopRecording(true)}><X size={17} />Przerwij dla komfortu</button></> : <><button className="button primary" disabled={busy} onClick={cameraReady ? startRecording : enableCamera}><Camera size={18} />{cameraOpening ? "Uruchamiamy kamerę…" : cameraReady ? "Rozpocznij nagranie" : "Włącz kamerę"}</button><button className="button secondary" disabled={busy} onClick={() => importRef.current?.click()}><Upload size={18} />Dodaj film z telefonu</button>{(cameraReady || cameraOpening) && <button className="text-button" onClick={releaseCamera}>{cameraOpening ? "Anuluj włączanie" : "Wyłącz kamerę"}</button>}</>}</div>
        <input ref={importRef} type="file" accept="video/mp4,video/webm,video/quicktime,video/ogg" className="hidden-input" aria-label="Dodaj film" onChange={(event) => { const file = event.target.files?.[0]; event.target.value = ""; if (file) { releaseCamera(); void saveRecording(file, recordRef.current, task, false); } }} />
        {!busy && <button className="text-button capture-skip" onClick={skipTask}>Pomiń — brak spokojnej okazji</button>}
        {error && <p className="error" role="alert">{error}</p>}{notice && <p className="info-box" role="status">{notice}</p>}
        {recovery && <p className="info-box">Nie trzeba nagrywać reakcji ponownie. Zachowaj dostępny film na swoim urządzeniu.<button className="button secondary" onClick={() => downloadBlob(recovery.blob, recovery.name)}><Download size={16} />Pobierz ten klip</button></p>}
        {!busy && nextTask && <div className="next-capture"><div><span className="eyebrow">Następny spokojny kontekst</span><h3>{nextTask.title}</h3><p>{suggestion?.reason || "Spróbuj przy naturalnej okazji. Nie powtarzaj wcześniejszego bodźca do skutku."}</p></div><button className="button primary" onClick={() => selectTask(nextTask.id)}>Zobacz instrukcję<ArrowRight size={17} /></button></div>}
        {!busy && !getNextTask(record) && !nextTask && <div className="completion-box"><Check /><div><strong>Przeszliśmy wszystkie konteksty.</strong><p>{progress.ready ? "Test i klipy są zapisane. Niezweryfikowane opisy oraz braki wiedzy nadal pozostają oznaczone." : "Przerwane lub pominięte próby pozostają brakami. Możesz wrócić do nich, kiedy pojawi się spokojna, naturalna okazja."}</p><button className="button primary" onClick={onChat}>Przejdź do rozmowy<ArrowRight size={17} /></button></div></div>}
      </section>
    </div>
    <section className="clip-library"><ViewHeading title="Twoje nagrania" description={publicGeminiBlocked ? "Obejrzyj lokalny film, dopisz i potwierdź własną obserwację. Analiza Google jest obecnie niedostępna." : "Dostępny model może zaproponować opis materiału. Ty możesz dopisać i potwierdzić własną obserwację."} />
      {!clips.length ? <div className="empty-state compact"><Video size={34} /><h3>Tu pojawi się pierwszy klip</h3><p>Krótka zwykła sytuacja jest bardziej przydatna niż wymuszona reakcja.</p></div> : clips.map((saved) => <details key={saved.id} className="clip-card" open={lastClipId === saved.id || preview?.id === saved.id}>
        <summary><Video size={20} /><div><strong>{tasks.find((item) => item.id === saved.taskId)?.title ?? "Nagranie"}</strong><small>{new Date(saved.createdAt).toLocaleString("pl-PL")} · {saved.durationSec > 0 ? `${saved.durationSec.toFixed(1)} s · ${saved.width} × ${saved.height}` : "Bez nagrania"}</small></div><span className="status-pill">{statusLabel(saved)}</span></summary>
        <div className="clip-content">{saved.durationSec > 0 && <div className="clip-controls"><button className="button secondary" disabled={busy} onClick={() => void showClip(saved)}><Play size={16} />Obejrzyj film</button><button className="button secondary" disabled={busy} onClick={() => void downloadClip(saved)}><Download size={16} />Pobierz</button>{!["stopped", "skipped"].includes(saved.status) && <button className="text-button" disabled={busy} onClick={() => void retryAnalysis(saved)}><RefreshCw size={15} />{saved.status === "pending" ? "Ponów sprawdzenie" : "Sprawdź ponownie"}</button>}</div>}
          {preview?.id === saved.id && <div className="clip-preview"><video controls playsInline src={preview.url} aria-label="Zapisany film" /><button className="text-button" onClick={closePreview}>Zamknij podgląd</button></div>}
          {saved.analysis && <div className="clip-analysis"><span className="eyebrow">{saved.analysis.source === "technical" ? "Kontrola parametrów" : `${saved.analysis.source === "gemini" ? "Gemini" : "Model lokalny"} · opis wymagający przeglądu`}</span><p>{saved.analysis.summary}</p>{saved.analysis.observations.length > 0 && <ul>{saved.analysis.observations.map((observation, index) => <li key={index}>{observation}</li>)}</ul>}<details><summary>Ograniczenia tego opisu</summary><ul>{saved.analysis.limitations.map((limitation, index) => <li key={index}>{limitation}</li>)}</ul></details></div>}
          {saved.durationSec > 0 && <div className="clip-annotation"><label htmlFor={`note-${saved.id}`}>Moja obserwacja z filmu</label><textarea id={`note-${saved.id}`} placeholder="Opisz, co faktycznie widzisz: co było przed, co zrobił zwierzak i co wydarzyło się potem." value={notes[saved.id] ?? ""} maxLength={2000} onChange={(event) => setNotes((previous) => ({ ...previous, [saved.id]: event.target.value }))} /><label className="annotation-confirm"><input type="checkbox" checked={!!confirmed[saved.id]} onChange={(event) => setConfirmed((previous) => ({ ...previous, [saved.id]: event.target.checked }))} />Obejrzałem film i potwierdzam swoją obserwację.</label><button className="button secondary" disabled={busy || !notes[saved.id]?.trim() || !confirmed[saved.id]} onClick={() => saveAnnotation(saved)}><Check size={16} />Zapisz moją obserwację</button>{record.memories.filter((memory) => memory.clipId === saved.id).map((memory) => <p className="saved-note" key={memory.id}><Check size={14} />Twoja adnotacja: {memory.text}</p>)}</div>}
        </div>
      </details>)}
    </section>
  </div>;
}
