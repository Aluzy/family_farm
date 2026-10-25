import { BIOMES } from '../engine/monde-gen.js';
import { apercuDesBiomes, caseMarchable, COULEURS_BIOMES, contexteSol, elementsSol, SOLS_MONDE, solDeRegion } from '../engine/monde-sol.js';
import { SORTES_ROCHES } from '../engine/monde-roches.js';
import { SORTES } from '../engine/monde-vegetation.js';
import { idObjetMonde, RECOLTE } from '../engine/monde-recolte.js';
import { SORTES_LIEUX } from '../engine/monde-lieux.js';
import { ESPECES_FAUNE, FAUNE } from '../engine/monde-faune.js';
import { DATA } from '../engine/catalog.js';

/* ---------- le sol du grand monde pour la scène (docs/grand-monde.md, étape 4 : fiche 4b) ---------- */

// Ce que la scène de la ferme reçoit au montage (ctx.monde, js/carte/ferme/sol.js) pour peindre le
// monde autour de la ferme et y faire marcher le personnage :
//   - region(rx, ry) : le sol de la région (js/engine/monde-sol.js, solDeRegion), ou null tant
//     qu'elle n'est pas faite (elle est alors demandée, une fois) ;
//   - quandRegion(f) : f(cle) quand une région arrive (la scène la repeint) ;
//   - apercu() : les biomes en gros ({ pas, l, h, biomes }) et couleurs (une par biome) : le sol
//     provisoire d'une région pas encore faite, ou null ;
//   - marchable(t) : peut-on marcher sur la case t (caseMarchable : la ferme oui ; une région pas
//     encore faite, non) ;
//   - ferme : { X, Y, LARGEUR, HAUTEUR } ; tuiles : SOLS_MONDE (où sont les tuiles des sols) ;
//     taille : celle des régions ; biomes : leurs noms (BIOMES : la mer, pour l'eau qui bouge) ;
//     sortes : celles de la végétation (VEGETATION.SORTES, js/engine/monde-vegetation.js) ; roches :
//     celles des rochers et des falaises (ROCHES.SORTES, js/engine/monde-roches.js) ;
//   - mesures() : la durée des éléments, de chaque région (dans le Worker ou en direct) ;
//   - ce qui se prend (fiche 6a, js/engine/monde-recolte.js) : regles (RECOLTE.SORTES, ce que donne
//     chaque sorte), idObjet(sorte, x, y) (l'identifiant d'une pièce, le même que le moteur) ;
//     ouvertes : une fonction que la page pose (js/ui/stage.js) et qui donne les cases que les
//     pièces prises rendent à la marche (casesOuvertesMonde), lues par marchable ;
//   - les lieux et les bêtes (fiche 6b) : lieux() (les lieux du plan, { hameaux, grottes, peche },
//     ou null tant que les éléments ne sont pas tirés), lieuxSortes (LIEUX.SORTES : l'entrée des
//     grottes, le ponton, les piquets, js/engine/monde-lieux.js), coins (CANNE.COINS.RAYON : à tant
//     de cases d'un coin de pêche, on pêche « au coin »), faune ({ especes : [{ cle, …FAUNE.ESPECES }],
//     PRES, LOIN, RAYON } : js/engine/monde-faune.js).
//
// Les régions se calculent dans un Web Worker (js/monde-worker.js) : la page ne fait qu'en garder
// le résultat, en mémoire (le monde entier fait 88 régions, environ 4 Mo : tout se garde ; pas
// d'IndexedDB : relire une région du disque ne serait guère plus rapide que la refaire, quelques
// ms dans le Worker, et le cache serait à jeter à chaque retouche du générateur). Sans Worker (un
// vieux navigateur, un Worker qui ne se charge pas), le même calcul se fait en direct, une région
// par tâche (setTimeout) : la page ne gèle pas plus de quelques ms à la fois, sauf la première
// fois (les éléments du monde, ~200 ms).

let courant = null;     // le sol du monde de la partie en cours (un seul à la fois)

// L'adresse du Worker : sur le site, scripts/build-site.mjs remplace MONDE_WORKER par celle du
// fichier regroupé (« js/monde-worker.js?v=… », un Worker classique) ; depuis le dépôt, le module.
/* global MONDE_WORKER */
function nouveauWorker() {
  if (typeof Worker !== 'function') return null;
  try {
    if (typeof MONDE_WORKER === 'string') return new Worker(MONDE_WORKER);
    return new Worker('js/monde-worker.js', { type: 'module' });
  } catch (e) {
    return null;
  }
}

// Le sol du monde du terrain T (celui de la partie : genererMonde(graine).terrain), ou null (un
// terrain sans monde). Le même tant que la graine ne change pas.
export function solDuMonde(T) {
  const M = T && T.MONDE;
  if (!M) return null;
  if (courant && courant.graine === M.graine) return courant.sol;
  if (courant) courant.fermer();
  courant = client(T, M);
  return courant.sol;
}

function client(T, M) {
  const regions = new Map(), demandees = new Set(), abonnes = [];
  const mesures = { elements: null, regions: [], mode: 'worker' };
  let apercu = null, direct = null, worker = nouveauWorker(), fini = false, lieux = null;
  const couleurs = BIOMES.map((b) => COULEURS_BIOMES[b] || '#6a8157');
  const recu = (r) => {
    regions.set(r.cle, r);
    mesures.regions.push(r.ms);
    for (const f of abonnes) f(r.cle);
  };
  // le calcul en direct : une région par tâche
  const enDirect = () => {
    if (direct) return;
    mesures.mode = 'direct';
    if (worker) { worker.terminate(); worker = null; }
    const ctx = contexteSol(M.graine, M.cadre, M.ferme, M.taille);
    direct = { ctx, file: [...demandees].filter((c) => !regions.has(c)), tache: null };
    if (!apercu) apercu = apercuDesBiomes(ctx);
    pas();
  };
  const pas = () => {
    if (!direct || direct.tache || fini) return;
    direct.tache = setTimeout(() => {
      direct.tache = null;
      if (fini) return;
      if (!direct.ctx.elements) { elementsSol(direct.ctx); mesures.elements = direct.ctx.mesures.elements; lieux = direct.ctx.elements.lieux; }
      const cle = direct.file.shift();
      if (cle && !regions.has(cle)) { const [rx, ry] = cle.split(',').map(Number); recu(solDeRegion(direct.ctx, rx, ry)); }
      if (direct.file.length) pas();
    }, 0);
  };
  if (worker) {
    worker.onmessage = (ev) => {
      const m = ev.data || {};
      if (fini || m.graine !== M.graine) return;
      if (m.type === 'apercu') apercu = m.apercu;
      else if (m.type === 'pret') { mesures.elements = m.ms; lieux = m.lieux || null; }
      else if (m.type === 'region') recu(m.region);
      else if (m.type === 'erreur') { console.warn('[monde] le Worker n\'a pas pu faire la région ' + m.cle + ' : ' + m.message); enDirect(); }
    };
    // (un Worker qui ne se charge pas : le calcul en direct)
    worker.onerror = (e) => { if (e && e.preventDefault) e.preventDefault(); enDirect(); };
    worker.postMessage({ type: 'init', graine: M.graine, cadre: M.cadre, ferme: M.ferme, taille: M.taille });
  } else enDirect();
  const sol = {
    ferme: M.cadre.FERME, tuiles: SOLS_MONDE, taille: M.taille, biomes: BIOMES, sortes: SORTES, roches: SORTES_ROCHES,
    regles: RECOLTE.SORTES, idObjet: idObjetMonde, ouvertes: null,
    lieux: () => lieux, lieuxSortes: SORTES_LIEUX, coins: (DATA.CANNE.COINS && DATA.CANNE.COINS.RAYON) || 0,
    faune: { especes: ESPECES_FAUNE.map((cle) => ({ cle, ...FAUNE.ESPECES[cle] })), PRES: FAUNE.PRES, LOIN: FAUNE.LOIN, RAYON: FAUNE.RAYON },
    region(rx, ry) {
      const cle = rx + ',' + ry, r = regions.get(cle);
      if (r) return r;
      if (!demandees.has(cle)) {
        demandees.add(cle);
        if (direct) { direct.file.push(cle); pas(); } else if (worker) worker.postMessage({ type: 'region', rx, ry });
      }
      return null;
    },
    quandRegion(f) { abonnes.push(f); },
    apercu: () => (apercu ? { apercu, couleurs } : null),
    marchable: (t) => caseMarchable(T, t, sol, sol.ouvertes ? sol.ouvertes() : null),
    mesures: () => mesures,
  };
  return {
    graine: M.graine, sol,
    fermer() { fini = true; if (worker) worker.terminate(); if (direct && direct.tache) clearTimeout(direct.tache); abonnes.length = 0; },
  };
}
