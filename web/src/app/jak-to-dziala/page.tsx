import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { PublicInfoShell } from "@/components/public-info-shell";
import { methodologyFaqs, methodologyIntro, methodologySections, projectMetrics } from "@/content/project-methodology";
import styles from "@/components/public-info.module.css";

export const metadata: Metadata = {
  title: "Jak działa COPOWIESZ — podstawy projektu i osobistego profilu",
  description: "Skąd cyfrowa reprezentacja psa lub kota bierze informacje? Poznaj test, kierowane nagrania, pamięć, źródła behawiorystyczne, zasady zdrowia i ograniczenia COPOWIESZ.",
};

export default function MethodologyPage() {
  return (
    <PublicInfoShell
      {...methodologyIntro}
      heroImage="/images/pet-connection.png"
      activePath="/jak-to-dziala"
      actions={<><Link className={styles.primaryLink} href="/">Zacznij od profilu<ArrowRight size={16} aria-hidden="true" /></Link><Link className={styles.secondaryLink} href="/pomoc">Praktyczny przewodnik</Link></>}
    >
      <div className={styles.metrics} aria-label="Zakres obecnej wersji projektu">
        {projectMetrics.map((metric) => <div className={styles.metric} key={metric.label}><div className={styles.metricValue}>{metric.value}</div><div className={styles.metricLabel}>{metric.label}</div><p className={styles.metricDescription}>{metric.description}</p></div>)}
      </div>
      <div className={styles.contentLayout}>
        <nav className={styles.contents} aria-label="Spis treści podstaw projektu">
          <h2>Przyjrzyj się podstawom</h2>
          <ol>
            {methodologySections.map((section, index) => <li key={section.id}><a href={`#${section.id}`}><span aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>{section.title}</a></li>)}
          </ol>
          <a className={styles.contentsExtra} href="#pytania-o-projekt">Pytania o projekt ↓</a>
          <Link className={styles.textLink} href="/pomoc">Przejdź do pomocy<ArrowRight size={13} aria-hidden="true" /></Link>
        </nav>
        <article className={styles.article} aria-label="Zasady i metodologia COPOWIESZ">
          {methodologySections.map((section, index) => (
            <section className={styles.articleSection} id={section.id} key={section.id} aria-labelledby={`${section.id}-heading`}>
              <p className={styles.sectionKicker}>Podstawa {String(index + 1).padStart(2, "0")}</p>
              <h2 id={`${section.id}-heading`}>{section.title}</h2>
              {section.paragraphs.map((paragraph, paragraphIndex) => <p key={paragraphIndex}>{paragraph}</p>)}
              {section.bullets && <ul>{section.bullets.map((bullet) => <li key={bullet}>{bullet}</li>)}</ul>}
              {section.sources && <div className={styles.sourceLinks}><span>Źródła i materiały:</span>{section.sources.map((source) => <a key={source.href} href={source.href} target="_blank" rel="noreferrer">{source.label} ↗</a>)}</div>}
            </section>
          ))}
          <section id="pytania-o-projekt" className={styles.plainFaq} aria-labelledby="methodology-faq-heading">
            <p className={styles.sectionKicker}>Przed pierwszą rozmową</p>
            <h2 id="methodology-faq-heading">Pytania, które warto zadać</h2>
            <div className={styles.faqList}>
              {methodologyFaqs.map((faq) => <details className={styles.faqItem} key={faq.question}><summary><span className={styles.faqTitle}>{faq.question}</span></summary><div className={styles.faqAnswer}><p>{faq.answer}</p></div></details>)}
            </div>
          </section>
        </article>
      </div>
      <section className={styles.closing} aria-labelledby="methodology-closing-heading">
        <div><h2 id="methodology-closing-heading">Najbliżej prawdy jest Wasza codzienność</h2><p>Zacznij od własnych obserwacji. W przewodniku znajdziesz prostą drogę przez test, bezpieczne nagrania, pamięć i rozmowę — z miejscem na „nie wiem”.</p></div>
        <div className={styles.closingActions}><Link className={styles.primaryLink} href="/pomoc">Zobacz, jak zacząć<ArrowRight size={16} aria-hidden="true" /></Link><Link className={styles.secondaryLink} href="/">Otwórz aplikację</Link></div>
      </section>
    </PublicInfoShell>
  );
}
