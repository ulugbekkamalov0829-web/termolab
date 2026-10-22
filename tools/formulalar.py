"""
Formulalarni matematik ko'rinishda (Computer Modern shrifti) SVG ga aylantirish.
Natija: formulas/formulas.json  {kalit: svg}  — veb-ilova va taqdimot uchun.

Ishga tushirish:  python tools/formulalar.py
"""
import io, json, re, os
import matplotlib
matplotlib.use('svg')
import matplotlib.pyplot as plt

plt.rcParams.update({'mathtext.fontset': 'cm', 'svg.fonttype': 'path', 'svg.hashsalt': 'termolab'})

F = {
 # Asosiy tenglama
 'energy':   r'\rho c\,\dfrac{\partial u}{\partial t}=\nabla\cdot(\lambda\nabla u)+Q(\mathbf{x},t)',
 'heat':     r'\dfrac{\partial u}{\partial t}=a^2\,\Delta u+f(\mathbf{x},t)-\beta\,(u-u_s)',
 'coeffs':   r'a^2=\dfrac{\lambda}{\rho c},\qquad f=\dfrac{Q}{\rho c},\qquad \beta=\dfrac{\alpha_s\,p}{\rho c\,\sigma}',
 'laplace':  r'\Delta u=\dfrac{\partial^2 u}{\partial x^2}+\dfrac{\partial^2 u}{\partial y^2}',
 'ic':       r'u(\mathbf{x},0)=\varphi(\mathbf{x})',
 # Chegaraviy shartlar
 'bc1':      r'\left.u\,\right|_{\Gamma}=g(t)',
 'bc2':      r'\left.\lambda\dfrac{\partial u}{\partial n}\right|_{\Gamma}=q(t)',
 'bc3':      r'\left.\left(\lambda\dfrac{\partial u}{\partial n}+\alpha\,u\right)\right|_{\Gamma}=\alpha\,u_e+q(t)',
 # To'r va ayirmalar
 'grid':     r'x_i=ih,\quad t_j=j\tau,\qquad h=\dfrac{L}{N},\quad \tau=\dfrac{T}{K}',
 'dxx':      r'\dfrac{\partial^2 u}{\partial x^2}\approx\dfrac{u_{i+1}-2u_i+u_{i-1}}{h^2}+O(h^2)',
 'Lambda':   r'\Lambda u_i=a^2\,\dfrac{u_{i+1}-2u_i+u_{i-1}}{h^2}-\beta\,u_i',
 'theta':    r'\dfrac{u_i^{j+1}-u_i^{j}}{\tau}=\theta\,\Lambda u_i^{j+1}+(1-\theta)\,\Lambda u_i^{j}+\phi_i^{j+\theta}',
 'ghost':    r'u_{-1}=u_1-\dfrac{2h}{\lambda}\left(\alpha\,u_0-\alpha\,u_e-q\right)',
 # Turg'unlik
 'fourier':  r'\mathrm{Fo}=\dfrac{a^2\tau}{h^2}',
 'stab':     r'\tau\leq\dfrac{h^2}{2a^2}\qquad\left(\mathrm{Fo}\leq\dfrac{1}{2}\right)',
 'G':        r'G(\xi)=\dfrac{1-4(1-\theta)\,\mathrm{Fo}\,\sin^2(\xi/2)}{1+4\theta\,\mathrm{Fo}\,\sin^2(\xi/2)}',
 'Gexact':   r'G_{\mathrm{aniq}}(\xi)=e^{-\mathrm{Fo}\,\xi^2},\qquad \xi=kh\in[0,\pi]',
 'Gcond':    r'|G(\xi)|\leq 1\quad\Longleftrightarrow\quad \theta\geq\dfrac{1}{2}\quad\mathrm{yoki}\quad \mathrm{Fo}\leq\dfrac{1}{2(1-2\theta)}',
 # Yaqinlashish
 'order':    r'\|u-u_h\|_{\infty}=O\left(\tau^{\,p_t}+h^2\right),\qquad p_t=1\ (\theta=1),\quad p_t=2\ \left(\theta=\frac{1}{2}\right)',
 'order2':   r'\|u-u_h\|_{\infty}=O\left(\tau^{\,p_t}+h^2\right)',
 'pest':     r'p\approx\log_2\dfrac{E_h}{E_{h/2}}',
 'mms':      r'u^{*}(x,t)=e^{-t}\left(1+\dfrac{x}{L}+\sin\dfrac{\pi x}{L}\right)',
 'mmsf':     r'f=\dfrac{\partial u^{*}}{\partial t}-a^2\dfrac{\partial^2 u^{*}}{\partial x^2}+\beta\,(u^{*}-u_s)',
 # ADI
 'adi1':     r'\left(I-\dfrac{\tau}{2}\Lambda_x\right)u^{j+\frac{1}{2}}=\left(I+\dfrac{\tau}{2}\Lambda_y\right)u^{j}+\dfrac{\tau}{2}\left(F^{j+\frac{1}{2}}+S_x^{j+\frac{1}{2}}+S_y^{j}\right)',
 'adi2':     r'\left(I-\dfrac{\tau}{2}\Lambda_y\right)u^{j+1}=\left(I+\dfrac{\tau}{2}\Lambda_x\right)u^{j+\frac{1}{2}}+\dfrac{\tau}{2}\left(F^{j+\frac{1}{2}}+S_x^{j+\frac{1}{2}}+S_y^{j+1}\right)',
 # Chiziqli sistema
 'tri':      r'A_i\,u_{i-1}-C_i\,u_i+B_i\,u_{i+1}=-F_i',
 'sweep':    r'u_i=\alpha_{i+1}u_{i+1}+\beta_{i+1},\quad \alpha_{i+1}=\dfrac{B_i}{C_i-A_i\alpha_i},\quad \beta_{i+1}=\dfrac{A_i\beta_i+F_i}{C_i-A_i\alpha_i}',
 'seidel':   r'u_i^{(s+1)}=\dfrac{A_i\,u_{i-1}^{(s+1)}+B_i\,u_{i+1}^{(s)}+F_i}{C_i},\qquad \max_i\left|u_i^{(s+1)}-u_i^{(s)}\right|<\varepsilon',
 # Darslik masalasi
 'book':     r'\dfrac{\partial u}{\partial t}=a^2\dfrac{\partial^2 u}{\partial x^2}-h\,(u-u_0),\quad u(0,t)=U_1,\quad u(L,t)=U_2',
 'bookV':    r'u_{i,j}=\dfrac{\gamma\,(u_{i-1,j}+u_{i+1,j})+u_{i,j-1}+\Delta h\,u_0}{1+2\gamma+\Delta h},\qquad \gamma=\dfrac{a^2\Delta}{h_x^2}',
 # Fizik kattaliklar
 'biot':     r'\mathrm{Bi}=\dfrac{\alpha\,h}{\lambda}',
 'flux':     r'q=-\lambda\,\dfrac{\partial u}{\partial n}',
 # Analitik yechimlar (barqaror holat)
 'wall':     r'q=\dfrac{u_i-u_o}{\dfrac{1}{\alpha_i}+\dfrac{L}{\lambda}+\dfrac{1}{\alpha_o}}',
 'wire':     r'u_{\max}-u_s=\dfrac{Q}{\lambda m^2}\left(1-\dfrac{1}{\cosh(mL/2)}\right),\qquad m^2=\dfrac{4\alpha_s}{\lambda d}',
 'fin':      r'\dfrac{u(L)-u_s}{u(0)-u_s}=\dfrac{1}{\cosh mL+\dfrac{\alpha}{m\lambda}\sinh mL}',
}


def render(tex, color='#16212e', size=20):
    fig = plt.figure(figsize=(0.01, 0.01))
    fig.text(0, 0, f'${tex}$', fontsize=size, color=color)
    buf = io.StringIO()
    fig.savefig(buf, format='svg', bbox_inches='tight', pad_inches=0.03, transparent=True)
    plt.close(fig)
    return buf.getvalue()


def clean(svg, key):
    svg = svg[svg.index('<svg'):]
    svg = re.sub(r'<metadata>.*?</metadata>', '', svg, flags=re.S)
    svg = re.sub(r'<style.*?</style>', '', svg, flags=re.S)
    svg = re.sub(r'\s*<!--.*?-->', '', svg, flags=re.S)
    w, h = re.search(r'viewBox="0 0 ([\d.]+) ([\d.]+)"', svg).groups()
    svg = re.sub(r'<svg[^>]*>', f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" data-w="{w}" data-h="{h}">', svg, count=1)
    svg = svg.replace('xlink:href', 'href')
    # identifikatorlarni formulaga xos qilish (bir sahifada to'qnashmasin)
    ids = set(re.findall(r'id="([^"]+)"', svg))
    for i in sorted(ids, key=len, reverse=True):
        svg = svg.replace(f'id="{i}"', f'id="{key}-{i}"').replace(f'href="#{i}"', f'href="#{key}-{i}"')
    svg = re.sub(r'<g id="[^"]*(figure|axes|patch|text)_[^"]*">', '<g>', svg)
    svg = re.sub(r'\n\s*', '', svg)
    return svg


if __name__ == '__main__':
    out = {}
    bad = []
    for k, tex in F.items():
        try:
            out[k] = clean(render(tex), k)
        except Exception as e:
            bad.append((k, str(e).strip().splitlines()[-1]))
    for b in bad: print('XATO', b)
    os.makedirs('formulas', exist_ok=True)
    json.dump(out, open('formulas/formulas.json', 'w'), ensure_ascii=False)
    for k, v in out.items():
        open(f'formulas/{k}.svg', 'w').write(v)
    print(len(out), 'ta formula;', max(len(v) for v in out.values()), 'bayt eng kattasi')
