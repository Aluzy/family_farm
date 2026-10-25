import { DATA } from './catalog.js';
import { nextRandom, randomInt } from './base.js';
import { canPay, fail, marcheFerme, marcheOuvert, NO_COINS, spend } from './devices.js';
import { buyHoe, hasHoe, rockGone, treeGone } from './crops.js';
import { addItem } from './inventory.js';
import { farmSeed, farmTerrain, regionVue } from './terrain.js';
import { blocGid } from './planche.js';
import { gainActionXp } from './levels.js';
import { canAfford, spendEnergy, TIRED } from './stamina.js';
import { techFlag, techSum } from './techtree.js';
import { casesBaties } from './blocs.js';
import { FERME_GENEREE } from './ferme-generee.js';
import { genererMonde } from './monde.js';
import { noter } from './journal.js';
import { chevalMonte, vitesseCheval } from './cheval.js';
import { MINERAIS_GROTTE, PIERRES_GROTTE } from './grotte.js';

/* ---------- les outils : houe, pioche, hache, faux, canne à pêche ---------- */

// La houe garde sa place (state.potager.houe) ; la hache, la pioche, la faux et la canne à pêche,
// achetées une fois au Marché, sont dans state.outils, avec le dernier outil choisi. Le champ
// n'existe qu'une fois un outil acheté ou choisi : une partie sans lui n'a que la houe.
// L'ordre est celui de la barre d'outils de la carte.
export const OUTILS = ['houe', 'pioche', 'hache', 'faux', 'canne'];

// (le triporteur s'achète comme un outil, mais ne se prend pas en main : enSelle)
const CLES = { houe: 'HOUE', hache: 'HACHE', pioche: 'PIOCHE', faux: 'FAUX', canne: 'CANNE', triporteur: 'TRIPORTEUR' };

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
  const un = def.ARTICLE === 'un';
  if (hasTool(state, id)) return fail(`Tu as déjà ${un ? 'un' : 'une'} ${def.NOM.toLowerCase()}.`);
  if (!marcheOuvert(state)) return fail(`${un ? 'Le' : 'La'} ${def.NOM.toLowerCase()} s'achète au Marché. ${marcheFerme(state)}`);
  if (!canPay(state, def.PRIX)) return fail(NO_COINS);
  const avant = selectedTool(state);
  spend(state, def.PRIX, `Achat : ${def.NOM}`);
  const o = outils(state);
  o[id] = true;
  if (id === 'triporteur') o.aPied = false;      // (acheté : il monte dessus)
  else if (!avant) o.choisi = id;
  return { ok: true, cost: def.PRIX };
}

/* ---------- le triporteur : rouler plus vite sur la carte ---------- */

// Le personnage est-il en selle (le triporteur acheté, et il n'en est pas descendu) ?
export function enSelle(state) {
  return hasTool(state, 'triporteur') && !(state.outils && state.outils.aPied);
}

// Monter sur le triporteur ou en descendre (un appui dans la barre d'outils).
export function toggleTriporteur(state) {
  const def = DATA.TRIPORTEUR;
  if (!hasTool(state, 'triporteur')) return fail(`Il te faut un triporteur (Marché, ${def.PRIX} 💰).`);
  if (chevalMonte(state)) return fail('Descends d\'abord de ton cheval.');
  const o = outils(state);
  o.aPied = !o.aPied;
  return { ok: true, enSelle: !o.aPied };
}

// Combien de fois plus vite il se déplace sur la carte (1 à pied).
export function vitesseDeplacement(state) {
  if (chevalMonte(state)) return vitesseCheval(state);
  return enSelle(state) ? DATA.TRIPORTEUR.VITESSE : 1;
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
export function withBonus(state, n, pct) {
  return n + (pct > 0 && nextRandom(state) * 100 < pct ? 1 : 0);
}

// Le coup fort (version 1.24, COUP_FORT) : { coups, energie } d'un coup, fort ou non.
export function force(fort) {
  const C = DATA.COUP_FORT;
  return fort ? { coups: C.COUPS, energie: C.ENERGIE } : { coups: 1, energie: 1 };
}

// Un coup sur l'arbre ou le rocher `id` (`partis` : 'arbres' ou 'rochers' de state.outils) :
// au `base`-ième coup (moins les Lames affûtées), il tombe : { retour }, le jour où il revient
// (dans `retour` jours, tiré au hasard). Renvoie { coups, fini }.
function hit(state, partis, id, base, retour, n = 1) {
  const o = outils(state);
  if (!o[partis] || typeof o[partis] !== 'object') o[partis] = {};
  const coups = (o[partis][id] || 0) + n;
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

/* ---------- la hache : couper un buisson de la ferme générée ---------- */

// Les buissons de la ferme générée (le terrain, BUISSONS) : identifiant « colonne,rangée » du
// milieu de leur pied, comme les arbres (la case où poussent leurs baies). Un seul coup les
// coupe : state.outils.buissons[id] = { retour }, le jour où il repousse (HACHE.BUISSONS.RETOUR).

// Le buisson `id` de la carte : { taille: 'grand' | 'petit', case }, ou null (ce n'en est pas un).
export function bushOf(state, id) {
  const T = farmTerrain(state);
  for (const [c0, r1, w, , taille] of T.BUISSONS || []) {
    const c = c0 + Math.floor(w / 2);
    if (c + ',' + r1 === id) return { taille: taille || 'petit', case: r1 * T.LARGEUR + c };
  }
  return null;
}

// Le buisson `id` est-il coupé ?
export function bushCut(state, id) {
  const b = state && state.outils && state.outils.buissons;
  return !!(b && b[id]);
}

// Les buissons coupés (leurs identifiants).
export function cutBushes(state) {
  const b = state.outils && state.outils.buissons;
  return b ? Object.keys(b) : [];
}

// Les cases (milieu du pied) des buissons coupés : leurs baies n'y sont plus (atelier.js).
export function cutBushCases(state) {
  const W = farmTerrain(state).LARGEUR;
  return new Set(cutBushes(state).map((id) => { const [c, r] = id.split(',').map(Number); return r * W + c; }));
}

// Un coup de hache sur le buisson `b` (bushOf) : il tombe d'un coup, HACHE.BUISSONS[taille] bois
// au sol (aux points `ou.coup`, voir lacher). Renvoie ce que chopTree renvoie (tombe : vrai).
function cutBush(state, id, b, ou, fort) {
  const H = DATA.HACHE, B = H.BUISSONS;
  if (bushCut(state, id)) return fail('Ce buisson est déjà coupé.');
  const f = force(fort);
  if (!canAfford(state, 'couper', f.energie)) return fail(TIRED);
  const o = outils(state);
  if (!o.buissons || typeof o.buissons !== 'object') o.buissons = {};
  o.buissons[id] = { retour: state.day + randomInt(state, B.RETOUR[0], B.RETOUR[1]) };
  const bois = withBonus(state, B[b.taille] || B.petit, techSum(state, 'recolteBonus'));
  const morceaux = lacher(state, 'bois', bois, 0, ou);
  spendEnergy(state, 'couper', f.energie);
  gainActionXp(state, 'couper');
  return { ok: true, bois, chute: 0, morceaux, reste: 0, coups: 1, tombe: true, fort: !!fort, buisson: b.taille };
}

// Les cases que les buissons coupés rendent au terrain (le terrain, BUISSONS_CASES) : on y
// bâtit comme sur l'herbe (blocs.js poseStatus). Une case sous deux buissons : quand les deux le sont.
export function casesBuissonsCoupes(state) {
  const out = new Set();
  const B = farmTerrain(state).BUISSONS_CASES, coupes = cutBushes(state);
  if (!B || !coupes.length) return out;
  const sous = new Map();
  for (const [id, cs] of Object.entries(B)) for (const t of cs) (sous.get(t) || sous.set(t, []).get(t)).push(id);
  for (const id of coupes) for (const t of B[id] || []) if (sous.get(t).every((b) => bushCut(state, b))) out.add(t);
  return out;
}

// Au réveil, les buissons coupés dont le jour est venu repoussent (sauf sous une parcelle ou
// une case bâtie). Renvoie leurs identifiants.
export function respawnBushes(state) {
  return respawn(state, state.outils && state.outils.buissons, farmTerrain(state).BUISSONS_CASES);
}

/* ---------- les morceaux au sol : le bois et la pierre lâchés par les coups ---------- */

// Un coup de hache (ou de pioche) lâche ses morceaux au sol, sur la carte `carte` (« ferme »,
// puis les cartes du grand monde) : state.morceaux = [{ n, item, carte, x, y }]
// (x, y : px de la carte, donnés par elle ; n : un numéro unique, state.morceauxN). Le joueur
// les ramasse en marchant dessus (ramasserMorceau) ; ils restent là jusqu'à ce qu'il les prenne.
// Sans carte (le moteur seul, les tests), ils vont droit dans l'inventaire.
export function morceauxDe(state, carte) {
  return (state.morceaux || []).filter((m) => m.carte === carte);
}

// `nb` morceaux de `item` posés aux points `points` (le premier, le deuxième… puis on recommence).
// `lot` (facultatif) : { qte, image } : chaque morceau en vaut `qte` (la botte de paille de la
// botteleuse : BOTTELEUSE.PAILLE) et la carte le dessine avec l'image `image`.
export function poserMorceaux(state, item, nb, carte, points, lot) {
  const out = [];
  if (!(nb > 0)) return out;
  if (!Array.isArray(state.morceaux)) state.morceaux = [];
  const P = Array.isArray(points) && points.length ? points : [{ x: 0, y: 0 }];
  for (let i = 0; i < nb; i++) {
    const p = P[i % P.length], k = Math.floor(i / P.length);
    state.morceauxN = (state.morceauxN || 0) + 1;
    const m = { n: state.morceauxN, item, carte, x: Math.round(Number(p.x) + k * 3) || 0, y: Math.round(Number(p.y) + k * 2) || 0 };
    if (lot && lot.qte > 1) m.qte = lot.qte;
    if (lot && lot.image) m.image = lot.image;
    state.morceaux.push(m);
    out.push(m);
  }
  return out;
}

// Ce qu'un coup lâche : `n` morceaux de `item` aux points `ou.coup`, et `extra` de plus (l'arbre
// qui tombe, le rocher qui se brise) aux points `ou.fin` ; sans `ou`, dans l'inventaire.
// Renvoie { coup, fin } (les morceaux posés) ou null.
export function lacher(state, item, n, extra, ou) {
  if (!ou || typeof ou.carte !== 'string' || !ou.carte) { addItem(state, item, n + extra); noter('ramasse', { item, n: n + extra }); return null; }
  return { coup: poserMorceaux(state, item, n, ou.carte, ou.coup), fin: poserMorceaux(state, item, extra, ou.carte, ou.fin || ou.coup) };
}

// Le morceau `n` ramassé : dans l'inventaire (sans énergie ; une botte : toute sa paille).
// { ok, item, n } ou un refus.
export function ramasserMorceau(state, n) {
  const L = state.morceaux || [];
  const i = L.findIndex((m) => m.n === n);
  if (i < 0) return fail('Ce morceau n\'est plus là.');
  const [m] = L.splice(i, 1);
  const q = m.qte > 1 ? m.qte : 1;
  addItem(state, m.item, q);
  noter('ramasse', { item: m.item, n: q });
  return { ok: true, item: m.item, n: q };
}

// Un coup de hache sur l'arbre `id` (ou le buisson : cutBush) : HACHE.BOIS bois au sol (au pied de l'arbre), de
// l'énergie, de l'XP ; `tombe` : l'arbre vient de tomber, HACHE.CHUTE bois de plus (là où sa
// cime touche le sol). `ou` : { carte, coup: [points], fin: [points] } (voir lacher).
// `fort` : le coup fort (COUP_FORT : il compte plusieurs coups, pour plus d'énergie).
export function chopTree(state, id, ou, fort = false) {
  const H = DATA.HACHE;
  if (!hasTool(state, 'hache')) return fail(`Il te faut une hache (Marché, ${H.PRIX} 💰).`);
  if (typeof id !== 'string' || !id) return fail('Touche un arbre pour le couper.');
  const b = bushOf(state, id);
  if (b) return cutBush(state, id, b, ou, fort);
  if (treeGone(state, id)) return fail('Cet arbre est déjà abattu.');
  const plante = foretArbre(state, id);
  if (plante && !foretGrand(state, plante)) return fail('Ce n\'est encore qu\'une jeune pousse : laisse-la grandir.');
  const f = force(fort);
  if (!canAfford(state, 'couper', f.energie)) return fail(TIRED);
  delete outils(state).coupes;           // l'ancien compte des coups du jour
  const { coups, fini: tombe } = hit(state, 'arbres', id, H.COUPES, H.RETOUR, f.coups);
  const bois = withBonus(state, H.BOIS, techSum(state, 'recolteBonus'));
  const chute = tombe ? H.CHUTE || 0 : 0;
  const morceaux = lacher(state, 'bois', bois, chute, ou);
  // (un arbre de la ferme générée : sa graine tombe avec lui, et il ne repousse que si on la plante)
  const espece = tombe ? especeArbre(state, id) : null;
  const graine = espece ? H.GRAINES[espece] : null;
  if (plante && tombe) {
    // (un arbre planté : il n'est plus là, sa case se libère)
    state.foret.arbres = state.foret.arbres.filter((a) => a !== plante);
    delete outils(state).arbres[id];
  }
  if (graine) {
    if (!plante) outils(state).arbres[id] = { espece };
    const m = lacher(state, graine, 0, 1, ou);
    if (morceaux && m) morceaux.fin.push(...m.fin);
  }
  spendEnergy(state, 'couper', f.energie);
  gainActionXp(state, 'couper');
  return { ok: true, bois, chute, morceaux, reste: chopsLeft(state, id), coups, tombe, fort: !!fort, graine };
}

/* ---------- les graines des arbres de la ferme générée ---------- */

// Un arbre de la ferme générée qui tombe laisse sa graine (HACHE.GRAINES : la pomme de pin d'un
// sapin, le gland d'un autre arbre) et ne repousse plus de lui-même : state.outils.arbres[id] =
// { espece } (sans jour de retour). Une graine se plante sur n'importe quelle case d'herbe libre
// (le mode Construire : les blocs `semis`, blocs.js) : state.foret.arbres = [{ id: 'f<n>',
// espece, case, pousse }]. Jeune pousse jusqu'au jour `pousse` (HACHE.POUSSE jours plus tard),
// c'est ensuite un arbre de la carte (dessiné au-dessus de sa case, son pied au milieu ;
// js/carte/ferme/foret.js) : il se coupe comme les autres et laisse sa graine en tombant.

const especes = new Map();   // graine de la ferme → Map(arbre → 'pin' | 'arbre')

// L'espèce de l'arbre `id` de la ferme générée : 'pin' (un sapin) ou 'arbre' ; null ailleurs
// (la carte de Tiled, les arbres des autres cartes). Un arbre planté : la sienne ; un arbre de
// la carte : lue dans ses tuiles (planche.js).
export function especeArbre(state, id) {
  const plante = foretArbre(state, id);
  if (plante) return plante.espece;
  const g = farmSeed(state);
  if (g === null) return null;
  if (!especes.has(g)) {
    const { carte, terrain } = genererMonde(g);
    const tuiles = (bloc, n) => new Set(Array.from({ length: n }, (_, k) => blocGid(bloc, k)));
    const pins = tuiles('pin', 16), feuillus = tuiles('arbre', 12);
    const couches = carte.layers.filter((l) => l.type === 'tilelayer' && l.name.startsWith('layer_tree'));
    const m = new Map();
    for (const [aid, cs] of Object.entries(terrain.ARBRES || {})) {
      let p = 0, a = 0;
      for (const t of cs) for (const l of couches) { const gid = l.data[t] & 0x0fffffff; if (pins.has(gid)) p++; else if (feuillus.has(gid)) a++; }
      if (p || a) m.set(aid, p > a ? 'pin' : 'arbre');
    }
    especes.set(g, m);
  }
  return especes.get(g).get(id) || null;
}

// Les arbres plantés (state.foret.arbres).
export function foretArbres(state) {
  const f = state.foret;
  return f && Array.isArray(f.arbres) ? f.arbres : [];
}

// L'arbre planté `id`, ou null.
export function foretArbre(state, id) {
  return foretArbres(state).find((a) => a.id === id) || null;
}

// L'arbre planté sur la case `tile`, ou null.
export function foretSurCase(state, tile) {
  return foretArbres(state).find((a) => a.case === tile) || null;
}

// Un arbre planté à moins de `d` cases (en ligne ou en diagonale) de `tile` ?
export function foretProche(state, tile, d) {
  const W = farmTerrain(state).LARGEUR, c = tile % W, r = Math.floor(tile / W);
  return foretArbres(state).some((a) => Math.max(Math.abs(a.case % W - c), Math.abs(Math.floor(a.case / W) - r)) < d);
}

// Plante une graine de l'espèce `espece` sur `tile` (blocs.js a vérifié la place, poseStatus ;
// la graine est déjà prise dans l'inventaire). Renvoie l'arbre planté.
export function planterGraine(state, espece, tile) {
  if (!state.foret || typeof state.foret !== 'object' || !Array.isArray(state.foret.arbres)) state.foret = { n: 0, arbres: [] };
  const f = state.foret, P = DATA.HACHE.POUSSE;
  f.n = (f.n | 0) + 1;
  const a = { id: 'f' + f.n, espece, case: tile, pousse: state.day + randomInt(state, P[0], P[1]) };
  f.arbres.push(a);
  return a;
}

// L'arbre planté a-t-il fini de pousser ?
export function foretGrand(state, a) {
  return !!a && state.day >= a.pousse;
}

// Les arbres plantés encore jeunes pousses : [{ id, espece, case }] ; ceux qui ont poussé : grands.
export function poussesArbres(state) {
  return foretArbres(state).filter((a) => !foretGrand(state, a)).map((a) => ({ id: a.id, espece: a.espece, case: a.case }));
}
export function arbresPlantes(state) {
  return foretArbres(state).filter((a) => foretGrand(state, a)).map((a) => ({ id: a.id, espece: a.espece, case: a.case }));
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

// Un coup de pioche sur le rocher `id` : PIOCHE.PIERRE pierre au sol, de l'énergie, de l'XP ;
// `casse` : le rocher vient de se briser, PIOCHE.BRIS pierres de plus. `ou`, `fort` : comme chopTree.
export function mineRock(state, id, ou, fort = false) {
  const P = DATA.PIOCHE;
  if (!hasTool(state, 'pioche')) return fail(`Il te faut une pioche (Marché, ${P.PRIX} 💰).`);
  if (typeof id !== 'string' || !id) return fail('Touche un rocher pour le casser.');
  if (rockGone(state, id)) return fail('Ce rocher est déjà cassé.');
  const f = force(fort);
  if (!canAfford(state, 'piocher', f.energie)) return fail(TIRED);
  const { coups, fini: casse } = hit(state, 'rochers', id, P.COUPS, P.RETOUR, f.coups);
  const pierre = withBonus(state, P.PIERRE, techSum(state, 'recolteBonus'));
  const bris = casse ? P.BRIS || 0 : 0;
  const morceaux = lacher(state, 'pierre', pierre, bris, ou);
  spendEnergy(state, 'piocher', f.energie);
  gainActionXp(state, 'piocher');
  return { ok: true, pierre, bris, morceaux, coups, casse, fort: !!fort };
}

// Un caillou : un rocher qui tient sur une seule tuile du terrain.
export function caillou(state, id) {
  const cases = (farmTerrain(state).ROCHERS || {})[id];
  return Array.isArray(cases) && cases.length === 1;
}

// Un caillou se ramasse à la main, sans outil : PIOCHE.MAIN pierre dans l'inventaire, l'énergie et
// l'XP du ramassage ; il quitte la carte et revient comme un rocher cassé (PIOCHE.RETOUR jours).
export function ramasserCaillou(state, id) {
  const P = DATA.PIOCHE;
  if (typeof id !== 'string' || !caillou(state, id)) return fail('Ce rocher est trop gros pour la main : il faut la pioche.');
  if (rockGone(state, id)) return fail('Il n\'y a plus rien à ramasser ici.');
  if (!canAfford(state, 'ramasser')) return fail(TIRED);
  const o = outils(state);
  if (!o.rochers || typeof o.rochers !== 'object') o.rochers = {};
  o.rochers[id] = { retour: state.day + randomInt(state, P.RETOUR[0], P.RETOUR[1]) };
  addItem(state, 'pierre', P.MAIN);
  noter('ramasse', { item: 'pierre', n: P.MAIN });
  spendEnergy(state, 'ramasser');
  gainActionXp(state, 'ramasser');
  return { ok: true, items: { pierre: P.MAIN } };
}

/* ---------- la faux : faucher l'herbe haute de la carte ---------- */

// Comme les arbres et les rochers, les touffes d'herbe haute n'existent que dans la carte
// (couche d'objets « herbe_haute ») : le moteur ne connaît d'elles qu'un identifiant
// (« x,y » de leur pied, en px). state.outils.herbes[id] = { retour } : la touffe est fauchée,
// elle repousse le jour `retour` (dans FAUX.RETOUR jours, tiré au hasard).

// La touffe `id` est-elle fauchée ?
export function grassCut(state, id) {
  const h = state.outils && state.outils.herbes;
  return !!(h && h[id]);
}

// Les touffes fauchées (leurs identifiants).
export function cutGrass(state) {
  const h = state.outils && state.outils.herbes;
  return h ? Object.keys(h) : [];
}

// Un coup de faux sur la touffe `id` : FAUX.FIBRE fibre au sol (aux points `ou.coup`, voir
// lacher ; sans `ou`, dans l'inventaire), de l'énergie, de l'XP ; la touffe est fauchée. (La
// botteleuse en fait de la paille : js/engine/botteleuse.js.)
export function scytheGrass(state, id, ou) {
  const X = DATA.FAUX;
  if (!hasTool(state, 'faux')) return fail(`Il te faut une faux (Marché, ${X.PRIX} 💰).`);
  if (typeof id !== 'string' || !id) return fail('Touche une touffe d\'herbe haute pour la faucher.');
  if (grassCut(state, id)) return fail('Cette herbe est déjà fauchée.');
  if (!canAfford(state, 'faucher')) return fail(TIRED);
  const o = outils(state);
  if (!o.herbes || typeof o.herbes !== 'object') o.herbes = {};
  o.herbes[id] = { retour: state.day + randomInt(state, X.RETOUR[0], X.RETOUR[1]) };
  const fibre = withBonus(state, X.FIBRE, techSum(state, 'recolteBonus'));
  const morceaux = lacher(state, 'fibre', fibre, 0, ou);
  spendEnergy(state, 'faucher');
  gainActionXp(state, 'faucher');
  return { ok: true, fibre, morceaux };
}

// Le coup fort de la faux (COUP_FORT) : il tournoie et fauche toutes les touffes `ids` (celles
// autour de lui, que la carte donne), pour COUP_FORT.ENERGIE fois l'énergie d'un fauchage.
// `ou` : { carte, points: { id: [points] } } (où tombe la fibre de chaque touffe). Renvoie
// { ok, fauchees: [ids], fibre, morceaux: { coup: [...] } }.
export function scytheAround(state, ids, ou) {
  const X = DATA.FAUX;
  if (!hasTool(state, 'faux')) return fail(`Il te faut une faux (Marché, ${X.PRIX} 💰).`);
  const L = [...new Set((Array.isArray(ids) ? ids : []).filter((id) => typeof id === 'string' && id && !grassCut(state, id)))];
  if (!L.length) return fail('Aucune herbe haute à faucher autour de toi.');
  const E = DATA.COUP_FORT.ENERGIE;
  if (!canAfford(state, 'faucher', E)) return fail(TIRED);
  const o = outils(state);
  if (!o.herbes || typeof o.herbes !== 'object') o.herbes = {};
  let fibre = 0;
  const coup = [];
  for (const id of L) {
    o.herbes[id] = { retour: state.day + randomInt(state, X.RETOUR[0], X.RETOUR[1]) };
    const n = withBonus(state, X.FIBRE, techSum(state, 'recolteBonus'));
    fibre += n;
    const pts = ou && ou.points && ou.points[id];
    const m = lacher(state, 'fibre', n, 0, pts ? { carte: ou.carte, coup: pts } : null);
    if (m) coup.push(...m.coup);
    gainActionXp(state, 'faucher');
  }
  spendEnergy(state, 'faucher', E);
  return { ok: true, fauchees: L, fibre, morceaux: coup.length ? { coup, fin: [] } : null };
}

// La case d'une touffe (son identifiant « x,y » : son pied, en px).
// Les cases que couvrent les brins de la touffe `id` (« x,y » de son pied) : sa case, et celles
// où ils débordent (CarteKit.NATURE.herbe : 22 × 20 px posés sur le pied ; TOUFFE : ce qui
// en est vraiment de l'herbe, de part et d'autre du pied et au-dessus).
const TOUFFE = { large: 7, haut: 12 };
function casesTouffe(state, id) {
  const [x, y] = id.split(',').map(Number), T = FERME_GENEREE.T, W = farmTerrain(state).LARGEUR;
  const out = new Set();
  for (const px of [x - TOUFFE.large, x, x + TOUFFE.large]) for (const py of [y - TOUFFE.haut, y - 1]) out.add(Math.floor(py / T) * W + Math.floor(px / T));
  return out;
}

// La touffe `id` déborde-t-elle sur une case de `baties` (casesBaties) ?
function touffeSurBati(state, id, baties) {
  if (!baties.size) return false;
  for (const t of casesTouffe(state, id)) if (baties.has(t)) return true;
  return false;
}

// Au réveil : les touffes dont le jour est venu repoussent, sauf sur une case bâtie ou à son
// bord (un mur, un chemin : leurs brins le couvriraient ; elles restent fauchées). Renvoie leurs
// identifiants.
// Seulement sur la ferme et dans les régions vues (regionVue, terrain.js) : une touffe d'une
// région que le joueur n'a pas vue ne bouge pas.
export function regrowGrass(state) {
  const h = state.outils && state.outils.herbes;
  if (!h) return [];
  const out = [], baties = casesBaties(state), T = farmTerrain(state);
  for (const id of Object.keys(h)) {
    if (!(Number(h[id] && h[id].retour) <= state.day)) continue;
    if (!regionVue(state, caseDuPied(id, T), T)) continue;
    if (touffeSurBati(state, id, baties)) continue;
    delete h[id];
    out.push(id);
  }
  return out;
}

// Une pose sur la case `tile` : les touffes des cases voisines dont les brins débordent sur elle
// sont foulées (fauchées, sans paille ; elles repoussent quand la case est libérée). Renvoie
// leur nombre.
export function foulerAutour(state, tile) {
  const T = farmTerrain(state), H = T.HERBES, W = T.LARGEUR;
  if (!H) return 0;
  let n = 0;
  for (const j of [tile - 1, tile + 1, tile + W - 1, tile + W, tile + W + 1]) {
    for (const id of H[j] || []) {
      if (grassCut(state, id) || !casesTouffe(state, id).has(tile)) continue;
      const o = outils(state);
      if (!o.herbes || typeof o.herbes !== 'object') o.herbes = {};
      o.herbes[id] = { retour: state.day };
      n++;
    }
  }
  return n;
}

// Les touffes d'herbe haute sous ce qui est bâti ou qui débordent dessus (un chemin posé à côté
// d'elles, une partie d'avant la version 1.26) : fauchées, sans paille ; elles ne repoussent plus
// tant que la case est bâtie. Renvoie leur nombre.
export function faucherSousBati(state) {
  const H = farmTerrain(state).HERBES;
  if (!H) return 0;
  const o = outils(state);
  if (!o.herbes || typeof o.herbes !== 'object') o.herbes = {};
  const baties = casesBaties(state);
  if (!baties.size) return 0;
  let n = 0;
  for (const ids of Object.values(H)) for (const id of ids) if (!o.herbes[id] && touffeSurBati(state, id, baties)) { o.herbes[id] = { retour: state.day }; n++; }
  return n;
}

/* ---------- la pioche dans la grotte : le minerai ---------- */

const MINERAIS = MINERAIS_GROTTE;

// Un minerai pris dans la grotte (la carte compte les coups de pioche, voir hitsNeeded) :
// minerai_<sorte> dans l'inventaire (un de plus, parfois, avec la Lampe de mineur :
// grotte.minerai %), l'énergie et l'XP d'un coup de pioche. Dans une grotte de la montagne (fiche
// 6b), une pierre prise dans le mur (quartz, améthyste) : l'objet lui-même.
export function mineOre(state, sorte) {
  const P = DATA.PIOCHE;
  if (!hasTool(state, 'pioche')) return fail(`Il te faut une pioche (Marché, ${P.PRIX} 💰).`);
  if (!MINERAIS.includes(sorte) && !PIERRES_GROTTE.includes(sorte)) return fail('Minerai inconnu.');
  if (!canAfford(state, 'piocher')) return fail(TIRED);
  const lampe = techFlag(state, 'grotte');
  const pct = lampe && lampe.minerai ? lampe.minerai : 0;
  const n = withBonus(state, 1, pct);
  const item = PIERRES_GROTTE.includes(sorte) ? sorte : 'minerai_' + sorte;
  addItem(state, item, n);
  noter('ramasse', { item, n });
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

// La case du pied de la touffe `id` (« x,y » en px) sur le terrain T.
function caseDuPied(id, T) {
  const [x, y] = String(id).split(',').map(Number);
  return Math.floor((y - 1) / FERME_GENEREE.T) * T.LARGEUR + Math.floor(x / FERME_GENEREE.T);
}

// La nuit, sur la carte, ne repousse ou n'évolue que ce qui est sur la ferme ou dans une région
// que le joueur a vue (state.monde.vues, regionVue : terrain.js) : les rochers, les arbres, les
// buissons (respawn), les touffes d'herbe haute (regrowGrass), la cueillette du jour (atelier.js,
// placesDuJour). Ce qui est dans une région qu'il n'a pas vue attend qu'il y vienne : le monde
// est grand, la nuit ne le parcourt pas.

// Au réveil (runNight, jour suivant) : un rocher cassé dont le jour de retour est venu
// réapparaît à sa place, sauf si une parcelle (terre labourée, plantée ou non) ou une case bâtie
// occupe une de ses tuiles ; il réessaie alors chaque matin. Renvoie les rochers revenus.
export function respawnRocks(state) {
  return respawn(state, state.outils && state.outils.rochers, farmTerrain(state).ROCHERS);
}

// De même, au réveil, les arbres abattus dont le jour est venu repoussent à leur place (sauf
// sous une parcelle). Renvoie les arbres repoussés.
export function respawnTrees(state) {
  return respawn(state, state.outils && state.outils.arbres, farmTerrain(state).ARBRES);
}

// La case d'un arbre, d'un buisson ou d'un rocher `id` : sa première tuile au terrain (`tuiles`),
// sinon d'après son identifiant (« colonne,rangée ») ; null pour un arbre planté (« f<n> », sur
// la ferme).
function caseDe(id, tuiles, W) {
  if (tuiles[id] && tuiles[id].length) return tuiles[id][0];
  const m = /^(\d+),(\d+)$/.exec(id);
  return m ? Number(m[2]) * W + Number(m[1]) : null;
}

function respawn(state, partis, tuiles) {
  if (!partis) return [];
  const T = tuiles || {}, terrain = farmTerrain(state);
  // (une parcelle, ou une case bâtie)
  const prises = new Set([...state.potager.parcelles.map((p) => p.case), ...casesBaties(state)]);
  const revenus = [];
  for (const id of Object.keys(partis)) {
    const e = partis[id];
    if (typeof e !== 'object') continue;
    if (!(Number(e.retour) <= state.day)) continue;
    const ou = caseDe(id, T, terrain.LARGEUR);
    if (ou !== null && !regionVue(state, ou, terrain)) continue;      // (une région pas vue : il attend)
    if ((T[id] || []).some((t) => prises.has(t))) continue;
    delete partis[id];
    revenus.push(id);
  }
  return revenus;
}

/* ---------- la canne à pêche : l'étang et la mare de la carte, les eaux du grand monde ---------- */

// La carte dit dans quelle eau on pêche (« etang » ou « mare » sur la ferme ; « lac », « riviere »
// ou « mer » dans le grand monde, voir CANNE.PRISES). Chaque eau donne au plus CANNE.JOUR[eau]
// prises par jour (state.outils.peche : { jour, prises: { eau: n } }) : les eaux du monde se comptent
// par sorte (toutes ses rivières ensemble, tous ses lacs, la mer). Un coin de pêche du plan
// (« peche_<n> », lieux.peche : la carte le dit quand la rive est à CANNE.COINS.RAYON cases de lui)
// a ses propres chances et ses propres prises du jour (CANNE.COINS), comptées à part, sous son
// identifiant.
const COIN = /^peche_\d{1,3}$/;
function peche(state) {
  const o = outils(state);
  if (!o.peche || o.peche.jour !== state.day) o.peche = { jour: state.day, prises: {} };
  return o.peche;
}

// Le coin de pêche `coin` sur l'eau `eau` (un identifiant du plan, et des réglages pour cette eau),
// ou null.
function coinDe(eau, coin) {
  const C = DATA.CANNE.COINS;
  return coin && COIN.test(String(coin)) && C && C.PRISES[eau] && C.JOUR[eau] ? String(coin) : null;
}

// Prises que l'eau `eau` (ou le coin `coin` sur elle) peut encore donner aujourd'hui.
export function fishLeft(state, eau, coin = null) {
  const c = coinDe(eau, coin);
  const J = c ? DATA.CANNE.COINS.JOUR[eau] : DATA.CANNE.JOUR[eau];
  if (!J) return 0;
  const max = J + techSum(state, 'pecheJour');   // le Moulinet en laiton (branche Outils)
  const p = state.outils && state.outils.peche;
  const faites = p && p.jour === state.day ? p.prises[c || eau] || 0 : 0;
  return Math.max(0, max - faites);
}

// (le poisson se fait rare : le message de chaque eau)
const RARE = {
  etang: 'dans l\'étang aujourd\'hui : essaie l\'autre eau, ou reviens demain',
  mare: 'dans la mare aujourd\'hui : essaie l\'autre eau, ou reviens demain',
  lac: 'dans les lacs aujourd\'hui : essaie une rivière, la mer, ou reviens demain',
  riviere: 'dans les rivières aujourd\'hui : essaie un lac, la mer, ou reviens demain',
  mer: 'en mer aujourd\'hui : essaie un lac, une rivière, ou reviens demain',
};

// Un lancer dans l'eau `eau` (depuis le coin de pêche `coin`, s'il est donné) : de l'énergie, puis
// peut-être un poisson (tiré selon CANNE.PRISES[eau], ou CANNE.COINS.PRISES[eau] à un coin) dans
// l'inventaire, avec de l'XP. { ok, poisson: id ou null, reste, coin }.
export function castLine(state, eau, coin = null) {
  const C = DATA.CANNE;
  if (!hasTool(state, 'canne')) return fail(`Il te faut une canne à pêche (Marché, ${C.PRIX} 💰).`);
  const c = coinDe(eau, coin);
  const chances = c ? C.COINS.PRISES[eau] : C.PRISES[eau];
  if (!chances) return fail('Touche l\'eau pour y pêcher : l\'étang ou la mare de la ferme, un lac, une rivière, la mer.');
  if (fishLeft(state, eau, c) <= 0) return fail(c ? 'Ce coin de pêche ne donne plus rien aujourd\'hui : pêche un peu plus loin, ou reviens demain.' : `Le poisson se fait rare ${RARE[eau] || 'ici aujourd\'hui : reviens demain'}.`);
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
    p.prises[c || eau] = (p.prises[c || eau] || 0) + 1;
    addItem(state, poisson, 1);
    noter('ramasse', { item: poisson, n: 1 });
    gainActionXp(state, 'pecher');
  }
  return { ok: true, poisson, reste: fishLeft(state, eau, c), coin: c };
}
