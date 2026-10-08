// pixel-emoji.js — remplace à l'affichage les emojis qui ont leur icône en pixel art.
//
// Les textes du jeu gardent leurs emojis (données, messages, aide, encyclopédie) : seul
// l'affichage change. Un emoji connu devient <i class="px" role="img" aria-label="💰">,
// une case de assets/icones.png (16×16, une rangée ; dessin : scripts/icones-art.py).
//
// Deux chemins :
//   - pixelize(fragment) : appelé par morph() sur le gabarit, avant la comparaison, pour
//     que l'ancien et le nouveau DOM aient les mêmes balises (pas de remplacement à chaque rendu) ;
//   - watch(root) : un MutationObserver rattrape tout le reste (innerHTML directs, toasts,
//     fenêtres, page statique).
// Ne touche ni aux attributs (title, aria-label…), ni aux <option>, <textarea>, <input>,
// <title>, <script>, <style> : là, une image n'a pas de sens et l'emoji reste.
//
// Ajouter une icône : la dessiner dans scripts/icones-art.py (même rang dans ORDER), relancer
// le script, l'ajouter à la fin de ICONES ci-dessous.

export const ICONES = ['💰', '💧', '🌱', '🌾', '🥕', '🥚', '🥛', '⚡', '🐔', '🐑'];

const INDEX = new Map(ICONES.map((e, i) => [e, i]));
const FIND = new RegExp(`(${ICONES.join('|')})\\uFE0F?`, 'gu');
const TEST = new RegExp(FIND.source, 'u');
const SKIP = new Set(['OPTION', 'TEXTAREA', 'INPUT', 'TITLE', 'SCRIPT', 'STYLE', 'SELECT']);

function icon(doc, emoji) {
  const i = doc.createElement('i');
  i.className = 'px';
  i.setAttribute('role', 'img');
  i.setAttribute('aria-label', emoji);
  i.style.setProperty('--px', INDEX.get(emoji));
  return i;
}

function swapText(node) {
  const text = node.nodeValue;
  if (!TEST.test(text)) return;
  const parent = node.parentNode;
  if (!parent || (parent.nodeType === 1 && (SKIP.has(parent.nodeName) || parent.isContentEditable))) return;
  const doc = node.ownerDocument;
  const frag = doc.createDocumentFragment();
  let last = 0;
  for (const m of text.matchAll(FIND)) {
    if (m.index > last) frag.appendChild(doc.createTextNode(text.slice(last, m.index)));
    frag.appendChild(icon(doc, m[1]));
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
  pixelize(root);
  observer = new MutationObserver((records) => {
    for (const r of records) {
      if (r.type === 'characterData') swapText(r.target);
      else r.addedNodes.forEach((n) => (n.nodeType === 1 || n.nodeType === 3) && pixelize(n));
    }
  });
  observer.observe(root, { childList: true, subtree: true, characterData: true });
}
