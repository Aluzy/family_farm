import { DATA } from './catalog.js';
import { EPS } from './base.js';
import { allDevices, fail, isBroken, needsService } from './devices.js';
import { expiringSoon } from './inventory.js';
import { availableEnergy } from './fridge.js';
import { allPlots, isMature } from './crops.js';
import { hensToFeed, sheepToShear, strawMissing } from './animals.js';
import { techAuto } from './techtree.js';
import { unreadMail } from './campaign.js';
import { createInitialState } from './state.js';

/* ---------- Lot 11 : alertes (notifications de l'interface) ---------- */

// Photo des situations qui méritent une notification : appareils en panne ou à
// entretenir, batteries vides, réfrigérateur allumé mais sans courant, paille
// insuffisante pour nourrir les moutons et les vaches cette nuit (version 1.1).
export function alertSnapshot(state) {
  const f = state.frigo;
  const d = f && f.construit ? f.appareil : null;
  return {
    panne: allDevices(state).filter(isBroken).map((x) => x.id),
    entretien: allDevices(state).filter(needsService).map((x) => x.id),
    batteriesVides: state.batteries.some((b) => b.allume && !isBroken(b)) && availableEnergy(state) <= EPS,
    frigoCoupe: !!(d && d.allume && !isBroken(d) && !f.alimente),
    pailleManque: strawMissing(state) > 0,
  };
}

// Ce qui vient d'arriver entre deux photos : [{ type, id? }], type parmi
// 'panne', 'entretien', 'batteriesVides', 'frigoCoupe', 'pailleManque'.
export function alertEvents(before, after) {
  const events = [];
  for (const id of after.panne) if (!before.panne.includes(id)) events.push({ type: 'panne', id });
  for (const id of after.entretien) if (!before.entretien.includes(id)) events.push({ type: 'entretien', id });
  if (after.batteriesVides && !before.batteriesVides) events.push({ type: 'batteriesVides' });
  if (after.frigoCoupe && !before.frigoCoupe) events.push({ type: 'frigoCoupe' });
  if (after.pailleManque && !before.pailleManque) events.push({ type: 'pailleManque' });
  return events;
}

/* ---------- Centre de notifications : les alertes du jour ---------- */

// Ce qui demande l'attention du joueur maintenant. Fonction pure, recalculée à
// chaque appel depuis l'état : rien n'est stocké (pas de migration) et une
// alerte disparaît dès que sa cause est réglée. Une entrée par catégorie (pas
// de doublon), triée par priorité (1 = urgent, 2 = utile, 3 = à faire) puis
// par ordre de définition. Les tâches déjà automatisées par l'arbre des
// technologies n'y figurent pas : la nuit s'en charge.
// Renvoie [{ id, type, texte, priorite, icone, nombre }].
export function getNotifications(state) {
  const out = [];
  const add = (type, priorite, icone, nombre, un, plusieurs) => {
    if (nombre > 0) out.push({ id: type, type, texte: nombre === 1 ? un : plusieurs.replace('{n}', nombre), priorite, icone, nombre });
  };
  const snap = alertSnapshot(state);
  const auto = (tache, lieu) => techAuto(state, tache, lieu);

  // 1 : la ferme s'arrête ou la famille risque de manquer.
  add('panne', 1, '🔧', snap.panne.length, '1 appareil en panne', '{n} appareils en panne');
  add('batteriesVides', 1, '🔋', snap.batteriesVides ? 1 : 0, 'Batteries vides', 'Batteries vides');
  add('frigoCoupe', 1, '❄️', snap.frigoCoupe ? 1 : 0, 'Réfrigérateur sans courant', 'Réfrigérateur sans courant');
  const perissent = Object.values(expiringSoon(state)).reduce((t, n) => t + n, 0);
  add('peremption', 1, '⏳', perissent, '1 aliment périra cette nuit', '{n} aliments périront cette nuit');

  // 2 : à faire aujourd'hui pour que la nuit se passe bien.
  const plots = allPlots(state).filter((p) => p.culture);
  const nonArrosees = plots.filter((p) => !p.arrose && !isMature(p) && !auto('arrosage', p.lieu)).length;
  add('arrosage', 2, '💧', nonArrosees, '1 parcelle non arrosée', '{n} parcelles non arrosées');
  const hens = state.poulailler && state.poulailler.construit && !auto('nourrissage', 'poulailler') ? Math.max(0, hensToFeed(state)) : 0;
  add('poules', 2, '🐔', hens, '1 poule à nourrir', '{n} poules à nourrir');
  // Version 1.1 : les moutons et les vaches mangent de la paille chaque nuit.
  const paille = strawMissing(state);
  add('paille', 2, DATA.items[DATA.PATURAGE.nourriture].icone, paille, 'Il manque de la paille : 1 de plus pour nourrir les animaux cette nuit', 'Il manque de la paille : {n} de plus pour nourrir les animaux cette nuit');
  add('entretien', 2, '🛠️', snap.entretien.length, '1 appareil à entretenir', '{n} appareils à entretenir');

  // 3 : récoltes et tontes prêtes.
  const mures = plots.filter((p) => isMature(p) && !auto('recolte', p.lieu)).length;
  add('recolte', 3, '🧺', mures, '1 récolte prête', '{n} récoltes prêtes');
  const laine = auto('tonte', 'paturage') ? 0 : sheepToShear(state);
  add('tonte', 3, '🐑', laine, '1 mouton à tondre', '{n} moutons à tondre');

  return out.map((n, i) => ({ n, i })).sort((a, b) => a.n.priorite - b.n.priorite || a.i - b.i).map((x) => x.n);
}

// Pastille du menu du bas : nombre d'alertes en cours, plus les lettres à lire.
export function notificationCount(state) {
  return getNotifications(state).length + unreadMail(state).length;
}

/* ---------- Lot 11 : bulles d'aide de la première partie ---------- */

export function newTutorial() {
  return { etape: 0, fini: false };
}

// Bulle à afficher : 'eau', 'potager', 'dormir', ou null (aide terminée).
export function tutorialStep(state) {
  const a = state.aide;
  if (!a || a.fini) return null;
  return DATA.AIDE.ETAPES[a.etape] || null;
}

// « Compris » : passe à la bulle suivante (la dernière termine l'aide).
export function advanceTutorial(state) {
  const a = state.aide;
  if (!a || a.fini) return fail('L\'aide est déjà terminée.');
  a.etape += 1;
  if (a.etape >= DATA.AIDE.ETAPES.length) a.fini = true;
  return { ok: true, etape: tutorialStep(state) };
}

// « Passer l'aide » : ferme toutes les bulles.
export function skipTutorial(state) {
  const a = state.aide;
  if (!a || a.fini) return fail('L\'aide est déjà terminée.');
  a.fini = true;
  return { ok: true };
}

// Appelée par sleep() : dormir pendant la bulle « dormir » la valide.
export function noteTutorialSleep(state) {
  if (tutorialStep(state) === 'dormir') advanceTutorial(state);
}

// Nouvelle partie depuis les Options : état de départ, mais un joueur qui a déjà
// vu les bulles d'aide ne les revoit pas (elles sont pour la première partie).
export function newGameFrom(previous, seed) {
  const s = createInitialState(seed);
  if (previous && previous.aide && previous.aide.fini) s.aide = { ...previous.aide };
  return s;
}
