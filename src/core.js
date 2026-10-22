/*
 * TermoLab hisoblash yadrosi
 * ---------------------------------------------------------------
 * Issiqlik o'tkazuvchanlik tenglamasi (o'zgarmas koeffitsientlar):
 *
 *   du/dt = a^2 * Laplace(u) + f(x,t) - beta*(u - u_s)
 *
 *   a^2  = lambda/(rho*c)          temperatura o'tkazuvchanlik, m^2/s
 *   f    = Q/(rho*c)               ichki manba, K/s
 *   beta = sirtdan issiqlik almashish (sterjen yon sirti yoki plastinka yuzlari), 1/s
 *
 * Chegaraviy shartlar (n - tashqi normal):
 *   I tur  (Dirixle):  u = g(t)
 *   II tur (Neyman):   lambda * du/dn = q(t)                q > 0 - jismga kirayotgan oqim
 *   III tur (aralash): lambda * du/dn + alpha*u = alpha*u_env + q(t)
 *   (II tur - III turning alpha = 0 xususiy holi.)
 *
 * Fazoviy diskretlash: markaziy ayirmalar O(h^2), oqimli chegaralarda
 * "soxta tugun" (ghost point) usuli, u ham O(h^2).
 * Vaqt bo'yicha: theta-sxema (0 - oshkor, 1 - oshkormas, 1/2 - Krank-Nikolson),
 * 2D da qo'shimcha ravishda Pisman-Rekford o'zgaruvchan yo'nalishlar usuli (ADI).
 * Chiziqli sistemalar: haydash usuli (Thomas), Zeydel yoki SOR iteratsiyasi.
 *
 * Muallif: Kamalov Ulug'bek, 2026
 */
(function (root) {
  'use strict';

  // ---------- Uch diagonalli sistema: haydash usuli ----------
  // lo[i]*x[i-1] + di[i]*x[i] + up[i]*x[i+1] = rhs[i]
  function thomas(lo, di, up, rhs, x) {
    const n = di.length, c = new Float64Array(n), d = new Float64Array(n);
    c[0] = up[0] / di[0]; d[0] = rhs[0] / di[0];
    for (let i = 1; i < n; i++) {
      const m = di[i] - lo[i] * c[i - 1];
      c[i] = up[i] / m;
      d[i] = (rhs[i] - lo[i] * d[i - 1]) / m;
    }
    x[n - 1] = d[n - 1];
    for (let i = n - 2; i >= 0; i--) x[i] = d[i] - c[i] * x[i + 1];
    return x;
  }

  // Zeydel iteratsiyasi (uch diagonalli sistema uchun), iteratsiyalar sonini qaytaradi
  function seidel3(lo, di, up, rhs, x, eps, maxIt) {
    const n = di.length; let it = 0, rho;
    do {
      rho = 0;
      for (let i = 0; i < n; i++) {
        const v = (rhs[i] - (i > 0 ? lo[i] * x[i - 1] : 0) - (i < n - 1 ? up[i] * x[i + 1] : 0)) / di[i];
        const r = Math.abs(v - x[i]); if (r > rho) rho = r; x[i] = v;
      }
      it++;
    } while (rho > eps && it < maxIt);
    return it;
  }

  // ---------- Bir o'lchovli operator ----------
  // Qaytaradi: tugunlar bo'yicha lo, di, up (A matritsa) va bFn(t) (erkin had).
  // bc = {type:1|2|3, g(t), q(t), alpha, ue}
  function op1D(n, h, a2, lam, beta, bcL, bcR) {
    const lo = new Float64Array(n), di = new Float64Array(n), up = new Float64Array(n);
    const k = a2 / (h * h);
    for (let i = 1; i < n - 1; i++) { lo[i] = k; di[i] = -2 * k - beta; up[i] = k; }
    const dir = new Uint8Array(n);
    function edge(i, bc, inner) {
      if (bc.type === 1) { dir[i] = 1; return; }
      const al = bc.type === 3 ? bc.alpha : 0;
      di[i] = -2 * k - 2 * a2 * al / (h * lam) - beta;
      if (inner === 1) up[i] = 2 * k; else lo[i] = 2 * k;
    }
    edge(0, bcL, 1); edge(n - 1, bcR, -1);
    return { lo, di, up, dir, k };
  }

  function bcFlux(bc, t, x, y) { // chegaradagi erkin had: alpha*u_env + q(t)
    const al = bc.type === 3 ? bc.alpha : 0;
    return al * (bc.ue || 0) + (bc.q ? bc.q(t, x, y) : 0);
  }

  // ---------- 1D yechuvchi ----------
  // p = {L, N, T, K, a2, lam, beta, us, f(x,t), init(x), bc:[L,R], theta, solver:'thomas'|'seidel', eps, frames}
  function solve1D(p) {
    const N = p.N, n = N + 1, h = p.L / N, tau = p.T / p.K, th = p.theta;
    const A = op1D(n, h, p.a2, p.lam, p.beta || 0, p.bc[0], p.bc[1]);
    const x = new Float64Array(n); for (let i = 0; i < n; i++) x[i] = i * h;
    const f = p.f || (() => 0), us = p.us || 0, beta = p.beta || 0;
    const b = (t, out) => {
      for (let i = 0; i < n; i++) out[i] = f(x[i], t) + beta * us;
      const s = 2 * p.a2 / (h * p.lam);
      if (!A.dir[0]) out[0] += s * bcFlux(p.bc[0], t);
      if (!A.dir[n - 1]) out[n - 1] += s * bcFlux(p.bc[1], t);
      return out;
    };
    let u = new Float64Array(n); for (let i = 0; i < n; i++) u[i] = p.init(x[i]);
    if (A.dir[0]) u[0] = p.bc[0].g(0);
    if (A.dir[n - 1]) u[n - 1] = p.bc[1].g(0);
    const every = Math.max(1, Math.ceil(p.K / (p.frames || p.K)));
    const frames = [Float64Array.from(u)], times = [0];
    const lo = new Float64Array(n), di = new Float64Array(n), up = new Float64Array(n);
    const rhs = new Float64Array(n), b0 = new Float64Array(n), b1 = new Float64Array(n);
    // Rannacher boshlanishi: Krank-Nikolsonda dastlabki 2 qadam oshkormas (silliq bo'lmagan
    // boshlang'ich shartda paydo bo'ladigan so'nmas tebranishlarni bosadi, 2-tartib saqlanadi)
    const startSteps = (th === 0.5 && p.rannacher !== false) ? 2 : 0;
    function fill(t) {
      for (let i = 0; i < n; i++) {
        if (A.dir[i]) { lo[i] = 0; di[i] = 1; up[i] = 0; continue; }
        lo[i] = -t * tau * A.lo[i]; di[i] = 1 - t * tau * A.di[i]; up[i] = -t * tau * A.up[i];
      }
    }
    let iters = 0, blow = -1;
    const next = new Float64Array(n);
    for (let j = 0; j < p.K; j++) {
      const t0 = j * tau, t1 = t0 + tau;
      const thj = j < startSteps ? 1 : th;
      if (j === 0 || j === startSteps) fill(thj);
      b(t0, b0); b(t1, b1);
      for (let i = 0; i < n; i++) {
        if (A.dir[i]) { rhs[i] = (i === 0 ? p.bc[0] : p.bc[1]).g(t1); continue; }
        const Au = A.di[i] * u[i] + (i > 0 ? A.lo[i] * u[i - 1] : 0) + (i < n - 1 ? A.up[i] * u[i + 1] : 0);
        rhs[i] = u[i] + (1 - thj) * tau * Au + tau * (thj * b1[i] + (1 - thj) * b0[i]);
      }
      if (thj === 0) next.set(rhs);
      else if (p.solver === 'seidel') { next.set(u); iters += seidel3(lo, di, up, rhs, next, p.eps || 1e-6, 100000); }
      else thomas(lo, di, up, rhs, next);
      u = Float64Array.from(next);
      if (blow < 0) for (let i = 0; i < n; i++) if (!isFinite(u[i]) || Math.abs(u[i]) > 1e9) { blow = j + 1; break; }
      if ((j + 1) % every === 0 || j === p.K - 1) { frames.push(Float64Array.from(u)); times.push(t1); }
    }
    // Oshkor sxemaning turg'unlik chegarasi (Gershgorin bahosi): tau <= 2 / max|A|
    let rowMax = 0;
    for (let i = 0; i < n; i++) if (!A.dir[i]) rowMax = Math.max(rowMax, Math.abs(A.di[i]) + Math.abs(A.lo[i]) + Math.abs(A.up[i]));
    return {
      x, frames, times, h, tau, Fo: p.a2 * tau / (h * h), tauMax: rowMax ? 2 / rowMax : Infinity,
      iters: p.solver === 'seidel' && th > 0 ? iters / p.K : 0, blow, u
    };
  }

  // ---------- 2D yechuvchi ----------
  // p = {Lx, Ly, Nx, Ny, T, K, a2, lam, beta, us, f(x,y,t), init(x,y),
  //      bc:{left,right,bottom,top}, scheme:'adi'|'theta', theta, omega, eps, frames}
  function solve2D(p) {
    const Nx = p.Nx, Ny = p.Ny, nx = Nx + 1, ny = Ny + 1, hx = p.Lx / Nx, hy = p.Ly / Ny;
    const tau = p.T / p.K, beta = p.beta || 0, us = p.us || 0, a2 = p.a2, lam = p.lam;
    const f = p.f || (() => 0), B = p.bc, id = (i, k) => k * nx + i, M = nx * ny;
    const X = new Float64Array(nx), Y = new Float64Array(ny);
    for (let i = 0; i < nx; i++) X[i] = i * hx;
    for (let k = 0; k < ny; k++) Y[k] = k * hy;
    // x va y yo'nalishdagi operatorlar (beta teng ikkiga bo'linadi)
    const Ax = op1D(nx, hx, a2, lam, beta / 2, B.left, B.right);
    const Ay = op1D(ny, hy, a2, lam, beta / 2, B.bottom, B.top);
    // Dirixle tugunlari va ularning qiymati
    const dirSide = new Int8Array(M); // 0 - ichki/oqim, 1..4 - qaysi tomon Dirixle
    for (let k = 0; k < ny; k++) for (let i = 0; i < nx; i++) {
      let s = 0;
      if (i === 0 && B.left.type === 1) s = 1;
      else if (i === nx - 1 && B.right.type === 1) s = 2;
      else if (k === 0 && B.bottom.type === 1) s = 3;
      else if (k === ny - 1 && B.top.type === 1) s = 4;
      dirSide[id(i, k)] = s;
    }
    const sides = [null, B.left, B.right, B.bottom, B.top];
    const gAt = (m, t) => sides[dirSide[m]].g(t, X[m % nx], Y[(m / nx) | 0]);
    const sx = 2 * a2 / (hx * lam), sy = 2 * a2 / (hy * lam);
    function S(t, out) { // erkin had: f + beta*us + chegaraviy oqimlar
      for (let k = 0; k < ny; k++) for (let i = 0; i < nx; i++) {
        let v = f(X[i], Y[k], t) + beta * us;
        if (i === 0 && !Ax.dir[0]) v += sx * bcFlux(B.left, t, X[i], Y[k]);
        if (i === nx - 1 && !Ax.dir[nx - 1]) v += sx * bcFlux(B.right, t, X[i], Y[k]);
        if (k === 0 && !Ay.dir[0]) v += sy * bcFlux(B.bottom, t, X[i], Y[k]);
        if (k === ny - 1 && !Ay.dir[ny - 1]) v += sy * bcFlux(B.top, t, X[i], Y[k]);
        out[id(i, k)] = v;
      }
      return out;
    }
    // ADI uchun erkin hadni bo'lish: Sx - x-chegaralardagi oqim, Sy - y-chegaralardagi oqim, F - manba
    function Split(t, sxo, syo, fo) {
      for (let k = 0; k < ny; k++) for (let i = 0; i < nx; i++) {
        const m = id(i, k); let vx = 0, vy = 0;
        if (i === 0 && !Ax.dir[0]) vx += sx * bcFlux(B.left, t, X[i], Y[k]);
        if (i === nx - 1 && !Ax.dir[nx - 1]) vx += sx * bcFlux(B.right, t, X[i], Y[k]);
        if (k === 0 && !Ay.dir[0]) vy += sy * bcFlux(B.bottom, t, X[i], Y[k]);
        if (k === ny - 1 && !Ay.dir[ny - 1]) vy += sy * bcFlux(B.top, t, X[i], Y[k]);
        if (sxo) sxo[m] = vx; if (syo) syo[m] = vy; if (fo) fo[m] = f(X[i], Y[k], t) + beta * us;
      }
    }
    const AxU = (u, i, k) => { const m = id(i, k); return Ax.di[i] * u[m] + (i > 0 ? Ax.lo[i] * u[m - 1] : 0) + (i < nx - 1 ? Ax.up[i] * u[m + 1] : 0); };
    const AyU = (u, i, k) => { const m = id(i, k); return Ay.di[k] * u[m] + (k > 0 ? Ay.lo[k] * u[m - nx] : 0) + (k < ny - 1 ? Ay.up[k] * u[m + nx] : 0); };

    let u = new Float64Array(M);
    for (let k = 0; k < ny; k++) for (let i = 0; i < nx; i++) {
      const m = id(i, k); u[m] = dirSide[m] ? gAt(m, 0) : p.init(X[i], Y[k]);
    }
    const every = Math.max(1, Math.ceil(p.K / (p.frames || p.K)));
    const frames = [Float32Array.from(u)], times = [0];
    const probeVals = p.probe != null ? [u[p.probe]] : null; // har qadamdagi nuqta qiymati (ixtiyoriy)
    const s0 = new Float64Array(M), s1 = new Float64Array(M);
    const sxm = new Float64Array(M), sy0 = new Float64Array(M), sy1 = new Float64Array(M), fm = new Float64Array(M);
    const ustar = new Float64Array(M), next = new Float64Array(M), rhs = new Float64Array(M);
    let iters = 0, blow = -1;
    const scheme = p.scheme || 'adi', th = scheme === 'theta' ? p.theta : 0.5;
    const omega = p.omega || 1.0, eps = p.eps || 1e-7;

    // ADI uchun uch diagonalli massivlar
    const loX = new Float64Array(nx), diX = new Float64Array(nx), upX = new Float64Array(nx), rX = new Float64Array(nx), oX = new Float64Array(nx);
    const loY = new Float64Array(ny), diY = new Float64Array(ny), upY = new Float64Array(ny), rY = new Float64Array(ny), oY = new Float64Array(ny);

    const startSteps = (th === 0.5 && p.rannacher !== false) ? 2 : 0;
    for (let j = 0; j < p.K; j++) {
      const t0 = j * tau, t1 = t0 + tau, tm = t0 + tau / 2;
      const thj = j < startSteps ? 1 : th;
      if (scheme === 'adi' && j >= startSteps) {
        Split(tm, sxm, null, fm); Split(t0, null, sy0, null); Split(t1, null, sy1, null);
        // 1-yarim qadam: x bo'yicha oshkormas, y bo'yicha oshkor
        for (let k = 0; k < ny; k++) {
          const rowDir = Ay.dir[k];
          for (let i = 0; i < nx; i++) {
            const m = id(i, k);
            if (dirSide[m] || rowDir) {
              loX[i] = 0; diX[i] = 1; upX[i] = 0;
              // Dirixle ustunlarida oraliq qiymat (Pisman-Rekford chegaraviy tuzatmasi)
              if (dirSide[m] && !rowDir) {
                // u* = 1/2 [(I + tau/2*Ay) g^n + (I - tau/2*Ay) g^{n+1}], Ay - ustun bo'ylab to'liq operator
                const g0 = gAt(m, t0), g1 = gAt(m, t1);
                const ay = t => {
                  let v = Ay.di[k] * gAt(m, t);
                  if (k > 0) v += Ay.lo[k] * gAt(m - nx, t);
                  if (k < ny - 1) v += Ay.up[k] * gAt(m + nx, t);
                  if (k === 0) v += sy * bcFlux(B.bottom, t, X[i], Y[k]);
                  if (k === ny - 1) v += sy * bcFlux(B.top, t, X[i], Y[k]);
                  return v;
                };
                rX[i] = 0.5 * (g0 + g1) + tau / 4 * (ay(t0) - ay(t1));
              } else rX[i] = dirSide[m] ? gAt(m, tm) : u[m];
              continue;
            }
            loX[i] = -tau / 2 * Ax.lo[i]; diX[i] = 1 - tau / 2 * Ax.di[i]; upX[i] = -tau / 2 * Ax.up[i];
            rX[i] = u[m] + tau / 2 * (AyU(u, i, k) + sy0[m]) + tau / 2 * (sxm[m] + fm[m]);
          }
          thomas(loX, diX, upX, rX, oX);
          for (let i = 0; i < nx; i++) ustar[id(i, k)] = oX[i];
        }
        // 2-yarim qadam: y bo'yicha oshkormas, x bo'yicha oshkor
        for (let i = 0; i < nx; i++) {
          for (let k = 0; k < ny; k++) {
            const m = id(i, k);
            if (dirSide[m]) { loY[k] = 0; diY[k] = 1; upY[k] = 0; rY[k] = gAt(m, t1); continue; }
            loY[k] = -tau / 2 * Ay.lo[k]; diY[k] = 1 - tau / 2 * Ay.di[k]; upY[k] = -tau / 2 * Ay.up[k];
            rY[k] = ustar[m] + tau / 2 * (AxU(ustar, i, k) + sxm[m]) + tau / 2 * (sy1[m] + fm[m]);
          }
          thomas(loY, diY, upY, rY, oY);
          for (let k = 0; k < ny; k++) next[id(i, k)] = oY[k];
        }
      } else {
        // theta-sxema: (I - th*tau*A) u1 = (I + (1-th)*tau*A) u0 + tau*(th*S1 + (1-th)*S0)
        const th = thj;
        S(t0, s0); S(t1, s1);
        for (let k = 0; k < ny; k++) for (let i = 0; i < nx; i++) {
          const m = id(i, k);
          if (dirSide[m]) { rhs[m] = gAt(m, t1); continue; }
          rhs[m] = u[m] + (1 - th) * tau * (AxU(u, i, k) + AyU(u, i, k)) + tau * (th * s1[m] + (1 - th) * s0[m]);
        }
        if (th === 0) next.set(rhs);
        else {
          next.set(u);
          for (let m = 0; m < M; m++) if (dirSide[m]) next[m] = rhs[m];
          let it = 0, rho;
          do { // SOR (omega = 1 bo'lsa Zeydel)
            rho = 0;
            for (let k = 0; k < ny; k++) for (let i = 0; i < nx; i++) {
              const m = id(i, k); if (dirSide[m]) continue;
              const diag = 1 - th * tau * (Ax.di[i] + Ay.di[k]);
              let off = 0;
              if (i > 0) off += Ax.lo[i] * next[m - 1];
              if (i < nx - 1) off += Ax.up[i] * next[m + 1];
              if (k > 0) off += Ay.lo[k] * next[m - nx];
              if (k < ny - 1) off += Ay.up[k] * next[m + nx];
              const gs = (rhs[m] + th * tau * off) / diag;
              const v = next[m] + omega * (gs - next[m]);
              const r = Math.abs(v - next[m]); if (r > rho) rho = r;
              next[m] = v;
            }
            it++;
          } while (rho > eps && it < 20000);
          iters += it;
        }
      }
      u = Float64Array.from(next);
      if (probeVals) probeVals.push(u[p.probe]);
      if (blow < 0) for (let m = 0; m < M; m++) if (!isFinite(u[m]) || Math.abs(u[m]) > 1e9) { blow = j + 1; break; }
      if ((j + 1) % every === 0 || j === p.K - 1) { frames.push(Float32Array.from(u)); times.push(t1); }
    }
    const tauMax = 1 / (2 * a2 * (1 / (hx * hx) + 1 / (hy * hy)) + beta);
    return {
      X, Y, nx, ny, frames, times, hx, hy, tau, u, probeVals,
      Fo: a2 * tau * (1 / (hx * hx) + 1 / (hy * hy)), tauMax,
      iters: scheme === 'theta' && th > 0 ? iters / p.K : 0, blow
    };
  }

  // ---------- Aniq yechim bilan tekshiruv (ishlab chiqarilgan yechimlar usuli) ----------
  // 1D: u = e^{-t} (1 + x/L + sin(pi x / L))
  function mms1D(L, a2, lam, beta, us, types) {
    const k = Math.PI / L;
    const U = (x, t) => Math.exp(-t) * (1 + x / L + Math.sin(k * x));
    const Ux = (x, t) => Math.exp(-t) * (1 / L + k * Math.cos(k * x));
    const Uxx = (x, t) => -Math.exp(-t) * k * k * Math.sin(k * x);
    const f = (x, t) => -U(x, t) - a2 * Uxx(x, t) + beta * (U(x, t) - us);
    const mk = (type, x, nsign) => {
      if (type === 1) return { type: 1, g: t => U(x, t) };
      const alpha = type === 3 ? 15 : 0, ue = 0.3;
      // lambda*du/dn + alpha*u = alpha*ue + q  =>  q = lambda*du/dn + alpha*(u - ue)
      return { type, alpha, ue, q: t => lam * nsign * Ux(x, t) + alpha * (U(x, t) - ue) };
    };
    return { U, f, bc: [mk(types[0], 0, -1), mk(types[1], L, 1)], init: x => U(x, 0) };
  }
  // 2D: u = e^{-t} (1 + sin(pi x/Lx) cos(pi y/(2 Ly)) + x y /(Lx Ly))
  function mms2D(Lx, Ly, a2, lam, beta, us, types) {
    const kx = Math.PI / Lx, ky = Math.PI / (2 * Ly), c = 1 / (Lx * Ly);
    const U = (x, y, t) => Math.exp(-t) * (1 + Math.sin(kx * x) * Math.cos(ky * y) + c * x * y);
    const Ux = (x, y, t) => Math.exp(-t) * (kx * Math.cos(kx * x) * Math.cos(ky * y) + c * y);
    const Uy = (x, y, t) => Math.exp(-t) * (-ky * Math.sin(kx * x) * Math.sin(ky * y) + c * x);
    const Lap = (x, y, t) => -Math.exp(-t) * (kx * kx + ky * ky) * Math.sin(kx * x) * Math.cos(ky * y);
    const f = (x, y, t) => -U(x, y, t) - a2 * Lap(x, y, t) + beta * (U(x, y, t) - us);
    // tomonlar: chap (n=-x), o'ng (n=+x), past (n=-y), yuqori (n=+y)
    const dn = { left: (x, y, t) => -Ux(x, y, t), right: Ux, bottom: (x, y, t) => -Uy(x, y, t), top: Uy };
    const mk = (type, side) => {
      if (type === 1) return { type: 1, g: (t, x, y) => U(x, y, t) };
      const alpha = type === 3 ? 15 : 0, ue = 0.3;
      return { type, alpha, ue, q: (t, x, y) => lam * dn[side](x, y, t) + alpha * (U(x, y, t) - ue) };
    };
    return {
      U, f, init: (x, y) => U(x, y, 0),
      bc: { left: mk(types[0], 'left'), right: mk(types[1], 'right'), bottom: mk(types[2], 'bottom'), top: mk(types[3], 'top') }
    };
  }

  root.TL = { thomas, seidel3, op1D, solve1D, solve2D, mms1D, mms2D };
  if (typeof module !== 'undefined') module.exports = root.TL;
})(typeof window !== 'undefined' ? window : globalThis);
