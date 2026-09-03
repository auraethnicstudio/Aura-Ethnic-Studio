(function () {
  "use strict";

  var mainProducts = Array.isArray(window.AURA_PRODUCTS) ? window.AURA_PRODUCTS : [];
  var moreProducts = Array.isArray(window.AURA_MORE_PRODUCTS) ? window.AURA_MORE_PRODUCTS : [];
  var allSizes = ["XXS", "XS", "S", "M", "L", "XL", "2XL", "3XL", "4XL", "5XL"];
  function withAllSizes(product, badge) {
    var updates = { sizes: allSizes.slice() };
    if (badge) updates.badge = badge;
    return Object.assign({}, product, updates);
  }
  var swatiRathiProducts = moreProducts.filter(function (product) {
    return /swati\s+rathi/i.test(product.name || "");
  }).map(function (product) {
    return withAllSizes(product, "Bestseller");
  });

  window.AURA_PRODUCTS = mainProducts.map(function (product) {
    return withAllSizes(product);
  });
  window.AURA_MORE_PRODUCTS = moreProducts.map(function (product) {
    return withAllSizes(product, /swati\s+rathi/i.test(product.name || "") ? "Bestseller" : "");
  });
  window.AURA_SWATI_RATHI_PRODUCTS = swatiRathiProducts;
  window.AURA_SWATI_RATHI_COUNT = swatiRathiProducts.length;
})();
