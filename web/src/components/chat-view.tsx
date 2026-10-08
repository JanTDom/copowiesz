"use client";
import { useEffect, useRef, useState } from "react";
import { ArrowRight, Camera, ChevronDown, ClipboardList, Mic, MicOff, Send, Volume2, Square, Sparkles, Info, LoaderCircle, MessageCircle, X, Image as ImageIcon, CalendarDays, Share2, RefreshCw } from "lucide-react";
import Image from "next/image";
import { getReadiness } from "@/lib/domain";
import { getConversationTopics } from "@/lib/engagement";
import { apiFetch, apiRecord } from "@/lib/client-api";
import { loadClipBlob } from "@/lib/local-store";
import type { PetRecord, Message, ConversationSituation } from "@/lib/types";
import { PetAvatar } from "./ui";
import { useVoiceSession } from "./use-voice-session";
import styles from "./chat-extras.module.css";

const modeLabels: Record<string, string> = { gemini: "Gemini · cyfrowy głos", grounded: "Odpowiedź lokalna · zapisane informacje", demo: "Demonstracja · profil w przygotowaniu", health: "Informacja o zdrowiu", ollama: "Model lokalny" };
type Props = {
  record: PetRecord; onUpdate: (record: PetRecord) => void;
  onTest: () => void; onCapture: () => void; onSettings: () => void;
  onHistory?: (tab?: "album" | "week" | "notes") => void; onShare?: () => void;
  initialSituation?: ConversationSituation; initialPrompt?: string; onDraftConsumed?: () => void;
};

function useClipPreview(clipId: string | undefined) {
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    let cancelled = false; let created: string | null = null;
    setUrl(null); setError("");
    if (clipId) void loadClipBlob(clipId).then(blob => {
      if (cancelled) return;
      if (!blob) { setError("Plik nie jest dostępny w tej przeglądarce. Możesz opisać sytuację; samo powiązanie z nagraniem nie zastępuje filmu."); return; }
      created = URL.createObjectURL(blob); setUrl(created);
    }).catch(() => { if (!cancelled) setError("Nie udało się otworzyć lokalnego filmu. Opis sytuacji nadal można wysłać."); });
    return () => { cancelled = true; if (created) URL.revokeObjectURL(created); };
  }, [clipId]);
  return { url, error, playbackError: () => setError("Ta przeglądarka nie może odtworzyć tego filmu. Opis sytuacji nadal można wysłać; film nie trafia do rozmowy.") };
}

export function ChatView({ record, onUpdate, onTest, onCapture, onSettings, onHistory, onShare, initialSituation, initialPrompt, onDraftConsumed }: Props) {
  const [input, setInput] = useState(initialPrompt ?? "");
  const [busy, setBusy] = useState(false); const [error, setError] = useState(""); const [notice, setNotice] = useState("");
  const [situationOpen, setSituationOpen] = useState(Boolean(initialSituation));
  const [description, setDescription] = useState(initialSituation?.description ?? "");
  const [context, setContext] = useState(initialSituation?.context ?? "");
  const [clipId, setClipId] = useState(initialSituation?.clipId ?? "");
  const [topics, setTopics] = useState(() => getConversationTopics(record));
  const topicRotation = useRef(0);
  const scrollRef = useRef<HTMLDivElement>(null); const inputRef = useRef<HTMLTextAreaElement>(null);
  const situationPanelRef = useRef<HTMLElement>(null); const voicePanelRef = useRef<HTMLElement>(null);
  const descriptionRef = useRef<HTMLTextAreaElement>(null);
  const current = useRef(record); current.current = record;
  const sending = useRef(false); const disposed = useRef(false);
  const voice = useVoiceSession(text => setInput(previous => `${previous} ${text}`.trim().slice(0, 2000)));
  const ready = getReadiness(record);
  const completedClips = record.clips.filter(clip => (clip.status === "technical_only" || clip.status === "ai_reviewed") && clip.durationSec > 0 && clip.width > 0 && clip.height > 0);
  const selectedClip = completedClips.find(clip => clip.id === clipId);
  const preview = useClipPreview(situationOpen ? selectedClip?.id : undefined);
  const canSend = !busy && !voice.listening && (situationOpen ? Boolean(description.trim()) : Boolean(input.trim()));

  useEffect(() => { disposed.current = false; return () => { disposed.current = true; }; }, []);
  function refreshTopics(random = false) {
    const available = getConversationTopics(current.current);
    if (!available.length) { setTopics([]); return; }
    topicRotation.current = random ? Math.floor(Math.random() * available.length) : (topicRotation.current + 1) % available.length;
    setTopics([...available.slice(topicRotation.current), ...available.slice(0, topicRotation.current)].slice(0, 3));
  }
  useEffect(() => { refreshTopics(true); }, []);
  useEffect(() => {
    if (!initialSituation && !initialPrompt) return;
    voice.cancelDictation(); voice.interrupt();
    if (initialSituation) { setSituationOpen(true); setDescription(initialSituation.description.slice(0, 1500)); setContext((initialSituation.context ?? "").slice(0, 500)); setClipId(initialSituation.clipId ?? ""); }
    if (initialPrompt) setInput(initialPrompt.slice(0, 2000));
    onDraftConsumed?.();
  }, [initialSituation, initialPrompt, onDraftConsumed, voice.cancelDictation, voice.interrupt]);
  useEffect(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" }); }, [record.messages.length, busy]);
  useEffect(() => {
    if (!situationOpen) return;
    const frame = requestAnimationFrame(() => {
      situationPanelRef.current?.scrollIntoView({ block: "start", behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" });
      descriptionRef.current?.focus({ preventScroll: true });
    });
    return () => cancelAnimationFrame(frame);
  }, [situationOpen, initialSituation]);
  useEffect(() => {
    if (!voice.active) return;
    const frame = requestAnimationFrame(() => {
      voicePanelRef.current?.scrollIntoView({ block: "start", behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" });
      voicePanelRef.current?.focus({ preventScroll: true });
    });
    return () => cancelAnimationFrame(frame);
  }, [voice.active]);

  async function send(text = input, includeSituation = true) {
    if (sending.current || voice.listening) return;
    const situation: ConversationSituation | undefined = includeSituation && situationOpen ? {
      description: description.trim().slice(0, 1500), ...(context.trim() ? { context: context.trim().slice(0, 500) } : {}),
      ...(selectedClip ? { clipId: selectedClip.id } : {}),
    } : undefined;
    if (situation && !situation.description) { setError("Opisz, co zrobił zwierzak. Nie musisz znać przyczyny."); return; }
    const prompt = text.trim().slice(0, 2000) || (situation ? "Pomóż mi zrozumieć tę sytuację." : "");
    if (!prompt) return;
    sending.current = true; setBusy(true); setError(""); setNotice(""); setInput(""); voice.cancelDictation(); voice.interrupt();
    const message: Message = { id: crypto.randomUUID(), role: "user", content: prompt, createdAt: new Date().toISOString(), ...(situation ? { situation } : {}) };
    const snapshot = { ...current.current, messages: [...current.current.messages, message] };
    current.current = snapshot; onUpdate(snapshot);
    try {
      const result = await apiFetch("/api/chat", { record: apiRecord(snapshot, situation?.clipId), message: prompt, ...(situation ? { situation } : {}) });
      const reply: Message = { id: crypto.randomUUID(), role: "assistant", content: result.content, createdAt: new Date().toISOString(), evidence: result.evidence ?? [], mode: result.mode, provider: result.provider, ...(situation ? { situation } : {}) };
      onUpdate({ ...current.current, messages: [...current.current.messages, reply] });
      if (!disposed.current) {
        setNotice(result.notice ?? "");
        if (situation) { setSituationOpen(false); setDescription(""); setContext(""); setClipId(""); }
        voice.maybeAutoReadReply(reply);
      }
    } catch (e) {
      if (!disposed.current) { setError(e instanceof Error ? e.message : "Nie udało się odpowiedzieć. Spróbuj ponownie."); setInput(prompt); }
    } finally { sending.current = false; if (!disposed.current) setBusy(false); }
  }
  function chooseTopic(prompt: string) { if (busy) return; setInput(prompt); inputRef.current?.focus(); }
  const providerLabel = (message: Message) => message.provider === "gemini" && message.mode === "demo" ? "Gemini · demonstracja" : modeLabels[message.mode ?? "grounded"];

  return <div className={`chat-view ${styles.view}`}>
    <header className="chat-heading"><div className="chat-identity"><PetAvatar pet={record.pet} large/><div><h1>{record.pet.name}</h1><p>{record.isDemo ? "Przykładowy zwierzak · dane demonstracyjne" : ready.ready ? "Twój towarzysz rozmowy" : "Poznajemy się · profil w przygotowaniu"}</p></div></div><button className="button secondary compact" onClick={onSettings}><Sparkles size={16}/>Gemini i konto</button></header>
    {(!ready.ready || record.isDemo) && <div className="preparation-strip"><div><Info size={18}/><p>{record.isDemo ? "To przykładowa rozmowa na syntetycznych danych. Dodaj własnego zwierzaka, aby stworzyć jego profil." : `Przed osobistą rozmową: ${ready.answered}/${ready.total} pytań i ${ready.clips}/${ready.totalClips} kontekstów wideo. Teraz pokazujemy oznaczoną demonstrację.`}</p></div>{!record.isDemo && <div><button onClick={onTest}><ClipboardList size={16}/>Kontynuuj test</button><button onClick={onCapture}><Camera size={16}/>Nagraj reakcje</button></div>}</div>}
    <div className={styles.quickActions} aria-label="Możliwości rozmowy">
      <button type="button" aria-expanded={voice.active} onClick={() => voice.active ? voice.stopSession() : voice.startSession()}><Mic size={16}/>{voice.active ? "Zakończ tryb głosowy" : "Rozmowa głosowa"}</button>
      <button type="button" aria-expanded={situationOpen} onClick={() => { voice.cancelDictation(); voice.interrupt(); setSituationOpen(previous => !previous); }}><MessageCircle size={16}/>Zrozum tę sytuację</button>
      {onHistory && <button type="button" onClick={() => onHistory("week")}><CalendarDays size={16}/>Nasz tydzień</button>}
      {onShare && <button type="button" onClick={onShare}><Share2 size={16}/>Karta zwierzaka</button>}
    </div>
    <div className={`conversation ${styles.conversation}`} ref={scrollRef} aria-live="polite" aria-relevant="additions">
      {record.messages.length === 0 && <div className="chat-intro"><div className="intro-art"><Image src={record.pet.species === "cat" ? "/images/pet-cat.png" : "/images/pet-dog.png"} alt="Ilustracja cyfrowego towarzysza" fill sizes="420px" loading="eager"/></div><h2>Jest tyle, o czym możemy porozmawiać.</h2><p>Zapytaj o codzienne potrzeby, ulubione chwile i to, co widzisz w zachowaniu {record.pet.name}.</p></div>}
      {record.messages.map(message => <article className={`message ${message.role}`} key={message.id}>
        {message.role === "assistant" && (message.mode === "health" || message.situation ? <span className={styles.helperAvatar} aria-hidden="true"><Info size={19}/></span> : <PetAvatar pet={record.pet}/>)}
        <div className="message-body"><span className="message-name">{message.role === "user" ? "Ty" : message.mode === "health" ? "Informacja dla opiekuna" : message.situation ? "COPOWIESZ · pomoc dla opiekuna" : record.pet.name}{message.role === "assistant" && <small>{providerLabel(message)}</small>}</span>
          {message.role === "user" && message.situation && <details className={styles.situationMessage}><summary>Twój opis sytuacji</summary><p>{message.situation.description}</p>{message.situation.context && <p><strong>Kontekst:</strong> {message.situation.context}</p>}{message.situation.clipId && <p>Nagranie powiązane jako odniesienie. Film nie został wysłany w rozmowie.</p>}</details>}
          <div className="message-content">{message.content}</div>
          {message.role === "assistant" && <div className="message-tools">{voice.canSpeak && <button className="text-button" onClick={() => voice.speak(message)}>{voice.speaking === message.id ? <Square size={14}/> : <Volume2 size={15}/>} {voice.speaking === message.id ? "Zatrzymaj" : "Posłuchaj"}</button>}{Boolean(message.evidence?.length) && <details className="message-evidence"><summary>Skąd to wiesz?<ChevronDown size={14}/></summary><div>{message.evidence?.map(item => <section key={item.id}><strong>{item.title}</strong><span className="caption">{item.kind === "owner_report" ? "Relacja opiekuna" : item.kind === "video" ? "Nagranie lub adnotacja — zakres w opisie" : "Baza wiedzy"}</span><p>{item.excerpt}</p>{item.url && <a href={item.url} target="_blank" rel="noreferrer">Otwórz źródło ↗</a>}</section>)}</div></details>}</div>}
        </div>
      </article>)}
      {busy && <div className="reply-loading" role="status"><LoaderCircle className="spin" size={18}/>Przygotowuję odpowiedź…</div>}
    </div>
    <div className={styles.topicSection}><div className={styles.topicHeading}><span>O czym dziś porozmawiacie?</span><button type="button" onClick={() => refreshTopics()} disabled={busy} aria-label="Zaproponuj inne tematy"><RefreshCw size={13}/>Inne tematy</button></div><div className={styles.topics}>{topics.map(topic => <button key={topic.id} type="button" onClick={() => chooseTopic(topic.prompt)} disabled={busy}>{topic.label}<ArrowRight size={14}/></button>)}</div></div>
    <footer className="chat-footer">
      {voice.active && <section ref={voicePanelRef} tabIndex={-1} className={styles.voicePanel} aria-label="Rozmowa głosowa"><div className={styles.panelHeading}><h2><Mic size={18}/>Porozmawiaj głosem</h2><button type="button" className="icon-button" onClick={voice.stopSession} aria-label="Zakończ tryb głosowy"><X size={17}/></button></div>
        <p>Dyktowanie może korzystać z usługi dostawcy przeglądarki. Sprawdź tekst przed wysłaniem. Możesz go poprawić w polu wiadomości; wysyłasz dopiero przyciskiem Wyślij.</p>
        <div className={styles.voiceActions}><button type="button" className="button secondary compact" onClick={voice.listening ? voice.stopDictation : voice.startDictation} disabled={busy || !voice.canDictate}>{voice.listening ? <MicOff size={16}/> : <Mic size={16}/>} {voice.listening ? "Zatrzymaj dyktowanie" : "Zacznij mówić"}</button>{voice.speaking && <button type="button" className="button secondary compact" onClick={voice.interrupt}><Square size={15}/>Przerwij odczyt</button>}</div>
        {!voice.canDictate && <p>Ta przeglądarka nie udostępnia dyktowania. Nadal możesz wpisać wiadomość i korzystać z dostępnego lektora.</p>}
        {voice.interim && <p className={styles.interim}>Rozpoznaję: {voice.interim}</p>}
        <div className={styles.voiceOptions}><label className={styles.check}><input type="checkbox" checked={voice.autoRead} onChange={event => voice.setAutoRead(event.target.checked)} disabled={!voice.canSpeak}/><span>Czytaj nowe odpowiedzi automatycznie w tym trybie</span></label><label>Polski głos lektora<select value={voice.voiceId} onChange={event => { voice.interrupt(); voice.setVoiceId(event.target.value); }} disabled={!voice.canSpeak}><option value="">{voice.voices.length ? "Automatyczny polski głos" : "Głos domyślny przeglądarki (pl-PL)"}</option>{voice.voices.map(v => <option key={v.voiceURI} value={v.voiceURI}>{v.name}{v.localService ? " · na urządzeniu" : " · usługa przeglądarki"}</option>)}</select></label><label>Tempo: {voice.rate.toFixed(2)}×<input type="range" min="0.7" max="1.3" step="0.01" value={voice.rate} onChange={event => { voice.interrupt(); voice.setRate(Number(event.target.value)); }} disabled={!voice.canSpeak}/></label></div>
        <p className={styles.voiceDisclosure}>Syntetyczny lektor, a nie biologiczny głos zwierzęcia. Informacje o zdrowiu i pomoc w sytuacji są czytane jako informacje dla opiekuna. Mikrofon nie włącza się automatycznie.</p>
        {voice.status && <p role="status" className={styles.voiceStatus}>{voice.status}</p>}{voice.error && <p role="alert" className="error">{voice.error}</p>}
      </section>}
      {situationOpen && <section ref={situationPanelRef} className={styles.situationPanel} aria-label="Pomoc w zrozumieniu sytuacji"><div className={styles.panelHeading}><h2><MessageCircle size={18}/>Pomóż mi zrozumieć tę sytuację</h2><button type="button" className="icon-button" onClick={() => { voice.cancelDictation(); voice.interrupt(); setSituationOpen(false); }} aria-label="Zamknij opis sytuacji"><X size={17}/></button></div><p>Opisz to, co widać lub słychać, bez zgadywania przyczyny. Odpowiedź pomoże uporządkować obserwację i zapyta o brakujący kontekst.</p><label htmlFor="situation-description">Co zrobił zwierzak?<textarea ref={descriptionRef} id="situation-description" value={description} onChange={event => setDescription(event.target.value)} placeholder="Np. odsunął głowę, kiedy zbliżyłem rękę, po czym odszedł do legowiska…" maxLength={1500} rows={3} disabled={busy}/></label><label htmlFor="situation-context">Co było przedtem i dookoła? <span>(opcjonalnie)</span><input id="situation-context" value={context} onChange={event => setContext(event.target.value)} placeholder="Miejsce, osoby, pora, co się zmieniło…" maxLength={500} disabled={busy}/></label><label htmlFor="situation-clip">Powiąż zapisany film <span>(opcjonalnie)</span><select id="situation-clip" value={selectedClip?.id ?? ""} onChange={event => setClipId(event.target.value)} disabled={busy}><option value="">Bez filmu — sam opis</option>{completedClips.map(clip => <option key={clip.id} value={clip.id}>{clip.fileName || "Nagranie"} · {new Date(clip.createdAt).toLocaleDateString("pl-PL")}</option>)}</select></label>{preview.url && <video className={styles.preview} src={preview.url} controls playsInline preload="metadata" onPlay={() => { voice.cancelDictation(); voice.interrupt(); }} onError={preview.playbackError} aria-label="Podgląd lokalnego filmu powiązanego z sytuacją"/>}{preview.error && <p className={styles.voiceDisclosure}>{preview.error}</p>}<p className={styles.voiceDisclosure}>Wysyłamy opis, kontekst i ewentualne powiązanie z nagraniem. Film, klatki i dźwięk nie trafiają do tej rozmowy. Analiza filmu odbywa się osobno w Nagraniach, po odrębnej zgodzie. Opis nie staje się automatycznie wspomnieniem.</p><div className={styles.situationActions}><button type="button" className="text-button" onClick={onCapture}><Camera size={15}/>Otwórz nagrania</button>{onHistory && <button type="button" className="text-button" onClick={() => onHistory("album")}><ImageIcon size={15}/>Wasz album</button>}</div></section>}
      {notice && <p className="provider-notice" role="status">{notice}</p>}{error && <p className="error" role="alert">{error}</p>}
      <form className="chat-composer" onSubmit={event => { event.preventDefault(); void send(); }}>{<button type="button" className={`icon-button ${voice.listening ? "recording" : ""}`} aria-label={voice.listening ? "Zatrzymaj dyktowanie" : "Otwórz rozmowę głosową"} onClick={() => voice.listening ? voice.stopDictation() : voice.startSession()}><Mic size={23}/></button>}<textarea ref={inputRef} aria-label={`Wiadomość do ${record.pet.name}`} placeholder={situationOpen ? "Dodatkowe pytanie (opcjonalnie)" : `O co chcesz zapytać ${record.pet.name}?`} value={input} onChange={event => setInput(event.target.value)} maxLength={2000} rows={1} onKeyDown={event => { if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); if (canSend) void send(); } }}/><button className="send-orb" type="submit" disabled={!canSend} aria-label={situationOpen ? "Wyślij opis sytuacji do rozmowy" : "Wyślij wiadomość"}><Send size={21}/></button></form>
      {voice.listening && <p className={styles.voiceStatus} role="status">Najpierw zatrzymaj mikrofon i sprawdź tekst. Nic nie wysyła się automatycznie.</p>}
      <p className="chat-disclosure">Cyfrowy głos to wyobrażona wypowiedź oparta na dostępnych informacjach. Możesz sprawdzić podstawę każdej odpowiedzi.</p>
    </footer>
  </div>;
}
