/*
 * La famille sur la carte de la ferme (js/farm-stage.js) : les membres autres que le personnage
 * du joueur (js/fermier.js), chacun avec son personnage (assets/personnages/perso_NN.png ; les
 * enfants, leurs planches à eux : assets/personnages/enfant_NN.png), font leur journée :
 *
 *   - la nuit, avant 7 h et à partir de 18 h 45 (le repas est à 19 h), ils sont dans la maison ;
 *   - le jour, ils sortent par la porte et flânent autour de la maison, d'un coin à l'autre ;
 *   - les enfants vont à l'école le lundi, le mardi, le jeudi et le vendredi : à 7 h ils
 *     prennent le chemin de l'est jusqu'au bord de la carte (le bus les attend sur la carte de
 *     transition) et s'effacent ; à 16 h 30, ils reviennent par le même bout du chemin.
 *
 * Ils marchent par les chemins du personnage (fermier.path : les mêmes cases libres). Avec
 * « animations réduites », ils vont d'un point à l'autre sans marcher. Rien ne bouge dans un
 * intérieur (ils y sont cachés).
 *
 *   const famille = FamilleFerme.attach(scene, { fermier, frames, exit: { x, y }, file(perso, enfant), reduced })
 *   famille.sync(model)          // model.famille : [{ id, perso, enfant }], model.heure, model.semaine, model.nuit
 *   famille.update(deltaMs, room)
 *   famille.info()               // pour les tests : où est chacun
 */
(function (global) {
  'use strict';

  const T = 16;
  const HORAIRE = { sortie: 7, rentree: 18.75, ecole: 7, finEcole: 16.5, retard: 0.4 };
  const JOURS_ECOLE = [0, 1, 3, 4];       // lundi, mardi, jeudi, vendredi (0 : lundi)
  const VITESSE = { adulte: 26, enfant: 32 };    // px/s
  const ROAM = 6 * T;                      // autour de la maison
  const FADE_S = 0.5;
  const PAS = 4;                           // px par image de marche

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
      return { x: scene.world.w / 2, y: scene.world.h / 2 };
    }

    // Où il doit être à cette heure : 'dedans', 'dehors' ou 'ecole'.
    function voulu(m) {
      if (!model || model.nuit) return 'dedans';
      const h = model.heure;
      if (m.enfant && JOURS_ECOLE.includes(model.semaine) && h >= HORAIRE.ecole && h < HORAIRE.finEcole) return 'ecole';
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
      };
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

    function decider(m, dt) {
      const v = voulu(m);
      const d = door(), e = o.exit;
      if (m.ou === 'dehors' && m.visible && m.fade >= 0) {
        if (v === 'dedans' && !m.puis) aller(m, d.x, d.y, () => disparaitre(m, 'dedans'));
        else if (v === 'ecole' && !m.puis) aller(m, e.x, e.y, () => disparaitre(m, 'ecole'));
        else if (v === 'dehors' && !m.chemin.length) {
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
      else if (m.ou === 'dedans' && v === 'ecole' && h < HORAIRE.ecole + HORAIRE.retard) { apparaitre(m, d.x, d.y); aller(m, e.x, e.y, () => disparaitre(m, 'ecole')); }
      else if (m.ou === 'dedans' && v === 'ecole') m.ou = 'ecole';
      // l'école est finie : il revient par le chemin de l'est
      else if (m.ou === 'ecole' && v === 'dehors') { apparaitre(m, e.x, e.y); aller(m, d.x + m.coin.dx, d.y + m.coin.dy); }
      else if (m.ou === 'ecole' && v === 'dedans' && model && !model.nuit && h >= HORAIRE.finEcole) m.ou = 'dedans';
    }

    function avancer(m, dt) {
      if (m.pause > 0 && m.chemin.length) { m.pause -= dt; return false; }
      if (!m.chemin.length) {
        if (m.puis) { const f = m.puis; m.puis = null; f(); }
        return false;
      }
      const to = m.chemin[0];
      const dx = to.x - m.x, dy = to.y - m.y, l = Math.hypot(dx, dy), st = (m.enfant ? VITESSE.enfant : VITESSE.adulte) * dt;
      if (Math.abs(dx) > Math.abs(dy) * 0.8) { m.face = 'cote'; m.flip = dx < 0; } else { m.face = dy > 0 ? 'bas' : 'haut'; m.flip = false; }
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
        for (const [id, m] of membres) if (!ids.has(id)) { m.s.destroy(); membres.delete(id); }
        const manque = [];
        for (const def of defs) {
          const key = cle(def);
          const m = membres.get(def.id);
          if (m && m.key === key) continue;
          if (!scene.textures.exists(key)) { manque.push(def); continue; }
          if (m) m.s.destroy();
          const n = creer(def);
          // au chargement de la page : il est déjà là où l'heure le veut (dehors : près de son coin)
          const v = voulu(n);
          if (v === 'dehors') { const d = door(); apparaitre(n, d.x + n.coin.dx, d.y + n.coin.dy); n.alpha = 1; n.fade = 0; }
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
          if (!room) decider(m, dt);
          const marche = !room && avancer(m, dt);
          if (m.fade) {
            m.alpha = Math.max(0, Math.min(1, m.alpha + (m.fade * dt) / FADE_S));
            if (m.alpha >= 1 && m.fade > 0) m.fade = 0;
            if (m.alpha <= 0 && m.fade < 0) { m.fade = 0; m.visible = false; }
          }
          m.s.setVisible(m.visible && !room);
          if (!m.visible || room) continue;
          dessiner(m, marche ? `marche_${m.face}_${Math.floor(m.marche / PAS) % 4}` : `idle_${m.face}_${Math.floor(performance.now() / 600) % 2}`);
        }
      },
      info() {
        return [...membres.values()].map((m) => ({ id: m.id, enfant: m.enfant, ou: m.ou, visible: m.visible, x: Math.round(m.x), y: Math.round(m.y), marche: m.chemin.length > 0 }));
      },
      destroy() { for (const m of membres.values()) m.s.destroy(); membres.clear(); },
    };
  }

  global.FamilleFerme = { attach, JOURS_ECOLE, HORAIRE };
})(window);
