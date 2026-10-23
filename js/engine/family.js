import { DATA } from './catalog.js';
import { memberHappiness } from './ville.js';
import { fail } from './devices.js';
import { countItem, takeItem } from './inventory.js';
import { fridgeCount, takeFromFridge } from './fridge.js';
import { newStableReport } from './animals.js';
import { energyMax, snackEnergy } from './stamina.js';
import { newAutoReport } from './automation.js';
import { affames, bonheurRepas, jaugeFamille, repasCoucher, repasJour } from './repas.js';

/* ---------- Lot 2 : famille (version 1.8 : plus de santé) ---------- */

// nom : le rôle fixe (« Adulte 1 ») ; prenom, genre, teint : le profil choisi
// par le joueur (version 1.1), au départ le rôle, le sexe de DATA et le jaune.
export function makeMember(def) {
  return { id: def.id, nom: def.nom, enfant: def.enfant, bonheur: DATA.VILLE.BONHEUR.DEPART, ...defaultMemberProfile(def) };
}

/* ---------- version 1.1 : profil des membres de la famille ---------- */

// Profil de départ d'un membre (défini dans DATA.FAMILLE.MEMBRES, ou un membre
// inconnu d'une sauvegarde importée) : prénom = son rôle, teinte 0.
export function defaultMemberProfile(def) {
  const P = DATA.FAMILLE.PROFIL;
  const base = DATA.FAMILLE.MEMBRES.find((m) => m.id === (def && def.id));
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
  return n >= 1 && n <= DATA.FAMILLE.PROFIL.PRENOM_MAX;
}

// Emoji d'un portrait : 👩 / 👨 pour un adulte, 👧 / 👦 pour un enfant, suivi de
// la teinte choisie (rien pour le jaune par défaut). Des valeurs inconnues
// retombent sur le premier sexe et le jaune.
export function portraitEmoji(enfant, genre, teint, style = 0) {
  const P = DATA.FAMILLE.PROFIL;
  const set = P.PORTRAITS[enfant ? 'enfant' : 'adulte'];
  const base = set[genre] || set[P.GENRES[0]];
  // version 1.12 : la coiffure (planche d'avatars), jointe par un ZWJ
  const comp = (P.STYLES[enfant ? 'enfant' : 'adulte'] || [])[style] || '';
  return base + (P.TEINTS[teint] || '') + (comp ? '\u200D' + comp : '');
}

// Coiffure d'un membre (0 si elle n'a jamais été choisie).
export function memberStyle(m) {
  return m && Number.isInteger(m.style) && m.style >= 0 && m.style < DATA.FAMILLE.PROFIL.STYLES.adulte.length ? m.style : 0;
}

// Version 1.17 : l'apparence d'un membre, un des personnages du catalogue : pour un adulte,
// 1 à PERSOS (sa planche assets/personnages/perso_XX.png, qui sert aussi de portrait) ; pour un
// enfant, 1 à PERSOS_ENFANT (assets/personnages/enfant_XX.png). Sans choix (ancienne partie, nouveau
// membre), le défaut de son âge selon son sexe. 0 sans membre.
export function memberPerso(m) {
  if (!m) return 0;
  const P = DATA.FAMILLE.PROFIL;
  if (Number.isInteger(m.perso) && m.perso >= 1 && m.perso <= persoMax(m)) return m.perso;
  const def = m.enfant ? P.PERSO_DEFAUT_ENFANT : P.PERSO_DEFAUT;
  return def[m.genre] || def[P.GENRES[0]];
}

// Nombre de personnages au choix pour ce membre (selon son âge).
export function persoMax(m) {
  return m && m.enfant ? DATA.FAMILLE.PROFIL.PERSOS_ENFANT : DATA.FAMILLE.PROFIL.PERSOS;
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
  return portraitEmoji(m.enfant, m.genre, m.teint, memberStyle(m));
}

// Change le profil d'un membre : { prenom, genre, teint, style, perso }. Un champ absent
// garde sa valeur. Tout est vérifié avant de rien modifier : prénom de 1 à
// PRENOM_MAX caractères (nettoyé), genre 'f' ou 'm', teinte entière de 0 à 5.
export function setMemberProfile(state, id, profil) {
  const P = DATA.FAMILLE.PROFIL;
  const m = findMember(state, id);
  if (!m) return fail('Membre introuvable.');
  if (!profil || typeof profil !== 'object') return fail('Profil invalide.');
  const next = { prenom: m.prenom, genre: m.genre, teint: m.teint, style: memberStyle(m) };
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
  if (profil.style !== undefined) {
    if (!Number.isInteger(profil.style) || profil.style < 0 || profil.style >= P.STYLES.adulte.length) return fail('Coiffure inconnue.');
    next.style = profil.style;
  }
  if (profil.perso !== undefined) {
    if (!Number.isInteger(profil.perso) || profil.perso < 1 || profil.perso > persoMax(m)) return fail('Personnage inconnu.');
    next.perso = profil.perso;
  }
  m.prenom = next.prenom;
  m.genre = next.genre;
  m.teint = next.teint;
  if (next.style) m.style = next.style;
  else delete m.style;
  if (next.perso) m.perso = next.perso;
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
  return Math.max(0, DATA.FAMILLE.COMPOSITION.MEMBRES_MAX - state.famille.membres.length);
}

// Prochain numéro d'un type d'identifiant ; le compteur de l'état avance.
function nextFamilyNumber(state, type) {
  const f = state.famille;
  const vus = familyNumbers(f.membres, f.animaux);
  if (!f.numeros || typeof f.numeros !== 'object') f.numeros = vus;
  const n = Math.max(Number(f.numeros[type]) || 0, vus[type]) + 1;
  f.numeros[type] = n;
  return n;
}

// Ajoute un membre à la famille : un adulte, ou un enfant si `enfant` est vrai.
// Refusé au-delà de MEMBRES_MAX. Le nouveau venu arrive avec le bonheur moyen de
// la famille. Il arrive rassasié (sa jauge de faim pleine : repas.js).
export function addMember(state, enfant = false) {
  const C = DATA.FAMILLE.COMPOSITION;
  const f = state.famille;
  if (f.membres.length >= C.MEMBRES_MAX) return fail(`La famille est au complet : ${C.MEMBRES_MAX} membres au plus.`);
  const type = enfant ? 'enfant' : 'adulte';
  const n = nextFamilyNumber(state, type);
  const m = makeMember({ id: `${type}-${n}`, nom: `${enfant ? 'Enfant' : 'Adulte'} ${n}`, enfant: !!enfant });
  if (f.membres.length) m.bonheur = Math.round(f.membres.reduce((t, x) => t + memberHappiness(x), 0) / f.membres.length);
  f.membres.push(m);
  return { ok: true, id: m.id };
}

// Pourquoi un membre ne peut pas quitter la famille (texte), ou '' s'il le peut :
// il reste toujours MEMBRES_MIN membre dont ADULTES_MIN adulte.
export function memberRemovalBlock(state, id) {
  const C = DATA.FAMILLE.COMPOSITION;
  const m = findMember(state, id);
  if (!m) return 'Membre introuvable.';
  if (state.famille.membres.length <= C.MEMBRES_MIN) return 'Il faut au moins un membre dans la famille.';
  if (!m.enfant && adultCount(state) <= C.ADULTES_MIN) return 'Il faut au moins un adulte dans la famille.';
  // version 1.12 : le personnage principal reste (on en choisit d'abord un autre)
  if (state.famille.principal === id) return 'C\'est le personnage principal : choisis d\'abord un autre adulte.';
  return '';
}

// Retire un membre de la famille (voir memberRemovalBlock).
export function removeMember(state, id) {
  const raison = memberRemovalBlock(state, id);
  if (raison) return fail(raison);
  const f = state.famille;
  f.membres = f.membres.filter((m) => m.id !== id);
  return { ok: true, id };
}

/* -- animaux de compagnie -- */

export function pets(state) {
  return Array.isArray(state.famille.animaux) ? state.famille.animaux : [];
}

export function findPet(state, id) {
  return pets(state).find((a) => a.id === id) || null;
}

export function petRoom(state) {
  return Math.max(0, DATA.FAMILLE.COMPAGNIE.MAX - pets(state).length);
}

// Nom affiché d'un animal de compagnie (texte brut : à passer par escapeHtml()).
export function petName(state, id) {
  const a = findPet(state, id);
  if (!a) return '';
  const E = DATA.FAMILLE.COMPAGNIE.ESPECES;
  return validFirstName(a.nom) ? cleanFirstName(a.nom) : (E[a.espece] ? E[a.espece].nom : 'Animal');
}

// La planche de chaque animal sur la carte de la ferme (assets/<planche>.png) : le n-ième chat
// de la famille prend la n-ième robe de chat (chat, chat_2, chat_3), de même pour les chiens.
// [{ id, espece, planche }], dans l'ordre de la famille.
export function petSheets(state) {
  const rang = {};
  return pets(state).filter((a) => DATA.FAMILLE.COMPAGNIE.ESPECES[a.espece]).map((a) => {
    const n = rang[a.espece] = (rang[a.espece] || 0) + 1;
    return { id: a.id, espece: a.espece, planche: n > 1 ? `${a.espece}_${Math.min(n, 3)}` : a.espece };
  });
}

export function petIcon(espece) {
  const e = DATA.FAMILLE.COMPAGNIE.ESPECES[espece];
  return e ? e.icone : '🐾';
}

// Adopte un chien ou un chat : refusé au-delà de COMPAGNIE.MAX. Gratuit, et sans
// effet sur les repas de la famille ni sur le bonheur.
export function addPet(state, espece) {
  const K = DATA.FAMILLE.COMPAGNIE;
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
  const K = DATA.FAMILLE.COMPAGNIE;
  const a = findPet(state, id);
  if (!a) return fail('Animal introuvable.');
  if (!profil || typeof profil !== 'object') return fail('Profil invalide.');
  let nom = a.nom;
  let espece = a.espece;
  if (profil.nom !== undefined) {
    if (typeof profil.nom !== 'string' || cleanFirstName(profil.nom) === '') return fail('Écris un nom.');
    if (!validFirstName(profil.nom)) return fail(`Le nom doit faire ${DATA.FAMILLE.PROFIL.PRENOM_MAX} caractères au plus.`);
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

// La nuit du frigo : mWh prélevés, panne de froid, lots qui ont perdu une nuit.
export function newFridgeNightStats() {
  return { mwh: 0, panne: false, vieillis: false };
}

export function newNightStats() {
  return { besoin: 0, energie: 0, couverture: 100, mange: {}, perdus: {}, oeufs: 0, lait: 0, etable: newStableReport(), termine: {}, auto: newAutoReport(), fruits: {}, frigo: newFridgeNightStats(), energieProduit: 0, autonomie: 0, pluie: 0, entretiens: [] };
}

// Première étape nocturne : les enfants mangent au coucher (s'ils ne l'ont pas fait), puis ce
// que la famille a mangé dans la journée à la boîte à nourriture ou au frigo (repas.js) est
// recopié dans le compte rendu de la nuit : points mangés (besoin, énergie), dont ceux qui
// viennent de la ferme (autonomie), jauge moyenne au coucher (couverture : elle règle le
// réveil), bonheur des plats et faim de ceux qui n'ont rien trouvé.
export function feedFamily(state) {
  repasCoucher(state);
  const R = repasJour(state);
  const faim = affames(state);
  const bonheur = bonheurRepas(state, R.mange);
  for (const m of state.famille.membres) delete m.affame;
  Object.assign(state.nuit, {
    besoin: R.energie,
    energie: R.energie,
    couverture: jaugeFamille(state),
    mange: { ...R.mange },
    bonheur,
    energieProduit: R.produit,
    affames: faim,
  });
  state.repasJour = null;
  // l'énergie ne remonte plus d'un coup à minuit : en dormant, peu à peu (recoverInSleep)
  state.nuit.energieReveil = state.energie;
  return state.nuit;
}

// Version 1.8 : manger un aliment en journée (inventaire d'abord, puis frigo) rend
// de l'énergie au personnage (snackEnergy), jusqu'au maximum.
export function eatSnack(state, item) {
  const def = DATA.OBJETS[item];
  if (!def || !def.mangeable) return fail('Cela ne se mange pas.');
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
  return Object.keys(DATA.CULTURES)
    .map((c) => DATA.CULTURES[c].graines.item)
    .filter((item, i, all) => DATA.OBJETS[item].mangeable && all.indexOf(item) === i);
}

export function setSeedReserve(state, item, qty) {
  if (!DATA.OBJETS[item]) return fail('Objet inconnu.');
  const n = Math.max(0, Math.floor(Number(qty)));
  if (!Number.isFinite(n)) return fail('Quantité invalide.');
  state.famille.reserve[item] = n;
  return { ok: true, reserve: n };
}
