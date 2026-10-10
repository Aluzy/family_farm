// Point d'entrée du jeu : charge tous les modules, puis démarre la partie.
// jeu.html ne charge que ce fichier (<script type="module">) ; chacun importe ce dont il a besoin.

import { DATA } from './engine/catalog.js';
import { GAME_VERSION } from './engine/base.js';
import { chapterCount, mailbox } from './engine/campaign.js';
import { alertSnapshot } from './engine/alerts.js';
import { AUTOSAVE_MS, setState, state } from './ui/store.js';
import { setTelChapter, showConsentBanner, telView } from './ui/consent.js';
import { loadOrCreateState, persistState } from './ui/storage.js';
import { catchUp, frame, onHide, renderLoop, setMailSeen, syncJobs } from './ui/loop.js';
import { render } from './ui/render.js';
import { watch as watchEmojis } from './ui/pixel-emoji.js';
import { setAlertState } from './ui/toasts.js';
import * as engine from './engine/index.js';
import { stageModel } from './ui/stage.js';
import { stageWindow } from './ui/stage-windows.js';

// Chaque écran s'inscrit en se chargeant (ses actions, ses écouteurs) : ils sont tous
// chargés ici, qu'un autre module les importe ou non.
import './ui/store.js';
import './ui/consent.js';
import './ui/storage.js';
import './ui/game-actions.js';
import './ui/testmode.js';
import './ui/loop.js';
import './ui/render.js';
import './ui/stage.js';
import './ui/stage-windows.js';
import './ui/ferme.js';
import './ui/elevage.js';
import './ui/serre-verger-frigo.js';
import './ui/commerce.js';
import './ui/cuisine.js';
import './ui/techno.js';
import './ui/famille.js';
import './ui/notifications.js';
import './ui/inventaire.js';
import './ui/marche.js';
import './ui/ville.js';
import './ui/reveil.js';
import './ui/chapitres.js';
import './ui/niveaux.js';
import './ui/energie.js';
import './ui/houe.js';
import './ui/depart.js';
import './ui/animations.js';
import './ui/aide.js';
import './ui/options.js';
import './ui/toasts.js';
import './ui/actions.js';
import './ui/events.js';
import './ui/common.js';

/* ---------- démarrage ---------- */

watchEmojis(); // emojis → icônes en pixel art partout dans la page (pixel-emoji.js)
setState(loadOrCreateState());
setTelChapter(state.campagne ? state.campagne.chapitre : null);
syncJobs();
setMailSeen(new Set(mailbox(state).map((l) => l.id))); // les lettres déjà là ne sont pas réannoncées
setAlertState(alertSnapshot(state));
catchUp(); // Lot 11 : le temps passé page fermée depuis la dernière sauvegarde

// Lot 9 : les chapitres proposés par le mode test viennent de DATA.
document.getElementById('test-chapter').innerHTML =
  DATA.CHAPITRES.liste.map((ch, i) => `<option value="${i + 1}">${i + 1} · ${ch.titre}</option>`).join('') +
  `<option value="${chapterCount() + 1}">Mode libre (fin)</option>`;

setInterval(persistState, AUTOSAVE_MS);
window.addEventListener('beforeunload', persistState);
window.addEventListener('pagehide', persistState);
document.addEventListener('visibilitychange', onHide);

requestAnimationFrame(frame);
requestAnimationFrame(renderLoop);
render();

// Suivi de session : démarre seulement si le joueur a déjà accepté ; sinon on le lui demande.
try {
  if (Telemetry.init({ version: GAME_VERSION }) === 'unknown') showConsentBanner();
  telView();
} catch (e) { /* le suivi ne doit jamais empêcher de jouer */ }

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
