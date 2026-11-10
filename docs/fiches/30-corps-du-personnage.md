# Fiche 30 — Le corps du personnage : il ne mord plus dans les murs, il glisse dans les coins

Chantier « Phaser 4 », piste 6 du rapport.

## Objectif

Donner au personnage un vrai corps quand on le dirige au doigt : il ne rentre plus à moitié dans un mur ou
un tronc, il glisse le long des obstacles et passe les coins de justesse, et il démarre et s'arrête en
douceur comme quand il marche vers un but.

## Contexte

- Aucun moteur physique Phaser n'est chargé, et c'est voulu : le déplacement est cinématique sur une grille
  de cases de 16 px (`blocked`, un `Uint8Array` dans `js/fermier.js`), avec A* borné
  (`js/carte/chemins.js`) et un chemin tendu. Arcade apporterait des corps contre une couche de tuiles, mais
  le monde arrive par régions depuis le Worker et ne vit pas dans un Tilemap Phaser ; Matter serait
  surdimensionné. (Le rapport proposait Arcade pour la grotte de la mine : la mine n'est plus,
  `docs/gisements.md`.)
- `js/fermier.js` :
  - `walkTo` (vers la ligne 308) vérifie la ligne avec des épaules (`EPAULES` = 3 px de chaque côté, ligne
    153) et monte en vitesse (`Math.min(1, 0.4 + age * 3)`, ligne 334) ;
  - `steerTo` / `stepSteer` (vers les lignes 716 à 760, la manette au doigt, `CarteKit.manette`) ne testent
    que la case des pieds (`freeAt`, `cellOf`, ligne 146) : le corps peut entrer de moitié dans un
    obstacle ; il démarre et s'arrête net ; bloqué en diagonale, il essaie l'axe x puis l'axe y, et contre
    un coin il reste coincé.
- La marche des personnages : fiche 20 (`docs/fiches/20-la-marche.md`), `CarteKit.FOULEE`.
- La famille ne traverse pas les murs : fiche 16.
- Les tests de la marche : `tests/engine/marche.test.mjs` (images du pas) ; la logique de `fermier.js` est
  un script classique : la tester par une fonction pure extraite (ci-dessous).

## À faire

1. Extraire dans le kit (`js/carte/corps.js`, script classique qui s'ajoute à `CarteKit` ; testé en Node
   en le chargeant dans une fausse `window`, comme `js/carte/kit.js` dans `tests/engine/marche.test.mjs`)
   une fonction pure `deplacer(corps, dx, dy, libre)` : le corps est une boîte
   de 8 × 4 px aux pieds (ou un cercle de rayon 4 : choisir et dire pourquoi), testé contre toutes les
   cases qu'il chevauche ; résolution axe par axe avec la profondeur de pénétration, puis glissement le
   long de l'obstacle.
2. **La correction de coin** : si moins de 4 px du corps dépassent d'un coin, une petite poussée latérale
   le fait passer (le geste classique des jeux vus de dessus).
3. **Accélération et freinage communs** à `walkTo` et `stepSteer` (de 0 à la vitesse en ≈ 120 ms, arrêt
   en ≈ 80 ms), intégrés avec le même `dt` que le reste (borné à 50 ms).
4. `stepSteer` utilise `deplacer` ; `walkTo` garde son chemin (A*) mais ses pas passent aussi par le corps.
   Le cheval (`js/carte/cheval.js`) : un corps plus large, à régler.
5. Des tests Node de `deplacer` : contre un mur droit (glisse), dans un coin rentrant (s'arrête), sur un
   coin saillant à 2 px (passe), à 6 px (ne passe pas), en diagonale contre un tronc d'une case.

## Hors périmètre

- La séparation entre acteurs (les bêtes, la famille, les habitants qui ne se marchent pas dessus) : elle
  demande la grille spatiale du socle des comportements (fiche 31).
- Le chemin A* et ses bornes.

## Critères d'acceptation

- Dirigé au doigt contre un mur, un tronc, une clôture, un bloc d'eau : aucune image où ses pieds dépassent
  dans l'obstacle (captures image par image dans Chromium, `deviceScaleFactor: 1`).
- Il passe une porte d'une case de large en arrivant de biais, sans rester accroché au chambranle.
- Il ne traverse rien qu'il ne traversait pas (tests et parcours de `node tests/smoke.mjs`).
- Le démarrage et l'arrêt se voient doux, sans glissade au-delà de 2 px après le lâcher du doigt.

## Vérifications

`npm run build`, `npm test`, `node tests/smoke.mjs` ; Chromium, la manette au doigt simulée (gestes de
`js/carte/gestes.js`) le long des murs d'une maison construite et dans le bois ; avant tout réglage qui se
voit (vitesses, boîte), proposer deux ou trois réglages filmés (GIF) et faire choisir.

## Livraison

Un commit ; `docs/personnage.md` (le corps, le coin, l'accélération) mis à jour.
