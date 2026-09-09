/* ============================================================
   ACTION — Archery, Duck Shooter, Space Blaster, Flappy, Whack-a-Mole
   ============================================================ */
(function () {
  'use strict';

  /* =========================================================
     ARCHERY RANGE
     ========================================================= */
  Arcade.register({
    id: 'archery', name: 'Archery Range', emoji: '🏹', tag: 'Action',
    colors: ['#39ff88', '#ffd93d'], unit: 'pts',
    desc: 'Ten arrows, real gravity, shifting wind. Read the flag, hit the gold.',
    help: 'Move the mouse to aim · <b>hold</b> to draw the bow · release to loose the arrow',
    mount: function (root, api) {
      var W = 760, H = 440;
      var wrap = api.h('<div class="gwrap"><div class="rel"><canvas width="' + W + '" height="' + H + '" style="cursor:crosshair"></canvas></div>' +
        '<div class="gpanel"><div><h4>Score</h4><div class="big" data-score>0</div></div>' +
        '<div class="row"><span>Arrow</span><b data-n>1 / 10</b></div>' +
        '<div class="row"><span>Wind</span><b data-wind>0</b></div>' +
        '<div class="row"><span>Last shot</span><b data-last>—</b></div>' +
        '<div class="row"><span>Bullseyes</span><b data-gold>0</b></div></div></div>');
      root.appendChild(wrap);
      var cv = wrap.querySelector('canvas'), ctx = FX.dpr(cv);
      var parts = FX.particles(), shake = FX.shake(), floats = FX.floaters(), trail = FX.trail(30);

      var BOW = { x: 96, y: H - 130 };
      var target = { x: 626, y: H / 2, r: 74, vy: 0 };
      var aim = { x: 400, y: 200 }, power = 0, drawing = false;
      var arrow = null, stuck = [], arrows = 10, score = 0, gold = 0, wind = 0, done = false, t = 0;
      var leaves = [];
      for (var i = 0; i < 18; i++) leaves.push({ x: Math.random() * W, y: Math.random() * (H - 60), s: .4 + Math.random() });

      function newShot() {
        wind = (Math.random() * 2 - 1) * 90;
        target.vy = arrows <= 6 ? (Math.random() > .5 ? 1 : -1) * (30 + (10 - arrows) * 9) : 0;
        wrap.querySelector('[data-wind]').textContent = (wind > 0 ? '→ ' : '← ') + Math.abs(wind).toFixed(0);
        wrap.querySelector('[data-n]').textContent = Math.min(11 - arrows, 10) + ' / 10';
      }
      function ringScore(dy) {
        var d = Math.abs(dy);
        if (d > target.r) return 0;
        return Math.max(1, 10 - Math.floor(d / (target.r / 10)));
      }
      function shoot() {
        if (arrow || done || arrows <= 0) return;
        var dx = aim.x - BOW.x, dy = aim.y - BOW.y, len = Math.hypot(dx, dy) || 1;
        var sp = 320 + power * 640;
        arrow = { x: BOW.x, y: BOW.y, vx: dx / len * sp, vy: dy / len * sp };
        trail.clear();
        arrows--;
        shake.add(.12 + power * .18);
        parts.burst(BOW.x, BOW.y, 8, { color: '#e8e8ff', speed: 120, life: .3, angle: Math.atan2(dy, dx), spread: 1 });
        api.beep(220, .12, 'triangle', .05);
      }
      function land(pts, hitY) {
        if (pts > 0) {
          stuck.push({ dy: hitY - target.y, pts: pts, t: 0 });
          parts.burst(target.x + 10, hitY, pts === 10 ? 30 : 16,
            { colors: pts === 10 ? ['#ffd93d', '#ffffff', '#ff9f1c'] : ['#00e5ff', '#ffffff'],
              speed: 230, life: .7, size: 3.5 });
          floats.add(target.x - 40, hitY - 30, '+' + pts, pts === 10 ? '#ffd93d' : '#39ff88', pts === 10 ? 30 : 22);
          shake.add(pts === 10 ? .6 : .25);
        } else {
          parts.burst(arrow.x, Math.min(arrow.y, H - 34), 12, { color: '#3a6b4a', speed: 150, life: .5, gravity: 300 });
          floats.add(arrow.x, H - 90, 'MISS', '#ff4d6d', 22);
        }
        arrow = null;
        score += pts;
        if (pts === 10) { gold++; api.beep(950, .22); }
        else if (pts > 0) api.beep(500, .1);
        else api.beep(140, .18, 'sawtooth');
        wrap.querySelector('[data-last]').textContent = pts ? pts + ' pts' : 'miss';
        wrap.querySelector('[data-score]').textContent = score;
        wrap.querySelector('[data-gold]').textContent = gold;
        if (arrows <= 0) {
          done = true;
          api.score(score);
          var ov = api.h('<div class="gover"><div><h3>END OF ROUND</h3><p>' + score + ' / 100 · ' + gold +
            ' bullseyes</p><button class="btn btn-primary">Shoot again</button></div></div>');
          ov.querySelector('button').onclick = api.restart;
          wrap.querySelector('.rel').appendChild(ov);
        } else newShot();
      }
      api.on(cv, 'mousemove', function (e) {
        var r = cv.getBoundingClientRect();
        aim.x = (e.clientX - r.left) * (W / r.width);
        aim.y = (e.clientY - r.top) * (H / r.height);
      });
      api.on(cv, 'mousedown', function () { drawing = true; power = 0; });
      api.on(window, 'mouseup', function () { if (drawing) { drawing = false; shoot(); power = 0; } });

      function drawTarget() {
        /* stand */
        ctx.fillStyle = '#181832';
        ctx.fillRect(target.x + 4, target.y + target.r * .6, 12, H - 34 - target.y - target.r * .6);
        ctx.fillStyle = '#12122c';
        ctx.fillRect(target.x - 16, H - 40, 52, 8);
        /* rings, drawn as ellipses so it reads side-on */
        var rings = [['#f2f2ff', 1], ['#0f0f22', .8], ['#00e5ff', .6], ['#ff4d6d', .4], ['#ffd93d', .2]];
        rings.forEach(function (r) {
          ctx.fillStyle = r[0];
          ctx.beginPath();
          ctx.ellipse(target.x + 10, target.y, 17 * (r[1] * .5 + .5), target.r * r[1], 0, 0, 6.283);
          ctx.fill();
        });
        FX.glow(ctx, '#ffd93d', 16, function () {
          ctx.strokeStyle = 'rgba(255,217,61,.5)'; ctx.lineWidth = 1.5;
          ctx.beginPath(); ctx.ellipse(target.x + 10, target.y, 9, target.r * .1, 0, 0, 6.283); ctx.stroke();
        });
        /* arrows already stuck in it */
        stuck.forEach(function (s) {
          s.t += 1 / 60;
          var wob = Math.sin(s.t * 14) * Math.max(0, .5 - s.t) * 6;
          ctx.save();
          ctx.translate(target.x + 10, target.y + s.dy);
          ctx.rotate(wob * .02);
          ctx.strokeStyle = '#d8d8ee'; ctx.lineWidth = 3; ctx.lineCap = 'round';
          ctx.beginPath(); ctx.moveTo(-34 + wob, 0); ctx.lineTo(2, 0); ctx.stroke();
          ctx.fillStyle = '#ff4d6d';
          ctx.beginPath();
          ctx.moveTo(-34 + wob, -4); ctx.lineTo(-26 + wob, 0); ctx.lineTo(-34 + wob, 4); ctx.fill();
          ctx.restore();
        });
      }

      newShot();
      api.loop(function (dt) {
        t += dt; shake.update(dt);
        if (drawing) power = Math.min(1, power + dt * 1.15);
        target.y += target.vy * dt;
        if (target.y < target.r + 24 || target.y > H - target.r - 44) target.vy *= -1;

        if (arrow) {
          var steps = 4;
          for (var s = 0; s < steps && arrow; s++) {
            var sdt = dt / steps;
            arrow.vy += 520 * sdt;
            arrow.vx += wind * sdt;
            arrow.x += arrow.vx * sdt; arrow.y += arrow.vy * sdt;
            trail.push(arrow.x, arrow.y);
            if (arrow.x >= target.x - 4 && arrow.x <= target.x + 30) land(ringScore(arrow.y - target.y), arrow.y);
            else if (arrow.y > H - 34 || arrow.x > W + 40) land(0, arrow.y);
          }
        }

        /* ---------------- scene ---------------- */
        ctx.save(); FX.reset(ctx); ctx.save(); shake.apply(ctx);

        FX.bg(ctx, W, H, '#0b0d2c', '#2a1547');
        /* moon */
        FX.glow(ctx, '#ffeccb', 40, function () {
          ctx.fillStyle = '#ffeccb';
          ctx.beginPath(); ctx.arc(660, 78, 26, 0, 6.283); ctx.fill();
        });
        /* stars */
        for (var i = 0; i < 40; i++) {
          var sx = (i * 137.5) % W, sy = (i * 71.3) % 150;
          ctx.fillStyle = 'rgba(255,255,255,' + (.12 + Math.abs(Math.sin(t + i)) * .28) + ')';
          ctx.fillRect(sx, sy, 1.6, 1.6);
        }
        /* far hills */
        [['#171335', 210, 90], ['#1f1741', 250, 60]].forEach(function (h, li) {
          ctx.fillStyle = h[0];
          ctx.beginPath();
          ctx.moveTo(0, H);
          for (var x = 0; x <= W; x += 20) {
            ctx.lineTo(x, h[1] + Math.sin(x / h[2] + li * 2) * 34 + Math.sin(x / 37) * 8);
          }
          ctx.lineTo(W, H); ctx.fill();
        });
        /* ground */
        var g = ctx.createLinearGradient(0, H - 46, 0, H);
        g.addColorStop(0, '#14402a'); g.addColorStop(1, '#0a2318');
        ctx.fillStyle = g; ctx.fillRect(0, H - 46, W, 46);
        for (var b = 0; b < 90; b++) {
          var gx = (b * 61.7) % W;
          ctx.strokeStyle = 'rgba(60,180,110,.30)'; ctx.lineWidth = 1;
          ctx.beginPath(); ctx.moveTo(gx, H - 40);
          ctx.lineTo(gx + Math.sin(t * 1.4 + b) * 3 + wind * .02, H - 50 - (b % 4) * 2); ctx.stroke();
        }
        /* drifting leaves show the wind */
        leaves.forEach(function (l) {
          l.x += wind * .35 * l.s * dt * 3;
          l.y += Math.sin(t * 2 + l.x * .05) * 8 * dt;
          if (l.x > W + 10) l.x = -10; if (l.x < -10) l.x = W + 10;
          ctx.fillStyle = 'rgba(120,220,160,' + (.12 + l.s * .12) + ')';
          ctx.fillRect(l.x, l.y, 3 * l.s, 2 * l.s);
        });

        /* wind flag */
        ctx.strokeStyle = '#5b5b8c'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(474, H - 46); ctx.lineTo(474, 96); ctx.stroke();
        ctx.fillStyle = wind > 0 ? '#39ff88' : '#00e5ff';
        ctx.beginPath();
        ctx.moveTo(474, 96);
        var fl = wind * .48;
        ctx.quadraticCurveTo(474 + fl * .5, 100 + Math.sin(t * 6) * 4, 474 + fl, 106 + Math.sin(t * 6) * 5);
        ctx.lineTo(474, 122); ctx.fill();

        drawTarget();

        /* aim guide while drawing */
        var dx = aim.x - BOW.x, dy = aim.y - BOW.y, ang = Math.atan2(dy, dx);
        if (drawing && !arrow) {
          var len = Math.hypot(dx, dy) || 1, sp = 320 + power * 640;
          var px = BOW.x, py = BOW.y, pvx = dx / len * sp, pvy = dy / len * sp;
          ctx.fillStyle = 'rgba(255,255,255,.45)';
          for (var k = 0; k < 26; k++) {
            for (var q = 0; q < 3; q++) { pvy += 520 * .016; pvx += wind * .016; px += pvx * .016; py += pvy * .016; }
            if (py > H - 46 || px > W) break;
            ctx.globalAlpha = .5 - k * .017;
            ctx.beginPath(); ctx.arc(px, py, 2.2, 0, 6.283); ctx.fill();
          }
          ctx.globalAlpha = 1;
        }

        /* bow */
        ctx.save(); ctx.translate(BOW.x, BOW.y); ctx.rotate(ang);
        var pull = power * 26;
        FX.glow(ctx, '#ffd08a', drawing ? 14 * power : 0, function () {
          ctx.strokeStyle = '#d8a838'; ctx.lineWidth = 5; ctx.lineCap = 'round';
          ctx.beginPath(); ctx.arc(0, 0, 36, -1.35, 1.35); ctx.stroke();
        });
        ctx.strokeStyle = 'rgba(255,255,255,.8)'; ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.moveTo(36 * Math.cos(-1.35), 36 * Math.sin(-1.35));
        ctx.lineTo(-pull, 0);
        ctx.lineTo(36 * Math.cos(1.35), 36 * Math.sin(1.35));
        ctx.stroke();
        if (!arrow) {
          ctx.strokeStyle = '#e8e8ff'; ctx.lineWidth = 3;
          ctx.beginPath(); ctx.moveTo(-pull, 0); ctx.lineTo(46, 0); ctx.stroke();
          ctx.fillStyle = '#ff4d6d';
          ctx.beginPath(); ctx.moveTo(46, 0); ctx.lineTo(38, -4); ctx.lineTo(38, 4); ctx.fill();
        }
        ctx.restore();

        /* flying arrow */
        if (arrow) {
          trail.draw(ctx, '#ffd93d', 7);
          ctx.save(); ctx.translate(arrow.x, arrow.y); ctx.rotate(Math.atan2(arrow.vy, arrow.vx));
          ctx.strokeStyle = '#f0f0ff'; ctx.lineWidth = 3; ctx.lineCap = 'round';
          ctx.beginPath(); ctx.moveTo(-24, 0); ctx.lineTo(12, 0); ctx.stroke();
          ctx.fillStyle = '#ff4d6d';
          ctx.beginPath(); ctx.moveTo(12, 0); ctx.lineTo(4, -4); ctx.lineTo(4, 4); ctx.fill();
          ctx.fillStyle = '#9ad7ff';
          ctx.beginPath(); ctx.moveTo(-24, 0); ctx.lineTo(-18, -5); ctx.lineTo(-14, 0); ctx.lineTo(-18, 5); ctx.fill();
          ctx.restore();
        }

        parts.update(dt); parts.draw(ctx);
        floats.update(dt); floats.draw(ctx);

        /* power meter */
        ctx.fillStyle = 'rgba(0,0,0,.45)';
        FX.rr(ctx, 38, H - 66, 168, 14, 7); ctx.fill();
        var pg = ctx.createLinearGradient(38, 0, 206, 0);
        pg.addColorStop(0, '#39ff88'); pg.addColorStop(.6, '#ffd93d'); pg.addColorStop(1, '#ff4d6d');
        ctx.save();
        FX.rr(ctx, 38, H - 66, 168 * power, 14, 7); ctx.clip();
        ctx.fillStyle = pg; ctx.fillRect(38, H - 66, 168, 14);
        ctx.restore();
        FX.text(ctx, 'DRAW', 38, H - 72, { size: 11, color: '#9a9ac4', align: 'left' });

        FX.vignette(ctx, W, H, .5);
        ctx.restore(); ctx.restore();
      });
    }
  });

  /* =========================================================
     DUCK SHOOTER
     ========================================================= */
  Arcade.register({
    id: 'shooter', name: 'Duck Shooter', emoji: '🎯', tag: 'Action',
    colors: ['#ff2fb9', '#ffd93d'], unit: 'pts',
    desc: 'Sixty seconds of flying targets. Chain hits for a combo multiplier.',
    help: 'Click the targets · <kbd>R</kbd> reloads (6 shots per magazine)',
    mount: function (root, api) {
      var W = 780, H = 460;
      var wrap = api.h('<div class="gwrap"><div class="rel"><canvas width="' + W + '" height="' + H + '" style="cursor:none"></canvas></div>' +
        '<div class="gpanel"><div><h4>Score</h4><div class="big" data-score>0</div></div>' +
        '<div class="row"><span>Time</span><b data-time>60</b></div>' +
        '<div class="row"><span>Combo</span><b data-combo>x1</b></div>' +
        '<div class="row"><span>Ammo</span><b data-ammo>6</b></div>' +
        '<div class="row"><span>Accuracy</span><b data-acc>—</b></div></div></div>');
      root.appendChild(wrap);
      var cv = wrap.querySelector('canvas'), ctx = FX.dpr(cv);
      var parts = FX.particles(), shake = FX.shake(), floats = FX.floaters();

      var ducks = [], score = 0, time = 60, combo = 1, ammo = 6, shots = 0, hits = 0,
          spawnT = 0, over = false, reloading = 0, mouse = { x: W / 2, y: H / 2 }, flash = 0, t = 0;
      var clouds = [];
      for (var i = 0; i < 6; i++) clouds.push({ x: Math.random() * W, y: 40 + Math.random() * 90, s: .5 + Math.random(), w: 70 + Math.random() * 90 });

      function spawn() {
        var fromLeft = Math.random() > .5;
        var kind = Math.random() < .12 ? 'gold' : Math.random() < .22 ? 'small' : 'duck';
        var r = kind === 'small' ? 16 : kind === 'gold' ? 22 : 26;
        ducks.push({
          x: fromLeft ? -40 : W + 40,
          y: 60 + Math.random() * (H - 210),
          vx: (fromLeft ? 1 : -1) * (110 + Math.random() * 120 + (60 - time) * 1.6),
          vy: (Math.random() * 2 - 1) * 55,
          r: r, kind: kind, t: Math.random() * 6, flap: 0
        });
      }
      function finish() {
        over = true;
        api.score(score);
        var acc = shots ? Math.round(hits / shots * 100) : 0;
        var ov = api.h('<div class="gover"><div><h3>TIME</h3><p>' + score + ' pts · ' + acc +
          '% accuracy</p><button class="btn btn-primary">Shoot again</button></div></div>');
        ov.querySelector('button').onclick = api.restart;
        wrap.querySelector('.rel').appendChild(ov);
      }
      api.on(cv, 'mousemove', function (e) {
        var r = cv.getBoundingClientRect();
        mouse.x = (e.clientX - r.left) * (W / r.width);
        mouse.y = (e.clientY - r.top) * (H / r.height);
      });
      api.on(cv, 'mousedown', function (e) {
        if (over || reloading > 0) return;
        if (ammo <= 0) { api.beep(90, .08, 'square', .04); reloading = .9; return; }
        var r = cv.getBoundingClientRect();
        var mx = (e.clientX - r.left) * (W / r.width), my = (e.clientY - r.top) * (H / r.height);
        ammo--; shots++; flash = 1; shake.add(.16);
        parts.burst(mx, my, 8, { color: '#ffd93d', speed: 190, life: .22, size: 2.6 });
        api.beep(1200, .05, 'square', .05);
        var hit = null;
        for (var i = ducks.length - 1; i >= 0; i--) {
          var d = ducks[i];
          if (Math.hypot(d.x - mx, d.y - my) < d.r + 9) { hit = i; break; }
        }
        if (hit !== null) {
          var d2 = ducks[hit];
          var base = d2.kind === 'gold' ? 120 : d2.kind === 'small' ? 75 : 40;
          hits++; combo = Math.min(8, combo + 1);
          score += base * combo;
          parts.burst(d2.x, d2.y, 26, {
            colors: d2.kind === 'gold' ? ['#ffd93d', '#fff', '#ff9f1c'] : ['#ffffff', '#c7d9ff', '#8b5cff'],
            speed: 230, life: .8, size: 3.6, gravity: 220
          });
          floats.add(d2.x, d2.y - 14, '+' + (base * combo), combo > 3 ? '#ff2fb9' : '#ffd93d', 18 + combo * 2);
          ducks.splice(hit, 1);
          shake.add(.2);
          api.beep(700 + combo * 70, .09);
        } else { combo = 1; }
        if (ammo <= 0) reloading = .9;
      });
      api.on(window, 'keydown', function (e) {
        if ((e.key === 'r' || e.key === 'R') && ammo < 6) reloading = .9;
      });

      api.interval(function () {
        if (over) return;
        time--;
        wrap.querySelector('[data-time]').textContent = time;
        if (time <= 0) finish();
      }, 1000);

      api.loop(function (dt) {
        t += dt; shake.update(dt);
        flash = Math.max(0, flash - dt * 7);
        if (!over) {
          spawnT -= dt;
          if (spawnT <= 0) { spawn(); spawnT = Math.max(.35, 1.25 - (60 - time) * .014); }
          if (reloading > 0) { reloading -= dt; if (reloading <= 0) { ammo = 6; api.beep(420, .08); } }
          ducks.forEach(function (d) {
            d.t += dt; d.flap += dt * 12;
            d.x += d.vx * dt; d.y += d.vy * dt + Math.sin(d.t * 4) * 24 * dt;
            if (d.y < 40 || d.y > H - 110) d.vy *= -1;
          });
          ducks = ducks.filter(function (d) {
            var gone = d.x < -70 || d.x > W + 70;
            if (gone) combo = 1;
            return !gone;
          });
        }

        ctx.save(); FX.reset(ctx); ctx.save(); shake.apply(ctx);

        /* dusk sky */
        var sky = ctx.createLinearGradient(0, 0, 0, H);
        sky.addColorStop(0, '#1b0f36'); sky.addColorStop(.45, '#4a1a4d'); sky.addColorStop(1, '#7a2f3d');
        ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H);
        FX.glow(ctx, '#ffb36b', 60, function () {
          ctx.fillStyle = '#ffce8f';
          ctx.beginPath(); ctx.arc(W * .72, H - 150, 54, 0, 6.283); ctx.fill();
        });
        clouds.forEach(function (c) {
          c.x += c.s * 7 * dt;
          if (c.x > W + c.w) c.x = -c.w;
          ctx.fillStyle = 'rgba(255,190,220,' + (.06 + c.s * .05) + ')';
          ctx.beginPath();
          ctx.ellipse(c.x, c.y, c.w, c.w * .3, 0, 0, 6.283); ctx.fill();
        });
        /* tree line */
        ctx.fillStyle = '#150c22';
        ctx.beginPath(); ctx.moveTo(0, H);
        for (var x = 0; x <= W; x += 12) ctx.lineTo(x, H - 96 - Math.abs(Math.sin(x * .06)) * 34 - Math.sin(x * .017) * 18);
        ctx.lineTo(W, H); ctx.fill();
        /* reeds */
        ctx.fillStyle = '#0b1a12'; ctx.fillRect(0, H - 62, W, 62);
        for (var i2 = 0; i2 < 60; i2++) {
          var rx = (i2 * 79.3) % W;
          ctx.strokeStyle = 'rgba(60,170,110,.35)'; ctx.lineWidth = 2;
          ctx.beginPath(); ctx.moveTo(rx, H);
          ctx.quadraticCurveTo(rx + 6, H - 40, rx + Math.sin(t * 1.6 + i2) * 10, H - 74); ctx.stroke();
        }

        ducks.forEach(function (d) {
          ctx.save(); ctx.translate(d.x, d.y);
          if (d.vx < 0) ctx.scale(-1, 1);
          ctx.rotate(Math.sin(d.t * 4) * .12);
          var wing = Math.sin(d.flap) * .5;
          ctx.save(); ctx.scale(1, 1 + wing * .18);
          ctx.font = (d.r * 2) + 'px sans-serif';
          ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          if (d.kind === 'gold') { ctx.shadowColor = '#ffd93d'; ctx.shadowBlur = 22; }
          ctx.fillText(d.kind === 'gold' ? '🦅' : d.kind === 'small' ? '🕊️' : '🦆', 0, 0);
          ctx.restore(); ctx.restore();
        });

        parts.update(dt); parts.draw(ctx);
        floats.update(dt); floats.draw(ctx);

        /* muzzle flash */
        if (flash > 0) {
          ctx.fillStyle = 'rgba(255,240,190,' + flash * .18 + ')';
          ctx.fillRect(0, 0, W, H);
        }
        /* crosshair */
        ctx.save();
        ctx.translate(mouse.x, mouse.y);
        ctx.strokeStyle = reloading > 0 ? 'rgba(255,77,109,.9)' : 'rgba(255,255,255,.9)';
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(0, 0, 15 + flash * 8, 0, 6.283); ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(-24, 0); ctx.lineTo(-8, 0); ctx.moveTo(8, 0); ctx.lineTo(24, 0);
        ctx.moveTo(0, -24); ctx.lineTo(0, -8); ctx.moveTo(0, 8); ctx.lineTo(0, 24);
        ctx.stroke();
        ctx.fillStyle = 'rgba(255,255,255,.9)';
        ctx.beginPath(); ctx.arc(0, 0, 1.6, 0, 6.283); ctx.fill();
        ctx.restore();

        /* HUD */
        if (reloading > 0) {
          FX.text(ctx, 'RELOADING', W / 2, H - 26, { size: 18, color: '#ff4d6d', glow: '#ff4d6d' });
          ctx.fillStyle = 'rgba(255,255,255,.15)';
          FX.rr(ctx, W / 2 - 60, H - 18, 120, 6, 3); ctx.fill();
          ctx.fillStyle = '#ff4d6d';
          FX.rr(ctx, W / 2 - 60, H - 18, 120 * (1 - reloading / .9), 6, 3); ctx.fill();
        }
        for (var a = 0; a < 6; a++) {
          ctx.fillStyle = a < ammo ? '#ffd93d' : 'rgba(255,255,255,.14)';
          FX.rr(ctx, 20 + a * 15, H - 36, 9, 22, 3); ctx.fill();
        }
        if (combo > 1) {
          FX.text(ctx, 'x' + combo, W - 46, 46, { size: 26 + combo * 2, color: '#ff2fb9', glow: '#ff2fb9' });
        }
        FX.vignette(ctx, W, H, .55);
        ctx.restore(); ctx.restore();

        wrap.querySelector('[data-score]').textContent = score;
        wrap.querySelector('[data-combo]').textContent = 'x' + combo;
        wrap.querySelector('[data-ammo]').textContent = ammo;
        wrap.querySelector('[data-acc]').textContent = shots ? Math.round(hits / shots * 100) + '%' : '—';
      });
    }
  });

  /* =========================================================
     SPACE BLASTER
     ========================================================= */
  Arcade.register({
    id: 'blaster', name: 'Space Blaster', emoji: '🚀', tag: 'Action',
    colors: ['#00e5ff', '#ff2fb9'], unit: 'pts',
    desc: 'Waves of invaders, three lives, one very hot laser cannon.',
    help: '<kbd>←</kbd><kbd>→</kbd> move · <kbd>Space</kbd> fire · survive the waves',
    mount: function (root, api) {
      var W = 620, H = 520;
      var wrap = api.h('<div class="gwrap"><div class="rel"><canvas width="' + W + '" height="' + H + '"></canvas></div>' +
        '<div class="gpanel"><div><h4>Score</h4><div class="big" data-score>0</div></div>' +
        '<div class="row"><span>Wave</span><b data-wave>1</b></div>' +
        '<div class="row"><span>Lives</span><b data-lives>♥♥♥</b></div>' +
        '<div class="row"><span>Enemies</span><b data-foes>0</b></div></div></div>');
      root.appendChild(wrap);
      var cv = wrap.querySelector('canvas'), ctx = FX.dpr(cv);
      var parts = FX.particles(), shake = FX.shake(), floats = FX.floaters();
      var stars = FX.stars(W, H, 110);

      var ship, bullets, foes, bombs, score, lives, wave, keys = {}, cool = 0, over, dirX, t = 0, hurt = 0;

      function makeWave() {
        foes = [];
        var rows = Math.min(5, 2 + Math.floor(wave / 2)), cols = 8;
        for (var r = 0; r < rows; r++) for (var c = 0; c < cols; c++) {
          foes.push({ x: 70 + c * 62, y: 60 + r * 48, r: 16, hp: r === 0 ? 2 : 1, t: Math.random() * 6, hit: 0 });
        }
        dirX = 1;
      }
      function reset() {
        ship = { x: W / 2, tx: W / 2, y: H - 46, w: 34, inv: 0 };
        bullets = []; bombs = []; score = 0; lives = 3; wave = 1; over = false;
        parts.clear(); floats.clear();
        makeWave();
      }
      function hitShip() {
        if (ship.inv > 0) return;
        lives--; hurt = 1; ship.inv = 1.4;
        shake.add(1);
        parts.burst(ship.x, ship.y, 34, { colors: ['#00e5ff', '#ffffff', '#ff4d6d'], speed: 260, life: .8, size: 4 });
        api.beep(120, .35, 'sawtooth', .06);
        bombs = [];
        if (lives <= 0) {
          over = true; api.score(score);
          var ov = api.h('<div class="gover"><div><h3>SHIP LOST</h3><p>' + score + ' pts · wave ' + wave +
            '</p><button class="btn btn-primary">Relaunch</button></div></div>');
          ov.querySelector('button').onclick = function () { ov.remove(); reset(); };
          wrap.querySelector('.rel').appendChild(ov);
        }
      }
      api.on(window, 'keydown', function (e) {
        keys[e.key] = true;
        if (e.key === ' ' || e.key.indexOf('Arrow') === 0) e.preventDefault();
      });
      api.on(window, 'keyup', function (e) { keys[e.key] = false; });
      api.on(cv, 'mousemove', function (e) {
        var r = cv.getBoundingClientRect();
        ship.tx = (e.clientX - r.left) * (W / r.width);
      });
      api.on(cv, 'mousedown', function () { keys[' '] = true; });
      api.on(window, 'mouseup', function () { keys[' '] = false; });

      reset();
      api.loop(function (dt) {
        t += dt; shake.update(dt);
        hurt = Math.max(0, hurt - dt * 2);
        stars.update(dt, 40);

        if (!over) {
          if (keys.ArrowLeft || keys.a) ship.tx -= 400 * dt;
          if (keys.ArrowRight || keys.d) ship.tx += 400 * dt;
          ship.tx = FX.clamp(ship.tx, 20, W - 20);
          ship.x = FX.approach(ship.x, ship.tx, 20, dt);
          ship.inv = Math.max(0, ship.inv - dt);

          cool -= dt;
          if (keys[' '] && cool <= 0) {
            bullets.push({ x: ship.x, y: ship.y - 18, vy: -600 });
            parts.burst(ship.x, ship.y - 16, 4, { color: '#ffd93d', speed: 90, life: .18, angle: -1.57, spread: .8 });
            cool = .2; api.beep(900, .05, 'square', .03);
          }
          bullets.forEach(function (b) { b.y += b.vy * dt; });
          bullets = bullets.filter(function (b) { return b.y > -20; });

          var speed = (26 + wave * 9) * (1 + (1 - foes.length / 40));
          var edge = false;
          foes.forEach(function (f) {
            f.t += dt; f.hit = Math.max(0, f.hit - dt * 4);
            f.x += dirX * speed * dt;
            if (f.x < 26 || f.x > W - 26) edge = true;
          });
          if (edge) { dirX *= -1; foes.forEach(function (f) { f.y += 22; }); api.beep(200, .05, 'sine', .02); }

          foes.forEach(function (f) {
            if (Math.random() < dt * (.14 + wave * .02)) bombs.push({ x: f.x, y: f.y + 16, vy: 190 + wave * 12, t: 0 });
            if (f.y > H - 90 && !over) { lives = 1; hitShip(); }
          });
          bombs.forEach(function (b) { b.y += b.vy * dt; b.t += dt; });
          bombs = bombs.filter(function (b) {
            if (b.y > H) return false;
            if (Math.abs(b.x - ship.x) < 20 && b.y > ship.y - 16) { hitShip(); return false; }
            return true;
          });

          for (var i = foes.length - 1; i >= 0; i--) {
            for (var j = bullets.length - 1; j >= 0; j--) {
              if (Math.hypot(foes[i].x - bullets[j].x, foes[i].y - bullets[j].y) < foes[i].r + 5) {
                bullets.splice(j, 1);
                foes[i].hp--; foes[i].hit = 1;
                if (foes[i].hp <= 0) {
                  var pts = 50 + wave * 10;
                  score += pts;
                  floats.add(foes[i].x, foes[i].y, '+' + pts, '#39ff88', 16);
                  parts.burst(foes[i].x, foes[i].y, 20,
                    { colors: ['#ff2fb9', '#ffd93d', '#ffffff'], speed: 220, life: .6, size: 3.4 });
                  foes.splice(i, 1);
                  shake.add(.12);
                  api.beep(420, .07);
                } else api.beep(600, .04);
                break;
              }
            }
          }
          if (!foes.length) { wave++; score += 200; makeWave(); api.toast('Wave ' + wave); }
        }

        /* ---------------- render ---------------- */
        ctx.save(); FX.reset(ctx); ctx.save(); shake.apply(ctx);
        FX.bg(ctx, W, H, '#06061a', '#0d0524');
        stars.draw(ctx);
        FX.retroFloor(ctx, W, H, t, H - 90, 'rgba(139,92,255,.16)');

        /* enemies */
        foes.forEach(function (f) {
          var yy = f.y + Math.sin(f.t * 3) * 3;
          if (f.hit > 0) {
            ctx.save(); ctx.globalAlpha = f.hit;
            ctx.fillStyle = '#ffffff';
            ctx.beginPath(); ctx.arc(f.x, yy, f.r + 6, 0, 6.283); ctx.fill();
            ctx.restore();
          }
          ctx.save();
          ctx.shadowColor = f.hp > 1 ? '#ff2fb9' : '#8b5cff'; ctx.shadowBlur = 14;
          ctx.font = '30px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.fillText(f.hp > 1 ? '👾' : '🛸', f.x, yy);
          ctx.restore();
        });

        /* bombs */
        bombs.forEach(function (b) {
          FX.glow(ctx, '#ff4d6d', 12, function () {
            ctx.fillStyle = '#ff4d6d';
            FX.rr(ctx, b.x - 3, b.y, 6, 14, 3); ctx.fill();
          });
        });

        /* bullets */
        bullets.forEach(function (b) {
          FX.glow(ctx, '#ffd93d', 16, function () {
            var g = ctx.createLinearGradient(0, b.y - 16, 0, b.y + 6);
            g.addColorStop(0, 'rgba(255,217,61,0)'); g.addColorStop(1, '#fff6c9');
            ctx.fillStyle = g;
            FX.rr(ctx, b.x - 2.5, b.y - 16, 5, 22, 2.5); ctx.fill();
          });
        });

        /* ship */
        if (!(ship.inv > 0 && Math.floor(t * 14) % 2)) {
          ctx.save(); ctx.translate(ship.x, ship.y);
          var flame = 12 + Math.sin(t * 30) * 5;
          var fg = ctx.createLinearGradient(0, 14, 0, 14 + flame);
          fg.addColorStop(0, '#ffd93d'); fg.addColorStop(1, 'rgba(255,47,185,0)');
          ctx.fillStyle = fg;
          ctx.beginPath(); ctx.moveTo(-7, 13); ctx.lineTo(7, 13); ctx.lineTo(0, 13 + flame); ctx.fill();
          FX.glow(ctx, '#00e5ff', 18, function () {
            var g2 = ctx.createLinearGradient(0, -18, 0, 14);
            g2.addColorStop(0, '#bff6ff'); g2.addColorStop(1, '#0090b8');
            ctx.fillStyle = g2;
            ctx.beginPath();
            ctx.moveTo(0, -19); ctx.lineTo(-17, 14); ctx.lineTo(-6, 9);
            ctx.lineTo(6, 9); ctx.lineTo(17, 14); ctx.closePath(); ctx.fill();
          });
          ctx.fillStyle = '#ffd93d';
          ctx.beginPath(); ctx.arc(0, -4, 3.4, 0, 6.283); ctx.fill();
          ctx.restore();
        }

        parts.update(dt); parts.draw(ctx);
        floats.update(dt); floats.draw(ctx);

        if (hurt > 0) {
          ctx.fillStyle = 'rgba(255,60,90,' + hurt * .3 + ')';
          ctx.fillRect(0, 0, W, H);
        }
        FX.vignette(ctx, W, H, .55);
        FX.scanlines(ctx, W, H, .07);
        ctx.restore(); ctx.restore();

        wrap.querySelector('[data-score]').textContent = score;
        wrap.querySelector('[data-wave]').textContent = wave;
        wrap.querySelector('[data-lives]').textContent = '♥'.repeat(Math.max(0, lives)) || '—';
        wrap.querySelector('[data-foes]').textContent = foes.length;
      });
    }
  });

  /* =========================================================
     FLAPPY CUBE
     ========================================================= */
  Arcade.register({
    id: 'flappy', name: 'Flappy Cube', emoji: '🟪', tag: 'Action',
    colors: ['#c77dff', '#39ff88'], unit: 'pipes',
    desc: 'One button, infinite frustration. Thread the neon pipes.',
    help: '<kbd>Space</kbd> / click to flap',
    mount: function (root, api) {
      var W = 480, H = 560;
      var wrap = api.h('<div class="gwrap"><div class="rel"><canvas width="' + W + '" height="' + H + '"></canvas></div>' +
        '<div class="gpanel"><div><h4>Pipes</h4><div class="big" data-s>0</div></div>' +
        '<div class="row"><span>Best</span><b data-b>—</b></div>' +
        '<div class="row"><span>Speed</span><b data-sp>1.0x</b></div></div></div>');
      root.appendChild(wrap);
      var cv = wrap.querySelector('canvas'), ctx = FX.dpr(cv);
      var parts = FX.particles(), shake = FX.shake(), trail = FX.trail(14);
      var bird, pipes, score, dead, started, t, rot, city;

      function makeCity() {
        city = [[], []];
        for (var l = 0; l < 2; l++) {
          var x = 0;
          while (x < W + 120) {
            var w = 30 + Math.random() * 46;
            city[l].push({ x: x, w: w, h: (l ? 60 : 110) + Math.random() * (l ? 60 : 90) });
            x += w + 6;
          }
        }
      }
      function reset() {
        bird = { y: H / 2, v: 0, x: 120, s: 24 };
        pipes = []; score = 0; dead = false; started = false; t = 0; rot = 0;
        trail.clear(); parts.clear(); makeCity();
        wrap.querySelector('[data-b]').textContent = api.best() === undefined ? '—' : api.best();
      }
      function flap() {
        if (dead) return;
        started = true; bird.v = -310;
        parts.burst(bird.x - 8, bird.y + 10, 8, { colors: ['#ffd93d', '#ffffff'], speed: 120, life: .35, angle: 1.9, spread: 1.2 });
        api.beep(620, .05);
      }
      function die() {
        if (dead) return;
        dead = true;
        shake.add(1);
        parts.burst(bird.x, bird.y, 30, { colors: ['#ffd93d', '#ff4d6d', '#ffffff'], speed: 240, life: .8, size: 4, square: true, gravity: 400 });
        api.beep(130, .3, 'sawtooth');
        api.score(score);
        var ov = api.h('<div class="gover"><div><h3>CRASH</h3><p>' + score + ' pipes cleared' +
          '</p><button class="btn btn-primary">Flap again</button></div></div>');
        ov.querySelector('button').onclick = function () { ov.remove(); reset(); };
        wrap.querySelector('.rel').appendChild(ov);
      }
      api.on(window, 'keydown', function (e) { if (e.key === ' ') { e.preventDefault(); flap(); } });
      api.on(cv, 'mousedown', flap);
      reset();
      api.loop(function (dt) {
        t += dt; shake.update(dt);
        var speed = 170 + score * 3;
        if (started && !dead) {
          bird.v += 980 * dt;
          bird.y += bird.v * dt;
          if (pipes.length === 0 || pipes[pipes.length - 1].x < W - 210) {
            var gap = Math.max(122, 180 - score * 2);
            var top = 60 + Math.random() * (H - gap - 170);
            pipes.push({ x: W + 40, top: top, gap: gap, passed: false });
          }
          pipes.forEach(function (p) {
            p.x -= speed * dt;
            if (!p.passed && p.x + 30 < bird.x) {
              p.passed = true; score++;
              parts.burst(p.x + 30, p.top + p.gap / 2, 10, { color: '#39ff88', speed: 150, life: .4 });
              api.beep(880, .07);
            }
            var inX = bird.x + bird.s / 2 > p.x - 30 && bird.x - bird.s / 2 < p.x + 30;
            if (inX && (bird.y - bird.s / 2 < p.top || bird.y + bird.s / 2 > p.top + p.gap)) die();
          });
          pipes = pipes.filter(function (p) { return p.x > -60; });
          if (bird.y > H - 42 || bird.y < 0) die();
          trail.push(bird.x - 6, bird.y);
        }
        rot = FX.approach(rot, FX.clamp(bird.v / 420, -.5, 1.25), 12, dt);

        ctx.save(); FX.reset(ctx); ctx.save(); shake.apply(ctx);
        FX.bg(ctx, W, H, '#12093a', '#320e46');
        FX.glow(ctx, '#ffe9c4', 46, function () {
          ctx.fillStyle = '#ffeccb';
          ctx.beginPath(); ctx.arc(W - 80, 84, 30, 0, 6.283); ctx.fill();
        });
        /* parallax skyline */
        [[0, '#1a1040', .18], [1, '#241650', .42]].forEach(function (L) {
          var off = (t * 14 * (L[2] * 3)) % (W + 120);
          ctx.fillStyle = L[1];
          city[L[0]].forEach(function (b) {
            var x = b.x - off;
            if (x < -b.w) x += W + 120;
            ctx.fillRect(x, H - 42 - b.h, b.w, b.h);
            ctx.fillStyle = 'rgba(255,217,61,.10)';
            for (var wy = 0; wy < b.h - 14; wy += 14) {
              for (var wx = 4; wx < b.w - 6; wx += 12) {
                if ((wx + wy + b.w) % 5 < 2) ctx.fillRect(x + wx, H - 42 - b.h + wy + 6, 5, 6);
              }
            }
            ctx.fillStyle = L[1];
          });
        });

        pipes.forEach(function (p) {
          [[0, p.top], [p.top + p.gap, H - p.top - p.gap]].forEach(function (seg, si) {
            var y = seg[0], h = seg[1];
            var g = ctx.createLinearGradient(p.x - 30, 0, p.x + 30, 0);
            g.addColorStop(0, '#5a2fb0'); g.addColorStop(.4, '#8b5cff');
            g.addColorStop(.62, '#39ff88'); g.addColorStop(1, '#1f8a52');
            ctx.fillStyle = g;
            ctx.fillRect(p.x - 30, y, 60, h);
            /* cap */
            FX.glow(ctx, '#39ff88', 16, function () {
              ctx.fillStyle = '#7ef0b0';
              FX.rr(ctx, p.x - 36, si === 0 ? y + h - 18 : y, 72, 18, 5); ctx.fill();
            });
            ctx.fillStyle = 'rgba(255,255,255,.14)';
            ctx.fillRect(p.x - 24, y, 6, h);
          });
        });

        /* ground */
        var gg = ctx.createLinearGradient(0, H - 42, 0, H);
        gg.addColorStop(0, '#241650'); gg.addColorStop(1, '#0d0722');
        ctx.fillStyle = gg; ctx.fillRect(0, H - 42, W, 42);
        ctx.strokeStyle = 'rgba(57,255,136,.35)'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(0, H - 42); ctx.lineTo(W, H - 42); ctx.stroke();
        for (var i = 0; i < 12; i++) {
          var gx = ((i * 60) - (t * (started && !dead ? speed : 0)) % 60);
          ctx.strokeStyle = 'rgba(139,92,255,.35)';
          ctx.beginPath(); ctx.moveTo(gx, H - 42); ctx.lineTo(gx - 18, H); ctx.stroke();
        }

        trail.draw(ctx, '#ffd93d', 10);

        ctx.save(); ctx.translate(bird.x, bird.y); ctx.rotate(rot);
        FX.glow(ctx, '#ffd93d', 20, function () {
          var bg = ctx.createLinearGradient(-12, -12, 12, 12);
          bg.addColorStop(0, '#fff3b0'); bg.addColorStop(1, '#ffb800');
          ctx.fillStyle = bg;
          FX.rr(ctx, -bird.s / 2, -bird.s / 2, bird.s, bird.s, 7); ctx.fill();
        });
        ctx.fillStyle = '#0a0a1e';
        ctx.beginPath(); ctx.arc(5, -5, 3.2, 0, 6.283); ctx.fill();
        ctx.fillStyle = '#ff9f1c';
        ctx.beginPath(); ctx.moveTo(10, 2); ctx.lineTo(18, 5); ctx.lineTo(10, 8); ctx.fill();
        /* wing */
        ctx.fillStyle = 'rgba(255,255,255,.75)';
        var wf = Math.sin(t * 16) * 4;
        ctx.beginPath();
        ctx.ellipse(-3, 2 + wf * .4, 7, 4 + wf * .3, -.3, 0, 6.283); ctx.fill();
        ctx.restore();

        parts.update(dt); parts.draw(ctx);

        FX.text(ctx, score, W / 2, 76, { size: 46, glow: '#39ff88', color: '#ffffff' });
        if (!started) {
          FX.text(ctx, 'press SPACE to flap', W / 2, H / 2 + 110,
            { size: 15, color: '#c7c7ee', weight: 600, alpha: .55 + Math.sin(t * 4) * .35 });
        }
        FX.vignette(ctx, W, H, .5);
        ctx.restore(); ctx.restore();

        wrap.querySelector('[data-s]').textContent = score;
        wrap.querySelector('[data-sp]').textContent = (speed / 170).toFixed(1) + 'x';
      });
    }
  });

  /* =========================================================
     WHACK-A-MOLE
     ========================================================= */
  Arcade.register({
    id: 'whack', name: 'Whack-a-Mole', emoji: '🔨', tag: 'Action',
    colors: ['#ff9f1c', '#39ff88'], unit: 'pts',
    desc: 'Thirty seconds. Hit moles, dodge bombs, do not miss.',
    help: 'Click the moles · bombs cost you 50 points',
    mount: function (root, api) {
      var holes = [], score = 0, time = 30, over = false, streak = 0;
      var wrap = api.h('<div class="gwrap"><div class="rel"><div data-g style="display:grid;' +
        'grid-template-columns:repeat(3,124px);gap:16px;padding:16px;background:#160f22;' +
        'border-radius:20px;border:1px solid var(--line);box-shadow:0 20px 60px rgba(0,0,0,.55)"></div></div>' +
        '<div class="gpanel"><div><h4>Score</h4><div class="big" data-s>0</div></div>' +
        '<div class="row"><span>Time</span><b data-t>30</b></div>' +
        '<div class="row"><span>Streak</span><b data-k>0</b></div>' +
        '<div style="height:8px;background:rgba(255,255,255,.08);border-radius:4px;overflow:hidden">' +
          '<div data-bar style="height:100%;width:100%;background:linear-gradient(90deg,#39ff88,#ffd93d,#ff4d6d)"></div>' +
        '</div></div></div>');
      root.appendChild(wrap);
      var gEl = wrap.querySelector('[data-g]');

      function pop(el, txt, color) {
        var f = document.createElement('div');
        f.className = 'fx-float';
        f.textContent = txt; f.style.color = color;
        f.style.left = '50%'; f.style.top = '20%'; f.style.transform = 'translateX(-50%)';
        el.appendChild(f);
        setTimeout(function () { f.remove(); }, 820);
      }
      for (var i = 0; i < 9; i++) {
        (function (i) {
          var d = document.createElement('div');
          d.className = 'mole-hole';
          d.style.cssText += 'width:124px;height:124px;border-radius:50%;cursor:pointer;';
          d.innerHTML = '<div class="mole"></div>' +
            '<div style="position:absolute;left:12%;right:12%;bottom:6px;height:16px;border-radius:50%;' +
            'background:rgba(0,0,0,.55);filter:blur(3px)"></div>';
          var moleEl = d.querySelector('.mole');
          d.onclick = function () {
            if (over) return;
            var h = holes[i];
            if (!h.up) {
              score = Math.max(0, score - 10); streak = 0;
              pop(d, '-10', '#ff4d6d');
              api.beep(180, .06);
              return paint();
            }
            if (h.kind === 'bomb') {
              score = Math.max(0, score - 50); streak = 0;
              pop(d, '-50 💥', '#ff4d6d');
              api.beep(110, .3, 'sawtooth');
              d.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.12)' }, { transform: 'scale(1)' }], { duration: 260 });
            } else {
              streak++;
              var gain = (h.kind === 'gold' ? 60 : 25) + streak * 3;
              score += gain;
              pop(d, '+' + gain, h.kind === 'gold' ? '#ffd93d' : '#39ff88');
              api.beep(700 + streak * 24, .07);
            }
            h.up = false;
            moleEl.classList.remove('up');
            paint();
          };
          gEl.appendChild(d);
          holes.push({ el: d, mole: moleEl, up: false, kind: 'mole', until: 0 });
        })(i);
      }
      function paint() {
        holes.forEach(function (h) {
          h.mole.textContent = h.kind === 'bomb' ? '💣' : h.kind === 'gold' ? '🐹' : '🦫';
          h.mole.classList.toggle('up', h.up);
        });
        wrap.querySelector('[data-s]').textContent = score;
        wrap.querySelector('[data-t]').textContent = time;
        wrap.querySelector('[data-k]').textContent = streak;
        wrap.querySelector('[data-bar]').style.width = (time / 30 * 100) + '%';
      }
      api.interval(function () {
        if (over) return;
        var free = holes.filter(function (h) { return !h.up; });
        if (free.length) {
          var h = free[(Math.random() * free.length) | 0];
          h.kind = Math.random() < .16 ? 'bomb' : Math.random() < .2 ? 'gold' : 'mole';
          h.up = true;
          h.until = Date.now() + 620 + Math.random() * 700 - (30 - time) * 12;
        }
        paint();
      }, 420);
      api.interval(function () {
        var changed = false;
        holes.forEach(function (h) { if (h.up && Date.now() > h.until) { h.up = false; changed = true; } });
        if (changed) paint();
      }, 90);
      api.interval(function () {
        if (over) return;
        time--;
        if (time <= 0) {
          over = true;
          holes.forEach(function (h) { h.up = false; });
          api.score(score);
          var ov = api.h('<div class="gover"><div><h3>TIME UP</h3><p>' + score +
            ' points</p><button class="btn btn-primary">Again</button></div></div>');
          ov.querySelector('button').onclick = api.restart;
          wrap.querySelector('.rel').appendChild(ov);
        }
        paint();
      }, 1000);
      paint();
    }
  });
})();
