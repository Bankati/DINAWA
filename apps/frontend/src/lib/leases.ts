import { api } from "./api";

export type ScheduleEntryStatus = "PENDING" | "PARTIAL" | "PAID" | "OVERDUE";

export const SCHEDULE_ENTRY_STATUS_LABELS: Record<ScheduleEntryStatus, string> =
  {
    PENDING: "En attente",
    PARTIAL: "Partiel",
    PAID: "Payé",
    OVERDUE: "Impayé",
  };

// Correspond à PaymentScheduleEntry (GET /leases/:id/schedule)
export interface PaymentScheduleEntry {
  id: string;
  leaseId: string;
  periodStart: string;
  periodEnd: string;
  dueDate: string;
  expectedAmount: number;
  paidAmount: number;
  status: ScheduleEntryStatus;
}

export interface TerminateLeaseDto {
  terminationReason?: string;
}

export const leasesApi = {
  getSchedule: (leaseId: string) =>
    api.get<PaymentScheduleEntry[]>(`/leases/${leaseId}/schedule`),

  terminate: (leaseId: string, dto?: TerminateLeaseDto) =>
    api.post(`/leases/${leaseId}/terminate`, dto ?? {}),
};
