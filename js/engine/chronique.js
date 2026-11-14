/* ---------- la chronique de l'île (le chantier « l'île à bâtir », fiche I7g) ----------

   Il n'y a pas de récit écrit : c'est le joueur qui fait l'histoire de son île, et la chronique la note d'elle-même. Une
   liste datée, une ligne par moment qui compte (VILLAGE.CHRONIQUE.TYPES, data/village.json) : l'arrivée, la première
   récolte, la première vente au port, chaque villageois installé, le nom du village, chaque palier, chaque niveau du port,
   un commerce ouvert, deux villageois devenus proches, un foyer formé, une fête, un projet fini, le dixième villageois.

   Le seul point d'entrée est noterChronique(state, type, donnees) : les autres fiches l'appellent (I5a, commerceOuvert ;
   I7f, le résumé d'avant, type « avant » ; I8a, les fêtes et les projets du village, types « fete » et « projet »). Une
   ligne garde ses données, noms compris, du jour où elle s'écrit : renommer l'île ou le village change le titre de la
   fenêtre et le panneau, pas les lignes passées (une ligne de nom écrite le jour même est corrigée : le baptême du jour,
   renommerEtNoter). Une ligne de même clé (TYPES[type].cle) ne s'écrit qu'une fois.

   La borne (CHRONIQUE.MAX lignes) : au-delà, les lignes des mois de lune les plus anciens se résument (une ligne « mois »
   par mois : ce qui s'y est passé, compté avec RESUME), puis les résumés les plus anciens se fondent deux à deux. Une
   ligne épinglée par le joueur ne se résume jamais (EPINGLES au plus), ni l'arrivée ni le récit d'avant. Le joueur peut
   écrire une note à lui sur une ligne (NOTE_MAX signes, du texte libre : la page l'échappe, escapeHtml).

   state.chronique = {
     seq (le numéro de la dernière ligne),
     lignes: [{ n (son numéro), jour, type, cle (ou absente), d: { les données, les noms figés }, epingle (true, ou
       absent), note (le texte du joueur, ou absent) }], dans l'ordre des jours,
     faits: [les clés des lignes qui ont été résumées : elles ne se réécrivent pas] }.
   Il ne naît qu'avec le chantier allumé (une partie neuve, une partie d'essai ou le premier moment noté) ; éteint, rien
   ne s'écrit. La page : js/ui/chronique.js ; les villageois s'en souviennent (villageois-amitie.js, souvenir_<type>). Les
   tests : tests/engine/village-chronique.test.mjs. */

import { DATA } from './catalog.js';
import { villageActif } from './village.js';
import { monthIndex, yearNumber } from './lune.js';
import { commerceEnPhrase, ileEnPhrase, nettoyerNom, nomAffiche, nomDe, nommerCommerce, nommerVillageSiBesoin, renommer } from './noms.js';

const C_ = () => (DATA.VILLAGE && DATA.VILLAGE.CHRONIQUE) || {};
const TYPES = () => C_().TYPES || {};
const objet = (v) => !!v && typeof v === 'object' && !Array.isArray(v);
const jourDe = (state) => Math.max(1, Math.floor(Number(state && state.day) || 1));
const JM = () => Math.max(1, Number(DATA.LUNE.JOURS_MOIS) || 14);
const moisDe = (jour) => Math.floor((Math.max(1, jour) - 1) / JM());
// (les lignes qui ne se résument pas, en plus de celles qu'on épingle)
const GARDEES = new Set(['arrivee', 'avant']);
const majuscule = (t) => (t ? t.charAt(0).toUpperCase() + t.slice(1) : t);

/* ---------- la partie ---------- */

export function nouvelleChronique() {
  return { seq: 0, lignes: [], faits: [] };
}

// La chronique de la partie (créée au besoin, réparée si elle est abîmée).
export function chroniqueDe(state) {
  if (!objet(state.chronique)) state.chronique = nouvelleChronique();
  const C = state.chronique;
  if (!Array.isArray(C.lignes)) C.lignes = [];
  if (!Array.isArray(C.faits)) C.faits = [];
  if (!Number.isInteger(C.seq) || C.seq < 0) C.seq = C.lignes.reduce((m, l) => Math.max(m, Number(l && l.n) || 0), 0);
  return C;
}

// Les données d'une ligne : des textes (bornés), des nombres finis, des booléens, des listes courtes de textes.
function assainir(d) {
  const out = {};
  if (!objet(d)) return out;
  for (const [k, v] of Object.entries(d)) {
    if (!/^[A-Za-z_][A-Za-z0-9_]{0,23}$/.test(k)) continue;
    if (typeof v === 'string') out[k] = v.slice(0, 240);
    else if (typeof v === 'number' && Number.isFinite(v)) out[k] = v;
    else if (typeof v === 'boolean') out[k] = v;
    else if (Array.isArray(v)) out[k] = v.filter((x) => typeof x === 'string').slice(0, 16).map((x) => x.slice(0, 40));
  }
  return out;
}

// Un texte dont les {clé} viennent de `mots` ({Clé} : sa première lettre en capitale) ; une clé absente s'efface.
export function remplirChronique(modele, mots) {
  const t = String(modele || '').replace(/\{([A-Za-z_][A-Za-z0-9_]*)\}/g, (m, k) => {
    const bas = k.charAt(0).toLowerCase() + k.slice(1);
    const v = mots[k] !== undefined ? mots[k] : mots[bas];
    if (v === undefined || v === null) return '';
    const s = Array.isArray(v) ? v.join(', ') : String(v);
    return k !== bas && mots[k] === undefined ? majuscule(s) : s;
  });
  return t.replace(/\s{2,}/g, ' ').replace(/\s+([.,])/g, '$1').trim();
}

const cleDe = (type, d, jour) => {
  const T = TYPES()[type];
  return T && T.cle ? remplirChronique(T.cle, { ...d, jour: d.jour !== undefined ? d.jour : jour }) : null;
};

// La ligne de clé `cle` a-t-elle été écrite (gardée ou résumée) ?
export function chroniqueAEcrit(state, cle) {
  const C = objet(state && state.chronique) ? state.chronique : null;
  if (!C || !cle) return false;
  return (Array.isArray(C.lignes) && C.lignes.some((l) => l && l.cle === cle)) || (Array.isArray(C.faits) && C.faits.includes(cle));
}

// La famille qui débarque : la première ligne, écrite dès que la famille est configurée (le départ : setupPending),
// datée du jour 1. Les autres lignes l'écrivent d'abord s'il le faut. → la ligne, ou null.
export function assurerArrivee(state) {
  if (!villageActif(state) || (state.famille && state.famille.configuree === false)) return null;
  if (chroniqueAEcrit(state, 'arrivee')) return null;
  return ecrire(state, 'arrivee', {}, 1);
}

// Écrit la ligne (sans vérifier le réglage) : les noms du jour figés, la clé vérifiée. → la ligne, ou null.
function ecrire(state, type, donnees, jour) {
  const T = TYPES()[type];
  if (!T) return null;
  const d = assainir(donnees);
  // (les noms du jour : l'île, le village, la famille, s'il en est question et qu'on ne les a pas donnés)
  const modele = String(T.texte || '');
  if (/\{l?ile\}/i.test(modele) && d.ile === undefined) d.ile = nomDe(state, 'ile') || 'l\'île';
  if (/\{village\}/i.test(modele) && d.village === undefined) d.village = nomAffiche(state) || 'le village';
  if (/\{famille\}/i.test(modele) && d.famille === undefined) d.famille = (state.famille && state.famille.nom) || '';
  const cle = cleDe(type, d, jour);
  if (cle && chroniqueAEcrit(state, cle)) return null;
  const C = chroniqueDe(state);
  const l = { n: ++C.seq, jour, type, d };
  if (cle) l.cle = cle;
  // (dans l'ordre des jours : une ligne datée d'avant, l'arrivée du jour 1, prend sa place)
  let i = C.lignes.length;
  while (i > 0 && (Number(C.lignes[i - 1].jour) || 0) > jour) i--;
  C.lignes.splice(i, 0, l);
  bornerChronique(state);
  return l;
}

// Le point d'entrée : note le moment `type` (VILLAGE.CHRONIQUE.TYPES) avec ses `donnees` (les prénoms, les ids : qui, a,
// b, avec ; les noms). Rien le chantier éteint ; une ligne de même clé ne s'écrit qu'une fois. → la ligne, ou null.
export function noterChronique(state, type, donnees = {}) {
  if (!state || !villageActif(state) || !TYPES()[type]) return null;
  if (type !== 'avant') assurerArrivee(state);
  if (type === 'arrivee') return null;   // (assurerArrivee l'a écrite, ou elle l'était déjà)
  return ecrire(state, type, donnees, jourDe(state));
}

// Fiche I7f (la migration d'une partie d'avant : migration-ile.js) : une ligne datée du jour `jour` (pas après
// aujourd'hui), sans écrire l'arrivée de la famille sur l'île (une partie d'avant n'a pas débarqué). → la ligne, ou null.
export function noterChroniqueLe(state, type, donnees, jour) {
  if (!state || !villageActif(state) || !TYPES()[type]) return null;
  return ecrire(state, type, donnees, Math.max(1, Math.min(jourDe(state), Math.floor(Number(jour) || 1))));
}

/* ---------- les moments branchés ici (les fichiers du jeu appellent ces aides) ---------- */

// La première récolte (campaign.js, noteCropHarvested).
export function chroniqueRecolte(state, culture) {
  if (!villageActif(state) || chroniqueAEcrit(state, 'recolte')) return null;
  const c = DATA.CULTURES[culture];
  return noterChronique(state, 'recolte', { culture: c ? c.nom.toLowerCase() : String(culture) });
}

// La première vente au port (portage.js vendreCharge, bac.js honorerCommande).
export function chroniqueVente(state, item) {
  if (!villageActif(state) || chroniqueAEcrit(state, 'vente')) return null;
  const o = DATA.OBJETS[item];
  return noterChronique(state, 'vente', { objet: o ? o.nom.toLowerCase() : String(item) });
}

// Un villageois s'installe (villageois.js arriverVillageois ; un enfant : liens.js arriverEnfant) : sa ligne, puis le
// village prend un nom (le NOMS.VILLAGE_A-ième adulte), puis le dixième villageois. → les lignes écrites.
export function chroniqueArrivee(state, v, parents = null) {
  if (!villageActif(state) || !objet(v)) return [];
  const out = [];
  if (v.enfant) out.push(noterChronique(state, 'enfant', { qui: v.id, prenom: v.prenom, a: parents && parents[0] ? parents[0].id : undefined, b: parents && parents[1] ? parents[1].id : undefined, pa: parents && parents[0] ? parents[0].prenom : undefined, pb: parents && parents[1] ? parents[1].prenom : undefined }));
  else out.push(noterChronique(state, 'villageois', { qui: v.id, prenom: v.prenom, village: nomDe(state, 'village') || undefined, ile: nomDe(state, 'ile') || undefined }));
  const nom = nommerVillageSiBesoin(state);
  if (nom) out.push(noterChronique(state, 'village', { village: nom }));
  const n = (Array.isArray(state.villageois) ? state.villageois : []).filter(objet).length;
  if (n === 10) out.push(noterChronique(state, 'dixieme', { qui: v.id, prenom: v.prenom }));
  return out.filter(Boolean);
}

// Un commerce ouvre (la fiche I5a l'appellera : { id (le commerce), sorte (forge, mercerie…), qui (l'id de l'artisan) }) :
// son nom (nommerCommerce : proposé à la graine s'il n'en a pas) et sa ligne, « Léa ouvre la forge du Vieux Chêne ».
// → la ligne, ou null.
export function commerceOuvert(state, { id, sorte = null, qui = null } = {}) {
  if (!villageActif(state) || id === null || id === undefined) return null;
  const nom = nommerCommerce(state, id, { sorte });
  const v = (Array.isArray(state.villageois) ? state.villageois : []).find((x) => objet(x) && x.id === qui);
  return noterChronique(state, 'commerce', { id: String(id), sorte: sorte || '', qui: qui || undefined, prenom: v ? v.prenom : 'On', nom, commerce: commerceEnPhrase(nom, sorte) });
}

// Le joueur renomme l'île ou le village (ou un commerce, une maison) : noms.js renommer, puis la chronique. La première
// fois qu'il nomme le village, sa ligne ; plus tard, « … s'appelle désormais … » ; une ligne de nom écrite aujourd'hui
// (l'arrivée, le baptême du village) est corrigée plutôt que doublée. → le résultat de renommer.
export function renommerEtNoter(state, quoi, texte, id = null) {
  const r = renommer(state, quoi, texte, id);
  if (!r.ok || (quoi !== 'ile' && quoi !== 'village') || r.avant === r.nom) return r;
  const C = chroniqueDe(state), j = jourDe(state);
  const baptemes = quoi === 'ile' ? ['arrivee', 'ile_nom'] : ['village', 'village_nom'];
  const duJour = C.lignes.filter((l) => l.jour === j && l.d && typeof l.d[quoi] === 'string');
  // (aujourd'hui, ce qui portait l'ancien nom le prend : le baptême du jour n'est pas encore passé)
  for (const l of duJour) if (l.d[quoi] === r.avant) l.d[quoi] = r.nom;
  if (duJour.some((l) => baptemes.includes(l.type))) return r;
  if (quoi === 'village' && !chroniqueAEcrit(state, 'village')) noterChronique(state, 'village', { village: r.nom });
  else noterChronique(state, `${quoi}_nom`, { [quoi]: r.nom });
  return r;
}

/* ---------- la borne : le résumé par mois ---------- */

const resumable = (l) => l && !l.epingle && !GARDEES.has(l.type) && l.type !== 'mois';

// Garde la clé d'une ligne résumée (elle ne se réécrira pas), sauf celles qui portent leur jour (elles ne reviennent pas).
function garderCle(C, l) {
  const T = TYPES()[l.type];
  if (l.cle && !(T && /\{jour\}/.test(T.cle || '')) && !C.faits.includes(l.cle)) C.faits.push(l.cle);
}

function ajouterCompte(compte, de) {
  for (const [k, n] of Object.entries(de || {})) compte[k] = (compte[k] || 0) + (Number(n) || 0);
}

// Au-delà de MAX lignes : les mois les plus anciens (sauf celui du jour) se résument, puis les résumés se fondent.
export function bornerChronique(state) {
  const C = chroniqueDe(state), max = Math.max(4, Number(C_().MAX) || 120), cur = moisDe(jourDe(state));
  let garde = 0;
  while (C.lignes.length > max && garde++ < 1000) {
    // 1. le mois le plus ancien qui a de quoi se résumer (au moins deux lignes, ou une ligne et déjà son résumé)
    const parMois = new Map();
    for (const l of C.lignes) {
      const m = moisDe(l.type === 'mois' ? l.d.de : l.jour);
      if (!parMois.has(m)) parMois.set(m, { r: [], resume: null });
      const e = parMois.get(m);
      if (l.type === 'mois' && l.d.de !== undefined && moisDe(l.d.de) === moisDe(l.d.a)) e.resume = l;
      else if (resumable(l)) e.r.push(l);
    }
    const mois = [...parMois.keys()].sort((a, b) => a - b).find((m) => m < cur && (parMois.get(m).r.length >= 2 || (parMois.get(m).r.length && parMois.get(m).resume)));
    if (mois !== undefined) {
      const e = parMois.get(mois);
      let res = e.resume;
      if (!res) {
        res = { n: ++C.seq, jour: mois * JM() + 1, type: 'mois', d: { de: mois * JM() + 1, a: (mois + 1) * JM(), compte: {} } };
        const i = C.lignes.indexOf(e.r[0]);
        C.lignes.splice(i, 0, res);
      }
      for (const l of e.r) {
        res.d.compte[l.type] = (res.d.compte[l.type] || 0) + 1;
        garderCle(C, l);
      }
      const partis = new Set(e.r);
      C.lignes = C.lignes.filter((l) => !partis.has(l));
      continue;
    }
    // 2. les deux résumés les plus anciens se fondent (puis, en dernier recours, les deux lignes les plus anciennes)
    const R = C.lignes.filter((l) => l.type === 'mois');
    const deux = R.length >= 2 ? R.slice(0, 2) : C.lignes.filter((l) => resumable(l) || l.type === 'mois').slice(0, 2);
    if (deux.length < 2) break;
    const [x, y] = deux;
    const de = Math.min(x.type === 'mois' ? x.d.de : x.jour, y.type === 'mois' ? y.d.de : y.jour);
    const a = Math.max(x.type === 'mois' ? x.d.a : x.jour, y.type === 'mois' ? y.d.a : y.jour);
    const compte = {};
    for (const l of deux) {
      if (l.type === 'mois') ajouterCompte(compte, l.d.compte);
      else { compte[l.type] = (compte[l.type] || 0) + 1; garderCle(C, l); }
    }
    const fondu = { n: ++C.seq, jour: de, type: 'mois', d: { de, a, compte } };
    const i = C.lignes.indexOf(x);
    C.lignes.splice(i, 1, fondu);
    C.lignes = C.lignes.filter((l) => l !== y);
  }
  return C;
}

/* ---------- lire ---------- */

// Le nom d'un mois de lune et son année : « Solaria, an 1 ».
export function nomDuMois(jour) {
  return `${DATA.LUNE.MOIS[monthIndex(jour)]}, an ${yearNumber(jour)}`;
}

// Le texte d'un résumé : « 3 villageois arrivés, 2 paliers franchis et une fête. »
function texteResume(l) {
  const R = C_().RESUME || {}, out = [];
  for (const [type, n] of Object.entries(l.d.compte || {})) {
    if (!(n > 0)) continue;
    const f = R[type] || R['*'] || ['un moment', '{n} moments'];
    out.push(remplirChronique(n > 1 ? f[1] : f[0], { n }));
  }
  const liste = out.length > 1 ? `${out.slice(0, -1).join(', ')} et ${out[out.length - 1]}` : out[0] || 'des jours tranquilles';
  const de = l.d.de, a = l.d.a;
  const quand = moisDe(de) === moisDe(a) ? `En ${DATA.LUNE.MOIS[monthIndex(de)]}` : `De ${nomDuMois(de)} à ${nomDuMois(a)}`;
  return `${quand} : ${liste}.`;
}

// Le texte d'une ligne (ses noms figés), son icône. → { texte, icone }.
export function texteLigne(l) {
  if (!l) return { texte: '', icone: '' };
  if (l.type === 'mois') return { texte: texteResume(l), icone: '🗓️' };
  const T = TYPES()[l.type] || {};
  return { texte: majuscule(remplirChronique(T.texte, { ...(l.d || {}), lIle: ileEnPhrase(l.d && l.d.ile), jour: l.jour })), icone: (l.d && l.d.icone) || T.icone || '·' };
}

const vue = (l) => ({ n: l.n, jour: l.jour, type: l.type, ...texteLigne(l), epingle: !!l.epingle, note: typeof l.note === 'string' ? l.note : '', resume: l.type === 'mois' });

// La chronique pour la fenêtre : les mois de lune, du plus récent au plus ancien, et dans chacun les lignes du plus
// récent au plus ancien : [{ mois, titre (« Solaria, an 1 »), lignes: [{ n, jour, type, texte, icone, epingle, note,
// resume }] }].
export function chroniqueParMois(state) {
  const C = objet(state && state.chronique) && Array.isArray(state.chronique.lignes) ? state.chronique : { lignes: [] };
  const M = new Map();
  for (const l of C.lignes) {
    if (!objet(l)) continue;
    const m = moisDe(l.type === 'mois' ? (l.d && l.d.de) || l.jour : l.jour);
    if (!M.has(m)) M.set(m, []);
    M.get(m).push(l);
  }
  return [...M.keys()].sort((a, b) => b - a).map((m) => ({
    mois: m,
    titre: nomDuMois(m * JM() + 1),
    lignes: M.get(m).slice().sort((a, b) => (b.type === 'mois') - (a.type === 'mois') || b.jour - a.jour || b.n - a.n).map(vue),
  }));
}

// Les lignes épinglées, de la plus récente à la plus ancienne.
export function lignesEpinglees(state) {
  const C = objet(state && state.chronique) && Array.isArray(state.chronique.lignes) ? state.chronique : { lignes: [] };
  return C.lignes.filter((l) => objet(l) && l.epingle).sort((a, b) => b.jour - a.jour || b.n - a.n).map(vue);
}

/* ---------- épingler, noter ---------- */

const ligneDe = (state, n) => chroniqueDe(state).lignes.find((l) => l && l.n === Number(n)) || null;

// Épingle (ou détache) la ligne `n` : une ligne épinglée ne se résume jamais. EPINGLES au plus. → { ok } ou un refus.
export function epinglerLigne(state, n, oui = true) {
  const l = ligneDe(state, n);
  if (!l) return { ok: false, error: 'Cette ligne n\'est plus dans la chronique.' };
  if (l.type === 'mois') return { ok: false, error: 'Un mois résumé ne s\'épingle pas.' };
  if (oui && !l.epingle) {
    const max = Math.max(1, Number(C_().EPINGLES) || 24);
    if (chroniqueDe(state).lignes.filter((x) => x && x.epingle).length >= max) return { ok: false, error: `${max} lignes épinglées au plus : détaches-en une d'abord.` };
    l.epingle = true;
  } else if (!oui) {
    delete l.epingle;
    bornerChronique(state);
  }
  return { ok: true, epingle: !!l.epingle };
}

// Une note du joueur : du texte libre, nettoyé (une ligne), NOTE_MAX signes au plus.
export function nettoyerNote(texte) {
  const max = Math.max(1, Number(C_().NOTE_MAX) || 140);
  return Array.from(nettoyerNom(typeof texte === 'string' ? texte : '')).slice(0, max).join('');
}

// Écrit la note du joueur sur la ligne `n` (vide : l'efface) ; la ligne s'épingle. → { ok, note } ou un refus.
export function noterLigne(state, n, texte) {
  const l = ligneDe(state, n);
  if (!l) return { ok: false, error: 'Cette ligne n\'est plus dans la chronique.' };
  if (l.type === 'mois') return { ok: false, error: 'Un mois résumé ne prend pas de note.' };
  const note = nettoyerNote(texte);
  if (!note) { delete l.note; return { ok: true, note: '' }; }
  if (!l.epingle) {
    const r = epinglerLigne(state, n, true);
    if (!r.ok) return r;
  }
  l.note = note;
  return { ok: true, note };
}

/* ---------- les souvenirs des villageois ---------- */

// Ceux qui figurent dans une ligne : qui, a, b, avec.
export function figurants(l) {
  const d = (l && l.d) || {};
  return [d.qui, d.a, d.b, ...(Array.isArray(d.avec) ? d.avec : [])].filter((x) => typeof x === 'string' && x);
}

// Les lignes où figure le villageois `id`, vieilles de SOUVENIR.DEPUIS à JUSQUA jours, de la plus récente à la plus
// ancienne (pas les résumés). → [ligne].
export function souvenirsDe(state, id) {
  const C = objet(state && state.chronique) && Array.isArray(state.chronique.lignes) ? state.chronique : null;
  if (!C || !id) return [];
  const S = C_().SOUVENIR || {}, j = jourDe(state);
  const de = Number(S.DEPUIS) || 3, a = Number(S.JUSQUA) || 120;
  return C.lignes.filter((l) => objet(l) && l.type !== 'mois' && j - l.jour >= de && j - l.jour <= a && figurants(l).includes(id))
    .sort((x, y) => y.jour - x.jour || y.n - x.n);
}

/* ---------- la sauvegarde ---------- */

// La chronique d'une sauvegarde (la migration v92 → v93) : les lignes lisibles gardées, leurs notes bornées.
export function reparerChronique(c) {
  const o = objet(c) ? c : {};
  const T = TYPES(), out = nouvelleChronique();
  const vus = new Set();
  for (const l of Array.isArray(o.lignes) ? o.lignes : []) {
    if (!objet(l) || !(T[l.type] || l.type === 'mois')) continue;
    const n = Number.isInteger(l.n) && l.n > 0 && !vus.has(l.n) ? l.n : null;
    const jour = Number.isInteger(l.jour) && l.jour >= 1 ? l.jour : null;
    if (n === null || jour === null) continue;
    vus.add(n);
    const r = { n, jour, type: l.type, d: l.type === 'mois' ? reparerResume(l.d, jour) : assainir(l.d) };
    if (typeof l.cle === 'string' && l.cle) r.cle = l.cle.slice(0, 80);
    if (l.epingle === true && l.type !== 'mois') r.epingle = true;
    if (typeof l.note === 'string' && l.type !== 'mois') { const note = nettoyerNote(l.note); if (note) r.note = note; }
    out.lignes.push(r);
  }
  out.lignes.sort((x, y) => x.jour - y.jour || x.n - y.n);
  out.faits = (Array.isArray(o.faits) ? o.faits : []).filter((k) => typeof k === 'string' && k).map((k) => k.slice(0, 80));
  out.seq = Math.max(Number.isInteger(o.seq) ? o.seq : 0, ...out.lignes.map((l) => l.n), 0);
  return out;
}

function reparerResume(d, jour) {
  const o = objet(d) ? d : {};
  const de = Number.isInteger(o.de) && o.de >= 1 ? o.de : jour, a = Number.isInteger(o.a) && o.a >= de ? o.a : de;
  const compte = {};
  for (const [k, n] of Object.entries(objet(o.compte) ? o.compte : {})) if (/^[a-z_]{1,24}$/.test(k) && Number.isInteger(n) && n > 0) compte[k] = n;
  return { de, a, compte };
}
