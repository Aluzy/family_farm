# L'abri de bus vu de profil (scripts/ville/equipements.py : abri_bus_profil), posé par le jeu
# sur le trottoir de la gare, en ville (js/ville-carte.js, NAVETTE) : assets/ville_abri_profil.png.
#   python3 scripts/ville/abri_profil.py
import os

from commun import ASSETS
import equipements as E

if __name__ == '__main__':
    chemin = os.path.join(ASSETS, 'ville_abri_profil.png')
    E.abri_bus_profil().save(chemin)
    print('écrit :', chemin)
