# assets/puits.png : le puits de la ferme (un bloc posé dehors), 3 images de 50×50 :
#   0 : le puits seul ;
#   1 : le même, avec le tuyau de la pompe qui passe par-dessus la margelle et plonge dans l'eau ;
#   2 : la pompe électrique seule, posée à droite du puits (par-dessus l'image 1 une fois la
#       pompe achetée ; la carte la fait vibrer d'un pixel vers la droite quand elle tourne) :
#       une pompe verticale, son moteur vert debout sur le corps de fonte, un manomètre, sur un
#       socle de béton. Le tuyau de l'image 1 entre dans son flanc gauche : décalée, elle reste
#       raccordée.
# Vu de haut à 45° comme les blocs (scripts/rendu45.py) : une margelle ronde de pierres, l'eau et
# le seau pendu à sa corde au milieu de l'ouverture, deux poteaux, une manivelle à droite, et
# au-dessus un toit conique de tuiles rouges à nervures, coiffé d'un épi. Le puits est au
# milieu de l'image (la carte la centre sur sa case), le bas de la margelle sur le bas de l'image.
import math
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '..'))  # scripts/pixel.py, scripts/rendu45.py
from pixel import ASSETS, rangee  # noqa: E402
from rendu45 import Toile, boite, cylindre, disque, ton  # noqa: E402
from style_v2 import PALETTE_SERRE as PS  # noqa: E402

W, H = 50, 50
X0, Y0 = 25, 41                      # le pied de l'axe du puits dans l'image

PIERRE = PS['pierre']
BOIS = PS['bois']
TUILE = [(92, 34, 24), (122, 47, 34), (155, 63, 44), (185, 87, 59), (210, 122, 82)]
EAU = [(20, 28, 46), (28, 38, 58), (40, 56, 84), (64, 96, 138)]
FER = [(52, 54, 60), (90, 94, 102), (140, 146, 156)]
CORDE = [(120, 96, 60), (170, 140, 92)]
TUYAU = [(96, 100, 106), (140, 144, 150), (186, 190, 196)]
BETON = [(84, 92, 100), (112, 122, 132), (144, 154, 164), (176, 186, 194), (206, 214, 220)]
FONTE = [(40, 42, 48), (70, 74, 82), (110, 116, 126), (156, 162, 172), (200, 206, 214)]
MOTEUR = [(30, 52, 34), (46, 82, 50), (70, 118, 70), (104, 152, 96), (150, 190, 138)]
CADRAN, AIGUILLE = (236, 236, 228), (166, 46, 40)

RO, RI, HM, EAU_Z = 12.5, 10, 9, 6     # margelle : rayons dehors et dedans, hauteur ; l'eau
ZT, R, HR = 30, 15.5, 9                # le toit : avant-toit, rayon, hauteur du cône
NERVURES = 8


def margelle(t):
    # le flanc : des rangées de pierres de 3 px, joints décalés d'une rangée à l'autre
    def flanc(phi, z, s):
        rang = int(z // 3)
        u = (phi * RO) / 5.0 + (0.5 if rang % 2 else 0)
        if (z % 3) < 0.6 or (u % 1) < 0.18:
            return ton(PIERRE, s, -2)
        v = (int(u) * 7 + rang * 3) % 5
        return ton(PIERRE, s * 0.85 + 0.1, -1 if v == 0 else (1 if v == 3 else 0))
    cylindre(t, 0, 0, RO, 0, HM, flanc, 'margelle')

    # le rebord : des pierres plates, une sur deux plus claire
    def rebord(rho, phi, s):
        k = phi * 8 / (2 * math.pi)
        if k % 1 < 0.08 or abs(rho - (RI + 0.3)) < 0.3:
            return PIERRE[2]
        return PIERRE[4] if int(k) % 2 else PIERRE[3]
    disque(t, 0, 0, RI, RO, HM, rebord, 'margelle')

    # la paroi du dedans (le fond se voit, dans l'ombre)
    def paroi(phi, z, s):
        rang = int(z // 3)
        u = (phi * RI) / 5.0 + (0.5 if rang % 2 else 0)
        if (z % 3) < 0.6 or (u % 1) < 0.18:
            return (60, 54, 44)
        return ton(PIERRE[:3], 0.3 + 0.4 * (z - EAU_Z) / (HM - EAU_Z))
    cylindre(t, 0, 0, RI, EAU_Z, HM, paroi, 'paroi', interieur=True)

    # l'eau, sombre, un reflet à gauche
    def eau(rho, phi, s):
        x, d = rho * math.cos(phi), rho * math.sin(phi)
        if -6 < x < -2 and -3 < d < -1.5:
            return EAU[3]
        if rho > RI - 1.5 and d > 0:
            return EAU[0]
        return EAU[1] if int(x + d * 2) % 7 else EAU[2]
    disque(t, 0, 0, 0, RI, EAU_Z, eau, 'eau')


def seau(t, z0=EAU_Z - 0.5, h=4):
    # un seau de bois cerclé de fer, à moitié dans l'eau, et sa corde jusque sous le toit
    def flanc(phi, z, s):
        if abs(z - (z0 + h - 0.8)) < 0.5 or abs(z - (z0 + 0.8)) < 0.5:
            return ton(FER, s)
        return ton(BOIS[1:], s)
    cylindre(t, 0, 0, 3, z0, z0 + h, flanc, 'seau')
    disque(t, 0, 0, 0, 2.6, z0 + h - 0.6, lambda r, p, s: EAU[1] if r < 1.6 else BOIS[1], 'seau')
    z = z0 + h
    while z < ZT:
        t.point(0.2, 0, z, CORDE[1] if int(z) % 2 else CORDE[0], 'corde')
        z += 0.2


def poteaux(t):
    for x in (-RO + 1.2, RO - 1.2):
        cylindre(t, x, 0, 1.3, HM, ZT, lambda p, z, s: ton(BOIS, s), 'poteau')
    # la manivelle, à droite : un axe, puis le bras qui descend
    for i in range(12):
        t.point(RO + 0.2 + i * 0.25, 0, ZT - 6, FER[1], 'manivelle')
    for i in range(10):
        t.point(RO + 3, 0, ZT - 6 - i * 0.3, FER[0], 'manivelle')


def toit(t):
    # un cône de tuiles : NERVURES nervures plus sombres, des rangs tous les 4 px
    def relief(rho, phi):
        k = HR / R
        return HR * (1 - rho / R), (math.cos(phi) * k, math.sin(phi) * k, 1)

    def tuile(rho, phi, s):
        a = (phi * NERVURES / (2 * math.pi)) % 1
        if a < 0.07 or a > 0.97:
            return ton(TUILE, s, -2)
        if rho % 4 < 0.55:
            return ton(TUILE, s, -1)
        if rho < 1.2:
            return TUILE[1]
        return ton(TUILE, s * 0.9 + 0.1)
    disque(t, 0, 0, 0, R, ZT, tuile, 'toit', relief=relief)
    # l'épi du faîte
    cylindre(t, 0, 0, 1.2, ZT + HR - 0.5, ZT + HR + 2.5, lambda p, z, s: ton(TUILE, s, -1), 'epi')
    disque(t, 0, 0, 0, 1.2, ZT + HR + 2.5, lambda r, p, s: TUILE[-1], 'epi')


def tuyau(t):
    # de la pompe (à droite) jusqu'au-dessus de la margelle, puis il plonge dans l'eau
    xp, zh = 16.5, HM + 2
    x = RI - 2.5
    while x <= xp:
        for dz in (0, 0.5, 1):
            t.point(x, -1.5, zh + dz, TUYAU[2] if dz == 1 else TUYAU[1], 'tuyau')
        x += 0.2
    z = EAU_Z
    while z <= zh + 1:
        for dx in (0, 0.5, 1):
            t.point(RI - 2.5 + dx, -1.5, z, TUYAU[2] if dx == 0 else TUYAU[0], 'tuyau')
        z += 0.2


def pompe(t):
    # une pompe verticale sur un socle de béton : le corps de fonte en bas, le moteur vert debout
    # dessus (des cannelures), un manomètre rond en façade
    boite(t, 13.5, 23.2, -4.5, 3.5, 0, 1.5, lambda f, u, v, s: ton(BETON, s * 0.6 + 0.2), 'socle')
    cylindre(t, 18.5, -0.5, 3.4, 1.5, 6, lambda p, z, s: ton(FONTE, s * 0.8 + 0.2), 'corps')
    cylindre(t, 18.5, -0.5, 2.7, 6, 14, lambda p, z, s: ton(MOTEUR, s * 0.85 + 0.1, -1 if (p * 2.7 / 1.2) % 1 < 0.3 else 0), 'moteur')
    disque(t, 18.5, -0.5, 0, 2.7, 14, lambda r, p, s: ton(MOTEUR, 0.9 if r < 1.2 else 0.6), 'moteur')
    for i in range(60):
        a = 2 * math.pi * i / 60
        for rr in (0.3, 0.6, 0.9, 1.2):
            c = AIGUILLE if rr < 0.4 else CADRAN if rr < 1.1 else FONTE[0]
            t.point(15.4 + rr * 1.2 * math.cos(a), -4.2, 4 + rr * 1.2 * math.sin(a), c, 'manometre')


def image(sorte):
    t = Toile(W, H, X0, Y0, lies=[('toit', 'corde'), ('toit', 'epi'), ('socle', 'corps'), ('corps', 'moteur'), ('corps', 'manometre'), ('socle', 'moteur')])
    if sorte == 'pompe':
        pompe(t)
        return t.image()
    margelle(t)
    seau(t)
    poteaux(t)
    toit(t)
    if sorte == 'tuyau':
        tuyau(t)
    return t.image()


sheet = rangee([image(sorte) for sorte in ('puits', 'tuyau', 'pompe')], W, H)
sheet.save(os.path.join(ASSETS, 'puits.png'))
print('assets/puits.png : 3 images de', W, '×', H)
