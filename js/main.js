/* =========================================================
   DevSentinel — portfolio computer
   - fixed-resolution screen scaled into a CRT monitor
   - digital rain wallpaper that catches the name
   - apps from <template> tags, opened as windows
   - taskbar, start menu, terminal, boot, screensaver,
     system monitor, visitor achievements, power button
   Content lives in index.html. Settings below.
   ========================================================= */
(() => {
  'use strict';

  const CONFIG = {
    screenW: 1024,                    // the computer's resolution
    screenH: 768,
    promptUser: 'visitor@devsentinel',
    timeZone: 'Asia/Jakarta',
    timeZoneLabel: 'WIB',
    cell: 16,                         // rain glyph size
    tickMs: 33,                       // rain speed: lower is faster
    bootEverySession: true,           // false = boot screen only on a visitor's first visit
    screensaverAfterMs: 60000,        // idle time before the screensaver
  };

  /* ---------- helpers ---------- */
  const root = document.documentElement;
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isTouch = () => matchMedia('(hover: none)').matches;
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const clamp = (v, a, b) => Math.min(Math.max(v, a), b);
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const store = {
    get(k, s) { try { return (s || localStorage).getItem(k); } catch { return null; } },
    set(k, v, s) { try { (s || localStorage).setItem(k, v); } catch { /* ignore */ } },
  };
  const ss = (() => { try { return sessionStorage; } catch { return null; } })();
  const anim = (el, frames, opts) => (reduceMotion || !el || !el.animate ? null : el.animate(frames, opts));
  const done = (a) => (a ? a.finished.catch(() => {}) : Promise.resolve());

  /* =======================================================
     SCREEN: fixed resolution, scaled to fit the monitor
     ======================================================= */
  const glass = $('#glass'), screenEl = $('#screen');
  const SCREEN = { mode: 'monitor', w: CONFIG.screenW, h: CONFIG.screenH, scale: 1, left: 0, top: 0 };
  const isPhone = () => SCREEN.mode === 'full' && innerWidth <= 720;

  function layoutScreen() {
    const vw = innerWidth, vh = innerHeight;
    const monitor = vw > 720 && vh >= 520;
    SCREEN.mode = monitor ? 'monitor' : 'full';
    root.classList.toggle('is-full', !monitor);
    if (monitor) {
      SCREEN.w = CONFIG.screenW; SCREEN.h = CONFIG.screenH;
      const side = 50 + 16, top = 46 + 16, bottom = 88 + 70 + 16; // bezel + chin + stand + room
      SCREEN.scale = Math.min((vw - side * 2) / SCREEN.w, (vh - top - bottom) / SCREEN.h);
    } else {
      SCREEN.w = vw; SCREEN.h = vh; SCREEN.scale = 1;
    }
    root.style.setProperty('--sw', `${SCREEN.w}px`);
    root.style.setProperty('--sh', `${SCREEN.h}px`);
    screenEl.style.transform = SCREEN.scale === 1 ? '' : `scale(${SCREEN.scale})`;
    glass.style.width = `${SCREEN.w * SCREEN.scale}px`;
    glass.style.height = `${SCREEN.h * SCREEN.scale}px`;
    root.style.setProperty('--gw', `${SCREEN.w * SCREEN.scale}px`);
    const r = glass.getBoundingClientRect();
    SCREEN.left = r.left; SCREEN.top = r.top;
  }
  const toLocal = (x, y) => ({ x: (x - SCREEN.left) / SCREEN.scale, y: (y - SCREEN.top) / SCREEN.scale });
  const localRect = (el) => {
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { x: (r.left - SCREEN.left) / SCREEN.scale, y: (r.top - SCREEN.top) / SCREEN.scale, w: r.width / SCREEN.scale, h: r.height / SCREEN.scale };
  };
  layoutScreen();

  /* =======================================================
     PIXEL ICONS (12 x 12). '#' = full colour, '+' = dim.
     ======================================================= */
  const ICONS = {
    person: ['....####....', '...######...', '...######...', '...######...', '....####....', '............', '..########..', '.##########.', '.##########.', '.###++++###.', '.##########.', '............'],
    case: ['............', '....####....', '....#..#....', '############', '############', '#####++#####', '#####++#####', '############', '############', '############', '############', '............'],
    trophy: ['.##########.', '#.########.#', '#.###++###.#', '.#.######.#.', '...######...', '....####....', '.....##.....', '.....##.....', '....####....', '...######...', '...######...', '............'],
    pad: ['............', '............', '.##########.', '############', '#.##++++##.#', '...#++++#.#.', '#.##++++##.#', '############', '####....####', '###......###', '............', '............'],
    folder: ['............', '.####.......', '######......', '############', '#++++++++++#', '#++++++++++#', '#++++++++++#', '#++++++++++#', '#++++++++++#', '#++++++++++#', '############', '............'],
    bird2: ['............', '.#.....##...', '.##...####..', '..##..#.###.', '...#.#####..', '...#######..', '..########..', '..++######..', '...+#####...', '....##..#...', '....#....#..', '............'],
    bird: ['............', '.......##...', '......####..', '......#.###.', '#....#####..', '##..######..', '.#########..', '..++######..', '...+#####...', '....##..#...', '....#....#..', '............'],
    globe: ['....####....', '..##+##+##..', '.#++#++#++#.', '.#++#++#++#.', '############', '#+++#++#+++#', '#+++#++#+++#', '############', '.#++#++#++#.', '.#++#++#++#.', '..##+##+##..', '....####....'],
    term: ['############', '#++++++++++#', '#+#+++++++++', '#++#+++++++#', '#+++#++++++#', '#++#+++++++#', '#+#++####++#', '#++++++++++#', '############', '....####....', '..########..', '............'],
    doc: ['.#######....', '.#+++++##...', '.#+++++#+#..', '.#+++++####.', '.#+###++++#.', '.#++++++++#.', '.#+######+#.', '.#++++++++#.', '.#+######+#.', '.#++++++++#.', '.##########.', '............'],
  };
  function pixelSvg(name, cls = '') {
    return `<svg class="${cls}" viewBox="0 0 12 12" shape-rendering="crispEdges" fill="currentColor" aria-hidden="true" focusable="false">${pixelRects(name)}</svg>`;
  }
  /* Two-frame bird that hops back and forth on the desktop */
  const birdSprite = () => `<span class="sprite" aria-hidden="true"><svg viewBox="0 0 12 12" shape-rendering="crispEdges" fill="currentColor" focusable="false"><g class="sprite__a">${pixelRects('bird')}</g><g class="sprite__b">${pixelRects('bird2')}</g></svg></span>`;
  function pixelRects(name) {
    const rows = ICONS[name] || ICONS.doc;
    let out = '';
    rows.forEach((row, y) => {
      let x = 0;
      while (x < row.length) {
        const ch = row[x];
        if (ch === '#' || ch === '+') {
          let n = 1;
          while (row[x + n] === ch) n++;
          out += `<rect x="${x}" y="${y}" width="${n}" height="1"${ch === '+' ? ' opacity=".4"' : ''}/>`;
          x += n;
        } else x++;
      }
    });
    return out;
  }
  const SVG = {
    min: '<svg viewBox="0 0 10 10" aria-hidden="true"><rect x="1" y="8" width="8" height="2" fill="currentColor"/></svg>',
    max: '<svg viewBox="0 0 10 10" aria-hidden="true"><path d="M.5.5h9v9h-9z" fill="none" stroke="currentColor"/><rect x="0" y="0" width="10" height="2" fill="currentColor"/></svg>',
    restore: '<svg viewBox="0 0 10 10" aria-hidden="true"><path d="M2.5.5h7v7M.5 2.5h7v7h-7z" fill="none" stroke="currentColor"/></svg>',
    close: '<svg viewBox="0 0 10 10" aria-hidden="true"><path d="M1 1l8 8M9 1L1 9" stroke="currentColor" stroke-width="1.6" stroke-linecap="square"/></svg>',
    grip: '<svg viewBox="0 0 10 10" aria-hidden="true" fill="currentColor"><rect x="8" y="2" width="2" height="2"/><rect x="5" y="5" width="2" height="2"/><rect x="8" y="5" width="2" height="2"/><rect x="2" y="8" width="2" height="2"/><rect x="5" y="8" width="2" height="2"/><rect x="8" y="8" width="2" height="2"/></svg>',
  };

  /* =======================================================
     ACTIVITY LIGHT
     ======================================================= */
  const led = $('#led');
  function blinkLed() {
    if (!led || !powered) return;
    led.classList.remove('is-busy'); void led.offsetWidth; led.classList.add('is-busy');
  }

  /* =======================================================
     RAIN WALLPAPER
     ======================================================= */
  const KATA = 'ｦｧｨｩｪｫｬｭｮｯｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾔﾕﾖﾗﾘﾙﾚﾛﾜﾝ';
  const SET_GREEN = KATA + '0123456789Z:.=*+-<>|';
  const SET_SCARLET = KATA + '✦✧+*✦✧';
  const pick = (s) => s[(Math.random() * s.length) | 0];
  const PALETTE = { green: { body: [25, 197, 90], head: [201, 255, 217] }, scarlet: { body: [255, 43, 58], head: [255, 210, 214] } };
  const rgb = (c, a = 1) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;

  const canvas = $('#rain');
  const ctx = canvas && canvas.getContext ? canvas.getContext('2d', { alpha: false }) : null;
  const rain = {
    W: 0, H: 0, fs: 16, cols: 0, rows: 0, drops: [], mask: null, locked: new Map(), armed: false,
    pointer: null, enabled: true, running: false, mode: 'green',
    body: PALETTE.green.body.slice(), head: PALETTE.green.head.slice(), acc: 0, last: 0,
  };
  const newDrop = (initial) => ({ y: initial ? -Math.random() * rain.rows * 0.7 : -Math.random() * 24, v: 0.3 + Math.random() * 0.55, last: -1, g: '' });

  function sizeRain() {
    if (!ctx) return;
    const W = SCREEN.w, H = SCREEN.h;
    const k = SCREEN.scale * Math.min(devicePixelRatio || 1, 2);
    rain.W = W; rain.H = H;
    canvas.width = Math.round(W * k); canvas.height = Math.round(H * k);
    ctx.setTransform(k, 0, 0, k, 0, 0);
    rain.fs = W < 640 ? 13 : CONFIG.cell;
    rain.cols = Math.ceil(W / rain.fs); rain.rows = Math.ceil(H / rain.fs);
    rain.drops = Array.from({ length: rain.cols }, () => newDrop(true));
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
    ctx.font = `${rain.fs}px "MS Gothic", "Hiragino Kaku Gothic Pro", "Noto Sans JP", monospace`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    if (rain.armed) buildMask();
    if (reduceMotion) drawStatic();
  }

  function fitName() {
    const el = $('.desk__name');
    if (!el) return;
    el.style.fontSize = '';
    const icons = localRect($('#icons'));
    const avail = isPhone() ? SCREEN.w - 32 : SCREEN.w - (icons.x + icons.w) - SCREEN.w * 0.05 - 48;
    const widest = Math.max(...$$('.desk__line', el).map((l) => localRect(l).w));
    if (widest > avail) el.style.fontSize = `${parseFloat(getComputedStyle(el).fontSize) * (avail / widest) * 0.98}px`;
  }

  function buildMask() {
    fitName();
    rain.locked.clear(); rain.mask = null;
    root.classList.remove('rain-name');
    if (!ctx || reduceMotion || !rain.enabled) return;
    const nameEl = $('.desk__name'), lines = $$('.desk__line');
    if (!nameEl || !lines.length) return;
    const fs = rain.fs, S = 4, cs = getComputedStyle(nameEl);
    const oc = document.createElement('canvas');
    oc.width = rain.cols * S; oc.height = rain.rows * S;
    const o = oc.getContext('2d', { willReadFrequently: true });
    o.fillStyle = '#fff'; o.strokeStyle = '#fff'; o.textBaseline = 'middle';
    o.lineJoin = 'miter'; o.lineWidth = S * 0.55; // thicken thin strokes so each one is at least a cell wide
    o.font = `${cs.fontWeight} ${(parseFloat(cs.fontSize) * S) / fs}px ${cs.fontFamily}`;
    lines.forEach((line) => {
      const r = localRect(line);
      const t = (cs.textTransform === 'uppercase' ? line.textContent.toUpperCase() : line.textContent).trim();
      const x = (r.x * S) / fs, y = ((r.y + r.h / 2) * S) / fs;
      o.fillText(t, x, y); o.strokeText(t, x, y);
    });
    const data = o.getImageData(0, 0, oc.width, oc.height).data;
    const mask = new Uint8Array(rain.cols * rain.rows);
    let filled = 0;
    for (let r = 0; r < rain.rows; r++) for (let c = 0; c < rain.cols; c++) {
      if (data[((r * S + S / 2) * oc.width + (c * S + S / 2)) * 4 + 3] > 110) { mask[r * rain.cols + c] = 1; filled++; }
    }
    if (filled) { rain.mask = mask; root.classList.add('rain-name'); }
  }

  function armName() {
    rain.armed = true;
    buildMask();
    if (!rain.mask) return;
    const cols = new Set();
    rain.mask.forEach((v, i) => { if (v) cols.add(i % rain.cols); });
    cols.forEach((c) => { rain.drops[c] = { y: -Math.random() * 10, v: 0.7 + Math.random() * 0.25, last: -1, g: '' }; });
  }

  const clearCell = (x, y) => { ctx.fillStyle = '#000'; ctx.fillRect(x, y, rain.fs, rain.fs); };

  function tick() {
    const { W, H, fs, drops, cols } = rain;
    const set = rain.mode === 'scarlet' ? SET_SCARLET : SET_GREEN;
    const t = PALETTE[rain.mode];
    for (let i = 0; i < 3; i++) { rain.body[i] += (t.body[i] - rain.body[i]) * 0.07; rain.head[i] += (t.head[i] - rain.head[i]) * 0.07; }
    const bodyCol = rgb(rain.body), headCol = rgb(rain.head), p = rain.pointer;
    ctx.fillStyle = 'rgba(0,0,0,0.06)'; ctx.fillRect(0, 0, W, H);

    for (let c = 0; c < drops.length; c++) {
      const d = drops[c];
      d.y += d.v;
      const cell = Math.floor(d.y);
      if (cell !== d.last) {
        const x = c * fs, cx = x + fs / 2;
        if (d.last >= 0 && d.last < rain.rows && d.g) { clearCell(x, d.last * fs); ctx.fillStyle = bodyCol; ctx.fillText(d.g, cx, d.last * fs); }
        if (cell >= 0 && cell < rain.rows) {
          const y = cell * fs;
          if (p && (cx - p.x) ** 2 + (y + fs / 2 - p.y) ** 2 < 4900) d.g = '';
          else { d.g = pick(set); clearCell(x, y); ctx.fillStyle = headCol; ctx.fillText(d.g, cx, y); }
          if (rain.mask) {
            const idx = cell * cols + c;
            if (rain.mask[idx] && !rain.locked.has(idx)) rain.locked.set(idx, { g: pick(set), a: 0.2 });
          }
        }
        d.last = cell;
      }
      if (cell * fs > H && Math.random() > 0.975) drops[c] = newDrop(false);
    }
    for (const [idx, L] of rain.locked) {
      const r = (idx / cols) | 0, c = idx % cols;
      if (Math.random() < 0.0005) { clearCell(c * fs, r * fs); rain.locked.delete(idx); continue; }
      L.a += (1 - L.a) * 0.15;
      if (Math.random() < 0.012) L.g = pick(set);
      clearCell(c * fs, r * fs);
      ctx.fillStyle = rgb(rain.body, 0.22 * L.a); ctx.fillRect(c * fs, r * fs, fs, fs);
      ctx.fillStyle = rgb(rain.head, L.a); ctx.fillText(L.g, c * fs + fs / 2, r * fs);
    }
  }
  function loop(now) {
    if (!rain.running) return;
    if (!rain.last) rain.last = now;
    rain.acc += Math.min(now - rain.last, 200); rain.last = now;
    let n = 0;
    while (rain.acc >= CONFIG.tickMs && n < 3) { tick(); rain.acc -= CONFIG.tickMs; n++; }
    requestAnimationFrame(loop);
  }
  function startRain() {
    if (!ctx || reduceMotion || !rain.enabled || rain.running || document.hidden || !powered) return;
    rain.running = true; rain.last = 0; rain.acc = 0; requestAnimationFrame(loop);
  }
  const stopRain = () => { rain.running = false; };
  function drawStatic() {
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, rain.W, rain.H);
    for (let c = 0; c < rain.cols; c++) {
      const len = (Math.random() * 14) | 0, top = (Math.random() * rain.rows) | 0;
      for (let i = 0; i < len; i++) { ctx.fillStyle = rgb(PALETTE.green.body, 0.12 + (i / len) * 0.4); ctx.fillText(pick(SET_GREEN), c * rain.fs + rain.fs / 2, (top + i) * rain.fs); }
    }
  }
  function setRain(on) {
    rain.enabled = on;
    root.classList.toggle('rain-off', !on);
    const b = $('#rain-toggle');
    if (b) { b.setAttribute('aria-pressed', String(on)); $('.tray__state', b).textContent = on ? 'on' : 'off'; b.title = on ? 'Turn the rain off' : 'Turn the rain on'; }
    store.set('rain', on ? 'on' : 'off');
    if (on) { sizeRain(); startRain(); } else { stopRain(); rain.locked.clear(); rain.mask = null; root.classList.remove('rain-name'); }
  }

  let powered = true;
  if (ctx) {
    rain.enabled = store.get('rain') !== 'off';
    addEventListener('pointermove', (e) => {
      if (e.pointerType !== 'mouse') return;
      const l = toLocal(e.clientX, e.clientY);
      rain.pointer = l.x >= 0 && l.y >= 0 && l.x <= SCREEN.w && l.y <= SCREEN.h ? l : null;
    }, { passive: true });
    document.addEventListener('pointerleave', () => { rain.pointer = null; });
    document.addEventListener('visibilitychange', () => (document.hidden ? stopRain() : startRain()));
    sizeRain();
    root.classList.toggle('rain-off', !rain.enabled);
    $('#rain-toggle')?.setAttribute('aria-pressed', String(rain.enabled));
    if (!rain.enabled) $('.tray__state').textContent = 'off';
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { if (rain.armed) buildMask(); });
  } else root.classList.add('rain-off');
  $('#rain-toggle')?.addEventListener('click', () => setRain(!rain.enabled));

  /* =======================================================
     SCREEN EFFECTS (CRT) LEVEL
     ======================================================= */
  const CRT_LEVELS = ['high', 'low', 'off'];
  const CRT_ROT = { high: '40deg', low: '-15deg', off: '-80deg' };
  let crt = store.get('crt') || (reduceMotion ? 'low' : 'high');
  if (!CRT_LEVELS.includes(crt)) crt = 'high';
  function setCrt(level) {
    crt = level;
    root.dataset.crt = level;
    store.set('crt', level);
    const knob = $('#crt-knob');
    if (knob) { knob.setAttribute('aria-label', `Screen effects: ${level}`); $('.knob__dial', knob).style.setProperty('--rot', CRT_ROT[level]); }
    $$('[data-crt-label]').forEach((s) => { s.textContent = level; });
  }
  setCrt(crt);
  const cycleCrt = () => setCrt(CRT_LEVELS[(CRT_LEVELS.indexOf(crt) + 1) % CRT_LEVELS.length]);
  $('#crt-knob')?.addEventListener('click', cycleCrt);

  /* =======================================================
     APPS
     ======================================================= */
  const APPS = $$('template[id^="app-"]').map((tpl) => ({
    id: tpl.id.slice(4), tpl,
    title: tpl.dataset.title || tpl.id.slice(4), label: tpl.dataset.label || tpl.id.slice(4),
    icon: tpl.dataset.icon || 'doc', w: +tpl.dataset.w || 640, h: +tpl.dataset.h || 480,
    status: tpl.dataset.status || '', scarlet: tpl.dataset.theme === 'scarlet',
  }));
  const APP = Object.fromEntries(APPS.map((a) => [a.id, a]));
  const ALIAS = {
    me: 'about', jobs: 'work', experience: 'work', cv: 'work', awards: 'achievements', hobby: 'hobbies',
    upcoming: 'projects', project: 'projects', 'celestial-avian': 'celestial', game: 'celestial', scarlet: 'celestial',
    contact: 'links', socials: 'links', email: 'links', shell: 'terminal', term: 'terminal',
  };
  const resolveApp = (n) => {
    if (!n) return null;
    const k = n.toLowerCase().replace(/^[~./]+/, '').replace(/\/$/, '').replace(/\.(txt|log|cfg|exe)$/, '');
    return APP[k] ? k : ALIAS[k] || null;
  };

  const iconsEl = $('#icons');
  APPS.forEach((app) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = `icon${app.scarlet ? ' icon--scarlet' : ''}`;
    b.dataset.app = app.id;
    b.innerHTML = `${app.icon === 'bird' ? birdSprite() : pixelSvg(app.icon)}<span class="icon__label"></span>`;
    $('.icon__label', b).textContent = app.label;
    b.addEventListener('click', (e) => { if (e.detail === 0 || isTouch()) openApp(app.id, b); else selectIcons([b]); });
    b.addEventListener('dblclick', () => openApp(app.id, b));
    iconsEl.appendChild(b);
  });
  const deskIcons = () => $$('.icon', iconsEl);
  const selectIcons = (list) => deskIcons().forEach((i) => i.classList.toggle('is-selected', list.includes(i)));
  const setIconOpen = (id, on) => $(`.icon[data-app="${id}"]`, iconsEl)?.classList.toggle('is-open', on);

  /* =======================================================
     VISITOR ACHIEVEMENTS + TOASTS
     ======================================================= */
  const VISITOR = { root: 'Root access', explorer: 'Explorer', power: 'Turn it off and on' };
  const found = new Set((() => { try { return JSON.parse(store.get('found') || '[]'); } catch { return []; } })());
  const opened = new Set();
  const toastsEl = $('#toasts');

  function toast(title, body, icon = 'trophy') {
    const t = document.createElement('div');
    t.className = 'toast';
    t.innerHTML = `${pixelSvg(icon)}<div><p class="toast__t"></p><p class="toast__b"></p></div>`;
    $('.toast__t', t).textContent = title;
    $('.toast__b', t).textContent = body;
    toastsEl.appendChild(t);
    anim(t, [{ clipPath: 'inset(0 0 0 100%)' }, { clipPath: 'inset(0 0 0 0)' }], { duration: 320, easing: 'steps(6)' });
    blinkLed();
    setTimeout(async () => {
      await done(anim(t, [{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'translateX(20px)' }], { duration: 260, fill: 'forwards' }));
      t.remove();
    }, 4800);
  }

  function unlock(key) {
    if (found.has(key) || !VISITOR[key]) return;
    found.add(key);
    store.set('found', JSON.stringify([...found]));
    toast('Achievement unlocked', VISITOR[key]);
    updateSysmon();
    const win = WM.wins.get('achievements');
    if (win) paintVisitor(win.el, key);
  }

  /* =======================================================
     WINDOW MANAGER
     ======================================================= */
  const desk = $('#desk'), layer = $('#windows'), tasksEl = $('#tasks'), fx = $('#fx');
  const WM = { wins: new Map(), z: 10, active: null, cascade: 0 };
  const deskSize = () => ({ w: desk.clientWidth, h: desk.clientHeight });
  const winRect = (W) => ({ x: W.x, y: W.y, w: W.w, h: W.h });
  function applyRect(W) {
    const s = W.el.style;
    s.left = `${W.x}px`; s.top = `${W.y}px`; s.width = `${W.w}px`; s.height = `${W.h}px`;
    const sz = $('.win__size', W.el);
    if (sz) sz.textContent = `${Math.round(W.w)}x${Math.round(W.h)}`;
  }
  function initialRect(app) {
    const D = deskSize();
    if (isPhone()) return { x: 0, y: 0, w: D.w, h: D.h };
    const m = 20; // keep clear of the curved screen edge
    const w = Math.min(app.w, D.w - m * 2), h = Math.min(app.h, D.h - m * 2);
    const icons = localRect(iconsEl);
    const left = icons.x + icons.w + 16;
    let x = Math.max(left, Math.round((D.w - w) / 2));
    let y = Math.max(12, Math.round((D.h - h) / 2) - 12);
    const n = WM.cascade++ % 6;
    x += n * 26; y += n * 22;
    x = clamp(x, m, Math.max(m, D.w - w - m));
    y = clamp(y, m, Math.max(m, D.h - h - m));
    return { x, y, w, h };
  }

  function zoom(from, to, scarlet, dur = 240) {
    if (reduceMotion || !from || !to) return Promise.resolve();
    const steps = 8;
    for (let i = 1; i <= steps; i++) {
      const t = 1 - (1 - i / steps) ** 2;
      const d = document.createElement('div');
      d.className = `zoomrect${scarlet ? ' zoomrect--scarlet' : ''}`;
      Object.assign(d.style, {
        left: `${from.x + (to.x - from.x) * t}px`, top: `${from.y + (to.y - from.y) * t}px`,
        width: `${from.w + (to.w - from.w) * t}px`, height: `${from.h + (to.h - from.h) * t}px`,
      });
      fx.appendChild(d);
      d.animate([{ opacity: 0 }, { opacity: 1, offset: 0.05 }, { opacity: 0 }], { duration: dur * 0.6, delay: (i - 1) * (dur / steps) * 0.7, fill: 'both' }).onfinish = () => d.remove();
    }
    return wait(dur * 0.72);
  }

  const DECODE = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#%&';
  function decode(el, ms = 600) {
    const final = el.dataset.final || el.textContent;
    el.dataset.final = final;
    if (reduceMotion) { el.textContent = final; return; }
    el.setAttribute('aria-label', final);
    const start = performance.now();
    const step = (now) => {
      const p = Math.min(1, (now - start) / ms), n = Math.floor(final.length * p);
      let s = final.slice(0, n);
      for (let i = n; i < final.length; i++) s += final[i] === ' ' ? ' ' : pick(DECODE);
      el.textContent = s;
      if (p < 1) requestAnimationFrame(step); else el.removeAttribute('aria-label');
    };
    requestAnimationFrame(step);
  }

  /* Status bar shows a short loading bar before its text */
  function loadStatus(el, text) {
    const st = $('.win__status-text', el);
    if (reduceMotion) { st.textContent = text; return; }
    let n = 0;
    const iv = setInterval(() => {
      n++;
      st.textContent = `loading ${'#'.repeat(n)}${'.'.repeat(Math.max(0, 8 - n))}`;
      if (n >= 8) { clearInterval(iv); st.textContent = text; }
    }, 45);
  }

  function revealContent(win) {
    const body = $('.win__body', win);
    $$('[data-decode]', body).forEach((el) => decode(el));
    if (reduceMotion) return;
    const items = $$(':scope > *:not(.term), .about__text > *, .log__item, .ach__item, .proc__row, .file-item, .cfg li, .game__main > *, .game__side > *, .game__shots li', body)
      .filter((el) => !el.closest('[hidden]')).slice(0, 36);
    items.forEach((el, i) => el.animate([{ opacity: 0, transform: 'translateY(10px)' }, { opacity: 1, transform: 'none' }],
      { duration: 420, delay: 120 + i * 32, easing: 'cubic-bezier(.16,1,.3,1)', fill: 'backwards' }));
  }

  function buildWindow(app) {
    const el = document.createElement('section');
    el.className = `win${app.scarlet ? ' win--scarlet' : ''}`;
    el.dataset.app = app.id;
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-labelledby', `win-${app.id}-t`);
    el.innerHTML = `
      <header class="win__bar">${pixelSvg(app.icon, 'win__icon')}<p class="win__title" id="win-${app.id}-t"></p>
        <div class="win__ctrl">
          <button type="button" data-act="min" aria-label="Minimize">${SVG.min}</button>
          <button type="button" data-act="max" aria-label="Maximize">${SVG.max}</button>
          <button type="button" data-act="close" aria-label="Close">${SVG.close}</button>
        </div>
      </header>
      <div class="win__body" tabindex="-1"></div>
      <footer class="win__status"><span class="win__status-text"></span><span class="win__size"></span></footer>
      <span class="win__resize" aria-hidden="true">${SVG.grip}</span>`;
    $('.win__title', el).textContent = app.title;
    $('.win__body', el).appendChild(app.tpl.content.cloneNode(true));
    return el;
  }

  async function openApp(id, origin) {
    const app = APP[id];
    if (!app || !powered) return null;
    closeMenu();
    let W = WM.wins.get(id);
    if (W) { if (W.min) await restoreWin(W); else { focusWin(W); nudge(W); } return W; }
    blinkLed();
    document.body.classList.add('is-busy');
    const el = buildWindow(app);
    W = { app, el, min: false, max: false, prev: null, cleanups: [], ...initialRect(app) };
    if (isPhone()) W.max = true;
    WM.wins.set(id, W);
    applyRect(W);
    el.style.visibility = 'hidden';
    layer.appendChild(el);
    wireWindow(W); addTask(W); focusWin(W); setIconOpen(id, true);
    initApp(id, el, W);
    loadStatus(el, $('.win__status-text', el).dataset.text || app.status);

    const from = localRect(origin) || { x: W.x + W.w / 2 - 20, y: W.y + W.h / 2 - 20, w: 40, h: 40 };
    await zoom(from, winRect(W), app.scarlet);
    el.style.visibility = '';
    document.body.classList.remove('is-busy');
    anim(el, [{ clipPath: 'inset(0 0 100% 0)' }, { clipPath: 'inset(0 0 0 0)' }], { duration: 340, easing: 'cubic-bezier(.16,1,.3,1)' });
    revealContent(el);
    ($('[data-autofocus]', el) || $('.win__body', el)).focus({ preventScroll: true });
    updateSysmon();
    opened.add(id);
    if (APPS.every((a) => opened.has(a.id))) unlock('explorer');
    return W;
  }

  const nudge = (W) => anim(W.el, [{ transform: 'none' }, { transform: 'translateX(-6px)' }, { transform: 'translateX(5px)' }, { transform: 'translateX(-3px)' }, { transform: 'none' }], { duration: 260 });

  function focusWin(W) {
    WM.active = W || null;
    if (W) { W.el.style.zIndex = ++WM.z; try { history.replaceState(null, '', `#${W.app.id}`); } catch { /* ignore */ } }
    WM.wins.forEach((w) => { const on = w === WM.active; w.el.classList.toggle('is-active', on); w.task.setAttribute('aria-pressed', String(on && !w.min)); });
    rain.mode = WM.active && !WM.active.min && WM.active.app.scarlet ? 'scarlet' : 'green';
  }
  function topWin() {
    let best = null;
    WM.wins.forEach((w) => { if (!w.min && (!best || +w.el.style.zIndex > +best.el.style.zIndex)) best = w; });
    return best;
  }

  async function closeWin(W, instant) {
    if (!W || W.closing) return;
    W.closing = true;
    W.cleanups.forEach((fn) => fn());
    blinkLed();
    const a = instant ? null : anim(W.el, [
      { transform: 'scale(1,1)', filter: 'brightness(1)' },
      { transform: 'scale(1,.004)', filter: 'brightness(2.5)', offset: 0.55 },
      { transform: 'scale(0,.004)', filter: 'brightness(2.5)' },
    ], { duration: 300, easing: 'cubic-bezier(.5,0,.75,0)', fill: 'forwards' });
    const ta = instant ? null : anim(W.task, [{ opacity: 1 }, { opacity: 0 }], { duration: 200, fill: 'forwards' });
    await Promise.all([done(a), done(ta)]);
    W.el.remove(); W.task.remove();
    WM.wins.delete(W.app.id);
    setIconOpen(W.app.id, false);
    if (WM.active === W) focusWin(topWin());
    if (!instant) $(`.icon[data-app="${W.app.id}"]`, iconsEl)?.focus({ preventScroll: true });
    updateSysmon();
  }

  async function minimizeWin(W) {
    if (W.min) return;
    W.min = true;
    W.task.classList.add('is-min');
    const a = anim(W.el, [{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'scale(.96)' }], { duration: 160 });
    zoom(winRect(W), localRect(W.task), W.app.scarlet, 220);
    await done(a);
    W.el.classList.add('is-min');
    focusWin(WM.active === W ? topWin() : WM.active);
  }
  async function restoreWin(W) {
    W.min = false;
    W.task.classList.remove('is-min');
    focusWin(W);
    await zoom(localRect(W.task), winRect(W), W.app.scarlet, 220);
    W.el.classList.remove('is-min');
    anim(W.el, [{ opacity: 0, transform: 'scale(.96)' }, { opacity: 1, transform: 'none' }], { duration: 200, easing: 'cubic-bezier(.16,1,.3,1)' });
  }
  function toggleMax(W) {
    if (isPhone()) return;
    const D = deskSize();
    W.el.classList.add('is-anim');
    if (!W.max) { W.prev = winRect(W); Object.assign(W, { x: 0, y: 0, w: D.w, h: D.h }); W.max = true; }
    else { Object.assign(W, W.prev || initialRect(W.app)); W.max = false; }
    W.el.classList.toggle('is-max', W.max);
    const b = $('[data-act="max"]', W.el);
    b.innerHTML = W.max ? SVG.restore : SVG.max;
    b.setAttribute('aria-label', W.max ? 'Restore size' : 'Maximize');
    applyRect(W);
    setTimeout(() => W.el.classList.remove('is-anim'), 320);
  }

  function wireWindow(W) {
    const el = W.el, bar = $('.win__bar', el), grip = $('.win__resize', el);
    el.addEventListener('pointerdown', () => { if (WM.active !== W) focusWin(W); }, true);
    el.addEventListener('focusin', () => { if (WM.active !== W) focusWin(W); });
    el.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !e.defaultPrevented) { e.preventDefault(); closeWin(W); } });
    $('[data-act="min"]', el).addEventListener('click', () => minimizeWin(W));
    $('[data-act="max"]', el).addEventListener('click', () => toggleMax(W));
    $('[data-act="close"]', el).addEventListener('click', () => closeWin(W));
    bar.addEventListener('dblclick', (e) => { if (!e.target.closest('button')) toggleMax(W); });

    bar.addEventListener('pointerdown', (e) => {
      if (e.button !== 0 || e.target.closest('button') || isPhone()) return;
      const D = deskSize();
      const start = toLocal(e.clientX, e.clientY);
      if (W.max) {
        const prev = W.prev || initialRect(W.app), ratio = (start.x - W.x) / W.w;
        Object.assign(W, { w: prev.w, h: prev.h, x: start.x - prev.w * ratio, y: 0, max: false });
        el.classList.remove('is-max');
        $('[data-act="max"]', el).innerHTML = SVG.max;
        applyRect(W);
      }
      const ox = W.x, oy = W.y;
      bar.setPointerCapture(e.pointerId);
      el.classList.add('is-dragging');
      const move = (ev) => {
        const p = toLocal(ev.clientX, ev.clientY);
        W.x = clamp(ox + p.x - start.x, 80 - W.w, D.w - 80);
        W.y = clamp(oy + p.y - start.y, 0, D.h - 34);
        el.style.left = `${W.x}px`; el.style.top = `${W.y}px`;
      };
      const up = () => { el.classList.remove('is-dragging'); bar.removeEventListener('pointermove', move); bar.removeEventListener('pointerup', up); bar.removeEventListener('pointercancel', up); };
      bar.addEventListener('pointermove', move); bar.addEventListener('pointerup', up); bar.addEventListener('pointercancel', up);
    });

    grip.addEventListener('pointerdown', (e) => {
      if (e.button !== 0) return;
      e.preventDefault();
      const D = deskSize(), start = toLocal(e.clientX, e.clientY), ow = W.w, oh = W.h;
      grip.setPointerCapture(e.pointerId);
      const move = (ev) => {
        const p = toLocal(ev.clientX, ev.clientY);
        W.w = clamp(ow + p.x - start.x, 300, D.w - W.x);
        W.h = clamp(oh + p.y - start.y, 200, D.h - W.y);
        applyRect(W);
      };
      const up = () => { grip.removeEventListener('pointermove', move); grip.removeEventListener('pointerup', up); };
      grip.addEventListener('pointermove', move); grip.addEventListener('pointerup', up);
    });
  }

  function addTask(W) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = `task${W.app.scarlet ? ' task--scarlet' : ''}`;
    b.innerHTML = `${pixelSvg(W.app.icon)}<span></span>`;
    $('span', b).textContent = W.app.label;
    b.setAttribute('aria-label', W.app.label);
    b.addEventListener('click', () => { if (W.min) restoreWin(W); else if (WM.active === W) minimizeWin(W); else focusWin(W); });
    tasksEl.appendChild(b);
    W.task = b;
    anim(b, [{ opacity: 0, transform: 'translateY(100%)' }, { opacity: 1, transform: 'none' }], { duration: 300, easing: 'cubic-bezier(.16,1,.3,1)' });
  }

  let resizeT;
  addEventListener('resize', () => {
    clearTimeout(resizeT);
    resizeT = setTimeout(() => {
      layoutScreen();
      sizeRain();
      const D = deskSize();
      WM.wins.forEach((W) => {
        if (isPhone() || W.max) Object.assign(W, { x: 0, y: 0, w: D.w, h: D.h });
        else { W.w = Math.min(W.w, D.w - 16); W.h = Math.min(W.h, D.h - 16); W.x = clamp(W.x, 0, D.w - W.w); W.y = clamp(W.y, 0, D.h - W.h); }
        applyRect(W);
      });
    }, 150);
  });

  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-open]');
    if (!b || b.classList.contains('file-item')) return;
    openApp(b.dataset.open, b);
  });

  /* =======================================================
     APP BEHAVIOUR
     ======================================================= */
  function initApp(id, el, W) {
    $$('.copy', el).forEach((btn) => btn.addEventListener('click', async () => {
      let ok = false;
      try { await navigator.clipboard.writeText(btn.dataset.copy); ok = true; } catch {
        const ta = document.createElement('textarea'); ta.value = btn.dataset.copy; ta.style.position = 'fixed'; ta.style.opacity = '0';
        document.body.appendChild(ta); ta.select(); try { ok = document.execCommand('copy'); } catch { ok = false; } ta.remove();
      }
      btn.textContent = ok ? 'Copied' : 'Select it';
      btn.classList.toggle('is-done', ok);
      if (ok) toast('Clipboard', `Copied ${btn.dataset.copy}`, 'doc');
      setTimeout(() => { btn.textContent = 'Copy'; btn.classList.remove('is-done'); }, 1800);
    }));
    if ($('.ach__progress, .proc__bar', el)) setTimeout(() => $('.win__body', el).classList.add('is-filled'), 380);
    if (id === 'achievements') initAchievements(el, W);
    if (id === 'hobbies') initHobbies(el);
    if (id === 'projects') initProjects(el);
    if (id === 'terminal') initTerminal(el, W);
  }

  function hash(str) { let h = 2166136261; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  function countUp(elNum, meter, n, total) {
    const pct = total ? (n / total) * 100 : 0;
    if (reduceMotion) { elNum.textContent = n; if (meter) meter.style.width = `${pct}%`; return; }
    setTimeout(() => {
      const t0 = performance.now();
      const step = (now) => {
        const p = Math.min(1, (now - t0) / 900), e = 1 - (1 - p) ** 3;
        elNum.textContent = Math.round(n * e);
        if (meter) meter.style.width = `${pct * e}%`;
        if (p < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    }, 300);
  }

  function paintVisitor(el, justUnlocked) {
    const items = $$('[data-visitor]', el);
    items.forEach((item) => {
      if (!found.has(item.dataset.visitor)) return;
      item.classList.remove('is-locked');
      $$('.ach__scramble, .ach__sr, .ach__hint-btn, .ach__hint', item).forEach((x) => { x.hidden = true; });
      $$('.ach__real', item).forEach((x) => { x.hidden = false; });
      $('.ach__when', item).textContent = 'found';
      if (item.dataset.visitor === justUnlocked) { item.classList.add('is-new'); decode($('h3 .ach__real', item), 500); }
    });
    const f = $('[data-visitor-found]', el);
    if (f) f.textContent = items.filter((i) => found.has(i.dataset.visitor)).length;
    updateAchStatus(el);
  }
  function updateAchStatus(el) {
    const mine = $$('[data-group="mine"] .ach__item', el);
    const vis = $$('[data-visitor]', el);
    const u = mine.filter((i) => !i.classList.contains('is-locked')).length;
    $('.win__status-text', el).dataset.text = `${u} of ${mine.length} unlocked. ${vis.filter((i) => found.has(i.dataset.visitor)).length} of ${vis.length} secrets found.`;
    if (!$('.win__status-text', el).textContent.startsWith('loading')) $('.win__status-text', el).textContent = $('.win__status-text', el).dataset.text;
  }

  function initAchievements(el, W) {
    $$('.ach__item', el).forEach((item) => {
      const icon = $('.ach__icon', item), h = hash(item.dataset.seed || item.textContent);
      let bit = 0;
      for (let r = 0; r < 5; r++) {
        const row = [0, 1, 2].map(() => (h >> bit++) & 1);
        [row[0], row[1], row[2], row[1], row[0]].forEach((on) => { const i = document.createElement('i'); if (!on) i.className = 'off'; icon.appendChild(i); });
      }
    });
    const mine = $$('[data-group="mine"] .ach__item', el);
    const unlocked = mine.filter((i) => !i.classList.contains('is-locked')).length;
    $('[data-count-total]', el).textContent = mine.length;
    countUp($('[data-count-unlocked]', el), $('[data-meter]', el), unlocked, mine.length);
    $('[data-visitor-total]', el).textContent = $$('[data-visitor]', el).length;
    paintVisitor(el);

    const SCR = KATA + 'ABCDEFGHJKLMNPQRSTUVWXYZ0123456789';
    const run = () => $$('.ach__scramble:not([hidden])', el).forEach((s) => { let o = ''; for (let i = 0; i < (+s.dataset.len || 8); i++) o += pick(SCR); s.textContent = o; });
    run();
    if (!reduceMotion) { const t = setInterval(() => { if (!W.min) run(); }, 110); W.cleanups.push(() => clearInterval(t)); }
    $$('.ach__hint-btn', el).forEach((btn) => btn.addEventListener('click', () => {
      const open = btn.getAttribute('aria-expanded') !== 'true';
      btn.setAttribute('aria-expanded', String(open));
      btn.textContent = open ? 'Hide hint' : 'Show hint';
      const hint = btn.nextElementSibling;
      hint.hidden = !open;
      if (open) anim(hint, [{ opacity: 0, transform: 'translateY(-4px)' }, { opacity: 1, transform: 'none' }], { duration: 220 });
    }));
  }

  function initHobbies(el) {
    $$('.proc__btn', el).forEach((btn) => btn.addEventListener('click', () => {
      const panel = btn.nextElementSibling, open = btn.getAttribute('aria-expanded') !== 'true';
      btn.setAttribute('aria-expanded', String(open));
      panel.hidden = !open;
      if (open) anim(panel, [{ opacity: 0, clipPath: 'inset(0 0 100% 0)' }, { opacity: 1, clipPath: 'inset(0 0 0 0)' }], { duration: 320, easing: 'cubic-bezier(.16,1,.3,1)' });
    }));
  }

  function initProjects(el) {
    const items = $$('.file-item', el);
    items.forEach((item) => {
      const label = item.textContent.trim();
      item.innerHTML = `${pixelSvg(item.dataset.icon || 'doc')}<span></span>`;
      $('span', item).textContent = label;
      const select = () => {
        items.forEach((i) => i.setAttribute('aria-selected', String(i === item)));
        $$('[data-info]', el).forEach((p) => {
          const show = p.dataset.info === item.dataset.item;
          if (show && p.hidden) {
            p.hidden = false;
            $$('h3', p).forEach((h) => decode(h, 420));
            anim(p, [{ opacity: 0, transform: 'translateX(8px)' }, { opacity: 1, transform: 'none' }], { duration: 260, easing: 'cubic-bezier(.16,1,.3,1)' });
          } else if (!show) p.hidden = true;
        });
      };
      item.addEventListener('click', (e) => { select(); if ((e.detail === 0 || isTouch()) && item.dataset.open) openApp(item.dataset.open, item); });
      item.addEventListener('dblclick', () => { if (item.dataset.open) openApp(item.dataset.open, item); });
    });
  }

  /* ---------- Terminal ---------- */
  const cmdHistory = [];
  function initTerminal(el, W) {
    const out = $('.term__out', el), form = $('.term__line', el), input = $('input', form), ghost = $('.term__ghost', el), body = $('.win__body', el);
    input.dataset.autofocus = '';
    $('.term__user', el).textContent = CONFIG.promptUser;
    let hIndex = cmdHistory.length;
    const print = (lines, cls = '') => {
      [].concat(lines).forEach((l) => { const p = document.createElement('p'); if (cls) p.className = cls; p.textContent = l; out.appendChild(p); });
      body.scrollTop = body.scrollHeight;
    };
    const ids = APPS.map((a) => a.id);
    const COMPLETE = ['help', 'ls', 'open ', 'close ', 'clear', 'whoami', 'date', 'rain on', 'rain off', 'crt high', 'crt low', 'crt off', 'sudo hire', 'restart', 'shutdown', 'exit',
      ...ids, ...ids.map((n) => `open ${n}`), ...ids.map((n) => `close ${n}`), 'close all'];
    print(['DevSentinel shell', 'Type help to see what you can do.', '']);

    const run = (raw) => {
      const line = raw.trim();
      print(`$ ${line}`, 'echo');
      if (!line) return;
      blinkLed();
      const [cmd, ...rest] = line.split(/\s+/);
      const arg = rest.join(' ');
      switch (cmd.toLowerCase()) {
        case 'help':
          print(['open <app>     open an app, e.g. open celestial', 'close <app>    close an app, or close all', 'ls             list apps',
            'whoami, date   about me, my local time', 'rain on|off    wallpaper', 'crt high|low|off  screen effects', 'clear, exit, restart, shutdown']);
          return;
        case 'ls': print(APPS.map((a) => a.title).join('   ')); return;
        case 'open': case 'cd': case 'cat': case 'run': case 'start': {
          const id = resolveApp(arg);
          if (id) { print(`opening ${APP[id].title}`, 'ok'); openApp(id, el); } else print(`${cmd}: ${arg || '(nothing)'}: not found. Try ls.`, 'err');
          return;
        }
        case 'close': case 'kill': {
          if (arg === 'all') { WM.wins.forEach((w) => { if (w !== W) closeWin(w); }); print('closed everything else', 'ok'); return; }
          const id = resolveApp(arg);
          if (id && WM.wins.get(id)) { closeWin(WM.wins.get(id)); print(`closed ${APP[id].title}`, 'ok'); } else print(`close: ${arg}: not open`, 'err');
          return;
        }
        case 'whoami': print('DevSentinel. Game developer and programmer from Jakarta, Indonesia.'); return;
        case 'date': print(`${$('#clock')?.textContent} ${CONFIG.timeZoneLabel} where I am`); return;
        case 'rain': setRain(arg === 'on' ? true : arg === 'off' ? false : !rain.enabled); print(`rain ${rain.enabled ? 'on' : 'off'}`, 'ok'); return;
        case 'crt': if (CRT_LEVELS.includes(arg)) setCrt(arg); else cycleCrt(); print(`screen effects ${crt}`, 'ok'); return;
        case 'clear': out.innerHTML = ''; return;
        case 'echo': print(arg); return;
        case 'sudo':
          if (arg.toLowerCase() === 'hire') { print('Permission granted. Opening links.', 'ok'); unlock('root'); openApp('links', el); }
          else print('visitor is not in the sudoers file. This incident will be reported.', 'err');
          return;
        case 'restart': case 'reboot': restart(); return;
        case 'shutdown': case 'poweroff': powerOff(); return;
        case 'exit': case 'quit': closeWin(W); return;
        default: {
          const id = resolveApp(line);
          if (id) { print(`opening ${APP[id].title}`, 'ok'); openApp(id, el); return; }
          print(`command not found: ${cmd}. Type help.`, 'err');
        }
      }
    };
    const suggest = () => { const v = input.value; if (!v) return ''; const hit = COMPLETE.find((c) => c.startsWith(v.toLowerCase()) && c !== v.toLowerCase()); return hit ? v + hit.slice(v.length) : ''; };
    const upd = () => { ghost.textContent = suggest(); };
    input.addEventListener('input', upd);
    input.addEventListener('keydown', (e) => {
      if ((e.key === 'Tab' || (e.key === 'ArrowRight' && input.selectionStart === input.value.length)) && suggest()) { e.preventDefault(); input.value = suggest(); upd(); }
      else if (e.key === 'ArrowUp' && cmdHistory.length) { e.preventDefault(); hIndex = Math.max(0, hIndex - 1); input.value = cmdHistory[hIndex] || ''; upd(); }
      else if (e.key === 'ArrowDown' && cmdHistory.length) { e.preventDefault(); hIndex = Math.min(cmdHistory.length, hIndex + 1); input.value = cmdHistory[hIndex] || ''; upd(); }
      else if (e.key === 'Escape' && input.value) { e.preventDefault(); input.value = ''; upd(); }
    });
    form.addEventListener('submit', (e) => { e.preventDefault(); const v = input.value; if (v.trim()) { cmdHistory.push(v.trim()); hIndex = cmdHistory.length; } input.value = ''; upd(); run(v); });
    $('.term', el).addEventListener('click', () => { if (!getSelection().toString()) input.focus({ preventScroll: true }); });
  }

  /* =======================================================
     START MENU
     ======================================================= */
  const menu = $('#menu'), menuBtn = $('#menu-btn'), menuApps = $('#menu-apps');
  APPS.forEach((app) => {
    const li = document.createElement('li');
    li.innerHTML = `<button type="button" class="${app.scarlet ? 'is-scarlet' : ''}">${pixelSvg(app.icon)}<span></span></button>`;
    $('span', li).textContent = app.label;
    $('button', li).addEventListener('click', (e) => openApp(app.id, e.currentTarget));
    menuApps.appendChild(li);
  });
  function openMenu() {
    menu.hidden = false;
    menuBtn.setAttribute('aria-expanded', 'true');
    anim(menu, [{ clipPath: 'inset(100% 0 0 0)' }, { clipPath: 'inset(0 0 0 0)' }], { duration: 260, easing: 'cubic-bezier(.16,1,.3,1)' });
    $$('.menu__apps li', menu).forEach((li, i) => anim(li, [{ opacity: 0, transform: 'translateX(-8px)' }, { opacity: 1, transform: 'none' }], { duration: 260, delay: 60 + i * 25, fill: 'backwards', easing: 'cubic-bezier(.16,1,.3,1)' }));
    $('button', menuApps)?.focus({ preventScroll: true });
  }
  function closeMenu() { if (menu.hidden) return; menu.hidden = true; menuBtn.setAttribute('aria-expanded', 'false'); }
  menuBtn.addEventListener('click', () => (menu.hidden ? openMenu() : closeMenu()));
  document.addEventListener('pointerdown', (e) => { if (!menu.hidden && !menu.contains(e.target) && !menuBtn.contains(e.target)) closeMenu(); });
  menu.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { closeMenu(); menuBtn.focus(); }
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      const btns = $$('button', menu), i = btns.indexOf(document.activeElement);
      btns[(i + (e.key === 'ArrowDown' ? 1 : -1) + btns.length) % btns.length].focus();
    }
  });
  $('[data-action="crt"]', menu).addEventListener('click', cycleCrt);
  $('[data-action="close-all"]', menu).addEventListener('click', () => { closeMenu(); WM.wins.forEach((w) => closeWin(w)); });
  $('[data-action="restart"]', menu).addEventListener('click', () => { closeMenu(); restart(); });

  /* =======================================================
     CLOCK + SYSTEM MONITOR
     ======================================================= */
  const clock = $('#clock');
  let fmt;
  try { fmt = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: CONFIG.timeZone }); }
  catch { fmt = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit' }); }
  $('#tz-label').textContent = CONFIG.timeZoneLabel;
  $('.tray__clock').title = `My local time (${CONFIG.timeZoneLabel})`;
  const tickClock = () => { clock.textContent = fmt.format(new Date()); };
  tickClock(); setInterval(tickClock, 15000);

  const t0 = Date.now();
  const graph = $('#sm-graph');
  const BARS = 28;
  for (let i = 0; i < BARS; i++) graph.appendChild(document.createElement('i'));
  const samples = Array(BARS).fill(0);
  let activity = 0;
  addEventListener('pointermove', (e) => { activity += Math.min(Math.abs(e.movementX || 0) + Math.abs(e.movementY || 0), 60); }, { passive: true });
  addEventListener('pointerdown', () => { activity += 260; }, { passive: true });
  addEventListener('keydown', () => { activity += 180; }, { passive: true });
  function updateSysmon() {
    const s = Math.floor((Date.now() - t0) / 1000);
    $('#sm-up').textContent = [s / 3600, (s % 3600) / 60, s % 60].map((v) => String(Math.floor(v)).padStart(2, '0')).join(':');
    $('#sm-win').textContent = WM.wins.size;
    $('#sm-glyph').textContent = rain.locked.size;
    $('#sm-found').textContent = `${found.size} of ${Object.keys(VISITOR).length}`;
  }
  setInterval(() => {
    updateSysmon();
    samples.push(Math.min(100, activity / 6)); samples.shift();
    activity *= 0.35;
    [...graph.children].forEach((b, i) => { b.style.height = `${Math.max(2, samples[i])}%`; });
  }, 500);

  /* =======================================================
     DESKTOP: click empty space / drag-select
     ======================================================= */
  const lasso = $('#lasso');
  desk.addEventListener('pointerdown', (e) => {
    if (e.button !== 0 || (e.target !== desk && e.target !== iconsEl && e.target !== layer)) return;
    const s = toLocal(e.clientX, e.clientY);
    let moved = false;
    desk.setPointerCapture(e.pointerId);
    const move = (ev) => {
      const p = toLocal(ev.clientX, ev.clientY);
      const x = Math.min(s.x, p.x), y = Math.min(s.y, p.y), w = Math.abs(p.x - s.x), h = Math.abs(p.y - s.y);
      if (!moved && w + h < 6) return;
      moved = true; lasso.hidden = false;
      Object.assign(lasso.style, { left: `${x}px`, top: `${y}px`, width: `${w}px`, height: `${h}px` });
      selectIcons(deskIcons().filter((i) => { const r = localRect(i); return r.x + r.w > x && r.x < x + w && r.y + r.h > y && r.y < y + h; }));
    };
    const up = () => { lasso.hidden = true; if (!moved) { selectIcons([]); focusWin(null); } desk.removeEventListener('pointermove', move); desk.removeEventListener('pointerup', up); };
    desk.addEventListener('pointermove', move); desk.addEventListener('pointerup', up);
  });

  /* =======================================================
     SCREENSAVER
     ======================================================= */
  const saver = $('#saver'), saverLogo = $('#saver-logo');
  saverLogo.innerHTML = `${pixelSvg('bird')}<span>DevSentinel</span>`;
  let idleT = null, saverRAF = null, booting = false;
  function startSaver() {
    if (!powered || booting || reduceMotion) return;
    saver.hidden = false;
    anim(saver, [{ opacity: 0 }, { opacity: 1 }], { duration: 600 });
    const lw = saverLogo.offsetWidth, lh = saverLogo.offsetHeight;
    let x = Math.random() * (SCREEN.w - lw), y = Math.random() * (SCREEN.h - lh), vx = 1.4, vy = 1.1;
    const step = () => {
      x += vx; y += vy;
      let hit = false;
      if (x <= 0 || x + lw >= SCREEN.w) { vx = -vx; hit = true; x = clamp(x, 0, SCREEN.w - lw); }
      if (y <= 0 || y + lh >= SCREEN.h) { vy = -vy; hit = true; y = clamp(y, 0, SCREEN.h - lh); }
      if (hit) saverLogo.classList.toggle('is-scarlet');
      saverLogo.style.transform = `translate(${x}px, ${y}px)`;
      saverRAF = requestAnimationFrame(step);
    };
    step();
  }
  function stopSaver() { if (saver.hidden) return; saver.hidden = true; cancelAnimationFrame(saverRAF); }
  function resetIdle() { clearTimeout(idleT); stopSaver(); idleT = setTimeout(startSaver, CONFIG.screensaverAfterMs); }
  ['pointermove', 'pointerdown', 'keydown', 'wheel', 'touchstart'].forEach((ev) => addEventListener(ev, resetIdle, { passive: true }));

  /* =======================================================
     GLITCHES (rare, small)
     ======================================================= */
  function scheduleGlitch() {
    setTimeout(() => {
      if (powered && !booting && crt === 'high' && !document.hidden) {
        anim(glass, [{ transform: 'none', filter: 'none' }, { transform: 'translateX(3px) skewX(-.6deg)', filter: 'brightness(1.4)' }, { transform: 'translateX(-2px)', filter: 'none' }, { transform: 'none' }],
          { duration: 180, easing: 'steps(3)' });
      }
      scheduleGlitch();
    }, 9000 + Math.random() * 14000);
  }
  if (!reduceMotion) scheduleGlitch();

  /* =======================================================
     BOOT, POWER, RESTART
     ======================================================= */
  const bootEl = $('#boot'), bootLog = $('#boot-log'), bootFill = $('#boot-fill'), offEl = $('#off'), powerBtn = $('#power');
  const nameText = () => $$('.desk__line').map((l) => l.textContent.trim()).join('');

  function boot() {
    if (reduceMotion) return Promise.resolve();
    booting = true;
    bootEl.hidden = false; bootLog.innerHTML = ''; bootFill.style.width = '0';
    const lines = [
      [`${nameText()} OS`, 'big'], ['BIOS v2.6', ''],
      [`display ${SCREEN.w}x${SCREEN.h} mono`, 'ok'], ['memory check', '640K'], ['loading rain.sys', 'ok'],
      ['mounting ~/portfolio', 'ok'], [`found ${APPS.length} apps`, 'ok'], ['starting desktop', ''],
    ];
    let skip = false;
    return new Promise((resolve) => {
      const finish = async () => {
        if (finish.done) return; finish.done = true;
        removeEventListener('keydown', onSkip); bootEl.removeEventListener('pointerdown', onSkip);
        bootFill.style.width = '100%';
        await done(anim(bootEl, [{ opacity: 1 }, { opacity: 0 }], { duration: 380, easing: 'ease-in' }));
        bootEl.hidden = true; booting = false;
        resolve();
      };
      const onSkip = () => { skip = true; finish(); };
      addEventListener('keydown', onSkip); bootEl.addEventListener('pointerdown', onSkip);
      (async () => {
        for (let i = 0; i < lines.length && !skip; i++) {
          const [txt, tag] = lines[i];
          const p = document.createElement('p');
          if (tag === 'big') { p.className = 'big'; p.textContent = txt; decode(p, 500); }
          else {
            p.textContent = tag ? `${txt} ${'.'.repeat(Math.max(2, 30 - txt.length))} ` : txt;
            if (tag) { const s = document.createElement('span'); s.className = 'ok'; s.textContent = tag; p.appendChild(s); }
          }
          bootLog.appendChild(p);
          blinkLed();
          bootFill.style.width = `${((i + 1) / lines.length) * 100}%`;
          await wait(i === 0 ? 520 : 150 + Math.random() * 140);
        }
        if (!skip) { await wait(260); finish(); }
      })();
    });
  }

  function desktopIntro(welcome) {
    anim($('#taskbar'), [{ transform: 'translateY(100%)' }, { transform: 'none' }], { duration: 420, easing: 'cubic-bezier(.16,1,.3,1)' });
    deskIcons().forEach((i, n) => anim(i, [{ opacity: 0, transform: 'translateY(12px)' }, { opacity: 1, transform: 'none' }], { duration: 420, delay: 120 + n * 55, easing: 'cubic-bezier(.16,1,.3,1)', fill: 'backwards' }));
    anim($('#sysmon'), [{ clipPath: 'inset(0 0 100% 0)' }, { clipPath: 'inset(0 0 0 0)' }], { duration: 500, delay: 500, easing: 'steps(8)', fill: 'backwards' });
    $$('.desk__about p').forEach((p, n) => anim(p, [{ opacity: 0, transform: 'translateX(12px)' }, { opacity: 1, transform: 'none' }], { duration: 500, delay: 900 + n * 120, easing: 'cubic-bezier(.16,1,.3,1)', fill: 'backwards' }));
    armName();
    if (welcome) setTimeout(() => toast('Welcome', isTouch() ? 'Tap an icon to open an app.' : 'Double-click an icon to open an app.', 'term'), 1800);
    resetIdle();
  }

  const crtOff = (target) => done(anim(target, [
    { transform: 'scale(1,1)', filter: 'brightness(1)' },
    { transform: 'scale(1,.004)', filter: 'brightness(3)', offset: 0.6 },
    { transform: 'scale(0,.004)', filter: 'brightness(3)' },
  ], { duration: 420, easing: 'cubic-bezier(.5,0,.75,0)' }));
  const crtOn = (target) => done(anim(target, [
    { transform: 'scale(0,.004)', filter: 'brightness(3)' },
    { transform: 'scale(1,.004)', filter: 'brightness(3)', offset: 0.35 },
    { transform: 'scale(1,1)', filter: 'brightness(1)' },
  ], { duration: 460, easing: 'cubic-bezier(.16,1,.3,1)' }));

  function resetDesktop() {
    WM.wins.forEach((w) => closeWin(w, true));
    closeMenu(); stopSaver();
    rain.locked.clear(); rain.mask = null; root.classList.remove('rain-name');
    if (ctx) { ctx.fillStyle = '#000'; ctx.fillRect(0, 0, rain.W, rain.H); }
  }

  async function powerOff() {
    if (!powered) return;
    resetDesktop();
    await crtOff(glass);
    powered = false;
    offEl.hidden = false;
    root.classList.add('is-off');
    stopRain(); clearTimeout(idleT);
    led.classList.remove('is-on'); led.classList.add('is-standby');
    powerBtn.setAttribute('aria-pressed', 'false');
    powerBtn.setAttribute('aria-label', 'Turn the screen on');
  }
  async function powerOn() {
    if (powered) return;
    powered = true;
    offEl.hidden = true;
    root.classList.remove('is-off');
    led.classList.remove('is-standby'); led.classList.add('is-on');
    powerBtn.setAttribute('aria-pressed', 'true');
    powerBtn.setAttribute('aria-label', 'Turn the screen off');
    startRain();
    await crtOn(glass);
    await boot();
    desktopIntro(false);
    unlock('power');
  }
  powerBtn.addEventListener('click', () => (powered ? powerOff() : powerOn()));

  async function restart() {
    resetDesktop();
    await crtOff(glass);
    await crtOn(glass);
    await boot();
    desktopIntro(false);
  }

  addEventListener('hashchange', () => { const id = resolveApp(location.hash.slice(1)); if (id && !WM.wins.get(id)) openApp(id); });

  async function start() {
    led.classList.add('is-on');
    startRain();
    const where = CONFIG.bootEverySession ? ss : undefined;
    const firstBoot = !store.get('booted', where);
    await crtOn(glass);
    if (firstBoot) { store.set('booted', '1', where); await boot(); }
    desktopIntro(firstBoot);
    const id = resolveApp(location.hash.slice(1));
    if (id) setTimeout(() => openApp(id, $(`.icon[data-app="${id}"]`, iconsEl)), 400);
  }
  start();
})();
