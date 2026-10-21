# Les 50 enfants (enfant_01 à enfant_50). Données seulement : scripts/personnage/modeles.py en
# tire les modèles de la carte (les planches assets/personnages/enfant_XX.png : chibi.py, dont la
# première case sert aussi de portrait). Les couleurs de peau, de cheveux, d'habits
# et d'accessoires sont celles du catalogue des adultes (scripts/personnage/catalogue.py).
#
#   coupe      : court, frange, meche, herisse, boucles, long, queue, couettes, chignon
#   couvre-chef: None, casquette, bonnet, paille, noeud, serre_tete, fleur
#   détails    : lunettes, rousseur, joues, pansement, salopette (séparés par des virgules)
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import catalogue  # noqa: E402


# ---------- les 50 enfants ----------
# (peau, cheveux, coupe, couvre-chef, couleur de l'accessoire, détails, habit, motif)
ENFANTS = [
    ('claire', 'chatains', 'frange', None, None, '', 'vert', None),
    ('tres_claire', 'blonds', 'couettes', None, 'rose', 'rousseur', 'rose', 'pois'),
    ('mate', 'noirs', 'court', 'casquette', 'rouge', '', 'blanc', None),
    ('foncee', 'noirs', 'boucles', None, None, '', 'jaune', None),
    ('claire', 'roux', 'herisse', None, None, 'rousseur', 'jean', 'rayures'),
    ('rosee', 'blonds', 'queue', None, 'violet', 'joues', 'lilas', None),
    ('olive', 'chocolat', 'meche', None, None, 'pansement', 'kaki', None),
    ('tres_foncee', 'noirs', 'couettes', None, 'jaune', '', 'orange', 'pois'),
    ('claire', 'platine', 'court', None, None, 'lunettes', 'marine', None),
    ('mate', 'bruns', 'court', 'bonnet', 'rouge', '', 'vert', 'rayures'),
    ('tres_claire', 'auburn', 'chignon', None, None, 'joues', 'bordeaux', None),
    ('foncee', 'chocolat', 'court', 'paille', 'bleu', 'salopette', 'jaune', None),
    ('rosee', 'roses', 'couettes', 'noeud', 'blanc', '', 'ciel', 'pois'),
    ('claire', 'bruns', 'herisse', None, None, 'pansement', 'rouge', 'carreaux'),
    ('olive', 'noirs', 'long', 'serre_tete', 'rouge', '', 'turquoise', None),
    ('mate', 'roux', 'frange', None, None, 'lunettes', 'lilas', None),
    ('tres_foncee', 'chocolat', 'boucles', 'fleur', 'jaune', '', 'vert', None),
    ('claire', 'roux', 'meche', None, None, 'rousseur', 'carreaux', 'carreaux'),
    ('tres_claire', 'blonds', 'long', 'paille', 'rose', '', 'blanc', None),
    ('foncee', 'bleus', 'herisse', None, None, '', 'noir', None),
    ('rosee', 'chatains', 'queue', 'bonnet', 'vert', 'rousseur', 'jaune', None),
    ('claire', 'noirs', 'frange', 'fleur', 'rouge', '', 'rouge', None),
    ('mate', 'chatains', 'court', 'casquette', 'bleu', 'salopette', 'orange', None),
    ('olive', 'auburn', 'couettes', None, 'vert', 'joues', 'kaki', 'rayures'),
    ('tres_claire', 'chatains', 'court', None, None, 'lunettes', 'marine', 'rayures'),
    ('foncee', 'noirs', 'chignon', 'noeud', 'rose', '', 'rose', None),
    ('claire', 'chocolat', 'long', 'serre_tete', 'jaune', '', 'jean', 'pois'),
    ('mate', 'roux', 'boucles', None, None, 'rousseur', 'vert', None),
    ('tres_foncee', 'noirs', 'court', None, None, 'pansement', 'marron', None),
    ('rosee', 'platine', 'chignon', 'fleur', 'rose', '', 'ciel', None),
    ('claire', 'bruns', 'meche', 'casquette', 'vert', '', 'orange', 'rayures'),
    ('olive', 'noirs', 'queue', None, 'rouge', 'lunettes', 'bordeaux', None),
    ('foncee', 'chocolat', 'herisse', 'bonnet', 'gris', '', 'kaki', None),
    ('tres_claire', 'roux', 'couettes', None, 'vert', 'rousseur', 'vert', 'carreaux'),
    ('mate', 'verts', 'court', None, None, '', 'noir', None),
    ('claire', 'blonds', 'herisse', 'paille', 'rouge', 'salopette', 'blanc', None),
    ('tres_foncee', 'noirs', 'boucles', 'serre_tete', 'orange', '', 'turquoise', None),
    ('rosee', 'auburn', 'long', None, None, 'joues', 'rose', 'pois'),
    ('claire', 'noirs', 'court', None, None, 'lunettes', 'rouge', None),
    ('olive', 'blonds', 'couettes', 'paille', 'vert', '', 'rouge', 'carreaux'),
    ('mate', 'auburn', 'frange', 'noeud', 'violet', '', 'lilas', None),
    ('foncee', 'roux', 'long', None, None, 'rousseur', 'ciel', None),
    ('tres_claire', 'chatains', 'meche', 'casquette', 'jaune', 'lunettes', 'kaki', None),
    ('claire', 'platine', 'chignon', None, None, 'joues', 'lilas', None),
    ('mate', 'roses', 'queue', None, 'blanc', '', 'turquoise', 'rayures'),
    ('tres_foncee', 'chocolat', 'couettes', 'fleur', 'blanc', '', 'jaune', None),
    ('rosee', 'bruns', 'boucles', None, None, 'pansement', 'vert', 'pois'),
    ('olive', 'noirs', 'herisse', 'bonnet', 'bleu', '', 'jean', None),
    ('claire', 'auburn', 'long', 'paille', 'violet', 'rousseur', 'lilas', None),
    ('foncee', 'blonds', 'frange', 'serre_tete', 'rouge', 'salopette', 'blanc', 'rayures'),
]
SPECIAL = {'carreaux': ('rouge', 'carreaux')}


def enfants():
    """Les 50 enfants : [(nom, description)]."""
    out = []
    for i, (peau, cheveux, coupe, chap, acc, details, habit, m) in enumerate(ENFANTS):
        if habit in SPECIAL:
            habit, impose = SPECIAL[habit]
            m = m or impose
        out.append((f'enfant_{i + 1:02d}', {
            'peau': peau, 'cheveux': cheveux, 'coupe': coupe, 'chapeau': chap,
            'accessoire': catalogue.ACCESSOIRES[acc or 'rouge'], 'details': [d for d in details.split(',') if d],
            'habit': habit, 'motif': m, 'bas': catalogue.BAS[i % len(catalogue.BAS)],
        }))
    return out
