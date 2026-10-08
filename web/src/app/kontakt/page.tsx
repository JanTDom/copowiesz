import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, Building2, Mail } from "lucide-react";
import { PublicInfoShell } from "@/components/public-info-shell";
import { operator } from "@/content/legal";
import styles from "@/components/public-info.module.css";

export const metadata: Metadata = {
  title: "Kontakt — COPOWIESZ",
  description: "Kontakt: kontakt@copowiesz.pl. Multinewsroom Jan Domaniewski.",
};

export default function ContactPage() {
  return (
    <PublicInfoShell
      compact
      activePath="/kontakt"
      title="Kontakt"
      actions={
        <a className={styles.primaryLink} href="mailto:kontakt@copowiesz.pl">
          <Mail size={18} aria-hidden="true" />
          kontakt@copowiesz.pl
        </a>
      }
    >
      <article className={styles.legalCopy}>
        <section>
          <h2><Building2 size={23} aria-hidden="true" /> Dane firmy</h2>
          <p>
            <strong>{operator.name}</strong><br />
            NIP {operator.nip} · REGON {operator.regon}
          </p>
          <p>
            <a href="https://multinewsroom.pl" target="_blank" rel="noreferrer">
              multinewsroom.pl <ArrowUpRight size={14} aria-hidden="true" />
            </a>
          </p>
        </section>
        <section>
          <h2>Informacje</h2>
          <p>
            <Link href="/pomoc">Pomoc</Link> · {" "}
            <Link href="/odstapienie">Odstąpienie i reklamacje</Link> · {" "}
            <Link href="/polityka-prywatnosci">Polityka prywatności</Link>
          </p>
        </section>
      </article>
    </PublicInfoShell>
  );
}
