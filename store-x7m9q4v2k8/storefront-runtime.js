(function () {
  "use strict";

  if (!("serviceWorker" in navigator)) return;
  window.addEventListener("load", function () {
    navigator.serviceWorker.register("./sw.js?v=16", {
      scope: "./",
      updateViaCache: "none"
    }).then(function (registration) {
      return registration.update();
    }).catch(function () {
      /* The store remains fully usable when offline support is unavailable. */
    });
  }, { once: true });
})();
