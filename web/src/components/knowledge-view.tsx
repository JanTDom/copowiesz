"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { BookOpen, ChevronRight, ExternalLink, Search, X } from "lucide-react";
import { getKnowledgeEvidence, knowledgeCards, searchKnowledge } from "@/lib/knowledge";
import type { KnowledgeCard, PetRecord, Species } from "@/lib/types";
import { ViewHeading } from "./ui";

type Domain = "all" | "behavior" | "methods" | "health";
const domainLabels = { behavior: "Zachowanie", methods: "Jak poznajemy", health: "Sygnały zdrowotne" };
const escalationLabels: Record<string, string> = {
  veterinarian: "Konsultacja z lekarzem weterynarii.",
  behaviorist: "Konsultacja ze specjalistą zachowania zwierząt.",
  urgent_veterinarian: "Pilna pomoc weterynaryjna.",
};

export function KnowledgeView({ record }: { record: PetRecord; onUpdate: (record: PetRecord) => void }) {
  const [species, setSpecies] = useState<Species>(record.pet.species);
  const [domain, setDomain] = useState<Domain>("all");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<KnowledgeCard | null>(null);
  const drawer = useRef<HTMLElement>(null);
  const trigger = useRef<HTMLElement | null>(null);

  useEffect(() => { setSpecies(record.pet.species); setSelected(null); }, [record.pet.id, record.pet.species]);
  useEffect(() => {
    if (!selected) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    drawer.current?.querySelector<HTMLButtonElement>("button")?.focus();
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") { setSelected(null); return; }
      if (event.key !== "Tab") return;
      const controls = drawer.current?.querySelectorAll<HTMLElement>('a[href],button:not([disabled]),[tabindex="0"]');
      if (!controls?.length) return;
      const first = controls[0];
      const last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", handleKey);
    return () => { document.body.style.overflow = previousOverflow; document.removeEventListener("keydown", handleKey); trigger.current?.focus(); };
  }, [selected]);

  const allApplicable = useMemo(() => knowledgeCards.filter((card) => card.species.includes(species) && (domain === "all" || (card.domain ?? "behavior") === domain)), [species, domain]);
  const cards = useMemo(() => query.trim() ? searchKnowledge(query, species, domain === "all" ? undefined : domain, 20) : allApplicable, [query, species, domain, allApplicable]);
  const selectedEvidence = selected ? getKnowledgeEvidence(selected) : [];

  function openCard(card: KnowledgeCard) { trigger.current = document.activeElement as HTMLElement; setSelected(card); }

  return <section className="knowledge-view">
    <ViewHeading title="Wiedza, która pomaga zrozumieć" description={`290 opracowanych kart ze źródłami. Sprawdzaj reakcje ${record.pet.name} w ich kontekście.`}>
      <span className="badge"><BookOpen size={16} aria-hidden />290 kart</span>
    </ViewHeading>

    <div className="knowledge-controls card">
      <label className="search-field"><Search size={19} aria-hidden /><span className="sr-only">Szukaj w wiedzy</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Np. zabawa, dotyk, odpoczynek…" type="search" /></label>
      <div className="filter-bar">
        <div className="segmented-control" role="group" aria-label="Gatunek wiedzy">
          <button type="button" className={species === "dog" ? "active" : ""} aria-pressed={species === "dog"} onClick={() => setSpecies("dog")}>Psy</button>
          <button type="button" className={species === "cat" ? "active" : ""} aria-pressed={species === "cat"} onClick={() => setSpecies("cat")}>Koty</button>
        </div>
        <label className="domain-filter">Obszar<select value={domain} onChange={(event) => setDomain(event.target.value as Domain)}>
          <option value="all">Wszystkie obszary</option><option value="behavior">Zachowanie</option><option value="methods">Jak poznajemy</option><option value="health">Sygnały zdrowotne</option>
        </select></label>
      </div>
    </div>

    <div className="knowledge-context"><p>{species === record.pet.species ? `Wiedza właściwa dla ${record.pet.species === "dog" ? "psa" : "kota"} ${record.pet.name}.` : `Przeglądasz wiedzę o ${species === "dog" ? "psach" : "kotach"}. Rozmowa z ${record.pet.name} korzysta z wiedzy jego gatunku.`}</p><p className="muted">Karty wymagają przeglądu eksperckiego. Nie są diagnozą ani wynikiem badania Twojego zwierzaka.</p></div>
    <p className="result-count" aria-live="polite">{query.trim() ? `${cards.length} najlepiej dopasowanych kart` : `${cards.length} kart dla wybranego gatunku i obszaru`}</p>

    {cards.length === 0 ? <div className="empty-state"><BookOpen size={32} /><h2>Nie znaleziono pasującej karty</h2><p>Spróbuj krótszego hasła lub zmień obszar. Brak wyniku oznacza brak dopasowania w tej wersji wiedzy.</p></div> : <div className="knowledge-grid">
      {cards.map((card) => <button type="button" className="knowledge-card card" key={card.id} onClick={() => openCard(card)}>
        <span className={`knowledge-domain ${card.domain ?? "behavior"}`}>{domainLabels[card.domain ?? "behavior"]}</span>
        <h2>{card.title}</h2><p>{card.observation}</p>
        <span className="knowledge-card-footer">{card.source_ids.length} {card.source_ids.length === 1 ? "źródło" : "źródła"}<ChevronRight size={18} aria-hidden /></span>
      </button>)}
    </div>}

    {selected && <div className="drawer-backdrop" onClick={() => setSelected(null)}>
      <aside ref={drawer} className="knowledge-drawer" role="dialog" aria-modal="true" aria-labelledby="knowledge-detail-title" onClick={(event) => event.stopPropagation()}>
        <header className="drawer-heading"><div><span className="eyebrow">{domainLabels[selected.domain ?? "behavior"]}</span><h2 id="knowledge-detail-title">{selected.title}</h2></div><button type="button" className="icon-button" aria-label="Zamknij kartę wiedzy" onClick={() => setSelected(null)}><X /></button></header>
        {selected.domain === "health" && <div className="notice health-notice">To informacja dla opiekuna. Wygląd, zachowanie i film nie rozpoznają choroby. Nie opóźniaj potrzebnej konsultacji nagrywaniem.</div>}
        <div className="knowledge-detail-section"><h3>Co można zaobserwować</h3><p>{selected.observation}</p></div>
        <div className="knowledge-detail-section"><h3>Możliwe interpretacje</h3><ul>{selected.possible_interpretations.map((item, index) => <li key={index}>{item}</li>)}</ul><p className="muted">Przykłady do sprawdzenia w kontekście; nie potwierdzają przyczyny u Twojego zwierzaka.</p></div>
        <div className="knowledge-detail-section"><h3>Bezpieczny następny krok</h3><ul>{selected.safe_next_steps.map((item, index) => <li key={index}>{item}</li>)}</ul></div>
        {selected.escalation&&escalationLabels[selected.escalation]&&<div className="knowledge-detail-section"><h3>Kiedy szukać pomocy</h3><p>{escalationLabels[selected.escalation]}</p></div>}
        <div className="knowledge-detail-section"><h3>Co ogranicza wniosek</h3><p>{selected.limitations}</p>{selected.confounders.length > 0 && <ul>{selected.confounders.map((item, index) => <li key={index}>{item}</li>)}</ul>}</div>
        <div className="knowledge-detail-section"><h3>Źródła i podstawa</h3><div className="source-list">{selectedEvidence.map((evidence) => <article className="source-item" key={evidence.id}><h4>{evidence.title}</h4><p>{evidence.excerpt}</p>{evidence.url?.startsWith("https://") && <a href={evidence.url} target="_blank" rel="noopener noreferrer">Otwórz źródło<ExternalLink size={14} aria-hidden /></a>}</article>)}</div></div>
      </aside>
    </div>}
  </section>;
}
