/* ==========================================================================
   Le port sur l'île (docs/ile.md, fiche I1a). Avec l'abri, le seul bâtiment de l'île au début d'une
   partie : un quai sur la mer, une cale, une halle ouverte, au bout de l'île, relié à la sortie de la
   ferme par un chemin. Les réglages : data/village.json (PORT).
   - Le plan le place (js/engine/monde-gen.js, elementsDuMonde : lieux.port, après les autres lieux, qui ne
     bougent pas), quand le cadre du monde porte PORT : le niveau du port (js/engine/monde.js, genererMonde ;
     terrain.js farmTerrain le demande pour une partie où le chantier est allumé).
   - Le bâti se fait avec les hameaux (js/engine/monde-hameaux.js, planPort : le quai, la halle et son toit,
     ses objets ; ce qui ferme et ce qui s'ouvre à la marche, ce qui est réservé), ses dessins à la suite des
     leurs (scripts/carte/port.py) ; la scène l'anime (js/carte/ferme/hameaux.js : les lanternes le soir).
   - Il est connu dès le départ : la carte du monde le montre, son chemin aussi, et la boussole y mène
     (js/engine/monde-vu.js, lieuxDeLaCarte).
   Les niveaux se paient (fiche I1c, js/engine/bac.js : agrandirPort ; state.port.niveau), comme le bac, ses commandes
   et le catalogue d'import.

   Le commerce (fiche I1b) : sous la halle, au comptoir, on vend ce que la ferme produit et ce qu'on trouve
   sur l'île, on achète les semences. Avec le chantier allumé, c'est la seule interface économique : la calèche
   ne commerce plus (caleche.js). Les prix et les cours sont ceux de market.js (sellItem, buyItem : rien n'est
   dupliqué) ; les écritures des Comptes disent « Port : … ».
   - Où est le comptoir : le lieu du port (plan.lieux.port : sa case, le sens de son quai) est tiré avec les
     éléments du monde ; dans le jeu, le Web Worker du sol le donne et la page le pose ici (poserPort, comme la
     tournée de la calèche) ; dans Node (les tests, le joueur automatique), portDuMonde le calcule d'après le
     plan (planDuMonde : quelques centaines de ms, une fois par graine). La disposition de la halle
     (monde-gen.js, dispositionPort) en donne les cases du comptoir.
   - portOuvert(state, ou) : le personnage, sur la case `ou`, est à PORT.PORTEE cases au plus d'une case du
     comptoir, de PORT.HEURES[0] à PORT.HEURES[1] h, et le commerce est ouvert à son niveau (devices.js,
     marcheOuvert : le niveau de l'élément « marche », comme la calèche avant).
   - vendreAuPort, acheterAuPort : tout ce qui se vendait à la calèche (fiche I2 : ce qu'on y a porté, portage.js) ; à l'achat, les semences
     (isBuyable) que le niveau du joueur a débloquées (enVenteAuPort). Les produits des hameaux ne s'y vendent
     pas (ils viendront des villageois). Chaque vente compte pour les paliers (ventesPort) ; l'objectif du jour
     « vendre » se note par l'XP de la vente (levels.js, gainActionXp).
   `o.sansPresence` : le joueur automatique (bot.js), qui n'a pas de carte, compte sa sortie au port en temps
   d'éveil d'après la distance et commerce sans case.
   ========================================================================== */

import { DATA } from './catalog.js';
import { EPS } from './base.js';
import { villageActif } from './village.js';
import { fail, marcheFerme, marcheOuvert } from './devices.js';
import { clockHours } from './clock.js';
import { buyItem, buyPrice, buyQuote, isBuyable, sellableCount } from './market.js';
import { bumpCounter, isUnlocked } from './campaign.js';
import { seedItem } from './crops.js';
import { farmSeed, farmTerrain } from './terrain.js';
import { planDuMonde } from './monde.js';
import { dispositionPort } from './monde-gen.js';
import { chargeDe, materiauDuChantier, vendreCharge, vendreToutLaCharge } from './portage.js';
import { objetImporte } from './bac.js';

export const PORT = DATA.PORT;
export const NIVEAUX_PORT = PORT.NIVEAUX.length;

// Le niveau du port de la partie (1 à NIVEAUX_PORT), ou 0 : pas de port (le chantier éteint).
export function niveauPort(state) {
  if (!villageActif(state)) return 0;
  const n = state && state.port && Number.isInteger(state.port.niveau) ? state.port.niveau : PORT.NIVEAU_DEPART;
  return Math.max(1, Math.min(NIVEAUX_PORT, n));
}

// Ce que le port a au niveau n : { quai (sa longueur, en cases), ajoute (Set : les noms de NIVEAUX[].ajoute
// jusqu'à n) }.
export function contenuPort(n) {
  const k = Math.max(1, Math.min(NIVEAUX_PORT, n | 0)), ajoute = new Set();
  for (let i = 0; i < k; i++) for (const a of PORT.NIVEAUX[i].ajoute) ajoute.add(a);
  return { quai: PORT.NIVEAUX[k - 1].quai, ajoute };
}

/* ---------- le commerce (fiche I1b) ---------- */

// Les lieux de port connus, par graine (une partie n'en a qu'un) : { case, sens } (plan.lieux.port).
const lieuxPorts = new Map();

// Pose le lieu du port de la graine (la page, d'après les lieux que le Worker a tirés ; portDuMonde). → le lieu.
export function poserPort(graine, lieu) {
  if (!lieu || !Number.isInteger(lieu.case) || (lieu.sens !== 1 && lieu.sens !== 3)) return null;
  const l = { case: lieu.case, sens: lieu.sens, chemin: Array.isArray(lieu.chemin) ? lieu.chemin.length : 0 };
  lieuxPorts.set(String(graine), l);
  while (lieuxPorts.size > 3) lieuxPorts.delete(lieuxPorts.keys().next().value);
  return l;
}

// Le lieu du port de la graine, calculé d'après le plan du monde (Node : les tests, le joueur automatique).
export function portDuMonde(graine) {
  const g = String(graine);
  return lieuxPorts.get(g) || poserPort(g, planDuMonde(g, PORT.NIVEAU_DEPART).lieux.port);
}

// Le lieu du port de la partie ({ case, sens, chemin : la longueur de son chemin, en cases }), ou null (le
// chantier éteint, ou pas encore posé). I9c : la partie d'un monde de l'île le porte (state.port.lieu, posé à la mise
// en ligne : poserLieuDuPort) ; le serveur et chaque joueur lisent alors le même, sans rien demander à la page (le pas du
// monde le lit : la tournée d'un villageois).
export function lieuPort(state) {
  if (!villageActif(state)) return null;
  const L = state && state.port && state.port.lieu;
  if (lieuLisible(L)) return L;
  const g = farmSeed(state);
  return g === null ? null : lieuxPorts.get(g) || null;
}
export function lieuLisible(L) {
  return !!L && typeof L === 'object' && Number.isInteger(L.case) && L.case >= 0 && (L.sens === 1 || L.sens === 3) && Number.isInteger(L.chemin) && L.chemin >= 0;
}

// I9c : le lieu du port écrit dans la partie (celle d'un monde de l'île, à sa mise en ligne ou à sa restauration :
// worker/src/monde.mjs), calculé d'après le plan de sa graine (portDuMonde : ≈ 0,7 s, une fois). → le lieu, ou null.
export function poserLieuDuPort(state) {
  if (!villageActif(state) || !state.port || typeof state.port !== 'object') return null;
  if (lieuLisible(state.port.lieu)) return state.port.lieu;
  const g = farmSeed(state), l = g === null ? null : portDuMonde(g);
  if (!l) return null;
  state.port.lieu = { case: l.case, sens: l.sens, chemin: l.chemin };
  return state.port.lieu;
}

// Le comptoir du port de la partie : { cases (ses trois cases, sous la halle), devant (la case où l'on se tient
// pour commercer), W }, ou null.
export function comptoirDuPort(state) {
  const l = lieuPort(state);
  if (!l) return null;
  const W = farmTerrain(state).LARGEUR, PP = PORT.PLAN, [HL, HH] = PP.HALLE;
  const D = dispositionPort(l.case % W, Math.floor(l.case / W), l.sens, PP.QUAI, HL, HH, W);
  const [cx, cy] = D.objets.comptoir, lg = (PORT.SORTES.find((so) => so.nom === 'comptoir') || {}).largeur || 1;
  const cases = [];
  for (let k = 0; k < lg; k++) cases.push(cy * W + cx + k);
  return { cases, devant: (cy + 1) * W + cx + (lg >> 1), W };
}

// La distance (en cases, d'un centre à l'autre) de la case `ou` à la case du comptoir la plus proche ; Infinity
// sans comptoir ou sans case.
export function distanceAuComptoir(state, ou) {
  const c = comptoirDuPort(state);
  if (!c || !Number.isInteger(ou) || ou < 0) return Infinity;
  const x = ou % c.W, y = Math.floor(ou / c.W);
  // (I9a2 : la racine carrée, exacte partout, et non Math.hypot : un geste au port se rejoue au serveur et chez chacun)
  return Math.min(...c.cases.map((i) => { const dx = (i % c.W) - x, dy = Math.floor(i / c.W) - y; return Math.sqrt(dx * dx + dy * dy); }));
}

// « 6 h », « 21 h 30 »
const heure = (h) => { const hh = Math.floor(h), mm = Math.round((h - hh) * 60); return mm ? `${hh} h ${String(mm).padStart(2, '0')}` : `${hh} h`; };

// Les heures du port, en mots : « de 6 h à 21 h ».
export function heuresPort() {
  const [a, b] = PORT.HEURES;
  return `de ${heure(a)} à ${heure(b)}`;
}

// Le port est-il dans ses heures ?
export function portDansSesHeures(state) {
  const h = clockHours(state), [a, b] = PORT.HEURES;
  return h + EPS >= a && h < b - EPS;
}

// Où est le port, en mots (loin de lui) : « Le port est au bout du chemin qui sort de la ferme, sur la côte
// (la boussole y mène). Le comptoir, sous la halle, est ouvert de 6 h à 21 h. »
export function ouEstLePort() {
  return `${PORT.NOM} est au bout du chemin qui sort de la ferme, sur la côte (la carte du monde le montre, la boussole y mène). Son comptoir, sous la halle, est ouvert ${heuresPort()}.`;
}

// Peut-on commercer au port, le personnage sur la case `ou` ? { ok, raison, dist }. `o.sansPresence` : sans
// case (le joueur automatique) : seuls le chantier, le niveau et les heures comptent.
export function portOuvert(state, ou = null, o = {}) {
  if (!villageActif(state)) return { ok: false, raison: 'Il n\'y a pas de port.', dist: Infinity };
  if (!marcheOuvert(state)) return { ok: false, raison: marcheFerme(state), dist: Infinity };
  const dist = o.sansPresence ? 0 : distanceAuComptoir(state, ou);
  if (dist > PORT.PORTEE + EPS) return { ok: false, raison: `Tu n'es pas au port. ${ouEstLePort()}`, dist };
  if (!portDansSesHeures(state)) return { ok: false, raison: `Le comptoir est fermé : il ouvre ${heuresPort()}.`, dist };
  return { ok: true, raison: null, dist };
}

// Une semence en vente au port : une semence (market.js, isBuyable) dont la culture est débloquée par le niveau
// du joueur ; un jeune arbre, le Verger débloqué. (fiche I1c : ce que le bac importe, PORT.IMPORT — les jeunes
// arbres, les plants de vigne, les espèces de la serre — ne s'achète plus tout de suite : bac.js commanderImport)
export function enVenteAuPort(state, item) {
  const def = DATA.OBJETS[item];
  if (!def || !isBuyable(item) || objetImporte(item)) return false;
  if (def.arbre) return isUnlocked(state, 'verger');
  return !Object.keys(DATA.CULTURES).some((c) => seedItem(c) === item && !isUnlocked(state, c));
}

// Ce que le port vend : [{ item, prix (la prochaine unité, son cours : market.js) }].
export function etalPort(state) {
  return Object.keys(DATA.OBJETS).filter((item) => enVenteAuPort(state, item)).map((item) => ({ item, prix: buyPrice(state, item) }));
}

// Ce que le joueur peut y vendre : [item] (ce qu'il y a porté : son chargement, fiche I2, portage.js).
export function vendablesPort(state) {
  const c = chargeDe(state);
  return Object.keys(DATA.OBJETS).filter((k) => !DATA.OBJETS[k].invendable && (c[k] || 0) >= 1);
}

// Ce que le joueur pourrait charger pour le port (sur la ferme) : [item] (ce qui se vend et qu'il a, une unité
// entière au moins ; fiche I1c : et les matériaux du chantier du port, les lingots compris).
export function chargeablesPort(state) {
  return Object.keys(DATA.OBJETS).filter((k) => (!DATA.OBJETS[k].invendable || materiauDuChantier(k)) && Math.floor(sellableCount(state, k) + EPS) >= 1);
}

// Devis d'un achat au port : { quantite, cout } (market.js, buyQuote).
export function devisPort(state, item, qty = 1) {
  return enVenteAuPort(state, item) ? buyQuote(state, item, qty) : { quantite: 0, cout: 0 };
}

// Le joueur (sur la case `ou`) vend `qty` unités de `item` au port : au prix de vente (market.js, encaisserVente ;
// le cours qui baisse), ce qu'il y a porté (fiche I2 : son chargement, portage.js ; avant, tout ce qu'il avait,
// sellItem). → { ok, sold, gain } ou le refus.
export function vendreAuPort(state, item, qty, ou = null, o = {}) {
  const ici = portOuvert(state, ou, o);
  if (!ici.ok) return fail(ici.raison);
  return vendreCharge(state, item, qty);   // (les paliers de l'île : ventesPort, compté par vendreCharge)
}

// Le joueur (sur la case `ou`) décharge sous la halle : tout ce qu'il a porté se vend d'un coup (fiche I2 ; fiche I1c :
// les matériaux du chantier du port s'y apportent avant, onglet Le port : bac.js apporterAuChantier ; ce qui ne se vend
// pas, les lingots, reste chargé). → { ok, gain, vendus: { objet: n } } ou le refus.
export function dechargerAuPort(state, ou = null, o = {}) {
  const ici = portOuvert(state, ou, o);
  if (!ici.ok) return fail(ici.raison);
  return vendreToutLaCharge(state);
}

// Le joueur (sur la case `ou`) achète `qty` unités de `item` au port : une semence débloquée, à son cours qui
// monte (market.js, buyItem). → { ok, bought, cost } ou le refus.
export function acheterAuPort(state, item, qty = 1, ou = null, o = {}) {
  const def = DATA.OBJETS[item];
  if (!def) return fail('Objet inconnu.');
  const ici = portOuvert(state, ou, o);
  if (!ici.ok) return fail(ici.raison);
  if (objetImporte(item)) return fail(`${def.nom} vient par le bac : commande-le au port (l'onglet Import), il arrive au passage suivant.`);
  if (!enVenteAuPort(state, item)) return fail(isBuyable(item) ? `${def.nom} : pas encore en vente (ton niveau ne l'a pas débloqué).` : `${def.nom} ne s'achète pas au port : seulement des semences.`);
  const r = buyItem(state, item, qty, 'Port');
  if (r.ok) bumpCounter(state, 'achatsPort', r.bought);   // (fiche I7b : le didacticiel de l'île, acheter des graines)
  return r;
}
