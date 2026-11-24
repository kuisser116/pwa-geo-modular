'use strict';

const CACHE = 'geo-static-v1';
const FILES = ['./', './index.html', './styles.css', './geo-helper.js', './app.js', './manifest.json', './icons/icon.svg', './icons/icon-192.png', './icons/icon-512.png'];

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(FILES); }).then(function () { return self.skipWaiting(); }));
});

self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (ns) {
    return Promise.all(ns.map(function (n) { return n !== CACHE ? caches.delete(n) : Promise.resolve(false); }));
  }).then(function () { return self.clients.claim(); }));
});

self.addEventListener('fetch', function (e) {
  const p = e.request;
  if (p.method !== 'GET') return;
  e.respondWith(caches.match(p).then(function (c) {
    if (c) return c;
    return fetch(p).then(function (r) {
      if (r && r.status === 200 && r.type === 'basic') {
        const cp = r.clone();
        caches.open(CACHE).then(function (cache) { cache.put(p, cp); });
      }
      return r;
    }).catch(function () {
      if (p.mode === 'navigate') return caches.match('./index.html');
      return new Response('Sin conexión', { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
    });
  }));
});
