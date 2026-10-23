#!/usr/bin/env python3
"""Les planches des animaux de compagnie de la carte de la ferme (js/ambient-life.js).

Chaque planche est une rangée de 8 cases de 16 × 16, l'animal de profil tourné vers la droite,
dans l'ordre de CAT_FRAMES : idle, marche0, marche1, assis, leche (le chien : il halète), couche,
boule0, boule1. Le premier chat est assets/chat.png (dessiné à la main) ; ce script en tire deux
autres robes (chat_2 : gris tigré, chat_3 : noir et blanc) en changeant ses couleurs, et dessine
le chien en trois robes (chien : brun, chien_2 : noir et blanc, chien_3 : sable).

    python3 scripts/compagnons/compagnons.py            # écrit les planches dans assets/
    python3 scripts/compagnons/compagnons.py --apercu   # et assets/../apercu_compagnons.png
"""
import sys
from pathlib import Path
from PIL import Image

RACINE = Path(__file__).resolve().parents[2]
ASSETS = RACINE / 'assets'
CASE = 16

# Les couleurs de chat.png (palette indexée) et leurs remplaçantes pour chaque robe.
CHAT = {
    'contour': (42, 21, 33), 'clair': (209, 159, 75), 'rayure': (162, 75, 30),
    'creme': (226, 214, 196), 'pelage': (207, 113, 40), 'pattes': (160, 125, 91),
}
ROBES_CHAT = {
    'chat_2': {  # gris tigré
        'contour': (34, 30, 40), 'clair': (176, 180, 188), 'rayure': (88, 92, 104),
        'creme': (232, 232, 228), 'pelage': (138, 143, 153), 'pattes': (120, 122, 130),
    },
    'chat_3': {  # noir et blanc
        'contour': (18, 16, 24), 'clair': (78, 76, 90), 'rayure': (36, 35, 44),
        'creme': (242, 240, 234), 'pelage': (50, 49, 60), 'pattes': (232, 230, 224),
    },
}

# Le chien : o contour, k œil et truffe, b pelage, l clair (museau, ventre), d foncé (oreille), t langue.
TETE = [
    "..........oooo..",
    ".........odbbbo.",
    "........odbkbbbo",
    "........odbbbllk",
    "........odbblloo",
]


def debout(queue, pattes):
    return ["................"] * 3 + [
        TETE[0], TETE[1],
        queue[0] + TETE[2][3:],
        queue[1] + TETE[3][3:],
        queue[2] + TETE[4][3:],
        ".obooooooddbllo.",
        "..obbbbbbbbblo..",
        "..obbbbbbbbblo..",
        "..obbbbbbbbbbo..",
        "..oblllllllblo..",
    ] + pattes


QUEUE_HAUT = [".o.", "obo", "obo"]
QUEUE_BAS = ["...", "oo.", "obo"]
ASSIS = [
    "................",
    "................",
    "..........oooo..",
    ".........odbbbo.",
    "........odbkbbbo",
    "........odbbbllk",
    "........odbblloo",
    ".......obddblo..",
    "......obbbbblo..",
    "......obbbbllo..",
    ".....obbbbbllo..",
    ".oo..obbbbbllo..",
    "obbo.obbbbbllo..",
    ".obbbobbbbobllo.",
    "..obbbbbbbobllo.",
    "...ooookoookoko.",
]
HALETE = ASSIS[:6] + [
    "........odbbloko",
    ".......obddbltt.",
    "......obbbbblot.",
] + ASSIS[9:]
VIDE = ["................"]
CHIEN = [
    debout(QUEUE_HAUT, ["..obo.obo.obo...", "..obo.obo.obo...", "..oko.oko.oko..."]),   # idle
    debout(QUEUE_HAUT, ["..obo..obo.obo..", ".obo...obo..obo.", ".oko...oko...oko"]),   # marche0
    debout(QUEUE_BAS, ["...obo.obo.obo..", "...obo..obo.obo.", "...oko..oko.oko."]),    # marche1
    ASSIS,
    HALETE,                                                                             # (la case « leche »)
    VIDE * 8 + [                                                                        # couche
        "..........oooo..",
        ".........odbbbo.",
        ".o......odbkbbbo",
        "obo.oooodbbbbllk",
        ".oobbbbbbdbblloo",
        "..obbbbbbbbbllo.",
        ".oblllllllllllo.",
        "..oooooooooooo..",
    ],
    VIDE * 10 + [                                                                       # boule0
        ".....oooooo.....",
        "...oobbbbbdoo...",
        "..obbbbbbbddbo..",
        ".obbbbbbbbdbklo.",
        ".obblllbbbbbllo.",
        "..oooooooooooo..",
    ],
    VIDE * 9 + [                                                                        # boule1 (il respire)
        ".....oooooo.....",
        "...oobbbbbdoo...",
        "..obbbbbbbddbo..",
        ".obbbbbbbbdbbo..",
        ".obbbbbbbbdbklo.",
        ".obblllbbbbbllo.",
        "..oooooooooooo..",
    ],
]
ROBES_CHIEN = {
    'chien': {'o': (42, 21, 33), 'k': (42, 21, 33), 'b': (160, 100, 55), 'l': (226, 200, 150), 'd': (110, 62, 35), 't': (214, 96, 110)},     # brun
    'chien_2': {'o': (20, 18, 26), 'k': (20, 18, 26), 'b': (54, 52, 62), 'l': (238, 236, 228), 'd': (32, 30, 38), 't': (214, 96, 110)},     # noir et blanc
    'chien_3': {'o': (58, 34, 20), 'k': (42, 21, 33), 'b': (222, 184, 120), 'l': (246, 232, 204), 'd': (186, 140, 82), 't': (214, 96, 110)},  # sable
}


def chats():
    base = Image.open(ASSETS / 'chat.png')
    pal = base.getpalette()
    out = {}
    for nom, robe in ROBES_CHAT.items():
        im = base.copy()
        p = list(pal)
        for i in range(len(p) // 3):
            rgb = tuple(p[3 * i:3 * i + 3])
            for role, ancien in CHAT.items():
                if rgb == ancien:
                    p[3 * i:3 * i + 3] = robe[role]
        im.putpalette(p)
        out[nom] = im
    return out


def chiens():
    out = {}
    for nom, robe in ROBES_CHIEN.items():
        im = Image.new('RGBA', (CASE * len(CHIEN), CASE), (0, 0, 0, 0))
        for i, case in enumerate(CHIEN):
            assert len(case) == CASE, (nom, i, len(case))
            for y, ligne in enumerate(case):
                assert len(ligne) == CASE, (nom, i, y, ligne)
                for x, c in enumerate(ligne):
                    if c != '.':
                        im.putpixel((i * CASE + x, y), robe[c] + (255,))
        out[nom] = im
    return out


def main():
    planches = {**chats(), **chiens()}
    for nom, im in planches.items():
        im.save(ASSETS / f'{nom}.png', optimize=True)
        print(f'assets/{nom}.png')
    if '--apercu' in sys.argv:
        noms = ['chat'] + list(planches)
        ap = Image.new('RGBA', (CASE * 8 * 8, CASE * len(noms) * 8 + 8 * len(noms)), (120, 170, 90, 255))
        for j, nom in enumerate(noms):
            im = Image.open(ASSETS / f'{nom}.png').convert('RGBA').resize((CASE * 8 * 8, CASE * 8), Image.NEAREST)
            ap.alpha_composite(im, (0, j * (CASE * 8 + 8)))
        ap.save(RACINE / 'apercu_compagnons.png')
        print('apercu_compagnons.png')


if __name__ == '__main__':
    main()
