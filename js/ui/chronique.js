import { setupPending } from '../engine/depart.js';
import { villageActif } from '../engine/village.js';
import { assurerArrivee, epinglerLigne, noterLigne, renommerEtNoter } from '../engine/chronique.js';
import { nomDe, nomRefus, nomsDe, proposerNom } from '../engine/noms.js';
import { chroniqueHtml, noteHtml, renommerHtml } from './chronique-html.js';
import { state } from './store.js';
import { persistState } from './storage.js';
import { refresh } from './render.js';
import { notify } from './toasts.js';
import { openModal } from './modal.js';
import { modalOpen } from './calme.js';
import { registerActions } from './actions.js';
import { escapeHtml } from '../engine/format.js';
import { ouvrirFicheVillageois } from './villageois.js';

/* ---------- la chronique et les noms, côté page (le chantier « l'île à bâtir », fiche I7g) ----------

   Le moteur : js/engine/chronique.js (les lignes, la borne, les épingles, les notes) et js/engine/noms.js (l'île, le
   village, les commerces, les maisons). Ici :
     - la fenêtre (le bouton 📜 du menu, et celui de la liste des villageois) : les noms, les lignes épinglées, la
       chronique par mois de lune (js/ui/chronique-html.js) ; 📌 épingle une ligne, ✏️ y écrit une note ;
     - nommer l'île ou le village (« ✏️ Renommer » : le champ, « 🎲 Un autre nom ») ;
     - la veille (watchChronique, à chaque tour de la boucle, au plus une fois par seconde) : la ligne de l'arrivée une
       fois la famille configurée ; le baptême du village (le troisième villageois : le nom proposé, à garder ou à
       changer), dès qu'aucune fenêtre n'est ouverte.
   Le chantier éteint, rien ne se montre. Tant que le récit est là (fiche I7c), le carnet reste à côté. */

const VEILLE_MS = 1000;
let veille = -Infinity;

export function ouvrirChronique() {
  openModal(chroniqueHtml(state), { labelledBy: 'chronique-titre', id: 'chronique-modal', className: 'modal bois chronique-modal', focus: '#chronique-fermer', preventScroll: true });
}

function ouvrirRenommer(quoi, rang = 0, o = {}) {
  const id = quoi === 'maison' ? o.id : null;
  const valeur = o.valeur !== undefined ? o.valeur : rang > 0 || !nomDe(state, quoi, id) ? proposerNom(state, quoi, id, rang) : nomDe(state, quoi, id);
  openModal(renommerHtml(state, quoi, valeur, rang, o), { labelledBy: 'noms-titre', className: 'modal bois chronique-modal', focus: '#noms-champ', preventScroll: true });
}

// À chaque tour de la boucle : l'arrivée notée, le baptême du village proposé.
export function watchChronique() {
  if (!state || !villageActif(state) || setupPending(state)) return;
  const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
  if (now - veille < VEILLE_MS) return;
  veille = now;
  if (assurerArrivee(state)) persistState();
  const n = state.noms;
  if (n && Array.isArray(n.avis) && n.avis.includes('village') && !modalOpen()) {
    n.avis = n.avis.filter((a) => a !== 'village');
    persistState();
    notify(`🏘️ L'île a maintenant un village : ${escapeHtml(nomDe(state, 'village') || '')}.`, { kind: 'info' });
    ouvrirRenommer('village', 0, { bapteme: true, valeur: nomDe(state, 'village') || '' });
  }
}

// Le bouton du menu (js/ui/stage-windows.js) : '' le chantier éteint.
export function chroniqueBouton() {
  if (!state || !villageActif(state)) return '';
  return '<button type="button" class="nav-btn" data-action="chronique-open" title="Chronique" aria-label="La chronique de l\'île"><span class="nav-icon" aria-hidden="true">📜</span><span class="nav-label">Chronique</span></button>';
}

const quoiDe = (t) => (['ile', 'village', 'maison'].includes(t.dataset.quoi) ? t.dataset.quoi : 'village');
const optionsDe = (t) => ({ id: t.dataset.id !== undefined ? Number(t.dataset.id) : undefined, retour: t.dataset.retour || undefined });
const champ = (id) => { const el = document.getElementById(id); return el ? el.value : ''; };
const erreur = (id, texte) => { const el = document.getElementById(id); if (el) el.textContent = texte; };

registerActions({
  'chronique-open': () => ouvrirChronique(),
  'chronique-epingler': (target) => {
    const n = Number(target.dataset.n), l = (state.chronique && state.chronique.lignes || []).find((x) => x.n === n);
    const r = epinglerLigne(state, n, !(l && l.epingle));
    if (!r.ok) { notify(escapeHtml(r.error), { kind: 'alerte' }); return; }
    persistState();
    ouvrirChronique();
  },
  'chronique-note': (target) => {
    openModal(noteHtml(state, target.dataset.n), { labelledBy: 'note-titre', className: 'modal bois chronique-modal', focus: '#note-champ', preventScroll: true });
  },
  'chronique-note-ok': (target) => {
    const r = noterLigne(state, Number(target.dataset.n), champ('note-champ'));
    if (!r.ok) { erreur('note-erreur', r.error); return; }
    persistState();
    ouvrirChronique();
  },
  'chronique-note-effacer': (target) => {
    noterLigne(state, Number(target.dataset.n), '');
    persistState();
    ouvrirChronique();
  },
  'noms-renommer': (target) => ouvrirRenommer(quoiDe(target), 0, optionsDe(target)),
  'noms-autre': (target) => ouvrirRenommer(quoiDe(target), Number(target.dataset.rang) || 1, { ...optionsDe(target), bapteme: target.dataset.bapteme === '1' }),
  'noms-ok': (target) => {
    const quoi = quoiDe(target), o = optionsDe(target), texte = champ('noms-champ');
    const refus = nomRefus(texte);
    if (refus) { erreur('noms-erreur', refus); return; }
    nomsDe(state);
    const r = renommerEtNoter(state, quoi, texte, quoi === 'maison' ? o.id : null);
    if (!r.ok) { erreur('noms-erreur', r.error); return; }
    persistState();
    refresh();
    if (r.avant !== r.nom) notify(`${quoi === 'ile' ? '🏝️ L\'île' : quoi === 'maison' ? '🏠 La maison' : '🏘️ Le village'} s'appelle ${escapeHtml(r.nom)}.`, { kind: 'info' });
    if (o.retour) ouvrirFicheVillageois(o.retour);
    else ouvrirChronique();
  },
});
