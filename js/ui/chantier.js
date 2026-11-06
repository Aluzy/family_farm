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
// A-2 (js/ui/catalogue.js) : l'onglet ⭐ en tête (les favoris, mis d'un appui long sur une case, puis les
// récents) ; sous les onglets, des filtres (ce que j'ai, la pièce des meubles, le style).

import { DATA } from '../engine/catalog.js';
import { atelierConstruit, craftStatus } from '../engine/atelier.js';
import { countItem } from '../engine/inventory.js';
import { blocsDidacticiel } from '../engine/didacticiel.js';
import { setStageWindow, stageWindow } from './stage-windows.js';
import { blocAt, blocDebloque, blocDessus, blocsEnMain, casesCouvertes, categorieBloc, changeMur, changeSol, couchages, couleursVariante, deplacerStatus, hauteurPile, matiereDessus, mesuresMeuble, nomVariante, rehausseStatus, poseStatus, solAt, tourneBloc, varianteBloc, variantesBloc, varianteSuivante } from '../engine/blocs.js';
import { asleep } from '../engine/night.js';
import { buildLevel, buildMode, etageVue, setBuildLevel, setBuildMode, setEtageVue, state } from './store.js';
import { deplacerEtageStatus, dessusEtage, murEtage, ETAGE_BLOCS, etage2Emprise, etageCouvertes, etageEmprise, poseEtageStatus, etageBlocs, poseSolEtageStatus, solsEtage, varianteEtage } from '../engine/etage.js';
import { persistState } from './storage.js';
import { refresh } from './render.js';
import { notify } from './toasts.js';
import { registerActions, SOMMEIL_MESSAGE } from './actions.js';
import { iconeBloc } from './icone-bloc.js';
import { closeModal, openModal } from './modal.js';
import { styleDe, styleInfo } from '../engine/styles.js';
import { surCase as surCaseMoteur } from '../engine/commandes.js';
import { commandesJouees, defaireCommandes, executer } from './commandes.js';
import { itemsText } from './common.js';
import { tel } from './consent.js';
import { basculerFavori, estFavori, filtrer, filtres, filtresPossibles, noterRecent, sortesEtoile } from './catalogue.js';

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
// Les sols d'une pièce (pas le chemin, du dehors ; pas un tapis) : au niveau 1 aussi.
const estSolPiece = (s) => { const b = DATA.ATELIER.BLOCS[s]; return !!(b && b.sol && !b.dehors && !b.meuble); };
const SOLS = () => Object.keys(DATA.ATELIER.BLOCS).filter(estSolPiece);
const solEnMain = () => niveau() >= 1 && estSolPiece(buildMode);
// Au niveau n ≥ 1, ce que fait la case `c` : 'sol' (un sol en main : le sol du niveau 1),
// 'rang' (un mur, une fenêtre, une porte du bas : le rehausser ; ses blocs du dessus sont les murs
// de l'étage), 'etage' (au-dessus de la pièce de l'escalier : un bloc de l'étage ; un tableau sur un mur
// rehaussé de l'étage aussi).
// `lot` (facultatif, tracePosable) : le niveau et l'emprise de l'étage, lus une fois pour toutes les cases.
function genreCase(c, lot = null) {
  const L = lot || { sol: solEnMain(), bati: niveauBati(), emprise: null };
  if (L.sol) return 'sol';
  const dansEtage = () => L.bati && (L.emprise || etageEmprise(state)).has(c);
  // (sur l'étage, un mur rehaussé où l'on accroche un tableau, ou d'où on le reprend : un bloc de l'étage)
  if (dansEtage() && (dessusEtage(state)[c] || (DATA.ATELIER.BLOCS[buildMode] && DATA.ATELIER.BLOCS[buildMode].sur === 'mur'))) return 'etage';
  if (hauteurPile(state, c) >= 1) return 'rang';
  return dansEtage() ? 'etage' : 'rang';
}
// Le mode Construire teste chaque case affichée d'affilée (js/farm-stage.js, syncConstructible) : le
// niveau, le bloc en main et l'emprise de l'étage ne changent pas pendant ce passage. Lus à la première
// case, oubliés juste après (une micro-tâche) ; relus si une commande a été jouée entre deux cases (un
// tracé pose au fil du doigt), ou si le bloc en main ou le niveau ont changé.
let lotTrace = null;
function leLotTrace() {
  const cle = commandesJouees() + '|' + buildMode + '|' + buildLevel;
  if (!lotTrace || lotTrace.cle !== cle) {
    const neuf = !lotTrace;
    lotTrace = { cle, n: niveau(), sol: solEnMain(), bati: niveauBati(), emprise: etageEmprise(state) };
    if (!neuf) return lotTrace;
    Promise.resolve().then(() => { lotTrace = null; });
  }
  return lotTrace;
}
// (à l'étage : seulement ceux qui s'y posent ; plus haut que le sol : les murs)
// (les meubles de la maison : seulement ceux qu'on a en main, ou celui qu'on pose)
const enMain = (s) => !DATA.ATELIER.BLOCS[s].meuble || s === buildMode || blocsEnMain(state, s) > 0;
// (pendant le didacticiel : seulement les blocs qu'il a débloqués, js/engine/didacticiel.js)
const vu = (s) => { const v = blocsDidacticiel(state); return !v || v.has(s); };
// (les arbres, graines et jeunes arbres fruitiers, se plantent depuis l'Inventaire : js/ui/plantation.js)
const bati = (s) => !DATA.ATELIER.BLOCS[s].semis && !DATA.ATELIER.BLOCS[s].arbre;
// (seulement ceux qui sont débloqués : en main, posés, ou que l'Atelier sait fabriquer)
const ouvert = (s) => s === buildMode || blocDebloque(state, s);
const SORTES = () => (niveauBati() ? ETAGE_BLOCS.filter(enMain).concat(SOLS()) : niveau() ? MURS().concat(SOLS()) : Object.keys(DATA.ATELIER.BLOCS).filter(enMain)).filter(vu).filter(bati).filter(ouvert);

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
const ETOILE = 'favoris';
function onglets() {
  const tout = SORTES(), dispo = new Set(tout), out = [];
  // (A-2 : l'onglet ⭐, les favoris puis les récents, s'il y en a)
  const etoile = sortesEtoile(tout);
  if (etoile.length) out.push({ id: ETOILE, nom: 'Favoris', icone: '⭐', sortes: etoile });
  for (const [id, c] of Object.entries(DATA.ATELIER.CATEGORIES)) {
    const sortes = Object.keys(DATA.ATELIER.BLOCS).filter((s) => dispo.has(s) && categorieBloc(s) === id);
    const rang = (s) => (DATA.ATELIER.BLOCS[s].mur ? -1 : (c.blocs || []).indexOf(s));
    sortes.sort((a, b) => rang(a) - rang(b));
    if (sortes.length) out.push({ id, nom: c.nom, icone: c.icone, sortes });
  }
  return out;
}
function ongletOuvert(liste = onglets()) {
  // (sans onglet choisi : celui de la catégorie du bloc en main, pas l'onglet ⭐)
  return liste.find((o) => o.id === onglet) || liste.find((o) => o.id !== ETOILE && o.sortes.includes(buildMode)) || liste.find((o) => o.id !== ETOILE) || liste[0] || null;
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

// Les cases du menu, en colonnes de LIGNES (css/jeu.css, .build-dock .build-bar-grid).
const LIGNES = 3;

// L'icône d'un bloc : js/ui/icone-bloc.js (la même dans l'Atelier).
const icone = iconeBloc;

// La case de la barre d'outils.
export function buildSlotHtml() {
  if (!chantierOuvert() || !atelierConstruit(state)) return '';
  const on = !!buildMode;
  const label = on ? 'Construire : ranger' : 'Construire (poser des blocs)';
  return `<button type="button" class="tool-slot${on ? ' active' : ''}" data-action="build-toggle" aria-pressed="${on}" aria-label="${label}" title="${label}">${DATA.ATELIER.ICONE}</button>`;
}

// Une case du menu : l'icône du bloc, ce qu'il en reste (pâlie quand il n'y en a plus).
// (depuis : l'onglet ⭐, qui reste ouvert quand on y choisit un bloc ; fav : le bloc est en favori, A-2)
function caseBloc(s, depuis = null) {
  const n = blocsEnMain(state, s), on = s === buildMode, b = DATA.ATELIER.BLOCS[s], fav = estFavori(s);
  const st = styleInfo(styleDe(s));   // (son style d'aménagement, js/engine/styles.js)
  return `<button type="button" class="tool-slot build-slot${on ? ' active' : ''}${n ? '' : ' epuise'}${fav ? ' favori' : ''}" data-action="build-pick" data-sorte="${s}"${depuis ? ` data-depuis="${depuis}"` : ''} aria-pressed="${on}" aria-label="${b.nom} : ${n}${st ? `, style ${st.nom}` : ''}${fav ? ', favori' : ''}" title="${b.nom} : ${n}${st ? ` · style ${st.nom} ${st.icone}` : ''} · appui long : ${fav ? 'retirer des' : 'mettre en'} favoris"><span aria-hidden="true">${icone(s)}</span><span class="build-slot-n num" aria-hidden="true">${n}</span>${st ? `<span class="build-slot-style" aria-hidden="true">${st.icone}</span>` : ''}${fav ? '<span class="build-slot-fav" aria-hidden="true">⭐</span>' : ''}</button>`;
}

// Les filtres sous les onglets (A-2, js/ui/catalogue.js), pour l'onglet `o` (pas l'onglet ⭐) : « ce que
// j'ai », la pièce (des meubles), le style ; ceux qui ont un sens pour ses blocs. '' s'il a peu de blocs.
function filtresHtml(o) {
  if (!o || o.id === ETOILE || o.sortes.length < 6) return '';
  const p = filtresPossibles(o.sortes);
  const puce = (attrs, on, icone, nom) => `<button type="button" class="build-filtre${on ? ' on' : ''}" ${attrs} aria-pressed="${on}" aria-label="${nom}" title="${nom}"><span aria-hidden="true">${icone}</span>${on ? `<span class="build-filtre-nom">${nom}</span>` : ''}</button>`;
  return `<div class="build-filtres" role="group" aria-label="Filtres">${puce('data-action="build-filtre" data-filtre="possede"', filtres.possede, '🎒', 'Ce que j\'ai')}${p.pieces.map((x) => puce(`data-action="build-filtre" data-filtre="piece" data-valeur="${x.id}"`, filtres.piece === x.id, x.icone, x.nom)).join('')}${p.styles.length > 1 ? p.styles.map((x) => puce(`data-action="build-filtre" data-filtre="style" data-valeur="${x.id}"`, filtres.style === x.id, x.icone, `Style ${x.nom}`)).join('') : ''}</div>`;
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
  // premier, qui ouvre sa bulle ; un seul bloc du groupe : sa case. L'onglet ⭐ : chaque bloc sa case ;
  // un autre, ses blocs passés par les filtres (A-2).
  const etoile = !!o && o.id === ETOILE;
  const sortes = !o ? [] : etoile ? o.sortes : filtrer(o.sortes, filtres, (x) => blocsEnMain(state, x)), vus = new Set(), rangs = [];
  const vuesFiltres = o && !etoile ? { ...o, sortes } : o;
  const cases = sortes.map((s) => {
    if (etoile) { rangs.push(null); return caseBloc(s, ETOILE); }
    const g = groupeDe(s), l = g ? duGroupe(vuesFiltres, g) : [];
    if (l.length < 2) { rangs.push(null); return caseBloc(s); }
    if (vus.has(g.id)) return '';
    vus.add(g.id);
    rangs.push(g.id);
    const v = vuDuGroupe(vuesFiltres, g), n = blocsEnMain(state, v), on = l.includes(buildMode);
    return `<button type="button" class="tool-slot build-slot build-groupe${on ? ' active' : ''}${n ? '' : ' epuise'}" data-action="build-groupe" data-groupe="${g.id}" aria-expanded="${bulle === g.id}" aria-label="${g.nom} : ${DATA.ATELIER.BLOCS[v].nom}, ${n}. En choisir un autre" title="${g.nom} : en choisir un autre"><span class="build-groupe-plus" aria-hidden="true">⋯</span><span aria-hidden="true">${icone(v)}</span><span class="build-slot-n num" aria-hidden="true">${n}</span></button>`;
  }).join('');
  const gb = GROUPES.find((g) => g.id === bulle), lb = gb && !etoile ? duGroupe(vuesFiltres, gb) : [];
  // (sa flèche vers la case du groupe : sa colonne dans la barre ; la bulle, sous sa ligne)
  const bulleHtml = lb.length > 1 ? `<div class="build-bulle" role="group" aria-label="${gb.nom}" style="--rang:${Math.floor(Math.max(0, rangs.indexOf(gb.id)) / LIGNES)};--ligne:${Math.max(0, rangs.indexOf(gb.id)) % LIGNES}"><div class="build-bulle-titre">${gb.nom}</div><div class="build-bulle-grid">${lb.map((s) => caseBloc(s)).join('')}</div></div>` : '';
  const dodo = couchages(state).length;
  const tete = niveauBati() ? '<span title="À l\'étage : on bâtit au-dessus de la pièce de l\'escalier ; ailleurs, on rehausse les murs">🪜 Étage</span>'
    : niveau() ? `<span title="Niveau ${niveau()} : touche un mur haut de ${niveau()} bloc${niveau() > 1 ? 's' : ''} pour le rehausser, un mur plus haut pour reprendre son bloc du dessus">🧱 Rehausser</span>`
    : `<span class="num" title="Paillasses dans une pièce close">🛏 ${dodo}</span>`;
  // le niveau de construction : un petit carré au bout de la barre, et la liste des niveaux (le
  // plus haut en haut), qui s'ouvre sous lui
  const max = niveauMax(), lvl = niveau();
  // (chaque niveau : son chiffre et ce qu'on y fait)
  const quoi = (n) => (!n ? 'Au sol' : n === 1 && etageEmprise(state).size ? 'Étage · murs, sols' : `Murs · ${n + 1} blocs, sols`);
  const niveaux = Array.from({ length: max + 1 }, (_, i) => max - i).map((n) => `<button type="button" class="build-level-item${n === lvl ? ' active' : ''}" data-action="build-level" data-niveau="${n}" aria-pressed="${n === lvl}" aria-label="Niveau ${n} : ${quoi(n)}"><span class="build-level-n" aria-hidden="true">${n}</span><span class="build-level-quoi" aria-hidden="true">${quoi(n)}</span></button>`).join('');
  // l'outil pièce : un mur en main, au sol ; allumé, un glissement trace le pourtour d'une pièce
  const murEnMain = !!(buildMode && DATA.ATELIER.BLOCS[buildMode] && DATA.ATELIER.BLOCS[buildMode].mur);
  // la gomme (un bloc qui se trace en main) et Annuler (au sol comme à l'étage, s'il y a quelque chose à défaire)
  const gomme = traceInfo() || modeGomme ? `<button type="button" class="build-piece build-gomme${modeGomme ? ' on' : ''}" data-action="build-gomme" aria-pressed="${modeGomme}" aria-label="Gomme : glisser pour reprendre les blocs" title="Gomme : glisse pour reprendre les blocs de cette sorte"><svg viewBox="0 0 16 16" width="18" height="18" aria-hidden="true"><path d="M3 10.5 9.5 4l3.5 3.5L6.5 14H4z" fill="#fbd98c" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><path d="M6.4 7.1l3.5 3.5" stroke="currentColor" stroke-width="1.6"/><path d="M8 14h5" stroke="currentColor" stroke-width="1.6"/></svg></button>` : '';
  const annuler = `<button type="button" class="build-piece build-annuler" data-action="build-annuler"${histoire.length ? '' : ' disabled'} aria-label="Annuler la dernière opération" title="Annuler la dernière opération"><svg viewBox="0 0 16 16" width="18" height="18" aria-hidden="true"><path d="M5 4 2 7l3 3" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M2.5 7H10a3.5 3.5 0 0 1 0 7H7" fill="none" stroke="currentColor" stroke-width="2"/></svg></button>`;
  // l'outil ↻ (au sol et à l'étage, A-1) : allumé, un appui sur un meuble posé le tourne ; un meuble qui
  // tourne en main (pas un meuble de la maison, qui a sa pose à lui) : la flèche dit le sens où il se posera
  const auSol = !niveau() || niveauBati();
  const sensEnMain = auSol && buildMode && tourneBloc(buildMode) && !meubleEnMain();
  const outilTourner = auSol ? `<button type="button" class="build-piece build-tourner${modeTourner ? ' on' : ''}" data-action="build-tourner" aria-pressed="${modeTourner}" aria-label="Tourner : touche un meuble posé pour le tourner d'un quart de tour" title="Tourner : touche un meuble posé pour le tourner d'un quart de tour"><span aria-hidden="true">↻</span></button>`
    + (sensEnMain ? `<button type="button" class="build-piece build-sens" data-action="build-sens" aria-label="Le prochain se posera ${SENS_NOMS[sensPose]} : le tourner" title="Le prochain se posera ${SENS_NOMS[sensPose]} (touche pour le tourner)"><span aria-hidden="true">${FLECHES[sensPose]}</span></button>` : '') : '';
  // l'outil 🎨 (A-3) : allumé, un appui sur un meuble posé qui a plusieurs couleurs le repeint de la suivante
  const outilPeindre = auSol ? `<button type="button" class="build-piece build-peindre${modePeindre ? ' on' : ''}" data-action="build-peindre" aria-pressed="${modePeindre}" aria-label="Repeindre : touche un meuble posé pour changer sa couleur" title="Repeindre : touche un meuble posé pour changer sa couleur"><span aria-hidden="true">🎨</span></button>` : '';
  const outilPiece = murEnMain ? `<button type="button" class="build-piece${modePiece ? ' on' : ''}" data-action="build-piece" aria-pressed="${modePiece}" aria-label="Outil pièce : glisser d'un coin à l'autre pour poser tous les murs d'une pièce" title="Outil pièce : glisse d'un coin à l'autre pour poser les murs du pourtour"><svg viewBox="0 0 16 16" width="18" height="18" aria-hidden="true"><rect x="2" y="3" width="12" height="10" fill="none" stroke="currentColor" stroke-width="2.4"/><rect x="7" y="11.5" width="2.6" height="2.6" fill="#fbd98c"/></svg></button>` : '';
  const choixNiveau = `<div class="build-level"><button type="button" class="build-level-btn" data-action="build-level-menu" aria-haspopup="true" aria-expanded="${niveauListe}" aria-label="Niveau de construction : ${lvl}" title="Niveau de construction (appui long : glisser jusqu'au niveau)">${lvl}</button><div class="build-level-list" role="group" aria-label="Niveaux"${niveauListe ? '' : ' hidden'}><span class="build-level-titre" aria-hidden="true">Niveau</span>${niveaux}</div></div>`;
  // la pose d'un meuble : ✔️ le pose là où est son aperçu, ❌ sort de ce mode
  const m = meubleModele(), ap = m && m.apercu;
  const pose = m ? `<div class="pose-meuble" role="group" aria-label="Poser le meuble"><span class="pose-meuble-txt">${ap ? (ap.ok ? 'Le poser ici ?' : 'Il ne tient pas ici') : 'Touche une case pour placer le meuble'}</span>${tourneBloc(buildMode) ? `<button type="button" class="pose-meuble-tourne" data-action="meuble-tourner" aria-label="Tourner le meuble : il est ${SENS_NOMS[sensPose]}" title="Tourner le meuble d'un quart de tour (${SENS_NOMS[sensPose]})">↻<span class="pose-meuble-sens" aria-hidden="true">${FLECHES[sensPose]}</span></button>` : ''}${variantesBloc(buildMode).length ? `<button type="button" class="pose-meuble-peint" data-action="meuble-peindre" aria-label="Couleur : ${nomVariante(buildMode, varianteDe(buildMode))}. En changer" title="Couleur : ${nomVariante(buildMode, varianteDe(buildMode))} (touche pour en changer)">🎨</button>` : ''}<button type="button" class="pose-meuble-ok" data-action="meuble-ok"${ap && ap.ok ? '' : ' disabled'} aria-label="Poser le meuble ici" title="Poser le meuble ici">✔️</button><button type="button" class="pose-meuble-non" data-action="meuble-annule" aria-label="Sortir de la pose du meuble" title="Sortir de la pose du meuble">❌</button></div>` : '';
  // les outils (annuler, la gomme, l'outil pièce, le niveau) : une petite fenêtre à part, qu'un
  // appui long rend déplaçable (outilsPos : où on l'a laissée)
  const pos = outilsPos ? ` style="left:${outilsPos.x}px;top:${outilsPos.y}px;right:auto"` : '';
  const outils = `<div class="build-outils${outilsDeplace ? ' deplace' : ''}" role="toolbar" aria-label="Outils de construction (appui long : la déplacer)" title="Appui long : déplacer"${pos}><span class="build-outils-prise" aria-hidden="true">⠿</span>${annuler}${gomme}${outilTourner}${outilPeindre}${outilPiece}${choixNiveau}</div>`;
  return `${pose}<div class="build-dock">${tabs}<div class="build-bar" role="group" aria-label="Construire : touche une case pour y poser le bloc choisi, un bloc pour le reprendre"><div class="build-bar-cases">${filtresHtml(o)}<div class="build-bar-grid">${cases || '<span class="build-vide">Rien avec ces filtres.</span>'}</div>${bulleHtml}</div><div class="build-bar-bout"><div class="build-bar-boutons"><button type="button" class="build-bar-close" data-action="build-toggle" aria-label="Ranger : fin de la construction" title="Ranger">✕</button></div><span class="build-bar-head">${tete}</span></div></div></div>${outils}`;
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

// A-3 : repeindre le meuble de la case `c` (une de ses cases ; `etage` : à l'étage) de sa couleur suivante.
function repeindre(c, etage) {
  const ancre = etage ? (!etageBlocs(state)[c] && etageCouvertes(state).has(c) ? etageCouvertes(state).get(c) : c)
    : (!blocAt(state, c) && casesCouvertes(state).has(c) ? casesCouvertes(state).get(c) : c);
  const sorte = etage ? etageBlocs(state)[ancre] : blocAt(state, ancre);
  if (!sorte) { notify('Touche un meuble posé pour changer sa couleur.'); return; }
  const actuelle = etage ? varianteEtage(state, ancre) : varianteBloc(state, ancre);
  const v = varianteSuivante(sorte, actuelle);
  const r = v ? executer(etage ? 'etage.peindre' : 'bloc.peindre', { case: ancre, variante: v }) : { ok: false, error: `${DATA.ATELIER.BLOCS[sorte].nom} : une seule couleur pour l'instant.` };
  if (!r.ok) { notify(r.error); return; }
  noter(r.inverses);
  notify(`🎨 ${DATA.ATELIER.BLOCS[sorte].nom} : ${nomVariante(sorte, r.variante)}`, { duree: CONSEIL_MS });
  persistState();
  refresh();
}

// A-2 : un appui long sur une case du menu (un clic droit, à la souris) met son bloc en favori, ou l'en
// retire (js/ui/catalogue.js) ; le clic qui suit le lâcher ne le prend pas en main (sansChoix).
const APPUI_FAVORI_MS = 500;
let sansChoix = false;
if (typeof document !== 'undefined') {
  let tient = null;
  const caseDe = (e) => (e.target.closest ? e.target.closest('.build-slot[data-sorte]') : null);
  const bascule = (sorte) => {
    const b = DATA.ATELIER.BLOCS[sorte];
    if (!b) return;
    const on = basculerFavori(sorte);
    notify(on ? `⭐ ${b.nom} : dans tes favoris (l'onglet ⭐).` : `${b.nom} : retiré de tes favoris.`, { duree: CONSEIL_MS });
    if (navigator.vibrate) navigator.vibrate(15);
    refresh();
  };
  document.addEventListener('pointerdown', (e) => {
    const c = caseDe(e);
    if (!c || !buildMode) return;
    if (tient) clearTimeout(tient.timer);
    tient = { id: e.pointerId, x0: e.clientX, y0: e.clientY, sorte: c.dataset.sorte };
    tient.timer = setTimeout(() => {
      if (!tient) return;
      sansChoix = true;
      setTimeout(() => { sansChoix = false; }, 800);
      bascule(tient.sorte);
      tient = null;
    }, APPUI_FAVORI_MS);
  });
  document.addEventListener('pointermove', (e) => {
    if (tient && e.pointerId === tient.id && Math.hypot(e.clientX - tient.x0, e.clientY - tient.y0) > 8) { clearTimeout(tient.timer); tient = null; }
  });
  const lache = () => { if (tient) { clearTimeout(tient.timer); tient = null; } };
  document.addEventListener('pointerup', lache);
  document.addEventListener('pointercancel', lache);
  document.addEventListener('contextmenu', (e) => {
    const c = caseDe(e);
    if (!c || !buildMode) return;
    e.preventDefault();
    // (sur un téléphone, l'appui long donne aussi ce menu : déjà basculé par le minuteur, ou pas encore)
    if (sansChoix) return;
    lache();
    sansChoix = true;
    setTimeout(() => { sansChoix = false; }, 800);
    bascule(c.dataset.sorte);
  });
}

// La fenêtre des outils : un appui long dessus (pas sur le niveau, qui a le sien) la rend
// déplaçable, irisée ; elle suit alors le doigt, et reste où on la lâche (gardée sur l'appareil).
const OUTILS_CLE = 'ferme-construire-outils';
let outilsDeplace = false;   // (l'appui long l'a rendue déplaçable : irisée, elle suit le doigt)
let outilsPos = (() => { try { const p = JSON.parse(localStorage.getItem(OUTILS_CLE)); return p && Number.isFinite(p.x) && Number.isFinite(p.y) ? p : null; } catch (e) { return null; } })();
if (typeof document !== 'undefined') {
  let tient = null, sansClic = false;
  const borne = (v, max) => Math.max(4, Math.min(max, v));
  document.addEventListener('pointerdown', (e) => {
    const w = e.target.closest && e.target.closest('.build-outils');
    if (!w || e.target.closest('.build-level')) return;
    const r = w.getBoundingClientRect();
    if (tient) clearTimeout(tient.timer);
    tient = { id: e.pointerId, x0: e.clientX, y0: e.clientY, dx: e.clientX - r.left, dy: e.clientY - r.top, actif: false, w };
    tient.timer = setTimeout(() => {
      if (!tient) return;
      tient.actif = true;
      outilsDeplace = true;
      const el = document.querySelector('.build-outils');
      if (el) el.classList.add('deplace');
      if (navigator.vibrate) navigator.vibrate(15);
    }, APPUI_LONG_MS);
  });
  document.addEventListener('pointermove', (e) => {
    if (!tient || e.pointerId !== tient.id) return;
    if (!tient.actif) {
      if (Math.hypot(e.clientX - tient.x0, e.clientY - tient.y0) > 8) { clearTimeout(tient.timer); tient = null; }
      return;
    }
    e.preventDefault();
    const w = document.querySelector('.build-outils') || tient.w, r = w.getBoundingClientRect();
    outilsPos = { x: Math.round(borne(e.clientX - tient.dx, window.innerWidth - r.width - 4)), y: Math.round(borne(e.clientY - tient.dy, window.innerHeight - r.height - 4)) };
    w.style.left = `${outilsPos.x}px`;
    w.style.top = `${outilsPos.y}px`;
    w.style.right = 'auto';
  }, { passive: false });
  const lache = () => {
    if (!tient) return;
    clearTimeout(tient.timer);
    if (tient.actif) {
      outilsDeplace = false;
      const w = document.querySelector('.build-outils');
      if (w) w.classList.remove('deplace');
      sansClic = true;
      setTimeout(() => { sansClic = false; }, 400);
      try { localStorage.setItem(OUTILS_CLE, JSON.stringify(outilsPos)); } catch (e) { /* (stockage plein ou refusé) */ }
    }
    tient = null;
  };
  document.addEventListener('pointerup', lache);
  document.addEventListener('pointercancel', lache);
  document.addEventListener('click', (e) => {
    if (sansClic && e.target.closest && e.target.closest('.build-outils')) { sansClic = false; e.stopPropagation(); e.preventDefault(); }
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
const meubleTient = (c) => (niveauBati() ? poseEtageStatus(state, buildMode, c, sensDe(buildMode)) : poseStatus(state, buildMode, c, sensDe(buildMode))).ok;
// Pour la carte (modèle.bati.meuble) : la grille, et l'aperçu s'il y en a un
// ({ case, dessin, largeur, hauteur, ok }).
export function meubleModele() {
  if (!meubleEnMain()) return null;
  const p = poseMeuble && poseMeuble.sorte === buildMode ? poseMeuble : null, b = DATA.ATELIER.BLOCS[buildMode];
  // (à l'étage, les meubles ne tournent pas encore)
  const sens = sensDe(buildMode), mes = mesuresMeuble(buildMode, sens), v = vueMeuble(buildMode, sens);
  const teinte = varianteDe(buildMode), couleurs = teinte ? couleursVariante(buildMode, teinte) : null;
  return { grille: true, etage: niveauBati(), apercu: p ? { case: p.case, dessin: b.meuble, vue: v.vue, miroir: v.miroir, largeur: mes.largeur, hauteur: mes.hauteur, plat: !!b.plat, ok: meubleTient(p.case), ...(couleurs ? { variante: teinte, couleurs } : {}) } : null };
}
// L'image d'un meuble dans le sens `sens` : le suffixe de son dessin (_cote, _dos : scripts/batiments/
// meubles_sens.py) et s'il est retourné en miroir (vers la gauche ; un meuble rond, de dos).
export function vueMeuble(sorte, sens) {
  const t = tourneBloc(sorte);
  if (!t || !sens) return { vue: '', miroir: false };
  if (t === 'symetrique') return { vue: '', miroir: sens >= 2 };
  return { vue: ['', '_cote', '_dos', '_cote'][sens], miroir: sens === 3 };
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
  if (!buildMode || meubleEnMain()) return null;
  const b = DATA.ATELIER.BLOCS[buildMode];
  if (!b || b.porte || b.silo || !(b.mur || (b.sol && !b.meuble) || buildMode === 'barriere')) return null;
  // (aux niveaux 1 et 2 : les murs, qu'on rehausse ; sur l'étage d'une pièce : murs et sols)
  if (niveau() && !niveauBati() && !b.mur && !solEnMain()) return null;
  if (niveauBati() && !(b.mur || b.sol)) return null;
  return { forme: b.sol ? 'libre' : modePiece && b.mur ? 'piece' : 'ligne', stock: blocsEnMain(state, buildMode), gomme: modeGomme };
}
// La case `c` pour le tracé (le stock à part : la carte le borne) : 'ok', le bloc en main s'y
// pose ; 'fait', elle a déjà ce qu'il faut (un mur pour un mur, une barrière pour une barrière,
// un sol pour un sol) ; false, rien ne s'y pose.
// (d'abord ce qui y est déjà : le moteur dit qu'un mur se pose sur un mur, pour le rehausser, et un
// sol sur un sol, pour le changer ; un tracé, lui, les laisse tels quels)
export function tracePosable(c) {
  if (!buildMode) return false;
  const b = DATA.ATELIER.BLOCS[buildMode];
  // sur l'étage d'une pièce : ce qui y est déjà (un mur pour un mur, un sol pour un sol), sinon
  // ce que le moteur y pose
  const L = leLotTrace(), n = L.n, g = n ? genreCase(c, L) : null;
  // au niveau 1, un sol : dans une pièce dont les murs montent au niveau 1, ou sur l'étage
  if (g === 'sol') {
    if (solsEtage(state, n)[c]) return 'fait';
    return poseSolEtageStatus(state, buildMode, c, n).ok ? 'ok' : false;
  }
  if (g === 'etage') {
    const e = etageBlocs(state)[c], be = e && DATA.ATELIER.BLOCS[e];
    if (be && (b.mur ? be.mur : b.sol && be.sol)) return 'fait';
    return poseEtageStatus(state, buildMode, c).ok ? 'ok' : false;
  }
  // aux niveaux 1 et 2 : un mur haut de n blocs (le même mur en main ; au-dessus d'une fenêtre ou
  // d'une porte, un mur plein) se rehausse ; plus haut, c'est fait
  if (n) {
    const h = hauteurPile(state, c);
    if (!h || !b.mur) return false;
    if (h > n) return 'fait';
    return h === n && rehausseStatus(state, buildMode, c).ok ? 'ok' : false;
  }
  const x = blocAt(state, c), bx = x && DATA.ATELIER.BLOCS[x];
  if (b.mur ? bx && bx.mur : buildMode === 'barriere' ? x === 'barriere' : b.sol && solAt(state, c)) return 'fait';
  return poseStatus(state, buildMode, c).ok ? 'ok' : false;
}
// L'outil pièce (le bouton au bout de la barre, un mur en main) : un glissement trace une pièce.
let modePiece = false;
// La gomme (le bouton à côté) : un glissement reprend, au lieu de poser, les blocs de la même
// famille que celui en main sur les cases tracées (les cases « fait » de tracePosable).
let modeGomme = false;
// Tourner les meubles (js/engine/blocs.js, sensBloc) : `sensPose`, le sens du prochain meuble posé (0 de
// face, 1 tourné vers la droite, 2 de dos, 3 vers la gauche ; le bouton ↻ de la pose d'un meuble, ou celui
// de la barre d'outils, un meuble qui tourne en main) ; `modeTourner` (l'outil ↻ allumé) : un appui sur un
// meuble posé le tourne d'un quart de tour.
let sensPose = 0, modeTourner = false;
// A-3 : la couleur du prochain meuble posé, par sorte (son id ; rien : celle du dessin), et l'outil 🎨 allumé
// (modePeindre) : un appui sur un meuble posé le repeint de sa couleur suivante.
const variantePose = {};
let modePeindre = false;
const varianteDe = (sorte) => (variantesBloc(sorte).some((v) => v.id === variantePose[sorte]) ? variantePose[sorte] : null);
// Le sens du prochain meuble, s'il tourne (sinon 0).
const sensDe = (sorte) => (tourneBloc(sorte) ? sensPose : 0);
// Où il regarde : ⬇ de face, ➡ vers la droite, ⬆ de dos, ⬅ vers la gauche.
const FLECHES = ['⬇', '➡', '⬆', '⬅'];
const SENS_NOMS = ['de face', 'tourné vers la droite', 'de dos', 'tourné vers la gauche'];
// Le prochain sens (un quart de tour dans le sens des aiguilles d'une montre : de face, vers la gauche,
// de dos, vers la droite).
const quartDeTour = (s) => (s + 3) % 4;

// Annuler (le bouton ↶ de la barre) : les dernières opérations, la plus récente en haut
// (HISTOIRE_MAX au plus ; oubliées quand on range le mode Construire). Une opération est la liste
// des commandes inverses de ce qu'elle a fait (js/engine/commandes.js : chaque commande jouée rend
// les siennes), défaites ensemble, de la dernière à la première.
const HISTOIRE_MAX = 30;
let histoire = [];
function noter(inverses) {
  if (!inverses.length) return;
  histoire.push(inverses);
  if (histoire.length > HISTOIRE_MAX) histoire.shift();
}
// La pipette : le bloc posé sur la case `c` au sol ou sur l'étage (celui que reprendrait un appui ; un
// meuble, sur n'importe laquelle de ses cases), s'il se pose à ce niveau, sinon null.
export function pipetteSorte(c) {
  if (!buildMode) return null;
  if (niveauBati()) {
    const e = etageBlocs(state), couvert = etageCouvertes(state).get(c), s = dessusEtage(state)[c] || e[c] || (couvert !== undefined ? e[couvert] : null);
    return s && SORTES().includes(s) ? s : null;
  }
  if (niveau()) return null;
  const couvert = casesCouvertes(state).get(c);
  const s = surCase(c) || (couvert !== undefined ? surCase(couvert) : null);
  return s && SORTES().includes(s) ? s : null;
}
// Déplacer un bloc posé (js/farm-stage.js) : un glissement parti d'un meuble ou d'un bloc seul (la
// lanterne, le four, la ruche… : pas un mur, une porte, un sol, une barrière, le silo, qui se
// tracent et se gomment) l'emporte jusqu'où on le lâche. Au sol et sur l'étage. Pour la carte :
// { sorte, ancre (sa case d'ancrage) } ou null.
export function deplacable(c) {
  if (!buildMode || meubleEnMain()) return null;
  if (niveauBati()) {
    const e = etageBlocs(state), couvert = etageCouvertes(state).get(c), ancre = couvert !== undefined && !e[c] ? couvert : c;
    const sorte = e[ancre], b = sorte && DATA.ATELIER.BLOCS[sorte];
    if (!b || b.mur || b.sol || b.porte || b.fenetre || sorte === 'barriere' || sorte === 'escalier') return null;
    return { sorte, ancre };
  }
  if (niveau()) return null;
  const couvert = casesCouvertes(state).get(c), ancre = couvert !== undefined && !surCase(c) ? couvert : c;
  const sorte = surCase(ancre), b = sorte && DATA.ATELIER.BLOCS[sorte];
  if (!b || b.mur || b.sol || b.porte || b.silo || b.semis || b.arbre || sorte === 'barriere') return null;
  return { sorte, ancre };
}
// L'aperçu du déplacement : tiendrait-il, ancré sur `vers` ? { ok, cases }.
export function deplacePossible(de, vers) {
  const r = niveauBati() ? deplacerEtageStatus(state, de, vers) : deplacerStatus(state, de, vers);
  return { ok: r.ok, cases: r.cases };
}
// Ce qui est sur la case `c` au sol : le bloc du dessus, le bloc, le sol (ce que reprend un appui).
const surCase = (c) => surCaseMoteur(state, c);

// Poser `sorte` sur la case `c` au niveau où l'on construit (un tracé) : sur l'étage d'une pièce, sur
// l'étage ; aux niveaux 1 et 2, rehausser le mur ; au sol, poser. Le résultat de la commande (ses
// inverses, pour l'annuler).
function poserIci(sorte, c) {
  const g = niveau() ? genreCase(c) : null;
  if (g === 'sol') return executer('solEtage.poser', { sorte, case: c, niveau: niveau() });
  if (g === 'etage') return executer('etage.poser', { sorte, case: c });
  if (g) return executer('mur.rehausser', { sorte, case: c });
  return executer('bloc.poser', { sorte, case: c });
}
// Reprendre (la gomme) ce qu'il y a sur la case `c` au niveau où l'on construit : sur l'étage, son
// bloc ; aux niveaux 1 et 2, le bloc du dessus d'un mur haut de n + 1 blocs ; au sol, le bloc.
function reprendreIci(c) {
  const g = niveau() ? genreCase(c) : null;
  if (g === 'sol') return executer('solEtage.reprendre', { case: c, niveau: niveau() });
  if (g === 'etage') return executer('etage.reprendre', { case: c });
  if (niveau()) return executer('mur.abaisser', { case: c, niveau: niveau() });
  return executer('bloc.reprendre', { case: c });
}

// Fabriquer sur place ce qui manque : un tracé en voulait plus qu'on n'en avait en main. La
// recette de l'Atelier qui donne ce bloc (celle de son nom, sinon une dont la sortie le contient),
// ou null (un bloc qui ne se fabrique pas à l'Atelier : celui d'un atelier de hameau).
function recetteDuBloc(sorte) {
  const b = DATA.ATELIER.BLOCS[sorte], obj = b && b.objet, R = DATA.ATELIER.RECETTES;
  if (!obj) return null;
  if (R[sorte] && R[sorte].sortie && R[sorte].sortie[obj]) return sorte;
  return Object.keys(R).find((k) => R[k].sortie && R[k].sortie[obj] && !R[k].outil && !R[k].meuble) || null;
}
// Combien de fois la recette `id` peut se faire avec l'inventaire (sans compter l'énergie).
function foisPossibles(id) {
  const e = DATA.ATELIER.RECETTES[id].entrees || {};
  return Math.min(...Object.entries(e).map(([item, n]) => Math.floor(countItem(state, item) / n)));
}
// Le tracé qui attend ses blocs : { sorte, cases, id, fois } (la fenêtre « Fabriquer et poser »).
let enAttente = null;
// La fenêtre : il manque `cases.length` blocs `sorte` ; les fabriquer (autant que les matériaux le
// permettent) et les poser ? Sans recette, ou sans de quoi en faire un seul : un message.
function proposerFabrication(sorte, cases) {
  const b = DATA.ATELIER.BLOCS[sorte], nom = b.nom.toLowerCase(), n = cases.length, id = recetteDuBloc(sorte);
  if (!id) { notify(`Il manque ${n} × ${nom}, qui ne se fabrique pas à l'Atelier.`); return; }
  const R = DATA.ATELIER.RECETTES[id], par = R.sortie[b.objet], voulu = Math.ceil(n / par);
  const st = craftStatus(state, id);
  if (!st.ok && st.raison !== 'Il manque des matériaux.') { notify(`Il manque ${n} × ${nom} · ${st.raison}`); return; }
  const fois = Math.min(voulu, foisPossibles(id));
  const cout = Object.fromEntries(Object.entries(R.entrees || {}).map(([item, q]) => [item, q * voulu]));
  if (!fois) { notify(`Il manque ${n} × ${nom} · pour les fabriquer, il faut ${itemsText(cout, 'nom')}.`); return; }
  enAttente = { sorte, cases, id, fois };
  const faits = Math.min(n, fois * par), coutFait = Object.fromEntries(Object.entries(R.entrees || {}).map(([item, q]) => [item, q * fois]));
  const partiel = faits < n ? `<p>Tu as de quoi en fabriquer ${faits} sur ${n} : le reste du tracé attendra.</p>` : '';
  openModal(`
    <h2 id="bloc-fabriquer-titre"><span aria-hidden="true">${DATA.ATELIER.ICONE}</span> Il manque ${n} × ${nom}</h2>
    <p>Les fabriquer et les poser maintenant ? ${fois > 1 ? `${fois} fois la recette` : 'La recette'} de l'Atelier : ${itemsText(coutFait, 'nom')}.</p>
    ${partiel}
    <div class="row"><button type="button" class="btn primary" data-action="bloc-fabriquer">Fabriquer et poser ${faits}</button><button type="button" class="btn" data-action="close-modal">Non merci</button></div>`,
  { labelledBy: 'bloc-fabriquer-titre', className: 'modal bois item-modal', focus: '[data-action="bloc-fabriquer"]', onClose: () => { enAttente = null; } });
}

// (le bloc en main : un de ceux qui se posent au niveau où l'on construit)
function blocDuNiveau() {
  if (buildMode && !SORTES().includes(buildMode)) setBuildMode(SORTES().find((s) => blocsEnMain(state, s) > 0) || SORTES()[0]);
}

registerActions({
  'build-toggle': () => {
    onglet = null; bulle = null;
    if (buildMode) { poseMeuble = null; histoire = []; modeGomme = false; modeTourner = false; modePeindre = false; setBuildMode(null); refresh(); return; }
    if (!chantierOuvert()) return;
    if (asleep(state)) { notify(SOMMEIL_MESSAGE); return; }
    if (stageWindow) setStageWindow(null);    // (depuis le menu latéral : on revient sur la carte)
    setBuildLevel(etageVue);                  // (on construit d'abord là où l'on est)
    niveauListe = false;
    // (le dernier mur choisi, ou le premier bloc qu'on a encore)
    setBuildMode(choisi.murs && SORTES().includes(choisi.murs) && blocsEnMain(state, choisi.murs) > 0 ? choisi.murs : SORTES().find((s) => blocsEnMain(state, s) > 0) || SORTES()[0]);
    // (un rappel bref, à chaque ouverture : il ne cache pas longtemps la puce des blocs)
    notify(`${DATA.ATELIER.ICONE} Touche une case pour poser, un bloc pour le reprendre ; glisse pour poser toute une ligne.`, { duree: CONSEIL_MS });
    tel('creation', 'catalogue');   // (F0-7 : le catalogue ouvert)
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
  // (la carte dit où mène l'escalier touché : data-niveau ; sans lui, en bas ↔ l'étage)
  'etage-toggle': (target) => {
    if (asleep(state)) { notify(SOMMEIL_MESSAGE); return; }
    const d = target && target.dataset && target.dataset.niveau;
    const vers = d !== undefined ? Number(d) : etageVue ? 0 : 1;
    if (vers >= 1 && !etageEmprise(state).size) return;
    if (vers >= 2 && !etage2Emprise(state).size) return;
    setEtageVue(vers);
    // (en construisant : on construit là où l'on arrive)
    if (buildMode) { setBuildLevel(etageVue); blocDuNiveau(); }
    notify(etageVue === 2 ? '🪜 Au niveau 2 : touche le haut de l\'escalier pour redescendre.'
      : etageVue ? `🪜 À l'étage : touche l'escalier pour redescendre${etage2Emprise(state).size ? ', celui de l\'étage pour monter' : ''}.` : '🪜 En bas.', { duree: CONSEIL_MS });
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
    // (juste après un appui long, qui l'a mis en favori : pas de choix, A-2)
    if (sansChoix) { sansChoix = false; return; }
    poseMeuble = null;
    bulle = null;
    const g = groupeDe(s);
    if (g) choisi[g.id] = s;
    // (choisi dans l'onglet ⭐ : il reste ouvert)
    onglet = target.dataset.depuis === ETOILE ? ETOILE : categorieBloc(s) || onglet;
    noterRecent(s);
    setBuildMode(s);
    refresh();
  },
  // Un filtre sous les onglets (A-2) : « ce que j'ai » s'allume ou s'éteint ; une pièce, un style : choisi,
  // ou retiré s'il l'était.
  'build-filtre': (target) => {
    if (!buildMode) return;
    const f = target.dataset.filtre, v = target.dataset.valeur || null;
    if (f === 'possede') filtres.possede = !filtres.possede;
    else if (f === 'piece' || f === 'style') filtres[f] = filtres[f] === v ? null : v;
    bulle = null;
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
    // au niveau 1, un sol en main : le poser (un autre sol : le changer), ou reprendre le même
    const genre = niveau() ? genreCase(c) : null;
    if (genre === 'sol') {
      const n = niveau(), avant = solsEtage(state, n)[c];
      const r = avant === buildMode ? executer('solEtage.reprendre', { case: c, niveau: n }) : executer('solEtage.poser', { sorte: buildMode, case: c, niveau: n });
      if (!r.ok) { notify(r.error); return; }
      noter(r.inverses);
      persistState();
      refresh();
      return;
    }
    // à l'étage : poser, reprendre un bloc de l'étage
    if (genre === 'etage') {
      // (l'outil 🎨 allumé : un appui sur un meuble de l'étage le repeint de sa couleur suivante, A-3)
      if (modePeindre) { repeindre(c, true); return; }
      // (l'outil ↻ allumé : un appui sur un meuble de l'étage le tourne d'un quart de tour, A-1)
      if (modeTourner) {
        const t = executer('etage.tourner', { case: c });
        if (!t.ok) { notify(t.error); return; }
        noter(t.inverses);
        persistState();
        refresh();
        return;
      }
      // (un appui sur un meuble de l'étage, sur n'importe laquelle de ses cases, le reprend ; sur un mur où
      // pend un tableau, le tableau ; un tableau en main, sur un mur nu de l'étage : il s'y accroche)
      const e = etageBlocs(state)[c], bm = DATA.ATELIER.BLOCS[buildMode];
      const accroche = !!(bm && bm.sur === 'mur') && murEtage(state, c) && !dessusEtage(state)[c];
      const reprend = !accroche && (!!dessusEtage(state)[c] || (e && !changeMur(e, buildMode)) || etageCouvertes(state).has(c));
      // (un meuble en main, sur une case libre : son aperçu, pas encore posé)
      if (!reprend && meubleEnMain()) { poseMeuble = { sorte: buildMode, case: c }; refresh(); return; }
      const r = reprend ? executer('etage.reprendre', { case: c }) : executer('etage.poser', { sorte: buildMode, case: c });
      if (!r.ok) { notify(r.error); return; }
      noter(r.inverses);
      persistState();
      refresh();
      return;
    }
    // plus haut que le sol : rehausser un mur, reprendre son bloc du dessus
    const n = niveau();
    if (n) {
      const h = hauteurPile(state, c);
      let r;
      if (!h) r = { ok: false, error: `Niveau ${n} : touche un mur, une fenêtre ou une porte pour le rehausser (niveau 0 pour poser au sol).` };
      else if (h === n + 1) r = executer('mur.abaisser', { case: c });
      else if (h === n) r = executer('mur.rehausser', { sorte: matiereDessus(state, c) || buildMode, case: c });
      else if (h < n) r = { ok: false, error: `Ce mur n'a que ${h} bloc${h > 1 ? 's' : ''} : rehausse-le d'abord au niveau ${h}.` };
      else r = { ok: false, error: `Ce mur est plus haut : reprends son bloc du dessus au niveau ${h - 1}.` };
      if (!r.ok) { notify(r.error); return; }
      noter(r.inverses);
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
    // (l'outil 🎨 allumé : un appui sur un meuble posé le repeint de sa couleur suivante, A-3)
    if (modePeindre) { repeindre(c, false); return; }
    // (l'outil ↻ allumé : un appui sur un meuble posé le tourne d'un quart de tour)
    if (modeTourner) {
      const t = executer('bloc.tourner', { case: c });
      if (!t.ok) { notify(t.error); return; }
      noter(t.inverses);
      persistState();
      refresh();
      return;
    }
    // (un meuble en main, sur une case libre : son aperçu, pas encore posé)
    if (!reprend && meubleEnMain()) { poseMeuble = { sorte: buildMode, case: c }; refresh(); return; }
    const r = reprend ? executer('bloc.reprendre', { case: c }) : executer('bloc.poser', { sorte: buildMode, case: c, sens: sensDe(buildMode) });
    if (!r.ok) { notify(r.error); return; }
    // (pour Annuler : la reprise, la pose, ou le changement d'un mur, d'un sol ; pas le silo)
    noter(r.inverses);
    persistState();
    refresh();
  },
  // Annuler la dernière opération au sol : ses gestes défaits, du dernier au premier.
  'build-annuler': () => {
    if (!buildMode) return;
    if (asleep(state)) { notify(SOMMEIL_MESSAGE); return; }
    const gestes = histoire.pop();
    if (!gestes) { notify('Rien à annuler.'); return; }
    const n = defaireCommandes(gestes);
    if (n) persistState();
    refresh();
    notify(n ? `↶ Annulé${gestes.length > 1 ? ` : ${n} bloc${n > 1 ? 's' : ''}` : ''}${n < gestes.length ? ` (${gestes.length - n} n'ont pas pu l'être)` : ''}.` : 'Rien n\'a pu être annulé (ce qui a été posé a changé depuis).');
  },
  // La pipette (un appui maintenu sur un bloc posé, js/farm-stage.js) : ce bloc en main, son onglet
  // ouvert ; un meuble, il en faut un en main pour le reprendre (sinon le choisir n'aurait pas de sens).
  'bloc-pipette': (target) => {
    const s = pipetteSorte(Number(target.dataset.case));
    if (!s) return;
    poseMeuble = null;
    bulle = null;
    const g = groupeDe(s);
    if (g) choisi[g.id] = s;
    onglet = categorieBloc(s) || onglet;
    setBuildMode(s);
    const n = blocsEnMain(state, s);
    notify(`🎯 ${DATA.ATELIER.BLOCS[s].nom} en main${n ? ` · ${n}` : ' · plus aucun : un tracé proposera d\'en fabriquer'}.`, { duree: CONSEIL_MS });
    refresh();
  },
  // Déplacer (un glissement parti d'un meuble ou d'un bloc seul, js/farm-stage.js) : de sa case
  // d'ancrage `de` à `vers` ; s'il ne tient pas là, il reste où il était.
  'bloc-deplacer': (target) => {
    if (!buildMode) return;
    if (asleep(state)) { notify(SOMMEIL_MESSAGE); return; }
    const de = Number(target.dataset.de), vers = Number(target.dataset.vers);
    if (!Number.isInteger(de) || !Number.isInteger(vers) || de === vers) return;
    const r = executer(niveauBati() ? 'etage.deplacer' : 'bloc.deplacer', { de, vers });
    if (!r.ok) { notify(r.error); refresh(); return; }
    noter(r.inverses);
    persistState();
    refresh();
    notify(`✋ Déplacé : ${DATA.ATELIER.BLOCS[r.sorte].nom.toLowerCase()}.`, { duree: CONSEIL_MS });
  },
  // La gomme : allumée, un glissement reprend les blocs de la sorte en main au lieu d'en poser.
  'build-gomme': () => {
    if (!buildMode) return;
    modeGomme = !modeGomme;
    if (modeGomme) { modeTourner = false; modePeindre = false; }
    if (modeGomme) notify('🧽 Gomme : glisse sur des blocs de cette sorte pour les reprendre (ils reviennent dans l\'inventaire).', { duree: CONSEIL_MS * 2 });
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
    // la gomme : les blocs de cette famille repris, case par case
    if (target.dataset.gomme === '1') {
      const gestes = [];
      let raison = '', repris = 0;
      for (const c of cases) {
        if (tracePosable(c) !== 'fait') continue;
        const r = reprendreIci(c);
        if (r.ok) { repris += 1; gestes.push(...r.inverses); }
        else raison = raison || r.error;
      }
      noter(gestes);
      if (repris) persistState();
      refresh();
      if (repris) notify(`🧽 ${repris} bloc${repris > 1 ? 's' : ''} repris${raison ? ` · ${raison}` : ''}`);
      else if (raison) notify(raison);
      return;
    }
    // (dans l'ordre du tracé ; quand la main est vide, les cases qui restent attendent leurs blocs)
    let n = 0, raison = '', i = 0;
    const gestes = [];
    for (; i < cases.length && blocsEnMain(state, sorte); i++) {
      const r = poserIci(sorte, cases[i]);
      if (r.ok) { n += 1; gestes.push(...r.inverses); }
      else raison = raison || r.error;
    }
    noter(gestes);
    const restants = cases.slice(i);
    if (n) persistState();
    refresh();
    const reste = blocsEnMain(state, sorte);
    if (n) notify(`${DATA.ATELIER.ICONE} ${n} × ${nom} posé${n > 1 ? 's' : ''}${restants.length ? ` · il en manque ${restants.length}` : reste ? ` · encore ${reste} en main` : ' · plus rien en main'}${raison ? ` · ${raison}` : ''}`);
    else if (raison && !restants.length) notify(raison);
    // (il en manque : les fabriquer sur place, si l'Atelier sait les faire)
    if (restants.length) proposerFabrication(sorte, restants);
  },
  // La fenêtre « Fabriquer et poser » : la recette autant de fois que prévu, puis la pose des cases
  // qui attendaient, dans l'ordre du tracé.
  'bloc-fabriquer': () => {
    const a = enAttente;
    enAttente = null;
    closeModal();
    if (!a) return;
    if (asleep(state)) { notify(SOMMEIL_MESSAGE); return; }
    let faits = 0, raison = '';
    for (let k = 0; k < a.fois; k++) {
      const r = executer('atelier.fabriquer', { recette: a.id });
      if (!r.ok) { raison = r.error; break; }
      faits += 1;
    }
    const nom = DATA.ATELIER.BLOCS[a.sorte].nom.toLowerCase();
    let n = 0;
    const gestes = [];
    for (const c of a.cases) {
      if (!blocsEnMain(state, a.sorte)) break;
      const r = poserIci(a.sorte, c);
      if (r.ok) { n += 1; gestes.push(...r.inverses); }
    }
    // (Annuler reprend ces blocs : ils reviennent dans l'inventaire, la fabrication reste faite)
    noter(gestes);
    if (faits || n) persistState();
    refresh();
    const manque = a.cases.length - n;
    if (n) notify(`${DATA.ATELIER.ICONE} ${n} × ${nom} fabriqué${n > 1 ? 's' : ''} et posé${n > 1 ? 's' : ''}${manque ? ` · il en manque encore ${manque}` : ''}${raison ? ` · ${raison}` : ''}`);
    else notify(raison || `Rien n'a pu être posé.`);
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
    const v = varianteDe(poseMeuble.sorte), teinte = v ? { variante: v } : {};
    const r = niveauBati() ? executer('etage.poser', { sorte: poseMeuble.sorte, case: poseMeuble.case, sens: sensDe(poseMeuble.sorte), ...teinte }) : executer('bloc.poser', { sorte: poseMeuble.sorte, case: poseMeuble.case, sens: sensDe(poseMeuble.sorte), ...teinte });
    if (!r.ok) { notify(r.error); return; }
    noter(r.inverses);
    poseMeuble = null;
    if (!blocsEnMain(state, buildMode)) quitteMeuble();     // (plus de ce meuble : on en sort)
    persistState();
    refresh();
  },
  // ↻ dans la pose d'un meuble : l'aperçu tourne d'un quart de tour (le meuble se posera dans ce sens).
  'meuble-tourner': () => {
    if (!meubleEnMain()) return;
    sensPose = quartDeTour(sensPose);
    refresh();
  },
  // L'outil ↻ de la barre : allumé, un appui sur un meuble posé le tourne.
  'build-tourner': () => {
    if (!buildMode) return;
    modeTourner = !modeTourner;
    if (modeTourner) { modeGomme = false; modePeindre = false; notify('↻ Touche un meuble posé pour le tourner d\'un quart de tour, en bas comme à l\'étage. Les tableaux, accrochés au mur, le suivent.', { duree: CONSEIL_MS * 2 }); }
    refresh();
  },
  // L'outil 🎨 de la barre (A-3) : allumé, un appui sur un meuble posé le repeint.
  'build-peindre': () => {
    if (!buildMode) return;
    modePeindre = !modePeindre;
    if (modePeindre) { modeGomme = false; modeTourner = false; notify('🎨 Touche un meuble posé pour changer sa couleur (chaise, table, canapé, lit, commode). C\'est gratuit.', { duree: CONSEIL_MS * 2 }); }
    refresh();
  },
  // 🎨 dans la pose d'un meuble : sa couleur suivante (l'aperçu la montre ; il se posera ainsi).
  'meuble-peindre': () => {
    if (!meubleEnMain() || !variantesBloc(buildMode).length) return;
    variantePose[buildMode] = varianteSuivante(buildMode, varianteDe(buildMode));
    notify(`🎨 ${DATA.ATELIER.BLOCS[buildMode].nom} : ${nomVariante(buildMode, varianteDe(buildMode))}`, { duree: CONSEIL_MS });
    refresh();
  },
  // La flèche à côté (un meuble qui tourne en main, posé d'un appui : le mobilier de jardin) : le sens du
  // prochain posé, d'un quart de tour.
  'build-sens': () => {
    if (!buildMode) return;
    sensPose = quartDeTour(sensPose);
    refresh();
  },
  'meuble-annule': () => {
    quitteMeuble();
    refresh();
  },
});
