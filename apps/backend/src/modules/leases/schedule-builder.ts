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

// Accord du locataire déjà inscrit (registre des décisions du 09/11/2026) :
// l'échéancier n'est créé qu'à l'acceptation, à partir de la date de début
// du bail. Règle : une échéance dont la date due tombe AVANT le jour de
// l'acceptation prend pour date due ce jour-là (00:00 UTC, convention des
// dueDate — Lomé est en UTC+0). La période (periodStart / periodEnd) et le
// montant ne changent pas. Le délai de tolérance du retard court donc à
// partir de l'acceptation : l'attente ne rend jamais une échéance « en
// retard ». Fonction pure.
export function dueDateAfterAcceptance(dueDate: Date, acceptedAt: Date): Date {
  const acceptanceDay = new Date(
    Date.UTC(acceptedAt.getUTCFullYear(), acceptedAt.getUTCMonth(), acceptedAt.getUTCDate()),
  );
  return dueDate < acceptanceDay ? acceptanceDay : dueDate;
}

export function shiftDueDatesToAcceptance(
  entries: ScheduleEntryInput[],
  acceptedAt: Date,
): ScheduleEntryInput[] {
  return entries.map((entry) => ({
    ...entry,
    dueDate: dueDateAfterAcceptance(new Date(entry.dueDate), acceptedAt),
  }));
}
