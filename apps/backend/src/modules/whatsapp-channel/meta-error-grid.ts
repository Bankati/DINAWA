// Grille de classification des erreurs de l'API WhatsApp Cloud (unité 42,
// /architect 2026-10-08). Source : documentation officielle Meta, « Error
// codes » (developers.facebook.com/docs/whatsapp/cloud-api/support/error-codes),
// relevée le 2026-10-08. Toute évolution de la grille Meta se reporte ICI,
// jamais en ajoutant des `if` dans classifyMetaError().
//
// Une entrée dit ce que l'on SAIT de la tentative :
// - FAILED  : Meta a explicitement refusé la requête, rien n'est parti.
//   `retryable` : le même message peut-il passer plus tard tel quel ?
// - UNKNOWN : Meta signale une erreur sans garantir que le message n'a pas
//   été pris en compte — jamais renvoyé automatiquement.
// `alert` : l'erreur vient de notre configuration (jeton, compte, paiement
// Meta...) et bloquera tous les envois tant qu'un humain n'intervient pas.
//
// Un code ABSENT de la grille donne UNKNOWN non réessayable + alerte (voir
// classifyMetaError) : face à l'inconnu, on ne présume ni refus ni succès.
// La grille ne s'applique qu'aux réponses HTTP < 500 : tout 5xx est UNKNOWN
// avant même de la consulter (voir classifyMetaError).

export type MetaErrorRule = {
  status: 'FAILED' | 'UNKNOWN';
  retryable: boolean;
  alert?: boolean;
};

const CONFIG_ERROR: MetaErrorRule = { status: 'FAILED', retryable: false, alert: true };
const THROTTLED: MetaErrorRule = { status: 'FAILED', retryable: true };
const REJECTED: MetaErrorRule = { status: 'FAILED', retryable: false };
const TEMPORARILY_DOWN: MetaErrorRule = { status: 'FAILED', retryable: true };
const UNCERTAIN: MetaErrorRule = { status: 'UNKNOWN', retryable: false };

// Clé = `${code}` ou `${code}:${subcode}` (le sous-code, s'il est présent dans
// la grille, l'emporte sur le code seul).
export const META_ERROR_GRID: Readonly<Record<string, MetaErrorRule>> = {
  // ── Autorisation / configuration de WARAH ───────────────────
  '0': CONFIG_ERROR, // authentification impossible (jeton expiré ou invalidé)
  '3': CONFIG_ERROR, // droits insuffisants de l'application
  '10': CONFIG_ERROR, // permission non accordée ou retirée
  '190': CONFIG_ERROR, // jeton d'accès expiré
  '33': CONFIG_ERROR, // numéro WhatsApp de WARAH supprimé
  '131005': CONFIG_ERROR, // permission non accordée
  '131037': CONFIG_ERROR, // nom affiché non approuvé
  '131042': CONFIG_ERROR, // moyen de paiement Meta absent ou en défaut
  '131045': CONFIG_ERROR, // numéro WARAH non enregistré
  '133010': CONFIG_ERROR, // numéro WARAH non enregistré sur la plateforme
  '368': CONFIG_ERROR, // compte restreint pour violation de politique
  '131031': CONFIG_ERROR, // compte restreint / données de vérification incorrectes
  '131064': CONFIG_ERROR, // limite d'envoi atteinte suite à des violations de catégorie
  '130497': REJECTED, // envoi interdit vers ce pays

  // ── Limites de débit : le même message passera plus tard ────
  '4': THROTTLED, // limite d'appels de l'application
  '80007': THROTTLED, // limite du compte WhatsApp Business
  '130429': THROTTLED, // débit d'envoi de l'API atteint
  '131056': THROTTLED, // trop de messages au même destinataire
  '131048': { status: 'FAILED', retryable: true, alert: true }, // restrictions anti-spam sur le numéro WARAH

  // ── Indisponibilité déclarée par Meta avec un HTTP < 500 : requête non
  // traitée. Les mêmes codes sous un 5xx donnent UNKNOWN. ─
  '2': TEMPORARILY_DOWN,
  '131016': TEMPORARILY_DOWN,
  '133004': TEMPORARILY_DOWN,
  '131057': { status: 'FAILED', retryable: true, alert: true }, // compte en maintenance
  '2494100': { status: 'FAILED', retryable: true, alert: true }, // compte en maintenance

  // ── Erreur générique : Meta ne dit pas si le message est parti ─
  '1': UNCERTAIN, // « requête invalide ou erreur serveur possible »
  '131000': UNCERTAIN, // « échec d'envoi pour une raison inconnue »

  // ── Refus définitifs liés au destinataire ou au contenu ─────
  '100': REJECTED, // paramètre non supporté ou mal orthographié
  '131008': REJECTED, // paramètre obligatoire manquant
  '131009': REJECTED, // valeur de paramètre invalide
  '131021': REJECTED, // expéditeur = destinataire
  '131026': REJECTED, // destinataire sans WhatsApp ou application trop ancienne
  '131047': REJECTED, // fenêtre de 24 h fermée : un modèle est obligatoire
  '131049': REJECTED, // non livré pour préserver l'engagement de l'écosystème
  '131050': REJECTED, // destinataire désabonné
  '131051': REJECTED, // type de message non supporté
  '131053': REJECTED, // téléversement du média refusé (type non supporté...)
  '130403': REJECTED, // destinataire bloqué
  '130472': REJECTED, // exclu par une expérimentation Meta
  '132000': REJECTED, // nombre de variables du modèle incorrect
  '132001': REJECTED, // modèle inexistant ou non approuvé dans cette langue
  '132005': REJECTED, // texte traduit trop long
  '132007': REJECTED, // contenu du modèle contraire à la politique WhatsApp
  '132012': REJECTED, // format d'une variable incorrect
  '132015': REJECTED, // modèle en pause (qualité faible)
  '132016': REJECTED, // modèle désactivé définitivement
  '132018': REJECTED, // erreur de validation des paramètres du modèle
  '135000': REJECTED, // erreur inconnue dans les paramètres de la requête
};

// Codes de permission 200-299 : plage documentée par Meta, plutôt que 100
// entrées individuelles dans la grille.
export function permissionRangeRule(code: number): MetaErrorRule | undefined {
  return code >= 200 && code <= 299 ? CONFIG_ERROR : undefined;
}
