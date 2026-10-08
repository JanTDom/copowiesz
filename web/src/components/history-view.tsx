"use client";

import { useState } from "react";
import { CalendarDays, Heart, Images, MessageCircle, Share2, Sparkles } from "lucide-react";
import type { Moment, PetRecord } from "@/lib/types";
import { getWeeklySummary } from "@/lib/engagement";
import { MemoryView } from "./memory-view";
import { MomentsAlbum } from "./moments-album";
import { ViewHeading } from "./ui";
import styles from "./history-view.module.css";

export type HistoryTab = "notes" | "album" | "week";
const tabs = [{ id: "notes", title: "Obserwacje", icon: Heart }, { id: "album", title: "Wasz album", icon: Images }, { id: "week", title: "Nasz tydzień", icon: CalendarDays }] as const;
function date(value: string) { return new Intl.DateTimeFormat("pl-PL", { day: "numeric", month: "long" }).format(new Date(value)); }

export function HistoryView({ record, tab, onTabChange, onUpdate, onDiscussMoment, onDiscussPrompt, onCapture, onShare }: {
  record: PetRecord; tab: HistoryTab; onTabChange: (tab: HistoryTab) => void; onUpdate: (record: PetRecord) => void;
  onDiscussMoment: (moment: Moment) => void; onDiscussPrompt: (prompt: string) => void; onCapture: () => void; onShare: () => void;
}) {
  return <section className={styles.history}>
    <ViewHeading title="Wasza historia" description={`Małe chwile z ${record.pet.name}. Zapisane przez Ciebie, bliskie Waszej rozmowie.`}>
      <button type="button" className="button outline compact" onClick={onShare}><Share2 size={16} />Karta zwierzaka</button>
    </ViewHeading>
    <div className={styles.tabs} role="group" aria-label="Widok Waszej historii">{tabs.map(item => <button type="button" key={item.id} aria-pressed={tab === item.id} onClick={() => onTabChange(item.id)}><item.icon size={18} />{item.title}</button>)}</div>
    {tab === "notes" ? <MemoryView record={record} onUpdate={onUpdate} embedded /> : tab === "album" ? <MomentsAlbum record={record} onUpdate={onUpdate} onDiscuss={onDiscussMoment} onCapture={onCapture} /> : <WeeklyView record={record} onDiscuss={onDiscussPrompt} onNotes={() => onTabChange("notes")} />}
  </section>;
}

function WeeklyView({ record, onDiscuss, onNotes }: { record: PetRecord; onDiscuss: (prompt: string) => void; onNotes: () => void }) {
  const week = getWeeklySummary(record);
  const [visibleCount, setVisibleCount] = useState(8);
  return <section className={styles.week} aria-labelledby="week-title">
    <header className={styles.weekHero}>
      <div><span className="eyebrow">Ostatnie siedem dni · {date(week.from)} – {date(week.to)}</span><h2 id="week-title">Nasz tydzień</h2><p>Co zostało zapisane, co warto omówić i czego jeszcze nie wiemy. Wasze zapisy pozostają punktem odniesienia.</p></div>
      <CalendarDays size={48} aria-hidden />
    </header>
    {record.isDemo && <p className="notice">Przykładowy tydzień demonstracyjnego profilu. Dane są syntetyczne.</p>}
    {week.items.length > 0 ? <>
      <div className={styles.weekIntro}><Sparkles size={19} aria-hidden /><p>Wracamy do konkretnych szczegółów. Liczba zapisów nie określa nastroju, zdrowia ani osobowości zwierzaka.</p></div>
      <ol className={styles.timeline}>{week.items.slice(0, visibleCount).map(item => <li key={item.id}>
        <span className={styles.timelineDot} aria-hidden />
        <article><time dateTime={item.createdAt}>{date(item.createdAt)}</time><h3>{item.title}</h3><p>{item.text}</p>
          {item.evidence.length > 0 && <details><summary>Sprawdź podstawę zapisu</summary>{item.evidence.map(evidence => <div className={styles.evidence} key={evidence.id}><strong>{evidence.title}</strong><p>{evidence.excerpt}</p><small>{evidence.kind === "video" ? "Odwołanie do nagrania / adnotacja opiekuna" : "Relacja opiekuna"}</small></div>)}</details>}
          <button type="button" className="text-button" onClick={() => onDiscuss(`Porozmawiajmy o zapisie z ${date(item.createdAt)}: „${item.text.slice(0, 1000)}”. Co rzeczywiście wynika z moich obserwacji i czego jeszcze nie wiemy?`)}><MessageCircle size={15} />Porozmawiajmy o tym</button>
        </article>
      </li>)}</ol>
      {week.items.length > visibleCount && <button type="button" className="button secondary" onClick={() => setVisibleCount(count => count + 8)}>Pokaż kolejne zapisy ({visibleCount} z {week.items.length})</button>}
      <div className={styles.nextObservation}><h3>Jeden mały krok na kolejny tydzień</h3><p>Gdy pojawi się zwykła, spokojna sytuacja, zapisz: co było przed reakcją, co zrobił zwierzak i co nastąpiło później. Nie organizuj próby dla samego zapisu.</p><button className="button secondary" type="button" onClick={onNotes}><Heart size={17} />Dodaj własną obserwację</button></div>
    </> : <div className={styles.emptyWeek}><Heart size={34} aria-hidden /><h3>Każda historia ma swój rytm.</h3><p>{week.emptyMessage}</p><button type="button" className="button primary" onClick={onNotes}>Zapisz pierwszą chwilę</button></div>}
    <p className={styles.weekFootnote}>Podsumowanie powstaje lokalnie przy otwarciu tego widoku. Nie wysyłamy przypomnień ani nie dopowiadamy wydarzeń. Kontekst zdrowia znajdziesz osobno w obserwacjach.</p>
  </section>;
}
