import type { Metadata } from "next";
import "@fontsource-variable/manrope";
import "@fontsource/dm-serif-display/400.css";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://copowiesz.pl"),
  title: "COPOWIESZ — Twój zwierzak. Wasza rozmowa.",
  description: "Porozmawiaj ze swoim zwierzakiem! Poznaj swojego psa lub kota dzięki przekrojowemu testowi i prowadzonym nagraniom. Cyfrowa rozmowa po polsku.",
  openGraph: { siteName: "COPOWIESZ", locale: "pl_PL", type: "website", images: [{ url: "/images/pet-connection.png", width: 1672, height: 941, alt: "COPOWIESZ — pies, kot i Wasza rozmowa" }] },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="pl"><body>{children}</body></html>;
}
