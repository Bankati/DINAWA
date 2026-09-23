import type { NextConfig } from "next";
import path from "path";

// Racine du monorepo (Code/), pas apps/frontend — nécessaire pour que
// Turbopack résolve les dépendances hoistées par npm workspaces
// (node_modules/next vit à la racine du repo, pas dans apps/frontend/).
// Voir node_modules/next/dist/docs/.../turbopack.md, section "root".
const nextConfig: NextConfig = {
  turbopack: {
    root: path.join(__dirname, "../.."),
  },
  // `true` (défaut) fusionne/réordonne librement les fichiers CSS par route —
  // avec un `page.css` importé directement dans (presque) chaque page.tsx de
  // ce projet, une navigation client (router.push après connexion, jamais un
  // rechargement complet) peut afficher la page suivante avec l'ordre de
  // cascade d'un chunk CSS fusionné différent de celui qu'un chargement direct
  // aurait produit — d'où l'affichage déformé qui ne se corrige qu'au F5 (voir
  // node_modules/next/dist/docs/.../cssChunking.md, "if you run into
  // unexpected CSS behavior"). 'strict' charge chaque page.css dans son ordre
  // d'import exact, sans fusion — plus de requêtes, mais un ordre stable et
  // identique entre navigation directe et navigation client.
  experimental: {
    cssChunking: "strict",
  },
};

export default nextConfig;
