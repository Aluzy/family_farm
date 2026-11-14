/* carte/ferme/config.js — la scène de la ferme : ses réglages (window.FermeCarte).
 *
 * Les tables de la carte de la ferme (la carte Tiled, les bâtiments, les arbres, les rochers, la
 * pêche, les asperseurs, le robot…), lues par js/farm-stage.js et par les
 * fichiers de js/carte/ferme/. Chacun de ces fichiers ajoute ses méthodes à la scène de la ferme
 * par FermeCarte.partie({ … }) ; js/farm-stage.js les pose sur le prototype de la scène quand
 * il la crée. Les réglages communs à toutes les cartes sont dans js/carte/ (CarteKit).
 */
(function (global) {
  'use strict';

  const K = global.CarteKit;
  const T = K.T;
// Les cultures (crops.png, data/crops.json sprite) : le bas de la case du dessin, remonté de CULTURE_MONTE px au-dessus
// du bas de la case de terre, son milieu au milieu. Chaque dessin y est posé le milieu de sa masse du bas (la butte, le
// bulbe) sur le centre de la tache d'arrosage (scripts/carte/planche_cultures.py) : toutes au milieu de leur tache.
const CULTURE_MONTE = 0;
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
  // Sur téléphone et tablette (CarteKit.appareilMobile), deux doigts pincés dézooment la vue
  // de la ferme (js/carte/ferme/camera.js, pincement) : le zoom de VIEW_ROWS rangées est le plus
  // proche ; au plus loin, `min` fois lui, la vue couvre environ `ecrans` écrans (1 / √ecrans).
  const ZOOM = { ecrans: 3, min: 1 / Math.sqrt(3) };
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
  // L'ombre d'un arbre adulte du Verger (scripts/carte/ombre_arbre.py), posée sous lui :
  // CarteKit.NATURE.ombre (js/carte/nature.js).
  // Arbres de la carte (couches layer_tree_*, sauf layer_tree_top) qui se coupent à la hache :
  // un arbre est un groupe de cases voisines d'une même couche. Les arbres qui ont une feuille
  // de sprites tremblent sous le coup avec elle : `box`, leur
  // place dans la planche (colonne, rangée, largeur, hauteur, en tuiles) ; `dx, dy`, le coin
  // de l'image de la feuille par rapport au coin haut-gauche de l'arbre ; `frames`, les images
  // jouées. Les autres arbres tremblent d'un pixel, de gauche à droite.
  const CHOP_TREES = {
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
    fishColors: { k: '#23301f', g: '#5f7d3c', l: '#8fae5c', p: '#e08a86', w: '#eef0e4', G: '#3e5a2e', y: '#e2d77e', c: '#e8e0c0',
      d: '#2c4a6a', b: '#5a7a9a', s: '#c8d4dc', o: '#e0905a', r: '#c8604a', a: '#d8b04a', n: '#8a7a60' },
    fish: {
      truite: ['..kkkkk...', '.kglgglk.k', 'kkpppppkkk', '.kwwwwwk.k', '..kkkkk...'],
      brochet: ['..kkkkkkkk...', 'kkGyGGyGGyk.k', 'cwGGyGGyGGkkk', '.kcccccccck.k', '..kkkkkkkk...'],
    },
    // les poissons du grand monde (fiche 6b : ses lacs, ses rivières, sa mer), qui sautent jusqu'au
    // personnage comme ceux de la ferme ; pas dans l'eau des étangs de la ferme (eau.js : FISHING.fish)
    monde: {
      omble: ['..kkkkk...', '.kdbsbdk.k', 'kkrrrrrkkk', '.korrrok.k', '..kkkkk...'],
      dorade: ['..kkkk...', '.kbbbbk.k', 'kassssskk', 'ksssssskk', '.kwwwwk.k', '..kkkk...'],
      sardine: ['.kkkkkk..', 'kdbdbddkk', 'kssssssk.', '.kkkkkkkk'],
      anchois: ['.kkkkk..', 'kbbbbbkk', '.kssssk.', '..kkkk..'],
      goujon: ['.kkkkk..', 'knbnbnkk', 'kccccck.', '.kkkkkk.'],
      saumon: ['..kkkkkk...', '.kbsbsbsk.k', 'kksssssskkk', '.kppppppk.k', '..kkkkkk...'],
      bar: ['..kkkkkk...', '.kbbbbbbk.k', 'kksssssskkk', '.kwwwwwwk.k', '..kkkkkk...'],
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
  // Ce qu'on ramasse à la main sur la ferme générée (js/carte/ferme/cueillette.js) :
  // assets/ramassables.png (scripts/carte/ramassables.py), une image de 16 × 16 par sorte
  // (`frames`), le pied à `pied` px du haut de sa tuile ; `doigt` : px d'écran autour de lui où
  // un appui le prend.
  const RAMASSABLES = { key: 'ramassables', file: 'ramassables.png', frame: { frameWidth: 16, frameHeight: 16 }, frames: { petite_pierre: 0, morceau_bois: 1, fibre: 2, baies: 3, paille: 4, pomme_de_pin: 5, gland: 6, pousse_pin: 7, pousse_arbre: 8, botte: 9 }, pied: 14, doigt: 28,
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
    frames: { mur_pierre: 0, porte: 1, atelier: 2, paillasse: 3, drap: 4, four: 5, cuisiniere: 6, panneau: 7, batterie: 8, nichoir: 9, mangeoire: 10, bac_semis: 11, bloc_silo: 12, meule: 13, lanterne: 66, escalier: 69, ruche: 71, ruche_pleine: 72, bac_fleurs: 73, entonnoir: 74, botteleuse: 75, botteleuse_marche: 76, convoyeur: 77, convoyeur_bout: 79, boite_nourriture: 89,
      // les chaînes de production (js/carte/ferme/chaines.js) : le réservoir, sa jauge du vide au plein
      // (CHAINE_NIVEAUX images), puis chaque outil à l'arrêt, puis en marche (l'image suivante)
      reservoir: 209, pressoir: 214, centrifugeuse: 216, mixeur: 218, chaudron: 220, tonneau: 222, ensacheuse: 224,
      // la terrasse (les invitations, js/carte/ferme/invites.js) : la table, la chaise et le banc de jardin
      table_jardin: 226, chaise_jardin: 227, banc_jardin: 228,
      // les collections des biomes (le lot 4, data/plans.json)
      banc_rondins: 233, table_rondins: 234, chaise_peinte: 235, jarre_coquillages: 236, lanterne_papier: 237,
      bassin_nenuphars: 238, bassin: 238, banc_pierre: 239, jardiniere_pierre: 240, pergola: 241, bac_lavande: 242,
      // le mortier et son pilon (la station des colorants : scripts/carte/blocs.py mortier)
      mortier: 253,
      // le tonnelet d'affinage et de fermentation (js/carte/ferme/tonnelets.js : il s'écrase et se relève en action)
      tonnelet: 254,
      // le bac à compost : vide, moins de la moitié de ses engrais, la moitié au moins (+ son niveau, js/engine/compost.js)
      compost: 255 },
    // le mobilier de jardin tourné (js/engine/blocs.js, sensBloc ; scripts/carte/blocs.py) : son image dans
    // chaque sens (de face, vers la droite, de dos, vers la gauche) et s'il est retourné en miroir
    sens: {
      table_jardin: { images: [226, 226, 226, 226], miroir: [false, false, true, true] },
      chaise_jardin: { images: [227, 230, 229, 230], miroir: [false, false, false, true] },
      banc_jardin: { images: [228, 232, 231, 232], miroir: [false, false, false, true] },
      banc_rondins: { images: [233, 244, 243, 244], miroir: [false, false, false, true] },
      chaise_peinte: { images: [235, 246, 245, 246], miroir: [false, false, false, true] },
      banc_pierre: { images: [239, 248, 247, 248], miroir: [false, false, false, true] },
    },
    murs: 14, porteVerticale: 30, sols: 31, solDepth: 0.05,
    // les modèles de sols (scripts/carte/blocs.py MODELES_SOLS) : leurs 16 images raccordées,
    // depuis celle-ci + masque, comme le plancher ; les modèles de portes percés dans un mur
    // vertical (MODELES_PORTES) : leur image
    modelesSols: { sol_dalles: 90, sol_carrelage: 106, sol_tomettes: 122, sol_chevrons: 138, sol_marbre: 154, sol_paves: 170, sol_mosaique: 186,
      // (les sols de la boutique de gemmes, au bout de la planche : scripts/carte/blocs.py SOLS_BOUTIQUE)
      sol_meleze: 258, sol_blanchi: 274, sol_flotte: 290, sol_pastel: 306 },
    // les pas japonais (scripts/carte/pas_japonais.py) : des sols du dehors, à part (assets/pas_japonais.png,
    // images de 16 × 16 posées par le bas de la case), enfoncés dans l'herbe, qui la laisse voir. Par sorte,
    // 64 images depuis la sienne : (côté + 2 × forme) × 16 + masque des voisins ; le côté alterne d'une
    // case à l'autre (le pas à droite, puis à gauche de l'axe de l'allée), la forme se tire de la case.
    pasJaponais: { key: 'pas_japonais', file: 'pas_japonais.png', frame: { frameWidth: 16, frameHeight: 16 }, sortes: { sol_pas_ardoise: 0, sol_pas_pierre: 64, sol_pas_bois: 128 } },
    portesVerticales: { porte_chene: 202, porte_vitree: 203, porte_grange: 204, porte_bleue: 205, porte_fer: 206, porte_ecurie: 207, porte_blanche: 208 },
    // l'étage (un essai, js/carte/ferme/etage.js) : le haut de l'escalier (`haut`) ; l'étage
    // est dessiné `dy` px plus haut (la hauteur de la face des murs hauts : leurs faces se suivent) ; le niveau où l'on n'est pas,
    // en mode Construire : à `transparent` (quand on est dans le bâtiment, en bas : à `dedans`,
    // on n'en voit que son niveau) ; à l'étage, un voile sombre sur toute la
    // ferme (`voile`, `alpha` ; au-dessus de ce qui vole), et ce qui est de l'étage devant lui
    etage: { haut: 70, depasse: 8, dy: 30, transparent: 0.3, dedans: 0, voile: 0x0d1018, alpha: 0.62 },
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
      variantes: { mur_pierre: 0, mur_fenetre: 17, fenetre_ronde: 17, fenetre_cintree: 17, fenetre_volets: 17, fenetre_vitrail: 17, pierre_angle: 33, paroi_vitree: 97,
        // (les murs aux matières des immeubles de la ville : scripts/carte/blocs.py MATIERES_VILLE)
        mur_brique_rouge: 161, mur_brique_orange: 177, mur_brique_ocre: 193, mur_brique_bleue: 209, mur_pierre_taille: 225,
        // (le mur en bois : des planches couchées, scripts/carte/blocs.py mur_bois)
        mur_bois: 371,
        // (les murs de l'enceinte de la Serre, quels qu'ils soient : du verre dans des arêtes de
        // bois, scripts/carte/blocs.py verre_serre ; sa porte : `porteSerre`)
        mur_serre: 306 },
      porteSerre: 370,
      // la porte (d'un mur horizontal) dans un mur d'une autre matière que la pierre : le mur
      // voisin continue au-dessus d'elle (scripts/carte/blocs.py murs_hauts ; un linteau de bois
      // dans le mur en bois) ; les autres murs : `porte`, en pierre
      portes: { mur_brique_rouge: 387, mur_brique_orange: 388, mur_brique_ocre: 305, mur_brique_bleue: 389, mur_pierre_taille: 390, mur_bois: 391 },
      // les modèles de portes (scripts/carte/blocs.py MODELES_PORTES) : leur image dans un mur
      // horizontal, depuis celle-ci + le rang de la matière du mur voisin dans `matieresPortes`
      // (la pierre pour les autres : la fenêtre, la paroi vitrée…)
      modelesPortes: { porte_chene: 392, porte_vitree: 399, porte_grange: 406, porte_bleue: 413, porte_fer: 420, porte_ecurie: 427, porte_blanche: 434 },
      matieresPortes: ['mur_pierre', 'mur_brique_rouge', 'mur_brique_orange', 'mur_brique_ocre', 'mur_brique_bleue', 'mur_pierre_taille', 'mur_bois'],
      // `joints` : les murs qu'un voisin de même sorte prolonge (à gauche, à droite, des deux
      // côtés : deux fenêtres font une grande fenêtre, les parois vitrées une façade de verre)
      joints: { mur_fenetre: [17, 49, 65, 81], paroi_vitree: [97, 113, 129, 145], mur_serre: [306, 322, 338, 354] },
      // les fenêtres, percées dans un mur de n'importe quelle matière (modèle.blocs : b.mur, la
      // matière, rangée dans `matieresPortes` ; la pierre sans elle), rangées après les autres
      // murs (scripts/carte/blocs.py fenetres_hautes) : depuis leur image `modeles`, la fenêtre
      // à carreaux dans chaque matière, seule puis prolongée à gauche, à droite, des deux côtés
      // (`prolonge` : 4 × 16 images par matière) ; les autres modèles, 16 images par matière
      fenetres: { modeles: { mur_fenetre: 441, fenetre_ronde: 889, fenetre_cintree: 1001, fenetre_volets: 1113, fenetre_vitrail: 1225 }, prolonge: ['mur_fenetre'] },
      // le réverbère (la sorte « candelabre », fiche 15 : deux blocs de haut, scripts/carte/blocs.py
      // reverbere), rangé après les fenêtres : éteint, puis allumé (BLOCS_CARTE.candelabre.allumee)
      candelabre: 1337 },
    // la barrière : 16 images raccordées aux barrières voisines (barrieres + masque, comme les murs)
    barrieres: 50,
    // les barrières de couleur et leurs détails (assets/clotures.png, scripts/carte/blocs.py barrieres) : pour
    // chaque couleur (couleurs : son rang), chaque détail (details : combien ; js/carte/ferme/chantier.js en tire
    // un pour chaque case, d'après sa place), les 16 barrières raccordées : ((couleur × details + détail) × 16 + masque)
    clotures: { key: 'clotures', file: 'clotures.png', frame: { frameWidth: 16, frameHeight: 24 }, details: 12,
      couleurs: { barriere: 0, barriere_blanche: 1, barriere_rouge: 2, barriere_grise: 3, barriere_chene: 4, barriere_verte: 5, barriere_lavande: 6 },
    },
    // le portail (assets/portails.png, scripts/carte/blocs.py portails) : calé entre les poteaux de ses deux
    // voisines, son image dépasse de sa case (posée par `origine` : le milieu du bas de la case) ; fermé, ouvert
    // (rabattu contre la barrière de gauche) ; dans une barrière verticale, fermé, ouvert (rabattu contre celle du
    // dessus). Un appui l'ouvre ou le
    // ferme (chantier.js portailAt) ; fermé, il bloque (bloquent)
    portails: { key: 'portails', file: 'portails.png', frame: { frameWidth: 96, frameHeight: 64 }, origine: [46 / 96, 56 / 64],
      ferme: 0, ouvert: 1, vertical: 2, verticalOuvert: 3, sortes: ['portail', 'portail_ouvert'] },
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
    // le réverbère (la sorte « candelabre », qui a remplacé le candélabre ; fiche 15 : un bloc
    // `lumiere` comme la lanterne, chantier.js stepLanterns), deux blocs de haut : son image dans la
    // planche des murs hauts (hauts.candelabre ; sans elle, celle de la lanterne éteinte), allumé
    // avec la lanterne ; sa lueur (les images `allumee`) vacille, sa lumière est chaude : une large
    // flaque `sol` au pied, la lueur de sa lanterne `vitre` (en haut, dy px au-dessus du pied de la
    // case), un halo. Son image est remontée de `pied` px dans sa case (chantier.js, etage.js) : son
    // socle se pose dans la case, avec de l'herbe devant, et non sur son bord (la case du dessous) ;
    // sa lumière avec lui. Son ombre est celle de sa silhouette, pas d'un mur (soleil.js).
    candelabre: {
      allumee: [1338, 1339], fps: 5, vacille: 0.1, pied: 6,
      sol: { rayon: 62, aplati: 0.7, teinte: 0xffc070, alpha: 0.95, dx: 0, dy: -12 },
      vitre: { rayon: 16, teinte: 0xffe2a8, alpha: 0.95, dx: 0, dy: -39 },
      halo: { couleur: 0xffb050, rayon: 22, intensite: 0.1, attenuation: 0.08 },
    },
    // la lampe de la table de chevet (le meuble `dessin`, posé en bas ou à l'étage, de face, de dos ou de
    // profil : chantier.js stepLanterns) : elle s'allume le soir avec les lanternes (le voile de l'heure plus
    // sombre que `allume`) ; sa lumière, chaude, dans le voile : une flaque `sol` autour du meuble, la lueur
    // de son abat-jour `abatJour` (son milieu : `dy` px au-dessus du bas de l'image, rangée LAMPE_Y de
    // scripts/batiments/meubles.py, à la même place dans les trois vues), qui respire à peine ; un petit
    // halo par-dessus (WebGL)
    lampeChevet: {
      dessins: ['chevet', 'chalet_chevet', 'cottage_chevet', 'mer_chevet', 'fee_chevet', 'sapin_noel', 'citrouille_halloween', 'tas_citrouilles'],
      // (le sapin de Noël : sa lueur plus large, au milieu de ses branches)
      par: { sapin_noel: { sol: { rayon: 46, aplati: 0.7, teinte: 0xffd890, alpha: 0.85, dx: 0, dy: -6 }, abatJour: { rayon: 18, teinte: 0xfff0c0, alpha: 0.8, dx: 0, dy: -24 } },
        // (les citrouilles d'Halloween : une lueur orangée au ras du sol, celle de la bougie dans le visage)
        citrouille_halloween: { sol: { rayon: 30, aplati: 0.7, teinte: 0xff9a40, alpha: 0.85, dx: 0, dy: -2 }, abatJour: { rayon: 9, teinte: 0xffc060, alpha: 0.9, dx: 0, dy: -8 } },
        tas_citrouilles: { sol: { rayon: 40, aplati: 0.7, teinte: 0xff9a40, alpha: 0.85, dx: 0, dy: -2 }, abatJour: { rayon: 10, teinte: 0xffc060, alpha: 0.9, dx: 0, dy: -8 } } }, allume: 0.12, respire: 0.04,
      sol: { rayon: 38, aplati: 0.72, teinte: 0xffc878, alpha: 0.8, dx: 0, dy: -6 },
      abatJour: { rayon: 10, teinte: 0xfff0c8, alpha: 0.95, dx: 0, dy: -17 },
      halo: { couleur: 0xffc060, rayon: 16, intensite: 0.08, attenuation: 0.08 },
    },
    // le feu des cheminées (le meuble cheminee_<matière>, en bas ou à l'étage ; scripts/batiments/cheminees.py ;
    // chantier.js stepLanterns) : le soir (le voile de l'heure plus sombre que `allume`), ses `images` dansent
    // (`fps`) dans le foyer, le bas de l'image `dy` px au-dessus du bas de la cheminée ; sa lumière chaude dans
    // le voile : une large flaque `sol` devant elle, la lueur du `foyer`, qui vacille ; un halo (WebGL)
    cheminee: {
      key: 'cheminee_feu', file: 'cheminee_feu.png', frame: { frameWidth: 14, frameHeight: 12 }, images: 4, fps: 8, dy: 9,
      allume: 0.12, vacille: 0.12,
      sol: { rayon: 58, aplati: 0.7, teinte: 0xffa860, alpha: 0.95, dx: 0, dy: 4 },
      foyer: { rayon: 16, teinte: 0xffd090, alpha: 0.95, dx: 0, dy: -15 },
      halo: { couleur: 0xff9040, rayon: 22, intensite: 0.1, attenuation: 0.08 },
    },
    // l'eau des fontaines de jardin (le bloc fontaine_<modèle>, deux cases sur deux ; scripts/batiments/fontaines.py ;
    // chantier.js stepLanterns) : jour et nuit, ses `images` (une rangée par modèle, dans l'ordre de `modeles`)
    // défilent (`fps`) par-dessus la fontaine, au même endroit ; fixe en mode réduit
    fontaine: {
      key: 'fontaine_eau', file: 'fontaine_eau.png', frame: { frameWidth: 32, frameHeight: 47 }, images: 4, fps: 6,
      modeles: ['pierre', 'marbre', 'grenouille', 'angelot'], prefixe: 'fontaine_',
    },
    // les guirlandes du sapin de Noël (le meuble sapin_noel ; scripts/batiments/noel.py) : leurs ampoules clignotent
    // jour et nuit, ses `images` défilent par-dessus lui ; fixe en mode réduit
    sapin: {
      key: 'sapin_lumieres', file: 'sapin_lumieres.png', frame: { frameWidth: 26, frameHeight: 46 }, images: 4, fps: 3,
      modeles: ['noel'], prefixe: 'sapin_',
    },
    // la bougie des citrouilles d'Halloween (scripts/batiments/halloween.py) : sa lumière vacille dans les trous du
    // visage, jour et nuit (une rangée par décor, `dessins`) ; le soir, elles éclairent (lampeChevet.par)
    citrouilles: {
      key: 'citrouilles_bougie', file: 'citrouilles_bougie.png', frame: { frameWidth: 32, frameHeight: 24 }, images: 3, fps: 7,
      dessins: ['citrouille_halloween', 'tas_citrouilles'],
    },
    // ce qui tombe des arbres d'ornement (le bloc ornement_<espèce>, deux cases sur deux ; scripts/batiments/ornements.py) :
    // jour et nuit, les pétales (les feuilles) descendent en tournoyant, ses `images` (une rangée par espèce)
    // défilent (`fps`) par-dessus l'arbre ; fixe en mode réduit
    ornement: {
      key: 'ornements_chute', file: 'ornements_chute.png', frame: { frameWidth: 64, frameHeight: 80 }, images: 8, fps: 5,
      modeles: ['cerisier_japon', 'erable_rouge', 'magnolia', 'saule_pleureur'], prefixe: 'ornement_',
    },
    // les établis à feu des commerces ouverts (fiches I5a, I5c ; ATELIER.BLOCS[].allume : chantier.js stepFires,
    // stepLanterns), un par dessin éteint : la forge (enclume_foyer, scripts/batiments/forge.py) dont les braises
    // rougeoient, le four du boulanger (four_boulanger, scripts/batiments/commerces.py) dont le feu danse. Leurs `images`
    // défilent (`fps`) : au hasard (`hasard`) ou l'une après l'autre ; le soir (le voile plus sombre que `allume`), leur
    // lueur dans le voile : une flaque `sol` devant, la lueur du `foyer`, qui vacille ; un halo (WebGL)
    foyers: {
      enclume_foyer: {
        images: ['enclume_foyer_braise_0', 'enclume_foyer_braise_1'], hasard: true, fps: 5, allume: 0.12, vacille: 0.18,
        sol: { rayon: 54, aplati: 0.7, teinte: 0xff8c40, alpha: 0.9, dx: -6, dy: 2 },
        foyer: { rayon: 15, teinte: 0xffb060, alpha: 0.95, dx: -8, dy: -12 },
        halo: { couleur: 0xff7a30, rayon: 20, intensite: 0.1, attenuation: 0.08 },
      },
      four_boulanger: {
        images: ['four_boulanger_feu_0', 'four_boulanger_feu_1', 'four_boulanger_feu_2', 'four_boulanger_feu_3'], hasard: false, fps: 7, allume: 0.12, vacille: 0.14,
        sol: { rayon: 50, aplati: 0.7, teinte: 0xff9a48, alpha: 0.85, dx: -6, dy: 4 },
        foyer: { rayon: 13, teinte: 0xffc070, alpha: 0.95, dx: -7, dy: -9 },
        halo: { couleur: 0xff8a3a, rayon: 18, intensite: 0.1, attenuation: 0.08 },
      },
    },
    // le nom de la famille sur les enseignes de ferme (le bloc enseigne_<matière> ; chantier.js stepEnseignes) : écrit
    // sur la plaque, son milieu `dy` px au-dessus du bas de l'image, rapetissé s'il dépasse `largeur` px (sur deux
    // lignes s'il devait l'être plus que `deuxLignes` et qu'il a un espace ou un trait d'union) ; sa couleur
    // suit la peinture (data/meubles.json PEINTURES enseigne_<matière>, `texte`)
    enseigne: {
      taille: 7, ombre: 'rgba(0,0,0,0.35)', deuxLignes: 0.7,
      dy: { bois: 17.5, email: 17, fer: 16.5, village: 18.5, commerce: 26 }, largeur: { bois: 19, email: 19, fer: 15, village: 23, commerce: 22 },
    },
    // la lumière des maisons, la nuit (js/carte/ferme/fenetres.js) : une `teinte` chaude ; sur
    // le plancher des pièces (`piece` : unie, sur ce qu'on voit de chaque case) ; sur les vitres des
    // murs `sortes` (`vitre` : `dy` px au-dessus du pied du mur) ; sur la face du mur du fond,
    // tournée vers la pièce (`murFond` : unie, `haut` px depuis le pied du mur) ; les rayons des vitres de la façade (`rayons` : partis du bas de la vitre,
    // `mur` px au-dessus du pied du mur, puis sur le sol devant elle, larges de `vitre` px puis de
    // `large`, sur `cases` rangées) ; elle s'allume
    // et s'éteint à `vitesse` par seconde
    lumiereMaison: {
      sortes: ['mur_fenetre', 'fenetre_ronde', 'fenetre_cintree', 'fenetre_volets', 'fenetre_vitrail', 'paroi_vitree'], teinte: 0xffc673, vitesse: 1.5,
      piece: { alpha: 0.7 },
      vitre: { rayon: 7, alpha: 0.95, dy: -16 },
      murFond: { haut: 32, alpha: 0.7 },
      rayons: { mur: 8, vitre: 10, large: 28, cases: 2, alpha: 0.8 },
    },
    // le four qui cuit : ses flammes, une image après l'autre (`fps` images par seconde) ; le four redessiné (deux
    // cases, son dessin à lui : meuble_four.png éteint, `images` allumé, scripts/batiments/four.py)
    feu: { sorte: 'four', frames: [47, 48, 49], fps: 8, eteint: 'meuble_four', images: ['meuble_four_feu_0', 'meuble_four_feu_1', 'meuble_four_feu_2', 'meuble_four_feu_3', 'meuble_four_feu_4', 'meuble_four_feu_5', 'meuble_four_feu_6', 'meuble_four_feu_7'] },
    // la cuisinière qui cuit : le feu du foyer et les flammes sous la marmite bougent (`fps` images par seconde ;
    // éteinte : frames.cuisiniere, le foyer sombre ; scripts/carte/blocs.py cuisiniere) ; la vapeur qui monte de la
    // marmite (js/carte/ferme/vapeur.js) part de `marmite` (px dans son image de 16 × 24 : le couvercle)
    cuisine: { sorte: 'cuisiniere', frames: [249, 250, 251, 252], fps: 7, marmite: [5, 1] },
    // la meule qui moud (le Moulin en marche) : sa pierre et sa manivelle tournent (`fps` images
    // par seconde, un tour en 8 images ; chantier.js stepFires)
    meule: { sorte: 'meule', frames: [81, 82, 83, 84, 85, 86, 87, 88], fps: 8 },
    plats: ['paillasse', 'escalier'], bloquent: ['bassin', 'mur_pierre', 'mur_fenetre', 'fenetre_ronde', 'fenetre_cintree', 'fenetre_volets', 'fenetre_vitrail', 'pierre_angle', 'paroi_vitree', 'mur_brique_rouge', 'mur_brique_orange', 'mur_brique_ocre', 'mur_brique_bleue', 'mur_pierre_taille', 'mur_bois', 'barriere', 'barriere_blanche', 'barriere_rouge', 'barriere_grise', 'barriere_chene', 'barriere_verte', 'barriere_lavande', 'portail', 'atelier', 'four', 'cuisiniere', 'mortier', 'puits', 'citerne', 'panneau', 'batterie', 'nichoir', 'mangeoire', 'bac_semis', 'bloc_silo', 'meule', 'lanterne', 'candelabre', 'station_robot', 'entonnoir', 'botteleuse', 'convoyeur', 'reservoir', 'pressoir', 'centrifugeuse', 'mixeur', 'chaudron', 'tonneau', 'ensacheuse', 'boite_nourriture', 'ruche', 'tonnelet', 'compost', 'bac_fleurs', 'table_jardin', 'chaise_jardin', 'banc_jardin', 'banc_rondins', 'table_rondins', 'chaise_peinte', 'jarre_coquillages', 'lanterne_papier', 'bassin_nenuphars', 'banc_pierre', 'jardiniere_pierre', 'bac_lavande'],
    // dessinés par la scène avec leurs propres images (puits.png et sa pompe, citerne.png ; la
    // station du robot : station_robot.png, machines.js ; les blocs de silo : silo.js)
    ailleurs: ['puits', 'citerne', 'station_robot', 'bloc_silo', 'bassin'],
    // un appui sur le four ou la cuisinière ouvre la fenêtre de sa station ; sur le panneau, la
    // batterie, le puits ou la citerne, l'énergie ou l'eau ; sur le nichoir, le Poulailler ; sur la mangeoire, l'Étable ; sur le bac à semis, la Serre ;
    // sur la meule, le Moulin ; sur la boîte à nourriture, ce qu'elle contient (le silo : silo.js, siloAt)
    fenetres: { atelier: 'atelier', four: 'four', cuisiniere: 'cuisine', mortier: 'mortier', panneau: 'energie', batterie: 'energie', puits: 'eau', citerne: 'eau', nichoir: 'poulailler', mangeoire: 'etable', bac_semis: 'serre', meule: 'moulin', station_robot: 'robot', boite_nourriture: 'boite', refrigerateur: 'frigo', tonnelet: 'tonnelet', compost: 'compost', etal: 'etal', enclume_foyer: 'commerce', comptoir: 'commerce', enseigne_forge: 'commerce',
      scie_long: 'commerce', four_boulanger: 'commerce', cave_affinage: 'commerce', enseigne_scierie: 'commerce', enseigne_boulangerie: 'commerce', enseigne_fromagerie: 'commerce' },
    // le bloc clé de chaque bâtiment (étape 5b) : là où l'on ramasse ce qu'il donne (le silo :
    // le pied de sa première colonne)
    cles: { poulailler: 'nichoir', etable: 'mangeoire', serre: 'bac_semis', silo: 'bloc_silo' },
    voile: 0xc8ffb4, voileAlpha: 0.4, voileDepth: 0.08, coucheY: 4,
    // un lit acheté (meuble posé) : couché, ses pieds à `litPieds` px sous le haut du lit ; un
    // tableau : sur la face du mur, son bas à `tableau.dy` px au-dessus du bas de la case ; un
    // membre de la famille assis sur une chaise (js/famille-ferme.js) : ses pieds à `assisDy` px
    // au-dessus du bas de la case de la chaise
    litPieds: 27, tableau: { dy: 10 }, assisDy: 3,
    // les papiers peints (js/engine/papiers.js ; scripts/carte/papiers_peints.py) : une image de 16 × 30 par
    // motif, sur la face du mur du fond d'une pièce (les 30 px du bas de l'image du mur), `dz` devant lui
    // (derrière un tableau accroché, BLOCS_CARTE.tableau : y + 0.5) ; ils s'effacent avec lui (stepMurs)
    papiers: { key: 'papiers_peints', file: 'papiers_peints.png', frame: { frameWidth: 16, frameHeight: 30 }, dz: 0.3 },
    // les rosiers grimpants (la boutique ; scripts/carte/rosiers.py : 4 coloris de 20 × 40 px, la hauteur de
    // l'image d'un mur) : sur la face extérieure d'un mur, une image par bloc de sa hauteur, `dy` px plus haut à
    // chaque bloc (comme le mur rehaussé : BLOCS_CARTE.etage.dy)
    grimpants: { key: 'rosiers', file: 'rosiers.png', frame: { frameWidth: 20, frameHeight: 40 }, coloris: { multicolore: 0, rouge: 1, blanc: 2, jaune: 3 } },
    // les guirlandes lumineuses de la boutique (scripts/carte/guirlandes.py ; chantier.js syncGuirlandes) : un
    // segment de 16 × 12 en haut de la face extérieure du mur (`dy` px sous le haut de sa face, au bloc le plus
    // haut du mur), qui se raccorde à ses voisins ; par coloris (sa rangée), trois images : éteinte, allumée A,
    // allumée B. Le soir (le voile de l'heure plus sombre que `allume`), elles alternent au hasard (`fps` au
    // plus : elles scintillent) et chaque segment pose sa lueur (`lueur` : rayon, aplatie, alpha ; sa teinte
    // par coloris) dans le voile, sous lui (`lueur.dy`)
    guirlandes: {
      key: 'guirlandes', file: 'guirlandes.png', frame: { frameWidth: 16, frameHeight: 12 }, dy: 1, dz: 0.006,
      coloris: { blanche: 0, multicolore: 1, etoiles: 2, coeurs: 3 }, allume: 0.12, fps: 3,
      teintes: { blanche: 0xffe2a0, multicolore: 0xffc8c0, etoiles: 0xfff0a0, coeurs: 0xffa0c8 },
      lueur: { rayon: 18, aplati: 0.7, alpha: 0.95, dy: 8 },
    },
    // un lit tourné (A-1 ; scripts/batiments/meubles_sens.py, lit_dos, lit_cote) : le dormeur pivote avec
    // lui (sa tête sur l'oreiller) ; de dos, la tête en bas, ses pieds à `dos` px sous le haut du lit ; de
    // profil, couché en travers, ses pieds à `cote` px du bord de la tête de lit, au milieu du matelas (dont
    // le dessus commence `coteHaut` px sous le haut de l'image, au-dessus de `coteBas` px de cadre)
    litSens: { dos: 3, cote: 28, coteHaut: 8, coteBas: 4 },
  };
  // Les bêtes du Poulailler et de l'Étable de la ferme générée (chantier.js, syncBeasts) : leurs
  // planches (HERD_SHEETS : profil droit ; la poule aussi de face et de dos, scripts/carte/betes.py),
  // dehors dans l'enclos de jour[0] h à jour[1] h (comme la porte des bâtiments, ambient-life.js).
  // Par espèce : `vitesse` (px/s), `pas` (s par image de marche), `pause` (s entre deux trajets),
  // sa marche (marche : de profil ; la poule et la vache, face et dos : vers nous, de dos ; la vue
  // suit la direction du trajet), ce qu'elle fait à l'arrêt (anims : [images, s par image, part du
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
        face: ['bas0', 'bas1', 'bas0', 'bas2'], dos: ['haut0', 'haut1', 'haut2', 'haut3'],
        anims: { broute: [['broute0', 'broute1'], 0.55, 0.9], queue: [['queue', 'idle'], 0.22, 0.3] },
        frames: Object.assign({ bas0: 8, bas1: 9, bas2: 10, haut0: 11, haut1: 12, haut2: 13, haut3: 14 }, GRAZER) },
      // le cheval, à l'Écurie (assets/cheval.png, scripts/personnage/cheval.py ; chargé avec
      // son matériel, js/carte/cheval.js) : il va et vient dans l'enceinte, jour et nuit (debout)
      cheval: { key: 'cheval', vitesse: 9, pas: 0.18, pause: [3, 8], marche: ['marche0', 'marche1', 'marche2', 'marche3'],
        face: ['bas0', 'bas1', 'bas2', 'bas3'], dos: ['haut0', 'haut1', 'haut2', 'haut3'], nuit: ['idle'], poses: ['broute', 'broute', 'idle'],
        anims: { broute: [['broute', 'broute'], 0.6, 0.85], idle: [['idle'], 1, 1] },
        frames: { idle: 0, marche0: 1, marche1: 2, marche2: 3, marche3: 4, broute: 5, bas0: 6, bas1: 7, bas2: 8, bas3: 9, haut0: 10, haut1: 11, haut2: 12, haut3: 13 } },
    },
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
    zone_culture_2: { x: 622, y: 607.6, width: 130.8, height: 128.8 },
    silo: { x: 656, y: 238, width: 49, height: 64 },
    // Le puits, en haut à gauche du Moulin, sous le chemin (sur ses abords, que la houe ne
    // laboure pas). Dans Tiled : un rectangle nommé `puits` le déplace.
    puits: { x: 596, y: 390, width: 34, height: 38 },
    // La citerne, juste à droite de la pompe du puits (son tuyau rejoint le moteur).
    citerne: { x: 629, y: 394, width: 24, height: 34 },
  };
  [[942.9, 510.5], [1024.2, 528.2], [864.1, 545.2], [831.3, 578.6], [958.7, 561.6], [1039.3, 579.2],
    [912, 578], [848.4, 625.2], [944.2, 610.1], [992.1, 627.1], [896.9, 641], [944.8, 673.1]]
    .forEach((p, i) => { DEFAULT_OBJECTS[TREE_OBJECT + (i + 1)] = { x: p[0], y: p[1], width: 63.7, height: 78.2 }; });
  // puits.png (scripts/batiments/puits.py) : 3 images de 50×50 vues de haut à 45°, le puits
  // seul (0), le puits avec le tuyau de la pompe (1), la pompe seule (2), posée par-dessus une
  // fois achetée.
  // modèle.pompe = la pompe est achetée ; modèle.pompeEnMarche = elle tourne (elle vibre alors
  // d'un pixel vers la droite, toutes les PUMP_SHAKE_MS).
  const WELL = { key: 'puits', file: 'puits.png', frame: { frameWidth: 50, frameHeight: 50 }, object: 'puits', frames: { puits: 0, tuyau: 1, pompe: 2 } };
  const PUMP_SHAKE_MS = 70;
  // citerne.png (scripts/batiments/citerne.py) : des images de 28×58 vues de haut à 45°, 5 à
  // la suite par niveau du réservoir (la cuve plus haute à chaque niveau), le tube de niveau
  // vide (0) jusqu'à plein (4) : (niveau - 1) × 5 + remplissage. modèle.citerne = cette image, ou
  // -1 tant que le réservoir n'est pas acheté.
  const TANK = { key: 'citerne', file: 'citerne.png', frame: { frameWidth: 28, frameHeight: 58 }, object: 'citerne', max: 24 };
  // Les animaux de compagnie de la vie d'ambiance (chat.png, chien.png…) : 8 cases de 16×16
  // (leur ordre : CAT_FRAMES dans js/ambient-life.js). Sans l'image, pas d'animal ; rien d'autre ne change.
  const CAT_FRAME = { frameWidth: 16, frameHeight: 16 };
  // Les planches des animaux de compagnie (assets/<nom>.png, scripts/compagnons/compagnons.py) :
  // le n-ième chat de la famille prend la n-ième robe de chat, de même pour les chiens.
  const COMPAGNONS = ['chat', 'chat_2', 'chat_3', 'chien', 'chien_2', 'chien_3'];
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
  // Les meubles de la maison (scripts/batiments/meubles.py, assets/meuble_<dessin>.png), posés en
  // blocs dans une pièce close (js/carte/ferme/chantier.js) ; le réfrigérateur aussi.
  const MEUBLES = [
    'chaise', 'table', 'tapis_1', 'tapis_2', 'tapis_3',
    'lit_adulte', 'lit_enfant', 'chevet', 'canape', 'table_basse', 'tableau_1', 'tableau_2', 'tableau_3', 'paillasse',
    'lit_double', 'refrigerateur',
    // (les cheminées de la boutique de gemmes : scripts/batiments/cheminees.py ; leur feu, BLOCS_CARTE.cheminee)
    'cheminee_pierre', 'cheminee_briques', 'cheminee_marbre',
    // (les fontaines de jardin : scripts/batiments/fontaines.py ; leur eau, BLOCS_CARTE.fontaine)
    'fontaine_pierre', 'fontaine_marbre', 'fontaine_grenouille', 'fontaine_angelot',
    // (les arbres d'ornement : scripts/batiments/ornements.py ; ce qui en tombe, BLOCS_CARTE.ornement)
    'ornement_cerisier_japon', 'ornement_erable_rouge', 'ornement_magnolia', 'ornement_saule_pleureur',
    // (les enseignes de ferme et leurs boîtes aux lettres : scripts/batiments/enseignes.py ; le nom, BLOCS_CARTE.enseigne)
    'enseigne_bois', 'enseigne_email', 'enseigne_fer', 'boite_lettres_bois', 'boite_lettres_email', 'boite_lettres_fer',
    // (la boîte aux lettres d'un villageois, l'île à bâtir : scripts/batiments/boite_villageois.py)
    'boite_aux_lettres',
    // (le panneau du village, l'île à bâtir : scripts/batiments/panneau_village.py ; son nom, BLOCS_CARTE.enseigne « village »)
    'panneau_village',
    // (les bâtiments des projets du village, l'île à bâtir, fiche I8a : scripts/batiments/projets_village.py ; en
    // chantier, puis achevés : js/engine/projets-village.js dessinProjet)
    'lavoir', 'lavoir_chantier', 'kiosque', 'kiosque_chantier', 'fontaine_village', 'fontaine_village_chantier',
    'four_commun', 'four_commun_chantier',
    // (le quai de chargement de la ferme productive, l'île à bâtir, fiche I8b : scripts/batiments/quai_chargement.py)
    'quai_chargement',
    // (la forge, l'île à bâtir, fiche I5a : scripts/batiments/forge.py ; l'enclume et son foyer, éteint ou ses braises qui
    // rougeoient, le comptoir d'un commerce, l'enseigne du forgeron ; la lueur du soir, BLOCS_CARTE.foyers)
    'enclume_foyer', 'enclume_foyer_braise_0', 'enclume_foyer_braise_1', 'comptoir', 'enseigne_forge',
    // (la scierie, la boulangerie, la fromagerie, fiche I5c : scripts/batiments/commerces.py ; la scie de long et
    // l'établi, le four à bois éteint ou son feu, la cave d'affinage, leurs trois enseignes)
    'scie_long', 'four_boulanger', 'four_boulanger_feu_0', 'four_boulanger_feu_1', 'four_boulanger_feu_2', 'four_boulanger_feu_3',
    'cave_affinage', 'enseigne_scierie', 'enseigne_boulangerie', 'enseigne_fromagerie',
    // (le pont de planches, hors de la ferme, l'île à bâtir : scripts/carte/portage.py ; son image suit son sens et ses voisins)
    'pont_planches_ns_0', 'pont_planches_ns_1', 'pont_planches_ns_2', 'pont_planches_ns_3',
    'pont_planches_eo_0', 'pont_planches_eo_1', 'pont_planches_eo_2', 'pont_planches_eo_3',
    // (les ensembles à thème : scripts/batiments/ensemble_chalet.py)
    'chalet_lit', 'chalet_chevet', 'chalet_tapis', 'chalet_tableau',
    'cottage_lit', 'cottage_chevet', 'cottage_tapis', 'cottage_tableau',
    'mer_lit', 'mer_chevet', 'mer_tapis', 'mer_tableau',
    'fee_lit', 'fee_chevet', 'fee_tapis', 'fee_tableau',
    // (les décors de Noël : scripts/batiments/noel.py ; les guirlandes du sapin, BLOCS_CARTE.sapin)
    'sapin_noel', 'couronne_noel', 'bonhomme_neige',
    // (les décors d'Halloween : scripts/batiments/halloween.py ; leur bougie, BLOCS_CARTE.citrouilles)
    'citrouille_halloween', 'tas_citrouilles',
    // (les décors de Pâques : scripts/batiments/paques.py)
    'panier_oeufs', 'oeuf_geant',
    // (scripts/batiments/meubles45.py : en vue de haut à 45°, comme les blocs)
    'buffet', 'commode', 'armoire_chene', 'armoire_peinte', 'armoire_glace', 'cuisine_porte',
    'cuisine_tiroirs', 'cuisine_sauge', 'poubelle', 'bibliotheque', 'bibliotheque_vitree', 'lampadaire',
    'coffre_jouets', 'plante_ficus', 'plante_monstera', 'plante_sansevieria', 'plante_cactus', 'plante_fougere',
    'plante_palmier', 'plante_citronnier', 'plante_orchidee', 'plante_aloe', 'plante_bonsai',
    // le distributeur de grain et sa mangeoire (scripts/batiments/distributeur.py ; leur image
    // suit le blé qu'ils contiennent)
    'distributeur_0', 'distributeur_1', 'distributeur_2', 'distributeur_3', 'distributeur_4',
    'mangeoire_grain_vide', 'mangeoire_grain_pleine',
    // l'étal du joueur (l'île à bâtir, fiche I4 : scripts/batiments/etal.py) : vide, ou garni de ce qu'il vend
    'etal_vide', 'etal_garni',
    // le râtelier de l'Écurie (scripts/personnage/cheval.py)
    'ratelier',
    // le four, redessiné par le joueur (scripts/batiments/four.py) : éteint, puis les images de son feu (FOUR)
    'four', 'four_feu_0', 'four_feu_1', 'four_feu_2', 'four_feu_3', 'four_feu_4', 'four_feu_5', 'four_feu_6', 'four_feu_7',
  ];
  // Les meubles qui tournent vraiment (data/recipes.json, ATELIER.BLOCS[].tourne : true) : leur vue de dos
  // et de profil (assets/meuble_<dessin>_dos.png, _cote.png ; scripts/batiments/meubles_sens.py).
  const MEUBLES_SENS = [
    'chaise', 'table', 'tapis_1', 'tapis_2', 'tapis_3', 'chevet', 'canape', 'table_basse', 'buffet', 'commode',
    'armoire_chene', 'armoire_peinte', 'armoire_glace', 'cuisine_porte', 'cuisine_tiroirs', 'cuisine_sauge',
    'bibliotheque', 'bibliotheque_vitree', 'coffre_jouets',
    // (A-1)
    'lit_adulte', 'lit_enfant', 'refrigerateur',
    // (les ensembles à thème de la boutique de gemmes)
    'chalet_lit', 'chalet_chevet', 'chalet_tapis', 'cottage_lit', 'cottage_chevet', 'cottage_tapis',
    'mer_lit', 'mer_chevet', 'mer_tapis',
    'fee_lit', 'fee_chevet', 'fee_tapis',
  ];
  // La couverture seule de chaque lit (meuble_<lit>_drap.png) : posée par-dessus le personnage
  // quand il y dort (js/fermier.js). La paillasse : son lit tant qu'aucun lit n'est acheté.
  // (le lit double : deux lits adulte côte à côte, sur la ferme générée, js/carte/ferme/chantier.js)
  const LITS = ['lit_adulte', 'lit_enfant', 'paillasse', 'lit_double', 'chalet_lit', 'cottage_lit', 'mer_lit', 'fee_lit'];
  // (A-1) les lits qui tournent : la couverture de leurs vues de dos et de profil (meuble_<lit>_dos_drap.png,
  // _cote_drap.png)
  const LITS_SENS = ['lit_adulte', 'lit_enfant', 'chalet_lit', 'cottage_lit', 'mer_lit', 'fee_lit'];
  // Les bacs à fleurs (js/engine/bacs.js, dessinBac ; scripts/carte/bacs.py) : une planche, une image de
  // cellule[0] × cellule[1] par état (le bac rond et le carré : `largeur` px à gauche), découpée en images
  // « meuble_<nom> » (js/farm-stage.js, chargerTard), dessinées comme un meuble (et repeintes de même).
  const BAC_ETATS = ['vide', 'semis', ...['coquelicot', 'pavot', 'tournesol', 'myosotis', 'lavande', 'lupin'].flatMap((f) => [f + '_1', f + '_2', f])];
  const BACS = { key: 'bacs', file: 'bacs.png', cellule: [32, 24], largeur: { rond: 16, carre: 16, long: 32 },
    noms: ['rond', 'carre', 'long'].flatMap((forme) => BAC_ETATS.map((e) => ['bac_' + forme + '_' + e, forme])) };

  // l'appui et le double appui (sur l'herbe ou un chemin : le personnage y va), comme sur les
  // autres cartes (CarteKit.APPUI)
  const TAP_SLOP = K.APPUI.glisse, DOUBLE_TAP_MS = K.APPUI.doubleMs, DOUBLE_TAP_PX = K.APPUI.doublePx;
  const MIN_TAP = 44;          // px CSS : taille minimale de la zone d'appui d'un bâtiment
  const INERTIA_MS = 260;      // constante de temps de l'élan après un glissement
  const MAX_SPEED = 1.5;       // px de carte par ms
  const PAN_MS = 380;          // durée d'un déplacement demandé par panTo()
  const FOLLOW_MS = 250;       // la vue rattrape le personnage qui marche (constante de temps)
  // Construire : les cases blanches (js/farm-stage.js, syncConstructible) testées sur l'écran et
  // `marge` cases autour, `budgetMs` au plus par image.
  const CONSTRUCTIBLE = { marge: 3, budgetMs: 6 };
  const FOLLOW_UP = 20;        // px de carte : le centre de la vue, au-dessus de ses pieds
  const LABEL_GAP = 3;         // px CSS entre l'étiquette et ce qu'elle nomme
  const LABEL_HOLD_MS = 1200;  // au doigt : le nom reste affiché ce temps après le relâchement
  // Bulles (assets/bulle.png, au double) : la pointe est à BUBBLE_TIP_X px CSS du bord gauche
  // et BUBBLE_TIP_Y px au-dessus du bas (les mêmes que la bulle « +x », CarteKit.BULLE).
  const BUBBLE_TIP_X = K.BULLE.pointeX, BUBBLE_TIP_Y = K.BULLE.pointeY;
  // Les abeilles des ruches (js/carte/ferme/abeilles.js) : `parRuche` par ruche, de quelques
  // pixels (`dessin` : 2 images, les ailes levées puis baissées, `battements` par seconde ;
  // `couleurs`). Elles sortent par le trou de vol (`trou` px au-dessus du pied de la case),
  // volent à `vitesse` px/s (`vol` px au-dessus du sol au plus, un zigzag de ± `zigzag` px) vers
  // une fleur à moins de `portee` px, y butinent `butine` s, rentrent, restent `dedans` s dans
  // la ruche, ressortent ; de `heures[0]` à `heures[1]` h. Dessinées `dessus` plus loin que leur
  // point au sol (devant ce qu'elles survolent). Les fleurs d'un bac à fleurs : `bac` px au-dessus
  // du pied de sa case. Une ruche loin de la vue : ses abeilles ne bougent que toutes les `loinPas` s
  // (fiche 33).
  const ABEILLES = { key: 'abeille', parRuche: 4, trou: 5, bac: 16, portee: 9 * T, vitesse: 26, vol: 6, zigzag: 1.5,
    butine: [1.5, 4], dedans: [1, 4], heures: [7, 19.5], battements: 14, dessus: 24, loinPas: 0.5,
    dessin: [['.ww.', 'ybyk'], ['....', 'ybyk']],
    couleurs: { y: '#f6c02c', b: '#2a1c10', k: '#2a1c10', w: 'rgba(232,246,255,0.85)' } };
  // La bulle du compagnon (js/carte/ferme/etiquettes.js compagnonDit) : l'appui sur lui (`boite` : autour de
  // ses pieds, en px de carte), la bulle `dessus` px au-dessus de ses pieds ; une bulle à boutons attend
  // `attente` ms au plus la réponse, une bulle sans bouton reste `dit` ms (sauf autre durée).
  const AIDE = { boite: { l: 8, h: 30, bas: 3 }, dessus: 30, attente: 15000, dit: 3500 };
  // La botteleuse (js/carte/ferme/botteleuse.js, js/engine/botteleuse.js) : un appui sur une de
  // ses pièces, le personnage va à gauche de l'entonnoir (sinon devant lui, `devant` px sous le
  // bas de sa case, sinon derrière) et y jette ses fibres (geste « jeter ») ; des brins (RAMASSABLES : fibre) volent de ses
  // mains à la bouche de l'entonnoir (`bouche` : px au-dessus du bas de sa case) en `volMs` ms.
  // La machine pleine vibre `vibre` s (DATA.BOTTELEUSE.VIBRE_S : le moteur le dit) de ±`secousse`
  // px, toutes les `secousseMs` ms, son voyant allumé ; la bande du convoyeur tourne (une image
  // toutes les `bandeMs` ms) pendant qu'elle vibre et que la botte avance. La botte (RAMASSABLES :
  // botte) sort à droite de la machine, posée sur la bande (`bande` px au-dessus du bas de la
  // case), avance à `vitesse` px/s jusqu'au bout du convoyeur, puis tombe au sol (`chuteMs` ms,
  // en rebondissant) sur la case au bout, à `pose` px sous son haut : le jeu en fait un morceau
  // de paille à ramasser en marchant dessus.
  const BOTTELEUSE = { devant: 6, bouche: 18, volMs: 380, secousse: 1, secousseMs: 60, bandeMs: 110, bande: 7, vitesse: 18, chuteMs: 420, pose: 14 };
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
  // (mursHameaux : les images des hameaux qui sont des murs, des fenêtres ou des portes : leur ombre
  // est celle d'un volume de leur case, comme les murs de la ferme, et non celle de leur dessin : soleil.js
  // sunPrisms, hameaux.js hameauxMurs)
  const SOLEIL = { pas: 0.1, base: 2, depth: 0.06, marge: 96, portee: 200, mursHameaux: /^(mur_|fenetre_|porte)/ };

  // Les touffes d'herbe au pied de ce qui est posé sur l'herbe (js/carte/ferme/herbes.js) : le
  // bas des murs (ceux de la ferme, et ceux des maisons des hameaux : `mursHameaux`), le pied des
  // poteaux de barrière, le bas et les côtés des sols posés dehors (ceux de la ferme, et les dalles
  // des hameaux : `dallesHameaux`). Une touffe tous les `pas` px (au hasard entre les deux), en
  // éventail (`touffe` : décalage, hauteur, penchant de la pointe de chaque brin ; `petite` sous un
  // poteau) ; sur les côtés d'un sol, des brins penchés vers lui, une rangée sur `cotes`. Leurs
  // couleurs : celles de l'herbe juste dessous (sa teinte sombre `teintes[0]`, moyenne, claire :
  // des quantiles de sa luminance), lues dans le sol peint, sur `fenetre` px de part et d'autre et
  // de profondeur ; sans assez d'herbe dessous (`herbeMin` de ses pixels), rien. Devant un mur : `dessus` au-dessus de son
  // image ; sur un sol, à `plat` (au-dessus des sols, sous la terre des parcelles et les ombres).
  const HERBES = {
    pas: [6, 10], cotes: 0.15, fenetre: 4, herbeMin: 0.4, teintes: [0.1, 0.45, 0.75], dessus: 0.02, plat: 0.052,
    // les dalles des hameaux (assets/hameaux.json) : leurs planchers, dalles, tomettes, pavés
    dallesHameaux: /^(sol_|paves$)/,
    // les murs des maisons des hameaux (assets/hameaux.json) : leurs murs et leurs fenêtres
    mursHameaux: /^(mur_|fenetre_)/,
    touffe: [[-2, 2, -1], [-1, 4, -1], [0, 5, 0], [1, 4, 1], [2, 2, 1]],
    petite: [[-1, 3, -1], [0, 4, 0], [1, 3, 1]],
    // au pied du puits et du silo (herbes.js piedHerbe) : jusqu'à combien de px au-dessus du plus bas le contour
    // compte, les fleurs (combien, leurs pétales, leur cœur)
    contour: 6, fleurs: 4, couleursFleurs: ['#f7f3e6', '#f2a7cf', '#b7a6ee', '#f6f2e4'], coeurFleur: '#f4cf3a',
  };

  const clamp = (v, lo, hi) => (hi < lo ? (lo + hi) / 2 : Math.min(hi, Math.max(lo, v)));

  // Le canvas est rendu à la densité de l'écran (plafonnée à 3, CarteKit.ratio) : avec un zoom
  // non entier, les pixels de la carte restent réguliers.
  const pixelRatio = K.ratio;

  const parties = [];
  global.FermeCarte = {
    C: { T, CULTURE_MONTE, MAP, ZONE_TILES, SFX, VIEW_ROWS, ZOOM, ZONE_OBJECTS, TREE_OBJECT, TREE_FRAME, ORCHARD_FRAMES, ORCHARD_ADULT, TREE_BODY, CHOP_TREES, CHOP_FPS, FISHING, ROCKS, SPRINKLER, ROBOT, OCCLUDER_ALPHA, RAMASSABLES, BLOCS_CARTE, BETES, TALL_GRASS, COUP_FORT, DEFAULT_W, DEFAULT_H, DEFAULT_OBJECTS, WELL, PUMP_SHAKE_MS, TANK, CAT_FRAME, COMPAGNONS, FERMIER_FRAME, PERSONNAGE, HERD_SHEETS, MEUBLES, MEUBLES_SENS, LITS, LITS_SENS, BACS, TAP_SLOP, DOUBLE_TAP_MS, DOUBLE_TAP_PX, MIN_TAP, INERTIA_MS, MAX_SPEED, PAN_MS, FOLLOW_MS, FOLLOW_UP, CONSTRUCTIBLE, LABEL_GAP, LABEL_HOLD_MS, BUBBLE_TIP_X, BUBBLE_TIP_Y, AIDE, ABEILLES, BOTTELEUSE, LONG_PRESS_MS, GROUND_CHECK_MS, SPRITE_CHECKS, ZONE_LABEL_UP, SOLEIL, HERBES },
    clamp, pixelRatio, reducedMotion: K.reduit, v: K.v,
    // les méthodes de la scène, fichier par fichier (voir js/farm-stage.js : sceneClass)
    parties,
    partie(methodes) { parties.push(methodes); },
  };
})(window);
