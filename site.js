/* Read & Rip: mobile menu, walkthrough videos, product-story rail.
   Plain JavaScript, no dependencies. Every page works without it. */
(function () {
  "use strict";
  var root = document.documentElement;
  root.classList.remove("no-js");

  var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- mobile menu: modal, focus kept inside, Escape closes ---------- */
  var menuBtn = document.querySelector("[data-menu-open]");
  var panel = document.getElementById("site-menu");
  if (menuBtn && panel) {
    var closeBtn = panel.querySelector("[data-menu-close]");
    var focusables = function () {
      return Array.prototype.filter.call(
        panel.querySelectorAll("a[href], button:not([disabled])"),
        function (el) { return el.offsetParent !== null; }
      );
    };
    var onKey = function (e) {
      if (e.key === "Escape") { e.preventDefault(); closeMenu(); return; }
      if (e.key !== "Tab") return;
      var items = focusables();
      if (!items.length) return;
      var first = items[0], last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    // Everything outside the panel is made inert while it's open (the panel lives in the header).
    var outside = function () {
      return Array.prototype.filter.call(document.querySelectorAll("body > *, header.site > .navbar"), function (el) {
        return !el.contains(panel) && el.tagName !== "SCRIPT";
      });
    };
    var setInert = function (on) {
      outside().forEach(function (el) {
        if (on) el.setAttribute("inert", ""); else el.removeAttribute("inert");
      });
    };
    var openMenu = function () {
      setInert(true);
      panel.hidden = false;
      menuBtn.setAttribute("aria-expanded", "true");
      document.body.classList.add("menu-open");
      document.addEventListener("keydown", onKey);
      (closeBtn || focusables()[0]).focus();
    };
    var closeMenu = function (returnFocus) {
      panel.hidden = true;
      setInert(false);
      menuBtn.setAttribute("aria-expanded", "false");
      document.body.classList.remove("menu-open");
      document.removeEventListener("keydown", onKey);
      if (returnFocus === false) return;
      // On a wide screen the Menu button is hidden; fall back to the current desktop nav link.
      var target = menuBtn.offsetParent !== null ? menuBtn
        : document.querySelector("nav.main a[aria-current]") || document.querySelector("nav.main a");
      if (target) target.focus();
    };
    menuBtn.addEventListener("click", openMenu);
    if (closeBtn) closeBtn.addEventListener("click", function () { closeMenu(); });
    // Close if the window grows past the mobile breakpoint while open.
    window.addEventListener("resize", function () {
      if (!panel.hidden && window.innerWidth >= 1080) closeMenu();
    });
    // Same-page links (e.g. #training) should close the menu too.
    panel.addEventListener("click", function (e) {
      var a = e.target.closest("a[href^='#']");
      if (a) closeMenu(false);
    });
  }

  /* ---------- walkthroughs: poster first; the video loads only when asked ---------- */
  Array.prototype.forEach.call(document.querySelectorAll("[data-walk]"), function (fig) {
    var facade = fig.querySelector(".facade");
    var poster = facade && facade.querySelector("img");
    var stage = fig.querySelector(".stage");
    if (!facade || !stage) return;

    if (poster) {
      var mark = function () { if (poster.naturalWidth > 0) fig.classList.add("has-poster"); };
      if (poster.complete) mark(); else poster.addEventListener("load", mark);
    }

    facade.addEventListener("click", function (e) {
      e.preventDefault();
      var v = document.createElement("video");
      v.src = facade.getAttribute("href");
      v.controls = true;
      v.muted = true;            // audio not yet reviewed: start muted, sound is one tap away
      v.defaultMuted = true;
      v.playsInline = true;
      v.setAttribute("playsinline", "");
      v.preload = "auto";
      if (poster && fig.classList.contains("has-poster")) v.poster = poster.currentSrc || poster.src;
      v.setAttribute("aria-label", fig.getAttribute("data-title") || "Walkthrough video");

      var sound = document.createElement("button");
      sound.type = "button";
      sound.className = "sound";
      sound.setAttribute("aria-pressed", "false");
      sound.textContent = "Sound off — turn on";
      // Zero volume counts as "off" too, so the button never claims sound that isn't playing.
      var silent = function () { return v.muted || v.volume === 0; };
      var sync = function () {
        sound.setAttribute("aria-pressed", silent() ? "false" : "true");
        sound.textContent = silent() ? "Sound off — turn on" : "Sound on — mute";
      };
      sound.addEventListener("click", function () {
        // Only start playback if it never started (browser blocked it); a deliberate pause stays paused.
        if (silent()) { v.muted = false; if (v.volume === 0) v.volume = 1; if (v.paused && v.currentTime === 0) v.play(); }
        else v.muted = true;
        sync();
      });
      v.addEventListener("volumechange", sync);

      v.addEventListener("error", function () {
        if (stage.querySelector(".err")) return;
        var msg = document.createElement("p");
        msg.className = "err";
        msg.setAttribute("role", "alert");
        stage.appendChild(msg);
        msg.textContent = "This video couldn't be loaded. Refresh the page to try again.";
      });

      facade.replaceWith(v);
      stage.after(sound);       // below the video, so it never covers the picture
      var p = v.play();
      if (p && p.catch) p.catch(function () { /* browser blocked playback: native controls remain */ });
      v.focus();
    });
  });

  /* ---------- product story: highlight the step in view ---------- */
  var rail = document.querySelector("[data-story-rail]");
  if (rail && "IntersectionObserver" in window) {
    var links = rail.querySelectorAll("a");
    var byId = {};
    Array.prototype.forEach.call(links, function (a) { byId[a.getAttribute("href").slice(1)] = a; });
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        Array.prototype.forEach.call(links, function (a) { a.classList.remove("is-active"); a.removeAttribute("aria-current"); });
        var a = byId[en.target.id];
        if (a) { a.classList.add("is-active"); a.setAttribute("aria-current", "step"); }
      });
    }, { rootMargin: "-45% 0px -50% 0px" });
    Object.keys(byId).forEach(function (id) { var el = document.getElementById(id); if (el) io.observe(el); });
  }

  /* ---------- product demo: tabs switch between real screens ---------- */
  Array.prototype.forEach.call(document.querySelectorAll("[data-demo]"), function (demo) {
    var tabs = Array.prototype.slice.call(demo.querySelectorAll("[role=tab]"));
    var select = function (tab, focus) {
      tabs.forEach(function (t) {
        var on = t === tab;
        t.setAttribute("aria-selected", on ? "true" : "false");
        t.tabIndex = on ? 0 : -1;
        var panel = document.getElementById(t.getAttribute("aria-controls"));
        if (panel) panel.classList.toggle("is-on", on);
      });
      if (focus) tab.focus();
    };
    tabs.forEach(function (tab, i) {
      tab.addEventListener("click", function () { select(tab, false); });
      tab.addEventListener("keydown", function (e) {
        var next = { ArrowDown: i + 1, ArrowRight: i + 1, ArrowUp: i - 1, ArrowLeft: i - 1, Home: 0, End: tabs.length - 1 }[e.key];
        if (next === undefined) return;
        e.preventDefault();
        select(tabs[(next + tabs.length) % tabs.length], true);
      });
    });
  });

  if (reduceMotion) root.classList.add("reduced-motion");
})();
