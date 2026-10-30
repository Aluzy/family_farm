import { DATA } from './catalog.js';
import { mulberry32 } from './base.js';
import { fail } from './devices.js';
import { addItem, countItem, takeItem } from './inventory.js';
import { gainActionXp, unlockLevel } from './levels.js';
import { isUnlocked } from './campaign.js';
import { canAfford, spendEnergy, TIRED } from './stamina.js';
import { hasHoe, plotAtTile } from './crops.js';
import { casesDuTerrain, farmSeed, farmTerrain, regionsVues } from './terrain.js';
import { casesDeRegion } from './monde.js';
import { cutBushCases } from './outils.js';
import { accueillirAnimal, animalRefus } from './animals.js';
import { accueillirCheval, chevalRefus } from './cheval.js';
import { ajouterMeuble, meubleRefus } from './meubles.js';
import { noter } from './journal.js';

/* ---------- la ferme générée : ramasser à la main, l'Atelier ---------- */

// docs/carte-generee.md, étape 3. Sur la ferme générée seulement (une partie avec une graine :
// farmSeed) :
//   - chaque matin, des petites pierres et des morceaux de bois sont posés sur l'herbe de la
//     carte (DATA.ATELIER.RAMASSAGE : combien de chaque), à des places tirées d'après la graine
//     et le jour ; le personnage les ramasse à la main (geste « ramasser »), chacun donne son
//     objet (pierre, bois ; la fibre vient de la faux : outils.js scytheGrass). Les baies poussent sur les buissons
//     (RAMASSAGE.baies.buissons : la case est celle du milieu de leur pied) et se cueillent sans
//     énergie (gratuit) : même épuisé, on trouve de quoi manger. state.cueillette = { jour, pris: [ids] } :
//     ceux déjà ramassés aujourd'hui ;
//   - l'Atelier se construit avec des matériaux (ATELIER.CONSTRUCTION), sans pièces
//     (state.atelier = { construit, niveau }) ; ses recettes (ATELIER.RECETTES) transforment des
//     objets de l'inventaire (geste « fabriquer ») : planche, mur en pierre, porte, paillasse, les
//     outils (houe, hache, pioche, faux, canne à pêche) ; et, depuis que le Marché est
//     devenu la calèche (fiche 7c), ce qu'il vendait : les animaux qu'on attire (un nid garni, une
//     pierre à sel et du foin), le cheval (un licol et des friandises), les meubles, la ruche.

export function atelierConstruit(state) {
  return !!(state.atelier && state.atelier.construit);
}

/* ---------- ramasser à la main ---------- */

// Un nombre de 32 bits d'après une chaîne (FNV-1a).
function hache(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
  return h >>> 0;
}

// Les tuiles d'herbe labourable (« # ») de la ferme du terrain T, une fois par terrain.
const herbesDe = new WeakMap();
function herbes(T) {
  if (!herbesDe.has(T)) {
    const out = [];
    for (const t of casesDuTerrain(T)) if (T.LIGNES[Math.floor(t / T.LARGEUR)][t % T.LARGEUR] === '#') out.push(t);
    herbesDe.set(T, out);
  }
  return herbesDe.get(T);
}

// Celles de la région « rx,ry » (monde.js), hors de la ferme, une fois par terrain et par région.
const herbesRegionDe = new WeakMap();
function herbesRegion(T, cle) {
  if (!herbesRegionDe.has(T)) herbesRegionDe.set(T, new Map());
  const m = herbesRegionDe.get(T), F = T.FERME;
  if (!m.has(cle)) {
    const dansFerme = (c, r) => c >= F.X && r >= F.Y && c < F.X + F.LARGEUR && r < F.Y + F.HAUTEUR;
    m.set(cle, casesDeRegion(cle, T.LARGEUR, T.HAUTEUR).filter((t) => {
      const c = t % T.LARGEUR, r = Math.floor(t / T.LARGEUR);
      return !dansFerme(c, r) && T.LIGNES[r][c] === '#';
    }));
  }
  return m.get(cle);
}

// `nombre` places de `sorte` tirées parmi `libres` (suite `r`), sans deux sur la même tuile, tant
// que les places prises restent sous `limite`.
function tirer(sorte, def, nombre, libres, r, prises, out, limite) {
  for (let k = 0, essais = 0; k < nombre && essais < nombre * 20 && prises.size < limite; essais++) {
    const t = libres[Math.floor(r() * libres.length)];
    if (prises.has(t)) continue;
    prises.add(t);
    out.push({ id: sorte + ':' + t, sorte, objet: def.objet, case: t });
    k++;
  }
}

// Les places du jour `jour` : [{ id, sorte, objet, case, buisson? }] (id : « sorte:case »), toutes les
// sortes tirées dans la même suite, sans deux sur la même tuile. Gardées pour le dernier jour.
// La cueillette ne pousse que sur la ferme et dans les régions vues (regionsVues, terrain.js) :
// celles de la ferme d'abord (leur suite ne dépend que de la graine et du jour), puis chaque
// région vue hors de la ferme, avec sa propre suite et autant de places par case d'herbe que la
// ferme (une région découverte dans la journée ajoute ses places sans changer les autres). Une
// région que le joueur n'a pas vue n'en a pas.
let placesCle = null, placesListe = [];
function placesDuJour(state, jour) {
  const T = farmTerrain(state), graine = farmSeed(state), vues = regionsVues(state, T);
  const autres = vues ? [...vues].filter((k) => herbesRegion(T, k).length).sort() : [];
  const cle = graine + ':' + jour + ':' + autres.join(';');
  if (cle === placesCle) return placesListe;
  const libres = herbes(T), r = mulberry32(hache(graine + ':ramassage:' + jour));
  const prises = new Set(), out = [];
  for (const [sorte, def] of Object.entries(DATA.ATELIER.RAMASSAGE)) {
    if (def.buissons) {
      // RAMASSAGE.baies.nombre buissons en portent ce matin, tirés au hasard
      const B = (T.BUISSONS || []).slice();
      for (let k = 0; k < def.nombre && B.length; k++) {
        const [c0, r1, w, , taille] = B.splice(Math.floor(r() * B.length), 1)[0];
        const t = r1 * T.LARGEUR + c0 + Math.floor(w / 2);
        out.push({ id: sorte + ':' + t, sorte, objet: def.objet, case: t, buisson: true, taille: taille || 'petit' });
      }
      continue;
    }
    tirer(sorte, def, def.nombre, libres, r, prises, out, libres.length);
  }
  if (jour === 1) placesDepart(T, libres, r, prises, out);
  for (const k of autres) {
    const ici = herbesRegion(T, k), rk = mulberry32(hache(graine + ':ramassage:' + jour + ':' + k)), limite = prises.size + ici.length;
    for (const [sorte, def] of Object.entries(DATA.ATELIER.RAMASSAGE)) {
      if (!def.buissons) tirer(sorte, def, Math.round((def.nombre * ici.length) / Math.max(1, libres.length)), ici, rk, prises, out, limite);
    }
  }
  placesCle = cle;
  placesListe = out;
  return out;
}

// La tuile où le personnage apparaît dans une nouvelle partie : au-dessus du milieu de la Zone de
// culture (la porte du foyer, tant que rien n'est bâti : js/carte/ferme/chantier.js homeDoor).
export function caseDepart(T) {
  const Z = T.ZONES[1];
  return (Z.Y - 1) * T.LARGEUR + Z.X + Math.floor(Z.COLONNES / 2);
}

// Le premier jour : des pierres et du bois en plus autour de lui (DATA.ATELIER.RAMASSAGE_DEPART),
// sur l'herbe libre, hors de la Zone de culture.
function placesDepart(T, libres, r, prises, out) {
  const D = DATA.ATELIER.RAMASSAGE_DEPART;
  if (!D || !T.ZONES || !T.ZONES[1]) return;
  const W = T.LARGEUR, d0 = caseDepart(T), r0 = Math.floor(d0 / W), c0 = d0 % W;
  const Z = T.ZONES[1], zoneH = Math.ceil(DATA.POTAGER.CASES / Z.COLONNES);
  const dansZone = (r1, c1) => r1 >= Z.Y && r1 < Z.Y + zoneH && c1 >= Z.X && c1 < Z.X + Z.COLONNES;
  const proches = libres.filter((t) => {
    const r1 = Math.floor(t / W), c1 = t % W, d = Math.max(Math.abs(r1 - r0), Math.abs(c1 - c0));
    return d >= D.RAYON[0] && d <= D.RAYON[1] && !dansZone(r1, c1) && !prises.has(t);
  });
  for (const sorte of ['petite_pierre', 'morceau_bois']) {
    const def = DATA.ATELIER.RAMASSAGE[sorte];
    for (let k = 0; k < (D[sorte] || 0) && proches.length; k++) {
      const t = proches.splice(Math.floor(r() * proches.length), 1)[0];
      prises.add(t);
      out.push({ id: sorte + ':' + t, sorte, objet: def.objet, case: t });
    }
  }
}

function cueillette(state) {
  if (!state.cueillette || state.cueillette.jour !== state.day) state.cueillette = { jour: state.day, pris: [] };
  return state.cueillette;
}

// Ce qu'il y a à ramasser sur la carte aujourd'hui (pas encore pris, pas sous une terre
// labourée, pas sous un bloc posé ni sous un arbre planté, pas sur un buisson coupé) :
// [{ id, sorte, objet, case }]. Rien hors de la ferme générée.
export function ramassables(state) {
  const pris = state.cueillette && state.cueillette.jour === state.day ? state.cueillette.pris : [];
  const arbres = new Set(state.verger ? state.verger.arbres.map((t) => t.case) : []);
  const coupes = cutBushCases(state);
  return placesDuJour(state, state.day).filter((p) => !pris.includes(p.id) && !(p.buisson && coupes.has(p.case)) && !plotAtTile(state, p.case) && !(state.blocs && state.blocs[p.case]) && !(state.sols && state.sols[p.case]) && !arbres.has(p.case));
}

// Le personnage ramasse `id` : son objet entre dans l'inventaire.
export function ramasser(state, id) {
  const p = ramassables(state).find((q) => q.id === id);
  if (!p) return fail('Il n\'y a plus rien à ramasser ici.');
  // (les baies : selon la taille du buisson, RAMASSAGE.baies.parTaille)
  const def = DATA.ATELIER.RAMASSAGE[p.sorte], n = (def.parTaille && def.parTaille[p.taille]) || def.quantite || 1;
  if (!def.gratuit && !canAfford(state, 'ramasser')) return fail(TIRED);
  cueillette(state).pris.push(id);
  addItem(state, p.objet, n);
  noter('ramasse', { item: p.objet, n });
  if (!def.gratuit) spendEnergy(state, 'ramasser');
  gainActionXp(state, 'ramasser');
  return { ok: true, sorte: p.sorte, items: { [p.objet]: n } };
}

/* ---------- l'Atelier ---------- */

// Ce qui manque dans l'inventaire pour `besoin` ({ objet: qté }) : { objet: qté manquante }.
function manque(state, besoin) {
  const out = {};
  for (const [item, n] of Object.entries(besoin || {})) {
    const k = n - countItem(state, item);
    if (k > 0) out[item] = k;
  }
  return out;
}

function prendre(state, besoin) {
  for (const [item, n] of Object.entries(besoin || {})) takeItem(state, item, n);
}

// Peut-on construire l'Atelier ? { ok, raison, manque }
export function atelierStatus(state) {
  const A = DATA.ATELIER;
  if (atelierConstruit(state)) return { ok: false, raison: 'L\'Atelier est déjà construit.', manque: {} };
  const m = manque(state, A.CONSTRUCTION);
  return Object.keys(m).length ? { ok: false, raison: 'Il manque des matériaux.', manque: m } : { ok: true, manque: {} };
}

export function buildAtelier(state) {
  const st = atelierStatus(state);
  if (!st.ok) return fail(st.raison);
  prendre(state, DATA.ATELIER.CONSTRUCTION);
  state.atelier = { construit: true, niveau: DATA.ATELIER.NIVEAU };
  return { ok: true };
}

// L'outil d'une recette est-il déjà là ?
function aDejaOutil(state, outil) {
  return outil === 'houe' ? hasHoe(state) : !!(state.outils && state.outils[outil]);
}

// Peut-on fabriquer la recette `id` ? { ok, raison, manque }
// Une recette « debloque » (le bloc de silo) : à partir du niveau de cet élément (NIVEAUX).
export function recetteDebloquee(state, id) {
  const r = DATA.ATELIER.RECETTES[id];
  return !!r && (!r.debloque || isUnlocked(state, r.debloque));
}

export function craftStatus(state, id) {
  const r = DATA.ATELIER.RECETTES[id];
  if (!r) return { ok: false, raison: 'Recette inconnue.', manque: {} };
  if (!atelierConstruit(state)) return { ok: false, raison: 'Il faut d\'abord construire l\'Atelier.', manque: {} };
  if (r.outil && aDejaOutil(state, r.outil)) return { ok: false, raison: 'Tu as déjà cet outil.', manque: {} };
  if (!recetteDebloquee(state, id)) return { ok: false, raison: `Se débloque au niveau ${unlockLevel(r.debloque)}.`, manque: {} };
  // (ce qui doit trouver sa place : l'animal, le cheval, le meuble)
  const refus = r.animal ? animalRefus(state, r.animal) : r.cheval ? chevalRefus(state) : r.meuble ? meubleRefus(state, r.meuble) : null;
  if (refus) return { ok: false, raison: refus, manque: {} };
  const m = manque(state, r.entrees);
  if (Object.keys(m).length) return { ok: false, raison: 'Il manque des matériaux.', manque: m };
  if (!canAfford(state, 'fabriquer')) return { ok: false, raison: TIRED, manque: {} };
  return { ok: true, manque: {} };
}

// Fabrique la recette `id` à l'Atelier : ses entrées quittent l'inventaire, sa sortie y entre (ou
// l'outil est là ; l'animal attiré vient au Poulailler ou à l'Étable, le cheval à l'Écurie ; le meuble
// entre dans l'inventaire, à poser, et donne son bonheur à la famille).
export function craft(state, id) {
  const st = craftStatus(state, id);
  if (!st.ok) return fail(st.raison);
  const r = DATA.ATELIER.RECETTES[id];
  prendre(state, r.entrees);
  if (r.outil === 'houe') state.potager.houe = true;
  else if (r.outil) {
    if (!state.outils || typeof state.outils !== 'object') state.outils = { hache: false, pioche: false, canne: false, choisi: 'houe' };
    state.outils[r.outil] = true;
  }
  if (r.animal) accueillirAnimal(state, r.animal);
  if (r.cheval) accueillirCheval(state);
  const items = { ...(r.sortie || {}) };
  if (r.meuble) { ajouterMeuble(state, r.meuble); items['meuble_' + r.meuble] = 1; }
  for (const [item, n] of Object.entries(r.sortie || {})) addItem(state, item, n);
  noter('fabrique', { recette: id, items, outil: r.outil || null });
  spendEnergy(state, 'fabriquer');
  gainActionXp(state, 'fabriquer');
  return { ok: true, items, outil: r.outil || null, animal: r.animal || (r.cheval ? 'cheval' : null) };
}
