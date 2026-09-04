(function () {
  "use strict";

  var FALLBACK_IMAGE = "./kurti-01.jpg";
  var stateByImage = new WeakMap();
  var scheduled = false;

  function normalize(value) {
    return String(value || "").replace(/\s+/g, " ").trim().toLowerCase();
  }

  function allProducts() {
    var main = Array.isArray(window.AURA_PRODUCTS) ? window.AURA_PRODUCTS : [];
    var more = Array.isArray(window.AURA_MORE_PRODUCTS) ? window.AURA_MORE_PRODUCTS : [];
    return main.concat(more).filter(function (product) {
      return product && product.name && Array.isArray(product.images) && product.images.length;
    });
  }

  function productForImage(image) {
    var products = allProducts();
    var clues = [];
    if (image.alt) clues.push(image.alt);

    var card = image.closest && image.closest(
      ".product-card, .cart-item, .review-item, .aura-wishlist-card, .aura-recent-card, .product-sheet, .product-box"
    );
    if (card) {
      ["h3", "h2", "strong", "b"].forEach(function (selector) {
        var node = card.querySelector(selector);
        if (node && node.textContent) clues.push(node.textContent);
      });
    }

    var modalName = document.getElementById("modalName");
    if (image.closest && image.closest(".product-box") && modalName && modalName.textContent) {
      clues.push(modalName.textContent);
    }

    for (var c = 0; c < clues.length; c += 1) {
      var clue = normalize(clues[c]);
      if (!clue) continue;
      var exact = products.find(function (product) {
        return normalize(product.name) === clue;
      });
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
    if (!value || typeof value !== "string") return;
    var trimmed = value.trim();
    if (!trimmed || list.indexOf(trimmed) !== -1) return;
    list.push(trimmed);
  }

  function urlVariants(value) {
    var list = [];
    addCandidate(list, value);
    if (!/^https?:/i.test(value || "")) return list;

    try {
      var url = new URL(value);
      if (/\/cdn\/shop\/files\//.test(url.pathname)) {
        [900, 1200, 720].forEach(function (width) {
          var sized = new URL(url.toString());
          sized.searchParams.set("width", String(width));
          addCandidate(list, sized.toString());
        });

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
        urlVariants(source).forEach(function (variant) {
          addCandidate(list, variant);
        });
      });
    }
    urlVariants(current).forEach(function (variant) {
      addCandidate(list, variant);
    });
    addCandidate(list, FALLBACK_IMAGE);
    return list;
  }

  function absoluteKey(value) {
    try {
      return new URL(value, window.location.href).toString();
    } catch (error) {
      return value;
    }
  }

  function stateFor(image, product) {
    var key = product ? String(product.id == null ? product.name : product.id) : "unknown";
    var state = stateByImage.get(image);
    if (!state || state.key !== key) {
      state = { key: key, tried: Object.create(null), failures: 0 };
      stateByImage.set(image, state);
    }
    return state;
  }

  function markGood(image) {
    image.classList.remove("aura-image-repairing");
    image.classList.toggle("aura-image-fallback", !!(image.src && image.src.indexOf("kurti-01.jpg") !== -1));
    if (image.naturalWidth > 0) image.dataset.auraImageLoaded = "1";
  }

  function setSource(image, state, source) {
    var key = absoluteKey(source);
    state.tried[key] = true;
    image.classList.add("aura-image-repairing");
    image.referrerPolicy = "no-referrer";
    image.removeAttribute("srcset");
    image.removeAttribute("sizes");
    image.setAttribute("src", source);
  }

  function repair(image) {
    if (!(image instanceof HTMLImageElement)) return;
    if (image.closest(".hero")) return;

    var product = productForImage(image);
    var state = stateFor(image, product);
    var current = image.currentSrc || image.src || image.getAttribute("src") || "";
    if (current) state.tried[absoluteKey(current)] = true;
    state.failures += 1;

    var candidates = candidatesFor(product, current);
    var next = candidates.find(function (candidate) {
      return !state.tried[absoluteKey(candidate)];
    });

    if (!next) {
      if (image.getAttribute("src") !== FALLBACK_IMAGE) {
        setSource(image, state, FALLBACK_IMAGE);
      } else {
        markGood(image);
      }
      return;
    }

    setSource(image, state, next);
  }

  function prepareImage(image) {
    if (!(image instanceof HTMLImageElement)) return;
    if (image.closest(".hero")) return;

    if (image.dataset.auraRepairReady !== "1") {
      image.dataset.auraRepairReady = "1";
      image.referrerPolicy = "no-referrer";
      image.decoding = "async";
      if (!image.closest(".product-gallery, .gallery")) image.loading = "lazy";
      image.addEventListener("error", function () {
        repair(image);
      });
      image.addEventListener("load", function () {
        if (image.naturalWidth > 0) markGood(image);
      });
    }

    if (image.complete && image.naturalWidth === 0 && image.getAttribute("src")) {
      repair(image);
    }
  }

  function enhanceImages() {
    document.querySelectorAll([
      ".product-media img",
      ".product-gallery > img",
      ".cart-item > img",
      ".review-item img",
      ".aura-wishlist-card img",
      ".aura-recent-card img",
      "#productGrid img",
      ".product-box .gallery img",
      "#modalImage"
    ].join(",")).forEach(prepareImage);
  }

  function enhanceSemantics() {
    document.querySelectorAll(".product-card").forEach(function (card) {
      if (card.dataset.auraPremiumReady) return;
      card.dataset.auraPremiumReady = "1";
      card.setAttribute("role", "group");
    });

    document.querySelectorAll(".view-details, .add-to-bag, .checkout-button, .primary-button, .primary.full").forEach(function (button) {
      if (!button.getAttribute("aria-label") && button.textContent) {
        button.setAttribute("aria-label", button.textContent.replace(/\s+/g, " ").trim());
      }
    });

    var cart = document.querySelector(".cart-drawer");
    if (cart && !cart.getAttribute("aria-label")) cart.setAttribute("aria-label", "Shopping bag");

    document.body.classList.add("aura-design-v3");
  }

  function decorateWithoutMovingAppNodes() {
    var hero = document.querySelector(".hero");
    if (hero && !hero.querySelector(".aura-v3-mark")) {
      var mark = document.createElement("span");
      mark.className = "aura-v3-mark";
      mark.setAttribute("aria-hidden", "true");
      mark.textContent = "EST. 2026";
      mark.style.cssText = "position:absolute;z-index:3;left:34px;bottom:30px;color:rgba(255,255,255,.64);font-size:6px;font-weight:800;letter-spacing:2px;pointer-events:none";
      hero.appendChild(mark);
    }
  }

  function run() {
    scheduled = false;
    enhanceImages();
    enhanceSemantics();
    decorateWithoutMovingAppNodes();
  }

  function schedule() {
    if (scheduled) return;
    scheduled = true;
    window.requestAnimationFrame(run);
  }

  document.addEventListener("error", function (event) {
    if (event.target instanceof HTMLImageElement) repair(event.target);
  }, true);

  new MutationObserver(schedule).observe(document.documentElement, {
    childList: true,
    subtree: true
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", schedule, { once: true });
  } else {
    schedule();
  }
})();
