# Fiche 32 bis — La famille de la ferme : la pluie, l'écart entre les membres, les bêtes

> **Fait (2026-11-11).** Suite de la fiche 32, d'après ce qui a été vu en jouant : la famille et le compagnon
> ne rentraient pas sous la pluie, les membres de la famille se rentraient dedans et se traversaient, et ils ne
> s'écartaient pas des bêtes de la ferme (ni elles d'eux). Le groupe 3 de la fiche 32 ne touchait que les
> habitants des hameaux (`js/carte/ferme/habitants.js`) ; la famille a son propre code (`js/famille-ferme.js`).

## Ce qui a été choisi

- **La pluie** : chacun rentre dans la maison (sans maison : devant la porte, comme la nuit).
  - Le compagnon (le second adulte) **continue d'aller aux bêtes** : le Poulailler, l'Étable, les ruches ; et
    à la cuisinière (dans la maison). Le reste (arroser — la pluie le fait —, puiser, ramasser) attend la fin
    de l'averse, puis reprend aussitôt.
  - Un enfant qui joue **finit sa partie quelques secondes** (3 à 6 s), puis rentre ; il n'en commence pas
    d'autre sous la pluie.
  - La pluie finie, chacun ressort vers son coin.
- **Entre les membres** : ils peuvent **se frôler de 6 à 8 px** (arrêtés, la séparation douce du socle les
  garde à 7 px, sans quitter les cases libres ; au lit, à table, en plein geste, non). En marchant, un membre
  contourne le membre, le personnage ou la bête qui est devant lui, par un pas de côté de 8 px : le réglage
  **« discret »** choisi sur film parmi trois (discret, normal 12 px, marqué 16 px). Un membre qui va du même
  côté que lui : il le laisse prendre de l'avance. Il n'attend jamais plus de 1,5 s : il passe. Deux membres ne
  prennent plus le même coin pour flâner, ni la même place dans la maison.
- **Les bêtes de la ferme** (vaches, moutons, poules) s'écartent des membres de la famille comme du personnage
  (`chantier.js`, `stepBeasts` : `famille.positions()`), sans quitter leur enclos.
- **Les chats et les chiens ne suivent pas ces règles** (ni pour s'écarter, ni pour être évités).

Le code : `js/famille-ferme.js` (`PLUIE`, `ECART`, `SOUS_LA_PLUIE`, `ouVeut`, `geneur`, `avancer`, la grille de
l'image dans `update`, `prise`, `positions`) ; `js/carte/ferme/chantier.js` (`stepBeasts`). `essai(id)` et
`essaiAller(id, x, y)` servent aux essais filmés.

## Ce qui a été mesuré

Chromium, la partie du jour 75 (trois membres, 38 bêtes dehors), main et la branche :

| Mesure | main | Après |
|---|---|---|
| Sous la pluie (jour 78, 11 h) : membres dehors, en moyenne | 2,9 sur 3 | 0 sur 3 |
| Sous la pluie : la plus longue superposition de deux membres | 4,4 s | 0,4 s |
| Deux membres qui se croisent sur la même ligne : au plus près | 2 px (ils se traversent) | 10 px |
| Un membre qui traverse le poulailler : images avec une poule à moins de 6 px | 7 sur 49 | 0 sur 39 |
| Par temps sec : membres dehors | 2,1 – 2,5 sur 3 | 2,3 – 2,5 sur 3 |
| Coût, ralenti ×4 : le système « famille » | 0,25 – 0,43 ms | 0,42 – 0,55 ms |
| Coût, ralenti ×4 : toute la mise à jour (4 relevés) | 6,72 ms en moyenne | 6,93 ms (+ 3 %) |

À la fin de l'averse (14 h), le compagnon reprend le ramassage remis à plus tard, puis la cuisine ; les enfants
ressortent jouer. Les films : `32b-croise.gif` (avant, discret, normal, marqué), `32b-enclos.gif` (avant, après).
