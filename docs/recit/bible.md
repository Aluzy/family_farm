# La bible de Céron

Le monde du jeu, tel qu'il a été validé (phases 1 à 3 de la conception narrative, octobre 2026).
« Proposé » marque les rares points qui restent à confirmer.

## 1. Les règles du monde

Un monde réaliste et calme, avec une seule exception : la pierre de lune.

| Règle | Ce qu'elle implique en jeu |
|---|---|
| L'île se suffit à elle-même : pas de port de commerce, aucune marchandise importée en quantité. | Tout ce que l'on mange, bâtit ou vend vient de Céron. Les hameaux dépendent les uns des autres par la calèche. |
| La protection de l'environnement est dans l'ADN des habitants : sur une île aux ressources limitées, chaque être vivant garde sa place. Personne ne chasse. | Faune observable seulement ; l'élevage donne le lait, la laine et les œufs. |
| On pêche, parce que la pêche est durable et que les ressources de la mer se reconstituent vite. Le poisson est la seule viande. | Le quota de pêche quotidien (« Le poisson se fait rare… ») est une sagesse de l'île. |
| Un bac relie Céron à Cadolon pour les passagers, le courrier, les urgences et les petits colis. | L'arrivée de la famille, les lettres d'Adèle, les pièces de Frida. |
| L'île vit au rythme de la lune. | Les effets de lune déjà codés (`data/crops.json`, `LUNE`) sont un savoir transmis. |
| Le climat est doux et océanique, sans vrai hiver. | Cohérent avec un jeu sans saisons. Ne jamais parler d'hiver. |
| Le surnaturel se limite à la pierre de lune, et reste ambigu. | Aucune autre magie. |
| On ne prend pas ce qui est aux autres ; on aide quand on peut. | Les refus d'outils dans les hameaux (« ils sont aux habitants ») sont une règle de vie. |

## 2. L'archipel et son histoire

**Terres Lointaines** : un archipel volcanique de l'Atlantique Nord, au large du Portugal, fait de
**Cadolon** (la grande île) et de **Céron** (la petite). Cadolon a toujours été une escale entre
l'Europe et l'Amérique. Céron a été peuplée il y a cinq siècles par des premiers arrivants dont
les habitants descendent ; elle est restée à l'écart des passages, à part quelques ermites. On y
vit près de la nature, avec l'idée que l'île est un cadeau à préserver. Beaucoup d'enfants de
Céron sont partis vers Cadolon ou le continent.

### Chronologie (contexte d'auteur)

Les dates sont comptées depuis l'arrivée du joueur (année 0). Âges retenus : le joueur a environ
30 ans, Adèle 55, Maurice est mort à 85 ans.

| Quand | Événement |
|---|---|
| Année 0 | Le joueur et sa famille arrivent à Céron par le bac. |
| il y a 1 an | Mort de Maurice. Le joueur hérite de sa terre sauvage. |
| il y a 17 ans | Maurice prend sa retraite et passe la tournée à Achille, qu'il a formé. Les maisons qu'il entretenait commencent lentement à se dégrader. |
| il y a environ 35 ans | Johnny, explorateur scientifique déjà amnésique, arrive en bateau ; le bateau s'échoue sur la plage (l'épave). Il cache une pierre de lune, puis oublie tout, jusqu'à l'avoir rapportée. Maurice le découvre, lui rend visite pendant ses tournées, lui apporte des repas. |
| il y a 30 ans | Naissance du joueur à Cadolon. Bastien, son père, artiste, part en tournée sur le continent américain pendant la grossesse et ne revient pas. Adèle revient plusieurs fois à Céron avec le joueur enfant, chercher des souvenirs de sa mère. |
| il y a environ 50 ans | Frida, jeune naturaliste, arrive en expédition d'observation de la faune et de la flore, et reste. Elle s'occupe d'Adèle toute petite quand Maurice est sur les routes. Plus tard, relation avec Maurice. |
| il y a 41 ans | Adèle, adolescente, part en internat à Cadolon ; elle y fait ses études et y reste. |
| il y a 52 ans | Mort de Philomène, la mère d'Adèle ; Adèle a 3 ans. Maurice revient à Céron avec elle, dans sa maison d'enfance, et devient le cocher de l'île. Adèle fait les tournées avec lui. Il s'enrichit et réinvestit ses bénéfices dans l'entretien des logements et du matériel des habitants : c'est pour cela qu'il est aimé. |
| il y a 55 ans | Naissance d'Adèle à Cadolon. |
| il y a environ 77 ans | Maurice, enfant, quitte Céron avec ses parents pour Cadolon. Il y rencontrera Philomène. |
| il y a 5 siècles | Les premiers arrivants peuplent Céron. |

La maladie de Philomène n'est jamais un sujet du récit.

## 3. Géographie

Le monde généré devient Céron sans changer de forme : un massif volcanique au nord et à l'ouest, la
mer au sud et à l'est, la terre de Maurice au centre. Cinq hameaux et quelques lieux deviennent
garantis dans chaque partie ; les autres restent générés (leurs noms, leurs métiers, leurs
habitants combinatoires).

| Lieu garanti | Milieu | Ce qu'on y fait | Qui y vit | Rôle |
|---|---|---|---|---|
| **Le Gué** | Prairie, au croisement des chemins | Jardins, écurie de la calèche | Odile, Achille, des anciens | Hameau natal de Maurice : sa maison d'enfance, fermée depuis sa mort. Premier hameau découvert. |
| **Bois-Joli** | Forêt | Scierie (bois vers planches ; proposé : un meilleur rendement que l'Atelier, contre un jour d'attente), atelier d'ébéniste qui vend les meubles | Basile, Théo | Le travail du bois de l'île ; la tension rester ou partir. |
| **Les Genêts** | Lande | Bergerie, métier à tisser (laine vers tissu), machine à coudre (tissu vers vêtements) | Garance, Lise, bergers | Les tissus et vêtements de l'île ; le hameau le plus attaché aux façons anciennes. |
| **Les Mouettes** | Côte | Pêche, cale du bac vers Cadolon | Fernand, pêcheurs | La seule porte vers l'extérieur : on y arrive, on y reçoit le courrier. |
| **Brumeval** | Montagne volcanique | Mine, sources chaudes | Mineurs | L'île ancienne et la chaleur de la terre ; la fête des premiers arrivants. |

| Lieu isolé | Où | Rôle |
|---|---|---|
| La terre sauvage | Au centre, en prairie | La ferme du joueur. Sa mine, cachée dans les bois, abrite la galerie secrète de la pierre de lune. |
| La cabane de Johnny | Forêt, à l'écart des chemins | Sans électricité. |
| L'atelier de Frida | Au bord d'un étang, entre deux hameaux | Elle y fabrique le robot, sa station et les automatisations. |
| L'épave | Sur une plage | Le bateau de Johnny. Lieu silencieux. |
| Les grottes de la montagne | Massif volcanique | Minerais, cristaux, obscurité. |

## 4. Société, coutumes et calendrier

### Qui vit sur l'île

| Groupe | Rapport à la technologie | Visage écrit |
|---|---|---|
| Anciens restés toute leur vie | Réfractaires au changement | Odile |
| Anciens revenus de Cadolon pour la retraite | L'ont connue, n'en veulent pas | Fernand |
| Adultes qui ont choisi de rester | La voient comme une dérive | Garance, Basile |
| Enfants qui veulent rester | Peu attirés | Lise |
| Enfants qui veulent partir à Cadolon | Attirés | Théo |
| La scientifique | L'aime ; fabrique le robot et les automatisations | Frida |
| L'ermite de la forêt | Vit sans électricité | Johnny |

### Organisation

- Les hameaux sont autonomes ; les anciens ont le dernier mot sur les terres, l'eau et le bois.
- La **veillée de pleine lune** réunit l'île dans un hameau différent chaque mois : on récolte
  ensemble, on mange, on règle les affaires communes.
- Le **cocher** est un service commun : il achète les surplus, les revend ailleurs, porte les
  nouvelles.
- L'**entretien des maisons et du matériel** n'a jamais été organisé : Maurice le payait sur ses
  bénéfices. Depuis sa retraite, personne n'a repris ce rôle.
- L'argent existe mais compte moins que l'entraide.

### Le calendrier de lune

L'île suit le calendrier des premiers arrivants : 12 mois de 14 jours, de Solaria à Silentia
(`data/crops.json`). Chaque phase a sa coutume, tirée de l'effet que le jeu lui donne déjà.

| Phase | Durée | Effet dans le jeu | Coutume |
|---|---|---|---|
| Lune croissante | 5 jours | Une plante peut gagner un stade de plus | On sème : « ce qui monte avec la lune pousse avec elle ». |
| Pleine lune | 2 jours | Récolte ×150 % | La récolte de pleine lune et la veillée. |
| Lune décroissante | 5 jours | L'arrosage coûte moins d'eau | On économise l'eau, on répare, on entretient. |
| Nouvelle lune | 2 jours | Une plante arrosée ne pousse pas | Les nuits noires : la terre se repose, on raconte, on ne sème rien. |

Une fête annuelle : **la fête des premiers arrivants**, à Brumeval (les sources chaudes, un repas
cuit dans la terre chaude).

### Manières

- On ne coupe pas un arbre sans en replanter un.
- On salue tout le monde sur les chemins.
- On parle français, avec quelques mots à soi : « la tournée » (le passage de la calèche), « les
  nuits noires », « ceux d'en face » (les gens de Cadolon).

## 5. Tensions et mystères

### Les tensions (lentes, quotidiennes, sans ennemi)

| Tension | Entre qui | Ce que le joueur peut y faire |
|---|---|---|
| Rester ou partir | Les jeunes et leurs parents ; l'île et Cadolon | Donner des raisons de rester : du travail, des outils, des projets |
| Tradition ou technologie | Les anciens et les adultes restés, contre Frida et les jeunes | Automatiser ou non ; montrer ce que la technique peut servir |
| La place de la ferme | La ferme du joueur et l'équilibre de l'île | Petite exploitation ou grande ferme ; réinvestir |
| L'entretien abandonné | Les hameaux et le temps | Reprendre le rôle de Maurice |
| L'héritier attendu | Le joueur et les hameaux | Confirmer, décevoir, ou devenir quelqu'un d'autre que « le petit de Maurice » |

### Les mystères, tels que le joueur les rencontre

1. Qui est l'ermite ?
2. À qui était l'épave ?
3. Que cachait Maurice, et pourquoi tant de visites à l'ermite ?
4. Que fait la lune sur Céron ?

### Le contexte d'auteur

- **La pierre de lune est un fragment de lune**, une météorite lunaire rapportée par Johnny. Ce
  n'est jamais dit au joueur ; Frida peut le soupçonner.
- **Elle est dans une galerie secrète de la mine de la terre sauvage.** Maurice a acheté la terre
  parce qu'il avait deviné, aux bribes de Johnny, que la pierre y était, et il a voulu protéger
  l'endroit sans jamais la chercher. Le joueur vit sur le secret depuis le premier jour.
- **La recherche est réservée aux curieux** : aucun objectif, aucune lettre, aucun personnage ne
  l'impose.
