import { DATA } from '../engine/catalog.js';
import { countItem } from '../engine/inventory.js';
import { aAffiner, etatTonnelet, tonneletsPoses } from '../engine/tonnelets.js';
import { state } from './store.js';
import { persistState } from './storage.js';
import { applyResult } from './game-actions.js';
import { executer } from './commandes.js';
import { registerActions } from './actions.js';
import { plural } from './common.js';

/* ---------- les tonnelets (un appui sur l'un d'eux, sur la carte ; js/engine/tonnelets.js) ----------
   Chaque tonnelet posé : ce qui s'y affine et dans combien de nuits, ce qui est prêt (la bulle sur la carte),
   ou, vide, les boutons pour y mettre une tomme d'alpage ou un moût de houblon de l'inventaire. */

const nomDe = (item) => DATA.OBJETS[item].nom;
const icone = (item) => DATA.OBJETS[item].icone;

function ligne(t, k) {
  const e = etatTonnelet(state, t);
  let corps;
  if (e.vide) {
    const boutons = aAffiner().map((item) => {
      const n = countItem(state, item);
      return `<button type="button" class="btn" data-action="tonnelet-remplir" data-case="${t}" data-item="${item}"${n ? '' : ' disabled'}>${icone(item)} ${nomDe(item)} <span class="num">× ${n}</span></button>`;
    }).join('');
    corps = `<span class="muted">Vide : mets-y</span><span class="tonnelet-actions">${boutons}</span>`;
  } else if (e.pret) {
    corps = `<span>${icone(e.sortie)} ${nomDe(e.sortie)} : prêt. Appuie sur sa bulle, sur la carte, pour le prendre.</span>`;
  } else {
    corps = `<span>${icone(e.produit)} ${nomDe(e.produit)} → ${icone(e.sortie)} ${nomDe(e.sortie)} : encore ${plural(e.reste, 'nuit', `<span class="num">${e.reste}</span>`)}.</span>`;
  }
  return `<li class="tonnelet-ligne"><span class="tonnelet-titre">${DATA.TONNELET.ICONE} Tonnelet ${k + 1}</span>${corps}</li>`;
}

export function renderTonnelets() {
  const T = DATA.TONNELET, poses = tonneletsPoses(state);
  const liste = poses.length ? `<ul class="tonnelet-liste">${poses.map(ligne).join('')}</ul>` : '<p class="muted">Aucun tonnelet posé.</p>';
  const regle = aAffiner().map((item) => `${nomDe(item)} → ${nomDe(T.AFFINE[item]).toLowerCase()}`).join(' ; ');
  return `
    <div class="cards">
      <div class="card">
        <span class="card-title"><span>${T.ICONE} Tonnelets · <span class="num">${poses.length}</span></span></span>
        <span class="muted">Un produit à la fois, ${T.NUITS} nuits : ${regle}. La tomme et le moût sortent des chaînes de production.</span>
        ${liste}
      </div>
    </div>`;
}

registerActions({
  'tonnelet-remplir': (target) => {
    const r = applyResult(executer('tonnelet.remplir', { case: Number(target.dataset.case), objet: target.dataset.item }));
    if (r.ok) persistState();
  },
});
