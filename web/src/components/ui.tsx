"use client";
import { useEffect, useRef } from "react";
import { Cat, Dog, X, ArrowRight } from "lucide-react";
import type { Pet } from "@/lib/types";

export function PetAvatar({ pet, large = false }: { pet: Pet; large?: boolean }) {
  return <span className={`pet-avatar ${large ? "large" : ""}`}>
    {pet.photo ? <img src={pet.photo} alt={pet.name} /> : pet.species === "cat" ? <Cat aria-hidden /> : <Dog aria-hidden />}
  </span>;
}
export function ViewHeading({ title, description, children }: { title: string; description?: string; children?: React.ReactNode }) {
  return <header className="view-heading"><div><h1>{title}</h1>{description && <p>{description}</p>}</div>{children}</header>;
}
export function EmptyState({ title, text, action, onAction }: { title: string; text: string; action?: string; onAction?: () => void }) {
  return <div className="empty-state"><img src="/brand/logo.png" alt="" /><h2>{title}</h2><p>{text}</p>{action && <button className="button primary" onClick={onAction}>{action}<ArrowRight size={18} /></button>}</div>;
}
export function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  const dialog=useRef<HTMLElement>(null);const close=useRef(onClose);close.current=onClose;
  useEffect(()=>{const previous=document.activeElement as HTMLElement|null;const overflow=document.body.style.overflow;document.body.style.overflow="hidden";if(!dialog.current?.contains(document.activeElement))dialog.current?.querySelector<HTMLElement>('input:not([type="file"]),button')?.focus();function key(event:KeyboardEvent){if(event.key==="Escape"){close.current();return;}if(event.key!=="Tab")return;const controls=dialog.current?.querySelectorAll<HTMLElement>('button:not([disabled]),input:not([disabled]),textarea,select,a[href],[tabindex="0"]');if(!controls?.length)return;const first=controls[0],last=controls[controls.length-1];if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}}document.addEventListener("keydown",key);return()=>{document.removeEventListener("keydown",key);document.body.style.overflow=overflow;previous?.focus();};},[]);
  return <div className="modal-backdrop" onClick={onClose}><section ref={dialog} className="modal" role="dialog" aria-modal="true" aria-label={title} onClick={e => e.stopPropagation()}>
    <header><h2>{title}</h2><button className="icon-button" aria-label="Zamknij" onClick={onClose}><X /></button></header>{children}
  </section></div>;
}
