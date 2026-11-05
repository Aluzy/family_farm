/* ---------- V-4 : la fête du hameau (docs/phase-4.md ; data/amitie.json, FETES) ----------
   Chaque mois (une lunaison de LUNE.JOURS_MOIS jours), PAR_MOIS hameaux peuplés font leur fête, chacun un jour
   tiré de la graine de la ferme et du mois (deux fêtes un même mois tombent des jours différents), de DEBUT à
   FIN h. Son nom vient du métier du hameau (NOMS : la fête du bois, de la pêche…). Pendant la fête, les
   habitants du hameau se retrouvent sur la place (la scène : js/carte/ferme/habitants.js).

   Le joueur qui y est pendant la fête (allerALaFete, quand il entre dans le hameau ou qu'il y est) gagne, une
   fois par fête, AMITIE points avec chaque adulte du hameau et un plat de fête (BIENVENUE.PLATS). Les habitants
   parlent de la fête qui vient et de celle où il est venu (propos.js).

   Rien n'est gardé du calendrier (il se recalcule) ; state.fetes = { vues: { « hameau:jour »: true } (GARDE
   derniers jours), annonce: le jour de la dernière annonce du matin (js/ui/fetes.js) }. Pas dans un monde
   partagé (la ferme seule). */

import { DATA } from './catalog.js';
import { mulberry32 } from './base.js';
import { hache } from './ferme-generee.js';
import { farmSeed } from './terrain.js';
import { addItem } from './inventory.js';
import { habitantsDe } from './habitants.js';
import { ajouterAmitie, cleDe } from './amitie.js';
import { deHameau } from './bienvenue.js';

const FE = () => DATA.FETES;
const MOIS = () => DATA.LUNE.JOURS_MOIS;
const GARDE = 30;

// « à » devant le nom d'un hameau : aux Genêts, au Gué, à la Combe, à l'Orée, à Brévans.
export function aHameau(nom) {
  const m = /^(Les|Le|La|L')\s?(.*)$/.exec(String(nom || ''));
  return m ? { Les: 'aux ', Le: 'au ', La: 'à la ', "L'": 'à l\'' }[m[1]] + m[2] : `à ${nom}`;
}

// Le nom et l'icône de la fête du hameau `h` (selon son métier).
export function nomFete(h) {
  const [icone, nom] = FE().NOMS[h && h.metier] || FE().NOMS['*'];
  return { icone, nom };
}

// Les fêtes du mois qui contient le jour `day` : [{ hameau, nomHameau, aHameau (« au Gué »), deHameau (« du Gué »),
// nom, icone, jour, debut, fin }], par jour.
export function fetesDuMois(state, day = state.day) {
  const d = Math.max(1, Math.floor(Number(day) || 1));
  const mois = Math.floor((d - 1) / MOIS()), premier = mois * MOIS() + 1;
  const H = habitantsDe(state);
  const ids = Object.keys(H).filter((id) => H[id] && (H[id].foyers || []).length).sort();
  if (!ids.length) return [];
  const rnd = mulberry32(hache(`${farmSeed(state)}:fetes:${mois}`));
  const jours = [];
  for (let j = FE().JOUR_MIN; j <= MOIS(); j++) jours.push(j);
  const out = [];
  for (let k = 0; k < Math.min(FE().PAR_MOIS, ids.length); k++) {
    const hid = ids.splice(Math.floor(rnd() * ids.length), 1)[0];
    const j = jours.splice(Math.floor(rnd() * jours.length), 1)[0];
    const { icone, nom } = nomFete(H[hid]);
    out.push({ hameau: hid, nomHameau: H[hid].nom, aHameau: aHameau(H[hid].nom), deHameau: deHameau(H[hid].nom), nom, icone, jour: premier + j - 1, debut: FE().DEBUT, fin: FE().FIN });
  }
  return out.sort((a, b) => a.jour - b.jour);
}

// Les fêtes du jour `day`.
export function fetesDuJour(state, day = state.day) {
  return fetesDuMois(state, day).filter((f) => f.jour === day);
}

// Les fêtes des `n` prochains jours (aujourd'hui compris), dans l'ordre.
export function fetesAVenir(state, n = FE().ANNONCE) {
  const out = [], vus = new Set();
  for (let d = state.day; d < state.day + n; d++) for (const f of fetesDuMois(state, d)) {
    const k = `${f.hameau}:${f.jour}`;
    if (f.jour >= state.day && f.jour < state.day + n && !vus.has(k)) { vus.add(k); out.push(f); }
  }
  return out.sort((a, b) => a.jour - b.jour);
}

// La fête en cours dans le hameau `hid` à l'heure `heure`, ou null.
export function feteEnCours(state, hid, heure) {
  return fetesDuJour(state).find((f) => f.hameau === hid && heure >= f.debut && heure < f.fin) || null;
}

// Le joueur est au hameau `hid` à l'heure `heure` : s'il y a la fête, il y participe (une fois par fête).
// → { ok, nom, icone, nomHameau, amis (combien d'habitants), points, cadeau: { item, n } | null } ou { ok: false }.
export function allerALaFete(state, hid, heure) {
  if (state.mondePartage) return { ok: false };
  const f = feteEnCours(state, hid, heure);
  if (!f) return { ok: false };
  if (!state.fetes || typeof state.fetes !== 'object') state.fetes = {};
  if (!state.fetes.vues || typeof state.fetes.vues !== 'object') state.fetes.vues = {};
  const cle = `${hid}:${f.jour}`;
  if (state.fetes.vues[cle]) return { ok: false, deja: true };
  state.fetes.vues[cle] = true;
  for (const k of Object.keys(state.fetes.vues)) if (state.day - Number(k.split(':').pop()) > GARDE) delete state.fetes.vues[k];
  const h = habitantsDe(state)[hid];
  let amis = 0;
  for (const fo of (h && h.foyers) || []) for (const m of fo.membres || []) if (!m.enfant) { ajouterAmitie(state, cleDe(m), FE().AMITIE); amis += 1; }
  const plats = DATA.BIENVENUE.PLATS, item = plats[h && h.metier] || plats['*'];
  const cadeau = item && DATA.OBJETS[item] ? { item, n: 1 } : null;
  if (cadeau) addItem(state, cadeau.item, cadeau.n);
  return { ok: true, nom: f.nom, icone: f.icone, nomHameau: f.nomHameau, deHameau: f.deHameau, amis, points: FE().AMITIE, cadeau };
}

// Le joueur est-il venu à la fête du hameau `hid` ces `jours` derniers jours ?
export function venuALaFete(state, hid, jours = 7) {
  const V = (state.fetes && state.fetes.vues) || {};
  return Object.keys(V).some((k) => { const i = k.lastIndexOf(':'), h = k.slice(0, i), j = k.slice(i + 1); return h === hid && state.day - Number(j) <= jours && state.day >= Number(j); });
}
