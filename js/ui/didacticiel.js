// didacticiel.js — le didacticiel d'une nouvelle partie (le moteur : js/engine/didacticiel.js).
//
// Une bulle de texte, en bas de l'écran (en haut quand ce qu'elle montre est en bas), dit quoi
// faire ; ce qu'il faut toucher porte un anneau qui pulse (.didac-ring) : une jauge, la flèche du
// menu latéral, une entrée du menu, une case du menu Construire, une recette de l'Atelier, un outil
// de la barre d'outils. Sur la carte, la scène entoure d'un cercle les objets à toucher (modèle :
// surbrillance, js/carte/ferme/didacticiel.js) : les pierres, le bois, l'Atelier, le puits. En
// haut à droite, sous le hublot, les compteurs (« 🪨 2 / 3 ») de ce qu'il reste à réunir. Les
// étapes à lire ont un bouton « Suivant » ; les autres passent d'elles-mêmes quand leur objectif
// est atteint (majDidacticiel, à chaque rendu). « Passer » arrête le didacticiel.
//
// Fiche 9b : les étapes du grand monde (ETAPES_MONDE) : la carte du monde (l'entrée 🧭 du menu ; l'étape
// passe quand elle s'ouvre), la sortie de la ferme (ses cases allumées sur la carte), une prise dans le
// monde (la hache dans la barre d'outils), la calèche (un cercle autour d'elle, le bouton Héler, et la
// case où elle se gare devant la ferme ; il est dit où elle est et l'heure), le hameau voisin (montré sur
// la carte du monde en arrivant à l'étape : son repère, puis « Y mener la boussole »), puis la boussole
// jusqu'à lui. Chacune a son bouton « Passer cette étape » : aucune ne bloque.

import { DATA } from '../engine/catalog.js';
import { countItem } from '../engine/inventory.js';
import { craftStatus } from '../engine/atelier.js';
import { cibleRecette } from './atelier.js';
import { cibleBloc } from './chantier.js';
import { eauCruche, aCruche } from '../engine/cruche.js';
import {
  casesAbriAPoser, etapeDidacticiel, ETAPES, ETAPES_MONDE, majDidacticiel, objectifDidacticiel, passerDidacticiel, passerEtapeDidacticiel,
  planAbri, suivantDidacticiel,
} from '../engine/didacticiel.js';
import { farmTerrain } from '../engine/terrain.js';
import { absoluteHours } from '../engine/clock.js';
import { CALECHE, calecheMaintenant, heureTexte, ouEstCaleche } from '../engine/caleche.js';
import { unlockLevel } from '../engine/levels.js';
import { marcheOuvert } from '../engine/devices.js';
import { boussoleMontree, lieuxDeLaCarte, montrerLieu } from '../engine/monde-vu.js';
import { solDuMonde } from './monde-sol.js';
import { buildMode, hoeMode, scytheMode, state } from './store.js';
import { menuOpen, stageWindow } from './stage-windows.js';
import { toolbarOpen } from './outils.js';
import { persistState } from './storage.js';
import { morph, refresh } from './render.js';
import { registerActions } from './actions.js';
import { stageUsable } from './stage.js';
import { setupPending } from '../engine/depart.js';
import { consentBannerPending, consentBannerShown, storyOpen } from './calme.js';

const nomObjet = (o) => (DATA.OBJETS[o] ? DATA.OBJETS[o].nom.toLowerCase() : o);
const fabricable = (id) => craftStatus(state, id).ok;
const atelierOuvertFenetre = () => stageWindow === 'atelier';
const tenu = (outil) => !!document.querySelector(`.tool-slot.active[data-outil="${outil}"]`);
const ongletGraines = () => !!document.querySelector('.inv-tab.active[data-tab="graines"]');

// La première recette de `ids` qu'on peut fabriquer maintenant, sinon la première de la liste.
function recette(ids) {
  return ids.find(fabricable) || ids[0];
}

// L'entrée `tab` du menu latéral (d'abord la flèche, s'il est fermé).
const menu = (tab) => (menuOpen ? `.nav-btn[data-tab="${tab}"]` : '#side-tab');

// Le menu Construire, ouvert sur le bloc `sorte` : d'abord l'entrée 🔨 du menu, puis la case du
// bloc ; null quand il est en main (on touche alors la carte).
function construire(sorte) {
  if (!buildMode) return menu('atelier');
  return buildMode === sorte ? null : cibleBloc(sorte);
}

// Un outil de la barre d'outils : d'abord fermer la fenêtre ouverte (la barre ne se montre pas
// sous une fenêtre), puis la languette si la barre est rangée, puis la case de l'outil.
const outil = (id) => (tenu(id) ? null : stageWindow ? '#stage-window-close' : toolbarOpen ? `.tool-slot[data-outil="${id}"]` : '.tool-bar-tab');

// Ce qu'il faut dire pour prendre un outil (`nom` : son nom, en HTML) dans la barre d'outils.
function prendreOutil(nom) {
  if (stageWindow === 'atelier') return 'Ferme la fenêtre de l\'<b>Atelier</b> (✕) pour retrouver ta barre d\'outils.';
  if (stageWindow) return 'Ferme cette fenêtre (✕) pour retrouver ta barre d\'outils.';
  if (!toolbarOpen) return 'Appuie sur la <b>flèche</b> de la barre d\'outils, en bas de l\'écran, pour la faire sortir.';
  return `Prends la ${nom} dans ta barre d'outils.`;
}

// Une recette de l'Atelier : sa fenêtre ouverte, son onglet, sa case (ou celle de son groupe),
// le bouton Fabriquer ; sinon l'Atelier de la carte.
function fabriquer(ids) {
  if (buildMode) return { cible: '.build-bar-close' };
  if (!atelierOuvertFenetre()) return { carte: { blocs: ['atelier'] } };
  const id = recette(ids);
  const c = cibleRecette(id);
  if (c) return { cible: c };
  return { cible: fabricable(id) ? `[data-action="atelier-fabriquer"][data-recette="${id}"]` : null };
}
// (pour une étape : sa cible et sa surbrillance, d'après la liste de recettes `ids()`)
const fabrique = (ids) => ({ cible: () => fabriquer(ids()).cible || null, carte: () => fabriquer(ids()).carte || null });

/* -- fiche 9b : le grand monde -- */

// La carte du monde est-elle ouverte (js/ui/carte-monde.js : une fenêtre par-dessus) ?
const carteOuverte = () => !!document.querySelector('#modal-root .carte-monde');
// L'entrée 🧭 du menu (d'abord la flèche, s'il est fermé).
const menuCarte = () => (menuOpen ? '.nav-btn[data-action="carte-monde-open"]' : '#side-tab');
// Les trois cases de la sortie de la ferme (le chemin y a trois cases de large) : là où la calèche se gare.
function casesSortie(sorte = 'porte') {
  const T = farmTerrain(state), S = T.MONDE && T.MONDE.cadre && T.MONDE.cadre.SORTIE;
  if (!Number.isInteger(S)) return [];
  return [S - T.LARGEUR, S, S + T.LARGEUR].map((t) => ({ case: t, sorte }));
}
// L'heure du jeu, en mots (« 8 h 15 »).
const heure = () => heureTexte(absoluteHours(state) % 24);
// Le premier élément visible de `sel`, ou null (pour une cible qui peut manquer).
const visibleSel = (sel) => (element(sel) ? sel : null);

// Le hameau voisin, montré sur la carte du monde en arrivant à son étape (le cocher en a parlé) : le plus
// proche de la sortie de la ferme parmi ceux du plan, sauf si un hameau y est déjà (vu en marchant).
// Gardé dans state.didacticiel.montre. → vrai si la partie a changé.
function montrerHameauVoisin() {
  const d = state.didacticiel, T = farmTerrain(state), sol = T.MONDE ? solDuMonde(T) : null, lieux = sol && sol.lieux();
  if (!lieux || d.montre) return false;
  if (lieuxDeLaCarte(state, lieux, T).hameaux.length) { d.montre = true; return true; }
  const S = T.MONDE.cadre.SORTIE, W = T.LARGEUR, dist = (t) => Math.hypot((t % W) - (S % W), Math.floor(t / W) - Math.floor(S / W));
  const h = [...(lieux.hameaux || [])].sort((a, b) => dist(a.case) - dist(b.case))[0];
  if (!h) return false;
  montrerLieu(state, h.case, 6);
  d.montre = h.id;
  return true;
}

// Les étapes : leur texte (HTML sûr : rien de ce que tape le joueur), et ce qu'elles montrent
// ({ cible: sélecteur, carte: surbrillance de la scène }).
const ETAPES_UI = {
  sante: { texte: () => 'Bienvenue sur ta ferme ! Voici tes jauges. Le cœur, c\'est ta <b>santé</b> : ton énergie. Chaque action en coûte un peu ; elle remonte en dormant et en mangeant.', cible: () => '.player-gauge:nth-child(1)' },
  endurance: { texte: () => 'L\'éclair, c\'est ton <b>endurance</b> : plus tu montes de niveau, moins tes actions te fatiguent.', cible: () => '.player-gauge:nth-child(2)' },
  bonheur: { texte: () => 'Le sourire, c\'est le <b>bonheur</b> de ta famille : de bons repas, un lit pour chacun, et il grimpe.', cible: () => '.player-gauge:nth-child(3)' },
  xp: { texte: () => 'L\'étoile, c\'est ton <b>niveau</b> ; l\'anneau doré autour de ton portrait, ton <b>expérience</b> (XP) : chaque action t\'en rapporte. Anneau plein, tu passes au niveau suivant et de nouvelles choses se débloquent.', cible: () => '.player-level' },
  autonomie: { texte: () => 'La pousse, c\'est l\'<b>autonomie</b> de ta ferme : la part de ce que mange ta famille que tu as produit toi-même. Le but du jeu : 100 % !', cible: () => '.player-auto' },
  argent: { texte: () => 'Et voici ton <b>argent</b>, pour commercer avec la calèche quand elle passera à la ferme.', cible: () => '.player-money' },
  deplacement: { texte: () => 'Pour <b>te déplacer</b>, pose ton doigt sur la carte et fais-le glisser : ton personnage marche dans cette direction tant que ton doigt reste posé, et la carte le suit.' },
  pierres: { texte: () => 'Pour <b>ramasser</b>, touche simplement l\'objet : ton personnage va le chercher. Commence par les <b>petites pierres</b> (entourées sur la carte) : il en faut pour l\'Atelier.', carte: () => ({ ramassables: 'petite_pierre' }) },
  bois: { texte: () => 'Parfait ! Maintenant, ramasse des <b>morceaux de bois</b>.', carte: () => ({ ramassables: 'morceau_bois' }) },
  atelier: {
    texte: () => (buildMode === 'atelier' ? 'Touche une case d\'herbe libre de la carte pour y <b>poser l\'Atelier</b>.' : buildMode ? 'Choisis l\'<b>Atelier</b> dans le menu Construire.' : menuOpen ? 'Touche 🔨 <b>Construire</b>.' : 'Tu as de quoi bâtir ton <b>Atelier</b> ! Ouvre le menu sur le côté (la flèche).'),
    cible: () => construire('atelier'),
  },
  atelier_ouvrir: {
    texte: () => (buildMode ? 'L\'Atelier est posé ! Range le menu Construire (✕).' : 'Touche l\'<b>Atelier</b> sur la carte : c\'est là que tu fabriqueras tout.'),
    cible: () => (buildMode ? '.build-bar-close' : null),
    carte: () => (buildMode ? null : { blocs: ['atelier'] }),
    bouton: () => false,   // (elle passe quand la fenêtre de l'Atelier s'ouvre)
  },
  faux: { texte: () => (atelierOuvertFenetre() ? (fabricable('faux') ? 'Fabrique ta première <b>faux</b> : elle coupe l\'herbe haute.' : 'Il te faut de quoi fabriquer la <b>faux</b> : ramasse encore du bois et des pierres.') : 'Ton premier outil sera une <b>faux</b> : touche l\'Atelier.'), ...fabrique(() => ['faux']) },
  fibres: { texte: () => (tenu('faux') || scytheMode ? 'Touche les touffes d\'<b>herbe haute</b> pour les faucher, puis marche sur les <b>fibres</b> tombées pour les ramasser.' : prendreOutil('<b>faux</b>')), cible: () => outil('faux') },
  outils: { texte: () => (atelierOuvertFenetre() ? 'Fabrique la <b>hache</b> (pour le bois des arbres) et la <b>pioche</b> (pour les rochers).' : 'À l\'Atelier, fabrique maintenant la <b>hache</b> et la <b>pioche</b>. Il te faut du bois, des pierres et des fibres.'), ...fabrique(() => ['hache', 'pioche']) },
  abri_ressources: { texte: () => `Ta famille a besoin d'un <b>abri</b> : des murs en bois, une porte, et une paillasse pour chacun (${planAbri(state).paillasses}). Coupe des arbres à la <b>hache</b> pour le bois, fauche pour les fibres.` },
  // (après avoir abattu des arbres pour l'abri : ils ne repoussent pas, il faut les planter)
  arbres: { texte: () => `Un arbre abattu ne repousse <b>pas</b> de lui-même ! Il laisse une <b>graine</b> (${nomObjet(DATA.HACHE.GRAINES.pin)}, ${nomObjet(DATA.HACHE.GRAINES.arbre)}) : plante-la depuis ton <b>inventaire</b> (onglet des graines) sur une case d'herbe libre, et un nouvel arbre y poussera.` },
  abri_fabriquer: {
    texte: () => (atelierOuvertFenetre() ? 'Fabrique les <b>murs en bois</b>, des <b>planches</b> pour la <b>porte</b>, et les <b>paillasses</b>.' : 'Tout est réuni ! À l\'Atelier, fabrique les murs, la porte et les paillasses.'),
    ...fabriquerAbri(),
  },
  abri_construire: {
    texte: () => (buildMode && ['mur_bois', 'porte'].includes(buildMode) ? (casesAbriAPoser(state, 'abri_construire').length ? 'Pose les <b>murs</b> sur les cases dorées et la <b>porte</b> directement sur la case blanche.' : 'Pose les <b>murs</b> en rectangle autour d\'une rangée de cases libres (une par paillasse), avec la <b>porte</b> dans l\'un des côtés.') : buildMode ? 'Choisis le <b>mur en bois</b>.' : menuOpen ? 'Touche 🔨 <b>Construire</b>.' : 'Bâtis l\'abri là où les cases brillent : ouvre le menu (la flèche), puis 🔨 Construire.'),
    // les cases de l'abri qui restent à poser, allumées sur la carte (murs dorés, porte blanche)
    carte: () => ({ cases: casesAbriAPoser(state, 'abri_construire') }),
    cible: () => (buildMode && buildMode === 'porte' ? null : buildMode && buildMode !== 'mur_bois' && countItem(state, 'mur_bois') > 0 ? cibleBloc('mur_bois') : buildMode ? (countItem(state, 'mur_bois') === 0 && countItem(state, 'porte') > 0 && buildMode !== 'porte' ? cibleBloc('porte') : null) : menu('atelier')),
  },
  paillasses: { texte: () => (buildMode === 'paillasse' ? 'Pose les <b>paillasses</b> dans l\'abri, sur les cases vertes qui brillent.' : buildMode ? 'Choisis la <b>paillasse</b>.' : 'Il reste les <b>paillasses</b> : 🔨 Construire.'), cible: () => construire('paillasse'), carte: () => ({ cases: casesAbriAPoser(state, 'paillasses') }) },
  houe: { texte: () => (atelierOuvertFenetre() ? 'Fabrique la <b>houe</b> : elle change l\'herbe en terre à cultiver.' : 'L\'abri est prêt, ta famille dormira au chaud ! Place au potager : fabrique une <b>houe</b> à l\'Atelier.'), ...fabrique(() => ['houe']) },
  // l'inventaire ouvert, l'onglet des graines, les graines offertes qui brillent (renderDidacticiel),
  // puis on le referme : l'étape passe (et la suivante fait prendre la houe)
  graines: {
    texte: () => (stageWindow !== 'inventaire' ? 'Un cadeau t\'attend dans ton <b>inventaire</b> : ouvre le menu, puis l\'Inventaire.'
      : !ongletGraines() ? 'Ouvre l\'onglet des <b>graines</b> : un cadeau t\'y attend. (Ton inventaire range par onglets tout ce que tu as ramassé et fabriqué.)'
      : `Ferme ton inventaire (✕), puis prends la houe : on t'offre ${Object.entries(DATA.DIDACTICIEL.GRAINES).map(([o, n]) => `<b>${n} ${nomObjet(o)}</b>`).join(', ')} (elles brillent) pour ton premier potager ! Plus tard, la calèche qui passe à la ferme vers ${DATA.CALECHE.FERME} h t'en vendra d'autres.`),
    cible: () => (stageWindow !== 'inventaire' ? menu('inventaire') : !ongletGraines() ? '.inv-tab[data-tab="graines"]' : '#stage-window-close'),
    bouton: () => false,
  },
  labour: { texte: () => (hoeMode || tenu('houe') ? 'Touche des cases d\'herbe pour les <b>labourer</b>.' : prendreOutil('<b>houe</b>')), cible: () => (hoeMode ? null : outil('houe')) },
  semis: { texte: () => (document.querySelector('#modal-root [data-action="plant"]') ? 'Choisis la <b>carotte</b>.' : hoeMode ? 'Range la houe (touche-la), puis touche une terre labourée pour <b>semer</b>.' : 'Touche une terre labourée pour y <b>semer</b> tes graines.'), cible: () => (document.querySelector('#modal-root [data-action="plant"]') ? '#modal-root [data-action="plant"]' : hoeMode ? outil('houe') || '.tool-slot[data-outil="houe"]' : null) },
  puits: {
    texte: () => (countItem(state, 'puits_pierre') > 0 ? (buildMode === 'puits' ? 'Touche une case d\'herbe pour poser le <b>puits</b>.' : 'Pose le <b>puits</b> dehors : 🔨 Construire.') : atelierOuvertFenetre() ? 'Fabrique le <b>puits</b> et une <b>cruche</b> : pour arroser, tu y rempliras la cruche.' : 'Tes graines ont besoin d\'eau : fabrique un <b>puits</b> et une <b>cruche</b> à l\'Atelier.'),
    ...puits(),
  },
  // (le puits vient d'être posé : la fenêtre Construire est encore ouverte, et un appui sur le
  // puits le reprendrait ; on la ferme d'abord)
  arroser: {
    texte: () => (buildMode ? 'Le puits est posé ! Ferme d\'abord la fenêtre <b>Construire</b> (✕) : tu pourras alors toucher le puits.'
      : eauCruche(state) > 0 ? 'Touche ta plante pour l\'<b>arroser</b> avec la cruche.' : 'Touche le <b>puits</b> pour remplir ta cruche.'),
    cible: () => (buildMode ? '.build-bar-close' : null),
    carte: () => (buildMode || eauCruche(state) > 0 ? null : { blocs: ['puits'] }),
  },
  // fiche 9b : le grand monde
  carte: {
    texte: () => (carteOuverte() ? 'Voici ce que tu as vu du <b>grand monde</b> : ta ferme, au milieu. Le reste est sous le brouillard, il se lèvera à mesure que tu marcheras.'
      : `Ta plante est arrosée : elle poussera toute seule. Ta ferme n'est qu'un coin du <b>grand monde</b>, caché sous le brouillard. ${menuOpen ? 'Touche 🧭 <b>Carte du monde</b>.' : 'Ouvre la <b>carte du monde</b> : le menu (la flèche), puis 🧭 Carte du monde (ou la touche M).'}`),
    cible: () => (carteOuverte() ? null : menuCarte()),
    bouton: () => false,   // (elle passe quand la carte du monde s'ouvre)
  },
  sortie: {
    texte: () => (carteOuverte() ? 'Ferme la carte, puis suis le <b>chemin de terre</b> de ta ferme vers l\'est (à droite) jusqu\'à sa <b>sortie</b>.'
      : 'Le chemin de terre de ta ferme mène au monde : suis-le vers l\'est (à droite) jusqu\'à la <b>sortie de la ferme</b>, les cases blanches qui brillent. Dehors, le brouillard se lève autour de toi.'),
    carte: () => ({ cases: casesSortie() }),
  },
  recolte_monde: {
    texte: () => (tenu('hache') || tenu('pioche') ? 'Touche un <b>arbre</b> pour le couper ou un <b>rocher</b> pour le casser. Ce que tu prends repousse quelques jours plus tard.'
      : stageWindow ? prendreOutil('<b>hache</b>')
      : 'Dehors, tout se récolte avec les gestes de la ferme : coupe un <b>arbre</b> à la hache, casse un <b>rocher</b> à la pioche, ou ramasse à la main des <b>mûres</b>, des champignons, des galets… (touche-les).'),
    cible: () => (tenu('hache') || tenu('pioche') ? null : outil('hache')),
  },
  caleche: {
    texte: () => {
      const vendre = marcheOuvert(state), ou = `${ouEstCaleche(state)} Il est ${heure()}.`;
      const e = calecheMaintenant(state), garee = e && e.etat === 'arret' && e.arret.sorte === 'ferme';
      return `La <b>calèche</b> fait le tour du monde et s'arrête chaque jour devant l'entrée de ta ferme vers ${heureTexte(CALECHE.FERME)}, une heure${garee ? '' : ' (les cases qui brillent)'}. ${ou} `
        + (vendre ? 'Attends-la là, ou hèle-la quand elle passe près de toi (🔔 Héler), puis touche-la et <b>vends-lui</b> quelque chose : une récolte, du bois, des mûres…'
          : `Va à sa rencontre, ou hèle-la quand elle passe près de toi (🔔 Héler), et <b>touche-la</b> : son cocher commercera avec toi dès le niveau ${unlockLevel('marche')}.`)
        + ' En attendant, continue ta ferme : la bulle attend.';
    },
    cible: () => visibleSel('.caleche-heler:not([hidden])'),
    // (garée devant la ferme, le cercle autour d'elle suffit : les cases seraient par-dessus)
    carte: () => { const e = calecheMaintenant(state); return e && e.etat === 'arret' && e.arret.sorte === 'ferme' ? { caleche: true } : { caleche: true, cases: casesSortie() }; },
  },
  hameau_choisir: {
    texte: () => (!carteOuverte() ? `Le cocher t'a parlé d'un <b>hameau</b> voisin : le voici sur ta carte du monde. ${menuOpen ? 'Touche 🧭 <b>Carte du monde</b>.' : 'Ouvre-la (le menu, puis 🧭 Carte du monde).'}`
      : document.querySelector('[data-action="carte-monde-but"]') ? 'Touche « <b>Y mener la boussole</b> » : elle te montrera le chemin.'
      : 'Touche le hameau 🏘️ sur la carte (fais-la glisser s\'il le faut) : son nom, sa distance, et la boussole.'),
    cible: () => (!carteOuverte() ? menuCarte() : visibleSel('[data-action="carte-monde-but"]') || visibleSel('[data-action="carte-monde-lieu"][data-sorte="hameau"]')),
  },
  hameau_aller: {
    texte: () => (carteOuverte() ? 'Ferme la carte : la <b>boussole</b>, sous l\'horloge, te mène au hameau.'
      : boussoleMontree(state) ? 'Suis l\'aiguille de la <b>boussole</b>, sous l\'horloge : elle montre le hameau, et sa distance en cases est dessous. Les chemins y mènent aussi. Là-bas, entre dans les maisons, parle aux habitants (touche-les).'
      : 'La boussole est retirée (Options) : suis les <b>chemins</b> jusqu\'au hameau, il est sur ta carte du monde.'),
    cible: () => (carteOuverte() ? null : visibleSel('.boussole')),
  },
  fin: { texte: () => 'Bravo, te voilà dans le grand monde ! Chaque hameau a ses familles et son métier, la montagne ses grottes, la côte sa mer ; la calèche achète ce que tu produis. Ta plante pousse à la ferme : récolte-la quand elle sera mûre. La suite est à toi : élevage, cuisine, et les objectifs des chapitres.' },
};

// L'abri à fabriquer : la recette dont il manque encore des objets.
function fabriquerAbri() {
  const prochaine = () => {
    const p = planAbri(state), compte = (o) => countItem(state, o);
    if (compte('mur_bois') < p.murs) return ['mur_bois'];
    if (compte('porte') < p.porte) return compte('planche') >= DATA.ATELIER.RECETTES.porte.entrees.planche ? ['porte'] : ['planche'];
    return ['paillasse'];
  };
  return fabrique(prochaine);
}

// Le puits et la cruche : les fabriquer, puis poser le puits.
function puits() {
  const aFaire = () => {
    const ids = [];
    if (countItem(state, 'puits_pierre') < 1) ids.push('puits_pierre');
    if (!aCruche(state)) ids.push('cruche');
    return ids;
  };
  const poser = () => countItem(state, 'puits_pierre') > 0 && (aCruche(state) || !fabricable('cruche'));
  return {
    cible: () => (poser() && !atelierOuvertFenetre() ? construire('puits') : aFaire().length ? fabriquer(aFaire()).cible || null : construire('puits')),
    carte: () => (poser() ? null : aFaire().length ? fabriquer(aFaire()).carte || null : null),
  };
}

// La cible `sel` : son élément visible, ou null.
function element(sel) {
  if (!sel) return null;
  const el = [...document.querySelectorAll(sel)].find((e) => e.getClientRects().length > 0);
  return el || null;
}

// Le didacticiel se montre-t-il ? (la carte est là, rien ne passe avant lui)
function visible() {
  if (!state || !etapeDidacticiel(state) || !stageUsable() || setupPending(state) || storyOpen()) return false;
  if (consentBannerShown() || consentBannerPending()) return false;
  return !document.querySelector('#modal-root .story-modal, #modal-root .setup-modal');
}

// Pour la carte (modèle.surbrillance) : ce que la scène entoure, ou null.
export function surbrillanceDidacticiel() {
  if (!visible()) return null;
  const e = ETAPES_UI[etapeDidacticiel(state)];
  return e && e.carte ? e.carte() : null;
}

// L'icône d'un compteur.
// (des compteurs qui ne sont pas des objets : les terres labourées ; fiche 9b, ce qui se coche)
const AUTRES = {
  terre: ['🟫', 'terres labourées'], sortie: ['🛤️', 'sortie de la ferme'], prise: ['🪓', 'prise dans le monde'],
  cocher: ['🐴', 'calèche rencontrée'], vente: ['🐴', 'vente à la calèche'], hameau: ['🏘️', 'hameau découvert'],
};
const icone = (o) => (AUTRES[o] ? AUTRES[o][0] : DATA.OBJETS[o] ? DATA.OBJETS[o].icone : '');
const libelle = (o) => (AUTRES[o] ? AUTRES[o][1] : nomObjet(o));

// Une fenêtre est-elle ouverte (une fenêtre de la carte, une fenêtre par-dessus) ? La bulle se
// réduit alors à une ligne en bas de l'écran, pour ne pas gêner ; un appui la déplie (deplie),
// jusqu'à ce que la fenêtre se ferme.
const fenetreOuverte = () => !!stageWindow || !!document.querySelector('#modal-root > *');
let deplie = false;

let anneau = null;
let lueur = null;           // une seconde surbrillance, sans être la cible : les graines offertes
let grainesVues = false;    // l'étape des graines : on les a vues dans l'inventaire
export function renderDidacticiel() {
  const root = document.getElementById('didacticiel-root');
  if (!root) return;
  if (state && majDidacticiel(state)) persistState();
  // la fenêtre de l'Atelier s'ouvre : l'étape « touche l'Atelier » est faite
  if (state && etapeDidacticiel(state) === 'atelier_ouvrir' && stageWindow === 'atelier' && suivantDidacticiel(state, 'atelier_ouvrir').ok) persistState();
  // fiche 9b : la carte du monde s'ouvre : l'étape « carte » est faite ; le hameau voisin se montre
  if (state && etapeDidacticiel(state) === 'carte' && carteOuverte() && suivantDidacticiel(state, 'carte').ok) persistState();
  if (state && etapeDidacticiel(state) === 'hameau_choisir' && montrerHameauVoisin()) persistState();
  // les graines vues dans l'inventaire, puis l'inventaire refermé : l'étape est faite
  if (state && etapeDidacticiel(state) === 'graines') {
    if (stageWindow === 'inventaire' && ongletGraines()) grainesVues = true;
    else if (grainesVues && stageWindow !== 'inventaire' && suivantDidacticiel(state, 'graines').ok) { grainesVues = false; persistState(); }
  }
  const etape = visible() ? etapeDidacticiel(state) : null;
  const brille = etape === 'graines' && stageWindow === 'inventaire' && ongletGraines()
    ? document.querySelector(Object.keys(DATA.DIDACTICIEL.GRAINES).map((o) => `.inv-slot[data-item="${o}"]`).join(',')) : null;
  if (lueur && lueur !== brille) lueur.classList.remove('didac-lueur');
  if (brille && brille !== lueur) brille.classList.add('didac-lueur');
  lueur = brille;
  document.body.classList.toggle('didacticiel', !!etape);
  const e = etape && ETAPES_UI[etape];
  const el = e && e.cible ? element(e.cible()) : null;
  if (anneau && anneau !== el) anneau.classList.remove('didac-ring');
  if (el && el !== anneau) el.classList.add('didac-ring');
  anneau = el;
  if (!e) { morph(root, ''); return; }
  const o = objectifDidacticiel(state);
  const n = ETAPES.indexOf(etape) + 1;
  const lire = !o && (!e.bouton || e.bouton());
  const passer = ETAPES_MONDE.includes(etape);
  // (fiche 9b : hors de la ferme, la boussole est sous l'horloge, à la place des compteurs : ils passent dessous)
  const bo = element('.boussole'), sous = bo ? ` style="top:${Math.round(bo.getBoundingClientRect().bottom + 6)}px"` : '';
  const compteurs = o && o.compteurs.length
    ? `<div class="didac-compteurs"${sous} aria-label="Ce qu'il te faut">${o.compteurs.map((c) => `<span class="didac-compteur${c.n >= c.besoin ? ' ok' : ''}" title="${libelle(c.objet)}"><span aria-hidden="true">${icone(c.objet)}</span> <span class="num">${Math.min(c.n, c.besoin)} / ${c.besoin}</span><span class="visually-hidden"> ${libelle(c.objet)}</span></span>`).join('')}</div>`
    : '';
  const fenetre = fenetreOuverte();
  if (!fenetre) deplie = false;
  if (fenetre && !deplie) {
    morph(root, `${compteurs}
    <section class="didac-bulle reduite" aria-live="polite" aria-label="Didacticiel">
      <button type="button" class="didac-reduite" data-action="didacticiel-deplier" aria-expanded="false" title="Afficher le didacticiel">
        <span class="didac-reduite-texte">${e.texte()}</span>
        <span class="muted num">${n} / ${ETAPES.length}</span>
        <span class="didac-chevron" aria-hidden="true">▴</span>
      </button>
    </section>`);
    return;
  }
  // la bulle en haut quand ce qu'elle montre est dans le bas de l'écran
  const haut = el && el.getBoundingClientRect().top > window.innerHeight * 0.55;
  morph(root, `${compteurs}
    <section class="didac-bulle${haut ? ' haut' : ''}" aria-live="polite" aria-labelledby="didac-texte">
      <p id="didac-texte">${e.texte()}</p>
      <div class="didac-pied">
        <button type="button" class="didac-passer" data-action="didacticiel-passer">Passer le didacticiel</button>
        ${passer ? '<button type="button" class="didac-passer" data-action="didacticiel-passer-etape">Passer cette étape</button>' : ''}
        <span class="muted num">${n} / ${ETAPES.length}</span>
        ${lire ? `<button type="button" class="btn primary" data-action="didacticiel-suivant">${etape === 'fin' ? 'Terminer' : 'Suivant'}</button>` : ''}
        ${fenetre ? '<button type="button" class="didac-replier" data-action="didacticiel-deplier" aria-expanded="true" title="Réduire le didacticiel" aria-label="Réduire le didacticiel">▾</button>' : ''}
      </div>
    </section>`);
}

registerActions({
  'didacticiel-deplier': () => {
    deplie = !deplie;
    refresh();
  },
  'didacticiel-suivant': () => {
    const r = suivantDidacticiel(state);
    if (r.ok) { persistState(); refresh(); }
  },
  'didacticiel-passer-etape': () => {
    const r = passerEtapeDidacticiel(state);
    if (r.ok) { persistState(); refresh(); }
  },
  'didacticiel-passer': () => {
    const r = passerDidacticiel(state);
    if (r.ok) { persistState(); refresh(); }
  },
});
