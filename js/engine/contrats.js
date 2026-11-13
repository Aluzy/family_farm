/* ==========================================================================
   Les contrats d'export (le chantier « l'île à bâtir », docs/ile.md, fiche I8b ; les réglages : data/village.json
   PRODUCTION.CONTRATS ; la fenêtre : l'onglet Contrats du port, js/ui/port.js).

   De grosses commandes sur plusieurs passages du bac (« 100 pains », « 30 fromages frais »), avec une prime. À partir
   du port de niveau CONTRATS.NIVEAU, chaque passage du bac en propose PROPOSES[niveau − 1], tirés de la graine et du
   jour (sans toucher au hasard de la partie), parmi CONTRATS.OBJETS que le joueur sait déjà produire (objetsContrat) ;
   leur taille suit le niveau du port (VALEUR[niveau − 1] pièces au prix de vente) : une raison de le monter. Un contrat
   proposé s'accepte au comptoir jusqu'au passage suivant (MAX acceptés à la fois). Accepté, il court sur PASSAGES
   passages du bac (celui qui l'a apporté compris : c.fin, le jour du dernier). On y livre au comptoir, en autant de
   fois qu'on veut, ce qu'on a porté (livrerContrat, le portage, comme une commande) ; la tournée des villageois y
   livre ce que la ferme a (livrerDepuisLaFerme, taches.js). Chaque livraison est payée au prix de vente (« Contrat :
   … » ; elle part avec les caisses du bac : noterVenteBac) ; complet, la prime est versée (« Prime du contrat : … »),
   avec CONTRATS.XP. Le bac de son dernier passage reparti sans qu'il soit complet, il s'efface sans pénalité (B-1 :
   ce qui est livré est payé, rien n'est repris).

   L'état : state.production.contrats (production.js) = { tire (le dernier passage du bac dont les contrats sont
   traités), proposes ([{ id, objet, quantite, prime, jour, fin }]), acceptes ([… , livre]), honores (combien, depuis le
   début : une cause du score de la vocation), primes (leur total), avis ([{ quoi, … }] : ce que la page dira) }.
   `o.sansPresence` : le joueur automatique (bot.js), sans carte. Le chantier éteint, rien.
   ========================================================================== */

import { DATA, prixIle } from './catalog.js';
import { mulberry32 } from './base.js';
import { fail } from './devices.js';
import { earn } from './compta.js';
import { villageActif } from './village.js';
import { hache } from './ferme-generee.js';
import { farmSeed } from './terrain.js';
import { keepLots, pullLots } from './inventory.js';
import { encaisserVente, sellItem, sellPrice, sellableCount } from './market.js';
import { bumpCounter } from './campaign.js';
import { gainXp } from './levels.js';
import { niveauPort, portOuvert } from './port.js';
import { avancerBac, noterVenteBac, portDe, savoirProduire } from './bac.js';
import { portageDe } from './portage.js';
import { productionDe } from './production.js';
import { debloque } from './vocations.js';
import { chaines } from './chaines.js';

const CC = () => DATA.PRODUCTION.CONTRATS;
const periode = () => Math.max(1, Math.floor(Number(DATA.PORT.BAC.PERIODE) || 1));
const nLots = (lots) => (Array.isArray(lots) ? lots.reduce((t, l) => t + (l.qty || 0), 0) : 0);
const nomDe = (o) => DATA.OBJETS[o].nom;

/* ---------- ce qu'un contrat peut demander ---------- */

// Les objets qu'un contrat peut demander : ceux de CONTRATS.OBJETS que le joueur sait produire (bac.js savoirProduire :
// ses récoltes, ses plats, ses bêtes ; et le pain qu'il a cuit, la farine de son Moulin, ce que font ses chaînes).
export function objetsContrat(state) {
  const sait = new Set(savoirProduire(state));
  const k = (state.campagne && state.campagne.compteurs) || {};
  if (k.pains > 0) sait.add('pain');
  if (state.stations && state.stations.moulin && state.stations.moulin.construit) sait.add('farine');
  for (const c of chaines(state)) if (c.ok && c.produit) sait.add(c.produit.item);
  return (CC().OBJETS || []).filter((o) => sait.has(o) && DATA.OBJETS[o] && !DATA.OBJETS[o].invendable && sellPrice(o, state) > 0);
}

// Combien de contrats proposés par passage au niveau `n` du port.
export function contratsParPassage(n) {
  const L = CC().PROPOSES || [];
  return n >= (CC().NIVEAU || 1) ? Math.max(0, Math.floor(Number(L[Math.min(L.length, Math.max(1, n)) - 1]) || 0)) : 0;
}

// La taille d'un contrat (sa valeur, en pièces) au niveau `n` du port, avant l'écart : VALEUR[n − 1], GROS % de plus
// quand la vocation productive a débloqué les contrats gros.
export function valeurContrat(state, n) {
  const V = CC().VALEUR || [];
  const v = Number(V[Math.min(V.length, Math.max(1, n)) - 1]) || 0;
  return Math.round(debloque(state, 'contrats_gros') ? (v * (Number(CC().GROS) || 100)) / 100 : v);
}

// Les contrats proposés au passage `jour` : tirés de la graine et du jour (sans toucher au hasard de la partie).
export function tirerContrats(state, jour) {
  const C = CC(), n = niveauPort(state);
  const liste = objetsContrat(state);
  const nombre = Math.min(contratsParPassage(n), liste.length);
  const rnd = mulberry32(hache(`${farmSeed(state) || 'ile'}:contrat:${jour}`));
  const out = [], pris = new Set(), valeur = valeurContrat(state, n), pas = Math.max(1, Number(C.ARRONDI) || 1);
  for (let k = 0; k < nombre; k++) {
    const reste = liste.filter((it) => !pris.has(it));
    const item = reste[Math.floor(rnd() * reste.length)];
    pris.add(item);
    const v = valeur * (1 + ((rnd() * 2 - 1) * (Number(C.ECART) || 0)) / 100);
    const brut = Math.max(pas, Math.round(v / sellPrice(item, state) / pas) * pas);
    const quantite = Math.max(C.QUANTITE[0], Math.min(C.QUANTITE[1], brut));
    const prime = C.PRIME[0] + 5 * Math.floor(rnd() * (Math.floor((C.PRIME[1] - C.PRIME[0]) / 5) + 1));
    out.push({ id: `k${jour}-${k + 1}`, objet: item, quantite, prime, jour, fin: jour + (Math.max(1, C.PASSAGES) - 1) * periode() });
  }
  return out;
}

/* ---------- le passage du bac ---------- */

// Les contrats suivent le bac : à chaque passage traité (bac.js avancerBac), les propositions d'avant s'effacent et de
// nouvelles sont tirées ; un contrat accepté dont le bac du dernier passage est reparti sans qu'il soit complet
// s'efface (sans pénalité). → l'état des contrats, ou null éteint.
export function avancerContrats(state) {
  const p = portDe(state), P = productionDe(state);
  if (!p || !P) return null;
  avancerBac(state);
  const C = P.contrats;
  if (p.passe > C.tire) {
    const efface = C.proposes.length;
    C.proposes = tirerContrats(state, p.passe);
    C.tire = p.passe;
    if (C.proposes.length || efface) C.avis.push({ quoi: 'proposes', jour: p.passe, n: C.proposes.length });
  }
  const restent = [];
  for (const c of C.acceptes) {
    if (p.parti >= c.fin && c.livre < c.quantite) C.avis.push({ quoi: 'manque', id: c.id, objet: c.objet, quantite: c.quantite, livre: c.livre });
    else restent.push(c);
  }
  C.acceptes = restent;
  return C;
}

// Ce que la page doit dire (retiré) : [{ quoi: 'proposes' | 'manque' | 'honore', … }].
export function prendreAvisContrats(state) {
  const P = villageActif(state) && state.production && state.production.contrats;
  if (!P || !Array.isArray(P.avis) || !P.avis.length) return [];
  const out = P.avis;
  P.avis = [];
  return out;
}

// Ce que paie un contrat complet : { base (le prix de vente de tout), prime, total, xp }.
export function paiementContrat(c) {
  const base = c.quantite * prixIle(c.objet);   // (les contrats ne sont que sur l'île : ses prix, fiche I4)
  const prime = Math.round((base * c.prime) / 100);
  return { base, prime, total: base + prime, xp: Math.max(0, Math.floor(Number(CC().XP) || 0)) };
}

// Les contrats, pour la page : { proposes: [{ …, paiement, passages (sur combien de passages) }], acceptes: [{ …,
// paiement, reste, charge (ce qu'on en a porté), passagesRestants (le passage en cours compris) }], max, honores,
// niveau (celui du port), ouvert (le niveau qui les ouvre est atteint) }.
export function contratsDuPort(state) {
  const C = avancerContrats(state);
  if (!C) return null;
  const p = portDe(state), charge = portageDe(state).charge, per = periode();
  // (les passages qui restent : ceux du contrat dont le bac n'est pas encore reparti)
  const restants = (c) => { let n = 0; for (let j = c.jour; j <= c.fin; j += per) if (j > p.parti) n += 1; return n; };
  return {
    proposes: C.proposes.map((c) => ({ ...c, paiement: paiementContrat(c), passages: Math.max(1, CC().PASSAGES) })),
    acceptes: C.acceptes.map((c) => ({ ...c, paiement: paiementContrat(c), reste: c.quantite - c.livre, charge: nLots(charge[c.objet]), passagesRestants: restants(c) })),
    max: Math.max(1, Number(CC().MAX) || 1), honores: C.honores, primes: C.primes, niveau: niveauPort(state), ouvert: niveauPort(state) >= CC().NIVEAU,
  };
}

// Les contrats acceptés et pas encore complets (la tournée des villageois les livre).
export function contratsAcceptes(state) {
  const C = avancerContrats(state);
  return C ? C.acceptes.filter((c) => c.livre < c.quantite) : [];
}

/* ---------- accepter, livrer ---------- */

// Le joueur (sur la case `ou`) accepte le contrat proposé `id`. → { ok, contrat } ou le refus.
export function accepterContrat(state, id, ou = null, o = {}) {
  const C = avancerContrats(state);
  if (!C) return fail('Il n\'y a pas de port.');
  const ici = portOuvert(state, ou, o);
  if (!ici.ok) return fail(ici.raison);
  const c = C.proposes.find((x) => x.id === id);
  if (!c) return fail('Ce contrat n\'est plus proposé : le bac en a apporté d\'autres.');
  if (C.acceptes.length >= Math.max(1, Number(CC().MAX) || 1)) return fail(`Tu as déjà ${C.acceptes.length} contrats en cours : honore-les d'abord.`);
  C.proposes = C.proposes.filter((x) => x !== c);
  const a = { ...c, livre: 0 };
  C.acceptes.push(a);
  return { ok: true, contrat: a };
}

// `n` unités de `c.objet` livrées au contrat `c` (déjà sorties de ce qu'on a) : payées au prix de vente, parties avec le
// bac ; le contrat complet, sa prime. → { gain, prime, complet }.
function livrer(state, C, c, n, deja = false) {
  const gain = deja ? 0 : encaisserVente(state, c.objet, n, 'Contrat');
  if (!deja) { bumpCounter(state, 'ventesPort', gain); noterVenteBac(state, c.objet, n); }
  c.livre += n;
  let prime = 0;
  const complet = c.livre >= c.quantite;
  if (complet) {
    const pay = paiementContrat(c);
    prime = pay.prime;
    if (prime > 0) earn(state, prime, `Prime du contrat : ${nomDe(c.objet)}`);
    gainXp(state, pay.xp);
    C.honores += 1;
    C.primes += prime;
    C.acceptes = C.acceptes.filter((x) => x !== c);
    C.avis.push({ quoi: 'honore', id: c.id, objet: c.objet, quantite: c.quantite, prime });
  }
  return { gain, prime, complet };
}

// Le joueur (sur la case `ou`) livre au contrat `id` ce qu'il a porté de son objet (au plus ce qui reste). → { ok,
// contrat, n, gain, prime, complet } ou le refus.
export function livrerContrat(state, id, ou = null, o = {}) {
  const C = avancerContrats(state);
  if (!C) return fail('Il n\'y a pas de port.');
  const ici = portOuvert(state, ou, o);
  if (!ici.ok) return fail(ici.raison);
  const c = C.acceptes.find((x) => x.id === id);
  if (!c) return fail('Ce contrat n\'est plus en cours.');
  const charge = portageDe(state).charge, lots = charge[c.objet];
  const n = Math.min(c.quantite - c.livre, nLots(lots));
  if (n <= 0) return fail(`Porte au port des ${nomDe(c.objet).toLowerCase()} (l'onglet Porter, sur la ferme) : il en reste ${c.quantite - c.livre} à livrer.`);
  pullLots(lots, n);
  keepLots(charge, c.objet, lots);
  const r = livrer(state, C, c, n);
  return { ok: true, contrat: c, n, ...r };
}

// La tournée d'un villageois (taches.js, la navette) livre aux contrats acceptés ce que la ferme a, `max` unités au
// plus, au comptoir (`ou` : sa case). → { n, gain, livre: { objet: n } }.
export function livrerDepuisLaFerme(state, max, ou = null, o = {}) {
  const out = { n: 0, gain: 0, livre: {} };
  const C = avancerContrats(state);
  if (!C || !(max > 0)) return out;
  if (!portOuvert(state, ou, o).ok) return out;
  for (const c of [...C.acceptes]) {
    if (out.n >= max) break;
    const voulu = Math.min(c.quantite - c.livre, max - out.n, Math.floor(sellableCount(state, c.objet) + 1e-9));
    if (voulu <= 0) continue;
    const v = sellItem(state, c.objet, voulu, 'Contrat');
    if (!v.ok || !(v.sold > 0)) continue;
    bumpCounter(state, 'ventesPort', v.gain);
    noterVenteBac(state, c.objet, v.sold);
    const r = livrer(state, C, c, v.sold, true);
    out.n += v.sold;
    out.gain += v.gain + r.prime;
    out.livre[c.objet] = (out.livre[c.objet] || 0) + v.sold;
  }
  return out;
}
