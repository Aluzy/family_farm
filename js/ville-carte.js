/*
 * La ville (jeu.html?carte=ville), où l'on va depuis la fenêtre de la ville (« Se promener en
 * ville », tout en bas) : ses rues, son parc et ses fontaines, et le personnage qui s'y promène.
 * La même scène montre la carte de transition entre la ferme et la ville (?carte=transition),
 * la montagne et la plage (où mène le train) et les grottes de la montagne ; ?arrivee= choisit
 * le point d'arrivée.
 *
 * La carte : assets/ville.json (scripts/ville/carte.py, puis scripts/build-map.mjs) ; ses
 * couches de tuiles (le sol, puis une couche par matière, de bas en haut) et son point
 * « depart ». Le personnage : celui de la partie (CarteKit.planchePerso), le même que sur la
 * carte de la ferme.
 *
 * Il marche sur le sol (chaussée, trottoirs, herbe, pavés), pas à travers un bâtiment, une
 * fontaine, une voiture, une palissade ou un banc : un double appui (ou un double clic) l'envoie
 * au plus court jusque-là (CarteKit.chemin), le doigt glissé (CarteKit.manette), les flèches ou ZQSD le dirigent aussi. Sous un arbre, le
 * feuillage s'efface un peu pour le laisser voir. Avec « animations réduites », l'eau reste
 * immobile. Aux passages (couche « passages »), une flèche bleue paraît quand on s'en
 * approche : un toucher dessus mène à l'autre carte (ou à la ferme, jeu.html).
 *
 * Le jour et la nuit passent sur la ville, la transition, la montagne et la plage
 * (CarteKit.voile, à l'heure du jeu : HorlogeSortie, donnée par js/ui/excursion.js).
 *
 * Les grottes (?carte=grotte&grotte=<entrée>&niveau=<n>) ne sont pas des cartes Tiled : chaque
 * niveau est tiré au hasard (le même toute la journée : la graine est l'entrée, le niveau et le
 * jour) par un automate cellulaire, avec les morceaux de scripts/ville/grotte.py. On descend par
 * le puits, on remonte par l'échelle (des passages, comme au bord des cartes). Le minerai est
 * pris dans les murs qui touchent le sol, de plus en plus rare et précieux en profondeur (fer,
 * cuivre, or, platine : GROTTE.poids, data/ville.json) ; on le pioche en le touchant : il va dans l'inventaire
 * (FermeHote.miner ; au Four, 4 minerais et du bois font un lingot, pour l'arbre des
 * technologies). Il fait noir : on n'y voit qu'autour de soi.
 *
 * Ces cartes s'affichent dans la page du jeu (jeu.html), à la place de la carte de la ferme :
 * la carte du joueur, la date et l'argent, le menu et la barre d'outils restent là, le temps
 * passe comme à la ferme, et c'est le personnage principal de la partie qui s'y promène.
 * js/ui/excursion.js les ouvre (VilleCarte.start) et passe de l'une à l'autre (FermeHote.go).
 *
 * Ce fichier : la scène (création, boucle d'image, marche, chemins, passages, grottes). Ses
 * autres méthodes sont dans js/carte/ville/ (la circulation, le bus de l'école, le train, le bus
 * de ligne, les trouvailles, les animaux, la nature, la pêche, les voisins, les messages et la
 * gare, le marché), ses réglages dans js/carte/ville/config.js (CarteVille), les réglages
 * communs à toutes les cartes dans js/carte/ (CarteKit). Voir docs/architecture-phaser.md.
 */
(function () {
  'use strict';

  const K = window.CarteKit;
  const V = window.CarteVille;
  const etat = V.etat;
  const { T, CARTES, JOUR_NUIT, PASS, HERO, OBSTACLES, PASSABLES, BATI, DEVANT, FEUILLAGE_ALPHA, VOL, CARS, BUS, TRAIN, NAVETTE, FINDS, FAUNE, GROTTE, NATURE, BLOCS, IMMEUBLE, RAMASSABLES, TRANSITION_VIE } = V.C;
  const { hote, sheetKey, saisie, reduced, v } = V;
  // Le pas de la flèche d'un passage, selon son sens (elle se balance dans ce sens).
  const SENS_PAS = { droite: [1, 0], gauche: [-1, 0], haut: [0, -1], bas: [0, 1] };
  // La n-ième boîte d'un personnage autour duquel les bâtiments s'effacent (voir uncover),
  // l'objet de l'image d'avant réécrit.
  function boite(boxes, n, x, y, w, h, foot, see) {
    const b = boxes[n] || (boxes[n] = {});
    b.x = x; b.y = y; b.w = w; b.h = h; b.foot = foot; b.see = see;
  }

  class VilleScene extends Phaser.Scene {
    constructor() { super('ville'); }

    // Une instance par carte affichée (js/carte/jeu.js) : ses paramètres (« ?carte=…&arrivee=… »)
    // fixent la carte avant son chargement.
    init(data) {
      V.configure(data && data.search);
    }

    preload() {
      if (!etat.map.file) {
        this.load.image('grotte_tuiles', v(GROTTE.tiles));
        this.load.spritesheet('grotte_objets', v(GROTTE.objets), { frameWidth: 32, frameHeight: 32 });
        this.load.json('grotte', v(GROTTE.meta));
      } else this.load.tilemapTiledJSON(etat.map.key, v(etat.map.file));
      // (la planche du personnage par son fichier : les textures restent d'une carte et d'une
      // partie à l'autre, et le personnage de la partie peut changer)
      const sheet = K.planchePerso();
      this.heroKey = HERO.key + ':' + sheet.file;
      this.load.spritesheet(this.heroKey, v(sheet.file), { frameWidth: HERO.w, frameHeight: HERO.h });
      // son triporteur (js/carte/triporteur.js)
      if (!this.textures.exists(K.TRIPORTEUR.key)) this.load.spritesheet(K.TRIPORTEUR.key, v('assets/' + K.TRIPORTEUR.file), { frameWidth: K.TRIPORTEUR.w, frameHeight: K.TRIPORTEUR.h });
      this.load.json(this.heroKey + '_noms', v(sheet.names));
      this.load.spritesheet(CARS.key, v(CARS.file), { frameWidth: 64, frameHeight: 64 });
      this.load.json(CARS.key + '_meta', v(CARS.meta));
      this.load.spritesheet(PASS.key, v(PASS.file), { frameWidth: K.FLECHE.size, frameHeight: K.FLECHE.size });
      this.load.spritesheet(BUS.key, v(BUS.file), { frameWidth: 112, frameHeight: 112 });
      this.load.json(BUS.key + '_meta', v(BUS.meta));
      this.load.json('perso_cases', v(BUS.kid.cases));
      const abri = NAVETTE.arrets[etat.nom] && NAVETTE.arrets[etat.nom].abri;
      if (abri) this.load.image('abri_profil', v(abri.image));
      if (TRAIN.gares[etat.nom]) {
        this.load.spritesheet(TRAIN.key, v(TRAIN.file), { frameWidth: TRAIN.w, frameHeight: TRAIN.h });
        this.load.json(TRAIN.key + '_meta', v(TRAIN.meta));
      }
      if (FAUNE.cartes[etat.nom]) {
        this.load.json('faune', v(FAUNE.meta));
        this.load.spritesheet(FINDS.key, v(FINDS.file), { frameWidth: 16, frameHeight: 16 });
        for (const e of FAUNE.cartes[etat.nom]) {
          const z = FAUNE.especes[e].size;
          this.load.spritesheet('faune_' + e, v('assets/faune_' + e + '.png'), { frameWidth: z, frameHeight: z });
        }
      }
      // les enfants de la partie (pour la scène du bus)
      const h = window.HorlogeSortie ? window.HorlogeSortie.maintenant() : null;
      const planches = new Map();     // clé de la planche → son fichier
      const planche = (perso, enfant) => planches.set(sheetKey(perso, enfant), 'assets/' + K.planche(perso, enfant));
      for (const e of (h && h.enfants) || []) planche(e.perso, true);
      // la transition : son plan de la partie (js/carte/ville/transition.js), les blocs des
      // maisons, les ressources, les familles des maisons
      this.transition = etat.nom === 'transition' ? V.planTransition() : null;
      if (this.transition) {
        this.load.spritesheet(BLOCS.key, v(BLOCS.file), { frameWidth: BLOCS.w, frameHeight: BLOCS.h });
        this.load.spritesheet(BLOCS.hauts.key, v(BLOCS.hauts.file), { frameWidth: BLOCS.hauts.w, frameHeight: BLOCS.hauts.h });
        this.load.spritesheet(RAMASSABLES.key, v(RAMASSABLES.file), { frameWidth: RAMASSABLES.w, frameHeight: RAMASSABLES.h });
        // les champs des agriculteurs (js/carte/ville/metiers.js)
        const C = TRANSITION_VIE.champ;
        this.load.spritesheet(C.terre, v(C.terreFile), { frameWidth: 16, frameHeight: 16 });
        if (!this.textures.exists(C.crops)) this.load.image(C.crops, v(C.cropsFile));
        // les grands meubles des maisons agrandies (ceux de la maison de la ferme)
        for (const n of TRANSITION_VIE.meubles) if (!this.textures.exists('meuble_' + n)) this.load.image('meuble_' + n, v('assets/meuble_' + n + '.png'));
        for (const m of this.transition.plan.maisons) for (const mb of V.voisins(m.nom, m.lits).membres) planche(mb.perso, mb.enfant);
        // le livreur, son triporteur électrique, les caisses de collecte (js/carte/ville/livreur.js)
        for (const mb of V.voisins('livreur', 1).membres) planche(mb.perso, false);
        const Lv = TRANSITION_VIE.livreur;
        if (!this.textures.exists(Lv.tri)) this.load.spritesheet(Lv.tri, v(Lv.triFile), { frameWidth: K.TRIPORTEUR.w, frameHeight: K.TRIPORTEUR.h });
        if (!this.textures.exists(Lv.caisse)) this.load.spritesheet(Lv.caisse, v(Lv.caisseFile), { frameWidth: 16, frameHeight: 16 });
      }
      // l'immeuble en blocs de la ville (un essai, js/carte/ville/immeuble.js) : les blocs, sa
      // façade, ses meubles
      if (etat.nom === IMMEUBLE.carte) {
        if (!this.textures.exists(BLOCS.key)) this.load.spritesheet(BLOCS.key, v(BLOCS.file), { frameWidth: BLOCS.w, frameHeight: BLOCS.h });
        const Fa = IMMEUBLE.facade;
        if (!this.textures.exists(Fa.key)) this.load.spritesheet(Fa.key, v(Fa.file), { frameWidth: Fa.w, frameHeight: Fa.h });
        for (const n of IMMEUBLE.meubles) if (!this.textures.exists('meuble_' + n)) this.load.image('meuble_' + n, v('assets/meuble_' + n + '.png'));
      }
      for (const [k, file] of planches) this.load.spritesheet(k, v(file), { frameWidth: 16, frameHeight: 32 });
      // les planches des jeux de tuiles : lues dans la carte une fois chargée (tout de suite si
      // elle l'est déjà : une carte revue ne redemande rien)
      if (!etat.map.file) return;
      if (this.cache.tilemap.exists(etat.map.key)) this.loadMapAssets(this.cache.tilemap.get(etat.map.key).data);
      else this.load.once('filecomplete-tilemapJSON-' + etat.map.key, () => this.loadMapAssets(this.cache.tilemap.get(etat.map.key).data));
    }

    // Ce que la carte Tiled demande : ses planches de tuiles, ses arbres, ses rochers, son herbe
    // haute (le chargeur saute ce que le jeu a déjà).
    loadMapAssets(data) {
      // la transition : l'ouest de la carte de la partie, refait à chaque visite d'après la carte
      // de Tiled telle qu'elle a été chargée (gardée à part)
      if (this.transition) {
        const entry = this.cache.tilemap.get(etat.map.key);
        if (!V.transitionBase) V.transitionBase = JSON.parse(JSON.stringify(data));
        data = V.transitionCarte(V.transitionBase, this.transition.plan);
        if (entry) entry.data = data;
      }
      for (const set of data.tilesets) this.load.image(set.name, v('assets/' + set.image));
      // les arbres, les rochers, l'herbe haute (comme à la ferme)
      const has = (n) => data.layers.some((l) => l.type === 'objectgroup' && l.name === n && (l.objects || []).length);
      if (has('arbres')) {
        for (const d of Object.values(NATURE.arbres)) this.load.spritesheet(d.key, v(d.file), { frameWidth: d.w, frameHeight: d.h });
        this.load.image(K.NATURE.ombre.key, v('assets/' + K.NATURE.ombre.file));
      }
      const roches = data.layers.find((l) => l.type === 'objectgroup' && l.name === 'rochers');
      const rp = (n) => (((roches && roches.properties) || []).find((q) => q.name === n) || {}).value;
      // (une planche de rochers par carte : sa clé porte son fichier)
      this.rochersKey = null;
      if (has('rochers') && rp('planche')) {
        this.rochersKey = NATURE.rochers.key + ':' + rp('planche');
        this.load.spritesheet(this.rochersKey, v('assets/' + rp('planche')), { frameWidth: rp('largeur'), frameHeight: rp('hauteur') });
      }
      if (has('herbe_haute')) this.load.spritesheet(K.NATURE.herbe.key, v('assets/' + K.NATURE.herbe.file), K.NATURE.herbe.frame);
      // (la ville : sans le bâtiment que l'immeuble en blocs remplace)
      if (etat.nom === IMMEUBLE.carte) V.immeubleCarte(data);
      // l'exemplaire du dessus de chaque couche de bâtiment
      for (const name of BATI) {
        const l = data.layers.find((x) => x.name === name);
        if (l && !data.layers.some((x) => x.name === name + '_devant')) data.layers.push({ ...l, name: name + '_devant', data: l.data.slice() });
      }
    }

    create() {
      // insertNull : une case vide reste vide (sans objet Tile) ; la grande ville en compte
      // des centaines de milliers dans ses couches clairsemées
      let map;
      this.layers = {};
      if (etat.map.file) {
        map = this.make.tilemap({ key: etat.map.key, insertNull: true });
        const sets = map.tilesets.map((s) => map.addTilesetImage(s.name, K.extrude(this.textures, s.name, s.tileWidth), s.tileWidth, s.tileHeight, 1, 2));
        map.layers.forEach((l, i) => {
          // une couche qui a un « pied » (l'abri de bus, les réverbères) se range comme les personnages
          const pied = ((Array.isArray(l.properties) ? l.properties : []).find((q) => q.name === 'pied') || {}).value;
          const depth = Number.isFinite(pied) ? pied : l.name === DEVANT ? 1e6 : l.name.endsWith('_devant') ? 5e5 + i : -100 + i;
          this.layers[l.name] = map.createLayer(l.name, sets, 0, 0).setDepth(depth);
        });
      } else map = this.buildCave();
      this.map = map;
      this.makeTileAnims();

      // où l'on marche : là où il y a du sol et rien de ce qu'on ne traverse pas (les maisons
      // des voisins de la transition : voir poseMaison)
      this.walk = [];
      for (let y = 0; y < map.height && this.layers.sol; y++) {
        const row = [];
        for (let x = 0; x < map.width; x++) {
          row.push(!!this.layers.sol.getTileAt(x, y) && (PASSABLES.some((n) => this.layers[n] && this.layers[n].getTileAt(x, y))
            || !OBSTACLES.some((n) => this.layers[n] && this.layers[n].getTileAt(x, y))));
        }
        this.walk.push(row);
      }
      // les bâtiments et les voitures garées : les tuiles dont le centre est sous leur emprise
      const objects = (name) => (this.cave && this.cave.objects[name]) || ((map.getObjectLayer(name) || {}).objects) || [];
      this.makeBuildings(objects('batiments'));
      for (const r of [...objects('garees'), ...objects('batiments'), ...objects('obstacles')]) {
        for (let y = Math.floor(r.y / T); y <= Math.floor((r.y + r.height) / T); y++) {
          for (let x = Math.floor(r.x / T); x <= Math.floor((r.x + r.width) / T); x++) {
            const cx = x * T + T / 2, cy = y * T + T / 2;
            if (this.walk[y] && cx >= r.x && cx <= r.x + r.width && cy >= r.y && cy <= r.y + r.height) this.walk[y][x] = false;
          }
        }
      }

      this.makeNature(objects);
      this.makeVoisinsDehors();
      this.makeImmeuble();

      // la fermière : ses images par nom (marche_bas_0…, idle_cote_0…)
      const noms = (this.cache.json.get(this.heroKey + '_noms') || {}).frames || [];
      this.frame = K.cases(noms);
      const arrivee = etat.params.get('arrivee');
      const d = (arrivee && objects('arrivees').find((o) => o.name === arrivee)) || objects('depart')[0] || { x: map.widthInPixels / 2, y: map.heightInPixels / 2 };
      this.hero = this.add.sprite(Math.round(d.x), Math.round(d.y), this.heroKey, this.frame('idle_bas_0')).setOrigin(0.5, HERO.foot / HERO.h);
      this.selle = K.triporteur(this);
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
      if (!this.cave) cam.setBackgroundColor('#665951');      // (la grotte a son noir : buildCave)
      cam.setBounds(0, 0, map.widthInPixels, map.heightInPixels);
      cam.startFollow(this.hero, true, 0.12, 0.12);
      cam.setRoundPixels(true);
      this.fitZoom();
      window.CarteJeu.suitTaille(this, () => this.fitZoom());

      this.makePassages(objects('passages'));
      // l'heure du jeu (HorlogeSortie : js/ui/excursion.js), et sa lumière (CarteKit.voile) sur
      // les cartes où le jour et la nuit passent : au-dessus de la carte, des personnages et du
      // feuillage, sous ce qui vole, les flèches et les petits textes
      this.voile = JOUR_NUIT.includes(etat.nom) ? K.voile(this, map.widthInPixels, map.heightInPixels, VOL - 1) : null;
      // la nuit, les réverbères (couche « lumieres ») et les phares (js/carte/ville/eclairage.js)
      this.makeLighting(objects('lumieres'));
      // les ombres portées, qui suivent le soleil (js/carte/ville/ombres.js)
      this.makeShadows();
      this.clockAt = -1e9;
      this.stepClock(0);
      if (this.voile) this.voile.set(this.heure ? this.heure.heure : null, true);
      this.makeHud();
      // un toucher : sur une flèche, changer de carte ; sur la gare, la fenêtre des départs ;
      // sur une trouvaille, la ramasser ; sur un animal ou une grotte, ce qu'on en voit ;
      // ailleurs, un double appui : y aller (CarteKit.APPUI : moins de `glisse` px CSS entre
      // l'appui et le relâchement ; le canvas est à la densité de l'écran)
      const slop = K.APPUI.glisse * K.ratio();
      this.dbl = K.doubleAppui();
      this.input.on('pointerup', (p) => {
        if (p.getDistance() > slop || this.locked || this.dialog || this.mining) return;
        const w = cam.getWorldPoint(p.x, p.y);
        this.work = null;
        if (this.peche && !this.peche.phase) this.peche = null;
        const a = this.passages.find((q) => q.arrow.visible && Math.abs(w.x - q.arrow.x) <= 18 && Math.abs(w.y - q.arrow.y) <= 18);
        if (a) { this.leave(a); return; }
        if (this.tapFind(w) || this.tapRessource(w) || this.tapAnimal(w) || this.tapGare(w) || this.tapAbri(w) || this.tapOre(w) || this.tapChampignon(w) || this.tapLieu(w) || this.tapNature(w) || this.tapWater(w) || this.tapVoisinDehors(w) || this.tapLivreur(w)) { this.dbl.oublie(); return; }
        if (this.god()) { this.teleport(w.x, w.y); return; }
        // ailleurs, un double appui (comme à la ferme) : elle y va
        // (un essai de marche : la marche au doigt s'explique, une fois)
        K.astuceMarche(p);
        // (à un étage de l'immeuble : le point touché, ramené au sol de ce niveau)
        if (this.dbl.appui(w.x, w.y, cam.zoom)) this.goTo(w.x, w.y + this.liftVille());
      });
      // le doigt posé puis glissé : elle marche dans sa direction tant qu'il reste posé
      // (CarteKit.manette ; pas dans le god mode, ni pendant un voyage, une fenêtre, un geste)
      this.manette = K.manette(this, () => !this.god() && !this.locked && !this.dialog && !this.mining && !this.fishing);
      // le god mode : glisser déplace la vue (la caméra ne suit plus le personnage)
      this.input.on('pointermove', (p) => {
        if (!p.isDown || !this.god() || this.locked || this.dialog || p.getDistance() < slop) return;
        if (this.followOn !== false) { cam.stopFollow(); this.followOn = false; }
        cam.scrollX -= (p.x - p.prevPosition.x) / cam.zoom;
        cam.scrollY -= (p.y - p.prevPosition.y) / cam.zoom;
      });
      // les trajets du bus de l'école roulent avec les autres (mêmes carrefours), sans voitures tirées dessus
      const busObjs = objects('bus');
      this.makeTraffic(objects('routes').concat(busObjs.filter((o) => o.polyline && /^bus_/.test(o.name)).map((o) => Object.assign({}, o, { bus: true }))), objects('carrefours'));
      this.makeSchool(busObjs);
      this.makeGare(objects('gare'));
      this.makeNavette(map);
      this.makeFinds(objects('trouvailles'));
      this.makeFauna(objects('animaux'));
      this.makeCaveLife();
      this.lieux = objects('lieux');
      // (sans capture : les touches tapées dans un champ de la page y restent ; saisie())
      this.keys = this.input.keyboard ? this.input.keyboard.addKeys('UP,DOWN,LEFT,RIGHT,Z,Q,S,D,W,A', false) : null;
      window.Ville = { scene: this };
      this.events.once('destroy', () => { if (window.Ville && window.Ville.scene === this) window.Ville = null; this.closeDialog(); });
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
        // `proche` : la distance où la flèche paraît (une porte : tout près)
        return { name: o.name, cible: prop('cible'), sens, rect: o, x, y, arrow, near: Number(prop('proche')) || PASS.near };
      }).filter((q) => q.cible && this.textures.exists(PASS.key));
    }

    // Chaque image : une flèche paraît près de la promeneuse et se balance dans son sens.
    stepPassages(time) {
      const P = this.heroPos;
      for (const q of this.passages) {
        const r = q.rect;
        const d = Math.hypot(Math.max(r.x - P.x, 0, P.x - r.x - r.width), Math.max(r.y - P.y, 0, P.y - r.y - r.height));
        q.arrow.setVisible(d <= q.near || this.god());
        if (!q.arrow.visible) continue;
        const k = K.balance(time);
        const [dx, dy] = SENS_PAS[q.sens];
        q.arrow.setPosition(Math.round(q.x + dx * k), Math.round(q.y + dy * k));
      }
    }

    // L'heure du jeu, relue chaque seconde (null : pas de partie sur cet appareil). (this.heure,
    // pas this.time : c'est l'horloge de Phaser, celle de this.time.delayedCall.)
    stepClock(time) {
      if (time - this.clockAt < 1000) return;
      this.clockAt = time;
      this.heure = window.HorlogeSortie ? window.HorlogeSortie.maintenant() : null;
      if (this.voile) this.voile.set(this.heure ? this.heure.heure : null);
    }

    // Le god mode (Options du jeu) : un toucher pose le personnage, les flèches sont toutes là.
    god() {
      const H = hote();
      return !!(H && H.god && H.god());
    }

    // Le personnage posé d'un coup sur la case libre la plus proche de (x, y) ; la caméra le suit de nouveau.
    teleport(x, y) {
      const gx = Math.floor(x / T), gy = Math.floor(y / T);
      const q = K.plusProche((i, j) => this.canWalk(gx + i, gy + j), 11);
      if (!q) return;
      const best = { x: gx + q.i, y: gy + q.j };
      this.path = [];
      this.work = null;
      this.heroPos.x = best.x === gx && best.y === gy ? x : best.x * T + T / 2;
      this.heroPos.y = best.x === gx && best.y === gy ? y : best.y * T + T - 2;
      this.hero.setPosition(Math.round(this.heroPos.x), Math.round(this.heroPos.y));
      if (this.followOn === false) { this.cameras.main.startFollow(this.hero, true, 0.12, 0.12); this.followOn = true; }
    }

    // Changer de carte : la page cible (une autre carte, ou la ferme).
    leave(q) {
      if (this.leaving) return;
      this.leaving = true;
      this.cameras.main.fadeOut(reduced() ? 0 : 250, 0, 0, 0);
      this.time.delayedCall(reduced() ? 0 : 260, () => { if (hote()) hote().go(q.cible); else window.location.href = q.cible; });
    }

    // Un zoom entier en pixels de l'écran (CarteJeu.zoomEntier) : 2 à 5 pixels CSS par pixel de carte.
    fitZoom() {
      this.cameras.main.setZoom(window.CarteJeu.zoomEntier(this));
    }

    // Tuiles animées (l'eau des fontaines) : les animations des jeux de tuiles (Tiled), jouées
    // en changeant l'index des tuiles posées, toutes au rythme de l'horloge (CarteKit).
    makeTileAnims() {
      this.tileAnims = K.animTuiles(this.map, this.layers);
    }

    stepTileAnims(time) {
      K.pasAnimTuiles(this.tileAnims, time);
    }

    // ---------- les grottes ----------

    // Le niveau du jour, tiré au hasard : des murs semés au hasard, lissés par un automate
    // cellulaire (un mur entouré de murs le reste, une case entourée de sol s'ouvre), puis seule
    // la plus grande salle est gardée. L'échelle (on arrive d'en haut) contre un mur, le puits
    // (on descend) le plus loin possible ; le minerai dans les murs qui bordent le sol.
    genCave(graine, niveau) {
      const J = GROTTE.jeu, W = J.LARGEUR, H = J.HAUTEUR;     // (data/ville.json, GROTTE)
      let h = 2166136261;
      for (let i = 0; i < graine.length; i++) { h ^= graine.charCodeAt(i); h = Math.imul(h, 16777619); }
      let a = h >>> 0;
      const rnd = () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
      const idx = (x, y) => y * W + x;
      let g, salle;
      for (let essai = 0; essai < 8; essai++) {
        g = new Uint8Array(W * H);                       // 1 : mur, 0 : sol
        for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) g[idx(x, y)] = x < 2 || y < 2 || x >= W - 2 || y >= H - 2 || rnd() < J.MURS ? 1 : 0;
        for (let p = 0; p < J.PASSES; p++) {
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
          if (![[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => sol(x + dx, y + dy)) || rnd() > J.MINERAI * (1 + niveau * J.MINERAI_NIVEAU)) continue;
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
      return { W, H, g, sol, echelle: { x: ex, y: ey }, puits: niveau < J.NIVEAUX ? { x: px, y: py } : null, ores, decor, stalag };
    }

    buildCave() {
      const meta = this.cache.json.get('grotte') || { tuiles: {}, objets: [] };
      const id = (etat.params.get('grotte') || '1').replace(/[^\w-]/g, '').slice(0, 12) || '1';
      const niveau = Math.max(1, Math.min(GROTTE.jeu.NIVEAUX, parseInt(etat.params.get('niveau'), 10) || 1));
      const h = window.HorlogeSortie ? window.HorlogeSortie.maintenant() : null;
      const jour = h ? h.jour : Math.floor(Date.now() / 864e5);
      const c = this.genCave(`${id}:${niveau}:${jour}`, niveau);
      Object.assign(c, { id, niveau, jour, meta });
      this.cave = c;
      const map = this.make.tilemap({ tileWidth: T, tileHeight: T, width: c.W, height: c.H });
      const set = map.addTilesetImage('grotte_tuiles', K.extrude(this.textures, 'grotte_tuiles', T), T, T, 1, 2);
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
      // le carnet d'avant (le minerai n'allait pas encore dans l'inventaire) : versé une fois
      if (hote() && hote().verser && rec.carnet && Object.keys(rec.carnet).length) {
        hote().verser(rec.carnet);
        rec.carnet = {};
        try { window.localStorage.setItem(GROTTE.store, JSON.stringify(rec)); } catch (e) { /* ignoré */ }
      }
      this.caveRec = rec;
      c.ores = c.ores.filter((o) => !rec.pris.includes(`${id}:${niveau}:${o.x},${o.y}`));
      // (les champignons lumineux cueillis aujourd'hui aussi : « m » devant leur case)
      c.decor = c.decor.filter((d) => d.kind !== 'champignon' || !rec.pris.includes(`${id}:${niveau}:m${d.x},${d.y}`));
      for (const o of c.ores) this.layers.minerais.putTileAt(t(o.kind), o.x, o.y);
      for (const d of c.decor) this.layers.marquage.putTileAt(t(d.kind), d.x, d.y);
      // les objets : l'échelle, le puits, les stalagmites (on ne passe pas à travers)
      const ob = (n) => Math.max(0, meta.objets.indexOf(n));
      const E = c.echelle, P = c.puits;
      // (gardés : la lumière de la grotte les éclaire, js/carte/ville/lueurs.js)
      c.images = [this.add.image(E.x * T + 8, E.y * T + 15, 'grotte_objets', ob('echelle')).setOrigin(0.5, 1).setDepth(E.y * T)];
      if (P) c.images.push(this.add.image(P.x * T + 8, P.y * T + 12, 'grotte_objets', ob('trou')).setOrigin(0.5, 0.75).setDepth(P.y * T - 8));
      for (const s of c.stalag) {
        c.images.push(this.add.image(s.x * T + 8, s.y * T + 15, 'grotte_objets', ob('stalagmite_' + s.v)).setOrigin(0.5, 1).setDepth(s.y * T + 15));
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

    // La lumière autour de la promeneuse (le reste de la grotte dans le noir : les lumières de
    // js/carte/ville/lueurs.js, sinon une image noire percée autour d'elle), le niveau affiché,
    // les stalagmites infranchissables.
    makeCaveLife() {
      this.mine = null;
      this.mining = null;
      const c = this.cave;
      if (!c) return;
      for (const s of c.stalag) if (this.walk[s.y]) this.walk[s.y][s.x] = false;
      // la Lampe de mineur (arbre des technologies) éclaire plus loin : lumiere %
      const lampe = hote() && hote().tech ? hote().tech('grotte') : null;
      const f = lampe && lampe.lumiere ? lampe.lumiere / 100 : 1;
      if (this.makeCaveLights(f)) { this.say(`⛏️ La grotte — niveau ${c.niveau}${c.niveau >= GROTTE.jeu.NIVEAUX ? ' (le plus profond)' : ''}`); return; }
      const L = { r0: GROTTE.lumiere.r0 * f, r1: GROTTE.lumiere.r1 * f, noir: GROTTE.lumiere.noir }, N = 512, K = 4;
      const cle = 'lumiere_grotte_' + Math.round(f * 100);   // une texture de N px, agrandie K fois
      if (!this.textures.exists(cle)) {
        const cv = document.createElement('canvas');
        cv.width = cv.height = N;
        const g = cv.getContext('2d');
        const grad = g.createRadialGradient(N / 2, N / 2, L.r0 / K, N / 2, N / 2, L.r1 / K);
        grad.addColorStop(0, 'rgba(6,4,6,0)');
        grad.addColorStop(0.55, `rgba(6,4,6,${L.noir * 0.6})`);
        grad.addColorStop(1, `rgba(6,4,6,${L.noir})`);
        g.fillStyle = grad;
        g.fillRect(0, 0, N, N);
        this.textures.addCanvas(cle, cv);
      }
      // (agrandie : elle couvre l'écran même au plus petit zoom)
      this.light = this.add.image(0, 0, cle).setScale(K).setDepth(1.9e6);
      this.say(`⛏️ La grotte — niveau ${c.niveau}${c.niveau >= GROTTE.jeu.NIVEAUX ? ' (le plus profond)' : ''}`);
    }

    tapOre(w) {
      const c = this.cave;
      if (!c) return false;
      const gx = Math.floor(w.x / T), gy = Math.floor(w.y / T);
      const o = c.ores.find((q) => q.x === gx && q.y === gy);
      if (!o) return false;
      // la pioche en main, comme pour les rochers (sans partie : la carte seule, toujours)
      const H = hote();
      if (H && H.enMain && H.enMain() !== 'pioche') return false;
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

    // Un champignon lumineux (le décor qui luit au sol) : la promeneuse y va et le cueille
    // (stepChampignon), sans outil ; il va dans l'inventaire (FermeHote.ramasser) et ne repousse
    // que le lendemain. Avec un champignon, une lanterne scintillante à l'Atelier.
    tapChampignon(w) {
      const c = this.cave;
      if (!c) return false;
      const gx = Math.floor(w.x / T), gy = Math.floor(w.y / T);
      const d = c.decor.find((q) => q.kind === 'champignon' && q.x === gx && q.y === gy);
      if (!d) return false;
      this.champi = d;
      const x = d.x * T + 8, y = d.y * T + 13, P = this.heroPos;
      if (Math.hypot(x - P.x, y - P.y) > GROTTE.cueille) this.goTo(x, y);
      return true;
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
      // sa lumière s'éteint (js/carte/ville/lueurs.js)
      const q = (this.lueurs || []).find((l) => l.kind === 'champignon' && l.x === d.x * T + 8 && l.y === d.y * T + 11);
      if (q) {
        this.lights.removeLight(q.light);
        q.halo.destroy();
        this.lueurs.splice(this.lueurs.indexOf(q), 1);
      }
      this.caveRec.pris.push(`${c.id}:${c.niveau}:m${d.x},${d.y}`);
      try { window.localStorage.setItem(GROTTE.store, JSON.stringify(this.caveRec)); } catch (e) { /* ignoré */ }
      if (r) this.popGain({ [r.item]: r.n });
      else this.say('🍄 Un champignon lumineux ! (il luit encore dans ta main)');
    }

    // Arrivée près du minerai : un coup de pioche par appui (pioche_cote), des éclats ; au dernier
    // des coups qu'il demande (GROTTE.COUPS, moins avec l'Arbre), il est pris.
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
      const J = GROTTE.jeu;
      const k = Math.min(3, Math.floor(g.t / J.COUP * 4));
      g.frame = 'pioche_cote_' + k;
      if (g.t >= J.COUP) {
        this.chips(m.ore);
        m.ore.coups = (m.ore.coups || 0) + 1;
        const coups = hote() && hote().coups ? hote().coups(J.COUPS) : J.COUPS;
        if (m.ore.coups >= coups) this.takeOre(m.ore);
        else { this.mine = null; this.mining = null; }
      }
    }

    chips(o) {
      K.secousse(this, 'coup');
      K.vibre('pioche');
      if (reduced()) return;
      const col = { fer: 0xd2a88a, cuivre: 0xd67e46, or: 0xf0c846, platine: 0xe6eef8 }[o.kind] || 0x9a9088;
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
      if (!r) rec.carnet[o.kind] = (rec.carnet[o.kind] || 0) + 1;      // (la carte seule : le carnet)
      try { window.localStorage.setItem(GROTTE.store, JSON.stringify(rec)); } catch (e) { /* ignoré */ }
      const nom = ((c.meta.minerais || {})[o.kind] || {}).nom || o.kind;
      if (r) this.popGain({ [r.item]: r.n });
      else this.say(`⛏️ ${nom} ! (dans le carnet : ${rec.carnet[o.kind]})`);
    }

    canWalk(tx, ty) {
      // (à un étage de l'immeuble : seulement son niveau)
      if (this.niveauVille) return this.marcheEtage(tx, ty);
      return !!(this.walk[ty] && this.walk[ty][tx]);
    }

    // Le chemin le plus court (en tuiles, 8 directions sans couper un coin) jusqu'à la tuile
    // marchable la plus proche du point visé.
    goTo(x, y) {
      const steps = this.findPath(this.heroPos.x, this.heroPos.y, x, y);
      if (steps) this.path = steps;
    }

    // Le chemin (une liste de points, px) de (fx, fy) jusqu'à (x, y), ou null : le plus court en
    // nombre de cases (CarteKit.chemin, un pas en diagonale compte pour un), jusqu'à la case
    // marchable la plus proche du point visé (CarteKit.plusProche, 7 cases au plus).
    findPath(fx, fy, x, y) {
      const W = this.map.width, H = this.map.height;
      let gx = Math.floor(x / T), gy = Math.floor(y / T);
      if (!this.canWalk(gx, gy)) {
        const q = K.plusProche((i, j) => this.canWalk(gx + i, gy + j), 7, { de: 1 });
        if (!q) return null;
        gx += q.i; gy += q.j; x = gx * T + T / 2; y = gy * T + T - 2;
      }
      const sx = Math.floor(fx / T), sy = Math.floor(fy / T);
      const cells = K.chemin({ cols: W, rows: H, libre: (i) => this.canWalk(i % W, (i / W) | 0) }, sy * W + sx, gy * W + gx, { diag: 1 });
      if (!cells) return null;
      const steps = cells.map((c) => ({ x: (c % W) * T + T / 2, y: Math.floor(c / W) * T + T - 2 }));
      if (steps.length) steps[steps.length - 1] = { x: Math.round(x), y: Math.round(y) };
      return steps;
    }

    // Le feuillage devant la promeneuse s'efface un peu ; celui qu'elle a quitté revient.
    // (les tuiles du rectangle ne sont redemandées à la couche que quand il change de cases :
    // voir CarteVille.tuilesDans)
    fadeFoliage(x, y) {
      for (const t of this.faded) t.alpha = 1;
      if (!this.layers[DEVANT]) return;
      const c = this.fadedCache || (this.fadedCache = {});
      this.faded = V.tuilesDans(c, this.layers[DEVANT], x - HERO.w / 2, y - HERO.foot, HERO.w, HERO.h - 2);
      for (const t of this.faded) t.alpha = FEUILLAGE_ALPHA;
    }

    update(time, delta) {
      this.stepTileAnims(time);
      const dt = Math.min(delta, 100) / 1000;
      this.stepTraffic(time, dt);
      this.stepPassages(time);
      this.stepClock(time);
      this.stepLighting(dt);
      this.stepShadows();
      if (this.voile) this.voile.step();
      this.stepSchool(time, dt);
      this.stepTrain(dt);
      this.stepTrip(dt);
      this.stepArrival(dt);
      this.stepNavette(dt);
      this.stepFinds(time);
      this.stepFauna(time, dt);
      this.stepMine(dt);
      this.stepChampignon();
      this.stepCaveLights(time, dt);
      this.stepWork(dt);
      this.stepPieces();
      this.stepFish(dt);
      this.stepVoisinsDehors(time, dt);
      this.stepLivreur(time, dt);
      this.stepMurs(dt);
      this.stepImmeuble(dt);
      this.stepCueillette();
      this.stepDialog();
      const P = this.heroPos;
      const x0 = P.x, y0 = P.y;
      let vx = 0, vy = 0;
      // en selle sur son triporteur (pas dans la grotte, ni pendant un geste) : plus vite
      const Ho = hote();
      const selle = !!(this.selle && Ho && Ho.triporteur && Ho.triporteur() && !this.cave && !this.mining && !this.locked);
      const vit = HERO.speed * (selle ? K.TRIPORTEUR.vitesse : 1);
      const k = this.locked || this.fishing || saisie() ? null : this.keys;
      const j = this.locked || this.fishing || this.dialog ? null : this.manette.dir();
      if (j) { vx = j.x; vy = j.y; }
      else if (k) {
        vx = (k.RIGHT.isDown || k.D.isDown ? 1 : 0) - (k.LEFT.isDown || k.Q.isDown || k.A.isDown ? 1 : 0);
        vy = (k.DOWN.isDown || k.S.isDown ? 1 : 0) - (k.UP.isDown || k.Z.isDown || k.W.isDown ? 1 : 0);
      }
      if (vx || vy) {
        this.path = [];
        if (this.work && !this.work.started) this.work = null;
        if (this.peche && !this.peche.phase) this.peche = null;
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
      let hx = 0, hy = 0;
      const moved = Math.hypot(P.x - x0, P.y - y0);
      if (this.mining) {
        H.setFrame(this.frame(this.mining.frame));
      } else if (moved > 0) {
        const r = K.regard(vx, vy);
        this.face = r.face; H.setFlipX(r.flip);
        this.walked += moved;
        H.setFrame(this.frame.de('marche', this.face, Math.floor(this.walked / HERO.stride) % 4));
      } else {
        // debout : elle respire (deux images, lentement)
        H.setFrame(this.frame.de('idle', this.face, Math.floor(time / 600) % 2));
      }
      if (selle) {
        // assis sur le triporteur, qui roule sous lui
        const r = this.selle.place(P.x, P.y, this.face, H.flipX, this.walked, this.heroAlpha);
        H.setFrame(this.frame(r.image));
        hx = r.dx; hy = r.dy;
      } else if (this.selle) this.selle.cache();
      // (à un étage de l'immeuble : remontée, devant le voile)
      const lift = this.liftVille();
      H.setPosition(Math.round(P.x + hx), Math.round(P.y - hy - lift)).setDepth(this.profondeurHeros(P.y)).setAlpha(this.heroAlpha);
      this.shadow.setPosition(Math.round(P.x), Math.round(P.y - lift)).setDepth(this.niveauVille ? this.profondeurHeros(P.y) - 1e-6 : P.y - 0.5).setAlpha(this.heroAlpha);
      this.fadeFoliage(Math.round(P.x), Math.round(P.y));
      this.stepNature(dt);
      this.placeGain();
      if (this.light) this.light.setPosition(Math.round(P.x), Math.round(P.y - 12 - lift));
      // les bâtiments autour des voitures, puis de la promeneuse (les boîtes sont gardées d'une
      // image à l'autre : rien n'est alloué)
      const boxes = this.boxes || (this.boxes = []);
      let n = 0;
      if (this.cars) for (const c of this.cars) boite(boxes, n++, c.x - 30, c.y - 38, 60, 56, c.y, false);
      boite(boxes, n++, P.x - HERO.w / 2, P.y - HERO.foot, HERO.w, HERO.h, P.y, true);
      boxes.length = n;
      this.uncover(boxes);
    }
  }
  // les méthodes des fichiers de js/carte/ville/
  for (const p of V.parties) {
    for (const [name, fn] of Object.entries(p)) {
      if (Object.prototype.hasOwnProperty.call(VilleScene.prototype, name)) console.warn('[VilleCarte] méthode en double : ' + name);
      VilleScene.prototype[name] = fn;
    }
  }

  // Une carte à la fois, scène du jeu de toutes les cartes (js/carte/jeu.js) : start la montre
  // dans `parent` (search : « ?carte=…&arrivee=… »), une scène neuve à chaque fois (les images
  // déjà chargées restent) ; stop l'enlève (et ferme ses fenêtres). Sans Phaser : false.
  function start(parent, search) {
    if (!window.CarteJeu) return false;
    window.Ville = null;
    return !!window.CarteJeu.montre(parent, 'ville', { cree: () => new VilleScene(), data: { search }, neuve: true });
  }
  function stop() {
    const s = window.Ville && window.Ville.scene;
    if (s) s.closeDialog();
    if (window.CarteJeu && window.CarteJeu.affichee() === 'ville') window.CarteJeu.cache('ville');
    window.Ville = null;
  }
  window.VilleCarte = { start, stop, cartes: Object.keys(CARTES), carte: () => (window.CarteJeu && window.CarteJeu.affichee() === 'ville' ? etat.nom : null) };
})();
