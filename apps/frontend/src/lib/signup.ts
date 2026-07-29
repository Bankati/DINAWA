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
  cniRecto: File;
  cniVerso: File;
}): Promise<{ user: WARAHUser }> {
  const fd = new FormData();
  fd.append("email", data.email);
  fd.append("password", data.password);
  fd.append("firstName", data.firstName);
  fd.append("lastName", data.lastName);
  fd.append("phone", data.phone);
  fd.append("city", data.city);
  fd.append("residenceCountry", data.residenceCountry);
  fd.append("image", data.cniRecto);
  fd.append("imageBack", data.cniVerso);
  return api.post<{ user: WARAHUser }>("/auth/signup/owner", fd);
}

export function signupManager(data: {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone: string;
  city: string;
  cniRecto: File;
  cniVerso: File;
  referenceDocuments?: File[];
}): Promise<{ user: WARAHUser }> {
  const fd = new FormData();
  fd.append("email", data.email);
  fd.append("password", data.password);
  fd.append("firstName", data.firstName);
  fd.append("lastName", data.lastName);
  fd.append("phone", data.phone);
  fd.append("city", data.city);
  fd.append("image", data.cniRecto);
  fd.append("imageBack", data.cniVerso);
  data.referenceDocuments?.forEach((f) => fd.append("referenceDocuments", f));
  return api.post<{ user: WARAHUser }>("/auth/signup/manager", fd);
}
