/*
 * La famille sur la carte de la ferme (js/farm-stage.js) : les membres autres que le personnage
 * du joueur (js/fermier.js), chacun avec son personnage (assets/personnages/perso_NN.png ; les
 * enfants, leurs planches à eux : assets/personnages/enfant_NN.png), font leur journée :
 *
 *   - la nuit, avant 7 h et à partir de 18 h 45 (le repas est à 19 h), ils sont dans la maison ;
 *     sur la ferme générée, pendant la nuit (model.nuit, 22 h → 6 h), chacun dort dans son lit
 *     (o.lit(k) : le k-ième membre a le (k + 2)-ième couchage, le premier est au personnage du
 *     joueur) : il y va, s'y couche sous la couverture (debout entre le lit et elle, tourné vers
 *     nous, comme le personnage) et se lève au réveil ; sans lit pour lui, il reste dedans ;
 *   - le jour, ils sortent par la porte et flânent autour de la maison, d'un coin à l'autre ;
 *   - le second adulte du foyer (model.aide, le moteur : aidant) s'occupe des bêtes : le jour,
 *     quand il y a à faire au Poulailler ou à l'Étable (model.aide.lieux), il y va, se baisse
 *     (GESTE s) et nourrit les poules, prend les œufs, le lait et la laine (o.aide : tout entre
 *     dans l'inventaire ; o.gain : la bulle « +x » au-dessus de lui) ;
 *   - les enfants vont à l'école le lundi, le mardi, le jeudi et le vendredi ; elle commence à
 *     8 h 45 (CarteKit.ECOLE). Chacun part de la maison le temps qu'il lui faut pour être au bord
 *     de la carte quand il doit marcher jusqu'au bus de la carte de transition
 *     (CarteKit.horaireEcole : sortieFerme) : la longueur de son chemin, à sa vitesse
 *     (departEcole) ; il prend le chemin de l'est et s'efface (parti avant le réveil du
 *     joueur, on ne le voit pas partir). Le soir, il revient par le même bout du chemin, à
 *     l'heure où le bus l'a ramené (retourFerme).
 *
 * Ils marchent par les chemins du personnage (fermier.path : les mêmes cases libres). Avec
 * « animations réduites », ils vont d'un point à l'autre sans marcher. Rien ne bouge dans un
 * intérieur (ils y sont cachés).
 *
 *   const famille = FamilleFerme.attach(scene, { fermier, frames, exit: { x, y }, file(perso, enfant), reduced })
 *   famille.sync(model)          // model.famille : [{ id, perso, enfant }], model.heure, model.semaine, model.nuit
 *   famille.update(deltaMs, room)
 *   famille.info()               // pour les tests : où est chacun
 *   famille.aidePos()            // où est le second adulte (sa bulle « +x »), ou null
 */
(function (global) {
  'use strict';

  const K = global.CarteKit;
  const T = K.T;
  const HORAIRE = { sortie: 7, rentree: 18.75, retard: 0.4 };
  const JOURS_ECOLE = [0, 1, 3, 4];       // lundi, mardi, jeudi, vendredi (0 : lundi)
  const VITESSE = K.VITESSES.famille;     // px/s : { adulte, enfant }
  const ROAM = 6 * T;                      // autour de la maison
  const FADE_S = 0.5;
  const PAS = 4;                           // px par image de marche
  const GESTE = 1.2;                       // s : le second adulte se baisse au Poulailler, à l'Étable
  const REPOS = 3;                         // s avant de chercher autre chose à faire
  const ENFANT_DY = 4;                     // px : un enfant couché est remonté d'autant (il est plus petit)

  const rand = (a, b) => a + Math.random() * (b - a);

  function attach(scene, o) {
    const F = {};
    (o.frames || []).forEach((name, i) => { F[name] = i; });
    const reduced = o.reduced || (() => false);
    const membres = new Map();     // id → marcheur
    let model = null;

    function door() {
      const h = scene.buildings && scene.buildings.get('maison') && scene.buildings.get('maison').sprite;
      if (h) return { x: Math.round(h.x + h.width * 0.5), y: Math.round(h.y + 6) };
      const f = scene.homeDoor ? scene.homeDoor() : null;   // la ferme générée : la porte du foyer
      return f || { x: scene.world.w / 2, y: scene.world.h / 2 };
    }

    // L'heure où l'enfant `m` part pour l'école : le bord de la carte à l'heure (sortieFerme),
    // moins le temps de son chemin depuis la porte (à sa vitesse, et son retard dans la file).
    // Calculée de nouveau si la porte change.
    function departEcole(m) {
      const d = door(), e = o.exit, cle = d.x + ',' + d.y;
      if (m.ecole && m.ecole.cle === cle) return m.ecole.h;
      const p = o.fermier && o.fermier.path ? o.fermier.path(d.x, d.y, e.x, e.y) : null;
      const L = p && p.length ? K.longueur(p, d) : Math.hypot(e.x - d.x, e.y - d.y);
      m.ecole = { cle, h: K.horaireEcole().sortieFerme - K.heuresDeMarche(L, VITESSE.enfant, m.retard) };
      return m.ecole.h;
    }

    // Son lit (o.lit), ou null.
    const litDe = (m) => (o.lit && m.rang >= 0 ? o.lit(m.rang) : null);

    // Où il doit être à cette heure : 'lit', 'dedans', 'dehors' ou 'ecole'.
    function voulu(m) {
      if (model && model.nuit && litDe(m)) return 'lit';
      if (!model || model.nuit) return 'dedans';
      const h = model.heure;
      if (m.enfant && JOURS_ECOLE.includes(model.semaine) && h >= departEcole(m) && h < K.horaireEcole().retourFerme) return 'ecole';
      if (h < HORAIRE.sortie || h >= HORAIRE.rentree) return 'dedans';
      return 'dehors';
    }

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
        ou: 'dedans',            // dedans, dehors, ecole (où il est vraiment)
        visible: false, alpha: 0, fade: 0,
        chemin: [], puis: null, attente: rand(0.5, 3),
        // chacun son coin préféré autour de la maison
        coin: { dx: rand(-ROAM, ROAM), dy: rand(T, ROAM) },
        // en file : un peu de retard au départ, un pas de côté sur le chemin
        retard: k * 0.7, cote: ((k % 3) - 1) * 6, pause: 0,
        tache: null, geste: 0, repos: 0,     // le second adulte : le lieu où il va, son geste
        rang: -1, couche: null, drap: null,  // la nuit : son rang (son lit, o.lit), son lit s'il y dort
      };
    }

    // Il se couche dans son lit `L` (o.lit) : debout entre le lit et sa couverture.
    function coucher(m, L) {
      m.couche = L; m.ou = 'lit'; m.chemin = []; m.puis = null; m.tache = null;
      // (un enfant est plus petit, ENFANT_RANGEES de scripts/personnage/chibi.py : remonté, la tête sur l'oreiller)
      m.x = L.x; m.y = L.y - (m.enfant ? ENFANT_DY : 0); m.face = 'bas'; m.flip = false;
      m.visible = true; m.fade = 1;
      if (reduced()) m.alpha = 1;
      if (!m.drap) m.drap = scene.add.image(0, 0, L.drap.key, L.drap.frame).setOrigin(0.5, 1);
      m.drap.setTexture(L.drap.key, L.drap.frame).setPosition(L.drap.x, L.drap.y).setDepth(L.depth + 0.2).setVisible(true);
    }
    // Il se lève : à côté du lit, sans couverture ; il repart de là (dehors, visible).
    function lever(m) {
      m.couche = null; m.ou = 'dehors';
      if (m.drap) m.drap.setVisible(false);
      m.y += 4;
    }

    function dessiner(m, nom) {
      const k = F[nom];
      if (k !== undefined) m.s.setFrame(k);
      m.s.setPosition(Math.round(m.x), Math.round(m.y)).setFlipX(m.flip).setDepth(m.y).setAlpha(m.alpha);
    }

    function aller(m, tx, ty, puis) {
      m.puis = puis || null;
      if (reduced()) { m.x = tx; m.y = ty; m.chemin = []; return; }
      const p = o.fermier && o.fermier.path ? o.fermier.path(m.x, m.y, tx, ty) : null;
      m.chemin = (p && p.length ? p.slice() : [{ x: tx, y: ty }]).map((q, i, a) => (i < a.length - 1 ? { x: q.x, y: q.y + m.cote } : q));
      m.pause = m.retard;
    }

    function apparaitre(m, x, y) {
      m.x = x; m.y = y; m.visible = true; m.fade = 1; m.ou = 'dehors';
      if (reduced()) m.alpha = 1;
    }
    function disparaitre(m, ou) {
      m.fade = -1; m.ou = ou;
      if (reduced()) { m.alpha = 0; m.visible = false; }
    }

    // Une case libre près du coin de la maison qu'il préfère.
    function flanerVers(m) {
      const d = door();
      for (let i = 0; i < 8; i++) {
        const tx = d.x + m.coin.dx + rand(-2 * T, 2 * T), ty = d.y + m.coin.dy + rand(-2 * T, 2 * T);
        if (o.fermier && o.fermier.standable && !o.fermier.standable(tx, ty)) continue;
        aller(m, tx, ty);
        return;
      }
      m.attente = rand(1, 3);
    }

    // Le second adulte : y a-t-il à faire au Poulailler ou à l'Étable ? Il y va, se baisse
    // (m.geste), puis le jeu fait le travail (o.aide) et la bulle monte (o.gain).
    function soccuper(m) {
      const A = model && model.aide;
      if (!A || A.id !== m.id || m.enfant || m.tache || m.repos > 0 || !o.aide) return false;
      const lieu = (A.lieux || []).find((l) => o.fermier && o.fermier.lieu && o.fermier.lieu(l));
      if (!lieu) return false;
      const spot = o.fermier.lieu(lieu);
      m.tache = lieu;
      aller(m, spot.x, spot.y, () => { m.face = 'cote'; m.flip = false; m.geste = reduced() ? 0.01 : GESTE; });
      return true;
    }
    function finirTache(m) {
      const lieu = m.tache;
      m.tache = null;
      m.repos = REPOS;
      o.aide(lieu, (items) => { if (items && o.gain) o.gain(items); });
    }

    function decider(m, dt) {
      const v = voulu(m);
      const d = door(), e = o.exit;
      if (m.repos > 0) m.repos -= dt;
      // la nuit : au lit (son lit a pu changer de place) ; le jour venu, il se lève
      if (m.ou === 'lit') {
        const L = v === 'lit' ? litDe(m) : null;
        if (!L) lever(m);
        else if (L.x !== m.couche.x || L.y !== m.couche.y) coucher(m, L);
        else return;
      }
      if (v === 'lit') {
        const L = litDe(m);
        if (m.puis && m.vers === 'lit') return;               // il y va
        if (!m.visible || m.fade < 0) { apparaitre(m, d.x, d.y); m.alpha = Math.max(m.alpha, 0.01); }
        m.tache = null; m.vers = 'lit';
        aller(m, L.x, L.y, () => { m.vers = null; coucher(m, litDe(m) || L); });
        return;
      }
      m.vers = null;
      if (m.ou === 'dehors' && m.visible && m.fade >= 0) {
        if (m.tache && v !== 'dehors') m.tache = null;
        if (v === 'dedans' && !m.puis) aller(m, d.x, d.y, () => disparaitre(m, 'dedans'));
        else if (v === 'ecole' && !m.puis) aller(m, e.x, e.y, () => disparaitre(m, 'ecole'));
        else if (v === 'dehors' && !m.chemin.length && !m.tache && !soccuper(m)) {
          m.attente -= dt;
          if (m.attente <= 0) { m.attente = rand(3, 8); flanerVers(m); }
        }
        return;
      }
      if (m.visible) return;          // il s'efface
      const h = model ? model.heure : 12;
      if (m.ou === 'dedans' && v === 'dehors') { apparaitre(m, d.x, d.y); aller(m, d.x, d.y + T); }
      // c'est l'heure de l'école et il était encore à la maison : on le voit partir (pas s'il
      // est déjà bien tard, il est déjà parti)
      else if (m.ou === 'dedans' && v === 'ecole' && h < departEcole(m) + HORAIRE.retard) { apparaitre(m, d.x, d.y); aller(m, e.x, e.y, () => disparaitre(m, 'ecole')); }
      else if (m.ou === 'dedans' && v === 'ecole') m.ou = 'ecole';
      // l'école est finie : il revient par le chemin de l'est
      else if (m.ou === 'ecole' && v === 'dehors') { apparaitre(m, e.x, e.y); aller(m, d.x + m.coin.dx, d.y + m.coin.dy); }
      else if (m.ou === 'ecole' && v === 'dedans' && model && !model.nuit && h >= K.horaireEcole().retourFerme) m.ou = 'dedans';
    }

    function avancer(m, dt) {
      if (m.pause > 0 && m.chemin.length) { m.pause -= dt; return false; }
      if (!m.chemin.length) {
        if (m.puis) { const f = m.puis; m.puis = null; f(); }
        return false;
      }
      const to = m.chemin[0];
      const dx = to.x - m.x, dy = to.y - m.y, l = Math.hypot(dx, dy), st = (m.enfant ? VITESSE.enfant : VITESSE.adulte) * dt;
      ({ face: m.face, flip: m.flip } = K.regard(dx, dy));
      if (l <= st) { m.x = to.x; m.y = to.y; m.chemin.shift(); } else { m.x += (dx / l) * st; m.y += (dy / l) * st; }
      m.marche += Math.min(l, st);
      return true;
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
          if (m) { m.s.destroy(); if (m.drap) m.drap.destroy(); }
          const n = creer(def);
          n.rang = defs.indexOf(def);
          // au chargement de la page : il est déjà là où l'heure le veut (dehors : près de son coin)
          const v = voulu(n);
          if (v === 'dehors') { const d = door(); apparaitre(n, d.x + n.coin.dx, d.y + n.coin.dy); n.alpha = 1; n.fade = 0; }
          else if (v === 'lit') { coucher(n, litDe(n)); n.alpha = 1; n.fade = 0; }
          else n.ou = v;
          membres.set(def.id, n);
        }
        if (manque.length) {
          for (const def of manque) scene.load.spritesheet(cle(def), o.file(def.perso, def.enfant), { frameWidth: 16, frameHeight: 32 });
          scene.load.once('complete', () => this.sync(model));
          scene.load.start();
        }
      },
      update(deltaMs, room) {
        const dt = Math.min(deltaMs, 100) / 1000;
        for (const m of membres.values()) {
          // (le second adulte se baisse au Poulailler ou à l'Étable)
          if (m.geste > 0 && !room) {
            m.geste -= dt;
            if (m.geste <= 0) { m.geste = 0; finirTache(m); }
            else { dessiner(m, `ramasse_${Math.min(2, Math.floor((1 - m.geste / GESTE) * 3))}`); continue; }
          }
          if (!room) decider(m, dt);
          const marche = !room && avancer(m, dt);
          if (m.fade) {
            m.alpha = Math.max(0, Math.min(1, m.alpha + (m.fade * dt) / FADE_S));
            if (m.alpha >= 1 && m.fade > 0) m.fade = 0;
            if (m.alpha <= 0 && m.fade < 0) { m.fade = 0; m.visible = false; }
          }
          m.s.setVisible(m.visible && !room);
          if (m.drap) m.drap.setVisible(!!m.couche && !room);
          if (!m.visible || room) continue;
          // au lit : les yeux fermés, un souffle lent, juste devant le lit, sous sa couverture
          if (m.couche) {
            const n = Math.floor(performance.now() / 1600) % 2;
            dessiner(m, F[`dort_bas_${n}`] !== undefined ? `dort_bas_${n}` : `idle_bas_${n}`);
            m.s.setDepth(m.couche.depth + 0.1);
            continue;
          }
          dessiner(m, marche ? `marche_${m.face}_${Math.floor(m.marche / PAS) % 4}` : `idle_${m.face}_${Math.floor(performance.now() / 600) % 2}`);
        }
      },
      info() {
        return [...membres.values()].map((m) => ({ id: m.id, enfant: m.enfant, ou: m.ou, lit: !!m.couche, visible: m.visible, x: Math.round(m.x), y: Math.round(m.y), marche: m.chemin.length > 0, tache: m.tache, ecole: m.enfant ? departEcole(m) : null }));
      },
      aidePos() {
        const A = model && model.aide, m = A && membres.get(A.id);
        return m && m.visible ? { x: m.x, y: m.y } : null;
      },
      destroy() { for (const m of membres.values()) { m.s.destroy(); if (m.drap) m.drap.destroy(); } membres.clear(); },
    };
  }

  global.FamilleFerme = { attach, JOURS_ECOLE, HORAIRE };
})(window);
