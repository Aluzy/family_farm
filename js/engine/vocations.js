import { DATA } from './catalog.js';
import { villageActif } from './village.js';

/* ---------- le socle des vocations de l'île (le chantier « l'île à bâtir », fiches I8a et I8b) ----------

   Une vocation n'est pas un choix dans un menu : c'est un score entier, calculé chaque fois de l'état de la partie
   (rien n'est gardé du score lui-même), qui sort de ce que le joueur bâtit. Deux vocations montent ensemble : chacune
   a son calcul, ses paliers, ce que ses paliers débloquent.

   Les données (data/village.json, VOCATIONS) : { [id]: { nom, icone, texte?, PALIERS: [{ score, nom?, icone?,
   debloque: [clés] }], …ses causes et réglages } }. Les paliers vont du plus bas au plus haut.

   Le calcul : un fichier par vocation (js/engine/vocation-<id>.js) l'enregistre, à son chargement :
     enregistrerVocation(id, calcul), où calcul(state) → { score (entier), causes: [{ id, nom, valeur (entier) }] }.
   La fiche I8a pose « village » (vocation-village.js), I8b « production » (vocation-production.js). Une troisième :
   une entrée dans VOCATIONS et un fichier de calcul, rien à changer ici.

   Les paliers atteints sont gardés (state.vocations.paliers[id] : le rang du plus haut atteint, 1 pour le premier ;
   0 aucun), notés la nuit (vocationsNuit, runNight) : un palier atteint ne se perd pas, même si le score redescend.
   Ce qu'il débloque est acquis : debloque(state, clé) (une clé « sorte:quoi », lue par le code qu'elle concerne :
   l'Atelier pour « plan:<recette> », les fêtes pour « fete:seconde »…).

   state.vocations = { paliers: { [id]: n }, …les données propres à chaque vocation (state.vocations.village : ses
   fêtes et ses projets, fetes-village.js, projets-village.js) }. Il ne naît qu'avec le chantier allumé ; éteint,
   rien ici ne se lit et une partie n'en a pas. Les tests : tests/engine/village-vocations.test.mjs. */

// (les calculs enregistrés : une déclaration de fonction, prête avant que le module ne s'évalue — un fichier de calcul
// peut s'enregistrer pendant un cycle d'imports)
function calculs() {
  if (!calculs.m) calculs.m = new Map();
  return calculs.m;
}
const objet = (v) => !!v && typeof v === 'object' && !Array.isArray(v);
const entier = (n) => (Number.isFinite(Number(n)) ? Math.round(Number(n)) : 0);

// Les données de la vocation `id` (VOCATIONS[id]), ou null.
export function donneesVocation(id) {
  const V = DATA.VOCATIONS;
  return objet(V) && objet(V[id]) ? V[id] : null;
}

// Ses paliers, dans l'ordre : [{ score, nom, icone, debloque: [clés] }].
export function paliersDe(id) {
  const d = donneesVocation(id);
  return d && Array.isArray(d.PALIERS) ? d.PALIERS.filter((p) => objet(p) && Number.isFinite(Number(p.score))) : [];
}

// Le calcul de la vocation `id` : calcul(state) → { score, causes: [{ id, nom, valeur }] }. Un second enregistrement
// remplace le premier (le rechargement d'un module dans les tests).
export function enregistrerVocation(id, calcul) {
  if (typeof id !== 'string' || !id || typeof calcul !== 'function') throw new Error('enregistrerVocation(id, calcul)');
  calculs().set(id, calcul);
}

// Les vocations enregistrées qui ont leurs données : [id], dans l'ordre des données.
export function idsVocations() {
  const V = objet(DATA.VOCATIONS) ? Object.keys(DATA.VOCATIONS) : [];
  return V.filter((id) => calculs().has(id) && donneesVocation(id));
}

// La partie : state.vocations (créé au besoin, réparé s'il est abîmé).
export function vocationsEtat(state) {
  if (!objet(state.vocations)) state.vocations = { paliers: {} };
  if (!objet(state.vocations.paliers)) state.vocations.paliers = {};
  return state.vocations;
}

// Le score de la vocation `id` : { score (entier, 0 au moins), causes: [{ id, nom, icone?, valeur (entier) }] }. Le
// chantier éteint, une vocation inconnue : 0, sans cause.
export function scoreVocation(state, id) {
  const f = calculs().get(id);
  if (!f || !villageActif(state)) return { score: 0, causes: [] };
  const r = f(state) || {};
  const causes = (Array.isArray(r.causes) ? r.causes : []).filter(objet).map((c) => ({ ...c, id: String(c.id), nom: String(c.nom || c.id), valeur: entier(c.valeur) }));
  return { score: Math.max(0, entier(r.score)), causes };
}

// Le rang du plus haut palier gardé de `id` (0 aucun).
export function palierGarde(state, id) {
  const P = state && objet(state.vocations) && objet(state.vocations.paliers) ? state.vocations.paliers : {};
  const n = Math.floor(Number(P[id]) || 0);
  return Math.max(0, Math.min(paliersDe(id).length, n));
}

// Le palier de `id` : { palier (le rang du plus haut palier gardé ; 0 aucun), suivant (le palier d'après : { rang,
// score, nom, icone, debloque, manque (les points qui manquent ; 0 : le score l'atteint, il se passe la nuit) }, ou
// null), debloque (les clés acquises, de tous les paliers gardés), score, atteint (le rang du plus haut palier que le
// score atteint maintenant, gardés compris) }. Un palier se passe la nuit (vocationsNuit) : ce qu'il débloque l'est au
// réveil.
export function palierVocation(state, id) {
  const P = paliersDe(id), { score } = scoreVocation(state, id);
  const palier = palierGarde(state, id);
  let atteint = palier;
  while (atteint < P.length && score >= Number(P[atteint].score)) atteint++;
  const s = P[palier];
  const suivant = s ? { rang: palier + 1, score: Number(s.score), nom: s.nom || '', icone: s.icone || '', debloque: [...(s.debloque || [])], manque: Math.max(0, Number(s.score) - score) } : null;
  return { palier, suivant, debloque: P.slice(0, palier).flatMap((p) => p.debloque || []), score, atteint };
}

// Les vocations de la partie : [{ id, nom, icone, texte, score, causes, palier, paliers: [{ rang, score, nom, icone,
// debloque, atteint }], suivant, debloque }] ; [] le chantier éteint.
export function listeVocations(state) {
  if (!villageActif(state)) return [];
  return idsVocations().map((id) => {
    const d = donneesVocation(id), { score, causes } = scoreVocation(state, id), p = palierVocation(state, id);
    return {
      id, nom: d.nom || id, icone: d.icone || '', texte: d.texte || '', score, causes, palier: p.palier, atteint: p.atteint, suivant: p.suivant, debloque: p.debloque,
      paliers: paliersDe(id).map((x, i) => ({ rang: i + 1, score: Number(x.score), nom: x.nom || '', icone: x.icone || '', debloque: [...(x.debloque || [])], atteint: i < p.palier })),
    };
  });
}

// La nuit (runNight, après la nuit des villageois) : chaque vocation note le plus haut palier que son score atteint
// (jamais moins que celui qu'elle avait). → [{ id, palier, nom, icone, debloque }] (les paliers passés cette nuit) ;
// null le chantier éteint.
export function vocationsNuit(state) {
  if (!villageActif(state)) return null;
  const ids = idsVocations();
  if (!ids.length) return null;
  const out = [];
  for (const id of ids) {
    const avant = palierGarde(state, id), palier = palierVocation(state, id).atteint;
    if (palier <= avant) continue;
    vocationsEtat(state).paliers[id] = palier;
    const P = paliersDe(id);
    for (let r = avant + 1; r <= palier; r++) out.push({ id, palier: r, nom: P[r - 1].nom || '', icone: P[r - 1].icone || '', debloque: [...(P[r - 1].debloque || [])] });
  }
  return out;
}

// Le déblocage `cle` (« plan:banc_pierre », « fete:seconde »…) est-il acquis ? Il l'est quand un palier gardé d'une
// vocation le donne. Le chantier éteint : jamais.
export function debloque(state, cle) {
  if (!state || !villageActif(state) || !objet(state.vocations) || !objet(state.vocations.paliers)) return false;
  for (const id of Object.keys(state.vocations.paliers)) {
    const n = palierGarde(state, id);
    if (paliersDe(id).slice(0, n).some((p) => (p.debloque || []).includes(cle))) return true;
  }
  return false;
}

// La vocation et le palier qui débloquent `cle` : { id, rang, score, nom, icone } (le premier trouvé), ou null.
export function quiDebloque(cle) {
  for (const id of objet(DATA.VOCATIONS) ? Object.keys(DATA.VOCATIONS) : []) {
    const i = paliersDe(id).findIndex((p) => (p.debloque || []).includes(cle));
    if (i >= 0) { const p = paliersDe(id)[i], d = donneesVocation(id); return { id, vocation: d.nom || id, icone: d.icone || '', rang: i + 1, score: Number(p.score), nom: p.nom || '' }; }
  }
  return null;
}

// Les paliers d'une sauvegarde (la migration v92 → v93) : des rangs entiers d'une vocation connue, bornés.
export function reparerPaliersVocations(v) {
  const o = objet(v) ? v : {};
  const P = objet(o.paliers) ? o.paliers : {}, paliers = {};
  for (const [id, n] of Object.entries(P)) {
    const r = Math.floor(Number(n) || 0);
    if (r > 0 && donneesVocation(id)) paliers[id] = Math.min(paliersDe(id).length, r);
  }
  return { ...o, paliers };
}

/* ---------- ce que dit un déblocage (la fenêtre « L'île », l'onglet Vocations) ---------- */

// Le texte d'une clé de déblocage, par sa sorte (« plan », « projet »…) : chaque fichier de vocation nomme les siennes
// (nommerDeblocage(sorte, (quoi, cle) → texte)). Une clé sans nom : elle-même.
function noms() {
  if (!noms.m) noms.m = new Map();
  return noms.m;
}
export function nommerDeblocage(sorte, fn) {
  if (typeof sorte === 'string' && typeof fn === 'function') noms().set(sorte, fn);
}
export function texteDeblocage(cle) {
  const i = String(cle).indexOf(':'), sorte = i < 0 ? cle : cle.slice(0, i), quoi = i < 0 ? '' : cle.slice(i + 1);
  const f = noms().get(sorte);
  return (f && f(quoi, cle)) || String(cle);
}
