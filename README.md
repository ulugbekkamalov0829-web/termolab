# TermoLab — issiqlik oʻtkazuvchanlik masalalari uchun virtual laboratoriya

**Jonli versiya:** https://ulugbekkamalov0829-web.github.io/termolab/

**Muallif:** Kamalov Ulugʻbek, ATT, Axborot tizimlari va texnologiyalari, 3-kurs.
StudEXPO-2026 (UBS, Namangan), 1-seksiya: dasturlash va veb-ilovalar.

## Masala

Jismdagi harorat taqsimotini topish:

```
ρc ∂u/∂t = ∇·(λ∇u) + Q(x,t)
∂u/∂t   = a²Δu + f(x,t) − β(u − u_s),     a² = λ/(ρc),  f = Q/(ρc)
```

- **Geometriya:** 1D (sterjen, devor) va 2D (toʻgʻri toʻrtburchak plastinka).
- **Chegaraviy shartlar** (har bir tomonda alohida):
  I tur `u = g`, II tur `λ ∂u/∂n = q`, III tur `λ ∂u/∂n + α u = α u_e + q`.
- **Sirtdan almashish** (sterjen yon sirti yoki plastinka yuzlari), **ichki manba** (bir tekis yoki Gauss), real **materiallar** bazasi.

## Sonli usullar

| Usul | Turgʻunlik | Aniqlik |
|---|---|---|
| Oshkor sxema (θ = 0) | Fo = a²τ/h² ≤ ½ | O(τ + h²) |
| Oshkormas sxema (θ = 1) | absolyut | O(τ + h²) |
| Krank–Nikolson (θ = ½), Rannacher boshlanishi bilan | absolyut | O(τ² + h²) |
| ADI, Pisman–Rekford (2D) | absolyut | O(τ² + h²) |

- Oqimli chegaralarda soxta tugun (ghost point) — ikkinchi tartib saqlanadi.
- Chiziqli sistemalar: haydash usuli (Thomas), Zeydel, SOR (ω_opt).
- ADI da chegaraviy oqim hadlari yoʻnalish boʻyicha ajratilgan: teng boʻlinganda III tur shartlarda aniqlik birinchi tartibga tushishi aniqlandi va tuzatildi.

## Tekshiruv

Ishlab chiqarilgan yechimlar usuli (aniq yechim → manba va chegaraviy qiymatlar → solishtirish), maksimum normadagi xato:

| Sxema | Kuzatilgan tartib p |
|---|---|
| 1D oshkor (τ ~ h²) | 2.00 |
| 1D oshkormas | 0.93 → 1 |
| 1D Krank–Nikolson (I, II, III tur) | 2.00 |
| 2D ADI (I, II, III tur aralash) | 2.00 |
| 2D Krank–Nikolson, SOR | 2.00 |
| 2D oshkormas, SOR | 1.15 → 1 |

JavaScript (`src/core.js`) va mustaqil yozilgan Python (`python/termolab.py`) versiyalari bir xil xatolarni beradi
(masalan, 2D ADI, N = 32: ikkalasida 3.736·10⁻⁴). Darslikdagi 3-masala (L = 8, T = 3, N = 50, K = 200) natijasi
va Zeydel iteratsiyalari soni (992) toʻliq takrorlanadi. Toʻliq natijalar: `tests/natijalar.txt`.

Barqaror holatdagi analitik yechimlar bilan solishtirish (`tests/fizik_natijalar.txt`):

| Masala | TermoLab | Analitik |
|---|---|---|
| Beton devor 30 sm, issiqlik oqimi | 78.38 W/m² | 78.38 W/m² |
| Nixrom qizdirgich sim, maks. harorat | 352.88 °C | 352.88 °C |
| Mis sterjen (qovurgʻa) uchidagi harorat | 51.411 °C | 51.411 °C |

## Tuzilma

```
index.html              tayyor veb-ilova (bitta fayl, oʻrnatish shart emas)
src/core.js             hisoblash yadrosi: 1D/2D, θ-sxema, ADI, haydash, Zeydel/SOR
src/app.js              interfeys: holatlar, vizualizatsiya, turgʻunlik va yaqinlashish boʻlimlari
src/style.css, body.html
formulas/               formulalar (SVG, Computer Modern) — tools/formulalar.py yaratadi
python/termolab.py      mustaqil Python/NumPy versiyasi
python/tekshiruv.py     yaqinlashish tartibi va darslik masalasi
python/kitob_3_masala.py darslikdagi algoritmning aynan takrori (992 iteratsiya)
tests/convergence.test.js  JS yadro testlari (yaqinlashish tartibi)
tests/fizik_tekshiruv.test.js  analitik yechimlar bilan solishtirish
TAQDIMOT_NUTQI.md       taqdimot rejasi va hakamlar savollari
tools/build.py          index.html ni yigʻish
```

## Ishga tushirish

```bash
node tests/convergence.test.js     # JS yadro testlari
python python/tekshiruv.py          # Python tekshiruv
python tools/formulalar.py          # formulalarni qayta yaratish (matplotlib)
python tools/build.py               # index.html ni yigʻish
```
