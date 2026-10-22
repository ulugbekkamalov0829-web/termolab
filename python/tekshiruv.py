"""
Python versiyasi bilan tekshiruv:
  1) aniq (ishlab chiqarilgan) yechim bo'yicha yaqinlashish tartibi;
  2) darslikdagi 3-masala (L=8, T=3, N=50, K=200, a=5, h=0.16, u0=2).

Ishga tushirish:  python python/tekshiruv.py
"""
import numpy as np
from termolab import BC, solve_1d, solve_2d_adi

a2, lam, beta, us, T = 0.5, 2.0, 0.3, 0.1, 0.5
alpha, ue = 15.0, 0.3


def mms_1d(theta, N, K):
    L = 1.0; k = np.pi / L
    U = lambda x, t: np.exp(-t) * (1 + x / L + np.sin(k * x))
    Ux = lambda x, t: np.exp(-t) * (1 / L + k * np.cos(k * x))
    Uxx = lambda x, t: -np.exp(-t) * k ** 2 * np.sin(k * x)
    f = lambda x, t: -U(x, t) - a2 * Uxx(x, t) + beta * (U(x, t) - us)
    left = BC(3, alpha=alpha, ue=ue, q=lambda t, x, y: lam * (-Ux(0, t)) + alpha * (U(0, t) - ue))
    right = BC(2, q=lambda t, x, y: lam * Ux(L, t))
    x, u, Fo = solve_1d(L, N, T, K, a2, lam, lambda x: U(x, 0), left, right, theta, beta, us, f)
    return np.max(np.abs(u - U(x, T)))


def mms_2d(N, K):
    kx, ky, c = np.pi, np.pi / 2, 1.0
    U = lambda x, y, t: np.exp(-t) * (1 + np.sin(kx * x) * np.cos(ky * y) + c * x * y)
    Ux = lambda x, y, t: np.exp(-t) * (kx * np.cos(kx * x) * np.cos(ky * y) + c * y)
    Uy = lambda x, y, t: np.exp(-t) * (-ky * np.sin(kx * x) * np.sin(ky * y) + c * x)
    Lap = lambda x, y, t: -np.exp(-t) * (kx ** 2 + ky ** 2) * np.sin(kx * x) * np.cos(ky * y)
    f = lambda x, y, t: -U(x, y, t) - a2 * Lap(x, y, t) + beta * (U(x, y, t) - us)
    bc = {
        'left': BC(1, g=lambda t, x, y: U(x, y, t)),
        'right': BC(3, alpha=alpha, ue=ue, q=lambda t, x, y: lam * Ux(x, y, t) + alpha * (U(x, y, t) - ue)),
        'bottom': BC(2, q=lambda t, x, y: lam * (-Uy(x, y, t))),
        'top': BC(3, alpha=alpha, ue=ue, q=lambda t, x, y: lam * Uy(x, y, t) + alpha * (U(x, y, t) - ue)),
    }
    X, Y, Un = solve_2d_adi(1, 1, N, N, T, K, a2, lam, lambda x, y: U(x, y, 0), bc, beta, us, f)
    XX, YY = np.meshgrid(X, Y)
    return np.max(np.abs(Un - U(XX, YY, T)))


def table(title, fn, grids):
    print(f"\n{title}")
    prev = None
    for N, K in grids:
        e = fn(N, K)
        p = f"{np.log2(prev / e):.2f}" if prev else "  - "
        print(f"  N={N:3d} K={K:5d}  xato={e:.3e}  tartib={p}")
        prev = e


if __name__ == "__main__":
    g = [(10, 10), (20, 20), (40, 40), (80, 80)]
    table("1D oshkor (tau ~ h^2), III/II", lambda N, K: mms_1d(0.0, N, K), [(10, 100), (20, 400), (40, 1600)])
    table("1D oshkormas, III/II", lambda N, K: mms_1d(1.0, N, K), g)
    table("1D Krank-Nikolson, III/II", lambda N, K: mms_1d(0.5, N, K), g)
    table("2D ADI, I/III/II/III", mms_2d, [(8, 8), (16, 16), (32, 32)])

    x, u, Fo = solve_1d(8, 50, 3, 200, 25, 1.0, lambda x: 0.25 + np.sin(0.15 * x),
                        BC(1, g=lambda t, x, y: 0.25), BC(1, g=lambda t, x, y: 1.18),
                        theta=1.0, beta=0.16, us=2.0)
    print(f"\nDarslik 3-masala: u(L/2, T) = {u[25]:.4f},  Fo = {Fo:.2f}")
