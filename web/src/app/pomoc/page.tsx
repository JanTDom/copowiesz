import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { HelpGuide } from "@/components/help-guide";
import { PublicInfoShell } from "@/components/public-info-shell";
import styles from "@/components/public-info.module.css";

export const metadata: Metadata = {
  title: "Pomoc — od pierwszego profilu do rozmowy | COPOWIESZ",
  description: "Praktyczne wskazówki: test psa lub kota, spokojne nagrania, zgoda na analizę, pamięć, rozmowa po polsku i kopia danych. Wyszukaj odpowiedź na swój problem.",
};

export default function HelpPage() {
  return (
    <PublicInfoShell
      eyebrow="Jesteśmy obok, krok po kroku"
      title="Od czego zacząć? Od Was."
      lead="Nie trzeba znać się na technologii ani behawioryzmie. Wystarczy Twój zwierzak, zwykłe codzienne chwile i gotowość, by przyjrzeć się im uważniej. Tu znajdziesz wskazówki na każdy etap."
      heroImage="/images/pet-memory.png"
      activePath="/pomoc"
      actions={<><a className={styles.primaryLink} href="#szybki-start">Zobacz sześć kroków<ArrowRight size={16} aria-hidden="true" /></a><a className={styles.secondaryLink} href="#instrukcje">Znajdź odpowiedź</a><Link className={styles.textLink} href="/">Wróć do aplikacji<ArrowRight size={15} aria-hidden="true" /></Link></>}
    >
      <HelpGuide />
    </PublicInfoShell>
  );
}
