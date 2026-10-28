import { DATA, ingredientOptions, recipeOutput, recipeOutputQty } from './catalog.js';
import { EPS } from './base.js';
import { fail } from './devices.js';
import { absoluteHours, clockHours, nightActive } from './clock.js';
import { addItem } from './inventory.js';
import { countWithSilo, takeWithSilo } from './animals.js';
import { isMature, noteWateredPlots, waterCost } from './crops.js';
import { aCruche, crucheCapacite } from './cruche.js';
import { aiderMembre, boitePosee, deposerBoite, jaugeFamille, jaugeMembre } from './repas.js';
import { moveToFridge } from './fridge.js';
import { ramassables, caseDepart } from './atelier.js';
import { recipeUnlocked } from './kitchen.js';
import { farmTerrain } from './terrain.js';
import { aidant } from './ramassage.js';
import { noter } from './journal.js';
import { ETAPES } from './didacticiel.js';
import { enExpedition } from './equipement.js';

/* ---------- fiche 19 : le compagnon aide à la ferme ----------
   Le compagnon du personnage principal (l'autre adulte du foyer : aidant, ramassage.js), en plus
   des bêtes, prend de lui-même trois initiatives, selon l'heure, sa jauge de faim et ce qui manque
   (DATA.COMPAGNON, data/general.json) :

     - arroser quelques légumes de la Zone de culture qui ont soif (ARROSER.PAR_FOIS par sortie,
       ARROSER.PAR_JOUR par jour) : avec l'eau du réservoir s'il en a assez, sinon avec sa cruche
       à lui (state.compagnon.ml ; il faut une cruche dans la maison, aCruche), qu'il va remplir
       au puits posé quand elle n'a plus assez d'eau (la tâche « puits:<case> ») ;
     - faire à manger : quand la famille a faim (jaugeFamille sous CUISINER.FAIM_FAMILLE) et que
       la cuisinière est bâtie, il prépare à la cuisinière la première recette de
       CUISINER.RECETTES débloquée dont les ingrédients sont là (pris dans l'inventaire et le Silo,
       l'eau dans le réservoir) ; le plat va au réfrigérateur s'il est construit, sinon dans la
       boîte à nourriture posée, sinon dans l'inventaire ;
     - ramasser un morceau de bois ou une petite pierre (RAMASSER.SORTES, dans cet ordre) parmi
       ceux que le matin a posés sur l'herbe (atelier.js ramassables), à moins de RAMASSER.RAYON
       cases de la maison ; il entre dans l'inventaire.

   Chaque action lui coûte sa faim (FAIM points, aiderMembre : moins avec son tablier) ; il n'en
   prend aucune sous FAIM_MIN de jauge, ni hors des HEURES (jamais après FAMILLE.HORAIRE.FIN_TRAVAIL_ADULTES,
   19 h : finAide), ni la nuit. Il cuisine à la cuisinière, sans repas à table : chacun mange le plat
   quand il a faim (repas.js). Entre deux sorties d'une
   même action, ECART_H heures de jeu ; au plus PAR_JOUR par jour : il aide, il ne joue pas à la
   place du joueur (ni énergie, ni expérience, ni objectif de chapitre du personnage), et attend que
   le didacticiel de la ferme soit passé (le joueur y apprend à ramasser et à arroser). Une option
   (state.compagnon.aide, laisserAider) le laisse faire ou non ; les bêtes (aideAFaire) n'en
   dépendent pas.

   Les tâches sont des lieux, comme celles des bêtes : « arroser:<case> », « puits:<case> »,
   « cuisiner », « ramasser:<id> » (tachesCompagnon) ; sur la carte, il y va et fait son geste
   (js/famille-ferme.js), puis le jeu fait le travail (faireCompagnon). Sans la carte (une autre
   carte, pas de carte) ou pendant une absence (offline.js), le moteur les fait d'un coup
   (journeeCompagnon), sans dessin. Ce qu'il a fait est noté au journal (« compagnon » :
   { id, action, items, n }) : la page le dit dans une notification.

   state.compagnon = { aide, jour, arroser, cuisiner, ramasser (faits ce jour-là), serie
   (plantes arrosées dans la sortie en cours), prochain: { action: heure absolue }, ml (sa cruche),
   derniere (la case de la dernière plante arrosée : il continue par la plus proche), garde (le récit, lot 8 :
   ce qu'il a fait pendant que le joueur explorait, noterGarde) }. Le champ
   n'existe pas dans une sauvegarde d'avant : reparerPartie (state.js) le remet tel qu'une partie
   neuve l'a, sans changer le format. */

const C = () => DATA.COMPAGNON;
export const ACTIONS_COMPAGNON = ['arroser', 'cuisiner', 'ramasser'];

export function nouveauCompagnon() {
  return { aide: true, jour: 0, arroser: 0, cuisiner: 0, ramasser: 0, serie: 0, prochain: { arroser: 0, cuisiner: 0, ramasser: 0 }, ml: 0, derniere: null };
}

// L'état du compagnon (créé s'il manque ; les compteurs repartent à zéro chaque jour).
export function etatCompagnon(state) {
  let c = state.compagnon;
  if (!c || typeof c !== 'object' || Array.isArray(c)) c = state.compagnon = nouveauCompagnon();
  if (!c.prochain || typeof c.prochain !== 'object') c.prochain = { arroser: 0, cuisiner: 0, ramasser: 0 };
  if (c.jour !== state.day) {
    c.jour = state.day;
    for (const a of ACTIONS_COMPAGNON) c[a] = 0;
    c.serie = 0;
  }
  return c;
}

// L'option : le laisser prendre ses initiatives (vrai par défaut).
export function compagnonAide(state) {
  return !(state.compagnon && state.compagnon.aide === false);
}
export function laisserAider(state, oui) {
  etatCompagnon(state).aide = !!oui;
  return { ok: true, aide: !!oui };
}

// Ce qu'il a fait aujourd'hui : { arroser, cuisiner, ramasser }.
export function faitsCompagnon(state) {
  const c = etatCompagnon(state);
  return { arroser: c.arroser, cuisiner: c.cuisiner, ramasser: c.ramasser };
}

// L'eau de sa cruche (ml).
export function eauCompagnon(state) {
  return Math.max(0, Math.min(crucheCapacite(), Number(etatCompagnon(state).ml) || 0));
}

// La fin de sa plage d'aide : HEURES[1], et jamais après la fin du travail des adultes
// (FAMILLE.HORAIRE.FIN_TRAVAIL_ADULTES, 19 h : ensuite, il flâne près de la maison).
export function finAide() {
  const H = DATA.FAMILLE.HORAIRE;
  return Math.min(C().HEURES[1], H && Number.isFinite(H.FIN_TRAVAIL_ADULTES) ? H.FIN_TRAVAIL_ADULTES : 24);
}

// Peut-il prendre une initiative maintenant ? null (oui), ou la raison : 'seul' (pas de second
// adulte), 'non' (l'option), 'didacticiel' (le joueur apprend encore la ferme : ramasser, cultiver,
// arroser ; il le laisse faire), 'heure' (la nuit, hors des HEURES), 'faim' (sa jauge sous FAIM_MIN).
export function compagnonEmpeche(state) {
  const m = aidant(state);
  if (!m) return 'seul';
  if (!compagnonAide(state)) return 'non';
  const d = state.didacticiel;
  if (d && !d.fini && (Number(d.etape) || 0) < ETAPES.indexOf('carte')) return 'didacticiel';
  const h = clockHours(state);
  if (nightActive(state) || h < C().HEURES[0] || h >= finAide()) return 'heure';
  if (jaugeMembre(m) < C().FAIM_MIN) return 'faim';
  return null;
}

// L'action `a` est-elle permise (sa limite du jour, son écart depuis la dernière sortie) ?
function permise(state, a) {
  const c = etatCompagnon(state), R = C()[a.toUpperCase()];
  return c[a] < R.PAR_JOUR && absoluteHours(state) + EPS >= (Number(c.prochain[a]) || 0);
}

/* -- arroser -- */

const W = (state) => farmTerrain(state).LARGEUR;
function distCases(state, a, b) {
  const w = W(state);
  return Math.max(Math.abs((a % w) - (b % w)), Math.abs(Math.floor(a / w) - Math.floor(b / w)));
}

// Les légumes de la Zone de culture qui ont soif (plantés, pas arrosés, pas mûrs), la plus proche
// de la dernière arrosée d'abord (sinon de l'entrée de la ferme).
export function plantesASoif(state) {
  const c = etatCompagnon(state);
  const ref = Number.isInteger(c.derniere) ? c.derniere : caseDepart(farmTerrain(state));
  return state.potager.parcelles
    .filter((p) => p.culture && !p.arrose && !isMature(p) && Number.isInteger(p.case))
    .sort((a, b) => distCases(state, a.case, ref) - distCases(state, b.case, ref) || a.case - b.case);
}

// D'où vient l'eau de la plante `p` : 'reservoir', 'cruche' (la sienne), 'puits' (il doit d'abord
// remplir sa cruche) ou null (pas d'eau du tout).
function sourceEau(state, p) {
  const ml = waterCost(state, p) * 1000;
  if (state.eauMl >= ml) return 'reservoir';
  if (!aCruche(state) || ml > crucheCapacite()) return null;
  if (eauCompagnon(state) >= ml) return 'cruche';
  return puitsDuCompagnon(state) !== null ? 'puits' : null;
}

function puitsDuCompagnon(state) {
  const k = Object.entries(state.blocs || {}).find(([, s]) => s === 'puits');
  return k ? Number(k[0]) : null;
}

/* -- cuisiner -- */

// La cuisinière est-elle là ?
function cuisiniere(state) {
  return !!(state.stations && state.stations.cuisine && state.stations.cuisine.construit);
}

// Ce qu'il prendrait pour la recette `id` : [{ item, qte } | { eau }], ou null s'il manque quelque chose.
function ingredients(state, id) {
  const r = DATA.RECETTES[id];
  if (!r || r.station !== 'cuisine' || !recipeUnlocked(state, id)) return null;
  const out = [];
  for (const ing of r.ingredients) {
    const item = ingredientOptions(ing).find((it) => countWithSilo(state, it) + EPS >= ing.qte);
    if (!item) return null;
    out.push({ item, qte: ing.qte });
  }
  if (r.eau) {
    if (state.eauMl < r.eau * 1000) return null;
    out.push({ eau: r.eau });
  }
  return out;
}

// La recette qu'il ferait maintenant (la première de CUISINER.RECETTES possible), ou null.
export function recetteCompagnon(state) {
  return C().CUISINER.RECETTES.find((id) => ingredients(state, id)) || null;
}

// La famille a-t-elle faim (sa jauge moyenne sous CUISINER.FAIM_FAMILLE) ?
export function familleAFaim(state) {
  return jaugeFamille(state) < C().CUISINER.FAIM_FAMILLE;
}

/* -- ramasser -- */

// Le bois et les pierres posés ce matin près de la maison, ceux de la première sorte de
// RAMASSER.SORTES d'abord, puis les plus proches.
export function aRamasserCompagnon(state) {
  const R = C().RAMASSER, T = farmTerrain(state);
  const ref = caseDepart(T);
  return ramassables(state)
    .filter((p) => R.SORTES.includes(p.sorte) && distCases(state, p.case, ref) <= R.RAYON)
    .sort((a, b) => R.SORTES.indexOf(a.sorte) - R.SORTES.indexOf(b.sorte) || distCases(state, a.case, ref) - distCases(state, b.case, ref));
}

/* -- les tâches -- */

// Ses tâches du moment, dans l'ordre où il les ferait : faire à manger (la famille a faim),
// arroser (ou d'abord remplir sa cruche au puits), ramasser. Une seule de chaque sorte (la
// carte y va, puis redemande). [] s'il ne peut pas (compagnonEmpeche).
export function tachesCompagnon(state) {
  if (compagnonEmpeche(state)) return [];
  const out = [];
  if (permise(state, 'cuisiner') && cuisiniere(state) && familleAFaim(state) && recetteCompagnon(state)) out.push('cuisiner');
  if (permise(state, 'arroser')) {
    const p = plantesASoif(state).find((q) => sourceEau(state, q));
    if (p) out.push(sourceEau(state, p) === 'puits' ? `puits:${puitsDuCompagnon(state)}` : `arroser:${p.case}`);
  }
  if (permise(state, 'ramasser')) {
    const p = aRamasserCompagnon(state)[0];
    if (p) out.push(`ramasser:${p.id}`);
  }
  return out;
}

// Une tâche du compagnon (« arroser:… », « puits:… », « cuisiner », « ramasser:… ») ?
export function estTacheCompagnon(lieu) {
  const s = String(lieu);
  return s === 'cuisiner' || /^(arroser|puits|ramasser):/.test(s);
}

// Une sortie de l'action `a` est faite : son compte, sa faim, l'écart jusqu'à la prochaine.
function compter(state, a, fin = true) {
  const c = etatCompagnon(state), m = aidant(state);
  c[a] += 1;
  noterGarde(state, a);
  aiderMembre(state, m.id, C()[a.toUpperCase()].FAIM);
  if (fin) c.prochain[a] = absoluteHours(state) + C()[a.toUpperCase()].ECART_H;
}

function dire(state, action, items, extra = {}) {
  const m = aidant(state);
  noter('compagnon', { id: m.id, action, items, ...extra });
}

// Il fait la tâche `lieu` (il y est : la carte l'y a mené). Renvoie { ok, action, items } ou
// { ok: false, error }.
export function faireCompagnon(state, lieu) {
  const s = String(lieu);
  const empeche = compagnonEmpeche(state);
  if (empeche) return fail(empeche === 'seul' ? 'Il faut un second adulte dans le foyer.' : 'Il ne peut pas aider maintenant.');
  const c = etatCompagnon(state);
  const k = s.indexOf(':'), sorte = k < 0 ? s : s.slice(0, k), ref = k < 0 ? '' : s.slice(k + 1);
  if (sorte === 'puits') {
    const t = Number(ref);
    if (!Number.isInteger(t) || (state.blocs || {})[t] !== 'puits') return fail('Il n\'y a pas de puits ici.');
    if (!aCruche(state)) return fail('Il faut une cruche.');
    c.ml = crucheCapacite();
    return { ok: true, action: 'puiser', items: {} };
  }
  if (sorte === 'arroser') {
    if (!permise(state, 'arroser')) return fail('Il a assez arrosé pour l\'instant.');
    const p = state.potager.parcelles.find((q) => q.case === Number(ref));
    if (!p || !p.culture || p.arrose || isMature(p)) return fail('Cette plante n\'a pas soif.');
    const src = sourceEau(state, p), ml = waterCost(state, p) * 1000;
    if (src === 'reservoir') state.eauMl -= ml;
    else if (src === 'cruche') c.ml = eauCompagnon(state) - ml;
    else return fail(src === 'puits' ? 'Sa cruche est vide : il va au puits.' : 'Pas d\'eau pour arroser.');
    p.arrose = true;
    p.arroseH = absoluteHours(state);   // elle gagne son stade POUSSE_HEURES heures plus tard
    noteWateredPlots(state);
    c.derniere = p.case;
    c.serie += 1;
    // (la sortie finit après PAR_FOIS plantes, ou quand plus rien n'a soif)
    const fin = c.serie >= C().ARROSER.PAR_FOIS || c.arroser + 1 >= C().ARROSER.PAR_JOUR || !plantesASoif(state).length;
    if (fin) c.serie = 0;
    compter(state, 'arroser', fin);
    dire(state, 'arroser', {}, { culture: p.culture, n: 1 });
    return { ok: true, action: 'arroser', items: { arrose: 1 }, culture: p.culture };
  }
  if (sorte === 'cuisiner') {
    if (!permise(state, 'cuisiner') || !cuisiniere(state)) return fail('Il ne cuisine pas maintenant.');
    const id = recetteCompagnon(state);
    if (!id) return fail('Il n\'y a pas de quoi cuisiner.');
    for (const l of ingredients(state, id)) {
      if (l.eau) state.eauMl = Math.max(0, state.eauMl - l.eau * 1000);
      else takeWithSilo(state, l.item, l.qte);
    }
    const item = recipeOutput(id), qty = recipeOutputQty(id);
    addItem(state, item, qty);
    // (le plat va au frais s'il le peut, sinon dans la boîte posée ; sinon il reste dans l'inventaire)
    let ou = 'inventaire';
    if (state.frigo && state.frigo.construit) { if (moveToFridge(state, item, qty).ok) ou = 'frigo'; } else if (boitePosee(state) && deposerBoite(state, item, qty).ok) ou = 'boite';
    compter(state, 'cuisiner');
    dire(state, 'cuisiner', { [item]: qty }, { recette: id, ou });
    return { ok: true, action: 'cuisiner', items: { [item]: qty }, recette: id, ou };
  }
  if (sorte === 'ramasser') {
    if (!permise(state, 'ramasser')) return fail('Il a assez ramassé pour l\'instant.');
    const p = aRamasserCompagnon(state).find((q) => q.id === ref);
    if (!p) return fail('Il n\'y a plus rien à ramasser ici.');
    const def = DATA.ATELIER.RAMASSAGE[p.sorte], n = def.quantite || 1;
    if (!state.cueillette || state.cueillette.jour !== state.day) state.cueillette = { jour: state.day, pris: [] };
    state.cueillette.pris.push(p.id);
    addItem(state, p.objet, n);
    compter(state, 'ramasser');
    dire(state, 'ramasser', { [p.objet]: n });
    return { ok: true, action: 'ramasser', items: { [p.objet]: n } };
  }
  return fail('Lieu inconnu.');
}

/* ---------- le récit, lot 8 : il garde la ferme quand le joueur explore ----------
   Pendant que le personnage principal est loin de la ferme (enExpedition, ou sous sa tente), ce que le
   compagnon fait est compté (state.compagnon.garde = { arroser, cuisiner, ramasser, betes } ; absent :
   rien) ; au retour du joueur, il le dit en une phrase sobre (retourCompagnon : les textes de
   RECIT.COMPAGNON, data/recit.json), et le compte repart de zéro. */

export function noterGarde(state, action, n = 1) {
  if (!(enExpedition(state) || state.bivouac) || !aidant(state)) return;
  const c = etatCompagnon(state);
  if (!c.garde || typeof c.garde !== 'object') c.garde = {};
  c.garde[action] = (Number(c.garde[action]) || 0) + n;
}

// Le joueur rentre à la ferme : ce que le compagnon dit de sa garde, ou null (rien n'a été compté). →
// { prenom, texte } ; le compte est remis à zéro.
export function retourCompagnon(state) {
  const c = etatCompagnon(state), m = aidant(state), g = c.garde;
  c.garde = null;
  if (!m || !g || typeof g !== 'object') return null;
  const T = (DATA.RECIT && DATA.RECIT.COMPAGNON) || {};
  const parts = ['arroser', 'cuisiner', 'ramasser', 'betes'].filter((a) => g[a] > 0 && T[a]).map((a) => String(T[a]).replace('{n}', String(g[a])));
  if (!parts.length) return null;
  return { id: m.id, prenom: m.prenom || m.nom || '', texte: [T.debut, ...parts.slice(0, 3), T.fin].filter(Boolean).join(' ') };
}

// Sans la carte (ou pendant une absence) : il fait d'un coup tout ce qu'il ferait maintenant
// (chaque tâche en entier : une sortie d'arrosage, le puits compris). Renvoie la liste des
// résultats ({ ok, action, items }).
export function journeeCompagnon(state) {
  const faits = [];
  for (let garde = 0; garde < 40; garde++) {
    const t = tachesCompagnon(state)[0];
    if (!t) break;
    const r = faireCompagnon(state, t);
    if (!r.ok) break;
    faits.push(r);
  }
  return faits;
}
