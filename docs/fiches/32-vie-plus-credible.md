# Fiche 32 — Une vie plus crédible : la faune, les bêtes de la ferme, les compagnons, les habitants

Chantier « Phaser 4 », piste 7 du rapport (ce que le socle permet). Dépend de la fiche 31. Changements
visibles : avant de coder, proposer pour chaque groupe deux ou trois réglages filmés (GIF) et faire
choisir ; un groupe par PR si c'est plus simple à relire.

## Objectif

Rendre les bêtes et les gens de la carte plus vivants, presque sans code de plus, grâce au socle de la
fiche 31.

## Contexte

- Le socle (fiche 31) : machine à états, perception et grille spatiale, pas commun, séparation douce.
- Les fichiers : `js/carte/ferme/faune-monde.js` (faune du monde), `js/ambient-life.js` (vie d'ambiance,
  compagnons, bêtes de l'Étable et du Poulailler), `js/carte/ferme/habitants.js` (habitants, `EVITE`),
  `js/famille-ferme.js` (famille), `js/carte/cheval.js` (le cheval, son allure).
- L'encyclopédie sait déjà quelles espèces ont été vues (`faune:<espèce>`, `state.encyclopedie`).
- La pluie : `pleut(state)` (`js/engine/meteo.js`) ; les compagnons rentrent déjà sous la pluie.

## À faire

**La faune du monde**

1. Un état **alerte** entre repos et fuite : tête levée, immobile 0,5 à 1 s ; la bête ne fuit que si le
   personnage continue d'approcher (hystérésis : elle se calme au-delà de 1,5 fois le rayon).
2. Un rayon de fuite qui dépend de l'allure : à pas lents on s'approche davantage ; au galop du cheval, le
   rayon double.
3. La **contagion** : une bête qui fuit fait fuir ses voisines de même espèce dans un rayon donné
   (chevreuils, perdrix, canards).
4. D'autres menaces que le joueur : les chiens de la famille ; le renard pour les lapins (et les poules, si
   un renard passe près de la ferme).
5. L'**accoutumance** : moins de crainte près des hameaux, ou pour une espèce déjà souvent croisée.

**Les bêtes de la ferme et les compagnons**

6. Vaches et moutons gardent une distance entre eux (la séparation du socle) et s'écartent quand on
   traverse le troupeau.
7. Les poules se regroupent autour du personnage qui porte du grain.
8. Le chien suit parfois le personnage hors de la ferme ; le chat chasse les oiseaux de passage.

**Les habitants**

9. Ils s'évitent entre eux (aujourd'hui seul le personnage du joueur est contourné : `EVITE`).
10. Ils rentrent sous la pluie, comme les compagnons.
11. De courtes interactions entre voisins : se saluer en se croisant, attendre son tour au puits.

## Hors périmètre

- De nouvelles images (une tête levée qui demanderait une image de plus se fait avec ce qui existe, ou la
  PR le signale et propose une maquette).
- Le moteur (`js/engine/`) : rien de ce qui est ici ne change la sauvegarde.

## Critères d'acceptation

- Chaque comportement a sa capture (GIF) dans la PR ; les réglages retenus sont ceux choisis.
- Aucune bête ni habitant superposé à un autre plus d'1 s (vérifié sur un parcours dans Chromium).
- Le coût par image ne monte pas de plus de 10 % (🧪 **Mesurer 30 s** près des ruches, dans un hameau,
  dans une forêt).
- Tests Node des règles pures (rayon selon l'allure, contagion, accoutumance).

## Vérifications

`npm run build`, `npm test`, `node tests/smoke.mjs` ; Chromium : ferme avec troupeau, hameau habité sous
la pluie, forêt et lande du grand monde, à pied et à cheval.

## Livraison

Un commit par groupe (ou un seul) ; `docs/grand-monde.md` (la faune, les habitants) et
`docs/carte-generee.md` (les bêtes de la ferme) mis à jour.

## Groupe 1, la faune du grand monde : fait (2026-11-10)

`js/carte/ferme/faune-monde.js` (`REACTION`, sur le socle de la fiche 31), le réglage « méfiante » choisi sur
film parmi trois (vive, posée, méfiante) :

- **l'alerte** : le personnage à moins de 2 × son rayon de fuite, la bête se fige, tournée vers lui, un peu
  étirée (le ressort, `tenu`) ; elle ne fuit que s'il continue d'approcher, et se calme au-delà de 3 × ;
- **l'allure** : le rayon de fuite × 0,7 quand il approche à moins de la moitié de la marche, × 2 au-delà
  d'une fois et demie (le cheval) (`CarteKit.rayonFuite`, testé en Node) ;
- **la contagion** : une bête qui fuit fait fuir celles de son espèce à moins de 96 px, chacune après 0,2 à
  0,6 s (la perception du socle) ;
- **le renard** : lapins, lièvres, perdrix et écureuils à moins de 0,8 × leur rayon de fuite d'un renard le
  fuient ;
- **l'accoutumance** : près d'un hameau (6 cases), le rayon de fuite × 0,6. (L'accoutumance à une espèce
  souvent croisée n'est pas faite : l'encyclopédie ne compte que la première rencontre.)
- **Pas fait** : les chiens de la famille comme menace (ils ne sortent pas de la ferme, où il n'y a pas de
  faune ; ils viendront avec le groupe 2, le chien qui suit le personnage).
- Vérifié dans Chromium (4 perdrix sur la lande, le personnage qui approche à la marche, au galop, à petits
  pas ; un renard près des lapins) : alerte puis envol vers 1 × le rayon à la marche, l'une après l'autre ;
  au galop tout le groupe part dès 1,5 × ; à petits pas on approche plus longtemps ; les lapins fuient le
  renard.
