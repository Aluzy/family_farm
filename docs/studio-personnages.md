# Studio de personnages — Règles, gabarits Piskel, vérificateur et assemblage (Étapes 1 à 4)

Ce document accompagne `data/studio-personnages.json` et le module **🧑 Personnages** intégré dans `worker/src/sprites.html`.

## 1. Décisions validées

- **Éditeur cible** : **Piskel** (export natif de projets `.piskel` à 3 calques séparés + palette `.gpl` + PNG `48 × 48 px`).
- **Dimensions de référence** : `22 × 39 px` pour l'adulte (femme/homme) et `18 × 30 px` pour l'enfant dans des cases de `48 × 48 px` (pieds en `y = 47`, axe médian de la tête en `x = 24`, échelle en jeu `25 / 39 = 0.641`).
- **Tronc commun adulte (`adulte_`)** : tête, membres (5 positions de bras, 6 positions de jambes), visage, coiffures, chaussures et outils sont communs ; seuls le buste et les vêtements ajustés portent `femme_` ou `homme_`.
- **Profil** : dessiné tourné vers la **droite** dans Piskel, retourné automatiquement vers la **gauche** lors de l'export de la planche Phaser (`*_cote_*`).
- **Nommage** : `<corps>_<vue>_<piece>_<variante>[_<position>].png`.

## 2. Utilisation des gabarits `.piskel` (Étape 2)

1. Ouvrir `worker/src/sprites.html` (ou `/admin/sprites`) et basculer le commutateur d'en-tête sur **🧑 Personnages**.
2. Télécharger une fois **🎨 Palette Piskel (`.gpl`)** et l'importer dans Piskel.
3. Choisir une pièce du filtre **⭐ Jeu minimal Femme** et cliquer sur **🎨 Projet `.piskel` (3 calques)** :
   - **Calque 1 (`1_guide_essai_hd`)** : silhouette fantôme de `essai_hd.png` + cadre du segment (à masquer ou supprimer avant d'exporter le PNG depuis Piskel).
   - **Calque 2 (`2_points_attache`)** : pixels d'attache exacts (`#FF00FF` cou, `#00FFFF` épaule proche, `#00B4FF` épaule lointaine, `#FFFF00` hanche proche, `#CCA800` hanche lointaine, `#FF8000` prise main, `#00FF66` yeux, `#A066FF` nez, `#FF3366` bouche) — à conserver sur le PNG exporté.
   - **Calque 3 (`3_dessin_piece`)** : calque vierge sur lequel peindre avec les 4 tons réservés de la zone.

## 3. Importer et vérifier les pièces (Étape 3)

Sous-onglet **📥 2. Import & Vérif.** : déposer un ou plusieurs PNG exportés de Piskel. Chaque fichier passe par
`verifierEtExtrairePiece()`, qui le refuse au moindre écart :

- **le nom** suit le motif de nommage, la pièce est connue (`tete`, `buste`, `bras-proche`, `jambes`, `yeux`,
  `couvre-chef`, `outil`…) et la position est permise pour elle ; le visage (`yeux`, `nez`, `bouche`, `sourcils`,
  `pilosite`, `lunettes`) n'existe pas en vue `dos` ;
- **la taille** est exactement `48 × 48 px` ;
- **aucun pixel semi-transparent** (α vaut 0 ou 255 : pas d'anticrénelage) ;
- **aucune couleur dérivée** : une couleur à moins de 14 (écart RGB) d'un ton réservé, ou à moins de 18 d'une couleur
  d'attache, sans lui être égale (profil colorimétrique, export retouché) ; le contour `#2B1D14` et le blanc de
  l'œil `#FAF6F0` sont permis ;
- **chaque point d'attache requis** pour la pièce et la vue est présent, sur **un seul pixel** ;
- `#00FF00` n'est permis que sur un couvre-chef (c'est son masque de coupe des cheveux).

Une pièce acceptée a ses pixels d'attache relevés puis effacés du dessin (un point posé au milieu de la matière est
rebouché par la couleur voisine), et entre dans la **bibliothèque des pièces validées**, qu'on exporte et recharge en
`.json` (`format: moon-bloom-biblio-personnages`). Les deux boutons du banc d'essai soumettent 3 pièces conformes
et les 4 refus typiques (mauvaise taille, pixel semi-transparent, ton dérivé, attache oubliée).

## 4. Assembler et exporter les 111 cases (Étape 4)

Sous-onglet **🎬 3. Assembler & 111 Cases** :

- **l'assemblage** se fait uniquement par décalages entiers sur les points d'attache (jamais de rotation ni de
  mise à l'échelle), dans l'ordre `ORDRE_COUCHES` de la vue, pour chacune des 111 poses de `POSES` (bras, jambes,
  décalages `dy_buste` / `dy_tete`, outil devant ou derrière, yeux ouverts ou fermés) ; l'outil est calé par son
  point `prise` sur celui du bras proche ; le masque `#00FF00` du couvre-chef efface les cheveux dessous ;
- **le jeu minimal démo** (bouton ✨, chargé tout seul s'il manque des pièces) dessine chaque pièce et la fait passer
  par le même vérificateur qu'un PNG de Piskel ; une pièce importée par le propriétaire n'est jamais remplacée ;
- **la recoloration** remplace les 4 tons réservés de chaque zone par la rampe choisie (dérivées des palettes de
  `assets/personnages/catalogue.json`) ;
- **le tirage à graine** (`fnv1a_32` + `mulberry32`, comme `js/carte/comportement.js`) donne toujours le même
  villageois pour la même graine ; « Villageois unique » tire jusqu'à une clé de diversité encore jamais vue ;
- **l'export** donne `essai_hd.png` (8 colonnes de cases 48 × 48, profils retournés vers la gauche) et
  `essai_hd.json` (`frameWidth: 48`, `frameHeight: 48`, `echelle: 0.641`, les 111 noms de `assets/fermier.json`).
  Posés dans `assets/personnages/`, ils remplacent la planche de `scripts/personnage/essai_hd.py` : le mode test
  « Personnage en essai » (`js/carte/ferme/modele.js`, `syncPerso`) lit la taille des cases et l'échelle dans le
  JSON avant de charger la planche.

## 5. Tenir la page et les règles d'accord

La page embarque sa copie des règles (`CFG`, `CASES_111`, `POSES_111`, `ORDRE_COUCHES`, `PROBA_CHAPEAU`) pour rester
100 % locale. `tests/engine/studio-personnages.test.mjs` vérifie qu'elle est identique à
`data/studio-personnages.json` : une règle changée dans le JSON se recopie dans `worker/src/sprites.html`.
