/* carte/ferme/eau.js — la scène de la ferme : l'eau vivante (un essai).
 *
 * Les étendues d'eau animées (sol.js makeTileAnims : une image par étendue) ondulent : un filtre
 * de déformation (Phaser 4, filters.internal.addDisplacement) que nourrit, à chaque image, une
 * texture dynamique où glissent deux vaguelettes sans raccord (des sinus de périodes entières,
 * dans les canaux rouge et vert), en sens contraires ; la terre des rives (les pixels ni bleus
 * ni blancs) est reposée telle quelle par-dessus, et l'eau déborde un peu sous elle : seuls
 * l'eau et son liseré blanc bougent, jamais l'herbe (eauRive). La lumière y joue selon l'heure :
 *   - le jour, des scintillements (de petites croix claires, en mode « ajouter ») paraissent
 *     et s'éteignent çà et là sur l'eau, loin des rives, plus nombreux et dorés quand le soleil est bas ;
 *   - la nuit, dans le voile de l'heure (avec les lanternes, chantier.js stepLanterns) : le
 *     reflet de la lune, une colonne de traits qui tremblent au milieu de l'étang, et celui des
 *     lumières posées au bord (lanternes, rayons des fenêtres) sur l'eau juste en dessous.
 * Seulement en WebGL (le filtre), et pas si le joueur a demandé moins d'animations.
 *
 * Méthodes de la scène de la ferme (js/farm-stage.js), posées sur son prototype.
 */
(function (global) {
  'use strict';

  const F = global.FermeCarte;
  const { T } = F.C;
  const { reducedMotion } = F;
  const E = F.C.EAU;
  const P = 64;   // la vaguelette : un carreau de P × P px sans raccord

  // Deux vaguelettes (a, b) : rouge et vert, chacun une somme de sinus aux périodes entières
  // (le carreau se répète sans raccord).
  function vaguelettes(textures) {
    if (textures.exists('eau_vague_a')) return;
    const ondes = [
      [[[1, 2, 0.4], [3, -1, 1.7], [-2, 3, 4.1]], [[2, 1, 2.2], [-1, 3, 0.9], [3, 2, 5.3]]],
      [[[2, -1, 3.1], [1, 3, 0.2], [-3, 2, 2.6]], [[1, -2, 1.1], [3, 1, 4.4], [-2, -3, 0.7]]],
    ];
    ondes.forEach((canaux, i) => {
      const cv = document.createElement('canvas');
      cv.width = cv.height = P;
      const g = cv.getContext('2d'), im = g.createImageData(P, P);
      for (let y = 0; y < P; y++) {
        for (let x = 0; x < P; x++) {
          const v = canaux.map((ws) => ws.reduce((s, [a, b, ph]) => s + Math.sin((2 * Math.PI * (a * x + b * y)) / P + ph), 0) / ws.length);
          const o = (y * P + x) * 4;
          im.data[o] = Math.round(128 + 127 * v[0]);
          im.data[o + 1] = Math.round(128 + 127 * v[1]);
          im.data[o + 2] = 128;
          im.data[o + 3] = 255;
        }
      }
      g.putImageData(im, 0, 0);
      textures.addCanvas('eau_vague_' + 'ab'[i], cv);
    });
    // le scintillement : une petite croix (le cœur, quatre branches pâles)
    const cv = document.createElement('canvas');
    cv.width = cv.height = 5;
    const g = cv.getContext('2d');
    g.fillStyle = 'rgba(255,255,255,0.55)';
    g.fillRect(2, 0, 1, 5); g.fillRect(0, 2, 5, 1);
    g.fillStyle = '#fff';
    g.fillRect(2, 1, 1, 3); g.fillRect(1, 2, 3, 1);
    textures.addCanvas('eau_scintille', cv);
  }

  F.partie({

    // L'eau vivante, posée (ou ôtée) sur les étendues animées du moment.
    syncEau() {
      const Ph = global.Phaser;
      const on = this.sys.renderer.type === (Ph && Ph.WEBGL) && !reducedMotion() && !this.room;
      const areas = on ? this.animAreas || [] : [];
      if (this.eauAreas === areas && this.eauOn === on) return;
      this.eauOff();
      this.eauOn = on;
      this.eauAreas = areas;
      if (!areas.length) return;
      vaguelettes(this.textures);
      const W = this.waters();
      this.eauVive = areas.map((a, i) => {
        const w = a.tex.width, h = a.tex.height;
        const carte = this.textures.addDynamicTexture(`eau_carte_${i}`, w, h);
        const ta = this.make.tileSprite({ x: 0, y: 0, width: w, height: h, key: 'eau_vague_a' }, false).setOrigin(0);
        const tb = this.make.tileSprite({ x: 0, y: 0, width: w, height: h, key: 'eau_vague_b' }, false).setOrigin(0).setAlpha(0.5);
        a.sprite.enableFilters();
        // (le filtre décale de amount × taille × (valeur − ½) : jusqu'à `ondule` px)
        const fx = a.sprite.filters.internal.addDisplacement(`eau_carte_${i}`, (2 * E.ondule) / w, (2 * E.ondule) / h);
        // la terre de l'étendue (l'herbe, la terre des rives), posée telle quelle par-dessus
        // l'eau qui ondule : elle ne bouge pas (eauRive)
        const rive = this.textures.createCanvas(`eau_rive_${i}`, w, h);
        const terre = this.add.image(a.x, a.y, `eau_rive_${i}`).setOrigin(0).setDepth(a.sprite.depth + 0.001);
        // les cases d'eau de l'étendue (les scintillements, les reflets)
        const eau = [];
        for (const k of W.keys()) { const [x, y] = k.split(',').map(Number); if (x >= a.x && y >= a.y && x < a.x + w && y < a.y + h) eau.push({ x, y }); }
        const v = { a, carte, ta, tb, fx, eau, rive, terre, i, brillants: [], profond: null };
        this.eauRive(v);
        return v;
      });
    },

    // Après chaque peinture d'une étendue (sol.js paintAnimArea) : ses pixels de terre (ni bleus
    // ni blancs : l'herbe, la terre des rives) vont sur l'image de la rive, qui ne bouge pas ; sous
    // eux, l'eau déborde de `ENTRE` px (la couleur de l'eau voisine) : en ondulant, le liseré
    // blanc de la rive et l'eau glissent sous la terre, jamais la terre sur l'eau. `profond` : les
    // pixels d'eau à `LOIN` px au moins de la terre (où naissent les scintillements).
    eauRive(v) {
      const ENTRE = 2, LOIN = 3;
      const w = v.a.tex.width, h = v.a.tex.height, ctx = v.a.tex.getContext();
      const im = ctx.getImageData(0, 0, w, h), d = im.data;
      // (de l'eau : dans une case d'eau ou de rive (waters), un pixel franchement bleu ou blanc
      // bleuté, le liseré ; ailleurs, et l'herbe sombre, les fleurs, les cailloux gris : la terre)
      const W = this.waters(), cases = new Uint8Array(Math.ceil(w / T) * Math.ceil(h / T)), cw = Math.ceil(w / T);
      for (let cy = 0; cy * T < h; cy++) for (let cx = 0; cx < cw; cx++) cases[cy * cw + cx] = W.has((v.a.x + cx * T) + ',' + (v.a.y + cy * T)) ? 1 : 0;
      const eau = new Uint8Array(w * h);
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const p = y * w + x, o = p * 4, r = d[o], g = d[o + 1], b = d[o + 2];
          if (!d[o + 3] || !cases[Math.floor(y / T) * cw + Math.floor(x / T)]) continue;
          const bleu = b >= r + 40 && b >= g, blanc = Math.min(r, g, b) >= 190 && b >= r && b >= g - 8;
          eau[p] = bleu || blanc ? 1 : 0;
        }
      }
      // la rive : les pixels de terre
      const rc = v.rive.getContext(), ri = rc.createImageData(w, h);
      for (let p = 0; p < w * h; p++) if (!eau[p] && d[p * 4 + 3]) for (let c = 0; c < 4; c++) ri.data[p * 4 + c] = d[p * 4 + c];
      rc.putImageData(ri, 0, 0);
      v.rive.refresh();
      // l'eau déborde sous la terre, ENTRE px (de proche en proche)
      let bord = eau.slice();
      for (let n = 0; n < ENTRE; n++) {
        const suite = bord.slice();
        for (let y = 0; y < h; y++) {
          for (let x = 0; x < w; x++) {
            const p = y * w + x;
            if (bord[p] || !d[p * 4 + 3]) continue;
            const q = x > 0 && bord[p - 1] ? p - 1 : x < w - 1 && bord[p + 1] ? p + 1 : y > 0 && bord[p - w] ? p - w : y < h - 1 && bord[p + w] ? p + w : -1;
            if (q < 0) continue;
            for (let c = 0; c < 3; c++) d[p * 4 + c] = d[q * 4 + c];
            suite[p] = 1;
          }
        }
        bord = suite;
      }
      // (le reste de la terre : transparent sous la rive ; en ondulant, il ne déborde pas d'un
      // pixel sur l'herbe d'à côté, hors de l'étendue)
      for (let p = 0; p < w * h; p++) if (!bord[p]) d[p * 4 + 3] = 0;
      ctx.putImageData(im, 0, 0);
      v.a.tex.refresh();
      // (l'eau loin de la terre : ni la rive, ni son liseré)
      const profond = new Uint8Array(w * h);
      for (let y = LOIN; y < h - LOIN; y++) {
        for (let x = LOIN; x < w - LOIN; x++) {
          let ok = 1;
          for (let dy = -LOIN; dy <= LOIN && ok; dy++) for (let dx = -LOIN; dx <= LOIN; dx++) if (!eau[(y + dy) * w + x + dx]) { ok = 0; break; }
          profond[y * w + x] = ok;
        }
      }
      v.profond = profond;
    },

    eauOff() {
      const avant = this.eauVive || [];
      for (const v of avant) {
        if (v.a.sprite.active && v.a.sprite.filters) v.a.sprite.filters.internal.remove(v.fx);
        for (const o of [v.ta, v.tb, v.terre, ...v.brillants.map((b) => b.img)]) o.destroy();
        this.textures.remove(`eau_carte_${v.i}`);
        this.textures.remove(`eau_rive_${v.i}`);
      }
      this.eauVive = null;
      // (l'étendue reprend sa peinture d'origine, sans l'eau qui déborde)
      for (const v of avant) if (v.a.sprite.active) this.paintAnimArea(v.a);
    },

    // À chaque image : les vaguelettes glissent (la carte de la déformation redessinée), les
    // scintillements naissent et s'éteignent.
    stepEau(time, dt) {
      this.syncEau();
      if (!this.eauVive) return;
      const s = time / 1000, cam = this.cameras.main.worldView;
      const m = this.ctx.lastModel || {}, sol = global.CarteKit.soleil(m.heure);
      for (const v of this.eauVive) {
        const a = v.a;
        const vu = !(a.x > cam.right || a.y > cam.bottom || a.x + a.tex.width < cam.x || a.y + a.tex.height < cam.y);
        if (!vu) continue;
        v.ta.tilePositionX = s * E.vitesse[0]; v.ta.tilePositionY = s * E.vitesse[1];
        v.tb.tilePositionX = -s * E.vitesse[1]; v.tb.tilePositionY = s * E.vitesse[0] * 0.7;
        v.carte.clear().draw(v.ta).draw(v.tb).render();
        this.stepScintille(v, sol, dt);
      }
    },

    // Les scintillements d'une étendue, le jour (sol : CarteKit.soleil, null la nuit).
    stepScintille(v, sol, dt) {
      const S = E.scintille;
      // plus nombreux quand le soleil est bas (sol.k : 0.3 à midi, 1 à l'horizon)
      const voulu = sol ? Math.round(v.eau.length * S.parCase * (0.4 + 0.6 * sol.k)) : 0;
      const dore = sol ? Math.max(0, (sol.k - 0.6) / 0.4) : 0;
      while (v.brillants.length < voulu) {
        const img = this.add.image(0, 0, 'eau_scintille').setBlendMode(global.Phaser.BlendModes.ADD).setDepth(0.15).setAlpha(0);
        v.brillants.push({ img, t: -Math.random() * S.vie[1], vie: 1 });
      }
      for (let j = v.brillants.length - 1; j >= 0; j--) {
        const b = v.brillants[j];
        b.t += dt;
        if (b.t < 0) continue;
        if (b.t >= b.vie) {
          if (j >= voulu) { b.img.destroy(); v.brillants.splice(j, 1); continue; }
          // ailleurs sur l'eau, loin des rives (v.profond ; sinon, il attend son tour)
          const w = v.a.tex.width, P2 = v.profond;
          let x = -1, y = -1;
          for (let essai = 0; essai < 8 && x < 0; essai++) {
            const c = v.eau[(Math.random() * v.eau.length) | 0];
            const px = Math.floor(c.x - v.a.x + Math.random() * T), py = Math.floor(c.y - v.a.y + Math.random() * T);
            if (P2 && P2[py * w + px]) { x = v.a.x + px; y = v.a.y + py; }
          }
          if (x < 0) { b.t = -0.2; b.img.setAlpha(0); continue; }
          b.img.setPosition(x, y);
          b.img.setTint(dore > Math.random() ? S.dore : S.clair);
          b.vie = S.vie[0] + Math.random() * (S.vie[1] - S.vie[0]);
          b.t = 0;
        }
        b.img.setAlpha(S.alpha * (sol ? sol.alpha / global.CarteKit.SOLEIL.alpha : 0) * Math.sin((Math.PI * b.t) / b.vie));
      }
    },

    // La nuit, les reflets dans le voile de l'heure : ajoutés à `out` (les lumières des
    // lanternes et des maisons, qu'ils reflètent ; chantier.js stepLanterns) ; `nuit` : V.nuit.
    stepEauLumiere(out, nuit, time) {
      if (!this.eauVive || nuit < 0.15) return;
      const R = E.reflets, k = Math.min(1, (nuit - 0.15) / 0.35), s = time / 1000;
      const W = this.waters();
      const tremble = (x, y, i) => Math.round(Math.sin(s * R.tremble + y * 0.7 + i) * R.ecart);
      const reflets = out.slice();
      for (const v of this.eauVive) {
        if (!v.eau.length) continue;
        // la lune : une colonne de traits au milieu de l'étendue, du haut de l'eau vers le bas
        const xs = v.eau.map((c) => c.x), ys = v.eau.map((c) => c.y);
        const cx = Math.round((Math.min(...xs) + Math.max(...xs) + T) / 2), y0 = Math.min(...ys), y1 = Math.max(...ys) + T;
        for (let y = y0 + 3, i = 0; y < y1 - 2; y += R.pas, i++) {
          const x = cx + tremble(cx, y, i);
          if (!W.has(Math.floor(x / T) * T + ',' + Math.floor(y / T) * T) || !v.profond[(y - v.a.y) * v.a.tex.width + x - v.a.x]) continue;
          // (des traits brisés, qui s'allument et s'éteignent, plus pâles vers les bords de l'eau)
          const v1 = Math.abs(Math.sin(s * 1.1 + i * 2.3)) * Math.abs(Math.sin(s * 0.7 + i * 0.9));
          if (v1 < 0.15) continue;
          const bord = Math.sin((Math.PI * (y - y0)) / (y1 - y0));
          const l = R.lune.long * (0.35 + 0.65 * v1) * (0.5 + 0.5 * bord);
          out.push({ key: 'lueur', x, y, tint: R.lune.teinte, alpha: R.lune.alpha * k * (0.4 + 0.6 * v1) * bord, scaleX: l / 64, scaleY: 1.6 / 64 });
        }
      }
      // les lumières posées au bord : leur reflet sur l'eau, juste en dessous d'elles
      for (const L of reflets) {
        if (L.alpha < 0.05) continue;
        const cx = Math.round(L.x), top = Math.floor(L.y / T) * T;
        for (let d = 1, i = 0; d <= R.portee; d++) {
          const y = top + d * T;
          if (!W.has(Math.floor(cx / T) * T + ',' + y)) continue;
          for (let yy = y + 2; yy < y + T; yy += R.pas, i++) {
            out.push({ key: 'lueur', x: cx + tremble(cx, yy, i), y: yy, tint: L.tint, alpha: Math.min(1, L.alpha) * R.lumiere * k / d, scaleX: (R.lune.long * 0.7) / 64, scaleY: 1.6 / 64 });
          }
        }
      }
    },
  });
})(window);
