import { DATA } from '../engine/catalog.js';
import { escapeHtml, formatNumber } from '../engine/format.js';
import { choisirLit, couchages, dormeurDuLit, litDuPrincipal } from '../engine/blocs.js';
import { aCruche, crucheARemplir, jaugeCruche, remplirCruche } from '../engine/cruche.js';
import { executer } from './commandes.js';
import { GROUPE_MIN, groupDiscount } from '../engine/automation.js';
import { TIRED } from '../engine/stamina.js';
import { accord, plural } from './common.js';
import { memberName } from '../engine/family.js';
import { asleep } from '../engine/night.js';
import { mainCharacter } from '../engine/depart.js';
import { enLigne, state } from './store.js';
import { persistState } from './storage.js';
import { refresh } from './render.js';
import { notify } from './toasts.js';
import { registerActions, SOMMEIL_MESSAGE } from './actions.js';
import { closeModal, openModal } from './modal.js';

/* ---------- la cruche et le lit (fiche 17) ----------
   La cruche : sa case dans la barre d'outils (js/ui/outils.js) montre l'eau qui reste, d'une
   jauge bleue qui baisse à chaque arrosage et remonte au puits. La cruche n'est pas un outil
   qu'on prend en main (elle sert d'elle-même dès qu'on arrose une plante sans citerne) : sa jauge
   reste donc toujours en vue, à côté des outils, plutôt que près d'un « outil en main » qui
   n'existe pas pour elle. Un appui sur cette case, ou sur le puits de la carte, envoie le
   personnage au puits (FarmStage.allerAuPuits, js/carte/ferme/puits.js) : il y marche, puise, et
   alors seulement la cruche se remplit (puiserFromStage, js/engine/cruche.js remplirCruche).
   Le lit : un appui sur un lit (ou une paillasse) de la carte demande « Tu veux choisir ce lit ? » ;
   Oui en fait le lit du personnage principal (js/engine/blocs.js choisirLit) : il y dort, et
   le membre de la famille qui l'avait prend son ancien lit. */

// La case de la cruche dans la barre d'outils, ou '' sans cruche : son icône, une jauge
// verticale (l'eau, de bas en haut) et les litres qui restent.
export function crucheSlotHtml() {
  const j = jaugeCruche(state);
  if (!j) return '';
  const pct = Math.round(j.part * 100);
  const litres = formatNumber(j.litres);
  const etat = j.vide ? 'vide' : j.pleine ? 'pleine' : `${litres} L sur ${DATA.CRUCHE.LITRES}`;
  const label = `Cruche ${etat}${j.pleine ? '' : ' : aller la remplir au puits'}`;
  return `<button type="button" class="tool-slot cruche-slot${j.vide ? ' vide-eau' : ''}" data-action="cruche-remplir" aria-label="${label}" title="${label}">`
    + `<span class="cruche-icone" aria-hidden="true">${DATA.OBJETS.cruche.icone}</span>`
    + `<span class="cruche-jauge" role="meter" aria-label="Eau de la cruche" aria-valuemin="0" aria-valuemax="${DATA.CRUCHE.LITRES}" aria-valuenow="${j.litres}" aria-valuetext="${litres} L"><span style="height:${pct}%"></span></span>`
    + `<span class="cruche-litres num" aria-hidden="true">${litres}</span></button>`;
}

// Arroser en glissant (js/farm-stage.js arroseStart) : les cultures tracées, arrosées une à une
// dans l'ordre du tracé (le personnage y passe ensuite, js/fermier.js). La cruche vide en chemin :
// il va la remplir au puits, et les cultures qui restent sont arrosées quand elle est pleine
// (arrosageReste, repris par puiserFromStage). Plus d'énergie, ou une autre raison : on s'arrête.
let arrosageReste = [];

function parcelleDeCase(c) {
  const listes = [state.potager.parcelles, state.serre && state.serre.construit ? state.serre.parcelles : []];
  for (const l of listes) for (const p of l) if (p.case === c) return p;
  return null;
}

function arroserCases(cases) {
  arrosageReste = [];
  let n = 0, raison = '', vide = false;
  const avant = Number(state.energie) || 0;
  for (let i = 0; i < cases.length; i++) {
    const p = parcelleDeCase(cases[i]);
    if (!p || !p.culture || p.arrose) continue;
    const r = executer('potager.arroser', { parcelle: p.id });
    if (r.ok) { n += 1; continue; }
    // (la cruche est vide : la suite attend qu'elle soit remplie)
    if (aCruche(state) && /cruche est vide/.test(r.error)) { vide = true; arrosageReste = cases.slice(i); break; }
    raison = raison || r.error;
    if (r.error === TIRED) break;
  }
  // (un tracé d'au moins GROUPE_MIN cases : une action groupée, comme « Arroser tout »)
  if (cases.length >= GROUPE_MIN && !enLigne) groupDiscount(state, avant);   // (en ligne, pas de remise)
  if (n) persistState();
  refresh();
  if (n) notify(`💧 ${plural(n, 'culture')} ${accord(n, 'arrosée')}${vide ? ' · la cruche est vide : au puits !' : raison ? ` · ${raison}` : ''}`);
  else if (vide) notify(`${DATA.OBJETS.cruche.icone} La cruche est vide : au puits d'abord, puis on arrose.`);
  else if (raison) notify(raison, { son: 'erreur' });
  if (vide) allerAuPuits(true);
}

// Envoie le personnage remplir la cruche au puits (un appui sur le puits ou sur la cruche ; `apres` :
// arroser en glissant, après les arrosages déjà faits).
export function allerAuPuits(apres = false) {
  if (asleep(state)) { notify(SOMMEIL_MESSAGE); return; }
  const r = crucheARemplir(state);
  if (!r.ok) { notify(`${DATA.OBJETS.cruche.icone} ${r.error}`); return; }
  const S = window.FarmStage;
  const go = S && S.allerAuPuits ? S.allerAuPuits(apres) : { ok: false, raison: 'sans' };
  if (go.ok) return;
  if (go.raison === 'loin') notify(`${DATA.OBJETS.cruche.icone} Le puits est trop loin d'ici : rapproche-toi de la ferme pour remplir la cruche.`);
  else if (go.raison === 'ferme') notify(`${DATA.OBJETS.cruche.icone} Impossible d'aller au puits : aucun chemin n'y mène (une porte manque, ou le puits est enfermé).`);
  else notify(`${DATA.OBJETS.cruche.icone} Pour remplir la cruche, va au puits de la ferme : touche-le.`);
}

// La carte (js/carte/ferme/puits.js) : le personnage a puisé au puits de la case `casePuits`
// (null : il n'y est pas arrivé). Le jeu remplit la cruche.
export function puiserFromStage(casePuits) {
  if (asleep(state)) return null;
  const c = casePuits === null || casePuits === undefined ? null : Number(casePuits);
  const r = Number.isInteger(c) && c >= 0 ? executer('cruche.remplir', { case: c }) : remplirCruche(state, c);
  if (!r.ok) { arrosageReste = []; notify(`${DATA.OBJETS.cruche.icone} ${r.error}`); return r; }
  notify(`${DATA.OBJETS.cruche.icone} Cruche remplie : ${r.litres} L pour arroser.`);
  persistState();
  refresh();
  // (un arrosage en glissant attendait la cruche pleine : il reprend où il s'était arrêté)
  if (arrosageReste.length) arroserCases(arrosageReste);
  return r;
}

registerActions({
  // Arroser en glissant (js/farm-stage.js) : `cases`, les cultures tracées, dans l'ordre.
  'water-many': (target) => {
    if (asleep(state)) { notify(SOMMEIL_MESSAGE); return; }
    arroserCases(String(target.dataset.cases || '').split(',').map(Number).filter((t) => Number.isInteger(t)));
  },
  // La case de la cruche, dans la barre d'outils : aller la remplir (pleine : elle le dit).
  'cruche-remplir': () => {
    allerAuPuits();
  },
  // La carte : un appui sur un lit (`lit` : son couchage, modèle.couchages).
  'lit-choisir': (target) => {
    if (asleep(state)) { notify(SOMMEIL_MESSAGE); return; }
    const lit = target.dataset.lit;
    const id = /^\d+$/.test(lit) ? Number(lit) : lit;
    if (!couchages(state).includes(id)) { notify('🛏️ On ne dort que dans une pièce close (des murs tout autour et une porte) : ce lit n\'en est pas une.'); return; }
    if (litDuPrincipal(state) === id) { notify('🛏️ C\'est déjà ton lit : tu y dors la nuit.'); return; }
    const qui = dormeurDuLit(state, id);
    const nom = qui && qui !== mainCharacter(state) ? escapeHtml(memberName(state, qui.id)) : '';
    const dit = nom ? `<p class="muted">C'est le lit de ${nom} : ${nom} prendra le tien.</p>` : '';
    openModal(`
      <p class="lit-question" id="lit-question">Tu veux choisir ce lit ?</p>
      ${dit}
      <div class="row lit-choix">
        <button type="button" class="btn primary" data-action="lit-oui" data-lit="${escapeHtml(String(lit))}">Oui</button>
        <button type="button" class="btn" data-action="close-modal">Non</button>
      </div>`, { labelledBy: 'lit-question', className: 'modal bois lit-modal', focus: '[data-action="lit-oui"]' });
  },
  'lit-oui': (target) => {
    closeModal();
    const lit = target.dataset.lit;
    const r = choisirLit(state, /^\d+$/.test(lit) ? Number(lit) : lit);
    if (!r.ok) { notify(`🛏️ ${r.error}`); return; }
    persistState();
    notify(r.cede ? `🛏️ C'est ton lit : tu y dormiras. ${memberName(state, r.cede.id)} prend ton ancien lit.` : '🛏️ C\'est ton lit : tu y dormiras.');
    refresh();
  },
});
