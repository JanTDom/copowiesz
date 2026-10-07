import test from "node:test";
import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { POST as chat } from "../src/app/api/chat/route";
import { POST as analyze } from "../src/app/api/analyze/route";
import { GET as status } from "../src/app/api/status/route";
import { POST as setup } from "../src/app/api/setup/route";
import { createPetRecord, getQuestions, getTasks } from "../src/lib/domain";
import { getLocalModelConfig } from "../src/lib/server/ollama";
import { claimProviderCall, providerCaller } from "../src/lib/server/access";
import { assertSameOrigin, verifiedLocalBrowserRequest } from "../src/lib/server/http";
import { getGeminiConfig } from "../src/lib/server/gemini";
import type { Clip, PetRecord } from "../src/lib/types";

const now = "2026-10-07T12:00:00.000Z";
const fakeKey = "AIzaSyntheticFreeTierKeyForLocalTestsOnly";
const envKeys = ["GEMINI_API_KEY", "GEMINI_MODEL", "OLLAMA_MODEL", "OLLAMA_VISION_MODEL", "OLLAMA_BASE_URL", "VERCEL", "NODE_ENV", "NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "NEXT_PUBLIC_SUPABASE_ANON_KEY"];

async function isolated(run: () => Promise<void>) {
  const previous = Object.fromEntries(envKeys.map((key) => [key, process.env[key]]));
  const oldFetch = globalThis.fetch;
  for (const key of envKeys) delete process.env[key];
  try { await run(); } finally {
    globalThis.fetch = oldFetch;
    for (const key of envKeys) {
      if (previous[key] === undefined) delete process.env[key];
      else process.env[key] = previous[key];
    }
  }
}

function request(endpoint: string, payload: unknown, origin = "http://localhost:3000") {
  return new Request(`http://localhost:3000/api/${endpoint}`, { method: "POST", headers: { "Content-Type": "application/json", Origin: origin }, body: JSON.stringify(payload) });
}

function clip(record: PetRecord, taskId = "baseline"): Clip {
  return { id: `clip-${taskId}`, petId: record.pet.id, taskId, createdAt: now, durationSec: 10, width: 640, height: 480, mimeType: "video/webm", fileName: "synthetic.webm", status: "pending" };
}

function record(ready = false): PetRecord {
  const value = createPetRecord({ name: "Luna", species: "cat" });
  value.memories = [{ id: "m-play", text: "Luna najczęściej wybiera wędkę podczas znanej zabawy.", category: "preference", source: "owner_report", createdAt: now }];
  if (ready) {
    for (const question of getQuestions("cat")) value.answers[question.id] = { questionId: question.id, status: "unknown", updatedAt: now };
    value.clips = getTasks("cat").map((task) => ({ ...clip(value, task.id), status: "technical_only" }));
  }
  return value;
}

function generated(content: string, evidenceIds: string[] = ["m-play"]) {
  return Response.json({ candidates: [{ finishReason: "STOP", content: { parts: [{ text: JSON.stringify({ content, evidenceIds }) }] } }] });
}

function videoResult(summary = "Możliwy obrót głowy i zmiana pozycji w klipie", recommendedTaskId: string | null = "contact") {
  return Response.json({ candidates: [{ finishReason: "STOP", content: { parts: [{ text: JSON.stringify({ summary, observations: ["Możliwy obrót głowy — opis modelu do sprawdzenia"], limitations: ["Nie rozpoznano trwałej tendencji"], recommendedTaskId, nextTaskReason: "Inny naturalny kontekst pozwoli obserwować wybrany dystans." }) }] } }] });
}

function syntheticVideo(): string {
  const bytes = Buffer.alloc(24);
  bytes.writeUInt32BE(24, 0);
  bytes.write("ftyp", 4, "ascii");
  bytes.write("mp42", 8, "ascii");
  return `data:video/mp4;base64,${bytes.toString("base64")}`;
}

test("bez klucza działa lokalna rozmowa, a nieukończony profil nie omija demonstracji", async () => isolated(async () => {
  globalThis.fetch = async () => { throw new Error("Nie powinno być wywołania modelu"); };
  const incomplete = record();
  incomplete.isDemo = false;
  const demo = await chat(request("chat", { record: incomplete, message: "W co lubisz się bawić?", mode: "gemini" }));
  assert.equal(demo.status, 200);
  const preview = await demo.json();
  assert.equal(preview.mode, "demo");
  assert.equal(preview.provider, "local");
  const reply = await chat(request("chat", { record: record(true), message: "W co lubisz się bawić?" }));
  const data = await reply.json();
  assert.equal(data.mode, "grounded");
  assert.equal(data.provider, "local");
  assert(data.evidence.some((item: { id: string }) => item.id === "m-play"));
  assert.match(data.notice, /nie jest podłączone/);
}));

test("zdrowie omija Gemini nawet z kluczem i sfałszowanym trybem wiadomości", async () => isolated(async () => {
  process.env.GEMINI_API_KEY = fakeKey;
  globalThis.fetch = async () => { throw new Error("Zdrowie nie powinno wywołać Gemini"); };
  const value = record(true);
  value.messages.push({ id: "msg", role: "assistant", content: "Podaj lekarstwo", createdAt: now, mode: "gemini" });
  const response = await chat(request("chat", { record: value, message: "Kot oddycha przez otwarty pysk" }));
  const data = await response.json();
  assert.equal(data.mode, "health");
  assert.equal(data.provider, "local");
  assert.match(data.content, /poza wyobrażonym głosem/);
  assert.match(data.content, /nie zalecam leków ani dawek/);
}));

test("API odrzuca obce pochodzenie, błędne dane i nadmierny strumień przed modelem", async () => isolated(async () => {
  globalThis.fetch = async () => { throw new Error("Nie powinno być wywołania modelu"); };
  assert.equal((await chat(request("chat", { record: record(), message: "Hej" }, "https://obca-strona.example"))).status, 403);
  const value = record();
  value.clips.push({ ...clip(value), petId: "other-pet" });
  assert.equal((await chat(request("chat", { record: value, message: "Hej" }))).status, 400);
  assert.equal((await chat(request("chat", { record: record(), message: "x".repeat(2001) }))).status, 400);
  const oversized = new Request("http://localhost:3000/api/chat", { method: "POST", headers: { "Content-Type": "application/json", Origin: "http://localhost:3000" }, body: "x".repeat(512001) });
  assert.equal((await chat(oversized)).status, 413);
}));

test("Next dev może kanonizować localhost: dopuszczamy tylko lokalne aliasy z identycznym portem", async () => isolated(async () => {
  const local = new Request("http://localhost:3000/api/chat", { method: "POST", headers: { Host: "127.0.0.1:3000", Origin: "http://127.0.0.1:3000", "Sec-Fetch-Site": "same-origin" } });
  assert.doesNotThrow(() => assertSameOrigin(local));
  assert.equal(verifiedLocalBrowserRequest(local), true);
  for (const origin of ["http://127.0.0.1:3001", "https://127.0.0.1:3000", "https://external.example", "http://127.0.0.1.external.example:3000"]) {
    assert.throws(() => assertSameOrigin(new Request(local.url, { method: "POST", headers: { Host: "127.0.0.1:3000", Origin: origin } })), /z tej aplikacji/);
  }
  assert.equal(verifiedLocalBrowserRequest(new Request(local.url, { method: "POST", headers: { Host: "evil.example:3000", Origin: "http://127.0.0.1:3000" } })), false);
  Object.assign(process.env, { NODE_ENV: "production" });
  assert.throws(() => assertSameOrigin(local), /z tej aplikacji/);
  Reflect.deleteProperty(process.env, "NODE_ENV");
  process.env.VERCEL = "1";
  assert.throws(() => assertSameOrigin(local), /z tej aplikacji/);
}));

test("brak Origin w lokalnym browserze wymaga sprawdzonego Referer przy konfiguracji klucza", async () => isolated(async () => {
  const input = new Request("http://localhost:3000/api/setup", { method: "POST", headers: { Host: "127.0.0.1:3000", Referer: "http://127.0.0.1:3000/", "Sec-Fetch-Site": "same-origin" } });
  assert.doesNotThrow(() => assertSameOrigin(input));
  assert.equal(verifiedLocalBrowserRequest(input), true);
  assert.equal(verifiedLocalBrowserRequest(new Request(input.url, { method: "POST", headers: { "Sec-Fetch-Site": "same-origin" } })), false);
  const remote = new Request(input.url, { method: "POST", headers: { Referer: "https://external.example", "Sec-Fetch-Site": "cross-site" } });
  assert.throws(() => assertSameOrigin(remote), /z tej aplikacji/);
  assert.equal(verifiedLocalBrowserRequest(remote), false);
}));

test("klucz AQ z kropką jest traktowany jako niejawny ciąg znaków bez wymaganego prefiksu", async () => isolated(async () => {
  process.env.GEMINI_API_KEY = "AQ.SyntheticKeyForTests_1234567890";
  assert.notEqual(getGeminiConfig(), null);
  process.env.GEMINI_API_KEY = "AQ.Synthetic\nInjectedHeader: test";
  assert.equal(getGeminiConfig(), null);
}));

test("Gemini dostaje ograniczony kontekst bez zdjęcia i zwraca tylko istniejące dowody", async () => isolated(async () => {
  process.env.GEMINI_API_KEY = fakeKey;
  let calls = 0;
  globalThis.fetch = async (url, init) => {
    calls += 1;
    assert(!String(url).includes(fakeKey));
    assert.equal(new Headers(init?.headers).get("x-goog-api-key"), fakeKey);
    const sent = JSON.parse(String(init?.body));
    assert.equal(sent.generationConfig.responseMimeType, "application/json");
    const context = JSON.parse(sent.contents[0].parts[0].text);
    assert.equal(context.pet.photo, undefined);
    assert(context.suppliedEvidence.some((item: { id: string }) => item.id === "m-play"));
    return generated("Z Twoich obserwacji wynika, że najczęściej wybieram wędkę. Czy ostatnio nadal tak było?");
  };
  const value = record(true);
  value.pet.photo = "data:image/jpeg;base64,synthetic";
  const response = await chat(request("chat", { record: value, message: "Co lubisz robić?" }));
  const data = await response.json();
  assert.equal(calls, 1);
  assert.equal(data.mode, "gemini");
  assert.equal(data.provider, "gemini");
  assert.deepEqual(data.evidence.map((item: { id: string }) => item.id), ["m-play"]);
  assert(!JSON.stringify(data).includes(fakeKey));
}));

test("zmyślone cytowanie, wadliwy JSON i limit Gemini prowadzą do jawnej odpowiedzi lokalnej", async () => isolated(async () => {
  process.env.GEMINI_API_KEY = fakeKey;
  globalThis.fetch = async () => generated("Zawsze wybieram wędkę i bardzo ją lubię.", ["fabricated-source"]);
  const fabricated = await chat(request("chat", { record: record(true), message: "W co lubisz się bawić?" }));
  const first = await fabricated.json();
  assert.equal(first.mode, "grounded");
  assert.equal(first.provider, "local");
  assert(!JSON.stringify(first).includes("fabricated-source"));
  globalThis.fetch = async () => Response.json({ candidates: [{ finishReason: "STOP", content: { parts: [{ text: "nie JSON" }] } }] });
  assert.equal((await (await chat(request("chat", { record: record(true), message: "W co lubisz się bawić?" }))).json()).mode, "grounded");
  globalThis.fetch = async () => new Response("quota", { status: 429 });
  const quota = await (await chat(request("chat", { record: record(true), message: "W co lubisz się bawić?" }))).json();
  assert.equal(quota.mode, "grounded");
  assert.equal(quota.provider, "local");
  assert.match(quota.notice, /nie przełączamy na płatną/);
}));

test("Gemini w demonstracji zachowuje oznaczenie nawet gdy model je pominął", async () => isolated(async () => {
  process.env.GEMINI_API_KEY = fakeKey;
  globalThis.fetch = async () => generated("Zapisujesz, że wybieram wędkę podczas naszej znanej zabawy.");
  const response = await chat(request("chat", { record: record(), message: "W co lubisz się bawić?" }));
  const data = await response.json();
  assert.equal(data.mode, "demo");
  assert.equal(data.provider, "gemini");
  assert.match(data.content, /Demonstracja — profil w przygotowaniu/);
}));

test("bez modelu analiza pozostaje techniczna i proponuje kolejne bezpieczne zadanie", async () => isolated(async () => {
  const value = record();
  const response = await analyze(request("analyze", { record: value, clip: clip(value) }));
  const data = await response.json();
  assert.equal(data.analysis.source, "technical");
  assert.deepEqual(data.analysis.observations, []);
  assert.equal(data.analysis.needsReview, true);
  assert.match(data.analysis.summary, /nie jest podłączone/);
  assert.equal(data.nextTaskId, "name");
  const stopped = await (await analyze(request("analyze", { record: value, clip: { ...clip(value), status: "stopped" } }))).json();
  assert.match(stopped.analysis.summary, /bez wymuszania/);
  assert.equal(stopped.nextTaskId, "name");
}));

test("odrzucamy dowolne URL obrazów, nadmierną liczbę klatek i błędną chronologię", async () => isolated(async () => {
  const value = record();
  const frame = "data:image/jpeg;base64,/9j/2Q==";
  assert.equal((await analyze(request("analyze", { record: value, clip: clip(value), frames: ["https://internal.example/image.jpg"] }))).status, 400);
  assert.equal((await analyze(request("analyze", { record: value, clip: clip(value), frames: Array(7).fill(frame) }))).status, 400);
  assert.equal((await analyze(request("analyze", { record: value, clip: clip(value), frames: [frame, frame], frameTimes: [5, 1] }))).status, 400);
}));

test("lokalny model widzenia otrzymuje wszystkie uporządkowane klatki; wynik zawsze wymaga przeglądu", async () => isolated(async () => {
  process.env.OLLAMA_VISION_MODEL = "synthetic-vision-model";
  globalThis.fetch = async (url, init) => {
    assert.equal(String(url), "http://127.0.0.1:11434/api/chat");
    const body = JSON.parse(String(init?.body));
    assert.equal(body.messages[1].images.length, 3);
    assert.deepEqual(JSON.parse(body.messages[1].content).frameTimes, [0, 5, 9]);
    return Response.json({ message: { content: JSON.stringify({ source: "ollama", summary: "Możliwy obrót głowy w wybranych klatkach", observations: ["Możliwy obrót głowy; wynik modelu do przeglądu"], limitations: ["Nie ma ciągłego ruchu"], needsReview: false }) } });
  };
  const value = record();
  const frame = "data:image/jpeg;base64,/9j/2Q==";
  const response = await analyze(request("analyze", { record: value, clip: clip(value), frames: [frame, frame, frame], frameTimes: [0, 5, 9] }));
  const data = await response.json();
  assert.equal(data.analysis.source, "ollama");
  assert.equal(data.analysis.needsReview, true);
  assert.match(data.analysis.limitations[0], /Niezweryfikowany/);
}));

test("film i zdjęcia nie są wysyłane do Gemini bez wyraźnej zgody na analizę", async () => isolated(async () => {
  process.env.GEMINI_API_KEY = fakeKey;
  globalThis.fetch = async () => { throw new Error("Film nie może zostać wysłany bez zgody"); };
  const value = record();
  const response = await analyze(request("analyze", { record: value, clip: clip(value), videoData: syntheticVideo(), frames: ["data:image/jpeg;base64,/9j/2Q=="], geminiConsent: false }));
  const data = await response.json();
  assert.equal(data.analysis.source, "technical");
  assert.deepEqual(data.analysis.observations, []);
}));

test("Gemini analizuje cały inlinevideo po zgodzie i może wybrać inne przygotowane zadanie", async () => isolated(async () => {
  process.env.GEMINI_API_KEY = fakeKey;
  globalThis.fetch = async (url, init) => {
    assert(String(url).endsWith("models/gemini-3.1-flash-lite:generateContent"));
    assert(!String(url).includes(fakeKey));
    const data = JSON.parse(String(init?.body));
    const parts = data.contents[0].parts;
    assert.equal(parts[1].inlineData.mimeType, "video/mp4");
    assert.equal(parts[1].inlineData.data, syntheticVideo().split(",")[1]);
    assert(JSON.parse(parts[0].text).availableNextTasks.some((task: { id: string }) => task.id === "contact"));
    return videoResult();
  };
  const value = record();
  const response = await analyze(request("analyze", { record: value, clip: clip(value), videoData: syntheticVideo(), geminiConsent: true }));
  const data = await response.json();
  assert.equal(data.analysis.source, "gemini");
  assert.equal(data.analysis.needsReview, true);
  assert.match(data.analysis.limitations[0], /cały krótki klip/);
  assert.match(data.analysis.limitations[0], /może pominąć krótkie ruchy/);
  assert.equal(data.nextTaskId, "contact");
  assert(!JSON.stringify(data).includes(fakeKey));
}));

test("próbki klatek Gemini zachowują brak dźwięku i nie przedstawiają pełnej analizy filmu", async () => isolated(async () => {
  process.env.GEMINI_API_KEY = fakeKey;
  globalThis.fetch = async (_url, init) => {
    const parts = JSON.parse(String(init?.body)).contents[0].parts;
    assert.equal(parts.length, 3);
    assert.equal(parts[1].inlineData.mimeType, "image/jpeg");
    assert.match(JSON.parse(parts[0].text).input, /bez dźwięku/);
    return videoResult();
  };
  const value = record();
  const frame = "data:image/jpeg;base64,/9j/2Q==";
  const response = await analyze(request("analyze", { record: value, clip: clip(value), frames: [frame, frame], frameTimes: [1, 8], geminiConsent: true }));
  const data = await response.json();
  assert.equal(data.analysis.source, "gemini");
  assert.match(data.analysis.limitations[0], /tylko wybrane klatki bez dźwięku/);
}));

test("wadliwy lub medyczny wynik Gemini nie staje się obserwacją; nie wymuszamy ponownej próby", async () => isolated(async () => {
  process.env.GEMINI_API_KEY = fakeKey;
  const value = record();
  value.clips.push({ ...clip(value, "contact"), status: "stopped" });
  globalThis.fetch = async () => videoResult("Zwierzak ma nowotwór", "contact");
  const bad = await (await analyze(request("analyze", { record: value, clip: clip(value), videoData: syntheticVideo(), geminiConsent: true }))).json();
  assert.equal(bad.analysis.source, "technical");
  assert.deepEqual(bad.analysis.observations, []);
  assert.equal(bad.nextTaskId, "name");
  globalThis.fetch = async () => videoResult(undefined, "contact");
  const invalidTask = await (await analyze(request("analyze", { record: value, clip: clip(value), videoData: syntheticVideo(), geminiConsent: true }))).json();
  assert.equal(invalidTask.analysis.source, "gemini");
  assert.equal(invalidTask.nextTaskId, "name");
  globalThis.fetch = async () => new Response("quota", { status: 429 });
  const limited = await (await analyze(request("analyze", { record: value, clip: clip(value), videoData: syntheticVideo(), geminiConsent: true }))).json();
  assert.equal(limited.analysis.source, "technical");
  assert.match(limited.analysis.limitations[0], /Nie przełączamy na płatny/);
}));

test("inlinevideo przyjmuje tylko ograniczone dane mp4/webm, nigdy zewnętrzne adresy", async () => isolated(async () => {
  const value = record();
  for (const videoData of ["https://example.com/video.mp4", "data:video/mp4;base64,aGVsbG8=", "data:text/html;base64,/9j/2Q=="]) {
    assert.equal((await analyze(request("analyze", { record: value, clip: clip(value), videoData, geminiConsent: true }))).status, 400);
  }
}));

test("status nie ujawnia sekretów ani nie sprawdza klucza anonimowo na Vercel", async () => isolated(async () => {
  process.env.GEMINI_API_KEY = fakeKey;
  process.env.VERCEL = "1";
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://synthetic-project.supabase.co";
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "sb_publishable_synthetic_tests_only";
  process.env.OLLAMA_VISION_MODEL = "synthetic-vision-model";
  globalThis.fetch = async () => { throw new Error("Anonimowe wywołanie nie może sprawdzać klucza"); };
  const response = await status(new Request("https://copowiesz.example/api/status"));
  const data = await response.json();
  assert.equal(data.chat.configured, true);
  assert.equal(data.chat.available, null);
  assert.equal(data.chat.authenticationRequired, true);
  assert.equal(data.vision.available, null);
  assert.equal(data.vision.provider, "gemini");
  assert.equal(data.storage, "supabase_prepared");
  assert(!JSON.stringify(data).includes(fakeKey));
  assert(!JSON.stringify(data).includes(process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY));
  assert.equal(getLocalModelConfig("vision"), null);
  const unauthorized = await chat(new Request("https://copowiesz.example/api/chat", { method: "POST", headers: { "Content-Type": "application/json", Origin: "https://copowiesz.example" }, body: JSON.stringify({ record: record(true), message: "W co lubisz się bawić?" }) }));
  assert.equal(unauthorized.status, 401);
  const value = record();
  const unauthorizedVideo = await analyze(new Request("https://copowiesz.example/api/analyze", { method: "POST", headers: { "Content-Type": "application/json", Origin: "https://copowiesz.example" }, body: JSON.stringify({ record: value, clip: clip(value), videoData: syntheticVideo(), geminiConsent: true }) }));
  assert.equal(unauthorizedVideo.status, 401);
}));

test("Vercel sprawdza sesję kluczem publishable przed rozmową Gemini, także w demonstracji", async () => isolated(async () => {
  process.env.GEMINI_API_KEY = fakeKey;
  process.env.VERCEL = "1";
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://synthetic-project.supabase.co";
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "sb_publishable_synthetic_tests_only";
  const token = "Bearer synthetic.jwt.token-for-local-tests";
  const calls: string[] = [];
  globalThis.fetch = async (url, init) => {
    const endpoint = String(url);
    calls.push(endpoint);
    if (endpoint === "https://synthetic-project.supabase.co/auth/v1/user") {
      assert.equal(new Headers(init?.headers).get("apikey"), process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);
      assert.equal(new Headers(init?.headers).get("Authorization"), token);
      return Response.json({ id: "synthetic-user-id" });
    }
    assert.match(endpoint, /generativelanguage\.googleapis\.com\/v1beta\/models\/gemini-3\.1-flash-lite:generateContent$/);
    assert.equal(calls.length, 2);
    return generated("Zapisujesz, że wybieram wędkę podczas naszej znanej zabawy.");
  };
  const response = await chat(new Request("https://copowiesz.example/api/chat", { method: "POST", headers: { "Content-Type": "application/json", Origin: "https://copowiesz.example", Authorization: token }, body: JSON.stringify({ record: record(), message: "W co lubisz się bawić?" }) }));
  assert.equal(response.status, 200);
  const data = await response.json();
  assert.equal(data.mode, "demo");
  assert.equal(data.provider, "gemini");
  assert.equal(calls.length, 2);
  assert(!JSON.stringify(data).includes(fakeKey));
  assert(!JSON.stringify(data).includes(token));
}));

test("nieważna sesja Supabase zatrzymuje rozmowę przed wywołaniem Google", async () => isolated(async () => {
  process.env.GEMINI_API_KEY = fakeKey;
  process.env.VERCEL = "1";
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://synthetic-project.supabase.co";
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "sb_publishable_synthetic_tests_only";
  let calls = 0;
  globalThis.fetch = async (url) => {
    calls += 1;
    assert.equal(String(url), "https://synthetic-project.supabase.co/auth/v1/user");
    return Response.json({ message: "invalid jwt" }, { status: 401 });
  };
  const response = await chat(new Request("https://copowiesz.example/api/chat", { method: "POST", headers: { "Content-Type": "application/json", Origin: "https://copowiesz.example", Authorization: "Bearer synthetic.jwt.token-for-local-tests" }, body: JSON.stringify({ record: record(true), message: "W co lubisz się bawić?" }) }));
  assert.equal(response.status, 401);
  assert.equal(calls, 1);
}));

test("starszy anon key pozostaje obsługiwany, a publishable ma pierwszeństwo", async () => isolated(async () => {
  process.env.VERCEL = "1";
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://synthetic-project.supabase.co";
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "synthetic.legacy.anon.jwt-for-tests";
  const input = new Request("https://copowiesz.example/api/chat", { headers: { Authorization: "Bearer synthetic.jwt.token-for-local-tests" } });
  let expectedKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  globalThis.fetch = async (url, init) => {
    assert.equal(String(url), "https://synthetic-project.supabase.co/auth/v1/user");
    assert.equal(new Headers(init?.headers).get("apikey"), expectedKey);
    return Response.json({ id: "synthetic-user-id" });
  };
  const legacyCaller = await providerCaller(input);
  assert.match(legacyCaller, /^[a-f0-9]{64}$/);
  expectedKey = "sb_publishable_synthetic_tests_only";
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = ` ${expectedKey} `;
  assert.equal(await providerCaller(input), legacyCaller);
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = " ";
  expectedKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  assert.equal(await providerCaller(input), legacyCaller);
}));

test("connector lokalnego modelu odrzuca endpoint zewnętrzny i nie pobiera modeli", async () => isolated(async () => {
  process.env.OLLAMA_VISION_MODEL = "synthetic-vision-model";
  process.env.OLLAMA_BASE_URL = "https://external-service.example";
  assert.equal(getLocalModelConfig("vision"), null);
  process.env.OLLAMA_BASE_URL = "http://localhost:11434/redirect";
  assert.equal(getLocalModelConfig("vision"), null);
}));

test("lokalny limit blokuje nadmierne wywołania bez przełączania na płatną usługę", () => {
  const caller = crypto.randomUUID();
  for (let index = 0; index < 20; index += 1) claimProviderCall(caller);
  assert.throws(() => claimProviderCall(caller), /nie przełączamy na płatny/);
});

test("konfiguracja klucza działa tylko lokalnie, zachowuje inne ustawienia i nie odsyła klucza", async () => isolated(async () => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "copowiesz-api-"));
  const previousCwd = process.cwd();
  process.chdir(directory);
  try {
    const target = path.join(directory, ".env.local");
    await fs.writeFile(target, "# Konfiguracja syntetyczna\nKEEP_SETTING=example\nGEMINI_API_KEY=old-synthetic-key\n", { mode: 0o600 });
    globalThis.fetch = async () => Response.json({ name: "models/gemini-3.1-flash-lite" });
    const response = await setup(request("setup", { key: fakeKey, freeTier: true }));
    const result = await response.json();
    assert.equal(result.success, true);
    assert.equal(result.available, true);
    assert(!JSON.stringify(result).includes(fakeKey));
    const text = await fs.readFile(target, "utf8");
    assert.match(text, /KEEP_SETTING=example/);
    assert.equal(text.split("GEMINI_API_KEY=").length, 2);
    assert(text.includes(fakeKey));
    assert.equal((await fs.stat(target)).mode & 0o777, 0o600);
    const saved = text;
    assert.equal((await setup(request("setup", { key: "invalid\nNEW_KEY=bad", freeTier: true }))).status, 400);
    assert.equal((await setup(request("setup", { key: fakeKey, freeTier: false }))).status, 400);
    assert.equal((await setup(request("setup", { key: fakeKey, freeTier: true }, "https://external.example"))).status, 403);
    process.env.VERCEL = "1";
    assert.equal((await setup(request("setup", { key: fakeKey, freeTier: true }))).status, 404);
    delete process.env.VERCEL;
    Object.assign(process.env, { NODE_ENV: "production" });
    assert.equal((await setup(request("setup", { key: fakeKey, freeTier: true }))).status, 404);
    assert.equal(await fs.readFile(target, "utf8"), saved);
  } finally {
    process.chdir(previousCwd);
    await fs.rm(directory, { recursive: true, force: true });
  }
}));
