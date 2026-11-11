/* ---------- le galop : les pommes de la sacoche, en selle (js/engine/cheval.js) ----------
   En selle, si le cheval a sa sacoche, une rangée de ses GALOP.PLACES places au-dessus de la barre d'outils
   (js/ui/outils.js, toolBarHtml) : chaque pomme est une jauge. Quand le cheval la mange, sa chair blanchit de gauche à
   droite (assets/galop_pommes.png : la pomme, sa chair, la pomme dorée, sa chair ; scripts/galop/pommes.py). Un appui
   sur une pomme lance le galop (elle brille), un autre l'arrête.
   La carte (js/fermier.js) dit combien de temps il a avancé au galop (le pont galop, chaque seconde environ) : la
   jauge se met à jour sans redessiner la page ; une pomme finie, le galop qui s'arrête : la page se redessine (la
   vitesse change). La partie est sauvegardée à chaque pomme finie, et toutes les SAUVE_MS sinon.
   La fiche du cheval (à chaque montée en selle : js/ui/outils.js useCheval ; ou un appui sur lui, à l'Écurie :
   js/carte/ferme/chantier.js chevalAt) : ses vitesses, la sacoche
   et ses places, ce qu'il y a de pommes dans l'inventaire, « Remplir » (les pommes, la pomme dorée), « Reprendre »
   (les entières) ; l'aide derrière un « ? ». */

import { DATA } from '../engine/catalog.js';
import { avancerGalop, basculerGalop, chevalMonte, chevalPossede, friandiseGalop, remplirSacoche, reprendreSacoche, sacocheCheval } from '../engine/cheval.js';
import { countItem } from '../engine/inventory.js';
import { openModal } from './modal.js';
import { state } from './store.js';
import { persistState } from './storage.js';
import { refresh } from './render.js';
import { notify } from './toasts.js';
import { registerActions } from './actions.js';

const SAUVE_MS = 10000;
let nonSauve = 0;

// La part mangée de la pomme, en largeur de son dessin (%) : la chair gagne ses colonnes 0 à 14, de gauche à droite.
const mange = (p) => (p.reste >= 1 ? 0 : (((1 - p.reste) * 15) / 16) * 100).toFixed(2);

// La rangée de la sacoche, ou '' (pas en selle, pas de sacoche).
export function rangeeGalopHtml() {
  if (!chevalMonte(state)) return '';
  const S = sacocheCheval(state);
  if (!S) return '';
  const g = friandiseGalop(state);
  const cases = S.map((p, i) => {
    if (!p) return '<span class="tool-slot galop-pomme vide" aria-hidden="true"><span class="galop-img" style="--f:0"></span></span>';
    const F = DATA.CHEVAL.GALOP.FRIANDISES[p.sorte], dore = p.sorte === 'pomme_doree';
    const on = !!g && g.place === i, nom = DATA.OBJETS[p.sorte].nom;
    const label = on ? `${nom} : au galop (× ${String(F.vitesse).replace('.', ',')}). Toucher pour reprendre le pas` : `${nom}${p.reste < 1 ? ` (entamée, ${Math.round(p.reste * 100)} %)` : ''} : galoper (× ${String(F.vitesse).replace('.', ',')})`;
    return `<button type="button" class="tool-slot galop-pomme${on ? ' active' : ''}" data-action="galop-pomme" data-place="${i}" aria-pressed="${on}" aria-label="${label}" title="${label}" style="--mange:${mange(p)}%"><span class="galop-img" style="--f:${dore ? 2 : 0}"></span><span class="galop-chair" style="--f:${dore ? 3 : 1}"></span></button>`;
  }).join('');
  return `<div class="galop-rangee" role="group" aria-label="La sacoche du cheval">${cases}</div>`;
}

// La jauge de la pomme mangée, sans redessiner la page.
function majJauge() {
  const g = friandiseGalop(state);
  if (!g || typeof document === 'undefined') return;
  const b = document.querySelector(`.galop-pomme[data-place="${g.place}"]`);
  if (b) b.style.setProperty('--mange', `${mange(g)}%`);
}

// Le pont de la carte : il a avancé `ms` millisecondes au galop.
export function galopDepuisCarte(ms) {
  const avant = friandiseGalop(state);
  if (!avant) return;
  const r = avancerGalop(state, ms);
  nonSauve += ms;
  if (r.finies || r.galop !== avant.place) {
    nonSauve = 0;
    persistState();
    if (r.galop === null) notify(`${DATA.CHEVAL.ICONE} La sacoche est vide : ton cheval reprend le pas.`);
    refresh();
    return;
  }
  majJauge();
  if (nonSauve >= SAUVE_MS) { nonSauve = 0; persistState(); }
}

/* ---------- la fiche du cheval ---------- */

let aideOuverte = false;
const fois = (v) => `× ${String(v).replace('.', ',')}`;
const place = (p) => (p
  ? `<span class="galop-place" style="--mange:${mange(p)}%" title="${DATA.OBJETS[p.sorte].nom}${p.reste < 1 ? ' (entamée)' : ''}"><span class="galop-img" style="--f:${p.sorte === 'pomme_doree' ? 2 : 0}"></span><span class="galop-chair" style="--f:${p.sorte === 'pomme_doree' ? 3 : 1}"></span></span>`
  : '<span class="galop-place vide" title="Place vide"><span class="galop-img" style="--f:0"></span></span>');

function ficheHtml() {
  const C = DATA.CHEVAL, F = C.GALOP.FRIANDISES, S = sacocheCheval(state);
  const pommes = countItem(state, 'pomme'), dorees = countItem(state, 'pomme_doree');
  const pleines = S ? S.filter(Boolean).length : 0, vides = S ? S.length - pleines : 0;
  const sacoche = S
    ? `<p class="galop-titre">👜 La sacoche · <span class="num">${pleines} / ${S.length}</span></p>
       <div class="galop-places">${S.map(place).join('')}</div>
       <ul class="item-lines"><li>Dans ton inventaire : 🍎 <span class="num">${pommes}</span> · 🍎‍✨ <span class="num">${dorees}</span></li></ul>
       <div class="row item-actions">
         <button type="button" class="btn primary" data-action="cheval-remplir" data-sorte="pomme"${vides && pommes ? '' : ' disabled'}>🍎 Remplir</button>
         ${dorees ? `<button type="button" class="btn" data-action="cheval-remplir" data-sorte="pomme_doree"${vides ? '' : ' disabled'}>🍎‍✨ Une pomme dorée</button>` : ''}
         <button type="button" class="btn" data-action="cheval-reprendre"${S.some((p) => p && p.reste >= 1) ? '' : ' disabled'}>Reprendre</button>
       </div>`
    : `<ul class="item-lines"><li>👜 Pas encore de sacoche : elle se fabrique à l'Atelier (Élevage), avec ${Object.entries(DATA.ATELIER.RECETTES.sacoche_cheval.entrees).map(([o, n]) => `${n} ${DATA.OBJETS[o].icone}`).join(' et ')}.</li></ul>`;
  const aide = `<p class="galop-aide" id="cheval-aide"${aideOuverte ? '' : ' hidden'}>En selle, touche une pomme de la sacoche (au-dessus de la barre d'outils) pour galoper ; retouche-la pour reprendre le pas. Elle ne se mange que quand il avance : une pomme dure ${F.pomme.secondes} s, une pomme dorée ${F.pomme_doree.secondes / 60} min. Finie, la suivante prend le relais. Dans la sacoche, les pommes ne se périment pas.</p>`;
  return `
    <div class="item-head">
      <span class="item-icon" aria-hidden="true">${C.ICONE}</span>
      <span class="item-title"><strong id="cheval-titre">Ton cheval</strong><span class="num">Au pas ${fois(C.VITESSE)} · galop 🍎 ${fois(F.pomme.vitesse)} · 🍎‍✨ ${fois(F.pomme_doree.vitesse)}</span></span>
      <button type="button" class="btn help-btn" data-action="cheval-aide" aria-expanded="${aideOuverte}" aria-controls="cheval-aide" aria-label="Aide : le galop">?</button>
    </div>
    ${aide}
    ${sacoche}`;
}

function majFiche() {
  const b = document.querySelector('#modal-root .cheval-modal .cheval-corps');
  if (b) b.innerHTML = ficheHtml();
}

// La montée en selle (js/ui/outils.js), ou le pont de la carte : un appui sur le cheval, à l'Écurie.
export function ouvrirFicheCheval() {
  if (!chevalPossede(state)) return;
  openModal(`
    <div class="cheval-corps">${ficheHtml()}</div>
    <div class="row"><button type="button" class="btn" data-action="close-modal">Fermer</button></div>`, { labelledBy: 'cheval-titre', className: 'modal bois item-modal cheval-modal' });
}

registerActions({
  'cheval-fiche': () => ouvrirFicheCheval(),
  'cheval-aide': () => { aideOuverte = !aideOuverte; majFiche(); },
  'cheval-remplir': (target) => {
    const r = remplirSacoche(state, String(target.dataset.sorte || 'pomme'));
    if (!r.ok) { notify(r.error); return; }
    persistState();
    majFiche();
    refresh();
  },
  'cheval-reprendre': () => {
    const r = reprendreSacoche(state);
    if (!r.ok) { notify(r.error); return; }
    persistState();
    majFiche();
    refresh();
  },
  'galop-pomme': (target) => {
    const r = basculerGalop(state, Number(target.dataset.place));
    if (!r.ok) { notify(r.error); return; }
    persistState();
    refresh();
  },
});
