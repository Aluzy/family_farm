# Fiche I9a — L'île partagée : la frontière et le poids

## Objectif

Poser les fondations du jeu en ligne de l'île à bâtir : le monde partagé n'est plus le rectangle de
la ferme mais **l'île entière** du joueur, où ses invités marchent, bâtissent et produisent. Cette
fiche écrit la nouvelle frontière, mesure le poids et lève la barrière ; l'horloge commune vient à
la fiche I9a2.

## Contexte

- `docs/ile.md` (D9 ; D13 : en ligne, l'horloge est commune et vivante ; D14 : la caisse est
  commune). `docs/monde-partage.md` (ce qu'est un monde partagé ; la frontière E-8 : « le monde
  partagé, c'est la ferme » ; les mesures de poids : la partie sans le grand monde, 114 Ko).
- Le serveur : `worker/src/monde.mjs` (un Durable Object par monde ; il joue les commandes avec le
  même moteur ; coffre commun ; F.2 : horloge figée ; nuit partagée), `worker/src/amis.mjs`,
  `comptes.mjs`, `worker/README.md`, `wrangler.toml`.
- Le client : `js/ui/en-ligne.js`, `js/ui/synchro.js`, `js/ui/hote.js`, `js/ui/position.js`.
- Le moteur : `js/engine/commandes.js` (les gestes nommés, rejouables), `js/engine/roles.js`,
  `tests/test-synchro.mjs`, `tests/deux-joueurs.mjs`, `tests/test-monde.mjs`,
  `tests/engine/rejeu.test.mjs` (le déterminisme).
- Ce que les lots 1 à 8 ont ajouté et qui devra passer en ligne : le port, le bac, les chemins hors
  de la ferme, les villageois, leurs tâches, les commerces, les liens, les vocations.

## À faire

1. **La nouvelle frontière**, écrite dans `docs/monde-partage.md` (une section « L'île partagée »
   qui remplace E-8 et F.2) : ce qui est commun (l'île, ses changements, le coffre, la caisse, le
   port, les villageois, la chronique, **l'heure**), ce qui reste à chacun (son personnage, son
   énergie, son brouillard, son sac, son amitié avec chaque villageois, ses réglages).
2. **Le poids**, mesuré sur trois parties (début, milieu, avancée) : la partie complète `ACTIF`, ce
   que pèse le monde hors de la ferme (repousses, récoltes prises, chemins posés, régions vues),
   ce qui peut se **recalculer** de la graine au lieu de se garder. Fixer un plafond.
3. **Lever la barrière** : en ligne, le personnage sort de la ferme et la vue le suit (avec `ACTIF`
   seulement) ; les invités voient le relief de l'île (créé chez eux, de la graine) ; rien d'autre
   n'est encore synchronisé hors de la ferme (un bandeau le dit).
4. **Le plan du lot** : confirmer ou revoir les fiches I9a2 à I9f d'après les mesures.
5. **Les tests** : deux joueurs marchent hors de la ferme et se voient (`deux-joueurs.mjs`) ; le
   monde créé chez l'invité est identique à celui de l'hôte (la graine) ; les mondes d'avant ne
   changent pas avec `ACTIF: false`.

## Hors périmètre

- L'horloge commune (I9a2) ; synchroniser les changements du monde (I9b), le port (I9c), les
  villageois (I9d).

## Critères d'acceptation

- La frontière est dans `docs/monde-partage.md` ; les mesures de poids et le plafond sont donnés.
- Deux onglets : l'invité suit l'hôte jusqu'au port ; chacun voit l'autre.

## Vérifications et livraison

Celles du README du chantier, plus `node tests/test-synchro.mjs` et `node tests/deux-joueurs.mjs`.
