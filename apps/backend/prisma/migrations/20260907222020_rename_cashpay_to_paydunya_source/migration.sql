-- Renomme la valeur d'énum PaymentSource.CASHPAY_API en PAYDUNYA_API.
-- Le client a changé d'agrégateur mobile money (PayDunya, pas Cashpay) —
-- voir /architect 2026-09-07. ALTER TYPE ... RENAME VALUE (PG10+) plutôt
-- qu'un DROP/CREATE : migration sûre, aucune ligne réelle n'utilisait cette
-- valeur (confirmé par requête directe avant écriture de cette migration).
ALTER TYPE "PaymentSource" RENAME VALUE 'CASHPAY_API' TO 'PAYDUNYA_API';
