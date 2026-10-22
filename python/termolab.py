"""
TermoLab — issiqlik o'tkazuvchanlik tenglamasini sonli yechish (Python/NumPy versiyasi)
=========================================================================================

    du/dt = a^2 * Laplace(u) + f(x,t) - beta*(u - u_s)

Chegaraviy shartlar (n - tashqi normal):
    I tur  : u = g(t)
    II tur : lambda * du/dn = q(t)
    III tur: lambda * du/dn + alpha*u = alpha*u_env + q(t)

Sxemalar: theta-sxema (0 - oshkor, 1 - oshkormas, 0.5 - Krank-Nikolson),
2D: Pisman-Rekford ADI (chegaraviy hadlar yo'nalish bo'yicha ajratilgan).
Bu fayl veb-ilovadagi JavaScript yadrosidan mustaqil yozilgan va natijalarni
o'zaro tekshirish uchun ishlatiladi.

Muallif: Kamalov Ulug'bek, 2026
"""
from dataclasses import dataclass, field
from typing import Callable, Optional
import numpy as np


@dataclass
class BC:
    type: int                                   # 1, 2 yoki 3
    g: Optional[Callable] = None                # I tur: g(t, x, y)
    q: Optional[Callable] = None                # II/III tur: q(t, x, y)
    alpha: float = 0.0                          # III tur: issiqlik berish koeffitsienti
    ue: float = 0.0                             # III tur: tashqi muhit harorati

    def flux(self, t, x=0.0, y=0.0):
        al = self.alpha if self.type == 3 else 0.0
        return al * self.ue + (self.q(t, x, y) if self.q else 0.0)


def thomas(lo, di, up, rhs):
    """Uch diagonalli sistemani haydash usulida yechish."""
    n = len(di)
    c = np.empty(n); d = np.empty(n); x = np.empty(n)
    c[0] = up[0] / di[0]; d[0] = rhs[0] / di[0]
    for i in range(1, n):
        m = di[i] - lo[i] * c[i - 1]
        c[i] = up[i] / m
        d[i] = (rhs[i] - lo[i] * d[i - 1]) / m
    x[-1] = d[-1]
    for i in range(n - 2, -1, -1):
        x[i] = d[i] - c[i] * x[i + 1]
    return x


def operator_1d(n, h, a2, lam, beta, left: BC, right: BC):
    """A matritsa (uch diagonal) va Dirixle tugunlari belgisi."""
    k = a2 / h ** 2
    lo = np.full(n, k); di = np.full(n, -2 * k - beta); up = np.full(n, k)
    lo[0] = up[-1] = 0.0
    dirichlet = np.zeros(n, bool)
    for i, bc, inner in ((0, left, 1), (n - 1, right, -1)):
        if bc.type == 1:
            dirichlet[i] = True
            continue
        al = bc.alpha if bc.type == 3 else 0.0
        di[i] = -2 * k - 2 * a2 * al / (h * lam) - beta
        if inner == 1:
            up[i] = 2 * k
        else:
            lo[i] = 2 * k
    return lo, di, up, dirichlet


def apply3(lo, di, up, u):
    r = di * u
    r[1:] += lo[1:] * u[:-1]
    r[:-1] += up[:-1] * u[1:]
    return r


def solve_1d(L, N, T, K, a2, lam, init, left: BC, right: BC, theta=1.0,
             beta=0.0, us=0.0, f=None, rannacher=True):
    """theta-sxema. rannacher=True: Krank-Nikolsonda dastlabki 2 qadam oshkormas."""
    n = N + 1; h = L / N; tau = T / K
    x = np.linspace(0, L, n)
    lo, di, up, dr = operator_1d(n, h, a2, lam, beta, left, right)
    s = 2 * a2 / (h * lam)

    def b(t):
        v = (f(x, t) if f else np.zeros(n)) + beta * us
        if not dr[0]: v[0] += s * left.flux(t, 0.0)
        if not dr[-1]: v[-1] += s * right.flux(t, L)
        return v

    u = init(x).astype(float)
    if dr[0]: u[0] = left.g(0, 0.0, 0.0)
    if dr[-1]: u[-1] = right.g(0, L, 0.0)
    start = 2 if (theta == 0.5 and rannacher) else 0
    for j in range(K):
        t0, t1 = j * tau, (j + 1) * tau
        th = 1.0 if j < start else theta
        Ml = np.where(dr, 0, -th * tau * lo)
        Md = np.where(dr, 1, 1 - th * tau * di)
        Mu = np.where(dr, 0, -th * tau * up)
        rhs = u + (1 - th) * tau * apply3(lo, di, up, u) + tau * (th * b(t1) + (1 - th) * b(t0))
        if dr[0]: rhs[0] = left.g(t1, 0.0, 0.0)
        if dr[-1]: rhs[-1] = right.g(t1, L, 0.0)
        u = rhs if th == 0 else thomas(Ml, Md, Mu, rhs)
    return x, u, a2 * tau / h ** 2


def solve_2d_adi(Lx, Ly, Nx, Ny, T, K, a2, lam, init, bc: dict, beta=0.0, us=0.0, f=None):
    """Pisman-Rekford ADI. bc = {'left','right','bottom','top'} -> BC."""
    nx, ny = Nx + 1, Ny + 1; hx, hy = Lx / Nx, Ly / Ny; tau = T / K
    X = np.linspace(0, Lx, nx); Y = np.linspace(0, Ly, ny)
    XX, YY = np.meshgrid(X, Y)                       # massiv shakli (ny, nx)
    Ax = operator_1d(nx, hx, a2, lam, beta / 2, bc['left'], bc['right'])
    Ay = operator_1d(ny, hy, a2, lam, beta / 2, bc['bottom'], bc['top'])
    sx, sy = 2 * a2 / (hx * lam), 2 * a2 / (hy * lam)
    side = np.zeros((ny, nx), int)                   # Dirixle tomoni: 1 chap, 2 o'ng, 3 past, 4 yuqori
    if bc['top'].type == 1: side[-1, :] = 4
    if bc['bottom'].type == 1: side[0, :] = 3
    if bc['right'].type == 1: side[:, -1] = 2
    if bc['left'].type == 1: side[:, 0] = 1
    names = {1: 'left', 2: 'right', 3: 'bottom', 4: 'top'}

    def g(t):
        G = np.zeros((ny, nx))
        for s, nm in names.items():
            msk = side == s
            if msk.any():
                G[msk] = np.vectorize(lambda xx, yy: bc[nm].g(t, xx, yy))(XX[msk], YY[msk])
        return G

    def Sx(t):
        v = np.zeros((ny, nx))
        if not Ax[3][0]: v[:, 0] += sx * np.array([bc['left'].flux(t, 0.0, yy) for yy in Y])
        if not Ax[3][-1]: v[:, -1] += sx * np.array([bc['right'].flux(t, Lx, yy) for yy in Y])
        return v

    def Sy(t):
        v = np.zeros((ny, nx))
        if not Ay[3][0]: v[0, :] += sy * np.array([bc['bottom'].flux(t, xx, 0.0) for xx in X])
        if not Ay[3][-1]: v[-1, :] += sy * np.array([bc['top'].flux(t, xx, Ly) for xx in X])
        return v

    def F(t):
        return (f(XX, YY, t) if f else 0.0) + beta * us

    def AxU(U):  # x bo'yicha har bir qatorga
        return np.array([apply3(Ax[0], Ax[1], Ax[2], U[k]) for k in range(ny)])

    def AyU(U):
        return np.array([apply3(Ay[0], Ay[1], Ay[2], U[:, i]) for i in range(nx)]).T

    U = init(XX, YY).astype(float)
    dmask = side > 0
    U[dmask] = g(0)[dmask]
    for j in range(K):
        t0, t1, tm = j * tau, (j + 1) * tau, (j + 0.5) * tau
        G0, G1 = g(t0), g(t1)
        sxm, fm, sy0, sy1 = Sx(tm), F(tm), Sy(t0), Sy(t1)
        R1 = U + tau / 2 * (AyU(U) + sy0) + tau / 2 * (sxm + fm)
        # Dirixle ustunlaridagi oraliq qiymat
        ay = lambda G, t: AyU(G) + Sy(t)
        Gstar = 0.5 * (G0 + G1) + tau / 4 * (ay(G0, t0) - ay(G1, t1))
        Us = np.empty_like(U)
        for k in range(ny):
            if Ay[3][k]:                                       # butun qator Dirixle
                Us[k] = g(tm)[k]; continue
            dr = side[k] > 0
            lo = np.where(dr, 0, -tau / 2 * Ax[0]); di = np.where(dr, 1, 1 - tau / 2 * Ax[1])
            up = np.where(dr, 0, -tau / 2 * Ax[2]); rhs = np.where(dr, Gstar[k], R1[k])
            Us[k] = thomas(lo, di, up, rhs)
        R2 = Us + tau / 2 * (AxU(Us) + sxm) + tau / 2 * (sy1 + fm)
        Un = np.empty_like(U)
        for i in range(nx):
            dr = side[:, i] > 0
            lo = np.where(dr, 0, -tau / 2 * Ay[0]); di = np.where(dr, 1, 1 - tau / 2 * Ay[1])
            up = np.where(dr, 0, -tau / 2 * Ay[2]); rhs = np.where(dr, G1[:, i], R2[:, i])
            Un[:, i] = thomas(lo, di, up, rhs)
        U = Un
    return X, Y, U
