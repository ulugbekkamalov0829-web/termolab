"""
Sterjenda issiqlik tarqalishi (3-masala)
=========================================
Tenglama:  du/dt = a^2 * d2u/dx2 - h*(u - u0),   0 <= x <= L, 0 < t <= T
Boshlang'ich shart:  u(x,0) = phi(x) = 0.25 + sin(0.15 x)
Chegaraviy shartlar: u(0,t) = U1,  u(L,t) = U2

Usullar:
  1) Oshkormas sxema + Zeydel iteratsiyasi (kitobdagi algoritm)
  2) Oshkormas sxema + haydash (Thomas) usuli — har qatlam bir urinishda
  3) Oshkor sxema — turg'unlik shartini ko'rsatish uchun

Muallif: Kamalov Ulug'bek
"""
import math

# ---------------- Parametrlar (kitobdagi 3-masala) ----------------
L, T = 8.0, 3.0          # sterjen uzunligi, vaqt oralig'i
N, K = 50, 200           # x va t bo'yicha bo'laklar soni
A = 5.0                  # a (a^2 - issiqlik o'tkazuvchanlik koeffitsienti)
U0 = 2.0                 # atrof-muhit (havo) harorati
U1, U2 = 0.25, 1.18      # sterjen uchlaridagi harorat
EPS = 1e-4               # Zeydel aniqligi

hx = L / N               # x bo'yicha qadam
dt = T / K               # vaqt bo'yicha qadam
# Issiqlik almashish koeffitsienti h = alpha*p/(c*rho*sigma).
# Kitobdagi dasturda u to'r qadami bilan bir xil (h = L/N = 0.16) olingan.
# Bu yerda ikkalasi ALOHIDA o'zgaruvchi, qiymati kitob bilan solishtirish uchun 0.16.
H_COEF = 0.16


def phi(x):
    return 0.25 + math.sin(0.15 * x)


def init_grid():
    """U[i][j]: i - sterjen nuqtasi, j - vaqt qatlami."""
    U = [[0.0] * (K + 1) for _ in range(N + 1)]
    for i in range(N + 1):
        U[i][0] = phi(i * hx)
    for j in range(K + 1):
        U[0][j] = U1
        U[N][j] = U2
    return U


def gamma():
    return A * A * dt / (hx * hx)


def solve_seidel():
    """Kitobdagi algoritm: butun to'r bo'yicha Zeydel iteratsiyasi."""
    g = gamma()
    den = 1 + 2 * g + dt * H_COEF
    U = init_grid()
    rho, k = 1.0, 0
    while rho > EPS:
        rho = 0.0
        for j in range(1, K + 1):
            for i in range(1, N):
                V = (g * (U[i - 1][j] + U[i + 1][j]) + U[i][j - 1]
                     + dt * H_COEF * U0) / den
                r = abs(V - U[i][j])
                if r > rho:
                    rho = r
                U[i][j] = V
        k += 1
    return U, k


def solve_thomas():
    """Oshkormas sxema, har qatlam haydash (progonka) usulida aniq yechiladi."""
    g = gamma()
    den = 1 + 2 * g + dt * H_COEF
    U = init_grid()
    n = N - 1
    for j in range(1, K + 1):
        # -g*u[i-1] + den*u[i] - g*u[i+1] = u_old + dt*h*u0
        a = [-g] * n; b = [den] * n; c = [-g] * n
        d = [U[i][j - 1] + dt * H_COEF * U0 for i in range(1, N)]
        d[0] += g * U[0][j]
        d[-1] += g * U[N][j]
        for i in range(1, n):              # oldinga yurish
            m = a[i] / b[i - 1]
            b[i] -= m * c[i - 1]
            d[i] -= m * d[i - 1]
        x = [0.0] * n
        x[-1] = d[-1] / b[-1]
        for i in range(n - 2, -1, -1):     # orqaga yurish
            x[i] = (d[i] - c[i] * x[i + 1]) / b[i]
        for i in range(1, N):
            U[i][j] = x[i - 1]
    return U


def solve_explicit(steps):
    """Oshkor sxema: u_new = u + g*(u[i+1]-2u[i]+u[i-1]) - dt*h*(u-u0)."""
    d = T / steps
    g = A * A * d / (hx * hx)
    u = [phi(i * hx) for i in range(N + 1)]
    u[0], u[N] = U1, U2
    for _ in range(steps):
        new = u[:]
        for i in range(1, N):
            new[i] = u[i] + g * (u[i + 1] - 2 * u[i] + u[i - 1]) - d * H_COEF * (u[i] - U0)
        u = new
        if any(math.isnan(v) or abs(v) > 1e6 for v in u):
            return None, g
    return u, g


if __name__ == "__main__":
    print(f"hx = {hx:.4f},  dt = {dt:.4f},  gamma = a^2*dt/hx^2 = {gamma():.2f}")

    U_s, iters = solve_seidel()
    U_t = solve_thomas()
    print(f"\nZeydel: {iters} ta iteratsiyada eps = {EPS} aniqlikka erishildi")
    diff = max(abs(U_s[i][j] - U_t[i][j]) for i in range(N + 1) for j in range(K + 1))
    print(f"Zeydel va haydash usuli orasidagi eng katta farq: {diff:.2e}")

    print("\nKitob jadvali bilan solishtirish (i - satr, j - ustun):")
    print("  i |" + "".join(f"  j={j:<5}" for j in range(5)))
    for i in range(6):
        print(f" {i:2d} |" + "".join(f"  {U_s[i][j]:.3f}  " for j in range(5)))

    print("\nOxirgi paytdagi (t = T) harorat, har 5-nuqta:")
    for i in range(0, N + 1, 5):
        print(f"  x = {i*hx:4.2f}   u = {U_s[i][K]:.4f}")

    print("\nOshkor sxema turg'unligi:")
    for steps in (200, 2000, 6000):
        u, g = solve_explicit(steps)
        status = "BUZILDI (natija cheksizlikka ketdi)" if u is None else f"ishladi, u(L/2,T) = {u[N//2]:.4f}"
        print(f"  {steps:5d} qadam, gamma = {g:6.3f}: {status}")
    print(f"  Oshkormas sxema (200 qadam): u(L/2,T) = {U_t[N//2][K]:.4f}")
