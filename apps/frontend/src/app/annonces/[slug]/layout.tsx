import type { Metadata } from "next";

// URL canonique de chaque annonce (voir app/layout.tsx) : remplace celle de
// /annonces héritée du layout parent.
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  return { alternates: { canonical: `/annonces/${slug}` } };
}

export default function AnnonceLayout({ children }: { children: React.ReactNode }) {
  return children;
}
