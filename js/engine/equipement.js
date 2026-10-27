import { DATA } from './catalog.js';
import { fail } from './devices.js';
import { addItem, countItem, keepLots, lotList, lotRank, lotsOf, pullLots, pushLots, takeItem } from './inventory.js';
import { farmTerrain } from './terrain.js';
import { clockHours, nightActive } from './clock.js';

/* ---------- fiche 11 : l'équipement de la famille et le sac à provisions ----------

   Chaque membre de la famille a sa fiche (js/ui/fiche-membre.js) et EQUIPEMENT.CASES cases
   d'équipement (data/equipement.json). Une pièce (EQUIPEMENT.PIECES : un objet de l'inventaire,
   fabriqué à l'Atelier) a sa place (la tête, le corps, les mains, les pieds) : un membre ne porte
   qu'une pièce par place, et un enfant seulement celles qui existent en taille enfant. Équiper
   prend la pièce dans l'inventaire ; retirer l'y rend : une pièce portée n'est pas dans
   l'inventaire, elle ne se vend donc pas.

   Ce qu'elle fait (modeste) vaut pour le personnage principal : moins d'énergie pour certains
   gestes (economiePct, lue par stamina.js actionCost), plus de lumière dans les grottes
   (lumiereGrotte), plus loin la nuit dans le grand monde (vueNuitPct, monde-vu.js voirAutour), plus
   vite à pied dans certains biomes (vitessePied). Pour un autre membre, ce qu'il fait de lui-même :
   moins de faim quand il marche (faimMarchePct) et quand il aide (faimAidePct, repas.js).

   Le personnage principal a une quatrième case : le sac à provisions (EQUIPEMENT.SACS : un sac de
   N portions). Il se remplit à la ferme, d'aliments de l'inventaire ou du réfrigérateur ; ce qu'il
   contient périme comme l'inventaire (inventory.js spoil). Loin de la ferme (en expédition :
   enExpedition, la case du personnage hors de la ferme), il ne mange que ce qu'il y a dans son sac
   (family.js eatSnack) ; sur la ferme, rien ne change.

   state.equipement = { membres: { <id>: [pièce | null, …] (CASES cases) }, sac: null |
   { objet, items: { item: [lots] } } } (format 60 ; une partie d'avant : personne n'est équipé,
   pas de sac). */

const E = () => DATA.EQUIPEMENT;

export function pieceDef(item) {
  return (E().PIECES && E().PIECES[item]) || null;
}

export function sacDef(item) {
  return (E().SACS && E().SACS[item]) || null;
}

// Les pièces d'équipement (sans les sacs), dans l'ordre des données.
export function piecesEquipement() {
  return Object.keys(E().PIECES || {});
}

export function estEquipement(item) {
  return !!(pieceDef(item) || sacDef(item));
}

export function nouvelEquipement() {
  return { membres: {}, sac: null };
}

// L'équipement de la partie, réparé s'il le faut (un champ manquant, une case de trop).
export function equipementDe(state) {
  let q = state.equipement;
  if (!q || typeof q !== 'object' || Array.isArray(q)) q = state.equipement = nouvelEquipement();
  if (!q.membres || typeof q.membres !== 'object' || Array.isArray(q.membres)) q.membres = {};
  if (q.sac !== null && (!q.sac || typeof q.sac !== 'object' || !sacDef(q.sac.objet))) q.sac = null;
  if (q.sac && (!q.sac.items || typeof q.sac.items !== 'object' || Array.isArray(q.sac.items))) q.sac.items = {};
  return q;
}

function membre(state, id) {
  return ((state.famille && state.famille.membres) || []).find((m) => m.id === id) || null;
}

// Le personnage principal (comme depart.js mainCharacter, sans l'importer : pas de cycle).
function principal(state) {
  const f = state.famille || {};
  const ms = f.membres || [];
  return ms.find((m) => m.id === f.principal) || ms.find((m) => !m.enfant) || ms[0] || null;
}

// Les cases du membre `id` : CASES valeurs (une pièce ou null).
export function casesMembre(state, id) {
  const q = equipementDe(state), n = E().CASES;
  const c = Array.isArray(q.membres[id]) ? q.membres[id] : [];
  return Array.from({ length: n }, (_, k) => (pieceDef(c[k]) ? c[k] : null));
}

// Les pièces que porte le membre `id`.
export function piecesPortees(state, id) {
  return casesMembre(state, id).filter(Boolean);
}

// Le membre `id` porte-t-il `item` ?
export function porte(state, id, item) {
  return piecesPortees(state, id).includes(item);
}

function ecrireCases(state, id, cases) {
  const q = equipementDe(state);
  if (cases.some(Boolean)) q.membres[id] = cases;
  else delete q.membres[id];
}

// Pourquoi le membre ne peut pas porter `item` (un texte), ou '' s'il le peut. `ignorer` : une
// case qu'on remplace (sa place est libre).
export function refusPiece(state, id, item, ignorer = -1) {
  const m = membre(state, id), p = pieceDef(item);
  if (!m) return 'Membre introuvable.';
  if (!p) return 'Ce n\'est pas une pièce d\'équipement.';
  if (m.enfant && !p.enfant) return `${DATA.OBJETS[item].nom} : pas de taille enfant.`;
  const cases = casesMembre(state, id);
  const prise = cases.findIndex((x, k) => k !== ignorer && x && pieceDef(x).place === p.place);
  if (prise >= 0) return cases[prise] === item ? `Il ou elle porte déjà : ${DATA.OBJETS[item].nom.toLowerCase()}.` : `${E().PLACES[p.place]} : déjà ${DATA.OBJETS[cases[prise]].nom.toLowerCase()}.`;
  return '';
}

// Ce qu'on peut mettre au membre `id` dans la case `k` (vide) : [{ item, n, refus }] pour chaque
// pièce de l'inventaire ; refus : '' si elle lui va.
export function choixPieces(state, id, k = -1) {
  return piecesEquipement().filter((item) => countItem(state, item) > 0)
    .map((item) => ({ item, n: countItem(state, item), refus: refusPiece(state, id, item, k) }));
}

// Met `item` (de l'inventaire) au membre `id`, dans la case `k` (la première libre sinon).
export function equiper(state, id, item, k = -1) {
  const p = pieceDef(item);
  if (!p) return fail('Ce n\'est pas une pièce d\'équipement.');
  if (!membre(state, id)) return fail('Membre introuvable.');
  if (countItem(state, item) < 1) return fail(`Plus de ${DATA.OBJETS[item].nom.toLowerCase()} dans l'inventaire.`);
  const cases = casesMembre(state, id);
  const ou = Number.isInteger(k) && k >= 0 && k < cases.length ? k : cases.indexOf(null);
  if (ou < 0) return fail('Ses cases sont pleines : retire d\'abord une pièce.');
  if (cases[ou]) return fail('Cette case est déjà prise : touche-la pour retirer la pièce.');
  const refus = refusPiece(state, id, item);
  if (refus) return fail(refus);
  takeItem(state, item, 1);
  cases[ou] = item;
  ecrireCases(state, id, cases);
  return { ok: true, item, case: ou };
}

// Retire la pièce de la case `k` du membre `id` : elle revient dans l'inventaire.
export function retirerPiece(state, id, k) {
  const cases = casesMembre(state, id);
  const item = cases[k];
  if (!item) return fail('Cette case est vide.');
  cases[k] = null;
  ecrireCases(state, id, cases);
  addItem(state, item, 1);
  return { ok: true, item, case: k };
}

// Un membre quitte la famille : ses pièces reviennent dans l'inventaire.
export function rendreEquipement(state, id) {
  const rendu = piecesPortees(state, id);
  for (const item of rendu) addItem(state, item, 1);
  delete equipementDe(state).membres[id];
  return rendu;
}

/* -- les effets -- */

// Les pièces que porte le personnage principal.
function piecesPrincipal(state) {
  const p = principal(state);
  return p ? piecesPortees(state, p.id) : [];
}

// Le personnage est-il loin de la ferme (sa case, state.monde.ici, que la carte donne à chaque pas,
// hors du rectangle de la ferme) ? Comme didacticiel.js horsDeLaFerme.
export function enExpedition(state) {
  const t = state.monde && state.monde.ici;
  if (!Number.isInteger(t)) return false;
  const T = farmTerrain(state), F = T.FERME;
  if (!F) return false;
  const c = t % T.LARGEUR, r = Math.floor(t / T.LARGEUR);
  return c < F.X || r < F.Y || c >= F.X + F.LARGEUR || r >= F.Y + F.HAUTEUR;
}

// Le soleil (pour le chapeau) : de jour, entre ces heures.
function auSoleil(state, [de, a]) {
  if (nightActive(state)) return false;
  const h = clockHours(state);
  return h >= de && h < a;
}

// La pièce `item` fait-elle son économie maintenant (soleil, loin de la ferme) ?
function economieActive(state, p) {
  if (p.soleil && !auSoleil(state, p.soleil)) return false;
  if (p.horsFerme && !enExpedition(state)) return false;
  return true;
}

// Ce que l'équipement du personnage principal laisse du coût de `action` (en %, 100 sans rien),
// les économies multipliées entre elles.
export function economiePct(state, action) {
  let pct = 100;
  for (const item of piecesPrincipal(state)) {
    const p = pieceDef(item);
    if (!economieActive(state, p)) continue;
    const e = (p.economie && p.economie[action]) || 0;
    if (e) pct = (pct * (100 - e)) / 100;
    if (p.toutes) pct = (pct * (100 - p.toutes)) / 100;
  }
  return pct;
}

// La lumière autour du personnage dans la mine et les grottes (en %, 100 sans casque).
export function lumiereGrotte(state) {
  return piecesPrincipal(state).reduce((f, item) => (pieceDef(item).grotte ? (f * pieceDef(item).grotte) / 100 : f), 100);
}

// Le rayon de vue la nuit dans le grand monde (en %, 100 sans rien).
export function vueNuitPct(state) {
  return piecesPrincipal(state).reduce((f, item) => (pieceDef(item).vueNuit ? (f * pieceDef(item).vueNuit) / 100 : f), 100);
}

// Combien de fois plus vite il marche à pied dans le biome `biome` (1 sans rien).
export function vitessePied(state, biome) {
  if (!biome) return 1;
  return piecesPrincipal(state).reduce((f, item) => {
    const v = pieceDef(item).pied && pieceDef(item).pied[biome];
    return v ? (f * v) / 100 : f;
  }, 1);
}

// La faim d'un membre (pas le principal) qui marche ou qui aide, en % (100 sans rien).
function faimPct(state, id, cle) {
  return piecesPortees(state, id).reduce((f, item) => (pieceDef(item)[cle] ? (f * (100 - pieceDef(item)[cle])) / 100 : f), 100);
}
export function faimMarchePct(state, id) {
  return faimPct(state, id, 'faimMarche');
}
export function faimAidePct(state, id) {
  return faimPct(state, id, 'faimAide');
}

/* -- le sac à provisions -- */

// Le sac porté (son objet), ou null.
export function sacPorte(state) {
  const s = equipementDe(state).sac;
  return s ? s.objet : null;
}

export function sacItems(state) {
  const s = equipementDe(state).sac;
  return s ? s.items : {};
}

export function sacCount(state, item) {
  return lotList(sacItems(state), item).reduce((t, l) => t + l.qty, 0);
}

// Ce que contient le sac : { item: quantité }.
export function sacCounts(state) {
  const out = {};
  for (const item of Object.keys(sacItems(state))) {
    const n = sacCount(state, item);
    if (n > 0) out[item] = n;
  }
  return out;
}

// Les portions dans le sac, et combien il en tient (0 sans sac).
export function portionsSac(state) {
  return Object.values(sacCounts(state)).reduce((t, n) => t + n, 0);
}
export function capaciteSac(state) {
  const s = sacPorte(state);
  return s ? sacDef(s).portions : 0;
}

// Les sacs de l'inventaire : [{ item, n }].
export function sacsDisponibles(state) {
  return Object.keys(E().SACS || {}).filter((item) => countItem(state, item) > 0).map((item) => ({ item, n: countItem(state, item) }));
}

// Met le sac `item` (de l'inventaire) dans la case du sac ; un autre sac porté revient dans
// l'inventaire, et ce qu'il contenait passe dans le nouveau (ce qui n'y tient pas va à l'inventaire).
export function poserSac(state, item) {
  if (!sacDef(item)) return fail('Ce n\'est pas un sac à provisions.');
  if (countItem(state, item) < 1) return fail(`Plus de ${DATA.OBJETS[item].nom.toLowerCase()} dans l'inventaire.`);
  const q = equipementDe(state);
  const avant = q.sac;
  takeItem(state, item, 1);
  q.sac = { objet: item, items: {} };
  if (avant) {
    addItem(state, avant.objet, 1);
    let place = sacDef(item).portions;
    for (const it of Object.keys(avant.items).sort()) {
      const lots = lotList(avant.items, it);
      const garde = pullLots(lots, place);
      place -= garde.reduce((t, l) => t + l.qty, 0);
      if (garde.length) { const l = []; pushLots(l, garde); q.sac.items[it] = l; }
      const reste = lots.filter((l) => l.qty > 0);
      if (reste.length) { const inv = lotsOf(state, it); pushLots(inv, reste); state.inventaire[it] = inv; }
    }
  }
  return { ok: true, item, remplace: avant ? avant.objet : null };
}

// Le sac revient dans l'inventaire, et ce qu'il contient aussi.
export function retirerSac(state) {
  const q = equipementDe(state);
  if (!q.sac) return fail('Tu ne portes pas de sac.');
  const contenu = sacCounts(state);
  for (const it of Object.keys(contenu)) reprendreSac(state, it, contenu[it]);
  addItem(state, q.sac.objet, 1);
  const objet = q.sac.objet;
  q.sac = null;
  return { ok: true, item: objet, contenu };
}

// Combien d'unités de `item` peuvent encore entrer dans le sac.
export function placeSac(state, item) {
  const def = DATA.OBJETS[item];
  if (!def || !def.mangeable || !sacPorte(state)) return 0;
  return Math.max(0, capaciteSac(state) - portionsSac(state));
}

// Le rangement d'où l'on remplit le sac : l'inventaire, ou le réfrigérateur construit.
function rangement(state, source) {
  if (source === 'frigo') return state.frigo && state.frigo.construit ? state.frigo.items : null;
  return state.inventaire;
}

// Met `qty` unités de `item` dans le sac (les plus anciennes d'abord), depuis l'inventaire
// ('inventaire') ou le réfrigérateur ('frigo'). Le sac se remplit à la ferme.
export function remplirSac(state, item, qty = 1, source = 'inventaire') {
  const def = DATA.OBJETS[item];
  if (!sacPorte(state)) return fail('Mets d\'abord un sac dans la quatrième case.');
  if (!def || !def.mangeable) return fail('Seuls les aliments vont dans le sac.');
  if (enExpedition(state)) return fail('Le sac se remplit à la ferme.');
  const store = rangement(state, source);
  if (!store) return fail('Pas de réfrigérateur.');
  const dispo = lotList(store, item).reduce((t, l) => t + l.qty, 0);
  if (!dispo) return fail(`Plus de ${def.nom.toLowerCase()} ${source === 'frigo' ? 'au réfrigérateur' : 'dans l\'inventaire'}.`);
  const place = placeSac(state, item);
  if (!place) return fail(`Le sac est plein : ${capaciteSac(state)} portions.`);
  const n = Math.min(place, dispo, Math.max(1, Math.floor(Number(qty) || 1)));
  const lots = lotList(store, item);
  const pulled = pullLots(lots, n);
  keepLots(store, item, lots);
  const dedans = lotList(sacItems(state), item);
  pushLots(dedans, pulled);
  sacItems(state)[item] = dedans;
  return { ok: true, moved: n, item, portions: portionsSac(state) };
}

// Reprend `qty` unités de `item` du sac dans l'inventaire.
export function reprendreSac(state, item, qty = 1) {
  const n = Math.min(sacCount(state, item), Math.max(1, Math.floor(Number(qty) || 1)));
  if (!(n > 0)) return fail('Il n\'y en a pas dans le sac.');
  const lots = lotList(sacItems(state), item);
  const pulled = pullLots(lots, n);
  keepLots(sacItems(state), item, lots);
  const inv = lotsOf(state, item);
  pushLots(inv, pulled);
  state.inventaire[item] = inv;
  return { ok: true, moved: n, item };
}

// Prend une portion de `item` dans le sac (pour la manger) ; renvoie 1, ou 0 s'il n'y en a pas.
export function prendreDuSac(state, item) {
  if (!sacCount(state, item)) return 0;
  const lots = lotList(sacItems(state), item);
  pullLots(lots, 1);
  keepLots(sacItems(state), item, lots);
  return 1;
}

// L'aliment du sac à manger d'abord : celui qui périt le plus tôt, puis le plus nourrissant.
export function premierDuSac(state) {
  const items = Object.keys(sacCounts(state));
  const rang = (it) => lotRank(lotList(sacItems(state), it)[0] || { nightsLeft: null });
  items.sort((a, b) => rang(a) - rang(b) || (DATA.OBJETS[b].energie || 0) - (DATA.OBJETS[a].energie || 0) || (a < b ? -1 : 1));
  return items[0] || null;
}

/* -- les alertes de l'expédition -- */

// En sortant de la ferme : un texte si le sac manque, est vide ou presque ; sinon ''.
export function alerteSortie(state) {
  const A = E().ALERTE;
  if (!sacPorte(state)) return 'Tu pars sans sac à provisions : loin de la ferme, tu ne pourras rien manger.';
  const n = portionsSac(state);
  if (n === 0) return 'Ton sac à provisions est vide : loin de la ferme, tu ne pourras rien manger.';
  if (n <= A.PRESQUE_VIDE) return `Ton sac à provisions est presque vide (${n} portion${n > 1 ? 's' : ''}).`;
  return '';
}

// Loin de la ferme, le sac vide et l'énergie basse (sous ALERTE.ENERGIE) : il faut rentrer.
export function alerteFaim(state) {
  if (!enExpedition(state) || portionsSac(state) > 0) return false;
  return Math.floor((Number(state.energie) || 0) / 1000) < E().ALERTE.ENERGIE;
}

/* -- le didacticiel -- */

// Le premier sac (DIDACTICIEL.SAC) : offert, déjà porté, avec ses provisions ; rien s'il y en a déjà un.
export function offrirSac(state) {
  const S = DATA.DIDACTICIEL && DATA.DIDACTICIEL.SAC;
  if (!S) return false;
  const q = equipementDe(state);
  if (q.sac) return false;
  q.sac = { objet: S.objet, items: {} };
  for (const [item, n] of Object.entries(S.provisions || {})) {
    addItem(state, item, n);
    const lots = lotsOf(state, item);
    const pulled = pullLots(lots, n);
    keepLots(state.inventaire, item, lots);
    const l = [];
    pushLots(l, pulled);
    q.sac.items[item] = l;
  }
  return true;
}
