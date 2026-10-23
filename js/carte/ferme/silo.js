/* carte/ferme/silo.js — la scène de la ferme : le Silo de la ferme générée, en blocs de silo.
 *
 * Les blocs de silo (js/engine/blocs.js, etatSilo) se posent dehors en colonnes côte à côte, sur
 * une même rangée ; un bloc posé sur une colonne la rehausse (modèle.blocs : b.hauteur). Tant que
 * le silo n'est pas formé, chaque colonne est une pile de caisses de planches. Au moins LARGEUR
 * colonnes hautes de HAUTEUR blocs : elles deviennent un silo en bois (des douelles cerclées de
 * fer sur un socle de pierres, un dôme de tuiles, une trappe en bas ; vu de haut à 45° comme les
 * blocs) ; une colonne plus basse, à côté, reste une pile de
 * caisses (en construction). Le tout est une seule image, dessinée ici (pas de planche), refaite
 * quand les colonnes changent.
 *
 * Un appui sur le silo (ou ses caisses) ouvre la fenêtre du Silo (siloAt) ; un appui long, le mode
 * Construire avec un bloc de silo en main (js/farm-stage.js) ; en mode Construire, un appui sur
 * l'image vise la case du pied de sa colonne (siloCaseAt). Le personnage qui passe derrière le
 * voit à travers (stepSilo).
 *
 * Méthodes de la scène de la ferme (js/farm-stage.js), posées sur son prototype : `this` est la
 * scène, `this.ctx` ce que la page lui a donné au montage (voir docs/architecture-phaser.md).
 */
(function (global) {
  'use strict';

  const F = global.FermeCarte;
  const { T } = F.C;

  // `bloc` px de haut par bloc ; le couvercle d'une caisse, `dessus` px.
  // Ce qu'il faut pour un silo (DATA.ATELIER.SILO) : `largeur` colonnes hautes de `hauteur` blocs.
  // Le personnage derrière : l'image à `alpha`.
  const S = { sorte: 'bloc_silo', bloc: 16, dessus: 5, largeur: 2, hauteur: 3, alpha: 0.45 };
  const C = { trait: '#3b2416', fer: '#4a4e57', caisse: ['#b98450', '#9a6a3c', '#d4a46c'] };

  // Les colonnes du silo : [{ case, h, pleine }], de gauche à droite (une même rangée).
  function colonnes(list) {
    const cols = (list || []).filter((b) => b.sorte === S.sorte).map((b) => ({ case: b.case, h: Math.max(1, b.hauteur || 1) }));
    cols.sort((a, b) => a.case - b.case);
    for (const c of cols) c.pleine = c.h >= S.hauteur;
    // (formé : assez de colonnes pleines ; sinon, toutes des piles de caisses)
    const ok = cols.filter((c) => c.pleine).length >= S.largeur;
    if (!ok) for (const c of cols) c.pleine = false;
    return cols;
  }

  // Une caisse de planches (x, y : son coin bas-gauche ; `haut` : son couvercle se voit).
  function caisse(g, x, y, haut) {
    const b = S.bloc, k = C.caisse;
    g.fillStyle = C.trait; g.fillRect(x, y - b, T, b);
    g.fillStyle = k[0]; g.fillRect(x + 1, y - b + 1, T - 2, b - 2);
    // planches couchées, deux bandes de fer
    g.fillStyle = k[1];
    for (let j = 4; j < b - 1; j += 4) g.fillRect(x + 1, y - b + j, T - 2, 1);
    g.fillStyle = C.fer; g.fillRect(x + 3, y - b + 1, 1, b - 2); g.fillRect(x + T - 4, y - b + 1, 1, b - 2);
    if (haut) {
      g.fillStyle = C.trait; g.fillRect(x, y - b - S.dessus, T, S.dessus + 1);
      g.fillStyle = k[2]; g.fillRect(x + 1, y - b - S.dessus + 1, T - 2, S.dessus - 1);
      g.fillStyle = k[0]; g.fillRect(x + 1, y - b - 1, T - 2, 1);
    }
  }

  // Le corps du silo, vu de haut à 45° comme les blocs (scripts/rendu45.py, le même principe) :
  // un fût de douelles cerclé de fer sur un socle de pierres, un dôme de tuiles à nervures et
  // son chapeau d'aération, une trappe en bas devant. Des surfaces décrites en 3D (x vers la
  // droite, d vers le fond, z vers le haut), échantillonnées tous les PAS px et projetées (une
  // hauteur sur HAUT, une profondeur sur FOND), un tampon de profondeur, puis un trait sombre là
  // où un objet passe devant un autre et autour du tout. Le fût fait `w` px de large ; sa face
  // se voit sur h × bloc px, comme la pile de caisses qu'il remplace. Rend un canvas (le bas du
  // fût sur son bas).
  const V = {
    HAUT: 14 / 16, FOND: 10 / 16, PAS: 0.25, socle: 3, ecart: 2.5,
    bois: [[116, 75, 42], [142, 95, 53], [168, 116, 66], [192, 138, 82], [217, 167, 106]],
    tuile: [[92, 34, 24], [122, 47, 34], [155, 63, 44], [185, 87, 59], [210, 122, 82]],
    fer: [[52, 54, 60], [74, 78, 87], [138, 144, 155]],
    pierre: [[100, 92, 78], [125, 116, 99], [150, 140, 120], [173, 163, 143], [196, 186, 166]],
    trait: [36, 30, 20], trappe: [[44, 30, 20], [60, 40, 26]],
  };
  const LUM = (() => { const l = [-0.55, -0.45, 0.70], n = Math.hypot(...l); return l.map((c) => c / n); })();
  const eclaire = (nx, nd, nz) => Math.max(0, (nx * LUM[0] + nd * LUM[1] + nz * LUM[2]) / (Math.hypot(nx, nd, nz) || 1));
  const ton = (r, s, dec = 0) => r[Math.max(0, Math.min(r.length - 1, Math.round(s * (r.length - 1)) + dec))];

  function corps(w, h) {
    const R = w / 2 - 1.4, HZ = (h * S.bloc) / V.HAUT, HD = 0.75 * R, z0 = V.socle;
    const bas = Math.ceil(R * V.FOND) + 2;
    const haut = Math.ceil(Math.max(HZ * V.HAUT + R * V.FOND, (HZ + HD + 2) * V.HAUT)) + 2;
    const W = w, H = haut + bas, X0 = w / 2, Y0 = H - bas + 0.5;
    const cle = new Float32Array(W * H).fill(-Infinity), col = new Array(W * H), obj = new Int8Array(W * H);
    const point = (x, d, z, c, o) => {
      const sx = Math.floor(X0 + x), sy = Math.floor(Y0 - z * V.HAUT - d * V.FOND);
      if (sx < 0 || sx >= W || sy < 0 || sy >= H) return;
      const i = sy * W + sx, k = z * V.FOND - d * V.HAUT;
      if (k > cle[i]) { cle[i] = k; col[i] = c; obj[i] = o; }
    };
    // (le devant d'un cylindre : phi de pi à 2 pi ; 0 à droite, 3 pi / 2 devant)
    const flanc = (r, za, zb, couleur, o) => {
      const n = Math.ceil((Math.PI * r) / V.PAS) + 4;
      for (let z = za; z <= zb; z += V.PAS) {
        for (let i = -2; i <= n; i++) {
          const phi = Math.PI + (Math.PI * i) / (n - 4), nx = Math.cos(phi), nd = Math.sin(phi);
          point(r * nx, r * nd, z, couleur(phi, z, eclaire(nx, nd, 0)), o);
        }
      }
    };
    const O = { socle: 1, fut: 2, trappe: 3, dome: 4, chapeau: 5 };
    // le socle : une rangée de pierres
    flanc(R + 0.6, 0, z0, (phi, z, s) => {
      const u = (phi * (R + 0.6)) / 6 + (z > 1.5 ? 0.5 : 0);
      return (u % 1) < 0.12 || Math.abs(z - 1.5) < 0.35 ? ton(V.pierre, s, -2) : ton(V.pierre, s * 0.9 + 0.1);
    }, O.socle);
    // le fût : des douelles, cerclées de fer (deux fers rapprochés) entre les blocs
    const cercles = [];
    for (let j = 1; j < h; j++) cercles.push((j * HZ) / h - 1);
    flanc(R, z0, HZ, (phi, z, s) => {
      for (const c of cercles) {
        if (Math.abs(z - c) < 0.55 || Math.abs(z - c - 1.6) < 0.55) return ton(V.fer, s);
        if (z >= c + 0.55 && z <= c + 1.05) return ton(V.bois, s * 0.6);
      }
      const u = (phi * R) / 2.6;
      if (((u % 1) + 1) % 1 < 0.28) return ton(V.bois, s, -1);
      return ton(V.bois, s * 0.9 + 0.05, (Math.floor(u) * 5) % 7 === 2 ? 1 : 0);
    }, O.fut);
    // la trappe, devant en bas, et son loquet
    for (let x = -3.5; x <= 3.5; x += V.PAS) {
      const d = -Math.sqrt(Math.max(0, R * R - x * x)) - 0.15;
      for (let z = z0 + 1; z <= z0 + 10; z += V.PAS) {
        const bord = Math.abs(Math.abs(x) - 3.5) < 0.4 || Math.abs(z - z0 - 1) < 0.4 || Math.abs(z - z0 - 9.8) < 0.4;
        let c = bord ? V.trait : ((x * 4) % 6 + 6) % 6 > 0.6 ? V.trappe[1] : V.trappe[0];
        if (Math.abs(x - 2) < 0.4 && Math.abs(z - z0 - 5) < 0.6) c = V.fer[2];
        point(x, d, z, c, O.trappe);
      }
    }
    // le dôme : des tuiles en rangs, douze nervures
    const RD = R + 0.5;
    for (let rho = 0; rho <= RD; rho += V.PAS) {
      const q = Math.min(1, rho / RD), dz = HD * Math.sqrt(Math.max(0, 1 - q * q));
      const g = (q / Math.max(0.05, Math.sqrt(Math.max(0.0025, 1 - q * q)))) * (HD / RD);
      const n = Math.max(8, Math.ceil((2 * Math.PI * Math.max(rho, 0.5)) / V.PAS));
      for (let i = 0; i < n; i++) {
        const phi = (2 * Math.PI * i) / n, s = eclaire(Math.cos(phi) * g, Math.sin(phi) * g, 1);
        const a = ((phi * 12) / (2 * Math.PI)) % 1;
        // (le bord de l'avant-toit, sombre)
        const c = rho > RD - 0.6 ? V.tuile[0] : rho < 1.6 ? V.tuile[1] : a < 0.08 || rho % 3 < 0.6 ? ton(V.tuile, s, -1) : ton(V.tuile, s * 0.95 + 0.05);
        point(rho * Math.cos(phi), rho * Math.sin(phi), HZ + dz, c, O.dome);
      }
    }
    // le chapeau d'aération
    const zc = HZ + HD - 0.5;
    flanc(1.6, zc, zc + 2.5, (phi, z, s) => ton(V.fer, s), O.chapeau);
    for (let rho = 0; rho <= 2.2; rho += V.PAS) {
      for (let i = 0; i < 60; i++) {
        const phi = (2 * Math.PI * i) / 60;
        point(rho * Math.cos(phi), rho * Math.sin(phi), zc + 2.5, rho < 1.4 ? V.fer[2] : V.fer[1], O.chapeau);
      }
    }
    // l'image : les points, les traits entre objets (pas entre ceux qui se touchent), le contour
    const lies = (a, b) => { const p = Math.min(a, b) * 8 + Math.max(a, b); return p === O.socle * 8 + O.fut || p === O.fut * 8 + O.trappe || p === O.dome * 8 + O.chapeau; };
    const out = new Array(W * H);
    for (let i = 0; i < W * H; i++) out[i] = col[i];
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const i = y * W + x;
        if (!col[i]) continue;
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const xx = x + dx, yy = y + dy;
          if (xx < 0 || xx >= W || yy < 0 || yy >= H) continue;
          const j = yy * W + xx;
          if (col[j] && obj[j] !== obj[i] && cle[j] < cle[i] - V.ecart && !lies(obj[i], obj[j])) out[j] = V.trait;
        }
      }
    }
    const cv = document.createElement('canvas');
    cv.width = W; cv.height = H;
    const g = cv.getContext('2d'), img = g.createImageData(W, H);
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const i = y * W + x;
        let c = out[i];
        if (!c && [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => { const xx = x + dx, yy = y + dy; return xx >= 0 && xx < W && yy >= 0 && yy < H && col[yy * W + xx]; })) c = V.trait;
        if (!c) continue;
        img.data.set([c[0], c[1], c[2], 255], i * 4);
      }
    }
    g.putImageData(img, 0, 0);
    return cv;
  }

  // L'image des colonnes `cols` : un canvas (largeur : les colonnes ; hauteur : la plus haute,
  // son couvercle ou son dôme).
  function dessin(cols) {
    const n = cols.length, maxH = Math.max(...cols.map((c) => c.h));
    // les colonnes pleines côte à côte, de même hauteur : un corps pour elles
    const parts = [];
    let i = 0;
    while (i < n) {
      const c = cols[i];
      if (!c.pleine) { parts.push({ i, caisses: c.h }); i += 1; continue; }
      let k = i;
      while (k + 1 < n && cols[k + 1].pleine && cols[k + 1].h === c.h) k += 1;
      parts.push({ i, cv: corps((k - i + 1) * T, c.h) });
      i = k + 1;
    }
    const W = n * T, H = Math.max(maxH * S.bloc + S.dessus + 2, ...parts.filter((p) => p.cv).map((p) => p.cv.height));
    const cv = document.createElement('canvas');
    cv.width = W; cv.height = H;
    const g = cv.getContext('2d');
    for (const p of parts) {
      if (p.cv) g.drawImage(p.cv, p.i * T, H - p.cv.height);
      else for (let j = 0; j < p.caisses; j++) caisse(g, p.i * T, H - j * S.bloc, j === p.caisses - 1);
    }
    return cv;
  }

  F.partie({

    // Les blocs de silo du modèle (modèle.blocs : sorte bloc_silo, hauteur) : l'image du silo,
    // refaite quand ses colonnes changent ; aucune : rien.
    syncSilo(list) {
      const cols = colonnes(list);
      const cle = cols.map((c) => `${c.case}:${c.h}:${c.pleine ? 1 : 0}`).join(',');
      if (this.silo && this.silo.cle === cle) return;
      if (this.silo) { this.silo.img.destroy(); if (this.textures.exists(this.silo.tex)) this.textures.remove(this.silo.tex); this.silo = null; }
      if (!cols.length) return;
      const cv = dessin(cols), W = this.grid.cols;
      const tex = 'silo_blocs_' + (this.siloN = (this.siloN || 0) + 1);
      this.textures.addCanvas(tex, cv);
      const c0 = cols[0].case % W, r = Math.floor(cols[0].case / W);
      const x = c0 * T, y = (r + 1) * T;
      const img = this.add.image(x, y, tex).setOrigin(0, 1).setDepth(y);
      this.silo = { cle, tex, img, cols, x, y, w: cv.width, h: cv.height, forme: cols.some((c) => c.pleine) };
      this.sunDirty = true;
    },

    // Le point (wx, wy) est-il sur le silo (son image) ?
    siloAt(wx, wy) {
      const s = this.silo;
      return !!s && wx >= s.x && wx < s.x + s.w && wy <= s.y && wy >= s.y - s.h;
    },

    // En mode Construire : la case du pied de la colonne sous (wx, wy) (sur son image), ou -1.
    siloCaseAt(wx, wy) {
      const s = this.silo;
      if (!this.siloAt(wx, wy)) return -1;
      const i = Math.floor((wx - s.x) / T), c = s.cols[i];
      if (!c) return -1;
      // (au-dessus d'une pile de caisses, mais sous le haut de l'image : pas sur elle ; le silo
      // formé, lui, couvre toute l'image)
      const haut = c.pleine ? s.h : c.h * S.bloc + S.dessus;
      return wy >= s.y - haut ? c.case : -1;
    },

    // Chaque image : le personnage derrière le silo le voit à travers.
    stepSilo() {
      const s = this.silo;
      if (!s) return;
      const p = this.fermier && this.fermier.pos ? this.fermier.pos() : null;
      const derriere = !!p && p.y < s.y && p.y > s.y - s.h && p.x > s.x - 4 && p.x < s.x + s.w + 4;
      const a = derriere || this.bati ? S.alpha : 1;
      if (s.img.alpha !== a) s.img.setAlpha(a);
    },
  });
})(window);
