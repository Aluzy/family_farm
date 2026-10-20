# Les 50 personnages du catalogue (perso_01 à perso_50), dérivés du portrait modèle.
# Données seulement : scripts/personnage/portraits.py en tire les portraits 32 × 32
# (assets/portraits/perso_XX.png), scripts/personnage/fermier.py les planches de la carte
# (assets/personnages/perso_XX.png).
#
# Une entrée : (peau, cheveux, coupe, couvre-chef, couleur de l'accessoire, détails, habit, motif)
#   coupe      : longs, mi, carre, courts, frange, frange_carre, couettes, chignon, chauve
#   couvre-chef: None, paille, casquette, bonnet, beret, bandeau, fleur
#   détails    : barbe, moustache, lunettes, rousseur, boucles (séparés par des virgules)
#   motif      : None, rayures, carreaux, pois (un habit de SPECIAL impose le sien)

PEAU = {
    'tres_claire': {'e': (252, 226, 208), 'f': (246, 208, 182), 'j': (206, 162, 134), 'k': (236, 150, 130)},
    'claire': {'e': (246, 214, 190), 'f': (240, 196, 160), 'j': (196, 150, 118), 'k': (232, 150, 120)},
    'rosee': {'e': (250, 210, 196), 'f': (236, 180, 160), 'j': (196, 132, 116), 'k': (224, 120, 110)},
    'mate': {'e': (218, 166, 120), 'f': (198, 142, 96), 'j': (150, 100, 64), 'k': (200, 110, 80)},
    'olive': {'e': (214, 178, 130), 'f': (190, 152, 104), 'j': (140, 108, 70), 'k': (196, 112, 84)},
    'foncee': {'e': (150, 100, 66), 'f': (124, 80, 50), 'j': (88, 54, 32), 'k': (170, 84, 66)},
    'tres_foncee': {'e': (110, 72, 50), 'f': (88, 56, 38), 'j': (60, 36, 24), 'k': (140, 70, 56)},
}
CHEVEUX = {
    'gris': {'b': (200, 200, 194), 'c': (150, 150, 146), 'd': (112, 112, 108)},
    'noirs': {'b': (60, 52, 48), 'c': (36, 30, 28), 'd': (24, 20, 18)},
    'roux': {'b': (206, 104, 44), 'c': (160, 70, 28), 'd': (120, 50, 20)},
    'blonds': {'b': (236, 200, 104), 'c': (196, 154, 64), 'd': (150, 112, 40)},
    'bruns': {'b': (110, 70, 36), 'c': (74, 46, 22), 'd': (54, 34, 16)},
    'chatains': {'b': (135, 96, 44), 'c': (79, 58, 30), 'd': (67, 48, 21)},
    'platine': {'b': (246, 236, 200), 'c': (210, 196, 150), 'd': (170, 154, 110)},
    'blancs': {'b': (240, 240, 236), 'c': (200, 200, 196), 'd': (160, 160, 156)},
    'auburn': {'b': (150, 64, 40), 'c': (110, 40, 26), 'd': (80, 28, 18)},
    'roses': {'b': (236, 140, 176), 'c': (196, 96, 136), 'd': (150, 64, 100)},
    'bleus': {'b': (96, 140, 220), 'c': (60, 96, 176), 'd': (40, 64, 130)},
    'verts': {'b': (110, 176, 110), 'c': (70, 130, 76), 'd': (46, 96, 52)},
    'chocolat': {'b': (90, 56, 36), 'c': (62, 38, 24), 'd': (44, 26, 16)},
}
HABITS = {
    'rouge': {'l': (70, 18, 14), 'm': (150, 42, 34), 'n': (206, 74, 58)},
    'jean': {'l': (18, 30, 56), 'm': (58, 88, 140), 'n': (98, 134, 190)},
    'jaune': {'l': (80, 60, 10), 'm': (206, 160, 40), 'n': (246, 214, 96)},
    'lilas': {'l': (56, 30, 66), 'm': (150, 110, 172), 'n': (204, 174, 224)},
    'orange': {'l': (84, 36, 10), 'm': (196, 102, 40), 'n': (238, 148, 74)},
    'vert': {'l': (36, 52, 22), 'm': (136, 169, 108), 'n': (185, 231, 146)},
    'marine': {'l': (14, 20, 44), 'm': (36, 52, 104), 'n': (64, 86, 150)},
    'rose': {'l': (80, 24, 50), 'm': (200, 100, 140), 'n': (240, 160, 190)},
    'blanc': {'l': (70, 70, 70), 'm': (200, 200, 196), 'n': (244, 244, 238)},
    'noir': {'l': (10, 10, 12), 'm': (40, 40, 46), 'n': (70, 70, 80)},
    'turquoise': {'l': (14, 60, 60), 'm': (40, 150, 150), 'n': (100, 210, 200)},
    'marron': {'l': (50, 30, 16), 'm': (120, 80, 48), 'n': (166, 118, 74)},
    'kaki': {'l': (44, 46, 20), 'm': (110, 116, 60), 'n': (156, 160, 96)},
    'bordeaux': {'l': (50, 10, 20), 'm': (120, 30, 50), 'n': (170, 56, 76)},
    'ciel': {'l': (30, 60, 90), 'm': (110, 160, 210), 'n': (170, 210, 240)},
}
# habits qui imposent leur motif
SPECIAL = {
    'rayures_bm': ('marine', 'rayures'), 'carreaux_vert': ('vert', 'carreaux'),
    'bleu_ouvrier': ('jean', None), 'carreaux_bleu': ('jean', 'carreaux'),
}
ACCESSOIRES = {
    'rouge': (196, 52, 44), 'bleu': (54, 96, 180), 'vert': (60, 130, 70), 'jaune': (236, 196, 60),
    'rose': (232, 120, 170), 'noir': (40, 40, 46), 'gris': (130, 130, 138), 'blanc': (240, 240, 232),
    'orange': (232, 128, 50), 'violet': (130, 80, 170), 'brun': (110, 72, 40),
}
# le bas (salopette ou pantalon), en alternance d'un personnage à l'autre
BAS = [
    ((63, 111, 168), (44, 79, 124)),     # salopette bleue
    ((120, 84, 52), (88, 60, 36)),       # brun
    ((90, 90, 104), (64, 64, 76)),       # gris
    ((52, 56, 70), (36, 38, 50)),        # sombre
    ((84, 120, 60), (60, 90, 42)),       # vert
]

ENTREES = [
    ('claire', 'chatains', 'frange', None, None, '', 'vert', None),
    ('tres_claire', 'blonds', 'couettes', None, 'rose', 'rousseur', 'rose', 'pois'),
    ('mate', 'noirs', 'courts', 'casquette', 'rouge', '', 'blanc', None),
    ('foncee', 'noirs', 'chignon', None, None, 'boucles', 'jaune', None),
    ('claire', 'gris', 'chauve', None, None, 'moustache', 'marron', 'carreaux'),
    ('rosee', 'roux', 'longs', 'bandeau', 'vert', 'rousseur', 'blanc', None),
    ('olive', 'chocolat', 'courts', None, None, 'barbe', 'kaki', None),
    ('tres_foncee', 'noirs', 'carre', 'fleur', 'jaune', '', 'orange', None),
    ('claire', 'platine', 'carre', None, None, 'lunettes', 'noir', None),
    ('mate', 'bruns', 'courts', 'bonnet', 'rouge', '', 'marine', 'rayures'),
    ('tres_claire', 'auburn', 'chignon', None, None, 'lunettes', 'bordeaux', None),
    ('foncee', 'gris', 'courts', 'paille', 'bleu', 'barbe', 'jean', None),
    ('rosee', 'roses', 'couettes', None, 'blanc', '', 'ciel', 'pois'),
    ('claire', 'bruns', 'courts', 'beret', 'noir', 'moustache', 'rayures_bm', None),
    ('olive', 'noirs', 'longs', None, None, '', 'turquoise', None),
    ('mate', 'blancs', 'chignon', None, None, 'lunettes', 'lilas', 'pois'),
    ('tres_foncee', 'chocolat', 'courts', 'casquette', 'jaune', '', 'vert', None),
    ('claire', 'roux', 'courts', None, None, 'barbe', 'carreaux_vert', None),
    ('tres_claire', 'blonds', 'longs', 'paille', 'rose', '', 'blanc', None),
    ('foncee', 'bleus', 'frange_carre', None, None, 'boucles', 'noir', None),
    ('rosee', 'chatains', 'mi', 'bonnet', 'vert', 'rousseur', 'jaune', None),
    ('claire', 'noirs', 'frange', 'fleur', 'rouge', '', 'rouge', None),
    ('mate', 'gris', 'chauve', None, None, 'barbe', 'bleu_ouvrier', None),
    ('olive', 'auburn', 'couettes', None, 'vert', '', 'kaki', 'rayures'),
    ('tres_claire', 'blancs', 'courts', 'beret', 'rouge', 'lunettes', 'marine', None),
    ('foncee', 'noirs', 'couettes', None, 'jaune', '', 'rose', None),
    ('claire', 'chocolat', 'carre', 'bandeau', 'rouge', '', 'jean', 'pois'),
    ('mate', 'roux', 'longs', None, None, 'lunettes', 'vert', 'rayures'),
    ('tres_foncee', 'blancs', 'courts', None, None, 'moustache', 'marron', None),
    ('rosee', 'platine', 'chignon', 'fleur', 'rose', '', 'ciel', None),
    ('claire', 'bruns', 'longs', 'casquette', 'bleu', '', 'orange', None),
    ('olive', 'gris', 'carre', None, None, 'lunettes', 'bordeaux', 'pois'),
    ('foncee', 'chocolat', 'courts', 'bonnet', 'gris', 'barbe', 'kaki', None),
    ('tres_claire', 'roux', 'frange', None, None, 'rousseur', 'vert', 'carreaux'),
    ('mate', 'verts', 'mi', None, None, 'boucles', 'noir', None),
    ('claire', 'blonds', 'courts', 'paille', 'rouge', 'rousseur', 'jean', None),
    ('tres_foncee', 'noirs', 'chignon', 'bandeau', 'orange', '', 'turquoise', None),
    ('rosee', 'gris', 'mi', None, None, 'lunettes', 'rose', 'pois'),
    ('claire', 'noirs', 'courts', None, None, 'barbe', 'noir', None),
    ('olive', 'blonds', 'couettes', 'paille', 'vert', '', 'rouge', 'carreaux'),
    ('mate', 'auburn', 'frange_carre', 'beret', 'violet', '', 'lilas', None),
    ('foncee', 'roux', 'longs', None, None, 'rousseur', 'ciel', None),
    ('tres_claire', 'chatains', 'courts', 'casquette', 'vert', 'lunettes', 'kaki', None),
    ('claire', 'blancs', 'chauve', 'paille', 'brun', 'barbe', 'carreaux_bleu', None),
    ('mate', 'roses', 'courts', None, None, 'boucles', 'turquoise', 'rayures'),
    ('tres_foncee', 'gris', 'carre', 'fleur', 'blanc', 'lunettes', 'jaune', None),
    ('rosee', 'bruns', 'chignon', None, None, '', 'vert', 'pois'),
    ('olive', 'noirs', 'courts', 'bonnet', 'bleu', 'moustache', 'jean', None),
    ('claire', 'auburn', 'longs', 'paille', 'violet', '', 'lilas', None),
    ('foncee', 'blonds', 'frange', 'bandeau', 'rouge', 'boucles', 'blanc', 'rayures'),
]


def fonce(c, k=0.72):
    return tuple(int(v * k) for v in c)


def personnages():
    """Les 50 personnages : [(nom, description)], description = dict lisible."""
    out = []
    for i, (peau, cheveux, coupe, chap, acc, details, habit, motif) in enumerate(ENTREES):
        if habit in SPECIAL:
            habit, impose = SPECIAL[habit]
            motif = motif or impose
        out.append((f'perso_{i + 1:02d}', {
            'peau': peau, 'cheveux': cheveux, 'coupe': coupe, 'chapeau': chap,
            'accessoire': ACCESSOIRES[acc or 'rouge'], 'details': [d for d in details.split(',') if d],
            'habit': habit, 'motif': motif, 'bas': BAS[i % len(BAS)],
        }))
    return out
