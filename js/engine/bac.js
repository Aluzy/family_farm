/* ==========================================================================
   Le bac, ses commandes, le catalogue d'import et les niveaux du port (le chantier « l'île à bâtir »,
   docs/ile.md, fiche I1c). Les réglages : data/village.json (PORT.BAC, PORT.COMMANDES, PORT.IMPORT,
   PORT.NIVEAUX). La scène : js/carte/ferme/bac.js ; la fenêtre : js/ui/port.js.

   La vente reste libre (fiche I1b) : sous la halle, tout se vend, sans quota ni attente. Le bac « emporte
   tout ce qu'on lui donne » : ce qui a été vendu au port depuis son dernier départ attend sur le quai, en
   caisses (state.port.vendu), et part avec lui. C'est lui qui apporte les imports, les commandes et les
   nouveaux villageois (villageois.js : jourDeBac, l'heure du bac).

   Il accoste tous les BAC.PERIODE jours (les jours multiples de PERIODE), de BAC.HEURES[0] à BAC.HEURES[1] h.
   Sa venue se déduit du jour : avancerBac (la page à chaque veille, la nuit, et chaque fonction d'ici qui lit
   le port) traite les passages qui ont eu lieu depuis le dernier traité (BAC.RATTRAPAGE au plus, les plus
   récents : une longue absence n'en fait pas pleuvoir), puis son départ. À son arrivée (arriveeDuBac) : les
   imports attendus sont livrés, les commandes du passage d'avant s'effacent (manquées, elles ne coûtent rien),
   les nouvelles sont tirées. À son départ : les caisses partent avec lui.

   state.port (né avec la partie du chantier, ou au premier besoin : portDe) = {
     niveau (1 à NIVEAUX_PORT), passe (le dernier jour de bac dont l'arrivée est traitée), parti (celui dont le
     départ l'est), commandes ([{ id, objet, quantite, prime (%), jour (le passage qui l'a apportée) }] : celles
     du passage en cours, pas encore honorées), honorees (combien l'ont été à ce passage), imports ([{ cle,
     quantite (en lots), prix (payé, pour tout), jour (de la commande), arrive (le passage qui l'apporte) }]),
     vendu ({ objet: n } : vendu au port depuis le dernier départ du bac : les caisses du quai), chantier
     ({ matériau: n } : ce qui a été apporté pour le niveau suivant), sauvages ([objet] : les plants sauvages
     inscrits au catalogue, fiche I7e), avis ([{ quoi, … }] : ce que la page doit dire au joueur) }.

   Les commandes (PORT.COMMANDES) : NIVEAUX[niveau − 1].commandes par passage, tirées de la graine de la partie et
   du jour du passage (le même bac pour deux joueurs, I9c) parmi ce que le joueur sait produire (savoirProduire).
   On les honore au comptoir (honorerCommande) avec ce qu'on a porté (le portage, fiche I2 : comme la vente) :
   le prix de vente (encaisserVente : l'XP de la vente, le cours), plus la prime, plus COMMANDES.XP.

   Le catalogue (PORT.IMPORT.RANGS, catalogueImport) : un rang par niveau du port. Un article : un objet, une
   bête ou un plan, son prix pour un lot. Ce que le niveau du joueur débloquait le reste (articleOuvert) ; ces
   articles ne s'achètent plus tout de suite au comptoir (port.js enVenteAuPort). commanderImport le paie
   d'avance ; il arrive au passage suivant (livrerImport : à l'inventaire ; une bête au Poulailler ou à
   l'Étable, son prix rendu sans place ; un plan appris).

   Les niveaux (PORT.NIVEAUX[k].prix : des pièces et des matériaux) : on apporte les matériaux au chantier du
   port (apporterAuChantier : depuis ce qu'on a porté, en une ou plusieurs fois), puis on paie (agrandirPort) :
   le quai s'allonge, un rang du catalogue s'ouvre, plus de commandes par passage, plus de villageois
   (VILLAGE.ARRIVEE.PLAFOND). Le monde de la partie est celui de son niveau (terrain.js, monde.js : cadre.PORT) :
   la page recharge la scène.

   `o.sansPresence` : le joueur automatique (bot.js), qui n'a pas de carte, commerce sans case (port.js).
   Le chantier éteint (villageActif), rien ici ne se lit ni ne s'écrit.
   ========================================================================== */

import { DATA, prixIle } from './catalog.js';
import { EPS, mulberry32 } from './base.js';
import { canPay, fail, NO_COINS, pay } from './devices.js';
import { earn } from './compta.js';
import { nouveauPort, villageActif } from './village.js';
import { clockHours, nightActive } from './clock.js';
import { hache } from './ferme-generee.js';
import { farmSeed } from './terrain.js';
import { addLot, keepLots, pullLots } from './inventory.js';
import { encaisserVente } from './market.js';
import { bumpCounter, isUnlocked } from './campaign.js';
import { cropProduct } from './crops.js';
import { gainXp } from './levels.js';
import { noterObjectif } from './objectifs-compte.js';
import { accueillirAnimal, animalRefus, cowCount, sheepCount } from './animals.js';
import { offrirPlan, planConnu } from './plans.js';
import { niveauPort, portOuvert } from './port.js';
import { chargeDe, portageDe, volumeDe } from './portage.js';
import { vendrePaniers } from './bourse.js';

const P = () => DATA.PORT;
const B = () => DATA.PORT.BAC;
const objet = (v) => !!v && typeof v === 'object' && !Array.isArray(v);
const entier = (v, d = 0) => (Number.isInteger(v) ? v : d);
const jourDe = (state) => Math.max(1, Math.floor(Number(state && state.day) || 1));
const periode = () => Math.max(1, Math.floor(Number(B().PERIODE) || 1));
const nLots = (lots) => (Array.isArray(lots) ? lots.reduce((t, l) => t + (l.qty || 0), 0) : 0);

/* ---------- les jours du bac ---------- */

// Le jour `jour` est-il un jour de bac ? (les jours multiples de PORT.BAC.PERIODE)
export function jourDeBac(state, jour = jourDe(state)) {
  return Number.isInteger(jour) && jour >= 1 && jour % periode() === 0;
}

// Le prochain jour de bac à partir de `jour` (compris).
export function prochainBac(state, jour = jourDe(state)) {
  const p = periode();
  return Math.ceil(Math.max(1, jour) / p) * p;
}

// Le dernier jour de bac avant `jour` (exclu), ou 0.
function bacAvant(jour) {
  const p = periode();
  return Math.floor((jour - 1) / p) * p;
}

// L'heure du jeu (décimale) ; la nuit, la journée est finie.
const heure = (state) => clockHours(state);

// Le bac est-il à quai en ce moment ? (un jour de bac, de HEURES[0] à HEURES[1] h, de jour)
export function bacAQuai(state) {
  if (!villageActif(state) || nightActive(state) || !jourDeBac(state)) return false;
  const h = heure(state), [a, b] = B().HEURES;
  return h + EPS >= a && h < b - EPS;
}

// « 9 h à 17 h »
export function heuresBac() {
  const [a, b] = B().HEURES;
  return `de ${a} h à ${b} h`;
}

/* ---------- le port de la partie ---------- */

// Le port d'une partie neuve du chantier : village.js nouveauPort (le dernier bac d'avant `jour` compte pour passé).
export { nouveauPort };

// Le port d'une sauvegarde (la migration v89 → v90, et portDe) : ce qui se lit est gardé, le reste remis.
export function reparerPort(p, jour = 1) {
  const o = objet(p) ? p : {};
  const d = nouveauPort(jour);
  const N = DATA.PORT.NIVEAUX.length;
  const lisible = (x) => objet(x) && typeof x.objet === 'string' && DATA.OBJETS[x.objet] && Number.isInteger(x.quantite) && x.quantite > 0;
  const nombres = (x) => {
    const out = {};
    if (objet(x)) for (const [k, n] of Object.entries(x)) if (DATA.OBJETS[k] && Number.isInteger(n) && n > 0) out[k] = n;
    return out;
  };
  return {
    niveau: Number.isInteger(o.niveau) ? Math.max(1, Math.min(N, o.niveau)) : d.niveau,
    passe: Number.isInteger(o.passe) && o.passe >= 0 ? o.passe : d.passe,
    parti: Number.isInteger(o.parti) && o.parti >= 0 ? o.parti : d.parti,
    commandes: Array.isArray(o.commandes) ? o.commandes.filter(lisible).map((c) => ({
      id: typeof c.id === 'string' ? c.id : `c${entier(c.jour)}-${c.objet}`, objet: c.objet, quantite: c.quantite,
      prime: Number.isInteger(c.prime) ? c.prime : 0, jour: entier(c.jour),
    })) : [],
    honorees: Number.isInteger(o.honorees) && o.honorees >= 0 ? o.honorees : 0,
    imports: Array.isArray(o.imports) ? o.imports.filter((x) => objet(x) && typeof x.cle === 'string' && articleDe(x.cle)
      && Number.isInteger(x.quantite) && x.quantite > 0).map((x) => ({
      cle: x.cle, quantite: x.quantite, prix: Number.isFinite(x.prix) ? Math.max(0, x.prix) : 0, jour: entier(x.jour), arrive: entier(x.arrive),
    })) : [],
    vendu: nombres(o.vendu),
    chantier: nombres(o.chantier),
    sauvages: Array.isArray(o.sauvages) ? o.sauvages.filter((k) => typeof k === 'string' && DATA.OBJETS[k]) : [],
    avis: [],
  };
}

// Le port de la partie (créé s'il manque : une partie d'essai d'avant la fiche I1c), ou null le chantier éteint.
export function portDe(state) {
  if (!villageActif(state)) return null;
  if (!objet(state.port)) state.port = nouveauPort(jourDe(state));
  const p = state.port;
  if (!Array.isArray(p.commandes) || !Array.isArray(p.imports) || !objet(p.vendu) || !objet(p.chantier) || !Array.isArray(p.avis)) {
    state.port = reparerPort(p, jourDe(state));
  }
  return state.port;
}

/* ---------- le passage du bac ---------- */

// Les passages du bac qui ont eu lieu et ne sont pas traités, puis son départ. `o.nuit` : la journée est finie
// (runNight : le bac du jour est passé et reparti). → { arrivees: [jours], depart (bool) } ou null.
export function avancerBac(state, o = {}) {
  const p = portDe(state);
  if (!p) return null;
  const jour = jourDe(state), fini = !!o.nuit || nightActive(state), h = heure(state), [a, b] = B().HEURES;
  const dernier = jourDeBac(state, jour) && (fini || h + EPS >= a) ? jour : bacAvant(jour);
  const arrivees = [];
  if (dernier > p.passe) {
    const per = periode(), max = Math.max(1, Math.floor(Number(B().RATTRAPAGE) || 1));
    const jours = [];
    for (let j = dernier; j > p.passe && jours.length < max; j -= per) jours.unshift(j);
    // (les passages plus anciens que RATTRAPAGE sont perdus : leurs commandes n'ont jamais été tirées ; les imports
    // attendus arrivent au premier qu'on traite)
    jours.forEach((j, k) => arriveeDuBac(state, p, j, k === jours.length - 1));
    p.passe = dernier;
    arrivees.push(...jours);
  }
  let depart = false;
  if (p.parti < p.passe && (p.passe < jour || fini || h >= b - EPS)) {
    p.parti = p.passe;
    if (Object.keys(p.vendu).length) depart = true;
    p.vendu = {};
  }
  return { arrivees, depart };
}

// Le bac du jour `jour` accoste : les imports attendus livrés, les commandes renouvelées (`tirer` : le dernier
// passage traité ; ceux d'avant, rattrapés, n'en tirent pas).
function arriveeDuBac(state, p, jour, tirer) {
  const livres = [], rendus = [];
  const restent = [];
  for (const x of p.imports) {
    if (x.arrive > jour) { restent.push(x); continue; }
    const r = livrerImport(state, x);
    (r.ok ? livres : rendus).push({ cle: x.cle, quantite: x.quantite, raison: r.error || null });
  }
  p.imports = restent;
  const manquees = p.commandes.length;
  p.commandes = tirer ? tirerCommandes(state, jour) : [];
  p.honorees = 0;
  // (fiche I4, bourse.js : le panier de chaque villageois se vend pour lui, et part dans les caisses ; sa commande
  // arrive, qui a de quoi en passe une)
  const vg = vendrePaniers(state, jour, p.vendu);
  const ventes = Object.values(vg.ventes).reduce((t, n) => t + n, 0);
  p.avis.push({ quoi: 'bac', jour, livres, rendus, commandes: p.commandes.length, manquees, ...(ventes ? { ventesVillageois: ventes } : {}) });
}

// Ce que la page doit dire au joueur : [{ quoi: 'bac', jour, livres, rendus, commandes, manquees }] ; retirés.
export function prendreAvisBac(state) {
  const p = villageActif(state) && objet(state.port) ? state.port : null;
  if (!p || !Array.isArray(p.avis) || !p.avis.length) return [];
  const out = p.avis;
  p.avis = [];
  return out;
}

/* ---------- ce qui part avec le bac ---------- */

// Une vente au port (portage.js vendreCharge, la tournée d'un villageois : taches.js) : elle attend le bac.
export function noterVenteBac(state, item, n) {
  const p = portDe(state);
  if (!p || !(n > 0) || !DATA.OBJETS[item]) return;
  avancerBac(state);
  p.vendu[item] = (p.vendu[item] || 0) + Math.floor(n);
}

// Les caisses sur le quai : une par BAC.CAISSE volumes vendus depuis le dernier départ, CAISSES_MAX au plus.
export function caissesAQuai(state) {
  const p = villageActif(state) && objet(state.port) ? state.port : null;
  if (!p || !objet(p.vendu)) return 0;
  const vol = Object.entries(p.vendu).reduce((t, [k, n]) => t + n * volumeDe(k), 0);
  return vol > 0 ? Math.min(Math.max(1, Number(B().CAISSES_MAX) || 1), Math.ceil(vol / Math.max(1, Number(B().CAISSE) || 1))) : 0;
}

/* ---------- les commandes ---------- */

// Ce que le joueur sait produire (les objets qu'une commande peut demander) : les cultures qu'il a récoltées,
// les plats qu'il a préparés (pas les transformations), les œufs, la laine et le lait de ses bêtes ; ce qui se vend.
export function savoirProduire(state) {
  const k = (state.campagne && state.campagne.compteurs) || {};
  const out = new Set();
  for (const c of Array.isArray(k.cultures) ? k.cultures : []) if (DATA.CULTURES[c]) out.add(cropProduct(c));
  for (const r of Array.isArray(k.plats) ? k.plats : []) if (DATA.RECETTES[r] && DATA.OBJETS[r]) out.add(r);
  if (state.poulailler && state.poulailler.poules > 0) out.add('oeuf');
  if (state.paturage && Array.isArray(state.paturage.moutons) && sheepCount(state) > 0) out.add('laine');
  if (state.paturage && Array.isArray(state.paturage.vaches) && cowCount(state) > 0) out.add('lait');
  return [...out].filter((it) => DATA.OBJETS[it] && !DATA.OBJETS[it].invendable && prixIle(it) > 0).sort();
}

// Combien de commandes par passage au niveau n.
export function commandesParPassage(n) {
  const N = DATA.PORT.NIVEAUX;
  const k = Math.max(1, Math.min(N.length, n | 0));
  return Math.max(0, Math.floor(Number(N[k - 1].commandes) || 0));
}

// Les commandes du passage `jour` : tirées de la graine et du jour (sans toucher au hasard de la partie).
export function tirerCommandes(state, jour) {
  const C = DATA.PORT.COMMANDES, n = niveauPort(state);
  const liste = savoirProduire(state);
  const rnd = mulberry32(hache(`${farmSeed(state) || 'ile'}:bac:${jour}`));
  const nombre = Math.min(commandesParPassage(n), liste.length);
  const out = [];
  const pris = new Set();
  const valeur = C.VALEUR[Math.min(C.VALEUR.length, n) - 1];
  for (let k = 0; k < nombre; k++) {
    const reste = liste.filter((it) => !pris.has(it));
    const item = reste[Math.floor(rnd() * reste.length)];
    pris.add(item);
    const v = valeur * (1 + ((rnd() * 2 - 1) * (Number(C.ECART) || 0)) / 100);
    const quantite = Math.max(C.QUANTITE[0], Math.min(C.QUANTITE[1], Math.round(v / prixIle(item))));
    const pas = Math.floor((C.PRIME[1] - C.PRIME[0]) / 5) + 1;
    const prime = C.PRIME[0] + 5 * Math.floor(rnd() * pas);
    out.push({ id: `c${jour}-${k + 1}`, objet: item, quantite, prime, jour });
  }
  return out;
}

// Ce que paie une commande : { base (le prix de vente), prime, total, xp }.
export function paiementCommande(c) {
  const base = c.quantite * prixIle(c.objet);
  const prime = Math.round((base * c.prime) / 100);
  return { base, prime, total: base + prime, xp: Math.max(0, Math.floor(Number(DATA.PORT.COMMANDES.XP) || 0)) };
}

// Les commandes du passage en cours : [{ id, objet, quantite, prime, jour, charge (ce qu'on en a porté),
// paiement, prete (assez de porté) }] ; jusqu'au passage suivant (`jusqua` : son jour).
export function commandesDuBac(state) {
  const p = portDe(state);
  if (!p) return [];
  avancerBac(state);
  const c = chargeDe(state);
  return p.commandes.map((x) => ({ ...x, charge: c[x.objet] || 0, paiement: paiementCommande(x), prete: (c[x.objet] || 0) >= x.quantite, jusqua: p.passe + periode() }));
}

// Le joueur (sur la case `ou`) honore la commande `id` au comptoir, avec ce qu'il a porté : le prix de vente, la
// prime, l'XP. → { ok, commande, gain, prime, xp } ou le refus.
export function honorerCommande(state, id, ou = null, o = {}) {
  const p = portDe(state);
  if (!p) return fail('Il n\'y a pas de port.');
  const ici = portOuvert(state, ou, o);
  if (!ici.ok) return fail(ici.raison);
  avancerBac(state);
  const c = p.commandes.find((x) => x.id === id);
  if (!c) return fail('Cette commande n\'est plus valable : le bac en a apporté d\'autres.');
  const def = DATA.OBJETS[c.objet], lots = portageDe(state).charge[c.objet];
  if (nLots(lots) < c.quantite) return fail(`Il faut ${c.quantite} ${def.nom.toLowerCase()} portés au port (tu en as ${nLots(lots)}) : charge-les à la ferme (l'onglet Porter).`);
  pullLots(lots, c.quantite);
  keepLots(portageDe(state).charge, c.objet, lots);
  const pay = paiementCommande(c);
  const gain = encaisserVente(state, c.objet, c.quantite, 'Bac');
  bumpCounter(state, 'ventesPort', gain);
  if (pay.prime > 0) earn(state, pay.prime, `Prime du bac : ${def.nom}`);
  gainXp(state, pay.xp);
  noterObjectif(state, 'commande_bac', 1);
  noterVenteBac(state, c.objet, c.quantite);
  p.commandes = p.commandes.filter((x) => x !== c);
  p.honorees += 1;
  return { ok: true, commande: c, gain: gain + pay.prime, prime: pay.prime, xp: pay.xp };
}

/* ---------- le catalogue d'import ---------- */

// Un article du catalogue par sa clé (« objet:jeune_pommier », « bete:poule », « plan:pergola »,
// « sauvage:… ») : { cle, sorte, id, prix, lot, rang } ou null.
export function articleDe(cle, state = null) {
  const [sorte, id] = String(cle).split(':');
  const R = DATA.PORT.IMPORT.RANGS;
  for (let k = 0; k < R.length; k++) {
    for (const a of R[k]) {
      const s = a.objet ? 'objet' : a.bete ? 'bete' : a.plan ? 'plan' : null;
      if (s === sorte && (a.objet || a.bete || a.plan) === id) return { cle, sorte, id, prix: a.prix, lot: a.lot || 1, rang: k + 1 };
    }
  }
  if (sorte === 'sauvage' && DATA.OBJETS[id]) {
    const S = DATA.PORT.IMPORT.SAUVAGES;
    if (state && !(objet(state.port) && Array.isArray(state.port.sauvages) && state.port.sauvages.includes(id))) return null;
    return { cle, sorte, id, prix: Math.max(1, Math.round((prixIle(id) * S.MARGE) / 100)) * S.LOT, lot: S.LOT, rang: S.RANG };
  }
  return null;
}

// Les objets du catalogue (ils ne s'achètent pas tout de suite au comptoir : port.js enVenteAuPort).
export function objetImporte(item) {
  return DATA.PORT.IMPORT.RANGS.some((r) => r.some((a) => a.objet === item));
}

// Son nom et son icône.
export function nomArticle(a) {
  if (a.sorte === 'bete') {
    const N = { poule: ['Une poule', '🐔'], mouton: ['Un mouton', '🐑'], vache: ['Une vache', '🐄'] };
    return N[a.id] || [a.id, '🐾'];
  }
  if (a.sorte === 'plan') {
    const b = DATA.ATELIER.BLOCS[a.id];
    return [`Plan : ${b ? b.nom : a.id}`, '📜'];
  }
  const d = DATA.OBJETS[a.id];
  return [d ? d.nom : a.id, d ? d.icone : '📦'];
}

// L'article est-il ouvert au joueur ? null, ou la raison (le rang du port, son niveau, la place…).
export function articleRefus(state, a) {
  const n = niveauPort(state);
  if (a.rang > n) return `Le port de niveau ${a.rang} l'importe.`;
  if (a.sorte === 'objet' || a.sorte === 'sauvage') {
    const def = DATA.OBJETS[a.id];
    if (def.arbre && !isUnlocked(state, 'verger')) return 'Le Verger n\'est pas encore débloqué.';
    const cultures = Object.keys(DATA.CULTURES).filter((c) => ((DATA.CULTURES[c].graines || {}).item) === a.id);
    if (cultures.some((c) => !isUnlocked(state, c))) return 'Ton niveau ne l\'a pas encore débloqué.';
    return null;
  }
  if (a.sorte === 'bete') {
    if (!isUnlocked(state, a.id === 'poule' ? 'poulailler' : 'moutons')) return a.id === 'poule' ? 'Le Poulailler n\'est pas encore débloqué.' : 'L\'Étable n\'est pas encore débloquée.';
    return animalRefus(state, a.id);
  }
  if (a.sorte === 'plan') {
    if (planConnu(state, a.id)) return 'Tu connais déjà ce plan.';
    if (objet(state.port) && state.port.imports.some((x) => x.cle === a.cle)) return 'Déjà commandé.';
    return null;
  }
  return 'Article inconnu.';
}

// Le catalogue : [{ cle, sorte, id, nom, icone, prix, lot, rang, refus }], dans l'ordre des rangs (et les
// plants sauvages inscrits, fiche I7e).
export function catalogueImport(state) {
  const out = [];
  const R = DATA.PORT.IMPORT.RANGS;
  for (const r of R) {
    for (const a of r) {
      const sorte = a.objet ? 'objet' : a.bete ? 'bete' : 'plan';
      const x = articleDe(`${sorte}:${a.objet || a.bete || a.plan}`);
      const [nom, icone] = nomArticle(x);
      out.push({ ...x, nom, icone, refus: articleRefus(state, x) });
    }
  }
  for (const id of (objet(state.port) && Array.isArray(state.port.sauvages)) ? state.port.sauvages : []) {
    const x = articleDe(`sauvage:${id}`, state);
    if (!x) continue;
    const [nom, icone] = nomArticle(x);
    out.push({ ...x, nom, icone, refus: articleRefus(state, x) });
  }
  return out;
}

// Un plant sauvage rapporté de l'île et cultivé (fiche I7e) : il s'inscrit au catalogue. → vrai s'il est nouveau.
export function inscrireSauvage(state, item) {
  const p = portDe(state);
  if (!p || !DATA.OBJETS[item] || p.sauvages.includes(item)) return false;
  p.sauvages.push(item);
  return true;
}

// Le passage qui apportera une commande passée maintenant : le suivant du dernier traité.
export function passageSuivant(state) {
  const p = portDe(state);
  return p ? p.passe + periode() : prochainBac(state);
}

// Le joueur (sur la case `ou`) commande `quantite` lots de l'article `cle`, payés d'avance ; ils arrivent au
// passage suivant du bac. → { ok, article, quantite, cout, arrive } ou le refus.
export function commanderImport(state, cle, quantite = 1, ou = null, o = {}) {
  const p = portDe(state);
  if (!p) return fail('Il n\'y a pas de port.');
  const a = articleDe(cle, state);
  if (!a) return fail('Article inconnu.');
  const ici = portOuvert(state, ou, o);
  if (!ici.ok) return fail(ici.raison);
  avancerBac(state);
  const refus = articleRefus(state, a);
  if (refus) return fail(refus);
  let q = Math.max(1, Math.floor(Number(quantite)) || 1);
  if (a.sorte === 'plan') q = 1;
  const cout = a.prix * q;
  if (!canPay(state, cout)) return fail(NO_COINS);
  const [nom] = nomArticle(a);
  pay(state, cout, `Import : ${a.sorte === 'objet' || a.sorte === 'sauvage' ? DATA.OBJETS[a.id].nom : nom}`);
  const arrive = passageSuivant(state);
  const deja = p.imports.find((x) => x.cle === a.cle && x.arrive === arrive);
  if (deja) { deja.quantite += q; deja.prix += cout; } else p.imports.push({ cle: a.cle, quantite: q, prix: cout, jour: jourDe(state), arrive });
  return { ok: true, article: a, quantite: q, cout, arrive };
}

// Les imports attendus : [{ cle, nom, icone, quantite (en unités), arrive }].
export function importsAttendus(state) {
  const p = portDe(state);
  if (!p) return [];
  avancerBac(state);
  return p.imports.map((x) => {
    const a = articleDe(x.cle, state) || { sorte: 'objet', id: x.cle.split(':')[1], lot: 1 };
    const [nom, icone] = nomArticle(a);
    return { cle: x.cle, nom, icone, quantite: x.quantite * (a.lot || 1), arrive: x.arrive };
  });
}

// Livre un import (à l'arrivée du bac) : à l'inventaire (la ferme) ; une bête à son bâtiment ; un plan appris.
// Une bête sans place : son prix est rendu. → { ok } ou le refus (rendu).
function livrerImport(state, x) {
  const a = articleDe(x.cle, state) || articleDe(x.cle);
  if (!a) { if (x.prix > 0) earn(state, x.prix, 'Import rendu'); return fail('Article retiré du catalogue.'); }
  if (a.sorte === 'objet' || a.sorte === 'sauvage') {
    addLot(state, a.id, x.quantite * a.lot, DATA.ORIGINE.ACHETE);
    return { ok: true };
  }
  if (a.sorte === 'bete') {
    let n = 0;
    for (let k = 0; k < x.quantite; k++) if (accueillirAnimal(state, a.id).ok) n++;
    const rendu = Math.round((x.prix * (x.quantite - n)) / x.quantite);
    if (rendu > 0) earn(state, rendu, `Import rendu : ${nomArticle(a)[0]}`);
    return n > 0 ? { ok: true } : fail(animalRefus(state, a.id) || 'Pas de place.');
  }
  if (a.sorte === 'plan') {
    const appris = offrirPlan(state, a.id, false);
    if (!appris && x.prix > 0) earn(state, x.prix, 'Import rendu');
    return appris ? { ok: true } : fail('Plan déjà connu.');
  }
  return fail('Article inconnu.');
}

/* ---------- les niveaux du port ---------- */

// Le prochain niveau du port : { niveau, pieces, materiaux ({ matériau: n }), apporte ({ matériau: n } : au
// chantier), manque ({ matériau: n }), pret (tout apporté), commandes, quai, rang (les articles qu'il ouvre),
// plafond (villageois) } ; null au dernier.
export function prochainNiveau(state) {
  const p = portDe(state);
  if (!p) return null;
  const n = niveauPort(state), N = DATA.PORT.NIVEAUX;
  if (n >= N.length) return null;
  const def = N[n], prix = def.prix || {};
  const materiaux = {}, manque = {};
  for (const [k, v] of Object.entries(prix)) if (k !== 'pieces' && v > 0) materiaux[k] = v;
  for (const [k, v] of Object.entries(materiaux)) { const r = v - (p.chantier[k] || 0); if (r > 0) manque[k] = r; }
  const plafond = (DATA.VILLAGE.ARRIVEE.PLAFOND || {})[n + 1];
  return {
    niveau: n + 1, pieces: prix.pieces || 0, materiaux, apporte: { ...p.chantier }, manque, pret: !Object.keys(manque).length,
    commandes: commandesParPassage(n + 1), quai: def.quai, rang: (DATA.PORT.IMPORT.RANGS[n] || []).length, plafond: plafond ?? null,
  };
}

// Le joueur (sur la case `ou`) apporte au chantier du port ce qu'il a porté des matériaux du niveau suivant (pas
// plus qu'il n'en faut). → { ok, apporte ({ matériau: n }), manque } ou le refus.
export function apporterAuChantier(state, ou = null, o = {}) {
  const p = portDe(state);
  if (!p) return fail('Il n\'y a pas de port.');
  const ici = portOuvert(state, ou, o);
  if (!ici.ok) return fail(ici.raison);
  const nx = prochainNiveau(state);
  if (!nx) return fail('Le port est à son dernier niveau.');
  const charge = portageDe(state).charge, apporte = {};
  for (const [k, r] of Object.entries(nx.manque)) {
    const lots = charge[k], n = Math.min(r, nLots(lots));
    if (n <= 0) continue;
    pullLots(lots, n);
    keepLots(charge, k, lots);
    p.chantier[k] = (p.chantier[k] || 0) + n;
    apporte[k] = n;
  }
  if (!Object.keys(apporte).length) {
    const liste = Object.entries(nx.manque).map(([k, n]) => `${n} ${DATA.OBJETS[k].nom.toLowerCase()}`).join(', ');
    return fail(`Rien à apporter : porte au port ${liste} (charge-les à la ferme, l'onglet Porter).`);
  }
  return { ok: true, apporte, manque: prochainNiveau(state).manque };
}

// Le joueur (sur la case `ou`) paie le niveau suivant, ses matériaux apportés : le port s'agrandit. → { ok, niveau }
// ou le refus.
export function agrandirPort(state, ou = null, o = {}) {
  const p = portDe(state);
  if (!p) return fail('Il n\'y a pas de port.');
  const ici = portOuvert(state, ou, o);
  if (!ici.ok) return fail(ici.raison);
  const nx = prochainNiveau(state);
  if (!nx) return fail('Le port est à son dernier niveau.');
  if (!nx.pret) return fail('Il manque des matériaux au chantier du port.');
  if (!pay(state, nx.pieces, `Port agrandi : niveau ${nx.niveau}`)) return fail(NO_COINS);
  for (const k of Object.keys(nx.materiaux)) delete p.chantier[k];
  p.niveau = nx.niveau;
  return { ok: true, niveau: p.niveau };
}

/* ---------- pour la page et la scène ---------- */

// L'état du bac : { aQuai, jour (aujourd'hui), prochain (le prochain jour de bac à venir, aujourd'hui compris s'il
// n'est pas encore reparti), heures, caisses, commandes (nombre), imports (nombre), niveau }.
export function etatBac(state) {
  const p = portDe(state);
  if (!p) return null;
  avancerBac(state);
  const j = jourDe(state), h = heure(state), [, b] = B().HEURES;
  const prochain = jourDeBac(state, j) && !nightActive(state) && h < b - EPS ? j : prochainBac(state, j + 1);
  return { aQuai: bacAQuai(state), jour: j, prochain, heures: B().HEURES.slice(), caisses: caissesAQuai(state), commandes: p.commandes.length, imports: p.imports.length, niveau: niveauPort(state) };
}
