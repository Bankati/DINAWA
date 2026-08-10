import type { components } from "./api-types.generated";

// Alias stables vers les schémas générés depuis le Swagger backend (voir
// `npm run types:sync` à la racine) — importer depuis ce fichier plutôt que
// directement `api-types.generated.ts`, pour ne pas propager le chemin
// généré dans les pages si sa forme interne change un jour.
//
// Pour l'instant, seul GET /mandates (MandatesController) a un schéma de
// réponse documenté (@ApiOkResponse) côté backend — les autres endpoints
// n'en ont pas encore, donc leurs types ne sont pas exportables ici tant
// qu'ils ne sont pas décorés à leur tour (voir contexte/progress-tracker.md).
export type MandateWithParties = components["schemas"]["MandateWithPartiesDto"];
export type MandateParty = components["schemas"]["MandatePartyDto"];
