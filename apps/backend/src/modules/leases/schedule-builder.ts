import { addMonths } from 'date-fns';
import { PaymentFrequency, Prisma } from '@prisma/client';

// Nombre de mois couverts par une période selon la fréquence — voir
// build-plan.md unité 15 : "montant = (monthlyRent + monthlyCharges) ×
// nombreDeMoisDansLaPeriode".
export const PERIOD_MONTHS: Record<PaymentFrequency, number> = {
  MONTHLY: 1,
  QUARTERLY: 3,
  BIANNUAL: 6,
  ANNUAL: 12,
};

// Fenêtre initiale d'un bail ouvert (sans endDate) — voir /architect unité
// 15 : pas de cron dédié, la prolongation se fera à la demande (unité 16)
// en complétant les échéances manquantes jusqu'à 12 mois à partir
// d'aujourd'hui.
export const ROLLING_WINDOW_MONTHS = 12;

export type ScheduleEntryInput = Prisma.PaymentScheduleEntryCreateManyInput;

// Pas de prorata sur la première période même si `startDate` ne tombe pas
// en début de mois calendaire — le build-plan ne mentionne aucune règle
// de prorata, chaque période court une durée pleine à partir de
// `startDate` (voir /architect unité 15). `dueDate` = début de période :
// le loyer est dû au début de chaque période, pas à la fin.
//
// Fonction pure, sans dépendance à Prisma runtime — partagée entre la
// création du bail (voir AuthService.inviteTenant(), fusionné depuis
// l'unité 15 le 2026-07-25) et tout futur besoin de recalcul d'échéancier.
export function buildScheduleEntries(
  leaseId: string,
  startDate: Date,
  scheduleEndDate: Date,
  frequency: PaymentFrequency,
  monthlyRent: number,
  monthlyCharges: number,
): ScheduleEntryInput[] {
  const periodMonths = PERIOD_MONTHS[frequency];
  const expectedAmount = (monthlyRent + monthlyCharges) * periodMonths;

  const entries: ScheduleEntryInput[] = [];
  let periodStart = startDate;
  while (periodStart < scheduleEndDate) {
    const periodEnd = addMonths(periodStart, periodMonths);
    entries.push({
      leaseId,
      periodStart,
      periodEnd,
      dueDate: periodStart,
      expectedAmount,
    });
    periodStart = periodEnd;
  }

  return entries;
}
