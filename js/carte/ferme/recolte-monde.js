/* carte/ferme/recolte-monde.js — la scène de la ferme : couper, casser, faucher, cueillir et ramasser
 * dans le grand monde (docs/grand-monde.md, fiche 6a).
 *
 * Les pièces du monde (vegetation.js : les arbres, les buissons, les plantes et les rochers des
 * régions, leurs petites pièces peintes dans le sol) ont chacune un identifiant tiré d'elle-même
 * (« sorte:x,y », le pied en px : ctx.monde.idObjet, js/engine/monde-recolte.js), le même pour le
 * Worker, la scène et le moteur. Ce que le moteur en dit (modèle.monde : { pris, cueillis }, leurs
 * identifiants) : une pièce prise n'est pas dessinée (son image cachée, ou sa petite pièce plus
 * peinte dans le canevas de sa région : quelques cases repeintes), une plante cueillie prend son
 * dessin sans fruits (RECOLTE.SORTES[sorte].apres). Une région qui s'en va puis revient se refait
 * d'après lui : ce qui est pris le reste.
 *
 * Un appui sur une pièce (mondeObjetAt) : la hache en main, un arbre ou un buisson ; la pioche, un
 * rocher ; la faux, une fougère, un roseau… ; à la main, un roncier, un champignon, un coquillage,
 * un galet, du bois flotté. Le personnage y va et fait le geste de la ferme (js/fermier.js : chop,
 * mine, scythe, gather) : un arbre tremble à chaque coup, son bois tombe à son pied, puis il
 * bascule, rebondit en lâchant ses feuilles et s'efface ; un rocher lâche ses éclats puis se brise ;
 * ce qui est pris à la main monte et s'efface, la bulle « +1 » au-dessus de lui. Le coup compte
 * tout de suite (le pont : ctx.bridge.recolte, js/ui/outils.js), comme sur la ferme ; ce qui est pris
 * à la main, au moment du geste. Sa case s'ouvre à la marche (js/ui/monde-sol.js, marchable).
 *
 * Méthodes de la scène de la ferme (js/farm-stage.js), posées sur son prototype : `this` est la
 * scène, `this.ctx` ce que la page lui a donné au montage (voir docs/architecture-phaser.md).
 */
(function (global) {
  'use strict';

  const K = global.CarteKit;
  const F = global.FermeCarte;
  const { T, ROCKS, MIN_TAP } = F.C;
  const { pixelRatio, reducedMotion } = F;
  const CHUTE = K.NATURE.chute;
  // les verts des feuilles qui tombent d'un buisson, des brins d'une plante fauchée
  const VERTS = [0x2f6b3a, 0x4e8f43, 0x77ad4f, 0x9cc36a];
  const FILET_MS = 9000;          // le geste n'a pas eu lieu (la nuit, un autre lieu…) : on finit quand même

  F.partie({

    // Le genre de chaque sorte du monde par son nom (arbre, buisson, haute, basse, bloc…).
    mondeGenres() {
      if (this.mondeGenresDe) return this.mondeGenresDe;
      const M = this.ctx.monde, out = new Map();
      for (const s of [...((M && M.sortes) || []), ...((M && M.roches) || [])]) out.set(s.nom, s.genre);
      return (this.mondeGenresDe = out);
    },

    // Le modèle : les pièces prises, les plantes cueillies. Ce qui a changé : son image cachée ou
    // montrée (en fondu quand elle repousse), son dessin, ses cases repeintes (une petite pièce).
    syncMonde(m) {
      const pris = new Set((m && m.pris) || []), cueillis = new Set((m && m.cueillis) || []);
      // (au montage : ce qui est déjà dessiné, d'après rien, se refait d'après lui, sans fondu)
      const premier = !this.mondeEtat, avant = this.mondeEtat || { pris: new Set(), cueillis: new Set() };
      this.mondeEtat = { pris, cueillis };
      if (!this.mondeOccupe) this.mondeOccupe = new Set();
      const change = [];
      for (const id of pris) if (!avant.pris.has(id)) change.push(id);
      for (const id of avant.pris) if (!pris.has(id)) change.push(id);
      for (const id of cueillis) if (!avant.cueillis.has(id)) change.push(id);
      for (const id of avant.cueillis) if (!cueillis.has(id)) change.push(id);
      if (!change.length) return;
      const cases = new Set(), W = this.grid.cols, genres = this.mondeGenres();
      for (const id of change) {
        if (this.mondeOccupe.has(id)) continue;           // (son geste le finira)
        const o = this.mondeObjets && this.mondeObjets.get(id);
        if (o) { this.mondeMontre(o, !premier && !reducedMotion()); continue; }
        const q = /^([a-z_]+):(-?\d+),(-?\d+)$/.exec(id);
        if (!q || genres.get(q[1]) !== 'basse') continue;
        const c = Math.floor(Number(q[2]) / T), r = Math.floor((Number(q[3]) - 1) / T);
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) cases.add((r + dy) * W + c + dx);
      }
      if (cases.size) this.mondeRepeint(cases);
      this.sunDirty = true;
      if (this.fermier && this.fermier.regrid) this.fermier.regrid();
    },

    // Le moteur vient de prendre (ou de cueillir) la pièce `id` : la scène le sait tout de suite,
    // sans attendre le modèle (la vue peut se rafraîchir un peu plus tard).
    mondeNote(id, cueilli) {
      if (!this.mondeEtat) this.mondeEtat = { pris: new Set(), cueillis: new Set() };
      this.mondeEtat[cueilli ? 'cueillis' : 'pris'].add(id);
    },

    // Repeint ces cases du monde (les petites pièces prises ou revenues), et dit combien de temps
    // ça a pris (this.mondeMesures : pour la fiche, les durées d'une repeinture).
    mondeRepeint(cases) {
      const t0 = performance.now();
      this.repaintCells(cases);
      (this.mondeMesures || (this.mondeMesures = { coups: [], repeint: [] })).repeint.push(performance.now() - t0);
    },

    // L'image `o` d'une pièce (vegetation.js) d'après le modèle : cachée si elle est prise, son
    // dessin sans fruits si elle est cueillie. `fondu` : une pièce qui revient apparaît doucement.
    mondeMontre(o, fondu) {
      if (!o.img || !o.img.active) return;
      const E = this.mondeEtat;
      const pris = !!E && E.pris.has(o.id), cueilli = !!E && E.cueillis.has(o.id);
      const n = o.pl.images[o.code][(cueilli && o.regle.apres != null ? o.regle.apres : o.v) * (o.herbe ? 5 : 1)];
      if (n != null && o.img.frame.name !== n) { o.img.setFrame(n); if (o.herbe) o.herbe.base = n; }
      if (pris === !o.img.visible) return;
      this.tweens.killTweensOf(o.img);
      o.img.setVisible(!pris).setAlpha(1).setAngle(0).setScale(1);
      o.alpha = 1;
      if (!pris && fondu) {
        o.anim = true;
        o.img.setAlpha(0);
        this.tweens.add({ targets: o.img, alpha: 1, duration: CHUTE.repousse, onComplete: () => { o.anim = false; } });
      }
    },

    /* ---------- l'appui ---------- */

    // La pièce du monde sous le doigt en (wx, wy) qui se prend avec ce qu'il a en main (la hache,
    // la pioche, la faux ; à la main : ce qui se cueille, se ramasse), ou null. Les grandes d'abord
    // (la plus en avant dont l'image a un pixel là), puis la petite la plus proche.
    mondeObjetAt(wx, wy) {
      if (!this.ctx.monde || !this.mondeObjets) return null;
      const m = this.ctx.lastModel || {};
      const peut = (regle) => {
        const g = regle.geste;
        return g === 'cueillir' || g === 'ramasser' || (g === 'couper' && !!m.hache) || (g === 'casser' && !!m.pioche) || (g === 'faucher' && !!m.faux);
      };
      const E = this.mondeEtat, occupe = this.mondeOccupe || new Set();
      const min = (MIN_TAP * pixelRatio()) / this.cameras.main.zoom / 2;
      let best = null;
      for (const o of this.mondeObjets.values()) {
        if (!o.img.visible || o.anim || occupe.has(o.id) || !peut(o.regle)) continue;
        if (wx < o.x || wx >= o.x + o.w || wy < o.y || wy >= o.y + o.h + 2) {
          // (une petite image : la zone d'appui agrandie, comme celle d'un caillou)
          if (o.w * o.h > 400 || Math.abs(wx - o.fx) > min * 0.6 || Math.abs(wy - (o.fy - o.h / 2)) > Math.max(o.h / 2, min * 0.6)) continue;
        } else if (o.mask) {
          const k = o.mask, cx = ((wx - o.x) / k.M) | 0, cy = Math.min(k.mh - 1, ((wy - o.y) / k.M) | 0);
          if (!k.cases[cy * k.mw + cx] && o.w * o.h > 400) continue;
        }
        if (!best || o.foot > best.foot) best = o;
      }
      if (best) return { o: best, regle: best.regle, x: best.fx, y: best.fy, id: best.id, variante: best.v };
      // les petites pièces peintes dans le sol des régions dessinées
      const V = this.vegetationPrete && this.vegetationPrete();
      if (!V) return null;
      let bd = Infinity, petite = null;
      const r0 = Math.max(10, min * 0.7);
      for (const r of this.shownRegions()) {
        const reg = r.vegReg;
        if (!reg) continue;
        for (const P of V.planches) {
          const b = reg[P.donnees] && reg[P.donnees].basses;
          if (!b) continue;
          for (let k = 0; k < b.length; k += 4) {
            const regle = P.regles[b[k]];
            if (!regle || !peut(regle)) continue;
            const x = b[k + 1], y = b[k + 2], d = Math.hypot(wx - x, wy - (y - 4));
            if (d > r0 || d >= bd) continue;
            const id = this.ctx.monde.idObjet(P.sortes[b[k]].nom, x, y);
            if ((E && E.pris.has(id)) || occupe.has(id)) continue;
            bd = d;
            petite = { o: null, regle, x, y, id, variante: b[k + 3], planche: P, code: b[k] };
          }
        }
      }
      return petite;
    },

    // Le geste qui convient à la pièce touchée `h` (mondeObjetAt) ; `fort` : le coup fort.
    mondeAgir(h, fort) {
      if (!h || (this.ctx.lastModel && this.ctx.lastModel.coucher)) return;   // au lit (ou en y allant) : rien
      const g = h.regle.geste;
      if (g === 'couper') this.mondeCouper(h, fort);
      else if (g === 'casser') this.mondeCasser(h, fort);
      else if (g === 'faucher') this.mondeFaucher(h);
      else this.mondePrendre(h);
    },

    // Le pont : le coup ou la prise, comptés par le moteur (js/ui/outils.js, mondeFromStage), et sa
    // durée (this.mondeMesures.coups : le moteur, la sauvegarde, la vue rafraîchie).
    mondeDemande(h, o) {
      const B = this.ctx.bridge;
      if (!B || !B.recolte) return null;
      const t0 = performance.now();
      const got = B.recolte(h.id, Object.assign({ variante: h.variante, depuis: this.persoCase ? this.persoCase() : -1 }, o));
      (this.mondeMesures || (this.mondeMesures = { coups: [], repeint: [] })).coups.push(performance.now() - t0);
      return got;
    },

    /* ---------- la hache ---------- */

    mondeCouper(h, fort) {
      const o = h.o, foot = { x: h.x, y: h.y };
      const arbre = o.genre === 'arbre' || o.nom === 'sapin_neige';
      const dx = arbre ? 11 : Math.max(9, Math.round(o.w / 2) + 2);
      const p = this.strikeSide(foot, dx), dir = p.x > foot.x ? -1 : 1;
      const ou = this.piecePoints(foot, p, arbre ? dir : null);
      this.mondeOccupe.add(o.id);
      const got = this.holdPieces(() => this.mondeDemande(h, { ou, fort: !!fort }));
      if (!got || !got.tombe) this.mondeOccupe.delete(o.id);
      if (!got) return;
      const M2 = got.morceaux || { coup: [], fin: [] };
      this.time.delayedCall(FILET_MS, () => this.revealPieces(M2.coup));
      o.queued = (o.queued || 0) + 1;
      if (got.tombe) {
        this.mondeNote(o.id, false);
        o.tombe = { dir, fin: M2.fin, arbre };
        if (o.filet) o.filet.remove();
        o.filet = this.time.delayedCall(FILET_MS, () => { if (o.tombe) this.mondeAbat(o, false); });
      }
      const hit = () => {
        o.queued = Math.max(0, o.queued - 1);
        this.revealPieces(M2.coup);
        K.vibre(fort ? 'fort' : 'hache');
        if (fort) K.secousse(this, 'fort');
        if (o.tombe && !o.queued) { this.mondeAbat(o, true); return; }
        this.mondeTremble(o);
      };
      if (!this.fermier || !this.fermier.chop(foot, hit, dx)) hit();
    },

    // La pièce tremble d'un pixel sous le coup.
    mondeTremble(o) {
      if (!o.img || !o.img.active || reducedMotion() || o.tremble) return;
      o.tremble = true;
      const xs = [1, -1, 1, -1, 0];
      let k = 0;
      const timer = this.time.addEvent({
        delay: 60, repeat: xs.length - 1,
        callback: () => {
          if (o.img && o.img.active) o.img.x = o.fx + xs[k];
          k += 1;
          if (k >= xs.length) { o.tremble = false; timer.remove(); }
        },
      });
    },

    // Le dernier coup de hache : l'arbre bascule autour de son pied, du côté opposé au
    // personnage, rebondit au sol en lâchant ses feuilles, puis s'efface (comme ceux de la ferme,
    // hache.js fellTree) ; un buisson, une souche, un tronc couché partent en feuilles et en copeaux.
    // `calme` : la vue ne tremble pas (un habitant l'abat, js/carte/ferme/habitants.js).
    mondeAbat(o, anim, calme) {
      const t = o.tombe;
      if (!t) return;
      o.tombe = null;
      if (o.filet) { o.filet.remove(); o.filet = null; }
      const fin = () => {
        this.revealPieces(t.fin);
        this.mondeOccupe.delete(o.id);
        o.anim = false;
        if (o.img && o.img.active) o.img.setVisible(false).setAngle(0).setAlpha(1).setScale(1).setPosition(o.fx, o.fy);
        this.mondeMontre(o, false);
        this.sunDirty = true;
        if (this.fermier && this.fermier.regrid) this.fermier.regrid();
      };
      if (!anim || reducedMotion() || !o.img || !o.img.active) { fin(); return; }
      const box = { x0: o.x + 2, x1: o.x + o.w - 2, y0: o.y + 2, y1: o.fy };
      if (!t.arbre) {
        this.spawnShards({ box }, CHUTE.feuilles, true, null, CHUTE.couleurs);
        fin();
        return;
      }
      o.anim = true;
      // (il penche déjà un peu : son ombre s'en va, un arbre qui penche n'en porte pas, soleil.js)
      const img = o.img.setAlpha(1).setAngle(t.dir * 0.5);
      this.sunDirty = true;
      this.tweens.add({
        targets: img, angle: t.dir * CHUTE.angle, duration: CHUTE.ms, ease: 'Quad.easeIn',
        onComplete: () => {
          // il touche le sol : feuilles et copeaux, un petit rebond, puis il s'efface
          const len = o.fy - o.y, x0 = t.dir > 0 ? o.fx + len * 0.25 : o.fx - len;
          this.spawnShards({ box: { x0, x1: x0 + len * 0.75, y0: o.fy - 10, y1: o.fy + 2 } }, CHUTE.feuilles, true, null, CHUTE.couleurs);
          if (!calme) K.secousse(this, 'chute');
          this.revealPieces(t.fin);
          t.fin = null;
          this.tweens.add({
            targets: img, angle: t.dir * (CHUTE.angle - CHUTE.rebond), duration: CHUTE.rebondMs, yoyo: true, ease: 'Sine.easeOut',
            onComplete: () => this.tweens.add({ targets: img, alpha: 0, delay: CHUTE.repos, duration: CHUTE.fondu, onComplete: fin }),
          });
        },
      });
    },

    /* ---------- la pioche ---------- */

    mondeCasser(h, fort) {
      const o = h.o, foot = { x: h.x, y: h.y }, half = Math.round(o.w / 2);
      const ou = this.piecePoints(foot, this.strikeSide(foot, Math.max(8, half + 5)), null);
      this.mondeOccupe.add(o.id);
      const got = this.holdPieces(() => this.mondeDemande(h, { ou, fort: !!fort }));
      if (!got || !got.casse) this.mondeOccupe.delete(o.id);
      if (!got) return;
      const M2 = got.morceaux || { coup: [], fin: [] };
      this.time.delayedCall(FILET_MS, () => this.revealPieces(M2.coup));
      o.queued = (o.queued || 0) + 1;
      if (got.casse) {
        this.mondeNote(o.id, false);
        o.brise = { fin: M2.fin };
        if (o.filet) o.filet.remove();
        o.filet = this.time.delayedCall(FILET_MS, () => { if (o.brise) this.mondeBrise(o, false); });
      }
      const box = { x0: o.x + 1, x1: o.x + o.w - 1, y0: o.y + 1, y1: o.fy };
      const hit = () => {
        o.queued = Math.max(0, o.queued - 1);
        this.revealPieces(M2.coup);
        K.secousse(this, fort ? 'fort' : 'coup');
        K.vibre(fort ? 'fort' : 'pioche');
        if (o.brise && !o.queued) { this.mondeBrise(o, true); return; }
        this.mondeTremble(o);
        const p = this.fermier && this.fermier.pos();
        this.spawnShards({ box }, ROCKS.shards, false, p ? p.x : null);
      };
      if (!this.fermier || !this.fermier.mine(foot, half, hit)) hit();
    },

    // Le dernier coup de pioche : une gerbe d'éclats, le rocher s'affaisse et s'efface (pioche.js).
    mondeBrise(o, anim) {
      const b = o.brise;
      if (!b) return;
      o.brise = null;
      if (o.filet) { o.filet.remove(); o.filet = null; }
      this.revealPieces(b.fin);
      const fin = () => {
        this.mondeOccupe.delete(o.id);
        o.anim = false;
        if (o.img && o.img.active) o.img.setVisible(false).setScale(1).setAlpha(1).setPosition(o.fx, o.fy);
        this.mondeMontre(o, false);
        this.sunDirty = true;
        if (this.fermier && this.fermier.regrid) this.fermier.regrid();
      };
      if (!anim || reducedMotion() || !o.img || !o.img.active) { fin(); return; }
      this.spawnShards({ box: { x0: o.x + 1, x1: o.x + o.w - 1, y0: o.y + 1, y1: o.fy } }, ROCKS.burst, true);
      o.anim = true;
      this.tweens.add({ targets: o.img, scaleY: 0.35, scaleX: 1.15, alpha: 0, duration: ROCKS.breakMs, ease: 'Quad.easeIn', onComplete: fin });
    },

    /* ---------- la faux, la main ---------- */

    // Une image passagère de la petite pièce `h` (peinte dans le sol) : elle s'en va avec le geste.
    mondeImagePetite(h) {
      const P = h.planche, n = P && P.images[h.code][h.variante], c = n != null ? P.cadres[n] : null;
      if (!c) return null;
      return this.add.image(h.x, h.y, P.cle, n).setOrigin(c.px / c.w, c.py / c.h).setDepth(h.y);
    },

    mondeFaucher(h) {
      const foot = { x: h.x, y: h.y }, o = h.o;
      const ou = { carte: 'ferme', coup: [{ x: h.x + 3, y: h.y + 1 }], fin: [] };
      this.mondeOccupe.add(h.id);
      const got = this.holdPieces(() => this.mondeDemande(h, { ou }));
      if (!got) { this.mondeOccupe.delete(h.id); return; }
      this.mondeNote(h.id, false);
      const M2 = got.morceaux || { coup: [], fin: [] };
      // (la petite pièce : une image passagère par-dessus le sol repeint)
      const img = o ? o.img : this.mondeImagePetite(h);
      let fait = false;
      const fin = () => {
        if (fait) return;
        fait = true;
        this.revealPieces(M2.coup);
        this.mondeOccupe.delete(h.id);
        if (o) { o.anim = false; o.img.setScale(1).setAlpha(1); this.mondeMontre(o, false); } else if (img) img.destroy();
      };
      if (!o) this.mondeSync(h);
      this.time.delayedCall(FILET_MS, fin);
      const hit = () => {
        K.vibre('ramasse');
        if (!img || reducedMotion()) { fin(); return; }
        if (o) o.anim = true;
        this.spawnShards({ box: { x0: h.x - 5, x1: h.x + 5, y0: h.y - 10, y1: h.y } }, 6, true, null, VERTS);
        this.tweens.add({ targets: img, scaleY: 0.2, alpha: 0, duration: 220, ease: 'Quad.easeIn', onComplete: fin });
      };
      if (!this.fermier || !this.fermier.scythe(foot, hit)) hit();
    },

    // La petite pièce prise : ses cases repeintes sans elle tout de suite (le modèle a changé
    // pendant le geste : syncMonde l'a laissée à son geste).
    mondeSync(h) {
      const W = this.grid.cols, c = Math.floor(h.x / T), r = Math.floor((h.y - 1) / T), cases = new Set();
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) cases.add((r + dy) * W + c + dx);
      this.mondeRepeint(cases);
    },

    // À la main : le personnage va à côté, se baisse ; le moteur met ce qu'il prend dans
    // l'inventaire au moment du geste ; la pièce monte un peu et s'efface (un roncier reste là,
    // sans ses mûres), la bulle « +2 » au-dessus de lui.
    mondePrendre(h) {
      if (this.mondeOccupe.has(h.id)) return;
      this.mondeOccupe.add(h.id);
      const o = h.o;
      const prendre = () => {
        const got = this.mondeDemande(h, {});
        if (!got) { this.mondeOccupe.delete(h.id); return; }
        this.mondeNote(h.id, h.regle.geste === 'cueillir');
        this.showGain(got.items);
        K.vibre('ramasse');
        if (h.regle.geste === 'cueillir') {
          this.mondeOccupe.delete(h.id);
          if (o) {
            this.mondeMontre(o, false);
            if (!reducedMotion()) this.spawnShards({ box: { x0: o.x + 4, x1: o.x + o.w - 4, y0: o.y + 2, y1: o.fy - 4 } }, 5, true, null, VERTS);
          }
          return;
        }
        const img = o ? o.img : this.mondeImagePetite(h);
        if (!o) this.mondeSync(h);
        const fin = () => {
          this.mondeOccupe.delete(h.id);
          if (o) { o.anim = false; if (o.img.active) o.img.setPosition(o.fx, o.fy).setAlpha(1); this.mondeMontre(o, false); } else if (img) img.destroy();
        };
        if (!img || reducedMotion()) { fin(); return; }
        if (o) o.anim = true;
        this.tweens.add({ targets: img, y: img.y - 6, alpha: 0, duration: 260, ease: 'Sine.easeOut', onComplete: fin });
      };
      if (!this.fermier || !this.fermier.gather({ x: h.x, y: h.y }, prendre)) prendre();
    },

    // Le coup fort (coupfort.js) dans le monde : la pièce la plus proche du personnage qui se coupe
    // (la hache) ou se casse (la pioche), à moins de `portee` px, ou null.
    mondeProche(geste, p, portee) {
      let best = null, bd = portee;
      for (const o of (this.mondeObjets || new Map()).values()) {
        if (o.regle.geste !== geste || !o.img.visible || o.anim || this.mondeOccupe.has(o.id)) continue;
        const d = Math.hypot(o.fx - p.x, o.fy - p.y);
        if (d <= bd) { best = o; bd = d; }
      }
      return best ? { o: best, regle: best.regle, x: best.fx, y: best.fy, id: best.id, variante: best.v } : null;
    },
  });
})(window);
