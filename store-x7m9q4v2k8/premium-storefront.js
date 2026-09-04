(function () {
  "use strict";

  var TRACKING_ORIGIN = String(window.AURA_TRACKING_API_ORIGIN || "").replace(/\/+$/, "");
  var ORDER_API_URL = TRACKING_ORIGIN + "/api/orders";
  var TRACKING_PAGE_URL = new URL("./tracking.html", window.location.href).toString();
  var ORDER_REQUEST_KEY = "auraPendingOrderRequestV1";
  var STORE_WHATSAPP_NUMBER = "917357924991";

  var FAVORITES_KEY = "auraEthnicFavouritesV1";
  var RECENT_KEY = "auraEthnicRecentlyViewedV1";
  var DISMISS_KEY = "auraInstallDismissedAt";
  var lastModalProduct = "";
  var upgradeScheduled = false;
  var deepLinkHandled = false;
  var installPrompt = null;
  var installEligibleAt = 0;
  var toastTimer = null;

  function escapeHtml(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, function (character) {
      return {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
      }[character];
    });
  }

  function getProducts() {
    var main = Array.isArray(window.AURA_PRODUCTS) ? window.AURA_PRODUCTS : [];
    var more = Array.isArray(window.AURA_MORE_PRODUCTS) ? window.AURA_MORE_PRODUCTS : [];
    return main.concat(more).filter(function (product) {
      return product && product.id != null && product.name && Array.isArray(product.images);
    });
  }

  function findProductByName(name) {
    var normalized = String(name || "").trim().toLowerCase();
    return getProducts().find(function (product) {
      return String(product.name).trim().toLowerCase() === normalized;
    }) || null;
  }

  function findProductById(id) {
    var normalized = String(id == null ? "" : id);
    return getProducts().find(function (product) {
      return String(product.id) === normalized;
    }) || null;
  }

  function getStoredArray(key) {
    try {
      var parsed = JSON.parse(localStorage.getItem(key) || "[]");
      return Array.isArray(parsed) ? parsed.map(String) : [];
    } catch (error) {
      return [];
    }
  }

  function setStoredArray(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      /* Private browsing can reject storage; the storefront still works. */
    }
  }

  function withImageWidth(source, width) {
    if (!source || !/^https?:/i.test(source)) return source || "./kurti-01.jpg";
    try {
      var url = new URL(source);
      if (/\/cdn\/shop\/files\//.test(url.pathname)) {
        url.searchParams.set("width", String(width));
      }
      return url.toString();
    } catch (error) {
      return source;
    }
  }

  function setReactInputValue(input, value) {
    var descriptor = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value");
    if (descriptor && descriptor.set) descriptor.set.call(input, value);
    else input.value = value;
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
  }

  function icon(name) {
    var paths = {
      heart: '<path d="M20.8 4.7a5.5 5.5 0 0 0-7.8 0L12 5.8l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 21l7.8-7.4 1.1-1.1a5.5 5.5 0 0 0-.1-7.8Z"/>',
      share: '<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.6 10.5 6.8-4M8.6 13.5l6.8 4"/>',
      message: '<path d="M21 11.5a8.4 8.4 0 0 1-9 8.4 9.4 9.4 0 0 1-4-.9L3 21l1.8-4.7a8.8 8.8 0 1 1 16.2-4.8Z"/>'
    };
    return '<svg viewBox="0 0 24 24" aria-hidden="true">' + (paths[name] || "") + "</svg>";
  }

  function showToast(message) {
    var current = document.querySelector(".aura-mini-toast");
    if (current) current.remove();
    window.clearTimeout(toastTimer);
    var toast = document.createElement("div");
    toast.className = "aura-mini-toast";
    toast.setAttribute("role", "status");
    toast.textContent = message;
    document.body.appendChild(toast);
    toastTimer = window.setTimeout(function () {
      toast.remove();
    }, 2300);
  }

  function configureBottomNav() {
    var nav = document.querySelector(".mobile-bottom-nav");
    if (!nav) return;
    var nativeItems = Array.from(nav.children).filter(function (item) {
      return !item.classList.contains("aura-wishlist-nav");
    });
    if (nativeItems[0]) nativeItems[0].classList.add("aura-nav-home");
    if (nativeItems[1]) nativeItems[1].classList.add("aura-nav-shop");
    if (nativeItems[2]) nativeItems[2].classList.add("aura-nav-search");
    if (nativeItems[3]) nativeItems[3].classList.add("aura-nav-bag");

    var wishlistButton = nav.querySelector(".aura-wishlist-nav");
    if (!wishlistButton) {
      wishlistButton = document.createElement("button");
      wishlistButton.type = "button";
      wishlistButton.className = "aura-wishlist-nav";
      wishlistButton.setAttribute("aria-label", "Open saved styles");
      wishlistButton.innerHTML = [
        '<span class="aura-nav-icon">', icon("heart"), "</span>",
        '<span class="aura-nav-label">SAVED</span>',
        '<span class="aura-nav-count" hidden>0</span>'
      ].join("");
      wishlistButton.addEventListener("click", openWishlist);
      nav.appendChild(wishlistButton);
    }
    updateWishlistCount();
  }

  function updateWishlistCount() {
    var count = getStoredArray(FAVORITES_KEY).length;
    document.querySelectorAll(".aura-nav-count").forEach(function (badge) {
      var label = count > 99 ? "99+" : String(count);
      if (badge.textContent !== label) badge.textContent = label;
      if (badge.hidden !== (count === 0)) badge.hidden = count === 0;
    });
    var heading = document.querySelector(".aura-wishlist-head h2");
    var headingText = "Saved Styles" + (count ? " · " + count : "");
    if (heading && heading.textContent !== headingText) heading.textContent = headingText;
  }

  function ensureWishlistDrawer() {
    if (document.querySelector(".aura-wishlist-layer")) return;
    var layer = document.createElement("div");
    layer.className = "aura-wishlist-layer";
    layer.setAttribute("aria-hidden", "true");
    layer.innerHTML = [
      '<button class="aura-wishlist-shade" type="button" aria-label="Close saved styles"></button>',
      '<aside class="aura-wishlist-drawer" role="dialog" aria-modal="true" aria-labelledby="aura-wishlist-title">',
      '<header class="aura-wishlist-head"><div><small>YOUR SHORTLIST</small><h2 id="aura-wishlist-title">Saved Styles</h2></div>',
      '<button class="aura-wishlist-close" type="button" aria-label="Close saved styles">×</button></header>',
      '<div class="aura-wishlist-list"></div>',
      "</aside>"
    ].join("");
    layer.querySelector(".aura-wishlist-shade").addEventListener("click", closeWishlist);
    layer.querySelector(".aura-wishlist-close").addEventListener("click", closeWishlist);
    document.body.appendChild(layer);
  }

  function renderWishlist() {
    ensureWishlistDrawer();
    var list = document.querySelector(".aura-wishlist-list");
    if (!list) return;
    var ids = getStoredArray(FAVORITES_KEY);
    var products = ids.map(findProductById).filter(Boolean);
    updateWishlistCount();
    if (!products.length) {
      list.innerHTML = [
        '<div class="aura-wishlist-empty">',
        "<b>♡</b><h3>Your saved list is empty</h3>",
        "<p>Tap the heart on any style and it will stay ready here for your next visit.</p>",
        '<button type="button">EXPLORE ALL STYLES</button>',
        "</div>"
      ].join("");
      list.querySelector("button").addEventListener("click", function () {
        closeWishlist();
        var collection = document.getElementById("collection");
        if (collection) collection.scrollIntoView({ behavior: "smooth", block: "start" });
      });
      return;
    }
    list.innerHTML = products.map(function (product) {
      var image = withImageWidth(product.images[0], 220);
      return [
        '<article class="aura-wishlist-card">',
        '<img src="', escapeHtml(image), '" alt="', escapeHtml(product.name), '" loading="lazy" decoding="async" referrerpolicy="no-referrer">',
        '<div><small>', escapeHtml(product.fabric || "Ethnic Style"), "</small><strong>", escapeHtml(product.name), "</strong><span>₹", escapeHtml(product.price || 500), "</span></div>",
        '<button type="button" data-product-id="', escapeHtml(product.id), '">VIEW</button>',
        "</article>"
      ].join("");
    }).join("");
    list.querySelectorAll("[data-product-id]").forEach(function (button) {
      button.addEventListener("click", function () {
        var product = findProductById(button.dataset.productId);
        if (product) openProduct(product);
      });
    });
  }

  function openWishlist() {
    ensureWishlistDrawer();
    renderWishlist();
    var layer = document.querySelector(".aura-wishlist-layer");
    layer.classList.add("is-open");
    layer.setAttribute("aria-hidden", "false");
    document.body.classList.add("aura-overlay-open");
    window.setTimeout(function () {
      var close = layer.querySelector(".aura-wishlist-close");
      if (close) close.focus();
    }, 50);
  }

  function closeWishlist() {
    var layer = document.querySelector(".aura-wishlist-layer");
    if (!layer) return;
    layer.classList.remove("is-open");
    layer.setAttribute("aria-hidden", "true");
    document.body.classList.remove("aura-overlay-open");
  }

  function waitForProductCard(product, attempt) {
    var cards = Array.from(document.querySelectorAll(".product-card"));
    var card = cards.find(function (item) {
      var title = item.querySelector("h3");
      return title && title.textContent.trim().toLowerCase() === product.name.trim().toLowerCase();
    });
    if (card) {
      var open = card.querySelector(".product-media, .view-details");
      if (open) open.click();
      return;
    }
    if (attempt < 20) {
      window.setTimeout(function () {
        waitForProductCard(product, attempt + 1);
      }, 80);
    }
  }

  function openProduct(product) {
    closeWishlist();
    var input = document.getElementById("catalog-search");
    var collection = document.getElementById("collection");
    if (!input) {
      window.setTimeout(function () { openProduct(product); }, 100);
      return;
    }
    setReactInputValue(input, product.name);
    if (collection) collection.scrollIntoView({ behavior: "smooth", block: "start" });
    waitForProductCard(product, 0);
  }

  function getRecentIds() {
    return getStoredArray(RECENT_KEY).filter(function (id, index, values) {
      return values.indexOf(id) === index && findProductById(id);
    }).slice(0, 8);
  }

  function rememberProduct(product) {
    if (!product) return;
    var id = String(product.id);
    var ids = getRecentIds().filter(function (value) { return value !== id; });
    ids.unshift(id);
    setStoredArray(RECENT_KEY, ids.slice(0, 8));
    renderRecent();
  }

  function ensureRecentSection() {
    var section = document.getElementById("aura-recent");
    if (section) return section;
    var anchor = document.getElementById("swati-edit") || document.querySelector(".collection");
    if (!anchor) return null;
    section = document.createElement("section");
    section.id = "aura-recent";
    section.className = "aura-recent section";
    section.hidden = true;
    section.innerHTML = [
      '<div class="aura-recent-head"><div><small>JUST FOR YOU</small><h2>Recently viewed</h2></div>',
      '<button type="button">CLEAR HISTORY</button></div>',
      '<div class="aura-recent-rail"></div>'
    ].join("");
    section.querySelector(".aura-recent-head button").addEventListener("click", function () {
      setStoredArray(RECENT_KEY, []);
      renderRecent();
    });
    anchor.insertAdjacentElement("afterend", section);
    return section;
  }

  function renderRecent() {
    var ids = getRecentIds();
    var section = ensureRecentSection();
    if (!section) return;
    var rail = section.querySelector(".aura-recent-rail");
    var products = ids.map(findProductById).filter(Boolean);
    var signature = products.map(function (product) { return String(product.id); }).join("|");
    if (section.hidden !== (products.length === 0)) section.hidden = products.length === 0;
    if (section.dataset.signature === signature) return;
    section.dataset.signature = signature;
    if (!products.length) {
      rail.innerHTML = "";
      return;
    }
    rail.innerHTML = products.map(function (product) {
      return [
        '<button class="aura-recent-card" type="button" data-product-id="', escapeHtml(product.id), '">',
        '<img src="', escapeHtml(withImageWidth(product.images[0], 420)), '" alt="', escapeHtml(product.name), '" loading="lazy" decoding="async" referrerpolicy="no-referrer">',
        '<span><small>', escapeHtml(product.fabric || "Ethnic Style"), "</small><strong>", escapeHtml(product.name), "</strong><b>₹", escapeHtml(product.price || 500), "</b></span>",
        "</button>"
      ].join("");
    }).join("");
    rail.querySelectorAll("[data-product-id]").forEach(function (button) {
      button.addEventListener("click", function () {
        var product = findProductById(button.dataset.productId);
        if (product) openProduct(product);
      });
    });
  }

  function productShareUrl(product) {
    var url = new URL(window.location.href);
    url.search = "";
    url.searchParams.set("product", String(product.id));
    url.hash = "collection";
    return url.toString();
  }

  function shareProduct(product) {
    var url = productShareUrl(product);
    var data = {
      title: product.name + " · Aura Ethnic Studio",
      text: product.name + " — ₹" + (product.price || 500) + " at Aura Ethnic Studio",
      url: url
    };
    if (navigator.share) {
      navigator.share(data).catch(function () {});
      return;
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(url).then(function () {
        showToast("Product link copied");
      }).catch(function () {
        showToast("Copy the product link from your browser");
      });
      return;
    }
    showToast("Copy the product link from your browser");
  }

  function ensureProductActions(product, details) {
    if (!details || details.querySelector(".aura-product-actions")) return;
    var description = details.querySelector(".product-description");
    var actions = document.createElement("div");
    actions.className = "aura-product-actions";
    var url = productShareUrl(product);
    var message = "See this " + product.name + " at Aura Ethnic Studio — ₹" + (product.price || 500) + ": " + url;
    actions.innerHTML = [
      '<button type="button" class="aura-share-product">', icon("share"), "SHARE STYLE</button>",
      '<a class="aura-whatsapp-product" href="https://wa.me/?text=', encodeURIComponent(message), '" target="_blank" rel="noopener noreferrer" referrerpolicy="no-referrer">', icon("message"), "WHATSAPP</a>"
    ].join("");
    actions.querySelector(".aura-share-product").addEventListener("click", function () {
      shareProduct(product);
    });
    if (description) description.insertAdjacentElement("afterend", actions);
    else details.appendChild(actions);
  }

  function setupGallery(gallery) {
    if (!gallery) return;
    if (!gallery.querySelector(".aura-gallery-zoom")) {
      var zoom = document.createElement("button");
      zoom.type = "button";
      zoom.className = "aura-gallery-zoom";
      zoom.setAttribute("aria-label", "Zoom product image");
      zoom.textContent = "⌕";
      zoom.addEventListener("click", function () {
        var zoomed = gallery.classList.toggle("aura-is-zoomed");
        zoom.setAttribute("aria-label", zoomed ? "Close image zoom" : "Zoom product image");
      });
      gallery.appendChild(zoom);
    }

    var image = gallery.querySelector(":scope > img");
    if (image && !image.dataset.auraZoomReady) {
      image.dataset.auraZoomReady = "true";
      image.addEventListener("click", function () {
        gallery.classList.toggle("aura-is-zoomed");
      });
    }

    if (!gallery.dataset.auraSwipeReady) {
      gallery.dataset.auraSwipeReady = "true";
      var startX = 0;
      var startY = 0;
      gallery.addEventListener("pointerdown", function (event) {
        if (event.target.closest("button")) return;
        startX = event.clientX;
        startY = event.clientY;
      });
      gallery.addEventListener("pointerup", function (event) {
        if (!startX && !startY) return;
        var deltaX = event.clientX - startX;
        var deltaY = event.clientY - startY;
        startX = 0;
        startY = 0;
        if (Math.abs(deltaX) < 48 || Math.abs(deltaX) < Math.abs(deltaY) * 1.2) return;
        gallery.classList.remove("aura-is-zoomed");
        var selector = deltaX < 0 ? ".gallery-next" : ".gallery-prev";
        var arrow = gallery.querySelector(selector);
        if (arrow) arrow.click();
      });
      gallery.addEventListener("click", function (event) {
        if (event.target.closest(".gallery-arrow, .thumbnails")) {
          gallery.classList.remove("aura-is-zoomed");
        }
      });
    }

    if (window.matchMedia("(max-width: 760px)").matches && !gallery.dataset.auraHintShown) {
      gallery.dataset.auraHintShown = "true";
      var hint = document.createElement("span");
      hint.className = "aura-swipe-hint";
      hint.textContent = "SWIPE PHOTOS · TAP TO ZOOM";
      gallery.appendChild(hint);
      window.setTimeout(function () { hint.remove(); }, 2600);
    }
  }

  function enhanceOpenModal() {
    var sheet = document.querySelector(".product-layer .product-sheet");
    if (!sheet) {
      lastModalProduct = "";
      return;
    }
    var title = sheet.querySelector(".product-details h2");
    var product = title ? findProductByName(title.textContent) : null;
    if (!product) return;
    if (lastModalProduct !== String(product.id)) {
      lastModalProduct = String(product.id);
      rememberProduct(product);
    }
    ensureProductActions(product, sheet.querySelector(".detail-scroll"));
    setupGallery(sheet.querySelector(".product-gallery"));
  }

  function handleDeepLink() {
    if (deepLinkHandled) return;
    var id = new URL(window.location.href).searchParams.get("product");
    if (!id) {
      deepLinkHandled = true;
      return;
    }
    var product = findProductById(id);
    if (!product || !document.getElementById("catalog-search")) return;
    deepLinkHandled = true;
    openProduct(product);
  }

  function showInstallBanner() {
    if (!installPrompt || document.querySelector(".aura-install-banner")) return;
    if (Date.now() < installEligibleAt) return;
    if (document.querySelector(".product-layer, .checkout-layer, .cart-layer.open, .aura-wishlist-layer.is-open")) return;
    var dismissedAt = Number(localStorage.getItem(DISMISS_KEY) || 0);
    if (dismissedAt && Date.now() - dismissedAt < 7 * 24 * 60 * 60 * 1000) return;
    var banner = document.createElement("aside");
    banner.className = "aura-install-banner";
    banner.setAttribute("aria-label", "Install Aura Ethnic Studio app");
    banner.innerHTML = [
      '<span class="aura-install-mark">A</span>',
      "<div><strong>Keep Aura on your phone</strong><small>Faster access from your home screen</small></div>",
      '<button type="button" class="aura-install-accept">INSTALL</button>',
      '<button type="button" class="aura-install-dismiss">NOT NOW</button>'
    ].join("");
    banner.querySelector(".aura-install-accept").addEventListener("click", function () {
      installPrompt.prompt();
      installPrompt.userChoice.finally(function () {
        installPrompt = null;
        banner.remove();
      });
    });
    banner.querySelector(".aura-install-dismiss").addEventListener("click", function () {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
      banner.remove();
    });
    document.body.appendChild(banner);
  }

  function ensureTrackingAccess() {
    document.querySelectorAll(".desktop-nav, .mobile-menu-panel nav").forEach(function (nav) {
      if (nav.querySelector(".aura-track-nav")) return;
      var link = document.createElement("a");
      link.className = "aura-track-nav";
      link.href = TRACKING_PAGE_URL;
      link.textContent = "Track Order";
      nav.appendChild(link);
    });

    if (document.getElementById("aura-track-order")) return;
    var anchor = document.querySelector(".trust-strip");
    if (!anchor) return;
    var section = document.createElement("section");
    section.id = "aura-track-order";
    section.className = "aura-tracking-access section";
    section.innerHTML = [
      '<div class="aura-tracking-copy">',
      "<small>ALREADY ORDERED?</small>",
      "<h2>Track your Aura order</h2>",
      "<p>Use the Tracking ID sent in your WhatsApp order message. Full delivery tracking unlocks after your payment is confirmed.</p>",
      "</div>",
      '<a href="', TRACKING_PAGE_URL, '"><span>TRACK YOUR ORDER</span><b aria-hidden="true">→</b></a>'
    ].join("");
    anchor.insertAdjacentElement("afterend", section);
  }

  function createClientRequestId() {
    if (window.crypto && typeof window.crypto.randomUUID === "function") return window.crypto.randomUUID();
    var bytes = new Uint8Array(16);
    window.crypto.getRandomValues(bytes);
    bytes[6] = bytes[6] & 15 | 64;
    bytes[8] = bytes[8] & 63 | 128;
    var hex = Array.from(bytes, function (byte) { return byte.toString(16).padStart(2, "0"); }).join("");
    return hex.slice(0, 8) + "-" + hex.slice(8, 12) + "-" + hex.slice(12, 16) + "-" + hex.slice(16, 20) + "-" + hex.slice(20);
  }

  function requestIdForOrder(fingerprint) {
    try {
      var stored = JSON.parse(sessionStorage.getItem(ORDER_REQUEST_KEY) || "null");
      if (stored && stored.fingerprint === fingerprint && Date.now() - Number(stored.createdAt || 0) < 24 * 60 * 60 * 1000) {
        return stored.id;
      }
    } catch (error) {
      /* A fresh id is safe because the durable order remains on the server. */
    }
    var id = createClientRequestId();
    try {
      sessionStorage.setItem(ORDER_REQUEST_KEY, JSON.stringify({ id: id, fingerprint: fingerprint, createdAt: Date.now() }));
    } catch (error) {}
    return id;
  }

  function checkoutItems(form) {
    var checkout = form.closest(".checkout-layer");
    if (!checkout) return [];
    return Array.from(checkout.querySelectorAll(".order-review .review-item")).map(function (item) {
      var name = item.querySelector("b");
      var detail = item.querySelector("small");
      return ((name ? name.textContent.trim() : "Aura Ethnic item") + (detail ? " — " + detail.textContent.trim() : "")).trim();
    }).filter(Boolean);
  }

  function checkoutAmount(form) {
    var checkout = form.closest(".checkout-layer");
    var total = checkout && checkout.querySelector(".order-review .review-total b");
    return Number(String(total ? total.textContent : "0").replace(/[^0-9.]/g, "")) || 0;
  }

  function setOrderError(form, message) {
    var error = form.querySelector(".aura-order-error");
    if (!error) {
      error = document.createElement("p");
      error.className = "aura-order-error";
      error.setAttribute("role", "alert");
      form.appendChild(error);
    }
    error.textContent = message || "";
  }

  function showTrackingLoader() {
    var layer = document.createElement("div");
    layer.className = "aura-tracking-loader";
    layer.setAttribute("role", "status");
    layer.setAttribute("aria-live", "polite");
    layer.setAttribute("aria-label", "Creating your Tracking ID");
    layer.innerHTML = '<div class="aura-tracking-loader__card"><span class="aura-tracking-loader__spinner" aria-hidden="true"></span><small>SECURE ORDER SETUP</small><h2>Creating your Tracking ID…</h2><p>Please wait while we prepare your WhatsApp order.</p></div>';
    document.body.appendChild(layer);
    document.body.classList.add("aura-is-creating-order");
    return layer;
  }

  function hideTrackingLoader(layer) {
    if (layer && layer.parentNode) layer.parentNode.removeChild(layer);
    document.body.classList.remove("aura-is-creating-order");
  }

  function whatsappOrderMessage(data, trackingId) {
    return [
      "*AURA ETHNIC STUDIO — NEW ORDER*",
      "*COPY TRACKING ID*",
      "```" + trackingId + "```",
      "",
      "*CUSTOMER DETAILS*",
      "Name: " + data.customerName,
      "Phone: " + data.phone,
      "Email: " + (data.email || "Not provided"),
      "",
      "*DELIVERY ADDRESS*",
      data.address,
      "City: " + data.city,
      "State: " + data.state,
      "PIN: " + data.pincode,
      "",
      "*ORDER ITEMS*",
      data.items,
      "",
      "Order Total: ₹" + data.orderAmount,
      "Shipping: ₹0",
      "Expected Delivery: 3–4 Days",
      "Payment: Pending — discussion on WhatsApp",
      "Order Note: " + (data.publicNote || "None"),
      "",
      "*TRACKING*",
      "Track here: " + TRACKING_PAGE_URL,
      "Use the Tracking ID shown above and phone last 4 digits " + data.phone.slice(-4) + ".",
      "Full tracking unlocks after payment is confirmed.",
      "",
      "Please confirm the order and share the payment steps."
    ].join("\n");
  }

  async function createOrderThenOpenWhatsApp(form) {
    var button = form.querySelector('button[type="submit"]');
    var originalLabel = button ? button.textContent : "";
    var loadingLayer = showTrackingLoader();
    if (button) {
      button.disabled = true;
      button.textContent = "CREATING TRACKING ID…";
    }
    setOrderError(form, "");

    try {
      if (!TRACKING_ORIGIN) throw new Error("Tracking service is being connected. Please try again shortly.");
      var formData = new FormData(form);
      var phone = String(formData.get("phone") || "").replace(/\D/g, "");
      var pincode = String(formData.get("pincode") || "").replace(/\D/g, "");
      var items = checkoutItems(form);
      var order = {
        customerName: String(formData.get("name") || "").trim(),
        phone: phone,
        email: String(formData.get("email") || "").trim(),
        address: String(formData.get("address") || "").trim(),
        city: String(formData.get("city") || "").trim(),
        state: String(formData.get("state") || "").trim(),
        pincode: pincode,
        items: items.join("\n"),
        orderAmount: checkoutAmount(form),
        publicNote: String(formData.get("note") || "").trim()
      };
      if (phone.length !== 10) throw new Error("Please enter a valid 10-digit mobile number.");
      if (pincode.length !== 6) throw new Error("Please enter a valid 6-digit PIN code.");
      if (!items.length || order.orderAmount <= 0) throw new Error("Your bag details could not be read. Please close checkout and try again.");

      var fingerprint = JSON.stringify([
        order.phone, order.customerName, order.address, order.pincode, order.items, order.orderAmount
      ]);
      order.clientRequestId = requestIdForOrder(fingerprint);

      var response = await fetch(ORDER_API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(order)
      });
      var result;
      try { result = await response.json(); } catch (error) { result = {}; }
      if (!response.ok || !result.order || !result.order.orderId) {
        throw new Error(result.message || "Tracking ID could not be created. Please try again.");
      }

      var message = whatsappOrderMessage(order, result.order.orderId);
      var whatsappUrl = "https://wa.me/" + STORE_WHATSAPP_NUMBER + "?text=" + encodeURIComponent(message);
      window.location.assign(whatsappUrl);
    } catch (error) {
      setOrderError(form, error && error.message ? error.message : "Order could not be created. Please try again.");
      showToast("Tracking ID was not created — please try again");
    } finally {
      hideTrackingLoader(loadingLayer);
      if (button) {
        button.disabled = false;
        button.textContent = originalLabel;
      }
    }
  }

  function registerApp() {
    if ("serviceWorker" in navigator) {
      window.addEventListener("load", function () {
        navigator.serviceWorker.register("./sw.js?v=9", {
          scope: "./",
          updateViaCache: "none"
        }).then(function (registration) {
          return registration.update();
        }).catch(function () {});
      }, { once: true });
    }
    window.addEventListener("beforeinstallprompt", function (event) {
      event.preventDefault();
      installPrompt = event;
      installEligibleAt = Date.now() + 8000;
      window.setTimeout(showInstallBanner, 8000);
    });
    window.addEventListener("appinstalled", function () {
      installPrompt = null;
      var banner = document.querySelector(".aura-install-banner");
      if (banner) banner.remove();
      showToast("Aura added to your home screen");
    });
  }

  function runUpgrades() {
    upgradeScheduled = false;
    configureBottomNav();
    ensureTrackingAccess();
    ensureWishlistDrawer();
    renderRecent();
    enhanceOpenModal();
    handleDeepLink();
    showInstallBanner();
  }

  function scheduleUpgrades() {
    if (upgradeScheduled) return;
    upgradeScheduled = true;
    window.requestAnimationFrame(runUpgrades);
  }

  document.addEventListener("submit", function (event) {
    var form = event.target;
    if (!(form instanceof HTMLFormElement) || !form.closest(".checkout-layer")) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    createOrderThenOpenWhatsApp(form);
  }, true);

  document.addEventListener("click", function (event) {
    if (event.target.closest(".favourite-button")) {
      window.setTimeout(function () {
        updateWishlistCount();
        if (document.querySelector(".aura-wishlist-layer.is-open")) renderWishlist();
      }, 40);
    }
  });

  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape" && document.querySelector(".aura-wishlist-layer.is-open")) {
      closeWishlist();
    }
  });

  var observer = new MutationObserver(scheduleUpgrades);
  observer.observe(document.documentElement, { childList: true, subtree: true });
  registerApp();
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", scheduleUpgrades, { once: true });
  } else {
    scheduleUpgrades();
  }
})();
