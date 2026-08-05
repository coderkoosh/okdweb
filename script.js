/* =========================================================
   OKD WEB — script.js
   Återhållsam rörelse i Linears anda: mjuka ljussken i
   bakgrunden, avslöjanden vid scroll och lite formulärlogik.
   ========================================================= */

(function () {
  'use strict';

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------------------------------------------------------
     1. HEADER — bakgrund när man scrollat
     --------------------------------------------------------- */

  var header = document.getElementById('header');
  var scrollProgress = 0;
  var ticking = false;

  function onScroll() {
    var y = window.pageYOffset || document.documentElement.scrollTop || 0;
    var max = document.documentElement.scrollHeight - window.innerHeight;
    scrollProgress = max > 0 ? Math.min(1, Math.max(0, y / max)) : 0;
    if (header) header.classList.toggle('scrolled', y > 8);
  }

  window.addEventListener('scroll', function () {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function () { onScroll(); ticking = false; });
  }, { passive: true });
  onScroll();

  /* ---------------------------------------------------------
     2. BAKGRUND — mjuka sken som driver långsamt
        Håller sig till accentfärgen; ska kännas, inte synas.
     --------------------------------------------------------- */

  var canvas = document.getElementById('bgGlow');

  if (canvas && !reduce) {
    var ctx = canvas.getContext('2d');
    var W = 0, H = 0;

    // accent (#7170ff), indigo (#5e6ad2) och en sval vit
    var GLOWS = [
      { c: [113, 112, 255], rx: 0.22, ry: 0.12, r: 0.58, sp: 0.11, ph: 0.0, a: 0.16 },
      { c: [94, 106, 210],  rx: 0.78, ry: 0.20, r: 0.52, sp: 0.09, ph: 2.1, a: 0.13 },
      { c: [113, 112, 255], rx: 0.52, ry: 0.72, r: 0.62, sp: 0.07, ph: 4.2, a: 0.10 }
    ];

    function resize() {
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = window.innerWidth;
      H = window.innerHeight;
      canvas.width = Math.floor(W * dpr);
      canvas.height = Math.floor(H * dpr);
      canvas.style.width = W + 'px';
      canvas.style.height = H + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    var raf = null;

    function draw(time) {
      ctx.clearRect(0, 0, W, H);
      ctx.globalCompositeOperation = 'lighter';

      var t = time * 0.0001;
      // skenen tonar ned en aning längre ned på sidan
      var fade = 1 - scrollProgress * 0.45;

      for (var i = 0; i < GLOWS.length; i++) {
        var g = GLOWS[i];

        var x = (g.rx + Math.sin(t * g.sp * 6 + g.ph) * 0.06) * W;
        var y = (g.ry + Math.cos(t * g.sp * 5 + g.ph) * 0.05) * H - scrollProgress * H * 0.3;
        var r = Math.max(W, H) * g.r;

        var alpha = g.a * fade;
        if (alpha <= 0.002) continue;

        var grad = ctx.createRadialGradient(x, y, 0, x, y, r);
        grad.addColorStop(0, 'rgba(' + g.c[0] + ',' + g.c[1] + ',' + g.c[2] + ',' + alpha.toFixed(4) + ')');
        grad.addColorStop(0.5, 'rgba(' + g.c[0] + ',' + g.c[1] + ',' + g.c[2] + ',' + (alpha * 0.28).toFixed(4) + ')');
        grad.addColorStop(1, 'rgba(' + g.c[0] + ',' + g.c[1] + ',' + g.c[2] + ',0)');

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
      }

      raf = requestAnimationFrame(draw);
    }

    function start() { if (!raf) raf = requestAnimationFrame(draw); }
    function stop() { if (raf) { cancelAnimationFrame(raf); raf = null; } }

    window.addEventListener('resize', debounce(resize, 180));
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) stop(); else start();
    });

    resize();
    start();
  }

  /* ---------------------------------------------------------
     3. AVSLÖJANDEN VID SCROLL
     --------------------------------------------------------- */

  var revealEls = document.querySelectorAll('.reveal');

  if ('IntersectionObserver' in window && !reduce) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var el = entry.target;
        var siblings = Array.prototype.filter.call(
          el.parentNode ? el.parentNode.children : [],
          function (c) { return c.classList && c.classList.contains('reveal'); }
        );
        var idx = siblings.indexOf(el);
        el.style.transitionDelay = (idx > 0 ? Math.min(idx, 4) * 0.06 : 0) + 's';
        el.classList.add('in');
        io.unobserve(el);
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -6% 0px' });

    Array.prototype.forEach.call(revealEls, function (el) { io.observe(el); });
  } else {
    Array.prototype.forEach.call(revealEls, function (el) { el.classList.add('in'); });
  }

  /* ---------------------------------------------------------
     4. MOBILMENY
     --------------------------------------------------------- */

  var burger = document.getElementById('burger');
  var menu = document.getElementById('menu');

  if (burger && menu) {
    burger.addEventListener('click', function () {
      var open = burger.getAttribute('aria-expanded') === 'true';
      burger.setAttribute('aria-expanded', String(!open));
      burger.setAttribute('aria-label', open ? 'Öppna meny' : 'Stäng meny');
      menu.hidden = open;
    });

    menu.addEventListener('click', function (e) {
      if (e.target.tagName !== 'A') return;
      burger.setAttribute('aria-expanded', 'false');
      burger.setAttribute('aria-label', 'Öppna meny');
      menu.hidden = true;
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !menu.hidden) {
        burger.setAttribute('aria-expanded', 'false');
        menu.hidden = true;
        burger.focus();
      }
    });
  }

  /* ---------------------------------------------------------
     5. KONTAKTFORMULÄR
        Ingen backend — öppnar e-postklienten med ifylld text.
     --------------------------------------------------------- */

  var form = document.getElementById('contactForm');
  var formMsg = document.getElementById('formMsg');

  if (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();

      var namn = form.namn, epost = form.epost, meddelande = form.meddelande;
      var ok = true;

      [namn, epost, meddelande].forEach(function (fld) {
        var valid = fld.value.trim().length > 0 &&
          (fld.type !== 'email' || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fld.value.trim()));
        fld.classList.toggle('invalid', !valid);
        if (!valid) ok = false;
      });

      if (!ok) {
        formMsg.className = 'form-msg err';
        formMsg.textContent = 'Fyll i namn, en giltig e-postadress och en kort beskrivning.';
        return;
      }

      var subject = 'Projektförfrågan från ' + namn.value.trim();
      var body =
        'Namn: ' + namn.value.trim() + '\n' +
        'E-post: ' + epost.value.trim() + '\n\n' +
        'Om projektet:\n' + meddelande.value.trim() + '\n';

      window.location.href = 'mailto:hej@okdweb.com?subject=' +
        encodeURIComponent(subject) + '&body=' + encodeURIComponent(body);

      formMsg.className = 'form-msg ok';
      formMsg.textContent = 'Tack! Din e-postklient öppnas med meddelandet — tryck skicka så hör vi av oss.';
    });

    form.addEventListener('input', function (e) {
      if (e.target.classList) e.target.classList.remove('invalid');
    });
  }

  /* ---------------------------------------------------------
     6. ÅRTAL
     --------------------------------------------------------- */

  var year = document.getElementById('year');
  if (year) year.textContent = new Date().getFullYear();

  /* --------------------------------------------------------- */

  function debounce(fn, wait) {
    var t;
    return function () {
      var args = arguments, self = this;
      clearTimeout(t);
      t = setTimeout(function () { fn.apply(self, args); }, wait);
    };
  }
})();
