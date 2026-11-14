import { DATA, prixIle } from './catalog.js';
import { fail, canPay, NO_COINS, pay } from './devices.js';
import { earn } from './compta.js';
import { villageActif } from './village.js';
import { mulberry32 } from './base.js';
import { hache } from './ferme-generee.js';
import { farmSeed, farmTerrain } from './terrain.js';
import { addItem, countItem, takeItem } from './inventory.js';
import { goutPour, palierAmitie, pointsAmitie } from './amitie.js';
import { trouverVillageois, villageoisDe } from './villageois.js';
import { blocBloque, casesCouvertes, piecesCloses } from './blocs.js';
import { commerceOuvert, noterChronique } from './chronique.js';
import { commerceEnPhrase, nomDe } from './noms.js';
import { fixerFeteOuverture } from './fetes-village.js';
import { couleursEnseigne } from './vocation-village.js';
import { journeeDuVillage } from './villageois-journee.js';
import { plaisirAchat } from './bourse.js';
import { clockHours, nightActive } from './clock.js';

/* ---------- les commerces d'artisans (le chantier « l'île à bâtir », fiche I5a) ----------

   Le socle des commerces (D5 : artisanaux, un établi, un artisan, peu de pièces par jour, pas d'électricité) et le
   premier d'entre eux, la forge. Les réglages : DATA.ARTISANS (data/village.json, section ARTISANS) ; chaque sorte de
   commerce (ARTISANS.COMMERCES : forge, puis la mercerie d'I5b, la scierie, la boulangerie et la fromagerie d'I5c) n'y
   ajoute que ses données : son établi et son enseigne (des blocs, data/recipes.json), la tâche de sa filière, ses
   recettes, ses clients.

   - Le local : une pièce close (blocs.js piecesCloses, du genre « commerce ») où sont posés l'établi de la sorte (le bloc
     clé, `etabli`) et un comptoir (ARTISANS.COMPTOIR), et son enseigne (`enseigne`) posée dehors, à ARTISANS.ENSEIGNE
     cases au plus d'une porte de la pièce (localDe, locaux).
   - L'envie : un villageois qui a fait JOURS jours la tâche de la filière (v.pratique, compté la nuit : artisansNuit)
     manifeste l'envie d'ouvrir ce commerce (v.envies = { sorte: jour }) : une ligne à la chronique (le type « envie »),
     sa bulle quand on lui parle (envieAParler, villageois-amitie.js), une marque sur sa fiche. Elle ne s'éteint pas.
   - Ouvrir (D15, ouvrirCommerce) : l'envie, l'amitié du villageois avec le joueur au palier ARTISANS.AMITIE (amitie.js
     palierAmitie), un local libre ; puis le joueur décide (le bouton de la fiche). Rien n'est caché : conditionsCommerce
     dit ce qui manque. À l'ouverture : le nom et la ligne de la chronique (chronique.js commerceOuvert), la fête de
     l'ouverture (fetes-village.js fixerFeteOuverture) ; le villageois est nommé artisan, sa tâche est celle du commerce
     (v.tache = la sorte : taches.js tacheDef la lit ici, tacheCommerce ; v.commerce = l'id du commerce).
   - Le travail : sa journée de travail se passe à l'établi (taches.js : le poste devant l'établi, postesCommerce) ; une
     action est un lot (lotCommerce) ; LOTS lots par jour, un de plus tous les ANCIENNETE jours de travail, LOTS_MAX au
     plus (lotsDuJour) ; l'amitié lui apprend des recettes (le palier de chacune : recettesConnues). Un lot : d'abord une
     commande du joueur (payée d'avance, ou à façon : il a apporté la matière), sinon la première recette connue (dans
     l'ordre des données : il fond d'abord ses lingots) dont son comptoir a moins de STOCK. Les matières : son stock, puis le coffre de la ferme (l'inventaire du joueur, en lui laissant
     GARDE de chacune), achetées de sa bourse au prix de vente de l'île (prixArtisan) : les pièces vont au joueur. Sa
     bourse vide, il ne fait que les commandes.
   - La vente : au joueur (acheterAuCommerce, au prix de vente) ; aux villageois (achatsCommercesDuJour : un achat par
     jour au plus, après le travail, au comptoir : ce qu'ils aiment, et ce dont ils ont besoin, CLIENTS : une lame tous
     les ENTRETIEN jours pour qui tient un outil ; leur journée leur donne ce créneau, villageois-journee.js ; le moteur
     fait l'achat au milieu, avancerCommerces ; la nuit, celui qu'on n'a pas vu) ; au bac (commercesAuBac, bac.js : ce
     qui dépasse BAC de chaque pièce qui se vend au port).
   - Le journal du commerce (c.journal, JOURNAL jours : { jour, lots, fait, achete, paye, ventes: { joueur, villageois,
     bac }, facon }) et la ligne « commerce » du tableau (tableau.js, bilanCommerce).
   - Ce que la forge fait, l'Atelier du joueur ne le fait plus une fois une forge ouverte qui le sait (les recettes de
     l'Atelier marquées commerce, atelier.js recetteDebloquee, lit c.connues) : sans forge, le joueur reste autonome.

   Ce que la partie garde (format 99) : state.commerces ([{ id, sorte, qui, ouvert, depuis, jours, etabli, stock,
   commandes, seq, connues, journal, avis, lettres (I8a : la couleur des lettres de l'enseigne, couleursEnseigne) }] ; les paliers de l'île, paliers.js, le comptent), et sur chaque villageois :
   v.pratique ({ tâche: jours }), v.envies ({ sorte: jour }), v.commerce (l'id de son commerce), v.achatCommerce ({ jour,
   objet, commerce }), v.entretien (le jour de sa dernière lame). Des entiers partout. Le chantier éteint
   (villageActif), rien ne se lit ni ne s'écrit. Les tests : tests/engine/village-artisans.test.mjs. */

const AR = () => DATA.ARTISANS || {};
const SORTES = () => AR().COMMERCES || {};
const objet = (v) => !!v && typeof v === 'object' && !Array.isArray(v);
const entier = (n) => (Number.isFinite(Number(n)) ? Math.round(Number(n)) : 0);
const jourDe = (state) => Math.max(1, Math.floor(Number(state && state.day) || 1));
const nom = (o) => (DATA.OBJETS[o] ? DATA.OBJETS[o].nom : o);
const minuscule = (t) => (t ? t.charAt(0).toLowerCase() + t.slice(1) : t);
const rngDe = (cle) => mulberry32(hache(cle));
const graineDe = (state) => farmSeed(state) || 'ile';
const reglage = (k, d) => (Number.isFinite(Number(AR()[k])) ? Number(AR()[k]) : d);

/* ---------- les sortes de commerces ---------- */

// Les sortes de commerces (ARTISANS.COMMERCES), dans l'ordre des données.
export function sortesCommerces() {
  return Object.keys(SORTES()).filter((k) => !k.startsWith('//'));
}

// La définition de la sorte `sorte`, ou null.
export function defCommerce(sorte) {
  return (typeof sorte === 'string' && !sorte.startsWith('//') && objet(SORTES()[sorte]) && SORTES()[sorte]) || null;
}

// Est-ce la tâche d'un commerce (son id est la sorte) ?
export function estTacheCommerce(id) {
  return !!defCommerce(id);
}

// La tâche du commerce `sorte`, telle que taches.js la lit (tacheDef) : { nom, icone, ACTIONS (LOTS), outil (aucun),
// lieu ('commerce'), geste, emoji, donne, SANS, PHRASES, commerce: sorte }, ou null. Elle n'est pas dans TACHES.LISTE :
// le joueur ne la confie pas, elle vient avec l'ouverture.
const tachesMemo = new Map();
export function tacheCommerce(sorte) {
  const d = defCommerce(sorte);
  if (!d) return null;
  const m = tachesMemo.get(sorte);
  if (m && m.d === d && m.lots === AR().LOTS) return m.t;
  const t = {
    nom: d.nom, icone: d.icone, ACTIONS: Math.max(1, Math.floor(reglage('LOTS', 3))), outil: null, lieu: 'commerce',
    geste: d.geste || 'ramasse', emoji: d.emoji || d.icone, donne: d.donne || '', SANS: d.SANS || '', PHRASES: d.PHRASES || [], commerce: sorte,
  };
  tachesMemo.set(sorte, { d, lots: AR().LOTS, t });
  return t;
}

// Le prix d'une unité de `o` au comptoir (le prix de vente de l'île ; un lingot, invendable au port, a le sien : il se
// vend au comptoir) : un entier, une pièce au moins.
export function prixArtisan(o) {
  return DATA.OBJETS[o] ? Math.max(1, entier(prixIle(o))) : 0;
}

// La valeur au port d'une unité de `o` (0 : ce qui ne s'y vend pas, les lingots).
function valeurPort(o) {
  const d = DATA.OBJETS[o];
  return d && !d.invendable ? Math.max(0, entier(prixIle(o))) : 0;
}

// Les recettes de la sorte : [{ id, entrees, sortie (l'objet), qte, palier }], dans l'ordre des données.
export function recettesDe(sorte) {
  const d = defCommerce(sorte);
  return Object.entries((d && d.RECETTES) || {}).filter(([k, r]) => !k.startsWith('//') && objet(r) && objet(r.sortie)).map(([id, r]) => {
    const [sortie, qte] = Object.entries(r.sortie)[0];
    return { id, entrees: { ...(r.entrees || {}) }, sortie, qte: Math.max(1, entier(qte)), palier: Math.max(0, entier(r.palier)) };
  });
}

const recetteDe = (sorte, id) => recettesDe(sorte).find((r) => r.id === id) || null;

/* ---------- les commerces de la partie ---------- */

// Les commerces de la partie (state.commerces), lisibles ; [] le chantier éteint.
export function commercesDe(state) {
  if (!state || !villageActif(state) || !Array.isArray(state.commerces)) return [];
  return state.commerces.filter((c) => objet(c) && defCommerce(c.sorte));
}

// Les commerces ouverts.
export function commercesOuverts(state) {
  return commercesDe(state).filter((c) => c.ouvert !== false);
}

export function commerceDe(state, id) {
  return commercesDe(state).find((c) => c.id === id) || null;
}

// Le commerce que tient le villageois `vid` (ouvert), ou null.
export function commerceDuVillageois(state, vid) {
  return commercesOuverts(state).find((c) => c.qui === vid) || null;
}

// Y a-t-il un commerce ouvert de la sorte `sorte` ?
export function commerceOuvertDeSorte(state, sorte) {
  return commercesOuverts(state).some((c) => c.sorte === sorte);
}

// Le nom d'un commerce (I7g : noms.js), sinon celui de sa sorte.
export function nomCommerce(state, c) {
  return (c && nomDe(state, 'commerce', c.id)) || (c && defCommerce(c.sorte) ? defCommerce(c.sorte).nom : 'Le commerce');
}

/* ---------- le local ---------- */

const W = (state) => farmTerrain(state).LARGEUR;
const distance = (w, a, b) => Math.max(Math.abs((a % w) - (b % w)), Math.abs(Math.floor(a / w) - Math.floor(b / w)));

// Les locaux bâtis de la sorte `sorte` : [{ piece, etabli, comptoir, enseigne (case, ou null), complet }], dans l'ordre
// des pièces ; l'établi et le comptoir sont dans la pièce, l'enseigne dehors, à ENSEIGNE cases au plus d'une de ses portes.
export function locaux(state, sorte) {
  const d = defCommerce(sorte);
  if (!d || !villageActif(state)) return [];
  const B = state.blocs || {}, w = W(state), comptoir = AR().COMPTOIR || 'comptoir', R = Math.max(1, Math.floor(reglage('ENSEIGNE', 2)));
  const enseignes = Object.keys(B).map(Number).filter((t) => B[t] === d.enseigne).sort((a, b) => a - b);
  const out = [];
  for (const p of piecesCloses(state)) {
    const etabli = p.cases.find((t) => B[t] === d.etabli);
    if (etabli === undefined) continue;
    const co = p.cases.find((t) => B[t] === comptoir);
    const en = enseignes.find((e) => p.portes.some((q) => distance(w, e, q) <= R));
    out.push({ piece: p, etabli, comptoir: co ?? null, enseigne: en ?? null, complet: co !== undefined && en !== undefined });
  }
  return out;
}

// Le local du commerce `c` (celui de son établi ; sinon un local complet de sa sorte que nul autre n'a pris), ou null.
export function localDe(state, c) {
  if (!c) return null;
  const L = locaux(state, c.sorte);
  const ici = L.find((l) => l.etabli === c.etabli);
  if (ici) return ici;
  const pris = new Set(commercesOuverts(state).filter((x) => x !== c && x.sorte === c.sorte).map((x) => x.etabli));
  return L.find((l) => l.complet && !pris.has(l.etabli)) || null;
}

// Un local complet de la sorte, libre (aucun commerce ouvert ne le tient), ou null.
export function localLibre(state, sorte) {
  const pris = new Set(commercesOuverts(state).filter((c) => c.sorte === sorte).map((c) => c.etabli));
  return locaux(state, sorte).find((l) => l.complet && !pris.has(l.etabli)) || null;
}

// Ce qui manque au local de la sorte (un texte), ou '' : il est bâti.
function manqueLocal(state, sorte) {
  const d = defCommerce(sorte), L = locaux(state, sorte), M = d.LOCAL || {};
  const n = (b) => { const s = DATA.ATELIER.BLOCS[b]; return s ? minuscule(s.nom) : b; };
  const etabli = M.etabli || n(d.etabli), enseigne = M.enseigne || n(d.enseigne);
  if (localLibre(state, sorte)) return '';
  if (!L.length) return `le local : une pièce close (des murs, une porte) avec ${etabli} et un comptoir, et ${enseigne} dehors, près de la porte`;
  const l = L[0];
  if (l.comptoir === null) return `un comptoir dans la pièce où sont ${etabli}`;
  if (l.enseigne === null) return `${enseigne} dehors, à ${Math.floor(reglage('ENSEIGNE', 2))} cases au plus de la porte`;
  return 'un local libre : celui-ci est déjà tenu';
}

// Le poste de l'artisan (taches.js, le lieu « commerce ») : la case libre devant son établi (dessous, sinon à côté), dans
// la pièce, tourné vers lui. → [{ case, vers, dedans }] ou [] (le local n'est plus complet : la tâche attend).
export function postesCommerce(state, v) {
  const c = v && commerceDuVillageois(state, v.id);
  const l = c && localDe(state, c);
  if (!l || !l.complet) return [];
  const w = W(state), B = state.blocs || {}, couvertes = casesCouvertes(state), dedans = new Set(l.piece.cases);
  const larg = Math.max(1, entier((DATA.ATELIER.BLOCS[defCommerce(c.sorte).etabli] || {}).largeur) || 1);
  const cases = Array.from({ length: larg }, (_, k) => l.etabli + k);
  const libre = (q) => dedans.has(q) && B[q] === undefined && !couvertes.has(q) && !l.piece.paillasses.includes(q);
  // (devant l'enclume, à droite de l'établi d'abord ; sinon devant le reste, ou à côté)
  const q = [...cases].reverse().map((t) => t + w).concat([l.etabli - 1, l.etabli + larg]).find(libre);
  if (q === undefined) return [];
  const vers = q >= l.etabli + w ? q - w : q < l.etabli ? l.etabli : l.etabli + larg - 1;
  return [{ case: q, vers, dedans: true }];
}

// Les cases d'où l'on achète au comptoir de `c` : devant lui (dessous), sinon à ses côtés, dans la pièce. → [case].
export function devantComptoir(state, c) {
  const l = localDe(state, c);
  if (!l || l.comptoir === null) return [];
  const w = W(state), B = state.blocs || {}, couvertes = casesCouvertes(state), dedans = new Set(l.piece.cases);
  const larg = Math.max(1, entier((DATA.ATELIER.BLOCS[AR().COMPTOIR || 'comptoir'] || {}).largeur) || 1);
  const libre = (q) => dedans.has(q) && B[q] === undefined && !couvertes.has(q) && !blocBloque(state, q);
  const rangs = [Array.from({ length: larg }, (_, k) => l.comptoir + k + w), [l.comptoir - 1, l.comptoir + larg]];
  for (const r of rangs) { const x = r.filter(libre); if (x.length) return x; }
  return [];
}

/* ---------- l'envie, les conditions, l'ouverture ---------- */

// Le palier d'amitié qu'il faut (ARTISANS.AMITIE) et son nom.
function palierVoulu() {
  return Math.max(0, Math.floor(reglage('AMITIE', 2)));
}
const nomPalier = (p) => (((DATA.RECIT || {}).PALIER_NOMS || [])[p]) || `palier ${p}`;
const seuilPalier = (p) => (((DATA.RECIT || {}).PALIERS || [])[p]) ?? 0;

// Les jours qu'il a faits de la tâche `t` (v.pratique).
export function joursPratiques(v, t) {
  return objet(v && v.pratique) ? Math.max(0, entier(v.pratique[t])) : 0;
}

// Les envies du villageois : [{ sorte, jour }] (v.envies), dans l'ordre des sortes.
export function enviesDe(v) {
  const E = objet(v && v.envies) ? v.envies : {};
  return sortesCommerces().filter((s) => Number.isInteger(E[s])).map((s) => ({ sorte: s, jour: E[s] }));
}

// Une sorte de commerce dans une phrase : « une forge » (COMMERCES[sorte].un).
function unCommerce(sorte) {
  const d = defCommerce(sorte);
  return (d && d.un) || 'un commerce';
}

// Les conditions d'ouverture du commerce `sorte` par le villageois `vid` : { ok, envie: { ok, texte }, amitie: { ok,
// texte, manque (points) }, local: { ok, texte }, deja (son commerce ouvert, ou null) } ; null inconnu.
export function conditionsCommerce(state, vid, sorte) {
  const v = trouverVillageois(state, vid), d = defCommerce(sorte);
  if (!v || !d || !villageActif(state)) return null;
  const J = Math.max(1, Math.floor(reglage('JOURS', 10))), fait = joursPratiques(v, d.tache);
  const envie = objet(v.envies) && Number.isInteger(v.envies[sorte]);
  const T = (DATA.TACHES && DATA.TACHES.LISTE && DATA.TACHES.LISTE[d.tache]) || {};
  const p = palierAmitie(state, vid), voulu = palierVoulu(), pts = Math.max(0, Math.ceil(seuilPalier(voulu) - pointsAmitie(state, vid)));
  const manque = manqueLocal(state, sorte);
  const deja = commerceDuVillageois(state, vid);
  const Il = v.genre === 'm' ? 'Il' : 'Elle', lui = v.genre === 'm' ? 'lui' : 'elle';
  const out = {
    envie: { ok: envie, texte: envie ? `${Il} en a envie (depuis le jour ${v.envies[sorte]}).` : `${Il} en aura envie après ${J} jours à « ${T.nom || d.tache} » (${Math.min(fait, J)} / ${J}).` },
    amitie: { ok: p >= voulu, texte: p >= voulu ? `Votre amitié est « ${nomPalier(p)} ».` : `Il faut être « ${nomPalier(voulu)} » avec ${lui} (encore ${pts} point${pts > 1 ? 's' : ''} d'amitié).`, manque: p >= voulu ? 0 : pts },
    local: { ok: !manque, texte: manque ? `Il manque ${manque}.` : 'Le local est bâti.' },
    deja,
  };
  out.ok = out.envie.ok && out.amitie.ok && out.local.ok && !v.enfant && !deja;
  return out;
}

// Ce que la fiche du villageois montre de ses commerces : [{ sorte, nom, icone, envie (jour ou null), conditions,
// commerce (le sien, ouvert, ou null) }] : les sortes dont il a l'envie ou qu'il tient.
export function commercesPourLaFiche(state, vid) {
  const v = trouverVillageois(state, vid);
  if (!v || !villageActif(state)) return [];
  const sien = commerceDuVillageois(state, vid);
  return sortesCommerces().filter((s) => (sien && sien.sorte === s) || (objet(v.envies) && Number.isInteger(v.envies[s]))).map((s) => {
    const d = defCommerce(s);
    return { sorte: s, nom: d.nom, icone: d.icone, envie: objet(v.envies) && Number.isInteger(v.envies[s]) ? v.envies[s] : null, conditions: conditionsCommerce(state, vid, s), commerce: sien && sien.sorte === s ? sien : null };
  });
}

// Sa bulle quand on lui parle (villageois-amitie.js parlerVillageois) : l'envie d'un commerce qu'il n'a pas encore
// (ARTISANS.COMMERCES[sorte].ENVIE), à la première conversation du jour, puis une fois sur deux. → { sorte, texte } ou null.
export function envieAParler(state, v, premiere = true, n = 0) {
  if (!v || !villageActif(state) || commerceDuVillageois(state, v.id)) return null;
  const e = enviesDe(v)[0];
  if (!e || !(premiere || Math.floor(Number(n) || 0) % 2 === 0)) return null;
  const L = defCommerce(e.sorte).ENVIE || [];
  if (!L.length) return null;
  const r = rngDe(`${graineDe(state)}:envie:${v.id}:${jourDe(state)}`);
  return { sorte: e.sorte, texte: L[Math.floor(r() * L.length)] };
}

const nouveauJournal = (jour) => ({ jour, lots: 0, fait: {}, achete: {}, paye: 0, ventes: { joueur: 0, villageois: 0, bac: 0 }, facon: 0 });

// Le joueur décide : le villageois `vid` ouvre le commerce `sorte` dans un local libre. → { ok, commerce, nom, fete } ou
// un refus (ce qui manque).
export function ouvrirCommerce(state, vid, sorte) {
  if (!villageActif(state)) return fail('Le chantier de l\'île n\'est pas allumé.');
  const v = trouverVillageois(state, vid), d = defCommerce(sorte);
  if (!v || !d) return fail('Commerce inconnu.');
  if (v.enfant) return fail('Les enfants ne tiennent pas de commerce.');
  const C = conditionsCommerce(state, vid, sorte);
  if (C.deja) return fail(`${v.prenom} tient déjà ${commerceEnPhrase(nomCommerce(state, C.deja), C.deja.sorte)}.`);
  for (const k of ['envie', 'amitie', 'local']) if (!C[k].ok) return fail(C[k].texte);
  const l = localLibre(state, sorte);
  if (!Array.isArray(state.commerces)) state.commerces = [];
  const n = state.commerces.filter((c) => objet(c) && c.sorte === sorte).length + 1;
  let id = `${sorte}-${n}`;
  for (let k = n; state.commerces.some((c) => objet(c) && c.id === id); k++) id = `${sorte}-${k + 1}`;
  const jour = jourDe(state);
  const c = { id, sorte, qui: v.id, ouvert: true, depuis: jour, jours: 0, etabli: l.etabli, stock: {}, commandes: [], seq: 0, connues: [], journal: [nouveauJournal(jour)], avis: [] };
  state.commerces.push(c);
  c.connues = recettesConnues(state, c).map((r) => r.id);
  v.tache = sorte;
  v.commerce = id;
  // (sa journée de travail repart à zéro : ce qu'il a produit à sa tâche d'avant reste au journal, ses actions ne
  // comptent pas pour ses lots)
  if (objet(v.travail) && v.travail.jour === jour) v.travail = { ...v.travail, tache: sorte, actions: 0, essai: 0 };
  // (I7g : son nom et sa ligne ; I8a : la fête de l'ouverture)
  commerceOuvert(state, { id, sorte, qui: v.id });
  const nomC = nomCommerce(state, c);
  const f = fixerFeteOuverture(state, id, nomC);
  return { ok: true, commerce: c, nom: nomC, fete: f && f.ok ? f.fete : null };
}

/* ---------- le travail : les lots ---------- */

// Les lots qu'il fait par jour : LOTS, un de plus tous les ANCIENNETE jours de travail, LOTS_MAX au plus.
export function lotsDuJour(c) {
  const base = Math.max(1, Math.floor(reglage('LOTS', 3))), max = Math.max(base, Math.floor(reglage('LOTS_MAX', base)));
  const anc = Math.max(1, Math.floor(reglage('ANCIENNETE', 20)));
  return Math.min(max, base + Math.floor(Math.max(0, entier(c && c.jours)) / anc));
}

// Les recettes qu'il sait faire : celles dont le palier est atteint (l'amitié avec le joueur lui apprend les autres).
export function recettesConnues(state, c) {
  const p = c ? palierAmitie(state, c.qui) : 0;
  return recettesDe(c && c.sorte).filter((r) => r.palier <= p);
}

// L'entrée du jour du journal du commerce (créée au besoin ; JOURNAL jours gardés).
function journalDuJour(c, jour) {
  if (!Array.isArray(c.journal)) c.journal = [];
  let J = c.journal.find((x) => objet(x) && x.jour === jour);
  if (!J) {
    J = nouveauJournal(jour);
    c.journal.push(J);
    const max = Math.max(1, Math.floor(reglage('JOURNAL', 7)));
    if (c.journal.length > max) c.journal.splice(0, c.journal.length - max);
  }
  return J;
}

function avis(c, a) {
  if (!Array.isArray(c.avis)) c.avis = [];
  c.avis.push(a);
  if (c.avis.length > 20) c.avis.splice(0, c.avis.length - 20);
}

// Ce que coûteraient les matières `entrees` d'un lot : son stock d'abord, puis le coffre (en laissant GARDE de chaque).
// → { ok, depuisStock, depuisCoffre, cout } ; ok faux : il en manque au coffre.
function devisMatieres(state, c, entrees) {
  const garde = Math.max(0, Math.floor(reglage('GARDE', 0))), stock = objet(c.stock) ? c.stock : {};
  const depuisStock = {}, depuisCoffre = {};
  let cout = 0;
  for (const [o, n0] of Object.entries(entrees)) {
    const n = Math.max(0, entier(n0));
    const s = Math.min(n, Math.max(0, entier(stock[o])));
    if (s > 0) depuisStock[o] = s;
    const reste = n - s;
    if (reste <= 0) continue;
    if (Math.floor(countItem(state, o) + 1e-9) - garde < reste) return { ok: false, manque: o };
    depuisCoffre[o] = reste;
    cout += reste * prixArtisan(o);
  }
  return { ok: true, depuisStock, depuisCoffre, cout };
}

// Il prend les matières d'un devis : son stock, et ce qu'il achète au coffre de sa bourse (les pièces au joueur).
function prendreMatieres(state, c, v, D, J) {
  for (const [o, n] of Object.entries(D.depuisStock)) { c.stock[o] -= n; if (c.stock[o] <= 0) delete c.stock[o]; }
  for (const [o, n] of Object.entries(D.depuisCoffre)) { takeItem(state, o, n); J.achete[o] = (J.achete[o] || 0) + n; }
  if (D.cout > 0) {
    v.bourse = Math.max(0, entier(v.bourse) - D.cout);
    earn(state, D.cout, `${nomCommerce(state, c)} : ${Object.entries(D.depuisCoffre).map(([o, n]) => `${n} ${minuscule(nom(o))}`).join(', ')}`);
    J.paye += D.cout;
  }
}

// Un lot à l'établi (taches.js : une action de la tâche du commerce). → { ok, produit, lot: { recette, sortie, n,
// commande } } ou un refus (rien à faire : le comptoir est garni, il manque des matières ou de quoi les payer).
export function lotCommerce(state, v) {
  const c = v && commerceDuVillageois(state, v.id);
  if (!c) return fail('Pas de commerce.');
  const l = localDe(state, c);
  if (!l || !l.complet) return fail(defCommerce(c.sorte).SANS || 'Le local n\'est plus complet.');
  if (l.etabli !== c.etabli) c.etabli = l.etabli;
  if (!objet(c.stock)) c.stock = {};
  if (!Array.isArray(c.commandes)) c.commandes = [];
  const jour = jourDe(state), J = journalDuJour(c, jour);
  // (ce que son lot rapporte à la ferme : les matières qu'il y a achetées ; le tableau le compte comme les pièces de la
  // tournée du port, J.produit.pieces ; la pièce faite va à son comptoir ou au joueur, pas au coffre)
  const fini = (r, commande, cout = 0) => {
    J.lots += 1;
    J.fait[r.sortie] = (J.fait[r.sortie] || 0) + r.qte;
    return { ok: true, produit: cout > 0 ? { pieces: cout } : {}, lot: { recette: r.id, sortie: r.sortie, n: r.qte, commande: commande || null } };
  };
  // (1. une commande du joueur : à façon, la matière est là ; payée, il achète la matière comme pour lui)
  for (let i = 0; i < c.commandes.length; i++) {
    const k = c.commandes[i], r = recetteDe(c.sorte, k.recette);
    if (!r) { c.commandes.splice(i--, 1); continue; }
    let cout = 0;
    if (!k.facon) {
      const D = devisMatieres(state, c, r.entrees);
      if (!D.ok || D.cout > entier(v.bourse)) continue;
      prendreMatieres(state, c, v, D, J);
      cout = D.cout;
    }
    c.commandes.splice(i, 1);
    addItem(state, r.sortie, r.qte);
    avis(c, { sorte: 'commande', objet: r.sortie, n: r.qte, facon: !!k.facon });
    return fini(r, k, cout);
  }
  // (2. garnir son comptoir : la première recette connue (dans l'ordre des données : il fond d'abord) dont il a moins de
  // STOCK, dont il a la matière et de quoi la payer)
  const S = Math.max(1, Math.floor(reglage('STOCK', 4)));
  const L = recettesConnues(state, c).map((r, i) => ({ r, i, n: Math.max(0, entier(c.stock[r.sortie])) }))
    .filter((x) => x.n < S)
    .sort((a, b) => a.i - b.i);
  for (const { r } of L) {
    const D = devisMatieres(state, c, r.entrees);
    if (!D.ok || D.cout > entier(v.bourse)) continue;
    prendreMatieres(state, c, v, D, J);
    c.stock[r.sortie] = Math.max(0, entier(c.stock[r.sortie])) + r.qte;
    return fini(r, null, D.cout);
  }
  return fail(L.length ? 'Il manque des matières au coffre, ou de quoi les payer.' : 'Le comptoir est garni.');
}

/* ---------- la vente au joueur, les commandes ---------- */

// Ce qui est en vente au comptoir de `c` : [{ objet, n, prix }], dans l'ordre des recettes.
export function enVenteAuCommerce(state, c) {
  const S = objet(c && c.stock) ? c.stock : {};
  const ordre = recettesDe(c && c.sorte).map((r) => r.sortie);
  return Object.entries(S).filter(([o, n]) => DATA.OBJETS[o] && n > 0).map(([o, n]) => ({ objet: o, n, prix: prixArtisan(o) }))
    .sort((a, b) => (ordre.indexOf(a.objet) + 1 || 99) - (ordre.indexOf(b.objet) + 1 || 99) || (a.objet < b.objet ? -1 : 1));
}

const artisanDe = (state, c) => (c ? trouverVillageois(state, c.qui) : null);

// Le joueur achète `n` unités de `o` au comptoir du commerce `id` (au prix de vente : les pièces vont à l'artisan). →
// { ok, objet, n, prix } ou un refus.
export function acheterAuCommerce(state, id, o, n = 1) {
  const c = commerceDe(state, id), v = artisanDe(state, c);
  if (!c || c.ouvert === false || !v) return fail('Ce commerce n\'est pas ouvert.');
  const q = Math.max(0, Math.floor(Number(n) || 0)), dispo = Math.max(0, entier((c.stock || {})[o]));
  if (q <= 0 || dispo < q) return fail(dispo ? `Il n'en a que ${dispo}.` : `Plus de ${minuscule(nom(o))} en vente.`);
  const prix = q * prixArtisan(o);
  if (!pay(state, prix, `${nomCommerce(state, c)} : ${q} ${minuscule(nom(o))}`)) return fail(NO_COINS);
  c.stock[o] = dispo - q;
  if (c.stock[o] <= 0) delete c.stock[o];
  addItem(state, o, q);
  v.bourse = Math.max(0, entier(v.bourse)) + prix;
  journalDuJour(c, jourDe(state)).ventes.joueur += prix;
  return { ok: true, objet: o, n: q, prix };
}

// Le prix d'une commande de la recette `r` : payée d'avance (le prix de la pièce) ou à façon (FACON % de ce prix, au
// moins FACON_MIN pièces ; la matière vient du joueur).
export function prixCommandeArtisan(r, facon = false) {
  const prix = r.qte * prixArtisan(r.sortie);
  return facon ? Math.max(Math.floor(reglage('FACON_MIN', 1)), Math.floor((prix * Math.floor(reglage('FACON', 25))) / 100)) : prix;
}

// Le joueur lui commande la recette `recette` : payée d'avance (`o.facon` faux) ou à façon (la matière quitte son
// inventaire maintenant). Elle passe avant le reste, au lot suivant ; la pièce entre dans son inventaire. COMMANDES en
// attente au plus. → { ok, commande } ou un refus.
export function commanderAuCommerce(state, id, recette, o = {}) {
  const c = commerceDe(state, id), v = artisanDe(state, c);
  if (!c || c.ouvert === false || !v) return fail('Ce commerce n\'est pas ouvert.');
  const r = recettesConnues(state, c).find((x) => x.id === recette);
  if (!r) return fail(recetteDe(c.sorte, recette) ? `${v.prenom} ne sait pas encore la faire : votre amitié la lui apprendra.` : 'Recette inconnue.');
  if (!Array.isArray(c.commandes)) c.commandes = [];
  const max = Math.max(1, Math.floor(reglage('COMMANDES', 3)));
  if (c.commandes.length >= max) return fail(`Déjà ${max} commandes en attente.`);
  const facon = !!o.facon, prix = prixCommandeArtisan(r, facon);
  if (facon) {
    const manque = Object.entries(r.entrees).filter(([x, n]) => countItem(state, x) + 1e-9 < n);
    if (manque.length) return fail(`À façon, tu apportes la matière : il te manque ${manque.map(([x, n]) => `${n} ${minuscule(nom(x))}`).join(', ')}.`);
  }
  if (!canPay(state, prix)) return fail(NO_COINS);
  if (facon) for (const [x, n] of Object.entries(r.entrees)) takeItem(state, x, n);
  pay(state, prix, `${nomCommerce(state, c)} : ${facon ? 'façon' : 'commande'} (${minuscule(nom(r.sortie))})`);
  v.bourse = Math.max(0, entier(v.bourse)) + prix;
  const J = journalDuJour(c, jourDe(state));
  if (facon) J.facon += prix; else J.ventes.joueur += prix;
  c.seq = Math.max(0, entier(c.seq)) + 1;
  const k = { n: c.seq, recette: r.id, facon, prix, jour: jourDe(state) };
  c.commandes.push(k);
  return { ok: true, commande: { ...k } };
}

/* ---------- la vente aux villageois ---------- */

const RANG = { adore: 3, besoin: 2, aime: 1 };

// Ce que `o` est pour le villageois `v` au comptoir de la sorte `sorte` : 'adore', 'besoin' (CLIENTS : une lame, s'il
// tient un outil et n'en a pas eu depuis ENTRETIEN jours), 'aime', ou null.
export function envieAuComptoir(v, o, sorte, jour) {
  const g = goutPour(v, o);
  if (g === 'deteste') return null;
  if (g === 'adore') return 'adore';
  const cl = ((defCommerce(sorte) || {}).CLIENTS || {})[o];
  if (cl === 'outil' && v.outil) {
    const E = Math.max(1, Math.floor(reglage('ENTRETIEN', 7)));
    if (!Number.isInteger(v.entretien) || jour - v.entretien >= E) return 'besoin';
  }
  return g === 'aime' ? 'aime' : null;
}

let memoCle = null, memoAchats = null;

// Qui va au comptoir aujourd'hui, et pour quoi : Map(id → { commerce, objet, fait }). Dans l'ordre des id, chacun prend
// ce qu'il préfère sur les comptoirs (ce qu'il adore, ce dont il a besoin, ce qu'il aime ; à égalité, le plus cher
// qu'il peut payer) ; un achat par jour au plus ; pas dans son propre commerce. Rien sans commerce ouvert.
export function achatsCommercesDuJour(state, jour = jourDe(state)) {
  const out = new Map();
  const C = commercesOuverts(state).filter((c) => devantComptoir(state, c).length);
  if (!C.length) return out;
  const V = [...villageoisDe(state)].sort((a, b) => (a.id < b.id ? -1 : 1));
  const stock = new Map(C.map((c) => [c.id, { ...(c.stock || {}) }]));
  const cle = JSON.stringify([jour, C.map((c) => [c.id, c.stock, c.qui]), V.map((v) => [v.id, entier(v.bourse), !!v.enfant, !!v.repos, v.accueil || 0, v.outil || 0, v.entretien || 0, v.achatCommerce || 0, v.gouts || 0])]);
  if (memoCle === cle && memoAchats && memoAchats.s === state) return memoAchats.m;
  for (const v of V) {
    if (objet(v.achatCommerce) && v.achatCommerce.jour === jour) { out.set(v.id, { commerce: v.achatCommerce.commerce, objet: v.achatCommerce.objet, fait: true }); continue; }
    if (v.enfant || v.repos || v.accueil) continue;
    let mieux = null;
    for (const c of C) {
      if (c.qui === v.id) continue;
      for (const [o, n] of Object.entries(stock.get(c.id))) {
        if (!(n > 0) || !DATA.OBJETS[o]) continue;
        const e = envieAuComptoir(v, o, c.sorte, jour), p = prixArtisan(o);
        if (!e || p > entier(v.bourse)) continue;
        const x = { c, o, r: RANG[e], p };
        if (!mieux || x.r > mieux.r || (x.r === mieux.r && (x.p > mieux.p || (x.p === mieux.p && o < mieux.o)))) mieux = x;
      }
    }
    if (!mieux) continue;
    stock.get(mieux.c.id)[mieux.o] -= 1;
    out.set(v.id, { commerce: mieux.c.id, objet: mieux.o, fait: false });
  }
  memoCle = cle;
  memoAchats = { s: state, m: out };
  return out;
}

// La signature des achats au comptoir du jour (la clé de la journée, villageois-journee.js).
export function commercesSignature(state, jour = jourDe(state)) {
  if (!villageActif(state) || !Array.isArray(state.commerces) || !state.commerces.length) return 0;
  const m = achatsCommercesDuJour(state, jour);
  return [commercesOuverts(state).map((c) => [c.id, c.etabli, c.qui]), [...m].map(([id, a]) => [id, a.commerce, a.objet])];
}

// Ce qu'il dit en arrivant au comptoir (ARTISANS.PHRASES_COMPTOIR).
export function phraseComptoir(state, id, o) {
  const P = AR().PHRASES_COMPTOIR || [];
  if (!P.length || !DATA.OBJETS[o]) return '';
  const p = P[Math.floor(rngDe(`${graineDe(state)}:comptoir:${id}:${jourDe(state)}`)() * P.length)];
  const d = DATA.OBJETS[o];
  return p.replace('{objet}', `${minuscule(d.nom)} ${d.icone}`).replace(/^./, (x) => x.toUpperCase());
}

// Le villageois `vid` achète `o` au comptoir du commerce `cid` (de sa bourse ; les pièces vont à l'artisan). → { ok,
// objet, prix, envie } ou un refus.
export function acheterAuComptoir(state, vid, cid, o) {
  const v = trouverVillageois(state, vid), c = commerceDe(state, cid), a = artisanDe(state, c);
  if (!v || !c || !a || c.ouvert === false) return fail('Ce commerce n\'est pas ouvert.');
  const jour = jourDe(state);
  if (objet(v.achatCommerce) && v.achatCommerce.jour === jour) return fail('Déjà un achat au comptoir aujourd\'hui.');
  if (!(entier((c.stock || {})[o]) > 0)) return fail('Plus en vente.');
  const envie = envieAuComptoir(v, o, c.sorte, jour), prix = prixArtisan(o);
  if (!envie) return fail('Il n\'en veut pas.');
  if (entier(v.bourse) < prix) return fail('Pas assez dans sa bourse.');
  c.stock[o] -= 1;
  if (c.stock[o] <= 0) delete c.stock[o];
  v.bourse = entier(v.bourse) - prix;
  a.bourse = Math.max(0, entier(a.bourse)) + prix;
  v.achatCommerce = { jour, objet: o, commerce: c.id };
  if (envie === 'besoin') v.entretien = jour;
  plaisirAchat(v, jour, envie, { objet: o, prix, ou: 'commerce' });
  journalDuJour(c, jour).ventes.villageois += prix;
  avis(c, { sorte: 'vente', id: v.id, objet: o, prix, envie });
  return { ok: true, objet: o, prix, envie };
}

// Le créneau du comptoir de `id` aujourd'hui (sa journée) : { de, a } ou null.
function creneauComptoir(state, id) {
  const segs = journeeDuVillage(state).get(id) || [];
  const s = segs.find((x) => x.but && x.but.sorte === 'commerce');
  return s ? { de: s.de, a: s.a } : null;
}

// À chaque pas de la ferme (energy.js) : qui est au comptoir depuis la moitié de son créneau y achète. → les achats.
export function avancerCommerces(state) {
  if (!villageActif(state) || nightActive(state) || !Array.isArray(state.commerces) || !state.commerces.length) return 0;
  const h = clockHours(state);
  let n = 0;
  for (const [id, a] of achatsCommercesDuJour(state)) {
    if (a.fait) continue;
    const c = creneauComptoir(state, id);
    if (c && h >= (c.de + c.a) / 2 && acheterAuComptoir(state, id, a.commerce, a.objet).ok) n++;
  }
  return n;
}

/* ---------- au passage du bac, la nuit ---------- */

// L'arrivée du bac (bac.js, après les paniers) : chaque commerce lui confie ce qui dépasse BAC de chaque pièce qui se
// vend au port (au prix de l'île : la bourse de l'artisan ; les pièces partent dans les caisses, `vendu`). → { id: pieces }.
export function commercesAuBac(state, jour, vendu = null) {
  const out = {};
  const garde = Math.max(0, Math.floor(reglage('BAC', 1)));
  for (const c of commercesOuverts(state)) {
    const v = artisanDe(state, c);
    if (!v || !objet(c.stock)) continue;
    let pieces = 0;
    for (const [o, n] of Object.entries(c.stock)) {
      const u = valeurPort(o), k = entier(n) - garde;
      if (u <= 0 || k <= 0) continue;
      c.stock[o] = entier(n) - k;
      pieces += k * u;
      if (vendu) vendu[o] = (vendu[o] || 0) + k;
    }
    if (pieces > 0) {
      v.bourse = Math.max(0, entier(v.bourse)) + pieces;
      journalDuJour(c, jour).ventes.bac += pieces;
      out[c.id] = pieces;
    }
  }
  return out;
}

// La nuit (runNight, après les tâches, avant la nuit des villageois) : les jours de pratique de chacun, l'envie qui
// naît, l'ancienneté de l'artisan, les recettes que l'amitié lui a apprises ; l'achat au comptoir qu'on n'a pas vu. →
// { envies: [{ id, sorte }], appris: [{ commerce, recettes }], achats } ou null (rien).
export function artisansNuit(state) {
  if (!villageActif(state) || !Array.isArray(state.villageois)) return null;
  const jour = jourDe(state), J = Math.max(1, Math.floor(reglage('JOURS', 10)));
  const out = { envies: [], appris: [], achats: 0 };
  // (l'achat au comptoir qu'on n'a pas vu : la page fermée)
  for (const [id, a] of achatsCommercesDuJour(state)) if (!a.fait && creneauComptoir(state, id) && acheterAuComptoir(state, id, a.commerce, a.objet).ok) out.achats++;
  for (const v of villageoisDe(state)) {
    const T = v.travail;
    const fait = objet(T) && T.jour === jour && T.tache && entier(T.actions) > 0 && !v.repos;
    if (fait) {
      if (!objet(v.pratique)) v.pratique = {};
      v.pratique[T.tache] = joursPratiques(v, T.tache) + 1;
    }
    if (v.enfant) continue;
    for (const s of sortesCommerces()) {
      const d = defCommerce(s);
      if (joursPratiques(v, d.tache) < J || (objet(v.envies) && Number.isInteger(v.envies[s])) || commerceDuVillageois(state, v.id)) continue;
      if (!objet(v.envies)) v.envies = {};
      v.envies[s] = jour;
      noterChronique(state, 'envie', { qui: v.id, prenom: v.prenom, sorte: s, quoi: unCommerce(s) });
      out.envies.push({ id: v.id, sorte: s });
    }
  }
  for (const c of commercesOuverts(state)) {
    const v = artisanDe(state, c);
    if (!v) continue;
    const T = v.travail;
    if (objet(T) && T.jour === jour && T.tache === c.sorte && entier(T.actions) > 0) c.jours = Math.max(0, entier(c.jours)) + 1;
    const avant = new Set(Array.isArray(c.connues) ? c.connues : []);
    c.connues = recettesConnues(state, c).map((r) => r.id);
    const neuves = c.connues.filter((r) => !avant.has(r));
    if (neuves.length && avant.size) out.appris.push({ commerce: c.id, recettes: neuves });
  }
  return out.envies.length || out.appris.length || out.achats ? out : null;
}

/* ---------- l'enseigne : ses lettres ---------- */

// Les lettres de l'enseigne du commerce `c` : la couleur choisie (I8a : couleursEnseigne, que le palier « Un village où il
// fait bon vivre » débloque), ou null (celle de l'enseigne). → '#rrggbb' ou null.
export function lettresCommerce(state, c) {
  if (!c || typeof c.lettres !== 'string') return null;
  const L = couleursEnseigne(state).find((x) => x.id === c.lettres);
  return L ? L.texte : null;
}

// Le joueur choisit les lettres de l'enseigne du commerce `id` (`lettres` : l'id d'une couleur débloquée, ou null :
// celles d'origine). → { ok, lettres } ou un refus.
export function choisirLettres(state, id, lettres = null) {
  const c = commerceDe(state, id);
  if (!c) return fail('Commerce inconnu.');
  if (lettres === null || lettres === '' || lettres === undefined) { delete c.lettres; return { ok: true, lettres: null }; }
  if (!couleursEnseigne(state).some((x) => x.id === lettres)) return fail('Ces lettres ne sont pas encore débloquées : le village convivial les offre.');
  c.lettres = lettres;
  return { ok: true, lettres };
}

/* ---------- ce que la page dit, le tableau ---------- */

// Ce que la page doit dire (une vente au comptoir, une commande livrée) : [{ commerce, sorte, … }] ; retirés.
export function prendreAvisCommerces(state) {
  const out = [];
  for (const c of commercesDe(state)) {
    if (!Array.isArray(c.avis) || !c.avis.length) continue;
    for (const a of c.avis) out.push({ commerce: c.id, ...a });
    c.avis = [];
  }
  return out;
}

// Le bilan d'un commerce sur les `jours` jours qui finissent hier (le tableau des villageois, une ligne « commerce ») :
// { id, sorte, nom, icone, qui, prenom, lots, fait ({ objet: n }), achete, paye (aux matières : au joueur), ventes
// ({ joueur, villageois, bac }), facon, total (ce qu'il a vendu et facturé), stock ({ objet: n }), valeurStock, bourse,
// lotsParJour, jours (le journal de la période) }.
export function bilanCommerce(state, c, jours = 7) {
  const aujourdhui = jourDe(state), depuis = aujourdhui - jours, v = artisanDe(state, c), d = defCommerce(c.sorte);
  const E = (Array.isArray(c.journal) ? c.journal : []).filter((J) => objet(J) && J.jour >= depuis && J.jour < aujourdhui).sort((a, b) => a.jour - b.jour);
  const fait = {}, achete = {}, ventes = { joueur: 0, villageois: 0, bac: 0 };
  let lots = 0, paye = 0, facon = 0;
  for (const J of E) {
    lots += entier(J.lots); paye += entier(J.paye); facon += entier(J.facon);
    for (const [o, n] of Object.entries(J.fait || {})) fait[o] = (fait[o] || 0) + entier(n);
    for (const [o, n] of Object.entries(J.achete || {})) achete[o] = (achete[o] || 0) + entier(n);
    for (const k of Object.keys(ventes)) ventes[k] += entier((J.ventes || {})[k]);
  }
  const stock = Object.fromEntries(Object.entries(c.stock || {}).filter(([o, n]) => DATA.OBJETS[o] && n > 0));
  return {
    id: c.id, sorte: c.sorte, nom: nomCommerce(state, c), icone: d.icone, qui: c.qui, prenom: v ? v.prenom : '', lots, fait, achete, paye, ventes, facon,
    total: ventes.joueur + ventes.villageois + ventes.bac + facon, stock, valeurStock: Object.entries(stock).reduce((t, [o, n]) => t + n * prixArtisan(o), 0),
    bourse: v ? Math.max(0, entier(v.bourse)) : 0, lotsParJour: lotsDuJour(c), jours: E, depuis: c.depuis,
  };
}

// Pour la fenêtre du commerce : { commerce, nom, sorte, def, artisan, local, lots (aujourd'hui : faits / du jour),
// aujourdhui (l'entrée du journal du jour), enVente, recettes ([{ …recette, connue, prix, facon }]), commandes, bilan }.
export function etatCommerce(state, id) {
  const c = commerceDe(state, id);
  if (!c) return null;
  const v = artisanDe(state, c), d = defCommerce(c.sorte), jour = jourDe(state);
  const T = v && objet(v.travail) && v.travail.jour === jour ? v.travail : null;
  const connues = new Set(recettesConnues(state, c).map((r) => r.id));
  const J = (Array.isArray(c.journal) ? c.journal : []).find((x) => objet(x) && x.jour === jour) || nouveauJournal(jour);
  return {
    commerce: c, nom: nomCommerce(state, c), sorte: c.sorte, def: d, artisan: v, local: localDe(state, c),
    lots: { faits: T ? entier(T.actions) : 0, du: lotsDuJour(c) }, aujourdhui: J, enVente: enVenteAuCommerce(state, c),
    recettes: recettesDe(c.sorte).map((r) => ({ ...r, connue: connues.has(r.id), prix: prixCommandeArtisan(r, false), facon: prixCommandeArtisan(r, true), palierNom: nomPalier(r.palier) })),
    commandes: (c.commandes || []).map((k) => ({ ...k })), bilan: bilanCommerce(state, c),
  };
}

/* ---------- la sauvegarde ---------- */

// Les commerces d'une sauvegarde (la migration 98 → 99) : lisibles ; un commerce d'une sorte inconnue s'en va.
export function reparerCommerces(L, villageois = []) {
  if (!Array.isArray(L)) return [];
  const ids = new Set((Array.isArray(villageois) ? villageois : []).filter(objet).map((v) => v.id));
  const comptes = (o) => Object.fromEntries(Object.entries(objet(o) ? o : {}).filter(([k, n]) => DATA.OBJETS[k] && Number.isInteger(n) && n > 0));
  const vus = new Set();
  const out = [];
  for (const c of L) {
    if (!objet(c) || !defCommerce(c.sorte) || typeof c.id !== 'string' || vus.has(c.id)) continue;
    vus.add(c.id);
    const rs = new Set(recettesDe(c.sorte).map((r) => r.id));
    out.push({
      id: c.id, sorte: c.sorte, qui: typeof c.qui === 'string' ? c.qui : null, ouvert: c.ouvert !== false && ids.has(c.qui),
      depuis: Number.isInteger(c.depuis) ? c.depuis : 1, jours: Math.max(0, entier(c.jours)), etabli: Number.isInteger(c.etabli) ? c.etabli : null,
      stock: comptes(c.stock),
      commandes: (Array.isArray(c.commandes) ? c.commandes : []).filter((k) => objet(k) && rs.has(k.recette))
        .map((k) => ({ n: Math.max(0, entier(k.n)), recette: k.recette, facon: !!k.facon, prix: Math.max(0, entier(k.prix)), jour: Number.isInteger(k.jour) ? k.jour : 1 })),
      seq: Math.max(0, entier(c.seq)), connues: (Array.isArray(c.connues) ? c.connues : []).filter((r) => rs.has(r)),
      ...(typeof c.lettres === 'string' && /^[a-z_]{1,20}$/.test(c.lettres) ? { lettres: c.lettres } : {}),
      journal: (Array.isArray(c.journal) ? c.journal : []).filter((J) => objet(J) && Number.isInteger(J.jour)).slice(-Math.max(1, Math.floor(reglage('JOURNAL', 7)))).map((J) => ({
        jour: J.jour, lots: Math.max(0, entier(J.lots)), fait: comptes(J.fait), achete: comptes(J.achete), paye: Math.max(0, entier(J.paye)),
        ventes: { joueur: Math.max(0, entier((J.ventes || {}).joueur)), villageois: Math.max(0, entier((J.ventes || {}).villageois)), bac: Math.max(0, entier((J.ventes || {}).bac)) },
        facon: Math.max(0, entier(J.facon)),
      })),
      avis: [],
    });
  }
  return out;
}

// Ce qu'une sauvegarde garde d'un villageois pour les commerces (la migration 98 → 99).
export function reparerArtisan(v, commerces = []) {
  if (!objet(v)) return v;
  const out = { ...v };
  const jours = (o) => Object.fromEntries(Object.entries(objet(o) ? o : {}).filter(([, n]) => Number.isInteger(n) && n > 0));
  if ('pratique' in v) out.pratique = jours(v.pratique);
  if ('envies' in v) out.envies = Object.fromEntries(Object.entries(objet(v.envies) ? v.envies : {}).filter(([s, j]) => defCommerce(s) && Number.isInteger(j)));
  const sien = commerces.find((c) => c.qui === v.id && c.ouvert !== false);
  if (sien) { out.commerce = sien.id; out.tache = sien.sorte; } else {
    delete out.commerce;
    if (estTacheCommerce(out.tache)) out.tache = null;
  }
  if ('achatCommerce' in v) out.achatCommerce = objet(v.achatCommerce) && Number.isInteger(v.achatCommerce.jour) && DATA.OBJETS[v.achatCommerce.objet] ? { jour: v.achatCommerce.jour, objet: v.achatCommerce.objet, commerce: String(v.achatCommerce.commerce || '') } : null;
  if ('entretien' in v && !Number.isInteger(v.entretien)) delete out.entretien;
  return out;
}
