import { DATA } from './catalog.js';
import { nextRandom, randomInt } from './base.js';
import { canPay, fail, farmOpen, NO_COINS, spend } from './devices.js';
import { buyHoe, hasHoe, rockGone, treeGone } from './crops.js';
import { addItem } from './inventory.js';
import { farmTerrain } from './terrain.js';
import { gainActionXp } from './levels.js';
import { canAfford, spendEnergy, TIRED } from './stamina.js';
import { techFlag, techSum } from './techtree.js';

/* ---------- les outils : houe, pioche, hache, canne à pêche ---------- */

// La houe garde sa place (state.potager.houe) ; la hache, la pioche et la canne à pêche,
// achetées une fois au Marché, sont dans state.outils, avec le dernier outil choisi. Le champ
// n'existe qu'une fois un outil acheté ou choisi : une partie sans lui n'a que la houe.
// L'ordre est celui de la barre d'outils de la carte.
export const OUTILS = ['houe', 'pioche', 'hache', 'canne'];

const CLES = { houe: 'HOUE', hache: 'HACHE', pioche: 'PIOCHE', canne: 'CANNE' };

// { NOM, ICONE, PRIX } d'un outil, ou null.
export function toolDef(id) {
  return CLES[id] ? DATA[CLES[id]] : null;
}

export function hasTool(state, id) {
  if (id === 'houe') return hasHoe(state);
  return !!(CLES[id] && state.outils && state.outils[id]);
}

export function ownedTools(state) {
  return OUTILS.filter((id) => hasTool(state, id));
}

// Le dernier outil choisi (barre d'outils) s'il est à nous, sinon le premier qu'on a (la
// houe d'abord), sinon null.
export function selectedTool(state) {
  const choisi = state.outils && state.outils.choisi;
  if (choisi && hasTool(state, choisi)) return choisi;
  return ownedTools(state)[0] || null;
}

function outils(state) {
  if (!state.outils || typeof state.outils !== 'object') state.outils = { hache: false, pioche: false, canne: false, choisi: 'houe' };
  return state.outils;
}

// Achat d'un outil au Marché (une seule fois chacun). Le premier outil acheté devient celui
// choisi s'il n'y en avait pas.
export function buyTool(state, id) {
  const def = toolDef(id);
  if (!def) return fail('Outil inconnu.');
  if (id === 'houe') return buyHoe(state);
  if (hasTool(state, id)) return fail(`Tu as déjà une ${def.NOM.toLowerCase()}.`);
  if (!farmOpen(state)) return fail(`La ${def.NOM.toLowerCase()} s'achète au Marché, qui ouvre avec le panneau et la pompe.`);
  if (!canPay(state, def.PRIX)) return fail(NO_COINS);
  const avant = selectedTool(state);
  spend(state, def.PRIX, `Achat : ${def.NOM}`);
  const o = outils(state);
  o[id] = true;
  if (!avant) o.choisi = id;
  return { ok: true, cost: def.PRIX };
}

// Choisit un outil (un appui dans la barre d'outils).
export function selectTool(state, id) {
  const def = toolDef(id);
  if (!def) return fail('Outil inconnu.');
  if (!hasTool(state, id)) return fail(`Il te faut une ${def.NOM.toLowerCase()} (Marché, ${def.PRIX} 💰).`);
  outils(state).choisi = id;
  return { ok: true, outil: id };
}

/* ---------- la hache : couper un arbre de la carte ---------- */

// Les arbres de la carte n'existent que dans la carte (ses couches d'arbres) : le moteur ne
// connaît d'eux qu'un identifiant donné par la carte (« x,y » du milieu de leur pied) et leurs
// tuiles (le terrain de la ferme, ARBRES). Comme les rochers : state.outils.arbres compte les coups reçus
// par chacun ; au HACHE.COUPES-ième, il tombe : { retour }, le jour où il repousse (dans
// HACHE.RETOUR jours, tiré au hasard). Ses tuiles libres se labourent en attendant.

// Coups qu'il faut pour abattre un arbre, casser un rocher ou prendre un minerai (`base`) :
// les Lames affûtées de l'arbre des technologies (branche Outils) en retirent (coupsMoins).
export function hitsNeeded(state, base) {
  return Math.max(1, base - techSum(state, 'coupsMoins'));
}

// Ce qu'un coup rapporte (`n`) : avec une chance de `pct` % d'en avoir un de plus (la Hotte
// de bûcheron, recolteBonus ; la Lampe de mineur, grotte.minerai).
function withBonus(state, n, pct) {
  return n + (pct > 0 && nextRandom(state) * 100 < pct ? 1 : 0);
}

// Un coup sur l'arbre ou le rocher `id` (`partis` : 'arbres' ou 'rochers' de state.outils) :
// au `base`-ième coup (moins les Lames affûtées), il tombe : { retour }, le jour où il revient
// (dans `retour` jours, tiré au hasard). Renvoie { coups, fini }.
function hit(state, partis, id, base, retour) {
  const o = outils(state);
  if (!o[partis] || typeof o[partis] !== 'object') o[partis] = {};
  const coups = (o[partis][id] || 0) + 1;
  const fini = coups >= hitsNeeded(state, base);
  o[partis][id] = fini ? { retour: state.day + randomInt(state, retour[0], retour[1]) } : coups;
  return { coups, fini };
}

// Coups de hache que l'arbre `id` peut encore recevoir avant de tomber (0 : abattu).
export function chopsLeft(state, id) {
  const a = state.outils && state.outils.arbres && state.outils.arbres[id];
  if (a && typeof a === 'object') return 0;
  return Math.max(0, hitsNeeded(state, DATA.HACHE.COUPES) - (a || 0));
}

// Les arbres abattus (leurs identifiants).
export function fellenTrees(state) {
  const a = state.outils && state.outils.arbres;
  return a ? Object.keys(a).filter((id) => treeGone(state, id)) : [];
}

// Un coup de hache sur l'arbre `id` : HACHE.BOIS bois dans l'inventaire, de l'énergie, de l'XP.
// `tombe` : l'arbre vient de tomber.
export function chopTree(state, id) {
  const H = DATA.HACHE;
  if (!hasTool(state, 'hache')) return fail(`Il te faut une hache (Marché, ${H.PRIX} 💰).`);
  if (typeof id !== 'string' || !id) return fail('Touche un arbre pour le couper.');
  if (treeGone(state, id)) return fail('Cet arbre est déjà abattu.');
  if (!canAfford(state, 'couper')) return fail(TIRED);
  delete outils(state).coupes;           // l'ancien compte des coups du jour
  const { coups, fini: tombe } = hit(state, 'arbres', id, H.COUPES, H.RETOUR);
  const bois = withBonus(state, H.BOIS, techSum(state, 'recolteBonus'));
  addItem(state, 'bois', bois);
  spendEnergy(state, 'couper');
  gainActionXp(state, 'couper');
  return { ok: true, bois, reste: chopsLeft(state, id), coups, tombe };
}

/* ---------- la pioche : casser un rocher de la carte ---------- */

// Comme les arbres, les rochers n'existent que dans la carte (couche plantes_pierres) : le
// moteur ne connaît d'eux qu'un identifiant (« x,y » de leur case en bas à gauche) et leurs
// tuiles (le terrain de la ferme, ROCHERS). state.outils.rochers compte les coups reçus par chacun ; au
// PIOCHE.COUPS-ième, il est cassé : { retour }, le jour où il revient (dans PIOCHE.RETOUR
// jours, tiré au hasard). Ses tuiles libres se labourent en attendant (voir rockGone, crops.js).

// Les rochers cassés (leurs identifiants).
export function brokenRocks(state) {
  const r = state.outils && state.outils.rochers;
  return r ? Object.keys(r).filter((id) => rockGone(state, id)) : [];
}

// Un coup de pioche sur le rocher `id` : PIOCHE.PIERRE pierre dans l'inventaire, de l'énergie,
// de l'XP. `casse` : le rocher vient de se briser.
export function mineRock(state, id) {
  const P = DATA.PIOCHE;
  if (!hasTool(state, 'pioche')) return fail(`Il te faut une pioche (Marché, ${P.PRIX} 💰).`);
  if (typeof id !== 'string' || !id) return fail('Touche un rocher pour le casser.');
  if (rockGone(state, id)) return fail('Ce rocher est déjà cassé.');
  if (!canAfford(state, 'piocher')) return fail(TIRED);
  const { coups, fini: casse } = hit(state, 'rochers', id, P.COUPS, P.RETOUR);
  const pierre = withBonus(state, P.PIERRE, techSum(state, 'recolteBonus'));
  addItem(state, 'pierre', pierre);
  spendEnergy(state, 'piocher');
  gainActionXp(state, 'piocher');
  return { ok: true, pierre, coups, casse };
}

/* ---------- la pioche dans la grotte : le minerai ---------- */

const MINERAIS = ['fer', 'cuivre', 'or', 'platine'];

// Un minerai pris dans la grotte (la carte compte les coups de pioche, voir hitsNeeded) :
// minerai_<sorte> dans l'inventaire (un de plus, parfois, avec la Lampe de mineur :
// grotte.minerai %), l'énergie et l'XP d'un coup de pioche.
export function mineOre(state, sorte) {
  const P = DATA.PIOCHE;
  if (!hasTool(state, 'pioche')) return fail(`Il te faut une pioche (Marché, ${P.PRIX} 💰).`);
  if (!MINERAIS.includes(sorte)) return fail('Minerai inconnu.');
  if (!canAfford(state, 'piocher')) return fail(TIRED);
  const lampe = techFlag(state, 'grotte');
  const pct = lampe && lampe.minerai ? lampe.minerai : 0;
  const n = withBonus(state, 1, pct);
  const item = 'minerai_' + sorte;
  addItem(state, item, n);
  spendEnergy(state, 'piocher');
  gainActionXp(state, 'piocher');
  return { ok: true, item, n };
}

// Le carnet des grottes d'avant les minerais (localStorage « ferme-grottes ») : ce qu'il
// comptait entre dans l'inventaire, une fois. { fer: 3, … } → { minerai_fer: 3, … }.
export function depositOreNotebook(state, carnet) {
  const out = {};
  for (const sorte of MINERAIS) {
    const n = Math.floor(Number(carnet && carnet[sorte]) || 0);
    if (n > 0) { addItem(state, 'minerai_' + sorte, n); out['minerai_' + sorte] = n; }
  }
  return { ok: true, items: out };
}

// Au réveil (runNight, jour suivant) : un rocher cassé dont le jour de retour est venu
// réapparaît à sa place, sauf si une parcelle (terre labourée, plantée ou non) occupe une de
// ses tuiles ; il réessaie alors chaque matin. Renvoie les rochers revenus.
export function respawnRocks(state) {
  return respawn(state, state.outils && state.outils.rochers, farmTerrain(state).ROCHERS);
}

// De même, au réveil, les arbres abattus dont le jour est venu repoussent à leur place (sauf
// sous une parcelle). Renvoie les arbres repoussés.
export function respawnTrees(state) {
  return respawn(state, state.outils && state.outils.arbres, farmTerrain(state).ARBRES);
}

function respawn(state, partis, tuiles) {
  if (!partis) return [];
  const T = tuiles || {};
  const prises = new Set(state.potager.parcelles.map((p) => p.case));
  const revenus = [];
  for (const id of Object.keys(partis)) {
    const e = partis[id];
    if (typeof e !== 'object') continue;
    if (!(Number(e.retour) <= state.day)) continue;
    if ((T[id] || []).some((t) => prises.has(t))) continue;
    delete partis[id];
    revenus.push(id);
  }
  return revenus;
}

/* ---------- la canne à pêche : l'étang et la mare de la carte ---------- */

// La carte dit dans quelle eau on pêche (« etang » ou « mare », voir CANNE.PRISES). Chaque eau
// donne au plus CANNE.JOUR[eau] prises par jour (state.outils.peche).
function peche(state) {
  const o = outils(state);
  if (!o.peche || o.peche.jour !== state.day) o.peche = { jour: state.day, prises: {} };
  return o.peche;
}

// Prises que l'eau `eau` peut encore donner aujourd'hui.
export function fishLeft(state, eau) {
  const J = DATA.CANNE.JOUR[eau];
  if (!J) return 0;
  const max = J + techSum(state, 'pecheJour');   // le Moulinet en laiton (branche Outils)
  const p = state.outils && state.outils.peche;
  const faites = p && p.jour === state.day ? p.prises[eau] || 0 : 0;
  return Math.max(0, max - faites);
}

// Un lancer dans l'eau `eau` : de l'énergie, puis peut-être un poisson (tiré selon
// CANNE.PRISES[eau]) dans l'inventaire, avec de l'XP. { ok, poisson: id ou null, reste }.
export function castLine(state, eau) {
  const C = DATA.CANNE;
  if (!hasTool(state, 'canne')) return fail(`Il te faut une canne à pêche (Marché, ${C.PRIX} 💰).`);
  const chances = C.PRISES[eau];
  if (!chances) return fail('Touche l\'eau pour y pêcher : l\'étang ou la mare de la ferme, le lac de la montagne, la mer depuis le ponton de la plage.');
  if (fishLeft(state, eau) <= 0) return fail(eau === 'lac' || eau === 'mer' ? `Le poisson se fait rare ${eau === 'lac' ? 'dans le lac' : 'en mer'} aujourd'hui : reviens demain.` : `Le poisson se fait rare ${eau === 'mare' ? 'dans la mare' : 'dans l\'étang'} aujourd'hui : essaie l'autre eau, ou reviens demain.`);
  if (!canAfford(state, 'pecher')) return fail(TIRED);
  spendEnergy(state, 'pecher');
  const tire = () => {
    let tirage = nextRandom(state) * 100;
    for (const [item, pct] of Object.entries(chances)) {
      if (tirage < pct) return item;
      tirage -= pct;
    }
    return null;
  };
  let poisson = tire();
  // le Moulinet en laiton : rien n'a mordu, une chance (pecheTouche %) qu'un poisson morde quand même
  const touche = techSum(state, 'pecheTouche');
  if (!poisson && touche > 0 && nextRandom(state) * 100 < touche) poisson = tire();
  if (poisson) {
    const p = peche(state);
    p.prises[eau] = (p.prises[eau] || 0) + 1;
    addItem(state, poisson, 1);
    gainActionXp(state, 'pecher');
  }
  return { ok: true, poisson, reste: fishLeft(state, eau) };
}
