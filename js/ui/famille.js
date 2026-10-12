import { DATA } from '../engine/catalog.js';
import { memberHappiness } from '../engine/ville.js';
import { happinessGaugeHtml } from './ville.js';
import { EPS } from '../engine/base.js';
import {
  addMember, addPet, cleanFirstName, familyNeed, findMember, findPet,
  memberName, memberPerso, memberRemovalBlock, memberRoom, persoMax, petIcon, petName, petRoom, pets, planMeal,
  removeMember, removePet, setMemberProfile, setPetProfile,
} from '../engine/family.js';
import { escapeHtml, formatNumber } from '../engine/format.js';
import { energyDetailsHtml } from './energie.js';
import { familyNameHtml } from './depart.js';
import { mainCharacter } from '../engine/depart.js';
import { state } from './store.js';
import { tel } from './consent.js';
import { persistState } from './storage.js';
import { applyResult } from './game-actions.js';
import { refresh } from './render.js';
import { renderAutonomyCard } from './chapitres.js';
import { showToast } from './toasts.js';
import { registerActions } from './actions.js';
import { closeModal } from './common.js';

/* ---------- Famille ---------- */

// Prénom d'un membre prêt à être écrit dans la page. Le prénom est saisi par le
// joueur : il passe toujours par escapeHtml(). C'est une donnée personnelle, qui
// reste sur l'appareil : ne jamais le mettre dans un attribut data-crop, data-type,
// data-id, data-tab ou data-screen (lus par le suivi de session), ni dans un appel tel().
export function memberNameHtml(id) {
  return escapeHtml(memberName(state, id));
}

// « Modifier la famille » : les boutons ✏️, ⭐ et l'ajout de membres n'apparaissent
// qu'en mode modification, pour garder la fiche lisible.
let familyEditing = false;
// « Ajouter ou modifier un animal » : de même pour les animaux de compagnie.
let petsEditing = false;
// Boutons « ? » (ration quotidienne, animaux de compagnie) : les explications sont
// repliées par défaut ; on retient celles que le joueur a ouvertes.
const helpOpen = new Set();

function helpToggleHtml(id, label) {
  return `<button type="button" class="btn help-btn" data-action="family-help" data-help="${id}" aria-expanded="${helpOpen.has(id)}" aria-controls="${id}-help" aria-label="Aide : ${label}">?</button>`;
}

// Version 1.17 : le portrait d'un membre est celui de son personnage, 16 × 16 agrandi sans
// flou : assets/portraits/perso_XX.png pour un adulte, enfant_XX.png pour un enfant.
export function persoSrc(n, enfant = false) {
  return `assets/portraits/${enfant ? 'enfant' : 'perso'}_${String(n).padStart(2, '0')}.png`;
}
export function memberAvatarHtml(id) {
  const m = findMember(state, id);
  return `<img class="portrait-px" src="${persoSrc(memberPerso(m), !!(m && m.enfant))}" alt="" width="16" height="16">`;
}

// FLU-24 : une ligne par membre (portrait, nom, bonheur, boutons) : toute la famille
// tient dans le premier écran de la fiche.
function portraitCard(m) {
  const main = mainCharacter(state) && mainCharacter(state).id === m.id;
  return `
    <li class="card member-row">
      ${memberAvatarHtml(m.id)}
      <span class="member-row-text">
        <strong class="member-name">${memberNameHtml(m.id)}</strong>${main ? ' <span class="chip auto">⭐ Principal</span>' : ''}
        <span class="member-row-joy">${happinessGaugeHtml(memberHappiness(m))}<span aria-hidden="true">😊</span></span>
      </span>
      ${familyEditing ? `<span class="member-row-btns">
        ${!m.enfant && !main ? `<button type="button" class="btn" data-action="main-character" data-id="${m.id}" aria-label="Choisir comme personnage principal" title="Choisir comme personnage principal">⭐</button>` : ''}
        <button type="button" class="btn" data-action="member-edit" data-id="${m.id}" aria-label="Modifier ${m.enfant ? 'cet enfant' : 'cet adulte'} : prénom et apparence">✏️</button>
      </span>` : ''}
    </li>`;
}

/* -- version 1.1 : fenêtre « Modifier » d'un membre (prénom et apparence) -- */

// Choix en cours dans la fenêtre (rien n'est changé avant « Enregistrer »). Le
// prénom, lui, reste dans le champ de saisie jusqu'à l'enregistrement.
let memberDraft = null; // { id, enfant, perso, depart } (depart : le joueur a demandé le départ, on attend sa confirmation)

function openMemberModal(id) {
  const m = findMember(state, id);
  if (!m) return;
  tel('modal', 'member'); // le nom de la fenêtre seulement : jamais le prénom
  const P = DATA.FAMILY.PROFIL;
  const age = m.enfant ? 'enfant' : 'adulte';
  memberDraft = {
    id: m.id,
    enfant: !!m.enfant,
    perso: memberPerso(m), // version 1.17 : son personnage, parmi ceux de son âge
    depart: false,
  };
  // Version 1.2 : le membre peut quitter la famille, sauf s'il est le dernier, le
  // dernier adulte (le moteur dit pourquoi).
  const blocage = memberRemovalBlock(state, m.id);
  const depart = blocage
    ? `<span class="muted">${escapeHtml(blocage)}</span>`
    : `<button type="button" class="btn" data-action="member-remove" id="member-remove">Retirer de la famille</button>
       <span class="muted">Le besoin de la famille baisse de ${DATA.FAMILY.AJ[age]} calories par jour.</span>`;
  // Version 1.17 : l'apparence est un des personnages de son âge (elle remplace le sexe, la
  // coiffure et la teinte des anciens portraits emoji).
  const persos = Array.from({ length: persoMax(m) }, (_, i) => i + 1)
    .map((n) => `<button type="button" class="btn perso-btn" data-action="member-perso" data-perso="${n}" aria-pressed="false" aria-label="Personnage ${n}" title="Personnage ${n}"><img src="${persoSrc(n, !!m.enfant)}" alt="" width="16" height="16"></button>`).join('');
  document.getElementById('modal-root').innerHTML = `
    <div class="modal-backdrop" data-action="close-modal">
      <div class="modal member-modal" role="dialog" aria-modal="true" aria-labelledby="member-title" data-stop-propagation>
        <h2 id="member-title">✏️ Modifier : ${escapeHtml(m.nom)}</h2>
        <div class="member-preview" aria-live="polite">
          <img class="portrait-px" id="member-preview-perso" src="" alt="" width="16" height="16">
          <strong class="member-name" id="member-preview-name"></strong>
        </div>
        <div class="stack">
          <div class="stack member-field">
            <label for="member-prenom"><strong>Prénom</strong> <span class="muted">(${P.PRENOM_MAX} caractères au plus)</span></label>
            <input type="text" id="member-prenom" class="member-input" maxlength="${P.PRENOM_MAX}" autocomplete="off" autocapitalize="words" spellcheck="false" value="${memberNameHtml(m.id)}">
          </div>
          <div class="stack member-field" role="group" aria-label="Personnage">
            <strong>Personnage</strong>
            <div class="perso-grid">${persos}</div>
          </div>
          <p class="muted">Le prénom reste sur cet appareil, dans ta sauvegarde : il n'est jamais envoyé.</p>
          <p class="alert" id="member-error" role="alert" hidden></p>
        </div>
        <div class="row">
          <button type="button" class="btn primary" data-action="member-save">Enregistrer</button>
          <button type="button" class="btn" data-action="close-modal">Annuler</button>
        </div>
        <div class="stack member-leave">${depart}</div>
      </div>
    </div>`;
  const input = document.getElementById('member-prenom');
  input.addEventListener('input', syncMemberModal);
  syncMemberModal();
  input.focus();
  input.select();
}

// Met à jour l'aperçu et la grille des personnages d'après le choix en cours, sans toucher au
// champ du prénom.
function syncMemberModal() {
  const d = memberDraft;
  const root = document.getElementById('modal-root');
  const input = document.getElementById('member-prenom');
  if (!d || !input) return;
  const typed = cleanFirstName(input.value);
  document.getElementById('member-preview-perso').src = persoSrc(d.perso, d.enfant);
  for (const b of root.querySelectorAll('[data-action="member-perso"]')) {
    const n = Number(b.dataset.perso);
    b.setAttribute('aria-pressed', String(n === d.perso));
    b.classList.toggle('active', n === d.perso);
  }
  // textContent : le prénom tapé s'affiche comme du texte, jamais comme du HTML
  document.getElementById('member-preview-name').textContent = typed || '…';
  const error = document.getElementById('member-error');
  if (error) error.hidden = true;
}

// « Enregistrer » : le moteur vérifie tout ; en cas de refus la fenêtre reste
// ouverte et dit pourquoi.
function saveMemberModal() {
  const d = memberDraft;
  const input = document.getElementById('member-prenom');
  if (!d || !input) return;
  const result = setMemberProfile(state, d.id, { prenom: input.value, perso: d.perso });
  if (!result.ok) {
    const error = document.getElementById('member-error');
    if (error) {
      error.textContent = result.error;
      error.hidden = false;
    }
    input.focus();
    return;
  }
  memberDraft = null;
  closeModal();
  persistState();
  refresh();
  showToast('✏️ C\'est noté !');
}

// « Retirer de la famille » : un premier appui demande confirmation, le second
// retire le membre (le moteur vérifie encore qu'il peut partir).
function removeMemberFromModal() {
  const d = memberDraft;
  const btn = document.getElementById('member-remove');
  if (!d || !btn) return;
  if (!d.depart) {
    d.depart = true;
    btn.classList.add('danger');
    btn.textContent = 'Confirmer le départ';
    return;
  }
  const nom = memberName(state, d.id);
  const result = removeMember(state, d.id);
  if (!result.ok) {
    const error = document.getElementById('member-error');
    if (error) {
      error.textContent = result.error;
      error.hidden = false;
    }
    return;
  }
  memberDraft = null;
  closeModal();
  persistState();
  refresh();
  showToast(`👋 ${nom} a quitté la famille. Besoin : ${formatNumber(result.besoin)} calories par jour.`);
}

/* -- version 1.2 : animaux de compagnie (chiens et chats) -- */

function petNameHtml(id) {
  return escapeHtml(petName(state, id));
}

function petCard(a) {
  const e = DATA.FAMILY.COMPAGNIE.ESPECES[a.espece];
  return `
    <article class="card portrait pet">
      <span class="portrait-emoji" aria-hidden="true">${petIcon(a.espece)}</span>
      <span class="card-title"><span class="member-name">${petNameHtml(a.id)}</span></span>
      <span class="muted">${e ? e.nom : 'Animal'}</span>
      ${petsEditing ? `<button type="button" class="btn" data-action="pet-edit" data-id="${a.id}" aria-label="Modifier cet animal : nom et espèce">✏️ Modifier</button>` : ''}
    </article>`;
}

let petDraft = null; // { id, espece, depart }

function openPetModal(id) {
  const a = findPet(state, id);
  if (!a) return;
  tel('modal', 'pet'); // le nom de la fenêtre seulement : jamais le nom de l'animal
  const K = DATA.FAMILY.COMPAGNIE;
  const P = DATA.FAMILY.PROFIL;
  petDraft = { id: a.id, espece: K.ESPECES[a.espece] ? a.espece : Object.keys(K.ESPECES)[0], depart: false };
  const especes = Object.entries(K.ESPECES).map(([k, e]) => `<button type="button" class="btn choice-btn" data-action="pet-espece" data-espece="${k}" aria-pressed="false"><span class="choice-emoji" aria-hidden="true">${e.icone}</span><span>${e.nom}</span></button>`).join('');
  document.getElementById('modal-root').innerHTML = `
    <div class="modal-backdrop" data-action="close-modal">
      <div class="modal member-modal" role="dialog" aria-modal="true" aria-labelledby="pet-title" data-stop-propagation>
        <h2 id="pet-title">✏️ Animal de compagnie</h2>
        <div class="member-preview" aria-live="polite">
          <span class="portrait-emoji" id="pet-preview-emoji" aria-hidden="true"></span>
          <strong class="member-name" id="pet-preview-name"></strong>
        </div>
        <div class="stack">
          <div class="stack member-field">
            <label for="pet-nom"><strong>Nom</strong> <span class="muted">(${P.PRENOM_MAX} caractères au plus)</span></label>
            <input type="text" id="pet-nom" class="member-input" maxlength="${P.PRENOM_MAX}" autocomplete="off" autocapitalize="words" spellcheck="false" value="${petNameHtml(a.id)}">
          </div>
          <div class="stack member-field" role="group" aria-label="Chien ou chat">
            <strong>Chien ou chat</strong>
            <div class="row choice-row">${especes}</div>
          </div>
          <p class="muted">Il ne mange pas les réserves de la famille : il ne compte pas dans le besoin journalier. Son nom reste sur cet appareil, dans ta sauvegarde.</p>
          <p class="alert" id="pet-error" role="alert" hidden></p>
        </div>
        <div class="row">
          <button type="button" class="btn primary" data-action="pet-save">Enregistrer</button>
          <button type="button" class="btn" data-action="close-modal">Annuler</button>
        </div>
        <div class="stack member-leave">
          <button type="button" class="btn" data-action="pet-remove" id="pet-remove">Retirer de la famille</button>
        </div>
      </div>
    </div>`;
  const input = document.getElementById('pet-nom');
  input.addEventListener('input', syncPetModal);
  syncPetModal();
  input.focus();
  input.select();
}

function syncPetModal() {
  const d = petDraft;
  const input = document.getElementById('pet-nom');
  if (!d || !input) return;
  document.getElementById('pet-preview-emoji').textContent = petIcon(d.espece);
  // textContent : le nom tapé s'affiche comme du texte, jamais comme du HTML
  document.getElementById('pet-preview-name').textContent = cleanFirstName(input.value) || '…';
  for (const b of document.getElementById('modal-root').querySelectorAll('[data-action="pet-espece"]')) {
    const on = b.dataset.espece === d.espece;
    b.setAttribute('aria-pressed', String(on));
    b.classList.toggle('active', on);
  }
  const error = document.getElementById('pet-error');
  if (error) error.hidden = true;
}

function petModalError(text) {
  const error = document.getElementById('pet-error');
  if (!error) return;
  error.textContent = text;
  error.hidden = false;
}

function savePetModal() {
  const d = petDraft;
  const input = document.getElementById('pet-nom');
  if (!d || !input) return;
  const result = setPetProfile(state, d.id, { nom: input.value, espece: d.espece });
  if (!result.ok) {
    petModalError(result.error);
    input.focus();
    return;
  }
  petDraft = null;
  closeModal();
  persistState();
  refresh();
  showToast('✏️ C\'est noté !');
}

function removePetFromModal() {
  const d = petDraft;
  const btn = document.getElementById('pet-remove');
  if (!d || !btn) return;
  if (!d.depart) {
    d.depart = true;
    btn.classList.add('danger');
    btn.textContent = 'Confirmer le départ';
    return;
  }
  const nom = petName(state, d.id);
  const result = removePet(state, d.id);
  if (!result.ok) {
    petModalError(result.error);
    return;
  }
  petDraft = null;
  closeModal();
  persistState();
  refresh();
  showToast(`👋 ${nom} a quitté la famille.`);
}

// Version 1.2 : composition de la famille (1 à 6 membres) et animaux de compagnie (3 au plus).
function renderFamilyAdd() {
  const C = DATA.FAMILY.COMPOSITION;
  const AJ = DATA.FAMILY.AJ;
  const full = memberRoom(state) === 0;
  return `
    <div class="row family-add">
      <button type="button" class="btn" data-action="member-add" data-age="adulte"${full ? ' disabled' : ''}>➕ Un adulte <span class="muted">(+${AJ.adulte} calories/jour)</span></button>
      <button type="button" class="btn" data-action="member-add" data-age="enfant"${full ? ' disabled' : ''}>➕ Un enfant <span class="muted">(+${AJ.enfant} calories/jour)</span></button>
    </div>
    <p class="muted">${full ? `La famille est au complet (${C.MEMBRES_MAX} membres). ` : ''}Pour retirer quelqu'un, ouvre sa fiche (✏️).</p>`;
}

function renderPets() {
  const K = DATA.FAMILY.COMPAGNIE;
  const list = pets(state);
  const full = petRoom(state) === 0;
  const boutons = Object.entries(K.ESPECES)
    .map(([k, e]) => `<button type="button" class="btn" data-action="pet-add" data-espece="${k}"${full ? ' disabled' : ''}><span aria-hidden="true">${e.icone}</span> Adopter un ${e.nom.toLowerCase()}</button>`)
    .join('');
  return `
    <h3 class="section-title help-title"><span>🐾 Animaux de compagnie · <span class="num">${list.length} / ${K.MAX}</span></span>${helpToggleHtml('pets', 'animaux de compagnie')}</h3>
    <p class="muted" id="pets-help"${helpOpen.has('pets') ? '' : ' hidden'}>Un chien ou un chat tient compagnie à la famille. Il ne mange pas ses réserves : il ne compte pas dans le besoin journalier.</p>
    <button type="button" class="btn${petsEditing ? ' primary' : ''} family-edit-btn" data-action="pets-edit" aria-pressed="${petsEditing}">${petsEditing ? '✅ Terminer' : '🐾 Ajouter ou modifier un animal'}</button>
    ${list.length ? `<div class="portraits">${list.map(petCard).join('')}</div>` : ''}
    ${petsEditing ? `<div class="row family-add">${boutons}</div>
    ${full ? `<p class="muted">${K.MAX} animaux de compagnie au plus.</p>` : ''}` : ''}`;
}

export function renderFamille() {
  // Avant 19 h : le repas prévu ; après : celui qui a été pris.
  const pris = !!state.repas;
  const plan = state.repas || planMeal(state);
  const shown = Math.min(plan.energie, plan.besoin);
  const short = plan.energie + EPS < plan.besoin;
  return `
    <h2>👨‍👩‍👧‍👦 Famille${familyNameHtml() ? ` ${familyNameHtml()}` : ''}</h2>
    <button type="button" class="btn${familyEditing ? ' primary' : ''} family-edit-btn" data-action="family-edit" aria-pressed="${familyEditing}">${familyEditing ? '✅ Terminer' : '✏️ Modifier la famille'}</button>
    <ul class="member-rows">${state.famille.membres.map(portraitCard).join('')}</ul>
    ${familyEditing ? renderFamilyAdd() : ''}
    <div class="cards">
      <div class="card">
        <span class="card-title ration-title"><span>🍽️ Ration quotidienne : <span class="num">${formatNumber(shown)} / ${formatNumber(plan.besoin)}</span></span><span class="row ration-title-end">${pris ? '<span class="chip">✅ prise</span>' : ''}${helpToggleHtml('ration', 'ration quotidienne')}</span></span>
        <span class="bar" role="progressbar" aria-label="${pris ? 'Calories mangées' : 'Calories prévues'}" aria-valuemin="0" aria-valuemax="${plan.besoin}" aria-valuenow="${Math.round(shown)}"><span class="bar-fill${short ? ' warn' : ''}" style="width:${plan.besoin ? Math.round((shown / plan.besoin) * 100) : 0}%"></span></span>
        <span class="muted" id="ration-help"${helpOpen.has('ration') ? '' : ' hidden'}>${pris ? 'Calories mangées' : 'Calories prévues'} pour un besoin de ${formatNumber(familyNeed(state))} calories par jour. ${pris
          ? (short ? `⚠️ Le besoin n'a pas été couvert : ton énergie remontera moins cette nuit.` : `Le besoin a été couvert : ton énergie remontera à ${DATA.PERSONNAGE.REVEIL_BASE + DATA.PERSONNAGE.REVEIL_REPAS} cette nuit.`)
          : (short ? `⚠️ Le besoin ne sera pas couvert : ton énergie remontera moins cette nuit.` : `Le besoin sera couvert : ton énergie remontera à ${DATA.PERSONNAGE.REVEIL_BASE + DATA.PERSONNAGE.REVEIL_REPAS} cette nuit.`)} La famille mange à ${DATA.TIME.MEAL_HOUR} h, ou au coucher si elle dort avant.</span>
      </div>
    </div>
    ${renderPets()}
    <details class="more">
      <summary>En savoir plus</summary>
      ${renderAutonomyCard()}
      <div class="cards">${energyDetailsHtml()}</div>
    </details>`;
}

/* ---------- actions de cet écran (voir ui/actions.js) ---------- */

registerActions({
  'family-edit': () => {
    familyEditing = !familyEditing;
    refresh();
  },
  'pets-edit': () => {
    petsEditing = !petsEditing;
    refresh();
  },
  'family-help': (target) => {
    const id = target.dataset.help;
    if (helpOpen.has(id)) helpOpen.delete(id);
    else helpOpen.add(id);
    refresh();
  },
  // ----- version 1.1 : prénom et apparence d'un membre de la famille -----
  'member-edit': (target) => {
    openMemberModal(target.dataset.id);
  },
  'member-perso': (target) => {
    if (memberDraft) memberDraft.perso = Number(target.dataset.perso);
    syncMemberModal();
  },
  'member-save': () => {
    saveMemberModal();
  },
  // ----- version 1.2 : composition de la famille, animaux de compagnie -----
  'member-add': (target) => {
    const enfant = target.dataset.age === 'enfant';
    const result = applyResult(addMember(state, enfant));
    if (result.ok) {
      persistState();
      showToast(`👋 Un ${enfant ? 'enfant' : 'adulte'} rejoint la famille. Besoin : ${formatNumber(result.besoin)} calories par jour.`);
      openMemberModal(result.id); // tout de suite : son prénom et son apparence
    }
  },
  'member-remove': () => {
    removeMemberFromModal();
  },
  'pet-add': (target) => {
    const result = applyResult(addPet(state, target.dataset.espece));
    if (result.ok) {
      persistState();
      openPetModal(result.id); // tout de suite : son nom
    }
  },
  'pet-edit': (target) => {
    openPetModal(target.dataset.id);
  },
  'pet-espece': (target) => {
    if (petDraft) petDraft.espece = target.dataset.espece;
    syncPetModal();
  },
  'pet-save': () => {
    savePetModal();
  },
  'pet-remove': () => {
    removePetFromModal();
  },
});
