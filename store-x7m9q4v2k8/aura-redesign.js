(function () {
  "use strict";

  var FALLBACK_IMAGE = "./kurti-01.jpg";
  var stateByImage = new WeakMap();
  var scheduled = false;

  function allProducts() {
    var main = Array.isArray(window.AURA_PRODUCTS) ? window.AURA_PRODUCTS : [];
    var more = Array.isArray(window.AURA_MORE_PRODUCTS) ? window.AURA_MORE_PRODUCTS : [];
    return main.concat(more).filter(function (product) {
      return product && product.name && Array.isArray(product.images) && product.images.length;
    });
  }

  function normalize(value) {
    return String(value || "").replace(/\s+/g, " ").trim().toLowerCase();
  }

  function productForImage(image) {
    var products = allProducts();
    var clues = [];
    if (image.alt) clues.push(image.alt);
    var card = image.closest && image.closest(".product-card, .cart-item, .review-item, .aura-wishlist-card, .aura-recent-card, .product-sheet");
    if (card) {
      ["h3", "h2", "strong", "b"].forEach(function (selector) {
        var node = card.querySelector(selector);
        if (node && node.textContent) clues.push(node.textContent);
      });
    }
    for (var c = 0; c < clues.length; c += 1) {
      var clue = normalize(clues[c]);
      if (!clue) continue;
      var exact = products.find(function (product) { return normalize(product.name) === clue; });
      if (exact) return exact;
      var close = products.find(function (product) {
        var name = normalize(product.name);
        return name.indexOf(clue) !== -1 || clue.indexOf(name) !== -1;
      });
      if (close) return close;
    }
    return null;
  }

  function addCandidate(list, value) {
    if (!value || typeof value !== "string" || list.indexOf(value) !== -1) return;
    list.push(value);
  }

  function urlVariants(value) {
    var list = [];
    addCandidate(list, value);
    if (!/^https?:/i.test(value || "")) return list;
    try {
      var url = new URL(value);
      if (/\/cdn\/shop\/files\//.test(url.pathname)) {
        var medium = new URL(url.toString());
        medium.searchParams.set("width", "900");
        addCandidate(list, medium.toString());

        var original = new URL(url.toString());
        original.searchParams.delete("width");
        addCandidate(list, original.toString());
      }
    } catch (error) {}
    return list;
  }

  function candidatesFor(product, current) {
    var list = [];
    if (product && Array.isArray(product.images)) {
      product.images.forEach(function (source) {
        urlVariants(source).forEach(function (variant) { addCandidate(list, variant); });
      });
    }
    urlVariants(current).forEach(function (variant) { addCandidate(list, variant); });
    addCandidate(list, FALLBACK_IMAGE);
    return list;
  }

  function stateFor(image, product) {
    var key = product ? String(product.id == null ? product.name : product.id) : "unknown";
    var state = stateByImage.get(image);
    if (!state || state.key !== key) {
      state = { key: key, tried: Object.create(null) };
      stateByImage.set(image, state);
    }
    return state;
  }

  function markGood(image) {
    image.classList.remove("aura-image-repairing");
    if (image.src && image.src.indexOf("kurti-01.jpg") !== -1) image.classList.add("aura-image-fallback");
    else image.classList.remove("aura-image-fallback");
  }

  function repair(image) {
    if (!(image instanceof HTMLImageElement)) return;
    if (image.closest(".hero")) return;
    var product = productForImage(image);
    var state = stateFor(image, product);
    var current = image.currentSrc || image.src || image.getAttribute("src") || "";
    if (current) state.tried[current] = true;

    var candidates = candidatesFor(product, current);
    var next = candidates.find(function (candidate) {
      try {
        return !state.tried[new URL(candidate, window.location.href).toString()];
      } catch (error) {
        return !state.tried[candidate];
      }
    });

    if (!next) {
      if (image.getAttribute("src") !== FALLBACK_IMAGE) {
        image.classList.add("aura-image-repairing");
        image.setAttribute("src", FALLBACK_IMAGE);
      } else {
        markGood(image);
      }
      return;
    }

    try { state.tried[new URL(next, window.location.href).toString()] = true; }
    catch (error) { state.tried[next] = true; }
    image.classList.add("aura-image-repairing");
    image.setAttribute("src", next);
  }

  function prepareImage(image) {
    if (!(image instanceof HTMLImageElement)) return;
    if (image.dataset.auraRepairReady !== "1") {
      image.dataset.auraRepairReady = "1";
      image.addEventListener("error", function () { repair(image); });
      image.addEventListener("load", function () { markGood(image); });
      if (!image.closest(".hero, .product-gallery")) image.loading = "lazy";
      image.decoding = "async";
    }
    if (image.complete && image.naturalWidth === 0 && image.getAttribute("src")) repair(image);
  }

  function enhanceImages() {
    document.querySelectorAll(".product-media img, .product-gallery > img, .cart-item > img, .review-item img, .aura-wishlist-card img, .aura-recent-card img").forEach(prepareImage);
  }

  function enhanceSemantics() {
    document.querySelectorAll(".product-card").forEach(function (card) {
      if (!card.dataset.auraPremiumReady) {
        card.dataset.auraPremiumReady = "1";
        card.setAttribute("role", "group");
      }
    });
    document.querySelectorAll(".view-details, .add-to-bag, .checkout-button, .primary-button").forEach(function (button) {
      if (!button.getAttribute("aria-label") && button.textContent) {
        button.setAttribute("aria-label", button.textContent.replace(/\s+/g, " ").trim());
      }
    });
    document.body.classList.add("aura-design-ready");
  }

  function run() {
    scheduled = false;
    enhanceImages();
    enhanceSemantics();
  }

  function schedule() {
    if (scheduled) return;
    scheduled = true;
    window.requestAnimationFrame(run);
  }

  document.addEventListener("error", function (event) {
    if (event.target instanceof HTMLImageElement) repair(event.target);
  }, true);

  new MutationObserver(schedule).observe(document.documentElement, { childList: true, subtree: true });

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", schedule, { once: true });
  else schedule();
})();
