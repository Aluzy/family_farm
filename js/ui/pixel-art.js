// pixel-art.js — les dessins, le texte et les jauges en pixel art de l'interface.
//
//   artHtml(nom, cls, key, anim) : une case de 32×32 de assets/art.png (bâtiments, arbres,
//                                   bêtes, bouton Dormir), affichée à 32 ou 64 px (CSS --s) ;
//   pxText(texte)                 : chiffres et signes dans la police pixel (assets/police.png),
//                                   de la couleur du texte (masque CSS) ;
//   pxGauge(valeur, max, libellé) : une jauge en cases, une case par cran (stades d'une culture…).
//
// Planches et tables : scripts/icones/build.py (js/ui/icones.generated.js). Les adresses des
// planches portent leur empreinte : posées une fois en variables CSS sur <html>.

import { ART, ART_COLS, ART_VERSION, POLICE, POLICE_H, POLICE_VERSION, POLICE_W } from './icones.generated.js';

if (typeof document !== 'undefined') {
  // Adresses absolues : une url() dans une variable se résout par rapport à la feuille de
  // style qui l'utilise (css/), pas par rapport à la page.
  const abs = (path) => new URL(path, document.baseURI).href;
  const root = document.documentElement.style;
  root.setProperty('--art-sheet', `url("${abs(`assets/art.png?v=${ART_VERSION}`)}")`);
  root.setProperty('--art-cols', String(ART_COLS));
  root.setProperty('--font-sheet', `url("${abs(`assets/police.png?v=${POLICE_VERSION}`)}")`);
  root.setProperty('--font-w', String(POLICE_W));
  root.setProperty('--font-h', String(POLICE_H));
}

export function artHtml(name, cls = '', key = '', anim = '') {
  const n = ART[name];
  if (n === undefined) return '';
  return `<span class="art${cls ? ' ' + cls : ''}" style="--ax:${n % ART_COLS};--ay:${Math.floor(n / ART_COLS)}" aria-hidden="true"${key ? ` data-key="${key}"` : ''}${anim ? ` data-anim="${anim}"` : ''}></span>`;
}

// Texte en police pixel. Les caractères inconnus sont omis : réserver aux chiffres et signes.
export function pxText(text, cls = '') {
  const glyphs = Array.from(String(text))
    .filter((c) => POLICE[c])
    .map((c) => `<i style="--gx:${POLICE[c][0]};--gw:${POLICE[c][1]}"></i>`)
    .join('');
  return `<span class="pxt${cls ? ' ' + cls : ''}" aria-hidden="true">${glyphs}</span>`;
}

// Jauge en cases : `value` cases pleines sur `max` (au plus 12 cases, sinon proportionnelle).
export function pxGauge(value, max, label, cls = '') {
  const cases = Math.max(1, Math.min(12, max));
  const pleines = max <= 12 ? Math.max(0, Math.min(cases, value)) : Math.round((value / max) * cases);
  const cells = Array.from({ length: cases }, (_, i) => `<i${i < pleines ? ' class="on"' : ''}></i>`).join('');
  return `<span class="pxgauge${cls ? ' ' + cls : ''}" role="progressbar" aria-label="${label}" aria-valuemin="0" aria-valuemax="${max}" aria-valuenow="${value}">${cells}</span>`;
}
