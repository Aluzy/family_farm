import { DATA } from '../engine/catalog.js';
import { villageActif } from '../engine/village.js';
import { villageoisDe } from '../engine/villageois.js';
import { quiFaitQuoi } from '../engine/taches.js';
import { etatGardeManger, estCuisineDuVillage } from '../engine/garde-manger.js';
import { escapeHtml, formatNumber } from '../engine/format.js';
import { state } from './store.js';
import { persistState } from './storage.js';
import { applyResult } from './game-actions.js';
import { executer } from './commandes.js';
import { registerActions } from './actions.js';

/* ---------- le garde-manger commun et la cuisine du village (le chantier « l'île à bâtir », fiche I3e) ----------
   Le moteur : js/engine/garde-manger.js. Un appui sur la boîte à nourriture ou le réfrigérateur ouvre leur fenêtre :
   une carte en tête dit s'il est commun au village (« Le rendre commun »), ce qu'il contient en jours de repas du
   village, jusqu'où le travail des villageois le remplit (la réserve visée, réglable), ce que la cuisine du village a
   fait aujourd'hui et ce qui lui manque. Un appui sur une cuisinière ou un four ouvre la fenêtre de la Cuisine ou du
   Four : une carte en tête désigne ce bloc-là « du village » (le bloc touché : choisirBloc, depuis la carte), dit qui
   y cuisine et ce que le menu peut faire. La ligne du tableau : js/ui/tableau.js. */

const OBJ = (o) => DATA.OBJETS[o] || { nom: o, icone: '' };
const nom = (o) => (o === 'eau' ? 'eau' : OBJ(o).nom.toLowerCase());
const objets = (m) => Object.entries(m || {}).filter(([, n]) => n > 0).map(([o, n]) => `${formatNumber(n)} ${OBJ(o).icone || ''}`).join(' ');
const plat = (r) => { const o = DATA.RECETTES[r] ? DATA.RECETTES[r].sortie || r : r; return OBJ(o).nom ? `${OBJ(o).icone || ''} ${escapeHtml(OBJ(o).nom.toLowerCase())}` : escapeHtml(r); };
// Des jours de repas, à une décimale (« 1,5 jour », « 3 jours »).
const jours = (j) => `${String(Math.round(j * 10) / 10).replace('.', ',')} jour${j >= 2 ? 's' : ''}`;
const SORTES = { boite: ['la boîte à nourriture', 'boite_nourriture'], frigo: ['le réfrigérateur', 'refrigerateur'] };

// Le bloc touché sur la carte (une cuisinière, un four : sa case), pour la carte de la cuisine du village.
let blocTouche = null;
export function choisirBloc(t) {
  blocTouche = Number.isInteger(t) ? t : null;
}

const bouton = (action, texte, data = {}, primaire = false) => `<button type="button" class="btn${primaire ? ' primary' : ''}" data-action="${action}"${Object.entries(data).map(([k, v]) => ` data-${k}="${escapeHtml(String(v))}"`).join('')}>${texte}</button>`;

// La carte du garde-manger, en tête de la fenêtre de la boîte (sorte 'boite') ou du réfrigérateur ('frigo') ; '' le
// chantier éteint.
export function carteGardeManger(sorte) {
  if (!villageActif(state)) return '';
  const E = etatGardeManger(state);
  if (!E || !E.possibles.includes(sorte)) return '';
  const V = villageoisDe(state).length, ici = SORTES[sorte][0];
  const sien = E.commun && E.sorte === sorte;
  if (!sien) {
    const autre = E.commun && E.sorte && E.sorte !== sorte ? ` Le garde-manger commun est aujourd'hui ${SORTES[E.sorte][0]} : celui-ci le remplacera.` : '';
    return `<div class="card garde-manger" id="garde-manger">
        <span class="card-title"><span>🏘️ Garde-manger commun</span></span>
        <span class="muted">Rends ${ici} commun${sorte === 'boite' ? 'e' : ''} au village : les villageois y mangent, leur travail y dépose ce qu'il produit qui se mange, et la cuisine du village (une cuisinière ou un four, un appui dessus) y prend ses ingrédients et y range ses plats.${sorte === 'frigo' ? ' Au réfrigérateur, ce qui périt garde sa fraîcheur.' : ' Dans la boîte, ce qui périt vieillit comme dans l\'inventaire.'}${autre}</span>
        <span class="row">${bouton('garde-manger-commun', 'Le rendre commun', { oui: 1, sorte }, true)}</span>
      </div>`;
  }
  const j = Number.isFinite(E.jours) ? E.jours : 0;
  const reserve = E.reserves.map((j) => `<button type="button" class="btn${E.reserve === j ? ' primary' : ''}" data-action="garde-manger-reserve" data-jours="${j}" aria-pressed="${E.reserve === j}">${j ? `${j} j` : 'rien'}</button>`).join('');
  const qui = sorte === 'boite' && state.frigo && state.frigo.construit ? 'Les villageois y mangent (la famille mange au réfrigérateur).' : `La famille et ${V ? `les ${formatNumber(V)} villageois` : 'les villageois'} y mangent.`;
  const J = E.aujourdhui, H = E.hier;
  const fait = [
    objets(J.depose) ? `déposé par le travail : ${objets(J.depose)}` : '',
    objets(J.plats) ? `cuisiné : ${objets(J.plats)}` : '',
    objets(H.mange) ? `mangé hier soir : ${objets(H.mange)}` : '',
  ].filter(Boolean).join(' · ');
  return `<div class="card garde-manger" id="garde-manger">
      <span class="card-title"><span>🏘️ Garde-manger commun</span><span class="num">${jours(j)}</span></span>
      <span class="muted">${qui} Il contient ${jours(j)} de repas du village (${formatNumber(E.energie)} pour ${formatNumber(E.besoin)} par jour).${sorte === 'frigo' ? ' Ce qui périt y garde sa fraîcheur.' : ' Ce qui périt y vieillit comme dans l\'inventaire.'}</span>
      <span class="muted">Le travail des villageois y dépose ce qui se mange jusqu'à :</span>
      <span class="row garde-manger-reserve" role="group" aria-label="Réserve visée">${reserve}</span>
      ${fait ? `<span class="muted">Aujourd'hui : ${fait}</span>` : ''}
      ${manqueHtml(E)}
      <span class="row">${bouton('garde-manger-commun', 'Ne plus le partager', { oui: 0, sorte })}</span>
    </div>`;
}

// Ce que peut faire la cuisine du village, et ce qui lui manque.
function manqueHtml(E) {
  if (!E.cuisine) return '<span class="muted">Pas encore de cuisine du village : un appui sur une cuisinière ou un four posés dans une maison, puis « Cuisine du village ».</span>';
  const M = E.manque;
  const peut = M.possibles.length ? `La cuisine du village peut faire : ${M.possibles.map(plat).join(', ')}.` : 'La cuisine du village n\'a de quoi faire aucun plat.';
  // (ce qui manque le plus souvent, d'abord)
  const compte = new Map();
  for (const x of M.manquent) for (const o of x.manque) compte.set(o, (compte.get(o) || 0) + 1);
  const manque = [...compte.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([o]) => {
    const def = DATA.OBJETS[o];
    return `${def && def.icone ? def.icone + ' ' : ''}${escapeHtml(nom(o))}${def && !def.mangeable && o !== 'eau' ? ' (au coffre)' : ''}`;
  });
  return `<span class="muted">${peut}${manque.length ? ` Il manque surtout : ${manque.join(', ')}.` : ''}</span>`;
}

// Le bloc de la station `station` ('cuisine' ou 'four') que la carte désigne : celui qu'on a touché, sinon le premier posé.
function blocDe(station) {
  const sorte = station === 'four' ? 'four' : 'cuisiniere', B = state.blocs || {};
  if (Number.isInteger(blocTouche) && B[blocTouche] === sorte) return blocTouche;
  const k = Object.keys(B).find((t) => B[t] === sorte);
  return k === undefined ? null : Number(k);
}

// La carte de la cuisine du village, en tête de la fenêtre de la Cuisine ('cuisine') ou du Four ('four') ; '' le
// chantier éteint ou sans bloc posé.
export function carteCuisineVillage(station) {
  if (!villageActif(state) || !state.stations[station] || !state.stations[station].construit) return '';
  const t = blocDe(station);
  if (t === null) return '';
  const E = etatGardeManger(state);
  const sien = estCuisineDuVillage(state, t), ce = station === 'four' ? 'Ce four' : 'Cette cuisinière';
  if (!sien) {
    return `<div class="card cuisine-village" id="cuisine-village">
        <span class="card-title"><span>🍲 Cuisine du village</span></span>
        <span class="muted">${ce} peut devenir la cuisine du village : les villageois à qui tu confies la cuisine y font des plats avec le garde-manger commun, plusieurs cuisiniers en font plus, et le soir on mange ensemble à la table commune. Mets-la près de la table.</span>
        <span class="row">${bouton('cuisine-village', 'Cuisine du village', { case: t, oui: 1 }, true)}</span>
      </div>`;
  }
  const cuisiniers = quiFaitQuoi(state).filter((q) => q.tache === 'cuisine');
  const ETAT = { travail: 'au travail', attend: 'attend', repos: 'se repose', chantier: 'au chantier', libre: '' };
  const qui = cuisiniers.length
    ? cuisiniers.map((q) => `${escapeHtml(q.prenom)} <span class="muted">(${ETAT[q.etat] || q.etat}${q.etat === 'travail' || q.actions ? `, ${formatNumber(q.actions)} / ${formatNumber(q.sur)} plats` : ''})</span>`).join(' · ')
    : '<span class="muted">personne pour l\'instant ; confie la cuisine à un villageois (sa fiche, « Tâche »).</span>';
  const sans = !E.actif ? '<span class="muted">Il faut aussi un garde-manger commun : un appui sur la boîte à nourriture ou le réfrigérateur, « Le rendre commun ».</span>' : '';
  const J = E.aujourdhui;
  return `<div class="card cuisine-village" id="cuisine-village">
      <span class="card-title"><span>🍲 Cuisine du village</span></span>
      <span class="muted">${ce} est celle du village. Qui cuisine : ${qui}</span>
      ${objets(J.plats) ? `<span class="muted">Aujourd'hui : ${objets(J.plats)}, rangés au garde-manger.</span>` : ''}
      ${sans}${E.actif ? manqueHtml(E) : ''}
      <span class="row">${bouton('cuisine-village', 'Rendre à la famille', { case: t, oui: 0 })}</span>
    </div>`;
}

registerActions({
  'garde-manger-commun': (target) => {
    const r = applyResult(executer('village.commun', { oui: target.dataset.oui === '1', sorte: target.dataset.sorte }));
    if (r.ok) persistState();
  },
  'garde-manger-reserve': (target) => {
    const r = applyResult(executer('village.reserve', { jours: Number(target.dataset.jours) || 0 }));
    if (r.ok) persistState();
  },
  'cuisine-village': (target) => {
    const r = applyResult(executer('village.cuisine', { case: Number(target.dataset.case), oui: target.dataset.oui === '1' }));
    if (r.ok) persistState();
  },
});
