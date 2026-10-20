/* carte/gestes.js — les gestes du joueur et ce qu'ils font voir, pareils sur toutes les cartes
 * (CarteKit.APPUI, doubleAppui, MANETTE, manette, astuceMarche, SECOUSSE, secousse, VIBRATION,
 * vibre, BULLE, bulleGain).
 *
 * La ferme (js/farm-stage.js, js/carte/ferme/), la ville et les cartes qu'on rejoint par elle
 * (js/ville-carte.js, js/carte/ville/) et l'infra-monde (js/infra-monde.js) se jouent de la même
 * façon :
 *
 *   - la caméra suit le personnage ;
 *   - un appui sur ce qui se touche (un arbre la hache en main, un rocher ou un minerai la
 *     pioche en main, l'eau la canne en main, une trouvaille, un bâtiment…) : le personnage y va
 *     et fait son geste, un coup par appui ;
 *   - le doigt posé puis glissé (ou la souris, bouton enfoncé) : il marche dans la direction du
 *     glissement tant que le doigt reste posé, et tourne avec lui (manette ; rien ne s'affiche
 *     sous le doigt : le geste s'explique une fois, au premier essai de marche, astuceMarche) ;
 *   - un double appui (ou un double clic) ailleurs : il y marche (rien ne marque l'endroit) ;
 *   - ce qu'il prend (bois, pierre, minerai, poisson, trouvaille, récolte) monte au-dessus de lui
 *     dans une bulle « +1 🪵 » (bulleGain) ;
 *   - la vue tremble un peu quand un arbre tombe et à chaque coup de pioche (secousse) ;
 *   - le téléphone vibre à la touche d'un poisson et à chaque coup de hache, de pioche ou de
 *     houe (vibre ; Android : l'API Vibration n'existe pas sur iPhone, rien n'y vibre).
 *
 * Script classique, chargé après js/carte/kit.js (voir jeu.html).
 */
(function (global) {
  'use strict';

  const K = global.CarteKit;

  // Un appui : moins de `glisse` px CSS entre l'appui et le relâchement (au-delà, c'est un
  // glissement). Un double appui : deux appuis à moins de `doubleMs` ms et de `doublePx` px CSS
  // l'un de l'autre.
  const APPUI = { glisse: 8, doubleMs: 300, doublePx: 30 };

  // Le détecteur de double appui d'une carte. appui(wx, wy, zoom) (le point en px de carte, le
  // zoom de la caméra) : true si cet appui est le second d'un double appui (il est alors oublié :
  // un troisième appui recommence) ; oublie() : le prochain appui sera le premier.
  function doubleAppui() {
    let avant = null;
    return {
      appui(wx, wy, zoom) {
        const now = global.performance.now();
        const pres = avant && Math.hypot(wx - avant.x, wy - avant.y) <= (APPUI.doublePx * K.ratio()) / (zoom || 1);
        if (avant && now - avant.t <= APPUI.doubleMs && pres) { avant = null; return true; }
        avant = { t: now, x: wx, y: wy };
        return false;
      },
      oublie() { avant = null; },
    };
  }

  // La manette au doigt : le doigt posé puis glissé de plus de APPUI.glisse px CSS, le
  // personnage marche dans la direction du glissement (du point d'appui vers le doigt) tant que
  // le doigt reste posé ; elle suit le doigt qui tourne. Le point d'appui reste à `rayon` px CSS
  // au plus du doigt (il le suit au-delà : revenir en arrière répond tout de suite). Rien ne
  // s'affiche : la carte reste libre.
  const MANETTE = { rayon: 36 };

  // scene : la carte ; peut(pointeur), lu quand le glissement commence : false, le glissement
  // n'est pas une marche (la houe qui laboure, la vue qu'on fait glisser…). dir() : la direction
  // ({ x, y }, de longueur 1) ou null ; active() : un glissement est une marche ; stop() : elle
  // s'arrête (le doigt n'y fait plus rien jusqu'au prochain appui).
  function manette(scene, peut) {
    let m = null;                  // l'appui en cours : { id, x, y, active, dx, dy }
    const I = scene.input;
    I.on('pointerdown', (p) => { if (!m || m.id !== p.id) m = { id: p.id, x: p.x, y: p.y, active: false, dx: 0, dy: 0 }; });
    I.on('pointermove', (p) => {
      if (!m || m.id !== p.id) return;
      if (!p.isDown) { m = null; return; }   // relâché hors de la page
      const R = K.ratio();
      let dx = p.x - m.x, dy = p.y - m.y, l = Math.hypot(dx, dy);
      if (!m.active) {
        if (l < APPUI.glisse * R) return;
        if (m.non || (peut && !peut(p))) { m.non = true; return; }
        m.active = true;
        appris();
      }
      const max = MANETTE.rayon * R;
      if (l > max) { m.x = p.x - (dx / l) * max; m.y = p.y - (dy / l) * max; dx = p.x - m.x; dy = p.y - m.y; l = max; }
      m.dx = dx / l; m.dy = dy / l;
    });
    const fin = (p) => { if (m && m.id === p.id) m = null; };
    I.on('pointerup', fin);
    I.on('pointerupoutside', fin);
    scene.events.on('sleep', () => { m = null; });
    return {
      dir: () => (m && m.active ? { x: m.dx, y: m.dy } : null),
      active: () => !!(m && m.active),
      stop() { if (m) { m.active = false; m.non = true; } },
    };
  }

  // Le geste s'apprend une fois (par appareil : localStorage) : au premier essai de marche au
  // doigt d'une autre façon (un appui ou un double appui sur le sol, `pointeur` : celui de
  // Phaser), une bulle l'explique (FermeHote.say). Le joueur qui a déjà glissé pour marcher
  // ne la voit jamais. Rien à la souris.
  const ASTUCE = { cle: 'ff-astuce-marche', texte: '👆 Pour marcher, pose le doigt sur la carte et fais-le glisser vers où aller : le personnage avance tant que le doigt reste posé, et tourne avec lui.' };
  function dejaVu() { try { return global.localStorage.getItem(ASTUCE.cle) === '1'; } catch (e) { return true; } }
  function appris() { try { global.localStorage.setItem(ASTUCE.cle, '1'); } catch (e) { /* ignoré */ } }
  function astuceMarche(pointeur) {
    if (!pointeur || !pointeur.wasTouch || dejaVu()) return false;
    const H = global.FermeHote;
    if (!H || !H.say) return false;
    appris();
    H.say(ASTUCE.texte);
    return true;
  }

  // La vue tremble un peu : `chute`, un arbre touche le sol ; `coup`, un coup de pioche (un
  // rocher, un minerai). `ms` : sa durée ; `force` : la part de la vue (Phaser, camera.shake).
  // Rien avec « réduire les animations ».
  const SECOUSSE = { chute: { ms: 90, force: 0.003 }, coup: { ms: 70, force: 0.002 }, fort: { ms: 140, force: 0.005 } };
  function secousse(scene, sorte) {
    const s = SECOUSSE[sorte];
    if (!s || K.reduit() || !scene.cameras || !scene.cameras.main) return;
    scene.cameras.main.shake(s.ms, s.force);
  }

  // Le téléphone vibre (navigator.vibrate, ms : une durée, ou vibration, pause, vibration…) :
  // `touche`, un poisson mord ; `hache`, `pioche`, `houe`, un coup de l'outil. Sans l'API
  // (iPhone, ordinateur), rien ; le téléphone peut aussi avoir coupé les vibrations.
  const VIBRATION = { touche: [40, 60, 40], hache: 20, pioche: 25, houe: 10, ramasse: 8, fort: [30, 30, 60] };
  function vibre(sorte) {
    const motif = VIBRATION[sorte];
    const nav = global.navigator;
    if (motif == null || !nav || typeof nav.vibrate !== 'function') return;
    try { nav.vibrate(motif); } catch (e) { /* refusée (pas encore d'appui sur la page) : rien */ }
  }

  // La bulle « +6 🥕 » au-dessus du personnage (DOM, assets/bulle.png : .stage-gain, css/jeu.css).
  // Elle reste `garde` ms puis s'estompe en `fondu` ms en montant un peu ; une prise qui arrive
  // avant qu'elle ait disparu s'y additionne. Sa pointe (à `pointeX` px CSS du bord gauche,
  // `pointeY` px au-dessus du bas) se pose `dessus` px de carte au-dessus des pieds.
  const BULLE = { pointeX: 15, pointeY: 2, garde: 1200, fondu: 1400, dessus: 34, monte: 10 };

  // couche : l'élément (position: absolute, sur la carte) où la bulle se pose ; icone(objet) :
  // l'icône d'un objet du jeu. montre({ objet: qté }) l'affiche ; place(x, y), à chaque image,
  // la pose (x, y : la pointe, en px CSS dans la couche ; null : elle se cache) ; detruit().
  function bulleGain(couche, icone) {
    const el = document.createElement('div');
    el.className = 'stage-gain';
    el.setAttribute('role', 'status');
    el.hidden = true;
    couche.appendChild(el);
    const B = { items: {}, until: 0, fadeAt: 0, w: 0, h: 0 };
    return {
      montre(items) {
        const now = global.performance.now();
        if (now >= B.until) B.items = {};
        for (const [item, qty] of Object.entries(items || {})) if (qty > 0) B.items[item] = (B.items[item] || 0) + qty;
        const texte = Object.entries(B.items).map(([item, qty]) => '+' + qty + ' ' + (icone ? icone(item) : item)).join('  ');
        if (!texte) return;
        el.textContent = texte;
        el.hidden = false;
        el.classList.remove('fade');
        B.fadeAt = now + BULLE.garde;
        B.until = B.fadeAt + BULLE.fondu;
        B.w = 0;
      },
      visible() { return !el.hidden; },
      place(x, y) {
        if (el.hidden) return;
        const now = global.performance.now();
        if (x == null || now >= B.until) { el.hidden = true; el.classList.remove('fade'); B.until = 0; return; }
        if (now >= B.fadeAt && !el.classList.contains('fade')) el.classList.add('fade');
        if (!B.w) { B.w = el.offsetWidth; B.h = el.offsetHeight; }
        const rise = now >= B.fadeAt ? ((now - B.fadeAt) / BULLE.fondu) * BULLE.monte : 0;
        el.style.transform = 'translate(' + Math.round(x - BULLE.pointeX) + 'px,' + Math.round(y - B.h + BULLE.pointeY - rise) + 'px)';
      },
      detruit() { el.remove(); },
    };
  }

  Object.assign(K, { APPUI, doubleAppui, MANETTE, manette, ASTUCE, astuceMarche, SECOUSSE, secousse, VIBRATION, vibre, BULLE, bulleGain });
})(window);
