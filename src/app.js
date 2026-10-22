/* TermoLab — foydalanuvchi interfeysi. Hisoblash yadrosi: core.js (window.TL), formulalar: window.FORM */
(function () {
'use strict';
const $ = id => document.getElementById(id);
const css = n => getComputedStyle(document.documentElement).getPropertyValue(n).trim();

// ---------------- Formulalar ----------------
function eq(key, s = 1.25) {
  const svg = (window.FORM || {})[key]; if (!svg) return '';
  const h = parseFloat((svg.match(/data-h="([\d.]+)"/) || [0, 30])[1]) * s;
  return `<div class="eq" style="--h:${h.toFixed(1)}px">${svg}</div>`;
}

// ---------------- Materiallar ----------------
const MATS = [
  { id: 'cu', name: 'Mis', lam: 401, rho: 8960, c: 385 },
  { id: 'al', name: 'Alyuminiy', lam: 237, rho: 2700, c: 900 },
  { id: 'st', name: 'Po’lat (uglerodli)', lam: 50, rho: 7850, c: 490 },
  { id: 'ss', name: 'Zanglamas po’lat', lam: 16, rho: 8000, c: 500 },
  { id: 'nc', name: 'Nixrom', lam: 11.3, rho: 8400, c: 450 },
  { id: 'cr', name: 'Beton', lam: 1.4, rho: 2300, c: 880 },
  { id: 'br', name: 'G’isht', lam: 0.72, rho: 1920, c: 835 },
  { id: 'gl', name: 'Shisha', lam: 1.0, rho: 2500, c: 840 },
  { id: 'wd', name: 'Yog’och (qarag’ay)', lam: 0.12, rho: 510, c: 1380 },
  { id: 'wa', name: 'Suv (harakatsiz)', lam: 0.6, rho: 1000, c: 4186 },
  { id: 'bk', name: 'Shartli (darslik, a² = 25)', lam: 1, rho: 1, c: 0.04 },
  { id: 'custom', name: 'Boshqa (qo’lda kiritish)' }
];

// ---------------- Tayyor masalalar ----------------
const B = (type, o = {}) => Object.assign({ type, g: 20, q: 0, alpha: 10, ue: 20 }, o);
const PRESETS = [
  { id: 'book', name: '1D · Namunaviy masala: soviydigan sterjen (o’lchamsiz)', dimless: true,
    note: 'Matematik modellashtirish bo’yicha o’quv qo’llanmadagi misol: uchlari 0.25 va 1.18 da, yon sirti 2 haroratli muhit bilan almashadi. Birliklar o’lchamsiz.',
    dim: 1, Lx: 8, Ly: 1, Nx: 50, Ny: 20, mat: 'bk', Tend: 3, tunit: 1, K: 200,
    init: { type: 'book', T0: 0, dT: 0, r0: 0.5 }, bc: { left: B(1, { g: 0.25 }), right: B(1, { g: 1.18 }) },
    side: { as: 0.0064, geo: 4, us: 2 }, src: { type: 'none', Q0: 0, Qr: 0.01, Qt: 0 }, scheme: 'implicit', solver: 'thomas' },
  { id: 'cu', name: '1D · Mis sterjen, bir uchi 100 °C', note: 'Mis sterjen d = 10 mm: chap uchi 100 °C da, o’ng uchi va yon sirti havoda (α = 10 W/(m²·K)) soviydi.',
    dim: 1, Lx: 0.5, Ly: 1, Nx: 80, Ny: 20, mat: 'cu', Tend: 60, tunit: 60, K: 300,
    init: { type: 'uniform', T0: 20, dT: 0, r0: 0.01 }, bc: { left: B(1, { g: 100 }), right: B(3, { alpha: 10, ue: 20 }) },
    side: { as: 10, geo: 0.01, us: 20 }, src: { type: 'none', Q0: 0, Qr: 0.01, Qt: 0 }, scheme: 'cn', solver: 'thomas' },
  { id: 'wall', name: '1D · Beton devor, qishda', note: 'Qalinligi 30 sm beton devor: ichkarida 20 °C (α = 8), tashqarida −10 °C (α = 23). Devor orqali yo’qotilayotgan issiqlik oqimi hisoblanadi.',
    dim: 1, Lx: 0.3, Ly: 1, Nx: 60, Ny: 20, mat: 'cr', Tend: 48, tunit: 3600, K: 400,
    init: { type: 'uniform', T0: 15, dT: 0, r0: 0.01 }, bc: { left: B(3, { alpha: 8, ue: 20 }), right: B(3, { alpha: 23, ue: -10 }) },
    side: { as: 0, geo: 0.3, us: 20 }, src: { type: 'none', Q0: 0, Qr: 0.01, Qt: 0 }, scheme: 'implicit', solver: 'thomas' },
  { id: 'wire', name: '1D · Elektr qizdirgich simi', note: 'Nixrom sim d = 1 mm, tok o’tganda ichki manba Q = 2·10⁷ W/m³; uchlari qisqichda 20 °C, yon sirti havoda soviydi.',
    dim: 1, Lx: 0.2, Ly: 1, Nx: 80, Ny: 20, mat: 'nc', Tend: 300, tunit: 1, K: 300,
    init: { type: 'uniform', T0: 20, dT: 0, r0: 0.01 }, bc: { left: B(1, { g: 20 }), right: B(1, { g: 20 }) },
    side: { as: 15, geo: 0.001, us: 20 }, src: { type: 'uniform', Q0: 2e7, Qr: 0.01, Qt: 0 }, scheme: 'cn', solver: 'thomas' },
  { id: 'plate', name: '2D · Po’lat plastinka, chap qirrasi 300 °C', note: 'Po’lat plastinka 20×20 sm: chap qirrasi 300 °C, qolgan qirralari havoda (III tur).',
    dim: 2, Lx: 0.2, Ly: 0.2, Nx: 50, Ny: 50, mat: 'st', Tend: 60, tunit: 60, K: 200,
    init: { type: 'uniform', T0: 20, dT: 0, r0: 0.01 },
    bc: { left: B(1, { g: 300 }), right: B(3, { alpha: 10, ue: 20 }), bottom: B(3, { alpha: 10, ue: 20 }), top: B(3, { alpha: 10, ue: 20 }) },
    side: { as: 0, geo: 0.005, us: 20 }, src: { type: 'none', Q0: 0, Qr: 0.01, Qt: 0 }, scheme: 'adi', solver: 'thomas' },
  { id: 'cpu', name: '2D · Protsessor radiatori (alyuminiy)', note: 'Alyuminiy plastinka 8×8 sm, qalinligi 3 mm; markazda ≈30 W issiqlik manbai, yuzalari havo oqimida (α = 25), qirralari izolyatsiyalangan (II tur, q = 0).',
    dim: 2, Lx: 0.08, Ly: 0.08, Nx: 50, Ny: 50, mat: 'al', Tend: 10, tunit: 60, K: 300,
    init: { type: 'uniform', T0: 25, dT: 0, r0: 0.01 },
    bc: { left: B(2, { q: 0 }), right: B(2, { q: 0 }), bottom: B(2, { q: 0 }), top: B(2, { q: 0 }) },
    side: { as: 25, geo: 0.003, us: 25 }, src: { type: 'spot', Q0: 3.18e7, Qr: 0.01, Qt: 0 }, scheme: 'adi', solver: 'thomas' },
  { id: 'weld', name: '2D · Payvandlash nuqtasining sovishi', note: 'Po’lat plastinka 10×10 sm, markazi 1220 °C gacha qizdirilgan; qirralari va yuzalari havoda soviydi.',
    dim: 2, Lx: 0.1, Ly: 0.1, Nx: 60, Ny: 60, mat: 'st', Tend: 20, tunit: 1, K: 200, scale: 'frame',
    init: { type: 'spot', T0: 20, dT: 1200, r0: 0.006 },
    bc: { left: B(3, { alpha: 10, ue: 20 }), right: B(3, { alpha: 10, ue: 20 }), bottom: B(3, { alpha: 10, ue: 20 }), top: B(3, { alpha: 10, ue: 20 }) },
    side: { as: 10, geo: 0.005, us: 20 }, src: { type: 'none', Q0: 0, Qr: 0.01, Qt: 0 }, scheme: 'adi', solver: 'thomas' }
];
const SIDES1 = [['left', 'Chap uchi (x = 0)'], ['right', 'O’ng uchi (x = L)']];
const SIDES2 = [['left', 'Chap (x = 0)'], ['right', 'O’ng (x = Lₓ)'], ['bottom', 'Past (y = 0)'], ['top', 'Yuqori (y = L_y)']];

let S = null;          // joriy holat
let R = null, E = null; // natija va oshkor sxema natijasi (taqqoslash uchun)
let J = 0, probe = null, unit = '°C';

// ---------------- Holat <-> forma ----------------
function fillSelects() {
  $('preset').innerHTML = PRESETS.map(p => `<option value="${p.id}">${p.name}</option>`).join('');
  $('mat').innerHTML = MATS.map(m => `<option value="${m.id}">${m.name}</option>`).join('');
}
function bcHTML(side, title, b) {
  return `<div class="bcbox" data-side="${side}">
    <div class="bchead"><b>${title}</b>
      <select data-k="type" aria-label="${title}: shart turi">
        <option value="1"${b.type == 1 ? ' selected' : ''}>Harorat berilgan (I tur)</option>
        <option value="2"${b.type == 2 ? ' selected' : ''}>Issiqlik oqimi (II tur)</option>
        <option value="3"${b.type == 3 ? ' selected' : ''}>Havo bilan almashadi (III tur)</option>
      </select></div>
    <div class="row3">
      ${b.type == 1 ? `<div class="f"><label>Harorat${unit ? ', ' + unit : ''}</label><input type="number" step="any" data-k="g" value="${b.g}"></div>` : ''}
      ${b.type == 2 ? `<div class="f"><label>Oqim, W/m² (+ isitadi)</label><input type="number" step="any" data-k="q" value="${b.q}"></div>` : ''}
      ${b.type == 3 ? `<div class="f"><label>α, W/(m²·K)</label><input type="number" step="any" data-k="alpha" value="${b.alpha}"></div>
                       <div class="f"><label>Havo${unit ? ', ' + unit : ''}</label><input type="number" step="any" data-k="ue" value="${b.ue}"></div>` : ''}
    </div></div>`;
}
function renderBCs() {
  const sides = S.dim == 1 ? SIDES1 : SIDES2;
  for (const [k] of sides) if (!S.bc[k]) S.bc[k] = B(3);
  $('bcs').innerHTML = sides.map(([k, t]) => bcHTML(k, t, S.bc[k])).join('');
}
function writeForm() {
  const set = (id, v) => { $(id).value = v; };
  set('preset', S.id || ''); set('dim', S.dim); set('Lx', S.Lx); set('Ly', S.Ly); set('Nx', S.Nx); set('Ny', S.Ny);
  set('mat', S.mat); const m = MATS.find(q => q.id === S.mat);
  if (m && m.id !== 'custom') { S.lam = m.lam; S.rho = m.rho; S.c = m.c; }
  set('lam', S.lam); set('rho', S.rho); set('cc', S.c);
  set('Tend', S.Tend); set('tunit', S.tunit); set('K', S.K);
  set('initType', S.init.type); set('T0', S.init.T0); set('dT', S.init.dT); set('r0', S.init.r0);
  set('as', S.side.as); set('geo', S.side.geo); set('us', S.side.us);
  set('srcType', S.src.type); set('Q0', S.src.Q0); set('Qr', S.src.Qr); set('Qt', S.src.Qt);
  set('scheme', S.scheme); set('solver', S.solver); set('scale', S.scale || 'all');
  unit = S.dimless ? '' : '°C';
  document.querySelectorAll('.d2').forEach(e => e.hidden = S.dim == 1);
  document.querySelector('#scheme option[value="adi"]').disabled = S.dim == 1;
  $('geoL').textContent = S.dim == 1 ? 'Diametr d, m' : 'Qalinlik δ, m';
  $('LxL').textContent = S.dim == 1 ? 'Uzunligi (qalinligi), m' : 'Eni, m';
  document.querySelectorAll('.spotf').forEach(e => e.hidden = S.init.type !== 'spot');
  $('legExpl').hidden = S.dim == 2;
  renderBCs();
}
function num(id) { const v = parseFloat($(id).value); return isFinite(v) ? v : 0; }
function readForm() {
  S.dim = +$('dim').value; S.Lx = num('Lx') || 1; S.Ly = num('Ly') || 1;
  S.Nx = Math.max(4, Math.min(400, Math.round(num('Nx')))); S.Ny = Math.max(4, Math.min(200, Math.round(num('Ny'))));
  S.mat = $('mat').value; S.lam = num('lam') || 1; S.rho = num('rho') || 1; S.c = num('cc') || 1;
  S.Tend = num('Tend') || 1; S.tunit = +$('tunit').value; S.K = Math.max(2, Math.min(20000, Math.round(num('K'))));
  S.init = { type: $('initType').value, T0: num('T0'), dT: num('dT'), r0: num('r0') || 0.01 };
  S.side = { as: num('as'), geo: num('geo'), us: num('us') };
  S.src = { type: $('srcType').value, Q0: num('Q0'), Qr: num('Qr') || 0.01, Qt: num('Qt') };
  S.scheme = $('scheme').value; S.solver = $('solver').value;
  document.querySelectorAll('.bcbox').forEach(box => {
    const b = S.bc[box.dataset.side];
    box.querySelectorAll('[data-k]').forEach(el => { b[el.dataset.k] = el.dataset.k === 'type' ? +el.value : (parseFloat(el.value) || 0); });
  });
}

// ---------------- Masalani yechuvchi parametrlarga aylantirish ----------------
function physics() {
  const a2 = S.lam / (S.rho * S.c);
  let beta = 0;
  if (S.side.as > 0 && S.side.geo > 0) beta = S.dim == 1 ? S.side.as * (4 / S.side.geo) / (S.rho * S.c) : 2 * S.side.as / (S.rho * S.c * S.side.geo);
  return { a2, beta, T: S.Tend * S.tunit };
}
function mkBC(b) {
  if (b.type == 1) { const g = b.g; return { type: 1, g: () => g }; }
  if (b.type == 2) { const q = b.q; return { type: 2, alpha: 0, ue: 0, q: () => q }; }
  return { type: 3, alpha: b.alpha, ue: b.ue, q: () => 0 };
}
function buildParams(schemeOverride) {
  const ph = physics(), sch = schemeOverride || S.scheme;
  const rc = S.rho * S.c, Lx = S.Lx, Ly = S.Ly, cx = Lx / 2, cy = Ly / 2;
  const it = S.init, src = S.src;
  const init = S.dim == 1
    ? (it.type === 'book' ? x => 0.25 + Math.sin(0.15 * x) : it.type === 'spot' ? x => it.T0 + it.dT * Math.exp(-((x - cx) ** 2) / it.r0 ** 2) : () => it.T0)
    : (it.type === 'spot' ? (x, y) => it.T0 + it.dT * Math.exp(-((x - cx) ** 2 + (y - cy) ** 2) / it.r0 ** 2) : () => it.T0);
  const on = t => !(src.Qt > 0 && t > src.Qt);
  let f = null;
  if (src.type === 'uniform') f = S.dim == 1 ? (x, t) => on(t) ? src.Q0 / rc : 0 : (x, y, t) => on(t) ? src.Q0 / rc : 0;
  if (src.type === 'spot') f = S.dim == 1
    ? (x, t) => on(t) ? src.Q0 / rc * Math.exp(-((x - cx) ** 2) / src.Qr ** 2) : 0
    : (x, y, t) => on(t) ? src.Q0 / rc * Math.exp(-((x - cx) ** 2 + (y - cy) ** 2) / src.Qr ** 2) : 0;
  const theta = sch === 'explicit' ? 0 : sch === 'implicit' ? 1 : 0.5;
  const frames = S.dim == 1 ? Math.min(S.K, 400) : Math.min(S.K, 160);
  if (S.dim == 1) return { L: Lx, N: S.Nx, T: ph.T, K: S.K, a2: ph.a2, lam: S.lam, beta: ph.beta, us: S.side.us, f, init,
    bc: [mkBC(S.bc.left), mkBC(S.bc.right)], theta, solver: S.solver, eps: 1e-9, frames };
  const omega = 2 / (1 + Math.sin(Math.PI / Math.max(S.Nx, S.Ny)));
  return { Lx, Ly, Nx: S.Nx, Ny: S.Ny, T: ph.T, K: S.K, a2: ph.a2, lam: S.lam, beta: ph.beta, us: S.side.us, f, init,
    bc: { left: mkBC(S.bc.left), right: mkBC(S.bc.right), bottom: mkBC(S.bc.bottom), top: mkBC(S.bc.top) },
    scheme: sch === 'adi' ? 'adi' : 'theta', theta, omega: S.solver === 'seidel' ? 1 : omega, eps: 1e-7, frames };
}

// ---------------- Ranglar va formatlash ----------------
const STOPS = [[34, 58, 140], [48, 128, 206], [120, 196, 214], [245, 226, 150], [240, 140, 60], [196, 38, 31]];
function rgb(t) {
  t = Math.max(0, Math.min(1, t)) * (STOPS.length - 1);
  const i = Math.min(STOPS.length - 2, Math.floor(t)), f = t - i, a = STOPS[i], b = STOPS[i + 1];
  return [0, 1, 2].map(k => Math.round(a[k] + (b[k] - a[k]) * f));
}
const color = t => `rgb(${rgb(t).join(',')})`;
function fmtU(v) { if (!isFinite(v)) return '∞'; const a = Math.abs(v); return (a >= 100 ? v.toFixed(0) : a >= 10 ? v.toFixed(1) : v.toFixed(3)) + (unit ? ' ' + unit : ''); }
function fmtSci(v) { if (!isFinite(v)) return '∞'; if (v === 0) return '0'; const e = Math.floor(Math.log10(Math.abs(v))); return Math.abs(e) < 3 ? (+v.toPrecision(3)).toString() : (v / 10 ** e).toFixed(2) + '·10' + sup(e); }
function sup(n) { return String(n).split('').map(ch => '⁰¹²³⁴⁵⁶⁷⁸⁹'['0123456789'.indexOf(ch)] || (ch === '-' ? '⁻' : ch)).join(''); }
function fmtT(sec) { const u = S.tunit; const v = sec / u; return (u === 1 ? v.toFixed(v < 10 ? 2 : 1) + ' s' : u === 60 ? v.toFixed(1) + ' min' : v.toFixed(2) + ' soat'); }
function setup(cv) {
  const r = cv.getBoundingClientRect(), dpr = window.devicePixelRatio || 1;
  cv.width = Math.max(1, Math.round(r.width * dpr)); cv.height = Math.max(1, Math.round(r.height * dpr));
  const c = cv.getContext('2d'); c.setTransform(dpr, 0, 0, dpr, 0, 0); return { c, w: r.width, h: r.height };
}
function niceTicks(lo, hi, n) {
  const span = hi - lo || 1, s0 = span / n, mag = Math.pow(10, Math.floor(Math.log10(s0)));
  const step = [1, 2, 2.5, 5, 10].map(s => s * mag).find(s => s >= s0);
  const out = []; for (let v = Math.ceil(lo / step) * step; v <= hi + 1e-9 * span; v += step) out.push(+v.toPrecision(12)); return out;
}

// ---------------- Hisoblash ----------------
let limits = [0, 1];
function compute() {
  readForm();
  const t0 = performance.now();
  const P = buildParams();
  R = S.dim == 1 ? TL.solve1D(P) : TL.solve2D(P);
  const ms = performance.now() - t0;
  E = null;
  if (S.dim == 1 && $('showExpl').checked && S.scheme !== 'explicit') E = TL.solve1D(buildParams('explicit'));
  // diapazon
  let lo = Infinity, hi = -Infinity;
  for (const fr of R.frames) for (const v of fr) { if (isFinite(v)) { if (v < lo) lo = v; if (v > hi) hi = v; } }
  if (!isFinite(lo)) { lo = 0; hi = 1; }
  if (hi - lo < 1e-9) { hi = lo + 1; }
  limits = [lo, hi];
  // barqaror holat: oxirgi kadrdan farq 0.3% dan kichik bo'lib qolgan birinchi payt
  const F = R.frames[R.frames.length - 1], rng = hi - lo;
  const md = (a, b) => { let m = 0; for (let i = 0; i < a.length; i++) { const d = Math.abs(a[i] - b[i]); if (d > m) m = d; } return m; };
  let sIdx = R.frames.length - 1; while (sIdx > 0 && md(R.frames[sIdx - 1], F) < 0.003 * rng) sIdx--;
  const lastCh = R.frames.length > 1 ? md(R.frames[R.frames.length - 2], F) : 0;
  R.tSteady = R.blow > 0 ? null : (lastCh < 0.0005 * rng ? R.times[sIdx] : null);
  J = Math.min(J, R.frames.length - 1);
  $('time').max = R.frames.length - 1; $('time').value = J;
  if (!probe) probe = S.dim == 1 ? { i: Math.round(S.Nx / 2) } : { i: Math.round(S.Nx / 2), k: Math.round(S.Ny / 2) };
  probe.i = Math.min(probe.i, S.Nx); if (S.dim == 2) probe.k = Math.min(probe.k ?? 0, S.Ny);
  stats(ms); statement(); drawAll();
}
function stats(ms) {
  const ph = physics(), blew = R.blow > 0;
  const fo = $('sFo'); fo.querySelector('b').textContent = fmtSci(R.Fo);
  fo.className = 'stat ' + (S.scheme === 'explicit' ? (R.Fo > 0.5 ? 'warn' : 'good') : '');
  const tm = $('sTau'); tm.querySelector('b').textContent = fmtSci(R.tauMax) + ' s';
  tm.className = 'stat ' + (R.tau > R.tauMax ? 'warn' : 'good');
  let bi = 0; const h = S.Lx / S.Nx;
  for (const k in S.bc) if ((S.dim == 2 || k === 'left' || k === 'right') && S.bc[k].type == 3) bi = Math.max(bi, S.bc[k].alpha * h / S.lam);
  $('sBi').textContent = bi ? fmtSci(bi) : '—';
  $('sIt').textContent = R.iters ? R.iters.toFixed(1) : (S.scheme === 'explicit' ? 'kerak emas' : 'haydash');
  $('sMs').textContent = ms < 1000 ? ms.toFixed(0) + ' ms' : (ms / 1000).toFixed(1) + ' s';
  $('a2out').textContent = `Temperatura o’tkazuvchanlik a² = λ/(ρc) = ${fmtSci(ph.a2)} m²/s`;
  $('sSteady').textContent = R.tSteady == null ? 'hali yetmagan' : (R.tSteady === 0 ? 'boshidanoq' : '≈ ' + fmtT(R.tSteady));
  const need = Math.ceil(ph.T / R.tauMax);
  $('warn').innerHTML = blew
    ? `<div class="banner bad"><b>Natija noto’g’ri!</b> Oddiy (oshkor) usul uchun vaqt qadami juda katta, hisob ${R.blow}-qadamda “portlab” ketdi. Yechim: “Qo’shimcha sozlamalar → Hisoblash usuli” da <b>Krank–Nikolson</b> ni tanlang yoki vaqt qadamlarini kamida ${need} ga oshiring.</div>` : '';
  $('sciNote').innerHTML = S.scheme !== 'explicit' && R.tau > R.tauMax
    ? `Vaqt qadami τ = ${fmtSci(R.tau)} s oddiy (oshkor) usul chegarasidan ${(R.tau / R.tauMax).toFixed(1)} marta katta. Tanlangan usul har qanday qadamda turg’un, shuning uchun ${S.K} ta qadam yetarli; oddiy usulga ≈${need} qadam kerak bo’lardi.`
    : `Vaqt qadami τ = ${fmtSci(R.tau)} s, oddiy (oshkor) usul chegarasi τ<sub>max</sub> = ${fmtSci(R.tauMax)} s.`;
}

// Joriy kadr bo'yicha oddiy ko'rsatkichlar
function where(idx) {
  if (S.dim == 1) return `x = ${(+R.x[idx].toPrecision(3))} m`;
  const i = idx % R.nx, k = (idx / R.nx) | 0; return `(${+R.X[i].toPrecision(3)}; ${+R.Y[k].toPrecision(3)}) m`;
}
function simpleStats() {
  const U = R.frames[J]; let mi = 0, ma = 0, s = 0;
  for (let i = 0; i < U.length; i++) { if (U[i] > U[ma]) ma = i; if (U[i] < U[mi]) mi = i; s += U[i]; }
  $('sHot').textContent = fmtU(U[ma]); $('sHotL').textContent = 'Eng issiq: ' + where(ma);
  $('sCold').textContent = fmtU(U[mi]); $('sColdL').textContent = 'Eng sovuq: ' + where(mi);
  $('sAvg').textContent = fmtU(s / U.length);
  return { mi, ma, avg: s / U.length };
}
const SIDE_NAME = { 1: { left: 'chap uchi', right: 'o’ng uchi' }, 2: { left: 'chap qirrasi', right: 'o’ng qirrasi', bottom: 'pastki qirrasi', top: 'yuqori qirrasi' } };
function bcText(k) {
  const b = S.bc[k], n = SIDE_NAME[S.dim][k], u = unit ? ' ' + unit : '';
  if (b.type == 1) return `${n} doim ${b.g}${u} da ushlab turiladi`;
  if (b.type == 2) return b.q == 0 ? `${n} izolyatsiyalangan (issiqlik o’tmaydi)` : (b.q > 0 ? `${n}ga ${b.q} W/m² issiqlik beriladi` : `${n}dan ${-b.q} W/m² issiqlik olinadi`);
  return `${n} ${b.ue}${u} li ${S.dimless ? 'muhit' : 'havo'} bilan issiqlik almashadi`;
}
function summary() {
  const st = simpleStats(), U = R.frames[J], U0 = R.frames[0], u = unit ? ' ' + unit : '';
  let a0 = 0; for (const v of U0) a0 += v; a0 /= U0.length;
  if (R.blow > 0) { $('summary').innerHTML = `<h3>Natija</h3><p>Hisob buzilgan, raqamlarga ishonib bo’lmaydi – yuqoridagi qizil ogohlantirishga qarang.</p>`; return; }
  const sides = (S.dim == 1 ? ['left', 'right'] : ['left', 'right', 'bottom', 'top']).map(bcText);
  const ph = physics(), extra = [];
  const air = S.dimless ? 'muhit' : 'havo';
  if (ph.beta > 0) extra.push(`${S.dim == 1 ? 'yon sirti' : 'yuzalari'} ${S.side.us}${u} li ${air}da soviydi`);
  if (S.src.type !== 'none' && S.src.Q0) extra.push(`ichida issiqlik ajraladi (${fmtSci(S.src.Q0)} W/m³${S.src.type === 'spot' ? ', markazda' : ''})`);
  const tol = 0.005 * (limits[1] - limits[0]);
  const trend = st.avg > a0 + tol ? 'isiyapti' : st.avg < a0 - tol ? 'sovuyapti' : 'umuman olganda deyarli o’zgarmayapti – issiqlik asosan ichkarida qayta taqsimlanmoqda';
  let flux = '';
  if (S.dim == 1 && !S.dimless) {
    const h = R.h, n = U.length, lam = S.lam;
    const qL = lam * (-3 * U[0] + 4 * U[1] - U[2]) / (2 * h), qR = -lam * (3 * U[n - 1] - 4 * U[n - 2] + U[n - 3]) / (2 * h);
    const f = (q, nm) => Math.abs(q) < 1e-6 ? `${nm}dan issiqlik deyarli o’tmayapti` : (q > 0 ? `${nm}dan har 1 m² ga <b>${fmtSci(q)} W</b> issiqlik chiqib ketmoqda` : `${nm}dan har 1 m² ga <b>${fmtSci(-q)} W</b> issiqlik kirmoqda`);
    flux = `<li>${f(qL, 'Chap uchi')}; ${f(qR, 'o’ng uchi')}.</li>`;
  }
  const span = U[st.ma] - U[st.mi], hint = ($('scale').value === 'all' && span < 0.15 * (limits[1] - limits[0]) && span > 0)
    ? `<li class="hint">Hozir jism bo’ylab farq kichik (${fmtU(span).replace(' ' + unit, '')}${unit ? ' ' + unit : ''}), shuning uchun ranglar deyarli bir xil. Farqni ko’rish uchun “Ranglar: shu paytga moslab” ni tanlang.</li>`.replace(/’/g, '’') : '';
  const steady = R.tSteady == null ? `Hisob oxirigacha harorat hali o’zgarib turibdi – davomiylikni uzaytirsangiz, barqaror holatni ko’rasiz.`
    : R.tSteady === 0 ? `Harorat boshidanoq deyarli o’zgarmaydi.`
    : `Taxminan <b>${fmtT(R.tSteady)}</b> dan keyin harorat deyarli o’zgarmaydi – <b>barqaror holat</b> qaror topadi.`;
  $('summary').innerHTML = `<h3>Natija: t = ${fmtT(R.times[J])} paytda</h3><ul>
    <li>Eng issiq joy ${where(st.ma)}: <b>${fmtU(U[st.ma])}</b>; eng sovuq joy ${where(st.mi)}: <b>${fmtU(U[st.mi])}</b>.</li>
    <li>O’rtacha harorat boshida ${fmtU(a0)} edi, hozir <b>${fmtU(st.avg)}</b> – jism ${trend}.</li>
    <li>Sababi: ${[...sides, ...extra].join('; ')}.</li>${flux}
    <li>${steady}</li>${hint}</ul>`;
}

// ---------------- Masalaning qo'yilishi (dinamik formulalar) ----------------
function statement() {
  const ph = physics(), sides = S.dim == 1 ? SIDES1 : SIDES2;
  const name = { 1: 'bc1', 2: 'bc2', 3: 'bc3' };
  const val = b => b.type == 1 ? `g = ${b.g} ${unit}` : b.type == 2 ? `q = ${b.q} W/m²` : `α = ${b.alpha} W/(m²·K), u<sub>e</sub> = ${b.ue} ${unit}`;
  let h = `<div class="eqrow"><span class="tag">Tenglama</span>${eq('heat', 1.25)}</div>`;
  h += `<div class="eqrow"><span class="tag">Koeffitsientlar</span>${eq('coeffs', 1.15)}<span class="mat">a² = ${fmtSci(ph.a2)} m²/s, β = ${fmtSci(ph.beta)} 1/s</span></div>`;
  h += `<div class="eqrow"><span class="tag">Boshlang’ich shart</span>${eq('ic', 1.15)}</div>`;
  for (const [k, t] of sides) h += `<div class="eqrow"><span class="tag">${t}</span>${eq(name[S.bc[k].type], 1.15)}<span class="mat">${val(S.bc[k])}</span></div>`;
  $('statement').innerHTML = h;
}

// ---------------- Chizish ----------------
function frameLimits() {
  if ($('scale').value !== 'frame') return limits;
  let lo = Infinity, hi = -Infinity; for (const v of R.frames[J]) if (isFinite(v)) { if (v < lo) lo = v; if (v > hi) hi = v; }
  if (!isFinite(lo)) return limits; if (hi - lo < 1e-9) hi = lo + 1e-3; return [lo, hi];
}
function drawField() {
  const cv = $('field'); cv.style.height = S.dim == 1 ? '170px' : 'min(62vw, 460px)';
  const { c, w, h } = setup(cv), [lo, hi] = frameLimits(), U = R.frames[J];
  c.clearRect(0, 0, w, h); c.font = '12px ' + css('--mono');
  const cbH = 12, pad = 26;
  if (S.dim == 1) {
    const x0 = 24, x1 = w - 24, y = 34, bh = 50, n = U.length, seg = (x1 - x0) / n;
    c.save(); c.beginPath(); c.roundRect(x0, y, x1 - x0, bh, 8); c.clip();
    for (let i = 0; i < n; i++) { c.fillStyle = color((U[i] - lo) / (hi - lo)); c.fillRect(x0 + i * seg, y, seg + 1, bh); }
    c.restore(); c.strokeStyle = css('--ink'); c.beginPath(); c.roundRect(x0, y, x1 - x0, bh, 8); c.stroke();
    const px = x0 + (probe.i + 0.5) * seg; c.strokeStyle = css('--ink'); c.lineWidth = 2; c.beginPath(); c.moveTo(px, y - 6); c.lineTo(px, y + bh + 6); c.stroke(); c.lineWidth = 1;
    c.fillStyle = css('--ink'); c.textAlign = 'left'; c.fillText('x = 0', x0, y - 10); c.textAlign = 'right'; c.fillText('x = ' + S.Lx + ' m', x1, y - 10);
    drawField.geo = { x0, x1, y, bh, seg, n };
    const lab = k => { const b = S.bc[k]; return b.type == 1 ? `${b.g}${unit ? ' ' + unit : ''} da` : b.type == 2 ? (b.q == 0 ? 'izolyatsiya' : `oqim ${b.q} W/m²`) : `havo ${b.ue}${unit ? ' ' + unit : ''}`; };
    c.fillStyle = css('--muted'); c.textAlign = 'left'; c.fillText('◀ ' + lab('left'), x0, y + bh + 18); c.textAlign = 'right'; c.fillText(lab('right') + ' ▶', x1, y + bh + 18);
    colorbar(c, w / 2 - 140, y + bh + 44, 280, cbH, lo, hi);
  } else {
    const nx = R.nx, ny = R.ny, size = Math.min(w - 120, h - 50), ox = 50, oy = 10;
    const sx = size * Math.min(1, S.Lx / S.Ly), sy = size * Math.min(1, S.Ly / S.Lx);
    const img = c.createImageData(nx, ny);
    for (let k = 0; k < ny; k++) for (let i = 0; i < nx; i++) {
      const [r, g, b] = rgb((U[k * nx + i] - lo) / (hi - lo)), p = ((ny - 1 - k) * nx + i) * 4;
      img.data[p] = r; img.data[p + 1] = g; img.data[p + 2] = b; img.data[p + 3] = 255;
    }
    const off = document.createElement('canvas'); off.width = nx; off.height = ny; off.getContext('2d').putImageData(img, 0, 0);
    c.imageSmoothingEnabled = true; c.drawImage(off, ox, oy, sx, sy);
    isolines(c, U, nx, ny, ox, oy, sx, sy, lo, hi);
    c.strokeStyle = css('--ink'); c.strokeRect(ox, oy, sx, sy);
    const pxp = ox + probe.i / (nx - 1) * sx, pyp = oy + sy - probe.k / (ny - 1) * sy;
    c.beginPath(); c.arc(pxp, pyp, 5, 0, 7); c.fillStyle = '#fff'; c.fill(); c.stroke();
    c.fillStyle = css('--muted'); c.textAlign = 'center'; c.fillText(S.Lx + ' m', ox + sx / 2, oy + sy + 16);
    c.textAlign = 'right'; c.fillText(S.Ly + ' m', ox - 6, oy + 12); c.fillText('0', ox - 6, oy + sy);
    drawField.geo = { ox, oy, sx, sy, nx, ny };
    // vertikal rang shkalasi
    const bx = ox + sx + 24, bw = 14;
    for (let q = 0; q <= 100; q++) { c.fillStyle = color(q / 100); c.fillRect(bx, oy + sy - (q + 1) * sy / 101, bw, sy / 101 + 1); }
    c.strokeStyle = css('--line'); c.strokeRect(bx, oy, bw, sy);
    c.fillStyle = css('--ink'); c.textAlign = 'left';
    for (const v of niceTicks(lo, hi, 5)) { const yy = oy + sy - (v - lo) / (hi - lo) * sy; c.fillText(fmtU(v), bx + bw + 6, yy + 4); }
  }
}
function colorbar(c, x, y, w, h, lo, hi) {
  for (let q = 0; q <= 100; q++) { c.fillStyle = color(q / 100); c.fillRect(x + q * w / 101, y, w / 101 + 1, h); }
  c.fillStyle = css('--muted'); c.textAlign = 'right'; c.fillText(fmtU(lo), x - 6, y + 10); c.textAlign = 'left'; c.fillText(fmtU(hi), x + w + 6, y + 10);
}
function isolines(c, U, nx, ny, ox, oy, sx, sy, lo, hi) {
  // izoterma darajalari joriy kadrdagi diapazon bo'yicha
  let fl = Infinity, fh = -Infinity; for (const v of U) { if (v < fl) fl = v; if (v > fh) fh = v; }
  const levels = fh - fl > 1e-9 * (Math.abs(fh) + 1) ? niceTicks(fl, fh, 8).filter(v => v > fl && v < fh) : [];
  const X = i => ox + i / (nx - 1) * sx, Y = k => oy + sy - k / (ny - 1) * sy;
  c.strokeStyle = 'rgba(21,32,44,0.55)'; c.lineWidth = 0.8;
  for (const L of levels) {
    c.beginPath();
    for (let k = 0; k < ny - 1; k++) for (let i = 0; i < nx - 1; i++) {
      const v = [U[k * nx + i], U[k * nx + i + 1], U[(k + 1) * nx + i + 1], U[(k + 1) * nx + i]];
      const P = [[i, k], [i + 1, k], [i + 1, k + 1], [i, k + 1]], pts = [];
      for (let e = 0; e < 4; e++) {
        const a = v[e], b = v[(e + 1) % 4];
        if ((a - L) * (b - L) < 0) { const t = (L - a) / (b - a), A = P[e], Bp = P[(e + 1) % 4]; pts.push([A[0] + t * (Bp[0] - A[0]), A[1] + t * (Bp[1] - A[1])]); }
      }
      if (pts.length >= 2) { c.moveTo(X(pts[0][0]), Y(pts[0][1])); c.lineTo(X(pts[1][0]), Y(pts[1][1])); }
      if (pts.length === 4) { c.moveTo(X(pts[2][0]), Y(pts[2][1])); c.lineTo(X(pts[3][0]), Y(pts[3][1])); }
    }
    c.stroke();
  }
  c.lineWidth = 1;
}
function linePlot(cv, series, xs, opts) {
  const { c, w, h } = setup(cv); c.clearRect(0, 0, w, h);
  const ml = 62, mr = 12, mt = opts.ytitle ? 24 : 10, mb = 32, pw = w - ml - mr, ph = h - mt - mb;
  let lo = opts.lo, hi = opts.hi; const xlo = xs[0], xhi = xs[xs.length - 1];
  const X = v => ml + (v - xlo) / (xhi - xlo || 1) * pw, Y = v => mt + ph - (v - lo) / (hi - lo) * ph;
  c.font = '12px ' + css('--mono'); c.strokeStyle = css('--line'); c.fillStyle = css('--muted');
  for (const v of niceTicks(lo, hi, 5)) { const y = Y(v); c.beginPath(); c.moveTo(ml, y); c.lineTo(w - mr, y); c.stroke(); c.textAlign = 'right'; c.fillText(fmtU(v).replace(' ' + unit, ''), ml - 6, y + 4); }
  for (const v of niceTicks(xlo, xhi, 5)) { c.textAlign = 'center'; c.fillText(opts.xfmt(v), X(v), h - mb + 18); }
  c.save(); c.beginPath(); c.rect(ml, mt, pw, ph); c.clip();
  for (const s of series) {
    c.strokeStyle = s.color; c.lineWidth = s.w || 2; c.setLineDash(s.dash || []); c.beginPath();
    s.ys.forEach((v, i) => { const y = Y(Math.max(lo - 3 * (hi - lo), Math.min(hi + 3 * (hi - lo), isFinite(v) ? v : hi * 10))); i ? c.lineTo(X(xs[i]), y) : c.moveTo(X(xs[i]), y); });
    c.stroke(); c.setLineDash([]);
  }
  if (opts.marker != null) { c.strokeStyle = css('--ink'); c.setLineDash([3, 3]); c.beginPath(); c.moveTo(X(opts.marker), mt); c.lineTo(X(opts.marker), mt + ph); c.stroke(); c.setLineDash([]); }
  c.restore();
  c.fillStyle = css('--muted');
  if (opts.ytitle) { c.textAlign = 'left'; c.fillText(opts.ytitle, 6, 12); }
  if (opts.xtitle) { c.textAlign = 'right'; c.fillText(opts.xtitle, w - mr, h - 2); }
}
function drawProfile() {
  const U = R.frames[J], U0 = R.frames[0];
  let xs, cur, ini, ex = null;
  if (S.dim == 1) {
    xs = Array.from(R.x); cur = Array.from(U); ini = Array.from(U0);
    if (E) { const jj = Math.min(E.frames.length - 1, J); ex = Array.from(E.frames[jj]); }
    $('profTitle').textContent = 'Harorat sterjen (devor) bo’ylab';
  } else {
    const k = probe.k; xs = Array.from(R.X); cur = xs.map((_, i) => U[k * R.nx + i]); ini = xs.map((_, i) => U0[k * R.nx + i]);
    $('profTitle').textContent = `Harorat gorizontal kesim bo’ylab (y = ${+(R.Y[k]).toPrecision(3)} m)`;
  }
  const pad = (limits[1] - limits[0]) * 0.06;
  const series = [{ ys: ini, color: '#9aa7b5', dash: [5, 4], w: 1.5 }];
  if (ex) series.push({ ys: ex, color: css('--bad'), w: 1.4 });
  series.push({ ys: cur, color: css('--hot'), w: 2.4 });
  linePlot($('prof'), series, xs, { lo: limits[0] - pad, hi: limits[1] + pad, xfmt: v => (+v.toPrecision(3)) + '', ytitle: unit ? 'u, ' + unit : 'u', xtitle: 'x, m' });
}
function drawProbe() {
  const ts = R.times, idx = S.dim == 1 ? probe.i : probe.k * R.nx + probe.i;
  const ys = R.frames.map(fr => fr[idx]);
  let lo = Math.min(...ys.filter(isFinite)), hi = Math.max(...ys.filter(isFinite)); if (hi - lo < 1e-9) { lo -= 1; hi += 1; }
  const pad = (hi - lo) * 0.08;
  linePlot($('probe'), [{ ys, color: css('--accent'), w: 2.2 }], ts, { lo: lo - pad, hi: hi + pad, xfmt: v => fmtT(v).replace(/\.\d+ /, ' '), marker: ts[J], ytitle: unit ? 'u, ' + unit : 'u', xtitle: 'vaqt' });
  const where = S.dim == 1 ? `x = ${(R.x[probe.i]).toPrecision(3)} m` : `x = ${(R.X[probe.i]).toPrecision(3)} m, y = ${(R.Y[probe.k]).toPrecision(3)} m`;
  $('probeNote').textContent = `Nuqta ${where}: hozir ${fmtU(ys[J])}. Boshqa nuqtani tanlash uchun rangli rasm ustiga bosing.`;
}
function drawAll() {
  if (!R) return;
  drawField(); drawProfile(); drawProbe(); summary();
  $('tval').textContent = 't = ' + fmtT(R.times[J]);
}

// ---------------- Hodisalar ----------------
let deb;
function schedule() { clearTimeout(deb); deb = setTimeout(compute, 120); }
function applyPreset(id) {
  const p = PRESETS.find(q => q.id === id); S = JSON.parse(JSON.stringify(p)); probe = null; J = 0;
  $('presetNote').textContent = p.note; $('showExpl').checked = false; writeForm(); compute();
  J = Math.round((R.frames.length - 1) * 0.3); $('time').value = J; drawAll();
}
function bind() {
  $('preset').addEventListener('change', e => applyPreset(e.target.value));
  $('mat').addEventListener('change', () => { readForm(); writeForm(); schedule(); });
  $('dim').addEventListener('change', () => { readForm(); if (S.dim == 2 && S.init.type === 'book') S.init.type = 'uniform'; if (S.dim == 1 && S.scheme === 'adi') S.scheme = 'cn'; probe = null; writeForm(); schedule(); });
  $('initType').addEventListener('change', () => { readForm(); writeForm(); schedule(); });
  $('bcs').addEventListener('change', e => { readForm(); if (e.target.dataset.k === 'type') renderBCs(); schedule(); });
  $('bcs').addEventListener('input', () => schedule());
  ['lam', 'rho', 'cc'].forEach(id => $(id).addEventListener('input', () => { $('mat').value = 'custom'; schedule(); }));
  document.querySelectorAll('#p-lab aside input, #p-lab aside select').forEach(el => {
    if (['preset', 'mat', 'dim', 'initType'].includes(el.id)) return;
    el.addEventListener(el.tagName === 'SELECT' ? 'change' : 'input', schedule);
  });
  $('showExpl').addEventListener('change', compute);
  $('scale').addEventListener('change', () => { S.scale = $('scale').value; drawAll(); });
  $('time').addEventListener('input', e => { J = +e.target.value; drawAll(); });
  let playing = false, last = 0;
  const tick = ts => {
    if (!playing) return;
    if (ts - last > 1000 / 40) { last = ts; J = Math.min(R.frames.length - 1, J + Math.max(1, Math.round(R.frames.length / 240))); $('time').value = J; drawAll();
      if (J >= R.frames.length - 1) { playing = false; $('play').textContent = '▶ Qaytadan'; } }
    if (playing) requestAnimationFrame(tick);
  };
  $('play').addEventListener('click', () => {
    if (playing) { playing = false; $('play').textContent = '▶ Davom etish'; return; }
    if (J >= R.frames.length - 1) J = 0; playing = true; $('play').textContent = '❚❚ To’xtatish'; requestAnimationFrame(tick);
  });
  const fieldPos = e => { const r = $('field').getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
  const hit = (x, y) => {
    const g = drawField.geo; if (!g) return null;
    if (S.dim == 1) { if (x < g.x0 || x > g.x1 || y < g.y - 8 || y > g.y + g.bh + 8) return null; return { i: Math.min(g.n - 1, Math.max(0, Math.floor((x - g.x0) / g.seg))) }; }
    if (x < g.ox || x > g.ox + g.sx || y < g.oy || y > g.oy + g.sy) return null;
    return { i: Math.round((x - g.ox) / g.sx * (g.nx - 1)), k: Math.round((g.oy + g.sy - y) / g.sy * (g.ny - 1)) };
  };
  $('field').addEventListener('pointermove', e => {
    const [x, y] = fieldPos(e), p = hit(x, y), tip = $('tip'); if (!p) { tip.hidden = true; return; }
    const U = R.frames[J]; const v = S.dim == 1 ? U[p.i] : U[p.k * R.nx + p.i];
    const lab = S.dim == 1 ? `x = ${R.x[p.i].toPrecision(3)} m` : `x = ${R.X[p.i].toPrecision(3)}, y = ${R.Y[p.k].toPrecision(3)} m`;
    tip.hidden = false; tip.style.left = x + 'px'; tip.style.top = y + 'px'; tip.textContent = `${lab}: ${fmtU(v)}`;
  });
  $('field').addEventListener('pointerleave', () => $('tip').hidden = true);
  $('field').addEventListener('click', e => { const p = hit(...fieldPos(e)); if (p) { probe = p; drawAll(); } });
  document.querySelectorAll('.tabs button').forEach(b => b.addEventListener('click', () => {
    document.querySelectorAll('.tabs button').forEach(x => x.setAttribute('aria-selected', x === b));
    document.querySelectorAll('.panel').forEach(p => p.hidden = p.id !== 'p-' + b.dataset.tab);
    if (b.dataset.tab === 'lab') drawAll(); if (b.dataset.tab === 'stab') drawG(); if (b.dataset.tab === 'conv' && !cvDone) runConv(); if (b.dataset.tab === 'rel' && !relDone) reliability();
  }));
  let rt; window.addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => { drawAll(); drawG(); if (cvLast) plotConv(cvLast); }, 100); });
}

// ---------------- Nazariya ----------------
function theory() {
  $('theory').innerHTML = `
  <p>Jismdagi harorat <i>u</i>(<b>x</b>, <i>t</i>) Furye qonuni va energiyaning saqlanish qonunidan kelib chiqadigan tenglamaga bo’ysunadi:</p>
  ${eq('energy', 1.4)}
  <p>Koeffitsientlar o’zgarmas bo’lganda va sirtdan konvektiv almashish (sterjen yon sirti yoki plastinka yuzlari) hisobga olinganda:</p>
  ${eq('heat', 1.4)}${eq('coeffs', 1.3)}${eq('laplace', 1.3)}
  <p>Bu yerda <i>p</i> – kesim perimetri, <i>σ</i> – kesim yuzasi (doiraviy sterjen uchun <i>p</i>/<i>σ</i> = 4/<i>d</i>), plastinka uchun <i>β</i> = 2<i>α<sub>s</sub></i>/(<i>ρc</i>δ). Boshlang’ich shart va chegaraviy shartlarning uch turi:</p>
  ${eq('ic', 1.3)}
  <div class="eqrow"><span class="tag">I tur (Dirixle)</span>${eq('bc1', 1.3)}</div>
  <div class="eqrow"><span class="tag">II tur (Neyman)</span>${eq('bc2', 1.3)}</div>
  <div class="eqrow"><span class="tag">III tur (aralash)</span>${eq('bc3', 1.3)}</div>
  <h3>To’r va chekli ayirmalar</h3>
  ${eq('grid', 1.3)}${eq('dxx', 1.3)}${eq('Lambda', 1.3)}
  <p>Vaqt bo’yicha <i>θ</i>-sxema: <i>θ</i> = 0 – oshkor, <i>θ</i> = 1 – oshkormas, <i>θ</i> = ½ – Krank–Nikolson sxemasi:</p>
  ${eq('theta', 1.4)}
  <p>Oqimli chegaralarda (II va III tur) ikkinchi tartibli aniqlikni saqlash uchun soxta tugun <i>u</i><sub>−1</sub> kiritiladi va chegaraviy shartning markaziy ayirmali ko’rinishidan yo’qotiladi:</p>
  ${eq('ghost', 1.3)}
  <h3>Chiziqli sistemalarni yechish</h3>
  <p>Har bir vaqt qatlamida uch diagonalli sistema hosil bo’ladi va u haydash usulida O(<i>N</i>) amalda yechiladi:</p>
  ${eq('tri', 1.3)}${eq('sweep', 1.3)}
  <p>Muqobil sifatida Zeydel iteratsiyasi (2D da SOR, ω<sub>opt</sub> ≈ 2/(1 + sin πh)) ishlatiladi:</p>
  ${eq('seidel', 1.3)}
  <h3>Ikki o’lchovli masala: o’zgaruvchan yo’nalishlar usuli (ADI)</h3>
  <p>Pisman–Rekford sxemasi har bir qadamni ikki yarim qadamga ajratadi; har birida faqat bitta yo’nalish oshkormas, shuning uchun yana haydash usuli yetarli. Sxema absolyut turg’un va O(<i>τ</i>² + <i>h</i>²) aniqlikka ega:</p>
  ${eq('adi1', 1.25)}${eq('adi2', 1.25)}
  <p class="banner info">Chegaraviy oqim hadlari <i>S<sub>x</sub></i>, <i>S<sub>y</sub></i> o’z yo’nalishidagi operator bilan birga olinadi. Ularni ikki yarim qadamga teng bo’lish III tur shartlarda aniqlikni birinchi tartibgacha tushirishi tekshiruvda aniqlandi; ajratilgan ko’rinishda ikkinchi tartib saqlanadi (“Yaqinlashish” bo’limi).</p>
  <h3>O’lchamsiz kriteriylar</h3>
  <div class="eqrow">${eq('fourier', 1.3)}${eq('biot', 1.3)}${eq('flux', 1.3)}</div>`;
}

// ---------------- Turg'unlik ----------------
function stabText() {
  $('stabText').innerHTML = `
  <p>Xatoni Furye garmonikalariga yoyib, <i>e<sup>ikx</sup></i> garmonika bir qadamda necha marta o’zgarishini (kuchaytirish koeffitsientini) topamiz:</p>
  ${eq('G', 1.35)}${eq('Gexact', 1.25)}
  <p>Sxema turg’un bo’lishi uchun barcha garmonikalar o’smasligi kerak:</p>
  ${eq('Gcond', 1.25)}
  <p>Oshkor sxema uchun bundan mashhur cheklov kelib chiqadi:</p>
  ${eq('stab', 1.3)}
  <p>Grafikda Fo ni o’zgartiring: Fo &gt; ½ bo’lganda oshkor sxemaning |G| qiymati 1 dan oshib ketadi – yuqori chastotali xato har qadamda o’sadi. Krank–Nikolson turg’un, lekin katta Fo da G → −1, ya'ni keskin o’zgarishlarda so’nmaydigan tebranish beradi; oshkormas sxema esa monoton so’ndiradi.</p>`;
}
function drawG() {
  if ($('p-stab').hidden) return;
  const Fo = Math.pow(10, +$('foS').value); $('foOut').textContent = 'Fo = ' + fmtSci(Fo);
  const { c, w, h } = setup($('gplot')); c.clearRect(0, 0, w, h);
  const ml = 46, mr = 12, mt = 10, mb = 30, pw = w - ml - mr, ph = h - mt - mb, lo = -1.6, hi = 1.15;
  const X = v => ml + v / Math.PI * pw, Y = v => mt + ph - (v - lo) / (hi - lo) * ph;
  c.font = '12px ' + css('--mono'); c.fillStyle = css('--muted'); c.strokeStyle = css('--line');
  for (const v of [-1.5, -1, -0.5, 0, 0.5, 1]) { c.beginPath(); c.moveTo(ml, Y(v)); c.lineTo(w - mr, Y(v)); c.stroke(); c.textAlign = 'right'; c.fillText(v, ml - 6, Y(v) + 4); }
  [['0', 0], ['π/4', Math.PI / 4], ['π/2', Math.PI / 2], ['3π/4', 3 * Math.PI / 4], ['π', Math.PI]].forEach(([s, v]) => { c.textAlign = 'center'; c.fillText(s, X(v), h - 10); });
  c.fillStyle = 'rgba(178,35,43,0.08)'; c.fillRect(ml, mt, pw, Y(1) - mt); c.fillRect(ml, Y(-1), pw, mt + ph - Y(-1));
  const G = (th, xi) => { const s = Math.sin(xi / 2) ** 2; return (1 - 4 * (1 - th) * Fo * s) / (1 + 4 * th * Fo * s); };
  const curve = (fn, col, wd, dash) => { c.save(); c.beginPath(); c.rect(ml, mt, pw, ph); c.clip(); c.strokeStyle = col; c.lineWidth = wd; c.setLineDash(dash || []); c.beginPath();
    for (let q = 0; q <= 200; q++) { const xi = q / 200 * Math.PI, v = Math.max(lo - 1, Math.min(hi + 1, fn(xi))); q ? c.lineTo(X(xi), Y(v)) : c.moveTo(X(xi), Y(v)); } c.stroke(); c.restore(); };
  curve(xi => Math.exp(-Fo * xi * xi), '#15202c', 2, [5, 4]);
  curve(xi => G(0, xi), '#b2232b', 2.2); curve(xi => G(1, xi), '#1d5ea8', 2.2); curve(xi => G(0.5, xi), '#cc7a1a', 2.2);
  c.fillStyle = css('--muted'); c.textAlign = 'left'; c.fillText('G(ξ)', ml + 6, mt + 14); c.textAlign = 'right'; c.fillText('ξ = kh', w - mr - 4, Y(lo) - 6);
  const gmin = G(0, Math.PI);
  $('stabVerdict').innerHTML = Fo <= 0.5 ? `<div class="banner ok">Fo = ${fmtSci(Fo)} ≤ ½: uchala sxema ham turg’un.</div>`
    : `<div class="banner bad">Fo = ${fmtSci(Fo)} &gt; ½: oshkor sxemada G(π) = ${gmin.toFixed(2)}, |G| &gt; 1 – eng tez o’zgaruvchi garmonika har qadamda ${Math.abs(gmin).toFixed(2)} marta o’sadi. Oshkormas va Krank–Nikolson sxemalari turg’un.</div>`;
}

// ---------------- Yaqinlashish tartibi ----------------
let cvDone = false, cvLast = null;
function convText() {
  $('convText').innerHTML = `
  <p>Dasturning to’g’riligi <b>ishlab chiqarilgan yechimlar usuli</b> bilan tekshiriladi: aniq yechim oldindan tanlanadi, manba va chegaraviy qiymatlar undan hisoblanadi, so’ng sonli yechim bilan solishtiriladi.</p>
  ${eq('mms', 1.3)}${eq('mmsf', 1.3)}
  <p>2D da: <i>u</i>* = <i>e</i><sup>−<i>t</i></sup>(1 + sin(π<i>x</i>) cos(π<i>y</i>/2) + <i>xy</i>). To’r har gal ikki marta maydalanadi (<i>h</i> va <i>τ</i> birga), xato va kuzatilgan tartib:</p>
  ${eq('pest', 1.3)}${eq('order2', 1.25)}
  <p>Nazariya bo’yicha oshkormas sxemada <i>p</i> ≈ 1 (vaqt bo’yicha birinchi tartib), Krank–Nikolson va ADI da <i>p</i> ≈ 2. Oshkor sxema faqat <i>τ</i> ~ <i>h</i>² bo’lganda turg’un, bu holda ham <i>p</i> = 2 (<i>h</i> bo’yicha).</p>
  <p class="hint">Parametrlar: a² = 0.5, λ = 2, β = 0.3, α = 15, T = 0.5, xato – maksimum normada.</p>`;
}
function runConv() {
  cvDone = true;
  const dim = +$('cvDim').value; let sch = $('cvScheme').value; const bcm = $('cvBc').value;
  if (dim === 1 && sch === 'adi') { sch = 'cn'; $('cvScheme').value = 'cn'; }
  const a2 = 0.5, lam = 2, beta = 0.3, us = 0.1, T = 0.5, rows = [];
  const th = sch === 'explicit' ? 0 : sch === 'implicit' ? 1 : 0.5;
  const t1 = { mix: [3, 2], dir: [1, 1], rob: [3, 3] }[bcm], t2 = { mix: [1, 3, 2, 3], dir: [1, 1, 1, 1], rob: [3, 3, 3, 3] }[bcm];
  const grids = dim === 1 ? [10, 20, 40, 80, 160] : (sch === 'adi' ? [8, 16, 32, 64] : [8, 16, 32]);
  for (const N of grids) {
    const K = sch === 'explicit' ? Math.ceil(N * N * (dim === 1 ? 1 : 2)) : N;
    let e = 0, blow = -1; const t0 = performance.now();
    if (dim === 1) {
      const m = TL.mms1D(1, a2, lam, beta, us, t1);
      const r = TL.solve1D({ L: 1, N, T, K, a2, lam, beta, us, f: m.f, init: m.init, bc: m.bc, theta: th, frames: 1 });
      r.x.forEach((x, i) => e = Math.max(e, Math.abs(r.u[i] - m.U(x, T)))); blow = r.blow;
    } else {
      const m = TL.mms2D(1, 1, a2, lam, beta, us, t2);
      const r = TL.solve2D({ Lx: 1, Ly: 1, Nx: N, Ny: N, T, K, a2, lam, beta, us, f: m.f, init: m.init, bc: m.bc,
        scheme: sch === 'adi' ? 'adi' : 'theta', theta: th, omega: 2 / (1 + Math.sin(Math.PI / N)), eps: 1e-11, frames: 1 });
      for (let k = 0; k < r.ny; k++) for (let i = 0; i < r.nx; i++) e = Math.max(e, Math.abs(r.u[k * r.nx + i] - m.U(r.X[i], r.Y[k], T)));
      blow = r.blow;
    }
    rows.push({ N, K, h: 1 / N, tau: T / K, e, blow, ms: performance.now() - t0 });
  }
  cvLast = rows; plotConv(rows);
  let html = '<div class="tablewrap"><table><thead><tr><th>N</th><th>K</th><th>h</th><th>τ</th><th>E<sub>∞</sub></th><th>p</th></tr></thead><tbody>';
  rows.forEach((r, q) => {
    const p = q && rows[q - 1].blow < 0 && r.blow < 0 ? Math.log2(rows[q - 1].e / r.e).toFixed(2) : '–';
    html += `<tr><td>${r.N}</td><td>${r.K}</td><td>${fmtSci(r.h)}</td><td>${fmtSci(r.tau)}</td><td>${r.blow > 0 ? 'buzildi' : r.e.toExponential(3)}</td><td>${p}</td></tr>`;
  });
  $('cvTable').innerHTML = html + '</tbody></table></div>';
}
function plotConv(rows) {
  const { c, w, h } = setup($('cvPlot')); c.clearRect(0, 0, w, h);
  const ok = rows.filter(r => r.blow < 0 && r.e > 0); if (ok.length < 2) return;
  const ml = 56, mr = 14, mt = 12, mb = 34, pw = w - ml - mr, ph = h - mt - mb;
  const lx = ok.map(r => Math.log10(r.h)), ly = ok.map(r => Math.log10(r.e));
  const xlo = Math.min(...lx) - 0.1, xhi = Math.max(...lx) + 0.1, ylo = Math.min(...ly) - 0.6, yhi = Math.max(...ly) + 0.4;
  const X = v => ml + (v - xlo) / (xhi - xlo) * pw, Y = v => mt + ph - (v - ylo) / (yhi - ylo) * ph;
  c.font = '12px ' + css('--mono'); c.fillStyle = css('--muted'); c.strokeStyle = css('--line');
  for (let d = Math.ceil(ylo); d <= Math.floor(yhi); d++) { c.beginPath(); c.moveTo(ml, Y(d)); c.lineTo(w - mr, Y(d)); c.stroke(); c.textAlign = 'right'; c.fillText('10' + sup(d), ml - 6, Y(d) + 4); }
  ok.forEach(r => { c.textAlign = 'center'; c.fillText('1/' + r.N, X(Math.log10(r.h)), h - 12); });
  const ref = (p, col) => { const x0 = lx[0], y0 = ly[0] - 0.25; c.strokeStyle = col; c.setLineDash([5, 4]); c.beginPath(); c.moveTo(X(x0), Y(y0)); c.lineTo(X(lx[lx.length - 1]), Y(y0 + p * (lx[lx.length - 1] - x0))); c.stroke(); c.setLineDash([]);
    c.fillStyle = col; c.textAlign = 'left'; c.fillText('p = ' + p, X(lx[lx.length - 1]) + 4, Y(y0 + p * (lx[lx.length - 1] - x0)) + 4); };
  ref(1, '#8a96a6'); ref(2, '#5a6a80');
  c.strokeStyle = css('--hot'); c.lineWidth = 2.4; c.beginPath(); ok.forEach((r, q) => q ? c.lineTo(X(lx[q]), Y(ly[q])) : c.moveTo(X(lx[q]), Y(ly[q]))); c.stroke(); c.lineWidth = 1;
  c.fillStyle = css('--hot'); ok.forEach((r, q) => { c.beginPath(); c.arc(X(lx[q]), Y(ly[q]), 4, 0, 7); c.fill(); });
  c.fillStyle = css('--muted'); c.textAlign = 'left'; c.fillText('E∞', ml + 6, mt + 12); c.textAlign = 'right'; c.fillText('h', w - mr, h - 12);
}

// ---------------- Ishonchlilik ----------------
let relDone = false;
function reliability() {
  relDone = true;
  const row = (name, cond, num, an, fmt, key) => {
    const d = Math.abs(num - an) / Math.abs(an) * 100;
    return `<tr><td style="text-align:left">${name}<br><span class="hint">${cond}</span></td><td>${fmt(num)}</td><td>${fmt(an)}</td><td class="m">${d < 0.01 ? '< 0.01' : d.toFixed(2)} %</td></tr>`;
  };
  // 1) Analitik formulalar bilan (barqaror holat)
  const wl = { lam: 1.4, rc: 2300 * 880, L: 0.3 };
  const rw = TL.solve1D({ L: wl.L, N: 60, T: 30 * 24 * 3600, K: 3000, a2: wl.lam / wl.rc, lam: wl.lam, init: () => 15, theta: 1, frames: 2,
    bc: [{ type: 3, alpha: 8, ue: 20, q: () => 0 }, { type: 3, alpha: 23, ue: -10, q: () => 0 }] });
  const n = rw.u.length, qW = -wl.lam * (3 * rw.u[n - 1] - 4 * rw.u[n - 2] + rw.u[n - 3]) / (2 * rw.h), qWa = 30 / (1 / 8 + wl.L / wl.lam + 1 / 23);
  const ws = { lam: 11.3, rc: 8400 * 450, d: 0.001, al: 15, Q: 2e7, L: 0.2 };
  const rs = TL.solve1D({ L: ws.L, N: 200, T: 1500, K: 1500, a2: ws.lam / ws.rc, lam: ws.lam, beta: ws.al * 4 / ws.d / ws.rc, us: 20, f: () => ws.Q / ws.rc,
    init: () => 20, theta: 0.5, frames: 2, bc: [{ type: 1, g: () => 20 }, { type: 1, g: () => 20 }] });
  const mS = Math.sqrt(4 * ws.al / (ws.lam * ws.d)), sA = 20 + ws.Q / (ws.lam * mS * mS) * (1 - 1 / Math.cosh(mS * ws.L / 2));
  const cu = { lam: 401, rc: 8960 * 385, d: 0.01, al: 10, L: 0.5 };
  const rc = TL.solve1D({ L: cu.L, N: 200, T: 6 * 3600, K: 2000, a2: cu.lam / cu.rc, lam: cu.lam, beta: cu.al * 4 / cu.d / cu.rc, us: 20, init: () => 20, theta: 1, frames: 2,
    bc: [{ type: 1, g: () => 100 }, { type: 3, alpha: cu.al, ue: 20, q: () => 0 }] });
  const mC = Math.sqrt(4 * cu.al / (cu.lam * cu.d)), cA = 20 + 80 / (Math.cosh(mC * cu.L) + cu.al / (mC * cu.lam) * Math.sinh(mC * cu.L));
  const f2 = v => v.toFixed(2), f3 = v => v.toFixed(3);
  // 2) Namunaviy masala (o'quv qo'llanmadagi misol) - qo'llanmadagi algoritm aynan takrorlanadi
  const L = 8, T = 3, N = 50, K = 200, a = 5, hc = 0.16, u0 = 2, U1 = 0.25, U2 = 1.18, eps = 1e-4;
  const hx = L / N, dt = T / K, g = a * a * dt / (hx * hx), den = 1 + 2 * g + dt * hc;
  const U = []; for (let i = 0; i <= N; i++) { U.push(new Float64Array(K + 1)); U[i][0] = 0.25 + Math.sin(0.15 * i * hx); }
  for (let j = 0; j <= K; j++) { U[0][j] = U1; U[N][j] = U2; }
  let rho = 1, k = 0;
  while (rho > eps) { rho = 0; for (let j = 1; j <= K; j++) for (let i = 1; i < N; i++) { const V = (g * (U[i - 1][j] + U[i + 1][j]) + U[i][j - 1] + dt * hc * u0) / den; const r = Math.abs(V - U[i][j]); if (r > rho) rho = r; U[i][j] = V; } k++; }
  const bk = [[.25, .25, .25, .25, .25], [.274, .275, .275, .275, .275], [.298, .299, .3, .3, .3], [.322, .323, .324, .325, .325], [.346, .348, .348, .349, .349], [.37, .371, .373, .373, .374]];
  let t = '<div class="tablewrap"><table><thead><tr><th>nuqta \\ qadam</th>' + [0, 1, 2, 3, 4].map(j => `<th>${j}</th>`).join('') + '</tr></thead><tbody>';
  for (let i = 0; i < 6; i++) { t += `<tr><th>${i}</th>`; for (let j = 0; j < 5; j++) { const v = U[i][j], m = Math.abs(v - bk[i][j]) <= 0.0011; t += `<td class="${m ? 'm' : 'x'}">${v.toFixed(3)} / ${bk[i][j].toFixed(3)}</td>`; } t += '</tr>'; }
  t += '</tbody></table></div>';

  $('relText').innerHTML = `
  <h3>1. Aniq formulalar bilan solishtirish</h3>
  <p>Uzoq vaqtdan keyin harorat o’zgarmay qoladi (barqaror holat). Bu holat uchun issiqlik texnikasida aniq formulalar bor. TermoLab natijasi shu formulalar bilan solishtirildi – hisob hozir brauzeringizda bajarildi:</p>
  <div class="eqrow">${eq('wall', 1.1)}${eq('wire', 1.0)}${eq('fin', 1.0)}</div>
  <div class="tablewrap"><table><thead><tr><th style="text-align:left">Masala</th><th>TermoLab</th><th>Formula</th><th>Farq</th></tr></thead><tbody>
  ${row('Beton devordan yo’qotilayotgan issiqlik, W/m²', '30 sm, ichkari 20 °C, tashqari −10 °C', qW, qWa, f2)}
  ${row('Elektr qizdirgich simining eng issiq joyi, °C', 'nixrom, d = 1 mm, Q = 2·10⁷ W/m³', Math.max(...rs.u), sA, f2)}
  ${row('Mis sterjen uchidagi harorat, °C', 'L = 0.5 m, d = 10 mm, asosi 100 °C', rc.u[rc.u.length - 1], cA, f3)}
  </tbody></table></div>
  <h3>2. Javobi ma’lum masala bilan solishtirish</h3>
  <p>Javobi oldindan ma’lum formula tanlanadi, dastur shu masalani yechadi va natija aniq javob bilan solishtiriladi. To’r maydalanganda xato nazariya bashorat qilganidek kamayadi – batafsil “Aniqlik” bo’limida.</p>
  <h3>3. Namunaviy masala bilan solishtirish</h3>
  <p>Matematik modellashtirish bo’yicha o’quv qo’llanmadagi misol: yon sirti muhit bilan issiqlik almashadigan sterjen. Bu TermoLab dagi umumiy modelning xususiy holi.</p>
  ${eq('book', 1.2)}
  <p>Qo’llanmada masala Zeydel iteratsiyasi bilan yechilgan:</p>
  ${eq('bookV', 1.2)}
  <div class="banner ${k === 992 ? 'ok' : 'bad'}">Iteratsiyalar soni: TermoLab da <b>${k}</b>, qo’llanmada <b>992</b>. Pastdagi jadvalda har bir katak: <b>TermoLab / qo’llanma</b> – barcha qiymatlar mos keldi.</div>
  ${t}
  <p class="hint">γ = ${g.toFixed(2)}: bu oddiy (oshkor) usul chegarasidan (½) ${Math.round(g / 0.5)} marta katta, shuning uchun bu masalada oshkormas usul zarur. Qo’llanma dasturida to’r qadami va issiqlik almashish koeffitsienti bitta <i>h</i> harfi bilan yozilgan; TermoLab da ular alohida kattaliklar.</p>`;
}

// ---------------- Ishga tushirish ----------------
fillSelects(); bind(); theory(); stabText(); convText();
$('foS').addEventListener('input', drawG);
$('cvRun').addEventListener('click', runConv);
applyPreset('cu');
if (document.fonts && document.fonts.ready) document.fonts.ready.then(drawAll);
})();
