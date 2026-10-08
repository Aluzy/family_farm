// pixel-emoji.js — remplace à l'affichage les emojis qui ont leur icône en pixel art.
//
// Les textes du jeu gardent leurs emojis (données, messages, aide, encyclopédie) : seul
// l'affichage change. Un emoji connu devient <i class="px" role="img" aria-label="💰">,
// une case de 16×16 de assets/icones.png. La planche et la table (icones.generated.js) sont
// produites par scripts/icones/build.py à partir des dessins de scripts/icones/art_*.py.
//
// Deux chemins :
//   - pixelize(fragment) : appelé par morph() sur le gabarit, avant la comparaison, pour
//     que l'ancien et le nouveau DOM aient les mêmes balises (pas de remplacement à chaque rendu) ;
//   - watch(root) : un MutationObserver rattrape tout le reste (innerHTML directs, toasts,
//     fenêtres, pages sans moteur comme l'accueil ou l'encyclopédie).
// Ne touche ni aux attributs (title, aria-label…), ni aux <option>, <textarea>, <input>,
// <title>, <script>, <style> : là, une image n'a pas de sens et l'emoji reste.
//
// Une suite d'emojis (👩🏽 = portrait + teint, 👨‍👩‍👧‍👦) est une seule icône ; la plus longue
// suite connue l'emporte. U+FE0F (« afficher en emoji ») est accepté et ignoré partout.

import { COLS, ICONES, VERSION } from './icones.generated.js';

// Toutes les pages sont à la racine du site, à côté de assets/.
const SHEET = `assets/icones.png?v=${VERSION}`;
const KEYS = Object.keys(ICONES).sort((a, b) => b.length - a.length);
const pattern = (key) => Array.from(key, (c) => c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('\\uFE0F?') + '\\uFE0F?';
const FIND = new RegExp(KEYS.map(pattern).join('|'), 'gu');
const TEST = new RegExp(FIND.source, 'u');
const SKIP = new Set(['OPTION', 'TEXTAREA', 'INPUT', 'TITLE', 'SCRIPT', 'STYLE', 'SELECT']);

// Feuille de style, posée une fois (la page n'a pas besoin de jeu.css).
const CSS = `
.px {
  display: inline-block;
  --pxs: 1.25em; /* taille de l'icône : une règle peut la changer (ex. boutons d'icônes) */
  width: var(--pxs);
  height: var(--pxs);
  vertical-align: -0.25em;
  background: url('${SHEET}') no-repeat;
  background-size: calc(${COLS} * var(--pxs)) auto;
  background-position: calc(var(--px-x) * -1 * var(--pxs)) calc(var(--px-y) * -1 * var(--pxs));
  image-rendering: pixelated;
  font-style: normal;
}`;

function style(doc) {
  if (!doc || !doc.head || doc.getElementById('px-style')) return;
  const s = doc.createElement('style');
  s.id = 'px-style';
  s.textContent = CSS;
  doc.head.appendChild(s);
}

function icon(doc, emoji) {
  const key = emoji.replace(/️/g, '');
  const n = ICONES[key];
  const i = doc.createElement('i');
  i.className = 'px';
  i.setAttribute('role', 'img');
  i.setAttribute('aria-label', key);
  i.setAttribute('style', `--px-x:${n % COLS};--px-y:${Math.floor(n / COLS)}`);
  return i;
}

function swapText(node) {
  const text = node.nodeValue;
  if (!text || !TEST.test(text)) return;
  const parent = node.parentNode;
  if (!parent || (parent.nodeType === 1 && (SKIP.has(parent.nodeName) || parent.isContentEditable))) return;
  const doc = node.ownerDocument;
  const frag = doc.createDocumentFragment();
  let last = 0;
  for (const m of text.matchAll(FIND)) {
    if (m.index > last) frag.appendChild(doc.createTextNode(text.slice(last, m.index)));
    frag.appendChild(icon(doc, m[0]));
    last = m.index + m[0].length;
  }
  if (last < text.length) frag.appendChild(doc.createTextNode(text.slice(last)));
  parent.replaceChild(frag, node);
}

// Remplace les emojis connus dans tous les textes sous `root` (élément ou fragment).
export function pixelize(root) {
  if (!root) return;
  if (root.nodeType === 3) return swapText(root);
  const doc = root.ownerDocument || root;
  style(document);
  const walk = doc.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode: (n) => (TEST.test(n.nodeValue) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT),
  });
  const found = [];
  while (walk.nextNode()) found.push(walk.currentNode);
  found.forEach(swapText);
}

let observer = null;

// Surveille `root` (par défaut le <body>) : chaque texte ajouté ou modifié est traité.
export function watch(root = document.body) {
  if (observer || !root || typeof MutationObserver === 'undefined') return;
  style(document);
  pixelize(root);
  observer = new MutationObserver((records) => {
    for (const r of records) {
      if (r.type === 'characterData') swapText(r.target);
      else r.addedNodes.forEach((n) => (n.nodeType === 1 || n.nodeType === 3) && pixelize(n));
    }
  });
  observer.observe(root, { childList: true, subtree: true, characterData: true });
}
