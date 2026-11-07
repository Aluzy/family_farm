/* carte/ferme/traces.js — la scène de la ferme : les traces de pas (dans la ferme et le grand monde).
 *
 * Qui marche laisse ses pas derrière lui : le personnage, sa famille, son compagnon, les habitants des
 * hameaux, les invités, la visite, les autres joueurs d'un monde en ligne ; le cheval monté laisse ses
 * fers. Ils pâlissent puis s'effacent (VIE s).
 *
 *   - Sur un sol meuble (la terre, la lande, le sable, les galets, les chemins…), une semelle : la
 *     pointe et le talon en creux (une ombre translucide : elle assombrit le sol quel qu'il soit), le
 *     bord relevé un peu plus clair sur un côté.
 *   - Sur l'herbe (le sol peint franchement vert), l'herbe couchée : une semelle pleine, plus claire,
 *     couleur de paille (une ombre se perdrait dans les brins sombres de l'herbe).
 *   - Le cheval : des fers en U, deux par deux, à chaque foulée ; de même, creux ou herbe couchée.
 *   - Rien sur l'eau, sur un sol posé (le plancher d'une maison de la ferme), à l'étage.
 *
 * Qui marche ? Tous les personnages ont les mêmes cases (idle_<vue>_k, marche_<vue>_k, assis_<vue>_k :
 * scripts/personnage) ; le cheval monté, la planche cheval_monte (js/carte/cheval.js). Une fois par
 * seconde, les images de la scène qui en montrent un sont relevées (pas besoin de connaître chaque
 * système qui les fait marcher) ; à chaque image, seules celles-là sont suivies : un pas tous les PAS
 * px parcourus (en alternant les pieds), une paire de fers tous les FOULEE px. Un saut de plus de SAUT
 * px (une porte, une arrivée) ne laisse rien. Assis sur le cheval, le cavalier ne laisse rien : le
 * cheval laisse ses fers.
 *
 * Le dessin : chaque forme (semelle, herbe couchée, fer ; creux ou clair ; dans les quatre sens) est une
 * petite texture faite une fois ; chaque trace, une image prise dans une réserve de MAX images
 * (« économie » : MAX_ECO ; la plus vieille resservant), à plat sur le sol (PROFONDEUR : au-dessus du
 * plancher et de l'eau, sous tout ce qui a un pied). Le sol d'une trace (herbe, eau, sol meuble) est lu
 * dans le sol peint (sol.js lireSol), une fois par case tant que le sol n'est pas repeint. Coupées avec
 * « animations réduites ».
 *
 * Méthodes de la scène de la ferme (js/farm-stage.js), posées sur son prototype.
 */
(function (global) {
  'use strict';

  const F = global.FermeCarte;
  const K = global.CarteKit;
  const { T } = F.C;
  const { reducedMotion } = F;

  const TRACES = {
    VIE: 20, MAX: 80, MAX_ECO: 40, PROFONDEUR: 0.6,
    PAS: 7, ECART: 2, FOULEE: 12, SAUT: 24, RELEVE_MS: 1000, FONDU_MS: 200,
    // les couleurs : le creux (une ombre), le bord relevé, l'herbe couchée (rgba)
    CREUX: [26, 16, 8, 0.6], BORD: [255, 244, 220, 0.35], COUCHEE: [238, 246, 196, 0.4],
    FER_CREUX: [26, 16, 8, 0.55], FER_COUCHEE: [238, 246, 196, 0.45],
  };
  // les formes, la première rangée devant (la pointe du pied, la pince du fer) ; « # » le creux ou l'herbe
  // couchée, « + » le bord relevé, « . » rien
  const FORMES = {
    semelle: ['+##', '+##', '...', '.##'],
    couchee: ['##', '##', '##', '##'],
    fer: ['###', '#.#', '#.#'],
  };
  const VUES = ['bas', 'haut', 'droite', 'gauche'];

  // la vue d'un déplacement (dx, dy)
  const vueDe = (dx, dy) => (Math.abs(dy) >= Math.abs(dx) ? (dy > 0 ? 'bas' : 'haut') : (dx > 0 ? 'droite' : 'gauche'));

  F.partie({

    // Les textures des formes (une fois) : trace_<forme>_<sol|herbe>_<vue>.
    tracesTextures() {
      if (this.tracesPretes) return true;
      const doc = global.document;
      const rgba = (c) => `rgba(${c[0]},${c[1]},${c[2]},${c[3]})`;
      const fais = (nom, rangs, creux, bord) => {
        const h = rangs.length, w = rangs[0].length;
        for (const vue of VUES) {
          const cle = `trace_${nom}_${vue}`;
          if (this.textures.exists(cle)) continue;
          const vertical = vue === 'bas' || vue === 'haut';
          const cv = doc.createElement('canvas');
          cv.width = vertical ? w : h; cv.height = vertical ? h : w;
          const g = cv.getContext('2d');
          for (let j = 0; j < h; j++) {
            for (let i = 0; i < w; i++) {
              const ch = rangs[j][i];
              if (ch === '.' || (ch === '+' && !bord)) continue;
              // vers le haut : retournée ; de côté : couchée (la pointe en avant)
              const x = vertical ? i : (vue === 'droite' ? h - 1 - j : j);
              const y = vertical ? (vue === 'bas' ? h - 1 - j : j) : i;
              g.fillStyle = rgba(ch === '#' ? creux : bord);
              g.fillRect(x, y, 1, 1);
            }
          }
          this.textures.addCanvas(cle, cv);
        }
      };
      fais('semelle_sol', FORMES.semelle, TRACES.CREUX, TRACES.BORD);
      fais('semelle_herbe', FORMES.couchee, TRACES.COUCHEE, null);
      fais('fer_sol', FORMES.fer, TRACES.FER_CREUX, null);
      fais('fer_herbe', FORMES.fer, TRACES.FER_COUCHEE, null);
      this.tracesPretes = true;
      return true;
    },

    // Le sol sous (x, y) : 'herbe', 'sol' (meuble : on y marque), ou null (l'eau, un plancher, pas encore
    // peint : rien). Gardé par case tant que le sol n'est pas repeint (this.solPeint).
    solDeTrace(x, y) {
      const W = this.grid.cols, c = Math.floor((y - 1) / T) * W + Math.floor(x / T);
      if (this.floors && this.floors.has(c)) return null;
      if (!this.tracesSols || this.tracesSolsV !== this.solPeint) { this.tracesSols = new Map(); this.tracesSolsV = this.solPeint; }
      const M = this.tracesSols;
      if (M.has(c)) return M.get(c);
      const d = this.lireSol ? this.lireSol(Math.round(x), Math.round(y) - 1, 1, 1) : null;
      if (!d) return null;   // (pas encore peint : on réessaiera)
      const [r, g, b] = d.data;
      const s = b > r + 20 && b > g - 10 ? null : g > r + 22 && g > b + 20 ? 'herbe' : 'sol';
      M.set(c, s);
      return s;
    },

    // Une trace : la forme `forme` ('semelle' ou 'fer') en (x, y), dans la vue `vue`.
    poseTrace(forme, x, y, vue) {
      const sol = this.solDeTrace(x, y);
      if (!sol) return;
      // (sur l'herbe, quelques brins sautent sous le pas : brins.js)
      if (sol === 'herbe' && this.brinsPas) this.brinsPas(x, y, vue, forme);
      const R = this.tracesReserve || (this.tracesReserve = []);
      const max = K.reglages && K.reglages().demiDensite ? TRACES.MAX_ECO : TRACES.MAX;
      let t;
      if (R.length < max) {
        t = { img: this.add.image(0, 0, '__DEFAULT').setDepth(TRACES.PROFONDEUR), t0: 0 };
        R.push(t);
      } else {
        // (la plus vieille resservira)
        t = R.reduce((a, b) => (b.t0 < a.t0 ? b : a));
      }
      t.t0 = this.time.now;
      t.img.setTexture(`trace_${forme}_${sol}_${vue}`).setPosition(Math.round(x), Math.round(y)).setAlpha(1).setVisible(true);
    },

    // À chaque image : qui marche (relevé une fois par seconde), ses pas ; les traces qui pâlissent.
    stepTraces(time) {
      if (reducedMotion()) { if (this.tracesReserve) for (const t of this.tracesReserve) t.img.setVisible(false); return; }
      if (!this.tracesTextures()) return;
      if (!this.tracesMarcheurs || time - this.tracesReleve > TRACES.RELEVE_MS) this.releveMarcheurs(time);
      // (le personnage à l'étage : son image est dessinée remontée de `haut` px, ses pieds en `moi`)
      const haut = this.etageLift ? this.etageLift() : 0;
      const moi = haut > 0 && this.fermier && this.fermier.pos ? this.fermier.pos() : null;
      const vus = new Set();
      for (const o of this.tracesMarcheurs) {
        const e = o.traceEtat || (o.traceEtat = { x: o.x, y: o.y, cumul: 0, pied: 1 });
        // (deux images au même endroit, un personnage et son voile de couleur (amis.js) : une seule marque)
        const ici = Math.round(o.x) + ',' + Math.round(o.y);
        if (vus.has(ici)) { e.x = o.x; e.y = o.y; e.cumul = 0; continue; }
        vus.add(ici);
        // (le nom de sa case, quand elle en a un : assis_<vue>, sur le cheval ; sinon, celui que donne le
        // personnage, js/fermier.js, famille-ferme.js : leurs cases sont des numéros)
        const nom = typeof o.frame.name === 'string' ? o.frame.name : (o.caseNom || '');
        const cheval = o.texture && o.texture.key === 'cheval_monte';
        // (caché, effacé, assis sur le cheval (le cheval marque), le personnage à l'étage : rien)
        const muet = !o.active || !o.visible || o.alpha < 0.5 || nom.startsWith('assis_') || (moi && Math.abs(o.x - moi.x) < 2 && Math.abs(o.y - (moi.y - haut)) < 2);
        const dx = o.x - e.x, dy = o.y - e.y, d = Math.hypot(dx, dy);
        e.x = o.x; e.y = o.y;
        if (muet || d > TRACES.SAUT) { e.cumul = 0; continue; }
        if (d < 0.01) continue;
        e.cumul += d;
        const vue = vueDe(dx, dy), vertical = vue === 'bas' || vue === 'haut';
        if (cheval) {
          if (e.cumul < TRACES.FOULEE) continue;
          e.cumul = 0;
          // (une paire de fers : un de chaque côté, l'un un peu en arrière)
          const pf = vertical ? [[-3, 0], [3, 3 * Math.sign(dy || 1)]] : [[0, -2], [-3 * Math.sign(dx || 1), 2]];
          for (const [a, b] of pf) this.poseTrace('fer', o.x + a, o.y + b, vue);
          continue;
        }
        if (e.cumul < TRACES.PAS) continue;
        e.cumul = 0;
        e.pied = -e.pied;
        this.poseTrace('semelle', o.x + (vertical ? e.pied * TRACES.ECART : 0), o.y + (vertical ? 0 : e.pied * TRACES.ECART), vue);
      }
      // les traces pâlissent (VIE s ; plus vite à la fin), quelques fois par seconde
      if (this.tracesReserve && (!this.tracesFondu || time - this.tracesFondu > TRACES.FONDU_MS)) {
        this.tracesFondu = time;
        const vie = TRACES.VIE * 1000;
        for (const t of this.tracesReserve) {
          if (!t.img.visible) continue;
          const a = (time - t.t0) / vie;
          if (a >= 1) t.img.setVisible(false);
          else t.img.setAlpha(1 - a * a);
        }
      }
    },

    // Les images de la scène qui montrent quelqu'un qui marche : un personnage (ses cases idle_, marche_,
    // assis_), le cheval monté (la couche de dessous de cheval_monte : ses cases paires).
    releveMarcheurs(time) {
      this.tracesReleve = time;
      const out = [], portes = [], ruches = [], types = this.imagesDePortes ? this.imagesDePortes() : null;
      const B = F.C.BLOCS_CARTE, pleine = B && B.frames ? B.frames.ruche_pleine : undefined;
      // (le même passage relève les portes, portes.js, et les ruches pleines, miel.js)
      for (const o of this.children.list) {
        if (!o.frame || !o.texture) continue;
        if (o.personnage ? o.type === 'Sprite' : (o.texture.key === 'fermier' && o.toujours) || (o.texture.key === 'cheval_monte' && Number(o.frame.name) % 2 === 0)) out.push(o);
        else if (types && o.type === 'Image' && types.has(o.texture.key + ':' + o.frame.name)) portes.push(o);
        else if (pleine !== undefined && o.type === 'Image' && o.texture.key === B.key && o.frame.name === pleine) ruches.push(o);
      }
      this.tracesMarcheurs = out;
      this.portesVues = portes;
      // (une ruche qui n'est plus pleine : sa goutte retirée)
      for (const r of this.ruchesVues || []) if (!ruches.includes(r) && r.mielEtat && r.mielEtat.g) { r.mielEtat.g.destroy(); r.mielEtat = null; }
      this.ruchesVues = ruches;
    },
  });
})(window);
