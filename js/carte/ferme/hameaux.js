/* carte/ferme/hameaux.js — la scène de la ferme : les hameaux bâtis du grand monde (fiche 7a).
 *
 * Le plan de chaque hameau est fait dans le Web Worker avec les éléments du monde (js/engine/
 * monde-hameaux.js ; ctx.monde.hameaux() : les plans) ; chaque région arrive avec sa part des
 * pièces (reg.hameau : les murs, fenêtres et portes, les meubles, les clôtures, le puits, le banc, le
 * panneau, les arbres des jardins, les dépendances), posées comme la végétation (vegetation.js, la
 * planche « hameaux » : assets/hameaux.png, scripts/carte/hameaux.py) : des images rangées selon leur
 * pied, créées par blocs près de la vue et retirées avec leur région, transparentes quand le
 * personnage passe derrière ; les planchers, les pavés, la terre et les légumes des potagers sont
 * peints dans le sol de la région. Les murs, les meubles, les clôtures ferment leurs cases dans la
 * marche de la région (le Worker) : on entre par les portes, on bute sur le reste.
 *
 * Ici, ce que la planche ne fait pas :
 *   - les toits : un par maison (CarteKit.toit, js/carte/toit.js : tuiles, ardoise, chaume ou roseaux
 *     selon le style du hameau), faits quand la région du hameau est dessinée, retirés avec elle ; il
 *     s'efface quand le personnage est dans la maison, à moitié quand il passe derrière (comme chez
 *     lui, toits.js) ; sa cheminée (au-dessus du foyer), d'où monte la fumée (pas avec « animations
 *     réduites ») ;
 *   - la nuit, les fenêtres de la façade s'éclairent et leur lumière tombe sur le sol devant elles
 *     (dans le voile de l'heure, avec les lanternes de la ferme : chantier.js stepLanterns) ;
 *   - l'arrivée : le personnage qui entre dans un hameau le dit à la page (ctx.bridge.hameau : la
 *     première fois, une bannière à son nom, js/ui/stage.js) ;
 *   - le panneau qu'on touche dit le nom du hameau ; les outils qui n'y ont rien à faire le disent
 *     (on n'y casse rien, on n'y bâtit pas, on n'y laboure pas, on n'y coupe pas les arbres des
 *     jardins : hameauOutil, appelé en premier par hitAt, js/farm-stage.js).
 *
 * Méthodes de la scène de la ferme (js/farm-stage.js), posées sur son prototype.
 */
(function (global) {
  'use strict';

  const K = global.CarteKit;
  const F = global.FermeCarte;
  const { T, BLOCS_CARTE } = F.C;
  const { reducedMotion } = F;
  const R = BLOCS_CARTE.toits;
  // la cheminée (px) ; la fumée : une bouffée toutes les `toutes` ms, qui monte de `monte` px en
  // `vie` ms ; le panneau : sa boîte d'appui autour de son pied ; les fenêtres la nuit : la lumière
  // sur la vitre (`vitre`) et sur le sol devant (`sol` : rayon, aplati, sous le pied du mur)
  const CHEMINEE = { l: 8, h: 14 };
  const FUMEE = { toutes: 520, monte: 26, vie: 2600, vue: 220, max: 60 };
  const PANNEAU = { l: 12, h: 30 };
  const NUIT = { vitre: { rayon: 7, alpha: 0.95, dy: -16 }, sol: { rayon: 22, aplati: 0.55, alpha: 0.55, dy: 8 }, dedans: { alpha: 0.5 } };
  const TOITS = { tuiles: null, ardoise: 'ardoise', chaume: 'chaume', roseaux: 'roseaux' };
  // la cheminée de chaque matière (des pierres, des briques, du torchis) : son corps, son arête claire
  const BRIQUES = { tuiles: ['#8a4a36', '#b06a4e'], ardoise: ['#6a6660', '#97928a'], chaume: ['#7a6a58', '#a8957c'], roseaux: ['#6e6250', '#9a8a70'] };

  // Une bouffée de fumée : un rond gris clair, flou au bord.
  function texturesFumee(tx) {
    if (!tx.exists('hameau_fumee')) {
      const cv = document.createElement('canvas');
      cv.width = cv.height = 12;
      const g = cv.getContext('2d');
      const grad = g.createRadialGradient(6, 6, 0, 6, 6, 6);
      grad.addColorStop(0, 'rgba(236,236,232,0.9)');
      grad.addColorStop(0.6, 'rgba(220,220,216,0.55)');
      grad.addColorStop(1, 'rgba(210,210,206,0)');
      g.fillStyle = grad;
      g.fillRect(0, 0, 12, 12);
      tx.addCanvas('hameau_fumee', cv);
    }
    for (const [cle, [corps, clair]] of Object.entries(BRIQUES)) {
      const key = 'hameau_cheminee_' + cle;
      if (tx.exists(key)) continue;
      const cv = document.createElement('canvas');
      cv.width = CHEMINEE.l + 2; cv.height = CHEMINEE.h + 2;
      const g = cv.getContext('2d');
      g.fillStyle = '#28201f'; g.fillRect(0, 0, cv.width, cv.height);
      g.fillStyle = corps; g.fillRect(1, 3, CHEMINEE.l, CHEMINEE.h - 2);
      g.fillStyle = clair; g.fillRect(1, 3, 2, CHEMINEE.h - 2); g.fillRect(0, 1, cv.width, 2);
      g.fillStyle = '#28201f';
      for (let y = 6; y < CHEMINEE.h; y += 4) g.fillRect(1, y, CHEMINEE.l, 1);
      g.fillRect(2, 0, CHEMINEE.l - 2, 1);
      tx.addCanvas(key, cv);
    }
  }

  F.partie({

    // Les plans des hameaux (ctx.monde.hameaux()), ou [] tant que le Worker ne les a pas donnés.
    hameauxPlans() {
      const M = this.ctx.monde;
      return (M && M.hameaux && M.hameaux()) || [];
    },

    // Le hameau de la case t (son cadre et `marge` cases autour), ou null.
    hameauDeCase(t, marge = 0) {
      const W = this.grid.cols, c = t % W, r = Math.floor(t / W);
      for (const p of this.hameauxPlans()) if (c >= p.cadre.x0 - marge && c <= p.cadre.x1 + marge && r >= p.cadre.y0 - marge && r <= p.cadre.y1 + marge) return p;
      return null;
    },

    // Les toits et les cheminées des hameaux dont la région (celle de leur case) est dessinée ;
    // retirés quand elle s'en va. this.hameauxVus : id → { plan, toits: [{ img, key, cheminee, … }] }.
    syncHameaux() {
      const plans = this.hameauxPlans();
      if (!plans.length || !this.regions) return;
      if (!this.hameauxVus) this.hameauxVus = new Map();
      const W = this.grid.cols, N = K.REGION.tuiles;
      for (const p of plans) {
        const r = this.regions.get(Math.floor((p.case % W) / N) + ',' + Math.floor(Math.floor(p.case / W) / N));
        const vu = !!(r && r.tex), e = this.hameauxVus.get(p.id);
        if (vu && !e) this.hameauxVus.set(p.id, this.faireHameau(p));
        else if (!vu && e) { this.defaireHameau(e); this.hameauxVus.delete(p.id); }
      }
    },

    faireHameau(p) {
      texturesFumee(this.textures);
      const W = this.grid.cols, style = (this.ctx.monde.hameauxStyles || {})[p.style] || null;
      const couverture = (style && style.toit) || 'tuiles';
      const toits = p.maisons.map((m) => {
        const cases = [];
        for (let y = m.y0; y < m.y0 + m.h; y++) for (let x = m.x0; x < m.x0 + m.l; x++) cases.push(y * W + x);
        // (une clé neuve à chaque fois, comme toits.js : une texture retirée ne revient jamais sous
        // la même clé, le rendu pourrait en garder l'ancienne)
        this.hameauxN = (this.hameauxN || 0) + 1;
        const { cv, c0, r0, r1, dx } = K.toit(cases, W, false, TOITS[couverture]), key = `toit_${m.id}_${this.hameauxN}`;
        this.textures.addCanvas(key, cv);
        // (posé sur les murs, remonté de la hauteur de leur face, comme chez lui : toits.js)
        const x = c0 * T - dx, y = r0 * T - BLOCS_CARTE.etage.dy, z = (r1 + 1) * T + R.z;
        const img = this.add.image(x, y, key).setOrigin(0, 0).setDepth(z);
        // (la cheminée : au-dessus du foyer, sur le haut du toit ; la fumée en sort)
        let cheminee = null;
        if (m.foyer !== null && m.foyer !== undefined) {
          const cx = (m.foyer % W) * T + T / 2, cy = y + 3;
          cheminee = { img: this.add.image(cx, cy, 'hameau_cheminee_' + couverture).setOrigin(0.5, 1).setDepth(z + 0.01), x: cx, y: cy - CHEMINEE.h, prochain: 0 };
        }
        // (son ombre au soleil, soleil.js sunPrisms : posé à etage.dy px sur l'emprise, comme toits.js)
        const ombre = { x0: m.x0 * T, x1: (m.x0 + m.l) * T, y0: r0 * T, y1: (r1 + 1) * T, v: BLOCS_CARTE.etage.dy, faite: Math.max(0, cv.height - (r1 + 1 - r0) * T) };
        return { key, img, cheminee, ombre, dedans: new Set(m.dedans), x0: x, x1: x + cv.width, y0: y, y1: y + cv.height, pied: (r1 + 1) * T, maison: m };
      });
      this.sunDirty = true;
      return { plan: p, style, toits, fumees: [] };
    },

    defaireHameau(e) {
      if (this.defaireHabitants) this.defaireHabitants(e);   // (ses habitants : habitants.js)
      for (const t of e.toits) {
        t.img.destroy();
        if (this.textures.exists(t.key)) this.textures.remove(t.key);
        if (t.cheminee) t.cheminee.img.destroy();
      }
      for (const f of e.fumees) f.destroy();
      e.fumees.length = 0;
      this.sunDirty = true;
    },

    // À chaque image : l'arrivée dans un hameau ; les toits qui s'effacent (le personnage dedans ou
    // derrière) ; la fumée des cheminées dans la vue.
    stepHameaux(dt) {
      if (!this.ctx.monde) return;
      this.syncHameaux();
      const p = this.fermier && this.fermier.pos ? this.fermier.pos() : null;
      const W = this.grid.cols;
      const ici = p ? Math.floor((p.y - 1) / T) * W + Math.floor(p.x / T) : -1;
      // (l'arrivée : la page le note, la première fois une bannière)
      if (ici >= 0) {
        const h = this.hameauDeCase(ici, 1), id = h ? h.id : null;
        if (id !== this.hameauIci) {
          this.hameauIci = id;
          if (h && this.ctx.bridge && this.ctx.bridge.hameau) this.ctx.bridge.hameau({ id: h.id, nom: h.nom, style: h.style });
        }
      }
      if (!this.hameauxVus || !this.hameauxVus.size) return;
      if (this.stepHabitants) this.stepHabitants(dt);       // (ses habitants : habitants.js, fiche 7b)
      const pas = R.vitesse * dt, v = this.cameras.main.worldView, now = performance.now(), calme = reducedMotion();
      for (const e of this.hameauxVus.values()) {
        for (const t of e.toits) {
          let but = 1;
          if (t.dedans.has(ici)) but = 0;
          else if (p && p.x > t.x0 - 6 && p.x < t.x1 + 6 && p.y > t.y0 && p.y - 24 < t.y1 && p.y < t.pied) but = R.derriere;
          const a = t.img.alpha;
          if (a !== but) {
            const na = a < but ? Math.min(but, a + pas) : Math.max(but, a - pas);
            t.img.setAlpha(na);
            if ((a > 0.5) !== (na > 0.5)) this.sunDirty = true;
            if (t.cheminee) t.cheminee.img.setAlpha(na);
          }
          // la fumée : une bouffée de temps en temps, si la cheminée est près de la vue
          const c = t.cheminee;
          if (!c || calme || now < c.prochain || e.fumees.length >= FUMEE.max) continue;
          if (c.x < v.x - FUMEE.vue || c.x > v.right + FUMEE.vue || c.y < v.y - FUMEE.vue || c.y > v.bottom + FUMEE.vue) continue;
          c.prochain = now + FUMEE.toutes * (0.7 + Math.random() * 0.6);
          const f = this.add.image(c.x + (Math.random() - 0.5) * 3, c.y, 'hameau_fumee').setDepth(c.img.depth + 0.01).setAlpha(0.75).setScale(0.6);
          e.fumees.push(f);
          this.tweens.add({
            targets: f, y: c.y - FUMEE.monte - Math.random() * 8, x: f.x + 6 + Math.random() * 8, scale: 1.6, alpha: 0, duration: FUMEE.vie, ease: 'Sine.easeOut',
            onComplete: () => { const k = e.fumees.indexOf(f); if (k >= 0) e.fumees.splice(k, 1); f.destroy(); },
          });
        }
      }
    },

    // Les lumières des hameaux la nuit (à ajouter à `out`, les lumières du voile ; stepLanterns) :
    // chaque fenêtre de façade, sa vitre et le sol devant elle ; le dedans d'une maison dont le toit
    // s'efface.
    stepFenetresHameaux(out, nuit) {
      if (!this.hameauxVus || !this.hameauxVus.size) return;
      const on = nuit > BLOCS_CARTE.lanterne.allume ? Math.min(1, nuit / 0.4) : 0;
      if (on <= 0) return;
      const L = BLOCS_CARTE.lumiereMaison, W = this.grid.cols, v = this.cameras.main.worldView;
      for (const e of this.hameauxVus.values()) {
        for (const t of e.toits) {
          if (t.x1 < v.x - 64 || t.x0 > v.right + 64 || t.y1 < v.y - 64 || t.y0 > v.bottom + 96) continue;
          for (const f of t.maison.fenetres) {
            const x = (f % W) * T + T / 2, y = (Math.floor(f / W) + 1) * T;
            out.push({ key: 'lueur', x, y: y + NUIT.vitre.dy, tint: L.teinte, alpha: NUIT.vitre.alpha * on, scaleX: NUIT.vitre.rayon / 32, scaleY: (NUIT.vitre.rayon * 1.4) / 32 });
            out.push({ key: 'lueur', x, y: y + NUIT.sol.dy, tint: L.teinte, alpha: NUIT.sol.alpha * on, scaleX: NUIT.sol.rayon / 32, scaleY: (NUIT.sol.rayon * NUIT.sol.aplati) / 32 });
          }
          const ouvert = on * (1 - t.img.alpha);
          if (ouvert > 0.01) {
            const m = t.maison;
            out.push({ key: 'lueur', x: (m.x0 + m.l / 2) * T, y: (m.y0 + m.h / 2) * T, tint: L.teinte, alpha: NUIT.dedans.alpha * ouvert, scaleX: (m.l * T * 0.7) / 32, scaleY: (m.h * T * 0.7) / 32 });
          }
        }
      }
    },

    // Les toits des hameaux dessinés, qui portent leur ombre (soleil.js sunPrisms).
    hameauxOmbres() {
      const out = [];
      // (pas celui qui s'efface : le personnage est dedans)
      for (const e of (this.hameauxVus || new Map()).values()) for (const t of e.toits) if (t.img.alpha > 0.5 && !t.img.brume) out.push(t);   // (ni sous le brouillard : brouillard.js)
      return out;
    },

    // Y a-t-il des maisons de hameau dessinées (leurs lumières) ?
    hameauxEclaires() {
      return !!(this.hameauxVus && this.hameauxVus.size);
    },

    // Un appui dans un hameau (appelé en premier par hitAt) : le panneau (son nom) ; un outil qui n'a
    // rien à y faire (il le dit) : la houe, le mode Construire, planter un arbre (partout dans le
    // hameau) ; la hache sur un arbre ou dans un jardin ; la faux dans un jardin ; la pioche sur ce
    // qui est bâti (une case fermée). Sinon null : l'appui suit son cours (marcher, pêcher…).
    hameauOutil(wx, wy) {
      if (!this.ctx.monde) return null;
      const W = this.grid.cols, t = this.tileAtPoint(wx, wy);
      if (t < 0) return null;
      const h = this.hameauDeCase(t, 1);
      if (!h) return null;
      const m = this.ctx.lastModel || {};
      if (h.place.panneau !== null && h.place.panneau !== undefined && !m.bati) {
        const px = (h.place.panneau % W) * T + T / 2, py = (Math.floor(h.place.panneau / W) + 1) * T;
        if (Math.abs(wx - px) <= PANNEAU.l && wy <= py + 2 && wy >= py - PANNEAU.h) return { panneau: h };
      }
      const jardin = h.jardins.some((j) => j.cases.includes(t));
      let outil = null;
      if (m.bati) outil = 'bati';
      else if (this.plantation) outil = 'planter';
      else if (m.houe) outil = 'houe';
      else if (m.hache && (jardin || this.hameauArbreAt(wx, wy))) outil = 'hache';
      else if (m.faux && jardin) outil = 'faux';
      else if (m.pioche && this.ctx.monde.marchable && !this.ctx.monde.marchable(t)) outil = 'pioche';
      return outil ? { hameauRefus: { outil, nom: h.nom } } : null;
    },

    // Un arbre fruitier d'un jardin sous le doigt (son image) ?
    hameauArbreAt(wx, wy) {
      for (const o of this.vegListe || []) {
        if (o.img.texture.key !== 'hameaux' || !o.nomHameau) continue;
        if (wx >= o.x && wx <= o.x + o.w && wy >= o.y && wy <= o.y + o.h) return true;
      }
      return false;
    },

    // (les mesures : les toits de hameau dessinés)
    hameauxToits() {
      let n = 0;
      for (const e of (this.hameauxVus || new Map()).values()) n += e.toits.length;
      return n;
    },
  });
})(window);
