import { DATA, prixIle } from './catalog.js';
import { fail } from './devices.js';
import { earn } from './compta.js';
import { clockHours, nightActive } from './clock.js';
import { villageActif } from './village.js';
import { mulberry32 } from './base.js';
import { hache } from './ferme-generee.js';
import { farmSeed, farmTerrain } from './terrain.js';
import { addItem } from './inventory.js';
import { stockCount, takeStock } from './fridge.js';
import { takeWheat, wheatTotal } from './animals.js';
import { goutPour } from './amitie.js';
import { villageoisDe, trouverVillageois } from './villageois.js';
import { journeeDuVillage } from './villageois-journee.js';
import { blocBloque, casesCouvertes, memoEnLot } from './blocs.js';

/* ---------- la part, la bourse et l'étal (le chantier « l'île à bâtir », fiche I4) ----------

   La part (VILLAGE.PART, 30 %) : chaque nuit (villageoisNuit, après les repas de tous), un villageois garde la part de
   la valeur de ce que son travail a produit ce jour-là (J.produit, au prix de l'île : catalog.js prixIle ; moins ce
   qu'il a pris au coffre pour le faire, J.utilise : la cuisine ne prend que sur ce qu'elle ajoute). Elle est prise
   sur le produit, jamais sur la caisse (B-1 : pas de dette) : des objets de sa récolte, les plus chers d'abord, qui
   quittent le coffre de la ferme (l'inventaire, le réfrigérateur, le blé du Silo) pour son panier (v.panier) ; ce qui
   en est déjà parti (vendu, mangé) ne se reprend pas. Un reste plus petit qu'un objet attend le lendemain (v.reste,
   jamais plus que l'objet le plus cher de sa journée). La tournée du port ne prend rien (ses pièces sont celles du
   joueur). J.part : la valeur prise (le tableau la compte dans son coût, tableau.js). Le panier se vend pour lui au
   passage suivant du bac (vendrePaniers, appelé par bac.js à l'arrivée du bac) : sa bourse (v.bourse) ; les objets
   partent avec le bac, dans ses caisses (state.port.vendu).

   La bourse dépensée (VILLAGE.BOURSE) :
   - à l'étal du joueur : un bloc de l'Atelier (« etal », posé dehors, un seul) où le joueur met en vente (state.etal :
     { objets: { objet: n }, avis }) ; au prix de vente de l'île. Chaque jour, achatsDuJour décide qui y va (dans
     l'ordre des id, un objet chacun au plus, ACHATS) : ce qu'il adore, ce dont il a besoin (BESOINS : un vêtement, un
     meuble, une fois chacun ; v.affaires), puis ce qu'il aime, s'il a de quoi le payer ; jamais ce qu'il déteste. Sa
     journée (villageois-journee.js) lui donne un créneau de la fin d'après-midi devant l'étal (le but « etal ») ; le
     moteur fait l'achat au milieu de ce créneau (avancerAchats, à chaque pas de la ferme ; la nuit fait celui qu'on
     n'a pas vu : achatsNuit). L'objet quitte l'étal, ses pièces vont au joueur (« Étal : … »), son plaisir monte sa
     cible de bonheur cette nuit-là (v.plaisir : BONHEUR.adore, aime, besoin) ;
   - puis aux commerces (le lot 5) ;
   - enfin par le bac (IMPORT) : au passage du bac, qui a IMPORT.SEUIL pièces ou plus commande pour lui un objet qu'il
     adore (le prix de l'île × MARGE %, MIN au moins ; IMPORT.MAX au plus, sans descendre sous IMPORT.GARDE pièces) :
     l'argent quitte l'île ; l'objet arrive au passage suivant (v.commande ; ce qui se mange va à ses provisions, le
     reste à ses affaires), et son plaisir (IMPORT.BONHEUR) cette nuit-là.

   Ce qui se mange, il le mange (v.provisions : à son prochain repas, avant la boîte commune ; J.siens, que le tableau
   ne compte pas : il l'a payé).

   Ce que la partie garde (format 93) : v.panier ({ objet: n }), v.reste (pièces), v.achat ({ jour, objet } : son achat
   du jour), v.achats ([{ jour, objet, prix, ou ('etal' | 'bac') }] : les ACHATS_GARDES derniers), v.affaires ({ objet:
   n } : ses vêtements et ses meubles), v.provisions ({ objet: n } : ce qu'il s'est acheté à manger), v.commande ({ objet, n, prix (pour tout), arrive } ou null), v.plaisir ({ jour, bonheur } ou
   null), v.vente ({ jour, pieces } : la dernière vente de son panier) ; state.etal. Des entiers partout. Le chantier
   éteint (villageActif), rien ici ne se lit ni ne s'écrit. Les tests : tests/engine/village-bourse.test.mjs. */

const VG = () => DATA.VILLAGE || {};
const BO = () => VG().BOURSE || {};
const objet = (v) => !!v && typeof v === 'object' && !Array.isArray(v);
const entier = (n) => (Number.isFinite(Number(n)) ? Math.round(Number(n)) : 0);
const jourDe = (state) => Math.max(1, Math.floor(Number(state && state.day) || 1));
const nom = (o) => (DATA.OBJETS[o] ? DATA.OBJETS[o].nom : o);

// La valeur d'une unité de `o` sur l'île (0 : ce qui ne se vend pas, les pièces de la tournée).
export function valeurIle(o) {
  const d = DATA.OBJETS[o];
  return d && !d.invendable ? Math.max(0, entier(prixIle(o))) : 0;
}

/* ---------- la part ---------- */

// La part, en % (0 à 100).
export function partPct() {
  return Math.max(0, Math.min(100, Math.floor(Number(VG().PART) || 0)));
}

// Combien la ferme en a (le blé : l'inventaire et le Silo ; le reste : l'inventaire et le réfrigérateur).
function dispo(state, o) {
  return o === DATA.SILO.ITEM ? Math.floor(wheatTotal(state) + 1e-9) : Math.floor(stockCount(state, o) + 1e-9);
}
function prendre(state, o, n) {
  if (o === DATA.SILO.ITEM) return takeWheat(state, n, 'inventaire') ? n : 0;
  return takeStock(state, o, n);
}

// Ce que sa part vaudrait pour une journée (J : { produit, utilise }) : { net (sa valeur : le produit moins ce qu'il a
// pris), du (la part de net) }.
export function partDue(J) {
  let brut = 0, pris = 0;
  for (const [o, n] of Object.entries(objet(J && J.produit) ? J.produit : {})) if (o !== 'pieces') brut += Math.max(0, entier(n)) * valeurIle(o);
  for (const [o, n] of Object.entries(objet(J && J.utilise) ? J.utilise : {})) if (o !== 'pieces') pris += Math.max(0, entier(n)) * valeurIle(o);
  const net = Math.max(0, brut - pris);
  return { net, du: Math.floor((net * partPct()) / 100) };
}

// La nuit (villageoisNuit) : le villageois `v` garde sa part de la journée `J` (son entrée du journal). → la valeur
// prise (J.part), un entier.
export function prendrePart(state, v, J) {
  if (!villageActif(state) || !v || !J) return 0;
  if (!objet(v.panier)) v.panier = {};
  const reste = Math.max(0, entier(v.reste));
  const { du: part } = partDue(J);
  let du = part + reste, prise = 0;
  const produit = objet(J.produit) ? J.produit : {};
  // (ce qui ne se mange pas d'abord : la laine, le bois, la fibre ; puis ce qui se mange ; pas les graines, il faut
  // ressemer, sauf s'il n'a produit que cela ; à rang égal, le plus cher)
  const mangeable = (o) => (DATA.OBJETS[o].categorie === 'graine' ? 2 : DATA.OBJETS[o].energie > 0 ? 1 : 0);
  let candidats = Object.keys(produit).filter((o) => o !== 'pieces' && valeurIle(o) > 0 && entier(produit[o]) > 0)
    .sort((a, b) => mangeable(a) - mangeable(b) || valeurIle(b) - valeurIle(a) || (a < b ? -1 : 1));
  // (les graines, seulement s'il n'a produit que cela)
  if (candidats.some((o) => mangeable(o) < 2)) candidats = candidats.filter((o) => mangeable(o) < 2);
  for (const o of candidats) {
    const u = valeurIle(o);
    if (u > du) continue;
    const k = Math.min(entier(produit[o]), dispo(state, o), Math.floor(du / u));
    if (k <= 0) continue;
    const n = prendre(state, o, k);
    if (n <= 0) continue;
    v.panier[o] = (v.panier[o] || 0) + n;
    du -= n * u;
    prise += n * u;
  }
  // (un reste plus petit qu'un objet attend le lendemain ; jamais plus que l'objet le plus cher de sa journée)
  v.reste = candidats.length ? Math.min(du, Math.max(...candidats.map(valeurIle))) : Math.min(du, reste);
  return prise;
}

// La valeur de son panier (ce qui attend le bac).
export function valeurPanier(v) {
  return Object.entries(objet(v && v.panier) ? v.panier : {}).reduce((t, [o, n]) => t + Math.max(0, entier(n)) * valeurIle(o), 0);
}

/* ---------- au passage du bac ---------- */

const rngDe = (cle) => mulberry32(hache(cle));

// Ce qu'il adore et qui se commande : [objet], dans l'ordre.
function adores(v) {
  return Object.entries(objet(v.gouts) ? v.gouts : {}).filter(([o, g]) => g === 'adore' && valeurIle(o) > 0).map(([o]) => o).sort();
}

// Le prix d'un import pour lui (IMPORT : le prix de l'île × MARGE %, MIN au moins).
export function prixImport(o) {
  const I = BO().IMPORT || {};
  return Math.max(entier(I.MIN), Math.floor((valeurIle(o) * entier(I.MARGE || 100)) / 100));
}

// Le plaisir d'aujourd'hui (une cible de bonheur de plus, cette nuit).
function plaisir(v, jour, n) {
  if (!(n > 0)) return;
  v.plaisir = objet(v.plaisir) && v.plaisir.jour === jour ? { jour, bonheur: v.plaisir.bonheur + n } : { jour, bonheur: n };
}

// (fiche I5a, artisans.js : un achat au comptoir d'un commerce : son plaisir de cette nuit, et la liste de ses achats)
export function plaisirAchat(v, jour, envie, achat) {
  plaisir(v, jour, entier((BO().BONHEUR || {})[envie]));
  if (achat) noterAchat(v, { jour, objet: achat.objet, prix: Math.max(0, entier(achat.prix)), ou: achat.ou || 'commerce' });
}

function noterAchat(v, x) {
  if (!Array.isArray(v.achats)) v.achats = [];
  v.achats.push(x);
  const max = Math.max(1, entier(BO().ACHATS_GARDES) || 6);
  if (v.achats.length > max) v.achats.splice(0, v.achats.length - max);
}

// L'arrivée du bac du jour `jour` (bac.js, arriveeDuBac) : le panier de chacun se vend pour lui (sa bourse ; les objets
// partent dans les caisses du bac : `vendu`), sa commande arrive, et qui a de quoi en passe une. → { ventes ({ id:
// pieces }), commandes ({ id: objet }), livrees ({ id: objet }) }.
export function vendrePaniers(state, jour, vendu = null) {
  const out = { ventes: {}, commandes: {}, livrees: {} };
  if (!villageActif(state)) return out;
  const I = BO().IMPORT || {}, per = Math.max(1, Math.floor(Number(DATA.PORT && DATA.PORT.BAC && DATA.PORT.BAC.PERIODE) || 1));
  for (const v of villageoisDe(state)) {
    if (v.enfant) continue;
    const pieces = valeurPanier(v);
    if (pieces > 0) {
      v.bourse = Math.max(0, entier(v.bourse)) + pieces;
      if (vendu) for (const [o, n] of Object.entries(v.panier)) if (n > 0) vendu[o] = (vendu[o] || 0) + n;
      v.vente = { jour, pieces };
      out.ventes[v.id] = pieces;
    }
    v.panier = {};
    // (sa commande du passage d'avant arrive : son plaisir)
    if (objet(v.commande) && v.commande.arrive <= jour) {
      const c = v.commande, n = Math.max(1, entier(c.n) || 1);
      noterAchat(v, { jour, objet: c.objet, prix: c.prix, ou: 'bac' });
      plaisir(v, jour, entier(I.BONHEUR));
      // (ce qui se mange : ses provisions ; le reste, ses affaires)
      const sac = DATA.OBJETS[c.objet] && DATA.OBJETS[c.objet].energie > 0 ? 'provisions' : 'affaires';
      if (!objet(v[sac])) v[sac] = {};
      v[sac][c.objet] = (v[sac][c.objet] || 0) + n;
      out.livrees[v.id] = c.objet;
      v.commande = null;
    }
    // (une commande à lui : un objet qu'il adore, IMPORT.MAX au plus, sans descendre sous IMPORT.GARDE ; l'argent quitte
    // l'île)
    if (!v.commande && entier(v.bourse) >= entier(I.SEUIL) && I.SEUIL > 0) {
      const l = adores(v);
      if (!l.length) continue;
      const o = l[Math.floor(rngDe(`${farmSeed(state) || 'ile'}:import:${v.id}:${jour}`)() * l.length)];
      const prix = prixImport(o);
      const n = prix > 0 ? Math.min(Math.max(1, entier(I.MAX) || 1), Math.floor((entier(v.bourse) - entier(I.GARDE)) / prix)) : 0;
      if (n > 0) {
        v.bourse = entier(v.bourse) - n * prix;
        v.commande = { objet: o, n, prix: n * prix, arrive: jour + per };
        out.commandes[v.id] = o;
      }
    }
  }
  return out;
}

/* ---------- l'étal ---------- */

const ET = () => BO().ETAL || {};

// La case de l'étal posé (le premier), ou null.
export function caseEtal(state) {
  const B = state && state.blocs;
  if (!B) return null;
  // (I9d : une fois par pas du monde, blocs.js memoEnLot)
  return memoEnLot(state, 'caseEtal', () => {
    for (const [c, s] of Object.entries(B)) if (s === 'etal') return Number(c);
    return null;
  });
}

// L'étal de la partie (créé au besoin) : { objets: { objet: n }, avis: [] }.
export function etalDe(state) {
  if (!objet(state.etal)) state.etal = { objets: {}, avis: [] };
  if (!objet(state.etal.objets)) state.etal.objets = {};
  if (!Array.isArray(state.etal.avis)) state.etal.avis = [];
  return state.etal;
}

// Ce qui est en vente à l'étal : [{ objet, n, prix }], dans l'ordre des noms.
export function enVenteAlEtal(state) {
  const E = objet(state.etal) && objet(state.etal.objets) ? state.etal.objets : {};
  return Object.entries(E).filter(([o, n]) => DATA.OBJETS[o] && n > 0).map(([o, n]) => ({ objet: o, n, prix: valeurIle(o) }))
    .sort((a, b) => nom(a.objet).localeCompare(nom(b.objet), 'fr'));
}

// L'étal a-t-il quelque chose en vente (la scène : l'étal garni) ?
export function etalGarni(state) {
  return villageActif(state) && enVenteAlEtal(state).length > 0;
}

// Ce qui peut se mettre en vente : ce qui se vend sur l'île (un prix, ni invendable ni objet du chantier), sauf les
// outils et les pièces.
export function vendableALEtal(o) {
  const d = DATA.OBJETS[o];
  return !!d && !d.invendable && !d.village && valeurIle(o) > 0;
}

// Le joueur met `n` unités de `o` en vente (de l'inventaire, puis du réfrigérateur). → { ok, n } ou le refus.
export function mettreALEtal(state, o, n = 1) {
  if (!villageActif(state)) return fail('Pas d\'étal ici.');
  if (caseEtal(state) === null) return fail('Pose d\'abord ton étal (Atelier), dehors.');
  if (!vendableALEtal(o)) return fail(`${nom(o)} ne se vend pas à l'étal.`);
  const E = etalDe(state), places = Math.max(1, entier(ET().PLACES) || 6), max = Math.max(1, entier(ET().QUANTITE) || 20);
  const deja = entier(E.objets[o]);
  if (!deja && Object.values(E.objets).filter((x) => x > 0).length >= places) return fail(`L'étal est plein : ${places} sortes au plus.`);
  const q = Math.min(Math.max(0, Math.floor(Number(n)) || 0), max - deja, Math.floor(stockCount(state, o) + 1e-9));
  if (q <= 0) return fail(deja >= max ? `Pas plus de ${max} ${nom(o).toLowerCase()} à l'étal.` : `Tu n'as pas de ${nom(o).toLowerCase()}.`);
  const pris = takeStock(state, o, q);
  if (pris <= 0) return fail('Rien à mettre en vente.');
  E.objets[o] = deja + pris;
  return { ok: true, objet: o, n: pris };
}

// Le joueur reprend `n` unités de `o` de l'étal (à l'inventaire). → { ok, n } ou le refus.
export function reprendreDeLEtal(state, o, n = 1) {
  const E = etalDe(state), deja = entier(E.objets[o]);
  const q = Math.min(deja, Math.max(0, Math.floor(Number(n)) || 0));
  if (q <= 0) return fail('Rien à reprendre.');
  addItem(state, o, q);
  if (deja - q > 0) E.objets[o] = deja - q;
  else delete E.objets[o];
  return { ok: true, objet: o, n: q };
}

/* ---------- les achats ---------- */

const RANG = { adore: 3, besoin: 2, aime: 1 };

// En a-t-il besoin (BESOINS : un vêtement, un meuble pour sa maison, une fois chacun) ?
export function besoinDe(v, o) {
  const B = BO().BESOINS || {}, a = objet(v.affaires) ? v.affaires : {};
  if (a[o] > 0) return false;
  if ((B.vetement || []).includes(o)) return true;
  return (B.meuble || []).includes(o) && v.maison !== null && v.maison !== undefined;
}

// Ce que `o` est pour lui : 'adore', 'besoin', 'aime', ou null (il ne l'achète pas : neutre, ou détesté).
export function envieDe(v, o) {
  const g = goutPour(v, o);
  if (g === 'deteste') return null;
  if (g === 'adore') return 'adore';
  if (besoinDe(v, o)) return 'besoin';
  return g === 'aime' ? 'aime' : null;
}

// Peut-il aller à l'étal aujourd'hui (un adulte chez lui, qui ne se repose pas) ?
function acheteur(v) {
  return !v.enfant && !v.repos && !v.accueil;
}

let memoCle = null, memoAchats = null;

// Qui va à l'étal aujourd'hui, et pour quoi : Map(id → { objet, fait }) (fait : il l'a déjà acheté). Dans l'ordre des
// id, chacun prend ce qu'il préfère parmi ce qui reste (ce qu'il adore, ce dont il a besoin, ce qu'il aime ; à égalité,
// le plus cher qu'il peut payer) ; ACHATS par jour au plus (un). Rien sans étal posé.
export function achatsDuJour(state, jour = jourDe(state)) {
  const out = new Map();
  if (!villageActif(state) || caseEtal(state) === null) return out;
  const V = [...villageoisDe(state)].sort((a, b) => (a.id < b.id ? -1 : 1));
  const stock = { ...((objet(state.etal) && state.etal.objets) || {}) };
  const cle = JSON.stringify([jour, stock, V.map((v) => [v.id, entier(v.bourse), !!v.enfant, !!v.repos, v.accueil || 0, v.maison ?? null, v.affaires || 0, v.achat || 0, v.gouts || 0])]);
  if (memoCle === cle && memoAchats && memoAchats.s === state) return memoAchats.m;
  for (const v of V) {
    if (objet(v.achat) && v.achat.jour === jour) { out.set(v.id, { objet: v.achat.objet, fait: true }); continue; }
    if (!acheteur(v) || entier(BO().ACHATS) <= 0) continue;
    let mieux = null;
    for (const [o, n] of Object.entries(stock)) {
      if (!(n > 0) || !DATA.OBJETS[o]) continue;
      const e = envieDe(v, o), p = valeurIle(o);
      if (!e || p <= 0 || p > entier(v.bourse)) continue;
      const c = { o, r: RANG[e], p };
      if (!mieux || c.r > mieux.r || (c.r === mieux.r && (c.p > mieux.p || (c.p === mieux.p && o < mieux.o)))) mieux = c;
    }
    if (!mieux) continue;
    stock[mieux.o] -= 1;
    out.set(v.id, { objet: mieux.o, fait: false });
  }
  memoCle = cle;
  memoAchats = { s: state, m: out };
  return out;
}

// La signature des achats du jour (la clé de la journée, villageois-journee.js) : qui va à l'étal, et la case de l'étal.
export function achatsSignature(state, jour = jourDe(state)) {
  const m = achatsDuJour(state, jour);
  return m.size ? [caseEtal(state), [...m].map(([id, a]) => [id, a.objet])] : 0;
}

// Les cases d'où l'on achète à l'étal : celles du dessous de ses deux cases (devant lui), sinon à ses côtés, sinon
// derrière ; celles où l'on passe (pas un bloc qui bloque, ni une case couverte par un meuble). → [case].
export function devantEtal(state) {
  const c = caseEtal(state);
  if (c === null) return [];
  const T = farmTerrain(state), W = T.LARGEUR, H = T.HAUTEUR || Infinity;
  const larg = Math.max(1, entier((DATA.ATELIER.BLOCS.etal || {}).largeur) || 1);
  const couvertes = casesCouvertes(state);
  const libre = (t) => t >= 0 && Math.floor(t / W) < H && !blocBloque(state, t) && !couvertes.has(t);
  const rangs = [Array.from({ length: larg }, (_, k) => c + k + W), [c - 1, c + larg], Array.from({ length: larg }, (_, k) => c + k - W)];
  for (const r of rangs) {
    const l = r.filter(libre);
    if (l.length) return l;
  }
  return [];
}

// Ce qu'il dit en arrivant à l'étal (BOURSE.PHRASES, tirée du jour et de son id).
export function phraseEtal(state, id, o) {
  const P = BO().PHRASES || [];
  if (!P.length || !DATA.OBJETS[o]) return '';
  const p = P[Math.floor(rngDe(`${farmSeed(state) || 'ile'}:etal:${id}:${jourDe(state)}`)() * P.length)];
  const d = DATA.OBJETS[o], n = d.nom.charAt(0).toLowerCase() + d.nom.slice(1);
  return p.replace('{objet}', `${n} ${d.icone}`).replace(/^./, (x) => x.toUpperCase());
}

// Il achète `o` à l'étal. → { ok, objet, prix, envie } ou le refus.
export function acheterALEtal(state, id, o) {
  const v = trouverVillageois(state, id);
  if (!v) return fail('Villageois inconnu.');
  const E = etalDe(state), jour = jourDe(state);
  if (caseEtal(state) === null) return fail('Pas d\'étal posé.');
  if (!(entier(E.objets[o]) > 0)) return fail('Plus en vente.');
  if (objet(v.achat) && v.achat.jour === jour) return fail('Déjà un achat aujourd\'hui.');
  const envie = envieDe(v, o), prix = valeurIle(o);
  if (!envie || prix <= 0) return fail('Il n\'en veut pas.');
  if (entier(v.bourse) < prix) return fail('Pas assez dans sa bourse.');
  E.objets[o] = entier(E.objets[o]) - 1;
  if (E.objets[o] <= 0) delete E.objets[o];
  v.bourse = entier(v.bourse) - prix;
  earn(state, prix, `Étal : ${nom(o)}`);
  v.achat = { jour, objet: o };
  noterAchat(v, { jour, objet: o, prix, ou: 'etal' });
  if (envie === 'besoin') { if (!objet(v.affaires)) v.affaires = {}; v.affaires[o] = (v.affaires[o] || 0) + 1; }
  // (ce qui se mange, il le mange : ses provisions, à son prochain repas)
  else if (DATA.OBJETS[o].energie > 0) { if (!objet(v.provisions)) v.provisions = {}; v.provisions[o] = (v.provisions[o] || 0) + 1; }
  plaisir(v, jour, entier((BO().BONHEUR || {})[envie]));
  // (I9d : dans la partie d'un monde de l'île, l'avis porte son pas : la page ne le redit pas quand sa partie est refaite)
  E.avis.push({ id: v.id, objet: o, prix, envie, ...(state.horloge && Number.isInteger(state.horloge.pas) ? { pas: state.horloge.pas } : {}) });
  if (E.avis.length > 20) E.avis.splice(0, E.avis.length - 20);
  return { ok: true, objet: o, prix, envie };
}

// Le créneau de l'étal de `id` aujourd'hui (sa journée) : { de, a } ou null.
function creneauEtal(state, id) {
  const segs = journeeDuVillage(state).get(id) || [];
  const s = segs.find((x) => x.but && x.but.sorte === 'etal');
  return s ? { de: s.de, a: s.a } : null;
}

// À chaque pas de la ferme (energy.js) : qui est à l'étal depuis la moitié de son créneau y achète. → les achats faits.
export function avancerAchats(state) {
  if (!villageActif(state) || nightActive(state) || caseEtal(state) === null || !Array.isArray(state.villageois) || !state.villageois.length) return 0;
  const h = clockHours(state);
  let n = 0;
  for (const [id, a] of achatsDuJour(state)) {
    if (a.fait) continue;
    const c = creneauEtal(state, id);
    if (c && h >= (c.de + c.a) / 2 && acheterALEtal(state, id, a.objet).ok) n++;
  }
  return n;
}

// La nuit (runNight, avant la nuit des villageois) : l'achat du jour qu'on n'a pas vu (la page fermée) se fait. → les
// achats faits.
export function achatsNuit(state) {
  if (!villageActif(state) || caseEtal(state) === null) return 0;
  let n = 0;
  for (const [id, a] of achatsDuJour(state)) if (!a.fait && creneauEtal(state, id) && acheterALEtal(state, id, a.objet).ok) n++;
  return n;
}

// Mange dans `sac` ({ objet: n }) jusqu'à `besoin` (les plus nourrissants d'abord). → { mange, energie }.
function mangerDans(sac, besoin, mange = {}, energie = 0) {
  if (!objet(sac)) return { mange, energie };
  for (const o of Object.keys(sac).sort((a, b) => (DATA.OBJETS[b] ? DATA.OBJETS[b].energie : 0) - (DATA.OBJETS[a] ? DATA.OBJETS[a].energie : 0) || (a < b ? -1 : 1))) {
    const e = DATA.OBJETS[o] ? DATA.OBJETS[o].energie || 0 : 0;
    while (energie < besoin && sac[o] > 0 && e > 0) {
      sac[o] -= 1;
      energie += e;
      mange[o] = (mange[o] || 0) + 1;
    }
    if (!(sac[o] > 0)) delete sac[o];
  }
  return { mange, energie };
}

// Son repas de la nuit (villageois.js nuitDe), avant la boîte commune : ce qu'il s'est acheté (v.provisions), jusqu'à
// son besoin ; ce qui reste attend le lendemain. → { mange ({ objet: n }), energie }.
export function mangerSesProvisions(v, besoin) {
  return mangerDans(v && v.provisions, besoin);
}

// Après la boîte commune, s'il a encore faim : sa part qui attend le bac (v.panier) est à lui, il en mange (elle ne se
// vendra pas). → { mange, energie }.
export function mangerSonPanier(v, besoin) {
  return mangerDans(v && v.panier, besoin);
}

// Le plaisir de cette nuit (la cible de bonheur de sa nuit, villageois.js nuitDe).
export function plaisirDuJour(v, jour) {
  return objet(v && v.plaisir) && v.plaisir.jour === jour ? Math.max(0, entier(v.plaisir.bonheur)) : 0;
}

// Ce que la page doit dire (un achat à l'étal) : [{ id, objet, prix, envie }] ; retirés.
export function prendreAvisEtal(state) {
  if (!villageActif(state) || !objet(state.etal) || !Array.isArray(state.etal.avis) || !state.etal.avis.length) return [];
  const out = state.etal.avis;
  state.etal.avis = [];
  return out;
}

// Sa bourse, pour la fiche : { bourse, panier ([{ objet, n }]), valeurPanier, reste, achats, commande, vente, affaires }.
export function bourseDe(state, id) {
  const v = trouverVillageois(state, id);
  if (!v) return null;
  return {
    bourse: Math.max(0, entier(v.bourse)),
    panier: Object.entries(objet(v.panier) ? v.panier : {}).filter(([o, n]) => n > 0 && DATA.OBJETS[o]).map(([o, n]) => ({ objet: o, n })),
    valeurPanier: valeurPanier(v), reste: Math.max(0, entier(v.reste)),
    achats: Array.isArray(v.achats) ? [...v.achats].reverse() : [],
    commande: objet(v.commande) ? { ...v.commande } : null,
    vente: objet(v.vente) ? { ...v.vente } : null,
    affaires: objet(v.affaires) ? { ...v.affaires } : {},
    part: partPct(),
  };
}

// Ce qu'une sauvegarde garde d'un villageois (la migration 92 → 93) : ce qui est lisible.
export function reparerBourse(v) {
  if (!objet(v)) return v;
  const comptes = (o) => Object.fromEntries(Object.entries(objet(o) ? o : {}).filter(([k, n]) => DATA.OBJETS[k] && Number.isInteger(n) && n > 0));
  const jourObjet = (x) => (objet(x) && Number.isInteger(x.jour) && DATA.OBJETS[x.objet] ? { jour: x.jour, objet: x.objet } : null);
  return {
    ...v,
    bourse: Math.max(0, entier(v.bourse)),
    panier: comptes(v.panier),
    reste: Math.max(0, entier(v.reste)),
    achat: jourObjet(v.achat),
    achats: (Array.isArray(v.achats) ? v.achats : []).filter((x) => objet(x) && Number.isInteger(x.jour) && DATA.OBJETS[x.objet])
      .map((x) => ({ jour: x.jour, objet: x.objet, prix: Math.max(0, entier(x.prix)), ou: x.ou === 'bac' || x.ou === 'commerce' ? x.ou : 'etal' })),
    affaires: comptes(v.affaires),
    provisions: comptes(v.provisions),
    commande: objet(v.commande) && DATA.OBJETS[v.commande.objet] && Number.isInteger(v.commande.arrive)
      ? { objet: v.commande.objet, n: Math.max(1, entier(v.commande.n) || 1), prix: Math.max(0, entier(v.commande.prix)), arrive: v.commande.arrive } : null,
    plaisir: objet(v.plaisir) && Number.isInteger(v.plaisir.jour) ? { jour: v.plaisir.jour, bonheur: Math.max(0, entier(v.plaisir.bonheur)) } : null,
    vente: objet(v.vente) && Number.isInteger(v.vente.jour) ? { jour: v.vente.jour, pieces: Math.max(0, entier(v.vente.pieces)) } : null,
  };
}

// L'étal d'une sauvegarde : { objets (lisibles), avis: [] }.
export function reparerEtal(e) {
  const o = objet(e) && objet(e.objets) ? e.objets : {};
  return { objets: Object.fromEntries(Object.entries(o).filter(([k, n]) => DATA.OBJETS[k] && Number.isInteger(n) && n > 0)), avis: [] };
}
