(function () {
  "use strict";

  // Prevent window.name from carrying identifiers between unrelated websites.
  window.name = "";

  // GitHub Pages cannot set a custom frame-ancestors response header. This
  // defensive fallback blocks the storefront from being used inside a frame.
  if (window.self !== window.top) {
    document.documentElement.style.display = "none";
    try {
      window.top.location.replace(window.self.location.href);
    } catch (error) {
      // Keep the framed document hidden when top-level navigation is blocked.
    }
  }
})();
