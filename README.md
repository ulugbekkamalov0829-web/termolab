# TermoLab — issiqlik oʻtkazuvchanlik masalalari uchun virtual laboratoriya

**Jonli versiya:** https://ulugbekkamalov0829-web.github.io/termolab/

**Muallif:** Kamalov Ulugʻbek, ATT, Axborot tizimlari va texnologiyalari, 3-kurs.
StudEXPO-2026 (UBS, Namangan), 1-seksiya: dasturlash va veb-ilovalar.

## Amaliy masalalar (asosiy bo’lim)

Real hayotdagi savolga javob beradigan sakkizta virtual laboratoriya ishi — kiritiladigan qiymatlar sohaning o’z tilida, natija 3D modelda:

| Soha | Savol | Model |
|---|---|---|
| Qurilish | Devordan qancha issiqlik yo’qoladi, izolyatsiya qancha tejaydi, devor namlanmaydimi? | ko’p qatlamli tekis devor, 1D |
| Energetika | Issiq suv quvuri qancha yo’qotadi, suv qancha soviydi? | silindrik qatlamlar, 1D |
| Kundalik hayot | Tuxumni necha daqiqa qaynatish kerak? | shar, 1D |
| Elektronika | Radiator protsessorni qizib ketishdan saqlaydimi? | plastinka + manba, 2D |
| Metallurgiya | Payvand choki qanday soviydi (t₈/₅), qachon ushlash mumkin? | plastinka, 2D |
| Qurilish | Qalin monolit beton qotayotganda darz ketmaydimi, muzlamaydimi? | ichki manbali (gidratatsiya) plita, 1D |
| Yong’in xavfsizligi | Temir-beton plita yong’inda necha daqiqa chidaydi (REI)? | nochiziqli 1D: λ(T), c(T), nurlanish; Yevrokod 2 bilan solishtirilgan |
| Oziq-ovqat | Bankadagi konserva yetarlicha sterilizatsiya bo’ldimi (F₀)? | chekli silindr, 2D (r, z) — Nyuman ko’paytmasi |

**Usullarni taqqoslash** bo’limi bitta masalani barcha usullar bilan yechadi (oshkor, oshkormas + haydash/Zeydel/SOR, Krank–Nikolson, ADI), aniq yechim bilan xato va hisoblash vaqtini o’lchaydi va eng maqbul usulni aniqlaydi: 1D da Krank–Nikolson + haydash, 2D da ADI.

**Yong’in modeli tekshiruvi** (EN 1992-1-2, 5.8-jadval): armatura 500 °C ga yetishi uchun kerakli o’q masofasi a = 30 / 40 / 55 mm (REI 90 / 120 / 180) — jadval bilan bir xil; izolyatsiya bo’yicha kerakli qalinlik h = 80 / 100 / 120 mm (REI 60 / 90 / 120) — jadval bilan bir xil.

Har bir masalada:
- **Javob** — rangli kartochkalar (me’yorda / xavfli / ma’lumot);
- **Yechim va tavsiya** — teskari masala: kerakli izolyatsiya qalinligi, radiator chidaydigan quvvat, pishirish vaqtlari jadvali, oldindan qizdirish ta’siri;
- **Matnli hisobot** — berilganlar, natijalar, tavsiya va xulosa; nusxalash yoki .txt yuklab olish;
- **Variantlarni taqqoslash** — 4 tagacha variant yonma-yon;
- **3D boshqaruv** — burchaklar (umumiy/old/yon/yuqori), yaqinlashtirish, avtomatik aylanish, harorat zonalari, relyef, kursor ostidagi aniq harorat, vaqt bo’yicha animatsiya.

Foydalanish bo’yicha batafsil: [QOLLANMA.md](QOLLANMA.md).

Ko’p qatlamli va silindr/shar geometriyali masalalar `src/layers.js` dagi chekli hajmlar usuli bilan yechiladi
(barqaror holatda qatlamli devor va quvur uchun aniq; tekshiruv: `tests/layers.test.js`). 3D ko’rinish `src/view3d.js` — tashqi kutubxonasiz, internetsiz ishlaydi.

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
tests/layers.test.js    ko’p qatlamli devor, quvur, shar: analitik yechimlar bilan
src/layers.js           ko’p qatlamli, silindr va shar geometriya (chekli hajmlar)
src/view3d.js, src/amaliy.js  3D ko’rinish va amaliy masalalar
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


## Taqdimot va video
- `TermoLab_taqdimot.pptx` — 18 slaydli taqdimot (sterjendan boshlanadi) (usullar, sayt, nega kerak, tekshiruv).
- `media/termolab_usullar.mp4` — 51 soniyalik video: 6 usul bir masalada, eng maqbuli aniqlanadi.
