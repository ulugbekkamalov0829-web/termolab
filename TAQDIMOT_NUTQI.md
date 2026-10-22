# TermoLab — taqdimot nutqi va hakamlar savollari

## Nutq rejasi (7–8 daqiqa)

| Slayd | Asosiy fikr | Vaqt |
|---|---|---|
| 1. TermoLab | Loyiha nomi va maqsadi | 0:20 |
| 2. Dolzarblik | Qurilish, energetika, metallurgiya, elektronika; analitik yechim yetmaydi | 0:40 |
| 3. Yondashuvlar | Tajriba, analitik, ANSYS/COMSOL, darslik dasturlari; TermoLab oʻrni | 0:40 |
| 4–5. Model va shartlar | Energiya tenglamasi; I, II, III tur chegaraviy shartlar | 1:00 |
| 6–7. Diskretlash va θ-sxema | Toʻr, soxta tugun, uch sxema, Rannacher | 1:00 |
| 8. Turgʻunlik | Fon Neyman, G(ξ), Fo ≤ ½ | 0:40 |
| 9–10. ADI va sistemalar | Pisman–Rekford; tadqiqot natijasi; haydash, Zeydel, SOR | 0:50 |
| 11. Ilova | Tuzilma: amaliy masalalar + ilmiy laboratoriya | 0:30 |
| 12. Amaliy masalalar (jonli namoyish) | Javob → tavsiya → 3D → taqqoslash → hisobot | 1:30 |
| 13–15. Tekshiruv | Yaqinlashish tartibi, analitik yechimlar, darslik (992) | 1:00 |
| 16. Xulosa | Natijalar va keyingi bosqich | 0:30 |

**Jonli namoyish (asosiy, 2–3 daqiqa) – “Amaliy masalalar” bo’limi:**
1. *Uy devori qishda*: 38 sm g’isht → 42.8 W/m², mavsumda 5 236 kWh. “Yechim va tavsiya” blokini ko’rsating: “kamida 7 sm penoplast” — bu **teskari masala**, dastur o’zi kerakli qalinlikni topadi.
2. “Variantni saqlash” → izolyatsiyani “Penoplast, 5 sm” qiling → yana saqlang → taqqoslash jadvali: yo’qotish 65 % kam.
3. 3D: “Yon” burchak, “Harorat zonalari”, kursorni devor ustiga olib boring — aniq harorat chiqadi.
4. *Issiq suv quvuri*: izolyatsiyani “Yo’q” qiling → 381 W/m; tavsiya — 50 mm mineral paxta.
5. *Protsessor radiatori*: 65 W → 88 °C; dastur “56 W gacha 80 °C dan oshmaydi” deydi. Ventilyatorni o’chiring → qizib ketadi. “Relyef” tugmasi — issiq nuqta tepalik bo’lib ko’tariladi.
6. Pastdagi **Hisobot** → “Nusxalash”: natija oddiy matn ko’rinishida, Telegram yoki Word’ga qo’yish mumkin.

**Ilmiy qism namoyishi:** "1D · Beton devor" → issiqlik oqimini koʻrsatish → "2D · Poʻlat plastinka" → Boshlash →
"2D · Protsessor radiatori" → "Turgʻunlik" boʻlimida Fo slayderini 1 dan oshirish → "Aniqlik" va "Ishonchlilik" boʻlimlari.

## Hakamlar savollari va javoblar

### Ilmiy-uslubiy savollar

**Nega aynan chekli ayirmalar usuli, chekli elementlar emas?**
Toʻgʻri toʻrtburchak sohada chekli ayirmalar sodda, tez va ikkinchi tartibli. Chekli elementlar ixtiyoriy geometriya uchun kerak — bu keyingi bosqich sifatida rejalashtirilgan.

**Sxemaning aniqlik tartibi qanday tasdiqlandi?**
Ishlab chiqarilgan yechimlar usuli bilan: aniq yechim tanlanadi, manba va chegaraviy qiymatlar undan hisoblanadi. Toʻr ikki marta maydalanganda xato oshkormas sxemada ≈2, Krank–Nikolson va ADI da ≈4 marta kamaydi, ya'ni p ≈ 1 va p ≈ 2.

**Turgʻunlikni qanday asosladingiz?**
Fon Neyman tahlili: G(ξ) = (1 − 4(1−θ)Fo sin²(ξ/2)) / (1 + 4θ Fo sin²(ξ/2)). |G| ≤ 1 shartidan θ ≥ ½ da absolyut turgʻunlik, θ = 0 da Fo ≤ ½ kelib chiqadi. Ilovada grafik va oshkor sxemaning amalda buzilishi koʻrsatiladi.

**Krank–Nikolson absolyut turgʻun boʻlsa, nega Rannacher kerak?**
Katta Fo da G → −1: yuqori chastotali garmonikalar soʻnmaydi, ishorasini almashtiradi. Sakrashli boshlangʻich shartda bu soxta tebranishlar beradi (mis sterjen misolida 100 °C oʻrniga 146 °C chiqqan). Dastlabki 2 qadam oshkormas qilinganda tebranish yoʻqoladi, ikkinchi tartib saqlanadi — testlarda tasdiqlandi.

**Oqimli chegarada aniqlikni qanday saqladingiz?**
Soxta tugun usuli: chegaraviy shart markaziy ayirma bilan yoziladi, u₋₁ yoʻqotiladi. Natijada chegarada ham O(h²).

**ADI da qanday muammo topdingiz?**
Chegaraviy oqim hadlarini ikki yarim qadamga teng boʻlish III tur shartlarda yaqinlashish tartibini 2 dan 1 ga tushirdi (testda p = 1.04). Sababi — bo'linish xatosi τ²/4·Λₓ Λᵧ chegarada O(1/h) kattalikka ko'paytiriladi. Hadlar oʻz yoʻnalishi bilan birga olinganda p = 2.00 tiklandi.

**Natijalar fizik jihatdan toʻgʻriligini qanday bilasiz?**
Barqaror holatdagi klassik analitik yechimlar bilan: beton devor orqali oqim (78.38 W/m²), ichki manbali sim (352.88 °C), qovurgʻa uchidagi harorat (51.411 °C) — barchasi to'liq mos.

**Ikki mustaqil dastur nima uchun?**
JavaScript yadrosi va Python/NumPy versiyasi alohida yozilgan; bir xil xatolarni berishi (masalan, 3.736·10⁻⁴) dasturlash xatolari yoʻqligining qoʻshimcha dalili.

**Model cheklovlari?**
Oʻzgarmas material xossalari, toʻgʻri toʻrtburchak soha, chiziqli chegaraviy shartlar. Nochiziqli λ(u), nurlanish va 3D — keyingi bosqich.

**Amaliy masalalardagi natijalar qanchalik ishonchli?**
Ko’p qatlamli devor va izolyatsiyali quvur uchun barqaror holat analitik formulalar bilan 10⁻¹³ % aniqlikda mos (tests/layers.test.js), tuxum markazi harorati Furye qatori bilan 0.1 °C gacha mos. Material xossalari o’rtacha qiymatlar, shuning uchun real natija ±10–20 % farq qilishi mumkin; payvandlash modeli soddalashtirilgan (erish issiqligi hisobga olinmagan).

**Nega 3D emas, 1D/2D?**
Devor keng, quvur uzun, tuxum simmetrik — harorat bitta yo’nalishda o’zgaradi. Radiator va list yupqa — qalinlik bo’yicha farq kichik. Shuning uchun 1D/2D natija 3D bilan deyarli bir xil, hisob esa yuzlab marta tez va brauzerda bir soniyada bajariladi. 3D ko’rinish natijani tushunarli ko’rsatish uchun.

### Dasturlash savollari

**Qaysi texnologiyalar?**
HTML, CSS, JavaScript (kutubxonasiz), Canvas grafika; Python/NumPy; formulalar matplotlib orqali SVG ga aylantirilgan. Kod GitHub'da ochiq.

**Hisob qanchalik tez?**
1D masalalar 10 ms atrofida, 2D (51×51, 200–300 qadam, ADI) 0.2–1 s — oddiy noutbukda, brauzerda.

**Algoritm darslikdan-ku, sizning hissangiz nima?**
Darslikda bitta masala, faqat I tur shart va bitta sxema. Men umumiy masalani (1D/2D, I–III tur, manba, sirtdan almashish) va toʻrtta sxemani dasturladim, turgʻunlik va yaqinlashish tahlilini, analitik tekshiruvni qoʻshdim, ADI dagi chegaraviy hadlar muammosini topib tuzatdim. Darslik masalasi esa xususiy hol sifatida aynan takrorlanadi (992 iteratsiya).

**Kimga foydali?**
Talabalar va oʻqituvchilar uchun "Matematik modellashtirish", "Sonli usullar", "Issiqlik texnikasi" fanlarida virtual laboratoriya; muhandislar uchun tez taxminiy hisob.

### Yangi imkoniyatlar bo’yicha savollar

**Teskari masala nima va qanday yechiladi?**
To’g’ri masala: “shu devor qancha yo’qotadi?”. Teskari masala: “yo’qotish me’yordan oshmasligi uchun qanday izolyatsiya kerak?”.
Dastur kerakli parametrni ikki yo’l bilan topadi:
- ketma-ket hisoblash (qalinlik bo’yicha qidiruv);
- chiziqlilikdan foydalanish — masalan, radiatorda harorat ortishi quvvatga proporsional, shuning uchun 80 °C ga mos quvvat bitta hisobdan aniqlanadi.

**Matnli hisobot nima uchun kerak?**
Foydalanuvchi natijani faqat rasmda emas, hujjat sifatida olishi kerak. Hisobot berilganlar, natijalar, tavsiya va xulosadan iborat. Uni nusxalab yuborish yoki .txt fayl qilib saqlash mumkin.

**3D qanday chiziladi, kutubxona ishlatilganmi?**
Yo’q, o’zim yozgan Canvas rendereri ishlatilgan:
- perspektiv proyeksiya;
- yuzalarni chuqurlik bo’yicha saralash (rassom algoritmi);
- Lambert yoritilishi.

Kursor ostidagi harorat nuqtaning ko’pburchak ichida yotishini tekshirish orqali aniqlanadi. Tashqi kutubxona yo’qligi uchun sayt internetsiz ham ishlaydi.
