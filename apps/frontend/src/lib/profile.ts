import { api } from "./api";

export type NotificationConsent = "NOT_ASKED" | "ACCEPTED" | "DECLINED";

export interface OwnerProfileDetail {
  residenceCountry: string;
  betaUntil: string | null;
}

// Correspond à AuthMeResponse (GET /profile) — les champs User sont à plat
// à la racine, reminderDaysBefore/overdueGraceDays ne sont PAS sous
// `profile` (contrairement à ce que faisait l'ancien front Angular).
export interface ProfileUser {
  id: string;
  email: string | null;
  phone: string | null;
  firstName: string;
  lastName: string;
  city: string | null;
  role: "OWNER" | "TENANT" | "MANAGER" | "ADMIN";
  accountStatus: string;
  notificationConsent: NotificationConsent;
  reminderDaysBefore: number;
  overdueGraceDays: number;
  profilePhotoPath: string | null;
  profile: OwnerProfileDetail | null;
}

export interface UpdateProfileDto {
  firstName?: string;
  lastName?: string;
  reminderDaysBefore?: number;
  overdueGraceDays?: number;
}

export const profileApi = {
  get: () => api.get<ProfileUser>("/profile"),

  update: (dto: UpdateProfileDto, photo?: File) => {
    const formData = new FormData();
    if (dto.firstName !== undefined)
      formData.append("firstName", dto.firstName);
    if (dto.lastName !== undefined) formData.append("lastName", dto.lastName);
    if (dto.reminderDaysBefore !== undefined)
      formData.append("reminderDaysBefore", String(dto.reminderDaysBefore));
    if (dto.overdueGraceDays !== undefined)
      formData.append("overdueGraceDays", String(dto.overdueGraceDays));
    if (photo) formData.append("photo", photo);
    return api.patch<ProfileUser>("/profile", formData);
  },

  updateNotificationConsent: (consent: "ACCEPTED" | "DECLINED") =>
    api.patch<ProfileUser>("/profile/notification-consent", { consent }),

  deleteAccount: () => api.delete<{ message: string }>("/profile"),
};
