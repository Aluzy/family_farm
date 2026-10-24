import { DATA } from './catalog.js';
import { fail, NO_COINS, pay } from './devices.js';
import { addItem, countItem, takeItem } from './inventory.js';
import { etatEcurie } from './blocs.js';
import { isUnlocked } from './campaign.js';
import { unlockLevel } from './levels.js';

/* ---------- le cheval de la ferme générée ----------
   Il s'achète au Marché (rayon Animaux, DATA.CHEVAL.PRIX) une fois l'Écurie construite (son
   râtelier dans une enceinte de murs qui a une porte sur le dehors et CHEVAL.PLACES cases libres :
   js/engine/blocs.js, etatEcurie). state.cheval = null (pas de cheval) ou { monte, nourri,
   attache } :
     - monte : le personnage est en selle ; il va vitesseCheval fois plus vite sur toutes les
       cartes (le triporteur, lui, reste au garage : on ne monte pas sur les deux) ;
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

// Combien de fois plus vite il va, monté (1 à pied).
export function vitesseCheval(state) {
  if (!chevalMonte(state)) return 1;
  return state.cheval.nourri === false ? C().VITESSE_FAIM : C().VITESSE;
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
  if (!isUnlocked(state, 'ecurie')) return `Le cheval s'achète à partir du niveau ${unlockLevel('ecurie')} (l'Écurie).`;
  if (!etatEcurie(state).ok) return 'Construis d\'abord l\'Écurie : une enceinte de murs avec une porte sur le dehors, son râtelier, et la place pour lui.';
  return null;
}

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
  if (!chevalPossede(state)) return fail(`Il te faut un cheval (Marché, ${C().PRIX} 💰).`);
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
  if (state.outils) state.outils.aPied = true;              // (le triporteur reste au garage)
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
  return { monte: !!ch.monte, nourri: ch.nourri !== false, attache: ch.attache ? { ...ch.attache } : null, vitesse: ch.nourri === false ? C().VITESSE_FAIM : C().VITESSE };
}
