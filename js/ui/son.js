/* ---------- le son, côté interface ----------
   Le moteur du son est js/son.js (window.FermeSon, script classique) ; ce module y relie
   l'interface : un bruit pour ce que note le journal de la partie (les pièces, ce qui est
   fabriqué), son(clé) pour les écrans, et la partie « Son » des Options (volumes de
   l'appareil, la musique continue, par moments ou coupée). Sans FermeSon, rien ne se passe. */

import { ecouterJournal } from '../engine/journal.js';

// Joue un bruit du jeu (voir les clés de js/son.js), s'il y a du son.
export function son(cle, options) {
  const S = window.FermeSon;
  if (S) S.joue(cle, options);
}

// Le matin : la ritournelle du jour, et le coq s'il y a des poules (js/son.js le sait).
export function sonMatin() {
  const S = window.FermeSon;
  if (S) S.matin();
}

ecouterJournal((type, d) => {
  if (type === 'pieces' && d && d.montant) son('pieces', { gain: d.montant > 0 ? 1 : 0.6, ecart: 0.4 });
  else if (type === 'fabrique') son('fabrique', { ecart: 0.3 });
});

/* ---------- Options › Son ---------- */

const CURSEURS = [
  ['general', '🔊 Volume général'],
  ['musique', '🎵 Musique'],
  ['ambiance', '🌳 Ambiance (nature, bêtes, machines)'],
  ['effets', '🪓 Gestes'],
  ['interface', '🔔 Fenêtres et messages'],
];
const MODES = [['intermittente', 'Par moments'], ['continue', 'Continue'], ['coupee', 'Coupée']];

export function sonHtml() {
  const S = window.FermeSon;
  if (!S) return '';
  const r = S.reglages();
  return `<div class="stack son-reglages">
    <strong>Son</strong>
    <label class="row check-row"><input type="checkbox" id="son-muet" ${r.muet ? 'checked' : ''}> 🔇 Couper tout le son</label>
    ${CURSEURS.map(([id, nom]) => `<label class="son-curseur" for="son-${id}"><span>${nom}</span>
      <input type="range" id="son-${id}" name="son-volume" data-son="${id}" min="0" max="100" step="5" value="${Math.round(r[id] * 100)}"></label>`).join('')}
    <div class="stack" role="radiogroup" aria-labelledby="son-mode-titre">
      <span id="son-mode-titre">🎼 Musique</span>
      <div class="row">${MODES.map(([id, nom]) => `<label class="row check-row"><input type="radio" name="son-mode" value="${id}" ${r.mode === id ? 'checked' : ''}> ${nom}</label>`).join('')}</div>
    </div>
    <p class="muted">« Par moments » : la musique revient de temps en temps, et la ferme s'entend seule entre deux. Réglage de cet appareil ; la partie n'en dépend pas.</p>
  </div>`;
}

document.addEventListener('input', (e) => {
  const S = window.FermeSon, t = e.target;
  if (!S || !t || t.name !== 'son-volume') return;
  S.regle({ [t.dataset.son]: Number(t.value) / 100 });
});
document.addEventListener('change', (e) => {
  const S = window.FermeSon, t = e.target;
  if (!S || !t) return;
  if (t.id === 'son-muet') S.regle({ muet: t.checked });
  else if (t.name === 'son-mode') S.regle({ mode: t.value });
  else if (t.name === 'son-volume') son(t.dataset.son === 'musique' ? 'reussite' : t.dataset.son === 'ambiance' ? 'oiseau' : t.dataset.son === 'effets' ? 'hache' : 'info');
});
