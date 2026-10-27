// fiche-membre.js — fiche 11 : la fiche de chaque membre de la famille, en haut de la fenêtre
// Famille (le croquis du joueur, docs/fiches/11-croquis.jpg). En bas, un onglet par membre : le
// personnage principal d'abord, puis les adultes, puis les enfants. Au-dessus, à gauche, une
// colonne de cases d'équipement (EQUIPEMENT.CASES ; le personnage principal en a une de plus, son
// sac à provisions) ; au milieu, le membre en pied dans un cadre, avec ce qu'il porte (les calques
// de assets/personnages/equipement.png, scripts/personnage/equipement.py) ; à droite, ses jauges ;
// sous lui, une barre : son prénom et son rôle, ou ce qu'il fait.
//
// Une case vide s'ouvre sur le choix des pièces de l'inventaire qui lui vont ; une case pleine rend
// la pièce à l'inventaire. La case du sac ouvre le sac : le remplir (à la ferme, depuis
// l'inventaire ou le réfrigérateur), y manger, le retirer. Le moteur : js/engine/equipement.js.

import { DATA } from '../engine/catalog.js';
import { eatSnack, findMember, memberName, memberPerso } from '../engine/family.js';
import { mainCharacter } from '../engine/depart.js';
import { memberHappiness } from '../engine/bonheur.js';
import { jaugeMembre } from '../engine/repas.js';
import { energyLevel, snackEnergy } from '../engine/stamina.js';
import { asleep } from '../engine/night.js';
import { inventoryCounts } from '../engine/inventory.js';
import { fridgeCounts } from '../engine/fridge.js';
import {
  capaciteSac, casesMembre, choixPieces, enExpedition, equiper, pieceDef, piecesEquipement, placeSac, portionsSac,
  poserSac, remplirSac, reprendreSac, retirerPiece, retirerSac, sacCounts, sacDef, sacPorte, sacsDisponibles,
} from '../engine/equipement.js';
import { escapeHtml, formatNumber } from '../engine/format.js';
import { state } from './store.js';
import { tel } from './consent.js';
import { persistState } from './storage.js';
import { refresh } from './render.js';
import { notify } from './toasts.js';
import { registerActions } from './actions.js';
import { closeModal, openModal } from './modal.js';
import { applyResult } from './game-actions.js';
import { persoSrc } from './famille.js';
import { formatEnergyGain } from './energie.js';
import { helpBtn } from './aide.js';

// Le membre dont la fiche est ouverte (son id) ; le personnage principal par défaut.
let ficheId = null;

// Les membres dans l'ordre des onglets : le principal, les adultes, les enfants.
export function ordreFiches() {
  const p = mainCharacter(state), ms = state.famille.membres;
  return [p, ...ms.filter((m) => m !== p && !m.enfant), ...ms.filter((m) => m !== p && m.enfant)].filter(Boolean);
}

function membreOuvert() {
  const liste = ordreFiches();
  return liste.find((m) => m.id === ficheId) || liste[0] || null;
}

const estPrincipal = (m) => !!m && mainCharacter(state) === m;
const nomHtml = (m) => escapeHtml(memberName(state, m.id));

/* -- le dessin : le personnage et ses calques -- */

// L'adresse de la planche des calques d'équipement (avec l'empreinte du site en ligne).
function calquesSrc() {
  const file = 'personnages/equipement.png', v = window.FERME_ASSET_VERSIONS;
  return `assets/${file}${v && v[file] ? `?v=${v[file]}` : ''}`;
}

// L'ordre où les pièces se dessinent l'une sur l'autre : les pieds, le corps, les mains, la tête.
const ORDRE_PLACES = ['pieds', 'corps', 'mains', 'tete'];

// Le membre en pied (la case idle_bas_0 de sa planche) et, par-dessus, un calque par pièce portée :
// la rangée de la pièce dans la planche des calques (l'ordre de EQUIPEMENT.PIECES), la colonne de son
// âge (adulte, enfant).
function persoEquipeHtml(m) {
  const enfant = !!m.enfant, pieces = casesMembre(state, m.id).filter(Boolean);
  pieces.sort((a, b) => ORDRE_PLACES.indexOf(pieceDef(a).place) - ORDRE_PLACES.indexOf(pieceDef(b).place));
  const rangs = piecesEquipement();
  const calques = pieces.map((item) => `<span class="perso-px fiche-calque" style="background-image: url('${calquesSrc()}'); background-position: ${enfant ? 'calc(var(--s) / -2)' : '0'} calc(var(--s) * -${rangs.indexOf(item)})"></span>`).join('');
  return `<span class="fiche-perso" aria-hidden="true"><span class="perso-px" style="background-image: url('${persoSrc(memberPerso(m), enfant)}')"></span>${calques}</span>`;
}

/* -- les jauges -- */

function barre(icone, nom, v, max, bas = false) {
  const pct = Math.max(0, Math.min(100, Math.round((v / max) * 100)));
  return `<span class="fiche-jauge" title="${nom} : ${formatNumber(Math.floor(v))} / ${formatNumber(max)}">
      <span class="fiche-jauge-nom"><span aria-hidden="true">${icone}</span> ${nom}</span>
      <span class="bar" role="progressbar" aria-label="${nom}" aria-valuemin="0" aria-valuemax="${max}" aria-valuenow="${Math.floor(v)}"><span class="bar-fill${bas ? ' warn' : ''}" style="width:${pct}%"></span></span>
      <span class="num muted">${formatNumber(Math.floor(v))}</span>
    </span>`;
}

function jaugesHtml(m) {
  const B = DATA.BONHEUR.MAX;
  if (estPrincipal(m)) {
    const P = DATA.PERSONNAGE, e = energyLevel(state), cap = capaciteSac(state);
    return barre('⚡', 'Énergie', e, P.MAX, e < P.MAX / 4)
      + barre('😊', 'Bonheur', memberHappiness(m), B, memberHappiness(m) < B / 4)
      + (cap ? barre('🎒', 'Sac', portionsSac(state), cap, portionsSac(state) <= DATA.EQUIPEMENT.ALERTE.PRESQUE_VIDE) : '');
  }
  const F = DATA.FAMILLE.FAIM, j = jaugeMembre(m);
  return barre('🍽️', 'Faim', j, F.MAX, j <= F.SEUIL) + barre('😊', 'Bonheur', memberHappiness(m), B, memberHappiness(m) < B / 4);
}

// Sous le portrait : son prénom et son rôle, ou ce qu'il fait.
function roleTexte(m) {
  if (asleep(state)) return 'dort';
  if (estPrincipal(m)) return enExpedition(state) ? 'en expédition' : 'personnage principal';
  if (m.affame) return 'a faim';
  return m.enfant ? 'enfant' : 'adulte';
}

/* -- les cases -- */

function caseHtml(m, k, item) {
  const nom = memberName(state, m.id);
  if (!item) {
    return `<button type="button" class="fiche-case vide" data-action="fiche-case" data-id="${m.id}" data-case="${k}" aria-label="Case ${k + 1} vide : équiper ${escapeHtml(nom)}" title="Équiper"><span aria-hidden="true">＋</span></button>`;
  }
  const o = DATA.OBJETS[item];
  return `<button type="button" class="fiche-case" data-action="fiche-case" data-id="${m.id}" data-case="${k}" aria-label="${o.nom} : retirer" title="${o.nom} — ${effetTexte(item)} Touche pour la retirer."><span class="fiche-case-icone" aria-hidden="true">${o.icone}</span></button>`;
}

function caseSacHtml() {
  const s = sacPorte(state);
  if (!s) return '<button type="button" class="fiche-case sac vide" data-action="fiche-sac" aria-label="Case du sac à provisions, vide : choisir un sac" title="Sac à provisions"><span aria-hidden="true">🎒</span></button>';
  const o = DATA.OBJETS[s], n = portionsSac(state);
  return `<button type="button" class="fiche-case sac" data-action="fiche-sac" aria-label="${o.nom} : ${n} portion${n > 1 ? 's' : ''} sur ${capaciteSac(state)}. Ouvrir le sac" title="${o.nom} : ${n} / ${capaciteSac(state)}"><span class="fiche-case-icone" aria-hidden="true">${o.icone}</span><span class="fiche-case-n num">${n}/${capaciteSac(state)}</span></button>`;
}

// Ce que fait une pièce, en une phrase (d'après data/equipement.json).
export function effetTexte(item) {
  const p = pieceDef(item);
  if (!p) {
    const s = sacDef(item);
    return s ? `${s.portions} portions de provisions pour l'expédition.` : '';
  }
  const noms = { labourer: 'labourer', planter: 'planter', arroser: 'arroser', recolter: 'récolter', cueillir: 'cueillir', faucher: 'faucher', couper: 'couper', piocher: 'piocher' };
  const out = [];
  if (p.economie) {
    const pcts = [...new Set(Object.values(p.economie))];
    const gestes = Object.keys(p.economie).map((a) => noms[a] || a);
    out.push(`${pcts.length === 1 ? `−${pcts[0]} %` : 'moins'} d'énergie pour ${gestes.slice(0, -1).join(', ')}${gestes.length > 1 ? ' et ' : ''}${gestes[gestes.length - 1]}${p.soleil ? ` au soleil (${p.soleil[0]} h à ${p.soleil[1]} h)` : ''}`);
  }
  if (p.toutes) out.push(`−${p.toutes} % d'énergie pour tous les gestes${p.horsFerme ? ' loin de la ferme' : ''}`);
  if (p.grotte) out.push(`+${p.grotte - 100} % de lumière dans la mine et les grottes`);
  if (p.vueNuit) out.push(`voit ${p.vueNuit === 150 ? 'une fois et demie' : `${p.vueNuit} %`} plus loin la nuit dans le grand monde`);
  if (p.pied) out.push(`plus vite à pied dans ${Object.keys(p.pied).map((b) => ({ marais: 'le marais', montagne: 'la montagne', sommet: 'les sommets' }[b] || b)).join(', ')}`);
  if (p.faimMarche) out.push(`pour un autre membre, −${p.faimMarche} % de faim en marchant`);
  if (p.faimAide) out.push(`pour un autre membre, −${p.faimAide} % de faim quand il aide`);
  const t = out.join(' ; ');
  return t ? t.charAt(0).toUpperCase() + t.slice(1) + '.' : '';
}

/* -- la fiche -- */

function ongletsHtml(ouvert) {
  return `<div class="fiche-onglets" role="tablist" aria-label="Membres de la famille">${ordreFiches().map((m) => {
    const on = m === ouvert;
    return `<button type="button" class="fiche-onglet${on ? ' active' : ''}" role="tab" aria-selected="${on}" data-action="fiche-onglet" data-id="${m.id}">${estPrincipal(m) ? '<span aria-hidden="true">⭐</span> ' : ''}<span class="member-name">${nomHtml(m)}</span></button>`;
  }).join('')}</div>`;
}

export function renderFicheMembre() {
  const m = membreOuvert();
  if (!m) return '';
  const cases = casesMembre(state, m.id).map((item, k) => caseHtml(m, k, item)).join('') + (estPrincipal(m) ? caseSacHtml() : '');
  return `
    <section class="fiche-membre" aria-label="Fiche de ${nomHtml(m)}">
      <div class="fiche-corps">
        <div class="fiche-cases" role="group" aria-label="Équipement">${cases}</div>
        <div class="fiche-centre">
          <div class="fiche-cadre">${persoEquipeHtml(m)}</div>
          <p class="fiche-nom"><strong class="member-name">${nomHtml(m)}</strong> <span class="muted">· ${roleTexte(m)}</span></p>
        </div>
        <div class="fiche-jauges">${jaugesHtml(m)}<span class="fiche-aide">${helpBtn('equipement')}</span></div>
      </div>
      ${ongletsHtml(m)}
    </section>`;
}

/* -- le choix d'une pièce (une case vide) -- */

function openChoix(id, k) {
  const m = findMember(state, id);
  if (!m) return;
  tel('modal', 'equipement');
  const choix = choixPieces(state, id, k);
  const lignes = choix.length ? choix.map(({ item, n, refus }) => {
    const o = DATA.OBJETS[item];
    return `<li class="choix-piece${refus ? ' non' : ''}">
        <span class="item-icon" aria-hidden="true">${o.icone}</span>
        <span class="choix-piece-texte"><strong>${o.nom}</strong> <span class="num muted">× ${n}</span><span class="muted">${refus ? escapeHtml(refus) : effetTexte(item)}</span></span>
        <button type="button" class="btn${refus ? '' : ' primary'}" data-action="fiche-equiper" data-id="${id}" data-case="${k}" data-item="${item}"${refus ? ' disabled' : ''}>Équiper</button>
      </li>`;
  }).join('') : '';
  openModal(`
    <h2 id="choix-title">🧰 Équiper ${nomHtml(m)}</h2>
    ${lignes ? `<ul class="choix-pieces">${lignes}</ul>` : `<p class="muted">Aucune pièce d'équipement dans l'inventaire. Elles se fabriquent à l'Atelier (onglet Équipement) : ${piecesEquipement().map((i) => DATA.OBJETS[i].icone).join(' ')}.</p>`}
    <p class="muted">Une pièce par place (tête, corps, mains, pieds)${m.enfant ? ' ; un enfant porte seulement ce qui existe à sa taille' : ''}.</p>
    <div class="row"><button type="button" class="btn" data-action="close-modal" id="choix-close">Fermer</button></div>`, { labelledBy: 'choix-title', className: 'modal choix-modal', focus: '#choix-close', preventScroll: true });
}

/* -- le sac à provisions -- */

let sacOuvert = false;

function ligneSac(item, n, boutons) {
  const o = DATA.OBJETS[item];
  return `<li class="boite-ligne">
      <span class="item-icon" aria-hidden="true">${o.icone}</span>
      <span class="boite-nom">${o.nom} <span class="muted">(+${formatEnergyGain(snackEnergy(state, item))} ⚡)</span></span>
      <span class="num">${n}</span>
      <span class="row">${boutons}</span>
    </li>`;
}

const bouton = (action, attrs, texte, ok = true, cls = '') => `<button type="button" class="btn${cls ? ' ' + cls : ''}" data-action="${action}" ${attrs}${ok ? '' : ' disabled'}>${texte}</button>`;

function sacHtml() {
  const s = sacPorte(state);
  if (!s) {
    const dispo = sacsDisponibles(state);
    return `<h2 id="sac-title">🎒 Sac à provisions</h2>
      <p class="muted">Loin de la ferme, tu ne manges que ce qu'il y a dans ton sac. Il se fabrique à l'Atelier (onglet Équipement).</p>
      ${dispo.length ? `<ul class="choix-pieces">${dispo.map(({ item, n }) => `<li class="choix-piece"><span class="item-icon" aria-hidden="true">${DATA.OBJETS[item].icone}</span><span class="choix-piece-texte"><strong>${DATA.OBJETS[item].nom}</strong> <span class="num muted">× ${n}</span><span class="muted">${effetTexte(item)}</span></span>${bouton('sac-poser', `data-item="${item}"`, 'Prendre', true, 'primary')}</li>`).join('')}</ul>` : '<p class="muted">Aucun sac dans l\'inventaire.</p>'}
      <div class="row"><button type="button" class="btn" data-action="close-modal" id="sac-close">Fermer</button></div>`;
  }
  const dedans = sacCounts(state), n = portionsSac(state), cap = capaciteSac(state), loin = enExpedition(state);
  const contenu = Object.keys(dedans).length
    ? `<ul class="boite-liste">${Object.keys(dedans).map((k) => ligneSac(k, dedans[k],
      bouton('sac-manger', `data-item="${k}" aria-label="Manger : ${DATA.OBJETS[k].nom.toLowerCase()}" title="Manger"`, '🍴') + (loin ? '' : bouton('sac-reprendre', `data-item="${k}" data-n="1"`, '−1')))).join('')}</ul>`
    : '<p class="muted sac-vide">Le sac est vide.</p>';
  const source = (counts, src) => {
    const items = Object.keys(counts).filter((k) => DATA.OBJETS[k] && DATA.OBJETS[k].mangeable);
    if (!items.length) return '<p class="muted">Rien à manger ici.</p>';
    return `<ul class="boite-liste">${items.map((k) => {
      const place = Math.min(placeSac(state, k), counts[k]);
      return ligneSac(k, counts[k], bouton('sac-remplir', `data-item="${k}" data-n="1" data-source="${src}"`, '+1', place > 0) + bouton('sac-remplir', `data-item="${k}" data-n="${place}" data-source="${src}"`, `+${Math.max(place, 0)}`, place > 1));
    }).join('')}</ul>`;
  };
  const frigo = state.frigo && state.frigo.construit;
  return `<h2 id="sac-title">${DATA.OBJETS[s].icone} ${DATA.OBJETS[s].nom} · <span class="num">${n} / ${cap}</span></h2>
    <p class="muted">${loin ? 'Tu es loin de la ferme : tu ne manges que ce qu\'il y a dans ton sac.' : 'Remplis-le avant de partir : loin de la ferme, tu ne manges que ce qu\'il contient. Sur la ferme, rien ne change.'}</p>
    <div class="row">${bouton('sac-manger', '', '🍴 Manger', true, n > 0 ? 'primary' : '')}</div>
    ${contenu}
    ${loin ? '<p class="muted">Le sac se remplit à la ferme.</p>' : `
    <h3 class="section-title">🎒 Depuis l'inventaire</h3>
    ${source(inventoryCounts(state), 'inventaire')}
    ${frigo ? `<h3 class="section-title">🧊 Depuis le réfrigérateur</h3>${source(fridgeCounts(state), 'frigo')}` : ''}`}
    <div class="row">
      ${loin ? '' : bouton('sac-retirer', '', 'Retirer le sac')}
      <button type="button" class="btn" data-action="close-modal" id="sac-close">Fermer</button>
    </div>`;
}

function openSac() {
  tel('modal', 'sac');
  sacOuvert = true;
  openModal(`<div id="sac-corps">${sacHtml()}</div>`, { labelledBy: 'sac-title', className: 'modal sac-modal', focus: '#sac-close', preventScroll: true, onClose: () => { sacOuvert = false; } });
}

// Redessine le sac ouvert (après un geste), en gardant la fenêtre.
function majSac() {
  const el = document.getElementById('sac-corps');
  if (!sacOuvert || !el) return;
  el.innerHTML = sacHtml();
}

/* ---------- les actions de la fiche (voir ui/actions.js) ---------- */

function apres(r) {
  if (r && r.ok) persistState();
  refresh();
  majSac();
  return r;
}

registerActions({
  'fiche-onglet': (target) => {
    ficheId = target.dataset.id;
    refresh();
  },
  'fiche-case': (target) => {
    const id = target.dataset.id, k = Number(target.dataset.case);
    const item = casesMembre(state, id)[k];
    if (!item) { openChoix(id, k); return; }
    const r = applyResult(retirerPiece(state, id, k));
    if (r.ok) { persistState(); notify(`${DATA.OBJETS[item].icone} ${DATA.OBJETS[item].nom} : retiré, rangé dans l'inventaire.`); }
  },
  'fiche-equiper': (target) => {
    const r = applyResult(equiper(state, target.dataset.id, target.dataset.item, Number(target.dataset.case)));
    if (r.ok) {
      persistState();
      closeModal();
      notify(`${DATA.OBJETS[r.item].icone} ${memberName(state, target.dataset.id)} porte : ${DATA.OBJETS[r.item].nom.toLowerCase()}.`);
    }
  },
  'fiche-sac': () => openSac(),
  'sac-poser': (target) => {
    const r = apres(applyResult(poserSac(state, target.dataset.item)));
    if (r.ok) notify(`${DATA.OBJETS[r.item].icone} ${DATA.OBJETS[r.item].nom} : remplis-le avant de partir.`);
  },
  'sac-retirer': () => {
    const r = apres(applyResult(retirerSac(state)));
    if (r.ok) { closeModal(); notify(`${DATA.OBJETS[r.item].icone} Le sac et son contenu sont rangés dans l'inventaire.`); }
  },
  'sac-remplir': (target) => {
    const item = target.dataset.item;
    const r = apres(applyResult(remplirSac(state, item, Number(target.dataset.n) || 1, target.dataset.source)));
    // fiche 10 : remplir plusieurs fois de suite cumule dans une seule notification
    if (r.ok) notify(null, { cumul: { cle: `sac:${item}`, quantites: { n: r.moved }, texte: (t) => `🎒 Dans le sac : +${t.n} ${DATA.OBJETS[item].icone} (${portionsSac(state)} / ${capaciteSac(state)})` } });
  },
  'sac-reprendre': (target) => {
    apres(applyResult(reprendreSac(state, target.dataset.item, Number(target.dataset.n) || 1)));
  },
  'sac-manger': (target) => {
    const r = apres(applyResult(eatSnack(state, target.dataset.item || null, { duSac: true })));
    if (r && r.ok) notify(null, { cumul: { cle: 'manger-sac', quantites: { gain: r.gain }, texte: (t) => `⚡ +${formatEnergyGain(t.gain)} énergie · 🎒 ${portionsSac(state)} / ${capaciteSac(state)} dans le sac` } });
  },
});
