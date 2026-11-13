/* ---------- V-1 : ce que disent les habitants de ce qu'ils voient (docs/phase-4.md) ----------
   Un habitant qui parle (paroleHabitant, habitants.js) dit, une fois sur PART à peu près, un sujet du
   moment au lieu d'une phrase toute faite : ta ferme (ses cultures, ses bêtes, ce que tu y as bâti), le
   cadeau que tu lui as fait, ce qu'il aime (si tu l'as découvert), ses voisins et sa famille, la lune, le
   mois qui commence, ce que le hameau a rentré hier, le dernier passage de la calèche, le projet du hameau,
   ton amitié, le temps depuis ton arrivée. Les phrases sont dans data/monde.json (HABITANTS.PROPOS).

   Chaque sujet a sa condition, lue dans la partie : il n'est dit que s'il est vrai. Un habitant ne redit pas
   l'un de ses MEMOIRE derniers sujets (state.propos : { [membre]: [sujets] }). Un enfant ne dit que les
   sujets d'ENFANTS ; un adulte, tous sauf ceux d'un enfant (« …_enfant »). Le tirage suit la graine de l'habitant, du jour et de la conversation (pas de hasard
   caché : la même partie, la même phrase). */

import { DATA } from './catalog.js';
import { allPlots } from './crops.js';
import { cowCount } from './animals.js';
import { cleDe, fiche, palierAmitie } from './amitie.js';
import { projetDuHameau, projetsFaits } from './projets.js';
import { dayOfMonth, monthName, moonPhase } from './lune.js';
import { meteoDuJour } from './meteo.js';
import { evenementsDe, liensDe, trouverHabitant } from './voisins.js';
import { habitantsDe } from './habitants.js';
import { aHameau, fetesAVenir, fetesDuJour, nomFete, venuALaFete } from './fetes.js';
import { deHameau } from './bienvenue.js';
import { clockHours } from './clock.js';

const PROPOS = () => DATA.HABITANTS.PROPOS;
const nomObjet = (it) => (DATA.OBJETS[it] ? DATA.OBJETS[it].nom : it);
const minuscule = (t) => (t ? t.charAt(0).toLowerCase() + t.slice(1) : t);
const blocsPoses = (state) => Object.values(state.blocs || {});
const PALIER_PROCHE = 3;
const FETE_BIENTOT = 5; // (une fête qui vient : on en parle ces jours d'avant)
const majuscule = (t) => (t ? t.charAt(0).toUpperCase() + t.slice(1) : t);

// Les sujets possibles : [id, (contexte) → les mots à mettre dans la phrase, ou null (pas vrai maintenant)].
const SUJETS = [
  ['ferme_cultures', ({ state }) => {
    const n = {};
    for (const p of allPlots(state)) if (p.culture) n[p.culture] = (n[p.culture] || 0) + 1;
    const top = Object.entries(n).sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1))[0];
    return top ? { culture: minuscule(DATA.CULTURES[top[0]].nom), n: Object.values(n).reduce((a, b) => a + b, 0) } : null;
  }],
  ['ferme_vide', ({ state }) => (state.day >= 3 && !allPlots(state).some((p) => p.culture) ? {} : null)],
  ['ferme_poules', ({ state }) => (state.poulailler && state.poulailler.poules > 0 ? { n: state.poulailler.poules } : null)],
  ['ferme_poules_enfant', ({ state }) => (state.poulailler && state.poulailler.poules > 0 ? {} : null)],
  ['ferme_moutons', ({ state }) => (state.paturage && (state.paturage.moutons || []).length ? { n: state.paturage.moutons.length } : null)],
  ['ferme_vaches', ({ state }) => (state.paturage && cowCount(state) > 0 ? { n: cowCount(state) } : null)],
  ['ferme_ruches', ({ state }) => (blocsPoses(state).includes('ruche') ? {} : null)],
  ['ferme_verger', ({ state }) => (state.verger && (state.verger.arbres || []).length ? { n: state.verger.arbres.length } : null)],
  ['ferme_maison', ({ state }) => (blocsPoses(state).length >= 40 ? {} : null)],
  ['ferme_moulin', ({ state }) => (blocsPoses(state).includes('meule') ? {} : null)],
  ['cadeau_merci', ({ state, cle }) => {
    const c = Number(fiche(state, cle).cadeau);
    return Number.isFinite(c) && state.day - c >= 1 && state.day - c <= 3 ? {} : null;
  }],
  ['gout_connu', ({ state, cle }) => {
    const it = Object.entries(fiche(state, cle).gouts || {}).filter(([, g]) => g === 'adore').map(([x]) => x).sort()[0];
    return it ? { objet: nomObjet(it) } : null;
  }],
  ['voisin', ({ adultes }) => (adultes.length ? { voisin: adultes[0].prenom } : null)],
  ['voisin_metier', ({ adultes, h }) => {
    // (le nom du métier, au genre du voisin : bûcheron, bûcheronne)
    const v = adultes.find((x) => x.metier && DATA.HABITANTS.METIERS[x.metier]);
    const nom = v && DATA.HABITANTS.METIERS[v.metier].nom;
    const dit = nom && (typeof nom === 'string' ? nom : nom[v.genre] || nom.m);
    return dit ? { voisin: v.prenom, metier: dit, hameau: h.nom } : null;
  }],
  ['voisin_enfant', ({ enfants }) => (enfants.length ? { voisin: enfants[0].prenom } : null)],
  ['famille_enfant', ({ m, f }) => {
    const p = m.enfant && (f.membres || []).find((x) => !x.enfant);
    return p ? { parent: p.prenom } : null;
  }],
  ['famille_parent', ({ m, f }) => {
    const e = !m.enfant && (f.membres || []).find((x) => x.enfant);
    return e ? { enfant: e.prenom } : null;
  }],
  ['lune_pleine', ({ state }) => (moonPhase(state.day).id === 'pleine' ? {} : null)],
  ['lune_nouvelle', ({ state }) => (moonPhase(state.day).id === 'nouvelle' ? {} : null)],
  ['lune_croissante', ({ state }) => (moonPhase(state.day).id === 'croissante' ? {} : null)],
  ['lune_decroissante', ({ state }) => (moonPhase(state.day).id === 'decroissante' ? {} : null)],
  // V-3 (voisins.js) : ses liens, et ce qui s'est passé entre voisins ces derniers jours
  ['lien_ami', ({ state, m }) => {
    const l = !m.enfant && liensDe(state, m.id).ami, a = l && trouverHabitant(state, l.id);
    return a ? { ami: a.m.prenom } : null;
  }],
  ['lien_cousin', ({ state, m }) => {
    const l = !m.enfant && liensDe(state, m.id).cousin, c = l && trouverHabitant(state, l.id);
    if (!c) return null;
    const f = c.m.genre === 'f';
    return { cousin: c.m.prenom, cousin_mot: f ? 'Ma cousine' : 'Mon cousin', cousin_mot_min: f ? 'ma cousine' : 'mon cousin', le: f ? 'la' : 'le', hameau: c.h.nom, a_hameau: aHameau(c.h.nom), de_hameau: deHameau(c.h.nom) };
  }],
  ['visite_recue', ({ state, m, f }) => {
    const e = evenementsDe(state, m.id, f.maison).filter((x) => x.sorte === 'visite' && x.chez === m.id).pop();
    const H = e && habitantsDe(state)[e.deHameau];
    return H ? { qui: e.quiPrenom, hameau: H.nom, de_hameau: deHameau(H.nom), il_qui: e.quiGenre === 'f' ? 'Elle' : 'Il', e_qui: e.quiGenre === 'f' ? 'e' : '' } : null;
  }],
  ['visite_faite', ({ state, m, f }) => {
    const e = evenementsDe(state, m.id, f.maison).filter((x) => x.sorte === 'visite' && x.qui === m.id).pop();
    const H = e && habitantsDe(state)[e.hameau];
    return H ? { chez: e.chezPrenom, hameau: H.nom, a_hameau: aHameau(H.nom), e: m.genre === 'f' ? 'e' : '' } : null;
  }],
  ['entraide_recue', ({ state, m, f }) => {
    const e = evenementsDe(state, m.id, f.maison).filter((x) => x.sorte === 'entraide' && x.aFoyer === f.maison).pop();
    return e ? { qui: e.de } : null;
  }],
  ['entraide_donnee', ({ state, m, f }) => {
    const e = evenementsDe(state, m.id, f.maison).filter((x) => x.sorte === 'entraide' && x.deFoyer === f.maison).pop();
    return e ? { aide: e.a } : null;
  }],
  ['meteo_pluie', ({ state }) => (meteoDuJour(state).sorte === 'pluie' ? {} : null)],
  ['meteo_brume', ({ state }) => (meteoDuJour(state).sorte === 'brume' ? {} : null)],
  ['mois', ({ state }) => (dayOfMonth(state.day) <= 3 && state.day > 3 ? { mois: monthName(state.day) } : null)],
  ['reserve_hier', ({ h }) => {
    let jour = -Infinity;
    for (const f of h.foyers) { const J = f.journal && f.journal[f.journal.length - 1]; if (J && J.jour > jour) jour = J.jour; }
    const tot = {};
    for (const f of h.foyers) { const J = f.journal && f.journal[f.journal.length - 1]; if (J && J.jour === jour) for (const [it, n] of Object.entries(J.reserve || {})) tot[it] = (tot[it] || 0) + n; }
    const top = Object.entries(tot).filter(([, n]) => n > 0).sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1))[0];
    return top ? { objet: nomObjet(top[0]) } : null;
  }],
  ['caleche', ({ state, h }) => {
    const c = h.caleche && typeof h.caleche === 'object' ? h.caleche : null;
    const j = c ? state.day - Number(c.jour) : NaN;
    return j >= 1 && j <= 5 ? { jours: j, pieces: Math.round(Number(c.pieces) || 0) } : null;
  }],
  ['projet', ({ state, hid }) => {
    const p = projetDuHameau(state, hid);
    const it = p && !p.fait && Object.keys(p.manque).sort()[0];
    return it ? { projet: minuscule(p.nom), n: p.manque[it], objet: minuscule(nomObjet(it)) } : null;
  }],
  // V-4 (fetes.js) : la fête du hameau, qui vient, qui est ce soir, ou où tu es venu
  ['fete_bientot', ({ state, hid }) => {
    const f = fetesAVenir(state, FETE_BIENTOT + 1).find((x) => x.hameau === hid && x.jour > state.day);
    if (!f) return null;
    const j = f.jour - state.day;
    return { fete: f.nom, Fete: majuscule(f.nom), quand: j === 1 ? 'demain' : `dans ${j} jours`, debut: f.debut };
  }],
  ['fete_aujourdhui', ({ state, hid }) => {
    const f = fetesDuJour(state).find((x) => x.hameau === hid);
    return f && clockHours(state) < f.debut ? { fete: f.nom, Fete: majuscule(f.nom), debut: f.debut } : null;
  }],
  ['fete_souvenir', ({ state, hid }) => {
    if (!venuALaFete(state, hid) || fetesDuJour(state).some((x) => x.hameau === hid)) return null;
    const { nom } = nomFete(habitantsDe(state)[hid]);
    return { fete: nom, Fete: majuscule(nom) };
  }],
  ['fete_place', ({ state, hid }) => (projetsFaits(state, hid).length ? {} : null)],
  ['ami_proche', ({ state, cle }) => (palierAmitie(state, cle) >= PALIER_PROCHE ? {} : null)],
  ['jours', ({ state }) => (state.day >= 7 ? { jours: state.day - 1 } : null)],
  ['jours_enfant', ({ state }) => (state.day >= 7 ? { jours: state.day - 1 } : null)],
];
export const SUJETS_PROPOS = SUJETS.map(([id]) => id);

const remplir = (t, mots) => t.replace(/\{(\w+)\}/g, (x, k) => (mots[k] !== undefined && mots[k] !== null ? String(mots[k]) : x));

// Les sujets vrais pour l'habitant `m` (foyer `f`) du hameau `h` (id `hid`) : [{ id, mots }], dans l'ordre de
// SUJETS, sans ceux qu'il vient de dire, ni ceux qui ne sont pas d'un enfant pour un enfant.
export function sujetsPossibles(state, hid, h, f, m) {
  const P = PROPOS(), enfant = !!m.enfant, deja = new Set(memoire(state)[m.id] || []);
  const autres = h.foyers.filter((x) => x !== f).flatMap((x) => x.membres || []);
  const ctx = { state, hid, h, f, m, cle: cleDe(m), adultes: autres.filter((x) => !x.enfant), enfants: autres.filter((x) => x.enfant) };
  const out = [];
  for (const [id, cond] of SUJETS) {
    if (!Array.isArray(P[id]) || !P[id].length || deja.has(id)) continue;
    // (un enfant ne dit que les siens ; un adulte, pas ceux d'un enfant : « …_enfant »)
    if (enfant ? !P.ENFANTS.includes(id) : id.endsWith('_enfant')) continue;
    const mots = cond(ctx);
    if (mots) out.push({ id, mots });
  }
  return out;
}

function memoire(state) {
  if (!state.propos || typeof state.propos !== 'object' || Array.isArray(state.propos)) state.propos = {};
  return state.propos;
}

// Fiche I6a (js/engine/villageois-amitie.js, proposVillageois) : les conditions des sujets des habitants, par id,
// pour ceux que les villageois reprennent (VILLAGE.PROPOS.GARDES, et ceux qu'il réécrit). Le contexte : { state, cle }.
export const CONDITIONS_PROPOS = Object.freeze(Object.fromEntries(SUJETS));

// Un sujet tiré par `rnd` parmi `sujets` ([{ id, mots }], déjà vrais), ses phrases dans `phrases[id]` : { id, texte },
// ou null ; il entre dans la mémoire de `qui` (state.propos[qui] : MEMOIRE sujets, qu'il ne redit pas).
export function direSujet(state, qui, sujets, phrases, rnd) {
  const deja = new Set(memoire(state)[qui] || []);
  const S = sujets.filter((s) => !deja.has(s.id) && Array.isArray(phrases[s.id]) && phrases[s.id].length);
  if (!S.length) return null;
  const s = S[Math.floor(rnd() * S.length)];
  const L = phrases[s.id];
  const texte = remplir(L[Math.floor(rnd() * L.length)], s.mots);
  const M = memoire(state), l = (M[qui] || []).filter((x) => x !== s.id);
  l.push(s.id);
  M[qui] = l.slice(-PROPOS().MEMOIRE);
  return { id: s.id, texte };
}

// Un sujet du moment pour l'habitant, tiré par `rnd` (la graine de sa conversation) : { id, texte }, ou null
// (rien à dire de neuf, ou ce n'est pas le moment : PART). Le sujet dit entre dans sa mémoire.
export function proposDuMoment(state, hid, h, f, m, rnd) {
  const P = PROPOS();
  if (rnd() >= P.PART) return null;
  const S = sujetsPossibles(state, hid, h, f, m);
  if (!S.length) return null;
  const s = S[Math.floor(rnd() * S.length)];
  const phrases = P[s.id];
  const texte = remplir(phrases[Math.floor(rnd() * phrases.length)], s.mots);
  const M = memoire(state), L = (M[m.id] || []).filter((x) => x !== s.id);
  L.push(s.id);
  M[m.id] = L.slice(-P.MEMOIRE);
  return { id: s.id, texte };
}
