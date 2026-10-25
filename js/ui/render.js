import {
  activeTab, FERME_LINKS, RENDER_THROTTLE_MS, setActiveTab, setEcranFerme, tabAvailable,
} from './store.js';
import { renderTestPanel } from './testmode.js';
import { renderStage, stageUsable } from './stage.js';
import {
  applyAnchor, renderIndicators, renderSleepBar, renderStageWindow, renderTabbar, renderTabContent,
  setMaisonTab, setStageWindow,
} from './stage-windows.js';
import { animateIn } from './animations.js';
import { renderTutorial } from './aide.js';
import { renderDidacticiel } from './didacticiel.js';
import { renderItemModal } from './inventaire.js';
import { renderShopModal } from './caleche.js';
import { pixelize, watch } from './pixel-emoji.js';
import { renderRecipeBook } from './livre.js';
import { renderEncyclopedie } from './encyclopedie.js';
import { renderPlantation } from './plantation.js';

export let renderScheduled = false;
export function setRenderScheduled(value) {
  renderScheduled = value;
  return value;
}
export let lastRenderAt = 0;
export function setLastRenderAt(value) {
  lastRenderAt = value;
  return value;
}

/* ---------- rendu ---------- */

export function render() {
  // Un onglet non débloqué (sauvegarde importée, par exemple) retombe sur la Ferme.
  if (!tabAvailable(activeTab)) setActiveTab('ferme');
  // Avec la carte, Famille, Livre de recette et Arbre des technologies n'existent que comme
  // fenêtres de la carte : une page ouverte avant que la carte soit prête y est ramenée.
  if (FERME_LINKS.includes(activeTab) && stageUsable()) {
    // La Famille et l'Arbre des technologies ont leur propre fenêtre ; le Livre de recette est
    // dans la Maison.
    const propre = ['famille', 'techno'].includes(activeTab) ? activeTab : null;
    if (!propre) setMaisonTab(activeTab);
    setActiveTab('ferme');
    setEcranFerme(null);
    setStageWindow(propre || 'maison');
  }
  // Avec la carte, l'Inventaire et la calèche sont des fenêtres flottantes par-dessus elle.
  if (['installations', 'inventaire', 'comptoir'].includes(activeTab) && stageUsable()) {
    setStageWindow(activeTab);
    setActiveTab('ferme');
    setEcranFerme(null);
  }
  renderIndicators();
  renderTabbar();
  renderTabContent();
  renderSleepBar();
  renderStage();
  renderStageWindow();
  applyAnchor();
  renderTutorial();
  renderDidacticiel();
  renderRecipeBook();
  renderEncyclopedie();
  renderPlantation();
  renderItemModal();
  renderShopModal();
  renderTestPanel();
}

// Rafraîchit tout de suite (après une action du joueur).
// Lot 11 : jamais plus de 5 rendus par seconde, même en tapant vite : si le
// dernier rendu est trop récent, celui-ci part au prochain créneau (≤ 200 ms).
export function refresh() {
  const now = performance.now();
  if (now - lastRenderAt < RENDER_THROTTLE_MS) {
    renderScheduled = true;
    return;
  }
  renderScheduled = false;
  lastRenderAt = now;
  render();
}

/* Mise à jour du DOM « sur place » : on compare le nouveau gabarit à ce qui
   est affiché et on ne modifie que les textes et attributs qui changent. Les
   boutons et interrupteurs gardent donc le même élément d'un rafraîchissement
   à l'autre : un appui en cours n'est jamais interrompu et le focus clavier
   reste en place. */
export function morph(target, html) {
  // Lot 11 : un gabarit identique au précédent ne coûte rien (ni analyse, ni comparaison).
  if (target.__html === html) return;
  target.__html = html;
  const tpl = document.createElement('template');
  tpl.innerHTML = html;
  pixelize(tpl.content); // emojis → icônes, avant la comparaison (pixel-emoji.js)
  patchChildren(target, tpl.content);
}

// Lot 11 : rendu par tranches. `parts` est une liste de gabarits ; chacun a son
// conteneur (.slot, sans boîte à l'écran) et n'est comparé que s'il a changé. Si
// le nombre de tranches change (autre onglet), les conteneurs sont recréés.
export function morphSlots(target, parts) {
  const slots = target.__slots;
  if (!slots || slots.length !== parts.length || target.firstChild !== slots[0]) {
    target.textContent = '';
    target.__html = null;
    target.__slots = parts.map(() => {
      const d = document.createElement('div');
      d.className = 'slot';
      target.appendChild(d);
      return d;
    });
  }
  parts.forEach((html, i) => morph(target.__slots[i], html));
}

function patchChildren(from, to) {
  const oldNodes = Array.from(from.childNodes);
  const newNodes = Array.from(to.childNodes);
  const n = Math.max(oldNodes.length, newNodes.length);
  for (let i = 0; i < n; i++) {
    const o = oldNodes[i];
    const w = newNodes[i];
    if (!w) {
      from.removeChild(o);
    } else if (!o) {
      from.appendChild(w);
    } else if (o.nodeType !== w.nodeType || o.nodeName !== w.nodeName) {
      from.replaceChild(w, o);
    } else if (o.nodeType === 1 && o.getAttribute('data-key') !== w.getAttribute('data-key')) {
      // Lot 11 : un dessin dont la clé change (une plante qui pousse, une ponte)
      // est remplacé puis animé ; au premier affichage, rien ne bouge.
      from.replaceChild(w, o);
      if (o.hasAttribute('data-key') && w.hasAttribute('data-key')) animateIn(w);
    } else if (o.nodeType === 1) {
      patchAttributes(o, w);
      patchChildren(o, w);
    } else if (o.nodeValue !== w.nodeValue) {
      o.nodeValue = w.nodeValue;
    }
  }
}

function patchAttributes(o, w) {
  for (const a of Array.from(o.attributes)) {
    // un bloc <details> ouvert ou fermé par le joueur le reste d'un rendu à l'autre
    if (a.name === 'open' && o.tagName === 'DETAILS') continue;
    if (!w.hasAttribute(a.name)) o.removeAttribute(a.name);
  }
  for (const a of Array.from(w.attributes)) {
    if (a.name === 'open' && o.tagName === 'DETAILS') continue;
    if (o.getAttribute(a.name) !== a.value) o.setAttribute(a.name, a.value);
  }
}
