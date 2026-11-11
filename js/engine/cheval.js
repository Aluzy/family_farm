import { DATA } from './catalog.js';
import { fail, NO_COINS, pay } from './devices.js';
import { addItem, countItem, takeItem } from './inventory.js';
import { etatEcurie } from './blocs.js';
import { isUnlocked } from './campaign.js';
import { unlockLevel } from './levels.js';

/* ---------- le cheval de la ferme générée ----------
   Il vient à l'Atelier (fiche 7c : un licol et des friandises, ATELIER.RECETTES.licol_cheval ; avant,
   le Marché, DATA.CHEVAL.PRIX) une fois l'Écurie construite (son
   râtelier dans une enceinte de murs qui a une porte sur le dehors et CHEVAL.PLACES cases libres :
   js/engine/blocs.js, etatEcurie). state.cheval = null (pas de cheval) ou { monte, nourri,
   attache } :
     - monte : le personnage est en selle ; il va vitesseCheval fois plus vite sur toutes les
       cartes ;
     - nourri : il a mangé sa ration la nuit d'avant (chevalNuit) ; sinon il va moins vite ;
     - attache : null (à la ferme, dans l'Écurie, ou monté), ou { carte, x, y } : attaché à son
       poteau sur une autre carte (le grand monde, docs/grand-monde.md ; x, y : le pied du
       poteau, px de la carte).
   Les cartes disent où est le personnage (lieu : { carte, x, y, proche }) : 'ferme', ou une
   autre carte ; proche : il est à côté du cheval attaché. */

const C = () => DATA.CHEVAL;

export function chevalPossede(state) {
  return !!(state.cheval && typeof state.cheval === 'object');
}

export function chevalMonte(state) {
  return chevalPossede(state) && !!state.cheval.monte;
}

// Combien de fois plus vite il va, monté (1 à pied) : au galop, la vitesse de la friandise qu'il mange.
export function vitesseCheval(state) {
  if (!chevalMonte(state)) return 1;
  const g = friandiseGalop(state);
  if (g) return C().GALOP.FRIANDISES[g.sorte].vitesse;
  return state.cheval.nourri === false ? C().VITESSE_FAIM : C().VITESSE;
}

/* ---------- le galop : la sacoche du cheval et ses pommes ----------
   state.cheval.sacoche : absente (pas de sacoche : ATELIER.RECETTES.sacoche_cheval), ou GALOP.PLACES places, chacune
   null (vide) ou { sorte, reste } : une friandise de GALOP.FRIANDISES (la pomme, la pomme dorée), reste : la part qui
   n'est pas encore mangée (1 : entière). Elles ne se périment pas dans la sacoche.
   state.cheval.galop : null (au pas), ou la place de la friandise qu'il mange. Un appui sur une friandise, en selle,
   lance le galop (basculerGalop) ; un autre sur la même l'arrête. avancerGalop(ms) : la carte dit combien de temps il
   a avancé au galop ; la friandise se mange d'autant (GALOP.FRIANDISES[sorte].secondes pour une entière), finie, la
   suivante prend le relais (vers la droite, puis depuis la gauche), sans plus rien, il reprend le pas. Descendu, il
   reprend le pas (la friandise entamée garde son reste). */

const G = () => C().GALOP;

// Les places de la sacoche (copie) : [null | { sorte, reste }], ou null (pas de sacoche).
export function sacocheCheval(state) {
  if (!chevalPossede(state) || !Array.isArray(state.cheval.sacoche)) return null;
  return Array.from({ length: G().PLACES }, (_, i) => {
    const p = state.cheval.sacoche[i];
    return p && G().FRIANDISES[p.sorte] ? { sorte: p.sorte, reste: Math.max(0, Math.min(1, Number(p.reste) || 0)) } : null;
  });
}

// La sacoche peut-elle se fabriquer ? null, ou la raison.
export function sacocheRefus(state) {
  if (!chevalPossede(state)) return 'Il faut d\'abord un cheval (un licol et des friandises).';
  if (Array.isArray(state.cheval.sacoche)) return 'Ton cheval a déjà sa sacoche.';
  return null;
}

// La sacoche fabriquée à l'Atelier (js/engine/atelier.js) : vide.
export function poserSacoche(state) {
  const r = sacocheRefus(state);
  if (r) return fail(r);
  state.cheval.sacoche = Array.from({ length: G().PLACES }, () => null);
  return { ok: true };
}

// La friandise mangée au galop : { place, sorte, reste }, ou null (au pas).
export function friandiseGalop(state) {
  if (!chevalMonte(state)) return null;
  const i = state.cheval.galop, S = sacocheCheval(state);
  if (!Number.isInteger(i) || !S || !S[i]) return null;
  return { place: i, ...S[i] };
}

// Remplir la sacoche de `sorte` (la pomme, la pomme dorée) prises dans l'inventaire, dans ses places vides.
export function remplirSacoche(state, sorte = 'pomme') {
  const S = sacocheCheval(state);
  if (!S) return fail('Ton cheval n\'a pas de sacoche : elle se fabrique à l\'Atelier.');
  if (!G().FRIANDISES[sorte]) return fail('Seules les pommes vont dans la sacoche.');
  const vides = S.map((p, i) => (p ? -1 : i)).filter((i) => i >= 0);
  if (!vides.length) return fail('La sacoche est pleine.');
  const n = Math.min(vides.length, countItem(state, sorte));
  if (n < 1) return fail(`Pas de ${DATA.OBJETS[sorte].nom.toLowerCase()} dans ton inventaire.`);
  takeItem(state, sorte, n);
  for (const i of vides.slice(0, n)) state.cheval.sacoche[i] = { sorte, reste: 1 };
  return { ok: true, n, sorte };
}

// Reprendre les friandises entières de la sacoche (les entamées y restent) : elles reviennent dans l'inventaire.
export function reprendreSacoche(state) {
  const S = sacocheCheval(state);
  if (!S) return fail('Ton cheval n\'a pas de sacoche.');
  const items = {};
  S.forEach((p, i) => {
    if (!p || p.reste < 1 || (state.cheval.galop === i && chevalMonte(state))) return;
    items[p.sorte] = (items[p.sorte] || 0) + 1;
    state.cheval.sacoche[i] = null;
  });
  if (!Object.keys(items).length) return fail('Rien à reprendre : les pommes entamées restent dans la sacoche.');
  for (const [k, n] of Object.entries(items)) addItem(state, k, n);
  return { ok: true, items };
}

// Un appui sur la friandise de la place `place`, en selle : le galop part (ou passe à elle) ; sur celle qu'il
// mange : il reprend le pas.
export function basculerGalop(state, place) {
  if (!chevalMonte(state)) return fail('Monte d\'abord en selle.');
  const S = sacocheCheval(state);
  if (!S || !S[place]) return fail('Cette place de la sacoche est vide.');
  state.cheval.galop = state.cheval.galop === place ? null : place;
  return { ok: true, galop: state.cheval.galop };
}

// Le cheval a avancé `ms` millisecondes au galop : la friandise se mange d'autant ; finie, la suivante prend le
// relais. → { ok, galop (la place, ou null), finies (les friandises finies) }.
export function avancerGalop(state, ms) {
  const g = friandiseGalop(state);
  if (!g) { if (chevalPossede(state)) state.cheval.galop = null; return { ok: true, galop: null, finies: 0 }; }
  let reste = Math.max(0, Number(ms) || 0) / 1000, i = g.place, finies = 0;
  const sac = state.cheval.sacoche;
  while (reste > 0 && Number.isInteger(i)) {
    const p = sac[i], duree = G().FRIANDISES[p.sorte].secondes;
    const mange = Math.min(reste, p.reste * duree);
    p.reste = Math.max(0, p.reste - mange / duree);
    reste -= mange;
    if (p.reste <= 1e-9) {
      sac[i] = null;
      finies += 1;
      // (la suivante : vers la droite, puis depuis la gauche)
      let j = null;
      for (let k = 1; k <= G().PLACES; k++) { const q = (i + k) % G().PLACES; if (sac[q]) { j = q; break; } }
      i = j;
    } else break;
  }
  state.cheval.galop = Number.isInteger(i) ? i : null;
  return { ok: true, galop: state.cheval.galop, finies };
}

// Où est le cheval : 'monte', 'attache' (sur une autre carte), 'ecurie', ou null (pas de cheval).
export function chevalOu(state) {
  if (!chevalPossede(state)) return null;
  if (state.cheval.monte) return 'monte';
  return state.cheval.attache ? 'attache' : 'ecurie';
}

// Peut-on acheter le cheval ? null, ou la raison.
export function chevalRefus(state) {
  if (chevalPossede(state)) return 'Tu as déjà ton cheval.';
  if (!isUnlocked(state, 'ecurie')) return `Le cheval vient à partir du niveau ${unlockLevel('ecurie')} (l'Écurie).`;
  if (!etatEcurie(state).ok) return 'Construis d\'abord l\'Écurie : une enceinte de murs avec une porte sur le dehors, son râtelier, et la place pour lui.';
  return null;
}

// Fiche 7c : le cheval vient à l'Atelier (un licol et des friandises : atelier.js), sans pièces.
export function accueillirCheval(state) {
  const refus = chevalRefus(state);
  if (refus) return fail(refus);
  state.cheval = { monte: false, nourri: true, attache: null };
  return { ok: true };
}

// L'ancien achat au Marché (gardé pour les tests).
export function buyCheval(state) {
  const refus = chevalRefus(state);
  if (refus) return fail(refus);
  if (!pay(state, C().PRIX, `Achat : ${C().NOM}`)) return fail(NO_COINS);
  state.cheval = { monte: false, nourri: true, attache: null };
  return { ok: true, cost: C().PRIX };
}

// Ce qu'il manque pour l'attacher (le poteau, la corde) : [objets], vide s'il ne manque rien.
export function attacheManque(state) {
  return C().ATTACHE.filter((o) => countItem(state, o) < 1);
}

// Monter en selle. `lieu` : { carte, proche } (proche : à côté du cheval attaché). À la ferme,
// il sort de l'Écurie ; sur une autre carte, il faut être à côté de lui, attaché là.
export function monterCheval(state, lieu = { carte: 'ferme' }) {
  if (!chevalPossede(state)) return fail('Il te faut un cheval : un licol et des friandises, à l\'Atelier.');
  const ch = state.cheval;
  if (ch.monte) return { ok: true, monte: true };
  if (ch.attache) {
    if (lieu.carte !== ch.attache.carte) return fail('Ton cheval t\'attend, attaché à son poteau, là où tu l\'as laissé.');
    if (!lieu.proche) return fail('Approche-toi de ton cheval pour le monter.');
    for (const o of C().ATTACHE) addItem(state, o, 1);     // (le poteau arraché, la corde dénouée)
    ch.attache = null;
  } else if (lieu.carte !== 'ferme') {
    return fail('Ton cheval est resté à l\'Écurie, à la ferme.');
  }
  ch.monte = true;
  return { ok: true, monte: true };
}

// Descendre de selle. À la ferme, il rentre à l'Écurie ; ailleurs, il faut un poteau et une
// corde : le poteau est planté là (lieu.x, lieu.y), le cheval y est attaché.
export function descendreCheval(state, lieu = { carte: 'ferme' }) {
  if (!chevalMonte(state)) return { ok: true, monte: false };
  const ch = state.cheval;
  if (lieu.carte !== 'ferme') {
    const manque = attacheManque(state);
    if (manque.length) return fail(`Pour descendre ici, il faut ${manque.map((o) => `un${o === 'corde' ? 'e' : ''} ${DATA.OBJETS[o].nom.toLowerCase()}`).join(' et ')} pour l'attacher (Atelier).`);
    for (const o of C().ATTACHE) takeItem(state, o, 1);
    ch.attache = { carte: String(lieu.carte), x: Math.round(Number(lieu.x) || 0), y: Math.round(Number(lieu.y) || 0) };
  }
  ch.monte = false;
  ch.galop = null;        // (descendu : il reprend le pas)
  return { ok: true, monte: false, attache: ch.attache };
}

// Un appui dans la barre d'outils : monter, ou descendre.
export function toggleCheval(state, lieu) {
  return chevalMonte(state) ? descendreCheval(state, lieu) : monterCheval(state, lieu);
}

// Le joueur est revenu à la ferme : le cheval attaché ailleurs rentre à l'Écurie (le poteau et
// la corde reviennent dans l'inventaire). Renvoie vrai s'il a changé quelque chose.
export function rentrerCheval(state) {
  if (!chevalPossede(state) || !state.cheval.attache) return false;
  for (const o of C().ATTACHE) addItem(state, o, 1);
  state.cheval.attache = null;
  return true;
}

// La nuit (js/engine/night.js), après l'Étable : il mange sa ration de paille, s'il y en a.
export function chevalNuit(state) {
  if (!chevalPossede(state)) return;
  const item = DATA.PATURAGE.NOURRITURE, n = C().RATION;
  const mange = countItem(state, item) >= n;
  if (mange) takeItem(state, item, n);
  state.cheval.nourri = mange;
}

// Ce que les cartes et les fenêtres montrent du cheval.
export function chevalVue(state) {
  if (!chevalPossede(state)) return null;
  const ch = state.cheval;
  const g = friandiseGalop(state);
  return { monte: !!ch.monte, nourri: ch.nourri !== false, attache: ch.attache ? { ...ch.attache } : null, vitesse: ch.nourri === false ? C().VITESSE_FAIM : C().VITESSE, sacoche: sacocheCheval(state), galop: g ? g.place : null };
}
