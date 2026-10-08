import type { Workspace } from "./types";
import { validateWorkspace } from "./workspace-validation";

const DB_NAME = "copowiesz-local-v1";
export const emptyWorkspace: Workspace = { schemaVersion: 1, pets: [], activePetId: null };

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    let blocked = false;
    const request = indexedDB.open(DB_NAME, 2);
    request.onupgradeneeded = () => {
      for (const name of ["workspace", "clips", "photos"]) if (!request.result.objectStoreNames.contains(name)) request.result.createObjectStore(name);
    };
    request.onsuccess = () => { if (blocked) request.result.close(); else resolve(request.result); };
    request.onerror = () => reject(new Error("Nie udało się otworzyć lokalnego zapisu. Sprawdź ustawienia przeglądarki."));
    request.onblocked = () => { blocked = true; reject(new Error("Zamknij pozostałe karty COPOWIESZ, aby zaktualizować lokalny zapis zdjęć.")); };
  });
}

async function read<T>(store: string, key: string): Promise<T | undefined> {
  const db = await openDb();
  try {
    return await new Promise<T | undefined>((resolve, reject) => {
      const request = db.transaction(store, "readonly").objectStore(store).get(key);
      request.onsuccess = () => resolve(request.result as T | undefined);
      request.onerror = () => reject(request.error);
    });
  } finally { db.close(); }
}

async function mutate(store: string, action: (s: IDBObjectStore) => void): Promise<void> {
  const db = await openDb();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(store, "readwrite");
      action(tx.objectStore(store));
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(new Error("Nie udało się zapisać danych. Sprawdź wolne miejsce i wyeksportuj profil."));
      tx.onabort = () => reject(tx.error);
    });
  } finally { db.close(); }
}

export const loadWorkspace = async () => {
  const value = await read<unknown>("workspace", "current");
  return value === undefined ? structuredClone(emptyWorkspace) : validateWorkspace(value);
};
export const saveWorkspace = (workspace: Workspace) => {
  const validated = validateWorkspace(workspace);
  return mutate("workspace", s => { s.put(validated, "current"); });
};
export const saveClipBlob = (id: string, blob: Blob) => mutate("clips", s => { s.put(blob, id); });
export const loadClipBlob = (id: string) => read<Blob>("clips", id);
export const deleteClipBlob = (id: string) => mutate("clips", s => { s.delete(id); });

function photoKey(id: string): string {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) throw new Error("Nieprawidłowy identyfikator zdjęcia.");
  return id.toLowerCase();
}
export const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
export async function validatePhotoBlob(blob: Blob): Promise<void> {
  if (!(blob instanceof Blob) || blob.size === 0 || blob.size > MAX_PHOTO_BYTES || !["image/jpeg", "image/png", "image/webp"].includes(blob.type)) {
    throw new Error("Wybierz zdjęcie JPEG, PNG lub WebP o rozmiarze do 5 MiB.");
  }
  const prefix = new Uint8Array(await blob.slice(0, 12).arrayBuffer());
  const last = new Uint8Array(await blob.slice(-2).arrayBuffer());
  const text = new TextDecoder("latin1").decode(prefix);
  const valid = blob.type === "image/jpeg" ? blob.size >= 4 && prefix[0] === 255 && prefix[1] === 216 && last[0] === 255 && last[1] === 217
    : blob.type === "image/png" ? [137,80,78,71,13,10,26,10].every((byte,index) => prefix[index] === byte)
      : blob.size >= 12 && text.startsWith("RIFF") && text.slice(8,12) === "WEBP";
  if (!valid) throw new Error("Zawartość pliku nie pasuje do formatu zdjęcia.");
}
export async function savePhotoBlob(id: string, blob: Blob): Promise<void> {
  const key = photoKey(id); await validatePhotoBlob(blob);
  return mutate("photos", store => { store.put(blob, key); });
}
export const loadPhotoBlob = (id: string) => read<Blob>("photos", photoKey(id));
export const deletePhotoBlob = (id: string) => mutate("photos", store => { store.delete(photoKey(id)); });

export function downloadBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function exportWorkspace(workspace: Workspace) {
  // Legacy avatar remains in the owner's explicit copy. New album/video bytes are separate downloads.
  downloadBlob(new Blob([JSON.stringify(validateWorkspace(workspace), null, 2)], { type: "application/json" }), "copowiesz-profile.json");
}

export function parseWorkspace(text: string): Workspace {
  if (text.length > 8_000_000) throw new Error("Plik profilu jest zbyt duży.");
  let value: unknown;
  try { value = JSON.parse(text); } catch { throw new Error("Nieprawidłowy JSON pliku COPOWIESZ."); }
  return validateWorkspace(value);
}
