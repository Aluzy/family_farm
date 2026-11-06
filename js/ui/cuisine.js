import { DATA, recipeOutput, recipeOutputQty } from '../engine/catalog.js';
import { EPS } from '../engine/base.js';
import { isBroken, maintainCost, repairCost } from '../engine/devices.js';
import { deviceStatus } from '../engine/energy.js';
import { countItem, penalite, shelfLife } from '../engine/inventory.js';
import { energyChip } from './energie.js';
import { wheatTotal } from '../engine/animals.js';
import { etatMoulin } from '../engine/blocs.js';
import {
  millPending, millTimeLeft, queueCapacity, recipeStatus, taskTimeLeft,
} from '../engine/kitchen.js';
import { recipeTime } from '../engine/techtree.js';
import { isUnlocked } from '../engine/campaign.js';
import { dishHappiness } from '../engine/bonheur.js';
import {
  formatCoins, formatDuration, formatNumber, formatQty,
} from '../engine/format.js';
import { state } from './store.js';
import { applyResult } from './game-actions.js';
import { executer } from './commandes.js';
import { syncJobs } from './loop.js';
import { refresh } from './render.js';
import { switchHtml, wearHtml } from './ferme.js';
import { nightsLabel } from './inventaire.js';
import { artIcon } from './animations.js';
import { helpBtn } from './aide.js';
import { notify } from './toasts.js';
import { registerActions } from './actions.js';
import { accord, canPay, costLabel, plural } from './common.js';

/* ---------- Lot 5 : ateliers (Ferme) et Livre de recette ---------- */

// Recettes d'une station, dans l'ordre de DATA.RECETTES.
export function stationRecipes(id) {
  return Object.keys(DATA.RECETTES).filter((r) => DATA.RECETTES[r].station === id);
}

// Ateliers dont les préparations se lancent depuis le Livre de recette : tous,
// sauf le Moulin, qui a son propre menu (voir renderMoulin()).
export function bookStations() {
  return Object.keys(DATA.STATIONS).filter((id) => !stationRecipes(id).every((r) => DATA.RECETTES[r].horsLivre));
}

// Ce que rend le Moulin pour un blé : « 1 🥣 farine » (et son sous-produit s'il en a un ; la
// paille n'en est plus un depuis la version 1.23 : elle se fauche).
export function millOutputText() {
  const r = DATA.RECETTES.farine;
  const out = DATA.OBJETS[r.sortie];
  const extra = r.sousProduit ? DATA.OBJETS[r.sousProduit.item] : null;
  return `${formatQty(r.qteSortie)} ${out.icone} ${out.nom.toLowerCase()}${extra ? ` + ${formatQty(r.sousProduit.qte)} ${extra.icone} ${extra.nom.toLowerCase()}` : ''}`;
}

function stationBlurb(id) {
  const def = DATA.STATIONS[id];
  const names = stationRecipes(id).map((r) => DATA.RECETTES[r].nom.toLowerCase()).join(', ');
  const power = def.electrique
    ? ` Appareil électrique : il consomme du courant en marche, avec interrupteur${penalite('USURE') ? ', usure et pannes' : ''}.`
    : ' Pas d\'électricité.';
  if (id === 'moulin') return `Moud le blé : 1 blé donne ${millOutputText()}. Le blé se moud ici même, dans le Moulin.${power}`;
  return `${names.charAt(0).toUpperCase()}${names.slice(1)}.${power}${id === 'four' ? ' Le construire ouvre l\'onglet Livre de recette.' : ''}`;
}

// Le bloc de l'Atelier qui fait la station `id` (la cuisinière, le four), ou null (la Presse s'achète).
function blocDeStation(id) {
  return Object.values(DATA.ATELIER.BLOCS).find((b) => b.station === id) || null;
}

function stationBuildCard(id) {
  const def = DATA.STATIONS[id];
  const bloc = blocDeStation(id);
  if (bloc) {
    // (pas d'achat : elle se fabrique à l'Atelier, puis se pose dans une pièce close)
    const o = DATA.OBJETS[bloc.objet];
    const r = DATA.ATELIER.RECETTES[bloc.objet];
    const besoin = r ? Object.entries(r.entrees).map(([item, n]) => `<span class="chip">${n} ${DATA.OBJETS[item].icone}</span>`).join('') : '';
    const enStock = countItem(state, bloc.objet);
    const f = def.article === 'la';   // (la cuisinière ; le four de pierre)
    const ou = `dans une pièce close (menu ${DATA.ATELIER.ICONE} Construire)`;
    const texte = enStock
      ? `${o.icone} ${f ? 'Ta' : 'Ton'} ${o.nom.toLowerCase()} est prêt${f ? 'e' : ''} : pose-${f ? 'la' : 'le'} ${ou}.`
      : `${o.icone} ${f ? 'La' : 'Le'} ${o.nom.toLowerCase()} se fabrique à l'Atelier, puis se pose ${ou} :`;
    return `
    <div class="card station">
      <span class="card-title"><span>${artIcon(id)}${def.nom}</span><span class="chips"><span class="chip">Non construit</span>${helpBtn(id)}</span></span>
      <span class="muted">${stationBlurb(id)}</span>
      <span class="muted">${texte}</span>
      ${besoin && !enStock ? `<span class="chips">${besoin}</span>` : ''}
    </div>`;
  }
  const need = def.requiert ? DATA.STATIONS[def.requiert] : null;
  const blocked = need && !state.stations[def.requiert].construit;
  return `
    <div class="card station">
      <span class="card-title"><span>${artIcon(id)}${def.nom}</span><span class="chips"><span class="chip">Non construit</span>${helpBtn(id)}</span></span>
      <span class="muted">${stationBlurb(id)}</span>
      ${blocked ? `<span class="alert">Construis d'abord ${need.article} ${need.nom}.</span>` : ''}
      <button type="button" class="btn primary" data-action="build-station" data-station="${id}"${!blocked && canPay(def.prixConstruction) ? '' : ' disabled'}>${id === 'moulin' ? 'Réparer' : 'Construire'} ${def.article} ${def.nom} (${costLabel(def.prixConstruction)})</button>
    </div>`;
}

// Les ateliers du Livre de recette : Four, Cuisine et Presse. Le Moulin n'en
// fait plus partie : il a son propre menu (renderMoulin()).
export function renderAteliers() {
  const ids = bookStations().filter((id) => isUnlocked(state, id));
  if (!ids.length) return '';
  const cards = ids.map((id) => {
    const def = DATA.STATIONS[id];
    if (!state.stations[id].construit) return stationBuildCard(id);
    const where = state.unlockedTabs.includes('recettes')
      ? 'Se lance depuis l\'onglet Livre de recette.'
      : 'Se lancera depuis le Livre de recette, que le Four ouvre.';
    return `
      <div class="card station">
        <span class="card-title"><span>${artIcon(id)}${def.nom}</span><span class="chips"><span class="chip">✅ Construit</span>${helpBtn(id)}</span></span>
        <span class="muted">${where}</span>
      </div>`;
  });
  return `
    <h3 class="section-title">🍞 Ateliers</h3>
    <div class="cards">${cards.join('')}</div>`;
}

/* ---------- version 1.1 : le menu du Moulin ---------- */

// Corps du menu du Moulin : pas encore construit, son bouton de construction ;
// construit, le blé disponible (inventaire et Silo), « Moudre » par lot (×1, ×5, ×10), la
// farine en stock (version 1.23 : la paille se fauche, elle n'est plus ici), puis l'état de l'appareil (énergie, usure, interrupteur).
// Les règles (ce que donne un blé, la nuit, le Silo) sont dans « ? ».
export function renderMoulin() {
  if (!isUnlocked(state, 'moulin')) return '';
  const def = DATA.STATIONS.moulin;
  const st = state.stations.moulin;
  // (version 1.25) : le Moulin est une tour bâtie en blocs (etatMoulin)
  if (!st.construit) {
    const e = etatMoulin(state);
    const lignes = e.conditions.map((c) => `<li class="${c.ok ? 'ok' : 'missing'}"><span aria-hidden="true">${c.ok ? '✅' : '❌'}</span> <span>${c.texte}</span></li>`).join('');
    return `
    <div class="section-head"><h3>${artIcon('moulin')}${def.nom}</h3>${helpBtn('moulin')}</div>
    <div class="card">
      <span class="card-title">Pour bâtir le Moulin</span>
      <ul class="ingredients">${lignes}</ul>
      <span class="muted">Une tour : une pièce close dont les murs ont ${DATA.ATELIER.MOULIN.HAUTEUR} blocs de haut, la meule (fabriquée à l'Atelier) au centre. Bâtie, sa voilure paraît dehors et tourne quand la meule moud.</span>
    </div>`;
  }
  const r = DATA.RECETTES.farine;
  const wheat = Math.floor(wheatTotal(state) + EPS);
  const d = st.appareil;
  const ds = deviceStatus(state, d);
  const job = st.tache;
  const pending = millPending(state);
  const flour = DATA.OBJETS[r.sortie];
  const each = recipeTime(state, 'farine');
  let work;
  if (job) {
    const pct = Math.max(0, Math.min(100, Math.floor(((job.dureeMs - job.resteMs) * 100) / job.dureeMs)));
    const left = millTimeLeft(state);
    const waiting = pending - 1;
    work = `
      <span class="muted">⚙️ En train de moudre : encore <strong class="num">${formatNumber(pending)}</strong> ${accord(pending, 'blé')} · environ <span class="num">${Number.isFinite(left) ? formatDuration(left) : '?'}</span></span>
      <span class="bar" role="progressbar" aria-label="Avancement du blé en cours" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${pct}"><span class="bar-fill" style="width:${pct}%"></span></span>
      ${waiting > 0 ? `<button type="button" class="btn" data-action="mill-cancel">Reprendre les ${plural(waiting, 'blé', formatNumber(waiting))} en attente</button>` : ''}`;
  } else {
    work = '<span class="muted">Le Moulin est prêt.</span>';
  }
  const lot = (n) => `<button type="button" class="btn lot-btn${n === 1 ? ' primary' : ''}" data-action="mill-start" data-q="${n}"${wheat >= n ? '' : ' disabled'}><span>×${n}</span><small>${formatNumber(n * each)} s</small></button>`;
  const stopped = !d.allume || isBroken(d);
  const chip = job ? '<span class="chip">⏳ En marche</span>' : '<span class="chip">✅ Libre</span>';
  return `
    <div class="section-head">
      <h3>${artIcon('moulin')}${def.nom}</h3>
      <span class="chips">${chip}${helpBtn('moulin')}</span>
    </div>
    <div class="cards">
      <div class="card station mill ancre${job ? ' busy' : ''}" id="moulin-moudre">
        <span class="card-title"><span>🌾 Moudre : <span class="num">${formatQty(wheat)}</span> ${accord(wheat, 'blé')}</span><span class="chip">${formatNumber(each)} s par blé</span></span>
        <div class="row item-actions lot-btns">${lot(1)}${lot(5)}${lot(10)}</div>
        ${wheat < 1 ? '<span class="alert">Pas de blé à moudre : récolte du blé (la calèche en vend, pour le semer).</span>' : ''}
        ${stopped && (job || wheat >= 1) ? `<span class="alert">${isBroken(d) ? '⛔ Le Moulin est en panne : il faut le réparer.' : '⚠️ Le Moulin est arrêté : remets-le en marche.'}</span>` : ''}
        ${work}
      </div>
      <div class="card">
        <span class="card-title"><span>📦 En stock</span></span>
        <span class="mill-stock"><span><span aria-hidden="true">${flour.icone}</span> ${flour.nom} : <strong class="num">${formatQty(countItem(state, r.sortie))}</strong></span></span>
      </div>
      <div class="card ancre" id="moulin-appareil">
        <span class="card-title"><span>⚡ Appareil</span><span class="chip${ds.code === 'panne' ? ' panne' : ''}">${ds.label}</span></span>
        ${ds.badge ? `<span class="chip warn">⚠️ ${ds.badge}</span>` : ''}
        ${wearHtml(d)}
        ${stationControls(d)}
      </div>
    </div>`;
}

// Interrupteur, entretien et réparation du Moulin et de la Presse (pas de niveaux).
export function stationControls(d) {
  const maintain = maintainCost(d);
  const repair = repairCost(d);
  const broken = isBroken(d);
  const maintainOk = !broken && (d.usure > 0 || d.usureMs > 0) && canPay(maintain);
  const repairOk = broken && canPay(repair);
  // FLU-26 : « Entretenir » seulement s'il y a de l'usure, « Réparer » seulement en panne
  const maintainBtn = !broken && d.usure > 0 ? `<button type="button" class="btn" data-action="maintain" data-id="${d.id}"${maintainOk ? '' : ' disabled'}>Entretenir (${costLabel(maintain)})</button>` : '';
  const repairBtn = broken ? `<button type="button" class="btn" data-action="repair" data-id="${d.id}"${repairOk ? '' : ' disabled'}>Réparer (${costLabel(repair)})</button>` : '';
  return `
    <span class="device-actions">
      ${switchHtml(d)}
      ${maintainBtn}${repairBtn}
    </span>`;
}

// Le bloc « En préparation » d'un atelier (four, cuisine) : le plat qui cuit (son icône, sa croix pour
// l'arrêter, ce qu'il lui reste, sa barre), puis les places de la file (queueCapacity : celle en cours
// comprise), chacune avec sa croix, ajustée à sa case.
function preparationHtml(id) {
  const st = state.stations[id];
  const cap = queueCapacity(state);
  const file = Array.isArray(st.file) ? st.file : [];
  const job = st.tache;
  const used = (job ? 1 : 0) + file.length;
  const arret = id !== 'moulin';
  let encours;
  if (job) {
    const r = DATA.RECETTES[job.recette];
    const pct = Math.max(0, Math.min(100, Math.floor(((job.dureeMs - job.resteMs) * 100) / job.dureeMs)));
    const left = taskTimeLeft(state, id);
    encours = `
      <div class="prep-encours">
        <span class="prep-ico">${r.icone}${arret ? `<button type="button" class="prep-croix" data-action="stop-recipe" data-station="${id}" aria-label="Arrêter : ${r.nom} (ses ingrédients sont rendus)" title="Arrêter (ingrédients rendus)">✕</button>` : ''}</span>
        <span class="prep-txt">${r.nom}<small>encore <span class="num">${Number.isFinite(left) ? left : '?'} s</span></small>
          <span class="bar" role="progressbar" aria-label="Avancement : ${r.nom}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${pct}"><span class="bar-fill" style="width:${pct}%"></span></span>
        </span>
      </div>`;
  } else encours = `<div class="prep-encours libre"><span class="muted">${DATA.STATIONS[id].nom} libre : choisis ${id === 'four' || id === 'cuisine' ? 'un plat' : 'une préparation'} ci-dessous.</span></div>`;
  const places = Array.from({ length: Math.max(0, cap - 1) }, (_, i) => {
    const e = file[i];
    if (!e) return '<span class="prep-place" aria-hidden="true"></span>';
    const r = DATA.RECETTES[e.recette];
    return `<span class="prep-place pleine" title="${r.nom}">${r.icone}<button type="button" class="prep-croix" data-action="cancel-queued" data-station="${id}" data-index="${i}" aria-label="Retirer ${r.nom} de la file">✕</button></span>`;
  }).join('');
  return `
    <div class="prep-tete"><span>En préparation</span><span class="muted num" aria-label="${used} sur ${cap} places">${used} / ${cap}</span></div>
    ${encours}
    ${cap > 1 ? `<div class="prep-file" style="--places:${Math.max(1, cap - 1)}" aria-label="La file : ${plural(file.length, 'plat', formatNumber(file.length))} en attente">${places}</div>` : ''}`;
}

// Le courant d'un atelier électrique (son état, son usure, ses boutons) ; '' sinon.
function stationPower(id) {
  const def = DATA.STATIONS[id];
  if (!def.electrique) return '';
  const d = state.stations[id].appareil;
  const ds = deviceStatus(state, d);
  return `
      <span class="muted">${ds.label}${ds.badge ? ` · ⚠️ ${ds.badge}` : ''} · ${d.conso > 0 ? 'consomme du courant' : 'ne consomme rien'}</span>
      ${wearHtml(d)}
      ${stationControls(d)}`;
}

function stationCard(id) {
  const def = DATA.STATIONS[id];
  const st = state.stations[id];
  if (!st.construit) return stationBuildCard(id);
  const job = st.tache;
  const chip = job ? '<span class="chip">⏳ Occupée</span>' : '<span class="chip">✅ Libre</span>';
  return `
    <div class="card station ancre${job ? ' busy' : ''}" id="station-${id}">
      <span class="card-title"><span>${artIcon(id)}${def.nom}</span><span class="chips">${chip}${helpBtn(id)}</span></span>
      ${preparationHtml(id)}
      ${stationPower(id)}
    </div>`;
}

export function recipeMeta(id) {
  const r = DATA.RECETTES[id];
  const out = DATA.OBJETS[recipeOutput(id)];
  if (r.transformation) return `→ ${recipeOutputQty(id)} ${out.icone} ${out.nom.toLowerCase()}`;
  const life = shelfLife(id);
  const joie = dishHappiness(recipeOutput(id));
  return `🍽️ ${out.energie} cal${joie ? ` · 😊 +${joie} bonheur` : ''} · 💰 ${formatCoins(out.prix)} · se garde ${nightsLabel(life)}`;
}

function recipeCard(id) {
  const r = DATA.RECETTES[id];
  const sdef = DATA.STATIONS[r.station];
  const status = recipeStatus(state, id);
  const lines = status.lignes
    .map((l) => {
      const what = l.eau
        ? `${formatQty(l.qte)} L d'eau`
        : `${formatQty(l.qte)} ${l.options.map((it) => `${DATA.OBJETS[it].icone} ${DATA.OBJETS[it].nom.toLowerCase()}`).join(' ou ')}`;
      const have = l.eau ? `${formatNumber(l.have)} L dans le réservoir` : `en stock : ${formatQty(l.have)}`;
      return `<li class="${l.ok ? 'ok' : 'missing'}"><span aria-hidden="true">${l.ok ? '✅' : '❌'}</span> <span>${what}</span> <span class="muted">(${have})</span></li>`;
    })
    .join('');
  let reason = '';
  if (status.code === 'verrouillee') {
    const n = DATA.ARBRE.noeuds[status.noeud];
    reason = `<span class="alert">🔒 À débloquer dans l'Arbre des technologies : ${n ? `${n.icone} ${n.nom}` : ''}.</span>`;
  } else if (status.code === 'absente') reason = `<span class="alert">Construis d'abord ${sdef.article} ${sdef.nom}.</span>`;
  else if (status.code === 'occupee') reason = `<span class="alert">${sdef.nom} : la file est pleine, attends la fin d'une préparation.</span>`;
  else if (status.code === 'manque') reason = '<span class="alert">Il manque des ingrédients.</span>';
  const power = sdef.electrique ? ' · électrique' : '';
  return `
    <article class="card recipe ${status.ok ? 'ready' : 'unavailable'}">
      <span class="card-title"><span>${r.icone} ${r.nom}</span><span class="chip">${sdef.icone} ${sdef.nom} · ${formatNumber(recipeTime(state, id))} s</span></span>
      <span class="muted">${recipeMeta(id)}${power}</span>
      <ul class="ingredients" aria-label="Ingrédients">${lines}</ul>
      ${reason}
      <button type="button" class="btn${status.ok ? ' primary' : ''}" data-action="start-recipe" data-recipe="${id}"${status.ok ? '' : ' disabled'}>Préparer</button>
    </article>`;
}

// Combien de fois la recette peut partir avec ce qu'il y a en stock (et dans le réservoir).
function combienPossible(id) {
  const lignes = recipeStatus(state, id).lignes;
  return lignes.reduce((m, l) => Math.min(m, Math.floor((l.have + EPS) / l.qte)), Infinity);
}

// La recette choisie dans la fenêtre de chaque atelier, et combien en lancer (la page seulement).
const choix = {};
const quantite = {};

// Une recette de la grille : son icône seule ; blanchie s'il manque des ingrédients, pâle et cadenassée
// si elle est à débloquer.
function platCase(id, rid, choisie) {
  const r = DATA.RECETTES[rid];
  const status = recipeStatus(state, rid), code = status.code;
  // (blanchie dès qu'il manque un ingrédient, même quand la file est pleine)
  const manque = code !== 'verrouillee' && status.lignes.some((l) => !l.ok);
  const sorte = code === 'verrouillee' ? ' verrou' : manque ? ' non' : '';
  const dit = code === 'verrouillee' ? ' (à débloquer)' : manque ? ' (il manque des ingrédients)' : '';
  return `<button type="button" class="plat-case${sorte}${choisie ? ' choisi' : ''}" data-action="recette-choisir" data-station="${id}" data-recipe="${rid}" aria-pressed="${choisie}" aria-label="${r.nom}${dit}" title="${r.nom}${dit}"><span class="plat-ico">${r.icone}</span>${code === 'verrouillee' ? '<span class="plat-cadenas" aria-hidden="true">🔒</span>' : ''}</button>`;
}

// La fiche de la recette choisie : ce qu'elle donne, ses ingrédients (ce que tu as), combien en lancer.
function ficheRecette(id, rid) {
  const r = DATA.RECETTES[rid];
  const sdef = DATA.STATIONS[r.station];
  const status = recipeStatus(state, rid);
  const st = state.stations[id];
  const used = (st.tache ? 1 : 0) + (Array.isArray(st.file) ? st.file.length : 0);
  const place = Math.max(0, queueCapacity(state) - used);
  const ingr = status.lignes.map((l) => {
    const what = l.eau ? `${formatQty(l.qte)} L 💧` : `${formatQty(l.qte)} ${l.options.map((it) => DATA.OBJETS[it].icone).join(' ou ')}`;
    const nom = l.eau ? 'eau' : l.options.map((it) => DATA.OBJETS[it].nom.toLowerCase()).join(' ou ');
    const have = l.eau ? `${formatNumber(l.have)} L` : formatQty(l.have);
    return `<span class="ingr${l.ok ? '' : ' manque'}" title="${nom}"><span>${what}</span><span class="muted">· tu en as ${have}</span></span>`;
  }).join('');
  let reason = '';
  if (status.code === 'verrouillee') {
    const n = DATA.ARBRE.noeuds[status.noeud];
    reason = `<p class="alert">🔒 À débloquer dans l'Arbre des technologies : ${n ? `${n.icone} ${n.nom}` : ''}.</p>`;
  } else if (status.code === 'occupee') reason = `<p class="alert">${status.lignes.some((l) => !l.ok) ? 'Il manque des ingrédients, et la' : 'La'} file est pleine : attends qu'une préparation se termine.</p>`;
  else if (status.code === 'manque') reason = '<p class="alert">Il manque des ingrédients.</p>';
  const max = status.ok ? Math.max(1, Math.min(place, combienPossible(rid))) : 1;
  const n = Math.max(1, Math.min(max, quantite[id] || 1));
  quantite[id] = n;
  const pas = max > 1 ? `
      <span class="fiche-pas" role="group" aria-label="Combien en lancer">
        <button type="button" class="btn" data-action="recette-qte" data-station="${id}" data-delta="-1" aria-label="Un de moins"${n <= 1 ? ' disabled' : ''}>−</button>
        <span class="num" aria-live="polite">${n}</span>
        <button type="button" class="btn" data-action="recette-qte" data-station="${id}" data-delta="1" aria-label="Un de plus"${n >= max ? ' disabled' : ''}>+</button>
      </span>` : '';
  const libelle = st.tache ? `Ajouter ${n > 1 ? `${n} ` : ''}à la file` : n > 1 ? `Lancer ${n} à la suite` : 'Lancer';
  return `
    <div class="fiche-recette">
      <h4>${r.icone} ${r.nom}</h4>
      <p class="muted">${recipeMeta(rid)} · ${formatNumber(recipeTime(state, rid))} s${sdef.electrique ? ' · électrique' : ''}</p>
      <div class="fiche-ingr" aria-label="Ingrédients">${ingr}</div>
      ${reason}
      <div class="fiche-lancer">${pas}<button type="button" class="btn${status.ok ? ' primary' : ''}" data-action="start-recipe" data-recipe="${rid}" data-n="${n}"${status.ok ? '' : ' disabled'}>${libelle}</button></div>
    </div>`;
}

// Fenêtre d'un meuble de la maison (four, cuisine) : ce qui est en préparation, puis ses recettes en grille
// (leurs icônes) et la fiche de celle qu'on a choisie, d'où on en lance une ou plusieurs à la suite.
// `fonte` (le four) : true, les transformations seules (les lingots : RECETTES.transformation) ;
// false, les plats seuls ; absent, toutes les recettes de la station.
export function renderStationFenetre(id, fonte) {
  const recipes = Object.keys(DATA.RECETTES).filter((r) => DATA.RECETTES[r].station === id && !DATA.RECETTES[r].horsLivre
    && (fonte === undefined || !!DATA.RECETTES[r].transformation === fonte));
  if (!state.stations[id].construit) return `<div class="cards">${stationBuildCard(id)}</div>`;
  if (!recipes.includes(choix[id])) choix[id] = recipes.find((r) => recipeStatus(state, r).ok) || recipes.find((r) => recipeStatus(state, r).code !== 'verrouillee') || recipes[0];
  const rid = choix[id];
  return `
    <div class="menu-atelier" id="station-${id}">
      <div class="prep">${preparationHtml(id)}${stationPower(id)}</div>
      ${recipes.length ? `
      <h3 class="section-title">${fonte ? 'Fontes' : 'Plats'}</h3>
      <div class="plats-grille" role="group" aria-label="${fonte ? 'Fontes' : 'Plats'}">${recipes.map((r) => platCase(id, r, r === rid)).join('')}</div>
      ${ficheRecette(id, rid)}` : ''}
    </div>`;
}

export function renderRecettes() {
  // Le Moulin et sa mouture n'y figurent pas : le blé se moud dans le Moulin (renderMoulin()).
  const ids = bookStations();
  // (ni ce qui se fait sur une chaîne de production : js/engine/chaines.js)
  const recipes = Object.keys(DATA.RECETTES)
    .filter((id) => !DATA.RECETTES[id].horsLivre && DATA.RECETTES[id].station !== 'chaine')
    .sort((a, b) => ids.indexOf(DATA.RECETTES[a].station) - ids.indexOf(DATA.RECETTES[b].station));
  return `
    <div class="section-head">
      <h2>📖 Livre de recette</h2>
      ${energyChip('cuisiner')}
    </div>
    <p><button type="button" class="btn book-open-btn" data-action="book-open">📖 Feuilleter le livre <span class="chip">essai</span></button></p>
    <p class="muted">Jusqu'à ${queueCapacity(state)} préparations à la suite par atelier : elles s'enchaînent sans clic, ingrédients réservés au lancement${queueCapacity(state) < 10 ? ' (les Préparations en série de l\'Arbre des technologies en permettent 10)' : ''}. Tout ce qui est en cours se termine pendant la nuit. Certaines recettes se débloquent dans l'Arbre des technologies. La farine se fait au Moulin, dans son propre menu.</p>
    <h3 class="section-title">Stations</h3>
    <div class="cards">${ids.map(stationCard).join('')}</div>
    <h3 class="section-title">Recettes</h3>
    <div class="recipes">${recipes.map(recipeCard).join('')}</div>`;
}

/* ---------- actions de cet écran (voir ui/actions.js) ---------- */

registerActions({
  // ----- version 1.1 : Moulin (mouture par quantité) -----
  // « Moudre » par lot : ×1, ×5, ×10 blés (data-q)
  'mill-start': (target) => {
    const result = applyResult(executer('moulin.moudre', { quantite: Math.max(1, Number(target.dataset.q) || 1) }));
    if (result.ok) {
      syncJobs();
      // fiche 10 : les lots versés à la suite au Moulin se cumulent
      notify(null, { cumul: { cle: 'moulin', quantites: { n: result.quantite }, texte: (t) => `⚙️ ${plural(t.n, 'blé', formatNumber(t.n))} au Moulin` } });
      refresh();
    }
  },
  'mill-cancel': () => {
    const result = applyResult(executer('moulin.annuler', {}));
    if (result.ok) notify(`🌾 ${plural(result.rendu, 'blé', formatNumber(result.rendu))} repris`);
  },
  'cancel-queued': (target) => {
    applyResult(executer('cuisine.annuler', { station: String(target.dataset.station || ''), rang: Number(target.dataset.index) }));
  },
  // la croix du plat en cours : il s'arrête, ses ingrédients reviennent
  'stop-recipe': (target) => {
    const result = applyResult(executer('cuisine.arreter', { station: String(target.dataset.station || '') }));
    if (result.ok) { syncJobs(); notify(`${DATA.RECETTES[result.recette].icone} ${DATA.RECETTES[result.recette].nom} : arrêté, ingrédients rendus`); }
  },
  // la fenêtre d'un atelier : choisir une recette de la grille, combien en lancer
  'recette-choisir': (target) => {
    const id = String(target.dataset.station || '');
    if (choix[id] !== target.dataset.recipe) quantite[id] = 1;
    choix[id] = target.dataset.recipe;
    refresh();
  },
  'recette-qte': (target) => {
    const id = String(target.dataset.station || '');
    quantite[id] = Math.max(1, (quantite[id] || 1) + (Number(target.dataset.delta) || 0));
    refresh();
  },
  'build-station': (target) => {
    const id = target.dataset.station;
    const result = applyResult(executer('atelier.construire', { station: id }));
    if (result.ok) {
      const def = DATA.STATIONS[id];
      notify(`${def.icone} ${def.nom} construit${def.article === 'la' ? 'e' : ''} (−${formatCoins(result.cost)} 💰)${def.debloque ? ' · onglet Livre de recette débloqué !' : ''}`);
    }
  },
  // (data-n : plusieurs à la suite, depuis la fenêtre d'un atelier ; on s'arrête au premier refus)
  'start-recipe': (target) => {
    const id = target.dataset.recipe;
    const n = Math.max(1, Math.floor(Number(target.dataset.n) || 1));
    let faits = 0, refus = null;
    for (let k = 0; k < n; k++) {
      const r = executer('cuisine.lancer', { recette: id });
      if (!r.ok) { refus = r; break; }
      faits++;
    }
    if (faits) {
      syncJobs();
      notify(`${DATA.RECETTES[id].icone} ${DATA.RECETTES[id].nom}${faits > 1 ? ` ×${faits}` : ''} : ${faits > 1 ? 'préparations lancées' : 'préparation lancée'}`);
    }
    const station = DATA.RECETTES[id].station;
    quantite[station] = 1;
    applyResult(refus || { ok: true });
  },
});
