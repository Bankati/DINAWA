import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";
import { getPublicListings } from "@/lib/listing-public";

// Régénéré au plus toutes les heures — évite de refaire l'aller-retour vers
// l'API à chaque passage d'un robot d'indexation, tout en restant à jour
// dans la même journée qu'une nouvelle annonce publiée (voir /docs/app/…/sitemap).
export const revalidate = 3600;

const STATIC_PAGES: MetadataRoute.Sitemap = [
  { url: SITE_URL, changeFrequency: "weekly", priority: 1 },
  { url: `${SITE_URL}/annonces`, changeFrequency: "daily", priority: 0.9 },
  {
    url: `${SITE_URL}/gestionnaires`,
    changeFrequency: "weekly",
    priority: 0.7,
  },
  { url: `${SITE_URL}/a-propos`, changeFrequency: "monthly", priority: 0.5 },
  { url: `${SITE_URL}/contact`, changeFrequency: "monthly", priority: 0.5 },
];

// Une ligne par annonce publiée — le reste du site (tableaux de bord,
// espaces connectés) n'a rien à faire dans un sitemap, voir robots.ts.
// L'API plafonne `limit` à 100 (invariant #11) : on pagine plutôt que de
// tout demander en un appel.
async function listingPages(): Promise<MetadataRoute.Sitemap> {
  const pages: MetadataRoute.Sitemap = [];
  const limit = 100;
  let page = 1;

  try {
    while (true) {
      const res = await getPublicListings({ page, limit });
      for (const listing of res.data) {
        pages.push({
          url: `${SITE_URL}/annonces/${listing.slug}`,
          lastModified: new Date(listing.publishedAt),
          changeFrequency: "weekly",
          priority: 0.8,
        });
      }
      if (res.data.length < limit || pages.length >= res.total) break;
      page += 1;
    }
  } catch (error: unknown) {
    // Un sitemap qui échoue entièrement à cause de l'API serait pire qu'un
    // sitemap sans les annonces — jamais faire planter la route pour ça.
    console.error(
      "[sitemap] échec de récupération des annonces publiques",
      error,
    );
  }

  return pages;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  return [...STATIC_PAGES, ...(await listingPages())];
}
