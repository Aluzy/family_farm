/* carte/ville/immeuble.js — la scène de la ville : les immeubles d'habitation, en blocs.
 *
 * Les immeubles d'habitation de la ville (IMMEUBLE.batiments) sont remplacés par des immeubles
 * bâtis en blocs, comme les maisons de la ferme : on y entre à pied et on monte leurs étages.
 * V.immeubleCarte ôte leurs tuiles (le rectangle `efface` de chacun) et leur emprise de la carte
 * avant que la scène ne la crée ; makeImmeuble les pose à leur place, niveau par niveau
 * (V.planImmeuble). Un immeuble « double » (le grand immeuble ocre de l'est) :
 *   - au rez-de-chaussée, une entrée (le hall, au milieu de la moitié de devant : la porte
 *     double sur la rue) ; de chaque côté une porte mène à un logement : un petit salon (un
 *     canapé, une table basse), la pièce de vie (la cuisine, le four, une table et ses chaises),
 *     et derrière, sur toute la largeur du logement, une chambre (deux lits, deux tables de
 *     chevet). Au fond du hall, l'escalier monte au palier du dessus ;
 *   - à chaque étage, le palier : le haut de l'escalier d'où l'on vient (on y redescend),
 *     l'escalier qui monte au suivant (sauf au dernier), et les deux mêmes logements ;
 * un immeuble « simple » (les résidences de l'ouest, plus étroites) : un logement par niveau,
 * les mêmes pièces (la chambre au fond, la pièce de vie, le salon devant à gauche) ; le hall
 * (le palier aux étages) devant à droite, avec la porte d'entrée et l'escalier ;
 *   - par-dessus le dernier niveau, un toit de tuiles (CarteKit.toit).
 * Chaque niveau est dessiné IMMEUBLE.dy px au-dessus du précédent (un étage d'immeuble de la
 * ville) : les murs du tour sont ceux de sa façade (assets/immeuble_ville*.png, scripts/carte/
 * blocs.py immeuble_ville : la brique de l'immeuble qu'il remplace, le soubassement, les
 * bandeaux entre les étages, la corniche sous le toit, les pierres d'angle, les fenêtres de la
 * ville avec de l'espace au-dessus et au-dessous, la porte double vitrée de l'entrée) (deux fenêtres voisines font une
 * grande fenêtre) ; les cloisons sont basses (blocs.png), pour qu'on voie le fond des pièces.
 *
 * Marcher sur une marche de l'escalier fait monter (ou descendre) : le personnage arrive sur le
 * même escalier, au niveau d'à côté (this.niveauVille), dessiné remonté, et ne marche plus que
 * sur ce niveau (marcheEtage) de cet immeuble (this.immeubleIci). Ce qu'on voit (stepImmeuble),
 * comme à la ferme :
 *   - dehors : tous les niveaux l'un sur l'autre, et le toit ;
 *   - dans un immeuble : son toit s'efface, la façade de devant aussi (à moitié), le niveau où l'on est se voit, celui du dessous est
 *     en transparence (IMMEUBLE.transparent : on voit ses murs sous le plancher), ceux du dessus
 *     sont cachés (empilés, leurs planchers couvriraient tout) ; un mur devant le personnage
 *     s'efface un peu ; les autres immeubles restent vus de dehors ;
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

  // Le plan du niveau n (sur N) de l'immeuble `b` (IMMEUBLE.batiments) : { grille: [chaînes],
  // meubles: [{ nom, x, y, w, h, flip }], porte (la case de gauche de la porte d'entrée),
  // logements: [{ dans(x, y, niv) (la case est-elle du logement ?), niveaux (ceux où l'on va et
  // vient ; sans : le sien), lits ([x, y, niv] : le pied des lits des deux adultes, puis des
  // enfants ; sans niv : son niveau), feu ([x, y] : la place devant le four), flip (le four à
  // gauche) }] }. La grille : M un mur, F un mur à fenêtre, P une porte, . le plancher, U
  // l'escalier qui monte, D le haut de l'escalier qui descend.
  V.planImmeuble = function (b, n, N) {
    const W = b.w, H = b.h, g = Array.from({ length: H }, () => Array(W).fill('.'));
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (!x || !y || x === W - 1 || y === H - 1) g[y][x] = 'M';
    const meubles = [];
    // (l'escalier monte d'une case ou de sa voisine, un niveau sur deux : on arrive en haut à
    // côté de celui qui monte encore)
    const escalier = (y, monte) => {
      if (n < N - 1) g[y][monte(n)] = 'U';
      if (n > 0) g[y][monte(n - 1)] = 'D';
    };
    if (b.plan === 'maison') {
      // une maison de ville, sur deux niveaux. Au rez-de-chaussée, derrière, la pièce de vie (la
      // cuisine, le four, la table) ; devant, le salon à gauche, l'entrée à droite (la porte sur la
      // rue, l'escalier). À l'étage, derrière, la chambre des parents à gauche et celle des
      // enfants à droite (un lit chacun) ; devant, le palier.
      const c = Math.floor(W / 2), k = b.enfants || 2;
      for (let x = 1; x < W - 1; x++) g[5][x] = 'M';
      for (const x of [2, 3]) g[H - 1][x] = 'F';
      for (const x of [2, 3, W - 4, W - 3]) g[0][x] = 'F';
      g[H - 1][W - 3] = g[H - 1][W - 2] = n ? 'F' : 'P';
      escalier(6, () => W - 2);
      if (!n) {
        g[5][W - 4] = 'P';
        meubles.push(
          { nom: 'cuisine', x: 1, y: 1, w: 2, h: 2 }, { nom: 'four', x: 3, y: 1, w: 2, h: 2 }, { nom: 'plante', x: W - 2, y: 1, w: 1, h: 1 },
          { nom: 'chaise', x: 2, y: 3, w: 1, h: 1 }, { nom: 'table', x: 1, y: 4, w: 3, h: 1 },
          { nom: 'tapis_2', x: 1, y: 7, w: 3, h: 2, plat: true }, { nom: 'canape', x: 1, y: 6, w: 3, h: 2 }, { nom: 'table_basse', x: 1, y: 8, w: 2, h: 1 },
        );
        // (assez large : une chaise au bout de la table, la porte du fond plus loin)
        if (W >= 10) meubles.push({ nom: 'chaise', x: 4, y: 4, w: 1, h: 1, flip: true });
        const lits = [[1, 3, 1], [2, 3, 1]];
        for (let i = 0; i < k; i++) lits.push([c + 1 + i, 3, 1]);
        return { grille: g.map((l) => l.join('')), meubles, porte: W - 3, logements: [{ dans: () => true, niveaux: [0, 1], lits, feu: [5, 2], flip: true }] };
      }
      g[5][2] = 'P'; g[5][W - 3] = 'P';
      for (let y = 1; y < 5; y++) g[y][c] = 'M';
      meubles.push({ nom: 'lit_adulte', x: 1, y: 1, w: 1, h: 2 }, { nom: 'chevet', x: 2, y: 1, w: 1, h: 1 }, { nom: 'plante', x: 1, y: 6, w: 1, h: 1 });
      if (c - 1 > 2) meubles.push({ nom: 'plante', x: c - 1, y: 1, w: 1, h: 1 });
      for (let i = 0; i < k; i++) meubles.push({ nom: 'lit_enfant', x: c + 1 + i, y: 1, w: 1, h: 2 });
      return { grille: g.map((l) => l.join('')), meubles, porte: W - 3, logements: [] };
    }
    if (b.plan === 'simple') {
      // un logement : la chambre au fond (y = 1 à 3), la pièce de vie (5 à 8), le salon devant à
      // gauche (x = 1 à 4) ; le hall devant à droite (x = 6 à 8), fermé par ses murs (x = 5,
      // y = 9), la porte double sur la rue, l'escalier au fond
      for (let x = 1; x < W - 1; x++) { g[4][x] = 'M'; g[9][x] = 'M'; }
      for (let y = 10; y < H - 1; y++) g[y][5] = 'M';
      g[4][6] = 'P'; g[9][4] = 'P'; g[11][5] = 'P';
      for (const x of [2, 3]) g[H - 1][x] = 'F';
      for (const x of [2, 3, 6, 7]) g[0][x] = 'F';
      g[H - 1][7] = g[H - 1][8] = n ? 'F' : 'P';
      escalier(10, (k) => (k % 2 ? 8 : 7));
      // (un studio, `enfants` à 0 : sans le lit de l'enfant)
      const enfant = b.enfants !== 0;
      if (enfant) meubles.push({ nom: 'chevet', x: 7, y: 1, w: 1, h: 1 }, { nom: 'lit_enfant', x: 8, y: 1, w: 1, h: 2 });
      else meubles.push({ nom: 'plante', x: 8, y: 1, w: 1, h: 1 });
      meubles.push(
        { nom: 'lit_adulte', x: 1, y: 1, w: 1, h: 2 }, { nom: 'chevet', x: 2, y: 1, w: 1, h: 1 }, { nom: 'plante', x: 4, y: 1, w: 1, h: 1 },
        { nom: 'cuisine', x: 1, y: 5, w: 2, h: 2 }, { nom: 'four', x: 3, y: 5, w: 2, h: 2 }, { nom: 'plante', x: 8, y: 5, w: 1, h: 1 },
        // (la table, une chaise : on passe à côté, de la chambre au salon)
        { nom: 'chaise', x: 4, y: 7, w: 1, h: 1 }, { nom: 'table', x: 5, y: 7, w: 3, h: 1 },
        { nom: 'tapis_2', x: 1, y: 11, w: 3, h: 2, plat: true }, { nom: 'canape', x: 1, y: 10, w: 3, h: 2 }, { nom: 'table_basse', x: 1, y: 12, w: 2, h: 1 },
      );
      const logements = [{ dans: (x, y) => y < 9 || x < 5, lits: enfant ? [[1, 3], [2, 3], [8, 3]] : [[1, 3], [2, 3]], feu: [5, 6], flip: true }];
      return { grille: g.map((l) => l.join('')), meubles, porte: 7, logements };
    }
    // « double » : deux logements, celui de gauche puis celui de droite, en miroir
    const miroir = (x) => W - 1 - x;
    const mur = (x, y, c = 'M') => { g[y][x] = c; g[y][miroir(x)] = c; };
    // le hall (et le palier) : la moitié de devant, entre ses murs (x = 8 et 13), sous le mur qui
    // le ferme au fond (y = 5) ; derrière, les chambres prennent toute la largeur, séparées par
    // le mur mitoyen (x = 10 et 11)
    for (let y = 5; y < H; y++) mur(8, y);
    for (let y = 1; y < 5; y++) mur(10, y);
    // les cloisons : chambre | pièce de vie (y = 5, jusqu'au hall), pièce de vie | salon (y = 9)
    for (let x = 1; x <= 10; x++) mur(x, 5);
    for (let x = 1; x <= 7; x++) mur(x, 9);
    // les portes : entre les pièces, et du hall au salon
    mur(7, 5, 'P'); mur(7, 9, 'P'); mur(8, 11, 'P');
    // les fenêtres de la façade (devant, derrière)
    for (const x of [2, 3, 5, 6]) mur(x, H - 1, 'F');
    for (const x of [3, 4, 7, 8]) mur(x, 0, 'F');
    // le hall : la porte double sur la rue (au rez-de-chaussée), sinon deux fenêtres
    g[H - 1][10] = g[H - 1][11] = n ? 'F' : 'P';
    // l'escalier, au fond du hall
    escalier(6, (k) => (k % 2 ? 11 : 10));
    const gauche = [
      // la chambre (toute la largeur du logement) : deux lits, deux tables de chevet, une plante
      { nom: 'lit_adulte', x: 1, y: 1, w: 1, h: 2 }, { nom: 'chevet', x: 2, y: 1, w: 1, h: 1 }, { nom: 'plante', x: 5, y: 1, w: 1, h: 1 },
      { nom: 'chevet', x: 8, y: 1, w: 1, h: 1 }, { nom: 'lit_enfant', x: 9, y: 1, w: 1, h: 2 },
      // la pièce de vie : la cuisine, le four, la table et ses chaises
      { nom: 'cuisine', x: 1, y: 6, w: 2, h: 2 }, { nom: 'four', x: 3, y: 6, w: 2, h: 2 },
      { nom: 'chaise', x: 1, y: 8, w: 1, h: 1 }, { nom: 'table', x: 2, y: 8, w: 3, h: 1 }, { nom: 'chaise', x: 5, y: 8, w: 1, h: 1, flip: true },
      // le salon : un tapis, le canapé, la table basse, une plante
      { nom: 'tapis_2', x: 1, y: 11, w: 3, h: 2, plat: true }, { nom: 'canape', x: 1, y: 10, w: 3, h: 2 }, { nom: 'table_basse', x: 1, y: 12, w: 2, h: 1 }, { nom: 'plante', x: 5, y: 10, w: 1, h: 1 },
    ];
    for (const m of gauche) {
      meubles.push(m);
      meubles.push({ ...m, x: W - m.x - m.w, flip: !m.flip });
    }
    // (la chambre derrière, sur toute la largeur ; devant, la pièce de vie et le salon)
    const logement = (cote) => {
      const mx = (x) => (cote ? miroir(x) : x);
      return { dans: (x, y) => (y < 5 ? mx(x) <= 9 : y > 5 && mx(x) <= 7), lits: [[1, 3], [2, 3], [9, 3]].map(([x, y]) => [mx(x), y]), feu: [mx(5), 7], flip: !cote };
    };
    return { grille: g.map((l) => l.join('')), meubles, porte: 10, logements: [logement(0), logement(1)] };
  };

  // La carte de la ville sans les bâtiments que les immeubles remplacent : leurs tuiles (les
  // couches des bâtiments, dans le rectangle `efface` de chacun) et leur emprise (la couche
  // « batiments »).
  V.immeubleCarte = function (data) {
    const W = data.width, noms = I.batiments.map((b) => b.nom), retire = (n) => noms.includes(n) || (I.retire || []).some((p) => n.startsWith(p));
    for (const l of data.layers) {
      if (l.type === 'tilelayer' && BATI.includes(l.name)) {
        for (const b of I.batiments) {
          const [x0, y0, w, h] = b.efface;
          for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) l.data[y * W + x] = 0;
        }
      }
      if (l.type === 'objectgroup' && l.name === 'batiments') l.objects = l.objects.filter((o) => !retire(o.name));
    }
    return data;
  };

  const mur = (c) => c === 'M' || c === 'F';

  // L'immeuble `im` (de la scène) contient-il la case (gx, gy) ?
  V.dansImmeuble = (im, gx, gy) => gx >= im.x && gy >= im.y && gx < im.x + im.w && gy < im.y + im.h;

  V.partie({

    // Les immeubles, posés niveau par niveau (V.planImmeuble), et leurs toits.
    makeImmeuble() {
      this.immeubles = [];
      this.immeubleIci = null;
      this.niveauVille = 0;
      if (V.etat.nom !== I.carte || !this.textures.exists(BLOCS.key)) return;
      for (const b of I.batiments) {
        const Fk = I.facades[b.facade].key;
        if (this.textures.exists(Fk)) this.immeubles.push(this.poseImmeuble(b, Fk));
      }
      // le voile de l'étage (montré quand on y est)
      if (this.immeubles.length) this.voileImmeuble = this.add.rectangle(0, 0, this.map.widthInPixels, this.map.heightInPixels, I.voile, I.alpha).setOrigin(0).setDepth(this.voileImmeubleZ()).setVisible(false);
    },

    // L'immeuble `b` (IMMEUBLE.batiments), sa façade à la clé `Fk` : { b, x, y, w, h, niveaux:
    // [{ objs, murs, marche, grille, plan }], toit, vue }.
    poseImmeuble(b, Fk) {
      const N = b.niveaux, bord = (x, y) => !x || !y || x === b.w - 1 || y === b.h - 1;
      const im = { b, x: b.x, y: b.y, w: b.w, h: b.h, niveaux: [], toit: null, vue: null };
      for (let n = 0; n < N; n++) {
        const plan = V.planImmeuble(b, n, N), G = plan.grille, lift = n * I.dy;
        // la façade de cet étage (le rez-de-chaussée, un étage, le dernier : immeuble_ville.png)
        const etage = I.facade.etages * (!n ? 0 : n === N - 1 ? 2 : 1);
        const a = (x, y) => (y >= 0 && y < b.h && x >= 0 && x < b.w ? G[y][x] : ' ');
        const objs = [], murs = [], marche = G.map((l) => [...l].map((c) => '.PUD'.includes(c)));
        const pose = (key, frame, x, y, z) => {
          const px = (b.x + x) * T + T / 2, py = (b.y + y + 1) * T;
          const o = this.add.image(px, py - lift, key, frame).setOrigin(0.5, 1);
          o.immZ = z(py) + n * 0.2;
          o.setDepth(o.immZ);
          objs.push(o);
          return o;
        };
        for (let y = 0; y < b.h; y++) {
          for (let x = 0; x < b.w; x++) {
            const c = a(x, y);
            // le plancher : au rez-de-chaussée dans les pièces, aux étages sur toute l'emprise
            const sol = (i, j) => (n ? a(i, j) !== ' ' : !' MFP'.includes(a(i, j)));
            // (aux étages, rangé au haut de sa case : sous les meubles, l'escalier, les murs et le
            // personnage de sa rangée, qu'il ne coupe pas ; au-dessus de ce qui est en bas)
            if (sol(x, y)) pose(BLOCS.key, BLOCS.sols + (sol(x, y - 1) ? 1 : 0) + (sol(x + 1, y) ? 2 : 0) + (sol(x, y + 1) ? 4 : 0) + (sol(x - 1, y) ? 8 : 0), x, y, (py) => (n ? py - T + 0.5 : py - T - 200));
            if (mur(c)) {
              const v = (dx, dy, porte) => mur(a(x + dx, y + dy)) || (porte && a(x + dx, y + dy) === 'P');
              const m = (v(0, -1) ? 1 : 0) + (v(1, 0, true) ? 2 : 0) + (v(0, 1) ? 4 : 0) + (v(-1, 0, true) ? 8 : 0);
              // (les murs du tour : ceux de la façade, avec ou sans fenêtre ; les cloisons : basses,
              // on voit le fond des pièces)
              const f = etage + (c === 'F' && !mur(a(x, y + 1)) ? I.facade.fenetre : 0) + m;
              const o = bord(x, y) ? pose(Fk, f, x, y, (py) => py) : pose(BLOCS.key, BLOCS.murs + m, x, y, (py) => py);
              murs.push({ o, x: (b.x + x) * T + T / 2, gy: b.y + y, facade: y === b.h - 1 });
            } else if (c === 'P') {
              const vert = mur(a(x, y - 1)) && mur(a(x, y + 1));
              const o = vert ? pose(BLOCS.key, I.porteVerticale, x, y, (py) => py) : bord(x, y) ? pose(Fk, I.facade.porte + (a(x - 1, y) === 'P' ? 1 : 0), x, y, (py) => py) : pose(BLOCS.key, BLOCS.porte, x, y, (py) => py);
              murs.push({ o, x: (b.x + x) * T + T / 2, gy: b.y + y, facade: y === b.h - 1 });
            } else if (c === 'U') pose(BLOCS.key, I.escalier, x, y, (py) => py - T / 2);
            else if (c === 'D') pose(BLOCS.key, I.haut, x, y, (py) => py - 0.05);
          }
        }
        // les meubles : posés en bas au milieu de leurs cases ; ils arrêtent la marche
        for (const mb of plan.meubles) {
          const key = 'meuble_' + mb.nom;
          if (!mb.plat) for (let j = 0; j < mb.h; j++) for (let i = 0; i < mb.w; i++) marche[mb.y + j][mb.x + i] = false;
          if (!this.textures.exists(key)) continue;
          const px = (b.x + mb.x + mb.w / 2) * T, py = (b.y + mb.y + mb.h) * T;
          const o = this.add.image(Math.round(px), py - (mb.plat ? 2 : 1) - lift, key).setOrigin(0.5, 1).setFlipX(!!mb.flip);
          o.immZ = (mb.plat ? py - T * mb.h + 0.5 : py - 3) + n * 0.2;
          o.setDepth(o.immZ);
          objs.push(o);
        }
        im.niveaux.push({ objs, murs, marche, grille: G, plan });
      }
      // le rez-de-chaussée : on y entre depuis la rue
      for (let y = 0; y < b.h; y++) for (let x = 0; x < b.w; x++) if (this.walk[b.y + y]) this.walk[b.y + y][b.x + x] = im.niveaux[0].marche[y][x];
      // le toit, sur le dernier niveau
      const cases = [];
      for (let y = 0; y < b.h; y++) for (let x = 0; x < b.w; x++) cases.push((b.y + y) * this.map.width + b.x + x);
      const { cv, c0, r0, r1, dx } = K.toit(cases, this.map.width);
      const cle = 'toit_' + b.nom;
      if (this.textures.exists(cle)) this.textures.remove(cle);
      this.textures.addCanvas(cle, cv);
      im.toit = this.add.image(c0 * T - dx, r0 * T - N * I.dy, cle).setOrigin(0, 0);
      im.toit.immZ = (r1 + 1) * T + N * 0.2 + I.toitZ;
      im.toit.setDepth(im.toit.immZ);
      return im;
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
      const im = this.immeubleIci;
      if (!im || !V.dansImmeuble(im, tx, ty)) return false;
      return im.niveaux[this.niveauVille].marche[ty - im.y][tx - im.x];
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
    // ce qu'on voit (dehors, dans un immeuble, à l'étage), et les murs devant le personnage.
    stepImmeuble(dt) {
      if (!this.immeubles || !this.immeubles.length) return;
      const P = this.heroPos, gx = Math.floor(P.x / T), gy = Math.floor((P.y - 1) / T);
      // (l'immeuble où l'on est : à l'étage, on ne peut en sortir qu'en redescendant)
      const ici = this.niveauVille && this.immeubleIci ? this.immeubleIci : this.immeubles.find((q) => V.dansImmeuble(q, gx, gy)) || null;
      this.immeubleIci = ici;
      const c0 = gy * this.map.width + gx;
      if (ici && c0 !== ici.case) {
        const c = ici.niveaux[this.niveauVille].grille[gy - ici.y][gx - ici.x];
        const vers = c === 'U' ? 1 : c === 'D' ? -1 : 0;
        if (vers) {
          this.niveauVille += vers;
          this.path = [];
        }
      }
      for (const im of this.immeubles) im.case = im === ici ? c0 : -1;
      // ce qu'on voit
      const haut = this.niveauVille > 0;
      for (const im of this.immeubles) {
        const vue = im === ici ? String(this.niveauVille) : 'dehors';
        if (vue === im.vue) continue;
        im.vue = vue;
        im.niveaux.forEach((nv, k) => {
          // (dedans : le niveau du dessous en transparence, ceux du dessus cachés)
          const a = vue === 'dehors' || k === this.niveauVille ? 1 : k === this.niveauVille - 1 ? I.transparent : 0;
          // (à l'étage, le niveau du dessous passe tout entier sous celui où l'on est : son
          // plancher le couvre, on n'en voit que ce qui dépasse de l'emprise)
          const z = (o) => (vue === 'dehors' || !haut ? o.immZ : this.immeubleZ(o.immZ) - (k < this.niveauVille ? 0.002 : 0));
          for (const o of nv.objs) o.setAlpha(a).setVisible(a > 0).setDepth(z(o));
          for (const m of nv.murs) m.a = a;
        });
        im.toit.setVisible(vue === 'dehors');
      }
      this.voileImmeuble.setVisible(haut);
      // dans l'immeuble : la façade de devant, et les murs du niveau une ou deux cases devant le
      // personnage, s'effacent un peu
      if (!ici) return;
      const pas = BLOCS.hauts.vitesse * dt;
      for (const m of ici.niveaux[this.niveauVille].murs) {
        const but = m.facade || (m.gy > gy && m.gy <= gy + 2 && Math.abs(m.x - P.x) < T / 2 + 6) ? I.mursAlpha : m.a;
        const a = m.o.alpha;
        if (a !== but) m.o.setAlpha(a < but ? Math.min(but, a + pas) : Math.max(but, a - pas));
      }
    },
  });
})(window);
