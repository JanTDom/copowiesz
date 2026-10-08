"use client";

import { ArrowRight, Check, Heart } from "lucide-react";
import type { PetRecord } from "@/lib/types";
import { getFirstConversation } from "@/lib/engagement";
import { PetAvatar } from "./ui";
import styles from "./first-conversation.module.css";

export function FirstConversation({ record, onStart }: { record: PetRecord; onStart: () => void }) {
  const first = getFirstConversation(record);
  if (!first.ready || record.preferences?.firstConversationCelebratedAt) return null;
  return <section className={styles.finale} aria-labelledby="first-conversation-title">
    <div className={styles.portrait}><PetAvatar pet={record.pet} large /><Heart size={18} aria-hidden /></div>
    <div className={styles.copy}><span className="eyebrow"><Check size={14} aria-hidden />Pełny test i cztery konteksty zapisane</span><h2 id="first-conversation-title">To początek Waszej rozmowy.</h2><p>{first.welcome}</p>
      {first.evidence.length > 0 && <details><summary>Z jakich informacji korzystamy?</summary>{first.evidence.map(item => <div key={item.id}><strong>{item.title}</strong><p>{item.excerpt}</p><small>Relacja opiekuna{item.kind === "video" ? " powiązana z filmem" : ""}</small></div>)}</details>}
      <button type="button" className="button primary" onClick={onStart}>Rozpocznij naszą rozmowę<ArrowRight size={18} /></button>
      <p className={styles.limit}>Ukończenie przygotowania opisuje zakres materiału. Rozmowa jest cyfrową reprezentacją, a jej interpretacje nadal wymagają sprawdzenia.</p>
    </div>
  </section>;
}
