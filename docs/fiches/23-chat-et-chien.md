# Fiche 23 — Un vrai chat et un vrai chien

## Objectif

Remplacer le miaulement actuel du chat (synthétisé) par de vrais enregistrements de chat, et
donner au chien de la famille de vrais aboiements, qu'on entende vraiment sur la ferme.

## Contexte

- Les sons : `js/son.js` (`chat`, `chien` ; les compagnons de la famille : « le chat et le chien
  de la famille ») ; les fichiers `assets/son/animaux/chat_*`, `chien_*` (Ogg et M4A).
- Les vrais enregistrements libres : `scripts/son/libres.py` (téléchargement, coupe, niveau),
  puis `scripts/son/vers_jeu.py` ; les crédits dans `assets/son/CREDITS.md` ; voir `docs/son.md`.
- Le renard utilise aujourd'hui le son `chien` accéléré (`CRI.renard`) : il ne doit pas aboyer
  comme le vrai chien.
- Les compagnons : `js/ambient-life.js` (chats et chiens de la famille, `stats().compagnons`).

## À faire

- Trouver des enregistrements réels, de préférence CC0 (BigSoundBank, Freesound…), sinon CC BY :
  2 ou 3 miaulements de chat domestique, 3 aboiements de chien (pas un molosse hargneux : un chien
  de ferme), propres, sans bruit de fond gênant.
- Les couper et les égaliser au niveau des autres bêtes de la ferme, et les citer dans les crédits.
- Garder au renard un cri à lui (l'ancien son, ou un vrai glapissement de renard).
- Vérifier que le chien de la famille aboie vraiment sur la ferme (quand la famille en a un), de
  temps en temps, pas la nuit, et corriger s'il ne s'entend jamais.

## Critères d'acceptation

- Dans Chromium, le chat miaule et le chien aboie avec les nouveaux sons.
- Crédits à jour ; `npm test` vert, test de fumée sans erreur.

## Livraison

Un commit, pas de push. Rendre compte : les sons choisis (auteur, licence, page), ce qui a changé,
les vérifications, et un fichier d'écoute qui enchaîne les nouveaux sons.
