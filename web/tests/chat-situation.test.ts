import test from "node:test";
import assert from "node:assert/strict";
import { POST } from "../src/app/api/chat/route";
import { createPetRecord, getQuestions, getTasks } from "../src/lib/domain";
import { apiRecord } from "../src/lib/client-api";
import { buildGroundedReply, isHealthQuestion } from "../src/lib/knowledge";
import type { PetRecord } from "../src/lib/types";

const now = "2026-10-08T11:00:00.000Z";
const envKeys = ["VERCEL", "GEMINI_API_KEY", "GEMINI_MODEL", "GEMINI_PUBLIC_BILLING_CONFIRMED", "NODE_ENV"];
async function isolated(run: () => Promise<void>) {
  const previous = Object.fromEntries(envKeys.map(key => [key, process.env[key]])); const oldFetch = globalThis.fetch;
  for (const key of envKeys) delete process.env[key];
  try { await run(); } finally { globalThis.fetch = oldFetch; for (const key of envKeys) { if (previous[key] === undefined) delete process.env[key]; else process.env[key] = previous[key]; } }
}
function record(ready = true): PetRecord {
  const pet = createPetRecord({name:"Figa",species:"dog"});
  if (ready) {
    for (const question of getQuestions("dog")) pet.answers[question.id] = {questionId:question.id,status:"unknown",updatedAt:now};
    pet.clips = getTasks("dog").map(task => ({id:`clip-${task.id}`,petId:pet.pet.id,taskId:task.id,createdAt:now,durationSec:10,width:640,height:480,mimeType:"video/webm",fileName:"synthetic.webm",status:"technical_only"}));
  }
  return pet;
}
function request(value: PetRecord, situation: unknown, origin = "http://localhost:3000") {
  return new Request("http://localhost:3000/api/chat",{method:"POST",headers:{"Content-Type":"application/json",Origin:origin},body:JSON.stringify({record:apiRecord(value),message:"Pomóż mi zrozumieć tę sytuację.",situation})});
}
const description = "Odsunął głowę, kiedy zbliżyłem rękę, po czym odszedł do legowiska.";

test("sytuacja: lokalna pomoc oddziela relację od interpretacji i nie udaje analizy filmu", async () => isolated(async () => {
  process.env.VERCEL="1"; process.env.GEMINI_API_KEY="AQ.syntheticKeyForBoundedLocalTestingOnly";
  globalThis.fetch = async () => { throw new Error("Zablokowany publiczny model nie może otrzymać sytuacji ani filmu"); };
  const pet=record(); pet.clips[0].analysis={source:"gemini",summary:"MODEL_UNREVIEWED_MARKER",observations:["MODEL_UNREVIEWED_MARKER"],limitations:[],needsReview:true};
  const response=await POST(request(pet,{description,context:"Wieczór, obok legowiska",clipId:pet.clips[0].id}));
  assert.equal(response.status,200); const result=await response.json();
  assert.equal(result.provider,"local"); assert.equal(result.mode,"grounded");
  assert.match(result.content,/Pomoc dla opiekuna/); assert.match(result.content,/Co działo się bezpośrednio przed/);
  assert.match(result.content,/nie został przeanalizowany/); assert.doesNotMatch(JSON.stringify(result),/MODEL_UNREVIEWED_MARKER/);
  assert.equal(result.evidence[0].kind,"owner_report"); assert.equal(result.evidence[0].id,"situation:owner");
  assert(result.evidence.some((item:{kind:string;excerpt:string})=>item.kind==="video"&&/Nie otrzymano filmu/.test(item.excerpt)));
}));

test("sytuacja: niepełny profil zachowuje oznaczenie demonstracji", async () => isolated(async () => {
  globalThis.fetch = async () => { throw new Error("Bez klucza nie wywołujemy modelu"); };
  const result=await (await POST(request(record(false),{description}))).json();
  assert.equal(result.mode,"demo"); assert.equal(result.provider,"local"); assert.match(result.content,/Demonstracja/);
}));

test("sytuacja: zdrowie w samym kontekście omija model i fikcyjny głos", async () => isolated(async () => {
  process.env.GEMINI_API_KEY="AQ.syntheticKeyForBoundedLocalTestingOnly";
  globalThis.fetch=async()=>{throw new Error("Zdrowie nie powinno wywołać Gemini");};
  const result=await (await POST(request(record(),{description,context:"Od rana nie je i wymiotuje."}))).json();
  assert.equal(result.mode,"health"); assert.equal(result.provider,"local"); assert.match(result.content,/Informacja dla opiekuna/);
  assert.match(result.content,/nie (zalecam|dobieram) leków ani dawek/i); assert.equal(result.evidence[0].id,"situation:owner");
}));

test("sytuacja: opis klinicznej rutyny pozostaje informacją dla opiekuna", async () => isolated(async () => {
  process.env.GEMINI_API_KEY="AQ.syntheticKeyForBoundedLocalTestingOnly";
  globalThis.fetch=async()=>{throw new Error("Opis zdrowia nie powinien wywołać Gemini");};
  for (const condition of ["cukrzyca", "insulina", "nowotwór", "padaczka", "dysplazja", "niewydolność nerek"]) {
    assert.equal(isHealthQuestion(`Codzienna rutyna: ${condition}.`),true);
    const response=await POST(request(record(),{description:`Rutyna opiekuna obejmuje stan: ${condition}.`,context:"Poranek, jak zwykle."}));
    assert.equal(response.status,200); const result=await response.json();
    assert.equal(result.mode,"health"); assert.equal(result.provider,"local");
    assert.match(result.content,/Informacja dla opiekuna/); assert.equal(result.evidence[0].id,"situation:owner");
    assert.doesNotMatch(result.content,/Jako cyfrowa reprezentacja/);
  }
}));

test("rozmowa: kliniczny zapis w kategorii rutyna nie staje się preferencją ani dowodem modelu", async () => isolated(async () => {
  const pet=record();
  pet.memories=[{id:"routine-clinical",text:"CLINICAL_ROUTINE_MARKER: spacer, cukrzyca i insulina w codziennej rutynie.",category:"routine",source:"owner_report",createdAt:now}];
  assert.doesNotMatch(JSON.stringify(buildGroundedReply(pet,"Co lubisz podczas spaceru?")),/CLINICAL_ROUTINE_MARKER|routine-clinical/);
  process.env.GEMINI_API_KEY="AQ.syntheticKeyForBoundedLocalTestingOnly";
  let sent: unknown;
  globalThis.fetch=async(_url,init)=>{
    const body=JSON.parse(String(init?.body)); sent=JSON.parse(body.contents[0].parts[0].text);
    return Response.json({candidates:[{finishReason:"STOP",content:{parts:[{text:JSON.stringify({content:"Jeszcze nie mamy zapisu moich preferencji na spacerze. Co zwykle wybieram?",evidenceIds:[]})}]}}]});
  };
  const response=await POST(new Request("http://localhost:3000/api/chat",{method:"POST",headers:{"Content-Type":"application/json",Origin:"http://localhost:3000"},body:JSON.stringify({record:apiRecord(pet),message:"Co lubisz podczas spaceru?"})}));
  assert.equal(response.status,200); assert.equal((await response.json()).provider,"gemini");
  assert.doesNotMatch(JSON.stringify(sent),/CLINICAL_ROUTINE_MARKER|routine-clinical/);
}));

test("sytuacja: limity, obce pola, niedostępne klipy i obce Origin odrzucane przed modelem", async () => isolated(async () => {
  globalThis.fetch=async()=>{throw new Error("Walidacja musi nastąpić przed modelem");};
  const pet=record();
  for (const invalid of [{description:" "},{description:"x".repeat(1501)},{description,context:"x".repeat(501)},{description,clipId:"foreign-clip"},{description,videoData:"data:video/mp4;base64,AA=="}]) assert.equal((await POST(request(pet,invalid))).status,400);
  pet.clips[0].status="stopped";
  assert.equal((await POST(request(pet,{description,clipId:pet.clips[0].id}))).status,400);
  assert.equal((await POST(request(record(),{description},"https://foreign.example"))).status,403);
}));

test("sytuacja: Gemini dostaje osobną relację i metadane, bez bajtów filmu lub albumu", async () => isolated(async () => {
  process.env.GEMINI_API_KEY="AQ.syntheticKeyForBoundedLocalTestingOnly";
  const pet=record(); pet.moments=[{id:"private-moment",title:"PRIVATE_ALBUM_MARKER",caption:"PRIVATE_ALBUM_MARKER",createdAt:now,occurredAt:now}];
  pet.messages=[{id:"old",role:"user",content:"Poprzednia rozmowa",createdAt:now,situation:{description:"PRIVATE_OLD_SITUATION_MARKER"}}];
  let sent: unknown;
  globalThis.fetch=async(_url,init)=>{
    const body=JSON.parse(String(init?.body)); sent=JSON.parse(body.contents[0].parts[0].text);
    return Response.json({candidates:[{finishReason:"STOP",content:{parts:[{text:JSON.stringify({content:"Opis opiekuna mówi o zmianie dystansu. Nie znamy przyczyny; pozwól zwierzakowi odejść. Co było bezpośrednio przed?",evidenceIds:["situation:owner"]})}]}}]});
  };
  const result=await (await POST(request(pet,{description,clipId:pet.clips[0].id}))).json();
  assert.equal(result.provider,"gemini"); assert.match(result.content,/Pomoc dla opiekuna/);
  const context=sent as {currentSituation:{provenance:string;clipReference:{mediaReceived:boolean}}};
  assert.equal(context.currentSituation.provenance,"owner_report"); assert.equal(context.currentSituation.clipReference.mediaReceived,false);
  assert.doesNotMatch(JSON.stringify(sent),/PRIVATE_ALBUM_MARKER|PRIVATE_OLD_SITUATION_MARKER|data:video|inlineData/);
}));

test("sytuacja: model bez źródła opisu nie może zastąpić odpowiedzi z jawną podstawą", async () => isolated(async () => {
  process.env.GEMINI_API_KEY="AQ.syntheticKeyForBoundedLocalTestingOnly";
  globalThis.fetch=async()=>Response.json({candidates:[{finishReason:"STOP",content:{parts:[{text:JSON.stringify({content:"To tylko możliwa interpretacja, której nie potwierdzają dotychczasowe informacje.",evidenceIds:[]})}]}}]});
  const result=await (await POST(request(record(),{description}))).json();
  assert.equal(result.provider,"local"); assert.match(result.notice,/wymagała sprawdzenia/); assert.equal(result.evidence[0].id,"situation:owner");
}));

test("rozmowa: poprawny profil z pełnymi notatkami Unicode mieści się w ograniczeniu 2 MiB", async () => isolated(async () => {
  globalThis.fetch=async()=>{throw new Error("Regresja rozmiaru nie powinna wywołać modelu");};
  const pet=record();
  for (const answer of Object.values(pet.answers)) answer.note="ż".repeat(2000);
  pet.memories=Array.from({length:60},(_,index)=>({id:`unicode-memory-${index}`,text:"ż".repeat(2000),category:"routine" as const,source:"owner_report" as const,createdAt:now}));
  const baseline=pet.clips[0];
  pet.clips=[...pet.clips,...Array.from({length:196},(_,index)=>({...baseline,id:`unicode-clip-${index}`}))].map(clip=>({...clip,fileName:"ż".repeat(255)}));
  const input=request(pet,{description,clipId:pet.clips[0].id});
  const bytes=Buffer.byteLength(await input.clone().text());
  assert(bytes>512000); assert(bytes<2*1024*1024);
  const response=await POST(input); assert.equal(response.status,200);
  const result=await response.json(); assert.equal(result.provider,"local");
  assert.equal(result.evidence[0].id,"situation:owner"); assert.match(result.content,/Pomoc dla opiekuna/);
}));

test("rozmowa: rzeczywisty strumień powyżej 2 MiB jest odrzucany przed parsowaniem i modelem", async () => isolated(async () => {
  globalThis.fetch=async()=>{throw new Error("Za duży strumień nie powinien wywołać modelu");};
  const prefix=JSON.stringify({record:apiRecord(record()),message:"Hej"});
  const encoder=new TextEncoder();
  const oversized=new Request("http://localhost:3000/api/chat",{
    method:"POST",headers:{"Content-Type":"application/json",Origin:"http://localhost:3000"},duplex:"half",
    body:new ReadableStream({start(controller){controller.enqueue(encoder.encode(prefix));controller.enqueue(encoder.encode(" ".repeat(2*1024*1024)));controller.close();}}),
  } as RequestInit & {duplex:"half"});
  const response=await POST(oversized); assert.equal(response.status,413);
}));
