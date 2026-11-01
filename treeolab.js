/* TreeoLab skin behaviour: logo growth, home slideshow, mobile menu. */
(function () {
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- mobile menu ---------- */
  var btn = document.querySelector('.mbar-btn');
  if (btn) {
    btn.addEventListener('click', function () {
      var open = document.body.classList.toggle('nav-open');
      btn.setAttribute('aria-expanded', open);
    });
  }

  /* ---------- sidebar: subcategories start closed; the current one opens ---------- */
  var here = decodeURIComponent(location.pathname);
  document.querySelectorAll('.side-nav .category_list > li').forEach(function (li) {
    var sub = li.querySelector('.sub_category_list');
    var head = li.querySelector('.link_item');
    if (!sub || !head) return;
    li.classList.add('has-sub');
    var t = document.createElement('button');
    t.type = 'button';
    t.className = 'cat-toggle';
    t.setAttribute('aria-label', head.textContent.replace(/\(\d+\)/, '').trim() + ' 하위 주제');
    head.after(t);
    var open = Array.prototype.some.call(li.querySelectorAll('a'), function (a) {
      try { var u = new URL(a.href); return !a.getAttribute("href").startsWith("#") && decodeURIComponent(u.pathname) === here; } catch (e) { return false; }
    });
    li.classList.toggle('open', open);
    t.setAttribute('aria-expanded', open);
    t.addEventListener('click', function () {
      var o = li.classList.toggle('open');
      t.setAttribute('aria-expanded', o);
    });
  });

  function linkHref(id, fallback) {
    var el = document.getElementById(id);
    return el ? el.href : fallback;
  }

  /* ---------- logo: one continuous growth from the root ---------- */
  var svgText = null;
  function loadTree() {
    if (svgText) return Promise.resolve(svgText);
    return fetch(linkHref('tl-tree', 'images/treeolab-tree.svg'))
      .then(function (r) { return r.text(); })
      .then(function (t) { svgText = t; return t; });
  }

  var FRUIT = /^#(7E1019|FFF1DE|5E9A3E|3F7A30|E8B04A)$/i;

  // The tree is revealed by an ellipse that rises from the root, so the trunk
  // carries on into the branches and the branches into the leaves without a break.
  // Leaves inside the front edge of that ellipse swell slightly as it passes them.
  function grow(svg) {
    var vb = svg.viewBox.baseVal;
    var ns = 'http://www.w3.org/2000/svg';
    var rootX = vb.x + vb.width * 0.5, rootY = vb.y + vb.height * 0.93;
    var maxR = Math.hypot(vb.width * 0.62, vb.height * 0.98);

    var defs = document.createElementNS(ns, 'defs');
    var clip = document.createElementNS(ns, 'clipPath');
    clip.setAttribute('id', 'tl-grow-clip');
    var shape = document.createElementNS(ns, 'ellipse');
    shape.setAttribute('cx', rootX); shape.setAttribute('cy', rootY);
    shape.setAttribute('rx', 0); shape.setAttribute('ry', 0);
    clip.appendChild(shape); defs.appendChild(clip); svg.insertBefore(defs, svg.firstChild);

    var g = document.createElementNS(ns, 'g');
    g.setAttribute('clip-path', 'url(#tl-grow-clip)');
    var fruit = [];
    Array.prototype.slice.call(svg.childNodes).forEach(function (n) {
      if (n === defs) return;
      g.appendChild(n);
    });
    svg.appendChild(g);
    g.querySelectorAll('path, ellipse').forEach(function (el) {
      if (FRUIT.test(el.getAttribute('fill') || '')) fruit.push(el);
    });
    fruit.forEach(function (el) { el.style.opacity = 0; });

    var dur = 2300, t0 = performance.now();
    var ease = function (t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };
    return new Promise(function (resolve) {
      function frame(now) {
        var p = Math.min(1, (now - t0) / dur), e = ease(p);
        // narrow and tall at first (trunk), wide at the end (canopy)
        shape.setAttribute('ry', maxR * e);
        shape.setAttribute('rx', maxR * e * (0.18 + 0.82 * e));
        if (p < 1) requestAnimationFrame(frame);
        else {
          g.removeAttribute('clip-path');
          fruit.forEach(function (el, i) {
            el.style.transformBox = 'fill-box'; el.style.transformOrigin = 'center top'; el.style.opacity = '';
            el.animate([{ transform: 'scale(0)', opacity: 0 }, { transform: 'scale(1.15)', opacity: 1, offset: .7 }, { transform: 'scale(1)', opacity: 1 }],
              { duration: 480, delay: (i % 4) * 90, easing: 'ease-out', fill: 'backwards' });
          });
          setTimeout(resolve, 520);
        }
      }
      requestAnimationFrame(frame);
    });
  }

  function playLogo(href) {
    var layer = document.createElement('div');
    layer.className = 'grow-layer';
    layer.setAttribute('role', 'presentation');
    var stage = document.createElement('div');
    stage.className = 'grow-stage';
    var name = document.createElement('img');
    name.className = 'grow-name';
    name.alt = 'TreeoLab';
    name.src = linkHref('tl-wordmark', 'images/treeolab-wordmark.png');
    layer.appendChild(stage); layer.appendChild(name);
    document.body.appendChild(layer);

    var closed = false;
    function done() {
      if (closed) return;
      closed = true;
      var same = !href || href === '#' || href === location.href || href === location.pathname;
      if (same) layer.remove(); else location.href = href;
    }
    layer.addEventListener('click', done);

    loadTree().then(function (t) {
      stage.innerHTML = t; // our own logo file from the skin's asset repo
      var svg = stage.querySelector('svg');
      svg.removeAttribute('width'); svg.removeAttribute('height');
      layer.classList.add('on');
      return grow(svg);
    }).then(function () {
      layer.classList.add('named');
      setTimeout(done, 1100);
    }).catch(done);
  }

  document.querySelectorAll('[data-grow]').forEach(function (a) {
    a.addEventListener('click', function (e) {
      if (reduce || e.metaKey || e.ctrlKey || e.shiftKey) return;
      e.preventDefault();
      playLogo(a.getAttribute('href'));
    });
  });

  /* ---------- bento clip tile: plays where it sits ---------- */
  document.querySelectorAll('.t-video').forEach(function (tile) {
    var v = tile.querySelector('video'), b = tile.querySelector('.t-play');
    if (!v || !b) return;
    b.addEventListener('click', function () {
      if (!v.getAttribute('src')) v.src = v.getAttribute('data-src');
      if (v.paused) {
        v.play().then(function () {
          tile.classList.add('playing');
          b.setAttribute('aria-label', '영상 멈춤');
        }).catch(function () {});
      } else {
        v.pause();
        tile.classList.remove('playing');
        b.setAttribute('aria-label', '영상 재생');
      }
    });
  });

  /* ---------- home slideshow ---------- */
  var hero = document.querySelector('.hero');
  if (!hero) return;
  var slides = Array.prototype.slice.call(hero.querySelectorAll('.slide'));
  if (!slides.length) return;
  var small = window.matchMedia('(max-width: 900px)').matches;
  var hold = parseInt(hero.getAttribute('data-hold'), 10) || 6000;
  var count = hero.querySelector('.hero-count b');
  var total = hero.querySelector('.hero-count span');
  var place = hero.querySelector('.hero-place');
  var bars = hero.querySelector('.hero-bars');
  var pauseBtn = hero.querySelector('.pause');
  var i = 0, started = 0, elapsed = 0, paused = false, raf = null;

  if (total) total.textContent = String(slides.length).padStart(2, '0');
  var fills = slides.map(function (s, n) {
    var b = document.createElement('button');
    b.type = 'button';
    b.setAttribute('aria-label', (n + 1) + '번째 장면');
    b.appendChild(document.createElement('i'));
    b.addEventListener('click', function () { go(n); });
    bars.appendChild(b);
    return b;
  });

  function videoOf(s) {
    var v = s.querySelector('video');
    if (v && !v.getAttribute('src')) {
      v.src = (small && v.getAttribute('data-sm')) || v.getAttribute('data-src');
      v.muted = true;
    }
    return v;
  }

  function label(s) {
    if (!place) return;
    place.classList.add('fade');
    setTimeout(function () {
      place.textContent = s.getAttribute('data-place') || '';
      place.classList.remove('fade');
    }, 300);
  }

  function go(n) {
    var cur = slides[i], old = cur.querySelector('video');
    if (old) old.pause();
    cur.classList.remove('on');
    i = (n + slides.length) % slides.length;
    var s = slides[i];
    s.classList.add('on');
    if (count) count.textContent = String(i + 1).padStart(2, '0');
    fills.forEach(function (b, k) { b.classList.toggle('done', k < i); b.firstChild.style.width = k < i ? '100%' : '0'; });
    label(s);
    elapsed = 0; started = performance.now();
    var v = videoOf(s);
    if (v && !paused && !reduce) {
      v.currentTime = 0;
      var p = v.play();
      if (p && p.catch) p.catch(function () {});
    }
  }

  function tick(now) {
    var s = slides[i], v = s.querySelector('video'), frac;
    if (v && v.getAttribute('src') && v.duration && !isNaN(v.duration) && !v.error) {
      frac = v.currentTime / v.duration;
      if (v.ended) frac = 1;
    } else {
      if (!paused) elapsed += now - started;
      started = now;
      frac = elapsed / hold;
    }
    fills[i].firstChild.style.width = Math.min(100, frac * 100) + '%';
    if (frac >= 1 && !paused) go(i + 1);
    raf = requestAnimationFrame(tick);
  }

  function setPaused(p) {
    paused = p;
    var v = slides[i].querySelector('video');
    if (v) { if (p) v.pause(); else v.play().catch(function () {}); }
    if (pauseBtn) {
      pauseBtn.setAttribute('aria-label', p ? '재생' : '일시정지');
      pauseBtn.classList.toggle('is-paused', p);
    }
  }

  hero.querySelector('.prev') && hero.querySelector('.prev').addEventListener('click', function () { go(i - 1); });
  hero.querySelector('.next') && hero.querySelector('.next').addEventListener('click', function () { go(i + 1); });
  if (pauseBtn) pauseBtn.addEventListener('click', function () { setPaused(!paused); });

  go(0);
  if (reduce) { setPaused(true); return; }
  started = performance.now();
  raf = requestAnimationFrame(tick);
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) { cancelAnimationFrame(raf); var v = slides[i].querySelector('video'); if (v) v.pause(); }
    else { started = performance.now(); if (!paused) { var w = slides[i].querySelector('video'); if (w) w.play().catch(function () {}); } raf = requestAnimationFrame(tick); }
  });
})();
