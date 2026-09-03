// ============================================================
// AURA ETHNIC STUDIO — WEBSITE LOGIC
// ============================================================

const WHATSAPP_NUMBER = "917357924991"; // Replace with your WhatsApp number.

const HERO_IMAGES = [
  "hero-new-arrivals.webp",
  "hero-editorial.png",
  "kurti-01.jpg"
];

const PRODUCTS = (window.AURA_PRODUCTS || []).map(p => ({collection:"main", price:500, mrp:999, ...p}));
const MORE_PRODUCTS = (window.AURA_MORE_PRODUCTS || []).map(p => ({collection:"more", price:500, mrp:999, ...p}));

// Keep the bag stable while the customer moves between pages or uses Back.
// sessionStorage gives us the best mobile behaviour here: a fresh browser session
// starts with an empty bag, but navigation/back/reload inside the same session
// does not silently delete the customer's selections.
const CART_KEY = "auraPremiumCartSessionV1";
let cart=[];
try {
  const saved = JSON.parse(sessionStorage.getItem(CART_KEY) || "[]");
  cart = Array.isArray(saved) ? saved.filter(x => x && x.id != null && Number(x.qty) > 0) : [];
} catch(e) { cart=[]; }
// Remove the legacy persisted cart once so old test items cannot reappear.
try { localStorage.removeItem("auraPremiumCart"); } catch(e) {}
let heroIndex=0,heroTimer,modalProduct=null,modalIndex=0;
const $=id=>document.getElementById(id);
const cardIndexes={};


function allCatalogProducts(){return [...PRODUCTS,...MORE_PRODUCTS]}
function getProduct(id){return allCatalogProducts().find(p=>String(p.id)===String(id))}
function discountPercent(p){
  if(Number.isFinite(Number(p.discount)) && Number(p.discount)>0) return Number(p.discount);
  const mrp=Number(p.mrp)||999,price=Number(p.price)||500;
  return mrp>price?Math.round((1-price/mrp)*100):0;
}
function priceMarkup(p,suffix="• 1 Set"){
  const mrp=Number(p.mrp)||999,price=Number(p.price)||500,off=discountPercent(p);
  return `<span class="old-price">₹${mrp}</span><strong>₹${price}</strong>${off?`<span class="discount">${off}% OFF</span>`:""}<small>${suffix}</small>`;
}
function productCard(p,i){
  const off=discountPercent(p);
  return `<article class="product-card" style="animation-delay:${Math.min(i*50,300)}ms">
    <div class="product-image">
      <img id="cardimg-${p.id}" src="${p.images[0]}" alt="${p.name}" loading="lazy" decoding="async" onerror="this.onerror=null;this.src='kurti-01.jpg'">
      ${p.badge?`<span class="badge">${p.badge}</span>`:""}
      ${off?`<span class="sale-badge">${off}% OFF</span>`:""}
      <button class="wishlist" onclick="event.stopPropagation();this.textContent=this.textContent==='♡'?'♥':'♡'">♡</button>
      <div class="image-nav"><button onclick="event.stopPropagation();changeCardImage('${p.id}',-1)">‹</button><button onclick="event.stopPropagation();changeCardImage('${p.id}',1)">›</button></div>
    </div>
    <div class="product-info">
      <div class="card-meta"><span class="fabric">${p.fabric||"ETHNIC STYLE"}</span><span class="collection-chip">${p.collection==="more"?"MORE STYLES":"KURTIS"}</span></div><h3>${p.name}</h3>
      <div class="price">${priceMarkup(p)}</div>
      <button class="quick" onclick="openProduct('${p.id}')">VIEW DETAILS</button>
    </div>
  </article>`;
}

function initHero(){
  if(!$("heroSlider"))return;
  $("heroSlider").innerHTML=HERO_IMAGES.map((src,i)=>`<div class="hero-slide ${i===0?"active":""}" style="background-image:url('${src}')"></div>`).join("");
  $("heroDots").innerHTML=HERO_IMAGES.map((_,i)=>`<button class="${i===0?"active":""}" onclick="setHero(${i})"></button>`).join("");
  heroTimer=setInterval(()=>setHero((heroIndex+1)%HERO_IMAGES.length),4500);
}
function setHero(i){
  heroIndex=i;
  document.querySelectorAll(".hero-slide").forEach((e,n)=>e.classList.toggle("active",n===i));
  document.querySelectorAll(".hero-dots button").forEach((e,n)=>e.classList.toggle("active",n===i));
}
if($("heroPrev"))$("heroPrev").onclick=()=>setHero((heroIndex-1+HERO_IMAGES.length)%HERO_IMAGES.length);
if($("heroNext"))$("heroNext").onclick=()=>setHero((heroIndex+1)%HERO_IMAGES.length);

function homeFeaturedList(){ return [...MORE_PRODUCTS.slice(0,4), ...PRODUCTS.slice(0,2)]; }
function searchableText(p){
  return [p.name,p.fabric,p.badge,p.description,p.collection==="more"?"More Styles":"Kurtis"].filter(Boolean).join(" ").toLowerCase();
}
function filteredList(source){
  const fabric=($("fabricFilter")?.value||"all").trim().toLowerCase();
  const badge=($("badgeFilter")?.value||"all").trim().toLowerCase();
  const sort=$("sortFilter")?.value||"featured";
  const q=($("searchInput")?.value||"").toLowerCase().trim();

  let list=source.filter(p=>{
    const pFabric=String(p.fabric||"").trim().toLowerCase();
    const pBadge=String(p.badge||"").trim().toLowerCase();
    return (fabric==="all" || pFabric===fabric) &&
           (badge==="all" || pBadge===badge) &&
           (!q || searchableText(p).includes(q));
  });

  if(sort==="name") list.sort((a,b)=>String(a.name||"").localeCompare(String(b.name||"")));
  return list;
}
function updateSearchSuggestions(){
  const box=$("searchSuggestions"),input=$("searchInput"); if(!box||!input)return;
  const q=input.value.toLowerCase().trim();
  if(!q){box.innerHTML="";box.classList.add("hidden");return;}
  const matches=allCatalogProducts().filter(p=>searchableText(p).includes(q)).slice(0,6);
  if(!matches.length){box.innerHTML='<div class="search-empty">No matching products</div>';box.classList.remove("hidden");return;}
  box.innerHTML=matches.map(p=>`<button type="button" class="search-suggestion" onclick="selectSearchSuggestion('${String(p.id).replace(/'/g,"\\'")}')"><img src="${p.images?.[0]||""}" alt=""><span><strong>${p.name}</strong><small>${p.collection==="more"?"More Styles":"Kurtis"} • ${p.fabric||"Ethnic Style"}</small></span><b>₹${Number(p.price)||500}</b></button>`).join("");
  box.classList.remove("hidden");
}
function selectSearchSuggestion(id){
  const p=getProduct(id); if(!p)return;
  if($("searchInput"))$("searchInput").value=p.name;
  if($("searchSuggestions"))$("searchSuggestions").classList.add("hidden");
  renderProducts(); document.querySelector("#shop")?.scrollIntoView({behavior:"smooth",block:"start"});
}
function renderProducts(){
  if(!$('productGrid'))return;
  const page=document.body.dataset.page||'home';
  const isCatalog=page==='products' || page==='more-products';

  // Home normally shows the fixed 6 featured products. As soon as a customer
  // selects a fabric/collection filter, search the COMPLETE catalog (Main + More
  // Styles) and show up to 6 matching products on the homepage.
  const activeFabric=($('fabricFilter')?.value||'all').trim().toLowerCase();
  const activeBadge=($('badgeFilter')?.value||'all').trim().toLowerCase();
  const activeQuery=($('searchInput')?.value||'').trim();
  const homeFilterActive=activeFabric!=='all' || activeBadge!=='all' || !!activeQuery;
  const source=isCatalog ? allCatalogProducts() : (homeFilterActive ? allCatalogProducts() : homeFeaturedList());
  let list=filteredList(source);
  if(!isCatalog && homeFilterActive) list=list.slice(0,6);

  if(isCatalog){
    const size=12,totalPages=Math.max(1,Math.ceil(list.length/size));
    window.moreCurrentPage=Math.min(window.moreCurrentPage||1,totalPages);
    const pageNo=window.moreCurrentPage||1,pageItems=list.slice((pageNo-1)*size,pageNo*size);
    if($('productsCount'))$('productsCount').textContent=`${list.length} products • Page ${pageNo} of ${totalPages}`;
    $('noResults').classList.toggle('hidden',list.length!==0);
    $('productGrid').innerHTML=pageItems.map(productCard).join('');
    renderPagination(list.length,pageNo,size);
    return;
  }
  $('noResults').classList.toggle('hidden',list.length!==0);
  $('productGrid').innerHTML=list.map(productCard).join('');
}
function renderMoreHome(){
  // Kept for backwards compatibility with older page markup.
  if($("moreProductGrid"))$("moreProductGrid").innerHTML="";
  if($("moreProductsEmpty"))$("moreProductsEmpty").classList.add("hidden");
}

function renderPagination(total,page,size){
  const pg=$("pagination");if(!pg)return;const totalPages=Math.max(1,Math.ceil(total/size));pg.innerHTML="";
  if(totalPages>1){
    if(page>1)pg.innerHTML+=`<button onclick="goMorePage(${page-1})">←</button>`;
    for(let i=1;i<=totalPages;i++)pg.innerHTML+=`<button class="${i===page?'active':''}" onclick="goMorePage(${i})">${i}</button>`;
    if(page<totalPages)pg.innerHTML+=`<button onclick="goMorePage(${page+1})">→</button>`;
  }
}
function goMorePage(n){window.moreCurrentPage=n;renderProducts();window.scrollTo({top:document.querySelector(".section")?.offsetTop-80||0,behavior:"smooth"})}
function changeCardImage(id,dir){
  const p=getProduct(id);if(!p)return;
  cardIndexes[id]=(cardIndexes[id]||0)+dir;
  if(cardIndexes[id]<0)cardIndexes[id]=p.images.length-1;
  if(cardIndexes[id]>=p.images.length)cardIndexes[id]=0;
  const img=$("cardimg-"+id);if(img)img.src=p.images[cardIndexes[id]];
}

["fabricFilter","badgeFilter","sortFilter"].forEach(id=>{if($(id))$(id).onchange=()=>{window.moreCurrentPage=1;renderProducts()}});
if($("menuBtn"))$("menuBtn").onclick=()=>$("mobileNav").classList.toggle("open");
document.querySelectorAll(".mobile-nav a").forEach(a=>a.onclick=()=>$("mobileNav").classList.remove("open"));
document.querySelectorAll(".fabric-grid button").forEach(b=>b.onclick=()=>{if($("fabricFilter")){const value=b.dataset.fabric;const opt=[...$("fabricFilter").options].find(o=>o.value.toLowerCase()===value.toLowerCase());$("fabricFilter").value=opt?opt.value:value;}window.moreCurrentPage=1;renderProducts();if($("shop"))$("shop").scrollIntoView({behavior:"smooth"})});

function openProduct(id){
  modalProduct=getProduct(id);modalIndex=0;if(!modalProduct)return;
  $("modalBadge").textContent=modalProduct.badge||"";
  $("modalFabric").textContent=modalProduct.fabric||"";
  $("modalFabricValue").textContent=modalProduct.fabric||"";
  $("modalName").textContent=modalProduct.name;
  $("modalDescription").textContent=modalProduct.description||"Premium kurti from Aura Ethnic Studio.";
  if($("modalPrice"))$("modalPrice").innerHTML=priceMarkup(modalProduct);
  const off=discountPercent(modalProduct);
  if($("modalDiscount")){$("modalDiscount").textContent=off?`${off}% OFF`:"";$("modalDiscount").classList.toggle("hidden",!off)}
  if($("modalAdd"))$("modalAdd").textContent=`ADD TO CART — ₹${Number(modalProduct.price)||500}`;
  renderModal();$("productModal").classList.remove("hidden");
}
function renderModal(){
  $("modalImage").onerror=()=>{$("modalImage").onerror=null;$("modalImage").src="kurti-01.jpg"};
  $("modalImage").src=modalProduct.images[modalIndex];
  $("modalThumbs").innerHTML=modalProduct.images.map((src,i)=>`<img src="${src}" class="${i===modalIndex?"active":""}" onclick="modalIndex=${i};renderModal()">`).join("");
}
if($("modalPrev"))$("modalPrev").onclick=()=>{modalIndex=(modalIndex-1+modalProduct.images.length)%modalProduct.images.length;renderModal()};
if($("modalNext"))$("modalNext").onclick=()=>{modalIndex=(modalIndex+1)%modalProduct.images.length;renderModal()};
if($("modalAdd"))$("modalAdd").onclick=()=>{
  addToCart(modalProduct.id,$("modalSize").value);
  showCartToast("Added to cart", modalProduct?.name || "Product", "added");
  // Keep the product details open so the customer can continue viewing the product.
};
if($("sizeChartBtn"))$("sizeChartBtn").onclick=()=>$("sizeChartModal").classList.remove("hidden");

function showCartToast(title,message,type="added"){
  let toast=document.getElementById("cartToast");
  if(!toast){
    toast=document.createElement("div");
    toast.id="cartToast";
    toast.className="cart-toast";
    toast.setAttribute("role","status");
    toast.setAttribute("aria-live","polite");
    toast.setAttribute("aria-atomic","true");
    toast.innerHTML='<span class="cart-toast-icon"></span><div class="cart-toast-copy"><strong></strong><small></small></div>';
    document.body.appendChild(toast);
  }
  toast.classList.remove("show","added","removed");
  toast.classList.add(type);
  toast.querySelector(".cart-toast-icon").textContent=type==="removed"?"−":"✓";
  toast.querySelector("strong").textContent=title;
  toast.querySelector("small").textContent=message;
  clearTimeout(window.auraToastTimer);
  requestAnimationFrame(()=>toast.classList.add("show"));
  window.auraToastTimer=setTimeout(()=>toast.classList.remove("show"),2200);
}

function addToCart(id,size="M"){const x=cart.find(i=>String(i.id)===String(id)&&i.size===size);if(x)x.qty++;else cart.push({id,size,qty:1});saveCart()}
function bundleTotal(sets){
  if(sets<=0)return 0;if(sets===1)return 500;if(sets===2)return 800;if(sets===3)return 1000;
  return Math.floor(sets/3)*1000+(sets%3===1?500:800);
}
function saveCart(){try{sessionStorage.setItem(CART_KEY,JSON.stringify(cart))}catch(e){}updateCart();renderCart()}
function updateCart(){if($("cartCount"))$("cartCount").textContent=cart.reduce((s,x)=>s+x.qty,0)}
function renderCart(){
  if(!$("cartItems"))return;
  const sets=cart.reduce((s,x)=>s+x.qty,0);
  const regular=sets*500,total=bundleTotal(sets),saving=Math.max(0,regular-total);
  $("cartSets").textContent=sets;
  if($("cartRegular"))$("cartRegular").textContent="₹"+regular;
  if($("cartSaving"))$("cartSaving").textContent=saving?"−₹"+saving:"−₹0";
  $("cartTotal").textContent="₹"+total;
  if($("cartOfferNote")){
    $("cartOfferNote").textContent=sets===0?"Add 2 sets to unlock bundle savings.":sets===1?"Add 1 more set: 2 sets for ₹800 — save ₹200.":sets===2?"Offer applied: 2 sets for ₹800 — you save ₹200.":sets===3?"Best offer applied: 3 sets for ₹1000 — you save ₹500.":`Bundle offer applied — you save ₹${saving}.`;
  }
  $("cartItems").innerHTML=cart.length?cart.map((x,i)=>{const p=getProduct(x.id);if(!p)return "";return `<div class="cart-item"><img src="${p.images[0]}" alt="${p.name}" onerror="this.onerror=null;this.src='kurti-01.jpg'"><div><h4>${p.name}</h4><small>${p.fabric||"Ethnic Style"} • Size ${x.size}</small><div class="qty"><button onclick="changeQty(${i},-1)">−</button><span>${x.qty}</span><button onclick="changeQty(${i},1)">+</button></div></div><button class="remove" onclick="removeItem(${i})">REMOVE</button></div>`}).join(""):`<p style="color:#877870;font-size:12px">Your shopping bag is empty.</p>`;
}
function changeQty(i,d){
  const item=cart[i],product=item?getProduct(item.id):null;
  if(!item)return;
  item.qty+=d;
  if(item.qty<=0){cart.splice(i,1);saveCart();showCartToast("Removed from cart",product?.name||"Product","removed");return;}
  saveCart();
  showCartToast(d>0?"Added one more":"Removed one item",product?.name||"Product",d>0?"added":"removed");
}
function removeItem(i){
  const item=cart[i],product=item?getProduct(item.id):null;
  cart.splice(i,1);saveCart();
  showCartToast("Removed from cart",product?.name||"Product","removed");
}
function openCart(){renderCart();$("cartDrawer").classList.add("open");$("overlay").classList.add("show")}
function closeCart(){$("cartDrawer").classList.remove("open");$("overlay").classList.remove("show")}
if($("cartBtn"))$("cartBtn").onclick=openCart;if($("closeCart"))$("closeCart").onclick=closeCart;if($("overlay"))$("overlay").onclick=closeCart;
if($("checkoutBtn"))$("checkoutBtn").onclick=()=>{if(!cart.length){showCartToast("Your bag is empty","Add a product before continuing","removed");return}closeCart();$("checkoutModal").classList.remove("hidden")};
if($("checkoutForm"))$("checkoutForm").onsubmit=e=>{
  e.preventDefault();
  const name=$("customerName").value.trim(),phone=$("customerPhone").value.trim(),email=$("customerEmail").value.trim(),address=$("customerAddress").value.trim(),city=$("customerCity").value.trim(),state=$("customerState").value.trim(),pin=$("customerPincode").value.trim(),payment=$("customerPayment").value,note=$("customerNote").value.trim();
  if(!/^\d{6}$/.test(pin)){alert("Please enter a valid 6-digit PIN code.");return}
  const sets=cart.reduce((s,x)=>s+x.qty,0),regular=sets*500,total=bundleTotal(sets),saving=Math.max(0,regular-total);
  const items=cart.map(x=>{const p=getProduct(x.id);if(!p)return "";return `• ${p.name} | ${p.collection==="more"?"More Styles":"Kurtis"} | Fabric: ${p.fabric||"Ethnic Style"} | Size: ${x.size} | Qty: ${x.qty}`}).filter(Boolean).join("\n");
  const message=`*AURA ETHNIC STUDIO — NEW ORDER*%0A%0A*CUSTOMER DETAILS*%0AName: ${encodeURIComponent(name)}%0APhone: ${encodeURIComponent(phone)}%0AEmail: ${encodeURIComponent(email)}%0A%0A*DELIVERY ADDRESS*%0A${encodeURIComponent(address)}%0ACity: ${encodeURIComponent(city)}%0AState: ${encodeURIComponent(state)}%0APIN: ${encodeURIComponent(pin)}%0A%0A*ORDER ITEMS*%0A${encodeURIComponent(items)}%0A%0ATotal Sets: ${sets}%0ARegular Price: ₹${regular}%0ABundle Offer Saving: ₹${saving}%0AOrder Total: ₹${total}%0AShipping: ₹0%0AExpected Delivery: *3–4 Days*%0APayment: ${encodeURIComponent(payment)}%0AOrder Note: ${encodeURIComponent(note||"None")}%0A%0APlease confirm the order and share the next payment/order-completion steps.`;
  window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${message}`,"_blank");
};
document.querySelectorAll("[data-close]").forEach(b=>b.onclick=()=>$(b.dataset.close).classList.add("hidden"));
if($("footerWhatsapp"))$("footerWhatsapp").textContent=WHATSAPP_NUMBER==="917357924991"?"+91 7357924991":"+"+WHATSAPP_NUMBER;
window.addEventListener("pageshow",()=>{
  try{
    const saved=JSON.parse(sessionStorage.getItem(CART_KEY)||"[]");
    if(Array.isArray(saved)) cart=saved.filter(x=>x&&x.id!=null&&Number(x.qty)>0);
  }catch(e){}
  updateCart();renderCart();
});
initHero();renderProducts();updateCart();renderCart();
