/* carte/ferme/villageois-travail.js — la scène de la ferme : les villageois au travail (le chantier « l'île à bâtir »,
 * fiche I3c ; la scène des villageois : villageois.js, leur vie sociale : villageois-social.js).
 *
 * Le moteur fait le travail à l'heure (js/engine/taches.js) et la journée donne à celui qui travaille des segments
 * « travail » (js/engine/villageois-journee.js : seg.but = { sorte: 'travail', tache, cle, avec, geste, emoji }, à son
 * poste : un lieu « devant », tourné vers ce qu'il travaille) ; le modèle de la carte porte, pour chacun, ce qu'il a
 * fait aujourd'hui (modèle.villageois[].travail : { tache, actions, emoji, geste, outil }). Ici, ce qu'on en voit, dans
 * la vue seulement :
 *
 *   - arrivé à son poste, il fait le geste de sa tâche en boucle (les gestes des habitants des hameaux, les mêmes cases
 *     des planches de personnages : la hache, la pioche, la faux, la canne, l'arrosoir, se baisser, remuer la marmite ;
 *     CarteKit.GESTES_HABITANTS, habitants.js), tourné vers ce qu'il travaille (de profil pour la hache, la pioche et la
 *     faux), une courte pause entre deux ;
 *   - chaque action que le moteur compte pendant qu'on le regarde fait monter l'emoji de ce qu'elle donne (🪵 🪨 🐟…) :
 *     rien n'est compté ici (la règle de la fiche 7b : ce qui se passe sous les yeux du joueur compte une fois) ;
 *   - deux camarades au même poste (la même clé) causent de temps en temps (villageois-social.js, les causeries : une
 *     réplique de SOCIAL.REPLIQUES.travail toutes les TACHES.CAUSE s) : le temps d'une bulle, il pose son outil et se
 *     tourne vers l'autre, puis reprend.
 *
 * Méthodes de la scène de la ferme (js/farm-stage.js), posées sur son prototype.
 */
(function (global) {
  'use strict';

  const K = global.CarteKit;
  const F = global.FermeCarte;
  const { T } = F.C;
  const { reducedMotion } = F;
  const PAUSE = [0.4, 1.6];                     // s entre deux gestes
  const DE_PROFIL = new Set(['hache', 'pioche', 'faux']);
  const EMOJI_MS = 1600;

  F.partie({

    // Arrivé à son poste (villageoisAuBut) : il se met au travail, tourné vers ce qu'il travaille.
    villageoisAuTravail(m) {
      const but = m.seg && m.seg.but, lieu = m.seg && m.seg.lieu;
      if (!but || but.sorte !== 'travail') return false;
      const W = this.grid.cols, v = lieu && Number.isInteger(lieu.vers) ? lieu.vers : null;
      let face = 'bas', flip = false;
      if (v !== null) {
        const dx = (v % W) * T + T / 2 - m.x, dy = (Math.floor(v / W) + 1) * T - 2 - m.y;
        ({ face, flip } = DE_PROFIL.has(but.geste) ? K.regard(dx || (m.h() < 0.5 ? -1 : 1), 0) : K.regard(dx, dy));
      }
      m.face = face; m.flip = flip;
      m.travail = { geste: but.geste || 'ramasse', face, flip, seq: null, k: 0, t: 0, pause: m.h() * PAUSE[1] };
      return true;
    },

    // Son image au travail (villageoisImage) : le nom de la case, ou null (il ne fait pas de geste cette image : il
    // parle, il marche).
    villageoisGesteImage(m, dt) {
      const w = m.travail, G = K.GESTES_HABITANTS;
      if (!w || !G || m.marchait || m.assis || m.couche) return null;
      // (il cause : outil posé, tourné vers l'autre)
      if (m.bulle || m.parle || m.salut) { w.seq = null; return null; }
      m.face = w.face; m.flip = w.flip;
      if (reducedMotion()) return null;
      if (!w.seq) {
        w.pause -= dt;
        if (w.pause > 0) return null;
        const vue = w.face === 'cote' ? 'cote' : w.face;
        const f = G[w.geste] || G.ramasse;
        w.seq = f(vue);
        w.k = 0; w.t = 0;
      }
      const pas = w.seq[w.k];
      w.t += dt;
      if (w.t >= pas[1]) {
        w.t = 0;
        w.k += 1;
        if (w.k >= w.seq.length) { w.seq = null; w.pause = PAUSE[0] + m.h() * (PAUSE[1] - PAUSE[0]); return w.geste === 'peche' ? `peche_${w.face === 'cote' ? 'cote' : w.face}_0` : null; }
      }
      return w.seq[w.k][0];
    },

    // À chaque image (stepVillageois) : une action comptée par le moteur pendant qu'on le regarde, l'emoji de ce
    // qu'elle donne au-dessus de lui.
    villageoisTravailPas() {
      const L = this.ctx.lastModel && this.ctx.lastModel.villageois;
      if (!L || !this.villageoisVus) return;
      for (const v of L) {
        const m = this.villageoisVus.get(v.id), tr = v.travail;
        if (!m || !tr) continue;
        const n = tr.actions | 0;
        if (m.vuActions === undefined || n < m.vuActions) { m.vuActions = n; continue; }
        if (n === m.vuActions) continue;
        m.vuActions = n;
        if (m.travail && m.s && m.s.visible && !m.couche && this.villageoisEmoji) this.villageoisEmoji(m, tr.emoji || '✨', EMOJI_MS);
      }
    },
  });
})(window);
