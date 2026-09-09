/* ============================================================
   PUZZLES — Wordly, Sudoku, Minesweeper, Memory Match, Simon
   ============================================================ */
(function () {
  'use strict';

  /* =========================================================
     WORDLY (Wordle-style) — flip reveals, key states, shake
     ========================================================= */
  var WORDS = ('about above actor acute admit adopt after again agent agree ahead alarm album alert alike alive allow alone along alter amber among angel anger angle ankle apart apple apply arena argue arise armor aroma arrow aside asset audio audit avoid awake award aware badly baker basic basil batch beach beard beast begin being bench berry birth black blade blame blank blast blaze bleak blend bless blind block blood bloom blown blues blunt blush board boast bonus boost booth bound brain brake brand brave bread break breed brick bride brief bring brisk broad broke brook brown brush build built bunch burnt burst cabin cable candy canoe cargo carve catch cause chain chair chalk charm chart chase cheap cheat check cheer chess chest chief child chill choir chose chunk civic civil claim clash class clean clear clerk click cliff climb cling cloak clock close cloth cloud clown coach coast cocoa colon color comet comic coral couch cough could count court cover crack craft crane crash crate crawl crazy cream creek crest crime crisp cross crowd crown crude cruel crush crust curve cycle daily dairy dance dealt debut decay delay dense depth derby devil diary dirty ditch dizzy dodge doing donor doubt dozen draft drain drama drank dream dress dried drift drill drink drive drone drove drown drunk dryer dwell eager eagle early earth eight elbow elder elect elite email empty enemy enjoy enter entry equal equip error essay event every exact exile exist extra fable faint faith false fancy fatal fault favor feast fever fiber field fiery fifth fight final first flame flash fleet flesh flick fling float flock flood floor flour fluid flush focus foggy force forge forth forty forum found frame fraud fresh fried frost fruit fully funny gauge ghost giant given glass gleam globe glory glove going grace grade grain grand grant grape graph grasp grass grave great green greet grief grill grind groan groom group grove growl guard guess guest guide guilt habit handy happy harsh haste hatch haunt heart heavy hedge hello hence hobby honey honor horse hotel hound house human humor hurry ideal image imply index inner input irony issue ivory japan jeans jelly jewel joint jolly judge juice jumbo knife knock known label labor lance large laser later laugh layer learn lease least leave legal lemon level lever light limit linen liver lobby local lodge logic loose lorry lower loyal lucky lunar lunch lying macro magic major maker maple march match maybe mayor meant medal media mercy merge merit metal meter micro midst might minor minus mixed model moist money month moral motor mount mouse mouth movie music naive nasty naval nerve never newly night noble noise north notch novel nurse ocean offer often olive onion opera orbit order organ other otter ought ounce outer owner ozone paint panel panic paper party pasta patch pause peace peach pearl pedal penny perch peril petal phase phone photo piano piece pilot pinch pitch pixel pizza place plain plane plant plate plaza plead plumb point polar porch pound power press price pride prime print prior prize probe prone proof proud prove pulse punch pupil puppy purse quart queen query quest queue quick quiet quilt quite quota radar radio raise rally ranch range rapid ratio raven reach ready realm rebel refer reign relax relay renew reply rider ridge rifle right rigid rinse risky rival river roast robot rocky roman rough round route royal rugby ruler rumor rural sadly saint salad sally salon sandy sauce scale scarf scene scent scoop scope score scout scrap screw scrub sense serve seven shade shaft shake shall shape share shark sharp shear sheep sheet shelf shell shift shine shirt shock shoot shore short shout shown shrub sight silly since siren skate skill skirt skull slate sleep slice slide slope small smart smash smell smile smoke snack snake sneak sniff solar solid solve sorry sound south space spare spark speak spear speed spell spend spice spike spine spite split spoke spoon sport spray spread squad stack staff stage stain stair stake stamp stand stare start state steam steel steep steer stern stick stiff still sting stock stone stood stool store storm story stove strap straw strip stuck study stuff style sugar suite sunny super surge sweat sweep sweet swept swift swing sword table taken tally tango tasty teach teeth tempo tenor tense tenth thank theft their theme there these thick thief thing think third thorn those three threw throw thumb tiger tight timer times tired title toast today token tooth topic torch total touch tough towel tower toxic trace track trade trail train trait tramp trash treat trend trial tribe trick tried tries troop trout truck truly trunk trust truth tulip tumor tutor twice twist ultra uncle under union unite unity until upper upset urban usage usual vague valid value valve vapor vault venue verse video vigor villa vinyl viral virus visit vital vivid vocal voice voter wagon waist waste watch water weary weave wedge weigh weird whale wheat wheel where which while whirl white whole whose widen wider width windy witch witty woman world worry worse worst worth would wound woven wrist write wrong yacht yield young youth zebra').split(' ');

  Arcade.register({
    id: 'wordly', name: 'Wordly', emoji: '🔤', tag: 'Puzzles',
    colors: ['#39ff88', '#ffd93d'], unit: 'guesses', higher: false,
    desc: 'Six tries, one five-letter word. Green is right, yellow is close.',
    help: 'Type a five-letter word and press <kbd>Enter</kbd> · <kbd>Backspace</kbd> to fix',
    mount: function (root, api) {
      var answer = WORDS[(Math.random() * WORDS.length) | 0];
      var rows = 6, cur = '', done = false, guesses = [], busy = false;

      var wrap = api.h('<div style="display:flex;flex-direction:column;align-items:center;gap:20px">' +
        '<div class="rel"><div data-grid style="display:grid;grid-template-rows:repeat(6,58px);gap:7px"></div></div>' +
        '<div data-kb style="display:flex;flex-direction:column;gap:6px;align-items:center"></div></div>');
      root.appendChild(wrap);
      var grid = wrap.querySelector('[data-grid]'), kbEl = wrap.querySelector('[data-kb]');

      var tiles = [], rowEls = [];
      for (var r = 0; r < rows; r++) {
        var row = document.createElement('div');
        row.style.cssText = 'display:grid;grid-template-columns:repeat(5,58px);gap:7px';
        var t = [];
        for (var c = 0; c < 5; c++) {
          var d = document.createElement('div');
          d.className = 'wd-tile';
          row.appendChild(d); t.push(d);
        }
        grid.appendChild(row); tiles.push(t); rowEls.push(row);
      }

      var letterState = {};
      var ROWSK = ['qwertyuiop', 'asdfghjkl', 'ZxcvbnmB'];
      var RANK = { b: 1, y: 2, g: 3 };
      function drawKb() {
        kbEl.innerHTML = '';
        ROWSK.forEach(function (line) {
          var d = document.createElement('div');
          d.style.cssText = 'display:flex;gap:5px';
          line.split('').forEach(function (ch) {
            var b = document.createElement('button');
            var isEnter = ch === 'Z', isBack = ch === 'B';
            b.className = 'wd-key';
            b.textContent = isEnter ? 'ENTER' : isBack ? '⌫' : ch.toUpperCase();
            var st = letterState[ch];
            b.style.padding = '15px ' + (isEnter || isBack ? '15px' : '13px');
            if (st) {
              b.style.background = st === 'g' ? '#39ff88' : st === 'y' ? '#ffd93d' : '#20203d';
              b.style.color = st === 'b' ? '#8a8ab5' : '#0a0a1e';
            }
            b.onclick = function () { key(isEnter ? 'Enter' : isBack ? 'Backspace' : ch); };
            d.appendChild(b);
          });
          kbEl.appendChild(d);
        });
      }

      function paintCur() {
        var row = tiles[guesses.length];
        if (!row) return;
        for (var c = 0; c < 5; c++) {
          var had = row[c].textContent;
          row[c].textContent = cur[c] || '';
          row[c].style.borderColor = cur[c] ? 'rgba(255,255,255,.45)' : 'rgba(255,255,255,.14)';
          if (cur[c] && !had) {
            row[c].classList.remove('anim-pop'); void row[c].offsetWidth; row[c].classList.add('anim-pop');
          }
        }
      }
      function reveal(row, res, cb) {
        res.forEach(function (s, i) {
          setTimeout(function () {
            var el = row[i];
            el.animate([{ transform: 'rotateX(0deg)' }, { transform: 'rotateX(90deg)' },
                        { transform: 'rotateX(0deg)' }],
                       { duration: 460, easing: 'ease-in-out' });
            setTimeout(function () {
              el.style.background = s === 'g' ? '#39ff88' : s === 'y' ? '#ffd93d' : '#20203d';
              el.style.borderColor = 'transparent';
              el.style.color = s === 'b' ? '#8a8ab5' : '#0a0a1e';
              el.style.boxShadow = s === 'b' ? 'none' : '0 0 22px ' + (s === 'g' ? 'rgba(57,255,136,.45)' : 'rgba(255,217,61,.4)');
              api.beep(s === 'g' ? 760 : s === 'y' ? 520 : 300, .05);
            }, 230);
          }, i * 170);
        });
        setTimeout(cb, res.length * 170 + 400);
      }
      function submit() {
        if (busy || cur.length !== 5) return;
        if (WORDS.indexOf(cur) < 0) {
          var row = rowEls[guesses.length];
          row.classList.remove('anim-shake'); void row.offsetWidth; row.classList.add('anim-shake');
          api.beep(160, .12, 'sawtooth', .04);
          api.toast('Not in the word list');
          return;
        }
        busy = true;
        var res = score(cur, answer);
        var guess = cur;
        res.forEach(function (s, i) {
          var ch = guess[i];
          if (!letterState[ch] || RANK[s] > RANK[letterState[ch]]) letterState[ch] = s;
        });
        reveal(tiles[guesses.length], res, function () {
          drawKb();
          busy = false;
          var win = guess === answer;
          if (win) {
            done = true;
            tiles[guesses.length - 1].forEach(function (el, i) {
              setTimeout(function () {
                el.animate([{ transform: 'translateY(0)' }, { transform: 'translateY(-16px)' },
                            { transform: 'translateY(0)' }], { duration: 420, easing: 'ease-out' });
              }, i * 90);
            });
            api.beep(880, .2);
            setTimeout(function () {
              api.score(guesses.length);
              over('SOLVED', 'in ' + guesses.length + (guesses.length === 1 ? ' guess' : ' guesses'));
            }, 700);
          } else if (guesses.length >= rows) {
            done = true;
            over('OUT OF TRIES', 'The word was ' + answer.toUpperCase());
          }
        });
        guesses.push(cur);
        cur = '';
      }
      function score(guess, ans) {
        var res = ['b','b','b','b','b'], pool = ans.split('');
        for (var i = 0; i < 5; i++) if (guess[i] === ans[i]) { res[i] = 'g'; pool[i] = null; }
        for (var j = 0; j < 5; j++) {
          if (res[j] === 'g') continue;
          var k = pool.indexOf(guess[j]);
          if (k >= 0) { res[j] = 'y'; pool[k] = null; }
        }
        return res;
      }
      function over(title, sub) {
        var ov = api.h('<div class="gover"><div><h3>' + title + '</h3><p>' + sub +
          '</p><button class="btn btn-primary">New word</button></div></div>');
        ov.querySelector('button').onclick = api.restart;
        wrap.querySelector('.rel').appendChild(ov);
      }
      function key(k) {
        if (done || busy) return;
        if (k === 'Enter') return submit();
        if (k === 'Backspace') { cur = cur.slice(0, -1); return paintCur(); }
        if (/^[a-zA-Z]$/.test(k) && cur.length < 5) { cur += k.toLowerCase(); api.beep(420, .02, 'sine', .02); paintCur(); }
      }
      api.on(window, 'keydown', function (e) {
        if (e.key === 'Backspace') e.preventDefault();
        key(e.key);
      });
      drawKb(); paintCur();
    }
  });

  /* =========================================================
     SUDOKU — smooth highlights, entry pop, solved sweep
     ========================================================= */
  Arcade.register({
    id: 'sudoku', name: 'Sudoku', emoji: '🔳', tag: 'Puzzles',
    colors: ['#8b5cff', '#00e5ff'], unit: 'sec', higher: false,
    desc: 'Freshly generated grids in three difficulties. Beat your own clock.',
    help: 'Click a cell then type <kbd>1</kbd>–<kbd>9</kbd> · <kbd>0</kbd> or <kbd>Del</kbd> clears',
    mount: function (root, api) {
      var puzzle, solution, given, sel = -1, mistakes = 0, t0 = Date.now(), diff = 'Medium', timerStop, solved = false;

      var wrap = api.h('<div class="gwrap"><div class="rel">' +
        '<div data-grid style="display:grid;grid-template-columns:repeat(9,46px);grid-template-rows:repeat(9,46px);' +
        'background:#0f0f26;border:2px solid rgba(255,255,255,.28);border-radius:12px;overflow:hidden;' +
        'box-shadow:0 18px 50px rgba(0,0,0,.5)"></div></div>' +
        '<div class="gpanel"><div><h4>Time</h4><div class="big" data-time>0:00</div></div>' +
        '<div class="row"><span>Difficulty</span><b data-d>Medium</b></div>' +
        '<div class="row"><span>Mistakes</span><b data-m>0</b></div>' +
        '<div class="row"><span>Left</span><b data-left>0</b></div>' +
        '<div class="seg" data-diff><button data-v="Easy">Easy</button><button class="on" data-v="Medium">Medium</button><button data-v="Hard">Hard</button></div>' +
        '<div class="seg" data-pad></div>' +
        '<button class="btn btn-mini" data-hint>Hint</button></div></div>');
      root.appendChild(wrap);
      var gEl = wrap.querySelector('[data-grid]');
      var cells = [];

      function ok(b, i, v) {
        var r = (i / 9) | 0, c = i % 9, br = r - r % 3, bc = c - c % 3;
        for (var k = 0; k < 9; k++) {
          if (b[r * 9 + k] === v || b[k * 9 + c] === v) return false;
          if (b[(br + ((k / 3) | 0)) * 9 + bc + k % 3] === v) return false;
        }
        return true;
      }
      function solve(b, count) {
        var i = b.indexOf(0);
        if (i < 0) return 1;
        var n = 0, nums = [1,2,3,4,5,6,7,8,9];
        for (var s = nums.length - 1; s > 0; s--) { var j = (Math.random() * (s + 1)) | 0; var t = nums[s]; nums[s] = nums[j]; nums[j] = t; }
        for (var q = 0; q < 9; q++) {
          var v = nums[q];
          if (!ok(b, i, v)) continue;
          b[i] = v;
          n += solve(b, count);
          b[i] = 0;
          if (n >= (count || 1)) return n;
        }
        return n;
      }
      function generate(level) {
        var full = new Array(81).fill(0);
        (function fill(b) {
          var i = b.indexOf(0);
          if (i < 0) return true;
          var nums = [1,2,3,4,5,6,7,8,9];
          for (var s = 8; s > 0; s--) { var j = (Math.random() * (s + 1)) | 0; var t = nums[s]; nums[s] = nums[j]; nums[j] = t; }
          for (var q = 0; q < 9; q++) {
            if (!ok(b, i, nums[q])) continue;
            b[i] = nums[q];
            if (fill(b)) return true;
            b[i] = 0;
          }
          return false;
        })(full);
        solution = full.slice();
        var holes = level === 'Easy' ? 38 : level === 'Hard' ? 56 : 47;
        var p = full.slice(), order = [];
        for (var i = 0; i < 81; i++) order.push(i);
        for (var s2 = 80; s2 > 0; s2--) { var j2 = (Math.random() * (s2 + 1)) | 0; var t2 = order[s2]; order[s2] = order[j2]; order[j2] = t2; }
        var removed = 0;
        for (var k = 0; k < order.length && removed < holes; k++) {
          var idx = order[k], bak = p[idx];
          p[idx] = 0;
          var copy = p.slice();
          if (solve(copy, 2) !== 1) p[idx] = bak; else removed++;
        }
        puzzle = p;
        given = p.map(function (v) { return v !== 0; });
      }

      function build() {
        gEl.innerHTML = '';
        cells = [];
        for (var i = 0; i < 81; i++) {
          var r = (i / 9) | 0, c = i % 9;
          var d = document.createElement('div');
          d.className = 'sd-cell';
          d.style.cssText = 'display:grid;place-items:center;font-size:23px;cursor:pointer;user-select:none;' +
            'border-right:' + (c % 3 === 2 && c !== 8 ? '2px solid rgba(255,255,255,.28)' : '1px solid rgba(255,255,255,.07)') + ';' +
            'border-bottom:' + (r % 3 === 2 && r !== 8 ? '2px solid rgba(255,255,255,.28)' : '1px solid rgba(255,255,255,.07)');
          (function (i) { d.onclick = function () { sel = i; paint(); }; })(i);
          gEl.appendChild(d);
          cells.push(d);
        }
      }
      function paint() {
        var selV = sel >= 0 ? puzzle[sel] : 0;
        var counts = {};
        for (var n = 1; n <= 9; n++) counts[n] = 0;
        for (var q = 0; q < 81; q++) if (puzzle[q]) counts[puzzle[q]]++;

        for (var i = 0; i < 81; i++) {
          var r = (i / 9) | 0, c = i % 9, d = cells[i];
          var wrong = puzzle[i] && puzzle[i] !== solution[i];
          var sameRow = sel >= 0 && (((sel / 9) | 0) === r || sel % 9 === c ||
            ((((sel / 9) | 0) / 3 | 0) === (r / 3 | 0) && ((sel % 9) / 3 | 0) === (c / 3 | 0)));
          var sameNum = selV && puzzle[i] === selV;
          d.textContent = puzzle[i] || '';
          d.style.fontWeight = given[i] ? 800 : 600;
          d.style.color = wrong ? '#ff4d6d' : given[i] ? '#e8e8ff' : '#00e5ff';
          d.style.textShadow = (!given[i] && puzzle[i] && !wrong) ? '0 0 14px rgba(0,229,255,.55)' : 'none';
          d.style.background = i === sel ? 'rgba(139,92,255,.42)'
            : sameNum ? 'rgba(0,229,255,.18)'
            : sameRow ? 'rgba(255,255,255,.055)' : 'transparent';
        }
        wrap.querySelector('[data-m]').textContent = mistakes;
        wrap.querySelector('[data-left]').textContent = puzzle.filter(function (v) { return !v; }).length;
        wrap.querySelectorAll('[data-pad] button[data-n]').forEach(function (b) {
          var n = +b.dataset.n;
          b.style.opacity = counts[n] >= 9 ? .3 : 1;
        });
      }
      function place(v) {
        if (sel < 0 || given[sel] || solved) return;
        puzzle[sel] = v;
        var d = cells[sel];
        d.classList.remove('anim-pop'); void d.offsetWidth; d.classList.add('anim-pop');
        if (v && v !== solution[sel]) {
          mistakes++;
          api.beep(160, .12, 'sawtooth');
          d.classList.remove('anim-shake'); void d.offsetWidth; d.classList.add('anim-shake');
        } else if (v) api.beep(620, .05);
        paint();
        if (puzzle.every(function (x, i) { return x === solution[i]; })) win();
      }
      function win() {
        solved = true;
        if (timerStop) timerStop();
        var secs = Math.round((Date.now() - t0) / 1000);
        cells.forEach(function (d, i) {
          var r = (i / 9) | 0, c = i % 9;
          setTimeout(function () {
            d.style.background = 'rgba(57,255,136,.22)';
            d.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.22)' }, { transform: 'scale(1)' }],
                      { duration: 380, easing: 'ease-out' });
          }, (r + c) * 42);
        });
        api.beep(880, .25);
        setTimeout(function () {
          api.score(secs);
          var ov = api.h('<div class="gover"><div><h3>SOLVED</h3><p>' + diff + ' · ' + fmt(secs) +
            ' · ' + mistakes + ' mistakes</p><button class="btn btn-primary">New puzzle</button></div></div>');
          ov.querySelector('button').onclick = function () { ov.remove(); start(diff); };
          wrap.querySelector('.rel').appendChild(ov);
        }, 900);
      }
      function fmt(s) { return ((s / 60) | 0) + ':' + ('0' + (s % 60)).slice(-2); }

      var pad = wrap.querySelector('[data-pad]');
      for (var n = 1; n <= 9; n++) {
        (function (n) {
          var b = document.createElement('button');
          b.textContent = n; b.dataset.n = n; b.style.flex = '0 0 30%';
          b.onclick = function () { place(n); };
          pad.appendChild(b);
        })(n);
      }
      var clr = document.createElement('button');
      clr.textContent = 'Clear'; clr.style.flex = '1';
      clr.onclick = function () { place(0); };
      pad.appendChild(clr);

      wrap.querySelectorAll('[data-diff] button').forEach(function (b) {
        b.onclick = function () {
          wrap.querySelectorAll('[data-diff] button').forEach(function (x) { x.classList.remove('on'); });
          b.classList.add('on');
          start(b.dataset.v);
        };
      });
      wrap.querySelector('[data-hint]').onclick = function () {
        var blanks = [];
        for (var i = 0; i < 81; i++) if (!puzzle[i]) blanks.push(i);
        if (!blanks.length) return;
        var i2 = blanks[(Math.random() * blanks.length) | 0];
        puzzle[i2] = solution[i2]; given[i2] = true; mistakes++;
        cells[i2].classList.add('anim-popin');
        paint(); api.toast('Hint used (+1 mistake)');
      };

      api.on(window, 'keydown', function (e) {
        if (/^[1-9]$/.test(e.key)) place(+e.key);
        else if (e.key === '0' || e.key === 'Backspace' || e.key === 'Delete') place(0);
        else if (e.key.indexOf('Arrow') === 0 && sel >= 0) {
          e.preventDefault();
          var r = (sel / 9) | 0, c = sel % 9;
          if (e.key === 'ArrowUp') r = Math.max(0, r - 1);
          if (e.key === 'ArrowDown') r = Math.min(8, r + 1);
          if (e.key === 'ArrowLeft') c = Math.max(0, c - 1);
          if (e.key === 'ArrowRight') c = Math.min(8, c + 1);
          sel = r * 9 + c; paint();
        }
      });

      function start(level) {
        diff = level; mistakes = 0; sel = -1; solved = false; t0 = Date.now();
        wrap.querySelector('[data-d]').textContent = level;
        gEl.innerHTML = '<div style="grid-column:1/-1;grid-row:1/-1;display:grid;place-items:center;color:var(--dim)">generating…</div>';
        setTimeout(function () {
          generate(level); build(); paint();
          cells.forEach(function (d, i) {
            d.style.opacity = 0;
            setTimeout(function () { d.style.transition = 'opacity .3s'; d.style.opacity = 1; }, ((i / 9 | 0) + i % 9) * 22);
          });
        }, 30);
      }
      timerStop = api.interval(function () {
        if (!solved) wrap.querySelector('[data-time]').textContent = fmt(Math.round((Date.now() - t0) / 1000));
      }, 500);
      start('Medium');
    }
  });

  /* =========================================================
     MINESWEEPER — animated cascade reveals, staggered boom
     ========================================================= */
  Arcade.register({
    id: 'mines', name: 'Minesweeper', emoji: '💣', tag: 'Puzzles',
    colors: ['#ff4d6d', '#ffd93d'], unit: 'sec', higher: false,
    desc: 'Flags, numbers, and nerve. First click is always safe.',
    help: 'Left click reveals · right click flags · middle click chords',
    mount: function (root, api) {
      var LEVELS = { Beginner: [9, 9, 10], Intermediate: [16, 16, 40], Expert: [22, 16, 80] };
      var W, H, MINES, board, revealed, flags, dead, wonG, started, t0, level = 'Intermediate', cells = [];

      var wrap = api.h('<div class="gwrap"><div class="rel"><div data-grid style="display:grid;gap:2px;' +
        'background:#12122c;padding:8px;border-radius:12px;border:1px solid var(--line);' +
        'box-shadow:0 18px 46px rgba(0,0,0,.5)"></div></div>' +
        '<div class="gpanel"><div><h4>Time</h4><div class="big" data-time>0:00</div></div>' +
        '<div class="row"><span>Mines left</span><b data-left>0</b></div>' +
        '<div class="row"><span>Cleared</span><b data-cl>0%</b></div>' +
        '<div class="seg" data-lv><button data-v="Beginner">9×9</button><button class="on" data-v="Intermediate">16×16</button><button data-v="Expert">Expert</button></div>' +
        '<button class="btn btn-mini" data-new>New board</button></div></div>');
      root.appendChild(wrap);
      var gEl = wrap.querySelector('[data-grid]');

      function idx(x, y) { return y * W + x; }
      function neighbors(i) {
        var x = i % W, y = (i / W) | 0, out = [];
        for (var dy = -1; dy <= 1; dy++) for (var dx = -1; dx <= 1; dx++) {
          if (!dx && !dy) continue;
          var nx = x + dx, ny = y + dy;
          if (nx >= 0 && ny >= 0 && nx < W && ny < H) out.push(idx(nx, ny));
        }
        return out;
      }
      function reset() {
        var L = LEVELS[level]; W = L[0]; H = L[1]; MINES = L[2];
        board = new Array(W * H).fill(0);
        revealed = new Array(W * H).fill(false);
        flags = new Array(W * H).fill(false);
        dead = false; wonG = false; started = false; t0 = Date.now();
        gEl.style.gridTemplateColumns = 'repeat(' + W + ',30px)';
        build(); paint();
      }
      function plant(safe) {
        var forbidden = neighbors(safe).concat([safe]);
        var spots = [];
        for (var i = 0; i < W * H; i++) if (forbidden.indexOf(i) < 0) spots.push(i);
        for (var s = spots.length - 1; s > 0; s--) { var j = (Math.random() * (s + 1)) | 0; var t = spots[s]; spots[s] = spots[j]; spots[j] = t; }
        for (var m = 0; m < MINES; m++) board[spots[m]] = -1;
        for (var k = 0; k < W * H; k++) {
          if (board[k] === -1) continue;
          board[k] = neighbors(k).filter(function (n) { return board[n] === -1; }).length;
        }
      }
      /* BFS flood fill so we can stagger the reveal animation by depth */
      function reveal(i) {
        if (revealed[i] || flags[i] || dead) return;
        var queue = [[i, 0]], seen = {};
        seen[i] = true;
        while (queue.length) {
          var cur = queue.shift(), ci = cur[0], depth = cur[1];
          if (revealed[ci] || flags[ci]) continue;
          revealed[ci] = true;
          animateReveal(ci, depth);
          if (board[ci] === -1) { dead = true; return; }
          if (board[ci] === 0) {
            neighbors(ci).forEach(function (n) {
              if (!seen[n] && !revealed[n] && !flags[n]) { seen[n] = true; queue.push([n, depth + 1]); }
            });
          }
        }
      }
      var COLORS = ['', '#00e5ff', '#39ff88', '#ff4d6d', '#c77dff', '#ff9f1c', '#ffd93d', '#ff2fb9', '#e8e8ff'];
      function animateReveal(i, depth) {
        var d = cells[i];
        setTimeout(function () {
          paintCell(i);
          d.classList.add('ms-reveal');
          if (depth === 0) api.beep(520, .04, 'sine', .025);
        }, Math.min(400, depth * 22));
      }
      function paintCell(i) {
        var d = cells[i], v = board[i], rv = revealed[i];
        d.className = 'ms-cell' + (rv ? '' : ' hidden-cell');
        d.style.background = rv ? (v === -1 ? '#ff4d6d' : 'rgba(255,255,255,.045)') : 'rgba(255,255,255,.14)';
        d.style.color = v > 0 ? COLORS[v] : '#e8e8ff';
        d.style.textShadow = rv && v > 0 ? '0 0 10px ' + COLORS[v] : 'none';
        d.textContent = rv ? (v === -1 ? '💥' : (v || '')) : (flags[i] ? '🚩' : '');
      }
      function build() {
        gEl.innerHTML = ''; cells = [];
        for (var i = 0; i < W * H; i++) {
          var d = document.createElement('div');
          d.className = 'ms-cell hidden-cell';
          d.style.cssText = 'width:30px;height:30px;display:grid;place-items:center;border-radius:6px;' +
            'font-weight:800;font-size:15px;cursor:pointer;user-select:none;background:rgba(255,255,255,.14)';
          (function (i, d) {
            d.onclick = function () { if (dead || wonG) return; first(i); reveal(i); after(); };
            d.oncontextmenu = function (e) {
              e.preventDefault();
              if (dead || wonG || revealed[i]) return;
              flags[i] = !flags[i];
              api.beep(flags[i] ? 620 : 380, .04);
              d.classList.remove('anim-pop'); void d.offsetWidth; d.classList.add('anim-pop');
              paintCell(i); updatePanel();
            };
            d.onauxclick = function (e) {
              if (e.button !== 1 || !revealed[i]) return;
              e.preventDefault();
              var f = neighbors(i).filter(function (n) { return flags[n]; }).length;
              if (f === board[i]) { neighbors(i).forEach(reveal); after(); }
            };
          })(i, d);
          gEl.appendChild(d);
          cells.push(d);
        }
      }
      function paint() { for (var i = 0; i < W * H; i++) paintCell(i); updatePanel(); }
      function updatePanel() {
        var used = flags.filter(Boolean).length;
        var safe = W * H - MINES;
        var open = revealed.filter(Boolean).length;
        wrap.querySelector('[data-left]').textContent = MINES - used;
        wrap.querySelector('[data-cl]').textContent = Math.round(Math.min(1, open / safe) * 100) + '%';
      }
      function checkWin() {
        var hidden = 0;
        for (var i = 0; i < W * H; i++) if (!revealed[i] && board[i] !== -1) hidden++;
        if (hidden === 0) {
          wonG = true;
          var secs = Math.round((Date.now() - t0) / 1000);
          for (var k = 0; k < W * H; k++) {
            if (board[k] === -1) (function (k) {
              setTimeout(function () {
                cells[k].textContent = '🚩';
                cells[k].classList.add('anim-popin');
              }, (k % W) * 18);
            })(k);
          }
          api.beep(880, .25);
          setTimeout(function () {
            api.score(secs);
            var ov = api.h('<div class="gover"><div><h3>CLEARED</h3><p>' + level + ' in ' + secs +
              's</p><button class="btn btn-primary">New board</button></div></div>');
            ov.querySelector('button').onclick = function () { ov.remove(); reset(); };
            wrap.querySelector('.rel').appendChild(ov);
          }, 700);
        }
      }
      function first(i) {
        if (started) return;
        started = true; t0 = Date.now(); plant(i);
      }
      function after() {
        if (dead) {
          var order = [];
          for (var i = 0; i < W * H; i++) if (board[i] === -1) order.push(i);
          order.forEach(function (i, n) {
            setTimeout(function () {
              revealed[i] = true; paintCell(i);
              cells[i].classList.add('anim-popin');
              api.beep(120 + n * 4, .06, 'sawtooth', .03);
            }, n * 45);
          });
          setTimeout(function () {
            var ov = api.h('<div class="gover"><div><h3>BOOM</h3><p>You hit a mine.' +
              '</p><button class="btn btn-primary">New board</button></div></div>');
            ov.querySelector('button').onclick = function () { ov.remove(); reset(); };
            wrap.querySelector('.rel').appendChild(ov);
          }, Math.min(1200, order.length * 45 + 250));
          return;
        }
        updatePanel(); checkWin();
      }
      wrap.querySelectorAll('[data-lv] button').forEach(function (b) {
        b.onclick = function () {
          wrap.querySelectorAll('[data-lv] button').forEach(function (x) { x.classList.remove('on'); });
          b.classList.add('on'); level = b.dataset.v; reset();
        };
      });
      wrap.querySelector('[data-new]').onclick = reset;
      api.interval(function () {
        if (!started || dead || wonG) return;
        var s = Math.round((Date.now() - t0) / 1000);
        wrap.querySelector('[data-time]').textContent = ((s / 60) | 0) + ':' + ('0' + (s % 60)).slice(-2);
      }, 500);
      reset();
    }
  });

  /* =========================================================
     MEMORY MATCH — real 3D card flips
     ========================================================= */
  Arcade.register({
    id: 'memory', name: 'Memory Match', emoji: '🃏', tag: 'Puzzles',
    colors: ['#c77dff', '#ff2fb9'], unit: 'moves', higher: false,
    desc: 'Twelve pairs, one short memory. Fewer flips is a better score.',
    help: 'Click two cards to flip them · match all 12 pairs',
    mount: function (root, api) {
      var ICONS = ['🍕','🚀','🐙','🎧','🌵','⚡','🍩','🎲','🐳','🪐','🧩','🍄'];
      var deck, flipped = [], matched, moves, lock = false, t0 = Date.now();

      var wrap = api.h('<div class="gwrap"><div class="rel"><div data-grid style="display:grid;' +
        'grid-template-columns:repeat(6,88px);gap:12px"></div></div>' +
        '<div class="gpanel"><div><h4>Moves</h4><div class="big" data-moves>0</div></div>' +
        '<div class="row"><span>Pairs</span><b data-pairs>0 / 12</b></div>' +
        '<div class="row"><span>Time</span><b data-time>0s</b></div>' +
        '<button class="btn btn-mini" data-new>Shuffle</button></div></div>');
      root.appendChild(wrap);
      var gEl = wrap.querySelector('[data-grid]');

      function reset() {
        deck = ICONS.concat(ICONS).map(function (i) { return { icon: i, up: false, done: false }; });
        for (var s = deck.length - 1; s > 0; s--) { var j = (Math.random() * (s + 1)) | 0; var t = deck[s]; deck[s] = deck[j]; deck[j] = t; }
        flipped = []; matched = 0; moves = 0; lock = false; t0 = Date.now();
        build();
      }
      function build() {
        gEl.innerHTML = '';
        deck.forEach(function (c, i) {
          var el = document.createElement('div');
          el.className = 'mem-card';
          el.style.cssText = 'width:88px;height:110px';
          el.innerHTML = '<div class="mem-inner"><div class="mem-face mem-back"></div>' +
                         '<div class="mem-face mem-front">' + c.icon + '</div></div>';
          el.style.animation = 'popIn .3s ease-out both';
          el.style.animationDelay = (i * 22) + 'ms';
          el.onclick = function () { flip(i); };
          gEl.appendChild(el);
          c.el = el;
        });
        update();
      }
      function update() {
        deck.forEach(function (c) {
          c.el.classList.toggle('up', c.up || c.done);
          c.el.classList.toggle('done', c.done);
        });
        wrap.querySelector('[data-moves]').textContent = moves;
        wrap.querySelector('[data-pairs]').textContent = matched + ' / 12';
      }
      function flip(i) {
        if (lock) return;
        var c = deck[i];
        if (c.up || c.done) return;
        c.up = true; flipped.push(i); update();
        api.beep(560, .05);
        if (flipped.length === 2) {
          moves++;
          var a = deck[flipped[0]], b = deck[flipped[1]];
          if (a.icon === b.icon) {
            lock = true;
            api.timeout(function () {
              a.done = b.done = true; matched++; flipped = []; lock = false;
              [a, b].forEach(function (x) {
                x.el.classList.remove('anim-pop'); void x.el.offsetWidth; x.el.classList.add('anim-pop');
              });
              api.beep(880, .12);
              update();
              if (matched === 12) finish();
            }, 380);
          } else {
            lock = true;
            api.timeout(function () {
              a.up = b.up = false; flipped = []; lock = false; update();
            }, 780);
          }
          update();
        }
      }
      function finish() {
        api.score(moves);
        var secs = Math.round((Date.now() - t0) / 1000);
        deck.forEach(function (c, i) {
          setTimeout(function () {
            c.el.animate([{ transform: 'translateY(0)' }, { transform: 'translateY(-14px)' }, { transform: 'translateY(0)' }],
                         { duration: 420, easing: 'ease-out' });
          }, i * 40);
        });
        setTimeout(function () {
          var ov = api.h('<div class="gover"><div><h3>ALL MATCHED</h3><p>' + moves + ' moves · ' + secs +
            's</p><button class="btn btn-primary">Shuffle</button></div></div>');
          ov.querySelector('button').onclick = function () { ov.remove(); reset(); };
          wrap.querySelector('.rel').appendChild(ov);
        }, 900);
      }
      api.interval(function () {
        wrap.querySelector('[data-time]').textContent = Math.round((Date.now() - t0) / 1000) + 's';
      }, 500);
      wrap.querySelector('[data-new]').onclick = reset;
      reset();
    }
  });

  /* =========================================================
     SIMON — glowing pads, scale pulse, speed ramp
     ========================================================= */
  Arcade.register({
    id: 'simon', name: 'Simon Says', emoji: '🎵', tag: 'Puzzles',
    colors: ['#39ff88', '#ff4d6d'], unit: 'level',
    desc: 'Repeat the colour sequence. It gets one longer every round.',
    help: 'Click the pads or press <kbd>1</kbd><kbd>2</kbd><kbd>3</kbd><kbd>4</kbd>',
    mount: function (root, api) {
      var PADS = [
        { c: '#39ff88', f: 330 }, { c: '#ff4d6d', f: 415 },
        { c: '#00e5ff', f: 495 }, { c: '#ffd93d', f: 660 }
      ];
      var seq = [], step = 0, playing = false, level = 0;

      var wrap = api.h('<div class="gwrap"><div class="rel"><div data-pads style="display:grid;' +
        'grid-template-columns:repeat(2,150px);grid-template-rows:repeat(2,150px);gap:14px;' +
        'padding:14px;background:#0d0d22;border-radius:26px;border:1px solid var(--line);' +
        'box-shadow:0 20px 60px rgba(0,0,0,.55)"></div></div>' +
        '<div class="gpanel"><div><h4>Level</h4><div class="big" data-lv>0</div></div>' +
        '<div class="row"><span>Sequence</span><b data-len>0</b></div>' +
        '<div class="row"><span>Status</span><b data-st>ready</b></div>' +
        '<button class="btn btn-primary" data-start>Start</button></div></div>');
      root.appendChild(wrap);
      var padsEl = wrap.querySelector('[data-pads]'), els = [];

      PADS.forEach(function (p, i) {
        var d = document.createElement('div');
        var corner = ['26px 8px 8px 8px', '8px 26px 8px 8px', '8px 8px 8px 26px', '8px 8px 26px 8px'][i];
        d.style.cssText = 'border-radius:' + corner + ';cursor:pointer;position:relative;overflow:hidden;' +
          'background:radial-gradient(circle at 40% 30%,' + FX.rgba(p.c, .55) + ',' + FX.rgba(p.c, .16) + ');' +
          'border:1px solid ' + FX.rgba(p.c, .4) + ';opacity:.55;' +
          'transition:opacity .12s ease, transform .12s ease, box-shadow .18s ease';
        d.onclick = function () { press(i); };
        padsEl.appendChild(d); els.push(d);
      });

      function status(t) { wrap.querySelector('[data-st]').textContent = t; }
      function flash(i, ms) {
        var d = els[i], p = PADS[i];
        d.style.opacity = '1';
        d.style.transform = 'scale(.955)';
        d.style.boxShadow = '0 0 42px ' + FX.rgba(p.c, .85) + ', inset 0 0 30px ' + FX.rgba(p.c, .5);
        api.beep(p.f, (ms || 340) / 1000, 'sine', .07);
        api.timeout(function () {
          d.style.opacity = '.55'; d.style.transform = 'scale(1)'; d.style.boxShadow = 'none';
        }, ms || 340);
      }
      function next() {
        seq.push((Math.random() * 4) | 0);
        level = seq.length; step = 0; playing = true;
        status('watch');
        wrap.querySelector('[data-lv]').textContent = level;
        wrap.querySelector('[data-len]').textContent = seq.length;
        var speed = Math.max(230, 620 - level * 22);
        seq.forEach(function (s, n) {
          api.timeout(function () { flash(s, speed * .55); }, 520 + n * speed);
        });
        api.timeout(function () { playing = false; status('your turn'); }, 520 + seq.length * speed);
      }
      function press(i) {
        if (playing || !seq.length) return;
        flash(i, 200);
        if (seq[step] !== i) return fail();
        step++;
        if (step === seq.length) { status('nice!'); api.timeout(next, 700); }
      }
      function fail() {
        api.beep(110, .4, 'sawtooth', .07);
        padsEl.classList.remove('anim-shake'); void padsEl.offsetWidth; padsEl.classList.add('anim-shake');
        api.score(level - 1);
        status('wrong');
        var ov = api.h('<div class="gover"><div><h3>WRONG PAD</h3><p>You reached level ' + (level - 1) +
          '</p><button class="btn btn-primary">Try again</button></div></div>');
        ov.querySelector('button').onclick = function () { ov.remove(); seq = []; level = 0; next(); };
        wrap.querySelector('.rel').appendChild(ov);
        seq = [];
      }
      api.on(window, 'keydown', function (e) { if (/^[1-4]$/.test(e.key)) press(+e.key - 1); });
      wrap.querySelector('[data-start]').onclick = function () { seq = []; level = 0; next(); };
    }
  });
})();
