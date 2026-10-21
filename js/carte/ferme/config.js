/* carte/ferme/config.js — la scène de la ferme : ses réglages (window.FermeCarte).
 *
 * Les tables de la carte de la ferme (la carte Tiled, les bâtiments, les arbres, les rochers, la
 * pêche, les asperseurs, le robot, les intérieurs…), lues par js/farm-stage.js et par les
 * fichiers de js/carte/ferme/. Chacun de ces fichiers ajoute ses méthodes à la scène de la ferme
 * par FermeCarte.partie({ … }) ; js/farm-stage.js les pose sur le prototype de la scène quand
 * il la crée. Les réglages communs à toutes les cartes sont dans js/carte/ (CarteKit).
 */
(function (global) {
  'use strict';

  const K = global.CarteKit;
  const T = K.T;
  // Version 1.6 : plus de saisons, une seule carte (celle du printemps).
  const MAP = { key: 'map_sp', json: 'carte_printemps.json', tiles: 'tiles_sp', image: 'farm_spring_summer.png' };

  // Version 1.9 (la houe), 1.15 (partout sur la carte) : comme sur la planche du jeu de
  // tuiles, une tuile labourée est toute en terre et les tuiles d'herbe qui la touchent
  // (côtés et diagonales) portent sa bordure mi-herbe mi-terre. Le dessin d'une bordure
  // dépend de ses quatre coins : un coin est de la terre si une des trois autres tuiles qui
  // le partagent est labourée (bits : 8 haut-gauche, 4 haut-droite, 2 bas-gauche,
  // 1 bas-droite ; 15 = la terre elle-même). Le moteur refuse un labour dont une bordure ne
  // pourrait pas se dessiner (soilLayoutOk). Les 16 dessins sont dans terre_bords.png
  // (scripts/carte/terre_bords.py), leur herbe rendue transparente. Les anciennes zones de
  // culture (zone_culture_1 / zone_culture_2) avaient un sol de terre : il redevient de
  // l'herbe tant qu'il n'est pas labouré ; leur ancienne bordure (couche ZONE_TILES.couche)
  // n'est plus dessinée.
  const ZONE_TILES = {
    herbe: 2415, terre: 1167,
    couche: 'zone_culture_edge',
    // bordures de terre des anciennes zones, posées aussi dans les autres couches : jamais dessinées
    bordures: new Set([1612, 1613, 1614, 1687, 1688, 1689, 1762, 1763, 1764]),
    // couche des fleurs et touffes d'herbe : rien n'en reste sur une tuile labourée
    plantes: 'plantes_pierres',
  };
  // Les images des bâtiments et des arbres du pack portent un suffixe de saison : seul
  // celui du printemps (« sp ») est chargé et utilisé.
  const SFX = 'sp';
  // Rangées de tuiles visibles en hauteur : la taille d'affichage ne dépend pas de la
  // taille de la carte. La première carte en montrait 19 ; depuis la version 1.4 le bandeau
  // est deux fois moins haut, et la place gagnée montre deux rangées de plus, à la même échelle.
  const VIEW_ROWS = 21;
  // Rectangle de la zone de culture dans la carte : le premier nom trouvé. Les parcelles du
  // jeu s'y posent ; celles du Champ (modèle.plots2) se posent sur `zone_culture_2`.
  const ZONE_OBJECTS = ['zone_culture_1', 'zone_culture'];
  // Arbres du Verger : le n-ième arbre du modèle se pose sur le rectangle `arbre_verger_n`.
  const TREE_OBJECT = 'arbre_verger_';
  const TREE_FRAME = { frameWidth: 80, frameHeight: 80 };   // basic_*.png : 8 images de 80×80 ; seule la première sert, les arbres ne bougent pas
  // verger.png, des images de 80×80 (scripts/verger/arbres.py) : emplacement libre, jeune arbre,
  // puis quatre par espèce (arbuste, arbre, en fleur, en fruits) ; le modèle donne l'image
  // (`dessin`) et le stade (`stade` : -1 libre, 0 jeune arbre, 1 arbuste, 2 arbre).
  const ORCHARD_FRAMES = { libre: 0, jeune: 1, arbre: 3 };
  const ORCHARD_ADULT = 2;                                   // à partir de l'arbre (stade) : feuilles et écureuils
  const TREE_BODY = 0.5;                                     // part de l'image qu'occupe l'arbre (le feuillu de 48 px), en largeur
  // Ombres portées des arbres (scripts/carte/arbres_3d.py) : celles des arbres de la carte,
  // une image de la taille de la carte posée sur le sol (les arbres eux-mêmes en sont exclus),
  // et celle d'un arbre adulte du Verger, posée sous lui ; (dx, dy) : son coin haut-gauche par
  // rapport au pied de l'arbre (milieu du bas de son image).
  // Arbres de la carte (couches layer_tree_*, sauf layer_tree_top) qui se coupent à la hache :
  // un arbre est un groupe de cases voisines d'une même couche. Les deux arbres du pack qui ont
  // une feuille de sprites (le feuillu, le sapin) tremblent sous le coup avec elle : `box`, leur
  // place dans la planche (colonne, rangée, largeur, hauteur, en tuiles) ; `dx, dy`, le coin
  // de l'image de la feuille par rapport au coin haut-gauche de l'arbre ; `frames`, les images
  // jouées. Les autres arbres tremblent d'un pixel, de gauche à droite.
  const CHOP_TREES = {
    feuillu: { box: [12, 0, 4, 5], key: 'tree_sp', dx: -8, dy: 1, frames: [0, 1, 2, 1, 2, 3, 4, 5, 6, 7, 0] },
    sapin: { box: [9, 4, 3, 4], key: 'pine_sp', dx: -5, dy: 0, frames: [0, 1, 2, 1, 2, 1, 0] },
    // le décor version 2 (scripts/carte/planche_v2.py, arbre_clair.py) : l'arbre clair et le pin
    // Ils restent d'un bloc et penchent autour de leur pied (images : 0 droit, 1 à droite, 2 à
    // gauche, avec 4 px de marge de chaque côté) : droite, milieu, gauche, milieu, droite, milieu.
    arbre_clair: { box: [48, 50, 3, 4], key: 'arbre_clair_sp', dx: -4, dy: 0, fps: 9, frames: [1, 0, 2, 0, 1, 0] },
    pin_clair: { box: [52, 50, 4, 4], key: 'pin_clair_sp', dx: -4, dy: 0, fps: 9, frames: [1, 0, 2, 0, 1, 0] },
  };
  const CHOP_FPS = 12;
  // La pêche : une eau (des cases d'eau voisines) d'au moins `etang` cases est l'étang (le
  // brochet y vit), une plus petite d'au moins `mare` cases la mare ; les flaques ne se
  // pêchent pas. Le bouchon se pose `reach` cases d'eau devant la rive (au plus), après un vol
  // de `castMs` ; la touche se fait attendre (CarteKit.PECHE : l'attente, le bouchon et le fil,
  // comme sur les autres cartes). Les poissons qui sautent hors de l'eau : `fish` (lignes de
  // pixels, une lettre par couleur de `fishColors`).
  const FISHING = {
    etang: 30, mare: 4, reach: [1, 3], castMs: 420, reelMs: 260, jumpMs: 520,
    fishColors: { k: '#23301f', g: '#5f7d3c', l: '#8fae5c', p: '#e08a86', w: '#eef0e4', G: '#3e5a2e', y: '#e2d77e', c: '#e8e0c0' },
    fish: {
      truite: ['..kkkkk...', '.kglgglk.k', 'kkpppppkkk', '.kwwwwwk.k', '..kkkkk...'],
      brochet: ['..kkkkkkkk...', 'kkGyGGyGGyk.k', 'cwGGyGGyGGkkk', '.kcccccccck.k', '..kkkkkkkk...'],
    },
  };
  // Les rochers de la carte (couche ZONE_TILES.plantes), qui se cassent à la pioche : un rocher
  // est un groupe de cases voisines dont les tuiles sont dans `gids` (le gros rocher 2 × 2, le
  // moyen, le haut, les cailloux). Chacun a sa propre image, rangée selon son pied. Un coup de
  // pioche fait sauter `shards` éclats (`burst` quand il se brise), de la couleur des pierres
  // (CarteKit.NATURE.eclats, comme sur les autres cartes) ; ils retombent `fall` px sous leur
  // départ, roulent un peu puis s'effacent.
  const ROCKS = {
    // (ceux de la planche d'origine, puis le bloc « rochers » de la ferme générée : ROCHERS de
    // js/engine/planche.js, 16 tuiles à la colonne 16 des rangées 55 et 56)
    gids: new Set([466, 467, 541, 542, 616, 617, 691, 692, 764, 765, 766, 767,
      ...[0, 1, 2, 3, 4, 5, 6, 7].flatMap((k) => [1 + 55 * 75 + 16 + k, 1 + 56 * 75 + 16 + k])]),
    // (les éclats des rochers de la ferme générée : la pierre de scripts/carte/rochers.py ; ceux
    // de la planche d'origine : CarteKit.NATURE.eclats)
    neufs: 1 + 55 * 75 + 16,
    eclats: { couleurs: [0x645c4e, 0x7d7463, 0x968c78, 0xada38f, 0x4a443a], coup: [0xdcd4c2, 0xc4baa6, 0xada38f, 0xdcd4c2, 0x645c4e] },
    shards: 8, burst: 22,
    sizes: [1, 2, 2, 2], burstSizes: [2, 2, 3, 3, 4],
    speed: [18, 46], lift: [45, 85], gravity: 280, fall: [2, 7], life: [650, 1100], fade: 300,
    breakMs: 260, backMs: 900,
  };
  // L'arrosage automatique : les asperseurs rotatifs (scripts/batiments/asperseur.py, 8 images,
  // une par direction du bras ; le pied en bas au milieu). Quand il tourne, un asperseur fait un
  // tour en `period` s et lance une goutte toutes les `de` s : elle part de la tête (`h0` px au-
  // dessus du sol) à la vitesse `v` (au sol) et `vz` (vers le haut), retombe (`g`), son ombre
  // la suit, et elle éclabousse la terre `splash` s. Tout se calcule à partir de l'instant :
  // aucune goutte n'est gardée d'une image à l'autre.
  const SPRINKLER = {
    key: 'asperseur', file: 'asperseur.png', frame: { frameWidth: 9, frameHeight: 13 }, frames: 8,
    period: 2, de: 0.012, h0: 9, g: 160, v: [22, 56], vz: [44, 54], jitter: 0.35, life: 1.2, splash: 0.2,
    water: [0xe8f8ff, 0xb0e2fc, 0x78c0f0], shadow: 0x281e14,
  };
  // Le robot de la ferme (scripts/batiments/robot.py, 6 images : 0-1 roule, 2-4 le bras
  // descend, 5 au repos ; le bas des chenilles en bas au milieu). Pendant une tâche, il roule
  // jusqu'à la parcelle (la part `route` de son temps, à sa vitesse : voir robotModel) puis
  // descend le bras ; sa base : `dock` px à côté de la porte de la maison (ROBOT.BASE du
  // moteur). Au-dessus de lui, une bulle : la tâche et son rang. `speed` : px/s sans modèle ;
  // `catchUp` : s, le moins de temps pour rattraper un retard.
  // Sa station de charge (scripts/batiments/station_robot.py, 5 images : 0 au repos, 1-4 en
  // charge, une toutes les `period` s) se tient `station` px à gauche de sa base ; quand il s'y
  // recharge, sa bulle montre sa batterie. Un appui sur lui ou sur elle ouvre sa fenêtre.
  const ROBOT = {
    key: 'robot', file: 'robot.png', frame: { frameWidth: 14, frameHeight: 16 },
    speed: 27, catchUp: 0.6, dock: { dx: -30, dy: 12 }, icone: { recolter: '🧺', planter: '🌱' },
    station: { key: 'station_robot', file: 'station_robot.png', frame: { frameWidth: 12, frameHeight: 22 }, dx: -12, dy: -1, period: 0.45 },
  };
  // Un arbre ou un buisson devant le personnage, qui le cache : son opacité (voir findOccluders).
  const OCCLUDER_ALPHA = K.NATURE.devant;
  // Le tronc creux au bord de l'étang (en bas à gauche) : ses tuiles dans la couche
  // `layer` de la carte. Un double appui dessus, le personnage à moins de `near` px, ouvre une
  // bulle de dialogue au-dessus de lui ; « Oui » mène à l'infra-monde (`page`). Plus loin, le
  // double appui l'y envoie, comme sur l'herbe.
  // La sortie vers la ville : le bout est du chemin, au bord de la carte (le rectangle
  // `vers_la_transition` de la carte, couche « passages » : la sortie est au milieu de son bord
  // droit). Quand le personnage est tout près, la flèche bleue des passages (CarteKit.FLECHE ;
  // image 0 : vers la droite) paraît et se balance ; un appui dessus mène à la carte de
  // transition (`page`). En revenant de là (jeu.html?arrivee=est), le personnage apparaît au
  // bout du chemin (`arrive`, px du bord). `inset` : la flèche, à tant de px du bord.
  // Ce qu'on ramasse à la main sur la ferme générée (js/carte/ferme/cueillette.js) :
  // assets/ramassables.png (scripts/carte/ramassables.py), une image de 16 × 16 par sorte
  // (`frames`), le pied à `pied` px du haut de sa tuile ; `doigt` : px d'écran autour de lui où
  // un appui le prend.
  const RAMASSABLES = { key: 'ramassables', file: 'ramassables.png', frame: { frameWidth: 16, frameHeight: 16 }, frames: { petite_pierre: 0, morceau_bois: 1, herbe: 2, baies: 3, paille: 4 }, pied: 14, doigt: 28,
    // les baies : des grappes posées sur le buisson (px depuis le milieu du bas de son pied)
    grappes: [[-13, -12], [-4, -21], [6, -15], [14, -8], [1, -6]] };
  // Les blocs de la ferme générée (js/carte/ferme/chantier.js) : assets/blocs.png
  // (scripts/carte/blocs.py), une image de 16 × 24 par sorte (`frames` ; drap : la couverture
  // du dormeur), vue de haut à 45° ; un mur posé prend l'image raccordée à ses voisins (`murs`
  // + masque, chantier.js wallFrame), une porte percée dans un mur vertical `porteVerticale`.
  // Quand une préparation cuit au four, ses flammes bougent (`feu`, chantier.js stepFires).
  // Le plancher, à plat sous tout le reste (`solDepth`, sous les ombres du soleil) : `sols` +
  // masque des planchers voisins. `plats` : à plat, sous ce qui est debout ; `bloquent` : on ne passe pas.
  // Les pièces closes, en mode Construire : un `voile` vert. Couché, ses pieds sont à `coucheY`
  // px au-dessus du bas de la paillasse.
  const BLOCS_CARTE = {
    key: 'blocs', file: 'blocs.png', frame: { frameWidth: 16, frameHeight: 24 },
    frames: { mur_pierre: 0, porte: 1, atelier: 2, paillasse: 3, drap: 4, four: 5, cuisiniere: 6, panneau: 7, batterie: 8, nichoir: 9, mangeoire: 10, bac_semis: 11, coffre_grain: 12, meule: 13, lanterne: 66, escalier: 69 },
    murs: 14, porteVerticale: 30, sols: 31, solDepth: 0.05,
    // l'étage (un essai, js/carte/ferme/etage.js) : le haut de l'escalier (`haut`) ; l'étage
    // est dessiné `dy` px plus haut (la hauteur de la face des murs hauts : leurs faces se suivent) ; le niveau où l'on n'est pas,
    // en mode Construire : à `transparent` (quand on est dans le bâtiment, en bas : à `dedans`,
    // on n'en voit que son niveau) ; à l'étage, un voile sombre sur toute la
    // ferme (`voile`, `alpha` ; au-dessus de ce qui vole), et ce qui est de l'étage devant lui
    etage: { haut: 70, dy: 30, transparent: 0.3, dedans: 0, voile: 0x0d1018, alpha: 0.62 },
    // en mode Construire, aux niveaux où l'on rehausse les murs (chantier.js syncRang) : un
    // voile sombre (`voile`) sur la ferme ; devant lui, le rang de mur du niveau, celui du
    // dessous à `dessous`, les autres à `autres` (presque invisibles) ; les cases où poser le
    // bloc suivant (`place`, `placeAlpha`) et les pièces closes (le voile vert) à cette hauteur ;
    // un mur resté plus bas que ses voisins rehaussés : en rouge (`manque`, `manqueAlpha`)
    // la pose d'un meuble (chantier.js syncPoseMeuble) : le quadrillage (`grille`, `grilleAlpha`,
    // `trait` px) ; l'aperçu du meuble, à `alpha`, ses cases teintées (`fond`) de `ok` s'il tient
    // là, de `non` sinon
    // deux lits `seul` posés côte à côte (la même rangée) : un lit deux places (`double`),
    // dessiné sur les deux cases (chantier.js syncLitsDoubles)
    litDouble: { seul: 'lit_adulte', double: 'lit_double' },
    poseMeuble: { grille: 0xffffff, grilleAlpha: 0.35, trait: 0.5, alpha: 0.75, fond: 0.3, ok: 0x5bd36a, non: 0xff5a4a },
    rang: { voile: 0.9, dessous: 0.18, autres: 0.05, place: 0xffe9a8, placeAlpha: 0.55, manque: 0xff4a3a, manqueAlpha: 0.75 },
    // les toits (js/carte/ferme/toits.js ; leur dessin : CarteKit.toit) : au-dessus de la
    // rangée du bas du bâtiment (`z`) ; à `derriere` quand le personnage passe derrière, à
    // `vitesse` par seconde
    toits: { z: 1.5, derriere: 0.45, vitesse: 4 },
    // les murs et la porte (d'un mur horizontal), une case plus hauts (assets/murs_hauts.png,
    // comme les maisons de la transition, scripts/carte/blocs.py murs_hauts : les 16 murs
    // raccordés, `murs` + masque, puis la porte) ; un mur devant quelqu'un (il le cache)
    // s'efface jusqu'à `alpha` (devant le personnage : `joueur`), à `vitesse` par seconde
    // (chantier.js stepMurs)
    // ; `variantes` : les murs qui se raccordent comme le mur en pierre, et où commencent leurs
    // 16 images dans la planche (la fenêtre, les pierres d'angle ; sans la planche haute : le mur)
    hauts: { key: 'murs_hauts', file: 'murs_hauts.png', frame: { frameWidth: 16, frameHeight: 40 }, murs: 0, porte: 16, alpha: 0.4, joueur: 0.05, vitesse: 4,
      variantes: { mur_pierre: 0, mur_fenetre: 17, pierre_angle: 33, paroi_vitree: 97,
        // (les murs aux matières des immeubles de la ville : scripts/carte/blocs.py MATIERES_VILLE)
        mur_brique_rouge: 161, mur_brique_orange: 177, mur_brique_ocre: 193, mur_brique_bleue: 209, mur_pierre_taille: 225,
        // (les murs de l'enceinte de la Serre, quels qu'ils soient : du verre dans des arêtes de
        // bois, scripts/carte/blocs.py verre_serre ; sa porte : `porteSerre`)
        mur_serre: 306 },
      porteSerre: 370,
      // `joints` : les murs qu'un voisin de même sorte prolonge (à gauche, à droite, des deux
      // côtés : deux fenêtres font une grande fenêtre, les parois vitrées une façade de verre)
      joints: { mur_fenetre: [17, 49, 65, 81], paroi_vitree: [97, 113, 129, 145], mur_serre: [306, 322, 338, 354] } },
    // la barrière : 16 images raccordées aux barrières voisines (barrieres + masque, comme les murs)
    barrieres: 50,
    // la lanterne scintillante (un bloc `lumiere`, chantier.js stepLanterns) : éteinte le jour
    // (frames.lanterne) ; allumée quand la nuit tombe (le voile de l'heure plus sombre que
    // `allume`), ses deux images `allumee` alternent au hasard (elle scintille, `fps` au plus).
    // Sa lumière dans le voile : une flaque `sol` sur l'herbe (rayon px, aplatie, teinte, alpha,
    // dx/dy depuis le pied de la case), la vitre `vitre` ; elle vacille de ± `vacille` ; un petit
    // halo par-dessus la nuit (WebGL).
    lanterne: {
      allumee: [67, 68], fps: 6, allume: 0.12, vacille: 0.12,
      sol: { rayon: 54, aplati: 0.72, teinte: 0x8ff5e0, alpha: 0.95, dx: 2, dy: -5 },
      vitre: { rayon: 11, teinte: 0xd8fff6, alpha: 0.9, dx: 4, dy: -11 },
      halo: { couleur: 0x4ff0d2, rayon: 20, intensite: 0.09, attenuation: 0.08 },
    },
    // la lumière des maisons, la nuit (js/carte/ferme/fenetres.js) : une `teinte` chaude ; sur
    // le plancher des pièces (`piece` : une tache de `rayon` px par case) ; sur les vitres des
    // murs `sortes` (`vitre` : `dy` px au-dessus du pied du mur) ; sur la face du mur du fond,
    // tournée vers la pièce (`murFond` : unie, `haut` px depuis le pied du mur) ; les rayons des vitres de la façade (`rayons` : partis du bas de la vitre,
    // `mur` px au-dessus du pied du mur, puis sur le sol devant elle, larges de `vitre` px puis de
    // `large`, sur `cases` rangées) ; elle s'allume
    // et s'éteint à `vitesse` par seconde
    lumiereMaison: {
      sortes: ['mur_fenetre', 'paroi_vitree'], teinte: 0xffc673, vitesse: 1.5,
      piece: { rayon: 12, alpha: 0.85 },
      vitre: { rayon: 7, alpha: 0.95, dy: -16 },
      murFond: { haut: 32, alpha: 0.7 },
      rayons: { mur: 8, vitre: 10, large: 40, cases: 4, alpha: 0.8 },
    },
    // le four qui cuit : ses flammes, une image après l'autre (`fps` images par seconde)
    feu: { sorte: 'four', frames: [47, 48, 49], fps: 7 },
    plats: ['paillasse', 'escalier'], bloquent: ['mur_pierre', 'mur_fenetre', 'pierre_angle', 'paroi_vitree', 'mur_brique_rouge', 'mur_brique_orange', 'mur_brique_ocre', 'mur_brique_bleue', 'mur_pierre_taille', 'barriere', 'atelier', 'four', 'cuisiniere', 'puits', 'citerne', 'panneau', 'batterie', 'nichoir', 'mangeoire', 'bac_semis', 'coffre_grain', 'meule', 'lanterne', 'station_robot'],
    // dessinés par la scène avec leurs propres images (puits.png et sa pompe, citerne.png ; la
    // station du robot : station_robot.png, machines.js)
    ailleurs: ['puits', 'citerne', 'station_robot'],
    // un appui sur le four ou la cuisinière ouvre la fenêtre de sa station ; sur le panneau, la
    // batterie, le puits ou la citerne, l'énergie ou l'eau ; sur le nichoir, le Poulailler ; sur la mangeoire, l'Étable ; sur le bac à semis, la Serre ;
    // sur le coffre à grain, le Silo ; sur la meule, le Moulin
    fenetres: { four: 'four', cuisiniere: 'cuisine', panneau: 'energie', batterie: 'energie', puits: 'eau', citerne: 'eau', nichoir: 'poulailler', mangeoire: 'etable', bac_semis: 'serre', coffre_grain: 'silo', meule: 'moulin', station_robot: 'robot' },
    // le bloc clé de chaque bâtiment (étape 5b) : là où l'on ramasse ce qu'il donne
    cles: { poulailler: 'nichoir', etable: 'mangeoire', serre: 'bac_semis', silo: 'coffre_grain' },
    voile: 0xc8ffb4, voileAlpha: 0.4, voileDepth: 0.08, coucheY: 4,
    // un lit acheté (meuble posé) : couché, ses pieds à `litPieds` px sous le haut du lit ; un
    // tableau : sur la face du mur, son bas à `tableau.dy` px au-dessus du bas de la case
    litPieds: 27, tableau: { dy: 10 },
  };
  // Les bêtes du Poulailler et de l'Étable de la ferme générée (chantier.js, syncBeasts) : leurs
  // planches (HERD_SHEETS : profil droit ; la poule aussi de face et de dos, scripts/carte/betes.py),
  // dehors dans l'enclos de jour[0] h à jour[1] h (comme la porte des bâtiments, ambient-life.js).
  // Par espèce : `vitesse` (px/s), `pas` (s par image de marche), `pause` (s entre deux trajets),
  // sa marche (marche : de profil ; la poule, face et dos : vers nous, de dos ; la vue suit la
  // direction du trajet), ce qu'elle fait à l'arrêt (anims : [images, s par image, part du
  // temps où elle le fait]) et la nuit (nuit : images, lentement).
  const GRAZER = { idle: 0, queue: 1, marche0: 2, marche1: 3, broute0: 4, broute1: 5, couchee0: 6, couchee1: 7 };
  const BETES = {
    jour: [6, 19],
    especes: {
      poule: { key: 'poule', vitesse: 10, pas: 0.09, pause: [1, 4],
        marche: ['marche0', 'pas', 'marche1', 'pas'], face: ['bas0', 'bas1', 'bas2', 'bas3'], dos: ['haut0', 'haut1', 'haut2', 'haut3'], nuit: ['couvee'], poses: ['picore', 'gratte'],
        anims: { picore: [['picore0', 'picore1'], 0.12, 0.4], gratte: [['gratte', 'idle'], 0.18, 0.8] },
        frames: { idle: 0, picore0: 1, picore1: 2, marche0: 3, marche1: 4, gratte: 5, couvee: 6, ailes: 7, pas: 8, bas0: 9, bas1: 10, bas2: 11, bas3: 12, haut0: 13, haut1: 14, haut2: 15, haut3: 16 } },
      mouton: { key: 'mouton', vitesse: 6, pas: 0.25, pause: [3, 8], marche: ['marche0', 'marche1'], nuit: ['couchee0', 'couchee0', 'couchee1'], poses: ['broute', 'broute', 'queue'],
        anims: { broute: [['broute0', 'broute1'], 0.5, 0.9], queue: [['queue', 'idle'], 0.22, 0.3] }, frames: GRAZER },
      vache: { key: 'vache', vitesse: 7, pas: 0.3, pause: [4, 10], marche: ['marche0', 'marche1'], nuit: ['couchee0', 'couchee0', 'couchee1'], poses: ['broute', 'broute', 'queue'],
        anims: { broute: [['broute0', 'broute1'], 0.55, 0.9], queue: [['queue', 'idle'], 0.22, 0.3] }, frames: GRAZER },
    },
  };
  const EXIT = { object: 'vers_la_transition', inset: 18, arrive: 34, page: 'ville-carte.html?carte=transition&arrivee=ferme' };
  const HOLLOW = {
    // (539, 540 : celui du pack, sur la carte de Tiled ; 4150, 4151 : le bloc « tronc_creux » de la
    // planche, sur la ferme générée, TRONC_CREUX dans js/engine/planche.js)
    layer: 'plantes_pierres', gids: [539, 540, 4150, 4151], near: 22, page: 'infra-monde.html',
    text: 'De drôles de couleurs luisent dans le creux du tronc : veux-tu aller voir ?',
  };
  // L'herbe haute (CarteKit.NATURE.herbe) : la couche d'objets « herbe_haute » de la carte, un
  // point par touffe (type = variante, une rangée de la planche). Une touffe sur une case
  // labourée disparaît. Sa teinte suit l'herbe sur laquelle elle pousse : la couleur du fond
  // sous son pied, rapportée à l'herbe la plus claire des touffes, écart accentué (`contrast` :
  // exposant) ; chaque touffe a en plus sa nuance (± `shade`).
  // Les touffes fleuries (rangées dont floor(r / 3) est impaire) portent en plus leurs fleurs
  // (`fleurs`, même découpe), sans teinte : la teinte du sol les ternirait.
  // Le coup fort (js/carte/ferme/coupfort.js, version 1.24) : un appui maintenu sur le
  // personnage qui tient la houe, la hache, la pioche ou la faux. Il se charge à partir de `arme`
  // ms (il tremble), est plein à `plein` ms ; relâché plein, il frappe fort. La zone d'appui :
  // son image, élargie à `doigt` px CSS au moins. La hache et la pioche frappent l'arbre ou le
  // rocher dont le pied est à moins de `portee` px du sien ; la faux fauche les touffes à moins
  // de `rayonFaux` px ; la houe laboure les tuiles à `rayonHoue` tuile(s) autour de la sienne.
  const COUP_FORT = { arme: 250, plein: 850, doigt: 36, portee: 30, rayonFaux: 16, rayonHoue: 1,
    poses: { houe: 'houe_{vue}_1', hache: 'hache_cote_1', pioche: 'pioche_cote_1', faux: 'faux_cote_1' } };
  const TALL_GRASS = Object.assign({ contrast: 2.2, fleurs: { key: 'herbe_haute_fleurs', file: 'herbe_haute_fleurs.png' } }, K.NATURE.herbe);
  // Sans carte : mêmes dimensions et mêmes rectangles que carte_printemps.json. Avec une
  // carte, ses dimensions et ses rectangles nommés prennent leur place (bakeGround).
  const DEFAULT_W = 72 * T;
  const DEFAULT_H = 57 * T;
  const DEFAULT_OBJECTS = {
    maison: { x: 513.6, y: 239, width: 94, height: 95.6 },
    grange: { x: 305, y: 253.8, width: 126.1, height: 81.6 },
    zone_culture: { x: 464.5, y: 385.1, width: 78.1, height: 94 },
    moulin: { x: 626.1, y: 412.3, width: 95.6, height: 127 },
    serre: { x: 736.1, y: 273.6, width: 94, height: 78.3 },
    verger: { x: 625.1, y: 303.7, width: 12.8, height: 15.9 },
    zone_culture_2: { x: 622, y: 607.6, width: 130.8, height: 128.8 },
    // Version 1.5 : le poteau « Ville », au bout du chemin qui quitte la ferme vers l'est.
    // Dans Tiled : un rectangle nommé `ville` le déplace.
    ville: { x: 1092, y: 422, width: 20, height: 24 },
    silo: { x: 656, y: 238, width: 49, height: 64 },
    // Le puits, en haut à gauche du Moulin, sous le chemin (sur ses abords, que la houe ne
    // laboure pas). Dans Tiled : un rectangle nommé `puits` le déplace.
    puits: { x: 596, y: 390, width: 34, height: 38 },
    // La citerne, juste à droite de la pompe du puits (son tuyau rejoint le moteur).
    citerne: { x: 629, y: 394, width: 24, height: 34 },
    // La sortie vers la carte de transition (voir EXIT) : rangées 27 à 29, dernière colonne.
    vers_la_transition: { x: 1136, y: 432, width: 16, height: 48 },
  };
  [[942.9, 510.5], [1024.2, 528.2], [864.1, 545.2], [831.3, 578.6], [958.7, 561.6], [1039.3, 579.2],
    [912, 578], [848.4, 625.2], [944.2, 610.1], [992.1, 627.1], [896.9, 641], [944.8, 673.1]]
    .forEach((p, i) => { DEFAULT_OBJECTS[TREE_OBJECT + (i + 1)] = { x: p[0], y: p[1], width: 63.7, height: 78.2 }; });
  // serre_*.png : la découpe du bâtiment (largeur × hauteur depuis le coin haut-gauche).
  //   « batiment » : la serre du décor version 2 (scripts/batiments/style_v2.py), 96 × 81, sur
  //   le rectangle `serre` de la carte.
  const SERRE_FRAMES = {
    batiment: { sp: [96, 81] },
  };
  const SERRE_FRAME = 'batiment';
  // Bâtiments : `object` = rectangle nommé de la carte (le bas-centre de l'image se pose sur
  // le bas-centre du rectangle), `window` = fenêtre ouverte par un appui. La maison est
  // toujours là ; les autres n'apparaissent que si modèle.batiments[id].visible est vrai.
  const BUILDINGS = [
    { id: 'maison', object: 'maison', tex: 'house', suffixed: true, window: 'maison' },
    { id: 'etable', object: 'grange', tex: 'barn', suffixed: true, window: 'etable' },
    // poulailler.png : trois images de 44×55 (porte fermée, entrouverte, ouverte) ; la vie
    // d'ambiance ouvre la porte le matin pour faire sortir les poules.
    { id: 'poulailler', object: 'poulailler', tex: 'coop', suffixed: false, window: 'poulailler', frame: 0 },
    { id: 'moulin', object: 'moulin', tex: 'windmill', suffixed: true, window: 'moulin', anim: true },
    { id: 'serre', object: 'serre', tex: 'serre', suffixed: true, window: 'serre', frame: SERRE_FRAME },
    { id: 'verger', object: 'verger', tex: 'sign', suffixed: false, window: 'verger' },
    // panneau_ville.png (scripts/icones/art_ville.py) : la flèche est dessinée vers la gauche,
    // retournée ici pour montrer la sortie, à l'est.
    { id: 'ville', object: 'ville', tex: 'panneau_ville', suffixed: false, window: 'ville', flip: true },
    // silo.png (28×62, scripts/batiments/silo.py) : sur le rectangle `silo` de la carte.
    { id: 'silo', object: 'silo', tex: 'silo', suffixed: false, window: 'silo' },
  ];
  const MILL_FRAME = { frameWidth: 96, frameHeight: 128 };
  // panneaux_toit.png (scripts/batiments/panneaux_toit.py) : les panneaux solaires sur le
  // versant droit du toit de la maison, 6 images de 32×47 (la n-ième porte n panneaux),
  // posées au point (x, y) de house_sp.png. modèle.panneaux = nombre de panneaux (0 : aucun).
  const ROOF_PANELS = { key: 'panneaux_toit', file: 'panneaux_toit.png', frame: { frameWidth: 32, frameHeight: 47 }, x: 37, y: 2, max: 6 };
  // puits.png (scripts/batiments/puits.py) : 3 images de 34×40, le vieux puits seul (0), le
  // puits avec le tuyau de la pompe (1), la pompe seule (2), posée par-dessus une fois achetée.
  // modèle.pompe = la pompe est achetée ; modèle.pompeEnMarche = elle tourne (elle vibre alors
  // d'un pixel vers la droite, toutes les PUMP_SHAKE_MS).
  const WELL = { key: 'puits', file: 'puits.png', frame: { frameWidth: 34, frameHeight: 40 }, object: 'puits', frames: { puits: 0, tuyau: 1, pompe: 2 } };
  const PUMP_SHAKE_MS = 70;
  // citerne.png (scripts/batiments/citerne.py) : 5 images de 24×34, le tube de niveau vide
  // (0) jusqu'à plein (4). modèle.citerne = cette image, ou -1 tant que le réservoir n'est pas acheté.
  const TANK = { key: 'citerne', file: 'citerne.png', frame: { frameWidth: 24, frameHeight: 34 }, object: 'citerne', max: 4 };
  // Version 1.12 : images délabrées (scripts/batiments/ruines.py), montrées tant que le
  // bâtiment n'est pas réparé ou construit (modèle.batiments[id].ruine). Même taille et
  // même découpe que l'image d'origine.
  const RUINES = {
    maison: { key: 'house_sp_ruine', file: 'house_sp_ruine.png' },
    etable: { key: 'barn_sp_ruine', file: 'barn_sp_ruine.png' },
    moulin: { key: 'windmill_sp_ruine', file: 'windmill_sp_ruine.png', sheet: 'mill', frame: 0 },
    serre: { key: 'serre_sp_ruine', file: 'serre_sp_ruine.png', frame: 'batiment' },
    poulailler: { key: 'poulailler_ruine', file: 'poulailler_ruine.png', sheet: 'coop', frame: 0 },
    silo: { key: 'silo_ruine', file: 'silo_ruine.png' },
  };
  // chat.png : le chat de la vie d'ambiance, 8 cases de 16×16 (leur ordre : CAT_FRAMES dans
  // js/ambient-life.js). Sans l'image, pas de chat ; rien d'autre ne change.
  const CAT_FRAME = { frameWidth: 16, frameHeight: 16 };
  // fermier.png : le personnage (js/fermier.js), cases de 16×32 ; leurs noms dans fermier.json
  // (scripts/personnage/fermier.py). Sans eux, pas de personnage ; rien d'autre ne change.
  const FERMIER_FRAME = { frameWidth: 16, frameHeight: 32 };
  // La planche du personnage : la fermière (fermier.png existe aussi). Le choix du personnage
  // est désactivé pour l'instant : c'est toujours elle.
  const PERSONNAGE = 'fermiere';
  // Les bêtes de l'Étable et du Poulailler, elles aussi animées par la vie d'ambiance : une
  // planche par espèce (fichier, taille des cases ; leur ordre : HERD dans
  // js/ambient-life.js). Une espèce sans planche n'est pas dessinée.
  const HERD_SHEETS = {
    vache: ['vache.png', { frameWidth: 32, frameHeight: 24 }],
    mouton: ['mouton.png', { frameWidth: 32, frameHeight: 24 }],
    poule: ['poule.png', { frameWidth: 16, frameHeight: 16 }],
  };
  const COOP_FRAME = { frameWidth: 44, frameHeight: 55 };
  // Intérieurs : une petite carte Tiled à part, affichée à la place de la carte quand le
  // joueur entre dans le bâtiment (modèle.interieur). `zones` = nom des couches d'objets dont
  // le rectangle reçoit les parcelles, `plots` = leur liste dans le modèle, `window` = fenêtre
  // ouverte par une parcelle où il n'y a rien à faire, `building` = bâtiment devant lequel la
  // vue revient à la sortie. `props` = couche d'objets dont chaque rectangle nommé reçoit un
  // meuble (MEUBLES) : un appui sur le meuble ouvre la fenêtre de ce nom. `image` : un dessin
  // posé en fond à la place des tuiles (la Serre : scripts/batiments/serre_interieur.py).
  // Couche d'objets « passages » (facultative) : les rectangles « sol » (où le personnage
  // marche ; sans eux, les cases du sol de la carte) et le point « entree » (sans lui, le bas
  // de la vue, en son milieu).
  const ROOMS = {
    serre: { key: 'map_serre', json: 'serre_interieur.json', image: 'serre_interieur', zones: /^serre_zone_(\d+)$/, plots: 'serre', window: 'serre', building: 'serre' },
    maison: { key: 'map_maison', json: 'maison_interieur.json', props: 'meubles', window: 'maison', building: 'maison' },
  };
  // Meubles de la maison (scripts/batiments/meubles.py, assets/meuble_<dessin>.png) : posés en
  // bas au centre de leur rectangle. modèle.meubles[place] :
  //   - un nombre (four, cuisine, frigo) : 0 absent, 1 en filigrane (pas encore construit),
  //     2 construit ; le dessin porte le nom de la place, un appui ouvre sa fenêtre ;
  //   - { dessin } : un meuble posé là (décor, meuble acheté), qui ne s'ouvre pas.
  // Les tapis, les tableaux et la fenêtre sont à plat (sous tout le reste).
  const MEUBLES = [
    'four', 'cuisine', 'frigo', 'evier', 'plan', 'fenetre', 'plante', 'chaise', 'table', 'tapis_1', 'tapis_2', 'tapis_3',
    'lit_adulte', 'lit_enfant', 'chevet', 'canape', 'table_basse', 'tableau_1', 'tableau_2', 'tableau_3', 'paillasse',
    'lit_double',
  ];
  // La couverture seule de chaque lit (meuble_<lit>_drap.png) : posée par-dessus le personnage
  // quand il y dort (js/fermier.js). La paillasse : son lit tant qu'aucun lit n'est acheté.
  // (le lit double : deux lits adulte côte à côte, sur la ferme générée, js/carte/ferme/chantier.js)
  const LITS = ['lit_adulte', 'lit_enfant', 'paillasse', 'lit_double'];
  const MEUBLE_PLAT = /^(tapis|tableau|fenetre)/;
  const MEUBLE_GHOST = 0.35;
  const ROOM_GAP = 64 * T;     // les intérieurs sont posés à droite de la carte, hors de portée de la vue
  const ROOM_SHADE = 0.45;     // assombrissement des emplacements que le joueur n'a pas encore
  const ROOM_FADE_MS = 180;    // fondu à l'entrée et à la sortie
  const ROOM_PAD = { top: 44, bottom: 60 };   // px CSS laissés à l'objectif (en haut) et aux boutons (en bas)

  // l'appui et le double appui (sur l'herbe ou un chemin : le personnage y va), comme sur les
  // autres cartes (CarteKit.APPUI)
  const TAP_SLOP = K.APPUI.glisse, DOUBLE_TAP_MS = K.APPUI.doubleMs, DOUBLE_TAP_PX = K.APPUI.doublePx;
  const MIN_TAP = 44;          // px CSS : taille minimale de la zone d'appui d'un bâtiment
  const INERTIA_MS = 260;      // constante de temps de l'élan après un glissement
  const MAX_SPEED = 1.5;       // px de carte par ms
  const PAN_MS = 380;          // durée d'un déplacement demandé par panTo()
  const FOLLOW_MS = 250;       // la vue rattrape le personnage qui marche (constante de temps)
  const FOLLOW_UP = 20;        // px de carte : le centre de la vue, au-dessus de ses pieds
  const LABEL_GAP = 3;         // px CSS entre l'étiquette et ce qu'elle nomme
  const LABEL_HOLD_MS = 1200;  // au doigt : le nom reste affiché ce temps après le relâchement
  // Bulles (assets/bulle.png, au double) : la pointe est à BUBBLE_TIP_X px CSS du bord gauche
  // et BUBBLE_TIP_Y px au-dessus du bas (les mêmes que la bulle « +x », CarteKit.BULLE).
  const BUBBLE_TIP_X = K.BULLE.pointeX, BUBBLE_TIP_Y = K.BULLE.pointeY;
  // Le repas : la bulle des convives qui ont bien mangé.
  const JOIE = '😊';
  const LONG_PRESS_MS = 450;   // appui maintenu sur la citerne : sa bulle (litres) s'affiche
  const GROUND_CHECK_MS = 3000; // le fond de la carte est vérifié à ce rythme (voir repairGround)
  const SPRITE_CHECKS = 8;      // et, à chaque fois, autant d'arbres, de barrières ou de rochers
  const ZONE_LABEL_UP = 14;    // px de carte : l'étiquette de la zone passe au-dessus de la barrière

  // Ombres des bâtiments et des barrières : leur silhouette, noire et transparente, posée au
  // sol (sous tout le reste) et décalée vers la droite et le bas (lumière en haut à gauche).
  // Les ombres portées qui suivent le soleil (js/carte/ferme/soleil.js ; le soleil lui-même :
  // CarteKit.SOLEIL) : repeintes tous les `pas` h ; `base` : le pied d'une image est à tant de
  // px au-dessus de son bas ; sous tout ce qui est debout (`depth`). Le canevas couvre la vue et
  // `marge` px autour (la ferme générée est grande) ; une ombre porte jusqu'à `portee` px de son
  // pied.
  const SOLEIL = { pas: 0.1, base: 2, depth: 0.06, marge: 96, portee: 200 };

  const clamp = (v, lo, hi) => (hi < lo ? (lo + hi) / 2 : Math.min(hi, Math.max(lo, v)));

  // Le canvas est rendu à la densité de l'écran (plafonnée à 3, CarteKit.ratio) : avec un zoom
  // non entier, les pixels de la carte restent réguliers.
  const pixelRatio = K.ratio;

  const parties = [];
  global.FermeCarte = {
    C: { T, MAP, ZONE_TILES, SFX, VIEW_ROWS, ZONE_OBJECTS, TREE_OBJECT, TREE_FRAME, ORCHARD_FRAMES, ORCHARD_ADULT, TREE_BODY, CHOP_TREES, CHOP_FPS, FISHING, ROCKS, SPRINKLER, ROBOT, OCCLUDER_ALPHA, RAMASSABLES, BLOCS_CARTE, BETES, EXIT, HOLLOW, TALL_GRASS, COUP_FORT, DEFAULT_W, DEFAULT_H, DEFAULT_OBJECTS, SERRE_FRAMES, SERRE_FRAME, BUILDINGS, MILL_FRAME, ROOF_PANELS, WELL, PUMP_SHAKE_MS, TANK, RUINES, CAT_FRAME, FERMIER_FRAME, PERSONNAGE, HERD_SHEETS, COOP_FRAME, ROOMS, MEUBLES, LITS, MEUBLE_PLAT, MEUBLE_GHOST, ROOM_GAP, ROOM_SHADE, ROOM_FADE_MS, ROOM_PAD, TAP_SLOP, DOUBLE_TAP_MS, DOUBLE_TAP_PX, MIN_TAP, INERTIA_MS, MAX_SPEED, PAN_MS, FOLLOW_MS, FOLLOW_UP, LABEL_GAP, LABEL_HOLD_MS, BUBBLE_TIP_X, BUBBLE_TIP_Y, JOIE, LONG_PRESS_MS, GROUND_CHECK_MS, SPRITE_CHECKS, ZONE_LABEL_UP, SOLEIL },
    clamp, pixelRatio, reducedMotion: K.reduit, v: K.v,
    // les méthodes de la scène, fichier par fichier (voir js/farm-stage.js : sceneClass)
    parties,
    partie(methodes) { parties.push(methodes); },
  };
})(window);
