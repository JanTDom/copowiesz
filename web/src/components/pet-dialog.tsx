"use client";
import Image from "next/image";
import { useState } from "react";
import { Cat, Dog, ArrowRight, ImagePlus } from "lucide-react";
import { createPetRecord } from "@/lib/domain";
import type { PetRecord, Species } from "@/lib/types";
import { Modal } from "./ui";

export function PetDialog({ onClose, onCreate }: { onClose: () => void; onCreate: (record: PetRecord) => void }) {
  const [species, setSpecies] = useState<Species>("dog");
  const [name, setName] = useState(""); const [age, setAge] = useState(""); const [photo, setPhoto] = useState<string>(); const [error, setError] = useState("");
  async function addPhoto(file?: File) {
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 2_000_000) { setError("Wybierz zdjęcie JPG, PNG lub WebP, do 2 MB."); return; }
    const reader = new FileReader(); reader.onload = () => { setPhoto(String(reader.result)); setError(""); }; reader.readAsDataURL(file);
  }
  return <Modal title="Poznajmy Twojego zwierzaka" onClose={onClose}>
    <Image className="dialog-photo" src="/images/pet-pair.png" alt="Pies i kot — ilustracja wspólnej historii" width={700} height={280} />
    <p className="muted">Zaczynamy od imienia. Potem poznajemy całą historię.</p>
    <form onSubmit={e => { e.preventDefault(); if (!name.trim()) return; onCreate(createPetRecord({name:name.trim(),species,ageMonths:age ? Number(age) : undefined,photo})); }}>
      <div className="species-choice"><button type="button" aria-pressed={species === "dog"} className={species === "dog" ? "selected" : ""} onClick={() => setSpecies("dog")}><Dog />Mój pies</button><button type="button" aria-pressed={species === "cat"} className={species === "cat" ? "selected" : ""} onClick={() => setSpecies("cat")}><Cat />Mój kot</button></div>
      <label className="field">Jak ma na imię?<input autoFocus required maxLength={60} value={name} onChange={e => setName(e.target.value)} placeholder="Imię Twojego zwierzaka" /></label>
      <label className="field">Wiek w miesiącach <span>(jeśli wiesz)</span><input type="number" min="0" max="600" value={age} onChange={e => setAge(e.target.value)} placeholder="Możesz uzupełnić później" /></label>
      <label className="upload-photo"><ImagePlus size={20} />{photo ? "Zdjęcie dodane — zmień" : "Dodaj jego zdjęcie (opcjonalnie)"}<input type="file" accept="image/jpeg,image/png,image/webp" onChange={e => addPhoto(e.target.files?.[0])} /></label>
      {error && <p className="error" role="alert">{error}</p>}
      <button className="button primary full" type="submit">Zacznijmy poznawanie <ArrowRight size={18} /></button>
    </form>
  </Modal>;
}
