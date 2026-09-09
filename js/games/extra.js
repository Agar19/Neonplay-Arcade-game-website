/* ============================================================
   EXTRA — Asteroids, Light Cycles, Checkers, Slide Puzzle, Hangman
   ============================================================ */
(function () {
  'use strict';

  /* =========================================================
     ASTEROIDS
     ========================================================= */
  Arcade.register({
    id: 'asteroids', name: 'Asteroids', emoji: '☄️', tag: 'Action',
    colors: ['#e8e8ff', '#00e5ff'], unit: 'pts',
    desc: 'Vector rocks, real inertia. Shoot them small, do not get clipped.',
    help: '<kbd>←</kbd><kbd>→</kbd> turn · <kbd>↑</kbd> thrust · <kbd>Space</kbd> fire · <kbd>Shift</kbd> hyperspace',
    mount: function (root, api) {
      var W = 720, H = 500;
      var wrap = api.h('<div class="gwrap"><div class="rel"><canvas width="' + W + '" height="' + H + '"></canvas></div>' +
        '<div class="gpanel"><div><h4>Score</h4><div class="big" data-score>0</div></div>' +
        '<div class="row"><span>Wave</span><b data-wave>1</b></div>' +
        '<div class="row"><span>Lives</span><b data-lives>♥♥♥</b></div>' +
        '<div class="row"><span>Rocks</span><b data-rocks>0</b></div></div></div>');
      root.appendChild(wrap);
      var cv = wrap.querySelector('canvas'), ctx = FX.dpr(cv);
      var parts = FX.particles(), shake = FX.shake(), floats = FX.floaters(), stars = FX.stars(W, H, 70);

      var ship, rocks, shots, keys = {}, score, lives, wave, over, cool = 0, t = 0, hyper = 0;

      function makeRock(x, y, size) {
        var pts = [], n = 9 + ((Math.random() * 4) | 0);
        for (var i = 0; i < n; i++) pts.push(.68 + Math.random() * .5);
        var sp = 26 + (3 - size) * 26 + wave * 5;
        var a = Math.random() * 6.283;
        return { x: x, y: y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
                 r: size * 15, size: size, pts: pts, rot: Math.random() * 6.283,
                 spin: (Math.random() - .5) * 1.6 };
      }
      function spawnWave() {
        rocks = [];
        var n = 3 + wave;
        for (var i = 0; i < n; i++) {
          var edge = Math.random() * 6.283;
          rocks.push(makeRock(W / 2 + Math.cos(edge) * 330, H / 2 + Math.sin(edge) * 260, 3));
        }
      }
      function reset() {
        ship = { x: W / 2, y: H / 2, a: -1.57, vx: 0, vy: 0, inv: 2 };
        shots = []; score = 0; lives = 3; wave = 1; over = false;
        parts.clear(); floats.clear(); spawnWave();
      }
      function wrapPos(o) {
        if (o.x < -20) o.x += W + 40; if (o.x > W + 20) o.x -= W + 40;
        if (o.y < -20) o.y += H + 40; if (o.y > H + 20) o.y -= H + 40;
      }
      function die() {
        if (ship.inv > 0 || over) return;
        lives--; shake.add(1);
        parts.burst(ship.x, ship.y, 40, { colors: ['#00e5ff', '#ffffff', '#ff4d6d'], speed: 260, life: 1, size: 3.6 });
        api.beep(110, .4, 'sawtooth', .06);
        ship.x = W / 2; ship.y = H / 2; ship.vx = ship.vy = 0; ship.inv = 2.4;
        if (lives <= 0) {
          over = true; api.score(score);
          var ov = api.h('<div class="gover"><div><h3>DRIFTING</h3><p>' + score + ' pts · wave ' + wave +
            '</p><button class="btn btn-primary">Launch again</button></div></div>');
          ov.querySelector('button').onclick = function () { ov.remove(); reset(); };
          wrap.querySelector('.rel').appendChild(ov);
        }
      }
      api.on(window, 'keydown', function (e) {
        keys[e.key] = true;
        if (e.key === ' ' || e.key.indexOf('Arrow') === 0) e.preventDefault();
        if (e.key === 'Shift' && hyper <= 0 && !over) {
          hyper = 3;
          parts.burst(ship.x, ship.y, 20, { color: '#c77dff', speed: 200, life: .5 });
          ship.x = 40 + Math.random() * (W - 80); ship.y = 40 + Math.random() * (H - 80);
          ship.vx = ship.vy = 0; ship.inv = Math.max(ship.inv, .8);
          api.beep(1200, .12, 'sine', .05);
        }
      });
      api.on(window, 'keyup', function (e) { keys[e.key] = false; });

      reset();
      api.loop(function (dt) {
        t += dt; shake.update(dt); stars.update(dt, 6);
        hyper = Math.max(0, hyper - dt);
        if (!over) {
          if (keys.ArrowLeft || keys.a) ship.a -= 3.6 * dt;
          if (keys.ArrowRight || keys.d) ship.a += 3.6 * dt;
          var thrusting = keys.ArrowUp || keys.w;
          if (thrusting) {
            ship.vx += Math.cos(ship.a) * 290 * dt;
            ship.vy += Math.sin(ship.a) * 290 * dt;
            if (Math.random() < .6) {
              parts.burst(ship.x - Math.cos(ship.a) * 14, ship.y - Math.sin(ship.a) * 14, 2,
                { colors: ['#ffd93d', '#ff9f1c'], speed: 90, life: .3, angle: ship.a + Math.PI, spread: .7, size: 2.6 });
            }
          }
          var drag = Math.exp(-.35 * dt);
          ship.vx *= drag; ship.vy *= drag;
          ship.x += ship.vx * dt; ship.y += ship.vy * dt;
          wrapPos(ship);
          ship.inv = Math.max(0, ship.inv - dt);

          cool -= dt;
          if (keys[' '] && cool <= 0) {
            shots.push({ x: ship.x + Math.cos(ship.a) * 16, y: ship.y + Math.sin(ship.a) * 16,
                         vx: Math.cos(ship.a) * 470 + ship.vx, vy: Math.sin(ship.a) * 470 + ship.vy, life: 1.1 });
            cool = .19; api.beep(880, .05, 'square', .03);
            ship.vx -= Math.cos(ship.a) * 12; ship.vy -= Math.sin(ship.a) * 12;
          }
          shots.forEach(function (s) { s.x += s.vx * dt; s.y += s.vy * dt; s.life -= dt; wrapPos(s); });
          shots = shots.filter(function (s) { return s.life > 0; });

          rocks.forEach(function (r) {
            r.x += r.vx * dt; r.y += r.vy * dt; r.rot += r.spin * dt; wrapPos(r);
          });

          for (var i = rocks.length - 1; i >= 0; i--) {
            var r = rocks[i];
            for (var j = shots.length - 1; j >= 0; j--) {
              if (Math.hypot(r.x - shots[j].x, r.y - shots[j].y) < r.r) {
                shots.splice(j, 1);
                var pts = r.size === 3 ? 20 : r.size === 2 ? 50 : 100;
                score += pts;
                floats.add(r.x, r.y, '+' + pts, '#00e5ff', 16);
                parts.burst(r.x, r.y, 14 + r.size * 5,
                  { colors: ['#ffffff', '#9bb8ff', '#8b5cff'], speed: 180, life: .6, size: 2.8 });
                shake.add(.1 + (3 - r.size) * .05);
                api.beep(300 + (3 - r.size) * 200, .07);
                rocks.splice(i, 1);
                if (r.size > 1) {
                  for (var k = 0; k < 2; k++) {
                    var nr = makeRock(r.x, r.y, r.size - 1);
                    rocks.push(nr);
                  }
                }
                break;
              }
            }
            if (rocks.indexOf(r) >= 0 && ship.inv <= 0 &&
                Math.hypot(r.x - ship.x, r.y - ship.y) < r.r + 10) die();
          }
          if (!rocks.length) {
            wave++; score += 150; api.toast('Wave ' + wave); spawnWave();
          }
        }

        ctx.save(); FX.reset(ctx); ctx.save(); shake.apply(ctx);
        FX.bg(ctx, W, H, '#05061a', '#0a0618');
        stars.draw(ctx);

        ctx.lineJoin = 'round';
        rocks.forEach(function (r) {
          ctx.save(); ctx.translate(r.x, r.y); ctx.rotate(r.rot);
          ctx.strokeStyle = '#b9c9ff'; ctx.lineWidth = 2;
          ctx.shadowColor = '#6f8bff'; ctx.shadowBlur = 12;
          ctx.beginPath();
          r.pts.forEach(function (p, i) {
            var a = i / r.pts.length * 6.283;
            var x = Math.cos(a) * r.r * p, y = Math.sin(a) * r.r * p;
            i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
          });
          ctx.closePath();
          ctx.fillStyle = 'rgba(120,140,220,.10)'; ctx.fill();
          ctx.stroke();
          ctx.restore();
        });

        shots.forEach(function (s) {
          FX.glow(ctx, '#ffd93d', 12, function () {
            ctx.fillStyle = '#fff3b0';
            ctx.beginPath(); ctx.arc(s.x, s.y, 2.6, 0, 6.283); ctx.fill();
          });
        });

        if (!over && !(ship.inv > 0 && Math.floor(t * 12) % 2)) {
          ctx.save(); ctx.translate(ship.x, ship.y); ctx.rotate(ship.a);
          FX.glow(ctx, '#00e5ff', 16, function () {
            ctx.strokeStyle = '#e8f7ff'; ctx.lineWidth = 2.2;
            ctx.beginPath();
            ctx.moveTo(16, 0); ctx.lineTo(-12, -11); ctx.lineTo(-6, 0); ctx.lineTo(-12, 11);
            ctx.closePath(); ctx.stroke();
            ctx.fillStyle = 'rgba(0,229,255,.18)'; ctx.fill();
          });
          ctx.restore();
        }

        parts.update(dt); parts.draw(ctx);
        floats.update(dt); floats.draw(ctx);
        FX.vignette(ctx, W, H, .55);
        ctx.restore(); ctx.restore();

        wrap.querySelector('[data-score]').textContent = score;
        wrap.querySelector('[data-wave]').textContent = wave;
        wrap.querySelector('[data-lives]').textContent = '♥'.repeat(Math.max(0, lives)) || '—';
        wrap.querySelector('[data-rocks]').textContent = rocks.length;
      });
    }
  });

  /* =========================================================
     LIGHT CYCLES
     ========================================================= */
  Arcade.register({
    id: 'cycles', name: 'Light Cycles', emoji: '🏍️', tag: 'Action',
    colors: ['#00e5ff', '#ff9f1c'], unit: 'wins',
    desc: 'Tron-style duel. Box the CPU in before it boxes you in.',
    help: '<kbd>Arrows</kbd> or <kbd>WASD</kbd> to turn · do not touch a wall or a trail',
    mount: function (root, api) {
      var CW = 76, CH = 48, C = 9, W = CW * C, H = CH * C;
      var wrap = api.h('<div class="gwrap"><div class="rel"><canvas width="' + W + '" height="' + H + '"></canvas></div>' +
        '<div class="gpanel"><div><h4>Round</h4><div class="big"><span data-you>0</span> : <span data-cpu>0</span></div></div>' +
        '<div class="row"><span>Speed</span><b data-sp>1.0x</b></div>' +
        '<div class="row"><span>Length</span><b data-len>0</b></div>' +
        '<div class="seg" data-diff><button data-v="1">Easy</button><button class="on" data-v="2">Normal</button><button data-v="3">Hard</button></div>' +
        '</div></div>');
      root.appendChild(wrap);
      var cv = wrap.querySelector('canvas'), ctx = FX.dpr(cv);
      var parts = FX.particles(), shake = FX.shake();

      var occ, me, cpu, acc, step, dead, wins = 0, losses = 0, pending, t = 0, level = 2, roundOver;

      function idx(x, y) { return y * CW + x; }
      function free(x, y) { return x >= 0 && y >= 0 && x < CW && y < CH && !occ[idx(x, y)]; }
      function reset() {
        occ = new Array(CW * CH).fill(0);
        me = { x: 12, y: (CH / 2) | 0, dx: 1, dy: 0, trail: [] };
        cpu = { x: CW - 13, y: (CH / 2) | 0, dx: -1, dy: 0, trail: [] };
        occ[idx(me.x, me.y)] = 1; occ[idx(cpu.x, cpu.y)] = 2;
        me.trail.push([me.x, me.y]); cpu.trail.push([cpu.x, cpu.y]);
        acc = 0; step = .075; dead = false; roundOver = false; pending = null;
        parts.clear();
      }
      /* flood fill: how much room is left in a direction */
      function room(x, y, limit) {
        if (!free(x, y)) return 0;
        var seen = {}, q = [[x, y]], n = 0;
        seen[idx(x, y)] = 1;
        while (q.length && n < limit) {
          var c = q.shift(); n++;
          [[1,0],[-1,0],[0,1],[0,-1]].forEach(function (d) {
            var nx = c[0] + d[0], ny = c[1] + d[1];
            if (free(nx, ny) && !seen[idx(nx, ny)]) { seen[idx(nx, ny)] = 1; q.push([nx, ny]); }
          });
        }
        return n;
      }
      function cpuTurn() {
        var opts = [[cpu.dx, cpu.dy], [-cpu.dy, cpu.dx], [cpu.dy, -cpu.dx]];
        var best = null, bestScore = -1;
        opts.forEach(function (d, i) {
          var nx = cpu.x + d[0], ny = cpu.y + d[1];
          if (!free(nx, ny)) return;
          var sc = room(nx, ny, 60 + level * 60);
          /* mild aggression: prefer moving toward the player on higher levels */
          sc += (level - 1) * (30 - Math.hypot(nx - me.x, ny - me.y)) * .4;
          sc += i === 0 ? 4 : 0;               /* prefer going straight */
          sc += Math.random() * (4 - level) * 6;
          if (sc > bestScore) { bestScore = sc; best = d; }
        });
        if (best) { cpu.dx = best[0]; cpu.dy = best[1]; }
      }
      function boom(who, x, y) {
        parts.burst(x * C + C / 2, y * C + C / 2, 34,
          { colors: who === 1 ? ['#00e5ff', '#ffffff'] : ['#ff9f1c', '#ffd93d'], speed: 260, life: .8, size: 3.4 });
        shake.add(1);
        api.beep(120, .35, 'sawtooth', .05);
      }
      function endRound(youLost, cpuLost) {
        roundOver = true; dead = true;
        var title;
        if (youLost && cpuLost) title = 'CRASH — DRAW';
        else if (youLost) { losses++; title = 'YOU CRASHED'; }
        else { wins++; title = 'CPU CRASHED'; api.score(api.best() ? api.best() + 1 : 1); }
        wrap.querySelector('[data-you]').textContent = wins;
        wrap.querySelector('[data-cpu]').textContent = losses;
        var ov = api.h('<div class="gover"><div><h3>' + title + '</h3><p>' + wins + ' : ' + losses +
          '</p><button class="btn btn-primary">Next round</button></div></div>');
        ov.querySelector('button').onclick = function () { ov.remove(); reset(); };
        wrap.querySelector('.rel').appendChild(ov);
      }
      function tick() {
        if (pending) { me.dx = pending[0]; me.dy = pending[1]; pending = null; }
        cpuTurn();
        var mx = me.x + me.dx, my = me.y + me.dy;
        var cx = cpu.x + cpu.dx, cy = cpu.y + cpu.dy;
        var meDead = !free(mx, my), cpuDead = !free(cx, cy);
        if (!meDead && !cpuDead && mx === cx && my === cy) { meDead = cpuDead = true; }
        if (meDead) boom(1, me.x, me.y);
        if (cpuDead) boom(2, cpu.x, cpu.y);
        if (meDead || cpuDead) return endRound(meDead, cpuDead);
        me.x = mx; me.y = my; occ[idx(mx, my)] = 1; me.trail.push([mx, my]);
        cpu.x = cx; cpu.y = cy; occ[idx(cx, cy)] = 2; cpu.trail.push([cx, cy]);
        step = Math.max(.045, step * .9985);
        if (me.trail.length % 12 === 0) api.beep(160 + me.trail.length, .02, 'square', .012);
      }
      var MAP = { ArrowUp: [0,-1], ArrowDown: [0,1], ArrowLeft: [-1,0], ArrowRight: [1,0],
                  w: [0,-1], s: [0,1], a: [-1,0], d: [1,0] };
      api.on(window, 'keydown', function (e) {
        var m = MAP[e.key] || MAP[(e.key || '').toLowerCase()];
        if (!m) return;
        e.preventDefault();
        if (m[0] === -me.dx && m[1] === -me.dy) return;
        pending = m;
      });
      wrap.querySelectorAll('[data-diff] button').forEach(function (b) {
        b.onclick = function () {
          wrap.querySelectorAll('[data-diff] button').forEach(function (x) { x.classList.remove('on'); });
          b.classList.add('on'); level = +b.dataset.v; reset();
        };
      });

      function drawTrail(tr, color, head) {
        ctx.save();
        ctx.strokeStyle = color; ctx.lineWidth = C - 3.5;
        ctx.lineCap = 'square'; ctx.lineJoin = 'miter';
        ctx.shadowColor = color; ctx.shadowBlur = 14;
        ctx.beginPath();
        tr.forEach(function (p, i) {
          var x = p[0] * C + C / 2, y = p[1] * C + C / 2;
          i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
        });
        if (tr.length === 1) ctx.lineTo(tr[0][0] * C + C / 2 + .1, tr[0][1] * C + C / 2);
        ctx.stroke();
        ctx.restore();
        ctx.fillStyle = '#ffffff';
        FX.rr(ctx, head[0] * C + 1, head[1] * C + 1, C - 2, C - 2, 2); ctx.fill();
      }

      reset();
      api.loop(function (dt) {
        t += dt; shake.update(dt);
        if (!dead) {
          acc += dt;
          while (acc >= step && !dead) { acc -= step; tick(); }
        }
        ctx.save(); FX.reset(ctx); ctx.save(); shake.apply(ctx);
        FX.bg(ctx, W, H, '#04040f', '#080820');
        FX.grid(ctx, W, H, C * 4, .07);
        ctx.strokeStyle = 'rgba(0,229,255,.25)'; ctx.lineWidth = 3;
        ctx.strokeRect(1.5, 1.5, W - 3, H - 3);

        drawTrail(me.trail, '#00e5ff', [me.x, me.y]);
        drawTrail(cpu.trail, '#ff9f1c', [cpu.x, cpu.y]);

        parts.update(dt); parts.draw(ctx);
        FX.vignette(ctx, W, H, .5);
        FX.scanlines(ctx, W, H, .06);
        ctx.restore(); ctx.restore();

        wrap.querySelector('[data-sp]').textContent = (.075 / step).toFixed(2) + 'x';
        wrap.querySelector('[data-len]').textContent = me.trail.length;
      });
    }
  });

  /* =========================================================
     CHECKERS
     ========================================================= */
  Arcade.register({
    id: 'checkers', name: 'Checkers', emoji: '⚫', tag: 'Board',
    colors: ['#ff4d6d', '#e8e8ff'], unit: 'wins',
    desc: 'Forced captures, multi-jumps, crowned kings — against a thinking CPU.',
    help: 'Click a piece then a highlighted square · captures are compulsory',
    mount: function (root, api) {
      var b, turn, sel = -1, targets = [], over, mode = 'cpu', thinking = false, lastPath = null, hist = [];

      var wrap = api.h('<div class="gwrap"><div class="rel">' +
        '<div data-b style="display:grid;grid-template-columns:repeat(8,62px);grid-template-rows:repeat(8,62px);' +
        'border-radius:12px;overflow:hidden;border:2px solid rgba(255,255,255,.22);' +
        'box-shadow:0 22px 60px rgba(0,0,0,.55)"></div></div>' +
        '<div class="gpanel" style="min-width:190px">' +
          '<div><h4>Status</h4><div data-st style="font-size:15px;font-weight:700">Your move</div></div>' +
          '<div class="row"><span>You</span><b data-p1>12</b></div>' +
          '<div class="row"><span>CPU</span><b data-p2>12</b></div>' +
          '<div class="seg" data-mode><button class="on" data-v="cpu">vs CPU</button><button data-v="2p">2 players</button></div>' +
          '<div class="seg"><button data-undo>Undo</button><button data-new>New</button></div>' +
        '</div></div>');
      root.appendChild(wrap);
      var bEl = wrap.querySelector('[data-b]');

      function start() {
        b = new Array(64).fill('');
        for (var i = 0; i < 64; i++) {
          var r = (i / 8) | 0, c = i % 8;
          if ((r + c) % 2 === 0) continue;
          if (r < 3) b[i] = 'b';
          if (r > 4) b[i] = 'r';
        }
        turn = 'r'; sel = -1; targets = []; over = false; lastPath = null; hist = [];
        paint();
      }
      function side(p) { return !p ? null : p.toLowerCase(); }
      function isKing(p) { return p && p === p.toUpperCase(); }
      function dirsFor(p) {
        if (isKing(p)) return [[-1,-1],[-1,1],[1,-1],[1,1]];
        return p === 'r' ? [[-1,-1],[-1,1]] : [[1,-1],[1,1]];
      }
      function jumpsFrom(board, i, piece, seen) {
        var out = [], r = (i / 8) | 0, c = i % 8;
        dirsFor(piece).forEach(function (d) {
          var mr = r + d[0], mc = c + d[1], lr = r + d[0] * 2, lc = c + d[1] * 2;
          if (lr < 0 || lc < 0 || lr > 7 || lc > 7) return;
          var mid = mr * 8 + mc, land = lr * 8 + lc;
          if (!board[mid] || side(board[mid]) === side(piece)) return;
          if (board[land]) return;
          if (seen.indexOf(mid) >= 0) return;
          var nb = board.slice();
          nb[land] = piece; nb[i] = ''; nb[mid] = '';
          var promo = (piece === 'r' && lr === 0) || (piece === 'b' && lr === 7);
          var np = promo ? piece.toUpperCase() : piece;
          if (promo) nb[land] = np;
          var chains = promo ? [] : jumpsFrom(nb, land, np, seen.concat([mid]));
          if (chains.length) {
            chains.forEach(function (ch) {
              out.push({ from: i, path: [land].concat(ch.path), caps: [mid].concat(ch.caps) });
            });
          } else out.push({ from: i, path: [land], caps: [mid] });
        });
        return out;
      }
      function legal(board, who) {
        var jumps = [], plain = [];
        for (var i = 0; i < 64; i++) {
          var p = board[i];
          if (!p || side(p) !== who) continue;
          var js = jumpsFrom(board, i, p, []);
          if (js.length) { jumps = jumps.concat(js); continue; }
          var r = (i / 8) | 0, c = i % 8;
          dirsFor(p).forEach(function (d) {
            var nr = r + d[0], nc = c + d[1];
            if (nr < 0 || nc < 0 || nr > 7 || nc > 7) return;
            var t = nr * 8 + nc;
            if (!board[t]) plain.push({ from: i, path: [t], caps: [] });
          });
        }
        return jumps.length ? jumps : plain;
      }
      function apply(board, m) {
        var nb = board.slice();
        var p = nb[m.from];
        nb[m.from] = '';
        m.caps.forEach(function (c) { nb[c] = ''; });
        var end = m.path[m.path.length - 1], er = (end / 8) | 0;
        if ((p === 'r' && er === 0) || (p === 'b' && er === 7)) p = p.toUpperCase();
        nb[end] = p;
        return nb;
      }
      function evaluate(board) {
        var s = 0;
        for (var i = 0; i < 64; i++) {
          var p = board[i];
          if (!p) continue;
          var r = (i / 8) | 0;
          var v = isKing(p) ? 190 : 100 + (side(p) === 'b' ? r : 7 - r) * 6;
          s += side(p) === 'b' ? v : -v;
        }
        return s;
      }
      function search(board, who, depth, alpha, beta) {
        var ms = legal(board, who);
        if (!ms.length) return who === 'b' ? -9000 - depth : 9000 + depth;
        if (depth === 0) return evaluate(board);
        if (who === 'b') {
          var best = -1e9;
          for (var i = 0; i < ms.length; i++) {
            best = Math.max(best, search(apply(board, ms[i]), 'r', depth - 1, alpha, beta));
            alpha = Math.max(alpha, best);
            if (alpha >= beta) break;
          }
          return best;
        }
        var worst = 1e9;
        for (var j = 0; j < ms.length; j++) {
          worst = Math.min(worst, search(apply(board, ms[j]), 'b', depth - 1, alpha, beta));
          beta = Math.min(beta, worst);
          if (alpha >= beta) break;
        }
        return worst;
      }
      function cpuMove() {
        var ms = legal(b, 'b');
        if (!ms.length) return null;
        var best = null, bs = -1e9;
        ms.forEach(function (m) {
          var v = search(apply(b, m), 'r', 5, -1e9, 1e9) + Math.random() * 8;
          if (v > bs) { bs = v; best = m; }
        });
        return best;
      }
      function counts() {
        var r = 0, bl = 0;
        b.forEach(function (p) { if (side(p) === 'r') r++; else if (side(p) === 'b') bl++; });
        return [r, bl];
      }
      function paint() {
        bEl.innerHTML = '';
        var ms = legal(b, turn);
        for (var i = 0; i < 64; i++) {
          var r = (i / 8) | 0, c = i % 8, dark = (r + c) % 2 === 1;
          var d = document.createElement('div');
          var isTarget = targets.some(function (m) { return m.path[m.path.length - 1] === i; });
          var onPath = lastPath && lastPath.indexOf(i) >= 0;
          d.style.cssText = 'position:relative;display:grid;place-items:center;cursor:' + (dark ? 'pointer' : 'default') + ';' +
            'background:' + (i === sel ? 'linear-gradient(160deg,#a476ff,#7b45ff)'
                            : onPath ? (dark ? '#4a4520' : '#5f5a2c')
                            : dark ? '#241a2e' : '#3a2c46') + ';transition:background .16s';
          if (b[i]) {
            var sp = document.createElement('div');
            var red = side(b[i]) === 'r';
            sp.style.cssText = 'width:46px;height:46px;border-radius:50%;display:grid;place-items:center;' +
              'font-size:20px;transition:transform .16s;' +
              'background:' + (red ? 'radial-gradient(circle at 34% 28%,#ff9aa8,#ff4d6d 60%,#a81733)'
                                   : 'radial-gradient(circle at 34% 28%,#f4f4ff,#b9b9dd 60%,#5d5d80)') + ';' +
              'box-shadow:inset 0 -4px 8px rgba(0,0,0,.45),0 4px 12px rgba(0,0,0,.5)' +
              (isKing(b[i]) ? ',0 0 18px rgba(255,217,61,.75)' : '');
            if (isKing(b[i])) sp.textContent = '👑';
            d.appendChild(sp);
          }
          if (isTarget) {
            var dot = document.createElement('span');
            dot.style.cssText = 'position:absolute;inset:0;animation:popIn .16s ease-out;pointer-events:none;' +
              'background:radial-gradient(circle,rgba(57,255,136,.9) 14%,transparent 16%)';
            d.appendChild(dot);
          }
          (function (i) { d.onclick = function () { click(i); }; })(i);
          bEl.appendChild(d);
        }
        var cnt = counts();
        wrap.querySelector('[data-p1]').textContent = cnt[0];
        wrap.querySelector('[data-p2]').textContent = cnt[1];
        var st = wrap.querySelector('[data-st]');
        if (!ms.length) {
          over = true;
          st.textContent = turn === 'r' ? 'CPU wins' : 'You win!';
          if (turn === 'b' && mode === 'cpu') api.score((api.best() || 0) + 1);
        } else st.textContent = thinking ? 'CPU thinking…' : (turn === 'r' ? 'Your move' : 'Black to move') +
          (ms[0].caps.length ? ' · capture!' : '');
      }
      function click(i) {
        if (over || thinking) return;
        if (mode === 'cpu' && turn === 'b') return;
        var m = targets.filter(function (x) { return x.path[x.path.length - 1] === i; })[0];
        if (m) return doMove(m);
        var ms = legal(b, turn);
        var mine = ms.filter(function (x) { return x.from === i; });
        if (mine.length) { sel = i; targets = mine; } else { sel = -1; targets = []; }
        paint();
      }
      function doMove(m) {
        hist.push({ b: b.slice(), turn: turn });
        b = apply(b, m);
        lastPath = [m.from].concat(m.path);
        sel = -1; targets = [];
        api.beep(m.caps.length ? 300 : 500, .07);
        if (m.caps.length > 1) api.toast('Double jump!');
        turn = turn === 'r' ? 'b' : 'r';
        paint();
        if (!over && mode === 'cpu' && turn === 'b') {
          thinking = true; paint();
          api.timeout(function () {
            var mv = cpuMove();
            thinking = false;
            if (mv) doMove(mv); else paint();
          }, 80);
        }
      }
      wrap.querySelectorAll('[data-mode] button').forEach(function (btn) {
        btn.onclick = function () {
          wrap.querySelectorAll('[data-mode] button').forEach(function (x) { x.classList.remove('on'); });
          btn.classList.add('on'); mode = btn.dataset.v; start();
        };
      });
      wrap.querySelector('[data-undo]').onclick = function () {
        if (thinking || !hist.length) return;
        var back = mode === 'cpu' ? 2 : 1;
        while (back-- && hist.length) { var h = hist.pop(); b = h.b; turn = h.turn; }
        over = false; sel = -1; targets = []; lastPath = null; paint();
      };
      wrap.querySelector('[data-new]').onclick = start;
      start();
    }
  });

  /* =========================================================
     SLIDE PUZZLE (15 / 8 puzzle)
     ========================================================= */
  Arcade.register({
    id: 'slide', name: 'Slide Puzzle', emoji: '🔀', tag: 'Puzzles',
    colors: ['#00e5ff', '#8b5cff'], unit: 'moves', higher: false,
    desc: 'Classic sliding tiles, always shuffled into a solvable state.',
    help: 'Click a tile next to the gap, or use the <kbd>Arrows</kbd>',
    mount: function (root, api) {
      var N = 4, TILE = 92, GAP = 8, moves = 0, t0 = Date.now(), g = [], solved = false, els = [];
      var boardSize;

      var wrap = api.h('<div class="gwrap"><div class="rel">' +
        '<div data-b style="position:relative;background:#12122c;border:1px solid var(--line);' +
        'border-radius:16px;box-shadow:0 20px 56px rgba(0,0,0,.5)"></div></div>' +
        '<div class="gpanel"><div><h4>Moves</h4><div class="big" data-m>0</div></div>' +
        '<div class="row"><span>Time</span><b data-t>0s</b></div>' +
        '<div class="row"><span>Placed</span><b data-p>0</b></div>' +
        '<div class="seg" data-size><button data-v="3">3×3</button><button class="on" data-v="4">4×4</button><button data-v="5">5×5</button></div>' +
        '<button class="btn btn-mini" data-new>Shuffle</button></div></div>');
      root.appendChild(wrap);
      var bEl = wrap.querySelector('[data-b]');

      function pos(i) { return [GAP + (i % N) * (TILE + GAP), GAP + ((i / N) | 0) * (TILE + GAP)]; }
      function build() {
        TILE = N === 3 ? 116 : N === 4 ? 92 : 74;
        boardSize = N * TILE + (N + 1) * GAP;
        bEl.style.width = bEl.style.height = boardSize + 'px';
        bEl.innerHTML = '';
        els = [];
        for (var i = 0; i < N * N; i++) {
          var d = document.createElement('div');
          d.style.cssText = 'position:absolute;width:' + TILE + 'px;height:' + TILE + 'px;border-radius:12px;' +
            'display:grid;place-items:center;font-weight:800;font-size:' + (TILE * .36) + 'px;cursor:pointer;' +
            'transition:transform .13s cubic-bezier(.3,.9,.4,1),box-shadow .16s;user-select:none;' +
            'background:linear-gradient(150deg,#2f2f66,#1b1b3f);color:#e8e8ff;' +
            'box-shadow:0 6px 16px rgba(0,0,0,.4)';
          (function (el) { el.onclick = function () { tryMove(g.indexOf(cellOf(el))); }; })(d);
          bEl.appendChild(d);
          els.push(d);
        }
      }
      function cellOf(el) { return els.indexOf(el) + 1; }
      function shuffle() {
        g = [];
        for (var i = 1; i < N * N; i++) g.push(i);
        g.push(0);
        var blank = N * N - 1;
        for (var s = 0; s < N * N * 90; s++) {
          var opts = [];
          var r = (blank / N) | 0, c = blank % N;
          if (r > 0) opts.push(blank - N);
          if (r < N - 1) opts.push(blank + N);
          if (c > 0) opts.push(blank - 1);
          if (c < N - 1) opts.push(blank + 1);
          var pick = opts[(Math.random() * opts.length) | 0];
          g[blank] = g[pick]; g[pick] = 0; blank = pick;
        }
        moves = 0; t0 = Date.now(); solved = false;
        paint();
      }
      function paint() {
        var placed = 0;
        g.forEach(function (v, i) {
          if (!v) return;
          var el = els[v - 1];
          var p = pos(i);
          el.style.transform = 'translate(' + p[0] + 'px,' + p[1] + 'px)';
          el.textContent = v;
          var right = v === i + 1;
          if (right) placed++;
          el.style.background = right
            ? 'linear-gradient(150deg,#00e5ff,#2f7fff)'
            : 'linear-gradient(150deg,#2f2f66,#1b1b3f)';
          el.style.color = right ? '#04121e' : '#e8e8ff';
          el.style.boxShadow = right ? '0 6px 20px rgba(0,229,255,.35)' : '0 6px 16px rgba(0,0,0,.4)';
        });
        els.forEach(function (el, i) { el.style.display = g.indexOf(i + 1) < 0 ? 'none' : 'grid'; });
        wrap.querySelector('[data-m]').textContent = moves;
        wrap.querySelector('[data-p]').textContent = placed + ' / ' + (N * N - 1);
      }
      function tryMove(i) {
        if (solved || i < 0) return;
        var blank = g.indexOf(0);
        var r = (i / N) | 0, c = i % N, br = (blank / N) | 0, bc = blank % N;
        if (Math.abs(r - br) + Math.abs(c - bc) !== 1) return;
        g[blank] = g[i]; g[i] = 0;
        moves++;
        api.beep(420 + (moves % 5) * 40, .04, 'sine', .03);
        paint();
        check();
      }
      function check() {
        for (var i = 0; i < N * N - 1; i++) if (g[i] !== i + 1) return;
        solved = true;
        var secs = Math.round((Date.now() - t0) / 1000);
        api.score(moves);
        api.beep(880, .25);
        els.forEach(function (el, i) {
          setTimeout(function () {
            el.animate([{ transform: el.style.transform + ' scale(1)' },
                        { transform: el.style.transform + ' scale(1.12)' },
                        { transform: el.style.transform + ' scale(1)' }],
                       { duration: 360, easing: 'ease-out' });
          }, i * 40);
        });
        setTimeout(function () {
          var ov = api.h('<div class="gover"><div><h3>SOLVED</h3><p>' + moves + ' moves · ' + secs +
            's</p><button class="btn btn-primary">Shuffle</button></div></div>');
          ov.querySelector('button').onclick = function () { ov.remove(); shuffle(); };
          wrap.querySelector('.rel').appendChild(ov);
        }, 700);
      }
      api.on(window, 'keydown', function (e) {
        var blank = g.indexOf(0), r = (blank / N) | 0, c = blank % N, tgt = -1;
        if (e.key === 'ArrowUp' && r < N - 1) tgt = blank + N;
        if (e.key === 'ArrowDown' && r > 0) tgt = blank - N;
        if (e.key === 'ArrowLeft' && c < N - 1) tgt = blank + 1;
        if (e.key === 'ArrowRight' && c > 0) tgt = blank - 1;
        if (tgt >= 0) { e.preventDefault(); tryMove(tgt); }
      });
      wrap.querySelectorAll('[data-size] button').forEach(function (btn) {
        btn.onclick = function () {
          wrap.querySelectorAll('[data-size] button').forEach(function (x) { x.classList.remove('on'); });
          btn.classList.add('on'); N = +btn.dataset.v; build(); shuffle();
        };
      });
      wrap.querySelector('[data-new]').onclick = shuffle;
      api.interval(function () {
        if (!solved) wrap.querySelector('[data-t]').textContent = Math.round((Date.now() - t0) / 1000) + 's';
      }, 500);
      build(); shuffle();
    }
  });

  /* =========================================================
     HANGMAN
     ========================================================= */
  Arcade.register({
    id: 'hangman', name: 'Hangman', emoji: '🪢', tag: 'Puzzles',
    colors: ['#ffd93d', '#ff4d6d'], unit: 'wins',
    desc: 'Guess the word before the drawing finishes. Six wrong letters and it is over.',
    help: 'Type a letter or click the keyboard · <kbd>Enter</kbd> for a new word',
    mount: function (root, api) {
      var BANK = [
        ['ARCADE','JOYSTICK','PIXEL','CONSOLE','HIGHSCORE','CARTRIDGE','PINBALL','TOKEN'],
        ['NEBULA','ASTEROID','GRAVITY','ECLIPSE','SATELLITE','METEOR','COMET','ORBIT'],
        ['KEYBOARD','COMPILER','VARIABLE','FUNCTION','NETWORK','BROWSER','PIXELART','DEBUGGER'],
        ['VOLCANO','GLACIER','MONSOON','CANYON','SAVANNA','ISLAND','JUNGLE','DESERT']
      ];
      var CATS = ['Arcade', 'Space', 'Computers', 'Nature'];
      var ci = (Math.random() * BANK.length) | 0;
      var word = BANK[ci][(Math.random() * BANK[ci].length) | 0];
      var guessed = {}, wrong = 0, MAXW = 6, done = false;

      var wrap = api.h('<div class="gwrap"><div class="rel" style="display:flex;flex-direction:column;align-items:center;gap:16px">' +
        '<canvas width="340" height="300"></canvas>' +
        '<div data-word style="font-size:38px;letter-spacing:10px;font-weight:800;font-family:ui-monospace,Consolas,monospace;min-height:52px"></div>' +
        '<div data-kb style="display:flex;flex-direction:column;gap:6px;align-items:center"></div></div>' +
        '<div class="gpanel"><div><h4>Category</h4><div class="big" style="font-size:19px" data-cat>' + CATS[ci] + '</div></div>' +
        '<div class="row"><span>Wrong</span><b data-w>0 / 6</b></div>' +
        '<div class="row"><span>Letters left</span><b data-l>0</b></div>' +
        '<button class="btn btn-mini" data-new>New word</button></div></div>');
      root.appendChild(wrap);
      var cv = wrap.querySelector('canvas'), ctx = FX.dpr(cv);
      var kbEl = wrap.querySelector('[data-kb]'), wordEl = wrap.querySelector('[data-word]');
      var shake = FX.shake(), parts = FX.particles(), t = 0;

      function drawMan() {
        ctx.save(); FX.reset(ctx); ctx.save(); shake.apply(ctx);
        ctx.clearRect(0, 0, 340, 300);
        ctx.strokeStyle = '#6f6f9c'; ctx.lineWidth = 7; ctx.lineCap = 'round';
        /* gallows */
        ctx.beginPath();
        ctx.moveTo(40, 285); ctx.lineTo(150, 285);
        ctx.moveTo(95, 285); ctx.lineTo(95, 30);
        ctx.lineTo(215, 30); ctx.lineTo(215, 62);
        ctx.stroke();
        var parts6 = [
          function () { ctx.beginPath(); ctx.arc(215, 84, 22, 0, 6.283); ctx.stroke(); },
          function () { ctx.beginPath(); ctx.moveTo(215, 106); ctx.lineTo(215, 186); ctx.stroke(); },
          function () { ctx.beginPath(); ctx.moveTo(215, 124); ctx.lineTo(180, 158); ctx.stroke(); },
          function () { ctx.beginPath(); ctx.moveTo(215, 124); ctx.lineTo(250, 158); ctx.stroke(); },
          function () { ctx.beginPath(); ctx.moveTo(215, 186); ctx.lineTo(186, 236); ctx.stroke(); },
          function () { ctx.beginPath(); ctx.moveTo(215, 186); ctx.lineTo(244, 236); ctx.stroke(); }
        ];
        ctx.strokeStyle = '#ff4d6d';
        ctx.shadowColor = '#ff4d6d'; ctx.shadowBlur = 14;
        for (var i = 0; i < wrong && i < parts6.length; i++) parts6[i]();
        ctx.shadowBlur = 0;
        if (done && wrong >= MAXW) {
          ctx.strokeStyle = '#ff4d6d'; ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(207, 78); ctx.lineTo(213, 84); ctx.moveTo(213, 78); ctx.lineTo(207, 84);
          ctx.moveTo(217, 78); ctx.lineTo(223, 84); ctx.moveTo(223, 78); ctx.lineTo(217, 84);
          ctx.stroke();
        }
        parts.draw(ctx);
        ctx.restore(); ctx.restore();
      }
      function paintWord() {
        wordEl.innerHTML = word.split('').map(function (ch) {
          var shown = guessed[ch];
          return '<span style="display:inline-block;min-width:30px;border-bottom:4px solid ' +
            (shown ? 'transparent' : 'rgba(255,255,255,.25)') + ';color:' +
            (shown ? '#39ff88' : 'transparent') + ';text-shadow:' +
            (shown ? '0 0 18px rgba(57,255,136,.6)' : 'none') + '">' + (shown ? ch : '·') + '</span>';
        }).join('');
        wrap.querySelector('[data-w]').textContent = wrong + ' / ' + MAXW;
        wrap.querySelector('[data-l]').textContent =
          word.split('').filter(function (c) { return !guessed[c]; }).length;
      }
      function drawKb() {
        kbEl.innerHTML = '';
        ['QWERTYUIOP', 'ASDFGHJKL', 'ZXCVBNM'].forEach(function (line) {
          var d = document.createElement('div');
          d.style.cssText = 'display:flex;gap:5px';
          line.split('').forEach(function (ch) {
            var b = document.createElement('button');
            b.className = 'wd-key';
            b.textContent = ch;
            b.style.padding = '13px 12px';
            if (guessed[ch] !== undefined) {
              var good = word.indexOf(ch) >= 0;
              b.style.background = good ? '#39ff88' : '#20203d';
              b.style.color = good ? '#0a0a1e' : '#6e6e96';
            }
            b.onclick = function () { guess(ch); };
            d.appendChild(b);
          });
          kbEl.appendChild(d);
        });
      }
      function guess(ch) {
        if (done || guessed[ch] !== undefined) return;
        guessed[ch] = true;
        if (word.indexOf(ch) >= 0) {
          api.beep(700, .07);
        } else {
          wrong++;
          shake.add(.7);
          parts.burst(215, 84 + wrong * 20, 10, { color: '#ff4d6d', speed: 120, life: .5 });
          api.beep(200, .14, 'sawtooth');
        }
        paintWord(); drawKb();
        var win = word.split('').every(function (c) { return guessed[c]; });
        if (win) {
          done = true;
          api.score((api.best() || 0) + 1);
          api.beep(900, .2);
          finish('SAVED', 'You got ' + word + ' with ' + (MAXW - wrong) + ' lives left');
        } else if (wrong >= MAXW) {
          done = true;
          finish('HANGED', 'The word was ' + word);
        }
      }
      function finish(title, sub) {
        setTimeout(function () {
          var ov = api.h('<div class="gover"><div><h3>' + title + '</h3><p>' + sub +
            '</p><button class="btn btn-primary">New word</button></div></div>');
          ov.querySelector('button').onclick = api.restart;
          wrap.querySelector('.rel').appendChild(ov);
        }, 600);
      }
      api.on(window, 'keydown', function (e) {
        if (/^[a-zA-Z]$/.test(e.key)) guess(e.key.toUpperCase());
        if (e.key === 'Enter' && done) api.restart();
      });
      wrap.querySelector('[data-new]').onclick = api.restart;
      paintWord(); drawKb();
      api.loop(function (dt) {
        t += dt; shake.update(dt); parts.update(dt);
        drawMan();
      });
    }
  });
})();
