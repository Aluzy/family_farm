import { DATA } from '../engine/catalog.js';
import { aJeterAuCompost, capaciteCompost, compostsPoses, etatCompost } from '../engine/compost.js';
import { state } from './store.js';
import { persistState } from './storage.js';
import { applyResult } from './game-actions.js';
import { executer } from './commandes.js';
import { registerActions, SOMMEIL_MESSAGE } from './actions.js';
import { asleep } from '../engine/night.js';
import { accord, plural } from './common.js';
import { refresh } from './render.js';
import { notify } from './toasts.js';

/* ---------- le bac à compost et l'engrais (docs/compost.md ; js/engine/compost.js) ----------
   La fenêtre des bacs (un appui sur l'un d'eux, sur la carte) : chacun, ce qu'il contient (une jauge jusqu'au
   prochain engrais), ses engrais à prendre (la bulle sur la carte) ; puis les aliments de l'inventaire à y jeter
   (1, ou 10 d'un coup). La péremption coupée (B-1), c'est ainsi qu'il se remplit.

   Glisser l'engrais (js/farm-stage.js engraisStart) : `engrais-many`, les cultures tracées, chacune gagne un
   cycle (la commande potager.engrais) ; la carte les a fait scintiller avant (js/carte/ferme/engrais.js). */

const C = () => DATA.COMPOST;
const nomDe = (item) => DATA.OBJETS[item].nom;
const icone = (item) => DATA.OBJETS[item].icone;

// Le bac où jeter : le premier qui a de la place, ou null.
function bacOuJeter() {
  return compostsPoses(state).find((t) => !etatCompost(state, t).plein) ?? null;
}

function ligneBac(t, k) {
  const e = etatCompost(state, t), P = C().PAR_ENGRAIS;
  const dans = e.matiere - e.engrais * P;
  const jauge = `<span class="compost-jauge" role="img" aria-label="${dans} sur ${P} avant le prochain engrais"><span style="width:${Math.round((dans / P) * 100)}%"></span></span>`;
  const engrais = e.engrais ? `<span>${icone(C().ENGRAIS)} <span class="num">${e.engrais}</span> engrais : appuie sur sa bulle, sur la carte, pour ${e.engrais > 1 ? 'les' : 'le'} prendre.</span>` : '';
  const etat = e.plein ? '<span class="muted">Plein : prends ses engrais.</span>' : `<span class="muted">Encore <span class="num">${e.reste}</span> pour le prochain engrais.</span>`;
  return `<li class="compost-ligne"><span class="compost-titre">${C().ICONE} Bac ${k + 1}${t === bacOuJeter() ? ' <span class="muted">· on y jette</span>' : ''}</span>
      <span class="compost-etat">${jauge}<span class="num">${dans}/${P}</span></span>${engrais}${etat}</li>`;
}

function aJeter() {
  const t = bacOuJeter();
  const items = Object.entries(aJeterAuCompost(state)).sort((a, b) => nomDe(a[0]).localeCompare(nomDe(b[0])));
  if (t === null) return '<p class="muted">Tous les bacs sont pleins : prends d\'abord leurs engrais.</p>';
  if (!items.length) return '<p class="muted">Aucun aliment dans l\'inventaire.</p>';
  const lignes = items.map(([item, n]) => `<li class="compost-aliment">
      <span class="compost-nom">${icone(item)} ${nomDe(item)} <span class="num muted">× ${n}</span></span>
      <button type="button" class="btn" data-action="compost-jeter" data-case="${t}" data-item="${item}" data-n="1" aria-label="Jeter 1 ${nomDe(item)} au compost">1</button>
      ${n > 1 ? `<button type="button" class="btn" data-action="compost-jeter" data-case="${t}" data-item="${item}" data-n="${Math.min(n, P10())}" aria-label="Jeter ${Math.min(n, P10())} ${nomDe(item)} au compost">${Math.min(n, P10())}</button>` : ''}
    </li>`).join('');
  return `<ul class="compost-aliments">${lignes}</ul>`;
}
const P10 = () => C().PAR_ENGRAIS;

export function renderComposts() {
  const poses = compostsPoses(state);
  const liste = poses.length ? `<ul class="compost-liste">${poses.map(ligneBac).join('')}</ul>` : '<p class="muted">Aucun bac posé.</p>';
  return `
    <div class="cards">
      <div class="card">
        <span class="card-title"><span>${C().ICONE} Bacs à compost · <span class="num">${poses.length}</span></span></span>
        <span class="muted">${C().PAR_ENGRAIS} aliments font un engrais (au plus ${C().MAX_ENGRAIS} par bac, ${capaciteCompost()} aliments). L'engrais se glisse sur une culture arrosée (des cases violettes) : elle gagne un cycle.</span>
        ${liste}
      </div>
      <div class="card">
        <span class="card-title"><span>🧺 Y jeter des aliments</span></span>
        ${aJeter()}
      </div>
    </div>`;
}

// Mettre l'engrais sur les cultures tracées (`cases`, dans l'ordre), tant qu'il en reste.
function engraisserCases(cases) {
  let n = 0, raison = '';
  for (const c of cases) {
    const p = [...state.potager.parcelles, ...(state.serre && state.serre.construit ? state.serre.parcelles : [])].find((x) => x.case === c);
    if (!p) continue;
    const r = executer('potager.engrais', { parcelle: p.id });
    if (r.ok) { n += 1; continue; }
    raison = raison || r.error;
    if (/Il te faut de l'engrais/.test(r.error)) break;
  }
  if (n) persistState();
  refresh();
  if (n) notify(`${icone(C().ENGRAIS)} ${plural(n, 'culture')} ${accord(n, 'engraissée')} : ${n > 1 ? 'elles gagnent' : 'elle gagne'} un cycle.${raison ? ` · ${raison}` : ''}`, { kind: 'succes' });
  else if (raison) notify(raison, { son: 'erreur' });
}

registerActions({
  'compost-jeter': (target) => {
    const r = applyResult(executer('compost.jeter', { case: Number(target.dataset.case), objet: target.dataset.item, quantite: Number(target.dataset.n) || 1 }));
    if (r.ok) {
      persistState();
      notify(`${C().ICONE} ${nomDe(r.item)} × ${r.mis} au compost${r.etat.engrais ? ` · ${r.etat.engrais} engrais à prendre` : ''}.`);
    }
  },
  // Glisser l'engrais (js/farm-stage.js) : `cases`, les cultures tracées, dans l'ordre.
  'engrais-many': (target) => {
    if (asleep(state)) { notify(SOMMEIL_MESSAGE); return; }
    engraisserCases(String(target.dataset.cases || '').split(',').map(Number).filter((t) => Number.isInteger(t)));
  },
});
