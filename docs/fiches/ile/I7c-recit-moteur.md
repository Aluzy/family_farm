# Fiche I7c — Le récit retiré du moteur

## Objectif

Faire que le moteur d'une partie `ACTIF` ne lise plus rien du récit : ni personnages, ni scènes, ni
confiance, ni courrier, ni ateliers tenus par un personnage, ni fins. Ce que le récit portait d'utile
a déjà son remplaçant (les paliers, les commerces, l'amitié) ; cette fiche coupe les fils.

## Contexte

- `docs/ile.md` (D2). I5a à I5c (les commerces remplacent `ILE.ATELIERS`), I6a (l'amitié sans
  personnages écrits), I7a (les paliers remplacent chapitres et courrier).
- Le récit : `js/engine/recit.js` (609 lignes), `data/recit.json` (11 personnages, 32 scènes, 68
  répliques, `FINS`, `CONFIANCE`, `USURE`, `FIL`, `PROMESSES`), `js/engine/fil-lune.js`,
  `js/engine/usure.js`, `js/engine/secrets.js`, `data/secrets.json`, `js/engine/ile.js` (ateliers,
  veillée, remboursement), `js/engine/bienvenue.js`.
- Qui s'en sert, dans le moteur (relevé du 12 novembre 2026) : `amitie.js`, `base.js`, `bot.js`,
  `caleche.js`, `campaign.js`, `crops.js`, `decouverte.js`, `habitants.js`, `index.js`,
  `invitations.js`, `monde-gen.js`, `monde-hameaux.js`, `monde-lieux.js`, `night.js`, `projets.js`,
  `state.js`. Refaire le relevé (`grep -rlE "recit|RECIT|COURRIER"`) : il a pu bouger.
- Les lieux du récit dans le monde : `PLAN_MONDE.RECIT` et `SECRETS` (`data/monde.json`),
  `monde-lieux.js` (l'observatoire, la barque, l'atelier de Frida, la mine de l'étoile).

## À faire

1. **Un relevé commenté**, d'abord : pour chaque appel au récit dans le moteur, ce qu'il fait et ce
   qui le remplace (ou « rien : retiré »). Le joindre au compte rendu.
2. **Couper** : avec `ACTIF`, aucun module du moteur n'importe `recit.js`, `fil-lune.js`, `usure.js`
   (celle du récit), `secrets.js`, `ile.js`, `bienvenue.js`. Passer par un point d'entrée unique
   (`village.js`) plutôt que des `if` semés partout : là où c'est possible, deux implémentations
   d'une même petite interface, choisies une fois.
3. **Les mécaniques portées par le récit** :
   - la **confiance** de l'île et ses paliers : retirées ; ce qu'elles débloquaient passe aux paliers
     de l'île (I7a) ou au niveau du port (I1c) ;
   - la **veillée** de pleine lune : gardée comme une fête du village (I8a la reprendra) ; ici, elle
     ne lit plus de scène ;
   - les **ateliers** de Basile et Garance : remplacés par les commerces ;
   - les **lieux du récit** dans le monde : gardés comme des lieux muets (une cabane, une barque sur
     la plage) s'ils sont jolis et sans texte, sinon retirés du plan `ACTIF` ; la mine de la ferme
     reste une mine.
4. **Les effets de lune** sur les cultures (`LUNE`, `crops.js`) restent : c'est une règle, pas un
   récit. Vérifier qu'ils ne passaient pas par `fil-lune.js`.
5. **Les tests** : un test garde-fou (`village-sans-recit.test.mjs`) qui charge le moteur `ACTIF`
   avec un `DATA.RECIT` vide et joue 30 nuits simulées sans erreur ; un autre vérifie par lecture
   statique qu'aucun module atteint depuis `village.js` n'importe les modules retirés. Les tests du
   récit (`recit*.test.mjs`, `textes-recit`, `secrets`, `fil-lune`, `ile`) restent verts avec
   `ACTIF: false` jusqu'à la bascule.

## Hors périmètre

- L'interface, l'aide, l'encyclopédie, le son (I7d) ; supprimer les fichiers (I9h, à la bascule) ;
  les hameaux et la calèche (I7e) ; les parties en cours (I7f).

## Critères d'acceptation

- Les deux tests garde-fous passent ; `npm test` vert des deux côtés du réglage.
- Dans Chromium, `?village=1`, 20 jours de jeu : aucune scène, aucun courrier, aucun personnage écrit
  ne paraît ; la console est sans erreur.

## Vérifications et livraison

Celles du README du chantier. Joindre le relevé commenté.
