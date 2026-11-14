import { DATA, ingredientOptions, recipeOutput, recipeOutputQty } from './catalog.js';
import { fail } from './devices.js';
import { villageActif } from './village.js';
import { countItem, freshLot, isFridgeable, keepLots, lotList, lotRank, pullLots, pushLots } from './inventory.js';
import { boiteCounts, boitePosee, deposerBoite, placeBoite, rangementCommun, rangementDe, reprendreBoite } from './repas.js';
import { fridgeCounts, fridgeRoom, moveToFridge } from './fridge.js';
import { countWithSilo, takeWithSilo } from './animals.js';
import { recipeUnlocked } from './kitchen.js';
import { noteRecipeDone } from './campaign.js';
import { dishHappiness } from './bonheur.js';

/* ---------- le garde-manger commun et la cuisine du village (le chantier « l'île à bâtir », fiche I3e) ----------

   À la demande de l'utilisateur : « un ou plusieurs villageois peuvent être assignés à une cuisine collective ou une
   boîte à nourriture ou un frigo collectif permet aux habitants de se nourrir ».

   Le garde-manger commun : la boîte à nourriture ou le réfrigérateur de la ferme, rendu « commun » au village d'un
   appui (sa fenêtre : js/ui/garde-manger.js ; la commande village.commun). Il n'y en a qu'un (state.gardeManger.sorte :
   'boite' ou 'frigo' ; la boîte et le réfrigérateur sont uniques, un seul des deux est commun). Le réfrigérateur acheté
   remplace la boîte de la famille (repas.js rangerBoite), mais la boîte rendue commune reste : elle est au village, la
   famille mange au réfrigérateur (repas.js sourceVillage). Les villageois y mangent (ils mangeaient au rangement de la
   famille : villageois.js nuitDe) ; ce qui change :
     - le travail des villageois y dépose ce qu'il produit qui se mange (deposerDuTravail, à chaque action : taches.js),
       tant qu'il a moins de `reserve` jours de repas du village (le joueur la règle : GARDE_MANGER.RESERVES ; 0 : rien
       n'y va), le reste au coffre ; ce que la cuisine du village n'attend pas lui laisse de la place (PLACES_PLATS,
       faireDeLaPlace) ; le joueur y dépose lui-même (la fenêtre de la boîte, du réfrigérateur) ;
     - ce qui périt y garde sa fraîcheur au réfrigérateur (alimenté, fridge.js) ; dans la boîte, il vieillit comme dans
       l'inventaire (inventory.js : la nuit) ;
     - la cuisine du village y prend ses ingrédients et y range ses plats.

   La cuisine du village : une cuisinière ou un four posés (dans une pièce close), désignés « du village »
   (state.gardeManger.cuisines : leurs cases, CUISINE.MAX au plus ; la commande village.cuisine). Avec un garde-manger
   commun, la tâche « cuisine » (I3c) devient la cuisine du village (cuisineDuVillage) : le cuisinier se tient devant
   un de ces blocs (deux postes par bloc : on y cuisine à deux), fait CUISINE.ACTIONS plats par jour (platDuVillage : les
   ingrédients qui se mangent pris au garde-manger, ceux qui ne s'y rangent pas — la farine, l'huile, le sucre — au
   coffre, l'eau au réservoir ; le plat rangé au garde-manger, sinon au coffre), sans passer par la file de la station
   du joueur (elle reste libre pour lui). Plusieurs cuisiniers font plus de plats ; deux amis, une action de plus
   (I6b). Le soir, le village mange ensemble (villageois.js : la tablée, servirLaTable ; villageois-journee.js : la
   table commune d'abord) : les plats sont partagés (une part entamée passe au voisin) et chacun goûte à tous les plats
   de la table (le bonheur des plats et de la variété, bonheur.js).

   state.gardeManger = { commun (bool), sorte ('boite' | 'frigo' | null), reserve (jours), cuisines ([cases]), journal ([{ jour, depose: { objet: n }
   (ce que le travail y a mis), plats: { objet: n } (ce que la cuisine y a fait), mange: { objet: n } (ce que les
   villageois y ont mangé) }] : JOURNAL jours au plus) }. Le champ naît au premier appui (format 102) ; le chantier
   éteint ou sans lui, rien ici ne se lit. Les tests : tests/engine/village-garde-manger.test.mjs. */

const GM = () => (DATA.VILLAGE && DATA.VILLAGE.GARDE_MANGER) || {};
const CU = () => GM().CUISINE || {};
const objet = (v) => !!v && typeof v === 'object' && !Array.isArray(v);
const jourDe = (state) => Math.max(1, Math.floor(Number(state && state.day) || 1));
const entier = (x) => Math.max(0, Math.floor(Number(x) || 0));
const SORTES_CUISINE = { cuisiniere: 'cuisine', four: 'four' };

/* ---------- le garde-manger ---------- */

// La partie a-t-elle un garde-manger désigné (même si son rangement a disparu) ?
function gm(state) {
  return villageActif(state) && objet(state.gardeManger) ? state.gardeManger : null;
}

// Le garde-manger commun : { sorte ('boite' | 'frigo'), store (ses lots) }, ou null (pas commun, ou son rangement
// n'est plus là : la boîte reprise).
export function gardeManger(state) {
  const source = rangementCommun(state);
  return source ? { sorte: source, store: rangementDe(state, source) } : null;
}

// Les rangements qu'on peut rendre communs : ['boite' (posée), 'frigo' (construit)].
export function rangementsPossibles(state) {
  return [boitePosee(state) ? 'boite' : null, state.frigo && state.frigo.construit ? 'frigo' : null].filter(Boolean);
}

// Le garde-manger est-il commun ? (désigné, son rangement posé)
export function gardeMangerCommun(state) {
  return !!gardeManger(state);
}

// Ce qu'il contient : { objet: n }.
export function contenuGardeManger(state) {
  const G = gardeManger(state);
  if (!G) return {};
  return G.sorte === 'frigo' ? fridgeCounts(state) : boiteCounts(state);
}

// L'énergie de ce qu'il contient (en énergie des objets, celle du besoin d'un adulte : FAMILLE.AJ).
export function energieGardeManger(state) {
  let e = 0;
  for (const [o, n] of Object.entries(contenuGardeManger(state))) e += (Number((DATA.OBJETS[o] || {}).energie) || 0) * n;
  return e;
}

// Le besoin d'un jour du village (en énergie) : un adulte, un enfant chacun le sien.
export function besoinDuVillage(state) {
  const AJ = DATA.FAMILLE.AJ;
  return (Array.isArray(state.villageois) ? state.villageois : []).reduce((t, v) => t + (v && v.enfant ? AJ.enfant : AJ.adulte), 0);
}

// Combien de jours de repas du village il contient (un nombre à une décimale ; Infinity sans villageois).
export function joursDeReserve(state) {
  const b = besoinDuVillage(state);
  return b > 0 ? Math.floor((10 * energieGardeManger(state)) / b) / 10 : Infinity;
}

// La réserve visée (jours) : ce que le joueur a réglé, sinon GARDE_MANGER.RESERVE.
export function reserveVisee(state) {
  const g = gm(state);
  const r = g && Number.isFinite(Number(g.reserve)) ? Number(g.reserve) : Number(GM().RESERVE) || 0;
  return Math.max(0, r);
}

// Le joueur rend la boîte (`sorte` 'boite') ou le réfrigérateur ('frigo') commun au village, ou le reprend (oui :
// false). Sans `sorte` : la boîte posée, sinon le réfrigérateur. Un seul garde-manger : rendre l'un commun reprend
// l'autre. Le réfrigérateur acheté, une boîte commune reste (repas.js rangerBoite) : le village y mange, la famille au
// réfrigérateur. → { ok, commun, sorte }.
export function designerGardeManger(state, oui = true, sorte = null) {
  if (!villageActif(state)) return fail('Le chantier de l\'île n\'est pas allumé.');
  const g = assurer(state);
  if (!oui) {
    g.commun = false;
    return { ok: true, commun: false, sorte: g.sorte || null };
  }
  const possibles = rangementsPossibles(state);
  const s = sorte || possibles[0] || null;
  if (!s || !possibles.includes(s)) return fail(s === 'frigo' ? 'Achète et pose d\'abord le réfrigérateur.' : 'Pose d\'abord la boîte à nourriture dans une maison.');
  g.commun = true;
  g.sorte = s;
  return { ok: true, commun: true, sorte: s };
}

// La réserve visée, en jours (un choix de GARDE_MANGER.RESERVES, ou un entier de 0 à 10). → { ok, reserve }.
export function reglerReserve(state, jours) {
  if (!villageActif(state)) return fail('Le chantier de l\'île n\'est pas allumé.');
  const n = Math.floor(Number(jours));
  if (!Number.isFinite(n) || n < 0 || n > 10) return fail('Une réserve de 0 à 10 jours.');
  assurer(state).reserve = n;
  return { ok: true, reserve: n };
}

function assurer(state) {
  if (!objet(state.gardeManger)) state.gardeManger = { commun: false, sorte: null, reserve: Number(GM().RESERVE) || 0, cuisines: [], journal: [] };
  const g = state.gardeManger;
  if (!Array.isArray(g.cuisines)) g.cuisines = [];
  if (!Array.isArray(g.journal)) g.journal = [];
  return g;
}

/* ---------- le journal (ce que le travail y dépose, ce que la cuisine y fait, ce qu'on y mange) ---------- */

function entreeDuJour(state) {
  const g = assurer(state), j = jourDe(state);
  let e = g.journal[g.journal.length - 1];
  if (!e || e.jour !== j) {
    e = { jour: j, depose: {}, plats: {}, mange: {} };
    g.journal.push(e);
    const max = Math.max(1, entier(GM().JOURNAL) || 7) + 1;
    if (g.journal.length > max) g.journal.splice(0, g.journal.length - max);
  }
  return e;
}

function noter(state, cle, o, n) {
  if (!(n > 0)) return;
  const e = entreeDuJour(state);
  e[cle][o] = (e[cle][o] || 0) + n;
}

// Le bilan sur les `jours` derniers jours finis (hier compris, pas aujourd'hui) : { depose, plats, mange ({ objet: n }),
// jours (ceux qui ont une entrée) }.
export function bilanGardeManger(state, jours = 7) {
  const g = gm(state), out = { depose: {}, plats: {}, mange: {}, jours: 0 };
  if (!g || !Array.isArray(g.journal)) return out;
  const au = jourDe(state) - 1, du = au - jours + 1;
  for (const e of g.journal) {
    if (!objet(e) || e.jour < du || e.jour > au) continue;
    out.jours += 1;
    for (const k of ['depose', 'plats', 'mange']) for (const [o, n] of Object.entries(e[k] || {})) out[k][o] = (out[k][o] || 0) + n;
  }
  return out;
}

// Aujourd'hui : { depose, plats, mange }.
export function journeeGardeManger(state) {
  const g = gm(state), e = g && Array.isArray(g.journal) ? g.journal[g.journal.length - 1] : null;
  return e && e.jour === jourDe(state) ? { depose: { ...e.depose }, plats: { ...e.plats }, mange: { ...e.mange } } : { depose: {}, plats: {}, mange: {} };
}

/* ---------- déposer ---------- */

// La place pour `o` au garde-manger (en unités). `brut` : un aliment que la cuisine du village n'attend pas (ni plat,
// ni nourrissant, ni ingrédient d'un plat qu'elle peut faire : utileAuGardeManger) ; la cuisine du village tournant, il
// laisse de la place aux plats (PLACES_PLATS : des aliments différents de la boîte, des unités du réfrigérateur).
function placePour(state, G, o, brut = false) {
  const def = DATA.OBJETS[o];
  if (!def || !def.mangeable) return 0;
  const P = brut && cuisineDuVillage(state) ? GM().PLACES_PLATS || {} : {};
  if (G.sorte === 'frigo') return isFridgeable(o) ? Math.max(0, fridgeRoom(state) - (entier(P.frigo) || 0)) : 0;
  const c = boiteCounts(state);
  if (!c[o] && Object.keys(c).length >= DATA.ATELIER.BOITE.PLATS - (entier(P.boite) || 0)) return 0;
  return placeBoite(state, o);
}

// La boîte commune n'a plus de place pour une sorte de plus (`o`, que la cuisine du village attend) : l'aliment qu'elle
// n'attend pas (ni plat, ni nourrissant, ni ingrédient d'un plat qu'elle peut faire) qui nourrit le moins, hors
// `garder`, retourne au coffre. → vrai : une place s'est libérée.
function faireDeLaPlace(state, G, o, garder = []) {
  if (G.sorte !== 'boite' || !cuisineDuVillage(state)) return false;
  const c = boiteCounts(state);
  if (c[o] || Object.keys(c).length < DATA.ATELIER.BOITE.PLATS) return false;
  const l = Object.keys(c).filter((x) => x !== o && !garder.includes(x) && !utileAuGardeManger(state, x, 0))
    .sort((a, b) => (DATA.OBJETS[a].energie || 0) * c[a] - (DATA.OBJETS[b].energie || 0) * c[b] || (a < b ? -1 : 1));
  if (!l.length) return false;
  return !!reprendreBoite(state, l[0], c[l[0]]).ok;
}

// Met `n` unités de `o` de l'inventaire au garde-manger (ce qui y tient ; voir placePour ; la cuisine du village
// tournant, ce qu'elle attend fait de la place dans la boîte : faireDeLaPlace). → les unités déposées.
export function deposerAuGardeManger(state, o, n) {
  const G = gardeManger(state);
  if (!G || !(n > 0) || !(countItem(state, o) >= 1)) return 0;
  const brut = !utileAuGardeManger(state, o, Math.floor(n));
  if (!brut && !placePour(state, G, o)) faireDeLaPlace(state, G, o);
  const k = Math.min(Math.floor(n), Math.floor(countItem(state, o)), placePour(state, G, o, brut));
  if (k <= 0) return 0;
  const r = G.sorte === 'frigo' ? moveToFridge(state, o, k) : deposerBoite(state, o, k);
  return r && r.ok ? r.moved : 0;
}

// Ce que la cuisine du village attend au garde-manger (`o`, dont `n` arrivent) : un plat ; ce qui se mange et nourrit
// bien (ENERGIE_MIN d'énergie au moins : les œufs, le lait, les patates, le poisson) ; ou un ingrédient d'un plat du menu
// qu'elle peut faire avec lui (ses autres ingrédients au garde-manger ou au coffre). Le reste y va aussi, s'il laisse la
// place des plats (placePour) : la boîte n'a que ATELIER.BOITE.PLATS aliments différents, le réfrigérateur ses unités.
export function utileAuGardeManger(state, o, n = 1) {
  const def = DATA.OBJETS[o];
  if (!def || !def.mangeable || !(def.energie > 0)) return false;
  if (dishHappiness(o) > 0 || (Number(def.energie) || 0) >= (Number(GM().ENERGIE_MIN) || 0)) return true;
  if (!cuisineDuVillage(state)) return false;
  const contenu = { ...contenuGardeManger(state) };
  contenu[o] = (contenu[o] || 0) + n;
  return menuDuVillage(state).some((r) => DATA.RECETTES[r].ingredients.some((i) => ingredientOptions(i).includes(o)) && lignesPlat(state, r, contenu).ok);
}

// Le travail d'un villageois vient de produire `produit` ({ objet: n }, entré au coffre) : ce qui se mange va au
// garde-manger tant qu'il a moins que la réserve visée (et de la place). Une action de la cuisine du village a déjà
// rangé son plat. → { objet: n } déposés.
export function deposerDuTravail(state, produit) {
  const G = gardeManger(state);
  const out = {};
  if (!G || !objet(produit)) return out;
  const vise = reserveVisee(state) * besoinDuVillage(state);
  if (!(vise > 0)) return out;
  let e = energieGardeManger(state);
  // (ce qui nourrit le plus d'abord)
  const l = Object.entries(produit).filter(([o, n]) => n > 0 && DATA.OBJETS[o] && DATA.OBJETS[o].mangeable && DATA.OBJETS[o].energie > 0)
    .sort((a, b) => (DATA.OBJETS[b[0]].energie || 0) - (DATA.OBJETS[a[0]].energie || 0) || (a[0] < b[0] ? -1 : 1));
  for (const [o, n] of l) {
    if (e >= vise) break;
    const en = Math.max(1, Number(DATA.OBJETS[o].energie) || 1);
    const k = deposerAuGardeManger(state, o, Math.min(n, Math.ceil((vise - e) / en)));
    if (k > 0) { out[o] = k; e += k * en; noter(state, 'depose', o, k); }
  }
  return out;
}

/* ---------- la cuisine du village ---------- */

// Les blocs de la cuisine du village encore là : [{ case, sorte ('cuisiniere' | 'four'), station }].
export function cuisinesDuVillage(state) {
  const g = gm(state);
  if (!g || !Array.isArray(g.cuisines)) return [];
  const B = state.blocs || {}, S = state.stations || {};
  return g.cuisines.filter((t) => SORTES_CUISINE[B[t]] && S[SORTES_CUISINE[B[t]]] && S[SORTES_CUISINE[B[t]]].construit)
    .map((t) => ({ case: t, sorte: B[t], station: SORTES_CUISINE[B[t]] }));
}

// La cuisine du village tourne-t-elle ? (un garde-manger commun et une cuisinière ou un four du village) : la tâche
// « cuisine » est alors la sienne (taches.js), et le village mange ensemble le soir (villageois.js).
export function cuisineDuVillage(state) {
  return gardeMangerCommun(state) && cuisinesDuVillage(state).length > 0;
}

// Le bloc de la case `t` est-il de la cuisine du village ?
export function estCuisineDuVillage(state, t) {
  const g = gm(state);
  return !!g && Array.isArray(g.cuisines) && g.cuisines.includes(t);
}

// Le joueur désigne la cuisinière (ou le four) de la case `t` « du village », ou la reprend (oui : false). → { ok }.
export function designerCuisine(state, t, oui = true) {
  if (!villageActif(state)) return fail('Le chantier de l\'île n\'est pas allumé.');
  const B = state.blocs || {};
  if (oui && !SORTES_CUISINE[B[t]]) return fail('Seuls une cuisinière ou un four posés font la cuisine du village.');
  const g = assurer(state);
  if (!oui) {
    g.cuisines = g.cuisines.filter((c) => c !== t);
    return { ok: true, cuisines: [...g.cuisines] };
  }
  if (g.cuisines.includes(t)) return { ok: true, cuisines: [...g.cuisines] };
  // (les blocs repris ou remplacés ne comptent plus)
  g.cuisines = g.cuisines.filter((c) => SORTES_CUISINE[B[c]]);
  const max = Math.max(1, entier(CU().MAX) || 2);
  if (g.cuisines.length >= max) return fail(`La cuisine du village a déjà ${max} blocs : reprends-en un d'abord.`);
  g.cuisines.push(t);
  return { ok: true, cuisines: [...g.cuisines] };
}

// Le menu de la cuisine du village : les recettes de CUISINE.RECETTES débloquées et dont un bloc du village a la
// station. → [ids].
export function menuDuVillage(state) {
  const stations = new Set(cuisinesDuVillage(state).map((c) => c.station));
  return (CU().RECETTES || []).filter((r) => DATA.RECETTES[r] && stations.has(DATA.RECETTES[r].station) && recipeUnlocked(state, r));
}

// Où prendre un ingrédient : ce qui se mange au garde-manger, le reste (farine, huile, sucre, épices) au coffre.
const auGardeManger = (o) => !!(DATA.OBJETS[o] && DATA.OBJETS[o].mangeable);

// La recette `r` peut-elle se faire avec ce qu'il y a ? → { ok, prises: [{ objet, qte, garde (bool) }], manque: [objets] }.
export function lignesPlat(state, r, contenu = contenuGardeManger(state)) {
  const R = DATA.RECETTES[r], prises = [], manque = [];
  for (const ing of R.ingredients) {
    const opts = ingredientOptions(ing);
    const o = opts.find((x) => (auGardeManger(x) ? contenu[x] || 0 : countWithSilo(state, x)) >= ing.qte);
    if (o) prises.push({ objet: o, qte: ing.qte, garde: auGardeManger(o) });
    else manque.push(opts[0]);
  }
  if (R.eau && !(state.eauMl >= R.eau * 1000)) manque.push('eau');
  return { ok: !manque.length, prises, manque };
}

// Le plat que fera le prochain cuisinier : parmi le menu, ceux qu'on peut faire et dont le plat tient au garde-manger,
// celui qui y manque le plus (le moins d'unités : la variété), puis celui qui nourrit le mieux (l'énergie gagnée sur ses
// ingrédients), puis l'ordre du menu. → { recette, prises } ou null.
export function prochainPlat(state) {
  const G = gardeManger(state);
  if (!G) return null;
  const contenu = contenuGardeManger(state);
  let best = null;
  (menuDuVillage(state)).forEach((r, rang) => {
    const L = lignesPlat(state, r, contenu);
    if (!L.ok) return;
    const sortie = recipeOutput(r), q = recipeOutputQty(r);
    // (la place du plat, une fois ses ingrédients sortis : la boîte compte ses aliments différents, le frigo ses unités)
    const libere = L.prises.filter((p) => p.garde).reduce((t, p) => t + p.qte, 0);
    const vides = L.prises.filter((p) => p.garde && contenu[p.objet] === p.qte).length;
    let place;
    if (G.sorte === 'frigo') place = isFridgeable(sortie) ? fridgeRoom(state) + libere : 0;
    else {
      // (une sorte de plus : une place libre, ou un aliment qu'elle n'attend pas, qui retournera au coffre)
      const B = DATA.ATELIER.BOITE, sortes = Object.keys(contenu).length - vides;
      const evincable = () => Object.keys(contenu).some((x) => x !== sortie && !L.prises.some((p) => p.objet === x) && !utileAuGardeManger(state, x, 0));
      place = contenu[sortie] ? B.QUANTITE - contenu[sortie] : sortes < B.PLATS || evincable() ? B.QUANTITE : 0;
    }
    if (place < q) return;
    const gain = (DATA.OBJETS[sortie].energie || 0) * q - L.prises.filter((p) => p.garde).reduce((t, p) => t + (DATA.OBJETS[p.objet].energie || 0) * p.qte, 0);
    const cle = [contenu[sortie] || 0, -gain, rang];
    if (!best || cle[0] < best.cle[0] || (cle[0] === best.cle[0] && (cle[1] < best.cle[1] || (cle[1] === best.cle[1] && cle[2] < best.cle[2])))) best = { recette: r, prises: L.prises, cle };
  });
  return best ? { recette: best.recette, prises: best.prises } : null;
}

// Une action du cuisinier de la cuisine du village : un plat (prochainPlat), ses ingrédients pris (au garde-manger, au
// coffre, l'eau au réservoir), le plat rangé au garde-manger. Il compte pour les paliers comme un plat du joueur (les
// pains, les plats différents : campaign.js noteRecipeDone). → { ok, recette, produit, utilise } ou un refus.
export function platDuVillage(state) {
  if (!cuisineDuVillage(state)) return fail('Pas de cuisine du village.');
  const p = prochainPlat(state);
  if (!p) return fail('Il n\'y a pas de quoi cuisiner au garde-manger.');
  const G = gardeManger(state), R = DATA.RECETTES[p.recette], utilise = {};
  const sortie = recipeOutput(p.recette), q = recipeOutputQty(p.recette);
  for (const x of p.prises) {
    if (x.garde) {
      const lots = lotList(G.store, x.objet);
      pullLots(lots, x.qte);
      keepLots(G.store, x.objet, lots);
    } else takeWithSilo(state, x.objet, x.qte);
    utilise[x.objet] = (utilise[x.objet] || 0) + x.qte;
  }
  if (R.eau) state.eauMl = Math.max(0, state.eauMl - R.eau * 1000);
  // (la boîte pleine de sortes : ce qu'elle n'attend pas retourne au coffre)
  faireDeLaPlace(state, G, sortie);
  const lots = lotList(G.store, sortie);
  pushLots(lots, [freshLot(sortie, q)]);
  G.store[sortie] = lots;
  noteRecipeDone(state, p.recette, q);
  noter(state, 'plats', sortie, q);
  return { ok: true, recette: p.recette, produit: { [sortie]: q }, utilise, garde: true };
}

// Ce qui manque à la cuisine du village (la fenêtre) : [{ recette, nom, manque: [objets] }] pour les recettes du menu
// qu'on ne peut pas faire aujourd'hui, et les plats qu'on peut faire ([ids]).
export function manqueCuisine(state) {
  const contenu = contenuGardeManger(state), out = { possibles: [], manquent: [] };
  for (const r of menuDuVillage(state)) {
    const L = lignesPlat(state, r, contenu);
    if (L.ok) out.possibles.push(r);
    else out.manquent.push({ recette: r, manque: L.manque });
  }
  return out;
}

/* ---------- la tablée (le soir : villageois.js) ---------- */

// La nuit, le village mange ensemble (la cuisine du village tourne) : on sert la table pour `besoin` (en énergie) au
// garde-manger, les plats d'abord, une sorte de chaque avant une seconde (la variété), puis ce qui périt le plus tôt.
// → { unites: [{ objet, energie }], plats: { objet: n } } ; les unités quittent le garde-manger.
export function servirLaTable(state, besoin) {
  const G = gardeManger(state), unites = [], plats = {};
  if (!G || !(besoin > 0)) return { unites, plats };
  let e = 0;
  const servis = {};
  for (let garde = 0; e < besoin && garde < 500; garde++) {
    let best = null;
    for (const o of Object.keys(G.store)) {
      const def = DATA.OBJETS[o], lots = lotList(G.store, o);
      if (!def || !def.mangeable || !(def.energie > 0) || lots.reduce((t, l) => t + l.qty, 0) <= 0) continue;
      const cle = [servis[o] || 0, -dishHappiness(o), lotRank(lots[0]), -def.energie, o];
      if (!best || compare(cle, best.cle) < 0) best = { o, cle };
    }
    if (!best) break;
    const lots = lotList(G.store, best.o);
    const pris = pullLots(lots, 1);
    keepLots(G.store, best.o, lots);
    servis[best.o] = (servis[best.o] || 0) + 1;
    const en = DATA.OBJETS[best.o].energie;
    unites.push({ objet: best.o, energie: en, lots: pris });
    if (dishHappiness(best.o) > 0) plats[best.o] = (plats[best.o] || 0) + 1;
    e += en;
  }
  return { unites, plats };
}

function compare(a, b) {
  for (let i = 0; i < a.length; i++) {
    if (a[i] === b[i]) continue;
    return a[i] < b[i] ? -1 : 1;
  }
  return 0;
}

// Ce qu'on n'a pas entamé revient au garde-manger (les unités de `unites` à partir de `k`).
export function desservirLaTable(state, unites, k) {
  const G = gardeManger(state);
  if (!G) return;
  for (const u of unites.slice(k)) {
    const lots = lotList(G.store, u.objet);
    pushLots(lots, u.lots && u.lots.length ? u.lots : [freshLot(u.objet, 1)]);
    G.store[u.objet] = lots;
  }
}

// La nuit note ce que le village a mangé au garde-manger (le bilan, la fenêtre).
export function noterMange(state, mange) {
  if (!gm(state)) return;
  for (const [o, n] of Object.entries(mange || {})) noter(state, 'mange', o, n);
}

/* ---------- la page, la journée, la sauvegarde ---------- */

// Ce qui change les postes de la cuisine, la table des repas : un texte.
export function signatureGardeManger(state) {
  const g = gm(state);
  if (!g) return '';
  return `${g.commun ? 1 : 0}:${(g.cuisines || []).join(',')}:${cuisineDuVillage(state) ? 1 : 0}`;
}

// La fenêtre : { commun, sorte, contenu, energie, besoin, jours, reserve, reserves, cuisines, menu, manque, aujourdhui,
// hier, posee } ; null le chantier éteint.
export function etatGardeManger(state) {
  if (!villageActif(state)) return null;
  const g = gm(state) || { commun: false, cuisines: [] };
  return {
    commun: !!g.commun, sorte: g.sorte || null, possibles: rangementsPossibles(state), actif: gardeMangerCommun(state),
    contenu: contenuGardeManger(state), energie: energieGardeManger(state), besoin: besoinDuVillage(state), jours: joursDeReserve(state),
    reserve: reserveVisee(state), reserves: GM().RESERVES || [0, 1, 2, 3, 5],
    cuisines: cuisinesDuVillage(state), cuisine: cuisineDuVillage(state), menu: menuDuVillage(state), manque: manqueCuisine(state),
    aujourdhui: journeeGardeManger(state), hier: bilanGardeManger(state, 1),
  };
}

// La sauvegarde (la migration v101 → v102) : un garde-manger lisible, sinon rien. → l'objet réparé, ou undefined.
export function reparerGardeManger(g) {
  if (!objet(g)) return undefined;
  const ok = (m) => {
    const out = {};
    if (!objet(m)) return out;
    for (const [o, n] of Object.entries(m)) if (DATA.OBJETS[o] && Number.isFinite(Number(n)) && Number(n) > 0) out[o] = Math.floor(Number(n));
    return out;
  };
  const reserve = Number.isFinite(Number(g.reserve)) ? Math.max(0, Math.min(10, Math.floor(Number(g.reserve)))) : Number(GM().RESERVE) || 0;
  const cuisines = Array.isArray(g.cuisines) ? [...new Set(g.cuisines.filter((t) => Number.isInteger(t) && t >= 0))].slice(0, Math.max(1, entier(CU().MAX) || 2)) : [];
  const journal = Array.isArray(g.journal) ? g.journal.filter((e) => objet(e) && Number.isInteger(e.jour) && e.jour >= 1)
    .map((e) => ({ jour: e.jour, depose: ok(e.depose), plats: ok(e.plats), mange: ok(e.mange) })).slice(-(Math.max(1, entier(GM().JOURNAL) || 7) + 1)) : [];
  return { commun: g.commun === true, sorte: g.sorte === 'boite' || g.sorte === 'frigo' ? g.sorte : null, reserve, cuisines, journal };
}
