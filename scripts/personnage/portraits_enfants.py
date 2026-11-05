# Les 50 enfants (enfant_01 à enfant_50) : leurs données sont dans le catalogue,
# assets/personnages/catalogue.json (voir scripts/personnage/catalogue.py), avec celles des adultes.
# scripts/personnage/modeles.py en tire les modèles de la carte (les planches assets/personnages/enfant_XX.png :
# chibi.py, dont la première case sert aussi de portrait).
#
#   coupe      : court, frange, meche, herisse, boucles, long, queue, couettes, chignon
#   couvre-chef: None, casquette, bonnet, paille, noeud, serre_tete, fleur
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import catalogue  # noqa: E402


def enfants():
    """Les 50 enfants : [(nom, description)]."""
    return catalogue.enfants()
