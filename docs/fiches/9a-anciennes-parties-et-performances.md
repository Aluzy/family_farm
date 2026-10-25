# Fiche 9a — Les anciennes parties et les performances

## Objectif

Rendre le grand monde solide et fluide pour tous les joueurs : une partie de n'importe quelle
version se rouvre sans perte dans le grand monde ; le jeu reste fluide sur un téléphone moyen,
grâce à des mesures sur un profil mobile et à des réglages de qualité ; les défauts connus du rendu
notés aux étapes 5 à 8 sont corrigés ou contournés.

## Contexte

- Lire d'abord `docs/grand-monde.md` (étapes 1 à 8 faites ; lire en particulier tous les « Reste »
  et les mesures de chaque étape), `docs/fiches/README.md`, puis :
  - la sauvegarde : `js/engine/base.js` (`STATE_VERSION`), `js/engine/state.js` (`MIGRATIONS` de
    la première version à aujourd'hui ; `decalerPartie`, `avantLeMonde`), `js/ui/storage.js`,
    `js/ui/store.js`, les tests de migration (`tests/engine/*`, `tests/engine/aide.mjs`), les
    sauvegardes d'exemple s'il y en a dans `tests/` ;
  - le rendu : `js/farm-stage.js`, `js/carte/ferme/sol.js` (`syncRegions`, `paintRegion`),
    `js/carte/ferme/vegetation.js`, `js/carte/ferme/eau-monde.js` et `js/carte/eau.js` (le shader
    de la mer), `js/carte/ferme/brouillard.js`, `js/carte/lumiere.js` (le voile de la nuit),
    `js/carte/ferme/habitants.js`, `faune-monde.js`, `caleche.js`, `hameaux.js`,
    `js/carte/ferme/camera.js`, `js/fermier.js` ; le Worker (`js/monde-worker.js`,
    `js/ui/monde-sol.js` : son cache de 88 régions) ; `js/ui/options.js` (les options,
    « animations réduites ») ;
  - les mesures déjà faites (Chromium sans carte graphique, SwiftShader) : forêt dense ~80 ms par
    image, côte ~93 ms, brouillard +10 %, carte du monde 340 ms à la première ouverture.

## À faire

1. **Les anciennes parties** :
   - écrire (ou compléter) un jeu de sauvegardes témoins, une par grande époque du format (d'avant
     la ferme générée s'il en reste une trace, d'avant le grand monde — format 51 —, puis 52, 54,
     57), construites par les fonctions du moteur des versions d'alors ou prises dans les tests ;
   - un test qui les migre toutes jusqu'à aujourd'hui, ouvre la partie (moteur), joue quelques
     nuits et vérifie : argent, inventaire, bâtiments, blocs, animaux, cultures, cheval, famille,
     didacticiel et campagne gardés ; la ferme au même endroit ; rien de perdu ni de dupliqué ;
   - dans Chromium, rouvrir chaque témoin : la page s'ouvre sans erreur, la ferme est identique,
     le personnage est à sa place, le monde autour est là ;
   - corriger ce qui casse ; une sauvegarde abîmée (champ manquant, type faux) ne bloque pas la
     page (valeurs par défaut, message clair au pire).
2. **Les performances sur téléphone** :
   - mesurer sur un profil mobile de Chromium (écran de téléphone, `deviceScaleFactor` 2 à 3,
     ralentissement du processeur ×4 par le protocole DevTools) les endroits durs : forêt dense,
     côte, hameau habité, bord du brouillard, la nuit, l'ouverture de la carte du monde ; et le
     temps de démarrage d'une nouvelle partie et d'une partie avancée ;
   - réduire ce qui coûte, sans changer le rendu sur un ordinateur : par exemple une option de
     qualité (auto selon l'appareil, ou réglable : « économie » / « normale ») qui baisse la
     résolution du brouillard et du voile de la nuit, simplifie l'eau de la mer, réduit le nombre
     d'images de végétation ou d'animaux dessinées, abaisse le cache de régions ; culer plus tôt ce
     qui est hors de la vue ; éviter les créations de textures à chaque image ; regrouper ce qui peut
     l'être. Chaque gain est mesuré (avant/après), chaque réglage expliqué ;
   - la mémoire : mesurer le tas JavaScript et le nombre de textures après un long voyage ; pas de
     fuite (aller-retour lointain répété : la mémoire revient au même niveau).
3. **Les défauts connus** (notés dans `docs/grand-monde.md`) : le grand saut d'un coup qui peut
   planter le rendu (`setupTextures`) ; l'image tournée mal tracée sous SwiftShader (l'arbre qui
   tombe, l'aigle) — trouver un contournement sans rotation de texture si possible (images
   pré-tournées, ou autre), sinon le noter ; toute erreur de console vue pendant les essais.
4. **Les tests** : les témoins et leur migration complète ; une sauvegarde abîmée ; l'option de
   qualité (le moteur ne change pas selon elle) ; ce qui est corrigé.

## Hors périmètre

- L'aide, l'encyclopédie, le didacticiel et la campagne (fiche 9b), sauf la ligne de l'aide sur
  l'option de qualité.
- De nouvelles fonctions de jeu.

## Critères d'acceptation

- Toutes les sauvegardes témoins se rouvrent sans perte, dans le moteur et dans Chromium.
- Sur le profil mobile, chaque endroit dur est mesuré avant/après, avec un gain net là où c'était
  le plus lent ; sur ordinateur, le rendu et la fluidité sont au moins ceux d'avant.
- Pas de fuite de mémoire sur les allers-retours ; plus d'erreur de console connue.
- `npm test` vert, test de fumée sans erreur, docs à jour (`docs/grand-monde.md` : 9a fait, avec
  le tableau des mesures ; `docs/fiches/README.md` : 9a fait).

## Vérifications

- `npm run build && npm test`, `node tests/smoke.mjs`.
- Chromium : captures d'une partie ancienne rouverte, de la même scène en qualité « économie » et
  « normale » (côte, forêt, brouillard, nuit) sur le profil mobile, des réglages ; donner aussi le
  tableau des mesures. Les regarder et corriger avant de livrer. Donner 6 à 8 captures (chemins
  absolus).

## Livraison

Un commit sur la branche de travail (conventions de `docs/fiches/README.md`), pas de push.
Rendre compte : les témoins et ce que leur migration a révélé (et corrigé), les mesures sur le
profil mobile avant/après (tableau), chaque réglage et son gain, la mémoire, les défauts corrigés,
les vérifications et leurs résultats exacts, les captures, ce qui reste (et ce qui ne se vérifie
que sur un vrai téléphone).
