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
 * Le niveau 2 (modèle.etage.etage2 : { emprise, escaliers, hauts }) : un escalier posé à l'étage
 * dans une pièce dont les murs montent au niveau 2 y fait monter. Son plancher (ses sols,
 * modèle.solsHauts) est remonté de 2 × ETAGE.dy, devant un second voile qui couvre l'étage
 * (etage2Z) ; on y marche entre les murs du bas qui montent plus haut (etage2Bloque).
 * escalierVers dit où mène l'escalier touché.
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
    // Au niveau 2 : de même, au-dessus d'un second voile, qui couvre l'étage.
    etage2Z(d) {
      return this.etage2VoileZ() + 0.01 + d * 1e-5;
    },
    etage2VoileZ() {
      return this.etageVoileZ() + 0.5;
    },
    // La profondeur, au niveau `n` (1 ou 2), de ce qui a la profondeur `d` en bas.
    niveauZ(n, d) {
      return n >= 2 ? this.etage2Z(d) : this.etageZ(d);
    },

    // L'étage du modèle, et le niveau où l'on est : dessiné (remonté de ETAGE.dy), ou ôté.
    syncEtage(etage, niveau, vueNiveau) {
      const on = !!(etage && etage.emprise.length);
      // (en mode Construire : la vue montre le niveau où l'on construit)
      const vn = on && vueNiveau != null ? vueNiveau : null;
      if (vn !== (this.vueNiveau === undefined ? null : this.vueNiveau)) { this.vueNiveau = vn; this.etageVue = null; }
      const n = on ? Math.min(niveau || 0, etage.etage2 ? 2 : 1) : 0;
      const solsHaut = (this.ctx.lastModel && this.ctx.lastModel.solsEtage) || [];
      const sols2 = ((this.ctx.lastModel && this.ctx.lastModel.solsHauts) || []).filter((q) => q.niveau === 2);
      // (une image pas encore chargée au dernier dessin : on le refait dès qu'elle est là)
      if (this.etageManque && this.etageManque.length && this.etageManque.every((k) => this.textures.exists(k))) this.etageCle = null;
      const cle = on ? JSON.stringify(etage) + JSON.stringify(solsHaut) + JSON.stringify(sols2) : '';
      if (cle === this.etageCle && n === (this.niveau || 0)) return;
      const change = n !== (this.niveau || 0), avant = this.niveau || 0;
      this.niveau = n;
      if (cle !== this.etageCle) {
        this.etageCle = cle;
        this.etageManque = [];
        if (this.etageObjs) this.etageObjs.forEach((o) => o.destroy());
        this.etageObjs = [];
        this.etageMurs = new Map();
        this.etageMurs2 = new Map();     // (les murs posés au niveau 2 : leurs papiers peints, chantier.js syncPapiers)
        this.etageEmprise = on ? new Set(etage.emprise) : null;
        this.etageBloque = new Set();
        this.etageLits = new Map();      // les couchages de l'étage : case → { img, x, y, dessin }
        this.etageLits2 = new Map();     // ceux du niveau 2
        this.etageLumieres = [];         // les lanternes et les réverbères de l'étage (chantier.js stepLanterns)
        this.etageLampes = [];           // les lampes de chevet de l'étage (chantier.js stepLanterns)
        this.etageCheminees = [];        // les cheminées de l'étage (chantier.js stepLanterns)
        this.etageEscaliers = on ? etage.escaliers.slice() : [];
        // le niveau 2 (par l'escalier de l'étage) : ses objets, son emprise, ce qui y arrête
        if (this.etage2Objs) this.etage2Objs.forEach((o) => o.destroy());
        this.etage2Objs = [];
        if (this.etageN2Objs) this.etageN2Objs.forEach((o) => o.destroy());
        this.etageN2Objs = [];
        const e2 = on && etage.etage2;
        this.etage2Emprise = e2 ? new Set(e2.emprise) : null;
        this.etage2Bloque = new Set(e2 ? e2.hauts : []);
        if (on && this.has(BLOCS_CARTE.key)) {
          const cols = this.grid.cols, dy = E.dy, add = (o) => { this.etageObjs.push(o); return o; };
          const dans = (t) => this.etageEmprise.has(t);
          const pos = (t) => ({ x: (t % cols) * T + T / 2, y: (Math.floor(t / cols) + 1) * T });
          // le plancher, raccordé sur toute l'emprise, au sommet des murs du bas ; pas sur un mur du
          // bas qui monte à l'étage (il en est le mur : on le voit) ; un sol posé au niveau 1 à
          // sa place, raccordé aux siens (comme en bas : syncFloors)
          const hauts = new Set(etage.hauts || []), sol = new Map(solsHaut.map((q) => [q.case, q.sorte]));
          for (const t of etage.emprise) {
            if (hauts.has(t)) continue;
            const c = t % cols, so = sol.get(t);
            const est = so ? (k) => sol.get(k) === so : (k) => dans(k) && !hauts.has(k) && !sol.has(k);
            const m = (est(t - cols) ? 1 : 0) + (c < cols - 1 && est(t + 1) ? 2 : 0) + (est(t + cols) ? 4 : 0) + (c > 0 && est(t - 1) ? 8 : 0);
            const base = so && BLOCS_CARTE.modelesSols[so] !== undefined ? BLOCS_CARTE.modelesSols[so] : BLOCS_CARTE.sols;
            const p = pos(t);
            add(this.add.image(p.x, p.y - dy, BLOCS_CARTE.key, base + m).setOrigin(0.5, 1).setDepth(p.y + 0.5));
          }
          for (const t of hauts) this.etageBloque.add(t);
          // le niveau 2 : son plancher (un sol posé au niveau 2 à sa place), au sommet des murs de
          // l'étage, sauf sur un mur du bas qui monte plus haut ; le haut de l'escalier de l'étage
          if (e2) {
            const dans2 = (k) => this.etage2Emprise.has(k), hauts2 = this.etage2Bloque, sol2 = new Map(sols2.map((q) => [q.case, q.sorte]));
            for (const t of e2.emprise) {
              if (hauts2.has(t)) continue;
              const c = t % cols, so = sol2.get(t);
              const est = so ? (k) => sol2.get(k) === so : (k) => dans2(k) && !hauts2.has(k) && !sol2.has(k);
              const m = (est(t - cols) ? 1 : 0) + (c < cols - 1 && est(t + 1) ? 2 : 0) + (est(t + cols) ? 4 : 0) + (c > 0 && est(t - 1) ? 8 : 0);
              const base = so && BLOCS_CARTE.modelesSols[so] !== undefined ? BLOCS_CARTE.modelesSols[so] : BLOCS_CARTE.sols;
              const p = pos(t);
              this.etage2Objs.push(this.add.image(p.x, p.y - 2 * dy, BLOCS_CARTE.key, base + m).setOrigin(0.5, 1).setDepth(p.y + 0.5));
            }
            for (const t of e2.escaliers) {
              const p = pos(t);
              this.etage2Objs.push(this.add.image(p.x, p.y - 2 * dy, BLOCS_CARTE.key, E.haut).setOrigin(0.5, 1).setDepth(p.y + 0.6));
            }
            this.etage2Objs.push(this.etage2Voile = this.add.rectangle(0, 0, this.world.w, this.world.h, E.voile, E.alpha).setOrigin(0).setDepth(this.etage2VoileZ()).setVisible(false));
          }
          for (const t of etage.escaliers) {
            if (!dans(t)) continue;
            const p = pos(t);
            add(this.add.image(p.x, p.y - dy, BLOCS_CARTE.key, E.haut).setOrigin(0.5, 1).setDepth(p.y + 0.6));
          }
          // les blocs d'un niveau (1 : l'étage ; 2 : au-dessus ; les mêmes dessins, ETAGE.dy plus haut par
          // niveau) : les murs raccordés entre eux, hauts comme en bas ; les meubles ; les tableaux. Seuls
          // ceux de l'étage s'allument, se couchent (etageLits, etageLumieres…)
          const dessine = (blocs, tableaux, niv, add, bloque) => {
          const dy = E.dy * niv, un = niv === 1, lits = un ? this.etageLits : this.etageLits2;
          const at = new Map(blocs.map((b) => [b.case, b.sorte]));
          // deux lits adulte côte à côte (la même rangée) : un lit deux places, comme en bas
          // (chantier.js syncLitsDoubles) ; celui de gauche le dessine, l'autre ne se dessine pas
          // (deux lits de face seulement : un lit tourné garde son dessin, A-1)
          const LD = BLOCS_CARTE.litDouble, seul = (c) => { const b = blocs.find((q) => q.case === c); return !!(b && b.meuble && b.meuble.dessin === LD.seul && !b.meuble.sens); };
          // (A-3 : deux lits de la même couleur)
          const teinteDe = (c) => { const b = blocs.find((q) => q.case === c); return (b && b.meuble && b.meuble.variante) || null; };
          const paire = new Map();
          if (this.textures.exists('meuble_' + LD.double)) {
            for (const b of blocs.slice().sort((p1, p2) => p1.case - p2.case)) {
              const c = b.case;
              if (!seul(c) || paire.has(c) || c % cols === cols - 1 || !seul(c + 1) || paire.has(c + 1) || teinteDe(c) !== teinteDe(c + 1)) continue;
              paire.set(c, { gauche: true, autre: c + 1 });
              paire.set(c + 1, { gauche: false, autre: c });
            }
          }
          for (const b of blocs) {
            // un meuble (modèle : b.meuble, comme en bas : syncMeuble) : son dessin, au milieu des
            // cases qu'il couvre, qui arrêtent le passage s'il bloque
            if (b.meuble) {
              const M = b.meuble, pr = paire.get(b.case), p = pos(b.case);
              // (tourné, A-1 : sa vue de dos ou de profil, en miroir vers la gauche ; js/ui/stage.js meubleDe)
              const vu = 'meuble_' + M.dessin + (M.vue || '');
              // (A-3 : dans sa couleur, js/carte/ferme/chantier.js imageTeinte)
              const k = this.imageTeinte(pr ? 'meuble_' + LD.double : this.textures.exists(vu) ? vu : 'meuble_' + M.dessin, M.variante, M.couleurs);
              if (!this.textures.exists(k)) { this.etageManque.push(k); continue; }
              const x0 = Math.round(((b.case % cols) + M.largeur / 2) * T), x = pr ? x0 + T / 2 : x0;
              // (la moitié droite d'un lit deux places : rien à dessiner, sa place seulement)
              if (pr && !pr.gauche) {
                const g = pos(pr.autre);
                lits.set(b.case, { img: null, gauche: pr.autre, x: x0, y: g.y - dy - 1, haut: this.textures.getFrame(k).height, dessin: LD.double, double: true });
                continue;
              }
              // (un meuble qui bloque : devant le personnage de sa rangée, derrière ses murs ; un
              // tapis, un lit, où l'on marche : une tranche par rangée, sur le plancher de sa rangée,
              // sous le personnage qui y est, etageDepth)
              if (M.bloque || M.hauteur < 2) {
                const img = add(this.add.image(x, p.y - dy - 1, k).setOrigin(0.5, 1).setDepth(p.y + (M.bloque ? 0.9 : M.lit ? 0.75 : 0.6)).setFlipX(!!M.miroir));
                // (une table de chevet : sa lampe s'allume le soir, comme en bas)
                if (un && BLOCS_CARTE.lampeChevet.dessins.includes(M.dessin)) this.etageLampes.push({ img, x, y: p.y - dy - 1, dessin: M.dessin });
                // (une cheminée : son feu s'allume le soir, comme en bas)
                if (un && String(M.dessin).startsWith('cheminee_')) this.etageCheminees.push({ img, x, y: p.y - dy - 1 });
                // (un lit de profil, sur une rangée : on y dort aussi)
                if (M.lit) lits.set(b.case, { img, x, y: p.y - dy - 1, haut: this.textures.getFrame(k).height, dessin: M.dessin, sens: M.sens || 0, variante: M.variante || null, couleurs: M.couleurs || null });
              } else {
                const H = this.textures.getFrame(k).height;
                let bas = null;
                for (let j = 0; j < M.hauteur; j++) {
                  const y1 = H - j * T, y0 = j === M.hauteur - 1 ? 0 : y1 - T;
                  const img = add(this.add.image(x, p.y - dy - 1, k).setOrigin(0.5, 1).setCrop(0, y0, 9999, y1 - y0).setDepth(p.y - j * T + (M.lit ? 0.75 : 0.6)).setFlipX(!!M.miroir));
                  if (!j) bas = img;
                }
                if (M.lit) lits.set(b.case, pr ? { img: bas, x: x0, xd: x, y: p.y - dy - 1, haut: H, dessin: LD.double, double: true, variante: M.variante || null, couleurs: M.couleurs || null } : { img: bas, x, y: p.y - dy - 1, haut: H, dessin: M.dessin, sens: M.sens || 0, variante: M.variante || null, couleurs: M.couleurs || null });
              }
              if (M.bloque) for (let j = 0; j < M.hauteur; j++) for (let i = 0; i < M.largeur; i++) bloque.add(b.case - j * cols + i);
              continue;
            }
            let [key, f] = this.blocImage(b, at, cols);
            const p = pos(b.case);
            // (le mobilier de jardin tourné : son image dans ce sens, en miroir vers la gauche, comme en bas)
            const S = BLOCS_CARTE.sens && BLOCS_CARTE.sens[b.sorte], miroir = !!(S && S.miroir[b.sens || 0]);
            if (S) f = S.images[b.sens || 0];
            const plat = BLOCS_CARTE.plats.includes(b.sorte);
            const img = add(this.add.image(p.x, p.y - dy - F.piedBloc(b.sorte), key, f).setOrigin(0.5, 1).setDepth(p.y + (plat ? 0.7 : 1)).setFlipX(miroir));
            if (b.sorte === 'paillasse') lits.set(b.case, { img, x: p.x, y: p.y - dy, paillasse: true });
            // (une lanterne, un réverbère : ils s'allument la nuit comme en bas, à la hauteur de l'étage)
            if (un && (b.sorte === 'lanterne' || b.sorte === 'candelabre')) this.etageLumieres.push({ case: b.case, sorte: b.sorte, img, x: p.x, y: p.y - dy });
            if (BLOCS_CARTE.bloquent.includes(b.sorte)) bloque.add(b.case);
            if (key === BLOCS_CARTE.hauts.key) (un ? this.etageMurs : this.etageMurs2).set(b.case, { img, x: p.x, sorte: b.sorte });
          }
          // les tableaux accrochés aux murs de l'étage (modèle : etage.tableaux), sur la face du mur, comme en
          // bas (js/carte/ferme/chantier.js syncTableaux), juste devant lui
          for (const t of tableaux || []) {
            const key = 'meuble_' + t.dessin;
            if (!this.textures.exists(key)) { this.etageManque.push(key); continue; }
            const p = pos(t.case);
            add(this.add.image(p.x, p.y - dy - BLOCS_CARTE.tableau.dy, key).setOrigin(0.5, 1).setDepth(p.y + 1.05));
          }
          };
          dessine(etage.blocs, etage.tableaux, 1, add, this.etageBloque);
          // le niveau 2 (modèle : etage.n2 ; on y bâtit avec ou sans escalier) : ses blocs, montrés quand on y
          // est (vue « haut2 ») ou qu'on y construit (le rang 2 : syncRang) ; stepEtage
          if (this.etageN2Objs) this.etageN2Objs.forEach((o) => o.destroy());
          this.etageN2Objs = [];
          if (!this.etage2Bloque) this.etage2Bloque = new Set();
          if (etage.n2) dessine(etage.n2.blocs, etage.n2.tableaux, 2, (o) => { this.etageN2Objs.push(o); return o; }, this.etage2Bloque);
        }
        // le voile de l'étage (montré quand on y est : stepEtage)
        if (on) this.etageObjs.push(this.etageVoile = this.add.rectangle(0, 0, this.world.w, this.world.h, E.voile, E.alpha).setOrigin(0).setDepth(this.etageVoileZ()).setVisible(false));
        this.etageVue = null;          // (stepEtage refait les transparences)
      }
      if (change) {
        if (this.fermier && this.fermier.regrid) this.fermier.regrid();
        if (global.FermeSon && this.etageSonPret) global.FermeSon.joue('echelle', { gain: 0.8 });   // l'escalier (js/son.js)
        this.etageSonPret = true;
        // on arrive en haut (ou en bas) de l'escalier le plus proche (entre l'étage et le niveau 2 :
        // celui de l'étage)
        if (this.fermier && this.fermier.arrive && etage) {
          const p = this.fermier.pos(), cols = this.grid.cols;
          const d = (t) => (p ? Math.hypot((t % cols) * T + T / 2 - p.x, (Math.floor(t / cols) + 1) * T - p.y) : 0);
          const liste = Math.max(avant, n) >= 2 && etage.etage2 ? etage.etage2.escaliers : etage.escaliers;
          const pres = liste.slice().sort((a, b) => d(a) - d(b))[0];
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
      const vue = this.vueNiveau != null ? (this.vueNiveau ? 'haut' : 'bas') : this.niveau >= 2 || (litHaut && litHaut.via && litHaut.niveau === 2) ? 'haut2' : this.niveau || (litHaut && litHaut.via) ? 'haut' : dedans ? 'bas' : 'dehors';
      if (vue !== this.etageVue || this.etageBlocsN !== this.blocsN || (this.rang || 0) !== this.etageRangVu) {
        this.etageVue = vue;
        this.etageBlocsN = this.blocsN;
        this.etageRangVu = this.rang || 0;
        const n2 = vue === 'haut2', z = vue === 'haut' || n2;
        // (les blocs du niveau 2 : là-haut, devant le second voile ; en mode Construire au niveau 2 (le rang
        // 2, chantier.js syncRang), devant son voile ; sinon cachés, sous le toit)
        const r2 = this.etageRangVu === 2;
        for (const o of this.etageN2Objs || []) {
          if (o.etageZ === undefined) o.etageZ = o.depth;
          o.setVisible(n2 || r2).setDepth(n2 ? this.etage2Z(o.etageZ) : r2 ? this.etageZ(o.etageZ + 0.02) : o.etageZ);
        }
        const haut = vue === 'bas' ? (this.vueNiveau != null ? E.transparent : E.dedans) : 1;
        // (le niveau 2 : seulement quand on y est, devant son voile, qui couvre l'étage)
        for (const o of this.etage2Objs || []) {
          if (o === this.etage2Voile) { o.setVisible(n2); continue; }
          if (o.etageZ === undefined) o.etageZ = o.depth;
          o.setVisible(n2).setDepth(n2 ? this.etage2Z(o.etageZ) : o.etageZ);
        }
        // (à l'étage, tout ce qui est de l'étage passe devant le voile)
        const pose = (o, a) => {
          if (o.etageZ === undefined) o.etageZ = o.depth;
          o.setDepth(z ? this.etageZ(o.etageZ) : o.etageZ);
          if (a !== undefined) o.setAlpha(a);
        };
        for (const o of this.etageObjs || []) { if (o === this.etageVoile) continue; pose(o, haut); o.etageA = haut; }
        if (this.etageVoile) this.etageVoile.setVisible(z);
        // (à l'étage : les blocs du bas, sous l'emprise, en transparence, devant le voile)
        for (const e of (this.blocks || new Map()).values()) {
          const sous = z && this.etageEmprise.has(e.case);
          if (!sous && e.img.etageZ === undefined) continue;
          e.img.etageA = sous ? E.transparent : undefined;
          if (e.img.etageZ === undefined) e.img.etageZ = e.img.depth;
          e.img.setDepth(sous ? this.etageZ(e.img.etageZ) : e.img.etageZ).setAlpha(sous ? E.transparent : 1);
          if (!sous) e.img.etageZ = undefined;
        }
        // (à l'étage : le premier bloc du dessus des murs rehaussés est un mur de l'étage, devant
        // son voile ; celui d'au-dessus, un mur du niveau 2, reste derrière, sous son plancher ;
        // au niveau 2, il passe devant le second voile)
        for (const e of (this.blocks || new Map()).values()) {
          (e.hauts || []).forEach((i, k) => {
            if (!i.active) return;
            const niv = k + 1, devant = z && (niv === 1 || (n2 && niv === 2));
            if (devant) { if (i.etageZ === undefined) i.etageZ = i.depth; i.setDepth(this.niveauZ(niv, i.etageZ)).setAlpha(1); }
            else if (i.etageZ !== undefined) { i.setDepth(i.etageZ); i.etageZ = undefined; }
          });
        }
      }
      // (les papiers peints suivent leur mur : sa profondeur, s'il se voit)
      if (this.papiers && this.etageVuePapiers !== this.etageVue + ':' + this.etageRangVu + ':' + this.etageBlocsN) {
        this.etageVuePapiers = this.etageVue + ':' + this.etageRangVu + ':' + this.etageBlocsN;
        for (const e of this.papiers.values()) if (e.mur && e.mur.active && e.img.active) e.img.setDepth(this.papierZ(e.mur)).setVisible(e.mur.visible);
      }
      // à l'étage (au niveau 2) : un mur de ce niveau devant lui (une ou deux cases plus bas)
      // s'efface, un mur de l'étage ou le bloc du dessus d'un mur du bas qui y monte
      if (!this.fondus) this.fondus = new Set();
      const devant = new Set(), H = BLOCS_CARTE.hauts;
      if ((vue === 'haut' || vue === 'haut2') && p) {
        const niv = vue === 'haut2' ? 2 : 1;
        const gx = Math.floor(p.x / T), gy = Math.floor((p.y - 1) / T);
        for (let dy = 1; dy <= 2; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const k = (gy + dy) * cols + gx + dx;
            const m = niv === 1 && this.etageMurs.get(k);
            if (m && Math.abs(m.x - p.x) < T / 2 + 6) devant.add(m.img);
            const e = this.blocks && this.blocks.get(k), i = e && e.hauts && e.hauts[niv - 1];
            if (i && i.active && Math.abs(e.x - p.x) < T / 2 + 6) devant.add(i);
          }
        }
      }
      for (const i of devant) this.fondus.add(i);
      for (const m of this.etageMurs.values()) this.fondus.add(m.img);
      const pas = H.vitesse * dt;
      for (const i of this.fondus) {
        if (!i.active) { this.fondus.delete(i); continue; }
        const but = devant.has(i) ? H.joueur : 1;
        if (i.alpha !== but) i.setAlpha(i.alpha < but ? Math.min(but, i.alpha + pas) : Math.max(but, i.alpha - pas));
        else if (but === 1 && !this.etageMurs.has(i)) this.fondus.delete(i);
      }
    },

    // Les cases où l'on ne passe pas à l'étage : tout ce qui est hors de l'emprise, et les blocs
    // de l'étage qui arrêtent (null : on est en bas).
    etageCells() {
      if (!this.niveau || !this.etageEmprise) return null;
      const out = [], n = this.grid.cols * Math.ceil(this.world.h / T);
      // (au niveau 2 : son emprise, sans les murs du bas qui montent plus haut)
      if (this.niveau >= 2 && this.etage2Emprise) {
        for (let i = 0; i < n; i++) if (!this.etage2Emprise.has(i) || this.etage2Bloque.has(i)) out.push(i);
        return out;
      }
      for (let i = 0; i < n; i++) if (!this.etageEmprise.has(i) || this.etageBloque.has(i)) out.push(i);
      return out;
    },

    // Un couchage de l'étage (« etage:<tuile> », modèle.couchages) : où l'on s'y couche, comme
    // bedSpotOf (js/carte/ferme/chantier.js), dessiné à l'étage (sa profondeur suit celle de son
    // image : devant le voile quand on est à l'étage) ; via : le pied de l'escalier le plus proche,
    // où l'on monte (et où l'on se lève, en bas) ; etage : sa case, au sol de la grille de l'étage
    // (on y marche quand on y est déjà).
    etageBedSpot(t, n = 1) {
      const L = n === 2 ? this.etageLits2 : this.etageLits, e = L && L.get(t);
      if (!e) return null;
      const cols = this.grid.cols, pied = (c) => ({ x: (c % cols) * T + T / 2, y: (Math.floor(c / cols) + 1) * T - 2 });
      const cell = pied(t);
      const via = (this.etageEscaliers || []).map(pied).sort((a, b) => Math.hypot(a.x - cell.x, a.y - cell.y) - Math.hypot(b.x - cell.x, b.y - cell.y))[0] || null;
      // (la moitié droite d'un lit deux places : l'image et la couverture sont celles de gauche)
      const g = e.img ? e : L.get(e.gauche);
      const img = g && g.img;
      if (!img) return null;
      // sa profondeur et celles de ce qui s'y pose (le dormeur, sa couverture : z(0.1), z(0.2)) :
      // devant le voile quand on regarde l'étage (stepEtage, etageZ), à l'échelle de etageZ
      const base = () => (img.etageZ !== undefined ? img.etageZ : img.depth);
      const z = (k) => (img.etageZ !== undefined && img.depth !== img.etageZ ? this.niveauZ(n, base() + k) : base() + k);
      if (e.paillasse) {
        return { x: e.x, y: e.y - BLOCS_CARTE.coucheY, get depth() { return img.depth; }, z, drap: { key: BLOCS_CARTE.key, frame: BLOCS_CARTE.frames.drap, x: e.x, y: e.y }, via, etage: cell, niveau: n };
      }
      // (un lit tourné, A-1 : le dormeur pivote avec lui ; js/carte/ferme/chantier.js litDormeur)
      if (e.sens) {
        const Ld = this.litDormeur(e.sens, img, e.dessin, 0, { z, via, etage: cell, niveau: n }, e);
        if (Ld) Object.defineProperty(Ld, 'depth', { get: () => img.depth });
        return Ld;
      }
      if (!this.has('meuble_' + e.dessin + '_drap')) return null;
      const drap = this.imageTeinte('meuble_' + e.dessin + '_drap', g.variante, g.couleurs);
      return { x: e.x, y: Math.min(e.y - e.haut + BLOCS_CARTE.litPieds, e.y - 1), get depth() { return img.depth; }, z, drap: { key: drap, frame: undefined, x: g.xd || g.x, y: g.y }, via, etage: cell, niveau: n };
    },

    // À l'étage, le personnage est dessiné remonté (ETAGE.dy), un peu devant le plancher.
    etageLift() {
      return (this.niveau || 0) * E.dy;
    },
    // (à l'étage : devant le plancher et le haut de l'escalier de sa rangée, et une paillasse,
    // derrière les murs de l'étage de sa rangée et de celles d'en dessous)
    etageDepth(y) {
      return this.niveau ? this.niveauZ(this.niveau, (Math.floor((y - 1) / T) + 1) * T + 0.8) : y;
    },

    // Un point touché, ramené au sol du niveau montré (à l'étage : ETAGE.dy plus bas) ; en mode
    // Construire, celui où l'on construit.
    etagePoint(wx, wy) {
      // (au niveau où l'on rehausse les murs : à sa hauteur, js/carte/ferme/chantier.js syncRang)
      if (this.rang) return { x: wx, y: wy + this.rang * E.dy };
      const n = this.vueNiveau != null ? this.vueNiveau : this.niveau || 0;
      return { x: wx, y: wy + n * E.dy };
    },

    // Une station posée à l'étage où l'on est, sous ce point (sa case, ou celle du dessus où dépasse
    // son image) : la fenêtre de sa station (BLOCS_CARTE.fenetres), ou null.
    stationEtageAt(wx, wy) {
      const e = this.ctx.lastModel && this.ctx.lastModel.etage;
      const n = this.niveau || 0, liste = !e ? null : n === 1 ? e.blocs : n === 2 && e.n2 ? e.n2.blocs : null;
      if (!liste) return null;
      const q = this.etagePoint(wx, wy), c = this.tileAtPoint(q.x, q.y), cols = this.grid.cols;
      for (const b of liste) {
        const win = BLOCS_CARTE.fenetres[b.sorte];
        if (win && (b.case === c || b.case === c + cols)) return win;
      }
      return null;
    },

    // Un escalier sous ce point (son bas, ou son haut à l'étage) : sa case, ou -1.
    escalierAt(wx, wy) {
      if (this.escalierVers(wx, wy) < 0) return -1;
      const q = this.etagePoint(wx, wy), c = this.tileAtPoint(q.x, q.y), e = this.ctx.lastModel.etage;
      const tous = [...e.escaliers, ...((e.etage2 && e.etage2.escaliers) || [])];
      return tous.includes(c) ? c : this.tileAtPoint(q.x, q.y + E.depasse);
    },
    // Où mène l'escalier sous ce point : le niveau où l'on arrive, ou -1. En bas, celui du bas
    // monte à l'étage ; à l'étage, son haut redescend, celui de l'étage monte au niveau 2 ; au
    // niveau 2, le haut de celui de l'étage redescend.
    // (l'image de l'escalier dépasse de sa case vers le haut, BLOCS_CARTE.etage.depasse px : un appui
    // sur ce qui dépasse compte aussi)
    escalierVers(wx, wy) {
      const e = this.ctx.lastModel && this.ctx.lastModel.etage;
      if (!e) return -1;
      const q = this.etagePoint(wx, wy), n = this.niveau || 0, e2 = e.etage2;
      const vers = (c) => {
        if (n === 0) return e.escaliers.includes(c) ? 1 : -1;
        if (n === 1) return e.escaliers.includes(c) ? 0 : e2 && e2.escaliers.includes(c) ? 2 : -1;
        return e2 && e2.escaliers.includes(c) ? 1 : -1;
      };
      const v = vers(this.tileAtPoint(q.x, q.y));
      return v >= 0 ? v : vers(this.tileAtPoint(q.x, q.y + E.depasse));
    },
  });
})(window);
