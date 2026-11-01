/* TreeoLab skin behaviour: logo grow motion, home story loop, mobile menu. */
(function () {
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var root = document.documentElement;
  var base = root.getAttribute('data-skin-base') || '.';

  /* ---------- mobile menu ---------- */
  var btn = document.querySelector('.mbar-btn');
  if (btn) {
    btn.addEventListener('click', function () {
      var open = document.body.classList.toggle('nav-open');
      btn.setAttribute('aria-expanded', open);
    });
  }

  /* ---------- logo: the tree grows, then we go home ---------- */
  var svgText = null;
  function loadTree() {
    if (svgText) return Promise.resolve(svgText);
    var link = document.getElementById('tl-tree');
    var url = link ? link.href : base + '/images/treeolab-tree.svg';
    return fetch(url).then(function (r) { return r.text(); })
      .then(function (t) { svgText = t; return t; });
  }

  var TRUNK = /^#(2A1A14|4A3127)$/i;
  var FRUIT = /^#(7E1019|FFF1DE|5E9A3E|3F7A30|E8B04A)$/i;

  function grow(svg) {
    var parts = Array.prototype.slice.call(svg.querySelectorAll('path, ellipse'));
    var vb = svg.viewBox.baseVal;
    var cx = vb.x + vb.width / 2, top = vb.y + vb.height * 0.62;
    var trunk = [], leaves = [], fruit = [];
    parts.forEach(function (el) {
      var f = el.getAttribute('fill') || '';
      if (TRUNK.test(f)) trunk.push(el); else if (FRUIT.test(f)) fruit.push(el); else leaves.push(el);
      el.style.transformBox = 'fill-box';
      el.style.transformOrigin = 'center';
    });
    trunk.forEach(function (el) {
      el.style.transformOrigin = 'center bottom';
      el.animate([{ transform: 'scaleY(0)' }, { transform: 'scaleY(1)' }],
        { duration: 520, easing: 'cubic-bezier(.2,.7,.2,1)', fill: 'backwards' });
    });
    leaves.forEach(function (el) {
      var b = el.getBBox();
      var d = Math.hypot(b.x + b.width / 2 - cx, b.y + b.height / 2 - top);
      el.animate([{ transform: 'scale(0)', opacity: 0 }, { transform: 'scale(1)', opacity: 1 }],
        { duration: 380, delay: 420 + d * 2.1 + Math.random() * 90, easing: 'cubic-bezier(.3,1.4,.5,1)', fill: 'backwards' });
    });
    fruit.forEach(function (el, i) {
      el.animate([{ transform: 'translateY(-14px) scale(0)', opacity: 0 }, { transform: 'none', opacity: 1 }],
        { duration: 420, delay: 1500 + (i % 3) * 110, easing: 'cubic-bezier(.3,1.6,.5,1)', fill: 'backwards' });
    });
    return 2100;
  }

  function playLogo(href) {
    var layer = document.createElement('div');
    layer.className = 'grow-layer';
    layer.setAttribute('role', 'presentation');
    var wm = document.getElementById('tl-wordmark');
    layer.innerHTML = '<div class="grow-stage"></div><img class="grow-name" alt="TreeoLab" src="' + (wm ? wm.href : base + '/images/treeolab-wordmark.png') + '">';
    document.body.appendChild(layer);
    var closed = false;
    var done = function () {
      if (closed) return;
      closed = true;
      var same = !href || href === '#' || href === location.pathname;
      if (same) layer.remove(); else location.href = href;
    };
    layer.addEventListener('click', done);
    loadTree().then(function (t) {
      var stage = layer.querySelector('.grow-stage');
      stage.innerHTML = t;
      var svg = stage.querySelector('svg');
      svg.removeAttribute('width'); svg.removeAttribute('height');
      requestAnimationFrame(function () {
        layer.classList.add('on');
        var ms = grow(svg);
        setTimeout(function () { layer.classList.add('named'); }, ms - 500);
        setTimeout(done, ms + 700);
      });
    }).catch(done);
  }

  document.querySelectorAll('[data-grow]').forEach(function (a) {
    a.addEventListener('click', function (e) {
      if (reduce || e.metaKey || e.ctrlKey || e.shiftKey) return;
      e.preventDefault();
      playLogo(a.getAttribute('href'));
    });
  });

  /* ---------- home story: Canada photos and clips, one scene at a time ---------- */
  var story = document.querySelector('.story');
  if (!story) return;
  var scenes = Array.prototype.slice.call(story.querySelectorAll('.scene'));
  if (!scenes.length) return;
  var small = window.matchMedia('(max-width: 900px)').matches;
  var hold = parseInt(story.getAttribute('data-hold'), 10) || 5000;
  var i = 0, timer = null;

  // videos load only when their turn comes; phones get the small files
  function videoOf(scene) {
    var v = scene.querySelector('video');
    if (v && !v.src) {
      v.src = (small && v.getAttribute('data-sm')) || v.getAttribute('data-src');
      v.muted = true;
    }
    return v;
  }

  function show(n) {
    var cur = scenes[i];
    cur.classList.remove('on');
    var old = cur.querySelector('video');
    if (old) old.pause();
    i = n;
    var scene = scenes[i];
    scene.classList.add('on');
    clearTimeout(timer);
    var v = videoOf(scene);
    if (v && !reduce) {
      v.currentTime = 0;
      var p = v.play();
      v.onended = advance;
      // a clip that cannot autoplay falls back to its poster for a normal hold
      if (p && p.catch) p.catch(function () { timer = setTimeout(advance, hold); });
      timer = setTimeout(advance, 20000);
    } else {
      timer = setTimeout(advance, hold);
    }
  }
  function advance() { show((i + 1) % scenes.length); }

  scenes[0].classList.add('on');
  if (reduce || scenes.length < 2) return;
  timer = setTimeout(advance, hold);
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) { clearTimeout(timer); var v = scenes[i].querySelector('video'); if (v) v.pause(); }
    else show(i);
  });
})();
