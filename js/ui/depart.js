import { DATA } from '../engine/catalog.js';
import { isOwned, starterOf } from '../engine/devices.js';
import {
  buyStarter, composeFamily, familyName, finishSetup, houseRepaired, repairHouse, setFarmSeed,
  setMainCharacter, setupPending, starterBlock,
} from '../engine/depart.js';
import { cleanFirstName, validFirstName } from '../engine/family.js';
import { atelierOuvert } from '../engine/atelier.js';
import { escapeHtml, formatCoins } from '../engine/format.js';
import { state } from './store.js';
import { persistState } from './storage.js';
import { applyResult } from './game-actions.js';
import { persoHtml } from './famille.js';
import { notify } from './toasts.js';
import { registerActions } from './actions.js';
import { canPay, costLabel } from './common.js';
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

// Fenêtre Installations, avant tout : la maison à réparer, puis les appareils à acheter.
export function renderStarterCards() {
  // la ferme générée : pas de maison à réparer, un foyer à bâtir (js/engine/blocs.js)
  if (!houseRepaired(state) && atelierOuvert(state)) {
    return `
      <div class="card starter house">
        <span class="card-title"><span>🧱 Ton foyer</span><span class="chip warn">À bâtir</span></span>
        <span class="muted">Pas de maison sur une terre sauvage : bâtis une pièce close (des murs tout autour, une porte) et pose-y une paillasse. Tant qu'elle n'existe pas, rien d'autre ne s'installe.</span>
      </div>`;
  }
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
      // la ferme générée : il se fabrique à l'Atelier et se pose sur la carte (étape 5b-2)
      if (atelierOuvert(state)) {
        const ou = t === 'pompe' ? 'sur un puits' : 'dehors';
        return `
        <div class="starter-row">
          <span><span aria-hidden="true">${L.icone}</span> <strong>${L.nom}</strong><br><span class="muted">${L.note}</span></span>
          <span class="muted">${raison && raison !== 'Achète d\'abord le panneau et la pompe.' ? escapeHtml(raison) : `À fabriquer à l'Atelier, puis à poser ${ou} (🔨).`}</span>
        </div>`;
      }
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

/* -- l'accueil d'une nouvelle partie : un dialogue, écran par écran -- */

// Le joueur décrit sa famille en répondant aux questions d'une petite fenêtre de dialogue (la
// police des dialogues) : son personnage, son prénom, son nom ; un compagnon ; des enfants ; des
// animaux de compagnie. À la fin, « C'est parti ! » installe la famille (composeFamily) sur une
// ferme générée d'après une graine au hasard. Les prénoms tapés restent dans `accueil` (et
// passent par escapeHtml()) : jamais dans un attribut data-* ni dans tel().
const accueil = {
  etape: 'bienvenue', perso: 0, prenom: '', nom: '',
  compagnon: null,                 // { perso, prenom } dès qu'il y en a un
  nbEnfants: 1, enfants: [],       // les prénoms, dans l'ordre
  animaux: [],                     // [{ espece, nom }]
  animal: { espece: 'chien', nom: '' },
  k: 0,                            // l'enfant dont on demande le prénom
  erreur: '',
};

const ORDINAUX = ['premier', 'deuxième', 'troisième', 'quatrième', 'cinquième', 'sixième'];

const enfantsMax = () => DATA.FAMILLE.COMPOSITION.MEMBRES_MAX - 1 - (accueil.compagnon ? 1 : 0);
const seul = () => !accueil.compagnon && !accueil.enfants.length && !accueil.animaux.length;

// La flèche en bas à droite : l'écran suivant.
const fleche = (actif = true) => `<button type="button" class="accueil-suite" data-action="accueil-suite"${actif ? '' : ' disabled'} aria-label="Suivant" title="Suivant"><span aria-hidden="true"></span></button>`;
const ouiNon = () => `<div class="accueil-choix"><button type="button" class="btn primary" data-action="accueil-oui">Oui</button><button type="button" class="btn" data-action="accueil-non">Non</button></div>`;
const champ = (valeur, max, label, attrs = '') => `<input type="text" id="accueil-champ" class="member-input accueil-champ" maxlength="${max}" autocomplete="off" autocapitalize="words" spellcheck="false" aria-label="${label}" value="${escapeHtml(valeur)}"${attrs}>`;
const grille = (choisi, enfant = false) => `<div class="perso-grid accueil-persos">${Array.from({ length: enfant ? DATA.FAMILLE.PROFIL.PERSOS_ENFANT : DATA.FAMILLE.PROFIL.PERSOS }, (_, i) => i + 1)
  .map((n) => `<button type="button" class="btn perso-btn${n === choisi ? ' active' : ''}" data-action="accueil-perso" data-perso="${n}" aria-pressed="${n === choisi}" aria-label="Personnage ${n}">${persoHtml(n)}</button>`).join('')}</div>`;
const portrait = (n) => (n ? `<div class="accueil-portrait">${persoHtml(n)}</div>` : '');

// Le texte et ce qui se règle, pour l'écran en cours.
function ecranAccueil() {
  const A = accueil, P = DATA.FAMILLE.PROFIL, D = DATA.DEPART;
  switch (A.etape) {
    case 'bienvenue':
      return ['Bienvenue dans Family Farm ! Ici tu peux construire ta ferme, élever des animaux, produire des ressources et fabriquer des objets, cuisiner des recettes et plein d\'autres super activités !', fleche()];
    case 'perso':
      return ['Pour commencer, choisis un personnage :', grille(A.perso) + fleche(A.perso > 0)];
    case 'prenom':
      return ['Comment s\'appelle-t-il ?', portrait(A.perso) + champ(A.prenom, P.PRENOM_MAX, 'Prénom') + fleche()];
    case 'nom':
      return ['Et son nom ?', portrait(A.perso) + champ(A.nom, D.NOM_MAX, 'Nom') + fleche()];
    case 'confirme':
      return [`OK, donc c'est ${escapeHtml(A.prenom)} ${escapeHtml(A.nom)}, c'est bien ça ?`, `${portrait(A.perso)}<div class="accueil-choix"><button type="button" class="pose-meuble-ok" data-action="accueil-oui" aria-label="Oui, c'est bien ça" title="Oui">✔️</button><button type="button" class="pose-meuble-non" data-action="accueil-non" aria-label="Non, changer" title="Changer">❌</button></div>`];
    case 'compagnon':
      return ['Est-ce qu\'il a un compagnon ?', ouiNon()];
    case 'compagnon-perso':
      return ['Choisis le personnage du compagnon :', grille(A.compagnon.perso) + fleche(A.compagnon.perso > 0)];
    case 'compagnon-prenom':
      return ['Quel est son prénom ?', portrait(A.compagnon.perso) + champ(A.compagnon.prenom, P.PRENOM_MAX, 'Prénom du compagnon') + fleche()];
    case 'enfants':
      return ['Et des enfants ?', ouiNon()];
    case 'enfants-nombre':
      return ['Combien ?', `<input type="number" id="accueil-champ" class="member-input accueil-champ accueil-nombre" min="1" max="${enfantsMax()}" step="1" inputmode="numeric" aria-label="Nombre d'enfants" value="${A.nbEnfants}">${fleche()}`];
    case 'enfant-prenom':
      return [A.nbEnfants === 1 ? 'Quel est son prénom ?' : `Quel est le prénom du ${ORDINAUX[A.k]} enfant ?`, champ(A.enfants[A.k] || '', P.PRENOM_MAX, `Prénom de l'enfant ${A.k + 1}`) + fleche()];
    case 'animal':
      return ['Un (ou des) animal de compagnie ?', ouiNon()];
    case 'animal-nom': {
      const E = DATA.FAMILLE.COMPAGNIE.ESPECES;
      const especes = Object.keys(E).map((k) => `<button type="button" class="btn accueil-espece${A.animal.espece === k ? ' active' : ''}" data-action="accueil-espece" data-id="${k}" aria-pressed="${A.animal.espece === k}">${E[k].icone} ${escapeHtml(E[k].nom)}</button>`).join('');
      return [A.animaux.length ? 'Et celui-là, comment s\'appelle-t-il ?' : 'Comment s\'appelle-t-il ?', `<div class="accueil-choix">${especes}</div>${champ(A.animal.nom, P.PRENOM_MAX, 'Nom de l\'animal')}${fleche()}`];
    }
    case 'animal-autre':
      return ['Un autre ?', ouiNon()];
    default:
      return [`Parfait ! Une super aventure ${seul() ? 't\'attend' : 'vous attend'} !`, '<div class="accueil-choix"><button type="button" class="btn primary" data-action="setup-start">C\'est parti !</button></div>'];
  }
}

export function openSetupModal() {
  if (accueil.etape === 'bienvenue') tel('modal', 'setup');
  const [texte, reglage] = ecranAccueil();
  openModal(`
    <p class="accueil-texte" id="accueil-texte">${texte}</p>
    <div class="accueil-reglage">${reglage}</div>
    <p class="alert" id="setup-error" role="alert"${accueil.erreur ? '' : ' hidden'}>${escapeHtml(accueil.erreur)}</p>`,
  { labelledBy: 'accueil-texte', className: `modal bois accueil-modal accueil-${accueil.etape}`, id: 'setup-modal', dismiss: false, focus: '#accueil-champ, .accueil-suite:not([disabled]), .accueil-choix button' });
  const input = document.getElementById('accueil-champ');
  if (input) {
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); suiteAccueil(); } });
  }
}

// Passe à l'écran `etape` (sans message d'erreur).
function allerA(etape) {
  accueil.etape = etape;
  accueil.erreur = '';
  openSetupModal();
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
    case 'perso': return A.perso ? allerA('prenom') : refus('Choisis un personnage.');
    case 'prenom': {
      A.prenom = cleanFirstName(valeurChamp());
      const e = prenom(A.prenom);
      return e ? refus(e) : allerA('nom');
    }
    case 'nom': {
      A.nom = valeurChamp().trim().replace(/\s+/g, ' ');
      if (A.nom.length < D.NOM_MIN || A.nom.length > D.NOM_MAX) return refus(`Un nom de ${D.NOM_MIN} à ${D.NOM_MAX} signes.`);
      return allerA('confirme');
    }
    case 'compagnon-perso': return A.compagnon.perso ? allerA('compagnon-prenom') : refus('Choisis un personnage.');
    case 'compagnon-prenom': {
      A.compagnon.prenom = cleanFirstName(valeurChamp());
      const e = prenom(A.compagnon.prenom);
      return e ? refus(e) : allerA('enfants');
    }
    case 'enfants-nombre': {
      const n = Number(valeurChamp());
      if (!Number.isInteger(n) || n < 1 || n > enfantsMax()) return refus(`Entre 1 et ${enfantsMax()} enfants.`);
      A.nbEnfants = n;
      A.enfants = A.enfants.slice(0, n);
      A.k = 0;
      return allerA('enfant-prenom');
    }
    case 'enfant-prenom': {
      const t = cleanFirstName(valeurChamp());
      const e = prenom(t);
      if (e) return refus(e);
      A.enfants[A.k] = t;
      if (A.k + 1 < A.nbEnfants) { A.k += 1; return allerA('enfant-prenom'); }
      return allerA('animal');
    }
    case 'animal-nom': {
      A.animal.nom = cleanFirstName(valeurChamp());
      if (!validFirstName(A.animal.nom)) return refus(`Un nom de 1 à ${P.PRENOM_MAX} signes.`);
      A.animaux.push({ ...A.animal });
      A.animal = { espece: A.animal.espece, nom: '' };
      return allerA(A.animaux.length < DATA.FAMILLE.COMPAGNIE.MAX ? 'animal-autre' : 'fin');
    }
    default: return undefined;
  }
}

// Oui (✔️) ou non (❌) à la question de l'écran en cours.
function reponseAccueil(oui) {
  const A = accueil;
  switch (A.etape) {
    case 'confirme': return allerA(oui ? 'compagnon' : 'perso');
    case 'compagnon':
      if (!oui) { A.compagnon = null; return allerA('enfants'); }
      if (!A.compagnon) A.compagnon = { perso: 0, prenom: '' };
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
  'repair-house': () => {
    const r = applyResult(repairHouse(state));
    if (r.ok) notify(`🏠 La maison est réparée (−${formatCoins(r.cost)} 💰). Installe le panneau et la pompe.`);
  },
  'buy-starter': (target) => {
    const t = target.dataset.id;
    const r = applyResult(buyStarter(state, t));
    if (r.ok) {
      const L = STARTER_LABELS[t];
      notify(`${L.icone} ${L.nom} installé (−${formatCoins(r.cost)} 💰)${r.ouvert && (t === 'panneau' || t === 'pompe') ? ' · la Zone de culture et le Marché ouvrent' : ''}`);
    }
  },
  'main-character': (target) => {
    const r = applyResult(setMainCharacter(state, target.dataset.id));
    if (setupPending(state)) openSetupModal();
    else if (r.ok) {
      persistState();
      notify('⭐ Nouveau personnage principal.');
    }
  },
  'accueil-suite': () => suiteAccueil(),
  'accueil-oui': () => reponseAccueil(true),
  'accueil-non': () => reponseAccueil(false),
  'accueil-perso': (target) => {
    const n = Number(target.dataset.perso);
    if (accueil.etape === 'compagnon-perso') accueil.compagnon.perso = n;
    else accueil.perso = n;
    accueil.erreur = '';
    openSetupModal();
  },
  'accueil-espece': (target) => {
    accueil.animal.espece = target.dataset.id;
    accueil.animal.nom = valeurChamp();
    openSetupModal();
  },
  'setup-start': () => {
    const A = accueil, P = DATA.FAMILLE.PROFIL;
    // les enfants : un personnage d'enfant au hasard (il se change dans la Famille)
    const r = composeFamily(state, {
      perso: A.perso, prenom: A.prenom, nom: A.nom, compagnon: A.compagnon,
      enfants: A.enfants.map((prenom) => ({ prenom, perso: 1 + Math.floor(Math.random() * P.PERSOS_ENFANT) })),
      animaux: A.animaux,
    });
    const f = r.ok ? finishSetup(state) : r;
    if (!f.ok) return refus(f.error);
    // une terre sauvage : la ferme générée (la carte se lit au montage : la page se recharge)
    setFarmSeed(state, String(Math.floor(Math.random() * 1e6)));
    persistState();
    location.reload();
    return undefined;
  },
});
