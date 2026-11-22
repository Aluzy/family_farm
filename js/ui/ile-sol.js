/* ==========================================================================
   Le sol de l'île pour la scène (docs/ile-300.md, étape 7b) : le même objet que js/ui/monde-sol.js solDuMonde (la
   scène de la ferme le reçoit en ctx.monde), ses régions faites d'après l'île vivante de la partie
   (js/engine/ile/scene.js), en direct, une région par tâche (≈ 7 ms chacune). Une région de l'île qui a changé
   (ile.modifiees) refait les régions de la scène qui la touchent : la scène les repeint (quandRegion).
   ========================================================================== */

import { BIOMES } from '../engine/monde-gen.js';
import { COULEURS_BIOMES, SOLS_MONDE } from '../engine/monde-sol.js';
import { SORTES_ROCHES } from '../engine/monde-roches.js';
import { SORTES } from '../engine/monde-vegetation.js';
import { idObjetMonde, RECOLTE } from '../engine/monde-recolte.js';
import { SORTES_LIEUX } from '../engine/monde-lieux.js';
import { FAUNE } from '../engine/monde-faune.js';
import { HAMEAUX, SORTES_HAMEAUX } from '../engine/monde-hameaux.js';
import { DATA } from '../engine/catalog.js';
import { ILE, regionsModifiees } from '../engine/ile.js';
import { BIOMES as BIOMES_ILE, SOL_BIOME, SOLS } from '../engine/ile/reglages.js';
import { reglesDeLIle } from '../engine/ile/recoltes.js';
import { SEMIS } from '../engine/ile/scene.js';
import { contexteIle, planchesDeLIle, regionDeLIle, regionsDeLaScene } from '../engine/ile/scene.js';

const N = ILE.TAILLE;
let courant = null;

// les couleurs des sols de l'île, dans l'ordre de SOLS (la couleur moyenne de leurs tuiles)
const COULEURS_SOLS = {
  eau_profonde: [36, 97, 170],
  sable: [223, 193, 136],
  galets: [176, 166, 150],
  herbe: [132, 169, 60],
  feuilles: [104, 120, 52],
  aiguilles: [120, 98, 60],
  mousse: [76, 120, 50],
  clairiere: [140, 176, 70],
  lande: [160, 160, 72],
  terre: [150, 118, 78],
  eau_basse: [98, 186, 214],
  eau: [79, 172, 211],
};
const SOLS_RVB = SOLS.map((s) => COULEURS_SOLS[s.nom] || [106, 129, 87]);
const cartes = new WeakMap();
function imageDeLIle(ile, fiches) {
  const g = cartes.get(ile);
  if (g && g.version === (ile.version ?? 0)) return g.image;
  const px = new Uint8ClampedArray(N * N * 4);
  for (let i = 0; i < N * N; i++) {
    let [r, v, b] = SOLS_RVB[ile.sol[i]];
    const f = ile.objet[i] ? fiches[ile.objet[i]] : null;
    if (f && f.genre === 'arbre') {
      r *= 0.55;
      v *= 0.7;
      b *= 0.55;
    } else if (f && f.genre === 'bloc') {
      r = v = b = 138;
    } else if (f && f.genre === 'buisson') {
      r *= 0.75;
      v *= 0.85;
      b *= 0.75;
    }
    px[i * 4] = r;
    px[i * 4 + 1] = v;
    px[i * 4 + 2] = b;
    px[i * 4 + 3] = 255;
  }
  const image = { l: N, h: N, px, ms: 0 };
  cartes.set(ile, { version: ile.version ?? 0, image });
  return image;
}

/**
 * Le sol de l'île `ile` (vivante : celle de la partie) pour la scène.
 * @param {object} ile
 * @param {string} graine
 * @param {number} taille MONDE.REGION
 */
export function solDeLIle(ile, graine, taille) {
  if (courant && courant.ile === ile) return courant.sol;
  if (courant) courant.fermer();
  courant = client(ile, String(graine), taille);
  return courant.sol;
}

function client(ile, graine, taille) {
  const ctx = contexteIle(ile, graine, taille);
  const regions = new Map(),
    file = [],
    abonnes = [],
    mesures = { elements: 0, regions: [], mode: 'direct' };
  let tache = null,
    fini = false,
    version = ile.version ?? 0;
  const P = planchesDeLIle();
  const recu = (r) => {
    regions.set(r.cle, r);
    mesures.regions.push(r.ms);
    for (const f of abonnes) f(r.cle);
  };
  const pas = () => {
    if (tache || fini || !file.length) return;
    tache = setTimeout(() => {
      tache = null;
      if (fini) return;
      const cle = file.shift();
      if (cle && !regions.has(cle)) {
        const [rx, ry] = cle.split(',').map(Number);
        recu(regionDeLIle(ctx, rx, ry));
      }
      pas();
    }, 0);
  };
  // l'île a changé : les régions faites qu'elle touche sont refaites tout de suite (la scène les repeint)
  const suivre = () => {
    if ((ile.version ?? 0) === version) return;
    version = ile.version ?? 0;
    for (const cle of regionsDeLaScene(regionsModifiees(ile), taille)) {
      if (!regions.has(cle)) continue;
      const [rx, ry] = cle.split(',').map(Number);
      recu(regionDeLIle(ctx, rx, ry));
    }
  };
  // l'aperçu : le biome d'une case tous les 8, le sol provisoire des régions pas encore faites
  const apercu = (() => {
    const p = 8,
      l = Math.ceil(N / p),
      biomes = new Uint8Array(l * l);
    const vers = BIOMES_ILE.map((b) => Math.max(0, BIOMES.indexOf(b)));
    for (let y = 0; y < l; y++)
      for (let x = 0; x < l; x++)
        biomes[y * l + x] = vers[SOL_BIOME[ile.sol[Math.min(N - 1, y * p + 4) * N + Math.min(N - 1, x * p + 4)]]];
    return { pas: p, l, h: l, biomes };
  })();
  const couleurs = BIOMES.map((b) => COULEURS_BIOMES[b] || '#6a8157');
  const sol = {
    ile: true,
    ile300: true,
    graine,
    ferme: ctx.cadre.FERME,
    tuiles: SOLS_MONDE,
    taille,
    biomes: BIOMES,
    sortes: SORTES,
    roches: SORTES_ROCHES,
    cultures: P.cultures.sortes,
    culturesTable: P.cultures.table,
    fruitiers: P.fruitiers.sortes,
    fruitiersTable: P.fruitiers.table,
    semisSortes: SEMIS.sortes,
    semisTable: SEMIS.table,
    regles: { ...RECOLTE.SORTES, ...Object.fromEntries(Object.entries(reglesDeLIle()).map(([k, e]) => [k, e.regle])) },
    idObjet: idObjetMonde,
    ouvertes: null,
    lieux: () => ({}),
    lieuxSortes: SORTES_LIEUX,
    coins: 0,
    // (pas d'animaux sauvages sur l'île, docs/ile-300.md : ceux de la ferme et la petite vie d'ambient-life.js seulement)
    faune: { especes: [], PRES: FAUNE.PRES, LOIN: FAUNE.LOIN, RAYON: FAUNE.RAYON },
    hameaux: () => [],
    hameauSortes: SORTES_HAMEAUX,
    hameauxStyles: HAMEAUX.STYLES,
    hameauEnclos: HAMEAUX.ENCLOS,
    portLanterne: null,
    portBac: (DATA.PORT && DATA.PORT.BAC) || null,
    region(rx, ry) {
      suivre();
      const cle = rx + ',' + ry,
        r = regions.get(cle);
      if (r) return r;
      if (!file.includes(cle)) {
        file.push(cle);
        pas();
      }
      return null;
    },
    quandRegion(f) {
      abonnes.push(f);
    },
    apercu: () => ({ apercu, couleurs }),
    // la carte du monde (js/ui/carte-monde.js) : une image de l'île, un point par case (la couleur de son sol, plus
    // sombre sous un arbre, grise sous une roche), refaite quand l'île a changé
    carte: () => imageDeLIle(ile, ctx.fiches),
    marchable(t) {
      if (!(t >= 0 && t < N * N)) return false;
      const reg = sol.region(Math.floor((t % N) / taille), Math.floor(t / N / taille));
      return !!reg && reg.marche[(Math.floor(t / N) - reg.cy0) * reg.cl + (t % N) - reg.cx0] === 1;
    },
    majChemins: () => false,
    majIle: suivre,
    mesures: () => mesures,
  };
  return {
    ile,
    sol,
    fermer() {
      fini = true;
      if (tache) clearTimeout(tache);
      abonnes.length = 0;
    },
  };
}
