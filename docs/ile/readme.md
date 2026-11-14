# Le README de l'île à bâtir (textes préparés, fiche I7d)

Les passages de `README.md` qui parlent du récit, de la calèche et des hameaux, réécrits pour l'île à bâtir : **la
fiche I9h les met en place** à la bascule (le README ne change pas avant). Pour chaque passage : ce qu'il remplace,
puis le texte neuf. Le reste du README (la technique, la sauvegarde, le jeu en ligne, la documentation) n'est pas
touché ici, sauf les lignes notées à la fin.

## L'ouverture (le premier paragraphe, après le titre)

Remplace « Un jeu de gestion agricole familiale en pixel art : une famille (quatre personnes au départ) s'installe
sur une terre sauvage… se découvre au fil des rencontres (docs/recit/) ».

> Un jeu de gestion et de village en pixel art : on débarque **seul ou en famille** sur une **île vierge**, avec un
> abri sur la terre de la ferme et un **port** au bout du chemin. Tout le reste est à bâtir. On y ramasse des pierres
> et du bois, on fauche l'herbe haute (des fibres, des bottes de paille par la botteleuse), on fabrique à l'Atelier, on
> **construit bloc par bloc** (murs, portes, fenêtres, étage, toits), on cultive, on élève poules, moutons, vaches et
> abeilles, on cuisine, et l'on brise à la pioche les gisements veinés de métal. Ce qu'on a en trop, on le **porte au
> port** : on y vend sans limite (le bac emporte tout), on y achète des graines, on y honore les commandes du bac, on
> y fait venir ce que l'île ne donne pas. Des **villageois** débarquent du bac : on leur bâtit une maison, on leur
> donne une tâche, on se lie d'amitié avec eux ; ils se lient entre eux, ouvrent des **commerces d'artisans**, et l'île
> prend une **vocation** (un village convivial, une ferme productive). La ferme est au centre du **grand monde**, une
> seule carte de biomes (prairie, forêt profonde, marais, lande, montagne, côte, mer) cachée au départ et découverte en
> marchant ou à cheval : des gisements et des cristaux qui luisent la nuit, de quoi ramasser, pêcher et chasser des
> yeux. Il n'y a pas d'histoire écrite : le joueur nomme son île et son village, et une **chronique** note ce qui s'y
> passe ([`docs/ile.md`](docs/ile.md)). Le jeu d'avant l'île à bâtir (son récit, ses hameaux, sa calèche) est gardé tel
> quel sur la branche `archive/jeu-avant-ile`.

## Le chantier (la puce « Chantier en cours »)

Retirée à la bascule : le chantier est fini, le réglage `VILLAGE.ACTIF` n'existe plus.

## La puce « Le grand monde »

Remplace « Le grand monde : … Dans les hameaux vivent des familles … La calèche passe par les chemins … ».

> - **Le grand monde** : le brouillard se lève autour du personnage ; la carte du monde et la boussole montrent ce qui
>   a été vu. Le **cheval** (l'Écurie) va plus vite, et le **chemin** du port, que le joueur pose et déplace, plus
>   vite encore. Loin de la ferme, le personnage ne mange que ce que contient son **sac à provisions**.
> - **Le port** : le seul commerce de l'île. On y **porte** ce qu'on vend (à la main, à la brouette, à la charrette
>   attelée) ; le **bac** accoste tous les trois jours, emporte ce qui a été vendu, apporte ses **commandes** (une
>   prime), livre l'**import** (jeunes arbres, épices, bêtes, plans) et amène les villageois. Le port grandit en cinq
>   niveaux.
> - **Les villageois** : ils s'installent dans une maison libre (un lit, une boîte aux lettres), vivent leur journée
>   (travail, repas, sorties, causeries), font la **tâche** que le joueur leur donne (les champs, les bêtes, le bois,
>   la pierre, la pêche, la cuisine, les machines, la tournée du port…) et gardent une **part** de ce qu'ils
>   produisent, qu'ils dépensent à l'**étal** du joueur. Un **tableau** dit ce que chacun coûte et produit. Ils ont
>   leurs goûts et leurs **traits**, une **amitié** avec le joueur et des **liens** entre eux (un foyer, un enfant).

## La puce « La famille »

Remplace « … (casque à lampe, chapeau, bottes, gants, tablier, salopette, manteau, fabriqués à l'Atelier) … le second
adulte, le compagnon, aide … ».

> - **La famille** : seul, ou de un à six membres. Chaque membre a son **équipement** (casque à lampe, chapeau, bottes,
>   tablier, et les gants, la salopette et le manteau des commerces de l'île) : des gestes moins fatigants, une vue
>   plus loin la nuit, une marche plus rapide dans le marais et la montagne ; un **compagnon**, s'il y en a un, aide
>   aux tâches de la ferme.

## La puce « Sept chapitres »

Remplace « Sept chapitres racontent un foyer qui prend vie … Ils mènent vers les voisins (amitiés, projets des
hameaux), les repas partagés et les styles. ».

> - **Sept paliers de l'île**, sans texte à lire : S'installer, La première vente au port, Le premier villageois, Les
>   bêtes, Trois villageois au travail, Le premier commerce, Un village de dix. Chacun a ses objectifs et sa
>   récompense ; le dernier ouvre le jeu libre. Puis les **vocations** : un village convivial (fêtes, veillées de
>   pleine lune, projets bâtis ensemble, une jolie place) ou une ferme productive.

## Les autres lignes à revoir à la bascule

- « Le grand monde (les routes, les hameaux, le récit) reste à la partie solo de son propriétaire » (le jeu en ligne) :
  l'île entière est le monde partagé (D9, fiches I9a à I9f) ; la phrase suit ce qu'aura fait I9f.
- Le tableau des données : retirer les lignes de `recit.json` et `ile.json` ; `monde.json` : « les biomes, les réglages
  de son générateur, sa végétation, ses roches, ce qui s'y ramasse, sa faune » (sans les hameaux, leurs habitants ni
  la calèche, I7e) ; ajouter `village.json` : « l'île à bâtir : le port, le bac, les villageois, leurs tâches, leurs
  liens et leurs traits, les paliers, les vocations, la chronique ».
- « (objet, Livre de recette, prix à la calèche) » : « prix au port ».
- La documentation : retirer la ligne de `docs/recit/` ; `docs/ile.md` devient le document de l'île.
- `cookies.html` est décrit « dans une lettre crème, comme le courrier » : « dans une lettre crème ».
