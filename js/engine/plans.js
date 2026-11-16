import { DATA } from './catalog.js';
import { mulberry32 } from './base.js';
import { hache } from './ferme-generee.js';

/* ---------- les plans des meubles de collection (data/plans.json, PLANS ; le lot 4) ----------

   Chaque pays (COLLECTIONS : la forêt, la côte, le marais, la montagne, la prairie) a sa collection de
   meubles de jardin, dont la recette de l'Atelier ne se fait qu'une fois son plan trouvé (ATELIER.RECETTES
   [].plan, js/engine/atelier.js recetteDebloquee). On les trouve :
     - en explorant : la première fois qu'on passe dans un biome du pays, hors de la ferme, le plan du premier
       meuble de la collection qu'on n'a pas encore (trouverPlanBiome ; la page l'annonce, js/ui/plans.js) ;
     - une récompense de palier ou de vocation (offrirPlan), annoncée au matin.
   (Le plan qu'offrait un ami d'un hameau de ce pays est retiré à la bascule, I9h.)

   state.plans = { connus: { [meuble]: { jour, de (le prénom de qui l'a offert, ou null : trouvé), annonce } },
     explores: { [collection]: le jour où l'on y a trouvé un plan }, amis: (une clé d'avant, gardée vide) } */

export const PLANS = DATA.PLANS;
const objet = (v) => !!v && typeof v === 'object' && !Array.isArray(v);
const jourDe = (state) => Math.max(1, Math.floor(Number(state.day) || 1));

export function plansDe(state) {
  if (!objet(state.plans)) state.plans = {};
  const P = state.plans;
  for (const k of ['connus', 'explores', 'amis']) if (!objet(P[k])) P[k] = {};
  return P;
}

// Le plan du meuble `id` est-il connu ?
export function planConnu(state, id) {
  return !!(objet(state.plans) && objet(state.plans.connus) && state.plans.connus[id]);
}

// La collection du meuble `id` : { id, nom, icone, … } ou null.
export function collectionDe(id) {
  for (const [cid, c] of Object.entries(PLANS.COLLECTIONS)) if (c.plans.includes(id)) return { id: cid, ...c };
  return null;
}
// La collection d'un biome (`foret`, `plage`…), ou null.
export function collectionDuBiome(biome) {
  for (const [cid, c] of Object.entries(PLANS.COLLECTIONS)) if (c.biomes.includes(biome)) return { id: cid, ...c };
  return null;
}

// Le prochain plan pas encore connu d'une collection, ou null.
function prochain(state, c) {
  return c.plans.find((id) => !planConnu(state, id)) || null;
}

function apprendre(state, id, de = null) {
  plansDe(state).connus[id] = { jour: jourDe(state), de, annonce: false };
}

// Le lot 6 : un plan offert (une récompense de chapitre, data/campaign.json recompense.plans). Déjà connu : le
// suivant de sa collection ; la collection complète : null (le meuble lui-même, à la place, js/engine/campaign.js).
// `annonce` : false pour qu'il soit annoncé au matin (watchPlans), true quand la page l'annonce elle-même.
// → l'id du plan appris, ou null.
export function offrirPlan(state, id, annonce = true) {
  const c = collectionDe(id);
  const vise = !planConnu(state, id) ? id : c ? prochain(state, c) : null;
  if (!vise) return null;
  apprendre(state, vise, null);
  plansDe(state).connus[vise].annonce = annonce;
  return vise;
}

// La collection : chacun de ses meubles, connu ou non. → [{ id, nom, connu, de }]
export function collection(state, cid) {
  const c = PLANS.COLLECTIONS[cid], K = objet(state.plans) && objet(state.plans.connus) ? state.plans.connus : {};
  return c.plans.map((id) => ({ id, nom: DATA.ATELIER.BLOCS[id].nom, connu: !!K[id], de: K[id] ? K[id].de : null }));
}

// Le personnage passe dans le biome `biome` (hors de la ferme : `dehors`) : la première fois pour ce pays, il
// trouve le plan du premier meuble qu'on n'a pas. → { id, collection, phrase } ou null.
export function trouverPlanBiome(state, biome, dehors = true) {
  if (!dehors || !biome) return null;
  const c = collectionDuBiome(biome);
  if (!c) return null;
  const P = plansDe(state);
  if (P.explores[c.id]) return null;
  const id = prochain(state, c);
  P.explores[c.id] = jourDe(state);
  if (!id) return null;
  apprendre(state, id, null);
  P.connus[id].annonce = true;   // (annoncé sur-le-champ par la page)
  const rnd = mulberry32(hache(`plan:${id}`)), L = PLANS.TROUVE;
  const de = deNom(DATA.ATELIER.BLOCS[id].nom);
  return { id, collection: c.id, phrase: L[Math.floor(rnd() * L.length)].replace('{de}', de).replace('{pays}', c.nom) };
}

// « du banc en rondins », « de la pergola fleurie », « de la jarre… »
export function deNom(nom) {
  const n = String(nom || '');
  const f = /^(Table|Chaise|Jarre|Lanterne|Jardinière|Pergola)\b/.test(n);
  return `${f ? 'de la' : 'du'} ${n.charAt(0).toLowerCase()}${n.slice(1)}`;
}

// Les plans offerts pas encore annoncés (au matin) : [{ id, collection, de }] ; ils sont marqués annoncés.
export function plansAAnnoncer(state) {
  const out = [];
  for (const [id, p] of Object.entries(plansDe(state).connus)) {
    if (p.annonce) continue;
    p.annonce = true;
    const c = collectionDe(id);
    out.push({ id, collection: c ? c.id : null, de: p.de });
  }
  return out;
}
