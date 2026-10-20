/* carte/ville/habitants.js — la scène de la ville : les familles des immeubles et des maisons.
 *
 * Chaque logement des immeubles en blocs et chaque maison (js/carte/ville/immeuble.js) a sa
 * famille, tirée comme celles des voisins (V.voisins, un lit chacun) ; le moteur tient son
 * économie (js/engine/voisins.js : FermeHote.immeuble). Chaque adulte a son poste (VOISINS.EMPLOIS,
 * data/ville.json : un métier, un lieu, ses horaires en un ou deux services, son salaire) ; la
 * carte montre leur journée, à l'heure du jeu (IMMEUBLE.vie) :
 *
 *   - avant chaque service, l'adulte descend l'escalier, sort et va à pied à son lieu (il part
 *     assez tôt pour y être à l'heure : le temps du trajet, et une marge). Dans un lieu bâti en
 *     blocs (js/carte/ville/lieux.js), il entre et se tient à sa place, qu'on voit quand on y
 *     entre aussi ; ailleurs (la fromagerie, la conserverie, la confiturerie, l'école de la carte,
 *     l'amphithéâtre ; la gare pour ceux qui travaillent hors de la ville), il entre et n'est plus
 *     sur la carte jusqu'à la fin du service ;
 *   - quand c'est plus court qu'à pied (le chemin jusqu'à l'arrêt, l'attente, le trajet, le
 *     chemin depuis l'arrêt : planBus), il prend le bus (js/carte/ville/lignes.js) : il va à
 *     l'arrêt, attend, monte (on ne le voit plus), descend à son arrêt et finit à pied ; la
 *     famille paie les tickets de chaque jour (FermeHote.busImm). Ceux qui ont une voiture
 *     (VOITURES.part des adultes : les plus longs chemins jusqu'au travail) la prennent plutôt
 *     (js/carte/ville/voitures.js). Pour le travail et l'école, l'heure de départ en tient
 *     compte (n.plans : { bus } ou { voiture }) ;
 *   - entre deux services, il rentre chez lui ; après le dernier (assez tôt : IMMEUBLE.vie.marche),
 *     il passe par un étal du marché acheter les ingrédients du dîner, et rentre son panier plein ;
 *   - le premier rentré du marché cuisine devant le four du logement ;
 *   - les enfants vont à l'école comme ceux de la ferme : les jours d'école
 *     (HorlogeSortie.JOURS_ECOLE), de CarteKit.ECOLE.debut h à fin h, chacun à l'une des trois
 *     écoles de la ville (la plus proche qui a de la place : repartitEcoles). Ils y vont à pied et
 *     partent le temps qu'il leur faut pour y être à l'heure (departEcole) ; dans les écoles 2 et
 *     3, ils prennent place derrière leur pupitre ;
 *   - le soir, la famille qui sort (le moteur l'a décidé cette nuit : sa sortie, au cinéma, au
 *     musée ou à l'amphithéâtre ; js/engine/economie.js, sortieVille) y va à pied à
 *     IMMEUBLE.vie.sortie[0] h, une fois le dîner fait : au cinéma et au musée, on la voit dans la
 *     salle quand on y entre ; elle rentre à sortie[1] h ;
 *   - chacun dort de IMMEUBLE.vie.sommeil[0] h à sommeil[1] h (on ne le voit plus) ; ceux qui
 *     commencent tôt se lèvent plus tôt, ceux qui finissent tard se couchent plus tard.
 *
 * Un habitant marche sur son niveau (le rez-de-chaussée : la marche de la carte ; un étage : la
 * marche de son niveau) et change de niveau par l'escalier, comme le personnage. On le voit
 * dehors, ou dans un immeuble ou un lieu quand on y est, à son niveau. Un toucher sur lui : il
 * raconte son travail et ses achats d'hier (paroleHabitant).
 *
 * Méthodes de la scène des cartes (js/ville-carte.js), posées sur son prototype : `this` est
 * la scène (voir docs/architecture-phaser.md).
 */
(function (global) {
  'use strict';

  const K = global.CarteKit;
  const V = global.CarteVille;
  const { T, IMMEUBLE: I, VOISINS, LIGNES, VOITURES } = V.C;
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
          if (!mb.enfant) n.emploi = this.emploiDe(L, rang);
          this.habitants.push(n);
        });
      }
      // (les places de travail, l'école de chaque enfant, puis chacun là où l'heure le met)
      this.lieuxT = {};
      for (const n of this.habitants) if (n.emploi) n.place = this.placeTravail(n.emploi.lieu);
      this.repartitEcoles();
      // (les voitures : aux adultes qui ont le plus long chemin à pied jusqu'à leur travail)
      const adultes = this.habitants.filter((n) => n.emploi);
      adultes.map((n) => ({ n, d: this.trajetVers(n.L.im, n.emploi.lieu) })).sort((a, b) => b.d - a.d)
        .slice(0, Math.round(adultes.length * VOITURES.part)).forEach(({ n }) => { n.voiture = true; });
      for (const n of this.habitants) this.debutHabitant(n, h);
      // les trajets en bus de chaque jour (aller et retour), par logement : leurs tickets
      if (H && H.busImm && this.lignes && this.lignes.length) {
        const trajets = {};
        for (const n of this.habitants) {
          let k = 0;
          if (n.emploi) n.emploi.horaires.forEach((_, s) => { this.departService(n, s); if (n.plans[s] && n.plans[s].bus) k += 2; });
          else if (n.m.enfant) { this.departEcole(n); if (n.planEcole && n.planEcole.bus) k += 2; }
          if (k) trajets[n.L.nom] = (trajets[n.L.nom] || 0) + k;
        }
        H.busImm(trajets);
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
      const h = this.heureImm(H), jour = H ? H.jour : 0;
      if (this.dortImm(H, n)) { this.coucheHabitant(n); return; }
      // (le soir de sortie : déjà au loisir)
      const so = this.sortieDe(n.L), sort = so && h >= VIE.sortie[0] + 0.5 && h < VIE.sortie[1];
      if (n.m.enfant) {
        if (this.ecoleImm(n, H)) { n.jourEcole = jour; this.arriveEcole(n, true); } else if (sort) this.partSortie(n, so, jour, true);
        return;
      }
      n.faits = [];
      const S = n.emploi.horaires;
      for (let k = 0; k < S.length; k++) {
        if (h >= S[k][1]) { n.faits[k] = jour; continue; }
        // (en plein service : à sa place)
        if (h >= this.departService(n, k)) { n.faits[k] = jour; n.service = k; this.arriveTravail(n, true); return; }
      }
      // (rentré du marché après son dernier service : le dîner est fait, ou à faire)
      if (h >= S[S.length - 1][1]) n.jourMarche = jour;
      if (sort && h >= S[S.length - 1][1]) { this.faitsImmDe(n.L, jour).cuisine = true; this.partSortie(n, so, jour, true); }
    },

    // ---------- l'heure ----------

    heureImm(H) {
      return H ? ((H.heure % 24) + 24) % 24 : 12;
    },
    // Dort-il (`n` : son lever et son coucher ; sans : ceux de tous) ?
    dortImm(H, n) {
      if (!H) return false;
      const h = this.heureImm(H);
      return !!H.nuit || h >= this.coucherHab(n) || h < this.leverHab(n);
    },
    // Son lever : IMMEUBLE.vie.sommeil[1], ou plus tôt s'il part plus tôt au travail.
    leverHab(n) {
      const S = VIE.sommeil[1];
      return n && n.emploi ? Math.min(S, this.departService(n, 0) - 0.25) : S;
    },
    // Son coucher : IMMEUBLE.vie.sommeil[0], ou plus tard s'il rentre plus tard du travail.
    coucherHab(n) {
      const S = VIE.sommeil[0];
      if (!n || !n.emploi) return S;
      const H = n.emploi.horaires, fin = H[H.length - 1][1];
      return Math.min(23.9, Math.max(S, fin + this.trajetVers(n.L.im, n.emploi.lieu) + 0.25));
    },

    // ---------- le travail ----------

    // Le poste de l'adulte de rang `rang` du logement `L` (celui que le moteur lui donne) :
    // { cle, metier, lieu, horaires, salaire } ; sans moteur : ouvrier à la fromagerie
    // (IMMEUBLE.vie).
    emploiDe(L, rang) {
      const eco = this.ecoImm, fo = eco && eco.foyers[L.nom], cle = fo && fo.emplois && fo.emplois[rang];
      const e = cle && (eco.emplois || []).find((q) => `${q.METIER}:${q.LIEU}` === cle);
      if (e) return { cle, metier: e.METIER, lieu: e.LIEU, horaires: e.HORAIRES, salaire: e.SALAIRE };
      return { cle: 'ouvrier:' + VIE.travail, metier: 'ouvrier', lieu: VIE.travail, horaires: [VIE.horaires], salaire: VIE.salaire };
    },

    // Le lieu de travail `lieu` : { porte (devant sa porte, dehors), im (un lieu bâti en blocs :
    // on y entre), places (les cases où l'on se tient, au rez-de-chaussée), k (les places déjà
    // données) } ; null : pas sur la carte. Ceux qui travaillent hors de la ville vont à la gare
    // (IMMEUBLE.vie.horsVille) ; l'amphithéâtre est un point du parc (IMMEUBLE.vie.points).
    lieuTravail(lieu) {
      if (lieu in this.lieuxT) return this.lieuxT[lieu];
      let r = null;
      const im = (this.immeubles || []).find((q) => q.b.nom === lieu);
      if (im) {
        // (d'abord derrière le comptoir ou devant le tableau : VIE.postes ; puis toute la pièce)
        const nv = im.niveaux[0], places = [], vu = new Set();
        const libre = (x, y) => y > 0 && y < im.h - 2 && x > 0 && x < im.w - 1 && nv.marche[y][x] && nv.grille[y][x] === '.' && !vu.has(y * 99 + x);
        const ajoute = (x, y) => { if (libre(x, y)) { vu.add(y * 99 + x); places.push(pied(im, x, y)); } };
        for (const mb of nv.plan.meubles) {
          const dy = VIE.postes[mb.nom];
          if (dy) for (let i = 0; i < mb.w; i++) ajoute(mb.x + i, dy < 0 ? mb.y - 1 : mb.y + mb.h);
        }
        const prio = places.length;
        for (let y = 1; y < im.h - 2; y++) for (let x = 1; x < im.w - 1; x++) ajoute(x, y);
        r = { im, porte: pied(im, nv.plan.porte, im.h), places, prio, k: 0 };
      } else {
        const nom = VIE.horsVille[lieu] || lieu, pt = VIE.points[nom];
        const b = (this.buildings || []).find((q) => q.name === nom);
        if (b) r = { porte: { x: Math.round((b.x0 + b.x1) / 2), y: b.base + T - 2 } };
        else if (pt) r = { porte: { x: pt[0] * T + T / 2, y: pt[1] * T + T - 2 } };
      }
      return (this.lieuxT[lieu] = r);
    },

    // La place d'un nouvel employé du lieu `lieu` (null : il n'y entre pas, on ne le voit plus) :
    // le premier, derrière le comptoir ou devant le tableau (s'il y en a) ; les autres, répartis
    // sur toute la pièce.
    placeTravail(lieu) {
      const t = this.lieuTravail(lieu);
      if (!t || !t.places || !t.places.length) return null;
      const l = t.places, k = t.k++;
      if (!k && t.prio) return l[0];
      const reste = l.slice(t.prio ? 1 : 0), pas = Math.max(1, Math.floor(reste.length / 6)), j = k - (t.prio ? 1 : 0);
      return reste[(j * pas + Math.floor((j * pas) / reste.length)) % reste.length];
    },

    // L'heure où `n` part pour son service `k` : le trajet (à pied, jusqu'à son lieu) avant le
    // début, et la marge. Calculée une fois.
    // (en voiture ou en bus, s'il est plus court : n.plans[k], planTrajet)
    departService(n, k) {
      n.departs = n.departs || [];
      n.plans = n.plans || [];
      if (n.departs[k] == null) {
        const debut = n.emploi.horaires[k][0], pied = this.trajetVers(n.L.im, n.emploi.lieu);
        const t = this.lieuTravail(n.emploi.lieu), p = t && (n.place || t.porte);
        const m = p && this.planTrajet(n, this.portesImm(n.L.im).sortie, p, VIE.vitesse, pied, debut);
        n.plans[k] = m;
        n.departs[k] = debut - (m ? m.duree : pied) - VIE.marge;
      }
      return n.departs[k];
    },

    // Le meilleur trajet de `n` (sa voiture, sinon le bus) du point `a` au point `b` pour y être
    // à l'heure `arrivee` (h) ; `pied` : le temps à pied (h, la descente comprise). { voiture } ou
    // { bus }, et duree (h, la descente comprise) ; null : à pied.
    planTrajet(n, a, b, vitesse, pied, arrivee) {
      const desc = this.descente(vitesse);
      if (n.voiture) {
        const c = this.planVoiture(a, b);
        if (c && c.duree + desc < pied * 0.9) return { voiture: c, duree: c.duree + desc };
      }
      const bus = this.planBus(a, b, vitesse, null, pied - desc);
      if (bus && arrivee - bus.duree - desc - VIE.marge >= LIGNES.heures[0]) return { bus, duree: bus.duree + desc };
      return null;
    },
    // Le service que `n` doit prendre maintenant (-1 : aucun) : parti à l'heure, pas encore fini,
    // pas encore fait aujourd'hui.
    serviceAFaire(n, h, jour) {
      const S = n.emploi.horaires;
      n.faits = n.faits || [];
      for (let k = 0; k < S.length; k++) if (n.faits[k] !== jour && h >= this.departService(n, k) && h < S[k][1]) return k;
      return -1;
    },
    // Arrivé au travail : à sa place (on le voit dans le lieu), ou entré (on ne le voit plus).
    arriveTravail(n, deja) {
      n.etat = 'travail';
      n.t = 2;
      if (n.place) {
        n.x = n.place.x; n.y = n.place.y; n.niv = 0;
        n.path = [];
        n.cache = false;
        n.face = 'haut';
        n.s.setFlipX(false);
        return;
      }
      this.cacheHabitant(n, deja);
    },

    // Le temps (en heures du jeu) d'aller à pied de l'immeuble `im` au lieu `lieu` (gardé).
    trajetVers(im, lieu) {
      im.trajets = im.trajets || {};
      if (im.trajets[lieu] == null) {
        const t = this.lieuTravail(lieu);
        im.trajets[lieu] = t ? this.trajetImm(im, t.place || t.porte) : 0;
      }
      return im.trajets[lieu];
    },

    // ---------- l'école ----------

    // L'enfant `n` doit-il être à l'école (ou en chemin) ? Un jour d'école, de son départ
    // (departEcole) à la fin de l'école (CarteKit.ECOLE).
    ecoleImm(n, H) {
      const S = global.HorlogeSortie;
      if (!H || H.nuit || !S || !S.JOURS_ECOLE.includes(H.semaine)) return false;
      const h = this.heureImm(H);
      return h >= this.departEcole(n) && h < K.ECOLE.fin;
    },
    // L'heure où l'enfant `n` part de chez lui pour être à l'école à l'heure : le temps de faire
    // son chemin (de sa chambre à son école, escaliers compris), à sa vitesse, et la marge
    // (CarteKit.ECOLE). Calculée une fois.
    departEcole(n) {
      if (n.departEcoleH == null) {
        const p = n.ecole && (n.ecole.place || n.ecole.porte), lit = this.litImm(n);
        const essai = { L: n.L, niv: lit.niv, x: lit.x, y: lit.y, path: [] };
        const L = p && this.allerImm(essai, p, 0) ? K.longueur(essai.path, lit) : 0;
        const pied = K.heuresDeMarche(L, n.speed);
        // (en bus, s'il est plus court et roule déjà à l'heure de partir : n.planEcole)
        const m = p && this.planTrajet(n, this.portesImm(n.L.im).sortie, p, n.speed, pied, K.ECOLE.debut);
        n.planEcole = m;
        n.departEcoleH = K.ECOLE.debut - (m ? m.duree : pied) - K.ECOLE.marge;
      }
      return n.departEcoleH;
    },
    // La porte de l'école de la carte : le bout du chemin des enfants qui descendent du bus le
    // matin.
    porteEcole() {
      const l = (this.kidPaths || {}).enfants_matin;
      return l && l.length ? l[l.length - 1] : null;
    },
    // Chaque enfant à l'une des écoles (IMMEUBLE.vie.ecoles) : la plus proche de chez lui qui a
    // encore de la place (autant d'élèves dans chacune, à un près). Dans une école bâtie en blocs,
    // sa place : derrière un pupitre du rez-de-chaussée. n.ecole : { porte, place }.
    repartitEcoles() {
      const enfants = this.habitants.filter((n) => n.m.enfant), E = [];
      for (const nom of VIE.ecoles) {
        const t = nom === 'ecole' ? { porte: this.porteEcole() } : this.lieuTravail(nom);
        if (!t || !t.porte) continue;
        const sieges = [];
        if (t.im) for (const mb of t.im.niveaux[0].plan.meubles) if (mb.nom === 'pupitre_eleve' && t.im.niveaux[0].marche[mb.y + 1][mb.x]) sieges.push(pied(t.im, mb.x, mb.y + 1));
        E.push({ porte: t.porte, sieges, n: 0 });
      }
      if (!E.length) return;
      const cap = Math.ceil(enfants.length / E.length);
      // (les plus éloignés de toutes les écoles choisissent d'abord)
      const d = (n, e) => Math.hypot(n.L.im.x * T - e.porte.x, n.L.im.y * T - e.porte.y);
      enfants.sort((a, b) => Math.min(...E.map((e) => d(b, e))) - Math.min(...E.map((e) => d(a, e))));
      for (const n of enfants) {
        const e = E.filter((q) => q.n < cap).sort((a, b) => d(n, a) - d(n, b))[0] || E[0];
        n.ecole = { porte: e.porte, place: e.sieges.length ? e.sieges[e.n % e.sieges.length] : null };
        e.n++;
      }
    },
    // Arrivé à l'école : derrière son pupitre (on le voit), ou entré (on ne le voit plus).
    arriveEcole(n, deja) {
      n.etat = 'ecole';
      n.t = 2;
      const p = n.ecole && n.ecole.place;
      if (p) {
        n.x = p.x; n.y = p.y; n.niv = 0;
        n.path = [];
        n.cache = false;
        n.face = 'haut';
        n.s.setFlipX(false);
        return;
      }
      this.cacheHabitant(n, deja);
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

    // La sortie de l'immeuble `im` : devant sa porte.
    portesImm(im) {
      return { sortie: pied(im, im.niveaux[0].plan.porte, im.h) };
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
        // (à l'arrêt, dans le bus : js/carte/ville/lignes.js)
        if (n.etat === 'attendBus' || n.etat === 'enBus') { this.stepBusHabitant(n, H); this.placeHabitant(n, time, false); continue; }
        // (dans sa voiture : js/carte/ville/voitures.js)
        if (n.etat === 'enVoiture') { this.stepVoitureHabitant(n, H); this.placeHabitant(n, time, false); continue; }
        // (l'heure de partir pour l'école : il laisse ce qu'il faisait au logement)
        if (n.m.enfant && n.etat === 'dedans' && n.path.length && n.jourEcole !== (H && H.jour) && this.ecoleImm(n, H)) { n.path = []; n.t = 0; }
        // (l'heure de partir au travail : de même)
        if (n.emploi && n.etat === 'dedans' && n.path.length && this.serviceAFaire(n, this.heureImm(H), H ? H.jour : 0) >= 0) { n.path = []; n.t = 0; }
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
      const h = this.heureImm(H), jour = H ? H.jour : 0;
      // (rentrer chez soi : en bus si c'est plus court, sinon à pied)
      const chezSoi = (bus = false) => {
        const c = this.caseLogement(n.L);
        if (bus && this.voyage(n, c, c.niv, n.etat, h)) return;
        if (!this.allerImm(n, c, c.niv)) { this.rentreHabitant(n); }
      };
      const attendre = (k = 1) => { n.t = hasard(VOISINS.wait) * k; };
      // ressortir du lieu où l'on n'était plus visible : devant sa porte
      const ressort = (p) => {
        if (n.cache && p) { n.x = p.x; n.y = p.y; }
        n.niv = 0;
        n.cache = false;
        this.montreHabitant(n);
      };
      // la nuit : chacun se couche (au lit s'il est chez lui ; sinon il rentre tout de suite)
      if (this.dortImm(H, n)) {
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
          // à son lieu : sa place, ou il entre
          this.arriveTravail(n);
          return;
        case 'travail': {
          const S = n.emploi.horaires, k = n.service || 0;
          if (h < S[k][1]) { n.t = 2; return; }
          // le service fini : il ressort ; après le dernier, s'il est encore tôt, il passe au marché
          const t = this.lieuTravail(n.emploi.lieu);
          ressort(t && t.porte);
          const e = k === S.length - 1 && h < VIE.marche ? this.etalImm() : null;
          if (e && this.voyage(n, e, 0, 'versMarche', h)) return;
          if (e) {
            n.etat = 'versMarche';
            if (!this.allerImm(n, e, 0)) { n.etat = 'achete'; n.t = 0.01; }
          } else {
            n.etat = 'retour';
            chezSoi(true);
          }
          return;
        }
        case 'versSortie':
          // au loisir : à sa place dans la salle, ou il entre
          this.arriveSortie(n);
          return;
        case 'sortie': {
          if (h < VIE.sortie[1]) { n.t = 2; return; }
          // la sortie finie : il ressort et rentre à pied
          const t = this.lieuTravail(n.sortie);
          ressort(t && t.porte);
          n.etat = 'retour';
          chezSoi(true);
          return;
        }
        case 'versVoiture':
          // au bord de la rue : sa voiture vient, il monte
          this.monteVoiture(n);
          return;
        case 'versArret':
          // à l'arrêt : il attend son bus, tourné vers la rue
          n.etat = 'attendBus';
          n.voyage.depuis = h;
          n.face = 'bas';
          return;
        case 'versEcole':
          // à son école : son pupitre, ou il entre
          this.arriveEcole(n);
          return;
        case 'ecole': {
          if (this.ecoleImm(n, H)) { n.t = 2; return; }
          // l'école finie : il ressort et rentre à pied
          ressort(n.ecole && n.ecole.porte);
          n.etat = 'retour';
          chezSoi(true);
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
          chezSoi(true);
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
        const p = n.ecole && (n.ecole.place || n.ecole.porte);
        if (p && n.planEcole && this.voyage(n, p, 0, 'versEcole', h, n.planEcole)) return;
        n.etat = 'versEcole';
        if (!p || !this.allerImm(n, p, 0)) this.arriveEcole(n, true);
        return;
      }
      if (n.emploi) {
        const k = this.serviceAFaire(n, h, jour);
        if (k >= 0) {
          // l'heure d'un service : il descend, sort, va à son lieu
          n.faits[k] = jour;
          n.service = k;
          const t = this.lieuTravail(n.emploi.lieu), p = t && (n.place || t.porte);
          if (p && n.plans[k] && this.voyage(n, p, 0, 'versTravail', h, n.plans[k])) return;
          n.etat = 'versTravail';
          if (!p || !this.allerImm(n, p, 0)) this.arriveTravail(n, true);
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
      // le soir de sortie, le dîner fait : toute la famille part au loisir
      const so = this.sortieDe(n.L);
      if (so && n.jourSortie !== jour && h >= VIE.sortie[0] && h < VIE.sortie[1] && !this.habitants.some((q) => q.L === n.L && (q.etat === 'versFeu' || q.etat === 'cuisine'))) {
        this.partSortie(n, so, jour);
        return;
      }
      // il va et vient dans le logement
      chezSoi();
      attendre(n.m.enfant ? 1 : 1.5);
    },

    // La sortie du soir de la famille du logement `L` (le lieu : 'cinema', 'musee',
    // 'amphitheatre' ; null : elle reste chez elle) : celle que le moteur a décidée la nuit.
    sortieDe(L) {
      const fo = this.ecoImm && this.ecoImm.foyers[L.nom];
      return (fo && fo.hier && fo.hier.sortie) || null;
    },
    // `n` part au loisir `so` (sa place : une case de la salle, au hasard) ; `direct` : il y est
    // déjà (la carte s'ouvre pendant la sortie).
    partSortie(n, so, jour, direct = false) {
      n.jourSortie = jour;
      n.sortie = so;
      const t = this.lieuTravail(so), l = this.placesSpectateurs(so) || (t && t.places) || [];
      n.placeSortie = l.length ? l[Math.floor(Math.random() * l.length)] : null;
      const p = n.placeSortie || (t && t.porte);
      if (!direct && p && this.voyage(n, p, 0, 'versSortie', this.heureImm(global.HorlogeSortie ? global.HorlogeSortie.maintenant() : null))) return;
      n.etat = 'versSortie';
      if (direct || !p || !this.allerImm(n, p, 0)) this.arriveSortie(n, true);
    },
    // Les places des spectateurs du lieu `lieu` : devant ses fauteuils (IMMEUBLE.vie.spectateurs ;
    // null : il n'en a pas). Gardées.
    placesSpectateurs(lieu) {
      this.spectT = this.spectT || {};
      if (lieu in this.spectT) return this.spectT[lieu];
      const im = (this.immeubles || []).find((q) => q.b.nom === lieu), l = [];
      if (im) {
        const nv = im.niveaux[0];
        for (const mb of nv.plan.meubles) {
          if (!VIE.spectateurs.includes(mb.nom)) continue;
          const y = mb.y + mb.h;
          for (let x = mb.x; x < mb.x + mb.w; x++) if (nv.marche[y] && nv.marche[y][x] && nv.grille[y][x] === '.') l.push(pied(im, x, y));
        }
      }
      return (this.spectT[lieu] = l.length ? l : null);
    },
    // Arrivé au loisir : à sa place dans la salle (on le voit quand on y entre), ou il entre.
    arriveSortie(n, deja) {
      n.etat = 'sortie';
      n.t = 2;
      if (n.placeSortie) {
        n.x = n.placeSortie.x; n.y = n.placeSortie.y; n.niv = 0;
        n.path = [];
        n.cache = false;
        n.face = 'haut';
        n.s.setFlipX(false);
        return;
      }
      this.cacheHabitant(n, deja);
    },

    // ---------- le bus (js/carte/ville/lignes.js) ----------

    // Le temps (h) de descendre de son logement et de sortir de l'immeuble (comme trajetImm).
    descente(vitesse = VIE.vitesse) {
      return (20 * T) / vitesse / VIE.sParHeure;
    },

    // Le meilleur trajet en bus du point `a` au point `b`, à la vitesse `vitesse` (px/s) à pied :
    // { tr, i, j (les arrêts où monter et descendre), duree (h) } ; null : à pied, c'est aussi
    // bien (`pied` : le temps à pied, s'il est connu). `h` : l'heure du départ (le bus doit
    // rouler jusqu'à l'arrivée ; sans : toujours). Les chemins jusqu'aux arrêts sont estimés (à
    // vol d'oiseau en huit directions, plus un détour).
    planBus(a, b, vitesse, h = null, pied = null) {
      if (!this.lignes || !this.lignes.length || !a || !b) return null;
      const sph = VIE.sParHeure, est = (p, q) => {
        const dx = Math.abs(p.x - q.x), dy = Math.abs(p.y - q.y);
        return ((Math.max(dx, dy) + 0.414 * Math.min(dx, dy)) * 1.15) / vitesse / sph;
      };
      if (pied == null) pied = est(a, b);
      const attente = LIGNES.intervalle / 2 / 60;
      let best = null;
      for (const tr of this.lignes) {
        const A = tr.arrets;
        for (let i = 0; i < A.length - 1; i++) {
          const wi = est(a, A[i].attente);
          if (wi >= pied) continue;
          for (let j = i + 1; j < A.length; j++) {
            const route = ((A[j].s - A[i].s) / (LIGNES.vitesse * 0.8) + (j - i) * LIGNES.arret) / sph;
            const d = wi + attente + route + est(A[j].attente, b);
            if (!best || d < best.duree) best = { tr, i, j, duree: d };
          }
        }
      }
      // (assez plus court : un dixième de moins)
      if (!best || best.duree > pied * 0.9) return null;
      if (h != null && (h < LIGNES.heures[0] || h + best.duree > LIGNES.heures[1])) return null;
      return best;
    },

    // `n` part vers le point `p` (du niveau `niv`) en voiture ou en bus, si c'est plus court qu'à
    // pied (`plan` : planTrajet, sinon décidé d'où il est, à l'heure `h`) ; arrivé, il prend
    // l'état `etat`. false : il ira à pied.
    voyage(n, p, niv, etat, h, plan = null) {
      if (plan) return plan.voiture ? this.voyageVoiture(n, p, niv, etat, plan.voiture) : this.voyageBus(n, p, niv, etat, h, plan.bus);
      if (n.voiture) {
        const vit = VIE.vitesse, est = (q, r) => ((Math.max(Math.abs(q.x - r.x), Math.abs(q.y - r.y)) + 0.414 * Math.min(Math.abs(q.x - r.x), Math.abs(q.y - r.y))) * 1.15) / vit / VIE.sParHeure;
        const c = this.planVoiture(n, p);
        if (c && c.duree < est(n, p) * 0.9 && this.voyageVoiture(n, p, niv, etat, c)) return true;
      }
      return this.voyageBus(n, p, niv, etat, h);
    },

    // `n` part en bus vers le point `p` (du niveau `niv`) ; arrivé, il prend l'état `etat` (celui
    // du trajet à pied : son arrivée se fait comme d'habitude). `plan` : planBus (sinon, d'où il
    // est, à l'heure `h`). false : pas de bus (il ira à pied).
    voyageBus(n, p, niv, etat, h, plan = null) {
      const b = plan || this.planBus(n, p, n.m.enfant ? n.speed : VIE.vitesse, h);
      if (!b || (h != null && (h < LIGNES.heures[0] || h + b.duree > LIGNES.heures[1]))) return false;
      const A = b.tr.arrets[b.i];
      const avant = n.etat;
      n.etat = 'versArret';
      n.voyage = { tr: b.tr, i: b.i, j: b.j, p, niv, etat, depuis: h };
      if (!this.allerImm(n, A.attente, 0)) { n.etat = avant; n.voyage = null; return false; }
      return true;
    },

    // À l'arrêt, puis dans le bus : il monte dans le premier bus de sa ligne qui s'y arrête (on
    // ne le voit plus), le suit, descend à son arrêt et finit à pied. Trop d'attente (une fois
    // et demie l'intervalle), ou plus de bus : il y va à pied. La nuit : chez lui.
    stepBusHabitant(n, H) {
      const v = n.voyage, h = this.heureImm(H);
      if (!v || this.dortImm(H, n)) { n.voyage = null; this.rentreHabitant(n); this.coucheHabitant(n); return; }
      const fin = (p) => {
        if (p) { n.x = p.x; n.y = p.y; }
        n.niv = 0;
        n.cache = false;
        this.montreHabitant(n);
        n.etat = v.etat;
        n.voyage = null;
        n.busCar = null;
        if (!this.allerImm(n, v.p, v.niv)) { n.path = []; n.t = 0.01; }
      };
      if (n.etat === 'attendBus') {
        const car = this.cars.find((c) => c.ligne === v.tr && c.k === v.i && c.atStop);
        if (car) { n.etat = 'enBus'; n.busCar = car; n.cache = true; return; }
        if (h - v.depuis > (LIGNES.intervalle * 1.5) / 60 || h >= LIGNES.heures[1]) fin(null);
        return;
      }
      const car = n.busCar;
      if (car && this.cars.includes(car) && !(car.k === v.j && car.atStop)) { n.x = car.x; n.y = car.y; return; }
      fin(v.tr.arrets[v.j].attente);
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
        n.cache = n.etat === 'travail' || n.etat === 'ecole' || n.etat === 'sortie' || n.etat === 'dort' || n.etat === 'enBus' || n.etat === 'enVoiture';
        n.s.setAlpha(1); n.shadow.setAlpha(0.3);
      } });
    },

    montreHabitant(n) {
      this.tweens.killTweensOf([n.s, n.shadow]);
      n.s.setAlpha(1);
      n.shadow.setAlpha(0.3);
    },

    // L'immeuble ou le lieu où se tient `n` (null : dehors) : gardé tant qu'il reste sur la même
    // case.
    batimentSous(n) {
      const gx = Math.floor(n.x / T), gy = Math.floor((n.y - 1) / T), c = gy * 4096 + gx;
      if (n.sousCase !== c) {
        n.sousCase = c;
        n.sous = V.dansImmeuble(n.L.im, gx, gy) ? n.L.im : (this.immeubles || []).find((q) => V.dansImmeuble(q, gx, gy)) || null;
      }
      return n.sous;
    },

    // Son image, à sa place : dehors, ou dans un immeuble ou un lieu à son niveau (remonté, et
    // devant le voile s'il est à un étage) quand on y est aussi.
    placeHabitant(n, time, marche) {
      const F = this.npcFrame, im = this.batimentSous(n);
      let frame;
      if (n.geste && !marche) frame = F(n.geste);
      else if (marche) frame = F.de(n.panier ? 'panier' : 'marche', n.face, Math.floor(n.walked / 4) % 4);
      else frame = F.de('idle', n.face, Math.floor(time / 600 + n.m.perso) % 2);
      const vu = !n.cache && (!im || (im.vue !== 'dehors' && n.niv === (this.niveauVille || 0)));
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
      const M = (eco && eco.metiers) || {}, Li = (eco && eco.lieux) || {};
      const h = (x) => { const m = Math.round(x * 60); return `${Math.floor(m / 60)} h${m % 60 ? String(m % 60).padStart(2, '0') : ''}`; };
      const horaires = (S) => S.map(([a, b]) => `de ${h(a)} à ${h(b)}`).join(' et ');
      const sortie = this.paroleBus(n) || this.paroleSortie(n, Li);
      if (n.m.enfant) {
        const E = K.ECOLE;
        const ecole = sortie ? sortie.trim() : n.etat === 'versEcole' ? `Je vais à l'école, elle commence à ${h(E.debut)} : je ne dois pas être en retard !` : n.etat === 'retour' ? 'Je rentre de l\'école !'
          : n.etat === 'ecole' ? 'Chut, je suis en classe !'
          : `L'école commence à ${h(E.debut)} : je pars à ${h(Math.ceil(this.departEcole(n) * 12) / 12)}, à pied, pour y être à l'heure. Elle finit à ${h(E.fin)}.`;
        const parents = this.habitants.filter((q) => q.L === n.L && q.emploi).map((q) => `${q.m.prenom} est ${M[q.emploi.metier] || q.emploi.metier} à ${Li[q.emploi.lieu] || q.emploi.lieu}`);
        return `👋 ${qui} : « ${ecole}${parents.length ? ` À la maison, ${liste(parents)}.` : ''} »`;
      }
      const e = n.emploi;
      const travail = `Je suis ${M[e.metier] || e.metier} à ${Li[e.lieu] || e.lieu}, ${horaires(e.horaires)}, pour ${e.salaire} 💰 par jour.`;
      const ici = n.etat === 'travail' ? ' Je suis au travail !' : n.etat === 'versTravail' ? ' Je pars au travail.' : sortie;
      if (!fo) return `💼 ${qui} : « ${travail}${ici} »`;
      const N = eco.noms || {}, hier = fo.hier;
      const humeur = fo.bonheur >= VIE.humeur[0] ? '😊' : fo.bonheur >= VIE.humeur[1] ? '🙂' : '😟';
      let dit = '';
      if (hier) {
        if (hier.sortie && !sortie) dit += ` Ce soir, on sort : ${Li[hier.sortie] || hier.sortie} !`;
        const achats = Object.entries(hier.achats || {}).map(([i, k]) => `${k} ${N[i] || i}`);
        dit += achats.length ? ` Hier, on a acheté au marché ${liste(achats)} (${hier.achete} 💰).` : ' Hier, on n\'a rien pu acheter au marché.';
        dit += hier.plats.length ? ` Au dîner : ${liste([...new Set(hier.plats)].map((p) => N[p] || p))}.` : '';
        if (hier.couverture < 100) dit += ' On n\'a pas mangé à notre faim…';
        if (hier.bus) dit += ` Et ${hier.bus} ticket${hier.bus > 1 ? 's' : ''} de bus.`;
      }
      if (n.etat === 'achete') dit = ' Je fais les courses pour le dîner !' + dit;
      return `💼 ${qui} : « ${travail}${ici}${dit} » (${fo.argent} 💰 de côté, bonheur ${fo.bonheur} ${humeur})`;
    },

    // Ce que dit `n` de son trajet en bus ('' : il n'en prend pas).
    paroleBus(n) {
      if (n.etat === 'versVoiture') return ' Je vais prendre ma voiture.';
      const v = n.voyage;
      if (!v || (n.etat !== 'versArret' && n.etat !== 'attendBus')) return '';
      const L = v.tr.ligne, a = v.tr.arrets[v.j].nom;
      return n.etat === 'versArret' ? ` Je vais prendre le bus de la ligne ${L.id}, jusqu'à l'arrêt ${a}.` : ` J'attends le bus de la ligne ${L.id} : je descends à l'arrêt ${a}.`;
    },

    // Ce que dit `n` de sa sortie du soir, en chemin, sur place ou au retour ('' : rien).
    paroleSortie(n, Li) {
      const lieu = n.sortie && (Li[n.sortie] || n.sortie);
      if (n.etat === 'versSortie') return ` On va ${lieu.replace(/^(le|la|l')\s?/, (m) => ({ 'le ': 'au ', 'la ': 'à la ', 'l\'': 'à l\'' }[m] || m))}, toute la famille !`;
      if (n.etat === 'sortie') return n.sortie === 'cinema' ? ' Chut, le film commence !' : n.sortie === 'musee' ? ' Regarde ce squelette de dinosaure !' : ' Quel beau spectacle !';
      if (n.etat === 'retour' && n.jourSortie != null && n.sortie && n.jourSortie === (global.HorlogeSortie ? global.HorlogeSortie.maintenant().jour : 0)) return ` On rentre ${lieu.replace(/^(le |la |l')/, (m) => ({ 'le ': 'du ', 'la ': 'de la ', 'l\'': 'de l\'' }[m]))}, c'était bien !`;
      return '';
    },
  });
})(window);
