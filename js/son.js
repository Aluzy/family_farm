/* son.js — le son du jeu : musique, ambiances, bruits des gestes et de l'interface.
 *
 * Script classique (window.FermeSon), chargé après le kit des cartes et avant les scènes. Tout
 * est facultatif : sans Web Audio, sans geste du joueur (les navigateurs ne jouent rien avant),
 * ou le son coupé, chaque appel ne fait rien. Il ne lit jamais l'état du jeu : les scènes et
 * l'interface l'appellent au moment d'un geste (FermeSon.joue('hache', { x, y })) et un
 * « directeur » lit 4 fois par seconde ce que les cartes montrent déjà (l'heure, le biome sous
 * le personnage, les bâtiments en marche, les bêtes proches) pour régler les ambiances.
 *
 * Les sons sont dans assets/son/ (.ogg, et .m4a pour Safari), tous synthétisés pour le jeu par
 * scripts/son/ (voir docs/son.md). Les réglages sont ceux de l'appareil (localStorage
 * « ferme-son »), dans ⚙️ Options › Son.
 *
 * Bus : musique, nature (ambiances), monde (bâtiments, bêtes, machines), effets (gestes),
 * interface. Les distances sont en pixels de la carte (T = 16 px la case).
 */
(function (global) {
  'use strict';

  const T = 16;
  const CLE_REGLAGES = 'ferme-son';

  // clé → fichiers (sans extension, dans assets/son/), généré par scripts/son/vers_jeu.py
  const FICHIERS = {
    musique_matin: ["musique/musique_matin"],
    musique_soir: ["musique/musique_soir"],
    musique_nuit: ["musique/musique_nuit"],
    musique_mine: ["musique/musique_mine"],
    oiseaux_matin: ["ambiance/oiseaux_matin"],
    oiseaux_jour: ["ambiance/oiseaux_jour"],
    grillons_soir: ["ambiance/grillons_soir"],
    grillons_nuit: ["ambiance/grillons_nuit"],
    vent: ["ambiance/vent"],
    grenouilles: ["ambiance/grenouilles"],
    mer: ["ambiance/mer"],
    lac: ["ambiance/lac"],
    riviere: ["ambiance/riviere"],
    foret: ["ambiance/foret"],
    montagne: ["ambiance/montagne"],
    hameau: ["ambiance/hameau"],
    grotte: ["ambiance/grotte"],
    abeilles: ["ambiance/abeilles"],
    moulin: ["ambiance/moulin"],
    feu: ["ambiance/feu"],
    asperseur: ["ambiance/asperseur"],
    pompe: ["ambiance/pompe"],
    robot: ["ambiance/robot"],
    pedalier: ["ambiance/pedalier"],
    moulinet: ["ambiance/moulinet"],
    oiseau: ["nature/oiseau_1", "nature/oiseau_2", "nature/oiseau_3", "nature/oiseau_4", "nature/oiseau_5", "nature/oiseau_6", "nature/oiseau_7", "nature/oiseau_8"],
    chouette: ["nature/chouette"],
    poule: ["animaux/poule_1", "animaux/poule_2", "animaux/poule_3"],
    coq: ["animaux/coq"],
    vache: ["animaux/vache_1", "animaux/vache_2", "animaux/vache_3"],
    mouton: ["animaux/mouton_1", "animaux/mouton_2", "animaux/mouton_3"],
    chat: ["animaux/chat_1", "animaux/chat_2"],
    ronron: ["animaux/ronron"],
    chien: ["animaux/chien_1", "animaux/chien_2", "animaux/chien_3"],
    cheval: ["animaux/cheval"],
    ebrouement: ["animaux/ebrouement"],
    sabots_herbe: ["animaux/sabots_herbe_1", "animaux/sabots_herbe_2"],
    sabots_terre: ["animaux/sabots_terre_1", "animaux/sabots_terre_2"],
    sabots_pierre: ["animaux/sabots_pierre_1", "animaux/sabots_pierre_2"],
    oeuf: ["animaux/oeuf"],
    lait: ["animaux/lait"],
    tonte: ["animaux/tonte"],
    grain: ["animaux/grain"],
    aigle: ["faune/aigle"],
    cygne: ["faune/cygne_1", "faune/cygne_2"],
    ecureuil: ["faune/ecureuil_1", "faune/ecureuil_2"],
    marmotte: ["faune/marmotte"],
    dauphin: ["faune/dauphin"],
    lievre: ["faune/lievre"],
    bouquetin: ["faune/bouquetin"],
    hache: ["outils/hache_1", "outils/hache_2", "outils/hache_3"],
    arbre_tombe: ["outils/arbre_tombe"],
    pioche: ["outils/pioche_1", "outils/pioche_2", "outils/pioche_3"],
    pioche_minerai: ["outils/pioche_minerai_1", "outils/pioche_minerai_2"],
    coup_vide: ["outils/coup_vide"],
    houe: ["outils/houe_1", "outils/houe_2", "outils/houe_3"],
    faux: ["outils/faux_1", "outils/faux_2", "outils/faux_3"],
    semis: ["outils/semis_1", "outils/semis_2"],
    arrosage: ["outils/arrosage_1", "outils/arrosage_2"],
    remplir: ["outils/remplir"],
    recolte: ["outils/recolte_1", "outils/recolte_2", "outils/recolte_3"],
    arracher: ["outils/arracher_1", "outils/arracher_2"],
    pris_pierre: ["ramasser/pris_pierre_1", "ramasser/pris_pierre_2", "ramasser/pris_pierre_3"],
    pris_bois: ["ramasser/pris_bois_1", "ramasser/pris_bois_2", "ramasser/pris_bois_3"],
    pris_herbe: ["ramasser/pris_herbe_1", "ramasser/pris_herbe_2", "ramasser/pris_herbe_3"],
    pris_minerai: ["ramasser/pris_minerai"],
    gain: ["ramasser/gain"],
    lancer: ["peche/lancer"],
    plouf: ["peche/plouf_1", "peche/plouf_2"],
    touche: ["peche/touche"],
    prise: ["peche/prise"],
    rate: ["peche/rate"],
    pose_bois: ["chantier/pose_bois_1", "chantier/pose_bois_2"],
    pose_pierre: ["chantier/pose_pierre_1", "chantier/pose_pierre_2"],
    pose_metal: ["chantier/pose_metal_1", "chantier/pose_metal_2"],
    retrait: ["chantier/retrait_1", "chantier/retrait_2"],
    porte_ouvre: ["chantier/porte_ouvre"],
    porte_ferme: ["chantier/porte_ferme"],
    botteleuse: ["machines/botteleuse"],
    silo: ["machines/silo"],
    echelle: ["monde/echelle"],
    sonnette: ["monde/sonnette"],
    dodo: ["monde/dodo"],
    pas_herbe: ["pas/pas_herbe_1", "pas/pas_herbe_2", "pas/pas_herbe_3", "pas/pas_herbe_4"],
    pas_terre: ["pas/pas_terre_1", "pas/pas_terre_2", "pas/pas_terre_3", "pas/pas_terre_4"],
    pas_pierre: ["pas/pas_pierre_1", "pas/pas_pierre_2", "pas/pas_pierre_3", "pas/pas_pierre_4"],
    pas_bois: ["pas/pas_bois_1", "pas/pas_bois_2", "pas/pas_bois_3", "pas/pas_bois_4"],
    pas_sable: ["pas/pas_sable_1", "pas/pas_sable_2", "pas/pas_sable_3", "pas/pas_sable_4"],
    pas_eau: ["pas/pas_eau_1", "pas/pas_eau_2", "pas/pas_eau_3", "pas/pas_eau_4"],
    pas_feuilles: ["pas/pas_feuilles_1", "pas/pas_feuilles_2", "pas/pas_feuilles_3", "pas/pas_feuilles_4"],
    ouvre: ["interface/ouvre"],
    ferme: ["interface/ferme"],
    onglet: ["interface/onglet"],
    erreur: ["interface/erreur"],
    info: ["interface/info"],
    reussite: ["interface/reussite"],
    alerte: ["interface/alerte"],
    pieces: ["interface/pieces_1", "interface/pieces_2"],
    fabrique: ["interface/fabrique"],
    cuisine: ["interface/cuisine"],
    niveau: ["interface/niveau"],
    chapitre: ["interface/chapitre"],
    techno: ["interface/techno"],
    decouverte: ["interface/decouverte"],
    cloche: ["interface/cloche"],
    nouveau_jour: ["interface/nouveau_jour"],
    retour: ["interface/retour"],
  };

  // le bus et le volume de base de chaque son (sinon : DEFAUT selon son dossier)
  const DOSSIER = { musique: ['musique', 0.8], ambiance: ['nature', 0.6], nature: ['nature', 0.45], animaux: ['monde', 0.6],
    faune: ['monde', 0.55], outils: ['effets', 0.75], ramasser: ['effets', 0.55], peche: ['effets', 0.65], chantier: ['effets', 0.6],
    machines: ['monde', 0.55], monde: ['effets', 0.6], pas: ['effets', 0.4], interface: ['interface', 0.5] };
  const PROPRE = {
    moulin: ['monde', 0.5], feu: ['monde', 0.45], asperseur: ['monde', 0.35], pompe: ['monde', 0.35], robot: ['monde', 0.4],
    abeilles: ['monde', 0.4], hameau: ['monde', 0.5], pedalier: ['effets', 0.3], moulinet: ['effets', 0.45],
    arbre_tombe: ['effets', 0.85], dodo: ['interface', 0.45], echelle: ['effets', 0.6], ouvre: ['interface', 0.35],
    ferme: ['interface', 0.3], onglet: ['interface', 0.35], info: ['interface', 0.3], niveau: ['interface', 0.6],
    chapitre: ['interface', 0.6], techno: ['interface', 0.55], cloche: ['interface', 0.45], coq: ['monde', 0.55],
  };
  const DUCK = new Set(['niveau', 'chapitre', 'techno', 'arbre_tombe']);   // la musique s'efface un instant

  // le réglage de l'appareil
  const DEFAUT = { general: 0.8, musique: 0.55, ambiance: 0.8, effets: 0.9, interface: 0.7, mode: 'intermittente', muet: false };
  function lireReglages() {
    try { return Object.assign({}, DEFAUT, JSON.parse(global.localStorage.getItem(CLE_REGLAGES) || '{}')); } catch (e) { return Object.assign({}, DEFAUT); }
  }
  let R = lireReglages();

  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const hasard = (a, b) => a + Math.random() * (b - a);
  const AC = global.AudioContext || global.webkitAudioContext;

  let ctx = null, maitre = null, bus = null, duck = null, ext = 'ogg';
  const tampons = new Map();        // fichier → Promise<AudioBuffer>
  const derniere = {};              // clé → dernière variante (jamais deux fois la même de suite)
  const dernierJeu = {};            // clé → instant du dernier départ (anti-rafale)
  let voix = [];
  const MAX_VOIX = 14;
  // les bruits d'interface discrets, qui s'effacent devant un autre tout juste joué
  const DOUX = new Set(['info', 'ouvre', 'ferme', 'onglet']);
  let dernierUI = -1;

  function url(f) {
    const nom = 'son/' + f + '.' + ext;
    const K = global.CarteKit;
    return 'assets/' + (K && K.v ? K.v(nom) : nom);
  }
  function tampon(f) {
    if (!tampons.has(f)) {
      const p = fetch(url(f)).then((r) => { if (!r.ok) throw new Error(f); return r.arrayBuffer(); })
        .then((ab) => new Promise((ok, ko) => ctx.decodeAudioData(ab, ok, ko)));
      p.catch(() => tampons.delete(f));   // un échec (réseau) : on réessaiera
      tampons.set(f, p);
    }
    return tampons.get(f);
  }
  const busDe = (cle) => (PROPRE[cle] || DOSSIER[(FICHIERS[cle] && FICHIERS[cle][0] || '').split('/')[0]] || ['effets', 0.6]);

  /* ---------- démarrage : au premier geste du joueur ---------- */

  function demarre() {
    if (ctx || !AC) return;
    try { ctx = new AC({ latencyHint: 'interactive' }); } catch (e) { ctx = null; return; }
    const a = document.createElement('audio');
    ext = a.canPlayType && a.canPlayType('audio/ogg; codecs="vorbis"') ? 'ogg' : 'm4a';
    const lim = ctx.createDynamicsCompressor();
    lim.threshold.value = -6; lim.knee.value = 6; lim.ratio.value = 10; lim.attack.value = 0.003; lim.release.value = 0.25;
    maitre = ctx.createGain(); maitre.connect(lim).connect(ctx.destination);
    duck = ctx.createGain(); duck.connect(maitre);
    bus = {};
    for (const n of ['musique', 'nature', 'monde', 'effets', 'interface']) {
      bus[n] = ctx.createGain(); bus[n].connect(n === 'musique' ? duck : maitre);
    }
    appliqueVolumes(0);
    // les petits sons fréquents, chargés d'avance
    for (const k of ['pas_herbe', 'pas_terre', 'hache', 'pioche', 'houe', 'ouvre', 'ferme', 'onglet']) (FICHIERS[k] || []).forEach(tampon);
    setInterval(directeur, 250);
  }
  function debloque() {
    demarre();
    if (ctx && ctx.state !== 'running' && !document.hidden) ctx.resume().catch(() => {});
  }
  for (const ev of ['pointerdown', 'keydown', 'touchend']) document.addEventListener(ev, debloque, { capture: true, passive: true });
  document.addEventListener('visibilitychange', () => {
    if (!ctx) return;
    if (document.hidden) ctx.suspend().catch(() => {}); else ctx.resume().catch(() => {});
  });

  /* ---------- volumes ---------- */

  const courbe = (v) => v * v;   // un curseur à moitié ≈ -12 dB
  function rampe(p, v, s) {
    const t = ctx.currentTime;
    p.cancelScheduledValues(t); p.setValueAtTime(p.value, t); p.linearRampToValueAtTime(v, t + Math.max(0.02, s));
  }
  function appliqueVolumes(s = 0.2) {
    if (!ctx) return;
    rampe(maitre.gain, R.muet ? 0 : courbe(R.general), s);
    rampe(bus.musique.gain, R.mode === 'coupee' ? 0 : courbe(R.musique), s);
    rampe(bus.nature.gain, courbe(R.ambiance), s);
    rampe(bus.monde.gain, courbe(R.ambiance), s);
    rampe(bus.effets.gain, courbe(R.effets), s);
    rampe(bus.interface.gain, courbe(R.interface), s);
  }
  function regle(nouveau) {
    R = Object.assign({}, R, nouveau);
    try { global.localStorage.setItem(CLE_REGLAGES, JSON.stringify(R)); } catch (e) { /* appareil sans stockage */ }
    appliqueVolumes();
  }
  function effaceMusique(niveau, tenue) {
    if (!ctx) return;
    const t = ctx.currentTime, p = duck.gain;
    p.cancelScheduledValues(t); p.setValueAtTime(p.value, t);
    p.linearRampToValueAtTime(niveau, t + 0.08); p.setValueAtTime(niveau, t + tenue); p.linearRampToValueAtTime(1, t + tenue + 1.2);
  }

  /* ---------- l'auditeur : le personnage ---------- */

  function auditeur() {
    const J = global.CarteJeu, aff = J && J.affichee ? J.affichee() : null;
    if (aff === 'grotte') { const g = global.Grotte && global.Grotte.scene; return g && g.heroPos ? g.heroPos : null; }
    const FS = global.FarmStage;
    return FS && FS.perso ? FS.perso() : null;
  }
  // gain et panoramique d'un son placé en (x, y) ; null : trop loin
  function espace(x, y, portee) {
    const a = auditeur();
    if (!a || x == null) return { g: 1, pan: 0 };
    const dx = (x - a.x) / T, dy = (y - a.y) / T, d = Math.hypot(dx, dy);
    if (d >= portee) return null;
    const pres = 2.5, g = d <= pres ? 1 : Math.pow(1 - (d - pres) / (portee - pres), 2);
    return { g, pan: clamp(dx / Math.max(6, d + 3), -0.8, 0.8) };
  }

  /* ---------- jouer un son ---------- */

  // cle : une clé de FICHIERS ; o : { x, y (px, sinon : sur le personnage), portee (cases),
  // gain, vitesse (hauteur), varie (± de hauteur), delai (s), depuis (s : partir de là dans le fichier,
  // par exemple pour sauter l'élan d'un coup déjà donné), prio, ecart (s : pas deux fois plus près) }
  function joue(cle, o = {}) {
    if (!ctx || ctx.state !== 'running' || R.muet) return;
    const f = FICHIERS[cle];
    if (!f) return;
    const now = ctx.currentTime;
    const ecart = o.ecart != null ? o.ecart : 0.05;
    if (dernierJeu[cle] && now - dernierJeu[cle] < ecart) return;
    const e = espace(o.x, o.y, o.portee || 22);
    if (!e) return;
    const [b0] = busDe(cle);
    if (b0 === 'interface') {
      if (DOUX.has(cle) && now - dernierUI < 0.35) return;
      dernierUI = now;
    }
    dernierJeu[cle] = now;
    let i = (Math.random() * f.length) | 0;
    if (f.length > 1 && i === derniere[cle]) i = (i + 1) % f.length;
    derniere[cle] = i;
    const [b, base] = busDe(cle);
    const prio = o.prio != null ? o.prio : (b === 'interface' ? 3 : 1);
    tampon(f[i]).then((buf) => {
      if (!ctx) return;
      voix = voix.filter((v) => v.fin > ctx.currentTime);
      if (voix.length >= MAX_VOIX) {
        const faible = voix.reduce((a2, c) => (a2.prio <= c.prio ? a2 : c));
        if (faible.prio > prio) return;
        try { faible.src.stop(); } catch (err) { /* déjà fini */ }
        voix.splice(voix.indexOf(faible), 1);
      }
      const s = ctx.createBufferSource(); s.buffer = buf;
      const varie = o.varie != null ? o.varie : (b === 'interface' || b === 'musique' ? 0 : 0.04);
      s.playbackRate.value = (o.vitesse || 1) * (1 + hasard(-varie, varie));
      const g = ctx.createGain(); g.gain.value = base * (o.gain != null ? o.gain : 1) * e.g * (b === 'interface' ? 1 : hasard(0.88, 1));
      let sortie = g;
      if (ctx.createStereoPanner && e.pan) { const p = ctx.createStereoPanner(); p.pan.value = e.pan; g.connect(p); sortie = p; }
      sortie.connect(bus[b]); s.connect(g);
      const t0 = ctx.currentTime + (o.delai || 0);
      const depuis = clamp(o.depuis || 0, 0, buf.duration - 0.01);
      s.start(t0, depuis);
      voix.push({ src: s, fin: t0 + (buf.duration - depuis) / s.playbackRate.value, prio });
      if (DUCK.has(cle)) effaceMusique(0.35, buf.duration * 0.8);
    }).catch(() => {});
  }

  /* ---------- les boucles (ambiances, machines, musique) ---------- */

  const boucles = new Map();   // nom → { cle, gain, pan, src, cible, demarre }
  function boucle(nom, cle, cible, fondu = 2, pan = 0) {
    if (!ctx) return;
    let b = boucles.get(nom);
    if (!b) {
      if (cible <= 0.001) return;
      const [bs, base] = busDe(cle);
      b = { cle, base, gain: ctx.createGain(), pan: ctx.createStereoPanner ? ctx.createStereoPanner() : null, src: null, cible: 0, charge: false };
      b.gain.gain.value = 0;
      if (b.pan) { b.gain.connect(b.pan); b.pan.connect(bus[bs]); } else b.gain.connect(bus[bs]);
      boucles.set(nom, b);
    }
    if (b.pan) b.pan.pan.setTargetAtTime(pan, ctx.currentTime, 0.15);
    const v = cible * b.base;
    if (Math.abs(v - b.cible) < 0.004 && (b.src || b.charge || v <= 0.001)) return;
    b.cible = v;
    rampe(b.gain.gain, v, fondu);
    if (v > 0.001 && !b.src && !b.charge) {
      b.charge = true;
      tampon(FICHIERS[cle][0]).then((buf) => {
        b.charge = false;
        if (b.src || b.cible <= 0.001) return;
        const s = ctx.createBufferSource(); s.buffer = buf; s.loop = true; s.connect(b.gain);
        s.start(0, Math.random() * buf.duration);
        b.src = s;
      }).catch(() => { b.charge = false; });
    }
    clearTimeout(b.dort);
    if (v <= 0.001) b.dort = setTimeout(() => { if (b.src && b.cible <= 0.001) { try { b.src.stop(); } catch (e) { /* fini */ } b.src = null; } }, fondu * 1000 + 200);
  }

  /* ---------- la musique : par moments, puis le monde seul ---------- */

  const MUS = { cle: null, depuis: 0, reposJusqua: 0 };
  function musique(voulue) {
    if (!ctx) return;
    const now = ctx.currentTime;
    let cle = R.mode === 'coupee' ? null : voulue;
    if (cle && R.mode === 'intermittente') {
      if (now < MUS.reposJusqua) cle = null;
      else if (MUS.cle && now - MUS.depuis > MUS.duree) { MUS.reposJusqua = now + hasard(70, 160); cle = null; }
    }
    if (cle === MUS.cle) return;
    if (MUS.cle) boucle('musique:' + MUS.cle, MUS.cle, 0, 6);
    MUS.cle = cle;
    if (cle) { MUS.depuis = now; MUS.duree = hasard(110, 190); boucle('musique:' + cle, cle, 1, 5); }
  }

  /* ---------- ce qu'il y a sous le personnage ---------- */

  function sceneFerme() {
    const FS = global.FarmStage && global.FarmStage.scene ? global.FarmStage.scene() : null;
    return FS && FS.ready ? FS : null;
  }
  // le biome du grand monde sous (x, y), « ferme » sur la ferme, null si pas encore fait
  function biome(FS, x, y) {
    const M = FS.ctx && FS.ctx.monde, K = global.CarteKit;
    if (!M || !K || !K.REGION) return 'ferme';
    const c = Math.floor(x / T), r = Math.floor((y - 1) / T), F = M.ferme, N = K.REGION.tuiles;
    if (c >= F.X && r >= F.Y && c < F.X + F.LARGEUR && r < F.Y + F.HAUTEUR) return 'ferme';
    const reg = M.region(Math.floor(c / N), Math.floor(r / N));
    if (!reg) return null;
    const k = (r - reg.cy0) * reg.cl + c - reg.cx0;
    return k >= 0 && k < reg.biome.length ? M.biomes[reg.biome[k]] : null;
  }
  const PAS_BIOME = { plage: 'sable', foret: 'feuilles', montagne: 'pierre', sommet: 'pierre', falaise: 'pierre', lac: 'eau', riviere: 'eau', mer: 'eau', marais: 'terre', lande: 'herbe' };
  function sol(x, y) {
    const J = global.CarteJeu;
    if (J && J.affichee && J.affichee() === 'grotte') return 'pierre';
    const FS = sceneFerme();
    if (!FS) return 'herbe';
    const t = FS.tileAtPoint ? FS.tileAtPoint(x, y - 1) : -1;
    if (t >= 0) {
      if (FS.floors && FS.floors.has(t)) return 'bois';
      if (FS.pathCells && FS.pathCells.has(t)) return 'terre';
      if (FS.dirt && FS.dirt.has(t)) return 'terre';
    }
    const g = FS.ambient && FS.ambient.ground ? FS.ambient.ground() : null;
    if (g && g.water && g.water.has(Math.floor(x / T) * T + ',' + Math.floor((y - 1) / T) * T)) return 'eau';
    const b = biome(FS, x, y);
    return (b && PAS_BIOME[b]) || 'herbe';
  }

  /* ---------- le directeur : les ambiances, 4 fois par seconde ---------- */

  // cloche douce autour d'une heure (cycle de 24 h)
  const cloche = (h, c, w) => Math.max(0, 1 - Math.abs(((h - c + 36) % 24) - 12) / w);
  const etat = { heure: 8, poules: false, prochain: {}, aff: null, eaux: null, eauxN: 0 };
  function bientot(cle, a, b) {
    const now = ctx.currentTime;
    if (!etat.prochain[cle]) { etat.prochain[cle] = now + hasard(a * 0.3, b); return false; }
    if (now < etat.prochain[cle]) return false;
    etat.prochain[cle] = now + hasard(a, b);
    return true;
  }
  // la plus proche d'une liste de { x, y } (et sa distance en cases)
  function proche(liste, p) {
    let best = null, bd = Infinity;
    for (const o of liste) { const d = Math.hypot(o.x - p.x, o.y - p.y); if (d < bd) { bd = d; best = o; } }
    return best ? { o: best, d: bd / T } : null;
  }
  // une source qui tourne : son niveau et son panoramique selon la distance
  function source(nom, cle, o, p, portee, niveau = 1) {
    if (!o || !p) { boucle(nom, cle, 0, 1.5); return; }
    const e = espace(o.x, o.y, portee);
    boucle(nom, cle, e ? e.g * niveau : 0, 0.8, e ? e.pan : 0);
  }
  const NATURE = ['oiseaux_matin', 'oiseaux_jour', 'grillons_soir', 'grillons_nuit', 'vent', 'grenouilles', 'mer', 'lac', 'riviere', 'foret', 'montagne', 'grotte'];
  const SOURCES = ['moulin', 'meule', 'feu', 'pompe', 'asperseur', 'robot', 'abeilles', 'hameau', 'mare'];
  const CRI = { aigle: ['aigle', 1], mouette: ['aigle', 1.45], cygne: ['cygne', 1], canard: ['cygne', 1.35], ecureuil: ['ecureuil', 1],
    marmotte: ['marmotte', 1], dauphin: ['dauphin', 1], bouquetin: ['bouquetin', 1], lievre: ['lievre', 1], lapin: ['lievre', 1.15],
    renard: ['chien', 1.5], chevreuil: ['lievre', 0.8], perdrix: ['oiseau', 0.8] };

  function directeur() {
    if (!ctx || ctx.state !== 'running') return;
    const J = global.CarteJeu, aff = J && J.affichee ? J.affichee() : null;
    const FS = sceneFerme(), m = FS && FS.ctx ? FS.ctx.lastModel : null;
    const hote = global.FermeHote && global.FermeHote.maintenant ? global.FermeHote.maintenant() : null;
    const h = m && typeof m.heure === 'number' ? m.heure : hote && typeof hote.heure === 'number' ? hote.heure : etat.heure;
    etat.heure = h;
    const niv = {};
    for (const k of NATURE) niv[k] = 0;
    const p = auditeur();

    if (aff === 'grotte') {
      niv.grotte = 1;
      for (const k of NATURE) boucle('n:' + k, k, niv[k], 3);
      for (const k of SOURCES) boucle('s:' + k, k === 'meule' ? 'moulin' : k === 'mare' ? 'lac' : k, 0, 1.5);
      musique('musique_mine');
      return;
    }

    // dehors : l'heure fait la nature (oiseaux le matin et le jour, grillons le soir et la nuit)
    const dort = !!(m && m.dort);
    niv.oiseaux_matin = cloche(h, 7, 3);
    niv.oiseaux_jour = clamp(cloche(h, 13.5, 6.5) * 1.2, 0, 1);
    niv.grillons_soir = cloche(h, 20, 2.5);
    niv.grillons_nuit = clamp(cloche(h, 1.5, 5.5) * 1.3, 0, 1);
    niv.vent = 0.45 + 0.2 * cloche(h, 1, 6);
    const nuit = niv.grillons_nuit > 0.3 || h < 5.5 || h >= 21;

    // le biome sous lui
    const b = FS && p ? biome(FS, p.x, p.y) : 'ferme';
    if (b === 'mer' || b === 'plage') { niv.mer = 1; niv.oiseaux_jour *= 0.4; niv.oiseaux_matin *= 0.4; niv.grillons_nuit *= 0.4; }
    else if (b === 'falaise') { niv.mer = 0.6; niv.montagne = 0.5; }
    else if (b === 'foret') { niv.foret = 1; niv.oiseaux_jour = Math.max(niv.oiseaux_jour, 0.6 * (1 - niv.grillons_nuit)); }
    else if (b === 'marais') { niv.lac = 0.5; niv.grenouilles = nuit ? 1 : 0.25; }
    else if (b === 'montagne' || b === 'sommet') { niv.montagne = b === 'sommet' ? 1 : 0.75; niv.oiseaux_jour *= 0.3; niv.oiseaux_matin *= 0.3; niv.grillons_nuit *= 0.2; niv.grillons_soir *= 0.2; niv.vent *= 0.4; }
    else if (b === 'lac') niv.lac = 1;
    else if (b === 'riviere') niv.riviere = 1;
    else if (b === 'lande') niv.vent += 0.3;

    // l'eau du grand monde autour de lui (à 5 cases dans 8 directions)
    if (FS && p && FS.eauMondeSous && b !== 'ferme') {
      let n = { mer: 0, lac: 0, riviere: 0 };
      for (let a = 0; a < 8; a++) {
        const w = FS.eauMondeSous(p.x + Math.cos(a * Math.PI / 4) * 5 * T, p.y + Math.sin(a * Math.PI / 4) * 5 * T);
        if (w) n[w]++;
      }
      niv.mer = Math.max(niv.mer, n.mer / 5); niv.lac = Math.max(niv.lac, n.lac / 5); niv.riviere = Math.max(niv.riviere, n.riviere / 4);
    }

    // sous un toit (une pièce close, un hameau) : le dehors s'étouffe ; endormi : un peu aussi
    let dedans = false;
    if (FS && p && FS.toits && FS.tileAtPoint) {
      const t = FS.tileAtPoint(p.x, p.y - 1);
      dedans = FS.toits.some((r) => r.dedans && r.dedans.has(t));
    }
    const etouffe = (dedans ? 0.3 : 1) * (dort ? 0.7 : 1) * (aff ? 1 : 0.5);
    for (const k of NATURE) boucle('n:' + k, k, clamp(niv[k], 0, 1) * etouffe, 3);

    // ce qui tourne sur la ferme
    if (FS && p) {
      const blocs = FS.blocks ? Array.from(FS.blocks.values()) : [];
      const meules = FS.meuleOn ? blocs.filter((o) => o.sorte === 'meule') : [];
      const fours = FS.fireOn ? blocs.filter((o) => o.sorte === 'four') : [];
      const tour = m && m.moulinTour && m.moulinTour.enMarche ? m.moulinTour : null;
      source('s:moulin', 'moulin', tour ? { x: (tour.c0 + tour.c1 + 1) / 2 * T, y: (tour.r0 + tour.r1 + 1) / 2 * T } : null, p, 22);
      const pm = proche(meules, p); source('s:meule', 'moulin', pm && pm.o, p, 10, 0.6);
      const pf = proche(fours, p); source('s:feu', 'feu', pf && pf.o, p, 9);
      source('s:pompe', 'pompe', m && m.pompeEnMarche && (FS.pump || FS.well) ? (FS.pump || FS.well) : null, p, 10);
      const asp = FS.sprinklers ? Array.from(FS.sprinklers.values()).filter((o) => o.on) : [];
      const pa = proche(asp, p); source('s:asperseur', 'asperseur', pa && pa.o, p, 12);
      source('s:robot', 'robot', FS.bot && FS.bot.m && FS.bot.m.etat === 'travail' ? FS.bot : null, p, 12);
      const ruches = FS.ruchesAbeilles && h >= 7 && h < 19.5 ? Array.from(FS.ruchesAbeilles.values()) : [];
      const pr = proche(ruches, p); source('s:abeilles', 'abeilles', pr && pr.o, p, 8);

      // les mares et étangs de la ferme (cases d'eau ; liste faite une fois)
      const eaux = FS.waters ? FS.waters() : null;
      if (eaux && eaux.size !== etat.eauxN) {
        etat.eauxN = eaux.size;
        etat.eaux = [];
        for (const w of eaux.values()) for (const k of w.cells) { const [x, y] = k.split(',').map(Number); etat.eaux.push({ x: x + T / 2, y: y + T / 2 }); }
      }
      const pe = etat.eaux && etat.eaux.length ? proche(etat.eaux, p) : null;
      source('s:mare', 'lac', pe && pe.o, p, 9, 0.8);
      if (pe && pe.d < 10 && nuit) boucle('n:grenouilles', 'grenouilles', (1 - pe.d / 10) * etouffe, 3);

      // les hameaux : leurs bruits de travail, le jour
      const toitsH = [];
      if (FS.hameauxVus) for (const hm of FS.hameauxVus.values()) for (const tt of (hm.toits || [])) if (tt.cheminee) toitsH.push(tt.cheminee);
      const ph = toitsH.length ? proche(toitsH, p) : null;
      source('s:hameau', 'hameau', ph && ph.o, p, 30, h >= 7 && h < 19 ? 1 : 0.15);

      // les bêtes de la ferme, de temps en temps (le jour, dehors)
      if (FS.beasts && FS.beastDay !== false && !dort) {
        const parSorte = {};
        for (const o of FS.beasts.values()) (parSorte[o.kind] = parSorte[o.kind] || []).push(o);
        etat.poules = !!parSorte.poule;
        const CRIS = { poule: ['poule', 6, 16], vache: ['vache', 18, 40], mouton: ['mouton', 14, 32], cheval: ['cheval', 35, 80] };
        for (const k in parSorte) {
          const c = CRIS[k]; if (!c) continue;
          const pb = proche(parSorte[k], p);
          if (pb && pb.d < 18 && bientot('bete:' + k, c[1], c[2])) {
            const o = parSorte[k][(Math.random() * parSorte[k].length) | 0];
            joue(c[0], { x: o.x, y: o.y, portee: 20, ecart: 2 });
          }
        }
      }
      // le chat et le chien de la famille
      const st = FS.ambient && FS.ambient.stats ? FS.ambient.stats() : null;
      if (st && st.compagnons) for (const cp of st.compagnons) {
        const sorte = /chien/.test(cp.planche) ? 'chien' : /chat/.test(cp.planche) ? 'chat' : null;
        if (sorte && !cp.nuit && bientot('compagnon:' + sorte, 40, 110)) joue(sorte, { x: cp.x, y: cp.y, portee: 16, ecart: 5 });
      }
      // la faune du grand monde, près de la vue
      if (FS.fauneEtat && FS.fauneEtat.betes) for (const bt of FS.fauneEtat.betes) {
        if (!bt.img || !bt.e) continue;
        const c = CRI[bt.e.cle];
        if (!c || !bientot('faune:' + bt.e.cle, 14, 35)) continue;
        if (Math.hypot(bt.x - p.x, bt.y - p.y) / T < 18) joue(c[0], { x: bt.x, y: bt.y, vitesse: c[1], portee: 22, ecart: 4 });
      }
    }

    // les petits oiseaux du jour, la chouette la nuit
    if (!dort && !dedans && b !== 'mer' && b !== 'sommet') {
      if (!nuit && h > 5.5 && bientot('oiseau', 4, 12)) joue('oiseau', { x: p ? p.x + hasard(-12, 12) * T : null, y: p ? p.y + hasard(-10, 10) * T : null, portee: 18, gain: hasard(0.4, 1) });
      if (nuit && bientot('chouette', 35, 80)) joue('chouette', { x: p ? p.x + hasard(-15, 15) * T : null, y: p ? p.y - 8 * T : null, portee: 22 });
    }

    // la musique : le matin et le jour, le soir, la nuit ; rien pendant le sommeil
    musique(dort ? null : h >= 5.5 && h < 17 ? 'musique_matin' : h >= 17 && h < 21 ? 'musique_soir' : 'musique_nuit');
  }

  /* ---------- aides pour les scènes ---------- */

  // un pas du personnage (x, y : ses pieds) ; en selle : les sabots ou le pédalier
  let foulee = 0, montureVue = null, pedaleJusqua = 0;
  function pas(x, y, monture, roule) {
    if (!ctx) return;
    if (monture !== montureVue) {
      montureVue = monture;
      if (monture === 'cheval') joue('ebrouement', { gain: 0.7 });
      if (monture === 'triporteur') joue('sonnette', { gain: 0.6 });
    }
    const s = sol(x, y);
    if (monture === 'cheval') {
      const f = Math.floor(roule / 28);
      if (f !== foulee) { foulee = f; joue(s === 'pierre' ? 'sabots_pierre' : s === 'herbe' || s === 'feuilles' ? 'sabots_herbe' : 'sabots_terre', { ecart: 0.2 }); }
      return;
    }
    if (monture === 'triporteur') {
      pedaleJusqua = ctx.currentTime + 0.35;
      boucle('pedalier', 'pedalier', 1, 0.15);
      clearTimeout(pas.t); pas.t = setTimeout(() => { if (ctx.currentTime >= pedaleJusqua - 0.01) boucle('pedalier', 'pedalier', 0, 0.3); }, 400);
      return;
    }
    joue('pas_' + s, { ecart: 0.12, varie: 0.06 });
  }

  // les gains ramassés : le bon bruit selon ce qui est pris ({ item: n })
  function prise(items, o) {
    if (ctx && dernierJeu.prise && ctx.currentTime - dernierJeu.prise < 1.5) return;   // un poisson : la prise a déjà fait son bruit
    const ks = Object.keys(items || {}).join(' ');
    if (/minerai|fer|cuivre|or\b|argent|charbon|amethyste|cristal|gemme/.test(ks)) joue('pris_minerai', o);
    else if (/pierre|caillou|silex/.test(ks)) joue('pris_pierre', o);
    else if (/bois|buche|branche|planche|pomme_de_pin|gland/.test(ks)) joue('pris_bois', o);
    else if (/oeuf/.test(ks)) joue('oeuf', o);
    else if (/lait/.test(ks)) joue('lait', o);
    else if (/laine/.test(ks)) joue('tonte', o);
    else joue('pris_herbe', o);
  }

  // le cri d'une bête du grand monde (touchée, ou qui fuit)
  function cri(cle, x, y, gain = 1) {
    const c = CRI[cle];
    if (c) joue(c[0], { x, y, vitesse: c[1], gain, portee: 22, ecart: 1.5 });
  }

  // 6 h : la ritournelle du jour, et le coq s'il y a des poules sur la ferme
  function matin() {
    joue('nouveau_jour');
    if (etat.poules) joue('coq', { delai: 1.4 });
  }

  global.FermeSon = {
    joue, pas, prise, cri, matin, boucle, debloque,
    reglages: () => Object.assign({}, R), regle,
    pret: () => !!(ctx && ctx.state === 'running'),
    // ce qui tourne en ce moment (les boucles audibles et leur niveau), pour les tests et le débogage
    boucles: () => Array.from(boucles, ([nom, b]) => [nom, Math.round(b.cible * 100) / 100]).filter(([, v]) => v > 0),
    cles: () => Object.keys(FICHIERS),
  };
})(window);
