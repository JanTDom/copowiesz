import type { Workspace } from "./types";
import { validateWorkspace } from "./workspace-validation";

const DB_NAME = "copowiesz-local-v1";
export const emptyWorkspace: Workspace = { schemaVersion: 1, pets: [], activePetId: null };

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore("workspace");
      request.result.createObjectStore("clips");
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(new Error("Nie udało się otworzyć lokalnego zapisu. Sprawdź ustawienia przeglądarki."));
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

export function downloadBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function exportWorkspace(workspace: Workspace) {
  downloadBlob(new Blob([JSON.stringify(workspace, null, 2)], { type: "application/json" }), "copowiesz-profile.json");
}

export function parseWorkspace(text: string): Workspace {
  if (text.length > 8_000_000) throw new Error("Plik profilu jest zbyt duży.");
  let value: unknown;
  try { value = JSON.parse(text); } catch { throw new Error("Nieprawidłowy JSON pliku COPOWIESZ."); }
  return validateWorkspace(value);
}
