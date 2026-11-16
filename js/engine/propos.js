/* ---------- V-1 : ce que disent les villageois de ce qu'ils voient (docs/phase-4.md) ----------
   Les sujets du moment que les villageois reprennent (js/engine/villageois-amitie.js, VILLAGE.PROPOS.GARDES : ta
   ferme, le cadeau que tu lui as fait, ce qu'il aime, la lune, la météo, le mois…), chacun avec sa condition, lue dans
   la partie : il n'est dit que s'il est vrai. Un villageois ne redit pas l'un de ses MEMOIRE derniers sujets
   (state.propos : { [qui]: [sujets] }). Les phrases d'un sujet gardé sont dans data/monde.json (HABITANTS.PROPOS).
   (Les sujets des habitants des hameaux — leurs voisins, leur famille, leur réserve, la calèche, leurs projets et
   leurs fêtes — sont retirés à la bascule, I9h.) */

import { DATA } from './catalog.js';
import { allPlots } from './crops.js';
import { cowCount } from './animals.js';
import { fiche, palierAmitie } from './amitie.js';
import { dayOfMonth, monthName, moonPhase } from './lune.js';
import { meteoDuJour } from './meteo.js';

const PROPOS = () => DATA.HABITANTS.PROPOS;
const nomObjet = (it) => (DATA.OBJETS[it] ? DATA.OBJETS[it].nom : it);
const minuscule = (t) => (t ? t.charAt(0).toLowerCase() + t.slice(1) : t);
const blocsPoses = (state) => Object.values(state.blocs || {});
const PALIER_PROCHE = 3;

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
  ['lune_pleine', ({ state }) => (moonPhase(state.day).id === 'pleine' ? {} : null)],
  ['lune_nouvelle', ({ state }) => (moonPhase(state.day).id === 'nouvelle' ? {} : null)],
  ['lune_croissante', ({ state }) => (moonPhase(state.day).id === 'croissante' ? {} : null)],
  ['lune_decroissante', ({ state }) => (moonPhase(state.day).id === 'decroissante' ? {} : null)],
  ['meteo_pluie', ({ state }) => (meteoDuJour(state).sorte === 'pluie' ? {} : null)],
  ['meteo_brume', ({ state }) => (meteoDuJour(state).sorte === 'brume' ? {} : null)],
  ['mois', ({ state }) => (dayOfMonth(state.day) <= 3 && state.day > 3 ? { mois: monthName(state.day) } : null)],
  ['ami_proche', ({ state, cle }) => (palierAmitie(state, cle) >= PALIER_PROCHE ? {} : null)],
  ['jours', ({ state }) => (state.day >= 7 ? { jours: state.day - 1 } : null)],
];
export const SUJETS_PROPOS = SUJETS.map(([id]) => id);

const remplir = (t, mots) => t.replace(/\{(\w+)\}/g, (x, k) => (mots[k] !== undefined && mots[k] !== null ? String(mots[k]) : x));

function memoire(state) {
  if (!state.propos || typeof state.propos !== 'object' || Array.isArray(state.propos)) state.propos = {};
  return state.propos;
}

// Fiche I6a (js/engine/villageois-amitie.js, proposVillageois) : les conditions des sujets, par id, pour ceux que les
// villageois reprennent (VILLAGE.PROPOS.GARDES). Le contexte : { state, cle }.
export const CONDITIONS_PROPOS = Object.freeze(Object.fromEntries(SUJETS));

// Un sujet tiré par `rnd` parmi `sujets` ([{ id, mots }], déjà vrais), ses phrases dans `phrases[id]` : { id, texte },
// ou null ; il entre dans la mémoire de `qui` (state.propos[qui] : MEMOIRE sujets, qu'il ne redit pas). `poids` (fiche
// I6c, les traits d'un villageois : traits.js sujetsDesTraits) : (id) → le poids du sujet ; sans lui, tous se valent.
export function direSujet(state, qui, sujets, phrases, rnd, poids = null) {
  const deja = new Set(memoire(state)[qui] || []);
  const S = sujets.filter((s) => !deja.has(s.id) && Array.isArray(phrases[s.id]) && phrases[s.id].length && (!poids || poids(s.id) > 0));
  if (!S.length) return null;
  const u = rnd();
  let s = S[Math.floor(u * S.length)];
  if (poids) {
    // (le même tirage, au poids : le premier sujet dont la part cumulée dépasse le tirage)
    const w = S.map((x) => poids(x.id)), tot = w.reduce((x, y) => x + y, 0);
    let r = u * tot;
    for (let i = 0; i < S.length; i++) { r -= w[i]; if (r < 0) { s = S[i]; break; } }
  }
  const L = phrases[s.id];
  const texte = remplir(L[Math.floor(rnd() * L.length)], s.mots);
  const M = memoire(state), l = (M[qui] || []).filter((x) => x !== s.id);
  l.push(s.id);
  M[qui] = l.slice(-PROPOS().MEMOIRE);
  return { id: s.id, texte };
}
