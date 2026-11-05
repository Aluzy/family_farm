// demandes.js — V-2 (docs/phase-4.md) : les petites demandes des habitants (le moteur : js/engine/demandes.js).
// - au matin, une nouvelle demande s'annonce (watchDemandes) ;
// - le carnet des demandes (📜, dans le menu, tant qu'il y en a une) : qui, quoi, ce que tu en as, le temps
//   qui reste. On la rend en allant voir la personne : sa bulle › 🎁 Offrir › « Donner » (demandeHtml) ;
// - rien ne se perd si on ne la fait pas : elle s'oublie.

import { DATA } from '../engine/catalog.js';
import { escapeHtml, formatQty } from '../engine/format.js';
import { countItem } from '../engine/inventory.js';
import { asleep } from '../engine/night.js';
import { habitantsDe } from '../engine/habitants.js';
import { annonceDemande, demandeDe, demandesDe, demandesOuvertes, rendreDemande, texteDemande } from '../engine/demandes.js';
import { registerActions, SOMMEIL_MESSAGE } from './actions.js';
import { closeModal, openModal } from './modal.js';
import { state } from './store.js';
import { persistState } from './storage.js';
import { refresh } from './render.js';
import { notify } from './toasts.js';

const nom = (it) => (DATA.OBJETS[it] ? `${DATA.OBJETS[it].icone} ${escapeHtml(DATA.OBJETS[it].nom)}` : escapeHtml(it));
const hameauNom = (hid) => { const h = habitantsDe(state)[hid]; return h ? escapeHtml(h.nom) : 'un hameau'; };
const reste = (d) => { const j = d.fin - state.day + 1; return j <= 1 ? 'dernier jour' : `encore ${j} jours`; };

// Au matin : les demandes de la nuit, annoncées une fois.
export function watchDemandes() {
  const d = demandesDe(state);
  if (!d.annonces.length) return;
  const ids = d.annonces.splice(0);
  for (const id of ids) {
    const dem = d.liste.find((x) => x.id === id);
    if (dem) notify(`${annonceDemande(state, dem)} (📜 dans le menu)`, { kind: 'info' });
  }
  persistState();
}

// Dans la fenêtre « Offrir » d'un habitant : sa demande, et de quoi la rendre (ou ce qui manque).
export function demandeHtml(id) {
  const dem = demandeDe(state, id);
  if (!dem) return '';
  const a = countItem(state, dem.objet), ok = a >= dem.n;
  return `<div class="demande-offrir"><p>📜 <strong>Sa demande</strong> : ${dem.n} × ${nom(dem.objet)} <span class="muted">(tu en as ${formatQty(a)} · ${reste(dem)})</span></p>
    <p class="muted">« ${escapeHtml(texteDemande(dem))} »</p>
    <button type="button" class="btn${ok ? ' primary' : ''}" data-action="demande-rendre" data-id="${escapeHtml(dem.id)}"${ok ? '' : ' disabled'}>${ok ? `Donner ${dem.n} × ${nom(dem.objet)}` : `Il t'en manque ${formatQty(dem.n - a)}`}</button></div>`;
}

// Le carnet des demandes.
function ouvrirCarnet() {
  const L = demandesOuvertes(state);
  const lignes = L.length ? L.map((d) => {
    const a = countItem(state, d.objet);
    return `<li><strong>${escapeHtml(d.prenom)}</strong>, de ${hameauNom(d.hameau)} : ${d.n} × ${nom(d.objet)} <span class="muted">· ${escapeHtml(d.motif)} · tu en as ${formatQty(a)}${a >= d.n ? ' ✓' : ''} · ${reste(d)}</span></li>`;
  }).join('') : '<li class="muted">Personne ne te demande rien pour l\'instant.</li>';
  openModal(`
    <button class="btn modal-close" type="button" data-action="close-modal">Fermer</button>
    <h2 id="demandes-titre">📜 Les demandes</h2>
    <p class="muted">Des habitants des hameaux te demandent un coup de main. Rien ne presse : une demande que tu ne fais pas s'oublie, sans rien coûter. Pour en rendre une, va voir la personne : sa bulle › 🎁 Offrir › Donner.</p>
    <ul class="journal-monde">${lignes}</ul>
    <p class="muted">Demandes rendues : ${demandesDe(state).faites}.</p>`, { labelledBy: 'demandes-titre' });
}

// Le bouton du menu (tant qu'une demande est ouverte).
export function demandesBouton() {
  const n = demandesOuvertes(state).length;
  if (!n) return '';
  return `<button type="button" class="nav-btn" data-action="demandes-open" title="Demandes" aria-label="Demandes (${n})"><span class="nav-icon" aria-hidden="true">📜<span class="nav-badge" aria-hidden="true">${n}</span></span><span class="nav-label">Demandes</span></button>`;
}

registerActions({
  'demandes-open': () => { ouvrirCarnet(); },
  'demande-rendre': (target) => {
    if (asleep(state)) { notify(SOMMEIL_MESSAGE); return; }
    const dem = demandesOuvertes(state).find((x) => x.id === target.dataset.id);
    const r = rendreDemande(state, target.dataset.id);
    closeModal();
    if (!r.ok) { notify(r.error, { son: 'erreur' }); return; }
    persistState();
    refresh();
    notify(`📜 ${r.prenom} : « ${r.merci} » · 💛 +${r.points}${r.monte ? ' · un palier de plus !' : ''}`, { kind: 'info' });
    if (dem && window.FarmStage && window.FarmStage.emotion) window.FarmStage.emotion(dem.membre, 'joie');
  },
});
