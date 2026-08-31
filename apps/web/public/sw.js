// Service worker de Web Push (sección 2 y 7): solo maneja push/click, sin
// cachear nada — no es un service worker de offline-first.

self.addEventListener('push', (event) => {
  if (!event.data) return;

  const { tipo, payload } = event.data.json();
  const MENSAJE_TIPO = { lead_asignado: 'Te asignaron un lead nuevo' };
  const titulo = MENSAJE_TIPO[tipo] ?? 'CRM Automotor';

  event.waitUntil(
    self.registration.showNotification(titulo, {
      body: payload?.leadId ? `Lead ${payload.leadId}` : undefined,
      tag: tipo,
      data: payload,
    }),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: 'window' }).then((clientList) => {
      if (clientList.length > 0) return clientList[0].focus();
      return self.clients.openWindow('/');
    }),
  );
});
