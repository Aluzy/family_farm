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
 * API : CartePlanches.assembler(C, def, palette, noms?)  → (noms : seulement ces cases) { largeur, hauteur, data: Uint8ClampedArray (RGBA) } ;
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
      derivees: [...new Set((JSON.stringify(C.communes) + JSON.stringify(C.jambes) + JSON.stringify(C.elements)).match(/[A-Za-z_]+×[0-9.]+/g) || [])],
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
        // (une nuance d'un modèle retouché : la famille de sa base, couches.json « nuances »)
        for (const [k, L] of [...haut]) if (Math.floor(k / W) < M.masqueTete && M.masque.includes(P.famille((def.nuances && def.nuances[L]) || L))) haut.delete(k);
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

  // `noms` (facultatif) : seulement ces cases, dans cet ordre (une vignette : une case, js/ui/apparence.js).
  function assembler(C, def, palette, noms = C.cases) {
    const P = preparer(C), n = noms.length, COLS = Math.min(8, n);
    const largeur = COLS * P.W, hauteur = Math.ceil(n / COLS) * P.H;
    const data = new Uint8ClampedArray(largeur * hauteur * 4);
    noms.forEach((nom, k) => {
      let g = caseLettres(C, P, def, nom);
      if (def.age === 'enfant') g = raccourci(C, P, g, nom);
      const x0 = (k % COLS) * P.W, y0 = Math.floor(k / COLS) * P.H;
      for (let y = 0; y < P.H; y++) {
        for (let x = 0; x < P.W; x++) {
          const L = g[y * P.W + x];
          if (L === null) continue;
          const hex = palette[L] || (C.couleursFixes && C.couleursFixes[L]) || C.outils[L];
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

  /* ---------- une apparence libre (étape E6) : ses éléments, sa palette, ses tuiles de visage ---------- */
  // Le portage exact de scripts/personnage/modeles.py (palette, palette_de, elements) et expressions.py
  // (couleurs, exprimer) : vérifié contre Python (tests/engine/personnages-apparence.test.mjs, les 97 personnages
  // tirés du catalogue et des apparences au hasard).

  // round() de Python : la moitié au pair
  function rond(x) {
    const f = Math.floor(x), d = x - f;
    return d > 0.5 ? f + 1 : d < 0.5 ? f : (f % 2 === 0 ? f : f + 1);
  }
  const mix = (a, b, t) => a.map((x, i) => rond(x * (1 - t) + b[i] * t));
  const mul = (c, k) => c.map((v) => Math.max(0, Math.min(255, rond(v * k))));
  const fonce = (c, k = 0.72) => c.map((v) => Math.trunc(v * k));
  const lumYeux = (c) => 0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2];
  const moyenne = (c) => (c[0] + c[1] + c[2]) / 3;
  const hexRgb = (h) => couleur(h).slice();
  const rgbHex = (c) => '#' + c.map((v) => v.toString(16).padStart(2, '0')).join('');
  const PEAU_FONCEE = 110, ECART_PUPILLE = 40, CHEVEUX_PALES = 150;
  const CONTOUR = [43, 29, 20];

  // La description d'une apparence (catalogue.description, modeles.enfants) : identité et tenue → ce que dessine la carte.
  function description(C, age, ident, tenue) {
    const enfant = age === 'enfant';
    const coupe = enfant ? (C.enfantCoupes[ident.coupe] || 'courts') : ident.coupe;
    const cc = tenue.couvre_chef || null;
    const chapeau = cc ? (enfant ? C.enfantChapeaux[cc] || null : cc) : null;
    const details = [...(ident.pilosite ? [ident.pilosite] : []), ...(ident.signes || []), ...(tenue.accessoires || [])]
      .filter((x) => C.ordreDetails.includes(x))
      .sort((a, b) => C.ordreDetails.indexOf(a) - C.ordreDetails.indexOf(b));
    return { coupe, chapeau, details, motif: tenue.haut.motif || null };
  }

  function elementsDe(C, d) {
    const liste = ['corps:standard', `haut:${d.motif || 'uni'}`, 'bas:standard', 'chaussures:standard', `coiffure:${d.coupe}`];
    if (d.chapeau) liste.push(`couvre_chef:${d.chapeau}`);
    for (const det of d.details) liste.push(det === 'barbe' || det === 'moustache' ? `pilosite:${det}` : `${det}:${det}`);
    const ordre = (e) => C.ordreModele.indexOf(e.slice(0, e.indexOf(':')));
    return liste.map((e, i) => [e, i]).sort((a, b) => ordre(a[0]) - ordre(b[0]) || a[1] - b[1]).map(([e]) => e);
  }

  // modeles.palette : les couleurs de base des lettres.
  function paletteBase(K, ident, tenue, motif) {
    const P = K.palettes, rgb = (h) => hexRgb(h);
    const pe = P.peau[ident.peau], hr = P.cheveux[ident.cheveux], hab = P.tissus[tenue.haut.tissu], bas = P.bas[tenue.bas.tissu];
    const f = rgb(pe.teinte), j = rgb(pe.ombre), e = rgb(pe.clair), joues = rgb(pe.joues);
    const hb = rgb(hr.teinte), hc = rgb(hr.ombre), hd = rgb(hr.sombre);
    const hl = rgb(hab.sombre), hm = rgb(hab.teinte), hn = rgb(hab.clair);
    const s = rgb(bas.teinte), r = rgb(bas.ombre), a = rgb(P.accessoires[tenue.accessoire]);
    const blanc = tenue.haut.tissu === 'blanc', motifC = blanc ? [200, 60, 60] : [244, 240, 228];
    let oeil = [rgb(P.yeux[ident.yeux].pupille), rgb(P.yeux[ident.yeux].reflet)];
    if (lumYeux(f) < PEAU_FONCEE) oeil = [mul(oeil[0], 0.4), mul(oeil[1], Math.max(1, (lumYeux(f) + ECART_PUPILLE) / Math.max(1, lumYeux(oeil[1]))))];
    const pales = Math.min(...hb) > CHEVEUX_PALES;
    const sombre = moyenne(oeil[0]) <= moyenne(oeil[1]) ? oeil[0] : oeil[1];
    return {
      k: f, d: mix(f, j, 0.25), m: mix(f, j, 0.45), t: mix(f, j, 0.3), l: j, e, P: joues,
      g: [239, 239, 239], i: [255, 255, 255], h: oeil[0], j: oeil[1],
      B: hb, C: hc, E: mix(hb, hc, 0.5), D: hd,
      p: hn, q: mix(hn, hm, 0.55), o: motif ? motifC : mix(hn, [255, 255, 255], 0.4),
      s, r, u: mul(s, 0.82), v: mul(s, 0.37), A: mul(s, 0.91), Z: mul(s, 0.55),
      w: [90, 58, 34], x: [68, 44, 26], y: [46, 30, 18],
      R: a, Q: fonce(a), H: mix(a, [255, 255, 255], 0.3), V: fonce(a, 0.56),
      S: [232, 194, 90], T: [250, 222, 136], U: [184, 138, 46],
      G: [40, 40, 48], X: mix(f, [180, 90, 50], 0.45), Y: [236, 200, 60], W: [244, 226, 196],
      f: mix(f, j, 0.25), z: e, N: a, b: hb, c: hc, J: j, F: [236, 200, 60],
      B_: pales ? hd : hb, E_: pales ? hd : mix(hb, hc, 0.5),
      L: moyenne(sombre) < 90 ? mul(sombre, 0.85) : [54, 36, 24],
    };
  }

  // Les éléments empilés, une vue (modeles.aplatir) : Map « x,y » → lettre.
  function aplatir(C, P, elements, chapeau, vue) {
    const g = new Map(), M = C.modele;
    for (const e of elements) {
      if (e.startsWith('couvre_chef:') && M.couvreTete.includes(chapeau)) {
        for (const [k, L] of [...g]) if (+k.split(',')[1] < M.masqueTete && M.masque.includes(P.famille(L))) g.delete(k);
      }
      for (const [x, y, L] of ((P.elements[e] || {})[vue] || [])) g.set(`${x},${y}`, L);
    }
    return g;
  }

  // La plus fréquente des couleurs aux places `pts` (Counter.most_common : à égalité, la première vue).
  function commune(face, pts, filtre = () => true) {
    const n = new Map();
    for (const [x, y] of pts) {
      const c = face.get(`${x},${y}`);
      if (c && filtre(c)) { const k = c.join(); n.set(k, (n.get(k) || 0) + 1); }
    }
    let best = null, nb = 0;
    for (const [k, v] of n) if (v > nb) { best = k; nb = v; }
    return best ? best.split(',').map(Number) : null;
  }
  const croise = (xs, ys) => xs.flatMap((x) => ys.map((y) => [x, y]));

  // L'apparence d'un membre : { age, identite, tenue } → { def (pour assembler), palette ({ lettre: '#rrggbb' }), d }.
  // C : couches.json ; K : catalogue.json.
  function apparence(C, K, age, ident, tenue) {
    const P = preparer(C);
    const d = description(C, age, ident, tenue);
    const elements = elementsDe(C, d);
    const base = paletteBase(K, ident, tenue, d.motif);
    base.a = CONTOUR;
    base.v_ = mul(base.q, 0.85);
    const face = new Map([...aplatir(C, P, elements, d.chapeau, 'bas')].map(([k, L]) => [k, base[L]]));
    base.Mp = commune(face, croise([0, 1, 2], [12, 13, 14]));
    base.Mk = commune(face, croise([1, 2, 9, 10], [15, 16]));
    base.Ms = commune(face, croise([3, 4], [18, 19, 20, 21]));
    base.Mr = commune(face, croise([7, 8], [18, 19, 20, 21]));
    base.Mw = commune(face, croise([3, 4], [22, 23]));
    base.Mv = commune(face, [[5, 6], [6, 6], [5, 7], [6, 7]], (c) => Math.min(...c) < 230) || base.k;
    const palette = { ...(C.couleursFixes || {}) };      // (le casque-lampe : des couleurs à lui, les mêmes pour tous)
    for (const [L, c] of Object.entries(base)) if (c) palette[L] = rgbHex(c);
    for (const L of P.derivees) {
      const [b, k] = L.split('×');
      if (base[b]) palette[L] = rgbHex(mul(base[b], +k));
    }
    return { def: { age, elements, chapeau: d.chapeau, jambes: 'standard' }, palette, d, base, face };
  }

  // Les 18 tuiles du visage d'une apparence (expressions.py : chaque expression de face puis de profil), d'après sa
  // planche assemblée (assembler) : { largeur: 144, hauteur: 5, data } (une rangée de visages.png).
  function visages(C, A, planche) {
    const X = C.expressions, [zx, zy, w, h] = X.zone, [x0, y0] = X.coin[A.def.age];
    const c = { ...A.base };
    for (const [L, [x, y]] of Object.entries(X.releves)) { const v = A.face.get(`${x},${y}`); if (v) c[L] = v; }
    const k = commune(A.face, X.peauEntreYeux, (v) => Math.min(...v) < 230);
    if (k) c.k = k;
    const pupille = moyenne(c.h) <= moyenne(c.j) ? c.h : c.j;
    c.L = moyenne(pupille) < 90 ? mul(pupille, 0.85) : [54, 36, 24];
    c.M = mul(c.l, 0.78); c.O = [92, 30, 34]; c.N = [140, 200, 245];
    const prot = new Set([...X.protege].filter((L) => A.base[L]).map((L) => A.base[L].join()).concat(CONTOUR.join()));
    const data = new Uint8ClampedArray(X.liste.length * X.vues.length * w * h * 4);
    let col = 0;
    for (const e of X.liste) {
      for (const v of X.vues) {
        const n = C.cases.indexOf(`idle_${v}_0`), cx = (n % 8) * 16 + x0, cy = Math.floor(n / 8) * 32 + y0;
        const pts = new Map();
        for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
          const q = ((cy + j) * planche.largeur + cx + i) * 4;
          if (planche.data[q + 3]) pts.set(`${zx + i},${zy + j}`, [planche.data[q], planche.data[q + 1], planche.data[q + 2]]);
        }
        (X.grilles[e][v] || []).forEach((rang, r) => {
          for (let x = 0; x < rang.length; x++) {
            const ch = rang[x], key = `${x},${X.y0 + r}`;
            if (ch === '.' || !pts.has(key) || prot.has(pts.get(key).join())) continue;
            pts.set(key, c[ch]);
          }
        });
        for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
          const v2 = pts.get(`${zx + i},${zy + j}`), q = (j * X.liste.length * X.vues.length * w + col * w + i) * 4;
          if (v2) { data[q] = v2[0]; data[q + 1] = v2[1]; data[q + 2] = v2[2]; data[q + 3] = 255; }
        }
        col++;
      }
    }
    return { largeur: X.liste.length * X.vues.length * w, hauteur: h, data };
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

  // Étape E6 : un membre à l'apparence à lui. Sa planche et ses tuiles de visage, des textures de la scène :
  // cleApparence(age, app) leur nom (le même pour la même apparence) ; chargerDonnees(scène, urls, fait) demande
  // couches.json et catalogue.json au chargeur (s'ils manquent : fait() une fois là ; → true s'ils y sont déjà) ;
  // texturesApparence(scène, age, app) fait la planche et l'atlas « visages:<clé> » (js/carte/visages.js les
  // trouve par texture.customData) ; → la clé, ou null sans les données.
  function cleApparence(age, a) {
    let h = 2166136261;
    for (const c of age + JSON.stringify(a)) h = Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0;
    return `app_${age === 'enfant' ? 'e' : 'a'}_${h.toString(36)}`;
  }

  function chargerDonnees(scene, urls, fait) {
    const J = scene.cache.json;
    if (J.get('couches') && J.get('catalogue')) return true;
    if (!J.exists('couches')) scene.load.json('couches', urls.couches);
    if (!J.exists('catalogue')) scene.load.json('catalogue', urls.catalogue);
    scene.load.once('complete', fait);
    if (!scene.load.isLoading()) scene.load.start();
    return false;
  }

  function texturesApparence(scene, age, a) {
    const cle = cleApparence(age, a);
    if (scene.textures.exists(cle)) return cle;
    const C = scene.cache.json.get('couches'), K = scene.cache.json.get('catalogue');
    if (!C || !K || !global.document) return null;
    const A = apparence(C, K, age, a.identite, a.tenue), p = assembler(C, A.def, A.palette);
    const toile = (q) => {
      const cv = global.document.createElement('canvas');
      cv.width = q.largeur; cv.height = q.hauteur;
      cv.getContext('2d').putImageData(new ImageData(q.data, q.largeur, q.hauteur), 0, 0);
      return cv;
    };
    const t = visages(C, A, p), X = C.expressions;
    scene.textures.addSpriteSheet('visages:' + cle, toile(t), { frameWidth: X.zone[2], frameHeight: X.zone[3] });
    scene.textures.addSpriteSheet(cle, toile(p), { frameWidth: C.case.w, frameHeight: C.case.h });
    scene.textures.get(cle).customData = { age, visages: 'visages:' + cle };
    return cle;
  }

  // Étape E7 : un membre (de la famille) tel que la carte le montre : son personnage du catalogue ou son apparence, et la
  // pièce d'équipement qu'il porte sur la tête (coiffe : un couvre-chef de couches.json, data/equipement.json « carte »),
  // qui remplace son couvre-chef. d : { perso, enfant, apparence, coiffe }. cleMembre(d) : le nom de sa planche ;
  // texturesMembre(scène, d) : la fait (et son atlas de visages ; un personnage du catalogue garde sa rangée de
  // visages.png : customData.nom), couches.json et catalogue.json chargés ; → la clé, ou null (rien à assembler :
  // un personnage du catalogue sans coiffe garde son PNG).
  function cleMembre(d) {
    const age = d.enfant ? 'enfant' : 'adulte';
    const base = d.apparence ? cleApparence(age, d.apparence) : `${d.enfant ? 'enfant' : 'perso'}_${d.perso}`;
    return d.coiffe ? `${base}+${d.coiffe}` : base;
  }

  // La définition d'un membre (son personnage ou son apparence, coiffé de sa pièce) : { def, palette, A, nom }, ou null.
  function defMembre(C, K, d) {
    const age = d.enfant ? 'enfant' : 'adulte';
    let def, palette, A = null, nom = null;
    if (d.apparence) {
      A = apparence(C, K, age, d.apparence.identite, d.apparence.tenue);
      def = { ...A.def };
      palette = A.palette;
    } else {
      nom = nomPlanche(`${d.enfant ? 'enfant' : 'perso'}_${d.perso}`);
      if (!nom || !C.personnages[nom]) return null;
      def = { ...C.personnages[nom], nuances: (C.nuances || {})[nom] };
      palette = C.palettes[nom];
    }
    if (!C.elements[`couvre_chef:${d.coiffe}`]) return null;
    const ordre = (e) => C.ordreModele.indexOf(e.slice(0, e.indexOf(':')));
    def.elements = def.elements.filter((e) => !e.startsWith('couvre_chef:')).concat(`couvre_chef:${d.coiffe}`)
      .map((e, i) => [e, i]).sort((a, b) => ordre(a[0]) - ordre(b[0]) || a[1] - b[1]).map(([e]) => e);
    def.chapeau = d.coiffe;
    return { def, palette, A, nom };
  }

  function texturesMembre(scene, d) {
    if (!d.coiffe) return d.apparence ? texturesApparence(scene, d.enfant ? 'enfant' : 'adulte', d.apparence) : null;
    const cle = cleMembre(d), age = d.enfant ? 'enfant' : 'adulte';
    if (scene.textures.exists(cle)) return cle;
    const C = scene.cache.json.get('couches'), K = scene.cache.json.get('catalogue');
    if (!C || !K || !global.document) return null;
    const D = defMembre(C, K, d);
    if (!D) return null;
    const { A, nom } = D, p = assembler(C, D.def, D.palette);
    const toile = (q) => {
      const cv = global.document.createElement('canvas');
      cv.width = q.largeur; cv.height = q.hauteur;
      cv.getContext('2d').putImageData(new ImageData(q.data, q.largeur, q.hauteur), 0, 0);
      return cv;
    };
    scene.textures.addSpriteSheet(cle, toile(p), { frameWidth: C.case.w, frameHeight: C.case.h });
    if (A) {
      const X = C.expressions;
      scene.textures.addSpriteSheet('visages:' + cle, toile(visages(C, A, p)), { frameWidth: X.zone[2], frameHeight: X.zone[3] });
      scene.textures.get(cle).customData = { age, visages: 'visages:' + cle };
    } else scene.textures.get(cle).customData = { age, nom };
    return cle;
  }

  global.CartePlanches = { assembler, planche, actif, charger, nomPlanche, pixels, apparence, visages, rond, cleApparence, chargerDonnees, texturesApparence, cleMembre, texturesMembre, defMembre };
})(typeof window !== 'undefined' ? window : globalThis);
