import type { Metadata } from "next";
import "@fontsource-variable/manrope";
import "@fontsource/dm-serif-display/400.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "COPOWIESZ — Twój zwierzak. Wasza rozmowa.",
  description: "Poznaj swojego psa lub kota dzięki przekrojowemu testowi i prowadzonym nagraniom. Porozmawiaj z jego cyfrową reprezentacją po polsku."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="pl"><body>{children}</body></html>;
}
