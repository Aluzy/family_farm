import { DATA } from './catalog.js';
import { EPS, floorPercent } from './base.js';
import { fail, isOwned, starterOf, storedEnergy } from './devices.js';
import { earn } from './compta.js';
import { addItem, countItem } from './inventory.js';
import { autonomieJour } from './repas.js';
import { averageHappiness } from './bonheur.js';
import { plantableCrops } from './crops.js';
import { checkMastery, grantTechPoints, isBuilt, techPoints } from './techtree.js';
import { gainXp, levelReached, unlockLevel } from './levels.js';
import { houseRepaired } from './depart.js';
import { farmTerrain } from './terrain.js';
import { hameauxVus } from './monde-hameaux.js';
import { partVue } from './monde-vu.js';

/* ---------- Lot 9 : autonomie et chapitres ---------- */

// state.campagne = { chapitre, fini, annonces, historique, compteurs }.
// chapitre : chapitre en cours (1 à 7) ; fini : la campagne est terminée (mode
// libre, tout est débloqué) ; annonces : chapitres terminés dont l'écran de fin
// n'a pas encore été vu [{ chapitre, nuit }] ; historique : autonomie de chaque
// nuit [{ nuit, pct, energie }] ; compteurs : eau pompée (mL), record d'énergie
// stockée (mWh), carottes récoltées, nuits de ponte d'affilée, pains cuits, plats
// différents préparés, laines tondues, nuits à 100 % d'affilée, suivi de la tenue
// (chapitre 6).
export function newCampaign() {
  return {
    chapitre: 1,
    fini: false,
    annonces: [],
    historique: [],
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
    serie100: 0,
    nuits100: 0, // nuits à 100 % d'autonomie au total (jalon de maîtrise)
    tenue: null, // série de nuits en cours de suivi : { debut, nuits, somme }
    tenueDerniere: null, // dernière série terminée : { moyenne, sansSoin, reussi }
    tenueReussie: false,
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

/* -- autonomie -- */

// Autonomie d'une nuit en % : points mangés venus de la ferme ÷ points mangés, plafonnée à 100.
export function autonomyPercent(energieProduit, besoin) {
  return floorPercent(energieProduit, besoin);
}

// Autonomie prévue pour la nuit qui vient : celle de ce que la famille a mangé aujourd'hui
// (repas.js), ou celle de la dernière nuit si elle n'a encore rien mangé.
export function plannedAutonomy(state) {
  return autonomieJour(state, lastAutonomy(state));
}

export function autonomyHistory(state, count = DATA.AUTONOMIE.GRAPHIQUE_NUITS) {
  const h = state.campagne && Array.isArray(state.campagne.historique) ? state.campagne.historique : [];
  return h.slice(-count);
}

// Autonomie de la dernière nuit (0 avant la première nuit).
export function lastAutonomy(state) {
  const h = autonomyHistory(state, 1);
  return h.length ? h[0].pct : 0;
}

/* -- chapitres et déblocages -- */

export function chapterCount() {
  return DATA.CHAPITRES.liste.length;
}

// Chapitre atteint : 1 à 7 pendant la campagne, 8 en mode libre (tout est débloqué).
export function chapterReached(state) {
  const c = state.campagne;
  if (!c) return chapterCount() + 1;
  return c.fini ? chapterCount() + 1 : c.chapitre;
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

// Numéro du premier chapitre qui porte un objectif de ce type.
export function objectiveChapter(type) {
  return DATA.CHAPITRES.liste.findIndex((ch) => ch.objectifs.some((o) => o.type === type)) + 1;
}

export function objectiveDef(type) {
  for (const ch of DATA.CHAPITRES.liste) {
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
  const pain = objectiveDef('pains');
  if (pain && recette === pain.recette) {
    c.compteurs.pains += qty;
    return;
  }
  const exclus = (objectiveDef('plats') || {}).exclut || [];
  if (!exclus.includes(recette) && !c.compteurs.plats.includes(recette)) c.compteurs.plats.push(recette);
}

// Version 1.22 : les objets suivis par un objectif « objet » (minerai de fer, lingot de
// fer…), de tous les chapitres.
function trackedItems() {
  return [...new Set(DATA.CHAPITRES.liste.flatMap((ch) => ch.objectifs.filter((o) => o.type === 'objet').map((o) => o.item)))];
}

// Le record de chacun de ces objets dans l'inventaire : un minerai fondu ou un lingot
// dépensé dans l'Arbre des technologies reste compté. Appelée par updateChapters (à
// chaque pas d'horloge), dès le début de la partie : ce qu'on a eu avant le chapitre compte.
function noteItemRecords(state) {
  const c = state.campagne;
  if (!c) return;
  for (const item of trackedItems()) {
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

// Valeur actuelle d'un objectif.
export function objectiveValue(state, obj) {
  const k = state.campagne.compteurs;
  switch (obj.type) {
    case 'litres': return Math.floor((k.eauMl || 0) / 1000);
    case 'wh': return Math.floor((k.mwhMax || 0) / 1000);
    case 'carottes': return k.carottes;
    case 'autonomie': return lastAutonomy(state);
    case 'pontes': return k.serieOeufs;
    case 'bonheur': return averageHappiness(state); // version 1.8 (à la place de la santé)
    case 'pains': return k.pains;
    case 'plats': return k.plats.length;
    case 'laines': return k.laines;
    case 'tenue': return k.tenueReussie ? 1 : 0;
    case 'serie100': return k.serie100;
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
    case 'caleche': return Math.floor(k.calecheVentes || 0);
    case 'achatsHameaux': return Math.floor(k.achatsHameaux || 0);
    case 'pecheMer': return Math.floor(k.pecheMer || 0);
    case 'hameaux': return Object.keys(hameauxVus(state)).length;
    case 'monde': return partDuMonde(state);
    case 'grotteMonde': return evenement(state, 'carte:grotte_monde') ? 1 : 0;
    case 'faune': return Object.keys(evenements(state)).filter((e) => e.startsWith('faune:')).length;
    default: return 0;
  }
}

// Progression d'un chapitre : { chapitre, titre, icone, intro, objectifs: [{ ...objectif,
// valeur, ok, ratio }], fait }.
// Sur une terre sauvage, l'intro et les libellés ont leur version (introSauvage,
// libelleSauvage) quand elle existe ; les objectifs marqués sauvage: false n'y existent pas (le
// panneau, la pompe, la citerne).
export function chapterProgress(state, chapitre = state.campagne.chapitre) {
  const def = DATA.CHAPITRES.liste[chapitre - 1];
  const objectifs = def.objectifs.filter((o) => o.sauvage !== false).map((o) => {
    const valeur = objectiveValue(state, o);
    return { ...o, libelle: o.libelleSauvage || o.libelle, valeur, ok: valeur + EPS >= o.cible, ratio: Math.max(0, Math.min(1, valeur / o.cible)) };
  });
  return { chapitre, titre: def.titre, icone: def.icone, intro: def.introSauvage || def.intro, objectifs, fait: objectifs.every((o) => o.ok) };
}

// Le texte de la lettre `id` : sa version d'une terre sauvage (texteSauvage) s'il y en a une.
export function mailText(state, id) {
  const def = DATA.COURRIER[id];
  return def.texteSauvage || def.texte;
}

// Terminer le chapitre en cours : on l'annonce, puis le suivant s'ouvre (ou la
// campagne s'achève, mode libre).
export function completeChapter(state) {
  const c = state.campagne;
  if (!c || c.fini) return fail('La campagne est terminée.');
  c.annonces.push({ chapitre: c.chapitre, nuit: state.day });
  // Arbre v2 : chaque chapitre terminé rapporte des points de technologie.
  grantTechPoints(state, DATA.ARBRE.POINTS.CHAPITRES[c.chapitre - 1] || 0, `Chapitre ${c.chapitre} terminé`);
  // Version 1.7 : et de l'expérience (le succès « chapitre n terminé »).
  gainXp(state, DATA.NIVEAUX.CHAPITRES_XP[c.chapitre - 1] || 0);
  if (c.chapitre >= chapterCount()) c.fini = true;
  else c.chapitre += 1;
  return { ok: true, chapitre: c.chapitre, fini: c.fini };
}

// Passe au chapitre suivant tant que l'objectif du chapitre en cours est rempli.
// Renvoie le nombre de chapitres terminés. Appelée à chaque tick et à chaque réveil.
export function updateChapters(state) {
  const c = state.campagne;
  if (!c) return 0;
  noteItemRecords(state);
  let done = 0;
  while (!c.fini && done < chapterCount() && chapterProgress(state).fait) {
    completeChapter(state);
    done++;
  }
  checkMastery(state); // Arbre v2 : jalons de maîtrise
  deliverMail(state); // version 1.3 : le courrier que ce stade de la partie fait arriver
  return done;
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

// La condition d'une lettre est-elle remplie ?
function mailDue(state, def) {
  const q = def.quand || {};
  if (q.depart) return !!(state.departV2 && state.famille && state.famille.configuree);
  if (q.debloque) return !!state.campagne && isUnlocked(state, q.debloque);
  if (q.niveau) return levelReached(state) >= q.niveau; // version 1.14
  return false;
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

// Suivi de la tenue du chapitre 6 (version 1.6, à la place de l'hiver) : une
// série de `nuits` nuits commence à la première nuit où le chapitre est atteint.
// Elle réussit si l'autonomie y vaut `moyenne` % en moyenne (version 1.8 : plus de
// soins, donc plus de condition « sans soin »). Une série ratée laisse place à une
// nouvelle dès la nuit suivante.
function trackHold(state, pct) {
  const k = state.campagne.compteurs;
  const obj = objectiveDef('tenue');
  if (!obj || k.tenueReussie || chapterReached(state) < objectiveChapter('tenue')) return;
  if (!k.tenue) k.tenue = { debut: state.day, nuits: 0, somme: 0 };
  const w = k.tenue;
  w.nuits += 1;
  w.somme += pct;
  if (w.nuits < obj.nuits) return;
  const moyenne = Math.floor(w.somme / w.nuits);
  const reussi = moyenne + EPS >= obj.moyenne;
  k.tenueDerniere = { moyenne, reussi };
  if (reussi) k.tenueReussie = true;
  k.tenue = null;
}

// Où en est l'objectif de tenue (pour l'interface) : 'reussi', 'suivi' (série en
// cours) ou 'attente' (la série commencera à la prochaine nuit).
export function holdStatus(state) {
  const k = state.campagne.compteurs;
  const dernier = k.tenueDerniere;
  if (k.tenueReussie) return { etat: 'reussi', dernier };
  if (k.tenue) {
    return {
      etat: 'suivi', dernier, nuits: k.tenue.nuits,
      moyenne: k.tenue.nuits ? k.tenue.somme / k.tenue.nuits : 0,
    };
  }
  return { etat: 'attente', dernier };
}

// Fin de la nuit (avant le passage au jour suivant) : autonomie de la nuit dans
// l'historique, séries d'affilée (remises à zéro dès qu'une nuit les interrompt),
// suivi de la tenue.
export function recordNight(state) {
  const c = state.campagne;
  if (!c) return null;
  const n = state.nuit;
  const energie = n.energieProduit || 0;
  // (une journée où la famille n'a rien mangé garde l'autonomie de la nuit d'avant)
  const pct = n.besoin > 0 ? autonomyPercent(energie, n.besoin) : lastAutonomy(state);
  n.autonomie = pct;
  c.historique.push({ nuit: state.day, pct, energie });
  const max = DATA.AUTONOMIE.HISTORIQUE_MAX;
  if (c.historique.length > max) c.historique.splice(0, c.historique.length - max);
  const k = c.compteurs;
  const reached = chapterReached(state);
    if (reached >= objectiveChapter('pontes')) k.serieOeufs = (n.oeufs || 0) > 0 ? k.serieOeufs + 1 : 0;
  if (reached >= objectiveChapter('serie100')) k.serie100 = pct >= 100 ? k.serie100 + 1 : 0;
  // Arbre v2 : nuits à 100 % au total, et en mode libre 1 PT toutes les N nuits à 100 %.
  if (pct >= 100) {
    k.nuits100 = (k.nuits100 || 0) + 1;
    if (c.fini) {
      const pt = techPoints(state);
      pt.libre += 1;
      if (pt.libre % DATA.ARBRE.POINTS.MODE_LIBRE_NUITS_100 === 0) grantTechPoints(state, 1, 'Mode libre : nuits à 100 %');
    }
  }
  trackHold(state, pct);
  return pct;
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
