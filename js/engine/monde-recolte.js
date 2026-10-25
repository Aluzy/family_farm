import { DATA } from './catalog.js';
import { fail } from './devices.js';
import { addItem } from './inventory.js';
import { noter } from './journal.js';
import { gainActionXp } from './levels.js';
import { canAfford, spendEnergy, TIRED } from './stamina.js';
import { techSum } from './techtree.js';
import { farmTerrain, regionVue, voirRegion } from './terrain.js';
import { force, hasTool, hitsNeeded, lacher, toolDef, withBonus } from './outils.js';
import { SORTES as SORTES_VEG } from './monde-vegetation.js';
import { SORTES_ROCHES } from './monde-roches.js';

/* ---------- couper, casser, cueillir et ramasser dans le grand monde (docs/grand-monde.md : fiche 6a) ---------- */

// Les arbres, les buissons, les plantes et les rochers du monde (fiches 5b et 5c) ne sont pas dans
// la sauvegarde : chaque région les tire de son plan, dans le Web Worker, toujours les mêmes
// (monde-vegetation.js, monde-roches.js : [sorte, x, y, variante], le pied en px). Ce que le joueur
// en a pris se retient donc par un identifiant tiré de la pièce elle-même, jamais d'un rang dans une
// liste : « <sorte>:<x>,<y> » (le nom de sa sorte, son pied en px de la carte ; idObjetMonde). Deux
// pièces n'ont jamais le même (une case porte au plus une image, et au plus une petite pièce ; leurs
// sortes ont des noms différents), et deux régions voisines donnent le même à une petite pièce de
// leur bord commun (elles la peignent toutes les deux).
//
// state.monde.pris[id] : un nombre (les coups qu'elle a reçus : couper, casser), ou { retour } (elle
// est prise, elle revient le jour `retour` ; d'ici là, ni dessinée ni fermée à la marche), ou
// { retour, cueilli: true } (cueillie : elle reste là, sans ses fruits, jusqu'au jour `retour`).
// Au réveil (repousseMonde, night.js), ce dont le jour est venu revient, dans les régions vues
// seulement (comme sur la ferme), et pas sous le personnage (state.monde.ici, la case où la carte
// l'a vu en dernier) ; les coups reçus s'oublient : l'entrée s'efface, la sauvegarde ne garde que ce
// qui manque en ce moment.
//
// Ce que donne chaque sorte : data/monde.json (RECOLTE.SORTES) ; une sorte qui n'y est pas reste du
// décor. Les gestes sont ceux de la ferme (outils.js) : la hache (couper : l'énergie, l'XP, les coups
// et la Hotte de bûcheron des arbres de la ferme ; le bois tombe au sol, à ramasser en marchant
// dessus, state.morceaux), la pioche (casser : comme un rocher), la faux (faucher : la fibre au sol),
// la main (cueillir, ramasser : dans l'inventaire, l'énergie et l'XP du ramassage).

export const RECOLTE = DATA.RECOLTE;
const T = 16;   // une case, en px (le pied d'une pièce est en px de la carte)

// Chaque sorte du monde par son nom : { def (sa sorte : VEGETATION.SORTES ou ROCHES.SORTES), cle
// ('vegetation' ou 'roches' : ses données dans une région), code (son rang dans sa liste), regle
// (RECOLTE.SORTES : ce qu'elle donne, ou null) }.
const PAR_NOM = new Map();
for (const [cle, liste] of [['vegetation', SORTES_VEG], ['roches', SORTES_ROCHES]]) {
  liste.forEach((def, code) => PAR_NOM.set(def.nom, { def, cle, code, regle: RECOLTE.SORTES[def.nom] || null }));
}

// L'outil de chaque geste, et l'action dont il prend l'énergie et l'XP (stamina.js, levels.js).
const GESTES = {
  couper: { outil: 'hache', action: 'couper' },
  casser: { outil: 'pioche', action: 'piocher' },
  faucher: { outil: 'faux', action: 'faucher' },
  cueillir: { outil: null, action: 'ramasser' },
  ramasser: { outil: null, action: 'ramasser' },
};

// L'identifiant de la pièce de la sorte `nom` dont le pied est en (x, y) px.
export function idObjetMonde(nom, x, y) {
  return `${nom}:${x},${y}`;
}

// L'identifiant de la k-ième pièce (k : son rang × 4) du tableau `liste` des données `cle`
// ('vegetation' ou 'roches') d'une région ([sorte, x, y, variante]…).
export function idDansRegion(cle, liste, k) {
  const so = (cle === 'roches' ? SORTES_ROCHES : SORTES_VEG)[liste[k]];
  return so ? idObjetMonde(so.nom, liste[k + 1], liste[k + 2]) : null;
}

// Ce que donne la sorte `nom` (RECOLTE.SORTES), ou null (du décor).
export function regleMonde(nom) {
  const s = PAR_NOM.get(nom);
  return s ? s.regle : null;
}

// L'identifiant `id` lu : { nom, x, y, X, Y (la case de son pied), def, regle }, ou null (ce n'est
// pas une pièce du monde).
export function lireIdMonde(id) {
  const m = /^([a-z_]+):(-?\d+),(-?\d+)$/.exec(String(id));
  const s = m && PAR_NOM.get(m[1]);
  if (!s) return null;
  const x = Number(m[2]), y = Number(m[3]);
  return { nom: m[1], x, y, X: Math.floor(x / T), Y: Math.floor((y - 1) / T), def: s.def, regle: s.regle };
}

// Les pièces que la région `reg` (solDeRegion) dessine et qu'on peut prendre : [{ id, nom, x, y,
// variante, regle, basse }] (les grandes, puis les petites : celles de son bord peint et une case
// autour comprises, comme sa voisine).
export function objetsDeRegion(reg) {
  const out = [];
  for (const cle of ['vegetation', 'roches']) {
    const d = reg[cle];
    if (!d) continue;
    for (const [liste, basse] of [[d.images, false], [d.basses, true]]) {
      for (let k = 0; k < liste.length; k += 4) {
        const so = (cle === 'roches' ? SORTES_ROCHES : SORTES_VEG)[liste[k]], regle = so && RECOLTE.SORTES[so.nom];
        if (regle) out.push({ id: idObjetMonde(so.nom, liste[k + 1], liste[k + 2]), nom: so.nom, x: liste[k + 1], y: liste[k + 2], variante: liste[k + 3], regle, basse });
      }
    }
  }
  return out;
}

/* ---------- ce qui est pris ---------- */

function prisDe(state) {
  if (!state.monde || typeof state.monde !== 'object') state.monde = { vues: [] };
  if (!state.monde.pris || typeof state.monde.pris !== 'object') state.monde.pris = {};
  return state.monde.pris;
}

let version = 0;     // chaque écriture dans state.monde.pris (les cases ouvertes à se refaire)
function ecrire(state, id, v) {
  const P = prisDe(state);
  if (v === undefined) delete P[id]; else P[id] = v;
  version++;
}

// L'état de la pièce `id` : rien (undefined), un nombre de coups, { retour } ou { retour, cueilli }.
export function etatObjetMonde(state, id) {
  const P = state && state.monde && state.monde.pris;
  return P ? P[id] : undefined;
}

// La pièce est-elle prise (ni dessinée, ni fermée à la marche) ? Cueillie (là, sans ses fruits) ?
const estPrise = (e) => !!e && typeof e === 'object' && !e.cueilli;
const estCueillie = (e) => !!e && typeof e === 'object' && !!e.cueilli;
export function objetPris(state, id) { return estPrise(etatObjetMonde(state, id)); }
export function objetCueilli(state, id) { return estCueillie(etatObjetMonde(state, id)); }

// Les identifiants des pièces prises, des pièces cueillies (pour la scène : js/ui/stage.js).
export function mondePris(state) {
  const P = (state && state.monde && state.monde.pris) || {};
  return Object.keys(P).filter((id) => estPrise(P[id]));
}
export function mondeCueillis(state) {
  const P = (state && state.monde && state.monde.pris) || {};
  return Object.keys(P).filter((id) => estCueillie(P[id]));
}

// Les cases de la pièce `o` (lireIdMonde) qui ne se traversent pas (sa sorte : bloque).
function casesFermees(o, W) {
  return (o.def.bloque || []).map(([dx, dy]) => (o.Y + dy) * W + o.X + dx);
}

// Les cases que les pièces prises rendent à la marche (un arbre abattu, un rocher cassé) : un Set,
// refait seulement quand state.monde.pris change (caseMarchable le lit à chaque case examinée d'un
// trajet : il doit coûter presque rien). Seules les fonctions de ce module l'écrivent (ecrire) ; une
// partie relue a un autre objet.
const ouvertesDe = new WeakMap();
export function casesOuvertesMonde(state) {
  const P = state && state.monde && state.monde.pris;
  if (!P) return null;
  const c = ouvertesDe.get(P);
  if (c && c.version === version) return c.set;
  const W = farmTerrain(state).LARGEUR, set = new Set();
  for (const [id, e] of Object.entries(P)) {
    if (!estPrise(e)) continue;
    const o = lireIdMonde(id);
    if (o) for (const t of casesFermees(o, W)) set.add(t);
  }
  ouvertesDe.set(P, { version, set });
  return set;
}

// La case où la carte a vu le personnage en dernier (rien n'y repousse ; js/ui/stage.js).
export function noterIci(state, t) {
  if (!Number.isInteger(t) || t < 0) return;
  prisDe(state);
  state.monde.ici = t;
}

/* ---------- les tirages : d'après la pièce et le jour ---------- */

function hache(texte) {
  let h = 2166136261;
  for (let i = 0; i < texte.length; i++) h = Math.imul(h ^ texte.charCodeAt(i), 16777619);
  h = Math.imul(h ^ (h >>> 15), 2246822519);
  return ((h ^ (h >>> 13)) >>> 0) / 4294967296;
}
const entre = (cle, [a, b]) => a + Math.floor(hache(cle) * (b - a + 1));

// Le jour où la pièce `id`, prise aujourd'hui, revient.
function retourDe(state, id, regle) {
  return state.day + entre(`${id}:retour:${state.day}`, regle.retour);
}

// Ce que donne la fin (le dernier coup, la main) : { objet: nombre }, la Hotte de bûcheron sur le
// premier objet (comme le bois d'un arbre de la ferme), les chances d'un de plus.
function butinFinal(state, id, regle) {
  const out = {};
  Object.entries(regle.fin || {}).forEach(([item, q], k) => {
    const n = entre(`${id}:${item}:${state.day}`, q);
    out[item] = k === 0 && regle.geste !== 'cueillir' && regle.geste !== 'ramasser' ? withBonus(state, n, techSum(state, 'recolteBonus')) : n;
  });
  for (const [item, pct] of Object.entries(regle.chance || {})) if (hache(`${id}:${item}:chance:${state.day}`) * 100 < pct) out[item] = (out[item] || 0) + 1;
  return out;
}

/* ---------- les gestes ---------- */

// Ce que tous les gestes vérifient : la pièce, son geste, l'outil, la distance (`depuis` : la case
// du personnage, s'il est connu), l'énergie (`n` fois l'action). → { o, G } ou un refus.
function preparer(state, id, geste, depuis, n = 1) {
  const o = lireIdMonde(id);
  if (!o || !o.regle) return { refus: fail('Il n\'y a rien à prendre ici.') };
  if (o.regle.geste !== geste) return { refus: fail(refusGeste(o.regle.geste)) };
  const G = GESTES[geste];
  if (G.outil && !hasTool(state, G.outil)) {
    const def = toolDef(G.outil);
    return { refus: fail(`Il te faut ${def.ARTICLE === 'un' ? 'un' : 'une'} ${def.NOM.toLowerCase()} (Marché, ${def.PRIX} 💰).`) };
  }
  const e = etatObjetMonde(state, id);
  if (estPrise(e)) return { refus: fail('Il n\'y a plus rien ici : ça repoussera.') };
  if (estCueillie(e)) return { refus: fail('Déjà cueilli : les fruits reviendront dans quelques jours.') };
  if (Number.isInteger(depuis) && depuis >= 0) {
    const W = farmTerrain(state).LARGEUR;
    if (Math.max(Math.abs((depuis % W) - o.X), Math.abs(Math.floor(depuis / W) - o.Y)) > RECOLTE.PORTEE) return { refus: fail('C\'est trop loin : approche-toi.') };
  }
  if (!canAfford(state, G.action, n)) return { refus: fail(TIRED) };
  return { o, G };
}

function refusGeste(geste) {
  if (geste === 'couper') return 'Il faut la hache pour couper ça.';
  if (geste === 'casser') return 'Il faut la pioche pour casser ça.';
  if (geste === 'faucher') return 'Il faut la faux pour faucher ça.';
  return 'Ça se prend à la main.';
}

// Le geste a eu lieu : l'énergie, l'XP, la région de la pièce devient vue (elle repoussera).
function finir(state, o, G, n = 1) {
  spendEnergy(state, G.action, n);
  gainActionXp(state, G.action);
  voirRegion(state, o.Y * farmTerrain(state).LARGEUR + o.X);
}

// Pose `items` ({ objet: nombre }) au sol : `parCoup` aux points du coup, `fin` aux points de la fin
// (lacher, outils.js ; sans `ou`, dans l'inventaire). → { coup: [...], fin: [...] } ou null.
function poser(state, parCoup, fin, ou) {
  let out = null;
  for (const item of new Set([...Object.keys(parCoup), ...Object.keys(fin)])) {
    const m = lacher(state, item, parCoup[item] || 0, fin[item] || 0, ou);
    if (m) { out = out || { coup: [], fin: [] }; out.coup.push(...m.coup); out.fin.push(...m.fin); }
  }
  return out;
}

const somme = (a, b) => { const out = { ...a }; for (const [k, n] of Object.entries(b)) out[k] = (out[k] || 0) + n; return out; };

// Un coup (de hache : couper ; de pioche : casser) sur la pièce `id` : ce qui tombe à chaque coup
// (regle.coup) au sol, aux points `ou.coup` ; au dernier coup (regle.coups, moins les Lames
// affûtées), la pièce tombe ou se brise : ce qui tombe à la fin, aux points `ou.fin`, et elle est
// prise jusqu'à son retour. `ou`, `fort` : comme chopTree (outils.js). → { ok, coups, fini, reste,
// items (tout ce qui est tombé), morceaux }.
function frapper(state, id, geste, ou, fort, depuis) {
  const f = force(fort);
  const { o, G, refus } = preparer(state, id, geste, depuis, f.energie);
  if (refus) return refus;
  const e = etatObjetMonde(state, id), base = o.regle.coups;
  const coups = (Number.isInteger(e) ? e : 0) + f.coups;
  const fini = coups >= hitsNeeded(state, base);
  const parCoup = {};
  for (const [item, n] of Object.entries(o.regle.coup || {})) parCoup[item] = withBonus(state, n, techSum(state, 'recolteBonus'));
  const fin = fini ? butinFinal(state, id, o.regle) : {};
  ecrire(state, id, fini ? { retour: retourDe(state, id, o.regle) } : coups);
  const morceaux = poser(state, parCoup, fin, ou);
  finir(state, o, G, f.energie);
  return { ok: true, coups, fini, reste: fini ? 0 : Math.max(0, hitsNeeded(state, base) - coups), items: somme(parCoup, fin), morceaux, fort: !!fort };
}

// La hache en main, un coup sur l'arbre, le buisson, la souche ou le tronc couché `id` : comme un
// arbre de la ferme. → frapper ({ tombe } : il vient de tomber).
export function couperMonde(state, id, ou, fort = false, depuis) {
  const r = frapper(state, id, 'couper', ou, fort, depuis);
  return r.ok ? { ...r, tombe: r.fini } : r;
}

// La pioche en main, un coup sur le rocher `id` : comme un rocher de la ferme. → frapper ({ casse }).
export function casserMonde(state, id, ou, fort = false, depuis) {
  const r = frapper(state, id, 'casser', ou, fort, depuis);
  return r.ok ? { ...r, casse: r.fini } : r;
}

// La faux en main, la fougère, le roseau, le jonc… `id` : fauché d'un coup, sa fibre au sol (aux
// points `ou.coup`, comme une touffe d'herbe haute de la ferme). → { ok, items, morceaux }.
export function faucherMonde(state, id, ou, depuis) {
  const { o, G, refus } = preparer(state, id, 'faucher', depuis);
  if (refus) return refus;
  const items = butinFinal(state, id, o.regle);
  ecrire(state, id, { retour: retourDe(state, id, o.regle) });
  const morceaux = poser(state, items, {}, ou);
  finir(state, o, G);
  return { ok: true, items, morceaux };
}

// À la main, les fruits de la plante `id` (un roncier : ses mûres) : dans l'inventaire ; elle reste,
// sans fruits (son dessin `apres`), jusqu'à son retour. `variante` : son dessin (la scène le lit
// dans la région) : un roncier en fleur n'a pas encore de fruits. → { ok, items }.
export function cueillirMonde(state, id, variante, depuis) {
  const { o, G, refus } = preparer(state, id, 'cueillir', depuis);
  if (refus) return refus;
  if (!o.regle.variantes.includes(Number(variante))) return fail(o.nom === 'ronces' ? 'Ce roncier est en fleur : pas encore de mûres.' : 'Pas encore de fruits.');
  const items = butinFinal(state, id, o.regle);
  ecrire(state, id, { retour: retourDe(state, id, o.regle), cueilli: true });
  donner(state, items);
  finir(state, o, G);
  return { ok: true, items };
}

// À la main, la pièce `id` (un champignon, un coquillage, un galet, du bois flotté…) : dans
// l'inventaire ; elle s'en va jusqu'à son retour. → { ok, items }.
export function ramasserMonde(state, id, depuis) {
  const { o, G, refus } = preparer(state, id, 'ramasser', depuis);
  if (refus) return refus;
  const items = butinFinal(state, id, o.regle);
  ecrire(state, id, { retour: retourDe(state, id, o.regle) });
  donner(state, items);
  finir(state, o, G);
  return { ok: true, items };
}

// Un habitant d'un hameau prend la pièce `id` sous les yeux du joueur (un bûcheron abat un arbre du
// monde : habitants.js, fiche 7b). Elle suit les règles d'ici : prise jusqu'à son retour (le même
// tirage que pour le joueur), sa région devient vue (elle repoussera) ; ni outil, ni énergie, ni XP
// pour le joueur, rien ne tombe au sol (ce qu'elle donne va au foyer de l'habitant). → true, ou
// false (pas une pièce du monde qui se coupe, ou déjà prise).
export function prendreParHabitant(state, id) {
  const o = lireIdMonde(id);
  if (!o || !o.regle || o.regle.geste !== 'couper' || estPrise(etatObjetMonde(state, id))) return false;
  ecrire(state, id, { retour: retourDe(state, id, o.regle) });
  voirRegion(state, o.Y * farmTerrain(state).LARGEUR + o.X);
  return true;
}

function donner(state, items) {
  for (const [item, n] of Object.entries(items)) if (n > 0) { addItem(state, item, n); noter('ramasse', { item, n }); }
}

// Le geste qui convient à la pièce `id` (la carte : js/ui/outils.js) ; `o` : { ou, fort, variante,
// depuis }.
export function recolterMonde(state, id, o = {}) {
  const r = lireIdMonde(id);
  const geste = r && r.regle ? r.regle.geste : null;
  if (geste === 'couper') return couperMonde(state, id, o.ou, o.fort, o.depuis);
  if (geste === 'casser') return casserMonde(state, id, o.ou, o.fort, o.depuis);
  if (geste === 'faucher') return faucherMonde(state, id, o.ou, o.depuis);
  if (geste === 'cueillir') return cueillirMonde(state, id, o.variante, o.depuis);
  if (geste === 'ramasser') return ramasserMonde(state, id, o.depuis);
  return fail('Il n\'y a rien à prendre ici.');
}

/* ---------- la repousse, au réveil ---------- */

// Au réveil (runNight) : les coups reçus s'oublient ; ce qui est pris ou cueilli et dont le jour est
// venu revient, si sa région est vue et qu'aucune de ses cases fermées n'est sous le personnage
// (state.monde.ici) : son entrée s'efface. Renvoie les identifiants revenus.
export function repousseMonde(state) {
  const P = state.monde && state.monde.pris;
  if (!P) return [];
  const Tr = farmTerrain(state), W = Tr.LARGEUR, ici = state.monde.ici, out = [];
  for (const id of Object.keys(P)) {
    const e = P[id];
    if (typeof e !== 'object' || e === null) { ecrire(state, id, undefined); continue; }
    if (!(Number(e.retour) <= state.day)) continue;
    const o = lireIdMonde(id);
    if (!o) { ecrire(state, id, undefined); continue; }
    if (!regionVue(state, o.Y * W + o.X, Tr)) continue;
    if (Number.isInteger(ici) && !e.cueilli && casesFermees(o, W).includes(ici)) continue;
    ecrire(state, id, undefined);
    out.push(id);
  }
  return out;
}
