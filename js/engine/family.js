import { DATA } from './catalog.js';
import { applyMealHappiness, happinessProductivity, memberHappiness } from './ville.js';
import { EPS } from './base.js';
import { fail, growthPrice, percentCeil, spend } from './devices.js';
import { hourOfDay } from './clock.js';
import { countItem, nextExpiry, takeItem } from './inventory.js';
import { fridgeCount, takeFromFridge } from './fridge.js';
import { newStableReport } from './animals.js';
import { techFlag, techPct, techSum } from './techtree.js';
import { newAutoReport } from './automation.js';
import { autonomyPercent } from './campaign.js';

/* ---------- Lot 2 : famille et santé ---------- */

// nom : le rôle fixe (« Adulte 1 ») ; prenom, genre, teint : le profil choisi
// par le joueur (version 1.1), au départ le rôle, le sexe de DATA et le jaune.
export function makeMember(def) {
  return { id: def.id, nom: def.nom, enfant: def.enfant, sante: DATA.FAMILY.SANTE_DEPART, malade: false, bonheur: DATA.VILLE.BONHEUR.DEPART, ...defaultMemberProfile(def) };
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
// Refusé au-delà de MEMBRES_MAX. Le nouveau venu arrive avec la santé moyenne
// de la famille (au moins 1) : agrandir la famille ne soigne personne et ne
// change pas la productivité. Son besoin s'ajoute dès le prochain repas.
export function addMember(state, enfant = false) {
  const C = DATA.FAMILY.COMPOSITION;
  const f = state.famille;
  if (f.membres.length >= C.MEMBRES_MAX) return fail(`La famille est au complet : ${C.MEMBRES_MAX} membres au plus.`);
  const type = enfant ? 'enfant' : 'adulte';
  const n = nextFamilyNumber(state, type);
  const m = makeMember({ id: `${type}-${n}`, nom: `${enfant ? 'Enfant' : 'Adulte'} ${n}`, enfant: !!enfant });
  m.sante = Math.max(1, Math.min(DATA.FAMILY.SANTE_MAX, Math.floor(rawAverageHealth(state))));
  if (f.membres.length) m.bonheur = Math.round(f.membres.reduce((t, x) => t + memberHappiness(x), 0) / f.membres.length);
  f.membres.push(m);
  return { ok: true, id: m.id, besoin: familyNeed(state) };
}

// Pourquoi un membre ne peut pas quitter la famille (texte), ou '' s'il le peut :
// il reste toujours MEMBRES_MIN membre dont ADULTES_MIN adulte, et un malade
// ne part pas (ce serait un soin gratuit pour la moyenne de la famille).
export function memberRemovalBlock(state, id) {
  const C = DATA.FAMILY.COMPOSITION;
  const m = findMember(state, id);
  if (!m) return 'Membre introuvable.';
  if (state.famille.membres.length <= C.MEMBRES_MIN) return 'Il faut au moins un membre dans la famille.';
  if (!m.enfant && adultCount(state) <= C.ADULTES_MIN) return 'Il faut au moins un adulte dans la famille.';
  if (m.malade) return `${memberName(state, m.id)} est malade : soigne-le avant qu'il parte.`;
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
// effet sur le besoin journalier, la santé ou la productivité.
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

// Moyenne brute des santés (sert aux comptes rendus).
export function rawAverageHealth(state) {
  const m = state.famille.membres;
  return m.length ? m.reduce((t, x) => t + x.sante, 0) / m.length : 0;
}

// Santé moyenne pour la productivité : un membre malade compte pour 0.
export function averageHealth(state) {
  const m = state.famille.membres;
  return m.length ? Math.floor(m.reduce((t, x) => t + (x.malade ? 0 : x.sante), 0) / m.length) : 0;
}

// Productivité en % (100 = pleine). Elle ne s'applique qu'aux actions au clic
// (récolte manuelle) : jamais aux automatisations des lots suivants.
// Version 1.5 : le bonheur moyen la multiplie (happinessProductivity, ville.js).
export function healthProductivity(state) {
  const h = averageHealth(state);
  for (const tier of DATA.FAMILY.PRODUCTIVITE) {
    if (h >= tier.min) return tier.pct;
  }
  return DATA.FAMILY.PRODUCTIVITE[DATA.FAMILY.PRODUCTIVITE.length - 1].pct;
}

export function productivity(state) {
  return Math.round((healthProductivity(state) * happinessProductivity(state)) / 100);
}

// Variation de santé d'une nuit selon la couverture du besoin (en %, 0 à 100).
export function healthDelta(coverage) {
  for (const tier of DATA.FAMILY.VARIATION) {
    if (coverage >= tier.min) return tier.delta;
  }
  return DATA.FAMILY.VARIATION[DATA.FAMILY.VARIATION.length - 1].delta;
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
  for (const entry of mealEntries(state)) {
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

// Applique la variation de santé. Un membre qui tombe à 0 devient malade ; un
// malade regagne RECUPERATION_MALADE points par nuit couverte à 100 % (sinon il
// subit la variation normale) et guérit en atteignant la santé d'un soin.
// Renvoie les identifiants des membres devenus malades cette nuit (version 1.1 :
// l'identifiant, pas le prénom, pour que le compte rendu suive un changement
// de prénom et ne recopie jamais une donnée personnelle).
// Lot 5 : `bonus` s'ajoute à la variation d'une nuit (plats différents mangés).
export function updateHealth(state, coverage, bonus = 0) {
  const F = DATA.FAMILY;
  const delta = healthDelta(coverage) + bonus;
  const fed = coverage >= 100;
  const nouveaux = [];
  for (const m of state.famille.membres) {
    const gain = m.malade && fed ? F.RECUPERATION_MALADE + techSum(state, 'recuperation') : delta;
    m.sante = Math.max(0, Math.min(F.SANTE_MAX, m.sante + gain));
    if (m.malade && m.sante >= F.SOIN.SANTE) {
      m.malade = false;
    } else if (!m.malade && m.sante <= 0) {
      m.malade = true;
      nouveaux.push(m.id);
    }
  }
  return nouveaux;
}

export function newNightStats() {
  return { besoin: 0, energie: 0, couverture: 100, mange: {}, santeAvant: 0, santeApres: 0, nouveauxMalades: [], perdus: {}, oeufs: 0, lait: 0, etable: newStableReport(), bonusPlats: 0, termine: {}, auto: newAutoReport(), fruits: {}, frigo: { mwh: 0, panne: false, vieillis: false }, energieProduit: 0, autonomie: 0, pluie: 0, entretiens: [] };
}

// Bonus de santé d'une nuit : +1 par plat différent mangé, jusqu'à +3.
export function dishBonus(mange, state = null) {
  const B = DATA.FAMILY.BONUS_PLATS;
  const plats = Object.keys(mange).filter((item) => mange[item] > 0 && DATA.items[item].plat).length;
  const max = state ? Math.max(B.MAX, techFlag(state, 'bonusPlatsMax') || 0) : B.MAX; // arbre v2 : Menus variés
  return Math.min(max, plats * B.PAR_PLAT);
}

// Le repas de la famille, puis la santé. Version 1.1.1 : il se prend à 19 h
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
  const avant = rawAverageHealth(state);
  const bonus = dishBonus(plan.mange, state);
  const nouveaux = updateHealth(state, plan.couverture, bonus);
  const bonheur = applyMealHappiness(state, plan); // version 1.5 : plats cuisinés → bonheur
  state.repas = {
    heure: hourOfDay(state),
    bonusPlats: bonus,
    besoin: plan.besoin,
    energie: plan.energie,
    couverture: plan.couverture,
    mange: plan.mange,
    santeAvant: avant,
    santeApres: rawAverageHealth(state),
    nouveauxMalades: nouveaux,
    bonheur,
    energieProduit: produit,
    autonomie: autonomyPercent(produit, plan.besoin),
  };
  return { ok: true, repas: state.repas };
}

// Première étape nocturne : le repas s'il n'a pas été pris à 19 h, puis son
// compte recopié dans celui de la nuit. La santé « après » est celle du
// coucher : un soin payé entre le repas et la nuit y figure.
export function feedFamily(state) {
  if (!state.repas) takeMeal(state);
  const { heure, ...repas } = state.repas;
  state.repas = null;
  state.nuit = {
    ...repas,
    santeApres: rawAverageHealth(state),
    termine: {},
    perdus: {},
    oeufs: 0,
    auto: newAutoReport(),
    fruits: {},
    frigo: { mwh: 0, panne: false, vieillis: false },
  };
  return state.nuit;
}

export function careCost(state) {
  const c = DATA.FAMILY.SOIN;
  // arbre v2 (Remèdes maison) : soins moins chers
  return percentCeil(growthPrice(c.base, c.croissance, state.famille.soinsPayes), techPct(state, 'soinCout'));
}

export function findMember(state, id) {
  return state.famille.membres.find((m) => m.id === id) || null;
}

// Soigne un malade : coût croissant, santé remise à SOIN.SANTE.
export function heal(state, memberId) {
  const m = findMember(state, memberId);
  if (!m) return fail('Membre introuvable.');
  if (!m.malade) return fail(`${memberName(state, m.id)} n'est pas malade.`);
  const cost = careCost(state);
  if (state.pieces + EPS < cost) return fail('Pas assez de pièces.');
  spend(state, cost);
  state.famille.soinsPayes += 1;
  state.jour.soins = (state.jour.soins || 0) + 1; // Lot 9 : soin payé aujourd'hui (suivi de l'hiver)
  m.sante = DATA.FAMILY.SOIN.SANTE;
  m.malade = false;
  return { ok: true, cost };
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
