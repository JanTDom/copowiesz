import test from "node:test";
import assert from "node:assert/strict";
import { createDemoRecord, createPetRecord, getQuestions, getReadiness, getTasks } from "../src/lib/domain";
import { getConversationTopics, getFirstConversation, getShareableFacts, getWeeklySummary } from "../src/lib/engagement";
import { apiRecord } from "../src/lib/client-api";
import { chatRequestSchema } from "../src/lib/server/validation";
import { MAX_PHOTO_BYTES, parseWorkspace, validatePhotoBlob } from "../src/lib/local-store";
import type { PetRecord, Moment, Workspace } from "../src/lib/types";

const now = "2026-10-08T12:00:00.000Z";
const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aT1sAAAAASUVORK5CYII=", "base64");
function fixture(): PetRecord {
  const record = createPetRecord({ name: "Syntetyczna Luna", species: "cat" });
  record.memories = [{ id: crypto.randomUUID(), text: "Na odpoczynek wybiera parapet.", category: "routine", source: "owner_report", createdAt: now }];
  record.clips = [{id:crypto.randomUUID(),petId:record.pet.id,taskId:"baseline",createdAt:now,durationSec:3,width:640,height:480,mimeType:"video/webm",fileName:"synthetic.webm",status:"technical_only"}];
  record.moments = [{id:crypto.randomUUID(),title:"Spokojne popołudnie",caption:"Opiekun opisał odpoczynek na parapecie.",occurredAt:now,createdAt:now,photoId:crypto.randomUUID(),clipId:record.clips[0].id}];
  record.preferences = {firstConversationCelebratedAt:now};
  record.messages = [{id:crypto.randomUUID(),role:"user",content:"Co wydarzyło się w tej sytuacji?",createdAt:now,situation:{description:"Usiadła na parapecie.",context:"Po zabawie",clipId:record.clips[0].id}}];
  return record;
}
function roundtrip(record: PetRecord): PetRecord {
  return parseWorkspace(JSON.stringify({schemaVersion:1,pets:[record],activePetId:record.pet.id})).pets[0];
}

test("nowe metadane są zgodne ze schemaVersion1 i starym profilem, bez bajtów albumu", () => {
  const input=fixture(); const restored=roundtrip(input);
  assert.deepEqual(restored.moments,input.moments); assert.deepEqual(restored.preferences,input.preferences); assert.deepEqual(restored.messages[0].situation,input.messages[0].situation);
  const old=createPetRecord({name:"Borys",species:"dog"}); assert.equal(roundtrip(old).moments,undefined);
  Object.assign(input.moments![0],{photoBytes:"synthetic-photo-bytes",blobUrl:"blob:foreign"});
  assert.equal(JSON.stringify(roundtrip(input)).includes("synthetic-photo-bytes"),false);
});

test("album i sytuacje odrzucają obce, puste, przerwane i pominięte nagrania", () => {
  for (const mutate of [
    (r:PetRecord)=>{r.moments![0].clipId=crypto.randomUUID();},
    (r:PetRecord)=>{r.messages[0].situation!.clipId=crypto.randomUUID();},
    (r:PetRecord)=>{r.clips[0].status="stopped";},(r:PetRecord)=>{r.clips[0].status="skipped";},
    (r:PetRecord)=>{r.clips[0].status="pending";},(r:PetRecord)=>{r.clips[0].durationSec=0;},
    (r:PetRecord)=>{r.clips[0].width=0;},(r:PetRecord)=>{r.clips[0].petId=crypto.randomUUID();},
  ]) {const record=fixture();mutate(record);assert.throws(()=>roundtrip(record));}
});

test("daty, długości i unikalne UUID albumu oraz zdjęć są sprawdzane", () => {
  for(const mutate of [
    (r:PetRecord)=>{r.moments![0].occurredAt="2026-02-30T12:00:00Z";},
    (r:PetRecord)=>{r.moments![0].title="x".repeat(121);},(r:PetRecord)=>{r.moments![0].caption="x".repeat(2001);},
    (r:PetRecord)=>{r.preferences!.firstConversationCelebratedAt="yesterday";},
    (r:PetRecord)=>{r.messages[0].situation!.description="x".repeat(1501);},
    (r:PetRecord)=>{r.messages[0].situation!.context="x".repeat(501);},
    (r:PetRecord)=>{r.moments!.push(structuredClone(r.moments![0]));},
  ]) {const record=fixture();mutate(record);assert.throws(()=>roundtrip(record));}
  const a=fixture();const b=createPetRecord({name:"Borys",species:"dog"});
  b.moments=[{...a.moments![0],id:crypto.randomUUID(),clipId:undefined}];
  const workspace:Workspace={schemaVersion:1,pets:[a,b],activePetId:a.pet.id};
  assert.throws(()=>parseWorkspace(JSON.stringify(workspace)),/Nieprawidłowy/);
  b.moments[0].photoId=crypto.randomUUID();assert.equal(parseWorkspace(JSON.stringify(workspace)).pets.length,2);
});

test("pliki albumu wymagają zgodnego JPEG/PNG/WebP i ograniczenia 5MiB", async () => {
  await validatePhotoBlob(new Blob([png],{type:"image/png"}));
  await validatePhotoBlob(new Blob([new Uint8Array([255,216,255,217])],{type:"image/jpeg"}));
  for(const blob of [new Blob([],{type:"image/png"}),new Blob(["<svg></svg>"],{type:"image/svg+xml"}),new Blob(["<html></html>"],{type:"image/png"}),new Blob([new Uint8Array(MAX_PHOTO_BYTES+1)],{type:"image/png"})]) await assert.rejects(()=>validatePhotoBlob(blob));
});

test("API projekcja pomija album, metadane lokalne, historię sytuacji i zdjęcia", () => {
  const record=fixture();record.pet.photo="synthetic-photo";Object.assign(record,{localMedia:"synthetic-local-media"});Object.assign(record.clips[0],{blob:"synthetic-clip-bytes"});
  const output=apiRecord(record); const json=JSON.stringify(output);
  for(const field of ["moments","preferences","situation","photo","localMedia","synthetic-clip-bytes"]) assert.equal(json.includes(field),false);
  assert.equal(output.clips[0].id,record.clips[0].id);assert.equal(record.messages[0].situation!.description,"Usiadła na parapecie.");
  const server=chatRequestSchema.parse({record,message:"Moje zwyczaje",situation:{description:"Widzę ten ruch.",clipId:record.clips[0].id}});
  assert.equal(server.record.moments,undefined); assert.equal(server.record.messages[0].situation,undefined); assert.equal(server.situation?.clipId,record.clips[0].id);
});

test("duży profil API zachowuje stary wybrany klip, źródła adnotacji i cztery wymagane konteksty", () => {
  const record=fixture();
  for(const question of getQuestions(record.pet.species)) record.answers[question.id]={questionId:question.id,status:"unknown",updatedAt:now};
  const base={...record.clips[0],createdAt:"2025-01-01T12:00:00Z"};
  record.clips=getTasks(record.pet.species).map(task=>({...base,id:crypto.randomUUID(),taskId:task.id}));
  const selected={...base,id:crypto.randomUUID(),taskId:"known_cue"};
  const annotated={...base,id:crypto.randomUUID(),taskId:"known_cue"};
  record.clips.push(selected,annotated);
  for(let index=0;index<250;index++) record.clips.push({...base,id:crypto.randomUUID(),taskId:"baseline",createdAt:new Date(Date.parse(now)+index*1000).toISOString(),
    analysis:{source:"gemini",summary:"synthetic-model-summary",observations:["synthetic-model-observation"],limitations:["synthetic-model-limit"],needsReview:true}});
  record.moments=[];
  record.memories=Array.from({length:80},(_,index)=>({id:crypto.randomUUID(),text:`Pełny zapis opiekuna ${index}: ${"ą".repeat(1700)}`,category:"event" as const,source:"owner_report" as const,createdAt:now}));
  record.memories.push({id:crypto.randomUUID(),text:"Opiekun opisał widoczny ruch w klipie.",category:"event",source:"video_annotation",clipId:annotated.id,createdAt:now});
  const output=apiRecord(record,selected.id);
  assert.equal(record.clips.length,256);assert.equal(output.clips.length,200);
  assert(output.clips.some(clip=>clip.id===selected.id));assert(output.clips.some(clip=>clip.id===annotated.id));
  assert.deepEqual(getReadiness(output).ready,true);assert.equal(getReadiness(output).clips,4);
  assert.equal(output.memories.length,60);assert.equal(output.memories[0].text,record.memories[21].text);
  assert.equal(output.memories.at(-1)?.clipId,annotated.id);
  assert(output.clips.every(clip=>clip.analysis===undefined));assert.equal(JSON.stringify(output).includes("synthetic-model-summary"),false);
  assert.equal(chatRequestSchema.safeParse({record,message:"Opisz tę sytuację",situation:{description:"Zapis opiekuna.",clipId:selected.id}}).success,false);
  assert.equal(chatRequestSchema.safeParse({record:output,message:"Opisz tę sytuację",situation:{description:"Zapis opiekuna.",clipId:selected.id}}).success,true);
});

test("projekcja API wysyła tylko sześć ograniczonych wiadomości bez dawnych dowodów i sytuacji", () => {
  const record=fixture();record.messages=Array.from({length:30},(_,index)=>({id:crypto.randomUUID(),role:index%2?"assistant" as const:"user" as const,content:`${index}: ${"x".repeat(2000)}`,createdAt:now,
    situation:{description:"Prywatny opis dawnej sytuacji."},evidence:[{id:"q045",title:"Dawny kontekst",excerpt:"synthetic-private-history",kind:"owner_report" as const}]}));
  const projected=apiRecord(record);
  assert.equal(projected.messages.length,6);assert.equal(projected.messages[0].id,record.messages[24].id);
  assert(projected.messages.every(message=>message.content.length===1500));
  assert.equal(JSON.stringify(projected).includes("synthetic-private-history"),false);
  assert(projected.messages.every(message=>!message.situation&&!message.evidence));
  assert.equal(record.messages[24].content.length,2004);assert.equal(record.messages[24].situation?.description,"Prywatny opis dawnej sytuacji.");
});

test("sytuacja API jest osobnym ograniczonym opisem i wymaga własnego gotowego klipu", () => {
  const record=fixture();const good={record,message:"Opisz sytuację",situation:{description:"  Spokojny opis  ",context:"  Popołudnie ",clipId:record.clips[0].id}};
  assert.equal(chatRequestSchema.parse(good).situation?.description,"Spokojny opis");
  for(const fields of [{description:" "},{description:"x".repeat(1501)},{context:"x".repeat(501)},{clipId:crypto.randomUUID()},{photo:"data:image/jpeg;base64,AAAA"}]) assert.equal(chatRequestSchema.safeParse({...good,situation:{...good.situation,...fields}}).success,false);
  for(const status of ["pending","stopped","skipped"] as const) {record.clips[0].status=status;assert.equal(chatRequestSchema.safeParse(good).success,false);}
});

test("pierwsza rozmowa wymaga pełnego testu i czterech realnych kontekstów poza demo", () => {
  const record=fixture();assert.equal(getFirstConversation(record).ready,false);
  for(const question of getQuestions(record.pet.species)) record.answers[question.id]={questionId:question.id,status:"unknown",updatedAt:now};
  record.clips=getTasks(record.pet.species).map(task=>({...record.clips[0],id:crypto.randomUUID(),taskId:task.id}));
  assert.equal(getFirstConversation(record).ready,true);assert.equal(record.preferences?.firstConversationCelebratedAt,now);
  record.isDemo=true;assert.equal(getFirstConversation(record).ready,false);assert.deepEqual(getFirstConversation(record).evidence,[]);
});

test("kliniczne treści nie tworzą fikcyjnego głosu, tematów, karty ani zabawnego tygodnia", () => {
  const record=fixture();record.memories.push({id:crypto.randomUUID(),text:"Wymiotuje i boli ją brzuch.",category:"preference",source:"owner_report",createdAt:now});
  record.answers.q020={questionId:"q020",status:"answered",value:"Właściciel zgłosił rozpoznanie.",updatedAt:now};
  record.answers.q045={questionId:"q045",status:"answered",value:["covered"],note:"Zmiana po chorobie.",updatedAt:now};
  const outputs=[getFirstConversation(record),getConversationTopics(record),getShareableFacts(record),getWeeklySummary(record,new Date(now))];
  for(const result of outputs) {assert.equal(JSON.stringify(result).includes("Wymiotuje"),false);assert.equal(JSON.stringify(result).includes("rozpoznanie"),false);assert.equal(JSON.stringify(result).includes("po chorobie"),false);}
  assert.equal(getShareableFacts(record).length,1);assert.equal(getShareableFacts(createDemoRecord()).length,0);
});

test("tematy psa i kota zachowują gatunek i nie wymyślają osobistych preferencji", () => {
  const cat=createPetRecord({name:"Luna",species:"cat"});const dog=createPetRecord({name:"Borys",species:"dog"});
  assert(getConversationTopics(cat).some(topic=>topic.id==="rest"));assert(getConversationTopics(dog).some(topic=>topic.id==="walk"));
  assert(getConversationTopics(cat).every(topic=>!(topic.evidence?.length)));assert.equal(getFirstConversation(cat).evidence.length,0);
});

test("tematy wracają do nowego zdarzenia, chwili i brakującej odpowiedzi z konkretnymi etykietami", () => {
  const record=fixture();record.answers.q045={questionId:"q045",status:"unknown",updatedAt:now};
  const eventId=crypto.randomUUID();record.memories.push({id:eventId,text:"Podczas znanej zabawy wybrała piłkę.",category:"event",source:"owner_report",createdAt:now});
  const topics=getConversationTopics(record);
  assert(topics.some(topic=>topic.id===`event:${eventId}`&&topic.label.includes("wybrała piłkę")));
  assert(topics.some(topic=>topic.id===`moment:${record.moments![0].id}`&&topic.label.includes(record.moments![0].title)));
  assert(topics.some(topic=>topic.id==="missing:q045"&&topic.evidence?.length===0));
  assert.equal(new Set(topics.map(topic=>topic.id)).size,topics.length);assert(topics.length<=5);
  const empty=createPetRecord({name:"Borys",species:"dog"});assert.equal(getConversationTopics(empty).length,5);
});

test("kliniczne słowa w błędnie oznaczonej rutynie są pomijane niezależnie od kategorii", () => {
  for(const text of ["Cukrzyca wymaga insuliny.","Nowotwór i padaczka opisane przez opiekuna.","Dysplazja i niewydolność wymagają konsultacji."]) {
    const record=fixture();record.memories=[{id:crypto.randomUUID(),text,category:"routine",source:"owner_report",createdAt:now}];record.moments=[];
    assert.equal(getShareableFacts(record).length,0);assert.equal(getFirstConversation(record).evidence.length,0);
    assert.equal(getWeeklySummary(record,new Date(now)).items.some(item=>item.kind==="memory"),false);
  }
});

test("tydzień odróżnia datę dodania od zdarzenia, pomija przyszłość i zachowuje źródła", () => {
  const record=fixture();record.moments![0].occurredAt="2024-01-01T12:00:00Z";
  record.memories.push({...record.memories[0],id:crypto.randomUUID(),createdAt:"2026-10-09T12:00:00Z",text:"Przyszły zapis"});
  record.answers.q012={questionId:"q012",status:"answered",value:0,updatedAt:now};record.answers.q045={questionId:"q045",status:"unknown",updatedAt:now};
  const result=getWeeklySummary(record,new Date(now));assert.equal(result.from,"2026-10-01T12:00:00.000Z");
  assert(result.items.every(item=>item.evidence.length>0));assert(!JSON.stringify(result).includes("Przyszły zapis"));
  assert(result.items.some(item=>item.kind==="moment"&&item.text.includes("1 stycznia 2024")));assert(result.items.some(item=>item.text.endsWith("\n0")));
  assert(result.items.some(item=>item.text.includes("Nie wiem — pozostaje brak danych")));
  assert.equal(result.items.filter(item=>item.kind==="clip").length,1);
});

test("pusty tydzień nie sugeruje zmiany nastroju, liczba wpisów nie staje się oceną", () => {
  const record=createPetRecord({name:"Luna",species:"cat"});const output=getWeeklySummary(record,new Date(now));
  assert.equal(output.items.length,0);assert.match(output.emptyMessage,/nie mówi nic o zachowaniu ani samopoczuciu/);
  assert.equal("mood" in output,false);assert.equal("score" in output,false);
});
