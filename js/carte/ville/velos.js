/* carte/ville/velos.js — la scène de la ville : les vélos des habitants.
 *
 * Les adultes de la ville qui n'ont pas de voiture (js/carte/ville/voitures.js) vont à vélo
 * (VELO ; assets/velo.png, scripts/personnage/velo.py) quand c'est plus court qu'à pied
 * (planVelo) : en bas de chez eux (ou à la porte du lieu d'où ils partent), ils montent sur leur
 * vélo, roulent sur le trottoir jusqu'à la rue la plus proche, suivent les rues au bord de la
 * chaussée (le chemin des voitures, trajetVoiture, VELO.ecart px du milieu) jusqu'à la rue la plus
 * proche de là où ils vont, rejoignent sa porte par le trottoir, descendent de vélo et entrent à
 * pied. À vélo, ils vont VELO.vitesse fois plus vite qu'à pied ; ils sont assis dessus (leurs
 * cases assis_<vue>, comme sur le triporteur : CarteKit.triporteur).
 *
 * Méthodes de la scène des cartes (js/ville-carte.js), posées sur son prototype : `this` est
 * la scène (voir docs/architecture-phaser.md).
 */
(function (global) {
  'use strict';

  const V = global.CarteVille;
  const K = global.CarteKit;
  const { T, VELO, IMMEUBLE } = V.C;
  const VIE = IMMEUBLE.vie;

  V.partie({

    // Le trajet à vélo de `a` à `b` : { pts (la route, trajetVoiture au bord de la chaussée),
    // duree (h : les bouts de trottoir estimés à vol d'oiseau, la route, une minute pour monter
    // et descendre) } ; null : pas de chemin.
    planVelo(a, b) {
      const pts = this.trajetVoiture(a, b, VELO.ecart);
      if (!pts) return null;
      const est = (p, q) => {
        const dx = Math.abs(p.x - q.x), dy = Math.abs(p.y - q.y);
        return (Math.max(dx, dy) + 0.414 * Math.min(dx, dy)) * 1.15;
      };
      let L = est(a, pts[0]) + est(pts[pts.length - 1], b);
      for (let i = 1; i < pts.length; i++) L += Math.abs(pts[i].x - pts[i - 1].x) + Math.abs(pts[i].y - pts[i - 1].y);
      return { pts, duree: L / (VIE.vitesse * VELO.vitesse) / VIE.sParHeure + 1 / 60 };
    },

    // La porte (dehors) du bâtiment où est le point `p` ; `p` lui-même s'il est dehors.
    porteDe(p) {
      const gx = Math.floor(p.x / T), gy = Math.floor((p.y - 1) / T);
      const im = (this.immeubles || []).find((q) => V.dansImmeuble(q, gx, gy));
      return im ? this.portesImm(im).sortie : p;
    },

    // `n` part à vélo vers le point `p` (du niveau `niv`) ; arrivé à la porte, il descend et prend
    // l'état `etat` (celui du trajet à pied : son arrivée se fait comme d'habitude). `plan` :
    // planVelo. false : il ira à pied.
    voyageVelo(n, p, niv, etat, plan) {
      if (!plan || !this.textures.exists(VELO.key)) return false;
      const avant = n.etat;
      n.etat = 'versVelo';
      n.velo = { plan, p, niv, etat, porte: this.porteDe(p) };
      // (dans un bâtiment : il en sort d'abord à pied, par sa porte)
      const depart = this.porteDe(n);
      if (depart !== n && !this.allerImm(n, depart, 0)) { n.etat = avant; n.velo = null; return false; }
      if (depart === n) { n.path = []; n.t = 0.01; }
      return true;
    },

    // Devant la porte : il monte sur son vélo et roule jusqu'à la porte d'arrivée (trottoir, rue,
    // trottoir).
    monteVelo(n) {
      const v = n.velo, pts = [];
      let x = n.x, y = n.y;
      const libre = (gx, gy) => !!(this.walk[gy] && this.walk[gy][gx]);
      const vers = (q) => { const l = this.findPath(x, y, q.x, q.y, libre); if (!l) return false; pts.push(...l); x = q.x; y = q.y; return true; };
      const route = v.plan.pts;
      const ok = vers(route[0]) && (route.slice(1).forEach((q) => { pts.push({ x: q.x, y: q.y }); x = q.x; y = q.y; }), true) && vers(v.porte);
      if (!ok) {
        // (pas de chemin : il y va à pied)
        n.etat = v.etat;
        n.velo = null;
        if (!this.allerImm(n, v.p, v.niv)) { n.path = []; n.t = 0.01; }
        return;
      }
      if (!n.selle) n.selle = K.triporteur(this, VELO.key, VELO);
      n.aVelo = !!n.selle;
      n.path = pts;
      n.etat = 'aVelo';
      n.t = 0;
    },

    // Arrivé à la porte : il descend de vélo et finit à pied.
    descendVelo(n) {
      const v = n.velo;
      this.rangeVelo(n);
      n.etat = v ? v.etat : 'dedans';
      if (!v || !this.allerImm(n, v.p, v.niv)) { n.path = []; n.t = 0.01; }
    },

    // Le vélo rangé (descendu, rentré d'un coup, couché).
    rangeVelo(n) {
      n.aVelo = false;
      n.velo = null;
      if (n.selle) n.selle.cache();
    },
  });
})(window);
