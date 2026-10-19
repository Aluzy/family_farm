/* carte/ville/immeuble.js — la scène de la ville : un immeuble en blocs (un essai).
 *
 * Un bâtiment de la ville (IMMEUBLE.remplace) est remplacé par un immeuble bâti en blocs, comme
 * les maisons de la ferme : on y entre à pied et on monte ses étages. V.immeubleCarte ôte ses
 * tuiles (le rectangle IMMEUBLE.efface) et son emprise de la carte avant que la scène ne la
 * crée ; makeImmeuble le pose à leur place, niveau par niveau (V.planImmeuble) :
 *   - au rez-de-chaussée, une entrée (le hall, au milieu : la porte double sur la rue) ; de
 *     chaque côté une porte mène à un logement : un petit salon (un canapé, une table basse),
 *     la pièce de vie (la cuisine, le four, une table et ses chaises), une chambre (deux lits,
 *     une table de chevet). Au fond du hall, l'escalier monte au palier du dessus ;
 *   - à chaque étage, le palier : le haut de l'escalier d'où l'on vient (on y redescend),
 *     l'escalier qui monte au suivant (sauf au dernier), et les deux mêmes logements ;
 *   - par-dessus le dernier, un toit de tuiles (CarteKit.toit).
 * Chaque niveau est dessiné IMMEUBLE.dy px au-dessus du précédent (un étage d'immeuble de la
 * ville) : les murs du tour sont ceux de sa façade (assets/immeuble_ville.png, scripts/carte/
 * blocs.py immeuble_ville : la brique ocre de l'immeuble qu'il remplace, le soubassement, les
 * bandeaux entre les étages, la corniche sous le toit, les pierres d'angle, les fenêtres de la
 * ville avec de l'espace au-dessus et au-dessous, la porte double vitrée de l'entrée) (deux fenêtres voisines font une
 * grande fenêtre) ; les cloisons sont basses (blocs.png), pour qu'on voie le fond des pièces.
 *
 * Marcher sur une marche de l'escalier fait monter (ou descendre) : le personnage arrive sur le
 * même escalier, au niveau d'à côté (this.niveauVille), dessiné remonté, et ne marche plus que
 * sur ce niveau (marcheEtage). Ce qu'on voit (stepImmeuble), comme à la ferme :
 *   - dehors : tous les niveaux l'un sur l'autre, et le toit ;
 *   - dans l'immeuble : le toit s'efface, la façade de devant aussi (à moitié), le niveau où l'on est se voit, celui du dessous est
 *     en transparence (IMMEUBLE.transparent : on voit ses murs sous le plancher), ceux du dessus
 *     sont cachés (empilés, leurs planchers couvriraient tout) ; un mur devant le personnage
 *     s'efface un peu ;
 *   - à un étage : un voile sombre couvre la ville, l'immeuble et le personnage passent devant.
 *
 * Méthodes de la scène des cartes (js/ville-carte.js), posées sur son prototype : `this` est
 * la scène (voir docs/architecture-phaser.md).
 */
(function (global) {
  'use strict';

  const K = global.CarteKit;
  const V = global.CarteVille;
  const { T, BATI, BLOCS, IMMEUBLE: I, VOL } = V.C;

  // Le plan du niveau n (sur N) : { grille: [chaînes], meubles: [{ nom, x, y, w, h, flip }] }.
  // La grille : M un mur, F un mur à fenêtre, P une porte, . le plancher, U l'escalier qui
  // monte, D le haut de l'escalier qui descend. Le logement de gauche, puis celui de droite, en
  // miroir.
  V.planImmeuble = function (n, N) {
    const W = I.w, H = I.h, g = Array.from({ length: H }, () => Array(W).fill('.'));
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (!x || !y || x === W - 1 || y === H - 1) g[y][x] = 'M';
    const miroir = (x) => W - 1 - x;
    for (let y = 0; y < H; y++) { g[y][8] = 'M'; g[y][miroir(8)] = 'M'; }
    for (const x of [1, 2, 3, 4, 5, 6, 7]) for (const y of [4, 9]) { g[y][x] = 'M'; g[y][miroir(x)] = 'M'; }
    // les portes : entre les pièces, et du hall au salon
    for (const y of [4, 9]) { g[y][6] = 'P'; g[y][miroir(6)] = 'P'; }
    g[11][8] = 'P'; g[11][miroir(8)] = 'P';
    // les fenêtres de la façade (devant, derrière)
    for (const x of [2, 3, 5, 6]) { g[H - 1][x] = 'F'; g[H - 1][miroir(x)] = 'F'; }
    for (const x of [3, 4]) { g[0][x] = 'F'; g[0][miroir(x)] = 'F'; }
    // le hall : la porte double sur la rue (au rez-de-chaussée), sinon deux fenêtres
    g[H - 1][10] = g[H - 1][11] = n ? 'F' : 'P';
    // l'escalier, au fond du hall : il monte de la case 10 ou 11 (un niveau sur deux)
    const monte = (k) => (k % 2 ? 11 : 10);
    if (n < N - 1) g[1][monte(n)] = 'U';
    if (n > 0) g[1][monte(n - 1)] = 'D';
    const meubles = [];
    const gauche = [
      // la chambre : deux lits, une table de chevet
      { nom: 'lit_adulte', x: 1, y: 1, w: 1, h: 2 }, { nom: 'chevet', x: 2, y: 1, w: 1, h: 1 }, { nom: 'lit_enfant', x: 7, y: 1, w: 1, h: 2 },
      // la pièce de vie : la cuisine, le four, la table et ses chaises
      { nom: 'cuisine', x: 1, y: 5, w: 2, h: 2 }, { nom: 'four', x: 3, y: 5, w: 2, h: 2 },
      { nom: 'chaise', x: 1, y: 7, w: 1, h: 1 }, { nom: 'table', x: 2, y: 7, w: 3, h: 2 }, { nom: 'chaise', x: 5, y: 7, w: 1, h: 1, flip: true },
      // le salon : un tapis, le canapé, la table basse, une plante
      { nom: 'tapis_2', x: 1, y: 11, w: 3, h: 2, plat: true }, { nom: 'canape', x: 1, y: 10, w: 3, h: 2 }, { nom: 'table_basse', x: 1, y: 12, w: 2, h: 1 }, { nom: 'plante', x: 5, y: 10, w: 1, h: 1 },
    ];
    for (const m of gauche) {
      meubles.push(m);
      meubles.push({ ...m, x: W - m.x - m.w, flip: !m.flip });
    }
    return { grille: g.map((l) => l.join('')), meubles };
  };

  // La carte de la ville sans le bâtiment que l'immeuble remplace : ses tuiles (les couches des
  // bâtiments, dans IMMEUBLE.efface) et son emprise (la couche « batiments »).
  V.immeubleCarte = function (data) {
    const [x0, y0, w, h] = I.efface, W = data.width;
    for (const l of data.layers) {
      if (l.type === 'tilelayer' && BATI.includes(l.name)) for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) l.data[y * W + x] = 0;
      if (l.type === 'objectgroup' && l.name === 'batiments') l.objects = l.objects.filter((o) => o.name !== I.remplace);
    }
    return data;
  };

  const mur = (c) => c === 'M' || c === 'F';
  const bord = (x, y) => !x || !y || x === I.w - 1 || y === I.h - 1;

  V.partie({

    // L'immeuble, posé niveau par niveau (V.planImmeuble), et son toit.
    makeImmeuble() {
      this.immeuble = null;
      this.niveauVille = 0;
      if (V.etat.nom !== I.carte || !this.textures.exists(BLOCS.key) || !this.textures.exists(I.facade.key)) return;
      const N = I.niveaux, Fk = I.facade.key;
      const im = this.immeuble = { niveaux: [], toit: null, vue: null };
      for (let n = 0; n < N; n++) {
        const plan = V.planImmeuble(n, N), G = plan.grille, lift = n * I.dy;
        // la façade de cet étage (le rez-de-chaussée, un étage, le dernier : immeuble_ville.png)
        const etage = I.facade.etages * (!n ? 0 : n === N - 1 ? 2 : 1);
        const a = (x, y) => (y >= 0 && y < I.h && x >= 0 && x < I.w ? G[y][x] : ' ');
        const objs = [], murs = [], marche = G.map((l) => [...l].map((c) => '.PUD'.includes(c)));
        const pose = (key, frame, x, y, z) => {
          const px = (I.x + x) * T + T / 2, py = (I.y + y + 1) * T;
          const o = this.add.image(px, py - lift, key, frame).setOrigin(0.5, 1);
          o.immZ = z(py) + n * 0.2;
          o.setDepth(o.immZ);
          objs.push(o);
          return o;
        };
        for (let y = 0; y < I.h; y++) {
          for (let x = 0; x < I.w; x++) {
            const c = a(x, y);
            // le plancher : au rez-de-chaussée dans les pièces, aux étages sur toute l'emprise
            const sol = (i, j) => (n ? a(i, j) !== ' ' : !' MFP'.includes(a(i, j)));
            if (sol(x, y)) pose(BLOCS.key, BLOCS.sols + (sol(x, y - 1) ? 1 : 0) + (sol(x + 1, y) ? 2 : 0) + (sol(x, y + 1) ? 4 : 0) + (sol(x - 1, y) ? 8 : 0), x, y, (py) => (n ? py - 0.1 : py - T - 200));
            if (mur(c)) {
              const v = (dx, dy, porte) => mur(a(x + dx, y + dy)) || (porte && a(x + dx, y + dy) === 'P');
              const m = (v(0, -1) ? 1 : 0) + (v(1, 0, true) ? 2 : 0) + (v(0, 1) ? 4 : 0) + (v(-1, 0, true) ? 8 : 0);
              // (les murs du tour : ceux de la façade, avec ou sans fenêtre ; les cloisons : basses,
              // on voit le fond des pièces)
              const f = etage + (c === 'F' && !mur(a(x, y + 1)) ? I.facade.fenetre : 0) + m;
              const o = bord(x, y) ? pose(Fk, f, x, y, (py) => py) : pose(BLOCS.key, BLOCS.murs + m, x, y, (py) => py);
              murs.push({ o, x: (I.x + x) * T + T / 2, gy: I.y + y, facade: y === I.h - 1 });
            } else if (c === 'P') {
              const vert = mur(a(x, y - 1)) && mur(a(x, y + 1));
              const o = vert ? pose(BLOCS.key, I.porteVerticale, x, y, (py) => py) : bord(x, y) ? pose(Fk, I.facade.porte + (a(x - 1, y) === 'P' ? 1 : 0), x, y, (py) => py) : pose(BLOCS.key, BLOCS.porte, x, y, (py) => py);
              murs.push({ o, x: (I.x + x) * T + T / 2, gy: I.y + y, facade: y === I.h - 1 });
            } else if (c === 'U') pose(BLOCS.key, I.escalier, x, y, (py) => py - T / 2);
            else if (c === 'D') pose(BLOCS.key, I.haut, x, y, (py) => py - 0.05);
          }
        }
        // les meubles : posés en bas au milieu de leurs cases ; ils arrêtent la marche
        for (const mb of plan.meubles) {
          const key = 'meuble_' + mb.nom;
          if (!mb.plat) for (let j = 0; j < mb.h; j++) for (let i = 0; i < mb.w; i++) marche[mb.y + j][mb.x + i] = false;
          if (!this.textures.exists(key)) continue;
          const px = (I.x + mb.x + mb.w / 2) * T, py = (I.y + mb.y + mb.h) * T;
          const o = this.add.image(Math.round(px), py - (mb.plat ? 2 : 1) - lift, key).setOrigin(0.5, 1).setFlipX(!!mb.flip);
          o.immZ = (mb.plat ? py - T * mb.h + 0.5 : py - 3) + n * 0.2;
          o.setDepth(o.immZ);
          objs.push(o);
        }
        im.niveaux.push({ objs, murs, marche, grille: G });
      }
      // le rez-de-chaussée : on y entre depuis la rue
      for (let y = 0; y < I.h; y++) for (let x = 0; x < I.w; x++) if (this.walk[I.y + y]) this.walk[I.y + y][I.x + x] = im.niveaux[0].marche[y][x];
      // le toit, sur le dernier niveau
      const cases = [];
      for (let y = 0; y < I.h; y++) for (let x = 0; x < I.w; x++) cases.push((I.y + y) * this.map.width + I.x + x);
      const { cv, c0, r0, r1 } = K.toit(cases, this.map.width);
      const cle = 'toit_immeuble';
      if (this.textures.exists(cle)) this.textures.remove(cle);
      this.textures.addCanvas(cle, cv);
      im.toit = this.add.image(c0 * T, r0 * T - N * I.dy, cle).setOrigin(0, 0);
      im.toit.immZ = (r1 + 1) * T + N * 0.2 + I.toitZ;
      im.toit.setDepth(im.toit.immZ);
      // le voile de l'étage (montré quand on y est)
      im.voile = this.add.rectangle(0, 0, this.map.widthInPixels, this.map.heightInPixels, I.voile, I.alpha).setOrigin(0).setDepth(this.voileImmeubleZ()).setVisible(false);
    },

    // Le voile de l'étage : au-dessus de la ville, de ses personnages et de son feuillage, sous ce
    // qui vole et le voile de l'heure (VOL − 1).
    voileImmeubleZ() {
      return VOL - 2.5;
    },
    // À l'étage, la profondeur de ce qui a la profondeur `d` : devant le voile (l'ordre gardé).
    immeubleZ(d) {
      return this.voileImmeubleZ() + 0.01 + d * 1e-6;
    },

    // La case (x, y) du niveau où l'on est, à l'étage : y marche-t-on ? (hors de l'immeuble : non)
    marcheEtage(tx, ty) {
      const im = this.immeuble, x = tx - I.x, y = ty - I.y;
      if (!im || x < 0 || y < 0 || x >= I.w || y >= I.h) return false;
      return im.niveaux[this.niveauVille].marche[y][x];
    },

    // De combien de px le personnage est dessiné remonté (le niveau où il est).
    liftVille() {
      return (this.niveauVille || 0) * I.dy;
    },

    // Le personnage, à l'étage : devant le voile, rangé par sa rangée avec ce qui est de son
    // niveau (comme à la ferme) : devant le plancher, le haut de l'escalier et les meubles de sa
    // rangée, derrière ses murs. (Rangé par ses pieds, il passait sous le plancher de sa rangée,
    // posé au bas de la case : on ne voyait que sa tête.)
    profondeurHeros(y) {
      return this.niveauVille ? this.immeubleZ((Math.floor((y - 1) / T) + 1) * T + this.niveauVille * 0.2 - 0.02) : y;
    },

    // L'escalier sous les pieds (une case où l'on vient d'arriver) : on monte ou on descend ; puis
    // ce qu'on voit (dehors, dans l'immeuble, à l'étage), et les murs devant le personnage.
    stepImmeuble(dt) {
      const im = this.immeuble;
      if (!im) return;
      const P = this.heroPos, gx = Math.floor(P.x / T), gy = Math.floor((P.y - 1) / T);
      const x = gx - I.x, y = gy - I.y, dans = x >= 0 && y >= 0 && x < I.w && y < I.h;
      const ici = gy * this.map.width + gx;
      if (dans && ici !== im.case) {
        const c = im.niveaux[this.niveauVille].grille[y][x];
        const vers = c === 'U' ? 1 : c === 'D' ? -1 : 0;
        if (vers) {
          this.niveauVille += vers;
          this.path = [];
        }
      }
      im.case = ici;
      // ce qu'on voit
      const vue = !dans && !this.niveauVille ? 'dehors' : String(this.niveauVille);
      if (vue !== im.vue) {
        im.vue = vue;
        const haut = this.niveauVille > 0;
        im.niveaux.forEach((nv, k) => {
          // (dedans : le niveau du dessous en transparence, ceux du dessus cachés)
          const a = vue === 'dehors' || k === this.niveauVille ? 1 : k === this.niveauVille - 1 ? I.transparent : 0;
          for (const o of nv.objs) o.setAlpha(a).setVisible(a > 0).setDepth(haut ? this.immeubleZ(o.immZ) : o.immZ);
          for (const m of nv.murs) m.a = a;
        });
        im.toit.setVisible(vue === 'dehors');
        im.voile.setVisible(haut);
      }
      // dans l'immeuble : la façade de devant, et les murs du niveau une ou deux cases devant le
      // personnage, s'effacent un peu
      if (vue === 'dehors') return;
      const pas = BLOCS.hauts.vitesse * dt;
      for (const m of im.niveaux[this.niveauVille].murs) {
        const but = m.facade || (m.gy > gy && m.gy <= gy + 2 && Math.abs(m.x - P.x) < T / 2 + 6) ? I.mursAlpha : m.a;
        const a = m.o.alpha;
        if (a !== but) m.o.setAlpha(a < but ? Math.min(but, a + pas) : Math.max(but, a - pas));
      }
    },
  });
})(window);
