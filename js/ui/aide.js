import { DATA, ingredientOptions } from '../engine/catalog.js';
import { houseRepaired } from '../engine/depart.js';
import { GAME_VERSION, STATE_VERSION } from '../engine/base.js';
import { farmOpen, pumpFlow } from '../engine/devices.js';
import { energyStats } from '../engine/energy.js';
import { cropProduct, hasHoe, seedStock } from '../engine/crops.js';
import { chapterCount, chapterProgress, isUnlocked, plantableCropsFor } from '../engine/campaign.js';
import { setupPending } from '../engine/depart.js';
import { unlockLevel } from '../engine/levels.js';
import { farmTerrain } from '../engine/terrain.js';
import { advanceTutorial, skipTutorial, tutorialStep } from '../engine/alerts.js';
import {
  formatDuration, formatNumber, formatQty, formatWh, formatWhRate,
} from '../engine/format.js';
import { activeTab, ecranFerme, hoeMode, state } from './store.js';
import { tel } from './consent.js';
import { consentBannerPending, consentBannerShown, letterToastShown, storyOpen, uiCalm } from './calme.js';
import { applyResult } from './game-actions.js';
import { morph } from './render.js';
import { stageUsable } from './stage.js';
import { menuOpen } from './stage-windows.js';
import { formatPlaces, formatStraw } from './elevage.js';
import { millOutputText, stationRecipes } from './cuisine.js';
import { daysLabel, nightsLabel } from './inventaire.js';
import { artPx, REDUCED_MOTION } from './animations.js';
import { openOptionsModal } from './options.js';
import { registerActions } from './actions.js';
import { openModal } from './modal.js';
import { effetTexte } from './fiche-membre.js';

/* ---------- Lot 11 : aide sur chaque bâtiment ---------- */

const listNum = (values, unit) => `${values.map((v) => formatNumber(v)).join(' · ')} ${unit}`;

function cropsLine(lieu, what) {
  return plantableCropsFor(state, lieu)
    .map((c) => {
      const d = DATA.CULTURES[c];
      const out = DATA.OBJETS[cropProduct(c)];
      return what === 'eau'
        ? `${d.icone} ${d.nom.toLowerCase()} ${formatQty(d.litres)} L`
        : `${d.icone} ${d.nom.toLowerCase()} : ${d.rendement} ${out.nom.toLowerCase()} en ${daysLabel(d.stades)}`;
    })
    .join(' · ');
}

function stationRecipesLine(id) {
  return stationRecipes(id)
    .map((r) => {
      const def = DATA.RECETTES[r];
      const ing = def.ingredients.map((i) => `${formatQty(i.qte)} ${ingredientOptions(i).map((it) => DATA.OBJETS[it].nom.toLowerCase()).join(' ou ')}`).join(' + ');
      const eau = def.eau ? ` + ${formatQty(def.eau)} L d'eau` : '';
      return `${def.icone} ${def.nom} : ${ing}${eau} (${formatQty(def.temps)} s)`;
    })
    .join(' ; ');
}

// Noms d'objets en minuscules, séparés par des virgules : « miel, sucre, épices ».
const itemNames = (ids) => ids.map((id) => DATA.OBJETS[id].nom.charAt(0).toLowerCase() + DATA.OBJETS[id].nom.slice(1)).join(', ');

const capitalize = (t) => t.charAt(0).toUpperCase() + t.slice(1);

// Les recettes qui demandent l'un de ces objets (« pain, tarte aux pommes… »).
function recipesUsing(items) {
  return Object.values(DATA.RECETTES)
    .filter((r) => !r.transformation && r.ingredients.some((i) => ingredientOptions(i).some((it) => items.includes(it))))
    .map((r) => r.nom.toLowerCase());
}

// Ce que demande une recette : « 4 minerai de fer + 3 bois ».
const ingredientsText = (r) => r.ingredients.map((i) => `${formatQty(i.qte)} ${ingredientOptions(i).map((it) => DATA.OBJETS[it].nom.toLowerCase()).join(' ou ')}`).join(' + ');

// Ce que prend une recette de l'Atelier : « 2 lingot de fer, 2 miel, 1 fibre ».
const recetteAtelier = (id) => Object.entries(DATA.ATELIER.RECETTES[id].entrees).map(([o, n]) => `${n} ${DATA.OBJETS[o].nom.toLowerCase()}`).join(', ');

// Les lingots fondus au Four (recettes lingot_*).
const ingotRecipes = () => Object.values(DATA.RECETTES).filter((r) => r.sortie && /^lingot_/.test(r.sortie));

// Les cultures de rente : celles qui ne poussent qu'à la Serre.
const cashCrops = () => Object.keys(DATA.CULTURES).filter((c) => DATA.CULTURES[c].lieux.length === 1 && DATA.CULTURES[c].lieux[0] === 'serre');

// Les recettes de luxe (l'Épicerie fine de l'Arbre des technologies), vendues
// `coefPrix` % du prix de leurs ingrédients.
const luxuryRecipes = () => DATA.ARBRE.noeuds.cui_epicerie.effet.recettes.map((id) => DATA.RECETTES[id]).filter((r) => r && r.coefPrix);

// Les eaux de la canne à pêche et ce qu'on y prend (la ferme ; le grand monde, fiche 6b).
const EAUX = { etang: 'Étang de la ferme', mare: 'Mare de la ferme', lac: 'Lacs du monde', riviere: 'Rivières du monde', mer: 'Mer' };

// Coûts des niveaux 2 à 5 d'un appareil : « 150 · 400 · 900 · 2 000 💰 ».
function levelCosts(type) {
  return listNum(DATA.RESEAU[type].prixNiveaux.slice(1), '💰');
}

// Rôle, consommation et production de chaque bâtiment, calculés depuis DATA.
const HELP = {
  panneau: () => ({
    nom: 'Panneau solaire',
    role: `Transforme le soleil en électricité, rangée dans la batterie, de ${DATA.SOLEIL.DEBUT} h à ${DATA.SOLEIL.FIN} h seulement. Il a son niveau, son usure et son interrupteur.`,
    conso: 'Aucune.',
    prod: `${listNum(DATA.RESEAU.panneau.whParS, 'Wh/s')} selon le niveau. L'usure en retire jusqu'à ${formatNumber((DATA.USURE.PANNE * 100) / DATA.USURE.DIVISEUR_RENDEMENT)} %. En ce moment : ${formatWhRate(energyStats(state).production)}.`,
    note: `Le soir et la nuit, la pompe et le réfrigérateur vivent sur la batterie. Améliorer : ${levelCosts('panneau')}.`,
  }),
  batterie: () => ({
    nom: 'Batterie',
    role: 'Stocke l\'électricité du panneau, pour le soir et la nuit. Elle ne se décharge jamais d\'elle-même.',
    conso: 'Aucune : elle alimente la pompe (dont l\'eau sert aussi aux asperseurs), le moulin, la presse, le réfrigérateur et la station de charge du robot.',
    prod: `Capacité : ${listNum(DATA.RESEAU.batterie.wh, 'Wh')} selon le niveau (l'usure réduit la capacité utile). En ce moment : ${formatNumber(Math.floor(energyStats(state).charge / 1000))} / ${formatWh(energyStats(state).capacite)}.`,
    note: `Améliorer : ${levelCosts('batterie')}.`,
  }),
  pompe: () => ({
    nom: 'Pompe',
    role: 'Tire l\'eau du puits vers le réservoir, tant qu\'il reste de la place.',
    conso: `${formatNumber(DATA.POMPE.WH_PAR_L)} Wh par litre pompé, soit ${formatWhRate(pumpFlow(state.pompe) * DATA.POMPE.WH_PAR_L)} à plein débit au niveau ${state.pompe.niveau}.`,
    prod: `Débit : ${listNum(DATA.RESEAU.pompe.litresParS, 'L/s')} selon le niveau.`,
    note: `Sans énergie, elle attend ; avec peu d'énergie, elle pompe au prorata. Améliorer : ${levelCosts('pompe')}.`,
  }),
  reservoir: () => ({
    nom: 'Réservoir',
    role: 'Garde l\'eau pompée pour les arrosages et le pain.',
    conso: 'Aucune.',
    prod: `Capacité : ${listNum(DATA.RESEAU.reservoir.litres, 'L')} selon son niveau.`,
    note: `Agrandir : ${levelCosts('reservoir')}.`,
  }),
  potager: () => ({
    nom: DATA.POTAGER.NOM,
    role: `Planter, arroser, récolter : toutes les cultures poussent ici, sur n'importe quelle parcelle. Une plante arrosée gagne un stade ${DATA.TEMPS.POUSSE_HEURES} heures plus tard (de jour comme de nuit), puis redemande de l'eau ; sans eau, elle attend. La parcelle se libère après la récolte ; sur la carte, ta récolte entre dans l'inventaire quand ton personnage la ramasse (une bulle « +x » au-dessus de lui). Chaque culture arrive à son niveau (⭐ dans le bandeau). Le blé nourrit les poules et donne la farine ; il ne se plante qu'une fois le Silo construit. Le tournesol donne l'huile, le riz et le houblon servent en cuisine.`,
    conso: `Eau par arrosage : ${cropsLine('potager', 'eau')}.`,
    prod: `${cropsLine('potager', 'recolte')}.`,
    note: `Version 1.15 : toute l'herbe de la carte se cultive. La houe (fabriquée à l'Atelier) change une tuile d'herbe en terre, ${DATA.PERSONNAGE.COUTS.labourer} d'énergie la tuile ; une terre vide se rebouche gratuitement. Pas sur les chemins, l'eau, les pierres, les arbres et les arbustes, ni aux abords des bâtiments (Poulailler, Étable, Moulin, Serre, Verger). Le nombre de tuiles de terre est plafonné par le niveau (${DATA.NIVEAUX.TUILES.filter((x, i, a) => a.indexOf(x) === i).join(' / ')}). L'arrosage, la récolte et le semis automatiques s'acquièrent dans l'Arbre des technologies (branches Eau et Culture)  : la récolte et le semis, par un robot qui, chaque matin à ${DATA.ROBOT.HEURE} h, dresse sa liste de tâches et les fait une à une (il roule jusqu'à la parcelle puis travaille ${DATA.ROBOT.MINUTES} minutes). Sa batterie tient ${DATA.ROBOT.BATTERIE.TACHES} tâches à 100 % d'autonomie ; vide, il rentre à sa station de charge, à côté de la maison, et reprend sa liste une fois rechargé. La station prend l'électricité de la ferme (${DATA.ROBOT.BATTERIE.WH_TACHE} Wh par tâche, ${DATA.ROBOT.BATTERIE.CHARGE_WH_S} Wh/s), quand il est au repos et la nuit. Un appui sur le robot ou sa station : sa batterie, et +${DATA.ROBOT.BATTERIE.PALIER_PCT} % d'autonomie pour ${DATA.ROBOT.BATTERIE.PALIER_PRIX} 💰 ; l'arrosage, tous les matins à ${DATA.TEMPS.ARROSAGE_HEURE} h, par des asperseurs qui tournent au milieu des cultures (une plante arrosée à ${DATA.TEMPS.ARROSAGE_HEURE} h gagne son stade le lendemain à la même heure) ; ils repassent dans la journée pour les plantes qui ont soif plus tard (semées après ${DATA.TEMPS.ARROSAGE_HEURE} h).`,
  }),
  serre: () => ({
    nom: 'Serre',
    role: `Des légumes à l'abri, et les cultures de rente (${cashCrops().map((c) => DATA.CULTURES[c].nom.toLowerCase()).join(', ')}) qu'on ne trouve qu'ici.`,
    conso: `Eau par arrosage : ${cropsLine('serre', 'eau')}.`,
    prod: `${cropsLine('serre', 'recolte')}. Les cultures de rente ne se mangent pas : elles servent à la vente et aux recettes de luxe.`,
    note: 'Elle se bâtit : une pièce close avec le bac à semis (fabriqué à l\'Atelier) ; ses parcelles sont les cases libres de la pièce.',
  }),
  silo: () => {
    const S = DATA.ATELIER.SILO, R = DATA.ATELIER.RECETTES.bloc_silo;
    // un silo en bois, fait de blocs de silo (blocs.js, etatSilo)
    return {
      nom: 'Silo',
      role: 'Stocke le blé récolté ; les poules y mangent d\'abord. Le surplus va dans l\'inventaire.',
      conso: 'Aucune.',
      prod: `${S.BLES_PAR_BLOC} blés par bloc de silo : ${S.LARGEUR * S.HAUTEUR * S.BLES_PAR_BLOC} blés pour le silo de départ (${S.LARGEUR} colonnes de ${S.HAUTEUR} blocs).`,
      note: `Un bloc de silo se fabrique à l'Atelier (${Object.entries(R.entrees).map(([o, n]) => `${n} ${DATA.OBJETS[o].nom.toLowerCase()}`).join(' et ')}) et se pose dehors, sur l'herbe ; un bloc posé sur un autre rehausse sa colonne (jusqu'à ${S.HAUTEUR_MAX} blocs). ${S.LARGEUR} colonnes côte à côte, hautes de ${S.HAUTEUR} blocs : les blocs deviennent un silo en bois. Un seul silo : pour l'agrandir, un appui long dessus, puis une colonne de plus à côté (elle compte une fois haute de ${S.HAUTEUR} blocs) ou un bloc de plus sur une colonne. Repris, ses blocs reviennent dans l'inventaire (le blé qui ne tient plus aussi).`,
    };
  },
  poulailler: () => ({
    nom: 'Poulailler',
    role: 'Loge les poules, attirées par un nid garni (Atelier, onglet Élevage). Une poule pond toute sa vie, tant qu\'elle est nourrie.',
    conso: `1 blé pour ${DATA.ANIMAUX.poule.poulesParBle} poules nourries (une ration entamée se perd à la fin de la nuit).`,
    prod: `${DATA.ANIMAUX.poule.oeufsParNuit} œuf par nuit et par poule nourrie (${DATA.OBJETS.oeuf.energie} énergie).`,
    note: `Poules par niveau : ${listNum(DATA.POULAILLER.CAPACITE, '')}. Avec la Mangeoire à trémie (Arbre des technologies, branche Élevage), les poules sont nourries toutes seules pendant la nuit.`,
  }),
  // 'paturage' : identifiant historique. Le joueur lit « Moutons et vaches » (Étable).
  paturage: () => {
    const M = DATA.ANIMAUX.mouton;
    const V = DATA.ANIMAUX.vache;
    const P = DATA.PATURAGE;
    return {
      nom: 'Moutons et vaches',
      role: `Les moutons et les vaches vivent à l'Étable ; une pierre à sel et du foin (Atelier, onglet Élevage) en font venir un. Un mouton prend ${formatPlaces(P.PLACES_PAR_MOUTON)}, une vache ${formatPlaces(P.PLACES_PAR_VACHE)}. Une place achetée reste acquise.`,
      conso: `Chaque nuit, ${formatStraw(M.pailleParNuit)} par mouton et ${formatStraw(V.pailleParNuit)} par vache. La paille sort de la botteleuse : la faux en main (Atelier), chaque touffe d'herbe haute de la carte fauchée donne ${DATA.FAUX.FIBRE} fibre, à ramasser au sol (la touffe repousse ${DATA.FAUX.RETOUR[0]} à ${DATA.FAUX.RETOUR[1]} jours plus tard) ; ${DATA.BOTTELEUSE.FIBRES} fibres jetées dans la botteleuse font une botte de ${formatStraw(DATA.BOTTELEUSE.PAILLE)}. Elle ne s'achète pas : la calèche n'en vend pas.`,
      prod: `Un mouton nourri ${M.joursLaine} nuits donne ${M.laineParTonte} laine (à tondre). Une vache nourrie donne ${V.laitParNuit} lait la nuit même.`,
      note: `L'Étable se bâtit : une enceinte de murs avec la mangeoire (fabriquée à l'Atelier), reliée à un enclos de barrières ; puis ${formatNumber(P.PRIX_PLACE)} 💰 la place, +${formatNumber(P.CROISSANCE - 100)} % à chaque achat. S'il n'y a pas assez de paille, les animaux mangent dans l'ordre de la liste (les moutons, puis les vaches). Un animal qui n'a pas mangé ne donne rien cette nuit-là ; il ne lui arrive rien d'autre.`,
    };
  },
  verger: () => {
    const V = DATA.VERGER;
    return {
      nom: 'Verger',
      role: 'Pommiers, poiriers et autres fruitiers : achète un jeune arbre à la calèche (onglet Acheter, les semences) et plante-le dans le sol, dehors, avec la case 🔨, loin des autres arbres. Il pousse en 4 dessins (jeune arbre, arbuste, arbre, arbre en fruits) et reste en place.',
      conso: `Aucune : pas d'arrosage. Cueillir un arbre en fruits coûte ${formatNumber(DATA.PERSONNAGE.COUTS.cueillir)} énergie (rien avec la Récolte du verger de l'Arbre des technologies).`,
      prod: `${V.FRUITS} fruits ${nightsLabel(V.MATURITE)} après la plantation, puis ${V.PERIODE} nuits après chaque cueillette, toute l'année. Les fruits attendent sur l'arbre : un appui sur l'arbre les cueille.`,
      note: '',
    };
  },

  four: () => ({
    nom: 'Four',
    role: `Cuit le pain et les plats au four, et fond les minerais de la grotte en lingots, avec du bois (${ingotRecipes().map((r) => DATA.OBJETS[r.sortie].nom.toLowerCase()).join(', ')}). Une préparation à la fois ; le construire ouvre le Livre de recette.`,
    conso: 'Pas d\'électricité ; le bois des lingots vient des arbres coupés à la hache.',
    prod: `${stationRecipesLine('four')}.`,
    note: 'Les temps de préparation suivent la productivité de la famille. Les lingots ne se vendent pas : ils paient les technologies (Arbre des technologies).',
  }),
  cuisine: () => ({
    nom: 'Cuisine',
    role: 'Prépare les plats mijotés. Une préparation à la fois.',
    conso: 'Pas d\'électricité.',
    prod: `${stationRecipesLine('cuisine')}.`,
    note: `Un plat vaut ${formatNumber(DATA.CUISINE.COEF_PLAT)} % de l'énergie de ses ingrédients (arrondi), et les plats rendent la famille plus heureuse (son bonheur réduit l'énergie que coûtent tes actions) : chaque nuit, le bonheur baisse de ${formatNumber(-DATA.BONHEUR.DECLIN)}, et chacun des ${DATA.BONHEUR.PLATS_MAX} meilleurs plats différents mangés dans la journée en rend ${DATA.BONHEUR.PLATS.cuisine} (Cuisine) ou ${DATA.BONHEUR.PLATS.four} (Four), +${DATA.BONHEUR.HUILE_FRUIT} avec de l'huile ou un fruit, +${DATA.BONHEUR.SPECIALES.bonus} avec du cacao, du café ou de la vanille. Les recettes de luxe (${luxuryRecipes().map((r) => r.nom.toLowerCase()).join(', ')}) se vendent ${[...new Set(luxuryRecipes().map((r) => formatNumber(r.coefPrix)))].join(' ou ')} % du prix de leurs ingrédients au lieu de ${formatNumber(DATA.CUISINE.COEF_PLAT)} %.`,
  }),
  moulin: () => ({
    nom: 'Moulin',
    role: `Moud le blé en farine. Tout se fait dans le Moulin lui-même : « Moudre » 1, 5 ou 10 blés. Appareil électrique : interrupteur, usure, pannes. Il ne consomme du courant que quand il tourne. Sur une ferme générée, le Moulin est une tour : une pièce close dont les murs ont ${DATA.ATELIER.MOULIN.HAUTEUR} blocs de haut (en mode Construire, choisis le niveau 1 puis 2 et touche un mur pour le rehausser), la meule au centre ; sa voilure tourne dehors quand il moud.`,
    conso: `${formatNumber(DATA.STATIONS.moulin.whParS)} Wh/s pendant qu'il tourne, et ${formatQty(DATA.RECETTES.farine.ingredients[0].qte)} blé par mouture (celui de l'inventaire d'abord, puis celui du Silo).`,
    prod: `1 blé donne ${millOutputText()}, en ${formatQty(DATA.RECETTES.farine.temps)} s. La farine sert en cuisine (${recipesUsing([DATA.RECETTES.farine.sortie]).join(', ')}).`,
    note: 'Les blés sont moulus un par un. Sans énergie, le Moulin attend. La nuit, le blé en train d\'être moulu se termine ; ceux qui attendent reprennent au réveil. Tu peux reprendre le blé en attente.',
  }),
  presse: () => ({
    nom: 'Presse',
    role: 'Presse les graines de tournesol en huile. Appareil électrique : interrupteur, usure, pannes.',
    conso: `${formatNumber(DATA.STATIONS.presse.whParS)} Wh/s pendant qu'elle tourne.`,
    prod: `${stationRecipesLine('presse')}.`,
    note: 'Sans énergie, la préparation se met en pause.',
  }),
  // Les fiches du grand monde, des outils, de la grotte, de la pêche et de l'Arbre des technologies
  // (ouvertes depuis À propos).
  outils: () => {
    const C = DATA.PERSONNAGE.COUTS;
    const H = DATA.HACHE;
    const P = DATA.PIOCHE;
    return {
      nom: 'Outils',
      icone: '🛠️',
      lignes: [
        ['Fabrication', `Chaque outil se fabrique une fois à l'Atelier (onglet Outils), puis se choisit dans la barre d'outils de la carte : ${[DATA.HOUE, H, P, DATA.FAUX, DATA.CANNE, DATA.TRIPORTEUR].map((o) => `${o.ICONE} ${o.NOM.toLowerCase()}`).join(' · ')}.`],
        ['Houe', `Change une tuile d'herbe en terre à cultiver : ${formatNumber(C.labourer)} d'énergie la tuile.`],
        ['Hache', `Touche un arbre : ${formatNumber(C.couper)} d'énergie par coup, et ${formatNumber(H.BOIS)} bois qui tombe au sol. L'arbre tombe au ${H.COUPES}e coup et lâche ${formatNumber(H.CHUTE)} bois de plus là où il touche le sol. Marche sur le bois pour le ramasser. Sur ta ferme, un sapin laisse une pomme de pin, un autre arbre un gland, et il ne repousse pas : plante sa graine sur une case d'herbe libre (Inventaire › « Planter »), un arbre y pousse en ${H.POUSSE[0]} à ${H.POUSSE[1]} jours. Dans le grand monde, il repousse de lui-même quelques jours plus tard.`],
        ['Pioche', `Touche un rocher : ${formatNumber(C.piocher)} d'énergie par coup, et ${formatNumber(P.PIERRE)} pierre qui tombe au sol ; il se casse au ${P.COUPS}e coup en lâchant ${formatNumber(P.BRIS)} pierres de plus (marche dessus pour les ramasser) et revient ${P.RETOUR[0]} à ${P.RETOUR[1]} jours plus tard. Un caillou (un rocher d'une seule case) se ramasse aussi à la main, sans pioche : touche-le, ${formatNumber(P.MAIN)} pierre va dans ton inventaire. Dans la grotte, elle prend aussi le minerai.`],
        ['Faux', `Touche une touffe d'herbe haute : ${formatNumber(C.faucher)} d'énergie, et ${formatNumber(DATA.FAUX.FIBRE)} fibre qui tombe au sol (marche dessus pour la ramasser). La touffe repousse ${DATA.FAUX.RETOUR[0]} à ${DATA.FAUX.RETOUR[1]} jours plus tard. C'est la seule façon d'avoir de la fibre (l'Atelier, la paille de la botteleuse).`],
        ['Dans le grand monde', 'Hors de la ferme, les mêmes gestes : la hache, la pioche et la faux y prennent le bois, la pierre et la fibre, et la main cueille et ramasse (voir la fiche « Le grand monde »).'],
        ['Coup fort', `Outil en main, garde le doigt appuyé sur ton personnage : il tremble, puis frappe fort quand tu lèves le doigt. La hache ou la pioche comptent ${formatNumber(DATA.COUP_FORT.COUPS)} coups sur l'arbre ou le rocher le plus proche (pour l'énergie de ${formatNumber(DATA.COUP_FORT.ENERGIE)} coups) ; la faux tournoie et fauche toute l'herbe haute autour de lui ; la houe laboure les tuiles autour de lui.`],
        ['Canne à pêche', `Touche l'eau : ${formatNumber(C.pecher)} d'énergie le lancer (voir la fiche « Pêche »).`],
        // fiche 17 : la cruche, sa jauge, le puits
        ['Cruche', `Avant la pompe, on arrose avec elle (${formatNumber(DATA.CRUCHE.LITRES)} L). Sa case, dans la barre d'outils, montre l'eau qui reste (la jauge bleue). Touche-la, ou touche le puits : ton personnage y marche, puise, et elle est pleine. Trop loin, ou sans chemin jusqu'au puits : il te le dit.`],
        ['Bois et pierre', 'Ils se vendent, et paient les technologies avec les lingots. La branche Outils de l\'Arbre des technologies rend les outils plus efficaces.'],
      ],
    };
  },
  // Fiche 9b : le grand monde, ses lieux et ses gens, ce qui s'y fait (ouverte depuis À propos).
  monde: () => {
    const T = farmTerrain(state), C = DATA.CALECHE;
    return {
      nom: 'Le grand monde',
      icone: '🧭',
      lignes: [
        ['Le pays', `Ta ferme est au milieu d'un grand pays${T.MONDE ? ` de ${formatNumber(T.LARGEUR)} × ${formatNumber(T.HAUTEUR)} cases` : ''}, fermé par la montagne au nord et à l'ouest, par la mer au sud et à l'est. Autour d'elle, des prés ; plus loin, des forêts profondes, des marais, la lande, la montagne et ses sommets enneigés, la côte et ses plages. Des rivières descendent de la montagne à la mer, parfois par un lac.`],
        ['Chemins et gués', 'Les chemins de terre partent de la sortie de ta ferme, à l\'est, et font le tour du pays de hameau en hameau : la calèche les suit. On ne passe ni la mer, ni un lac, ni les falaises, ni les sommets ; une rivière se traverse à gué, là où un chemin la croise (des pierres plates sur l\'eau).'],
        ['Le brouillard', 'Tout est caché au départ, ta ferme comprise : seuls les alentours de ton personnage sont dégagés. Le brouillard se lève autour de toi quand tu marches (plus loin en montagne et à découvert, moins en forêt, dans le marais et la nuit), et ce que tu as vu le reste. Rien de ce qu\'il cache ne se voit ni ne se touche.'],
        ['La carte du monde', 'Le menu « Carte du monde » (ou la touche M, ou un appui sur la boussole) montre tout ce que tu as vu : les biomes, les chemins, ta ferme, les hameaux, les entrées de grotte et les coins de pêche découverts, la calèche quand elle y passe. Fais-la glisser, zoome, touche un lieu : son nom, sa distance, et « Y mener la boussole ».'],
        ['La boussole', 'Sous l\'horloge, son aiguille montre la ferme, ou le lieu choisi sur la carte du monde, et sa distance en cases. Arrivé au lieu, elle montre de nouveau la ferme ; sur la ferme, sans lieu choisi, elle se cache. Les Options la retirent.'],
        ['Récolter dans le monde', `Hors de la ferme, les mêmes gestes : la hache abat les arbres, les buissons, les souches et les troncs couchés (un arbre en ${formatNumber(DATA.RECOLTE.SORTES.feuillu.coups)} coups) ; la pioche casse les rochers, les gros blocs et les éboulis ; la faux fauche les fougères, la bruyère, les joncs, les roseaux et les oyats. À la main (touche-les), cueille les mûres des ronciers et ramasse les champignons, les herbes de montagne, le bois flotté, les galets, les coquillages, les étoiles de mer et les algues. Ce qui est pris revient quelques jours plus tard (${DATA.RECOLTE.SORTES.feuillu.retour[0]} à ${DATA.RECOLTE.SORTES.feuillu.retour[1]} jours pour un arbre), si tu es passé par là.`],
        ['Grottes de la montagne', 'Au pied de la montagne, des bouches de roche mènent à des grottes plus riches que la mine de la ferme (voir la fiche « Mine, minerais et lingots »).'],
        ['Pêche', 'La canne s\'utilise au bord de toute eau du monde : les lacs, les rivières et la mer ont chacun leurs poissons ; les coins de pêche (un ponton, des piquets et une nasse, des remous) sont meilleurs (voir la fiche « Pêche »).'],
        ['Les bêtes du monde', 'Marmottes, bouquetins et aigles en montagne, mouettes, crabes et dauphins sur la côte, canards et cygnes sur les lacs et le marais, chevreuils, renards, lapins et écureuils en forêt, lièvres et perdrix sur la lande : on ne les chasse pas, on les regarde. Elles fuient si tu t\'approches trop. Touche une bête : son nom et sa page de l\'Encyclopédie (elle se découvre la première fois que tu en vois une).'],
        ['Les hameaux', `Les chemins du grand monde mènent à des hameaux de ${DATA.HAMEAUX.MAISONS[0]} à ${DATA.HAMEAUX.MAISONS[1]} maisons, bâties de murs, de portes et de fenêtres comme ta maison, dans le style du pays (pierre et ardoise en montagne, pierre blanche et tuiles sur la côte, bois et chaume en forêt et sur la lande, bois et roseaux au bord du marais). Promène-toi sur la place, entre dans les maisons par leur porte (le toit s'efface). On n'y bâtit pas, on n'y laboure pas, on n'y casse rien et on n'y coupe pas les arbres des jardins. Le premier passage dans un hameau l'annonce et l'inscrit dans l'Encyclopédie.`],
        ['Les habitants', `Chaque maison d'un hameau a sa famille (un ou deux adultes, des enfants), et chaque hameau son métier : bûcheron, pêcheur, mineur, berger ou cueilleur. Le matin, les adultes partent travailler (le bûcheron abat aussi des arbres alentour, qui repoussent comme les autres), les enfants jouent sur la place ; à midi et le soir, tout le monde rentre manger, et la nuit chacun dort dans son lit. Touche un habitant : il te dit son prénom, son métier et un mot selon l'heure et son humeur. Touche le panneau de la place : la fiche du hameau montre ses familles, leur bonheur et la réserve du hameau. Chaque nuit, même loin de toi, chaque famille vit sa journée : elle produit, mange, est plus ou moins heureuse, et met ce qui lui reste à la réserve, que la calèche viendra acheter.`],
        ['La visite de bienvenue', `Le deuxième jour, vers midi, un habitant du hameau le plus proche vient à pied jusqu'à ta porte souhaiter la bienvenue à ta famille. Va à sa rencontre : il t'offre un bon plat de sa cuisine. Si tu n'es pas là, il le laisse devant la porte : tu le prendras en rentrant.`],
        ['La calèche', `Chaque jour, elle fait le tour du pays par les chemins, de hameau en hameau, et s'arrête devant l'entrée de ta ferme vers ${C.FERME} h, une heure. Une icône au bord de l'écran montre où elle est quand elle approche ; sur un chemin, quand elle passe tout près, touche-la ou le bouton « Héler » : elle s'arrête. Arrêtée à côté de toi (dès le niveau ${unlockLevel('marche')}), elle t'achète tout ce qui se vend, au prix de vente, et te vend des semences et ce qu'elle a acheté en chemin à la réserve des hameaux (bois, poisson, pierre, lait, laine, baies…), dont l'argent va aux familles. Le soir, elle dort dans un hameau. Sa fenêtre (le menu) dit où elle est.`],
        ['L\'Atelier', 'Seules les semences s\'achètent : les outils, les bêtes (un nid garni pour une poule, une pierre à sel et du foin pour un mouton ou une vache, un licol et des friandises pour le cheval), la ruche, le bac à fleurs et les meubles se fabriquent à l\'Atelier, avec ce que tu récoltes à la ferme et dans le monde. Les aliments se cultivent, se cuisinent, ou viennent des hameaux par la calèche.'],
        ['Le cheval', 'En selle, il te porte partout dans le pays, plus vite qu\'à pied ; quand tu en descends, il rentre à l\'Écurie.'],
        // fiche 15 : les blocs qui éclairent la nuit (BLOCS lumiere : js/carte/ferme/chantier.js, stepLanterns)
        ['Éclairer la nuit', `La lanterne scintillante (${recetteAtelier('lanterne')}) et le candélabre, un pied de fer forgé haut de deux blocs et ses trois bougies (${recetteAtelier('candelabre')}), se fabriquent à l'Atelier et se posent avec 🔨 Construire, dehors comme dans la maison : la nuit, ils s'allument et éclairent autour d'eux.`],
        // fiche 17 : choisir son lit
        ['Ton lit', 'Ton personnage dort dans le premier lit (ou la première paillasse) de tes pièces closes. Touche un autre lit, toit levé ou à l\'étage : « Tu veux choisir ce lit ? ». Oui, il y dormira ; le membre de la famille qui y dormait prend ton ancien lit.'],
        ['Qualité de l\'affichage', 'Sur un téléphone, le jeu se dessine en qualité « économie » pour rester fluide : l\'image un peu moins fine, le brouillard et la lumière de la nuit en plus gros points, la mer sans ses vagues d\'écume, les arbres faits plus près de toi. Les Options (Affichage) la règlent : « Auto » (économie sur un téléphone, normale sur un ordinateur), « Économie » ou « Normale ». Ta partie n\'en dépend pas.'],
      ],
    };
  },
  grotte: () => ({
    nom: 'Mine, minerais et lingots',
    icone: '⛏️',
    lignes: [
      ['La mine', 'Sur la ferme, caché dans les bois, un tas de terre avec une porte sombre : touche deux fois le tas (ou avance vers la porte quand tu es devant) pour y entrer. Au premier niveau, l\'échelle te fait ressortir par la porte.'],
      ['Sous terre', 'Chaque niveau change tous les jours ; on descend par le puits, on remonte par l\'échelle. Il y fait noir : on n\'y voit qu\'autour de soi.'],
      ['Minerais', `La pioche en main, touche un minerai dans les murs (${formatNumber(DATA.PERSONNAGE.COUTS.piocher)} d'énergie le coup) : il va dans l'inventaire. Le fer est partout ; le cuivre, l'or et le platine se trouvent de plus en plus bas.`],
      ['Lingots', `Au Four, avec du bois : ${ingotRecipes().map((r) => `${DATA.OBJETS[r.sortie].nom.toLowerCase()} = ${ingredientsText(r)}`).join(' ; ')}.`],
      ['À quoi ça sert', 'Minerais et lingots ne se vendent pas (ce sont des matériaux) : avec le bois et la pierre, ils paient les technologies de l\'Arbre des technologies.'],
      ['Grottes de la montagne', `Dans le grand monde, au pied de la montagne, des bouches de roche : approche-toi (une flèche paraît), touche la bouche ou avance vers elle pour entrer. ${formatNumber(DATA.GROTTE.MONDE.NIVEAUX)} niveaux, plus riches que la mine : l'or et le platine dès le haut, du quartz et des améthystes à piocher, un filon dans chacune. En remontant, tu ressors devant l'entrée.`],
    ],
  }),
  peche: () => {
    const C = DATA.CANNE;
    const poissons = [...new Set(Object.values(C.PRISES).flatMap((p) => Object.keys(p)))];
    return {
      nom: 'Pêche',
      icone: '🎣',
      lignes: [
        ...Object.entries(C.PRISES).map(([eau, prises]) => [EAUX[eau] || eau, `${capitalize(itemNames(Object.keys(prises)))} ; au plus ${formatNumber(C.JOUR[eau])} prises par jour.`]),
        ['Coins de pêche', `Dans le grand monde, un ponton, ou des piquets et une nasse, et des remous sur l'eau : pêche tout près, c'est un meilleur coin (plus de touches, ${itemNames(Object.values(C.COINS.PRISES).flatMap((p) => Object.keys(p)).filter((p, k, l) => l.indexOf(p) === k && !Object.values(C.PRISES).some((q) => p in q)))} en plus, jusqu'à ${formatNumber(C.COINS.JOUR.mer)} prises par jour en mer), compté à part de son eau.`],
        ['Lancer', `La canne en main (Atelier : du bois, des fibres et une pierre), touche l'eau : ${formatNumber(DATA.PERSONNAGE.COUTS.pecher)} d'énergie le lancer, et il arrive que rien ne morde.`],
        ['Poissons', `Frais, ils se gardent peu de nuits : mange-les, vends-les ou cuisine-les (${recipesUsing([...poissons, 'poisson']).join(', ')}).`],
      ],
    };
  },
  // Fiche 11 : l'équipement de la famille et le sac à provisions (aussi le « ? » de la fiche d'un membre).
  equipement: () => {
    const Q = DATA.EQUIPEMENT, O = DATA.OBJETS, R = DATA.ATELIER.RECETTES;
    const recette = (id) => Object.entries(R[id].entrees).map(([o, n]) => `${n} ${O[o].nom.toLowerCase()}`).join(', ');
    const pieces = Object.keys(Q.PIECES);
    const enfant = pieces.filter((id) => Q.PIECES[id].enfant).map((id) => O[id].nom.toLowerCase());
    return {
      nom: 'Équipement et sac à provisions',
      icone: '🎒',
      lignes: [
        ['La fiche', `Dans la Famille, un onglet par membre ouvre sa fiche : ${Q.CASES} cases d'équipement à gauche, son portrait au milieu (on y voit ce qu'il porte), ses jauges à droite. Touche une case vide pour l'équiper d'une pièce de l'inventaire, une case pleine pour la retirer : elle revient dans l'inventaire. Une pièce portée n'est plus dans l'inventaire et ne se vend pas.`],
        ['Les règles', `Une pièce par place : ${Object.values(Q.PLACES).map((p) => p.toLowerCase()).join(', ')} (pas deux chapeaux, pas un tablier sur une salopette). Un enfant porte ce qui existe à sa taille : ${enfant.join(', ')}.`],
        ...pieces.map((id) => [O[id].nom, `${effetTexte(id)} Atelier : ${recette(id)}${R[id].debloque ? ` (dès le niveau ${unlockLevel(R[id].debloque)})` : ''}.`]),
        ['Pour qui ?', 'Les effets valent pour toi, le personnage principal. Pour un autre membre, seulement dans ce qu\'il fait de lui-même sur la ferme : les bottes lui donnent moins faim quand il marche, le tablier quand il t\'aide ; les autres pièces se voient sur lui, sans plus.'],
        ['Le sac à provisions', `Ta fiche a une quatrième case : ton sac (${Object.entries(Q.SACS).map(([id, s]) => `${O[id].nom.toLowerCase()}, ${s.portions} portions : ${recette(id)}`).join(' ; ')}). Touche-le pour le remplir, à la ferme, d'aliments de l'inventaire ou du réfrigérateur ; ce qu'il contient périme comme dans l'inventaire.`],
        ['En expédition', 'Loin de la ferme, tu ne manges que ce qu\'il y a dans ton sac : « Manger » y puise, et dit quand il est vide. Une alerte prévient quand tu sors avec un sac vide ou presque, et quand ton énergie baisse loin de la ferme, le sac vide. Sur la ferme, rien ne change.'],
      ],
    };
  },
  techno: () => {
    const T = DATA.ARBRE;
    const noeuds = Object.values(T.noeuds);
    return {
      nom: 'Arbre des technologies',
      icone: '🔬',
      lignes: [
        ['PT', `Les points de technologie (PT) : chaque chapitre terminé en rapporte (${T.POINTS.CHAPITRES.join(' · ')}), chaque jalon de maîtrise 1, et en mode libre 1 toutes les ${T.POINTS.MODE_LIBRE_NUITS_100} nuits à 100 % d'autonomie.`],
        ['Coût', 'Une technologie se paie en PT, en pièces et en ressources : du bois et de la pierre (hache, pioche), puis des lingots fondus au Four avec le minerai de la grotte.'],
        ['Paliers', `Les paliers s'ouvrent avec les chapitres : ${Object.entries(T.PALIERS).map(([n, p]) => `${n}. ${p.nom} (chapitre ${p.chapitre})`).join(' · ')}.`],
        ['Branches', `${noeuds.length} technologies en ${T.branches.length} branches : ${T.branches.map((b) => `${b.icone} ${b.nom} (${noeuds.filter((x) => x.branche === b.id).length})`).join(' · ')}.`],
        ['Outils', `${noeuds.filter((x) => x.branche === 'outils').map((x) => x.nom).join(', ')} : moins de coups, plus de bois, de pierre, de minerai et de poisson, moins d'énergie.`],
      ],
    };
  },
  chapitres: () => {
    const c = state.campagne;
    const lignes = [['Chapitres', `La campagne compte ${chapterCount()} chapitres. Remplis tous les objectifs d'un chapitre pour passer au suivant et gagner son XP.`]];
    if (!c.fini) lignes.push(['Ce chapitre', chapterProgress(state).intro]);
    else lignes.push(['Mode libre', 'La famille est autonome. Continue de monter en niveau, à ton rythme.']);
    return { nom: 'Chapitres', icone: '📜', lignes };
  },
  commerce: () => ({
    nom: 'Commerce',
    icone: '🏪',
    lignes: [
      ['Rôle', 'Un commerce transforme chaque nuit, après le repas de la famille, une partie de la production de la ferme et la vend tout seul, sans attendre la calèche.'],
      ['Coût', 'Ni énergie ni électricité ; chaque pièce vendue rapporte 1 XP.'],
      ['Valeur', `Il vend ses produits plus cher qu'une recette (${formatNumber(DATA.CUISINE.COEF_PLAT)} % du prix des ingrédients).`],
      ['Choix', `Le premier choix est gratuit. En changer coûte ensuite ${formatNumber(DATA.COMMERCE.CHANGER)} 💰.`],
    ],
  }),
  frigo: () => ({
    nom: 'Réfrigérateur',
    role: `Les aliments rangés au frais ne vieillissent plus, tant qu'il est alimenté. Capacité : ${DATA.FRIGO.CAPACITE.join(' / ')} unités selon le niveau ; plein, « Ranger » est grisé et « Tout ranger » range d'abord ce qui périme le plus tôt.`,
    conso: `${formatNumber(DATA.FRIGO.PAR_UNITE_MWH_S)} mWh/s par unité stockée (rien s'il est vide), jour et nuit. Au Dormir, ${DATA.FRIGO.BLOC_NUIT_S} s de consommation sont prélevées d'un coup pour la nuit.`,
    prod: 'Du froid : aucune péremption au frigo.',
    note: `S'il manque de courant plus de ${formatNumber(DATA.FRIGO.SEUIL_ALIMENTE)} % de la journée, ou pendant la nuit, chaque lot perd ${nightsLabel(DATA.FRIGO.PERTE_NUITS)} de conservation.`,
  }),
};

// Les fiches sans bâtiment, ouvertes depuis À propos.
const FICHES = ['monde', 'outils', 'equipement', 'grotte', 'peche', 'techno'];
const fiches = () => FICHES;

// Le nom des actions de DATA.PERSONNAGE.COUTS, pour la règle de l'énergie.
const ACTIONS_NOMS = {
  couper: 'couper', piocher: 'piocher', faucher: 'faucher', pecher: 'pêcher', labourer: 'labourer', planter: 'planter', arroser: 'arroser',
  recolter: 'récolter', cueillir: 'cueillir', tondre: 'tondre', cuisiner: 'cuisiner', cuireFour: 'cuire au four',
  moudre: 'moudre', presser: 'presser',
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
  openModal(`
    <div class="help-head">${h.icone ? `<span class="help-emoji" aria-hidden="true">${h.icone}</span>` : artPx([sym])}<h2 id="help-title">${h.nom}</h2></div>
    <ul class="help-list">
      ${h.lignes
        ? h.lignes.map(([titre, texte]) => `<li><strong>${titre}</strong>${texte}</li>`).join('')
        : `<li><strong>Rôle</strong>${h.role}</li>
      <li><strong>Consommation</strong>${h.conso}</li>
      <li><strong>Production</strong>${h.prod}</li>
      ${h.note ? `<li><strong>Bon à savoir</strong>${h.note}</li>` : ''}`}
    </ul>
    <button type="button" class="btn primary" data-action="close-modal" id="help-close">Fermer</button>`, { labelledBy: 'help-title', focus: '#help-close' });
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
      ? `Ton foyer est bâti. Ici, tout se fait d'abord à la main : fabrique à l'Atelier un puits et une cruche, pose le puits dehors avec la case 🔨, remplis la cruche au puits (un appui dessus : ton personnage y va et puise ; sa jauge bleue, dans la barre d'outils, dit l'eau qui reste) et arrose tes plantes. La calèche, qui passe à la ferme chaque jour vers ${DATA.CALECHE.FERME} h, commerce avec toi à partir du niveau ${unlockLevel('marche')}. Au niveau ${unlockLevel('energie')}, le panneau solaire, la pompe, la citerne et la batterie (il faut des lingots : le minerai de la grotte, fondu au four) pomperont l'eau pour toi : l'automatisation commence.`
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
  const chip = document.querySelector('.stage-chip:not(.hoe):not(.done)');
  if (shown(chip) && !covered(chip)) return chip;
  // la puce est sous une fenêtre de la carte : d'abord la fermer
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
    `La famille (${adultes} adultes, ${enfants} enfants) mange quand elle a faim : chaque membre (sauf toi) a une jauge, qui baisse quand il marche ou qu'il aide ; à ${DATA.FAMILLE.FAIM.SEUIL}, il va manger dans la boîte à nourriture (fabriquée à l'Atelier, posée dans le foyer, remplie par toi : ${DATA.ATELIER.BOITE.PLATS} aliments différents, ${DATA.ATELIER.BOITE.QUANTITE} de chacun), ou au réfrigérateur une fois construit, d'abord ce qui périme le plus tôt.`,
    `La journée commence à ${DATA.TEMPS.HEURE_REVEIL} h ; une heure passe toutes les ${DATA.TEMPS.SECONDES_PAR_HEURE} s. À ${DATA.TEMPS.HEURE_NUIT} h, la famille va se coucher et reste à la maison ; la nuit défile à la même vitesse et ton personnage peut encore agir : seul son sommeil arrête les actions. À minuit, la nuit passe (ponte, lait…) et le jour change ; les plantes, elles, poussent ${DATA.TEMPS.POUSSE_HEURES} heures après leur arrosage, à toute heure ; à ${DATA.TEMPS.HEURE_REVEIL} h, c'est le réveil. Pendant la nuit, le bouton « Zzz » envoie ton personnage dans son lit (on ne dort que la nuit) : quand il dort, une heure passe toutes les ${DATA.TEMPS.SECONDES_PAR_HEURE_SOMMEIL} s et son énergie remonte peu à peu (${DATA.PERSONNAGE.SOMMEIL_HEURES} heures de sommeil pour celle du réveil ; éveillé, rien ne revient). L'horloge s'arrête quand le jeu est fermé.`,
    `La nuit : repas, puis une poule nourrie pond, les moutons font leur laine, les vaches donnent leur lait, et les aliments hors frigo vieillissent (ils périment en ${Math.min(...durees)} à ${Math.max(...durees)} nuits).`,
    `Ton énergie (⚡, 0 à ${DATA.PERSONNAGE.MAX}) : chaque action au clic en coûte (${Object.entries(DATA.PERSONNAGE.COUTS).map(([a, n]) => `${ACTIONS_NOMS[a] || a} ${formatNumber(n)}`).join(', ')}), un peu moins quand la famille est heureuse (jusqu'à −${DATA.PERSONNAGE.BONHEUR_REDUCTION} %) et ${DATA.PERSONNAGE.ENDURANCE} % de moins par niveau. Au réveil, elle remonte à ${DATA.PERSONNAGE.REVEIL_BASE}, et jusqu'à ${DATA.PERSONNAGE.REVEIL_BASE + DATA.PERSONNAGE.REVEIL_REPAS} si le reste de la famille se couche rassasié ; un aliment mangé dans la journée rend sa valeur (son énergie ÷ ${DATA.PERSONNAGE.MANGER_DIVISEUR}, + ${DATA.PERSONNAGE.MANGER_BONUS} %, arrondie au-dessus). Les automatisations ne coûtent rien.`,
    `Électricité : panneau (de ${DATA.SOLEIL.DEBUT} h à ${DATA.SOLEIL.FIN} h) → batterie → pompe (son eau sert aussi aux asperseurs de l'arrosage automatique), moulin, presse, réfrigérateur, station de charge du robot. Un appareil en marche s'use d'un point toutes les ${formatNumber(DATA.USURE.HEURES_PAR_POINT)} heures de jeu ; l'entretenir coûte ${formatNumber(DATA.USURE.TAUX_ENTRETIEN)} % de son prix, le réparer après une panne ${formatNumber(DATA.USURE.TAUX_REPARATION)} % (arrondis à l'entier supérieur).`,
    `La calèche : elle fait chaque jour le tour du monde par les chemins et passe à la ferme vers ${DATA.CALECHE.FERME} h ; on commerce avec elle quand elle est arrêtée à côté de soi (ou hélée sur un chemin). Prix de vente fixes. Elle vend les semences (prix d'achat = prix de vente × coefficient, arrondi à l'entier supérieur ; chaque unité achetée ajoute ${formatNumber(M.PAS)} points au coefficient, chaque unité vendue en retire ${formatNumber(M.PAS)}, plancher ${formatNumber(M.PLANCHER.defaut)} %, graines ${formatNumber(M.PLANCHER.graine)} %) et ce qu'elle achète aux hameaux (à ${DATA.CALECHE.VENTE} % du prix de vente). Les outils, les animaux et les meubles se fabriquent à l'Atelier.`,
    `Autonomie = part de ce que la famille a mangé dans la journée qui vient de la ferme. ${chapterCount()} chapitres mènent à une famille autonome.`,
    `Arbre des technologies : ${Object.keys(DATA.ARBRE.noeuds).length} technologies en ${DATA.ARBRE.branches.length} branches, payées en points de technologie (PT : chapitres terminés, jalons de maîtrise, mode libre), en pièces et en ressources (bois, pierre, puis lingots fondus au Four avec le minerai de la grotte). Les automatisations (arrosage, récolte, semis, nourrissage, tonte) et certaines recettes s'y débloquent.`,
    `Absence : jusqu'à ${formatDuration(H.MAX_S)} sont rattrapées au retour (énergie, eau, préparations, réfrigérateur), sans nuit${H.USURE ? '' : ' et sans usure'}. Ce temps compte comme temps d'éveil.`,
  ];
  openModal(`
    <h2 id="about-title">ℹ️ À propos</h2>
    <p class="about-version"><strong>Ferme Familiale</strong> · version ${GAME_VERSION} <span class="muted">(format de sauvegarde ${STATE_VERSION})</span></p>
    <h3>Règles principales</h3>
    <ol class="about-rules">${rules.map((r) => `<li>${r}</li>`).join('')}</ol>
    <h3>Fiches d'aide</h3>
    <div class="row">${fiches().map((id) => `<button type="button" class="btn" data-action="help" data-id="${id}">${HELP[id]().icone} ${HELP[id]().nom}</button>`).join('')}</div>
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
