/* ============================================================
   NEONPLAY — local account system
   NOTE: this is deliberately simple, browser-only score-keeping.
   Passcodes are salted + hashed so they aren't sitting in
   localStorage in the clear, but anything running in this page
   can read the store. It is NOT real authentication.
   ============================================================ */
(function () {
  'use strict';

  var USERS = 'neonplay:users';
  var SESSION = 'neonplay:session';

  function load(key, fallback) {
    try { return JSON.parse(localStorage.getItem(key)) || fallback; }
    catch (e) { return fallback; }
  }
  function save(key, val) {
    try { localStorage.setItem(key, JSON.stringify(val)); return true; }
    catch (e) { return false; }
  }

  /* --- hashing: SubtleCrypto when available, small fallback otherwise --- */
  function fallbackHash(str) {
    var h1 = 0x811c9dc5, h2 = 0x01000193, out = '';
    for (var i = 0; i < str.length; i++) {
      h1 = (h1 ^ str.charCodeAt(i)) >>> 0;
      h1 = Math.imul(h1, 16777619) >>> 0;
      h2 = (h2 + Math.imul(str.charCodeAt(i) + i, 2654435761)) >>> 0;
    }
    for (var r = 0; r < 4; r++) {
      h1 = Math.imul(h1 ^ (h1 >>> 15), 2246822507) >>> 0;
      h2 = Math.imul(h2 ^ (h2 >>> 13), 3266489909) >>> 0;
      out += ('00000000' + h1.toString(16)).slice(-8) + ('00000000' + h2.toString(16)).slice(-8);
    }
    return Promise.resolve(out);
  }

  function hash(pass, salt) {
    var msg = 'neonplay$' + salt + '$' + pass;
    if (window.crypto && window.crypto.subtle && window.TextEncoder) {
      try {
        return window.crypto.subtle
          .digest('SHA-256', new TextEncoder().encode(msg))
          .then(function (buf) {
            return Array.prototype.map
              .call(new Uint8Array(buf), function (b) { return ('0' + b.toString(16)).slice(-2); })
              .join('');
          })
          .catch(function () { return fallbackHash(msg); });
      } catch (e) { /* fall through */ }
    }
    return fallbackHash(msg);
  }

  function makeSalt() {
    var a = new Uint8Array(12);
    if (window.crypto && window.crypto.getRandomValues) window.crypto.getRandomValues(a);
    else for (var i = 0; i < a.length; i++) a[i] = Math.floor(Math.random() * 256);
    return Array.prototype.map.call(a, function (b) { return ('0' + b.toString(16)).slice(-2); }).join('');
  }

  var Auth = {
    AVATARS: ['👾', '🤖', '👽', '🦊', '🐲', '🍕',
              '🧊', '🎮', '💀', '🌈', '🦄', '🔥'],

    users: function () { return load(USERS, {}); },

    exists: function (name) {
      return Object.prototype.hasOwnProperty.call(this.users(), String(name).toLowerCase());
    },

    register: function (name, pass, avatar) {
      name = String(name || '').trim();
      var key = name.toLowerCase();
      if (name.length < 3) return Promise.reject('Player name needs at least 3 characters.');
      if (!/^[a-zA-Z0-9_\-.]+$/.test(name)) return Promise.reject('Letters, numbers, _ - . only.');
      if (String(pass || '').length < 4) return Promise.reject('Passcode needs at least 4 characters.');
      if (this.exists(key)) return Promise.reject('That player name is taken.');

      var salt = makeSalt();
      return hash(pass, salt).then(function (h) {
        var all = load(USERS, {});
        all[key] = {
          name: name,
          salt: salt,
          hash: h,
          avatar: avatar || '👾',
          created: Date.now(),
          scores: {},
          plays: 0
        };
        if (!save(USERS, all)) throw 'Storage is full or blocked in this browser.';
        return all[key];
      });
    },

    login: function (name, pass) {
      var key = String(name || '').trim().toLowerCase();
      var rec = this.users()[key];
      if (!rec) return Promise.reject('No player by that name.');
      return hash(pass, rec.salt).then(function (h) {
        if (h !== rec.hash) throw 'Wrong passcode.';
        save(SESSION, { key: key, at: Date.now() });
        return rec;
      });
    },

    guest: function () {
      save(SESSION, { key: null, guest: true, at: Date.now() });
      return { name: 'guest', avatar: '👾', scores: {}, plays: 0, isGuest: true };
    },

    current: function () {
      var s = load(SESSION, null);
      if (!s) return null;
      if (s.guest) return { name: 'guest', avatar: '👾', scores: {}, plays: 0, isGuest: true };
      var rec = this.users()[s.key];
      if (!rec) return null;
      rec.key = s.key;
      return rec;
    },

    logout: function () { try { localStorage.removeItem(SESSION); } catch (e) {} },

    /* persist a best score; returns true when it's a new record */
    submit: function (gameId, score, higherIsBetter) {
      var cur = this.current();
      if (!cur) return false;
      if (cur.isGuest) return false;
      var all = load(USERS, {});
      var rec = all[cur.key];
      if (!rec) return false;
      rec.scores = rec.scores || {};
      var prev = rec.scores[gameId];
      var better = prev === undefined ||
        (higherIsBetter === false ? score < prev : score > prev);
      if (better) rec.scores[gameId] = score;
      save(USERS, all);
      return better;
    },

    best: function (gameId) {
      var cur = this.current();
      if (!cur || !cur.scores) return undefined;
      return cur.scores[gameId];
    },

    countPlay: function () {
      var cur = this.current();
      if (!cur || cur.isGuest) return;
      var all = load(USERS, {});
      if (!all[cur.key]) return;
      all[cur.key].plays = (all[cur.key].plays || 0) + 1;
      save(USERS, all);
    }
  };

  window.Auth = Auth;
})();
