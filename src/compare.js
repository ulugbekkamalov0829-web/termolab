/* TermoLab — usullarni taqqoslash: bitta masala barcha usullar bilan yechiladi,
   aniq yechim bilan solishtiriladi va eng maqbul usul aniqlanadi. */
(function (root) {
  'use strict';
  const TL = root.TL;
  const now = () => (root.performance ? root.performance.now() : Date.now());
  // 1D test: po'lat sterjen, uchlari 0 °C, boshlang'ich harorat 100·sin(πx/L)
  // aniq yechim: u = 100 e^{-a²π²t/L²} sin(πx/L)
  const P1 = { L: 0.2, a2: 1.4e-5, lam: 50, T: 600, N: 50 };
  // 2D test: po'lat plastinka 0.2×0.2 m, chetlari 0 °C, aniq yechim: u = 100 e^{-2a²π²t/L²} sin sin
  const P2 = { L: 0.2, a2: 1.4e-5, lam: 50, T: 600, N: 40 };
  function exact1(x, t) { return 100 * Math.exp(-P1.a2 * Math.PI ** 2 * t / P1.L ** 2) * Math.sin(Math.PI * x / P1.L); }
  function exact2(x, y, t) { return 100 * Math.exp(-2 * P2.a2 * Math.PI ** 2 * t / P2.L ** 2) * Math.sin(Math.PI * x / P2.L) * Math.sin(Math.PI * y / P2.L); }
  function timed(fn, reps) { let r, best = 1e9; for (let k = 0; k < reps; k++) { const t0 = now(); r = fn(); best = Math.min(best, now() - t0); } return [r, best]; }

  function run1D(m) {
    const z = { type: 1, g: () => 0 };
    const p = { L: P1.L, N: P1.N, T: P1.T, K: m.K, a2: P1.a2, lam: P1.lam, bc: [z, z], init: x => exact1(x, 0), theta: m.theta, solver: m.solver, eps: 1e-9, frames: 2 };
    const [r, ms] = timed(() => TL.solve1D(p), m.reps || 3);
    let err = 0; for (let i = 0; i < r.x.length; i++) err = Math.max(err, Math.abs(r.u[i] - exact1(r.x[i], P1.T)));
    return { ms, err: r.blow > 0 || !isFinite(err) ? Infinity : err, Fo: r.Fo, iters: r.iters };
  }
  function run2D(m) {
    const z = { type: 1, g: () => 0 };
    const p = { Lx: P2.L, Ly: P2.L, Nx: P2.N, Ny: P2.N, T: P2.T, K: m.K, a2: P2.a2, lam: P2.lam, init: (x, y) => exact2(x, y, 0),
      bc: { left: z, right: z, bottom: z, top: z }, scheme: m.scheme, theta: m.theta, omega: m.omega, eps: 1e-7, frames: 2 };
    const [r, ms] = timed(() => TL.solve2D(p), m.reps || 2);
    let err = 0; for (let k = 0; k < r.ny; k++) for (let i = 0; i < r.nx; i++) err = Math.max(err, Math.abs(r.u[k * r.nx + i] - exact2(r.X[i], r.Y[k], P2.T)));
    return { ms, err: r.blow > 0 || !isFinite(err) ? Infinity : err, Fo: r.Fo, iters: r.iters };
  }
  const M1 = [
    { name: 'Oshkor sxema (katta qadam)', theta: 0, K: 60, short: 'Oshkor, τ = 10 s' },
    { name: 'Oshkor sxema (kichik qadam, Fo ≤ ½)', theta: 0, K: 1200, short: 'Oshkor, τ = 0.5 s' },
    { name: 'Oshkormas + haydash usuli', theta: 1, K: 60, solver: 'thomas', short: 'Oshkormas + haydash' },
    { name: 'Oshkormas + Zeydel iteratsiyasi', theta: 1, K: 60, solver: 'seidel', short: 'Oshkormas + Zeydel' },
    { name: 'Krank–Nikolson + Zeydel', theta: 0.5, K: 60, solver: 'seidel', short: 'Krank–Nikolson + Zeydel' },
    { name: 'Krank–Nikolson + haydash', theta: 0.5, K: 60, solver: 'thomas', short: 'Krank–Nikolson + haydash' }
  ];
  const omegaOpt = 2 / (1 + Math.sin(Math.PI / P2.N));
  const M2 = [
    { name: 'Oshkor sxema (katta qadam)', scheme: 'theta', theta: 0, K: 60, short: 'Oshkor, τ = 10 s' },
    { name: 'Oshkor sxema (kichik qadam, Fo ≤ ½)', scheme: 'theta', theta: 0, K: 1500, short: 'Oshkor, τ = 0.4 s' },
    { name: 'Oshkormas + Zeydel', scheme: 'theta', theta: 1, K: 60, omega: 1, short: 'Oshkormas + Zeydel' },
    { name: 'Oshkormas + SOR (ω optimal)', scheme: 'theta', theta: 1, K: 60, omega: omegaOpt, short: 'Oshkormas + SOR' },
    { name: 'Krank–Nikolson + SOR', scheme: 'theta', theta: 0.5, K: 60, omega: omegaOpt, short: 'Krank–Nikolson + SOR' },
    { name: 'O’zgaruvchan yo’nalishlar (ADI) + haydash', scheme: 'adi', theta: 0.5, K: 60, short: 'ADI + haydash' }
  ];
  // Eng maqbul: talab qilingan aniqlikka (0.05 °C) erishgan usullar ichida eng tezi
  function pick(rows, tol) { const ok = rows.filter(r => r.err <= tol); return ok.length ? ok.reduce((a, b) => (a.ms <= b.ms ? a : b)) : null; }
  function compareAll(dim) {
    const list = dim === 2 ? M2 : M1, f = dim === 2 ? run2D : run1D;
    const rows = list.map(m => Object.assign({}, m, f(m)));
    return { rows, best: pick(rows, 0.05), tol: 0.05, omegaOpt };
  }
  TL.compareAll = compareAll; TL.CMP = { P1, P2 };

  // ---------------- Interfeys (brauzerda) ----------------
  const WHY = {
    1: 'Krank–Nikolson sxemasi vaqt bo’yicha 2-tartibli aniq va istalgan qadamda turg’un, shuning uchun katta qadam (τ = 10 s) bilan ham aniq natija beradi. Har qadamda uch diagonalli sistema haydash usuli bilan O(N) amalda, iteratsiyasiz yechiladi.',
    2: 'O’zgaruvchan yo’nalishlar usuli (ADI) har qadamni ikki yarim qadamga bo’ladi: avval x, keyin y bo’yicha oshkormas. Natijada katta 2D sistema o’rniga ko’plab kichik uch diagonalli sistemalar haydash bilan yechiladi – iteratsiya kerak emas, sxema turg’un va 2-tartibli aniq.'
  };
  function show(dim) {
    const $ = id => document.getElementById(id); if (!$('cmpOut')) return;
    dim = dim || (+($('cmpDim') && $('cmpDim').value) || 1);
    $('cmpOut').innerHTML = '<p class="hint">Hisoblanmoqda…</p>';
    setTimeout(() => {
      const r = compareAll(dim), maxMs = Math.max(...r.rows.map(x => x.ms));
      const P = dim === 2 ? P2 : P1;
      const rows = r.rows.map(x => {
        const blow = x.err === Infinity, ok = !blow && x.err <= r.tol, best = r.best && x.short === r.best.short;
        const cls = blow ? 'bad' : ok ? (best ? 'best' : 'ok') : 'warn';
        const verdict = blow ? 'portladi – turg’un emas' : best ? 'ENG MAQBUL' : ok ? 'aniq, lekin sekinroq' : 'aniqlik yetmaydi';
        return `<tr class="${cls}"><td class="l">${x.name}</td><td>${x.Fo.toFixed(2)}</td><td>${x.K}</td><td>${x.iters ? x.iters.toFixed(0) : '–'}</td><td>${blow ? '∞' : x.err.toExponential(1)}</td>
          <td class="barcell"><span class="bar" style="width:${Math.max(2, x.ms / maxMs * 70)}%"></span><span class="bv">${x.ms.toFixed(1)} ms</span></td><td>${verdict}</td></tr>`;
      }).join('');
      $('cmpOut').innerHTML = `<p class="hint">Masala: ${dim === 2 ? `po’lat plastinka ${P.L * 100}×${P.L * 100} sm, to’r ${P.N}×${P.N}` : `po’lat sterjen ${P.L * 100} sm, to’r ${P.N} oraliq`}, chetlari 0 °C, ${P.T / 60} daqiqa. Aniq yechim ma’lum: ${dim === 2 ? 'u = 100·e<sup>−2a²π²t/L²</sup>·sin(πx/L)·sin(πy/L)' : 'u = 100·e<sup>−a²π²t/L²</sup>·sin(πx/L)'}. Talab: xato ≤ ${r.tol} °C.</p>
      <div class="tablewrap"><table class="soltab cmp"><thead><tr><th>Usul</th><th>Fo</th><th>Qadamlar</th><th>Iteratsiya / qadam</th><th>Maks. xato, °C</th><th>Hisoblash vaqti</th><th>Baho</th></tr></thead><tbody>${rows}</tbody></table></div>
      ${r.best ? `<div class="verdict ok"><b>Eng maqbul usul: ${r.best.name}.</b> ${WHY[dim]} Xato ${r.best.err.toExponential(1)} °C, vaqt ${r.best.ms.toFixed(1)} ms.</div>` : ''}
      <p class="hint">Vaqt brauzer va kompyuterga qarab farq qiladi, lekin usullar orasidagi nisbat saqlanadi. Fo – Furye soni: oshkor sxema faqat Fo ≤ ½ da turg’un.</p>`;
    }, 30);
  }
  root.TermoCmp = { show };
  if (typeof module !== 'undefined') module.exports = TL;
})(typeof window !== 'undefined' ? window : globalThis);
