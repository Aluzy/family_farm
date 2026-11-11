/* ---------- les bacs à fleurs, depuis la carte (js/engine/bacs.js) ----------
   Un appui sur un bac posé (js/carte/ferme/bacs.js, le pont bacTouche) :
     - vide : la fenêtre « Semer » (les graines de fleurs, une espèce par bac) ;
     - semé, pas encore en fleurs : une bulle (ce qui pousse, dans combien de nuits) ;
     - en fleurs : le personnage y va et les coupe à la faux (le pont bacRecolter) ; sans faux, une bulle.
   Et les fleurs semées dans l'herbe (js/engine/massifs.js, js/carte/ferme/massifs.js) : une bulle tant qu'elles
   poussent ; en fleurs, le personnage les cueille à la main (les ponts massifTouche, massifCueillir). */

import { DATA } from '../engine/catalog.js';
import { formeBac, grainesDeFleurs, nuitsAvantFleurs, plantBac } from '../engine/bacs.js';
import { hasTool } from '../engine/outils.js';
import { asleep } from '../engine/night.js';
import { formatQty } from '../engine/format.js';
import { state } from './store.js';
import { executer } from './commandes.js';
import { applyResult } from './game-actions.js';
import { closeModal, openModal } from './modal.js';
import { registerActions, SOMMEIL_MESSAGE } from './actions.js';
import { notify } from './toasts.js';
import { refresh } from './render.js';
import { persistState } from './storage.js';
import { massifSurCase } from '../engine/massifs.js';

const nomBac = (tile) => DATA.ATELIER.BLOCS[(state.blocs || {})[tile]].nom;

// La fenêtre « Semer » du bac vide de `tile` : chaque graine de fleur (celles qu'on n'a pas : grisées).
export function ouvrirSemisBac(tile) {
  const L = grainesDeFleurs(state);
  const lignes = L.map((g) => {
    const it = DATA.OBJETS[g.graine], fl = DATA.OBJETS[DATA.BACS.FLEURS[g.fleur].fleur];
    return `<li><button type="button" class="btn bac-graine" data-action="bac-semer" data-case="${tile}" data-fleur="${g.fleur}"${g.n > 0 ? '' : ' disabled'} aria-label="Semer : ${g.nom} (${formatQty(g.n)} ${it.nom.toLowerCase()})">
      <span class="bac-graine-ico" aria-hidden="true">${it.icone}</span><span class="bac-graine-nom" aria-hidden="true">${g.nom} ${fl.icone}</span><small aria-hidden="true">× ${formatQty(g.n)}</small></button></li>`;
  }).join('');
  const aucune = L.every((g) => g.n < 1);
  openModal(`
    <div class="help-head"><span class="help-emoji" aria-hidden="true">🌱</span><h2 id="bac-semer-titre">${nomBac(tile)} : semer</h2></div>
    <p>Une seule espèce par bac. Elle fleurit en ${DATA.BACS.NUITS} nuits, sans arrosage ; la faux y coupe ensuite ${DATA.BACS.RECOLTE[0]} à ${DATA.BACS.RECOLTE[1]} fleurs, et le bac refleurit tout seul.</p>
    ${aucune ? '<p class="bac-astuce">Pas encore de graines de fleurs : on en trouve parfois en cueillant les fleurs sauvages du grand monde.</p>' : ''}
    <ul class="bac-graines">${lignes}</ul>
    <button type="button" class="btn" data-action="close-modal">Fermer</button>`, { labelledBy: 'bac-semer-titre' });
}

// Le pont de la carte : un appui sur le bac de `tile`. → { faucher: true } (le personnage y va, la faux à la
// main), { bulle } (un texte au-dessus du bac), ou null (la fenêtre « Semer » s'est ouverte, ou rien).
export function bacTouche(tile) {
  if (!formeBac((state.blocs || {})[tile])) return null;
  if (asleep(state)) { notify(SOMMEIL_MESSAGE); return null; }
  const p = plantBac(state, tile);
  if (!p) { ouvrirSemisBac(tile); return null; }
  const nom = DATA.BACS.FLEURS[p.fleur].nom, n = nuitsAvantFleurs(state, tile);
  if (n > 0) return { bulle: `${nom} : en fleurs ${n > 1 ? `dans ${n} nuits` : 'demain'}` };
  if (!hasTool(state, 'faux')) return { bulle: `${nom} en fleurs : il faut la faux pour les couper` };
  return { faucher: true };
}

// Le pont de la carte : le personnage est arrivé au bac de `tile`, il coupe les fleurs. → { items } ou null.
export function bacRecolter(tile) {
  if (asleep(state)) { notify(SOMMEIL_MESSAGE); return null; }
  const r = executer('bac.recolter', { case: tile });
  if (!r.ok) { notify(r.error); refresh(); return null; }
  refresh();
  return { items: r.items };
}

// Un appui sur des fleurs semées dans l'herbe (js/carte/ferme/massifs.js, le pont massifTouche) : { cueillir } (en fleurs :
// le personnage y va), { bulle } (en train de pousser), ou null.
export function massifTouche(tile) {
  const p = massifSurCase(state, tile);
  if (!p) return null;
  if (asleep(state)) { notify(SOMMEIL_MESSAGE); return null; }
  const nom = DATA.BACS.FLEURS[p.fleur].nom, n = DATA.MASSIFS.NUITS - p.nuits;
  if (n > 0) return { bulle: `${nom} : en fleurs ${n > 1 ? `dans ${n} nuits` : 'demain'}` };
  return { cueillir: true };
}

// Le pont de la carte : le personnage cueille les fleurs semées de `tile`. → { items } ou null.
export function massifCueillir(tile) {
  if (asleep(state)) { notify(SOMMEIL_MESSAGE); return null; }
  const r = executer('massif.cueillir', { case: tile });
  if (!r.ok) { notify(r.error); refresh(); return null; }
  persistState();
  refresh();
  return { items: r.items };
}

registerActions({
  'bac-semer': (target) => {
    const c = Number(target.dataset.case), fleur = String(target.dataset.fleur || '');
    const r = applyResult(executer('bac.semer', { case: c, fleur }));
    if (r && r.ok) {
      closeModal();
      notify(`🌱 ${DATA.BACS.FLEURS[fleur].nom} semés : en fleurs dans ${DATA.BACS.NUITS} nuits.`, { kind: 'info' });
    }
  },
});
