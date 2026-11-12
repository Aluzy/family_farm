// Les gemmes (jeu en ligne) : les gemmes 💎 et ce qu'elles achètent (les rosiers grimpants, les papiers peints).
//
// - Connecté (⚙️ Options › Jeu en ligne), la carte du joueur montre son solde de gemmes, sous les pièces : un
//   appui ouvre la boutique. Le solde est sur le serveur (worker/src/boutique.mjs), jamais dans la partie.
// - Acheter des gemmes : un pack, puis la question réservée aux adultes (une multiplication), l'accord de
//   livraison immédiate (sans droit de rétractation, comme pour tout contenu numérique livré tout de suite) et
//   le lien vers les conditions de vente ; le serveur ouvre une page de paiement de Stripe, où l'on va (jamais
//   de carte saisie dans le jeu). Au retour (jeu.html#boutique=ok), le solde est relu jusqu'à ce que les gemmes
//   soient arrivées (Stripe prévient le serveur, qui les crédite).
// - Acheter un rosier (25 💎) : le serveur débite les gemmes et prépare la livraison ; le jeu met le rosier dans
//   l'inventaire de la partie solo (il se pose ensuite avec 🔨 Construire, onglet Jardin, sur la face d'un mur
//   côté jardin), puis confirme la livraison. Les livraisons déjà reçues sont notées sur l'appareil (jamais deux
//   fois) ; dans un monde partagé, elles attendent le retour dans sa ferme.
// - Acheter une guirlande lumineuse (60 💎) : un lot de 8 segments (DATA.OBJETS[].lot) livré dans l'inventaire ;
//   ils se posent en haut des façades et s'allument le soir.
// - Acheter une cheminée (120 💎) : livrée dans l'inventaire, un meuble de deux cases ; son feu s'allume le soir.
// - Acheter un papier peint (40 💎) : livré de même, son objet reste dans l'inventaire ; le motif est débloqué pour
//   toujours, posé et retiré à volonté avec l'outil 🧻 de 🔨 Construire, dans les pièces closes (js/engine/papiers.js).
// - Mode test (une clé de test de Stripe) : un bandeau le dit, avec la carte de test de Stripe.

import { addItem, countItem } from '../engine/index.js';
import { DATA } from '../engine/catalog.js';
import { registerActions } from './actions.js';
import { appelServeur, compteGarde, quandConnecte } from './compte.js';
import { mondeActuel } from './en-ligne.js';
import { fournirGemmes } from './gemmes-solde.js';
import { closeModal, modalDialog, openModal } from './modal.js';
import { state } from './store.js';
import { persistState } from './storage.js';
import { notify } from './toasts.js';

const LIVRES = 'ferme-gemmes-livres';
const COLORIS = ['multicolore', 'rouge', 'blanc', 'jaune'];
const echapper = (t) => String(t ?? '').replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]);
const euros = (c) => (c / 100).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' });

let vue = null;            // la dernière réponse du serveur : { ouverte, mode, packs, articles, solde, aLivrer }
let ecran = 'gemmes';      // l'onglet ouvert : 'gemmes', 'rosiers', 'deco' (les lumières), 'papiers' ou 'ensembles'
let choix = null;          // le pack choisi (l'étape du paiement)
let question = null;       // la question réservée aux adultes : { a, b }
let occupe = false, erreur = '';
let reponse = '', coche = false;   // (ce qui est saisi, gardé quand la fenêtre se redessine)

/* ---------- le solde, sur la carte du joueur ---------- */

// Le bouton du solde (sous les pièces), ou rien sans compte. (js/ui/stage-windows.js renderIndicators, par
// js/ui/gemmes-solde.js)
export function gemmesHtml() {
  if (!compteGarde()) return '';
  const n = vue ? vue.solde : null;
  const titre = n === null ? 'Ouvrir les gemmes' : `${n} gemme${n > 1 ? 's' : ''}. Ouvrir les gemmes`;
  return `<button type="button" class="player-gemmes" data-action="gemmes-ouvrir" title="${titre}" aria-label="${titre}">` +
    `<span aria-hidden="true">💎</span><span class="player-gemmes-n">${n === null ? '…' : n}</span></button>`;
}

async function lire() {
  if (!compteGarde()) { vue = null; return null; }
  const r = await appelServeur('/compte/boutique', { methode: 'GET' });
  if (r.ok) { vue = r; erreur = ''; livrer(); } else if (r.statut === 401) vue = null; else erreur = r.erreur || '';
  return vue;
}

/* ---------- les livraisons ---------- */

function livres() {
  try { const l = JSON.parse(localStorage.getItem(LIVRES) || '[]'); return Array.isArray(l) ? l : []; } catch (e) { return []; }
}
// Les rosiers achetés et pas encore livrés : dans l'inventaire de la partie solo (pas dans un monde partagé),
// une fois chacun, puis confirmés au serveur.
async function livrer() {
  if (!vue || !(vue.aLivrer || []).length || mondeActuel()) return;
  const deja = new Set(livres()), faits = [];
  for (const l of vue.aLivrer) {
    if (!deja.has(l.id)) {
      if (!DATA.OBJETS[l.article]) continue;
      const O = DATA.OBJETS[l.article];
      if (O.contenu) { for (const [k, n] of Object.entries(O.contenu)) if (DATA.OBJETS[k]) addItem(state, k, n); }   // (un ensemble : ce qu'il contient)
      else addItem(state, l.article, O.lot || 1);
      if (DATA.OBJETS[l.article].avec && DATA.OBJETS[DATA.OBJETS[l.article].avec]) addItem(state, DATA.OBJETS[l.article].avec, 1);   // (l'enseigne et sa boîte aux lettres)
      deja.add(l.id);
      notify(DATA.OBJETS[l.article].contenu
        ? `🛋️ ${DATA.OBJETS[l.article].nom} : tout est dans ton inventaire (le lit, le chevet, le tapis, le tableau, le plancher, et le papier peint débloqué). Meuble une chambre avec 🔨 Construire : onglet Meubles, Bâtir pour le plancher, 🧻 pour le papier.`
        : String(l.article).startsWith('chalet_') || DATA.OBJETS[l.article].lot && DATA.ATELIER.BLOCS[l.article] && DATA.ATELIER.BLOCS[l.article].sol
        ? `🛋️ ${DATA.OBJETS[l.article].nom}${DATA.OBJETS[l.article].lot ? ` (${DATA.OBJETS[l.article].lot})` : ''} : dans ton inventaire. Pose-le avec 🔨 Construire (${DATA.ATELIER.BLOCS[l.article] && DATA.ATELIER.BLOCS[l.article].sol ? 'onglet Bâtir' : 'onglet Meubles'}).`
        : DATA.OBJETS[l.article].papier
        ? `🧻 ${DATA.OBJETS[l.article].nom} : débloqué. Pose-le avec 🔨 Construire, outil 🧻, en touchant une pièce close.`
        : String(l.article).startsWith('enseigne_')
        ? `🪧 ${DATA.OBJETS[l.article].nom} et sa boîte aux lettres : dans ton inventaire. Pose-les dehors avec 🔨 Construire (onglet Jardin) : le nom de ta famille s'écrit sur l'enseigne. 🎨 change leur couleur.`
        : String(l.article).startsWith('ornement_')
        ? `🌳 ${DATA.OBJETS[l.article].nom} : dans ton inventaire. Plante-le dehors avec 🔨 Construire (onglet Jardin) : il prend deux cases sur deux.`
        : String(l.article).startsWith('fontaine_')
        ? `⛲ ${DATA.OBJETS[l.article].nom} : dans ton inventaire. Pose-la dehors avec 🔨 Construire (onglet Jardin) : elle prend deux cases sur deux et son eau coule jour et nuit.`
        : String(l.article).startsWith('cheminee_')
        ? `🔥 ${DATA.OBJETS[l.article].nom} : dans ton inventaire. Pose-la dans une pièce avec 🔨 Construire (onglet Meubles) : son feu s'allume le soir.`
        : DATA.OBJETS[l.article].lot
        ? `✨ ${DATA.OBJETS[l.article].nom} : ${DATA.OBJETS[l.article].lot} segments dans ton inventaire. Pose-les avec 🔨 Construire (onglet Jardin), en haut des façades : ils s'allument le soir.`
        : `🌹 ${DATA.OBJETS[l.article].nom} : dans ton inventaire. Pose-le avec 🔨 Construire (onglet Jardin), sur un mur côté jardin.`, { duree: 7000 });
    }
    faits.push(l.id);
  }
  try { localStorage.setItem(LIVRES, JSON.stringify([...deja].slice(-300))); } catch (e) { /* (plein) */ }
  persistState();
  const r = await appelServeur('/compte/boutique/livre', { corps: { ids: faits } });
  if (r.ok) vue.aLivrer = vue.aLivrer.filter((l) => !faits.includes(l.id));
}

/* ---------- la fenêtre ---------- */

function bandeauTest() {
  if (!vue || vue.mode !== 'test') return '';
  return `<p class="gemmes-test">🧪 <b>Mode test</b> : aucun vrai paiement. Sur la page de Stripe, la carte de test <b>4242 4242 4242 4242</b>, une date future et n'importe quel code.</p>`;
}

function packsHtml() {
  const P = vue.packs || {};
  return `<div class="gemmes-packs">${Object.entries(P).map(([id, p]) =>
    `<button type="button" class="gemmes-pack${choix === id ? ' choisi' : ''}" data-action="gemmes-pack" data-pack="${id}">` +
      `<span class="gemmes-pack-g">💎 ${p.gemmes}</span><span class="gemmes-pack-p">${euros(p.centimes)}</span></button>`).join('')}</div>`;
}

function paiementHtml() {
  if (!choix || !vue.packs[choix]) return '<p class="gemmes-aide">Choisis un pack de gemmes.</p>';
  const p = vue.packs[choix];
  return `<div class="gemmes-payer">
    <p><b>${p.gemmes} gemmes pour ${euros(p.centimes)}</b>, payées sur la page sécurisée de Stripe.</p>
    <label class="gemmes-adulte">Réservé aux adultes : combien font ${question.a} × ${question.b} ?
      <input id="gemmes-reponse" type="text" inputmode="numeric" autocomplete="off" maxlength="4" size="4" value="${echapper(reponse)}"></label>
    <label class="gemmes-case"><input type="checkbox" id="gemmes-renonce"${coche ? ' checked' : ''}> Je veux recevoir les gemmes tout de suite et je renonce à mon droit de rétractation pour ce contenu numérique. J'accepte les <a href="cgv.html" target="_blank" rel="noopener">conditions de vente</a>.</label>
    <button type="button" class="btn primary" data-action="gemmes-payer"${occupe ? ' disabled' : ''}>${occupe ? 'Ouverture du paiement…' : `Payer ${euros(p.centimes)}`}</button>
  </div>`;
}

function rosiersHtml() {
  const A = vue.articles || {};
  return `<div class="gemmes-rosiers">${Object.entries(A).filter(([id]) => id.startsWith('rosier_')).map(([id, a]) => {
    const f = COLORIS.indexOf(String(id).replace('rosier_', ''));
    const ok = vue.solde >= a.prix;
    return `<div class="gemmes-rosier">
      <span class="gemmes-rosier-img" style="--f:${Math.max(0, f)}" aria-hidden="true"></span>
      <span class="gemmes-rosier-nom">${echapper(a.nom)}</span>
      <button type="button" class="btn${ok ? ' primary' : ''}" data-action="gemmes-acheter" data-article="${id}"${!ok || occupe ? ' disabled' : ''}>💎 ${a.prix}</button>
    </div>`;
  }).join('')}</div>
  <p class="gemmes-aide">Un rosier acheté arrive dans ton inventaire : pose-le avec 🔨 Construire (onglet Jardin), sur la face d'un mur côté jardin. Il grimpe sur toute la hauteur du mur.</p>`;
}

// Les papiers peints : leur échantillon (assets/papiers_peints.png), leur nom, leur prix ; un motif déjà débloqué
// (son objet dans l'inventaire, ou en route) ne se rachète pas.
function papiersHtml() {
  const A = vue.articles || {}, motifs = Object.keys(DATA.PAPIERS_PEINTS || {});
  const enRoute = new Set((vue.aLivrer || []).map((l) => l.article));
  return `<div class="gemmes-papiers">${Object.entries(A).filter(([id]) => id.startsWith('papier_peint_')).map(([id, a]) => {
    const f = motifs.findIndex((m) => DATA.PAPIERS_PEINTS[m].objet === id);
    const a_deja = countItem(state, id) > 0 || enRoute.has(id);
    const ok = !a_deja && vue.solde >= a.prix;
    return `<div class="gemmes-papier">
      <span class="gemmes-papier-img" style="--f:${Math.max(0, f)}" aria-hidden="true"></span>
      <span class="gemmes-rosier-nom">${echapper(a.nom)}</span>
      <button type="button" class="btn${ok ? ' primary' : ''}" data-action="gemmes-acheter" data-article="${id}"${!ok || occupe ? ' disabled' : ''}>${a_deja ? '✓ Débloqué' : `💎 ${a.prix}`}</button>
    </div>`;
  }).join('')}</div>
  <p class="gemmes-aide">Un papier peint acheté est débloqué pour toujours : avec 🔨 Construire, l'outil 🧻, touche une pièce close et tous ses murs du fond le prennent, en bas comme à l'étage. Le changer ou le retirer est gratuit.</p>`;
}

// Les décorations (les guirlandes lumineuses, les cheminées, les fontaines, les arbres d'ornement, les enseignes) : leur dessin allumé sur un fond de nuit, leur
// nom, leur prix (un lot : le nombre de pièces).
function decorationsHtml() {
  const A = vue.articles || {}, rangs = ['blanche', 'multicolore', 'etoiles', 'coeurs'];
  return `<div class="gemmes-papiers">${Object.entries(A).filter(([id]) => id.startsWith('guirlande_') || id.startsWith('cheminee_') || id.startsWith('fontaine_') || id.startsWith('ornement_') || id.startsWith('enseigne_')).map(([id, a]) => {
    const ok = vue.solde >= a.prix;
    const img = id.startsWith('cheminee_') || id.startsWith('fontaine_') || id.startsWith('ornement_') || id.startsWith('enseigne_')
      ? `<img class="gemmes-${id.startsWith('fontaine_') ? 'fontaine' : id.startsWith('ornement_') ? 'ornement' : id.startsWith('enseigne_') ? 'enseigne' : 'cheminee'}-img" src="assets/meuble_${id}.png" alt="" draggable="false">`
      : `<span class="gemmes-deco-img" style="--r:${Math.max(0, rangs.indexOf(id.replace('guirlande_', '')))}" aria-hidden="true"></span>`;
    return `<div class="gemmes-papier">
      ${img}
      <span class="gemmes-rosier-nom">${echapper(a.nom)}</span>
      <button type="button" class="btn${ok ? ' primary' : ''}" data-action="gemmes-acheter" data-article="${id}"${!ok || occupe ? ' disabled' : ''}>💎 ${a.prix}</button>
    </div>`;
  }).join('')}</div>
  <p class="gemmes-aide">Une guirlande arrive en lot de 8 segments : pose-les avec 🔨 Construire (onglet Jardin), en haut des façades, côté jardin. Ils se raccordent d'un mur à l'autre et scintillent dès que le soir tombe. Une cheminée se pose dans une pièce de la maison (onglet Meubles) : son feu s'allume le soir. Une fontaine se pose dehors, dans le jardin (onglet Jardin, deux cases sur deux) : son eau coule jour et nuit. Un arbre d'ornement se plante aussi dehors (deux cases sur deux) : ses pétales, ses feuilles tombent doucement. Une enseigne de ferme arrive avec sa boîte aux lettres : le nom de ta famille s'y écrit, et 🎨 leur donne cinq couleurs.</p>`;
}

// Les ensembles à thème pour une pièce : l'ensemble (sa remise, ce qu'il contient), puis chacun de ses objets seul.
function ensemblesHtml() {
  const A = vue.articles || {};
  const bouton = (id, a) => {
    const ok = vue.solde >= a.prix;
    return `<button type="button" class="btn${ok ? ' primary' : ''}" data-action="gemmes-acheter" data-article="${id}"${!ok || occupe ? ' disabled' : ''}>💎 ${a.prix}</button>`;
  };
  const image = (k) => (DATA.ATELIER.BLOCS[k] && DATA.ATELIER.BLOCS[k].meuble ? `<img class="gemmes-ensemble-img" src="assets/meuble_${k}.png" alt="" draggable="false">` : `<span class="gemmes-ensemble-icone" aria-hidden="true">${(DATA.OBJETS[k] || {}).icone || '🎁'}</span>`);
  return Object.entries(A).filter(([id]) => id.startsWith('ensemble_')).map(([id, a]) => {
    const C = (DATA.OBJETS[id] || {}).contenu || {};
    const seuls = Object.keys(C).filter((k) => A[k]);
    const total = seuls.reduce((n, k) => n + A[k].prix, 0);
    return `<div class="gemmes-ensemble">
      <div class="gemmes-papier"><span class="gemmes-rosier-nom"><b>${echapper(a.nom)}</b>${total > a.prix ? `<br><small>au lieu de 💎 ${total} pièce par pièce (−${Math.round((1 - a.prix / total) * 100)} %)</small>` : ''}</span>${bouton(id, a)}</div>
      <div class="gemmes-papiers">${seuls.map((k) => `<div class="gemmes-papier">${image(k)}<span class="gemmes-rosier-nom">${echapper(A[k].nom)}</span>${bouton(k, A[k])}</div>`).join('')}</div>
    </div>`;
  }).join('') + `<p class="gemmes-aide">Un ensemble meuble toute une chambre d'un seul style : le lit, le chevet et sa lampe qui s'allume le soir, le tapis, le tableau, 24 lames de plancher et le papier peint, débloqué pour toujours. Chaque objet s'achète aussi seul.</p>`;
}

function contenu() {
  if (!compteGarde()) return `<p>Les gemmes sont réservées au jeu en ligne : connecte-toi d'abord (⚙️ Options › Jeu en ligne).</p>
    <button type="button" class="btn primary" data-action="gemmes-connexion">Me connecter</button>`;
  if (!vue) return `<p>${erreur ? echapper(erreur) : 'Chargement…'}</p>`;
  if (!vue.ouverte) return '<p>L\'achat de gemmes n\'est pas encore ouvert.</p>';
  return `${bandeauTest()}
    <p class="gemmes-solde">Tes gemmes : <b>💎 ${vue.solde}</b></p>
    <div class="gemmes-onglets" role="tablist">
      <button type="button" role="tab" aria-selected="${ecran === 'gemmes'}" class="gemmes-onglet${ecran === 'gemmes' ? ' actif' : ''}" data-action="gemmes-onglet" data-ecran="gemmes">💎 Gemmes</button>
      <button type="button" role="tab" aria-selected="${ecran === 'rosiers'}" class="gemmes-onglet${ecran === 'rosiers' ? ' actif' : ''}" data-action="gemmes-onglet" data-ecran="rosiers">🌹 Rosiers grimpants</button>
      <button type="button" role="tab" aria-selected="${ecran === 'deco'}" class="gemmes-onglet${ecran === 'deco' ? ' actif' : ''}" data-action="gemmes-onglet" data-ecran="deco">✨ Lumières</button>
      <button type="button" role="tab" aria-selected="${ecran === 'papiers'}" class="gemmes-onglet${ecran === 'papiers' ? ' actif' : ''}" data-action="gemmes-onglet" data-ecran="papiers">🧻 Papiers peints</button>
      <button type="button" role="tab" aria-selected="${ecran === 'ensembles'}" class="gemmes-onglet${ecran === 'ensembles' ? ' actif' : ''}" data-action="gemmes-onglet" data-ecran="ensembles">🛋️ Ensembles</button>
    </div>
    ${ecran === 'gemmes' ? packsHtml() + paiementHtml() : ecran === 'papiers' ? papiersHtml() : ecran === 'ensembles' ? ensemblesHtml() : ecran === 'deco' ? decorationsHtml() : rosiersHtml()}
    ${erreur ? `<p class="gemmes-erreur" role="alert">${echapper(erreur)}</p>` : ''}`;
}

function dessiner() {
  const d = modalDialog();
  if (!d || d.id !== 'gemmes') return;
  const c = d.querySelector('.gemmes-corps');
  if (c) c.innerHTML = contenu();
}

async function ouvrirGemmes() {
  erreur = '';
  openModal(`<h2 id="gemmes-titre">💎 Gemmes</h2>
    <div class="gemmes-corps">${contenu()}</div>
    <button type="button" class="btn" data-action="close-modal" id="gemmes-fermer">Fermer</button>`, { labelledBy: 'gemmes-titre', id: 'gemmes', className: 'modal bois gemmes', focus: '#gemmes-fermer' });
  await lire();
  dessiner();
}

function nouvelleQuestion() {
  const r = () => 6 + Math.floor(Math.random() * 7);
  question = { a: r(), b: r() };
}

async function payer() {
  if (occupe || !choix) return;
  reponse = String((document.getElementById('gemmes-reponse') || {}).value || '').trim();
  coche = !!(document.getElementById('gemmes-renonce') || {}).checked;
  if (Number(reponse) !== question.a * question.b || !reponse) { erreur = 'La réponse n\'est pas la bonne : demande à un adulte.'; reponse = ''; nouvelleQuestion(); dessiner(); return; }
  const renonce = coche;
  if (!renonce) { erreur = 'Coche la case de livraison immédiate pour continuer.'; dessiner(); return; }
  occupe = true; erreur = ''; dessiner();
  const r = await appelServeur('/compte/boutique/payer', { corps: { pack: choix, adulte: true, renonce: true } });
  occupe = false;
  if (r.ok && /^https:\/\/checkout\.stripe\.com\//.test(r.url || '')) { location.href = r.url; return; }
  erreur = r.erreur || 'Le paiement n\'a pas pu s\'ouvrir.';
  dessiner();
}

async function acheter(article) {
  if (occupe) return;
  occupe = true; erreur = ''; dessiner();
  const r = await appelServeur('/compte/boutique/acheter', { corps: { article } });
  occupe = false;
  if (r.ok) {
    vue.solde = r.solde;
    vue.aLivrer = [...(vue.aLivrer || []), r.livraison];
    await livrer();
    if (mondeActuel()) notify('🌹 Rosier acheté : il arrivera dans ton inventaire à ton retour dans ta ferme.');
  } else erreur = r.erreur || 'L\'achat n\'a pas pu se faire.';
  dessiner();
}

// Le retour de la page de paiement (jeu.html#boutique=ok ou =annule) : le solde relu jusqu'à l'arrivée des gemmes.
async function retourPaiement() {
  const m = /(?:^#|&)boutique=(ok|annule)/.exec(typeof location !== 'undefined' ? location.hash : '');
  if (!m) return;
  try { history.replaceState(null, '', location.pathname + location.search); } catch (e) { /* (rien) */ }
  if (m[1] === 'annule') { notify('Paiement annulé : rien n\'a été débité.'); return; }
  notify('💎 Merci ! Tes gemmes arrivent…');
  const avant = vue ? vue.solde : 0;
  for (let k = 0; k < 8; k++) {
    await lire();
    if (vue && vue.solde > avant) { notify(`💎 Gemmes reçues : tu en as ${vue.solde}.`); return; }
    await new Promise((ok) => setTimeout(ok, 2500));
  }
  notify('Le paiement est en cours de confirmation : tes gemmes apparaîtront dans un instant.', { duree: 7000 });
}

registerActions({
  'gemmes-ouvrir': () => ouvrirGemmes(),
  'gemmes-onglet': (el) => { ecran = ['rosiers', 'papiers', 'deco', 'ensembles'].includes(el.dataset.ecran) ? el.dataset.ecran : 'gemmes'; erreur = ''; dessiner(); },
  'gemmes-pack': (el) => { choix = el.dataset.pack; erreur = ''; reponse = ''; coche = false; nouvelleQuestion(); dessiner(); },
  'gemmes-payer': () => payer(),
  'gemmes-acheter': (el) => acheter(el.dataset.article),
  'gemmes-connexion': () => { closeModal(); const b = document.createElement('button'); b.dataset.action = 'open-options'; document.body.appendChild(b); b.click(); b.remove(); },
});

fournirGemmes(gemmesHtml);

// Au démarrage : le solde (connecté), les livraisons en attente, le retour d'un paiement.
export function demarrerGemmes() {
  quandConnecte(() => lire());
  lire().then(() => retourPaiement());
}
