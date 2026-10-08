import { getShareableFacts } from "./engagement";
import type { Evidence, PetRecord, Species } from "./types";

export const MAX_CARD_FACTS = 3;
export const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
export const SHARE_CARD_WIDTH = 1080;
export const SHARE_CARD_HEIGHT = 1350;

export interface ShareCardModel {
  name: string;
  species: Species;
  isDemo: boolean;
  facts: { id: string; title: string; text: string }[];
  attribution: string;
}

export function cardText(value: string, maxLength: number): string {
  const text = value.replace(/[\u0000-\u001f\u007f\u202a-\u202e\u2066-\u2069]/g, " ").replace(/\s+/g, " ").trim();
  const characters = Array.from(text);
  return characters.length <= maxLength ? text : `${characters.slice(0, Math.max(0, maxLength - 1)).join("").trimEnd()}…`;
}

export function selectedCardFacts(available: Evidence[], selectedIds: string[]): ShareCardModel["facts"] {
  const seen = new Set<string>();
  const facts: ShareCardModel["facts"] = [];
  for (const id of selectedIds) {
    if (seen.has(id)) continue;
    seen.add(id);
    const fact = available.find((item) => item.id === id && item.kind === "owner_report");
    if (!fact?.excerpt.trim()) continue;
    facts.push({ id, title: cardText(fact.title, 65), text: cardText(fact.excerpt, 155) });
    if (facts.length === MAX_CARD_FACTS) break;
  }
  return facts;
}

export function buildShareCardModel(record: PetRecord, selectedIds: string[]): ShareCardModel {
  return {
    name: cardText(record.pet.name, 50),
    species: record.pet.species,
    isDemo: !!record.isDemo,
    facts: record.isDemo ? [] : selectedCardFacts(getShareableFacts(record), selectedIds),
    attribution: record.isDemo ? "Demonstracja · dane syntetyczne" : "Z relacji opiekuna · cyfrowa reprezentacja",
  };
}

export function validatePhotoFile(file: Pick<Blob, "size" | "type">): void {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type.toLowerCase())) throw new Error("Wybierz zdjęcie JPEG, PNG lub WebP. Inne formaty, w tym SVG, nie są obsługiwane.");
  if (!file.size) throw new Error("Zdjęcie jest puste. Wybierz inny plik.");
  if (file.size > MAX_PHOTO_BYTES) throw new Error("Wybierz zdjęcie do 5 MiB. Większy plik zmniejsz na swoim urządzeniu.");
}

export function localPhotoSource(value?: string): string | undefined {
  if (!value) return undefined;
  return /^data:image\/(jpeg|png|webp);base64,[a-z\d+/=\s]+$/i.test(value) || value.startsWith("blob:") ? value : undefined;
}

export function shareCardFileName(name: string): string {
  const clean = cardText(name, 50).replace(/[^\p{L}\p{N}_-]/gu, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
  return `copowiesz-${clean || "zwierzak"}.png`;
}

/** Wraps the actual export text. The preview uses the same shortened content. */
export function wrapCardText(text: string, measure: (value: string) => number, maxWidth: number, maxLines: number): string[] {
  if (maxWidth <= 0 || maxLines <= 0 || !text.trim()) return [];
  const lines: string[] = [];
  let current = "";
  for (let word of text.trim().split(/\s+/)) {
    const candidate = current ? `${current} ${word}` : word;
    if (measure(candidate) <= maxWidth) { current = candidate; continue; }
    if (current) { lines.push(current); current = ""; }
    while (measure(word) > maxWidth) {
      const characters = Array.from(word);
      let length = 1;
      while (length < characters.length && measure(characters.slice(0, length + 1).join("")) <= maxWidth) length += 1;
      lines.push(characters.slice(0, length).join(""));
      word = characters.slice(length).join("");
    }
    current = word;
  }
  if (current) lines.push(current.trimEnd());
  if (lines.length <= maxLines) return lines;
  const shortened = lines.slice(0, maxLines);
  let last = shortened[maxLines - 1];
  while (last && measure(`${last}…`) > maxWidth) last = Array.from(last).slice(0, -1).join("").trimEnd();
  shortened[maxLines - 1] = `${last}…`;
  return shortened;
}

function loadImage(source: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Nie udało się odczytać zdjęcia. Wybierz inne lub przygotuj kartę bez zdjęcia."));
    image.src = source;
  });
}

/** Re-encodes pixels locally: the generated card does not copy the photo's EXIF metadata. */
export async function prepareAlbumPhoto(file: File): Promise<Blob> {
  validatePhotoFile(file);
  const source = URL.createObjectURL(file);
  try {
    const image = await loadImage(source);
    if (!image.naturalWidth || !image.naturalHeight || image.naturalWidth * image.naturalHeight > 50_000_000) throw new Error("Zdjęcie ma zbyt duże wymiary lub nie da się go odczytać. Zmniejsz je na urządzeniu.");
    const scale = Math.min(1, 2400 / Math.max(image.naturalWidth, image.naturalHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale)); canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Przeglądarka nie pozwala przygotować zdjęcia.");
    context.fillStyle = "#141d2c"; context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob((value) => value ? resolve(value) : reject(new Error("Nie udało się przygotować zdjęcia.")), "image/jpeg", 0.9));
    validatePhotoFile(blob);
    return blob;
  } finally { URL.revokeObjectURL(source); }
}

export async function renderShareCard(model: ShareCardModel, photoSource?: string): Promise<Blob> {
  const safeSource = localPhotoSource(photoSource);
  if (photoSource && !safeSource) throw new Error("Karta korzysta wyłącznie ze zdjęcia wybranego na tym urządzeniu.");
  const [logo, photo] = await Promise.all([loadImage("/brand/logo.png"), safeSource ? loadImage(safeSource) : Promise.resolve(null)]);
  if (document.fonts) await Promise.all([document.fonts.load('600 32px "Manrope Variable"'), document.fonts.load('64px "DM Serif Display"')]);
  const canvas = document.createElement("canvas");
  canvas.width = SHARE_CARD_WIDTH; canvas.height = SHARE_CARD_HEIGHT;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Ta przeglądarka nie pozwala utworzyć karty. Spróbuj w innej przeglądarce.");
  const ctx = context;
  ctx.fillStyle = "#0c1220"; ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = "#665840"; ctx.lineWidth = 2; ctx.strokeRect(25, 25, 1030, 1300);
  ctx.drawImage(logo, 64, 51, 82, 82);
  ctx.fillStyle = "#f6f2e9"; ctx.font = '48px "DM Serif Display", Georgia, serif'; ctx.fillText("copowiesz", 162, 107);
  ctx.fillStyle = "#edc78c"; ctx.font = '600 23px "Manrope Variable", sans-serif'; ctx.textAlign = "right";
  ctx.fillText(model.isDemo ? "DEMONSTRACJA" : "NASZA MAŁA HISTORIA", 1016, 99); ctx.textAlign = "left";
  const photoX = 64, photoY = 165, photoWidth = 952, photoHeight = 475;
  ctx.save(); ctx.beginPath(); ctx.roundRect(photoX, photoY, photoWidth, photoHeight, 24); ctx.clip();
  if (photo) {
    const scale = Math.max(photoWidth / photo.naturalWidth, photoHeight / photo.naturalHeight);
    const width = photo.naturalWidth * scale, height = photo.naturalHeight * scale;
    ctx.drawImage(photo, photoX + (photoWidth - width) / 2, photoY + (photoHeight - height) / 2, width, height);
  } else {
    const gradient = ctx.createLinearGradient(photoX, photoY, photoX + photoWidth, photoY + photoHeight);
    gradient.addColorStop(0, "#243047"); gradient.addColorStop(1, "#111b2c"); ctx.fillStyle = gradient; ctx.fillRect(photoX, photoY, photoWidth, photoHeight);
    ctx.drawImage(logo, 404, 264, 272, 272);
  }
  ctx.restore();
  ctx.fillStyle = "#edc78c"; ctx.font = '600 24px "Manrope Variable", sans-serif';
  ctx.fillText(model.isDemo ? "PRZYKŁADOWY PROFIL · DANE SYNTETYCZNE" : `${model.species === "dog" ? "PIES" : "KOT"} · ZAPISANE PRZEZ OPIEKUNA`, 64, 691);
  ctx.fillStyle = "#f6f2e9"; ctx.font = '72px "DM Serif Display", Georgia, serif';
  const name = wrapCardText(model.name, (text) => ctx.measureText(text).width, 940, 1)[0] ?? "Mój zwierzak";
  ctx.fillText(name, 64, 776);
  ctx.font = '500 27px "Manrope Variable", sans-serif'; ctx.fillStyle = "#a6b2c7";
  ctx.fillText("Każdy ma swoje małe zwyczaje.", 64, 825);
  if (!model.facts.length) {
    ctx.font = '44px "DM Serif Display", Georgia, serif'; ctx.fillStyle = "#edc78c";
    ctx.fillText("Poznajemy się. Po polsku.", 64, 972);
  }
  model.facts.forEach((fact, index) => {
    const y = 879 + index * 111;
    ctx.fillStyle = "#edc78c"; ctx.font = '600 22px "Manrope Variable", sans-serif';
    ctx.fillText(`${String(index + 1).padStart(2, "0")}  ${wrapCardText(fact.title, (text) => ctx.measureText(text).width, 870, 1)[0] ?? "Z relacji opiekuna"}`, 64, y);
    ctx.fillStyle = "#f6f2e9"; ctx.font = '500 26px "Manrope Variable", sans-serif';
    wrapCardText(fact.text, (text) => ctx.measureText(text).width, 930, 2).forEach((line, lineIndex) => ctx.fillText(line, 64, y + 37 + lineIndex * 31));
  });
  ctx.strokeStyle = "#29354a"; ctx.beginPath(); ctx.moveTo(64, 1238); ctx.lineTo(1016, 1238); ctx.stroke();
  ctx.fillStyle = "#a6b2c7"; ctx.font = '500 21px "Manrope Variable", sans-serif'; ctx.fillText(model.attribution, 64, 1282);
  ctx.fillStyle = "#edc78c"; ctx.textAlign = "right"; ctx.fillText("copowiesz.pl", 1016, 1282);
  return new Promise<Blob>((resolve, reject) => canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("Nie udało się zapisać obrazu karty.")), "image/png"));
}
