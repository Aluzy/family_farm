# Prototype : planche HD (cases 32×64) de la fermière à partir des trois vues de référence.
#   python3 scripts/personnage/hd.py      écrit assets/fermiere_hd.png et .json (mêmes noms de cases que fermiere.json)
# Les gestes autres que la marche prennent pour l'instant la pose de repos de leur vue.
import json, os
from PIL import Image
ICI = os.path.dirname(os.path.abspath(__file__)); RACINE = os.path.dirname(os.path.dirname(ICI))
REF = {v: os.path.join(ICI, 'hd', f + '.png') for v, f in (('bas', 'face'), ('haut', 'dos'), ('cote', 'profil'))}
# coupe des jambes (rangée de l'entrejambe, mesurée du bas), milieu, bras (colonnes, rangées)
GEO = {'bas': dict(jambe=34, mil=32, bras=((0, 15), (50, 64)), brasy=(62, 112), epaule=60),
       'haut': dict(jambe=36, mil=31, bras=((0, 15), (50, 64)), brasy=(62, 114), epaule=62),
       'cote': dict(jambe=38, epaule=64)}
F = 0.43; CW, CH = 32, 64

def propre(im):
    px = im.load(); w, h = im.size
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if a and min(r, g, b) > 225:
                vs = [px[i, j] for i, j in ((x-1, y), (x+1, y), (x, y-1), (x, y+1)) if 0 <= i < w and 0 <= j < h and px[i, j][3] and min(px[i, j][:3]) <= 225]
                if vs: px[x, y] = tuple(sum(c[k] for c in vs)//len(vs) for k in range(3)) + (255,)
    return im

def coupe(im, box):
    m = Image.new('RGBA', im.size); m.paste(im.crop(box), box[:2]); return m

def decale(im, dx, dy):
    m = Image.new('RGBA', im.size); m.alpha_composite(im, (0, 0)) if False else None
    m.paste(im, (dx, dy)); return m

def sombre(im, k=0.78):
    r, g, b, a = im.split(); f = lambda v: int(v*k)
    return Image.merge('RGBA', (r.point(f), g.point(f), b.point(f), a))

def cisaille(im, y0, s):
    # décale chaque rangée sous y0 de s × (y - y0)/(h - y0)
    w, h = im.size; m = Image.new('RGBA', im.size)
    for y in range(y0, h):
        dx = round(s * (y - y0) / (h - y0)); m.paste(im.crop((0, y, w, y+1)), (dx, y))
    return m

def etire(dst, src, x0, x1, y0, y1, d):
    # le bras glisse de d au bout (la main), 0 à l'épaule : chaque rangée prend la rangée source décalée
    m = dst.copy(); w, h = src.size
    for y in range(y0, y1 + abs(d) + 1):
        if y >= h: break
        sy = y - round(d * min(1, (y - y0) / (y1 - y0)))
        if y0 <= sy < y1 + 1 and sy < h: m.paste(src.crop((x0, sy, x1, sy + 1)), (x0, y))
        elif y <= y1: m.paste((0, 0, 0, 0), (x0, y, x1, y + 1))
    return m

def pose(vue, geste, k):
    im = propre(Image.open(REF[vue]).convert('RGBA')); w, h = im.size; g = GEO[vue]
    yj = h - g['jambe']
    haut = coupe(im, (0, 0, w, yj)); bas = coupe(im, (0, yj, w, h))
    if geste == 'idle':
        if k == 1:   # respiration : la tête et les épaules descendent un peu
            t = coupe(im, (0, 0, w, g['epaule'])); r = coupe(im, (0, g['epaule'], w, h))
            r.alpha_composite(decale(t, 0, 2)); return r
        return im
    # marche : 0 et 2 une jambe levée, 1 et 3 les deux au sol
    out = Image.new('RGBA', im.size)
    if vue == 'cote':
        if k % 2 == 0:
            out.alpha_composite(sombre(cisaille(bas, yj, 7)))
            out.alpha_composite(cisaille(bas, yj, -7))
            out.alpha_composite(haut); return decale(out, 0, 0)
        out.alpha_composite(bas); out.alpha_composite(haut); return out
    gj = coupe(bas, (0, yj, g['mil'], h)); dj = coupe(bas, (g['mil'], yj, w, h))
    lev = {0: 'g', 2: 'd'}.get(k)
    out.alpha_composite(decale(gj, 0, -5) if lev == 'g' else gj)
    out.alpha_composite(decale(dj, 0, -5) if lev == 'd' else dj)
    (b0, b1), (c0, c1) = g['bras']; y0, y1 = g['brasy']
    sw = {0: 3, 2: -3}.get(k, 0)
    corps = haut.copy()
    for (a0, a1), d in (((b0, b1), sw), ((c0, c1), -sw)):
        corps = etire(corps, haut, a0, a1, y0, min(y1, yj), d)
    out.alpha_composite(corps)
    if lev is None: out = decale(out, 0, 0)
    return out

def reduit(im):
    w, h = im.size; nw, nh = round(w*F), round(h*F)
    r = im.resize((nw, nh), Image.LANCZOS)
    a = r.getchannel('A').point(lambda v: 255 if v >= 120 else 0); r.putalpha(a)
    case = Image.new('RGBA', (CW, CH)); case.alpha_composite(r, ((CW-nw)//2, CH-nh)); return case

def main(sortie):
    noms = json.load(open(os.path.join(RACINE, 'assets', 'fermiere.json')))['frames']
    cache = {}
    planche = Image.new('RGBA', (8*CW, ((len(noms)+7)//8)*CH))
    for i, n in enumerate(noms):
        p = n.split('_'); vue = next((v for v in ('bas', 'haut', 'cote') if v in p), 'bas')
        geste = p[0] if p[0] in ('idle', 'marche') else 'idle'; k = int(p[-1]) if p[-1].isdigit() and geste == p[0] else 0
        key = (vue, geste, k % 4)
        if key not in cache: cache[key] = reduit(pose(*key))
        planche.alpha_composite(cache[key], ((i % 8)*CW, (i//8)*CH))
    planche.save(sortie)
    json.dump({'frameWidth': CW, 'frameHeight': CH, 'frames': noms}, open(sortie[:-4] + '.json', 'w'), ensure_ascii=False, indent=0)

if __name__ == '__main__': main(os.path.join(RACINE, 'assets', 'fermiere_hd.png'))
