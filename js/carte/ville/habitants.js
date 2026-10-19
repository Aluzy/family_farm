/* carte/ville/habitants.js — la scène de la ville : les familles de l'immeuble en blocs.
 *
 * Chaque logement de l'immeuble (js/carte/ville/immeuble.js : deux par niveau, à gauche et à
 * droite du hall) a sa famille, tirée comme celles des voisins (V.voisins, un lit chacun : deux
 * adultes et un enfant) ; le moteur tient son économie (js/engine/voisins.js : FermeHote.immeuble).
 * Les adultes travaillent à la fromagerie de la ville (VOISINS.FROMAGER.HORAIRES, data/ville.json)
 * et y gagnent leur salaire ; la carte montre leur journée, à l'heure du jeu (IMMEUBLE.vie) :
 *
 *   - le matin, chaque adulte descend l'escalier, sort par la porte de l'immeuble et va à pied
 *     à la fromagerie (il part assez tôt pour y être à l'heure) ; il y entre, et n'est plus sur
 *     la carte de la journée ;
 *   - à la fin de sa journée, il en ressort, passe par un étal du marché de la ville acheter
 *     les ingrédients du dîner, et rentre chez lui son panier plein ;
 *   - le premier rentré cuisine devant le four du logement ;
 *   - les enfants restent à la maison ; de IMMEUBLE.vie.sommeil[0] h à sommeil[1] h, chacun
 *     dort dans la chambre (on ne le voit plus).
 *
 * Un habitant marche sur son niveau (le rez-de-chaussée : la marche de la carte ; un étage : la
 * marche de son niveau) et change de niveau par l'escalier, comme le personnage. On le voit
 * dehors, ou dans l'immeuble quand on est à son niveau. Un toucher sur lui : il raconte son
 * travail et ses achats d'hier (paroleHabitant).
 *
 * Méthodes de la scène des cartes (js/ville-carte.js), posées sur son prototype : `this` est
 * la scène (voir docs/architecture-phaser.md).
 */
(function (global) {
  'use strict';

  const K = global.CarteKit;
  const V = global.CarteVille;
  const { T, IMMEUBLE: I, VOISINS } = V.C;
  const { hote, reduced, sheetKey } = V;
  const VIE = I.vie;

  const hasard = (a) => a[0] + Math.random() * (a[1] - a[0]);
  const liste = (l) => (l.length > 1 ? l.slice(0, -1).join(', ') + ' et ' + l[l.length - 1] : l[0] || '');

  // Les logements de l'immeuble : { nom (celui du moteur), niveau, cote (0 : à gauche du hall,
  // 1 : à droite) }.
  V.logementsImmeuble = () => Array.from({ length: I.niveaux * 2 }, (_, i) => ({ nom: `logement_${i + 1}`, niveau: Math.floor(i / 2), cote: i % 2 }));
  // La famille d'un logement (tirée une fois, gardée comme celles des voisins).
  V.familleImmeuble = (L) => V.voisins('immeuble:' + L.nom, VIE.lits);

  // Le point (px) où poser les pieds sur la case (x, y) de l'immeuble.
  const pied = (x, y) => ({ x: (I.x + x) * T + T / 2, y: (I.y + y) * T + T - 2 });

  V.partie({

    // Les familles de l'immeuble : chacune chez elle (ou déjà partie au travail, ou couchée,
    // selon l'heure).
    makeHabitants() {
      this.habitants = [];
      const im = this.immeuble;
      if (!im) return;
      const noms = (this.cache.json.get('perso_cases') || {}).frames || [];
      this.npcFrame = this.npcFrame || K.cases(noms);
      const logements = V.logementsImmeuble();
      const H = hote();
      this.ecoImm = H && H.immeuble ? H.immeuble(logements.map((L) => {
        const f = V.familleImmeuble(L);
        return { logement: L.nom, adultes: f.membres.filter((q) => !q.enfant).length, enfants: f.membres.filter((q) => q.enfant).length };
      })) : null;
      this.faitsImm = {};
      const h = global.HorlogeSortie ? global.HorlogeSortie.maintenant() : null;
      for (const L of logements) {
        this.poseLogement(L);
        const f = V.familleImmeuble(L);
        f.membres.forEach((mb, i) => {
          const key = sheetKey(mb.perso, mb.enfant);
          if (!this.textures.exists(key)) return;
          const rang = f.membres.slice(0, i).filter((q) => q.enfant === mb.enfant).length;
          const c = this.caseLogement(L);
          const s = this.add.sprite(c.x, c.y, key, this.npcFrame('idle_bas_0')).setOrigin(0.5, 30 / 32);
          const shadow = this.add.ellipse(c.x, c.y, mb.enfant ? 9 : 11, 4, 0x1e1a18, 0.3);
          const n = { m: mb, f, L, s, shadow, x: c.x, y: c.y, niv: L.niveau, path: [], face: 'bas', walked: 0, rang,
            speed: mb.enfant ? VOISINS.kidSpeed : VOISINS.speed, etat: 'dedans', t: Math.random() * 2, cache: false, panier: 0, geste: null, talk: 0 };
          this.habitants.push(n);
          this.debutHabitant(n, h);
        });
      }
    },

    // Les cases d'un logement : celles où l'on va et vient (libres), le pied des lits, la place
    // devant le four (et de quel côté il est). Le plan est celui du logement de gauche
    // (V.planImmeuble) ; celui de droite en miroir.
    poseLogement(L) {
      const nv = this.immeuble.niveaux[L.niveau];
      const mx = (x) => (L.cote ? I.w - 1 - x : x);
      L.libres = [];
      for (let y = 1; y < I.h - 1; y++) {
        for (let x = 1; x < I.w - 1; x++) {
          const g = mx(x);
          // (la chambre derrière, sur toute la largeur ; devant, la pièce de vie et le salon)
          const dans = y < 5 ? g <= 9 : y > 5 && g <= 7;
          if (dans && nv.marche[y][x] && nv.grille[y][x] === '.') L.libres.push(pied(x, y));
        }
      }
      L.lits = VIE.couchage.map(([x, y]) => pied(mx(x), y));
      L.feu = { ...pied(mx(VIE.feu[0]), VIE.feu[1]), flip: !L.cote };
    },

    // Le pied du lit de `n` (les adultes : le grand lit ; l'enfant : le sien).
    litImm(n) {
      const l = n.L.lits;
      return l[Math.min(l.length - 1, n.m.enfant ? 2 : n.rang)];
    },

    caseLogement(L) {
      const l = L.libres;
      return l.length ? l[Math.floor(Math.random() * l.length)] : pied(I.w / 2, I.h - 2);
    },

    // Où est l'habitant `n` quand la carte s'ouvre, d'après l'heure.
    debutHabitant(n, H) {
      const h = this.heureImm(H), [debut, fin] = this.horairesImm();
      const jour = H ? H.jour : 0;
      if (this.dortImm(H)) { this.coucheHabitant(n); return; }
      if (n.m.enfant) return;
      if (h >= this.departImm() && h < fin) { n.jourTravail = jour; this.cacheHabitant(n, true); n.etat = 'travail'; return; }
      // (rentré du marché : le dîner est fait, ou à faire)
      if (h >= fin) { n.jourTravail = n.jourMarche = jour; }
      if (h < debut && h >= this.departImm()) n.jourTravail = jour;
    },

    // ---------- l'heure ----------

    heureImm(H) {
      return H ? ((H.heure % 24) + 24) % 24 : 12;
    },
    horairesImm() {
      return (this.ecoImm && this.ecoImm.horaires) || VIE.horaires;
    },
    dortImm(H) {
      if (!H) return false;
      const h = this.heureImm(H), S = VIE.sommeil;
      return !!H.nuit || h >= S[0] || h < S[1];
    },
    // L'heure du départ au travail : le temps du trajet (à pied, jusqu'à la fromagerie) avant
    // l'embauche, et une marge.
    departImm() {
      if (this.departImmH == null) {
        const p = this.portesImm(), l = p.fromagerie ? this.findPath(p.sortie.x, p.sortie.y, p.fromagerie.x, p.fromagerie.y, this.libreNiv(0)) : null;
        let d = 0;
        if (l) for (let i = 0, a = p.sortie; i < l.length; a = l[i++]) d += Math.hypot(l[i].x - a.x, l[i].y - a.y);
        // (le temps de descendre et de sortir : une vingtaine de cases)
        const s = (d + 20 * T) / VIE.vitesse;
        this.departImmH = Math.max(VIE.sommeil[1] + 0.25, this.horairesImm()[0] - s / VIE.sParHeure - VIE.marge);
      }
      return this.departImmH;
    },

    // La sortie de l'immeuble (devant sa porte), la porte de la fromagerie (devant le milieu de
    // sa façade).
    portesImm() {
      const b = (this.buildings || []).find((q) => q.name === VIE.travail);
      return {
        sortie: pied(I.w / 2 - 1, I.h),
        fromagerie: b ? { x: Math.round((b.x0 + b.x1) / 2), y: b.base + T - 2 } : null,
      };
    },

    // ---------- marcher, d'un niveau à l'autre ----------

    // La marche du niveau `niv` : (gx, gy) → y marche-t-on ? (le rez-de-chaussée : celle de la
    // carte ; un étage : celle de son niveau)
    libreNiv(niv) {
      if (!niv) return (gx, gy) => !!(this.walk[gy] && this.walk[gy][gx]);
      const nv = this.immeuble.niveaux[niv];
      return (gx, gy) => {
        const x = gx - I.x, y = gy - I.y;
        return x >= 0 && y >= 0 && x < I.w && y < I.h && nv.marche[y][x];
      };
    },

    // L'escalier du niveau `niv` qui monte (U) ou descend (D) : son point (px).
    escalierImm(niv, c) {
      const G = this.immeuble.niveaux[niv].grille;
      for (let y = 0; y < G.length; y++) { const x = G[y].indexOf(c); if (x >= 0) return pied(x, y); }
      return null;
    },

    // Le chemin de `n` jusqu'au point `p` du niveau `niv` : par les escaliers s'il faut changer
    // de niveau (un point { niv } : il arrive sur le niveau d'à côté). false : pas de chemin.
    allerImm(n, p, niv = 0) {
      const pts = [];
      let a = n.niv, x = n.x, y = n.y;
      while (a !== niv) {
        const e = this.escalierImm(a, niv > a ? 'U' : 'D');
        const l = e && this.findPath(x, y, e.x, e.y, this.libreNiv(a));
        if (!l) return false;
        pts.push(...l);
        a += niv > a ? 1 : -1;
        pts.push({ x: e.x, y: e.y, niv: a });
        x = e.x; y = e.y;
      }
      const l = this.findPath(x, y, p.x, p.y, this.libreNiv(a));
      if (!l) return false;
      pts.push(...l);
      n.path = pts;
      n.t = pts.length ? 0 : 0.01;
      return true;
    },

    // ---------- la journée ----------

    stepHabitants(time, dt) {
      if (!this.habitants || !this.habitants.length) return;
      const H = global.HorlogeSortie ? global.HorlogeSortie.maintenant() : null;
      for (const n of this.habitants) {
        let marche = false;
        if (n.talk > 0) n.talk -= dt;
        else if (n.path.length) {
          const to = n.path[0], dx = to.x - n.x, dy = to.y - n.y, l = Math.hypot(dx, dy);
          const st = (this.dansImm(n) ? n.speed : VIE.vitesse) * dt;   // (dehors, il marche d'un bon pas)
          const r = K.regard(dx, dy);
          n.face = r.face; n.s.setFlipX(r.flip);
          if (l <= st) {
            n.x = to.x; n.y = to.y;
            if (to.niv != null) n.niv = to.niv;
            n.path.shift();
          } else { n.x += (dx / l) * st; n.y += (dy / l) * st; }
          n.walked += Math.min(l, st);
          marche = true;
        } else if ((n.t -= dt) <= 0) this.decideHabitant(n, H);
        if (n.etat === 'cuisine') n.geste = 'cuisine_' + (Math.floor(time / 220) % 4);
        this.placeHabitant(n, time, marche);
      }
    },

    // Dans l'emprise de l'immeuble ?
    dansImm(n) {
      const x = Math.floor(n.x / T) - I.x, y = Math.floor((n.y - 1) / T) - I.y;
      return x >= 0 && y >= 0 && x < I.w && y < I.h;
    },

    // Ce qui est fait aujourd'hui dans le logement `L` (le dîner) : { cuisine }.
    faitsImmDe(L, jour) {
      const f = this.faitsImm[L.nom];
      if (!f || f.jour !== jour) this.faitsImm[L.nom] = { jour, cuisine: false };
      return this.faitsImm[L.nom];
    },

    // Arrivé au bout de son chemin (ou fini d'attendre) : que faire maintenant ?
    decideHabitant(n, H) {
      const h = this.heureImm(H), jour = H ? H.jour : 0, [, fin] = this.horairesImm();
      const chezSoi = () => { const c = this.caseLogement(n.L); if (!this.allerImm(n, c, n.L.niveau)) { this.rentreHabitant(n); } };
      const attendre = (k = 1) => { n.t = hasard(VOISINS.wait) * k; };
      // la nuit : chacun se couche (au lit s'il est chez lui ; sinon il rentre tout de suite)
      if (this.dortImm(H)) {
        if (n.etat === 'dort') { n.t = 2; return; }
        if (n.etat === 'versLit') { this.coucheHabitant(n); return; }
        if (n.cache || !this.dansImm(n)) { this.rentreHabitant(n); this.coucheHabitant(n); return; }
        n.geste = null;
        n.etat = 'versLit';
        if (!this.allerImm(n, this.litImm(n), n.L.niveau)) this.coucheHabitant(n);
        return;
      }
      switch (n.etat) {
        case 'dort': {
          // le lever : au pied de son lit
          const p = this.litImm(n);
          n.x = p.x; n.y = p.y; n.niv = n.L.niveau;
          n.cache = false;
          n.etat = 'dedans';
          attendre();
          return;
        }
        case 'versTravail':
          // à la porte de la fromagerie : il entre, sa journée commence
          n.etat = 'travail';
          this.cacheHabitant(n);
          n.t = 2;
          return;
        case 'travail': {
          if (h < fin) { n.t = 2; return; }
          // la journée finie : il ressort, et va au marché
          const p = this.portesImm().fromagerie;
          if (p) { n.x = p.x; n.y = p.y; }
          n.niv = 0;
          n.cache = false;
          this.montreHabitant(n);
          const e = this.etalImm();
          n.etat = 'versMarche';
          if (!e || !this.allerImm(n, e, 0)) { n.etat = 'achete'; n.t = 0.01; }
          return;
        }
        case 'versMarche':
          // devant l'étal : il achète les ingrédients du dîner
          n.etat = 'achete';
          n.face = 'haut';
          n.s.setFlipX(false);
          n.t = VIE.achat;
          return;
        case 'achete':
          n.panier = 1;
          n.jourMarche = jour;
          n.etat = 'retour';
          chezSoi();
          return;
        case 'retour':
          // chez lui, le panier posé : le dîner (plus bas)
          n.panier = 0;
          n.etat = 'dedans';
          break;
        case 'versFeu':
          n.etat = 'cuisine';
          n.face = 'cote';
          n.s.setFlipX(n.L.feu.flip);
          n.t = VIE.cuisson;
          return;
        case 'cuisine':
          this.faitsImmDe(n.L, jour).cuisine = true;
          n.geste = null;
          n.etat = 'dedans';
          attendre();
          return;
        default:
      }
      // chez lui
      if (!n.m.enfant) {
        if (h >= this.departImm() && h < fin && n.jourTravail !== jour) {
          // le matin : au travail (il descend, sort, va à la fromagerie)
          n.jourTravail = jour;
          const p = this.portesImm().fromagerie;
          n.etat = 'versTravail';
          if (!p || !this.allerImm(n, p, 0)) { n.etat = 'travail'; this.cacheHabitant(n); n.t = 2; }
          return;
        }
        // rentré du marché : le premier qui est là cuisine le dîner
        const faits = this.faitsImmDe(n.L, jour);
        const cuisinier = this.habitants.some((q) => q.L === n.L && (q.etat === 'versFeu' || q.etat === 'cuisine'));
        if (n.jourMarche === jour && !faits.cuisine && !cuisinier) {
          n.etat = 'versFeu';
          if (!this.allerImm(n, n.L.feu, n.L.niveau)) { n.etat = 'cuisine'; n.t = VIE.cuisson; }
          return;
        }
      }
      // il va et vient dans le logement
      chezSoi();
      attendre(n.m.enfant ? 1 : 1.5);
    },

    // Un étal du marché, au hasard : le point devant lui.
    etalImm() {
      const l = (this.lieux || []).filter((o) => o.name === 'marche');
      if (!l.length) return null;
      const o = l[Math.floor(Math.random() * l.length)];
      return { x: Math.round(o.x + o.width / 2), y: Math.round(o.y + o.height + T - 2) };
    },

    // Rentré d'un coup (le soir venu, au travail ou en chemin) : chez lui.
    rentreHabitant(n) {
      const c = this.caseLogement(n.L);
      n.x = c.x; n.y = c.y; n.niv = n.L.niveau;
      n.path = [];
      n.panier = 0;
      n.etat = 'dedans';
      n.cache = false;
      this.montreHabitant(n);
    },

    // Au lit : on ne le voit plus (la couverture par-dessus).
    coucheHabitant(n) {
      const p = this.litImm(n);
      n.x = p.x; n.y = p.y; n.niv = n.L.niveau;
      n.path = [];
      n.geste = null;
      n.panier = 0;
      n.etat = 'dort';
      n.cache = true;
      n.t = 2;
    },

    cacheHabitant(n, deja) {
      n.path = [];
      if (deja || reduced()) { n.cache = true; return; }
      this.tweens.add({ targets: [n.s, n.shadow], alpha: 0, duration: 500, onComplete: () => {
        n.cache = n.etat === 'travail' || n.etat === 'dort';
        n.s.setAlpha(1); n.shadow.setAlpha(0.3);
      } });
    },

    montreHabitant(n) {
      this.tweens.killTweensOf([n.s, n.shadow]);
      n.s.setAlpha(1);
      n.shadow.setAlpha(0.3);
    },

    // Son image, à sa place : dehors, ou dans l'immeuble à son niveau (remonté, et devant le
    // voile s'il est à un étage) quand on y est aussi.
    placeHabitant(n, time, marche) {
      const F = this.npcFrame, im = this.immeuble;
      let frame;
      if (n.geste && !marche) frame = F(n.geste);
      else if (marche) frame = F.de(n.panier ? 'panier' : 'marche', n.face, Math.floor(n.walked / 4) % 4);
      else frame = F.de('idle', n.face, Math.floor(time / 600 + n.m.perso) % 2);
      const dedans = this.dansImm(n);
      const vu = !n.cache && (!dedans || (im.vue !== 'dehors' && n.niv === (this.niveauVille || 0)));
      n.s.setVisible(vu);
      n.shadow.setVisible(vu);
      if (!vu) return;
      const lift = n.niv * I.dy;
      const z = n.niv ? this.immeubleZ((Math.floor((n.y - 1) / T) + 1) * T + n.niv * 0.2 - 0.02) : n.y;
      n.s.setFrame(frame);
      n.s.setPosition(Math.round(n.x), Math.round(n.y - lift)).setDepth(z);
      n.shadow.setPosition(Math.round(n.x), Math.round(n.y - lift)).setDepth(n.niv ? z - 1e-6 : n.y - 0.5);
    },

    // ---------- ce qu'ils racontent ----------

    // Un toucher sur un habitant : il s'arrête et raconte sa journée (paroleHabitant).
    tapHabitant(w) {
      const n = (this.habitants || []).find((q) => q.s.visible && Math.abs(w.x - q.s.x) <= 8 && w.y <= q.s.y + 3 && w.y >= q.s.y - (q.m.enfant ? 24 : 30));
      if (!n) return false;
      if (!n.geste && n.etat !== 'achete') {
        n.talk = 3;
        n.face = 'cote';
        n.s.setFlipX(this.heroPos.x < n.x);
      }
      this.say(this.paroleHabitant(n));
      return true;
    },

    paroleHabitant(n) {
      const qui = `${n.m.prenom} ${n.f.nom}`, eco = this.ecoImm, fo = eco && eco.foyers[n.L.nom];
      const [debut, fin] = this.horairesImm();
      if (n.m.enfant) return `👋 ${qui} : « Mes parents travaillent à la fromagerie 🧀 ! Ils rentrent après ${fin} h, avec les courses du marché. »`;
      const salaire = (eco && eco.salaire) || VIE.salaire;
      const travail = `Je travaille à la fromagerie de ${debut} h à ${fin} h, pour ${salaire} 💰 par jour.`;
      if (!fo) return `🧀 ${qui} : « ${travail} »`;
      const N = eco.noms || {}, hier = fo.hier;
      const humeur = fo.bonheur >= VIE.humeur[0] ? '😊' : fo.bonheur >= VIE.humeur[1] ? '🙂' : '😟';
      let dit = '';
      if (hier) {
        const achats = Object.entries(hier.achats || {}).map(([i, k]) => `${k} ${N[i] || i}`);
        dit = achats.length ? ` Hier, on a acheté au marché ${liste(achats)} (${hier.achete} 💰).` : ' Hier, on n\'a rien pu acheter au marché.';
        dit += hier.plats.length ? ` Au dîner : ${liste(hier.plats.map((p) => N[p] || p))}.` : '';
        if (hier.couverture < 100) dit += ' On n\'a pas mangé à notre faim…';
      }
      if (n.etat === 'achete') dit = ' Je fais les courses pour le dîner !' + dit;
      return `🧀 ${qui}, à la fromagerie : « ${travail}${dit} » (${fo.argent} 💰 de côté, bonheur ${fo.bonheur} ${humeur})`;
    },
  });
})(window);
