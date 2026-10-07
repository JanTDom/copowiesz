import type { LegalSection } from "@/content/legal";
import styles from "./public-info.module.css";
export function LegalArticle({ sections }: { sections: LegalSection[] }) {
  return <article className={styles.legalCopy}>{sections.map(section => <section key={section.id} id={section.id}><h2>{section.title}</h2>{section.paragraphs.map(paragraph => <p key={paragraph}>{paragraph}</p>)}{section.bullets && <ul>{section.bullets.map(item => <li key={item}>{item}</li>)}</ul>}</section>)}</article>;
}
