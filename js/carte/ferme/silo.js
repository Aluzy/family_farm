/* carte/ferme/silo.js — la scène de la ferme : le Silo de la ferme générée, en blocs de silo.
 *
 * Les blocs de silo (js/engine/blocs.js, etatSilo) se posent dehors en colonnes côte à côte, sur
 * une même rangée ; un bloc posé sur une colonne la rehausse (modèle.blocs : b.hauteur). Tant que
 * le silo n'est pas formé, chaque colonne est une pile de caisses de planches. Au moins LARGEUR
 * colonnes hautes de HAUTEUR blocs : elles deviennent un silo en bois (des douelles cerclées de
 * fer, un toit en dôme, une trappe en bas) ; une colonne plus basse, à côté, reste une pile de
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

  // `bloc` px de haut par bloc ; le toit, `toit` px ; le couvercle d'une caisse, `dessus` px.
  // Ce qu'il faut pour un silo (DATA.ATELIER.SILO) : `largeur` colonnes hautes de `hauteur` blocs.
  // Le personnage derrière : l'image à `alpha`.
  const S = { sorte: 'bloc_silo', bloc: 16, toit: 12, dessus: 5, largeur: 2, hauteur: 3, alpha: 0.45 };
  const C = {
    trait: '#3b2416', bois: ['#c08a52', '#a87442', '#8e5f35', '#744b2a'], clair: '#d9a76a',
    fer: '#4a4e57', ferClair: '#8a909b', toit: ['#7a2f22', '#9b3f2c', '#b9573b', '#d27a52'],
    trappe: '#4d2f1c', caisse: ['#b98450', '#9a6a3c', '#d4a46c'], ombre: 'rgba(30,18,10,0.25)',
  };

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

  // Le corps du silo sur les colonnes [i0, i1] (hautes de `h` blocs) : des douelles verticales,
  // ombrées comme un fût, cerclées de fer à chaque bloc, et son toit en dôme.
  function corps(g, x0, w, y, h) {
    const H = h * S.bloc;
    g.fillStyle = C.trait; g.fillRect(x0, y - H, w, H);
    for (let x = 1; x < w - 1; x++) {
      // (le jour vient de la gauche : clair à gauche, sombre à droite ; une douelle tous les 4 px)
      const t = x / (w - 1), n = t < 0.25 ? 0 : t < 0.6 ? 1 : t < 0.85 ? 2 : 3;
      g.fillStyle = (x % 4 === 0) ? C.bois[Math.min(3, n + 1)] : C.bois[n];
      g.fillRect(x0 + x, y - H + 1, 1, H - 1);
    }
    g.fillStyle = C.clair; g.fillRect(x0 + 2, y - H + 2, 1, H - 4);
    // les cercles de fer : un par bloc (et le pied)
    for (let j = 0; j < h; j++) {
      const yy = y - j * S.bloc - 3;
      g.fillStyle = C.fer; g.fillRect(x0 + 1, yy, w - 2, 2);
      g.fillStyle = C.ferClair; g.fillRect(x0 + 2, yy, Math.max(1, Math.floor(w / 3)), 1);
    }
    // le toit : un dôme de bardeaux, un peu plus large que le corps, et son faîte
    const R = S.toit, top = y - H;
    for (let j = 0; j < R; j++) {
      const k = Math.round(Math.sqrt(1 - (j / R) * (j / R)) * (w / 2 + 1));
      const cx = x0 + w / 2;
      g.fillStyle = C.trait; g.fillRect(Math.floor(cx - k - 1), top - j, 2 * k + 2, 1);
      if (k > 0) {
        g.fillStyle = C.toit[j % 3 === 0 ? 0 : j < R / 2 ? 1 : 2];
        g.fillRect(Math.floor(cx - k), top - j, 2 * k, 1);
        g.fillStyle = C.toit[3]; g.fillRect(Math.floor(cx - k) + 1, top - j, Math.max(1, Math.floor(k / 2)), 1);
      }
    }
    g.fillStyle = C.trait; g.fillRect(Math.floor(x0 + w / 2) - 1, top - R - 2, 2, 3);
  }

  // L'image des colonnes `cols` : un canvas (largeur : les colonnes ; hauteur : la plus haute et
  // son toit).
  function dessin(cols) {
    const n = cols.length, maxH = Math.max(...cols.map((c) => c.h));
    const W = n * T, H = maxH * S.bloc + S.toit + 4;
    const cv = document.createElement('canvas');
    cv.width = W; cv.height = H;
    const g = cv.getContext('2d');
    // les colonnes pleines côte à côte, de même hauteur : un corps (et un toit) pour elles
    let i = 0;
    while (i < n) {
      const c = cols[i];
      if (!c.pleine) {
        for (let j = 0; j < c.h; j++) caisse(g, i * T, H - j * S.bloc, j === c.h - 1);
        i += 1;
        continue;
      }
      let k = i;
      while (k + 1 < n && cols[k + 1].pleine && cols[k + 1].h === c.h) k += 1;
      corps(g, i * T, (k - i + 1) * T, H, c.h);
      i = k + 1;
    }
    // la trappe, en bas du premier corps
    const p = cols.findIndex((c) => c.pleine);
    if (p >= 0) {
      let q = p;
      while (q + 1 < n && cols[q + 1].pleine && cols[q + 1].h === cols[p].h) q += 1;
      const cx = Math.floor(((p + q + 1) * T) / 2);
      g.fillStyle = C.trait; g.fillRect(cx - 4, H - 11, 8, 10);
      g.fillStyle = C.trappe; g.fillRect(cx - 3, H - 10, 6, 9);
      g.fillStyle = C.fer; g.fillRect(cx + 1, H - 6, 1, 1);
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
      // (au-dessus de la colonne, mais sous le haut de l'image : pas sur elle)
      const haut = c.h * S.bloc + (c.pleine ? S.toit : S.dessus);
      return wy >= s.y - haut ? c.case : -1;
    },

    // Chaque image : le personnage derrière le silo le voit à travers.
    stepSilo() {
      const s = this.silo;
      if (!s) return;
      const p = this.fermier && this.fermier.pos ? this.fermier.pos() : null;
      const derriere = !!p && !this.room && p.y < s.y && p.y > s.y - s.h && p.x > s.x - 4 && p.x < s.x + s.w + 4;
      const a = derriere || this.bati ? S.alpha : 1;
      if (s.img.alpha !== a) s.img.setAlpha(a);
    },
  });
})(window);
