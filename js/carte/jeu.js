/* carte/jeu.js — le jeu Phaser, un seul pour toutes les cartes (window.CarteJeu).
 *
 * La ferme (js/farm-stage.js) et les autres cartes sont des scènes d'un même Phaser.Game : un seul canvas,
 * un seul contexte WebGL, un seul jeu de textures. Changer de carte, c'est changer de scène :
 *
 *   - la ferme s'endort (scene.sleep) et se réveille telle qu'on l'a laissée (la vue, le
 *     personnage, l'intérieur où l'on était) ;
 *   - une autre carte est une scène neuve à chaque fois (une instance de plus de sa classe, avec
 *     ses paramètres : la carte, le point d'arrivée…), retirée quand on la quitte : ses objets,
 *     ses minuteries (this.time), ses tweens, ses appuis et ses touches partent avec elle ;
 *   - les images, les cartes Tiled et les planches extrudées restent dans le jeu (textures et
 *     caches de Phaser, communs à toutes les scènes) : le chargeur d'une scène ne demande que ce
 *     qui manque encore.
 *
 * Le canvas est rendu à la densité de l'écran (CarteKit.ratio) en Scale.NONE, et posé dans la
 * zone de la carte affichée (#farm-stage pour la ferme, #map-stage pour les autres) ;
 * taille() le tient à la taille de cette zone. Chaque scène fait sa caméra : la ferme son zoom
 * non entier, les autres un zoom entier en pixels de l'écran (zoomEntier). Le clavier est
 * celui de Phaser, sans capture (les touches tapées dans un champ de la page y restent :
 * CarteKit.saisie).
 *
 * API : CarteJeu.jeu(zone)        le jeu (créé au premier appel, dans `zone`), ou null sans Phaser ;
 *       CarteJeu.montre(zone, clé, { cree, data, neuve, garde })
 *                                 affiche la scène `clé` dans `zone` : `cree()` en fait une
 *                                 instance, `data` va à son init/create, `neuve` : une instance
 *                                 neuve même si elle tourne déjà, `garde` : elle s'endort au lieu
 *                                 d'être retirée quand une autre carte passe devant (la ferme) ;
 *       CarteJeu.prepare(zone, clé, cree)  une scène gardée créée sans être affichée (elle s'endort) ;
 *       CarteJeu.cache(clé)       la scène `clé` n'est plus affichée (rien d'autre : la boucle dort) ;
 *       CarteJeu.affichee()       la clé de la scène affichée, ou null ;
 *       CarteJeu.suitTaille(scène, fn)  fn() à chaque changement de taille, tant que la scène vit ;
 *       CarteJeu.zoomEntier(scène)       le zoom entier des cartes vues de près (la mine) ;
 *       CarteJeu.cadence()               la scène revoit le plafond à chaque image (fiche 25) ;
 *       CarteJeu.surPas(fn), surVeille(fn), tourne()   la boucle de la page suit celle de Phaser (fiche 25) ;
 *       CarteJeu.prechauffe(taches), tachesLots(scène)  les shaders préparés pendant les temps morts (fiche 27).
 *
 * La cadence (fiche 25, docs/architecture-phaser.md § 1 quater) : la boucle de Phaser suit l'écran ; sur
 * un écran de plus de 100 Hz, elle est plafonnée à 60 images par seconde, et en qualité « économie », à 30,
 * tout le temps (avant : seulement quand rien n'avait bougé depuis une seconde ; mais un téléphone qui ne
 * tient pas 60 en marchant alternait des images de 16 et de 33 ms, ce qui se voit plus qu'un 30 régulier,
 * docs/perf.md). Le limiteur de Phaser 4.2.1 (stepLimitFPS) redonnait le reste du pas d'avant : le temps du jeu
 * filait 1,8 fois trop vite à 60 sur un écran à 60 Hz ; il est remplacé ici (pasLimite).
 *
 * Script classique, chargé après js/carte/kit.js ; il ne demande Phaser qu'à la création du jeu.
 * Voir docs/architecture-phaser.md (§ 1 quater).
 */
(function (global) {
  'use strict';

  const K = global.CarteKit;

  let game = null;
  let zone = null;            // l'élément où est le canvas (celui de la carte affichée)
  let voulue = null;          // { cle, zone, cree, data, neuve, garde } : la scène à afficher, ou null
  const gardees = new Set();  // les scènes qui s'endorment au lieu d'être retirées (la ferme)
  const zones = new WeakSet();
  let plan = 0;               // un passage différé est prévu (setTimeout)
  const aPreparer = new Map(); // clé -> cree() : les scènes gardées à créer cachées (prepare)
  const attenteCreation = new WeakSet(); // les scènes cachées qui s'endormiront une fois créées
  // Les états d'une scène (Phaser.Scenes) : en route jusqu'à RUNNING, puis endormie, arrêtée.
  const START = 2, RUNNING = 5, PAUSED = 6, SLEEPING = 7;
  // La cadence (fiche 25) : le plafond d'images par seconde (0 : l'écran), et à partir de combien d'images
  // par seconde de l'écran on plafonne à 60 ; le plafond de l'économie.
  const CADENCE = { RAPIDE: 100, PLAFOND: 60, ECONOMIE: 30, TOLERANCE: 0.1 };
  const auPas = [];           // fn(temps) appelées à chaque pas de la boucle de Phaser (surPas)
  const aLaVeille = [];       // fn() appelées quand la boucle de Phaser s'endort ou se réveille (surVeille)

  function jeu(el) {
    if (game) return game;
    if (!global.Phaser || !el) return null;
    zone = el;
    shadersArrondis();
    const r = K.ratio();
    game = new global.Phaser.Game({
      type: global.Phaser.AUTO,
      parent: el,
      // Pixels nets sans arrondi des positions pour la ferme (zoom non entier : des sommets
      // arrondis un par un ouvriraient des fentes entre parcelles voisines) ; les autres cartes
      // arrondissent par leur caméra (zoom entier, setRoundPixels).
      // maxLights : les lumières qu'une vue garde (les plus proches de son centre).
      render: { antialias: false, antialiasGL: false, roundPixels: false, maxLights: 12 },
      transparent: false,
      backgroundColor: '#6a8157',
      // Taille du jeu = taille de la zone × densité de l'écran ; taille() la tient à jour.
      scale: {
        mode: global.Phaser.Scale.NONE,
        width: Math.max(1, Math.round((el.clientWidth || 320) * r)),
        height: Math.max(1, Math.round((el.clientHeight || 480) * r)),
        zoom: 1 / r,
        expandParent: false,
        autoRound: false,
      },
      // Le toucher est capturé (pas de défilement de page ni de clic fantôme après un appui) ;
      // le clavier sert aux cartes où l'on marche (flèches, ZQSD), sans capture.
      input: { keyboard: true, gamepad: false, touch: { capture: true } },
      audio: { noAudio: true },
      banner: false,
      scene: [],
    });
    // (le limiteur corrigé, avant tout plafond : pasLimite)
    game.loop.stepLimitFPS = pasLimite;
    game.events.on('poststep', (t) => { for (const fn of auPas) fn(t); });
    game.events.once('ready', () => { taille(); applique(); });
    if (global.ResizeObserver) jeu.observe = new global.ResizeObserver(taille);
    global.addEventListener('resize', taille);
    suit(el);
    return game;
  }

  // Fiche 9a : sous un rendu WebGL logiciel (SwiftShader, llvmpipe : un ordinateur sans carte graphique
  // utilisable, et les essais dans Chromium sans écran), une image tournée perdait des morceaux (l'arbre
  // qui bascule sous la hache, l'aigle qui tourne, le poisson qui saute, l'écureuil qui grimpe). La
  // cause : Phaser 4 dessine en un lot des images de plusieurs textures, et son shader choisit la texture
  // d'un point par une égalité exacte sur un nombre interpolé d'un sommet à l'autre (« outTexDatum ==
  // float(i) ») ; sur un triangle tourné, le rendu logiciel ne retombe pas exactement sur l'entier et le
  // point devient transparent. Le texte de ces shaders (eux seuls : ceux qui lisent outTexDatum) est
  // retouché à sa compilation pour comparer l'entier le plus proche : le même choix sur une carte
  // graphique (le nombre y est déjà exact), plus de trou ailleurs ; ni Phaser ni les rotations ne
  // changent, les lots gardent leurs textures (une texture par lot coûtait 10 à 15 % sur la côte).
  function shadersArrondis() {
    for (const nom of ['WebGLRenderingContext', 'WebGL2RenderingContext']) {
      const P = global[nom] && global[nom].prototype;
      if (!P || P.shaderSource.fermeArrondi) continue;
      const source = P.shaderSource;
      const arrondi = function (shader, texte) {
        if (typeof texte === 'string' && texte.indexOf('outTexDatum') >= 0) {
          // (l'entier calculé une fois par point, au début de getTexture : sous un rendu logiciel,
          // chaque opération de plus par point se paie)
          const avant = texte;
          // (fiche 34 : seulement quand le shader a plusieurs textures, comme le code de Phaser autour ; avec une
          // seule (le SpriteGPULayer), outTexDatum n'existe pas et le shader ne se compilait plus)
          texte = texte.replace(/vec4 getTexture \(vec2 texCoord\)\s*\{/, (m) => m + '\n    #if TEXTURE_COUNT != 1\n    float texIdArrondi = floor(outTexDatum + 0.5);\n    #endif');
          if (texte !== avant) texte = texte.replace(/outTexDatum ==/g, 'texIdArrondi ==');
          texte = texte.replace(/float texId = outTexDatum;/g, 'float texId = floor(outTexDatum + 0.5);');
        }
        return source.call(this, shader, texte);
      };
      arrondi.fermeArrondi = true;
      P.shaderSource = arrondi;
    }
  }

  // Le pas plafonné de la boucle de Phaser (TimeStep, `this` : game.loop), à la place de stepLimitFPS :
  // une image n'est donnée à la scène que si le temps écoulé depuis la dernière atteint le plafond (à 10 %
  // près : l'horloge de l'écran tremble un peu), et elle reçoit ce temps-là, ni plus ni moins. (Celui de
  // Phaser passait aussi le reste gardé du pas d'avant : il comptait du temps deux fois.) Les compteurs
  // de Phaser (actualFps : les images de l'écran) restent tenus comme avant.
  function pasLimite(t) {
    this.now = t;
    const e = Math.max(0, t - this.lastTime);
    this.rawDelta = e;
    this.time += e;
    this.delta += e;
    if (t >= this.nextFpsUpdate) this.updateFPS(t);
    this.framesThisSecond++;
    if (this.delta >= this._limitRate * (1 - CADENCE.TOLERANCE)) {
      // (sans le lissage de Phaser, smoothDelta : il ramène le pas à 1/60 s quand la fenêtre n'a pas le
      // focus, ce qui, plafonné à 30, ferait marcher le jeu au ralenti)
      const d = this.delta;
      this.delta = 0;
      this.callback(t, d);
    }
    this.lastTime = t;
    this.frame++;
  }

  // La scène revoit le plafond à chaque image (la qualité peut changer dans les Options).
  function cadence() {
    if (!game || !game.loop) return;
    const L = game.loop;
    const eco = K.qualite && K.qualite() === 'economie';
    // (actualFps compte les images de l'écran, plafond ou non ; il lui faut une seconde pour se mesurer)
    const rapide = L.actualFps > CADENCE.RAPIDE;
    const voulu = eco ? CADENCE.ECONOMIE : rapide ? CADENCE.PLAFOND : 0;
    if (L.fpsLimit !== voulu) L.setFPSLimit(voulu);
  }

  /* ---------- les shaders préparés d'avance (fiche 27) ----------
     Phaser compile un programme de shader la première fois qu'il en a besoin, au milieu d'une image : le
     lot d'images standard en a une variante par nombre de textures du lot (1 à 16), l'eau de la mer le
     sien. Au premier passage à la mer, 5 programmes d'un coup (≈ 30 à 90 ms d'appels WebGL dans
     Chromium) : un à-coup. Ici, ils se préparent un par un pendant les temps morts de la page
     (requestIdleCallback ; repli : un setTimeout), après le chargement : ni à-coup, ni chargement plus
     long. (skipUnreadyShaders, l'autre piste, ne dessine pas ce dont le shader n'est pas prêt : tout un
     lot d'images pouvait disparaître quelques images.) */
  function prechauffe(taches) {
    const file = (taches || []).slice();
    const suivante = () => {
      if (!file.length) return;
      const t = file.shift();
      try { t(); } catch (e) { /* une préparation ratée se refera au besoin, comme avant */ }
      attendre(suivante);
    };
    // (une page occupée n'a presque jamais de temps mort : 250 ms au plus entre deux tâches, de quelques ms)
    const attendre = (fn) => (global.requestIdleCallback ? global.requestIdleCallback(fn, { timeout: 250 }) : setTimeout(fn, 50));
    attendre(suivante);
  }
  // Les variantes du lot d'images standard (BatchHandlerQuad : une par nombre de textures du lot). Chaque
  // lot refixe son nombre avant de dessiner (finalizeTextureCount) : le changer entre deux images est sans
  // effet sur l'image.
  function tachesLots(scene) {
    const R = scene.sys.renderer, N = R && R.renderNodes, q = N && N.getNode && N.getNode('BatchHandlerQuad');
    if (!q || !q.programManager || !q.finalizeTextureCount) return [];
    const out = [];
    for (let n = 1; n <= q.maxTexturesPerBatch; n++) out.push(() => { q.finalizeTextureCount(n); q.programManager.getCurrentProgramSuite(); });
    return out;
  }

  // La boucle de Phaser tourne-t-elle (la carte affichée, le jeu démarré) ?
  function tourne() { return !!(game && game.loop && game.loop.running); }
  function surPas(fn) { auPas.push(fn); }
  function surVeille(fn) { aLaVeille.push(fn); }
  function veille(dort) {
    if (!game) return;
    if (dort) game.loop.sleep(); else game.loop.wake();
    for (const fn of aLaVeille) fn();
  }

  // Une zone qui reçoit le canvas : sa taille est suivie ; avant chaque geste, Phaser relit la
  // position exacte du canvas (le bandeau peut changer de hauteur sans que la fenêtre change).
  function suit(el) {
    if (zones.has(el)) return;
    zones.add(el);
    if (jeu.observe) jeu.observe.observe(el);
    const bornes = () => { if (game && game.isBooted && zone === el) game.scale.updateBounds(); };
    el.addEventListener('touchstart', bornes, { capture: true, passive: true });
    el.addEventListener('mousedown', bornes, true);
  }

  // Aligne la taille du jeu sur celle de la zone affichée (× densité de l'écran).
  function taille() {
    if (!game || !game.isBooted || !zone) return;
    const w = zone.clientWidth, h = zone.clientHeight;
    if (!w || !h) return;                  // zone masquée
    const r = K.ratio();
    const gw = Math.round(w * r), gh = Math.round(h * r);
    game.scale.zoom = 1 / r;
    if (gw !== game.scale.width || gh !== game.scale.height) game.scale.resize(gw, gh);
    else game.scale.updateBounds();
  }

  // Le canvas va dans la zone de la carte affichée.
  function place(el) {
    suit(el);
    zone = el;
    const c = game.canvas;
    if (c && c.parentNode !== el) el.insertBefore(c, el.firstChild);
    if (c) c.style.cursor = '';
    taille();
  }

  // Réconcilie le jeu avec la scène voulue. Le gestionnaire de scènes de Phaser met en attente
  // ce qu'on lui demande pendant une image (une carte qui part d'une minuterie de sa scène) :
  // le passage se fait alors juste après, hors de l'image. Ici seulement, des scènes sont
  // ajoutées ou retirées : le jeu démarré, hors d'une image, l'ajout est immédiat.
  function applique() {
    // (le gestionnaire de scènes démarre en dernier, avec l'événement « ready » : jusque-là,
    // une scène ajoutée attendrait sans qu'on la voie)
    if (!game || !game.scene.isBooted) return;
    const S = game.scene;
    if (S.isProcessing) {
      if (!plan) plan = setTimeout(() => { plan = 0; applique(); }, 0);
      return;
    }
    const v = voulue;
    for (const s of S.getScenes(false)) {
      const cle = s.sys.settings.key;
      if (v && cle === v.cle && !v.neuve) continue;
      if (!gardees.has(cle)) { S.remove(cle); continue; }
      if (v && cle === v.cle) continue;
      endort(s);
    }
    // les scènes gardées à préparer (prepare) : créées cachées, elles s'endorment une fois prêtes
    for (const [cle, cree] of aPreparer) {
      aPreparer.delete(cle);
      if (S.getScene(cle) || (v && v.cle === cle)) continue;
      S.add(cle, cree(), true);
      endort(S.getScene(cle));
    }
    if (!v) {
      // Une scène gardée encore en chargement : la boucle tourne jusqu'à sa création, sans quoi
      // le chargeur s'arrête en route (elle s'endort alors d'elle-même, voir endort).
      veille(!S.getScenes(false).some((s) => s.sys.settings.status < RUNNING));
      return;
    }
    place(v.zone);
    if (v.garde) gardees.add(v.cle);
    let s = S.getScene(v.cle);
    if (v.neuve && s) { S.remove(v.cle); s = null; }
    v.neuve = false;
    if (!s) S.add(v.cle, v.cree(), true, v.data || {});
    else {
      if (s.sys.isSleeping()) S.wake(v.cle, v.data);
      else if (s.sys.settings.status < START) S.start(v.cle, v.data);
      s.sys.setVisible(true);
    }
    veille(false);
  }

  // Une scène gardée passe derrière : endormie (plus d'image, plus d'appuis, plus de mise à
  // jour) ; encore en chargement, elle est seulement cachée et s'endort à la fin de sa création.
  function endort(s) {
    if (!s) return;
    const st = s.sys.settings.status;
    if (st === SLEEPING) return;
    if (st === RUNNING || st === PAUSED) { game.scene.sleep(s.sys.settings.key); return; }
    s.sys.setVisible(false);
    if (attenteCreation.has(s)) return;
    attenteCreation.add(s);
    s.sys.events.once('create', () => {
      attenteCreation.delete(s);
      if (!voulue || voulue.cle !== s.sys.settings.key) game.scene.sleep(s.sys.settings.key);
      if (!voulue) applique();
    });
  }

  function montre(el, cle, opts) {
    const o = opts || {};
    if (!jeu(el)) return null;
    voulue = { cle, zone: el, cree: o.cree, data: o.data, neuve: !!o.neuve, garde: !!o.garde };
    applique();
    return game;
  }

  // Une scène gardée créée sans être affichée (la ferme montée pendant qu'une autre carte est
  // à l'écran) : elle se charge, puis s'endort.
  function prepare(el, cle, cree) {
    if (!jeu(el)) return null;
    gardees.add(cle);
    aPreparer.set(cle, cree);
    applique();
    return game;
  }

  function cache(cle) {
    if (!game || (voulue && voulue.cle !== cle)) return;
    voulue = null;
    applique();
  }

  function affichee() { return voulue ? voulue.cle : null; }

  // fn() à chaque changement de taille du jeu, tant que la scène vit (retiré à son arrêt).
  function suitTaille(scene, fn) {
    scene.scale.on('resize', fn);
    const fin = () => scene.scale.off('resize', fn);
    scene.events.once('shutdown', fin);
    scene.events.once('destroy', fin);
  }

  // Le zoom des cartes vues de près (la mine) : de 2 à 5 pixels d'écran CSS
  // par pixel de carte selon la taille de la zone, arrondi à un nombre entier de pixels de
  // l'écran (le canvas est à sa densité) : la caméra et les tuiles tombent sur des pixels entiers.
  function zoomEntier(scene) {
    const r = K.ratio(), w = scene.scale.width / r, h = scene.scale.height / r;
    const css = Math.max(2, Math.min(5, Math.floor(Math.min(w, h) / 170)));
    return Math.max(1, Math.round(css * r));
  }

  global.CarteJeu = { jeu, montre, prepare, cache, affichee, taille, suitTaille, zoomEntier, cadence, tourne, surPas, surVeille, pasLimite, CADENCE, prechauffe, tachesLots, game: () => game };
})(window);
