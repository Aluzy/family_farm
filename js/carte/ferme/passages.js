/* carte/ferme/passages.js — la scène de la ferme : l'entrée de la mine (et le retour des grottes
 * de la montagne du grand monde : js/carte/ferme/lieux-monde.js).
 *
 * Le tas de terre de la mine : le personnage passe sa porte (vers les niveaux de la grotte,
 * js/grotte.js), et en revient (il sort de la porte et descend devant).
 *
 * Méthodes de la scène de la ferme (js/farm-stage.js), posées sur son prototype : `this` est la
 * scène, `this.ctx` ce que la page lui a donné au montage (voir docs/architecture-phaser.md).
 */
(function (global) {
  'use strict';

  const F = global.FermeCarte;
  const { MINE, T } = F.C;

  F.partie({

    // Revenu de la mine (jeu.html?arrivee=mine) : il sort de sa porte, la vue sur lui ; d'une
    // grotte de la montagne (jeu.html?arrivee=grotte_<n>) : devant son entrée, dans le monde.
    // Sinon : là où il était quand on a quitté la partie ou rechargé la page (makeRetour).
    makeArrivee() {
      const params = new URLSearchParams(global.location.search), ou = params.get('arrivee');
      if (ou === 'mine' || /^grotte_\d+$/.test(ou || '')) this.arrive(ou);
      else this.makeRetour();
      this.positionLue = true;
    },

    // La partie reprise, la page rechargée : il réapparaît là où il était (la position notée par stepPosition,
    // js/ui/position.js ; rien de noté : il sort de sa porte, comme avant), la vue sur lui. Dans le grand monde,
    // la région où il était n'est souvent pas encore faite (le Web Worker la calcule) : ses cases semblent
    // toutes fermées, et il serait ressorti de sa porte. Il y est posé quand même, exactement ; quand la région
    // arrive, sa case est vérifiée (stepRetour).
    makeRetour() {
      const B = this.ctx.bridge, p = B && B.positionGardee ? B.positionGardee() : null;
      if (!p || !this.fermier || !this.fermier.arrive) return;
      let at = this.fermier.arrive(p.x, p.y);
      if (!at) {
        at = this.fermier.arrive(p.x, p.y, null, true);
        if (at) this.retourAttendu = { t: global.performance.now() };
      }
      if (at) this.setCentre(at.x, at.y);
    },

    // La région où il a été posé à la reprise est-elle faite ? Alors, sa case libre (sinon la plus proche :
    // une pièce posée là depuis) ; au plus 20 s d'attente. → true tant qu'elle n'est pas là.
    stepRetour() {
      if (!this.retourAttendu) return false;
      const M = this.ctx.monde, p = this.fermier && this.fermier.pos ? this.fermier.pos() : null, N = global.CarteKit.REGION.tuiles;
      if (!M || !p || !N || global.performance.now() - this.retourAttendu.t > 20000) { this.retourAttendu = null; return false; }
      if (!M.region(Math.floor(p.x / T / N), Math.floor((p.y - 1) / T / N))) return true;
      this.retourAttendu = null;
      const libre = this.fermier.librePres ? this.fermier.librePres(p.x, p.y) : null;
      if (libre && (libre.x !== p.x || libre.y !== p.y)) this.fermier.arrive(libre.x, libre.y);
      return false;
    },

    // Chaque image : sa position notée (au plus une fois par seconde ; seulement ce qui change) : ses pieds,
    // ou null s'il est rentré chez lui ou monté à l'étage (il repartira alors de sa porte). Pas tant que sa
    // place de la reprise attend sa région (stepRetour).
    stepPosition(time) {
      const B = this.ctx.bridge;
      if (this.stepRetour()) return;
      if (!this.positionLue || !B || !B.positionNoter || !this.fermier || !this.fermier.pos) return;
      if (this.positionA && time - this.positionA < 1000) return;
      this.positionA = time;
      const p = this.fermier.pos(), haut = this.etageLift ? this.etageLift() > 0 : false;
      B.positionNoter(p && !haut ? { x: p.x, y: p.y } : null);
    },

    // Revenu de la mine : devant sa porte, la vue sur lui (l'adresse perd ?arrivee=…) ; d'une grotte
    // de la montagne : devant son entrée (lieux-monde.js, arriveGrotte).
    arrive(ou) {
      const params = new URLSearchParams(global.location.search);
      params.delete('arrivee');
      const q = params.toString();
      global.history.replaceState(null, '', global.location.pathname + (q ? '?' + q : '') + global.location.hash);
      if (/^grotte_\d+$/.test(ou || '')) { this.arriveGrotte(ou); return; }
      const m = this.mineDoor();
      const at = m && this.fermier && this.fermier.arrive ? this.fermier.arrive(m.x, m.y + MINE.arrive, { x: m.x, y: m.y - MINE.seuil }) : null;
      if (at) this.setCentre(at.x, at.y);
    },

    // Devant la porte de la mine, poussé vers elle (au doigt, aux flèches), il y entre.
    stepMine() {
      const at = this.fermier && this.fermier.pos ? this.fermier.pos() : null;
      const dir = at && this.manette ? this.manette.dir() : null;
      if (dir && dir.y < -0.6 && Math.abs(dir.x) < 0.6 && this.nearMine(at)) this.enterMine();
    },

    /* ---------- l'entrée de la mine ---------- */

    // Le pied de la porte de la mine (le milieu du bas de son rectangle, px), ou null (pas de
    // mine sur cette carte).
    mineDoor() {
      const o = this.objects && this.objects[MINE.object];
      return o ? { x: o.x + o.width / 2, y: o.y + o.height } : null;
    },

    // Le personnage en `at` est-il tout près de la porte, juste devant ?
    nearMine(at) {
      const m = this.mineDoor();
      return !!m && Math.abs(at.x - m.x) <= MINE.near && at.y >= m.y - 4 && at.y - m.y <= MINE.near;
    },

    // Il entre dans la mine : il va devant la porte, la passe en s'effaçant, puis la carte
    // change (la mine). Une fois seulement (`this.enMine`) ; la mine qui ne s'ouvre pas : il
    // ressort.
    enterMine() {
      const m = this.mineDoor();
      if (!m || this.enMine || !this.fermier || !this.fermier.entre) return;
      this.enMine = true;
      if (global.FermeSon) global.FermeSon.joue('porte_ouvre', { x: m.x, y: m.y });
      this.fermier.entre({ x: m.x, y: m.y + MINE.arrive }, { x: m.x, y: m.y - MINE.seuil }, () => {
        this.enMine = false;
        if (global.FermeHote) global.FermeHote.go(MINE.page);
        if (!global.document.body.classList.contains('en-excursion')) this.arrive('mine');
      });
    },

    // Un double appui en (wx, wy) sur le tas de la mine : le personnage y va et y entre (true :
    // l'appui est pris ; false : pas sur la mine).
    askMine(wx, wy) {
      const o = this.objects && this.objects[MINE.object];
      if (!o || wx < o.x || wx > o.x + o.width || wy < o.y || wy > o.y + o.height) return false;
      this.enterMine();
      return true;
    },
  });
})(window);
