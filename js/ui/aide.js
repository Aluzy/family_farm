import { DATA } from '../engine/catalog.js';
import { houseRepaired } from '../engine/depart.js';
import { GAME_VERSION, STATE_VERSION } from '../engine/base.js';
import { farmOpen } from '../engine/devices.js';
import { hasHoe, seedStock } from '../engine/crops.js';
import { chapterCount, chapterProgress, plantableCropsFor } from '../engine/campaign.js';
import { setupPending } from '../engine/depart.js';
import { unlockLevel } from '../engine/levels.js';
import { advanceTutorial, skipTutorial, tutorialStep } from '../engine/alerts.js';
import { formatDuration, formatNumber } from '../engine/format.js';
import { activeTab, ecranFerme, hoeMode, state } from './store.js';
import { tel } from './consent.js';
import { consentBannerPending, consentBannerShown, letterToastShown, storyOpen, uiCalm } from './calme.js';
import { applyResult } from './game-actions.js';
import { morph } from './render.js';
import { stageUsable } from './stage.js';
import { menuOpen } from './stage-windows.js';
import { daysLabel } from './inventaire.js';
import { REDUCED_MOTION } from './animations.js';
import { openOptionsModal } from './options.js';
import { registerActions } from './actions.js';
import { openModal } from './modal.js';
import { penalite } from '../engine/inventory.js';

/* ---------- Lot 11 : aide sur chaque bâtiment ----------
   Les fiches (HELP, openHelpModal) sont dans js/ui/aide-fiches.js, chargé au premier « ? » (piste 3 du
   chantier « allègement ») ; ici, leur nom (et l'icône des fiches sans bâtiment, pour À propos). */

const NOMS_FICHES = {
  panneau: 'Panneau solaire', batterie: 'Batterie', pompe: 'Pompe', reservoir: 'Réservoir', potager: () => DATA.POTAGER.NOM,
  serre: 'Serre', silo: 'Silo', poulailler: 'Poulailler', paturage: 'Moutons et vaches', verger: 'Verger', four: 'Four',
  cuisine: 'Cuisine', moulin: 'Moulin', chaines: () => DATA.CHAINES.NOM, outils: 'Outils', monde: 'Le grand monde',
  gisements: 'Gisements, minerais et lingots', peche: 'Pêche', equipement: 'Équipement et sac à provisions',
  techno: 'Arbre des technologies', chapitres: 'Chapitres', frigo: 'Réfrigérateur',
};
const ICONES_FICHES = { monde: '🧭', outils: '🛠️', equipement: '🎒', gisements: '⛏️', peche: '🎣', chaines: () => DATA.CHAINES.ICONE, techno: '🔬' };
const valeur = (v) => (typeof v === 'function' ? v() : v);
export const nomFiche = (id) => valeur(NOMS_FICHES[id]);

let fichesChargees = null;
function openHelpModal(id) {
  if (!fichesChargees) fichesChargees = import('./aide-fiches.js').catch((e) => { fichesChargees = null; throw e; });
  fichesChargees.then((m) => m.openHelpModal(id)).catch(() => {});
}

// Les fiches sans bâtiment, ouvertes depuis À propos.
const FICHES = ['monde', 'outils', 'equipement', 'gisements', 'peche', 'chaines', 'techno'];
const fiches = () => FICHES;

// Le nom des actions de DATA.PERSONNAGE.COUTS, pour la règle de l'énergie.
const ACTIONS_NOMS = {
  couper: 'couper', piocher: 'piocher', faucher: 'faucher', pecher: 'pêcher', labourer: 'labourer', planter: 'planter', arroser: 'arroser',
  recolter: 'récolter', cueillir: 'cueillir', tondre: 'tondre', cuisiner: 'cuisiner', cuireFour: 'cuire au four',
  moudre: 'moudre', presser: 'presser',
};

export function helpBtn(id) {
  return `<button type="button" class="btn help-btn" data-action="help" data-id="${id}" aria-label="Aide : ${nomFiche(id)}">?</button>`;
}


/* ---------- Lot 11 : bulles d'aide de la première partie ---------- */

const TUTO = {
  eau: {
    titre: '💧 L\'eau et le soleil',
    // version 1.12 : dans une nouvelle partie, tant que la ferme n'est pas installée, la bulle
    // dit par où commencer
    texte: () => (!farmOpen(state) && !houseRepaired(state)
      ? 'Une terre sauvage, sans maison : ramasse les petites pierres et les morceaux de bois (un appui dessus), cueille les baies des buissons pour reprendre des forces (même épuisé) ou coupe-les à la hache pour leur bois, pose l\'Atelier (menu, 🔨 Construire) et touche-le pour y fabriquer une faux pour faucher l\'herbe haute (ses fibres), puis des murs, une porte et une paillasse, puis bâtis une pièce close avec la case 🔨 de la barre d\'outils (la porte se pose sur une case libre, ou à la place d\'un mur). Ce sera ton foyer : on y dort.'
      : !farmOpen(state)
      ? `Ton foyer est bâti. Ici, tout se fait d'abord à la main : fabrique à l'Atelier un puits et une cruche, pose le puits dehors avec la case 🔨, remplis la cruche au puits (un appui dessus : ton personnage y va et puise ; sa jauge bleue, dans la barre d'outils, dit l'eau qui reste) et arrose tes plantes. La calèche, qui passe à la ferme chaque jour vers ${DATA.CALECHE.FERME} h, commerce avec toi à partir du niveau ${unlockLevel('marche')}. Au niveau ${unlockLevel('energie')}, le panneau solaire, la pompe, la citerne et la batterie (il faut des lingots : le minerai des gisements, fondu au four) pomperont l'eau pour toi : l'automatisation commence.`
      : `Le panneau solaire charge la batterie de ${DATA.SOLEIL.DEBUT} h à ${DATA.SOLEIL.FIN} h ; la pompe s'en sert pour remplir le réservoir (${formatNumber(DATA.POMPE.WH_PAR_L)} Wh par litre). Chaque arrosage puise dans le réservoir : maintiens le doigt sur la citerne pour voir son niveau.${stageUsable() ? ' Sur la carte, touche le panneau solaire ou la batterie pour l\'énergie, le puits ou la citerne pour l\'eau.' : ''}`),
  },
  potager: {
    titre: '🌱 La zone de culture',
    // FLU-19 : plus de parcelle avant le labour ; on achète la houe, on laboure, puis on plante
    texte: () => `${hasHoe(state) ? 'Ta houe' : 'Fabrique d\'abord la houe à l\'Atelier : elle'} change l'herbe en terre ; les graines s'achètent à la calèche (onglet Acheter), quand elle passe à la ferme vers ${DATA.CALECHE.FERME} h. ${stageUsable()
      ? `Prends-la (bouton ${DATA.HOUE.ICONE} en bas à droite) et touche l'herbe foncée (les cases vertes) pour labourer. Range-la, puis touche une terre labourée pour planter, et touche-la encore pour l'arroser`
      : 'Laboure, puis touche « Planter » sur une parcelle vide, puis « Arroser »'}. Une plante arrosée gagne un stade ${DATA.TEMPS.POUSSE_HEURES} heures plus tard, puis redemande de l'eau : les carottes sont mûres en ${daysLabel(DATA.CULTURES.carotte.stades)}. ${stageUsable() ? 'Mûre, elle se balance : touche-la pour récolter, puis replante. Arrosée, elle n\'a besoin de rien : une bulle dit quand elle grandira. Maintiens le doigt sur une terre pour la fenêtre de la zone (Planter partout, Arroser tout, Récolter tout).' : 'Après la récolte, replante.'}`,
  },
  dormir: {
    titre: '😴 Dormir',
    texte: () => `À ${DATA.TEMPS.HEURE_NUIT} h, la famille va se coucher et la nuit défile jusqu'à ${DATA.TEMPS.HEURE_REVEIL} h ; ton personnage peut encore agir tant qu'il ne dort pas. À minuit, les poules pondent. Pendant la nuit, le bouton « Zzz », en bas à droite, envoie ton personnage dans son lit : quand il dort, la nuit défile en accéléré et son énergie remonte peu à peu (il lui faut ${DATA.PERSONNAGE.SOMMEIL_HEURES} heures de sommeil).`,
  },
};

let tutoShown = null; // bulle affichée au dernier rendu (pour faire défiler vers sa cible)

// Bulle visible maintenant : « dormir » partout, les autres sur la Ferme.
// FLU-17 : l'aide attend que l'écran soit calme et que le bandeau des cookies soit parti.
function visibleTutorial() {
  const step = tutorialStep(state);
  if (!step) return null;
  if (!uiCalm() || consentBannerShown() || consentBannerPending() || letterToastShown()) return null;
  if (step === 'dormir') return step;
  return activeTab === 'ferme' && !ecranFerme ? step : null;
}

// Classe à ajouter à l'élément que la bulle montre.
export function tutoTarget(step) {
  return visibleTutorial() === step ? ' tuto-target' : '';
}

export function renderTutorial() {
  renderGuide();
  const root = document.getElementById('tuto-root');
  const step = visibleTutorial();
  document.body.classList.toggle('has-tuto', !!step);
  if (!step) {
    if (root.childElementCount) morph(root, '');
    tutoShown = null;
    return;
  }
  const t = TUTO[step];
  const n = DATA.AIDE.ETAPES.indexOf(step) + 1;
  morph(root, `
    <section class="tuto tuto-${step}${step === 'dormir' ? '' : ' up'}" aria-labelledby="tuto-title">
      <h2 id="tuto-title"><span>${t.titre}</span><span class="muted num">${n} / ${DATA.AIDE.ETAPES.length}</span></h2>
      <p>${t.texte()}</p>
      <div class="row">
        <button type="button" class="btn" data-action="tuto-skip">Passer l'aide</button>
        <button type="button" class="btn primary" data-action="tuto-next">${n < DATA.AIDE.ETAPES.length ? 'Compris' : 'J\'ai compris'}</button>
      </div>
    </section>`);
  if (tutoShown !== step) {
    tutoShown = step;
    const target = document.querySelector('.tuto-target');
    // La cible monte en haut de l'écran (sous l'en-tête) : la bulle, en bas, ne la cache pas.
    if (target && step !== 'dormir') target.scrollIntoView({ block: 'start', behavior: REDUCED_MOTION && REDUCED_MOTION.matches ? 'auto' : 'smooth' });
  }
}

/* ---------- FLU-20 : l'aide montre l'élément à toucher ---------- */

// Pendant les bulles « L'eau et le soleil » et « La zone de culture », un seul élément porte
// un anneau animé : le bouton qui fait avancer l'objectif du chapitre en cours s'il est à
// l'écran, sinon la puce d'objectif (qui y mène, FLU-01). L'anneau suit l'état de la partie :
// il avance dès que l'objectif est atteint. Avec la houe en main, ce sont les cases vertes.
const GUIDE_BOUTONS = {
  houe: ['[data-action="atelier-fabriquer"][data-recette="houe"]:not([disabled])'],
  labours: ['.tool-slot[data-outil="houe"]'],
  semis: ['#modal-root [data-action="plant-all"][data-crop="carotte"]:not([disabled])', '#modal-root [data-action="plant"]:not([disabled])', '[data-action="plant-all-open"]:not([disabled])', '[data-action="plant-open"]:not([disabled])'],
  arrosees: ['[data-action="water-all"]:not([disabled])', '[data-action="water"]:not([disabled])'],
  recoltes: ['[data-action="harvest"]'],
};

const GUIDE_GRAINES = [
  '[data-action="buy-item"][data-item="graine_carotte"][data-q="10"]:not([disabled])',
  '[data-action="buy-item"][data-item="graine_carotte"][data-q="5"]:not([disabled])',
  '[data-action="buy-item"][data-item="graine_carotte"]:not([disabled])',
  '[data-action="shop-item"][data-item="graine_carotte"]', // la calèche en cases : d'abord la fiche
  '[data-action="comptoir-tab"][data-tab="acheter"]',
  '.nav-btn[data-tab="comptoir"]',
  '#stage-window-close',
];

function shown(el) {
  if (!el) return false;
  return typeof el.checkVisibility === 'function' ? el.checkVisibility() : el.offsetParent !== null;
}

// Un bouton du menu latéral fermé : c'est d'abord sa languette qu'il faut toucher.
function viaMenu(el) {
  if (!el || menuOpen || !el.closest('#bottom-nav')) return el;
  return document.getElementById('side-tab');
}

function guideElement() {
  const step = tutorialStep(state);
  if (step !== 'eau' && step !== 'potager') return null;
  if (!stageUsable() || setupPending(state) || storyOpen() || consentBannerShown() || consentBannerPending()) return null;
  const c = state.campagne;
  if (!c || c.fini || c.chapitre !== 1) return null;
  const o = chapterProgress(state).objectifs.find((x) => !x.ok);
  if (!o || !GUIDE_BOUTONS[o.type]) return null;
  // Planter sans aucune graine : d'abord la calèche, onglet Acheter
  const sansGraines = o.type === 'semis' && !plantableCropsFor(state, 'potager').some((c) => seedStock(state, c) > 0);
  const liste = sansGraines && !document.querySelector('#modal-root .modal:not(.shop-modal)') ? GUIDE_GRAINES : GUIDE_BOUTONS[o.type];
  for (const sel of liste) {
    const el = [...document.querySelectorAll(sel)].find(shown);
    if (el) return viaMenu(el);
  }
  // le bouton est là mais grisé (pas encore d'eau…) : on attend, sans tourner en rond
  if (liste.some((sel) => [...document.querySelectorAll(sel.replace(/:not\(\[disabled\]\)/g, ''))].some(shown))) return null;
  if (o.type === 'labours' && hoeMode) return null; // les cases vertes de la carte
  if (sansGraines) return null;
  const modal = document.getElementById('modal-root');
  if (modal && modal.childElementCount) return null;
  // (la puce d'objectif n'est plus sur la carte) une fenêtre de la carte ouverte : d'abord la fermer
  const close = document.getElementById('stage-window-close');
  if (shown(close)) return close;
  // ailleurs (la calèche, Inventaire…) : le retour à la Ferme
  const ferme = document.querySelector('.nav-btn[data-tab="ferme"]');
  return shown(ferme) ? viaMenu(ferme) : null;
}

// Un autre élément (une fenêtre de la carte) est par-dessus le centre de `el`.
function covered(el) {
  const r = el.getBoundingClientRect();
  const top = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
  return !!top && !el.contains(top);
}

let guided = null;
function renderGuide() {
  const el = guideElement();
  for (const old of document.querySelectorAll('.tuto-ring')) if (old !== el) old.classList.remove('tuto-ring');
  if (!el) {
    guided = null;
    return;
  }
  el.classList.add('tuto-ring');
  if (guided !== el) {
    guided = el;
    el.scrollIntoView({ block: 'nearest', behavior: REDUCED_MOTION && REDUCED_MOTION.matches ? 'auto' : 'smooth' });
  }
}

/* ---------- Lot 11 : À propos ---------- */

export function openAboutModal() {
  tel('modal', 'about');
  const F = DATA.FAMILLE;
  const M = DATA.MARCHE;
  const adultes = F.MEMBRES.filter((m) => !m.enfant).length;
  const enfants = F.MEMBRES.length - adultes;
  const durees = [...Object.values(DATA.CONSERVATION), ...Object.values(DATA.CONSERVATION_CATEGORIE)];
  const H = DATA.HORS_LIGNE;
  const rules = [
    `La famille (${adultes} adultes, ${enfants} enfants) mange quand elle a faim : chaque membre (sauf toi) a une jauge, qui baisse quand il marche ou qu'il aide ; à ${DATA.FAMILLE.FAIM.SEUIL}, il va manger dans la boîte à nourriture (fabriquée à l'Atelier, posée dans le foyer, remplie par toi : ${DATA.ATELIER.BOITE.PLATS} aliments différents, ${DATA.ATELIER.BOITE.QUANTITE} de chacun), ou au réfrigérateur une fois construit${penalite('PEREMPTION') ? ', d\'abord ce qui périme le plus tôt' : ''}.`,
    `La journée commence à ${DATA.TEMPS.HEURE_REVEIL} h ; une heure passe toutes les ${DATA.TEMPS.SECONDES_PAR_HEURE} s. À ${DATA.TEMPS.HEURE_NUIT} h, la famille va se coucher et reste à la maison ; la nuit défile à la même vitesse et ton personnage peut encore agir : seul son sommeil arrête les actions. À minuit, la nuit passe (ponte, lait…) et le jour change ; les plantes, elles, poussent ${DATA.TEMPS.POUSSE_HEURES} heures après leur arrosage, à toute heure ; à ${DATA.TEMPS.HEURE_REVEIL} h, c'est le réveil. Pendant la nuit, le bouton « Zzz » envoie ton personnage dans son lit (on ne dort que la nuit) : quand il dort, une heure passe toutes les ${DATA.TEMPS.SECONDES_PAR_HEURE_SOMMEIL} s et son énergie remonte peu à peu (${DATA.PERSONNAGE.SOMMEIL_HEURES} heures de sommeil pour celle du réveil${penalite('NUIT_SANS_DORMIR') ? ' ; éveillé, rien ne revient' : ' ; une nuit qui passe sans que tu l\'aies couché la rend aussi, s\'il a un lit'}). L'horloge s'arrête quand le jeu est fermé.`,
    penalite('PEREMPTION') ? `La nuit : repas, puis une poule nourrie pond, les moutons font leur laine, les vaches donnent leur lait, et les aliments hors frigo vieillissent (ils périment en ${Math.min(...durees)} à ${Math.max(...durees)} nuits).`
      : 'La nuit : repas, puis une poule nourrie pond, les moutons font leur laine, les vaches donnent leur lait. Rien ne se perd pendant ton absence : les aliments ne se gâtent pas, les plantes attendent, les bêtes pas nourries ne produisent rien mais ne s\'en vont pas, et le bonheur de la famille ne baisse pas.',
    `Ton énergie (⚡, 0 à ${DATA.PERSONNAGE.MAX}, + ${DATA.PERSONNAGE.ENDURANCE} par niveau : l'endurance) : chaque action au clic en coûte (${Object.entries(DATA.PERSONNAGE.COUTS).map(([a, n]) => `${ACTIONS_NOMS[a] || a} ${formatNumber(n)}`).join(', ')}), un peu moins quand la famille est heureuse (jusqu'à −${DATA.PERSONNAGE.BONHEUR_REDUCTION} %), avec les technologies et l'équipement, mais jamais moins de ${DATA.PERSONNAGE.PLANCHER} % de ce coût. Au réveil, ${DATA.PERSONNAGE.REVEIL_REPAS > 0 ? `elle remonte à ${DATA.PERSONNAGE.REVEIL_BASE} % de la jauge, et jusqu'à la jauge pleine si le reste de la famille se couche rassasié` : `elle remonte à ${DATA.PERSONNAGE.REVEIL_BASE} % de la jauge`} ; un aliment mangé dans la journée rend sa valeur (son énergie ÷ ${DATA.PERSONNAGE.MANGER_DIVISEUR}, + ${DATA.PERSONNAGE.MANGER_BONUS} %, arrondie au-dessus). Les automatisations ne coûtent rien.`,
    `Électricité : panneau (de ${DATA.SOLEIL.DEBUT} h à ${DATA.SOLEIL.FIN} h) → batterie → pompe (son eau sert aussi aux asperseurs de l'arrosage automatique), moulin, chaînes de production, réfrigérateur, station de charge du robot. ${penalite('USURE') ? `Un appareil en marche s'use d'un point toutes les ${formatNumber(DATA.USURE.HEURES_PAR_POINT)} heures de jeu ; l'entretenir coûte ${formatNumber(DATA.USURE.TAUX_ENTRETIEN)} % de son prix, le réparer après une panne ${formatNumber(DATA.USURE.TAUX_REPARATION)} % (arrondis à l'entier supérieur).` : 'Les appareils ne s\'usent pas et ne tombent pas en panne.'}`,
    `La calèche : elle fait chaque jour le tour du monde par les chemins et passe à la ferme vers ${DATA.CALECHE.FERME} h ; on commerce avec elle quand elle est arrêtée à côté de soi (ou hélée sur un chemin). Prix de vente fixes. Elle vend les semences (prix d'achat = prix de vente × coefficient, arrondi à l'entier supérieur ; chaque unité achetée ajoute ${formatNumber(M.PAS)} points au coefficient, chaque unité vendue en retire ${formatNumber(M.PAS)}, plancher ${formatNumber(M.PLANCHER.defaut)} %, graines ${formatNumber(M.PLANCHER.graine)} %) et ce qu'elle achète aux hameaux (à ${DATA.CALECHE.VENTE} % du prix de vente). Les outils, les animaux et les meubles se fabriquent à l'Atelier.`,
    `${chapterCount()} chapitres racontent un foyer qui prend vie : des amis, des repas partagés, les projets des hameaux, une ferme à votre image ; le dernier ouvre le jeu libre.`,
    `Arbre des technologies : ${Object.keys(DATA.ARBRE.noeuds).length} technologies en ${DATA.ARBRE.branches.length} branches, payées en points de technologie (PT : chapitres terminés, jalons de maîtrise, mode libre), en pièces et en ressources (bois, pierre, puis lingots fondus au Four avec le minerai des gisements). Les automatisations (arrosage, récolte, semis, nourrissage, tonte) et certaines recettes s'y débloquent.`,
    `Absence : jusqu'à ${formatDuration(H.MAX_S)} sont rattrapées au retour (énergie, eau, préparations, réfrigérateur), sans nuit${H.USURE ? '' : ' et sans usure'}. Ce temps compte comme temps d'éveil.`,
  ];
  openModal(`
    <h2 id="about-title">ℹ️ À propos</h2>
    <p class="about-version"><strong>Moon Bloom Village</strong> · version ${GAME_VERSION} <span class="muted">(format de sauvegarde ${STATE_VERSION})</span></p>
    <h3>Règles principales</h3>
    <ol class="about-rules">${rules.map((r) => `<li>${r}</li>`).join('')}</ol>
    <h3>Fiches d'aide</h3>
    <div class="row">${fiches().map((id) => `<button type="button" class="btn" data-action="help" data-id="${id}">${valeur(ICONES_FICHES[id])} ${nomFiche(id)}</button>`).join('')}</div>
    <h3>Crédits</h3>
    <p class="muted">Graphismes, icônes et illustrations : originaux.</p>
    <p class="muted">Moteur d'affichage : Phaser 4 (licence MIT).</p>
    <div class="row">
      <button type="button" class="btn" data-action="open-options">← Options</button>
      <button type="button" class="btn primary" data-action="close-modal" id="about-close">Fermer</button>
    </div>`, { labelledBy: 'about-title', focus: '#about-close' });
}

/* ---------- actions de cet écran (voir ui/actions.js) ---------- */

registerActions({
  'open-options': () => {
    openOptionsModal();
  },
  'help': (target) => {
    openHelpModal(target.dataset.id);
  },
  'tuto-next': () => {
    applyResult(advanceTutorial(state));
  },
  'tuto-skip': () => {
    applyResult(skipTutorial(state));
  },
});
