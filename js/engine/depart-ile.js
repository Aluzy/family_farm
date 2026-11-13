/* ==========================================================================
   Le nouveau départ (le chantier « l'île à bâtir », fiche I7b ; docs/ile.md). Les réglages : VILLAGE.DEPART
   (data/village.json).

   - L'écran de départ (js/ui/depart.js) : « Seul » (familleSeule : un adulte tiré de la graine, sans compagnon) ou
     la famille composée comme avant ; puis le nom de l'île (nomIlePropose, tiré de la graine ; nommerIle le garde
     dans state.noms.ile, borné comme le nom de famille : DEPART.NOM_MIN à NOM_MAX signes ; la fiche I7g fera le
     module des noms autour de ce champ).
   - La terre vierge : la ferme n'a pas de chemin intérieur (village.js fermeVierge, monde.js genererMonde). Le seul
     chemin part de la porte de l'abri et va à la sortie de la ferme, où commence le tronçon du port (dehors.js) :
     des blocs de chemin du joueur, posés dans state.sols (tronconAbri), le long du couloir de l'ancien chemin.
   - Le premier jour sans visite : pas de visite de bienvenue (bienvenue.js : elle est « faite ») ni de scène
     d'arrivée du récit ; le plat que la visite offrait attend dans une boîte à nourriture posée dans l'abri.
   - Le didacticiel de l'île (didacticiel-ile.js) commence.
   commencerNouveauDepart est appelé par commencerObjectifs (objectifs.js) quand le chantier est allumé : l'accueil
   (js/ui/depart.js) et le joueur automatique (bot.js simulateGame) passent par là.
   ========================================================================== */

import { DATA } from './catalog.js';
import { mulberry32 } from './base.js';
import { fail } from './devices.js';
import { hache } from './ferme-generee.js';
import { farmSeed, farmTerrain } from './terrain.js';
import { genererMonde } from './monde.js';
import { niveauPort } from './port.js';
import { fermeVierge, nouveauDehors, villageActif } from './village.js';
import { chemin } from './chemin.js';
import { addItem } from './inventory.js';
import { blocAt, caseBatissable, enLot, poserBloc } from './blocs.js';
import { deposerBoite } from './repas.js';
import { platDuVisiteur } from './bienvenue.js';
import { commencerDidacticielIle } from './didacticiel-ile.js';

const D = () => DATA.VILLAGE.DEPART;
const rngDe = (state, cle) => mulberry32(hache(`${farmSeed(state) || 'ile'}:${cle}`));

/* ---------- l'écran de départ ---------- */

// Le nom d'île proposé (un de NOMS_ILE, tiré de la graine).
export function nomIlePropose(state) {
  const L = D().NOMS_ILE;
  return L[Math.floor(rngDe(state, 'nom-ile')() * L.length)] || L[0];
}

// Le nom de l'île de la partie, ou '' (une partie d'avant, ou le chantier éteint).
export function nomIle(state) {
  const n = state && state.noms && state.noms.ile;
  return typeof n === 'string' ? n : '';
}

// Le nom de l'île, choisi à l'accueil : nettoyé (les espaces), borné comme le nom de famille.
export function nommerIle(state, nom) {
  const P = DATA.DEPART, n = String(nom || '').trim().replace(/\s+/g, ' ');
  if (n.length < P.NOM_MIN || n.length > P.NOM_MAX) return fail(`Le nom de l'île fait de ${P.NOM_MIN} à ${P.NOM_MAX} signes.`);
  state.noms = { ...(state.noms && typeof state.noms === 'object' && !Array.isArray(state.noms) ? state.noms : {}), ile: n };
  return { ok: true, nom: n };
}

// « Seul » : la famille d'un seul adulte, sans compagnon ni enfant ni animal, tirée de la graine (un genre, un
// personnage des villageois de ce genre, un prénom), au nom de famille proposé (DEPART.NOM). → le choix que
// depart.js composeFamily attend.
export function familleSeule(state) {
  const r = rngDe(state, 'seul'), H = DATA.HABITANTS;
  const genre = r() < 0.5 ? 'f' : 'm';
  const un = (l, d) => (Array.isArray(l) && l.length ? l[Math.floor(r() * l.length)] : d);
  const max = DATA.FAMILLE.PROFIL.PERSOS;
  const persos = ((H.PERSOS && H.PERSOS.adulte && H.PERSOS.adulte[genre]) || []).filter((n) => Number.isInteger(n) && n >= 1 && n <= max);
  const prenoms = ((H.PRENOMS && H.PRENOMS[genre]) || []).filter((p) => typeof p === 'string' && p.length >= 1 && p.length <= DATA.FAMILLE.PROFIL.PRENOM_MAX);
  return { perso: un(persos, 1), prenom: un(prenoms, genre === 'f' ? 'Jeanne' : 'Jules'), nom: DATA.DEPART.NOM, compagnon: null, enfants: [], animaux: [] };
}

/* ---------- le chemin de l'abri à la sortie ---------- */

// Les cases du chemin de l'abri (la case devant sa porte) à la sortie de la ferme (ses trois rangées, au bord est),
// sur une terre vierge : un tracé (chemin.js) sur l'herbe où l'on bâtit, qui suit le couloir de l'ancien chemin (ses
// coins dans le monde d'avant, monde.js : un pas hors de lui coûte HORS_COULOIR), élargi à LARGEUR cases (la case,
// sa droite, le dessous), à trois rangées sur les SORTIE dernières colonnes (le raccord du tronçon du port). → [cases],
// [] sans abri ou sans tracé.
export function tronconAbri(state) {
  const a = state.abriDepart, T = farmTerrain(state), F = T.FERME, M = T.MONDE;
  if (!a || !Number.isInteger(a.porte) || !F || !M || !M.cadre || !Number.isInteger(M.cadre.SORTIE)) return [];
  const W = T.LARGEUR, H = T.HAUTEUR, V = W + 1, sortie = M.cadre.SORTIE - 1;
  const avant = genererMonde(farmSeed(state), niveauPort(state)).terrain.SOMMETS;
  // (les cases de la ferme où l'on bâtit, relevées une fois : enLot)
  const abri = new Set([...a.murs, a.porte, ...a.sols]), libres = new Set();
  enLot(state, () => {
    for (let r = F.Y + 1; r < F.Y + F.HAUTEUR - 1; r++) for (let c = F.X; c < F.X + F.LARGEUR; c++) { const i = r * W + c; if (!abri.has(i) && caseBatissable(state, i, { herbe: true })) libres.add(i); }
  });
  const libre = (i) => libres.has(i);
  const couloir = (i) => { const c = i % W, r = Math.floor(i / W); return avant[r * V + c] === 1 || avant[r * V + c + 1] === 1 || avant[(r + 1) * V + c] === 1 || avant[(r + 1) * V + c + 1] === 1; };
  const herbes = T.HERBES || {};
  const cout = (i) => (couloir(i) ? 1 : D().HORS_COULOIR) + (herbes[i] ? 2 : 0);
  const depart = a.porte + W;
  const pas = chemin({ cols: W, rows: H, libre, cout }, depart, sortie);
  if (!pas) return [];
  const out = new Set(), larg = Math.max(1, D().LARGEUR | 0), fin = F.X + F.LARGEUR - D().SORTIE;
  for (const t of pas) {
    const c = t % W;
    const autour = c >= fin ? [-W, 0, W] : [];
    if (c < fin) for (let dr = 0; dr < larg; dr++) for (let dc = 0; dc < larg; dc++) autour.push(dr * W + dc);
    for (const d of autour) if (libre(t + d) || t + d === depart) out.add(t + d);
  }
  // (les trois rangées de la sortie, jusqu'au bord)
  for (const d of [-W, 0, W]) if (libre(sortie + d)) out.add(sortie + d);
  return [...out].sort((x, y) => x - y);
}

// Pose le chemin de l'abri à la sortie (des blocs de chemin du joueur : state.sols, comme s'il les avait posés, sans
// rien coûter). → le nombre de cases posées.
export function poserTronconAbri(state) {
  const cases = tronconAbri(state);
  if (!cases.length) return 0;
  if (!state.sols || typeof state.sols !== 'object') state.sols = {};
  let n = 0;
  for (const t of cases) if (!state.sols[t] && !blocAt(state, t)) { state.sols[t] = 'chemin'; n++; }
  return n;
}

/* ---------- le premier jour sans visite ---------- */

// Le plat de la visite de bienvenue, dans une boîte à nourriture posée dans l'abri (la rangée du bas, au fond à
// droite : le four et la cuisinière gardent leur place à gauche, la case derrière la porte reste le passage). La
// visite est notée faite, la scène d'arrivée du récit aussi (elle n'a pas lieu). → le plat.
function platDansLAbri(state) {
  const plat = platDuVisiteur(null);
  state.bienvenue = { etat: 'faite', qui: null, plat, remis: null, jour: state.day };
  if (state.recit && typeof state.recit === 'object') {
    if (!state.recit.dites || typeof state.recit.dites !== 'object') state.recit.dites = {};
    state.recit.dites.arrivee = state.day;
  }
  const a = state.abriDepart;
  if (!a || !Array.isArray(a.sols) || !plat) return plat;
  const W = farmTerrain(state).LARGEUR, P = DATA.DIDACTICIEL.ABRI;
  const bas = a.sols.filter((t) => Math.floor(t / W) === a.r + P.PROFONDEUR).sort((x, y) => x - y);
  const place = [...bas].reverse().find((t) => t !== a.porte - W && !blocAt(state, t));
  if (place === undefined) { addItem(state, plat, 1); return plat; }
  addItem(state, 'boite_nourriture', 1);
  const r = poserBloc(state, 'boite_nourriture', place);
  addItem(state, plat, 1);
  if (r.ok) deposerBoite(state, plat, 1);
  return plat;
}

/* ---------- la partie commence ---------- */

// Une partie neuve du chantier commence (après l'abri : objectifs.js commencerObjectifs) : le nom de l'île (proposé
// s'il n'est pas choisi), ses pièces de départ (DEPART.PIECES, à la place de DEPART.PIECES_SAUVAGE), le chemin de l'abri à la sortie sur une terre vierge, le plat dans l'abri, le didacticiel
// de l'île. Une fois par partie (state.didacticielIle le dit). → { ok, chemin (cases posées), plat }.
export function commencerNouveauDepart(state) {
  if (!villageActif(state)) return fail('Le chantier est éteint.');
  if (state.didacticielIle) return fail('Le nouveau départ est déjà fait.');
  if (!nomIle(state)) nommerIle(state, nomIlePropose(state));
  // (les pièces de départ de l'île : la première vente au port vient plus tard et plus petite qu'à la calèche)
  if (Number.isInteger(D().PIECES) && D().PIECES >= 0) state.pieces = D().PIECES;
  // (la terre vierge : son chemin peint s'efface, l'abri déjà posé à côté de lui ; le chemin du joueur le remplace)
  if (!state.dehors || typeof state.dehors !== 'object') state.dehors = nouveauDehors();
  state.dehors.ferme = 'vierge';
  const n = fermeVierge(state) ? poserTronconAbri(state) : 0;
  const plat = platDansLAbri(state);
  commencerDidacticielIle(state);
  return { ok: true, chemin: n, plat };
}
