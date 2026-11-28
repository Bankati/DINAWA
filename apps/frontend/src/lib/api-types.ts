import type { components } from "./api-types.generated";
import type { InviteConfirmationFields } from "./lease-confirmations";

// Alias stables vers les schémas générés depuis le Swagger backend (voir
// `npm run types:sync` à la racine) — importer depuis ce fichier plutôt que
// directement `api-types.generated.ts`, pour ne pas propager le chemin
// généré dans les pages si sa forme interne change un jour.
//
// Pour l'instant, seuls GET /mandates (MandatesController) et
// POST /auth/invite/tenant ont un schéma de réponse documenté côté backend —
// les autres endpoints n'en ont pas encore, donc leurs types ne sont pas
// exportables ici tant qu'ils ne sont pas décorés à leur tour (voir
// contexte/progress-tracker.md).
export type MandateWithParties = components["schemas"]["MandateWithPartiesDto"];
export type MandateParty = components["schemas"]["MandatePartyDto"];
// `confirmationRequired` / `confirmationId` (accord du locataire déjà
// inscrit, contrat du 09/11/2026) sont ajoutés à la main tant que le schéma
// n'est pas régénéré depuis le Swagger du serveur qui les expose.
export type InviteTenantResult = components["schemas"]["InviteTenantResponseDto"] & InviteConfirmationFields;
