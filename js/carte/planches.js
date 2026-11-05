/* carte/planches.js — les planches de personnages assemblées depuis leurs couches (window.CartePlanches).
 *
 * Chantier « couches », étape E5 (docs/personnage-couches.md). assets/personnages/couches.json (écrit par
 * scripts/personnage/couches.py --exporter) donne de quoi refaire chaque planche (112 cases de 16 × 32, 8 par
 * rangée : la même que assets/personnages/<nom>.png) à partir de ses éléments :
 *   - les couches communes de chaque case, les mêmes pour tous les personnages d'un âge : les outils derrière et
 *     devant, le bras lointain, les bras qui passent sous le corps, ceux posés dessus (un par un) ; les jambes ;
 *   - les éléments du haut du corps (le corps, le haut, le bas, la coupe, le couvre-chef, la barbe, les lunettes…),
 *     chacun sa grille de 12 × 25 par vue, posée dans la case plus ou moins haut (dy, la pose de la case) ;
 *   - les règles : l'ordre des couches ; quand les bras sont redessinés, le corps et le haut perdent les zones des
 *     bras ; sous une casquette, un bonnet, un chapeau de paille, le haut de la tête est masqué ; endormi, les yeux
 *     fermés ; un bras posé sur la tête (ou le torse) en est détaché par un contour ; le contour de la silhouette ;
 *     un enfant raccourci de quatre rangées ;
 *   - tout est en lettres ; la palette du personnage leur donne leurs couleurs (résolues dans couches.json : rien
 *     n'est à recalculer ici).
 * C'est l'assembleur de scripts/personnage/couches.py, en JS : la planche assemblée est identique, au pixel près, à
 * la planche PNG (tests/engine/personnages-planches.test.mjs, pour les 100 personnages).
 *
 * API : CartePlanches.assembler(C, def, palette)  → { largeur, hauteur, data: Uint8ClampedArray (RGBA) } ;
 *         C : couches.json ; def : { age, elements: ['couche:clé'…], chapeau, jambes } (un personnage de
 *         C.personnages, ou une combinaison nouvelle) ; palette : { lettre: '#rrggbb' } ;
 *       CartePlanches.planche(C, nom)          la planche d'un personnage du catalogue ;
 *       CartePlanches.actif()                  les planches assemblées sont-elles demandées (le réglage, plus bas) ;
 *       CartePlanches.charger(scene, cle, nom, url)  la planche `cle` d'une scène Phaser : assemblée (le réglage
 *                                              actif, couches.json chargé) ou, sinon, le PNG `url` ; → true si elle
 *                                              est déjà là.
 * Le réglage : les planches assemblées sont un essai (le jeu garde ses PNG, identiques) : jeu.html?planches=couches,
 * ou localStorage « ferme-planches » = « couches ».
 *
 * Script classique, sans dépendance ; chargé après js/carte/kit.js.
 */
(function (global) {
  'use strict';

  const PREPARES = new WeakMap();

  // « x,y,lettre;… » → [[x, y, lettre]…] ; « x,y;… » → [[x, y]…]
  function pixels(t) {
    if (!t) return [];
    return t.split(';').map((p) => {
      const i = p.indexOf(','), j = p.indexOf(',', i + 1);
      return j < 0 ? [+p.slice(0, i), +p.slice(i + 1)] : [+p.slice(0, i), +p.slice(i + 1, j), p.slice(j + 1)];
    });
  }

  // couches.json, lu une fois : les textes de pixels en tableaux, les zones en ensembles, les familles des lettres.
  function preparer(C) {
    let P = PREPARES.get(C);
    if (P) return P;
    const W = C.case.w;
    const cle = (x, y) => y * W + x;
    const lire = (o) => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, typeof v === 'string' ? pixels(v) : lire(v)]));
    const famille = new Map();
    for (const [f, lettres] of Object.entries(C.familles)) for (const L of lettres) famille.set(L, f);
    P = {
      W, H: C.case.h, cle,
      famille: (L) => famille.get(String(L).split('×')[0]),
      zones: Object.fromEntries(Object.entries(C.zones).map(([v, z]) => [v, {
        bras: new Set(pixels(z.bras).map(([x, y]) => cle(x, y))),
        mains: new Set(pixels(z.mains).map(([x, y]) => cle(x, y))),
      }])),
      yeuxFermes: pixels(C.yeuxFermes),
      communes: lire(C.communes),
      jambes: lire(C.jambes),
      elements: lire(C.elements),
      ignore: new Set(C.contourIgnore),
    };
    PREPARES.set(C, P);
    return P;
  }

  // Une case, en lettres : un tableau de W × H (lettre ou null), avant le raccourci d'un enfant.
  function caseLettres(C, P, def, nom) {
    const { W, H, cle } = P, M = C.modele;
    const t = C.poses[def.age][nom], couches = P.communes[def.age][nom], v = t.vue, dy = t.dy;
    const px = new Map();
    const poser = (liste) => { if (liste) for (const [x, y, L] of liste) px.set(cle(x, y), L); };
    poser(couches.derriere);
    poser(couches.bras_loin);
    poser(P.jambes[def.age][def.jambes][nom]);
    poser(couches.bras_sous);
    // le haut du corps : chaque élément (dans son ordre), moins les zones des bras pour le corps et le haut quand
    // ils sont redessinés, le masque d'un couvre-chef, les yeux fermés
    const retire = !t.masque ? null : t.masque === 'marche' ? new Set([...P.zones[v].bras, ...P.zones[v].mains]) : P.zones[v].bras;
    const haut = new Map();          // cle(x, y) du modèle → lettre
    for (const e of def.elements) {
      const couche = e.slice(0, e.indexOf(':'));
      if (couche === 'couvre_chef' && M.couvreTete.includes(def.chapeau)) {
        for (const [k, L] of [...haut]) if (Math.floor(k / W) < M.masqueTete && M.masque.includes(P.famille(L))) haut.delete(k);
      }
      const grille = (P.elements[e] || {})[v] || [];
      const ote = retire && M.retire.includes(couche);
      for (const [x, y, L] of grille) {
        if (y >= M.torse || (ote && retire.has(cle(x, y)))) continue;
        haut.set(cle(x, y), L);
      }
    }
    if (t.fermes) for (const [x, y, L] of P.yeuxFermes) if (haut.has(cle(x, y))) haut.set(cle(x, y), L);
    const torse = new Set(), tete = new Set();
    for (const [k, L] of haut) {
      const x = k % W, y = Math.floor(k / W), q = cle(M.x + x, M.y + y + dy);
      px.set(q, L);
      torse.add(q);
      if (y < M.tete) tete.add(q);
    }
    // les bras posés dessus, un par un : un contour les détache de la tête (ou du torse)
    t.bras.forEach((ref, k) => {
      const bras = couches[`bras_dessus:${k}`] || [];
      const dedans = new Set(bras.map(([x, y]) => cle(x, y)));
      const contre = ref === 'tete' ? tete : torse;
      for (const [x, y] of bras) {
        for (const [dx, ddy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const nx = x + dx, ny = y + ddy, q = cle(nx, ny);
          if (nx >= 0 && nx < W && ny >= 0 && ny < H && contre.has(q) && !dedans.has(q)) px.set(q, 'K');
        }
      }
      poser(bras);
    });
    poser(couches.devant);
    // le contour de la silhouette (fermier.Canvas.outline)
    const g = new Array(W * H).fill(null);
    for (const [k, L] of px) g[k] = L;
    const out = g.slice();
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        if (g[cle(x, y)] !== null) continue;
        for (const [dx, ddy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const nx = x + dx, ny = y + ddy;
          if (nx < 0 || nx >= W || ny < 0 || ny >= H) continue;
          const L = g[cle(nx, ny)];
          if (L !== null && !P.ignore.has(L)) { out[cle(x, y)] = 'K'; break; }
        }
      }
    }
    return out;
  }

  // Un enfant : les rangées retirées, le haut tassé vers le bas (chibi.raccourci).
  function raccourci(C, P, g, nom) {
    const E = C.enfant, rangees = new Set(nom.startsWith(E.assis) ? E.rangeesAssis : E.rangees);
    const garde = [];
    for (let y = 0; y < P.H; y++) if (!rangees.has(y)) garde.push(g.slice(y * P.W, (y + 1) * P.W));
    const vide = new Array((P.H - garde.length) * P.W).fill(null);
    return vide.concat(...garde);
  }

  const rgb = new Map();
  function couleur(hex) {
    let c = rgb.get(hex);
    if (!c) { c = [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)]; rgb.set(hex, c); }
    return c;
  }

  function assembler(C, def, palette) {
    const P = preparer(C), COLS = 8, n = C.cases.length;
    const largeur = COLS * P.W, hauteur = Math.ceil(n / COLS) * P.H;
    const data = new Uint8ClampedArray(largeur * hauteur * 4);
    C.cases.forEach((nom, k) => {
      let g = caseLettres(C, P, def, nom);
      if (def.age === 'enfant') g = raccourci(C, P, g, nom);
      const x0 = (k % COLS) * P.W, y0 = Math.floor(k / COLS) * P.H;
      for (let y = 0; y < P.H; y++) {
        for (let x = 0; x < P.W; x++) {
          const L = g[y * P.W + x];
          if (L === null) continue;
          const hex = palette[L] || C.outils[L];
          if (!hex) throw new Error(`CartePlanches : pas de couleur pour « ${L} » (${nom})`);
          const [r, gg, b] = couleur(hex), i = ((y0 + y) * largeur + x0 + x) * 4;
          data[i] = r; data[i + 1] = gg; data[i + 2] = b; data[i + 3] = 255;
        }
      }
    });
    return { largeur, hauteur, data };
  }

  function planche(C, nom) {
    const def = C.personnages[nom];
    if (!def) throw new Error(`CartePlanches : personnage inconnu « ${nom} »`);
    return assembler(C, def, C.palettes[nom]);
  }

  /* ---------- dans le jeu ---------- */

  function actif() {
    try {
      const q = new URLSearchParams(global.location ? global.location.search : '').get('planches');
      if (q) return q === 'couches';
      return !!(global.localStorage && global.localStorage.getItem('ferme-planches') === 'couches');
    } catch (e) {
      return false;
    }
  }

  // Le nom d'un personnage du catalogue d'après la clé de sa planche (perso_7, enfant_12 → perso_07, enfant_12), ou null.
  const nomPlanche = (key) => {
    const m = /^(perso|enfant)_(\d+)$/.exec(String(key));
    return m ? `${m[1]}_${m[2].padStart(2, '0')}` : null;
  };

  // La planche `cle` dans les textures de la scène : assemblée depuis couches.json (le réglage actif, le fichier déjà
  // dans le cache de la scène, sous la clé « couches ») ; sinon le PNG `url` est demandé au chargeur de la scène
  // (à lancer par l'appelant, comme avant). → true si la texture est déjà là.
  function charger(scene, cle, nom, url) {
    if (scene.textures.exists(cle)) return true;
    const C = actif() && scene.cache.json.get('couches');
    const n = nom || nomPlanche(cle);
    if (C && n && C.personnages[n] && global.document) {
      const p = planche(C, n);
      const cv = global.document.createElement('canvas');
      cv.width = p.largeur; cv.height = p.hauteur;
      cv.getContext('2d').putImageData(new ImageData(p.data, p.largeur, p.hauteur), 0, 0);
      scene.textures.addSpriteSheet(cle, cv, { frameWidth: C.case.w, frameHeight: C.case.h });
      return true;
    }
    scene.load.spritesheet(cle, url, { frameWidth: 16, frameHeight: 32 });
    return false;
  }

  global.CartePlanches = { assembler, planche, actif, charger, nomPlanche, pixels };
})(typeof window !== 'undefined' ? window : globalThis);
