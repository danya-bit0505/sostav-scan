// СОСТАВ.SCAN — service worker
// Кэширует "оболочку" приложения (HTML/манифест/иконку), чтобы интерфейс, история
// и безопасная полка открывались даже без сети. Сами запросы к базам составов
// (Роскачество, Open Food Facts) по-прежнему требуют интернета — это ожидаемо.
//
// Стратегия: network-first — при наличии сети всегда показываем самую свежую версию
// (важно, пока приложение часто обновляется), кэш используется только как офлайн-фолбэк,
// когда сети реально нет.

const CACHE_NAME = 'sostavscan-shell-v3';
const APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
  './icon.svg',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', (event)=>{
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache=> cache.addAll(APP_SHELL))
      .catch(()=>{ /* если один из ресурсов недоступен при установке — не блокируем воркер */ })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event)=>{
  event.waitUntil(
    caches.keys().then(keys=>
      Promise.all(keys.filter(k=> k!==CACHE_NAME).map(k=> caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event)=>{
  const req = event.request;
  if(req.method !== 'GET') return;

  let url;
  try{ url = new URL(req.url); }catch(e){ return; }

  // сторонние API (Роскачество, Open Food Facts, прокси, CDN-модели) всегда идут в сеть напрямую —
  // их нельзя обслуживать из кэша, состав должен быть актуальным
  if(url.origin !== self.location.origin) return;

  event.respondWith(
    fetch(req, {cache:'no-store'}).then(res=>{
      if(res && res.ok){
        const clone = res.clone();
        caches.open(CACHE_NAME).then(c=> c.put(req, clone));
      }
      return res;
    }).catch(()=> caches.match(req)) // сети нет — отдаём то, что успели закэшировать раньше
  );
});
