import { DATA } from './catalog.js';
import { fail } from './devices.js';
import { villageActif } from './village.js';
import { addItem, countItem, takeItem } from './inventory.js';
import { farmTerrain } from './terrain.js';
import { blocsPoses, empriseMeuble, sensBloc } from './blocs.js';
import { trouverVillageois, villageoisDe } from './villageois.js';
import { debloque, vocationsEtat } from './vocations.js';

/* ---------- les projets du village (le chantier « l'île à bâtir », fiche I8a) ----------

   Ceux des hameaux (projets.js : aménager la place, le jardin partagé) reviennent pour le village, avec quatre
   bâtiments : le lavoir, le kiosque, la fontaine du village, le four commun (VOCATIONS.village.PROJETS,
   data/village.json). Un projet à la fois :
     - le joueur le lance (lancerProjet) s'il est ouvert (sans `palier`, ou débloqué par la convivialité :
       « projet:<sorte> ») ; un bâtiment (`bloc`) : il reçoit son chantier à poser (l'objet du bloc), qu'il pose
       dehors avec Construire ; tant qu'il n'est pas fini, la carte le montre en chantier (dessinProjet) ;
     - il apporte les matériaux (apporterAuProjetVillage : ce qu'il a de ce qui manque) ;
     - il envoie des villageois au chantier (envoyerAuChantier : v.chantier = la sorte) : tant que tout est là et le
       chantier posé (ou, sans bloc, la place trouvée), ils y travaillent à la place de leur tâche (auChantier :
       taches.js ne la leur fait pas faire, la journée leur donne des créneaux de travail autour du chantier,
       villageois-journee.js), et le tableau le montre (le journal : tache « chantier », chantier : la sorte) ;
     - la nuit (projetsVillageNuit, après les tâches) : chacun de ceux qui y ont travaillé compte une journée ;
       JOURNEES journées faites, le projet est fini : le bâtiment prend son dessin achevé, ou le décor (`donne`) entre
       dans l'inventaire ; les villageois reprennent leur tâche.
   Rien qui produise : un projet embellit la place et compte pour la convivialité (vocation-village.js).

   La partie garde (state.vocations.village.projets) : { encours: { sorte, recu: { objet: n }, journees, debut } ou
   null, faits: [{ sorte, jour }] } ; et chaque villageois envoyé au chantier, v.chantier (la sorte ; null ou absent :
   il fait sa tâche). Les tests : tests/engine/village-vocations.test.mjs. */

const PR = () => ((DATA.VOCATIONS || {}).village || {}).PROJETS || {};
const SORTES = () => PR().SORTES || {};
const objet = (v) => !!v && typeof v === 'object' && !Array.isArray(v);
const jourDe = (state) => Math.max(1, Math.floor(Number(state && state.day) || 1));
const nomObjet = (it) => ((DATA.OBJETS[it] || { nom: it }).nom || it).toLowerCase();

function lire(state) {
  const v = state && objet(state.vocations) && objet(state.vocations.village) ? state.vocations.village : null;
  return v && objet(v.projets) ? v.projets : null;
}
function etat(state) {
  const V = vocationsEtat(state);
  if (!objet(V.village)) V.village = {};
  if (!objet(V.village.projets)) V.village.projets = { encours: null, faits: [] };
  const p = V.village.projets;
  if (!Array.isArray(p.faits)) p.faits = [];
  if (!objet(p.encours)) p.encours = null;
  else if (!objet(p.encours.recu)) p.encours.recu = {};
  return p;
}

// La définition du projet `sorte`, ou null.
export function defProjet(sorte) {
  const S = SORTES()[sorte];
  return objet(S) ? S : null;
}

// Les projets faits : [{ sorte, jour }].
export function projetsVillageFaits(state) {
  const p = lire(state);
  return p && Array.isArray(p.faits) ? p.faits.filter((f) => objet(f) && defProjet(f.sorte)).map((f) => ({ ...f })) : [];
}
export function projetFini(state, sorte) {
  return projetsVillageFaits(state).some((f) => f.sorte === sorte);
}

// Le projet `sorte` est-il ouvert (sans palier, ou débloqué par la convivialité) ?
export function projetOuvert(state, sorte) {
  const S = defProjet(sorte);
  return !!S && (!S.palier || debloque(state, S.palier));
}

// Le bloc du chantier posé du projet `sorte` (la case d'ancrage), ou null.
export function chantierPose(state, sorte) {
  const S = defProjet(sorte);
  if (!S || !S.bloc) return null;
  for (const [k, s] of Object.entries(blocsPoses(state))) if (s === S.bloc) return Number(k);
  return null;
}

// Le centre de la place (le panneau du village s'il est posé, sinon le premier de DECOR.CENTRES ; sinon la table de
// jardin la plus garnie) : sa case, ou null. (vocation-village.js le lit aussi : le décor de la place.)
export function centreDeLaPlace(state) {
  const B = blocsPoses(state), D = ((DATA.VOCATIONS || {}).village || {}).DECOR || {};
  for (const sorte of Array.isArray(D.CENTRES) ? D.CENTRES : []) {
    const k = Object.keys(B).map(Number).sort((a, b) => a - b).find((t) => B[t] === sorte);
    if (k !== undefined) return k;
  }
  const t = Object.keys(B).map(Number).sort((a, b) => a - b).find((x) => B[x] === 'table_jardin' || B[x] === 'table_rondins');
  return t === undefined ? null : t;
}

// Ce qui manque au projet en cours : { objet: n } (vide : tout est là).
function manqueDe(S, recu) {
  const m = {};
  for (const [it, n] of Object.entries(S.besoin || {})) { const r = n - (recu[it] || 0); if (r > 0) m[it] = r; }
  return m;
}

// Le projet en cours, en détail : { sorte, nom, icone, texte, besoin, recu, manque, pret (tout est là), journees (à
// faire), faites, bloc (l'objet du chantier, ou null), pose (la case du chantier posé, ou null), lieu (le chantier est
// praticable : posé, ou la place trouvée), equipe ([ids] envoyés au chantier), debut } ; null sans projet en cours.
export function projetEnCours(state) {
  const p = lire(state), e = p && objet(p.encours) ? p.encours : null;
  const S = e && defProjet(e.sorte);
  if (!S) return null;
  const recu = { ...(objet(e.recu) ? e.recu : {}) }, manque = manqueDe(S, recu);
  const pose = S.bloc ? chantierPose(state, e.sorte) : null;
  const lieu = S.bloc ? pose !== null : centreDeLaPlace(state) !== null;
  return {
    sorte: e.sorte, nom: S.nom, icone: S.icone, texte: S.texte || '', besoin: { ...(S.besoin || {}) }, recu, manque, pret: !Object.keys(manque).length,
    journees: Math.max(1, Number(S.journees) || 1), faites: Math.max(0, Math.floor(Number(e.journees) || 0)), bloc: S.bloc || null, pose, lieu,
    equipe: villageoisDe(state).filter((v) => v.chantier === e.sorte).map((v) => v.id), debut: e.debut || null,
  };
}

// Les projets du village, dans l'ordre (ORDRE) : [{ sorte, nom, icone, texte, besoin, journees, bloc, donne, ouvert,
// palier (la clé qui l'ouvre, ou null), fait, enCours }].
export function projetsVillage(state) {
  const ordre = Array.isArray(PR().ORDRE) ? PR().ORDRE : Object.keys(SORTES());
  const e = projetEnCours(state);
  return ordre.filter((s) => defProjet(s)).map((s) => {
    const S = defProjet(s);
    return { sorte: s, nom: S.nom, icone: S.icone, texte: S.texte || '', besoin: { ...(S.besoin || {}) }, journees: Math.max(1, Number(S.journees) || 1), bloc: S.bloc || null, donne: { ...(S.donne || {}) }, ouvert: projetOuvert(state, s), palier: S.palier || null, fait: projetFini(state, s), enCours: !!e && e.sorte === s };
  });
}

// Pourquoi le joueur ne peut pas lancer le projet `sorte`, ou null.
export function lancerRefus(state, sorte) {
  if (!villageActif(state)) return 'Le chantier de l\'île n\'est pas allumé.';
  const S = defProjet(sorte);
  if (!S) return 'Projet inconnu.';
  if (projetFini(state, sorte)) return 'Ce projet est déjà fini.';
  if (!projetOuvert(state, sorte)) return 'Le village n\'est pas encore assez convivial pour ce projet.';
  if (projetEnCours(state)) return 'Un projet est déjà en cours : finissez-le d\'abord.';
  if (!villageoisDe(state).some((v) => !v.enfant)) return 'Il faut des villageois pour bâtir ensemble.';
  return null;
}

// Le joueur lance le projet `sorte` ; un bâtiment : son chantier entre dans l'inventaire, à poser. → { ok, projet,
// chantier (l'objet reçu, ou null) } ou un refus.
export function lancerProjet(state, sorte) {
  const r = lancerRefus(state, sorte);
  if (r) return fail(r);
  const S = defProjet(sorte), p = etat(state);
  p.encours = { sorte, recu: {}, journees: 0, debut: jourDe(state) };
  const objetBloc = S.bloc && DATA.ATELIER.BLOCS[S.bloc] ? DATA.ATELIER.BLOCS[S.bloc].objet : null;
  if (objetBloc && chantierPose(state, sorte) === null) addItem(state, objetBloc, 1);
  return { ok: true, projet: projetEnCours(state), chantier: objetBloc };
}

// Le joueur apporte au projet en cours ce qu'il a de ce qui manque (tout ce qu'il peut). → { ok, donne: { objet: n },
// pret } ou un refus.
export function apporterAuProjetVillage(state) {
  const e = projetEnCours(state);
  if (!e) return fail('Pas de projet en cours.');
  if (e.pret) return fail('Tout est là : il ne manque plus que des bras.');
  const p = etat(state), donne = {};
  for (const [it, m] of Object.entries(e.manque)) {
    const n = Math.min(m, countItem(state, it));
    if (n <= 0) continue;
    takeItem(state, it, n);
    p.encours.recu[it] = (p.encours.recu[it] || 0) + n;
    donne[it] = n;
  }
  if (!Object.keys(donne).length) return fail(`Il te manque de quoi aider : ${Object.keys(e.manque).map(nomObjet).join(', ')}.`);
  return { ok: true, donne, pret: projetEnCours(state).pret };
}

// Le joueur envoie le villageois `id` au chantier (`oui` false : il l'en rappelle, il reprend sa tâche). → { ok } ou
// un refus.
export function envoyerAuChantier(state, id, oui = true) {
  if (!villageActif(state)) return fail('Le chantier de l\'île n\'est pas allumé.');
  const v = trouverVillageois(state, id);
  if (!v) return fail('Villageois inconnu.');
  if (!oui) { v.chantier = null; return { ok: true, chantier: null }; }
  const e = projetEnCours(state);
  if (!e) return fail('Pas de projet en cours.');
  if (v.enfant) return fail('Un enfant ne travaille pas au chantier.');
  v.chantier = e.sorte;
  return { ok: true, chantier: e.sorte };
}

// Le joueur abandonne le projet en cours (son chantier n'est pas posé) : les matériaux et le chantier lui reviennent,
// les villageois reprennent leur tâche. → { ok, rendu } ou un refus.
export function abandonnerProjet(state) {
  const e = projetEnCours(state);
  if (!e) return fail('Pas de projet en cours.');
  if (e.pose !== null) return fail('Reprends d\'abord le chantier posé (avec Construire).');
  const S = defProjet(e.sorte), objetBloc = S.bloc && DATA.ATELIER.BLOCS[S.bloc] ? DATA.ATELIER.BLOCS[S.bloc].objet : null;
  if (objetBloc && countItem(state, objetBloc) > 0) takeItem(state, objetBloc, 1);
  for (const [it, n] of Object.entries(e.recu)) if (n > 0) addItem(state, it, n);
  for (const v of villageoisDe(state)) if (v.chantier) v.chantier = null;
  etat(state).encours = null;
  return { ok: true, rendu: e.recu };
}

// Le villageois `v` travaille-t-il au chantier aujourd'hui (à la place de sa tâche) ? Envoyé au projet en cours, tout
// est là, le chantier est praticable ; ni au repos, ni en route, ni enfant. (taches.js, villageois-journee.js)
export function auChantier(state, v) {
  if (!v || !v.chantier || v.repos || v.accueil || v.enfant || !villageActif(state)) return false;
  const e = projetEnCours(state);
  return !!e && e.sorte === v.chantier && e.pret && e.lieu;
}

// Les postes du chantier en cours (la journée : où ils travaillent) : [{ case, vers }] — les cases libres autour du
// bâtiment posé (devant d'abord, puis les côtés), tournées vers lui ; sans bloc, autour du centre de la place. `libre` :
// la case est-elle libre (villageois-journee.js, lieuxDuVillage).
export function postesChantier(state, libre) {
  const e = projetEnCours(state);
  if (!e || !e.lieu) return [];
  const W = farmTerrain(state).LARGEUR;
  let cases;
  if (e.bloc) cases = empriseMeuble(state, e.bloc, e.pose, sensBloc(state, e.pose)) || [e.pose];
  else cases = [centreDeLaPlace(state)];
  const dans = new Set(cases), out = [], vus = new Set();
  // (devant : la rangée sous le bâtiment ; puis la gauche, la droite ; derrière, en dernier : on ne les y verrait pas)
  const autour = [];
  for (const t of cases) for (const [d, rang] of [[W, 0], [-1, 1], [1, 1], [W - 1, 2], [W + 1, 2], [-W, 3]]) autour.push([t + d, rang, t]);
  autour.sort((a, b) => a[1] - b[1] || a[0] - b[0]);
  for (const [t, , vers] of autour) {
    if (dans.has(t) || vus.has(t) || !libre(t)) continue;
    vus.add(t);
    out.push({ case: t, vers });
  }
  return out;
}

// Ce qui change quand le chantier change (la journée du village est gardée tant qu'elle est la même).
export function signatureProjets(state) {
  const e = projetEnCours(state);
  if (!e) return '';
  return `${e.sorte}|${e.pret ? 1 : 0}|${e.pose ?? (e.lieu ? 'p' : '-')}|${e.equipe.join(',')}`;
}

// La nuit (runNight, après les tâches, avant les liens) : chacun de ceux qui ont travaillé au chantier aujourd'hui
// compte une journée (sa journée de travail le dit : tache « chantier », le journal et le tableau la montrent) ;
// toutes faites, le projet est fini. → { sorte, nom, icone, equipe, faites, journees, fini, donne } ou null.
export function projetsVillageNuit(state) {
  if (!villageActif(state)) return null;
  const e = projetEnCours(state);
  if (!e) return null;
  const jour = jourDe(state), S = defProjet(e.sorte), p = etat(state);
  const equipe = villageoisDe(state).filter((v) => auChantier(state, v));
  for (const v of equipe) {
    // (sa journée : au chantier ; le journal, villageois.js nuitDe, le note à la place de sa tâche)
    v.travail = { jour, tache: 'chantier', chantier: e.sorte, actions: 1, produit: {}, utilise: {}, essai: 0 };
  }
  p.encours.journees = Math.min(e.journees, e.faites + equipe.length);
  const out = { sorte: e.sorte, nom: S.nom, icone: S.icone, equipe: equipe.map((v) => v.id), faites: p.encours.journees, journees: e.journees, fini: false, donne: {} };
  if (p.encours.journees >= e.journees) {
    p.faits.push({ sorte: e.sorte, jour });
    p.encours = null;
    for (const v of villageoisDe(state)) if (v.chantier) v.chantier = null;
    for (const [it, n] of Object.entries(S.donne || {})) if (DATA.OBJETS[it] && n > 0) { addItem(state, it, n); out.donne[it] = n; }
    out.fini = true;
  }
  return out;
}

// Combien de projets du village sont finis.
export function nombreProjetsFaits(state) {
  return projetsVillageFaits(state).length;
}

// Le dessin d'un bâtiment de projet posé (la carte, js/ui/stage.js) : `dessin` fini, `${dessin}_chantier` sinon.
export function dessinProjet(state, sortieBloc) {
  const b = DATA.ATELIER.BLOCS[sortieBloc];
  if (!b || !b.projetVillage) return b ? b.dessin : null;
  return projetFini(state, b.projetVillage) ? b.dessin : `${b.dessin}_chantier`;
}

// Pour la scène : le chantier en cours ({ sorte, pose, faites, journees, pret }) ou null.
export function chantierPourLaCarte(state) {
  const e = projetEnCours(state);
  return e ? { sorte: e.sorte, pose: e.pose, faites: e.faites, journees: e.journees, pret: e.pret } : null;
}

// Les projets d'une sauvegarde (la migration v92 → v93).
export function reparerProjetsVillage(p) {
  const o = objet(p) ? p : {};
  const faits = [], vus = new Set();
  for (const f of Array.isArray(o.faits) ? o.faits : []) if (objet(f) && defProjet(f.sorte) && !vus.has(f.sorte)) { vus.add(f.sorte); faits.push({ sorte: f.sorte, jour: Number.isInteger(f.jour) ? f.jour : 1 }); }
  const e = objet(o.encours) && defProjet(o.encours.sorte) && !vus.has(o.encours.sorte) ? o.encours : null;
  const recu = {};
  if (e) for (const [it, n] of Object.entries(objet(e.recu) ? e.recu : {})) if (DATA.OBJETS[it] && Number.isInteger(n) && n > 0) recu[it] = Math.min(n, (defProjet(e.sorte).besoin || {})[it] || 0);
  return { encours: e ? { sorte: e.sorte, recu, journees: Number.isInteger(e.journees) && e.journees >= 0 ? e.journees : 0, debut: Number.isInteger(e.debut) ? e.debut : 1 } : null, faits };
}
