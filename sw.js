// Locus Şirket Takip Sistemi - Service Worker
// Yeni sürüm yayınladığında SURUM değerini artır (v5, v6...) ki telefonlar güncellemeyi alsın.
const SURUM = 'locus-v30';
const DOSYALAR = [
  './', './index.html', './manifest.json',
  './logo-renkli.png', './logo-beyaz.png', './sembol-beyaz.png',
  './ikon-32.png', './ikon-180.png', './ikon-192.png', './ikon-512.png'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(SURUM).then(c => c.addAll(DOSYALAR)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(k => Promise.all(k.filter(x => x !== SURUM).map(x => caches.delete(x))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const r = e.request;
  if (r.method !== 'GET' || new URL(r.url).origin !== location.origin) return; // API isteklerine dokunma

  // Sayfanın kendisi: önce internet (güncel sürüm), yoksa önbellek
  if (r.mode === 'navigate') {
    e.respondWith(fetch(r).then(y => {
      const kopya = y.clone(); caches.open(SURUM).then(c => c.put('./index.html', kopya)); return y;
    }).catch(() => caches.match('./index.html')));
    return;
  }
  // Görseller vb.: önce önbellek
  e.respondWith(caches.match(r).then(v => v || fetch(r)));
});

// ---------- Telefon bildirimleri (Firebase Cloud Messaging) ----------
// Sunucu "data" mesajı gönderir; bildirimi burada gösteririz (iOS her bildirimin gösterilmesini şart koşar).
self.addEventListener('push', e => {
  let d = {};
  try { const j = e.data ? e.data.json() : {}; d = j.data || j; } catch (x) { d = { baslik: 'Locus', govde: e.data ? e.data.text() : '' }; }
  const baslik = d.baslik || (d.notification && d.notification.title) || 'Locus Şirket Takip';
  e.waitUntil(self.registration.showNotification(baslik, {
    body: d.govde || (d.notification && d.notification.body) || '',
    icon: './ikon-192.png', badge: './ikon-192.png',
    tag: d.link || undefined, renotify: true,
    data: { link: d.link || './' }
  }));
});

// Bildirime dokununca: açık uygulama varsa ona geç ve ilgili sayfayı aç, yoksa yeni pencere
self.addEventListener('notificationclick', e => {
  e.notification.close();
  const link = (e.notification.data && e.notification.data.link) || './';
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(l => {
    const acik = l.find(c => c.url.startsWith(self.registration.scope));
    if (acik) { acik.postMessage({ tip: 'git', link }); return acik.focus(); }
    return self.clients.openWindow(link);
  }));
});
