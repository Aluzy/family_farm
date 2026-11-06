// en-ligne.js — E-2 : jouer dans un monde en ligne (le serveur : worker/src/monde.mjs).
//
// - Entrer dans un monde, c'est ouvrir jeu.html?monde=<id> (compte connecté : js/ui/compte.js). Au
//   démarrage (rejoindre), le jeu se connecte au monde par une WebSocket, reçoit sa partie et la joue à la
//   place de la partie solo, qui n'est jamais touchée : rien n'est sauvegardé sur l'appareil en ligne
//   (storage.js), et le rattrapage d'absence ne joue pas.
// - F.2 : le monde est figé (loop.js : l'horloge ne tourne pas en ligne). En ligne, on construit ensemble
//   (le mode Construire), l'on cultive le potager (E-5 : labourer, semer, arroser, récolter, la cruche) et
//   l'on s'occupe des bêtes (E-6 : les poules, l'Étable, les tas à prendre) ; tout va droit au coffre
//   commun. E-7 : la cuisine aussi (les recettes, le Moulin, le frigo, la boîte, manger) ; l'horloge
//   figée, une préparation finit pendant la nuit partagée. Les autres gestes de la ferme viendront ensuite (actionPermise).
// - E-5 : la nuit partagée. « 🛏 Se coucher » (le bandeau) le dit au monde ; quand tous les joueurs
//   connectés sont couchés, le monde joue la nuit (nuit.partagee : toute la nuit d'un coup, les plantes
//   poussent) et chacun se réveille au jour suivant.
// - Chaque commande du joueur (commandes.js, executer) est jouée tout de suite sur sa partie et envoyée
//   (js/ui/synchro.js) ; celles des autres arrivent et sont jouées à leur tour. Coupé, le jeu se
//   reconnecte, demande ce qu'il a manqué depuis sa révision et renvoie ses commandes en attente (le
//   monde ne joue pas deux fois la même : leur id).
// - Le bandeau « 🌐 » dit où l'on est, si l'on est à jour, et permet de revenir à sa ferme solo.

import { executerCommande, GAME_VERSION, ICONES_ROLES, NOMS_ROLES, refusDuRole } from '../engine/index.js';
import { adresseServeur, appelServeur, compteGarde, quandConnecte } from './compte.js';
import { closeModal, openModal } from './modal.js';
import { Synchro } from './synchro.js';
import { setEnLigne, setState } from './store.js';
import { notify } from './toasts.js';
import { sonMatin } from './son.js';
import { refresh } from './render.js';
import { registerActions } from './actions.js';
import { brancherEnLigne } from './commandes.js';

// Le monde demandé par l'adresse (jeu.html?monde=…), ou null.
export function mondeDemande() {
  try {
    const m = new URLSearchParams(location.search).get('monde');
    return m && /^m-[A-Za-z0-9_-]{16,40}$/.test(m) ? m : null;
  } catch (e) {
    return null;
  }
}

const RECONNEXION_MS = [1000, 2000, 5000, 10000, 20000];
let lien = null;   // la connexion en cours : { monde, ws, synchro, etat, essais, titre, membres }

// La WebSocket du monde `monde` (la session du compte dans l'adresse : une WebSocket ne porte pas d'en-tête).
function ouvrirWs(monde) {
  const base = adresseServeur(), c = compteGarde();
  if (!base || !c) return null;
  return new WebSocket(`${base.replace(/^http/, 'ws')}/mondes/${monde}/ws?session=${encodeURIComponent(c.session)}`);
}

// Au démarrage, le monde `monde` : sa partie (la locale de la synchro), ou null (pas connecté, refusé,
// injoignable : le jeu reprend la partie solo, avec un message). `delaiMs` : l'attente au plus.
export function rejoindre(monde, delaiMs = 15000) {
  if (!compteGarde()) { notify('🌐 Pour entrer dans un monde en ligne, connecte-toi d\'abord (⚙️ Options › Jeu en ligne).'); return Promise.resolve(null); }
  return new Promise((ok) => {
    let fini = false;
    const finir = (v) => { if (!fini) { fini = true; clearTimeout(minuterie); ok(v); } };
    const minuterie = setTimeout(() => { notify('🌐 Le monde ne répond pas : ta ferme solo s\'ouvre.'); fermer(); finir(null); }, delaiMs);
    lien = { monde, ws: null, synchro: null, etat: 'connexion', essais: 0, titre: '', membres: [], premiere: finir };
    connecter();
  });
}

function connecter() {
  if (!lien) return;
  const ws = ouvrirWs(lien.monde);
  if (!ws) { lien.premiere && lien.premiere(null); return; }
  lien.ws = ws;
  lien.etat = lien.synchro ? 'reconnexion' : 'connexion';
  bandeau();
  ws.addEventListener('open', () => {
    ws.send(JSON.stringify({ t: 'hello', version: GAME_VERSION, ...(lien.synchro ? { depuis: lien.synchro.rev } : {}) }));
  });
  ws.addEventListener('message', (e) => recevoir(ws, e.data));
  ws.addEventListener('close', (e) => {
    if (!lien || lien.ws !== ws) return;
    lien.ws = null;
    if (lien.refuse) return;
    // (E-3 : le propriétaire l'a retiré du monde : retour à la ferme solo)
    if (e && e.code === 4003) {
      lien.refuse = true;
      lien.etat = 'refuse';
      bandeau();
      notify('🌐 Le propriétaire t\'a retiré de ce monde : ta ferme solo s\'ouvre.', { duree: 6000 });
      setTimeout(() => { location.href = 'jeu.html'; }, 3000);
      return;
    }
    if (!lien.synchro) { lien.premiere && lien.premiere(null); notify('🌐 Connexion au monde impossible : ta ferme solo s\'ouvre.'); lien = null; return; }
    lien.etat = 'reconnexion';
    bandeau();
    const d = RECONNEXION_MS[Math.min(lien.essais, RECONNEXION_MS.length - 1)];
    lien.essais += 1;
    setTimeout(connecter, d);
  });
}

function fermer() {
  if (lien && lien.ws) { try { lien.ws.close(); } catch (e) { /* (rien) */ } }
  lien = null;
}

function envoyer(m) {
  if (lien && lien.ws && lien.ws.readyState === 1) { lien.ws.send(JSON.stringify(m)); return true; }
  return false;
}

// Ses commandes en attente, renvoyées (à la reconnexion : le monde ne joue pas deux fois la même).
function renvoyer() {
  if (!lien || !lien.synchro) return;
  for (const c of lien.synchro.enAttente) envoyer({ t: 'cmd', ...c });
}

function recevoir(ws, data) {
  if (!lien || lien.ws !== ws) return;
  let m;
  try { m = JSON.parse(data); } catch (e) { return; }
  if (m.t === 'refus') {
    lien.refuse = true;
    notify(`🌐 ${m.erreur || 'Entrée refusée.'}`);
    if (!lien.synchro) { const p = lien.premiere; lien = null; p && p(null); } else { lien.etat = 'refuse'; bandeau(); }
    return;
  }
  if (m.t === 'bienvenue') {
    lien.titre = m.titre || lien.titre;
    lien.membres = m.membres || [];
    lien.role = m.role;
    lien.moi = m.moi;
    lien.essais = 0;
    lien.couche = false;   // (une nouvelle connexion : levé)
    lien.couches = [];
    derniere = null;
    return;
  }
  // E-5 : qui est couché (et combien sont là)
  if (m.t === 'couches') {
    lien.couches = Array.isArray(m.comptes) ? m.comptes : [];
    lien.connectes = Number(m.connectes) || 0;
    lien.couche = lien.couches.includes(lien.moi);
    bandeau();
    return;
  }
  // E-4 : où regardent les autres (relayé par le monde, jamais écrit) ; leur départ
  if (m.t === 'pos') {
    autres.set(m.acteur, { nom: m.nom, x: m.x, y: m.y, t: Date.now() });
    return;
  }
  if (m.t === 'parti') {
    autres.delete(m.acteur);
    return;
  }
  if (m.t === 'membres') {
    lien.membres = m.membres || [];
    // (E-11 : son rôle a pu changer)
    const moi = lien.membres.find((x) => x.compte === lien.moi);
    if (moi && moi.role !== lien.role) {
      if (lien.role) notify(`🌐 Ton rôle dans ce monde : ${ICONES_ROLES[moi.role] || ''} ${NOMS_ROLES[moi.role] || moi.role}.`, { duree: 6000 });
      lien.role = moi.role;
    }
    bandeau();
    if (document.getElementById('membres-titre')) ouvrirMembres();
    return;
  }
  // E-12 : le propriétaire a restauré une sauvegarde (la partie est arrivée juste avant : instantane)
  if (m.t === 'restaure') {
    notify(`🌐 Le propriétaire a restauré une sauvegarde du monde : jour ${m.jour}.`, { duree: 7000 });
    return;
  }
  if (m.t === 'instantane') {
    if (!lien.synchro) {
      lien.synchro = new Synchro({ partie: m.partie, rev: m.rev, executerCommande, quandRefaite: partieRefaite });
      setEnLigne(lien.synchro);
      lien.etat = 'ok';
      const p = lien.premiere;
      lien.premiere = null;
      p && p(lien.synchro.locale);
    } else {
      lien.synchro.instantane(m);
      lien.etat = 'ok';
    }
    renvoyer();
    bandeau();
    return;
  }
  if (m.t === 'rattrape') {
    for (const e of m.evts || []) if (!lien.synchro.evenement(e)) { toutRedemander(); return; }
    lien.etat = 'ok';
    renvoyer();
    bandeau();
    return;
  }
  if (m.t === 'evt') {
    if (!lien.synchro.evenement(m)) toutRedemander();
    if (m.cmd && m.cmd.type === 'nuit.partagee') matin();
    bandeau();
    return;
  }
  if (m.t === 'ack' && !m.ok) {
    lien.synchro.refusee(m.id);
    notify(`🌐 ${m.erreur || 'Refusé par le monde.'}`);
  }
}

// E-5 : la nuit du monde est passée (tous étaient couchés) : le réveil, au jour suivant.
function matin() {
  lien.couche = false;
  lien.couches = [];
  try { sonMatin(); } catch (e) { /* (le son ne doit rien empêcher) */ }
  const s = lien.synchro && lien.synchro.locale;
  notify(`🌅 Tout le monde a dormi : c'est le jour ${s ? s.day : ''}. Les plantes arrosées ont poussé.`, { duree: 6000 });
}

// « 🛏 Se coucher » : le dire au monde (ou se relever).
function coucher() {
  if (!lien || lien.etat !== 'ok') { notify('🌐 Pas connecté au monde pour l\'instant.'); return; }
  const oui = !lien.couche;
  if (!envoyer({ t: 'coucher', oui })) return;
  lien.couche = oui;
  if (oui && lien.connectes > 1) notify('🛏 Tu es couché. La nuit passera quand tous les joueurs connectés le seront.');
  bandeau();
}

// Un trou dans les événements : la partie entière redemandée (un hello sans révision).
function toutRedemander() {
  envoyer({ t: 'hello', version: GAME_VERSION });
}

// La partie locale refaite (un geste d'un autre joueur, un refus) : le jeu la reprend.
function partieRefaite(locale) {
  setState(locale);
  refresh();
}

// executer (commandes.js), en ligne : la commande jouée sur la partie locale, puis envoyée (si la
// connexion est coupée, elle attend : renvoyée à la reconnexion).
export function jouerEnLigne(cmd) {
  // (E-11 : son rôle dans le monde ne le permet pas : refusé ici, sans attendre le monde, qui le vérifie aussi)
  const refus = lien.role ? refusDuRole(lien.role, lien.synchro.locale, cmd) : null;
  if (refus) return { ok: false, error: `🌐 ${refus}` };
  const r = lien.synchro.jouer(cmd);
  if (r.ok) envoyer({ t: 'cmd', id: cmd.id, type: cmd.type, args: cmd.args });
  bandeau();
  return r;
}

brancherEnLigne(jouerEnLigne);

/* ---------- E-4 : la présence ---------- */

// Les autres joueurs du monde : acteur → { nom, x, y, t } (le centre de leur vue, en px de la carte ; t : la
// dernière fois qu'on l'a reçu). La carte les dessine (js/carte/ferme/presence.js lit window.FermeEnLigne).
const autres = new Map();
if (typeof window !== 'undefined') window.FermeEnLigne = { autres };
// Le centre de sa propre vue, envoyé quand il a bougé, POS_MS au plus souvent (le monde en relaie au plus 5
// par seconde) ; jamais quand rien ne change.
const POS_MS = 200;
let derniere = null;
function envoyerPosition() {
  if (!lien || lien.etat !== 'ok' || !window.FarmStage || !FarmStage.scene) return;
  const sc = FarmStage.scene();
  if (!sc || !sc.cameras || !sc.cameras.main) return;
  const p = sc.cameras.main.midPoint, x = Math.round(p.x), y = Math.round(p.y);
  if (derniere && Math.abs(derniere.x - x) < 2 && Math.abs(derniere.y - y) < 2) return;
  if (envoyer({ t: 'pos', x, y })) derniere = { x, y };
}
if (typeof window !== 'undefined') setInterval(envoyerPosition, POS_MS);

/* ---------- ce qu'on fait en ligne ---------- */

// En ligne, pour l'instant : construire ensemble (les gestes du mode Construire), cultiver le potager (E-5)
// et ce qui ne change pas la partie (ouvrir une fenêtre, lire l'aide, les réglages). `bloquees` : les
// actions qui changent la partie (actions.js, SOMMEIL_BLOQUEES), sauf celles-là. Dormir : par le bandeau.
const CONSTRUIRE = new Set(['bloc', 'bloc-many', 'build-toggle', 'build-pick', 'build-tab', 'build-groupe', 'build-filtre', 'meuble-ok', 'build-level-menu', 'build-level', 'build-piece', 'build-gomme', 'build-tourner', 'build-peindre', 'meuble-peindre', 'build-sens', 'meuble-tourner', 'build-annuler', 'bloc-pipette', 'bloc-deplacer', 'etage-toggle']);
// (E-5 : le potager ; E-6 : les bêtes ; E-7 : la cuisine, le Moulin, le frigo, la boîte, manger ; E-9 : les outils, le verger ; E-10 : la progression, l'Atelier, les appareils, planter un arbre)
const FERME = new Set(['buy-tech', 'atelier-fabriquer', 'bloc-fabriquer', 'build-station', 'toggle', 'upgrade', 'upgrade-tank', 'robot-autonomie', 'maintain', 'repair', 'upgrade-serre', 'arbre-planter', 'arbre-case', 'arbre-oui', 'semis-set', 'silo-agrandir', 'tool-use', 'axe-toggle', 'pick-toggle', 'scythe-toggle', 'rod-toggle', 'harvest-tree', 'start-recipe', 'cancel-queued', 'stop-recipe', 'mill-start', 'mill-cancel', 'eat', 'sac-manger', 'fridge-in', 'fridge-out', 'fridge-in-all', 'fridge-in-urgent', 'frigo-ranger', 'build-fridge', 'upgrade-fridge', 'boite-deposer', 'boite-reprendre', 'feed-hen', 'feed-all', 'shear', 'cow-herbs', 'buy-pasture', 'upgrade-poulailler', 'plant', 'plant-many', 'plant-all', 'water', 'water-many', 'water-all', 'harvest', 'harvest-all', 'hoe', 'hoe-many', 'hoe-toggle', 'hoe-take', 'cruche-remplir']);
const JAMAIS = /^(test-|do-import|do-new-game|ask-new-game|demarrer|accueil-)/;
export function actionPermise(action, bloquees) {
  if (JAMAIS.test(action)) return 'Pas dans un monde en ligne : reviens à ta ferme solo (🌐 › Ma ferme solo).';
  if (action === 'sleep') return 'En ligne, on se couche par le bandeau (🛏 Se coucher) : la nuit passe quand tout le monde dort.';
  if (bloquees.has(action) && !CONSTRUIRE.has(action) && !FERME.has(action)) return 'En ligne, ce geste ne se fait pas encore : il viendra bientôt.';
  return null;
}

/* ---------- le bandeau ---------- */

export function bandeau() {
  if (typeof document === 'undefined') return;
  let el = document.getElementById('en-ligne-bandeau');
  if (!lien) { if (el) el.remove(); return; }
  if (!el) {
    el = document.createElement('div');
    el.id = 'en-ligne-bandeau';
    el.className = 'en-ligne-bandeau';
    el.setAttribute('role', 'status');
    document.body.appendChild(el);
  }
  const etat = { connexion: '⏳ connexion…', reconnexion: '⏳ reconnexion…', ok: '✓ à jour', refuse: '⛔ refusé' }[lien.etat] || '';
  const attente = lien.synchro && lien.synchro.enAttente.length ? ` · ${lien.synchro.enAttente.length} en attente` : '';
  const n = lien.membres.length;
  // (E-5 : se coucher ; combien le sont, quand d'autres sont là)
  const nc = (lien.couches || []).length, total = lien.connectes || 0;
  const lit = `<button class="btn${lien.couche ? ' primary' : ''}" type="button" data-action="monde-coucher" aria-pressed="${!!lien.couche}">🛏 ${lien.couche ? 'Couché' : 'Se coucher'}${total > 1 && nc ? ` ${nc}/${total}` : ''}</button>`;
  const role = lien.role ? `<span title="Ton rôle : ${NOMS_ROLES[lien.role] || lien.role}" aria-label="Ton rôle : ${NOMS_ROLES[lien.role] || lien.role}">${ICONES_ROLES[lien.role] || ''}</span> ` : '';
  el.innerHTML = `<span>🌐 ${role}En ligne · ${etat}${attente}</span>${lit}<button class="btn" type="button" data-action="monde-membres" aria-label="Les membres du monde">👥 ${n}</button><button class="btn" type="button" data-action="monde-quitter">Ma ferme solo</button>`;
}

/* ---------- E-3 : les membres, inviter, retirer ---------- */

const echapper = (t) => String(t).replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]);
let invitation = null, aRetirer = null;
const ROLES_CHOIX = ['batisseur', 'jardinier', 'visiteur'];
// (E-11 : ce que chaque rôle peut faire, en une ligne)
const ROLES_TEXTE = {
  batisseur: 'construit, cultive, s\'occupe des bêtes, cuisine, fait progresser la ferme',
  jardinier: 'cultive, s\'occupe des bêtes, cuisine, se sert des outils ; ne construit pas',
  visiteur: 'regarde, se promène, dort avec vous ; ne change rien',
};
const roleTexte = (r) => `${ICONES_ROLES[r] || ''} ${NOMS_ROLES[r] || r}`;
function ouvrirMembres() {
  if (!lien) return;
  const proprio = lien.role === 'proprietaire';
  const lignes = lien.membres.map((m) => {
    const nom = `${echapper(m.nom)}${m.compte === lien.moi ? ' (toi)' : ''}`;
    if (!proprio || m.role === 'proprietaire') return `<div class="row"><span>${roleTexte(m.role)} · ${nom}</span></div>`;
    const choix = ROLES_CHOIX.map((r) => `<button class="btn${m.role === r ? ' primary' : ''}" type="button" data-action="monde-role" data-compte="${echapper(m.compte)}" data-role="${r}" aria-pressed="${m.role === r}" title="${NOMS_ROLES[r]} : ${ROLES_TEXTE[r]}">${ICONES_ROLES[r]}</button>`).join('');
    const retrait = aRetirer === m.compte ? `<button class="btn danger" type="button" data-action="monde-retirer-oui" data-compte="${echapper(m.compte)}">Oui, le retirer</button><button class="btn" type="button" data-action="monde-retirer-non">Non</button>` : `<button class="btn" type="button" data-action="monde-retirer" data-compte="${echapper(m.compte)}">Retirer</button>`;
    return `<div class="row"><span>${roleTexte(m.role)} · ${nom}</span>${choix}${retrait}</div>`;
  }).join('');
  const inv = !proprio ? '<p class="muted">Seul le propriétaire du monde invite, change les rôles et retire des membres.</p>'
    : invitation ? `<p class="muted">Envoie ce lien à un ami (il vaut 7 jours et ne sert qu'une fois) : en l'ouvrant, il entre dans ton monde comme ${roleTexte(invitation.role).trim().toLowerCase()}.</p>
      <textarea id="invitation-lien" rows="3" readonly>${echapper(invitation.lien)}</textarea>
      <div class="row"><button class="btn" type="button" data-action="monde-copier">Copier</button>${typeof navigator !== 'undefined' && navigator.share ? '<button class="btn" type="button" data-action="monde-partager">Partager</button>' : ''}</div>`
      : `<p class="muted">Inviter un ami : un lien à lui envoyer. Choisis son rôle (tu pourras le changer ensuite).</p>
      <div class="stack">${ROLES_CHOIX.map((r) => `<button class="btn${r === 'batisseur' ? ' primary' : ''}" type="button" data-action="monde-inviter" data-role="${r}">${roleTexte(r)} <span class="muted">· ${ROLES_TEXTE[r]}</span></button>`).join('')}</div>`;
  openModal(`
    <button class="btn modal-close" type="button" data-action="close-modal">Fermer</button>
    <h2 id="membres-titre">👥 Les membres</h2>
    <div class="stack">${lignes}</div>
    <div class="stack">${inv}</div>
    ${proprio ? '<div class="row"><button class="btn" type="button" data-action="monde-journal">📜 Le journal du monde</button><button class="btn" type="button" data-action="monde-sauvegardes">💾 Les sauvegardes</button></div>' : ''}`, { labelledBy: 'membres-titre' });
}

// E-11 : ce qu'un geste du journal a fait, en mots.
const GESTES = {
  'bloc.poser': 'a posé un bloc', 'bloc.reprendre': 'a repris un bloc', 'bloc.remettre': 'a remis un bloc', 'bloc.deplacer': 'a déplacé un bloc',
  'bloc.tourner': 'a tourné un meuble', 'bloc.orienter': 'a tourné un meuble', 'bloc.peindre': 'a repeint un meuble', 'portail.basculer': 'a ouvert ou fermé un portail',
  'potager.planter': 'a semé', 'potager.arroser': 'a arrosé', 'potager.recolter': 'a récolté', 'potager.labourer': 'a labouré',
  'potager.toutPlanter': 'a tout planté', 'potager.toutArroser': 'a tout arrosé', 'potager.toutRecolter': 'a tout récolté', 'potager.semis': 'a réglé un semis',
  'cruche.remplir': 'a rempli la cruche', 'poules.nourrir': 'a nourri une poule', 'poules.toutNourrir': 'a nourri les poules',
  'poulailler.agrandir': 'a agrandi le Poulailler', 'etable.tondre': 'a tondu un mouton', 'etable.herbes': 'a changé le foin des vaches', 'etable.place': 'a acheté une place à l\'Étable',
  'ramassage.prendre': 'a ramassé', 'cuisine.lancer': 'a lancé une recette', 'cuisine.annuler': 'a retiré une préparation', 'cuisine.arreter': 'a arrêté une préparation', 'moulin.moudre': 'a moulu du blé', 'moulin.annuler': 'a repris du blé',
  'frigo.ranger': 'a rangé au frigo', 'frigo.sortir': 'a sorti du frigo', 'frigo.toutRanger': 'a tout rangé au frigo', 'frigo.urgent': 'a mis au frais', 'frigo.acheter': 'a acheté le frigo', 'frigo.agrandir': 'a agrandi le frigo',
  'boite.deposer': 'a garni la boîte', 'boite.reprendre': 'a repris dans la boîte', 'manger': 'a mangé',
  'outil.couper': 'a coupé du bois', 'outil.casser': 'a cassé un rocher', 'outil.caillou': 'a ramassé un caillou', 'outil.faucher': 'a fauché', 'outil.faucherAutour': 'a fauché', 'outil.pecher': 'a pêché', 'verger.cueillir': 'a cueilli des fruits',
  'tech.acheter': 'a acquis une technologie', 'atelier.fabriquer': 'a fabriqué à l\'Atelier', 'atelier.construire': 'a construit un atelier',
  'appareil.basculer': 'a allumé ou éteint un appareil', 'appareil.ameliorer': 'a amélioré un appareil', 'appareil.entretenir': 'a entretenu un appareil', 'appareil.reparer': 'a réparé un appareil',
  'reservoir.agrandir': 'a agrandi le réservoir', 'robot.batterie': 'a agrandi la batterie du robot', 'serre.agrandir': 'a agrandi la Serre', 'arbre.planter': 'a planté un arbre',
  'nuit.partagee': 'tout le monde a dormi : la nuit est passée',
  'monde.restaurer': 'a restauré une sauvegarde',
};
const FAMILLES_GESTES = { mur: 'a bâti un mur', etage: 'a bâti à l\'étage', solEtage: 'a posé un sol à l\'étage' };
export function gesteEnMots(type) {
  return GESTES[type] || FAMILLES_GESTES[String(type).split('.')[0]] || 'a fait un geste';
}
function ilYa(ts) {
  const m = Math.max(0, Math.round((Date.now() - Number(ts)) / 60000));
  if (m < 1) return 'à l\'instant';
  if (m < 60) return `il y a ${m} min`;
  const h = Math.round(m / 60);
  if (h < 24) return `il y a ${h} h`;
  return `il y a ${Math.round(h / 24)} j`;
}
let journalVu = [];
async function ouvrirJournal(suite = false) {
  if (!lien) return;
  const avant = suite && journalVu.length ? journalVu[journalVu.length - 1].rev : null;
  const r = await appelServeur(`/mondes/${lien.monde}/journal${avant ? `?avant=${avant}` : ''}`, { methode: 'GET' });
  if (!r.ok) { notify(`🌐 ${r.erreur || 'Le journal n\'a pas pu être lu.'}`); return; }
  journalVu = suite ? journalVu.concat(r.evts || []) : (r.evts || []);
  const lignes = journalVu.length ? journalVu.map((e) => `<li><strong>${echapper(e.nom)}</strong> ${gesteEnMots(e.type)} <span class="muted">· ${ilYa(e.ts)} · n° ${e.rev}</span></li>`).join('') : '<li class="muted">Rien encore.</li>';
  openModal(`
    <button class="btn modal-close" type="button" data-action="close-modal">Fermer</button>
    <h2 id="journal-titre">📜 Le journal du monde</h2>
    <p class="muted">Qui a fait quoi dans ta ferme, du plus récent au plus ancien.</p>
    <ul class="journal-monde">${lignes}</ul>
    ${(r.evts || []).length >= 50 ? '<div class="row"><button class="btn" type="button" data-action="monde-journal-suite">Plus ancien</button></div>' : ''}
    <div class="row"><button class="btn" type="button" data-action="monde-membres">👥 Les membres</button></div>`, { labelledBy: 'journal-titre' });
}

// E-12 : les sauvegardes du monde (le propriétaire) : une après chaque nuit, d'autres à la demande ; en
// restaurer une remplace la partie du monde pour tous (la partie d'avant est sauvée d'abord).
const RAISONS = { nuit: '🌙 après la nuit', main: '💾 à la main', 'avant-restauration': '↩️ avant une restauration' };
let sauvegardesVues = [], aRestaurer = null;
async function ouvrirSauvegardes(relire = true) {
  if (!lien) return;
  if (relire) {
    const r = await appelServeur(`/mondes/${lien.monde}/sauvegardes`, { methode: 'GET' });
    if (!r.ok) { notify(`🌐 ${r.erreur || 'Les sauvegardes n\'ont pas pu être lues.'}`); return; }
    sauvegardesVues = r.sauvegardes || [];
  }
  const date = (t) => { try { return new Date(t).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' }); } catch (e) { return ''; } };
  const lignes = sauvegardesVues.length ? sauvegardesVues.map((x) => `<li class="row"><span><strong>Jour ${x.jour}</strong> <span class="muted">· ${date(x.t)} · ${RAISONS[x.raison] || x.raison} · n° ${x.rev}</span></span>${aRestaurer === x.cle
    ? `<button class="btn danger" type="button" data-action="monde-restaurer-oui" data-cle="${echapper(x.cle)}">Oui, restaurer</button><button class="btn" type="button" data-action="monde-restaurer-non">Non</button>`
    : `<button class="btn" type="button" data-action="monde-restaurer" data-cle="${echapper(x.cle)}">Restaurer</button>`}</li>`).join('') : '<li class="muted">Aucune encore : la première se fait après la prochaine nuit, ou maintenant.</li>';
  openModal(`
    <button class="btn modal-close" type="button" data-action="close-modal">Fermer</button>
    <h2 id="sauvegardes-titre">💾 Les sauvegardes du monde</h2>
    <p class="muted">Une après chaque nuit, et quand tu veux. Restaurer remet la ferme de tout le monde dans cet état ; la ferme d'avant est sauvée d'abord, tu peux donc revenir en arrière.</p>
    <ul class="journal-monde">${lignes}</ul>
    <div class="row"><button class="btn primary" type="button" data-action="monde-sauvegarder">Sauvegarder maintenant</button><button class="btn" type="button" data-action="monde-membres">👥 Les membres</button></div>`, { labelledBy: 'sauvegardes-titre' });
}
async function sauvegarderMaintenant() {
  if (!lien) return;
  const r = await appelServeur(`/mondes/${lien.monde}/sauvegardes`, {});
  notify(r.ok ? '💾 Le monde est sauvegardé.' : `🌐 ${r.erreur || 'La sauvegarde a échoué.'}`);
  if (r.ok) ouvrirSauvegardes();
}
async function restaurer(cle) {
  if (!lien) return;
  aRestaurer = null;
  const r = await appelServeur(`/mondes/${lien.monde}/restaurer`, { corps: { cle } });
  if (!r.ok) { notify(`🌐 ${r.erreur || 'La restauration a échoué.'}`); ouvrirSauvegardes(false); return; }
  closeModal();
}

async function changerRole(compte, role) {
  if (!lien) return;
  const r = await appelServeur(`/mondes/${lien.monde}/role`, { corps: { compte, role } });
  notify(r.ok ? `🌐 Rôle changé : ${roleTexte(role).trim()}.` : `🌐 ${r.erreur || 'Le rôle n\'a pas pu changer.'}`);
}

async function inviter(role = 'batisseur') {
  if (!lien) return;
  const r = await appelServeur(`/mondes/${lien.monde}/invitations`, { corps: { role } });
  if (!r.ok) { notify(`🌐 ${r.erreur || 'Le lien n\'a pas pu être créé.'}`); return; }
  invitation = { lien: r.lien, role };
  ouvrirMembres();
}

async function retirer(compte) {
  if (!lien) return;
  const r = await appelServeur(`/mondes/${lien.monde}/retirer`, { corps: { compte } });
  aRetirer = null;
  notify(r.ok ? '🌐 Retiré du monde.' : `🌐 ${r.erreur || 'Le retrait a échoué.'}`);
  if (!r.ok) ouvrirMembres();
}

// Un lien d'invitation ouvert (jeu.html#invitation=<monde>.<secret>) : connecté, on entre dans le monde ;
// sinon, il attend la connexion (⚙️ Options › Jeu en ligne). Le fragment est retiré de l'adresse.
const CLE_INVITATION = 'ferme-invitation';
export async function invitationDuLien() {
  const m = /(?:^#|&)invitation=(m-[A-Za-z0-9_-]{16,40}\.[A-Za-z0-9_-]{32})/.exec(typeof location !== 'undefined' ? location.hash : '');
  let code = m ? m[1] : null;
  if (m) { try { history.replaceState(null, '', location.pathname + location.search); } catch (e) { /* (rien) */ } }
  if (!code) { try { code = localStorage.getItem(CLE_INVITATION); } catch (e) { code = null; } }
  if (!code) return;
  if (!compteGarde()) {
    try { localStorage.setItem(CLE_INVITATION, code); } catch (e) { /* (rien) */ }
    notify('🌐 Une invitation t\'attend : connecte-toi (⚙️ Options › Jeu en ligne), et tu entreras dans le monde de ton ami.', { duree: 8000 });
    return;
  }
  try { localStorage.removeItem(CLE_INVITATION); } catch (e) { /* (rien) */ }
  const r = await appelServeur('/rejoindre', { corps: { code } });
  if (!r.ok) { notify(`🌐 ${r.erreur || 'Cette invitation n\'a pas pu servir.'}`); return; }
  notify(`🌐 Bienvenue dans « ${r.titre || 'le monde de ton ami'} » !`);
  setTimeout(() => { location.href = `jeu.html?monde=${encodeURIComponent(r.monde)}`; }, 800);
}
quandConnecte(() => { invitationDuLien(); });
if (typeof window !== 'undefined') window.addEventListener('hashchange', () => { if (/invitation=/.test(location.hash)) invitationDuLien(); });

registerActions({
  // (la partie solo, intacte sur l'appareil, rouverte)
  'monde-quitter': () => { fermer(); location.href = 'jeu.html'; },
  'monde-coucher': () => { coucher(); },
  'monde-membres': () => { invitation = null; aRetirer = null; ouvrirMembres(); },
  'monde-inviter': (target) => { inviter(target && target.dataset && target.dataset.role); },
  'monde-role': (target) => { changerRole(target.dataset.compte, target.dataset.role); },
  'monde-journal': () => { ouvrirJournal(); },
  'monde-sauvegardes': () => { aRestaurer = null; ouvrirSauvegardes(); },
  'monde-sauvegarder': () => { sauvegarderMaintenant(); },
  'monde-restaurer': (target) => { aRestaurer = target.dataset.cle; ouvrirSauvegardes(false); },
  'monde-restaurer-non': () => { aRestaurer = null; ouvrirSauvegardes(false); },
  'monde-restaurer-oui': (target) => { restaurer(target.dataset.cle); },
  'monde-journal-suite': () => { ouvrirJournal(true); },
  'monde-copier': () => {
    const z = document.getElementById('invitation-lien');
    if (!z) return;
    z.select();
    try { navigator.clipboard.writeText(z.value).then(() => notify('📋 Lien copié.'), () => notify('Le lien est sélectionné : copie-le.')); } catch (e) { notify('Le lien est sélectionné : copie-le.'); }
  },
  'monde-partager': () => { try { navigator.share({ title: 'Ferme Familiale', text: 'Viens dans ma ferme !', url: invitation && invitation.lien }); } catch (e) { /* (rien) */ } },
  'monde-retirer': (target) => { aRetirer = target.dataset.compte; ouvrirMembres(); },
  'monde-retirer-non': () => { aRetirer = null; ouvrirMembres(); },
  'monde-retirer-oui': (target) => { retirer(target.dataset.compte); },
});

// (pour les tests) la connexion en cours
export const _lien = () => lien;
