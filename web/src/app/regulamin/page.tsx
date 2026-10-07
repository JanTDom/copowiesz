import type { Metadata } from "next";
import Link from "next/link";
import { PublicInfoShell } from "@/components/public-info-shell";
import { LegalArticle } from "@/components/legal-article";
import { termsSections, LEGAL_VERSION } from "@/content/legal";
import styles from "@/components/public-info.module.css";
export const metadata: Metadata = { title: "Regulamin — COPOWIESZ", description: "Dane Multinewsroom, zasady pilotażu, rozmowy AI, płatności, reklamacji i odstąpienia." };
export default function TermsPage() {
  return <PublicInfoShell compact activePath="/regulamin" eyebrow={`Warunki usługi · ${LEGAL_VERSION}`} title="Jasne zasady. Zanim zaczniemy." lead="Kto prowadzi COPOWIESZ, co robi obecna wersja i jak chronimy Twoje prawa."><div className={styles.statusNote}><p><strong>Obecny etap: bezpłatny pilotaż.</strong> Płatne pakiety i rzeczywiste transakcje Przelewy24 nie są uruchomione. <Link href="/platnosci">Sprawdź dostęp i płatności</Link>.</p></div><LegalArticle sections={termsSections}/><div className={styles.legalCopy}><h2>Informacje konsumenckie</h2><p><a href="https://api.sejm.gov.pl/eli/acts/DU/2024/1796/text.html" target="_blank" rel="noreferrer">Ustawa o prawach konsumenta</a> · <a href="https://prawakonsumenta.uokik.gov.pl/" target="_blank" rel="noreferrer">Oficjalny poradnik UOKiK</a> · <Link href="/odstapienie">Oświadczenie i reklamacje</Link></p></div></PublicInfoShell>;
}
