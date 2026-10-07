import Image from "next/image";
import { ArrowRight, Mic, Send, ClipboardList, Camera, MessageCircle } from "lucide-react";

export function Welcome({ onCreate, onDemo }: { onCreate: () => void; onDemo: () => void }) {
  return <div className="welcome">
    <section className="hero">
      <div className="hero-image"><Image src="/images/pet-connection.png" alt="Ilustracja idei: pies i kot połączeni cyfrową rozmową" fill priority sizes="(max-width: 800px) 100vw, 65vw" /></div>
      <div className="hero-copy"><h1>A gdyby tak<br /><em>porozmawiać?</em></h1><p>Z Twoim psem. Z Twoim kotem.<br />Tak po prostu. Po polsku.</p>
        <div className="hero-actions"><button className="button primary" onClick={onCreate}>Poznajmy się <ArrowRight size={20} /></button><button className="button secondary" onClick={onDemo}>Zobacz rozmowę z Luną</button></div>
      </div>
    </section>
    <section className="journey" aria-label="Jak poznajemy Twojego zwierzaka">
      {[{n:"01", title:"Opowiedz o nim", text:"Przekrojowy test. Po jednym kroku.", icon:ClipboardList}, {n:"02", title:"Nagraj reakcje", text:"Prowadzimy Cię krok po kroku.", icon:Camera}, {n:"03", title:"Porozmawiaj", text:"Wasza historia. Po polsku.", icon:MessageCircle}].map(step => <div className="journey-step" key={step.n}><span className="step-number">{step.n}</span><div><step.icon size={25} /><h3>{step.title}</h3><p>{step.text}</p></div></div>)}
    </section>
    <section className="welcome-chat">
      <Image src="/images/pet-cat.png" alt="Ilustracja kota do przykładowej rozmowy" width={180} height={150} className="preview-photo" />
      <div className="preview-content"><h2>Luna</h2><span className="caption">Przykład cyfrowej rozmowy · dane demonstracyjne</span><p className="preview-bubble">Najchętniej bawię się wędką. Potem robię sobie przerwę na parapecie.</p></div>
      <button className="preview-composer" onClick={onDemo}><Mic size={24} /><span>O co chcesz zapytać?</span><span className="send-orb"><Send size={22} /></span></button>
    </section>
    <p className="quiet-note">Tworzymy cyfrową reprezentację na podstawie Twoich obserwacji i nagrań. Interpretacje można sprawdzić i poprawić.</p>
  </div>;
}
