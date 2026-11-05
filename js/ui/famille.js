import { DATA } from '../engine/catalog.js';
import {
  addMember, addPet, cleanFirstName, findMember, findPet,
  memberApparence, memberName, memberPerso, memberRemovalBlock, memberRoom, persoMax, petIcon, petName, petRoom, pets,
  removeMember, removePet, setMemberProfile, setPetProfile,
} from '../engine/family.js';
import { escapeHtml, formatNumber, formatPercent } from '../engine/format.js';
import { affames, boiteCounts, jaugeFamille, jaugeMembre, sourceRepas } from '../engine/repas.js';
import { sleepTarget } from '../engine/night.js';
import { aidant } from '../engine/ramassage.js';
import { compagnonAide, faitsCompagnon, finAide, laisserAider } from '../engine/compagnon.js';
import { energyLevel } from '../engine/stamina.js';
import { itemsText } from './common.js';
import { energyDetailsHtml } from './energie.js';
import { familyNameHtml } from './depart.js';
import { mainCharacter } from '../engine/depart.js';
import { state } from './store.js';
import { tel } from './consent.js';
import { persistState } from './storage.js';
import { applyResult } from './game-actions.js';
import { refresh } from './render.js';
import { notify } from './toasts.js';
import { registerActions } from './actions.js';
import { closeModal, openModal } from './modal.js';
import { renderFicheMembre } from './fiche-membre.js';
import { apparenceDuCatalogue, apparencesPretes, chargerApparences, donneesApparence, plancheApparence, portraitMembre, vignetteApparence } from './apparence.js';
import { tirerApparence } from '../engine/apparence.js';

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

// Les portraits sont agrandis d'un nombre entier de fois (un pixel de l'image : k × k pixels
// de l'écran) ; sinon certaines rangées de pixels sont doublées et pas d'autres. --portrait-<taille> : la taille d'affichage, en px CSS, la
// plus proche de <taille> qui tombe juste pour l'écran (devicePixelRatio, qui change au zoom).
function taillesPortraits() {
  const r = window.devicePixelRatio || 1, root = document.documentElement.style;
  for (const t of [40, 48, 64]) root.setProperty(`--portrait-${t}`, `${(Math.max(1, Math.round((t * r) / 32)) * 32) / r}px`);
  // la taille d'un pixel des dessins de la carte du joueur (assets/hud) : environ 2 px CSS
  root.setProperty('--hud-px', `${Math.max(1, Math.round(2 * r)) / r}px`);
  // (fiche 11 : le membre en pied de sa fiche, environ 4 px CSS par pixel du dessin, 3 sur un petit écran)
  const k = window.innerWidth < 380 ? 3 : 4;
  root.setProperty('--fiche-px', `${Math.max(1, Math.round(k * r)) / r}px`);
}
if (typeof window !== 'undefined' && typeof document !== 'undefined' && document.documentElement) {
  taillesPortraits();
  window.addEventListener('resize', taillesPortraits);
}

// Le portrait d'un membre est son personnage de la carte, debout, de face (la première case,
// idle_bas_0, de sa planche : assets/personnages/perso_XX.png pour un adulte, enfant_XX.png
// pour un enfant), agrandi sans flou (.perso-px, css/jeu.css). `n` : son numéro ; 0 ou rien,
// la planche par défaut (assets/fermiere.png). Sur le site en ligne, avec l'empreinte du fichier.
export function persoSrc(n, enfant = false) {
  const file = n ? `personnages/${enfant ? 'enfant' : 'perso'}_${String(n).padStart(2, '0')}.png` : 'fermiere.png';
  const versions = window.FERME_ASSET_VERSIONS;
  return `assets/${file}${versions && versions[file] ? `?v=${versions[file]}` : ''}`;
}
// `propre` (étape E6) : la planche d'une apparence à lui (js/ui/apparence.js, plancheApparence : { url, dort }) ; son
// clignement prend alors les yeux fermés de sa case du sommeil (dort_bas_0), là où sont ceux de l'atlas.
export function persoHtml(n, enfant = false, id = '', vivant = '', propre = null) {
  const idHtml = id ? ` id="${id}"` : '';
  const src = propre ? propre.url : persoSrc(n, enfant);
  if (!vivant) return `<span class="perso-px"${idHtml} style="background-image: url('${src}')" aria-hidden="true"></span>`;
  let cligne = `background-image: url('${visagesSrc()}')`;
  if (propre) {
    const y0 = PORTRAIT_VISAGE.y[enfant ? 'enfant' : 'adulte'][0], x = (propre.dort % 8) * 16 + 4, y = Math.floor(propre.dort / 8) * 32 + y0;
    cligne = `background-image: url('${propre.url}'); background-size: calc(128 * var(--u)) auto; background-position: calc(${-x} * var(--u)) calc(${-y} * var(--u))`;
  }
  return `<span class="perso-px vivant"${idHtml} style="background-image: url('${src}'); ${visageVars(n, enfant, vivant)}" aria-hidden="true">`
    + `<span class="perso-cligne" style="${cligne}"></span></span>`;
}
// Le portrait d'un membre : son personnage du catalogue, ou son apparence à lui (étape E6, js/ui/apparence.js).
export function membrePortraitHtml(m, vivant = false, id = '') {
  const P = portraitMembre(m);
  return persoHtml(P.n, P.enfant, id, vivant && m ? m.id : '', P.propre);
}
export function memberAvatarHtml(id, vivant = false) {
  return membrePortraitHtml(findMember(state, id), vivant);
}

// Les portraits vivants du menu Famille (chantier « couches », docs/personnage-couches.md) : ils
// respirent comme sur la carte (les cases idle_bas_0 et idle_bas_1 de la planche, en alternance) et
// clignent des yeux (un calque, la tuile des yeux fermés de face de assets/personnages/visages.png,
// posé sur la zone du visage, qui descend avec la tête quand il respire). Tout est en CSS (.perso-px.vivant,
// css/jeu.css) : rien ne tourne quand la fenêtre est fermée, et « réduire les animations » les arrête.
// La rangée d'un personnage dans l'atlas : les 50 adultes puis les 50 enfants (l'ordre du catalogue) ; la
// rangée de la zone du visage dans la case, debout puis en respirant (visages.json : vérifié par
// tests/engine/personnages-visages.test.mjs).
// (la tuile des yeux fermés, de face : la colonne 2 de l'atlas, dans css/jeu.css .perso-cligne)
export const PORTRAIT_VISAGE = { adultes: 50, y: { adulte: [12, 13], enfant: [16, 17] } };
function visagesSrc() {
  const file = 'personnages/visages.png', versions = window.FERME_ASSET_VERSIONS;
  return `assets/${file}${versions && versions[file] ? `?v=${versions[file]}` : ''}`;
}
// Le clignement de chacun : sa période (3,4 à 6,2 s) et son décalage tirés de `graine` (l'id du membre :
// toujours les mêmes, la fenêtre redessinée ne relance pas l'animation ; deux membres ne clignent pas ensemble).
function visageVars(n, enfant, graine) {
  let h = 0;
  for (const c of String(graine)) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  const P = PORTRAIT_VISAGE, rang = (enfant ? P.adultes : 0) + Math.max(1, n || 1) - 1, [y0, y1] = P.y[enfant ? 'enfant' : 'adulte'];
  return `--visage-rang: ${rang}; --visage-y0: ${y0}; --visage-y1: ${y1}; --cligne: ${(3.4 + (h % 29) / 10).toFixed(1)}s; --cligne-decale: -${((h >>> 5) % 30) / 10}s`;
}

// FLU-24 : une carte par membre (portrait, nom, boutons), deux par ligne : toute la famille
// tient dans le premier écran de la fiche.
function portraitCard(m) {
  const main = mainCharacter(state) && mainCharacter(state).id === m.id;
  return `
    <li class="card member-row">
      ${memberAvatarHtml(m.id, true)}
      <span class="member-row-text">
        <strong class="member-name">${memberNameHtml(m.id)}</strong>${main ? ' <span class="chip auto">⭐ Principal</span>' : ''}
        ${main ? '' : faimHtml(m)}
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
let memberDraft = null; // { id, enfant, perso, apparence, depart } (apparence : la sienne, ou null ; depart : le joueur a demandé le départ, on attend sa confirmation)

// `personnaliser` : la section « Personnaliser » ouverte et montrée (le bouton « 🎨 Apparence » de la fiche).
function openMemberModal(id, personnaliser = false) {
  const m = findMember(state, id);
  if (!m) return;
  tel('modal', 'member'); // le nom de la fenêtre seulement : jamais le prénom
  const P = DATA.FAMILLE.PROFIL;
  memberDraft = {
    id: m.id,
    enfant: !!m.enfant,
    perso: memberPerso(m), // version 1.17 : son personnage, parmi ceux de son âge
    apparence: memberApparence(m), // étape E6 : son apparence à lui (null : son personnage)
    depart: false,
  };
  if (!apparencesPretes()) chargerApparences(syncMemberModal);
  // Version 1.2 : le membre peut quitter la famille, sauf s'il est le dernier, le
  // dernier adulte (le moteur dit pourquoi).
  const blocage = memberRemovalBlock(state, m.id);
  const depart = blocage
    ? `<span class="muted">${escapeHtml(blocage)}</span>`
    : `<button type="button" class="btn" data-action="member-remove" id="member-remove">Retirer de la famille</button>
       <span class="muted">Sa part de la boîte à nourriture reste à la famille.</span>`;
  // Version 1.17 : l'apparence est un des personnages de son âge (elle remplace le sexe, la
  // coiffure et la teinte des anciens portraits emoji).
  const persos = Array.from({ length: persoMax(m) }, (_, i) => i + 1)
    .map((n) => `<button type="button" class="btn perso-btn" data-action="member-perso" data-perso="${n}" aria-pressed="false" aria-label="Personnage ${n}" title="Personnage ${n}">${persoHtml(n, !!m.enfant)}</button>`).join('');
  openModal(`
    <h2 id="member-title">✏️ Modifier : ${escapeHtml(m.nom)}</h2>
    <div class="member-preview" aria-live="polite">
      ${persoHtml(0, false, 'member-preview-perso')}
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
      <details class="member-field apparence-choix" id="apparence-details"${memberDraft.apparence || personnaliser ? ' open' : ''}>
        <summary><strong>Personnaliser</strong> <span class="muted">(la peau, les yeux, la coiffure, la tenue…)</span></summary>
        <div id="apparence-choix"></div>
      </details>
      <p class="muted">Le prénom reste sur cet appareil, dans ta sauvegarde : il n'est jamais envoyé.</p>
      <p class="alert" id="member-error" role="alert" hidden></p>
    </div>
    <div class="row">
      <button type="button" class="btn primary" data-action="member-save">Enregistrer</button>
      <button type="button" class="btn" data-action="close-modal">Annuler</button>
    </div>
    <div class="stack member-leave">${depart}</div>`, { labelledBy: 'member-title', className: 'modal member-modal', focus: personnaliser ? '#apparence-details summary' : '#member-prenom' });
  const input = document.getElementById('member-prenom');
  input.addEventListener('input', syncMemberModal);
  syncMemberModal();
  if (personnaliser) {
    const details = document.getElementById('apparence-details');
    if (details) details.scrollIntoView({ block: 'start' });
  } else input.select();
}

// Met à jour l'aperçu et la grille des personnages d'après le choix en cours, sans toucher au
// champ du prénom.
function syncMemberModal() {
  const d = memberDraft;
  const root = document.getElementById('modal-root');
  const input = document.getElementById('member-prenom');
  if (!d || !input) return;
  const typed = cleanFirstName(input.value);
  const propre = d.apparence ? plancheApparence(d.apparence, d.enfant) : null;
  document.getElementById('member-preview-perso').style.backgroundImage = `url('${propre ? propre.url : persoSrc(d.perso, d.enfant)}')`;
  for (const b of root.querySelectorAll('[data-action="member-perso"]')) {
    const n = Number(b.dataset.perso);
    b.setAttribute('aria-pressed', String(!d.apparence && n === d.perso));
    b.classList.toggle('active', !d.apparence && n === d.perso);
  }
  const choix = document.getElementById('apparence-choix');
  if (choix) choix.innerHTML = apparenceChoixHtml(d);
  // textContent : le prénom tapé s'affiche comme du texte, jamais comme du HTML
  document.getElementById('member-preview-name').textContent = typed || '…';
  const error = document.getElementById('member-error');
  if (error) error.hidden = true;
}

// Étape E6 : le choix de chaque attribut (DATA.FAMILLE.PROFIL.APPARENCE). Le premier choix part du personnage
// du catalogue en cours ; un personnage de la grille retire l'apparence. Chaque bouton porte la couleur de son choix
// (les palettes de assets/personnages/catalogue.json, une fois chargées).
const CHAMPS_APPARENCE = [
  ['Identité', [
    ['identite.peau', 'Peau', (A) => A.PEAU, (K, v) => K.palettes.peau[v].teinte],
    ['identite.yeux', 'Yeux', (A) => A.YEUX, (K, v) => K.palettes.yeux[v].reflet],
    ['identite.cheveux', 'Cheveux', (A) => A.CHEVEUX, (K, v) => K.palettes.cheveux[v].teinte],
    ['identite.coupe', 'Coupe', (A, enfant) => (enfant ? Object.fromEntries(A.COUPE_PROPOSEE.enfant.map((c) => [c, A.COUPE.enfant[c]])) : A.COUPE.adulte)],
    ['identite.pilosite', 'Barbe', (A, enfant) => (enfant ? null : { '': 'Aucune', ...A.PILOSITE })],
    ['identite.signes', 'Signes', (A) => A.SIGNES, null, true],
  ]],
  ['Tenue', [
    ['tenue.haut.tissu', 'Haut', (A) => A.TISSU, (K, v) => K.palettes.tissus[v].clair],
    ['tenue.haut.motif', 'Motif', (A) => ({ '': 'Uni', ...A.MOTIF })],
    ['tenue.bas.tissu', 'Bas', (A) => A.BAS, (K, v) => K.palettes.bas[v].teinte],
    ['tenue.couvre_chef', 'Sur la tête', (A, enfant) => ({ '': 'Rien', ...A.COUVRE_CHEF[enfant ? 'enfant' : 'adulte'] })],
    ['tenue.accessoire', 'Couleur du couvre-chef', (A) => A.ACCESSOIRE, (K, v) => K.palettes.accessoires[v]],
    ['tenue.accessoires', 'Accessoires', (A) => A.ACCESSOIRES, null, true],
  ]],
];
const lireChamp = (a, champ) => champ.split('.').reduce((o, k) => (o ? o[k] : undefined), a);
function ecrireChamp(a, champ, v) {
  const k = champ.split('.'), o = k.slice(0, -1).reduce((x, c) => x[c], a);
  o[k[k.length - 1]] = v;
}

// Les formes (la coupe, la barbe, le couvre-chef) : une vignette de la tête avec ce choix (js/ui/apparence.js,
// vignetteApparence) ; `prepare` y retouche l'apparence (la coupe : sans couvre-chef, sinon on ne la verrait pas).
const FORMES = { 'identite.coupe': (a) => { a.tenue.couvre_chef = null; }, 'identite.pilosite': null, 'tenue.couvre_chef': null };

// L'écran « Personnaliser » pour `d` ({ perso, enfant, apparence }), en trois sortes de choix : les couleurs en
// pastilles (le nom choisi à côté du titre de l'attribut, chaque pastille son nom pour les lecteurs d'écran), les
// formes en vignettes, le reste en puces ; en haut, « 🎲 Au hasard ». `action` : celle de ses boutons (la fenêtre
// « Modifier » d'un membre, ou l'accueil d'une nouvelle partie, js/ui/depart.js) ; le hasard : `${action}-hasard`.
export function apparenceChoixHtml(d, action = 'member-apparence') {
  if (!apparencesPretes()) return '<p class="muted">Un instant…</p>';
  const A = DATA.FAMILLE.PROFIL.APPARENCE, K = donneesApparence().K;
  const actuelle = d.apparence || apparenceDuCatalogue(d.perso, d.enfant);
  const hasard = `<button type="button" class="btn primary apparence-hasard" data-action="${action}-hasard">🎲 Au hasard</button>`;
  return hasard + CHAMPS_APPARENCE.map(([titre, champs]) => `<fieldset class="apparence-groupe"><legend>${titre}</legend>${champs.map(([champ, nom, options, couleur, plusieurs]) => {
    const choix = options(A, d.enfant);
    if (!choix) return '';
    const valeur = actuelle ? lireChamp(actuelle, champ) : undefined;
    const libelleActuel = plusieurs ? ((valeur || []).map((v) => choix[v]).filter(Boolean).join(', ') || 'aucun') : choix[valeur ?? ''] || '';
    const attrs = (v, on) => `data-action="${action}" data-champ="${champ}" data-valeur="${v}" aria-pressed="${on}"`;
    const estOn = (v) => (plusieurs ? (valeur || []).includes(v) : (valeur ?? '') === v);
    let boutons, sorte;
    if (couleur) {
      sorte = 'pastilles';
      boutons = Object.entries(choix).map(([v, libelle]) => `<button type="button" class="pastille-apparence${estOn(v) ? ' active' : ''}" ${attrs(v, estOn(v))} aria-label="${escapeHtml(libelle)}" title="${escapeHtml(libelle)}" style="background: ${couleur(K, v)}"></button>`).join('');
    } else if (champ in FORMES) {
      sorte = 'vignettes';
      boutons = Object.entries(choix).map(([v, libelle]) => {
        let img = null;
        if (actuelle) {
          const a = JSON.parse(JSON.stringify(actuelle));
          ecrireChamp(a, champ, v === '' ? null : v);
          if (FORMES[champ]) FORMES[champ](a);
          img = vignetteApparence(a, d.enfant);
        }
        return `<button type="button" class="vignette-apparence${estOn(v) ? ' active' : ''}" ${attrs(v, estOn(v))}>${img ? `<img src="${img}" alt="" width="16" height="16">` : ''}<span>${escapeHtml(libelle)}</span></button>`;
      }).join('');
    } else {
      sorte = 'puces';
      boutons = Object.entries(choix).map(([v, libelle]) => `<button type="button" class="choix-apparence${estOn(v) ? ' active' : ''}" ${attrs(v, estOn(v))}>${escapeHtml(libelle)}</button>`).join('');
    }
    return `<div class="apparence-champ" role="group" aria-label="${nom}"><p class="apparence-titre"><strong>${nom}</strong> <span class="apparence-valeur">· ${escapeHtml(libelleActuel)}</span></p><div class="apparence-options ${sorte}">${boutons}</div></div>`;
  }).join('')}</fieldset>`).join('');
}

// « 🎲 Au hasard » : une apparence tirée comme celles des habitants (js/engine/apparence.js, ses probabilités ;
// une barbe parfois pour un adulte).
export function apparenceAuHasard(d) {
  if (!d) return;
  d.apparence = tirerApparence(Math.random, { enfant: !!d.enfant, genre: Math.random() < 0.5 ? 'm' : 'f' });
}

// Un choix (un bouton de apparenceChoixHtml) appliqué à `d` ({ perso, enfant, apparence }) : le premier part du
// personnage du catalogue ; un attribut à plusieurs choix (les signes, les accessoires) s'ajoute ou s'enlève.
export function appliquerChoixApparence(d, champ, valeur) {
  if (!d || !apparencesPretes()) return;
  if (!d.apparence) d.apparence = apparenceDuCatalogue(d.perso, d.enfant);
  if (!d.apparence) return;
  const actuel = lireChamp(d.apparence, champ);
  if (Array.isArray(actuel)) ecrireChamp(d.apparence, champ, actuel.includes(valeur) ? actuel.filter((x) => x !== valeur) : [...actuel, valeur]);
  else ecrireChamp(d.apparence, champ, valeur === '' ? null : valeur);
}

function choisirApparence(champ, valeur) {
  appliquerChoixApparence(memberDraft, champ, valeur);
  syncMemberModal();
}

// « Enregistrer » : le moteur vérifie tout ; en cas de refus la fenêtre reste
// ouverte et dit pourquoi.
function saveMemberModal() {
  const d = memberDraft;
  const input = document.getElementById('member-prenom');
  if (!d || !input) return;
  const result = setMemberProfile(state, d.id, { prenom: input.value, perso: d.perso, apparence: d.apparence || null });
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
  notify('✏️ C\'est noté !');
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
  notify(`👋 ${nom} a quitté la famille.`);
}

/* -- version 1.2 : animaux de compagnie (chiens et chats) -- */

function petNameHtml(id) {
  return escapeHtml(petName(state, id));
}

function petCard(a) {
  const e = DATA.FAMILLE.COMPAGNIE.ESPECES[a.espece];
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
  const K = DATA.FAMILLE.COMPAGNIE;
  const P = DATA.FAMILLE.PROFIL;
  petDraft = { id: a.id, espece: K.ESPECES[a.espece] ? a.espece : Object.keys(K.ESPECES)[0], depart: false };
  const especes = Object.entries(K.ESPECES).map(([k, e]) => `<button type="button" class="btn choice-btn" data-action="pet-espece" data-espece="${k}" aria-pressed="false"><span class="choice-emoji" aria-hidden="true">${e.icone}</span><span>${e.nom}</span></button>`).join('');
  openModal(`
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
      <p class="muted">Il ne mange pas dans la boîte à nourriture de la famille. Son nom reste sur cet appareil, dans ta sauvegarde.</p>
      <p class="alert" id="pet-error" role="alert" hidden></p>
    </div>
    <div class="row">
      <button type="button" class="btn primary" data-action="pet-save">Enregistrer</button>
      <button type="button" class="btn" data-action="close-modal">Annuler</button>
    </div>
    <div class="stack member-leave">
      <button type="button" class="btn" data-action="pet-remove" id="pet-remove">Retirer de la famille</button>
    </div>`, { labelledBy: 'pet-title', className: 'modal member-modal', focus: '#pet-nom' });
  const input = document.getElementById('pet-nom');
  input.addEventListener('input', syncPetModal);
  syncPetModal();
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
  notify('✏️ C\'est noté !');
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
  notify(`👋 ${nom} a quitté la famille.`);
}

// Version 1.2 : composition de la famille (1 à 6 membres) et animaux de compagnie (3 au plus).
function renderFamilyAdd() {
  const C = DATA.FAMILLE.COMPOSITION;
  const full = memberRoom(state) === 0;
  return `
    <div class="row family-add">
      <button type="button" class="btn" data-action="member-add" data-age="adulte"${full ? ' disabled' : ''}>➕ Un adulte</button>
      <button type="button" class="btn" data-action="member-add" data-age="enfant"${full ? ' disabled' : ''}>➕ Un enfant</button>
    </div>
    <p class="muted">${full ? `La famille est au complet (${C.MEMBRES_MAX} membres). ` : ''}Pour retirer quelqu'un, ouvre sa fiche (✏️).</p>`;
}

function renderPets() {
  const K = DATA.FAMILLE.COMPAGNIE;
  const list = pets(state);
  const full = petRoom(state) === 0;
  const boutons = Object.entries(K.ESPECES)
    .map(([k, e]) => `<button type="button" class="btn" data-action="pet-add" data-espece="${k}"${full ? ' disabled' : ''}><span aria-hidden="true">${e.icone}</span> Adopter un ${e.nom.toLowerCase()}</button>`)
    .join('');
  return `
    <h3 class="section-title help-title"><span>🐾 Animaux de compagnie · <span class="num">${list.length} / ${K.MAX}</span></span>${helpToggleHtml('pets', 'animaux de compagnie')}</h3>
    <p class="muted" id="pets-help"${helpOpen.has('pets') ? '' : ' hidden'}>Un chien ou un chat tient compagnie à la famille. Il ne mange pas dans la boîte à nourriture : il n'a pas de jauge de faim.</p>
    <button type="button" class="btn${petsEditing ? ' primary' : ''} family-edit-btn" data-action="pets-edit" aria-pressed="${petsEditing}">${petsEditing ? '✅ Terminer' : '🐾 Ajouter ou modifier un animal'}</button>
    ${list.length ? `<div class="portraits">${list.map(petCard).join('')}</div>` : ''}
    ${petsEditing ? `<div class="row family-add">${boutons}</div>
    ${full ? `<p class="muted">${K.MAX} animaux de compagnie au plus.</p>` : ''}` : ''}`;
}

// La jauge de faim d'un membre (js/engine/repas.js) : une barre, en alerte à SEUIL.
function faimHtml(m) {
  const F = DATA.FAMILLE.FAIM;
  const j = Math.floor(jaugeMembre(m));
  const bas = j <= F.SEUIL;
  return `<span class="faim-jauge" title="Faim : ${j} / ${F.MAX}${m.affame ? ' (a faim : rien à manger)' : ''}">
      <span class="bar" role="progressbar" aria-label="Jauge de faim" aria-valuemin="0" aria-valuemax="${F.MAX}" aria-valuenow="${j}"><span class="bar-fill${bas ? ' warn' : ''}" style="width:${Math.round((j / F.MAX) * 100)}%"></span></span>
      <span class="num muted">🍽️ ${j}${m.affame ? ' ⚠️' : ''}</span>
    </span>`;
}

// Où mange la famille, et ce qu'il y reste.
function repasCardHtml() {
  const F = DATA.FAMILLE.FAIM;
  const src = sourceRepas(state);
  const faim = affames(state).length;
  const ou = src === 'frigo' ? 'La famille mange au réfrigérateur.'
    : src === 'boite' ? `La famille mange à la boîte à nourriture : ${itemsText(boiteCounts(state)) || 'elle est vide'}.`
      : src === 'inventaire' ? 'La famille mange ce qu\'il y a dans l\'inventaire.'
        : 'Pas de boîte à nourriture dans le foyer : fabrique-la à l\'Atelier et pose-la dans une pièce close, puis remplis-la.';
  return `
      <div class="card">
        <span class="card-title ration-title"><span>🍽️ Famille rassasiée : <span class="num">${formatPercent(jaugeFamille(state))}</span></span><span class="row ration-title-end">${faim ? `<span class="chip warn">⚠️ ${faim} ${faim > 1 ? 'ont' : 'a'} faim</span>` : ''}${helpToggleHtml('ration', 'faim de la famille')}</span></span>
        <span class="muted">${ou}</span>
        <span class="muted" id="ration-help"${helpOpen.has('ration') ? '' : ' hidden'}>Chaque membre (sauf toi) a une jauge de faim : elle baisse quand il marche et quand il aide. À ${F.SEUIL}, il va manger jusqu'à ${F.MAX} ; s'il ne trouve rien, il perd du bonheur la nuit. Plus la famille est rassasiée au coucher, plus ton énergie remonte en dormant : ${formatNumber(energyLevel({ energie: sleepTarget(state) }))} cette nuit.</span>
      </div>`;
}

// Fiche 19 : le compagnon (le second adulte) prend des initiatives à la ferme : l'option de le
// laisser faire, et ce qu'il a fait aujourd'hui (js/engine/compagnon.js).
function compagnonCardHtml() {
  const m = aidant(state);
  if (!m) return '';
  const C = DATA.COMPAGNON, f = faitsCompagnon(state), on = compagnonAide(state);
  const fait = [
    f.arroser ? `💧 ${f.arroser} légume${f.arroser > 1 ? 's' : ''} arrosé${f.arroser > 1 ? 's' : ''}` : '',
    f.cuisiner ? `🍲 ${f.cuisiner} repas préparé${f.cuisiner > 1 ? 's' : ''}` : '',
    f.ramasser ? `🧺 ${f.ramasser} ramassage${f.ramasser > 1 ? 's' : ''}` : '',
  ].filter(Boolean).join(' · ');
  return `
      <div class="card">
        <span class="card-title"><span>🤝 L'aide de ${memberNameHtml(m.id)}</span></span>
        <label class="row check-row">
          <input type="checkbox" id="compagnon-toggle" ${on ? 'checked' : ''}>
          Le laisser aider à la ferme de lui-même
        </label>
        <span class="muted">De ${C.HEURES[0]} h à ${finAide()} h, quand il n'a pas trop faim, il arrose quelques légumes qui ont soif (il remplit sa cruche au puits), prépare un plat à la cuisinière quand la famille a faim (chacun le mange quand il a faim) et ramasse un peu de bois ou de pierres autour de la ferme. Chaque tâche lui donne faim. Les bêtes, il s'en occupe toujours.</span>
        ${on ? `<span class="muted">Aujourd'hui : ${fait || 'rien encore'}.</span>` : ''}
      </div>`;
}

// Fiche 11 : la fiche du membre choisi (son onglet) vient d'abord : son équipement, son portrait, ses
// jauges (js/ui/fiche-membre.js). La liste des membres (le prénom, l'apparence, le personnage
// principal, les départs) ne paraît qu'en mode modification.
export function renderFamille() {
  return `
    <h2>👨‍👩‍👧‍👦 Famille${familyNameHtml() ? ` ${familyNameHtml()}` : ''}</h2>
    ${renderFicheMembre()}
    <button type="button" class="btn${familyEditing ? ' primary' : ''} family-edit-btn" data-action="family-edit" aria-pressed="${familyEditing}">${familyEditing ? '✅ Terminer' : '✏️ Modifier la famille'}</button>
    ${familyEditing ? `<ul class="member-rows">${state.famille.membres.map(portraitCard).join('')}</ul>
    ${renderFamilyAdd()}` : ''}
    <div class="cards">${repasCardHtml()}${compagnonCardHtml()}
    </div>
    ${renderPets()}
    <details class="more">
      <summary>En savoir plus</summary>
      <div class="cards">${energyDetailsHtml()}</div>
    </details>`;
}

// Fiche 19 : l'option du compagnon (state.compagnon.aide).
document.addEventListener('change', (e) => {
  if (!e.target || e.target.id !== 'compagnon-toggle') return;
  laisserAider(state, e.target.checked);
  persistState();
  refresh();
});

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
    openMemberModal(target.dataset.id, target.dataset.personnaliser === '1');
  },
  'member-perso': (target) => {
    if (memberDraft) { memberDraft.perso = Number(target.dataset.perso); memberDraft.apparence = null; }
    syncMemberModal();
  },
  // ----- étape E6 du chantier « couches » : l'apparence attribut par attribut -----
  'member-apparence': (target) => {
    choisirApparence(target.dataset.champ, target.dataset.valeur);
  },
  'member-apparence-hasard': () => {
    apparenceAuHasard(memberDraft);
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
      notify(`👋 Un ${enfant ? 'enfant' : 'adulte'} rejoint la famille.`);
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
