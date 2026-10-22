// Yong'in modeli: EN 1992-1-2, 5.8-jadval (bir yo'nalishda ishlaydigan plita) bilan solishtirish
// Ishga tushirish: node tests/yongin_ec2.test.js
global.window = global; require('../src/core.js'); const TL = require('../src/layers.js');
const EC2 = [[60, 80, 20], [90, 100, 30], [120, 120, 40], [180, 150, 55], [240, 175, 65]];
const sim = TL.fireSlab({ h: 0.3, N: 151, T: 240 * 60, dt: 10, frames: 1440 });
const aReq = t => { const f = sim.frames[Math.round(t * 60 / 10)]; for (let i = 0; i < f.length; i++) if (f[i] < 500) return i * 2; };
const hReq = t => { for (let h = 50; h <= 300; h += 10) { const N = h / 2 + 1, r = TL.fireSlab({ h: h / 1000, N, T: t * 60, dt: 10, frames: 2 }); if (r.u[N - 1] < 160) return h; } };
console.log('Sinf     a model  a EC2   h model  h EC2');
for (const [t, h, a] of EC2) console.log(`REI ${String(t).padEnd(4)} ${String(aReq(t)).padStart(5)}   ${String(a).padStart(5)}   ${String(hReq(t)).padStart(5)}   ${String(h).padStart(5)}  (mm)`);
