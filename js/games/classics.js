/* ============================================================
   CLASSICS — Tetris, Snake, Breakout, Pong, 2048
   ============================================================ */
(function () {
  'use strict';

  /* =========================================================
     TETRIS — 7-bag randomiser, animated line clears, ghost piece
     ========================================================= */
  var TCOLS = 10, TROWS = 20, TCELL = 28;
  var SHAPES = {
    I: { c: '#00e5ff', m: [[0,0,0,0],[1,1,1,1],[0,0,0,0],[0,0,0,0]] },
    J: { c: '#4d7cff', m: [[1,0,0],[1,1,1],[0,0,0]] },
    L: { c: '#ff9f1c', m: [[0,0,1],[1,1,1],[0,0,0]] },
    O: { c: '#ffd93d', m: [[1,1],[1,1]] },
    S: { c: '#39ff88', m: [[0,1,1],[1,1,0],[0,0,0]] },
    T: { c: '#c77dff', m: [[0,1,0],[1,1,1],[0,0,0]] },
    Z: { c: '#ff4d6d', m: [[1,1,0],[0,1,1],[0,0,0]] }
  };
  var KEYS = Object.keys(SHAPES);

  Arcade.register({
    id: 'tetris', name: 'Tetris', emoji: '🧱', tag: 'Classics',
    colors: ['#00e5ff', '#8b5cff'], unit: 'pts',
    desc: 'Stack the falling blocks, clear the lines, chase the level curve.',
    help: '<kbd>←</kbd><kbd>→</kbd> move &nbsp;<kbd>↓</kbd> soft drop &nbsp;<kbd>↑</kbd>/<kbd>X</kbd> rotate &nbsp;<kbd>Space</kbd> hard drop &nbsp;<kbd>C</kbd> hold &nbsp;<kbd>P</kbd> pause',
    mount: function (root, api) {
      var W = TCOLS * TCELL, H = TROWS * TCELL;
      var wrap = api.h(
        '<div class="gwrap">' +
          '<div class="rel"><canvas width="' + W + '" height="' + H + '"></canvas></div>' +
          '<div class="gpanel">' +
            '<div><h4>Score</h4><div class="big" data-score>0</div></div>' +
            '<div><h4>Next</h4><canvas data-next width="150" height="230" style="background:transparent;border:0"></canvas></div>' +
            '<div class="row"><span>Level</span><b data-level>1</b></div>' +
            '<div class="row"><span>Lines</span><b data-lines>0</b></div>' +
            '<div class="row"><span>Hold</span><b data-hold>—</b></div>' +
            '<button class="btn btn-mini" data-pause>Pause</button>' +
          '</div>' +
        '</div>');
      root.appendChild(wrap);

      var cv = wrap.querySelector('canvas'), ctx = FX.dpr(cv);
      var nv = wrap.querySelector('[data-next]'), nctx = FX.dpr(nv);
      var elScore = wrap.querySelector('[data-score]'),
          elLevel = wrap.querySelector('[data-level]'),
          elLines = wrap.querySelector('[data-lines]'),
          elHold = wrap.querySelector('[data-hold]');

      var parts = FX.particles(), shake = FX.shake(), floats = FX.floaters();
      var grid, piece, queue, bag, score, lines, level, dropMs, acc, dead, paused,
          clearing = null, hold = null, canHold = true, time = 0, lockFlash = 0, scoreShown = 0;

      function refillBag() {
        bag = KEYS.slice();
        for (var i = bag.length - 1; i > 0; i--) {
          var j = (Math.random() * (i + 1)) | 0, t = bag[i]; bag[i] = bag[j]; bag[j] = t;
        }
      }
      function draw7() {
        if (!bag || !bag.length) refillBag();
        var k = bag.pop();
        return { k: k, m: SHAPES[k].m.map(function (r) { return r.slice(); }), c: SHAPES[k].c, x: 3, y: 0 };
      }
      function reset() {
        grid = [];
        for (var r = 0; r < TROWS; r++) grid.push(new Array(TCOLS).fill(null));
        score = 0; scoreShown = 0; lines = 0; level = 1; acc = 0; dead = false; paused = false;
        dropMs = 800; clearing = null; hold = null; canHold = true;
        bag = null; queue = [draw7(), draw7(), draw7()];
        parts.clear(); floats.clear();
        elHold.textContent = '—';
        newPiece();
      }
      function newPiece() {
        piece = queue.shift();
        queue.push(draw7());
        piece.x = ((TCOLS - piece.m[0].length) / 2) | 0;
        piece.y = 0;
        canHold = true;
        if (hits(piece.m, piece.x, piece.y)) { dead = true; gameOver(); }
      }
      function hits(m, px, py) {
        for (var r = 0; r < m.length; r++) for (var c = 0; c < m[r].length; c++) {
          if (!m[r][c]) continue;
          var x = px + c, y = py + r;
          if (x < 0 || x >= TCOLS || y >= TROWS) return true;
          if (y >= 0 && grid[y][x]) return true;
        }
        return false;
      }
      function rotate(m) {
        var n = m.length, out = [];
        for (var r = 0; r < n; r++) { out.push([]); for (var c = 0; c < n; c++) out[r].push(m[n - 1 - c][r]); }
        return out;
      }
      function tryRotate() {
        var m = rotate(piece.m), kicks = [0, -1, 1, -2, 2];
        for (var i = 0; i < kicks.length; i++) {
          if (!hits(m, piece.x + kicks[i], piece.y)) {
            piece.m = m; piece.x += kicks[i];
            api.beep(660, .05, 'square', .03);
            return;
          }
        }
      }
      function move(dx) { if (!hits(piece.m, piece.x + dx, piece.y)) { piece.x += dx; api.beep(320, .03, 'square', .02); } }
      function drop() {
        if (!hits(piece.m, piece.x, piece.y + 1)) { piece.y++; acc = 0; return true; }
        lock(); return false;
      }
      function hardDrop() {
        var n = 0;
        while (!hits(piece.m, piece.x, piece.y + 1)) { piece.y++; n++; }
        score += n * 2;
        shake.add(.18 + n * .012);
        lock();
      }
      function doHold() {
        if (!canHold || dead || clearing) return;
        var cur = piece.k;
        if (hold) {
          var swap = hold;
          hold = cur;
          piece = { k: swap, m: SHAPES[swap].m.map(function (r) { return r.slice(); }), c: SHAPES[swap].c,
                    x: ((TCOLS - SHAPES[swap].m[0].length) / 2) | 0, y: 0 };
        } else { hold = cur; newPiece(); }
        canHold = false;
        elHold.textContent = hold;
        api.beep(520, .06, 'sine', .04);
      }
      function lock() {
        for (var r = 0; r < piece.m.length; r++) for (var c = 0; c < piece.m[r].length; c++) {
          if (piece.m[r][c] && piece.y + r >= 0) grid[piece.y + r][piece.x + c] = piece.c;
        }
        lockFlash = 1;
        api.beep(180, .06, 'triangle', .04);
        var full = [];
        for (var y = 0; y < TROWS; y++) {
          if (grid[y].every(function (v) { return v; })) full.push(y);
        }
        if (full.length) {
          clearing = { rows: full, t: 0 };
          shake.add(.2 + full.length * .16);
          api.beep(full.length === 4 ? 880 : 520, .18, 'sawtooth', .05);
          full.forEach(function (y) {
            for (var c = 0; c < TCOLS; c++) {
              parts.burst(c * TCELL + TCELL / 2, y * TCELL + TCELL / 2, 4,
                { color: grid[y][c], speed: 190, life: .55, size: 4, square: true, gravity: 320 });
            }
          });
        } else newPiece();
      }
      function finishClear() {
        var n = clearing.rows.length;
        clearing.rows.sort(function (a, b) { return a - b; }).forEach(function (y, i) {
          grid.splice(y, 1);
          grid.unshift(new Array(TCOLS).fill(null));
        });
        var gained = [0, 100, 300, 500, 800][n] * level;
        score += gained;
        lines += n;
        level = 1 + Math.floor(lines / 10);
        dropMs = Math.max(80, 800 - (level - 1) * 68);
        floats.add(W / 2, clearing.rows[0] * TCELL + 20,
          (n === 4 ? 'TETRIS  +' : '+') + gained, n === 4 ? '#ff2fb9' : '#ffd93d', n === 4 ? 30 : 24);
        clearing = null;
        newPiece();
      }
      function gameOver() {
        api.score(score);
        shake.add(1);
        var ov = api.h('<div class="gover"><div><h3>GAME OVER</h3><p>Score ' + score + ' · Level ' + level +
          '</p><button class="btn btn-primary">Play again</button></div></div>');
        ov.querySelector('button').onclick = function () { ov.remove(); reset(); };
        wrap.querySelector('.rel').appendChild(ov);
      }

      function cell(g, x, y, color, alpha, size) {
        size = size || TCELL;
        g.globalAlpha = alpha === undefined ? 1 : alpha;
        FX.block(g, x + 1, y + 1, size - 2, size - 2, color, 5);
        g.globalAlpha = 1;
      }

      function paint(dt) {
        var w = W, h = H;
        ctx.save();
        FX.reset(ctx);
        ctx.save();
        shake.apply(ctx);

        FX.bg(ctx, w, h, '#0a0a1e', '#05050f');
        FX.grid(ctx, w, h, TCELL, .045);

        /* settled blocks */
        for (var r = 0; r < TROWS; r++) for (var c = 0; c < TCOLS; c++) {
          if (!grid[r][c]) continue;
          var flashing = clearing && clearing.rows.indexOf(r) >= 0;
          if (flashing) {
            var k = clearing.t / .3;
            ctx.globalAlpha = 1 - k;
            var pad = k * TCELL * .5;
            FX.glow(ctx, '#ffffff', 26, function () {
              FX.block(ctx, c * TCELL + 1 + pad / 2, r * TCELL + 1 + pad / 2,
                TCELL - 2 - pad, TCELL - 2 - pad, '#ffffff', 5);
            });
            ctx.globalAlpha = 1;
          } else cell(ctx, c * TCELL, r * TCELL, grid[r][c]);
        }

        /* active piece + ghost */
        if (piece && !dead && !clearing) {
          var gy = piece.y;
          while (!hits(piece.m, piece.x, gy + 1)) gy++;
          var falling = !hits(piece.m, piece.x, piece.y + 1);
          var frac = falling && !paused ? FX.clamp(acc / dropMs, 0, 1) * .9 : 0;

          for (var a = 0; a < piece.m.length; a++) for (var b = 0; b < piece.m[a].length; b++) {
            if (!piece.m[a][b]) continue;
            var px = (piece.x + b) * TCELL;
            /* ghost */
            ctx.globalAlpha = .13 + Math.sin(time * 3) * .04;
            FX.rr(ctx, px + 2, (gy + a) * TCELL + 2, TCELL - 4, TCELL - 4, 5);
            ctx.fillStyle = piece.c; ctx.fill();
            ctx.strokeStyle = FX.rgba(piece.c, .55); ctx.lineWidth = 1.5; ctx.stroke();
            ctx.globalAlpha = 1;
            /* piece with sub-cell smoothing */
            if (piece.y + a >= 0) {
              FX.glow(ctx, piece.c, 12, function () {
                cell(ctx, px, (piece.y + a + frac) * TCELL, piece.c);
              });
            }
          }
        }

        parts.update(dt); parts.draw(ctx);
        floats.update(dt); floats.draw(ctx);

        if (lockFlash > 0) {
          ctx.fillStyle = 'rgba(255,255,255,' + (lockFlash * .06).toFixed(3) + ')';
          ctx.fillRect(0, 0, w, h);
        }

        /* frame */
        ctx.strokeStyle = 'rgba(255,255,255,.1)';
        ctx.lineWidth = 2;
        ctx.strokeRect(1, 1, w - 2, h - 2);
        FX.vignette(ctx, w, h, .45);

        if (paused) {
          ctx.fillStyle = 'rgba(5,5,15,.75)'; ctx.fillRect(0, 0, w, h);
          FX.text(ctx, 'PAUSED', w / 2, h / 2, { size: 34, glow: '#00e5ff', color: '#e8e8ff' });
          FX.text(ctx, 'press P to resume', w / 2, h / 2 + 28, { size: 13, color: '#9a9ac4', weight: 500 });
        }
        ctx.restore();
        ctx.restore();

        /* next queue */
        nctx.save(); FX.reset(nctx);
        nctx.clearRect(0, 0, nv.__w || 150, nv.__h || 230);
        queue.forEach(function (q, qi) {
          var s = qi === 0 ? 22 : 16;
          var w2 = q.m[0].length * s, h2 = q.m.length * s;
          var oy = qi === 0 ? 8 : 78 + (qi - 1) * 62;
          nctx.globalAlpha = qi === 0 ? 1 : .55;
          for (var r2 = 0; r2 < q.m.length; r2++) for (var c2 = 0; c2 < q.m[r2].length; c2++) {
            if (!q.m[r2][c2]) continue;
            FX.block(nctx, (150 - w2) / 2 + c2 * s, oy + r2 * s, s - 2, s - 2, q.c, 3);
          }
          nctx.globalAlpha = 1;
        });
        nctx.restore();

        scoreShown = Math.round(FX.approach(scoreShown, score, 9, dt));
        if (Math.abs(scoreShown - score) < 2) scoreShown = score;
        elScore.textContent = scoreShown;
        elLevel.textContent = level; elLines.textContent = lines;
      }

      api.on(window, 'keydown', function (e) {
        if (dead) return;
        var k = e.key;
        if (['ArrowLeft','ArrowRight','ArrowDown','ArrowUp',' '].indexOf(k) >= 0) e.preventDefault();
        if (k === 'p' || k === 'P') { paused = !paused; return; }
        if (paused || clearing) return;
        if (k === 'ArrowLeft') move(-1);
        else if (k === 'ArrowRight') move(1);
        else if (k === 'ArrowDown') { if (drop()) score += 1; }
        else if (k === 'ArrowUp' || k === 'x' || k === 'X') tryRotate();
        else if (k === 'c' || k === 'C') doHold();
        else if (k === ' ') hardDrop();
      });
      wrap.querySelector('[data-pause]').onclick = function () {
        paused = !paused; this.textContent = paused ? 'Resume' : 'Pause';
      };

      reset();
      api.loop(function (dt) {
        time += dt;
        shake.update(dt);
        lockFlash = Math.max(0, lockFlash - dt * 5);
        if (!dead && !paused) {
          if (clearing) {
            clearing.t += dt;
            if (clearing.t >= .3) finishClear();
          } else {
            acc += dt * 1000;
            if (acc >= dropMs) { acc = 0; drop(); }
          }
        }
        paint(dt);
      });
    }
  });

  /* =========================================================
     SNAKE — interpolated movement, glow body, particle food
     ========================================================= */
  Arcade.register({
    id: 'snake', name: 'Neon Snake', emoji: '🐍', tag: 'Classics',
    colors: ['#39ff88', '#00e5ff'], unit: 'pts',
    desc: 'Eat, grow, and try not to eat yourself. Speeds up as you feast.',
    help: '<kbd>Arrows</kbd> or <kbd>WASD</kbd> to steer · walls are deadly',
    mount: function (root, api) {
      var N = 22, C = 22, W = N * C;
      var wrap = api.h('<div class="gwrap"><div class="rel"><canvas width="' + W + '" height="' + W + '"></canvas></div>' +
        '<div class="gpanel"><div><h4>Score</h4><div class="big" data-score>0</div></div>' +
        '<div class="row"><span>Length</span><b data-len>3</b></div>' +
        '<div class="row"><span>Speed</span><b data-spd>1.0x</b></div></div></div>');
      root.appendChild(wrap);
      var cv = wrap.querySelector('canvas'), ctx = FX.dpr(cv);
      var parts = FX.particles(), shake = FX.shake(), floats = FX.floaters();
      var s, prev, dir, pending, food, score, step, acc, dead, t = 0;

      function reset() {
        s = [{ x: 8, y: 11 }, { x: 7, y: 11 }, { x: 6, y: 11 }];
        prev = s.map(function (p) { return { x: p.x, y: p.y }; });
        dir = { x: 1, y: 0 }; pending = null; score = 0; step = .13; acc = 0; dead = false;
        parts.clear(); floats.clear();
        placeFood();
      }
      function placeFood() {
        do { food = { x: (Math.random() * N) | 0, y: (Math.random() * N) | 0, t: 0 }; }
        while (s.some(function (p) { return p.x === food.x && p.y === food.y; }));
      }
      function tick() {
        if (pending) { dir = pending; pending = null; }
        prev = s.map(function (p) { return { x: p.x, y: p.y }; });
        var head = { x: s[0].x + dir.x, y: s[0].y + dir.y };
        if (head.x < 0 || head.y < 0 || head.x >= N || head.y >= N ||
            s.some(function (p) { return p.x === head.x && p.y === head.y; })) {
          dead = true;
          shake.add(1);
          parts.burst(s[0].x * C + C / 2, s[0].y * C + C / 2, 34,
            { colors: ['#39ff88', '#00e5ff', '#ffffff'], speed: 260, life: .8, size: 4 });
          api.score(score);
          api.beep(120, .3, 'sawtooth', .05);
          var ov = api.h('<div class="gover"><div><h3>SPLAT</h3><p>Score ' + score + ' · Length ' + s.length +
            '</p><button class="btn btn-primary">Again</button></div></div>');
          ov.querySelector('button').onclick = function () { ov.remove(); reset(); };
          wrap.querySelector('.rel').appendChild(ov);
          return;
        }
        s.unshift(head);
        if (head.x === food.x && head.y === food.y) {
          score += 10;
          parts.burst(food.x * C + C / 2, food.y * C + C / 2, 22,
            { colors: ['#ff2fb9', '#ffd93d', '#ffffff'], speed: 210, life: .6, size: 3.5 });
          floats.add(food.x * C + C / 2, food.y * C, '+10', '#ffd93d', 18);
          placeFood();
          step = Math.max(.055, step * .97);
          shake.add(.12);
          api.beep(760, .06, 'square', .04);
        } else { s.pop(); prev.pop(); }
      }
      function paint(dt) {
        var k = dead ? 1 : FX.clamp(acc / step, 0, 1);
        ctx.save(); FX.reset(ctx); ctx.save(); shake.apply(ctx);

        FX.bg(ctx, W, W, '#0a1020', '#05050f');
        FX.grid(ctx, W, W, C, .05);

        /* food */
        food.t += dt;
        var pulse = 1 + Math.sin(food.t * 6) * .12;
        var fx = food.x * C + C / 2, fy = food.y * C + C / 2;
        FX.glow(ctx, '#ff2fb9', 22, function () {
          ctx.fillStyle = '#ff2fb9';
          ctx.beginPath(); ctx.arc(fx, fy, (C / 2 - 4) * pulse, 0, 6.283); ctx.fill();
        });
        ctx.fillStyle = 'rgba(255,255,255,.7)';
        ctx.beginPath(); ctx.arc(fx - 3, fy - 3, 2.4, 0, 6.283); ctx.fill();

        /* body: interpolate every segment toward its previous cell */
        ctx.save();
        ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        var pts = s.map(function (seg, i) {
          var p = prev[Math.min(i, prev.length - 1)] || seg;
          return { x: FX.lerp(p.x, seg.x, k) * C + C / 2, y: FX.lerp(p.y, seg.y, k) * C + C / 2 };
        });
        for (var pass = 0; pass < 2; pass++) {
          ctx.strokeStyle = pass === 0 ? 'rgba(57,255,136,.20)' : '#39ff88';
          ctx.lineWidth = pass === 0 ? C - 1 : C - 7;
          ctx.shadowColor = '#39ff88'; ctx.shadowBlur = pass === 0 ? 26 : 0;
          ctx.beginPath();
          pts.forEach(function (p, i) { i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y); });
          if (pts.length === 1) { ctx.lineTo(pts[0].x + .1, pts[0].y); }
          ctx.stroke();
        }
        ctx.restore();

        /* head */
        var hd = pts[0];
        ctx.fillStyle = '#eafff5';
        FX.rr(ctx, hd.x - C / 2 + 3, hd.y - C / 2 + 3, C - 6, C - 6, 7); ctx.fill();
        ctx.fillStyle = '#0a1a12';
        var ex = dir.x * 4, ey = dir.y * 4;
        ctx.beginPath(); ctx.arc(hd.x + ex - dir.y * 4, hd.y + ey + dir.x * 4, 2, 0, 6.283); ctx.fill();
        ctx.beginPath(); ctx.arc(hd.x + ex + dir.y * 4, hd.y + ey - dir.x * 4, 2, 0, 6.283); ctx.fill();

        parts.update(dt); parts.draw(ctx);
        floats.update(dt); floats.draw(ctx);
        FX.vignette(ctx, W, W, .5);
        ctx.restore(); ctx.restore();

        wrap.querySelector('[data-score]').textContent = score;
        wrap.querySelector('[data-len]').textContent = s.length;
        wrap.querySelector('[data-spd]').textContent = (.13 / step).toFixed(1) + 'x';
      }
      var MAP = { ArrowUp: [0,-1], ArrowDown: [0,1], ArrowLeft: [-1,0], ArrowRight: [1,0],
                  w: [0,-1], s: [0,1], a: [-1,0], d: [1,0] };
      api.on(window, 'keydown', function (e) {
        var m = MAP[e.key] || MAP[(e.key || '').toLowerCase()];
        if (!m) return;
        e.preventDefault();
        var base = pending || dir;
        if (m[0] === -base.x && m[1] === -base.y) return;
        pending = { x: m[0], y: m[1] };
      });
      reset();
      api.loop(function (dt) {
        t += dt; shake.update(dt);
        if (!dead) {
          acc += dt;
          if (acc >= step) { acc -= step; tick(); }
        }
        paint(dt);
      });
    }
  });

  /* =========================================================
     BREAKOUT — trails, shatter particles, glow bricks
     ========================================================= */
  Arcade.register({
    id: 'breakout', name: 'Brick Breaker', emoji: '🧱', tag: 'Classics',
    colors: ['#ffd93d', '#ff2fb9'], unit: 'pts',
    desc: 'Bounce, smash, repeat. Angle the paddle to steer the ball.',
    help: '<kbd>←</kbd><kbd>→</kbd> or move the mouse · <kbd>Space</kbd> launches the ball',
    mount: function (root, api) {
      var W = 520, H = 560;
      var wrap = api.h('<div class="gwrap"><div class="rel"><canvas width="' + W + '" height="' + H + '"></canvas></div>' +
        '<div class="gpanel"><div><h4>Score</h4><div class="big" data-score>0</div></div>' +
        '<div class="row"><span>Lives</span><b data-lives>3</b></div>' +
        '<div class="row"><span>Level</span><b data-level>1</b></div>' +
        '<div class="row"><span>Bricks</span><b data-bricks>0</b></div></div></div>');
      root.appendChild(wrap);
      var cv = wrap.querySelector('canvas'), ctx = FX.dpr(cv);
      var COLS = 9, ROWS = 6, BW = W / COLS, BH = 24;
      var parts = FX.particles(), shake = FX.shake(), floats = FX.floaters(), trail = FX.trail(18);
      var bricks, paddle, ball, score, lives, level, stuck, keys = {}, t = 0, flash = 0;

      function build() {
        bricks = [];
        for (var r = 0; r < ROWS; r++) for (var c = 0; c < COLS; c++) {
          bricks.push({ x: c * BW, y: 76 + r * BH, hp: r < 2 ? 2 : 1,
                        col: 'hsl(' + (188 + r * 26) + ',95%,' + (64 - r * 2) + '%)', hit: 0 });
        }
      }
      function reset(full) {
        if (full) { score = 0; lives = 3; level = 1; }
        paddle = { x: W / 2 - 50, tx: W / 2 - 50, w: 100, h: 12, y: H - 34 };
        ball = { x: W / 2, y: paddle.y - 10, vx: 0, vy: 0, r: 7 };
        stuck = true; trail.clear(); parts.clear();
        build();
      }
      function launch() {
        if (!stuck) return;
        stuck = false;
        var sp = 310 + level * 22;
        ball.vx = (Math.random() > .5 ? 1 : -1) * sp * .55;
        ball.vy = -sp;
        api.beep(520, .07);
      }
      function lose() {
        lives--; shake.add(.9);
        parts.burst(ball.x, H - 10, 26, { colors: ['#ff4d6d', '#ffffff'], speed: 240, life: .7, angle: -1.57, spread: 2.6 });
        if (lives <= 0) {
          api.score(score);
          var ov = api.h('<div class="gover"><div><h3>GAME OVER</h3><p>Score ' + score +
            '</p><button class="btn btn-primary">Retry</button></div></div>');
          ov.querySelector('button').onclick = function () { ov.remove(); reset(true); };
          wrap.querySelector('.rel').appendChild(ov);
        } else { stuck = true; ball.x = paddle.x + paddle.w / 2; ball.y = paddle.y - 10; trail.clear(); }
      }
      api.on(window, 'keydown', function (e) {
        keys[e.key] = true;
        if (e.key === ' ') { e.preventDefault(); launch(); }
        if (e.key.indexOf('Arrow') === 0) e.preventDefault();
      });
      api.on(window, 'keyup', function (e) { keys[e.key] = false; });
      api.on(cv, 'mousemove', function (e) {
        var r = cv.getBoundingClientRect();
        paddle.tx = (e.clientX - r.left) * (W / r.width) - paddle.w / 2;
      });
      api.on(cv, 'mousedown', launch);

      reset(true);
      api.loop(function (dt) {
        t += dt; shake.update(dt);
        flash = Math.max(0, flash - dt * 4);

        if (keys.ArrowLeft) paddle.tx -= 540 * dt;
        if (keys.ArrowRight) paddle.tx += 540 * dt;
        paddle.tx = FX.clamp(paddle.tx, 0, W - paddle.w);
        paddle.x = FX.approach(paddle.x, paddle.tx, 22, dt);   /* smoothed follow */

        if (stuck) { ball.x = paddle.x + paddle.w / 2; ball.y = paddle.y - 10; }
        else {
          /* sub-stepping keeps fast balls from tunnelling and looks smoother */
          var steps = 3;
          for (var st = 0; st < steps; st++) {
            var sdt = dt / steps;
            ball.x += ball.vx * sdt; ball.y += ball.vy * sdt;
            if (ball.x < ball.r) { ball.x = ball.r; ball.vx *= -1; api.beep(300, .03); }
            if (ball.x > W - ball.r) { ball.x = W - ball.r; ball.vx *= -1; api.beep(300, .03); }
            if (ball.y < ball.r) { ball.y = ball.r; ball.vy *= -1; api.beep(300, .03); }
            if (ball.y > H + 20) { lose(); break; }

            if (ball.y + ball.r > paddle.y && ball.y - ball.r < paddle.y + paddle.h &&
                ball.x > paddle.x && ball.x < paddle.x + paddle.w && ball.vy > 0) {
              var hit = (ball.x - (paddle.x + paddle.w / 2)) / (paddle.w / 2);
              var sp = Math.min(720, Math.hypot(ball.vx, ball.vy) * 1.02);
              var ang = hit * 1.05 - Math.PI / 2;
              ball.vx = Math.cos(ang) * sp; ball.vy = Math.sin(ang) * sp;
              ball.y = paddle.y - ball.r - 1;
              parts.burst(ball.x, paddle.y, 10, { color: '#00e5ff', speed: 150, life: .35, angle: -1.57, spread: 2 });
              api.beep(440, .05);
            }
            for (var i = 0; i < bricks.length; i++) {
              var b = bricks[i];
              if (ball.x > b.x && ball.x < b.x + BW && ball.y > b.y && ball.y < b.y + BH) {
                b.hp--; b.hit = 1; ball.vy *= -1; score += 25; shake.add(.09);
                api.beep(700 + b.hp * 140, .05);
                parts.burst(ball.x, ball.y, b.hp <= 0 ? 16 : 6,
                  { color: b.col, speed: 200, life: .5, size: 3.6, square: true, gravity: 260 });
                if (b.hp <= 0) { floats.add(b.x + BW / 2, b.y, '+25', b.col, 16); bricks.splice(i, 1); }
                break;
              }
            }
          }
          if (!bricks.length) {
            level++; score += 250; build(); stuck = true; flash = 1;
            trail.clear();
            api.toast('Level ' + level + '!');
          }
        }
        if (!stuck) trail.push(ball.x, ball.y);

        /* ---- render ---- */
        ctx.save(); FX.reset(ctx); ctx.save(); shake.apply(ctx);
        FX.bg(ctx, W, H, '#12082b', '#05050f');
        FX.grid(ctx, W, H, 40, .035, 0, t * 12);

        bricks.forEach(function (b) {
          b.hit = Math.max(0, b.hit - dt * 5);
          ctx.globalAlpha = b.hp > 1 ? 1 : .78;
          FX.glow(ctx, b.col, b.hit * 22, function () {
            FX.block(ctx, b.x + 2, b.y + 2, BW - 4, BH - 4, b.hit > 0 ? '#ffffff' : b.col, 5);
          });
          ctx.globalAlpha = 1;
        });

        trail.draw(ctx, '#ffd93d', 13);

        FX.glow(ctx, '#00e5ff', 18, function () {
          var g = ctx.createLinearGradient(paddle.x, 0, paddle.x + paddle.w, 0);
          g.addColorStop(0, '#00e5ff'); g.addColorStop(.5, '#e8e8ff'); g.addColorStop(1, '#8b5cff');
          ctx.fillStyle = g;
          FX.rr(ctx, paddle.x, paddle.y, paddle.w, paddle.h, 6); ctx.fill();
        });

        FX.glow(ctx, '#ffd93d', 20, function () {
          ctx.fillStyle = '#fff6c9';
          ctx.beginPath(); ctx.arc(ball.x, ball.y, ball.r, 0, 6.283); ctx.fill();
        });

        parts.update(dt); parts.draw(ctx);
        floats.update(dt); floats.draw(ctx);

        if (stuck) {
          FX.text(ctx, 'SPACE or click to launch', W / 2, H / 2 + 60,
            { size: 15, color: '#9a9ac4', weight: 600, alpha: .6 + Math.sin(t * 4) * .35 });
        }
        if (flash > 0) { ctx.fillStyle = 'rgba(255,255,255,' + flash * .25 + ')'; ctx.fillRect(0, 0, W, H); }
        FX.vignette(ctx, W, H, .5);
        ctx.restore(); ctx.restore();

        wrap.querySelector('[data-score]').textContent = score;
        wrap.querySelector('[data-lives]').textContent = '♥'.repeat(Math.max(0, lives)) || '—';
        wrap.querySelector('[data-level]').textContent = level;
        wrap.querySelector('[data-bricks]').textContent = bricks.length;
      });
    }
  });

  /* =========================================================
     PONG — glow paddles, ball trail, impact particles
     ========================================================= */
  Arcade.register({
    id: 'pong', name: 'Pong vs CPU', emoji: '🏓', tag: 'Classics',
    colors: ['#00e5ff', '#39ff88'], unit: 'rallies',
    desc: 'The original. First to 7 wins — the CPU gets meaner each point.',
    help: '<kbd>↑</kbd><kbd>↓</kbd> or move the mouse',
    mount: function (root, api) {
      var W = 680, H = 420, PH = 76;
      var wrap = api.h('<div class="gwrap"><div class="rel"><canvas width="' + W + '" height="' + H + '"></canvas></div>' +
        '<div class="gpanel"><div><h4>Score</h4><div class="big"><span data-you>0</span> : <span data-cpu>0</span></div></div>' +
        '<div class="row"><span>Rally</span><b data-rally>0</b></div>' +
        '<div class="row"><span>Best rally</span><b data-brally>0</b></div>' +
        '<div class="row"><span>Ball speed</span><b data-spd>0</b></div></div></div>');
      root.appendChild(wrap);
      var cv = wrap.querySelector('canvas'), ctx = FX.dpr(cv);
      var parts = FX.particles(), shake = FX.shake(), trail = FX.trail(22);
      var you, youT, cpu, ball, sy, sc, rally, best, keys = {}, over, t = 0, flash = 0;

      function serve(dir) {
        ball = { x: W / 2, y: H / 2, vx: dir * 320, vy: (Math.random() * 2 - 1) * 180, r: 8 };
        rally = 0; trail.clear();
      }
      function reset() {
        you = youT = H / 2 - PH / 2; cpu = you; sy = 0; sc = 0; best = 0; over = false;
        parts.clear(); serve(Math.random() > .5 ? 1 : -1);
      }
      function finish(win) {
        over = true; api.score(best);
        var ov = api.h('<div class="gover"><div><h3>' + (win ? 'YOU WIN' : 'CPU WINS') + '</h3><p>' + sy + ' : ' + sc +
          ' · best rally ' + best + '</p><button class="btn btn-primary">Rematch</button></div></div>');
        ov.querySelector('button').onclick = function () { ov.remove(); reset(); };
        wrap.querySelector('.rel').appendChild(ov);
      }
      api.on(window, 'keydown', function (e) { keys[e.key] = true; if (e.key.indexOf('Arrow') === 0) e.preventDefault(); });
      api.on(window, 'keyup', function (e) { keys[e.key] = false; });
      api.on(cv, 'mousemove', function (e) {
        var r = cv.getBoundingClientRect();
        youT = (e.clientY - r.top) * (H / r.height) - PH / 2;
      });
      reset();
      api.loop(function (dt) {
        t += dt; shake.update(dt);
        flash = Math.max(0, flash - dt * 3);
        if (!over) {
          if (keys.ArrowUp) youT -= 520 * dt;
          if (keys.ArrowDown) youT += 520 * dt;
          youT = FX.clamp(youT, 0, H - PH);
          you = FX.approach(you, youT, 24, dt);

          var target = ball.y - PH / 2 + Math.sin(t * 2.4) * 26;
          var speed = 215 + sc * 26 + sy * 20;
          if (cpu < target - 5) cpu = Math.min(target, cpu + speed * dt);
          else if (cpu > target + 5) cpu = Math.max(target, cpu - speed * dt);
          cpu = FX.clamp(cpu, 0, H - PH);

          var steps = 3;
          for (var i = 0; i < steps; i++) {
            var sdt = dt / steps;
            ball.x += ball.vx * sdt; ball.y += ball.vy * sdt;
            if (ball.y < ball.r || ball.y > H - ball.r) {
              ball.vy *= -1; ball.y = FX.clamp(ball.y, ball.r, H - ball.r);
              parts.burst(ball.x, ball.y, 6, { color: '#8b5cff', speed: 120, life: .3 });
              api.beep(260, .03);
            }
            if (ball.x - ball.r < 26 && ball.y > you && ball.y < you + PH && ball.vx < 0) {
              ball.vx = Math.abs(ball.vx) * 1.06;
              ball.vy += ((ball.y - (you + PH / 2)) / (PH / 2)) * 190;
              rally++; best = Math.max(best, rally); shake.add(.14);
              parts.burst(30, ball.y, 14, { color: '#00e5ff', speed: 200, life: .4, angle: 0, spread: 1.8 });
              api.beep(520, .05);
            }
            if (ball.x + ball.r > W - 26 && ball.y > cpu && ball.y < cpu + PH && ball.vx > 0) {
              ball.vx = -Math.abs(ball.vx) * 1.06;
              ball.vy += ((ball.y - (cpu + PH / 2)) / (PH / 2)) * 190;
              rally++; best = Math.max(best, rally); shake.add(.14);
              parts.burst(W - 30, ball.y, 14, { color: '#ff2fb9', speed: 200, life: .4, angle: 3.14, spread: 1.8 });
              api.beep(380, .05);
            }
            if (ball.x < -20) { sc++; flash = 1; shake.add(.7); api.beep(150, .2, 'sawtooth'); if (sc >= 7) { finish(false); break; } serve(1); }
            if (ball.x > W + 20) { sy++; flash = 1; shake.add(.7); api.beep(880, .15); if (sy >= 7) { finish(true); break; } serve(-1); }
          }
          trail.push(ball.x, ball.y);
        }

        ctx.save(); FX.reset(ctx); ctx.save(); shake.apply(ctx);
        FX.bg(ctx, W, H, '#0b1030', '#05050f');
        FX.grid(ctx, W, H, 34, .04);

        ctx.save();
        ctx.strokeStyle = 'rgba(150,180,255,.18)'; ctx.setLineDash([10, 16]); ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(W / 2, 0); ctx.lineTo(W / 2, H); ctx.stroke();
        ctx.restore();

        FX.text(ctx, sy, W / 2 - 60, 62, { size: 46, color: 'rgba(0,229,255,.35)' });
        FX.text(ctx, sc, W / 2 + 60, 62, { size: 46, color: 'rgba(255,47,185,.35)' });

        trail.draw(ctx, '#ffffff', 14);

        FX.glow(ctx, '#00e5ff', 22, function () {
          ctx.fillStyle = '#00e5ff'; FX.rr(ctx, 14, you, 12, PH, 6); ctx.fill();
        });
        FX.glow(ctx, '#ff2fb9', 22, function () {
          ctx.fillStyle = '#ff2fb9'; FX.rr(ctx, W - 26, cpu, 12, PH, 6); ctx.fill();
        });
        FX.glow(ctx, '#ffffff', 20, function () {
          ctx.fillStyle = '#ffffff';
          ctx.beginPath(); ctx.arc(ball.x, ball.y, ball.r, 0, 6.283); ctx.fill();
        });

        parts.update(dt); parts.draw(ctx);
        if (flash > 0) { ctx.fillStyle = 'rgba(255,255,255,' + flash * .18 + ')'; ctx.fillRect(0, 0, W, H); }
        FX.vignette(ctx, W, H, .55);
        ctx.restore(); ctx.restore();

        wrap.querySelector('[data-you]').textContent = sy;
        wrap.querySelector('[data-cpu]').textContent = sc;
        wrap.querySelector('[data-rally]').textContent = rally;
        wrap.querySelector('[data-brally]').textContent = best;
        wrap.querySelector('[data-spd]').textContent = Math.round(Math.hypot(ball.vx, ball.vy));
      });
    }
  });

  /* =========================================================
     2048 — transform-animated tiles (slide + merge + spawn)
     ========================================================= */
  Arcade.register({
    id: 'g2048', name: '2048', emoji: '🔢', tag: 'Classics',
    colors: ['#ff9f1c', '#ffd93d'], unit: 'pts',
    desc: 'Slide the tiles, merge the twins, hunt the 2048 tile.',
    help: '<kbd>Arrows</kbd> or <kbd>WASD</kbd> to slide · swipe on touch',
    mount: function (root, api) {
      var CELL = 88, GAP = 10, PAD = 10, SIZE = 4;
      var BOARD = SIZE * CELL + (SIZE + 1) * GAP;
      var COLORS = { 2:'#2a2a52',4:'#35356b',8:'#8b5cff',16:'#a855f7',32:'#ff2fb9',64:'#ff4d6d',
                     128:'#ff9f1c',256:'#ffd93d',512:'#39ff88',1024:'#00e5ff',2048:'#ffffff',4096:'#ffffff' };

      var wrap = api.h('<div class="gwrap"><div class="rel">' +
        '<div class="t2048-wrap" data-board style="width:' + BOARD + 'px;height:' + BOARD + 'px"></div></div>' +
        '<div class="gpanel"><div><h4>Score</h4><div class="big" data-score>0</div></div>' +
        '<div class="row"><span>Best tile</span><b data-bt>0</b></div>' +
        '<div class="row"><span>Moves</span><b data-mv>0</b></div>' +
        '<button class="btn btn-mini" data-new>New game</button></div></div>');
      root.appendChild(wrap);
      var board = wrap.querySelector('[data-board]');

      var grid, tiles, score, moves, won, nextId, busy;

      for (var r = 0; r < SIZE; r++) for (var c = 0; c < SIZE; c++) {
        var bg = document.createElement('div');
        bg.className = 't2048-cell';
        bg.style.cssText = 'width:' + CELL + 'px;height:' + CELL + 'px;' +
          'left:' + (GAP + c * (CELL + GAP)) + 'px;top:' + (GAP + r * (CELL + GAP)) + 'px';
        board.appendChild(bg);
      }

      function style(t) {
        var v = t.v;
        t.el.style.width = CELL + 'px';
        t.el.style.height = CELL + 'px';
        t.el.style.fontSize = (v > 9999 ? 22 : v > 999 ? 26 : v > 99 ? 32 : 36) + 'px';
        t.el.style.background = COLORS[v] || '#ffffff';
        t.el.style.color = (v >= 128) ? '#0a0a1e' : '#e8e8ff';
        t.el.style.boxShadow = v >= 128 ? '0 6px 22px ' + FX.rgba((COLORS[v] || '#ffffff'), .45) : '0 6px 18px rgba(0,0,0,.35)';
        t.el.textContent = v;
      }
      function place(t) {
        t.el.style.transform = 'translate(' + (GAP + t.c * (CELL + GAP)) + 'px,' + (GAP + t.r * (CELL + GAP)) + 'px)';
      }
      function addTile(r, c, v, quiet) {
        var el = document.createElement('div');
        el.className = 't2048-tile';
        var t = { id: nextId++, v: v, r: r, c: c, el: el };
        board.appendChild(el);
        style(t); place(t);
        grid[r][c] = t; tiles.push(t);
        if (!quiet) {
          el.animate([{ transform: el.style.transform + ' scale(.2)', opacity: 0 },
                      { transform: el.style.transform + ' scale(1)', opacity: 1 }],
                     { duration: 160, easing: 'cubic-bezier(.2,1.4,.4,1)' });
        }
        return t;
      }
      function spawn() {
        var free = [];
        for (var r = 0; r < SIZE; r++) for (var c = 0; c < SIZE; c++) if (!grid[r][c]) free.push([r, c]);
        if (!free.length) return;
        var p = free[(Math.random() * free.length) | 0];
        addTile(p[0], p[1], Math.random() < .9 ? 2 : 4);
      }
      function reset() {
        board.querySelectorAll('.t2048-tile').forEach(function (e) { e.remove(); });
        grid = []; for (var r = 0; r < SIZE; r++) grid.push(new Array(SIZE).fill(null));
        tiles = []; score = 0; moves = 0; won = false; nextId = 1; busy = false;
        spawn(); spawn(); paintPanel();
      }
      function paintPanel() {
        var best = 0;
        tiles.forEach(function (t) { if (t.v > best) best = t.v; });
        wrap.querySelector('[data-score]').textContent = score;
        wrap.querySelector('[data-bt]').textContent = best;
        wrap.querySelector('[data-mv]').textContent = moves;
      }
      function floatScore(gain, r, c) {
        var f = document.createElement('div');
        f.className = 'fx-float';
        f.textContent = '+' + gain;
        f.style.color = '#ffd93d';
        f.style.left = (GAP + c * (CELL + GAP) + CELL / 2 - 20) + 'px';
        f.style.top = (GAP + r * (CELL + GAP)) + 'px';
        board.appendChild(f);
        setTimeout(function () { f.remove(); }, 820);
      }

      function move(dir) { /* 0 left, 1 up, 2 right, 3 down */
        if (busy) return;
        var vec = [[0,-1],[-1,0],[0,1],[1,0]][dir];
        var rs = [0,1,2,3], cs = [0,1,2,3];
        if (vec[0] > 0) rs = [3,2,1,0];
        if (vec[1] > 0) cs = [3,2,1,0];
        var moved = false, gained = 0, absorbed = [];
        tiles.forEach(function (t) { t.merged = false; });

        rs.forEach(function (r) {
          cs.forEach(function (c) {
            var t = grid[r][c];
            if (!t) return;
            var nr = r, nc = c;
            for (;;) {
              var tr = nr + vec[0], tc = nc + vec[1];
              if (tr < 0 || tc < 0 || tr >= SIZE || tc >= SIZE) break;
              var o = grid[tr][tc];
              if (!o) { grid[tr][tc] = t; grid[nr][nc] = null; nr = tr; nc = tc; moved = true; continue; }
              if (o.v === t.v && !o.merged && !t.merged) {
                grid[nr][nc] = null;
                o.v *= 2; o.merged = true;
                score += o.v; gained += o.v;
                t.r = tr; t.c = tc; t.dead = true;
                absorbed.push({ t: t, target: o });
                moved = true;
                floatScore(o.v, tr, tc);
              }
              break;
            }
            if (!t.dead) { t.r = nr; t.c = nc; }
          });
        });

        if (!moved) return;
        busy = true; moves++;
        tiles.forEach(place);
        api.beep(300, .04, 'square', .022);

        setTimeout(function () {
          absorbed.forEach(function (a) {
            a.t.el.remove();
            tiles.splice(tiles.indexOf(a.t), 1);
            style(a.target);
            a.target.el.classList.remove('anim-pop');
            void a.target.el.offsetWidth;
            a.target.el.classList.add('anim-pop');
          });
          if (gained) api.beep(560 + Math.min(600, gained), .07);
          spawn();
          paintPanel();
          busy = false;
          if (!won && tiles.some(function (t) { return t.v >= 2048; })) {
            won = true; api.toast('🎉 You made 2048!');
          }
          if (!canMove()) end();
        }, 115);
      }
      function canMove() {
        for (var r = 0; r < SIZE; r++) for (var c = 0; c < SIZE; c++) {
          if (!grid[r][c]) return true;
          var v = grid[r][c].v;
          if (c < SIZE - 1 && grid[r][c + 1] && grid[r][c + 1].v === v) return true;
          if (r < SIZE - 1 && grid[r + 1][c] && grid[r + 1][c].v === v) return true;
        }
        return false;
      }
      function end() {
        api.score(score);
        var ov = api.h('<div class="gover"><div><h3>NO MOVES</h3><p>Score ' + score + ' · ' + moves +
          ' moves</p><button class="btn btn-primary">New game</button></div></div>');
        ov.querySelector('button').onclick = function () { ov.remove(); reset(); };
        wrap.querySelector('.rel').appendChild(ov);
      }

      var M = { ArrowLeft:0, ArrowUp:1, ArrowRight:2, ArrowDown:3, a:0, w:1, d:2, s:3 };
      api.on(window, 'keydown', function (e) {
        var d = M[e.key] !== undefined ? M[e.key] : M[(e.key || '').toLowerCase()];
        if (d === undefined) return;
        e.preventDefault(); move(d);
      });
      var t0 = null;
      api.on(board, 'touchstart', function (e) { t0 = e.touches[0]; }, { passive: true });
      api.on(board, 'touchend', function (e) {
        if (!t0) return;
        var tt = e.changedTouches[0], dx = tt.clientX - t0.clientX, dy = tt.clientY - t0.clientY;
        if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) return;
        move(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 2 : 0) : (dy > 0 ? 3 : 1));
      });
      wrap.querySelector('[data-new]').onclick = reset;
      reset();
    }
  });
})();
