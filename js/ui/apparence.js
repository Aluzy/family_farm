/* ---------- Les apparences libres des membres de la famille ----------
   Chantier « couches », étape E6 (docs/personnage-couches.md). Un membre peut avoir une apparence à lui
   (member.apparence = { identite, tenue }, js/engine/family.js) au lieu d'un des personnages du catalogue :
   sa planche est assemblée dans la page (js/carte/planches.js, CartePlanches) d'après
   assets/personnages/couches.json et catalogue.json, chargés une fois, à la demande.

   chargerApparences(fait)        charge les deux fichiers (fait() une fois prêts) ;
   apparencesPretes()             sont-ils là ?
   apparenceDuCatalogue(n, enf.)  l'identité et la tenue du personnage n du catalogue (une copie : le départ
                                  d'une personnalisation) ;
   plancheApparence(app, enf.)    sa planche, en image (data: URL, gardée), et la case des yeux fermés
                                  (le clignement des portraits) : { url, dort }, ou null tant que rien n'est prêt ;
   portraitMembre(m)              de quoi dessiner le portrait d'un membre (persoHtml) : { n, enfant, propre }. */

import { memberApparence, memberPerso } from '../engine/family.js';

const fichier = (f) => {
  const v = window.FERME_ASSET_VERSIONS;
  return `assets/${f}${v && v[f] ? `?v=${v[f]}` : ''}`;
};
let donnees = null;
let promesse = null;
const ecouteurs = new Set();

export function apparencesPretes() {
  return !!donnees;
}

export function donneesApparence() {
  return donnees;
}

export function chargerApparences(fait) {
  if (donnees) return Promise.resolve(donnees);
  if (fait) ecouteurs.add(fait);
  if (!promesse) {
    promesse = Promise.all(['personnages/couches.json', 'personnages/catalogue.json'].map((f) => fetch(fichier(f)).then((r) => {
      if (!r.ok) throw new Error(`${f} : ${r.status}`);
      return r.json();
    }))).then(([C, K]) => {
      donnees = { C, K };
      const f = [...ecouteurs];
      ecouteurs.clear();
      f.forEach((g) => g());
      return donnees;
    }).catch((e) => {
      promesse = null;
      console.warn('[apparence] indisponible', e);
      return null;
    });
  }
  return promesse;
}

export function apparenceDuCatalogue(n, enfant) {
  const p = donnees && donnees.K.personnages[`${enfant ? 'enfant' : 'perso'}_${String(n).padStart(2, '0')}`];
  return p ? JSON.parse(JSON.stringify({ identite: p.identite, tenue: p.tenue })) : null;
}

const planches = new Map();
const PLANCHES_MAX = 40;

export function plancheApparence(apparence, enfant) {
  const CP = window.CartePlanches;
  if (!donnees || !CP || !apparence) return null;
  const cle = (enfant ? 'e' : 'a') + JSON.stringify(apparence);
  let r = planches.get(cle);
  if (r) return r;
  try {
    const A = CP.apparence(donnees.C, donnees.K, enfant ? 'enfant' : 'adulte', apparence.identite, apparence.tenue);
    const p = CP.assembler(donnees.C, A.def, A.palette);
    const cv = document.createElement('canvas');
    cv.width = p.largeur;
    cv.height = p.hauteur;
    cv.getContext('2d').putImageData(new ImageData(p.data, p.largeur, p.hauteur), 0, 0);
    r = { url: cv.toDataURL('image/png'), dort: donnees.C.cases.indexOf('dort_bas_0') };
  } catch (e) {
    console.warn('[apparence] planche impossible', e);
    return null;
  }
  planches.set(cle, r);
  if (planches.size > PLANCHES_MAX) planches.delete(planches.keys().next().value);
  return r;
}

// La planche d'une apparence (plancheApparence) ; tant que les données manquent : null, et la page est redessinée
// une fois qu'elles sont là (le portrait du personnage du catalogue d'ici là).
export function plancheAvecChargement(apparence, enfant) {
  if (!donnees) chargerApparences(() => import('./render.js').then((R) => R.refresh()));
  return plancheApparence(apparence, enfant);
}

export function portraitMembre(m) {
  const enfant = !!(m && m.enfant), n = memberPerso(m), app = memberApparence(m);
  if (!app) return { n, enfant, propre: null };
  return { n, enfant, propre: plancheAvecChargement(app, enfant) };
}
