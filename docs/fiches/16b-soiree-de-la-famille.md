# Fiche 16b — La soirée de la famille : dehors jusqu'au coucher, manger quand on a faim

La fiche 16 a fait asseoir la famille à table de 18 h 45 à 20 h 30. **Ce n'est pas ce que veut
le joueur.** On garde tout le reste de la fiche 16 : la famille toujours visible, aucune
traversée de mur, les trajets impossibles reconnus, la porte du foyer dehors. On change
l'horaire de la famille selon les réponses du joueur.

## Ce que veut le joueur (ses réponses, à suivre à la lettre)

1. **Le soir, elle reste dehors jusqu'au coucher**, autour de la maison : les enfants jouent et
   les adultes flânent près de la maison. Plus de rentrée générale à 18 h 45, plus de repas à
   table à heure fixe.
2. **Chacun mange quand il a faim**, à n'importe quelle heure. Un membre affamé (sa jauge sous un
   seuil réglé dans `data/`) va lui-même à la boîte à nourriture ou au réfrigérateur, mange
   (geste et calcul de `js/engine/repas.js`), puis repart à ce qu'il faisait. S'il n'y a rien à
   manger, il n'y va pas en boucle.
3. **Le coucher** :
   - les enfants vont au lit à **20 h** ;
   - le compagnon (l'autre adulte) à **22 h** ;
   - chacun rejoint la maison à pied, entre par la porte et se couche dans son lit. On le voit
     au lit quand le toit est levé.
4. **Le matin** :
   - le compagnon se lève avec le personnage principal ;
   - les enfants se lèvent plus tard, à **8 h** ;
   - chacun sort par la porte.

Les heures et les seuils sont réglés dans `data/` (pas en dur). Les règles de la fiche 16 sur
les murs et les portes restent.

## Contexte

- Le commit de la fiche 16 (dans l'historique) et `js/famille-ferme.js` (sa réécriture :
  horaires, places à table, lits), `homeInside` dans `js/carte/ferme/chantier.js`.
- `js/engine/repas.js` : les jauges, la boîte, le frigo, ce qui est calculé la nuit.
- `js/engine/night.js`.
- `tests/engine/famille-visible.test.mjs`, qui affirme « à table à 19 h 45 » : il faut le
  réécrire selon les nouvelles règles.
- Le moteur peut encore compter les repas du soir (repas de la famille calculé la nuit). Il
  faut vérifier que le calcul des repas reste juste : pas de double repas entre ce qu'un membre
  mange de lui-même le jour et le repas compté la nuit, pas de famille affamée parce qu'il n'y a
  plus de repas à table. Expliquer le choix.

## Critères d'acceptation

- Dans Chromium, sur une journée de 6 h à 23 h, aucun membre caché et aucun pas dans un mur :
  - à 19 h, la famille est dehors autour de la maison, personne à table ;
  - un membre qui a faim va à la boîte ou au frigo, mange et repart ;
  - à 20 h, les enfants rentrent et se couchent ; à 22 h, le compagnon ;
  - le lendemain, le compagnon sort avec le personnage, les enfants à 8 h.
- Les tests réécrits (horaires, faim, coucher, lever) et ceux de la fiche 16 sur les murs
  restent verts.
- `npm test` vert, test de fumée sans erreur.

## Livraison

Un commit, pas de push. Rendre compte :
- le nouvel horaire ;
- la faim et les repas (et le calcul de nuit) ;
- les vérifications ;
- 4 à 6 captures : 19 h dehors, un membre qui mange, les enfants au lit à 20 h, le compagnon à
  22 h, le matin.
