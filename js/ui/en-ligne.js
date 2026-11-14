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
// - I9a2, l'horloge commune d'une île (D13 : horlogeVivante, js/engine/temps-monde.js ; la note :
//   docs/fiches/ile/I9a2-note-horloge.md) : F.2 ne vaut plus pour elle. Le temps passe par pas de 5 s d'horloge, que
//   chacun joue chez lui à l'heure du serveur (horlogeEnLigne, à chaque image : js/ui/loop.js ; la synchro :
//   js/ui/synchro.js) ; la nuit vient seule à 22 h ; tous couchés, elle file dix fois plus vite ; sans joueur, le
//   monde dort, et le dit au retour. Chacun a son énergie (la partie du monde la range par compte).
// - I9a, l'île partagée (le chantier allumé pour la partie du monde : ilePartagee, js/engine/frontiere.js) : le
//   personnage sort de la ferme et la vue le suit (js/ui/stage.js) ; chacun voit le relief de l'île, tiré chez
//   lui de la graine ; son brouillard est à lui (gardé dans son navigateur, par monde : brouillard).
// - I9b, les changements de l'île : hors de la ferme, on récolte (monde.recolter), on pêche et l'on pose des chemins
//   par le monde, comme sur la ferme ; ce qu'un geste lâche va au coffre commun ; un geste qui n'a pas de sens dehors
//   est refusé ici, avant d'être envoyé, comme le monde le refuserait. Le monde relaie les positions des joueurs
//   proches à leur pas, celles des joueurs loin plus rarement (l'intérêt par région : worker/src/monde.mjs).
// - I9c, le port et la caisse : au port, chacun vend ce qu'il a porté (sa charge, la sienne : synchro.js), la caisse
//   est commune ; ce qu'un autre vend, achète, livre ou bâtit au port se dit (le bilan de l'événement : commerceEnMots),
//   et le journal du monde le garde, avec son auteur.

import { clockHours, DATA, empreintePartie, executerCommande, GAME_VERSION, ICONES_ROLES, ilePartagee, memberPerso, NOMS_ROLES, pasDe, refusDuRole, refusFrontiere, unirVu, validApparence } from '../engine/index.js';
import { adresseServeur, appelServeur, compteGarde, personnageSolo, prenomJoueur, quandConnecte } from './compte.js';
import { closeModal, openModal } from './modal.js';
import { Synchro } from './synchro.js';
import { setEnLigne, setPasEnLigne, setState } from './store.js';
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
  return new WebSocket(`${base.replace(/^http/, 'ws')}/mondes/${monde}/ws?session=${encodeURIComponent(c.session)}&prenom=${encodeURIComponent(prenomJoueur())}`);
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
    window.FermeEnLigne.moi = monLook();
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
    lien.helloT = Date.now();
    // (I9a2 : le pas de sa partie confirmée : trop en retard, le monde envoie la partie entière)
    ws.send(JSON.stringify({ t: 'hello', version: GAME_VERSION, ...(lien.synchro ? { depuis: lien.synchro.rev, pas: pasDe(lien.synchro.confirmee) } : {}) }));
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
  if (typeof window !== 'undefined' && window.FermeEnLigne) window.FermeEnLigne.moi = null;
}

// Les amis (amis.js) : le monde où l'on joue, et son rôle dedans ; null en solo.
export function mondeActuel() {
  return lien && lien.etat !== 'refuse' ? { monde: lien.monde, role: lien.role || null, titre: lien.titre || '' } : null;
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
    // (I9a2 : l'horloge du monde, et l'heure du serveur : son avance sur la nôtre, la moitié de l'aller-retour comprise)
    lien.horloge = m.horloge || null;
    if (m.horloge && Number.isFinite(m.horloge.maintenant)) {
      const now = Date.now(), rtt = Math.max(0, now - (lien.helloT || now));
      lien.decalage = m.horloge.maintenant + rtt / 2 - now;
    }
    lien.dormait = m.horloge && m.horloge.dormait > 0 ? m.horloge.dormait : null;
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
  // E-4 : où regardent les autres (relayé par le monde, jamais écrit) ; leur départ. I9b : en entrant dans une région,
  // les joueurs qui y sont, en un lot.
  if (m.t === 'lot') {
    for (const p of Array.isArray(m.pos) ? m.pos : []) if (p && p.t === 'pos') recevoir(ws, JSON.stringify(p));
    return;
  }
  if (m.t === 'pos') {
    const a = autres.get(m.acteur) || { nom: '', look: null, ech: [], t: 0 };
    a.nom = m.nom;
    if (m.look) a.look = lookValide(m.look);
    a.t = Date.now();
    // (après un arrêt, rien n'a été envoyé : il repart de là où il était il y a un instant, pas de la
    // dernière fois qu'il a bougé)
    const der = a.ech[a.ech.length - 1];
    if (der && a.t - der.t > 2 * POS_MS) a.ech.push({ ...der, t: a.t - POS_MS });
    a.ech.push({ t: a.t, x: m.x, y: m.y, h: Number(m.h) || 0, img: typeof m.img === 'string' ? m.img : '', flip: !!m.flip });
    if (a.ech.length > ECH_MAX) a.ech.shift();
    autres.set(m.acteur, a);
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
    lien.rattrapage = false;
    const horloge = m.horloge || lien.horloge;
    if (!lien.synchro) {
      lien.synchro = new Synchro({ partie: m.partie, rev: m.rev, executerCommande, quandRefaite: partieRefaite, moi: lien.moi, horloge });
      poserBrouillard(lien.synchro.locale);
      setEnLigne(lien.synchro);
      lien.etat = 'ok';
      const p = lien.premiere;
      lien.premiere = null;
      p && p(lien.synchro.locale);
    } else {
      lien.synchro.instantane({ ...m, horloge });
      lien.etat = 'ok';
    }
    renvoyer();
    reveilDuMonde();
    bandeau();
    return;
  }
  if (m.t === 'rattrape') {
    for (const e of m.evts || []) if (!lien.synchro.evenement(e)) { toutRedemander(); return; }
    // (I9a2 : puis la confirmée jusqu'au pas du monde)
    if (lien.horloge) lien.synchro.ancrer(lien.horloge);
    lien.etat = 'ok';
    renvoyer();
    reveilDuMonde();
    bandeau();
    return;
  }
  if (m.t === 'evt') {
    if (!lien.synchro.evenement(m)) toutRedemander();
    // (I9c : ce qu'un autre a fait au port, dit à chacun ; la caisse est commune)
    if (m.bilan && m.acteur !== lien.moi && m.cmd) {
      const qui = (lien.membres.find((x) => x.compte === m.acteur) || {}).nom || 'Un joueur';
      notify(`${qui} ${commerceEnMots(m.cmd.type, m.bilan, true)}`, { kind: 'info', duree: 6000 });
    }
    if (m.cmd && m.cmd.type === 'nuit.partagee') matin();
    bandeau();
    return;
  }
  // I9a2 : l'instantané au temps du monde : l'empreinte de sa partie à ce pas ; la nôtre diffère, tout est redemandé
  if (m.t === 'controle') {
    const S = lien.synchro;
    if (!S || !S.vivante || !Number.isInteger(m.pas) || pasDe(S.confirmee) > m.pas) return;
    S.avancerConfirmee(m.pas);
    if (empreintePartie(S.confirmee) !== m.empreinte) { lien.ecarts = (lien.ecarts || 0) + 1; toutRedemander(); }
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
  // (I9a2 : sur une île, la nuit vient à son heure ; tous couchés, elle file)
  if (oui && ileEnLigne()) notify(lien.connectes > 1 ? '🛏 Tu es couché. Quand tous les joueurs connectés le seront, la nuit filera (dès 22 h).' : '🛏 Tu es couché : la nuit filera dès 22 h.');
  else if (oui && lien.connectes > 1) notify('🛏 Tu es couché. La nuit passera quand tous les joueurs connectés le seront.');
  bandeau();
}

/* ---------- I9a2 : l'horloge commune d'une île ---------- */

// L'heure du serveur, estimée (la nôtre, plus son avance mesurée à l'accueil).
export function heureServeur() {
  return Date.now() + (lien && Number.isFinite(lien.decalage) ? lien.decalage : 0);
}

// À chaque image (js/ui/loop.js) : la partie locale avance à l'heure du serveur, pas à pas. Trop de retard (un onglet
// resté caché) : la partie entière redemandée plutôt que tous ces pas. Rend { pas, evts } (rien : null).
export function horlogeEnLigne() {
  if (!lien || !lien.synchro || !lien.synchro.vivante || lien.etat !== 'ok' || lien.rattrapage) return null;
  const S = lien.synchro, t = heureServeur();
  if (S.retard(t) > DATA.VILLAGE.EN_LIGNE.RETARD_PAS) { lien.rattrapage = true; toutRedemander(); return null; }
  const r = S.avancer(t);
  for (const ev of r.evts) {
    if (ev.reveil) matinIle();
    if (ev.nuit) notify('🌙 22 h : la nuit tombe sur l\'île. Couchez-vous tous (🛏) : elle filera.', { duree: 5000 });
  }
  if (r.evts.some((ev) => ev.nuit || ev.reveil)) bandeau();
  return r;
}
setPasEnLigne(horlogeEnLigne);

// La part du pas en cours déjà écoulée (l'heure affichée entre deux pas : js/ui/stage.js) ; 0 hors d'une île.
export function fractionDuPas() {
  return lien && lien.synchro && lien.synchro.vivante && lien.etat === 'ok' ? lien.synchro.fraction(heureServeur()) : 0;
}

// Le réveil d'une île (le pas de 6 h) : chacun se lève.
function matinIle() {
  lien.couche = false;
  lien.couches = [];
  try { sonMatin(); } catch (e) { /* (le son ne doit rien empêcher) */ }
  const s = lien.synchro && lien.synchro.locale;
  notify(`🌅 Le jour ${s ? s.day : ''} se lève sur l'île.`, { duree: 5000 });
}

// Le monde dormait (sans joueur) : le dire, une fois, à l'arrivée.
function reveilDuMonde() {
  if (!lien || !lien.dormait || !lien.synchro) return;
  const s = lien.synchro.locale, ms = lien.dormait;
  lien.dormait = null;
  const min = Math.round(ms / 60000), duree = min < 60 ? `${Math.max(1, min)} min` : min < 48 * 60 ? `${Math.round(min / 60)} h` : `${Math.round(min / 1440)} jours`;
  const h = clockHours(s), heure = `${Math.floor(h)} h${Math.floor((h % 1) * 60) ? ` ${String(Math.floor((h % 1) * 60)).padStart(2, '0')}` : ''}`;
  notify(`🌙 Le monde dormait depuis ${duree} : il reprend où il s'était arrêté (jour ${s.day}, ${heure}).`, { duree: 8000 });
}

export const TEMPS_DU_MONDE = '🕰️ Le temps de ce monde passe quand au moins un joueur y est. Sans personne, il dort.';

// Un trou dans les événements : la partie entière redemandée (un hello sans révision).
function toutRedemander() {
  envoyer({ t: 'hello', version: GAME_VERSION });
}

// La partie locale refaite (un geste d'un autre joueur, un refus) : le jeu la reprend.
// (la partie refaite par la commande d'un autre : la carte ne fait pas faire ce geste à son personnage à lui,
// js/carte/ferme/modele.js ; mêlée à un geste à soi pas encore dessiné : comme avant)
function marquerChangement(qui) {
  const F = typeof window !== 'undefined' && window.FermeEnLigne;
  if (F) F.changement = !F.changement || F.changement === qui ? qui : 'mixte';
}
function partieRefaite(locale) {
  poserBrouillard(locale);
  marquerChangement('distant');
  setState(locale);
  refresh();
}

// executer (commandes.js), en ligne : la commande jouée sur la partie locale, puis envoyée (si la
// connexion est coupée, elle attend : renvoyée à la reconnexion).
export function jouerEnLigne(cmd) {
  // (E-11 : son rôle dans le monde ne le permet pas : refusé ici, sans attendre le monde, qui le vérifie aussi)
  const refus = lien.role ? refusDuRole(lien.role, lien.synchro.locale, cmd) : null;
  if (refus) return { ok: false, error: `🌐 ${refus}` };
  // (I9a, I9b : l'île partagée ; hors de la ferme, seuls les gestes du dehors passent : un autre est refusé ici,
  // comme le monde le refuserait. Le chantier éteint, le monde seul le refuse, comme avant.)
  const frontiere = ilePartagee(lien.synchro.locale) ? refusFrontiere(lien.synchro.locale, cmd.args, cmd.type) : null;
  if (frontiere) return { ok: false, error: `🌐 ${frontiere}` };
  const r = lien.synchro.jouer(cmd);
  if (r.ok) { marquerChangement('local'); envoyer({ t: 'cmd', id: cmd.id, type: cmd.type, args: cmd.args }); }
  bandeau();
  return r;
}

brancherEnLigne(jouerEnLigne);

/* ---------- I9a : l'île partagée ---------- */

// Le monde partagé est-il l'île entière (le chantier allumé pour la partie du monde) ? Sinon, la ferme (E-8).
export function ileEnLigne() {
  return !!(lien && lien.synchro && ilePartagee(lien.synchro.locale));
}

// Le brouillard de chacun : ce que SON personnage a vu de l'île. Il n'est pas dans la partie du monde (elle
// garde le vu de sa création) : il est gardé ici, dans le navigateur, par monde (localStorage), et posé sur la
// partie locale à chaque fois qu'elle est refaite (unirVu : ce que le monde a vu, plus ce que l'on a vu). Les
// régions vues du moteur (state.monde.vues) restent celles du monde : le moteur les lit, la partie confirmée
// doit être la même chez tous.
let brouillard = null;   // { monde, vu (base64, comme state.monde.vu) }
const cleBrouillard = (monde) => `ferme-brouillard-${monde}`;
function brouillardDuMonde() {
  if (!lien) return null;
  if (!brouillard || brouillard.monde !== lien.monde) {
    let vu = '';
    try { vu = localStorage.getItem(cleBrouillard(lien.monde)) || ''; } catch (e) { vu = ''; }
    brouillard = { monde: lien.monde, vu };
  }
  return brouillard;
}
function poserBrouillard(partie) {
  if (!partie || !ilePartagee(partie)) return;
  const b = brouillardDuMonde();
  if (b && b.vu) unirVu(partie, b.vu);
}
// Le vu de la partie locale a grandi (le personnage a marché : js/ui/stage.js) : il devient celui de chacun.
export function noterBrouillard(vu) {
  const b = brouillardDuMonde();
  if (!b || typeof vu !== 'string' || !vu || vu === b.vu) return;
  b.vu = vu;
  try { localStorage.setItem(cleBrouillard(b.monde), vu); } catch (e) { /* (le navigateur ne garde rien : la session seule) */ }
}

// Le personnage est-il hors de la ferme ? (js/ui/stage.js, à chaque case : gardé ; I9b, le bandeau ne le dit plus.)
export function noterDehors(oui) {
  if (!lien || !!lien.dehors === !!oui) return;
  lien.dehors = !!oui;
  // (I9b : sur une île, dehors, il mange de son sac : js/ui/energie.js le lit)
  if (typeof window !== 'undefined' && window.FermeEnLigne) window.FermeEnLigne.dehors = !!oui && ileEnLigne();
  bandeau();
}

/* ---------- E-4 : la présence ---------- */

// Les autres joueurs du monde : acteur → { nom, look, ech, t } : ech, leurs derniers états reçus ({ t, x, y,
// h, img, flip } : les pieds de leur personnage, sa hauteur à l'étage, son image, son sens), t la dernière fois
// qu'on en a reçu un ; look, l'allure de leur personnage ({ perso, apparence }). La carte les dessine un peu en
// retard, en glissant d'un état au suivant (js/carte/ferme/presence.js lit window.FermeEnLigne).
const autres = new Map();
const ECH_MAX = 12;
if (typeof window !== 'undefined') window.FermeEnLigne = { autres, moi: null, changement: null };

// Son propre personnage, celui de sa partie solo (sur cet appareil) : son personnage du catalogue et son
// apparence. En ligne, c'est lui qu'il joue (la partie du monde a la famille du propriétaire), et lui que
// les autres voient.
function monLook() {
  const m = personnageSolo();
  return m ? { perso: memberPerso({ ...m, enfant: false }), apparence: validApparence(m.apparence, false) } : null;
}
// L'allure reçue d'un autre, revue ici (rien d'autre que les champs connus ; sinon, la fermière).
function lookValide(l) {
  if (!l || typeof l !== 'object') return null;
  return { perso: memberPerso({ perso: l.perso, enfant: false, genre: 'f' }), apparence: validApparence(l.apparence, false) };
}

// Son personnage sur la carte (js/fermier.js, vu()), envoyé quand il bouge ou change d'image, POS_MS au plus
// souvent (le monde en relaie au plus ≈ 6 par seconde) ; jamais quand rien ne change. Son allure, avec le
// premier envoi puis toutes les LOOK_MS.
const POS_MS = 200, LOOK_MS = 5000;
let derniere = null, lookEnvoye = 0;
function envoyerPosition() {
  if (!lien || lien.etat !== 'ok' || !window.FarmStage || !FarmStage.scene) return;
  const sc = FarmStage.scene();
  const v = sc && sc.fermier && sc.fermier.vu ? sc.fermier.vu() : null;
  if (!v) return;
  const x = Math.round(v.x), y = Math.round(v.y), h = Math.round(v.h || 0), img = String(v.img || ''), flip = !!v.flip;
  const maintenant = Date.now(), look = maintenant - lookEnvoye >= LOOK_MS || !derniere;
  if (!look && derniere && derniere.x === x && derniere.y === y && derniere.h === h && derniere.img === img && derniere.flip === flip) return;
  const m = { t: 'pos', x, y, h, img, flip };
  if (look) m.look = window.FermeEnLigne.moi;
  if (envoyer(m)) { derniere = { x, y, h, img, flip }; if (look) lookEnvoye = maintenant; }
}
if (typeof window !== 'undefined') setInterval(envoyerPosition, POS_MS);

/* ---------- ce qu'on fait en ligne ---------- */

// En ligne, pour l'instant : construire ensemble (les gestes du mode Construire), cultiver le potager (E-5)
// et ce qui ne change pas la partie (ouvrir une fenêtre, lire l'aide, les réglages). `bloquees` : les
// actions qui changent la partie (actions.js, SOMMEIL_BLOQUEES), sauf celles-là. Dormir : par le bandeau.
const CONSTRUIRE = new Set(['bloc', 'bloc-many', 'build-toggle', 'build-pick', 'build-tab', 'build-groupe', 'build-filtre', 'meuble-ok', 'build-level-menu', 'build-level', 'build-piece', 'build-gomme', 'build-tourner', 'build-peindre', 'build-tapisser', 'build-motif', 'meuble-peindre', 'build-sens', 'meuble-tourner', 'build-annuler', 'bloc-pipette', 'bloc-deplacer', 'etage-toggle']);
// (E-5 : le potager ; E-6 : les bêtes ; E-7 : la cuisine, le Moulin, le frigo, la boîte, manger ; E-9 : les outils, le verger ; E-10 : la progression, l'Atelier, les appareils, planter un arbre)
const FERME = new Set(['sac-poser', 'sac-retirer', 'sac-remplir', 'sac-reprendre', 'buy-tech', 'atelier-fabriquer', 'bloc-fabriquer', 'build-station', 'toggle', 'upgrade', 'upgrade-tank', 'robot-autonomie', 'maintain', 'repair', 'arbre-planter', 'arbre-case', 'arbre-oui', 'semis-set', 'silo-agrandir', 'tool-use', 'axe-toggle', 'pick-toggle', 'scythe-toggle', 'rod-toggle', 'harvest-tree', 'start-recipe', 'cancel-queued', 'stop-recipe', 'mill-start', 'mill-cancel', 'eat', 'sac-manger', 'fridge-in', 'fridge-out', 'fridge-in-all', 'fridge-in-urgent', 'frigo-ranger', 'build-fridge', 'upgrade-fridge', 'boite-deposer', 'boite-reprendre', 'feed-hen', 'feed-all', 'shear', 'cow-herbs', 'buy-pasture', 'upgrade-poulailler', 'plant', 'plant-many', 'plant-all', 'water', 'water-many', 'water-all', 'harvest', 'harvest-all', 'hoe', 'hoe-many', 'hoe-toggle', 'hoe-take', 'cruche-remplir', 'tonnelet-remplir', 'compost-jeter', 'engrais-many', 'engrais-toggle']);
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
  // (I9b : hors de la ferme, sur l'île partagée, tout se synchronise : le bandeau d'I9a, « rien d'autre n'est encore
  // synchronisé », est retiré)
  el.innerHTML = `<span class="en-ligne-etat">🌐 ${role}<span class="en-ligne-mot">En ligne · </span>${etat}${attente}</span>${lit}<button class="btn" type="button" data-action="monde-membres" aria-label="Les membres du monde">👥 ${n}</button><button class="btn" type="button" data-action="monde-quitter" aria-label="Revenir à ma ferme solo"><span class="en-ligne-mot">Ma ferme </span>solo</button>`;
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
    ${ileEnLigne() ? `<p class="muted">${TEMPS_DU_MONDE}</p>` : ''}
    ${proprio ? '<div class="row"><button class="btn" type="button" data-action="monde-journal">📜 Le journal du monde</button><button class="btn" type="button" data-action="monde-sauvegardes">💾 Les sauvegardes</button></div>' : ''}`, { labelledBy: 'membres-titre' });
}

// E-11 : ce qu'un geste du journal a fait, en mots.
const GESTES = {
  'bloc.poser': 'a posé un bloc', 'bloc.reprendre': 'a repris un bloc', 'bloc.remettre': 'a remis un bloc', 'bloc.deplacer': 'a déplacé un bloc',
  'bloc.tourner': 'a tourné un meuble', 'bloc.orienter': 'a tourné un meuble', 'bloc.peindre': 'a repeint un meuble', 'piece.tapisser': 'a posé du papier peint', 'murs.tapisser': 'a remis le papier peint', 'portail.basculer': 'a ouvert ou fermé un portail',
  'potager.planter': 'a semé', 'potager.arroser': 'a arrosé', 'potager.recolter': 'a récolté', 'potager.labourer': 'a labouré',
  'potager.toutPlanter': 'a tout planté', 'potager.toutArroser': 'a tout arrosé', 'potager.toutRecolter': 'a tout récolté', 'potager.semis': 'a réglé un semis',
  'cruche.remplir': 'a rempli la cruche', 'poules.nourrir': 'a nourri une poule', 'poules.toutNourrir': 'a nourri les poules',
  'poulailler.agrandir': 'a agrandi le Poulailler', 'etable.tondre': 'a tondu un mouton', 'etable.herbes': 'a changé le foin des vaches', 'etable.place': 'a acheté une place à l\'Étable',
  'ramassage.prendre': 'a ramassé', 'cuisine.lancer': 'a lancé une recette', 'cuisine.annuler': 'a retiré une préparation', 'cuisine.arreter': 'a arrêté une préparation', 'moulin.moudre': 'a moulu du blé', 'moulin.annuler': 'a repris du blé',
  'frigo.ranger': 'a rangé au frigo', 'frigo.sortir': 'a sorti du frigo', 'frigo.toutRanger': 'a tout rangé au frigo', 'frigo.urgent': 'a mis au frais', 'frigo.acheter': 'a acheté le frigo', 'frigo.agrandir': 'a agrandi le frigo',
  'boite.deposer': 'a garni la boîte', 'boite.reprendre': 'a repris dans la boîte', 'manger': 'a mangé',
  'monde.recolter': 'a récolté sur l\'île', 'sac.poser': 'a pris un sac à provisions', 'sac.retirer': 'a rangé son sac', 'sac.remplir': 'a rempli son sac', 'sac.reprendre': 'a repris dans son sac',
  'outil.couper': 'a coupé du bois', 'outil.casser': 'a cassé un rocher', 'outil.caillou': 'a ramassé un caillou', 'outil.faucher': 'a fauché', 'outil.faucherAutour': 'a fauché', 'outil.pecher': 'a pêché', 'verger.cueillir': 'a cueilli des fruits',
  'tech.acheter': 'a acquis une technologie', 'atelier.fabriquer': 'a fabriqué à l\'Atelier', 'atelier.construire': 'a construit un atelier',
  'appareil.basculer': 'a allumé ou éteint un appareil', 'appareil.ameliorer': 'a amélioré un appareil', 'appareil.entretenir': 'a entretenu un appareil', 'appareil.reparer': 'a réparé un appareil',
  'reservoir.agrandir': 'a agrandi le réservoir', 'robot.batterie': 'a agrandi la batterie du robot', 'arbre.planter': 'a planté un arbre', 'massif.cueillir': 'a cueilli des fleurs',
  'port.vendre': 'a vendu au port', 'port.decharger': 'a tout vendu au port', 'port.acheter': 'a acheté au port', 'port.honorer': 'a livré une commande du bac',
  'port.livrer': 'a livré un contrat d\'export', 'port.importer': 'a commandé au catalogue d\'import', 'port.contrat': 'a accepté un contrat d\'export',
  'port.apporter': 'a apporté au chantier du port', 'port.agrandir': 'a agrandi le port',
  'portage.charger': 'a chargé pour le port', 'portage.reprendre': 'a déchargé à la ferme', 'portage.vehicule': 'a choisi comment porter',
  'nuit.partagee': 'tout le monde a dormi : la nuit est passée',
  'temps.sommeil': 'tous couchés (la nuit file), ou l\'un s\'est levé',
  'monde.restaurer': 'a restauré une sauvegarde',
};
const FAMILLES_GESTES = { mur: 'a bâti un mur', etage: 'a bâti à l\'étage', solEtage: 'a posé un sol à l\'étage' };
export function gesteEnMots(type, bilan = null) {
  if (bilan && typeof bilan === 'object') return commerceEnMots(type, bilan);
  return GESTES[type] || FAMILLES_GESTES[String(type).split('.')[0]] || 'a fait un geste';
}
// I9c : un geste du commerce et son bilan (worker/src/monde.mjs bilanCommerce), en mots : « a vendu 12 🥕 Carotte au
// port (+48 💰) ». `caisse` : le dire de la caisse commune (pour les autres joueurs, sur le moment).
const nomObjet = (k) => { const it = DATA.OBJETS[k]; return it ? `${it.icone} ${it.nom.toLowerCase()}` : String(k || '?'); };
const pieces = (n) => `${Math.round(Number(n) || 0).toLocaleString('fr-FR')} 💰`;
export function commerceEnMots(type, b, caisse = false) {
  const enCaisse = caisse ? ' à la caisse commune' : '';
  const liste = (o) => Object.entries(o || {}).map(([k, n]) => `${n} ${nomObjet(k)}`).join(', ') || 'rien';
  switch (type) {
    case 'port.vendre': return `a vendu ${b.n} ${nomObjet(b.objet)} au port (+${pieces(b.gain)}${enCaisse})`;
    case 'port.decharger': return `a tout vendu au port : ${liste(b.vendus)} (+${pieces(b.gain)}${enCaisse})`;
    case 'port.acheter': return `a acheté ${b.n} ${nomObjet(b.objet)} au port (−${pieces(b.cout)}${caisse ? ' de la caisse commune' : ''})`;
    case 'port.honorer': return `a livré ${b.n} ${nomObjet(b.objet)} à une commande du bac (+${pieces(b.gain)}${enCaisse})${Number.isInteger(b.reste) ? ` : il en reste ${b.reste} à livrer` : ''}`;
    case 'port.livrer': return `a livré ${b.n} ${nomObjet(b.objet)} à un contrat d'export (+${pieces(b.gain)}${enCaisse})`;
    case 'port.importer': return `a commandé au catalogue d'import (−${pieces(b.cout)}${caisse ? ' de la caisse commune' : ''})`;
    case 'port.contrat': return `a accepté un contrat d'export : ${b.n} ${nomObjet(b.objet)}`;
    case 'port.apporter': return `a apporté au chantier du port : ${liste(b.apporte)}`;
    case 'port.agrandir': return `a agrandi le port : niveau ${b.niveau}`;
    default: return GESTES[type] || 'a fait un geste';
  }
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
  const lignes = journalVu.length ? journalVu.map((e) => `<li><strong>${echapper(e.nom)}</strong> ${gesteEnMots(e.type, e.bilan)} <span class="muted">· ${ilYa(e.ts)} · n° ${e.rev}</span></li>`).join('') : '<li class="muted">Rien encore.</li>';
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
const RAISONS = { nuit: '🌙 après la nuit', main: '💾 à la main', 'avant-restauration': '↩️ avant une restauration', heure: '🕰️ une heure de jeu', depart: '👋 au départ du dernier joueur' };
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
  'monde-partager': () => { try { navigator.share({ title: 'Moon Bloom Village', text: 'Viens dans ma ferme !', url: invitation && invitation.lien }); } catch (e) { /* (rien) */ } },
  'monde-retirer': (target) => { aRetirer = target.dataset.compte; ouvrirMembres(); },
  'monde-retirer-non': () => { aRetirer = null; ouvrirMembres(); },
  'monde-retirer-oui': (target) => { retirer(target.dataset.compte); },
});

// (pour les tests) la connexion en cours
export const _lien = () => lien;
