// Cache the small site shell. Large videos, audio and studio pigments stay on the network.
const CACHE='tjkim-collection-v18';
const SHELL=['./','./index.html','./watch.html','./collection.css?revision=localized-covers-v18','./collection.js?revision=localized-covers-v18','./watch.js?revision=localized-covers-v18','./i18n.js?revision=18','./manifest.webmanifest','./icons/icon-192.png','./icons/icon-512.png'];
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(SHELL)).then(()=>self.skipWaiting())));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('tjkim-collection-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{const u=new URL(event.request.url);if(event.request.method!=='GET'||u.origin!==location.origin||event.request.headers.has('Range')||/\.(mp4|m4a|wav|h264|zip)$/.test(u.pathname)||u.pathname.includes('/art/')||u.pathname.includes('/api/'))return;
if(!u.pathname.startsWith('/series/site/')&&!u.pathname.endsWith('/series/manifest.json'))return;
event.respondWith(fetch(event.request).then(response=>{if(response.ok&&(!u.pathname.includes('studio')&&!u.pathname.includes('director')))(()=>{const copy=response.clone();caches.open(CACHE).then(cache=>cache.put(event.request,copy)).catch(()=>{});})();return response;}).catch(async()=>await caches.match(event.request)||((event.request.mode==='navigate')?await caches.match('./index.html'):Response.error())));
});
