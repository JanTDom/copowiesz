"use client";
import { useState } from "react";
import { ArrowLeft, ArrowRight, Check, HelpCircle } from "lucide-react";
import { getQuestions, sections, getReadiness, validateAnswer } from "@/lib/domain";
import type { Answer, PetRecord } from "@/lib/types";
import { ViewHeading } from "./ui";

export function QuestionnaireView({ record, update, onCapture }: { record: PetRecord; update: (record: PetRecord) => void; onCapture: () => void }) {
  const questions = getQuestions(record.pet.species);
  const [index, setIndex] = useState(() => Math.max(0, questions.findIndex(q => !record.answers[q.id])));
  const q = questions[index]; const answer = record.answers[q.id];
  const [value, setValue] = useState<string | number | string[]>(answer?.value ?? "");
  const [note, setNote] = useState(answer?.note ?? ""); const [error, setError] = useState(""); const [showHelp, setShowHelp] = useState(false);
  const progress = getReadiness(record);
  function go(next: number) { const i = Math.max(0, Math.min(questions.length - 1, next)); const a = record.answers[questions[i].id]; setIndex(i); setValue(a?.value ?? ""); setNote(a?.note ?? ""); setError(""); setShowHelp(false); }
  function save(status: Answer["status"]) {
    const a: Answer = { questionId:q.id, status, value:status === "answered" ? value : undefined, note:note.trim() || undefined, updatedAt:new Date().toISOString() };
    if (!validateAnswer(q, a)) { setError("Wybierz odpowiedź lub użyj „Nie wiem”. Przy liczbie wpisz prawidłową wartość."); return; }
    update({...record, answers:{...record.answers,[q.id]:a}});
    if (index < questions.length - 1) go(index + 1);
  }
  const section = sections.find(s => s.id === q.section_id);
  const completed = progress.answered === progress.total;
  return <div className="questionnaire-view">
    <ViewHeading title={`Poznajmy ${record.pet.name}`} description="Cała historia, po jednym kroku. Odpowiedzi zapisują się lokalnie." />
    <div className="progress-line"><span>{progress.answered} z {progress.total} pytań przejrzanych</span><span>{new Set(questions.map(item=>item.section_id)).size} obszarów poznawania</span></div><div className="progress-track"><span style={{width:`${100*progress.answered/progress.total}%`}} /></div>
    <div className="questionnaire-layout"><aside className="section-list" aria-label="Obszary testu">{sections.map((s, i) => {
      const group = questions.filter(item => item.section_id === s.id); if (!group.length) return null;
      const count = group.filter(item => record.answers[item.id]).length;
      return <button key={s.id} className={s.id === q.section_id ? "active" : ""} onClick={() => go(questions.findIndex(item => item.section_id === s.id))}><span>{String(i+1).padStart(2,"0")}</span><div>{s.title.replace(/^Etap \d+: /, "")}<small>{count}/{group.length}</small></div>{count === group.length && <Check size={15} />}</button>;
    })}</aside>
      <section className="question-card"><div className="question-meta"><span>{section?.title.replace(/^Etap \d+: /, "")}</span><span>{index + 1}/{questions.length}</span></div>
        <h2>{q.prompt}</h2>
        <p className="muted">{q.recall_window_days ? "Pomyśl o naturalnych sytuacjach z ostatnich 14 dni." : "Podaj informacje, które znasz. Szacunek możesz zaznaczyć w notatce."}</p>
        {q.type === "free_text" ? <textarea aria-label="Twoja odpowiedź" value={String(value)} maxLength={2000} placeholder="Opisz własnymi słowami…" onChange={e => setValue(e.target.value)} /> : q.type === "number" ? <input className="number-answer" aria-label="Twoja odpowiedź liczbowa" type="number" min="0" value={typeof value === "number" ? value : ""} onChange={e => setValue(e.target.value === "" ? "" : Number(e.target.value))} /> : <div className="answer-options">{q.options?.filter(o => !["unknown","not_applicable"].includes(o.value) && (q.id!=="q001"||o.value===record.pet.species)).map(o => {
          const selected = q.type === "multi_choice" ? Array.isArray(value) && value.includes(o.value) : value === o.value;
          return <button key={o.value} className={selected ? "selected" : ""} aria-pressed={selected} onClick={() => {
            if (q.type !== "multi_choice") { setValue(o.value); return; }
            const v = Array.isArray(value) ? value : [];
            const next = selected ? v.filter(x => x !== o.value) : [...v.filter(x => o.value === "none" || o.value === "no" ? false : !["none","no"].includes(x)),o.value];
            setValue(next);
          }}><span className={q.type === "multi_choice" ? "option-box" : "option-circle"}>{selected && <Check size={13} />}</span>{o.label}</button>;
        })}</div>}
        <details className="answer-context"><summary>Dodaj przykład lub kontekst (opcjonalnie)</summary><textarea aria-label="Kontekst odpowiedzi" value={note} maxLength={1200} onChange={e => setNote(e.target.value)} placeholder="Kiedy to widziałeś? Czy coś było nietypowe?" /></details>
        <button className="text-button help-button" onClick={() => setShowHelp(!showHelp)}><HelpCircle size={16} />Jak rozumieć to pytanie?</button>{showHelp && <p className="info-box">{q.notes}</p>}
        {error && <p className="error" role="alert">{error}</p>}
        <div className="unknown-actions"><button onClick={() => save("unknown")}>Nie wiem</button><button onClick={() => save("not_applicable")}>Nie dotyczy</button><button onClick={() => save("skipped")}>Pomiń na teraz</button></div>
        <footer className="question-actions"><button className="button secondary" disabled={index === 0} onClick={() => go(index-1)}><ArrowLeft size={16} />Wstecz</button><button className="button primary" onClick={() => save("answered")}>Zapisz odpowiedź<ArrowRight size={16} /></button></footer>
        {answer && <p className="saved-note"><Check size={14} />Zapisano. Możesz poprawić tę odpowiedź.</p>}
        {completed && <div className="completion-box"><Check /><div><strong>Przejrzeliśmy wszystkie obszary.</strong><p>Teraz dodajmy kierowane nagrania. Braki odpowiedzi pozostają oznaczone.</p><button className="button primary" onClick={onCapture}>Przejdź do nagrań<ArrowRight size={16} /></button></div></div>}
      </section>
    </div>
  </div>;
}
