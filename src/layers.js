/*
 * TermoLab: ko'p qatlamli jismlar uchun chekli hajmlar usuli
 * ---------------------------------------------------------------
 *   rho*c * du/dt = (1/r^m) d/dr ( r^m * lambda * du/dr ) + Q
 *   m = 0 - tekis devor, m = 1 - silindr (quvur, sim), m = 2 - shar (tuxum, sharcha)
 *
 * Har bir qatlam o'z lambda, rho, c ga ega. Qatlamlar chegarasida issiqlik
 * oqimining uzluksizligi avtomatik saqlanadi (konservativ sxema).
 * Hujayra o'tkazuvchanligi barqaror holatdagi aniq formuladan olinadi:
 *   tekis:   G = lambda / h
 *   silindr: G = lambda / ln(r2/r1)
 *   shar:    G = lambda / (1/r1 - 1/r2)
 * shuning uchun barqaror holatda qatlamli devor/quvur/shar uchun natija aniq.
 * Vaqt bo'yicha theta-sxema (Rannacher boshlanishi bilan), haydash usuli.
 */
(function (root) {
  'use strict';
  const TL = root.TL || {};

  function mesh(p) {
    const m = p.geom || 0, x = [p.r0 || 0], cells = [];
    for (const L of p.layers) {
      const n = Math.max(1, L.n || 10), h = L.d / n;
      for (let k = 0; k < n; k++) { cells.push({ h, lam: L.lam, rc: L.rho * L.c, Q: L.Q || 0 }); x.push(x[x.length - 1] + h); }
    }
    const N = x.length, A = r => (m === 0 ? 1 : Math.pow(r, m));
    const V = (a, b) => (m === 0 ? b - a : (Math.pow(b, m + 1) - Math.pow(a, m + 1)) / (m + 1));
    const G = cells.map((c, j) => {
      const r1 = x[j], r2 = x[j + 1];
      if (m === 0) return c.lam / c.h;
      if (r1 <= 0) return c.lam * A((r1 + r2) / 2) / c.h;
      return m === 1 ? c.lam / Math.log(r2 / r1) : c.lam / (1 / r1 - 1 / r2);
    });
    const C = new Float64Array(N), S = new Float64Array(N); // issiqlik sig'imi va manba
    for (let i = 0; i < N; i++) {
      if (i > 0) { const c = cells[i - 1], v = V(x[i] - c.h / 2, x[i]); C[i] += c.rc * v; S[i] += c.Q * v; }
      if (i < N - 1) { const c = cells[i], v = V(x[i], x[i] + c.h / 2); C[i] += c.rc * v; S[i] += c.Q * v; }
    }
    return { m, x, cells, G, C, S, N, A };
  }

  const val = (v, t) => (typeof v === 'function' ? v(t) : (v || 0));

  // L matritsa (uch diagonal) va erkin had b(t)
  function system(M, bcIn, bcOut, qf) {
    const { N, G, A, x } = M;
    const lo = new Float64Array(N), di = new Float64Array(N), up = new Float64Array(N);
    for (let i = 0; i < N; i++) {
      if (i > 0) { lo[i] = -G[i - 1]; di[i] += G[i - 1]; }
      if (i < N - 1) { up[i] = -G[i]; di[i] += G[i]; }
    }
    const a0 = A(x[0]), aN = A(x[N - 1]);
    if (bcIn.type === 3) di[0] += a0 * bcIn.alpha;
    if (bcOut.type === 3) di[N - 1] += aN * bcOut.alpha;
    const b = (t, out) => {
      out.set(M.S);
      if (qf) { const k = qf(t); for (let i = 0; i < out.length; i++) out[i] *= k; } // vaqtga bog'liq manba (masalan, sement gidratatsiyasi)
      if (bcIn.type !== 1) out[0] += a0 * ((bcIn.type === 3 ? bcIn.alpha * val(bcIn.ue, t) : 0) + val(bcIn.q, t));
      if (bcOut.type !== 1) out[N - 1] += aN * ((bcOut.type === 3 ? bcOut.alpha * val(bcOut.ue, t) : 0) + val(bcOut.q, t));
      return out;
    };
    return { lo, di, up, b };
  }

  // p = {geom, r0, layers:[{d,lam,rho,c,n,Q}], inner, outer, init(x)|T0, T, K, theta, frames}
  function solveLayered(p) {
    const M = mesh(p), N = M.N, sys = system(M, p.inner, p.outer, p.Qf), tau = p.T / p.K, th = p.theta ?? 0.5;
    const init = p.init || (() => p.T0 || 0);
    let u = new Float64Array(N); for (let i = 0; i < N; i++) u[i] = init(M.x[i]);
    if (p.inner.type === 1) u[0] = val(p.inner.g, 0);
    if (p.outer.type === 1) u[N - 1] = val(p.outer.g, 0);
    const every = Math.max(1, Math.ceil(p.K / (p.frames || 200)));
    const frames = [Float64Array.from(u)], times = [0];
    const b0 = new Float64Array(N), b1 = new Float64Array(N), rhs = new Float64Array(N), nx = new Float64Array(N);
    const lo = new Float64Array(N), di = new Float64Array(N), up = new Float64Array(N);
    const start = th === 0.5 ? 2 : 0;
    for (let j = 0; j < p.K; j++) {
      const t0 = j * tau, t1 = t0 + tau, tj = j < start ? 1 : th;
      sys.b(t0, b0); sys.b(t1, b1);
      for (let i = 0; i < N; i++) {
        const dir = (i === 0 && p.inner.type === 1) || (i === N - 1 && p.outer.type === 1);
        if (dir) { lo[i] = 0; di[i] = 1; up[i] = 0; rhs[i] = val(i === 0 ? p.inner.g : p.outer.g, t1); continue; }
        lo[i] = tj * tau * sys.lo[i]; di[i] = M.C[i] + tj * tau * sys.di[i]; up[i] = tj * tau * sys.up[i];
        const Lu = sys.di[i] * u[i] + (i > 0 ? sys.lo[i] * u[i - 1] : 0) + (i < N - 1 ? sys.up[i] * u[i + 1] : 0);
        rhs[i] = M.C[i] * u[i] - (1 - tj) * tau * Lu + tau * (tj * b1[i] + (1 - tj) * b0[i]);
      }
      TL.thomas(lo, di, up, rhs, nx); u = Float64Array.from(nx);
      if ((j + 1) % every === 0 || j === p.K - 1) { frames.push(Float64Array.from(u)); times.push(t1); }
    }
    return { x: M.x, mesh: M, frames, times, u, tau };
  }

  // Barqaror holat: L u = b
  function steadyLayered(p, t = 0) {
    const M = mesh(p), N = M.N, sys = system(M, p.inner, p.outer), b = sys.b(t, new Float64Array(N));
    const lo = Float64Array.from(sys.lo), di = Float64Array.from(sys.di), up = Float64Array.from(sys.up), rhs = Float64Array.from(b);
    if (p.inner.type === 1) { lo[0] = 0; di[0] = 1; up[0] = 0; rhs[0] = val(p.inner.g, t); }
    if (p.outer.type === 1) { lo[N - 1] = 0; di[N - 1] = 1; up[N - 1] = 0; rhs[N - 1] = val(p.outer.g, t); }
    const u = TL.thomas(lo, di, up, rhs, new Float64Array(N));
    return { x: M.x, mesh: M, u };
  }

  // Tashqi sirt orqali chiqayotgan issiqlik: tekis - W/m², silindr - W/m (uzunlik), shar - W (to'liq)
  function outerFlux(M, u, outer, t = 0) {
    const N = M.N, geomFactor = M.m === 0 ? 1 : M.m === 1 ? 2 * Math.PI : 4 * Math.PI;
    let q;
    if (outer.type === 3) q = M.A(M.x[N - 1]) * outer.alpha * (u[N - 1] - val(outer.ue, t));
    else q = M.G[N - 2] * (u[N - 2] - u[N - 1]); // oxirgi hujayra orqali oqim
    return q * geomFactor;
  }
  function innerFlux(M, u) { // ichki sirtdan kirayotgan oqim (birinchi hujayra orqali)
    const geomFactor = M.m === 0 ? 1 : M.m === 1 ? 2 * Math.PI : 4 * Math.PI;
    return M.G[0] * (u[0] - u[1]) * geomFactor;
  }

  /*
   * Yong'indagi temir-beton plita (EN 1992-1-2 bo'yicha nochiziqli masala)
   *   rho(T) c(T) dT/dt = d/dx( lambda(T) dT/dx )
   *   x = 0: yong'in tomoni, ISO 834 standart egri chizig'i, konveksiya + nurlanish
   *   x = h: yong'in bo'lmagan tomon, 20 °C havo
   * Oshkormas sxema, koeffitsientlar oldingi qatlamdan olinadi (Pikar iteratsiyasi bilan).
   */
  const iso834 = t => 20 + 345 * Math.log10(8 * t / 60 + 1);   // t - soniya
  const lamC = T => { const x = Math.min(1200, Math.max(20, T)) / 100; return 1.36 - 0.136 * x + 0.0057 * x * x; };
  function cpC(T, moist) {
    const peak = moist >= 3 ? 2020 : moist >= 1.5 ? 1470 : 900;
    if (T <= 100) return 900;
    if (T <= 115) return peak;
    if (T <= 200) return peak - (peak - 1000) * (T - 115) / 85;
    if (T <= 400) return 1000 + (T - 200) / 2;
    return 1100;
  }
  function rhoC(T, r0) {
    if (T <= 115) return r0;
    if (T <= 200) return r0 * (1 - 0.02 * (T - 115) / 85);
    if (T <= 400) return r0 * (0.98 - 0.03 * (T - 200) / 200);
    return r0 * (0.95 - 0.07 * (Math.min(T, 1200) - 400) / 800);
  }
  function fireSlab(p) {
    const N = p.N || 61, h = p.h, dx = h / (N - 1), dt = p.dt || 5, K = Math.round(p.T / dt), moist = p.moist ?? 1.5, r0 = p.rho || 2300;
    const curve = p.curve || iso834, ac = 25, em = 0.7, sg = 5.67e-8, aBack = 9;
    let u = new Float64Array(N).fill(20);
    const every = Math.max(1, Math.ceil(K / (p.frames || 200)));
    const frames = [Float64Array.from(u)], times = [0], probe = p.probe != null ? [u[p.probe]] : null;
    const lo = new Float64Array(N), di = new Float64Array(N), up = new Float64Array(N), rhs = new Float64Array(N), nx = new Float64Array(N);
    for (let j = 0; j < K; j++) {
      const t1 = (j + 1) * dt, Tg = curve(t1);
      let w = u;
      for (let it = 0; it < 2; it++) {         // Pikar: koeffitsientlarni yangi qatlam bo'yicha aniqlashtirish
        for (let i = 0; i < N; i++) {
          const Tm = 0.5 * (u[i] + w[i]);
          const C = rhoC(Tm, r0) * cpC(Tm, moist) * (i === 0 || i === N - 1 ? dx / 2 : dx);
          const gl = i > 0 ? lamC(0.5 * (w[i] + w[i - 1])) / dx : 0, gr = i < N - 1 ? lamC(0.5 * (w[i] + w[i + 1])) / dx : 0;
          lo[i] = -gl * dt; up[i] = -gr * dt; di[i] = C + (gl + gr) * dt; rhs[i] = C * u[i];
          if (i === 0) { const Ts = w[0] + 273.15, Gk = Tg + 273.15, hr = em * sg * (Gk * Gk + Ts * Ts) * (Gk + Ts); di[i] += (ac + hr) * dt; rhs[i] += (ac + hr) * Tg * dt; }
          if (i === N - 1) { di[i] += aBack * dt; rhs[i] += aBack * 20 * dt; }
        }
        TL.thomas(lo, di, up, rhs, nx); w = Float64Array.from(nx);
      }
      u = w;
      if (probe) probe.push(u[p.probe]);
      if ((j + 1) % every === 0 || j === K - 1) { frames.push(Float64Array.from(u)); times.push(t1); }
    }
    const x = Array.from({ length: N }, (_, i) => i * dx);
    return { x, frames, times, u, tau: dt, probeVals: probe };
  }
  TL.fireSlab = fireSlab; TL.iso834 = iso834;

  TL.solveLayered = solveLayered; TL.steadyLayered = steadyLayered; TL.outerFlux = outerFlux; TL.innerFlux = innerFlux; TL.layerMesh = mesh;
  root.TL = TL;
  if (typeof module !== 'undefined') module.exports = TL;
})(typeof window !== 'undefined' ? window : globalThis);
