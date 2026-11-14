import { DATA } from './catalog.js';
import { farmStep } from './energy.js';
import { refreshUnlocks } from './techtree.js';
import { chapitresAuPas } from './campaign.js';
import { bedtimeDue, hourOfDay, nightActive } from './clock.js';
import { advanceNight, recoverInSleep, startNight } from './night.js';
import { avancerBac } from './bac.js';
import { avancerContrats } from './contrats.js';
import { accueillirVillageois, arriveeDue, arriverVillageois, verifierMaisons, villageoisDe } from './villageois.js';
import { arriveeEnfantRefus, arriverEnfant } from './liens.js';
import { assurerArrivee } from './chronique.js';
import { energyMax } from './stamina.js';
import { penalite } from './inventory.js';
import { ilePartagee } from './frontiere.js';

/* ---------- I9a2 : l'horloge commune d'un monde de l'île (docs/fiches/ile/I9a2-note-horloge.md) ----------

   Un monde en ligne de l'île (le chantier allumé pour sa partie : ilePartagee) a une horloge vivante : le temps
   y passe tant qu'un joueur au moins est connecté, pour tous en même temps. Il avance par PAS de 5 s d'horloge
   (VILLAGE.EN_LIGNE.PAS_MS : 10 minutes de jeu), toujours un pas après l'autre : le moteur ne donne pas le même
   état pour un pas de 60 s et pour 12 pas de 5 s (l'énergie, le Moulin, les villageois), mais deux machines qui
   jouent les mêmes pas de 5 s, dans le même ordre, ont la même partie. Le pas est donc une constante du
   protocole, et une commande se joue toujours entre deux pas, jamais au milieu.

   Les pas ne sont pas des commandes du journal : le serveur (worker/src/monde.mjs) les déduit de son heure, les
   rejoue avant chaque geste (avancerJusqua), et donne à chaque geste son numéro de pas (cmd.pas) ; chaque joueur
   fait de même chez lui (js/ui/synchro.js). Le pas ne lit que la partie : ni horloge, ni hasard, ni réglage de
   la page. Ce que les veilleurs de la page font en solo au fil du temps (la nuit à 22 h, le réveil, le bac et les
   contrats, l'arrivée d'un villageois ou d'un enfant, les maisons, l'arrivée notée dans la chronique) est ici,
   dans le pas ; en ligne, ces veilleurs se taisent (js/ui/loop.js, port.js, villageois.js, chronique.js).

   La partie du monde garde :
     state.horloge = { pas, sommeil, reveils } : le numéro du dernier pas joué ; sommeil, tous les joueurs
       connectés sont couchés (la commande du monde temps.sommeil : la nuit défile alors dix fois plus vite) ;
       reveils, combien de nuits ont fini (un lit ne compte que pour la nuit où l'on s'est couché) ;
     state.energies = { <compte>: mWh } : l'énergie de chaque joueur (docs/monde-partage.md § 13). Le moteur lit
       state.energie à une centaine d'endroits : une commande y pose l'énergie de son acteur le temps de se
       jouer, puis la range (avecActeur) ; la nuit la rend à chacun. Un compte qui n'y est pas encore a
       l'énergie pleine.

   Les mondes d'avant (une ferme, F.2 : l'horloge figée, la nuit partagée d'un coup) n'ont rien de tout cela
   (horlogeVivante faux) jusqu'à leur migration (I9f). */

export const ACTEUR_DU_MONDE = 'monde';
const EL = () => DATA.VILLAGE.EN_LIGNE;
export const pasMs = () => EL().PAS_MS;

// La partie d'un monde en ligne dont l'horloge vit (I9a2) ? Celle d'une île partagée ; une ferme d'avant : non.
export function horlogeVivante(state) {
  return !!(state && state.mondePartage && ilePartagee(state));
}

// L'horloge d'une partie (posée s'il le faut : une partie du monde d'avant la version 104 n'en a pas).
export function horlogeDe(state) {
  if (!state.horloge || typeof state.horloge !== 'object') state.horloge = nouvelleHorloge();
  const h = state.horloge;
  if (!Number.isInteger(h.pas) || h.pas < 0) h.pas = 0;
  h.sommeil = h.sommeil === true;
  if (!Number.isInteger(h.reveils) || h.reveils < 0) h.reveils = 0;
  return h;
}
export function nouvelleHorloge() {
  return { pas: 0, sommeil: false, reveils: 0 };
}
export function pasDe(state) {
  return state && state.horloge && Number.isInteger(state.horloge.pas) ? state.horloge.pas : 0;
}

// La durée réelle (ms) du pas qui suit, d'après la partie : PAS_MS ; la nuit, tous couchés, dix fois moins
// (la cadence du sommeil : TEMPS.SECONDES_PAR_HEURE_SOMMEIL au lieu de SECONDES_PAR_HEURE). La cadence ne change
// que QUAND les pas viennent, jamais ce qu'ils font.
export function dureeDuPas(state) {
  const T = DATA.TEMPS;
  if (nightActive(state) && state.horloge && state.horloge.sommeil === true) return Math.round((pasMs() * T.SECONDES_PAR_HEURE_SOMMEIL) / T.SECONDES_PAR_HEURE);
  return pasMs();
}

// Un pas du monde (PAS_MS d'horloge) : ce que fait tick en solo (le jour : la ferme, l'arbre des technologies, les
// objectifs ; la nuit : seule l'heure avance, minuit calcule la nuit), plus ce que les veilleurs de la page font en
// solo. Rend ce qui s'est passé : { nuit (elle commence), minuit, reveil, bac (il a accosté), arrivee }.
export function pasDuMonde(state) {
  const h = horlogeDe(state), dt = pasMs();
  const ev = { nuit: false, minuit: false, reveil: false, bac: false, arrivee: false };
  if (nightActive(state)) {
    const n = state.nuitEnCours;
    n.dort = h.sommeil;   // (le personnage du monde dort quand tous dorment : la scène le montre)
    // l'énergie de chaque joueur remonte, avant minuit comme après (advanceNight fait de même pour celle de la
    // partie, sur la même durée)
    // (B-1 : PENALITES.NUIT_SANS_DORMIR coupée, une nuit rend l'énergie couché ou non, comme advanceNight)
    if (h.sommeil || !penalite('NUIT_SANS_DORMIR')) rendreEnergies(state, Math.max(0, Math.min(dt, nuitRestante(state))));
    const r = advanceNight(state, dt);
    if (r === 'minuit') ev.minuit = true;
    if (r === 'reveil') {
      ev.reveil = true;
      state.reveil = false;   // (en solo, la page montre le réveil ; ici, chaque joueur le voit venir dans sa partie)
      h.sommeil = false;      // (la cadence revient seule au réveil)
      h.reveils += 1;
    }
    h.pas += 1;
    return ev;
  }
  farmStep(state, dt, { horloge: true });
  refreshUnlocks(state);
  chapitresAuPas(state);
  // (le bac et les contrats : js/ui/port.js watchBac, en solo)
  const b = avancerBac(state);
  if (b) {
    avancerContrats(state);
    if (b.arrivees && b.arrivees.length) ev.bac = true;
  }
  // (les villageois : js/ui/villageois.js watchVillageois, en solo ; la chronique : js/ui/chronique.js)
  // (les maisons : la page les revoit chaque seconde en solo ; ici, une fois par heure de jeu, au pas rond — elles ne
  // changent qu'avec les blocs, et les revoir coûte autant que le reste du pas : 5 ms sur l'île avancée)
  if (h.pas % MAISONS_TOUS === 0) verifierMaisons(state);
  if (arriveeDue(state) && arriverVillageois(state).ok) ev.arrivee = true;
  else if (arriveeEnfantRefus(state) === null && arriverEnfant(state).ok) ev.arrivee = true;
  if (hourOfDay(state) >= DATA.PORT.BAC.HEURES[1]) for (const v of villageoisDe(state)) if (v.accueil === 'en_route') accueillirVillageois(state, v.id);
  assurerArrivee(state);
  // (la nuit vient seule à 22 h : js/ui/loop.js watchDay, en solo)
  if (bedtimeDue(state) && startNight(state)) ev.nuit = true;
  h.pas += 1;
  return ev;
}
const MAISONS_TOUS = 6;   // pas (une heure de jeu)
function nuitRestante(state) {
  const T = DATA.TEMPS;
  return (24 - T.HEURE_NUIT + T.HEURE_REVEIL) * T.SECONDES_PAR_HEURE * 1000 - state.nuitEnCours.ms;
}

// Les pas jusqu'au pas n° `pas` (compris), un après l'autre. `chaque(ev, duree)` : après chaque pas (ce qui
// s'est passé, la durée réelle du pas joué). Rend le nombre de pas joués.
export function avancerJusqua(state, pas, chaque = null) {
  const h = horlogeDe(state);
  let n = 0;
  while (h.pas < pas) {
    const d = dureeDuPas(state);
    const ev = pasDuMonde(state);
    n += 1;
    if (chaque) chaque(ev, d);
  }
  return n;
}

/* -- l'énergie de chacun -- */

export function energiesDe(state) {
  if (!state.energies || typeof state.energies !== 'object' || Array.isArray(state.energies)) state.energies = {};
  return state.energies;
}
// L'énergie du joueur `compte` (mWh) : la sienne, ou l'énergie pleine s'il n'a encore rien fait.
export function energieDe(state, compte) {
  const e = state && state.energies && state.energies[compte];
  return Number.isFinite(e) ? e : energyMax(state);
}
// `fn()` joué avec l'énergie de `compte` dans state.energie, rangée ensuite ; celle de la partie, remise. I9b : son sac
// à provisions aussi (state.sacs, posé dans state.equipement.sac le temps de la commande : poserSacDe).
export function avecActeur(state, compte, fn) {
  if (!compte || compte === ACTEUR_DU_MONDE || !horlogeVivante(state)) return fn();
  const E = energiesDe(state), avant = state.energie;
  state.energie = energieDe(state, compte);
  const rendreSac = poserSacDe(state, compte);
  try {
    return fn();
  } finally {
    E[compte] = Math.max(0, Math.round(Number(state.energie) || 0));
    state.energie = avant;
    rendreSac();
  }
}

/* -- I9b : le sac de chacun (docs/monde-partage.md § 13 : ses provisions de sortie) --

   state.sacs = { <compte>: { objet, items } } : le sac à provisions de chaque joueur d'un monde de l'île (l'objet du
   sac, ce qu'il contient : equipement.js). Un compte qui n'y est pas n'a pas de sac ; le propriétaire reçoit celui de
   sa partie à la mise en ligne (worker/src/monde.mjs). Le moteur lit le sac dans state.equipement.sac : une commande y
   pose celui de son acteur le temps de se jouer, puis le range (avecActeur) ; la nuit fait périmer ce que chacun
   contient (inventory.js spoil). Une partie sans state.sacs (solo, une ferme d'avant) ne change pas. */

export function sacsDe(state) {
  return state && state.sacs && typeof state.sacs === 'object' && !Array.isArray(state.sacs) ? state.sacs : null;
}
// Le sac de `compte` (null : il n'en a pas).
export function sacDe(state, compte) {
  const S = sacsDe(state);
  return S && S[compte] && typeof S[compte] === 'object' ? S[compte] : null;
}
// Le sac de `compte` posé dans state.equipement.sac ; rend la fonction qui le range et remet celui de la partie.
function poserSacDe(state, compte) {
  const S = sacsDe(state);
  if (!S) return () => {};
  if (!state.equipement || typeof state.equipement !== 'object' || Array.isArray(state.equipement)) state.equipement = { membres: {}, sac: null };
  const q = state.equipement, avant = q.sac === undefined ? undefined : q.sac;
  q.sac = sacDe(state, compte);
  return () => {
    if (q.sac && typeof q.sac === 'object') S[compte] = q.sac;
    else delete S[compte];
    if (avant === undefined) delete q.sac; else q.sac = avant;
  };
}
// La nuit rend l'énergie de chaque joueur (le sommeil, `ms` d'horloge), présent ou non.
function rendreEnergies(state, ms) {
  const E = state.energies;
  if (!E || typeof E !== 'object' || !(ms > 0)) return;
  const avant = state.energie;
  for (const compte of Object.keys(E).sort()) {
    state.energie = E[compte];
    recoverInSleep(state, ms);
    E[compte] = state.energie;
  }
  state.energie = avant;
}

// La commande du monde temps.sommeil (worker/src/monde.mjs : tous les joueurs connectés sont couchés, ou plus).
export function poserSommeil(state, oui) {
  if (!horlogeVivante(state)) return { ok: false, error: 'Cette horloge ne vit pas : la nuit y est partagée.' };
  horlogeDe(state).sommeil = oui === true;
  return { ok: true, sommeil: horlogeDe(state).sommeil };
}
