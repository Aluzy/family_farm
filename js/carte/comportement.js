/* carte/comportement.js — le socle des comportements de ce qui vit sur la carte (fiche 31).
 *
 * Les bêtes du grand monde, les bêtes de la ferme, les compagnons, la famille, les habitants avaient
 * chacun leur machine à états, leurs fonctions d'avance et leur hasard. Ce socle leur donne la même
 * charpente (la faune du grand monde l'utilise : js/carte/ferme/faune-monde.js ; les autres pourront y
 * passer une à une, fiche 32) :
 *
 *   - CarteKit.machine(etats, transitions, { cadence, avant }) : une machine à états déclarée.
 *     `etats` : { nom: { pas(a, dt, c) } } ; pas renvoie, au besoin, le nom de l'état suivant. Les
 *     `transitions` ({ de: [états] ou absent, si(a, c), fait(a, c) ou vers }) sont revues toutes les
 *     `cadence` s (0 : à chaque image ; 0,1 par défaut), avant le pas de l'état ; `avant(a, dt, c)`
 *     passe entre les deux (le temps qui s'écoule). machine.pas(a, dt, c) : `a.etat`, le reste à
 *     l'acteur ; `c`, ce que l'image partage (le temps, le personnage…).
 *   - CarteKit.perception(taille) : une grille spatiale (cellules de `taille` px, 64 par défaut),
 *     refaite à chaque image : vide(), ajoute(x, y, genre, ref) (sa vitesse se déduit de sa place à
 *     l'image d'avant, s'il a la même `ref`) ; voisins(x, y, rayon, sortie, filtre) remplit `sortie`
 *     (un tableau réutilisé : rien n'est alloué) et rend leur nombre.
 *   - CarteKit.avance(a, tx, ty, v, dt, peut) : un pas vers (tx, ty) à `v` px/s, si `peut(x, y)` ;
 *     false s'il est arrivé ou bloqué. Il regarde du côté où il va (a.flip).
 *   - CarteKit.separation(a, voisins, n, rayon, force, dt, peut) : une poussée douce loin des voisins à
 *     moins de `rayon` px (pas de collision dure : « ne pas se marcher dessus »).
 *   - CarteKit.rayonFuite(base, v, marche, habitue, R) : la distance de fuite d'une bête (fiche 32) : × R.lent
 *     quand on approche à moins de la moitié de la marche, × R.galop au-delà d'une fois et demie, × R.habitue
 *     près des hommes.
 *   - CarteKit.hasard(graine) : un générateur à graine (nombres de 0 à 1) ; CarteKit.graine(texte) :
 *     la graine d'un texte (une bête : son espèce et sa place). Le même spectacle pour le même monde,
 *     et des essais reproductibles.
 *
 * Script classique, chargé après le kit (js/carte/kit.js). Voir docs/architecture-phaser.md.
 */
(function (global) {
  'use strict';

  const K = global.CarteKit;

  /* ---------- le hasard à graine ---------- */

  // La graine d'un texte (FNV-1a, 32 bits).
  function graine(texte) {
    let h = 2166136261;
    const s = String(texte);
    for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }
  // Un générateur (mulberry32) : () => un nombre de [0, 1).
  function hasard(g) {
    let s = (Number(g) >>> 0) || 1;
    return function () {
      s = (s + 0x6d2b79f5) >>> 0;
      let t = s;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /* ---------- la machine à états ---------- */

  function machine(etats, transitions, opts) {
    const T = transitions || [], o = opts || {};
    const cadence = o.cadence === undefined ? 0.1 : o.cadence, avant = o.avant || null;
    return {
      etats,
      pas(a, dt, c) {
        if (T.length) {
          a.revue = (a.revue || 0) - dt;
          if (a.revue <= 0) {
            a.revue = cadence;
            for (let i = 0; i < T.length; i++) {
              const tr = T[i];
              if (tr.de && tr.de.indexOf(a.etat) < 0) continue;
              if (!tr.si(a, c)) continue;
              if (tr.fait) tr.fait(a, c); else a.etat = tr.vers;
              break;
            }
          }
        }
        if (avant) avant(a, dt, c);
        const e = etats[a.etat];
        const suite = e && e.pas ? e.pas(a, dt, c) : undefined;
        if (typeof suite === 'string') a.etat = suite;
      },
    };
  }

  /* ---------- la perception : une grille spatiale ---------- */

  function perception(taille) {
    const C = taille || 64;
    const cases = new Map();           // clé de cellule -> [entrées]
    const pool = [];                   // les entrées, réutilisées d'une image à l'autre
    let n = 0;
    let avant = new Map(), maintenant = new Map();   // ref -> { x, y } (la vitesse)
    const cle = (cx, cy) => (cx + 32768) * 65536 + (cy + 32768);
    return {
      vide() {
        for (const l of cases.values()) l.length = 0;
        n = 0;
        const t = avant; avant = maintenant; maintenant = t; maintenant.clear();
      },
      // dt : le temps de l'image (s), pour la vitesse
      ajoute(x, y, genre, ref, dt) {
        const e = pool[n] || (pool[n] = { x: 0, y: 0, vx: 0, vy: 0, genre: null, ref: null });
        n += 1;
        e.x = x; e.y = y; e.genre = genre; e.ref = ref;
        const p = ref != null ? avant.get(ref) : null;
        e.vx = p && dt > 0 ? (x - p.x) / dt : 0;
        e.vy = p && dt > 0 ? (y - p.y) / dt : 0;
        if (ref != null) maintenant.set(ref, { x, y });
        const k = cle(Math.floor(x / C), Math.floor(y / C));
        let l = cases.get(k);
        if (!l) { l = []; cases.set(k, l); }
        l.push(e);
        return e;
      },
      voisins(x, y, rayon, sortie, filtre) {
        sortie.length = 0;
        const c0 = Math.floor((x - rayon) / C), c1 = Math.floor((x + rayon) / C);
        const r0 = Math.floor((y - rayon) / C), r1 = Math.floor((y + rayon) / C), r2 = rayon * rayon;
        for (let cy = r0; cy <= r1; cy++) {
          for (let cx = c0; cx <= c1; cx++) {
            const l = cases.get(cle(cx, cy));
            if (!l) continue;
            for (let i = 0; i < l.length; i++) {
              const e = l[i], dx = e.x - x, dy = e.y - y;
              if (dx * dx + dy * dy > r2) continue;
              if (filtre && !filtre(e)) continue;
              sortie.push(e);
            }
          }
        }
        return sortie.length;
      },
      taille: () => n,
    };
  }

  /* ---------- le pas commun et la séparation ---------- */

  function avance(a, tx, ty, v, dt, peut) {
    const dx = tx - a.x, dy = ty - a.y, l = Math.hypot(dx, dy);
    if (l < 0.5) return false;
    const s = Math.min(l, v * dt), nx = a.x + (dx / l) * s, ny = a.y + (dy / l) * s;
    if (peut && !peut(nx, ny)) return false;
    a.x = nx; a.y = ny;
    if (Math.abs(dx) > 0.3) a.flip = dx < 0;
    return true;
  }

  // (deux acteurs exactement au même point : poussés selon un angle tiré de leur paire, toujours le même)
  function separation(a, voisins, n, rayon, force, dt, peut) {
    let fx = 0, fy = 0;
    for (let i = 0; i < n; i++) {
      const o = voisins[i];
      if (o.ref === a) continue;
      let dx = a.x - o.x, dy = a.y - o.y;
      let d = Math.hypot(dx, dy);
      if (d >= rayon) continue;
      if (d < 1e-6) { const g = (graine(String(a.x) + ',' + String(i)) % 628) / 100; dx = Math.cos(g); dy = Math.sin(g); d = 1; }
      const k = (rayon - Math.min(rayon, d)) / rayon;
      fx += (dx / d) * k; fy += (dy / d) * k;
    }
    if (!fx && !fy) return false;
    const nx = a.x + fx * force * dt, ny = a.y + fy * force * dt;
    if (peut && !peut(nx, ny)) return false;
    a.x = nx; a.y = ny;
    return true;
  }

  function rayonFuite(base, v, marche, habitue, R) {
    if (!base) return 0;
    const allure = v < marche * 0.5 ? R.lent : v > marche * 1.5 ? R.galop : 1;
    return base * allure * (habitue ? R.habitue : 1);
  }

  Object.assign(K, { machine, perception, avance, separation, rayonFuite, hasard, graine });
})(window);
