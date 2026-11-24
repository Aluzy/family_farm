import { DATA } from '../engine/catalog.js';
import { asleep } from '../engine/night.js';
import { SOMMEIL_MESSAGE } from './actions.js';
import { castLine, chopTree, hasTool, mineRock, OUTILS, piocheDef, ramasserCaillou, ramasserMorceau, scytheAround, scytheGrass, selectTool, toolDef } from '../engine/outils.js';
import { recolterMonde } from '../engine/monde-recolte.js';
import { canAfford, TIRED } from '../engine/stamina.js';
import { axeMode, enLigne, hoeMode, pickMode, rodMode, scytheMode, setAxeMode, setHoeMode, setPickMode, setRodMode, setScytheMode, state } from './store.js';
import { executer } from './commandes.js';
import { itemsText } from './common.js';
import { applyResult } from './game-actions.js';
import { refresh } from './render.js';
import { notify } from './toasts.js';
import { ACTIONS, registerActions } from './actions.js';
import { persistState } from './storage.js';
import { closeStageWindow, stageInterior, stageWindow } from './stage-windows.js';
import { buildSlotHtml } from './chantier.js';
import { crucheContenu } from './cruche.js';
import { jaugeCruche } from '../engine/cruche.js';
import { buildMode, crucheMode, setBuildMode, setCrucheMode } from './store.js';
import { chevalMonte, chevalOu, chevalPossede, toggleCheval } from '../engine/cheval.js';
import { ouvrirFicheCheval, rangeeGalopHtml } from './galop.js';

/* ---------- la roue des outils, en bas à droite de la carte ---------- */

// Un rond, dans le coin en bas à droite, montre ce qu'on a en main : l'outil, la cruche, ou la main
// (rien). Deux appuis rapides sur lui l'ouvrent : il monte un peu en diagonale et devient une roue,
// les choix posés en cercle autour de lui (la main, les outils fabriqués, la cruche, le cheval,
// Construire : seulement ce qu'on a). Un appui sur un choix le prend et la roue se referme ; un appui
// sur le rond, la roue ouverte, la referme sans rien changer. La cruche n'a pas besoin d'être prise
// pour arroser : les gestes qui s'en servent (arroser en glissant, aller au puits) la mettent au
// centre (js/ui/cruche.js). Le cheval : monter en selle ou en descendre, le centre ne change pas.
export let roueOuverte = false;
const ROUE_RAYON = 118;        // (px : la distance du centre de la roue au centre d'une case)
const DOUBLE_APPUI_MS = 400;   // (deux appuis sur le rond, à moins de 400 ms l'un de l'autre : l'ouvrir)
let dernierAppui = 0;

// L'outil en main (la houe, la hache, la pioche, la faux ou la canne), ou null.
function enMain() {
  if (hoeMode) return 'houe';
  if (axeMode) return 'hache';
  if (pickMode) return 'pioche';
  if (scytheMode) return 'faux';
  if (rodMode) return 'canne';
  return null;
}

// Ce que montre le centre de la roue : un outil, 'bati' (Construire), 'cruche' ou 'main'.
function auCentre() {
  if (buildMode) return 'bati';
  return enMain() || (crucheMode && jaugeCruche(state) ? 'cruche' : 'main');
}

// Les choix de la roue, dans l'ordre (la main en haut, puis dans le sens des aiguilles d'une montre) :
// { id, nom, html (l'icône), action (le data-action de sa case), attrs, on (allumé) }.
function choixRoue() {
  const centre = auCentre();
  const l = [{ id: 'main', nom: 'Main', html: '✋', action: 'roue-main', on: centre === 'main' }];
  for (const id of OUTILS) {
    if (!hasTool(state, id)) continue;
    const def = toolDef(id);
    // (la pioche : l'icône de son métal, son nom, le lot 5 : DATA.PIOCHE.NIVEAUX)
    const pd = id === 'pioche' ? piocheDef(state) : null;
    const tenu = id === centre;
    l.push({ id, nom: pd ? `${def.NOM} en ${pd.nom}` : def.NOM, html: pd ? pd.icone : def.ICONE, action: tenu ? 'roue-fermer' : 'tool-use', attrs: ` data-outil="${id}"`, on: tenu });
  }
  const cr = crucheContenu();
  if (cr) l.push({ id: 'cruche', nom: cr.label, html: cr.html, action: 'roue-cruche', classe: ` cruche-slot${cr.vide ? ' vide-eau' : ''}`, on: centre === 'cruche' });
  if (chevalPossede(state)) {
    const C = DATA.CHEVAL, monte = chevalMonte(state);
    l.push({ id: 'cheval', nom: monte ? `${C.NOM} : en descendre` : `${C.NOM} : monter en selle`, html: C.ICONE, action: 'cheval-toggle', on: monte });
  }
  if (buildSlotHtml()) l.push({ id: 'bati', nom: 'Construire', html: DATA.ATELIER.ICONE, action: 'build-toggle', on: centre === 'bati' });
  return l;
}

// La roue des outils de la carte, ou '' : sur la carte de la ferme, sans fenêtre ouverte, dès qu'on a
// autre chose que ses mains (un outil, la cruche, le cheval, Construire).
export function toolBarHtml() {
  const l = choixRoue();
  if (l.length < 2) return '';
  const centre = auCentre();
  const c = l.find((x) => x.id === centre) || l[0];
  const n = l.length;
  const cases = l.map((x, i) => {
    const a = -Math.PI / 2 + (i * 2 * Math.PI) / n;
    const dx = Math.round(Math.cos(a) * ROUE_RAYON), dy = Math.round(Math.sin(a) * ROUE_RAYON);
    return `<button type="button" class="tool-slot roue-case${x.classe || ''}${x.on ? ' active' : ''}" data-action="${x.action}" data-choix="${x.id}"${x.attrs || ''} style="--dx:${dx}px;--dy:${dy}px" aria-pressed="${x.on}" aria-label="${x.nom}" title="${x.nom}"${roueOuverte ? '' : ' tabindex="-1"'}>${x.html}<span class="roue-nom" aria-hidden="true">${x.nom.split(' : ')[0]}</span></button>`;
  }).join('');
  const label = `En main : ${c.nom.split(' : ')[0]}. ${roueOuverte ? 'Refermer la roue des outils' : 'Deux appuis pour changer d\'outil'}`;
  const hub = `<button type="button" class="tool-slot roue-centre${c.classe || ''}" data-action="roue-centre" data-outil="${c.id}" aria-expanded="${roueOuverte}" aria-label="${label}" title="${label}">${c.html}</button>`;
  // (en selle, avec la sacoche : ses pommes, au-dessus du rond ; js/ui/galop.js)
  return rangeeGalopHtml() + `<div class="roue" role="group" aria-label="Roue des outils"><div class="roue-cases"${roueOuverte ? '' : ' inert'}>${cases}</div>${hub}</div>`;
}

// Une case de la roue touchée : la roue se referme (avant son action, qui redessine ; après elle
// aussi, au cas où l'action ne redessine pas : un refus).
document.addEventListener('click', (e) => {
  if (!roueOuverte || !e.target.closest || !e.target.closest('.roue-case')) return;
  roueOuverte = false;
  setTimeout(refresh, 0);
}, true);

// Monter en selle ou descendre du cheval (un appui sur sa case). Sur la ferme seulement pour
// l'instant : le poteau d'attache servira dans le grand monde (docs/grand-monde.md).
function useCheval() {
  if (asleep(state)) { notify(SOMMEIL_MESSAGE); return; }
  const C = DATA.CHEVAL;
  const lieu = { carte: 'ferme' }, avant = chevalOu(state);
  const r = applyResult(toggleCheval(state, lieu));
  if (!r.ok) return;
  persistState();
  // En selle : la fiche du cheval s'ouvre (sa sacoche, ses pommes : js/ui/galop.js).
  if (r.monte) ouvrirFicheCheval();
  if (r.monte) notify(`${C.ICONE} En selle : tu vas ${String(state.cheval.nourri === false ? C.VITESSE_FAIM : C.VITESSE).replace('.', ',')} fois plus vite sur les cartes${state.cheval.nourri === false ? ' (il n\'a pas mangé sa paille cette nuit)' : ''}.`);
  else if (r.attache) notify(`${C.ICONE} Tu l'attaches à son poteau : il t'attend ici. Touche-le pour remonter.`);
  else if (avant === 'monte') notify(`${C.ICONE} Tu descends de cheval : il rentre à l'Écurie.`);
}

function useTool(id) {
  if (!hasTool(state, id)) return;
  if (enMain() === id) {                     // l'outil en main : le ranger
    if (id === 'houe') ACTIONS['hoe-toggle']();
    else { setAxeMode(false); setPickMode(false); setRodMode(false); setScytheMode(false); refresh(); }
    return;
  }
  if (id === 'houe' || id === 'hache' || id === 'pioche' || id === 'faux' || id === 'canne') {
    if (asleep(state)) { notify(SOMMEIL_MESSAGE); return; }
  }
  setBuildMode(null);
  // (E-9 : en ligne, l'outil en main est celui de ce joueur seulement : rien n'est écrit dans la partie du monde)
  if (!enLigne) applyResult(selectTool(state, id));
  if (id !== 'houe' && hoeMode) setHoeMode(false);
  if (id !== 'hache' && axeMode) setAxeMode(false);
  if (id !== 'pioche' && pickMode) setPickMode(false);
  if (id !== 'canne' && rodMode) setRodMode(false);
  if (id !== 'faux' && scytheMode) setScytheMode(false);
  if (id === 'houe') {
    ACTIONS['hoe-toggle']();
    return;
  }
  if (id === 'hache') {
    setAxeMode(true);
    if (stageWindow) closeStageWindow();
    else refresh();
    return;
  }
  if (id === 'pioche') {
    setPickMode(true);
    if (stageWindow) closeStageWindow();
    else refresh();
    return;
  }
  if (id === 'faux') {
    setScytheMode(true);
    if (stageWindow) closeStageWindow();
    else refresh();
    return;
  }
  setRodMode(true);
  if (stageWindow) closeStageWindow();
  else refresh();
}

const DATA_ICONE = (id) => toolDef(id).ICONE;

// La puce « Hache en main » de la carte : la toucher range la hache.
export function axeChipHtml() {
  if (!axeMode || !hasTool(state, 'hache') || stageInterior) return '';
  return `<button type="button" class="stage-chip hoe axe" data-action="axe-toggle" aria-pressed="true" aria-label="Hache en main : touche un arbre ou un buisson pour le couper. Ranger la hache" title="Touche un arbre ou un buisson de la carte pour le couper"><span class="stage-chip-pill"><span aria-hidden="true">${DATA_ICONE('hache')}</span><span class="stage-chip-text">Hache</span><span class="stage-chip-val num">🪵</span><span class="stage-chip-go" aria-hidden="true">✕</span></span></button>`;
}

// La puce « Pioche en main » de la carte : la toucher range la pioche.
export function pickChipHtml() {
  if (!pickMode || !hasTool(state, 'pioche') || stageInterior) return '';
  return `<button type="button" class="stage-chip hoe axe" data-action="pick-toggle" aria-pressed="true" aria-label="Pioche en main : touche un rocher pour le casser. Ranger la pioche" title="Touche un rocher de la carte pour le casser"><span class="stage-chip-pill"><span aria-hidden="true">${DATA_ICONE('pioche')}</span><span class="stage-chip-text">Pioche</span><span class="stage-chip-val num">🪨</span><span class="stage-chip-go" aria-hidden="true">✕</span></span></button>`;
}

// La puce « Faux en main » de la carte : la toucher range la faux.
export function scytheChipHtml() {
  if (!scytheMode || !hasTool(state, 'faux') || stageInterior) return '';
  return `<button type="button" class="stage-chip hoe axe" data-action="scythe-toggle" aria-pressed="true" aria-label="Faux en main : touche une touffe d'herbe haute pour la faucher. Ranger la faux" title="Touche une touffe d'herbe haute de la carte pour la faucher"><span class="stage-chip-pill"><span aria-hidden="true">${DATA_ICONE('faux')}</span><span class="stage-chip-text">Faux</span><span class="stage-chip-val num">${DATA.OBJETS.fibre.icone}</span><span class="stage-chip-go" aria-hidden="true">✕</span></span></button>`;
}

// La puce « Canne à pêche en main » de la carte : la toucher range la canne.
export function rodChipHtml() {
  if (!rodMode || !hasTool(state, 'canne') || stageInterior) return '';
  return `<button type="button" class="stage-chip hoe axe" data-action="rod-toggle" aria-pressed="true" aria-label="Canne à pêche en main : touche l'eau pour pêcher. Ranger la canne" title="Touche l'eau de l'étang ou de la mare pour y pêcher"><span class="stage-chip-pill"><span aria-hidden="true">${DATA_ICONE('canne')}</span><span class="stage-chip-text">Pêche</span><span class="stage-chip-val num">🐟‍🌈</span><span class="stage-chip-go" aria-hidden="true">✕</span></span></button>`;
}

// La carte (js/carte/ferme/file.js) : le joueur demande un geste (un coup de hache, de faux…),
// le `n`-ième en attente qui coûte l'énergie de `action` (null : un geste qui n'en coûte pas).
// Le jeu ne le joue qu'à l'arrivée du personnage ; ici, on dit tout de suite s'il pourra avoir
// lieu (il dort, plus assez d'énergie pour celui-ci et ceux qui attendent : un message, false).
export function gesteFromStage(action, n = 1) {
  if (asleep(state)) { notify(SOMMEIL_MESSAGE); return false; }
  if (action && !canAfford(state, action, n)) { notify(TIRED); return false; }
  return true;
}

// E-9 : en ligne, le monde ne ramasse pas : ce qu'un coup lâche va droit au coffre commun (pas de morceaux
// au sol), et le jeu le dit, coup après coup, dans une seule notification. `gains` : { objet: (résultat) => n }.
function enLigneGain(r, gains) {
  if (!r || !r.ok) return r;
  const q = {};
  for (const [item, f] of Object.entries(gains)) { const n = Number(f(r)) || 0; if (n > 0) q[item] = n; }
  if (Object.keys(q).length) notify(null, { cumul: { cle: 'outil-en-ligne', quantites: q, texte: (t) => `🌐 Au coffre commun : ${itemsText(t, 'gain')}` } });
  return r;
}

// La carte (farm-stage.js, ou une autre : FermeHote.couper) : la hache en main, le joueur a
// touché l'arbre `id`. Le coup compte tout de suite ; son bois tombe au sol, aux points que la
// carte donne (`ou` : { carte, coup, fin }, voir chopTree) ; la carte montre ensuite le
// personnage qui coupe, et les morceaux. Renvoie { bois, tombe, morceaux: { coup, fin } } (tombe :
// ce coup abat l'arbre), ou null (il dort, sans énergie : un message). `fort` : le coup fort
// (appui maintenu sur le personnage, COUP_FORT).
export function chopFromStage(id, ou, fort) {
  if (asleep(state)) { notify(SOMMEIL_MESSAGE); return null; }
  const r = enLigne ? enLigneGain(executer('outil.couper', { arbre: String(id), fort: !!fort }), { bois: (x) => x.bois + (x.tombe ? DATA.HACHE.CHUTE : 0) }) : chopTree(state, id, ou, !!fort);
  if (!r.ok) { notify(r.error); return null; }
  persistState();
  refresh();
  return { bois: r.bois, tombe: r.tombe, morceaux: r.morceaux };
}

// La carte : la pioche en main, le joueur a touché le rocher `id`. Comme chopFromStage : la
// pierre tombe au sol. Renvoie { casse, morceaux } (casse : ce coup brise le rocher), ou null.
export function mineFromStage(id, ou, fort) {
  if (asleep(state)) { notify(SOMMEIL_MESSAGE); return null; }
  const r = enLigne ? enLigneGain(executer('outil.casser', { rocher: String(id), fort: !!fort }), { pierre: (x) => x.pierre + (x.bris || 0) }) : mineRock(state, id, ou, !!fort);
  if (!r.ok) { notify(r.error); return null; }
  persistState();
  refresh();
  // (un gisement brisé : son minerai aussi, docs/gisements.md)
  return { items: { pierre: r.pierre, ...(r.minerai || {}) }, casse: r.casse, morceaux: r.morceaux };
}

// La carte : le joueur a touché un caillou (un rocher d'une seule tuile) : il le ramasse à la
// main, sa pierre va dans l'inventaire. Renvoie { items }, ou null (un message).
export function caillouFromStage(id) {
  if (asleep(state)) { notify(SOMMEIL_MESSAGE); return null; }
  const r = enLigne ? executer('outil.caillou', { rocher: String(id) }) : ramasserCaillou(state, id);
  if (!r.ok) { notify(r.error); return null; }
  persistState();
  refresh();
  return { items: r.items };
}

// La carte : la faux en main, le joueur a touché la touffe `id` (« x,y » de son pied). Comme
// chopFromStage : la fibre tombe au sol. Renvoie { morceaux }, ou null.
export function scytheFromStage(id, ou) {
  if (asleep(state)) { notify(SOMMEIL_MESSAGE); return null; }
  const r = enLigne ? enLigneGain(executer('outil.faucher', { touffe: String(id) }), { fibre: (x) => x.fibre }) : scytheGrass(state, id, ou);
  if (!r.ok) { notify(r.error); return null; }
  persistState();
  refresh();
  return { items: { fibre: r.fibre }, morceaux: r.morceaux };
}

// La carte : le coup fort de la faux, il tournoie et fauche les touffes `ids` autour de lui
// (`ou` : { carte, points: { id: [points] } }). Renvoie { fauchees, morceaux }, ou null.
export function scytheAroundFromStage(ids, ou) {
  if (asleep(state)) { notify(SOMMEIL_MESSAGE); return null; }
  const r = enLigne ? enLigneGain(executer('outil.faucherAutour', { touffes: (ids || []).map(String) }), { fibre: (x) => x.fibre }) : scytheAround(state, ids, ou);
  if (!r.ok) { notify(r.error); return null; }
  persistState();
  refresh();
  return { fauchees: r.fauchees, morceaux: r.morceaux };
}

// La carte (js/carte/ferme/recolte-monde.js) : le joueur a touché la pièce `id` du grand monde
// (« sorte:x,y ») : le geste qui lui convient (couper, casser, faucher, cueillir, ramasser :
// recolterMonde). `o` : { ou, fort, variante, depuis } (où tombe ce qu'elle lâche, le coup fort,
// son dessin, la case du personnage). Renvoie ce que le moteur a répondu (items, morceaux, tombe,
// casse…), ou null (il dort, sans outil, sans énergie, trop loin : un message).
export function mondeFromStage(id, o) {
  if (asleep(state)) { notify(SOMMEIL_MESSAGE); return null; }
  const r = enLigne ? mondeEnLigne(id, o || {}) : recolterMonde(state, id, o || {});
  if (!r.ok) { notify(r.error); return null; }
  persistState();
  refresh();
  return r;
}

// I9b : en ligne, sur une île partagée, le geste passe par le monde (la commande monde.recolter : la pièce, son
// geste, le coup fort, son dessin, la case du personnage) ; ce qu'elle lâche va au coffre commun, pas au sol.
function mondeEnLigne(id, o) {
  const args = { piece: String(id) };
  if (o.geste) args.geste = String(o.geste);
  if (o.fort) args.fort = true;
  if (Number.isInteger(o.variante) && o.variante >= 0) args.variante = o.variante;
  if (Number.isInteger(o.depuis) && o.depuis >= 0) args.depuis = o.depuis;
  const r = executer('monde.recolter', args);
  if (!r.ok || !r.items) return r;
  return enLigneGain(r, Object.fromEntries(Object.keys(r.items).map((item) => [item, (x) => x.items[item]])));
}

// La carte : le personnage a marché sur le morceau `n` (bois, pierre) : dans l'inventaire.
// Renvoie { ok, item, n } ou null (il dort, ou le morceau n'est plus là).
export function morceauFromStage(n) {
  if (asleep(state)) return null;
  const r = enLigne ? executer('morceau.ramasser', { n: Number(n) }) : ramasserMorceau(state, n);   // (E-13 : en ligne, par le monde)
  if (!r.ok) return null;
  persistState();
  refresh();
  return r;
}

// La carte : la canne en main, le joueur a touché l'eau `eau` (« etang » ou « mare » sur la
// ferme ; « lac », « riviere » ou « mer » dans le grand monde), depuis le coin de pêche `coin`
// (« peche_<n> », s'il pêche près de l'un d'eux). La prise (s'il y en a une) entre dans
// l'inventaire tout de suite ; la carte montre ensuite le personnage qui lance, attend la touche
// et ferre. Renvoie { poisson, coin } (poisson null : rien n'a mordu), ou null (un message : il
// dort, sans énergie, le poisson se fait rare).
export function fishFromStage(eau, coin = null) {
  if (asleep(state)) { notify(SOMMEIL_MESSAGE); return null; }
  const r = enLigne ? executer('outil.pecher', { eau: String(eau), ...(coin ? { coin: String(coin) } : {}) }) : castLine(state, eau, coin);
  if (!r.ok) { notify(r.error); return null; }
  persistState();
  refresh();
  return { poisson: r.poisson, coin: r.coin };
}

/* ---------- actions de cet écran (voir ui/actions.js) ---------- */

registerActions({
  'tool-use': (target) => {
    useTool(target.dataset.outil);
  },
  'cheval-toggle': () => {
    useCheval();
  },
  // Le rond de la roue des outils : deux appuis rapides l'ouvrent ; ouverte, un appui la referme.
  'roue-centre': () => {
    const t = Date.now();
    if (roueOuverte) { roueOuverte = false; dernierAppui = 0; refresh(); return; }
    if (t - dernierAppui > DOUBLE_APPUI_MS) { dernierAppui = t; return; }
    dernierAppui = 0;
    roueOuverte = true;
    refresh();
  },
  // La case de ce qu'on a déjà en main : la roue se referme, rien ne change.
  'roue-fermer': () => {
    refresh();
  },
  // La main : ranger l'outil (et la cruche).
  'roue-main': () => {
    if (hoeMode) ACTIONS['hoe-toggle']();
    setAxeMode(false); setPickMode(false); setRodMode(false); setScytheMode(false); setCrucheMode(false);
    refresh();
  },
  // La cruche au centre (l'outil en main est rangé).
  'roue-cruche': () => {
    if (hoeMode) ACTIONS['hoe-toggle']();
    setCrucheMode(true);
    refresh();
  },
  'axe-toggle': () => {
    setAxeMode(false);
    refresh();
  },
  'pick-toggle': () => {
    setPickMode(false);
    refresh();
  },
  'scythe-toggle': () => {
    setScytheMode(false);
    refresh();
  },
  'rod-toggle': () => {
    setRodMode(false);
    refresh();
  },
});
