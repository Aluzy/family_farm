/*
 * La ville (ville-carte.html), où l'on va depuis la fenêtre de la ville (« Se promener en
 * ville », tout en bas) : ses rues, son parc et ses fontaines, et la fermière qui s'y promène.
 *
 * La carte : assets/ville.json (scripts/ville/carte.py, puis scripts/build-map.mjs) ; ses
 * couches de tuiles (le sol, puis une couche par matière, de bas en haut) et son point
 * « depart ». La fermière : assets/fermiere.png, cases de 16 × 32 nommées dans
 * assets/fermiere.json (scripts/personnage/), la même que sur la carte de la ferme.
 *
 * Les bâtiments sont en 3/4 (scripts/ville/immeubles.py) : la couche d'objets « batiments »
 * donne l'emprise au sol de chacun (on n'y marche pas) et le haut de son dessin (propriété
 * « haut »). Tout ce qui est dessiné au-dessus de l'emprise cache le sol de derrière, où l'on
 * passe : les couches des bâtiments existent en deux exemplaires, l'un sous les personnages,
 * l'autre (« …_devant ») par-dessus ; autour de chaque personnage, l'exemplaire du dessus
 * s'efface si elle est devant le bâtiment (on la voit devant le mur), et devient transparent
 * si elle est derrière (on la voit à travers le toit, comme sous les arbres).
 *
 * Elle marche sur le sol (chaussée, trottoirs, herbe, pavés), pas à travers un bâtiment,
 * une fontaine, une voiture, une palissade ou un banc : un toucher (ou un clic) l'envoie au
 * plus court jusque-là ; les flèches ou ZQSD la dirigent aussi. Sous un arbre, le feuillage
 * s'efface un peu pour la laisser voir. Avec « animations réduites », l'eau reste immobile.
 *
 * La circulation : des voitures (assets/ville_voitures.png et .json, scripts/ville/voitures.py :
 * cinq couleurs, huit directions) arrivent par un bout de rue au bord de la carte, suivent un
 * trajet de la couche « routes » (une polyligne « entrée>sortie », coins arrondis à la volée) et
 * disparaissent là où la rue touche un autre bord. Elles gardent leurs distances, s'arrêtent
 * devant la promeneuse, et n'entrent dans un carrefour (couche « carrefours ») que si aucune
 * voiture qui s'y trouve ne croise leur trajet. Les longueurs se comptent au sol : la carte est
 * vue de 3/4, une distance verticale à l'écran vaut 1 / KY au sol. Les voitures garées sont des
 * tuiles (couche « vehicules ») ; leur emprise au sol (couche « garees ») arrête la promeneuse.
 * Avec « animations réduites », pas de circulation.
 *
 * La même page montre aussi la carte de transition entre la ferme et la ville (?carte=
 * transition) ; ?arrivee= choisit le point d'arrivée. Aux passages (couche « passages »), une
 * flèche bleue paraît quand on s'en approche : un toucher dessus mène à l'autre carte (ou à
 * la ferme, jeu.html).
 *
 * L'heure du jeu (js/horloge-sortie.js) s'affiche en haut à droite. Les jours d'école, le bus
 * de l'école (couche « bus » : ses trajets, ses arrêts, le chemin des enfants) passe le matin et
 * le soir : il roule avec les autres voitures et s'arrête le temps que les enfants de la
 * famille montent ou descendent (BUS.scenes : l'heure de chaque scène, carte par carte).
 *
 * La gare (le bâtiment « gare », couche « gare » : où s'arrête le train, où l'on monte) : un
 * toucher dessus ouvre la fenêtre des départs (TRAIN.gares). On va jusqu'au quai, le train
 * arrive, on monte, il repart et la caméra le suit jusqu'à la carte d'arrivée (?carte=montagne
 * ou plage, &train=nord ou sud : le sens où il roule) ; là, on le voit arriver, et quand il
 * s'arrête on paraît devant la gare. La montagne et la plage sont des terminus : le train y
 * reste à quai ; en ville, il repart.
 *
 * La montagne et la plage (scripts/ville/montagne.py, plage.py) : des trouvailles à ramasser
 * (couche « trouvailles » : un genre par endroit ; chaque jour, une partie des endroits, et ce
 * qu'on a ramassé ne revient que le lendemain — une maquette : rien n'entre encore dans
 * l'inventaire, un carnet les compte), des animaux à regarder (couche « animaux » : une zone
 * par espèce, FAUNE), les entrées des grottes (couche « passages » : la flèche y mène).
 *
 * Les grottes (?carte=grotte&grotte=<entrée>&niveau=<n>) ne sont pas des cartes Tiled : chaque
 * niveau est tiré au hasard (le même toute la journée : la graine est l'entrée, le niveau et le
 * jour) par un automate cellulaire, avec les morceaux de scripts/ville/grotte.py. On descend par
 * le puits, on remonte par l'échelle (des passages, comme au bord des cartes). Le minerai est
 * pris dans les murs qui touchent le sol, de plus en plus rare et précieux en profondeur (fer,
 * cuivre, or, platine : GROTTE.poids) ; on le pioche en le touchant (une maquette : il va dans
 * un carnet, pas encore dans l'inventaire). Il fait noir : on n'y voit qu'autour de soi.
 */
(function () {
  'use strict';

  const T = 16;
  // l'adresse d'un fichier de assets/, suivie sur le site en ligne de « ?v=<empreinte de son
  // contenu> » (js/assets-versions.js, écrit par scripts/build-site.mjs) : un fichier modifié
  // change d'adresse, le téléphone le recharge au lieu de mélanger l'ancien et le nouveau.
  const v = (file) => {
    const t = window.FERME_ASSET_VERSIONS, k = file.replace(/^assets\//, '');
    return t && t[k] ? file + '?v=' + t[k] : file;
  };
  // La carte : ?carte=ville (par défaut) ou ?carte=transition (entre la ferme et la ville,
  // scripts/ville/transition.py) ; ?arrivee=<nom> : le point de la couche « arrivees » où l'on
  // apparaît (sinon « depart »).
  const CARTES = { ville: 'assets/ville.json', transition: 'assets/transition.json', montagne: 'assets/montagne.json', plage: 'assets/plage.json', grotte: null };
  const PARAMS = new URLSearchParams(window.location.search);
  const NOM_CARTE = Object.prototype.hasOwnProperty.call(CARTES, PARAMS.get('carte')) ? PARAMS.get('carte') : 'ville';
  const MAP = { key: NOM_CARTE, file: CARTES[NOM_CARTE] };
  const TITRES = { transition: 'Le chemin de la ville', montagne: 'La montagne', plage: 'La plage', grotte: 'La grotte' };
  if (TITRES[NOM_CARTE]) document.title = TITRES[NOM_CARTE] + ' — Ferme Familiale';
  // Les passages vers une autre carte (couche « passages » : un rectangle au bord, sa cible, le
  // sens de sa flèche) : la flèche bleue (assets/fleche_passage.png, scripts/ville/fleche.py :
  // droite, gauche, haut, bas) paraît quand la promeneuse est à moins de `near` px, se balance
  // de `bob` px ; un toucher dessus mène à la cible.
  const PASS = { key: 'fleche_passage', file: 'assets/fleche_passage.png', near: 80, bob: 3, sens: ['droite', 'gauche', 'haut', 'bas'] };
  const HERO = { key: 'fermiere', file: 'assets/fermiere.png', names: 'assets/fermiere.json', w: 16, h: 32, foot: 30, speed: 48, stride: 4 };
  // Les couches qu'on ne traverse pas, et celle qui passe devant la promeneuse (le feuillage).
  // (les bâtiments et les voitures garées : par leur emprise au sol, couches « batiments » et « garees »)
  const OBSTACLES = ['fontaines', 'mobilier', 'falaise', 'mer'];
  // les couches des bâtiments, doublées d'un exemplaire « _devant » au-dessus des personnages
  const BATI = ['murs', 'pierre_de_taille', 'vitrages', 'charpente', 'toits', 'menuiserie'];
  const BATI_ALPHA = 0.45;
  const DEVANT = 'vegetation';
  const FEUILLAGE_ALPHA = 0.45;
  // La circulation : vitesses en px au sol par seconde, distances au sol.
  const CARS = {
    key: 'voitures', file: 'assets/ville_voitures.png', meta: 'assets/ville_voitures.json',
    max: 16, speed: 46, accel: 40, decel: 90,
    gap: 70,          // d'un centre à l'autre, derrière une voiture (une longueur et un peu plus)
    lane: 16,         // l'écart de côté au-delà duquel ce n'est plus la même file
    hero: 44,         // la distance où elles s'arrêtent devant la promeneuse
    corner: 28,       // le rayon des virages
    cross: 22,        // deux trajets se croisent dans un carrefour s'ils passent à moins de ça
    stop: 34,         // on attend un carrefour le centre à ça de son bord (le nez dehors)
    spawn: [900, 2600],
  };
  const KY = 0.7;
  // Le bus de l'école (assets/ville_bus.png et .json, scripts/ville/bus.py : huit directions)
  // et les enfants de la famille (leurs personnages, assets/personnages/perso_NN.png, plus
  // petits), les jours d'école (lundi, mardi, jeudi, vendredi : js/horloge-sortie.js). Sur
  // chaque carte, le matin et le soir, une scène : les heures (du jeu) où elle commence et
  // après lesquelles elle ne commence plus, le trajet du bus et son arrêt (couche « bus »), le
  // chemin des enfants, et s'ils montent dans le bus ou en descendent.
  const BUS = {
    key: 'bus', file: 'assets/ville_bus.png', meta: 'assets/ville_bus.json', half: 46, carHalf: 29,
    speed: 70,             // px au sol par seconde (plus vite que les voitures : la ville est grande)
    lead: 1400,            // il part au plus à cette distance de l'arrêt (déjà en route, en fondu)
    kid: { speed: 32, scale: 0.8, fade: 0.5, cases: 'assets/personnages/cases.json' },
    resume: 1.2,           // s : le temps que les enfants s'éloignent (ou montent) avant de repartir
    scenes: {
      transition: [
        { nom: 'matin', debut: 7.2, fin: 8.4, bus: 'bus_matin', arret: 'arret', enfants: 'enfants_matin', monter: true },
        { nom: 'soir', debut: 16.1, fin: 16.8, bus: 'bus_soir', arret: 'arret', enfants: 'enfants_soir', monter: false },
      ],
      ville: [
        { nom: 'matin', debut: 7.2, fin: 8.6, bus: 'bus_matin', arret: 'arret_matin', enfants: 'enfants_matin', monter: false },
        { nom: 'soir', debut: 15.6, fin: 16.4, bus: 'bus_soir', arret: 'arret_soir', enfants: 'enfants_soir', monter: true },
      ],
    },
  };
  // Le train (assets/ville_train.png et .json, scripts/ville/train.py : la cabine du nord, la
  // voiture, la cabine du sud) : vitesses en px par seconde (à l'écran, la voie est nord-sud).
  // Il paraît à `lead` px de son arrêt, en fondu ; on le quitte `leaveAfter` s après son départ.
  // gares : les départs de chaque carte (la carte d'arrivée, le sens où l'on roule).
  const TRAIN = {
    key: 'train', file: 'assets/ville_train.png', meta: 'assets/ville_train.json', w: 48, h: 112,
    speed: 190, accel: 60, decel: 80, lead: 720, board: 1.0, alight: 0.6, resume: 1.6, leaveAfter: 2.8,
    gares: {
      ville: [{ carte: 'montagne', label: '⛰️ La montagne', sens: 'nord' }, { carte: 'plage', label: '🏖️ La plage', sens: 'sud' }],
      montagne: [{ carte: 'ville', label: '🏙️ Retour en ville', sens: 'sud' }],
      plage: [{ carte: 'ville', label: '🏙️ Retour en ville', sens: 'nord' }],
    },
    terminus: { montagne: true, plage: true },
  };
  // Les trouvailles (assets/trouvailles.png, scripts/ville/faune.py) : `part` des endroits en
  // ont une chaque jour ; on la ramasse à `reach` px. Ce qu'on a ramassé (et le carnet) :
  // localStorage « ferme-trouvailles ».
  const FINDS = { key: 'trouvailles', file: 'assets/trouvailles.png', store: 'ferme-trouvailles', part: 0.6, reach: 24 };
  // Les animaux (assets/faune_<espèce>.png, assets/faune.json) : par zone, `n` animaux ; `speed`
  // en px/s, `peur` : la distance où la promeneuse les dérange.
  const FAUNE = {
    meta: 'assets/faune.json',
    cartes: { montagne: ['marmotte', 'bouquetin', 'aigle'], plage: ['mouette', 'crabe', 'dauphin'] },
    especes: {
      marmotte: { size: 16, n: 2, speed: 18, peur: 52, texte: '🐾 Une marmotte : elle siffle pour prévenir les autres.' },
      bouquetin: { size: 32, n: 2, speed: 11, peur: 0, texte: '🐐 Un bouquetin : il grimpe les rochers les plus raides.' },
      aigle: { size: 32, n: 1, texte: '🦅 Un aigle royal tourne très haut dans le ciel.' },
      mouette: { size: 16, n: 3, speed: 16, peur: 44, texte: '🕊️ Une mouette : elle guette les restes du pique-nique.' },
      crabe: { size: 16, n: 2, speed: 20, peur: 40, texte: '🦀 Un crabe : il file de côté.' },
      dauphin: { size: 32, n: 1, texte: '🐬 Un dauphin saute au large !' },
    },
  };
  // Les grottes (assets/grotte_tuiles.png, grotte_objets.png, grotte.json : scripts/ville/grotte.py) :
  // la taille d'un niveau (en tuiles), le nombre de niveaux, la part de murs au départ et les
  // passes de l'automate, la chance qu'un mur au bord du sol porte du minerai, les coups de
  // pioche, la lumière autour de la promeneuse (px : nette jusqu'à r0, noire à partir de r1).
  const GROTTE = {
    tiles: 'assets/grotte_tuiles.png', objets: 'assets/grotte_objets.png', meta: 'assets/grotte.json',
    w: 46, h: 34, niveaux: 8, murs: 0.46, passes: 5, minerai: 0.07, coups: 3, coup: 0.5,
    lumiere: { r0: 44, r1: 132, noir: 0.93 }, store: 'ferme-grottes',
    // le poids de chaque minerai au niveau n : le fer partout, les autres de plus en plus bas
    poids: (n) => ({ fer: 1, cuivre: Math.max(0, (n - 1) * 0.35), or: Math.max(0, (n - 2.5) * 0.18), platine: Math.max(0, (n - 4) * 0.1) }),
  };
  const reduced = () => !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

  // Les planches de tuiles « extrudées » : chaque tuile recopiée avec un bord d'un pixel qui
  // répète son propre bord (marge 1, espacement 2). Quand la caméra tombe entre deux pixels
  // (zoom, écran à densité non entière), le GPU qui lit juste à côté d'une tuile retombe sur
  // sa propre couleur, et non sur la tuile voisine de la planche : plus de fines lignes sombres
  // aux jointures. Les numéros des tuiles ne changent pas.
  function extrude(textures, key, t) {
    const src = textures.get(key).getSourceImage();
    const cols = Math.floor(src.width / t), rows = Math.floor(src.height / t);
    const canvas = document.createElement('canvas');
    canvas.width = cols * (t + 2);
    canvas.height = rows * (t + 2);
    const g = canvas.getContext('2d');
    g.imageSmoothingEnabled = false;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const sx = c * t, sy = r * t, dx = c * (t + 2) + 1, dy = r * (t + 2) + 1;
        g.drawImage(src, sx, sy, t, t, dx, dy, t, t);
        g.drawImage(src, sx, sy, t, 1, dx, dy - 1, t, 1);                 // haut
        g.drawImage(src, sx, sy + t - 1, t, 1, dx, dy + t, t, 1);         // bas
        g.drawImage(src, sx, sy, 1, t, dx - 1, dy, 1, t);                 // gauche
        g.drawImage(src, sx + t - 1, sy, 1, t, dx + t, dy, 1, t);         // droite
        g.drawImage(src, sx, sy, 1, 1, dx - 1, dy - 1, 1, 1);             // les coins
        g.drawImage(src, sx + t - 1, sy, 1, 1, dx + t, dy - 1, 1, 1);
        g.drawImage(src, sx, sy + t - 1, 1, 1, dx - 1, dy + t, 1, 1);
        g.drawImage(src, sx + t - 1, sy + t - 1, 1, 1, dx + t, dy + t, 1, 1);
      }
    }
    const out = key + '_extrude';
    if (textures.exists(out)) textures.remove(out);
    textures.addCanvas(out, canvas);
    return out;
  }

  class VilleScene extends Phaser.Scene {
    constructor() { super('ville'); }

    preload() {
      if (!MAP.file) {
        this.load.image('grotte_tuiles', v(GROTTE.tiles));
        this.load.spritesheet('grotte_objets', v(GROTTE.objets), { frameWidth: 32, frameHeight: 32 });
        this.load.json('grotte', v(GROTTE.meta));
      } else this.load.tilemapTiledJSON(MAP.key, v(MAP.file));
      this.load.spritesheet(HERO.key, v(HERO.file), { frameWidth: HERO.w, frameHeight: HERO.h });
      this.load.json(HERO.key + '_noms', v(HERO.names));
      this.load.spritesheet(CARS.key, v(CARS.file), { frameWidth: 64, frameHeight: 64 });
      this.load.json(CARS.key + '_meta', v(CARS.meta));
      this.load.spritesheet(PASS.key, v(PASS.file), { frameWidth: 32, frameHeight: 32 });
      this.load.spritesheet(BUS.key, v(BUS.file), { frameWidth: 112, frameHeight: 112 });
      this.load.json(BUS.key + '_meta', v(BUS.meta));
      this.load.json('perso_cases', v(BUS.kid.cases));
      if (TRAIN.gares[NOM_CARTE]) {
        this.load.spritesheet(TRAIN.key, v(TRAIN.file), { frameWidth: TRAIN.w, frameHeight: TRAIN.h });
        this.load.json(TRAIN.key + '_meta', v(TRAIN.meta));
      }
      if (FAUNE.cartes[NOM_CARTE]) {
        this.load.json('faune', v(FAUNE.meta));
        this.load.spritesheet(FINDS.key, v(FINDS.file), { frameWidth: 16, frameHeight: 16 });
        for (const e of FAUNE.cartes[NOM_CARTE]) {
          const z = FAUNE.especes[e].size;
          this.load.spritesheet('faune_' + e, v('assets/faune_' + e + '.png'), { frameWidth: z, frameHeight: z });
        }
      }
      // les enfants de la partie (pour la scène du bus)
      const h = window.HorlogeSortie ? window.HorlogeSortie.maintenant() : null;
      for (const e of (h && h.enfants) || []) {
        this.load.spritesheet('perso_' + e.perso, v('assets/personnages/perso_' + String(e.perso).padStart(2, '0') + '.png'), { frameWidth: 16, frameHeight: 32 });
      }
      // les planches des jeux de tuiles : lues dans la carte une fois chargée
      if (MAP.file) this.load.once('filecomplete-tilemapJSON-' + MAP.key, () => {
        const data = this.cache.tilemap.get(MAP.key).data;
        for (const set of data.tilesets) this.load.image(set.name, v('assets/' + set.image));
        // l'exemplaire du dessus de chaque couche de bâtiment
        for (const name of BATI) {
          const l = data.layers.find((x) => x.name === name);
          if (l && !data.layers.some((x) => x.name === name + '_devant')) data.layers.push({ ...l, name: name + '_devant', data: l.data.slice() });
        }
      });
    }

    create() {
      // insertNull : une case vide reste vide (sans objet Tile) ; la grande ville en compte
      // des centaines de milliers dans ses couches clairsemées
      let map;
      this.layers = {};
      if (MAP.file) {
        map = this.make.tilemap({ key: MAP.key, insertNull: true });
        const sets = map.tilesets.map((s) => map.addTilesetImage(s.name, extrude(this.textures, s.name, s.tileWidth), s.tileWidth, s.tileHeight, 1, 2));
        map.layers.forEach((l, i) => {
          const depth = l.name === DEVANT ? 1e6 : l.name.endsWith('_devant') ? 5e5 + i : -100 + i;
          this.layers[l.name] = map.createLayer(l.name, sets, 0, 0).setDepth(depth);
        });
      } else map = this.buildCave();
      this.map = map;
      this.makeTileAnims();

      // où l'on marche : là où il y a du sol et rien de ce qu'on ne traverse pas
      this.walk = [];
      for (let y = 0; y < map.height; y++) {
        const row = [];
        for (let x = 0; x < map.width; x++) {
          row.push(!!this.layers.sol.getTileAt(x, y) && !OBSTACLES.some((n) => this.layers[n] && this.layers[n].getTileAt(x, y)));
        }
        this.walk.push(row);
      }
      // les bâtiments et les voitures garées : les tuiles dont le centre est sous leur emprise
      const objects = (name) => (this.cave && this.cave.objects[name]) || ((map.getObjectLayer(name) || {}).objects) || [];
      this.makeBuildings(objects('batiments'));
      for (const r of [...objects('garees'), ...objects('batiments')]) {
        for (let y = Math.floor(r.y / T); y <= Math.floor((r.y + r.height) / T); y++) {
          for (let x = Math.floor(r.x / T); x <= Math.floor((r.x + r.width) / T); x++) {
            const cx = x * T + T / 2, cy = y * T + T / 2;
            if (this.walk[y] && cx >= r.x && cx <= r.x + r.width && cy >= r.y && cy <= r.y + r.height) this.walk[y][x] = false;
          }
        }
      }

      // la fermière : ses images par nom (marche_bas_0…, idle_cote_0…)
      const noms = (this.cache.json.get(HERO.key + '_noms') || {}).frames || [];
      this.frame = (name) => Math.max(0, noms.indexOf(name));
      const arrivee = PARAMS.get('arrivee');
      const d = (arrivee && objects('arrivees').find((o) => o.name === arrivee)) || objects('depart')[0] || { x: map.widthInPixels / 2, y: map.heightInPixels / 2 };
      this.hero = this.add.sprite(Math.round(d.x), Math.round(d.y), HERO.key, this.frame('idle_bas_0')).setOrigin(0.5, HERO.foot / HERO.h);
      this.shadow = this.add.ellipse(0, 0, 11, 4, 0x1e1a18, 0.35);
      this.heroPos = { x: d.x, y: d.y };
      this.heroAlpha = 1;
      this.locked = false;          // pendant le voyage en train : ni toucher, ni clavier
      this.dialog = false;
      this.face = 'bas';
      this.walked = 0;
      this.path = [];
      this.faded = [];

      // la caméra suit la promeneuse, au pixel près, sans sortir de la carte
      const cam = this.cameras.main;
      cam.setBounds(0, 0, map.widthInPixels, map.heightInPixels);
      cam.startFollow(this.hero, true, 0.12, 0.12);
      cam.setRoundPixels(true);
      this.fitZoom();
      this.scale.on('resize', () => this.fitZoom());

      this.makePassages(objects('passages'));
      // l'heure du jeu (js/horloge-sortie.js), en haut à droite
      this.clockEl = document.getElementById('horloge');
      this.clockAt = -1e9;
      this.stepClock(0);
      this.makeHud();
      // un toucher : sur une flèche, changer de carte ; sur la gare, la fenêtre des départs ;
      // sur une trouvaille, la ramasser ; sur un animal ou une grotte, ce qu'on en voit ;
      // ailleurs, y aller
      this.input.on('pointerup', (p) => {
        if (p.getDistance() > 8 || this.locked || this.dialog) return;
        const w = cam.getWorldPoint(p.x, p.y);
        const a = this.passages.find((q) => q.arrow.visible && Math.abs(w.x - q.arrow.x) <= 18 && Math.abs(w.y - q.arrow.y) <= 18);
        if (a) { this.leave(a); return; }
        if (this.tapFind(w) || this.tapAnimal(w) || this.tapGare(w) || this.tapOre(w)) return;
        this.goTo(w.x, w.y);
      });
      // les trajets du bus de l'école roulent avec les autres (mêmes carrefours), sans voitures tirées dessus
      const busObjs = objects('bus');
      this.makeTraffic(objects('routes').concat(busObjs.filter((o) => o.polyline && /^bus_/.test(o.name)).map((o) => Object.assign({}, o, { bus: true }))), objects('carrefours'));
      this.makeSchool(busObjs);
      this.makeGare(objects('gare'));
      this.makeFinds(objects('trouvailles'));
      this.makeFauna(objects('animaux'));
      this.makeCaveLife();
      this.keys = this.input.keyboard ? this.input.keyboard.addKeys('UP,DOWN,LEFT,RIGHT,Z,Q,S,D,W,A') : null;
      window.Ville = { scene: this };
    }

    // Les flèches des passages : posées dans le rectangle, du côté de la carte (à 12 px du bord).
    makePassages(objs) {
      this.passages = objs.map((o) => {
        const prop = (n) => ((o.properties || []).find((q) => q.name === n) || {}).value;
        const sens = PASS.sens.includes(prop('sens')) ? prop('sens') : 'droite';
        const cx = o.x + o.width / 2, cy = o.y + o.height / 2;
        const x = sens === 'gauche' ? o.x + 16 : sens === 'droite' ? o.x + o.width - 16 : cx;
        const y = sens === 'haut' ? o.y + 16 : sens === 'bas' ? o.y + o.height - 16 : cy;
        const arrow = this.add.image(Math.round(x), Math.round(y), PASS.key, PASS.sens.indexOf(sens)).setDepth(2e6).setVisible(false);
        return { name: o.name, cible: prop('cible'), sens, rect: o, x, y, arrow };
      }).filter((q) => q.cible && this.textures.exists(PASS.key));
    }

    // Chaque image : une flèche paraît près de la promeneuse et se balance dans son sens.
    stepPassages(time) {
      const P = this.heroPos;
      for (const q of this.passages) {
        const r = q.rect;
        const d = Math.hypot(Math.max(r.x - P.x, 0, P.x - r.x - r.width), Math.max(r.y - P.y, 0, P.y - r.y - r.height));
        q.arrow.setVisible(d <= PASS.near);
        if (!q.arrow.visible) continue;
        const k = reduced() ? 0 : Math.round(Math.sin(time / 220) * PASS.bob);
        const [dx, dy] = { droite: [1, 0], gauche: [-1, 0], haut: [0, -1], bas: [0, 1] }[q.sens];
        q.arrow.setPosition(Math.round(q.x + dx * k), Math.round(q.y + dy * k));
      }
    }

    // L'heure du jeu, relue chaque seconde (null : pas de partie sur cet appareil).
    stepClock(time) {
      if (time - this.clockAt < 1000) return;
      this.clockAt = time;
      this.time = window.HorlogeSortie ? window.HorlogeSortie.maintenant() : null;
      if (this.clockEl) {
        this.clockEl.hidden = !this.time;
        if (this.time) this.clockEl.textContent = '🕐 ' + window.HorlogeSortie.texte(this.time);
      }
    }

    // Changer de carte : la page cible (une autre carte, ou la ferme).
    leave(q) {
      if (this.leaving) return;
      this.leaving = true;
      this.cameras.main.fadeOut(reduced() ? 0 : 250, 0, 0, 0);
      setTimeout(() => { window.location.href = q.cible; }, reduced() ? 0 : 260);
    }

    fitZoom() {
      const { width, height } = this.scale;
      this.cameras.main.setZoom(Math.max(2, Math.min(5, Math.floor(Math.min(width, height) / 170))));
    }

    // Tuiles animées (l'eau des fontaines) : les animations des jeux de tuiles (Tiled), jouées
    // en changeant l'index des tuiles posées, toutes au même rythme que l'horloge.
    makeTileAnims() {
      this.tileAnims = [];
      const groups = new Map();
      for (const set of this.map.tilesets) {
        for (const [id, def] of Object.entries(set.tileData || {})) {
          if (!def.animation || def.animation.length < 2) continue;
          const gid = set.firstgid + Number(id);
          groups.set(gid, { frames: def.animation.map((f) => set.firstgid + f.tileid), ms: def.animation[0].duration, tiles: [] });
        }
      }
      if (!groups.size) return;
      for (const layer of Object.values(this.layers)) {
        layer.forEachTile((t) => { const g = groups.get(t.index); if (g) g.tiles.push(t); });
      }
      this.tileAnims = [...groups.values()].filter((g) => g.tiles.length);
    }

    stepTileAnims(time) {
      if (reduced()) return;
      for (const g of this.tileAnims) {
        const k = Math.floor(time / g.ms) % g.frames.length;
        if (k === g.cur) continue;
        g.cur = k;
        for (const t of g.tiles) t.index = g.frames[k];
      }
    }

    // ---------- les bâtiments ----------

    // Chaque tuile de bâtiment appartient au bâtiment dont le dessin la couvre (de son « haut »
    // à sa base, un peu plus large pour les débords de toit) ; celles de l'exemplaire du dessus
    // qui n'appartiennent à aucun (les marches, posées au sol) en sont retirées.
    makeBuildings(objs) {
      this.buildings = objs.map((o) => {
        const p = (o.properties || []).find((q) => q.name === 'haut');
        return { name: o.name, x0: o.x - 8, x1: o.x + o.width + 8, top: p ? p.value : o.y, base: o.y + o.height };
      });
      this.covered = [];
      // la tuile appartient au bâtiment le plus en avant (le plus bas) qui la recouvre : le
      // toit d'un bâtiment de devant passe sur le pied de celui de derrière
      this.owner = (x, y) => {
        let best = null;
        for (const b of this.buildings) if (x >= b.x0 && x < b.x1 && y >= b.top && y < b.base && (!best || b.base > best.base)) best = b;
        return best;
      };
      for (const name of BATI) {
        const up = this.layers[name + '_devant'], down = this.layers[name];
        if (!up) continue;
        up.forEachTile((t) => {
          if (t.index < 0) return;
          const b = this.owner(t.pixelX + T / 2, t.pixelY + T / 2);
          if (!b) { up.removeTileAt(t.x, t.y); return; }
          t.bat = b;
          t.down = down.getTileAt(t.x, t.y);
        });
      }
    }

    // Autour de chaque personnage (sa boîte, en px) : devant un bâtiment, l'exemplaire du
    // dessus s'efface (on la voit devant le mur) ; derrière, il devient transparent et celui du
    // dessous s'efface (on la voit à travers) — pour la promeneuse seulement, les voitures
    // passent simplement derrière.
    uncover(boxes) {
      for (const t of this.covered) { t.alpha = 1; if (t.down) t.down.alpha = 1; }
      this.covered = [];
      for (const { x, y, w, h, foot, see } of boxes) {
        for (const name of BATI) {
          const up = this.layers[name + '_devant'];
          if (!up) continue;
          for (const t of up.getTilesWithinWorldXY(x, y, w, h) || []) {
            if (!t.bat) continue;
            if (foot >= t.bat.base) t.alpha = 0;
            else if (see) { t.alpha = BATI_ALPHA; if (t.down) t.down.alpha = 0; } else continue;
            this.covered.push(t);
          }
        }
      }
    }

    // ---------- la circulation ----------

    // Les trajets : chaque polyligne de « routes », ses coins arrondis (une courbe de Bézier
    // entre les deux points à CARS.corner du coin), puis des points tous les ~2 px avec leur
    // abscisse au sol ; et, pour chaque carrefour, où le trajet y entre et en sort.
    makeTraffic(routes, crossings) {
      this.cars = [];
      this.carMeta = this.cache.json.get(CARS.key + '_meta') || { couleurs: ['rouge'], directions: { droite: 0 } };
      this.crossings = crossings.map((r) => ({ name: r.name, x0: r.x - 8, y0: r.y - 8, x1: r.x + r.width + 8, y1: r.y + r.height + 8, held: new Set() }));
      this.routes = routes.filter((o) => o.polyline && o.polyline.length > 1).map((o) => {
        const pts = o.polyline.map((p) => ({ x: o.x + p.x, y: o.y + p.y }));
        const out = [pts[0]];
        const line = (a, b) => {
          const n = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / 2));
          for (let i = 1; i <= n; i++) out.push({ x: a.x + (b.x - a.x) * i / n, y: a.y + (b.y - a.y) * i / n });
        };
        let cur = pts[0];
        for (let i = 1; i < pts.length - 1; i++) {
          const a = pts[i - 1], p = pts[i], b = pts[i + 1];
          const la = Math.hypot(a.x - p.x, a.y - p.y), lb = Math.hypot(b.x - p.x, b.y - p.y);
          const r = Math.min(CARS.corner, la / 2, lb / 2);
          const p1 = { x: p.x + (a.x - p.x) / la * r, y: p.y + (a.y - p.y) / la * r };
          const p2 = { x: p.x + (b.x - p.x) / lb * r, y: p.y + (b.y - p.y) / lb * r };
          line(cur, p1);
          for (let k = 1; k <= 16; k++) {
            const t = k / 16, u = 1 - t;
            out.push({ x: u * u * p1.x + 2 * u * t * p.x + t * t * p2.x, y: u * u * p1.y + 2 * u * t * p.y + t * t * p2.y });
          }
          cur = p2;
        }
        line(cur, pts[pts.length - 1]);
        let s = 0;
        out.forEach((p, i) => { if (i) s += Math.hypot(p.x - out[i - 1].x, (p.y - out[i - 1].y) / KY); p.s = s; });
        const spans = this.crossings.map((c) => {
          const inside = out.filter((p) => p.x >= c.x0 && p.x <= c.x1 && p.y >= c.y0 && p.y <= c.y1);
          return inside.length ? { enter: inside[0].s, exit: inside[inside.length - 1].s, pts: inside } : null;
        });
        return { name: o.name, pts: out, length: s, spans, bus: !!o.bus };
      });
      this.carRoutes = this.routes.filter((r) => !r.bus);
      // deux trajets se gênent dans un carrefour s'ils y passent tout près l'un de l'autre
      this.conflict = this.crossings.map((c, k) => this.routes.map((a) => this.routes.map((b) => {
        const sa = a.spans[k], sb = b.spans[k];
        if (!sa || !sb) return false;
        // (un point sur trois : ils sont à ~2 px les uns des autres)
        for (let i = 0; i < sa.pts.length; i += 3) {
          const p = sa.pts[i];
          for (let j = 0; j < sb.pts.length; j += 3) if (Math.hypot(p.x - sb.pts[j].x, (p.y - sb.pts[j].y) / KY) < CARS.cross) return true;
        }
        return false;
      })));
      this.routes.forEach((r, i) => { r.index = i; });
      this.nextSpawn = 600;
      if (reduced() || !this.carRoutes.length || !this.textures.exists(CARS.key)) return;
      // quelques voitures déjà en route, hors des carrefours
      for (let n = 0; n < 10; n++) {
        const r = Phaser.Utils.Array.GetRandom(this.carRoutes);
        const s = 120 + Math.random() * (r.length - 240);
        if (r.spans.some((sp) => sp && s > sp.enter - 40 && s < sp.exit + 10)) continue;
        this.addCar(r, s);
      }
    }

    // Le point du trajet à l'abscisse s, et la direction (au sol) où l'on roule.
    pointAt(r, car) {
      const pts = r.pts;
      while (car.i < pts.length - 2 && pts[car.i + 1].s < car.s) car.i++;
      const a = pts[car.i], b = pts[car.i + 1] || a;
      const t = b.s > a.s ? Math.min(1, Math.max(0, (car.s - a.s) / (b.s - a.s))) : 0;
      const c = pts[Math.min(pts.length - 1, car.i + 3)], p = pts[Math.max(0, car.i - 2)];
      const dx = c.x - p.x, dy = (c.y - p.y) / KY, l = Math.hypot(dx, dy) || 1;
      return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, dx: dx / l, dy: dy / l };
    }

    // Une voiture sur ce trajet, à l'abscisse s (0 : à l'entrée, hors de la carte), si la place
    // est libre.
    addCar(route, s = 0) {
      const m = this.carMeta;
      const car = { route, s, i: 0, v: s ? CARS.speed : CARS.speed * 0.8, color: Math.floor(Math.random() * m.couleurs.length), held: new Set() };
      Object.assign(car, this.pointAt(route, car));
      if (this.cars.some((o) => Math.hypot(o.x - car.x, (o.y - car.y) / KY) < CARS.gap * 1.3)) return null;
      const anchor = m.anchor || { x: 32, y: 40 };
      car.sprite = this.add.sprite(0, 0, CARS.key, 0).setOrigin(anchor.x / (m.frameWidth || 64), anchor.y / (m.frameHeight || 64));
      this.cars.push(car);
      this.placeCar(car);
      return car;
    }

    placeCar(car) {
      const dirs = Object.keys(this.carMeta.directions).length || 8;
      let a = Math.atan2(car.dy, car.dx) * 180 / Math.PI;
      if (a < 0) a += 360;
      const k = Math.round(a / (360 / dirs)) % dirs;
      car.sprite.setFrame(car.bus ? k : car.color * dirs + k).setPosition(Math.round(car.x), Math.round(car.y)).setDepth(car.y);
    }

    stepTraffic(time, dt) {
      if (!this.routes || !this.routes.length || reduced()) return;
      this.nextSpawn -= dt * 1000;
      if (this.nextSpawn <= 0) {
        this.nextSpawn = CARS.spawn[0] + Math.random() * (CARS.spawn[1] - CARS.spawn[0]);
        if (this.carRoutes.length && this.cars.length < CARS.max && this.textures.exists(CARS.key)) this.addCar(Phaser.Utils.Array.GetRandom(this.carRoutes));
      }
      const hero = this.heroPos;
      for (const car of [...this.cars]) {
        const r = car.route;
        // la place devant : la voiture de devant, la promeneuse, un carrefour occupé
        let room = Infinity;
        const ahead = (x, y) => {
          const ex = x - car.x, ey = (y - car.y) / KY;
          return { along: ex * car.dx + ey * car.dy, side: Math.abs(ex * car.dy - ey * car.dx) };
        };
        for (const o of this.cars) {
          // (celles d'en face ou qui croisent en sens contraire : affaire des carrefours)
          if (o === car || o.dx * car.dx + o.dy * car.dy < -0.3) continue;
          const d = ahead(o.x, o.y);
          // (un bus est plus long : on le suit de plus loin)
          const gap = CARS.gap + (car.bus ? BUS.half - BUS.carHalf : 0) + (o.bus ? BUS.half - BUS.carHalf : 0);
          if (d.along > 0 && d.side < CARS.lane) room = Math.min(room, d.along - gap);
        }
        // le bus de l'école s'arrête à son arrêt, le temps que les enfants montent ou descendent
        if (car.stopAt !== undefined && car.stopAt !== null) {
          room = Math.min(room, car.stopAt - car.s);
          car.atStop = car.stopAt - car.s < 3 && car.v < 2;
        }
        const h = ahead(hero.x, hero.y);
        if (h.along > 0 && h.side < CARS.lane) room = Math.min(room, h.along - CARS.hero);
        this.crossings.forEach((c, k) => {
          const sp = r.spans[k];
          if (!sp || car.held.has(k) || car.s > sp.exit) return;
          const before = sp.enter - car.s;
          if (before > CARS.stop + 30) return;
          const blocked = [...c.held].some((o) => o !== car && this.conflict[k][r.index][o.route.index]);
          if (blocked) room = Math.min(room, before - CARS.stop);
          else if (before < CARS.stop + 6) { c.held.add(car); car.held.add(k); }
        });
        // la vitesse : freiner pour s'arrêter à temps, sinon reprendre de la vitesse
        const top = car.bus ? BUS.speed : CARS.speed;
        const target = room <= 0 ? 0 : Math.min(top, Math.sqrt(2 * CARS.decel * room));
        car.v = target < car.v ? target : Math.min(target, car.v + CARS.accel * dt);
        car.s += car.v * dt;
        // sortie d'un carrefour
        for (const k of [...car.held]) {
          if (car.s > r.spans[k].exit) { car.held.delete(k); this.crossings[k].held.delete(car); }
        }
        if (car.s >= r.length) {
          for (const k of car.held) this.crossings[k].held.delete(car);
          car.sprite.destroy();
          this.cars.splice(this.cars.indexOf(car), 1);
          continue;
        }
        Object.assign(car, this.pointAt(r, car));
        this.placeCar(car);
        if (car.alpha !== undefined && car.alpha < 1) { car.alpha = Math.min(1, car.alpha + dt * 2); car.sprite.setAlpha(car.alpha); }
      }
    }

    // ---------- le bus de l'école ----------

    makeSchool(objs) {
      this.kids = [];
      this.school = null;
      this.schoolDone = new Set();
      this.busStops = {};
      this.kidPaths = {};
      for (const o of objs) {
        if (o.point) this.busStops[o.name] = { x: o.x, y: o.y };
        else if (o.polyline && /^enfants_/.test(o.name)) this.kidPaths[o.name] = o.polyline.map((p) => ({ x: o.x + p.x, y: o.y + p.y }));
      }
      const noms = (this.cache.json.get('perso_cases') || {}).frames || [];
      this.kidFrame = (name) => Math.max(0, noms.indexOf(name));
    }

    // Le bus sur son trajet, depuis l'entrée ; il s'arrêtera au point du trajet le plus proche de l'arrêt.
    // L'abscisse (au sol) de l'arrêt sur un trajet du bus.
    stopOn(routeName, stop) {
      const route = this.routes.find((r) => r.name === routeName);
      let best = null;
      for (const p of route ? route.pts : []) { const d = Math.hypot(p.x - stop.x, p.y - stop.y); if (!best || d < best.d) best = { d, s: p.s }; }
      return best ? best.s : null;
    }

    addBus(routeName, stop) {
      const route = this.routes.find((r) => r.name === routeName);
      if (!route || !this.textures.exists(BUS.key)) return null;
      const meta = this.cache.json.get(BUS.key + '_meta') || { anchor: { x: 56, y: 70 }, frameWidth: 112, frameHeight: 112 };
      const stopS = this.stopOn(routeName, stop);
      const s0 = stopS === null ? 0 : Math.max(0, stopS - BUS.lead);
      const car = { route, s: s0, i: 0, v: BUS.speed, color: 0, held: new Set(), bus: true, atStop: false, stopAt: stopS, alpha: s0 > 0 ? 0 : 1 };
      Object.assign(car, this.pointAt(route, car));
      car.sprite = this.add.sprite(0, 0, BUS.key, 0).setOrigin(meta.anchor.x / meta.frameWidth, meta.anchor.y / meta.frameHeight).setAlpha(car.alpha);
      this.cars.push(car);
      this.placeCar(car);
      return car;
    }

    // Un enfant qui marche le long de `pts` (il paraît au premier point, en fondu) ; `bout` : il
    // s'efface au bout du chemin (descendu du bus, il arrive à la porte ou au bord de la carte).
    addKid(perso, pts, k, bout) {
      const key = 'perso_' + perso;
      if (!this.textures.exists(key) || !pts || pts.length < 2) return null;
      const dx = (k % 2 ? 1 : -1) * 5 * Math.ceil(k / 2);
      const kid = {
        s: this.add.sprite(pts[0].x + dx, pts[0].y, key, this.kidFrame('idle_bas_0')).setOrigin(0.5, 30 / 32).setScale(BUS.kid.scale).setAlpha(0),
        pts: pts.map((p, i) => ({ x: p.x + (i ? dx : dx), y: p.y })), i: 1, x: pts[0].x + dx, y: pts[0].y, alpha: 0, fade: 1, walked: 0, face: 'bas', arrived: false,
        wait: k * 0.6, bout: !!bout,
      };
      this.kids.push(kid);
      return kid;
    }

    stepKids(dt, time) {
      for (const kid of [...this.kids]) {
        let moving = false;
        if (kid.wait > 0) kid.wait -= dt;
        else if (!kid.arrived) {
          const to = kid.pts[kid.i];
          const dx = to.x - kid.x, dy = to.y - kid.y, l = Math.hypot(dx, dy), st = BUS.kid.speed * dt;
          if (Math.abs(dx) > Math.abs(dy) * 0.8) { kid.face = 'cote'; kid.s.setFlipX(dx < 0); } else { kid.face = dy > 0 ? 'bas' : 'haut'; kid.s.setFlipX(false); }
          if (l <= st) { kid.x = to.x; kid.y = to.y; kid.i++; if (kid.i >= kid.pts.length) kid.arrived = true; } else { kid.x += (dx / l) * st; kid.y += (dy / l) * st; }
          kid.walked += Math.min(l, st);
          moving = true;
        }
        if (kid.arrived && kid.bout && kid.fade >= 0) kid.fade = -1;
        if (kid.fade) {
          kid.alpha = Math.max(0, Math.min(1, kid.alpha + (kid.fade * dt) / BUS.kid.fade));
          if (kid.alpha >= 1 && kid.fade > 0) kid.fade = 0;
          if (kid.alpha <= 0 && kid.fade < 0) { kid.s.destroy(); this.kids.splice(this.kids.indexOf(kid), 1); continue; }
        }
        kid.s.setFrame(this.kidFrame(moving ? `marche_${kid.face}_${Math.floor(kid.walked / 4) % 4}` : `idle_${kid.face}_${Math.floor(time / 600) % 2}`));
        kid.s.setPosition(Math.round(kid.x), Math.round(kid.y)).setDepth(kid.y).setAlpha(kid.alpha);
      }
    }

    // Les jours d'école, aux heures de la scène : le bus arrive ; les enfants montent (ils sont
    // venus à pied jusqu'à l'arrêt) ou descendent (et vont à pied jusqu'au bout de leur chemin,
    // où ils s'effacent) ; puis le bus repart. Une scène par jour, matin et soir.
    stepSchool(time, dt) {
      this.stepKids(dt, time);
      const t = this.time, list = BUS.scenes[NOM_CARTE] || [];
      const sc = this.school;
      if (!sc) {
        if (!t || t.nuit || !window.HorlogeSortie.JOURS_ECOLE.includes(t.semaine) || !t.enfants.length || reduced()) return;
        const def = list.find((d) => t.heure >= d.debut && t.heure < d.fin && !this.schoolDone.has(t.jour + ':' + d.nom));
        if (!def) return;
        const stop = this.busStops[def.arret], pts = this.kidPaths[def.enfants];
        if (!stop || !pts) return;
        this.schoolDone.add(t.jour + ':' + def.nom);
        // ils montent : les enfants viennent à pied jusqu'à l'arrêt ; le premier des deux à
        // partir (eux ou le bus) part tout de suite, l'autre de façon à arriver en même temps
        const stopS = this.stopOn(def.bus, stop);
        const tBus = stopS === null ? 0 : Math.min(stopS, BUS.lead) / BUS.speed;
        let len = 0;
        for (let i = 1; i < pts.length; i++) len += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
        const tKids = def.monter ? len / BUS.kid.speed + 0.6 * t.enfants.length : 0;
        this.school = { def, bus: null, phase: 'attente', kids: [], wait: 0, busIn: Math.max(0, tKids - tBus), kidsIn: Math.max(0, tBus - tKids) };
        return;
      }
      const { def } = sc;
      if (sc.phase === 'attente') {
        sc.busIn -= dt; sc.kidsIn -= dt;
        if (def.monter && !sc.kids.length && sc.kidsIn <= 0) sc.kids = t.enfants.map((e, k) => this.addKid(e.perso, this.kidPaths[def.enfants], k)).filter(Boolean);
        if (!sc.bus && sc.busIn <= 0) { sc.bus = this.addBus(def.bus, this.busStops[def.arret]); if (!sc.bus) { this.school = null; return; } }
        if (sc.bus && (!def.monter || sc.kids.length)) sc.phase = 'arrivee';
        if (sc.phase === 'attente') return;
      }
      const bus = sc.bus;
      if (!this.cars.includes(bus)) { this.school = null; return; }      // il est sorti de la carte
      if (sc.phase === 'arrivee' && bus.atStop) {
        sc.phase = 'arret';
        if (!def.monter) sc.kids = t.enfants.map((e, k) => this.addKid(e.perso, this.kidPaths[def.enfants], k, true)).filter(Boolean);
        sc.wait = BUS.resume;
      }
      if (sc.phase === 'arret') {
        if (def.monter) {
          // tous à l'arrêt : ils montent (s'effacent), puis le bus repart
          if (sc.kids.every((k) => k.arrived || !this.kids.includes(k))) {
            for (const k of sc.kids) if (k.fade >= 0) k.fade = -1;
            sc.wait -= dt;
            if (sc.wait <= 0) { bus.stopAt = null; sc.phase = 'depart'; }
          }
        } else {
          sc.wait -= dt;
          if (sc.wait <= 0) { bus.stopAt = null; sc.phase = 'depart'; }
        }
      }
    }

    // ---------- les messages, la fenêtre de la gare ----------

    makeHud() {
      this.msgEl = document.getElementById('message');
      this.gareEl = document.getElementById('gare-fenetre');
      const aide = document.getElementById('aide-texte');
      const textes = {
        ville: 'Touchez un trottoir pour y marcher · la gare pour prendre le train',
        montagne: 'Touchez l’alpage pour y marcher · une trouvaille pour la ramasser · la gare pour rentrer',
        plage: 'Touchez le sable pour y marcher · une trouvaille pour la ramasser · la gare pour rentrer',
        grotte: 'Touchez le sol pour y marcher · un minerai pour le piocher · l\u2019échelle pour remonter',
      };
      if (aide && textes[NOM_CARTE]) aide.textContent = textes[NOM_CARTE];
      const annuler = document.getElementById('gare-annuler');
      if (annuler) annuler.addEventListener('click', () => this.closeGare());
      window.addEventListener('keydown', (e) => { if (e.key === 'Escape' && this.dialog) this.closeGare(); });
    }

    say(texte) {
      if (!this.msgEl) return;
      this.msgEl.textContent = texte;
      this.msgEl.hidden = false;
      clearTimeout(this.sayTimer);
      this.sayTimer = setTimeout(() => { this.msgEl.hidden = true; }, 3600);
    }

    // La gare touchée (le dessin du bâtiment « gare ») : la fenêtre des départs.
    tapGare(w) {
      const b = (this.buildings || []).find((q) => q.name === 'gare');
      if (!b || !this.gare || !TRAIN.gares[NOM_CARTE] || w.x < b.x0 || w.x > b.x1 || w.y < b.top || w.y > b.base + 8) return false;
      this.openGare();
      return true;
    }

    openGare() {
      const el = this.gareEl, list = TRAIN.gares[NOM_CARTE];
      if (!el || !list) return;
      const box = document.getElementById('gare-choix');
      box.textContent = '';
      for (const d of list) {
        const b = document.createElement('button');
        b.type = 'button';
        b.textContent = d.label;
        b.addEventListener('click', () => this.startTrip(d));
        box.appendChild(b);
      }
      const texte = document.getElementById('gare-texte');
      if (texte) texte.textContent = list.length > 1 ? 'Le train part dans un instant. Où voulez-vous aller ?' : 'Le train vous ramène à la gare de la ville.';
      el.hidden = false;
      this.dialog = true;
      const first = box.querySelector('button');
      if (first) first.focus();
    }

    closeGare() {
      if (this.gareEl) this.gareEl.hidden = true;
      // (le relâchement du clic qui ferme la fenêtre ne doit pas faire marcher la promeneuse)
      setTimeout(() => { this.dialog = false; }, 60);
    }

    // ---------- le train ----------

    makeGare(objs) {
      const pt = (n) => objs.find((o) => o.name === n);
      const arret = pt('arret'), quai = pt('quai');
      this.train = null;
      this.trip = null;
      this.arrival = null;
      this.trainMeta = this.cache.json.get(TRAIN.key + '_meta') || null;
      this.gare = arret && this.trainMeta && this.textures.exists(TRAIN.key)
        ? { x: arret.x, stopY: arret.y, quai: quai ? { x: quai.x, y: quai.y } : { x: arret.x + 26, y: arret.y } } : null;
      if (!this.gare) return;
      const sens = PARAMS.get('train'), terminus = !!TRAIN.terminus[NOM_CARTE];
      if (sens === 'nord' || sens === 'sud') this.arriveByTrain(sens === 'nord' ? -1 : 1, terminus);
      else if (terminus) this.addTrain(this.gare.stopY, 0);          // à quai : il attend le retour
    }

    // La rame : ses trois voitures, `y` le milieu de celle du milieu ; dir : -1 vers le nord, 1 vers le sud.
    addTrain(y, dir) {
      const m = this.trainMeta;
      if (this.train) for (const s of this.train.parts) s.destroy();
      const parts = m.pieces.map((_, k) => this.add.sprite(this.gare.x, y, TRAIN.key, k).setOrigin(m.anchor.x / m.frameWidth, m.anchor.y / m.frameHeight));
      this.train = { y, v: 0, dir, parts, alpha: 1, mode: 'arret', gone: 0, fadeIn: false, fadeOut: false };
      this.placeTrain();
      return this.train;
    }

    // Il arrive : il paraît à TRAIN.lead px de l'arrêt, en fondu, et freine pour s'arrêter pile.
    trainIn(dir) {
      const t = this.addTrain(this.gare.stopY - dir * TRAIN.lead, dir);
      Object.assign(t, { mode: 'approche', v: TRAIN.speed, alpha: 0, fadeIn: true });
      this.placeTrain();
      return t;
    }

    placeTrain() {
      const t = this.train, m = this.trainMeta, n = t.parts.length;
      t.parts.forEach((s, k) => {
        const y = t.y + (k - (n - 1) / 2) * m.pas;
        s.setPosition(Math.round(this.gare.x), Math.round(y)).setDepth(y).setAlpha(t.alpha);
      });
    }

    stepTrain(dt) {
      const t = this.train;
      if (!t) return;
      if (t.mode === 'approche') {
        const rest = (this.gare.stopY - t.y) * t.dir;
        const target = rest <= 0 ? 0 : Math.min(TRAIN.speed, Math.max(12, Math.sqrt(2 * TRAIN.decel * rest)));
        t.v = target < t.v ? target : Math.min(target, t.v + TRAIN.accel * dt);
        t.y += t.dir * Math.min(t.v * dt, Math.max(0, rest));
        if ((this.gare.stopY - t.y) * t.dir <= 0.5) { t.y = this.gare.stopY; t.v = 0; t.mode = 'arret'; }
      } else if (t.mode === 'depart') {
        t.v = Math.min(TRAIN.speed, t.v + TRAIN.accel * dt);
        t.y += t.dir * t.v * dt;
        t.gone += t.v * dt;
        if (t.fadeOut) {
          t.alpha = Math.max(0, Math.min(t.alpha, (TRAIN.lead - t.gone) / 200));
          if (t.gone >= TRAIN.lead) { for (const s of t.parts) s.destroy(); this.train = null; return; }
        }
      }
      if (t.fadeIn) { t.alpha = Math.min(1, t.alpha + dt * 2.5); if (t.alpha >= 1) t.fadeIn = false; }
      this.placeTrain();
    }

    // Un départ choisi : la promeneuse va au quai, le train arrive (ou attend à quai), elle
    // monte, il part ; la caméra le suit, puis la carte d'arrivée.
    startTrip(dest) {
      this.closeGare();
      if (!this.gare || this.trip) return;
      const dir = dest.sens === 'nord' ? -1 : 1;
      const cible = `ville-carte.html?carte=${dest.carte}&arrivee=gare&train=${dest.sens}`;
      this.locked = true;
      if (reduced()) { this.leave({ cible }); return; }
      this.trip = { cible, dir, phase: 'quai', wait: 0 };
      this.path = [];
      this.goTo(this.gare.quai.x, this.gare.quai.y);
      if (this.train && this.train.mode === 'arret') this.train.dir = dir;       // à quai : il repartira dans l'autre sens
      else this.trainIn(dir);
    }

    stepTrip(dt) {
      const tr = this.trip, t = this.train;
      if (!tr || !t) return;
      const P = this.heroPos, q = this.gare.quai;
      if (tr.phase === 'quai') {
        // (pas de chemin jusqu'au quai : elle y est portée)
        if (!this.path.length && Math.hypot(P.x - q.x, P.y - q.y) > 4) { P.x = q.x; P.y = q.y; }
        if (!this.path.length && t.mode === 'arret') {
          this.face = 'cote';
          this.hero.setFlipX(q.x > this.gare.x);
          tr.phase = 'montee';
          tr.wait = TRAIN.board;
        }
      } else if (tr.phase === 'montee') {
        this.heroAlpha = Math.max(0, this.heroAlpha - dt / 0.4);
        tr.wait -= dt;
        if (tr.wait <= 0) {
          Object.assign(t, { mode: 'depart', v: 0, gone: 0 });
          this.cameras.main.startFollow(t.parts[1], true, 0.1, 0.1);
          tr.phase = 'depart';
          tr.wait = TRAIN.leaveAfter;
        }
      } else if (tr.phase === 'depart') {
        tr.wait -= dt;
        if (tr.wait <= 0) { tr.phase = 'fin'; this.leave({ cible: tr.cible }); }
      }
    }

    // Arrivée en train (?train=nord|sud) : on voit le train arriver ; à l'arrêt, la promeneuse
    // paraît devant la gare. Hors d'un terminus, le train repart.
    arriveByTrain(dir, terminus) {
      if (reduced()) { if (terminus) this.addTrain(this.gare.stopY, 0); return; }
      this.locked = true;
      this.heroAlpha = 0;
      const t = this.trainIn(dir);
      const cam = this.cameras.main;
      cam.startFollow(t.parts[1], true, 0.12, 0.12);
      cam.centerOn(this.gare.x, this.gare.stopY);
      this.arrival = { phase: 'train', wait: 0, terminus };
    }

    stepArrival(dt) {
      const a = this.arrival, t = this.train;
      if (!a) return;
      if (a.phase === 'train') {
        if (!t || t.mode === 'arret') { a.phase = 'descente'; a.wait = TRAIN.alight; }
      } else if (a.phase === 'descente') {
        a.wait -= dt;
        if (a.wait <= 0) { a.phase = 'paraît'; this.cameras.main.startFollow(this.hero, true, 0.08, 0.08); }
      } else if (a.phase === 'paraît') {
        this.heroAlpha = Math.min(1, this.heroAlpha + dt / 0.5);
        if (this.heroAlpha >= 1) {
          this.locked = false;
          this.cameras.main.startFollow(this.hero, true, 0.12, 0.12);
          a.phase = a.terminus ? 'fin' : 'repart';
          a.wait = TRAIN.resume;
        }
      } else if (a.phase === 'repart') {
        a.wait -= dt;
        if (a.wait <= 0) {
          if (t) Object.assign(t, { mode: 'depart', v: 0, gone: 0, fadeOut: true });
          a.phase = 'fin';
        }
      }
      if (a.phase === 'fin') this.arrival = null;
    }

    // ---------- les trouvailles ----------

    makeFinds(objs) {
      this.finds = [];
      this.pick = null;
      const meta = (this.cache.json.get('faune') || {}).trouvailles || {};
      if (!objs.length || !this.textures.exists(FINDS.key)) return;
      if (!this.textures.exists('eclat')) {
        const g = this.make.graphics({ x: 0, y: 0, add: false });
        g.fillStyle(0xffffff, 1).fillRect(2, 0, 1, 5).fillRect(0, 2, 5, 1);
        g.generateTexture('eclat', 5, 5);
        g.destroy();
      }
      const jour = this.time ? this.time.jour : Math.floor(Date.now() / 864e5);
      const rec = this.readFinds();
      if (rec.jour !== jour) { rec.jour = jour; rec.pris = []; }
      this.findRec = rec;
      const hash = (str) => {
        let h = 2166136261;
        for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
        return ((h >>> 0) % 10007) / 10007;
      };
      for (const o of objs) {
        const genre = ((o.properties || []).find((q) => q.name === 'genre') || {}).value;
        const id = NOM_CARTE + ':' + o.name;
        if (hash(jour + '/' + id) > FINDS.part || rec.pris.includes(id)) continue;
        const kinds = Object.entries(meta).filter(([, m]) => m.genre === genre);
        if (!kinds.length) continue;
        const [kind, m] = kinds[Math.floor(hash(id + '#' + jour) * kinds.length) % kinds.length];
        const s = this.add.image(Math.round(o.x), Math.round(o.y), FINDS.key, m.frame).setOrigin(0.5, 0.8).setDepth(o.y - 2);
        const e = this.add.image(Math.round(o.x + 4), Math.round(o.y - 11), 'eclat').setDepth(o.y - 1).setAlpha(0);
        this.finds.push({ id, kind, nom: m.nom, x: o.x, y: o.y, s, e, phase: hash(id) * 7 });
      }
    }

    readFinds() {
      let r = null;
      try { r = JSON.parse(window.localStorage.getItem(FINDS.store) || 'null'); } catch (e) { r = null; }
      return r && Array.isArray(r.pris) ? Object.assign({ carnet: {} }, r) : { jour: null, pris: [], carnet: {} };
    }

    tapFind(w) {
      const f = (this.finds || []).find((q) => Math.abs(w.x - q.x) <= 11 && w.y >= q.y - 16 && w.y <= q.y + 6);
      if (!f) return false;
      this.pick = f;
      if (Math.hypot(this.heroPos.x - f.x, this.heroPos.y - f.y) > FINDS.reach) this.goTo(f.x, f.y + 4);
      return true;
    }

    stepFinds(time) {
      const P = this.heroPos;
      for (const f of [...(this.finds || [])]) {
        // un éclat, de temps en temps
        const k = Math.sin(time / 520 + f.phase);
        f.e.setAlpha(reduced() ? 0 : Math.max(0, k) ** 12);
        const d = Math.hypot(P.x - f.x, P.y - f.y);
        if ((this.pick === f && d <= FINDS.reach && !this.path.length) || d <= 9) this.collect(f);
      }
    }

    collect(f) {
      this.finds.splice(this.finds.indexOf(f), 1);
      if (this.pick === f) this.pick = null;
      f.e.destroy();
      this.tweens.add({ targets: f.s, y: f.s.y - 12, alpha: 0, duration: reduced() ? 0 : 450, onComplete: () => f.s.destroy() });
      const rec = this.findRec;
      rec.pris.push(f.id);
      rec.carnet[f.kind] = (rec.carnet[f.kind] || 0) + 1;
      try { window.localStorage.setItem(FINDS.store, JSON.stringify(rec)); } catch (e) { /* ignoré */ }
      this.say(`✨ ${f.nom} ! (dans le carnet : ${rec.carnet[f.kind]})`);
    }

    // ---------- les grottes ----------

    // Le niveau du jour, tiré au hasard : des murs semés au hasard, lissés par un automate
    // cellulaire (un mur entouré de murs le reste, une case entourée de sol s'ouvre), puis seule
    // la plus grande salle est gardée. L'échelle (on arrive d'en haut) contre un mur, le puits
    // (on descend) le plus loin possible ; le minerai dans les murs qui bordent le sol.
    genCave(graine, niveau) {
      const W = GROTTE.w, H = GROTTE.h;
      let h = 2166136261;
      for (let i = 0; i < graine.length; i++) { h ^= graine.charCodeAt(i); h = Math.imul(h, 16777619); }
      let a = h >>> 0;
      const rnd = () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
      const idx = (x, y) => y * W + x;
      let g, salle;
      for (let essai = 0; essai < 8; essai++) {
        g = new Uint8Array(W * H);                       // 1 : mur, 0 : sol
        for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) g[idx(x, y)] = x < 2 || y < 2 || x >= W - 2 || y >= H - 2 || rnd() < GROTTE.murs ? 1 : 0;
        for (let p = 0; p < GROTTE.passes; p++) {
          const n = new Uint8Array(g);
          for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
            let k = 0;
            for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (dx || dy) k += g[idx(x + dx, y + dy)];
            n[idx(x, y)] = k >= 5 ? 1 : k <= 3 ? 0 : g[idx(x, y)];
          }
          for (let x = 0; x < W; x++) { n[idx(x, 0)] = n[idx(x, 1)] = n[idx(x, H - 1)] = n[idx(x, H - 2)] = 1; }
          for (let y = 0; y < H; y++) { n[idx(0, y)] = n[idx(1, y)] = n[idx(W - 1, y)] = n[idx(W - 2, y)] = 1; }
          g = n;
        }
        // la plus grande salle (4-voisins) ; les autres sont rebouchées
        const zone = new Int32Array(W * H).fill(-1);
        let best = null;
        for (let i = 0; i < W * H; i++) {
          if (g[i] || zone[i] >= 0) continue;
          const q = [i];
          zone[i] = i;
          for (let k = 0; k < q.length; k++) {
            const c = q[k], cx = c % W, cy = (c - cx) / W;
            for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
              const n = idx(cx + dx, cy + dy);
              if (!g[n] && zone[n] < 0) { zone[n] = i; q.push(n); }
            }
          }
          if (!best || q.length > best.length) best = q;
        }
        if (!best) continue;
        const garde = new Set(best);
        for (let i = 0; i < W * H; i++) if (!g[i] && !garde.has(i)) g[i] = 1;
        salle = best;
        if (best.length > W * H * 0.28) break;
      }
      const sol = (x, y) => x >= 0 && y >= 0 && x < W && y < H && !g[idx(x, y)];
      const ouvert = (x, y) => [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]].every(([dx, dy]) => sol(x + dx, y + dy));
      // l'échelle : une case de sol sous un mur, avec du sol devant (on y arrive)
      const pieds = salle.map((c) => [c % W, Math.floor(c / W)]).filter(([x, y]) => !sol(x, y - 1) && sol(x, y + 1) && sol(x - 1, y + 1) && sol(x + 1, y + 1));
      const [ex, ey] = pieds.length ? pieds[Math.floor(rnd() * pieds.length)] : [salle[0] % W, Math.floor(salle[0] / W)];
      // le puits : la case ouverte la plus loin de l'échelle
      const dist = new Int32Array(W * H).fill(-1);
      const q = [idx(ex, ey)];
      dist[q[0]] = 0;
      for (let k = 0; k < q.length; k++) {
        const c = q[k], cx = c % W, cy = (c - cx) / W;
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const n = idx(cx + dx, cy + dy);
          if (sol(cx + dx, cy + dy) && dist[n] < 0) { dist[n] = dist[c] + 1; q.push(n); }
        }
      }
      let px = ex, py = ey + 1, pd = -1;
      for (const c of salle) { const x = c % W, y = Math.floor(c / W); if (ouvert(x, y) && dist[c] > pd) { pd = dist[c]; px = x; py = y; } }
      // le minerai : les murs qui bordent le sol, la sorte tirée selon le niveau
      const poids = GROTTE.poids(niveau), total = Object.values(poids).reduce((s, w) => s + w, 0);
      const ores = [], decor = [], stalag = [];
      for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
        if (g[idx(x, y)]) {
          if (![[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => sol(x + dx, y + dy)) || rnd() > GROTTE.minerai * (1 + niveau * 0.06)) continue;
          let r = rnd() * total, kind = 'fer';
          for (const [k, w] of Object.entries(poids)) { if (r < w) { kind = k; break; } r -= w; }
          ores.push({ x, y, kind });
          continue;
        }
        const pres = Math.abs(x - ex) + Math.abs(y - ey) < 4 || Math.abs(x - px) + Math.abs(y - py) < 3;
        const r = rnd();
        if (pres) continue;
        if (r < 0.025 && ouvert(x, y)) stalag.push({ x, y, v: rnd() < 0.5 ? 0 : 1 });
        else if (r < 0.06) decor.push({ x, y, kind: rnd() < 0.6 ? 'champignon' : 'cristal' });
      }
      return { W, H, g, sol, echelle: { x: ex, y: ey }, puits: niveau < GROTTE.niveaux ? { x: px, y: py } : null, ores, decor, stalag };
    }

    buildCave() {
      const meta = this.cache.json.get('grotte') || { tuiles: {}, objets: [] };
      const id = (PARAMS.get('grotte') || '1').replace(/[^\w-]/g, '').slice(0, 12) || '1';
      const niveau = Math.max(1, Math.min(GROTTE.niveaux, parseInt(PARAMS.get('niveau'), 10) || 1));
      const h = window.HorlogeSortie ? window.HorlogeSortie.maintenant() : null;
      const jour = h ? h.jour : Math.floor(Date.now() / 864e5);
      const c = this.genCave(`${id}:${niveau}:${jour}`, niveau);
      Object.assign(c, { id, niveau, jour, meta });
      this.cave = c;
      const map = this.make.tilemap({ tileWidth: T, tileHeight: T, width: c.W, height: c.H });
      const set = map.addTilesetImage('grotte_tuiles', extrude(this.textures, 'grotte_tuiles', T), T, T, 1, 2);
      ['sol', 'marquage', 'falaise', 'minerais', DEVANT].forEach((n, i) => { this.layers[n] = map.createBlankLayer(n, set).setDepth(n === DEVANT ? 1e6 : -100 + i); });
      const t = (n) => meta.tuiles[n];
      const r = (x, y, k) => { const s = Math.sin(x * 12.9898 + y * 78.233 + k) * 43758.5453; return s - Math.floor(s); };
      for (let y = 0; y < c.H; y++) for (let x = 0; x < c.W; x++) {
        if (c.sol(x, y)) {
          const q = r(x, y, 1);
          this.layers.sol.putTileAt(t('sol_' + (q < 0.7 ? 0 : q < 0.82 ? 1 : q < 0.9 ? 2 : q < 0.94 ? 3 : 4)), x, y);
        } else if (c.sol(x, y + 1)) this.layers.falaise.putTileAt(t('paroi_' + Math.floor(r(x, y, 2) * 4)), x, y);
        else {
          const n = (c.sol(x, y - 1) ? 1 : 0) + (c.sol(x + 1, y) ? 2 : 0) + (c.sol(x - 1, y) ? 8 : 0);
          this.layers.falaise.putTileAt(t('plafond_' + n), x, y);
        }
      }
      // le minerai déjà pioché aujourd'hui ne revient que demain
      const rec = this.readCaves();
      if (rec.jour !== jour) { rec.jour = jour; rec.pris = []; }
      this.caveRec = rec;
      c.ores = c.ores.filter((o) => !rec.pris.includes(`${id}:${niveau}:${o.x},${o.y}`));
      for (const o of c.ores) this.layers.minerais.putTileAt(t(o.kind), o.x, o.y);
      for (const d of c.decor) this.layers.marquage.putTileAt(t(d.kind), d.x, d.y);
      // les objets : l'échelle, le puits, les stalagmites (on ne passe pas à travers)
      const ob = (n) => Math.max(0, meta.objets.indexOf(n));
      const E = c.echelle, P = c.puits;
      this.add.image(E.x * T + 8, E.y * T + 15, 'grotte_objets', ob('echelle')).setOrigin(0.5, 1).setDepth(E.y * T);
      if (P) this.add.image(P.x * T + 8, P.y * T + 12, 'grotte_objets', ob('trou')).setOrigin(0.5, 0.75).setDepth(P.y * T - 8);
      for (const s of c.stalag) {
        this.add.image(s.x * T + 8, s.y * T + 15, 'grotte_objets', ob('stalagmite_' + s.v)).setOrigin(0.5, 1).setDepth(s.y * T + 15);
        this.layers.marquage.putTileAt(t('sol_0'), s.x, s.y);
      }
      const ici = `ville-carte.html?carte=grotte&grotte=${id}`;
      const pass = (nom, x, y, sens, cible) => ({ name: nom, x: x * T, y: y * T, width: T, height: T, properties: [{ name: 'cible', value: cible }, { name: 'sens', value: sens }] });
      c.objects = {
        depart: [{ x: E.x * T + 8, y: (E.y + 1) * T + 12 }],
        arrivees: [{ name: 'haut', x: E.x * T + 8, y: (E.y + 1) * T + 12 }].concat(P ? [{ name: 'bas', x: P.x * T + 8, y: (P.y + 1) * T + 12 }] : []),
        passages: [pass('remonter', E.x, E.y - 1, 'haut', niveau > 1 ? `${ici}&niveau=${niveau - 1}&arrivee=bas` : `ville-carte.html?carte=montagne&arrivee=grotte_${id}`)]
          .concat(P ? [pass('descendre', P.x, P.y, 'bas', `${ici}&niveau=${niveau + 1}&arrivee=haut`)] : []),
      };
      this.cameras.main.setBackgroundColor('#0b090a');
      return map;
    }

    readCaves() {
      let r = null;
      try { r = JSON.parse(window.localStorage.getItem(GROTTE.store) || 'null'); } catch (e) { r = null; }
      return r && Array.isArray(r.pris) ? Object.assign({ carnet: {} }, r) : { jour: null, pris: [], carnet: {} };
    }

    // La lumière autour de la promeneuse (le reste de la grotte dans le noir), le niveau affiché,
    // les stalagmites infranchissables, un éclat de temps en temps sur le minerai.
    makeCaveLife() {
      this.mine = null;
      this.mining = null;
      const c = this.cave;
      if (!c) return;
      for (const s of c.stalag) if (this.walk[s.y]) this.walk[s.y][s.x] = false;
      const L = GROTTE.lumiere, N = 512, K = 4;          // une texture de N px, agrandie K fois
      if (!this.textures.exists('lumiere_grotte')) {
        const cv = document.createElement('canvas');
        cv.width = cv.height = N;
        const g = cv.getContext('2d');
        const grad = g.createRadialGradient(N / 2, N / 2, L.r0 / K, N / 2, N / 2, L.r1 / K);
        grad.addColorStop(0, 'rgba(6,4,6,0)');
        grad.addColorStop(0.55, `rgba(6,4,6,${L.noir * 0.6})`);
        grad.addColorStop(1, `rgba(6,4,6,${L.noir})`);
        g.fillStyle = grad;
        g.fillRect(0, 0, N, N);
        this.textures.addCanvas('lumiere_grotte', cv);
      }
      // (agrandie : elle couvre l'écran même au plus petit zoom)
      this.light = this.add.image(0, 0, 'lumiere_grotte').setScale(K).setDepth(1.9e6);
      this.say(`⛏️ La grotte — niveau ${c.niveau}${c.niveau >= GROTTE.niveaux ? ' (le plus profond)' : ''}`);
    }

    tapOre(w) {
      const c = this.cave;
      if (!c) return false;
      const gx = Math.floor(w.x / T), gy = Math.floor(w.y / T);
      const o = c.ores.find((q) => q.x === gx && q.y === gy);
      if (!o) return false;
      // la case de sol voisine la plus proche de la promeneuse
      const P = this.heroPos;
      const pres = [[0, 1], [-1, 0], [1, 0], [0, -1]].map(([dx, dy]) => ({ x: o.x + dx, y: o.y + dy }))
        .filter((q) => this.canWalk(q.x, q.y))
        .map((q) => ({ x: q.x * T + 8, y: q.y * T + 13 }))
        .sort((a, b) => Math.hypot(a.x - P.x, a.y - P.y) - Math.hypot(b.x - P.x, b.y - P.y));
      if (!pres.length) return true;
      this.mine = { ore: o, stand: pres[0] };
      this.path = [];
      if (Math.hypot(pres[0].x - P.x, pres[0].y - P.y) > 3) this.goTo(pres[0].x, pres[0].y);
      return true;
    }

    // Arrivée près du minerai : trois coups de pioche (pioche_cote), des éclats, puis il est pris.
    stepMine(dt) {
      const m = this.mine;
      if (!m) return;
      const P = this.heroPos;
      if (!this.mining) {
        if (this.path.length) return;
        if (Math.hypot(m.stand.x - P.x, m.stand.y - P.y) > 6) { this.mine = null; return; }
        this.mining = { t: 0, coup: 0, frame: 'pioche_cote_0' };
        this.hero.setFlipX(m.ore.x * T + 8 < P.x - 2);
        this.face = 'cote';
      }
      const g = this.mining;
      g.t += dt;
      const k = Math.min(3, Math.floor(g.t / GROTTE.coup * 4));
      g.frame = 'pioche_cote_' + k;
      if (g.t >= GROTTE.coup) {
        g.t = 0;
        g.coup++;
        this.chips(m.ore);
        if (g.coup >= GROTTE.coups) this.takeOre(m.ore);
      }
    }

    chips(o) {
      if (reduced()) return;
      const col = { fer: 0xd2a88a, cuivre: 0xd67e46, or: 0xf0c846, platine: 0xe6eef8 }[o.kind] || 0x9a9088;
      for (let i = 0; i < 4; i++) {
        const r = this.add.rectangle(o.x * T + 8, o.y * T + 10, 2, 2, i % 2 ? col : 0x7a7068).setDepth(2e6);
        this.tweens.add({ targets: r, x: r.x + (Math.random() - 0.5) * 22, y: r.y + 6 + Math.random() * 10, alpha: 0, duration: 380, onComplete: () => r.destroy() });
      }
      this.cameras.main.shake(70, 0.002);
    }

    takeOre(o) {
      const c = this.cave;
      this.mine = null;
      this.mining = null;
      c.ores.splice(c.ores.indexOf(o), 1);
      this.layers.minerais.removeTileAt(o.x, o.y);
      const rec = this.caveRec;
      rec.pris.push(`${c.id}:${c.niveau}:${o.x},${o.y}`);
      rec.carnet[o.kind] = (rec.carnet[o.kind] || 0) + 1;
      try { window.localStorage.setItem(GROTTE.store, JSON.stringify(rec)); } catch (e) { /* ignoré */ }
      const nom = ((c.meta.minerais || {})[o.kind] || {}).nom || o.kind;
      this.say(`⛏️ ${nom} ! (dans le carnet : ${rec.carnet[o.kind]})`);
    }

    // ---------- les animaux ----------

    makeFauna(zones) {
      this.animals = [];
      const meta = (this.cache.json.get('faune') || {}).especes || {};
      const rnd = (a, b) => a + Math.random() * (b - a);
      for (const z of zones) {
        const esp = ((z.properties || []).find((q) => q.name === 'espece') || {}).value || z.name;
        const def = FAUNE.especes[esp], m = meta[esp];
        if (!def || !m || !this.textures.exists('faune_' + esp)) continue;
        const frames = {};
        m.frames.forEach((n, i) => { frames[n] = i; });
        for (let i = 0; i < def.n; i++) {
          const x = rnd(z.x, z.x + z.width), y = rnd(z.y, z.y + z.height);
          const s = this.add.sprite(Math.round(x), Math.round(y), 'faune_' + esp, 0).setOrigin(m.anchor.x / m.frameWidth, m.anchor.y / m.frameHeight);
          const a = { esp, def, nom: m.nom, zone: z, frames, s, x, y, tx: x, ty: y, state: 'repos', wait: rnd(0.5, 4), walked: 0, alt: 0, alpha: 1, t: 0 };
          if (esp === 'aigle') Object.assign(a, { cx: x, cy: y, ang: rnd(0, 6.3), shadow: this.add.ellipse(0, 0, 16, 5, 0x1e1a18, 0.18).setDepth(0) });
          if (esp === 'mouette') a.shadow = this.add.ellipse(0, 0, 8, 3, 0x1e1a18, 0.25).setVisible(false);
          if (esp === 'dauphin') { a.state = 'attente'; a.wait = rnd(2, 6); s.setVisible(false); }
          this.animals.push(a);
        }
      }
    }

    tapAnimal(w) {
      const a = (this.animals || []).find((q) => q.s.visible && q.alpha > 0.5 && Math.abs(w.x - q.s.x) <= (q.def.size > 16 ? 16 : 10)
        && w.y >= q.s.y - (q.def.size > 16 ? 30 : 16) && w.y <= q.s.y + 6);
      if (!a) return false;
      this.say(a.def.texte);
      return true;
    }

    stepFauna(time, dt) {
      if (!this.animals || !this.animals.length) return;
      const P = this.heroPos, still = reduced();
      const rnd = (a, b) => a + Math.random() * (b - a);
      const inZone = (z) => ({ x: rnd(z.x, z.x + z.width), y: rnd(z.y, z.y + z.height) });
      const frame = (a, n) => { if (a.frames[n] !== undefined) a.s.setFrame(a.frames[n]); };
      for (const a of this.animals) {
        const z = a.zone;
        if (a.esp === 'aigle') {
          // il tourne en grands cercles, son centre dérive lentement d'un bout à l'autre de la carte
          if (!still) {
            a.ang += dt * 0.32;
            if (Math.hypot(a.tx - a.cx, a.ty - a.cy) < 8) { const p = inZone(z); a.tx = p.x; a.ty = p.y; }
            const l = Math.hypot(a.tx - a.cx, a.ty - a.cy) || 1;
            a.cx += (a.tx - a.cx) / l * 10 * dt;
            a.cy += (a.ty - a.cy) / l * 10 * dt;
          }
          const x = a.cx + Math.cos(a.ang) * 96, y = a.cy + Math.sin(a.ang) * 54;
          a.s.setPosition(Math.round(x), Math.round(y)).setDepth(2e6).setRotation(a.ang + Math.PI);
          frame(a, Math.floor(time / 900) % 5 === 0 ? 'vol_1' : 'vol_0');
          a.shadow.setPosition(Math.round(x + 34), Math.round(y + 70));
          continue;
        }
        if (a.esp === 'dauphin') {
          // de temps en temps, un saut au large : la gerbe, le saut, la gerbe
          const seq = ['gerbe', 'saut_0', 'saut_1', 'saut_2', 'saut_3', 'gerbe'];
          if (a.state === 'attente') {
            a.wait -= dt;
            if (a.wait <= 0 && !still) { const p = inZone(z); Object.assign(a, { x: p.x, y: p.y, state: 'saut', t: 0, sens: Math.random() < 0.5 ? -1 : 1 }); }
          } else {
            a.t += dt;
            const k = Math.floor(a.t / 0.17);
            if (k >= seq.length) { a.state = 'attente'; a.wait = rnd(4, 11); a.s.setVisible(false); continue; }
            frame(a, seq[k]);
            a.s.setVisible(true).setFlipX(a.sens < 0).setPosition(Math.round(a.x + a.sens * k * 5), Math.round(a.y)).setDepth(a.y);
          }
          continue;
        }
        const dHero = Math.hypot(P.x - a.x, P.y - a.y);
        // dérangé : la marmotte rentre dans son terrier, le crabe file, la mouette s'envole
        if (a.def.peur && dHero < a.def.peur && ['repos', 'marche'].includes(a.state) && !still) {
          if (a.esp === 'marmotte') { a.state = 'cache'; a.wait = rnd(6, 11); }
          else if (a.esp === 'crabe') {
            const l = dHero || 1;
            a.tx = Math.max(z.x, Math.min(z.x + z.width, a.x + (a.x - P.x) / l * 56));
            a.ty = Math.max(z.y, Math.min(z.y + z.height, a.y + (a.y - P.y) / l * 20));
            a.state = 'fuite';
          } else if (a.esp === 'mouette') {
            let p = inZone(z);
            for (let i = 0; i < 6 && Math.hypot(p.x - P.x, p.y - P.y) < 90; i++) p = inZone(z);
            Object.assign(a, { tx: p.x, ty: p.y, state: 'vol', t: 0, x0: a.x, y0: a.y });
          }
        }
        let moving = false;
        if (a.state === 'cache') {
          a.alpha = Math.max(0, a.alpha - dt / 0.3);
          a.wait -= dt;
          if (a.wait <= 0) { const p = inZone(z); Object.assign(a, { x: p.x, y: p.y, state: 'sort' }); }
        } else if (a.state === 'sort') {
          a.alpha = Math.min(1, a.alpha + dt / 0.5);
          if (a.alpha >= 1) { a.state = 'repos'; a.wait = rnd(1, 3); }
        } else if (a.state === 'vol') {
          const l = Math.hypot(a.tx - a.x0, a.ty - a.y0) || 1, dur = Math.max(1.2, l / 70);
          a.t += dt;
          const q = Math.min(1, a.t / dur);
          a.x = a.x0 + (a.tx - a.x0) * q;
          a.y = a.y0 + (a.ty - a.y0) * q;
          a.alt = Math.sin(q * Math.PI) * 26;
          if (q >= 1) { a.state = 'repos'; a.wait = rnd(2, 6); a.alt = 0; }
        } else if (a.state === 'repos') {
          a.wait -= dt;
          if (a.wait <= 0 && !still) {
            const p = inZone(z);
            // la mouette s'envole parfois d'elle-même
            if (a.esp === 'mouette' && Math.random() < 0.3) Object.assign(a, { tx: p.x, ty: p.y, state: 'vol', t: 0, x0: a.x, y0: a.y });
            else Object.assign(a, { tx: p.x, ty: p.y, state: 'marche' });
          }
        } else if (a.state === 'marche' || a.state === 'fuite') {
          const dx = a.tx - a.x, dy = a.ty - a.y, l = Math.hypot(dx, dy), st = a.def.speed * (a.state === 'fuite' ? 3 : 1) * dt;
          if (a.esp !== 'crabe' && Math.abs(dx) > 0.5) a.s.setFlipX(dx < 0);
          if (l <= st) { a.x = a.tx; a.y = a.ty; a.state = 'repos'; a.wait = rnd(1.5, 5); } else { a.x += dx / l * st; a.y += dy / l * st; }
          a.walked += Math.min(l, st);
          moving = true;
        }
        // les images
        if (a.state === 'vol') {
          frame(a, Math.floor(time / 140) % 2 ? 'vol_1' : 'vol_0');
          if (a.tx !== a.x) a.s.setFlipX(a.tx < a.x);
        } else if (moving) {
          const n = a.esp === 'mouette' ? ['debout_0', 'debout_1'] : a.esp === 'bouquetin' ? ['marche_0', 'marche_1', 'marche_2', 'marche_3'] : ['marche_0', 'marche_1'];
          frame(a, n[Math.floor(a.walked / 3) % n.length]);
        } else {
          const n = { marmotte: ['assise_0', 'assise_1'], bouquetin: ['debout_0', 'debout_1'], mouette: ['debout_0', 'debout_1'], crabe: ['marche_0', 'marche_0'] }[a.esp];
          frame(a, n[Math.floor(time / 1300 + a.x) % 2]);
        }
        a.s.setPosition(Math.round(a.x), Math.round(a.y - a.alt)).setDepth(a.state === 'vol' ? 2e6 : a.y).setAlpha(a.alpha).setVisible(a.alpha > 0);
        if (a.shadow) a.shadow.setVisible(a.state === 'vol').setPosition(Math.round(a.x), Math.round(a.y)).setDepth(a.y - 1);
      }
    }

    canWalk(tx, ty) {
      return !!(this.walk[ty] && this.walk[ty][tx]);
    }

    // Le chemin le plus court (en tuiles, 8 directions sans couper un coin) jusqu'à la tuile
    // marchable la plus proche du point visé.
    goTo(x, y) {
      const W = this.map.width, H = this.map.height;
      let gx = Math.floor(x / T), gy = Math.floor(y / T);
      if (!this.canWalk(gx, gy)) {
        let best = null;
        for (let r = 1; r < 8 && !best; r++) {
          for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
            if (Math.max(Math.abs(dx), Math.abs(dy)) !== r || !this.canWalk(gx + dx, gy + dy)) continue;
            const d = Math.hypot(dx, dy);
            if (!best || d < best.d) best = { x: gx + dx, y: gy + dy, d };
          }
        }
        if (!best) return;
        gx = best.x; gy = best.y; x = gx * T + T / 2; y = gy * T + T - 2;
      }
      const sx = Math.floor(this.heroPos.x / T), sy = Math.floor(this.heroPos.y / T);
      const prev = new Map([[sy * W + sx, -1]]);
      const queue = [sy * W + sx];
      const goal = gy * W + gx;
      for (let head = 0; head < queue.length && !prev.has(goal); head++) {
        const c = queue[head], cx = c % W, cy = (c - cx) / W;
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]) {
          const nx = cx + dx, ny = cy + dy, n = ny * W + nx;
          if (nx < 0 || ny < 0 || nx >= W || ny >= H || prev.has(n) || !this.canWalk(nx, ny)) continue;
          if (dx && dy && (!this.canWalk(cx + dx, cy) || !this.canWalk(cx, cy + dy))) continue;
          prev.set(n, c);
          queue.push(n);
        }
      }
      if (!prev.has(goal)) return;
      const steps = [];
      for (let c = goal; prev.get(c) !== -1; c = prev.get(c)) steps.push({ x: (c % W) * T + T / 2, y: Math.floor(c / W) * T + T - 2 });
      steps.reverse();
      if (steps.length) steps[steps.length - 1] = { x: Math.round(x), y: Math.round(y) };
      this.path = steps;
    }

    // Le feuillage devant la promeneuse s'efface un peu ; celui qu'elle a quitté revient.
    fadeFoliage(x, y) {
      for (const t of this.faded) t.alpha = 1;
      this.faded = this.layers[DEVANT].getTilesWithinWorldXY(x - HERO.w / 2, y - HERO.foot, HERO.w, HERO.h - 2) || [];
      for (const t of this.faded) t.alpha = FEUILLAGE_ALPHA;
    }

    update(time, delta) {
      this.stepTileAnims(time);
      const dt = Math.min(delta, 100) / 1000;
      this.stepTraffic(time, dt);
      this.stepPassages(time);
      this.stepClock(time);
      this.stepSchool(time, dt);
      this.stepTrain(dt);
      this.stepTrip(dt);
      this.stepArrival(dt);
      this.stepFinds(time);
      this.stepFauna(time, dt);
      this.stepMine(dt);
      const P = this.heroPos;
      const x0 = P.x, y0 = P.y;
      let vx = 0, vy = 0;
      const k = this.locked ? null : this.keys;
      if (k) {
        vx = (k.RIGHT.isDown || k.D.isDown ? 1 : 0) - (k.LEFT.isDown || k.Q.isDown || k.A.isDown ? 1 : 0);
        vy = (k.DOWN.isDown || k.S.isDown ? 1 : 0) - (k.UP.isDown || k.Z.isDown || k.W.isDown ? 1 : 0);
      }
      if (vx || vy) {
        this.path = [];
        const l = Math.hypot(vx, vy), st = HERO.speed * dt;
        const nx = P.x + (vx / l) * st, ny = P.y + (vy / l) * st;
        // glisse le long d'un bord : chaque axe séparément
        if (this.canWalk(Math.floor(nx / T), Math.floor(P.y / T))) P.x = nx;
        if (this.canWalk(Math.floor(P.x / T), Math.floor(ny / T))) P.y = ny;
      } else if (this.path.length) {
        const to = this.path[0];
        const dx = to.x - P.x, dy = to.y - P.y, l = Math.hypot(dx, dy), st = HERO.speed * dt;
        if (l <= st) { P.x = to.x; P.y = to.y; this.path.shift(); } else { P.x += (dx / l) * st; P.y += (dy / l) * st; }
        vx = dx; vy = dy;
      }
      const H = this.hero;
      const moved = Math.hypot(P.x - x0, P.y - y0);
      if (this.mining) {
        H.setFrame(this.frame(this.mining.frame));
      } else if (moved > 0) {
        if (Math.abs(vx) > Math.abs(vy) * 0.8) { this.face = 'cote'; H.setFlipX(vx < 0); } else { this.face = vy > 0 ? 'bas' : 'haut'; H.setFlipX(false); }
        this.walked += moved;
        H.setFrame(this.frame(`marche_${this.face}_${Math.floor(this.walked / HERO.stride) % 4}`));
      } else {
        // debout : elle respire (deux images, lentement)
        H.setFrame(this.frame(`idle_${this.face}_${Math.floor(time / 600) % 2}`));
      }
      H.setPosition(Math.round(P.x), Math.round(P.y)).setDepth(P.y).setAlpha(this.heroAlpha);
      this.shadow.setPosition(Math.round(P.x), Math.round(P.y)).setDepth(P.y - 0.5).setAlpha(this.heroAlpha);
      this.fadeFoliage(Math.round(P.x), Math.round(P.y));
      if (this.light) this.light.setPosition(Math.round(P.x), Math.round(P.y - 12));
      // les bâtiments autour des voitures, puis de la promeneuse
      const boxes = (this.cars || []).map((c) => ({ x: c.x - 30, y: c.y - 38, w: 60, h: 56, foot: c.y, see: false }));
      boxes.push({ x: P.x - HERO.w / 2, y: P.y - HERO.foot, w: HERO.w, h: HERO.h, foot: P.y, see: true });
      this.uncover(boxes);
    }
  }

  window.addEventListener('DOMContentLoaded', () => {
    const parent = document.getElementById('ville');
    new Phaser.Game({
      type: Phaser.AUTO,
      parent,
      backgroundColor: '#665951',
      pixelArt: true,
      roundPixels: true,     // la caméra et les sprites calés sur des pixels entiers
      scale: { mode: Phaser.Scale.RESIZE, width: parent.clientWidth, height: parent.clientHeight },
      scene: [VilleScene],
    });
  });
})();
