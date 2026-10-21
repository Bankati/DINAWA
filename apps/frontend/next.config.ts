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
  // Pages du lien de paiement public (unité 43) : l'URL contient un jeton
  // d'accès. Sans cet en-tête, le navigateur l'enverrait (en-tête Referer) à
  // PayDunya et à tout site ouvert depuis la page.
  async headers() {
    return [
      {
        source: "/payer/:path*",
        headers: [{ key: "Referrer-Policy", value: "no-referrer" }],
      },
    ];
  },
};

export default nextConfig;
