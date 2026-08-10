// Service worker minimal — affichage des notifications push WARAH uniquement.
// Payload envoyé par le backend (voir web-push.service.ts) : { title, body, url }.

self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = {};
  }
  const title = data.title || 'WARAH';
  const url = data.url || '/';

  event.waitUntil(
    self.registration.showNotification(title, {
      body: data.body || '',
      icon: '/warah-icon.png',
      badge: '/warah-icon.png',
      data: { url },
    }),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientsArr) => {
      const existing = clientsArr.find((c) => c.url.includes(self.location.origin));
      if (existing) {
        existing.navigate(url);
        return existing.focus();
      }
      return self.clients.openWindow(url);
    }),
  );
});
