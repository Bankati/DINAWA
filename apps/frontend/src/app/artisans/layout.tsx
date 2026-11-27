import type { Metadata } from "next";

// Layout serveur minimal : les pages sont des composants clients et ne
// peuvent pas exporter de metadata.
export const metadata: Metadata = {
  title: "Annuaire des artisans",
  description:
    "Plombiers, électriciens, maçons… recommandés par les propriétaires WARAH au Togo, avec leurs avis.",
  alternates: { canonical: "/artisans" },
};

export default function ArtisansLayout({ children }: { children: React.ReactNode }) {
  return children;
}
