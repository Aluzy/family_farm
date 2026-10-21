// chantier.js — la ferme générée (docs/carte-generee.md, étape 4) : le mode « Construire ».
//
// Une case de la barre d'outils (🔨, dès que l'Atelier est construit) ouvre le mode : un menu
// sur le côté droit de l'écran (deux colonnes de cases qui défilent, comme celles de la barre
// d'outils) montre les blocs qu'on peut poser (murs, portes, paillasses, l'Atelier) et combien
// il en reste ; on en choisit un, un appui sur une case de la carte l'y pose, un appui
// sur un bloc le reprend. Les pièces closes sont teintées de vert sur la carte. Le moteur :
// js/engine/blocs.js ; la carte : js/carte/ferme/chantier.js.

import { DATA } from '../engine/catalog.js';
import { atelierConstruit, atelierOuvert } from '../engine/atelier.js';
import { blocAt, blocDessus, blocsEnMain, changeMur, couchages, hauteurMur, poserBloc, poseStatus, reprendreBloc, solAt } from '../engine/blocs.js';
import { asleep } from '../engine/night.js';
import { buildLevel, buildMode, etageVue, setBuildLevel, setBuildMode, setEtageVue, state } from './store.js';
import { ETAGE_BLOCS, etageCouvertes, etageEmprise, poserEtage, reprendreEtage, etageBlocs } from '../engine/etage.js';
import { persistState } from './storage.js';
import { refresh } from './render.js';
import { notify } from './toasts.js';
import { registerActions, SOMMEIL_MESSAGE } from './actions.js';
import { meubleSrc } from './marche.js';

// Le niveau le plus haut où l'on construit (les rangs d'un mur rehaussé : 0 au sol, jusqu'à
// HAUTEUR_MAX - 1 ; 1 est aussi l'étage d'une pièce à escalier), et celui où l'on construit
// (buildLevel, borné). Au niveau n ≥ 1, un appui sur un mur haut de n blocs le rehausse d'un
// bloc (le même mur en main), sur un mur haut de n + 1 blocs reprend son bloc du dessus ; au
// niveau 0, un appui sur un mur le reprend, comme tout bloc.
const niveauMax = () => Math.max(etageEmprise(state).size ? 1 : 0, DATA.ATELIER.HAUTEUR_MAX - 1);
const niveau = () => Math.min(buildLevel, niveauMax());
// L'étage, s'il y en a un et qu'on y construit : 1, sinon 0.
export const niveauBati = () => (niveau() === 1 && etageEmprise(state).size ? 1 : 0);
// Le niveau où l'on rehausse les murs (la carte le montre seul : 1 ou 2), sinon 0.
export const niveauRang = () => (niveauBati() ? 0 : niveau());
const MURS = () => Object.keys(DATA.ATELIER.BLOCS).filter((s) => DATA.ATELIER.BLOCS[s].mur);
// (à l'étage : seulement ceux qui s'y posent ; plus haut que le sol : les murs)
// (les meubles du Marché : seulement ceux qu'on a en main, ou celui qu'on pose)
const enMain = (s) => !DATA.ATELIER.BLOCS[s].meuble || s === buildMode || blocsEnMain(state, s) > 0;
const SORTES = () => (niveauBati() ? ETAGE_BLOCS.filter(enMain) : niveau() ? MURS() : Object.keys(DATA.ATELIER.BLOCS).filter(enMain));
// La liste des niveaux (au-dessus du menu) : ouverte ? Un appui long sur le carré l'ouvre, on
// glisse jusqu'au niveau voulu et on lâche (APPUI_LONG_MS) ; un appui simple l'ouvre ou la ferme.
let niveauListe = false;
const APPUI_LONG_MS = 350;
const CONSEIL_MS = 2000;   // le rappel à l'ouverture du mode

// Le mode Construire est-il possible ? (la ferme générée, l'Atelier construit)
export function chantierOuvert() {
  return atelierOuvert(state) && atelierConstruit(state);
}

// L'icône d'un bloc (celle de son objet ; un meuble : son dessin ; l'Atelier : la sienne).
function icone(sorte) {
  const b = DATA.ATELIER.BLOCS[sorte];
  if (b.meuble) return `<img class="build-slot-img" src="${meubleSrc(b.meuble)}" alt="" draggable="false">`;
  return b.objet ? DATA.OBJETS[b.objet].icone : DATA.ATELIER.ICONE;
}

// La case de la barre d'outils.
export function buildSlotHtml() {
  if (!chantierOuvert()) return '';
  const on = !!buildMode;
  const label = on ? 'Construire : ranger' : 'Construire (poser des blocs)';
  return `<button type="button" class="tool-slot${on ? ' active' : ''}" data-action="build-toggle" aria-pressed="${on}" aria-label="${label}" title="${label}">${DATA.ATELIER.ICONE}</button>`;
}

// Le menu de construction, sur le côté droit de l'écran : en haut, les paillasses d'une pièce
// close et ✕ ; puis une case par bloc (son icône, ce qui reste), sur deux colonnes qui défilent.
export function buildChipHtml() {
  if (!buildMode || !chantierOuvert()) return '';
  const blocs = SORTES().map((s) => {
    const n = blocsEnMain(state, s), on = s === buildMode, nom = DATA.ATELIER.BLOCS[s].nom;
    return `<button type="button" class="tool-slot build-slot${on ? ' active' : ''}${n ? '' : ' epuise'}" data-action="build-pick" data-sorte="${s}" aria-pressed="${on}" aria-label="${nom} : ${n}" title="${nom} : ${n}"><span aria-hidden="true">${icone(s)}</span><span class="build-slot-n num" aria-hidden="true">${n}</span></button>`;
  }).join('');
  const dodo = couchages(state).length;
  const tete = niveauBati() ? '<span title="À l\'étage : on bâtit au-dessus de la pièce de l\'escalier ; ailleurs, on rehausse les murs">🪜 Étage</span>'
    : niveau() ? `<span title="Niveau ${niveau()} : touche un mur haut de ${niveau()} bloc${niveau() > 1 ? 's' : ''} pour le rehausser, un mur plus haut pour reprendre son bloc du dessus">🧱 Rehausser</span>`
    : `<span class="num" title="Paillasses dans une pièce close">🛏 ${dodo}</span>`;
  // le niveau de construction : un petit carré au-dessus du menu, et la liste des niveaux (le
  // plus haut en haut), qui s'ouvre au-dessus de lui
  const max = niveauMax(), lvl = niveau();
  const niveaux = Array.from({ length: max + 1 }, (_, i) => max - i).map((n) => `<button type="button" class="build-level-item${n === lvl ? ' active' : ''}" data-action="build-level" data-niveau="${n}" aria-pressed="${n === lvl}" aria-label="Niveau ${n}">${n}</button>`).join('');
  const choixNiveau = `<div class="build-level"><button type="button" class="build-level-btn" data-action="build-level-menu" aria-haspopup="true" aria-expanded="${niveauListe}" aria-label="Niveau de construction : ${lvl}" title="Niveau de construction (appui long : glisser jusqu'au niveau)">${lvl}</button><div class="build-level-list" role="group" aria-label="Niveaux"${niveauListe ? '' : ' hidden'}>${niveaux}</div></div>`;
  // la pose d'un meuble : ✔️ le pose là où est son aperçu, ❌ sort de ce mode
  const m = meubleModele(), ap = m && m.apercu;
  const pose = m ? `<div class="pose-meuble" role="group" aria-label="Poser le meuble"><span class="pose-meuble-txt">${ap ? (ap.ok ? 'Le poser ici ?' : 'Il ne tient pas ici') : 'Touche une case pour placer le meuble'}</span><button type="button" class="pose-meuble-ok" data-action="meuble-ok"${ap && ap.ok ? '' : ' disabled'} aria-label="Poser le meuble ici" title="Poser le meuble ici">✔️</button><button type="button" class="pose-meuble-non" data-action="meuble-annule" aria-label="Sortir de la pose du meuble" title="Sortir de la pose du meuble">❌</button></div>` : '';
  return `${pose}<div class="build-dock">${choixNiveau}<div class="build-bar" role="group" aria-label="Construire : touche une case pour y poser le bloc choisi, un bloc pour le reprendre"><div class="build-bar-head">${tete}<button type="button" class="build-bar-close" data-action="build-toggle" aria-label="Ranger : fin de la construction" title="Ranger">✕</button></div><div class="build-bar-grid">${blocs}</div></div></div>`;
}

// L'appui long sur le carré du niveau : la liste s'ouvre ; en glissant, le niveau sous le doigt
// s'allume ; lâché sur un niveau, il est choisi (lâché ailleurs : la liste se ferme). Le clic
// qui suit le lâcher ne rouvre pas la liste.
if (typeof document !== 'undefined') {
  let appui = null, sansClic = false;
  const sous = (x, y) => { const el = document.elementFromPoint(x, y); return el && el.closest ? el.closest('.build-level-item') : null; };
  const ouvre = () => {
    niveauListe = true;
    const l = document.querySelector('.build-level-list'), b = document.querySelector('.build-level-btn');
    if (l) l.hidden = false;
    if (b) b.setAttribute('aria-expanded', 'true');
  };
  document.addEventListener('pointerdown', (e) => {
    if (!e.target.closest || !e.target.closest('.build-level-btn')) return;
    if (appui) clearTimeout(appui.timer);
    appui = { long: false, timer: setTimeout(() => { if (appui) { appui.long = true; ouvre(); } }, APPUI_LONG_MS) };
  });
  document.addEventListener('pointermove', (e) => {
    if (!appui || !appui.long) return;
    const s = sous(e.clientX, e.clientY);
    document.querySelectorAll('.build-level-item').forEach((i) => i.classList.toggle('survol', i === s));
  });
  const fin = (e, annule) => {
    if (!appui) return;
    clearTimeout(appui.timer);
    const long = appui.long;
    appui = null;
    if (!long) return;                       // un appui simple : le clic ouvre ou ferme la liste
    sansClic = true;
    setTimeout(() => { sansClic = false; }, 400);
    const s = annule ? null : sous(e.clientX, e.clientY);
    if (s) s.click();
    else { niveauListe = false; refresh(); }
  };
  document.addEventListener('pointerup', (e) => fin(e, false));
  document.addEventListener('pointercancel', (e) => fin(e, true));
  document.addEventListener('click', (e) => {
    if (sansClic && e.target.closest && e.target.closest('.build-level-btn')) { sansClic = false; e.stopPropagation(); e.preventDefault(); }
  }, true);
}

// La pose d'un meuble du Marché : un meuble en main (pas un tableau, qui s'accroche à un mur),
// au sol, la carte montre un quadrillage ; un appui sur une case y pose son aperçu, calé sur la
// grille (vert : il tient là ; rouge : non), sans le poser ; ✔️ le pose, ❌ sort de ce mode.
// poseMeuble : { sorte, case } (l'aperçu), ou null.
let poseMeuble = null;
const meubleEnMain = () => {
  const b = buildMode && DATA.ATELIER.BLOCS[buildMode];
  return !!(b && b.meuble && !b.sur && !niveau());
};
// Pour la carte (modèle.bati.meuble) : la grille, et l'aperçu s'il y en a un
// ({ case, dessin, largeur, hauteur, ok }).
export function meubleModele() {
  if (!meubleEnMain()) return null;
  const p = poseMeuble && poseMeuble.sorte === buildMode ? poseMeuble : null, b = DATA.ATELIER.BLOCS[buildMode];
  return { grille: true, apercu: p ? { case: p.case, dessin: b.meuble, largeur: b.largeur || 1, hauteur: b.hauteur || 1, plat: !!b.plat, ok: poseStatus(state, buildMode, p.case).ok } : null };
}
// Sort de la pose d'un meuble : l'aperçu s'efface, un bloc (pas un meuble) passe en main.
function quitteMeuble() {
  poseMeuble = null;
  const autre = (s) => !DATA.ATELIER.BLOCS[s].meuble;
  setBuildMode(SORTES().find((s) => autre(s) && blocsEnMain(state, s) > 0) || SORTES().find(autre) || null);
}

// (le bloc en main : un de ceux qui se posent au niveau où l'on construit)
function blocDuNiveau() {
  if (buildMode && !SORTES().includes(buildMode)) setBuildMode(SORTES().find((s) => blocsEnMain(state, s) > 0) || SORTES()[0]);
}

registerActions({
  'build-toggle': () => {
    if (buildMode) { poseMeuble = null; setBuildMode(null); refresh(); return; }
    if (!chantierOuvert()) return;
    if (asleep(state)) { notify(SOMMEIL_MESSAGE); return; }
    setBuildLevel(etageVue ? 1 : 0);          // (on construit d'abord là où l'on est)
    niveauListe = false;
    setBuildMode(SORTES().find((s) => blocsEnMain(state, s) > 0) || SORTES()[0]);
    // (un rappel bref, à chaque ouverture : il ne cache pas longtemps la puce des blocs)
    notify(`${DATA.ATELIER.ICONE} Touche une case pour poser, un bloc pour le reprendre.`, { duree: CONSEIL_MS });
    refresh();
  },
  // L'escalier (un essai, js/engine/etage.js) : monter à l'étage, ou en redescendre.
  'etage-toggle': () => {
    if (asleep(state)) { notify(SOMMEIL_MESSAGE); return; }
    if (!etageVue && !etageEmprise(state).size) return;
    setEtageVue(!etageVue);
    // (en construisant : on construit là où l'on arrive)
    if (buildMode) { setBuildLevel(etageVue ? 1 : 0); blocDuNiveau(); }
    notify(etageVue ? '🪜 À l\'étage : touche l\'escalier pour redescendre.' : '🪜 En bas.', { duree: CONSEIL_MS });
    refresh();
  },
  // Le carré du niveau : un appui simple ouvre ou ferme la liste des niveaux.
  'build-level-menu': () => {
    if (!buildMode) return;
    niveauListe = !niveauListe;
    refresh();
  },
  // Un niveau de la liste : on y construit (la vue de la carte suit).
  'build-level': (target) => {
    if (!buildMode) return;
    poseMeuble = null;
    setBuildLevel(Math.min(Number(target.dataset.niveau) || 0, niveauMax()));
    niveauListe = false;
    blocDuNiveau();
    refresh();
  },
  'build-pick': (target) => {
    if (!buildMode) return;
    poseMeuble = null;
    setBuildMode(target.dataset.sorte);
    refresh();
  },
  // La carte : un appui sur la case `case` en mode Construire.
  'bloc': (target) => {
    if (!buildMode) return;
    if (asleep(state)) { notify(SOMMEIL_MESSAGE); return; }
    const c = Number(target.dataset.case);
    // à l'étage : poser, reprendre un bloc de l'étage
    if (niveauBati() && etageEmprise(state).has(c)) {
      // (un appui sur un meuble de l'étage, sur n'importe laquelle de ses cases, le reprend)
      const e = etageBlocs(state)[c];
      const r = (e && !changeMur(e, buildMode)) || etageCouvertes(state).has(c) ? reprendreEtage(state, c) : poserEtage(state, buildMode, c);
      if (!r.ok) { notify(r.error); return; }
      persistState();
      refresh();
      return;
    }
    // plus haut que le sol : rehausser un mur, reprendre son bloc du dessus
    const n = niveau();
    if (n) {
      const h = hauteurMur(state, c);
      let r;
      if (!h) r = { ok: false, error: `Niveau ${n} : touche un mur pour le rehausser (niveau 0 pour poser au sol).` };
      else if (h === n + 1) r = reprendreBloc(state, c);
      else if (h === n) r = poserBloc(state, blocAt(state, c), c);
      else if (h < n) r = { ok: false, error: `Ce mur n'a que ${h} bloc${h > 1 ? 's' : ''} : rehausse-le d'abord au niveau ${h}.` };
      else r = { ok: false, error: `Ce mur est plus haut : reprends son bloc du dessus au niveau ${h - 1}.` };
      if (!r.ok) { notify(r.error); return; }
      persistState();
      refresh();
      return;
    }
    // (la pompe se pose sur le puits : un appui sur un puits libre la pose, ne reprend pas le puits)
    const sur = DATA.ATELIER.BLOCS[buildMode] && DATA.ATELIER.BLOCS[buildMode].sur;
    const surLibre = sur && blocAt(state, c) === sur && !blocDessus(state, c);
    // (le plancher en main : un appui sur un plancher sans rien dessus le reprend ; un autre
    // bloc se pose dessus)
    const sol = DATA.ATELIER.BLOCS[buildMode] && DATA.ATELIER.BLOCS[buildMode].sol;
    // (une fenêtre, une pierre d'angle en main : un appui sur un autre mur le change ; sinon un
    // appui sur un bloc le reprend : un mur rehaussé, son bloc du dessus d'abord)
    const b = blocAt(state, c);
    const reprend = b ? !surLibre && !changeMur(b, buildMode) : sol && solAt(state, c);
    // (un meuble en main, sur une case libre : son aperçu, pas encore posé)
    if (!reprend && meubleEnMain()) { poseMeuble = { sorte: buildMode, case: c }; refresh(); return; }
    const r = reprend ? reprendreBloc(state, c) : poserBloc(state, buildMode, c);
    if (!r.ok) { notify(r.error); return; }
    persistState();
    refresh();
  },
  // La pose d'un meuble : l'aperçu glissé du doigt sur la case `case` (js/farm-stage.js) ;
  // ✔️ le pose là où est son aperçu ; ❌ sort de ce mode.
  'meuble-place': (target) => {
    if (!meubleEnMain()) return;
    const c = Number(target.dataset.case);
    if (!Number.isInteger(c) || c < 0) return;
    poseMeuble = { sorte: buildMode, case: c };
    refresh();
  },
  'meuble-ok': () => {
    if (!poseMeuble || !meubleEnMain()) return;
    if (asleep(state)) { notify(SOMMEIL_MESSAGE); return; }
    const r = poserBloc(state, poseMeuble.sorte, poseMeuble.case);
    if (!r.ok) { notify(r.error); return; }
    poseMeuble = null;
    if (!blocsEnMain(state, buildMode)) quitteMeuble();     // (plus de ce meuble : on en sort)
    persistState();
    refresh();
  },
  'meuble-annule': () => {
    quitteMeuble();
    refresh();
  },
});
