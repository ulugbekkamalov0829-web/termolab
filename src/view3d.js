/*
 * TermoLab 3D: kutubxonasiz kichik 3D chizgich (Canvas 2D).
 * Yuzalar chuqurlik bo'yicha saralanadi (painter's algorithm), Lambert yoritish,
 * sichqoncha/barmoq bilan aylantirish, g'ildirak bilan yaqinlashtirish.
 */
(function (root) {
  'use strict';
  const VIEWS = { iso: [-0.6, 0.42], front: [0, 0.12], side: [-Math.PI / 2, 0.12], top: [0, 1.4] };
  function View3D(canvas, tip) {
    this.cv = canvas; this.tip = tip; this.faces = []; this.labels = []; this.opt = {};
    this.yaw = VIEWS.iso[0]; this.pitch = VIEWS.iso[1]; this.zoom = 1; this.spin = false; this.drawn = [];
    let drag = null;
    canvas.style.touchAction = 'none'; canvas.style.cursor = 'grab';
    canvas.addEventListener('pointerdown', e => { drag = { x: e.clientX, y: e.clientY, yaw: this.yaw, pitch: this.pitch }; canvas.setPointerCapture(e.pointerId); canvas.style.cursor = 'grabbing'; if (this.tip) this.tip.hidden = true; });
    canvas.addEventListener('pointermove', e => {
      if (drag) {
        this.yaw = drag.yaw + (e.clientX - drag.x) * 0.01;
        this.pitch = Math.max(-1.45, Math.min(1.45, drag.pitch + (e.clientY - drag.y) * 0.01));
        this.draw(); return;
      }
      this.hover(e);
    });
    canvas.addEventListener('pointerleave', () => { if (this.tip) this.tip.hidden = true; });
    const end = () => { drag = null; canvas.style.cursor = 'grab'; };
    canvas.addEventListener('pointerup', end); canvas.addEventListener('pointercancel', end);
    canvas.addEventListener('wheel', e => { e.preventDefault(); this.zoomBy(e.deltaY > 0 ? 0.92 : 1.08); }, { passive: false });
  }
  View3D.prototype.set = function (faces, labels, opt) { this.faces = faces; this.labels = labels || []; this.opt = opt || this.opt; this.draw(); };
  View3D.prototype.zoomBy = function (k) { this.zoom = Math.max(0.5, Math.min(3, this.zoom * k)); this.draw(); };
  View3D.prototype.view = function (name) {  // ko'rinishga silliq o'tish
    const [ty, tp] = VIEWS[name] || VIEWS.iso, y0 = this.yaw, p0 = this.pitch, t0 = performance.now();
    let dy = ty - y0; dy = Math.atan2(Math.sin(dy), Math.cos(dy));
    const step = now => { const k = Math.min(1, (now - t0) / 450), e = k * k * (3 - 2 * k);
      this.yaw = y0 + dy * e; this.pitch = p0 + (tp - p0) * e; this.draw(); if (k < 1) requestAnimationFrame(step); };
    requestAnimationFrame(step);
  };
  View3D.prototype.setSpin = function (on) {
    this.spin = on; let last = performance.now();
    const loop = now => { if (!this.spin) return; this.yaw += (now - last) * 0.0006; last = now; this.draw(); requestAnimationFrame(loop); };
    if (on) requestAnimationFrame(loop);
  };
  // Kursor ostidagi yuza haroratini ko'rsatish
  View3D.prototype.hover = function (e) {
    if (!this.tip) return;
    const r = this.cv.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
    for (let k = this.drawn.length - 1; k >= 0; k--) {
      const it = this.drawn[k]; if (it.v == null) continue;
      let inside = false; const P = it.s;
      for (let i = 0, j = P.length - 1; i < P.length; j = i++) {
        if ((P[i][1] > y) !== (P[j][1] > y) && x < (P[j][0] - P[i][0]) * (y - P[i][1]) / (P[j][1] - P[i][1]) + P[i][0]) inside = !inside;
      }
      if (inside) {
        this.tip.hidden = false; this.tip.style.left = x + 'px'; this.tip.style.top = y + 'px';
        this.tip.textContent = (this.opt.fmt ? this.opt.fmt(it.v) : it.v.toFixed(1)) + (it.tag ? ' · ' + it.tag : '');
        return;
      }
      if (it.opaque) break;
    }
    this.tip.hidden = true;
  };
  View3D.prototype.draw = function () {
    const cv = this.cv, r = cv.getBoundingClientRect(), dpr = window.devicePixelRatio || 1;
    if (!r.width) return;
    cv.width = Math.round(r.width * dpr); cv.height = Math.round(r.height * dpr);
    const c = cv.getContext('2d'); c.setTransform(dpr, 0, 0, dpr, 0, 0); c.clearRect(0, 0, r.width, r.height);
    const cy = Math.cos(this.yaw), sy = Math.sin(this.yaw), cp = Math.cos(this.pitch), sp = Math.sin(this.pitch);
    const rot = p => { const x = p[0] * cy - p[2] * sy, z0 = p[0] * sy + p[2] * cy; return [x, p[1] * cp - z0 * sp, p[1] * sp + z0 * cp]; };
    const f = Math.min(r.width, r.height) * 1.35 * this.zoom, D = 4.6;
    const proj = q => { const s = f / (D - q[2]); return [r.width / 2 + q[0] * s, r.height / 2 - q[1] * s, q[2]]; };
    // pol va soya
    const fy = this.opt.floor ?? -0.75;
    if (this.opt.floor !== false) {
      const ring = (rad) => { const pts = []; for (let k = 0; k < 48; k++) { const a = 2 * Math.PI * k / 48; pts.push(proj(rot([rad * Math.cos(a), fy, rad * Math.sin(a)]))); } return pts; };
      for (const [rad, al] of [[1.25, 0.05], [0.95, 0.06], [0.65, 0.07]]) {
        const pts = ring(rad); c.beginPath(); pts.forEach((p, i) => i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1])); c.closePath();
        c.fillStyle = `rgba(21,32,44,${al})`; c.fill();
      }
    }
    const L = [0.35, 0.75, 0.55], ln = Math.hypot(...L); L[0] /= ln; L[1] /= ln; L[2] /= ln;
    const list = [];
    for (const fc of this.faces) {
      const q = fc.p.map(rot);
      const a = [q[1][0] - q[0][0], q[1][1] - q[0][1], q[1][2] - q[0][2]], b = [q[2][0] - q[0][0], q[2][1] - q[0][1], q[2][2] - q[0][2]];
      let n = [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]; const nl = Math.hypot(...n) || 1; n = n.map(v => v / nl);
      if (n[2] < 0) n = n.map(v => -v); // kameraga qaragan tomon
      const lit = 0.58 + 0.42 * Math.max(0, n[0] * L[0] + n[1] * L[1] + n[2] * L[2]);
      let z = 0; for (const v of q) z += v[2]; z /= q.length;
      list.push({ s: q.map(proj), z: z - (fc.bias || 0), col: fc.c, lit: fc.flat ? 1 : lit, edge: fc.edge, v: fc.c && fc.c.v, tag: fc.tag });
    }
    list.sort((A, B) => A.z - B.z); // uzoqdagilar avval
    for (const it of list) {
      const [R, G, Bc] = it.col, k = it.lit;
      const fill = `rgb(${Math.round(R * k)},${Math.round(G * k)},${Math.round(Bc * k)})`;
      c.beginPath(); c.moveTo(it.s[0][0], it.s[0][1]);
      for (let i = 1; i < it.s.length; i++) c.lineTo(it.s[i][0], it.s[i][1]);
      c.closePath(); c.fillStyle = fill; c.fill();
      c.strokeStyle = it.edge || fill; c.lineWidth = it.edge ? 1.2 : 0.6; c.stroke();
    }
    this.drawn = list;
    c.font = '600 13px "IBM Plex Sans", system-ui, sans-serif'; c.textAlign = 'center';
    const placed = [];
    for (const lb of this.labels) {
      const s = proj(rot(lb.p)).slice(); const w = c.measureText(lb.t).width + 12;
      // yorliqlar bir-birini yopmasin: ustma-ust tushsa pastga suriladi
      for (let k = 0; k < 6 && placed.some(r => Math.abs(r[0] - s[0]) < (r[2] + w) / 2 + 4 && Math.abs(r[1] - s[1]) < 26); k++) s[1] += 28;
      s[0] = Math.max(w / 2 + 4, Math.min(r.width - w / 2 - 4, s[0]));  // yorliq kanvasdan chiqmasin
      placed.push([s[0], s[1], w]);
      c.fillStyle = 'rgba(255,255,255,0.9)'; c.strokeStyle = 'rgba(21,32,44,0.25)';
      c.beginPath(); c.roundRect(s[0] - w / 2, s[1] - 11, w, 22, 6); c.fill(); c.stroke();
      c.fillStyle = '#15202c'; c.fillText(lb.t, s[0], s[1] + 4);
    }
  };

  // ---------- Modellar ----------
  // Yordamchi: to'rtburchak yuza
  const Q = (a, b, cc, d, col, extra) => Object.assign({ p: [a, b, cc, d], c: col }, extra || {});

  // Tekis devor: qalinlik x bo'yicha, eni z, balandligi y. xs - tugunlar (m), us - harorat, colorOf(u)
  function wall(xs, us, colorOf, layerEdges, labels) {
    const T = xs[xs.length - 1], sx = 0.9 / Math.max(T, 0.05), W = 1.8, H = 1.2, faces = [];
    const X = v => (v * sx) - T * sx / 2;
    for (let i = 0; i < xs.length - 1; i++) {
      const col = colorOf((us[i] + us[i + 1]) / 2), x0 = X(xs[i]), x1 = X(xs[i + 1]);
      faces.push(Q([x0, -H / 2, W / 2], [x1, -H / 2, W / 2], [x1, H / 2, W / 2], [x0, H / 2, W / 2], col));   // old kesim
      faces.push(Q([x0, H / 2, W / 2], [x1, H / 2, W / 2], [x1, H / 2, -W / 2], [x0, H / 2, -W / 2], col));   // ust
    }
    faces.push(Q([X(0), -H / 2, W / 2], [X(0), H / 2, W / 2], [X(0), H / 2, -W / 2], [X(0), -H / 2, -W / 2], colorOf(us[0])));
    faces.push(Q([X(T), -H / 2, W / 2], [X(T), H / 2, W / 2], [X(T), H / 2, -W / 2], [X(T), -H / 2, -W / 2], colorOf(us[us.length - 1])));
    for (const e of layerEdges || []) {
      const x = X(e), d = 0.004;
      faces.push(Q([x - d, -H / 2, W / 2 + 0.001], [x + d, -H / 2, W / 2 + 0.001], [x + d, H / 2, W / 2 + 0.001], [x - d, H / 2, W / 2 + 0.001], [40, 50, 60], { flat: true, bias: -0.01 }));
    }
    return { faces, labels: (labels || []).map(l => ({ p: [X(l.x), l.y ?? 0.75, l.z ?? 0], t: l.t })) };
  }

  // Quvur: ichki radius r0, tugunlar rs, harorat us. 3/4 qismi ko'rsatiladi (kesilgan).
  function pipe(rs, us, colorOf, waterColor, labels) {
    const R = rs[rs.length - 1], s = 0.62 / R, Lz = 1.6, faces = [], a0 = 0, a1 = 1.5 * Math.PI, na = 36;
    const P = (r, a, z) => [r * s * Math.cos(a), r * s * Math.sin(a), z];
    for (let k = 0; k < na; k++) {
      const t0 = a0 + (a1 - a0) * k / na, t1 = a0 + (a1 - a0) * (k + 1) / na;
      faces.push(Q(P(R, t0, -Lz / 2), P(R, t1, -Lz / 2), P(R, t1, Lz / 2), P(R, t0, Lz / 2), colorOf(us[us.length - 1])));     // tashqi sirt
      faces.push(Q(P(rs[0], t0, -Lz / 2), P(rs[0], t1, -Lz / 2), P(rs[0], t1, Lz / 2), P(rs[0], t0, Lz / 2), waterColor));   // ichki (suv)
      for (let i = 0; i < rs.length - 1; i++) {   // old kesim (halqalar)
        const col = colorOf((us[i] + us[i + 1]) / 2);
        faces.push(Q(P(rs[i], t0, Lz / 2), P(rs[i + 1], t0, Lz / 2), P(rs[i + 1], t1, Lz / 2), P(rs[i], t1, Lz / 2), col, { bias: -0.002 }));
      }
    }
    for (const ang of [a0, a1]) for (let i = 0; i < rs.length - 1; i++) {   // uzunasiga kesim
      const col = colorOf((us[i] + us[i + 1]) / 2);
      faces.push(Q(P(rs[i], ang, -Lz / 2), P(rs[i + 1], ang, -Lz / 2), P(rs[i + 1], ang, Lz / 2), P(rs[i], ang, Lz / 2), col));
    }
    // suv yuzasi (old tomonda doira)
    for (let k = 0; k < 24; k++) {
      const t0 = 2 * Math.PI * k / 24, t1 = 2 * Math.PI * (k + 1) / 24;
      faces.push({ p: [P(0, 0, Lz / 2 - 0.02), P(rs[0], t0, Lz / 2 - 0.02), P(rs[0], t1, Lz / 2 - 0.02)], c: waterColor });
    }
    return { faces, labels: (labels || []).map(l => ({ p: l.p, t: l.t })) };
  }

  // Tuxum (shar modeli, tuxum shaklida ko'rsatiladi): yarmi kesilgan
  function egg(rs, us, colorOf, labels) {
    const R = rs[rs.length - 1], s = 0.85 / R, faces = [], ky = 1.28;
    const shape = (r, th, ph) => { // th: qutb burchagi, ph: azimut; tuxum shakli - pastga qarab biroz yo'g'onroq
      const taper = 1 - 0.12 * Math.cos(th);
      return [r * s * Math.sin(th) * Math.cos(ph) * taper, r * s * ky * Math.cos(th), r * s * Math.sin(th) * Math.sin(ph) * taper];
    };
    const nt = 22, np = 26;
    for (let a = 0; a < nt; a++) for (let b = 0; b < np; b++) {   // orqa yarim (ph: pi..2pi)
      const t0 = Math.PI * a / nt, t1 = Math.PI * (a + 1) / nt, p0 = Math.PI + Math.PI * b / np, p1 = Math.PI + Math.PI * (b + 1) / np;
      faces.push(Q(shape(R, t0, p0), shape(R, t0, p1), shape(R, t1, p1), shape(R, t1, p0), colorOf(us[us.length - 1])));
    }
    for (let i = 0; i < rs.length - 1; i++) {   // kesim yuzasi: halqalar (z = 0 tekislik)
      const col = colorOf((us[i] + us[i + 1]) / 2);
      for (let a = 0; a < 2 * nt; a++) {
        const t0 = 2 * Math.PI * a / (2 * nt), t1 = 2 * Math.PI * (a + 1) / (2 * nt);
        const pt = (r, t) => { const v = shape(r, Math.abs(t <= Math.PI ? t : 2 * Math.PI - t), t <= Math.PI ? 0 : Math.PI); return [v[0], v[1], 0.001]; };
        faces.push(Q(pt(rs[i], t0), pt(rs[i + 1], t0), pt(rs[i + 1], t1), pt(rs[i], t1), col, { bias: -0.003 }));
      }
    }
    return { faces, labels: labels || [] };
  }

  // Plastinka (2D maydon) - ustki yuzasi rangli, ixtiyoriy qovurg'alar va chip
  function plate(U, nx, ny, Lx, Ly, colorOf, opt) {
    opt = opt || {};
    const sc = 2.0 / Math.max(Lx, Ly), W = Lx * sc, Dp = Ly * sc, th = Math.max(0.04, (opt.thick || 0.004) * sc * 3), faces = [];
    const step = Math.max(1, Math.ceil(Math.max(nx, ny) / 36));
    const at = (i, k) => U[Math.min(ny - 1, k) * nx + Math.min(nx - 1, i)];
    const X = i => -W / 2 + W * i / (nx - 1), Z = k => Dp / 2 - Dp * k / (ny - 1);
    // relyef rejimi: ustki yuza balandligi = harorat
    const Hh = opt.relief ? (i, k) => 0.55 * Math.max(0, (at(i, k) - opt.relief[0]) / (opt.relief[1] - opt.relief[0] || 1)) : () => 0;
    for (let k = 0; k < ny - 1; k += step) for (let i = 0; i < nx - 1; i += step) {
      const i1 = Math.min(nx - 1, i + step), k1 = Math.min(ny - 1, k + step);
      const col = colorOf((at(i, k) + at(i1, k) + at(i1, k1) + at(i, k1)) / 4);
      faces.push(Q([X(i), Hh(i, k), Z(k)], [X(i1), Hh(i1, k), Z(k)], [X(i1), Hh(i1, k1), Z(k1)], [X(i), Hh(i, k1), Z(k1)], col));
    }
    for (let i = 0; i < nx - 1; i += step) { // old va orqa qirralar
      const i1 = Math.min(nx - 1, i + step);
      faces.push(Q([X(i), 0, Z(0)], [X(i1), 0, Z(0)], [X(i1), -th, Z(0)], [X(i), -th, Z(0)], colorOf(at(i, 0))));
      faces.push(Q([X(i), 0, Z(ny - 1)], [X(i1), 0, Z(ny - 1)], [X(i1), -th, Z(ny - 1)], [X(i), -th, Z(ny - 1)], colorOf(at(i, ny - 1))));
    }
    for (let k = 0; k < ny - 1; k += step) {
      const k1 = Math.min(ny - 1, k + step);
      faces.push(Q([X(0), 0, Z(k)], [X(0), 0, Z(k1)], [X(0), -th, Z(k1)], [X(0), -th, Z(k)], colorOf(at(0, k))));
      faces.push(Q([X(nx - 1), 0, Z(k)], [X(nx - 1), 0, Z(k1)], [X(nx - 1), -th, Z(k1)], [X(nx - 1), -th, Z(k)], colorOf(at(nx - 1, k))));
    }
    if (opt.fins) { // radiator qovurg'alari (pastga)
      const nf = 9, fh = 0.45;
      for (let f = 0; f < nf; f++) {
        const zf = -Dp / 2 + Dp * (f + 0.5) / nf, kf = Math.round((Dp / 2 - zf) / Dp * (ny - 1));
        for (let i = 0; i < nx - 1; i += step) {
          const i1 = Math.min(nx - 1, i + step), u = (at(i, kf) + at(i1, kf)) / 2, col = colorOf(u);
          faces.push(Q([X(i), -th, zf], [X(i1), -th, zf], [X(i1), -th - fh, zf], [X(i), -th - fh, zf], col.map(v => v * 0.92)));
        }
      }
    }
    if (opt.chip) { // protsessor (qora blok)
      const cw = opt.chip * sc, ch = 0.06, g = [55, 60, 70];
      const a = -cw / 2, b = cw / 2;
      faces.push(Q([a, ch, a], [b, ch, a], [b, ch, b], [a, ch, b], g));
      faces.push(Q([a, 0, b], [b, 0, b], [b, ch, b], [a, ch, b], g)); faces.push(Q([a, 0, a], [b, 0, a], [b, ch, a], [a, ch, a], g));
      faces.push(Q([a, 0, a], [a, 0, b], [a, ch, b], [a, ch, a], g)); faces.push(Q([b, 0, a], [b, 0, b], [b, ch, b], [b, ch, a], g));
    }
    if (opt.seam) { // payvand choki chizig'i
      faces.push(Q([-0.01, 0.003, Dp / 2], [0.01, 0.003, Dp / 2], [0.01, 0.003, -Dp / 2], [-0.01, 0.003, -Dp / 2], [90, 90, 95], { flat: true, bias: -0.01 }));
    }
    return { faces, labels: opt.labels || [] };
  }

  root.View3D = View3D;
  // Banka (chekli silindr): rs - radius tugunlari, zs - balandlik tugunlari (pastdan), U[k*nr+i] - harorat.
  // 3/4 qismi ko'rsatiladi: ikki kesim tekisligida (r, z) maydoni ko'rinadi.
  function jar(rs, zs, U, colorOf, labels, glass) {
    const nr = rs.length, nz = zs.length, R = rs[nr - 1], H = zs[nz - 1], s = 1.6 / Math.max(2 * R, H), faces = [];
    const a0 = 2.95, a1 = a0 + 1.5 * Math.PI, na = 36;   // kesilgan chorak kuzatuvchiga qaragan
    const P = (r, a, z) => [r * s * Math.cos(a), (z - H / 2) * s, r * s * Math.sin(a)];
    const u = (i, k) => U[k * nr + i], cell = (i, k) => (u(i, k) + u(i + 1, k) + u(i, k + 1) + u(i + 1, k + 1)) / 4;
    for (let m = 0; m < na; m++) {
      const t0 = a0 + (a1 - a0) * m / na, t1 = a0 + (a1 - a0) * (m + 1) / na;
      for (let k = 0; k < nz - 1; k++)       // yon sirt
        faces.push(Q(P(R, t0, zs[k]), P(R, t1, zs[k]), P(R, t1, zs[k + 1]), P(R, t0, zs[k + 1]), colorOf((u(nr - 1, k) + u(nr - 1, k + 1)) / 2)));
      for (let i = 0; i < nr - 1; i++) {     // ust va past
        faces.push(Q(P(rs[i], t0, H), P(rs[i + 1], t0, H), P(rs[i + 1], t1, H), P(rs[i], t1, H), colorOf((u(i, nz - 1) + u(i + 1, nz - 1)) / 2)));
        faces.push(Q(P(rs[i], t0, 0), P(rs[i + 1], t0, 0), P(rs[i + 1], t1, 0), P(rs[i], t1, 0), colorOf((u(i, 0) + u(i + 1, 0)) / 2)));
      }
    }
    for (const ang of [a0, a1]) for (let k = 0; k < nz - 1; k++) for (let i = 0; i < nr - 1; i++)   // kesimlar
      faces.push(Q(P(rs[i], ang, zs[k]), P(rs[i + 1], ang, zs[k]), P(rs[i + 1], ang, zs[k + 1]), P(rs[i], ang, zs[k + 1]), colorOf(cell(i, k)), { bias: -0.002 }));
    // qopqoq (metall) va bo'g'iz
    const lidR = R * 0.82, lz = H + 0.012 / s, lc = [168, 160, 120];
    for (let m = 0; m < na; m++) {
      const t0 = a0 + (a1 - a0) * m / na, t1 = a0 + (a1 - a0) * (m + 1) / na;
      faces.push({ p: [P(0, 0, lz), P(lidR, t0, lz), P(lidR, t1, lz)], c: lc, edge: null });
      faces.push(Q(P(lidR, t0, H), P(lidR, t1, H), P(lidR, t1, lz), P(lidR, t0, lz), lc));
    }
    return { faces, labels: labels || [] };
  }

  root.Models3D = { wall, pipe, egg, plate, jar };
})(typeof window !== 'undefined' ? window : globalThis);
