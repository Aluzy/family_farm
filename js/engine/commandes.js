/* ---------- les commandes : ce que fait le joueur, nommé, vérifié, annulable ----------
   (la nouvelle vision, ticket F0-3 : un pas vers les mondes partagés, où un serveur jouera les mêmes
   commandes avec le même moteur)

   Une commande est un objet simple, que l'on peut écrire, envoyer, garder dans un journal et rejouer :
     { id, type, args }
   `type` est l'une des clés de COMMANDES ; `args` ses arguments (des nombres, des textes) ; `id` un
   identifiant unique donné par celui qui l'émet (l'interface, plus tard un autre joueur) : le moteur
   ne le fabrique pas (il n'a ni horloge ni hasard à lui), il le rend tel quel.

   executerCommande(state, cmd) applique la commande par les fonctions du moteur qui existaient déjà
   (blocs.js, etage.js : elles vérifient tout et mutent la partie) et renvoie leur résultat, plus :
     - `id` : celui de la commande ;
     - `inverses` : les commandes qui la défont (vide : rien à défaire, comme une colonne de silo
       rehaussée). Une commande inverse vérifie d'abord que ce qu'elle défait est
       toujours là (`attendu`) : si la case a changé depuis, elle échoue sans rien toucher.
   Une commande refusée ne change rien à la partie : { ok: false, error }.

   Les commandes du chantier (le mode Construire, js/ui/chantier.js) :
     bloc.poser       { sorte, case, sens? }   poser au sol (sur un mur : le changer ; un meuble : son sens)
     bloc.reprendre   { case, attendu? }       reprendre ce qui est sur la case (un meuble : sur l'une de ses cases)
     bloc.remettre    { case, avant, apres }   défaire un changement : `apres` repris, `avant` reposé
     bloc.deplacer    { de, vers, attendu? }   emporter un bloc seul ou un meuble de sa case d'ancrage `de` à `vers`
     bloc.tourner     { case }                 un quart de tour
     bloc.orienter    { case, sorte, sens }    remettre un meuble dans le sens `sens`
     bloc.peindre     { case, variante }       repeindre un meuble (A-3 : l'id de sa variante de couleur)
     mur.rehausser    { sorte, case }          un bloc de plus sur un mur (niveaux 1 et 2)
     mur.abaisser     { case, niveau?, attendu? } reprendre le bloc du dessus d'un mur
     etage.poser      { sorte, case, sens? }   sur l'étage d'une pièce (un meuble : son sens)
     etage.reprendre  { case, attendu? }       (un meuble : sur l'une de ses cases)
     etage.remettre   { case, avant, apres }   défaire un changement sur l'étage
     etage.deplacer   { de, vers, attendu? }   emporter un bloc seul ou un meuble de l'étage de `de` à `vers`
     etage.tourner    { case }                 un quart de tour, à l'étage (A-1)
     etage.orienter   { case, sorte, sens }    remettre un meuble de l'étage dans le sens `sens`
     etage.peindre    { case, variante }       repeindre un meuble de l'étage (A-3)
   (bloc.poser et etage.poser prennent aussi `variante?` : la couleur d'un meuble qui en a plusieurs)
     solEtage.poser   { sorte, case, niveau }  un sol aux niveaux 1 et 2
     solEtage.reprendre { case, niveau, attendu? }
     solEtage.remettre { case, niveau, avant, apres } défaire un sol changé pour un autre

   Les commandes du potager et de la nuit (sans inverse : une graine semée, une parcelle arrosée, une
   récolte, une nuit dormie ne se défont pas ; l'énergie dépensée non plus) :
     potager.planter  { parcelle, culture }    semer une parcelle (son identifiant), à la main
     potager.arroser  { parcelle }
     potager.recolter { parcelle, direct? }     (direct : à l'inventaire, sans attendre le personnage)
     potager.labourer { case }                 labourer une case d'herbe (ou reboucher une parcelle vide)
     potager.toutPlanter  { lieu, culture }    « Planter partout », « Arroser tout », « Récolter tout »
     potager.toutArroser  { lieu }
     potager.toutRecolter { lieu, direct? }
     cruche.remplir   { case }                 remplir la cruche au puits de cette case
     bac.semer        { case, fleur }          semer une graine de fleur dans un bac à fleurs vide (js/engine/bacs.js)
     bac.recolter     { case }                 couper à la faux les fleurs d'un bac en fleurs
     massif.cueillir  { case }                 cueillir à la main les fleurs semées dans l'herbe (js/engine/massifs.js)
     tonnelet.remplir { case, objet }          mettre une tomme d'alpage, un moût de houblon dans un tonnelet vide (tonnelets.js)
     compost.jeter    { case, objet, quantite } jeter des aliments de l'inventaire dans un bac à compost (compost.js)
     potager.engrais  { parcelle }             mettre un engrais sur une culture arrosée : elle gagne un cycle (compost.js)
   Les bêtes (E-6, sans inverse non plus) :
     poules.nourrir   { }                      une poule (« Nourrir une poule »)
     poules.toutNourrir { }                    « Nourrir tout »
     poulailler.agrandir { }                   le niveau suivant du Poulailler
     etable.tondre    { mouton }               tondre ce mouton (son identifiant)
     etable.herbes    { oui }                  les vaches aux herbes de montagne (ou à la paille)
     etable.place     { }                      acheter une place de plus à l'Étable
     ramassage.prendre { tas }                 prendre un tas qui attend (ramassage.js : un id de tas,
                                                une ruche pleine « ruche:<case> », un tonnelet prêt
                                                « tonnelet:<case> », un bac à compost « compost:<case> » compris)
   La cuisine (E-7, sans inverse : une préparation lancée, un plat mangé ne se défont pas comme un mur ;
   « Annuler » une préparation en attente est une commande à part entière) :
     cuisine.lancer   { recette }               lancer une recette à son atelier
     cuisine.annuler  { station, rang }         retirer la préparation en attente n° `rang` de la file
     cuisine.arreter  { station }               arrêter la préparation en cours (ses ingrédients rendus)
     moulin.moudre    { quantite }              verser du blé au Moulin
     moulin.annuler   { }                       reprendre le blé du Moulin
     frigo.ranger     { objet, quantite }       mettre au réfrigérateur ; frigo.sortir : l'en sortir
     frigo.sortir     { objet, quantite }
     frigo.toutRanger { }                       « Tout ranger » ; frigo.urgent : ce qui périme bientôt
     frigo.urgent     { }
     frigo.acheter    { }                       le réfrigérateur ; frigo.agrandir : le niveau suivant
     frigo.agrandir   { }
     boite.deposer    { objet, quantite }       la boîte à nourriture du foyer ; boite.reprendre
     boite.reprendre  { objet, quantite }
     manger           { objet?, sac? }          manger sur le pouce (sac : ce qui est dans le sac)
   Les outils de la ferme (E-9, sans inverse ; sans positions de chute : ce qui tombe va droit à
   l'inventaire, comme dans un monde en ligne, qui ne ramasse pas) :
     outil.couper     { arbre, fort? }          un coup de hache (un arbre, un buisson : « col,rang » de son pied)
     outil.casser     { rocher, fort? }         un coup de pioche (« col,rang »)
     outil.caillou    { rocher }                ramasser un caillou à la main
     outil.faucher    { touffe }                un coup de faux (« x,y » en px, le pied de la touffe)
     outil.faucherAutour { touffes }            le coup fort de la faux : les touffes autour (au plus 60)
     outil.pecher     { eau, coin? }            un lancer (etang, mare ; lac, riviere, mer : le grand monde)
     verger.cueillir  { arbre }                 cueillir les fruits d'un arbre du verger (son id)
   La progression de la ferme (E-10, M.5 : commune à tous ses joueurs ; sans inverse) :
     tech.acheter     { noeud }                 un nœud de l'arbre des technologies
     atelier.fabriquer { recette }              une recette de l'Atelier (un bloc, un outil, un meuble…)
     atelier.construire { station }             construire un atelier qui s'achète (la Presse)
     appareil.basculer  { appareil }            allumer ou éteindre un appareil
     appareil.ameliorer { appareil }            son niveau suivant ; appareil.entretenir, appareil.reparer
     appareil.entretenir { appareil }
     appareil.reparer { appareil }
     reservoir.agrandir { }                     le réservoir d'eau ; robot.batterie : l'autonomie du robot
     robot.batterie   { }
     arbre.planter    { sorte, case }           planter un arbre (un plant, une graine) ou semer une fleur sur une case
     potager.semis    { parcelle, mode, culture? } le semis automatique d'une parcelle
   Les machines de l'Atelier et ce qui traîne au sol (E-13, sans inverse) :
     botteleuse.verser { case }                 jeter ses fibres dans l'entonnoir d'une botteleuse
     botteleuse.sortir { case }                 la botte d'une botteleuse pleine : sa paille à l'inventaire
     chaine.verser    { case }                  jeter les ingrédients dans l'entonnoir d'une chaîne
     distributeur.verser { case }               jeter son blé dans un distributeur de grain
     morceau.ramasser { n }                     prendre un morceau tombé au sol (bois, pierre, un produit)
     cueillette.ramasser { cueillette }         ramasser à la main (« sorte:case » : une branche, une baie…)
     nuit.dormir      { }                       se coucher, la nuit (elle défile jusqu'au réveil)
     nuit.partagee    { }                       E-5 : toute la nuit d'un coup, à n'importe quelle heure
                                                (le monde en ligne la joue, quand tous sont couchés)
   Le commerce au port (l'île à bâtir, fiche I1b ; js/engine/port.js, sans inverse : une vente, un achat ne se
   défont pas) — `case` : celle du personnage, à PORT.PORTEE cases du comptoir :
     port.vendre      { objet, quantite, case } vendre au comptoir (au prix de vente : market.js)
     port.acheter     { objet, quantite, case } acheter une semence (à son cours, qui monte)
   Le bac, les commandes, l'import et les niveaux (fiche I1c ; js/engine/bac.js, sans inverse) :
     port.honorer     { commande, case }        honorer une commande du bac avec ce qu'on a porté
     port.importer    { article, quantite, case } commander au catalogue (« objet:jeune_pommier »…), payé d'avance
     port.apporter    { case }                  apporter au chantier du port les matériaux portés du niveau suivant
     port.agrandir    { case }                  payer le niveau suivant (ses matériaux apportés)
   Les tâches des villageois (l'île à bâtir, fiche I3c ; js/engine/taches.js, sans inverse) :
     villageois.attribuer { id, tache }        confier une tâche (TACHES.LISTE) au villageois `id` ; « aucune » : plus de tâche
     villageois.outil     { id, outil }        lui donner son outil (hache, pioche, faux, canne) ; « reprendre » : le reprendre
     villageois.vendre    { id, objets }       la navette : ce qu'il porte au port (les objets marqués « à vendre »)
   Les liens entre villageois (l'île à bâtir, fiche I6b ; js/engine/liens.js, sans inverse) :
     villageois.foyer     { a, b, maison? }     proposer à deux proches de vivre ensemble (la maison : sa boîte aux lettres)
     villageois.enfant    { foyer }             proposer à un foyer d'accueillir un enfant (il viendra par le prochain bac)
   L'étal du joueur (l'île à bâtir, fiche I4 ; js/engine/bourse.js, l'inverse l'un de l'autre) :
     etal.mettre      { objet, quantite }       mettre en vente à l'étal (de l'inventaire, puis du réfrigérateur)
     etal.reprendre   { objet, quantite }       reprendre de l'étal (à l'inventaire)
*/

import { objectifsARevoir } from './campaign.js';
import { DATA } from './catalog.js';
import { fail, maintainDevice, repairDevice, toggleDevice, upgradeDevice, upgradeTank } from './devices.js';
import {
  blocAt, blocDessus, casesCouvertes, deplacerBloc, hauteurPile, matiereDessus, poserBloc, rehausser,
  peindreBloc, reprendreBloc, sensBloc, solAt, basculerPortail, tournerBloc,
} from './blocs.js';
import { AUCUN, tapisserMurs, tapisserPiece } from './papiers.js';
import { deplacerEtage, dessusEtage, etageBlocs, etageCouvertes, peindreEtage, poserEtage, poserSolEtage, reprendreEtage, reprendreSolEtage, sensEtage, solsEtage, tournerEtage } from './etage.js';
import { harvest, hoe, plant, water } from './crops.js';
import { harvestAll, plantAll, setSemis, upgradeRobotBattery, waterAll } from './automation.js';
import { remplirCruche } from './cruche.js';
import { buyPasture, feedAllHens, feedHen, setCowHerbs, shear, upgradePoulailler } from './animals.js';
import { pickUp } from './ramassage.js';
import { recolterBac, semerBac } from './bacs.js';
import { cueillirMassif } from './massifs.js';
import { remplirTonnelet } from './tonnelets.js';
import { mettreALEtal, reprendreDeLEtal } from './bourse.js';
import { engraisser, jeterAuCompost } from './compost.js';
import { buildStation, cancelMilling, cancelQueued, startMilling, startRecipe, stopCurrent } from './kitchen.js';
import { buildFridge, moveAllToFridge, moveExpiringToFridge, moveFromFridge, moveToFridge, upgradeFridge } from './fridge.js';
import { deposerBoite, reprendreBoite } from './repas.js';
import { eatSnack } from './family.js';
import { castLine, chopTree, mineRock, ramasserCaillou, ramasserMorceau, scytheAround, scytheGrass } from './outils.js';
import { sortirBotte, verserFibres } from './botteleuse.js';
import { verserChaine } from './chaines.js';
import { verserGrain } from './distributeur.js';
import { craft, ramasser } from './atelier.js';
import { harvestTree } from './orchard.js';
import { buyTech } from './techtree.js';
import { planterIci } from './plantation.js';
import { goToSleep, nuitPartagee } from './night.js';
import { acheterAuPort, dechargerAuPort, vendreAuPort } from './port.js';
import { agrandirPort, apporterAuChantier, commanderImport, honorerCommande } from './bac.js';
import { chargerPortage, choisirVehicule, dechargerPortage } from './portage.js';
import { attribuer, donnerOutil, marquerAVendre, reprendreOutil } from './taches.js';
import { accueillirEnfant, formerFoyer } from './liens.js';

const CHANGE = 'Ce qui était posé là a changé depuis.';

// Ce qui est sur la case `c` au sol : le bloc du dessus, le bloc, le sol (ce que reprend un appui).
export function surCase(state, c) {
  return blocDessus(state, c) || blocAt(state, c) || solAt(state, c) || null;
}
// La case d'ancrage du meuble qui couvre `c` (sinon `c`).
function ancreDe(state, c) {
  if (blocAt(state, c)) return c;
  const couvertes = casesCouvertes(state);
  return couvertes.has(c) ? couvertes.get(c) : c;
}

const cmd = (type, args) => ({ type, args });

// Les arguments : chaque commande dit ce qu'elle attend (« case » : une case, « sorte » : un bloc de
// l'Atelier, « sens » : 0 à 3, « niveau » : 1 ou 2, « texte » : un texte quelconque) ; un « ? » le rend
// facultatif.
const CONTROLES = {
  case: (v) => Number.isInteger(v) && v >= 0,
  sorte: (v) => typeof v === 'string' && !!DATA.ATELIER.BLOCS[v],
  sens: (v) => Number.isInteger(v) && v >= 0 && v <= 3,
  variante: (v) => typeof v === 'string' && /^[a-z_]{1,30}$/.test(v),
  niveau: (v) => v === 1 || v === 2,
  texte: (v) => typeof v === 'string' && v.length > 0,
  culture: (v) => typeof v === 'string' && !!DATA.CULTURES[v],
  lieu: (v) => v === 'potager' || v === 'serre',
  drapeau: (v) => v === true || v === false,
  objet: (v) => typeof v === 'string' && !!DATA.OBJETS[v],
  recette: (v) => typeof v === 'string' && !!DATA.RECETTES[v],
  coord: (v) => typeof v === 'string' && /^\d{1,6},\d{1,6}$/.test(v),
  coords: (v) => Array.isArray(v) && v.length > 0 && v.length <= 60 && v.every((x) => typeof x === 'string' && /^\d{1,6},\d{1,6}$/.test(x)),
  eau: (v) => typeof v === 'string' && /^[a-z]{1,20}$/.test(v),
  noeud: (v) => typeof v === 'string' && !!DATA.ARBRE.noeuds[v],
  recetteAtelier: (v) => typeof v === 'string' && !!DATA.ATELIER.RECETTES[v],
  station: (v) => typeof v === 'string' && !!DATA.STATIONS[v],
  appareil: (v) => typeof v === 'string' && /^[A-Za-z0-9_:-]{1,40}$/.test(v),
  mode: (v) => typeof v === 'string' && /^[a-z_]{1,20}$/.test(v),
  fleur: (v) => typeof v === 'string' && !!(DATA.BACS && DATA.BACS.FLEURS[v]),
  quantite: (v) => typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= 1e6,   // (0 : le moteur dit pourquoi)
  // (I3c : une tâche des villageois, ou « aucune » ; un outil de travail, ou « reprendre » ; des objets à vendre)
  tache: (v) => typeof v === 'string' && (v === 'aucune' || !!((DATA.TACHES && DATA.TACHES.LISTE) || {})[v]),
  outil: (v) => v === 'reprendre' || v === 'hache' || v === 'pioche' || v === 'faux' || v === 'canne',
  objets: (v) => Array.isArray(v) && v.length <= 40 && v.every((x) => typeof x === 'string' && !!DATA.OBJETS[x]),
  // les papiers peints (js/engine/papiers.js) : un motif, ou « aucun » ; le niveau 0 (en bas) ou 1 (l'étage) ;
  // des murs et leur motif (l'annulation : { [case du mur]: motif | aucun }, 400 au plus)
  motif: (v) => v === AUCUN || (typeof v === 'string' && !!(DATA.PAPIERS_PEINTS || {})[v]),
  niveauPapier: (v) => v === 0 || v === 1,
  murs: (v) => !!v && typeof v === 'object' && !Array.isArray(v) && Object.keys(v).length > 0 && Object.keys(v).length <= 400
    && Object.entries(v).every(([k, m]) => /^\d{1,7}$/.test(k) && (m === AUCUN || (typeof m === 'string' && !!(DATA.PAPIERS_PEINTS || {})[m]))),
};

export const COMMANDES = {
  'bloc.poser': {
    args: { sorte: 'sorte', case: 'case', sens: 'sens?', variante: 'variante?' },
    executer(state, { sorte, case: c, sens = 0, variante = null }) {
      const b = DATA.ATELIER.BLOCS[sorte];
      const avant = surCase(state, c), sous = blocAt(state, c);
      // (la pompe sur un puits libre : posée dessus, le puits reste ; un bloc de silo sur le silo : la
      // colonne monte, rien à défaire)
      const surLibre = !!b.sur && sous === b.sur && !blocDessus(state, c);
      const empile = !!sous && sous === sorte && !!b.silo;
      const r = poserBloc(state, sorte, c, sens, variante);
      if (!r.ok) return r;
      const inverses = empile ? []
        : avant && avant !== sorte && !surLibre ? [cmd('bloc.remettre', { case: c, avant, apres: sorte })]
          : [cmd('bloc.reprendre', { case: c, attendu: sorte })];
      return { ...r, inverses };
    },
  },
  'bloc.reprendre': {
    args: { case: 'case', attendu: 'sorte?' },
    executer(state, { case: c, attendu }) {
      const avant = surCase(state, c);
      if (attendu && avant !== attendu) return fail(CHANGE);
      const sensAvant = sensBloc(state, ancreDe(state, c));
      const r = reprendreBloc(state, c);
      if (!r.ok) return r;
      const sorte = r.sorte || avant;
      return { ...r, inverses: [cmd('bloc.poser', { sorte, case: r.case !== undefined ? r.case : c, sens: r.sens || sensAvant || 0, ...(r.variante ? { variante: r.variante } : {}) })] };
    },
  },
  'bloc.remettre': {
    args: { case: 'case', avant: 'sorte', apres: 'sorte' },
    executer(state, { case: c, avant, apres }) {
      if (surCase(state, c) !== apres) return fail(CHANGE);
      const r = reprendreBloc(state, c);
      if (!r.ok) return r;
      // (une fenêtre percée rend son mur d'elle-même ; sinon l'ancien bloc est reposé)
      if (surCase(state, c) !== avant) {
        const p = poserBloc(state, avant, c);
        if (!p.ok) { poserBloc(state, apres, c); return p; }
      }
      return { ok: true, sorte: avant, case: c, inverses: [cmd('bloc.poser', { sorte: apres, case: c })] };
    },
  },
  'bloc.deplacer': {
    args: { de: 'case', vers: 'case', attendu: 'sorte?' },
    executer(state, { de, vers, attendu }) {
      if (attendu && surCase(state, de) !== attendu) return fail(CHANGE);
      if (de === vers) return fail('Il est déjà là.');
      const r = deplacerBloc(state, de, vers);
      if (!r.ok) return r;
      return { ...r, inverses: [cmd('bloc.deplacer', { de: vers, vers: r.de, attendu: r.sorte })] };
    },
  },
  // (le portail : un appui l'ouvre ou le ferme ; l'inverse le rebascule)
  'portail.basculer': {
    args: { case: 'case' },
    executer(state, { case: c }) {
      const r = basculerPortail(state, c);
      if (!r.ok) return r;
      return { ...r, inverses: [cmd('portail.basculer', { case: c })] };
    },
  },
  'bloc.tourner': {
    args: { case: 'case' },
    executer(state, { case: c }) {
      const sensAvant = sensBloc(state, ancreDe(state, c));
      const r = tournerBloc(state, c);
      if (!r.ok) return r;
      return { ...r, inverses: [cmd('bloc.orienter', { case: r.case, sorte: r.sorte, sens: sensAvant })] };
    },
  },
  // (tournerBloc saute un sens où le meuble ne tient pas : au plus trois quarts de tour)
  'bloc.orienter': {
    args: { case: 'case', sorte: 'sorte', sens: 'sens' },
    executer(state, { case: c, sorte, sens }) {
      if (blocAt(state, c) !== sorte) return fail(CHANGE);
      const avant = sensBloc(state, c);
      for (let k = 0; k < 3 && sensBloc(state, c) !== sens; k++) if (!tournerBloc(state, c).ok) break;
      if (sensBloc(state, c) !== sens) return fail(`${DATA.ATELIER.BLOCS[sorte].nom} : pas la place de le tourner ici.`);
      return { ok: true, sorte, case: c, sens, inverses: [cmd('bloc.orienter', { case: c, sorte, sens: avant })] };
    },
  },
  'bloc.peindre': {
    args: { case: 'case', variante: 'variante' },
    executer(state, { case: c, variante }) {
      const r = peindreBloc(state, c, variante);
      if (!r.ok) return r;
      return { ...r, inverses: [cmd('bloc.peindre', { case: r.case, variante: r.avant })] };
    },
  },
  // les papiers peints : poser un motif (ou « aucun ») sur les murs d'une pièce close ; l'annulation remet ceux d'avant
  'piece.tapisser': {
    args: { case: 'case', motif: 'motif', niveau: 'niveauPapier' },
    executer(state, { case: c, motif, niveau }) {
      const r = tapisserPiece(state, c, motif, niveau);
      if (!r.ok) return r;
      return { ...r, inverses: [cmd('murs.tapisser', { murs: r.avant, niveau })] };
    },
  },
  'murs.tapisser': {
    args: { murs: 'murs', niveau: 'niveauPapier' },
    executer(state, { murs, niveau }) {
      const r = tapisserMurs(state, murs, niveau);
      if (!r.ok) return r;
      return { ...r, inverses: [cmd('murs.tapisser', { murs: r.avant, niveau })] };
    },
  },
  'mur.rehausser': {
    args: { sorte: 'sorte', case: 'case' },
    executer(state, { sorte, case: c }) {
      const r = rehausser(state, sorte, c);
      if (!r.ok) return r;
      return { ...r, inverses: [cmd('mur.abaisser', { case: c, attendu: r.sorte || sorte })] };
    },
  },
  'mur.abaisser': {
    args: { case: 'case', niveau: 'niveau?', attendu: 'sorte?' },
    executer(state, { case: c, niveau, attendu }) {
      if (niveau && hauteurPile(state, c) !== niveau + 1) return fail(`Niveau ${niveau} : la gomme reprend le bloc du dessus des murs hauts de ${niveau + 1} blocs.`);
      if (attendu && !(hauteurPile(state, c) > 1 && matiereDessus(state, c) === attendu)) return fail(CHANGE);
      const r = reprendreBloc(state, c);
      if (!r.ok) return r;
      return { ...r, inverses: [cmd('mur.rehausser', { sorte: r.sorte, case: c })] };
    },
  },
  'etage.poser': {
    args: { sorte: 'sorte', case: 'case', sens: 'sens?', variante: 'variante?' },
    executer(state, { sorte, case: c, sens, variante }) {
      const avant = etageBlocs(state)[c];
      const r = poserEtage(state, sorte, c, sens || 0, variante || null);
      if (!r.ok) return r;
      // (un tableau accroché sur un mur : seulement lui à reprendre)
      if (r.dessus) return { ...r, inverses: [cmd('etage.reprendre', { case: c, attendu: sorte })] };
      return { ...r, inverses: [avant && avant !== sorte ? cmd('etage.remettre', { case: c, avant, apres: sorte }) : cmd('etage.reprendre', { case: c, attendu: sorte })] };
    },
  },
  'etage.reprendre': {
    args: { case: 'case', attendu: 'sorte?' },
    executer(state, { case: c, attendu }) {
      // (ce que reprend un appui : le tableau accroché, sinon le bloc)
      const avant = dessusEtage(state)[c] || etageBlocs(state)[c];
      if (attendu && avant !== attendu) return fail(CHANGE);
      const r = reprendreEtage(state, c);
      if (!r.ok) return r;
      // (un meuble repris sur l'une de ses cases : reposé sur sa case d'ancrage, dans son sens)
      return { ...r, inverses: [cmd('etage.poser', { sorte: r.sorte || avant, case: r.case !== undefined ? r.case : c, ...(r.sens ? { sens: r.sens } : {}), ...(r.variante ? { variante: r.variante } : {}) })] };
    },
  },
  'etage.remettre': {
    args: { case: 'case', avant: 'sorte', apres: 'sorte' },
    executer(state, { case: c, avant, apres }) {
      if (etageBlocs(state)[c] !== apres) return fail(CHANGE);
      const r = reprendreEtage(state, c);
      if (!r.ok) return r;
      if (etageBlocs(state)[c] !== avant) {
        const p = poserEtage(state, avant, c);
        if (!p.ok) { poserEtage(state, apres, c); return p; }
      }
      return { ok: true, sorte: avant, case: c, etage: true, inverses: [cmd('etage.poser', { sorte: apres, case: c })] };
    },
  },
  'etage.deplacer': {
    args: { de: 'case', vers: 'case', attendu: 'sorte?' },
    executer(state, { de, vers, attendu }) {
      const ancre = !etageBlocs(state)[de] && etageCouvertes(state).has(de) ? etageCouvertes(state).get(de) : de;
      if (attendu && etageBlocs(state)[ancre] !== attendu) return fail(CHANGE);
      if (ancre === vers) return fail('Il est déjà là.');
      const r = deplacerEtage(state, de, vers);
      if (!r.ok) return r;
      return { ...r, inverses: [cmd('etage.deplacer', { de: vers, vers: r.de, attendu: r.sorte })] };
    },
  },
  'etage.tourner': {
    args: { case: 'case' },
    executer(state, { case: c }) {
      const ancre = !etageBlocs(state)[c] && etageCouvertes(state).has(c) ? etageCouvertes(state).get(c) : c;
      const sensAvant = sensEtage(state, ancre);
      const r = tournerEtage(state, c);
      if (!r.ok) return r;
      return { ...r, inverses: [cmd('etage.orienter', { case: r.case, sorte: r.sorte, sens: sensAvant })] };
    },
  },
  // (tournerEtage saute un sens où le meuble ne tient pas : au plus trois quarts de tour)
  'etage.orienter': {
    args: { case: 'case', sorte: 'sorte', sens: 'sens' },
    executer(state, { case: c, sorte, sens }) {
      if (etageBlocs(state)[c] !== sorte) return fail(CHANGE);
      const avant = sensEtage(state, c);
      for (let k = 0; k < 3 && sensEtage(state, c) !== sens; k++) if (!tournerEtage(state, c).ok) break;
      if (sensEtage(state, c) !== sens) return fail(`${DATA.ATELIER.BLOCS[sorte].nom} : pas la place de le tourner ici.`);
      return { ok: true, sorte, case: c, sens, etage: true, inverses: [cmd('etage.orienter', { case: c, sorte, sens: avant })] };
    },
  },
  'etage.peindre': {
    args: { case: 'case', variante: 'variante' },
    executer(state, { case: c, variante }) {
      const r = peindreEtage(state, c, variante);
      if (!r.ok) return r;
      return { ...r, inverses: [cmd('etage.peindre', { case: r.case, variante: r.avant })] };
    },
  },
  'solEtage.poser': {
    args: { sorte: 'sorte', case: 'case', niveau: 'niveau' },
    executer(state, { sorte, case: c, niveau }) {
      const avant = solsEtage(state, niveau)[c];
      const r = poserSolEtage(state, sorte, c, niveau);
      if (!r.ok) return r;
      return { ...r, inverses: [avant && avant !== sorte ? cmd('solEtage.remettre', { case: c, niveau, avant, apres: sorte }) : cmd('solEtage.reprendre', { case: c, niveau, attendu: sorte })] };
    },
  },
  'solEtage.reprendre': {
    args: { case: 'case', niveau: 'niveau', attendu: 'sorte?' },
    executer(state, { case: c, niveau, attendu }) {
      const avant = solsEtage(state, niveau)[c];
      if (attendu && avant !== attendu) return fail(CHANGE);
      const r = reprendreSolEtage(state, c, niveau);
      if (!r.ok) return r;
      return { ...r, inverses: [cmd('solEtage.poser', { sorte: r.sorte || avant, case: c, niveau })] };
    },
  },
  'solEtage.remettre': {
    args: { case: 'case', niveau: 'niveau', avant: 'sorte', apres: 'sorte' },
    executer(state, { case: c, niveau, avant, apres }) {
      if (solsEtage(state, niveau)[c] !== apres) return fail(CHANGE);
      // (un sol posé sur un autre prend sa place : l'ancien, reposé, reprend la sienne)
      const r = poserSolEtage(state, avant, c, niveau);
      if (!r.ok) return r;
      return { ok: true, sorte: avant, case: c, sol: true, inverses: [cmd('solEtage.poser', { sorte: apres, case: c, niveau })] };
    },
  },
  'potager.planter': {
    args: { parcelle: 'texte', culture: 'culture' },
    executer: (state, { parcelle, culture }) => plant(state, parcelle, culture),
  },
  'potager.arroser': {
    args: { parcelle: 'texte' },
    executer: (state, { parcelle }) => water(state, parcelle),
  },
  'potager.recolter': {
    args: { parcelle: 'texte', direct: 'drapeau?' },
    executer: (state, { parcelle, direct = false }) => harvest(state, parcelle, false, direct),
  },
  'potager.labourer': {
    args: { case: 'case' },
    executer: (state, { case: c }) => hoe(state, c),
  },
  'potager.toutPlanter': {
    args: { lieu: 'lieu', culture: 'culture' },
    executer: (state, { lieu, culture }) => plantAll(state, lieu, culture),
  },
  'potager.toutArroser': {
    args: { lieu: 'lieu' },
    executer: (state, { lieu }) => waterAll(state, lieu),
  },
  'potager.toutRecolter': {
    args: { lieu: 'lieu', direct: 'drapeau?' },
    executer: (state, { lieu, direct = false }) => harvestAll(state, lieu, direct),
  },
  'bac.semer': { args: { case: 'case', fleur: 'fleur' }, executer: (state, { case: c, fleur }) => semerBac(state, c, fleur) },
  'bac.recolter': { args: { case: 'case' }, executer: (state, { case: c }) => recolterBac(state, c) },
  'massif.cueillir': { args: { case: 'case' }, executer: (state, { case: c }) => cueillirMassif(state, c) },
  'compost.jeter': { args: { case: 'case', objet: 'objet', quantite: 'quantite' }, executer: (state, { case: c, objet, quantite }) => jeterAuCompost(state, c, objet, quantite) },
  'potager.engrais': { args: { parcelle: 'texte' }, executer: (state, { parcelle }) => engraisser(state, parcelle) },
  'tonnelet.remplir': { args: { case: 'case', objet: 'objet' }, executer: (state, { case: c, objet }) => remplirTonnelet(state, c, objet) },
  'cruche.remplir': {
    args: { case: 'case' },
    executer: (state, { case: c }) => remplirCruche(state, c),
  },
  'poules.nourrir': { args: {}, executer: (state) => feedHen(state) },
  'poules.toutNourrir': { args: {}, executer: (state) => feedAllHens(state) },
  'poulailler.agrandir': { args: {}, executer: (state) => upgradePoulailler(state) },
  'etable.tondre': {
    args: { mouton: 'texte' },
    executer: (state, { mouton }) => shear(state, mouton),
  },
  'etable.herbes': {
    args: { oui: 'drapeau' },
    executer: (state, { oui }) => setCowHerbs(state, oui),
  },
  'etable.place': { args: {}, executer: (state) => buyPasture(state) },
  'ramassage.prendre': {
    args: { tas: 'texte' },
    executer: (state, { tas }) => pickUp(state, tas),
  },
  'cuisine.lancer': { args: { recette: 'recette' }, executer: (state, { recette }) => startRecipe(state, recette) },
  'cuisine.annuler': {
    args: { station: 'texte', rang: 'case' },
    executer: (state, { station, rang }) => (DATA.STATIONS[station] ? cancelQueued(state, station, rang) : fail('Atelier inconnu.')),
  },
  'cuisine.arreter': {
    args: { station: 'texte' },
    executer: (state, { station }) => (DATA.STATIONS[station] ? stopCurrent(state, station) : fail('Atelier inconnu.')),
  },
  'moulin.moudre': { args: { quantite: 'quantite' }, executer: (state, { quantite }) => startMilling(state, Math.max(1, Math.floor(quantite))) },
  'moulin.annuler': { args: {}, executer: (state) => cancelMilling(state) },
  'frigo.ranger': { args: { objet: 'objet', quantite: 'quantite' }, executer: (state, { objet, quantite }) => moveToFridge(state, objet, quantite) },
  'frigo.sortir': { args: { objet: 'objet', quantite: 'quantite' }, executer: (state, { objet, quantite }) => moveFromFridge(state, objet, quantite) },
  'frigo.toutRanger': { args: {}, executer: (state) => moveAllToFridge(state) },
  'frigo.urgent': { args: {}, executer: (state) => moveExpiringToFridge(state) },
  'frigo.acheter': { args: {}, executer: (state) => buildFridge(state) },
  'frigo.agrandir': { args: {}, executer: (state) => upgradeFridge(state) },
  'boite.deposer': { args: { objet: 'objet', quantite: 'quantite' }, executer: (state, { objet, quantite }) => deposerBoite(state, objet, quantite) },
  'boite.reprendre': { args: { objet: 'objet', quantite: 'quantite' }, executer: (state, { objet, quantite }) => reprendreBoite(state, objet, quantite) },
  'manger': {
    args: { objet: 'objet?', sac: 'drapeau?' },
    executer: (state, { objet = null, sac = false }) => eatSnack(state, objet, { duSac: sac }),
  },
  'outil.couper': { args: { arbre: 'coord', fort: 'drapeau?' }, executer: (state, { arbre, fort = false }) => chopTree(state, arbre, null, fort) },
  'outil.casser': { args: { rocher: 'coord', fort: 'drapeau?' }, executer: (state, { rocher, fort = false }) => mineRock(state, rocher, null, fort) },
  'outil.caillou': { args: { rocher: 'coord' }, executer: (state, { rocher }) => ramasserCaillou(state, rocher) },
  'outil.faucher': { args: { touffe: 'coord' }, executer: (state, { touffe }) => scytheGrass(state, touffe, null) },
  'outil.faucherAutour': { args: { touffes: 'coords' }, executer: (state, { touffes }) => scytheAround(state, touffes, null) },
  'outil.pecher': { args: { eau: 'eau', coin: 'texte?' }, executer: (state, { eau, coin = null }) => castLine(state, eau, coin) },
  'verger.cueillir': { args: { arbre: 'texte' }, executer: (state, { arbre }) => harvestTree(state, arbre) },
  'tech.acheter': { args: { noeud: 'noeud' }, executer: (state, { noeud }) => buyTech(state, noeud) },
  'atelier.fabriquer': { args: { recette: 'recetteAtelier' }, executer: (state, { recette }) => craft(state, recette) },
  'atelier.construire': { args: { station: 'station' }, executer: (state, { station }) => buildStation(state, station) },
  'appareil.basculer': { args: { appareil: 'appareil' }, executer: (state, { appareil }) => toggleDevice(state, appareil) },
  'appareil.ameliorer': { args: { appareil: 'appareil' }, executer: (state, { appareil }) => upgradeDevice(state, appareil) },
  'appareil.entretenir': { args: { appareil: 'appareil' }, executer: (state, { appareil }) => maintainDevice(state, appareil) },
  'appareil.reparer': { args: { appareil: 'appareil' }, executer: (state, { appareil }) => repairDevice(state, appareil) },
  'reservoir.agrandir': { args: {}, executer: (state) => upgradeTank(state) },
  'robot.batterie': { args: {}, executer: (state) => upgradeRobotBattery(state) },
  'arbre.planter': { args: { sorte: 'sorte', case: 'case' }, executer: (state, { sorte, case: c }) => planterIci(state, sorte, c) },
  'potager.semis': {
    args: { parcelle: 'texte', mode: 'mode', culture: 'culture?' },
    executer: (state, { parcelle, mode, culture = null }) => setSemis(state, parcelle, mode, culture),
  },
  'botteleuse.verser': { args: { case: 'case' }, executer: (state, { case: c }) => verserFibres(state, c) },
  'botteleuse.sortir': { args: { case: 'case' }, executer: (state, { case: c }) => sortirBotte(state, c, null) },
  'chaine.verser': { args: { case: 'case' }, executer: (state, { case: c }) => verserChaine(state, c) },
  'distributeur.verser': { args: { case: 'case' }, executer: (state, { case: c }) => verserGrain(state, c) },
  'morceau.ramasser': { args: { n: 'case' }, executer: (state, { n }) => ramasserMorceau(state, n) },
  'cueillette.ramasser': { args: { cueillette: 'texte' }, executer: (state, { cueillette }) => ramasser(state, cueillette) },
  'nuit.dormir': {
    args: {},
    executer: (state) => goToSleep(state),
  },
  'nuit.partagee': {
    args: {},
    executer: (state) => nuitPartagee(state),
  },
  'port.vendre': {
    args: { objet: 'objet', quantite: 'quantite', case: 'case' },
    executer: (state, { objet, quantite, case: c }) => vendreAuPort(state, objet, Math.max(1, Math.floor(quantite)), c),
  },
  'port.acheter': {
    args: { objet: 'objet', quantite: 'quantite', case: 'case' },
    executer: (state, { objet, quantite, case: c }) => acheterAuPort(state, objet, Math.max(1, Math.floor(quantite)), c),
  },
  'port.honorer': {
    args: { commande: 'texte', case: 'case' },
    executer: (state, { commande, case: c }) => honorerCommande(state, commande, c),
  },
  'port.importer': {
    args: { article: 'texte', quantite: 'quantite', case: 'case' },
    executer: (state, { article, quantite, case: c }) => commanderImport(state, article, Math.max(1, Math.floor(quantite)), c),
  },
  'port.apporter': {
    args: { case: 'case' },
    executer: (state, { case: c }) => apporterAuChantier(state, c),
  },
  'port.agrandir': {
    args: { case: 'case' },
    executer: (state, { case: c }) => agrandirPort(state, c),
  },
  // (fiche I2, le portage : on charge et l'on reprend sur la ferme, on décharge sous la halle : tout se vend)
  'port.decharger': {
    args: { case: 'case' },
    executer: (state, { case: c }) => dechargerAuPort(state, c),
  },
  'portage.charger': {
    args: { objet: 'objet', quantite: 'quantite', case: 'case' },
    executer: (state, { objet, quantite, case: c }) => chargerPortage(state, objet, Math.max(1, Math.floor(quantite)), c),
  },
  'portage.reprendre': {
    args: { objet: 'objet?', case: 'case' },
    executer: (state, { objet = null, case: c }) => dechargerPortage(state, objet, Infinity, c),
  },
  'portage.vehicule': {
    args: { vehicule: 'texte', case: 'case' },
    executer: (state, { vehicule, case: c }) => choisirVehicule(state, vehicule, c),
  },
  'villageois.attribuer': {
    args: { id: 'texte', tache: 'tache' },
    executer: (state, { id, tache }) => attribuer(state, id, tache === 'aucune' ? null : tache),
  },
  'villageois.outil': {
    args: { id: 'texte', outil: 'outil' },
    executer: (state, { id, outil }) => (outil === 'reprendre' ? reprendreOutil(state, id) : donnerOutil(state, id, outil)),
  },
  'villageois.vendre': {
    args: { id: 'texte', objets: 'objets' },
    executer: (state, { id, objets }) => marquerAVendre(state, id, objets),
  },
  'villageois.foyer': {
    args: { a: 'texte', b: 'texte', maison: 'case?' },
    executer: (state, { a, b, maison = null }) => formerFoyer(state, a, b, maison),
  },
  'villageois.enfant': {
    args: { foyer: 'texte' },
    executer: (state, { foyer }) => accueillirEnfant(state, foyer),
  },
  'etal.mettre': {
    args: { objet: 'objet', quantite: 'quantite' },
    executer: (state, { objet, quantite }) => mettreALEtal(state, objet, quantite),
  },
  'etal.reprendre': {
    args: { objet: 'objet', quantite: 'quantite' },
    executer: (state, { objet, quantite }) => reprendreDeLEtal(state, objet, quantite),
  },
};

// La commande `c` est-elle bien formée ? null si oui, sinon la raison.
export function commandeInvalide(c) {
  if (!c || typeof c !== 'object' || Array.isArray(c)) return 'Commande illisible.';
  const def = COMMANDES[c.type];
  if (!def) return `Commande inconnue : ${String(c.type)}.`;
  const args = c.args;
  if (!args || typeof args !== 'object' || Array.isArray(args)) return `${c.type} : arguments illisibles.`;
  for (const k of Object.keys(args)) if (!(k in def.args)) return `${c.type} : argument inconnu « ${k} ».`;
  for (const [k, genre] of Object.entries(def.args)) {
    const facultatif = genre.endsWith('?'), g = facultatif ? genre.slice(0, -1) : genre;
    if (args[k] === undefined || args[k] === null) { if (facultatif) continue; return `${c.type} : il manque « ${k} ».`; }
    if (!CONTROLES[g](args[k])) return `${c.type} : « ${k} » invalide.`;
  }
  return null;
}

// Joue la commande sur la partie (voir l'en-tête). Une commande mal formée ne touche à rien.
export function executerCommande(state, c) {
  const err = commandeInvalide(c);
  const id = c && typeof c === 'object' ? c.id : undefined;
  if (err) return { ...fail(err), id };
  const args = Object.fromEntries(Object.entries(c.args).filter(([, v]) => v !== undefined && v !== null));
  const r = COMMANDES[c.type].executer(state, args);
  if (r.ok) objectifsARevoir(state);   // (piste 5 : les objectifs du chapitre revus au pas suivant)
  return r.ok ? { ...r, id, inverses: r.inverses || [] } : { ...r, id };
}

// Défait une opération : les inverses de ses commandes, notés dans l'ordre où elles ont été jouées,
// joués de la dernière à la première. Combien ont réussi.
export function defaire(state, inverses) {
  let n = 0;
  for (const c of [...inverses].reverse()) if (executerCommande(state, c).ok) n += 1;
  return n;
}

/* ---------- l'empreinte d'une partie (F0-4 : le rejeu, plus tard le contrôle client/serveur) ----------
   Deux exécutions de la même suite de commandes sur la même partie de départ doivent donner la même
   partie. L'empreinte le vérifie en peu de place : elle lit la partie sous sa forme JSON, les clés des
   objets triées (l'ordre dans lequel un objet a reçu ses clés ne compte pas), un objet vide compté
   comme absent (le moteur crée certains tableaux en passant, `hauteurs: {}`, et lit un tableau
   absent comme vide), et en fait 16 chiffres
   hexadécimaux (deux FNV-1a de 32 bits, de graines différentes). Deux parties égales ont la même
   empreinte ; deux parties différentes, presque sûrement deux empreintes différentes. */

// La valeur `v` (déjà passée par JSON) avec les clés de ses objets triées, à toute profondeur, sans
// les objets vides.
const objetVide = (v) => !!v && typeof v === 'object' && !Array.isArray(v) && !Object.keys(v).length;
function triee(v) {
  if (Array.isArray(v)) return v.map(triee);
  if (v && typeof v === 'object') {
    const o = {};
    for (const k of Object.keys(v).sort()) {
      const t = triee(v[k]);
      if (!objetVide(t)) o[k] = t;
    }
    return o;
  }
  return v;
}

export function empreintePartie(state) {
  const texte = JSON.stringify(triee(JSON.parse(JSON.stringify(state))));
  let a = 0x811c9dc5, b = 0x01000193 ^ 0x9e3779b9;
  for (let i = 0; i < texte.length; i++) {
    const c = texte.charCodeAt(i);
    a = Math.imul(a ^ c, 0x01000193);
    b = Math.imul(b ^ c, 0x01000193) ^ (b >>> 15);
  }
  return (a >>> 0).toString(16).padStart(8, '0') + (b >>> 0).toString(16).padStart(8, '0');
}
