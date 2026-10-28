# Les dialogues et la mémoire

Comment les personnages de Céron parlent, se souviennent et réagissent, avec le moins d'écriture
manuelle possible. Le moteur : `js/engine/recit.js` ; les textes : `data/recit.json`.

## 1. La charte d'écriture

### Les formats

| Format | Où | Longueur | Usage |
|---|---|---|---|
| Bulle | Au-dessus d'un personnage, sur la carte | 1 à 2 phrases, 110 caractères au plus (`RECIT.BULLE_MAX`) | Saluts, remarques, souvenirs, indices |
| Scène | Petite fenêtre, quelques bulles qui se suivent au toucher ; elle attend que l'écran soit libre (`js/ui/calme.js`) | 1 à 6 lignes | Les moments scénarisés |
| Lettre | Courrier (`COURRIER`) | 60 à 150 mots | Adèle, le notaire, Théo s'il part |
| Fragment | Carnet du joueur | 1 à 3 phrases | Pages de carnets, bribes, relevés |

### Les règles

1. Une réplique, une idée. Pas de paragraphe dans une bulle.
2. Pas d'exposition : le passé passe par des détails, jamais par un récit.
3. Ne jamais répéter une information acquise : elle sert une fois, ensuite on y fait allusion.
4. Chaque voix se reconnaît sans le nom (voir les voix, `personnages.md`).
5. On réagit aux actes, pas aux menus : pas de choix de réplique.
6. Cohérence avec l'état du monde : personne ne dit « tout le monde dort » en étant debout, ne
   parle d'hiver, ou ne remercie d'un don qui n'a pas eu lieu.
7. Le joueur est tutoyé. Exceptions voulues : le notaire, et Odile jusqu'à la première veillée.
8. Le genre du personnage principal s'écrit par deux variantes (`{ "m": …, "f": … }`), jamais par
   « (e) ».

### Les interdits

- L'aide déguisée en dialogue (« N'oublie pas d'arroser ! »).
- Les marqueurs de quête (« Va voir Frida, elle a quelque chose pour toi »), surtout pour le fil de
  la lune.
- Le deuil, l'oubli et la maladie comme sujets de conversation.
- Les références au monde réel, sauf le continent américain ; les mots que le test anti-restes
  interdit (« ville », « Marché », « école », « train »…).

## 2. Le système de mémoire et de conditions

### Ce que la sauvegarde retient (`state.recit`)

| Donnée | Contenu |
|---|---|
| `faits` | Chaque acte notable : `[premier jour, dernier jour, nombre de fois]` |
| `relations` | Des points entiers par personnage écrit, rangés en 5 paliers (`RECIT.PALIERS`) |
| `confiance` | Un score entier de 0 à 100 par hameau ; absent : `CONFIANCE.DEPART` |
| `dites` | Le dernier jour où chaque réplique a été dite (une scène : jouée) |
| `carnet` | Les fragments recueillis, dans l'ordre |

L'empreinte de la ferme n'est pas stockée : elle se calcule (lot 2).

### Une réplique dans les données

```json
{
  "id": "odile.nuits_noires",
  "qui": "odile",
  "quand": { "lune": "nouvelle", "fait": "odile.rencontre" },
  "texte": "On ne sème pas aux nuits noires. Ta mère non plus ne m'écoutait pas.",
  "priorite": 60,
  "repos_jours": 14
}
```

Conditions : `heure`, `lune`, `lieu`, `palier_min` / `palier_max`, `confiance_min` /
`confiance_max`, `fait` / `sans_fait`, `fait_recent` / `fait_souvenir`, `acte_min` / `acte_max`,
`chapitre_min`, `jour_min`, `genre`, `enfants`, `humeur`. Effets : `fait`, `relation`, `confiance`,
`fragment`. Variables : `{prenom}`, `{nom}` et celles que la page donne (`hameau`, `objet`,
`quand`). Le détail est dans l'en-tête de `data/recit.json` ; la validation dans
`scripts/lib/data.mjs`.

### Comment le moteur choisit (`choisirReplique`, `parler`)

1. Il rassemble les répliques du personnage dont toutes les conditions sont vraies.
2. Il écarte celles « une fois » déjà dites et celles encore au repos.
3. Il prend la plus prioritaire : scène (100), réplique conditionnelle (vers 60), réaction à un fait
   récent (vers 40), réplique générique d'un palier (vers 10).
4. À priorité égale, il tire au sort avec la graine du monde, le personnage, le jour et le nombre de
   touchers : le moteur reste déterministe.
5. `parler` note la réplique comme dite et applique ses effets.

### Moins d'écriture à la main

- Les réactions aux faits s'écrivent par famille de voix (anciens, adultes, jeunes) pour les
  habitants générés, pas par personnage.
- Les textes ont des variables : « Merci pour {objet}, {quand}. »
- Les souvenirs vieillissent : récent (3 jours au plus), souvenir (14 jours au plus), ancien
  (`RECIT.AGES`) ; un même fait donne trois répliques au fil du temps.
- Seuls les personnages écrits ont des répliques propres.

Ordre de grandeur visé : environ 800 répliques (40 par personnage écrit, 120 par famille de voix,
25 scènes et lettres), contre 60 bulles d'habitants aujourd'hui.

### Les sept axes de variation

| Axe | Condition | Exemple (Achille, à la ferme) |
|---|---|---|
| Relation | `palier_min`, `palier_max` | Poli : « Ho. Tu vends ou pas ? » Proche : « Ho. Garde-moi tes œufs, les Genêts en réclament. » |
| Événements vécus | `fait`, `sans_fait`, âge du fait | « Pas mal, ta tournée. Le cheval t'aime bien. » |
| Connaissances | Faits que le personnage peut savoir | Il ne parle du robot que s'il l'a vu, ou si on le lui a dit |
| Lieu et moment | `lieu`, `heure`, `lune` | Le soir : « Il dort debout, lui. Pas moi. » |
| État émotionnel | `humeur` | Fatigué : « Demain. Pas ce soir. » |
| Choix antérieurs | Faits de décision | Les toits payés : « Les toits, c'est bien. Il aurait fait pareil. » |
| Progression du monde | `acte_min`, empreinte, confiance | Acte III : « On parle de ta ferme jusqu'à Brumeval. Pas toujours en bien. » |

Un fait n'est connu d'un personnage que s'il l'a vu, s'il en a entendu parler dans son hameau, ou
s'il est public (une veillée, la calèche). Achille apprend tout en un jour ; Johnny n'apprend rien.

## 3. Les dialogues clés

Variantes de genre entre crochets [masculin / féminin]. Les scènes de l'acte I sont déjà dans
`data/recit.json` (`SCENES`).

### L'arrivée aux Mouettes (S, scène `arrivee`)

Début de partie, la famille composée. Fernand : « Les héritiers de Maurice. Ça se voit, vous avez
l'air perdus. » « La terre, c'est par là. Suivez le chemin. La calèche passe demain. » Avec des
enfants (`arrivee_enfants`) : « Toi, le petit, tu tiendras pas une semaine sans écran. On parie ? »
Effets : fait `arrivee`, Fernand « poli ». Les Mouettes n'est pas compté comme découvert.

### La première lettre d'Adèle (S, lettre)

> [Mon grand / Ma grande],
> Le bac a dû te paraître long. Pour moi aussi, à ton âge, et pourtant je le prenais dans l'autre sens.
> Ne te laisse pas impressionner par la terre. Elle n'a l'air de rien, mais elle est bonne. Papa disait qu'il suffisait de l'écouter. Je n'ai jamais su ce qu'il entendait.
> Au fait, si tu passes au Gué, dis bonjour à Odile. Elle va te trouver maigre.
> Écris-moi. Embrasse tout le monde.
> Maman

### Achille et la clé (S, scène `achille_cle`) — l'événement déclencheur

Chapitre 2, calèche arrêtée à la ferme. « Ho. » « Toi, t'as les yeux de ta mère. » « Tiens. La clé
de chez Maurice, au Gué. Il voulait que ça te revienne. » « Il a laissé des carnets partout. Moi,
j'en ai deux. Je les garde. » « Je passe tous les jours vers dix heures. T'as du surplus, je
prends. » Effets : la clé, Le Gué sur la carte, fait `achille.cle`.

### Odile devant la maison de Maurice (C, scène `odile_maison`)

Première entrée dans la maison. « Vous êtes [le petit / la petite] d'Adèle. » « Elle vous a dit de
passer me voir, j'imagine. Elle dit toujours ça. » « Il n'y a rien à prendre là-dedans. Il donnait
tout. » « On se tutoiera quand vous aurez passé une pleine lune ici. » Effets : le premier carnet de
Maurice (`carnet_promesses`), fait `odile.rencontre`.

### La première veillée (S, branches conditionnelles)

Première pleine lune de l'acte II, au Gué, de 19 h à 22 h. Une réplique de chaque présent selon les
faits : Garance (promesse commencée) « Il paraît que t'as commencé mon toit. On verra s'il tient. »
ou (machine posée) « Il paraît que t'as une machine qui travaille pour toi. Ici, on travaille pour
nous. » ; Fernand (rien de notable) « Personne a encore d'avis sur toi. Profites-en, ça dure pas. » ;
Odile « Bon. Tu as vu une pleine lune ici. On peut se tutoyer. » ; Achille « Maurice venait jamais
aux veillées. Toujours sur la route. Toi, t'es là. C'est déjà ça. » Effets : confiance des hameaux
présents, fait `odile.tutoie`.

### Frida vient à la ferme (S)

Palier « Automatisation ». « Alors c'est toi. La dernière fois que je t'ai vu, tu tenais dans un
panier. » « Je fabrique des machines. Ici, on dit que ce n'est pas bien. Moi je dis que ça dépend de
ce qu'on en fait. » « Un robot qui récolte, une station pour le recharger. Trois heures gagnées par
jour. Pour l'île, ou pour toi. » Empreinte basse : « Ta ferme est petite. Tant mieux : une machine y
ferait moins de bruit. » Haute : « Ta ferme grandit vite. Tu vas avoir besoin de moi, ou de beaucoup
de bras. » « Réfléchis. Mon atelier est au bord de l'étang. »

### Achille et la fortune de Maurice (S) — le retournement

Acte II, 20 nuits, Achille « cordial ». « Tu crois qu'il t'a laissé quoi, Maurice ? » « Il gagnait
bien. Il gardait rien. Le toit des Genêts, la scie de Bois-Joli, la pompe des Mouettes : c'est
lui. » « Quand il a arrêté, plus personne a payé. Ça se voit, maintenant. » « Ton héritage, c'est
cette terre. Et ce que les gens pensent de toi à cause de lui. Ça aussi, ça se dépense. »

### L'enveloppe de Maurice (S, décision par l'acte)

Niveau 9. Le notaire : « En rangeant les papiers de votre grand-père, j'ai retrouvé une enveloppe à
votre nom, cachetée de sa main. Je vous la fais suivre telle quelle. » Le mot de Maurice : « Pour
les toits de Céron. Ou pour toi, si tu en as plus besoin qu'eux. Tu sauras. M. » Les pièces
arrivent en objet : l'ouvrir la garde, la porter à Odile la donne. Odile : « Il t'a fait le même
coup qu'à moi : il laisse choisir, et il sait déjà. »

### Les visites à Johnny (C, bulles)

« Tu es nouveau ? Tu es déjà venu ? Ça ne fait rien. Assieds-toi. » Avec un repas : « Oh, de la
soupe. Quelqu'un m'en apportait, avant. Il parlait peu. » « Les crabes marchent de côté par
politesse. Je crois. » Après la pierre : « Ah. Elle est rentrée. » Les trois bribes du fil de la
lune : voir `aventure.md`.

### La fête des premiers arrivants (S, quatre fins)

- Le nouveau Maurice — Odile, en lui tendant la cloche : « Elle était à lui. Elle sonne mieux quand
  on passe chez les autres. » Achille : « {prenom}. Ça sonne bien, finalement. »
- Le voisin tranquille — Fernand : « Demain, cinq heures, à la cale. Si t'es en retard, je pars sans
  toi. »
- Celui qui a fait autrement — Frida : « Tu leur as montré que ça pouvait servir. Moi, en cinquante
  ans, j'y suis pas arrivée. »
- Le riche d'à côté — Odile : « Bonne fête. » Puis la lettre d'Adèle : « Tu es [heureux /
  heureuse], là-bas ? »

## 4. Les habitants générés : la refonte des bulles

On garde l'assemblage de `paroleHabitant` (salut, activité ou métier, humeur ; `HABITANTS.PHRASES`)
en le passant sur le système de conditions, avec trois couches de plus.

| Couche | Ce qu'elle change | Exemple |
|---|---|---|
| Confiance du hameau | Le salut | Réservée : « Bonjour. » Cordiale : « Tiens, [le petit / la petite] de Maurice. » Chaleureuse : « {prenom} ! Tu restes manger ? » |
| Famille de voix (anciens, adultes, jeunes) | Le ton | Ancien : « On ne coupe pas sans replanter, petit. » Jeune : « C'est vrai que t'as vécu à Cadolon ? » |
| Réaction à un fait du hameau | Remplace l'humeur | « Ton pain d'hier, on en parle encore. » |
| Lune | Une phrase de plus à la pleine lune et aux nuits noires | « Ce soir, veillée. Tu viens ? » |
| Empreinte | Une remarque rare quand elle est haute | « On voit ta fumée d'ici. » |

Incohérences de l'audit à corriger : un enfant qui dit « Te voilà de passage ? » (adultes
seulement) ; un habitant éveillé qui dit « Chut… tout le monde dort. » (« Il est tard. Chez nous,
tout le monde dort déjà. ») ; le bûcheron qui parle d'hiver (« Une bonne flambée pour les nuits
fraîches ») ; « C'est l'heure de manger. » suivi de « On n'a pas eu assez à manger hier. » (la faim
exclut le repas) ; « Bonjour ! » dans deux pools. Deux métiers nouveaux : tisserand et scieur.
