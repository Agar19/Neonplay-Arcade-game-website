/* ============================================================
   NEONPLAY — boot: auth screen wiring + app start
   ============================================================ */
(function () {
  'use strict';

  var $ = function (id) { return document.getElementById(id); };
  var chosenAvatar = Auth.AVATARS[0];

  /* ---------- avatar picker ---------- */
  var pick = $('avatar-pick');
  Auth.AVATARS.forEach(function (a, i) {
    var b = document.createElement('button');
    b.type = 'button';
    b.textContent = a;
    if (i === 0) b.className = 'sel';
    b.onclick = function () {
      chosenAvatar = a;
      Array.prototype.forEach.call(pick.children, function (c) { c.className = ''; });
      b.className = 'sel';
    };
    pick.appendChild(b);
  });

  /* ---------- tabs ---------- */
  Array.prototype.forEach.call(document.querySelectorAll('.tab'), function (t) {
    t.onclick = function () {
      document.querySelectorAll('.tab').forEach(function (x) { x.classList.remove('active'); });
      t.classList.add('active');
      var mode = t.dataset.tab;
      $('form-login').classList.toggle('hidden', mode !== 'login');
      $('form-register').classList.toggle('hidden', mode !== 'register');
      $('msg-login').textContent = '';
      $('msg-register').textContent = '';
    };
  });

  function say(id, text, ok) {
    var el = $(id);
    el.textContent = text;
    el.className = 'msg' + (ok ? ' ok' : '');
  }

  /* ---------- login ---------- */
  $('form-login').onsubmit = function (e) {
    e.preventDefault();
    var f = e.target;
    Auth.login(f.user.value, f.pass.value)
      .then(function () { enterApp(); })
      .catch(function (err) { say('msg-login', String(err)); });
  };

  /* ---------- register ---------- */
  $('form-register').onsubmit = function (e) {
    e.preventDefault();
    var f = e.target;
    if (f.pass.value !== f.pass2.value) return say('msg-register', 'Passcodes do not match.');
    Auth.register(f.user.value, f.pass.value, chosenAvatar)
      .then(function () { return Auth.login(f.user.value, f.pass.value); })
      .then(function () { enterApp(); })
      .catch(function (err) { say('msg-register', String(err)); });
  };

  $('btn-guest').onclick = function () { Auth.guest(); enterApp(); };

  /* ---------- app ---------- */
  function enterApp() {
    var u = Auth.current();
    if (!u) return;
    $('chip-ava').textContent = u.avatar || '👾';
    $('chip-name').textContent = u.name;
    $('auth').classList.add('hidden');
    $('app').classList.remove('hidden');
    Arcade.renderAll();
    if (u.isGuest) Arcade.toast('Playing as guest — high scores will not be saved.');

    // deep link: #play/<id>
    var m = /^#play\/(.+)$/.exec(location.hash);
    if (m && Arcade.get(m[1])) Arcade.open(m[1]);
  }

  $('btn-logout').onclick = function () {
    Auth.logout();
    Arcade.close();
    $('app').classList.add('hidden');
    $('auth').classList.remove('hidden');
    $('form-login').reset();
    $('form-register').reset();
    say('msg-login', '');
  };

  $('search').oninput = function (e) { Arcade.setQuery(e.target.value); };

  $('stage-back').onclick = function () { Arcade.close(); };
  $('stage-restart').onclick = function () {
    var m = /^#play\/(.+)$/.exec(location.hash);
    if (m) Arcade.open(m[1]);
  };
  $('stage-full').onclick = function () {
    var el = $('stage');
    if (document.fullscreenElement) document.exitFullscreen();
    else if (el.requestFullscreen) el.requestFullscreen();
  };

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && !$('stage').classList.contains('hidden')) Arcade.close();
    if (e.key === '/' && $('stage').classList.contains('hidden') &&
        document.activeElement !== $('search') && !$('app').classList.contains('hidden')) {
      e.preventDefault(); $('search').focus();
    }
  });

  /* auto-resume an existing session */
  if (Auth.current()) enterApp();
})();
