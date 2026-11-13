import { DATA } from './catalog.js';
import { villageActif } from './village.js';
import { farmTerrain } from './terrain.js';
import { blocsPoses } from './blocs.js';
import { villageoisDe } from './villageois.js';
import { quiEstLie } from './liens.js';
import { enregistrerVocation, vocationsEtat, debloque, nommerDeblocage } from './vocations.js';
import { fetesTenues } from './fetes-village.js';
import { centreDeLaPlace, nombreProjetsFaits } from './projets-village.js';

/* ---------- la vocation « village » : la convivialité (le chantier « l'île à bâtir », fiche I8a) ----------

   Un score entier, recalculé chaque fois de la partie (le socle : vocations.js ; les réglages : VOCATIONS.village,
   data/village.json). Ses causes, chacune plafonnée (CAUSES.<cause>.MAX) pour qu'aucune ne suffise seule :
     - bonheur : le bonheur moyen des villageois adultes, au-dessus de BASE, un point par PAR ;
     - ami, proche : les paires de villageois « ami » et « proche » (liens.js, quiEstLie), POINTS chacune ;
     - fete : les fêtes tenues (fetes-village.js) ;
     - projet : les projets du village finis (projets-village.js) ;
     - repas : les repas partagés avec des villageois (invitations.js servirRepas, noterRepasPartage) ;
     - decor : le décor de la place (DECOR) : les blocs posés à RAYON cases au plus du centre de la place (le panneau
       du village s'il est posé, sinon le puits, sinon la table commune : centreDeLaPlace), chaque sorte ses points
       (SORTES ; une clé qui finit par « _ » vaut pour toutes les sortes qui commencent ainsi).
   Ce que débloquent ses paliers : vocations.js debloque ; ici, l'arrivée d'un villageois lié (« arrivee:lien »,
   lienArrivee) et les couleurs d'enseigne des commerces (« enseigne:couleurs », couleursEnseigne). */

const VV = () => (DATA.VOCATIONS || {}).village || {};
const CA = () => VV().CAUSES || {};
const objet = (v) => !!v && typeof v === 'object' && !Array.isArray(v);
const borne = (n, max) => Math.max(0, Math.min(Number.isFinite(Number(max)) ? Number(max) : Infinity, Math.floor(n)));

// Le repas partagé (invitations.js servirRepas) avec au moins un villageois à table : compté pour la convivialité.
export function noterRepasPartage(state) {
  if (!villageActif(state)) return;
  const V = vocationsEtat(state);
  if (!objet(V.village)) V.village = {};
  V.village.repas = (Number.isInteger(V.village.repas) ? V.village.repas : 0) + 1;
}
export function repasPartages(state) {
  const v = state && objet(state.vocations) && objet(state.vocations.village) ? state.vocations.village : null;
  return v && Number.isInteger(v.repas) ? v.repas : 0;
}

// Les points d'un bloc `sorte` pour le décor de la place (DECOR.SORTES), 0 s'il n'en compte pas.
export function pointsDecor(sorte) {
  const S = (VV().DECOR || {}).SORTES || {};
  if (S[sorte] !== undefined) return Number(S[sorte]) || 0;
  let best = 0;
  for (const [k, n] of Object.entries(S)) if (k.endsWith('_') && String(sorte).startsWith(k)) best = Math.max(best, Number(n) || 0);
  return best;
}

// Le décor de la place : { centre (sa case, ou null), blocs: [{ case, sorte, points }], points }.
export function decorDeLaPlace(state) {
  const centre = centreDeLaPlace(state);
  if (centre === null) return { centre: null, blocs: [], points: 0 };
  const W = farmTerrain(state).LARGEUR, R = Number((VV().DECOR || {}).RAYON) || 7, B = blocsPoses(state), out = [];
  const c0 = centre % W, r0 = Math.floor(centre / W);
  for (const [k, sorte] of Object.entries(B)) {
    const t = Number(k);
    if (t === centre) continue;
    if (Math.max(Math.abs((t % W) - c0), Math.abs(Math.floor(t / W) - r0)) > R) continue;
    const p = pointsDecor(sorte);
    if (p > 0) out.push({ case: t, sorte, points: p });
  }
  out.sort((a, b) => a.case - b.case);
  return { centre, blocs: out, points: out.reduce((s, b) => s + b.points, 0) };
}

// Le calcul (enregistré au socle) : { score, causes: [{ id, nom, icone, valeur, detail (ce qui la fait : un nombre),
// max }] }.
export function convivialite(state) {
  const C = CA(), V = villageoisDe(state).filter((v) => !v.enfant);
  const cause = (id, valeur, detail) => ({ id, nom: (C[id] || {}).nom || id, icone: (C[id] || {}).icone || '', valeur: borne(valeur, (C[id] || {}).MAX), detail, max: Number((C[id] || {}).MAX) || null });
  const moyenne = V.length ? Math.round(V.reduce((s, v) => s + (Number(v.bonheur) || 0), 0) / V.length) : 0;
  const B = C.bonheur || {};
  const liens = V.length >= 2 ? quiEstLie(state).paires : [];
  const amis = liens.filter((p) => p.palier === 3).length, proches = liens.filter((p) => p.palier >= 4).length;
  const fetes = fetesTenues(state), projets = nombreProjetsFaits(state), repas = repasPartages(state), decor = decorDeLaPlace(state);
  const pts = (id) => Number((C[id] || {}).POINTS) || 0;
  const causes = [
    cause('bonheur', V.length ? (moyenne - (Number(B.BASE) || 0)) / Math.max(1, Number(B.PAR) || 1) : 0, moyenne),
    cause('ami', amis * pts('ami'), amis),
    cause('proche', proches * pts('proche'), proches),
    cause('fete', fetes * pts('fete'), fetes),
    cause('projet', projets * pts('projet'), projets),
    cause('repas', repas * pts('repas'), repas),
    cause('decor', decor.points * pts('decor'), decor.blocs.length),
  ];
  return { score: causes.reduce((s, c) => s + c.valeur, 0), causes };
}

enregistrerVocation('village', convivialite);

/* ---------- ce que débloquent ses paliers, lu ici ---------- */

// « arrivee:lien » : le nouveau venu `v` a déjà un lien avec un villageois (un ami, ou un parent : ARRIVEE_LIEN.PARENT,
// la chance), tiré de `rnd`. → { id (l'autre), sorte ('ami' | 'parent'), affinite } ou null (pas débloqué, personne).
export function lienArrivee(state, v, rnd) {
  if (!debloque(state, 'arrivee:lien')) return null;
  const autres = villageoisDe(state).filter((o) => o !== v && o.id !== v.id && !o.enfant);
  if (!autres.length) return null;
  const A = VV().ARRIVEE_LIEN || {};
  const o = autres[Math.floor(rnd() * autres.length)];
  const parent = rnd() < (Number(A.PARENT) || 0);
  return { id: o.id, sorte: parent ? 'parent' : 'ami', affinite: Number(parent ? A.PROCHE : A.AMI) || 50 };
}

// « enseigne:couleurs » : les couleurs d'enseigne que les commerces (I5a) peuvent prendre en plus des leurs :
// [{ id, nom, texte }] ([] tant que le palier n'est pas atteint).
export function couleursEnseigne(state) {
  return debloque(state, 'enseigne:couleurs') ? (VV().ENSEIGNES || []).map((c) => ({ ...c })) : [];
}

/* ---------- ce que disent ses déblocages ---------- */

const nomDe = (id) => { const o = DATA.OBJETS[id] || DATA.ATELIER.BLOCS[id]; return o ? `${o.icone || ''} ${o.nom}`.trim() : id; };
nommerDeblocage('plan', (id) => `📜 un plan : ${nomDe(id)} (à fabriquer à l'Atelier)`);
nommerDeblocage('projet', (sorte) => { const S = ((VV().PROJETS || {}).SORTES || {})[sorte]; return S ? `${S.icone} un projet : ${S.nom.toLowerCase()}` : `un projet : ${sorte}`; });
nommerDeblocage('fete', (q) => (q === 'seconde' ? '🎉 une seconde fête par mois de lune' : `🎉 ${q}`));
nommerDeblocage('arrivee', (q) => (q === 'lien' ? '🤝 des nouveaux venus qui ont déjà un ami ou un parent au village' : `🏝️ ${q}`));
nommerDeblocage('enseigne', (q) => (q === 'couleurs' ? `🎨 ${(VV().ENSEIGNES || []).length} couleurs d'enseigne pour les commerces` : `🎨 ${q}`));
