/* LEONI QMS — Service Worker (Web Push / PWA) */
const CACHE_NAME = 'leoni-qms-v1';
const API_BASE = 'http://localhost:3000/api';
const DB_NAME = 'qv-push-db';
const DB_STORE = 'kv';

/* ------------------------------------------------------------------ */
/* Cache des assets statiques (install)                                */
/* ------------------------------------------------------------------ */
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(['/', '/manifest.json']))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  if (event.request.url.includes('/api/')) return;
  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request))
  );
});

/* ------------------------------------------------------------------ */
/* IndexedDB : stockage du token pour les appels d'etat               */
/* ------------------------------------------------------------------ */
function openDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(DB_STORE)) db.createObjectStore(DB_STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function idbGet(key) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(DB_STORE, 'readonly');
    const get = tx.objectStore(DB_STORE).get(key);
    get.onsuccess = () => resolve(get.result);
    get.onerror = () => reject(get.error);
  });
}

async function idbSet(key, value) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(DB_STORE, 'readwrite');
    tx.objectStore(DB_STORE).put(value, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SET_TOKEN') {
    idbSet('token', event.data.token);
  }
  if (event.data && event.data.type === 'CLEAR_TOKEN') {
    idbSet('token', null);
  }
});

/* ------------------------------------------------------------------ */
/* Web Push                                                           */
/* ------------------------------------------------------------------ */
self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    try {
      data = { title: 'LEONI QMS', body: event.data.text() };
    } catch {
      data = { title: 'LEONI QMS', body: 'Notification' };
    }
  }

  const options = {
    body: data.body || '',
    icon: data.icon || '/icons/icon-192.png',
    badge: data.badge || '/icons/icon-192.png',
    tag: data.tag,
    data: data.data || {},
    actions: data.actions || [],
    vibrate: data.vibrate || undefined,
    requireInteraction: data.requireInteraction || false,
    renotify: data.renotify || false,
  };

  event.waitUntil(self.registration.showNotification(data.title || 'LEONI QMS', options));
});

async function reportStatus(historyId, status) {
  const token = await idbGet('token');
  if (!token || !historyId) return;
  try {
    await fetch(`${API_BASE}/push/status`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ historyId, status }),
    });
  } catch {
    /* silencieux */
  }
}

self.addEventListener('notificationclick', (event) => {
  const notification = event.notification;
  const action = event.action;
  const historyId = notification.data.historyId;
  const data = notification.data;

  notification.close();

  if (action === 'dismiss') {
    event.waitUntil(reportStatus(historyId, 'dismissed'));
    return;
  }

  event.waitUntil(reportStatus(historyId, action === 'open' ? 'clicked' : 'opened'));

  const url = new URL(data && data.url ? data.url : '/dashboard', self.registration.scope);
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if (client.url.includes(url.pathname) && 'focus' in client) {
          client.postMessage({ type: 'NAVIGATE', url: url.href, payload: data || {} });
          return client.focus();
        }
      }
      return self.clients.openWindow(url.href);
    })
  );
});

self.addEventListener('notificationclose', (event) => {
  const historyId = event.notification.data && event.notification.data.historyId;
  if (historyId) event.waitUntil(reportStatus(historyId, 'dismissed'));
});