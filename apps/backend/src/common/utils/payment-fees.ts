// Frais de service payés par le locataire EN PLUS du loyer, pour couvrir les
// frais PayDunya (encaissement + reversement) sans rogner les 100 % du loyer
// dus au bénéficiaire (architecture.md, invariant #14 — /architect reversement
// 2026-09-25). Réglés au coût réel PayDunya, jamais avec une marge : un frais
// supérieur au coût serait une commission déguisée.
export type TenantFeeConfig = {
  // Pourcentage du loyer (ex. 1.5 pour 1,5 %) — arrondi à l'entier supérieur.
  percent: number;
  // Montant fixe en FCFA ajouté au pourcentage.
  fixedFcfa: number;
};

export function computeTenantFee(rentFcfa: number, config: TenantFeeConfig): number {
  if (rentFcfa <= 0) return 0;
  const percentPart = Math.ceil((rentFcfa * config.percent) / 100);
  return Math.max(0, percentPart + Math.round(config.fixedFcfa));
}
