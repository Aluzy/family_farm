/* carte/ferme/etage.js — la scène de la ferme : l'étage (un essai).
 *
 * Un escalier posé dans une pièce close ouvre un étage au-dessus d'elle et de ses murs
 * (modèle.etage : { emprise: [tuiles], blocs: [{ case, sorte }], escaliers: [tuiles] }, voir
 * js/engine/etage.js). Un appui sur l'escalier y monte, un appui sur son haut en redescend
 * (le pont : ctx.bridge.act('etage-toggle')) ; modèle.niveau dit où l'on est (0 : en bas).
 *
 * L'étage est dessiné au sommet des murs du bas : tout y est remonté de ETAGE.dy px (le haut
 * des murs hauts). Son plancher couvre l'emprise, avec le haut de l'escalier et les blocs posés
 * à l'étage. Ce qu'on voit dépend d'où est le personnage (stepEtage) :
 *   - dehors : tous les niveaux, l'un sur l'autre (le bâtiment et son étage) ;
 *   - dans le bâtiment, en bas : l'étage s'efface (ETAGE.dedans : on ne voit que son niveau) ;
 *   - en mode Construire, la vue suit le niveau où l'on construit (modèle.vueNiveau : 0, l'étage
 *     en transparence, ETAGE.transparent ; 1, comme à l'étage), où que soit le personnage ;
 *   - à l'étage : un voile sombre couvre la ferme (ETAGE.voile) ; devant lui, l'étage, les
 *     blocs du bas sous l'emprise, effacés (on voit en transparence les murs juste en
 *     dessous), et le personnage (etageZ : resserrés juste au-dessus du voile, lui-même
 *     au-dessus de ce qui vole, papillons et oiseaux, et sous le voile de l'heure) ; le personnage est dessiné remonté, ne marche que sur l'emprise sans
 *     traverser les murs de l'étage (blockCells), et un mur de l'étage devant lui s'efface.
 * En mode Construire, à l'étage, un appui pose ou reprend un bloc de l'étage.
 *
 * Méthodes de la scène de la ferme (js/farm-stage.js), posées sur son prototype.
 */
(function (global) {
  'use strict';

  const F = global.FermeCarte;
  const { T, BLOCS_CARTE } = F.C;
  const E = BLOCS_CARTE.etage;

  F.partie({

    // La profondeur, à l'étage, de ce qui a la profondeur `d` en bas : juste au-dessus du voile
    // de l'étage (l'ordre gardé : d / 1e5, d < 1e4), sous le voile de l'heure.
    etageZ(d) {
      return this.etageVoileZ() + 0.01 + d * 1e-5;
    },
    // Le voile de l'étage : au-dessus de ce qui vole (js/ambient-life.js : voile de l'heure − 2).
    etageVoileZ() {
      return (this.light ? this.light.depth : 1e6) - 1.95;
    },

    // L'étage du modèle, et le niveau où l'on est : dessiné (remonté de ETAGE.dy), ou ôté.
    syncEtage(etage, niveau, vueNiveau) {
      const on = !!(etage && etage.emprise.length);
      // (en mode Construire : la vue montre le niveau où l'on construit)
      const vn = on && vueNiveau != null ? vueNiveau : null;
      if (vn !== (this.vueNiveau === undefined ? null : this.vueNiveau)) { this.vueNiveau = vn; this.etageVue = null; }
      const n = on && niveau ? 1 : 0;
      const cle = on ? JSON.stringify(etage) : '';
      if (cle === this.etageCle && n === (this.niveau || 0)) return;
      const change = n !== (this.niveau || 0);
      this.niveau = n;
      if (cle !== this.etageCle) {
        this.etageCle = cle;
        if (this.etageObjs) this.etageObjs.forEach((o) => o.destroy());
        this.etageObjs = [];
        this.etageMurs = new Map();
        this.etageEmprise = on ? new Set(etage.emprise) : null;
        this.etageBloque = new Set();
        this.etageLits = new Map();      // les couchages de l'étage : case → { img, x, y, dessin }
        this.etageEscaliers = on ? etage.escaliers.slice() : [];
        if (on && this.has(BLOCS_CARTE.key)) {
          const cols = this.grid.cols, dy = E.dy, add = (o) => { this.etageObjs.push(o); return o; };
          const dans = (t) => this.etageEmprise.has(t);
          const pos = (t) => ({ x: (t % cols) * T + T / 2, y: (Math.floor(t / cols) + 1) * T });
          // le plancher, raccordé sur toute l'emprise, au sommet des murs du bas
          for (const t of etage.emprise) {
            const c = t % cols;
            const m = (dans(t - cols) ? 1 : 0) + (c < cols - 1 && dans(t + 1) ? 2 : 0) + (dans(t + cols) ? 4 : 0) + (c > 0 && dans(t - 1) ? 8 : 0);
            const p = pos(t);
            add(this.add.image(p.x, p.y - dy, BLOCS_CARTE.key, BLOCS_CARTE.sols + m).setOrigin(0.5, 1).setDepth(p.y + 0.5));
          }
          for (const t of etage.escaliers) {
            if (!dans(t)) continue;
            const p = pos(t);
            add(this.add.image(p.x, p.y - dy, BLOCS_CARTE.key, E.haut).setOrigin(0.5, 1).setDepth(p.y + 0.6));
          }
          // les blocs de l'étage (les murs raccordés entre eux, hauts comme en bas)
          const at = new Map(etage.blocs.map((b) => [b.case, b.sorte]));
          // deux lits adulte côte à côte (la même rangée) : un lit deux places, comme en bas
          // (chantier.js syncLitsDoubles) ; celui de gauche le dessine, l'autre ne se dessine pas
          const LD = BLOCS_CARTE.litDouble, seul = (c) => { const b = etage.blocs.find((q) => q.case === c); return !!(b && b.meuble && b.meuble.dessin === LD.seul); };
          const paire = new Map();
          if (this.textures.exists('meuble_' + LD.double)) {
            for (const b of etage.blocs.slice().sort((p1, p2) => p1.case - p2.case)) {
              const c = b.case;
              if (!seul(c) || paire.has(c) || c % cols === cols - 1 || !seul(c + 1) || paire.has(c + 1)) continue;
              paire.set(c, { gauche: true, autre: c + 1 });
              paire.set(c + 1, { gauche: false, autre: c });
            }
          }
          for (const b of etage.blocs) {
            // un meuble (modèle : b.meuble, comme en bas : syncMeuble) : son dessin, au milieu des
            // cases qu'il couvre, qui arrêtent le passage s'il bloque
            if (b.meuble) {
              const M = b.meuble, pr = paire.get(b.case), p = pos(b.case);
              const k = 'meuble_' + (pr ? LD.double : M.dessin);
              if (!this.textures.exists(k)) continue;
              const x0 = Math.round(((b.case % cols) + M.largeur / 2) * T), x = pr ? x0 + T / 2 : x0;
              // (la moitié droite d'un lit deux places : rien à dessiner, sa place seulement)
              if (pr && !pr.gauche) {
                const g = pos(pr.autre);
                this.etageLits.set(b.case, { img: null, gauche: pr.autre, x: x0, y: g.y - dy - 1, haut: this.textures.get(k).getSourceImage().height, dessin: LD.double, double: true });
                continue;
              }
              // (un meuble qui bloque : devant le personnage de sa rangée, derrière ses murs ; un
              // tapis, un lit, où l'on marche : une tranche par rangée, sur le plancher de sa rangée,
              // sous le personnage qui y est, etageDepth)
              if (M.bloque || M.hauteur < 2) {
                add(this.add.image(x, p.y - dy - 1, k).setOrigin(0.5, 1).setDepth(p.y + (M.bloque ? 0.9 : M.lit ? 0.75 : 0.6)));
              } else {
                const H = this.textures.get(k).getSourceImage().height;
                let bas = null;
                for (let j = 0; j < M.hauteur; j++) {
                  const y1 = H - j * T, y0 = j === M.hauteur - 1 ? 0 : y1 - T;
                  const img = add(this.add.image(x, p.y - dy - 1, k).setOrigin(0.5, 1).setCrop(0, y0, 9999, y1 - y0).setDepth(p.y - j * T + (M.lit ? 0.75 : 0.6)));
                  if (!j) bas = img;
                }
                if (M.lit) this.etageLits.set(b.case, pr ? { img: bas, x: x0, xd: x, y: p.y - dy - 1, haut: H, dessin: LD.double, double: true } : { img: bas, x, y: p.y - dy - 1, haut: H, dessin: M.dessin });
              }
              if (M.bloque) for (let j = 0; j < M.hauteur; j++) for (let i = 0; i < M.largeur; i++) this.etageBloque.add(b.case - j * cols + i);
              continue;
            }
            const [key, f] = this.blocImage(b, at, cols), p = pos(b.case);
            const plat = BLOCS_CARTE.plats.includes(b.sorte);
            const img = add(this.add.image(p.x, p.y - dy, key, f).setOrigin(0.5, 1).setDepth(p.y + (plat ? 0.7 : 1)));
            if (b.sorte === 'paillasse') this.etageLits.set(b.case, { img, x: p.x, y: p.y - dy, paillasse: true });
            if (BLOCS_CARTE.bloquent.includes(b.sorte)) this.etageBloque.add(b.case);
            if (key === BLOCS_CARTE.hauts.key) this.etageMurs.set(b.case, { img, x: p.x, sorte: b.sorte });
          }
        }
        // le voile de l'étage (montré quand on y est : stepEtage)
        if (on) this.etageObjs.push(this.etageVoile = this.add.rectangle(0, 0, this.world.w, this.world.h, E.voile, E.alpha).setOrigin(0).setDepth(this.etageVoileZ()).setVisible(false));
        this.etageVue = null;          // (stepEtage refait les transparences)
      }
      if (change) {
        if (this.fermier && this.fermier.regrid) this.fermier.regrid();
        // on arrive en haut (ou en bas) de l'escalier le plus proche
        if (this.fermier && this.fermier.arrive && etage) {
          const p = this.fermier.pos(), cols = this.grid.cols;
          const d = (t) => (p ? Math.hypot((t % cols) * T + T / 2 - p.x, (Math.floor(t / cols) + 1) * T - p.y) : 0);
          const pres = etage.escaliers.slice().sort((a, b) => d(a) - d(b))[0];
          if (pres !== undefined) this.fermier.arrive((pres % cols) * T + T / 2, (Math.floor(pres / cols) + 1) * T - 2);
        }
        this.etageVue = null;
      } else if (on && !n && this.fermier && this.fermier.regrid && cle) this.fermier.regrid();
    },

    // Où est le personnage : 'haut' (à l'étage), 'bas' (dans le bâtiment de l'étage, en bas) ou
    // 'dehors' ; les transparences suivent (ETAGE.transparent, ETAGE.dedans), et un mur de
    // l'étage devant lui s'efface presque tout à fait (comme stepMurs en bas).
    stepEtage(dt) {
      if (!this.etageEmprise) return;
      const p = this.fermier && this.fermier.pos ? this.fermier.pos() : null;
      const cols = this.grid.cols;
      const dedans = p && this.etageEmprise.has(Math.floor((p.y - 1) / T) * cols + Math.floor(p.x / T));
      // (couché dans un lit de l'étage : on le voit là-haut)
      const litHaut = this.fermier && this.fermier.lit && this.fermier.lit();
      const vue = this.vueNiveau != null ? (this.vueNiveau ? 'haut' : 'bas') : this.niveau || (litHaut && litHaut.via) ? 'haut' : dedans ? 'bas' : 'dehors';
      if (vue !== this.etageVue) {
        this.etageVue = vue;
        const haut = vue === 'bas' ? (this.vueNiveau != null ? E.transparent : E.dedans) : 1, z = vue === 'haut';
        // (à l'étage, tout ce qui est de l'étage passe devant le voile)
        const pose = (o, a) => {
          if (o.etageZ === undefined) o.etageZ = o.depth;
          o.setDepth(z ? this.etageZ(o.etageZ) : o.etageZ);
          if (a !== undefined) o.setAlpha(a);
        };
        for (const o of this.etageObjs || []) { if (o === this.etageVoile) continue; pose(o, haut); o.etageA = haut; }
        if (this.etageVoile) this.etageVoile.setVisible(vue === 'haut');
        // (à l'étage : les blocs du bas, sous l'emprise, en transparence, devant le voile)
        for (const e of (this.blocks || new Map()).values()) {
          const sous = vue === 'haut' && this.etageEmprise.has(e.case);
          if (!sous && e.img.etageZ === undefined) continue;
          e.img.etageA = sous ? E.transparent : undefined;
          if (e.img.etageZ === undefined) e.img.etageZ = e.img.depth;
          e.img.setDepth(sous ? this.etageZ(e.img.etageZ) : e.img.etageZ).setAlpha(sous ? E.transparent : 1);
          if (!sous) e.img.etageZ = undefined;
        }
      }
      // à l'étage : un mur de l'étage devant lui (une ou deux cases plus bas) s'efface
      if (vue !== 'haut' || !p || !this.etageMurs.size) return;
      const H = BLOCS_CARTE.hauts, devant = new Set();
      const gx = Math.floor(p.x / T), gy = Math.floor((p.y - 1) / T);
      for (let dy = 1; dy <= 2; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const m = this.etageMurs.get((gy + dy) * cols + gx + dx);
          if (m && Math.abs(m.x - p.x) < T / 2 + 6) devant.add(m.img);
        }
      }
      const pas = H.vitesse * dt;
      for (const m of this.etageMurs.values()) {
        const i = m.img, but = devant.has(i) ? H.joueur : 1;
        if (i.alpha !== but) i.setAlpha(i.alpha < but ? Math.min(but, i.alpha + pas) : Math.max(but, i.alpha - pas));
      }
    },

    // Les cases où l'on ne passe pas à l'étage : tout ce qui est hors de l'emprise, et les blocs
    // de l'étage qui arrêtent (null : on est en bas).
    etageCells() {
      if (!this.niveau || !this.etageEmprise) return null;
      const out = [], n = this.grid.cols * Math.ceil(this.world.h / T);
      for (let i = 0; i < n; i++) if (!this.etageEmprise.has(i) || this.etageBloque.has(i)) out.push(i);
      return out;
    },

    // Un couchage de l'étage (« etage:<tuile> », modèle.couchages) : où l'on s'y couche, comme
    // bedSpotOf (js/carte/ferme/chantier.js), dessiné à l'étage (sa profondeur suit celle de son
    // image : devant le voile quand on est à l'étage) ; via : le pied de l'escalier le plus proche,
    // où l'on monte (et où l'on se lève, en bas) ; etage : sa case, au sol de la grille de l'étage
    // (on y marche quand on y est déjà).
    etageBedSpot(t) {
      const e = this.etageLits && this.etageLits.get(t);
      if (!e) return null;
      const cols = this.grid.cols, pied = (c) => ({ x: (c % cols) * T + T / 2, y: (Math.floor(c / cols) + 1) * T - 2 });
      const cell = pied(t);
      const via = (this.etageEscaliers || []).map(pied).sort((a, b) => Math.hypot(a.x - cell.x, a.y - cell.y) - Math.hypot(b.x - cell.x, b.y - cell.y))[0] || null;
      // (la moitié droite d'un lit deux places : l'image et la couverture sont celles de gauche)
      const g = e.img ? e : this.etageLits.get(e.gauche);
      const img = g && g.img;
      if (!img) return null;
      // sa profondeur et celles de ce qui s'y pose (le dormeur, sa couverture : z(0.1), z(0.2)) :
      // devant le voile quand on regarde l'étage (stepEtage, etageZ), à l'échelle de etageZ
      const base = () => (img.etageZ !== undefined ? img.etageZ : img.depth);
      const z = (k) => (img.etageZ !== undefined && img.depth !== img.etageZ ? this.etageZ(base() + k) : base() + k);
      if (e.paillasse) {
        return { x: e.x, y: e.y - BLOCS_CARTE.coucheY, get depth() { return img.depth; }, z, drap: { key: BLOCS_CARTE.key, frame: BLOCS_CARTE.frames.drap, x: e.x, y: e.y }, via, etage: cell };
      }
      const drap = 'meuble_' + e.dessin + '_drap';
      if (!this.has(drap)) return null;
      return { x: e.x, y: Math.min(e.y - e.haut + BLOCS_CARTE.litPieds, e.y - 1), get depth() { return img.depth; }, z, drap: { key: drap, frame: undefined, x: g.xd || g.x, y: g.y }, via, etage: cell };
    },

    // À l'étage, le personnage est dessiné remonté (ETAGE.dy), un peu devant le plancher.
    etageLift() {
      return this.niveau ? E.dy : 0;
    },
    // (à l'étage : devant le plancher et le haut de l'escalier de sa rangée, et une paillasse,
    // derrière les murs de l'étage de sa rangée et de celles d'en dessous)
    etageDepth(y) {
      return this.niveau ? this.etageZ((Math.floor((y - 1) / T) + 1) * T + 0.8) : y;
    },

    // Un point touché, ramené au sol du niveau montré (à l'étage : ETAGE.dy plus bas) ; en mode
    // Construire, celui où l'on construit.
    etagePoint(wx, wy) {
      // (au niveau où l'on rehausse les murs : à sa hauteur, js/carte/ferme/chantier.js syncRang)
      if (this.rang) return { x: wx, y: wy + this.rang * E.dy };
      const n = this.vueNiveau != null ? this.vueNiveau : this.niveau;
      return { x: wx, y: n ? wy + E.dy : wy };
    },

    // Un escalier sous ce point (son bas, ou son haut à l'étage) : sa case, ou -1.
    escalierAt(wx, wy) {
      const e = this.ctx.lastModel && this.ctx.lastModel.etage;
      if (!e) return -1;
      const q = this.etagePoint(wx, wy), c = this.tileAtPoint(q.x, q.y);
      return e.escaliers.includes(c) ? c : -1;
    },
  });
})(window);
