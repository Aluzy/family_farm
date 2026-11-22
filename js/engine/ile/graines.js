/* ==========================================================================
   Les graines de l'île (docs/ile-300.md) : une graine pour chaque plante. Ce qui est coupé ne repousse pas tout
   seul ; le joueur replante. Chaque coupe (ramassage, cueillette) de la plante a ILE.GRAINES.CHANCE % de chances de
   donner sa graine (js/engine/monde-recolte.js butinFinal). Une graine se plante (son bloc, l'onglet Graines du mode
   Construire) n'importe où sauf sur l'eau et le sable (le nénuphar : seulement sur l'eau) : graine plantée, puis
   pousse au bout de NUITS[0] nuits, puis la plante au bout de NUITS[1] de plus (js/engine/ile/vie.js nuit).

   Les objets et les blocs des graines ne sont pas écrits dans data/ : ils sont faits ici, d'après le catalogue des
   espèces, et ajoutés à DATA (DATA.OBJETS, DATA.ATELIER.BLOCS, l'onglet DATA.ATELIER.CATEGORIES.graines) au premier
   import de ce module.
   ========================================================================== */

import { completerCatalogue, DATA } from '../catalog.js';
import { catalogue } from './catalogue.js';

const G = () => DATA.ILE.GRAINES;
const PREFIXE = 'graine_ile_';

/** L'objet (et le bloc) de la graine de la plante `id` (une fiche du catalogue). */
export const graineDe = (id) => PREFIXE + id;
/** Le numéro (dans le catalogue) de la plante `id`. */
export const numeroDe = (id, cat = catalogue()) => cat.parId.get(id).numero;

/** La plante d'une graine (son id de fiche), ou null. */
export const planteDe = (objet) =>
  typeof objet === 'string' && objet.startsWith(PREFIXE) ? objet.slice(PREFIXE.length) : null;

let faites = null;
/**
 * Les plantes qui ont une graine : leurs fiches (sans le décor ni les roches).
 * @returns {object[]}
 */
export function plantesAGraine(cat = catalogue()) {
  if (faites) return faites;
  const ex = new Set(G().EXCLUES);
  faites = cat.fiches.filter((f) => f.famille !== 'roche' && !ex.has(f.id));
  return faites;
}

// La fiche d'une pièce de la carte (son nom : une sorte de la végétation, une culture, un fruitier), ou null.
let parNom = null;
export function ficheDeLaPiece(nom, cat = catalogue()) {
  if (!parNom) {
    parNom = new Map();
    for (const f of plantesAGraine(cat)) {
      parNom.set(f.id, f);
      if (f.dessin && f.dessin.sorte && !parNom.has(f.dessin.sorte)) parNom.set(f.dessin.sorte, f);
    }
  }
  return parNom.get(nom) || null;
}

/** Les objets, les blocs et l'onglet des graines, ajoutés au catalogue `D` (DATA, ou un catalogue refait). */
export function ajouterLesGraines(D) {
  if (!D.ILE || !D.ILE.GRAINES || D.ATELIER.BLOCS[graineDe('feuillu')]) return;
  const blocs = [];
  for (const f of plantesAGraine()) {
    const id = graineDe(f.id),
      nom = G().NOMS[f.id] || `Graine de ${f.id.replace(/_/g, ' ')}`;
    D.OBJETS[id] = {
      nom,
      icone: G().ICONES[f.famille] || '🌱',
      prix: 1,
      mangeable: false,
      categorie: 'graine',
      rachetable: false,
      ile: true,
    };
    D.ATELIER.BLOCS[id] = { nom, objet: id, dehors: true, ileGraine: f.id };
    blocs.push(id);
  }
  D.ATELIER.CATEGORIES.graines = { nom: 'Graines', icone: '🌱', blocs };
}
completerCatalogue(ajouterLesGraines);
