import { DATA } from '../engine/catalog.js';
import { isOwned, starterOf } from '../engine/devices.js';
import {
  buyStarter, familyName, finishSetup, houseRepaired, mainCharacter, repairHouse, setFamilyName,
  setMainCharacter, setupPending, starterBlock,
} from '../engine/depart.js';
import { familyNeed, memberPortrait } from '../engine/family.js';
import { escapeHtml, formatCoins, formatNumber } from '../engine/format.js';
import { state } from './store.js';
import { persistState } from './storage.js';
import { applyResult } from './game-actions.js';
import { refresh } from './render.js';
import { memberNameHtml } from './famille.js';
import { showToast } from './toasts.js';
import { registerActions } from './actions.js';
import { canPay, closeModal, costLabel } from './common.js';
import { tel } from './consent.js';

/* ---------- version 1.12 (v2, lot 8) : le départ d'une nouvelle partie ---------- */

// Le nom de famille est saisi par le joueur : comme les prénoms, il passe toujours par
// escapeHtml(), reste sur l'appareil et ne va jamais dans un attribut data-* ni dans tel().
export function familyNameHtml() {
  return escapeHtml(familyName(state));
}

// « la famille Martin », ou « la famille » sans nom (ancienne partie).
export function familyLabelHtml() {
  const nom = familyNameHtml();
  return nom ? `la famille ${nom}` : 'la famille';
}

// Texte d'un courrier ou de l'histoire : {nom} devient le nom de famille.
export function withFamilyName(text) {
  return escapeHtml(text).replace(/\{nom\}/g, familyNameHtml() || '');
}

const STARTER_LABELS = {
  panneau: { icone: '☀️', nom: 'Panneau solaire', note: 'produit l\'électricité de 7 h à 19 h ; sans batterie, il alimente directement la pompe' },
  pompe: { icone: '⛲', nom: 'Pompe', note: 'remplit le réservoir avec l\'électricité du panneau' },
  reservoir: { icone: '💧', nom: 'Réservoir', note: 'garde l\'eau pour arroser' },
  batterie: { icone: '🔋', nom: 'Batterie (facultative)', note: 'garde l\'électricité pour le soir et la nuit' },
};

// Maison › Installations, avant tout : la maison à réparer, puis les appareils à acheter.
export function renderStarterCards() {
  if (!houseRepaired(state)) {
    const cost = DATA.DEPART.MAISON;
    return `
      <div class="card starter house">
        <span class="card-title"><span>🏚️ La maison du grand-père</span><span class="chip warn">À réparer</span></span>
        <span class="muted">Le toit fuit et les volets sont fermés. Tant qu'elle n'est pas réparée, rien d'autre ne s'installe.</span>
        <button type="button" class="btn primary" data-action="repair-house"${canPay(cost) ? '' : ' disabled'}>Réparer la maison (${costLabel(cost)})</button>
      </div>`;
  }
  const rows = ['panneau', 'pompe', 'reservoir', 'batterie']
    .filter((t) => !isOwned(starterOf(state, t)))
    .map((t) => {
      const L = STARTER_LABELS[t];
      const cost = DATA.DEPART.ACHATS[t];
      const raison = starterBlock(state, t);
      return `
        <div class="starter-row">
          <span><span aria-hidden="true">${L.icone}</span> <strong>${L.nom}</strong><br><span class="muted">${L.note}</span></span>
          ${raison
            ? `<span class="muted">${escapeHtml(raison)}</span>`
            : `<button type="button" class="btn${t === 'batterie' ? '' : ' primary'}" data-action="buy-starter" data-id="${t}"${canPay(cost) ? '' : ' disabled'}>Acheter (${costLabel(cost)})</button>`}
        </div>`;
    });
  if (!rows.length) return '';
  return `
    <div class="card starter">
      <span class="card-title"><span>🛠️ Installer la ferme</span></span>
      <span class="muted">Le panneau et la pompe ouvrent la Zone de culture et le Marché.</span>
      ${rows.join('')}
    </div>`;
}

/* -- écran de configuration de la famille (avant la première journée) -- */

let setupNameDraft = null; // nom tapé, gardé quand on ouvre la fiche d'un membre

function setupMemberRow(m) {
  const main = mainCharacter(state);
  const isMain = main && main.id === m.id;
  return `
    <li class="setup-member">
      <span class="portrait-emoji" aria-hidden="true">${memberPortrait(state, m.id) || '🙂'}</span>
      <span class="setup-member-name"><strong class="member-name">${memberNameHtml(m.id)}</strong><br><span class="muted">${m.enfant ? 'Enfant' : 'Adulte'}${isMain ? ' · ⭐ personnage principal' : ''}</span></span>
      <span class="row">
        ${!m.enfant && !isMain ? `<button type="button" class="btn" data-action="main-character" data-id="${m.id}" title="Choisir comme personnage principal">⭐</button>` : ''}
        <button type="button" class="btn" data-action="member-edit" data-id="${m.id}">✏️</button>
      </span>
    </li>`;
}

export function openSetupModal() {
  tel('modal', 'setup');
  const D = DATA.DEPART;
  const nom = setupNameDraft !== null ? setupNameDraft : familyName(state);
  const C = DATA.FAMILY.COMPOSITION;
  const full = state.famille.membres.length >= C.MEMBRES_MAX;
  document.getElementById('modal-root').innerHTML = `
    <div class="modal-backdrop">
      <div class="modal setup-modal" id="setup-modal" role="dialog" aria-modal="true" aria-labelledby="setup-title">
        <h2 id="setup-title">🏡 Votre famille</h2>
        <p class="muted">Avant de partir pour la ferme du grand-père : le nom de la famille, ses membres, et qui tient la ferme au quotidien (le personnage principal, qui dépense l'énergie à chaque action).</p>
        <div class="stack member-field">
          <label for="setup-nom"><strong>Nom de famille</strong> <span class="muted">(${D.NOM_MIN} à ${D.NOM_MAX} signes)</span></label>
          <input type="text" id="setup-nom" class="member-input" maxlength="${D.NOM_MAX}" autocomplete="off" autocapitalize="words" spellcheck="false" value="${escapeHtml(nom)}">
        </div>
        <ul class="setup-members" aria-label="Membres de la famille">${state.famille.membres.map(setupMemberRow).join('')}</ul>
        <div class="row">
          <button type="button" class="btn" data-action="member-add" data-age="adulte"${full ? ' disabled' : ''}>➕ Un adulte</button>
          <button type="button" class="btn" data-action="member-add" data-age="enfant"${full ? ' disabled' : ''}>➕ Un enfant</button>
        </div>
        <p class="muted">${state.famille.membres.length} / ${C.MEMBRES_MAX} membres · besoin : <strong class="num">${formatNumber(familyNeed(state))}</strong> calories par jour. Pour retirer quelqu'un, ouvre sa fiche (✏️). Les animaux de compagnie s'adoptent ensuite dans la Famille.</p>
        <p class="muted">Le nom et les prénoms restent sur cet appareil, dans ta sauvegarde : ils ne sont jamais envoyés.</p>
        <p class="alert" id="setup-error" role="alert" hidden></p>
        <div class="row"><button type="button" class="btn primary" data-action="setup-start">Partir pour la ferme</button></div>
      </div>
    </div>`;
  const input = document.getElementById('setup-nom');
  input.addEventListener('input', () => { setupNameDraft = input.value; });
}

function openStoryModal() {
  tel('modal', 'histoire');
  const paras = DATA.DEPART.HISTOIRE.map((p) => `<p>${withFamilyName(p)}</p>`).join('');
  document.getElementById('modal-root').innerHTML = `
    <div class="modal-backdrop" data-action="close-modal">
      <div class="modal story-modal" role="dialog" aria-modal="true" aria-labelledby="story-title" data-stop-propagation>
        <h2 id="story-title">🚗 Le départ</h2>
        ${paras}
        <p class="muted">✉️ Une lettre du notaire vous attend dans les Notifications.</p>
        <div class="row"><button type="button" class="btn primary" data-action="close-modal">En route</button></div>
      </div>
    </div>`;
}

// Appelée à chaque image : l'écran de configuration revient tant que la famille n'est pas
// installée (après la fiche d'un membre, par exemple).
export function watchSetup() {
  if (!state || !setupPending(state)) return;
  if (document.getElementById('modal-root').childElementCount > 0) return;
  openSetupModal();
}

/* ---------- actions de cet écran (voir ui/actions.js) ---------- */

registerActions({
  'repair-house': () => {
    const r = applyResult(repairHouse(state));
    if (r.ok) showToast(`🏠 La maison est réparée (−${formatCoins(r.cost)} 💰). Installe le panneau et la pompe.`);
  },
  'buy-starter': (target) => {
    const t = target.dataset.id;
    const r = applyResult(buyStarter(state, t));
    if (r.ok) {
      const L = STARTER_LABELS[t];
      showToast(`${L.icone} ${L.nom} installé (−${formatCoins(r.cost)} 💰)${r.ouvert && (t === 'panneau' || t === 'pompe') ? ' · la Zone de culture et le Marché ouvrent' : ''}`);
    }
  },
  'main-character': (target) => {
    const r = applyResult(setMainCharacter(state, target.dataset.id));
    if (setupPending(state)) openSetupModal();
    else if (r.ok) {
      persistState();
      showToast('⭐ Nouveau personnage principal.');
    }
  },
  'setup-start': () => {
    const input = document.getElementById('setup-nom');
    const err = document.getElementById('setup-error');
    const r = setFamilyName(state, input ? input.value : '');
    if (!r.ok) {
      err.textContent = r.error;
      err.hidden = false;
      return;
    }
    const f = finishSetup(state);
    if (!f.ok) {
      err.textContent = f.error;
      err.hidden = false;
      return;
    }
    setupNameDraft = null;
    persistState();
    refresh();
    openStoryModal();
  },
});
