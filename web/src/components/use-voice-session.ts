"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Message } from "@/lib/types";

interface RecognitionResult { isFinal: boolean; length: number; [index: number]: { transcript: string } }
interface RecognitionEvent { resultIndex: number; results: { length: number; [index: number]: RecognitionResult } }
interface Recognition {
  lang: string; continuous: boolean; interimResults: boolean; maxAlternatives: number;
  start(): void; stop(): void; abort(): void;
  onresult: ((event: RecognitionEvent) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onstart: (() => void) | null; onend: (() => void) | null;
}
type SpeechWindow = Window & { SpeechRecognition?: new () => Recognition; webkitSpeechRecognition?: new () => Recognition };

const recognitionErrors: Record<string, string> = {
  "not-allowed": "Mikrofon nie ma zgody. Zezwól na niego w ustawieniach strony albo wpisz wiadomość.",
  "service-not-allowed": "Ta przeglądarka nie udostępnia dyktowania. Możesz wpisać wiadomość.",
  "audio-capture": "Nie znaleziono dostępnego mikrofonu. Sprawdź, czy inna aplikacja go nie używa.",
  "network": "Usługa dyktowania nie odpowiedziała. Sprawdź połączenie lub wpisz wiadomość.",
  "no-speech": "Nie wykryto mowy. Tekst pozostaje w polu; możesz spróbować ponownie.",
  "language-not-supported": "Usługa przeglądarki nie obsługuje teraz języka polskiego. Wpisz wiadomość.",
};

/** Browser speech only. No audio recorder, upload, unattended microphone restart or automatic send. */
export function useVoiceSession(onFinalText: (text: string) => void) {
  const [active, setActive] = useState(false);
  const [canDictate, setCanDictate] = useState(false);
  const [canSpeak, setCanSpeak] = useState(false);
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState("");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [autoRead, setAutoReadState] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [voiceId, setVoiceId] = useState("");
  const [rate, setRate] = useState(0.97);
  const [speaking, setSpeaking] = useState<string | null>(null);
  const recognition = useRef<Recognition | null>(null);
  const utterance = useRef<SpeechSynthesisUtterance | null>(null);
  const onFinal = useRef(onFinalText); onFinal.current = onFinalText;
  const mounted = useRef(false);
  const autoReadSettings = useRef({ active, autoRead });
  autoReadSettings.current = { active, autoRead };
  const setAutoRead = useCallback((enabled: boolean) => {
    autoReadSettings.current.autoRead = enabled;
    setAutoReadState(enabled);
  }, []);

  const interrupt = useCallback(() => {
    const previous = utterance.current;
    if (previous) { previous.onend = null; previous.onerror = null; }
    utterance.current = null;
    if (typeof window !== "undefined") window.speechSynthesis?.cancel();
    if (mounted.current) setSpeaking(null);
  }, []);
  const cancelDictation = useCallback(() => {
    const r = recognition.current;
    recognition.current = null;
    if (r) { r.onresult = null; r.onstart = null; r.onend = null; r.onerror = null; try { r.abort(); } catch { /* already ended */ } }
    if (mounted.current) { setListening(false); setInterim(""); }
  }, []);
  const stopDictation = useCallback(() => {
    const r = recognition.current;
    if (!r) return;
    try { r.stop(); if (mounted.current) setStatus("Dokończamy zapis mowy. Popraw tekst przed wysłaniem."); }
    catch { cancelDictation(); }
  }, [cancelDictation]);

  useEffect(() => {
    mounted.current = true;
    const w = window as SpeechWindow;
    setCanDictate(Boolean(w.SpeechRecognition || w.webkitSpeechRecognition));
    setCanSpeak("speechSynthesis" in window && "SpeechSynthesisUtterance" in window);
    const synthesis = window.speechSynthesis;
    const updateVoices = () => {
      if (mounted.current) setVoices((synthesis?.getVoices() ?? []).filter(voice => /^pl(?:-|_)?/i.test(voice.lang)));
    };
    updateVoices(); synthesis?.addEventListener("voiceschanged", updateVoices);
    const pause = () => {
      cancelDictation(); interrupt();
      if (mounted.current) setStatus("Mikrofon i odczyt wstrzymano. Wróć i uruchom je ponownie, kiedy chcesz.");
    };
    const visibility = () => { if (document.hidden) pause(); };
    document.addEventListener("visibilitychange", visibility);
    window.addEventListener("pagehide", pause);
    return () => {
      mounted.current = false; cancelDictation(); interrupt();
      synthesis?.removeEventListener("voiceschanged", updateVoices);
      document.removeEventListener("visibilitychange", visibility); window.removeEventListener("pagehide", pause);
    };
  }, [cancelDictation, interrupt]);

  const startDictation = useCallback(() => {
    if (recognition.current) return;
    const w = window as SpeechWindow; const Constructor = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!Constructor) { setError("Dyktowanie nie jest dostępne w tej przeglądarce. Wpisz wiadomość."); return; }
    interrupt(); setError(""); setInterim(""); setStatus("Uruchamiamy mikrofon…");
    const r = new Constructor();
    r.lang = "pl-PL"; r.continuous = true; r.interimResults = true; r.maxAlternatives = 1;
    const finalIndexes = new Set<number>();
    r.onstart = () => { if (mounted.current) { setListening(true); setStatus("Słucham po polsku. Zatrzymaj, sprawdź tekst i wyślij go samodzielnie."); } };
    r.onresult = event => {
      if (!mounted.current || recognition.current !== r) return;
      const finals: string[] = []; const pending: string[] = [];
      for (let index = 0; index < event.results.length; index++) {
        const result = event.results[index]; const text = result[0]?.transcript?.trim() ?? "";
        if (result.isFinal && index >= event.resultIndex && !finalIndexes.has(index)) { finalIndexes.add(index); if (text) finals.push(text); }
        else if (!result.isFinal && text) pending.push(text);
      }
      if (finals.length) onFinal.current(finals.join(" ").slice(0, 2000));
      setInterim(pending.join(" ").slice(0, 2000));
    };
    r.onerror = event => {
      if (!mounted.current || recognition.current !== r) return;
      if (event.error !== "aborted") setError(recognitionErrors[event.error] ?? "Nie udało się rozpoznać mowy. Sprawdź tekst i spróbuj ponownie lub wpisz wiadomość.");
      cancelDictation(); setStatus("Mikrofon jest wyłączony. Zapisany tekst możesz poprawić i wysłać.");
    };
    r.onend = () => {
      if (!mounted.current || recognition.current !== r) return;
      recognition.current = null; setListening(false); setInterim("");
      setStatus("Mikrofon jest wyłączony. Popraw rozpoznany tekst w polu i kliknij Wyślij.");
    };
    recognition.current = r;
    // Mark starting immediately so a second click cannot create another recognizer.
    setListening(true);
    try { r.start(); }
    catch { cancelDictation(); setError("Mikrofon nie uruchomił się. Sprawdź uprawnienia i spróbuj ponownie."); }
  }, [cancelDictation, interrupt]);

  const speak = useCallback((message: Pick<Message, "id" | "content" | "mode" | "situation">) => {
    if (!canSpeak || !mounted.current) return;
    if (utterance.current && speaking === message.id) { interrupt(); return; }
    cancelDictation(); interrupt(); setError("");
    const prefix = message.mode === "health" ? "Informacja dla opiekuna, poza rolą zwierzaka. " : message.situation ? "Pomoc w zrozumieniu sytuacji, dla opiekuna. " : "";
    const spoken = new SpeechSynthesisUtterance(`${prefix}${message.content}`);
    spoken.lang = "pl-PL"; spoken.rate = rate;
    const selected = voices.find(voice => voice.voiceURI === voiceId) ?? voices.find(voice => voice.localService) ?? voices[0];
    if (selected) spoken.voice = selected;
    spoken.onend = () => { if (mounted.current && utterance.current === spoken) { utterance.current = null; setSpeaking(null); setStatus("Odczyt zakończony. Mikrofon jest wyłączony."); } };
    spoken.onerror = event => {
      if (!mounted.current || utterance.current !== spoken) return;
      utterance.current = null; setSpeaking(null);
      if (event.error !== "interrupted" && event.error !== "canceled") setError("Nie udało się odczytać odpowiedzi. Treść pozostaje widoczna; możesz wybrać inny głos.");
    };
    utterance.current = spoken; setSpeaking(message.id); setStatus("Czytam odpowiedź syntetycznym głosem lektora.");
    try { window.speechSynthesis.speak(spoken); }
    catch { interrupt(); setError("Odczyt nie jest teraz dostępny. Odpowiedź możesz przeczytać na ekranie."); }
  }, [canSpeak, speaking, interrupt, cancelDictation, rate, voices, voiceId]);

  const latestSpeak = useRef(speak); latestSpeak.current = speak;
  // An async chat response must observe today's opt-in, including a stop/uncheck while it was loading.
  const maybeAutoReadReply = useCallback((message: Pick<Message, "id" | "content" | "mode" | "situation">) => {
    if (mounted.current && !document.hidden && autoReadSettings.current.active && autoReadSettings.current.autoRead) latestSpeak.current(message);
  }, []);
  const startSession = useCallback(() => { autoReadSettings.current.active = true; setActive(true); setError(""); setStatus("Rozmowa głosowa włączona. Uruchom mikrofon, kiedy chcesz mówić."); }, []);
  const stopSession = useCallback(() => { autoReadSettings.current.active = false; cancelDictation(); interrupt(); setActive(false); setStatus(""); setError(""); }, [cancelDictation, interrupt]);
  return { active, canDictate, canSpeak, listening, interim, status, error, autoRead, setAutoRead, voices, voiceId, setVoiceId,
    rate, setRate, speaking, startSession, stopSession, startDictation, stopDictation, cancelDictation, speak, interrupt, maybeAutoReadReply };
}
