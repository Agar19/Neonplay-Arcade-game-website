/* ============================================================
   NEONPLAY — arcade shell: registry, cards, stage, game API
   ============================================================ */
(function () {
  'use strict';

  var games = [];
  var byId = {};

  var Arcade = {
    games: games,

    register: function (def) {
      def.tag = def.tag || 'Arcade';
      def.emoji = def.emoji || '🎮';
      def.colors = def.colors || ['#8b5cff', '#00e5ff'];
      def.higher = def.higher !== false;
      def.unit = def.unit || '';
      games.push(def);
      byId[def.id] = def;
      return def;
    },

    get: function (id) { return byId[id]; },

    /* ---------- tiny DOM helper ---------- */
    h: function (html) {
      var t = document.createElement('template');
      t.innerHTML = String(html).trim();
      return t.content.firstElementChild;
    },

    toast: function (msg) {
      var el = document.getElementById('toast');
      el.textContent = msg;
      el.classList.add('show');
      clearTimeout(el._t);
      el._t = setTimeout(function () { el.classList.remove('show'); }, 2200);
    },

    fmtBest: function (g) {
      var b = window.Auth.best(g.id);
      if (b === undefined || b === null) return '';
      return b + (g.unit ? ' ' + g.unit : '');
    }
  };

  /* ============================================================
     STAGE — mounting / unmounting a single game
     ============================================================ */
  var live = null; // { def, destroy, cleanups }

  function makeApi(def) {
    var cleanups = [];
    var api = {
      def: def,

      /* auto-removed event listener */
      on: function (target, type, fn, opts) {
        target.addEventListener(type, fn, opts);
        cleanups.push(function () { target.removeEventListener(type, fn, opts); });
        return fn;
      },

      /* rAF loop with delta seconds; auto-cancelled on unmount */
      loop: function (fn) {
        var last = performance.now(), id = 0, stopped = false;
        function step(now) {
          if (stopped) return;
          var dt = Math.min((now - last) / 1000, 0.05);
          last = now;
          fn(dt, now);
          id = requestAnimationFrame(step);
        }
        id = requestAnimationFrame(step);
        var stop = function () { stopped = true; cancelAnimationFrame(id); };
        cleanups.push(stop);
        return stop;
      },

      interval: function (fn, ms) {
        var id = setInterval(fn, ms);
        cleanups.push(function () { clearInterval(id); });
        return function () { clearInterval(id); };
      },

      timeout: function (fn, ms) {
        var id = setTimeout(fn, ms);
        cleanups.push(function () { clearTimeout(id); });
        return function () { clearTimeout(id); };
      },

      onCleanup: function (fn) { cleanups.push(fn); },

      toast: Arcade.toast,
      h: Arcade.h,

      /* submit a score for the leaderboard pill */
      score: function (value) {
        var isRecord = window.Auth.submit(def.id, value, def.higher);
        renderBestPill(def);
        if (isRecord) Arcade.toast('🏆 New personal best: ' + value + (def.unit ? ' ' + def.unit : ''));
        return isRecord;
      },

      best: function () { return window.Auth.best(def.id); },

      restart: function () { openGame(def.id); },
      exit: closeGame,

      /* simple bleep synth — no audio files needed */
      beep: beep
    };
    api._cleanups = cleanups;
    return api;
  }

  /* ---------- WebAudio bleeps ---------- */
  var actx = null;
  function beep(freq, dur, type, gain) {
    try {
      if (!actx) actx = new (window.AudioContext || window.webkitAudioContext)();
      if (actx.state === 'suspended') actx.resume();
      var o = actx.createOscillator(), g = actx.createGain();
      o.type = type || 'square';
      o.frequency.value = freq || 440;
      g.gain.value = (gain === undefined ? 0.05 : gain);
      o.connect(g); g.connect(actx.destination);
      var t = actx.currentTime;
      g.gain.setValueAtTime(g.gain.value, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + (dur || 0.12));
      o.start(t); o.stop(t + (dur || 0.12) + 0.02);
    } catch (e) { /* audio is optional */ }
  }

  function renderBestPill(def) {
    var pill = document.getElementById('stage-best');
    var b = window.Auth.best(def.id);
    if (b === undefined || b === null) {
      pill.textContent = window.Auth.current() && window.Auth.current().isGuest
        ? 'Guest — scores not saved' : 'No score yet';
      pill.style.background = 'rgba(255,255,255,.06)';
      pill.style.color = 'var(--dim)';
    } else {
      pill.textContent = '🏆 Best ' + b + (def.unit ? ' ' + def.unit : '');
      pill.style.background = 'rgba(255,217,61,.14)';
      pill.style.color = 'var(--c5)';
    }
  }

  function unmount() {
    if (!live) return;
    try { if (typeof live.destroy === 'function') live.destroy(); } catch (e) {}
    live.api._cleanups.forEach(function (fn) { try { fn(); } catch (e) {} });
    document.getElementById('stage-mount').innerHTML = '';
    live = null;
  }

  function openGame(id) {
    var def = byId[id];
    if (!def) return;
    unmount();

    document.getElementById('stage-title').textContent = def.name;
    document.getElementById('stage-help').innerHTML = def.help || '';
    renderBestPill(def);
    document.getElementById('stage').classList.remove('hidden');
    document.getElementById('app').classList.add('hidden');

    var mount = document.getElementById('stage-mount');
    var api = makeApi(def);
    var ret;
    try {
      ret = def.mount(mount, api);
    } catch (e) {
      mount.innerHTML = '<p style="color:var(--danger)">This game failed to start: ' + e.message + '</p>';
      console.error(e);
    }
    live = {
      def: def,
      api: api,
      destroy: (typeof ret === 'function') ? ret : (ret && ret.destroy)
    };
    window.Auth.countPlay();
    location.hash = 'play/' + id;
  }

  function closeGame() {
    unmount();
    document.getElementById('stage').classList.add('hidden');
    document.getElementById('app').classList.remove('hidden');
    renderGrid();
    renderStats();
    if (location.hash.indexOf('#play/') === 0) location.hash = '';
  }

  Arcade.open = openGame;
  Arcade.close = closeGame;

  /* ============================================================
     LIBRARY GRID
     ============================================================ */
  var filter = 'All';
  var query = '';

  function tags() {
    var seen = ['All'];
    games.forEach(function (g) { if (seen.indexOf(g.tag) < 0) seen.push(g.tag); });
    return seen;
  }

  function renderFilters() {
    var nav = document.getElementById('filters');
    nav.innerHTML = '';
    tags().forEach(function (t) {
      var b = Arcade.h('<button class="chip' + (t === filter ? ' active' : '') + '">' + t + '</button>');
      b.onclick = function () { filter = t; renderFilters(); renderGrid(); };
      nav.appendChild(b);
    });
  }

  function renderGrid() {
    var grid = document.getElementById('grid');
    grid.innerHTML = '';
    var q = query.toLowerCase();
    var list = games.filter(function (g) {
      var okTag = filter === 'All' || g.tag === filter;
      var okQ = !q || (g.name + ' ' + g.desc + ' ' + g.tag).toLowerCase().indexOf(q) >= 0;
      return okTag && okQ;
    });

    document.getElementById('empty').classList.toggle('hidden', list.length > 0);

    list.forEach(function (g) {
      var best = Arcade.fmtBest(g);
      var card = Arcade.h(
        '<article class="card" tabindex="0">' +
          '<div class="glow" style="background:linear-gradient(90deg,' + g.colors[0] + ',' + g.colors[1] + ')"></div>' +
          '<div class="emoji">' + g.emoji + '</div>' +
          '<h3></h3>' +
          '<p></p>' +
          '<div class="meta"><span class="tagpill">' + g.tag + '</span>' +
            '<span class="best">' + (best ? '🏆 ' + best : '') + '</span></div>' +
        '</article>'
      );
      card.querySelector('h3').textContent = g.name;
      card.querySelector('p').textContent = g.desc;
      card.onclick = function () { openGame(g.id); };
      card.onkeydown = function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openGame(g.id); } };
      grid.appendChild(card);
    });

    document.getElementById('foot-count').textContent = games.length + ' games installed';
  }

  function renderStats() {
    var u = window.Auth.current() || { name: 'guest', scores: {}, plays: 0 };
    var scored = Object.keys(u.scores || {}).length;
    var strip = document.getElementById('stats-strip');
    strip.innerHTML = '';
    [
      ['Games', games.length, 'in the cabinet'],
      ['Played', u.plays || 0, 'sessions'],
      ['Records', scored, 'personal bests'],
      ['Player', u.isGuest ? 'GUEST' : u.name, u.isGuest ? 'scores not saved' : 'signed in']
    ].forEach(function (r) {
      strip.appendChild(Arcade.h(
        '<div class="stat"><span>' + r[0] + '</span><b>' + r[1] + '</b><span>' + r[2] + '</span></div>'
      ));
    });
  }

  Arcade.renderAll = function () {
    renderFilters();
    renderGrid();
    renderStats();
  };
  Arcade.setQuery = function (q) { query = q; renderGrid(); };

  window.Arcade = Arcade;
})();
