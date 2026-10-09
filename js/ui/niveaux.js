import { DATA } from '../engine/catalog.js';
import { levelCount, levelProgress, levelUnlocks } from '../engine/levels.js';
import { formatNumber } from '../engine/format.js';
import { state } from './store.js';
import { tel } from './consent.js';
import { registerActions } from './actions.js';

/* ---------- version 1.7 : niveaux d'expérience ---------- */

// Ce que débloque un niveau, en liste : éléments (bâtiments, ateliers) puis cultures.
export function unlocksHtml(niveau) {
  const u = levelUnlocks(niveau);
  const items = [
    ...u.elements.map((id) => {
      const e = DATA.NIVEAUX.ELEMENTS[id];
      return `<li><strong>${e.icone} ${e.nom}</strong><br><span class="muted">${e.note}</span></li>`;
    }),
    ...(u.cultures.length
      ? [`<li><strong>🌱 Cultures</strong><br><span class="muted">${u.cultures.map((c) => `${DATA.crops[c].icone} ${DATA.crops[c].nom}`).join(', ')}</span></li>`]
      : []),
    ...(u.note ? [`<li class="muted">${u.note}</li>`] : []),
  ];
  return items.length ? `<ul class="unlock-list">${items.join('')}</ul>` : '';
}

// Barre d'expérience : niveau, XP et ce qu'il reste jusqu'au suivant.
export function levelBarHtml() {
  const p = levelProgress(state);
  const label = p.max ? `${formatNumber(p.xp)} XP · niveau maximum` : `${formatNumber(p.xp)} / ${formatNumber(p.fin)} XP`;
  return `
    <span class="level-line"><span>⭐ Niveau ${p.niveau}</span> <span class="muted">·</span> <span class="num">${label}</span></span>
    <span class="bar" role="progressbar" aria-label="Expérience jusqu'au niveau suivant" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${p.pct}"><span class="bar-fill" style="width:${p.pct}%"></span></span>`;
}

// Écran « Niveau n atteint » : ce qu'il débloque.
function openLevelUpModal() {
  const a = state.progression.annonces[0];
  if (!a) return;
  tel('modal', 'level');
  document.getElementById('modal-root').innerHTML = `
    <div class="modal-backdrop" data-action="close-modal">
      <div class="modal" id="level-modal" role="dialog" aria-modal="true" aria-labelledby="level-title" data-stop-propagation>
        <h2 id="level-title">⭐ Niveau ${a.niveau} atteint</h2>
        ${unlocksHtml(a.niveau) ? `<h3>✨ Nouveautés</h3>${unlocksHtml(a.niveau)}` : '<p class="muted">Rien de nouveau à ce niveau.</p>'}
        <div class="stack">${levelBarHtml()}</div>
        <button type="button" class="btn primary" data-action="close-modal" id="level-close">Continuer</button>
      </div>
    </div>`;
  document.getElementById('level-close').focus();
}

// Ouvre l'écran d'un niveau atteint dès qu'aucune autre fenêtre n'est ouverte.
export function watchLevels() {
  const p = state.progression;
  if (!p || !p.annonces.length) return;
  if (document.getElementById('modal-root').childElementCount === 0) openLevelUpModal();
}

// Tous les niveaux : seuil, déblocages, atteint ou non.
function openLevelsModal() {
  tel('modal', 'levels');
  const p = levelProgress(state);
  const rows = [];
  for (let n = 1; n <= levelCount(); n++) {
    const done = n <= p.niveau;
    rows.push(`
      <li class="objective${done ? ' ok' : ''}">
        <span class="objective-line"><span class="objective-label">${done ? '✅' : '⬜'} Niveau ${n}</span><span class="objective-value">${formatNumber(DATA.NIVEAUX.SEUILS[n - 1])} XP</span></span>
        ${unlocksHtml(n)}
      </li>`);
  }
  const xp = DATA.NIVEAUX.XP;
  document.getElementById('modal-root').innerHTML = `
    <div class="modal-backdrop" data-action="close-modal">
      <div class="modal" role="dialog" aria-modal="true" aria-labelledby="levels-title" data-stop-propagation>
        <h2 id="levels-title">⭐ Niveaux</h2>
        <div class="stack">${levelBarHtml()}</div>
        <p class="muted">L'expérience vient de tes actions : planter ${xp.planter} XP, arroser ${xp.arroser}, récolter ${xp.recolter}, cuisiner ${xp.cuisiner}, cuire au four ${xp.cuireFour}, moudre ${xp.moudre}, tondre ${xp.tondre} ; chaque œuf ${xp.oeuf}, chaque lait ${xp.lait} ; ${xp.vendre} XP par pièce gagnée au Marché ; et de chaque chapitre terminé. Une automatisation rapporte ${DATA.NIVEAUX.AUTO} % de l'XP de l'action.</p>
        <ul class="objectives">${rows.join('')}</ul>
        <button type="button" class="btn primary" data-action="close-modal" id="levels-close">Fermer</button>
      </div>
    </div>`;
  document.getElementById('levels-close').focus();
}

/* ---------- actions de cet écran (voir ui/actions.js) ---------- */

registerActions({
  'open-levels': () => {
    openLevelsModal();
  },
});
