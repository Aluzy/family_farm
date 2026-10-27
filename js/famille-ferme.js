/*
 * La famille sur la carte de la ferme (js/farm-stage.js) : les membres autres que le personnage
 * du joueur (js/fermier.js), chacun avec son personnage (assets/personnages/perso_NN.png ; les
 * enfants, leurs planches à eux : assets/personnages/enfant_NN.png), font leur journée :
 *
 *   - fiche 16b : le jour et le soir, ils sont dehors autour de la maison, jusqu'à leur coucher :
 *     les adultes flânent, d'un coin à l'autre, et les enfants jouent (FamilleFerme : jouer) : à
 *     deux, ils se poursuivent (l'un court après l'autre, et quand il l'attrape, c'est l'autre qui
 *     court) ou font la ronde (ils courent en rond, chacun d'un côté du cercle) ; seuls, ils
 *     sautent sur place ou tournent sur eux-mêmes ; en jouant, ils vont plus vite et font de petits
 *     bonds (un décalage de l'image, les pieds ne quittent pas leur case : rien ne traverse un
 *     mur). Il n'y a plus de rentrée générale, ni de repas à table à heure fixe (chacun mange quand
 *     il a faim, plus bas) ;
 *   - le coucher (model.horaire : FAMILLE.HORAIRE, data/general.json) : les enfants vont au lit à
 *     COUCHER_ENFANTS (20 h), après leur dernier repas (le moteur les fait manger à 20 h : ils vont
 *     d'abord à la boîte ou au frigo, s'y servent, puis vont au lit ; rien à manger : au lit
 *     directement), les adultes (le compagnon, et tous les adultes) à COUCHER_ADULTES (22 h), et tous pendant
 *     la nuit (model.nuit, 22 h → 6 h) ; chacun rejoint la maison à pied, entre par la porte et se
 *     couche dans son lit (o.lit(k) : le k-ième membre a le (k + 2)-ième couchage, le premier est
 *     au personnage du joueur), sous la couverture (debout entre le lit et elle, tourné vers nous,
 *     comme le personnage) : on l'y voit quand le toit se lève ; sans lit pour lui, il reste dans
 *     la maison (o.maison : l'intérieur du bâtiment du foyer, sous son toit,
 *     js/carte/ferme/chantier.js homeInside), d'une place à l'autre ; sans maison, il se tient
 *     devant la porte du foyer ;
 *   - le matin : les adultes se lèvent avec le personnage (à la fin de la nuit), les enfants à
 *     LEVER_ENFANTS (8 h) ; chacun sort par la porte ;
 *   - le second adulte du foyer (model.aide, le moteur : aidant) s'occupe des bêtes : le jour,
 *     jusqu'à FIN_TRAVAIL_ADULTES (19 h ; ensuite il flâne près de la maison, sans plus travailler),
 *     quand il y a à faire au Poulailler, à l'Étable ou à une ruche pleine (model.aide.lieux :
 *     « ruche:<case> »), il y va, se baisse (GESTE s) et nourrit les poules, prend les œufs, le
 *     lait et la laine, récolte le miel (o.aide : tout entre
 *     dans l'inventaire ; o.gain : la bulle « +x » au-dessus de lui) ; fiche 19 : il prend aussi
 *     des initiatives (les lieux suivants : « arroser:<case> », « puits:<case> », « cuisiner »,
 *     « ramasser:<id> », js/engine/compagnon.js) : o.lieu (js/carte/ferme/compagnon.js) dit où se
 *     tenir et le geste (GESTES) ; il y va, fait son geste, puis o.aide fait le travail (la plante
 *     arrosée, sa cruche pleine, le plat préparé, le bois ramassé) et la bulle le dit (« +1 💧 ») ;
 *     une tâche sans chemin est laissée ECHEC s, il passe à la suivante ;
 *   - chacun a faim en marchant (o.marche(id, px) : le moteur compte 1 point de faim tous les
 *     FAMILLE.FAIM.PX_PAR_POINT px, js/engine/repas.js) ; quand sa jauge tombe à FAIM.SEUIL, à
 *     n'importe quelle heure, il mange (le moteur : repasStep) : sur la carte, il va au
 *     réfrigérateur ou à la boîte à nourriture, s'y baisse, puis reprend ce qu'il faisait
 *     (allerManger, appelé par la page : js/ui/loop.js ; o.boite : où se servir). Occupé (il se
 *     baisse, il parle), il y va ensuite ; au lit, ou sans chemin, il n'y va pas. S'il n'y a rien
 *     à manger, le moteur ne le fait pas manger et il n'y va pas (une seule alerte « a faim ») ;
 *
 * Ils marchent par les chemins du personnage (fermier.path : les mêmes cases libres ; les murs,
 * les meubles et les blocs qui ferment se contournent, on passe par les portes). Un trajet sans
 * chemin (une pièce sans porte, un but enfermé) ne se fait pas : il reste où il est, et réessaie
 * plus tard (BLOQUE s) ; jamais en ligne droite au travers d'un mur (fiche 16). Personne ne
 * s'efface : une fois sa planche chargée, chacun est toujours sur la carte (dehors, dans la
 * maison ou au lit). Avec « animations réduites », ils vont d'un point à l'autre sans marcher
 * (là où un chemin mène).
 *
 *   const famille = FamilleFerme.attach(scene, { fermier, frames, file(perso, enfant), reduced, maison, lit, boite, … })
 *   famille.sync(model)          // model.famille : [{ id, perso, enfant }], model.heure, model.nuit
 *   famille.update(deltaMs)
 *   famille.info()               // pour les tests : où est chacun
 *   famille.aidePos()            // où est le second adulte (sa bulle « +x »), ou null
 *   famille.allerManger(id)      // il va à la boîte à nourriture et s'y baisse ; false s'il ne le peut pas
 *   famille.rejoindre(at)        // le second adulte vient à côté de at ({ x, y } : le personnage),
 *                                // s'y arrête et se tourne vers lui ; true quand il y est ;
 *                                // rejoindre(null) : il reprend sa journée
 *
 * Ce qu'il fait à une heure donnée ne dépend que de l'heure, de l'horaire, de son âge et de ce
 * qu'il y a (FamilleFerme.voulu, testé sans navigateur : tests/engine/famille-visible.test.mjs).
 */
(function (global) {
  'use strict';

  const K = global.CarteKit;
  const T = K.T;
  const VITESSE = K.VITESSES.famille;     // px/s : { adulte, enfant }
  const ROAM = 6 * T;                      // autour de la maison
  const FADE_S = 0.5;
  // (l'image du pas : CarteKit.imageMarche, d'après les px parcourus depuis le départ, m.marche)
  const GESTE = 1.2;                       // s : le second adulte se baisse au Poulailler, à l'Étable
  const REPOS = 3;                         // s avant de chercher autre chose à faire
  const ENFANT_DY = 4;                     // px : un enfant couché est remonté d'autant (il est plus petit)
  const COTE = 20;                         // px : le second adulte qui vient parler, à côté du personnage
  const PAS_COMPTE = 50;                   // px : la marche est comptée au moteur par tranches d'autant (o.marche)
  const BLOQUE = [2, 4];                   // s : sans chemin, il attend avant de réessayer
  const DEVANT = 2 * T;                    // sans maison : il reste à moins de ça de la porte
  // les jeux des enfants : en jouant, ils vont VITE fois plus vite et font des bonds de BOND px (en
  // courant) ou de SAUT px (sauter sur place) ; la ronde : un cercle de RAYON px, TOURS tours ; la
  // poursuite dure POURSUITE s, sauter ou tourner SEUL s ; un camarade de jeu, à moins de PROCHE px
  // (on le rejoint en courant)
  const JEU = { VITE: 1.7, BOND: 1.5, SAUT: 4, RAYON: 18, TOURS: 2, POURSUITE: [6, 10], SEUL: [2, 3.5], PROCHE: 14 * T, ATTRAPE: 12 };
  const ECHEC = 20;                        // s : une tâche du second adulte sans chemin est laissée d'autant

  // Les gestes du second adulte (fiche 19), les images de son personnage (assets/personnages/
  // cases.json), en séquence sur `dur` s : aux bêtes et à la boîte, il se baisse (ramasse_<n>) ;
  // ses initiatives (js/carte/ferme/compagnon.js lieuCompagnon : spot.geste) : arroser un légume
  // (la cruche penchée), puiser au puits (penché sur la margelle, comme le personnage), cuisiner à
  // la cuisinière, ramasser du bois ou une pierre.
  const GESTES = {
    betes: { dur: GESTE, seq: [0, 1, 2], nom: (vue, n) => `ramasse_${n}` },
    arroser: { dur: 1.4, seq: [0, 1, 2, 1, 2, 2], nom: (vue, n) => `arrose_${vue}_${n}` },
    puiser: { dur: 2, seq: [0, 1, 2, 2, 1, 2, 2, 1, 0], nom: (vue, n) => `plante_${vue}_${n}` },
    cuisiner: { dur: 2.6, seq: [0, 1, 2, 3, 2, 3, 2, 1, 0], nom: (vue, n) => `cuisine_${n}` },
    ramasser: { dur: 1.2, seq: [0, 1, 2, 1, 2, 0], nom: (vue, n) => `ramasse_${n}` },
  };

  const rand = (a, b) => a + Math.random() * (b - a);

  // Est-il couché à l'heure `heure` (la nuit : `nuit`) ? Un enfant de COUCHER_ENFANTS à
  // LEVER_ENFANTS, un adulte à partir de COUCHER_ADULTES ; tous, la nuit (un adulte se lève avec
  // le personnage, quand elle finit). `horaire` : FAMILLE.HORAIRE (sans lui : la nuit seulement).
  function couche(heure, nuit, enfant, horaire) {
    if (nuit) return true;
    const H = horaire || {};
    if (enfant) return heure >= H.COUCHER_ENFANTS || heure < H.LEVER_ENFANTS;
    return heure >= H.COUCHER_ADULTES;
  }
  // Où un membre (un enfant : `enfant`) doit être à l'heure `heure`, avec ou sans lit (`lit`) :
  // 'lit', 'dedans' (couché, mais sans lit pour lui : dans la maison) ou 'dehors'.
  function voulu(heure, nuit, lit, enfant, horaire) {
    if (!couche(heure, nuit, enfant, horaire)) return 'dehors';
    return lit ? 'lit' : 'dedans';
  }

  function attach(scene, o) {
    const F = {};
    (o.frames || []).forEach((name, i) => { F[name] = i; });
    const reduced = o.reduced || (() => false);
    const membres = new Map();     // id → marcheur
    let model = null;

    // Devant la porte d'entrée du foyer (dehors).
    function door() {
      const f = scene.homeDoor ? scene.homeDoor() : null;   // la porte du foyer
      return f || { x: scene.world.w / 2, y: scene.world.h / 2 };
    }
    // L'intérieur de la maison (o.maison), ou null.
    const maison = () => (o.maison ? o.maison() : null);
    const libre = (x, y) => !o.fermier || !o.fermier.standable || o.fermier.standable(x, y);
    // (le point libre le plus proche, s'il le faut)
    const placeLibre = (x, y) => (libre(x, y) ? { x, y } : (o.fermier && o.fermier.librePres ? o.fermier.librePres(x, y) : null) || { x, y });

    // Son lit (o.lit), ou null.
    const litDe = (m) => (o.lit && m.rang >= 0 ? o.lit(m.rang) : null);
    const heure = () => (model ? model.heure : 12);
    const nuit = () => !model || !!model.nuit;
    const ouVeut = (m) => voulu(heure(), nuit(), !!litDe(m), m.enfant, model && model.horaire);

    // la planche d'un membre : celle de son personnage d'adulte ou d'enfant
    const cle = (def) => (def.enfant ? 'enfant_' : 'perso_') + def.perso;

    let rang = 0;                  // chacun son décalage : ils ne marchent pas l'un sur l'autre
    function creer(def) {
      const k = rang++;
      const key = cle(def);
      const s = scene.add.sprite(0, 0, key, F.idle_bas_0 || 0).setOrigin(0.5, 1).setVisible(false).setAlpha(0);
      return {
        id: def.id, key, enfant: !!def.enfant, s,
        x: 0, y: 0, face: 'bas', flip: false, marche: 0,
        visible: false, alpha: 0, fade: 0,
        chemin: [], puis: null, but: null, attente: rand(0.5, 3), bloque: 0,
        // chacun son coin préféré autour de la maison
        coin: { dx: rand(-ROAM, ROAM), dy: rand(T, ROAM) },
        // en file : un peu de retard au départ, un pas de côté sur le chemin
        retard: k * 0.7, cote: ((k % 3) - 1) * 6, pause: 0,
        tache: null, geste: 0, repos: 0,     // le second adulte : le lieu où il va, son geste
        anim: GESTES.betes, echecs: new Map(), // (son geste en cours ; les tâches sans chemin : lieu → s)
        rang: -1, couche: null, drap: null,  // la nuit : son rang (son lit, o.lit), son lit s'il y dort
        faim: false, reprise: null,          // il a mangé : il va se servir (faim), puis reprend ça
        jeu: null, vite: 1, haut: 0,         // un enfant qui joue : son jeu, sa vitesse, son bond (px)
      };
    }

    // Il se couche dans son lit `L` (o.lit) : debout entre le lit et sa couverture.
    function coucher(m, L) {
      m.couche = L; m.faim = false; m.reprise = null; m.jeu = null; m.vite = 1; m.haut = 0; m.chemin = []; m.puis = null; m.but = null; m.tache = null;
      // (un enfant est plus petit, ENFANT_RANGEES de scripts/personnage/chibi.py : remonté, la tête sur l'oreiller)
      m.x = L.x; m.y = L.y - (m.enfant ? ENFANT_DY : 0); m.face = 'bas'; m.flip = false;
      montrer(m);
      if (!m.drap) m.drap = scene.add.image(0, 0, L.drap.key, L.drap.frame).setOrigin(0.5, 1);
      m.drap.setTexture(L.drap.key, L.drap.frame).setPosition(L.drap.x, L.drap.y).setDepth(L.depth + 0.2).setVisible(true);
    }
    // Il se lève : à côté du lit, sans couverture ; il repart de là.
    function lever(m) {
      const L = m.couche;
      m.couche = null;
      if (m.drap) m.drap.setVisible(false);
      // (un lit de l'étage : il se lève en bas de l'escalier)
      if (L && L.via) { m.x = L.via.x; m.y = L.via.y; } else if (libre(m.x, m.y + 4)) m.y += 4;
    }

    function dessiner(m, nom) {
      const k = F[nom];
      if (k !== undefined) m.s.setFrame(k);
      // (un bond : l'image monte, les pieds restent sur leur case)
      m.s.setPosition(Math.round(m.x), Math.round(m.y - (m.haut || 0))).setFlipX(m.flip).setDepth(m.y).setAlpha(m.alpha);
    }

    // Le chemin du fermier, un pas de côté (m.cote) aux points où rien ne le gêne (ils ne
    // marchent pas l'un dans l'autre ; mais pas de côté dans un mur, ni en coupant un coin).
    function decaler(m, p) {
      if (!m.cote || !o.fermier.ligneLibre) return p;
      let px = m.x, py = m.y;
      return p.map((q, i) => {
        if (i === p.length - 1) return q;
        const d = { x: q.x, y: q.y + m.cote }, n = p[i + 1];
        const ok = libre(d.x, d.y) && o.fermier.ligneLibre(px, py, d.x, d.y) && o.fermier.ligneLibre(d.x, d.y, n.x, n.y);
        const r = ok ? d : q;
        px = r.x; py = r.y;
        return r;
      });
    }

    // Il va en (tx, ty) par les cases libres, pour `but` (ce que l'heure voulait : s'il change, le
    // trajet est abandonné) ; puis : puis(). Sans chemin, il reste où il est (BLOQUE s) : → false.
    function aller(m, tx, ty, puis, but) {
      m.chemin = []; m.puis = null; m.but = but || null;
      const p = o.fermier && o.fermier.path ? o.fermier.path(m.x, m.y, tx, ty) : [{ x: tx, y: ty }];
      // (trop loin pour chercher, p.droit : la famille ne s'en va pas si loin)
      if (!p || p.droit) { m.bloque = rand(BLOQUE[0], BLOQUE[1]); m.but = null; return false; }
      m.puis = puis || null;
      if (reduced()) { m.x = tx; m.y = ty; return true; }
      // (p = [] : déjà sur la case du but)
      m.chemin = p.length ? decaler(m, p.slice()) : [{ x: tx, y: ty }];
      m.pause = m.retard;
      return true;
    }

    // Il apparaît (sa planche vient d'être chargée) : en fondu, là où il est.
    function montrer(m) {
      if (!m.visible) { m.visible = true; m.fade = 1; }
      if (reduced()) { m.alpha = 1; m.fade = 0; }
    }

    // Une case libre près du coin de la maison qu'il préfère.
    function flanerVers(m) {
      const d = door();
      for (let i = 0; i < 8; i++) {
        const tx = d.x + m.coin.dx + rand(-2 * T, 2 * T), ty = d.y + m.coin.dy + rand(-2 * T, 2 * T);
        if (!libre(tx, ty)) continue;
        if (aller(m, tx, ty, null, 'dehors')) return;
      }
      m.attente = rand(1, 3);
    }
    // Sans maison : une place libre devant la porte.
    function devantPorte(m) {
      const d = door();
      for (let i = 0; i < 8; i++) {
        const tx = d.x + rand(-DEVANT, DEVANT), ty = d.y + rand(0, DEVANT);
        if (libre(tx, ty) && aller(m, tx, ty, null, 'dedans')) return;
      }
    }
    // Dans la maison : une place libre au hasard (H.places).
    function placeDedans(m, H) {
      if (!H.places.length) return false;
      for (let i = 0; i < 6; i++) {
        const q = H.places[Math.floor(Math.random() * H.places.length)];
        if (aller(m, q.x + rand(-3, 3), q.y, null, 'dedans')) return true;
      }
      return false;
    }

    // Les adultes travaillent-ils encore (avant FIN_TRAVAIL_ADULTES) ?
    const travaille = () => !(model && model.horaire) || heure() < model.horaire.FIN_TRAVAIL_ADULTES;

    // Où se tenir pour le lieu `l` ({ x, y, face?, flip?, geste? }) : une initiative du compagnon
    // (o.lieu, js/carte/ferme/compagnon.js), sinon le Poulailler, l'Étable, une ruche (fermier.lieu).
    const lieuDe = (l) => (o.lieu ? o.lieu(l) : null) || (o.fermier && o.fermier.lieu ? o.fermier.lieu(l) : null);

    // Le second adulte : y a-t-il à faire au Poulailler ou à l'Étable (ou une de ses initiatives) ?
    // Il y va, fait son geste (m.geste, m.anim), puis le jeu fait le travail (o.aide) et la bulle
    // monte (o.gain). Une tâche sans chemin est laissée ECHEC s (m.echecs) : il essaie la suivante.
    function soccuper(m) {
      const A = model && model.aide;
      if (!A || A.id !== m.id || m.enfant || m.tache || m.repos > 0 || !o.aide || !travaille()) return false;
      const now = performance.now() / 1000;
      for (const [l, t] of m.echecs) if (now - t > ECHEC) m.echecs.delete(l);
      for (const lieu of A.lieux || []) {
        if (m.echecs.has(lieu)) continue;
        const spot = lieuDe(lieu);
        if (!spot) continue;
        const anim = GESTES[spot.geste] || GESTES.betes;
        const fin = () => { m.face = spot.face || 'cote'; m.flip = !!spot.flip; m.anim = anim; m.geste = reduced() ? 0.01 : anim.dur; };
        if (!aller(m, spot.x, spot.y, fin, 'dehors')) { m.echecs.set(lieu, now); m.bloque = 0; continue; }
        m.tache = lieu;
        return true;
      }
      m.repos = REPOS;
      return false;
    }
    function finirTache(m) {
      const lieu = m.tache;
      m.tache = null;
      if (lieu === 'boite') { reprendre(m); return; }   // il a mangé (le moteur l'a déjà fait)
      m.repos = REPOS;
      if (!lieu || !travaille()) return;   // (19 h passé : il ne travaille plus)
      o.aide(lieu, (items) => { if (items && o.gain) o.gain(items); });
    }

    // Il a mangé (le moteur, js/engine/repas.js) : il va se servir au réfrigérateur ou à la boîte
    // (o.boite) et s'y baisse ; ce qu'il faisait (m.reprise : où il allait, pour quoi) l'attend.
    // Sans endroit où se servir, ou sans chemin : il n'y va pas (et ne réessaie pas).
    function allerSeServir(m) {
      m.faim = false;
      const spot = o.boite ? o.boite() : null;
      if (!spot) return false;
      const fin = m.chemin.length ? m.chemin[m.chemin.length - 1] : null;
      const avant = fin && m.but ? { x: fin.x, y: fin.y, but: m.but, puis: m.puis, tache: m.tache } : null;
      const bloque = m.bloque;
      // (chacun sa place devant elle, d'un pas de côté s'il y a la place : ils ne se servent pas l'un dans l'autre)
      const tx = m.cote && libre(spot.x + m.cote, spot.y) && o.fermier && o.fermier.ligneLibre && o.fermier.ligneLibre(spot.x, spot.y, spot.x + m.cote, spot.y) ? spot.x + m.cote : spot.x;
      if (!aller(m, tx, spot.y, () => { m.face = 'haut'; m.flip = false; m.anim = GESTES.betes; m.geste = reduced() ? 0.01 : GESTE; }, ouVeut(m))) {
        m.bloque = bloque;
        return false;
      }
      m.reprise = avant;
      m.tache = 'boite';
      m.pause = 0;
      return true;
    }
    // Il s'est servi : il reprend son trajet d'avant, si l'heure le veut encore.
    function reprendre(m) {
      const r = m.reprise;
      m.reprise = null;
      if (!r || r.but !== ouVeut(m)) return;
      if (aller(m, r.x, r.y, r.puis, r.but)) { m.tache = r.tache || null; m.pause = 0; }
    }

    // Fiche 16b : les jeux des enfants, dehors. Un enfant joue-t-il volontiers (dehors, libre) ?
    function libreJeu(m) {
      const H = maison();
      return m.enfant && m.visible && !reduced() && !m.couche && !m.tache && !m.faim && !m.geste && !m.parle && !m.rejoint && !m.jeu
        && ouVeut(m) === 'dehors' && !(H && H.dedans(m.x, m.y));
    }
    // Il arrête de jouer : là où il est (une case libre), à sa vitesse.
    function finJeu(m) {
      if (!m.jeu) return;
      m.jeu = null; m.vite = 1; m.haut = 0; m.attente = rand(1, 3);
      m.chemin = []; m.puis = null; m.but = null;
    }
    function jeu(m, type, ami, t) {
      m.jeu = { type, ami: ami || null, t: t || 0, age: 0, repath: 0 };
      m.vite = type === 'sauter' || type === 'tourner' ? 1 : JEU.VITE;
      m.pause = 0; m.bloque = 0;
    }
    // Il commence un jeu : avec un autre enfant libre tout près (la poursuite, la ronde), ou seul
    // (sauter, tourner) ; ou rien (il flâne) → false.
    function commencerJeu(m) {
      if (!libreJeu(m)) return false;
      const ami = [...membres.values()].find((a) => a !== m && libreJeu(a) && Math.hypot(a.x - m.x, a.y - m.y) < JEU.PROCHE);
      if (ami && Math.random() < 0.75) {
        if (Math.random() < 0.5 && ronde(m, ami)) return true;
        if (poursuite(m, ami)) return true;
      }
      if (Math.random() < 0.65) {
        m.chemin = []; m.puis = null; m.but = null;
        jeu(m, Math.random() < 0.5 ? 'sauter' : 'tourner', null, rand(JEU.SEUL[0], JEU.SEUL[1]));
        return true;
      }
      return false;
    }
    // La ronde : un cercle entre eux deux, dont chaque point est libre et chaque côté sans mur ;
    // chacun en part d'un côté et en fait TOURS tours.
    function ronde(a, b) {
      const L = o.fermier && o.fermier.ligneLibre;
      if (!L) return false;
      const N = 8, cx = (a.x + b.x) / 2, cy = (a.y + b.y) / 2;
      const pts = [];
      for (let k = 0; k < N; k++) pts.push({ x: cx + Math.cos((k / N) * 2 * Math.PI) * JEU.RAYON, y: cy + Math.sin((k / N) * 2 * Math.PI) * JEU.RAYON * 0.7 });
      if (!pts.every((q, k) => libre(q.x, q.y) && L(q.x, q.y, pts[(k + 1) % N].x, pts[(k + 1) % N].y))) return false;
      const k0 = { a: 0, b: N / 2 };
      if (!L(a.x, a.y, pts[k0.a].x, pts[k0.a].y) || !L(b.x, b.y, pts[k0.b].x, pts[k0.b].y)) return false;
      for (const [m, k, ami] of [[a, k0.a, b], [b, k0.b, a]]) {
        const ch = [pts[k]];
        for (let i = 1; i <= N * JEU.TOURS; i++) ch.push(pts[(k + i) % N]);
        m.chemin = ch; m.puis = null; m.but = 'dehors';
        jeu(m, 'ronde', ami);
      }
      return true;
    }
    // La poursuite : a se sauve (fuir), b court après lui (par les chemins, sans mur).
    function poursuite(a, b) {
      const t = rand(JEU.POURSUITE[0], JEU.POURSUITE[1]);
      jeu(a, 'fuit', b, t);
      if (!fuir(a)) { a.jeu = null; a.vite = 1; return false; }
      b.chemin = []; b.puis = null; b.but = null;
      jeu(b, 'court', a, t);
      b.jeu.repath = 0.4;
      return true;
    }
    // Il se sauve vers une case libre près de lui, dehors, sans s'éloigner de la maison.
    function fuir(m) {
      const d = door(), H = maison();
      for (let i = 0; i < 8; i++) {
        const tx = Math.round(m.x + rand(-3 * T, 3 * T)), ty = Math.round(m.y + rand(-2 * T, 2 * T));
        // (une case dégagée : pas au ras d'un mur, à 4 px près de chaque côté)
        if (Math.hypot(tx - d.x, ty - d.y) > ROAM + 2 * T || (H && H.dedans(tx, ty)) || ![[0, 0], [-4, 0], [4, 0], [0, -4], [0, 4]].every(([dx, dy]) => libre(tx + dx, ty + dy))) continue;
        if (aller(m, tx, ty, null, 'dehors')) { m.pause = 0; return true; }
        m.bloque = 0;
      }
      return false;
    }
    // Un pas de son jeu.
    function jouer(m, dt) {
      const j = m.jeu;
      j.age += dt;
      const bond = () => Math.abs(Math.sin(j.age * Math.PI * 3)) * JEU.BOND;
      if (j.type === 'ronde') {
        if (!m.chemin.length) { finJeu(m); return; }
        m.haut = bond();
        return;
      }
      j.t -= dt;
      if (j.t <= 0) { finJeu(m); return; }
      if (j.type === 'sauter') { m.haut = Math.abs(Math.sin(j.age * Math.PI * 2.5)) * JEU.SAUT; return; }
      if (j.type === 'tourner') {
        const [face, flip] = [['bas', false], ['cote', false], ['haut', false], ['cote', true]][Math.floor(j.age / 0.25) % 4];
        m.face = face; m.flip = flip;
        m.haut = Math.abs(Math.sin(j.age * Math.PI * 2)) * JEU.BOND;
        return;
      }
      // (la poursuite : sans camarade, elle s'arrête)
      const ami = j.ami;
      if (!ami || !ami.jeu || ami.jeu.ami !== m) { finJeu(m); return; }
      m.haut = m.chemin.length ? bond() : 0;
      if (j.type === 'fuit') {
        if (!m.chemin.length && !fuir(m)) finJeu(m);
        return;
      }
      j.repath -= dt;
      if (j.repath > 0) return;
      j.repath = 0.5;
      if (Math.hypot(ami.x - m.x, ami.y - m.y) <= JEU.ATTRAPE) {
        // attrapé : c'est l'autre qui court, lui se sauve
        m.chemin = []; ami.chemin = [];
        j.type = 'fuit'; ami.jeu.type = 'court'; ami.jeu.repath = 0.8;
        if (!fuir(m)) finJeu(m);
        return;
      }
      if (aller(m, ami.x, ami.y, null, 'dehors')) m.pause = 0;
      else finJeu(m);
    }

    function decider(m, dt) {
      const v = ouVeut(m);
      if (m.repos > 0) m.repos -= dt;
      if (m.bloque > 0) m.bloque -= dt;
      // la nuit : au lit (son lit a pu changer de place) ; le jour venu, il se lève
      if (m.couche) {
        const L = v === 'lit' ? litDe(m) : null;
        if (!L) lever(m);
        else if (L.x !== m.couche.x || L.y !== m.couche.y) coucher(m, L);
        else return;
      }
      const H = maison();
      // un enfant qui joue : jusqu'à la fin du jeu, s'il est toujours dehors et n'a pas mangé
      if (m.jeu && (v !== 'dehors' || m.faim)) finJeu(m);
      if (m.jeu) { jouer(m, dt); return; }
      // il a mangé : il va se servir, même à l'heure d'aller au lit (le dernier repas des enfants,
      // à 20 h : la boîte, puis le lit)
      if (m.faim && allerSeServir(m)) return;
      // 19 h passé : un adulte qui allait aux bêtes n'y va plus
      if (m.tache && m.tache !== 'boite' && !travaille()) { m.chemin = []; m.puis = null; m.but = null; m.tache = null; }
      // (un trajet pour ce que l'heure veut encore, ou vers la boîte : il continue ; sinon il
      // l'abandonne)
      if (m.chemin.length || m.puis) {
        if (m.but === v || m.tache === 'boite') return;
        m.chemin = []; m.puis = null; m.but = null; m.tache = null;
      }
      if (m.bloque > 0) return;
      if (v === 'lit') {
        const L = litDe(m);
        // (un lit de l'étage : il va au pied de l'escalier, et y monte)
        const vers = L.via || L;
        aller(m, vers.x, vers.y, () => coucher(m, litDe(m) || L), 'lit');
        m.tache = null;
        return;
      }
      if (v === 'dedans') {
        m.tache = null;
        if (!H) {
          // (sans maison : devant la porte du foyer)
          const d = door();
          if (Math.hypot(m.x - d.x, m.y - d.y) > 2 * DEVANT) { devantPorte(m); return; }
          m.attente -= dt;
          if (m.attente <= 0) { m.attente = rand(4, 10); devantPorte(m); }
          return;
        }
        if (!H.dedans(m.x, m.y)) { if (!placeDedans(m, H)) m.bloque = rand(BLOQUE[0], BLOQUE[1]); return; }
        m.attente -= dt;
        if (m.attente <= 0) { m.attente = rand(5, 12); placeDedans(m, H); }
        return;
      }
      // le jour et le soir : il sort (par la porte), flâne (les enfants jouent), ou s'occupe des bêtes
      if (H && H.dedans(m.x, m.y) && !m.tache) { flanerVers(m); return; }
      if (!m.chemin.length && !m.tache && !soccuper(m)) {
        m.attente -= dt;
        // (un enfant joue plus souvent qu'il ne flâne)
        if (m.attente <= 0) { m.attente = m.enfant ? rand(1, 3) : rand(3, 8); if (!(m.enfant && commencerJeu(m))) flanerVers(m); }
      }
    }

    function avancer(m, dt) {
      if (m.pause > 0 && m.chemin.length) { m.pause -= dt; return false; }
      if (!m.chemin.length) {
        if (m.puis) { const f = m.puis; m.puis = null; m.but = null; f(); }
        return false;
      }
      const to = m.chemin[0];
      const dx = to.x - m.x, dy = to.y - m.y, l = Math.hypot(dx, dy), st = (m.enfant ? VITESSE.enfant : VITESSE.adulte) * (m.vite || 1) * dt;
      // (le regard lissé : une diagonale en escalier ne le fait pas tourner à chaque case)
      ({ face: m.face, flip: m.flip } = (m.allure || (m.allure = K.allure())).pas(dx, dy, Math.min(l, st), m));
      if (l <= st) { m.x = to.x; m.y = to.y; m.chemin.shift(); } else { m.x += (dx / l) * st; m.y += (dy / l) * st; }
      m.marche += Math.min(l, st);
      // (la marche donne faim : comptée au moteur par tranches de PAS_COMPTE px)
      m.pas = (m.pas || 0) + Math.min(l, st);
      if (m.pas >= PAS_COMPTE && o.marche) { o.marche(m.id, m.pas); m.pas = 0; }
      return true;
    }

    // Au chargement de la page (ou sa planche arrivée) : il est déjà là où l'heure le veut
    // (dehors : près de son coin ; dans la maison : à une place ; au lit).
    function placer(m) {
      const v = ouVeut(m), H = maison(), d = door();
      m.alpha = 1; m.fade = 0; m.visible = true;
      if (v === 'lit') { coucher(m, litDe(m)); return; }
      if (v === 'dedans' && H) {
        if (H.places.length) { const q = H.places[Math.floor(Math.random() * H.places.length)]; m.x = q.x; m.y = q.y; return; }
      }
      const p = v === 'dehors' ? placeLibre(d.x + m.coin.dx, d.y + m.coin.dy) : placeLibre(d.x, d.y);
      m.x = p.x; m.y = p.y;
    }

    return {
      // Les membres, l'heure et l'horaire (le modèle de la carte, js/ui/stage.js).
      sync(next) {
        model = next;
        const defs = (next && next.famille) || [];
        const ids = new Set(defs.map((d) => d.id));
        for (const [id, m] of membres) if (!ids.has(id)) { m.s.destroy(); if (m.drap) m.drap.destroy(); membres.delete(id); }
        defs.forEach((def, i) => { const m = membres.get(def.id); if (m) m.rang = i; });
        const manque = [];
        for (const def of defs) {
          const key = cle(def);
          const m = membres.get(def.id);
          if (m && m.key === key) continue;
          if (!scene.textures.exists(key)) { manque.push(def); continue; }
          const n = creer(def);
          n.rang = defs.indexOf(def);
          // (un autre personnage pour lui : la nouvelle planche, à la même place)
          if (m) {
            Object.assign(n, { x: m.x, y: m.y, couche: null, alpha: 1, visible: true, coin: m.coin });
            m.s.destroy(); if (m.drap) m.drap.destroy();
            if (m.couche) coucher(n, m.couche);
          } else placer(n);
          membres.set(def.id, n);
        }
        if (manque.length) {
          for (const def of manque) if (!scene.textures.exists(cle(def))) scene.load.spritesheet(cle(def), o.file(def.perso, def.enfant), { frameWidth: 16, frameHeight: 32 });
          scene.load.once('complete', () => this.sync(model));
          if (!scene.load.isLoading()) scene.load.start();
        }
      },
      update(deltaMs) {
        const dt = Math.min(deltaMs, 100) / 1000;
        for (const m of membres.values()) {
          // (le second adulte se baisse au Poulailler ou à l'Étable)
          if (m.geste > 0) {
            m.geste -= dt;
            if (m.geste <= 0) { m.geste = 0; finirTache(m); }
            else {
              const A = m.anim || GESTES.betes, k = Math.min(A.seq.length - 1, Math.floor((1 - m.geste / A.dur) * A.seq.length));
              const nom = A.nom(m.face, A.seq[k]);
              dessiner(m, F[nom] !== undefined ? nom : `ramasse_${Math.min(2, k)}`);
              continue;
            }
          }
          // (le second adulte parle avec le personnage : il s'arrête et se tourne vers lui ; son
          // chemin l'attend)
          const parle = m.parle && !m.couche && m.visible;
          if (parle) ({ face: m.face, flip: m.flip } = K.regard(m.parle.x - m.x, m.parle.y - m.y));
          if (!parle && !m.rejoint) decider(m, dt);
          const marche = !parle && avancer(m, dt);
          // (arrêté, il repartira par un passage : m.marche compte depuis le départ)
          if (!marche) m.marche = 0;
          if (m.fade) {
            m.alpha = Math.max(0, Math.min(1, m.alpha + (m.fade * dt) / FADE_S));
            if (m.alpha >= 1 && m.fade > 0) m.fade = 0;
          }
          m.s.setVisible(m.visible);
          if (m.drap) m.drap.setVisible(!!m.couche);
          if (!m.visible) continue;
          // au lit : les yeux fermés, un souffle lent, juste devant le lit, sous sa couverture
          if (m.couche) {
            const n = Math.floor(performance.now() / 1600) % 2;
            dessiner(m, F[`dort_bas_${n}`] !== undefined ? `dort_bas_${n}` : `idle_bas_${n}`);
            // (m.couche.z : un lit de l'étage, dont la profondeur a sa propre échelle)
            const L = m.couche, z = (k) => (L.z ? L.z(k) : L.depth + k);
            m.s.setDepth(z(0.1));
            if (m.drap) m.drap.setDepth(z(0.2));
            continue;
          }
          dessiner(m, marche ? `marche_${m.face}_${K.imageMarche(m.marche, m.enfant ? 'enfant' : 'adulte')}` : `idle_${m.face}_${Math.floor(performance.now() / 600) % 2}`);
        }
      },
      info() {
        const H = maison();
        return [...membres.values()].map((m) => ({
          id: m.id, enfant: m.enfant,
          ou: m.couche ? 'lit' : H && H.dedans(m.x, m.y) ? 'dedans' : 'dehors',
          voulu: ouVeut(m), lit: !!m.couche, visible: m.visible, x: Math.round(m.x), y: Math.round(m.y), marche: m.chemin.length > 0, tache: m.tache,
          jeu: m.jeu ? m.jeu.type : null, haut: m.haut || 0,
        }));
      },
      rejoindre(at) {
        const A = model && model.aide, m = A && membres.get(A.id);
        if (!m) return false;
        if (!at) {
          if (m.parle || m.rejoint) { m.parle = null; m.rejoint = null; m.chemin = []; m.puis = null; m.but = null; }
          return false;
        }
        if (m.parle) return true;
        // (debout ; s'il se baisse au Poulailler ou à l'Étable, il finit d'abord)
        if (!m.visible || m.couche || m.geste > 0) return false;
        m.tache = null;
        // sa place : à côté du personnage, du côté où il arrive (sinon de l'autre)
        const c = m.x <= at.x ? -1 : 1;
        const place = [c, -c].map((k) => ({ x: at.x + k * COTE, y: at.y })).find((q) => libre(q.x, q.y));
        if (!place || Math.hypot(m.x - place.x, m.y - place.y) <= 3) {
          m.rejoint = null; m.chemin = []; m.puis = null; m.parle = { x: at.x, y: at.y };
          return true;
        }
        if (!m.rejoint || Math.hypot(m.rejoint.x - place.x, m.rejoint.y - place.y) > T) {
          m.rejoint = place;
          // (pas de chemin jusqu'à lui : il lui parle d'où il est)
          if (!aller(m, place.x, place.y, () => { m.rejoint = null; m.parle = { x: at.x, y: at.y }; })) { m.rejoint = null; m.bloque = 0; m.parle = { x: at.x, y: at.y }; return true; }
          m.pause = 0;
        }
        return false;
      },
      // Il vient de manger (le moteur) : il ira se servir dès qu'il le peut (s'il se baisse ou
      // parle, ensuite) ; au lit, ou sans endroit où se servir, non : → false.
      allerManger(id) {
        const m = membres.get(id);
        if (!m || !m.visible || m.couche || !o.boite || !o.boite()) return false;
        if (m.tache !== 'boite') m.faim = true;
        return true;
      },
      aidePos() {
        const A = model && model.aide, m = A && membres.get(A.id);
        return m && m.visible ? { x: m.x, y: m.y } : null;
      },
      destroy() { for (const m of membres.values()) { m.s.destroy(); if (m.drap) m.drap.destroy(); } membres.clear(); },
    };
  }

  global.FamilleFerme = { attach, voulu, couche, GESTES };
})(window);
