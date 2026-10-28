import { DATA } from '../engine/catalog.js';
import { escapeHtml, formatNumber } from '../engine/format.js';
import { clockHours } from '../engine/clock.js';
import { farmTerrain } from '../engine/terrain.js';
import { HAMEAUX, hameauxVus } from '../engine/monde-hameaux.js';
import { ficheHameau, habitantAgit, habitantsDe, peuplerHameau } from '../engine/habitants.js';
import { paroleHameau } from '../engine/recit.js';
import { solDuMonde } from './monde-sol.js';
import { persoHtml } from './famille.js';
import { openModal } from './modal.js';
import { state } from './store.js';
import { persistState } from './storage.js';
import { refresh } from './render.js';
import { notify } from './toasts.js';

/* ---------- les habitants des hameaux, côté page (fiche 7b) ----------

   Le moteur (js/engine/habitants.js) tient les foyers ; la scène de la carte
   (js/carte/ferme/habitants.js) les fait vivre sous les yeux du joueur. Ici :
     - les foyers naissent quand le personnage arrive dans un hameau (le plan du hameau vient du
       Web Worker, js/ui/monde-sol.js : peuplerHameau) ; une partie d'avant la fiche, qui a déjà vu
       des hameaux, les peuple dès que les plans sont là (peuplerLesVus) ;
     - les ponts de la carte : un geste fini (habitantDepuisCarte), une phrase (paroleDepuisCarte) ;
     - la fiche du hameau, ouverte depuis le panneau de sa place : ses familles, son métier, sa
       réserve (que la calèche achète à ses passages : js/engine/caleche.js) et le dernier passage de la calèche. */

const PECHE_RAYON = 45;   // cases : le coin de pêche le plus proche donne son eau au pêcheur

function solActuel() {
  return solDuMonde(farmTerrain(state));
}

// L'eau où pêche le pêcheur du hameau `plan` : celle du coin de pêche le plus proche du plan du
// monde (à PECHE_RAYON cases au plus), sinon null (le moteur choisit : la mer sur la côte, sinon la
// rivière).
function eauDuHameau(plan, sol) {
  const L = sol && sol.lieux ? sol.lieux() : null, W = farmTerrain(state).LARGEUR;
  let best = null;
  for (const p of (L && L.peche) || []) {
    const d = Math.hypot((p.case % W) - (plan.case % W), Math.floor(p.case / W) - Math.floor(plan.case / W));
    if (d <= PECHE_RAYON && (!best || d < best.d)) best = { d, eau: p.eau };
  }
  return best ? best.eau : null;
}

// Le hameau `id` est là (le personnage y arrive) : ses foyers naissent, une fois. → true s'ils
// viennent de naître.
export function peuplerDepuisCarte(id) {
  if (habitantsDe(state)[id]) return false;
  const sol = solActuel(), plans = sol && sol.hameaux ? sol.hameaux() : null;
  const plan = plans && plans.find((p) => p.id === id);
  if (!plan || !peuplerHameau(state, plan, { eau: eauDuHameau(plan, sol) })) return false;
  persistState();
  return true;
}

// Les hameaux déjà vus (une partie d'avant la fiche 7b) qui n'ont pas encore leurs habitants : ils
// naissent dès que les plans sont là. Appelé à chaque modèle de la carte : ne coûte presque rien.
export function peuplerLesVus() {
  const H = habitantsDe(state), vus = Object.keys(hameauxVus(state));
  if (!vus.some((id) => !H[id])) return false;
  const sol = solActuel(), plans = sol && sol.hameaux ? sol.hameaux() : null;
  if (!plans) return false;
  let fait = false;
  for (const id of vus) {
    const plan = !H[id] && plans.find((p) => p.id === id);
    if (plan && peuplerHameau(state, plan, { eau: eauDuHameau(plan, sol) })) fait = true;
  }
  if (fait) persistState();
  return fait;
}

// Le pont de la carte : l'habitant `id` du hameau `hameau` a fini un geste de son métier (un arbre
// abattu : `piece`, son identifiant). → le résultat du moteur (habitantAgit).
export function habitantDepuisCarte(hameau, id, geste, piece) {
  const r = habitantAgit(state, hameau, id, geste, piece);
  if (r.ok) {
    persistState();
    // (un arbre abattu : le modèle de la carte le dit pris ; appelé pendant l'image de la carte, la
    // vue se refait juste après)
    if (piece) setTimeout(refresh, 0);
  }
  return r;
}

// Le pont de la carte : ce que dit l'habitant qu'on touche ({ hameau, id, activite, n }). Un personnage
// écrit du récit (Odile au Gué…) dit une réplique du récit, notée dans la partie (paroleHameau).
export function paroleDepuisCarte(o) {
  const r = paroleHameau(state, o.hameau, o.id, { heure: clockHours(state), activite: o.activite, n: o.n });
  if (r && r.recit) persistState();
  return r;
}

/* ---------- la fiche du hameau ---------- */

const humeur = (b) => (b >= DATA.HABITANTS.HEUREUX ? '😊' : b < DATA.HABITANTS.TRISTE ? '😟' : '🙂');

function familleHtml(f) {
  const portraits = f.membres.map((m) => persoHtml(m.perso, m.enfant)).join('');
  const noms = f.membres.map((m) => `<strong>${escapeHtml(m.prenom)}</strong> <span class="muted">${escapeHtml(m.metier)}</span>`).join(', ');
  const b = Math.round(f.bonheur);
  const repas = (f.couverture === null ? '' : ` · repas d'hier : <span class="num">${f.couverture} %</span>`) + ` · bourse : <span class="num">${formatNumber(Math.round(f.bourse || 0))}</span> 💰`;
  return `<li class="hameau-famille">
      <span class="hameau-portraits">${portraits}</span>
      <span class="hameau-famille-texte"><span class="hameau-noms">${noms}</span>
        <span class="hameau-bonheur"><span aria-hidden="true">${humeur(b)}</span> bonheur
          <span class="bar" role="progressbar" aria-label="Bonheur" aria-valuemin="0" aria-valuemax="${DATA.BONHEUR.MAX}" aria-valuenow="${b}"><span class="bar-fill${b >= DATA.HABITANTS.HEUREUX ? '' : b >= DATA.HABITANTS.TRISTE ? ' warn' : ' bad'}" style="width:${Math.round((b / DATA.BONHEUR.MAX) * 100)}%"></span></span>
          <span class="num">${b}</span>${repas}</span></span>
    </li>`;
}

function reserveHtml(fi) {
  if (!fi.reserve.length) return '<p class="muted">Rien encore : les familles y mettront ce qui leur reste ce soir.</p>';
  const li = fi.reserve.map(([item, n]) => {
    const d = DATA.OBJETS[item] || { nom: item, icone: '' };
    const plus = fi.hier[item] ? ` <span class="gain num">+${formatNumber(fi.hier[item])}</span>` : '';
    return `<li><span aria-hidden="true">${d.icone}</span> ${escapeHtml(d.nom)} <span class="num">${formatNumber(n)}</span>${plus}</li>`;
  }).join('');
  return `<ul class="hameau-reserve">${li}</ul>`;
}

// Le dernier passage de la calèche (fiche 7c : js/engine/caleche.js) : ce qu'elle a acheté.
function calecheHtml(fi) {
  const c = fi.caleche;
  if (!c) return '<p class="muted">🐴 La calèche n\'est pas encore passée depuis que tu connais le hameau.</p>';
  const quand = c.jour === state.day ? 'aujourd\'hui' : c.jour === state.day - 1 ? 'hier' : `le jour ${c.jour}`;
  const items = Object.entries(c.achats || {}).map(([item, n]) => `${formatNumber(n)} ${(DATA.OBJETS[item] || { icone: '' }).icone}`).join(', ');
  return `<p class="muted">🐴 La calèche est passée ${quand}${items ? ` : elle a acheté ${items}, pour <span class="num">${formatNumber(c.pieces)}</span> 💰 partagés entre les familles` : ', mais la réserve était vide'}.</p>`;
}

// La fiche du hameau `h` ({ id, nom, style } : le panneau de sa place) ; sans habitants encore, son
// nom seulement.
export function openFicheHameau(h) {
  const S = HAMEAUX.STYLES[h.style];
  peuplerDepuisCarte(h.id);
  const fi = ficheHameau(state, h.id);
  if (!fi) { notify(`🪧 ${h.nom}${S ? ` — un hameau ${S.nom}` : ''}`, { kind: 'info' }); return; }
  const metiers = (HAMEAUX.METIERS.NOMS || {})[fi.metier] || fi.metier;
  const gens = fi.familles.reduce((t, f) => t + f.membres.length, 0);
  openModal(`
    <h2 id="hameau-title">🪧 ${escapeHtml(fi.nom)}</h2>
    <p class="muted">Un hameau ${S ? escapeHtml(S.nom) : ''}, un hameau de ${escapeHtml(metiers)} : ${fi.familles.length} familles, ${gens} habitants.</p>
    <h3 class="book-h3">Les familles</h3>
    <ul class="hameau-familles">${fi.familles.map(familleHtml).join('')}</ul>
    <h3 class="book-h3">La réserve du hameau</h3>
    <p class="muted">Ce que les familles ont mis de côté, nuit après nuit (+ : la nuit dernière) ; la calèche l'achète à chacun de ses passages, et paie les familles.</p>
    ${reserveHtml(fi)}
    ${calecheHtml(fi)}
    <button type="button" class="btn primary" data-action="close-modal" id="hameau-close">Fermer</button>`, { labelledBy: 'hameau-title', className: 'modal bois hameau-modal', focus: '#hameau-close' });
}
