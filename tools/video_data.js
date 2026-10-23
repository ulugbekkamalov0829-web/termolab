// Video uchun ma'lumot: node tools/video_data.js  ->  tools/data.json, keyin: python3 tools/video_usullar.py media/termolab_usullar.mp4
global.window = global; require('../src/core.js'); require('../src/compare.js');
const fs = require('fs'); const { P1 } = TL.CMP;
const ex = (x, t) => 100 * Math.exp(-P1.a2 * Math.PI ** 2 * t / P1.L ** 2) * Math.sin(Math.PI * x / P1.L);
const z = { type: 1, g: () => 0 };
const M = [['Oshkor sxema', 'katta qadam τ = 10 s', 0, 60, 'thomas'], ['Oshkor sxema', 'kichik qadam τ = 0.125 s', 0, 4800, 'thomas'],
  ['Oshkormas sxema', '+ Zeydel iteratsiyasi', 1, 60, 'seidel'], ['Oshkormas sxema', '+ haydash usuli', 1, 60, 'thomas'],
  ['Krank–Nikolson', '+ Zeydel iteratsiyasi', 0.5, 60, 'seidel'], ['Krank–Nikolson', '+ haydash usuli', 0.5, 60, 'thomas']];
const out = { x: null, T: P1.T, methods: [] };
for (const [n, s, th, K, solver] of M) {
  const p = { L: P1.L, N: P1.N, T: P1.T, K, a2: P1.a2, lam: P1.lam, bc: [z, z], init: x => ex(x, 0), theta: th, solver, eps: 1e-9, frames: 60 };
  let r, best = 1e9; for (let k = 0; k < 8; k++) { const t0 = process.hrtime.bigint(); r = TL.solve1D(p); best = Math.min(best, Number(process.hrtime.bigint() - t0) / 1e6); }
  out.x = Array.from(r.x);
  let err = 0; for (let i = 0; i < r.x.length; i++) err = Math.max(err, Math.abs(r.u[i] - ex(r.x[i], P1.T)));
  out.methods.push({ name: n, sub: s, K, Fo: r.Fo, iters: r.iters, ms: best, err: r.blow > 0 || !isFinite(err) ? null : err, blow: r.blow,
    frames: r.frames.map(f => Array.from(f, v => isFinite(v) ? Math.max(-1e6, Math.min(1e6, v)) : 1e6)), times: r.times });
}
// 2D natijalar (jadval uchun)
TL.compareAll(2); const c2 = TL.compareAll(2);
out.d2 = c2.rows.map(r => ({ name: r.short, ms: r.ms, err: r.err === Infinity ? null : r.err }));
fs.writeFileSync(__dirname + '/data.json', JSON.stringify(out));
for (const m of out.methods) console.log(m.name, m.sub, m.ms.toFixed(2), m.err, m.iters);
console.log(out.d2);
