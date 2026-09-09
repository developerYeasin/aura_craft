/* AuraCraft service worker — browser push for admin notifications. */

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: 'AuraCraft', body: event.data ? event.data.text() : '' };
  }

  event.waitUntil(
    self.registration.showNotification(data.title || 'AuraCraft', {
      body: data.body || '',
      icon: '/logo.svg',
      badge: '/logo.svg',
      tag: data.type || 'auracraft',
      renotify: true,
      data: { link: data.link || '/admin' },
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const link = event.notification.data?.link || '/admin';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      // Reuse an already-open admin tab where possible instead of piling up windows.
      for (const client of list) {
        if (client.url.includes('/admin') && 'focus' in client) {
          client.navigate(link).catch(() => {});
          return client.focus();
        }
      }
      return self.clients.openWindow ? self.clients.openWindow(link) : undefined;
    })
  );
});
