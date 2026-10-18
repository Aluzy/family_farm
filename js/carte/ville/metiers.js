/* carte/ville/metiers.js — la scène de la ville : le métier des voisins de la transition.
 *
 * Chaque maison de la carte de transition a son métier (le plan : js/engine/transition.js) et
 * son foyer, dont le moteur tient l'économie (js/engine/voisins.js : FermeHote.voisins) : le
 * bûcheron abat les arbres de la carte et vend le bois au marché, où il achète à manger ;
 * l'agriculteur achète ses graines, cultive son champ et vend ses légumes ; chacun cuisine des
 * plats qui font son bonheur. Le moteur fait vivre la journée de chaque foyer à chaque nuit ;
 * la carte montre la même journée, à l'heure du jeu (TRANSITION_VIE) :
 *
 *   - le bûcheron va à l'arbre debout le plus proche, l'abat en TRANSITION_VIE.coups coups de
 *     hache (FermeHote.voisinAbat : l'arbre compte dans sa journée, il repoussera), puis
 *     rapporte le bois chez lui ; au plus son quota du jour ;
 *   - l'agriculteur travaille quelques parcelles de son champ (la houe ou l'arrosoir), dont on
 *     voit la terre et les plantes, à leur stade du jour ;
 *   - l'après-midi, le second parent part au marché de la ville, par la route, et en revient
 *     son panier plein ;
 *   - en fin de journée, un parent cuisine devant le four ou la cuisinière de la maison.
 *
 * Un toucher sur un voisin : il raconte son métier et sa journée d'hier (paroleVoisin).
 *
 * Méthodes de la scène des cartes (js/ville-carte.js), posées sur son prototype : `this` est
 * la scène (voir docs/architecture-phaser.md).
 */
(function (global) {
  'use strict';

  const V = global.CarteVille;
  const { T, TRANSITION_VIE: VIE } = V.C;
  const { hote, reduced } = V;

  const hasard = (a) => a[0] + Math.random() * (a[1] - a[0]);
  const liste = (l) => (l.length > 1 ? l.slice(0, -1).join(', ') + ' et ' + l[l.length - 1] : l[0] || '');

  // Où cuisiner dans la maison `m` : la case du plancher à côté du four ou de la cuisinière
  // (c ou f dans son plan à son étape, m.grille) ; { x, y } : où poser les pieds, { fx, fy } :
  // le haut du fourneau.
  function feuDe(m) {
    const G = m.grille || m.plan;
    for (let y = 0; y < G.length; y++) {
      const x = G[y].search(/[cf]/);
      if (x < 0) continue;
      for (const [dx, dy] of [[0, 1], [0, -1], [-1, 0], [1, 0]]) {
        if ((G[y + dy] || '')[x + dx] !== '.') continue;
        return { x: (m.x + x + dx) * T + T / 2, y: (m.y + y + dy) * T + T - 2, fx: (m.x + x) * T + T / 2, fy: (m.y + y) * T - 4, face: dy > 0 ? 'haut' : 'bas' };
      }
    }
    return null;
  }

  V.partie({

    // Les foyers (FermeHote.voisins : la page dit leurs familles ; leur maison à son étape, leur
    // métier), lus avant de bâtir les maisons (null : pas de partie).
    chargeVoisins() {
      this.eco = null;
      const H = hote(), D = this.transition;
      if (!D || !D.plan || !H || !H.voisins) return;
      const familles = D.plan.maisons.map((m) => {
        const f = V.voisins(m.nom, m.lits);
        return { maison: m.nom, adultes: f.membres.filter((q) => !q.enfant).length, enfants: f.membres.filter((q) => q.enfant).length };
      });
      this.eco = H.voisins(familles);
    },

    // Les arbres du plan (ceux qu'un bûcheron peut abattre), le chemin du marché, les fourneaux,
    // les champs.
    makeMetiers() {
      this.faits = {};
      const D = this.transition;
      if (!D || !D.plan || !this.eco) return;
      this.arbresPlan = new Set(D.plan.arbres.map((a) => `transition:${Math.round(a.x)},${Math.round(a.y)}`));
      const a = (((this.map.getObjectLayer('arrivees') || {}).objects) || []).find((o) => o.name === 'ville');
      this.versVille = a ? { x: a.x - 8, y: a.y } : null;
      this.defineCrops();
      for (const m of D.plan.maisons) {
        m.feu = feuDe(m);
        const fo = this.eco.foyers[m.nom];
        if (m.champ && fo) this.poseChamp(m, fo);
      }
    },

    // Les images des plantes (crops.png : « culture:stade »), si la ferme ne les a pas déjà découpées.
    defineCrops() {
      const C = VIE.champ;
      if (!this.textures.exists(C.crops)) return;
      const tex = this.textures.get(C.crops);
      for (const [nom, sp] of Object.entries(this.eco.cultures || {})) {
        sp.c.forEach((col, stade) => { if (!tex.has(nom + ':' + stade)) tex.add(nom + ':' + stade, 0, col * T, (sp.r + 1) * T - sp.h, T, sp.h); });
      }
    },

    // Le champ de l'agriculteur de `m` : la terre labourée (une bordure mi-herbe mi-terre
    // autour, selon ses quatre coins, comme à la ferme) et chaque parcelle à son stade.
    poseChamp(m, fo) {
      const c = m.champ, C = VIE.champ;
      const laboure = (x, y) => x >= c.x && x < c.x + c.w && y >= c.y && y < c.y + c.h;
      m.parcelles = [];
      if (this.textures.exists(C.terre)) {
        for (let y = c.y - 1; y <= c.y + c.h; y++) {
          for (let x = c.x - 1; x <= c.x + c.w; x++) {
            let k = 15;
            if (!laboure(x, y)) {
              k = (laboure(x - 1, y - 1) || laboure(x, y - 1) || laboure(x - 1, y) ? 8 : 0) | (laboure(x, y - 1) || laboure(x + 1, y - 1) || laboure(x + 1, y) ? 4 : 0)
                | (laboure(x - 1, y) || laboure(x - 1, y + 1) || laboure(x, y + 1) ? 2 : 0) | (laboure(x + 1, y) || laboure(x, y + 1) || laboure(x + 1, y + 1) ? 1 : 0);
            }
            if (k) this.add.image(x * T, y * T, C.terre, k).setOrigin(0).setDepth(-70);
          }
        }
      }
      fo.champ.forEach((p, i) => {
        const x = c.x + (i % c.w), y = c.y + Math.floor(i / c.w);
        const px = x * T + T / 2, py = (y + 1) * T;
        m.parcelles.push({ x: px, y: py - 2 });
        const key = p.culture + ':' + p.stade;
        if (p.stade >= 0 && this.textures.exists(C.crops) && this.textures.get(C.crops).has(key)) {
          this.add.image(px, py, C.crops, key).setOrigin(0.5, 1).setDepth(py - 1);
        }
      });
    },

    foyerDe(n) {
      return (this.eco && this.eco.foyers[n.maison.nom]) || null;
    },

    // Ce qui est fait aujourd'hui dans la maison `nom` (le marché, la cuisine) : { marche, cuisine }.
    faitsDe(nom, jour) {
      const f = this.faits[nom];
      if (!f || f.jour !== jour) this.faits[nom] = { jour, marche: false, cuisine: false };
      return this.faits[nom];
    },

    // L'arbre debout du plan le plus proche de `n`, que personne d'autre ne vise (null : aucun).
    arbreLibre(n) {
      let best = null, d = Infinity;
      for (const t of this.trees || []) {
        if (t.down || t.cible || !this.arbresPlan.has(t.id) || (this.work && this.work.o === t)) continue;
        const e = Math.hypot(t.x - n.x, t.y - n.y);
        if (e < d) { d = e; best = t; }
      }
      return best;
    },

    // Le métier décide de ce que fait le parent `n` (true), ou le laisse à sa journée (false).
    decideMetier(n, jour, H) {
      const fo = this.foyerDe(n);
      if (!fo) return false;
      const va = (x, y) => { n.path = this.findPath(n.x, n.y, x, y) || []; n.t = n.path.length ? 0 : 0.01; };
      const rentrer = () => { n.geste = null; n.etat = 'rentre'; const c = this.caseDedans(n.maison); va(c.x, c.y); };
      const faits = this.faitsDe(n.maison.nom, H ? H.jour : 0);
      switch (n.etat) {
        case 'versArbre': {
          const t = n.arbre;
          if (!t || t.down) { n.arbre = null; n.etat = 'cherche'; n.t = 0.3; return true; }
          n.etat = 'coupe';
          n.coups = 0; n.swing = 0; n.hit = false;
          n.face = 'cote';
          n.s.setFlipX(t.x < n.x);
          return true;
        }
        case 'versChamp':
          n.etat = 'travaille';
          n.face = 'bas';
          n.outil = Math.random() < 0.5 ? 'houe' : 'arrose';
          n.t = hasard(VIE.travail);
          return true;
        case 'travaille': {
          n.geste = null;
          const P = n.maison.parcelles || [];
          if (jour && --n.reste > 0 && P.length) { const p = P[Math.floor(Math.random() * P.length)]; n.etat = 'versChamp'; va(p.x, p.y); } else rentrer();
          return true;
        }
        case 'versVille':
          // à la route : il part en ville (il disparaît le temps du marché)
          n.etat = 'enVille';
          n.t = VIE.enVille;
          this.cacheVoisin(n);
          return true;
        case 'enVille':
          // il revient du marché, son panier plein
          faits.marche = true;
          this.montreVoisin(n);
          n.porte_ = 1;
          rentrer();
          return true;
        case 'versFeu':
          n.etat = 'cuisine';
          n.face = n.maison.feu.face;
          n.s.setFlipX(false);
          n.t = VIE.cuisson;
          n.vapeur = 0;
          return true;
        case 'cuisine':
          faits.cuisine = true;
          n.geste = null;
          n.etat = 'dedans';
          n.sortie = hasard(VIE.pause);
          n.t = 1;
          return true;
        default:
      }
      if (!['dedans', 'cherche', 'flane'].includes(n.etat)) return false;
      const h = H ? H.heure : 12;
      // en fin de journée, un parent cuisine chez lui (le premier qui est là)
      const cuisinier = this.dehors.some((q) => q.maison === n.maison && (q.etat === 'versFeu' || q.etat === 'cuisine'));
      if (n.maison.feu && h >= VIE.cuisine && !(H && H.nuit) && !faits.cuisine && !cuisinier) {
        n.etat = 'versFeu';
        va(n.maison.feu.x, n.maison.feu.y);
        return true;
      }
      if (n.etat === 'dedans' || !jour) return false;
      // l'après-midi, le second parent (le seul, s'il est seul) va au marché de la ville
      const marchand = fo.adultes > 1 ? 1 : 0;
      if (n.rang === marchand && this.versVille && h >= VIE.marche[0] && h < VIE.marche[1] && !faits.marche) {
        n.etat = 'versVille';
        va(this.versVille.x, this.versVille.y);
        return true;
      }
      if (n.etat === 'flane' && Math.random() < 0.5) return false;
      if (fo.metier === 'bucheron') {
        const occupes = this.dehors.filter((q) => q.maison === n.maison && (q.etat === 'versArbre' || q.etat === 'coupe')).length;
        const t = fo.quota - occupes > 0 ? this.arbreLibre(n) : null;
        if (!t) return false;
        t.cible = n;
        n.arbre = t;
        n.etat = 'versArbre';
        va(t.x + (n.x < t.x ? -12 : 12), t.y);
        return true;
      }
      const P = n.maison.parcelles || [];
      if (!P.length) return false;
      n.reste = VIE.parcelles;
      const p = P[Math.floor(Math.random() * P.length)];
      n.etat = 'versChamp';
      va(p.x, p.y);
      return true;
    },

    // Chaque image, le geste du métier en cours (n.geste : l'image du personnage). true : la
    // hache, qui mène sa journée elle-même (ses coups, l'arbre qui tombe).
    stepMetier(n, dt, time) {
      switch (n.etat) {
        case 'coupe': {
          const t = n.arbre;
          if (!t || t.down) { n.geste = null; n.arbre = null; n.etat = 'cherche'; n.t = 0.5; return false; }
          n.swing += dt;
          const k = Math.min(3, Math.floor((n.swing / VIE.coup) * 4));
          n.geste = 'hache_cote_' + k;
          if (k >= 2 && !n.hit) {
            n.hit = true;
            n.coups++;
            t.shake = 0;
            this.leaves(t, 3);
            if (n.coups >= VIE.coups) { this.abatVoisin(n, t); return false; }
          }
          if (n.swing >= VIE.coup) { n.swing = 0; n.hit = false; }
          return true;
        }
        case 'travaille':
          n.geste = n.outil === 'houe' ? 'houe_bas_' + (Math.floor(time / 160) % 4) : 'arrose_bas_' + (Math.floor(time / 300) % 3);
          return false;
        case 'cuisine': {
          n.geste = 'cuisine_' + (Math.floor(time / 220) % 4);
          const f = n.maison.feu;
          if (f && !reduced() && (n.vapeur -= dt) <= 0) {
            n.vapeur = VIE.vapeur;
            const v = this.add.rectangle(f.fx + (Math.random() - 0.5) * 6, f.fy, 2, 2, 0xf4f1ea, 0.8).setDepth(f.fy + 40);
            this.tweens.add({ targets: v, y: f.fy - 14 - Math.random() * 6, alpha: 0, duration: 1100, onComplete: () => v.destroy() });
          }
          return false;
        }
        default:
          return false;
      }
    },

    // Le dernier coup : l'arbre tombe (s'il est encore dans le quota : FermeHote.voisinAbat), le
    // bûcheron rapporte le bois chez lui.
    abatVoisin(n, t) {
      const H = hote(), fo = this.foyerDe(n);
      const r = H && H.voisinAbat ? H.voisinAbat(n.maison.nom, t.id) : null;
      t.cible = null;
      n.arbre = null;
      n.geste = null;
      if (r && r.ok) {
        if (fo) fo.quota = r.reste;
        this.fellTree(t, { x: n.x, y: n.y });
        n.porte_ = 1;
      }
      n.etat = 'rentre';
      const c = this.caseDedans(n.maison);
      n.path = this.findPath(n.x, n.y, c.x, c.y) || [];
      n.t = n.path.length ? 0.4 : 0.01;
      if (n.path.length) n.path.unshift({ x: n.x, y: n.y });      // (un temps d'arrêt : l'arbre tombe)
    },

    cacheVoisin(n) {
      if (reduced()) { n.s.setVisible(false); n.shadow.setVisible(false); return; }
      this.tweens.add({ targets: [n.s, n.shadow], alpha: 0, duration: 500, onComplete: () => {
        if (n.etat !== 'enVille') return;
        n.s.setVisible(false).setAlpha(1); n.shadow.setVisible(false).setAlpha(0.3);
      } });
    },

    // Ce que dit le voisin `n` : son métier, sa journée d'hier, sa bourse, son bonheur.
    paroleVoisin(n) {
      const qui = `${n.m.prenom} ${n.f.nom}`, fo = this.foyerDe(n);
      if (!fo) return `👋 ${qui} : « Bonjour, voisin ! »`;
      const N = this.eco.noms || {}, hier = fo.hier;
      const humeur = fo.bonheur >= VIE.humeur[0] ? '😊' : fo.bonheur >= VIE.humeur[1] ? '🙂' : '😟';
      const plats = hier && hier.plats.length ? liste(hier.plats.map((p) => N[p] || p)) : '';
      const buch = fo.metier === 'bucheron';
      if (n.m.enfant) {
        const repas = plats ? `Hier soir, on a mangé ${plats}, miam !` : hier && hier.couverture < 100 ? 'Hier soir, on n\'avait pas grand-chose à manger…' : 'J\'aide mes parents quand je ne suis pas à l\'école !';
        return `👋 ${qui} : « Mes parents sont ${buch ? 'bûcherons 🪓' : 'agriculteurs 🌾'} ! ${repas} » ${humeur}`;
      }
      let dit;
      if (buch) {
        dit = hier ? `Hier, j'ai abattu ${hier.arbres} arbre${hier.arbres > 1 ? 's' : ''} et vendu ${(hier.ventes && hier.ventes.bois) || 0} bois au marché (${hier.vendu} 💰).`
          : 'Je coupe les arbres du coin et je vends le bois au marché de la ville ; j\'y achète de quoi manger.';
        if (n.etat === 'coupe') dit = 'Attention, ça va tomber ! ' + dit;
      } else {
        const rec = hier ? Object.entries(hier.recolte).map(([c, k]) => `${k} ${N[c] || c}`) : [];
        dit = hier ? (rec.length ? `Hier, on a récolté ${liste(rec)}` : 'Hier, rien n\'était mûr') + (hier.vendu ? ` et vendu pour ${hier.vendu} 💰 de légumes au marché.` : '.')
          : 'Je cultive mon champ, on mange nos légumes et je vends le reste en ville.';
      }
      const repas = plats ? ` Au dîner : ${plats}.` : hier && hier.couverture < 100 ? ' On n\'a pas mangé à notre faim…' : '';
      // la maison : ce qu'on vient de s'offrir, ou ce pour quoi on économise
      const offert = hier && hier.maison && N['maison:' + hier.maison];
      const maison = offert ? ` Et hier, on a pu ${offert} !` : fo.projet ? ` On met de côté pour ${fo.projet.nom} (${fo.projet.prix} 💰).` : ' Notre maison est finie, on y est bien !';
      return `${buch ? '🪓' : '🌾'} ${qui}, ${buch ? 'bûcheron' : 'agriculteur'} : « ${dit}${repas}${maison} » (${fo.argent} 💰 de côté, bonheur ${fo.bonheur} ${humeur})`;
    },
  });
})(window);
