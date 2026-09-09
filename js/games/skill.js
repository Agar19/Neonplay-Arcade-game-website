/* ============================================================
   SKILL — Type Racer, Reaction Test, Math Blitz
   ============================================================ */
(function () {
  'use strict';

  /* =========================================================
     TYPE RACER
     ========================================================= */
  var PASSAGES = [
    'The neon signs flickered above the empty arcade while the last machine hummed a tired electric tune into the night.',
    'A good keyboard feels like an extension of your hands, quiet enough to think over and fast enough to keep up with you.',
    'Every pixel on the screen is a small decision that somebody made, and together those decisions become something you can play.',
    'Practice is not about speed at first; it is about accuracy, rhythm, and letting your fingers learn the road before you floor it.',
    'Somewhere between the third cup of coffee and the last bug fix, the code finally started to make a strange kind of sense.',
    'The trick with falling blocks is not to plan the perfect move but to keep the board flat enough to survive the next surprise.',
    'Old cabinets glowed in the corner of the shop, each one promising a high score table that nobody had beaten in years.'
  ];

  Arcade.register({
    id: 'typerace', name: 'Type Racer', emoji: '⌨️', tag: 'Skill',
    colors: ['#00e5ff', '#39ff88'], unit: 'wpm',
    desc: 'Race a ghost typist. Live words-per-minute, accuracy, and per-key feedback.',
    help: 'Just start typing — the clock starts on your first keystroke · <kbd>Esc</kbd> exits',
    mount: function (root, api) {
      var text = PASSAGES[(Math.random() * PASSAGES.length) | 0];
      var typed = '', t0 = null, done = false, errors = 0, ghostWpm = 45;

      var wrap = api.h('<div style="width:min(880px,92vw);display:flex;flex-direction:column;gap:18px">' +
        '<div class="rel" style="display:block">' +
          '<div data-text style="background:var(--panel);border:1px solid var(--line);border-radius:14px;' +
            'padding:24px;font-size:22px;line-height:1.85;font-family:ui-monospace,Consolas,monospace;' +
            'letter-spacing:.4px;min-height:150px"></div>' +
        '</div>' +
        '<input data-in type="text" autocomplete="off" autocorrect="off" spellcheck="false" ' +
          'placeholder="click here and start typing…" ' +
          'style="width:100%;padding:16px;border-radius:12px;border:1px solid var(--line);' +
          'background:rgba(0,0,0,.35);color:var(--txt);font-size:18px;outline:none;' +
          'font-family:ui-monospace,Consolas,monospace">' +
        '<div style="display:flex;gap:12px;flex-wrap:wrap">' +
          '<div class="gpanel" style="flex:1"><h4>WPM</h4><div class="big" data-wpm>0</div></div>' +
          '<div class="gpanel" style="flex:1"><h4>Accuracy</h4><div class="big" data-acc>100%</div></div>' +
          '<div class="gpanel" style="flex:1"><h4>Time</h4><div class="big" data-time>0.0s</div></div>' +
          '<div class="gpanel" style="flex:1"><h4>Progress</h4><div class="big" data-prog>0%</div></div>' +
        '</div>' +
        '<div style="background:var(--panel);border:1px solid var(--line);border-radius:12px;padding:14px">' +
          '<div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">🏎️' +
            '<div style="flex:1;height:10px;background:rgba(255,255,255,.07);border-radius:6px;overflow:hidden">' +
            '<div data-you class="tr-bar" style="height:100%;width:0;background:linear-gradient(90deg,#00e5ff,#39ff88);box-shadow:0 0 14px rgba(0,229,255,.6)"></div></div>' +
            '<span style="font-size:11px;color:var(--dim);width:52px">YOU</span></div>' +
          '<div style="display:flex;align-items:center;gap:10px">👻' +
            '<div style="flex:1;height:10px;background:rgba(255,255,255,.07);border-radius:6px;overflow:hidden">' +
            '<div data-ghost class="tr-bar" style="height:100%;width:0;background:linear-gradient(90deg,#8b5cff,#ff2fb9)"></div></div>' +
            '<span style="font-size:11px;color:var(--dim);width:52px">' + ghostWpm + ' WPM</span></div>' +
        '</div></div>');
      root.appendChild(wrap);

      var textEl = wrap.querySelector('[data-text]'), input = wrap.querySelector('[data-in]');

      function paint() {
        var html = '';
        for (var i = 0; i < text.length; i++) {
          var ch = text[i] === ' ' ? '&nbsp;' : text[i].replace('<', '&lt;');
          if (i < typed.length) {
            html += '<span class="' + (typed[i] === text[i] ? 'tr-ok' : 'tr-bad') + '">' + ch + '</span>';
          } else if (i === typed.length) {
            html += '<span class="tr-caret">' + ch + '</span>';
          } else html += '<span class="tr-todo">' + ch + '</span>';
        }
        textEl.innerHTML = html;

        var elapsed = t0 ? (Date.now() - t0) / 1000 : 0;
        var correct = 0;
        for (var j = 0; j < typed.length; j++) if (typed[j] === text[j]) correct++;
        var wpm = elapsed > 0 ? Math.round((correct / 5) / (elapsed / 60)) : 0;
        var acc = typed.length ? Math.round(correct / typed.length * 100) : 100;
        wrap.querySelector('[data-wpm]').textContent = wpm;
        wrap.querySelector('[data-acc]').textContent = acc + '%';
        wrap.querySelector('[data-time]').textContent = elapsed.toFixed(1) + 's';
        wrap.querySelector('[data-prog]').textContent = Math.round(typed.length / text.length * 100) + '%';
        wrap.querySelector('[data-you]').style.width = (typed.length / text.length * 100) + '%';
        var ghostChars = elapsed * (ghostWpm * 5 / 60);
        wrap.querySelector('[data-ghost]').style.width = Math.min(100, ghostChars / text.length * 100) + '%';
        return { wpm: wpm, acc: acc, elapsed: elapsed, ghostChars: ghostChars };
      }

      input.addEventListener('input', function () {
        if (done) { input.value = typed; return; }
        if (!t0) t0 = Date.now();
        var v = input.value;
        if (v.length > typed.length) {
          var i = v.length - 1;
          if (v[i] !== text[i]) { errors++; api.beep(200, .04, 'square', .03); }
        }
        if (v.length > text.length) v = v.slice(0, text.length);
        typed = v;
        input.value = v;
        var s = paint();
        if (typed.length === text.length) {
          done = true;
          var perfect = typed === text;
          api.score(s.wpm);
          api.beep(880, .18);
          var ov = api.h('<div class="gover"><div><h3>' + s.wpm + ' WPM</h3><p>' + s.acc + '% accurate · ' +
            s.elapsed.toFixed(1) + 's · ' + (s.ghostChars >= text.length ? 'the ghost beat you' : 'you beat the ghost 🏆') +
            (perfect ? ' · flawless' : '') + '</p><button class="btn btn-primary">New passage</button></div></div>');
          ov.querySelector('button').onclick = api.restart;
          wrap.querySelector('.rel').appendChild(ov);
        }
      });
      api.on(input, 'keydown', function (e) { if (e.key === 'Tab') e.preventDefault(); });
      api.loop(function () { if (t0 && !done) paint(); });
      paint();
      setTimeout(function () { input.focus(); }, 60);
    }
  });

  /* =========================================================
     REACTION TEST
     ========================================================= */
  Arcade.register({
    id: 'reaction', name: 'Reaction Test', emoji: '⚡', tag: 'Skill',
    colors: ['#ffd93d', '#ff4d6d'], unit: 'ms', higher: false,
    desc: 'Five rounds of pure reflex. Click the instant the panel turns green.',
    help: 'Wait for green, then click as fast as you can · clicking early resets the round',
    mount: function (root, api) {
      var state = 'idle', times = [], round = 0, startAt = 0, timer = null;
      var wrap = api.h('<div style="display:flex;flex-direction:column;align-items:center;gap:18px">' +
        '<div data-pad class="rx-pad" style="width:min(620px,88vw);height:330px;border-radius:22px;display:grid;place-items:center;' +
        'cursor:pointer;user-select:none;text-align:center;background:linear-gradient(160deg,#1f1f45,#141430);' +
        'border:1px solid var(--line);font-size:26px;font-weight:800">Click to start</div>' +
        '<div data-list style="display:flex;gap:10px;flex-wrap:wrap;justify-content:center"></div></div>');
      root.appendChild(wrap);
      var pad = wrap.querySelector('[data-pad]'), list = wrap.querySelector('[data-list]');

      var GRAD = {
        idle: 'linear-gradient(160deg,#1f1f45,#141430)',
        wait: 'linear-gradient(160deg,#ff6a80,#c31f3d)',
        go:   'linear-gradient(160deg,#6bffb0,#12c46a)',
        early:'linear-gradient(160deg,#ffc46b,#d97706)'
      };
      function set(kind, text) {
        pad.style.background = GRAD[kind] || kind;
        pad.textContent = text;
        pad.classList.toggle('rx-go', kind === 'go');
        pad.style.color = (kind === 'go' || kind === 'wait' || kind === 'early') ? '#0a0a1e' : '#e8e8ff';
      }
      function arm() {
        state = 'waiting';
        set('wait', 'Wait for green…');
        timer = api.timeout(function () {
          state = 'go'; startAt = performance.now();
          set('go', 'CLICK!');
        }, 900 + Math.random() * 2600);
      }
      function tally() {
        list.innerHTML = '';
        times.forEach(function (t, i) {
          list.appendChild(api.h('<span class="pill">#' + (i + 1) + ' · ' + t + ' ms</span>'));
        });
      }
      pad.onclick = function () {
        if (state === 'idle' || state === 'done') { times = []; round = 0; tally(); arm(); return; }
        if (state === 'waiting') {
          if (timer) timer();
          set('early', 'Too early! Click to retry.');
          state = 'idle';
          api.beep(160, .2, 'sawtooth');
          return;
        }
        if (state === 'go') {
          var ms = Math.round(performance.now() - startAt);
          times.push(ms); round++;
          api.beep(700, .07);
          tally();
          if (round >= 5) {
            state = 'done';
            var avg = Math.round(times.reduce(function (a, b) { return a + b; }, 0) / times.length);
            var best = Math.min.apply(null, times);
            api.score(avg);
            set('idle', 'Average ' + avg + ' ms · best ' + best + ' ms — click to go again');
          } else {
            set('idle', ms + ' ms — next round…');
            api.timeout(arm, 800);
          }
        }
      };
    }
  });

  /* =========================================================
     MATH BLITZ
     ========================================================= */
  Arcade.register({
    id: 'mathblitz', name: 'Math Blitz', emoji: '➗', tag: 'Skill',
    colors: ['#8b5cff', '#00e5ff'], unit: 'pts',
    desc: 'Sixty seconds of mental arithmetic that speeds up as you get it right.',
    help: 'Type the answer and press <kbd>Enter</kbd> · streaks are worth more',
    mount: function (root, api) {
      var score = 0, streak = 0, time = 60, level = 1, q = null, over = false, right = 0, wrong = 0;
      var wrap = api.h('<div style="display:flex;flex-direction:column;align-items:center;gap:18px">' +
        '<div class="rel" style="display:block"><div class="mb-card" data-card style="background:var(--panel);border:1px solid var(--line);' +
        'border-radius:18px;padding:34px 60px;text-align:center;min-width:min(560px,88vw)">' +
          '<div data-q style="font-size:52px;font-weight:800;letter-spacing:2px">3 + 4</div>' +
          '<input data-in inputmode="numeric" autocomplete="off" style="margin-top:20px;width:200px;text-align:center;' +
            'padding:14px;border-radius:12px;border:1px solid var(--line);background:rgba(0,0,0,.35);' +
            'color:var(--txt);font-size:26px;outline:none">' +
        '</div></div>' +
        '<div style="display:flex;gap:12px;flex-wrap:wrap;justify-content:center">' +
          '<div class="gpanel"><h4>Score</h4><div class="big" data-s>0</div></div>' +
          '<div class="gpanel"><h4>Time</h4><div class="big" data-t>60</div></div>' +
          '<div class="gpanel"><h4>Streak</h4><div class="big" data-k>0</div></div>' +
          '<div class="gpanel"><h4>Level</h4><div class="big" data-l>1</div></div>' +
        '</div>' +
        '<div style="width:min(560px,88vw);height:8px;background:rgba(255,255,255,.08);border-radius:4px;overflow:hidden">' +
          '<div data-bar style="height:100%;width:100%;transition:width .95s linear;' +
          'background:linear-gradient(90deg,#39ff88,#ffd93d,#ff4d6d)"></div></div>' +
        '</div>');
      root.appendChild(wrap);
      var input = wrap.querySelector('[data-in]');

      function ask() {
        var ops = level < 2 ? ['+', '-'] : level < 4 ? ['+', '-', '×'] : ['+', '-', '×', '÷'];
        var op = ops[(Math.random() * ops.length) | 0];
        var a, b;
        if (op === '+') { a = rnd(5 + level * 8); b = rnd(5 + level * 8); q = { t: a + ' + ' + b, v: a + b }; }
        else if (op === '-') { a = rnd(8 + level * 9); b = rnd(a); q = { t: a + ' − ' + b, v: a - b }; }
        else if (op === '×') { a = rnd(3 + level * 3); b = rnd(3 + level * 3); q = { t: a + ' × ' + b, v: a * b }; }
        else { b = rnd(2 + level * 2) + 1; var r = rnd(6 + level * 2); q = { t: (b * r) + ' ÷ ' + b, v: r }; }
        wrap.querySelector('[data-q]').textContent = q.t;
      }
      function rnd(n) { return 1 + ((Math.random() * n) | 0); }

      input.addEventListener('keydown', function (e) {
        if (e.key !== 'Enter' || over) return;
        var v = parseInt(input.value, 10);
        input.value = '';
        var card = wrap.querySelector('[data-card]');
        card.classList.remove('mb-ok', 'mb-no'); void card.offsetWidth;
        card.classList.add(v === q.v ? 'mb-ok' : 'mb-no');
        setTimeout(function () { card.classList.remove('mb-ok', 'mb-no'); }, 320);
        if (v === q.v) {
          streak++; right++;
          score += 10 + streak * 2 + level * 5;
          level = 1 + Math.floor(right / 6);
          api.beep(700 + streak * 30, .06);
        } else {
          streak = 0; wrong++;
          score = Math.max(0, score - 5);
          api.beep(180, .12, 'sawtooth');
        }
        ask(); paint();
      });
      function paint() {
        wrap.querySelector('[data-s]').textContent = score;
        wrap.querySelector('[data-t]').textContent = time;
        wrap.querySelector('[data-k]').textContent = streak;
        wrap.querySelector('[data-l]').textContent = level;
        wrap.querySelector('[data-bar]').style.width = (time / 60 * 100) + '%';
      }
      api.interval(function () {
        if (over) return;
        time--; paint();
        if (time <= 0) {
          over = true;
          api.score(score);
          var ov = api.h('<div class="gover"><div><h3>TIME</h3><p>' + score + ' pts · ' + right +
            ' correct, ' + wrong + ' missed</p><button class="btn btn-primary">Play again</button></div></div>');
          ov.querySelector('button').onclick = api.restart;
          wrap.querySelector('.rel').appendChild(ov);
        }
      }, 1000);
      ask(); paint();
      setTimeout(function () { input.focus(); }, 60);
    }
  });
})();
