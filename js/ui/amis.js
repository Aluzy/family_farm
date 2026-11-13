// Les amis (jeu en ligne) : le bouton 💌, le volet des amis et la fiche d'un ami.
//
// - Le bouton 💌, à droite sous la boussole, ouvre le volet ; sa pastille compte les demandes d'amis et les
//   messages reçus (une invitation, un ami qui demande à venir, un signe de la main).
// - Le volet glisse depuis le bord droit, par-dessus la ferme : les amis en ligne (leur personnage marche sur
//   place), hors ligne (grisés), les demandes reçues (✓, ✗) et envoyées, la boîte ; en bas, « Ajouter un ami »
//   (son code ami, le lien à partager, le code d'un ami à entrer). Un bouton ✉️ invite un ami tout de suite.
// - Toucher un ami ouvre sa fiche, en bas de l'écran : son personnage en grand, son niveau, sa famille, depuis
//   quand vous êtes amis ; l'inviter dans sa ferme, rejoindre la sienne (si l'on est membre de son monde, sinon
//   lui demander de venir), lui faire signe, le retirer.
//
// Le serveur (worker/src/amis.mjs) garde les amis ; le jeu y publie le profil de son personnage (celui de la
// partie solo : son prénom, son allure, son niveau, le nom de sa famille, où il joue) à l'ouverture du volet et
// toutes les PUBLIER_MS : c'est ce qui le dit « en ligne » chez ses amis. Jamais d'adresse e-mail.
// Un lien jeu.html#ami=MOON-XXXXX (partagé par un ami) envoie la demande, une fois connecté.
//
// Fiche I6a (le chantier « l'île à bâtir », le réglage allumé) : en tête du volet, « Sur l'île » liste les
// villageois (sans compte : ils sont dans la partie), leur palier d'amitié, un 🎁 s'ils gardent un présent, un 📜
// s'ils ont une demande ; toucher l'un ouvre sa fiche (js/ui/villageois.js).

import { levelProgress } from '../engine/levels.js';
import { amitieVillageois, memberPerso, validApparence, villageActif, villageoisDe } from '../engine/index.js';
import { ouvrirFicheVillageois } from './villageois.js';
import { registerActions } from './actions.js';
import { appelServeur, compteGarde, personnageSolo, quandConnecte } from './compte.js';
import { mondeActuel } from './en-ligne.js';
import { SAVE_KEY, state } from './store.js';
import { notify } from './toasts.js';
import { exportSaveJson } from './storage.js';

const PUBLIER_MS = 45000;
const echapper = (t) => String(t ?? '').replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]);
const pad = (n) => String(n).padStart(2, '0');

let vue = null;          // la dernière réponse du serveur : { code, amis, demandes, envoyees, boite }
let ouvert = false, fiche = null, ajout = false, aRetirer = null, occupe = false, erreur = '';
const vus = new Set();   // (les messages déjà annoncés)

/* ---------- le profil publié ---------- */

function profil() {
  const m = personnageSolo();
  let niveau = 0, famille = '';
  try {
    const p = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null');
    const s = mondeActuel() ? p && (p.s || p) : state;
    niveau = s ? levelProgress(s).niveau : 0;
    famille = (s && s.famille && s.famille.nom) || '';
  } catch (e) { niveau = 0; }
  const ici = mondeActuel();
  return {
    prenom: m && m.prenom ? m.prenom : '',
    look: m ? { perso: memberPerso({ ...m, enfant: false }), apparence: validApparence(m.apparence, false) } : null,
    niveau, famille,
    monde: ici ? ici.monde : null, proprio: !!(ici && ici.role === 'proprietaire'),
  };
}

async function rafraichir() {
  if (!compteGarde()) { vue = null; dessiner(); return; }
  const r = await appelServeur('/compte/amis', { corps: profil() });
  if (r.ok) { vue = r; erreur = ''; annoncer(); } else if (r.statut === 401) vue = null; else erreur = r.erreur || '';
  dessiner();
}
if (typeof window !== 'undefined') setInterval(() => { if (compteGarde() && document.visibilityState !== 'hidden') rafraichir(); }, PUBLIER_MS);

// Les nouveaux messages, dits une fois (un message par sorte).
function annoncer() {
  for (const m of (vue && vue.boite) || []) {
    if (vus.has(m.id)) continue;
    vus.add(m.id);
    const p = m.prenom;
    if (m.type === 'invitation') notify(`💌 ${p} t'invite dans sa ferme « ${(m.titre || 'sa ferme')} » : ouvre tes amis pour y aller.`, { duree: 8000 });
    else if (m.type === 'visite') notify(`🙋 ${p} aimerait venir dans ta ferme : ouvre tes amis pour l'inviter.`, { duree: 8000 });
    else if (m.type === 'signe') notify(`👋 ${p} te fait signe !`);
  }
  for (const d of (vue && vue.demandes) || []) {
    const k = 'd:' + d.compte;
    if (!vus.has(k)) { vus.add(k); notify(`💌 ${(d.prenom)} veut devenir ton ami.`); }
  }
}

/* ---------- l'image d'un personnage (sa planche, frame 0 : debout, de face) ---------- */

const planches = new Map();   // clé de planche → URL de l'image
function planche(look) {
  const perso = (look && look.perso) || 1, apparence = (look && look.apparence) || null;
  const sc = typeof window !== 'undefined' && window.FarmStage && FarmStage.scene ? FarmStage.scene() : null;
  const repli = `assets/personnages/perso_${pad(perso)}.png`;
  if (!apparence || !sc || !sc.clePerso) return repli;
  const cle = sc.clePerso({ perso, enfant: false, apparence });
  if (planches.has(cle)) return planches.get(cle);
  if (sc.textures.exists(cle)) {
    const src = sc.textures.get(cle).getSourceImage();
    const url = src && src.toDataURL ? src.toDataURL() : src && src.src;
    if (url) { planches.set(cle, url); return url; }
  } else {
    sc.chargePerso(cle, { perso, enfant: false, apparence });
    setTimeout(() => { if (ouvert) dessiner(); }, 600);
  }
  return repli;
}
const avatar = (look, k = 2, cls = '') => `<span class="amis-av${cls ? ' ' + cls : ''}" style="--k:${k};background-image:url('${echapper(planche(look))}')" aria-hidden="true"></span>`;

/* ---------- le bouton, le volet, la fiche ---------- */

const OU = { 'solo': 'Dans sa ferme', 'sa-ferme-en-ligne': 'Dans sa ferme en ligne', 'un-monde': 'Dans un monde partagé' };
function ou(a) {
  const ici = mondeActuel();
  if (a.enLigne && ici && a.monde === ici.monde) return 'Avec toi';
  if (a.enLigne) return OU[a.ou] || 'En ligne';
  return `Vu ${depuis(a.vu)}`;
}
function depuis(t) {
  if (!t) return 'il y a longtemps';
  const m = Math.floor((Date.now() - t) / 60000);
  if (m < 60) return `il y a ${Math.max(1, m)} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `il y a ${h} h`;
  const j = Math.floor(h / 24);
  return j === 1 ? 'hier' : `il y a ${j} jours`;
}
const nbPastille = () => (vue ? vue.demandes.length + vue.boite.length : 0);

function bouton() {
  let b = document.getElementById('amis-bouton');
  if (!b) {
    b = document.createElement('button');
    b.id = 'amis-bouton';
    b.type = 'button';
    b.className = 'amis-bouton';
    b.dataset.action = 'amis-ouvrir';
    document.body.appendChild(b);
  }
  const n = nbPastille();
  const html = `💌${n ? `<span class="amis-pastille">${n}</span>` : ''}`;
  if (b.__html !== html) { b.__html = html; b.innerHTML = html; }
  b.setAttribute('aria-label', n ? `Mes amis (${n} nouveau${n > 1 ? 'x' : ''})` : 'Mes amis');
}

function ligneAmi(a) {
  const on = a.enLigne;
  return `<div class="amis-v${on ? '' : ' off'}">
    <button class="amis-qui" type="button" data-action="amis-fiche" data-compte="${echapper(a.compte)}">${avatar(a.look, 2, on ? 'marche' : '')}
      <span class="amis-id"><strong>${echapper(a.prenom)} <span class="amis-niv">⭐ ${a.niveau}</span></strong><span class="amis-ou${on ? ' on' : ''}">${on ? '● ' : ''}${echapper(ou(a))}</span></span></button>
    <button class="btn amis-rond${on ? ' primary' : ''}" type="button" data-action="amis-inviter" data-compte="${echapper(a.compte)}" title="Inviter ${echapper(a.prenom)} dans ma ferme" aria-label="Inviter ${echapper(a.prenom)} dans ma ferme">✉️</button>
  </div>`;
}

const MOTS = { invitation: (m) => `t'invite dans « ${echapper(m.titre || 'sa ferme')} »`, visite: () => 'aimerait venir dans ta ferme', signe: () => 'te fait signe 👋' };
function ligneMessage(m) {
  const act = m.type === 'invitation' ? `<button class="btn primary" type="button" data-action="amis-message" data-id="${m.id}">🚪 Y aller</button>`
    : m.type === 'visite' ? `<button class="btn primary" type="button" data-action="amis-message" data-id="${m.id}">✉️ Inviter</button>`
      : `<button class="btn" type="button" data-action="amis-message" data-id="${m.id}">👋</button>`;
  return `<div class="amis-msg"><span><strong>${echapper(m.prenom)}</strong> ${MOTS[m.type](m)}</span>${act}</div>`;
}

// (I6a) Les villageois de l'île et leur amitié : '' le réglage éteint ou sans villageois.
function ileHtml() {
  if (!state || !villageActif(state)) return '';
  const V = villageoisDe(state);
  if (!V.length) return '';
  const lignes = V.map((v) => {
    const A = amitieVillageois(state, v.id);
    if (!A) return '';
    return `<button type="button" class="amis-v amis-ile" data-action="amis-villageois" data-id="${echapper(v.id)}">${avatar({ perso: v.perso, apparence: validApparence(v.apparence, false) }, 2)}<span class="amis-id"><strong>${echapper(v.prenom)}</strong><span class="amis-ou">💛 ${echapper(A.nom)} · ${A.pts}/${A.max}${A.present ? ' · 🎁' : ''}${A.demande ? ' · 📜' : ''}</span></span></button>`;
  }).join('');
  return `<div class="amis-liste amis-ile-liste"><h3>🏝️ Sur l'île · ${V.length}</h3>${lignes}</div>`;
}

function voletHtml() {
  return ileHtml() + voletCompteHtml();
}

function voletCompteHtml() {
  if (!compteGarde()) {
    return `<p class="amis-vide">Pour avoir des amis, inviter et rejoindre leurs fermes, connecte-toi au jeu en ligne : il suffit de ton adresse e-mail (personne d'autre ne la voit).</p>
      <div class="amis-pied"><button class="btn primary" type="button" data-action="amis-connexion">🌐 Me connecter</button></div>`;
  }
  if (!vue) return `<p class="amis-vide">${erreur ? echapper(erreur) : 'Un instant…'}</p>`;
  const en = vue.amis.filter((a) => a.enLigne), hors = vue.amis.filter((a) => !a.enLigne);
  const msgs = vue.boite.length ? `<h3>Pour toi · ${vue.boite.length}</h3>${vue.boite.map(ligneMessage).join('')}` : '';
  const dem = vue.demandes.length ? `<h3>Demandes · ${vue.demandes.length}</h3>${vue.demandes.map((d) => `<div class="amis-v">${avatar(d.look, 2)}<span class="amis-id"><strong>${echapper(d.prenom)} <span class="amis-niv">⭐ ${d.niveau}</span></strong><span class="amis-ou">veut être ton ami</span></span>
      <button class="btn primary amis-rond" type="button" data-action="amis-repondre" data-compte="${echapper(d.compte)}" data-oui="1" aria-label="Accepter ${echapper(d.prenom)}">✓</button><button class="btn amis-rond" type="button" data-action="amis-repondre" data-compte="${echapper(d.compte)}" data-oui="0" aria-label="Refuser ${echapper(d.prenom)}">✗</button></div>`).join('')}` : '';
  const envoyees = vue.envoyees.length ? `<p class="amis-attente">⏳ En attente : ${vue.envoyees.map((e) => echapper(e.prenom)).join(', ')}</p>` : '';
  const vide = !vue.amis.length && !vue.demandes.length ? '<p class="amis-vide">Pas encore d\'amis. Ajoute-en un avec son code ami, ou envoie-lui le tien : il apparaîtra ici.</p>' : '';
  const lien = `${location.origin}${location.pathname}#ami=${vue.code}`;
  const pied = ajout ? `<div class="amis-ajout">
      <p>Ton code ami : <b class="amis-code">${echapper(vue.code)}</b></p>
      <div class="row"><button class="btn" type="button" data-action="amis-copier" data-texte="${echapper(lien)}">📋 Copier mon lien</button>${typeof navigator !== 'undefined' && navigator.share ? `<button class="btn" type="button" data-action="amis-partager" data-texte="${echapper(lien)}">📤 Partager</button>` : ''}</div>
      <label for="amis-code">Le code de ton ami</label>
      <div class="row"><input id="amis-code" type="text" inputmode="text" autocomplete="off" autocapitalize="characters" spellcheck="false" placeholder="MOON-K7Q2X" maxlength="12"><button class="btn primary" type="button" data-action="amis-envoyer"${occupe ? ' disabled' : ''}>Envoyer</button></div>
    </div>` : '<button class="btn primary" type="button" data-action="amis-ajouter">➕ Ajouter un ami</button>';
  return `<div class="amis-liste">${msgs}${dem}
    ${en.length ? `<h3>En ligne · ${en.length}</h3>${en.map(ligneAmi).join('')}` : ''}
    ${hors.length ? `<h3>Hors ligne · ${hors.length}</h3>${hors.map(ligneAmi).join('')}` : ''}${vide}${envoyees}</div>
    <div class="amis-pied">${pied}</div>`;
}

function ficheHtml(a) {
  const on = a.enLigne;
  const depuisLe = a.depuis ? new Date(a.depuis).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' }) : '';
  const rejoindre = a.monde ? `<button class="btn" type="button" data-action="amis-rejoindre" data-monde="${echapper(a.monde)}">🚪 Rejoindre sa ferme</button>`
    : `<button class="btn" type="button" data-action="amis-visite" data-compte="${echapper(a.compte)}">🙋 Lui demander de venir chez lui</button>`;
  const retirer = aRetirer === a.compte
    ? `<button class="btn danger" type="button" data-action="amis-retirer-oui" data-compte="${echapper(a.compte)}">Oui, le retirer</button><button class="btn" type="button" data-action="amis-retirer-non">Non</button>`
    : `<button class="btn" type="button" data-action="amis-retirer" data-compte="${echapper(a.compte)}">Retirer</button>`;
  return `<div class="amis-fiche" role="dialog" aria-modal="true" aria-labelledby="amis-fiche-nom">
    <button class="amis-poignee" type="button" data-action="amis-fiche-fermer" aria-label="Fermer la fiche"></button>
    <div class="amis-fiche-haut"><div class="amis-socle${on ? '' : ' off'}">${avatar(a.look, 3, on ? 'respire' : '')}</div>
      <div class="amis-fiche-id"><h2 id="amis-fiche-nom">${echapper(a.prenom)}</h2>
        <span class="amis-ou${on ? ' on' : ''}">${on ? '● ' : '○ '}${echapper(ou(a))}</span>
        <span>⭐ Niveau ${a.niveau}${a.famille ? ` · famille ${echapper(a.famille)}` : ''}</span>
        ${depuisLe ? `<small class="muted">Amis depuis le ${depuisLe}</small>` : ''}</div></div>
    <div class="stack amis-fiche-actions">
      <button class="btn primary" type="button" data-action="amis-inviter" data-compte="${echapper(a.compte)}"${occupe ? ' disabled' : ''}>✉️ L'inviter dans ma ferme</button>
      ${rejoindre}
      <div class="row"><button class="btn" type="button" data-action="amis-signe" data-compte="${echapper(a.compte)}">👋 Lui faire signe</button>${retirer}</div>
    </div></div>`;
}

function dessiner() {
  if (typeof document === 'undefined') return;
  bouton();
  let el = document.getElementById('amis-volet');
  if (!ouvert) { if (el) el.remove(); return; }
  if (!el) {
    el = document.createElement('div');
    el.id = 'amis-volet';
    document.body.appendChild(el);
  }
  const a = fiche && vue ? vue.amis.find((x) => x.compte === fiche) : null;
  // (le champ du code ami garde ce qu'on y tape d'un dessin à l'autre)
  const champ = document.getElementById('amis-code'), saisi = champ ? champ.value : '', focus = document.activeElement === champ;
  el.innerHTML = `<div class="amis-fond" data-action="amis-fermer"></div>
    <aside class="amis-panneau" aria-labelledby="amis-titre"><header><span id="amis-titre">💌 Mes amis</span>${nbPastille() ? `<span class="amis-pastille">${nbPastille()}</span>` : ''}<button class="amis-x" type="button" data-action="amis-fermer" aria-label="Fermer">✕</button></header>${voletHtml()}</aside>
    ${a ? `<div class="amis-fiche-fond" data-action="amis-fiche-fermer"></div>${ficheHtml(a)}` : ''}`;
  const c2 = document.getElementById('amis-code');
  if (c2) { c2.value = saisi; if (focus) c2.focus(); }
}

export function ouvrirAmis() {
  ouvert = true;
  fiche = null;
  dessiner();
  rafraichir();
}

/* ---------- les gestes ---------- */

async function poster(chemin, corps) {
  const r = await appelServeur('/compte/amis/' + chemin, { corps });
  if (!r.ok) notify(`💌 ${r.erreur || 'Ça n\'a pas fonctionné : réessaie.'}`);
  return r;
}

// Inviter l'ami `compte` dans sa ferme en ligne : le monde où l'on est (si c'est le sien), sinon sa première
// ferme en ligne ; sans ferme en ligne, elle y est mise (une copie de la partie solo).
async function inviter(compte) {
  const a = vue && vue.amis.find((x) => x.compte === compte);
  if (!a || occupe) return;
  occupe = true;
  dessiner();
  try {
    const ici = mondeActuel();
    let monde = ici && ici.role === 'proprietaire' ? ici.monde : null;
    if (!monde) {
      const l = await appelServeur('/mondes', { methode: 'GET' });
      const m = (l.mondes || []).find((x) => x.role === 'proprietaire');
      monde = m ? m.monde : null;
    }
    if (!monde) {
      if (ici) { notify('💌 Reviens dans ta ferme solo pour la mettre en ligne, puis invite ton ami.'); return; }
      const c = await appelServeur('/mondes', { corps: { partie: JSON.parse(exportSaveJson()), titre: 'Ma ferme' } });
      if (!c.ok) { notify(`💌 ${c.erreur || 'Ta ferme n\'a pas pu être mise en ligne.'}`); return; }
      monde = c.monde;
      notify('🌐 Ta ferme est en ligne, pour accueillir tes amis (ta partie solo reste ici, telle quelle).');
    }
    const r = await appelServeur(`/mondes/${monde}/inviter-ami`, { corps: { compte } });
    if (r.ok) notify(`✉️ ${(a.prenom)} a reçu ton invitation.`);
    else notify(`💌 ${r.erreur || 'L\'invitation n\'est pas partie.'}`);
  } finally {
    occupe = false;
    dessiner();
  }
}

async function suivreMessage(id) {
  const m = vue && vue.boite.find((x) => String(x.id) === String(id));
  if (!m) return;
  await poster('lu', { ids: [m.id] });
  vue.boite = vue.boite.filter((x) => x !== m);
  dessiner();
  if (m.type === 'invitation' && m.code) location.href = `jeu.html#invitation=${m.code}`;
  else if (m.type === 'visite') inviter(m.de);
}

// Un lien d'ami ouvert (jeu.html#ami=MOON-XXXXX) : la demande part (connecté), sinon elle attend la connexion.
const CLE_AMI = 'ferme-ami';
export async function amiDuLien() {
  const m = /(?:^#|&)ami=(MOON-[2-9A-HJ-NP-Z]{5})/i.exec(typeof location !== 'undefined' ? location.hash : '');
  let code = m ? m[1].toUpperCase() : null;
  if (m) { try { history.replaceState(null, '', location.pathname + location.search); } catch (e) { /* (rien) */ } }
  if (!code) { try { code = localStorage.getItem(CLE_AMI); } catch (e) { code = null; } }
  if (!code) return;
  if (!compteGarde()) {
    try { localStorage.setItem(CLE_AMI, code); } catch (e) { /* (rien) */ }
    notify('💌 Un ami t\'attend : connecte-toi (⚙️ Options › Jeu en ligne) pour devenir amis.', { duree: 8000 });
    return;
  }
  try { localStorage.removeItem(CLE_AMI); } catch (e) { /* (rien) */ }
  await rafraichir();
  const r = await poster('ajouter', { code });
  if (r.ok) notify(r.amis ? '💌 Vous êtes amis !' : '💌 Demande envoyée : elle attend sa réponse.');
  rafraichir();
}
quandConnecte(() => { amiDuLien(); rafraichir(); });
if (typeof window !== 'undefined') window.addEventListener('hashchange', () => { if (/ami=/.test(location.hash)) amiDuLien(); });

async function envoyerCode() {
  const c = document.getElementById('amis-code'), code = c ? c.value.trim() : '';
  if (!code) { notify('Écris d\'abord le code de ton ami (il ressemble à MOON-K7Q2X).'); return; }
  occupe = true;
  dessiner();
  const r = await poster('ajouter', { code });
  occupe = false;
  if (r.ok) {
    notify(r.amis ? '💌 Vous êtes amis !' : r.deja ? '💌 Ta demande attend déjà sa réponse.' : '💌 Demande envoyée : elle attend sa réponse.');
    const c2 = document.getElementById('amis-code');
    if (c2) c2.value = '';
  }
  rafraichir();
}
async function repondre(compte, oui) {
  const r = await poster('repondre', { compte, oui });
  if (r.ok && r.amis) notify('💌 Vous êtes amis !');
  rafraichir();
}
async function message(type, compte, dit) {
  const r = await poster(type, { compte });
  if (r.ok) notify(dit);
}
async function retirer(compte) {
  await poster('retirer', { compte });
  aRetirer = null;
  fiche = null;
  rafraichir();
}
async function copier(texte) {
  try { await navigator.clipboard.writeText(texte); notify('📋 Lien copié : envoie-le à ton ami.'); } catch (e) { notify(`Ton lien : ${texte}`, { duree: 10000 }); }
}
async function partager(texte) {
  try { await navigator.share({ title: 'Moon Bloom Village', text: 'Deviens mon ami dans Moon Bloom Village !', url: texte }); } catch (e) { /* (annulé) */ }
}

registerActions({
  'amis-ouvrir': () => ouvrirAmis(),
  'amis-fermer': () => { ouvert = false; fiche = null; ajout = false; aRetirer = null; dessiner(); },
  'amis-villageois': (target) => { ouvert = false; fiche = null; dessiner(); ouvrirFicheVillageois(target.dataset.id); },
  'amis-fiche': (el) => { fiche = el.dataset.compte; aRetirer = null; dessiner(); },
  'amis-fiche-fermer': () => { fiche = null; aRetirer = null; dessiner(); },
  'amis-ajouter': () => { ajout = true; dessiner(); const c = document.getElementById('amis-code'); if (c) c.focus(); },
  'amis-envoyer': () => envoyerCode(),
  'amis-repondre': (el) => repondre(el.dataset.compte, el.dataset.oui === '1'),
  'amis-inviter': (el) => inviter(el.dataset.compte),
  'amis-rejoindre': (el) => { location.href = `jeu.html?monde=${encodeURIComponent(el.dataset.monde)}`; },
  'amis-visite': (el) => message('visite', el.dataset.compte, '🙋 Demande envoyée : ton ami peut t\'inviter d\'un geste.'),
  'amis-signe': (el) => message('signe', el.dataset.compte, '👋 Signe envoyé !'),
  'amis-retirer': (el) => { aRetirer = el.dataset.compte; dessiner(); },
  'amis-retirer-non': () => { aRetirer = null; dessiner(); },
  'amis-retirer-oui': (el) => retirer(el.dataset.compte),
  'amis-message': (el) => suivreMessage(el.dataset.id),
  'amis-copier': (el) => copier(el.dataset.texte),
  'amis-partager': (el) => partager(el.dataset.texte),
  'amis-connexion': () => { ouvert = false; dessiner(); const b = document.createElement('button'); b.dataset.action = 'open-options'; document.body.appendChild(b); b.click(); b.remove(); },
});

// Au démarrage : le bouton, puis le profil publié (connecté).
export function demarrerAmis() {
  dessiner();
  rafraichir();
  amiDuLien();
}
