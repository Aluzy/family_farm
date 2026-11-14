// Point d'entrée du jeu : charge tous les modules, puis démarre la partie.
// jeu.html ne charge que ce fichier (<script type="module">) ; chacun importe ce dont il a besoin.

import { DATA } from './engine/catalog.js';
import { GAME_VERSION } from './engine/base.js';
import { chapterCount, mailbox } from './engine/campaign.js';
import { alertSnapshot } from './engine/alerts.js';
import { AUTOSAVE_MS, setState, state } from './ui/store.js';
import {setTelChapter, telDay, telView} from './ui/consent.js';
import { demenagementAnnonce, importSaveText, loadOrCreateState, makeSeed, persistState, sauvegardeAnnonce } from './ui/storage.js';
import { ecranTitre, ecranTitreVoulu } from './ui/ecran-titre.js';
import { lireTransfert } from './ui/transfert.js';
import { newGameFrom } from './engine/alerts.js';
import { partieNeuve } from './ui/village.js';
import { notify } from './ui/toasts.js';
import { catchUp, demarrerBoucles, onHide, setMailSeen, setPendingAbsence, setSimulatedAt, syncJobs } from './ui/loop.js';
import { oublierAdresseMine } from './ui/hote.js';
import { render } from './ui/render.js';
import { setEmojiNames, watch as watchEmojis } from './ui/pixel-emoji.js';
import { setAlertState } from './ui/toasts.js';
import * as engine from './engine/index.js';
import { texteDuRecit } from './engine/village.js';
import { stageModel } from './ui/stage.js';
import { stageWindow } from './ui/stage-windows.js';
import { wantConsentBanner } from './ui/calme.js';
import { garderPlusTard, relireFerme } from './ui/ferme-gardee.js';
import { connexionDuLien } from './ui/compte.js';
import { bandeau, invitationDuLien, mondeDemande, rejoindre } from './ui/en-ligne.js';
import { demarrerAmis } from './ui/amis.js';
import { demarrerGemmes } from './ui/gemmes.js';

// Chaque écran s'inscrit en se chargeant (ses actions, ses écouteurs) : ils sont tous
// chargés ici, qu'un autre module les importe ou non.
import './ui/store.js';
import './ui/consent.js';
import './ui/storage.js';
import './ui/game-actions.js';
import './ui/testmode.js';
import './ui/mesures.js';
import './ui/loop.js';
import './ui/render.js';
import './ui/stage.js';
import './ui/stage-windows.js';
import './ui/ferme.js';
import './ui/elevage.js';
import './ui/serre-verger-frigo.js';
import './ui/cuisine.js';
import './ui/livre.js';
import './ui/techno.js';
import './ui/famille.js';
import './ui/notifications.js';
import './ui/inventaire.js';
import './ui/caleche.js';
import './ui/chapitres.js';
import './ui/scene.js';
import './ui/carnet.js';
import './ui/niveaux.js';
import './ui/energie.js';
import './ui/houe.js';
import './ui/outils.js';
import './ui/depart.js';
import './ui/animations.js';
import './ui/aide.js';
import './ui/options.js';
import './ui/compta.js';
import './ui/tableau.js';
import './ui/toasts.js';
import './ui/actions.js';
import './ui/events.js';
import './ui/common.js';
import './ui/modal.js';
import './ui/hote.js';

/* ---------- démarrage ---------- */

// Le nom d'un objet sert de libellé à son icône (lecteurs d'écran) ; un emoji partagé par
// plusieurs objets de noms différents, ou qui sert aussi de symbole dans l'interface (🌿 :
// l'autonomie), garde l'emoji comme libellé.
const SYMBOLES_UI = new Set(['🌿']);
const emojiNames = {};
// (fiche I7d : un objet du récit ne prête pas son nom à son emoji — ✉️ n'est pas « Enveloppe de Maurice », 🔔 pas « Cloche
// de Maurice » : ces emojis servent aussi à l'interface, le courrier, les invitations, les alertes)
for (const it of Object.values(DATA.OBJETS)) {
  if (!it.icone || SYMBOLES_UI.has(it.icone) || texteDuRecit(it.nom)) continue;
  emojiNames[it.icone] = it.icone in emojiNames && emojiNames[it.icone] !== it.nom ? null : it.nom;
}
setEmojiNames(Object.fromEntries(Object.entries(emojiNames).filter(([, nom]) => nom)));
watchEmojis(); // emojis → icônes en pixel art partout dans la page (pixel-emoji.js)

// Lot 9 : les chapitres proposés par le mode test viennent de DATA.
document.getElementById('test-chapter').innerHTML =
  DATA.CHAPITRES.liste.map((ch, i) => `<option value="${i + 1}">${i + 1} · ${ch.titre}</option>`).join('') +
  `<option value="${chapterCount() + 1}">Jeu libre (fin)</option>`;

// Le chargement (docs/perf.md) : la ferme générée de la partie, gardée sur l'appareil lors d'une visite
// précédente, est relue avant la partie (js/ui/ferme-gardee.js : au plus 0,8 s d'attente) ; sinon elle
// est tirée comme avant, puis gardée une fois le jeu affiché.
async function demarrer() {
  // l'écran d'accueil (js/ui/ecran-titre.js) : Nouvelle partie ou Charger une partie, avant de charger
  // (la partie d'avant, revenue de l'ancienne adresse du jeu : js/ui/transfert.js ; l'écran d'accueil le dit)
  const transfert = await lireTransfert();
  const titre = transfert || ecranTitreVoulu() ? await ecranTitre(transfert) : null;
  await relireFerme();
  // E-2 : jeu.html?monde=… : la partie du monde en ligne (la partie solo reste intacte sur l'appareil)
  const monde = mondeDemande();
  const partieDuMonde = monde ? await rejoindre(monde) : null;
  if (monde && !partieDuMonde) { try { history.replaceState(null, '', 'jeu.html'); } catch (e) { /* (rien) */ } }
  setState(partieDuMonde || loadOrCreateState());
  if (titre && titre.choix === 'nouvelle' && !partieDuMonde) {
    // (comme « Recommencer à zéro » des options : une nouvelle partie à la place de celle de l'appareil)
    setState(partieNeuve(newGameFrom(state, makeSeed())));
    setSimulatedAt(Date.now());
    setPendingAbsence(null);
    persistState();
  } else if (titre && titre.choix === 'fichier' && !importSaveText(titre.texte)) {
    notify('Ce fichier n\'est pas une sauvegarde du jeu : une nouvelle partie commence.');
  }
  setTelChapter(state.campagne ? state.campagne.chapitre : null);
  syncJobs();
  setMailSeen(new Set(mailbox(state).map((l) => l.id))); // les lettres déjà là ne sont pas réannoncées
  setAlertState(alertSnapshot(state));
  catchUp(); // Lot 11 : le temps passé page fermée depuis la dernière sauvegarde
  demenagementAnnonce(); // une ancienne partie vient de quitter la ferme du grand-père
  sauvegardeAnnonce(); // une sauvegarde illisible : une nouvelle partie (l'ancienne gardée)

  setInterval(persistState, AUTOSAVE_MS);
  window.addEventListener('beforeunload', persistState);
  window.addEventListener('pagehide', persistState);
  document.addEventListener('visibilitychange', onHide);

  demarrerBoucles(); // (fiche 25 : une seule boucle, celle de la carte quand elle est affichée)
  render();
  oublierAdresseMine(); // (une ancienne adresse de la mine, jeu.html?carte=grotte&… : la ferme)

  // Suivi de session : démarre seulement si le joueur a déjà accepté ; sinon on le lui demande.
  try {
    // FLU-17 : le bandeau attend que l'écran soit calme (histoire refermée, carte seule)
    if (Telemetry.init({ version: GAME_VERSION }) === 'unknown') wantConsentBanner();
    telView();
    telDay();
  } catch (e) { /* le suivi ne doit jamais empêcher de jouer */ }
  garderPlusTard();
  if (partieDuMonde) entrerDansLeMonde();
  invitationDuLien(); // E-3 : le jeu ouvert par un lien d'invitation (jeu.html#invitation=…)
  connexionDuLien(); // E-0 : le jeu ouvert par le lien de connexion reçu par e-mail (jeu.html#connexion=…)
  demarrerAmis(); // les amis : le bouton 💌, le profil publié, un lien d'ami (jeu.html#ami=…)
  demarrerGemmes(); // les gemmes : le solde, les rosiers à livrer, le retour d'un paiement (#boutique=…)
}
// E-2 : dans le monde, le bandeau (E-5 : on y construit et l'on y cultive : le mode Construire n'est plus
// ouvert d'office).
function entrerDansLeMonde() {
  bandeau();
}

// (une erreur au démarrage reste une erreur de la page, comme avant)
demarrer().catch((e) => setTimeout(() => { throw e; }));

// Pour la console du navigateur : l'état de la partie, le moteur et le rendu ne sont
// plus des variables globales. FF.state, FF.engine.countItem(FF.state, 'carotte'), FF.render(),
// FF.stageModel(), FF.stageWindow.
window.FF = {
  get state() { return state; },
  get stageWindow() { return stageWindow; },
  engine,
  render,
  stageModel,
};
