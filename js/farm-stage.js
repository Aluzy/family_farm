/* farm-stage.js — la carte de la ferme, dessinée avec Phaser 3.
 *
 * Règles d'architecture (voir docs/architecture-phaser.md) :
 *   1. Ce fichier ne lit JAMAIS l'état du jeu. Il reçoit un « modèle de vue »
 *      (objet simple, voir stageModel() dans js/app.js) et l'affiche.
 *   2. Il n'écrit JAMAIS dans le jeu. Un appui sur la carte appelle
 *      bridge.act(action, données) : la page déclenche alors la même
 *      action `data-action` qu'un bouton du DOM (même code, mêmes fenêtres,
 *      même suivi de session).
 *   3. sync(modèle) est idempotent : appelé 5 fois par seconde avec le même
 *      modèle, il ne fait rien ; appelé avec un modèle différent, il crée,
 *      met à jour ou détruit exactement ce qui a changé.
 *
 * La carte (Tiled, 72×57 tuiles de 16 px) est plus grande que l'écran : le zoom en montre
 * 21 rangées, et le doigt (ou la souris) la fait glisser dans les deux sens. Trois repères
 * (l'étable, la maison, le moulin et la serre) servent de points d'arrêt. Elle porte deux
 * zones de parcelles (la Zone de culture et le Champ) et les arbres du Verger.
 *
 * Par-dessus la carte, la scène pose des étiquettes en DOM (nom du bâtiment et pastille
 * « à faire », données par le modèle) qu'elle replace à chaque image, et un voile de
 * lumière qui suit l'heure du modèle (aube, plein jour, soir, nuit).
 *
 * API publique : FarmStage.mount(element, { act, onView, pickup, icone, base, crops }) puis
 *                FarmStage.update(modèle), FarmStage.show(), FarmStage.hide(),
 *                FarmStage.ready() (la scène est-elle affichable ?),
 *                FarmStage.view() (où en est la vue : repère 0, 1 ou 2, bornes),
 *                FarmStage.hasRoom(id) (l'intérieur d'un bâtiment peut-il être affiché ?),
 *                FarmStage.hasFermier() (le personnage est-il là pour ramasser ?),
 *                FarmStage.panTo(x, point { x, y } ou id de bâtiment) (glisse jusque-là).
 *                onView(vue) est appelé quand l'écran courant change, quand un bord est
 *                atteint ou quitté, et au premier glissement du joueur.
 *                Version 1.18 : pickup(id) met un tas « à ramasser » dans l'inventaire et
 *                renvoie son contenu ({ item: qté }) ; icone(item) donne son emoji.
 */
(function (global) {
  'use strict';

  const T = 16;
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
  const SUFFIXES = [SFX];
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
  // Version 1.13 : verger.png, 6 images de 80×80 : emplacement libre, jeune arbre, arbuste,
  // arbre, pommier en fruits, poirier en fruits (scripts/verger/arbres.py).
  const ORCHARD_FRAMES = { libre: 0, jeune: 1, arbuste: 2, arbre: 3, pommier: 4, poirier: 5 };
  const ORCHARD_ADULT = 3;                                   // à partir de l'arbre : feuilles et écureuils
  const TREE_BODY = 0.8;                                     // part de l'image qu'occupe l'arbre, en largeur
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
    arbre_clair: { box: [48, 50, 3, 4], key: 'arbre_clair_sp', dx: 0, dy: 0, frames: [0, 1, 2, 3, 4, 5, 6, 7, 0] },
    pin_clair: { box: [52, 50, 4, 4], key: 'pin_clair_sp', dx: 0, dy: 0, frames: [0, 1, 2, 3, 4, 5, 6, 7, 0] },
  };
  const CHOP_FPS = 12;
  const SHADOWS = { key: 'ombres_arbres', file: 'ombres_arbres.png', depth: 0.05 };
  const TREE_SHADOW = { key: 'ombre_arbre', file: 'ombre_arbre.png', dx: -16, dy: -8 };
  // Sans carte : mêmes dimensions et mêmes rectangles que carte_printemps.json.
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
  };
  [[942.9, 510.5], [1024.2, 528.2], [864.1, 545.2], [831.3, 578.6], [958.7, 561.6], [1039.3, 579.2],
    [912, 578], [848.4, 625.2], [944.2, 610.1], [992.1, 627.1], [896.9, 641], [944.8, 673.1]]
    .forEach((p, i) => { DEFAULT_OBJECTS[TREE_OBJECT + (i + 1)] = { x: p[0], y: p[1], width: 63.7, height: 78.2 }; });
  // serre_*.png : deux découpes possibles (largeur × hauteur depuis le coin haut-gauche).
  //   « batiment » : la verrière seule, de la taille du rectangle `serre` de la carte ;
  //   « cour »     : la verrière et sa cour pavée (tout le haut de la planche, au-dessus des bacs).
  const SERRE_FRAMES = {
    batiment: { sp: [94, 83] },
    cour: { sp: [177, 144] },
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
  // meuble (MEUBLES) : un appui sur le meuble ouvre la fenêtre de ce nom.
  const ROOMS = {
    serre: { key: 'map_serre', json: 'serre_interieur.json', zones: /^serre_zone_(\d+)$/, plots: 'serre', window: 'serre', building: 'serre' },
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
    'lit_adulte', 'lit_enfant', 'chevet', 'canape', 'table_basse', 'tableau_1', 'tableau_2', 'tableau_3',
  ];
  const MEUBLE_PLAT = /^(tapis|tableau|fenetre)/;
  const MEUBLE_GHOST = 0.35;
  const ROOM_GAP = 64 * T;     // les intérieurs sont posés à droite de la carte, hors de portée de la vue
  const ROOM_SHADE = 0.45;     // assombrissement des emplacements que le joueur n'a pas encore
  const ROOM_FADE_MS = 180;    // fondu à l'entrée et à la sortie
  const ROOM_PAD = { top: 44, bottom: 60 };   // px CSS laissés à l'objectif (en haut) et aux boutons (en bas)

  const TAP_SLOP = 8;
  const DOUBLE_TAP_MS = 300;   // deux appuis rapprochés sur l'herbe ou un chemin : le personnage y va
  const DOUBLE_TAP_PX = 30;    // px CSS entre les deux appuis, au plus          // px CSS : au-delà, le geste est un glissement, pas un appui
  const MIN_TAP = 44;          // px CSS : taille minimale de la zone d'appui d'un bâtiment
  const INERTIA_MS = 260;      // constante de temps de l'élan après un glissement
  const MAX_SPEED = 1.5;       // px de carte par ms
  const PAN_MS = 380;          // durée d'un déplacement demandé par panTo()
  const LABEL_GAP = 3;         // px CSS entre l'étiquette et ce qu'elle nomme
  const LABEL_HOLD_MS = 1200;  // au doigt : le nom reste affiché ce temps après le relâchement
  // Bulles (assets/bulle.png, au double) : la pointe est à BUBBLE_TIP_X px CSS du bord gauche
  // et BUBBLE_TIP_Y px au-dessus du bas.
  const BUBBLE_TIP_X = 15, BUBBLE_TIP_Y = 2;
  const GAIN_HOLD_MS = 1200;    // bulle « +x » au-dessus du personnage : elle reste, puis…
  const GAIN_FADE_MS = 1400;    // … s'estompe lentement (une prise pendant ce temps s'y ajoute)
  const LONG_PRESS_MS = 450;   // appui maintenu sur la citerne : sa bulle (litres) s'affiche
  const GROUND_CHECK_MS = 3000; // le fond de la carte est vérifié à ce rythme (voir repairGround)
  const ZONE_LABEL_UP = 14;    // px de carte : l'étiquette de la zone passe au-dessus de la barrière
  const LIGHT_MS = 1200;       // fondu entre deux lumières (un quart d'heure de jeu dure à peu près autant)

  // Lumière selon l'heure : couleur par laquelle la carte est multipliée (blanc = plein jour).
  // Aube chaude à 6 h, plein jour de 9 h à 16 h, lumière dorée de 17 h à 19 h, crépuscule
  // vers 20-21 h, nuit bleue de 22 h à 5 h. La nuit reste claire : la carte doit rester jouable.
  const LIGHT_KEYS = [
    [0, 0x8494d0], [5, 0x8494d0], [6, 0xf0d2b4], [7.5, 0xfff0dc], [9, 0xffffff], [16, 0xffffff],
    [17.5, 0xffe2b0], [19, 0xfac48e], [20, 0xcfa0a8], [21, 0xa490c2], [22, 0x8494d0], [24, 0x8494d0],
  ];

  // Cases de crops.png : r = rangée de la base de la plante, h = hauteur du dessin
  // (16 ou 32), c = colonnes des 4 phases. La table vient de la page au montage
  // (options.crops) : elle est écrite avec les cultures, dans data/crops.json
  // (champ "sprite"). Une culture sans découpe s'affiche avec son icône.
  let CROP_SP = {};

  let game = null;
  let scene = null;
  let host = null;
  let bridge = null;
  let lastModel = null;     // dernier modèle reçu (appliqué dès que la scène est prête)
  let lastKey = '';
  let visible = false;
  let awake = false;        // la boucle Phaser tourne et la taille est à jour

  let labelLayer = null;     // calque DOM des étiquettes, par-dessus le canvas

  const clamp = (v, lo, hi) => (hi < lo ? (lo + hi) / 2 : Math.min(hi, Math.max(lo, v)));

  // Couleur de la lumière à une heure donnée (0 à 24, fractionnaire) : [r, v, b] de 0 à 255,
  // interpolée entre les deux repères voisins de LIGHT_KEYS.
  function lightAt(hour) {
    const h = ((Number(hour) % 24) + 24) % 24;
    let i = 0;
    while (i < LIGHT_KEYS.length - 2 && h >= LIGHT_KEYS[i + 1][0]) i++;
    const a = LIGHT_KEYS[i], b = LIGHT_KEYS[i + 1];
    const t = clamp((h - a[0]) / (b[0] - a[0]), 0, 1);
    return [16, 8, 0].map((s) => ((a[1] >> s) & 255) + (((b[1] >> s) & 255) - ((a[1] >> s) & 255)) * t);
  }

  // Le canvas est rendu à la densité de l'écran (plafonnée à 3) : avec un zoom non entier,
  // les pixels de la carte restent réguliers.
  function pixelRatio() { return Math.min(3, Math.max(1, global.devicePixelRatio || 1)); }

  // La question est posée à chaque image (tuiles animées, vie d'ambiance) : la requête est
  // créée une fois, sa réponse suit toute seule le réglage du système.
  const REDUCED = global.matchMedia ? global.matchMedia('(prefers-reduced-motion: reduce)') : null;
  function reducedMotion() {
    return !!(REDUCED && REDUCED.matches);
  }

  // Empreintes des fichiers de assets/ : « nom → empreinte de son contenu », écrites par
  // scripts/build-site.mjs dans js/assets-versions.js (site en ligne seulement). Chaque
  // fichier est demandé avec « ?v=<empreinte> » : modifié, il change d'adresse et le
  // navigateur le recharge au lieu de garder l'ancien en cache. Sans ce fichier (jeu ouvert
  // depuis le dépôt), les adresses restent sans suffixe.
  function v(file) {
    const versions = global.FERME_ASSET_VERSIONS;
    return versions && versions[file] ? file + '?v=' + versions[file] : file;
  }

  function mount(element, options) {
    if (!global.Phaser) return false;      // pas de Phaser : la page garde son affichage classique
    if (game) return true;
    host = element;
    bridge = options;
    const base = (options && options.base) || 'assets/';
    CROP_SP = (options && options.crops) || {};
    labelLayer = document.createElement('div');
    labelLayer.className = 'stage-labels';
    element.appendChild(labelLayer);

    class FarmScene extends global.Phaser.Scene {
      constructor() {
        super('farm');
        this.plots = new Map();          // id de parcelle -> { soil, crop, key, tween }
        this.buildings = new Map();      // id de bâtiment -> { def, sprite }
        this.roofPanels = null;          // panneaux solaires sur le toit de la maison (image)
        this.well = null;                // le puits (image)
        this.pump = null;                // la pompe, une fois achetée (image), et sa vibration :
        this.pumpShake = null;           //   minuterie qui la décale d'un pixel quand elle tourne
        this.tank = null;                // la citerne, une fois achetée (image)
        this.trees = new Map();          // case du Verger -> { sprite, key, a } (arbre ou emplacement libre)
        this.labels = new Map();         // id de lieu -> étiquette DOM et son point d'ancrage
        this.hoverId = null;             // lieu survolé (souris) ou touché (doigt) : son nom s'affiche
        this.hoverUntil = 0;             // au doigt : heure à laquelle le nom s'efface
        this.pan = null;                 // déplacement demandé par panTo() : { from, to, t0 }
        this.dragged = false;            // le joueur a-t-il déjà fait glisser la carte ?
        this.viewKey = '';               // dernière vue signalée à la page
        this.light = null;               // voile de lumière (rectangle en mode « multiplier »)
        this.lightNow = [255, 255, 255]; // couleur affichée
        this.lightFade = null;           // fondu en cours : { from, to, t0 }
        this.world = { w: DEFAULT_W, h: DEFAULT_H };
        this.objects = Object.assign({}, DEFAULT_OBJECTS);
        this.grid = { x: 0, y: 0, cols: 72 };       // version 1.15 : la carte entière (tuile = rangée × colonnes + colonne)
        this.screens = [];               // repères de la carte : gauche, milieu, droite (voir makeScreens)
        this.tileAnims = [];             // tuiles animées de la carte, par tuile (voir makeTileAnims)
        this.tileSprites = [];           // les images des étendues de cases animées (voir makeTileAnims)
        this.tilesStill = false;         // animations réduites : ces images sont masquées
        this.rooms = {};                 // intérieurs disponibles (voir bakeRooms) : id -> image, zones, emplacements
        this.room = null;                // intérieur affiché à la place de la carte (null : dehors)
        this.roomShade = null;           // voile sur les emplacements pas encore achetés
        this.shadeKey = '';
        this.cx = DEFAULT_W / 2;         // centre de la vue, en px de carte
        this.cy = DEFAULT_H / 2;
        this.drag = null;                // glissement en cours
        this.vx = 0;                     // élan (px de carte par ms)
        this.vy = 0;
        this.sfx = null;
        this.missing = new Set();
      }

      preload() {
        const L = this.load;
        L.setPath(base);
        L.on('loaderror', (file) => this.missing.add(file.key));
        L.image('crops', v('crops.png'));
        L.image('soil_dry', v('soil_dry.png'));
        L.image('soil_wet', v('soil_wet.png'));
        L.image('sign', v('sign.png'));
        L.image('panneau_ville', v('panneau_ville.png'));
        L.image('silo', v('silo.png'));
        L.spritesheet('chat', v('chat.png'), CAT_FRAME);
        L.spritesheet('fermier', v(PERSONNAGE + '.png'), FERMIER_FRAME);
        L.json('fermier_cases', v(PERSONNAGE + '.json'));
        for (const [kind, [file, size]] of Object.entries(HERD_SHEETS)) L.spritesheet(kind, v(file), size);
        L.spritesheet('coop', v('poulailler.png'), COOP_FRAME);
        L.spritesheet(ROOF_PANELS.key, v(ROOF_PANELS.file), ROOF_PANELS.frame);
        L.spritesheet(WELL.key, v(WELL.file), WELL.frame);
        L.spritesheet(TANK.key, v(TANK.file), TANK.frame);
        for (const r of Object.values(RUINES)) {
          if (r.sheet) L.spritesheet(r.key, v(r.file), r.sheet === 'mill' ? MILL_FRAME : COOP_FRAME);
          else L.image(r.key, v(r.file));
        }
        L.tilemapTiledJSON(MAP.key, v(MAP.json));
        for (const r of Object.values(ROOMS)) L.tilemapTiledJSON(r.key, v(r.json));
        for (const name of MEUBLES) L.image('meuble_' + name, v('meuble_' + name + '.png'));
        L.image(MAP.tiles, v(MAP.image));
        for (const a of SUFFIXES) {
          L.image('house_' + a, v('house_' + a + '.png'));
          L.image('barn_' + a, v('barn_' + a + '.png'));
          L.image('serre_' + a, v('serre_' + a + '.png'));
          L.spritesheet('windmill_' + a, v('windmill_' + a + '.png'), MILL_FRAME);
          L.spritesheet('tree_' + a, v('basic_' + a + '.png'), TREE_FRAME);
        }
        L.spritesheet('verger', v('verger.png'), TREE_FRAME);
        L.image(SHADOWS.key, v(SHADOWS.file));
        L.spritesheet('pine_sp', v('pine_sp.png'), { frameWidth: 58, frameHeight: 64 });
        L.spritesheet('arbre_clair_sp', v('arbre_clair_sp.png'), { frameWidth: 48, frameHeight: 64 });
        L.spritesheet('pin_clair_sp', v('pin_clair_sp.png'), { frameWidth: 64, frameHeight: 64 });
        L.image(TREE_SHADOW.key, v(TREE_SHADOW.file));
        L.image('terre_bords', v('terre_bords.png'));
      }

      create() {
        this.cameras.main.setBackgroundColor('#699654'); // vert de l'herbe de la carte
        this.cameras.main.roundPixels = false;
        this.makePlaceholders();
        this.defineFrames();
        this.defineAnims();
        this.bakeGround();
        this.add.image(0, 0, 'ground').setOrigin(0).setDepth(0);
        if (this.has(SHADOWS.key)) this.add.image(0, 0, SHADOWS.key).setOrigin(0).setDepth(SHADOWS.depth);
        this.watchGround();
        this.makeTileAnims();
        this.bakeRooms();
        // Voile de lumière : il couvre toute la carte, au-dessus des bâtiments et des
        // plantes, et multiplie leurs couleurs (blanc = aucun effet). Les étiquettes et les
        // boutons, en DOM, restent au-dessus et gardent leurs couleurs.
        this.light = this.add.rectangle(0, 0, this.world.w, this.world.h, 0xffffff)
          .setOrigin(0).setDepth(1e6).setBlendMode(global.Phaser.BlendModes.MULTIPLY).setVisible(false);

        this.makeScreens();
        this.cx = this.screens[1].x;     // départ : le repère du milieu (maison + zone de culture)
        this.cy = this.screens[1].y;

        const I = this.input;
        I.on('pointerdown', this.onDown, this);
        I.on('pointermove', this.onMove, this);
        I.on('pointerup', (p) => this.onUp(p, true));
        I.on('pointerupoutside', (p) => this.onUp(p, false));
        I.on('gameout', () => { if (!this.drag) this.setHover(null); });
        I.on('wheel', (p, over, dx, dy) => { this.vx = this.vy = 0; this.pan = null; this.setCentre(this.cx + ((dx || dy) * pixelRatio()) / this.cameras.main.zoom, this.cy); });
        this.scale.on('resize', () => this.fit());
        this.fit();
        // Vie d'ambiance (js/ambient-life.js, facultatif) : ombres de nuages, petites bêtes de
        // passage, et le chat. Voir docs/vie-ambiance.md.
        this.ambient = null;
        if (global.AmbientLife) {
          try {
            this.ambient = global.AmbientLife.attach(this, {
              world: this.world, map: this.mapRaw, tiles: this.has(MAP.tiles) ? MAP.tiles : null,
              objects: this.objects, lightDepth: this.light.depth, reduced: reducedMotion,
              cat: this.has('chat') ? 'chat' : null,
              herd: Object.fromEntries(Object.keys(HERD_SHEETS).filter((kind) => this.has(kind)).map((kind) => [kind, kind])),
            });
          } catch (e) { console.warn('[FarmStage] vie d\'ambiance indisponible', e); }
        }
        // Le personnage (js/fermier.js, facultatif) : il refait sur la carte les gestes du joueur.
        this.fermier = null;
        const cases = this.cache.json.get('fermier_cases');
        if (global.Fermier && this.has('fermier') && cases && Array.isArray(cases.frames)) {
          try {
            this.fermier = global.Fermier.attach(this, {
              sheet: 'fermier', frames: cases.frames, world: this.world, objects: this.objects, reduced: reducedMotion,
              ground: () => (this.ambient && this.ambient.ground ? this.ambient.ground() : null),
              cols: () => this.grid.cols,
              outside: () => !this.room,
              resync: () => { if (this.rawModel) this.sync(this.rawModel); },
              // Version 1.18 : il prend un tas (le jeu le met dans l'inventaire), hors de sa
              // boucle d'image ; puis la bulle « +x » monte au-dessus de lui.
              pickup: (id, done) => setTimeout(() => done(bridge && bridge.pickup ? bridge.pickup(id) : null), 0),
              gain: (items) => this.showGain(items),
              // Version 1.19 : au Poulailler ou à l'Étable, il prend ce qui l'attend.
              collect: (lieu, done) => setTimeout(() => done(bridge && bridge.collect ? bridge.collect(lieu) : null), 0),
            });
          } catch (e) { console.warn('[FarmStage] personnage indisponible', e); }
        }
        this.ready = true;
        if (lastModel) this.sync(lastModel, true);
      }

      /* ---------- textures ---------- */

      has(key) { return this.textures.exists(key) && !this.missing.has(key); }
      tex(key, fallback) { return this.has(key) ? key : fallback; }

      // Dessins de secours (formes simples) quand une image du pack manque : la carte
      // reste lisible et utilisable, même sans les assets.
      makePlaceholders() {
        const g = this.make.graphics({ x: 0, y: 0, add: false });
        const bake = (key, w, h, draw) => { g.clear(); draw(g); g.generateTexture(key, w, h); };
        const shed = (wall, roof, w, h) => (d) => {
          const r = Math.round(h * 0.42);
          d.fillStyle(wall).fillRect(Math.round(w * 0.08), r, Math.round(w * 0.84), h - r);
          d.fillStyle(roof).fillTriangle(0, r + 4, w / 2, 0, w, r + 4);
          d.fillStyle(0x5a3a1a).fillRect(Math.round(w / 2) - 7, h - 30, 14, 30);
        };
        bake('ph_dry', 16, 16, (d) => { d.fillStyle(0x8b5a2b).fillRect(0, 0, 16, 16); d.fillStyle(0x7a4d24).fillRect(0, 5, 16, 2).fillRect(0, 11, 16, 2); });
        bake('ph_wet', 16, 16, (d) => { d.fillStyle(0x5b3a1c).fillRect(0, 0, 16, 16); d.fillStyle(0x4a2f16).fillRect(0, 5, 16, 2).fillRect(0, 11, 16, 2); });
        bake('ph_maison', 93, 97, shed(0xc9a26b, 0xa8472f, 93, 97));
        bake('ph_etable', 104, 93, shed(0x8a5a34, 0x5a3a1a, 104, 93));
        bake('ph_moulin', 96, 128, shed(0xd8c7a3, 0x6b4423, 96, 128));
        bake('ph_serre', 96, 80, shed(0x9fd3c7, 0x4f8a7a, 96, 80));
        bake('ph_poulailler', 44, 55, shed(0xb07a4a, 0x5c2f40, 44, 55));
        bake('ph_verger', 17, 16, (d) => { d.fillStyle(0x6b4423).fillRect(7, 8, 3, 8); d.fillStyle(0xb98a4e).fillRect(1, 1, 15, 8); });
        bake('ph_ville', 20, 23, (d) => { d.fillStyle(0x6b4423).fillRect(9, 8, 3, 15); d.fillStyle(0xb98a4e).fillRect(0, 2, 20, 8); });
        bake('ph_silo', 28, 62, shed(0x9a6040, 0x5e3a4e, 28, 62));
        bake('ph_arbre', 80, 80, (d) => { d.fillStyle(0x6b4423).fillRect(36, 48, 8, 32); d.fillStyle(0x4f8a4a).fillCircle(40, 32, 28); });
        g.destroy();
      }

      // Découpes : crops.png, une image « culture:phase » par case (table reçue au
      // montage) ; serre_*.png, le bâtiment seul (défini ici).
      defineFrames() {
        if (this.has('crops')) {
          const t = this.textures.get('crops');
          for (const [name, sp] of Object.entries(CROP_SP)) {
            sp.c.forEach((col, phase) => t.add(name + ':' + phase, 0, col * T, (sp.r + 1) * T - sp.h, T, sp.h));
          }
        }
        for (const a of [...SUFFIXES, 'sp_ruine']) {
          if (!this.has('serre_' + a)) continue;
          const t = this.textures.get('serre_' + a);
          const img = t.getSourceImage();
          for (const [name, sizes] of Object.entries(SERRE_FRAMES)) {
            const sz = sizes[a] || sizes.sp; // la serre délabrée a la découpe de la serre de printemps
            t.add(name, 0, 0, 0, Math.min(sz[0], img.width), Math.min(sz[1], img.height));
          }
        }
      }

      defineAnims() {
        for (const a of SUFFIXES) {
          const key = 'windmill_' + a;
          if (this.has(key) && !this.anims.exists(key)) {
            this.anims.create({ key, frames: this.anims.generateFrameNumbers(key, { start: 0, end: 3 }), frameRate: 5, repeat: -1 });
          }
        }
      }

      /* ---------- carte Tiled ---------- */

      // Toutes les couches de tuiles sont dessinées une fois dans une seule image (texture
      // « ground ») : pas de liseré entre les tuiles quand le zoom n'est pas entier. Les
      // rectangles nommés de la couche d'objets (maison, grange, zone_culture…) sont relevés.
      bakeGround() {
        const ok = this.cache.tilemap.exists(MAP.key) && !this.missing.has(MAP.key);
        const raw = ok ? this.cache.tilemap.get(MAP.key).data : null;
        const valid = !!(raw && raw.width && raw.height && raw.tilewidth && Array.isArray(raw.layers));
        if (valid) this.world = { w: raw.width * raw.tilewidth, h: raw.height * raw.tileheight };
        this.mapRaw = valid ? raw : null;
        if (valid) {
          const named = {};
          for (const layer of raw.layers) {
            if (layer.type === 'objectgroup') for (const o of layer.objects || []) if (o.name) named[o.name] = o;
          }
          Object.assign(this.objects, named);
          const zone = ZONE_OBJECTS.find((n) => named[n]);
          if (zone) this.objects.zone_culture = named[zone];
          else console.warn('[FarmStage] rectangle ' + ZONE_OBJECTS[0] + ' introuvable dans la carte : zone de culture à sa place par défaut');
          const set = (raw.tilesets || []).find((t) => t.image && String(t.image).split('/').pop() === MAP.image);
          if (!set) console.warn('[FarmStage] jeu de tuiles ' + MAP.image + ' introuvable dans la carte (est-il intégré ?)');
        }
        this.zoneOver = this.zoneGround();   // version 1.9 : les anciennes zones commencent en herbe
        this.dirt = new Set();                // version 1.15 : tuiles labourées de la carte
        this.zoneKey = '';
        this.textures.createCanvas('ground', this.world.w, this.world.h);
        this.paintGround();
      }

      // Dessine (ou redessine) une carte Tiled dans sa texture, puis l'envoie à la carte
      // graphique : toutes ses couches de tuiles, sur un fond uni.
      paintMap(key, raw, w, h, bg) {
        const tex = this.textures.get(key);
        const ctx = tex.getContext();
        ctx.imageSmoothingEnabled = false;
        ctx.globalAlpha = 1;
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, w, h);
        if (raw) {
          const img = this.has(MAP.tiles) ? this.textures.get(MAP.tiles).getSourceImage() : null;
          // Jeu de tuiles : celui dont l'image est la planche chargée (intégré dans le JSON).
          const set = (raw.tilesets || []).find((t) => t.image && String(t.image).split('/').pop() === MAP.image);
          for (const layer of raw.layers) {
            if (layer.type === 'tilelayer' && layer.visible !== false && img && set && Array.isArray(layer.data)) {
              this.drawLayer(ctx, raw, layer, set, img);
            }
          }
        }
        tex.refresh();
      }

      // Le fond de la carte et les intérieurs. Appelée au démarrage et chaque fois que le
      // navigateur a vidé ces images.
      paintGround() {
        this.paintMap('ground', this.mapRaw, this.world.w, this.world.h, '#699654');
        for (const r of Object.values(this.rooms)) this.paintMap(r.tex, r.raw, r.w, r.h, r.bg);
        for (const a of this.animAreas || []) this.paintAnimArea(a);
      }

      // Intérieurs (ROOMS) : chaque petite carte est dessinée dans sa propre image, posée à
      // droite de la carte. Les rectangles de ses couches d'objets (`serre_zone_1`,
      // `serre_zone_2`…) donnent les emplacements des parcelles, calés sur la grille de 16 px
      // et pris rangée par rangée à travers toutes les zones : la première rangée de chaque
      // zone, puis la deuxième… Sans le fichier, pas d'intérieur : la page garde la fenêtre
      // du bâtiment (FarmStage.hasRoom).
      bakeRooms() {
        let x = Math.ceil(this.world.w / T) * T + ROOM_GAP;
        for (const [id, def] of Object.entries(ROOMS)) {
          const ok = this.cache.tilemap.exists(def.key) && !this.missing.has(def.key);
          const raw = ok ? this.cache.tilemap.get(def.key).data : null;
          if (!(raw && raw.width && raw.height && raw.tilewidth && Array.isArray(raw.layers))) continue;
          const zones = [];
          const props = [];
          let vue = null;                            // rectangle « vue » : ce que la vue cadre
          for (const layer of raw.layers) {
            for (const o of layer.type === 'objectgroup' ? layer.objects || [] : []) {
              if (o.name === 'vue' && o.width && o.height) vue = { x: x + o.x, y: o.y, w: o.width, h: o.height };
            }
            if (def.props && layer.type === 'objectgroup' && layer.name === def.props) {
              for (const o of layer.objects || []) {
                if (o.name && o.name !== 'vue' && o.width && o.height) props.push({ name: o.name, x: x + o.x, y: o.y, w: o.width, h: o.height, sprite: null });
              }
            }
            const m = def.zones && layer.type === 'objectgroup' ? def.zones.exec(layer.name || '') : null;
            const o = m ? (layer.objects || []).find((r) => r.width && r.height) : null;
            if (o) {
              zones.push({
                n: Number(m[1]), x: x + Math.round(o.x / T) * T, y: Math.round(o.y / T) * T,
                cols: Math.max(1, Math.round(o.width / T)), rows: Math.max(1, Math.round(o.height / T)),
              });
            }
          }
          if (def.zones && !zones.length) { console.warn('[FarmStage] ' + def.json + ' : aucune zone de culture, intérieur ignoré'); continue; }
          if (def.props && !props.length) { console.warn('[FarmStage] ' + def.json + ' : aucun meuble, intérieur ignoré'); continue; }
          zones.sort((a, b) => a.n - b.n);
          const slots = [];
          const slotAt = new Map();
          const rows = Math.max(...zones.map((z) => z.rows));
          for (let r = 0; r < rows; r++) {
            for (const z of zones) {
              for (let c = 0; r < z.rows && c < z.cols; c++) {
                const sx = z.x + c * T, sy = z.y + r * T;
                slotAt.set(sx + ',' + sy, slots.length);
                slots.push({ x: sx, y: sy });
              }
            }
          }
          const w = raw.width * raw.tilewidth, h = raw.height * raw.tileheight;
          // Ce que la vue cadre : la carte sans sa marge unie (les tuiles du coin haut-gauche).
          let c0 = raw.width, c1 = -1, r0 = raw.height, r1 = -1;
          for (const layer of raw.layers) {
            if (layer.type !== 'tilelayer' || !Array.isArray(layer.data)) continue;
            const edge = layer.data[0];
            layer.data.forEach((cell, i) => {
              if (!cell || cell === edge) return;
              const c = i % raw.width, r = Math.floor(i / raw.width);
              if (c < c0) c0 = c; if (c > c1) c1 = c; if (r < r0) r0 = r; if (r > r1) r1 = r;
            });
          }
          const full = c1 >= c0
            ? { x: x + c0 * raw.tilewidth, y: r0 * raw.tileheight, w: (c1 - c0 + 1) * raw.tilewidth, h: (r1 - r0 + 1) * raw.tileheight }
            : { x, y: 0, w, h };
          // `vue` cadre l'entrée ; si la carte est plus large, la vue y glisse de gauche à droite.
          const view = vue || full;
          const room = { id, def, raw, tex: 'room_' + id, x, y: 0, w, h, view, centre: { x: x + w / 2, y: h / 2 }, full, slots, slotAt, props, bg: '#06182a' };
          this.textures.createCanvas(room.tex, w, h);
          this.paintMap(room.tex, raw, w, h, room.bg);
          // Autour de l'intérieur, l'écran prend la couleur du coin de sa carte.
          try {
            const px = this.textures.get(room.tex).getContext().getImageData(0, 0, 1, 1).data;
            room.bg = '#' + [px[0], px[1], px[2]].map((v) => v.toString(16).padStart(2, '0')).join('');
          } catch (e) { /* couleur par défaut */ }
          this.rooms[id] = room;
          this.add.image(x, 0, room.tex).setOrigin(0).setDepth(0);
          const c = this.textures.get(room.tex).getSourceImage();
          if (c && c.addEventListener) c.addEventListener('contextrestored', () => this.repairGround(true));
          x += w + ROOM_GAP;
        }
        this.roomShade = this.add.graphics().setDepth(3);
      }

      // Le fond a-t-il été vidé ? Il est entièrement opaque quand il est dessiné : un point
      // transparent veut dire que le navigateur a jeté son contenu (page restée en
      // arrière-plan sur un téléphone, mémoire graphique reprise).
      groundWiped() {
        try {
          const tex = this.textures.get('ground');
          const ctx = tex.getContext();
          if (ctx.isContextLost && ctx.isContextLost()) return false;   // pas encore rendu : on réessaiera
          const w = this.world.w, h = this.world.h;
          return [[0, 0], [w >> 1, h >> 1], [w - 1, h - 1]].some((p) => ctx.getImageData(p[0], p[1], 1, 1).data[3] === 0);
        } catch (e) {
          return false;
        }
      }

      // Redessine le fond s'il a été vidé (ou d'office avec `force`). Sans cela, au retour
      // d'une absence, la carte n'affichait plus qu'un vert uni sous les bâtiments.
      repairGround(force) {
        if (!this.textures.exists('ground')) return false;
        if (!force && !this.groundWiped()) return false;
        this.paintGround();
        return true;
      }

      // Tout ce qui peut annoncer que la mémoire graphique a été reprise puis rendue.
      watchGround() {
        const R = this.game.renderer;
        const E = global.Phaser.Renderer && global.Phaser.Renderer.Events;
        // Contexte WebGL rendu : Phaser recrée ses textures, puis on renvoie le fond.
        if (R && R.on) R.on((E && E.RESTORE_WEBGL) || 'restorewebgl', () => this.repairGround(true));
        // Canvas du fond rendu par le navigateur (il revient vide).
        const c = this.textures.get('ground').getSourceImage();
        if (c && c.addEventListener) c.addEventListener('contextrestored', () => this.repairGround(true));
        this.groundCheckAt = 0;
      }

      // Animations de tuiles d'un jeu de tuiles (Tiled les range dans `tiles`) : numéro de
      // tuile dans la planche -> ses images [{ tileid, duration (ms) }].
      tileFrames(set) {
        const out = new Map();
        for (const t of (set && set.tiles) || []) {
          if (Array.isArray(t.animation) && t.animation.length > 1) out.set(t.id, t.animation);
        }
        return out;
      }

      // Une tuile animée est dessinée dans le fond avec sa première image, comme dans Tiled
      // à l'arrêt : c'est ce qui reste visible quand les animations sont réduites.
      // Sol des anciennes zones de culture : leur terre d'origine (dans les rectangles et
      // autour, la seule terre du sol de la carte) redevient de l'herbe ; la terre labourée se
      // pose par-dessus (voir drawZoneDirt). Table index -> tuile de sol.
      zoneGround() {
        const raw = this.mapRaw;
        if (!raw) return null;
        const over = new Map();
        const sol = raw.layers.find((l) => l.type === 'tilelayer');
        if (!sol) return over;
        sol.data.forEach((g, i) => { if ((g & 0x0fffffff) === ZONE_TILES.terre) over.set(i, ZONE_TILES.herbe); });
        return over;
      }

      // Version 1.15 : en mode houe, une grille vert clair transparente sur les tuiles que la
      // houe peut labourer ; rien hors du mode houe (l'image est détruite).
      syncHoeGrid(tiles) {
        const key = tiles ? tiles.join() : '';
        if (key === this.hoeGridKey) return;
        this.hoeGridKey = key;
        if (this.hoeGrid) { this.hoeGrid.destroy(); this.hoeGrid = null; }
        if (!tiles || !tiles.length) return;
        const W = this.grid.cols;
        const g = this.add.graphics().setDepth(1.5);       // sur le sol, sous les parcelles (2)
        g.fillStyle(0xb6f08c, 0.28);
        g.lineStyle(1, 0xd8ffbe, 0.55);
        for (const t of tiles) {
          const x = (t % W) * T, y = Math.floor(t / W) * T;
          g.fillRect(x + 1, y + 1, T - 2, T - 2);
          g.strokeRect(x + 1.5, y + 1.5, T - 3, T - 3);
        }
        this.hoeGrid = g;
      }

      // Version 1.15 : la terre suit les parcelles (leur tuile) ; seules les tuiles qui
      // changent, et leurs voisines (leur bordure), sont repeintes.
      syncZoneGround(model) {
        const raw = this.mapRaw;
        if (!raw) return;
        const W = raw.width;
        const now = new Set((model.plots || []).map((p) => p.case).filter((c) => typeof c === 'number'));
        const key = [...now].sort((a, b) => a - b).join();
        if (key === this.zoneKey) return;
        this.zoneKey = key;
        const changed = [];
        for (const t of now) if (!this.dirt.has(t)) changed.push(t);
        for (const t of this.dirt) if (!now.has(t)) changed.push(t);
        this.dirt = now;
        const cells = new Set();
        for (const t of changed) {
          const c = t % W, r = Math.floor(t / W);
          for (let dr = -1; dr <= 1; dr++) {
            for (let dc = -1; dc <= 1; dc++) {
              const cc = c + dc, rr = r + dr;
              if (cc >= 0 && rr >= 0 && cc < W && rr < raw.height) cells.add(rr * W + cc);
            }
          }
        }
        if (cells.size) this.repaintCells(cells);
      }

      repaintCells(cells) {
        const raw = this.mapRaw;
        if (!raw || !this.has(MAP.tiles)) return;
        const set = (raw.tilesets || []).find((t) => t.image && String(t.image).split('/').pop() === MAP.image);
        if (!set) return;
        const tex = this.textures.get('ground');
        const ctx = tex.getContext();
        const img = this.textures.get(MAP.tiles).getSourceImage();
        ctx.imageSmoothingEnabled = false;
        ctx.fillStyle = '#699654';
        for (const i of cells) ctx.fillRect((i % raw.width) * raw.tilewidth, Math.floor(i / raw.width) * raw.tileheight, raw.tilewidth, raw.tileheight);
        for (const layer of raw.layers) {
          if (layer.type === 'tilelayer' && layer.visible !== false && Array.isArray(layer.data)) this.drawLayer(ctx, raw, layer, set, img, cells);
        }
        tex.refresh();
        for (const a of this.animAreas || []) {           // une étendue d'eau animée touchée
          for (const i of cells) if (a.cells.has(i)) { this.paintAnimArea(a); break; }
        }
      }

      // `only` : seulement ces cases (repeinture partielle) ; `cur` : l'image du moment des
      // tuiles animées (numéro -> image), sinon leur première. Sur la carte de la ferme, les
      // cases des zones de culture suivent zoneOver (voir zoneGround).
      drawLayer(ctx, raw, layer, set, img, only, cur) {
        const tw = raw.tilewidth, th = raw.tileheight;
        const cols = set.columns || Math.floor(img.width / tw);
        const last = set.firstgid + (set.tilecount || cols * Math.floor(img.height / th));
        const anims = this.tileFrames(set);
        const ferme = raw === this.mapRaw;
        const over = ferme && this.zoneOver ? this.zoneOver : null;
        const sol = layer === raw.layers.find((l) => l.type === 'tilelayer');
        if (ferme && layer.name === ZONE_TILES.couche) return;              // l'ancienne bordure des zones
        const dirt = ferme && layer.name === ZONE_TILES.plantes ? this.dirt : null;
        const hid = this.hiddenTrees ? this.hiddenTrees.get(layer) : null;  // un arbre qui tremble (sa feuille de sprites le montre)
        ctx.globalAlpha = layer.opacity == null ? 1 : layer.opacity;
        layer.data.forEach((orig, i) => {
          if (only && !only.has(i)) return;
          if (dirt && dirt.has(i)) return;                                  // les fleurs labourées
          if (hid && hid.has(i)) return;
          let cell = orig;
          if (sol && over && over.has(i)) cell = over.get(i);               // le sol des anciennes zones
          else if (ferme && !sol && ZONE_TILES.bordures.has(cell & 0x0fffffff)) return; // leur bordure
          const gid = cell & 0x0fffffff;                   // les bits de poids fort sont des retournements
          if (!gid || gid < set.firstgid || gid >= last) return; // 0 = case vide, ou tuile d'une autre planche
          const a = anims.get(gid - set.firstgid);
          const n = a ? (cur && cur.has(gid - set.firstgid) ? cur.get(gid - set.firstgid) : a[0].tileid) : gid - set.firstgid;
          const sx = (n % cols) * tw, sy = Math.floor(n / cols) * th;
          const dx = (i % layer.width) * tw, dy = Math.floor(i / layer.width) * th;
          const fh = cell & 0x80000000, fv = cell & 0x40000000, fd = cell & 0x20000000;
          if (!fh && !fv && !fd) { ctx.drawImage(img, sx, sy, tw, th, dx, dy, tw, th); return; }
          ctx.save();
          ctx.translate(dx + tw / 2, dy + th / 2);
          if (fh) ctx.scale(-1, 1);
          if (fv) ctx.scale(1, -1);
          if (fd) { ctx.rotate(Math.PI / 2); ctx.scale(1, -1); }
          ctx.drawImage(img, sx, sy, tw, th, -tw / 2, -th / 2, tw, th);
          ctx.restore();
        });
        ctx.globalAlpha = 1;
        if (ferme && sol) this.drawZoneDirt(ctx, raw, only);
      }

      // La terre labourée (voir ZONE_TILES), sur le sol et sous les couches du dessus : une
      // tuile labourée est toute en terre, une tuile d'herbe voisine porte la bordure de ses
      // coins. `only` : repeinture partielle (ces tuiles seulement).
      drawZoneDirt(ctx, raw, only) {
        if (!this.dirt || !this.dirt.size || !this.has('terre_bords')) return;
        const W = raw.width, H = raw.height, tw = raw.tilewidth, th = raw.tileheight;
        const img = this.textures.get('terre_bords').getSourceImage();
        const dirt = this.dirt;
        const at = (c, r) => c >= 0 && r >= 0 && c < W && r < H && dirt.has(r * W + c);
        let cells = only;
        if (!cells) {
          cells = new Set();
          for (const t of dirt) {
            const c = t % W, r = Math.floor(t / W);
            for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) if (c + dc >= 0 && c + dc < W && r + dr >= 0 && r + dr < H) cells.add(t + dr * W + dc);
          }
        }
        for (const t of cells) {
          const c = t % W, r = Math.floor(t / W);
          const m = dirt.has(t) ? 15
            : ((at(c - 1, r - 1) || at(c, r - 1) || at(c - 1, r)) ? 8 : 0)
            | ((at(c, r - 1) || at(c + 1, r - 1) || at(c + 1, r)) ? 4 : 0)
            | ((at(c - 1, r) || at(c - 1, r + 1) || at(c, r + 1)) ? 2 : 0)
            | ((at(c + 1, r) || at(c, r + 1) || at(c + 1, r + 1)) ? 1 : 0);
          if (m) ctx.drawImage(img, m * tw, 0, tw, th, c * tw, r * th, tw, th);
        }
      }

      // Tuiles animées de la carte (l'eau) : les animations sont celles de Tiled, lues dans
      // le jeu de tuiles. Le fond reste une seule image fixe ; par-dessus, chaque étendue de
      // cases animées (une mare, avec ses rives) a sa propre image, repeinte case par case
      // avec toutes ses couches (un roseau reste devant l'eau) quand une de ses tuiles change
      // d'image. Une seule image par étendue, et non une par case : au zoom non entier (sur
      // un téléphone), des images de tuiles voisines laissaient voir des filets d'un pixel
      // entre elles. Toutes les tuiles d'un même numéro changent ensemble, comme dans Tiled.
      makeTileAnims() {
        const raw = this.mapRaw;
        if (!raw || !this.has(MAP.tiles)) return;
        const set = (raw.tilesets || []).find((t) => t.image && String(t.image).split('/').pop() === MAP.image);
        const anims = set ? this.tileFrames(set) : new Map();
        if (!anims.size) return;
        const W = raw.width, H = raw.height, tw = raw.tilewidth, th = raw.tileheight;
        const img = this.textures.get(MAP.tiles).getSourceImage();
        const cols = set.columns || Math.floor(img.width / tw);
        const last = set.firstgid + (set.tilecount || cols * Math.floor(img.height / th));
        const layers = raw.layers.filter((l) => l.type === 'tilelayer' && l.visible !== false && Array.isArray(l.data));
        const groups = new Map();           // numéro de tuile animée -> { ends, total, cur, ids }
        const cellGroups = new Map();       // case -> numéros des tuiles animées qu'elle porte
        for (let i = 0; i < W * H; i++) {
          for (const layer of layers) {
            const gid = layer.data[i] & 0x0fffffff;
            if (!gid || gid < set.firstgid || gid >= last) continue;
            const n = gid - set.firstgid;
            const a = anims.get(n);
            if (!a) continue;
            if (!groups.has(n)) {
              let t = 0;
              groups.set(n, { n, ids: a.map((f) => f.tileid), ends: a.map((f) => (t += Math.max(1, f.duration))), total: t, cur: 0 });
            }
            if (!cellGroups.has(i)) cellGroups.set(i, new Set());
            cellGroups.get(i).add(n);
          }
        }
        // les étendues : cases animées voisines (en comptant les diagonales)
        const seen = new Set();
        const areas = [];
        for (const i0 of cellGroups.keys()) {
          if (seen.has(i0)) continue;
          const cells = new Set(), stack = [i0], ns = new Set();
          seen.add(i0);
          let c0 = W, c1 = 0, r0 = H, r1 = 0;
          while (stack.length) {
            const i = stack.pop(), c = i % W, r = (i / W) | 0;
            cells.add(i);
            for (const n of cellGroups.get(i)) ns.add(n);
            c0 = Math.min(c0, c); c1 = Math.max(c1, c); r0 = Math.min(r0, r); r1 = Math.max(r1, r);
            for (let dr = -1; dr <= 1; dr++) {
              for (let dc = -1; dc <= 1; dc++) {
                const cc = c + dc, rr = r + dr, j = rr * W + cc;
                if (cc >= 0 && rr >= 0 && cc < W && rr < H && !seen.has(j) && cellGroups.has(j)) { seen.add(j); stack.push(j); }
              }
            }
          }
          const key = 'eau_anim_' + areas.length;
          if (this.textures.exists(key)) this.textures.remove(key);
          const tex = this.textures.createCanvas(key, (c1 - c0 + 1) * tw, (r1 - r0 + 1) * th);
          const sprite = this.add.image(c0 * tw, r0 * th, key).setOrigin(0).setDepth(0.1);
          areas.push({ cells, groups: ns, x: c0 * tw, y: r0 * th, tex, sprite });
        }
        this.tileAnims = [...groups.values()];
        this.animAreas = areas;
        this.tileSprites = areas.map((a) => a.sprite);
        for (const a of areas) this.paintAnimArea(a);
      }

      // Repeint une étendue de cases animées : chaque case, toutes ses couches, chaque tuile
      // animée à son image du moment.
      paintAnimArea(area) {
        const raw = this.mapRaw;
        const set = (raw.tilesets || []).find((t) => t.image && String(t.image).split('/').pop() === MAP.image);
        if (!set) return;
        const img = this.textures.get(MAP.tiles).getSourceImage();
        const cur = new Map(this.tileAnims.map((g) => [g.n, g.ids[g.cur]]));
        const ctx = area.tex.getContext();
        ctx.imageSmoothingEnabled = false;
        ctx.clearRect(0, 0, area.tex.width, area.tex.height);
        ctx.save();
        ctx.translate(-area.x, -area.y);
        ctx.fillStyle = '#699654';
        for (const i of area.cells) ctx.fillRect((i % raw.width) * raw.tilewidth, Math.floor(i / raw.width) * raw.tileheight, raw.tilewidth, raw.tileheight);
        for (const layer of raw.layers) {
          if (layer.type === 'tilelayer' && layer.visible !== false && Array.isArray(layer.data)) this.drawLayer(ctx, raw, layer, set, img, area.cells, cur);
        }
        ctx.restore();
        area.tex.refresh();
      }

      // Fait avancer les tuiles animées : une comparaison par tuile animée et par image ; une
      // étendue n'est repeinte que si l'une de ses tuiles a changé d'image. Rien si le joueur
      // a demandé moins d'animations : les images sont masquées, le fond montre la première.
      stepTileAnims(time) {
        const still = reducedMotion();
        if (still !== this.tilesStill) {
          this.tilesStill = still;
          for (const s of this.tileSprites) s.setVisible(!still);
        }
        if (still) return;
        const changed = new Set();
        for (const g of this.tileAnims) {
          const t = time % g.total;
          let k = 0;
          while (k < g.ends.length - 1 && t >= g.ends[k]) k++;
          if (k === g.cur) continue;
          g.cur = k;
          changed.add(g.n);
        }
        if (!changed.size) return;
        for (const a of this.animAreas || []) {
          for (const n of a.groups) if (changed.has(n)) { this.paintAnimArea(a); break; }
        }
      }

      /* ---------- caméra : zoom, glissement, élan ---------- */

      // Zoom : VIEW_ROWS rangées sont visibles en hauteur (toute la carte si elle est plus
      // petite) et la zone est entièrement couverte (jamais de bande, jamais rien hors de la
      // carte). Le centre courant est conservé.
      fit() {
        const w = this.scale.width, h = this.scale.height;
        if (!w || !h) return;
        const cam = this.cameras.main;
        cam.setSize(w, h);
        if (this.room) {
          // Intérieur : il tient en entier entre l'objectif (en haut) et les boutons (en bas),
          // centré dans cet espace. La vue n'y glisse pas (voir setCentre).
          const v = this.room.view, dpr = pixelRatio();
          const top = ROOM_PAD.top * dpr, bottom = ROOM_PAD.bottom * dpr;
          cam.removeBounds();
          cam.setZoom(Math.min(w / v.w, Math.max(h / 2, h - top - bottom) / v.h));
          this.room.centre = { x: v.x + v.w / 2, y: v.y + v.h / 2 + (bottom - top) / 2 / cam.zoom };
          this.cy = this.room.centre.y;
          if (!this.roomPanned) this.cx = this.room.centre.x;   // à l'entrée : le cadre de `vue`
        } else {
          cam.setZoom(Math.max(h / Math.min(this.world.h, VIEW_ROWS * T), w / this.world.w));
          cam.setBounds(0, 0, this.world.w, this.world.h);
        }
        this.setCentre(this.cx, this.cy);
      }

      // Centre la vue sur (cx, cy) sans jamais sortir de la carte. Renvoie false si la
      // position demandée a été bornée (bord atteint). Dans un intérieur, la vue reste où
      // fit() l'a cadrée.
      setCentre(cx, cy) {
        const cam = this.cameras.main;
        if (this.room) {
          // Intérieur : la vue ne glisse que de gauche à droite, dans la largeur de sa carte.
          const f = this.room.full, vw = this.scale.width / cam.zoom;
          this.cx = f.w > vw ? clamp(cx, f.x + vw / 2, f.x + f.w - vw / 2) : this.room.centre.x;
          this.cy = this.room.centre.y;
          cam.centerOn(this.cx, this.cy);
          return Math.abs(this.cx - cx) < 0.01;
        }
        const vw = this.scale.width / cam.zoom, vh = this.scale.height / cam.zoom;
        this.cx = clamp(cx, vw / 2, this.world.w - vw / 2);
        this.cy = clamp(cy, vh / 2, this.world.h - vh / 2);
        cam.centerOn(this.cx, this.cy);
        return Math.abs(this.cx - cx) < 0.01 && Math.abs(this.cy - cy) < 0.01;
      }

      onDown(pointer) {
        // Un deuxième doigt est ignoré ; le même pointeur qui rappuie repart de zéro (cas d'un
        // relâchement perdu, par exemple hors de la fenêtre).
        if (this.drag && this.drag.id !== pointer.id) return;
        this.vx = this.vy = 0;
        this.pan = null;
        const wp = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
        this.setHover(this.placeAt(wp.x, wp.y));   // le nom du lieu touché s'affiche
        this.drag = {
          id: pointer.id, x: pointer.x, y: pointer.y, cx: this.cx, cy: this.cy,
          wx: wp.x, wy: wp.y, moved: false, vx: 0, vy: 0,
          lastX: pointer.x, lastY: pointer.y, lastT: performance.now(),
          // FLU-12 : houe en main, un glissement parti d'une case verte laboure les cases traversées
          labour: this.labourStart(wp.x, wp.y),
        };
        // Appui maintenu sur la citerne : une bulle dit combien de litres elle contient.
        if (!this.drag.labour && this.onTank(wp.x, wp.y)) {
          const d = this.drag;
          d.holdTimer = setTimeout(() => {
            if (this.drag !== d || d.moved) return;
            d.held = true;
            this.setHover(null);
            this.showTankTip(true);
          }, LONG_PRESS_MS);
        }
      }

      // Le point (wx, wy) est-il sur la citerne (zone d'appui élargie à 44 px CSS) ?
      onTank(wx, wy) {
        const s = this.tank;
        if (!s || this.room) return false;
        const min = (MIN_TAP * pixelRatio()) / this.cameras.main.zoom;
        const w = Math.max(s.width, min), h = Math.max(s.height, min);
        const cx = s.x + s.width / 2, cy = s.y - s.height / 2;
        return Math.abs(wx - cx) <= w / 2 && Math.abs(wy - cy) <= h / 2;
      }

      // Bulle de la citerne (DOM, par-dessus le canvas), replacée à chaque image tant qu'elle est visible.
      showTankTip(on) {
        if (!on) {
          if (this.tankTip) this.tankTip.hidden = true;
          this.tankTipUntil = 0;
          return;
        }
        if (!this.tankTip) {
          const el = document.createElement('div');
          el.className = 'stage-tip';
          el.setAttribute('role', 'status');
          labelLayer.appendChild(el);
          this.tankTip = el;
        }
        this.tankTip.hidden = false;
        this.tankTipUntil = 0;
        this.syncTankTip();
      }

      syncTankTip() {
        const el = this.tankTip;
        if (!el || el.hidden) return;
        const text = (lastModel && lastModel.citerneTexte) || '';
        if (!text || !this.tank) { this.showTankTip(false); return; }
        if (el.textContent !== text) el.textContent = text;
        const dpr = pixelRatio();
        const cam = this.cameras.main;
        const k = cam.zoom / dpr;
        const left = this.cx - this.scale.width / cam.zoom / 2;
        const top = this.cy - this.scale.height / cam.zoom / 2;
        const x = (this.tank.x + this.tank.width / 2 - left) * k - el.offsetWidth / 2;
        const y = Math.max(0, (this.tank.y - this.tank.height - top) * k - el.offsetHeight - LABEL_GAP * 2);
        const maxX = this.scale.width / dpr - el.offsetWidth - 4;
        el.style.transform = 'translate(' + Math.round(Math.max(4, Math.min(x, maxX))) + 'px,' + Math.round(y) + 'px)';
      }

      /* ---------- version 1.18 : ce qui attend d'être ramassé ---------- */

      // Point de la carte au-dessus duquel se pose la bulle d'un tas (null : rien de dessiné).
      pileAnchor(p) {
        if (p.lieu === 'parcelle' && Number.isInteger(p.ref)) {
          const cols = this.grid.cols || 1;
          return { x: (p.ref % cols) * T + T / 2, y: Math.floor(p.ref / cols) * T + 2 };
        }
        if (p.lieu === 'arbre') {
          const e = this.trees.get(p.ref);
          const o = this.objects[TREE_OBJECT + (p.ref + 1)];
          if (e) return { x: e.sprite.x, y: e.sprite.y - Math.round(e.sprite.height * 0.55) };
          return o ? { x: o.x + o.width / 2, y: o.y + o.height / 2 } : null;
        }
        const b = this.buildings.get(p.lieu);
        // sur le bâtiment, sous son étiquette
        return b ? { x: b.sprite.x + b.sprite.width / 2, y: b.sprite.y - Math.round(b.sprite.height * 0.45) } : null;
      }

      // Une bulle par tas (DOM, par-dessus le canvas) : « 🥚 6 ». Un appui l'envoie la chercher.
      syncPiles(list) {
        if (!this.piles) this.piles = new Map();
        const seen = new Set();
        for (const p of list) {
          seen.add(p.id);
          let B = this.piles.get(p.id);
          if (!B) {
            const el = document.createElement('button');
            el.type = 'button';
            el.className = 'stage-bubble';
            labelLayer.appendChild(el);
            B = { el, id: p.id, texte: null, w: 0, h: 0, tr: '' };
            // Au clavier (le doigt et la souris passent par la carte : hitAt) ;
            el.addEventListener('click', () => { if (this.fermier && !(lastModel && lastModel.nuit)) this.fermier.fetch(B.id); });
            this.piles.set(p.id, B);
          }
          B.p = p;
          if (B.texte !== p.texte) {
            B.texte = p.texte;
            B.el.textContent = p.texte;
            B.el.setAttribute('aria-label', 'À ramasser : ' + p.texte);
            B.w = 0;
          }
        }
        for (const [id, B] of this.piles) if (!seen.has(id)) { B.el.remove(); this.piles.delete(id); }
      }

      // Repère de l'écran : px CSS par px de carte, coin haut-gauche de la vue.
      screenFrame() {
        const cam = this.cameras.main;
        return { k: cam.zoom / pixelRatio(), left: this.cx - this.scale.width / cam.zoom / 2, top: this.cy - this.scale.height / cam.zoom / 2 };
      }

      placePiles() {
        if (!this.piles || !this.piles.size) return;
        const f = this.screenFrame();
        for (const B of this.piles.values()) {
          const a = this.room ? null : this.pileAnchor(B.p);
          B.at = a;
          if (!a) { if (!B.el.hidden) B.el.hidden = true; continue; }
          if (B.el.hidden) { B.el.hidden = false; B.w = 0; }
          if (!B.w) { B.w = B.el.offsetWidth; B.h = B.el.offsetHeight; if (!B.w) continue; }
          const tr = 'translate(' + Math.round((a.x - f.left) * f.k - BUBBLE_TIP_X) + 'px,' + Math.round((a.y - f.top) * f.k - B.h + BUBBLE_TIP_Y) + 'px)';
          if (tr !== B.tr) { B.tr = tr; B.el.style.transform = tr; }
        }
      }

      // Bulle sous un point de la carte (zone d'appui élargie à 44 px CSS au besoin).
      pileAt(wx, wy) {
        if (!this.piles) return null;
        const f = this.screenFrame();
        for (const B of this.piles.values()) {
          if (!B.at || !B.w || B.el.hidden) continue;
          const w = Math.max(B.w, MIN_TAP) / f.k, h = Math.max(B.h, MIN_TAP) / f.k;
          const cx = B.at.x + (B.w / 2 - BUBBLE_TIP_X) / f.k, cy = B.at.y - (B.h / 2 - BUBBLE_TIP_Y) / f.k;
          if (Math.abs(wx - cx) <= w / 2 && Math.abs(wy - cy) <= h / 2) return B;
        }
        return null;
      }

      // Bulle « +6 🥕 » au-dessus du personnage : elle reste un instant puis s'estompe ; une
      // prise qui arrive avant qu'elle ait disparu s'y additionne.
      showGain(items) {
        const now = performance.now();
        if (!this.gain) {
          const el = document.createElement('div');
          el.className = 'stage-gain';
          el.setAttribute('role', 'status');
          labelLayer.appendChild(el);
          this.gain = { el, items: {}, until: 0, fadeAt: 0, w: 0 };
        }
        const G = this.gain;
        if (now >= G.until) G.items = {};
        for (const [item, qty] of Object.entries(items || {})) if (qty > 0) G.items[item] = (G.items[item] || 0) + qty;
        const icone = (bridge && bridge.icone) || ((item) => item);
        const texte = Object.entries(G.items).map(([item, qty]) => '+' + qty + ' ' + icone(item)).join('  ');
        if (!texte) return;
        G.el.textContent = texte;
        G.el.hidden = false;
        G.el.classList.remove('fade');
        G.fadeAt = now + GAIN_HOLD_MS;
        G.until = G.fadeAt + GAIN_FADE_MS;
        G.w = 0;
        this.placeGain();
      }

      placeGain() {
        const G = this.gain;
        if (!G || G.el.hidden) return;
        const now = performance.now();
        const at = this.fermier && !this.room ? this.fermier.pos() : null;
        if (!at || now >= G.until) { G.el.hidden = true; G.el.classList.remove('fade'); G.until = 0; return; }
        if (now >= G.fadeAt && !G.el.classList.contains('fade')) G.el.classList.add('fade');
        if (!G.w) { G.w = G.el.offsetWidth; G.h = G.el.offsetHeight; }
        const f = this.screenFrame();
        // elle monte doucement pendant qu'elle s'estompe
        const rise = now >= G.fadeAt ? ((now - G.fadeAt) / GAIN_FADE_MS) * 10 : 0;
        const x = Math.round((at.x - f.left) * f.k - BUBBLE_TIP_X);
        const y = Math.round((at.y - 34 - f.top) * f.k - G.h + BUBBLE_TIP_Y - rise);
        G.el.style.transform = 'translate(' + x + 'px,' + y + 'px)';
      }

      onMove(pointer) {
        const d = this.drag;
        if (!d) {
          // Souris : main sur ce qui se touche, poignée ailleurs.
          if (!pointer.wasTouch) {
            const wp = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
            const hit = this.hitAt(wp.x, wp.y);
            this.game.canvas.style.cursor = hit ? 'pointer' : this.room ? 'default' : 'grab';
            this.setHover(this.placeOf(hit));       // survol : le nom du lieu s'affiche
          }
          return;
        }
        if (d.id !== pointer.id) return;
        if (!pointer.isDown) { this.drag = null; return; }   // relâché hors de la page
        const zoom = this.cameras.main.zoom;
        const dx = pointer.x - d.x, dy = pointer.y - d.y;
        if (d.labour) {
          if (!d.moved && Math.hypot(dx, dy) >= TAP_SLOP * pixelRatio()) { d.moved = true; this.setHover(null); }
          if (d.moved) this.labourTo(d, this.cameras.main.getWorldPoint(pointer.x, pointer.y));
          return;
        }
        if (d.held) return;              // bulle de la citerne : la carte ne bouge pas
        if (!d.moved && Math.hypot(dx, dy) >= TAP_SLOP * pixelRatio()) {
          d.moved = true;
          clearTimeout(d.holdTimer);
          this.setHover(null);           // on fait glisser la carte : plus de nom affiché
          if (!this.room) this.dragged = true;   // signalé à la page par reportView()
          else this.roomPanned = true;           // l'intérieur garde où le joueur l'a fait glisser
          if (!this.room) this.game.canvas.style.cursor = 'grabbing';
        }
        this.setCentre(d.cx - dx / zoom, d.cy - dy / zoom);
        const now = performance.now();
        const dt = now - d.lastT;
        if (dt > 0) {
          d.vx = 0.7 * (-(pointer.x - d.lastX) / zoom / dt) + 0.3 * d.vx;
          d.vy = 0.7 * (-(pointer.y - d.lastY) / zoom / dt) + 0.3 * d.vy;
          d.lastX = pointer.x; d.lastY = pointer.y; d.lastT = now;
        }
      }

      onUp(pointer, inside) {
        const d = this.drag;
        if (!d || d.id !== pointer.id) return;
        this.drag = null;
        this.game.canvas.style.cursor = '';
        clearTimeout(d.holdTimer);
        if (d.held) {
          // La bulle reste un instant après le relâchement ; l'appui n'ouvre rien.
          this.tankTipUntil = performance.now() + LABEL_HOLD_MS;
          return;
        }
        // Au doigt, rien ne « survole » : le nom reste un instant, puis s'efface.
        if (pointer.wasTouch && this.hoverId) this.hoverUntil = performance.now() + LABEL_HOLD_MS;
        if (d.labour && d.moved) {
          this.clearLabourMarks();
          if (d.labour.tiles.length) bridge.act('hoe-many', { cases: d.labour.tiles.join(',') });
          return;
        }
        if (!d.moved) {
          // Appui : la vue revient où elle était (elle a pu bouger de quelques pixels).
          this.setCentre(d.cx, d.cy);
          if (inside) this.tap(d.wx, d.wy);
          return;
        }
        // Élan léger, seulement si le doigt bougeait encore au moment du relâchement.
        if (reducedMotion() || performance.now() - d.lastT > 80) return;
        this.vx = clamp(d.vx, -MAX_SPEED, MAX_SPEED);
        this.vy = clamp(d.vy, -MAX_SPEED, MAX_SPEED);
      }

      update(time, delta) {
        const dt = Math.min(delta, 50);
        // Déplacement et fondu suivent l'horloge réelle : ils durent le même temps même
        // si les images sont lentes (Phaser plafonne `delta`).
        if (this.pan) this.stepPan();
        else if (this.vx || this.vy) this.stepInertia(dt);
        if (this.lightFade) this.stepLight();
        if (this.tileAnims.length && !this.room) this.stepTileAnims(time);
        if (this.hoverUntil && !this.drag && performance.now() >= this.hoverUntil) this.setHover(null);
        if (this.tankTipUntil && performance.now() >= this.tankTipUntil) this.showTankTip(false);
        this.syncTankTip();
        // Filet de sécurité : le fond est vérifié toutes les quelques secondes.
        if (time >= this.groundCheckAt) { this.groundCheckAt = time + GROUND_CHECK_MS; this.repairGround(false); }
        // Dans un intérieur : ni bêtes ni nuages, ni étiquettes de bâtiments.
        if (this.ambient && !this.room) this.ambient.update(delta);
        if (this.fermier) this.fermier.update(delta, this.room ? this.room.id : null);
        if (!this.room) this.placeLabels();
        this.placePiles();
        this.placeGain();
        this.reportView();
      }

      stepInertia(dt) {
        if (this.drag) { this.vx = this.vy = 0; return; }
        const free = this.setCentre(this.cx + this.vx * dt, this.cy + this.vy * dt);
        const k = Math.exp(-dt / INERTIA_MS);
        this.vx *= k; this.vy *= k;
        if (!free || Math.hypot(this.vx, this.vy) < 0.01) this.vx = this.vy = 0;
      }

      /* ---------- vue : repère courant, déplacement demandé ---------- */

      // Les trois repères de la carte, de gauche à droite : l'étable, la maison avec la zone de
      // culture, le moulin avec la serre. Chacun est le centre des rectangles qu'il réunit : ils
      // suivent la carte, où que les bâtiments y soient posés.
      makeScreens() {
        const centre = (...names) => {
          const r = names.map((n) => this.objects[n]);
          const x0 = Math.min(...r.map((o) => o.x)), x1 = Math.max(...r.map((o) => o.x + o.width));
          const y0 = Math.min(...r.map((o) => o.y)), y1 = Math.max(...r.map((o) => o.y + o.height));
          return { x: (x0 + x1) / 2, y: (y0 + y1) / 2 };
        };
        this.screens = [centre('grange'), centre('maison', 'zone_culture'), centre('moulin', 'serre')];
      }

      // Bornes du centre de la vue : elle ne sort jamais de la carte.
      bounds() {
        const cam = this.cameras.main;
        if (this.room) {                             // intérieur : de gauche à droite seulement
          const f = this.room.full, vw = this.scale.width / cam.zoom;
          return f.w > vw ? { minX: f.x + vw / 2, maxX: f.x + f.w - vw / 2, minY: this.cy, maxY: this.cy } : { minX: this.cx, maxX: this.cx, minY: this.cy, maxY: this.cy };
        }
        const vw = this.scale.width / cam.zoom, vh = this.scale.height / cam.zoom;
        return { minX: vw / 2, maxX: this.world.w - vw / 2, minY: vh / 2, maxY: this.world.h - vh / 2 };
      }

      // Où en est la vue, pour la page : `ecran` = repère le plus proche, 0 (gauche), 1 (milieu)
      // ou 2 (droite) ; `points` = centre de chaque repère ; `min` et `max` = bornes du centre ;
      // `mobile` = la carte dépasse-t-elle de la zone ?
      viewInfo() {
        const b = this.bounds();
        const min = b.minX, max = b.maxX;
        const mobile = max - min > 1 || b.maxY - b.minY > 1;
        const xs = this.screens.map((p) => clamp(p.x, min, max));
        let ecran = 0;
        xs.forEach((x, i) => { if (Math.abs(this.cx - x) < Math.abs(this.cx - xs[ecran])) ecran = i; });
        return {
          x: this.cx, min, max, mobile, ecrans: xs.length, points: this.screens.map((p) => ({ x: p.x, y: p.y })),
          ecran: mobile ? ecran : 1,
          gauche: mobile && this.cx > xs[0] + 1,               // il reste un repère à gauche
          droite: mobile && this.cx < xs[xs.length - 1] - 1,   // il reste un repère à droite
          glisse: this.dragged,
          bas: mobile && this.cy < b.maxY - 1,                // FLU-07 : la carte continue vers le bas
          interieur: this.room ? this.room.id : null,
        };
      }

      // Prévient la page quand quelque chose qu'elle affiche a changé (pas à chaque image).
      reportView() {
        if (!bridge || !bridge.onView) return;
        const v = this.viewInfo();
        const key = [v.ecran, v.mobile, v.gauche, v.droite, v.bas, v.glisse, v.interieur].join();
        if (key === this.viewKey) return;
        this.viewKey = key;
        bridge.onView(v);
      }

      // Centre d'un lieu de la carte (bâtiment affiché, Zone de culture ou Champ), en px de carte.
      place(id) {
        // version 1.15 : la Zone de culture couvre toute la carte ; son repère reste
        // l'ancienne zone (rectangle zone_culture_1), près de la maison
        if (id === 'zone') {
          const z = this.objects.zone_culture;
          return z ? { x: z.x + z.width / 2, y: z.y + z.height / 2 } : null;
        }
        if (id === 'zone2') return null;
        const e = this.buildings.get(id);
        return e ? { x: e.sprite.x + e.sprite.width / 2, y: e.sprite.y - e.sprite.height / 2 } : null;
      }

      // Glisse jusqu'à x (px de carte, sans changer de hauteur), jusqu'à un point { x, y } ou
      // jusqu'à un lieu ('maison', 'etable', 'zone'…). `now` : sans animation. Renvoie false si
      // le lieu n'est pas sur la carte.
      panTo(target, now) {
        if (this.room) return false;                 // dans un intérieur, la vue ne glisse pas
        const p = typeof target === 'number' ? { x: target, y: this.cy }
          : target && typeof target === 'object' ? target : this.place(target);
        if (!p || !Number.isFinite(p.x) || !Number.isFinite(p.y)) return false;
        this.vx = this.vy = 0;
        if (now || reducedMotion()) { this.pan = null; this.setCentre(p.x, p.y); return true; }
        const b = this.bounds();
        this.pan = { x0: this.cx, y0: this.cy, x1: clamp(p.x, b.minX, b.maxX), y1: clamp(p.y, b.minY, b.maxY), t0: performance.now() };
        return true;
      }

      stepPan() {
        const p = this.pan;
        const t = Math.min(1, (performance.now() - p.t0) / PAN_MS);
        const k = 1 - Math.pow(1 - t, 3);            // départ vif, arrivée douce
        this.setCentre(p.x0 + (p.x1 - p.x0) * k, p.y0 + (p.y1 - p.y0) * k);
        if (t >= 1) this.pan = null;
      }

      /* ---------- lumière du jour ---------- */

      // Passe à la lumière de l'heure donnée : en fondu, ou tout de suite (`now`, premier
      // affichage, animations réduites).
      setLight(hour, now) {
        const to = hour == null ? [255, 255, 255] : lightAt(hour);
        if (now || reducedMotion()) { this.lightFade = null; this.applyLight(to); return; }
        this.lightFade = { from: this.lightNow.slice(), to, t0: performance.now() };
      }

      stepLight() {
        const f = this.lightFade;
        const t = Math.min(1, (performance.now() - f.t0) / LIGHT_MS);
        this.applyLight(f.from.map((c, i) => c + (f.to[i] - c) * t));
        if (t >= 1) this.lightFade = null;
      }

      applyLight(rgb) {
        this.lightNow = rgb;
        const c = rgb.map((v) => clamp(Math.round(v), 0, 255));
        const color = (c[0] << 16) | (c[1] << 8) | c[2];
        this.light.setFillStyle(color, 1).setVisible(color !== 0xffffff);
      }

      /* ---------- étiquettes (DOM) ---------- */

      // Une étiquette par lieu affiché : un bouton DOM qui ne reçoit pas les appuis (ils
      // traversent jusqu'à la carte, qui teste elle-même la zone de l'étiquette), mais qui
      // reste accessible au clavier : Entrée y déclenche `stage-open`, comme tout bouton.
      // Le nom ne s'affiche qu'au survol du lieu (souris), pendant qu'on le touche (doigt)
      // ou quand le bouton a le focus (clavier). La pastille « à faire », elle, reste visible.

      // Lieu survolé ou touché (null : aucun).
      setHover(id) {
        this.hoverUntil = 0;
        if (id === this.hoverId) return;
        this.hoverId = id || null;
        for (const L of this.labels.values()) this.applyShown(L);
      }

      applyShown(L) {
        const shown = L.id === this.hoverId || !!L.focus;
        if (shown === L.shown) return;
        L.shown = shown;
        L.el.classList.toggle('show', shown);
        L.w = 0;                                 // la taille change : à remesurer
      }

      // Lieu désigné par un résultat de hitAt() : une parcelle désigne sa zone ('zone' ou 'zone2').
      placeOf(hit) {
        if (!hit) return null;
        if (hit.treeHarvest || hit.treeSlot !== undefined) return 'verger';
        return hit.plot || hit.hoe ? hit.place : hit.window || null;
      }

      placeAt(wx, wy) { return this.placeOf(this.hitAt(wx, wy)); }

      syncLabel(id, info, win, ax, ay, align) {
        let L = this.labels.get(id);
        if (!info) {
          if (L) { L.el.remove(); this.labels.delete(id); }
          return;
        }
        if (!L) {
          const el = document.createElement('button');
          el.type = 'button';
          el.className = 'stage-label';
          el.dataset.action = 'stage-open';
          el.dataset.window = win;
          el.innerHTML = '<span class="stage-label-name"></span><span class="stage-label-badge" hidden></span>';
          labelLayer.appendChild(el);
          L = { el, id, window: win, name: null, badge: null, w: 0, h: 0, tr: '', off: false, shown: false, focus: false };
          const self = L;
          el.addEventListener('focus', () => { self.focus = true; this.applyShown(self); });
          el.addEventListener('blur', () => { self.focus = false; this.applyShown(self); });
          this.labels.set(id, L);
          if (id === this.hoverId) this.applyShown(L);
        }
        const name = String(info.nom || id), badge = Math.max(0, info.badge | 0);
        if (name !== L.name || badge !== L.badge) {
          L.name = name; L.badge = badge;
          L.el.firstChild.textContent = name;
          const b = L.el.lastChild;
          b.hidden = !badge;
          b.textContent = badge > 9 ? '9+' : String(badge);
          L.el.setAttribute('aria-label', badge ? name + ' : ' + badge + ' à faire' : name);
          L.el.classList.toggle('todo', !!badge);
          L.w = 0;                               // à remesurer
        }
        L.ax = ax; L.ay = ay; L.align = align || 'centre';
      }

      // Replace chaque étiquette au-dessus de son lieu (positions entières en pixels de
      // l'écran : le texte reste net, même avec un zoom non entier).
      placeLabels() {
        if (!this.labels.size) return;
        const dpr = pixelRatio();
        const k = this.cameras.main.zoom / dpr;                    // px CSS par px de carte
        const left = this.cx - this.scale.width / this.cameras.main.zoom / 2;
        const top = this.cy - this.scale.height / this.cameras.main.zoom / 2;
        const snap = (v) => Math.round(v * dpr) / dpr;
        for (const L of this.labels.values()) {
          if (!L.shown && !L.badge) continue;     // ni nom ni pastille : rien à placer
          if (!L.w) { L.w = L.el.offsetWidth; L.h = L.el.offsetHeight; if (!L.w) continue; }
          const x = (L.ax - left) * k - (L.align === 'gauche' ? 0 : L.w / 2);
          const y = Math.max(0, (L.ay - top) * k - L.h - LABEL_GAP);
          const tr = 'translate(' + snap(x) + 'px,' + snap(y) + 'px)';
          if (tr !== L.tr) { L.tr = tr; L.el.style.transform = tr; }
          // Une étiquette dont il ne reste qu'un bout au bord de l'écran est masquée.
          const seen = Math.min(x + L.w, this.scale.width / dpr) - Math.max(x, 0);
          const off = seen < L.w * 0.6;
          if (off !== L.off) { L.off = off; L.el.style.visibility = off ? 'hidden' : ''; }
        }
      }

      // Étiquette sous un point de la carte : sa boîte, élargie à 44 px CSS au besoin.
      labelAt(wx, wy) {
        const k = this.cameras.main.zoom / pixelRatio();
        const top = this.cy - this.scale.height / this.cameras.main.zoom / 2;
        for (const L of this.labels.values()) {
          if (!L.w || L.off || (!L.shown && !L.badge)) continue;   // une étiquette invisible ne se touche pas
          const w = Math.max(L.w, MIN_TAP) / k, h = Math.max(L.h, MIN_TAP) / k;
          const cx = L.align === 'gauche' ? L.ax + L.w / k / 2 : L.ax;
          const cy = Math.max(top + L.h / k / 2, L.ay - (LABEL_GAP + L.h / 2) / k);
          if (Math.abs(wx - cx) <= w / 2 && Math.abs(wy - cy) <= h / 2) return L;
        }
        return null;
      }

      /* ---------- appuis ---------- */

      // Les zones de parcelles : la Zone de culture ('zone'), le Champ ('zone2') et les
      // emplacements de chaque intérieur. `pos(i)` = coin haut-gauche de la i-ième parcelle
      // (null s'il n'y a plus d'emplacement), `at(x, y)` = rang de la parcelle sous un point
      // (-1 : aucune), `place` = lieu dont le nom s'affiche au survol, `window` = fenêtre
      // ouverte par une parcelle où il n'y a rien à faire.
      zones(model) {
        const m = model || lastModel;
        // Version 1.9 : chaque parcelle a sa case (p.case) dans une grille fixe de `cases`
        // cases ; une case sans parcelle est de l'herbe, que la houe peut labourer.
        const grid = (id, g, plots, zone, cases) => ({
          id, place: id, window: id, plots, zone, cases,
          slot: (p, i) => (typeof p.case === 'number' ? p.case : i),
          pos: (i) => ({ x: g.x + (i % g.cols) * T, y: g.y + Math.floor(i / g.cols) * T }),
          at: (wx, wy) => {
            const col = Math.floor((wx - g.x) / T), row = Math.floor((wy - g.y) / T);
            const i = col >= 0 && col < g.cols && row >= 0 ? row * g.cols + col : -1;
            return i < cases ? i : -1;
          },
        });
        const list = [
          grid('zone', this.grid, m ? m.plots : [], 1, m ? m.cases || 0 : 0),
        ];
        for (const r of Object.values(this.rooms)) {
          if (!r.def.plots) continue;                // un intérieur sans parcelles (la maison)
          list.push({
            id: 'interieur-' + r.id, place: null, window: r.def.window, plots: m ? m[r.def.plots] || [] : [],
            slot: (p, i) => i,
            pos: (i) => r.slots[i] || null,
            at: (wx, wy) => {
              const i = r.slotAt.get(Math.floor(wx / T) * T + ',' + Math.floor(wy / T) * T);
              return i === undefined ? -1 : i;
            },
          });
        }
        return list;
      }

      // FLU-12 : un glissement qui part d'une case verte (labourable maintenant) laboure les
      // cases vertes traversées : elles sont marquées pendant le geste, puis envoyées toutes
      // ensemble au relâchement (un seul rendu, une seule sauvegarde).
      labourStart(wx, wy) {
        const m = lastModel;
        if (!m || !m.houe || this.room || !m.labourables) return null;
        const W = this.grid.cols;
        const t = Math.floor(wy / T) * W + Math.floor(wx / T);
        const ok = new Set(m.labourables);
        if (!ok.has(t)) return null;
        return { ok, tiles: [], seen: new Set(), last: { x: wx, y: wy }, marks: [] };
      }

      labourTo(d, wp) {
        const L = d.labour, W = this.grid.cols;
        const steps = Math.max(1, Math.ceil(Math.hypot(wp.x - L.last.x, wp.y - L.last.y) / 4));
        for (let k = 0; k <= steps; k++) {
          const x = L.last.x + ((wp.x - L.last.x) * k) / steps, y = L.last.y + ((wp.y - L.last.y) * k) / steps;
          const t = Math.floor(y / T) * W + Math.floor(x / T);
          if (L.seen.has(t)) continue;
          L.seen.add(t);
          if (!L.ok.has(t)) continue;
          L.tiles.push(t);
          L.marks.push(this.add.rectangle((t % W) * T + T / 2, Math.floor(t / W) * T + T / 2, T - 2, T - 2, 0x8a5a2b, 0.55).setDepth(1.6));
        }
        L.last = { x: wp.x, y: wp.y };
        this.labourMarks = L.marks;
      }

      clearLabourMarks() {
        for (const r of this.labourMarks || []) r.destroy();
        this.labourMarks = null;
      }

      // Version 1.15 : la tuile peut-elle être labourée (modèle.terrain, une chaîne par rangée) ?
      arable(i) {
        const t = lastModel && lastModel.terrain;
        const W = this.grid.cols;
        const row = t && t[Math.floor(i / W)];
        return !!row && row[i % W] === '#';
      }

      // Ce qui se trouve sous un point de la carte : une parcelle (exactement sa tuile),
      // sinon une étiquette, sinon le bâtiment ou l'arbre le plus en avant.
      hitAt(wx, wy) {
        const hoeing = !!(lastModel && lastModel.houe);
        let herbe = null;                            // une tuile labourable sous le doigt
        let refus = null;                            // en mode houe : une tuile qui ne se laboure pas
        // Version 1.18 : la bulle d'un tas à ramasser passe devant tout.
        const pile = !this.room && !hoeing ? this.pileAt(wx, wy) : null;
        if (pile) return { pile: pile.id };
        for (const z of this.zones()) {
          const i = z.at(wx, wy);
          if (i < 0) continue;
          if (hoeing && z.zone) refus = { hoe: { zone: z.zone, case: i }, place: z.place };
          const p = z.plots.find((q, k) => z.slot(q, k) === i) || null;
          // version 1.15 : en mode houe, toute tuile labourable (ou terre) se laboure ou se rebouche
          if (hoeing && z.zone && (p || this.arable(i))) return { hoe: { zone: z.zone, case: i }, place: z.place };
          if (p) return { plot: p, place: z.place, open: z.window };
          if (z.zone && this.arable(i)) herbe = { window: z.window, place: z.place, herbe: true };
        }
        if (this.room) return this.propAt(wx, wy);   // dans un intérieur : ses meubles, rien d'autre
        // la hache en main : un arbre de la carte sous le doigt se coupe
        if (lastModel && lastModel.hache) {
          const arbre = this.mapTreeAt(wx, wy);
          if (arbre) return { chop: arbre };
        }
        const label = this.labelAt(wx, wy);
        if (label) return { window: label.window };
        const min = (MIN_TAP * pixelRatio()) / this.cameras.main.zoom;
        let best = null;
        // (x, y) = coin bas-gauche de la zone touchée ; w, h = sa taille.
        const test = (x, y, w, h, depth, win) => {
          const padX = Math.max(0, (min - w) / 2), padY = Math.max(0, (min - h) / 2);
          if (wx < x - padX || wx > x + w + padX || wy < y - h - padY || wy > y + padY) return;
          if (!best || depth > best.depth) best = { depth, window: win };
        };
        for (const e of this.buildings.values()) test(e.sprite.x, e.sprite.y, e.sprite.width, e.sprite.height, e.sprite.depth, e.def.window);
        // Les panneaux solaires du toit ouvrent la fenêtre Énergie ; la pompe du puits et la
        // citerne, la fenêtre Eau (devant la maison et les autres bâtiments : profondeur +1).
        if (this.roofPanels) {
          const r = this.roofPanels;
          test(r.x, r.y + r.height, r.width, r.height, r.depth + 1, 'energie');
        }
        if (this.pump && this.well) test(this.well.x, this.well.y, this.well.width, this.well.height, this.well.depth + 1, 'eau');
        if (this.tank) test(this.tank.x, this.tank.y, this.tank.width, this.tank.height, this.tank.depth + 1, 'eau');
        // Version 1.13 : un arbre en fruits se cueille, un emplacement libre propose de
        // planter ; un autre arbre ouvre la fenêtre du Verger.
        for (const e of this.trees.values()) {
          const s = e.sprite, w = s.displayWidth * TREE_BODY;
          const b = e.key === 'verger' ? this.orchardBox(e) : { w, h: s.displayHeight };
          const before = best;
          test(s.x - b.w / 2, s.y, b.w, b.h, s.depth, 'verger');
          if (best !== before) best.tree = e.a;
        }
        if (best && best.tree) {
          if (best.tree.fruits) return { treeHarvest: best.tree.id };
          if (best.tree.libre) return { treeSlot: best.tree.case };
        }
        // version 1.15 : l'herbe labourable ouvre la fenêtre de la Zone de culture (et sa houe)
        // en mode houe, une tuile qui ne se laboure pas dit pourquoi (le moteur refuse)
        return best ? { window: best.window } : herbe || refus;
      }

      tap(wx, wy) {
        if (this.ambient) this.ambient.scare(wx, wy);   // un appui tout près fait s'envoler les oiseaux
        const hit = this.hitAt(wx, wy);
        // Version 1.19 : dehors, un double appui sur l'herbe ou un chemin y envoie le personnage ;
        // sur le Poulailler ou l'Étable, il va y ramasser (œufs ; lait et laine). L'appui simple
        // (la fenêtre de la Zone de culture, du bâtiment) attend donc DOUBLE_TAP_MS de voir s'il
        // n'est pas suivi d'un second.
        const farmyard = hit && (hit.window === 'poulailler' || hit.window === 'etable') ? hit.window : null;
        if (!this.room && (!hit || hit.herbe || farmyard)) {
          const now = performance.now(), prev = this.lastTap;
          const near = prev && Math.hypot(wx - prev.x, wy - prev.y) <= (DOUBLE_TAP_PX * pixelRatio()) / this.cameras.main.zoom;
          if (prev && now - prev.t <= DOUBLE_TAP_MS && near) {
            clearTimeout(prev.timer);
            this.lastTap = null;
            if (farmyard) this.goCollect(farmyard, hit.window);
            else this.goHere(wx, wy);
            return;
          }
          if (prev) clearTimeout(prev.timer);
          const tapNow = { t: now, x: wx, y: wy, timer: 0 };
          if (hit) tapNow.timer = setTimeout(() => { if (this.lastTap === tapNow) this.lastTap = null; bridge.act('stage-open', { window: hit.window }); }, DOUBLE_TAP_MS);
          this.lastTap = tapNow;
          return;
        }
        if (!hit) return;
        if (hit.pile) { if (this.fermier && !(lastModel && lastModel.nuit)) this.fermier.fetch(hit.pile); return; }   // la nuit, la famille dort
        if (hit.window) { bridge.act('stage-open', { window: hit.window }); return; }
        if (hit.hoe) { bridge.act('hoe', { zone: hit.hoe.zone, case: hit.hoe.case }); return; }
        if (hit.chop) { this.chop(hit.chop); return; }
        if (hit.treeHarvest) { bridge.act('harvest-tree', { id: hit.treeHarvest }); return; }
        if (hit.treeSlot !== undefined) { bridge.act('tree-slot', { case: hit.treeSlot }); return; }
        const p = hit.plot;
        if (!p.culture) bridge.act('plant-open', { id: p.id });
        else if (p.mature) bridge.act('harvest', { id: p.id });
        else if (!p.arrosee) bridge.act('water', { id: p.id });
        else bridge.act('stage-open', { window: hit.open });   // rien à faire sur la carte : la fenêtre de sa zone
      }

      /* ---------- la hache : les arbres de la carte ---------- */

      // Les arbres de la carte, lus une fois dans ses couches d'arbres : { id, layer, cells,
      // x0, y0, x1, y1 (bornes en px), foot: { x, y }, kind }. id : « colonne,rangée » de la
      // case du pied (ce que le jeu enregistre pour compter les coups du jour).
      mapTrees() {
        if (this.treeList) return this.treeList;
        const list = [];
        const raw = this.mapRaw;
        if (!raw) return (this.treeList = list);
        const W = raw.width, H = raw.height, T = raw.tilewidth;
        const set = (raw.tilesets || []).find((t) => t.image && String(t.image).split('/').pop() === MAP.image);
        const cols = set ? set.columns || 75 : 75;
        const first = set ? set.firstgid : 1;
        const kindOf = (n) => {
          const c = n % cols, r = Math.floor(n / cols);
          for (const [k, d] of Object.entries(CHOP_TREES)) {
            const [bc, br, bw, bh] = d.box;
            if (c >= bc && c < bc + bw && r >= br && r < br + bh) return { kind: k, c: c - bc, r: r - br };
          }
          return null;
        };
        for (const layer of raw.layers) {
          if (layer.type !== 'tilelayer' || !Array.isArray(layer.data) || !/tree|arbre/i.test(layer.name || '') || /top|haut/i.test(layer.name || '')) continue;
          const seen = new Uint8Array(W * H);
          const gidAt = (i) => layer.data[i] & 0x0fffffff;
          for (let i0 = 0; i0 < W * H; i0++) {
            if (seen[i0] || !gidAt(i0)) continue;
            const cells = [], stack = [i0];
            seen[i0] = 1;
            let c0 = W, c1 = 0, r0 = H, r1 = 0;
            while (stack.length) {
              const i = stack.pop(), c = i % W, r = (i / W) | 0;
              cells.push(i);
              c0 = Math.min(c0, c); c1 = Math.max(c1, c); r0 = Math.min(r0, r); r1 = Math.max(r1, r);
              for (const j of [c > 0 ? i - 1 : -1, c < W - 1 ? i + 1 : -1, i - W, i + W]) {
                if (j >= 0 && j < W * H && !seen[j] && gidAt(j)) { seen[j] = 1; stack.push(j); }
              }
            }
            const w = c1 - c0 + 1, h = r1 - r0 + 1;
            if (w < 2 || w > 6 || h < 3 || h > 7) continue;            // buissons, souches, forêts soudées
            const foot = cells.filter((i) => ((i / W) | 0) === r1).map((i) => i % W);
            const fx = (Math.min(...foot) + Math.max(...foot) + 1) / 2 * T;
            // l'arbre du pack (feuillu, sapin) : son coin haut-gauche, d'après une de ses tuiles
            let kind = null, ox = 0, oy = 0;
            for (const i of cells) {
              const k = kindOf(gidAt(i) - first);
              if (k) { kind = k.kind; ox = ((i % W) - k.c) * T; oy = (((i / W) | 0) - k.r) * T; break; }
            }
            list.push({
              id: Math.floor(fx / T) + ',' + r1, layer, cells: new Set(cells),
              x0: c0 * T, y0: r0 * T, x1: (c1 + 1) * T, y1: (r1 + 1) * T,
              foot: { x: fx, y: (r1 + 1) * T - 3 }, kind, ox, oy,
            });
          }
        }
        return (this.treeList = list);
      }

      // L'arbre sous le point (wx, wy) : le plus en avant (pied le plus bas) dont le houppier
      // ou le tronc contient le point.
      mapTreeAt(wx, wy) {
        let best = null;
        for (const t of this.mapTrees()) {
          if (wx < t.x0 + 4 || wx > t.x1 - 4 || wy < t.y0 + 4 || wy > t.y1) continue;
          if (!best || t.foot.y > best.foot.y) best = t;
        }
        return best;
      }

      // Un coup de hache sur l'arbre `t` : le jeu donne le bois tout de suite (bridge.chop) ;
      // le personnage va au tronc, frappe, et au coup l'arbre tremble et « +1 🪵 » monte.
      chop(t) {
        const got = bridge && bridge.chop ? bridge.chop(t.id) : null;
        if (!got) return;
        const hit = () => { this.shakeTree(t); this.showGain(got); };
        if (!this.fermier || !this.fermier.chop(t.foot, hit)) hit();
      }

      // L'arbre tremble : celui du pack joue sa feuille de sprites (l'arbre de la carte est
      // masqué le temps de l'animation), les autres bougent d'un pixel de gauche à droite.
      shakeTree(t) {
        if (t.shaking) return;
        const d = t.kind ? CHOP_TREES[t.kind] : null;
        if (d && this.has(d.key) && !reducedMotion()) {
          t.shaking = true;
          if (!this.hiddenTrees) this.hiddenTrees = new Map();
          this.hiddenTrees.set(t.layer, t.cells);
          this.repaintCells(t.cells);
          const s = this.add.sprite(t.ox + d.dx, t.oy + d.dy, d.key, d.frames[0]).setOrigin(0).setDepth(0.5);
          let k = 0;
          const timer = this.time.addEvent({
            delay: 1000 / CHOP_FPS, repeat: d.frames.length - 1,
            callback: () => {
              k += 1;
              if (k < d.frames.length) { s.setFrame(d.frames[k]); return; }
              s.destroy();
              this.hiddenTrees.delete(t.layer);
              this.repaintCells(t.cells);
              t.shaking = false;
              timer.remove();
            },
          });
          return;
        }
        if (reducedMotion()) return;
        // sans feuille de sprites : on décale d'un pixel la part du sol qui le porte
        t.shaking = true;
        const g = this.textures.get('ground').getSourceImage();
        const tex = 'arbre_secoue';
        if (this.textures.exists(tex)) this.textures.remove(tex);
        const w = t.x1 - t.x0, h = t.y1 - t.y0;
        const c = this.textures.createCanvas(tex, w, h);
        c.getContext().drawImage(g, t.x0, t.y0, w, h, 0, 0, w, h);
        c.refresh();
        const img = this.add.image(t.x0, t.y0, tex).setOrigin(0).setDepth(0.5);
        const xs = [1, -1, 1, -1, 0];
        let k = 0;
        const timer = this.time.addEvent({
          delay: 70, repeat: xs.length - 1,
          callback: () => {
            img.x = t.x0 + xs[k];
            k += 1;
            if (k >= xs.length) { img.destroy(); t.shaking = false; timer.remove(); }
          },
        });
      }

      // Version 1.19 : le personnage va ramasser au Poulailler ou à l'Étable. Rien à y prendre :
      // la fenêtre du bâtiment s'ouvre, comme un appui simple. La nuit, la famille dort.
      goCollect(lieu, win) {
        if (lastModel && lastModel.nuit) return;
        if (this.fermier && this.fermier.collect(lieu)) return;
        bridge.act('stage-open', { window: win });
      }

      // Le personnage va au point (wx, wy) de la carte ; un rond marque un instant l'arrivée.
      // La nuit, la famille dort : rien.
      goHere(wx, wy) {
        if (!this.fermier || (lastModel && lastModel.nuit)) return;
        const at = this.fermier.goTo(wx, wy);
        if (!at) return;
        const g = this.add.graphics().setDepth(at.y - 1);
        g.lineStyle(1, 0xfff1d2, 0.95).strokeEllipse(at.x, at.y - 1, 12, 6);
        this.tweens.add({ targets: g, alpha: 0, duration: reducedMotion() ? 300 : 900, ease: 'Quad.easeIn', onComplete: () => g.destroy() });
      }

      /* ---------- synchronisation avec le jeu ---------- */

      sync(model, force) {
        if (!this.ready) return;
        // Le personnage compare ce modèle au précédent : une case qu'il n'a pas encore
        // travaillée garde son ancien dessin (voir js/fermier.js).
        this.rawModel = model;
        if (this.fermier) model = this.fermier.filter(model);
        const sfx = SFX;
        const rebuild = force || this.sfx !== sfx;   // premier affichage ou affichage forcé
        this.sfx = sfx;

        // Lumière de l'heure : en fondu, sauf au premier affichage.
        if (force || model.heure !== this.hour) { this.hour = model.heure; this.setLight(model.heure, force); }

        // Bâtiments : présents seulement si le jeu les a débloqués.
        // modèle.batiments[id] = { visible, nom, badge } (ou un simple booléen).
        const shown = model.batiments || {};
        const info = (id) => {
          const v = shown[id];
          const o = v && typeof v === 'object' ? v : { visible: !!v };
          return (id === 'maison' || o.visible) ? o : null;   // version 1.12 : la Zone de culture aussi, une fois la ferme ouverte
        };
        for (const def of BUILDINGS) {
          const want = info(def.id);
          const e = this.buildings.get(def.id);
          if (e && (!want || rebuild || !!want.ruine !== !!e.ruine)) { e.sprite.destroy(); this.buildings.delete(def.id); }
          if (want && !this.buildings.has(def.id)) this.buildings.set(def.id, { def, ruine: !!want.ruine, sprite: this.makeBuilding(def, sfx, !!want.ruine) });
          // Étiquette : centrée au-dessus de l'image.
          const s = want ? this.buildings.get(def.id).sprite : null;
          this.syncLabel(def.id, want, def.window, s ? s.x + s.width / 2 : 0, s ? s.y - s.height + (def.labelDown || 0) : 0);
        }
        this.syncPerso(model.perso | 0);
        this.syncRoofPanels(model.panneaux | 0);
        this.syncWell(!!model.pompe, !!model.pompeEnMarche);
        this.syncTank(model.citerne == null ? -1 : model.citerne | 0);

        // Parcelles des deux zones : on crée, met à jour, détruit. Tuiles jointives depuis le
        // coin de chaque rectangle (zone_culture_1, zone_culture_2).
        this.grid.cols = Math.max(1, model.cols | 0);
        const seen = new Set();
        for (const z of this.zones(model)) {
          z.plots.forEach((p, i) => {
            const at = z.pos(z.slot(p, i));
            if (!at) return;                         // plus de parcelles que d'emplacements
            seen.add(p.id);
            const x = at.x + T / 2, y = at.y + T / 2;
            let e = this.plots.get(p.id);
            if (!e) {
              e = { soil: this.add.image(x, y, 'ph_dry').setDepth(2), crop: null, key: '', tween: null };
              this.plots.set(p.id, e);
            }
            e.soil.setPosition(x, y).setTexture(p.arrosee ? this.tex('soil_wet', 'ph_wet') : this.tex('soil_dry', 'ph_dry'));
            this.syncCrop(e, p, x, y);
          });
          // Étiquette de la zone : calée à gauche sur les parcelles, au-dessus de la barrière.
          // version 1.15 : sur l'ancienne Zone de culture, près de la maison
          const o = z.place && this.objects.zone_culture;
          if (o) this.syncLabel(z.id, info(z.id), z.id, Math.round(o.x / T) * T, Math.round(o.y / T) * T - ZONE_LABEL_UP, 'gauche');
        }
        for (const [id, e] of this.plots) {
          if (!seen.has(id)) { this.destroyPlot(e); this.plots.delete(id); }
        }
        this.syncZoneGround(model);
        this.syncHoeGrid(model.labourables);
        this.syncTrees(model.arbres || [], sfx, rebuild);
        this.syncPiles(model.ramasser || []);
        this.syncRooms(model, force);
        // L'ambiance reçoit l'heure et les images des arbres (jamais le modèle) : elle
        // ne les anime pas, elle y fait partir feuilles et écureuils. Elle reçoit aussi l'image
        // de l'Étable et du Poulailler (s'ils sont affichés, avec leur vraie image) et le nombre
        // de bêtes : elle ouvre les portes le matin et fait sortir les bêtes.
        if (this.ambient) {
          const leafy = [];
          for (const e of this.trees.values()) if (e.key.indexOf('ph_') !== 0 && e.a.dessin >= ORCHARD_ADULT) leafy.push(e.sprite);
          const real = (id) => { const e = this.buildings.get(id); return e && e.sprite.texture.key.indexOf('ph_') !== 0 ? e.sprite : null; };
          const folds = { etable: real('etable'), poulailler: real('poulailler') };
          this.ambient.setContext({ hour: model.heure, trees: leafy, folds, herd: model.animaux || {} });
        }
        this.placeLabels();
      }

      // Version 1.17 : le personnage du joueur, un des 50 du catalogue (assets/personnages). Sa
      // planche est chargée la première fois qu'il est choisi ; d'ici là, la fermière.
      syncPerso(n) {
        if (!this.fermier || !n || n === this.persoN) return;
        this.persoN = n;
        const key = 'perso_' + n;
        const apply = () => { if (this.persoN === n && this.has(key)) this.fermier.setSheet(key); };
        if (this.textures.exists(key)) { apply(); return; }
        this.load.spritesheet(key, v('personnages/perso_' + String(n).padStart(2, '0') + '.png'), FERMIER_FRAME);
        this.load.once('complete', apply);
        this.load.start();
      }

      // Meuble d'un intérieur sous le doigt (zone d'appui élargie à 44 px CSS) : sa fenêtre.
      propAt(wx, wy) {
        const min = (MIN_TAP * pixelRatio()) / this.cameras.main.zoom;
        let best = null;
        for (const p of this.room.props || []) {
          const s = p.sprite;
          if (!s || !s.visible || !p.clic) continue;
          const w = Math.max(s.width, min), h = Math.max(s.height, min);
          const cx = s.x, cy = s.y - s.height / 2;
          if (Math.abs(wx - cx) <= w / 2 && Math.abs(wy - cy) <= h / 2 && (!best || s.depth > best.depth)) best = s;
        }
        return best ? { window: best.getData('meuble') } : null;
      }

      // Meubles des intérieurs : absents, en filigrane ou construits (modèle.meubles).
      syncFurniture(meubles) {
        for (const r of Object.values(this.rooms)) {
          for (const p of r.props || []) {
            const m = meubles ? meubles[p.name] : null;
            const objet = m && typeof m === 'object';
            const st = objet ? 2 : m | 0;
            const dessin = objet ? m.dessin : p.name;
            const key = 'meuble_' + dessin;
            if (!st || !this.has(key) || (p.sprite && p.dessin !== dessin)) {
              if (p.sprite) { p.sprite.destroy(); p.sprite = null; }
              if (!st || !this.has(key)) continue;
            }
            if (!p.sprite) {
              const flat = MEUBLE_PLAT.test(dessin);
              p.sprite = this.add.image(Math.round(p.x + p.w / 2), p.y + p.h, key).setOrigin(0.5, 1).setDepth(flat ? 1 : p.y + p.h);
              p.sprite.setData('meuble', p.name);
              p.dessin = dessin;
            }
            p.clic = !objet;                       // four, cuisine, frigo : leur fenêtre
            p.sprite.setAlpha(st === 1 ? MEUBLE_GHOST : 1);
          }
        }
      }

      // Intérieurs : les emplacements que le joueur n'a pas encore sont assombris (sinon rien
      // ne distingue une parcelle vide de la terre du bac), puis la vue entre ou sort selon
      // modèle.interieur.
      syncRooms(model, force) {
        const rooms = Object.values(this.rooms);
        const key = rooms.map((r) => (model[r.def.plots] || []).length).join();
        if (key !== this.shadeKey && this.roomShade) {
          this.shadeKey = key;
          this.roomShade.clear();
          for (const r of rooms) {
            this.roomShade.fillStyle(global.Phaser.Display.Color.HexStringToColor(r.bg).color, ROOM_SHADE);
            for (let i = (model[r.def.plots] || []).length; i < r.slots.length; i++) this.roomShade.fillRect(r.slots[i].x, r.slots[i].y, T, T);
          }
        }
        this.syncFurniture(model.meubles);
        const want = model.interieur && this.rooms[model.interieur] ? this.rooms[model.interieur] : null;
        if (want !== this.room) this.setRoom(want, force);
      }

      // Entre dans un intérieur (ou en sort, `room` nul) : la vue saute, avec un court fondu.
      // À la sortie, elle revient devant le bâtiment.
      setRoom(room, now) {
        const cam = this.cameras.main;
        const left = this.room;
        this.vx = this.vy = 0;
        this.pan = null;
        this.drag = null;
        this.setHover(null);
        if (room && !left) this.outside = { x: this.cx, y: this.cy };
        this.room = room;
        this.roomPanned = false;
        const back = !room && left ? this.place(left.def.building) || this.outside : null;
        if (back) { this.cx = back.x; this.cy = back.y; }
        cam.setBackgroundColor(room ? room.bg : '#699654');
        labelLayer.style.visibility = room ? 'hidden' : '';
        this.game.canvas.style.cursor = '';
        this.fit();
        if (!now && !reducedMotion()) {
          const c = global.Phaser.Display.Color.HexStringToColor((room || left || { bg: '#06182a' }).bg);
          cam.fadeIn(ROOM_FADE_MS, c.red, c.green, c.blue);
        }
      }

      // Arbres du Verger (version 1.13) : chaque case du Verger (arbre ou emplacement libre)
      // se pose sur le rectangle arbre_verger_<case + 1>, pied au bas du rectangle, avec le
      // dessin de son stade. Au-delà des rectangles de la carte, rien n'est dessiné.
      // modèle.arbres[] = { case, id, libre, fruits, dessin } (dessin : ORCHARD_FRAMES).
      syncTrees(arbres, sfx, rebuild) {
        const seen = new Set();
        const own = this.has('verger');
        for (const a of arbres) {
          const o = this.objects[TREE_OBJECT + (a.case + 1)];
          if (!o) continue;
          seen.add(a.case);
          const key = own ? 'verger' : a.libre ? null : this.tex('tree_' + sfx, this.tex('tree_sp', 'ph_arbre'));
          let e = this.trees.get(a.case);
          if (e && (rebuild || e.key !== key)) { e.sprite.destroy(); if (e.shadow) e.shadow.destroy(); this.trees.delete(a.case); e = null; }
          if (!key) continue;
          if (!e) {
            const sprite = this.add.image(0, 0, key, key.indexOf('ph_') !== 0 ? 0 : undefined);
            sprite.setOrigin(0.5, 1);
            e = { sprite, key, a };
            this.trees.set(a.case, e);
          }
          e.a = a;
          if (own) e.sprite.setFrame(a.dessin);
          const x = Math.round(o.x + o.width / 2), y = Math.round(o.y + o.height);
          e.sprite.setPosition(x, y).setDepth(y);
          // un arbre adulte a son ombre portée, sur le sol
          const ombre = this.has(TREE_SHADOW.key) && (!own || a.dessin >= ORCHARD_ADULT);
          if (ombre && !e.shadow) e.shadow = this.add.image(0, 0, TREE_SHADOW.key).setOrigin(0).setDepth(SHADOWS.depth);
          if (!ombre && e.shadow) { e.shadow.destroy(); e.shadow = null; }
          if (e.shadow) e.shadow.setPosition(x + TREE_SHADOW.dx, y + TREE_SHADOW.dy);
        }
        for (const [c, e] of this.trees) {
          if (!seen.has(c)) { e.sprite.destroy(); if (e.shadow) e.shadow.destroy(); this.trees.delete(c); }
        }
      }

      // Zone touchable d'une case du Verger : la taille du dessin (les petits dessins
      // n'occupent que le bas de leur image de 80×80).
      orchardBox(e) {
        const d = e.a ? e.a.dessin : ORCHARD_FRAMES.arbre;
        if (d === ORCHARD_FRAMES.libre) return { w: 28, h: 12 };
        if (d === ORCHARD_FRAMES.jeune) return { w: 18, h: 24 };
        if (d === ORCHARD_FRAMES.arbuste) return { w: 32, h: 34 };
        return { w: e.sprite.displayWidth * TREE_BODY, h: e.sprite.displayHeight };
      }

      // Panneaux solaires sur le versant droit du toit : seulement sur la vraie image de la
      // maison réparée (ni ruine, ni dessin de secours), juste devant elle.
      syncRoofPanels(n) {
        const e = this.buildings.get('maison');
        const house = e && !e.ruine && e.sprite.texture.key.indexOf('house_') === 0 ? e.sprite : null;
        if (!house || n <= 0 || !this.has(ROOF_PANELS.key)) {
          if (this.roofPanels) { this.roofPanels.destroy(); this.roofPanels = null; }
          return;
        }
        if (!this.roofPanels) this.roofPanels = this.add.image(0, 0, ROOF_PANELS.key, 0).setOrigin(0);
        this.roofPanels.setFrame(Math.min(n, ROOF_PANELS.max) - 1)
          .setPosition(house.x + ROOF_PANELS.x, house.y - house.height + ROOF_PANELS.y)
          .setDepth(house.depth + 0.5);
      }

      // Le puits est toujours là ; la pompe s'y ajoute une fois achetée. Comme un bâtiment :
      // bas-centre de l'image sur le bas-centre du rectangle, profondeur = y du pied.
      // En marche, la pompe vibre : un pixel à droite, puis à sa place, et ainsi de suite.
      syncWell(pompe, enMarche) {
        if (!this.has(WELL.key)) return;
        const F = WELL.frames;
        if (!this.well) this.well = this.placeProp(WELL);
        this.well.setFrame(pompe ? F.tuyau : F.puits);
        if (pompe && !this.pump) {
          this.pump = this.add.image(this.well.x, this.well.y, WELL.key, F.pompe).setOrigin(0, 1).setDepth(this.well.depth + 0.1);
        } else if (!pompe && this.pump) {
          this.pump.destroy();
          this.pump = null;
        }
        const shake = !!this.pump && enMarche && !reducedMotion();
        if (shake && !this.pumpShake) {
          this.pumpShake = this.time.addEvent({
            delay: PUMP_SHAKE_MS, loop: true,
            callback: () => { if (this.pump) this.pump.x = this.pump.x === this.well.x ? this.well.x + 1 : this.well.x; },
          });
        } else if (!shake && this.pumpShake) {
          this.pumpShake.remove();
          this.pumpShake = null;
          if (this.pump) this.pump.x = this.well.x;
        }
      }

      // La citerne, une fois le réservoir acheté : l'eau monte dans son tube de niveau.
      syncTank(niveau) {
        if (niveau < 0 || !this.has(TANK.key)) {
          if (this.tank) { this.tank.destroy(); this.tank = null; }
          return;
        }
        if (!this.tank) this.tank = this.placeProp(TANK);
        this.tank.setFrame(Math.min(niveau, TANK.max));
      }

      // Image d'une planche posée comme un bâtiment sur le rectangle `def.object`.
      placeProp(def) {
        const o = this.objects[def.object] || DEFAULT_OBJECTS[def.object];
        const w = def.frame.frameWidth;
        const h = def.frame.frameHeight;
        const x = clamp(Math.round(o.x + o.width / 2 - w / 2), 0, this.world.w - w);
        const y = clamp(Math.round(o.y + o.height), h, this.world.h);
        return this.add.image(x, y, def.key, 0).setOrigin(0, 1).setDepth(y);
      }

      // Pose le bas-centre de l'image sur le bas-centre du rectangle de la carte, sans sortir
      // de la carte. Profondeur = y du pied : ce qui est plus bas passe devant.
      makeBuilding(def, sfx, ruine) {
        const o = this.objects[def.object] || DEFAULT_OBJECTS[def.object];
        const wanted = def.suffixed ? def.tex + '_' + sfx : def.tex;
        const r = ruine && RUINES[def.id] && this.has(RUINES[def.id].key) ? RUINES[def.id] : null;
        const key = r ? r.key : this.tex(wanted, this.tex(def.suffixed ? def.tex + '_sp' : def.tex, 'ph_' + def.id));
        const real = key.indexOf('ph_') !== 0;
        let s;
        if (r) {
          s = this.add.image(0, 0, key, r.frame != null ? r.frame : undefined);   // délabré : immobile
        } else if (def.anim && real) {
          s = this.add.sprite(0, 0, key, 0);
          if (this.anims.exists(key) && !reducedMotion()) s.play(key);
        } else {
          s = this.add.image(0, 0, key, real && def.frame != null ? def.frame : undefined);
        }
        s.setOrigin(0, 1);
        if (def.flip) s.setFlipX(true);
        const x = clamp(Math.round(o.x + o.width / 2 - s.width / 2), 0, this.world.w - s.width);
        const y = clamp(Math.round(o.y + o.height), s.height, this.world.h);
        s.setPosition(Math.round(x), Math.round(y)).setDepth(Math.round(y));
        return s;
      }

      syncCrop(e, p, x, y) {
        const key = p.culture ? p.culture + ':' + p.phase : '';
        if (key !== e.key) {
          if (e.crop) { if (e.tween) e.tween.stop(); e.crop.destroy(); e.crop = null; e.tween = null; }
          e.key = key;
          if (p.culture) {
            const framed = this.has('crops') && CROP_SP[p.culture];
            if (framed) {
              e.crop = this.add.image(x, y + T / 2, 'crops', key).setOrigin(0.5, 1);
            } else {
              // Sans image : l'emoji de la culture, grossit avec les phases.
              e.crop = this.add.text(x, y + 6, p.icone, { fontSize: '12px' }).setOrigin(0.5, 1).setScale(0.45 + 0.18 * Math.max(0, p.phase));
            }
            e.crop.setDepth(y + 1);
            // Petite apparition : la case « change » sous les yeux du joueur.
            e.crop.setAlpha(0);
            this.tweens.add({ targets: e.crop, alpha: 1, duration: 250 });
          }
        }
        if (e.crop) e.crop.setPosition(x, e.crop.type === 'Text' ? y + 6 : y + T / 2);
        // Mûre : la plante se balance doucement pour attirer l'appui.
        if (e.crop && p.mature && !e.tween && !reducedMotion()) {
          e.tween = this.tweens.add({ targets: e.crop, angle: { from: -4, to: 4 }, duration: 600, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
        }
        if (e.crop && !p.mature && e.tween) { e.tween.stop(); e.tween = null; e.crop.setAngle(0); }
      }

      destroyPlot(e) {
        if (e.tween) e.tween.stop();
        if (e.crop) e.crop.destroy();
        e.soil.destroy();
      }
    }

    const dpr = pixelRatio();
    game = new global.Phaser.Game({
      type: global.Phaser.AUTO,
      parent: element,
      // Pixels nets sans arrondi des positions : le zoom n'est pas entier, et des sommets
      // arrondis un par un ouvriraient des fentes entre parcelles voisines.
      render: { antialias: false, antialiasGL: false, roundPixels: false },
      transparent: false,
      backgroundColor: '#699654',
      // Taille du jeu = taille de la zone × densité de l'écran ; resize() la tient à jour.
      scale: {
        mode: global.Phaser.Scale.NONE,
        width: Math.max(1, Math.round((element.clientWidth || 320) * dpr)),
        height: Math.max(1, Math.round((element.clientHeight || 480) * dpr)),
        zoom: 1 / dpr,
        expandParent: false,
        autoRound: false,
      },
      // Le toucher est capturé (pas de défilement de page ni de clic fantôme après un appui).
      input: { keyboard: false, gamepad: false, touch: { capture: true } },
      audio: { noAudio: true },
      banner: false,
      scene: [FarmScene],
    });
    game.events.once('ready', () => {
      scene = game.scene.getScene('farm');
      if (visible) { awake = false; show(); } else game.loop.sleep();
    });

    // Retour sur la page (onglet réaffiché, téléphone rallumé) : le fond est vérifié tout de
    // suite, puis encore un peu plus tard, le temps que le navigateur rende la mémoire graphique.
    const checkGround = () => {
      const s = getScene();
      if (!s || !s.ready || !visible) return;
      s.repairGround(false);
      s.groundCheckAt = 0;
    };
    const onBack = () => { if (!document.hidden) { checkGround(); setTimeout(checkGround, 400); setTimeout(checkGround, 1500); } };
    document.addEventListener('visibilitychange', onBack);
    global.addEventListener('pageshow', onBack);
    global.addEventListener('focus', onBack);

    if (global.ResizeObserver) new global.ResizeObserver(resize).observe(element);
    global.addEventListener('resize', resize);
    // Avant chaque geste, Phaser doit connaître la position exacte du canvas dans la page
    // (le bandeau peut changer de hauteur sans que la fenêtre soit redimensionnée).
    const refreshBounds = () => { if (game && game.isBooted) game.scale.updateBounds(); };
    element.addEventListener('touchstart', refreshBounds, { capture: true, passive: true });
    element.addEventListener('mousedown', refreshBounds, true);
    // Un clic sur le canvas est déjà traité par la scène : il ne remonte pas à la page.
    element.addEventListener('click', (e) => { if (game && e.target === game.canvas) e.stopPropagation(); });
    return true;
  }

  // Aligne la taille du jeu sur celle de la zone (× densité de l'écran).
  function resize() {
    if (!game || !game.isBooted || !host) return;
    const w = host.clientWidth, h = host.clientHeight;
    if (!w || !h) return;                  // zone masquée
    const dpr = pixelRatio();
    const gw = Math.round(w * dpr), gh = Math.round(h * dpr);
    game.scale.zoom = 1 / dpr;
    if (gw !== game.scale.width || gh !== game.scale.height) game.scale.resize(gw, gh);
    else game.scale.updateBounds();
  }

  function getScene() { return game && (scene || (scene = game.scene.getScene('farm'))); }

  function ready() { const s = getScene(); return !!(s && s.ready); }

  function update(model) {
    lastModel = model;
    if (!game || !visible) return;
    const key = JSON.stringify(model);
    if (key === lastKey) return;
    lastKey = key;
    const s = getScene();
    if (s && s.ready) s.sync(model);
  }

  function show() {
    visible = true;
    if (!game) return;
    // Phaser démarre seulement quand la page a fini de charger : avant, rien à rafraîchir.
    // La scène appliquera elle-même le dernier modèle reçu dans create().
    if (!game.isBooted || awake) return;
    awake = true;
    game.loop.wake();
    resize();
    lastKey = '';
    if (lastModel) update(lastModel);
    const s = getScene();
    if (s && s.ready) s.repairGround(false);
  }

  function hide() {
    visible = false;
    awake = false;
    if (game && game.isBooted) game.loop.sleep();
  }

  // L'intérieur `id` ('serre') peut-il être affiché ? Faux tant que la scène n'est pas prête,
  // ou si sa carte n'a pas pu être chargée.
  function hasRoom(id) { const s = getScene(); return !!(s && s.ready && s.rooms[id]); }
  // Version 1.18 : la carte a-t-elle son personnage (c'est lui qui ramasse) ?
  function hasFermier() { const s = getScene(); return !!(s && s.ready && s.fermier); }

  // Où en est la vue (voir viewInfo()) ; null tant que la scène n'est pas prête.
  function view() { const s = getScene(); return s && s.ready ? s.viewInfo() : null; }

  // Glisse jusqu'à x (px de carte), un point { x, y } ou un lieu ; false si ce n'est pas possible.
  function panTo(target, now) { const s = getScene(); return !!(s && s.ready && s.panTo(target, now)); }

  // FLU-06 : si aucune de ces tuiles (numéros de tuile de la carte) n'est à l'écran, glisse
  // jusqu'à la plus proche du centre. Renvoie true si la vue bouge.
  function showTiles(tiles) {
    const s = getScene();
    if (!s || !s.ready || s.room || !tiles || !tiles.length) return false;
    const v = s.cameras.main.worldView, W = s.grid.cols;
    const centre = (t) => ({ x: (t % W) * T + T / 2, y: Math.floor(t / W) * T + T / 2 });
    if (tiles.some((t) => { const p = centre(t); return v.contains(p.x, p.y); })) return false;
    let best = null;
    for (const t of tiles) {
      const p = centre(t);
      const d = Math.hypot(p.x - v.centerX, p.y - v.centerY);
      if (!best || d < best.d) best = { d, p };
    }
    return s.panTo(best.p, false);
  }

  global.FarmStage = { mount, update, show, hide, ready, view, panTo, showTiles, hasRoom, hasFermier, scene: getScene }; // scene() : pour le débogage et les tests
})(window);
