import { DATA, recipeOutput, recipeOutputQty } from './catalog.js';
import { recipeNode, recipeUnlocked } from './kitchen.js';
import { noteRecipeDone } from './campaign.js';
import { fail, perSecond } from './devices.js';
import { addItem, countItem, takeItem } from './inventory.js';
import { farmTerrain } from './terrain.js';
import { poserMorceaux } from './outils.js';
import { availableEnergy } from './fridge.js';
import { drawEnergy, loadShedding } from './energy.js';

/* ---------- les chaînes de production ----------
   Des blocs de l'Atelier posés côte à côte sur une rangée de la carte, de gauche à droite :
   un entonnoir (DATA.ATELIER.BLOCS : botteleuse « entonnoir »), un réservoir (chaine
   « reservoir », facultatif), un ou plusieurs outils (chaine « outil » : la presse, la
   centrifugeuse, le mixeur, le chaudron, le tonneau, l'ensacheuse), puis au moins un convoyeur ;
   la case au bout du dernier convoyeur reste libre : les produits y tombent, en tas.
   La suite des outils fait la recette (DATA.CHAINES.RECETTES : l'id d'une recette de
   DATA.RECETTES de station « chaine », dont elle prend les ingrédients et ce qu'elle rend).

   Le joueur jette les ingrédients de son inventaire dans l'entonnoir (verserChaine) : sans
   réservoir, de quoi faire une fois la recette ; avec, jusqu'à CHAINES.RESERVOIR ingrédients. La
   chaîne travaille alors seule (runChaines, un consommateur du courant, js/engine/energy.js) :
   tant qu'elle a de quoi faire la recette, elle les prend, tourne la somme des `secondes` de ses
   outils en tirant la somme de leurs `whParS` (sans courant : elle attend), puis le produit tombe
   au bout du convoyeur (un morceau au sol, à ramasser en marchant dessus), sur le tas. Un tas de
   CHAINES.TAS produits l'arrête : il faut le ramasser.

   state.chaines = { [case de l'entonnoir]: { stock: { [objet]: n }, reservoir: bool,
   cycle: { recette, resteMs, pris: { [objet]: n } } | null } }. */

const C = () => DATA.CHAINES;
const T = 16;              // une case, en px de carte (les morceaux au sol sont en px)
const POSE = 14;           // px sous le haut de la case du bout : le pied du tas

// Les places du tas, au bout du convoyeur (px depuis le milieu du pied de la case) : d'abord le
// rang du bas, deux devant, puis les rangs du dessus, de plus en plus hauts et étroits.
export const TAS_PLACES = [
  [-6, 0], [-2, 0], [2, 0], [6, 0], [-3, 2], [3, 2],
  [-4, -3], [0, -3], [4, -3], [-2, -6], [2, -6], [0, -9],
];

// Le rôle d'une sorte de bloc dans une chaîne : 'entonnoir', 'reservoir', 'outil', 'convoyeur',
// ou null.
function role(sorte) {
  const b = (DATA.ATELIER.BLOCS || {})[sorte];
  if (!b) return null;
  if (b.botteleuse === 'entonnoir') return 'entonnoir';
  if (b.botteleuse === 'convoyeur') return 'convoyeur';
  if (b.chaine === 'reservoir' || b.chaine === 'outil') return b.chaine;
  return null;
}

function etats(state) {
  if (!state.chaines || typeof state.chaines !== 'object') state.chaines = {};
  return state.chaines;
}

// La recette qu'une suite d'outils fait (id de DATA.RECETTES), ou null.
export function recetteDesOutils(sortes) {
  const cle = sortes.join('>');
  for (const [id, suite] of Object.entries(C().RECETTES)) if (suite.join('>') === cle) return id;
  return null;
}

// Ce que la recette `id` rend : { item, qte }.
export function produitDe(id) {
  return { item: recipeOutput(id), qte: recipeOutputQty(id) };
}

// Les objets qu'accepte chaque ingrédient de la recette `id` : [{ items: [...], qte }].
function besoins(id) {
  return DATA.RECETTES[id].ingredients.map((g) => ({ items: g.ou ? g.ou.slice() : [g.item], qte: g.qte }));
}
const lot = (id) => besoins(id).reduce((n, g) => n + g.qte, 0);
const total = (stock) => Object.values(stock || {}).reduce((n, v) => n + (v | 0), 0);

// Le stock `stock` a-t-il de quoi faire une fois la recette `id` ? Renvoie ce qu'il faut en
// prendre ({ objet: n }), ou null. Comme en cuisine, un ingrédient au choix (« pommes ou
// poires ») se prend d'une seule sorte : celle dont il y a le plus, si elle suffit.
function prelevement(stock, id) {
  const pris = {};
  for (const g of besoins(id)) {
    const it = g.items.slice().sort((a, b) => (stock[b] | 0) - (stock[a] | 0))[0];
    if ((stock[it] | 0) - (pris[it] | 0) < g.qte) return null;
    pris[it] = (pris[it] || 0) + g.qte;
  }
  return pris;
}

// La chaîne qui commence à l'entonnoir `e` : { case, reservoir, outils: [cases], sortes,
// convoyeurs: [cases], bout, recette, produit, ok, raison, capacite, stock, enStock, cycle,
// tas, whParS, secondes }, ou null (pas d'outil juste après l'entonnoir et son réservoir : ce
// n'est pas une chaîne, une botteleuse ou un distributeur peut-être).
export function etatChaine(state, e) {
  const blocs = state.blocs || {}, W = farmTerrain(state).LARGEUR;
  if (role(blocs[e]) !== 'entonnoir') return null;
  const ligne = Math.floor(e / W), surLigne = (t) => Math.floor(t / W) === ligne;
  let t = e + 1;
  const reservoir = surLigne(t) && role(blocs[t]) === 'reservoir' ? t : null;
  if (reservoir !== null) t += 1;
  const outils = [];
  while (surLigne(t) && role(blocs[t]) === 'outil') { outils.push(t); t += 1; }
  if (!outils.length) return null;
  const convoyeurs = [];
  while (surLigne(t) && role(blocs[t]) === 'convoyeur') { convoyeurs.push(t); t += 1; }
  const sortes = outils.map((o) => blocs[o]);
  const recette = recetteDesOutils(sortes);
  const st = etats(state)[e] || null;
  const O = C().OUTILS;
  const out = {
    case: e, reservoir, outils, sortes, convoyeurs, bout: t, recette,
    produit: recette ? produitDe(recette) : null,
    capacite: recette ? (reservoir !== null ? Math.max(C().RESERVOIR, lot(recette)) : lot(recette)) : 0,
    stock: st ? { ...st.stock } : {}, cycle: st && st.cycle ? { ...st.cycle } : null,
    whParS: sortes.reduce((n, s) => n + O[s].whParS, 0),
    secondes: sortes.reduce((n, s) => n + O[s].secondes, 0),
  };
  out.enStock = total(out.stock);
  out.tas = tasDe(state, out).length;
  const bloque = (c) => !!(DATA.ATELIER.BLOCS[blocs[c]] || {}).bloque;
  if (!convoyeurs.length) out.raison = 'Pose au moins un convoyeur juste à droite du dernier outil : le produit en sort.';
  else if (!surLigne(t) || bloque(t)) out.raison = 'La case au bout du convoyeur doit rester libre : les produits y tombent, en tas.';
  else if (!recette) out.raison = `Ces outils ne vont pas ensemble : ${sortes.map((s) => DATA.ATELIER.BLOCS[s].nom.toLowerCase()).join(', puis ')} ne font rien.`;
  else if (!recipeUnlocked(state, recette)) {
    const n = DATA.ARBRE.noeuds[recipeNode(recette)];
    out.raison = `${DATA.RECETTES[recette].nom} : à débloquer dans l'Arbre des technologies${n ? ` (${n.nom})` : ''}.`;
  }
  out.ok = !out.raison;
  return out;
}

// Les chaînes de la ferme (une par entonnoir suivi d'outils).
export function chaines(state) {
  const blocs = state.blocs || {};
  return Object.keys(blocs).filter((t) => role(blocs[t]) === 'entonnoir').map((t) => etatChaine(state, Number(t))).filter(Boolean);
}

// La chaîne dont `tile` est un bloc (l'entonnoir, le réservoir, un outil, un convoyeur), ou null.
export function chaineDe(state, tile) {
  for (const c of chaines(state)) {
    if (c.case === tile || c.reservoir === tile || c.outils.includes(tile) || c.convoyeurs.includes(tile)) return c;
  }
  return null;
}

// Le pied du tas de la chaîne `c` (px de carte), et ses places.
function pied(state, c) {
  const W = farmTerrain(state).LARGEUR;
  return { x: (c.bout % W) * T + T / 2, y: Math.floor(c.bout / W) * T + POSE };
}
// Les morceaux du tas de la chaîne `c` (au sol, sur ses places).
function tasDe(state, c) {
  const p = pied(state, c), places = new Set(TAS_PLACES.map(([dx, dy]) => `${p.x + dx},${p.y + dy}`));
  return (state.morceaux || []).filter((m) => m.carte === 'ferme' && places.has(`${m.x},${m.y}`));
}

// Le joueur jette dans l'entonnoir de la chaîne dont `tile` est un bloc les ingrédients de sa
// recette qu'il a : jusqu'à ce qu'elle en ait de quoi faire une fois la recette (sans réservoir),
// ou CHAINES.RESERVOIR (avec), à parts égales entre ses ingrédients. { ok, case, versees:
// { objet: n }, stock, capacite } ou un refus.
export function verserChaine(state, tile) {
  const c = chaineDe(state, tile);
  if (!c) return fail('Ce n\'est pas une chaîne de production.');
  if (!c.ok) return fail(c.raison);
  const st = etats(state)[c.case] || (etats(state)[c.case] = { stock: {}, reservoir: c.reservoir !== null, cycle: null });
  st.reservoir = c.reservoir !== null;
  let place = c.capacite - total(st.stock);
  if (place <= 0) return fail(c.reservoir !== null ? 'Le réservoir est plein : la chaîne travaille.' : 'La chaîne a déjà de quoi faire : elle travaille.');
  const B = besoins(c.recette), versees = {};
  // pour chaque ingrédient, une seule sorte (« pommes ou poires ») : celle dont la chaîne et
  // l'inventaire ont le plus à eux deux
  const sorte = B.map((g) => g.items.slice().sort((a, b) => ((st.stock[b] | 0) + countItem(state, b)) - ((st.stock[a] | 0) + countItem(state, a)))[0]);
  // sans réservoir : de quoi faire une fois la recette ; avec : un de chaque à son tour, tant
  // qu'il y a de la place et que l'inventaire en a
  const pour = B.map((g, i) => (c.reservoir === null ? Math.max(0, g.qte - (st.stock[sorte[i]] | 0)) : Infinity));
  let encore = true;
  while (place > 0 && encore) {
    encore = false;
    for (let i = 0; i < B.length && place > 0; i++) {
      const it = sorte[i];
      if (pour[i] <= 0 || countItem(state, it) < 1) continue;
      takeItem(state, it, 1);
      st.stock[it] = (st.stock[it] | 0) + 1;
      versees[it] = (versees[it] | 0) + 1;
      pour[i] -= 1;
      place -= 1;
      encore = true;
    }
  }
  if (!Object.keys(versees).length) {
    const noms = B.map((g) => `${g.qte} ${g.items.map((it) => (DATA.OBJETS[it] ? DATA.OBJETS[it].nom.toLowerCase() : it)).join(' ou ')}`).join(', ');
    return fail(`Il faut ${noms} pour : ${DATA.RECETTES[c.recette].nom.toLowerCase()}.`);
  }
  return { ok: true, case: c.case, versees, stock: { ...st.stock }, capacite: c.capacite, recette: c.recette };
}

// Le pas des chaînes (un consommateur du courant, js/engine/energy.js) : chacune qui a de quoi
// faire sa recette et de la place sur son tas la commence ; celle qui travaille avance tant que le
// courant le permet ; finie, son produit tombe sur le tas. `etat.conso` (mWh/s) pour l'affichage.
export function runChaines(state, dtMs) {
  if (!state.chaines || !Object.keys(state.chaines).length) return;
  const coupe = loadShedding(state);
  for (const k of Object.keys(state.chaines)) {
    const st = state.chaines[k];
    st.conso = 0;
    const c = etatChaine(state, Number(k));
    if (!c || !c.ok) continue;
    let left = dtMs, got = 0;
    while (left > 0) {
      if (!st.cycle) {
        if (c.tas >= C().TAS) break;
        const pris = prelevement(st.stock, c.recette);
        if (!pris) break;
        for (const [it, n] of Object.entries(pris)) { st.stock[it] -= n; if (st.stock[it] <= 0) delete st.stock[it]; }
        st.cycle = { recette: c.recette, resteMs: c.secondes * 1000, pris };
      }
      if (coupe) break;
      const runMs = Math.min(left, st.cycle.resteMs, Math.floor(availableEnergy(state) / c.whParS));
      if (runMs <= 0) break;
      got += drawEnergy(state, runMs * c.whParS);
      st.cycle.resteMs -= runMs;
      left -= runMs;
      if (st.cycle.resteMs > 0) break;
      sortirProduit(state, c, st.cycle.recette);
      st.cycle = null;
      c.tas += 1;
    }
    st.conso = perSecond(got, dtMs);
  }
}

// Le produit de la recette `id` tombe sur le tas de la chaîne `c` (la première place libre ; un
// tas plein : sur la dernière).
function sortirProduit(state, c, id) {
  const { item, qte } = produitDe(id);
  const p = pied(state, c), pris = new Set(tasDe(state, c).map((m) => `${m.x},${m.y}`));
  const place = TAS_PLACES.find(([dx, dy]) => !pris.has(`${p.x + dx},${p.y + dy}`)) || TAS_PLACES[TAS_PLACES.length - 1];
  poserMorceaux(state, item, 1, 'ferme', [{ x: p.x + place[0], y: p.y + place[1] }], { qte, image: item });
  noteRecipeDone(state, id, 1);
}

// Après la reprise d'un bloc (js/engine/blocs.js reprendreBloc) : une chaîne défaite (son
// entonnoir, ses outils) ou qui a perdu son réservoir rend à l'inventaire ce qu'elle avait reçu
// (son stock, et les ingrédients de la production en cours).
export function chainesReprise(state) {
  if (!state.chaines) return;
  for (const k of Object.keys(state.chaines)) {
    const st = state.chaines[k], c = etatChaine(state, Number(k));
    const garde = c && c.recette && !(st.reservoir && c.reservoir === null)
      && compatible(st.stock, c.recette) && (!st.cycle || st.cycle.recette === c.recette);
    if (garde) continue;
    for (const [it, n] of Object.entries(st.stock || {})) if (n > 0) addItem(state, it, n);
    if (st.cycle) for (const [it, n] of Object.entries(st.cycle.pris || {})) if (n > 0) addItem(state, it, n);
    delete state.chaines[k];
  }
}
// Le stock n'a-t-il que des ingrédients de la recette `id` ?
function compatible(stock, id) {
  const ok = new Set(besoins(id).flatMap((g) => g.items));
  return Object.keys(stock || {}).every((it) => ok.has(it));
}

// Le joueur automatique (sans carte ni blocs), une fois les chaînes débloquées : il transforme
// ce qu'il a comme le ferait une chaîne, recette par recette, tant qu'il a de quoi (sans
// courant ni temps : ses chaînes tournent pendant qu'il fait le reste). `ids` : les recettes à
// faire (par défaut l'huile). Renvoie le nombre de produits faits.
export function chainesSansCarte(state, ids = ['huile'], max = Infinity) {
  let n = 0;
  for (const id of ids) {
    const inv = {};
    for (const g of besoins(id)) for (const it of g.items) inv[it] = countItem(state, it);
    for (let pris = prelevement(inv, id); pris && n < max; pris = prelevement(inv, id)) {
      for (const [it, k] of Object.entries(pris)) { takeItem(state, it, k); inv[it] -= k; }
      const { item, qte } = produitDe(id);
      addItem(state, item, qte);
      noteRecipeDone(state, id, 1);
      n += 1;
    }
  }
  return n;
}
