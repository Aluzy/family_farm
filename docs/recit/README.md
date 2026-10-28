# Le récit de Céron

Ferme Familiale raconte l'installation d'une famille sur la terre sauvage dont elle hérite, sur
Céron, petite île volcanique de l'archipel des Terres Lointaines. Ce dossier est la référence de
l'histoire : ce qui est décidé fait foi pour l'écriture et pour le code.

| Document | Contenu |
|---|---|
| [bible.md](bible.md) | Le monde : ses règles, son histoire, sa géographie, sa société, ses coutumes, ses tensions et ses mystères |
| [personnages.md](personnages.md) | Les douze personnages écrits, leurs voix et leurs relations |
| [aventure.md](aventure.md) | L'architecture : la trame en quatre actes, les décisions et les fins, les arcs, le fil de la lune, la narration émergente |
| [dialogues.md](dialogues.md) | La charte d'écriture, le système de mémoire, les dialogues clés et la refonte des bulles des habitants |
| [plan.md](plan.md) | Le plan d'implémentation par lots, son avancement et les décisions encore ouvertes |

## Principes

- **L'axe** : la famille développe sa ferme et part dans les hameaux à la rencontre des
  habitants ; des souvenirs et des bribes lui permettent de retracer les histoires de l'île (qui
  est l'ermite, ce que le grand-père cachait). Le ton : entre la quiétude et le mystère.
- **Le passé est un contexte d'auteur.** Il rend le monde cohérent ; le joueur n'en perçoit que
  des fragments, dans l'ordre qu'il veut, et peut ne jamais tout reconstituer. L'histoire ne
  tourne ni autour du deuil ni autour de l'oubli.
- **Le joueur décide par ses actes**, jamais dans un menu de dialogue. Deux mesures cachées en
  gardent la trace : l'empreinte de la ferme et la confiance de chaque hameau.
- **Aucune mission imposée.** La campagne existante garde ses objectifs ; l'histoire s'y ajoute
  sans bloquer, et le fil de la lune est réservé aux curieux.

## Où vit le récit dans le code

- `data/recit.json` (clé `RECIT`) : tout le texte (répliques, scènes, pages du carnet), les
  conditions et les réglages. Aucune phrase d'histoire dans le code.
- `js/engine/recit.js` : la mémoire (`state.recit` : faits, relations, confiance, répliques dites,
  carnet), les actes, l'évaluation des conditions, le choix des répliques et des scènes.
- L'empreinte de la ferme et la dérive nocturne de la confiance des hameaux : `empreinteFerme` et
  `recitNuit` (`js/engine/recit.js`, appelée par `runNight`), réglées par `RECIT.EMPREINTE` et
  `RECIT.DERIVE`.
- Le Gué : le hameau le plus proche de la ferme porte toujours ce nom (`PLAN_MONDE.HAMEAUX.GUE`,
  `js/engine/monde-gen.js`) ; sa première maison est celle de Maurice (`maisonMaurice` dans son plan,
  `js/engine/monde-hameaux.js`), sans foyer (`peuplerHameau`, `js/engine/habitants.js`).
- Les personnages écrits sur la carte : `RECIT.PERSONNAGES[].habite` installe Odile, seule, dans le
  premier foyer du Gué à sa découverte (`peuplerHameau`), avec son apparence (`perso`) et l'id de son
  personnage (`recit`) ; la toucher passe par `paroleHameau` (`js/engine/recit.js`) : une réplique du
  récit si elle en a une, sinon la phrase des habitants. Le cocher s'appelle « Achille » dans les messages
  de la calèche une fois qu'il s'est présenté (`nomCocher`).
- La fenêtre des scènes : `js/ui/scene.js` (`ouvrirScene`, `proposerScene`) ; une scène est notée dès
  qu'elle s'ouvre et ne revient jamais ; elle attend un écran calme et arrête l'heure le temps de la
  lire (classe `story-modal`). Les déclencheurs : la boucle (`watchRecit`, `js/ui/loop.js` : l'arrivée,
  après le bandeau des cookies), la calèche garée à la ferme et le joueur à côté (`sceneCaleche`,
  `js/ui/caleche.js` : la clé d'Achille), l'entrée dans la maison de Maurice (le pont `maison` de
  `js/carte/ferme/hameaux.js`, `stageMaison` dans `js/ui/stage.js` : Odile). L'effet `montrer` montre
  le Gué sur la carte du monde et y mène la boussole ; l'effet `fragment` s'annonce à la fermeture.
- Le carnet du joueur : `js/ui/carnet.js`, une entrée 📓 du menu dès la première page.
- Les lettres : la lettre d'Adèle (`adele_arrivee`) et celle du notaire arrivent au départ
  (`data/campaign.json`, `COURRIER`) ; une ligne `{ m, f }` suit le genre du joueur (`mailText`).
- Les bulles : le salut des adultes des hameaux suit la confiance (`RECIT.SALUTS`, `paroleHameau`) ;
  la faim chasse la phrase du repas (`paroleHabitant`). Le cocher dit une réplique à chaque fenêtre de
  la calèche ouverte près de lui ; une vente à la calèche note le fait `vente.caleche`.
- `scripts/lib/data.mjs` : la validation du récit à la construction des données.
- Tests : `tests/engine/recit.test.mjs`, `tests/engine/recit-monde.test.mjs`, `tests/test-data.mjs`.

**Attention, le test anti-restes** (`tests/engine/finition.test.mjs`) interdit dans tous les
textes du jeu les mots « ville », « Marché », « train », « école », « bus », « boutique »… Les
personnages disent « Cadolon », « là-bas » ou « ceux d'en face ».

## Ce que d'autres fiches ont déjà fait et que le récit reprend

- **Fiche 11, l'équipement de la famille** : trois cases d'équipement par membre et le sac à
  provisions du personnage principal. Cela correspond à l'inventaire décidé pour le récit (3
  équipements, une tente, un sac de nourriture) ; il restera à y ajouter la tente.
- **Fiche 12, la calèche avec un vrai cocher** : le cocher a une apparence fixe ; il devient
  Achille.
- **Fiche 18, la visite de bienvenue** : un voisin du hameau le plus proche apporte un plat le
  jour 2. À relier à l'acte I (le Gué, Odile).
- **Fiche 19, le compagnon aide à la ferme** : le second adulte arrose, cuisine et ramasse ; c'est
  la base du compagnon qui garde la ferme pendant les explorations.
