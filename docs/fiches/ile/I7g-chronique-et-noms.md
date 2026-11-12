# Fiche I7g — La chronique et les noms

## Objectif

Donner au joueur les moyens d'écrire sa propre histoire : il nomme son île, son village et ses
commerces, et une chronique note d'elle-même les moments qui comptent.

## Contexte

- `docs/ile.md` (« Il n'y a pas de récit écrit »). I7b (le nom de l'île au départ), I5a (le nom d'un
  commerce), I7f (le résumé du récit d'avant dans la chronique).
- Le carnet d'aujourd'hui : `js/ui/carnet.js` (les pages du récit, `carnet` de `recit.js`).
- Le journal de la partie : `js/engine/journal.js` (hors sauvegarde, pour le suivi de session : ce
  n'est pas la chronique, mais il voit passer les mêmes événements).
- Les souvenirs des projets : `PROJETS.SOUVENIR`, `js/engine/projets.js`.
- Les noms : `data/general.json` (`DEPART.NOM`, `NOM_MIN`, `NOM_MAX`), le panneau d'un hameau
  (`js/carte/ferme/hameaux.js`), les enseignes.

## À faire

1. **Les noms** : l'île (au départ), le village (proposé quand le troisième villageois s'installe),
   chaque commerce (à son ouverture), chaque maison si l'on veut. Des noms proposés à la graine,
   modifiables à tout moment, bornés comme le nom de famille. Le village a son **panneau** à poser
   (un bloc) ; les enseignes portent le nom du commerce.
2. **La chronique** (`js/engine/chronique.js`, `state.chronique`) : une liste datée, écrite par le
   moteur aux moments réglés dans `VILLAGE.CHRONIQUE` : l'arrivée, la première récolte, la première
   vente, chaque villageois installé, chaque palier, chaque niveau du port, un commerce ouvert, un
   lien devenu « proche », un foyer formé, une fête, un projet fini, le dixième villageois. Une
   ligne par événement, avec les prénoms et les noms donnés : « Jour 30 : Léa ouvre la forge du
   Vieux Chêne ». Bornée (`MAX` lignes ; au-delà, les plus anciennes se résument par mois).
3. **La fenêtre** (à la place du carnet) : la chronique par mois de lune, du plus récent au plus
   ancien ; le joueur peut **épingler** une ligne et y ajouter **une note à lui** (bornée).
4. **Ce que disent les villageois** : un sujet de `PROPOS` reprend parfois une ligne de la chronique
   où il figure (« Tu te souviens du jour où j'ai ouvert la forge ? »).
5. **La sauvegarde** : les noms, la chronique, les notes ; format + 1, migration, test. Les notes du
   joueur sont du texte libre : les borner et les échapper à l'affichage (`escapeHtml`).
6. **Les tests** (`village-chronique.test.mjs`) : chaque événement écrit sa ligne une seule fois ; la
   borne et le résumé par mois ; renommer met à jour l'affichage, pas les lignes passées ; les notes
   échappées.

## Hors périmètre

- Partager sa chronique hors du jeu ; la chronique d'un monde en ligne (I9f le prévoira).

## Critères d'acceptation

- Dans Chromium : on nomme l'île et le village, le panneau porte le nom ; après vingt jours de jeu,
  la chronique compte les moments attendus ; on épingle une ligne et on y écrit une note ; un
  villageois évoque un souvenir.

## Vérifications et livraison

Celles du README du chantier. Captures : la chronique, une note, le panneau du village.
