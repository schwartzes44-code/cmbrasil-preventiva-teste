'use strict';
// Sem cache de arquivos: o ambiente de testes sempre recebe as atualizações.
self.addEventListener('install',e=>e.waitUntil(self.skipWaiting()));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('cmbrasil-preventiva')).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
