"use strict";

var CACHE_NAME = "aura-storefront-v9";
var CORE_FILES = [
  "./",
  "./index.html",
  "./tracking.html",
  "./tracking-admin.html",
  "./favicon.svg",
  "./manifest.webmanifest",
  "./products-data.js",
  "./more-products-data.js",
  "./catalog-priority.js",
  "./security-guard.js",
  "./tracking-config.js",
  "./assets/index-RrG8TB6h.js",
  "./assets/index-CadshQGV.css",
  "./search-enhancements.js",
  "./search-enhancements.css",
  "./premium-storefront.js?v=9",
  "./premium-storefront.css?v=7"
];

self.addEventListener("install", function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      return cache.addAll(CORE_FILES);
    }).then(function () {
      return self.skipWaiting();
    })
  );
});

self.addEventListener("activate", function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (key) {
        return key === CACHE_NAME ? null : caches.delete(key);
      }));
    }).then(function () {
      return self.clients.claim();
    })
  );
});

self.addEventListener("fetch", function (event) {
  var request = event.request;
  var url = new URL(request.url);
  if (request.method !== "GET" || url.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).then(function (response) {
        var copy = response.clone();
        caches.open(CACHE_NAME).then(function (cache) {
          cache.put("./index.html", copy);
        });
        return response;
      }).catch(function () {
        return caches.match("./index.html");
      })
    );
    return;
  }

  event.respondWith(
    caches.match(request).then(function (cached) {
      if (cached) return cached;
      return fetch(request).then(function (response) {
        if (response && response.ok) {
          var copy = response.clone();
          caches.open(CACHE_NAME).then(function (cache) {
            cache.put(request, copy);
          });
        }
        return response;
      });
    })
  );
});
