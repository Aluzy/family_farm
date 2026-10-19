/* carte/ville/habitants.js — la scène de la ville : les familles des immeubles d'habitation.
 *
 * Chaque logement des immeubles en blocs (js/carte/ville/immeuble.js : dans le grand immeuble
 * ocre, deux par niveau, à gauche et à droite du hall ; dans les résidences de l'ouest, un par
 * niveau) a sa famille, tirée comme celles des voisins (V.voisins, un lit chacun : deux
 * adultes et un enfant) ; le moteur tient son économie (js/engine/voisins.js : FermeHote.immeuble).
 * Les adultes travaillent à la fromagerie de la ville (VOISINS.FROMAGER.HORAIRES, data/ville.json)
 * et y gagnent leur salaire ; la carte montre leur journée, à l'heure du jeu (IMMEUBLE.vie) :
 *
 *   - le matin, chaque adulte descend l'escalier, sort par la porte de son immeuble et va à pied
 *     à la fromagerie (il part assez tôt pour y être à l'heure) ; il y entre, et n'est plus sur
 *     la carte de la journée ;
 *   - à la fin de sa journée, il en ressort, passe par un étal du marché de la ville acheter
 *     les ingrédients du dîner, et rentre chez lui son panier plein ;
 *   - le premier rentré cuisine devant le four du logement ;
 *   - les enfants vont à l'école comme ceux de la ferme : les jours d'école
 *     (HorlogeSortie.JOURS_ECOLE), de CarteKit.ECOLE.debut h à fin h ; ils y vont à pied (ils
 *     habitent en ville : pas de bus), et chacun part de chez lui le temps qu'il lui faut pour y
 *     être à l'heure (la longueur de son chemin, à sa vitesse : departEcole) ; ils entrent par
 *     la porte de l'école (le bout du chemin des enfants qui descendent du bus, couche « bus »)
 *     et rentrent à pied à la fin de l'école ; le reste du temps, ils sont à la maison ;
 *   - de IMMEUBLE.vie.sommeil[0] h à sommeil[1] h, chacun dort dans la chambre (on ne le voit
 *     plus).
 *
 * Un habitant marche sur son niveau (le rez-de-chaussée : la marche de la carte ; un étage : la
 * marche de son niveau) et change de niveau par l'escalier, comme le personnage. On le voit
 * dehors, ou dans son immeuble quand on y est, à son niveau. Un toucher sur lui : il raconte son
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

  // Les logements des immeubles : { nom (celui du moteur : `logement` de son immeuble, et son
  // numéro ; `seul` : le nom tout court), bat (son immeuble : IMMEUBLE.batiments), niveau, cote
  // (son rang dans le niveau : le logement du plan, V.planImmeuble), lits (combien) }.
  V.logementsImmeuble = () => {
    const out = [];
    for (const b of I.batiments) {
      let k = 0;
      for (let n = 0; n < b.niveaux; n++) {
        V.planImmeuble(b, n, b.niveaux).logements.forEach((lg, c) => out.push({ nom: b.seul ? b.logement : `${b.logement}_${++k}`, bat: b, niveau: n, cote: c, lits: lg.lits.length }));
      }
    }
    return out;
  };
  // La famille d'un logement (tirée une fois, gardée comme celles des voisins) : dans une
  // maison ou un studio, deux adultes et autant d'enfants qu'il reste de lits.
  V.familleImmeuble = (L) => (L.bat.plan === 'maison' || L.bat.enfants != null ? V.voisins('immeuble:' + L.nom, L.lits, L.lits - 2) : V.voisins('immeuble:' + L.nom, VIE.lits));

  // Le point (px) où poser les pieds sur la case (x, y) du niveau `niv` de l'immeuble `im`.
  const pied = (im, x, y, niv = 0) => ({ x: (im.x + x) * T + T / 2, y: (im.y + y) * T + T - 2, niv });

  V.partie({

    // Les familles des immeubles : chacune chez elle (ou déjà partie au travail, ou couchée,
    // selon l'heure).
    makeHabitants() {
      this.habitants = [];
      if (!this.immeubles || !this.immeubles.length) return;
      const noms = (this.cache.json.get('perso_cases') || {}).frames || [];
      this.npcFrame = this.npcFrame || K.cases(noms);
      const logements = V.logementsImmeuble();
      for (const L of logements) L.im = this.immeubles.find((q) => q.b === L.bat);
      const H = hote();
      this.ecoImm = H && H.immeuble ? H.immeuble(logements.map((L) => {
        const f = V.familleImmeuble(L);
        return { logement: L.nom, adultes: f.membres.filter((q) => !q.enfant).length, enfants: f.membres.filter((q) => q.enfant).length };
      })) : null;
      this.faitsImm = {};
      const h = global.HorlogeSortie ? global.HorlogeSortie.maintenant() : null;
      for (const L of logements) {
        if (!L.im) continue;
        this.poseLogement(L);
        const f = V.familleImmeuble(L);
        f.membres.forEach((mb, i) => {
          const key = sheetKey(mb.perso, mb.enfant);
          if (!this.textures.exists(key)) return;
          const rang = f.membres.slice(0, i).filter((q) => q.enfant === mb.enfant).length;
          const c = this.caseLogement(L);
          const s = this.add.sprite(c.x, c.y, key, this.npcFrame('idle_bas_0')).setOrigin(0.5, 30 / 32);
          const shadow = this.add.ellipse(c.x, c.y, mb.enfant ? 9 : 11, 4, 0x1e1a18, 0.3);
          const n = { m: mb, f, L, s, shadow, x: c.x, y: c.y, niv: c.niv, path: [], face: 'bas', walked: 0, rang,
            speed: mb.enfant ? VOISINS.kidSpeed : VOISINS.speed, etat: 'dedans', t: Math.random() * 2, cache: false, panier: 0, geste: null, talk: 0 };
          this.habitants.push(n);
          this.debutHabitant(n, h);
        });
      }
    },

    // Les cases d'un logement : celles où l'on va et vient (libres), le pied des lits, la place
    // devant le four (et de quel côté il est) : celles du plan de son niveau (V.planImmeuble ;
    // chacune avec son niveau : une maison en a deux).
    poseLogement(L) {
      const im = L.im, lg = im.niveaux[L.niveau].plan.logements[L.cote];
      L.libres = [];
      for (const niv of lg.niveaux || [L.niveau]) {
        const nv = im.niveaux[niv];
        for (let y = 1; y < im.h - 1; y++) {
          for (let x = 1; x < im.w - 1; x++) if (lg.dans(x, y, niv) && nv.marche[y][x] && nv.grille[y][x] === '.') L.libres.push(pied(im, x, y, niv));
        }
      }
      L.lits = lg.lits.map(([x, y, niv = L.niveau]) => pied(im, x, y, niv));
      L.feu = { ...pied(im, lg.feu[0], lg.feu[1], L.niveau), flip: lg.flip };
    },

    // Le pied du lit de `n` (les adultes : le grand lit ; chaque enfant : le sien).
    litImm(n) {
      const l = n.L.lits;
      return l[Math.min(l.length - 1, n.m.enfant ? 2 + n.rang : n.rang)];
    },

    caseLogement(L) {
      const l = L.libres;
      return l.length ? l[Math.floor(Math.random() * l.length)] : pied(L.im, L.im.w / 2, L.im.h - 2, L.niveau);
    },

    // Où est l'habitant `n` quand la carte s'ouvre, d'après l'heure.
    debutHabitant(n, H) {
      const h = this.heureImm(H), [debut, fin] = this.horairesImm();
      const jour = H ? H.jour : 0;
      if (this.dortImm(H)) { this.coucheHabitant(n); return; }
      if (n.m.enfant) {
        if (this.ecoleImm(n, H)) { n.jourEcole = jour; this.cacheHabitant(n, true); n.etat = 'ecole'; }
        return;
      }
      if (h >= this.departImm(n.L.im) && h < fin) { n.jourTravail = jour; this.cacheHabitant(n, true); n.etat = 'travail'; return; }
      // (rentré du marché : le dîner est fait, ou à faire)
      if (h >= fin) { n.jourTravail = n.jourMarche = jour; }
      if (h < debut && h >= this.departImm(n.L.im)) n.jourTravail = jour;
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
    // L'enfant `n` doit-il être à l'école (ou en chemin) ? Un jour d'école, de son départ
    // (departEcole) à la fin de l'école (CarteKit.ECOLE).
    ecoleImm(n, H) {
      const S = global.HorlogeSortie;
      if (!H || H.nuit || !S || !S.JOURS_ECOLE.includes(H.semaine)) return false;
      const h = this.heureImm(H);
      return h >= this.departEcole(n) && h < K.ECOLE.fin;
    },
    // L'heure où l'enfant `n` part de chez lui pour être à l'école à l'heure : le temps de faire
    // son chemin (de sa chambre à la porte de l'école, escaliers compris), à sa vitesse, et la
    // marge (CarteKit.ECOLE). Calculée une fois.
    departEcole(n) {
      if (n.departEcoleH == null) {
        const p = this.porteEcole(), lit = this.litImm(n);
        const essai = { L: n.L, niv: lit.niv, x: lit.x, y: lit.y, path: [] };
        const L = p && this.allerImm(essai, p, 0) ? K.longueur(essai.path, lit) : 0;
        n.departEcoleH = K.ECOLE.debut - K.heuresDeMarche(L, n.speed) - K.ECOLE.marge;
      }
      return n.departEcoleH;
    },
    // La porte de l'école : le bout du chemin des enfants qui descendent du bus le matin.
    porteEcole() {
      const l = (this.kidPaths || {}).enfants_matin;
      return l && l.length ? l[l.length - 1] : null;
    },

    // L'heure du départ au travail des adultes de l'immeuble `im` : le temps du trajet (à pied,
    // jusqu'à la fromagerie) avant l'embauche, et une marge.
    departImm(im) {
      if (im.departH == null) im.departH = Math.max(VIE.sommeil[1] + 0.25, this.horairesImm()[0] - this.trajetImm(im, this.portesImm(im).fromagerie) - VIE.marge);
      return im.departH;
    },

    // Le temps (en heures du jeu) d'aller à pied de l'immeuble `im` au point `p` (0 : pas de
    // chemin).
    trajetImm(im, p) {
      const o = this.portesImm(im).sortie, l = p ? this.findPath(o.x, o.y, p.x, p.y, this.libreNiv(im, 0)) : null;
      if (!l) return 0;
      let d = 0;
      for (let i = 0, a = o; i < l.length; a = l[i++]) d += Math.hypot(l[i].x - a.x, l[i].y - a.y);
      // (le temps de descendre et de sortir : une vingtaine de cases)
      return (d + 20 * T) / VIE.vitesse / VIE.sParHeure;
    },

    // La sortie de l'immeuble `im` (devant sa porte), la porte de la fromagerie (devant le
    // milieu de sa façade).
    portesImm(im) {
      const b = (this.buildings || []).find((q) => q.name === VIE.travail);
      return {
        sortie: pied(im, im.niveaux[0].plan.porte, im.h),
        fromagerie: b ? { x: Math.round((b.x0 + b.x1) / 2), y: b.base + T - 2 } : null,
      };
    },

    // ---------- marcher, d'un niveau à l'autre ----------

    // La marche du niveau `niv` de l'immeuble `im` : (gx, gy) → y marche-t-on ? (le
    // rez-de-chaussée : celle de la carte ; un étage : celle de son niveau)
    libreNiv(im, niv) {
      if (!niv) return (gx, gy) => !!(this.walk[gy] && this.walk[gy][gx]);
      const nv = im.niveaux[niv];
      return (gx, gy) => V.dansImmeuble(im, gx, gy) && nv.marche[gy - im.y][gx - im.x];
    },

    // L'escalier du niveau `niv` de l'immeuble `im` qui monte (U) ou descend (D) : son point (px).
    escalierImm(im, niv, c) {
      const G = im.niveaux[niv].grille;
      for (let y = 0; y < G.length; y++) { const x = G[y].indexOf(c); if (x >= 0) return pied(im, x, y); }
      return null;
    },

    // Le chemin de `n` jusqu'au point `p` du niveau `niv` (de son immeuble) : par les escaliers
    // s'il faut changer de niveau (un point { niv } : il arrive sur le niveau d'à côté). false :
    // pas de chemin.
    allerImm(n, p, niv = 0) {
      const pts = [], im = n.L.im;
      let a = n.niv, x = n.x, y = n.y;
      while (a !== niv) {
        const e = this.escalierImm(im, a, niv > a ? 'U' : 'D');
        const l = e && this.findPath(x, y, e.x, e.y, this.libreNiv(im, a));
        if (!l) return false;
        pts.push(...l);
        a += niv > a ? 1 : -1;
        pts.push({ x: e.x, y: e.y, niv: a });
        x = e.x; y = e.y;
      }
      const l = this.findPath(x, y, p.x, p.y, this.libreNiv(im, a));
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
        // (l'heure de partir pour l'école : il laisse ce qu'il faisait au logement)
        if (n.m.enfant && n.etat === 'dedans' && n.path.length && n.jourEcole !== (H && H.jour) && this.ecoleImm(n, H)) { n.path = []; n.t = 0; }
        if (n.talk > 0) n.talk -= dt;
        else if (n.path.length) {
          const to = n.path[0], dx = to.x - n.x, dy = to.y - n.y, l = Math.hypot(dx, dy);
          // (dehors, un adulte marche d'un bon pas ; un enfant, à son pas)
          const st = (this.dansImm(n) || n.m.enfant ? n.speed : VIE.vitesse) * dt;
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

    // Dans l'emprise de son immeuble ?
    dansImm(n) {
      return V.dansImmeuble(n.L.im, Math.floor(n.x / T), Math.floor((n.y - 1) / T));
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
      const chezSoi = () => { const c = this.caseLogement(n.L); if (!this.allerImm(n, c, c.niv)) { this.rentreHabitant(n); } };
      const attendre = (k = 1) => { n.t = hasard(VOISINS.wait) * k; };
      // la nuit : chacun se couche (au lit s'il est chez lui ; sinon il rentre tout de suite)
      if (this.dortImm(H)) {
        if (n.etat === 'dort') { n.t = 2; return; }
        if (n.etat === 'versLit') { this.coucheHabitant(n); return; }
        if (n.cache || !this.dansImm(n)) { this.rentreHabitant(n); this.coucheHabitant(n); return; }
        n.geste = null;
        n.etat = 'versLit';
        const lit = this.litImm(n);
        if (!this.allerImm(n, lit, lit.niv)) this.coucheHabitant(n);
        return;
      }
      switch (n.etat) {
        case 'dort': {
          // le lever : au pied de son lit
          const p = this.litImm(n);
          n.x = p.x; n.y = p.y; n.niv = p.niv;
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
          const p = this.portesImm(n.L.im).fromagerie;
          if (p) { n.x = p.x; n.y = p.y; }
          n.niv = 0;
          n.cache = false;
          this.montreHabitant(n);
          const e = this.etalImm();
          n.etat = 'versMarche';
          if (!e || !this.allerImm(n, e, 0)) { n.etat = 'achete'; n.t = 0.01; }
          return;
        }
        case 'versEcole':
          // à la porte de l'école : il entre
          n.etat = 'ecole';
          this.cacheHabitant(n);
          n.t = 2;
          return;
        case 'ecole': {
          if (this.ecoleImm(n, H)) { n.t = 2; return; }
          // l'école finie : il ressort et rentre à pied
          const p = this.porteEcole();
          if (p) { n.x = p.x; n.y = p.y; }
          n.niv = 0;
          n.cache = false;
          this.montreHabitant(n);
          n.etat = 'retour';
          chezSoi();
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
      if (n.m.enfant && this.ecoleImm(n, H) && n.jourEcole !== jour) {
        // le matin : à l'école (il descend, sort, y va à pied)
        n.jourEcole = jour;
        const p = this.porteEcole();
        n.etat = 'versEcole';
        if (!p || !this.allerImm(n, p, 0)) { n.etat = 'ecole'; this.cacheHabitant(n); n.t = 2; }
        return;
      }
      if (!n.m.enfant) {
        if (h >= this.departImm(n.L.im) && h < fin && n.jourTravail !== jour) {
          // le matin : au travail (il descend, sort, va à la fromagerie)
          n.jourTravail = jour;
          const p = this.portesImm(n.L.im).fromagerie;
          n.etat = 'versTravail';
          if (!p || !this.allerImm(n, p, 0)) { n.etat = 'travail'; this.cacheHabitant(n); n.t = 2; }
          return;
        }
        // rentré du marché : le premier qui est là cuisine le dîner
        const faits = this.faitsImmDe(n.L, jour);
        const cuisinier = this.habitants.some((q) => q.L === n.L && (q.etat === 'versFeu' || q.etat === 'cuisine'));
        if (n.jourMarche === jour && !faits.cuisine && !cuisinier) {
          n.etat = 'versFeu';
          if (!this.allerImm(n, n.L.feu, n.L.feu.niv)) { n.etat = 'cuisine'; n.t = VIE.cuisson; }
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
      n.x = c.x; n.y = c.y; n.niv = c.niv;
      n.path = [];
      n.panier = 0;
      n.etat = 'dedans';
      n.cache = false;
      this.montreHabitant(n);
    },

    // Au lit : on ne le voit plus (la couverture par-dessus).
    coucheHabitant(n) {
      const p = this.litImm(n);
      n.x = p.x; n.y = p.y; n.niv = p.niv;
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
        n.cache = n.etat === 'travail' || n.etat === 'ecole' || n.etat === 'dort';
        n.s.setAlpha(1); n.shadow.setAlpha(0.3);
      } });
    },

    montreHabitant(n) {
      this.tweens.killTweensOf([n.s, n.shadow]);
      n.s.setAlpha(1);
      n.shadow.setAlpha(0.3);
    },

    // Son image, à sa place : dehors, ou dans son immeuble à son niveau (remonté, et devant le
    // voile s'il est à un étage) quand on y est aussi.
    placeHabitant(n, time, marche) {
      const F = this.npcFrame, im = n.L.im;
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
      if (n.m.enfant) {
        const E = K.ECOLE, h = (x) => { const m = Math.round(x * 60); return `${Math.floor(m / 60)} h${m % 60 ? String(m % 60).padStart(2, '0') : ''}`; };
        const ecole = n.etat === 'versEcole' ? `Je vais à l'école, elle commence à ${h(E.debut)} : je ne dois pas être en retard !` : n.etat === 'retour' ? 'Je rentre de l\'école !'
          : `L'école commence à ${h(E.debut)} : je pars à ${h(Math.ceil(this.departEcole(n) * 12) / 12)}, à pied, pour y être à l'heure. Elle finit à ${h(E.fin)}.`;
        return `👋 ${qui} : « ${ecole} Mes parents travaillent à la fromagerie 🧀 ; ils rentrent après ${fin} h, avec les courses du marché. »`;
      }
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
