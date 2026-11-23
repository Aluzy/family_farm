/* ==========================================================================
   Les graines de l'île (docs/ile-300.md) : ce qui est coupé ne repousse pas tout seul, le joueur replante. Réglages :
   ILE.GRAINES (data/ile.json).

   Ce que donne une plante coupée (ramassée, cueillie, fauchée), une fois sur CHANCE : sa graine, au sol comme le bois
   (js/engine/monde-recolte.js butinFinal ; l'herbe haute : js/engine/outils.js) :
   - le feuillu, le gland ; les conifères, la pomme de pin (ARBRES : les graines d'avant) ;
   - les autres arbres, les fleurs, les fruitiers : chacun sa graine (graine_ile_<plante>) ;
   - les buissons, les herbes (l'herbe haute comprise), les champignons : une graine (des spores) pour la famille ;
   - une culture sauvage : sa graine du potager.
   Une graine se plante depuis l'Inventaire (« Planter » : js/engine/plantation.js), ni sur l'eau ni sur le sable :
   graine plantée, pousse, puis la plante (js/engine/ile/vie.js planterGraine, nuit). Celle d'une famille (et la pomme
   de pin) donne une espèce au hasard : du biome de la case, de son sol, ou n'importe laquelle (FAMILLES, GROUPES).

   Les objets des graines propres et des familles, et un bloc par graine (le geste « Planter » pose un bloc qui ne
   reste pas un bloc), ne sont pas écrits dans data/ : ils sont faits ici d'après le catalogue des espèces et ajoutés
   au catalogue du jeu (js/engine/catalog.js completerCatalogue).
   ========================================================================== */

import { completerCatalogue, DATA } from '../catalog.js';
import { catalogue } from './catalogue.js';
import { hacher } from './hasard.js';
import { BIOMES, SOL_BIOME, SOLS } from './reglages.js';

const G = () => DATA.ILE.GRAINES;
const PREFIXE = 'graine_ile_';
/** La plante « herbe haute » d'une graine d'herbe (elle n'est pas dans le catalogue : js/engine/ile/herbes.js). */
export const HERBE_HAUTE = 'herbe_haute';

/** Le numéro (dans le catalogue) de la plante `id`. */
export const numeroDe = (id, cat = catalogue()) => cat.parId.get(id).numero;

// Les plantes (ni décor ni roche).
const plantes = (cat) => cat.fiches.filter((f) => f.famille !== 'roche' && !G().EXCLUES.includes(f.id));

/**
 * La graine que donne la plante `f` (une fiche du catalogue) : l'objet du jeu, ou null.
 * @param {object} f
 */
export function semenceDe(f) {
  const g = G();
  if (!f || f.famille === 'roche' || g.EXCLUES.includes(f.id)) return null;
  if (g.ARBRES[f.id]) return g.ARBRES[f.id];
  if (g.PROPRES.includes(f.famille)) return PREFIXE + f.id;
  if (g.FAMILLES[f.famille]) return g.FAMILLES[f.famille].objet;
  if (f.famille === 'culture') {
    const c = (f.cultures || [])[0],
      def = c && DATA.CULTURES[c];
    return def && def.graines && DATA.OBJETS[def.graines.item] ? def.graines.item : null;
  }
  return null;
}

let plan = null;
/**
 * Ce que donne chaque graine plantée sur l'île : { objet: { plantes: [id…], choix, herbeHaute, sols } } (sols : sur ce
 * sol, cette plante-là, avant le choix ; le gland dans une clairière : l'arbre clair).
 */
export function aPlanter(cat = catalogue()) {
  if (plan) return plan;
  const g = G();
  plan = {};
  for (const [objet, v] of Object.entries(g.GROUPES))
    plan[objet] = { plantes: v.plantes, choix: v.choix, sols: v.sols || null };
  for (const f of plantes(cat)) {
    if (!g.ARBRES[f.id] && g.PROPRES.includes(f.famille)) plan[PREFIXE + f.id] = { plantes: [f.id], choix: 'tous' };
  }
  for (const [famille, v] of Object.entries(g.FAMILLES)) {
    const liste = plantes(cat)
      .filter((f) => f.famille === famille)
      .map((f) => f.id);
    plan[v.objet] = { plantes: liste, choix: v.choix, herbeHaute: !!v.herbeHaute };
  }
  return plan;
}

/** L'objet est-il une graine qui se plante sur l'île ? */
export const graineDeLIle = (objet) => !!aPlanter()[objet];

/**
 * La plante qui sort de la graine `objet` semée en `i` (le jour `jour`, pour le hasard) : un id de fiche, HERBE_HAUTE,
 * ou null (pas une graine de l'île).
 * @param {object} ile
 * @param {number} i
 * @param {string} objet
 * @param {number} jour
 */
export function planteSemee(ile, i, objet, jour, cat = catalogue()) {
  const p = aPlanter(cat)[objet];
  if (!p) return null;
  const sol = SOLS[ile.sol[i]].nom,
    biome = BIOMES[SOL_BIOME[ile.sol[i]]];
  if (p.sols && p.sols[sol] && cat.parId.get(p.sols[sol])) return p.sols[sol];
  const biomeDe = (nom) => BIOMES[SOL_BIOME[SOLS.findIndex((s) => s.nom === nom)]];
  const ici = (id) => {
    const f = cat.parId.get(id);
    if (!f) return false;
    if (p.choix === 'sol') return f.ou.some((o) => o.sol === sol);
    if (p.choix === 'biome') return f.ou.some((o) => biomeDe(o.sol) === biome);
    return true;
  };
  let choix = p.plantes.filter(ici);
  if (p.herbeHaute) choix = [...choix, HERBE_HAUTE];
  // (aucune espèce de la famille ne pousse ici : n'importe laquelle)
  if (!choix.length) choix = p.plantes;
  return choix[hacher(`${ile.graine}:semis:${i}:${jour}:${objet}`) % choix.length];
}

/**
 * Les objets des graines de l'île et leurs blocs, ajoutés au catalogue `D` (DATA, ou un catalogue refait).
 * @param {object} D
 */
export function ajouterLesGraines(D) {
  if (!D.ILE || !D.ILE.GRAINES || D.ATELIER.BLOCS.ile_graine_buisson) return;
  const g = D.ILE.GRAINES,
    cat = catalogue();
  const objet = (nom, icone) => ({
    nom,
    icone,
    prix: 1,
    mangeable: false,
    categorie: 'graine',
    rachetable: false,
    ile: true,
  });
  for (const f of plantes(cat)) {
    if (!g.ARBRES[f.id] && g.PROPRES.includes(f.famille))
      D.OBJETS[PREFIXE + f.id] = objet(g.NOMS[f.id], g.ICONES[f.famille]);
  }
  for (const [id, o] of Object.entries(g.OBJETS)) D.OBJETS[id] = objet(o.nom, o.icone);
  // (un bloc par graine : « Planter » depuis l'Inventaire pose un bloc qui ne reste pas un bloc, js/engine/blocs.js ;
  // les graines d'avant, le gland et la pomme de pin, ont déjà le leur)
  for (const id of Object.keys(aPlanter(cat))) {
    if (Object.values(D.ATELIER.BLOCS).some((b) => b.objet === id)) continue;
    D.ATELIER.BLOCS['ile_' + id] = { nom: D.OBJETS[id].nom, objet: id, dehors: true, ileGraine: id };
  }
}
completerCatalogue(ajouterLesGraines);

// La fiche d'une pièce de la carte (son nom : une sorte de la végétation, une culture, un fruitier), ou null.
let parNom = null;
export function ficheDeLaPiece(nom, cat = catalogue()) {
  if (!parNom) {
    parNom = new Map();
    for (const f of plantes(cat)) {
      parNom.set(f.id, f);
      if (f.dessin && f.dessin.sorte && !parNom.has(f.dessin.sorte)) parNom.set(f.dessin.sorte, f);
    }
  }
  return parNom.get(nom) || null;
}
