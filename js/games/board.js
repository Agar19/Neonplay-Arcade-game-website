/* ============================================================
   BOARD GAMES — Chess (full rules + AI), Connect Four
   ============================================================ */
(function () {
  'use strict';

  /* =========================================================
     CHESS
     ========================================================= */
  var GLYPH = { K:'♔',Q:'♕',R:'♖',B:'♗',N:'♘',P:'♙',
                k:'♚',q:'♛',r:'♜',b:'♝',n:'♞',p:'♟' };
  var VALUE = { p:100, n:320, b:330, r:500, q:900, k:20000 };
  var PST_P = [0,0,0,0,0,0,0,0, 50,50,50,50,50,50,50,50, 10,10,20,30,30,20,10,10,
               5,5,10,25,25,10,5,5, 0,0,0,20,20,0,0,0, 5,-5,-10,0,0,-10,-5,5,
               5,10,10,-20,-20,10,10,5, 0,0,0,0,0,0,0,0];
  var PST_N = [-50,-40,-30,-30,-30,-30,-40,-50, -40,-20,0,0,0,0,-20,-40,
               -30,0,10,15,15,10,0,-30, -30,5,15,20,20,15,5,-30,
               -30,0,15,20,20,15,0,-30, -30,5,10,15,15,10,5,-30,
               -40,-20,0,5,5,0,-20,-40, -50,-40,-30,-30,-30,-30,-40,-50];

  function isWhite(p) { return p && p === p.toUpperCase(); }
  function sideOf(p) { return !p ? null : (isWhite(p) ? 'w' : 'b'); }

  function startState() {
    var b = new Array(64).fill('');
    var back = 'rnbqkbnr';
    for (var c = 0; c < 8; c++) {
      b[c] = back[c];
      b[8 + c] = 'p';
      b[48 + c] = 'P';
      b[56 + c] = back[c].toUpperCase();
    }
    return { b: b, turn: 'w', castle: { K:1, Q:1, k:1, q:1 }, ep: -1, half: 0 };
  }

  var N_OFF = [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]];
  var B_OFF = [[-1,-1],[-1,1],[1,-1],[1,1]];
  var R_OFF = [[-1,0],[1,0],[0,-1],[0,1]];
  var K_OFF = B_OFF.concat(R_OFF);

  function rc(i) { return [(i / 8) | 0, i % 8]; }
  function inB(r, c) { return r >= 0 && r < 8 && c >= 0 && c < 8; }

  function isAttacked(b, sq, by) {
    var p = rc(sq), r = p[0], c = p[1], i, d, nr, nc, t;
    /* knights */
    for (i = 0; i < 8; i++) {
      nr = r + N_OFF[i][0]; nc = c + N_OFF[i][1];
      if (inB(nr, nc)) { t = b[nr * 8 + nc]; if (t && sideOf(t) === by && t.toLowerCase() === 'n') return true; }
    }
    /* pawns */
    var pr = by === 'w' ? r + 1 : r - 1;
    for (i = -1; i <= 1; i += 2) {
      if (inB(pr, c + i)) { t = b[pr * 8 + c + i]; if (t && sideOf(t) === by && t.toLowerCase() === 'p') return true; }
    }
    /* king */
    for (i = 0; i < 8; i++) {
      nr = r + K_OFF[i][0]; nc = c + K_OFF[i][1];
      if (inB(nr, nc)) { t = b[nr * 8 + nc]; if (t && sideOf(t) === by && t.toLowerCase() === 'k') return true; }
    }
    /* sliders */
    function ray(offs, kinds) {
      for (var o = 0; o < offs.length; o++) {
        nr = r + offs[o][0]; nc = c + offs[o][1];
        while (inB(nr, nc)) {
          var q = b[nr * 8 + nc];
          if (q) {
            if (sideOf(q) === by && kinds.indexOf(q.toLowerCase()) >= 0) return true;
            break;
          }
          nr += offs[o][0]; nc += offs[o][1];
        }
      }
      return false;
    }
    return ray(B_OFF, ['b','q']) || ray(R_OFF, ['r','q']);
  }

  function kingSq(b, side) {
    var want = side === 'w' ? 'K' : 'k';
    for (var i = 0; i < 64; i++) if (b[i] === want) return i;
    return -1;
  }
  function inCheck(st, side) {
    var k = kingSq(st.b, side);
    return k >= 0 && isAttacked(st.b, k, side === 'w' ? 'b' : 'w');
  }

  function pseudo(st) {
    var side = st.turn, b = st.b, out = [];
    function push(from, to, extra) {
      var m = { from: from, to: to };
      if (extra) for (var k in extra) m[k] = extra[k];
      out.push(m);
    }
    for (var i = 0; i < 64; i++) {
      var p = b[i];
      if (!p || sideOf(p) !== side) continue;
      var pos = rc(i), r = pos[0], c = pos[1], t = p.toLowerCase(), j, nr, nc, tg;

      if (t === 'p') {
        var dir = side === 'w' ? -1 : 1;
        var last = side === 'w' ? 0 : 7;
        var startRow = side === 'w' ? 6 : 1;
        if (inB(r + dir, c) && !b[(r + dir) * 8 + c]) {
          if (r + dir === last) ['q','r','b','n'].forEach(function (pr) { push(i, (r + dir) * 8 + c, { promo: pr }); });
          else {
            push(i, (r + dir) * 8 + c);
            if (r === startRow && !b[(r + 2 * dir) * 8 + c]) push(i, (r + 2 * dir) * 8 + c, { dbl: 1 });
          }
        }
        for (j = -1; j <= 1; j += 2) {
          nr = r + dir; nc = c + j;
          if (!inB(nr, nc)) continue;
          tg = b[nr * 8 + nc];
          var to = nr * 8 + nc;
          if (tg && sideOf(tg) !== side) {
            if (nr === last) ['q','r','b','n'].forEach(function (pr) { push(i, to, { promo: pr }); });
            else push(i, to);
          } else if (to === st.ep) push(i, to, { epTake: 1 });
        }
      } else if (t === 'n' || t === 'k') {
        var offs = t === 'n' ? N_OFF : K_OFF;
        for (j = 0; j < offs.length; j++) {
          nr = r + offs[j][0]; nc = c + offs[j][1];
          if (!inB(nr, nc)) continue;
          tg = b[nr * 8 + nc];
          if (!tg || sideOf(tg) !== side) push(i, nr * 8 + nc);
        }
        if (t === 'k') {
          var home = side === 'w' ? 60 : 4;
          if (i === home && !inCheck(st, side)) {
            var kf = side === 'w' ? 'K' : 'k', qf = side === 'w' ? 'Q' : 'q';
            if (st.castle[kf] && !b[home + 1] && !b[home + 2] &&
                !isAttacked(b, home + 1, side === 'w' ? 'b' : 'w') &&
                !isAttacked(b, home + 2, side === 'w' ? 'b' : 'w')) push(i, home + 2, { castle: 'k' });
            if (st.castle[qf] && !b[home - 1] && !b[home - 2] && !b[home - 3] &&
                !isAttacked(b, home - 1, side === 'w' ? 'b' : 'w') &&
                !isAttacked(b, home - 2, side === 'w' ? 'b' : 'w')) push(i, home - 2, { castle: 'q' });
          }
        }
      } else {
        var dirs = t === 'b' ? B_OFF : t === 'r' ? R_OFF : K_OFF;
        for (j = 0; j < dirs.length; j++) {
          nr = r + dirs[j][0]; nc = c + dirs[j][1];
          while (inB(nr, nc)) {
            tg = b[nr * 8 + nc];
            if (!tg) push(i, nr * 8 + nc);
            else { if (sideOf(tg) !== side) push(i, nr * 8 + nc); break; }
            nr += dirs[j][0]; nc += dirs[j][1];
          }
        }
      }
    }
    return out;
  }

  function apply(st, m) {
    var b = st.b.slice();
    var p = b[m.from];
    var castle = { K: st.castle.K, Q: st.castle.Q, k: st.castle.k, q: st.castle.q };
    var side = st.turn;
    var ep = -1;

    b[m.to] = m.promo ? (side === 'w' ? m.promo.toUpperCase() : m.promo) : p;
    b[m.from] = '';

    if (m.epTake) b[m.to + (side === 'w' ? 8 : -8)] = '';
    if (m.dbl) ep = m.to + (side === 'w' ? 8 : -8);
    if (m.castle === 'k') { b[m.to - 1] = b[m.to + 1]; b[m.to + 1] = ''; }
    if (m.castle === 'q') { b[m.to + 1] = b[m.to - 2]; b[m.to - 2] = ''; }

    if (p === 'K') { castle.K = castle.Q = 0; }
    if (p === 'k') { castle.k = castle.q = 0; }
    if (m.from === 63 || m.to === 63) castle.K = 0;
    if (m.from === 56 || m.to === 56) castle.Q = 0;
    if (m.from === 7 || m.to === 7) castle.k = 0;
    if (m.from === 0 || m.to === 0) castle.q = 0;

    return { b: b, turn: side === 'w' ? 'b' : 'w', castle: castle, ep: ep,
             half: (p.toLowerCase() === 'p' || st.b[m.to]) ? 0 : st.half + 1 };
  }

  function legalMoves(st) {
    return pseudo(st).filter(function (m) {
      var ns = apply(st, m);
      return !inCheck({ b: ns.b }, st.turn);
    });
  }

  function evaluate(st) {
    var s = 0;
    for (var i = 0; i < 64; i++) {
      var p = st.b[i];
      if (!p) continue;
      var t = p.toLowerCase(), w = isWhite(p);
      var v = VALUE[t];
      if (t === 'p') v += PST_P[w ? i : 63 - i];
      if (t === 'n') v += PST_N[w ? i : 63 - i];
      s += w ? v : -v;
    }
    return st.turn === 'w' ? s : -s;
  }

  function search(st, depth, alpha, beta) {
    if (depth === 0) return evaluate(st);
    var ms = legalMoves(st);
    if (!ms.length) return inCheck(st, st.turn) ? -99999 + (4 - depth) : 0;
    ms.sort(function (a, b2) { return (st.b[b2.to] ? 1 : 0) - (st.b[a.to] ? 1 : 0); });
    for (var i = 0; i < ms.length; i++) {
      var sc = -search(apply(st, ms[i]), depth - 1, -beta, -alpha);
      if (sc >= beta) return beta;
      if (sc > alpha) alpha = sc;
    }
    return alpha;
  }
  function bestMove(st, depth) {
    var ms = legalMoves(st);
    if (!ms.length) return null;
    ms.sort(function (a, b2) { return (st.b[b2.to] ? 1 : 0) - (st.b[a.to] ? 1 : 0); });
    var best = null, bs = -1e9;
    for (var i = 0; i < ms.length; i++) {
      var sc = -search(apply(st, ms[i]), depth - 1, -1e9, 1e9);
      sc += Math.random() * 6; // tiny jitter so it isn't identical every game
      if (sc > bs) { bs = sc; best = ms[i]; }
    }
    return best;
  }

  Arcade.register({
    id: 'chess', name: 'Chess', emoji: '♟️', tag: 'Board',
    colors: ['#e8e8ff', '#8b5cff'], unit: 'wins',
    desc: 'Full rules — castling, en passant, promotion — vs CPU or a friend.',
    help: 'Click a piece, then a highlighted square · <kbd>U</kbd> undoes a move',
    mount: function (root, api) {
      var st = startState(), sel = -1, moves = [], history = [], mode = 'cpu',
          depth = 3, over = false, thinking = false, flip = false,
          lastMove = null, anim = null, taken = { w: [], b: [] };

      var wrap = api.h('<div class="gwrap"><div class="rel">' +
        '<div data-taken="b" style="height:26px;font-size:19px;letter-spacing:2px;color:#9a9ac4;margin-bottom:4px"></div>' +
        '<div data-board style="display:grid;' +
        'grid-template-columns:repeat(8,60px);grid-template-rows:repeat(8,60px);border-radius:12px;' +
        'overflow:hidden;border:2px solid rgba(255,255,255,.22);box-shadow:0 22px 60px rgba(0,0,0,.55)"></div>' +
        '<div data-taken="w" style="height:26px;font-size:19px;letter-spacing:2px;color:#9a9ac4;margin-top:4px"></div></div>' +
        '<div class="gpanel" style="min-width:210px">' +
          '<div><h4>Status</h4><div data-status style="font-size:15px;font-weight:700">White to move</div></div>' +
          '<div class="seg" data-mode><button class="on" data-v="cpu">vs CPU</button><button data-v="2p">2 players</button></div>' +
          '<div class="seg" data-depth><button data-v="2">Easy</button><button class="on" data-v="3">Normal</button><button data-v="4">Hard</button></div>' +
          '<div><h4>Moves</h4><div data-log style="max-height:210px;overflow:auto;font-size:12px;' +
            'line-height:1.7;color:var(--dim);font-family:ui-monospace,Consolas,monospace"></div></div>' +
          '<div class="seg"><button data-undo>Undo</button><button data-flip>Flip</button><button data-new>New</button></div>' +
        '</div></div>');
      root.appendChild(wrap);
      var bEl = wrap.querySelector('[data-board]');

      function sqName(i) { return 'abcdefgh'[i % 8] + (8 - ((i / 8) | 0)); }

      function paint() {
        bEl.innerHTML = '';
        var chkNow = inCheck(st, st.turn);
        var kSq = chkNow ? kingSq(st.b, st.turn) : -1;
        for (var v = 0; v < 64; v++) {
          var i = flip ? 63 - v : v;
          var p = rc(i), dark = (p[0] + p[1]) % 2 === 1;
          var d = document.createElement('div');
          var isTarget = moves.some(function (m) { return m.to === i; });
          var isLast = lastMove && (lastMove.from === i || lastMove.to === i);
          var base = dark ? '#26264d' : '#3d3d68';
          d.className = 'chess-sq';
          d.style.cssText = 'display:grid;place-items:center;font-size:44px;cursor:pointer;user-select:none;' +
            'position:relative;line-height:1;' +
            'background:' + (i === sel ? 'linear-gradient(160deg,#a476ff,#7b45ff)'
                            : isLast ? (dark ? '#4a4520' : '#5f5a2c') : base) + ';';
          if (i === kSq) {
            d.style.background = 'radial-gradient(circle,#ff4d6d 12%,' + base + ' 72%)';
          }
          if (st.b[i]) {
            var sp = document.createElement('span');
            sp.className = 'chess-piece';
            sp.textContent = GLYPH[st.b[i]];
            sp.style.cssText = 'pointer-events:none;display:block;' +
              'color:' + (isWhite(st.b[i]) ? '#ffffff' : '#0b0b16') + ';' +
              'filter:drop-shadow(0 2px 4px rgba(0,0,0,' + (isWhite(st.b[i]) ? '.65' : '.45') + '))';
            d.appendChild(sp);
            /* slide the piece that just moved in from its old square */
            if (anim && anim.to === i) {
              var fp = rc(anim.from), tp = rc(anim.to), sgn = flip ? -1 : 1;
              var dx = (fp[1] - tp[1]) * 60 * sgn, dy = (fp[0] - tp[0]) * 60 * sgn;
              sp.animate([{ transform: 'translate(' + dx + 'px,' + dy + 'px)' }, { transform: 'none' }],
                         { duration: 190, easing: 'cubic-bezier(.3,.9,.4,1)' });
            }
          }
          /* file / rank labels along the edges */
          if (p[1] === (flip ? 7 : 0) || p[0] === (flip ? 0 : 7)) {
            var lab = document.createElement('span');
            lab.style.cssText = 'position:absolute;font-size:9px;font-weight:800;opacity:.45;pointer-events:none;' +
              'color:#e8e8ff;' + (p[0] === (flip ? 0 : 7) ? 'bottom:2px;right:4px' : 'top:2px;left:4px');
            lab.textContent = p[0] === (flip ? 0 : 7) ? 'abcdefgh'[p[1]] : (8 - p[0]);
            d.appendChild(lab);
          }
          if (isTarget) {
            var dot = document.createElement('span');
            dot.style.cssText = 'position:absolute;inset:0;pointer-events:none;animation:popIn .16s ease-out;' +
              (st.b[i] ? 'border:4px solid rgba(57,255,136,.85);border-radius:6px;box-shadow:inset 0 0 18px rgba(57,255,136,.4)'
                       : 'background:radial-gradient(circle,rgba(57,255,136,.9) 15%,transparent 17%)');
            d.appendChild(dot);
          }
          (function (i) { d.onclick = function () { click(i); }; })(i);
          bEl.appendChild(d);
        }
        anim = null;
        wrap.querySelector('[data-taken="w"]').textContent = taken.w.map(function (c) { return GLYPH[c]; }).join('');
        wrap.querySelector('[data-taken="b"]').textContent = taken.b.map(function (c) { return GLYPH[c]; }).join('');
        var ms = legalMoves(st);
        var chk = inCheck(st, st.turn);
        var who = st.turn === 'w' ? 'White' : 'Black';
        var txt;
        if (!ms.length) {
          over = true;
          txt = chk ? (who === 'White' ? 'Black wins — checkmate' : 'White wins — checkmate') : 'Stalemate — draw';
          if (chk && mode === 'cpu' && st.turn === 'b') api.score((api.best() || 0) + 1);
        } else txt = who + ' to move' + (chk ? ' — CHECK' : '') + (thinking ? ' · CPU thinking…' : '');
        wrap.querySelector('[data-status]').textContent = txt;
        var log = wrap.querySelector('[data-log]');
        log.innerHTML = history.map(function (h, n) {
          return (n % 2 === 0 ? '<b style="color:var(--txt)">' + (n / 2 + 1) + '.</b> ' : '') + h.san;
        }).join(' ');
        log.scrollTop = log.scrollHeight;
      }

      function click(i) {
        if (over || thinking) return;
        if (mode === 'cpu' && st.turn === 'b') return;
        var m = moves.filter(function (x) { return x.to === i; })[0];
        if (m) return doMove(m);
        if (st.b[i] && sideOf(st.b[i]) === st.turn) {
          sel = i;
          moves = legalMoves(st).filter(function (x) { return x.from === i; });
        } else { sel = -1; moves = []; }
        paint();
      }

      function doMove(m) {
        var piece = st.b[m.from], capPiece = st.b[m.to], cap = capPiece || m.epTake;
        var san = (piece.toLowerCase() === 'p' ? '' : piece.toUpperCase()) +
                  (cap ? 'x' : '') + sqName(m.to) + (m.promo ? '=' + m.promo.toUpperCase() : '');
        if (m.castle) san = m.castle === 'k' ? 'O-O' : 'O-O-O';
        history.push({ st: st, san: san, taken: { w: taken.w.slice(), b: taken.b.slice() }, last: lastMove });
        if (capPiece) taken[isWhite(capPiece) ? 'w' : 'b'].push(capPiece);
        lastMove = { from: m.from, to: m.to };
        anim = lastMove;
        st = apply(st, m);
        sel = -1; moves = [];
        api.beep(cap ? 300 : 480, .06);
        if (cap) api.beep(180, .1, 'triangle', .04);
        paint();
        if (mode === 'cpu' && st.turn === 'b' && !over) {
          thinking = true; paint();
          api.timeout(function () {
            var mv = bestMove(st, depth);
            thinking = false;
            if (mv) doMove(mv); else paint();
          }, 60);
        }
      }

      wrap.querySelectorAll('[data-mode] button').forEach(function (b) {
        b.onclick = function () {
          wrap.querySelectorAll('[data-mode] button').forEach(function (x) { x.classList.remove('on'); });
          b.classList.add('on'); mode = b.dataset.v;
        };
      });
      wrap.querySelectorAll('[data-depth] button').forEach(function (b) {
        b.onclick = function () {
          wrap.querySelectorAll('[data-depth] button').forEach(function (x) { x.classList.remove('on'); });
          b.classList.add('on'); depth = +b.dataset.v;
        };
      });
      wrap.querySelector('[data-undo]').onclick = function () {
        if (thinking || !history.length) return;
        var back = mode === 'cpu' ? 2 : 1;
        while (back-- && history.length) {
          var h = history.pop();
          st = h.st; taken = h.taken; lastMove = h.last;
        }
        over = false; sel = -1; moves = []; paint();
      };
      wrap.querySelector('[data-flip]').onclick = function () { flip = !flip; paint(); };
      wrap.querySelector('[data-new]').onclick = function () {
        st = startState(); history = []; sel = -1; moves = []; over = false;
        lastMove = null; taken = { w: [], b: [] };
        paint();
      };
      api.on(window, 'keydown', function (e) {
        if (e.key === 'u' || e.key === 'U') wrap.querySelector('[data-undo]').click();
      });
      paint();
    }
  });

  /* =========================================================
     CONNECT FOUR
     ========================================================= */
  Arcade.register({
    id: 'connect4', name: 'Connect Four', emoji: '🔴', tag: 'Board',
    colors: ['#ffd93d', '#ff4d6d'], unit: 'wins',
    desc: 'Drop discs, block the CPU, line up four in any direction.',
    help: 'Click a column (or press <kbd>1</kbd>–<kbd>7</kbd>) to drop your disc',
    mount: function (root, api) {
      var W = 7, H = 6, g, turn, over, mode = 'cpu', busy = false,
          lastDrop = -1, win = null, hoverCol = -1;

      var wrap = api.h('<div class="gwrap"><div class="rel"><div data-b style="display:grid;' +
        'grid-template-columns:repeat(7,64px);gap:8px;background:#1a1a3d;padding:12px;border-radius:16px;' +
        'border:1px solid var(--line)"></div></div>' +
        '<div class="gpanel"><div><h4>Turn</h4><div class="big" data-turn>🟡</div></div>' +
        '<div class="seg" data-mode><button class="on" data-v="cpu">vs CPU</button><button data-v="2p">2 players</button></div>' +
        '<button class="btn btn-mini" data-new>New game</button></div></div>');
      root.appendChild(wrap);
      var bEl = wrap.querySelector('[data-b]');

      function reset() {
        g = new Array(W * H).fill(0);
        turn = 1; over = false; busy = false; lastDrop = -1; win = null; hoverCol = -1;
        paint();
      }
      function drop(col, who, board) {
        for (var r = H - 1; r >= 0; r--) if (!board[r * W + col]) { board[r * W + col] = who; return r; }
        return -1;
      }
      function winner(board) {
        var dirs = [[0,1],[1,0],[1,1],[1,-1]];
        for (var r = 0; r < H; r++) for (var c = 0; c < W; c++) {
          var v = board[r * W + c];
          if (!v) continue;
          for (var d = 0; d < 4; d++) {
            var n = 1;
            while (n < 4) {
              var nr = r + dirs[d][0] * n, nc = c + dirs[d][1] * n;
              if (nr < 0 || nc < 0 || nr >= H || nc >= W || board[nr * W + nc] !== v) break;
              n++;
            }
            if (n === 4) return v;
          }
        }
        return 0;
      }
      function full(board) { for (var c = 0; c < W; c++) if (!board[c]) return false; return true; }

      function minimax(board, depth, who, alpha, beta) {
        var w = winner(board);
        if (w === 2) return 1000 + depth;
        if (w === 1) return -1000 - depth;
        if (depth === 0 || full(board)) return score(board);
        var order = [3,2,4,1,5,0,6];
        if (who === 2) {
          var best = -1e9;
          for (var i = 0; i < 7; i++) {
            var c = order[i];
            if (board[c]) continue;
            var nb = board.slice(); drop(c, 2, nb);
            best = Math.max(best, minimax(nb, depth - 1, 1, alpha, beta));
            alpha = Math.max(alpha, best);
            if (alpha >= beta) break;
          }
          return best;
        } else {
          var worst = 1e9;
          for (var j = 0; j < 7; j++) {
            var c2 = order[j];
            if (board[c2]) continue;
            var nb2 = board.slice(); drop(c2, 1, nb2);
            worst = Math.min(worst, minimax(nb2, depth - 1, 2, alpha, beta));
            beta = Math.min(beta, worst);
            if (alpha >= beta) break;
          }
          return worst;
        }
      }
      function score(board) {
        var s = 0;
        for (var r = 0; r < H; r++) for (var c = 0; c < W; c++)
          if (board[r * W + c] === 2) s += 3 - Math.abs(3 - c);
          else if (board[r * W + c] === 1) s -= 3 - Math.abs(3 - c);
        return s;
      }
      function cpu() {
        var best = -1e9, pick = 3, order = [3,2,4,1,5,0,6];
        for (var i = 0; i < 7; i++) {
          var c = order[i];
          if (g[c]) continue;
          var nb = g.slice(); drop(c, 2, nb);
          var v = minimax(nb, 5, 1, -1e9, 1e9);
          if (v > best) { best = v; pick = c; }
        }
        play(pick);
      }
      function winCells(board) {
        var dirs = [[0,1],[1,0],[1,1],[1,-1]];
        for (var r = 0; r < H; r++) for (var c = 0; c < W; c++) {
          var v = board[r * W + c];
          if (!v) continue;
          for (var d = 0; d < 4; d++) {
            var cells = [r * W + c], n = 1;
            while (n < 4) {
              var nr = r + dirs[d][0] * n, nc = c + dirs[d][1] * n;
              if (nr < 0 || nc < 0 || nr >= H || nc >= W || board[nr * W + nc] !== v) break;
              cells.push(nr * W + nc); n++;
            }
            if (n === 4) return cells;
          }
        }
        return null;
      }
      function play(col) {
        if (over || g[col]) return;
        var row = drop(col, turn, g);
        lastDrop = row * W + col;
        api.beep(turn === 1 ? 520 : 380, .07);
        var w = winner(g);
        if (w) {
          over = true; win = winCells(g); paint();
          if (w === 1 && mode === 'cpu') api.score((api.best() || 0) + 1);
          finish(w === 1 ? 'YELLOW WINS' : (mode === 'cpu' ? 'CPU WINS' : 'RED WINS'));
          return;
        }
        if (full(g)) { over = true; paint(); finish('DRAW'); return; }
        turn = turn === 1 ? 2 : 1;
        paint();
        if (mode === 'cpu' && turn === 2) { busy = true; api.timeout(function () { busy = false; cpu(); }, 220); }
      }
      function finish(title) {
        var ov = api.h('<div class="gover"><div><h3>' + title + '</h3><p>&nbsp;</p>' +
          '<button class="btn btn-primary">Play again</button></div></div>');
        ov.querySelector('button').onclick = function () { ov.remove(); reset(); };
        wrap.querySelector('.rel').appendChild(ov);
      }
      function paint() {
        bEl.innerHTML = '';
        for (var i = 0; i < W * H; i++) {
          var v = g[i], col = i % W, row = (i / W) | 0;
          var d = document.createElement('div');
          var isWin = win && win.indexOf(i) >= 0;
          d.style.cssText = 'width:64px;height:64px;border-radius:50%;cursor:pointer;position:relative;' +
            'transition:box-shadow .18s, transform .18s;' +
            'background:' + (v === 1 ? 'radial-gradient(circle at 34% 28%,#fff6bf,#ffd93d 62%,#c9a300)' :
                             v === 2 ? 'radial-gradient(circle at 34% 28%,#ffb0bb,#ff4d6d 62%,#c1223c)' :
                             'radial-gradient(circle at 40% 34%,#0a0a1c,#111129)') + ';' +
            'box-shadow:' + (v ? 'inset 0 -5px 10px rgba(0,0,0,.4), 0 0 ' + (isWin ? '30px' : '14px') + ' ' +
                                 (v === 1 ? 'rgba(255,217,61,' + (isWin ? '.95' : '.32') + ')' : 'rgba(255,77,109,' + (isWin ? '.95' : '.32') + ')')
                               : 'inset 0 3px 8px rgba(0,0,0,.7)') + ';' +
            (isWin ? 'animation:glowPulse .7s ease-in-out infinite;transform:scale(1.06);' : '') +
            (col === hoverCol && !over ? 'outline:2px solid rgba(255,255,255,.16);outline-offset:-2px;' : '');
          if (v && i === lastDrop) {
            d.classList.add('c4-disc');
            d.style.setProperty('--drop', -(row + 1) * 72 + 'px');
          }
          (function (c) {
            d.onclick = function () { if (!busy && !(mode === 'cpu' && turn === 2)) play(c); };
            d.onmouseenter = function () { if (hoverCol !== c) { hoverCol = c; paint(); } };
          })(col);
          bEl.appendChild(d);
        }
        bEl.onmouseleave = function () { hoverCol = -1; paint(); };
        wrap.querySelector('[data-turn]').textContent = over ? '—' : (turn === 1 ? '🟡' : '🔴');
      }
      api.on(window, 'keydown', function (e) {
        if (/^[1-7]$/.test(e.key) && !busy && !(mode === 'cpu' && turn === 2)) play(+e.key - 1);
      });
      wrap.querySelectorAll('[data-mode] button').forEach(function (b) {
        b.onclick = function () {
          wrap.querySelectorAll('[data-mode] button').forEach(function (x) { x.classList.remove('on'); });
          b.classList.add('on'); mode = b.dataset.v; reset();
        };
      });
      wrap.querySelector('[data-new]').onclick = reset;
      reset();
    }
  });
})();
