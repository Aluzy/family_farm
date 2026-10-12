import { comptaRecente } from '../engine/compta.js';
import { formatNumber, formatSigned } from '../engine/format.js';
import { state } from './store.js';
import { tel } from './consent.js';
import { registerActions } from './actions.js';

/* ---------- Comptes : un appui sur les pièces (carte en haut à droite) ---------- */

// Le détail récent des pièces, posé comme une addition : le solde d'avant, chaque gain (+)
// et chaque dépense (−), jour par jour, puis le total, qui est le solde actuel.
function comptaHtml() {
  const { lignes, avant, total } = comptaRecente(state);
  let jour = null;
  const rows = [];
  for (const l of lignes) {
    if (l.jour !== jour) {
      jour = l.jour;
      rows.push(`<li class="compta-jour">Jour ${formatNumber(jour)}</li>`);
    }
    rows.push(`<li class="compta-ligne"><span>${l.libelle}${l.n > 1 ? ` <span class="muted">× ${formatNumber(l.n)}</span>` : ''}</span><span class="num ${l.montant > 0 ? 'gain' : 'perte'}">${formatSigned(l.montant)}</span></li>`);
  }
  return `
    <ul class="compta">
      ${lignes.length
        ? `<li class="compta-ligne compta-avant"><span>Solde avant</span><span class="num">${formatNumber(avant)}</span></li>${rows.join('')}`
        : '<li class="compta-vide muted">Aucun gain ni dépense pour l\'instant.</li>'}
      <li class="compta-ligne compta-total"><span>Total</span><span class="num">${formatNumber(total)} 💰</span></li>
    </ul>`;
}

function openComptaModal() {
  tel('modal', 'compta');
  document.getElementById('modal-root').innerHTML = `
    <div class="modal-backdrop" data-action="close-modal">
      <div class="modal bois" role="dialog" aria-modal="true" aria-labelledby="compta-title" data-stop-propagation>
        <h2 id="compta-title">💰 Comptes</h2>
        ${comptaHtml()}
        <button type="button" class="btn primary" data-action="close-modal" id="compta-close">Fermer</button>
      </div>
    </div>`;
  // les écritures les plus récentes, et le total, sont en bas
  const list = document.querySelector('#modal-root .compta');
  if (list) list.scrollTop = list.scrollHeight;
  document.getElementById('compta-close').focus();
}

registerActions({
  'open-compta': () => {
    openComptaModal();
  },
});
