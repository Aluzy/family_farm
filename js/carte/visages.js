/* carte/visages.js — les expressions du visage des personnages sur les cartes (window.CarteVisages).
 *
 * Chantier « couches », étape E3 (docs/personnage-couches.md). Le visage d'un personnage est un petit
 * calque posé sur son image : une tuile de 8 × 5 px de l'atlas assets/personnages/visages.png (écrit par
 * scripts/personnage/expressions.py), la zone du visage telle qu'elle apparaît sur sa planche, avec une
 * expression. visages.json dit, pour chaque case des planches (et chaque âge), où est la zone, ou qu'elle
 * n'est pas dégagée (de dos, un bras ou un outil devant le visage) : rien n'est posé.
 *
 * L'expression, à chaque image :
 *   - la case montre déjà la sienne (le sommeil : les yeux fermés) : rien n'est posé ;
 *   - une réaction (amis.js : joie, colère, peur, tristesse, dégoût) : son expression, le temps de la
 *     réaction (REACTIONS ; une joie forte, un cadeau, fait rire) ;
 *   - sinon, l'expression de fond : concentré pendant les gestes de travail (TRAVAIL), fatigué le soir et
 *     la nuit (de SOIR à MATIN, l'heure du modèle de la carte), neutre le reste du temps ;
 *   - et il cligne des yeux de temps en temps (pas avec « réduire les animations »).
 * Neutre : rien n'est posé (l'image du personnage est déjà son visage neutre).
 *
 * API : CarteVisages.charger(L, v)        dans le preload d'une scène : l'atlas et sa table ;
 *       CarteVisages.suivre(scène, s, o)  après avoir placé l'image `s` d'un personnage (sa case, sa place,
 *                                         son sens, sa profondeur) : son calque visage la suit. o (facultatif) :
 *                                         { reaction, fort, atlas: { key, base } } (atlas : la clé d'un atlas
 *                                         de ce personnage recoloré, amis.js, ses 18 tuiles à partir de `base`) ;
 *       CarteVisages.nom(key)             le nom du personnage d'une planche (perso_7, perso_7~joie,
 *                                         fermier → perso_07, perso_07, perso_01), ou null ;
 *       CarteVisages.expression(…)        le choix de l'expression (pour les essais).
 * Le calque est détruit avec l'image ; une image qui n'a pas été suivie pendant une image du jeu (hors de la
 * vue, rentrée) voit son calque caché. Il porte `personnage` (caché en mode Construire, farm-stage.js).
 *
 * Script classique, chargé après js/carte/kit.js.
 */
(function (global) {
  'use strict';

  const K = global.CarteKit;
  const TRAVAIL = /^(houe|hache|pioche|peche|plante|arrose|jette|faux)_/;
  const SOIR = 19, MATIN = 6;                 // h : fatigué de SOIR à MATIN
  const CLIGNE_MS = 130;                      // un clignement
  const CLIGNE_ENTRE = [2200, 6500];          // ms entre deux clignements (au hasard)
  // la réaction (amis.js) → l'expression ; le dégoût n'a pas la sienne : les yeux plissés, la bouche de côté
  const REACTIONS = { joie: 'joie', colere: 'colere', peur: 'peur', tristesse: 'tristesse', degout: 'concentre' };
  const W = 8, H = 5;

  const reduit = () => !!(K && K.reduit && K.reduit());
  const hasard = (a, b) => a + Math.random() * (b - a);

  function charger(L, v) {
    L.spritesheet('visages', v('personnages/visages.png'), { frameWidth: W, frameHeight: H });
    L.json('visages', v('personnages/visages.json'));
  }

  function nom(key) {
    const base = String(key || '').split('~')[0];
    if (base === 'fermier') return 'perso_01';            // (la planche par défaut : la fermière, perso_01)
    const m = /^(perso|enfant)_(\d+)$/.exec(base);
    return m ? `${m[1]}_${m[2].padStart(2, '0')}` : null;
  }

  // L'expression à montrer. `cas` : le nom de la case ; `natif` : l'expression qu'elle montre déjà ; `heure` :
  // celle du modèle (ou null) ; `etat` : le clignement de ce visage ({ prochain, jusqua }), mis à jour.
  function expression(cas, natif, heure, o, etat, now) {
    if (natif !== 'neutre') return natif;
    if (o && o.reaction && REACTIONS[o.reaction]) return o.reaction === 'joie' && o.fort ? 'rire' : REACTIONS[o.reaction];
    let e = TRAVAIL.test(cas) ? 'concentre' : heure != null && (heure >= SOIR || heure < MATIN) ? 'fatigue' : 'neutre';
    if (etat && !reduit()) {
      if (!etat.prochain) etat.prochain = now + hasard(...CLIGNE_ENTRE);
      if (now >= etat.prochain) { etat.jusqua = now + CLIGNE_MS; etat.prochain = now + CLIGNE_MS + hasard(...CLIGNE_ENTRE); }
      if (now < etat.jusqua) e = 'fermes';
    }
    return e;
  }

  // Par scène : la table, le rang de chaque personnage, les calques (cachés après une image sans suivi).
  function pour(scene) {
    if (scene.visagesEtat) return scene.visagesEtat;
    const E = scene.visagesEtat = { rangs: null, calques: new Set(), image: 0 };
    scene.events.on('postupdate', () => {
      E.image++;
      for (const f of E.calques) if (f.vu !== E.image && f.visible) f.setVisible(false);
    });
    return E;
  }

  function suivre(scene, s, o) {
    if (!s || !s.active || !scene.textures.exists('visages')) return;
    const J = scene.cache.json.get('visages'), C = scene.cache.json.get('perso_cases');
    if (!J || !C) return;
    const E = pour(scene);
    if (!E.rangs) E.rangs = new Map(J.personnages.map((n, i) => [n, i]));
    // (une planche faite dans le jeu, js/carte/planches.js : customData.nom, un personnage du catalogue coiffé de son
    // équipement, étape E7 ; customData.visages, une apparence à elle et ses tuiles, étape E6)
    const cd = scene.textures.get(String(s.texture.key).split('~')[0]).customData || {};
    const n = nom(s.texture.key) || cd.nom || null, rang = n ? E.rangs.get(n) : undefined;
    const cas = C.frames[+s.frame.name];
    const propre = rang === undefined ? cd : {};
    if (propre.visages && scene.textures.exists(propre.visages) && !(o && o.atlas)) o = { ...(o || {}), atlas: { key: propre.visages, base: 0 } };
    const age = propre.visages ? propre.age : n && n.startsWith('enfant_') ? 'enfant' : 'adulte';
    const z = (rang !== undefined || propre.visages) && cas ? J.cases[age][cas] : null;
    let f = s.visage;
    const now = performance.now();
    const M = scene.ctx && scene.ctx.lastModel;
    const etat = s.visageEtat || (s.visageEtat = {});
    const e = z && s.visible ? expression(cas, z.expr, M ? M.heure : null, o, etat, now) : null;
    if (!e || e === z.expr) { if (f) f.setVisible(false); return; }
    if (!f) {
      f = s.visage = scene.add.image(0, 0, 'visages', 0).setOrigin(Math.floor(W / 2) / W, Math.floor(H / 2) / H);
      f.personnage = true;
      E.calques.add(f);
      s.once('destroy', () => { E.calques.delete(f); f.destroy(); });
    }
    const col = J.expressions.indexOf(e) * J.vues.length + J.vues.indexOf(z.vue);
    const A = o && o.atlas && scene.textures.exists(o.atlas.key) ? o.atlas : null;
    if (!A && rang === undefined) { f.setVisible(false); return; }
    const key = A ? A.key : 'visages', frame = A ? A.base + col : rang * J.expressions.length * J.vues.length + col;
    if (f.texture.key !== key || f.frame.name !== frame) f.setTexture(key, frame);
    // la tuile dans la case (retournée avec elle), par rapport à l'origine de l'image ; tournée avec elle (un lit)
    const x = s.flipX ? s.width - z.x - W : z.x;
    const dx = (x + Math.floor(W / 2) - s.width * s.originX) * s.scaleX, dy = (z.y + Math.floor(H / 2) - s.height * s.originY) * s.scaleY;
    const c = Math.cos(s.rotation), si = Math.sin(s.rotation);
    f.setPosition(s.x + dx * c - dy * si, s.y + dx * si + dy * c).setRotation(s.rotation).setScale(s.scaleX, s.scaleY)
      .setFlipX(s.flipX).setDepth(s.depth + 0.005).setAlpha(s.alpha).setVisible(true);
    f.vu = E.image + 1;
  }

  global.CarteVisages = { charger, suivre, nom, expression, REACTIONS, TRAVAIL, SOIR, MATIN };
})(window);
