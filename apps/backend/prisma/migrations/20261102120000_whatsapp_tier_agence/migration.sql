-- WhatsApp ouvert à tous les forfaits, Agence compris (décision de la direction, 2026-11-02).
-- Additif et rétrocompatible : nouveau défaut + ajout d'AGENCE à la ligne existante
-- seulement s'il n'y est pas (les autres forfaits restent tels que l'admin les a réglés).
ALTER TABLE "platform_settings" ALTER COLUMN "whatsappEnabledTiers" SET DEFAULT ARRAY['STARTER', 'PRO', 'PREMIUM', 'AGENCE']::"SubscriptionTier"[];

UPDATE "platform_settings"
SET "whatsappEnabledTiers" = array_append("whatsappEnabledTiers", 'AGENCE'::"SubscriptionTier")
WHERE NOT ('AGENCE'::"SubscriptionTier" = ANY("whatsappEnabledTiers"));
