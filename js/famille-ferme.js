/*
 * La famille sur la carte de la ferme (js/farm-stage.js) : les membres autres que le personnage
 * du joueur (js/fermier.js), chacun avec son personnage (assets/personnages/perso_NN.png ; les
 * enfants, leurs planches à eux : assets/personnages/enfant_NN.png), font leur journée :
 *
 *   - avant 7 h et à partir de 18 h 45 (le repas est à 19 h), ils sont dans la maison (o.maison :
 *     l'intérieur du bâtiment du foyer, sous son toit, js/carte/ferme/chantier.js homeInside) :
 *     ils y entrent par la porte, en marchant, et y restent visibles (on les voit quand le toit
 *     se lève, le personnage dedans) ; ils y vont d'une place à l'autre, et de 18 h 45 à 20 h 30
 *     chacun s'assoit sur une chaise (o.maison().chaises : une par membre, dans l'ordre ; tourné
 *     vers la table), les autres restent debout ; sans maison, ils se tiennent devant la porte du
 *     foyer (o.porte) ;
 *   - sur la ferme générée, pendant la nuit (model.nuit, 22 h → 6 h), chacun dort dans son lit
 *     (o.lit(k) : le k-ième membre a le (k + 2)-ième couchage, le premier est au personnage du
 *     joueur) : il y va, s'y couche sous la couverture (debout entre le lit et elle, tourné vers
 *     nous, comme le personnage) et se lève au réveil ; sans lit pour lui, il reste dans la maison ;
 *   - le jour, ils sortent par la porte et flânent autour de la maison, d'un coin à l'autre ;
 *   - le second adulte du foyer (model.aide, le moteur : aidant) s'occupe des bêtes : le jour,
 *     quand il y a à faire au Poulailler, à l'Étable ou à une ruche pleine (model.aide.lieux :
 *     « ruche:<case> »), il y va, se baisse (GESTE s) et nourrit les poules, prend les œufs, le
 *     lait et la laine, récolte le miel (o.aide : tout entre
 *     dans l'inventaire ; o.gain : la bulle « +x » au-dessus de lui) ;
 *   - chacun a faim en marchant (o.marche(id, px) : le moteur compte 1 point de faim tous les
 *     FAMILLE.FAIM.PX_PAR_POINT px, js/engine/repas.js) ; quand il mange à la boîte à nourriture,
 *     il y va et se baisse (allerManger, appelé par la page : js/ui/loop.js ; o.boite : où elle est) ;
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
 * Ce qu'il fait à une heure donnée ne dépend que de l'heure et de ce qu'il y a (FamilleFerme.voulu,
 * testé sans navigateur : tests/engine/famille-visible.test.mjs).
 */
(function (global) {
  'use strict';

  const K = global.CarteKit;
  const T = K.T;
  // sortie : ils sortent ; rentree : ils rentrent (le repas est à 19 h) ; repas : jusque-là, chacun
  // sur sa chaise
  const HORAIRE = { sortie: 7, rentree: 18.75, repas: 20.5 };
  const VITESSE = K.VITESSES.famille;     // px/s : { adulte, enfant }
  const ROAM = 6 * T;                      // autour de la maison
  const FADE_S = 0.5;
  const PAS = 4;                           // px par image de marche
  const GESTE = 1.2;                       // s : le second adulte se baisse au Poulailler, à l'Étable
  const REPOS = 3;                         // s avant de chercher autre chose à faire
  const ENFANT_DY = 4;                     // px : un enfant couché est remonté d'autant (il est plus petit)
  const COTE = 20;                         // px : le second adulte qui vient parler, à côté du personnage
  const PAS_COMPTE = 50;                   // px : la marche est comptée au moteur par tranches d'autant (o.marche)
  const BLOQUE = [2, 4];                   // s : sans chemin, il attend avant de réessayer
  const DEVANT = 2 * T;                    // sans maison : il reste à moins de ça de la porte

  const rand = (a, b) => a + Math.random() * (b - a);

  // Où un membre doit être à l'heure `heure` (la nuit : `nuit`), avec ou sans lit (`lit`) :
  // 'lit', 'dedans' (dans la maison) ou 'dehors'. Et s'il doit être à table (assis).
  function voulu(heure, nuit, lit) {
    if (nuit && lit) return 'lit';
    if (nuit) return 'dedans';
    if (heure < HORAIRE.sortie || heure >= HORAIRE.rentree) return 'dedans';
    return 'dehors';
  }
  const aTable = (heure, nuit) => !nuit && heure >= HORAIRE.rentree && heure < HORAIRE.repas;

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
    const ouVeut = (m) => voulu(heure(), nuit(), !!litDe(m));
    // Sa chaise à table (le k-ième membre, la k-ième chaise), ou null.
    const chaiseDe = (m, H) => (H && m.rang >= 0 && m.rang < H.chaises.length ? H.chaises[m.rang] : null);

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
        rang: -1, couche: null, drap: null,  // la nuit : son rang (son lit, o.lit), son lit s'il y dort
        assis: null,                         // à table : sa chaise (o.maison().chaises)
      };
    }

    // Il se couche dans son lit `L` (o.lit) : debout entre le lit et sa couverture.
    function coucher(m, L) {
      m.couche = L; m.assis = null; m.chemin = []; m.puis = null; m.but = null; m.tache = null;
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
    // Il s'assoit sur la chaise `c` (o.maison().chaises), tourné vers la table.
    function asseoir(m, c) {
      m.assis = c; m.chemin = []; m.puis = null; m.but = null;
      m.x = c.x; m.y = c.y; m.face = c.face; m.flip = c.flip;
    }
    // Il se lève de sa chaise : à côté d'elle, d'où il s'y était assis.
    function debout(m) {
      const c = m.assis;
      m.assis = null;
      if (c) { m.x = c.pied.x; m.y = c.pied.y; }
    }

    function dessiner(m, nom) {
      const k = F[nom];
      if (k !== undefined) m.s.setFrame(k);
      m.s.setPosition(Math.round(m.x), Math.round(m.y)).setFlipX(m.flip).setDepth(m.y).setAlpha(m.alpha);
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

    // Le second adulte : y a-t-il à faire au Poulailler ou à l'Étable ? Il y va, se baisse
    // (m.geste), puis le jeu fait le travail (o.aide) et la bulle monte (o.gain).
    function soccuper(m) {
      const A = model && model.aide;
      if (!A || A.id !== m.id || m.enfant || m.tache || m.repos > 0 || !o.aide) return false;
      const lieu = (A.lieux || []).find((l) => o.fermier && o.fermier.lieu && o.fermier.lieu(l));
      if (!lieu) return false;
      const spot = o.fermier.lieu(lieu);
      if (!aller(m, spot.x, spot.y, () => { m.face = 'cote'; m.flip = false; m.geste = reduced() ? 0.01 : GESTE; }, 'dehors')) { m.repos = REPOS; return false; }
      m.tache = lieu;
      return true;
    }
    function finirTache(m) {
      const lieu = m.tache;
      m.tache = null;
      m.repos = REPOS;
      if (lieu === 'boite' || !lieu) return;   // il a mangé (le moteur l'a déjà fait)
      o.aide(lieu, (items) => { if (items && o.gain) o.gain(items); });
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
      // à table : il y reste jusqu'à la fin du repas (sa chaise a pu changer, ou disparaître)
      if (m.assis) {
        const c = v === 'dedans' && aTable(heure(), nuit()) ? chaiseDe(m, H) : null;
        if (c && c.x === m.assis.x && c.y === m.assis.y) return;
        debout(m);
      }
      // (un trajet pour ce que l'heure veut encore : il continue ; sinon il l'abandonne)
      if (m.chemin.length || m.puis) {
        if (m.but === v) return;
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
        const c = aTable(heure(), nuit()) ? chaiseDe(m, H) : null;
        if (c) { aller(m, c.pied.x, c.pied.y, () => asseoir(m, c), 'dedans'); return; }
        if (!H.dedans(m.x, m.y)) { if (!placeDedans(m, H)) m.bloque = rand(BLOQUE[0], BLOQUE[1]); return; }
        m.attente -= dt;
        if (m.attente <= 0) { m.attente = rand(5, 12); placeDedans(m, H); }
        return;
      }
      // le jour : il sort (par la porte), flâne, ou s'occupe des bêtes
      if (H && H.dedans(m.x, m.y) && !m.tache) { flanerVers(m); return; }
      if (!m.chemin.length && !m.tache && !soccuper(m)) {
        m.attente -= dt;
        if (m.attente <= 0) { m.attente = rand(3, 8); flanerVers(m); }
      }
    }

    function avancer(m, dt) {
      if (m.pause > 0 && m.chemin.length) { m.pause -= dt; return false; }
      if (!m.chemin.length) {
        if (m.puis) { const f = m.puis; m.puis = null; m.but = null; f(); }
        return false;
      }
      const to = m.chemin[0];
      const dx = to.x - m.x, dy = to.y - m.y, l = Math.hypot(dx, dy), st = (m.enfant ? VITESSE.enfant : VITESSE.adulte) * dt;
      ({ face: m.face, flip: m.flip } = K.regard(dx, dy));
      if (l <= st) { m.x = to.x; m.y = to.y; m.chemin.shift(); } else { m.x += (dx / l) * st; m.y += (dy / l) * st; }
      m.marche += Math.min(l, st);
      // (la marche donne faim : comptée au moteur par tranches de PAS_COMPTE px)
      m.pas = (m.pas || 0) + Math.min(l, st);
      if (m.pas >= PAS_COMPTE && o.marche) { o.marche(m.id, m.pas); m.pas = 0; }
      return true;
    }

    // Au chargement de la page (ou sa planche arrivée) : il est déjà là où l'heure le veut
    // (dehors : près de son coin ; dans la maison : à table, ou à une place ; au lit).
    function placer(m) {
      const v = ouVeut(m), H = maison(), d = door();
      m.alpha = 1; m.fade = 0; m.visible = true;
      if (v === 'lit') { coucher(m, litDe(m)); return; }
      if (v === 'dedans' && H) {
        const c = aTable(heure(), nuit()) ? chaiseDe(m, H) : null;
        if (c) { asseoir(m, c); return; }
        if (H.places.length) { const q = H.places[Math.floor(Math.random() * H.places.length)]; m.x = q.x; m.y = q.y; return; }
      }
      const p = v === 'dehors' ? placeLibre(d.x + m.coin.dx, d.y + m.coin.dy) : placeLibre(d.x, d.y);
      m.x = p.x; m.y = p.y;
    }

    return {
      // Les membres et l'heure (le modèle de la carte, js/ui/stage.js).
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
            Object.assign(n, { x: m.x, y: m.y, couche: null, assis: null, alpha: 1, visible: true, coin: m.coin });
            m.s.destroy(); if (m.drap) m.drap.destroy();
            if (m.couche) coucher(n, m.couche); else if (m.assis) asseoir(n, m.assis);
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
            else { dessiner(m, `ramasse_${Math.min(2, Math.floor((1 - m.geste / GESTE) * 3))}`); continue; }
          }
          // (le second adulte parle avec le personnage : il s'arrête et se tourne vers lui ; son
          // chemin l'attend)
          const parle = m.parle && !m.couche && !m.assis && m.visible;
          if (parle) ({ face: m.face, flip: m.flip } = K.regard(m.parle.x - m.x, m.parle.y - m.y));
          if (!parle && !m.rejoint) decider(m, dt);
          const marche = !parle && avancer(m, dt);
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
          // à table : assis sur sa chaise, juste devant elle
          if (m.assis) {
            dessiner(m, F[`assis_${m.face}_0`] !== undefined ? `assis_${m.face}_0` : `idle_${m.face}_0`);
            m.s.setDepth(m.assis.depth);
            continue;
          }
          dessiner(m, marche ? `marche_${m.face}_${Math.floor(m.marche / PAS) % 4}` : `idle_${m.face}_${Math.floor(performance.now() / 600) % 2}`);
        }
      },
      info() {
        const H = maison();
        return [...membres.values()].map((m) => ({
          id: m.id, enfant: m.enfant,
          ou: m.couche ? 'lit' : H && H.dedans(m.x, m.y) ? 'dedans' : 'dehors',
          voulu: ouVeut(m), lit: !!m.couche, assis: !!m.assis, visible: m.visible, x: Math.round(m.x), y: Math.round(m.y), marche: m.chemin.length > 0, tache: m.tache,
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
        if (!m.visible || m.couche || m.assis || m.geste > 0) return false;
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
      allerManger(id) {
        const m = membres.get(id);
        const spot = o.boite ? o.boite() : null;
        if (!m || !spot || !m.visible || m.couche || m.assis || m.geste > 0 || m.parle || m.rejoint) return false;
        if (!aller(m, spot.x, spot.y, () => { m.face = 'haut'; m.flip = false; m.geste = reduced() ? 0.01 : GESTE; }, ouVeut(m))) return false;
        m.tache = 'boite';
        return true;
      },
      aidePos() {
        const A = model && model.aide, m = A && membres.get(A.id);
        return m && m.visible ? { x: m.x, y: m.y } : null;
      },
      destroy() { for (const m of membres.values()) { m.s.destroy(); if (m.drap) m.drap.destroy(); } membres.clear(); },
    };
  }

  global.FamilleFerme = { attach, HORAIRE, voulu, aTable };
})(window);
