/* carte/ferme/eau.js — la scène de la ferme : l'eau vivante (un essai).
 *
 * Les étendues d'eau animées (sol.js makeTileAnims : une image par étendue) sont peintes par un
 * shader (EAU_FRAG : vagues, eau plus sombre au large, reflets de lumière au fond, ciel de
 * l'heure, ligne d'écume qui avance et recule le long de la rive). L'eau ondule : le shader la
 * décale selon une texture dynamique où glissent deux vaguelettes sans raccord (des sinus de périodes entières,
 * dans les canaux rouge et vert), en sens contraires ; la terre des rives (les pixels ni bleus
 * ni blancs) est reposée telle quelle par-dessus, et l'eau déborde un peu sous elle : seuls
 * l'eau et son liseré blanc bougent, jamais l'herbe (eauRive). La lumière y joue selon l'heure :
 *   - le jour, des scintillements (de petites croix claires, en mode « ajouter ») paraissent
 *     et s'éteignent çà et là sur l'eau, loin des rives, plus nombreux et dorés quand le soleil est bas ;
 *   - la nuit, dans le voile de l'heure (avec les lanternes, chantier.js stepLanterns) : le
 *     reflet de la lune, une colonne de traits qui tremblent au milieu de l'étang, et celui des
 *     lumières posées au bord (lanternes, rayons des fenêtres) sur l'eau juste en dessous.
 * Ce qui se tient au bord se reflète dans l'eau (stepReflets) : arbres, bâtiments, toits,
 * personnages, bêtes, chacun retourné sous son pied, teinté, à `EAU.miroir.alpha` ; dessinés
 * avec les ronds dans une texture par étendue, découpée à l'eau (ses pixels hors de l'eau
 * effacés) et qui ondule avec elle (le même filtre).
 * Des ronds s'élargissent sur l'eau (rond) : au bouchon de la pêche (peche.js ripple), quand
 * un poisson saute (de temps en temps, sautPoisson), quand quelqu'un longe la rive, et de
 * petits ronds au hasard (des insectes).
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
    // les ronds : des ellipses d'un pixel, de plus en plus grandes (E.ronds.images images de
    // RW × RH px, l'une à côté de l'autre)
    const N = E.ronds.images, rv = document.createElement('canvas');
    rv.width = RW * N; rv.height = RH;
    const gr = rv.getContext('2d');
    gr.fillStyle = '#fff';
    for (let i = 0; i < N; i++) {
      const rx = 2 + (i * (RW / 2 - 3)) / (N - 1), ry = rx / 2, cx = i * RW + RW / 2, cy = RH / 2;
      const vus = new Set();
      for (let k = 0; k < 96; k++) {
        const t = (2 * Math.PI * k) / 96, x = Math.round(cx + rx * Math.cos(t) - 0.5), y = Math.round(cy + ry * Math.sin(t) - 0.5);
        if (!vus.has(x + ',' + y)) { vus.add(x + ',' + y); gr.fillRect(x, y, 1, 1); }
      }
    }
    const tx = textures.addCanvas('eau_ronds', rv);
    for (let i = 0; i < N; i++) tx.add(i, 0, i * RW, 0, RW, RH);
  }
  const RW = 24, RH = 12;

  // Le shader de l'eau (js/carte/ferme/eau.js syncEau ; E.shader) : il peint l'eau de
  // l'étendue à partir de son image (uBase : l'eau seule, la terre transparente, eauRive), pixel
  // par pixel (les pixels de la carte, pas ceux de l'écran) :
  //   - l'eau ondule (uVague : la carte de la déformation, décalée de pixels entiers) ;
  //   - des vagues : leurs crêtes, de petits traits clairs qui serpentent et glissent (une onde
  //     au-dessus de uVagues.x, coupée par une autre), au large ; leurs creux, plus sombres ;
  //   - plus sombre au large (uChamp : la distance à la terre, 0 à 15 px) ;
  //   - des reflets de lumière au fond, là où l'eau est peu profonde (des lignes fines qui
  //     bougent : là où deux ondes s'annulent) ;
  //   - le ciel s'y reflète (uCiel, la lumière de l'heure, à uCielK) ;
  //   - le long de la rive, une ligne d'écume qui avance et recule (6), à tant de px de la terre.
  const EAU_FRAG = `
#pragma phaserTemplate(shaderName)
precision mediump float;
uniform sampler2D uBase;
uniform sampler2D uChamp;
uniform sampler2D uVague;
uniform vec2 uTaille;
uniform float uTemps;
uniform float uOndule;
uniform vec3 uCiel;
uniform float uCielK;
uniform vec4 uVagues;
uniform vec4 uEcume;
varying vec2 outTexCoord;
float reflet(vec2 p, float t) {
  vec2 q = p * 0.16;
  float v = sin(q.x + 1.7 * sin(q.y * 0.8 + t * 0.7)) + sin(q.y * 1.2 + 1.5 * sin(q.x * 0.9 - t * 0.6));
  return step(abs(v), 0.09);
}
void main() {
  vec2 px = floor(outTexCoord * uTaille) + 0.5;
  vec2 w = texture2D(uVague, px / uTaille).rg - 0.5;
  vec2 off = floor(w * 2.0 * uOndule + 0.5);
  vec4 base = texture2D(uBase, (px + off) / uTaille);
  if (base.a < 0.5) { gl_FragColor = vec4(0.0); return; }
  float d = texture2D(uChamp, px / uTaille).r * 15.0;
  float t = uTemps;
  vec3 c = base.rgb;
  float large = smoothstep(3.0, 7.0, d);
  float h = sin(dot(px, vec2(0.07, 0.23)) + t * 1.2 + 0.9 * sin(px.x * 0.06 - t * 0.5));
  float k = sin(dot(px, vec2(0.13, -0.05)) - t * 0.7);
  c = mix(c, c * 1.12 + 0.07, step(uVagues.x, h) * step(0.55, k) * large * uVagues.z);
  c *= 1.0 - uVagues.w * step(h, uVagues.y) * step(0.55, -k) * large;
  c *= mix(1.0, 0.86, smoothstep(4.0, 15.0, d));
  c += vec3(0.09, 0.11, 0.09) * reflet(px, t) * (1.0 - smoothstep(2.0, 7.0, d));
  c = mix(c, uCiel, uCielK);
  float va = 0.5 + 0.5 * sin(t * uEcume.z + (px.x + px.y) * 0.045);
  float bord = uEcume.x + uEcume.y * va;
  float ecume = step(abs(d - bord), 0.55) * step(1.0, d);
  c = mix(c, vec3(0.93, 0.97, 1.0), ecume * uEcume.w);
  gl_FragColor = vec4(c, 1.0);
}`;

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
        // l'eau elle-même : le shader (EAU_FRAG) à la place de l'image de l'étendue (cachée)
        const champ = this.textures.createCanvas(`eau_champ_${i}`, w, h);
        const uni = { temps: 0, ciel: [1, 1, 1], cielK: 0 };
        const S = E.shader;
        const shader = this.add.shader({
          name: 'eauVive', fragmentSource: EAU_FRAG, initialUniforms: { uBase: 0, uChamp: 1, uVague: 2 },
          setupUniforms: (set) => {
            set('uTaille', [w, h]); set('uTemps', uni.temps); set('uOndule', E.ondule);
            set('uCiel', uni.ciel); set('uCielK', uni.cielK);
            set('uVagues', [S.crete, S.creux, S.clair, S.sombre]);
            set('uEcume', [S.ecume.pres, S.ecume.va, S.ecume.vitesse, S.ecume.alpha]);
          },
        }, a.x, a.y, w, h, [a.tex.key, `eau_champ_${i}`, `eau_carte_${i}`]).setOrigin(0).setDepth(a.sprite.depth);
        a.sprite.setAlpha(0);
        const fx = null;
        // la terre de l'étendue (l'herbe, la terre des rives), posée telle quelle par-dessus
        // l'eau qui ondule : elle ne bouge pas (eauRive)
        const rive = this.textures.createCanvas(`eau_rive_${i}`, w, h);
        const terre = this.add.image(a.x, a.y, `eau_rive_${i}`).setOrigin(0).setDepth(a.sprite.depth + 0.001);
        // les cases d'eau de l'étendue (les scintillements, les reflets)
        const eau = [];
        for (const k of W.keys()) { const [x, y] = k.split(',').map(Number); if (x >= a.x && y >= a.y && x < a.x + w && y < a.y + h) eau.push({ x, y }); }
        // les reflets et les ronds : une texture par étendue, découpée à l'eau (`sec` : ce qui
        // n'est pas de l'eau, effacé), qui ondule avec elle, juste au-dessus de l'eau
        const refl = this.textures.addDynamicTexture(`eau_refl_${i}`, w, h);
        const reflet = this.add.image(a.x, a.y, `eau_refl_${i}`).setOrigin(0).setDepth(a.sprite.depth + 0.0005);
        reflet.enableFilters();
        const fx2 = reflet.filters.internal.addDisplacement(`eau_carte_${i}`, (2 * E.ondule) / w, (2 * E.ondule) / h);
        const sec = this.textures.createCanvas(`eau_sec_${i}`, w, h);
        const secImg = this.make.image({ x: 0, y: 0, key: `eau_sec_${i}` }, false).setOrigin(0);
        const v = { a, carte, ta, tb, fx, fx2, champ, shader, uni, eau, rive, terre, refl, reflet, sec, secImg, i, brillants: [], profond: null, eauPx: null, ronds: [] };
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
      // ce qui n'est pas de l'eau (les reflets y sont effacés)
      const sc = v.sec.getContext(), si = sc.createImageData(w, h);
      for (let p = 0; p < w * h; p++) if (!eau[p]) si.data[p * 4 + 3] = 255;
      sc.putImageData(si, 0, 0);
      v.sec.refresh();
      v.eauPx = eau;
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
      // le champ : la distance de chaque pixel d'eau à la terre (en px, jusqu'à 15 ; de proche en
      // proche, en comptant les diagonales), dans le rouge (le shader : uChamp)
      if (v.champ) {
        // (les petits îlots de « terre » dans l'eau, roseaux, cailloux : de l'eau pour le champ,
        // ni écume ni rive autour d'eux)
        const ilot = new Uint8Array(w * h), vu = new Uint8Array(w * h);
        for (let p0 = 0; p0 < w * h; p0++) {
          if (eau[p0] || vu[p0]) continue;
          const comp = [p0];
          vu[p0] = 1;
          for (let i = 0; i < comp.length && comp.length <= E.shader.ilot; i++) {
            const p = comp[i], x = p % w, y = (p / w) | 0;
            for (const q of [x > 0 ? p - 1 : -1, x < w - 1 ? p + 1 : -1, y > 0 ? p - w : -1, y < h - 1 ? p + w : -1]) {
              if (q >= 0 && !eau[q] && !vu[q]) { vu[q] = 1; comp.push(q); }
            }
          }
          if (comp.length <= E.shader.ilot) for (const p of comp) ilot[p] = 1;
        }
        const D = new Uint8Array(w * h).fill(15), file = [];
        for (let p = 0; p < w * h; p++) if (!eau[p] && !ilot[p]) { D[p] = 0; file.push(p); }
        for (let i = 0; i < file.length; i++) {
          const p = file[i], x = p % w, y = (p / w) | 0, n = D[p] + 1;
          if (n >= 15) continue;
          for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
              const xx = x + dx, yy = y + dy;
              if (xx < 0 || yy < 0 || xx >= w || yy >= h) continue;
              const q = yy * w + xx;
              if (D[q] > n) { D[q] = n; file.push(q); }
            }
          }
        }
        const cc = v.champ.getContext(), ci = cc.createImageData(w, h);
        for (let p = 0; p < w * h; p++) { ci.data[p * 4] = Math.round((D[p] * 255) / 15); ci.data[p * 4 + 3] = 255; }
        cc.putImageData(ci, 0, 0);
        v.champ.refresh();
      }
    },

    eauOff() {
      const avant = this.eauVive || [];
      for (const v of avant) {
        if (v.a.sprite.active) v.a.sprite.setAlpha(1);
        for (const o of [v.ta, v.tb, v.terre, v.reflet, v.secImg, v.shader, ...v.brillants.map((b) => b.img)]) o.destroy();
        for (const k of ['carte', 'rive', 'refl', 'sec', 'champ']) this.textures.remove(`eau_${k}_${v.i}`);
      }
      this.eauVive = null;
      for (const o of this.refletPool || []) o.destroy();
      this.refletPool = null;
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
      const ciel = global.CarteKit.lumiere(m.heure == null ? 12 : m.heure).map((c, k) => (c / 255) * E.shader.bleu[k]);
      for (const v of this.eauVive) {
        const a = v.a;
        const vu = !(a.x > cam.right || a.y > cam.bottom || a.x + a.tex.width < cam.x || a.y + a.tex.height < cam.y);
        if (!vu) continue;
        v.ta.tilePositionX = s * E.vitesse[0]; v.ta.tilePositionY = s * E.vitesse[1];
        v.tb.tilePositionX = -s * E.vitesse[1]; v.tb.tilePositionY = s * E.vitesse[0] * 0.7;
        v.carte.clear().draw(v.ta).draw(v.tb).render();
        // (le shader : le temps, le ciel de l'heure)
        v.uni.temps = s;
        v.uni.ciel = ciel;
        v.uni.cielK = E.shader.ciel;
        this.stepScintille(v, sol, dt);
        this.stepRonds(v, dt);
        this.stepReflets(v);
      }
      this.stepRives(dt);
    },

    // Un rond qui s'élargit sur l'eau, en (x, y) (px de carte) ; faux si l'eau vivante n'est pas
    // là (peche.js ripple dessine alors le sien).
    rond(x, y, gros) {
      const v = this.eauVive && this.eauVive.find((e) => x >= e.a.x && y >= e.a.y && x < e.a.x + e.a.tex.width && y < e.a.y + e.a.tex.height && e.eauPx && e.eauPx[Math.floor(y - e.a.y) * e.a.tex.width + Math.floor(x - e.a.x)]);
      if (!v) return !!this.eauVive;
      v.ronds.push({ x: Math.round(x), y: Math.round(y), t: 0, vie: E.ronds.vie * (gros ? 1.3 : 1), a: gros ? 1 : 0.7 });
      return true;
    },

    // Les ronds d'une étendue : ils vieillissent ; de petits ronds naissent au hasard (des
    // insectes), et de temps en temps un poisson saute.
    stepRonds(v, dt) {
      const R = E.ronds;
      for (let j = v.ronds.length - 1; j >= 0; j--) if ((v.ronds[j].t += dt) >= v.ronds[j].vie) v.ronds.splice(j, 1);
      if (!v.profond) return;
      const n = v.eau.length / 100;
      if (Math.random() < R.hasard * n * dt) {
        const q = this.eauLoin(v);
        if (q) v.ronds.push({ x: q.x, y: q.y, t: 0, vie: R.vie * 0.7, a: 0.45, petit: true });
      }
      if (v.eau.length >= R.poissons && !v.saut && Math.random() < dt / R.saut) this.sautPoisson(v);
    },

    // Un point de l'eau loin des rives (v.profond), au hasard ; null si on n'en trouve pas.
    eauLoin(v) {
      const w = v.a.tex.width;
      for (let essai = 0; essai < 10; essai++) {
        const c = v.eau[(Math.random() * v.eau.length) | 0];
        const px = Math.floor(c.x - v.a.x + Math.random() * T), py = Math.floor(c.y - v.a.y + Math.random() * T);
        if (v.profond[py * w + px]) return { x: v.a.x + px, y: v.a.y + py };
      }
      return null;
    },

    // Un poisson saute hors de l'eau et y retombe un peu plus loin : un rond où il part, un
    // autre où il replonge (son image : celle des poissons pêchés, peche.js fishTexture).
    sautPoisson(v) {
      const R = E.ronds, ids = Object.keys(F.C.FISHING.fish);
      const p0 = this.eauLoin(v);
      if (!p0 || !this.fishTexture) return;
      const dir = Math.random() < 0.5 ? -1 : 1, p1 = { x: p0.x + dir * (8 + Math.random() * 10), y: p0.y + (Math.random() * 6 - 3) };
      const w = v.a.tex.width;
      if (!v.profond[Math.floor(p1.y - v.a.y) * w + Math.floor(p1.x - v.a.x)]) return;
      const key = this.fishTexture(ids[(Math.random() * ids.length) | 0]);
      if (!key) return;
      v.saut = true;
      this.rond(p0.x, p0.y, true);
      const img = this.add.image(p0.x, p0.y, key).setOrigin(0.5, 1).setDepth(p0.y + 0.5).setFlipX(dir < 0);
      const t0 = { k: 0 };
      this.tweens.add({
        targets: t0, k: 1, duration: R.sautMs, ease: 'Sine.easeInOut',
        onUpdate: () => {
          const k = t0.k;
          img.setPosition(p0.x + (p1.x - p0.x) * k, p0.y + (p1.y - p0.y) * k - Math.sin(k * Math.PI) * R.sautHaut);
          img.setAngle(dir * (k - 0.5) * 70);
        },
        onComplete: () => { img.destroy(); this.rond(p1.x, p1.y, true); v.saut = false; },
      });
    },

    // Ceux qui longent l'eau (le personnage, la famille) : un rond à leurs pieds, de temps en
    // temps, quand ils marchent au bord.
    stepRives(dt) {
      const R = E.ronds, qui = [];
      const p = this.fermier && this.fermier.pos ? this.fermier.pos() : null;
      if (p) qui.push({ id: 'fermier', x: p.x, y: p.y });
      if (this.family) for (const m of this.family.info()) if (m.visible) qui.push({ id: m.id, x: m.x, y: m.y });
      if (!this.eauPas) this.eauPas = new Map();
      for (const q of qui) {
        const avant = this.eauPas.get(q.id) || { x: q.x, y: q.y, t: 0 };
        avant.t -= dt;
        const bouge = Math.hypot(q.x - avant.x, q.y - avant.y) > 0.3;
        avant.x = q.x; avant.y = q.y;
        this.eauPas.set(q.id, avant);
        if (!bouge || avant.t > 0) continue;
        // (l'eau la plus proche de ses pieds, à `rive` px au plus)
        let best = null;
        for (let dy = -2; dy <= R.rive && !best; dy++) {
          for (const dx of [0, -2, 2, -4, 4, -R.rive, R.rive]) {
            const x = Math.round(q.x + dx), y = Math.round(q.y + dy);
            const v = this.eauVive.find((e) => x >= e.a.x && y >= e.a.y && x < e.a.x + e.a.tex.width && y < e.a.y + e.a.tex.height);
            if (v && v.eauPx && v.eauPx[(y - v.a.y) * v.a.tex.width + x - v.a.x]) { best = { x, y }; break; }
          }
        }
        if (!best) continue;
        avant.t = R.pas;
        this.rond(best.x, best.y + 1);
      }
    },

    // Les morceaux d'arbres de la carte (decor.js, arbre_occ_*) portent aussi leur ombre sur
    // l'herbe, à demi transparente : leur reflet n'en garde que les pixels opaques (une copie,
    // faite une fois). Les autres images se reflètent telles quelles.
    eauOpaque(key) {
      if (!key.startsWith('arbre_occ_')) return key;
      const k = 'eau_op_' + key;
      if (this.textures.exists(k)) return k;
      const src = this.textures.get(key).getSourceImage(), w = src.width, h = src.height;
      const c = this.textures.createCanvas(k, w, h), g = c.getContext();
      g.drawImage(src, 0, 0);
      const im = g.getImageData(0, 0, w, h);
      for (let i = 3; i < im.data.length; i += 4) if (im.data[i] < 250) im.data[i] = 0;
      g.putImageData(im, 0, 0);
      c.refresh();
      return k;
    },

    // Les reflets et les ronds d'une étendue, redessinés : ce qui se tient au bord (une image
    // debout dont le pied est au-dessus de l'étendue, à E.miroir.portee px au plus, ou dedans),
    // retourné sous son pied ; les ronds ; puis tout ce qui n'est pas de l'eau effacé.
    stepReflets(v) {
      const a = v.a, w = a.tex.width, h = a.tex.height, R = E.miroir;
      if (!this.refletPool) this.refletPool = [];
      const pool = this.refletPool;
      let n = 0;
      const prend = () => pool[n] || (pool[n] = this.make.image({ x: 0, y: 0, key: 'eau_scintille' }, false));
      v.refl.clear();
      for (const o of this.children.list) {
        if (!o.visible || o.alpha < 0.3 || (o.type !== 'Image' && o.type !== 'Sprite') || o.depth < 1 || o.blendMode !== 0 || o === v.reflet) continue;
        const key = o.texture && o.texture.key;
        if (!key || key.startsWith('eau_') || key === '__DEFAULT' || key === '__MISSING') continue;
        const H = o.displayHeight, L = o.displayWidth;
        const pied = o.y + (1 - o.originY) * H, gauche = o.x - o.originX * L;
        if (pied < a.y - R.portee || pied > a.y + h || gauche > a.x + w || gauche + L < a.x || H > R.haut) continue;
        const r = prend();
        n++;
        r.setTexture(this.eauOpaque(key), o.frame.name).setOrigin(o.originX, 0).setFlip(o.flipX, !o.flipY)
          .setScale(o.scaleX, o.scaleY * R.ecrase).setAngle(-o.angle).setAlpha(R.alpha * o.alpha).setTint(R.teinte)
          .setPosition(o.x - a.x, pied - a.y);
        v.refl.draw(r);
      }
      // les ronds
      const N = E.ronds.images;
      for (const d of v.ronds) {
        const r = prend();
        n++;
        const k = d.t / d.vie, f = Math.min(N - 1, Math.floor(k * (d.petit ? N / 2 : N)));
        r.setTexture('eau_ronds', f).setOrigin(0.5).setFlip(false, false).setScale(1).setAngle(0).setTint(0xffffff)
          .setAlpha(E.ronds.alpha * d.a * (1 - k)).setPosition(d.x - a.x, d.y - a.y);
        v.refl.draw(r);
      }
      v.refl.erase(v.secImg).render();
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
