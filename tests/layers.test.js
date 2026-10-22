// Ko'p qatlamli va silindr/shar geometriyali yechuvchi: analitik yechimlar bilan tekshiruv
globalThis.TL = require('../src/core.js');
require('../src/layers.js');
const TL = globalThis.TL;
const rel = (a, b) => (Math.abs(a - b) / Math.abs(b) * 100).toExponential(2) + ' %';

// 1) Ikki qatlamli devor (g'isht + penoplast), barqaror: q = dT / (1/ai + d1/l1 + d2/l2 + 1/ao)
{
  const p = { geom: 0, layers: [{ d: 0.38, lam: 0.7, rho: 1800, c: 880, n: 30 }, { d: 0.10, lam: 0.04, rho: 30, c: 1450, n: 20 }],
    inner: { type: 3, alpha: 8.7, ue: 20 }, outer: { type: 3, alpha: 23, ue: -10 } };
  const s = TL.steadyLayered(p), q = TL.outerFlux(s.mesh, s.u, p.outer);
  const qa = 30 / (1 / 8.7 + 0.38 / 0.7 + 0.10 / 0.04 + 1 / 23);
  console.log(`Devor (2 qatlam): q = ${q.toFixed(4)} W/m2, analitik ${qa.toFixed(4)}, farq ${rel(q, qa)}`);
  const tr = TL.solveLayered(Object.assign({}, p, { T0: 15, T: 40 * 86400, K: 2000, theta: 1 }));
  console.log(`  nostatsionar 40 kundan keyin q = ${TL.outerFlux(tr.mesh, tr.u, p.outer).toFixed(4)} W/m2`);
}
// 2) Issiqlik izolyatsiyali quvur, barqaror: q_l = 2 pi dT / (ln(r2/r1)/l1 + ln(r3/r2)/l2 + 1/(a r3))
{
  const r1 = 0.0525, r2 = 0.057, r3 = 0.107;
  const p = { geom: 1, r0: r1, layers: [{ d: r2 - r1, lam: 50, rho: 7850, c: 490, n: 6 }, { d: r3 - r2, lam: 0.04, rho: 100, c: 840, n: 30 }],
    inner: { type: 1, g: 70 }, outer: { type: 3, alpha: 15, ue: -5 } };
  const s = TL.steadyLayered(p), q = TL.outerFlux(s.mesh, s.u, p.outer);
  const qa = 2 * Math.PI * 75 / (Math.log(r2 / r1) / 50 + Math.log(r3 / r2) / 0.04 + 1 / (15 * r3));
  console.log(`Quvur (po'lat + izolyatsiya): q = ${q.toFixed(4)} W/m, analitik ${qa.toFixed(4)}, farq ${rel(q, qa)}`);
}
// 3) Shar (tuxum), sirt harorati birdaniga 100 C: markaz harorati - Furye qatori
{
  const R = 0.022, lam = 0.5, rho = 1035, c = 3200, a2 = lam / (rho * c), T0 = 5, Tw = 100;
  const p = { geom: 2, r0: 0, layers: [{ d: R, lam, rho, c, n: 80 }], inner: { type: 2, q: 0 }, outer: { type: 1, g: Tw }, T0, T: 600, K: 1200, theta: 0.5, frames: 600 };
  const r = TL.solveLayered(p);
  for (const tm of [120, 300, 600]) {
    const j = r.times.findIndex(t => Math.abs(t - tm) < 1e-6);
    let s = 0; for (let n = 1; n < 200; n++) s += 2 * Math.pow(-1, n + 1) * Math.exp(-n * n * Math.PI * Math.PI * a2 * tm / (R * R));
    const an = Tw + (T0 - Tw) * s;
    console.log(`Shar markazi, t = ${tm} s: sonli ${r.frames[j][0].toFixed(3)} C, analitik ${an.toFixed(3)} C`);
  }
}
// 4) Bir qatlamli tekis holat 1D yadro bilan bir xil bo'lishi kerak
{
  const p = { geom: 0, layers: [{ d: 0.3, lam: 1.4, rho: 2300, c: 880, n: 60 }], inner: { type: 3, alpha: 8, ue: 20 }, outer: { type: 3, alpha: 23, ue: -10 } };
  const s = TL.steadyLayered(p);
  console.log(`Beton devor: q = ${TL.outerFlux(s.mesh, s.u, p.outer).toFixed(2)} W/m2 (oldingi tekshiruvda 78.38)`);
}
