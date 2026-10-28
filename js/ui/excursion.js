import { DATA } from '../engine/catalog.js';
import { clockHours, nightActive } from '../engine/clock.js';
import { weekdayIndex } from '../engine/format.js';
import { mainCharacter, setupPending } from '../engine/depart.js';
import { memberPerso } from '../engine/family.js';
import { depositOreNotebook, hitsNeeded, mineOre } from '../engine/outils.js';
import { techFlag } from '../engine/techtree.js';
import { lumiereGrotte } from '../engine/equipement.js';
import { addItem } from '../engine/inventory.js';
import { axeMode, godMode, hoeMode, pickMode, rodMode, state } from './store.js';
import { persistState } from './storage.js';
import { refresh } from './render.js';
import { showToast } from './toasts.js';
import { ACTIONS, SOMMEIL_MESSAGE } from './actions.js';
import { asleep } from '../engine/night.js';
import { encyclopedieCarte } from './encyclopedie.js';
import { genererNiveau, idGrotteMonde, reglagesGrotte } from '../engine/grotte.js';
import { farmTerrain } from '../engine/terrain.js';
import { FIL, fissureDuNiveau, galerieOuverte, niveauGalerie, prendrePierre } from '../engine/fil-lune.js';

/* ---------- la mine de la ferme et les grottes de la montagne, dans la page du jeu ----------

   Les niveaux de la mine (js/grotte.js) s'affichent ici, dans #map-stage, à la place de la carte
   de la ferme : la carte du joueur, la date et l'argent, le menu latéral, la barre d'outils et
   les fenêtres restent là, et le jeu continue de tourner (le temps passe, le repas, la nuit).
   C'est le personnage principal de la partie qui s'y promène. La mine et la ferme sont des
   scènes d'un seul jeu Phaser (js/carte/jeu.js) : le canvas passe de #farm-stage à #map-stage,
   la ferme s'endort et se réveille telle qu'on l'a laissée.

   La mine passe par FermeHote (ci-dessous) : l'heure, le personnage, la pioche, le minerai,
   les messages, et go(cible) pour changer de niveau (« grotte?niveau=… ») ou remonter
   (« jeu.html… » : la ferme). L'adresse de la page suit (jeu.html?carte=grotte&…) : recharger
   la page y ramène.

   Les grottes de la montagne du grand monde (fiche 6b) sont la même scène : « grotte?grotte=
   grotte_<n>&… » (l'entrée du plan, js/carte/ferme/lieux-monde.js), leurs réglages et leurs
   niveaux tirés par le moteur (js/engine/grotte.js : reglagesGrotte, d'après la graine du monde
   de la partie ; genererNiveau). En remontant du premier niveau (« jeu.html?arrivee=grotte_<n> »),
   le personnage ressort devant l'entrée, dans le monde ; le temps a passé comme ailleurs. */

let active = null;          // les paramètres du niveau affiché (« ?niveau=… »), ou null (la ferme)

export function excursionActive() {
  return active !== null;
}

function mapEl() {
  return document.getElementById('map-stage');
}

// L'heure du jeu pour la mine : { jour, semaine (0 : lundi), heure, nuit }.
function maintenant() {
  return { jour: state.day, semaine: weekdayIndex(state.day), heure: clockHours(state), nuit: nightActive(state) };
}

// Une action du joueur dans la mine : passée au moteur, sauvegardée, l'écran rafraîchi.
function joue(r) {
  if (r && !r.ok && r.error) showToast(r.error);
  persistState();
  refresh();
  return r;
}

// Le personnage dort : piocher et cueillir sont refusés, comme les gestes de la ferme
// (js/ui/outils.js). Renvoie un refus, ou null.
function nuit() {
  if (!asleep(state)) return null;
  const r = { ok: false, error: SOMMEIL_MESSAGE };
  showToast(r.error);
  return r;
}

// Les cueillettes de la mine (champ « cueillette » de data/items.json : le champignon lumineux).
const CUEILLETTES = Object.keys(DATA.OBJETS).filter((id) => DATA.OBJETS[id].cueillette);

function ramasse(sorte) {
  const refus = nuit();
  if (refus) return refus;
  if (!CUEILLETTES.includes(sorte)) return joue({ ok: false, error: 'Cueillette inconnue.' });
  addItem(state, sorte, 1);
  return joue({ ok: true, item: sorte, n: 1 });
}

// Montre le niveau de la mine (search : « ?niveau=…&arrivee=… »), à la place de la ferme.
function ouvre(search) {
  const el = mapEl();
  if (!window.Grotte || !el) return false;
  active = search;
  el.hidden = false;
  el.dataset.carte = 'grotte';
  document.body.classList.add('en-excursion');
  const p = new URLSearchParams(search);
  p.set('carte', 'grotte');
  history.replaceState(null, '', 'jeu.html?' + p);
  refresh();
  if (window.Grotte.start(el, search) === false) { rentre(null); return false; }
  encyclopedieCarte('grotte'); // ses pages de l'Encyclopédie se découvrent
  if (idGrotteMonde(p.get('grotte'))) encyclopedieCarte('grotte_monde');
  return true;
}

// Retour à la ferme : `arrivee` : le personnage arrive devant la porte de la mine (« mine »),
// devant l'entrée d'une grotte du monde (« grotte_<n> »), ou là où il était (null).
function rentre(arrivee = null) {
  if (window.Grotte) window.Grotte.stop();
  active = null;
  const el = mapEl();
  if (el) { el.hidden = true; delete el.dataset.carte; }
  document.body.classList.remove('en-excursion');
  const ou = arrivee === 'mine' || idGrotteMonde(arrivee) ? arrivee : null;
  history.replaceState(null, '', 'jeu.html' + (ou ? '?arrivee=' + ou : ''));
  refresh();
  if (ou && window.FarmStage && window.FarmStage.arrive) window.FarmStage.arrive(ou);
}

// Changer de niveau (« grotte?… ») ou remonter (« jeu.html… » ramène à la ferme). Sans Phaser,
// le joueur reste où il est, avec un message.
export function go(cible) {
  const [page, query = ''] = String(cible || '').split('?');
  const search = query ? '?' + query : '';
  if (page.replace(/^.*\//, '') !== 'grotte') { rentre(new URLSearchParams(search).get('arrivee')); return; }
  if (ouvre(search)) return;
  if (active !== null) rentre(null);
  showToast('⛏️ La mine ne peut pas s\'afficher sur cet appareil.');
}

window.FermeHote = {
  maintenant,
  perso: () => memberPerso(mainCharacter(state)),
  go,
  // l'outil en main (barre d'outils) : 'hache', 'pioche', 'houe', 'canne' ou null
  enMain: () => (axeMode ? 'hache' : pickMode ? 'pioche' : hoeMode ? 'houe' : rodMode ? 'canne' : null),
  objet: (item) => (DATA.OBJETS[item] ? { nom: DATA.OBJETS[item].nom, icone: DATA.OBJETS[item].icone } : null),
  // un minerai pris (« fer », « cuivre »…) va dans l'inventaire ({ ok, item, n } ou { ok: false }) ;
  // le carnet d'avant y est versé une fois ; les coups qu'il faut (Lames affûtées) ; un réglage
  // de l'arbre des technologies (la Lampe de mineur : tech('grotte'))
  miner: (sorte) => nuit() || joue(mineOre(state, sorte)),
  verser: (carnet) => joue(depositOreNotebook(state, carnet)),
  coups: (base) => hitsNeeded(state, base),
  tech: (cle) => techFlag(state, cle),
  // fiche 11 : la lumière que donne l'équipement du personnage (le casque à lampe), en %
  lumiere: () => lumiereGrotte(state),
  // une cueillette (le champignon lumineux) va dans l'inventaire ({ ok, item, n } ou { ok: false })
  ramasser: ramasse,
  // les réglages de jeu de la grotte `id` (data/grotte.json, GROTTE : la mine de la ferme ; GROTTE.MONDE,
  // une grotte de la montagne, d'après la graine du monde de la partie) ; le tirage d'un niveau
  // (js/engine/grotte.js) ; une autre section de DATA n'est pas donnée à la scène
  reglages: (id) => {
    const M = idGrotteMonde(id) ? farmTerrain(state).MONDE : null;
    return reglagesGrotte(M ? id : 'ferme', M ? M.graine : '');
  },
  // (le récit, lot 10 : la galerie secrète de la mine de la ferme, js/engine/fil-lune.js ; « galerie » : la petite
  // chambre ; au niveau FIL.GALERIE.NIVEAU, quand elle s'ouvre, la fissure qui y mène)
  niveau: (J, n, jour) => {
    if (n === 'galerie') return niveauGalerie();
    const c = genererNiveau(J, n, jour);
    if (J.id === 'ferme' && n === FIL.GALERIE.NIVEAU && galerieOuverte(state)) c.fissure = fissureDuNiveau(c);
    return c;
  },
  // la pierre de la galerie : prise, elle va dans l'inventaire ({ ok, item } ou un refus) ; déjà prise ?
  pierre: () => joue(prendrePierre(state)),
  pierrePrise: () => !!(state.recit && state.recit.faits && state.recit.faits['pierre.trouvee']),
  say: (t) => showToast(t),
  // le god mode : un toucher pose le personnage, les flèches des niveaux sont toutes là
  god: () => godMode,
};

/* ---------- le god mode : un menu des niveaux ---------- */

// La ferme, quelques niveaux de la mine et une grotte de la montagne (la première entrée du plan),
// pour y aller d'un coup (Options : god mode).
const DESTINATIONS = [
  ['🌾 La ferme', 'jeu.html'],
  ['⛏️ La mine, niveau 1', 'grotte?niveau=1&arrivee=haut'],
  ['⛏️ La mine, niveau 4', 'grotte?niveau=4&arrivee=haut'],
  ['⛏️ La mine, niveau 8', 'grotte?niveau=8&arrivee=haut'],
  ['⛰️ Une grotte de la montagne', 'grotte?grotte=grotte_1&niveau=1&arrivee=haut'],
  ['⛰️ La même, niveau 4', 'grotte?grotte=grotte_1&niveau=4&arrivee=haut'],
  // (fiche 8 : le brouillard du grand monde, levé ou revenu partout : les actions du mode test, testmode.js)
  ['🗺️ Brouillard : tout voir', 'action:test-tout-voir'],
  ['🌫️ Brouillard : tout cacher', 'action:test-tout-cacher'],
];

// La barre du god mode (en haut de l'écran) : le menu des niveaux ; rien sans le god mode.
export function syncGodBar() {
  let bar = document.getElementById('god-bar');
  if (!godMode) { if (bar) bar.remove(); return; }
  if (!bar) {
    bar = document.createElement('div');
    bar.id = 'god-bar';
    bar.innerHTML = '<label><span aria-hidden="true">⚡</span><select aria-label="God mode : aller à…"></select></label>';
    const sel = bar.querySelector('select');
    sel.innerHTML = '<option value="">God mode : aller à…</option>' + DESTINATIONS.map(([t, c]) => `<option value="${c}">${t}</option>`).join('');
    sel.addEventListener('change', () => {
      const c = sel.value;
      sel.value = '';
      sel.blur();
      if (!c) return;
      if (c.startsWith('action:')) { const f = ACTIONS[c.slice(7)]; if (f) f({ dataset: {} }); return; }
      if (asleep(state)) { showToast(SOMMEIL_MESSAGE); return; }
      go(c);
    });
    document.body.appendChild(bar);
  }
}

// Le sommeil (« Dormir », ou la nuit passée hors du jeu) se passe à la maison : retour à la
// ferme. La nuit seule n'y oblige pas.
setInterval(() => {
  if (active === null) return;
  if (asleep(state)) { rentre(null); showToast('💤 Tu dors : retour à la maison.'); }
}, 500);

// Au chargement, l'adresse jeu.html?carte=grotte&… rouvre ce niveau (après la mise en place).
export function resumeExcursion() {
  syncGodBar();
  const p = new URLSearchParams(window.location.search);
  const carte = p.get('carte');
  if (!carte) return;
  if (carte !== 'grotte' || setupPending(state) || asleep(state)) { history.replaceState(null, '', 'jeu.html'); return; }
  p.delete('carte');
  go('grotte?' + p);
}
