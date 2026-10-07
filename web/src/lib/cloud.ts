import type { SupabaseClient, User } from "@supabase/supabase-js";
import { getSupabase } from "./supabase";
import type { Workspace } from "./types";
import { validateCloudWorkspace, validateWorkspace } from "./workspace-validation";

const BUCKET = "copowiesz-clips";
const MAX_CLIP_BYTES = 50 * 1024 * 1024;
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function requiredClient(): SupabaseClient {
  const client = getSupabase();
  if (!client) throw new Error("Chmura nie jest skonfigurowana. Dane lokalne pozostają na tym urządzeniu.");
  return client;
}

async function authenticatedClient(): Promise<{ client: SupabaseClient; user: User }> {
  const client = requiredClient();
  // getUser sprawdza sesję z Auth; nie ufamy identyfikatorowi z payloadu użytkownika.
  const { data, error } = await client.auth.getUser();
  if (error || !data.user) throw new Error("Zaloguj się, aby korzystać z chmury.");
  return { client, user: data.user };
}

export async function signIn(email: string, password: string) {
  const { data, error } = await requiredClient().auth.signInWithPassword({ email: email.trim(), password });
  if (error) throw new Error("Nie udało się zalogować. Sprawdź dane i potwierdzenie adresu e-mail.");
  return data;
}

export async function signUp(email: string, password: string) {
  const { data, error } = await requiredClient().auth.signUp({ email: email.trim(), password, options: { emailRedirectTo: window.location.origin } });
  if (error) throw new Error("Nie udało się utworzyć konta. Sprawdź adres, siłę hasła i konfigurację poczty projektu.");
  return data;
}

export async function signOut(): Promise<void> {
  const { error } = await requiredClient().auth.signOut();
  if (error) throw new Error("Nie udało się wylogować z chmury. Spróbuj ponownie.");
}

export async function signInGuest() {
  const {data,error}=await requiredClient().auth.signInAnonymously();
  if(error||!data.user)throw new Error("Nie udało się rozpocząć sesji na tym urządzeniu. Sprawdź połączenie i spróbuj ponownie.");
  return data;
}

export async function guestSignInEnabled(): Promise<boolean> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!url || !key) return false;
  try {
    const response = await fetch(`${url}/auth/v1/settings`, { headers: { apikey: key }, cache: "no-store", signal: AbortSignal.timeout(5000) });
    if (!response.ok) return false;
    const settings = await response.json();
    return settings?.external?.anonymous_users === true;
  } catch { return false; }
}

export async function getCloudUser(): Promise<User | null> {
  const client = getSupabase();
  if (!client) return null;
  const { data, error } = await client.auth.getUser();
  return error ? null : data.user;
}

function assertUuid(value: string, label: string) {
  if (!uuidPattern.test(value)) throw new Error(`Nieprawidłowy identyfikator: ${label}.`);
}

export async function pushWorkspace(workspace: Workspace): Promise<void> {
  const checked = validateWorkspace(workspace);
  const { client, user } = await authenticatedClient();
  const records = checked.pets.filter((record) => !record.isDemo);
  if (records.length) {
    const { error } = await client.from("copowiesz_pets").upsert(records.map((record) => ({ owner_id: user.id, id: record.pet.id, schema_version: 1, payload: record })), { onConflict: "owner_id,id" });
    if (error) throw new Error("Nie udało się zapisać profili w chmurze. Sprawdź migrację, uprawnienia i dostępny limit. Dane lokalne pozostają zapisane.");
  }
  const active = records.some((record) => record.pet.id === checked.activePetId) ? checked.activePetId : records[0]?.pet.id ?? null;
  const { error } = await client.from("copowiesz_workspaces").upsert({ owner_id: user.id, schema_version: 1, active_pet_id: active }, { onConflict: "owner_id" });
  if (error) throw new Error("Profile zapisano, ale ustawienie aktywnego zwierzaka nie zostało zsynchronizowane. Możesz ponowić zapis.");
  // Zapis jest jawny i nie usuwa nieobecnych profili chmurowych. Usuwanie ma osobną funkcję.
}

export async function pullWorkspace(): Promise<Workspace | null> {
  const { client, user } = await authenticatedClient();
  const [{ data: pets, error: petsError }, { data: metadata, error: metadataError }] = await Promise.all([
    client.from("copowiesz_pets").select("id,schema_version,payload,updated_at").eq("owner_id", user.id).order("updated_at", { ascending: true }),
    client.from("copowiesz_workspaces").select("schema_version,active_pet_id").eq("owner_id", user.id).maybeSingle(),
  ]);
  if (petsError || metadataError) throw new Error("Nie udało się pobrać chmurowych danych. Dane lokalne pozostają dostępne.");
  return validateCloudWorkspace(pets, metadata);
}

export async function uploadClip(petId: string, clipId: string, blob: Blob): Promise<string> {
  assertUuid(petId, "zwierzak");
  assertUuid(clipId, "klip");
  if (blob.size === 0 || blob.size > MAX_CLIP_BYTES) throw new Error("Chmura przyjmuje niepuste klipy do 50 MiB. Zachowaj lokalną kopię i krótsze nagrania.");
  const mime = blob.type.split(";")[0].trim().toLowerCase();
  const extensions: Record<string, string> = { "video/webm": "webm", "video/mp4": "mp4", "video/quicktime": "mov" };
  const extension = extensions[mime];
  if (!extension) throw new Error("Ten format filmu nie jest obsługiwany przez chmurę. Użyj WebM, MP4 lub MOV.");
  const { client, user } = await authenticatedClient();
  const path = `${user.id}/${petId}/${clipId}.${extension}`;
  const { error: metadataError } = await client.from("copowiesz_clip_assets").upsert({ owner_id: user.id, pet_id: petId, clip_id: clipId, object_path: path, mime_type: mime, byte_size: blob.size }, { onConflict: "owner_id,pet_id,clip_id" });
  if (metadataError) throw new Error("Najpierw zapisz profil zwierzaka w chmurze. Nie udało się przygotować zapisu filmu.");
  const { error } = await client.storage.from(BUCKET).upload(path, blob, { upsert: true, contentType: mime, cacheControl: "60" });
  if (error) throw new Error("Film nie został przesłany. Zachowaj lokalny klip i ponów przesyłanie; nie powtarzaj reakcji zwierzaka.");
  return path;
}

export async function getClipUrl(path: string): Promise<string> {
  const { client, user } = await authenticatedClient();
  const parts = path.split("/");
  if (parts.length !== 3 || parts[0] !== user.id || !uuidPattern.test(parts[1]) || !/^[0-9a-f-]{36}\.(webm|mp4|mov)$/i.test(parts[2])) throw new Error("Nieprawidłowa ścieżka prywatnego filmu.");
  const { data, error } = await client.storage.from(BUCKET).createSignedUrl(path, 60);
  if (error || !data.signedUrl) throw new Error("Nie udało się otworzyć prywatnego filmu.");
  return data.signedUrl;
}

export async function deleteCloudPet(petId: string): Promise<void> {
  assertUuid(petId, "zwierzak");
  const { client, user } = await authenticatedClient();
  const prefix = `${user.id}/${petId}`;
  // Najpierw usuń bajty przez Storage API, dopiero potem wiersze. SQL DELETE storage.objects nie usuwa pliku.
  for (;;) {
    const { data: files, error: listError } = await client.storage.from(BUCKET).list(prefix, { limit: 100, offset: 0 });
    if (listError) throw new Error("Nie udało się sprawdzić filmów w chmurze. Profil nie został usunięty.");
    const paths = (files ?? []).filter((file) => file.id && /^[0-9a-f-]{36}\.(webm|mp4|mov)$/i.test(file.name)).map((file) => `${prefix}/${file.name}`);
    if (!paths.length) break;
    const { error } = await client.storage.from(BUCKET).remove(paths);
    if (error) throw new Error("Nie udało się usunąć wszystkich filmów. Profil pozostaje w chmurze; ponów usuwanie.");
  }
  const { error: metadataError } = await client.from("copowiesz_workspaces").update({ active_pet_id: null }).eq("owner_id", user.id).eq("active_pet_id", petId);
  if (metadataError) throw new Error("Filmy usunięto, ale nie udało się zaktualizować profilu. Ponów usuwanie.");
  const { error } = await client.from("copowiesz_pets").delete().eq("owner_id", user.id).eq("id", petId);
  if (error) throw new Error("Filmy usunięto, ale profil nie został usunięty. Ponów usuwanie.");
}
