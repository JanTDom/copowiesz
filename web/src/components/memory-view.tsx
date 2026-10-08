"use client";

import { useMemo, useState } from "react";
import { BookHeart, Plus, Trash2 } from "lucide-react";
import { buildProfileFacts } from "@/lib/domain";
import type { Memory, PetRecord } from "@/lib/types";
import { ViewHeading } from "./ui";

const categoryLabels: Record<Memory["category"], string> = { preference: "Preferencja", routine: "Codzienny zwyczaj", event: "Wydarzenie", health: "Kontekst zdrowia", other: "Inna obserwacja" };
function displayDate(value: string) { const date = new Date(value); return Number.isNaN(date.getTime()) ? "Data nieznana" : new Intl.DateTimeFormat("pl-PL", { day: "numeric", month: "long", year: "numeric" }).format(date); }

export function MemoryView({ record, onUpdate, embedded = false }: { record: PetRecord; onUpdate: (record: PetRecord) => void; embedded?: boolean }) {
  const [text, setText] = useState("");
  const [category, setCategory] = useState<Memory["category"]>("preference");
  const [saved, setSaved] = useState(false);
  const answerFacts = useMemo(() => buildProfileFacts(record).filter((fact) => Boolean(record.answers[fact.id])), [record]);

  function addMemory(event: React.FormEvent) {
    event.preventDefault();
    const cleanText = text.trim();
    if (!cleanText || cleanText.length > 2000) return;
    const memory: Memory = { id: crypto.randomUUID(), text: cleanText, category, source: "owner_report", createdAt: new Date().toISOString() };
    onUpdate({ ...record, memories: [...record.memories, memory] });
    setText(""); setSaved(true);
  }

  function deleteMemory(id: string) { onUpdate({ ...record, memories: record.memories.filter((memory) => memory.id !== id) }); setSaved(false); }

  return <section className="memory-view">
    {!embedded && <ViewHeading title={`Wspomnienia ${record.pet.name}`} description="To, co zapiszesz, pomaga prowadzić bardziej osobistą rozmowę. Możesz poprawić pamięć, usuwając błędny wpis i dodając właściwy." />}
    <div className="memory-hero card"><div><span className="eyebrow">Wasza wspólna historia</span><h2>Małe obserwacje. Coraz bliższa rozmowa.</h2><p>Ulubiona zabawka, miejsce odpoczynku, wydarzenie z ostatniego spaceru. Zapisuj konkretne sytuacje i ich kontekst.</p></div><img src="/images/pet-memory.png" alt="" /></div>
    {record.isDemo && <div className="notice">Oznaczona demonstracja: wspomnienia w tym profilu są syntetyczne. Nie opisują rzeczywistego zwierzaka.</div>}

    <div className="memory-layout">
      <form className="memory-form card" onSubmit={addMemory}>
        <h2><Plus size={19} aria-hidden />Dodaj obserwację</h2>
        <label>Rodzaj zapisu<select value={category} onChange={(event) => { setCategory(event.target.value as Memory["category"]); setSaved(false); }}>{Object.entries(categoryLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        <label>Co udało Ci się zauważyć?<textarea value={text} onChange={(event) => { setText(event.target.value); setSaved(false); }} maxLength={2000} rows={5} placeholder={`Np. „Dziś podczas zwykłej zabawy ${record.pet.name} wybrał(a) piłkę i po chwili samodzielnie zrobił(a) przerwę”.`} required /></label>
        <p className="muted">Zapis pozostaje Twoją relacją. Oddziel to, co widzisz, od przypuszczenia o przyczynie lub emocji.</p>
        {category === "health" && <p className="notice">Zapis zdrowotny jest kontekstem, nie diagnozą ani cechą osobowości. Nie zastępuje konsultacji weterynaryjnej.</p>}
        <button type="submit" className="button primary" disabled={!text.trim()}><Plus size={18} aria-hidden />Zapisz w pamięci</button>
        <p className="form-feedback" role="status">{saved ? "Obserwacja została zapisana." : ""}</p>
      </form>

      <div className="memory-list-section"><div className="section-heading"><h2>Twoje zapisy</h2><span className="badge">{record.memories.length}</span></div>
        {record.memories.length === 0 ? <div className="empty-state"><BookHeart size={34} aria-hidden /><h3>Pierwszy zapis może być drobny</h3><p>Opisz jedną naturalną sytuację. Pamięć nie dopowiada wydarzeń, których nie zapiszesz.</p></div> : <div className="memory-list">{[...record.memories].reverse().map((memory) => <article className="memory-card card" key={memory.id}>
          <div className="memory-card-meta"><span className={`memory-category ${memory.category}`}>{categoryLabels[memory.category]}</span><button type="button" className="icon-button" aria-label={`Usuń zapis: ${memory.text.slice(0, 50)}`} title="Usuń ten zapis" onClick={() => deleteMemory(memory.id)}><Trash2 size={17} /></button></div>
          <p>{memory.text}</p><footer><time dateTime={memory.createdAt}>{displayDate(memory.createdAt)}</time><span>{memory.source === "video_annotation" ? "Adnotacja opiekuna do filmu" : "Relacja opiekuna"}</span></footer>
        </article>)}</div>}
      </div>
    </div>

    <section className="questionnaire-facts"><div className="section-heading"><div><h2>Informacje z przekrojowego testu</h2><p className="muted">Osobno od wspomnień: odpowiedzi opiekuna z formularza. „Nie wiem” i pominięcia nie stają się faktami.</p></div><span className="badge">{answerFacts.length}</span></div>
      {answerFacts.length === 0 ? <p className="muted">Tutaj pojawią się udzielone odpowiedzi. Możesz je poprawiać w zakładce testu.</p> : <div className="answer-facts-list">{answerFacts.map((fact) => <details className="answer-fact card" key={fact.id}><summary>{fact.title}</summary><p>{fact.excerpt}</p><span className="muted">Źródło: odpowiedź opiekuna w teście</span></details>)}</div>}
    </section>
  </section>;
}
