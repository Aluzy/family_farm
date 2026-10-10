import { DATA } from './catalog.js';
import { EPS } from './base.js';
import { fail, isOwned, starterOf } from './devices.js';
import { addItem, lotsOf } from './inventory.js';
import { fridgeLots } from './fridge.js';
import { planMeal } from './family.js';
import { averageHappiness } from './ville.js';
import { plantableCrops } from './crops.js';
import { checkMastery, grantTechPoints, isBuilt, techPoints } from './techtree.js';
import { gainXp, levelReached, unlockLevel } from './levels.js';

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
  };
}

/* -- autonomie -- */

// Autonomie d'une nuit en % : énergie « produit » mangée ÷ besoin, plafonnée à 100.
export function autonomyPercent(energieProduit, besoin) {
  if (!(besoin > 0)) return 0;
  return Math.min(100, Math.floor((energieProduit * 100) / besoin)); // % entier, vers le bas
}

// Part de `qty` unités qui vient de lots « produit », en parcourant les lots dans
// l'ordre où on les retire (sans rien modifier).
export function producedShare(lots, qty) {
  let rest = qty;
  let produit = 0;
  for (const lot of lots) {
    if (rest <= 0) break;
    const n = Math.min(lot.qty, rest);
    if (lot.origin === DATA.ORIGINE.PRODUIT) produit += n;
    rest -= n;
  }
  return produit;
}

// Autonomie prévue pour la nuit qui vient (repas prévu, origines comprises).
export function plannedAutonomy(state) {
  if (state.repas) return state.repas.autonomie; // le repas de 19 h est déjà pris
  const plan = planMeal(state);
  let produit = 0;
  for (const [item, n] of Object.entries(plan.mange)) {
    const cold = plan.froid[item] || 0;
    const energie = DATA.items[item].energie;
    produit += producedShare(lotsOf(state, item), n - cold) * energie;
    if (cold > 0) produit += producedShare(fridgeLots(state, item), cold) * energie;
  }
  return autonomyPercent(produit, plan.besoin);
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
  const requis = DATA.crops[culture].requiert;
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

export function bumpCounter(state, key, amount) {
  const c = state.campagne;
  if (c && amount > 0) c.compteurs[key] = (c.compteurs[key] || 0) + amount;
}

// Record d'énergie stockée : somme de la charge des batteries.
export function noteEnergyRecord(state) {
  const c = state.campagne;
  if (!c) return;
  const total = state.batteries.reduce((t, b) => t + b.chargeMwh, 0);
  if (!(total <= c.compteurs.mwhMax)) c.compteurs.mwhMax = total;
}

// Une recette vient de se terminer : pain cuit, ou plat différent préparé. Les
// transformations (Moulin, Presse) ne comptent ni comme pain ni comme plat.
export function noteRecipeDone(state, recette, qty) {
  const c = state.campagne;
  const r = DATA.recipes[recette];
  if (!c || !r || r.transformation) return;
  const pain = objectiveDef('pains');
  if (pain && recette === pain.recette) {
    c.compteurs.pains += qty;
    return;
  }
  const exclus = (objectiveDef('plats') || {}).exclut || [];
  if (!exclus.includes(recette) && !c.compteurs.plats.includes(recette)) c.compteurs.plats.push(recette);
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
    case 'maison': return !(state.maison && state.maison.reparee === false) ? 1 : 0;
    case 'panneau': case 'pompe': case 'reservoir': return isOwned(starterOf(state, obj.type)) ? 1 : 0;
    case 'houe': return state.potager && state.potager.houe ? 1 : 0;
    case 'recoltes': return k.recoltes || 0;
    case 'niveau': return levelReached(state);
    case 'cultures': return Array.isArray(k.cultures) ? k.cultures.length : 0;
    case 'silo': return state.silo && state.silo.construit ? 1 : 0;
    case 'semisBle': return k.semisBle || 0;
    case 'siloBle': return state.silo ? Math.floor(state.silo.ble || 0) : 0;
    default: return 0;
  }
}

// Progression d'un chapitre : { chapitre, titre, icone, intro, objectifs: [{ ...objectif,
// valeur, ok, ratio }], fait }.
export function chapterProgress(state, chapitre = state.campagne.chapitre) {
  const def = DATA.CHAPITRES.liste[chapitre - 1];
  const objectifs = def.objectifs.map((o) => {
    const valeur = objectiveValue(state, o);
    return { ...o, valeur, ok: valeur + EPS >= o.cible, ratio: Math.max(0, Math.min(1, valeur / o.cible)) };
  });
  return { chapitre, titre: def.titre, icone: def.icone, intro: def.intro, objectifs, fait: objectifs.every((o) => o.ok) };
}

// Terminer le chapitre en cours : on l'annonce, puis le suivant s'ouvre (ou la
// campagne s'achève, mode libre).
export function completeChapter(state) {
  const c = state.campagne;
  if (!c || c.fini) return fail('La campagne est terminée.');
  c.annonces.push({ chapitre: c.chapitre, nuit: state.day });
  // Arbre v2 : chaque chapitre terminé rapporte des points de technologie.
  grantTechPoints(state, DATA.techtree.POINTS.CHAPITRES[c.chapitre - 1] || 0, `Chapitre ${c.chapitre} terminé`);
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
export function mailDue(state, def) {
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
    state.pieces += pieces;
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
export function trackHold(state, pct) {
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
  const pct = autonomyPercent(energie, n.besoin);
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
      if (pt.libre % DATA.techtree.POINTS.MODE_LIBRE_NUITS_100 === 0) grantTechPoints(state, 1, 'Mode libre : nuits à 100 %');
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
    // une culture de plein champ en terre.
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
