import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { ReactNode } from "react";
import styles from "./public-info.module.css";

export type PublicInfoShellProps = {
  eyebrow?: string;
  title: string;
  lead?: string;
  children: ReactNode;
  heroImage?: string;
  compact?: boolean;
  activePath?: string;
  actions?: ReactNode;
};

const footerLinks = [
  { href: "/jak-to-dziala", label: "Jak to działa" },
  { href: "/pomoc", label: "Pomoc" },
  { href: "/kontakt", label: "Kontakt" },
  { href: "/platnosci", label: "Dostęp i płatności" },
  { href: "/regulamin", label: "Regulamin" },
  { href: "/polityka-prywatnosci", label: "Polityka prywatności" },
  { href: "/odstapienie", label: "Odstąpienie i reklamacje" },
];

export function PublicInfoShell({
  eyebrow,
  title,
  lead,
  children,
  heroImage,
  compact = false,
  activePath,
  actions,
}: PublicInfoShellProps) {
  return (
    <div className={styles.shell}>
      <a className={styles.skipLink} href="#tresc">Przejdź do treści</a>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <Link className={styles.brand} href="/" aria-label="COPOWIESZ — wróć do aplikacji">
            <Image src="/brand/logo.png" alt="" width={46} height={46} />
            <span><strong>COPOWIESZ</strong><small>Twój zwierzak. Wasza rozmowa.</small></span>
          </Link>
          <nav className={styles.headerNav} aria-label="Nawigacja serwisu">
            <Link href="/jak-to-dziala" aria-current={activePath === "/jak-to-dziala" ? "page" : undefined}>Jak to działa</Link>
            <Link href="/pomoc" aria-current={activePath === "/pomoc" ? "page" : undefined}>Pomoc</Link>
            <Link className={styles.headerAction} href="/">Otwórz aplikację<ArrowRight size={16} aria-hidden="true" /></Link>
          </nav>
        </div>
      </header>
      <main id="tresc" className={styles.main} tabIndex={-1}>
        <div className={`${styles.hero} ${compact ? styles.compactHero : ""} ${heroImage ? styles.illustratedHero : ""}`}>
          {heroImage && (
            <div className={styles.heroImage} aria-hidden="true">
              <Image src={heroImage} alt="" fill preload sizes="(max-width: 700px) 100vw, 680px" />
            </div>
          )}
          <div className={styles.heroCopy}>
            {eyebrow && <p className={styles.eyebrow}>{eyebrow}</p>}
            <h1>{title}</h1>
            {lead && <p className={styles.heroLead}>{lead}</p>}
            {actions && <div className={styles.heroActions}>{actions}</div>}
          </div>
        </div>
        <div className={styles.bodyContent}>{children}</div>
      </main>
      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <div className={styles.footerIntroduction}>
            <Link href="/" className={styles.footerBrand}>COPOWIESZ</Link>
            <p>Bliżej tego, co widzisz.<br />Bliżej swojego zwierzaka.</p>
            <a href="mailto:kontakt@copowiesz.pl">kontakt@copowiesz.pl</a>
          </div>
          <nav className={styles.footerNav} aria-label="Informacje i pomoc">
            {footerLinks.map(({ href, label }) => <Link key={href} href={href} aria-current={activePath === href ? "page" : undefined}>{label}</Link>)}
          </nav>
        </div>
        <div className={styles.footerBottom}>
          <span>© {new Date().getFullYear()} <a href="https://multinewsroom.pl" target="_blank" rel="noreferrer">Multinewsroom</a>. Wszelkie prawa zastrzeżone. <span className={styles.taxId}>NIP 5252189241</span></span>
          <span>Cyfrowa reprezentacja zwierzaka. Z szacunkiem do jego potrzeb.</span>
        </div>
      </footer>
    </div>
  );
}
