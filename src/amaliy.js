/* TermoLab — Amaliy masalalar: real hayotdagi savollarga javob beradigan virtual laboratoriya */
(function () {
'use strict';
const $ = id => document.getElementById(id);
const STOPS = [[34, 58, 140], [48, 128, 206], [120, 196, 214], [245, 226, 150], [240, 140, 60], [196, 38, 31]];
function rgb(t) {
  t = Math.max(0, Math.min(1, t)) * (STOPS.length - 1);
  const i = Math.min(STOPS.length - 2, Math.floor(t)), f = t - i, a = STOPS[i], b = STOPS[i + 1];
  return [0, 1, 2].map(k => Math.round(a[k] + (b[k] - a[k]) * f));
}
const n1 = v => (Math.abs(v) >= 100 ? v.toFixed(0) : Math.abs(v) >= 10 ? v.toFixed(1) : v.toFixed(2));
const C = v => n1(v) + ' °C';
function fmtNum(v) { const d = Math.abs(v) < 10 ? 2 : Math.abs(v) < 100 ? 1 : 0; const [a, b] = v.toFixed(d).split('.'); return a.replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + (b ? '.' + b : ''); }
function fmtTime(s) {
  if (s < 90) return Math.round(s) + ' soniya';
  if (s < 5400) return (s / 60).toFixed(s < 600 ? 1 : 0) + ' daqiqa';
  if (s < 3 * 86400) return (s / 3600).toFixed(1) + ' soat';
  return (s / 86400).toFixed(1) + ' kun';
}
function axisTime(s, T) { return T < 5400 ? (s / 60).toFixed(0) + ' min' : T < 3 * 86400 ? (s / 3600).toFixed(0) + ' soat' : (s / 86400).toFixed(1) + ' kun'; }
// Shudring nuqtasi (Magnus formulasi)
const dewPoint = (T, RH) => { const a = 17.62, b = 243.12, g = Math.log(RH / 100) + a * T / (b + T); return b * g / (a - g); };
// Vaqt qatoridan qiymatga birinchi yetish payti (chiziqli interpolyatsiya)
function crossTime(ts, ys, level, rising) {
  for (let j = 1; j < ys.length; j++) {
    const a = ys[j - 1], b = ys[j];
    if (rising ? (a < level && b >= level) : (a > level && b <= level)) return ts[j - 1] + (level - a) / (b - a) * (ts[j] - ts[j - 1]);
  }
  return null;
}

// ======================= SCENARIYLAR =======================
const WALL_MATS = { gisht: ['G’isht', 0.7, 1800, 880], beton: ['Beton', 1.4, 2300, 880], gazoblok: ['Gazoblok', 0.14, 500, 1000], paxsa: ['Paxsa (loy-somon)', 0.4, 1500, 1000], yogoch: ['Yog’och', 0.12, 510, 1380] };
const INSUL = { none: ['Yo’q', 0, 1, 1], penoplast: ['Penoplast', 0.038, 25, 1450], paxta: ['Mineral paxta', 0.04, 100, 840], ppu: ['Penopoliuretan', 0.03, 60, 1500] };

const SCEN = [
{
  id: 'devor', cat: 'Qurilish', icon: 'house', title: 'Uy devori qishda',
  q: 'Devoringizdan qancha issiqlik yo’qoladi, izolyatsiya qancha tejaydi va devor namlanmaydimi?',
  dim: '1D', why: 'Devorning eni va balandligi (metrlar) uning qalinligidan (santimetrlar) ancha katta. Shuning uchun issiqlik deyarli faqat bitta yo’nalishda – xonadan ko’chaga, qalinlik bo’ylab oqadi. Bu <b>bir o’lchovli (1D)</b> masala.',
  fields: [
    { id: 'mat', label: 'Devor materiali', type: 'select', opts: Object.entries(WALL_MATS).map(([k, v]) => [k, v[0]]), def: 'gisht' },
    { id: 'd', label: 'Devor qalinligi', type: 'range', min: 10, max: 80, step: 1, unit: 'sm', def: 38 },
    { id: 'ins', label: 'Issiqlik izolyatsiyasi (tashqi tomondan)', type: 'select', opts: Object.entries(INSUL).map(([k, v]) => [k, v[0]]), def: 'none' },
    { id: 'di', label: 'Izolyatsiya qalinligi', type: 'range', min: 0, max: 20, step: 1, unit: 'sm', def: 5 },
    { id: 'Ti', label: 'Xona harorati', type: 'range', min: 14, max: 26, step: 1, unit: '°C', def: 20 },
    { id: 'To', label: 'Ko’cha harorati (sovuq kun)', type: 'range', min: -25, max: 10, step: 1, unit: '°C', def: -10 },
    { id: 'RH', label: 'Xona havosi namligi', type: 'range', min: 30, max: 80, step: 5, unit: '%', def: 55 },
    { id: 'A', label: 'Tashqi devorlar yuzasi', type: 'range', min: 10, max: 200, step: 5, unit: 'm²', def: 60 },
    { id: 'price', label: '1 kWh issiqlik narxi (o’zingiz kiriting)', type: 'number', unit: 'so’m', def: 1000 },
    { id: 'daynight', label: 'Kun-tun harorat o’zgarishi (±6 °C)', type: 'check', def: true }
  ],
  run(v) {
    const m = WALL_MATS[v.mat], ins = INSUL[v.ins], hasIns = v.ins !== 'none' && v.di > 0;
    const layers = [{ d: v.d / 100, lam: m[1], rho: m[2], c: m[3], n: 40, name: m[0] }];
    if (hasIns) layers.push({ d: v.di / 100, lam: ins[1], rho: ins[2], c: ins[3], n: 20, name: ins[0] });
    const ai = 8.7, ao = 23, day = 86400;
    const ue = v.daynight ? t => v.To + 6 * Math.sin(2 * Math.PI * (t / day - 0.375)) : v.To;
    const base = { geom: 0, layers, inner: { type: 3, alpha: ai, ue: v.Ti }, outer: { type: 3, alpha: ao, ue: v.To } };
    const st = TL.steadyLayered(base), q = TL.outerFlux(st.mesh, st.u, base.outer);
    const R = 1 / ai + layers.reduce((s, L) => s + L.d / L.lam, 0) + 1 / ao, U = 1 / R;
    // izolyatsiyasiz taqqoslash
    const st0 = TL.steadyLayered({ geom: 0, layers: [layers[0]], inner: base.inner, outer: base.outer });
    const q0 = TL.outerFlux(st0.mesh, st0.u, base.outer);
    const Tsurf = st.u[0], dew = dewPoint(v.Ti, v.RH);
    // isitish mavsumi: 150 kun, o'rtacha tashqi harorat +3 °C
    const season = U * (v.Ti - 3) * v.A * 150 * 24 / 1000;
    // nostatsionar: devor 5 °C dan, isitish yoqildi, 4 kun
    const sim = TL.solveLayered(Object.assign({}, base, { outer: { type: 3, alpha: ao, ue }, T0: 5, T: 4 * day, K: 960, theta: 0.5, frames: 240 }));
    const ins0 = sim.frames.map(f => f[0]);
    const tWarm = crossTime(sim.times, ins0, Tsurf - 0.5, true);
    const edges = []; let acc = 0; for (const L of layers) { acc += L.d; edges.push(acc); } edges.pop();
    return {
      sim, x: sim.x, unitX: 'qalinlik, sm', xScale: 100, edges, range: [Math.min(v.To - 6, 5), v.Ti],
      answers: [
        { label: 'Issiqlik yo’qotish (eng sovuq kunda)', value: `${fmtNum(q * v.A / 1000)} kW`, note: `har 1 m² dan ${fmtNum(q)} W` },
        { label: 'Devorning issiqlik o’tkazish koeffitsienti U', value: `${U.toFixed(2)} W/(m²·K)`, note: `issiqlik qarshiligi R = ${R.toFixed(2)} m²·K/W`, verdict: R >= 2.5 ? 'ok' : R >= 1.5 ? 'info' : 'bad', vtext: R >= 2.5 ? 'yaxshi issiqlik saqlaydi' : R >= 1.5 ? 'o’rtacha' : 'issiqlikni yomon saqlaydi' },
        { label: 'Devorning ichki yuzasi harorati', value: C(Tsurf), note: `shudring nuqtasi ${C(dew)}`, verdict: Tsurf > dew + 3 ? 'ok' : Tsurf > dew ? 'info' : 'bad', vtext: Tsurf > dew + 3 ? 'namlanish va mog’or xavfi yo’q' : Tsurf > dew ? 'chegarada – burchaklarda mog’or bo’lishi mumkin' : 'devor terlaydi, mog’or xavfi bor' },
        { label: 'Isitish mavsumida devor orqali yo’qotish', value: `${fmtNum(season)} kWh`, note: `≈ ${fmtNum(season * v.price)} so’m (150 kun, o’rtacha +3 °C)` },
        hasIns ? { label: 'Izolyatsiya foydasi', value: `${Math.round((1 - q / q0) * 100)} % kam`, note: `izolyatsiyasiz ${fmtNum(q0)} W/m² bo’lardi`, verdict: 'ok', vtext: `mavsumda ≈ ${fmtNum(season * (q0 / q - 1))} kWh tejaladi` }
               : { label: 'Agar 5 sm penoplast qo’shilsa', value: '', calc: true },
        { label: 'Isitish yoqilgach devor isib bo’lishi', value: tWarm ? fmtTime(tWarm) : '4 kundan ko’p', note: 'ichki yuza barqaror haroratga yetguncha' }
      ],
      explain: `Issiqlik xonadan (${v.Ti} °C) ko’chaga (${v.To} °C) devor orqali oqadi. Har bir qatlam oqimga qarshilik ko’rsatadi: qatlam qanchalik qalin va material qanchalik “issiq” bo’lsa (λ kichik), qarshilik shuncha katta. Grafikdagi harorat chizig’i izolyatsiya qatlamida keskin pasayadi – issiqlikni asosan u ushlab qoladi.`,
      model: (u, col) => Models3D.wall(sim.x, u, col, edges, [
        { x: -0.35 * (sim.x[sim.x.length - 1]), y: 0.2, t: `Xona ${v.Ti} °C` },
        { x: sim.x[sim.x.length - 1] * 1.35, y: 0.2, t: `Ko’cha ${v.To} °C` }].map(l => ({ x: l.x, y: l.y, t: l.t, z: 0.95 }))),
      probeLabel: 'Devorning ichki yuzasi', probeIdx: 0, floor: -0.64
    };
  },
  fixup(r, v) { // "agar penoplast qo'shilsa" hisobini aniq qilish
    if (v.ins !== 'none' && v.di > 0) return;
    const m = WALL_MATS[v.mat];
    const R0 = 1 / 8.7 + v.d / 100 / m[1] + 1 / 23, R1 = R0 + 0.05 / 0.038;
    const a = r.answers.find(x => x.calc); a.value = `${Math.round((1 - R0 / R1) * 100)} % kam`; a.note = 'yo’qotish shuncha kamayadi (hisob)'; a.verdict = 'info'; a.vtext = `mavsumda ≈ ${fmtNum((1 - R0 / R1) * (v.Ti - 3) / R0 * v.A * 150 * 24 / 1000)} kWh tejaladi`;
  }
},
{
  id: 'quvur', cat: 'Energetika', icon: 'pipe', title: 'Issiq suv quvuri',
  q: 'Ko’chadagi issiq suv quvuri qancha issiqlik yo’qotadi va suv uyga yetguncha qancha soviydi?',
  dim: '1D (silindr)', why: 'Quvur uzun va har tomondan bir xil sharoitda. Shuning uchun harorat faqat quvur markazidan masofaga (radiusga) bog’liq – <b>silindrik bir o’lchovli</b> masala. Tekis devordan farqi: tashqariga chiqqan sari sirt yuzasi kattalashadi.',
  fields: [
    { id: 'D', label: 'Quvur diametri (tashqi)', type: 'select', opts: [['57', '57 mm'], ['108', '108 mm'], ['159', '159 mm'], ['219', '219 mm']], def: '108' },
    { id: 'Tw', label: 'Suv harorati', type: 'range', min: 40, max: 95, step: 1, unit: '°C', def: 70 },
    { id: 'ins', label: 'Izolyatsiya', type: 'select', opts: [['none', 'Yo’q'], ['paxta', 'Mineral paxta'], ['ppu', 'Penopoliuretan']], def: 'paxta' },
    { id: 'di', label: 'Izolyatsiya qalinligi', type: 'range', min: 0, max: 100, step: 5, unit: 'mm', def: 50 },
    { id: 'To', label: 'Tashqi havo', type: 'range', min: -25, max: 30, step: 1, unit: '°C', def: -5 },
    { id: 'wind', label: 'Shamol', type: 'select', opts: [['8', 'Tinch'], ['15', 'O’rtacha shamol'], ['30', 'Kuchli shamol']], def: '15' },
    { id: 'Lp', label: 'Quvur uzunligi', type: 'range', min: 10, max: 2000, step: 10, unit: 'm', def: 300 },
    { id: 'flow', label: 'Suv sarfi', type: 'range', min: 5, max: 500, step: 5, unit: 'l/min', def: 60 }
  ],
  run(v) {
    const D = +v.D / 1000, wall = D < 0.08 ? 0.0035 : D < 0.17 ? 0.0045 : 0.006, r2 = D / 2, r1 = r2 - wall;
    const ins = INSUL[v.ins], has = v.ins !== 'none' && v.di > 0, alpha = +v.wind;
    const layers = [{ d: wall, lam: 50, rho: 7850, c: 490, n: 6, name: 'Po’lat' }];
    if (has) layers.push({ d: v.di / 1000, lam: ins[1], rho: ins[2], c: ins[3], n: 30, name: ins[0] });
    const base = { geom: 1, r0: r1, layers, inner: { type: 1, g: v.Tw }, outer: { type: 3, alpha, ue: v.To } };
    const st = TL.steadyLayered(base), ql = TL.outerFlux(st.mesh, st.u, base.outer);
    const st0 = TL.steadyLayered({ geom: 1, r0: r1, layers: [layers[0]], inner: base.inner, outer: base.outer });
    const ql0 = TL.outerFlux(st0.mesh, st0.u, base.outer);
    const P = ql * v.Lp, mdot = v.flow / 60, dT = (v.Tw - v.To) * (1 - Math.exp(-ql / (v.Tw - v.To) * v.Lp / (mdot * 4186)));
    const Ts = st.u[st.u.length - 1];
    const sim = TL.solveLayered(Object.assign({}, base, { T0: v.To, T: 6 * 3600, K: 720, theta: 0.5, frames: 240 }));
    const R = sim.x[sim.x.length - 1];
    return {
      sim, x: sim.x, unitX: 'radius, mm', xScale: 1000, edges: [r2], range: [Math.min(v.To, 0), v.Tw],
      answers: [
        { label: 'Issiqlik yo’qotish', value: `${fmtNum(ql)} W/m`, note: `butun quvur: ${fmtNum(P / 1000)} kW, sutkada ${fmtNum(P * 24 / 1000)} kWh` },
        { label: 'Suv quvur oxirida', value: C(v.Tw - dT), note: `yo’lda ${dT.toFixed(1)} °C soviydi`, verdict: dT < 2 ? 'ok' : dT < 6 ? 'info' : 'bad', vtext: dT < 2 ? 'yaxshi izolyatsiya' : dT < 6 ? 'qoniqarli' : 'issiqlik ko’p yo’qolmoqda' },
        { label: 'Quvur sirtining harorati', value: C(Ts), verdict: Ts < 45 ? 'ok' : 'bad', vtext: Ts < 45 ? 'tegish xavfsiz' : 'kuyish xavfi – tegmang' },
        has ? { label: 'Izolyatsiya foydasi', value: `${Math.round((1 - ql / ql0) * 100)} % kam`, note: `izolyatsiyasiz ${fmtNum(ql0)} W/m bo’lardi`, verdict: 'ok', vtext: `sutkada ${fmtNum((ql0 - ql) * v.Lp * 24 / 1000)} kWh tejaladi` }
            : { label: 'Izolyatsiyasiz quvur', value: `${fmtNum(ql0)} W/m`, verdict: 'bad', vtext: '50 mm mineral paxta yo’qotishni bir necha marta kamaytiradi' }
      ],
      explain: `Issiq suv quvur devori va izolyatsiya orqali tashqi havoga issiqlik beradi, shamol bu jarayonni tezlashtiradi. Quvurda suv oqib turgani uchun yo’qotilgan issiqlik suvning sovishiga aylanadi: quvur qanchalik uzun va suv sarfi qanchalik kam bo’lsa, suv shuncha ko’p soviydi.`,
      model: (u, col) => Models3D.pipe(sim.x, u, col, rgb((v.Tw - Math.min(v.To, 0)) / (v.Tw - Math.min(v.To, 0))), [
        { p: [0, 0.0, 0.95], t: `Suv ${v.Tw} °C` }, { p: [0.75, 0.55, 0.3], t: `Havo ${v.To} °C` }]),
      probeLabel: 'Quvur tashqi sirti', probeIdx: -1, floor: -0.7
    };
  }
},
{
  id: 'tuxum', cat: 'Kundalik hayot', icon: 'egg', title: 'Tuxum qaynatish',
  q: 'Tuxumni necha daqiqa qaynatish kerak – yumshoq yoki qattiq pishishi uchun?',
  dim: '1D (shar)', why: 'Tuxum taxminan shar shaklida va qaynoq suvda har tomondan bir xil isiydi. Shuning uchun harorat faqat markazdan masofaga bog’liq – <b>sferik bir o’lchovli</b> masala. Eng sekin isiydigan joy – markaz (sarig’i).',
  fields: [
    { id: 'size', label: 'Tuxum o’lchami', type: 'select', opts: [['21', 'Kichik (S)'], ['22', 'O’rtacha (M)'], ['23.5', 'Katta (L)']], def: '22' },
    { id: 'T0', label: 'Tuxum qayerdan olindi', type: 'select', opts: [['4', 'Muzlatkichdan (4 °C)'], ['20', 'Xona haroratida (20 °C)']], def: '4' },
    { id: 'Tw', label: 'Suv qaynash harorati', type: 'select', opts: [['100', 'Tekislikda (100 °C)'], ['96', 'Tepalikda, 1200 m (96 °C)'], ['93', 'Tog’da, 2000 m (93 °C)']], def: '100' },
    { id: 'goal', label: 'Qanday pishsin', type: 'select', opts: [['55', 'Yumshoq – sarig’i suyuq'], ['65', 'O’rtacha – sarig’i quyuq'], ['75', 'Qattiq – sarig’i to’liq pishgan']], def: '65' }
  ],
  run(v) {
    const R = +v.size / 1000, lam = 0.54, rho = 1035, c = 3180, T0 = +v.T0, Tw = +v.Tw, goal = +v.goal;
    const base = { geom: 2, r0: 0, layers: [{ d: R, lam, rho, c, n: 60 }], inner: { type: 2, q: 0 }, outer: { type: 3, alpha: 1500, ue: Tw }, T0 };
    const sim = TL.solveLayered(Object.assign({}, base, { T: 25 * 60, K: 1500, theta: 0.5, frames: 300 }));
    const ctr = sim.frames.map(f => f[0]), tGoal = crossTime(sim.times, ctr, goal, true);
    const other = TL.solveLayered(Object.assign({}, base, { T0: T0 === 4 ? 20 : 4, T: 25 * 60, K: 1500, theta: 0.5, frames: 300 }));
    const tOther = crossTime(other.times, other.frames.map(f => f[0]), goal, true);
    const white = sim.frames.map(f => f[Math.round(f.length * 0.85)]), tWhite = crossTime(sim.times, white, 80, true);
    return {
      sim, x: sim.x, unitX: 'markazdan masofa, mm', xScale: 1000, edges: [], range: [T0, Tw], focus: tGoal,
      answers: [
        { label: 'Qaynatish vaqti', value: tGoal ? `${(tGoal / 60).toFixed(1)} daqiqa` : '25 daqiqadan ko’p', note: `sarig’i markazi ${goal} °C ga yetguncha (suvga solingandan boshlab)`, verdict: 'ok', vtext: 'tayyor bo’lganda darhol sovuq suvga soling' },
        { label: T0 === 4 ? 'Xona haroratidagi tuxum' : 'Muzlatkichdagi tuxum', value: tOther ? `${(tOther / 60).toFixed(1)} daqiqa` : '—', note: T0 === 4 ? 'xona haroratidagi tuxum tezroq pishadi' : 'muzlatkichdan olingan tuxumga ko’proq vaqt kerak', verdict: 'info' },
        { label: 'Oqi pishishi (qobiq ostida 80 °C)', value: tWhite ? `${(tWhite / 60).toFixed(1)} daqiqa` : '—', note: 'oq qismi sarig’idan ancha oldin pishadi' }
      ],
      explain: `Issiqlik qobiqdan markazga qarab sekin kiradi. Shuning uchun avval oqi, keyin sarig’i pishadi. Kattaroq tuxumga vaqt radius kvadratiga proporsional ko’payadi: 10 % katta tuxumga ≈ 20 % ko’proq vaqt kerak. Tog’da suv pastroq haroratda qaynagani uchun tuxum sekinroq pishadi. (Tuxum xossalari o’rtacha olingan, natija taxminiy.)`,
      model: (u, col) => Models3D.egg(sim.x, u, col, [{ p: [0, 1.25, 0], t: `Suv ${Tw} °C` }, { p: [0.0, 0.0, 0.25], t: 'sarig’i' }]), floor: -1.15,
      probeLabel: 'Tuxum markazi (sarig’i)', probeIdx: 0, timeAxis: 'min'
    };
  }
},
{
  id: 'cpu', cat: 'Elektronika', icon: 'chip', title: 'Protsessor radiatori',
  q: 'Tanlangan radiator protsessorni qizib ketishdan saqlay oladimi?',
  dim: '2D', why: 'Issiqlik kichik protsessordan radiator plastinkasi bo’ylab <b>ikki yo’nalishda</b> (x va y) tarqaladi – bu <b>ikki o’lchovli (2D)</b> masala. Plastinka yupqa, qalinlik bo’yicha harorat deyarli bir xil; yuzalaridan va qovurg’alaridan havoga issiqlik chiqadi.',
  fields: [
    { id: 'mat', label: 'Radiator materiali', type: 'select', opts: [['al', 'Alyuminiy'], ['cu', 'Mis']], def: 'al' },
    { id: 'L', label: 'Radiator o’lchami', type: 'range', min: 5, max: 14, step: 1, unit: 'sm', def: 9 },
    { id: 'th', label: 'Asos qalinligi', type: 'range', min: 2, max: 10, step: 1, unit: 'mm', def: 5 },
    { id: 'P', label: 'Protsessor quvvati', type: 'range', min: 10, max: 180, step: 5, unit: 'W', def: 65 },
    { id: 'cool', label: 'Sovitish', type: 'select', opts: [['10', 'Oddiy plastinka, ventilyatorsiz'], ['55', 'Qovurg’ali, ventilyatorsiz'], ['160', 'Qovurg’ali + ventilyator']], def: '160' },
    { id: 'Ta', label: 'Korpus ichidagi havo', type: 'range', min: 20, max: 45, step: 1, unit: '°C', def: 30 }
  ],
  run(v) {
    const M = v.mat === 'cu' ? [401, 8960, 385] : [237, 2700, 900], L = v.L / 100, th = v.th / 1000, chip = 0.03;
    const Qd = v.P / (chip * chip * th), rc = M[1] * M[2], half = chip / 2, n = 40;
    const P2 = { Lx: L, Ly: L, Nx: n, Ny: n, T: 600, K: 300, a2: M[0] / rc, lam: M[0], beta: +v.cool / (rc * th), us: v.Ta,
      f: chipSource(L, n, chip, v.P, th, rc), init: () => v.Ta,
      bc: { left: { type: 2, q: () => 0 }, right: { type: 2, q: () => 0 }, bottom: { type: 2, q: () => 0 }, top: { type: 2, q: () => 0 } },
      scheme: 'adi', theta: 0.5, frames: 120 };
    const r = TL.solve2D(P2), ci = (n / 2) * (n + 1) + n / 2;
    const ctr = r.frames.map(f => f[ci]), Tmax = ctr[ctr.length - 1];
    const t90 = crossTime(r.times, ctr, v.Ta + 0.9 * (Tmax - v.Ta), true);
    let edge = 0; for (let i = 0; i <= n; i++) edge += r.u[i]; edge /= (n + 1);
    const limit = 95;
    return {
      sim2: r, range: [v.Ta, Math.max(Tmax, v.Ta + 1)], L,
      answers: [
        { label: 'Protsessor harorati (10 daqiqadan keyin)', value: C(Tmax), num: Tmax, verdict: Tmax < 80 ? 'ok' : Tmax < limit ? 'info' : 'bad', vtext: Tmax < 80 ? 'xavfsiz' : Tmax < limit ? `chegaraga yaqin (${limit} °C)` : `qizib ketadi – ${limit} °C dan oshdi, protsessor tezligini pasaytiradi` },
        { label: 'Radiator chetidagi harorat', value: C(edge), note: 'chet va markaz farqi kichik bo’lsa, radiator yaxshi ishlaydi' },
        { label: 'Qizib bo’lish vaqti', value: t90 ? fmtTime(t90) : '10 daqiqadan ko’p', note: 'oxirgi haroratning 90 % iga yetguncha' }
      ],
      explain: `Protsessor ajratgan issiqlik avval radiator asosi bo’ylab tarqaladi, keyin yuzalar va qovurg’alar orqali havoga chiqadi. Mis alyuminiydan yaxshiroq o’tkazadi, shuning uchun harorat chetlarga tekisroq tarqaladi. Ventilyator havo oqimini kuchaytirib, issiqlik berishni bir necha marta oshiradi.`,
      model: (u, col, ext) => Models3D.plate(u, r.nx, r.ny, L, L, col, Object.assign({ thick: th, chip, fins: +v.cool > 20, labels: [{ p: [0, 0.32, 0], t: `${v.P} W` }] }, ext)), floor: +v.cool > 20 ? -0.62 : -0.15, plate: true,
      probeLabel: 'Protsessor markazi', probe2: ci
    };
  }
},
{
  id: 'payvand', cat: 'Metallurgiya', icon: 'weld', title: 'Payvand chokining sovishi',
  q: 'Payvandlangan joy qancha tezlikda soviydi – metall mo’rt bo’lib qolmaydimi va qachon ushlash mumkin?',
  dim: '2D', why: 'Yupqa plastinkada issiqlik payvand nuqtasidan <b>har tomonga</b> (x va y) tarqaladi, qalinlik bo’yicha harorat deyarli bir xil. Shuning uchun <b>ikki o’lchovli (2D)</b> masala.',
  fields: [
    { id: 'mat', label: 'Metall', type: 'select', opts: [['st', 'Uglerodli po’lat'], ['ss', 'Zanglamas po’lat']], def: 'st' },
    { id: 'th', label: 'Plastinka qalinligi', type: 'range', min: 2, max: 12, step: 1, unit: 'mm', def: 6 },
    { id: 'P', label: 'Payvandlash yoyi quvvati', type: 'range', min: 1, max: 8, step: 0.5, unit: 'kW', def: 3 },
    { id: 'ta', label: 'Yoy yonish vaqti (bir nuqtada)', type: 'range', min: 3, max: 30, step: 1, unit: 's', def: 15 },
    { id: 'pre', label: 'Oldindan qizdirish', type: 'select', opts: [['20', 'Yo’q (20 °C)'], ['150', '150 °C gacha'], ['250', '250 °C gacha']], def: '20' },
    { id: 'cool', label: 'Sovish usuli', type: 'select', opts: [['10', 'Havoda, tabiiy'], ['40', 'Shamolda / puflash'], ['400', 'Suv purkab sovitish']], def: '10' }
  ],
  run(v) {
    const M = { st: [50, 7850, 490, 1450], ss: [16, 8000, 500, 1400] }[v.mat];
    const L = 0.12, th = v.th / 1000, r0 = 0.006, rc = M[1] * M[2], Tp = +v.pre, n = 50, a = +v.cool;
    const Q0 = v.P * 1000 * 0.75 / (Math.PI * r0 * r0 * th); // yoy foydali ish koeffitsienti 0.75
    const mk = (T, K, frames, probe) => ({ Lx: L, Ly: L, Nx: n, Ny: n, T, K, a2: M[0] / rc, lam: M[0], beta: 2 * a / (rc * th), us: 20,
      f: (x, y, t) => (t <= v.ta ? Q0 / rc * Math.exp(-((x - L / 2) ** 2 + (y - L / 2) ** 2) / (r0 * r0)) : 0), init: () => Tp,
      bc: { left: { type: 3, alpha: a, ue: 20, q: () => 0 }, right: { type: 3, alpha: a, ue: 20, q: () => 0 }, bottom: { type: 3, alpha: a, ue: 20, q: () => 0 }, top: { type: 3, alpha: a, ue: 20, q: () => 0 } },
      scheme: 'adi', theta: 0.5, frames, probe });
    const ci = (n / 2) * (n + 1) + n / 2;
    const r = TL.solve2D(mk(900, 450, 150));
    const hi = TL.solve2D(Object.assign(mk(v.ta + 90, Math.round((v.ta + 90) / 0.2), 2, null), { Nx: 40, Ny: 40, probe: 20 * 41 + 20 })); // har 0.2 s da markaz harorati
    const ht = hi.probeVals.map((_, j) => j * hi.tau), hv = hi.probeVals;
    const peak = Math.max(...hv), ip = hv.indexOf(peak);
    const t8 = crossTime(ht.slice(ip), hv.slice(ip), 800, false), t5 = crossTime(ht.slice(ip), hv.slice(ip), 500, false);
    const t85 = t8 != null && t5 != null ? t5 - t8 : null;
    const ctr = r.frames.map(f => f[ci]), ipk = ctr.indexOf(Math.max(...ctr));
    const t200 = crossTime(r.times.slice(ipk), ctr.slice(ipk), 200, false), t50 = crossTime(r.times.slice(ipk), ctr.slice(ipk), 50, false);
    const melts = peak >= M[3];
    return {
      sim2: r, range: [20, M[3]], L, focus: v.ta + 4,
      answers: [
        { label: 'Payvand nuqtasi', value: melts ? `≥ ${M[3]} °C` : C(peak), verdict: melts ? 'ok' : 'bad', vtext: melts ? 'metall eriydi – chok hosil bo’ladi' : 'yetarli qizimadi – quvvat yoki vaqtni oshiring' },
        { label: 'Sovish vaqti t₈/₅ (800 → 500 °C)', value: t85 != null ? `${t85.toFixed(1)} s` : '—', note: 'payvandlash sifatining asosiy ko’rsatkichi',
          verdict: t85 == null ? 'info' : t85 < 5 ? 'bad' : t85 <= 25 ? 'ok' : 'info',
          vtext: t85 == null ? '800 °C ga yetmadi' : t85 < 5 ? 'juda tez – po’lat toblanib mo’rt bo’lishi mumkin; oldindan qizdiring' : t85 <= 25 ? 'me’yorda (taxminan 5–25 s)' : 'sekin – mustahkamlik biroz pasayishi mumkin' },
        { label: '200 °C gacha sovish', value: t200 ? fmtTime(t200) : '15 daqiqadan ko’p', note: 'eng qizigan paytdan boshlab; keyin ishlovni davom ettirish mumkin' },
        { label: 'Qo’l bilan ushlash (50 °C)', value: t50 ? fmtTime(t50) : '15 daqiqadan ko’p', verdict: 'info', vtext: 'undan oldin faqat qo’lqop bilan' }
      ],
      explain: `Yoy yonib turganda nuqta qiziydi, o’chgach issiqlik metall ichiga tarqaladi va sirtdan havoga chiqadi. Yupqa plastinka va kuchli sovitish tez soviydi. Po’lat juda tez sovisa toblanib mo’rt bo’ladi – shuning uchun detallar oldindan qizdiriladi: t₈/₅ qanday uzayishini tekshirib ko’ring. Soddalashtirilgan model: erish issiqligi va suyuq vannadagi oqim hisobga olinmagan, natija sifat jihatdan to’g’ri.`,
      model: (u, col, ext) => Models3D.plate(u, r.nx, r.ny, L, L, col, Object.assign({ thick: th, labels: [{ p: [0, 0.35, 0], t: 'payvand nuqtasi' }] }, ext)), floor: -0.15, plate: true,
      probeLabel: 'Payvand nuqtasi markazi', probe2: ci
    };
  }
}];

// ======================= YECHIM: TESKARI MASALA =======================
const ceilTo = (x, s) => Math.ceil(x / s - 1e-9) * s;
// Protsessor manbai: to'rdagi tugunlar soniga qarab normallanadi (umumiy quvvat aniq P ga teng)
function chipSource(L, n, chip, P, th, rc) {
  const h = L / n; let cnt = 0;
  for (let k = 0; k <= n; k++) for (let i = 0; i <= n; i++) if (Math.abs(i * h - L / 2) <= chip / 2 + 1e-12 && Math.abs(k * h - L / 2) <= chip / 2 + 1e-12) cnt++;
  const q = P / (cnt * h * h * th) / rc;
  return (x, y) => (Math.abs(x - L / 2) <= chip / 2 + 1e-12 && Math.abs(y - L / 2) <= chip / 2 + 1e-12 ? q : 0);
}
const SOLVE = {
  devor(v) {
    const m = WALL_MATS[v.mat], ai = 8.7, ao = 23;
    const Rw = 1 / ai + v.d / 100 / m[1] + 1 / ao;
    const Rins = v.ins !== 'none' && v.di > 0 ? v.di / 100 / INSUL[v.ins][1] : 0, Rcur = Rw + Rins;
    const dew = dewPoint(v.Ti, v.RH), Rcond = (v.Ti - v.To) / (ai * Math.max(0.5, v.Ti - dew - 3));
    const Rt = Math.max(2.5, Rcond);
    const season = R => (v.Ti - 3) / R * v.A * 150 * 24 / 1000;
    const items = [];
    if (Rcur >= Rt) items.push(`Devoringiz talabga javob beradi: issiqlik qarshiligi R = ${Rcur.toFixed(2)} m²·K/W (kerakli ≥ ${Rt.toFixed(2)}). Qo’shimcha izolyatsiya shart emas.`);
    else {
      const dp = ceilTo((Rt - Rw) * INSUL.penoplast[1] * 100, 1), dm = ceilTo((Rt - Rw) * INSUL.paxta[1] * 100, 1);
      const has = v.ins !== 'none' && v.di > 0;
      items.push(`<b>Tavsiya:</b> ${has ? 'izolyatsiyani jami' : 'devorga tashqi tomondan'} kamida <b>${dp} sm penoplast</b> yoki <b>${dm} sm mineral paxta</b> ${has ? `ga yetkazing (hozir ${v.di} sm ${INSUL[v.ins][0].toLowerCase()})` : 'qo’shing'}; savdodagi qalinlik bo’yicha – ${ceilTo(dp, 5)} sm / ${ceilTo(dm, 5)} sm.`);
      items.push(`Shunda issiqlik qarshiligi ${Rcur.toFixed(2)} dan ${Rt.toFixed(2)} m²·K/W ga oshadi, eng sovuq kundagi yo’qotish ${fmtNum((v.Ti - v.To) / Rcur * v.A / 1000)} kW dan ${fmtNum((v.Ti - v.To) / Rt * v.A / 1000)} kW ga kamayadi.`);
      items.push(`Isitish mavsumida ≈ <b>${fmtNum(season(Rcur) - season(Rt))} kWh</b> tejaladi (≈ ${fmtNum((season(Rcur) - season(Rt)) * v.price)} so’m).`);
    }
    items.push(`Devor terlamasligi (mog’or bo’lmasligi) uchun kamida R ≥ ${Rcond.toFixed(2)} m²·K/W kerak – ichki yuza shudring nuqtasidan (${C(dew)}) 3 °C yuqori bo’lishi uchun.`);
    const rows = [0, 5, 10, 15].map(cm => { const R = Rw + cm / 100 / INSUL.penoplast[1], q = (v.Ti - v.To) / R; return [`${cm} sm`, R.toFixed(2), fmtNum(q), C(v.Ti - q / ai), fmtNum(season(R))]; });
    return { items, table: { cap: 'Variantlar: penoplast qalinligiga qarab', head: ['Penoplast', 'R, m²·K/W', 'q, W/m²', 'Ichki yuza', 'Mavsum, kWh'], rows } };
  },
  quvur(v) {
    const D = +v.D / 1000, wall = D < 0.08 ? 0.0035 : D < 0.17 ? 0.0045 : 0.006, r2 = D / 2, r1 = r2 - wall, alpha = +v.wind, mdot = v.flow / 60;
    const calc = (key, mm) => {
      const layers = [{ d: wall, lam: 50, rho: 7850, c: 490, n: 4 }]; if (key !== 'none' && mm > 0) layers.push({ d: mm / 1000, lam: INSUL[key][1], rho: INSUL[key][2], c: INSUL[key][3], n: 16 });
      const p = { geom: 1, r0: r1, layers, inner: { type: 1, g: v.Tw }, outer: { type: 3, alpha, ue: v.To } };
      const st = TL.steadyLayered(p), ql = TL.outerFlux(st.mesh, st.u, p.outer);
      const dT = (v.Tw - v.To) * (1 - Math.exp(-ql / (v.Tw - v.To) * v.Lp / (mdot * 4186)));
      return { ql, dT, Ts: st.u[st.u.length - 1] };
    };
    const find = key => { for (let mm = 0; mm <= 200; mm += 5) { const r = calc(key, mm); if (r.dT <= 2 && r.Ts <= 45) return { mm, ...r }; } return null; };
    const fp = find('paxta'), fu = find('ppu'), items = [];
    const cur = calc(v.ins, v.di);
    if (cur.dT <= 2 && cur.Ts <= 45) items.push(`Hozirgi izolyatsiya yetarli: suv yo’lda ${cur.dT.toFixed(1)} °C soviydi, sirt ${C(cur.Ts)}.`);
    items.push(fp ? `<b>Tavsiya:</b> suv ${v.Lp} m yo’lda 2 °C dan ko’p sovimasligi va sirt kuydirmasligi uchun kamida <b>${fp.mm} mm mineral paxta</b> yoki <b>${fu ? fu.mm : '—'} mm penopoliuretan</b> kerak.`
                  : 'Berilgan sharoitda 200 mm izolyatsiya ham suv sovishini 2 °C gacha kamaytira olmaydi – quvur juda uzun yoki suv sarfi juda kam.');
    if (fp) items.push(`Bunda yo’qotish ${fmtNum(fp.ql)} W/m, sutkasiga ${fmtNum(fp.ql * v.Lp * 24 / 1000)} kWh bo’ladi.`);
    const key = v.ins === 'none' ? 'paxta' : v.ins;
    const rows = [0, 25, 50, 75, 100].map(mm => { const r = calc(key, mm); return [`${mm} mm`, fmtNum(r.ql), C(v.Tw - r.dT), C(r.Ts)]; });
    return { items, table: { cap: `Variantlar: ${INSUL[key][0].toLowerCase()} qalinligiga qarab`, head: ['Izolyatsiya', 'Yo’qotish, W/m', 'Suv oxirida', 'Sirt harorati'], rows } };
  },
  tuxum(v) {
    const R = +v.size / 1000, Tw = +v.Tw;
    const time = (T0, goal) => { const s = TL.solveLayered({ geom: 2, r0: 0, layers: [{ d: R, lam: 0.54, rho: 1035, c: 3180, n: 40 }], inner: { type: 2, q: 0 }, outer: { type: 3, alpha: 1500, ue: Tw }, T0, T: 1800, K: 900, theta: 0.5, frames: 900 });
      const t = crossTime(s.times, s.frames.map(f => f[0]), goal, true); return t ? (t / 60).toFixed(1) + ' daq' : '> 30 daq'; };
    const levels = [['Yumshoq', 55], ['O’rtacha', 65], ['Qattiq', 75]];
    const rows = levels.map(([n, g]) => [n, time(4, g), time(20, g)]);
    const g = +v.goal, t = time(+v.T0, g);
    return { items: [`<b>Tayyorlash:</b> suv ${Tw} °C da qaynagach tuxumni soling, <b>${t}</b>dan keyin oling va darhol sovuq suvga soling – pishish to’xtaydi.`,
      'Tuxum yorilmasligi uchun muzlatkichdan olingan tuxumni 5–10 daqiqa xona haroratida ushlab turing yoki qaynoq suvga ehtiyotkorlik bilan soling.'],
      table: { cap: `Pishirish jadvali (${{ '21': 'kichik', '22': 'o’rtacha', '23.5': 'katta' }[v.size]} tuxum, suv ${Tw} °C)`, head: ['Pishish darajasi', 'Muzlatkichdan', 'Xona haroratidan'], rows } };
  },
  cpu(v, res) {
    const Tmax = res.answers[0].num, P = v.P, Ta = v.Ta;
    const P80 = P * (80 - Ta) / (Tmax - Ta), P95 = P * (95 - Ta) / (Tmax - Ta);
    const run = (mat, cool) => { // tez baho: kichikroq to'r
      const M = mat === 'cu' ? [401, 8960, 385] : [237, 2700, 900], L = v.L / 100, th = v.th / 1000, chip = 0.03, rc = M[1] * M[2], n = 24;
      const r = TL.solve2D({ Lx: L, Ly: L, Nx: n, Ny: n, T: 600, K: 150, a2: M[0] / rc, lam: M[0], beta: cool / (rc * th), us: Ta,
        f: chipSource(L, n, chip, P, th, rc), init: () => Ta,
        bc: { left: { type: 2, q: () => 0 }, right: { type: 2, q: () => 0 }, bottom: { type: 2, q: () => 0 }, top: { type: 2, q: () => 0 } }, scheme: 'adi', theta: 0.5, frames: 2 });
      return r.u[(n / 2) * (n + 1) + n / 2];
    };
    const opts = [['10', 'Ventilyatorsiz plastinka'], ['55', 'Qovurg’ali'], ['160', 'Qovurg’ali + ventilyator']];
    const rows = opts.map(([a, n]) => { const al = run('al', +a), cu = run('cu', +a); return [n, C(al), C(cu)]; });
    const items = [`Hozirgi radiator bilan protsessor quvvati <b>${fmtNum(P80)} W</b> gacha bo’lsa harorat 80 °C dan oshmaydi (95 °C chegaragacha – ${fmtNum(P95)} W).`];
    if (Tmax > 80) items.push('<b>Tavsiya:</b> ventilyatorli qovurg’ali radiator tanlang, radiator o’lchamini kattalashtiring yoki misdan yasalganini oling – jadvalda variantlar.');
    else items.push('Tanlangan radiator yetarli – protsessor xavfsiz haroratda ishlaydi.');
    return { items, table: { cap: `Variantlar: ${v.P} W protsessor, ${v.L} sm radiator`, head: ['Sovitish', 'Alyuminiy', 'Mis'], rows } };
  },
  payvand(v) {
    const M = { st: [50, 7850, 490], ss: [16, 8000, 500] }[v.mat], L = 0.12, th = v.th / 1000, r0 = 0.006, rc = M[1] * M[2], a = +v.cool, n = 30;
    const Q0 = v.P * 1000 * 0.75 / (Math.PI * r0 * r0 * th);
    const t85 = Tp => {
      const r = TL.solve2D({ Lx: L, Ly: L, Nx: n, Ny: n, T: v.ta + 60, K: Math.round((v.ta + 60) / 0.2), a2: M[0] / rc, lam: M[0], beta: 2 * a / (rc * th), us: 20,
        f: (x, y, t) => (t <= v.ta ? Q0 / rc * Math.exp(-((x - L / 2) ** 2 + (y - L / 2) ** 2) / (r0 * r0)) : 0), init: () => Tp,
        bc: { left: { type: 3, alpha: a, ue: 20, q: () => 0 }, right: { type: 3, alpha: a, ue: 20, q: () => 0 }, bottom: { type: 3, alpha: a, ue: 20, q: () => 0 }, top: { type: 3, alpha: a, ue: 20, q: () => 0 } },
        scheme: 'adi', theta: 0.5, frames: 2, probe: (n / 2) * (n + 1) + n / 2 });
      const hv = r.probeVals, ht = hv.map((_, j) => j * r.tau), ip = hv.indexOf(Math.max(...hv));
      const a8 = crossTime(ht.slice(ip), hv.slice(ip), 800, false), a5 = crossTime(ht.slice(ip), hv.slice(ip), 500, false);
      return a8 != null && a5 != null ? a5 - a8 : null;
    };
    const pre = [20, 100, 150, 200, 250], vals = pre.map(t85);
    const ok = pre.find((p, i) => vals[i] != null && vals[i] >= 5 && vals[i] <= 25);
    const items = [ok == null ? 'Berilgan quvvat va qalinlikda t₈/₅ me’yorga (5–25 s) yetmadi – yoy quvvatini yoki yonish vaqtini o’zgartiring.'
      : ok === 20 ? 'Oldindan qizdirish shart emas – t₈/₅ me’yorda.' : `<b>Tavsiya:</b> detalni kamida <b>${ok} °C</b> gacha oldindan qizdiring – shunda t₈/₅ ${vals[pre.indexOf(ok)].toFixed(1)} s bo’ladi va po’lat mo’rt bo’lmaydi.`,
      'Suv bilan sovitish t₈/₅ ni keskin qisqartiradi – uglerodli po’latda darz ketish xavfi bor.'];
    const rows = pre.map((p, i) => [`${p} °C`, vals[i] != null ? vals[i].toFixed(1) + ' s' : '—', vals[i] == null ? '—' : vals[i] < 5 ? 'juda tez' : vals[i] <= 25 ? 'me’yorda' : 'sekin']);
    return { items, table: { cap: 'Oldindan qizdirishning ta’siri', head: ['Qizdirish', 't₈/₅', 'Baho'], rows } };
  }
};

// ======================= INTERFEYS =======================
let cur = null, res = null, view = null, J = 0, playing = false;
const ICONS = {
  house: '<path d="M3 11 12 4l9 7v9H3z"/><path d="M9 20v-6h6v6"/>',
  pipe: '<rect x="2" y="8" width="20" height="8" rx="2"/><path d="M6 8v8M18 8v8"/><path d="M9 4c0 1 1 1 1 2s-1 1-1 2M14 4c0 1 1 1 1 2s-1 1-1 2"/>',
  egg: '<path d="M12 3c4 0 7 6 7 11a7 7 0 0 1-14 0c0-5 3-11 7-11z"/><circle cx="12" cy="14" r="3"/>',
  chip: '<rect x="6" y="6" width="12" height="12" rx="1"/><rect x="9" y="9" width="6" height="6"/><path d="M9 2v4M15 2v4M9 18v4M15 18v4M2 9h4M2 15h4M18 9h4M18 15h4"/>',
  weld: '<path d="M4 20 14 10"/><path d="M14 10l3-3 2 2-3 3z"/><path d="M18 14l2 1M17 17l1 2M20 11l2-1"/><path d="M3 21h8"/>'
};
const icon = k => `<svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[k]}</svg>`;
function fieldHTML(f) {
  const id = 'am-' + f.id;
  if (f.type === 'select') return `<div class="f"><label for="${id}">${f.label}</label><select id="${id}">${f.opts.map(([k, t]) => `<option value="${k}"${k === f.def ? ' selected' : ''}>${t}</option>`).join('')}</select></div>`;
  if (f.type === 'check') return `<label class="chk"><input type="checkbox" id="${id}"${f.def ? ' checked' : ''}> ${f.label}</label>`;
  if (f.type === 'number') return `<div class="f"><label for="${id}">${f.label}, ${f.unit}</label><input type="number" id="${id}" value="${f.def}" step="any"></div>`;
  return `<div class="f rng"><label for="${id}">${f.label}: <output id="${id}-o">${f.def} ${f.unit}</output></label><input type="range" id="${id}" min="${f.min}" max="${f.max}" step="${f.step}" value="${f.def}"></div>`;
}
function read() {
  const v = {};
  for (const f of cur.fields) {
    const el = $('am-' + f.id);
    v[f.id] = f.type === 'check' ? el.checked : f.type === 'select' ? el.value : parseFloat(el.value);
    if (f.type === 'range') $('am-' + f.id + '-o').textContent = el.value + ' ' + f.unit;
  }
  return v;
}
let bands = false, relief = false, saved = {};
function colorOf(u) {
  const [lo, hi] = res.range; let t = (u - lo) / (hi - lo || 1);
  if (bands) t = (Math.floor(Math.max(0, Math.min(0.999, t)) * 10) + 0.5) / 10;  // 10 ta harorat zonasi
  const c = rgb(t); c.v = u; return c;
}
function frames() { return res.sim ? res.sim.frames : res.sim2.frames; }
function times() { return res.sim ? res.sim.times : res.sim2.times; }

function select(id) {
  cur = SCEN.find(s => s.id === id);
  document.querySelectorAll('.scen').forEach(b => b.setAttribute('aria-pressed', b.dataset.id === id));
  $('am-title').textContent = cur.title; $('am-q').textContent = cur.q;
  $('am-dim').innerHTML = `<span class="dimtag">${cur.dim}</span> ${cur.why}`;
  $('am-form').innerHTML = cur.fields.map(fieldHTML).join('');
  $('am-form').querySelectorAll('input,select').forEach(el => el.addEventListener(el.type === 'range' ? 'input' : 'change', schedule));
  run();
}
let deb; function schedule() { read(); clearTimeout(deb); deb = setTimeout(run, 150); }
function run() {
  const v = read(); res = cur.run(v); if (cur.fixup) cur.fixup(res, v);
  const ts = times(); J = ts.length - 1; $('am-time').max = J;
  if (res.focus != null) { let best = 0; ts.forEach((t, j) => { if (Math.abs(t - res.focus) < Math.abs(ts[best] - res.focus)) best = j; }); J = best; }
  $('am-time').value = J;
  $('am-ans').innerHTML = res.answers.map(a => `<div class="ans ${a.verdict || ''}"><span>${a.label}</span><b>${a.value}</b>${a.note ? `<small>${a.note}</small>` : ''}${a.vtext ? `<em>${a.verdict === 'ok' ? '✓ ' : a.verdict === 'bad' ? '⚠ ' : ''}${a.vtext}</em>` : ''}</div>`).join('');
  $('am-explain').innerHTML = res.explain;
  $('am-relief').hidden = !res.plate;
  drawAll();
  clearTimeout(run.sol); $('am-sol').innerHTML = '<p class="hint">Yechim hisoblanmoqda…</p>';
  run.sol = setTimeout(() => { res.sol = SOLVE[cur.id](v, res); renderSolution(); renderReport(v); renderCompare(); }, 30);
}
function tableHTML(t) {
  return `<div class="tablewrap"><table class="soltab"><caption>${t.cap}</caption><thead><tr>${t.head.map(h => `<th>${h}</th>`).join('')}</tr></thead><tbody>${t.rows.map(r => `<tr>${r.map((c, i) => `<td${i ? '' : ' class="l"'}>${c}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
}
function renderSolution() {
  const s = res.sol; $('am-sol').innerHTML = `<ul>${s.items.map(i => `<li>${i}</li>`).join('')}</ul>${s.table ? tableHTML(s.table) : ''}`;
}
const strip = h => h.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ');
function inputsText(v) {
  return cur.fields.filter(f => f.type !== 'number' || f.id !== 'price' || cur.id === 'devor').map(f => {
    const val = f.type === 'select' ? f.opts.find(o => o[0] === v[f.id])[1] : f.type === 'check' ? (v[f.id] ? 'ha' : 'yo’q') : `${v[f.id]} ${f.unit || ''}`.trim();
    return [f.label, val];
  });
}
function renderReport(v) {
  const d = new Date(), pad = n => String(n).padStart(2, '0');
  const lines = [
    `TERMOLAB HISOBOTI – ${cur.title.toUpperCase()}`,
    `Sana: ${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}   Soha: ${cur.cat}   Model: ${cur.dim}`,
    '', `Savol: ${cur.q}`, '', 'BERILGANLAR',
    ...inputsText(v).map(([a, b]) => `  • ${a}: ${b}`), '', 'NATIJALAR',
    ...res.answers.map(a => `  • ${a.label}: ${strip(a.value)}${a.note ? ' (' + strip(a.note) + ')' : ''}${a.vtext ? ' – ' + strip(a.vtext) : ''}`), '',
    'XULOSA VA TAVSIYA', ...res.sol.items.map(i => '  • ' + strip(i)), ''];
  if (res.sol.table) { const t = res.sol.table; lines.push(t.cap.toUpperCase(), '  ' + t.head.join(' | '), ...t.rows.map(r => '  ' + r.map(strip).join(' | ')), ''); }
  lines.push('Hisob: TermoLab (chekli ayirmalar / chekli hajmlar usuli). Material xossalari o’rtacha qiymatlar; natija ±10–20 % farq qilishi mumkin.');
  $('am-report').textContent = lines.join('\n');
}
function renderCompare() {
  const list = saved[cur.id] || [];
  if (!list.length) { $('am-cmp').innerHTML = '<p class="hint">Hali saqlangan variant yo’q. Shartlarni o’zgartirib, har bir variantni “Variantni saqlash” tugmasi bilan saqlang – natijalar shu yerda yonma-yon chiqadi.</p>'; return; }
  const labels = list[0].answers.map(a => a.label);
  $('am-cmp').innerHTML = `<div class="tablewrap"><table class="soltab"><thead><tr><th>Ko’rsatkich</th>${list.map((s, i) => `<th>Variant ${i + 1}<br><span class="hint">${s.name}</span></th>`).join('')}</tr></thead><tbody>${labels.map((l, k) => `<tr><td class="l">${l}</td>${list.map(s => `<td>${s.answers[k] ? strip(s.answers[k].value) : '—'}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
}
function saveVariant() {
  const v = read(), list = saved[cur.id] = saved[cur.id] || [];
  const changed = cur.fields.filter(f => f.type !== 'number' && f.type !== 'check').slice(0, 4).map(f => f.type === 'select' ? f.opts.find(o => o[0] === v[f.id])[1] : `${v[f.id]} ${f.unit}`).join(', ');
  list.push({ name: changed, answers: res.answers.map(a => ({ label: a.label, value: a.value })) });
  if (list.length > 4) list.shift();
  renderCompare();
}
function drawAll() {
  const fr = frames(), ts = times(), u = fr[J];
  const mdl = res.model(u, colorOf, relief && res.plate ? { relief: res.range } : {});
  view.set(mdl.faces, mdl.labels, { floor: res.floor ?? -0.7, fmt: C });
  const T = ts[ts.length - 1];
  $('am-tval').textContent = 't = ' + fmtTime(ts[J]);
  // rang shkalasi
  const [lo, hi] = res.range; $('am-cb').innerHTML = `<span>${C(lo)}</span><i></i><span>${C(hi)}</span>`;
  // grafiklar
  if (res.sim) {
    const xs = res.x.map(x => (x - res.x[0]) * res.xScale);
    plot($('am-prof'), xs, [{ ys: Array.from(fr[0]), c: '#9aa7b5', d: [5, 4] }, { ys: Array.from(u), c: '#c4401f', w: 2.6 }], res.range, v => (+v.toPrecision(3)) + '', res.unitX, res.edges.map(e => (e - res.x[0]) * res.xScale));
    $('am-profT').textContent = 'Harorat ' + (cur.id === 'devor' ? 'devor qalinligi bo’ylab (chap – xona, o’ng – ko’cha)' : cur.id === 'quvur' ? 'quvur devori va izolyatsiya bo’ylab (chap – suv, o’ng – havo)' : 'markazdan qobiqqacha (chap – sarig’i, o’ng – qobiq)');
  } else {
    const r = res.sim2, k = (r.ny - 1) / 2, xs = Array.from(r.X).map(x => x * 100);
    plot($('am-prof'), xs, [{ ys: xs.map((_, i) => fr[0][k * r.nx + i]), c: '#9aa7b5', d: [5, 4] }, { ys: xs.map((_, i) => u[k * r.nx + i]), c: '#c4401f', w: 2.6 }], res.range, v => (+v.toPrecision(3)) + '', 'markazdan o’tgan kesim, sm', []);
    $('am-profT').textContent = 'Harorat plastinka markazidan o’tgan chiziq bo’ylab';
  }
  const idx = res.sim ? (res.probeIdx < 0 ? fr[0].length - 1 : res.probeIdx) : res.probe2;
  const ys = fr.map(f => f[idx]);
  let lo2 = Math.min(...ys), hi2 = Math.max(...ys); if (hi2 - lo2 < 0.5) { lo2 -= 0.5; hi2 += 0.5; }
  plot($('am-probe'), ts, [{ ys, c: '#1d5ea8', w: 2.4 }], [lo2 - (hi2 - lo2) * 0.08, hi2 + (hi2 - lo2) * 0.08], s => axisTime(s, T), 'vaqt', [], ts[J]);
  $('am-probeT').textContent = res.probeLabel + ': ' + C(ys[J]);
}
function plot(cv, xs, series, range, xfmt, xtitle, vlines, marker) {
  const r = cv.getBoundingClientRect(), dpr = window.devicePixelRatio || 1; if (!r.width) return;
  cv.width = r.width * dpr; cv.height = r.height * dpr; const c = cv.getContext('2d'); c.setTransform(dpr, 0, 0, dpr, 0, 0);
  const w = r.width, h = r.height, ml = 52, mr = 10, mt = 22, mb = 30, pw = w - ml - mr, ph = h - mt - mb;
  const [lo, hi] = range, x0 = xs[0], x1 = xs[xs.length - 1];
  const X = v => ml + (v - x0) / (x1 - x0 || 1) * pw, Y = v => mt + ph - (v - lo) / (hi - lo || 1) * ph;
  c.font = '12px "IBM Plex Mono", monospace'; c.strokeStyle = '#d2d9e2'; c.fillStyle = '#56657a';
  const ticks = (a, b, n) => { const s0 = (b - a) / n, m = Math.pow(10, Math.floor(Math.log10(s0))), st = [1, 2, 2.5, 5, 10].map(k => k * m).find(k => k >= s0); const o = []; for (let v = Math.ceil(a / st) * st; v <= b + 1e-9; v += st) o.push(+v.toPrecision(10)); return o; };
  for (const v of ticks(lo, hi, 4)) { c.beginPath(); c.moveTo(ml, Y(v)); c.lineTo(w - mr, Y(v)); c.stroke(); c.textAlign = 'right'; c.fillText(n1(v), ml - 6, Y(v) + 4); }
  for (const v of ticks(x0, x1, 5)) { c.textAlign = 'center'; c.fillText(xfmt(v), X(v), h - mb + 16); }
  c.textAlign = 'left'; c.fillText('°C', 6, 12); c.textAlign = 'right'; c.fillText(xtitle, w - mr, h - 2);
  c.save(); c.beginPath(); c.rect(ml, mt, pw, ph); c.clip();
  for (const e of vlines || []) { c.strokeStyle = '#8a96a6'; c.setLineDash([2, 3]); c.beginPath(); c.moveTo(X(e), mt); c.lineTo(X(e), mt + ph); c.stroke(); }
  c.setLineDash([]);
  for (const s of series) { c.strokeStyle = s.c; c.lineWidth = s.w || 1.6; c.setLineDash(s.d || []); c.beginPath(); s.ys.forEach((v, i) => i ? c.lineTo(X(xs[i]), Y(v)) : c.moveTo(X(xs[i]), Y(v))); c.stroke(); }
  c.setLineDash([]);
  if (marker != null) { c.strokeStyle = '#15202c'; c.setLineDash([3, 3]); c.beginPath(); c.moveTo(X(marker), mt); c.lineTo(X(marker), mt + ph); c.stroke(); }
  c.restore();
}

function init() {
  $('am-cats').innerHTML = SCEN.map(s => `<button class="scen" type="button" data-id="${s.id}" aria-pressed="false"><span class="ico">${icon(s.icon)}</span><span><small>${s.cat}</small><b>${s.title}</b></span></button>`).join('');
  document.querySelectorAll('.scen').forEach(b => b.addEventListener('click', () => select(b.dataset.id)));
  view = new View3D($('am-3d'), $('am-tip'));
  document.querySelectorAll('[data-view]').forEach(b => b.addEventListener('click', () => view.view(b.dataset.view)));
  $('am-zin').addEventListener('click', () => view.zoomBy(1.15)); $('am-zout').addEventListener('click', () => view.zoomBy(1 / 1.15));
  const tog = (id, fn) => $(id).addEventListener('click', () => { const on = $(id).getAttribute('aria-pressed') !== 'true'; $(id).setAttribute('aria-pressed', on); fn(on); });
  tog('am-spin', on => view.setSpin(on));
  tog('am-bands', on => { bands = on; drawAll(); });
  tog('am-relief', on => { relief = on; drawAll(); });
  tog('am-big', on => { document.querySelector('.viz3d').classList.toggle('big', on); setTimeout(drawAll, 30); });
  $('am-save').addEventListener('click', saveVariant);
  $('am-clear').addEventListener('click', () => { saved[cur.id] = []; renderCompare(); });
  $('am-copy').addEventListener('click', () => {
    const txt = $('am-report').textContent, done = () => { $('am-copy').textContent = 'Nusxalandi ✓'; setTimeout(() => $('am-copy').textContent = 'Nusxalash', 1500); };
    if (navigator.clipboard) navigator.clipboard.writeText(txt).then(done, () => { selectReport(); });
    else selectReport();
  });
  function selectReport() { const r = document.createRange(); r.selectNodeContents($('am-report')); const s = window.getSelection(); s.removeAllRanges(); s.addRange(r); $('am-copy').textContent = 'Ctrl+C bosing'; }
  $('am-dl').addEventListener('click', () => {
    const blob = new Blob(['\ufeff' + $('am-report').textContent], { type: 'text/plain;charset=utf-8' });
    const name = `TermoLab-${cur.id}-hisobot.txt`;
    const plain = () => { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); a.remove(); };
    if (window.claude && window.claude.use) {
      window.claude.use('downloads').then(d => d ? d.save({ filename: name, data: blob }).catch(() => {}) : selectReport(), () => selectReport());
    } else plain();
  });
  $('am-time').addEventListener('input', e => { J = +e.target.value; drawAll(); });
  let last = 0;
  const tick = ts => {
    if (!playing) return;
    if (ts - last > 40) { last = ts; const n = frames().length; J = Math.min(n - 1, J + Math.max(1, Math.round(n / 150))); $('am-time').value = J; drawAll();
      if (J >= n - 1) { playing = false; $('am-play').textContent = '▶ Qaytadan'; } }
    if (playing) requestAnimationFrame(tick);
  };
  $('am-play').addEventListener('click', () => {
    if (playing) { playing = false; $('am-play').textContent = '▶ Davom etish'; return; }
    if (J >= frames().length - 1) J = 0; playing = true; $('am-play').textContent = '❚❚ To’xtatish'; requestAnimationFrame(tick);
  });
  let rt; window.addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => { if (res && !$('p-real').hidden) drawAll(); }, 100); });
  select('devor');
}
window.TermoAmaliy = { init, redraw: () => res && drawAll() };
})();
