import { api } from "./api";
import type { WARAHUser } from "./auth-context";

export function signupOwner(data: {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone: string;
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
  city: string;
}): Promise<{ user: WARAHUser }> {
  return api.post<{ user: WARAHUser }>("/auth/signup/manager", data);
}
