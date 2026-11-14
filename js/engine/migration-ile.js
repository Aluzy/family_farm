/* ==========================================================================
   La migration d'une partie d'avant vers l'île à bâtir (le chantier « l'île à bâtir », fiche I7f ; docs/ile.md).
   Les réglages : data/village.json (VILLAGE.MIGRATION).

   Une partie d'avant (partieDAvant : elle n'a pas de port, state.port, que toute partie de l'île a dès sa naissance)
   ouverte sur l'île (le réglage allumé ; pendant le chantier, aussi une partie d'essai : jeu.html?village=1, js/ui/storage.js
   essayerSurLIle) passe sur l'île une fois, à son ouverture (state.js migrate : migrationIleDue, puis migrerVersLIle).
   Rien de ce que le joueur a bâti, gagné ou noué ne se perd :
   - ce qui ne bouge pas : la ferme et tout ce qui y est bâti (ses chemins peints compris : ce n'est pas une terre
     vierge), l'inventaire, les pièces, le niveau, l'arbre des technologies, les bêtes, la famille, l'équipement, les
     plans, les styles, l'encyclopédie, le brouillard levé (state.monde.vues, vu) et ce qui a été pris dans le monde ;
   - le monde : la même graine, le même relief (I7e : le plan de l'île tire les voisinages d'avant en fantômes) ; le
     port, son chemin et son tronçon paraissent (state.port, neuf ; state.dehors.troncon « a_poser » : la page, ou
     dehors.js assurerTroncon dans Node, convertit le tronçon en chemins du joueur, I2) ; les voisinages et le marchand
     ambulant s'en vont (state.monde.hameaux, habitants, la calèche, ses commandes, les projets, les demandes, les liens,
     les invitations qui les citent) ;
   - les amis : chaque voisin d'avant (pas un personnage écrit, pas un enfant) dont l'amitié atteint MIGRATION.AMI devient
     un candidat (state.candidats, du plus ami au moins ami) : il garde son prénom, son personnage, son apparence, ses
     goûts (ceux de son métier : amitie.js goutsDe ; ceux qu'on avait découverts), son amitié ; il débarque par le bac
     dès qu'une maison libre l'attend, avant tout villageois tiré (villageois.js arriverVillageois). Les autres sont
     oubliés sans bruit ;
   - les remboursements (notés dans les comptes quand ce sont des pièces) : les commandes payées au marchand ambulant
     (des semences, ce que portait son coffre : remboursées en pièces, caleche.js annulerCommande), ce que la malle
     portait (à vendre : repris ; livré : pris), les commandes en cours aux ateliers des voisins (ce qu'elles devaient
     rendre, livré), ce qui avait été apporté aux projets des voisins encore inachevés (rendu), les présents laissés
     devant la porte (ramassés), les pièces des lettres pas encore ouvertes, l'enveloppe pas encore ouverte (ses pièces) ;
   - la progression : le chapitre atteint devient le palier de l'île de même rang (paliers.js, state.palier) ; les
     récompenses reçues ne sont pas redonnées (state.campagne.recompenses gardé) ; les écrans de fin de chapitre pas
     encore vus s'effacent (leurs récompenses sont déjà données) ;
   - le récit : ce que le joueur a vécu est résumé en quelques lignes datées de la chronique (le type « avant »,
     MIGRATION.CHRONIQUE, sans nom propre) ; rien d'autre n'est gardé : state.recit et la visite de bienvenue sont ceux
     d'une partie de l'île (vides, recit-muet.js), le courrier est vidé, les souvenirs du récit (la cloche, la pierre)
     quittent l'inventaire ;
   - le retour : state.retourIle, la fenêtre d'une page du premier lancement (js/ui/retour-ile.js : retourIle), avec le
     cadeau de bienvenue (MIGRATION.CADEAU) donné quand on la ferme (fermerRetourIle) ; `copie` : la page a gardé la
     sauvegarde d'avant sur l'appareil (js/ui/storage.js, SAVE_AVANT_ILE, exportable depuis ⚙️ Options).
   ========================================================================== */

import { DATA } from './catalog.js';
import { nouveauDehors, nouveauPort, prenomsDuJeu, texteDuRecit, villageActif } from './village.js';
import { hache } from './ferme-generee.js';
import { nouveauxNoms } from './noms.js';
import { chroniqueDe, nouvelleChronique, noterChroniqueLe } from './chronique.js';
import { recitPour } from './recit-aiguillage.js';
import { goutsDe } from './amitie.js';
import { annulerCommande, contenuMalle, nouvelleCaleche, prendreLivraison, reprendreTout } from './caleche.js';
import { addItem, countItem, takeItem } from './inventory.js';
import { earn } from './compta.js';
import { validApparence } from './family.js';

const M = () => (DATA.VILLAGE && DATA.VILLAGE.MIGRATION) || {};
const objet = (v) => !!v && typeof v === 'object' && !Array.isArray(v);
const jourDe = (state) => Math.max(1, Math.floor(Number(state && state.day) || 1));
const entier = (v) => (Number.isFinite(Number(v)) ? Math.max(0, Math.floor(Number(v))) : 0);
const remplir = (t, mots) => String(t || '').replace(/\{(\w+)\}/g, (x, k) => (mots[k] !== undefined && mots[k] !== null ? String(mots[k]) : ''));
const ajouter = (o, k, n) => { if (n > 0 && DATA.OBJETS[k]) o[k] = (o[k] || 0) + n; };

/* ---------- quand ---------- */

// Une partie d'avant l'île : elle n'a pas de port (toute partie de l'île en a un dès sa naissance : state.js
// createInitialState, village.js allumerEssaiVillage ; et toute partie migrée).
export function partieDAvant(state) {
  return objet(state) && !objet(state.port);
}

// La partie doit-elle passer sur l'île maintenant ? (une partie d'avant, ouverte sur l'île)
export function migrationIleDue(state) {
  return partieDAvant(state) && villageActif(state);
}

/* ---------- les amis d'avant ---------- */

// Le lieu d'un voisinage d'avant, en phrase (MIGRATION.LIEUX, d'après son style).
function lieuDe(h) {
  const L = M().LIEUX || {};
  return L[h && h.style] || L['*'] || '';
}

// Les candidats que la partie d'avant laisse : [{ ancien, prenom, genre, perso, apparence, gouts, connus, pts, lieu, depuis }],
// du plus ami au moins ami (puis dans l'ordre des ids). Ne change pas la partie.
export function candidatsDAvant(state) {
  const H = (state.monde && objet(state.monde.habitants) && state.monde.habitants) || {};
  const pnj = (objet(state.amitie) && objet(state.amitie.pnj) && state.amitie.pnj) || {};
  const seuil = DATA.AMITIE.ECHELLE.PALIERS[Math.max(0, Math.min(DATA.AMITIE.ECHELLE.PALIERS.length - 1, entier(M().AMI)))] || 0;
  const out = [];
  for (const [hid, h] of Object.entries(H).sort((a, b) => (a[0] < b[0] ? -1 : 1))) {
    for (const f of (h && Array.isArray(h.foyers) && h.foyers) || []) {
      for (const m of (f && Array.isArray(f.membres) && f.membres) || []) {
        if (!objet(m) || m.enfant || m.recit || typeof m.id !== 'string' || typeof m.prenom !== 'string') continue;
        const p = pnj[m.id], pts = objet(p) ? entier(p.pts) : 0;
        if (pts < seuil) continue;
        const genre = m.genre === 'm' ? 'm' : 'f';
        const connus = objet(p) && objet(p.gouts) ? Object.fromEntries(Object.entries(p.gouts).filter(([it, g]) => DATA.OBJETS[it] && ['adore', 'aime', 'neutre', 'deteste'].includes(g))) : {};
        out.push({
          ancien: m.id, hameau: hid, prenom: m.prenom, genre, perso: Number.isInteger(m.perso) ? m.perso : null,
          apparence: objet(m.apparence) ? validApparence(m.apparence, false) : null, gouts: goutsDe(m), connus,
          pts: Math.min(DATA.AMITIE.ECHELLE.MAX, pts), lieu: lieuDe(h), depuis: entier(p.vu) || entier(h.jour) || 1,
        });
      }
    }
  }
  out.sort((a, b) => b.pts - a.pts || (a.ancien < b.ancien ? -1 : 1));
  // (un prénom que porte un personnage du récit — Odile, Basile… — n'a pas sa place sur l'île, village.js prenomsDuJeu :
  // l'ami en prend un autre, tiré de son id, qu'aucun autre candidat ni la famille ne porte)
  const pris = new Set([...out.map((c) => c.prenom), ...((state.famille && state.famille.membres) || []).map((x) => x && x.prenom)].filter(Boolean).map((p) => String(p).toLowerCase()));
  for (const c of out) {
    if (!texteDuRecit(c.prenom)) continue;
    const libres = prenomsDuJeu(state, c.genre).filter((p) => !pris.has(String(p).toLowerCase()) && !texteDuRecit(p));
    if (!libres.length) continue;
    c.prenom = libres[hache(`migration:${c.ancien}`) % libres.length];
    pris.add(c.prenom.toLowerCase());
  }
  return out;
}

// Les candidats de la partie (une liste saine).
export function candidatsDe(state) {
  return Array.isArray(state && state.candidats) ? state.candidats.filter((c) => objet(c) && typeof c.prenom === 'string') : [];
}

/* ---------- les remboursements ---------- */

// Ce qui était en cours avec le marchand ambulant, les ateliers et les projets des voisins, rendu : { pieces, objets }.
function rembourser(state) {
  const rendu = { pieces: 0, objets: {} };
  const avant = state.pieces;
  // (la malle : ce qui était à vendre, repris ; ce qui était livré, pris ; les commandes payées, remboursées)
  if (objet(state.caleche) && objet(state.caleche.malle)) {
    const c = contenuMalle(state);
    for (const [k, n] of Object.entries(c.vente)) ajouter(rendu.objets, k, n);
    for (const [k, n] of Object.entries(c.livre)) ajouter(rendu.objets, k, n);
    reprendreTout(state);
    prendreLivraison(state);
    annulerCommande(state);
  }
  // (les commandes en cours aux ateliers des voisins : ce qu'elles devaient rendre, livré)
  const A = (DATA.ILE && DATA.ILE.ATELIERS) || {};
  const H = (state.monde && objet(state.monde.habitants) && state.monde.habitants) || {};
  for (const h of Object.values(H)) {
    for (const c of (h && Array.isArray(h.commandes) && h.commandes) || []) {
      const r = c && A[c.atelier] && A[c.atelier].recettes && A[c.atelier].recettes[c.recette];
      if (!r || !(entier(c.lots) > 0)) continue;
      for (const [it, q] of Object.entries(r.sortie || {})) if (DATA.OBJETS[it]) { addItem(state, it, q * entier(c.lots)); ajouter(rendu.objets, it, q * entier(c.lots)); }
    }
  }
  // (ce qui avait été apporté aux projets des voisins encore en cours)
  for (const p of Object.values(objet(state.projets) ? state.projets : {})) {
    for (const [it, n] of Object.entries((p && objet(p.recu) && p.recu) || {})) if (DATA.OBJETS[it] && entier(n) > 0) { addItem(state, it, entier(n)); ajouter(rendu.objets, it, entier(n)); }
  }
  // (les présents laissés devant la porte)
  const porte = objet(state.amitie) && Array.isArray(state.amitie.porte) ? state.amitie.porte : [];
  for (const x of porte) if (x && DATA.OBJETS[x.objet] && entier(x.n) > 0) { addItem(state, x.objet, entier(x.n)); ajouter(rendu.objets, x.objet, entier(x.n)); }
  // (les lettres pas encore ouvertes : leurs pièces ; leurs cadeaux étaient déjà dans l'inventaire)
  for (const l of Array.isArray(state.courrier) ? state.courrier : []) {
    const def = l && DATA.COURRIER && DATA.COURRIER[l.id], p = def ? entier(def.pieces) : 0;
    if (p > 0 && !l.lu && !l.verse) earn(state, p, 'Lettre jamais ouverte');
  }
  // (l'enveloppe pas encore ouverte : ses pièces)
  const E = DATA.RECIT && DATA.RECIT.ENVELOPPE;
  if (E && DATA.OBJETS[E.OBJET]) {
    const n = Math.floor(countItem(state, E.OBJET));
    if (n > 0) { takeItem(state, E.OBJET, n); earn(state, entier(E.PIECES) * n, 'Enveloppe ouverte'); }
  }
  rendu.pieces = Math.max(0, Math.round(state.pieces - avant));
  return rendu;
}

/* ---------- la chronique d'avant ---------- */

// Les lignes « avant » qui résument la partie d'avant (MIGRATION.CHRONIQUE), datées ; sans nom propre.
function resumerAvant(state, candidats) {
  const T = M().CHRONIQUE || {}, j = jourDe(state);
  const ligne = (id, texte, jour) => noterChroniqueLe(state, 'avant', { id, texte }, jour);
  ligne('debut', remplir(T.DEBUT, { famille: (state.famille && state.famille.nom) || '' }).replace(/\s{2,}/g, ' '), 1);
  // (la première vente : le fait du récit d'avant, s'il est noté)
  const faits = (objet(state.recit) && objet(state.recit.faits) && state.recit.faits) || {};
  const v = faits['vente.caleche'];
  if (Array.isArray(v) && entier(v[0]) > 0) ligne('vente', T.VENTE, entier(v[0]));
  // (les voisinages rencontrés, et les amis qu'on s'y est faits)
  const hameaux = (state.monde && objet(state.monde.hameaux) && state.monde.hameaux) || {};
  const H = (state.monde && objet(state.monde.habitants) && state.monde.habitants) || {};
  for (const [hid, h] of Object.entries(hameaux).sort((a, b) => entier(a[1] && a[1].jour) - entier(b[1] && b[1].jour) || (a[0] < b[0] ? -1 : 1))) {
    const lieu = lieuDe(objet(H[hid]) ? H[hid] : h);
    ligne(`voisins:${hid}`, remplir(T.VOISINS, { lieu }), entier(h && h.jour) || 1);
    const amis = candidats.filter((c) => c.hameau === hid);
    if (amis.length) ligne(`amis:${hid}`, remplir(amis.length > 1 ? T.AMIS : T.AMI, { n: amis.length, lieu }), Math.max(...amis.map((c) => c.depuis)));
  }
  // (le bilan : les chapitres franchis, le niveau ; puis l'île)
  const c = state.campagne, n = c ? (c.fini ? (DATA.CHAPITRES.liste || []).length : Math.max(0, entier(c.chapitre) - 1)) : 0;
  const chapitres = n > 1 ? remplir(T.CHAPITRES, { n }) : n === 1 ? T.CHAPITRE : T.SANS_CHAPITRE;
  ligne('bilan', remplir(T.BILAN, { chapitres, niveau: (state.progression && state.progression.niveau) || 1 }), j);
  ligne('ile', T.ILE, j);
}

/* ---------- la migration ---------- */

// Passe la partie d'avant `state` sur l'île (une fois). `o.essai` : une partie d'essai (jeu.html?village=1) : elle le
// devient (state.essais.village). → le bilan (state.retourIle), ou null (ce n'est pas une partie d'avant, ou le
// chantier n'est pas allumé pour elle).
export function migrerVersLIle(state, o = {}) {
  if (!partieDAvant(state)) return null;
  if (o.essai) state.essais = { ...(objet(state.essais) ? state.essais : {}), village: true };
  if (!villageActif(state)) return null;
  const jour = jourDe(state);
  const rendu = rembourser(state);
  const candidats = candidatsDAvant(state);
  // (le monde de l'île : le port, son chemin et le tronçon, à convertir en chemins du joueur ; une partie d'avant garde
  // sa ferme et ses chemins peints : pas de terre vierge)
  state.port = nouveauPort(jour);
  state.dehors = nouveauDehors();
  if (!objet(state.noms)) state.noms = nouveauxNoms(state);
  // (le chapitre atteint devient le palier de même rang ; ses écrans de fin, déjà récompensés, s'effacent)
  const c = state.campagne;
  if (objet(c)) {
    const max = Array.isArray(DATA.VILLAGE.PALIERS) ? DATA.VILLAGE.PALIERS.length : 7;
    state.palier = Math.max(1, Math.min(max, entier(c.chapitre) || 1));
    c.chapitre = state.palier;
    if (Array.isArray(c.annonces)) c.annonces = [];
  }
  // (la chronique : la famille ne débarque pas, elle était là ; ce qu'elle a vécu, résumé)
  state.chronique = nouvelleChronique();
  chroniqueDe(state).faits.push('arrivee');
  resumerAvant(state, candidats);
  // (les voisins d'avant et le marchand ambulant s'en vont ; le récit aussi)
  const monde = objet(state.monde) ? state.monde : (state.monde = {});
  monde.hameaux = {};
  monde.habitants = {};
  if (objet(monde.but) && monde.but.sorte === 'hameau') monde.but = null;
  state.caleche = nouvelleCaleche();
  state.projets = {};
  state.voisins = { liens: {}, evenements: [] };
  const R = recitPour(state);
  state.recit = R.nouveauRecit();
  state.bienvenue = R.nouvelleBienvenue();
  state.courrier = [];
  for (const it of ['cloche_maurice', (DATA.RECIT && DATA.RECIT.FIL && DATA.RECIT.FIL.PIERRE && DATA.RECIT.FIL.PIERRE.OBJET) || 'pierre_lune']) {
    const n = DATA.OBJETS[it] ? Math.floor(countItem(state, it)) : 0;
    if (n > 0) takeItem(state, it, n);
  }
  const a = objet(state.amitie) ? state.amitie : (state.amitie = {});
  const village = (k) => /^vg-\d+$/.test(k);
  a.pnj = Object.fromEntries(Object.entries(objet(a.pnj) ? a.pnj : {}).filter(([k]) => village(k)));
  a.visites = {};
  a.porte = [];
  if (objet(state.demandes)) {
    const liste = Array.isArray(state.demandes.liste) ? state.demandes.liste.filter((d) => d && d.hameau === 'village') : [];
    const ids = new Set(liste.map((d) => d.id));
    state.demandes = { ...state.demandes, liste, annonces: (Array.isArray(state.demandes.annonces) ? state.demandes.annonces : []).filter((id) => ids.has(id)) };
  }
  if (objet(state.invitations) && Array.isArray(state.invitations.liste)) {
    const liste = state.invitations.liste
      .map((x) => (objet(x) && Array.isArray(x.invites) ? { ...x, invites: x.invites.filter((q) => q && q.hameau === 'village') } : null))
      .filter((x) => x && x.invites.length);
    state.invitations = { ...state.invitations, liste };
  }
  // (les amis d'avant attendent une maison)
  if (candidats.length) state.candidats = candidats.map(({ hameau: _h, ...c }) => c);
  else delete state.candidats;
  const bilan = {
    jour, palier: state.palier || 1, amis: candidats.map((x) => x.prenom), rendu,
    cadeau: { pieces: entier((M().CADEAU || {}).pieces), objets: Object.fromEntries(Object.entries((M().CADEAU || {}).objets || {}).filter(([k, n]) => DATA.OBJETS[k] && entier(n) > 0).map(([k, n]) => [k, entier(n)])) },
    copie: false,
  };
  state.retourIle = bilan;
  return bilan;
}

// Une partie d'essai : la partie d'avant ouverte avec jeu.html?village=1 (js/ui/storage.js). → le bilan, ou null.
export function essayerSurLIle(state) {
  return migrerVersLIle(state, { essai: true });
}

/* ---------- le retour ---------- */

// La fenêtre du retour à montrer, ou null.
export function retourIle(state) {
  return objet(state && state.retourIle) && villageActif(state) ? state.retourIle : null;
}

const nomObjet = (k, n) => `${n} × ${DATA.OBJETS[k] ? `${DATA.OBJETS[k].icone || ''} ${DATA.OBJETS[k].nom}`.trim() : k}`;
const liste = (L) => (L.length > 1 ? `${L.slice(0, -1).join(', ')} et ${L[L.length - 1]}` : L[0] || '');
const enTexte = ({ pieces = 0, objets = {} } = {}) => liste([...(pieces > 0 ? [`${pieces} pièces`] : []), ...Object.entries(objets).map(([k, n]) => nomObjet(k, n))]);

// Les lignes de la fenêtre du retour : { titre, intro, lignes: [{ icone, texte }], cadeau, bouton } (des textes simples,
// MIGRATION.RETOUR ; la page les échappe), ou null.
export function lignesRetour(state) {
  const r = retourIle(state);
  if (!r) return null;
  const T = M().RETOUR || {}, F = (DATA.VILLAGE.PRIX && DATA.VILLAGE.PRIX.FOURCHETTE) || [100, 100];
  const amis = Array.isArray(r.amis) ? r.amis.filter((x) => typeof x === 'string') : [];
  const rendu = objet(r.rendu) ? r.rendu : {};
  const aRendu = entier(rendu.pieces) > 0 || Object.keys(objet(rendu.objets) ? rendu.objets : {}).length > 0;
  return {
    titre: T.TITRE || '', intro: T.INTRO || '',
    lignes: [
      { icone: '⚓', texte: remplir(T.PORT, { periode: entier(DATA.PORT && DATA.PORT.BAC && DATA.PORT.BAC.PERIODE) || 1 }) },
      { icone: '🧑‍🌾', texte: T.VILLAGEOIS || '' },
      { icone: '💞', texte: amis.length ? remplir(T.AMIS, { amis: liste(amis.length > 6 ? [...amis.slice(0, 5), `${amis.length - 5} autres`] : amis) }) : T.SANS_AMIS || '' },
      { icone: '🪙', texte: aRendu ? remplir(T.RENDU, { rendu: enTexte({ pieces: entier(rendu.pieces), objets: objet(rendu.objets) ? rendu.objets : {} }) }) : T.SANS_RENDU || '' },
      { icone: '📈', texte: remplir(T.PRIX, { de: F[0] - 100, a: F[1] - 100, part: entier(DATA.VILLAGE.PART) }) },
    ],
    cadeau: remplir(T.CADEAU, { cadeau: enTexte(r.cadeau || {}) }),
    bouton: T.BOUTON || 'OK',
  };
}

// La fenêtre fermée : le cadeau de bienvenue donné (une fois), la fenêtre oubliée. → le cadeau donné, ou null.
export function fermerRetourIle(state) {
  const r = retourIle(state);
  if (!r) return null;
  const k = objet(r.cadeau) ? r.cadeau : {}, donne = { pieces: entier(k.pieces), objets: {} };
  if (donne.pieces > 0) earn(state, donne.pieces, 'Cadeau de bienvenue sur l\'île');
  for (const [it, n] of Object.entries(objet(k.objets) ? k.objets : {})) if (DATA.OBJETS[it] && entier(n) > 0) { addItem(state, it, entier(n)); donne.objets[it] = entier(n); }
  delete state.retourIle;
  return donne;
}

// La page a gardé la sauvegarde d'avant sur l'appareil (js/ui/storage.js).
export function copieRetourGardee(state) {
  if (objet(state && state.retourIle)) state.retourIle.copie = true;
}

/* ---------- la sauvegarde (format 102) ---------- */

// Les champs de la migration, réparés (state.js, la migration 101 → 102) : une liste de candidats illisible s'en va, un
// candidat sans prénom aussi ; une fenêtre du retour illisible s'efface. Une partie d'avant n'en a pas : rien.
export function reparerMigrationIle(state) {
  if ('candidats' in state) {
    const L = candidatsDe(state).map((c) => ({
      ...c, genre: c.genre === 'm' ? 'm' : 'f', pts: Math.min(DATA.AMITIE.ECHELLE.MAX, entier(c.pts)),
      gouts: objet(c.gouts) ? Object.fromEntries(Object.entries(c.gouts).filter(([it, g]) => DATA.OBJETS[it] && ['adore', 'aime', 'deteste'].includes(g))) : {},
      connus: objet(c.connus) ? c.connus : {},
    }));
    if (L.length) state.candidats = L;
    else delete state.candidats;
  }
  if ('retourIle' in state && !objet(state.retourIle)) delete state.retourIle;
  return state;
}
