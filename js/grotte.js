/*
 * La mine de la ferme (jeu.html?carte=grotte&niveau=<n>) : ses niveaux de grotte, sous le tas
 * de terre de la ferme générée (js/carte/ferme/passages.js : on y entre par sa porte). Les grottes
 * de la montagne du grand monde (fiche 6b : jeu.html?carte=grotte&grotte=grotte_<n>&niveau=<n>) sont
 * la même scène : on y entre par leur bouche de roche (js/carte/ferme/lieux-monde.js), leurs
 * réglages et leurs niveaux sont ceux du moteur (js/engine/grotte.js : moins de niveaux, plus de
 * minerai, des pierres, un filon), et l'échelle du premier niveau ramène devant leur entrée.
 *
 * Chaque niveau est tiré au hasard (le même toute la journée : la graine est l'entrée, le niveau
 * et le jour ; pour une grotte du monde, la graine du monde devant) par un automate cellulaire
 * (js/engine/grotte.js, genererNiveau, que la page donne : FermeHote.niveau), avec les morceaux de
 * scripts/carte/grotte.py. On
 * descend par le puits, on remonte par l'échelle (des passages : un appui dessus, ou le personnage
 * qui s'y pousse, y mène ; au premier niveau, l'échelle ramène à la ferme). Le minerai est pris dans les murs
 * qui touchent le sol, de plus en plus rare et précieux en profondeur (fer, cuivre, or, platine :
 * GROTTE.POIDS, data/grotte.json ; dans une grotte de la montagne, du quartz et des améthystes en
 * plus : GROTTE.MONDE) ; on le pioche en le touchant, la pioche en main : il va dans
 * l'inventaire (FermeHote.miner ; au Four, 4 minerais et du bois font un lingot). Les
 * champignons lumineux se cueillent (FermeHote.ramasser). Il fait noir : on n'y voit qu'autour
 * de soi (des lumières WebGL : la lanterne, le jour qui tombe de l'échelle, les champignons qui
 * pulsent, les améthystes ; sans WebGL, une image noire percée autour du personnage).
 *
 * La scène s'affiche dans la page du jeu (#map-stage), à la place de la carte de la ferme : la
 * carte du joueur, la date, le menu et la barre d'outils restent là, le temps passe comme à la
 * ferme. js/ui/excursion.js l'ouvre (Grotte.start) et passe d'un niveau à l'autre
 * (FermeHote.go). C'est le personnage principal de la partie qui s'y promène, à pied.
 * Voir docs/architecture-phaser.md.
 *
 * Le récit, lot 10 (le fil de la lune, js/engine/fil-lune.js) : une nuit de pleine lune, les fragments au
 * carnet, une fissure éclairée d'une lumière froide s'ouvre dans une paroi d'un niveau de la mine
 * (c.fissure, que la page donne : FermeHote.niveau) ; elle mène à la galerie (« niveau=galerie ») : une
 * petite chambre fixe, une couverture, une tasse, des phases de lune gravées, et la pierre (un appui : elle
 * va dans l'inventaire, FermeHote.pierre). Les images : assets/galerie.png (scripts/carte/galerie.py).
 */
(function (global) {
  'use strict';

  const K = global.CarteKit;
  const T = K.T;
  const hote = () => global.FermeHote || null;
  const { reduit: reduced, saisie, v } = K;

  // Les réglages de jeu de la grotte (data/grotte.json, GROTTE ; js/engine/grotte.js,
  // reglagesGrotte : la mine de la ferme, ou une grotte de la montagne), que la page du jeu donne
  // (FermeHote.reglages), et le tirage d'un niveau (FermeHote.niveau) ; ici ne restent que les
  // images et la lumière.
  function donnees(id) {
    const H = hote(), d = H && H.reglages ? H.reglages(id) : null;
    if (!d || !H.niveau) throw new Error('js/grotte.js : réglages de la grotte introuvables (data/grotte.json, FermeHote.reglages)');
    return d;
  }
  // Les passages (l'échelle, le puits) : ils se voient (l'échelle, le jour qui en tombe ; le trou du
  // puits), sans flèche par-dessus (fiche 14 : la flèche bleue d'avant est retirée). Un appui sur l'un
  // d'eux (à `prise` px près) y mène : tout de suite si le personnage est à moins de `pres` px, sinon
  // il y marche d'abord ; le personnage poussé vers lui (au doigt, aux flèches), à moins de `pousse`
  // px, y passe aussi (une fois la poussée lâchée depuis l'arrivée : celui qui arrive en tenant la
  // flèche du haut, sous le puits, n'y redescend pas).
  const PASS = { pres: 80, prise: 12, pousse: 30 };
  // Le personnage de la partie (CarteKit.planchePerso). `bulle` : la pointe de la bulle « +1 »
  // (CarteKit.bulleGain), en px au-dessus de ses pieds.
  const HERO = { key: 'heros', w: 16, h: 32, foot: 30, speed: K.VITESSES.grotte, bulle: 26 };
  // La grotte (assets/grotte_tuiles.png, grotte_objets.png, grotte.json : scripts/carte/grotte.py) :
  // la lumière autour du personnage (px : nette jusqu'à r0, noire à partir de r1), ce qu'on a
  // pioché (localStorage `store`) ; un champignon lumineux se cueille à moins de `cueille` px.
  // Les lumières (WebGL) : l'ambiance presque noire ; la lanterne (rayon : × lumiere.r1, `haut`
  // px au-dessus des pieds) ; le jour qui tombe du trou de l'échelle ; les champignons (intensité
  // qui pulse de [0] à [1] en `periode` s, des spores par seconde) et les améthystes (intensité
  // [0] de loin, [1] tout près, à moins de `portee` px ; une étincelle toutes les `eclat` s).
  // `halo` : leur Point Light (rayon px). `jeu` : les réglages de jeu (la taille d'un niveau en
  // tuiles, le nombre de niveaux, la part de murs au départ et les passes de l'automate, la
  // chance qu'un mur au bord du sol porte du minerai, le poids de chaque minerai, les coups de
  // pioche et leur durée).
  const GROTTE = {
    tiles: 'assets/grotte_tuiles.png', objets: 'assets/grotte_objets.png', meta: 'assets/grotte.json',
    lumiere: { r0: 44, r1: 132, noir: 0.93 }, store: 'ferme-grottes', cueille: 14,
    lueurs: {
      ambiance: 0x141018, haloDepth: -50,
      lanterne: { couleur: 0xffd9a8, intensite: 1.5, rayon: 1.15, haut: 12 },
      echelle: { couleur: 0xb8ccff, intensite: 0.8, rayon: 64 },
      champignon: { couleur: 0x4ff0d2, intensite: [0.5, 1.05], rayon: 40, periode: [2.4, 4], spores: 0.8, spore: 0xa8fff0,
        halo: { rayon: 10, intensite: 0.35, attenuation: 0.08 } },
      cristal: { couleur: 0xa86cff, intensite: [0.35, 1.25], rayon: 34, portee: 56, eclat: [1.5, 4], etincelle: 0xf0deff,
        halo: { rayon: 9, intensite: 0.3, attenuation: 0.08 } },
      // (le récit, lot 10 : la lumière froide de la fissure, la lueur de la pierre)
      fissure: { couleur: 0x9fd4ff, intensite: 1.4, rayon: 90 },
      pierre: { couleur: 0xcfeaff, intensite: [0.6, 1.3], rayon: 48, periode: 5 },
    },
    // la galerie (le récit) : ses images (assets/galerie.png, cases de 32 px : la fissure, la couverture, la
    // tasse, les gravures, la pierre) ; la pierre se prend à moins de `prend` px
    galerie: { image: 'assets/galerie.png', cases: { fissure: 0, couverture: 1, tasse: 2, gravures: 3, pierre: 4 }, prend: 22 },
    // les réglages de la grotte `id` (« ferme » : la mine ; « grotte_<n> » : une grotte du monde)
    jeu(id) { return donnees(id); },
  };
  const clamp01 = (x) => Math.max(0, Math.min(1, x));
  // (fixée à chaque démarrage : Grotte.start(parent, '?niveau=…&arrivee=…'))
  let params = new URLSearchParams('');

  class GrotteScene extends Phaser.Scene {
    constructor() { super('grotte'); }

    init(data) {
      params = new URLSearchParams((data && data.search) || '');
    }

    preload() {
      this.load.image('grotte_tuiles', v(GROTTE.tiles));
      this.load.spritesheet('grotte_objets', v(GROTTE.objets), { frameWidth: 32, frameHeight: 32 });
      this.load.json('grotte', v(GROTTE.meta));
      this.load.spritesheet('galerie', v(GROTTE.galerie.image), { frameWidth: 32, frameHeight: 32 });
      // (la planche du personnage par son fichier : les textures restent d'une visite à l'autre,
      // et le personnage de la partie peut changer)
      const sheet = K.planchePerso();
      this.heroKey = HERO.key + ':' + sheet.file;
      this.load.spritesheet(this.heroKey, v(sheet.file), { frameWidth: HERO.w, frameHeight: HERO.h });
      this.load.json(this.heroKey + '_noms', v(sheet.names));
    }

    create() {
      this.layers = {};
      const map = this.buildCave();
      this.map = map;
      const c = this.cave;
      // où l'on marche : le sol, sans les stalagmites
      this.walk = [];
      for (let y = 0; y < c.H; y++) {
        const row = [];
        for (let x = 0; x < c.W; x++) row.push(c.sol(x, y));
        this.walk.push(row);
      }
      for (const s of c.stalag) this.walk[s.y][s.x] = false;

      // le personnage : ses images par nom (marche_bas_0…, idle_cote_0…)
      const noms = (this.cache.json.get(this.heroKey + '_noms') || {}).frames || [];
      this.frame = K.cases(noms);
      const arrivee = params.get('arrivee');
      const d = (arrivee && c.objects.arrivees.find((o) => o.name === arrivee)) || c.objects.depart[0];
      this.hero = this.add.sprite(Math.round(d.x), Math.round(d.y), this.heroKey, this.frame('idle_bas_0')).setOrigin(0.5, HERO.foot / HERO.h);
      this.shadow = this.add.ellipse(0, 0, 11, 4, 0x1e1a18, 0.35);
      this.heroPos = { x: d.x, y: d.y };
      this.face = 'bas';
      this.walked = 0;
      this.path = [];
      this.mine = null;
      this.mining = null;

      // la caméra suit le personnage, au pixel près, sans sortir du niveau
      const cam = this.cameras.main;
      cam.setBackgroundColor('#0b090a');
      cam.setBounds(0, 0, map.widthInPixels, map.heightInPixels);
      cam.startFollow(this.hero, true, 0.12, 0.12);
      cam.setRoundPixels(true);
      this.fitZoom();
      global.CarteJeu.suitTaille(this, () => this.fitZoom());

      this.makePassages(c.objects.passages, c.objects.arrivees);
      this.makeLight();
      this.say('💡 Glisse le doigt pour marcher (ou touche deux fois le sol) · la pioche en main (barre d\'outils) : un minerai · un champignon lumineux pour le cueillir · l\'échelle pour remonter');

      // un toucher : sur l'échelle ou le puits, changer de niveau ; sur un minerai, le piocher ; sur un
      // champignon, le cueillir ; ailleurs, un double appui : y aller (CarteKit.APPUI)
      const slop = K.APPUI.glisse * K.ratio();
      this.dbl = K.doubleAppui();
      this.input.on('pointerup', (p) => {
        if (p.getDistance() > slop || this.mining) return;
        const w = cam.getWorldPoint(p.x, p.y);
        const a = this.passageAt(w.x, w.y);
        if (a) { this.versPassage(a); return; }
        if (this.tapOre(w) || this.tapChampignon(w) || this.tapPierre(w)) { this.dbl.oublie(); return; }
        if (this.god()) { this.teleport(w.x, w.y); return; }
        K.astuceMarche(p);
        if (this.dbl.appui(w.x, w.y, cam.zoom)) this.goTo(w.x, w.y);
      });
      // le doigt posé puis glissé : il marche dans sa direction tant qu'il reste posé
      this.manette = K.manette(this, () => !this.god() && !this.mining);
      // (sans capture : les touches tapées dans un champ de la page y restent ; saisie())
      this.keys = this.input.keyboard ? this.input.keyboard.addKeys('UP,DOWN,LEFT,RIGHT,Z,Q,S,D,W,A', false) : null;
      global.Grotte.scene = this;
      this.events.once('destroy', () => { if (global.Grotte.scene === this) global.Grotte.scene = null; });
    }

    // ---------- le niveau ----------

    // Le niveau du jour (js/engine/grotte.js, genererNiveau, que la page donne : FermeHote.niveau) :
    // des murs semés au hasard, lissés par un automate cellulaire, la plus grande salle gardée ;
    // l'échelle (on arrive d'en haut) contre un mur, le puits (on descend) le plus loin possible ;
    // le minerai (et, dans une grotte de la montagne, les pierres) dans les murs qui bordent le sol.
    // Les réglages de la grotte (FermeHote.reglages : la mine de la ferme, ou une grotte du monde).
    buildCave() {
      const meta = this.cache.json.get('grotte') || { tuiles: {}, objets: [] };
      // (l'entrée : « ferme », la mine de la ferme ; « grotte_<n> », une grotte de la montagne du
      // grand monde ; les graines des niveaux en dépendent)
      const H = hote();
      const J = this.J = GROTTE.jeu(params.get('grotte'));
      const id = J.id;
      // (« galerie » : la petite chambre du fil de la lune, derrière la fissure de la mine de la ferme)
      const niveau = params.get('niveau') === 'galerie' && id === 'ferme' ? 'galerie' : Math.max(1, Math.min(J.NIVEAUX, parseInt(params.get('niveau'), 10) || 1));
      const h = H && H.maintenant ? H.maintenant() : null;
      const jour = h ? h.jour : Math.floor(Date.now() / 864e5);
      const c = H.niveau(J, niveau, jour);
      Object.assign(c, { id, niveau, jour, meta });
      this.cave = c;
      const map = this.make.tilemap({ tileWidth: T, tileHeight: T, width: c.W, height: c.H });
      const set = map.addTilesetImage('grotte_tuiles', K.extrude(this.textures, 'grotte_tuiles', T), T, T, 1, 2);
      ['sol', 'marquage', 'falaise', 'minerais'].forEach((n, i) => { this.layers[n] = map.createBlankLayer(n, set).setDepth(-100 + i); });
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
      // le carnet d'avant (le minerai n'allait pas encore dans l'inventaire) : versé une fois
      if (H && H.verser && rec.carnet && Object.keys(rec.carnet).length) {
        H.verser(rec.carnet);
        rec.carnet = {};
        this.writeCaves(rec);
      }
      this.caveRec = rec;
      c.ores = c.ores.filter((o) => !rec.pris.includes(`${id}:${niveau}:${o.x},${o.y}`));
      // (les champignons lumineux cueillis aujourd'hui aussi : « m » devant leur case)
      c.decor = c.decor.filter((d) => d.kind !== 'champignon' || !rec.pris.includes(`${id}:${niveau}:m${d.x},${d.y}`));
      for (const o of c.ores) this.layers.minerais.putTileAt(t(o.kind), o.x, o.y);
      for (const d of c.decor) this.layers.marquage.putTileAt(t(d.kind), d.x, d.y);
      // les objets : l'échelle, le puits, les stalagmites (on ne passe pas à travers)
      const ob = (n) => Math.max(0, meta.objets.indexOf(n));
      const E = c.echelle, P = c.puits, GA = GROTTE.galerie.cases;
      // (dans la galerie, on revient par la fissure, sur la paroi au-dessus de l'arrivée : pas d'échelle)
      c.images = [c.galerie
        ? this.add.image(E.x * T + 8, E.y * T, 'galerie', GA.fissure).setOrigin(0.5, 1).setDepth(E.y * T - T)
        : this.add.image(E.x * T + 8, E.y * T + 15, 'grotte_objets', ob('echelle')).setOrigin(0.5, 1).setDepth(E.y * T)];
      // la fissure d'un niveau (la nuit qu'il faut) : sur sa paroi, le pied au bas de la case
      const F = c.fissure;
      if (F) c.images.push(this.add.image(F.x * T + 8, (F.y + 1) * T, 'galerie', GA.fissure).setOrigin(0.5, 1).setDepth(F.y * T));
      // la galerie : la couverture, la tasse, les gravures (sur la paroi), la pierre (si elle est là)
      if (c.galerie) {
        const O = c.objets, poseObjet = (k, o, mur) => this.add.image(o.x * T + 8, (o.y + 1) * T + (mur ? 0 : 2), 'galerie', GA[k]).setOrigin(0.5, 1).setDepth(mur ? o.y * T : (o.y + 1) * T);
        c.images.push(poseObjet('couverture', O.couverture), poseObjet('tasse', O.tasse), poseObjet('gravures', O.gravures, true));
        if (!(H && H.pierrePrise && H.pierrePrise())) { this.pierreImg = poseObjet('pierre', O.pierre); c.images.push(this.pierreImg); }
      }
      if (P) c.images.push(this.add.image(P.x * T + 8, P.y * T + 12, 'grotte_objets', ob('trou')).setOrigin(0.5, 0.75).setDepth(P.y * T - 8));
      for (const s of c.stalag) {
        c.images.push(this.add.image(s.x * T + 8, s.y * T + 15, 'grotte_objets', ob('stalagmite_' + s.v)).setOrigin(0.5, 1).setDepth(s.y * T + 15));
        this.layers.marquage.putTileAt(t('sol_0'), s.x, s.y);
      }
      // (au premier niveau, l'échelle remonte à la ferme, devant la porte de la mine ; d'une grotte
      // du monde, dans le monde, devant son entrée)
      const ici = `grotte?grotte=${id}`;
      const pass = (nom, x, y, sens, cible, arrivee) => ({ name: nom, x: x * T, y: y * T, width: T, height: T, cible, sens, arrivee });
      // (la galerie : on remonte par la fissure, vers le niveau d'où l'on vient, devant elle)
      const remonter = c.galerie ? `${ici}&niveau=${c.retour}&arrivee=fissure`
        : niveau > 1 ? `${ici}&niveau=${niveau - 1}&arrivee=bas` : `jeu.html?arrivee=${id === 'ferme' ? 'mine' : id}`;
      c.objects = {
        depart: [{ x: E.x * T + 8, y: (E.y + 1) * T + 12 }],
        arrivees: [{ name: 'haut', x: E.x * T + 8, y: (E.y + 1) * T + 12 }].concat(P ? [{ name: 'bas', x: P.x * T + 8, y: (P.y + 1) * T + 12 }] : [])
          .concat(F ? [{ name: 'fissure', x: F.x * T + 8, y: (F.y + 1) * T + 12 }] : []),
        passages: [pass('remonter', E.x, E.y - 1, 'haut', remonter)]
          .concat(P ? [pass('descendre', P.x, P.y, 'bas', `${ici}&niveau=${niveau + 1}&arrivee=haut`)] : [])
          .concat(F ? [pass('fissure', F.x, F.y, 'haut', `${ici}&niveau=galerie&arrivee=haut`, 'fissure')] : []),
      };
      return map;
    }

    readCaves() {
      let r = null;
      try { r = JSON.parse(global.localStorage.getItem(GROTTE.store) || 'null'); } catch (e) { r = null; }
      return r && Array.isArray(r.pris) ? Object.assign({ carnet: {} }, r) : { jour: null, pris: [], carnet: {} };
    }

    writeCaves(rec) {
      try { global.localStorage.setItem(GROTTE.store, JSON.stringify(rec)); } catch (e) { /* ignoré */ }
    }

    // ---------- les passages, la vue ----------

    // (pied : là où l'on se tient devant lui, l'arrivée du même côté : sous l'échelle, sous le puits)
    makePassages(objs, arrivees) {
      this.passages = objs.map((o) => {
        const x = o.x + o.width / 2, y = o.y + o.height / 2;
        const a = (arrivees || []).find((r) => r.name === (o.arrivee || (o.sens === 'haut' ? 'haut' : 'bas')));
        return { name: o.name, cible: o.cible, sens: o.sens, rect: o, x, y, pied: a ? { x: a.x, y: a.y } : { x, y: y + T } };
      });
      this.passageVise = null;
      this.pousseLibre = false;
    }

    // La distance (px) du personnage au passage q (à son rectangle).
    distPassage(q) {
      const P = this.heroPos, r = q.rect;
      return Math.hypot(Math.max(r.x - P.x, 0, P.x - r.x - r.width), Math.max(r.y - P.y, 0, P.y - r.y - r.height));
    }

    // Le passage sous le point (wx, wy) : son rectangle, à PASS.prise px près (l'échelle monte au-dessus
    // de sa case : le rectangle de l'échelle est la case du haut, son pied est juste dessous), ou null.
    passageAt(wx, wy) {
      const m = PASS.prise;
      return this.passages.find((q) => {
        const r = q.rect, bas = q.sens === 'haut' ? r.height + T : r.height;
        return wx >= r.x - m && wx <= r.x + r.width + m && wy >= r.y - m && wy <= r.y + bas + m;
      }) || null;
    }

    // Un appui sur le passage q : y passer s'il est tout près (ou en god mode), sinon y marcher d'abord.
    versPassage(q) {
      if (this.god() || this.distPassage(q) <= PASS.pres) { this.leave(q); return; }
      this.passageVise = q;
      this.goTo(q.pied.x, q.pied.y);
    }

    // Chaque image : arrivé au passage visé, ou poussé vers un passage tout proche, il y passe.
    stepPassages() {
      const v = this.passageVise;
      if (v && (this.distPassage(v) <= PASS.pousse || !this.path.length)) {
        this.passageVise = null;
        if (this.distPassage(v) <= PASS.pres) { this.leave(v); return; }
      }
      const j = this.manette && this.manette.dir(), k = saisie() ? null : this.keys;
      let dx = 0, dy = 0;
      if (j) { dx = j.x; dy = j.y; } else if (k) {
        dx = (k.RIGHT.isDown || k.D.isDown ? 1 : 0) - (k.LEFT.isDown || k.Q.isDown || k.A.isDown ? 1 : 0);
        dy = (k.DOWN.isDown || k.S.isDown ? 1 : 0) - (k.UP.isDown || k.Z.isDown || k.W.isDown ? 1 : 0);
      }
      const l = Math.hypot(dx, dy);
      if (!l) this.pousseLibre = true;
      if (!l || this.mining || !this.pousseLibre) return;
      const P = this.heroPos;
      for (const q of this.passages) {
        if (this.distPassage(q) > PASS.pousse) continue;
        const ox = q.x - P.x, oy = q.y - P.y, lo = Math.hypot(ox, oy) || 1;
        if ((dx * ox + dy * oy) / (l * lo) > 0.7) { this.leave(q); return; }
      }
    }

    // Le god mode (Options du jeu) : un toucher pose le personnage, un passage s'y prend de loin.
    god() {
      const H = hote();
      return !!(H && H.god && H.god());
    }

    // Le personnage posé d'un coup sur la case libre la plus proche de (x, y).
    teleport(x, y) {
      const gx = Math.floor(x / T), gy = Math.floor(y / T);
      const q = K.plusProche((i, j) => this.canWalk(gx + i, gy + j), 11);
      if (!q) return;
      this.path = [];
      this.heroPos.x = (gx + q.i) * T + T / 2;
      this.heroPos.y = (gy + q.j) * T + T - 2;
      this.hero.setPosition(Math.round(this.heroPos.x), Math.round(this.heroPos.y));
    }

    // Changer de niveau, ou remonter à la ferme.
    leave(q) {
      if (this.leaving) return;
      this.leaving = true;
      if (global.FermeSon) global.FermeSon.joue('echelle');
      this.cameras.main.fadeOut(reduced() ? 0 : 250, 0, 0, 0);
      this.time.delayedCall(reduced() ? 0 : 260, () => { const H = hote(); if (H) H.go(q.cible); });
    }

    // Un zoom entier en pixels de l'écran (CarteJeu.zoomEntier).
    fitZoom() {
      this.cameras.main.setZoom(global.CarteJeu.zoomEntier(this));
    }

    // ---------- la lumière ----------

    // La lumière autour du personnage : les lumières WebGL (makeCaveLights), sinon une image
    // noire percée autour de lui. La Lampe de mineur (arbre des technologies) éclaire plus loin, et
    // le casque à lampe (fiche 11 : FermeHote.lumiere, en %) aussi ; les deux se multiplient.
    makeLight() {
      const H = hote();
      const lampe = H && H.tech ? H.tech('grotte') : null;
      const casque = H && H.lumiere ? H.lumiere() / 100 : 1;
      const f = (lampe && lampe.lumiere ? lampe.lumiere / 100 : 1) * casque;
      const c = this.cave;
      const J = this.J, filon = J.filon && (c.meta.minerais || {})[J.filon];
      if (c.galerie) this.say('🌙 Une petite chambre, derrière la paroi. Quelqu\'un a dormi ici.');
      else this.say(`${J.monde ? '⛰️' : '⛏️'} ${J.nom} — niveau ${c.niveau}${c.niveau >= J.NIVEAUX ? ' (le plus profond)' : ''}${filon && c.niveau === 1 ? ` · un filon : ${filon.nom.toLowerCase()}` : ''}`);
      if (this.makeCaveLights(f)) return;
      const L = { r0: GROTTE.lumiere.r0 * f, r1: GROTTE.lumiere.r1 * f, noir: GROTTE.lumiere.noir }, N = 512, Z = 4;
      const cle = 'lumiere_grotte_' + Math.round(f * 100);   // une texture de N px, agrandie Z fois
      if (!this.textures.exists(cle)) {
        const cv = document.createElement('canvas');
        cv.width = cv.height = N;
        const g = cv.getContext('2d');
        const grad = g.createRadialGradient(N / 2, N / 2, L.r0 / Z, N / 2, N / 2, L.r1 / Z);
        grad.addColorStop(0, 'rgba(6,4,6,0)');
        grad.addColorStop(0.55, `rgba(6,4,6,${L.noir * 0.6})`);
        grad.addColorStop(1, `rgba(6,4,6,${L.noir})`);
        g.fillStyle = grad;
        g.fillRect(0, 0, N, N);
        this.textures.addCanvas(cle, cv);
      }
      // (agrandie : elle couvre l'écran même au plus petit zoom)
      this.light = this.add.image(0, 0, cle).setScale(Z).setDepth(1.9e6);
    }

    // Les lumières du niveau (Phaser 4, WebGL) : la carte dans le noir, la lanterne qui suit le
    // personnage, le jour qui tombe de l'échelle, les champignons et les améthystes (chacun son
    // halo). false : pas d'éclairage possible (Canvas), rien n'est changé.
    makeCaveLights(f) {
      const c = this.cave, L = GROTTE.lueurs, Ph = global.Phaser;
      if (!c || !this.lights || !Ph || this.sys.renderer.type !== Ph.WEBGL) return false;
      this.lights.enable().setAmbientColor(L.ambiance);
      for (const l of Object.values(this.layers)) if (l && l.setLighting) l.setLighting(true);
      for (const o of c.images || []) o.setLighting(true);
      this.hero.setLighting(true);
      this.shadow.setLighting(true);
      const la = L.lanterne;
      this.lanterne = this.lights.addLight(this.heroPos.x, this.heroPos.y - la.haut, GROTTE.lumiere.r1 * f * la.rayon, la.couleur, la.intensite);
      const E = c.echelle, ec = L.echelle;
      // (le récit, lot 10 : dans la galerie, la fissure du retour donne sa lumière froide à la place du jour)
      if (c.galerie) this.lights.addLight(E.x * T + 8, E.y * T - 8, L.fissure.rayon, L.fissure.couleur, L.fissure.intensite);
      else this.lights.addLight(E.x * T + 8, E.y * T + 10, ec.rayon, ec.couleur, ec.intensite);
      if (c.fissure) this.lights.addLight(c.fissure.x * T + 8, c.fissure.y * T + 8, L.fissure.rayon, L.fissure.couleur, L.fissure.intensite);
      if (this.pierreImg) {
        const o = c.objets.pierre;
        this.pierreLueur = this.lights.addLight(o.x * T + 8, o.y * T + 8, L.pierre.rayon, L.pierre.couleur, L.pierre.intensite[1]);
      }
      this.lueurs = c.decor.map((d) => {
        const s = L[d.kind];
        const x = d.x * T + 8, y = d.y * T + 11;
        return {
          kind: d.kind, s, x, y,
          light: this.lights.addLight(x, y, s.rayon, s.couleur, s.intensite[1]),
          halo: this.add.pointlight(x, y, s.couleur, s.halo.rayon, s.halo.intensite, s.halo.attenuation).setDepth(L.haloDepth),
          phase: Math.random() * Math.PI * 2,
          periode: s.periode ? s.periode[0] + Math.random() * (s.periode[1] - s.periode[0]) : 0,
          eclat: s.eclat ? s.eclat[0] + Math.random() * (s.eclat[1] - s.eclat[0]) : 0,
        };
      });
      this.spores = 0;
      if (!this.textures.exists('eclat')) {
        const g = this.make.graphics({ x: 0, y: 0, add: false });
        g.fillStyle(0xffffff, 1).fillRect(2, 0, 1, 5).fillRect(0, 2, 5, 1);
        g.generateTexture('eclat', 5, 5);
        g.destroy();
      }
      return true;
    }

    // À chaque image : la lanterne suit le personnage ; les champignons pulsent, les améthystes
    // s'avivent près de lui ; les spores et les étincelles, dans la vue seulement.
    stepCaveLights(time, dt) {
      if (!this.lueurs) return;
      // (la pierre de la galerie respire, lentement)
      if (this.pierreLueur) {
        const p = GROTTE.lueurs.pierre, k = reduced() ? 0.5 : 0.5 + 0.5 * Math.sin((time / 1000) * (Math.PI * 2) / p.periode);
        this.pierreLueur.setIntensity(p.intensite[0] + (p.intensite[1] - p.intensite[0]) * k);
      }
      const P = this.heroPos, L = GROTTE.lueurs;
      this.lanterne.setPosition(P.x, P.y - L.lanterne.haut);
      const calme = reduced(), t = time / 1000;
      const vue = this.cameras.main.worldView;
      const voit = (q) => q.x > vue.x - T && q.x < vue.right + T && q.y > vue.y - T && q.y < vue.bottom + T;
      const champignons = [];
      for (const q of this.lueurs) {
        const [bas, haut] = q.s.intensite;
        let k;
        if (q.kind === 'champignon') {
          k = calme ? 0.5 : 0.5 + 0.5 * Math.sin(q.phase + (t * Math.PI * 2) / q.periode);
          if (!calme && voit(q)) champignons.push(q);
        } else {
          k = clamp01(1 - Math.hypot(q.x - P.x, q.y - P.y) / q.s.portee);
          if (!calme && voit(q) && (q.eclat -= dt) <= 0) {
            q.eclat = q.s.eclat[0] + Math.random() * (q.s.eclat[1] - q.s.eclat[0]);
            this.etincelle(q);
          }
        }
        q.light.setIntensity(bas + (haut - bas) * k);
      }
      if (champignons.length && (this.spores += dt * L.champignon.spores) >= 1) {
        this.spores -= 1;
        this.spore(champignons[Math.floor(Math.random() * champignons.length)]);
      }
    }

    // Une spore monte d'un champignon en dérivant un peu, puis s'éteint.
    spore(q) {
      const S = GROTTE.lueurs.champignon;
      const r = this.add.rectangle(Math.round(q.x + (Math.random() - 0.5) * 8), q.y - 3, 1, 1, S.spore)
        .setBlendMode(global.Phaser.BlendModes.ADD).setDepth(q.y + 2);
      this.tweens.add({
        targets: r, y: r.y - 10 - Math.random() * 8, x: r.x + (Math.random() - 0.5) * 8, alpha: { from: 0.95, to: 0 },
        duration: 2000 + Math.random() * 1200, ease: 'Sine.easeOut', onComplete: () => r.destroy(),
      });
    }

    // Une étincelle sur une améthyste : une petite croix qui grandit puis s'efface.
    etincelle(q) {
      const e = this.add.image(Math.round(q.x - 4 + Math.random() * 8), Math.round(q.y - 6 - Math.random() * 4), 'eclat')
        .setTint(GROTTE.lueurs.cristal.etincelle).setBlendMode(global.Phaser.BlendModes.ADD).setDepth(q.y + 2).setScale(0.4).setAlpha(0);
      this.tweens.add({ targets: e, scale: 1, alpha: 1, duration: 220, yoyo: true, ease: 'Sine.easeOut', onComplete: () => e.destroy() });
    }

    // ---------- le minerai, les champignons ----------

    tapOre(w) {
      const c = this.cave;
      const gx = Math.floor(w.x / T), gy = Math.floor(w.y / T);
      const o = c.ores.find((q) => q.x === gx && q.y === gy);
      if (!o) return false;
      // la pioche en main, comme pour les rochers de la ferme
      const H = hote();
      if (H && H.enMain && H.enMain() !== 'pioche') return false;
      // la case de sol voisine la plus proche du personnage
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

    // Un champignon lumineux (le décor qui luit au sol) : le personnage y va et le cueille
    // (stepChampignon), sans outil ; il va dans l'inventaire (FermeHote.ramasser) et ne repousse
    // que le lendemain. Avec un champignon, une lanterne scintillante à l'Atelier.
    tapChampignon(w) {
      const c = this.cave;
      const gx = Math.floor(w.x / T), gy = Math.floor(w.y / T);
      const d = c.decor.find((q) => q.kind === 'champignon' && q.x === gx && q.y === gy);
      if (!d) return false;
      this.champi = d;
      const x = d.x * T + 8, y = d.y * T + 13, P = this.heroPos;
      if (Math.hypot(x - P.x, y - P.y) > GROTTE.cueille) this.goTo(x, y);
      return true;
    }

    // La pierre de la galerie (le récit, lot 10) : le personnage y va et la prend (stepPierre) ; elle va dans
    // l'inventaire (FermeHote.pierre), une fois.
    tapPierre(w) {
      const c = this.cave;
      if (!c.galerie || !this.pierreImg) return false;
      const o = c.objets.pierre;
      if (Math.floor(w.x / T) !== o.x || Math.abs(Math.floor(w.y / T) - o.y) > 1) return false;
      this.versPierre = true;
      const P = this.heroPos, x = o.x * T + 8, y = o.y * T + 13;
      if (Math.hypot(x - P.x, y - P.y) > GROTTE.galerie.prend) this.goTo(x - T, y);
      return true;
    }

    stepPierre() {
      if (!this.versPierre || this.path.length || !this.pierreImg) return;
      this.versPierre = false;
      const o = this.cave.objets.pierre, P = this.heroPos;
      if (Math.hypot(o.x * T + 8 - P.x, o.y * T + 13 - P.y) > GROTTE.galerie.prend + T) return;
      const H = hote(), r = H && H.pierre ? H.pierre() : null;
      if (!r || !r.ok) return;
      this.pierreImg.destroy();
      this.pierreImg = null;
      if (this.pierreLueur) { this.lights.removeLight(this.pierreLueur); this.pierreLueur = null; }
      this.popGain({ [r.item]: 1 });
    }

    stepChampignon() {
      const d = this.champi;
      if (!d || this.path.length) return;
      this.champi = null;
      const P = this.heroPos;
      if (Math.hypot(d.x * T + 8 - P.x, d.y * T + 13 - P.y) > GROTTE.cueille) return;
      const c = this.cave, H = hote();
      const r = H && H.ramasser ? H.ramasser('champignon_lumineux') : null;
      if (r && !r.ok) return;
      c.decor.splice(c.decor.indexOf(d), 1);
      this.layers.marquage.removeTileAt(d.x, d.y);
      // sa lumière s'éteint
      const q = (this.lueurs || []).find((l) => l.kind === 'champignon' && l.x === d.x * T + 8 && l.y === d.y * T + 11);
      if (q) {
        this.lights.removeLight(q.light);
        q.halo.destroy();
        this.lueurs.splice(this.lueurs.indexOf(q), 1);
      }
      this.caveRec.pris.push(`${c.id}:${c.niveau}:m${d.x},${d.y}`);
      this.writeCaves(this.caveRec);
      if (r) this.popGain({ [r.item]: r.n });
      else this.say('🍄 Un champignon lumineux ! (il luit encore dans ta main)');
    }

    // Arrivé près du minerai : un coup de pioche (pioche_cote), des éclats ; au dernier des coups
    // qu'il demande (GROTTE.COUPS, moins avec l'Arbre), il est pris.
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
      const J = this.J;
      g.frame = 'pioche_cote_' + Math.min(3, Math.floor(g.t / J.COUP * 4));
      if (g.t >= J.COUP) {
        this.chips(m.ore);
        m.ore.coups = (m.ore.coups || 0) + 1;
        const H = hote();
        const coups = H && H.coups ? H.coups(J.COUPS) : J.COUPS;
        if (m.ore.coups >= coups) this.takeOre(m.ore);
        else { this.mine = null; this.mining = null; }
      }
    }

    chips(o) {
      K.secousse(this, 'coup');
      K.vibre('pioche');
      if (global.FermeSon) global.FermeSon.joue(o.kind ? 'pioche_minerai' : 'pioche', { x: o.x * T + 8, y: o.y * T + 10, depuis: 0.14, ecart: 0 });
      if (reduced()) return;
      const col = { fer: 0xd2a88a, cuivre: 0xd67e46, or: 0xf0c846, platine: 0xe6eef8, quartz: 0xdceaf6, amethyste: 0xa86cd8 }[o.kind] || 0x9a9088;
      for (let i = 0; i < 4; i++) {
        const r = this.add.rectangle(o.x * T + 8, o.y * T + 10, 2, 2, i % 2 ? col : 0x7a7068).setDepth(2e6);
        this.tweens.add({ targets: r, x: r.x + (Math.random() - 0.5) * 22, y: r.y + 6 + Math.random() * 10, alpha: 0, duration: 380, onComplete: () => r.destroy() });
      }
    }

    takeOre(o) {
      const c = this.cave;
      this.mine = null;
      this.mining = null;
      // dans le jeu : le minerai va dans l'inventaire (sans énergie, il reste dans le mur)
      const H = hote();
      const r = H && H.miner ? H.miner(o.kind) : null;
      if (r && !r.ok) return;
      c.ores.splice(c.ores.indexOf(o), 1);
      this.layers.minerais.removeTileAt(o.x, o.y);
      const rec = this.caveRec;
      rec.pris.push(`${c.id}:${c.niveau}:${o.x},${o.y}`);
      if (!r) rec.carnet[o.kind] = (rec.carnet[o.kind] || 0) + 1;      // (sans partie : le carnet)
      this.writeCaves(rec);
      const nom = ((c.meta.minerais || {})[o.kind] || {}).nom || o.kind;
      if (r) this.popGain({ [r.item]: r.n });
      else this.say(`⛏️ ${nom} ! (dans le carnet : ${rec.carnet[o.kind]})`);
    }

    // ---------- les messages ----------

    say(texte) {
      const H = hote();
      if (H && H.say) H.say(texte);
    }

    // Ce que le personnage prend ({ objet: qté }) : la bulle « +1 » au-dessus de lui
    // (CarteKit.bulleGain, la même qu'à la ferme), dans une couche posée sur la carte.
    popGain(items) {
      if (global.FermeSon) global.FermeSon.prise(items, { ecart: 0.08 });   // minerai, champignon (js/son.js)
      if (!this.gain) {
        const zone = this.game.canvas && this.game.canvas.parentNode;
        if (!zone) return;
        const couche = document.createElement('div');
        couche.className = 'stage-labels';
        zone.appendChild(couche);
        const H = hote();
        this.gain = K.bulleGain(couche, (id) => { const o = H && H.objet ? H.objet(id) : null; return o ? o.icone : id; });
        this.events.once('destroy', () => { couche.remove(); this.gain = null; });
      }
      this.gain.montre(items);
      this.placeGain();
    }

    // Chaque image : la bulle suit le personnage (px CSS dans la couche : CarteKit.ratio).
    placeGain() {
      if (!this.gain || !this.gain.visible()) return;
      const cam = this.cameras.main, k = cam.zoom / K.ratio(), P = this.heroPos;
      this.gain.place((P.x - cam.worldView.x) * k, (P.y - HERO.bulle - cam.worldView.y) * k);
    }

    // ---------- la marche ----------

    canWalk(tx, ty) {
      return !!(this.walk[ty] && this.walk[ty][tx]);
    }

    // Le chemin le plus court (en tuiles, 8 directions sans couper un coin) jusqu'à la tuile
    // marchable la plus proche du point visé (CarteKit.chemin, CarteKit.plusProche).
    goTo(x, y) {
      const W = this.map.width, H = this.map.height;
      let gx = Math.floor(x / T), gy = Math.floor(y / T);
      if (!this.canWalk(gx, gy)) {
        const q = K.plusProche((i, j) => this.canWalk(gx + i, gy + j), 7, { de: 1 });
        if (!q) return;
        gx += q.i; gy += q.j; x = gx * T + T / 2; y = gy * T + T - 2;
      }
      const sx = Math.floor(this.heroPos.x / T), sy = Math.floor(this.heroPos.y / T);
      const cells = K.chemin({ cols: W, rows: H, libre: (i) => this.canWalk(i % W, (i / W) | 0) }, sy * W + sx, gy * W + gx, { diag: 1 });
      if (!cells) return;
      const steps = cells.map((c) => ({ x: (c % W) * T + T / 2, y: Math.floor(c / W) * T + T - 2 }));
      if (steps.length) steps[steps.length - 1] = { x: Math.round(x), y: Math.round(y) };
      this.path = steps;
    }

    update(time, delta) {
      const dt = Math.min(delta, 100) / 1000;
      this.stepPassages();
      this.stepMine(dt);
      this.stepChampignon();
      this.stepPierre();
      this.stepCaveLights(time, dt);
      const P = this.heroPos;
      const x0 = P.x, y0 = P.y;
      let vx = 0, vy = 0;
      const vit = HERO.speed;
      const k = saisie() ? null : this.keys;
      const j = this.manette.dir();
      if (j) { vx = j.x; vy = j.y; }
      else if (k) {
        vx = (k.RIGHT.isDown || k.D.isDown ? 1 : 0) - (k.LEFT.isDown || k.Q.isDown || k.A.isDown ? 1 : 0);
        vy = (k.DOWN.isDown || k.S.isDown ? 1 : 0) - (k.UP.isDown || k.Z.isDown || k.W.isDown ? 1 : 0);
      }
      if (this.mining) { vx = 0; vy = 0; }
      if (vx || vy) {
        this.path = [];
        const l = Math.hypot(vx, vy), st = vit * dt;
        const nx = P.x + (vx / l) * st, ny = P.y + (vy / l) * st;
        // glisse le long d'un bord : chaque axe séparément
        if (this.canWalk(Math.floor(nx / T), Math.floor(P.y / T))) P.x = nx;
        if (this.canWalk(Math.floor(P.x / T), Math.floor(ny / T))) P.y = ny;
      } else if (this.path.length) {
        const to = this.path[0];
        const dx = to.x - P.x, dy = to.y - P.y, l = Math.hypot(dx, dy), st = vit * dt;
        if (l <= st) { P.x = to.x; P.y = to.y; this.path.shift(); } else { P.x += (dx / l) * st; P.y += (dy / l) * st; }
        vx = dx; vy = dy;
      }
      const H = this.hero;
      const moved = Math.hypot(P.x - x0, P.y - y0);
      if (this.mining) H.setFrame(this.frame(this.mining.frame));
      else if (moved > 0) {
        // (le regard lissé, CarteKit.allure ; l'image du pas d'après les px parcourus depuis le
        // départ, CarteKit.imageMarche : il part par un passage)
        if (!this.allure) this.allure = K.allure();
        const r = this.allure.pas(vx, vy, moved, { face: this.face, flip: H.flipX });
        this.face = r.face; H.setFlipX(r.flip);
        this.walked += moved;
        const k = K.imageMarche(this.walked, 'grotte');
        H.setFrame(this.frame.de('marche', this.face, k));
        // un pas sur la roche aux images 0 et 2 (js/son.js)
        if (k !== this.pasVu && (k === 0 || k === 2) && global.FermeSon) global.FermeSon.pas(P.x, P.y, null, 0);
        this.pasVu = k;
      } else {
        H.setFrame(this.frame.de('idle', this.face, Math.floor(time / 600) % 2));   // debout : il respire
        this.walked = 0;
      }
      H.setPosition(Math.round(P.x), Math.round(P.y)).setDepth(P.y);
      this.shadow.setPosition(Math.round(P.x), Math.round(P.y)).setDepth(P.y - 0.5);
      this.placeGain();
      if (this.light) this.light.setPosition(Math.round(P.x), Math.round(P.y - 12));
    }
  }

  // Une visite à la fois, scène du jeu de toutes les cartes (js/carte/jeu.js) : start la montre
  // dans `parent` (search : « ?niveau=…&arrivee=… »), une scène neuve à chaque fois (les images
  // déjà chargées restent) ; stop l'enlève. Sans Phaser : false.
  function start(parent, search) {
    if (!global.CarteJeu) return false;
    global.Grotte.scene = null;
    return !!global.CarteJeu.montre(parent, 'grotte', { cree: () => new GrotteScene(), data: { search }, neuve: true });
  }
  function stop() {
    if (global.CarteJeu && global.CarteJeu.affichee() === 'grotte') global.CarteJeu.cache('grotte');
    global.Grotte.scene = null;
  }
  global.Grotte = { start, stop, scene: null };
})(window);
