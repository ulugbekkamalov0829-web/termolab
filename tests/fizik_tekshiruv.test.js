// Fizik holatlar: sonli yechimni barqaror holatdagi analitik yechim bilan solishtirish
const TL = require('../src/core.js');
// 1) Beton devor: barqaror oqim q = (u_i - u_o) / (1/a_i + L/lam + 1/a_o)
{
  const lam = 1.4, rc = 2300 * 880, L = 0.3;
  const r = TL.solve1D({ L, N: 60, T: 30 * 24 * 3600, K: 3000, a2: lam / rc, lam, init: () => 15, theta: 1, frames: 2,
    bc: [{ type: 3, alpha: 8, ue: 20, q: () => 0 }, { type: 3, alpha: 23, ue: -10, q: () => 0 }] });
  const u = r.u, h = r.h, n = u.length;
  const qnum = -lam * (3 * u[n - 1] - 4 * u[n - 2] + u[n - 3]) / (2 * h);
  const qan = 30 / (1 / 8 + L / lam + 1 / 23);
  console.log(`Devor: q_sonli = ${qnum.toFixed(2)} W/m2, q_analitik = ${qan.toFixed(2)} W/m2, ichki sirt ${u[0].toFixed(2)} C (analitik ${(20 - qan / 8).toFixed(2)} C)`);
  const r48 = TL.solve1D({ L, N: 60, T: 48 * 3600, K: 400, a2: lam / rc, lam, init: () => 15, theta: 1, frames: 2,
    bc: [{ type: 3, alpha: 8, ue: 20, q: () => 0 }, { type: 3, alpha: 23, ue: -10, q: () => 0 }] });
  const v = r48.u; console.log(`  48 soatda: q = ${(-lam * (3 * v[n - 1] - 4 * v[n - 2] + v[n - 3]) / (2 * h)).toFixed(2)} W/m2`);
}
// 2) Qizdirgich simi: u_max - u_s = Q/(lam m^2) (1 - 1/cosh(mL/2)), m^2 = 4 alpha/(lam d)
{
  const lam = 11.3, rc = 8400 * 450, d = 0.001, al = 15, Q = 2e7, L = 0.2;
  const beta = al * 4 / d / rc;
  const r = TL.solve1D({ L, N: 200, T: 1500, K: 1500, a2: lam / rc, lam, beta, us: 20, f: () => Q / rc, init: () => 20, theta: 0.5, frames: 2,
    bc: [{ type: 1, g: () => 20 }, { type: 1, g: () => 20 }] });
  const m = Math.sqrt(4 * al / (lam * d)), an = 20 + Q / (lam * m * m) * (1 - 1 / Math.cosh(m * L / 2));
  console.log(`Sim: u_max sonli = ${Math.max(...r.u).toFixed(2)} C, analitik = ${an.toFixed(2)} C`);
}
// 3) Mis sterjen (qovurg'a): uchi III tur, barqaror holat
{
  const lam = 401, rc = 8960 * 385, d = 0.01, al = 10, L = 0.5, beta = al * 4 / d / rc;
  const r = TL.solve1D({ L, N: 200, T: 6 * 3600, K: 2000, a2: lam / rc, lam, beta, us: 20, init: () => 20, theta: 1, frames: 2,
    bc: [{ type: 1, g: () => 100 }, { type: 3, alpha: al, ue: 20, q: () => 0 }] });
  const m = Math.sqrt(4 * al / (lam * d)), H = al / (m * lam);
  const tip = 20 + 80 * 1 / (Math.cosh(m * L) + H * Math.sinh(m * L));
  console.log(`Mis sterjen: uch harorati sonli = ${r.u[r.u.length - 1].toFixed(3)} C, analitik (qovurg'a) = ${tip.toFixed(3)} C`);
}
