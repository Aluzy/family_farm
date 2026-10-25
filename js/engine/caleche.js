import { DATA } from './catalog.js';
import { EPS } from './base.js';
import { fail, marcheFerme, marcheOuvert, NO_COINS, pay, percentCeil } from './devices.js';
import { absoluteHours } from './clock.js';
import { addLot } from './inventory.js';
import { buyItem, buyPrice, buyQuote, isBuyable, sellableCount, sellItem } from './market.js';
import { farmSeed } from './terrain.js';
import { habitantsDe } from './habitants.js';
import { genererMonde } from './monde.js';
import { elementsDuMonde } from './monde-gen.js';
import { etatCaleche, heureTournee, tourneeDuPlan, vueDeSens } from './caleche-tournee.js';

/* ---------- la calèche : le Marché qui fait le tour du monde (docs/grand-monde.md, fiche 7c) ----------

   Le Marché de la ferme est devenu une calèche. Chaque jour, elle fait le tour du monde par les chemins
   du plan (monde-gen.js : la boucle qui relie la sortie de la ferme et les hameaux, dans l'ordre de leur
   angle autour d'elle), dans le sens où ils sont reliés, et s'arrête à la ferme (la case au bout de sa
   sortie, devant son entrée) et sur la place de chaque hameau, découvert ou non. Les réglages : DATA.CALECHE
   (data/monde.json).

   La tournée (caleche-tournee.js, tourneeDuPlan : ce qui ne dépend que du plan et de l'heure, que le
   Web Worker calcule aussi) : la boucle en points (le fil des chemins, lissé comme le chemin dessiné :
   monde-sol.js), ses arrêts et l'horaire, le même chaque jour. Elle arrive à la ferme à FERME h et y reste
   ARRET_FERME h ; chaque hameau la garde ARRET h ; sa vitesse fait tenir le tour en JOURNEE heures (au moins
   VITESSE tuiles par heure). Elle dort dans le gîte : le hameau d'où elle part au plus près de DEPART h pour
   arriver à la ferme à l'heure ; elle y revient le soir, après tout le tour. Sa position se calcule à toute
   heure d'après le jour et l'heure (etatCaleche : rien n'est simulé pas à pas, on la retrouve après une
   absence) ; seules les retenues du jour la décalent : hélée en chemin (heler), ou retenue par le commerce
   (retenir), elle attend RETENUE h (RETENUE_MAX au plus par jour) et reprend sa route d'autant plus tard.

   La tournée vient du plan du monde : dans le jeu, le Web Worker du sol la tire avec les éléments
   (js/monde-worker.js) et la page la pose ici (poserTournee) ; dans Node (les tests), tourneeDuMonde la
   calcule d'après les éléments du plan (elementsDuMonde). Sans elle, la calèche n'est nulle part (pas de commerce).

   Le commerce, quand elle est arrêtée à côté du personnage (calecheIci : PORTEE cases) :
     - elle lui achète ce qui se vend, au prix de vente (market.js, sellItem : le cours du Marché gardé) ;
     - elle lui vend les semences (market.js, buyItem : leur prix qui monte à chaque achat) et ce que son
       coffre porte (achat de la réserve des hameaux), à VENTE % du prix de vente ; rien d'autre.
   À chaque hameau où elle s'arrête (majCaleche, d'après l'heure), elle achète sa réserve (habitants.js :
   PRIS au plus de chaque objet, la place de son coffre, COFFRE_MAX de chacun) à ACHAT_HAMEAU % du prix de
   vente : l'argent va aux bourses des foyers. Chaque matin, elle a vendu en route tout sauf GARDE % de son
   coffre.

   state.caleche = { coffre: { objet: n }, haltes: [{ debut, fin }] (les retenues du jour, en heures
     absolues : absoluteHours), fait (l'heure absolue jusqu'où les arrêts sont faits ; null : pas encore),
     jour: { jour, vendu, achete } (les pièces gagnées et dépensées avec elle aujourd'hui) }.
   Chaque hameau peuplé garde son dernier passage : habitants[id].caleche = { jour, achats, pieces }. */

export const CALECHE = DATA.CALECHE;

/* ---------- la tournée (caleche-tournee.js : le tour, la position à toute heure) ---------- */

export { etatCaleche, heureTournee, tourneeDuPlan, vueDeSens };

// La tournée du monde de la graine, d'après les éléments de son plan (elementsDuMonde : quelques
// centaines de ms ; les tests). Le jeu la reçoit du Web Worker (poserTournee).
export function tourneeDuMonde(graine) {
  const g = String(graine);
  if (tournees.has(g)) return tournees.get(g);
  const cadre = genererMonde(g).terrain.MONDE.cadre, el = elementsDuMonde(g, cadre);
  return poserTournee(g, tourneeDuPlan({ W: cadre.LARGEUR, chemins: el.chemins, hameaux: el.lieux.hameaux, sortie: cadre.SORTIE, ferme: cadre.FERME }));
}

// Les tournées connues, par graine (une partie n'en a qu'une).
const tournees = new Map();
export function poserTournee(graine, tour) {
  if (!tour || !tour.arrets) return null;
  tournees.set(String(graine), tour);
  while (tournees.size > 3) tournees.delete(tournees.keys().next().value);
  return tour;
}

// La tournée de la partie, ou null (pas encore là).
export function tourneeDe(state) {
  const g = farmSeed(state);
  return g === null ? null : tournees.get(g) || null;
}

/* ---------- où elle est ---------- */

function calecheDe(state) {
  if (!state.caleche || typeof state.caleche !== 'object') state.caleche = nouvelleCaleche();
  const c = state.caleche;
  if (!c.coffre || typeof c.coffre !== 'object') c.coffre = {};
  if (!Array.isArray(c.haltes)) c.haltes = [];
  return c;
}

export function nouvelleCaleche() {
  return { coffre: {}, haltes: [], fait: null, jour: null };
}

// Où est la calèche maintenant (null : sans tournée).
export function calecheMaintenant(state) {
  const tour = tourneeDe(state);
  return tour ? etatCaleche(tour, absoluteHours(state), (state.caleche && state.caleche.haltes) || []) : null;
}

// La distance (en tuiles) de la case `ou` du personnage à la calèche `e` (etatCaleche).
function distanceA(tour, e, ou) {
  if (!Number.isInteger(ou)) return Infinity;
  const W = tour.W;
  return Math.hypot((ou % W) + 0.5 - e.x, Math.floor(ou / W) + 0.5 - e.y);
}

// Peut-on commercer avec elle, le personnage sur la case `ou` ? { ok, raison, e (etatCaleche), dist }.
export function calecheIci(state, ou) {
  if (!marcheOuvert(state)) return { ok: false, raison: marcheFerme(state), e: null, dist: Infinity };
  const tour = tourneeDe(state);
  if (!tour) return { ok: false, raison: 'La calèche est encore loin sur les chemins.', e: null, dist: Infinity };
  const e = etatCaleche(tour, absoluteHours(state), calecheDe(state).haltes);
  const dist = distanceA(tour, e, ou);
  // (hélée, le cocher attend celui qui l'a hélée : d'aussi loin qu'on la hèle)
  if (dist > (e.etat === 'halte' ? CALECHE.HELER : CALECHE.PORTEE) + EPS) return { ok: false, raison: `La calèche n'est pas là. ${ouEstCaleche(state, e)}`, e, dist };
  if (e.etat === 'gite') return { ok: false, raison: `Le cocher dort : la calèche repart vers ${heureTexte(CALECHE.FERME + tour.matin)}.`, e, dist };
  if (e.etat === 'route') return { ok: false, raison: 'La calèche roule : hèle-la pour qu\'elle s\'arrête.', e, dist };
  return { ok: true, e, dist };
}

// Peut-on la héler, le personnage sur la case `ou` ? { ok, raison, e, dist } (déjà arrêtée : ok).
export function helable(state, ou) {
  const tour = tourneeDe(state);
  if (!tour) return { ok: false, raison: 'La calèche est loin.', e: null, dist: Infinity };
  const e = etatCaleche(tour, absoluteHours(state), calecheDe(state).haltes);
  const dist = distanceA(tour, e, ou);
  if (dist > CALECHE.HELER + EPS) return { ok: false, raison: 'La calèche est trop loin pour t\'entendre.', e, dist };
  if (e.etat === 'gite') return { ok: false, raison: 'Le cocher dort.', e, dist };
  return { ok: true, e, dist };
}

// Ajoute (ou prolonge) une retenue : la calèche attend jusqu'à H + RETENUE au moins, dans la limite de
// RETENUE_MAX heures par jour. → les heures ajoutées.
function retenue(state, H) {
  const c = calecheDe(state), C = CALECHE, j0 = Math.floor(H / 24) * 24;
  c.haltes = c.haltes.filter((h) => h.debut >= j0);
  const deja = c.haltes.reduce((s, h) => s + (h.fin - h.debut), 0);
  const reste = Math.max(0, C.RETENUE_MAX - deja);
  if (reste <= EPS) return 0;
  const cur = c.haltes.find((h) => h.debut <= H + EPS && H < h.fin + EPS);
  if (cur) {
    const plus = Math.min(reste, Math.max(0, H + C.RETENUE - cur.fin));
    cur.fin += plus;
    return plus;
  }
  const plus = Math.min(reste, C.RETENUE);
  c.haltes.push({ debut: H, fin: H + plus });
  return plus;
}

// Héler la calèche, le personnage sur la case `ou` : elle s'arrête RETENUE h (déjà arrêtée : rien).
export function heler(state, ou) {
  const h = helable(state, ou);
  if (!h.ok) return fail(h.raison);
  if (h.e.etat !== 'route') return { ok: true, deja: true, e: h.e };
  const plus = retenue(state, absoluteHours(state));
  if (plus <= 0) return fail('Le cocher est pressé : il a déjà trop attendu aujourd\'hui.');
  return { ok: true, deja: false, e: etatCaleche(tourneeDe(state), absoluteHours(state), calecheDe(state).haltes) };
}

// Le commerce la retient : arrêtée près du personnage, elle attend encore RETENUE h (dans la limite du
// jour). → vrai si elle attend.
export function retenir(state, ou) {
  const ici = calecheIci(state, ou);
  if (!ici.ok) return false;
  return retenue(state, absoluteHours(state)) > 0 || ici.e.etat !== 'route';
}

/* ---------- l'horaire, en mots ---------- */

export function heureTexte(h) {
  const x = ((h % 24) + 24) % 24, hh = Math.floor(x + EPS), mm = Math.round((x - hh) * 60 / 15) * 15;
  return mm >= 60 ? `${hh + 1} h` : mm ? `${hh} h ${String(mm).padStart(2, '0')}` : `${hh} h`;
}

// « La calèche passe à la ferme vers 10 h et y reste une heure. »
export function horaireCaleche() {
  const C = CALECHE;
  const reste = C.ARRET_FERME === 1 ? 'une heure' : `${String(C.ARRET_FERME).replace('.', ',')} h`;
  return `La calèche passe à la ferme vers ${heureTexte(C.FERME)} et y reste ${reste}.`;
}

// Le nom d'un arrêt pour le joueur : la ferme, un hameau vu, ou « un hameau que tu ne connais pas ».
function nomArret(state, a) {
  if (!a) return 'un hameau';
  if (a.sorte === 'ferme') return 'la ferme';
  const vu = state.monde && state.monde.hameaux && state.monde.hameaux[a.id];
  return vu ? (vu.nom || a.nom) : null;
}
// (« à » devant le nom d'un hameau : aux Saules, au Gué, à la Combe, à l'Orée, à Brévans)
function aNom(nom) {
  const m = /^(Les|Le|La|L')\s?(.*)$/.exec(nom);
  if (!m) return `à ${nom}`;
  return { Les: 'aux ', Le: 'au ', La: 'à la ', "L'": 'à l\'' }[m[1]] + m[2];
}
const aLieu = (nom) => (nom === 'la ferme' ? 'à la ferme' : nom ? aNom(nom) : 'dans un hameau que tu ne connais pas encore');
const versLieu = (nom) => (nom === 'la ferme' ? 'vers la ferme' : nom ? `vers ${nom}` : 'vers un hameau que tu ne connais pas encore');

// Où est la calèche, en mots (`e` : etatCaleche, sinon maintenant) : « Elle est arrêtée aux Saules. »
export function ouEstCaleche(state, e = calecheMaintenant(state)) {
  if (!e) return 'Elle est quelque part sur les chemins du monde.';
  if (e.etat === 'gite') return `Elle dort ${aLieu(nomArret(state, e.arret))}.`;
  if (e.etat === 'arret') return `Elle est arrêtée ${aLieu(nomArret(state, e.arret))}.`;
  if (e.etat === 'halte') return 'Elle attend sur le chemin, hélée par un passant.';
  return `Elle roule ${versLieu(nomArret(state, e.vers))}.`;
}

// Quand repasse-t-elle à la ferme (en mots) : « aujourd'hui vers 10 h », « elle y est », « demain vers 10 h ».
export function prochainPassage(state) {
  const tour = tourneeDe(state);
  const H = absoluteHours(state), j0 = Math.floor(H / 24) * 24;
  const e = calecheMaintenant(state);
  if (e && e.etat === 'arret' && e.arret.sorte === 'ferme') return 'Elle est à la ferme en ce moment.';
  const t = tour ? heureTournee(state.caleche ? state.caleche.haltes : [], H) : H - j0 - CALECHE.FERME;
  return t < 0 ? `Elle passe à la ferme aujourd'hui vers ${heureTexte(CALECHE.FERME)}.` : `Elle repasse à la ferme demain vers ${heureTexte(CALECHE.FERME)}.`;
}

/* ---------- les arrêts : la réserve des hameaux ---------- */

const prixHameau = (item) => Math.max(1, Math.floor((DATA.OBJETS[item].prix * CALECHE.ACHAT_HAMEAU) / 100));
export function prixCoffre(item) {
  return percentCeil(DATA.OBJETS[item].prix, CALECHE.VENTE);
}

// La calèche s'arrête au hameau `id` (le jour `jour`) : elle achète sa réserve et paie ses foyers.
// → { achats: { objet: n }, pieces } ou null (pas peuplé).
export function acheterReserve(state, id, jour = state.day) {
  const h = habitantsDe(state)[id];
  if (!h || !h.reserve || typeof h.reserve !== 'object') return null;
  const c = calecheDe(state), C = CALECHE, achats = {};
  let pieces = 0;
  for (const item of Object.keys(h.reserve).sort()) {
    const def = DATA.OBJETS[item], n = Math.floor(h.reserve[item] || 0);
    if (!def || def.invendable || def.retire || !(def.prix > 0) || n <= 0) continue;
    const k = Math.min(n, C.PRIS, C.COFFRE_MAX - (c.coffre[item] || 0));
    if (k <= 0) continue;
    h.reserve[item] = n - k;
    if (!h.reserve[item]) delete h.reserve[item];
    c.coffre[item] = (c.coffre[item] || 0) + k;
    achats[item] = k;
    pieces += k * prixHameau(item);
  }
  // l'argent aux bourses des foyers, en parts égales (le reste aux premiers)
  const F = (h.foyers || []).filter((f) => f && typeof f === 'object');
  if (F.length && pieces) {
    const part = Math.floor(pieces / F.length);
    F.forEach((f, k) => { f.bourse = (Number(f.bourse) || 0) + part + (k < pieces - part * F.length ? 1 : 0); });
  }
  h.caleche = { jour, achats, pieces };
  return { achats, pieces };
}

// Le coffre au petit matin : elle a vendu en route tout sauf GARDE %.
function ecoule(c) {
  for (const item of Object.keys(c.coffre)) {
    const n = Math.floor((c.coffre[item] * CALECHE.GARDE) / 100);
    if (n > 0) c.coffre[item] = n; else delete c.coffre[item];
  }
}

// Les arrêts passés depuis la dernière fois (d'après l'heure : jusqu'à `H`) : à chaque hameau, la
// réserve achetée ; chaque jour nouveau, le coffre écoulé. Au plus RATTRAPAGE jours. → [{ id, jour,
// achats, pieces }] (les arrêts faits).
export function majCaleche(state, H = absoluteHours(state)) {
  const tour = tourneeDe(state);
  if (!tour || !state || !state.monde) return [];
  const c = calecheDe(state), C = CALECHE, out = [];
  if (!(typeof c.fait === 'number' && Number.isFinite(c.fait))) { c.fait = H; return out; }
  if (H <= c.fait) return out;
  let fait = Math.max(c.fait, H - C.RATTRAPAGE * 24);
  for (let j = Math.floor(fait / 24); j <= Math.floor(H / 24); j++) {
    const j0 = j * 24;
    if (j0 > c.fait) ecoule(c);
    // (la journée de j : jusqu'à minuit exclu, l'heure de la tournée ne repasse pas au lendemain)
    const de = Math.max(fait, j0), a = Math.min(H, j0 + 24 - 1e-9);
    if (a <= de) continue;
    const t1 = heureTournee(c.haltes, de), t2 = heureTournee(c.haltes, a);
    // (au gîte la nuit, avant le départ du matin : rien ; l'heure de chaque hameau dans la journée)
    for (let n = 1; n < tour.arrets.length; n++) {
      const o = tour.arrets[n], tt = o.arrivee <= tour.soir ? o.arrivee : o.arrivee - tour.D;
      if (tt > t1 && tt <= t2 && tt >= tour.matin - EPS) {
        const r = acheterReserve(state, o.id, j + 1);
        if (r) out.push({ id: o.id, jour: j + 1, ...r });
      }
    }
    fait = a;
  }
  c.fait = H;
  return out;
}

/* ---------- le commerce avec le joueur ---------- */

function jourDe(state) {
  const c = calecheDe(state);
  if (!c.jour || c.jour.jour !== state.day) c.jour = { jour: state.day, vendu: 0, achete: 0 };
  return c.jour;
}

// Ce que la calèche vend : [{ item, sorte: 'semence' | 'coffre', prix (la prochaine unité), stock (null :
// sans limite) }], les semences d'abord. `enVente(item)` : une semence en vente (sa culture débloquée).
export function etalCaleche(state, enVente = () => true) {
  const out = [];
  for (const item of Object.keys(DATA.OBJETS)) if (isBuyable(item) && enVente(item)) out.push({ item, sorte: 'semence', prix: buyPrice(state, item), stock: null });
  const c = calecheDe(state);
  for (const item of Object.keys(c.coffre).sort()) if (c.coffre[item] > 0 && DATA.OBJETS[item]) out.push({ item, sorte: 'coffre', prix: prixCoffre(item), stock: c.coffre[item] });
  return out;
}

// Devis d'un achat au coffre ou de semences : { quantite, cout }.
export function devisCaleche(state, item, qty = 1) {
  if (isBuyable(item)) return buyQuote(state, item, qty);
  const n = Math.min(Math.max(0, Math.floor(Number(qty)) || 0), (state.caleche && state.caleche.coffre && state.caleche.coffre[item]) || 0);
  if (!DATA.OBJETS[item] || n <= 0) return { quantite: 0, cout: 0 };
  const p = prixCoffre(item), k = Math.min(n, Math.floor((state.pieces + EPS) / p));
  return { quantite: k, cout: k * p };
}

// Le joueur (sur la case `ou`) lui achète `qty` unités : une semence (son cours), ou ce que porte son
// coffre (à VENTE %). Rien d'autre ne se vend. `o.sansPresence` : la simulation (le joueur simulé la
// retrouve à la ferme chaque matin).
export function acheterCaleche(state, item, qty = 1, ou = null, o = {}) {
  const def = DATA.OBJETS[item];
  if (!def) return fail('Objet inconnu.');
  if (!o.sansPresence) { const ici = calecheIci(state, ou); if (!ici.ok) return fail(ici.raison); }
  const J = jourDe(state);
  if (isBuyable(item)) {
    const r = buyItem(state, item, qty);
    if (r.ok) { J.achete += r.cost; if (!o.sansPresence) retenir(state, ou); }
    return r;
  }
  const c = calecheDe(state), stock = c.coffre[item] || 0;
  if (stock <= 0) return fail(`La calèche ne vend pas ${def.nom.toLowerCase()} : seulement des semences et ce qu'elle achète aux hameaux.`);
  const p = prixCoffre(item);
  let bought = 0;
  for (let i = 0; i < Math.min(stock, Math.max(1, Math.floor(Number(qty)) || 1)); i++) {
    if (!pay(state, p, `Calèche : ${def.nom}`)) break;
    addLot(state, item, 1, DATA.ORIGINE.ACHETE);
    bought += 1;
  }
  if (!bought) return fail(NO_COINS);
  c.coffre[item] = stock - bought;
  if (!c.coffre[item]) delete c.coffre[item];
  J.achete += bought * p;
  if (!o.sansPresence) retenir(state, ou);
  return { ok: true, bought, cost: bought * p };
}

// Le joueur (sur la case `ou`) lui vend `qty` unités de `item` (au prix de vente : market.js).
export function vendreCaleche(state, item, qty, ou = null, o = {}) {
  if (!o.sansPresence) { const ici = calecheIci(state, ou); if (!ici.ok) return fail(ici.raison); }
  const r = sellItem(state, item, qty);
  if (r.ok) { jourDe(state).vendu += r.gain; if (!o.sansPresence) retenir(state, ou); }
  return r;
}

// Ce que le joueur peut lui vendre : [item] (ce qui se vend et qu'il a).
export function vendablesCaleche(state) {
  return Object.keys(DATA.OBJETS).filter((k) => !DATA.OBJETS[k].invendable && Math.floor(sellableCount(state, k) + EPS) >= 1);
}
