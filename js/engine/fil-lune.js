import { DATA } from './catalog.js';
import { fail } from './devices.js';
import { hourOfDay } from './clock.js';
import { moonPhase } from './lune.js';
import { countItem, takeItem } from './inventory.js';
import { aFait, ageFait, ajouterFragment, foisFait, noterFait, recitDe } from './recit.js';

/* ---------- le fil de la lune (le récit, lot 10 ; docs/recit/aventure.md, « le fil de la lune ») ----------

   Un fil que rien ne signale : l'étoile tombée au milieu de l'île, ce que Maurice regardait la nuit, la pierre.
   Les réglages et les textes : data/recit.json (RECIT.FIL).
     - Les fragments, au carnet du joueur, sans objectif ni marqueur (FIL.FRAGMENTS) : la note « É. » (Achille,
       la scène note_etoile), le journal de bord des premiers arrivants (leur barque, la nuit, la lanterne-tempête
       à la main : RECIT.LIEUX.epave), les relevés de Frida (son atelier, la scène frida_releves), et les trois
       pages du carnet du ciel de Maurice (son observatoire, la nuit, après FIL.OBSERVATOIRE.NUITS nuits passées
       à regarder le ciel, à trois phases de lune : visiteObservatoire).
     - L'observatoire de Maurice (visiteObservatoire) : on entre dans sa cabane ; le jour, on la découvre ; la
       nuit, on regarde le ciel par sa longue-vue (« observatoire.nuit », une fois par jour).
     - L'amas d'améthyste de la montagne (docs/gisements.md, lot 3 : lieux.recit, sorte « geode » ; RECIT.LIEUX.geode,
       recit.js toucherLieu) : les fragments au carnet, une nuit de pleine lune (GALERIE.LUNE), de GALERIE.HEURES[0]
       à [1] h, il s'ouvre sur la cachette de Maurice enfant (une couverture, une tasse, des phases de lune gravées),
       et donne la pierre (une fois : « pierre.trouvee ») ; ces nuits-là, tant qu'elle y dort, il luit plus fort
       (geodeLuit). (La galerie secrète de la mine de la ferme, qu'il remplace, n'est plus.)
     - La pierre (poserPierre) : prise, elle va dans l'inventaire (PIERRE.OBJET) ; posée sur
       la ferme (« pierre.posee »), tout y pousse plus vite, tout le temps : un stade toutes les
       TEMPS.POUSSE_HEURES × PIERRE.POUSSE heures (js/engine/crops.js heuresPousse) ; la ferme luit faiblement
       les nuits de pleine lune (la carte). */

export const FIL = DATA.RECIT.FIL;

const jourDe = (state) => Math.max(1, Math.floor(Number(state && state.day) || 1));
// L'heure h est-elle dans [de, à[ ? (à < de : la plage passe minuit.)
const dans = (h, [de, a]) => (de <= a ? h >= de && h < a : h >= de || h < a);

// Les fragments du fil sont-ils tous au carnet ?
export function filComplet(state) {
  const c = recitDe(state).carnet;
  return FIL.FRAGMENTS.every((id) => c.includes(id));
}

/* ---------- l'observatoire de Maurice ---------- */

// Le joueur entre dans l'observatoire de Maurice (la bâtisse « cabane » du plan). → { texte (ce qu'on voit, ce
// qu'on lit), fragment (la page du carnet gagnée, ou null) }. Le fait « lieu.cabane » est noté (la découverte,
// comme toucherLieu) ; la nuit, « observatoire.nuit » (une fois par jour).
export function visiteObservatoire(state) {
  const O = FIL.OBSERVATOIRE, h = hourOfDay(state), phase = moonPhase(state.day).id;
  noterFait(state, 'lieu.cabane');
  const lignes = [];
  // (la pierre posée sur la ferme : une page qu'on n'avait pas vue ; une fois)
  if (aFait(state, 'pierre.posee') && !aFait(state, 'observatoire.pierre')) { noterFait(state, 'observatoire.pierre'); lignes.push(O.PIERRE); }
  if (!dans(h, O.NUIT)) {
    if (!lignes.length) lignes.push(O.JOUR);
    return { texte: lignes.join(' '), fragment: null };
  }
  if (ageFait(state, 'observatoire.nuit') !== 0) noterFait(state, 'observatoire.nuit');
  if (!lignes.length) lignes.push(O.ACCUEIL[(jourDe(state) + foisFait(state, 'observatoire.nuit')) % O.ACCUEIL.length]);
  // (après assez de nuits, à la bonne phase : une page du carnet du ciel, une fois chacune)
  let fragment = null;
  const page = O.PAGES[phase];
  if (page && foisFait(state, 'observatoire.nuit') >= O.NUITS && ajouterFragment(state, page)) {
    fragment = page;
    lignes.push(DATA.RECIT.FRAGMENTS[page].texte);
  }
  return { texte: lignes.join(' '), fragment };
}

/* ---------- la pierre ---------- */

// Le joueur pose la pierre sur la ferme (elle quitte l'inventaire ; une fois posée, elle y reste).
export function poserPierre(state) {
  if (countItem(state, FIL.PIERRE.OBJET) < 1) return fail('Tu n\'as pas la pierre.');
  if (aFait(state, 'pierre.posee')) return fail('La pierre est déjà sur la ferme.');
  takeItem(state, FIL.PIERRE.OBJET, 1);
  noterFait(state, 'pierre.posee');
  return { ok: true };
}

export function pierrePosee(state) {
  return aFait(state, 'pierre.posee');
}

// L'amas d'améthyste de la montagne (lieux.recit, sorte « geode » ; RECIT.LIEUX.geode : la pierre y dort, prise une
// nuit de pleine lune, les fragments au carnet) luit-il plus fort ? Les nuits de pleine lune, tant que la pierre y est.
export function geodeLuit(state) {
  return !aFait(state, 'pierre.trouvee') && moonPhase(state.day).id === FIL.GALERIE.LUNE && dans(hourOfDay(state), FIL.GALERIE.HEURES);
}

// La ferme luit-elle ? (la pierre posée, une nuit de pleine lune : la carte, faiblement)
export function fermeLuit(state) {
  return pierrePosee(state) && moonPhase(state.day).id === 'pleine' && dans(hourOfDay(state), FIL.LUEUR);
}
