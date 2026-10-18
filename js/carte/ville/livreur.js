/* carte/ville/livreur.js — la scène de la ville : le livreur de la carte de transition.
 *
 * Au-dessus de l'arrêt de bus : son habitation (il vit seul), l'entrepôt, et entre les deux le
 * parking de son triporteur électrique (le plan : LIVREUR, js/engine/transition.js ; la place :
 * scripts/ville/transition.py). Devant chaque maison des voisins, au bord du chemin, une caisse
 * de collecte : la famille y met chaque soir ce qu'elle vend (js/engine/voisins.js).
 *
 * Sa journée (TRANSITION_VIE.livreur) : il dort jusqu'à 6 h ; il se lève, va au parking, monte
 * sur son triporteur et part vers la ferme en s'arrêtant à chaque caisse pleine (de l'est à
 * l'ouest), dont il prend les marchandises ; puis il fait demi-tour jusqu'au marché de la ville
 * (le bout de la route, à l'est) : en y arrivant, la caisse de chaque famille est vendue et son
 * prix lui est crédité (FermeHote.livraison ; un « +12 💰 » monte au-dessus de chaque caisse). Il
 * reste en ville jusqu'à `retour` h, revient garer son triporteur et rentre chez lui ; à 22 h,
 * il se couche. Arrivé sur la carte après `livre` h sans l'avoir vu passer : la tournée est déjà
 * faite (les caisses sont vides, les familles payées).
 *
 * Un toucher sur lui : il raconte sa tournée ; sur une caisse : ce qu'elle contient.
 *
 * Méthodes de la scène des cartes (js/ville-carte.js), posées sur son prototype : `this` est
 * la scène (voir docs/architecture-phaser.md).
 */
(function (global) {
  'use strict';

  const K = global.CarteKit;
  const V = global.CarteVille;
  const { T, TRANSITION_VIE: VIE, VOISINS } = V.C;
  const { hote, reduced, sheetKey } = V;
  const LV = VIE.livreur;

  const heureDe = (H) => (H ? ((H.heure % 24) + 24) % 24 : 12);

  V.partie({

    // Les bâtiments du livreur, le parking, les caisses de collecte, le livreur à l'heure qu'il est.
    makeLivreur() {
      this.livreur = null;
      const D = this.transition, L = D && D.livreur;
      if (!L) return;
      const H = hote(), heure = global.HorlogeSortie ? global.HorlogeSortie.maintenant() : null, h = heureDe(heure);
      // (l'habitation et l'entrepôt : bâtis comme les maisons des voisins, sur une copie du plan)
      const maison = { ...L.maison }, entrepot = { ...L.entrepot };
      for (const b of [maison, entrepot]) this.poseMaison(b, { grille: b.grille, objets: b.objets, lits: b.lits });
      // la tournée du matin déjà faite sans le joueur : les familles sont payées
      const foyers = (this.eco && this.eco.foyers) || {};
      const aLivrer = () => Object.values(foyers).some((f) => !f.livree && f.valeur > 0);
      if (H && H.livraison && h >= LV.livre && h < 22 && aLivrer()) {
        H.livraison();
        for (const f of Object.values(foyers)) f.livree = true;
      }
      // les caisses de collecte
      this.caisses = [];
      for (const m of D.plan.maisons) {
        if (!m.caisse || !this.textures.exists(LV.caisse)) continue;
        const fo = foyers[m.nom];
        const pleine = !!(fo && !fo.livree && fo.valeur > 0);
        const img = this.add.image(m.caisse.x, m.caisse.y, LV.caisse, pleine ? 0 : 1).setOrigin(0.5, 1).setDepth(m.caisse.y);
        this.caisses.push({ m, img, x: m.caisse.x, y: m.caisse.y, arret: m.caisse.arret, pleine });
      }
      // le livreur et son triporteur
      const f = V.voisins('livreur', 1), mb = f.membres[0], key = sheetKey(mb.perso, false);
      const selle = K.triporteur(this, LV.tri);
      if (!this.textures.exists(key) || !selle) return;
      const lit = maison.litsCases[0];
      const s = this.add.sprite(lit.x, lit.y, key, this.npcFrame('idle_bas_0')).setOrigin(0.5, 30 / 32);
      const shadow = this.add.ellipse(lit.x, lit.y, 11, 4, 0x1e1a18, 0.3);
      const a = (((this.map.getObjectLayer('arrivees') || {}).objects) || []).find((o) => o.name === 'ville');
      this.livreur = {
        f, mb, s, shadow, selle, maison, lit, parking: L.parking, marche: a ? { x: a.x - 8, y: a.y } : null,
        x: lit.x, y: lit.y, path: [], face: 'bas', flip: false, walked: 0, etat: 'dort', t: 0, monte: false, gare: true,
        arrets: [], livre: null,
      };
      const n = this.livreur;
      // où il est à cette heure
      if (h >= LV.depart && h < 22) {
        const tournee = h < LV.livre && aLivrer();
        if (tournee) { this.monteLivreur(n, L.parking); this.prochainArret(n); }
        else if (h < LV.retour) { n.etat = 'enVille'; n.gare = false; this.cacheLivreur(n, true); }
        else { const c = this.caseLivreur(n); n.x = c.x; n.y = c.y; n.etat = 'chezLui'; n.t = 1; }
      } else this.coucheLivreur(n);
      this.placeLivreur(n, 0);
    },

    // Une case libre de son habitation (pour aller et venir chez lui).
    caseLivreur(n) {
      const l = n.maison.libres;
      const c = l[Math.floor(Math.random() * l.length)];
      return { x: c.x * T + T / 2, y: c.y * T + T - 2 };
    },

    va(n, p) {
      n.path = (p && this.findPath(n.x, n.y, p.x, p.y)) || [];
      if (n.path.length) n.path[n.path.length - 1] = { x: p.x, y: p.y };
      n.t = n.path.length ? 0 : 0.01;
    },

    coucheLivreur(n) {
      n.etat = 'dort'; n.path = []; n.monte = false;
      n.x = n.lit.x; n.y = n.lit.y; n.face = 'bas'; n.flip = false;
      n.t = 2;
    },

    // Il monte sur son triporteur (au parking) : il roule désormais.
    monteLivreur(n, p) {
      n.x = p.x; n.y = p.y;
      n.monte = true; n.gare = false;
      n.face = 'cote'; n.flip = true;
    },

    // La caisse pleine suivante, de l'est à l'ouest (celles qu'il n'a pas encore vidées) ; plus
    // rien : il fait demi-tour vers le marché.
    prochainArret(n) {
      const c = this.caisses.filter((q) => q.pleine && !n.arrets.includes(q)).sort((a, b) => b.x - a.x)[0];
      if (c) { n.etat = 'tournee'; n.cible = c; this.va(n, c.arret); return; }
      n.etat = 'versMarche';
      this.va(n, n.marche);
    },

    cacheLivreur(n, deja) {
      n.selle.cache();
      if (deja || reduced()) { n.s.setVisible(false); n.shadow.setVisible(false); return; }
      this.tweens.add({ targets: [n.s, n.shadow], alpha: 0, duration: 500, onComplete: () => {
        if (n.etat !== 'enVille') return;
        n.s.setVisible(false).setAlpha(1); n.shadow.setVisible(false).setAlpha(0.3);
      } });
    },

    // Arrivé au marché : la caisse de chaque famille est vendue, son prix crédité ; un « +12 💰 »
    // monte au-dessus de chaque caisse.
    livre(n) {
      const H = hote();
      const r = H && H.livraison ? H.livraison() : null;
      n.livre = r;
      if (!r) return;
      for (const c of this.caisses) {
        const gain = r.foyers[c.m.nom];
        if (!gain) continue;
        const t = this.add.text(c.x, c.y - 18, `+${gain} 💰`, { fontFamily: 'sans-serif', fontSize: '9px', color: '#fff4c8', stroke: '#3a2a10', strokeThickness: 3 })
          .setOrigin(0.5, 1).setDepth(2e6).setResolution(3);
        this.tweens.add({ targets: t, y: c.y - 38, alpha: { from: 1, to: 0 }, delay: 400, duration: reduced() ? 600 : 2600, onComplete: () => t.destroy() });
      }
      if (this.eco) for (const f of Object.values(this.eco.foyers)) { f.livree = true; f.valeur = 0; }
    },

    // Chaque image : un pas de sa journée.
    stepLivreur(time, dt) {
      const n = this.livreur;
      if (!n) return;
      const heure = global.HorlogeSortie ? global.HorlogeSortie.maintenant() : null, h = heureDe(heure);
      let bouge = false;
      if (n.path.length) {
        const to = n.path[0], dx = to.x - n.x, dy = to.y - n.y, l = Math.hypot(dx, dy);
        const st = VOISINS.speed * (n.monte ? K.TRIPORTEUR.vitesse : 1) * dt;
        const r = K.regard(dx, dy);
        n.face = r.face; n.flip = r.flip;
        if (l <= st) { n.x = to.x; n.y = to.y; n.path.shift(); } else { n.x += (dx / l) * st; n.y += (dy / l) * st; }
        n.walked += Math.min(l, st);
        bouge = true;
      } else if ((n.t -= dt) <= 0) this.decideLivreur(n, h);
      this.placeLivreur(n, time, bouge);
    },

    decideLivreur(n, h) {
      const nuit = h >= 22 || h < LV.depart;
      switch (n.etat) {
        case 'dort':
          if (nuit) { n.t = 2; return; }
          // levé : il va au parking
          n.x = n.maison.porte.x * T + T / 2; n.y = (n.maison.porte.y - 1) * T + T - 2;
          n.etat = 'versParking';
          this.va(n, { x: n.parking.x - 10, y: n.parking.y + 6 });
          return;
        case 'versParking':
          this.monteLivreur(n, n.parking);
          n.arrets = [];
          this.prochainArret(n);
          return;
        case 'tournee':
          // à la caisse : il prend les marchandises
          n.etat = 'charge';
          n.t = LV.charge;
          return;
        case 'charge': {
          const c = n.cible;
          if (c) { c.pleine = false; c.img.setFrame(1); n.arrets.push(c); }
          n.cible = null;
          this.prochainArret(n);
          return;
        }
        case 'versMarche':
          this.livre(n);
          n.etat = 'enVille';
          n.t = 1;
          this.cacheLivreur(n);
          return;
        case 'enVille':
          if (h < LV.retour || nuit) { n.t = 2; return; }
          // il revient du marché, garer son triporteur
          if (!n.marche) { n.etat = 'chezLui'; return; }
          n.s.setVisible(true).setAlpha(1); n.shadow.setVisible(true).setAlpha(0.3);
          this.monteLivreur(n, n.marche);
          n.etat = 'retour';
          this.va(n, n.parking);
          return;
        case 'retour':
          // garé : il rentre chez lui
          n.monte = false; n.gare = true;
          n.etat = 'rentre';
          this.va(n, this.caseLivreur(n));
          return;
        case 'rentre':
        case 'chezLui':
          if (nuit) { n.etat = 'versLit'; this.va(n, n.lit.acces); return; }
          n.etat = 'chezLui';
          if (Math.random() < 0.5) this.va(n, this.caseLivreur(n));
          n.t = VOISINS.wait[0] + Math.random() * (VOISINS.wait[1] - VOISINS.wait[0]) * 2;
          return;
        case 'versLit':
          this.coucheLivreur(n);
          return;
        default:
          n.etat = 'chezLui';
      }
    },

    placeLivreur(n, time, bouge) {
      const F = this.npcFrame;
      // le triporteur : sous lui quand il roule, sinon garé au parking (ou parti en ville avec lui)
      let dx = 0, dy = 0, frame;
      if (n.monte && n.s.visible) {
        const r = n.selle.place(n.x, n.y, n.face, n.flip, n.walked);
        frame = F(r.image); dx = r.dx; dy = r.dy;
      } else {
        if (n.gare) n.selle.place(n.parking.x, n.parking.y, 'bas', false, 0);
        else n.selle.cache();
        if (n.etat === 'dort') frame = F('idle_bas_0');
        else if (n.etat === 'charge') frame = F('ramasse_' + Math.min(2, Math.floor((1 - n.t / LV.charge) * 3)));
        else if (bouge) frame = F.de('marche', n.face, Math.floor(n.walked / 4) % 4);
        else frame = F.de('idle', n.face, Math.floor((time || 0) / 600) % 2);
      }
      n.s.setFrame(frame).setFlipX(n.flip);
      const depth = n.etat === 'dort' ? n.maison.litsCases[0].depth : n.y;
      n.s.setPosition(Math.round(n.x + dx), Math.round(n.y - dy)).setDepth(depth);
      n.shadow.setPosition(Math.round(n.x), Math.round(n.y)).setDepth(n.y - 0.5).setVisible(n.s.visible && n.etat !== 'dort');
    },

    // Un toucher sur le livreur (il raconte sa tournée) ou sur une caisse (ce qu'elle contient).
    tapLivreur(w) {
      const n = this.livreur;
      if (n && n.s.visible && Math.abs(w.x - n.x) <= 10 && w.y <= n.y + 3 && w.y >= n.y - 32) {
        const qui = `${n.mb.prenom} ${n.f.nom}`;
        if (n.etat === 'dort') { this.say(`💤 ${qui} dort : sa tournée commence à ${LV.depart} h.`); return true; }
        const fait = n.livre && n.livre.total ? ` Ce matin, j'ai rapporté ${n.livre.total} 💰 aux familles.` : '';
        const en = n.etat === 'tournee' || n.etat === 'charge' ? ' Je passe prendre les caisses, et je file au marché !' : '';
        this.say(`🛺 ${qui}, livreur : « Chaque matin à ${LV.depart} h, je fais le tour des caisses des voisins sur mon triporteur électrique, et j'emmène leurs marchandises au marché de la ville.${en}${fait} »`);
        return true;
      }
      const c = (this.caisses || []).find((q) => Math.abs(w.x - q.x) <= 8 && w.y <= q.y + 2 && w.y >= q.y - 14);
      if (!c) return false;
      const fo = this.eco && this.eco.foyers[c.m.nom], N = (this.eco && this.eco.noms) || {};
      const fam = V.voisins(c.m.nom, c.m.lits).nom;
      const items = fo && c.pleine ? Object.entries(fo.caisse).map(([k, q]) => `${q} ${N[k] || (k === 'bois' ? '🪵 bois' : k)}`) : [];
      this.say(items.length ? `📦 La caisse des ${fam} : ${items.join(', ')} (${fo.valeur} 💰 au marché). Le livreur passe la prendre à ${LV.depart} h.`
        : `📦 La caisse des ${fam} est vide : le livreur est passé.`);
      return true;
    },
  });
})(window);
