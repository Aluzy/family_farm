import { DATA } from '../engine/catalog.js';
import { isOwned, starterOf } from '../engine/devices.js';
import {
  composeFamily, familyName, finishSetup, houseRepaired, setMainCharacter, setupPending, starterBlock,
} from '../engine/depart.js';
import { cleanFirstName, validFirstName } from '../engine/family.js';
import { commencerObjectifs } from '../engine/objectifs.js';
import { villageActif } from '../engine/village.js';
import { familleSeule, nomIlePropose, nommerIle } from '../engine/depart-ile.js';
import { levelBlock } from '../engine/levels.js';
import { escapeHtml } from '../engine/format.js';
import { state } from './store.js';
import { persistState } from './storage.js';
import { applyResult } from './game-actions.js';
import { apparenceAuHasard, apparenceChoixHtml, appliquerChoixApparence, persoHtml } from './famille.js';
import { apparencesPretes, chargerApparences, plancheApparence } from './apparence.js';
import { notify } from './toasts.js';
import { registerActions } from './actions.js';
import { tel } from './consent.js';
import { openModal } from './modal.js';

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

// Fenêtre Installations, avant tout : le foyer à bâtir, puis le panneau, la pompe, la citerne et
// la batterie, qui se fabriquent à l'Atelier et se posent sur la carte (étape 5b-2).
export function renderStarterCards() {
  if (!houseRepaired(state)) {
    return `
      <div class="card starter house">
        <span class="card-title"><span>🧱 Ton foyer</span><span class="chip warn">À bâtir</span></span>
        <span class="muted">Pas de maison sur une terre sauvage : bâtis une pièce close (des murs tout autour, une porte) et pose-y une paillasse. Tant qu'elle n'existe pas, rien d'autre ne s'installe.</span>
      </div>`;
  }
  const rows = ['panneau', 'pompe', 'reservoir', 'batterie']
    .filter((t) => !isOwned(starterOf(state, t)))
    .map((t) => {
      const L = STARTER_LABELS[t];
      const raison = starterBlock(state, t);
      const ou = t === 'pompe' ? 'sur un puits' : 'dehors';
      const verrou = levelBlock(state, 'energie');
      return `
        <div class="starter-row">
          <span><span aria-hidden="true">${L.icone}</span> <strong>${L.nom}</strong><br><span class="muted">${L.note}</span></span>
          <span class="muted">${verrou || (raison && raison !== 'Achète d\'abord le panneau et la pompe.' ? escapeHtml(raison) : `À fabriquer à l'Atelier, puis à poser ${ou} (🔨).`)}</span>
        </div>`;
    });
  if (!rows.length) return '';
  return `
    <div class="card starter">
      <span class="card-title"><span>🛠️ Installer la ferme</span></span>
      <span class="muted">Le panneau et la pompe remplissent la citerne pour toi : l'automatisation commence.</span>
      ${rows.join('')}
    </div>`;
}

/* -- l'accueil d'une nouvelle partie : un dialogue, écran par écran -- */

// Le joueur décrit sa famille en répondant aux questions d'une petite fenêtre de dialogue (la
// police des dialogues) : son personnage, son prénom, son nom ; son compagnon (obligatoire : le récit, lot 8) ; des enfants (le
// personnage et le prénom de chacun, fiche 18) ; des animaux de compagnie. Sur chaque écran, la flèche ◀ (en bas à
// gauche) revient à l'écran d'avant, ce qui a été saisi gardé (accueil.pile). La fin est un récapitulatif : chacun son
// portrait, son prénom, son rôle, ✏️ pour le changer (ses écrans, puis le récapitulatif), 🗑️ pour retirer un enfant ou
// un animal, ＋ pour en ajouter. « Valider et commencer » installe la famille (composeFamily) sur une
// ferme générée d'après une graine au hasard. Les prénoms tapés restent dans `accueil` (et
// passent par escapeHtml()) : jamais dans un attribut data-* ni dans tel().
//
// Le chantier « l'île à bâtir » allumé (fiche I7b) : le premier écran dit DEPART.PHRASE (data/village.json) et propose
// « Seul » (un adulte tiré de la graine, js/engine/depart-ile.js familleSeule : un appui) ou « En famille » (les écrans
// d'avant, le compagnon facultatif) ; le dernier écran nomme l'île (un nom proposé, modifiable), puis « Commencer ».
const accueil = {
  etape: 'bienvenue', perso: 0, prenom: '', nom: '',
  apparence: null,                 // l'apparence à lui (chantier « couches »), ou null : son personnage
  compagnon: null,                 // { perso, prenom, apparence } dès qu'il y en a un
  nbEnfants: 1, enfants: [],       // [{ perso, prenom, apparence }], dans l'ordre (perso 0 : pas encore choisi)
  animaux: [],                     // [{ espece, nom }]
  animal: { espece: 'chien', nom: '' },
  k: 0,                            // l'enfant dont on demande le personnage, puis le prénom
  erreur: '',
  // Les écrans déjà passés (la flèche ◀ y revient, ce qui a été saisi est gardé) : [{ etape, k }].
  pile: [],
  // Le récapitulatif (l'écran de la fin) : un membre qu'on change (✏️) ou qu'on ajoute (＋) ; ses écrans finis, on
  // y revient. modif : null, ou { ajout: 'enfant' | 'animal' | null } ; animalI : l'animal qu'on nomme.
  modif: null,
  animalI: -1,
  seul: false,                     // (le chantier allumé) « Seul » : un adulte tiré de la graine
  ile: '',                         // (le chantier allumé) le nom de l'île, tel qu'il est saisi
};

// Le chantier « l'île à bâtir » est-il allumé pour la partie qu'on commence ?
const surIle = () => !!(state && villageActif(state));

const ORDINAUX = ['premier', 'deuxième', 'troisième', 'quatrième', 'cinquième', 'sixième'];

const enfantsMax = () => DATA.FAMILLE.COMPOSITION.MEMBRES_MAX - 1 - (accueil.compagnon ? 1 : 0);

// La flèche en bas à droite : l'écran suivant.
const fleche = (actif = true) => `<button type="button" class="accueil-suite" data-action="accueil-suite"${actif ? '' : ' disabled'} aria-label="Suivant" title="Suivant"><span aria-hidden="true"></span></button>`;
// La flèche ◀ : l'écran d'avant (en bas à gauche ; dans la ligne d'un champ, à gauche de lui).
const retour = () => (accueil.pile.length ? '<button type="button" class="accueil-retour" data-action="accueil-retour" aria-label="Retour" title="Retour"><span aria-hidden="true"></span></button>' : '');
const ouiNon = () => `<div class="accueil-choix"><button type="button" class="btn primary" data-action="accueil-oui">Oui</button><button type="button" class="btn" data-action="accueil-non">Non</button></div>`;
// Un champ à remplir, et sa flèche à côté de lui (pas en bas de la fenêtre) : sur un téléphone, le clavier ouvert
// couvre le bas de l'écran ; le navigateur montre le champ, donc la flèche avec. La touche Entrée du clavier
// (enterkeyhint : « Suivant ») valide aussi.
const ligne = (input) => `<div class="accueil-ligne">${retour()}${input}${fleche()}</div>`;
const champ = (valeur, max, label, attrs = '') => ligne(`<input type="text" id="accueil-champ" class="member-input accueil-champ" maxlength="${max}" autocomplete="off" autocapitalize="words" spellcheck="false" enterkeyhint="next" aria-label="${label}" value="${escapeHtml(valeur)}"${attrs}>`);
const grille = (choisi, enfant = false) => `<div class="perso-grid accueil-persos${enfant ? ' accueil-persos-enfant' : ''}">${Array.from({ length: enfant ? DATA.FAMILLE.PROFIL.PERSOS_ENFANT : DATA.FAMILLE.PROFIL.PERSOS }, (_, i) => i + 1)
  .map((n) => `<button type="button" class="btn perso-btn${n === choisi ? ' active' : ''}" data-action="accueil-perso" data-perso="${n}" aria-pressed="${n === choisi}" aria-label="${enfant ? 'Enfant' : 'Personnage'} ${n}">${persoHtml(n, enfant)}</button>`).join('')}</div>`;
// Le portrait de `qui` ({ perso, apparence }) : son apparence à lui s'il en a une (js/ui/apparence.js), sinon son personnage.
// `vivant` : il respire et cligne des yeux (le portrait en grand des écrans de l'accueil, css/jeu.css .accueil-portrait).
const visage = (qui, enfant = false, vivant = '') => persoHtml(qui.perso, enfant, '', vivant, qui.apparence ? plancheApparence(qui.apparence, enfant) : null);
const portrait = (qui, enfant = false) => (qui && qui.perso ? `<div class="accueil-portrait">${visage(qui, enfant, `accueil-${qui === accueil ? 'joueur' : qui === accueil.compagnon ? 'compagnon' : 'enfant'}`)}</div>` : '');
// L'enfant `k` ({ perso, prenom, apparence } ; perso 0 tant qu'il n'est pas choisi).
const enfantK = (k = accueil.k) => (accueil.enfants[k] || (accueil.enfants[k] = { perso: 0, prenom: '', apparence: null }));
// Celui dont on choisit le personnage ou l'apparence à l'écran en cours : le joueur, son compagnon, ou l'enfant `k`.
const quiEtape = () => (accueil.etape.startsWith('compagnon-') ? [accueil.compagnon, false] : accueil.etape.startsWith('enfant-') ? [enfantK(), true] : [accueil, false]);
// L'écran « Personnaliser » (chantier « couches », docs/personnage-couches.md) : juste après le choix du personnage,
// chaque attribut (la peau, les yeux, la coiffure, la tenue…) se change ; la flèche garde le choix (ou aucun).
function apparenceEcran() {
  const [qui, enfant] = quiEtape();
  if (!apparencesPretes()) {
    chargerApparences(() => { if (accueil.etape.endsWith('apparence')) openSetupModal(); });
    return `${portrait(qui, enfant)}<p class="muted">Un instant…</p>${fleche()}`;
  }
  const retour = qui.apparence ? '<button type="button" class="btn" data-action="accueil-apparence-retour">↺ Comme le personnage choisi</button>' : '';
  return `${portrait(qui, enfant)}<div class="accueil-personnaliser">${apparenceChoixHtml({ perso: qui.perso, enfant, apparence: qui.apparence }, 'accueil-apparence')}</div>${retour}${fleche()}`;
}
const deLEnfant = () => (accueil.nbEnfants === 1 ? 'de l\'enfant' : `du ${ORDINAUX[accueil.k]} enfant`);
// Le récapitulatif, à la fin : chacun son portrait, son prénom, son rôle, un ✏️ pour le changer (et une 🗑 pour
// retirer un enfant ou un animal) ; ＋ pour en ajouter. Les prénoms tapés passent par escapeHtml().
function familleChoisie() {
  const A = accueil, E = DATA.FAMILLE.COMPAGNIE.ESPECES;
  const boutons = (qui, i, retirer, nom) => `<span class="accueil-recap-boutons"><button type="button" class="btn accueil-crayon" data-action="accueil-modifier" data-qui="${qui}" data-i="${i}" aria-label="Modifier ${nom}" title="Modifier">✏️</button>${retirer ? `<button type="button" class="btn accueil-crayon" data-action="accueil-retirer" data-qui="${qui}" data-i="${i}" aria-label="Retirer ${nom}" title="Retirer">🗑️</button>` : ''}</span>`;
  const un = (qui, enfant, role, cle, i, retirer) => `<li>${visage(qui, enfant)}<span class="accueil-recap-qui"><strong>${escapeHtml(qui.prenom)}${cle === 'joueur' ? ` ${escapeHtml(A.nom)}` : ''}</strong><small>${role}</small></span>${boutons(cle, i, retirer, escapeHtml(qui.prenom))}</li>`;
  const gens = [un(A, false, 'Toi', 'joueur', 0, false)];
  if (A.compagnon) gens.push(un(A.compagnon, false, 'Compagnon', 'compagnon', 0, surIle()));
  A.enfants.forEach((e, i) => gens.push(un(e, true, 'Enfant', 'enfant', i, true)));
  const betes = A.animaux.map((a, i) => `<li><span class="accueil-animal-icone" aria-hidden="true">${(E[a.espece] || {}).icone || ''}</span><span class="accueil-recap-qui"><strong>${escapeHtml(a.nom)}</strong><small>${escapeHtml((E[a.espece] || {}).nom || '')}</small></span>${boutons('animal', i, true, escapeHtml(a.nom))}</li>`);
  const plus = [
    A.enfants.length < enfantsMax() ? '<button type="button" class="btn" data-action="accueil-ajouter" data-qui="enfant">＋ Un enfant</button>' : '',
    A.animaux.length < DATA.FAMILLE.COMPAGNIE.MAX ? '<button type="button" class="btn" data-action="accueil-ajouter" data-qui="animal">＋ Un animal</button>' : '',
  ].join('');
  return `<ul class="accueil-recap" aria-label="Ta famille">${gens.concat(betes).join('')}</ul>${plus ? `<div class="accueil-choix accueil-plus">${plus}</div>` : ''}`;
}

// Le texte et ce qui se règle, pour l'écran en cours.
function ecranAccueil() {
  const A = accueil, P = DATA.FAMILLE.PROFIL, D = DATA.DEPART;
  switch (A.etape) {
    case 'bienvenue':
      if (surIle()) return [escapeHtml(DATA.VILLAGE.DEPART.PHRASE), '<div class="accueil-choix accueil-depart"><button type="button" class="btn primary" data-action="accueil-seul">🧍 Seul</button><button type="button" class="btn" data-action="accueil-famille">👪 En famille</button></div>'];
      return ['Bienvenue dans Moon Bloom Village ! Ici tu peux construire ta ferme, élever des animaux, produire des ressources et fabriquer des objets, cuisiner des recettes et plein d\'autres super activités !', fleche()];
    case 'ile': {
      const seul = A.seul ? familleSeule(state) : null;
      return ['Le nom de ton île ?', `${seul ? portrait({ perso: seul.perso, apparence: null }) : ''}${champ(A.ile, D.NOM_MAX, 'Nom de l\'île')}<div class="accueil-choix"><button type="button" class="btn primary accueil-valider" data-action="setup-start">🏝️ Commencer</button></div>`];
    }
    case 'compagnon':
      return ['Quelqu\'un partage sa vie ?', ouiNon() + retour()];
    case 'perso':
      return ['Pour commencer, choisis un personnage :', grille(A.perso) + retour() + fleche(A.perso > 0)];
    case 'apparence':
    case 'compagnon-apparence':
    case 'enfant-apparence':
      return ['Tu peux personnaliser son apparence (la peau, les yeux, la coiffure, la tenue…), ou passer à la suite :', apparenceEcran() + retour()];
    case 'prenom':
      return ['Comment s\'appelle-t-il ?', portrait(A) + champ(A.prenom, P.PRENOM_MAX, 'Prénom')];
    case 'nom':
      return ['Et son nom ?', portrait(A) + champ(A.nom, D.NOM_MAX, 'Nom')];
    case 'confirme':
      return [`OK, donc c'est ${escapeHtml(A.prenom)} ${escapeHtml(A.nom)}, c'est bien ça ?`, `${portrait(A)}<div class="accueil-choix"><button type="button" class="pose-meuble-ok" data-action="accueil-oui" aria-label="Oui, c'est bien ça" title="Oui">✔️</button><button type="button" class="pose-meuble-non" data-action="accueil-non" aria-label="Non, changer" title="Changer">❌</button></div>${retour()}`];
    case 'compagnon-perso':
      if (surIle()) return ['Choisis le personnage du compagnon :', grille(A.compagnon.perso) + retour() + fleche(A.compagnon.perso > 0)];
      return ['Qui partage sa vie ? Choisis le personnage du compagnon (il gardera la ferme quand tu partiras explorer) :', grille(A.compagnon.perso) + retour() + fleche(A.compagnon.perso > 0)];
    case 'compagnon-prenom':
      return ['Quel est son prénom ?', portrait(A.compagnon) + champ(A.compagnon.prenom, P.PRENOM_MAX, 'Prénom du compagnon')];
    case 'enfants':
      return [A.compagnon ? 'Est-ce qu\'ils ont des enfants ?' : 'Est-ce qu\'il a des enfants ?', ouiNon() + retour()];
    case 'enfants-nombre':
      return ['Combien ?', ligne(`<input type="number" id="accueil-champ" class="member-input accueil-champ accueil-nombre" min="1" max="${enfantsMax()}" step="1" inputmode="numeric" enterkeyhint="next" aria-label="Nombre d'enfants" value="${A.nbEnfants}">`)];
    case 'enfant-perso':
      return [`Choisis le personnage ${deLEnfant()} :`, grille(enfantK().perso, true) + retour() + fleche(enfantK().perso > 0)];
    case 'enfant-prenom':
      return [A.nbEnfants === 1 ? 'Quel est son prénom ?' : `Quel est le prénom du ${ORDINAUX[A.k]} enfant ?`, portrait(enfantK(), true) + champ(enfantK().prenom, P.PRENOM_MAX, `Prénom de l'enfant ${A.k + 1}`)];
    case 'animal':
      return ['Un (ou des) animal de compagnie ?', ouiNon() + retour()];
    case 'animal-nom': {
      const E = DATA.FAMILLE.COMPAGNIE.ESPECES;
      const especes = Object.keys(E).map((k) => `<button type="button" class="btn accueil-espece${A.animal.espece === k ? ' active' : ''}" data-action="accueil-espece" data-id="${k}" aria-pressed="${A.animal.espece === k}">${E[k].icone} ${escapeHtml(E[k].nom)}</button>`).join('');
      return [A.animaux.length ? 'Et celui-là, comment s\'appelle-t-il ?' : 'Comment s\'appelle-t-il ?', `<div class="accueil-choix">${especes}</div>${champ(A.animal.nom, P.PRENOM_MAX, 'Nom de l\'animal')}`];
    }
    case 'animal-autre':
      return ['Un autre ?', ouiNon() + retour()];
    default:
      if (surIle()) return ['Voici ta famille ! Touche ✏️ pour changer quelqu\'un, puis valide.', `${familleChoisie()}<div class="accueil-choix"><button type="button" class="btn primary accueil-valider" data-action="accueil-vers-ile">✔️ Valider</button></div>${retour()}`];
      return ['Voici ta famille ! Touche ✏️ pour changer quelqu\'un, puis valide.', `${familleChoisie()}<div class="accueil-choix"><button type="button" class="btn primary accueil-valider" data-action="setup-start">✔️ Valider et commencer</button></div>${retour()}`];
  }
}

// Un écran tactile (un téléphone, une tablette) : le curseur n'y va pas tout seul dans un champ, ce qui ouvrirait le
// clavier par-dessus l'écran ; le joueur touche le champ quand il veut écrire. Ailleurs, il peut taper tout de suite.
const tactile = () => typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches;

export function openSetupModal() {
  if (accueil.etape === 'bienvenue') tel('modal', 'setup');
  const [texte, reglage] = ecranAccueil();
  openModal(`
    <p class="accueil-texte" id="accueil-texte">${texte}</p>
    <div class="accueil-reglage">${reglage}</div>
    <p class="alert" id="setup-error" role="alert"${accueil.erreur ? '' : ' hidden'}>${escapeHtml(accueil.erreur)}</p>`,
  { labelledBy: 'accueil-texte', className: `modal bois accueil-modal accueil-${accueil.etape}`, id: 'setup-modal', dismiss: false, focus: `${tactile() ? '' : '#accueil-champ, '}.accueil-suite:not([disabled]), .accueil-choix button` });
  const input = document.getElementById('accueil-champ');
  if (input) {
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); suiteAccueil(); } });
  }
}

// Passe à l'écran `etape` (sans message d'erreur) ; l'écran quitté va sur la pile (la flèche ◀ y revient), sauf
// `arriere` (on y revient justement). Le récapitulatif atteint au bout d'un changement (✏️, ＋) : le changement est fini.
function allerA(etape, arriere = false) {
  const A = accueil;
  if (!arriere) A.pile.push({ etape: A.etape, k: A.k });
  if (etape === 'fin' && A.modif) finirModif();
  // le clavier d'un téléphone : il reste ouvert d'un champ au suivant (le prénom, puis le nom) ; il se ferme
  // quand l'écran suivant n'a pas de champ (le champ qui l'avait ouvert s'en va)
  const ecrit = !!(document.activeElement && document.activeElement.id === 'accueil-champ');
  if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
  accueil.etape = etape;
  accueil.erreur = '';
  openSetupModal();
  const champ = ecrit && document.getElementById('accueil-champ');
  if (champ) champ.focus();
}

// Le changement commencé au récapitulatif est fini (ou abandonné par ◀) : un enfant ajouté sans personnage ni prénom
// est retiré ; plus de retour en arrière au-delà du récapitulatif (✏️ et ＋ y suffisent).
function finirModif() {
  const A = accueil;
  if (A.modif.ajout === 'enfant') A.enfants = A.enfants.filter((e) => e.perso && e.prenom);
  A.nbEnfants = Math.max(1, A.enfants.length);
  A.modif = null;
  A.animalI = -1;
  A.pile = [];
}

// Un changement depuis le récapitulatif : ses écrans, puis le récapitulatif ; ◀ au premier écran y revient.
function modifier(etape, ajout = null) {
  const A = accueil;
  A.pile = [{ etape: 'fin', k: A.k }];
  A.modif = { ajout };
  allerA(etape, true);
}

// La flèche ◀ : ce qui est écrit dans le champ est gardé (sans vérifier), puis l'écran d'avant.
function retourAccueil() {
  const A = accueil, v = valeurChamp();
  if (document.getElementById('accueil-champ')) {
    if (A.etape === 'prenom') A.prenom = cleanFirstName(v);
    else if (A.etape === 'nom') A.nom = v.trim().replace(/\s+/g, ' ');
    else if (A.etape === 'compagnon-prenom') A.compagnon.prenom = cleanFirstName(v);
    else if (A.etape === 'enfant-prenom') enfantK().prenom = cleanFirstName(v);
    else if (A.etape === 'animal-nom') A.animal.nom = cleanFirstName(v);
    else if (A.etape === 'ile') A.ile = v.trim().replace(/\s+/g, ' ');
  }
  const d = A.pile.pop();
  if (!d) return;
  A.k = d.k;
  // (revenir au nom d'un animal déjà ajouté : on le reprend, il ne sera pas ajouté deux fois)
  if (d.etape === 'animal-nom' && !A.modif && A.animaux.length) A.animal = A.animaux.pop();
  allerA(d.etape, true);
}

function refus(texte) {
  accueil.erreur = texte;
  openSetupModal();
}

const valeurChamp = () => { const i = document.getElementById('accueil-champ'); return i ? i.value : ''; };

// La flèche (ou Entrée dans un champ) : vérifie ce qui est saisi, puis l'écran suivant.
function suiteAccueil() {
  const A = accueil, P = DATA.FAMILLE.PROFIL, D = DATA.DEPART;
  const prenom = (t) => (validFirstName(t) ? '' : `Un prénom de 1 à ${P.PRENOM_MAX} signes.`);
  switch (A.etape) {
    case 'bienvenue': return allerA('perso');
    case 'ile': return commencer();
    case 'perso': return A.perso ? allerA('apparence') : refus('Choisis un personnage.');
    case 'apparence': return allerA('prenom');
    case 'compagnon-apparence': return allerA('compagnon-prenom');
    case 'enfant-apparence': return allerA('enfant-prenom');
    case 'prenom': {
      A.prenom = cleanFirstName(valeurChamp());
      const e = prenom(A.prenom);
      return e ? refus(e) : allerA('nom');
    }
    case 'nom': {
      A.nom = valeurChamp().trim().replace(/\s+/g, ' ');
      if (A.nom.length < D.NOM_MIN || A.nom.length > D.NOM_MAX) return refus(`Un nom de ${D.NOM_MIN} à ${D.NOM_MAX} signes.`);
      return allerA(A.modif ? 'fin' : 'confirme');
    }
    case 'compagnon-perso': return A.compagnon.perso ? allerA('compagnon-apparence') : refus('Choisis un personnage.');
    case 'compagnon-prenom': {
      A.compagnon.prenom = cleanFirstName(valeurChamp());
      const e = prenom(A.compagnon.prenom);
      return e ? refus(e) : allerA(A.modif ? 'fin' : 'enfants');
    }
    case 'enfants-nombre': {
      const n = Number(valeurChamp());
      if (!Number.isInteger(n) || n < 1 || n > enfantsMax()) return refus(`Entre 1 et ${enfantsMax()} enfants.`);
      A.nbEnfants = n;
      A.enfants = A.enfants.slice(0, n);
      A.k = 0;
      return allerA('enfant-perso');
    }
    case 'enfant-perso': return enfantK().perso ? allerA('enfant-apparence') : refus('Choisis un personnage.');
    case 'enfant-prenom': {
      const t = cleanFirstName(valeurChamp());
      const e = prenom(t);
      if (e) return refus(e);
      enfantK().prenom = t;
      if (A.modif) return allerA('fin');
      if (A.k + 1 < A.nbEnfants) { A.k += 1; return allerA('enfant-perso'); }
      return allerA('animal');
    }
    case 'animal-nom': {
      A.animal.nom = cleanFirstName(valeurChamp());
      if (!validFirstName(A.animal.nom)) return refus(`Un nom de 1 à ${P.PRENOM_MAX} signes.`);
      if (A.modif && A.animalI >= 0 && A.animalI < A.animaux.length) { A.animaux[A.animalI] = { ...A.animal }; A.animal = { espece: A.animal.espece, nom: '' }; return allerA('fin'); }
      A.animaux.push({ ...A.animal });
      A.animal = { espece: A.animal.espece, nom: '' };
      if (A.modif) return allerA('fin');
      return allerA(A.animaux.length < DATA.FAMILLE.COMPAGNIE.MAX ? 'animal-autre' : 'fin');
    }
    default: return undefined;
  }
}

// Oui (✔️) ou non (❌) à la question de l'écran en cours.
function reponseAccueil(oui) {
  const A = accueil;
  switch (A.etape) {
    // (le récit, lot 8 : le compagnon est obligatoire, docs/recit/personnages.md : il garde la ferme
    // quand le joueur explore ; plus de question, on le choisit tout de suite)
    case 'confirme':
      if (!oui) return allerA('perso');
      // (l'île à bâtir, fiche I7b : le compagnon est facultatif, on le demande)
      if (surIle()) return allerA('compagnon');
      if (!A.compagnon) A.compagnon = { perso: 0, prenom: '', apparence: null };
      return allerA('compagnon-perso');
    case 'compagnon':
      if (!oui) { A.compagnon = null; return allerA('enfants'); }
      if (!A.compagnon) A.compagnon = { perso: 0, prenom: '', apparence: null };
      return allerA('compagnon-perso');
    case 'enfants':
      if (!oui) { A.enfants = []; return allerA('animal'); }
      A.nbEnfants = Math.min(Math.max(1, A.nbEnfants), enfantsMax());
      return allerA('enfants-nombre');
    case 'animal':
      A.animaux = [];
      return allerA(oui ? 'animal-nom' : 'fin');
    case 'animal-autre': return allerA(oui ? 'animal-nom' : 'fin');
    default: return undefined;
  }
}

// Appelée à chaque image : l'accueil revient tant que la famille n'est pas installée.
export function watchSetup() {
  if (!state || !setupPending(state)) return;
  if (document.getElementById('modal-root').childElementCount > 0) return;
  openSetupModal();
}

/* ---------- actions de cet écran (voir ui/actions.js) ---------- */

registerActions({
  'main-character': (target) => {
    const r = applyResult(setMainCharacter(state, target.dataset.id));
    if (setupPending(state)) openSetupModal();
    else if (r.ok) {
      persistState();
      notify('⭐ Nouveau personnage principal.');
    }
  },
  'accueil-suite': () => suiteAccueil(),
  'accueil-retour': () => retourAccueil(),
  // Le récapitulatif : ✏️ change un membre (ses écrans, puis le récapitulatif), 🗑️ retire un enfant ou un animal,
  // ＋ en ajoute un.
  'accueil-modifier': (target) => {
    const A = accueil, i = Number(target.dataset.i) || 0;
    switch (target.dataset.qui) {
      case 'joueur': return modifier('perso');
      case 'compagnon': return modifier('compagnon-perso');
      case 'enfant': A.k = i; return modifier('enfant-perso');
      case 'animal': A.animalI = i; A.animal = { ...A.animaux[i] }; return modifier('animal-nom');
      default: return undefined;
    }
  },
  'accueil-retirer': (target) => {
    const A = accueil, i = Number(target.dataset.i) || 0;
    if (target.dataset.qui === 'enfant') { A.enfants.splice(i, 1); A.nbEnfants = Math.max(1, A.enfants.length); }
    else if (target.dataset.qui === 'compagnon' && surIle()) A.compagnon = null;
    else if (target.dataset.qui === 'animal') A.animaux.splice(i, 1);
    A.pile = [];
    openSetupModal();
  },
  'accueil-ajouter': (target) => {
    const A = accueil;
    if (target.dataset.qui === 'enfant' && A.enfants.length < enfantsMax()) {
      A.k = A.enfants.length;
      enfantK();
      A.nbEnfants = A.enfants.length;
      return modifier('enfant-perso', 'enfant');
    }
    if (target.dataset.qui === 'animal' && A.animaux.length < DATA.FAMILLE.COMPAGNIE.MAX) {
      A.animalI = A.animaux.length;
      A.animal = { espece: A.animal.espece || 'chien', nom: '' };
      return modifier('animal-nom', 'animal');
    }
    return undefined;
  },
  'accueil-oui': () => reponseAccueil(true),
  'accueil-non': () => reponseAccueil(false),
  'accueil-perso': (target) => {
    const n = Number(target.dataset.perso);
    const [qui] = quiEtape();
    // (un autre personnage : l'apparence choisie pour l'ancien ne le suit pas)
    if (qui.perso !== n) qui.apparence = null;
    qui.perso = n;
    accueil.erreur = '';
    // (la fenêtre reste où elle est : la grille garde sa position, et la flèche s'allume ; la refaire la ramènerait
    // en haut, loin du personnage choisi en bas de la grille)
    const m = document.getElementById('setup-modal');
    if (!m || !m.querySelector('.accueil-persos')) { openSetupModal(); return; }
    for (const b of m.querySelectorAll('.perso-btn')) {
      const oui = Number(b.dataset.perso) === n;
      b.classList.toggle('active', oui);
      b.setAttribute('aria-pressed', String(oui));
    }
    const suite = m.querySelector('.accueil-suite');
    if (suite) suite.disabled = false;
    const err = document.getElementById('setup-error');
    if (err) err.hidden = true;
  },
  'accueil-apparence': (target) => {
    const [qui, enfant] = quiEtape();
    const d = { perso: qui.perso, enfant, apparence: qui.apparence };
    appliquerChoixApparence(d, target.dataset.champ, target.dataset.valeur);
    qui.apparence = d.apparence;
    openSetupModal();
  },
  'accueil-apparence-hasard': () => {
    const [qui, enfant] = quiEtape();
    const d = { perso: qui.perso, enfant, apparence: qui.apparence };
    apparenceAuHasard(d);
    qui.apparence = d.apparence;
    openSetupModal();
  },
  'accueil-apparence-retour': () => {
    quiEtape()[0].apparence = null;
    openSetupModal();
  },
  'accueil-espece': (target) => {
    accueil.animal.espece = target.dataset.id;
    accueil.animal.nom = valeurChamp();
    openSetupModal();
  },
  'setup-start': () => commencer(),
  // (l'île à bâtir, fiche I7b) « Seul » : un appui, puis le nom de l'île ; « En famille » : les écrans d'avant ; le
  // récapitulatif validé : le nom de l'île
  'accueil-seul': () => { accueil.seul = true; if (!accueil.ile) accueil.ile = nomIlePropose(state); allerA('ile'); },
  'accueil-famille': () => { accueil.seul = false; allerA('perso'); },
  'accueil-vers-ile': () => { if (!accueil.ile) accueil.ile = nomIlePropose(state); allerA('ile'); },
});

// « Valider et commencer » (sur l'île : « Commencer », après le nom de l'île) : la famille installée, la partie commence.
function commencer() {
  const A = accueil;
  if (surIle()) {
    if (A.etape === 'ile' && document.getElementById('accueil-champ')) A.ile = valeurChamp().trim().replace(/\s+/g, ' ');
    const n = nommerIle(state, A.ile);
    if (!n.ok) return refus(n.error);
  }
  // les enfants : le personnage et le prénom choisis pour chacun (fiche 18 ; ils se changent
  // encore dans la Famille) ; seul (l'île à bâtir) : l'adulte tiré de la graine
  const r = composeFamily(state, surIle() && A.seul ? familleSeule(state) : {
    perso: A.perso, prenom: A.prenom, nom: A.nom, apparence: A.apparence, compagnon: A.compagnon,
    enfants: A.enfants.map((e) => ({ prenom: e.prenom, perso: e.perso, apparence: e.apparence })),
    animaux: A.animaux,
  });
  const f = r.ok ? finishSetup(state) : r;
  if (!f.ok) return refus(f.error);
  // la partie est sur sa terre sauvage depuis sa création (js/ui/storage.js) ; elle commence dans son abri,
  // avec les objectifs du jour (js/engine/objectifs.js ; le didacticiel d'avant reste aux parties commencées ; sur
  // l'île, le nouveau départ et son didacticiel : js/engine/depart-ile.js)
  commencerObjectifs(state);
  persistState();
  location.reload();
  return undefined;
}
