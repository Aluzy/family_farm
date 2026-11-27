# Lot 6 — Les frames et les calques, l'aperçu animé, les formats

## Objectif

Un document de plusieurs **frames** (créer, dupliquer, supprimer, réordonner), avec un aperçu animé et la
pelure d'oignon, et de plusieurs **calques** comme dans Piskel. Il s'ouvre et s'enregistre en `.piskel`, en
planche PNG et en PNG par frame.

## Contexte

Le lot 1 est fait : la forme du document (`frames[].calques[]`) est déjà prévue. Lire `genererFichierPiskel`
dans `sprites.html` (module Personnages) : il écrit un `.piskel` (modelVersion 2, un calque = un JSON
`{ name, opacity, frameCount, chunks: [{ layout, base64PNG }] }`). C'est ce format qu'il faut savoir lire et
écrire.

## À faire

1. **Le noyau** : `ajouterFrame(doc, index)` (vierge), `dupliquerFrame`, `supprimerFrame` (jamais la
   dernière), `deplacerFrame(de, vers)` ; `ajouterCalque`, `dupliquerCalque`, `supprimerCalque`,
   `deplacerCalque`, `fusionnerVersLeBas`. Visibilité et opacité d'un calque (0–100 %). Un calque existe dans
   toutes les frames, comme dans Piskel. Chaque action est une entrée d'historique.
2. **La bande des frames** : des vignettes numérotées, la frame courante en évidence. Boutons « + Nouvelle
   frame » (après la courante ; raccourci N), « Dupliquer » (Maj+N), « Supprimer ». Glisser une vignette la
   déplace. Les flèches haut et bas changent de frame. Sur téléphone, la bande défile sous la vue.
3. **Les calques** : une liste avec l'œil (visible), l'opacité, le nom (modifiable) et l'ordre, ajouter,
   dupliquer, supprimer, fusionner vers le bas. Les outils dessinent sur le calque courant.
4. **L'aperçu animé** : une petite vue qui joue les frames en boucle à un FPS réglable (1–24, 6 par défaut),
   à 1× et 2×, avec lecture et pause.
5. **La pelure d'oignon** : la frame précédente (teinte rouge) et la suivante (teinte bleue) en transparence
   sous la frame courante ; l'opacité se règle ; on l'active avec un bouton ou la touche L.
6. **Les formats** :
   - **`.piskel`** : ouvrir (tous les calques et toutes les frames, chunks et layout compris) et enregistrer.
     Un fichier ouvert puis enregistré sans retouche s'ouvre dans Piskel à l'identique ;
   - **la planche PNG** : exporter les frames composées en grille (colonnes choisies, 8 par défaut comme
     `assets/fermier.json`), avec un `.json` `{ frameWidth, frameHeight, frames }` ; importer une planche en
     la découpant (largeur et hauteur de case saisies) ;
   - **un PNG par frame** : un `.zip` sans compression (STORE), écrit à la main dans le noyau, sans
     bibliothèque.
7. **Le travail en cours** : le document est gardé dans `localStorage` à chaque geste, avec un délai (rattrapé
   dans un `try/catch`, sans erreur s'il est trop gros), et proposé à la réouverture du module.

## Hors périmètre

Les gabarits Personnages ouverts dans l'éditeur (lot 7), les durées différentes selon les frames.

## Critères d'acceptation

- Un `.piskel` de `genererFichierPiskel` s'ouvre avec ses 3 calques. Le même fichier, réenregistré, garde ses
  pixels octet par octet.
- Une planche exportée puis réimportée avec la même taille de case rend les mêmes frames.
- 32 frames de 64 × 64 et 4 calques : l'aperçu tient son FPS et le changement de frame est immédiat.

## Vérifications

- `tests/engine/editeur-pixels.test.mjs` : opérations sur frames et calques et leur annulation, aller-retour
  `.piskel` (lecture d'un fichier produit par `genererFichierPiskel`, extrait de la page), planche (découpe et
  assemblage), le `.zip` (en-têtes, CRC-32 d'une valeur connue).
- Chromium : créer 4 frames, dupliquer, réordonner, pelure d'oignon, lire l'aperçu, exporter la planche et le
  `.piskel`. Si un Piskel local est accessible, y rouvrir le `.piskel` ; sinon, le relire dans l'éditeur.

## Livraison

Un commit, en français, terminé par les lignes d'attribution. Mettre à jour `docs/editeur-pixels.md` et
`00-chantier.md`.
