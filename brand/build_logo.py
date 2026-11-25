#!/usr/bin/env python3
"""Gera os masters SVG da Ludoteca em brand/final/ (símbolo, versão pequena, wordmark, lockups).

Letras construídas à mão como paths preenchidos (monoline arredondado), sem fonte e sem <text>:
peso W, altura-x XH, ascendente ASC. Rode: python3 brand/build_logo.py
"""
import math
from pathlib import Path

NAVY, AMBER, CREAM = "#1F3B57", "#CC7425", "#FAF6EE"
OUT = Path(__file__).parent / "final"

# ---------- símbolo (viewBox 256) ----------
def symbol_parts(thin=False, small=False):
    """Retorna (path do L, círculo da peça). thin = versão para fundo escuro (traço 2 mais fino)."""
    if small:  # corte para 16-48 px: L mais grosso, folga maior
        L = "M56 30H92A10 10 0 0 1 102 40V170H204A10 10 0 0 1 214 180V216A10 10 0 0 1 204 226H72A26 26 0 0 1 46 200V40A10 10 0 0 1 56 30Z"
        return L, (164, 108, 44)
    if thin:
        L = "M60 36H82A10 10 0 0 1 92 46V178H196A10 10 0 0 1 206 188V210A10 10 0 0 1 196 220H74A24 24 0 0 1 50 196V46A10 10 0 0 1 60 36Z"
        return L, (146, 124, 40)
    L = "M60 36H84A10 10 0 0 1 94 46V176H196A10 10 0 0 1 206 186V210A10 10 0 0 1 196 220H74A24 24 0 0 1 50 196V46A10 10 0 0 1 60 36Z"
    return L, (148, 122, 40)


def symbol_svg(l_fill, ball_fill, title, thin=False, small=False):
    L, (cx, cy, r) = symbol_parts(thin, small)
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" role="img" aria-label="{title}">\n'
            f'  <title>{title}</title>\n  <path fill="{l_fill}" d="{L}"/>\n  <circle fill="{ball_fill}" cx="{cx}" cy="{cy}" r="{r}"/>\n</svg>\n')


# ---------- wordmark ----------
W, XH, ASC, B = 24, 100, 156, 156  # traço, altura-x, ascendente, linha de base (y para baixo)
R = XH / 2
RI = R - W
CY = B - R


def f(n):
    return f"{n:.2f}".rstrip("0").rstrip(".")


def pt(cx, cy, rad, deg):
    t = math.radians(deg)
    return cx + rad * math.cos(t), cy + rad * math.sin(t)


def capsule(x, y, w, h):
    r = min(w, h) / 2
    return (f"M{f(x + r)} {f(y)}H{f(x + w - r)}A{f(r)} {f(r)} 0 0 1 {f(x + w)} {f(y + r)}V{f(y + h - r)}"
            f"A{f(r)} {f(r)} 0 0 1 {f(x + w - r)} {f(y + h)}H{f(x + r)}A{f(r)} {f(r)} 0 0 1 {f(x)} {f(y + h - r)}"
            f"V{f(y + r)}A{f(r)} {f(r)} 0 0 1 {f(x + r)} {f(y)}Z")


def ring(cx, cy, ro, ri):
    def circ(rad, x0):
        return f"M{f(cx - rad)} {f(cy)}A{f(rad)} {f(rad)} 0 1 0 {f(cx + rad)} {f(cy)}A{f(rad)} {f(rad)} 0 1 0 {f(cx - rad)} {f(cy)}Z"
    return circ(ro, 0) + circ(ri, 0)


def band(cx, cy, ro, ri, a0, a1, flat_end=False):
    """Faixa de anel de a0 a a1 graus (sentido horário na tela), pontas arredondadas (a1 reta se flat_end)."""
    cap = (ro - ri) / 2
    large = 1 if (a1 - a0) % 360 > 180 else 0
    p = lambda rad, a: tuple(f(v) for v in pt(cx, cy, rad, a))
    d = "M{} {}".format(*p(ro, a0))
    d += f"A{f(ro)} {f(ro)} 0 {large} 1 {' '.join(p(ro, a1))}"
    d += ("L" + " ".join(p(ri, a1))) if flat_end else f"A{f(cap)} {f(cap)} 0 0 1 {' '.join(p(ri, a1))}"
    d += f"A{f(ri)} {f(ri)} 0 {large} 0 {' '.join(p(ri, a0))}"
    d += f"A{f(cap)} {f(cap)} 0 0 1 {' '.join(p(ro, a0))}Z"
    return d


def stem(x, ytop, w, ybottom):
    """Haste com topo arredondado e base reta, que some dentro do bojo (sem degrau)."""
    r = w / 2
    return f"M{f(x)} {f(ytop + r)}A{f(r)} {f(r)} 0 0 1 {f(x + w)} {f(ytop + r)}V{f(ybottom)}H{f(x)}Z"


def glyphs(x):
    """Cada letra: (lista de (d, evenodd), largura)."""
    return {
        "l": ([(capsule(x, B - ASC, W, ASC), False)], W),
        "u": ([(_u(x), False)], 82),
        "d": ([(ring(x + R, CY, R, RI), True), (stem(x + 2 * R - W, B - ASC, W, CY), False)], 2 * R),
        "o": ([(ring(x + R, CY, R, RI), True)], 2 * R),
        "t": ([(capsule(x + 14, B - 128, W, 128), False), (capsule(x, B - XH, 52, W), False)], 52),
        # e: a barra termina na corda do círculo externo, e o anel termina no canto superior dessa corda
        "e": ([(band(x + R, CY, R, RI, 60, 360 - math.degrees(math.asin(W / 2 / R)), flat_end=True), False),
               (f"M{f(x + W / 2)} {f(CY - W / 2)}H{f(x + R + math.sqrt(R * R - (W / 2) ** 2))}V{f(CY + W / 2)}H{f(x + W / 2)}Z", False)], 2 * R),
        "c": ([(band(x + R, CY, R, RI, 40, 320), False)], 2 * R),
        "a": ([(ring(x + R, CY, R, RI), True), (stem(x + 2 * R - W, B - XH, W, CY), False)], 2 * R),
    }


def _u(x):
    Wu = 82
    ru = Wu / 2
    cx = x + ru
    cyu = B - ru
    yt = B - XH
    r = W / 2
    ri = ru - W
    return (f"M{f(x)} {f(yt + r)}A{f(r)} {f(r)} 0 0 1 {f(x + W)} {f(yt + r)}V{f(cyu)}"
            f"A{f(ri)} {f(ri)} 0 0 0 {f(x + Wu - W)} {f(cyu)}V{f(yt + r)}"
            f"A{f(r)} {f(r)} 0 0 1 {f(x + Wu)} {f(yt + r)}V{f(cyu)}"
            f"A{f(ru)} {f(ru)} 0 0 1 {f(x)} {f(cyu)}Z")


# espaçamento óptico entre pares (reto-reto maior, redondo-redondo menor)
GAPS = {"lu": 22, "ud": 18, "do": 12, "ot": 14, "te": 10, "ec": 10, "ca": 12}
WORD = "ludoteca"


def wordmark_paths(fill):
    x, out = 0.0, []
    for i, ch in enumerate(WORD):
        parts, adv = glyphs(x)[ch]
        for d, eo in parts:
            out.append(f'<path fill="{fill}"{" fill-rule=\"evenodd\"" if eo else ""} d="{d}"/>')
        x += adv + (GAPS.get(WORD[i:i + 2], 0) if i < len(WORD) - 1 else 0)
    return out, x


def wordmark_svg(fill, title="Ludoteca"):
    paths, width = wordmark_paths(fill)
    pad = 20
    body = "\n  ".join(paths)
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{-pad} {-pad} {f(width + 2 * pad)} {ASC + 2 * pad}" role="img" aria-label="{title}">\n'
            f'  <title>{title}</title>\n  {body}\n</svg>\n'), width


def lockup_horizontal(l_fill, ball_fill, word_fill, thin=False):
    L, (cx, cy, r) = symbol_parts(thin)
    # palavra menor que o símbolo e afastada dele, senão o L do símbolo e o 'l' leem "Lludoteca";
    # a base da palavra repousa na mesma linha do "piso" do L (y=220)
    s = 0.8
    paths, width = wordmark_paths(word_fill)
    dx = -14  # L começa em x=36
    wx = 206 + 60 + dx
    total = wx + width * s + 36
    inner = "\n    ".join(paths)
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {f(total)} 256" role="img" aria-label="Ludoteca">\n'
            f'  <title>Ludoteca</title>\n'
            f'  <g transform="translate({dx} 0)"><path fill="{l_fill}" d="{L}"/><circle fill="{ball_fill}" cx="{cx}" cy="{cy}" r="{r}"/></g>\n'
            f'  <g transform="translate({f(wx)} {f(220 - ASC * s)}) scale({f(s)})">\n    {inner}\n  </g>\n</svg>\n')


def lockup_stacked(l_fill, ball_fill, word_fill, thin=False):
    L, (cx, cy, r) = symbol_parts(thin)
    paths, width = wordmark_paths(word_fill)
    s = 0.62
    ww = width * s
    total_w = max(ww, 156) + 2 * 48
    sx = (total_w - 256) / 2
    wx = (total_w - ww) / 2
    top = 260
    total_h = top + ASC * s + 36
    inner = "\n    ".join(paths)
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {f(total_w)} {f(total_h)}" role="img" aria-label="Ludoteca">\n'
            f'  <title>Ludoteca</title>\n'
            f'  <g transform="translate({f(sx)} 0)"><path fill="{l_fill}" d="{L}"/><circle fill="{ball_fill}" cx="{cx}" cy="{cy}" r="{r}"/></g>\n'
            f'  <g transform="translate({f(wx)} {top}) scale({s})">\n    {inner}\n  </g>\n</svg>\n')


def icon_svg(title, scale, rounded):
    """Tile azul-noite com o símbolo pequeno em creme+âmbar, centrado opticamente.
    rounded=False é tela cheia (apple-touch e maskable, o sistema recorta)."""
    L, (cx, cy, r) = symbol_parts(small=True)
    rx = ' rx="56"' if rounded else ""
    tx, ty = 128 - 130 * scale, 128 - 128 * scale  # centro do símbolo pequeno é (130, 128)
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" role="img" aria-label="{title}">\n'
            f'  <title>{title}</title>\n  <rect width="256" height="256"{rx} fill="{NAVY}"/>\n'
            f'  <g transform="translate({f(tx)} {f(ty)}) scale({scale})"><path fill="{CREAM}" d="{L}"/><circle fill="{AMBER}" cx="{cx}" cy="{cy}" r="{r}"/></g>\n</svg>\n')


if __name__ == "__main__":
    OUT.mkdir(parents=True, exist_ok=True)
    files = {
        "ludoteca-symbol.svg": symbol_svg(NAVY, AMBER, "Ludoteca, símbolo"),
        "ludoteca-symbol-small.svg": symbol_svg(NAVY, AMBER, "Ludoteca, símbolo pequeno", small=True),
        "ludoteca-symbol-reversed.svg": symbol_svg(CREAM, AMBER, "Ludoteca, símbolo sobre fundo escuro", thin=True),
        "ludoteca-wordmark.svg": wordmark_svg(NAVY)[0],
        "ludoteca-horizontal.svg": lockup_horizontal(NAVY, AMBER, NAVY),
        "ludoteca-stacked.svg": lockup_stacked(NAVY, AMBER, NAVY),
        "ludoteca-horizontal-reversed.svg": lockup_horizontal(CREAM, AMBER, CREAM, thin=True),
        "ludoteca-stacked-reversed.svg": lockup_stacked(CREAM, AMBER, CREAM, thin=True),
        "ludoteca-app-icon.svg": icon_svg("Ludoteca, ícone do app", 0.62, rounded=False),
        "ludoteca-app-icon-rounded.svg": icon_svg("Ludoteca, ícone do app", 0.62, rounded=True),
        "ludoteca-maskable.svg": icon_svg("Ludoteca, ícone maskable", 0.5, rounded=False),
        "ludoteca-favicon.svg": icon_svg("Ludoteca", 0.74, rounded=True),
    }
    for name, svg in files.items():
        (OUT / name).write_text(svg, encoding="utf-8")
        print("wrote", name)
