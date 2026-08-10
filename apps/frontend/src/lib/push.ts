import { api } from "./api";

// Convertit la clé publique VAPID (base64 URL-safe) au format Uint8Array
// attendu par PushManager.subscribe() — implémentation standard, aucune lib.
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++)
    outputArray[i] = rawData.charCodeAt(i);
  return outputArray;
}

export function isPushSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window
  );
}

export async function getCurrentSubscription(): Promise<PushSubscription | null> {
  if (!isPushSupported()) return null;
  const reg = await navigator.serviceWorker.getRegistration("/sw.js");
  if (!reg) return null;
  return reg.pushManager.getSubscription();
}

// Demande la permission navigateur, enregistre le service worker, s'abonne,
// puis enregistre l'abonnement côté backend (qui bascule aussi
// notificationConsent à ACCEPTED — voir WebPushService.subscribe()).
export async function subscribeToPush(): Promise<void> {
  if (!isPushSupported()) {
    throw new Error(
      "Les notifications push ne sont pas supportées par ce navigateur.",
    );
  }

  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    throw new Error(
      "Permission refusée — activez les notifications pour ce site dans les réglages de votre navigateur.",
    );
  }

  const registration = await navigator.serviceWorker.register("/sw.js");
  await navigator.serviceWorker.ready;

  const { publicKey } = await api.get<{ publicKey: string }>(
    "/push/vapid-public-key",
  );
  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(publicKey),
  });

  const json = subscription.toJSON();
  if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
    throw new Error("Abonnement push invalide — réessayez.");
  }

  await api.post("/push/subscribe", {
    endpoint: json.endpoint,
    keys: { p256dh: json.keys.p256dh, auth: json.keys.auth },
  });
}

// Désabonne le navigateur courant et informe le backend (qui ne repasse
// notificationConsent à DECLINED que si plus aucun appareil n'est abonné).
export async function unsubscribeFromPush(): Promise<void> {
  const subscription = await getCurrentSubscription();
  if (!subscription) return;
  const endpoint = subscription.endpoint;
  await subscription.unsubscribe();
  await api.post("/push/unsubscribe", { endpoint });
}

// Décline sans jamais solliciter la permission navigateur — pour l'écran
// "Plus tard" à l'inscription (NOT_ASKED), distinct d'un désabonnement réel.
export async function declineNotifications(): Promise<void> {
  await api.patch("/profile/notification-consent", { consent: "DECLINED" });
}
