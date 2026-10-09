import { DATA, ingredientOptions } from '../engine/catalog.js';
import { GAME_VERSION, STATE_VERSION } from '../engine/base.js';
import { pumpFlow } from '../engine/devices.js';
import { awakeRequired } from '../engine/clock.js';
import { energyStats } from '../engine/energy.js';
import { familyNeed } from '../engine/family.js';
import { cropProduct } from '../engine/crops.js';
import { chapterCount, isUnlocked, plantableCropsFor, unlockChapter } from '../engine/campaign.js';
import { advanceTutorial, skipTutorial, tutorialStep } from '../engine/alerts.js';
import {
  formatDuration, formatNumber, formatQty, formatSigned, formatWh, formatWhRate,
} from '../engine/format.js';
import { activeTab, ecranFerme, state } from './store.js';
import { tel } from './consent.js';
import { applyResult } from './game-actions.js';
import { morph } from './render.js';
import { stageUsable } from './stage.js';
import { formatPlaces, formatStraw } from './elevage.js';
import { millOutputText, stationRecipes } from './cuisine.js';
import { nightsLabel } from './inventaire.js';
import { artPx, REDUCED_MOTION } from './animations.js';
import { openOptionsModal } from './options.js';
import { registerActions } from './actions.js';
import { costLabel } from './common.js';

/* ---------- Lot 11 : aide sur chaque bâtiment ---------- */

const listNum = (values, unit) => `${values.map((v) => formatNumber(v)).join(' · ')} ${unit}`;

function cropsLine(lieu, what) {
  return plantableCropsFor(state, lieu)
    .map((c) => {
      const d = DATA.crops[c];
      const out = DATA.items[cropProduct(c)];
      return what === 'eau'
        ? `${d.icone} ${d.nom.toLowerCase()} ${formatQty(d.litres)} L`
        : `${d.icone} ${d.nom.toLowerCase()} : ${d.rendement} ${out.nom.toLowerCase()} en ${nightsLabel(d.stades)}`;
    })
    .join(' · ');
}

function stationRecipesLine(id) {
  return stationRecipes(id)
    .map((r) => {
      const def = DATA.recipes[r];
      const ing = def.ingredients.map((i) => `${formatQty(i.qte)} ${ingredientOptions(i).map((it) => DATA.items[it].nom.toLowerCase()).join(' ou ')}`).join(' + ');
      const eau = def.eau ? ` + ${formatQty(def.eau)} L d'eau` : '';
      return `${def.icone} ${def.nom} : ${ing}${eau} (${formatQty(def.temps)} s)`;
    })
    .join(' ; ');
}

function levelsNote(parcelles, nom) {
  return `Parcelles par niveau : ${listNum(parcelles, '')}. L'arrosage, la récolte et le semis automatiques s'acquièrent dans l'Arbre des technologies (branches Eau et Culture) ; ils travaillent la nuit, à 100 %.`;
}

// Rôle, consommation et production de chaque bâtiment, calculés depuis DATA.
const HELP = {
  panneau: () => ({
    nom: 'Panneaux solaires',
    role: 'Transforment le soleil en électricité, rangée dans les batteries. Chaque panneau a son niveau, son usure et son interrupteur.',
    conso: 'Aucune.',
    prod: `${listNum(DATA.GRID.panneau.whParS, 'Wh/s')} selon le niveau. L'usure en retire jusqu'à ${formatNumber((DATA.WEAR.BREAKDOWN * 100) / DATA.WEAR.EFFICIENCY_DIVISOR)} %. En ce moment : ${formatWhRate(energyStats(state).production)}.`,
    note: `Un panneau de plus coûte ${formatNumber(DATA.PURCHASE.panneau.base)} 💰, +${formatNumber(DATA.PURCHASE.panneau.growth - 100)} % par panneau déjà possédé (arrondi à l'entier supérieur).`,
  }),
  batterie: () => ({
    nom: 'Batteries',
    role: 'Stockent l\'électricité des panneaux. La première batterie disponible se remplit d\'abord ; la dernière remplie se vide d\'abord. Elles ne se déchargent jamais d\'elles-mêmes.',
    conso: 'Aucune : elles alimentent la pompe, le moulin, la presse et le réfrigérateur.',
    prod: `Capacité : ${listNum(DATA.GRID.batterie.wh, 'Wh')} selon le niveau (l'usure réduit la capacité utile). En ce moment : ${formatNumber(Math.floor(energyStats(state).charge / 1000))} / ${formatWh(energyStats(state).capacite)}.`,
    note: `Une batterie de plus coûte ${formatNumber(DATA.PURCHASE.batterie.base)} 💰, +${formatNumber(DATA.PURCHASE.batterie.growth - 100)} % par batterie déjà possédée (arrondi à l'entier supérieur).`,
  }),
  pompe: () => ({
    nom: 'Pompe',
    role: 'Tire l\'eau du puits vers le réservoir, tant qu\'il reste de la place.',
    conso: `${formatNumber(DATA.PUMP.WH_PAR_L)} Wh par litre pompé, soit ${formatWhRate(pumpFlow(state.pompe) * DATA.PUMP.WH_PAR_L)} à plein débit au niveau ${state.pompe.niveau}.`,
    prod: `Débit : ${listNum(DATA.GRID.pompe.litresPerS, 'L/s')} selon le niveau.`,
    note: 'Sans énergie, elle attend ; avec peu d\'énergie, elle pompe au prorata.',
  }),
  reservoir: () => ({
    nom: 'Réservoir',
    role: 'Garde l\'eau pompée pour les arrosages et le pain.',
    conso: 'Aucune.',
    prod: `Capacité : ${listNum(DATA.GRID.pompe.reservoirL, 'L')}, selon le niveau de la pompe.`,
  }),
  potager: () => ({
    nom: DATA.POTAGER.NOM,
    role: `Planter, arroser, récolter : toutes les cultures poussent ici, sur n'importe quelle parcelle. Une plante arrosée gagne un stade chaque nuit ; sans eau, elle attend. La parcelle se libère après la récolte. ${isUnlocked(state, 'champ')
      ? 'Cultures de plein champ : le blé nourrit les poules et donne la farine, le tournesol donne l\'huile, le riz et le houblon servent en cuisine ; un blé sert aussi de graine (comme le riz et le houblon).'
      : `Les cultures de plein champ (blé, riz, houblon) arrivent au chapitre ${unlockChapter('champ')}.`}`,
    conso: `Eau par arrosage : ${cropsLine('potager', 'eau')}.`,
    prod: `${cropsLine('potager', 'recolte')}.`,
    note: `${levelsNote(DATA.POTAGER.PARCELLES, 'la Zone de culture')} Le ${DATA.POTAGER.ZONE2.NOM}, une deuxième zone de ${DATA.POTAGER.ZONE2.PARCELLES} parcelles aux mêmes règles, s'ouvre avec le Moulin (chapitre ${unlockChapter(DATA.POTAGER.ZONE2.DEBLOCAGE)}) : de quoi cultiver beaucoup de blé.`,
  }),
  serre: () => ({
    nom: 'Serre',
    role: 'Des légumes à l\'abri, et trois cultures de rente (cacao, vanille, café) qu\'on ne trouve qu\'ici.',
    conso: `Eau par arrosage : ${cropsLine('serre', 'eau')}.`,
    prod: `${cropsLine('serre', 'recolte')}. Cacao, vanille et café ne se mangent pas : ils servent à la vente et aux recettes de luxe.`,
    note: `Construction : ${costLabel(DATA.SERRE.CONSTRUCTION)}. Parcelles par niveau : ${listNum(DATA.SERRE.PARCELLES, '')}.`,
  }),
  silo: () => ({
    nom: 'Silo',
    role: 'Stocke le blé récolté ; les poules y mangent d\'abord. Le surplus va dans l\'inventaire.',
    conso: 'Aucune.',
    prod: `Capacité : ${listNum(DATA.SILO.CAPACITE, 'blés')} selon le niveau.`,
    note: '',
  }),
  poulailler: () => ({
    nom: 'Poulailler',
    role: 'Loge les poules, achetées au Marché. Une poule pond toute sa vie, tant qu\'elle est nourrie.',
    conso: `1 blé pour ${DATA.ANIMAUX.poule.poulesParBle} poules nourries (une ration entamée se perd à la fin de la nuit).`,
    prod: `${DATA.ANIMAUX.poule.oeufsParNuit} œuf par nuit et par poule nourrie (${DATA.items.oeuf.energie} énergie).`,
    note: `Poules par niveau : ${listNum(DATA.POULAILLER.CAPACITE, '')}. Avec la Mangeoire à trémie (Arbre des technologies, branche Élevage), les poules sont nourries toutes seules pendant la nuit.`,
  }),
  // 'paturage' : identifiant historique. Le joueur lit « Moutons et vaches » (Étable).
  paturage: () => {
    const M = DATA.ANIMAUX.mouton;
    const V = DATA.ANIMAUX.vache;
    const P = DATA.PATURAGE;
    return {
      nom: 'Moutons et vaches',
      role: `Les moutons et les vaches vivent à l'Étable et s'achètent au Marché. Un mouton prend ${formatPlaces(P.placesParMouton)}, une vache ${formatPlaces(P.placesParVache)}. Une place achetée reste acquise.`,
      conso: `Chaque nuit, ${formatStraw(M.pailleParNuit)} par mouton et ${formatStraw(V.pailleParNuit)} par vache. La paille vient du Moulin : 1 blé moulu donne ${millOutputText()}. Elle ne s'achète pas au Marché.`,
      prod: `Un mouton nourri ${M.joursLaine} nuits donne ${M.laineParTonte} laine (à tondre). Une vache nourrie donne ${V.laitParNuit} lait la nuit même.`,
      note: `Préparer l'Étable pour eux : ${costLabel(P.deblocage)} pour ${formatPlaces(P.placesDepart)} ; ensuite ${formatNumber(P.prixPlace)} 💰 la place, +${formatNumber(P.croissance - 100)} % à chaque achat. S'il n'y a pas assez de paille, les animaux mangent dans l'ordre de la liste (les moutons, puis les vaches). Un animal qui n'a pas mangé ne donne rien cette nuit-là ; il ne lui arrive rien d'autre.`,
    };
  },
  verger: () => {
    const V = DATA.VERGER;
    return {
      nom: 'Verger',
      role: 'Pommiers et poiriers, achetés au Marché et plantés sur un emplacement libre. Ils restent en place.',
      conso: 'Aucune : pas d\'arrosage.',
      prod: `${V.FRUITS} fruits toutes les ${V.PERIODE} nuits, toute l'année, à partir de ${nightsLabel(V.MATURITE)} après la plantation.`,
      note: `Emplacement supplémentaire : ${formatNumber(V.EMPLACEMENT.base)} 💰, +${formatNumber(V.EMPLACEMENT.croissance - 100)} % par emplacement déjà acheté (arrondi à l'entier supérieur).`,
    };
  },
  four: () => ({
    nom: 'Four',
    role: 'Cuit le pain et les plats au four. Une préparation à la fois ; le construire ouvre le Livre de recette.',
    conso: 'Pas d\'électricité.',
    prod: `${stationRecipesLine('four')}.`,
    note: 'Les temps de préparation suivent la productivité de la famille.',
  }),
  cuisine: () => ({
    nom: 'Cuisine',
    role: 'Prépare les plats mijotés. Une préparation à la fois.',
    conso: 'Pas d\'électricité.',
    prod: `${stationRecipesLine('cuisine')}.`,
    note: `Un plat vaut ${formatNumber(DATA.RECETTES.COEF_PLAT)} % de l'énergie de ses ingrédients (arrondi), et chaque plat différent mangé dans la journée donne +${DATA.FAMILY.BONUS_PLATS.PAR_PLAT} de santé (jusqu'à +${DATA.FAMILY.BONUS_PLATS.MAX}). Quatre recettes de luxe (chocolat chaud, café, crème à la vanille, bière artisanale) se vendent 300 % du prix de leurs ingrédients au lieu de ${formatNumber(DATA.RECETTES.COEF_PLAT)} %.`,
  }),
  moulin: () => ({
    nom: 'Moulin',
    role: 'Moud le blé en farine et en paille. Tout se fait dans le Moulin lui-même : tu choisis combien de blés moudre, puis « Moudre ». Appareil électrique : interrupteur, usure, pannes.',
    conso: `${formatNumber(DATA.STATIONS.moulin.whParS)} Wh/s pendant qu'il tourne, et ${formatQty(DATA.recipes.farine.ingredients[0].qte)} blé par mouture (celui de l'inventaire d'abord, puis celui du Silo).`,
    prod: `1 blé donne ${millOutputText()}, en ${formatQty(DATA.recipes.farine.temps)} s. La farine sert au pain et aux tartes ; la paille nourrit les moutons et les vaches.`,
    note: 'Les blés sont moulus un par un. Sans énergie, le Moulin attend. La nuit, le blé en train d\'être moulu se termine ; ceux qui attendent reprennent au réveil. Tu peux reprendre le blé en attente.',
  }),
  presse: () => ({
    nom: 'Presse',
    role: 'Presse les graines de tournesol en huile. Appareil électrique : interrupteur, usure, pannes.',
    conso: `${formatNumber(DATA.STATIONS.presse.whParS)} Wh/s pendant qu'elle tourne.`,
    prod: `${stationRecipesLine('presse')}.`,
    note: 'Sans énergie, la préparation se met en pause.',
  }),
  frigo: () => ({
    nom: 'Réfrigérateur',
    role: 'Les aliments rangés au frais ne vieillissent plus, tant qu\'il est alimenté. Capacité illimitée.',
    conso: `${formatNumber(DATA.FRIGO.BASE_WH_S)} Wh/s + ${formatNumber(DATA.FRIGO.PAR_UNITE_MWH_S)} mWh/s par unité stockée, jour et nuit. Au Dormir, ${DATA.FRIGO.BLOC_NUIT_S} s de consommation sont prélevées d'un coup pour la nuit.`,
    prod: 'Du froid : aucune péremption au frigo.',
    note: `S'il manque de courant plus de ${formatNumber(DATA.FRIGO.SEUIL_ALIMENTE * 100)} % de la journée, ou pendant la nuit, chaque lot perd ${nightsLabel(DATA.FRIGO.PERTE_NUITS)} de conservation.`,
  }),
};

export function helpBtn(id) {
  const h = HELP[id]();
  return `<button type="button" class="btn help-btn" data-action="help" data-id="${id}" aria-label="Aide : ${h.nom}">?</button>`;
}

function openHelpModal(id) {
  tel('modal', 'help:' + id);
  if (!HELP[id]) return;
  const h = HELP[id]();
  const sym = id === 'reservoir' ? 'b-reservoir' : `b-${id}`;
  document.getElementById('modal-root').innerHTML = `
    <div class="modal-backdrop" data-action="close-modal">
      <div class="modal" role="dialog" aria-modal="true" aria-labelledby="help-title" data-stop-propagation>
        <div class="help-head">${artPx([sym])}<h2 id="help-title">${h.nom}</h2></div>
        <ul class="help-list">
          <li><strong>Rôle</strong>${h.role}</li>
          <li><strong>Consommation</strong>${h.conso}</li>
          <li><strong>Production</strong>${h.prod}</li>
          ${h.note ? `<li><strong>Bon à savoir</strong>${h.note}</li>` : ''}
        </ul>
        <button type="button" class="btn primary" data-action="close-modal" id="help-close">Compris</button>
      </div>
    </div>`;
  document.getElementById('help-close').focus();
}

/* ---------- Lot 11 : bulles d'aide de la première partie ---------- */

const TUTO = {
  eau: {
    titre: '💧 L\'eau et le soleil',
    texte: () => `Les panneaux solaires chargent la batterie ; la pompe s'en sert pour remplir le réservoir (${formatNumber(DATA.PUMP.WH_PAR_L)} Wh par litre). Chaque arrosage puise dans le réservoir : son niveau est aussi en haut de l'écran (💧).${stageUsable() ? ' Panneaux, batterie et pompe se trouvent dans la maison : touche-la, puis ouvre « Bâtiments ».' : ''}`,
  },
  potager: {
    titre: '🌱 La zone de culture',
    texte: () => `${stageUsable() ? 'Touche une parcelle vide (le carré de terre sous la barrière) pour planter, puis touche-la encore pour l\'arroser' : 'Touche « Planter » sur une parcelle vide, puis « Arroser »'}. Une plante arrosée gagne un stade chaque nuit : les carottes sont mûres en ${nightsLabel(DATA.crops.carotte.stades)}. ${stageUsable() ? 'Mûre, elle se balance : touche-la pour récolter, puis replante.' : 'Après la récolte, replante.'}`,
  },
  dormir: {
    titre: '😴 Dormir',
    texte: () => `Le bouton « Zzz », en bas à droite, s'active après ${formatNumber(awakeRequired(state))} s d'éveil. À ${DATA.TIME.MEAL_HOUR} h la famille mange ; à ${DATA.TIME.NIGHT_HOUR} h, tout le monde va se coucher. La nuit, les plantes arrosées poussent.`,
  },
};

let tutoShown = null; // bulle affichée au dernier rendu (pour faire défiler vers sa cible)

// Bulle visible maintenant : « dormir » partout, les autres sur la Ferme.
function visibleTutorial() {
  const step = tutorialStep(state);
  if (!step) return null;
  if (step === 'dormir') return step;
  return activeTab === 'ferme' && !ecranFerme ? step : null;
}

// Classe à ajouter à l'élément que la bulle montre.
export function tutoTarget(step) {
  return visibleTutorial() === step ? ' tuto-target' : '';
}

export function renderTutorial() {
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
    <section class="tuto${step === 'dormir' ? '' : ' up'}" aria-labelledby="tuto-title">
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

/* ---------- Lot 11 : À propos ---------- */

export function openAboutModal() {
  tel('modal', 'about');
  const F = DATA.FAMILY;
  const V = F.VARIATION;
  const M = DATA.MARCHE;
  const adultes = F.MEMBRES.filter((m) => !m.enfant).length;
  const enfants = F.MEMBRES.length - adultes;
  const durees = [...Object.values(DATA.CONSERVATION), ...Object.values(DATA.CONSERVATION_CATEGORIE)];
  const H = DATA.HORS_LIGNE;
  const rules = [
    `La famille (${adultes} adultes, ${enfants} enfants) a besoin de ${formatNumber(familyNeed(state))} énergie par jour. Elle mange à chaque nuit, d'abord ce qui périme le plus tôt.`,
    `La journée commence à ${DATA.TIME.DAY_START_HOUR} h ; une heure passe toutes les ${DATA.TIME.CLOCK_SECONDS_PER_HOUR} s. À ${DATA.TIME.MEAL_HOUR} h, la famille prend son repas. Tu peux dormir (bouton « Zzz ») après ${DATA.TIME.MIN_AWAKE_S} s d'éveil au moins ; à ${DATA.TIME.NIGHT_HOUR} h, la journée est finie et la nuit se déroule d'elle-même. L'horloge s'arrête pendant que tu lis le résumé du réveil et quand le jeu est fermé.`,
    `La nuit : repas, puis une plante arrosée gagne un stade, une poule nourrie pond, les moutons et les vaches grossissent et le lait est produit, et les aliments hors frigo vieillissent (ils périment en ${Math.min(...durees)} à ${Math.max(...durees)} nuits).`,
    `Santé : un besoin couvert à 100 % la remonte (${formatSigned(V[0].delta)}), sinon elle baisse (${V.slice(1).map((x) => formatSigned(x.delta)).join(', ')}). Une santé faible ralentit les actions au clic ; les automatisations restent à 100 %. À 0, un soin coûte ${formatNumber(F.SOIN.base)} 💰, +${formatNumber(F.SOIN.croissance - 100)} % par soin déjà payé (arrondi à l'entier supérieur).`,
    `Énergie : panneaux → batteries → pompe, moulin, presse, réfrigérateur. Un appareil en marche s'use d'un point toutes les ${formatNumber(DATA.WEAR.HEURES_PAR_POINT)} heures de jeu ; l'entretenir coûte ${formatNumber(DATA.WEAR.MAINTAIN_RATE)} % de son prix, le réparer après une panne ${formatNumber(DATA.WEAR.REPAIR_RATE)} % (arrondis à l'entier supérieur).`,
    `Marché : prix de vente fixes. Prix d'achat = prix de vente × coefficient, arrondi à l'entier supérieur. Chaque unité achetée ajoute ${formatNumber(M.PAS)} points au coefficient d'achat, chaque unité vendue en retire ${formatNumber(M.PAS)} (plancher ${formatNumber(M.PLANCHER.defaut)} %, graines ${formatNumber(M.PLANCHER.graine)} %).`,
    `Autonomie = énergie mangée produite par la ferme ÷ ${formatNumber(familyNeed(state))}. ${chapterCount()} chapitres mènent à une famille autonome.`,
    `Arbre des technologies : ${Object.keys(DATA.techtree.noeuds).length} technologies en ${DATA.techtree.branches.length} branches, payées en points de technologie (chapitres terminés, jalons de maîtrise, mode libre) et en pièces. Les automatisations (arrosage, récolte, semis, nourrissage, tonte) et certaines recettes s'y débloquent.`,
    `Absence : jusqu'à ${formatDuration(H.MAX_S)} sont rattrapées au retour (énergie, eau, préparations, réfrigérateur), sans nuit${H.USURE ? '' : ' et sans usure'}. Ce temps compte comme temps d'éveil.`,
  ];
  document.getElementById('modal-root').innerHTML = `
    <div class="modal-backdrop" data-action="close-modal">
      <div class="modal" role="dialog" aria-modal="true" aria-labelledby="about-title" data-stop-propagation>
        <h2 id="about-title">ℹ️ À propos</h2>
        <p class="about-version"><strong>Ferme Familiale</strong> · version ${GAME_VERSION} <span class="muted">(format de sauvegarde ${STATE_VERSION})</span></p>
        <h3>Règles principales</h3>
        <ol class="about-rules">${rules.map((r) => `<li>${r}</li>`).join('')}</ol>
        <h3>Crédits</h3>
        <p class="muted">Graphismes : pack "Farm – 4 Seasons 16x16 Tileset" par antarcticbees — <a href="https://antarcticbees.itch.io/" target="_blank" rel="noopener noreferrer">https://antarcticbees.itch.io/</a></p>
        <p class="muted">Moteur d'affichage : Phaser 3 (licence MIT).</p>
        <p class="muted">Icônes et illustrations des fiches : originales.</p>
        <div class="row">
          <button type="button" class="btn" data-action="open-options">← Options</button>
          <button type="button" class="btn primary" data-action="close-modal" id="about-close">Fermer</button>
        </div>
      </div>
    </div>`;
  document.getElementById('about-close').focus();
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
