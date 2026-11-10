import { clockHours, nightActive } from '../engine/clock.js';
import { weekdayIndex } from '../engine/format.js';
import { mainCharacter } from '../engine/depart.js';
import { memberApparence, memberPerso } from '../engine/family.js';
import { coiffeCarte } from '../engine/equipement.js';
import { godMode, state } from './store.js';
import { showToast } from './toasts.js';
import { ACTIONS } from './actions.js';

/* ---------- ce que la page donne aux scripts des cartes (window.FermeHote) ----------

   Les scripts classiques des cartes (js/carte/) lisent ici l'heure du jeu (le son, js/son.js), le personnage
   principal (sa planche, js/carte/kit.js) et disent un message (FermeHote.say : l'astuce de la marche au doigt,
   js/carte/gestes.js). La mine et les grottes de la montagne, qui passaient aussi par ici, ne sont plus
   (docs/gisements.md, lot 4). */

// L'heure du jeu : { jour, semaine (0 : lundi), heure, nuit } ; null avant que la partie soit chargée.
function maintenant() {
  if (!state) return null;
  return { jour: state.day, semaine: weekdayIndex(state.day), heure: clockHours(state), nuit: nightActive(state) };
}

window.FermeHote = {
  maintenant,
  perso: () => memberPerso(mainCharacter(state)),
  apparence: () => memberApparence(mainCharacter(state)),
  coiffe: () => (mainCharacter(state) ? coiffeCarte(state, mainCharacter(state).id) : null),
  say: (t) => showToast(t),
  god: () => godMode,
};

/* ---------- le god mode : un menu d'actions de test ---------- */

// (fiche 8 : le brouillard du grand monde, levé ou revenu partout : les actions du mode test, testmode.js)
const DESTINATIONS = [
  ['🗺️ Brouillard : tout voir', 'action:test-tout-voir'],
  ['🌫️ Brouillard : tout cacher', 'action:test-tout-cacher'],
];

// La barre du god mode (en haut de l'écran) : son menu ; rien sans le god mode.
export function syncGodBar() {
  let bar = document.getElementById('god-bar');
  if (!godMode) { if (bar) bar.remove(); return; }
  if (!bar) {
    bar = document.createElement('div');
    bar.id = 'god-bar';
    bar.innerHTML = '<label><span aria-hidden="true">⚡</span><select aria-label="God mode : faire…"></select></label>';
    const sel = bar.querySelector('select');
    sel.innerHTML = '<option value="">God mode : faire…</option>' + DESTINATIONS.map(([t, c]) => `<option value="${c}">${t}</option>`).join('');
    sel.addEventListener('change', () => {
      const c = sel.value;
      sel.value = '';
      sel.blur();
      const f = c && c.startsWith('action:') ? ACTIONS[c.slice(7)] : null;
      if (f) f({ dataset: {} });
    });
    document.body.appendChild(bar);
  }
}

// Une ancienne adresse de la mine (jeu.html?carte=grotte&…, gardée par le navigateur) : la ferme.
export function oublierAdresseMine() {
  syncGodBar();
  const p = new URLSearchParams(window.location.search);
  if (p.get('carte') || p.get('arrivee')) history.replaceState(null, '', 'jeu.html');
}
