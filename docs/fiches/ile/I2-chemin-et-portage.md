# Fiche I2 — Le chemin du port, modifiable, et le portage

## Objectif

Faire du chemin de la ferme au port un ouvrage du joueur : les cases du tronçon généré deviennent des
blocs de chemin qu'il possède, qu'il retire, déplace et prolonge, sur la ferme comme sur l'île. Et
donner un sens au trajet : ce qu'on porte au port a un volume.

## Contexte

- `docs/ile.md` (D8). I1a (le chemin tracé jusqu'au port), I1b (la vente sous la halle).
- Les chemins générés : `js/engine/monde-gen.js` (les chemins du plan), `js/engine/monde-sol.js` (le
  sol, `caseMarchable`), `js/carte/chemins.js`, `scripts/carte/bord_chemin.py`, `herbe_chemin.py`,
  la fiche 15 (les bords des chemins).
- Les blocs : `js/engine/blocs.js` (`poserBloc`, `caseBatissable` : seulement sur la ferme
  aujourd'hui), le bloc `chemin` de `DATA.ATELIER.BLOCS`, `js/ui/chantier.js` (le mode Construire),
  `js/carte/ferme/chantier.js`.
- La marche et le cheval : `js/fermier.js`, `js/carte/cheval.js`, `js/engine/cheval.js`
  (`CHEVAL.VITESSE`), `js/engine/stamina.js`.
- Le sac : `js/engine/equipement.js` (le sac à provisions), `js/engine/inventory.js`.

## À faire

1. **Le chemin possédé** : dans une partie `ACTIF`, les cases du tronçon ferme → port sont des blocs
   de chemin du joueur (posés à la création de la partie, gardés dans la sauvegarde sous une forme
   compacte : des segments, pas une case par ligne). Le sol du monde ne les peint plus lui-même.
2. **Bâtir hors de la ferme** : le mode Construire accepte, sur l'île, les blocs d'une liste réglée
   (`VILLAGE.DEHORS` : chemin, pas japonais, lanterne, réverbère, pont de planches, barrière, banc).
   Pas de mur ni de maison hors de la terre du joueur dans cette fiche. On ne bâtit ni dans l'eau
   profonde, ni sur une falaise, ni dans l'emprise du port.
3. **L'effet du chemin** : on y marche plus vite (`VILLAGE.CHEMIN.VITESSE`, en %), à pied et à
   cheval ; un pont de planches fait passer une rivière. La carte du monde dessine les chemins
   posés.
4. **Le portage** : chaque objet a un volume (un par défaut ; `VILLAGE.PORTAGE.VOLUMES` pour les
   lourds : bois, pierre, lingots). Le joueur porte `PORTAGE.MAINS` volumes ; la **brouette** et la
   **charrette** (Atelier ; la charrette s'attelle au cheval) en portent davantage. On charge sur la
   ferme, on décharge sous la halle. Rien n'est perdu si l'on dépasse : le surplus reste au coffre.
5. **Le joueur automatique** : sa sortie au port compte la capacité et le temps du trajet.
6. **Les dessins** (45°) : la brouette, la charrette attelée (4 directions, d'après
   `scripts/carte/caleche.py`), le pont de planches.
7. **La sauvegarde** : les chemins posés hors de la ferme, la brouette et la charrette ; format + 1,
   migration, test. Une partie d'avant garde ses chemins générés tels quels (I7f les convertira).
8. **Les tests** (`village-chemin.test.mjs`) : le tronçon devient des blocs ; poser et retirer hors
   de la ferme ; les refus (eau, falaise, port) ; la vitesse sur chemin ; les capacités de portage ;
   la forme compacte de la sauvegarde.

## Hors périmètre

- Retirer les boucles vers les hameaux (I7e). Un villageois qui fait la navette (I3c).
- Bâtir des maisons hors de la terre du joueur.

## Critères d'acceptation

- Dans Chromium : on retire dix cases du chemin et on les repose ailleurs ; on pose un pont ; on va
  plus vite sur le chemin ; la charrette attelée porte une grosse récolte au port en un voyage.
- La taille de la sauvegarde avec 600 cases de chemin posées : mesurée, donnée.

## Vérifications et livraison

Celles du README du chantier. Captures : le chemin redessiné, le pont, la brouette, la charrette au
port, la carte du monde.
