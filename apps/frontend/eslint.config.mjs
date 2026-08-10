import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // Pattern volontaire et récurrent dans ce projet : synchroniser un
      // formulaire éditable avec des données chargées de manière
      // asynchrone (ex. profil via useApi) — il n'y a pas d'alternative
      // sans effet ici, la donnée n'existe pas encore au premier rendu.
      // Abaissé en warning plutôt que désactivé : reste visible, ne
      // bloque pas `npm run lint` en CI.
      "react-hooks/set-state-in-effect": "warn",
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
