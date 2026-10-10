import { DATA } from '../engine/catalog.js';
import { memberHappiness } from '../engine/ville.js';
import { happinessGaugeHtml } from './ville.js';
import { EPS } from '../engine/base.js';
import {
  addMember, addPet, cleanFirstName, familyNeed, findMember, findPet,
  memberName, memberPortrait, memberRemovalBlock, memberStyle, memberRoom, petIcon, petName, petRoom, pets, planMeal,
  portraitEmoji, removeMember, removePet, setMemberProfile, setPetProfile,
} from '../engine/family.js';
import { escapeHtml, formatNumber } from '../engine/format.js';
import { energyCardHtml } from './energie.js';
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

function portraitCard(m) {
  return `
    <article class="card portrait">
      <span class="portrait-emoji" aria-hidden="true">${memberPortrait(state, m.id) || '🙂'}</span>
      <span class="card-title"><span class="member-name">${memberNameHtml(m.id)}</span></span>
      <span class="muted">${m.enfant ? 'Enfant' : 'Adulte'} · ${DATA.FAMILY.AJ[m.enfant ? 'enfant' : 'adulte']} calories/jour</span>
      ${mainCharacter(state) && mainCharacter(state).id === m.id ? '<span class="chip auto">⭐ Personnage principal</span>' : ''}
      ${happinessGaugeHtml(memberHappiness(m))}
      <span class="muted">😊 Bonheur : <span class="num">${memberHappiness(m)} / ${DATA.VILLE.BONHEUR.MAX}</span></span>
      <button type="button" class="btn" data-action="member-edit" data-id="${m.id}" aria-label="Modifier ${m.enfant ? 'cet enfant' : 'cet adulte'} : prénom et apparence">✏️ Modifier</button>
      ${!m.enfant && !(mainCharacter(state) && mainCharacter(state).id === m.id) ? `<button type="button" class="btn" data-action="main-character" data-id="${m.id}">⭐ Personnage principal</button>` : ''}
    </article>`;
}

/* -- version 1.1 : fenêtre « Modifier » d'un membre (prénom, sexe, couleur de peau) -- */

// Choix en cours dans la fenêtre (rien n'est changé avant « Enregistrer »). Le
// prénom, lui, reste dans le champ de saisie jusqu'à l'enregistrement.
let memberDraft = null; // { id, enfant, genre, teint, depart } (depart : le joueur a demandé le départ, on attend sa confirmation)

const GENRE_LABELS = {
  adulte: { f: 'Femme', m: 'Homme' },
  enfant: { f: 'Fille', m: 'Garçon' },
};
const TEINT_LABELS = ['Jaune (par défaut)', 'Peau claire', 'Peau assez claire', 'Peau moyenne', 'Peau assez foncée', 'Peau foncée'];

function openMemberModal(id) {
  const m = findMember(state, id);
  if (!m) return;
  tel('modal', 'member'); // le nom de la fenêtre seulement : jamais le prénom
  const P = DATA.FAMILY.PROFIL;
  const age = m.enfant ? 'enfant' : 'adulte';
  memberDraft = {
    id: m.id,
    enfant: !!m.enfant,
    genre: P.GENRES.includes(m.genre) ? m.genre : P.GENRES[0],
    teint: Number.isInteger(m.teint) && m.teint >= 0 && m.teint < P.TEINTS.length ? m.teint : 0,
    style: memberStyle(m), // version 1.12 : la coiffure (planche d'avatars)
    depart: false,
  };
  // Version 1.2 : le membre peut quitter la famille, sauf s'il est le dernier, le
  // dernier adulte (le moteur dit pourquoi).
  const blocage = memberRemovalBlock(state, m.id);
  const depart = blocage
    ? `<span class="muted">${escapeHtml(blocage)}</span>`
    : `<button type="button" class="btn" data-action="member-remove" id="member-remove">Retirer de la famille</button>
       <span class="muted">Le besoin de la famille baisse de ${DATA.FAMILY.AJ[age]} calories par jour.</span>`;
  const genres = P.GENRES.map((g) => `<button type="button" class="btn choice-btn" data-action="member-genre" data-genre="${g}" aria-pressed="false"><span class="choice-emoji" aria-hidden="true"></span><span>${GENRE_LABELS[age][g]}</span></button>`).join('');
  const styles = P.STYLES[age].map((_, n) => `<button type="button" class="btn swatch-btn" data-action="member-style" data-style="${n}" aria-pressed="false" aria-label="${P.STYLE_NOMS[age][n]}" title="${P.STYLE_NOMS[age][n]}"></button>`).join('');
  const teints = P.TEINTS.map((_, t) => `<button type="button" class="btn swatch-btn" data-action="member-teint" data-teint="${t}" aria-pressed="false" aria-label="${TEINT_LABELS[t]}" title="${TEINT_LABELS[t]}"></button>`).join('');
  document.getElementById('modal-root').innerHTML = `
    <div class="modal-backdrop" data-action="close-modal">
      <div class="modal member-modal" role="dialog" aria-modal="true" aria-labelledby="member-title" data-stop-propagation>
        <h2 id="member-title">✏️ Modifier : ${escapeHtml(m.nom)}</h2>
        <div class="member-preview" aria-live="polite">
          <span class="portrait-emoji" id="member-preview-emoji" aria-hidden="true"></span>
          <strong class="member-name" id="member-preview-name"></strong>
        </div>
        <div class="stack">
          <div class="stack member-field">
            <label for="member-prenom"><strong>Prénom</strong> <span class="muted">(${P.PRENOM_MAX} caractères au plus)</span></label>
            <input type="text" id="member-prenom" class="member-input" maxlength="${P.PRENOM_MAX}" autocomplete="off" autocapitalize="words" spellcheck="false" value="${memberNameHtml(m.id)}">
          </div>
          <div class="stack member-field" role="group" aria-label="${m.enfant ? 'Fille ou garçon' : 'Femme ou homme'}">
            <strong>${m.enfant ? 'Fille ou garçon' : 'Femme ou homme'}</strong>
            <div class="row choice-row">${genres}</div>
          </div>
          <div class="stack member-field" role="group" aria-label="Coiffure">
            <strong>Coiffure</strong>
            <div class="row swatch-row">${styles}</div>
          </div>
          <div class="stack member-field" role="group" aria-label="Couleur de peau">
            <strong>Couleur de peau</strong>
            <div class="row swatch-row">${teints}</div>
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

// Met à jour l'aperçu, les deux boutons de sexe et les six pastilles de teinte
// d'après les choix en cours, sans toucher au champ du prénom.
function syncMemberModal() {
  const d = memberDraft;
  const root = document.getElementById('modal-root');
  const input = document.getElementById('member-prenom');
  if (!d || !input) return;
  const typed = cleanFirstName(input.value);
  document.getElementById('member-preview-emoji').textContent = portraitEmoji(d.enfant, d.genre, d.teint, d.style);
  // textContent : le prénom tapé s'affiche comme du texte, jamais comme du HTML
  document.getElementById('member-preview-name').textContent = typed || '…';
  for (const b of root.querySelectorAll('[data-action="member-genre"]')) {
    const g = b.dataset.genre;
    b.setAttribute('aria-pressed', String(g === d.genre));
    b.classList.toggle('active', g === d.genre);
    b.querySelector('.choice-emoji').textContent = portraitEmoji(d.enfant, g, d.teint, d.style);
  }
  for (const b of root.querySelectorAll('[data-action="member-style"]')) {
    const n = Number(b.dataset.style);
    b.setAttribute('aria-pressed', String(n === d.style));
    b.classList.toggle('active', n === d.style);
    b.textContent = portraitEmoji(d.enfant, d.genre, d.teint, n);
  }
  for (const b of root.querySelectorAll('[data-action="member-teint"]')) {
    const t = Number(b.dataset.teint);
    b.setAttribute('aria-pressed', String(t === d.teint));
    b.classList.toggle('active', t === d.teint);
    b.textContent = portraitEmoji(d.enfant, d.genre, t, d.style);
  }
  const error = document.getElementById('member-error');
  if (error) error.hidden = true;
}

// « Enregistrer » : le moteur vérifie tout ; en cas de refus la fenêtre reste
// ouverte et dit pourquoi.
function saveMemberModal() {
  const d = memberDraft;
  const input = document.getElementById('member-prenom');
  if (!d || !input) return;
  const result = setMemberProfile(state, d.id, { prenom: input.value, genre: d.genre, teint: d.teint, style: d.style });
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
      <span class="muted">${e ? e.nom : 'Animal'} · ne compte pas dans le besoin</span>
      <button type="button" class="btn" data-action="pet-edit" data-id="${a.id}" aria-label="Modifier cet animal : nom et espèce">✏️ Modifier</button>
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
    <p class="muted">${full ? `La famille est au complet (${C.MEMBRES_MAX} membres). ` : ''}Pour retirer quelqu'un, ouvre « Modifier » sur sa fiche.</p>`;
}

function renderPets() {
  const K = DATA.FAMILY.COMPAGNIE;
  const list = pets(state);
  const full = petRoom(state) === 0;
  const boutons = Object.entries(K.ESPECES)
    .map(([k, e]) => `<button type="button" class="btn" data-action="pet-add" data-espece="${k}"${full ? ' disabled' : ''}><span aria-hidden="true">${e.icone}</span> Adopter un ${e.nom.toLowerCase()}</button>`)
    .join('');
  return `
    <h3 class="section-title">🐾 Animaux de compagnie · <span class="num">${list.length} / ${K.MAX}</span></h3>
    <p class="muted">Un chien ou un chat tient compagnie à la famille. Il ne mange pas ses réserves : il ne compte pas dans le besoin journalier.</p>
    ${list.length ? `<div class="portraits">${list.map(petCard).join('')}</div>` : ''}
    <div class="row family-add">${boutons}</div>
    ${full ? `<p class="muted">${K.MAX} animaux de compagnie au plus.</p>` : ''}`;
}

export function renderFamille() {
  // Avant 19 h : le repas prévu ; après : celui qui a été pris.
  const pris = !!state.repas;
  const plan = state.repas || planMeal(state);
  const shown = Math.min(plan.energie, plan.besoin);
  const short = plan.energie + EPS < plan.besoin;
  return `
    <h2>👨‍👩‍👧‍👦 Famille${familyNameHtml() ? ` ${familyNameHtml()}` : ''}</h2>
    <p class="muted family-count"><span class="num">${state.famille.membres.length} / ${DATA.FAMILY.COMPOSITION.MEMBRES_MAX}</span> membres · besoin : <strong class="num">${formatNumber(familyNeed(state))}</strong> calories par jour</p>
    <div class="portraits">${state.famille.membres.map(portraitCard).join('')}</div>
    ${renderFamilyAdd()}
    ${renderPets()}
    ${renderAutonomyCard()}
    <div class="cards">
      ${energyCardHtml()}
      <div class="card">
        <span class="card-title"><span>🍽️ ${pris ? `Repas de ${DATA.TIME.MEAL_HOUR} h : calories mangées` : `Repas de ${DATA.TIME.MEAL_HOUR} h : calories prévues`}</span>${pris ? '<span class="chip">✅ pris</span>' : ''}</span>
        <span class="big">${formatNumber(shown)} / ${formatNumber(plan.besoin)}</span>
        <span class="bar" role="progressbar" aria-label="${pris ? 'Calories mangées' : 'Calories prévues'}" aria-valuemin="0" aria-valuemax="${plan.besoin}" aria-valuenow="${Math.round(shown)}"><span class="bar-fill${short ? ' warn' : ''}" style="width:${plan.besoin ? Math.round((shown / plan.besoin) * 100) : 0}%"></span></span>
        <span class="muted">${pris
          ? (short ? `⚠️ Le besoin n'a pas été couvert : ton énergie remontera moins cette nuit.` : `Le besoin a été couvert : ton énergie remontera à ${DATA.PERSONNAGE.REVEIL_BASE + DATA.PERSONNAGE.REVEIL_REPAS} cette nuit.`)
          : (short ? `⚠️ Le besoin ne sera pas couvert : ton énergie remontera moins cette nuit.` : `Le besoin sera couvert : ton énergie remontera à ${DATA.PERSONNAGE.REVEIL_BASE + DATA.PERSONNAGE.REVEIL_REPAS} cette nuit.`)} La famille mange à ${DATA.TIME.MEAL_HOUR} h, ou au coucher si elle dort avant.</span>
      </div>
    </div>`;
}

/* ---------- actions de cet écran (voir ui/actions.js) ---------- */

registerActions({
  // ----- version 1.1 : prénom et apparence d'un membre de la famille -----
  'member-edit': (target) => {
    openMemberModal(target.dataset.id);
  },
  'member-genre': (target) => {
    if (memberDraft) memberDraft.genre = target.dataset.genre;
    syncMemberModal();
  },
  'member-style': (target) => {
    if (memberDraft) memberDraft.style = Number(target.dataset.style);
    syncMemberModal();
  },
  'member-teint': (target) => {
    if (memberDraft) memberDraft.teint = Number(target.dataset.teint);
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
