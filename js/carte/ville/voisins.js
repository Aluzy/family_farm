/* carte/ville/voisins.js — les familles des voisins.
 *
 * Chaque maison de la carte de transition a sa famille, tirée au hasard à la première visite
 * (deux parents, un à trois enfants : VOISINS) puis gardée (localStorage). On la voit aller et
 * venir chez elle et dehors : js/carte/ville/transition.js.
 */
(function (global) {
  'use strict';

  const V = global.CarteVille;
  const { VOISINS } = V.C;
  const { hote } = V;

  // La famille qui vit dans la maison `maison` : tirée au hasard la première fois, puis gardée.
  // { nom, membres: [{ prenom, perso, enfant }] }.
  function voisins(maison) {
    let all = {};
    try { all = JSON.parse(global.localStorage.getItem(VOISINS.store) || '{}') || {}; } catch (e) { all = {}; }
    if (all[maison] && Array.isArray(all[maison].membres) && all[maison].membres.length) return all[maison];
    const pick = (a) => a[Math.floor(Math.random() * a.length)];
    // des personnages (d'adulte, d'enfant) que la partie et les autres voisins n'ont pas
    const pris = { adulte: new Set(), enfant: new Set() };
    const H = hote(), h = global.HorlogeSortie ? global.HorlogeSortie.maintenant() : null;
    if (H && H.perso) pris.adulte.add(H.perso());
    for (const e of (h && h.enfants) || []) pris.enfant.add(e.perso);
    const autres = Object.values(all).filter((f) => f && Array.isArray(f.membres));
    for (const f of autres) for (const m of f.membres) pris[m.enfant ? 'enfant' : 'adulte'].add(m.perso);
    const perso = (enfant) => {
      const p = pris[enfant ? 'enfant' : 'adulte'], libres = [];
      for (let n = 1; n <= VOISINS.persos; n++) if (!p.has(n)) libres.push(n);
      const n = libres.length ? pick(libres) : 1 + Math.floor(Math.random() * VOISINS.persos);
      p.add(n);
      return n;
    };
    const dits = new Set();
    const prenom = (liste) => { const l = liste.filter((p) => !dits.has(p)); const p = pick(l.length ? l : liste); dits.add(p); return p; };
    const noms = VOISINS.noms.filter((n) => !autres.some((f) => f.nom === n));
    const n = 1 + Math.floor(Math.random() * VOISINS.enfantsMax);
    const membres = [0, 1].map(() => ({ prenom: prenom(VOISINS.prenoms), perso: perso(false), enfant: false }));
    for (let i = 0; i < n; i++) membres.push({ prenom: prenom(VOISINS.enfants), perso: perso(true), enfant: true });
    const f = { nom: pick(noms.length ? noms : VOISINS.noms), membres };
    all[maison] = f;
    try { global.localStorage.setItem(VOISINS.store, JSON.stringify(all)); } catch (e) { /* gardée le temps de la visite */ }
    return f;
  }

  // (pour preload, js/ville-carte.js, et la carte de transition : js/carte/ville/transition.js)
  V.voisins = voisins;
})(window);
