/* carte/ferme/bac.js — la scène de la ferme : le bac du port (le chantier « l'île à bâtir », fiche I1c).
 *
 * Le moteur dit quand il est à quai (js/engine/bac.js : un jour de bac, de PORT.BAC.HEURES[0] à HEURES[1] h) et
 * combien de caisses attendent sur le quai (ce qui a été vendu depuis son dernier départ) ; la page le met dans le
 * modèle (model.bac, js/ui/port.js bacModele : { aQuai, caisses, jour, heures }). Sa place vient du plan du port
 * (js/engine/monde-hameaux.js planPort : plan.bac, le long des quatre dernières cases du quai, du côté opposé à la
 * cale ; sa passerelle ; la place de ses caisses ; le large d'où il vient). Ses images sont celles de la planche des
 * hameaux (scripts/carte/port_bac.py : bac_port, passerelle_port, caisses_bac ; découpées par vegetation.js).
 * Ici :
 *   - à son heure, il arrive du large en glissant (PORT.BAC.ARRIVEE_S s, ctx.monde.portBac), se balance doucement à
 *     quai, sa passerelle posée ; à son départ, il repart vers le large ; la carte ouverte pendant qu'il est à quai,
 *     il y est d'un coup (« animations réduites » : il est là ou pas, sans glisser ni se balancer) ;
 *   - les caisses sur le quai : une, deux, trois (empilées), puis deux tas ; elles s'effacent quand il repart avec
 *     elles.
 * La cloche de son arrivée et le mot au joueur : la page (js/ui/port.js watchBac).
 *
 * Méthodes de la scène de la ferme (js/farm-stage.js), posées sur son prototype.
 */
(function (global) {
  'use strict';

  const F = global.FermeCarte;
  const { reducedMotion } = F;
  // la houle à quai : `amp` px, une période de `periode` ms ; la passerelle se pose quand il est arrivé à `pose` près
  const BAC = { amp: 0.7, periode: 2600, pose: 0.98, duree: 7 };

  F.partie({

    // Les images de la planche des hameaux pour une sorte : [numéro de l'image par variante], et la planche.
    bacImages(nom) {
      const V = this.vegetationPrete ? this.vegetationPrete() : null;
      const pl = V && V.planches.find((p) => p.cle === 'hameaux');
      if (!pl) return null;
      const k = pl.sortes.findIndex((s) => s.nom === nom);
      return k >= 0 ? { pl, images: pl.images[k] } : null;
    },

    // Une image de la planche des hameaux (sorte, variante), créée ou retournée, son pied en (x, y).
    bacImage(e, cle, nom, v, x, y, profondeur) {
      const I = this.bacImages(nom);
      const n = I && I.images[v];
      if (n === undefined || n === null) return null;
      const c = I.pl.cadres[n];
      let im = e[cle];
      if (!im) im = e[cle] = this.add.image(x, y, I.pl.cle, n).setOrigin(c.px / c.w, c.py / c.h);
      else if (im.frame.name !== n) im.setFrame(n).setOrigin(c.px / c.w, c.py / c.h);
      im.setPosition(x, y).setDepth(profondeur).setVisible(true);
      return im;
    },

    bacCacher(e, cles) {
      for (const k of cles) if (e[k]) e[k].setVisible(false);
    },

    // À chaque image : le bac (arrivée, houle, départ), sa passerelle, les caisses du quai.
    stepBac() {
      const m = this.ctx.lastModel && this.ctx.lastModel.bac;
      const plan = m ? this.hameauxPlans().find((p) => p.batisse === 'port') : null;
      const B = plan && plan.bac;
      const e = this.bacEtat || (this.bacEtat = { t: null, caisses: 0 });
      if (!m || !B || !this.bacImages('bac_port')) {
        this.bacCacher(e, ['coque', 'passerelle', 'caisses0', 'caisses1']);
        return;
      }
      const calme = reducedMotion(), but = m.aQuai ? 1 : 0;
      const duree = (this.ctx.monde && this.ctx.monde.portBac && this.ctx.monde.portBac.ARRIVEE_S) || BAC.duree;
      // (la carte ouverte pendant qu'il est à quai : il y est déjà ; sinon il glisse à l'horloge réelle, quelle que soit
      // la cadence des images)
      const now = performance.now();
      if (e.t === null || calme) { e.t = but; e.but = but; }
      else {
        if (e.but !== but) { e.but = but; e.t0 = e.t; e.debut = now; }
        if (e.t !== but) {
          const pas = (now - e.debut) / 1000 / duree;
          e.t = but > e.t0 ? Math.min(1, e.t0 + pas) : Math.max(0, e.t0 - pas);
        }
      }
      // les caisses : celles du modèle ; quand il repart avec elles, elles s'effacent avec lui
      if (m.caisses > 0) { e.caisses = m.caisses; e.alphaCaisses = 1; } else if (!m.aQuai && e.t > 0 && e.caisses) e.alphaCaisses = e.t;
      else { e.caisses = 0; }
      if (e.t <= 0) this.bacCacher(e, ['coque', 'passerelle']);
      else {
        // (il glisse du large à quai : vite au départ, il ralentit en approchant)
        const f = 1 - Math.pow(1 - e.t, 3), houle = calme ? 0 : BAC.amp * Math.sin(performance.now() / BAC.periode * 2 * Math.PI);
        const x = B.x + B.large.dx * (1 - f), y = B.y + B.large.dy * (1 - f) + houle;
        const coque = this.bacImage(e, 'coque', 'bac_port', B.sens, Math.round(x), Math.round(y), B.y);
        if (coque) coque.setAlpha(Math.min(1, e.t * 4));
        if (e.t >= BAC.pose && m.aQuai) this.bacImage(e, 'passerelle', 'passerelle_port', B.sens, B.passerelle.x, B.passerelle.y + Math.round(houle * 0.5), B.y + 0.5);
        else this.bacCacher(e, ['passerelle']);
      }
      // une caisse : variante 0 ; deux : 1 ; trois : 2 ; quatre : deux tas (2 et 0)
      const tas = e.caisses >= 4 ? [2, 0] : e.caisses >= 1 ? [Math.min(2, e.caisses - 1)] : [];
      for (let k = 0; k < 2; k++) {
        const cle = 'caisses' + k, place = B.caisses[k];
        if (k >= tas.length || !place) { this.bacCacher(e, [cle]); continue; }
        const im = this.bacImage(e, cle, 'caisses_bac', tas[k], place.x, place.y, place.y);
        if (im) im.setAlpha(e.alphaCaisses ?? 1);
      }
    },
  });
})(window);
