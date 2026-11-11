# Les nuances partagées par les dessins vus de haut à 45° (scripts/carte/hameaux.py, blocs.py) :
# des rampes de tons interpolés entre quelques couleurs clés, et un bruit fixe (tiré de clés
# fixes : relancer un script redonne la même image).


def bruit(x, y, s=0):
    """Un bruit fixe de -1 à 1, tiré de (x, y, s) (le même à chaque relance)."""
    h = (int(x) * 374761393 + int(y) * 668265263 + s * 2246822519) & 0xffffffff
    h = ((h ^ (h >> 13)) * 1274126177) & 0xffffffff
    return ((h ^ (h >> 16)) & 0xffff) / 32767.5 - 1


def rampe(cles, n=40):
    """n nuances interpolées entre des couleurs clés, du sombre au clair."""
    out = []
    for i in range(n):
        f = i / (n - 1) * (len(cles) - 1)
        k = min(int(f), len(cles) - 2)
        r = f - k
        out.append(tuple(round(cles[k][j] * (1 - r) + cles[k + 1][j] * r) for j in range(3)))
    return out


def ton(r, t):
    """La nuance t (0 sombre … 1 clair) de la rampe r."""
    return r[round(max(0.0, min(1.0, t)) * (len(r) - 1))]
