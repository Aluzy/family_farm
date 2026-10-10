import { DATA } from './catalog.js';
import { applyMealHappiness, dishHappiness, memberHappiness } from './ville.js';
import { EPS } from './base.js';
import { fail } from './devices.js';
import { hourOfDay } from './clock.js';
import { countItem, nextExpiry, takeItem } from './inventory.js';
import { fridgeCount, takeFromFridge } from './fridge.js';
import { newStableReport } from './animals.js';
import { energyMax, restoreEnergy, snackEnergy } from './stamina.js';
import { newAutoReport } from './automation.js';
import { autonomyPercent } from './campaign.js';

/* ---------- Lot 2 : famille (version 1.8 : plus de santé) ---------- */

// nom : le rôle fixe (« Adulte 1 ») ; prenom, genre, teint : le profil choisi
// par le joueur (version 1.1), au départ le rôle, le sexe de DATA et le jaune.
export function makeMember(def) {
  return { id: def.id, nom: def.nom, enfant: def.enfant, bonheur: DATA.VILLE.BONHEUR.DEPART, ...defaultMemberProfile(def) };
}

/* ---------- version 1.1 : profil des membres de la famille ---------- */

// Profil de départ d'un membre (défini dans DATA.FAMILY.MEMBRES, ou un membre
// inconnu d'une sauvegarde importée) : prénom = son rôle, teinte 0.
export function defaultMemberProfile(def) {
  const P = DATA.FAMILY.PROFIL;
  const base = DATA.FAMILY.MEMBRES.find((m) => m.id === (def && def.id));
  const genre = base ? base.genre : P.GENRES[0];
  const nom = (base && base.nom) || (def && typeof def.nom === 'string' && def.nom) || 'Membre';
  return { prenom: nom, genre, teint: 0 };
}

// Prénom nettoyé : les espaces et retours à la ligne deviennent une seule
// espace, sans espace au début ni à la fin. Renvoie '' si ce n'est pas un texte.
export function cleanFirstName(text) {
  if (typeof text !== 'string') return '';
  return text.replace(/[\u0000-\u001f\u007f\s]+/g, ' ').trim();
}

// Un prénom est valide s'il compte 1 à PRENOM_MAX caractères une fois nettoyé
// (un caractère accentué ou un emoji compte pour un).
export function validFirstName(text) {
  const n = Array.from(cleanFirstName(text)).length;
  return n >= 1 && n <= DATA.FAMILY.PROFIL.PRENOM_MAX;
}

// Emoji d'un portrait : 👩 / 👨 pour un adulte, 👧 / 👦 pour un enfant, suivi de
// la teinte choisie (rien pour le jaune par défaut). Des valeurs inconnues
// retombent sur le premier sexe et le jaune.
export function portraitEmoji(enfant, genre, teint) {
  const P = DATA.FAMILY.PROFIL;
  const set = P.PORTRAITS[enfant ? 'enfant' : 'adulte'];
  const base = set[genre] || set[P.GENRES[0]];
  return base + (P.TEINTS[teint] || '');
}

// Prénom affiché d'un membre : celui choisi, sinon son rôle. Texte brut : à
// passer par escapeHtml() avant de l'écrire dans une page.
export function memberName(state, id) {
  const m = findMember(state, id);
  if (!m) return '';
  return validFirstName(m.prenom) ? cleanFirstName(m.prenom) : String(m.nom || '');
}

// Portrait (emoji) d'un membre, selon son âge, son sexe et sa teinte.
export function memberPortrait(state, id) {
  const m = findMember(state, id);
  if (!m) return '';
  return portraitEmoji(m.enfant, m.genre, m.teint);
}

// Change le profil d'un membre : { prenom, genre, teint }. Un champ absent
// garde sa valeur. Tout est vérifié avant de rien modifier : prénom de 1 à
// PRENOM_MAX caractères (nettoyé), genre 'f' ou 'm', teinte entière de 0 à 5.
export function setMemberProfile(state, id, profil) {
  const P = DATA.FAMILY.PROFIL;
  const m = findMember(state, id);
  if (!m) return fail('Membre introuvable.');
  if (!profil || typeof profil !== 'object') return fail('Profil invalide.');
  const next = { prenom: m.prenom, genre: m.genre, teint: m.teint };
  if (profil.prenom !== undefined) {
    if (typeof profil.prenom !== 'string' || cleanFirstName(profil.prenom) === '') return fail('Écris un prénom.');
    if (!validFirstName(profil.prenom)) return fail(`Le prénom doit faire ${P.PRENOM_MAX} caractères au plus.`);
    next.prenom = cleanFirstName(profil.prenom);
  }
  if (profil.genre !== undefined) {
    if (!P.GENRES.includes(profil.genre)) return fail('Choix inconnu.');
    next.genre = profil.genre;
  }
  if (profil.teint !== undefined) {
    if (!Number.isInteger(profil.teint) || profil.teint < 0 || profil.teint >= P.TEINTS.length) return fail('Couleur inconnue.');
    next.teint = profil.teint;
  }
  m.prenom = next.prenom;
  m.genre = next.genre;
  m.teint = next.teint;
  return { ok: true, id: m.id };
}

/* ---------- version 1.2 : composition de la famille et animaux de compagnie ---------- */

// Dernier numéro utilisé par type d'identifiant (« adulte-3 » → 3), d'après les
// membres et les animaux présents : { adulte, enfant, compagnon }.
export function familyNumbers(membres, animaux) {
  const n = { adulte: 0, enfant: 0, compagnon: 0 };
  for (const x of [...(Array.isArray(membres) ? membres : []), ...(Array.isArray(animaux) ? animaux : [])]) {
    const m = x && typeof x.id === 'string' ? x.id.match(/^(adulte|enfant|compagnon)-(\d+)$/) : null;
    if (m) n[m[1]] = Math.max(n[m[1]], Number(m[2]));
  }
  return n;
}

export function adultCount(state) {
  return state.famille.membres.filter((m) => !m.enfant).length;
}

export function childCount(state) {
  return state.famille.membres.filter((m) => m.enfant).length;
}

// Places encore libres dans la famille (0 à MEMBRES_MAX).
export function memberRoom(state) {
  return Math.max(0, DATA.FAMILY.COMPOSITION.MEMBRES_MAX - state.famille.membres.length);
}

// Prochain numéro d'un type d'identifiant ; le compteur de l'état avance.
export function nextFamilyNumber(state, type) {
  const f = state.famille;
  const vus = familyNumbers(f.membres, f.animaux);
  if (!f.numeros || typeof f.numeros !== 'object') f.numeros = vus;
  const n = Math.max(Number(f.numeros[type]) || 0, vus[type]) + 1;
  f.numeros[type] = n;
  return n;
}

// Ajoute un membre à la famille : un adulte, ou un enfant si `enfant` est vrai.
// Refusé au-delà de MEMBRES_MAX. Le nouveau venu arrive avec le bonheur moyen de
// la famille. Son besoin s'ajoute dès le prochain repas.
export function addMember(state, enfant = false) {
  const C = DATA.FAMILY.COMPOSITION;
  const f = state.famille;
  if (f.membres.length >= C.MEMBRES_MAX) return fail(`La famille est au complet : ${C.MEMBRES_MAX} membres au plus.`);
  const type = enfant ? 'enfant' : 'adulte';
  const n = nextFamilyNumber(state, type);
  const m = makeMember({ id: `${type}-${n}`, nom: `${enfant ? 'Enfant' : 'Adulte'} ${n}`, enfant: !!enfant });
  if (f.membres.length) m.bonheur = Math.round(f.membres.reduce((t, x) => t + memberHappiness(x), 0) / f.membres.length);
  f.membres.push(m);
  return { ok: true, id: m.id, besoin: familyNeed(state) };
}

// Pourquoi un membre ne peut pas quitter la famille (texte), ou '' s'il le peut :
// il reste toujours MEMBRES_MIN membre dont ADULTES_MIN adulte.
export function memberRemovalBlock(state, id) {
  const C = DATA.FAMILY.COMPOSITION;
  const m = findMember(state, id);
  if (!m) return 'Membre introuvable.';
  if (state.famille.membres.length <= C.MEMBRES_MIN) return 'Il faut au moins un membre dans la famille.';
  if (!m.enfant && adultCount(state) <= C.ADULTES_MIN) return 'Il faut au moins un adulte dans la famille.';
  return '';
}

// Retire un membre de la famille (voir memberRemovalBlock). Son besoin disparaît
// dès le prochain repas ; un repas déjà pris aujourd'hui n'est pas refait.
export function removeMember(state, id) {
  const raison = memberRemovalBlock(state, id);
  if (raison) return fail(raison);
  const f = state.famille;
  f.membres = f.membres.filter((m) => m.id !== id);
  return { ok: true, id, besoin: familyNeed(state) };
}

/* -- animaux de compagnie -- */

export function pets(state) {
  return Array.isArray(state.famille.animaux) ? state.famille.animaux : [];
}

export function findPet(state, id) {
  return pets(state).find((a) => a.id === id) || null;
}

export function petRoom(state) {
  return Math.max(0, DATA.FAMILY.COMPAGNIE.MAX - pets(state).length);
}

// Nom affiché d'un animal de compagnie (texte brut : à passer par escapeHtml()).
export function petName(state, id) {
  const a = findPet(state, id);
  if (!a) return '';
  const E = DATA.FAMILY.COMPAGNIE.ESPECES;
  return validFirstName(a.nom) ? cleanFirstName(a.nom) : (E[a.espece] ? E[a.espece].nom : 'Animal');
}

export function petIcon(espece) {
  const e = DATA.FAMILY.COMPAGNIE.ESPECES[espece];
  return e ? e.icone : '🐾';
}

// Adopte un chien ou un chat : refusé au-delà de COMPAGNIE.MAX. Gratuit, et sans
// effet sur le besoin journalier ni sur le bonheur.
export function addPet(state, espece) {
  const K = DATA.FAMILY.COMPAGNIE;
  if (!K.ESPECES[espece]) return fail('Cet animal ne s\'adopte pas.');
  if (!Array.isArray(state.famille.animaux)) state.famille.animaux = [];
  if (state.famille.animaux.length >= K.MAX) return fail(`${K.MAX} animaux de compagnie au plus.`);
  const n = nextFamilyNumber(state, 'compagnon');
  const a = { id: `compagnon-${n}`, espece, nom: `${K.ESPECES[espece].nom} ${n}` };
  state.famille.animaux.push(a);
  return { ok: true, id: a.id };
}

// Change le nom ou l'espèce d'un animal de compagnie : { nom, espece }. Un champ
// absent garde sa valeur ; tout est vérifié avant de rien modifier.
export function setPetProfile(state, id, profil) {
  const K = DATA.FAMILY.COMPAGNIE;
  const a = findPet(state, id);
  if (!a) return fail('Animal introuvable.');
  if (!profil || typeof profil !== 'object') return fail('Profil invalide.');
  let nom = a.nom;
  let espece = a.espece;
  if (profil.nom !== undefined) {
    if (typeof profil.nom !== 'string' || cleanFirstName(profil.nom) === '') return fail('Écris un nom.');
    if (!validFirstName(profil.nom)) return fail(`Le nom doit faire ${DATA.FAMILY.PROFIL.PRENOM_MAX} caractères au plus.`);
    nom = cleanFirstName(profil.nom);
  }
  if (profil.espece !== undefined) {
    if (!K.ESPECES[profil.espece]) return fail('Choix inconnu.');
    espece = profil.espece;
  }
  a.nom = nom;
  a.espece = espece;
  return { ok: true, id: a.id };
}

export function removePet(state, id) {
  if (!findPet(state, id)) return fail('Animal introuvable.');
  state.famille.animaux = pets(state).filter((a) => a.id !== id);
  return { ok: true, id };
}

export function familyNeed(state) {
  return state.famille.membres.reduce((t, m) => t + DATA.FAMILY.AJ[m.enfant ? 'enfant' : 'adulte'], 0);
}

// Aliments dans l'ordre où la famille les mange : d'abord ce qui périme le plus
// tôt (lot le plus ancien de chaque item ; ce qui ne périme pas passe en
// dernier, donc les conserves), puis par énergie décroissante.
export function mealOrder(state) {
  const keys = Object.keys(DATA.items).filter((k) => DATA.items[k].edible);
  return keys.sort((a, b) => {
    const ea = nextExpiry(state, a);
    const eb = nextExpiry(state, b);
    if (ea !== eb) return ea < eb ? -1 : 1;
    return DATA.items[b].energie - DATA.items[a].energie;
  });
}

// Lot 8 : les stocks que la famille peut manger, dans l'ordre du repas. Une
// entrée par aliment de l'inventaire (rang = nuits avant péremption) et une par
// aliment du frigo (rang infini : au frais, il ne périme pas). Les entrées de
// même rang passent par énergie décroissante, l'inventaire avant le frigo.
// La réserve de semences protège d'abord l'inventaire (c'est là qu'on prend les
// plants), puis le frigo.
export function mealEntries(state) {
  const entries = [];
  for (const item of mealOrder(state)) {
    const reserve = state.famille.reserve[item] || 0;
    const inv = countItem(state, item);
    const cold = fridgeCount(state, item);
    const invSpare = Math.max(0, inv - reserve);
    const coldSpare = Math.max(0, cold - Math.max(0, reserve - inv));
    if (invSpare > 0) entries.push({ item, froid: false, spare: invSpare, rank: nextExpiry(state, item) });
    if (coldSpare > 0) entries.push({ item, froid: true, spare: coldSpare, rank: Infinity });
  }
  return entries.sort((a, b) => {
    if (a.rank !== b.rank) return a.rank < b.rank ? -1 : 1;
    return DATA.items[b.item].energie - DATA.items[a.item].energie;
  });
}

// Repas de la nuit, calculé sans rien modifier (sert aussi à l'aperçu de
// Dormir). Les quantités de la réserve de semences ne sont jamais mangées.
// `mange` : total par aliment ; `froid` : la part prise dans le frigo (Lot 8).
export function planMeal(state) {
  const need = familyNeed(state);
  let covered = 0;
  const mange = {};
  const froid = {};
  const entries = mealEntries(state);
  // Version 1.11 : d'abord un exemplaire de chacun des PLATS_MAX meilleurs plats (ceux qui
  // rendent le plus de bonheur), même si le premier suffit à couvrir le besoin : la famille
  // goûte à tout ; puis le reste dans l'ordre habituel.
  const vus = new Set();
  const plats = entries
    .filter((e) => dishHappiness(e.item) > 0)
    .sort((a, b) => dishHappiness(b.item) - dishHappiness(a.item))
    .filter((e) => (vus.has(e.item) ? false : vus.add(e.item)))
    .slice(0, DATA.VILLE.BONHEUR.PLATS_MAX);
  for (const entry of plats) {
    mange[entry.item] = (mange[entry.item] || 0) + 1;
    if (entry.froid) froid[entry.item] = (froid[entry.item] || 0) + 1;
    entry.spare -= 1;
    covered += DATA.items[entry.item].energie;
  }
  for (const entry of entries) {
    if (covered >= need - EPS) break;
    const energy = DATA.items[entry.item].energie;
    const n = Math.min(entry.spare, Math.ceil((need - covered) / energy - EPS));
    if (n <= 0) continue;
    mange[entry.item] = (mange[entry.item] || 0) + n;
    if (entry.froid) froid[entry.item] = (froid[entry.item] || 0) + n;
    covered += n * energy;
  }
  return {
    besoin: need,
    energie: covered,
    mange,
    froid,
    couverture: need > 0 ? Math.min(100, Math.floor((covered * 100) / need)) : 100, // %
  };
}

export function newNightStats() {
  return { besoin: 0, energie: 0, couverture: 100, mange: {}, perdus: {}, oeufs: 0, lait: 0, etable: newStableReport(), termine: {}, auto: newAutoReport(), fruits: {}, frigo: { mwh: 0, panne: false, vieillis: false }, energieProduit: 0, autonomie: 0, pluie: 0, entretiens: [] };
}

// Le repas de la famille, puis son bonheur. Version 1.1.1 : il se prend à 19 h
// (mealDue) ; si la famille se couche avant, il est pris au coucher (feedFamily).
// Le compte du repas est gardé dans state.repas jusqu'à la nuit, qui le recopie
// dans son compte rendu : un seul repas par jour, quoi qu'il arrive.
export function takeMeal(state) {
  if (state.repas) return fail('La famille a déjà pris son repas aujourd\'hui.');
  const plan = planMeal(state);
  // Lot 9 : énergie mangée qui vient de lots d'origine « produit » (autonomie).
  let produit = 0;
  for (const [item, n] of Object.entries(plan.mange)) {
    const cold = plan.froid[item] || 0;
    const pieces = [];
    takeItem(state, item, n - cold, pieces);
    if (cold > 0) takeFromFridge(state, item, cold, pieces);
    for (const p of pieces) {
      if (p.origin === DATA.ORIGINE.PRODUIT) produit += p.qty * DATA.items[item].energie;
    }
  }
  const bonheur = applyMealHappiness(state, plan); // version 1.5 : plats cuisinés → bonheur
  state.repas = {
    heure: hourOfDay(state),
    besoin: plan.besoin,
    energie: plan.energie,
    couverture: plan.couverture,
    mange: plan.mange,
    bonheur,
    energieProduit: produit,
    autonomie: autonomyPercent(produit, plan.besoin),
  };
  return { ok: true, repas: state.repas };
}

// Première étape nocturne : le repas s'il n'a pas été pris à 19 h, puis son
// compte recopié dans celui de la nuit. Version 1.8 : la couverture du repas
// fixe l'énergie du personnage au réveil (restoreEnergy).
export function feedFamily(state) {
  if (!state.repas) takeMeal(state);
  const { heure, ...repas } = state.repas;
  state.repas = null;
  state.nuit = {
    ...repas,
    termine: {},
    perdus: {},
    oeufs: 0,
    auto: newAutoReport(),
    fruits: {},
    frigo: { mwh: 0, panne: false, vieillis: false },
  };
  restoreEnergy(state, repas.couverture);
  state.nuit.energieReveil = state.energie;
  return state.nuit;
}

// Version 1.8 : manger un aliment en journée (inventaire d'abord, puis frigo) rend
// de l'énergie au personnage (snackEnergy), jusqu'au maximum. L'aliment sort des
// réserves : la famille ne le mangera pas ce soir.
export function eatSnack(state, item) {
  const def = DATA.items[item];
  if (!def || !def.edible) return fail('Cela ne se mange pas.');
  if ((Number(state.energie) || 0) >= energyMax()) return fail('Ton énergie est déjà au maximum.');
  if (countItem(state, item) > 0) takeItem(state, item, 1);
  else if (fridgeCount(state, item) > 0) takeFromFridge(state, item, 1);
  else return fail(`Plus de ${def.nom.toLowerCase()}.`);
  const gain = snackEnergy(state, item);
  state.energie = Math.min(energyMax(), (Number(state.energie) || 0) + gain);
  return { ok: true, gain, energie: state.energie };
}

export function findMember(state, id) {
  return state.famille.membres.find((m) => m.id === id) || null;
}

// Items que la famille pourrait manger mais qui servent aussi de plants
// (aujourd'hui la patate) : ce sont ceux dont la réserve se règle.
export function reservableItems() {
  return Object.keys(DATA.crops)
    .map((c) => DATA.crops[c].graines.item)
    .filter((item, i, all) => DATA.items[item].edible && all.indexOf(item) === i);
}

export function setSeedReserve(state, item, qty) {
  if (!DATA.items[item]) return fail('Objet inconnu.');
  const n = Math.max(0, Math.floor(Number(qty)));
  if (!Number.isFinite(n)) return fail('Quantité invalide.');
  state.famille.reserve[item] = n;
  return { ok: true, reserve: n };
}
