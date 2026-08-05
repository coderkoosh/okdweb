/* =========================================================
   OKD WEB — script.js
   Bakgrundsanimation som reagerar på scroll + mus,
   scrollavslöjanden, tilt, magnetiska knappar, typning m.m.
   ========================================================= */

(function () {
  'use strict';

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var isTouch = window.matchMedia('(hover: none)').matches;

  /* ---------- delad scroll-status ---------- */
  var scrollProgress = 0; // 0..1 över hela sidan
  var scrollY = 0;

  function updateScroll() {
    scrollY = window.pageYOffset || document.documentElement.scrollTop || 0;
    var max = document.documentElement.scrollHeight - window.innerHeight;
    scrollProgress = max > 0 ? Math.min(1, Math.max(0, scrollY / max)) : 0;

    var bar = document.getElementById('progressBar');
    if (bar) bar.style.width = (scrollProgress * 100).toFixed(2) + '%';

    var nav = document.getElementById('nav');
    if (nav) nav.classList.toggle('stuck', scrollY > 20);
  }

  var ticking = false;
  window.addEventListener('scroll', function () {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function () {
      updateScroll();
      ticking = false;
    });
  }, { passive: true });
  updateScroll();

  /* =========================================================
     1. BAKGRUNDSANIMATION
     Färgklot som driver omkring + ett nätverk av noder
     (symboliserar webben). Färg och rörelse styrs av scroll.
     ========================================================= */

  var canvas = document.getElementById('bgCanvas');

  if (canvas && !reduce) {
    var ctx = canvas.getContext('2d');
    var W = 0, H = 0, DPR = 1;

    // musposition, normaliserad -1..1
    var mx = 0, my = 0, tmx = 0, tmy = 0;

    // Monokrom palett: creme, vitt och grå toner.
    // Variationen ligger i ljusstyrka, inte kulör.
    var BLOB_COLORS = [
      [244, 243, 238], // creme
      [255, 255, 255], // vitt
      [220, 219, 213], // ljusgrå
      [255, 255, 255], // vitt
      [194, 193, 187], // grå
      [244, 243, 238]  // creme
    ];

    var blobs = [];
    var nodes = [];

    function resize() {
      DPR = Math.min(window.devicePixelRatio || 1, 2);
      W = window.innerWidth;
      H = window.innerHeight;
      canvas.width = Math.floor(W * DPR);
      canvas.height = Math.floor(H * DPR);
      canvas.style.width = W + 'px';
      canvas.style.height = H + 'px';
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      build();
    }

    function build() {
      var area = W * H;

      // --- färgklot ---
      blobs = [];
      var blobCount = area < 500000 ? 4 : 6;
      for (var i = 0; i < blobCount; i++) {
        blobs.push({
          x: Math.random() * W,
          y: Math.random() * H,
          r: (Math.min(W, H) * (0.28 + Math.random() * 0.3)),
          vx: (Math.random() - 0.5) * 0.22,
          vy: (Math.random() - 0.5) * 0.22,
          c: BLOB_COLORS[i % BLOB_COLORS.length],
          // hur mycket klotet dras iväg av scroll
          drift: 0.35 + Math.random() * 0.9,
          phase: Math.random() * Math.PI * 2
        });
      }

      // --- nätverksnoder ---
      nodes = [];
      var nodeCount = Math.round(Math.min(78, Math.max(26, area / 19000)));
      for (var j = 0; j < nodeCount; j++) {
        nodes.push({
          x: Math.random() * W,
          y: Math.random() * H,
          vx: (Math.random() - 0.5) * 0.28,
          vy: (Math.random() - 0.5) * 0.28,
          r: Math.random() * 1.6 + 0.9,
          depth: 0.35 + Math.random() * 0.65 // parallaxdjup
        });
      }
    }

    var LINK_DIST = 132;

    function draw(time) {
      ctx.clearRect(0, 0, W, H);

      // mjuk följning av musen
      mx += (tmx - mx) * 0.045;
      my += (tmy - my) * 0.045;

      var t = time * 0.00013;
      // scrollen skjuter hela kompositionen uppåt och klarnar upp den
      var scrollShift = scrollProgress * H * 0.85;
      // 0 -> dämpat grått, 1 -> nästan vitt
      var lift = scrollProgress;

      /* ---- färgklot (additiv blandning = klara färger) ---- */
      ctx.globalCompositeOperation = 'lighter';

      for (var i = 0; i < blobs.length; i++) {
        var b = blobs[i];

        b.x += b.vx;
        b.y += b.vy;

        // studsa mjukt i kanterna
        if (b.x < -b.r * 0.5 || b.x > W + b.r * 0.5) b.vx *= -1;
        if (b.y < -b.r * 0.5 || b.y > H + b.r * 0.5) b.vy *= -1;

        // scroll drar isär kloten, musen puttar dem
        var px = b.x + Math.sin(t * 1.7 + b.phase) * 42 + mx * 46 * b.drift;
        var py = b.y - scrollShift * b.drift + Math.cos(t * 1.4 + b.phase) * 38 + my * 46 * b.drift;

        // vira runt vertikalt så kloten aldrig tar slut vid scroll
        var span = H + b.r * 2;
        py = ((py + b.r) % span + span) % span - b.r;

        // radien pulserar lite med scrollen
        var r = b.r * (0.86 + Math.sin(t * 2.1 + b.phase) * 0.09 + scrollProgress * 0.14);

        var col = b.c;
        // vitt lyser betydligt starkare än mättade färger på mörk botten,
        // så alfat hålls lågt — och stiger en aning när man scrollar
        var alpha = 0.062 + Math.sin(t * 1.9 + b.phase) * 0.018 + lift * 0.03;

        var g = ctx.createRadialGradient(px, py, 0, px, py, r);
        g.addColorStop(0, 'rgba(' + col[0] + ',' + col[1] + ',' + col[2] + ',' + alpha.toFixed(3) + ')');
        g.addColorStop(0.55, 'rgba(' + col[0] + ',' + col[1] + ',' + col[2] + ',' + (alpha * 0.32).toFixed(3) + ')');
        g.addColorStop(1, 'rgba(' + col[0] + ',' + col[1] + ',' + col[2] + ',0)');

        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(px, py, r, 0, Math.PI * 2);
        ctx.fill();
      }

      /* ---- nätverk av noder ---- */
      ctx.globalCompositeOperation = 'source-over';

      // beräkna positioner en gång
      for (var n = 0; n < nodes.length; n++) {
        var p = nodes[n];
        p.x += p.vx;
        p.y += p.vy;

        if (p.x < 0) p.x = W; else if (p.x > W) p.x = 0;
        if (p.y < 0) p.y = H; else if (p.y > H) p.y = 0;

        // parallax: scroll och mus flyttar noderna olika mycket
        p.sx = p.x + mx * 26 * p.depth;
        p.sy = p.y - (scrollY * 0.12 * p.depth) + my * 26 * p.depth;

        var spanN = H + 120;
        p.sy = ((p.sy + 60) % spanN + spanN) % spanN - 60;
      }

      // linjer
      ctx.lineWidth = 1;
      for (var a = 0; a < nodes.length; a++) {
        var na = nodes[a];
        for (var bIdx = a + 1; bIdx < nodes.length; bIdx++) {
          var nb = nodes[bIdx];
          var dx = na.sx - nb.sx;
          var dy = na.sy - nb.sy;
          var d2 = dx * dx + dy * dy;
          if (d2 > LINK_DIST * LINK_DIST) continue;

          var d = Math.sqrt(d2);
          // ljusstyrkan följer scrollen -> nätverket klarnar när man scrollar
          var o = (1 - d / LINK_DIST) * (0.16 + lift * 0.22);
          var li = 62 + lift * 30 + (na.sx / W) * 8;
          ctx.strokeStyle = 'hsla(45,10%,' + li.toFixed(0) + '%,' + o.toFixed(3) + ')';
          ctx.beginPath();
          ctx.moveTo(na.sx, na.sy);
          ctx.lineTo(nb.sx, nb.sy);
          ctx.stroke();
        }
      }

      // punkter
      for (var k = 0; k < nodes.length; k++) {
        var q = nodes[k];
        var li2 = 70 + lift * 28 + q.depth * 6;
        ctx.fillStyle = 'hsla(45,10%,' + li2.toFixed(0) + '%,' + (0.2 + q.depth * 0.28 + lift * 0.14).toFixed(3) + ')';
        ctx.beginPath();
        ctx.arc(q.sx, q.sy, q.r, 0, Math.PI * 2);
        ctx.fill();
      }

      raf = requestAnimationFrame(draw);
    }

    var raf = null;

    function start() { if (!raf) raf = requestAnimationFrame(draw); }
    function stop() { if (raf) { cancelAnimationFrame(raf); raf = null; } }

    window.addEventListener('resize', debounce(resize, 180));
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) stop(); else start();
    });

    if (!isTouch) {
      window.addEventListener('mousemove', function (e) {
        tmx = (e.clientX / window.innerWidth) * 2 - 1;
        tmy = (e.clientY / window.innerHeight) * 2 - 1;
      }, { passive: true });
    }

    resize();
    start();
  }

  /* =========================================================
     2. MARKÖRGLÖD
     ========================================================= */

  var glow = document.getElementById('cursorGlow');
  if (glow && !isTouch && !reduce) {
    var gx = window.innerWidth / 2, gy = window.innerHeight / 2;
    var tgx = gx, tgy = gy;

    window.addEventListener('mousemove', function (e) {
      tgx = e.clientX; tgy = e.clientY;
      glow.style.opacity = '1';
    }, { passive: true });

    document.addEventListener('mouseleave', function () { glow.style.opacity = '0'; });

    (function loop() {
      gx += (tgx - gx) * 0.09;
      gy += (tgy - gy) * 0.09;
      glow.style.transform = 'translate(' + gx.toFixed(1) + 'px,' + gy.toFixed(1) + 'px)';
      requestAnimationFrame(loop);
    })();
  }

  /* =========================================================
     3. SCROLLAVSLÖJANDEN
     ========================================================= */

  var revealEls = document.querySelectorAll('.reveal');

  if ('IntersectionObserver' in window && !reduce) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var el = entry.target;
        // liten stegring inom samma förälder
        var siblings = Array.prototype.filter.call(
          el.parentNode ? el.parentNode.children : [],
          function (c) { return c.classList && c.classList.contains('reveal'); }
        );
        var idx = siblings.indexOf(el);
        el.style.transitionDelay = (idx > 0 ? Math.min(idx, 6) * 0.07 : 0) + 's';
        el.classList.add('in');
        io.unobserve(el);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });

    Array.prototype.forEach.call(revealEls, function (el) { io.observe(el); });
  } else {
    Array.prototype.forEach.call(revealEls, function (el) { el.classList.add('in'); });
  }

  /* =========================================================
     4. TILT + LJUSFLÄCK PÅ KORT
     ========================================================= */

  if (!isTouch && !reduce) {
    var tiltEls = document.querySelectorAll('[data-tilt]');

    Array.prototype.forEach.call(tiltEls, function (el) {
      var strength = el.classList.contains('code-card') ? 6 : 8;

      el.addEventListener('mousemove', function (e) {
        var rect = el.getBoundingClientRect();
        var px = (e.clientX - rect.left) / rect.width;
        var py = (e.clientY - rect.top) / rect.height;

        el.style.transform =
          'perspective(1100px) rotateX(' + ((0.5 - py) * strength).toFixed(2) + 'deg)' +
          ' rotateY(' + ((px - 0.5) * strength).toFixed(2) + 'deg)' +
          ' translateY(-4px)';
      });

      el.addEventListener('mouseleave', function () {
        el.style.transform = '';
      });
    });

    // ljusfläck som följer musen på tjänstekorten
    var lightCards = document.querySelectorAll('.card');
    Array.prototype.forEach.call(lightCards, function (card) {
      card.addEventListener('mousemove', function (e) {
        var r = card.getBoundingClientRect();
        card.style.setProperty('--mx', ((e.clientX - r.left) / r.width * 100).toFixed(1) + '%');
        card.style.setProperty('--my', ((e.clientY - r.top) / r.height * 100).toFixed(1) + '%');
      });
    });
  }

  /* =========================================================
     5. MAGNETISKA KNAPPAR
     ========================================================= */

  if (!isTouch && !reduce) {
    var magnets = document.querySelectorAll('.magnetic');

    Array.prototype.forEach.call(magnets, function (el) {
      el.addEventListener('mousemove', function (e) {
        var r = el.getBoundingClientRect();
        var dx = e.clientX - (r.left + r.width / 2);
        var dy = e.clientY - (r.top + r.height / 2);
        el.style.transform = 'translate(' + (dx * 0.22).toFixed(1) + 'px,' + (dy * 0.3).toFixed(1) + 'px)';
      });
      el.addEventListener('mouseleave', function () {
        el.style.transform = '';
      });
    });
  }

  /* =========================================================
     6. KODFÖNSTER — typning
     ========================================================= */

  var typeTarget = document.getElementById('typeTarget');

  if (typeTarget) {
    var tokens = [
      ['// Så här bygger vi din hemsida\n', 'c'],
      ['const', 'k'], [' projekt = ', ''], ['await', 'k'], [' okdweb.', ''],
      ['bygg', 'f'], ['({\n', ''],
      ['  design:      ', ''], ["'egen, inte mall'", 's'], [',\n', ''],
      ['  kod:         ', ''], ["'handskriven'", 's'], [',\n', ''],
      ['  mobil:       ', ''], ['true', 'n'], [',\n', ''],
      ['  laddtid:     ', ''], ["'snabb'", 's'], [',\n', ''],
      ['  revideringar: ', ''], ["'tills du är nöjd'", 's'], ['\n', ''],
      ['});\n\n', ''],
      ['projekt.', ''], ['lansera', 'f'], ['();', ''],
      ['  // ✓ live', 'c']
    ];

    if (reduce) {
      // ingen animation: skriv ut allt direkt
      tokens.forEach(function (tk) {
        var s = document.createElement('span');
        if (tk[1]) s.className = tk[1];
        s.textContent = tk[0];
        typeTarget.appendChild(s);
      });
    } else {
      var ti = 0, ci = 0, current = null;

      function typeStep() {
        if (ti >= tokens.length) return;

        var token = tokens[ti];

        if (ci === 0) {
          current = document.createElement('span');
          if (token[1]) current.className = token[1];
          typeTarget.appendChild(current);
        }

        current.textContent += token[0].charAt(ci);
        ci++;

        if (ci >= token[0].length) { ti++; ci = 0; }

        var ch = token[0].charAt(ci - 1);
        var delay = ch === '\n' ? 90 : (14 + Math.random() * 26);
        setTimeout(typeStep, delay);
      }

      // starta när kodfönstret syns
      var codeCard = document.querySelector('.code-card');
      if ('IntersectionObserver' in window && codeCard) {
        var cio = new IntersectionObserver(function (en) {
          if (en[0].isIntersecting) {
            setTimeout(typeStep, 650);
            cio.disconnect();
          }
        }, { threshold: 0.25 });
        cio.observe(codeCard);
      } else {
        setTimeout(typeStep, 650);
      }
    }
  }

  /* =========================================================
     7. SIFFROR SOM RÄKNAS UPP
     ========================================================= */

  var counters = document.querySelectorAll('.count');

  if ('IntersectionObserver' in window && !reduce) {
    var nio = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        countUp(entry.target);
        nio.unobserve(entry.target);
      });
    }, { threshold: 0.5 });

    Array.prototype.forEach.call(counters, function (el) { nio.observe(el); });
  } else {
    Array.prototype.forEach.call(counters, function (el) { finishCount(el); });
  }

  function finishCount(el) {
    var txt = el.getAttribute('data-text');
    el.textContent = txt !== null ? txt : (el.getAttribute('data-to') + (el.getAttribute('data-suffix') || ''));
  }

  function countUp(el) {
    var txt = el.getAttribute('data-text');
    if (txt !== null) { el.textContent = txt; return; }

    var to = parseFloat(el.getAttribute('data-to')) || 0;
    var suffix = el.getAttribute('data-suffix') || '';
    var dur = 1500;
    var t0 = null;

    function frame(ts) {
      if (t0 === null) t0 = ts;
      var p = Math.min(1, (ts - t0) / dur);
      var eased = 1 - Math.pow(1 - p, 3);
      el.textContent = Math.round(to * eased) + suffix;
      if (p < 1) requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  /* =========================================================
     8. SCRAMBLE-TEXT I HERO
     ========================================================= */

  var scramble = document.getElementById('scramble');

  if (scramble && !reduce) {
    var finalText = scramble.textContent;
    var chars = '!<>-_\\/[]{}—=+*^?#________';
    var frame = 0;
    var queue = [];

    for (var s = 0; s < finalText.length; s++) {
      queue.push({
        to: finalText[s],
        start: Math.floor(Math.random() * 22),
        end: Math.floor(Math.random() * 22) + 22
      });
    }

    (function scrambleLoop() {
      var out = '';
      var done = 0;

      for (var i = 0; i < queue.length; i++) {
        var q = queue[i];
        if (frame >= q.end) { done++; out += q.to; }
        else if (frame >= q.start) {
          if (!q.ch || Math.random() < 0.3) q.ch = chars[Math.floor(Math.random() * chars.length)];
          out += q.ch;
        } else {
          out += q.to === ' ' ? ' ' : '';
        }
      }

      scramble.textContent = out;
      frame++;

      if (done < queue.length) requestAnimationFrame(scrambleLoop);
      else scramble.textContent = finalText;
    })();
  }

  /* =========================================================
     9. MOBILMENY
     ========================================================= */

  var burger = document.getElementById('burger');
  var mobileMenu = document.getElementById('mobileMenu');

  if (burger && mobileMenu) {
    burger.addEventListener('click', function () {
      var open = burger.getAttribute('aria-expanded') === 'true';
      burger.setAttribute('aria-expanded', String(!open));
      burger.setAttribute('aria-label', open ? 'Öppna meny' : 'Stäng meny');
      mobileMenu.hidden = open;
    });

    mobileMenu.addEventListener('click', function (e) {
      if (e.target.tagName === 'A') {
        burger.setAttribute('aria-expanded', 'false');
        burger.setAttribute('aria-label', 'Öppna meny');
        mobileMenu.hidden = true;
      }
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !mobileMenu.hidden) {
        burger.setAttribute('aria-expanded', 'false');
        mobileMenu.hidden = true;
        burger.focus();
      }
    });
  }

  /* =========================================================
     10. FAQ — bara en öppen i taget
     ========================================================= */

  var faqItems = document.querySelectorAll('.faq details');
  Array.prototype.forEach.call(faqItems, function (item) {
    item.addEventListener('toggle', function () {
      if (!item.open) return;
      Array.prototype.forEach.call(faqItems, function (other) {
        if (other !== item) other.open = false;
      });
    });
  });

  /* =========================================================
     11. KONTAKTFORMULÄR
     Ingen backend — öppnar e-postklienten med ifylld text.
     ========================================================= */

  var form = document.getElementById('contactForm');
  var formMsg = document.getElementById('formMsg');

  if (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();

      var namn = form.namn;
      var epost = form.epost;
      var meddelande = form.meddelande;
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

      window.location.href =
        'mailto:hej@okdweb.com?subject=' + encodeURIComponent(subject) +
        '&body=' + encodeURIComponent(body);

      formMsg.className = 'form-msg ok';
      formMsg.textContent = 'Tack! Din e-postklient öppnas med meddelandet — tryck skicka så hör vi av oss inom 24 timmar.';
    });

    // ta bort felmarkering när man börjar skriva
    form.addEventListener('input', function (e) {
      if (e.target.classList) e.target.classList.remove('invalid');
    });
  }

  /* =========================================================
     12. ÅRTAL I SIDFOT
     ========================================================= */

  var year = document.getElementById('year');
  if (year) year.textContent = new Date().getFullYear();

  /* =========================================================
     HJÄLPFUNKTION
     ========================================================= */

  function debounce(fn, wait) {
    var t;
    return function () {
      var args = arguments, self = this;
      clearTimeout(t);
      t = setTimeout(function () { fn.apply(self, args); }, wait);
    };
  }
})();
