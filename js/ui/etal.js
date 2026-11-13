import { DATA, prixIle } from '../engine/catalog.js';
import { inventoryCounts } from '../engine/inventory.js';
import { stockCount } from '../engine/fridge.js';
import {
  bourseDe, caseEtal, enVenteAlEtal, envieDe, prendreAvisEtal, vendableALEtal,
} from '../engine/bourse.js';
import { trouverVillageois, villageoisDe } from '../engine/villageois.js';
import { escapeHtml, formatCoins, formatDay } from '../engine/format.js';
import { state } from './store.js';
import { persistState } from './storage.js';
import { applyResult } from './game-actions.js';
import { executer } from './commandes.js';
import { registerActions } from './actions.js';
import { notify } from './toasts.js';

/* ---------- l'étal du joueur et la bourse des villageois (le chantier « l'île à bâtir », fiche I4) ----------
   L'étal (un appui sur lui, sur la carte ; js/engine/bourse.js) : ce qui y est en vente (à reprendre), ce qu'on peut y
   mettre (de l'inventaire, puis du réfrigérateur), au prix de vente de l'île ; qui l'aime parmi les villageois. Un
   villageois qui a de quoi y vient après le travail et y achète ce qu'il aime : ses pièces vont au joueur (une
   notification). La fiche d'un villageois (js/ui/villageois.js) dit sa bourse : ses pièces, sa part qui attend le bac,
   ses derniers achats, sa commande au bac. */

const OBJ = (o) => DATA.OBJETS[o];
const P = () => (DATA.VILLAGE.BOURSE || {}).ETAL || {};

// Qui, parmi les villageois, voudrait `o` (ce qu'il adore, ce dont il a besoin, ce qu'il aime) : un texte court.
function amateurs(o) {
  const l = villageoisDe(state).filter((v) => !v.enfant && envieDe(v, o));
  return l.length ? `<span class="muted">${l.map((v) => `${escapeHtml(v.prenom)}${envieDe(v, o) === 'adore' ? ' ❤️' : ''}`).join(', ')}</span>` : '';
}

function ligne(o, n, boutons, extra = '') {
  const it = OBJ(o);
  return `<li class="boite-ligne">
      <span class="item-icon" aria-hidden="true">${it.icone}</span>
      <span class="boite-nom">${escapeHtml(it.nom)} <span class="muted">(${formatCoins(prixIle(o))} 💰)</span>${extra ? `<br>${extra}` : ''}</span>
      <span class="num">${n}</span>
      <span class="row">${boutons}</span>
    </li>`;
}

export function renderEtal() {
  const E = enVenteAlEtal(state), places = P().PLACES || 6, max = P().QUANTITE || 20;
  const bouton = (action, o, n, texte, ok) => `<button type="button" class="btn" data-action="${action}" data-item="${o}" data-n="${n}"${ok ? '' : ' disabled'}>${texte}</button>`;
  const pose = caseEtal(state) !== null;
  const contenu = E.length
    ? `<ul class="boite-liste etal-liste">${E.map((x) => ligne(x.objet, x.n, bouton('etal-reprendre', x.objet, 1, '−1', true) + bouton('etal-reprendre', x.objet, x.n, 'Tout', true), amateurs(x.objet))).join('')}</ul>`
    : '<p class="muted">Rien en vente : les villageois passent sans rien acheter.</p>';
  const plein = E.length >= places;
  const sac = Object.keys(inventoryCounts(state)).filter((o) => vendableALEtal(o)).sort((a, b) => OBJ(a).nom.localeCompare(OBJ(b).nom, 'fr'));
  const ajout = !pose ? '<p class="muted">Pose d\'abord l\'étal dehors (le mode Construire, l\'onglet Maison).</p>'
    : sac.length ? `<ul class="boite-liste">${sac.map((o) => {
      const deja = (E.find((x) => x.objet === o) || {}).n || 0, place = Math.max(0, Math.min(max - deja, Math.floor(stockCount(state, o))));
      const ok = place > 0 && (deja > 0 || !plein);
      return ligne(o, Math.floor(stockCount(state, o)), bouton('etal-mettre', o, 1, '+1', ok) + bouton('etal-mettre', o, Math.min(5, place), `+${Math.min(5, place)}`, ok && place > 1), amateurs(o));
    }).join('')}</ul>`
    : '<p class="muted">Rien à vendre dans l\'inventaire.</p>';
  const bourses = villageoisDe(state).filter((v) => !v.enfant).map((v) => `${escapeHtml(v.prenom)} <span class="num">${formatCoins(Math.max(0, Math.round(v.bourse || 0)))}</span> 💰`).join(' · ');
  return `
    <div class="cards">
      <div class="card">
        <span class="card-title"><span>🛒 En vente · <span class="num">${E.length} / ${places}</span></span></span>
        <span class="muted">Au plus ${places} sortes, ${max} de chacune, au prix de vente de l'île. Après le travail, un villageois qui a de quoi vient y acheter ce qu'il aime ou ce qui lui manque (un vêtement, un meuble) : ses pièces sont pour toi.</span>
        ${contenu}
        ${bourses ? `<span class="muted">Les bourses : ${bourses}</span>` : ''}
      </div>
      <div class="card">
        <span class="card-title"><span>🎒 Depuis l'inventaire</span></span>
        ${ajout}
      </div>
    </div>`;
}

// La bourse d'un villageois, pour sa fiche : ses pièces, sa part qui attend le bac, ses derniers achats, sa commande.
export function bourseFicheHtml(id) {
  const b = bourseDe(state, id);
  if (!b) return '';
  const nomDe = (o) => `${OBJ(o).icone} ${escapeHtml(OBJ(o).nom.toLowerCase())}`;
  const panier = b.panier.length
    ? `${b.panier.map((x) => `${x.n} ${OBJ(x.objet).icone}`).join(' ')} (<span class="num">${formatCoins(b.valeurPanier)}</span> 💰, vendu pour lui au prochain bac)`
    : '<span class="muted">rien en attente</span>';
  const achats = b.achats.slice(0, 3).map((a) => `${nomDe(a.objet)} <span class="muted">(${a.ou === 'bac' ? 'par le bac' : 'à ton étal'}, ${formatDay(a.jour)})</span>`).join(', ');
  const commande = b.commande ? `<br><span class="muted">⛴️ Attend du bac : ${b.commande.n > 1 ? `${b.commande.n} × ` : ''}${nomDe(b.commande.objet)} (${formatCoins(b.commande.prix)} 💰)</span>` : '';
  return `<dt>👛 Bourse</dt><dd><span class="num">${formatCoins(b.bourse)}</span> 💰 · sa part (${b.part} % de ce qu'il produit) : ${panier}${achats ? `<br>Derniers achats : ${achats}` : ''}${commande}</dd>`;
}

// Les achats à l'étal du moteur : une notification chacun. → true s'il y en a eu.
export function direAvisEtal() {
  const l = prendreAvisEtal(state);
  for (const a of l) {
    const v = trouverVillageois(state, a.id);
    if (!v || !OBJ(a.objet)) continue;
    const coeur = a.envie === 'adore' ? ' ❤️' : a.envie === 'besoin' ? ' (il lui en fallait un)' : '';
    notify(`🛒 ${v.prenom} a acheté ${OBJ(a.objet).icone} ${OBJ(a.objet).nom.toLowerCase()} à ton étal${coeur} : +${formatCoins(a.prix)} 💰`, { kind: 'info' });
  }
  return l.length > 0;
}

registerActions({
  'etal-mettre': (target) => {
    const r = applyResult(executer('etal.mettre', { objet: target.dataset.item, quantite: Number(target.dataset.n) || 1 }));
    if (r.ok) persistState();
  },
  'etal-reprendre': (target) => {
    const r = applyResult(executer('etal.reprendre', { objet: target.dataset.item, quantite: Number(target.dataset.n) || 1 }));
    if (r.ok) persistState();
  },
});

