(function(){
  "use strict";
  var TRACK_URL = new URL("./tracking.html", window.location.href).toString();
  function ensureTrackingSection(){
    var section = document.getElementById("aura-track-order");
    if(!section){
      section = document.createElement("section");
      section.id = "aura-track-order";
      section.className = "aura-tracking-access section";
      section.innerHTML = '<div class="aura-tracking-copy"><small>ALREADY ORDERED?</small><h2>Track your Aura order</h2><p>Enter the Tracking ID sent with your WhatsApp order and check your latest order status anytime.</p></div><a href="'+TRACK_URL+'"><span>TRACK YOUR ORDER</span><b aria-hidden="true">→</b></a>';
      var trust = document.querySelector(".trust-strip");
      var hero = document.querySelector(".hero");
      if(trust) trust.insertAdjacentElement("afterend", section);
      else if(hero) hero.insertAdjacentElement("afterend", section);
      else document.body.insertAdjacentElement("afterbegin", section);
    }
    section.style.display = "grid";
    section.hidden = false;
  }
  function ensureNavLinks(){
    document.querySelectorAll(".desktop-nav, .mobile-menu-panel nav").forEach(function(nav){
      var existing = Array.from(nav.querySelectorAll("a")).find(function(a){ return /track/i.test(a.textContent || ""); });
      if(!existing){
        var link = document.createElement("a");
        link.href = TRACK_URL;
        link.textContent = "Track Order";
        link.className = "aura-track-nav-hotfix";
        nav.appendChild(link);
      }
    });
    if(!document.querySelector(".aura-mobile-track-pill")){
      var pill = document.createElement("a");
      pill.className = "aura-mobile-track-pill";
      pill.href = TRACK_URL;
      pill.setAttribute("aria-label","Track your order");
      pill.innerHTML = '<span aria-hidden="true">◎</span> TRACK ORDER';
      document.body.appendChild(pill);
    }
  }
  function run(){ ensureTrackingSection(); ensureNavLinks(); }
  var queued=false;
  function schedule(){ if(queued) return; queued=true; requestAnimationFrame(function(){queued=false;run();}); }
  new MutationObserver(schedule).observe(document.documentElement,{childList:true,subtree:true});
  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",schedule,{once:true}); else schedule();
})();
