import { escapeHtml } from '../engine/format.js';
import { jouerScene, RECIT, scenesPossibles } from '../engine/recit.js';
import { state } from './store.js';
import { persistState } from './storage.js';
import { refresh } from './render.js';
import { registerActions } from './actions.js';
import { closeModal, focusModal, modalDialog, openModal } from './modal.js';
import { modalOpen, uiCalm } from './calme.js';
import { persoHtml } from './famille.js';
import { notify } from './toasts.js';
import { farmTerrain } from '../engine/terrain.js';
import { butBoussole, choisirBut, montrerLieu } from '../engine/monde-vu.js';
import { solDuMonde } from './monde-sol.js';

/* ---------- les scènes du récit (docs/recit/dialogues.md, « les formats ») ----------

   Une scène est une petite fenêtre où quelques répliques se suivent, une à la fois, au toucher
   (« Suite »). Le moteur choisit et note la scène (jouerScene, js/engine/recit.js) : elle est jouée dès
   qu'elle s'ouvre, et ne revient jamais, même fermée avant la fin (le fond ou Échap la ferment). Elle
   attend que l'écran soit calme (FLU-17, js/ui/calme.js) : jamais deux fenêtres à la fois.

   ouvrirScene(id, ctx) : ouvre la scène `id` si elle peut se jouer (ctx : le contexte du récit, voir
   js/engine/recit.js) ; proposerScene(ctx) : ouvre la plus prioritaire de celles qui peuvent se jouer,
   si l'écran est calme. Les déclencheurs : la boucle (loop.js : l'arrivée, sans lieu), la calèche garée à
   la ferme (caleche.js : « caleche_ferme »), la maison de Maurice (stage.js : « maison_maurice »).

   La fenêtre porte aussi la classe story-modal (calme.js, storyOpen) : l'heure ne tourne pas pendant une
   scène, et la bulle du didacticiel attend. Après la scène, la page fait ce que le moteur ne peut pas
   faire : montrer le Gué sur la carte du monde (effet « montrer », la boussole y est menée si elle n'a pas
   de but) et annoncer la page du carnet gagnée (effet « fragment », js/ui/carnet.js). */

let scene = null; // { id, lignes: [{ qui, nom, texte }], i }
let aMontrer = null; // les hameaux garantis à montrer sur la carte du monde dès que ses lieux sont tirés ([« gue »…])

// Une autre fenêtre a pu prendre la place de la scène (openModal remplace sans fermer) : la scène est
// alors finie (elle est notée dès son ouverture : rien ne se perd).
function oublierSiRemplacee() {
  if (scene && !document.getElementById('scene-modal')) scene = null;
}

// Les hameaux garantis à montrer (le Gué, Brumeval pour la fête, les Genêts et Bois-Joli pour la tournée
// d'Achille) sur la carte du monde : leur cercle vu (montrerLieu), la boussole menée vers le premier si elle
// n'a pas de but. Les lieux du monde viennent du Web Worker (monde-sol.js) : tant qu'ils manquent, on réessaie.
function montrerEnAttente() {
  if (!aMontrer || !aMontrer.length) return;
  const T = farmTerrain(state), sol = T.MONDE ? solDuMonde(T) : null, lieux = sol && sol.lieux();
  if (!T.MONDE) { aMontrer = null; return; }
  if (!lieux) return;
  const ids = aMontrer;
  aMontrer = null;
  let premier = true;
  for (const g of ids) {
    const h = (lieux.hameaux || []).find((x) => x.garanti === g || (g === 'gue' && x.gue));
    if (!h) continue;
    montrerLieu(state, h.case, 6);
    if (premier && !butBoussole(state)) choisirBut(state, { sorte: 'hameau', id: h.id });
    premier = false;
  }
  persistState();
}

function ligneHtml() {
  const l = scene.lignes[scene.i];
  const P = RECIT.PERSONNAGES[l.qui] || {};
  const derniere = scene.i >= scene.lignes.length - 1;
  const portrait = P.perso ? `<span class="scene-portrait">${persoHtml(P.perso, !!(P.habite && P.habite.enfant))}</span>` : '';
  return `
    <div class="scene-ligne">
      ${portrait}
      <div class="scene-parole">
        <h2 id="scene-nom" class="scene-nom">${escapeHtml(l.nom)}</h2>
        <p class="scene-texte" aria-live="polite">${escapeHtml(l.texte)}</p>
      </div>
    </div>
    <div class="scene-pied">
      <span class="scene-rang muted num" aria-hidden="true">${scene.i + 1} / ${scene.lignes.length}</span>
      <button type="button" class="btn primary" id="scene-bouton" data-action="${derniere ? 'scene-fermer' : 'scene-suite'}">${derniere ? 'Fermer' : 'Suite ›'}</button>
    </div>`;
}

// Ouvre la scène `id` si elle peut se jouer maintenant (et si aucune fenêtre n'est ouverte) ; elle
// est notée tout de suite dans la partie. → true si elle s'est ouverte.
export function ouvrirScene(id, ctx = {}) {
  oublierSiRemplacee();
  if (scene || modalOpen()) return false;
  const r = jouerScene(state, id, ctx);
  if (!r.ok) return false;
  persistState();
  scene = { id, lignes: r.lignes, i: 0 };
  const effet = (RECIT.SCENES.find((x) => x.id === id) || {}).effet || {};
  if (effet.montrer) aMontrer = Array.isArray(effet.montrer) ? effet.montrer.slice() : [effet.montrer];
  montrerEnAttente();
  openModal(ligneHtml(), {
    labelledBy: 'scene-nom', id: 'scene-modal', className: 'modal bois scene-modal story-modal', focus: '#scene-bouton',
    onClose: () => {
      scene = null;
      const page = effet.fragment && RECIT.FRAGMENTS[effet.fragment];
      if (page) notify(`📓 Une page de plus dans ton carnet : « ${page.titre} ».`, { kind: 'info' });
      refresh();
    },
  });
  return true;
}

// Ouvre la plus prioritaire des scènes qui peuvent se jouer dans ce contexte, si l'écran est calme.
export function proposerScene(ctx = {}) {
  montrerEnAttente();
  oublierSiRemplacee();
  if (scene || !uiCalm()) return false;
  const ids = scenesPossibles(state, ctx);
  return ids.length ? ouvrirScene(ids[0], ctx) : false;
}

// La scène ouverte (pour les tests et le déclencheur) : son id, ou null.
export function sceneOuverte() {
  oublierSiRemplacee();
  return scene ? scene.id : null;
}

function suite() {
  if (!scene) return;
  scene.i = Math.min(scene.i + 1, scene.lignes.length - 1);
  const d = modalDialog();
  if (d) d.innerHTML = ligneHtml();
  focusModal('#scene-bouton');
}

/* ---------- actions de cet écran (voir ui/actions.js) ---------- */

registerActions({
  'scene-suite': () => suite(),
  'scene-fermer': () => closeModal(),
});
