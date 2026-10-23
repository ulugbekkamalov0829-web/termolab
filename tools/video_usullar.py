"""TermoLab: 30 soniyalik video — bitta masala 6 usulda, eng maqbul usul."""
import json, subprocess, sys, os, textwrap
import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib.colors import LinearSegmentedColormap
from matplotlib.patches import FancyBboxPatch, Rectangle

HERE = os.path.dirname(os.path.abspath(__file__))
D = json.load(open(os.path.join(HERE, 'data.json')))
OUT = sys.argv[1] if len(sys.argv) > 1 else os.path.join(HERE, 'termolab_usullar.mp4')
FPS, W, H = 30, 1920, 1080
BG, INK, MUTED, LINE = '#f8fafc', '#16212e', '#56657a', '#d3dbe4'
ACC, BLUE, GREEN, AMBER, RED = '#c4401f', '#1f5fa8', '#1f7a4a', '#d08a1e', '#b3261e'
STOPS = np.array([[34, 58, 140], [48, 128, 206], [120, 196, 214], [245, 226, 150], [240, 140, 60], [196, 38, 31]]) / 255
CMAP = LinearSegmentedColormap.from_list('t', STOPS)
plt.rcParams.update({'font.family': 'DejaVu Sans', 'text.color': INK, 'axes.edgecolor': LINE, 'axes.labelcolor': MUTED,
                     'xtick.color': MUTED, 'ytick.color': MUTED, 'mathtext.fontset': 'cm'})
SITE = 'ulugbekkamalov0829-web.github.io/termolab'

x = np.array(D['x']) * 100  # sm
M = D['methods']
L, T = 20.0, D['T']
a2 = 1.4e-5
exact = lambda t: 100 * np.exp(-a2 * np.pi ** 2 * t / 0.2 ** 2) * np.sin(np.pi * x / L)

def ease(t):
    t = min(1, max(0, t)); return t * t * (3 - 2 * t)

def new_fig():
    fig = plt.figure(figsize=(W / 100, H / 100), dpi=100, facecolor=BG)
    return fig

def grab(fig):
    fig.canvas.draw()
    return np.asarray(fig.canvas.buffer_rgba())[:, :, :3].tobytes()

ff = subprocess.Popen(['ffmpeg', '-y', '-loglevel', 'error', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{W}x{H}', '-r', str(FPS), '-i', '-',
                       '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '18', '-preset', 'medium', '-movflags', '+faststart', OUT], stdin=subprocess.PIPE)
def emit(fig, n=1):
    b = grab(fig)
    for _ in range(n): ff.stdin.write(b)

def footer(fig, alpha=1):
    fig.text(0.03, 0.03, 'TermoLab', fontsize=20, weight='bold', color=ACC, alpha=alpha)
    fig.text(0.97, 0.03, SITE, fontsize=18, color=BLUE, ha='right', alpha=alpha, family='DejaVu Sans Mono')

# ---------------- 1-sahna: masala (0–3.5 s) ----------------
N1 = int(6 * FPS)
for f in range(N1):
    fig = new_fig(); a = ease(f / (0.8 * FPS)); b = ease((f - 0.7 * FPS) / (0.8 * FPS)); c = ease((f - 1.5 * FPS) / (0.8 * FPS))
    fig.text(0.07, 0.80, 'BITTA MASALA — OLTI USUL', fontsize=26, weight='bold', color=ACC, alpha=a)
    fig.text(0.07, 0.68, 'Qaysi sonli usul eng maqbul?', fontsize=64, weight='bold', alpha=a)
    fig.text(0.07, 0.50, r'$\dfrac{\partial u}{\partial t} = a^2\,\dfrac{\partial^2 u}{\partial x^2}$', fontsize=58, alpha=b)
    fig.text(0.37, 0.535, 'Po’lat sterjen, uzunligi 20 sm, uchlari 0 °C, vaqt 10 daqiqa.', fontsize=26, alpha=b)
    fig.text(0.37, 0.475, 'Aniq yechim ma’lum — har bir usulning xatosini o’lchaymiz.', fontsize=26, color=MUTED, alpha=b)
    fig.text(0.07, 0.10, 'Savol: 10 daqiqadan keyingi haroratni qaysi usul eng yaxshi hisoblaydi?', fontsize=28, weight='bold', color=ACC, alpha=ease((f - 2.8 * FPS) / (0.8 * FPS)))
    ax = fig.add_axes([0.07, 0.24, 0.86, 0.09]); ax.axis('off')
    ax.imshow(exact(0)[None, :], aspect='auto', cmap=CMAP, vmin=0, vmax=100, alpha=c, extent=[0, L, 0, 1])
    ax.add_patch(FancyBboxPatch((0, 0), L, 1, boxstyle='round,pad=0,rounding_size=0.3', fill=False, ec=INK, lw=1.5, alpha=c))
    fig.text(0.07, 0.19, '0 °C', fontsize=22, alpha=c, color=BLUE); fig.text(0.5, 0.19, '100 °C', fontsize=22, ha='center', alpha=c, color=ACC); fig.text(0.93, 0.19, '0 °C', fontsize=22, ha='right', alpha=c, color=BLUE)
    footer(fig, a)
    emit(fig); plt.close(fig)

# ---------------- 1b-sahna: usullar nimasi bilan farq qiladi (8 s) ----------------
N1B = int(8 * FPS)
cards = [('OSHKOR sxema', RED, 'Yangi qatlam eskisidan bevosita hisoblanadi.', 'Juda tez, lekin katta qadamda “portlaydi”.'),
         ('OSHKORMAS sxema', AMBER, 'Yangi qatlam tenglamalar sistemasidan topiladi.', 'Hamisha turg’un, lekin aniqligi pastroq.'),
         ('KRANK–NIKOLSON', GREEN, 'Oshkor va oshkormasning o’rtachasi.', 'Turg’un va aniq — ikkalasining yaxshisi.')]
solv = [('ZEYDEL iteratsiyasi', 'sistemani taxmin qilib, yuzlab marta yaxshilaydi — sekin'),
        ('HAYDASH usuli', 'sistemani bir o’tishda to’g’ridan-to’g’ri yechadi — tez')]
for f in range(N1B):
    fig = new_fig(); a = ease(f / (0.6 * FPS))
    fig.text(0.05, 0.90, 'Olti usul nimasi bilan farq qiladi?', fontsize=44, weight='bold', alpha=a)
    fig.text(0.05, 0.835, 'Usul = sxema (vaqt qadami qanday olinadi) + sistema yechish usuli', fontsize=24, color=MUTED, alpha=a)
    for i, (h, col, t1, t2) in enumerate(cards):
        g = ease((f - (0.5 + 0.7 * i) * FPS) / (0.5 * FPS)); x0 = 0.05 + i * 0.31
        fig.patches.append(FancyBboxPatch((x0, 0.44), 0.29, 0.34, boxstyle='round,pad=0.005,rounding_size=0.01', transform=fig.transFigure, fc='white', ec=col, lw=3, alpha=g))
        fig.text(x0 + 0.015, 0.735, h, fontsize=26, weight='bold', color=col, alpha=g)
        fig.text(x0 + 0.015, 0.69, textwrap.fill(t1, 30), fontsize=20, alpha=g, va='top')
        fig.text(x0 + 0.015, 0.575, textwrap.fill(t2, 30), fontsize=20, color=col, weight='bold', alpha=g, va='top')
    fig.text(0.05, 0.37, 'Har qadamda hosil bo’ladigan sistemani yechish:', fontsize=26, weight='bold', alpha=ease((f - 3.0 * FPS) / (0.5 * FPS)))
    for i, (h, t) in enumerate(solv):
        g = ease((f - (3.6 + 0.8 * i) * FPS) / (0.5 * FPS)); x0 = 0.05 + i * 0.47
        fig.patches.append(FancyBboxPatch((x0, 0.17), 0.45, 0.15, boxstyle='round,pad=0.005,rounding_size=0.01', transform=fig.transFigure, fc='white', ec=BLUE, lw=3, alpha=g))
        fig.text(x0 + 0.015, 0.275, h, fontsize=24, weight='bold', color=BLUE, alpha=g)
        fig.text(x0 + 0.015, 0.20, t, fontsize=19, alpha=g)
    fig.text(0.05, 0.08, '3 sxema × 2 yechish usuli = 6 usul (oshkor sxemada sistema yo’q). Hammasini bitta masalada solishtiramiz.', fontsize=22, color=MUTED, alpha=ease((f - 5.5 * FPS) / (0.6 * FPS)))
    footer(fig, a); emit(fig); plt.close(fig)

# ---------------- 2-sahna: barcha usullar parallel (3.5–17 s) ----------------
N2 = int(15 * FPS); ANIM = int(11.5 * FPS)
fig = new_fig()
ttl = fig.text(0.04, 0.925, '', fontsize=22, weight='bold')
clock = fig.text(0.96, 0.925, '', fontsize=26, ha='right', family='DejaVu Sans Mono', color=MUTED)
panels = []
for k, m in enumerate(M):
    r, cc = divmod(k, 3)
    x0, y0, pw, ph = 0.04 + cc * 0.32, 0.535 - r * 0.40, 0.29, 0.215
    ax = fig.add_axes([x0, y0, pw, ph], facecolor='white')
    ax.set_xlim(0, L); ax.set_ylim(-20, 115); ax.set_yticks([0, 50, 100]); ax.set_xticks([0, 10, 20]); ax.tick_params(labelsize=14)
    for s in ax.spines.values(): s.set_color(LINE)
    ax.grid(color='#eef1f5')
    ex_l, = ax.plot(x, exact(0), '--', color=MUTED, lw=2)
    num_l, = ax.plot(x, m['frames'][0], color=BLUE, lw=3.2)
    fig.text(x0, y0 + ph + 0.062, m['name'], fontsize=22, weight='bold')
    fig.text(x0, y0 + ph + 0.032, m['sub'] + f'     Fo = {m["Fo"]:.2f}', fontsize=17, color=MUTED)
    bar = fig.add_axes([x0, y0 - 0.068, pw, 0.016]); bar.axis('off')
    im = bar.imshow(np.array(m['frames'][0])[None, :], aspect='auto', cmap=CMAP, vmin=0, vmax=100, extent=[0, L, 0, 1])
    badge = fig.text(x0 + pw - 0.005, y0 + ph - 0.03, '', fontsize=20, ha='right', va='top', weight='bold',
                     bbox=dict(boxstyle='round,pad=0.4', fc='white', ec=LINE))
    panels.append(dict(m=m, ax=ax, ex=ex_l, num=num_l, im=im, badge=badge))
footer(fig)
for f in range(N2):
    ttl.set_text('Ko’k chiziq — usul natijasi, punktir — aniq javob. Ustma-ust tushsa, usul to’g’ri.' if f < 7 * FPS else ('Diqqat: oshkor sxema katta qadamda “portlaydi”, kichik qadamda aniq — lekin 4800 qadam kerak!' if f < ANIM else 'Endi har bir usulning xatosi va tezligini o’lchaymiz.'))
    p = min(1, f / ANIM); t = p * T; clock.set_text(f't = {t / 60:4.1f} daqiqa')
    for P in panels:
        m = P['m']; fr = m['frames']; j = min(len(fr) - 1, int(round(p * (len(fr) - 1))))
        u = np.array(fr[j]); P['ex'].set_ydata(exact(m['times'][j]))
        blown = m['blow'] > 0 and np.max(np.abs(u)) > 130
        P['num'].set_ydata(np.clip(u, -200, 300)); P['num'].set_color(RED if blown else BLUE)
        P['im'].set_data(np.clip(u, -50, 150)[None, :])
        if blown:
            P['badge'].set_text('PORTLADI — turg’un emas'); P['badge'].set_color(RED)
        elif f >= ANIM + int(0.4 * FPS):
            ok = m['err'] is not None and m['err'] <= 0.05
            P['badge'].set_text(f'xato {m["err"]:.3f} °C  ·  {m["ms"]:.1f} ms'); P['badge'].set_color(GREEN if ok else AMBER)
    emit(fig)
plt.close(fig)

# ---------------- 3-sahna: taqqoslash (17–25 s) ----------------
N3 = int(11 * FPS)
rows = [(m['name'] + ' ' + m['sub'].replace('+ ', '+ ').replace('katta qadam ', '').replace('kichik qadam ', ''), m) for m in M]
order = sorted(range(len(M)), key=lambda k: (M[k]['err'] is None, -M[k]['ms']))
best = min((k for k in range(len(M)) if M[k]['err'] is not None and M[k]['err'] <= 0.05), key=lambda k: M[k]['ms'])
d2 = D['d2']; best2 = min((k for k in range(len(d2)) if d2[k]['err'] is not None and d2[k]['err'] <= 0.05), key=lambda k: d2[k]['ms'])
for f in range(N3):
    fig = new_fig(); a = ease(f / (0.6 * FPS))
    fig.text(0.04, 0.92, 'Natija: talab — xato ≤ 0.05 °C. Shuni eng tez bajargan usul — eng maqbul.', fontsize=28, weight='bold', alpha=a)
    ax = fig.add_axes([0.30, 0.16, 0.36, 0.68]); ax.set_facecolor(BG)
    for s in ['top', 'right', 'left']: ax.spines[s].set_visible(False)
    ax.set_xscale('log'); ax.set_xlim(0.1, 300); ax.set_ylim(-0.6, len(M) - 0.4); ax.set_yticks([])
    ax.set_xlabel('hisoblash vaqti, ms (logarifmik shkala)', fontsize=16); ax.tick_params(labelsize=14)
    fig.text(0.04, 0.86, '1D — sterjen (to’r 100 oraliq)', fontsize=22, color=MUTED, alpha=a)
    for row, k in enumerate(order):
        m = M[k]; g = ease((f - 0.4 * FPS - row * 0.25 * FPS) / (0.6 * FPS))
        blown = m['err'] is None; ok = not blown and m['err'] <= 0.05
        col = RED if blown else (GREEN if k == best else ('#6aa585' if ok else AMBER))
        width = 10 ** (np.log10(0.1) + g * (np.log10(max(m['ms'], 0.12)) - np.log10(0.1)))
        ax.barh(row, width - 0.1, left=0.1, height=0.62, color=col, alpha=g)
        lab = f'{m["name"]} {m["sub"]}'.replace('Oshkor — KATTA qadam τ = 10 s (60 qadam)', 'Oshkor, katta qadam (τ = 10 s)').replace('Oshkor — KICHIK qadam τ = 0.125 s (4800 qadam)', 'Oshkor, kichik qadam (τ = 0.125 s)')
        fig.text(0.295, 0.16 + 0.68 * (row + 0.6) / len(M) - 0.012, lab, fontsize=17, ha='right', weight='bold' if k == best else 'normal', alpha=g)
        txt = 'portladi' if blown else f'{m["ms"]:.1f} ms · xato {m["err"]:.3f} °C'
        ax.text(width * 1.15, row, txt, va='center', fontsize=15, color=col, alpha=g, weight='bold' if k == best else 'normal')
    lg = ease((f - 1.0 * FPS) / (0.6 * FPS))
    for i, (c, t) in enumerate([(RED, 'turg’un emas'), (AMBER, 'aniqlik yetmaydi'), ('#6aa585', 'aniq, lekin sekin'), (GREEN, 'eng maqbul')]):
        fig.patches.append(Rectangle((0.04 + i * 0.16, 0.055), 0.014, 0.022, transform=fig.transFigure, color=c, alpha=lg))
        fig.text(0.058 + i * 0.16, 0.058, t, fontsize=17, alpha=lg)
    # 2D
    g2 = ease((f - 3.2 * FPS) / (0.8 * FPS))
    fig.text(0.72, 0.86, '2D — plastinka (to’r 40×40)', fontsize=22, color=MUTED, alpha=g2)
    if g2 <= 0: emit(fig); plt.close(fig); continue
    ax2 = fig.add_axes([0.72, 0.16, 0.24, 0.62]); ax2.set_facecolor(BG); ax2.patch.set_alpha(0)
    for s in ['top', 'right', 'left']: ax2.spines[s].set_visible(False)
    ax2.set_xlim(0, 300); ax2.set_ylim(-0.6, len(d2) - 0.4); ax2.set_yticks([]); ax2.tick_params(labelsize=13); ax2.set_xlabel('ms', fontsize=14)
    for s in ax2.spines.values(): s.set_alpha(g2)
    ax2.tick_params(colors=MUTED); [t.set_alpha(g2) for t in ax2.get_xticklabels()]
    for row, k in enumerate(sorted(range(len(d2)), key=lambda k: -d2[k]['ms'])):
        r = d2[k]; blown = r['err'] is None; ok = not blown and r['err'] <= 0.05
        col = RED if blown else (GREEN if k == best2 else ('#6aa585' if ok else AMBER))
        ax2.barh(row, r['ms'], height=0.62, color=col, alpha=g2)
        ax2.text(4, row + 0.47, r['name'] + ('  — portladi' if blown else ''), fontsize=14, alpha=g2, weight='bold' if k == best2 else 'normal', color=INK)
        ax2.text(r['ms'] + 4, row - 0.05, f'{r["ms"]:.0f}', fontsize=13, alpha=g2, color=col, va='center')
    emit(fig); plt.close(fig)

# ---------------- 4-sahna: xulosa (25–30 s) ----------------
N4 = int(11 * FPS)
for f in range(N4):
    fig = new_fig(); a = ease(f / (0.6 * FPS))
    fig.text(0.07, 0.83, 'ENG MAQBUL USUL', fontsize=26, weight='bold', color=GREEN, alpha=a)
    fig.text(0.07, 0.70, '1D:  Krank–Nikolson + haydash usuli', fontsize=46, weight='bold', alpha=a)
    fig.text(0.07, 0.60, '2D:  O’zgaruvchan yo’nalishlar (ADI) + haydash', fontsize=46, weight='bold', alpha=ease((f - 0.4 * FPS) / (0.6 * FPS)))
    r_acc = M[3]['err'] / M[5]['err']; r1 = M[4]['ms'] / M[5]['ms']; r2 = d2[4]['ms'] / d2[5]['ms']
    items = ['Istalgan vaqt qadamida turg’un — oshkor sxemadek “portlamaydi”',
             f'2-tartibli aniqlik — oshkormas sxemadan {r_acc:.0f} marta aniqroq',
             f'Iteratsiyasiz, O(N) amal — 1D da Zeydeldan {r1:.0f} marta, 2D da SOR dan {r2:.0f} marta tez']
    for i, t in enumerate(items):
        g = ease((f - (1.2 + 1.3 * i) * FPS) / (0.5 * FPS))
        fig.text(0.07, 0.46 - i * 0.075, '✓', fontsize=32, color=GREEN, alpha=g, weight='bold')
        fig.text(0.11, 0.46 - i * 0.075, t, fontsize=27, alpha=g)
    g = ease((f - 6.0 * FPS) / (0.6 * FPS))
    fig.text(0.07, 0.13, 'O’zingiz sinab ko’ring:', fontsize=26, color=MUTED, alpha=g)
    fig.text(0.30, 0.13, SITE, fontsize=30, color=BLUE, weight='bold', alpha=g, family='DejaVu Sans Mono')
    fig.text(0.07, 0.08, '“Usullarni taqqoslash” bo’limi', fontsize=22, color=MUTED, alpha=g)
    fig.text(0.97, 0.03, 'TermoLab · StudEXPO-2026', fontsize=18, color=ACC, ha='right', alpha=a)
    emit(fig); plt.close(fig)

ff.stdin.close(); ff.wait()
print('ok', OUT, (N1 + N1B + N2 + N3 + N4) / FPS, 's')
