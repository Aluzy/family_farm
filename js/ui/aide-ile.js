/* ==========================================================================
   L'aide de l'île à bâtir (fiche I7d, docs/ile.md « Le récit retiré de l'interface »).

   Les textes de l'aide pour une partie de l'île (villageActif) : des règles, pas d'histoire, dans le ton de l'aide
   d'avant (js/ui/aide.js, qui les montre). Ce module ne lit que le moteur et les données (aucun élément de la page) :
   tests/engine/village-textes.test.mjs les lit dans Node et vérifie qu'aucun ne cite un nom du récit, la calèche,
   son cocher ni les hameaux (VILLAGE.SANS_RECIT).
     ficheIle(state)          la fiche « L'île à bâtir » (À propos › Fiches d'aide, en tête) : le port, le bac, ses
                              commandes, l'import, le chemin et le portage, les villageois, leurs tâches, le tableau,
                              l'amitié, les liens, les traits, la part, l'étal, les vocations, les fêtes, les projets,
                              la chronique et les noms, les commerces ;
     mondeIle(lignes)         la fiche « Le grand monde » de l'île : celle d'avant, sans les hameaux, leurs habitants,
                              la visite, les invitations ni la calèche, ses lignes réécrites (MONDE_ILE) ;
     reglesIle(state)         les règles principales d'À propos qui changent sur l'île (le port, les paliers) ;
     sourceEquipementIle      ce que dit une pièce d'équipement qui ne se fabrique pas à l'Atelier.
   ========================================================================== */

import { DATA } from '../engine/catalog.js';
import { formatNumber } from '../engine/format.js';
import { unlockLevel } from '../engine/levels.js';
import { heuresPort } from '../engine/port.js';
import { chapterCount } from '../engine/campaign.js';

const n = (x) => formatNumber(x);
const nomObjet = (id) => ((DATA.OBJETS[id] && DATA.OBJETS[id].nom) || id).toLowerCase();
const prixNiveau = (k) => {
  const p = (DATA.PORT.NIVEAUX[k - 1] || {}).prix || {};
  return Object.entries(p).map(([o, q]) => (o === 'pieces' ? `${n(q)} pièces` : `${n(q)} ${nomObjet(o)}${q > 1 && !/s$/.test(nomObjet(o)) ? 's' : ''}`)).join(', ');
};
const OUTILS = { hache: 'une hache', pioche: 'une pioche', canne: 'une canne à pêche', faux: 'une faux', houe: 'une houe' };
const tachesNoms = () => Object.values(DATA.TACHES.LISTE).map((t) => `${t.icone} ${t.nom.charAt(0).toLowerCase()}${t.nom.slice(1)}${t.outil ? ` (${OUTILS[t.outil] || t.outil})` : ''}`).join(', ');
const traitsNoms = () => Object.values(DATA.TRAITS.LISTE).map((t) => `${t.icone} ${t.nom[1]}`).join(', ');
const paliersLiens = () => Object.keys(DATA.VILLAGE.LIENS.PALIERS).join(', ');

// La fiche « L'île à bâtir ».
export function ficheIle(state) {
  const P = DATA.PORT, B = P.BAC, V = DATA.VILLAGE, A = DATA.AMITIE, E = A.ECHELLE;
  const VOC = DATA.VOCATIONS.village;
  return {
    nom: 'L\'île à bâtir',
    icone: '🏝️',
    lignes: [
      ['L\'île', `Une île vierge, un abri sur la terre de ta ferme, un port au bout du chemin : tout le reste est à bâtir. ${chapterCount(state)} paliers (la fenêtre « L'île ») disent où tu en es : remplis leurs objectifs, chacun donne son XP, ses points de technologie et sa récompense. Il n'y a pas d'histoire écrite : la chronique note la tienne.`],
      ['Le port', `Le seul commerce de l'île, sur la côte. Au comptoir, sous la halle (dès le niveau ${unlockLevel('marche')}, ouvert ${heuresPort()}), tout se vend au prix de vente, sans limite : le bac emporte tout. On y achète aussi les semences débloquées ; elles vont droit à la ferme. La carte du monde le montre, la boussole y mène.`],
      ['Le chemin et le portage', `Ce qu'on vend, on le porte : ${n(V.PORTAGE.MAINS)} volumes à la main, ${n(V.PORTAGE.BROUETTE)} avec la brouette (Atelier), ${n(V.PORTAGE.CHARRETTE)} avec la charrette attelée au cheval (le bois et les planches comptent 2, la pierre, les minerais et les lingots 3). Charge sur la ferme (la fenêtre du port, onglet Porter), décharge sous la halle : tout se vend d'un coup. Le chemin est à toi : en mode Construire, pose-le, reprends-le, déplace-le, sur la ferme comme dehors (avec les pas japonais, les lanternes, les barrières, les bancs, le pont de planches pour une rivière) ; dessus, on va ${n(V.CHEMIN.VITESSE)} % plus vite.`],
      ['Le bac', `Il accoste tous les ${n(B.PERIODE)} jours, de ${n(B.HEURES[0])} h à ${n(B.HEURES[1])} h (le calendrier marque ses jours ⛴️) : il emporte les caisses de ce qui a été vendu, livre ce que tu as importé et amène les villageois, un par passage.`],
      ['Les commandes du bac', `À chaque passage, il demande quelques objets que tu sais produire, avec une prime : honore-les au comptoir avec ce que tu as porté (le prix de vente, la prime, ${n(P.COMMANDES.XP)} XP), jusqu'au passage suivant. Une commande manquée s'efface sans rien coûter.`],
      ['L\'import', 'Ce que l\'île ne donne pas se commande au port (onglet Import), un rang par niveau du port : les jeunes arbres et la vigne ; le cacao, la vanille, le café, le sucre et les épices ; les bêtes ; les plans des meubles de collection ; des fleurs rares. Payé d\'avance, livré au passage suivant du bac.'],
      ['Les plants sauvages', `Chaque pays de l'île a ses plantes : l'ail des ours dans les sous-bois, la salicorne sur le sable, au bord de la mer, loin de la ferme (${n(DATA.VILLAGE.SAUVAGES.LOIN)} cases au moins). Ramasse un plant, rapporte-le, repique-le dans la zone de culture : il pousse comme les autres et rend de nouveaux plants. Sa première récolte l'inscrit au catalogue d'import du port (au niveau ${n(DATA.PORT.IMPORT.SAUVAGES.RANG)}).`],
      ['Les niveaux du port', `Il grandit en ${n(P.NIVEAUX.length)} niveaux (onglet Le port) : apporte les matériaux au chantier, puis paie (le niveau 2 : ${prixNiveau(2)}). Chaque niveau allonge le quai, ouvre un rang de l'import, apporte plus de commandes et accueille plus de villageois.`],
      ['Les villageois', `Bâtis une maison libre (une pièce close, un lit que la famille ne prend pas, une boîte aux lettres posée dehors contre la porte) : au passage du bac, un villageois débarque et s'y installe (${n(V.ARRIVEE.BOURSE)} pièces en poche). Les suivants viennent s'il y a de quoi manger pour tous et si le port est assez grand. Chacun vit sa journée : lever, travail, repas, sorties, causeries, coucher. La nuit, il mange à la boîte commune et dort dans son lit ; mal nourri ou sans lit, il se repose le lendemain. Personne ne part.`],
      ['Les tâches', `C'est toi qui les donnes, sur la fiche d'un villageois : ${tachesNoms()}. Il la fait chaque jour à son poste, à ses heures ; ce qu'il produit va au coffre de la ferme. L'outil, tu le fabriques et tu le lui donnes : sans lui, ou sans rien à faire, la tâche attend et il le dit.`],
      ['Le tableau', 'Le bouton 📊 de la carte du joueur : pour chaque villageois, sa tâche, ce qu\'il a coûté (ses repas, sa part, ce que son travail a pris au coffre), ce qu\'il a produit et le solde, hier ou sur sept jours ; un appui sur un prénom, ses sept jours. Un repère pour décider qui fait quoi.'],
      ['La part', `Chaque nuit, un villageois garde ${n(V.PART)} % de la valeur de ce qu'il a produit : des objets de sa récolte, jamais des pièces de ta caisse. Il en mange s'il a faim ; le reste se vend pour lui au bac et remplit sa bourse.`],
      ['L\'étal', `Pose un étal (Atelier) dehors et mets-y jusqu'à ${n(V.BOURSE.ETAL.PLACES)} sortes d'objets : en fin d'après-midi, les villageois viennent y acheter ce qu'ils adorent, ce dont ils ont besoin (un vêtement, un meuble), ce qu'ils aiment. Leurs pièces sont pour toi, et ils sont plus heureux.`],
      ['L\'amitié', `Chaque villageois a sa jauge d'amitié avec toi (${E.NOMS.join(', ')}) : parle-lui (+${n(A.PAROLE)} par jour), offre-lui un cadeau par jour (ses goûts se découvrent en offrant : +${n(A.CADEAU.adore)} pour ce qu'il adore, ${n(A.CADEAU.deteste)} pour ce qu'il déteste). Elle ne baisse jamais en ton absence.`],
      ['Les liens', `Entre eux aussi, ils se lient (${paliersLiens()}) à force de se croiser : voisins, au même poste, à table, en sortie, à la fête. Deux amis sont plus heureux et travaillent mieux ensemble ; deux villageois proches forment un foyer si tu leur bâtis une maison, et un enfant peut y naître.`],
      ['Les traits', `Chacun a deux ou trois traits parmi douze (${traitsNoms()}) : ils pèsent sur ses horaires, ses phrases, ses postes préférés et ses affinités. On les découvre en le voyant vivre ou en l'écoutant ; sa fiche dit ceux qu'on connaît.`],
      ['Les commerces', `Un villageois qui a pratiqué ${n(DATA.ARTISANS.JOURS)} jours la tâche d'une filière a envie d'ouvrir son commerce (sa bulle, sa fiche, la chronique le disent). Il faut son amitié (« ${E.NOMS[DATA.ARTISANS.AMITIE]} » au moins) et un local que tu bâtis : une pièce close avec l'établi et le comptoir, l'enseigne dehors, près de la porte. Puis c'est toi qui décides (« Ouvrir », sur sa fiche). L'artisan achète sa matière à ton coffre avec sa bourse (les pièces sont pour toi), fait ${n(DATA.ARTISANS.LOTS)} lots par jour (un de plus avec l'ancienneté), vend au comptoir : à toi, aux villageois, et le surplus au bac. Tu peux lui commander une pièce, ou la faire à façon avec ta matière. La forge : des lingots, des clous, des charnières, des lames ; l'amitié lui apprend de nouvelles pièces.`],
      ['La scierie, la boulangerie, la fromagerie', `Trois autres commerces, de trois autres filières. La scierie (un villageois du bois) : des planches, et les ${n(Object.keys(DATA.MEUBLES).length)} meubles de la maison, que le menuisier fait sur commande (ils entrent dans ta maison) ou pour les maisons des villageois. La boulangerie (un villageois des champs) : le pain et les tartes au four à bois ; un villageois sans provisions vient y chercher son pain, qu'il mange à son repas. La fromagerie (un villageois des bêtes) : la faisselle, et la tomme, qui s'affine ${n(Math.max(...Object.values(DATA.VILLAGE.PRIX.ARTISANS).map((r) => r.cave || 0)))} nuits en cave. Un commerce ne te retire rien : tu peux toujours scier, cuire et cailler toi-même ; il fait mieux ou autre chose, en petite quantité. Le village tient d'autant plus de commerces qu'il a de villageois et que son port est grand (sa fiche dit ce qui manque).`],
      ['Les vocations', `L'île prend une vocation de ce que tu y bâtis (la fenêtre « L'île », onglet Vocations) : ${VOC.icone} ${VOC.nom.toLowerCase()} (les fêtes, les projets, les repas partagés, l'amitié entre villageois, une jolie place), ou une ferme productive. Chacune a ses paliers, jamais perdus, qui débloquent des plans et des projets.`],
      ['Les fêtes', 'Fixe une fête un jour à venir (une par mois de lune) : il faut une place (le panneau du village, un puits ou une table de jardin) et des plats cuisinés. De 17 h à 21 h, tous viennent sur la place. La veillée de pleine lune se tient d\'elle-même, dès deux villageois et une place.'],
      ['Les projets', 'Le lavoir, le kiosque, la fontaine, le four commun, la place, le jardin partagé : lance un projet, apporte ses matériaux, pose son chantier, envoie des villageois y travailler. Fini, il prend son dessin achevé.'],
      ['La chronique et les noms', `Le menu 📜 « Chronique » note de lui-même les moments qui comptent (une ligne datée) ; 📌 en épingle une, ✏️ y écrit ta note. Tu nommes ton île au départ, le village quand le ${n(V.NOMS.VILLAGE_A)}e villageois s'installe, les commerces et les maisons (« ✏️ Renommer », à tout moment ; ${n(DATA.DEPART.NOM_MIN)} à ${n(DATA.DEPART.NOM_MAX)} signes). Le panneau du village (Atelier) porte son nom.`],
    ],
  };
}

// La fiche « Le grand monde » de l'île : ses lignes d'avant, `lignes` ([titre, texte]), sans ce qui sort avec le
// récit et les hameaux, les autres réécrites ici.
const RETIREES = ['Les hameaux', 'Les habitants', 'L\'amitié', 'La visite de bienvenue', 'Inviter à un repas', 'Le port', 'La calèche', 'Les projets des hameaux'];
const MONDE_ILE = {
  'Chemins et gués': 'Ton chemin part de la porte de l\'abri et sort de la ferme à l\'est ; de là, un chemin mène au port. Ils sont à toi : pose-les, reprends-les, déplace-les (le mode Construire). On ne passe ni la mer, ni un lac, ni les falaises, ni les sommets ; une rivière se traverse à gué, là où un chemin la croise (des pierres plates sur l\'eau), ou sur un pont de planches.',
  'La carte du monde': 'Le menu « Carte du monde » (ou la touche M, ou un appui sur la boussole) montre tout ce que tu as vu : les biomes, tes chemins, ta ferme, le port et les coins de pêche découverts. Fais-la glisser, zoome, touche un lieu : son nom, sa distance, et « Y mener la boussole ».',
  'L\'Atelier': 'Seules les semences s\'achètent (au port) : les outils, les bêtes (un nid garni pour une poule, une pierre à sel et du foin pour un mouton ou une vache, un licol et des friandises pour le cheval), la ruche et le bac à fleurs se fabriquent à l\'Atelier, avec ce que tu récoltes à la ferme et dans le monde ; les meubles de la maison se commandent au menuisier, dès qu\'un villageois ouvre la scierie. Ce que l\'île ne donne pas se commande au port.',
};
export function mondeIle(lignes) {
  return lignes.filter(([t]) => !RETIREES.includes(t)).map(([t, texte]) => {
    if (MONDE_ILE[t]) return [t, MONDE_ILE[t]];
    if (t === 'Les styles d\'aménagement') return [t, texte.replace(/ Chaque habitant a son style préféré.*$/, '')];
    if (t === 'Les plans de collection') return [t, texte.replace(/ : la première fois que tu passes dans un pays.*?Le carnet de plans/, ' : explore le pays, hors de la ferme, pour y trouver ses plans ; d\'autres se commandent au port, et les paliers de l\'île en offrent. Le carnet de plans')];
    return [t, texte];
  });
}

// Les règles principales d'À propos qui changent sur l'île : { commerce, paliers }.
export function reglesIle(state) {
  return {
    commerce: `Le port, au bout du chemin : on y vend tout ce qui se vend, au prix de vente et sans limite, ce qu'on y a porté (à la main, à la brouette, à la charrette) ; on y achète les semences (le prix d'achat monte un peu à chaque achat) et, par le bac, tous les ${n(DATA.PORT.BAC.PERIODE)} jours, ce que l'île ne donne pas. Le bac amène aussi les villageois, qui travaillent pour la ferme et gardent une part de ce qu'ils produisent.`,
    paliers: `${chapterCount(state)} paliers disent comment l'île se bâtit : s'installer, vendre au port, accueillir, élever, faire travailler, ouvrir un commerce, un village de dix ; le dernier ouvre le jeu libre.`,
  };
}

// Ce que dit une pièce d'équipement qui ne se fabrique pas à l'Atelier (elle se cousait dans un hameau).
export const sourceEquipementIle = 'Elle viendra d\'un commerce de l\'île.';
