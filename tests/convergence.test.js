// Yaqinlashish tartibini tekshirish: node tests/convergence.test.js
const TL = require('../src/core.js');
const a2 = 0.5, lam = 2, beta = 0.3, us = 0.1, T = 0.5;

function run1D(theta, types, N, K) {
  const m = TL.mms1D(1, a2, lam, beta, us, types);
  const r = TL.solve1D({ L: 1, N, T, K, a2, lam, beta, us, f: m.f, init: m.init, bc: m.bc, theta, frames: 1 });
  let e = 0; r.x.forEach((x, i) => e = Math.max(e, Math.abs(r.u[i] - m.U(x, T))));
  return { e, blow: r.blow };
}
function run2D(scheme, theta, types, N, K) {
  const m = TL.mms2D(1, 1, a2, lam, beta, us, types);
  const r = TL.solve2D({ Lx: 1, Ly: 1, Nx: N, Ny: N, T, K, a2, lam, beta, us, f: m.f, init: m.init, bc: m.bc,
    scheme, theta, omega: 1.6, eps: 1e-11, frames: 1 });
  let e = 0;
  for (let k = 0; k < r.ny; k++) for (let i = 0; i < r.nx; i++) e = Math.max(e, Math.abs(r.u[k * r.nx + i] - m.U(r.X[i], r.Y[k], T)));
  return { e, blow: r.blow };
}
function table(name, fn, grids) {
  console.log('\n' + name);
  let prev = null;
  for (const [N, K] of grids) {
    const { e, blow } = fn(N, K);
    const p = prev && blow < 0 ? Math.log2(prev / e).toFixed(2) : '  - ';
    console.log(`  N=${String(N).padStart(3)} K=${String(K).padStart(5)}  xato=${blow < 0 ? e.toExponential(3) : 'BUZILDI'}  tartib=${p}`);
    prev = blow < 0 ? e : null;
  }
}
const g1 = [[10, 10], [20, 20], [40, 40], [80, 80]];
const gE = [[10, 100], [20, 400], [40, 1600], [80, 6400]];   // oshkor: tau ~ h^2
const types1 = [3, 2];   // chap - III tur, o'ng - II tur
table('1D oshkor (tau ~ h^2), III/II', (N, K) => run1D(0, types1, N, K), gE);
table('1D oshkor, tau ~ h (turg\'unlik buziladi)', (N, K) => run1D(0, types1, N, K), g1);
table('1D oshkormas (theta=1), III/II', (N, K) => run1D(1, types1, N, K), g1);
table('1D Krank-Nikolson, III/II', (N, K) => run1D(0.5, types1, N, K), g1);
table('1D Krank-Nikolson, I/III', (N, K) => run1D(0.5, [1, 3], N, K), g1);
const g2 = [[8, 8], [16, 16], [32, 32], [64, 64]];
const t2 = [1, 3, 2, 3];  // chap I, o'ng III, past II, yuqori III
table('2D ADI, I/III/II/III', (N, K) => run2D('adi', 0.5, t2, N, K), g2);
table('2D ADI, hamma tomon I', (N, K) => run2D('adi', 0.5, [1, 1, 1, 1], N, K), g2);
table('2D Krank-Nikolson (SOR), I/III/II/III', (N, K) => run2D('theta', 0.5, t2, N, K), g2.slice(0, 3));
table('2D oshkormas (SOR), I/III/II/III', (N, K) => run2D('theta', 1, t2, N, K), g2.slice(0, 3));

// Kitobdagi 3-masala
const book = TL.solve1D({ L: 8, N: 50, T: 3, K: 200, a2: 25, lam: 1, beta: 0.16, us: 2,
  init: x => 0.25 + Math.sin(0.15 * x), bc: [{ type: 1, g: () => 0.25 }, { type: 1, g: () => 1.18 }], theta: 1, frames: 1 });
console.log('\nKitob 3-masala: u(L/2,T) =', book.u[25].toFixed(4), '(kutilgan 0.7781), Fo =', book.Fo.toFixed(2));
const bs = TL.solve1D({ L: 8, N: 50, T: 3, K: 200, a2: 25, lam: 1, beta: 0.16, us: 2,
  init: x => 0.25 + Math.sin(0.15 * x), bc: [{ type: 1, g: () => 0.25 }, { type: 1, g: () => 1.18 }], theta: 1, solver: 'seidel', eps: 1e-10, frames: 1 });
console.log('  Zeydel (har qatlamda): u(L/2,T) =', bs.u[25].toFixed(4), ', o\'rtacha iteratsiya/qatlam =', bs.iters.toFixed(1));
