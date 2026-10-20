import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

// Seules les pages publiques (accueil, annonces, à propos, contact, CGU,
// confidentialité) ont un intérêt à être indexées. L'annuaire des
// gestionnaires exige une connexion (voir gestionnaires/layout.tsx). Tout le reste exige une
// connexion — aucun visiteur anonyme n'y arrive jamais depuis une recherche,
// et les y référencer inviterait un robot à s'y cogner (redirection vers
// /auth/login) pour rien.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/dashboard/",
        "/gestionnaire/",
        "/gestionnaires",
        "/locataire/",
        "/admin/",
        "/auth/",
        "/profil",
        "/paiements",
      ],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
