import { api } from "./api";
import type { WARAHUser } from "./auth-context";
import type { PayoutOperator } from "./payout-account";

export function signupOwner(data: {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone: string;
  // Opérateur mobile money de `phone` — WARAH y reverse les loyers payés en
  // ligne, aucun numéro séparé n'est demandé (voir /architect reversement,
  // révisé le 2026-09-28).
  payoutOperator: PayoutOperator;
  city: string;
  residenceCountry: string;
}): Promise<{ user: WARAHUser }> {
  return api.post<{ user: WARAHUser }>("/auth/signup/owner", data);
}

export function signupManager(data: {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone: string;
  payoutOperator: PayoutOperator;
  city: string;
}): Promise<{ user: WARAHUser }> {
  return api.post<{ user: WARAHUser }>("/auth/signup/manager", data);
}
