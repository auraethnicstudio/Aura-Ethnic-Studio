(function () {
  "use strict";

  var mainCount = Array.isArray(window.AURA_PRODUCTS) ? window.AURA_PRODUCTS.length : 0;
  var moreCount = Array.isArray(window.AURA_MORE_PRODUCTS) ? window.AURA_MORE_PRODUCTS.length : 0;
  var totalProducts = mainCount + moreCount;
  var quickSearches = [
    ["All", ""],
    ["Swati Rathi", "swati rathi"],
    ["Kurta Sets", "kurta set"],
    ["Long Kurta", "long kurta"],
    ["Short Kurta", "short kurta"],
    ["Modal Cotton", "modal cotton"],
    ["Georgette", "georgette"],
    ["Mulmul", "mulmul"],
    ["Rayon", "rayon"],
    ["Pink", "pink"],
    ["Black", "black"]
  ];
  var enhancementScheduled = false;

  function setReactInputValue(input, value) {
    var descriptor = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value");
    if (descriptor && descriptor.set) {
      descriptor.set.call(input, value);
    } else {
      input.value = value;
    }
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
  }

  function updateControls(input, clearButton, chipButtons) {
    var query = input.value.trim().toLowerCase();
    clearButton.hidden = query.length === 0;
    chipButtons.forEach(function (button) {
      button.classList.toggle("is-active", button.dataset.query === query);
    });
  }

  function makeQuickSearch(input, clearButton) {
    var bar = document.createElement("div");
    var label = document.createElement("span");
    var list = document.createElement("div");

    bar.className = "aura-quick-search";
    bar.setAttribute("aria-label", "Popular product searches");
    label.className = "aura-quick-search-label";
    label.textContent = "Quick find";
    list.className = "aura-quick-search-list";

    quickSearches.forEach(function (item) {
      var button = document.createElement("button");
      button.type = "button";
      button.className = "aura-search-chip";
      button.dataset.query = item[1];
      button.textContent = item[0];
      button.addEventListener("click", function () {
        setReactInputValue(input, item[1]);
        updateControls(input, clearButton, Array.from(list.children));
        var collection = document.querySelector(".collection");
        if (collection) {
          collection.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      });
      list.appendChild(button);
    });

    bar.appendChild(label);
    bar.appendChild(list);
    updateControls(input, clearButton, Array.from(list.children));
    return bar;
  }

  function escapeHtml(value) {
    return String(value == null ? "" : value).replace(/[&<>\"']/g, function (character) {
      return {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
      }[character];
    });
  }

  function withImageWidth(source, width) {
    if (!source || !/^https?:/i.test(source)) return source;
    try {
      var url = new URL(source);
      var isShopifyImage = /\/cdn\/shop\/files\//.test(url.pathname);
      if (!isShopifyImage) return source;
      url.searchParams.set("width", String(width));
      return url.toString();
    } catch (error) {
      return source;
    }
  }

  function optimizeImage(image, width) {
    if (!image) return;
    image.loading = "lazy";
    image.decoding = "async";
    image.referrerPolicy = "no-referrer";
    var source = image.getAttribute("src") || image.src;
    var optimizedSource = withImageWidth(source, width);
    if (optimizedSource && optimizedSource !== source) {
      image.src = optimizedSource;
    }
    image.dataset.auraOptimized = String(width);
  }

  function enhanceImages() {
    document.querySelectorAll(".product-media img").forEach(function (image) {
      optimizeImage(image, 640);
    });
    document.querySelectorAll(".thumbnails img").forEach(function (image) {
      optimizeImage(image, 180);
    });
    document.querySelectorAll(".aura-swati-card img").forEach(function (image) {
      optimizeImage(image, 520);
    });
    document.querySelectorAll(".product-gallery > img").forEach(function (image) {
      image.decoding = "async";
      image.referrerPolicy = "no-referrer";
    });
  }

  function enhancePrivacy() {
    document.querySelectorAll('a[href^="http"]').forEach(function (link) {
      link.referrerPolicy = "no-referrer";
      var rel = (link.getAttribute("rel") || "").split(/\s+/).filter(Boolean);
      ["noopener", "noreferrer"].forEach(function (value) {
        if (rel.indexOf(value) === -1) rel.push(value);
      });
      link.setAttribute("rel", rel.join(" "));
    });
  }

  function searchAndScroll(input, query) {
    setReactInputValue(input, query);
    var collection = document.querySelector(".collection");
    if (collection) collection.scrollIntoView({ behavior: "smooth", block: "start" });
    scheduleEnhancement();
  }

  function makeSwatiSection(input) {
    var products = Array.isArray(window.AURA_SWATI_RATHI_PRODUCTS)
      ? window.AURA_SWATI_RATHI_PRODUCTS.slice(0, 6)
      : [];
    var total = window.AURA_SWATI_RATHI_COUNT || products.length;
    var section = document.createElement("section");
    section.id = "swati-edit";
    section.className = "aura-swati-edit section";
    section.innerHTML = [
      '<div class="aura-swati-heading">',
      '<div><p class="eyebrow">CELEBRITY STYLE EDIT</p><h2>The Swati Rathi <em>Edit</em></h2></div>',
      '<p>A dedicated selection of the styles customers love—now easy to discover without changing the main collection order.</p>',
      '</div>',
      '<div class="aura-swati-rail">',
      products.map(function (product) {
        var image = product.images && product.images[0] ? withImageWidth(product.images[0], 520) : "";
        return [
          '<article class="aura-swati-card">',
          '<button type="button" class="aura-swati-product" data-query="', escapeHtml(product.name), '" aria-label="View ', escapeHtml(product.name), '">',
          '<span class="aura-swati-image"><img src="', escapeHtml(image), '" alt="', escapeHtml(product.name), '" loading="lazy" decoding="async"><b>BESTSELLER</b></span>',
          '<span class="aura-swati-copy"><small>', escapeHtml(product.fabric || "Chikankari"), '</small><strong>', escapeHtml(product.name), '</strong><span>₹', escapeHtml(product.price || 500), '</span></span>',
          '</button>',
          '</article>'
        ].join("");
      }).join(""),
      '</div>',
      '<button type="button" class="aura-swati-all">VIEW ALL ', escapeHtml(total), ' STYLES <span>→</span></button>'
    ].join("");

    section.querySelectorAll("[data-query]").forEach(function (button) {
      button.addEventListener("click", function () {
        searchAndScroll(input, button.dataset.query || "swati rathi");
      });
    });
    section.querySelector(".aura-swati-all").addEventListener("click", function () {
      searchAndScroll(input, "swati rathi");
    });
    return section;
  }

  function ensureSwatiSection(input) {
    if (document.getElementById("swati-edit") || !window.AURA_SWATI_RATHI_COUNT) return;
    var collection = document.querySelector(".collection");
    if (collection) collection.insertAdjacentElement("afterend", makeSwatiSection(input));
  }

  function makeCodBanner() {
    var banner = document.createElement("aside");
    banner.className = "aura-cod-banner";
    banner.setAttribute("aria-label", "Payment information");
    banner.innerHTML = [
      '<span class="aura-cod-icon" aria-hidden="true">₹</span>',
      '<div class="aura-cod-copy"><small>PAYMENT UPDATE</small><strong>Cash on Delivery is not available</strong>',
      '<p>Every order is confirmed on WhatsApp before online payment. Dispatch and tracking details are shared after confirmation.</p>',
      '<span>14-day returns&nbsp; · &nbsp;₹0 shipping&nbsp; · &nbsp;3–4 day delivery</span></div>',
      '<button type="button">HOW ORDERING WORKS <b>→</b></button>'
    ].join("");
    banner.querySelector("button").addEventListener("click", function () {
      var target = document.querySelector(".policies") || document.querySelector(".cod-note");
      if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
    });
    return banner;
  }

  function ensureCodBanner() {
    if (document.querySelector(".aura-cod-banner")) return;
    var trustStrip = document.querySelector(".trust-strip");
    if (trustStrip) trustStrip.insertAdjacentElement("afterend", makeCodBanner());
  }

  function ensureModalCodNotice() {
    document.querySelectorAll(".product-details .detail-scroll").forEach(function (details) {
      if (details.querySelector(".aura-modal-cod")) return;
      var price = details.querySelector(".modal-price");
      if (!price) return;
      var notice = document.createElement("div");
      notice.className = "aura-modal-cod";
      notice.innerHTML = '<b>PREPAID ORDER</b><span>COD unavailable · WhatsApp confirmation before payment</span>';
      price.insertAdjacentElement("afterend", notice);
    });
  }

  function makeFilterToggle(tools) {
    var toggle = document.createElement("button");
    toggle.type = "button";
    toggle.className = "aura-mobile-filter-toggle";
    toggle.setAttribute("aria-expanded", "false");
    toggle.textContent = "FILTERS";
    toggle.addEventListener("click", function () {
      var isOpen = tools.classList.toggle("filters-open");
      toggle.setAttribute("aria-expanded", String(isOpen));
      toggle.textContent = isOpen ? "CLOSE" : "FILTERS";
    });
    return toggle;
  }

  function makeReviewSection() {
    var section = document.createElement("section");
    section.id = "reviews";
    section.className = "aura-reviews section";
    section.innerHTML = [
      '<div class="aura-review-heading">',
      '<p class="eyebrow">CUSTOMER REVIEWS</p>',
      '<h2>Real experiences.<br><em>Shared honestly.</em></h2>',
      '<p>Aura publishes feedback only from confirmed customers. No copied testimonials, no made-up ratings—just genuine experiences after delivery.</p>',
      '<span class="aura-review-pill">VERIFIED ORDERS ONLY</span>',
      '</div>',
      '<div class="aura-review-body">',
      '<div class="aura-review-standards">',
      '<article><span>01</span><small>CONFIRMED ORDER</small><h3>Reviews are verified</h3><p>We match feedback with a completed Aura order before it appears in the gallery.</p></article>',
      '<article><span>02</span><small>PHOTO REVIEWS</small><h3>Show the real fit</h3><p>Customers can share an optional product photo along with fabric, colour and fitting feedback.</p></article>',
      '<article><span>03</span><small>HONEST EXPERIENCE</small><h3>Your words stay yours</h3><p>We publish genuine feedback without changing its meaning—positive or constructive.</p></article>',
      '</div>',
      '<div class="aura-review-callout">',
      '<div><span class="aura-review-stars" aria-hidden="true">☆ ☆ ☆ ☆ ☆</span><strong>Purchased from Aura?</strong><p>Share your honest review after delivery. Add the product name, size and an optional photo.</p></div>',
      '<a href="https://wa.me/917357924991?text=Hello%20Aura%20Ethnic%20Studio%2C%20I%20would%20like%20to%20share%20my%20honest%20product%20review." target="_blank" rel="noopener noreferrer" referrerpolicy="no-referrer">SHARE YOUR REVIEW <span>→</span></a>',
      '</div>',
      '</div>'
    ].join("");
    return section;
  }

  function ensureReviewSection() {
    if (document.getElementById("reviews")) return;
    var editorial = document.querySelector(".editorial");
    var policies = document.querySelector(".policies");
    if (editorial) {
      editorial.insertAdjacentElement("afterend", makeReviewSection());
    } else if (policies) {
      policies.insertAdjacentElement("beforebegin", makeReviewSection());
    }
  }

  function enhanceCatalog() {
    enhancementScheduled = false;
    ensureReviewSection();
    ensureCodBanner();
    ensureModalCodNotice();
    enhancePrivacy();
    var input = document.getElementById("catalog-search");
    var tools = document.querySelector(".catalog-tools");
    if (!input || !tools) return;

    input.placeholder = window.matchMedia("(max-width: 760px)").matches
      ? "Search " + totalProducts + " styles…"
      : "Search " + totalProducts + " styles by name, colour or fabric…";
    input.setAttribute("aria-label", "Search all " + totalProducts + " Aura Ethnic Studio products");
    input.setAttribute("autocomplete", "off");
    input.setAttribute("enterkeyhint", "search");

    var searchField = input.closest(".search-field") || input.parentElement;
    var clearButton = searchField.querySelector(".aura-search-clear");
    if (!clearButton) {
      clearButton = document.createElement("button");
      clearButton.type = "button";
      clearButton.className = "aura-search-clear";
      clearButton.setAttribute("aria-label", "Clear product search");
      clearButton.title = "Clear search";
      clearButton.textContent = "×";
      clearButton.addEventListener("click", function () {
        setReactInputValue(input, "");
        input.focus({ preventScroll: true });
        scheduleEnhancement();
      });
      searchField.appendChild(clearButton);
    }

    var shortcut = searchField.querySelector(".aura-search-shortcut");
    if (!shortcut) {
      shortcut = document.createElement("span");
      shortcut.className = "aura-search-shortcut";
      shortcut.setAttribute("aria-hidden", "true");
      shortcut.textContent = "/";
      searchField.appendChild(shortcut);
    }

    var quickBar = document.querySelector(".aura-quick-search");
    if (!quickBar) {
      quickBar = makeQuickSearch(input, clearButton);
      tools.insertAdjacentElement("afterend", quickBar);
    }

    var filterToggle = tools.querySelector(".aura-mobile-filter-toggle");
    if (!filterToggle) {
      tools.appendChild(makeFilterToggle(tools));
    }

    var chips = Array.from(quickBar.querySelectorAll(".aura-search-chip"));
    updateControls(input, clearButton, chips);
    ensureSwatiSection(input);
    enhanceImages();
  }

  function scheduleEnhancement() {
    if (enhancementScheduled) return;
    enhancementScheduled = true;
    window.requestAnimationFrame(enhanceCatalog);
  }

  document.addEventListener("keydown", function (event) {
    var target = event.target;
    var typing = target && (
      /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName) || target.isContentEditable
    );
    if (event.key === "/" && !typing) {
      var input = document.getElementById("catalog-search");
      if (input) {
        event.preventDefault();
        input.focus();
        input.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }
  });

  document.addEventListener("input", function (event) {
    if (event.target && event.target.id === "catalog-search") {
      scheduleEnhancement();
    }
  });

  var observer = new MutationObserver(scheduleEnhancement);
  observer.observe(document.documentElement, { childList: true, subtree: true });
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", scheduleEnhancement, { once: true });
  } else {
    scheduleEnhancement();
  }
})();
