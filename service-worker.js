var CACHE_ACTUAL = "adep-app-v7";
var RECURSOS = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./css/app.css",
  "./css/boleta.css",
  "./js/app.js",
  "./js/plantillas.js",
  "./js/boleta.js",
  "./js/selector.js",
  "./js/pdf.js",
  "./js/calibracion.js",
  "./js/pwa.js",
  "./js/dialogos.js",
  "./js/vendor/html2canvas.min.js",
  "./js/vendor/jspdf.umd.min.js",
  "./assets/adep-logo-boleta.png",
  "./assets/logo-blanco.png",
  "./assets/icons/icon-192.png",
  "./assets/icons/icon-512.png",
  "./assets/icons/icon-512-maskable.png",
  "./assets/fonts/LiberationSans-Regular.ttf",
  "./assets/fonts/LiberationSans-Bold.ttf"
];

self.addEventListener("install", function (evento) {
  evento.waitUntil(caches.open(CACHE_ACTUAL).then(function (cache) {
    return cache.addAll(RECURSOS);
  }));
  self.skipWaiting();
});

self.addEventListener("activate", function (evento) {
  evento.waitUntil(caches.keys().then(function (nombres) {
    return Promise.all(nombres.filter(function (nombre) {
      return nombre.indexOf("adep-app-") === 0 && nombre !== CACHE_ACTUAL;
    }).map(function (nombre) { return caches.delete(nombre); }));
  }).then(function () { return self.clients.claim(); }));
});

self.addEventListener("fetch", function (evento) {
  var solicitud = evento.request;
  if (solicitud.method !== "GET") { return; }

  var url = new URL(solicitud.url);
  if (url.origin !== self.location.origin) { return; }

  if (solicitud.mode === "navigate") {
    evento.respondWith(fetch(solicitud).then(function (respuesta) {
      var copia = respuesta.clone();
      caches.open(CACHE_ACTUAL).then(function (cache) { cache.put("./index.html", copia); });
      return respuesta;
    }).catch(function () { return caches.match("./index.html"); }));
    return;
  }

  evento.respondWith(caches.match(solicitud).then(function (guardada) {
    return guardada || fetch(solicitud).then(function (respuesta) {
      if (respuesta.ok) {
        var copia = respuesta.clone();
        caches.open(CACHE_ACTUAL).then(function (cache) { cache.put(solicitud, copia); });
      }
      return respuesta;
    });
  }));
});