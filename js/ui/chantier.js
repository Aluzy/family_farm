// chantier.js — la ferme générée (docs/carte-generee.md, étape 4) : le mode « Construire ».
//
// Une case de la barre d'outils (🔨, dès que l'Atelier est construit) ouvre le mode : un menu
// en haut de l'écran (le HUD du haut s'efface pendant ce temps : body.construction) montre les
// blocs débloqués (js/engine/blocs.js, blocDebloque) et combien il en reste, rangés par
// catégories (DATA.ATELIER.CATEGORIES) : des onglets intercalaires posés sur la barre, celui
// qui est ouvert avec son nom, les autres avec leur icône seule ; sous eux, une ligne de cases
// qui défile. Tous les murs tiennent dans une case, qui ouvre la bulle des murs (chacun son
// icône, ce qui en reste ; son nom au survol) ; de même les portes et les sols (GROUPES). On choisit un bloc, un appui sur une case de la carte l'y
// pose, un appui sur un bloc le reprend. Les pièces closes sont teintées de vert sur la carte. Le moteur :
// js/engine/blocs.js ; la carte : js/carte/ferme/chantier.js.

import { DATA } from '../engine/catalog.js';
import { atelierConstruit } from '../engine/atelier.js';
import { blocsDidacticiel } from '../engine/didacticiel.js';
import { setStageWindow, stageWindow } from './stage-windows.js';
import { blocAt, blocDebloque, blocDessus, blocsEnMain, categorieBloc, changeMur, changeSol, couchages, hauteurMur, poserBloc, poseStatus, reprendreBloc, solAt } from '../engine/blocs.js';
import { asleep } from '../engine/night.js';
import { buildLevel, buildMode, etageVue, setBuildLevel, setBuildMode, setEtageVue, state } from './store.js';
import { ETAGE_BLOCS, etageCouvertes, etageEmprise, poseEtageStatus, poserEtage, reprendreEtage, etageBlocs } from '../engine/etage.js';
import { persistState } from './storage.js';
import { refresh } from './render.js';
import { notify } from './toasts.js';
import { registerActions, SOMMEIL_MESSAGE } from './actions.js';
import { meubleSrc } from './caleche.js';

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
// (les meubles de la maison : seulement ceux qu'on a en main, ou celui qu'on pose)
const enMain = (s) => !DATA.ATELIER.BLOCS[s].meuble || s === buildMode || blocsEnMain(state, s) > 0;
// (pendant le didacticiel : seulement les blocs qu'il a débloqués, js/engine/didacticiel.js)
const vu = (s) => { const v = blocsDidacticiel(state); return !v || v.has(s); };
// (les arbres, graines et jeunes arbres fruitiers, se plantent depuis l'Inventaire : js/ui/plantation.js)
const bati = (s) => !DATA.ATELIER.BLOCS[s].semis && !DATA.ATELIER.BLOCS[s].arbre;
// (seulement ceux qui sont débloqués : en main, posés, ou que l'Atelier sait fabriquer)
const ouvert = (s) => s === buildMode || blocDebloque(state, s);
const SORTES = () => (niveauBati() ? ETAGE_BLOCS.filter(enMain) : niveau() ? MURS() : Object.keys(DATA.ATELIER.BLOCS).filter(enMain)).filter(vu).filter(bati).filter(ouvert);

// Les blocs qui tiennent dans une seule case du menu, qui ouvre leur bulle (quand il y en a
// plusieurs dans l'onglet) : les fenêtres, les murs, les portes, les sols (pas le chemin, du dehors).
const GROUPES = [
  { id: 'fenetres', nom: 'Fenêtres', de: (b) => !!b.fenetre },
  { id: 'murs', nom: 'Murs', de: (b) => !!b.mur && !b.fenetre },
  { id: 'portes', nom: 'Portes', de: (b) => !!b.porte },
  { id: 'sols', nom: 'Sols', de: (b) => !!b.sol && !b.dehors },
];
const groupeDe = (s) => { const b = DATA.ATELIER.BLOCS[s]; return b ? GROUPES.find((g) => g.de(b)) || null : null; };
// (les blocs du groupe `g` dans l'onglet `o`)
const duGroupe = (o, g) => (o ? o.sortes.filter((s) => groupeDe(s) === g) : []);

// Les onglets : [{ id, nom, icone, sortes }] (ceux qui ont au moins un bloc), dans l'ordre de
// DATA.ATELIER.CATEGORIES ; dans chacun, ses blocs dans l'ordre des données (les murs d'abord,
// dans l'ordre de BLOCS). L'onglet ouvert (onglet : son id, ou null : celui du bloc en main) ;
// la bulle ouverte (bulle : l'id de son groupe, ou null) ; le dernier bloc choisi de chaque
// groupe (choisi : { murs, portes, sols }), que montre la case du groupe.
let onglet = null, bulle = null;
const choisi = {};
function onglets() {
  const dispo = new Set(SORTES()), out = [];
  for (const [id, c] of Object.entries(DATA.ATELIER.CATEGORIES)) {
    const sortes = Object.keys(DATA.ATELIER.BLOCS).filter((s) => dispo.has(s) && categorieBloc(s) === id);
    const rang = (s) => (DATA.ATELIER.BLOCS[s].mur ? -1 : (c.blocs || []).indexOf(s));
    sortes.sort((a, b) => rang(a) - rang(b));
    if (sortes.length) out.push({ id, nom: c.nom, icone: c.icone, sortes });
  }
  return out;
}
function ongletOuvert(liste = onglets()) {
  return liste.find((o) => o.id === onglet) || liste.find((o) => o.sortes.includes(buildMode)) || liste[0] || null;
}
// Le bloc que montre la case du groupe `g` dans l'onglet `o` : celui en main, sinon le dernier
// choisi, sinon le premier qu'on a encore, sinon le premier.
function vuDuGroupe(o, g) {
  const l = duGroupe(o, g);
  if (l.includes(buildMode)) return buildMode;
  if (l.includes(choisi[g.id])) return choisi[g.id];
  return l.find((s) => blocsEnMain(state, s) > 0) || l[0];
}
// Le premier bloc à prendre en main dans l'onglet `o` : le dernier choisi d'un groupe qu'on a
// encore, sinon le premier qu'on a encore, sinon le premier.
function premierBloc(o) {
  const c = GROUPES.map((g) => choisi[g.id]).find((s) => s && o.sortes.includes(s) && blocsEnMain(state, s) > 0);
  return c || o.sortes.find((s) => blocsEnMain(state, s) > 0) || o.sortes[0];
}

// Pour le didacticiel (js/ui/didacticiel.js) : ce qu'il faut toucher pour prendre `sorte` en
// main. Sa case, ou l'onglet où il est, ou la case de son groupe qui ouvre la bulle.
export function cibleBloc(sorte) {
  const liste = onglets(), o = ongletOuvert(liste), cat = categorieBloc(sorte);
  if (!o || o.id !== cat) return `[data-action="build-tab"][data-cat="${cat}"]`;
  const g = groupeDe(sorte);
  if (g && duGroupe(o, g).length > 1 && bulle !== g.id) return `[data-action="build-groupe"][data-groupe="${g.id}"]`;
  return `[data-action="build-pick"][data-sorte="${sorte}"]`;
}
// La liste des niveaux (au-dessus du menu) : ouverte ? Un appui long sur le carré l'ouvre, on
// glisse jusqu'au niveau voulu et on lâche (APPUI_LONG_MS) ; un appui simple l'ouvre ou la ferme.
let niveauListe = false;
const APPUI_LONG_MS = 350;
const CONSEIL_MS = 2000;   // le rappel à l'ouverture du mode

// Le mode Construire est-il possible ? Toujours : on y pose d'abord l'Atelier, qui se construit
// en le posant ; l'entrée 🔨 du menu latéral l'ouvre.
export function chantierOuvert() {
  return true;
}

// L'icône d'un bloc (celle de son objet ; un meuble : son dessin ; l'Atelier : la sienne).
function icone(sorte) {
  const b = DATA.ATELIER.BLOCS[sorte];
  if (b.meuble) return `<img class="build-slot-img" src="${meubleSrc(b.meuble)}" alt="" draggable="false">`;
  return b.objet ? DATA.OBJETS[b.objet].icone : DATA.ATELIER.ICONE;
}

// La case de la barre d'outils.
export function buildSlotHtml() {
  if (!chantierOuvert() || !atelierConstruit(state)) return '';
  const on = !!buildMode;
  const label = on ? 'Construire : ranger' : 'Construire (poser des blocs)';
  return `<button type="button" class="tool-slot${on ? ' active' : ''}" data-action="build-toggle" aria-pressed="${on}" aria-label="${label}" title="${label}">${DATA.ATELIER.ICONE}</button>`;
}

// Une case du menu : l'icône du bloc, ce qu'il en reste (pâlie quand il n'y en a plus).
function caseBloc(s) {
  const n = blocsEnMain(state, s), on = s === buildMode, b = DATA.ATELIER.BLOCS[s];
  return `<button type="button" class="tool-slot build-slot${on ? ' active' : ''}${n ? '' : ' epuise'}" data-action="build-pick" data-sorte="${s}" aria-pressed="${on}" aria-label="${b.nom} : ${n}" title="${b.nom} : ${n}"><span aria-hidden="true">${icone(s)}</span><span class="build-slot-n num" aria-hidden="true">${n}</span></button>`;
}

// Le menu de construction, en haut de l'écran : les onglets intercalaires, puis la barre (la
// ligne des cases, qui défile ; au bout, le niveau de construction, ✕ et les paillasses d'une
// pièce close) ; la bulle d'un groupe (les murs, les portes, les sols) sous la barre.
export function buildChipHtml() {
  if (!buildMode || !chantierOuvert()) return '';
  const liste = onglets(), o = ongletOuvert(liste);
  const tabs = liste.length > 1 ? `<div class="build-tabs" role="tablist" aria-label="Catégories">${liste.map((t) => {
    const on = o && t.id === o.id;
    return `<button type="button" class="build-tab${on ? ' on' : ''}" role="tab" data-action="build-tab" data-cat="${t.id}" aria-selected="${on}" aria-label="${t.nom}" title="${t.nom}"><span aria-hidden="true">${t.icone}</span>${on ? `<span class="build-tab-nom">${t.nom}</span>` : ''}</button>`;
  }).join('')}</div>` : '';
  // un groupe (les murs, les portes, les sols) : une case (le bloc choisi), à la place du
  // premier, qui ouvre sa bulle ; un seul bloc du groupe : sa case
  const sortes = o ? o.sortes : [], vus = new Set(), rangs = [];
  const cases = sortes.map((s) => {
    const g = groupeDe(s), l = g ? duGroupe(o, g) : [];
    if (l.length < 2) { rangs.push(null); return caseBloc(s); }
    if (vus.has(g.id)) return '';
    vus.add(g.id);
    rangs.push(g.id);
    const v = vuDuGroupe(o, g), n = blocsEnMain(state, v), on = l.includes(buildMode);
    return `<button type="button" class="tool-slot build-slot build-groupe${on ? ' active' : ''}${n ? '' : ' epuise'}" data-action="build-groupe" data-groupe="${g.id}" aria-expanded="${bulle === g.id}" aria-label="${g.nom} : ${DATA.ATELIER.BLOCS[v].nom}, ${n}. En choisir un autre" title="${g.nom} : en choisir un autre"><span class="build-groupe-plus" aria-hidden="true">⋯</span><span aria-hidden="true">${icone(v)}</span><span class="build-slot-n num" aria-hidden="true">${n}</span></button>`;
  }).join('');
  const gb = GROUPES.find((g) => g.id === bulle), lb = gb ? duGroupe(o, gb) : [];
  // (sa flèche vers la case du groupe : son rang dans la barre)
  const bulleHtml = lb.length > 1 ? `<div class="build-bulle" role="group" aria-label="${gb.nom}" style="--rang:${Math.max(0, rangs.indexOf(gb.id))}"><div class="build-bulle-titre">${gb.nom}</div><div class="build-bulle-grid">${lb.map((s) => caseBloc(s)).join('')}</div></div>` : '';
  const dodo = couchages(state).length;
  const tete = niveauBati() ? '<span title="À l\'étage : on bâtit au-dessus de la pièce de l\'escalier ; ailleurs, on rehausse les murs">🪜 Étage</span>'
    : niveau() ? `<span title="Niveau ${niveau()} : touche un mur haut de ${niveau()} bloc${niveau() > 1 ? 's' : ''} pour le rehausser, un mur plus haut pour reprendre son bloc du dessus">🧱 Rehausser</span>`
    : `<span class="num" title="Paillasses dans une pièce close">🛏 ${dodo}</span>`;
  // le niveau de construction : un petit carré au bout de la barre, et la liste des niveaux (le
  // plus haut en haut), qui s'ouvre sous lui
  const max = niveauMax(), lvl = niveau();
  const niveaux = Array.from({ length: max + 1 }, (_, i) => max - i).map((n) => `<button type="button" class="build-level-item${n === lvl ? ' active' : ''}" data-action="build-level" data-niveau="${n}" aria-pressed="${n === lvl}" aria-label="Niveau ${n}">${n}</button>`).join('');
  // l'outil pièce : un mur en main, au sol ; allumé, un glissement trace le pourtour d'une pièce
  const murEnMain = !!(buildMode && DATA.ATELIER.BLOCS[buildMode] && DATA.ATELIER.BLOCS[buildMode].mur) && !niveau();
  const outilPiece = murEnMain ? `<button type="button" class="build-piece${modePiece ? ' on' : ''}" data-action="build-piece" aria-pressed="${modePiece}" aria-label="Outil pièce : glisser d'un coin à l'autre pour poser tous les murs d'une pièce" title="Outil pièce : glisse d'un coin à l'autre pour poser les murs du pourtour"><svg viewBox="0 0 16 16" width="18" height="18" aria-hidden="true"><rect x="2" y="3" width="12" height="10" fill="none" stroke="currentColor" stroke-width="2.4"/><rect x="7" y="11.5" width="2.6" height="2.6" fill="#fbd98c"/></svg></button>` : '';
  const choixNiveau = `<div class="build-level"><button type="button" class="build-level-btn" data-action="build-level-menu" aria-haspopup="true" aria-expanded="${niveauListe}" aria-label="Niveau de construction : ${lvl}" title="Niveau de construction (appui long : glisser jusqu'au niveau)">${lvl}</button><div class="build-level-list" role="group" aria-label="Niveaux"${niveauListe ? '' : ' hidden'}>${niveaux}</div></div>`;
  // la pose d'un meuble : ✔️ le pose là où est son aperçu, ❌ sort de ce mode
  const m = meubleModele(), ap = m && m.apercu;
  const pose = m ? `<div class="pose-meuble" role="group" aria-label="Poser le meuble"><span class="pose-meuble-txt">${ap ? (ap.ok ? 'Le poser ici ?' : 'Il ne tient pas ici') : 'Touche une case pour placer le meuble'}</span><button type="button" class="pose-meuble-ok" data-action="meuble-ok"${ap && ap.ok ? '' : ' disabled'} aria-label="Poser le meuble ici" title="Poser le meuble ici">✔️</button><button type="button" class="pose-meuble-non" data-action="meuble-annule" aria-label="Sortir de la pose du meuble" title="Sortir de la pose du meuble">❌</button></div>` : '';
  return `${pose}<div class="build-dock">${tabs}<div class="build-bar" role="group" aria-label="Construire : touche une case pour y poser le bloc choisi, un bloc pour le reprendre"><div class="build-bar-cases"><div class="build-bar-grid">${cases}</div>${bulleHtml}</div><div class="build-bar-bout"><div class="build-bar-boutons">${outilPiece}${choixNiveau}<button type="button" class="build-bar-close" data-action="build-toggle" aria-label="Ranger : fin de la construction" title="Ranger">✕</button></div><span class="build-bar-head">${tete}</span></div></div></div>`;
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

// La pose d'un meuble de la maison : un meuble en main (pas un tableau, qui s'accroche à un mur),
// au sol ou à l'étage, la carte montre un quadrillage ; un appui sur une case y pose son aperçu,
// calé sur la grille (vert : il tient là ; rouge : non), sans le poser ; ✔️ le pose, ❌ sort de
// ce mode. poseMeuble : { sorte, case } (l'aperçu), ou null.
let poseMeuble = null;
const meubleEnMain = () => {
  const b = buildMode && DATA.ATELIER.BLOCS[buildMode];
  return !!(b && b.meuble && !b.sur && (!niveau() || niveauBati()));
};
// Le meuble en main tient-il sur `c`, au niveau où l'on construit ?
const meubleTient = (c) => (niveauBati() ? poseEtageStatus(state, buildMode, c) : poseStatus(state, buildMode, c)).ok;
// Pour la carte (modèle.bati.meuble) : la grille, et l'aperçu s'il y en a un
// ({ case, dessin, largeur, hauteur, ok }).
export function meubleModele() {
  if (!meubleEnMain()) return null;
  const p = poseMeuble && poseMeuble.sorte === buildMode ? poseMeuble : null, b = DATA.ATELIER.BLOCS[buildMode];
  return { grille: true, etage: niveauBati(), apercu: p ? { case: p.case, dessin: b.meuble, largeur: b.largeur || 1, hauteur: b.hauteur || 1, plat: !!b.plat, ok: meubleTient(p.case) } : null };
}
// Sort de la pose d'un meuble : l'aperçu s'efface, un bloc (pas un meuble) passe en main.
function quitteMeuble() {
  poseMeuble = null;
  const autre = (s) => !DATA.ATELIER.BLOCS[s].meuble;
  setBuildMode(SORTES().find((s) => autre(s) && blocsEnMain(state, s) > 0) || SORTES().find(autre) || null);
}

// Construire en glissant (js/farm-stage.js, traceStart) : les murs (fenêtres comprises), les
// barrières, les sols et le chemin se posent d'un glissement du doigt parti d'une case où le
// bloc en main se pose ; au sol seulement, pas un meuble. Les murs et les barrières suivent une
// ligne droite (la rangée ou la colonne de départ), les sols toutes les cases traversées. Pour
// la carte : null (le bloc ne se trace pas), ou { ligne, stock } (combien on en a en main).
// La forme du tracé : « ligne » (murs, barrières), « libre » (sols), « piece » (l'outil pièce,
// un mur en main : le pourtour d'un rectangle, du coin de départ au coin sous le doigt).
export function traceInfo() {
  if (!buildMode || niveau() || meubleEnMain()) return null;
  const b = DATA.ATELIER.BLOCS[buildMode];
  if (!b || b.porte || b.silo || !(b.mur || (b.sol && !b.meuble) || buildMode === 'barriere')) return null;
  return { forme: b.sol ? 'libre' : modePiece && b.mur ? 'piece' : 'ligne', stock: blocsEnMain(state, buildMode) };
}
// La case `c` pour le tracé (le stock à part : la carte le borne) : 'ok', le bloc en main s'y
// pose ; 'fait', elle a déjà ce qu'il faut (un mur pour un mur, une barrière pour une barrière,
// un sol pour un sol) ; false, rien ne s'y pose.
export function tracePosable(c) {
  if (!buildMode) return false;
  if (poseStatus(state, buildMode, c).ok) return 'ok';
  const b = DATA.ATELIER.BLOCS[buildMode], x = blocAt(state, c), bx = x && DATA.ATELIER.BLOCS[x];
  if (b.mur ? bx && bx.mur : buildMode === 'barriere' ? x === 'barriere' : b.sol && solAt(state, c)) return 'fait';
  return false;
}
// L'outil pièce (le bouton au bout de la barre, un mur en main) : un glissement trace une pièce.
let modePiece = false;

// (le bloc en main : un de ceux qui se posent au niveau où l'on construit)
function blocDuNiveau() {
  if (buildMode && !SORTES().includes(buildMode)) setBuildMode(SORTES().find((s) => blocsEnMain(state, s) > 0) || SORTES()[0]);
}

registerActions({
  'build-toggle': () => {
    onglet = null; bulle = null;
    if (buildMode) { poseMeuble = null; setBuildMode(null); refresh(); return; }
    if (!chantierOuvert()) return;
    if (asleep(state)) { notify(SOMMEIL_MESSAGE); return; }
    if (stageWindow) setStageWindow(null);    // (depuis le menu latéral : on revient sur la carte)
    setBuildLevel(etageVue ? 1 : 0);          // (on construit d'abord là où l'on est)
    niveauListe = false;
    // (le dernier mur choisi, ou le premier bloc qu'on a encore)
    setBuildMode(choisi.murs && SORTES().includes(choisi.murs) && blocsEnMain(state, choisi.murs) > 0 ? choisi.murs : SORTES().find((s) => blocsEnMain(state, s) > 0) || SORTES()[0]);
    // (un rappel bref, à chaque ouverture : il ne cache pas longtemps la puce des blocs)
    notify(`${DATA.ATELIER.ICONE} Touche une case pour poser, un bloc pour le reprendre ; glisse pour poser toute une ligne.`, { duree: CONSEIL_MS });
    refresh();
  },
  // Un appui long sur le silo (js/carte/ferme/silo.js) : le mode Construire, un bloc de silo
  // en main, pour l'agrandir (une colonne de plus à côté, ou plus haute).
  'silo-agrandir': () => {
    if (!chantierOuvert() || !atelierConstruit(state)) return;
    if (asleep(state)) { notify(SOMMEIL_MESSAGE); return; }
    if (stageWindow) setStageWindow(null);
    poseMeuble = null;
    niveauListe = false;
    setBuildLevel(0);
    setBuildMode('bloc_silo');
    notify(blocsEnMain(state, 'bloc_silo')
      ? '🌾 Touche une colonne du silo pour la rehausser, une case juste à côté pour l\'élargir.'
      : `🌾 Plus de bloc de silo : fabrique-en à l'Atelier (${DATA.ATELIER.ICONE}).`, { duree: CONSEIL_MS * 2 });
    refresh();
    // (sa case, dans le menu qui défile : en vue)
    setTimeout(() => {
      const slot = document.querySelector('.build-slot.active');
      if (slot && slot.scrollIntoView) slot.scrollIntoView({ block: 'nearest' });
    }, 50);
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
    const s = target.dataset.sorte;
    poseMeuble = null;
    bulle = null;
    const g = groupeDe(s);
    if (g) choisi[g.id] = s;
    onglet = categorieBloc(s) || onglet;
    setBuildMode(s);
    refresh();
  },
  // Un onglet : ses blocs ; le premier qu'on a encore en main (la bulle se ferme).
  'build-tab': (target) => {
    if (!buildMode) return;
    const o = onglets().find((t) => t.id === target.dataset.cat);
    if (!o) return;
    onglet = o.id;
    bulle = null;
    poseMeuble = null;
    if (!o.sortes.includes(buildMode)) setBuildMode(premierBloc(o));
    refresh();
  },
  // La case d'un groupe (les murs, les portes, les sols) : le bloc qu'elle montre en main, et
  // sa bulle (ouverte ou fermée ; celle d'un autre groupe se ferme).
  'build-groupe': (target) => {
    if (!buildMode) return;
    const o = ongletOuvert(), g = GROUPES.find((q) => q.id === target.dataset.groupe);
    if (!g || !duGroupe(o, g).length) return;
    setBuildMode(vuDuGroupe(o, g));
    poseMeuble = null;
    bulle = bulle === g.id ? null : g.id;
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
      const reprend = (e && !changeMur(e, buildMode)) || etageCouvertes(state).has(c);
      // (un meuble en main, sur une case libre : son aperçu, pas encore posé)
      if (!reprend && meubleEnMain()) { poseMeuble = { sorte: buildMode, case: c }; refresh(); return; }
      const r = reprend ? reprendreEtage(state, c) : poserEtage(state, buildMode, c);
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
    // (le plancher en main : un appui sur un plancher sans rien dessus le reprend ; un sol d'un
    // autre modèle prend sa place ; un autre bloc se pose dessus)
    const sol = DATA.ATELIER.BLOCS[buildMode] && DATA.ATELIER.BLOCS[buildMode].sol;
    // (une fenêtre, une pierre d'angle, une porte en main : un appui sur un autre mur le change ; sinon un
    // appui sur un bloc le reprend : un mur rehaussé, son bloc du dessus d'abord)
    const b = blocAt(state, c);
    // (un bloc de silo en main, sur une colonne du silo : il la rehausse)
    const empile = !!b && b === buildMode && !!DATA.ATELIER.BLOCS[b].silo;
    const reprend = b ? !surLibre && !changeMur(b, buildMode) && !empile : sol && solAt(state, c) && !changeSol(solAt(state, c), buildMode);
    // (un meuble en main, sur une case libre : son aperçu, pas encore posé)
    if (!reprend && meubleEnMain()) { poseMeuble = { sorte: buildMode, case: c }; refresh(); return; }
    const r = reprend ? reprendreBloc(state, c) : poserBloc(state, buildMode, c);
    if (!r.ok) { notify(r.error); return; }
    persistState();
    refresh();
  },
  // L'outil pièce : allumé, un glissement d'un coin à l'autre trace le pourtour d'une pièce.
  'build-piece': () => {
    if (!buildMode) return;
    modePiece = !modePiece;
    if (modePiece) notify('▭ Glisse d\'un coin à l\'autre de la pièce : ses murs se posent tout autour. Puis touche un mur avec une porte en main.', { duree: CONSEIL_MS * 2 });
    refresh();
  },
  // Un glissement en mode Construire (traceInfo) : le bloc en main posé sur les cases tracées,
  // dans l'ordre, jusqu'au bout du stock ; une seule sauvegarde, un seul message.
  'bloc-many': (target) => {
    if (!traceInfo()) return;
    if (asleep(state)) { notify(SOMMEIL_MESSAGE); return; }
    const cases = String(target.dataset.cases || '').split(',').map(Number).filter((c) => Number.isInteger(c) && c >= 0);
    const sorte = buildMode, nom = DATA.ATELIER.BLOCS[sorte].nom.toLowerCase();
    let n = 0, raison = '';
    for (const c of cases) {
      const r = poserBloc(state, sorte, c);
      if (r.ok) { n += 1; continue; }
      raison = raison || r.error;
      if (!blocsEnMain(state, sorte)) break;
    }
    if (n) persistState();
    refresh();
    const reste = blocsEnMain(state, sorte);
    // (le tracé en voulait plus qu'on n'en avait en main : combien il en manque)
    const manque = Math.max(0, Number(target.dataset.manque) || 0);
    if (n) notify(`${DATA.ATELIER.ICONE} ${n} × ${nom} posé${n > 1 ? 's' : ''}${manque ? ` · il en manque ${manque}` : reste ? ` · encore ${reste} en main` : ' · plus rien en main'}${raison && !manque ? ` · ${raison}` : ''}`);
    else if (raison) notify(raison);
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
    const r = (niveauBati() ? poserEtage : poserBloc)(state, poseMeuble.sorte, poseMeuble.case);
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
