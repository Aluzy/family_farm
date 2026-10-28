import { DATA } from './catalog.js';
import { mulberry32 } from './base.js';
import { fail } from './devices.js';
import { hourOfDay, nightActive } from './clock.js';
import { addItem } from './inventory.js';
import { hache } from './ferme-generee.js';
import { farmSeed, farmTerrain } from './terrain.js';
import { HABITANTS, habitantsDe, metierHabitant, peuplerHameau } from './habitants.js';

/* ---------- la visite de bienvenue (fiche 18) ----------

   Une fois par partie, le deuxième jour (BIENVENUE.JOUR), en fin de matinée (de HEURE à FIN h), un
   habitant du hameau le plus proche de la ferme vient à pied jusqu'à la porte du foyer, frappe, dit
   une phrase d'accueil et donne un plat de sa cuisine (+1 à l'inventaire), puis repart. Les réglages :
   data/monde.json (BIENVENUE). La scène le fait marcher (js/carte/ferme/visite.js) ; la page le
   prépare et donne le plat (js/ui/bienvenue.js).

   state.bienvenue = { etat, qui, plat, remis, jour } :
     - etat : « attendue » (pas encore venu), « en_route » (il vient, ou attend à la porte), « posee »
       (personne n'est venu lui ouvrir : le plat attend devant la porte), « faite » (le plat est donné ;
       une partie d'avant la fiche, déjà plus loin que le jour JOUR, est « faite » sans visite) ;
     - qui : le visiteur, tiré dès que les plans des hameaux sont là (bienvenuePrepare) : { prenom,
       genre, perso, hameau (son nom, ou null : un voisin), hameauId, membre (son id d'habitant),
       metier (celui de son hameau, ou null), depart (la case de la place de son hameau, ou null) } ;
     - plat : l'objet donné (un plat cuisiné de DATA.RECETTES : BIENVENUE.PLATS) ;
     - remis : « main » (donné à la porte), « porte » (trouvé devant la porte au retour), null ;
     - jour : le jour de la visite.

   Le plat n'est jamais perdu : le personnage absent (loin, dans la mine, la scène fermée, ou la nuit
   tombée avant la visite), il est posé devant la porte et donné quand le personnage y revient
   (bienvenueDonne). Choix motivé : un objet posé au sol se perdrait de vue ou se piétinerait ; le
   plat « qui attend » ne coûte rien à la scène, se sauvegarde avec la partie et se rend toujours. */

export const BIENVENUE = DATA.BIENVENUE;
const ETATS = ['attendue', 'en_route', 'posee', 'faite'];

export function nouvelleBienvenue() {
  return { etat: 'attendue', qui: null, plat: null, remis: null, jour: null };
}

// La visite de la partie (réparée au besoin), ou null sans partie.
export function bienvenueDe(state) {
  if (!state || typeof state !== 'object') return null;
  let b = state.bienvenue;
  if (!b || typeof b !== 'object' || !ETATS.includes(b.etat)) b = state.bienvenue = nouvelleBienvenue();
  return b;
}

// « de Brume-Haute », « du Moulin », « des Saules », « d'Orval » (le nom d'un hameau, après « de »).
export function deHameau(nom) {
  const n = String(nom || '');
  if (/^Les /.test(n)) return n.replace(/^Les /, 'des ');
  if (/^Le /.test(n)) return n.replace(/^Le /, 'du ');
  if (/^La /.test(n)) return `de ${n.replace(/^La /, 'la ')}`;
  if (/^L'/.test(n)) return `de ${n.replace(/^L'/, 'l\'')}`;
  return /^[aeiouyhàâéèêëîïôûAEIOUYHÀÂÉÈÊËÎÏÔÛ]/.test(n) ? `d'${n}` : `de ${n}`;
}

const rngDe = (cle) => mulberry32(hache(cle));

// Le milieu de la ferme (une case du monde), ou null.
function milieuFerme(state) {
  const T = farmTerrain(state), F = T && T.FERME;
  if (!F) return null;
  return (F.Y + (F.HAUTEUR >> 1)) * T.LARGEUR + F.X + (F.LARGEUR >> 1);
}

// Le visiteur (voir qui, plus haut), d'après les plans des hameaux du monde (`plans` : ceux de
// planHameau, js/engine/monde-hameaux.js, sans les bâtisses du récit ; null ou vide : un voisin sans hameau). Le hameau le plus
// proche du milieu de la ferme ; ses habitants naissent s'ils ne l'étaient pas (peuplerHameau : le
// visiteur est l'un d'eux, qu'on retrouvera chez lui) ; un adulte, tiré de la graine du monde.
export function choisirVisiteur(state, plans) {
  const g = farmSeed(state) || 'monde', rnd = rngDe(`${g}:bienvenue`);
  const T = farmTerrain(state), W = T.LARGEUR, m0 = milieuFerme(state);
  let plan = null;
  if (Array.isArray(plans) && plans.length && m0 !== null) {
    const d = (p) => Math.hypot((p.case % W) - (m0 % W), Math.floor(p.case / W) - Math.floor(m0 / W));
    plan = plans.filter((p) => p && p.id && !p.batisse && Number.isInteger(p.case) && Array.isArray(p.maisons)).sort((a, b) => d(a) - d(b) || (a.id < b.id ? -1 : 1))[0] || null;
  }
  const h = plan ? habitantsDe(state)[plan.id] || peuplerHameau(state, plan) : null;
  const adultes = h ? h.foyers.flatMap((f) => f.membres.filter((m) => !m.enfant)) : [];
  if (adultes.length) {
    const m = adultes[Math.floor(rnd() * adultes.length)];
    return {
      prenom: m.prenom, genre: m.genre === 'm' ? 'm' : 'f', perso: m.perso, hameau: h.nom, hameauId: plan.id, membre: m.id,
      metier: h.metier || null, metierNom: metierHabitant(h, m), depart: plan.case,
    };
  }
  // (un voisin sans hameau : un prénom et un personnage des habitants)
  const genre = rnd() < 0.5 ? 'f' : 'm';
  const un = (l) => (l && l.length ? l[Math.floor(rnd() * l.length)] : null);
  return { prenom: un(HABITANTS.PRENOMS[genre]) || 'Jeanne', genre, perso: un(HABITANTS.PERSOS.adulte[genre]) || 1, hameau: null, hameauId: null, membre: null, metier: null, metierNom: '', depart: null };
}

// Le plat qu'il apporte : celui du métier de son hameau (BIENVENUE.PLATS), un plat qui existe.
export function platDuVisiteur(qui) {
  const P = BIENVENUE.PLATS, id = (qui && qui.metier && P[qui.metier]) || P['*'];
  return DATA.OBJETS[id] && DATA.RECETTES[id] ? id : Object.keys(DATA.RECETTES).find((r) => DATA.OBJETS[r] && DATA.OBJETS[r].mangeable && DATA.OBJETS[r].energie > 0);
}

// Le visiteur est tiré (une fois, dès que les plans des hameaux sont là). → la visite.
export function bienvenuePrepare(state, plans) {
  const b = bienvenueDe(state);
  if (!b || b.qui || b.etat === 'faite') return b;
  b.qui = choisirVisiteur(state, plans);
  b.plat = platDuVisiteur(b.qui);
  return b;
}

// Est-ce l'heure qu'il se mette en route ? Le jour JOUR, de HEURE à FIN h, pas encore venu, la
// famille installée.
export function bienvenueDue(state) {
  const b = bienvenueDe(state);
  if (!b || b.etat !== 'attendue' || nightActive(state)) return false;
  if (!state.famille || state.famille.configuree === false) return false;
  const h = hourOfDay(state);
  return state.day === BIENVENUE.JOUR && h >= BIENVENUE.HEURE && h < BIENVENUE.FIN;
}

// Il se met en route (la scène le fait venir). `plans` : pour le tirer s'il ne l'est pas encore.
export function bienvenueEnRoute(state, plans = null) {
  const b = bienvenueDe(state);
  if (!b || b.etat !== 'attendue') return fail('La visite n\'est pas attendue.');
  bienvenuePrepare(state, plans);
  b.etat = 'en_route';
  b.jour = state.day;
  return { ok: true, qui: b.qui, plat: b.plat };
}

// Personne ne lui a ouvert : il pose le plat devant la porte et s'en va.
export function bienvenuePose(state) {
  const b = bienvenueDe(state);
  if (!b || b.etat !== 'en_route') return fail('Personne n\'est à la porte.');
  b.etat = 'posee';
  return { ok: true, qui: b.qui, plat: b.plat };
}

// Le plat est donné (+1 à l'inventaire) : de la main du visiteur (en route, à la porte) ou trouvé
// devant la porte (posé). → { ok, plat, qui, remis: 'main' | 'porte' }.
export function bienvenueDonne(state) {
  const b = bienvenueDe(state);
  if (!b || (b.etat !== 'en_route' && b.etat !== 'posee')) return fail('Pas de plat à donner.');
  if (!b.plat) b.plat = platDuVisiteur(b.qui);
  addItem(state, b.plat, 1);
  b.remis = b.etat === 'posee' ? 'porte' : 'main';
  b.etat = 'faite';
  if (b.jour === null) b.jour = state.day;
  return { ok: true, plat: b.plat, qui: b.qui, remis: b.remis };
}

// La nuit (runNight, avant le jour suivant) : la visite n'a pas eu lieu (la scène fermée, le
// personnage parti, le soir venu) ou il attendait encore à la porte : le plat est posé devant la
// porte, pour le retour du personnage. Le jeu ne se bloque jamais sur la visite.
export function bienvenueNuit(state) {
  const b = bienvenueDe(state);
  if (!b || state.day < BIENVENUE.JOUR) return false;
  if (b.etat === 'attendue') {
    bienvenuePrepare(state, null);
    b.jour = state.day;
    b.etat = 'posee';
    return true;
  }
  if (b.etat === 'en_route') { b.etat = 'posee'; return true; }
  return false;
}

// Sa phrase d'accueil (une des PHRASES, tirée de la graine), le nom du plat dedans.
export function phraseBienvenue(state) {
  const b = bienvenueDe(state);
  if (!b || !b.qui) return '';
  const q = b.qui, P = BIENVENUE.PHRASES;
  const t = P[Math.floor(rngDe(`${farmSeed(state) || 'monde'}:bienvenue:phrase`)() * P.length)] || P[0];
  const d = DATA.OBJETS[b.plat] || { nom: '' };
  const hameau = q.hameau ? deHameau(q.hameau) : BIENVENUE.VOISIN[q.genre === 'm' ? 'm' : 'f'];
  const dit = (BIENVENUE.DITS && BIENVENUE.DITS[b.plat]) || `un plat : ${d.nom.toLowerCase()}`;
  return t.replace('{prenom}', q.prenom).replace('{hameau}', hameau).replace('{plat}', dit);
}

// Pour la scène (le modèle de la carte) : null, sauf quand il vient ou que le plat attend : { etat,
// prenom, perso, metier (dit pour lui), hameau, depart (la case de son hameau, ou null), plat: { id,
// nom, icone }, phrase, toc, absent, attente (s), proche (px) }.
export function bienvenueModele(state) {
  const b = bienvenueDe(state);
  if (!b || !b.qui || (b.etat !== 'en_route' && b.etat !== 'posee')) return null;
  const q = b.qui, d = DATA.OBJETS[b.plat] || { nom: '', icone: '' };
  return {
    etat: b.etat, prenom: q.prenom, perso: q.perso, metier: q.metierNom || '', hameau: q.hameau || '', depart: Number.isInteger(q.depart) ? q.depart : null,
    plat: { id: b.plat, nom: d.nom, icone: d.icone }, phrase: phraseBienvenue(state), toc: BIENVENUE.TOC, absent: BIENVENUE.ABSENT,
    attente: BIENVENUE.ATTENTE, proche: BIENVENUE.PROCHE,
  };
}
