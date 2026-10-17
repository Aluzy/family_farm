/* carte/gestes.js — les gestes du joueur et ce qu'ils font voir, pareils sur toutes les cartes
 * (CarteKit.APPUI, doubleAppui, anneau, SECOUSSE, secousse, BULLE, bulleGain).
 *
 * La ferme (js/farm-stage.js, js/carte/ferme/), la ville et les cartes qu'on rejoint par elle
 * (js/ville-carte.js, js/carte/ville/) et l'infra-monde (js/infra-monde.js) se jouent de la même
 * façon :
 *
 *   - la caméra suit le personnage ;
 *   - un appui sur ce qui se touche (un arbre la hache en main, un rocher ou un minerai la
 *     pioche en main, l'eau la canne en main, une trouvaille, un bâtiment…) : le personnage y va
 *     et fait son geste, un coup par appui ;
 *   - un double appui (ou un double clic) ailleurs : il y marche, un rond marque un instant
 *     l'endroit où il va (anneau) ;
 *   - ce qu'il prend (bois, pierre, minerai, poisson, trouvaille, récolte) monte au-dessus de lui
 *     dans une bulle « +1 🪵 » (bulleGain) ;
 *   - la vue tremble un peu quand un arbre tombe et à chaque coup de pioche (secousse).
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

  // Le rond qui marque un instant l'endroit où le personnage va (px de carte : son pied), posé
  // sur le sol juste sous lui, puis qui s'efface.
  const ANNEAU = { l: 12, h: 6, couleur: 0xfff1d2, alpha: 0.95, ms: 900, msReduit: 300 };
  function anneau(scene, x, y) {
    const g = scene.add.graphics().setDepth(y - 1);
    g.lineStyle(1, ANNEAU.couleur, ANNEAU.alpha).strokeEllipse(Math.round(x), Math.round(y) - 1, ANNEAU.l, ANNEAU.h);
    scene.tweens.add({ targets: g, alpha: 0, duration: K.reduit() ? ANNEAU.msReduit : ANNEAU.ms, ease: 'Quad.easeIn', onComplete: () => g.destroy() });
    return g;
  }

  // La vue tremble un peu : `chute`, un arbre touche le sol ; `coup`, un coup de pioche (un
  // rocher, un minerai). `ms` : sa durée ; `force` : la part de la vue (Phaser, camera.shake).
  // Rien avec « réduire les animations ».
  const SECOUSSE = { chute: { ms: 90, force: 0.003 }, coup: { ms: 70, force: 0.002 } };
  function secousse(scene, sorte) {
    const s = SECOUSSE[sorte];
    if (!s || K.reduit() || !scene.cameras || !scene.cameras.main) return;
    scene.cameras.main.shake(s.ms, s.force);
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

  Object.assign(K, { APPUI, doubleAppui, ANNEAU, anneau, SECOUSSE, secousse, BULLE, bulleGain });
})(window);
