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
 *     faux), une courte pause entre deux ; un geste assis (I5b : « filer », au rouet de la mercerie) le garde assis
 *     entre deux gestes et quand il cause ;
 *   - chaque action que le moteur compte pendant qu'on le regarde fait monter l'emoji de ce qu'elle donne (🪵 🪨 🐟…) :
 *     rien n'est compté ici (la règle de la fiche 7b : ce qui se passe sous les yeux du joueur compte une fois) ;
 *   - aux champs, chaque action du moteur sur une parcelle (travail.champs : « recolter:<case> »…) : il marche jusqu'à
 *     elle et fait le bon geste (se pencher pour récolter et semer, l'arrosoir) ; la case garde son ancien dessin
 *     jusqu'au coup (js/fermier.js : la retenue d'un villageois, relacher), et le personnage du joueur ne refait pas ce
 *     geste (modèle.parVillageois) ;
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
  const DE_PROFIL = new Set(['hache', 'pioche', 'faux', 'forge', 'scie']);
  const ASSIS = new Set(['filer']);              // (I5b : les gestes qu'on fait assis : au rouet)
  const EMOJI_MS = 1600;

  F.partie({

    // Arrivé à son poste (villageoisAuBut) : il se met au travail, tourné vers ce qu'il travaille.
    villageoisAuTravail(m) {
      const but = m.seg && m.seg.but, lieu = m.seg && m.seg.lieu;
      if (!but || but.sorte !== 'travail') return false;
      // (aux champs : devant la parcelle où il fait son geste, villageoisChamp ; de profil, tourné vers elle)
      if (m.champ) {
        const fl = !!(m.but && m.but.pose && m.but.pose.flip);
        m.face = 'cote'; m.flip = fl;
        m.travail = { geste: m.champ.type === 'arroser' ? 'arrose' : 'plante', face: 'cote', flip: fl, seq: null, k: 0, t: 0, pause: 0.15, champ: m.champ };
        return true;
      }
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
      // (I5b : un geste assis, au rouet : il reste assis entre deux, et quand il cause)
      const assis = ASSIS.has(w.geste) ? `assis_${w.face === 'cote' ? 'cote' : w.face}_0` : null;
      // (il cause : outil posé, tourné vers l'autre)
      if (m.bulle || m.parle || m.salut) { w.seq = null; return assis; }
      m.face = w.face; m.flip = w.flip;
      if (reducedMotion()) return assis;
      if (!w.seq) {
        w.pause -= dt;
        if (w.pause > 0) return assis;
        const vue = w.face === 'cote' ? 'cote' : w.face;
        const f = G[w.geste] || G.ramasse;
        w.seq = f(vue);
        w.k = 0; w.t = 0;
      }
      const pas = w.seq[w.k];
      w.t += dt;
      // (aux champs : au coup de son geste, la parcelle prend son nouveau dessin)
      if (w.champ && !w.champ.fait && pas[2] === 'coup') {
        w.champ.fait = true;
        if (this.fermier && this.fermier.relacher) this.fermier.relacher(w.champ.case);
      }
      if (w.t >= pas[1]) {
        w.t = 0;
        w.k += 1;
        if (w.k >= w.seq.length) {
          w.seq = null;
          w.pause = PAUSE[0] + m.h() * (PAUSE[1] - PAUSE[0]);
          // (la parcelle faite : la suivante, s'il en attend une)
          if (w.champ && w.champ.fait && m.champs && m.champs.length) this.villageoisChampSuivant(m);
          return w.geste === 'peche' ? `peche_${w.face === 'cote' ? 'cote' : w.face}_0` : assis;
        }
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
      for (const v of L) {
        const m = this.villageoisVus.get(v.id), tr = v.travail;
        if (m) this.villageoisChamps(m, tr);
      }
    },

    // Aux champs : chaque action que le moteur a faite à une parcelle (modèle.villageois[].travail.champs :
    // « recolter:<case> », « arroser:<case> », « planter:<case> »), il va la faire sous nos yeux : il marche jusqu'à elle
    // et fait le geste (se pencher pour récolter et semer, l'arrosoir) ; la case garde son ancien dessin jusqu'au coup
    // (js/fermier.js : la retenue d'une case d'un villageois, relacher). Loin de la vue, pas au travail, avec les
    // animations réduites : la case change tout de suite.
    villageoisChamps(m, tr) {
      const F = this.fermier, n = tr ? Number(tr.champsN) || 0 : 0, l = (tr && tr.champs) || [];
      const lache = (c) => { if (F && F.relacher) F.relacher(c); };
      // (plus au travail, ou il a renoncé à son chemin : ce qui attendait se montre)
      // (un autre segment l'a envoyé ailleurs : m.but n'est plus celui de la parcelle)
      const ailleurs = m.champ && !m.champ.fait && m.but !== m.champ.but;
      if ((m.champ || (m.champs && m.champs.length)) && (!m.seg || m.seg.etat !== 'travail' || m.renonce || ailleurs)) {
        if (m.champ && !m.champ.fait) lache(m.champ.case);
        for (const q of m.champs || []) lache(q.case);
        m.champ = null; m.champs = [];
      }
      if (m.vuChamps === undefined || n < m.vuChamps) { m.vuChamps = n; return; }
      if (n === m.vuChamps) return;
      const neufs = l.slice(Math.max(0, l.length - (n - m.vuChamps)));
      m.vuChamps = n;
      for (const k of neufs) {
        const i = k.indexOf(':'), type = k.slice(0, i), c = Number(k.slice(i + 1));
        const vu = m.s && m.s.visible && m.seg && m.seg.etat === 'travail' && !m.couche && !m.assis && !reducedMotion() && F && F.retenue && F.retenue(c);
        if (!vu) { lache(c); continue; }
        (m.champs || (m.champs = [])).push({ type, case: c, fait: false });
      }
      if (m.champs && m.champs.length && (!m.champ || m.champ.fait)) this.villageoisChampSuivant(m);
    },

    // Il va à la parcelle suivante qui attend son geste : à sa gauche (tourné vers elle), sinon à sa droite.
    villageoisChampSuivant(m) {
      const q = m.champs && m.champs.shift();
      if (!q) return;
      m.champ = q;
      const W = this.grid.cols, x0 = (q.case % W) * T, y0 = Math.floor(q.case / W) * T, F = this.fermier;
      const ok = (p) => !F || !F.standable || F.standable(p.x, p.y);
      let p = { x: x0 - 2, y: y0 + 14, flip: false };
      if (!ok(p)) p = { x: x0 + T + 2, y: y0 + 14, flip: true };
      m.travail = null; m.auBut = false; m.chemin = []; m.puis = null;
      m.but = { x: p.x, y: p.y, pose: { genre: 'debout', face: 'cote', flip: p.flip } };
      q.but = m.but;
      if (Math.hypot(p.x - m.x, p.y - m.y) < 2) this.villageoisArrive(m);
      else m.demande = { x: p.x, y: p.y };
    },
  });
})(window);
