import { DATA } from './catalog.js';
import { EPS } from './base.js';
import { fail, isOwned, starterOf, storedEnergy } from './devices.js';
import { earn } from './compta.js';
import { addItem, countItem, penalite } from './inventory.js';
import { averageHappiness } from './bonheur.js';
import { plantableCrops } from './crops.js';
import { checkMastery, grantTechPoints, isBuilt, techPoints } from './techtree.js';
import { gainXp, levelReached, unlockLevel } from './levels.js';
import { houseRepaired } from './depart.js';
import { farmTerrain } from './terrain.js';
import { hameauxVus } from './monde-hameaux.js';
import { partVue } from './monde-vu.js';
import { genreJoueur } from './family.js';
import { recitPour } from './recit-aiguillage.js';
import { offrirPlan } from './plans.js';
import { habitantsDe } from './habitants.js';
import { cleDe, palierAmitie } from './amitie.js';
import { styleMaison } from './styles.js';
import { villageActif } from './village.js';
import { compterObjectifIle, listeDesChapitres, paliersSuivis } from './paliers.js';
import { chroniqueRecolte, noterChronique } from './chronique.js';

/* ---------- Lot 9 : chapitres ---------- */

// state.campagne = { chapitre, fini, annonces, recompenses, compteurs }.
// chapitre : chapitre en cours (1 à 7) ; fini : la campagne est terminée (mode
// libre, tout est débloqué) ; annonces : chapitres terminés dont l'écran de fin
// n'a pas encore été vu [{ chapitre, nuit }] ; compteurs : eau pompée (mL), record d'énergie
// stockée (mWh), carottes récoltées, nuits de ponte d'affilée, pains cuits, plats
// différents préparés, laines tondues, repas servis à des invités.
export function newCampaign() {
  return {
    chapitre: 1,
    fini: false,
    annonces: [],
    recompenses: [], // le lot 6 : les chapitres dont la récompense est donnée
    compteurs: newCampaignCounters(),
  };
}

export function newCampaignCounters() {
  return {
    eauMl: 0, // eau pompée au total (mL)
    mwhMax: 0, // record d'énergie stockée (mWh)
    carottes: 0,
    serieOeufs: 0,
    pains: 0,
    plats: [],
    laines: 0,
    repasInvites: 0, // la nouvelle vision : repas servis à des invités (invitations.js, servirRepas)
    recoltes: 0, // version 1.12 : récoltes faites au total
    cultures: [], // cultures différentes récoltées
    semisBle: 0, // semis de blé
    labours: 0, // FLU-42 : tuiles labourées au total
    semis: 0, // semis faits au total (toutes cultures)
    arroseesMax: 0, // record de parcelles arrosées le même jour
    objets: {}, // version 1.22 : record de chaque objet suivi par un objectif « objet » { item: qté }
    // fiche 9b : le grand monde (comptés dès le début de la partie, comme les objets)
    calecheVentes: 0, // pièces gagnées en vendant à la calèche (caleche.js, vendreCaleche)
    achatsHameaux: 0, // produits des hameaux achetés à la calèche, son coffre (acheterCaleche)
    pecheMer: 0, // poissons pêchés dans la mer (outils.js, castLine)
  };
}

/* -- chapitres et déblocages -- */

// Le chantier « l'île à bâtir » (fiche I7a, paliers.js) : une partie qui suit les paliers de l'île les a à la
// place des chapitres (listeDesChapitres : DATA.VILLAGE.PALIERS), autant qu'eux ; sans partie, les chapitres.
export function chapterCount(state = null) {
  return listeDesChapitres(state).length;
}

// Le numéro du chapitre (ou du palier) en cours : state.palier pour une partie qui suit les paliers,
// state.campagne.chapitre sinon. poserChapitre les tient égaux (ce qui lit state.campagne.chapitre, le
// compte rendu de la nuit, la mesure d'audience, les migrations, voit le palier).
function numeroEnCours(state) {
  return paliersSuivis(state) ? state.palier : state.campagne.chapitre;
}
export function poserChapitre(state, n) {
  state.campagne.chapitre = n;
  if (paliersSuivis(state)) state.palier = n;
}

// Chapitre atteint : 1 à 7 pendant la campagne, 8 en mode libre (tout est débloqué).
export function chapterReached(state) {
  const c = state.campagne;
  if (!c) return chapterCount() + 1;
  return c.fini ? chapterCount(state) + 1 : numeroEnCours(state);
}

// Version 1.7 : un élément (bâtiment, atelier) ou une culture est débloqué par
// un niveau d'expérience (NIVEAUX.liste), plus par un chapitre.
export function isUnlocked(state, id) {
  return levelReached(state) >= unlockLevel(id);
}

// Chapitre qui débloquait chaque élément avant la version 1.7 : sert seulement à
// dater une très ancienne sauvegarde (inferChapter).
const LEGACY_CHAPTER = {
  champ: 3, silo: 3, poulailler: 3, four: 4, cuisine: 4, moulin: 4, presse: 4, tournesol: 4,
  paturage: 5, moutons: 5, serre: 6, verger: 6, frigo: 6,
};

// Numéro du premier chapitre qui porte un objectif de ce type (de la liste que suit `state` : ses paliers).
export function objectiveChapter(type, state = null) {
  return listeDesChapitres(state).findIndex((ch) => ch.objectifs.some((o) => o.type === type)) + 1;
}

export function objectiveDef(type, state = null) {
  for (const ch of listeDesChapitres(state)) {
    const o = ch.objectifs.find((x) => x.type === type);
    if (o) return o;
  }
  return null;
}

// Une culture est-elle débloquée ? Il faut son niveau et, si elle demande un
// bâtiment (`requiert` : le blé attend le Silo), que ce bâtiment soit construit.
export function cropUnlocked(state, culture) {
  const requis = DATA.CULTURES[culture].requiert;
  return isUnlocked(state, culture) && (!requis || isBuilt(state, requis));
}

// Cultures qu'on peut planter dans ce lieu avec les chapitres atteints. Comme
// pour les bâtiments, c'est un masquage : plant() lui-même reste libre.
export function plantableCropsFor(state, lieu) {
  return plantableCrops(lieu).filter((c) => cropUnlocked(state, c));
}

// Version 1.12 : une culture récoltée (objectif « cultures différentes »).
export function noteCropHarvested(state, culture) {
  const c = state.campagne;
  if (!c) return;
  c.compteurs.recoltes = (c.compteurs.recoltes || 0) + 1;
  if (!Array.isArray(c.compteurs.cultures)) c.compteurs.cultures = [];
  if (!c.compteurs.cultures.includes(culture)) c.compteurs.cultures.push(culture);
  chroniqueRecolte(state, culture);   // (l'île à bâtir, fiche I7g : la première récolte, dans la chronique)
}

// FLU-42 : record de parcelles arrosées en même temps (un arrosage vaut pour la journée).
export function noteWatered(state, count) {
  const c = state.campagne;
  if (c && count > (c.compteurs.arroseesMax || 0)) c.compteurs.arroseesMax = count;
}

export function bumpCounter(state, key, amount) {
  const c = state.campagne;
  if (c && amount > 0) c.compteurs[key] = (c.compteurs[key] || 0) + amount;
}

// Record d'énergie stockée : somme de la charge des batteries.
export function noteEnergyRecord(state) {
  const c = state.campagne;
  if (!c) return;
  const total = storedEnergy(state);
  if (!(total <= c.compteurs.mwhMax)) c.compteurs.mwhMax = total;
}

// Une recette vient de se terminer : pain cuit, ou plat différent préparé. Les
// transformations (Moulin, Presse) ne comptent ni comme pain ni comme plat.
export function noteRecipeDone(state, recette, qty) {
  const c = state.campagne;
  const r = DATA.RECETTES[recette];
  if (!c || !r || r.transformation) return;
  const pain = objectiveDef('pains', state);
  if (pain && recette === pain.recette) {
    c.compteurs.pains += qty;
    return;
  }
  const exclus = (objectiveDef('plats', state) || {}).exclut || [];
  if (!exclus.includes(recette) && !c.compteurs.plats.includes(recette)) c.compteurs.plats.push(recette);
}

// Version 1.22 : les objets suivis par un objectif « objet » (minerai de fer, lingot de
// fer…), de tous les chapitres.
function trackedItems(state) {
  return [...new Set(listeDesChapitres(state).flatMap((ch) => ch.objectifs.filter((o) => o.type === 'objet').map((o) => o.item)))];
}

// Le record de chacun de ces objets dans l'inventaire : un minerai fondu ou un lingot
// dépensé dans l'Arbre des technologies reste compté. Appelée par updateChapters (à
// chaque pas d'horloge), dès le début de la partie : ce qu'on a eu avant le chapitre compte.
function noteItemRecords(state) {
  const c = state.campagne;
  if (!c) return;
  for (const item of trackedItems(state)) {
    const n = countItem(state, item);
    if (!c.compteurs.objets || typeof c.compteurs.objets !== 'object') c.compteurs.objets = {};
    if (n > (c.compteurs.objets[item] || 0)) c.compteurs.objets[item] = n;
  }
}

// Fiche 9b : ce que l'encyclopédie a noté (les cartes visitées, les bêtes vues : encyclopedie.js).
const evenements = (state) => (state.encyclopedie && state.encyclopedie.evenements && typeof state.encyclopedie.evenements === 'object' ? state.encyclopedie.evenements : {});
const evenement = (state, e) => !!evenements(state)[e];

// La part du grand monde vue, en % (arrondie vers le bas ; monde-vu.js). Lue à chaque pas d'horloge
// quand le chapitre en cours la demande : gardée tant que le vu (sa chaîne) ne change pas.
let vuMemo = { s: null, T: null, pct: 0 };
function partDuMonde(state) {
  const s = state.monde && typeof state.monde.vu === 'string' ? state.monde.vu : '';
  const T = farmTerrain(state);
  if (!T || !T.FERME) return 0;
  if (vuMemo.s !== s || vuMemo.T !== T) vuMemo = { s, T, pct: Math.floor(partVue(state, T) * 100 + EPS) };
  return vuMemo.pct;
}

// Les habitants des hameaux au palier d'amitié `palier` ou plus.
function amisAuPalier(state, palier) {
  let n = 0;
  for (const h of Object.values(habitantsDe(state))) for (const f of (h && h.foyers) || []) for (const m of f.membres || []) if (palierAmitie(state, cleDe(m)) >= palier) n++;
  return n;
}

// Valeur actuelle d'un objectif.
export function objectiveValue(state, obj) {
  const k = state.campagne.compteurs;
  // le chantier « l'île à bâtir » (fiche I7a) : le port, les villageois, leurs tâches, les commerces, l'amitié
  const ile = compterObjectifIle(state, obj);
  if (ile !== null) return ile;
  switch (obj.type) {
    case 'litres': return Math.floor((k.eauMl || 0) / 1000);
    case 'wh': return Math.floor((k.mwhMax || 0) / 1000);
    case 'carottes': return k.carottes;
    case 'pontes': return k.serieOeufs;
    case 'bonheur': return averageHappiness(state); // version 1.8 (à la place de la santé)
    case 'pains': return k.pains;
    case 'plats': return k.plats.length;
    case 'laines': return k.laines;
    // la nouvelle vision (après le lot 6, à la place de l'autonomie) : les amis, les repas partagés, les
    // projets des hameaux, les styles, les plans
    case 'amis': return amisAuPalier(state, obj.palier || 0);
    case 'repas': return k.repasInvites || 0;
    case 'projets': return Object.values(state.projets && typeof state.projets === 'object' ? state.projets : {}).reduce((n, p) => n + (p && Array.isArray(p.faits) ? p.faits.length : 0), 0);
    case 'styles': { const m = styleMaison(state); return m.complet ? obj.cible : Math.min(obj.cible, m.varies.length); }
    case 'plans': return Object.keys(state.plans && state.plans.connus && typeof state.plans.connus === 'object' ? state.plans.connus : {}).length;
    // version 1.12 (v2, lot 8) : chapitres 1 et 2
    case 'maison': return houseRepaired(state) ? 1 : 0;
    case 'panneau': case 'pompe': case 'reservoir': return isOwned(starterOf(state, obj.type)) ? 1 : 0;
    case 'houe': return state.potager && state.potager.houe ? 1 : 0;
    case 'recoltes': return k.recoltes || 0;
    case 'niveau': return levelReached(state);
    case 'cultures': return Array.isArray(k.cultures) ? k.cultures.length : 0;
    case 'silo': return state.silo && state.silo.construit ? 1 : 0;
    case 'semisBle': return k.semisBle || 0;
    case 'siloBle': return state.silo ? Math.floor(state.silo.ble || 0) : 0;
    // FLU-42 : chapitre 1, entre la houe et la première récolte
    case 'labours': return k.labours || 0;
    case 'semis': return k.semis || 0;
    case 'arrosees': return k.arroseesMax || 0;
    // version 1.22 : le plus d'exemplaires d'un objet (`item`) eus en même temps
    case 'objet': return Math.max(countItem(state, obj.item), (k.objets && k.objets[obj.item]) || 0);
    // fiche 9b : le grand monde
    // (le chantier « l'île à bâtir » allumé, fiche I1b : la calèche ne commerce plus, les ventes au port comptent)
    case 'caleche': return Math.floor((k.calecheVentes || 0) + (villageActif(state) ? k.ventesPort || 0 : 0));
    case 'achatsHameaux': return Math.floor(k.achatsHameaux || 0);
    case 'pecheMer': return Math.floor(k.pecheMer || 0);
    case 'hameaux': return Object.keys(hameauxVus(state)).length;
    case 'monde': return partDuMonde(state);
    case 'faune': return Object.keys(evenements(state)).filter((e) => e.startsWith('faune:')).length;
    default: return 0;
  }
}

// Progression d'un chapitre : { chapitre, titre, icone, intro, objectifs: [{ ...objectif,
// valeur, ok, ratio }], fait, palier }.
// Sur une terre sauvage, l'intro et les libellés ont leur version (introSauvage,
// libelleSauvage) quand elle existe ; les objectifs marqués sauvage: false n'y existent pas (le
// panneau, la pompe, la citerne).
// Une partie qui suit les paliers de l'île (fiche I7a) : le palier en cours (palier: true), sans intro.
export function chapterProgress(state, chapitre = numeroEnCours(state)) {
  const palier = paliersSuivis(state);
  const def = listeDesChapitres(state)[chapitre - 1];
  const objectifs = def.objectifs.filter((o) => o.sauvage !== false).map((o) => {
    const valeur = objectiveValue(state, o);
    return { ...o, libelle: o.libelleSauvage || o.libelle, valeur, ok: valeur + EPS >= o.cible, ratio: Math.max(0, Math.min(1, valeur / o.cible)) };
  });
  return { chapitre, titre: def.titre, icone: def.icone, intro: palier ? '' : def.introSauvage || def.intro, objectifs, fait: objectifs.every((o) => o.ok), palier };
}

// Le texte de la lettre `id` : sa version d'une terre sauvage (texteSauvage) s'il y en a une. Une ligne
// { m, f } prend la variante du genre du personnage principal (texteRecit, le récit) ; {nom} reste à
// remplacer par la page.
export function mailText(state, id) {
  const def = DATA.COURRIER[id];
  return (def.texteSauvage || def.texte).map((l) => (l && typeof l === 'object' ? l[genreJoueur(state)] || l.m || '' : l));
}

// Le lot 6 : la récompense du chapitre `n` (data/campaign.json recompense), donnée une fois : ses plans
// (offrirPlan : un plan déjà connu cède la place au suivant de sa collection ; la collection complète, au
// meuble lui-même) et ses objets de décor. `annonce` : les plans sont annoncés par l'écran de fin (true) ou au
// matin (false : une ancienne partie, rattrapée). → { plans: [id], objets: { id: n } }
export function recompenseChapitre(state, n, annonce = true) {
  const c = state.campagne, r = (listeDesChapitres(state)[n - 1] || {}).recompense || {};
  const out = { plans: [], objets: {} };
  if (!c) return out;
  if (!Array.isArray(c.recompenses)) c.recompenses = [];
  if (c.recompenses.includes(n)) return out;
  c.recompenses.push(n);
  const donner = (id, k) => { addItem(state, id, k); out.objets[id] = (out.objets[id] || 0) + k; };
  for (const id of r.plans || []) {
    const p = offrirPlan(state, id, annonce);
    if (p) out.plans.push(p);
    else donner(id, 1);
  }
  for (const [id, k] of Object.entries(r.objets || {})) donner(id, k);
  return out;
}

// Une partie d'avant le lot 6 : les chapitres déjà terminés donnent leurs plans (annoncés au matin), sans
// leurs objets.
function rattraperRecompenses(state) {
  const c = state.campagne;
  if (Array.isArray(c.recompenses)) return;
  c.recompenses = [];
  const faits = c.fini ? chapterCount(state) : Math.max(0, (numeroEnCours(state) || 1) - 1);
  for (let n = 1; n <= faits; n++) {
    c.recompenses.push(n);
    for (const id of (listeDesChapitres(state)[n - 1].recompense || {}).plans || []) offrirPlan(state, id, false);
  }
}

// Terminer le chapitre en cours : on l'annonce, puis le suivant s'ouvre (ou la
// campagne s'achève : le jeu libre).
export function completeChapter(state) {
  const c = state.campagne;
  if (!c || c.fini) return fail('La campagne est terminée.');
  // (fiche I7a : un palier de l'île compte comme le chapitre de son rang : mêmes points, même XP)
  const n = numeroEnCours(state), palier = paliersSuivis(state);
  c.annonces.push({ chapitre: n, nuit: state.day, recompense: recompenseChapitre(state, n) });
  // Arbre v2 : chaque chapitre terminé rapporte des points de technologie.
  grantTechPoints(state, DATA.ARBRE.POINTS.CHAPITRES[n - 1] || 0, palier ? `Palier ${n} franchi` : `Chapitre ${n} terminé`);
  // Version 1.7 : et de l'expérience (le succès « chapitre n terminé »).
  gainXp(state, DATA.NIVEAUX.CHAPITRES_XP[n - 1] || 0);
  // (fiche I7g : un palier de l'île franchi, dans la chronique)
  if (palier) { const P = listeDesChapitres(state)[n - 1] || {}; noterChronique(state, 'palier', { n, titre: P.titre || '', icone: P.icone || undefined }); }
  if (n >= chapterCount(state)) c.fini = true;
  else poserChapitre(state, n + 1);
  return { ok: true, chapitre: numeroEnCours(state), fini: c.fini };
}

// Passe au chapitre suivant tant que l'objectif du chapitre en cours est rempli.
// Renvoie le nombre de chapitres terminés. Appelée à chaque tick et à chaque réveil.
export function updateChapters(state) {
  const c = state.campagne;
  if (!c) return 0;
  noteItemRecords(state);
  rattraperRecompenses(state);
  let done = 0;
  while (!c.fini && done < chapterCount(state) && chapterProgress(state).fait) {
    completeChapter(state);
    done++;
  }
  checkMastery(state); // Arbre v2 : jalons de maîtrise
  // version 1.3 : le courrier que ce stade de la partie fait arriver (le chantier « l'île à bâtir » allumé, il
  // n'y en a plus : ce qu'il offrait est passé dans les récompenses des paliers, fiche I7a)
  if (!villageActif(state)) deliverMail(state);
  return done;
}

// Piste 5 du chantier « allègement » (docs/chantier-allegement.md) : tick() n'évalue plus les objectifs du
// chapitre (chapterProgress : ≈ 85 % de son coût) à chaque pas de 200 ms, mais tous les PAS_OBJECTIFS pas
// (1 s) ; et au pas suivant toute commande du joueur (objectifsARevoir, appelée par executerCommande et par
// le rendu de la page après chaque geste), pour qu'un geste soit reconnu comme avant. Les records d'objets
// (noteItemRecords) restent notés à chaque pas : un maximum ne se perd pas entre deux évaluations. Le
// compteur n'est pas sauvegardé (une partie rechargée évalue dès son premier pas). La nuit, l'absence et le
// départ appellent toujours updateChapters directement.
export const PAS_OBJECTIFS = 5;
const pasObjectifs = new WeakMap();   // partie → pas depuis la dernière évaluation
const objectifsVus = new WeakSet();   // parties dont un geste attend d'être évalué
export function objectifsARevoir(state) {
  if (state && typeof state === 'object') objectifsVus.add(state);
}
export function chapitresAuPas(state) {
  const n = pasObjectifs.get(state) || 0;
  if (n % PAS_OBJECTIFS === 0 || objectifsVus.has(state)) {
    pasObjectifs.set(state, 1);
    objectifsVus.delete(state);
    return updateChapters(state);
  }
  pasObjectifs.set(state, n + 1);
  if (state.campagne) noteItemRecords(state);
  return 0;
}

/* ---------- version 1.3 : le courrier ---------- */

export function mailbox(state) {
  return Array.isArray(state.courrier) ? state.courrier : [];
}

export function mailReceived(state, id) {
  return mailbox(state).some((l) => l.id === id);
}

// Lettres pas encore lues, dans l'ordre d'arrivée.
export function unreadMail(state) {
  return mailbox(state).filter((l) => !l.lu);
}

// La condition d'une lettre est-elle remplie ? Toutes ses clés doivent l'être (une lettre sans clé connue
// n'arrive jamais). Le récit, lot 9 : chapitre (le chapitre de la campagne atteint), fait (un fait du récit,
// ou une liste : tous notés) et apres (avec fait : au moins ce nombre de jours depuis que le premier l'a été).
function mailDue(state, def) {
  const q = def.quand || {};
  const tests = [];
  if (q.depart) tests.push(!!(state.departV2 && state.famille && state.famille.configuree));
  if (q.debloque) tests.push(!!state.campagne && isUnlocked(state, q.debloque));
  if (q.niveau) tests.push(levelReached(state) >= q.niveau); // version 1.14
  if (q.chapitre) tests.push(!!state.campagne && chapterReached(state) >= q.chapitre);
  if (q.fait) {
    const faits = Array.isArray(q.fait) ? q.fait : [q.fait];
    // (fiche I7c : les faits du récit, par l'aiguillage ; le chantier allumé, aucun, et le courrier ne vient pas)
    const R = recitPour(state);
    tests.push(faits.every((f) => R.aFait(state, f)) && (!q.apres || R.ageFait(state, faits[0]) !== null && R.premierJourFait(state, faits[0]) + q.apres <= state.day));
  }
  return tests.length > 0 && tests.every(Boolean);
}


// Fait arriver les lettres dont la condition vient d'être remplie : les cadeaux
// vont dans l'inventaire, la lettre dans state.courrier (non lue). Une lettre
// n'arrive qu'une fois ; une partie qui remplissait déjà la condition avant la
// version 1.3 la reçoit au premier passage. Renvoie les identifiants arrivés.
export function deliverMail(state) {
  const arrivees = [];
  for (const [id, def] of Object.entries(DATA.COURRIER)) {
    if (mailReceived(state, id) || !mailDue(state, def)) continue;
    if (!Array.isArray(state.courrier)) state.courrier = [];
    for (const [item, qty] of Object.entries(def.cadeaux || {})) addItem(state, item, qty);
    state.courrier.push({ id, nuit: state.day, lu: false });
    arrivees.push(id);
  }
  return arrivees;
}

// Le joueur a ouvert la lettre : elle reste dans le courrier, marquée lue.
export function readMail(state, id) {
  const l = mailbox(state).find((x) => x.id === id);
  if (!l || !DATA.COURRIER[id]) return fail('Lettre introuvable.');
  l.lu = true;
  // Version 1.14 : les pièces d'une lettre sont versées une fois, à l'ouverture (sans XP).
  const pieces = DATA.COURRIER[id].pieces || 0;
  if (pieces && !l.verse) {
    earn(state, pieces, `Lettre : ${DATA.COURRIER[id].expediteur || 'courrier'}`);
    l.verse = true;
    return { ok: true, id, pieces };
  }
  return { ok: true, id, pieces: 0 };
}

// Le joueur a vu l'écran de fin du chapitre : on l'enlève de la file.
export function acknowledgeChapter(state) {
  const c = state.campagne;
  if (!c || !c.annonces.length) return fail('Rien à annoncer.');
  c.annonces.shift();
  return { ok: true, restantes: c.annonces.length };
}

/* -- compteurs de nuit -- */

// Fin de la nuit (avant le passage au jour suivant) : la série de pontes (remise à zéro dès qu'une nuit
// l'interrompt) et, en jeu libre, 1 PT toutes les MODE_LIBRE_NUITS nuits.
export function recordNight(state) {
  const c = state.campagne;
  if (!c) return;
  const k = c.compteurs;
  // (B-1 : PENALITES.SERIE_REMISE coupée, une nuit sans œuf ne remet pas la série à zéro : les nuits se cumulent)
  if (chapterReached(state) >= objectiveChapter('pontes', state)) k.serieOeufs = (state.nuit.oeufs || 0) > 0 ? k.serieOeufs + 1 : penalite('SERIE_REMISE') ? 0 : k.serieOeufs;
  if (c.fini) {
    const pt = techPoints(state);
    pt.libre += 1;
    if (pt.libre % DATA.ARBRE.POINTS.MODE_LIBRE_NUITS === 0) grantTechPoints(state, 1, 'Jeu libre');
  }
}

/* -- ce que possède une partie (migration) -- */

// L'ancien Champ d'une sauvegarde d'avant la version 15 (MIGRATIONS[14]), ou
// null : une partie à jour n'a plus ce bâtiment. Ne sert qu'aux migrations.
export function legacyChamp(state) {
  return state.champ && typeof state.champ === 'object' ? state.champ : null;
}

// Parcelles de la Zone de culture d'une sauvegarde, ancienne (Potager + Champ) ou à jour.
export function ownedPlots(state) {
  const list = (b) => (b && Array.isArray(b.parcelles) ? b.parcelles : []);
  return [...list(state.potager), ...list(legacyChamp(state))];
}

// Une partie possède-t-elle déjà cet élément débloqué par un chapitre ?
export function ownsElement(state, id) {
  const built = (b) => !!(b && b.construit);
  switch (id) {
    // 'champ' : l'ancien Champ construit (sauvegarde d'avant la version 15), ou
    // une culture de plein champ en terre. (La liste n'est pas DATA.CULTURES[].pleinChamp : le
    // tournesol, de plein champ lui aussi, datait du chapitre 4 et a sa propre ligne.)
    case 'champ': return built(legacyChamp(state)) || ownedPlots(state).some((p) => p && ['ble', 'riz', 'houblon'].includes(p.culture));
    case 'silo': return built(state.silo);
    case 'poulailler': return built(state.poulailler) || (state.poulailler && state.poulailler.poules > 0);
    case 'four': case 'cuisine': case 'moulin': case 'presse':
      return built(state.stations && state.stations[id]);
    case 'tournesol':
      return ownedPlots(state).some((p) => p && p.culture === 'tournesol');
    case 'paturage': return built(state.paturage);
    case 'moutons': return !!(state.paturage && Array.isArray(state.paturage.moutons) && state.paturage.moutons.length > 0);
    case 'serre': return built(state.serre);
    case 'verger': return built(state.verger) || !!(state.verger && Array.isArray(state.verger.arbres) && state.verger.arbres.length > 0);
    case 'frigo': return built(state.frigo);
    default: return false;
  }
}

// Chapitre d'une ancienne partie : le plus avancé de ceux dont elle possède déjà
// un élément. Sans aucun élément débloqué : chapitre 2 si elle a déjà passé une
// nuit ou agrandi le Potager, sinon chapitre 1.
export function inferChapter(state) {
  let chapitre = 0;
  for (const [id, ch] of Object.entries(LEGACY_CHAPTER)) {
    if (ownsElement(state, id)) chapitre = Math.max(chapitre, ch);
  }
  if (chapitre > 0) return chapitre;
  const niveau = state.potager && typeof state.potager.niveau === 'number' ? state.potager.niveau : 1;
  return (typeof state.day === 'number' && state.day > 1) || niveau > 1 ? 2 : 1;
}
