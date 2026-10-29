import type { Metadata } from "next";

// Layout serveur minimal : les pages /payer sont des composants client et ne
// peuvent pas exporter de metadata. Sans lui, l'onglet affichait le slogan
// de l'accueil. noindex en plus de robots.ts : l'URL contient un jeton.
export const metadata: Metadata = {
  title: "Payer un loyer — WARAH",
  robots: { index: false, follow: false },
};

export default function PayerTokenLayout({ children }: { children: React.ReactNode }) {
  return children;
}
