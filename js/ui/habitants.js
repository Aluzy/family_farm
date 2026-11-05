import { DATA } from '../engine/catalog.js';
import { deHameau } from '../engine/bienvenue.js';
import { evenementsDuHameau } from '../engine/voisins.js';
import { escapeHtml, formatNumber } from '../engine/format.js';
import { clockHours } from '../engine/clock.js';
import { countItem } from '../engine/inventory.js';
import { farmTerrain } from '../engine/terrain.js';
import { HAMEAUX, hameauxVus } from '../engine/monde-hameaux.js';
import { ficheHameau, garantiDuHameau, habitantAgit, habitantsDe, installerEcrits, peuplerHameau } from '../engine/habitants.js';
import { paroleHameau } from '../engine/recit.js';
import { reparerToit, toitsUses, USURE } from '../engine/usure.js';
import { proposerScene } from './scene.js';
import { registerActions } from './actions.js';
import { applyResult } from './game-actions.js';
import { ateliersDuHameau } from '../engine/ile.js';
import { solDuMonde } from './monde-sol.js';
import { persoHtml } from './famille.js';
import { plancheAvecChargement } from './apparence.js';
import { openModal } from './modal.js';
import { enLigne, state } from './store.js';
import { persistState } from './storage.js';
import { refresh } from './render.js';
import { notify } from './toasts.js';
import { amitieParole } from './amitie.js';
import { amitieAvec } from '../engine/amitie.js';
import { apporterAuProjet, PROJETS, projetDuHameau, projetsFaits } from '../engine/projets.js';

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
  if (enLigne) return false;   // (E-8 : le monde partagé est la ferme, sans hameaux)
  const H = habitantsDe(state), vus = Object.keys(hameauxVus(state));
  // (le récit, lot 9 : les personnages écrits d'un hameau peuplé avant qu'ils y habitent, Basile et Théo à
  // Bois-Joli, s'y installent : installerEcrits ne fait rien quand ils y sont déjà)
  let installes = false;
  for (const id of Object.keys(H)) if (installerEcrits(state, id)) installes = true;
  if (installes) persistState();
  if (!vus.some((id) => !H[id])) return installes;
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
  // (le récit, lot 9 : toucher un personnage écrit peut ouvrir sa scène, Odile et l'enveloppe, Théo, Basile ;
  // la scène tient lieu de bulle)
  const h = habitantsDe(state)[o.hameau];
  const m = h && (h.foyers || []).flatMap((f) => f.membres || []).find((x) => x.id === o.id);
  if (m && m.recit && o.activite !== 'dort' && proposerScene({ lieu: garantiDuHameau(state, o.hameau) || o.hameau, hameau: o.hameau, touche: m.recit })) return null;
  const r = paroleHameau(state, o.hameau, o.id, { heure: clockHours(state), activite: o.activite, n: o.n });
  if (r && r.recit) persistState();
  // l'amitié (js/ui/amitie.js) : la première conversation du jour, ce que la bulle en montre, sa réaction
  const a = r ? amitieParole(o.hameau, o.id, o.activite) : null;
  if (a) {
    r.amitie = a.amitie; r.emotion = a.emotion;
    // (les retrouvailles : il le dit avant sa phrase du moment)
    if (a.retrouvailles) r.texte = `${RETROUVAILLES[(o.n || 0) % RETROUVAILLES.length]} ${r.texte}`;
    // (le souvenir d'un repas partagé : il le dit d'abord)
    if (a.souvenir) { r.texte = a.souvenir; persistState(); }
    // (un projet du hameau fini depuis peu : il remercie)
    else if (a.merci) r.texte = a.merci;
    if (a.amitie.gain) persistState();
  }
  return r;
}

// Ce qu'un habitant qui te connaît dit en te revoyant après une longue absence (AMITIE.RETROUVAILLES).
const RETROUVAILLES = ['Te revoilà ! Ça faisait longtemps.', 'Quelle bonne surprise de te revoir !', 'Ah, te voilà enfin ! Tu nous as manqué.'];

/* ---------- la fiche du hameau ---------- */

const humeur = (b) => (b >= DATA.HABITANTS.HEUREUX ? '😊' : b < DATA.HABITANTS.TRISTE ? '😟' : '🙂');

function familleHtml(f, hameauId) {
  // (étape E7 : l'apparence à lui d'un habitant, js/ui/apparence.js ; sinon son personnage du catalogue)
  const portraits = f.membres.map((m) => persoHtml(m.perso, m.enfant, '', '', m.apparence ? plancheAvecChargement(m.apparence, m.enfant) : null)).join('');
  // (l'amitié avec chacun, js/engine/amitie.js : son palier)
  const ami = (m) => { const A = amitieAvec(state, hameauId, m.id); return A ? ` <span class="ami-mini" title="Amitié : ${A.pts}/${A.max}">💛 ${escapeHtml(A.nom)}</span>` : ''; };
  const noms = f.membres.map((m) => `<strong>${escapeHtml(m.prenom)}</strong> <span class="muted">${escapeHtml(m.metier)}</span>${ami(m)}`).join(', ');
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

/* -- le récit, lot 7 : les ateliers des hameaux garantis (js/engine/ile.js, data/ile.json) : la fiche les
   nomme ; on leur passe commande par le cocher, à la calèche (js/ui/caleche.js, l'onglet Commandes). -- */

/* -- le récit, lot 9 : les toits abîmés du hameau (js/engine/usure.js) : on les répare d'ici, sur place. -- */

function toitsHtml(hid) {
  const L = toitsUses(state, hid);
  if (!L.length) return '';
  const fi = ficheHameau(state, hid);
  const qui = (maison) => {
    const f = fi && fi.familles.find((x) => x.maison === maison);
    const a = f && f.membres.find((m) => !m.enfant);
    return a ? `chez ${escapeHtml(a.prenom)}` : 'une maison';
  };
  const cout = Object.entries(USURE.REPARER).map(([item, n]) => `${n} ${(DATA.OBJETS[item] || { icone: '' }).icone}`).join(' ');
  const li = L.map((maison) => `<li class="row"><span>🏚 Le toit, ${qui(maison)}, prend l'eau.</span>
      <button type="button" class="btn" data-action="toit-reparer" data-hameau="${escapeHtml(hid)}" data-maison="${escapeHtml(maison)}">🔨 Réparer (${cout})</button></li>`).join('');
  return `<h3 class="book-h3">Les toits</h3><ul class="hameau-toits">${li}</ul>`;
}

/* -- le lot 5 : le projet collectif du hameau (js/engine/projets.js) : ce qu'il demande, ce qui est là ; on y
   apporte d'ici, sur place. -- */

function projetHtml(hid) {
  const faits = projetsFaits(state, hid).map((f) => PROJETS.SORTES[f.sorte]).filter(Boolean);
  const fait = faits.length ? `<p class="muted">✨ Déjà fait ensemble : ${faits.map((S) => `${S.icone} ${escapeHtml(S.nom.toLowerCase())}`).join(', ')}.</p>` : '';
  const p = projetDuHameau(state, hid);
  if (!p) return faits.length ? `<h3 class="book-h3">Les projets du hameau</h3>${fait}` : '';
  const lignes = Object.entries(p.besoin).map(([it, n]) => {
    const o = DATA.OBJETS[it] || { icone: '', nom: it }, r = Math.min(n, p.recu[it] || 0);
    return `<li class="projet-ligne"><span aria-hidden="true">${o.icone}</span> ${escapeHtml(o.nom)} <span class="bar projet-bar" role="progressbar" aria-label="${escapeHtml(o.nom)} : ${r} sur ${n}" aria-valuemin="0" aria-valuemax="${n}" aria-valuenow="${r}"><span class="bar-fill" style="width:${Math.round((r * 100) / n)}%"></span></span> <span class="num muted">${r}/${n}</span> <span class="muted num">(tu en as ${countItem(state, it)})</span></li>`;
  }).join('');
  const bouton = p.fait
    ? '<p class="muted">Tout est là : le hameau s\'y met cette nuit.</p>'
    : `<button type="button" class="btn primary" data-action="projet-apporter" data-hameau="${escapeHtml(hid)}">🤝 Apporter ce que j'ai</button>`;
  return `<h3 class="book-h3">Le projet du hameau : ${p.icone} ${escapeHtml(p.nom)}</h3>
    <p>${escapeHtml(p.texte)}</p>
    <ul class="projet-besoin">${lignes}</ul>
    <p class="muted">Chaque nuit, les familles y ajoutent un peu de leur réserve. Ton aide les rapproche de toi.</p>
    ${bouton}${fait}`;
}

function ateliersHtml(hid) {
  const A = ateliersDuHameau(state, hid);
  if (!A.length) return '';
  const noms = A.map((a) => `<span aria-hidden="true">${a.icone || ''}</span> ${escapeHtml(a.nom.toLowerCase())}`).join(', ');
  return `<p class="muted ile-annonce">Ses ateliers travaillent pour toi : ${noms}. Passe commande au cocher, à la calèche ; il porte et il rapporte.</p>`;
}

// La fiche du hameau `h` ({ id, nom, style } : le panneau de sa place) ; sans habitants encore, son
// nom seulement. Le récit, lot 7 : ses ateliers (un hameau garanti), nommés.
// V-3 : ce qui s'est passé entre voisins, ces dernières nuits (js/engine/voisins.js).
function voisinsHtml(hid) {
  const H = habitantsDe(state), E = evenementsDuHameau(state, hid);
  if (!E.length) return '';
  const nom = (id) => (H[id] ? H[id].nom : 'un hameau');
  const T = DATA.VOISINS.TEXTES;
  const li = E.map((e) => {
    const t = e.sorte === 'entraide'
      ? T.entraide.replace('{de}', e.de).replace('{deHameau}', nom(e.deHameau)).replace('{a}', e.a)
      : T.visite.replace('{qui}', e.quiPrenom).replace('{deHameau}', deHameau(nom(e.deHameau))).replace('{e}', e.quiGenre === 'f' ? 'e' : '').replace('{chez}', e.chezPrenom);
    return `<li>${e.sorte === 'entraide' ? '🤝' : '👋'} ${escapeHtml(t)} <span class="muted">(jour ${e.jour})</span></li>`;
  }).join('');
  return `<h3 class="book-h3">Entre voisins</h3><ul class="hameau-voisins">${li}</ul>`;
}

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
    ${ateliersHtml(h.id)}
    ${projetHtml(h.id)}
    ${toitsHtml(h.id)}
    <h3 class="book-h3">Les familles</h3>
    <ul class="hameau-familles">${fi.familles.map((f) => familleHtml(f, h.id)).join('')}</ul>
    <h3 class="book-h3">La réserve du hameau</h3>
    <p class="muted">Ce que les familles ont mis de côté, nuit après nuit (+ : la nuit dernière) ; la calèche l'achète à chacun de ses passages, et paie les familles.</p>
    ${reserveHtml(fi)}
    ${calecheHtml(fi)}
    ${voisinsHtml(h.id)}
    <button type="button" class="btn primary" data-action="close-modal" id="hameau-close">Fermer</button>`, { labelledBy: 'hameau-title', className: 'modal bois hameau-modal', focus: '#hameau-close', preventScroll: true });
}

/* ---------- actions de cet écran (voir ui/actions.js) ---------- */

registerActions({
  // le lot 5 : apporter au projet du hameau ce qu'on a (la fiche se refait)
  'projet-apporter': (target) => {
    const id = target.dataset.hameau;
    const r = apporterAuProjet(state, id);
    if (!r.ok) { notify(r.error); return; }
    persistState();
    const dons = Object.entries(r.donne).map(([it, n]) => `${n} ${(DATA.OBJETS[it] || { icone: '' }).icone}`).join(' ');
    notify(`🤝 Tu apportes ${dons} au projet du hameau${r.amitie ? ` · 💛 +${r.amitie} avec chacun de ses habitants` : ''}${r.fait ? '. Tout est là : ils s\'y mettent cette nuit !' : '.'}`, { kind: 'info' });
    const vu = state.monde && state.monde.hameaux && state.monde.hameaux[id];
    openFicheHameau({ id, nom: (vu && vu.nom) || '', style: (vu && vu.style) || '' });
  },
  // le récit, lot 9 : réparer un toit abîmé (la fiche du hameau, sur place) ; la fiche se refait
  'toit-reparer': (target) => {
    const id = target.dataset.hameau;
    const r = applyResult(reparerToit(state, id, target.dataset.maison));
    if (!r.ok) return;
    persistState();
    notify('🔨 Le toit est réparé. Le hameau s\'en souviendra.', { kind: 'info' });
    const vu = state.monde && state.monde.hameaux && state.monde.hameaux[id];
    openFicheHameau({ id, nom: (vu && vu.nom) || '', style: (vu && vu.style) || '' });
  },
});
