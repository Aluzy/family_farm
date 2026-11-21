/* ==========================================================================
   Le contrôle de l'île (docs/ile-300.md, section 11) : la liste des règles qu'une île ne respecte pas (vide :
   tout va bien). Pour les tests, et pour relire une sauvegarde douteuse. Parcourt toute l'île : jamais à
   chaque image.
   Une partie de l'île de 300 × 300 (js/engine/ile.js, docs/ile-300.md).
   ========================================================================== */

import { catalogue } from './catalogue.js';
import { groupesDe, voisinesDe } from './grille.js';
import { ILE, REGLAGES, SOL, SOL_EAU, SOLS } from './reglages.js';
import { auLarge } from './vie.js';

const N = ILE.TAILLE;
const PENTE = Math.floor(REGLAGES.RELIEF.PENTE_MAX * REGLAGES.VIE.HAUTEUR);

// La mer du large : de l'eau profonde, sans rien dessus.
function erreursDuLarge(ile) {
  for (let i = 0; i < N * N; i++) {
    if (auLarge(i) && (ile.sol[i] !== SOL.eau_profonde || ile.objet[i])) return [`la mer du large est touchée (${i})`];
  }
  return [];
}

// Ce qui pousse : un numéro du catalogue, un stade qu'il a, sur la terre (ou une eau où il pousse), et les empreintes
// des blocs qui ne se chevauchent pas et collent au tableau « bloque ».
function erreursDesObjets(ile, cat) {
  const erreurs = [];
  const pris = new Uint8Array(N * N);
  for (let i = 0; i < N * N; i++) {
    const o = ile.objet[i];
    if (!o) continue;
    const f = cat.fiches[o - 1];
    if (!f) {
      erreurs.push(`un numéro inconnu (${o}) en ${i}`);
      continue;
    }
    if (ile.etat[i] >= f.stades) erreurs.push(`${f.id} au stade ${ile.etat[i]} en ${i}`);
    const dansLEau = f.ou.some((p) => p.sol === SOLS[ile.sol[i]].nom);
    if (SOL_EAU[ile.sol[i]] && !dansLEau) erreurs.push(`${f.id} dans l'eau en ${i}`);
    if (!f.bloque) continue;
    const x = i % N;
    for (const [dx, dy] of f.empreinte) {
      const j = i + dy * N + dx;
      if (x + dx < 0 || x + dx >= N || pris[j]) erreurs.push(`l'empreinte de ${f.id} déborde ou chevauche en ${i}`);
      else pris[j] = 1;
    }
  }
  for (let i = 0; i < N * N; i++)
    if (pris[i] !== ile.bloque[i]) erreurs.push(`« bloque » ne colle pas aux blocs (${i})`);
  return erreurs.slice(0, 20);
}

// La terre d'un seul tenant, et pas de falaise entre deux cases de terre voisines.
function erreursDeLaTerre(ile) {
  const erreurs = [];
  const terre = new Uint8Array(N * N);
  for (let i = 0; i < N * N; i++) terre[i] = SOL_EAU[ile.sol[i]] ? 0 : 1;
  const morceaux = groupesDe(terre, N).length;
  if (morceaux !== 1) erreurs.push(`la terre est en ${morceaux} morceaux`);
  for (let i = 0; i < N * N && erreurs.length < 5; i++) {
    if (!terre[i]) continue;
    for (const j of voisinesDe(i, N)) {
      if (j > i && terre[j] && Math.abs(ile.hauteur[i] - ile.hauteur[j]) > PENTE) erreurs.push(`une falaise en ${i}`);
    }
  }
  return erreurs;
}

// Les listes de la nuit : la croissance ne porte que des plantes qui poussent encore ; la repousse, des espèces.
function erreursDesListes(ile, cat) {
  const erreurs = [];
  for (const i of ile.croissance) {
    const f = ile.objet[i] ? cat.fiches[ile.objet[i] - 1] : null;
    if (!f || ile.etat[i] >= f.stades - 1) erreurs.push(`la croissance porte une case qui ne pousse pas (${i})`);
  }
  for (const r of ile.repousse) if (!cat.fiches[r.numero - 1]) erreurs.push(`une repousse inconnue (${r.numero})`);
  return erreurs.slice(0, 10);
}

/**
 * Les règles que l'île ne respecte pas : la taille, la mer du large, ce qui pousse et les empreintes, la terre d'un
 * seul tenant sans falaise, les listes de la nuit, le point d'apparition sur la terre. Vide : tout va bien.
 * @param {import('./vie.js').Ile} ile
 * @returns {string[]}
 */
export function verifierIle(ile, cat = catalogue()) {
  const tailles = ['sol', 'hauteur', 'objet', 'etat', 'bloque'].filter((k) => ile[k]?.length !== N * N);
  if (ile.n !== N || tailles.length) return [`les tableaux n'ont pas la taille de l'île : ${tailles.join(', ')}`];
  const { x, y } = ile.apparition;
  const depart = SOL_EAU[ile.sol[y * N + x]] ? ['le point d’apparition est dans l’eau'] : [];
  return [
    ...erreursDuLarge(ile),
    ...erreursDesObjets(ile, cat),
    ...erreursDeLaTerre(ile),
    ...erreursDesListes(ile, cat),
    ...depart,
  ];
}
