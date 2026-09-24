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
};

export default nextConfig;
