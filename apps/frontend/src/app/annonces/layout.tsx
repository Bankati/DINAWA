import type { Metadata } from "next";

// Layout serveur minimal : la page est un composant client et ne peut pas
// exporter de metadata (URL canonique, voir app/layout.tsx).
export const metadata: Metadata = {
  alternates: { canonical: "/annonces" },
};

export default function AnnoncesLayout({ children }: { children: React.ReactNode }) {
  return children;
}
