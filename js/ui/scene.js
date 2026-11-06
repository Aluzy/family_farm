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
import { stageActive, stageUsable } from './stage.js';

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
  if (scene || enCarte || modalOpen()) return false;
  // une scène sur la carte (« carte » : l'arrivée de Fernand) attend que la carte de la ferme soit là ; sans
  // carte du tout (Phaser absent ou planté), elle se joue dans la fenêtre, comme les autres
  const def = RECIT.SCENES.find((x) => x.id === id) || {};
  if (def.carte && stageUsable() && !stageActive()) return false;
  if (def.carte && stageUsable()) return ouvrirSurCarte(id, ctx);
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
  babilLigne();
  return true;
}

// Ouvre la plus prioritaire des scènes qui peuvent se jouer dans ce contexte, si l'écran est calme.
export function proposerScene(ctx = {}) {
  montrerEnAttente();
  oublierSiRemplacee();
  if (scene || enCarte || !uiCalm()) return false;
  const ids = scenesPossibles(state, ctx);
  return ids.length ? ouvrirScene(ids[0], ctx) : false;
}

// La scène ouverte (pour les tests et le déclencheur) : son id, ou null.
export function sceneOuverte() {
  oublierSiRemplacee();
  return scene ? scene.id : enCarte ? enCarte.id : null;
}

/* ---------- une scène sur la carte (« carte » : l'arrivée de Fernand) ----------

   Le premier personnage de la scène vient à pied jusqu'au personnage du joueur (js/carte/ferme/rencontre.js) ;
   puis les répliques se suivent en bulles, au-dessus de qui parle (lui, ou le personnage du joueur : « joueur »),
   une à chaque appui sur la carte (ou Entrée, Espace) ; à la fin, il repart d'où il est venu. Pendant qu'il vient
   et qu'ils parlent, l'heure ne tourne pas, le personnage ne bouge pas et les autres fenêtres attendent (le corps
   de la page porte la classe scene-carte : calme.js storyOpen, uiCalm). La scène est notée dès qu'elle commence,
   comme les autres. Le modèle de la carte (stage.js) : sceneCarteModele() ; ses nouvelles : sceneCarteDepuisCarte. */

let enCarte = null; // { id, lignes, i, phase : 'vient' | 'parle' | 'part', perso, depart }

function ouvrirSurCarte(id, ctx) {
  const r = jouerScene(state, id, ctx);
  if (!r.ok) return false;
  persistState();
  const qui = r.lignes[0] && r.lignes[0].qui, P = RECIT.PERSONNAGES[qui] || {};
  const T = farmTerrain(state);
  enCarte = { id, lignes: r.lignes, i: 0, phase: 'vient', qui, nom: P.nom || '', perso: P.perso || 1, depart: Number.isInteger(T.SORTIE) ? T.SORTIE : null };
  document.body.classList.add('scene-carte');
  document.addEventListener('keydown', toucheCarte, true);
  refresh();
  return true;
}

// Entrée, Espace : la réplique suivante ; Échap : la scène écourtée (il repart)
function toucheCarte(e) {
  if (!enCarte || enCarte.phase !== 'parle' || modalOpen()) return;
  if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); sceneCarteDepuisCarte('suite'); }
  else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); finDesParoles(); }
}

function finDesParoles() {
  if (!enCarte) return;
  enCarte.phase = 'part';
  document.body.classList.remove('scene-carte');
  document.removeEventListener('keydown', toucheCarte, true);
  refresh();
}

function babilCarte() {
  const S = window.FermeSon, l = enCarte && enCarte.lignes[enCarte.i];
  if (S && S.babil && l && l.qui !== 'joueur') S.babil(l.texte, S.voixDe({ recit: l.qui, id: l.qui }));
}

// Pour le modèle de la carte : null, ou { phase, qui, nom, perso, depart (une case du monde, ou null), ligne :
// { qui, nom, texte } (pendant qu'ils parlent), i, n }.
export function sceneCarteModele() {
  if (!enCarte) return null;
  const l = enCarte.phase === 'parle' ? enCarte.lignes[enCarte.i] : null;
  return { phase: enCarte.phase, qui: enCarte.qui, nom: enCarte.nom, perso: enCarte.perso, depart: enCarte.depart, ligne: l, i: enCarte.i, n: enCarte.lignes.length };
}

// Ce que la carte dit : « la » (il est arrivé près du personnage), « suite » (un appui : la réplique suivante),
// « fini » (reparti, il s'est effacé).
export function sceneCarteDepuisCarte(quoi) {
  if (!enCarte) return;
  if (quoi === 'la' && enCarte.phase === 'vient') { enCarte.phase = 'parle'; enCarte.i = 0; babilCarte(); refresh(); }
  else if (quoi === 'suite' && enCarte.phase === 'parle') {
    if (enCarte.i >= enCarte.lignes.length - 1) finDesParoles();
    else { enCarte.i++; babilCarte(); refresh(); }
  } else if (quoi === 'fini') {
    if (enCarte.phase !== 'part') finDesParoles();
    enCarte = null;
    refresh();
  }
}

function suite() {
  if (!scene) return;
  scene.i = Math.min(scene.i + 1, scene.lignes.length - 1);
  const d = modalDialog();
  if (d) d.innerHTML = ligneHtml();
  focusModal('#scene-bouton');
  babilLigne();
}

// G-2 : la ligne affichée, dite en babil, à la voix de qui parle (js/son.js).
function babilLigne() {
  const S = window.FermeSon, l = scene && scene.lignes[scene.i];
  if (S && S.babil && l) S.babil(l.texte, S.voixDe({ recit: l.qui, id: l.qui }));
}

/* ---------- actions de cet écran (voir ui/actions.js) ---------- */

registerActions({
  'scene-suite': () => suite(),
  'scene-fermer': () => closeModal(),
});
