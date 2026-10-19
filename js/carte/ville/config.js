/* carte/ville/config.js — la ville et les cartes qu'on rejoint par elle : leurs réglages
 * (window.CarteVille).
 *
 * Les tables de js/ville-carte.js et des fichiers de js/carte/ville/ : les cartes, la
 * circulation, le bus de l'école, le train, le bus de ligne, les trouvailles, les animaux, les
 * grottes, la nature, la pêche, les voisins. Chacun de ces fichiers ajoute ses méthodes à la
 * scène par CarteVille.partie({ … }) ; js/ville-carte.js les pose sur le prototype de la scène.
 * `CarteVille.etat` : la carte affichée (son nom, ses paramètres, son fichier), fixée à chaque
 * démarrage (VilleCarte.start). Les réglages communs à toutes les cartes sont dans js/carte/.
 */
(function (global) {
  'use strict';

  const K = global.CarteKit;

  // La carte : ?carte=ville (par défaut) ou ?carte=transition (entre la ferme et la ville,
  // scripts/ville/transition.py) ; ?arrivee=<nom> : le point de la couche « arrivees » où l'on
  // apparaît (sinon « depart »).
  const CARTES = { ville: 'assets/ville.json', transition: 'assets/transition.json', montagne: 'assets/montagne.json', plage: 'assets/plage.json', grotte: null };
  // Les cartes où le jour et la nuit passent (CarteKit.voile) : la grotte a sa propre
  // obscurité.
  const JOUR_NUIT = ['ville', 'transition', 'montagne', 'plage'];
  // (fixée à chaque démarrage : VilleCarte.start(parent, '?carte=…&arrivee=…'))
  const etat = { params: new URLSearchParams(''), nom: 'ville', map: { key: 'carte_ville', file: CARTES.ville } };
  function configure(search) {
    etat.params = new URLSearchParams(search || '');
    etat.nom = Object.prototype.hasOwnProperty.call(CARTES, etat.params.get('carte')) ? etat.params.get('carte') : 'ville';
    etat.map = { key: 'carte_' + etat.nom, file: CARTES[etat.nom] };
  }
  // La page du jeu (js/ui/excursion.js) : l'heure, le personnage principal, le marché, les
  // entreprises, les outils, les messages, le passage d'une carte à l'autre.
  const hote = () => global.FermeHote || null;
  // Les réglages de jeu des cartes (data/ville.json : GROTTE, NAVETTE), que la page du jeu donne
  // (FermeHote.donnees) ; ici ne restent que les images, les arrêts, la lumière, l'affichage.
  function donnees(cle) {
    const H = hote(), d = H && H.donnees ? H.donnees(cle) : null;
    if (!d) throw new Error(`carte/ville/config.js : réglages ${cle} introuvables (data/ville.json, FermeHote.donnees)`);
    return d;
  }
  // Les passages vers une autre carte (couche « passages » : un rectangle au bord, sa cible, le
  // sens de sa flèche) : la flèche bleue (CarteKit.FLECHE) paraît quand la promeneuse est assez
  // près ; un toucher dessus mène à la cible.
  const PASS = { key: K.FLECHE.key, file: 'assets/' + K.FLECHE.file, near: K.FLECHE.near, sens: K.FLECHE.sens };
  // Le personnage principal de la partie (CarteKit.planchePerso : assets/personnages/perso_NN.png,
  // ses cases nommées dans assets/personnages/cases.json), comme sur la carte de la ferme ; sans
  // partie, la fermière. `bulle` : la pointe de la bulle « +1 » (CarteKit.bulleGain), en px de
  // carte au-dessus de ses pieds.
  const HERO = { key: 'heros', w: 16, h: 32, foot: 30, speed: K.VITESSES.ville, stride: 4, bulle: 26 };
  // Les couches qu'on ne traverse pas, et celle qui passe devant la promeneuse (le feuillage).
  // (les bâtiments et les voitures garées : par leur emprise au sol, couches « batiments » et « garees »)
  const OBSTACLES = ['fontaines', 'mobilier', 'falaise', 'mer'];
  // celles qu'on traverse quand même (le ponton de la plage, au-dessus de la mer)
  const PASSABLES = ['ponton'];
  // les couches des bâtiments, doublées d'un exemplaire « _devant » au-dessus des personnages
  const BATI = ['murs', 'pierre_de_taille', 'vitrages', 'charpente', 'toits', 'menuiserie'];
  const BATI_ALPHA = 0.45;
  const DEVANT = 'vegetation';
  const FEUILLAGE_ALPHA = 0.45;
  // Ce qui vole (l'aigle, une mouette en vol) : au-dessus de tout, sous le voile de la nuit.
  const VOL = 1.9e6;
  // La nuit (js/carte/ville/eclairage.js) : les réverbères s'allument à `allume` h et s'éteignent
  // à `eteint` h, chacun jusqu'à `decalage` h plus tard ; ils mettent `fondu` s à s'allumer et
  // clignotent `clignote` s. Leur flaque de lumière : `dy` px sous la lanterne, `rayon` px,
  // aplatie (`aplati`) ; la lanterne : `rayon` px ; leur halo (Point Light, au-dessus de la nuit).
  // Les phares : au bout de la voiture, `bout` px de son milieu au sol ([de profil, vers le bas
  // de l'écran, vers le haut] : de 3/4, son toit dépasse vers le haut), `haut` px au-dessus du sol, `ecart` px de
  // part et d'autre ; le cône : `portee` × `largeur` px ; les feux arrière, au bout opposé :
  // `rayon` px.
  // Les ombres portées qui suivent le soleil (js/carte/ville/ombres.js ; le soleil : CarteKit.SOLEIL) :
  // les couches de ce qui est debout (en plus des bâtiments, BATI) ; le canevas couvre la vue et
  // `marge` px autour ; une ombre porte à `portee` px au plus de son pied ; repeint tous les
  // `pas` h ; `base` : le pied d'une colonne de tuiles est à tant de px au-dessus de son bas ;
  // sans partie sur l'appareil (pas d'heure), le soleil de `sansHeure` h.
  const OMBRES = {
    couches: ['vegetation', 'mobilier', 'equipements', 'abri', 'reverberes_haut', 'reverberes_bas'],
    marge: 96, portee: 200, pas: 0.1, base: 2, sansHeure: 13,
  };
  const ECLAIRAGE = {
    reverbere: {
      allume: 19.5, eteint: 6.5, decalage: 0.4, fondu: 0.6, clignote: 0.7,
      sol: { dy: 30, rayon: 46, aplati: 0.6, teinte: 0xffc277, alpha: 0.85 },
      lanterne: { rayon: 10, teinte: 0xfff0c4, alpha: 1 },
      halo: { couleur: 0xffd890, rayon: 12, intensite: 0.22, attenuation: 0.08 },
    },
    phare: {
      bout: [29, 11, 24], haut: 3, ecart: 3, portee: 58, largeur: 34, teinte: 0xfff4d8, alpha: 0.95,
      feu: { rayon: 5, teinte: 0xff3a24, alpha: 0.85 },
    },
  };
  // La circulation : vitesses en px au sol par seconde, distances au sol.
  const CARS = {
    key: 'voitures', file: 'assets/ville_voitures.png', meta: 'assets/ville_voitures.json',
    max: 16, speed: 46, accel: 40, decel: 90,
    gap: 70,          // d'un centre à l'autre, derrière une voiture (une longueur et un peu plus)
    lane: 16,         // l'écart de côté au-delà duquel ce n'est plus la même file
    hero: 44,         // la distance où elles s'arrêtent devant la promeneuse
    corner: 28,       // le rayon des virages
    cross: 22,        // deux trajets se croisent dans un carrefour s'ils passent à moins de ça
    stop: 34,         // on attend un carrefour le centre à ça de son bord (le nez dehors)
    spawn: [900, 2600],
  };
  const KY = 0.7;
  // Le bus de l'école (assets/ville_bus.png et .json, scripts/ville/bus.py : huit directions)
  // et les enfants de la famille (leurs planches d'enfant, assets/personnages/enfant_NN.png),
  // les jours d'école (lundi, mardi, jeudi, vendredi : HorlogeSortie). Sur
  // chaque carte, le matin et le soir, une scène : l'heure où le bus est à l'arrêt (`horaire` :
  // son nom dans CarteKit.horaireEcole, compté à rebours depuis le début de l'école, ou à partir
  // de sa fin ; la scène commence le temps qu'il faut au bus et aux enfants pour y être), le
  // trajet du bus et son arrêt (couche « bus »), le chemin des enfants, et s'ils montent dans le
  // bus ou en descendent.
  const BUS = {
    key: 'bus', file: 'assets/ville_bus.png', meta: 'assets/ville_bus.json', half: 46, carHalf: 29,
    speed: 70,             // px au sol par seconde (plus vite que les voitures : la ville est grande)
    lead: 1400,            // il part au plus à cette distance de l'arrêt (déjà en route, en fondu)
    kid: { speed: K.VITESSES.enfantsBus, fade: 0.5, cases: 'assets/personnages/cases.json' },
    resume: 1.2,           // s : le temps que les enfants s'éloignent (ou montent) avant de repartir
    scenes: {
      transition: [
        { nom: 'matin', horaire: 'transitionMatin', bus: 'bus_matin', arret: 'arret', enfants: 'enfants_matin', monter: true },
        { nom: 'soir', horaire: 'transitionSoir', bus: 'bus_soir', arret: 'arret', enfants: 'enfants_soir', monter: false },
      ],
      ville: [
        { nom: 'matin', horaire: 'villeMatin', bus: 'bus_matin', arret: 'arret_matin', enfants: 'enfants_matin', monter: false },
        { nom: 'soir', horaire: 'villeSoir', bus: 'bus_soir', arret: 'arret_soir', enfants: 'enfants_soir', monter: true },
      ],
    },
  };
  // Le train (assets/ville_train.png et .json, scripts/ville/train.py : la cabine du nord, la
  // voiture, la cabine du sud) : vitesses en px par seconde (à l'écran, la voie est nord-sud).
  // Il paraît à `lead` px de son arrêt, en fondu ; on le quitte `leaveAfter` s après son départ.
  // gares : les départs de chaque carte (la carte d'arrivée, le sens où l'on roule).
  const TRAIN = {
    key: 'train', file: 'assets/ville_train.png', meta: 'assets/ville_train.json', w: 48, h: 112,
    speed: 190, accel: 60, decel: 80, lead: 720, board: 1.0, alight: 0.6, resume: 1.6, leaveAfter: 2.8,
    gares: {
      ville: [{ carte: 'montagne', label: '⛰️ La montagne', sens: 'nord' }, { carte: 'plage', label: '🏖️ La plage', sens: 'sud' }],
      montagne: [{ carte: 'ville', label: '🏙️ Retour en ville', sens: 'sud' }, { carte: 'plage', label: '🏖️ La plage', sens: 'sud' }],
      plage: [{ carte: 'ville', label: '🏙️ Retour en ville', sens: 'nord' }, { carte: 'montagne', label: '⛰️ La montagne', sens: 'nord' }],
    },
    terminus: { montagne: true, plage: true },
  };
  // Le bus de ligne, entre l'abri de la carte de transition et celui de la gare, en ville. On
  // touche l'abri (sur la transition, la couche « abri » ; en ville, l'image `abri.image`, vue de
  // profil, posée sur le trottoir : son milieu `x`, son pied `pied`), on attend à côté
  // (`attente`), le bus (le trajet `route`) s'arrête à `arret` (un point de la couche « bus »,
  // ou { x, y }), on monte, il part : on arrive à l'arrêt de l'autre carte (?bus=1), où l'on
  // descend à `attente`. Le bus paraît `lead` px avant l'arrêt. Les heures où il roule et les
  // temps de chaque geste : `jeu` (data/ville.json, NAVETTE : HORAIRES, DUREES).
  const NAVETTE = {
    arrets: {
      transition: {
        route: 'bus_matin', arret: 'arret', attente: { x: 984, y: 531 },
        cible: 'ville-carte.html?carte=ville&arrivee=gare&bus=1', choix: '🚉 La gare (en ville)', vers: 'jusqu\'à la gare, en ville',
      },
      ville: {
        abri: { image: 'assets/ville_abri_profil.png', x: 556, pied: 1556, ancre: 61, bloque: [[34, 94], [34, 95], [34, 96], [34, 97], [35, 95], [35, 96], [35, 97]] },
        route: 'avenue_ouest:nord>avenue_ouest:sud', arret: { x: 625, y: 1528 }, attente: { x: 556, y: 1574 }, lead: 360,
        cible: 'ville-carte.html?carte=transition&arrivee=ville&bus=1', choix: '🌾 La campagne (vers la ferme)', vers: 'jusqu\'à l\'arrêt de la campagne, sur le chemin de la ferme',
      },
    },
    get jeu() { return donnees('NAVETTE'); },
  };
  // Les trouvailles (assets/trouvailles.png, scripts/ville/faune.py) : `part` des endroits en
  // ont une chaque jour ; on la ramasse à `reach` px, elle va dans l'inventaire (FermeHote.
  // ramasser : l'objet du même nom, data/items.json). Ce qu'on a ramassé aujourd'hui (et le
  // carnet d'avant, versé une fois dans l'inventaire) : localStorage « ferme-trouvailles ».
  const FINDS = { key: 'trouvailles', file: 'assets/trouvailles.png', store: 'ferme-trouvailles', part: 0.6, reach: 24 };
  // Les animaux (assets/faune_<espèce>.png, assets/faune.json) : par zone, `n` animaux ; `speed`
  // en px/s, `peur` : la distance où la promeneuse les dérange.
  const FAUNE = {
    meta: 'assets/faune.json',
    cartes: { montagne: ['marmotte', 'bouquetin', 'aigle'], plage: ['mouette', 'crabe', 'dauphin'], ville: ['cygne', 'canard'] },
    especes: {
      marmotte: { size: 16, n: 2, speed: 18, peur: 52, texte: '🐾 Une marmotte : elle siffle pour prévenir les autres.' },
      bouquetin: { size: 32, n: 2, speed: 11, peur: 0, texte: '🐐 Un bouquetin : il grimpe les rochers les plus raides.' },
      aigle: { size: 32, n: 1, texte: '🦅 Un aigle royal tourne très haut dans le ciel.' },
      mouette: { size: 16, n: 3, speed: 16, peur: 44, texte: '🕊️ Une mouette : elle guette les restes du pique-nique.' },
      crabe: { size: 16, n: 2, speed: 20, peur: 40, texte: '🦀 Un crabe : il file de côté.' },
      dauphin: { size: 32, n: 1, texte: '🐬 Un dauphin saute au large !' },
      // les oiseaux du lac du parc (nage) : en groupes de `groupe` (le premier mène, les autres
      // le suivent) ; ils plongent la tête sous l'eau (`plonge` : la part de leurs arrêts)
      cygne: { size: 32, n: 2, groupe: 2, speed: 7, peur: 44, nage: true, plonge: 0.3, texte: '🦢 Un cygne glisse sur le lac, majestueux.' },
      canard: { size: 16, n: 7, groupe: 4, speed: 11, peur: 36, nage: true, plonge: 0.4, texte: '🦆 Un canard colvert : il plonge la tête sous l\'eau pour trouver à manger.' },
    },
  };
  // Les grottes (assets/grotte_tuiles.png, grotte_objets.png, grotte.json : scripts/ville/grotte.py) :
  // la lumière autour de la promeneuse (px : nette jusqu'à r0, noire à partir de r1), ce qu'on
  // a pioché (localStorage `store`). Les réglages de jeu : `jeu` (data/ville.json, GROTTE : la
  // taille d'un niveau en tuiles, le nombre de niveaux, la part de murs au départ et les passes
  // de l'automate, la chance qu'un mur au bord du sol porte du minerai, le poids de chaque
  // minerai, les coups de pioche et leur durée).
  const GROTTE = {
    tiles: 'assets/grotte_tuiles.png', objets: 'assets/grotte_objets.png', meta: 'assets/grotte.json',
    lumiere: { r0: 44, r1: 132, noir: 0.93 }, store: 'ferme-grottes',
    // un champignon lumineux se cueille à moins de `cueille` px (ville-carte.js, tapChampignon)
    cueille: 14,
    // Les lumières de la grotte (js/carte/ville/lueurs.js, WebGL) : l'ambiance presque noire ;
    // la lanterne (rayon : × lumiere.r1, `haut` px au-dessus des pieds) ; le jour qui tombe du
    // trou de l'échelle ; les champignons (intensité qui pulse de [0] à [1] en `periode` s, des
    // spores par seconde) et les améthystes (intensité [0] de loin, [1] tout près, à moins de
    // `portee` px ; une étincelle toutes les `eclat` s). `halo` : leur Point Light (rayon px).
    lueurs: {
      ambiance: 0x141018, haloDepth: -50,
      lanterne: { couleur: 0xffd9a8, intensite: 1.5, rayon: 1.15, haut: 12 },
      echelle: { couleur: 0xb8ccff, intensite: 0.8, rayon: 64 },
      champignon: { couleur: 0x4ff0d2, intensite: [0.5, 1.05], rayon: 40, periode: [2.4, 4], spores: 0.8, spore: 0xa8fff0,
        halo: { rayon: 10, intensite: 0.35, attenuation: 0.08 } },
      cristal: { couleur: 0xa86cff, intensite: [0.35, 1.25], rayon: 34, portee: 56, eclat: [1.5, 4], etincelle: 0xf0deff,
        halo: { rayon: 9, intensite: 0.3, attenuation: 0.08 } },
    },
    get jeu() { return donnees('GROTTE'); },
    // le poids de chaque minerai au niveau n (GROTTE.POIDS) : FIXE partout (le fer), sinon
    // max(0, (n − DEPUIS) × PENTE), de plus en plus bas ; { fer: 1, cuivre: …, or: …, platine: … }
    poids(n) {
      const out = {};
      for (const [sorte, p] of Object.entries(this.jeu.POIDS)) out[sorte] = 'FIXE' in p ? p.FIXE : Math.max(0, (n - p.DEPUIS) * p.PENTE);
      return out;
    },
  };
  // Comme à la ferme (couches « arbres », « rochers », « herbe_haute » de la carte) : les arbres
  // (assets/arbre_clair_sp.png, pin_clair_sp.png : images 0 droit, 1 penché à droite, 2 à gauche,
  // 4 px de marge ; `tronc` : les décalages, en px, des cases de leur pied qu'on ne traverse pas)
  // et les rochers (assets/transition_objets.png, cases de 32 px ; `half`, `h` : où on les touche).
  // Un toucher, l'outil en main : on y va, un coup (`swing` s, il porte à la 3e image du geste),
  // le moteur compte (FermeHote.couper / piocher). Au dernier coup, l'arbre bascule et le rocher
  // éclate ; l'herbe haute penche quand on la traverse, l'arbre s'éclaircit devant le personnage
  // (CarteKit.NATURE : les mêmes qu'à la ferme).
  const NATURE = {
    arbres: {
      arbre: { key: 'arbre_clair_sp', file: 'assets/arbre_clair_sp.png', w: 56, h: 64, tronc: [0], reach: 14 },
      pin: { key: 'pin_clair_sp', file: 'assets/pin_clair_sp.png', w: 72, h: 64, tronc: [-4, 4], reach: 19 },
    },
    // un rocher : sa planche (propriétés « planche », « largeur », « hauteur » de la couche
    // « rochers »), sa case (« image »), où on le touche (« demi » : la moitié de sa largeur,
    // « haut ») ; les cases sous son pied ne se traversent pas
    rochers: { key: 'rochers_carte' },
    swing: 0.5, shake: [1, 0, 2, 0, 1, 0], shakeFps: 9,
  };
  // La pêche (la canne en main, un toucher sur l'eau : la couche `couches` de la carte) : l'eau
  // de chaque carte pour le moteur du jeu (CANNE.PRISES : « lac », la montagne et son omble
  // chevalier ; « mer », la plage : dorade, sardine, anchois, depuis le ponton ou le rivage). On
  // va sur la rive, on lance (le bouchon se pose à `portee` px au plus), on attend la touche
  // (CarteKit.PECHE.attente, comme à la ferme), on ferre ; le moteur a décidé de la prise au lancer.
  const PECHE = {
    eaux: { montagne: 'lac', plage: 'mer' }, couches: { montagne: 'fontaines', plage: 'mer' }, portee: 52, lancer: 0.4, touche: 0.5, ferrer: 0.4,
  };
  // Les voisins (les maisons de la carte de transition) : la famille de chaque maison, tirée une
  // fois (deux parents, 1 à `enfantsMax` enfants, des personnages de assets/personnages/ autres
  // que ceux de la partie) et gardée sur l'appareil (localStorage `store`) ; chez elle, chacun
  // attend `wait` s (au hasard entre les deux) avant d'aller un peu plus loin.
  const VOISINS = {
    store: 'ferme-voisins', enfantsMax: 3, persos: 50, speed: K.VITESSES.voisins.adulte, kidSpeed: K.VITESSES.voisins.enfant, wait: [1.5, 5],
    noms: ['Martin', 'Bernard', 'Dubois', 'Moreau', 'Laurent', 'Girard', 'Roux', 'Fournier', 'Mercier', 'Blanc', 'Garnier', 'Chevalier'],
    prenoms: ['Camille', 'Claude', 'Dominique', 'Sacha', 'Alix', 'Morgan', 'Charlie', 'Maxime', 'Andréa', 'Yaël', 'Eden', 'Ange'],
    enfants: ['Lou', 'Noa', 'Maé', 'Louison', 'Swann', 'Élie', 'Gaby', 'Robin', 'Jo', 'Lilou', 'Nino', 'Tom'],
  };
  // La carte de transition (js/carte/ville/transition.js) : les maisons des voisins bâties avec
  // les blocs de la ferme générée (assets/blocs.png, scripts/carte/blocs.py : `murs` + masque
  // des murs voisins, `sols` + masque du plancher, la porte, la couverture, les meubles par la
  // lettre du plan des maisons, js/engine/transition.js) ; les ressources qu'on y ramasse
  // (assets/ramassables.png, comme à la ferme).
  const BLOCS = {
    key: 'blocs', file: 'assets/blocs.png', w: 16, h: 24, murs: 14, sols: 31, porte: 1, drap: 4,
    meubles: { f: 5, c: 6, p: 3, d: 3, g: 12, a: 2, b: 11, n: 9, m: 13 },
    // les murs des maisons, une case plus hauts (assets/murs_hauts.png,
    // scripts/carte/blocs.py murs_hauts : les 16 murs raccordés + masque, puis la porte) ; un mur
    // devant quelqu'un (il le cache) s'efface jusqu'à `alpha`, à `vitesse` par seconde
    hauts: { key: 'murs_hauts', file: 'assets/murs_hauts.png', w: 16, h: 40, murs: 0, porte: 16, alpha: 0.4, vitesse: 4 },
  };
  // Les immeubles d'habitation de la ville, bâtis en blocs (js/carte/ville/immeuble.js) : chacun
  // remplace le bâtiment `nom` de la carte (ses tuiles dans le rectangle `efface` [x, y, w, h] en
  // cases, et son emprise) ; posé en (x, y), de w × h cases, sur `niveaux` niveaux, chacun `dy` px
  // au-dessus du précédent. `plan` : la sorte de ses niveaux (V.planImmeuble : « double », deux
  // logements de part et d'autre du hall ; « simple », un logement, le hall et l'escalier sur le
  // côté) ; `facade` : la matière de ses murs du tour (une des `facades`) ; `logement` : le nom
  // de ses logements dans le moteur (« logement_1 »… : VOISINS.IMMEUBLE.LOGEMENTS, data/ville.json ;
  // `seul` : un seul logement, à ce nom) ; `enfants` : les enfants de chaque famille (0 : des
  // studios, pour un couple ; sans : un T2, un enfant). Les maisons de ville (`MAISONS`, plan
  // « maison ») : deux niveaux, une famille et ses `enfants`. Les lieux (`LIEUX` ; leur plan,
  // V.plansLieux : js/carte/ville/lieux.js) n'ont pas de logement ; leur `enseigne`
  // (assets/enseigne_<nom>.png) surmonte la porte. Maisons et lieux remplacent les bâtiments de
  // la carte nommés dans `retire` (« nom* » : ceux dont le nom commence par « nom ») ; leurs
  // tuiles : le rectangle `efface` de chacun.
  // Dans un immeuble, le niveau du dessous est à `transparent` ; à l'étage, un voile sombre
  // (`voile`, `alpha`) couvre la ville. Les murs du tour : `facades` (immeuble_ville*.png,
  // scripts/carte/blocs.py immeuble_ville : des étages de `dy` px comme ceux des immeubles de la
  // ville ; par sorte d'étage, `etages` images : le rez-de-chaussée, un étage, le dernier ; dans
  // chacune, les murs + masque, puis les murs à fenêtre à `fenetre` + masque ; les deux moitiés de
  // la porte double à `porte`) ;
  // `escalier`, `haut` : l'escalier et son haut dans blocs.png ; `porteVerticale` : la porte d'un
  // mur vertical. `meubles` : les grands meubles (assets/meuble_<nom>.png).
  // Les maisons de ville (docs/plan-ville.md) : par rangée, sa première colonne, ses tuiles
  // (de la ligne `haut` à la base), la ligne du haut de ses maisons ; puis chaque maison : sa
  // largeur, ses enfants (2 : un T3 ; 3 : un T4), sa brique.
  const RANGEES = [
    { x: 46, haut: 16, base: 33, y: 23, maisons: [[8, 2, 'rouge'], [9, 2, 'orange'], [8, 2, 'ocre'], [9, 2, 'bleu']] },
    { x: 46, haut: 35, base: 52, y: 42, maisons: [[8, 2, 'orange'], [9, 2, 'ocre'], [8, 2, 'bleu'], [9, 2, 'rouge']] },
    { x: 46, haut: 53, base: 70, y: 60, maisons: [[11, 3, 'ocre'], [12, 3, 'rouge'], [11, 3, 'orange']] },
    { x: 90, haut: 16, base: 33, y: 23, maisons: [[9, 2, 'bleu'], [9, 2, 'orange']] },
    { x: 90, haut: 35, base: 52, y: 42, maisons: [[9, 2, 'rouge'], [9, 3, 'ocre']] },
    { x: 90, haut: 53, base: 70, y: 60, maisons: [[9, 3, 'orange'], [9, 3, 'bleu']] },
  ];
  const MAISONS = [];
  for (const R of RANGEES) {
    let x = R.x;
    for (const [w, enfants, facade] of R.maisons) {
      const nom = 'maison_' + (MAISONS.length + 1);
      MAISONS.push({ nom, efface: [x, R.haut, w, R.base - R.haut], x, y: R.y, w, h: R.base - R.y, niveaux: 2, plan: 'maison', facade, logement: nom, seul: true, enfants });
      x += w;
    }
  }
  // Les lieux (docs/plan-ville.md) : le bâtiment qu'ils remplacent (dans `retire`), deux niveaux ;
  // leur plan et leur enseigne : leur nom (sinon `plan`, `enseigne` : les deux écoles).
  const LIEUX = [
    { nom: 'boulangerie', efface: [45, 85, 7, 17], x: 46, y: 94, w: 5, h: 9, facade: 'bleu' },
    { nom: 'pizzeria', efface: [146, 56, 11, 14], x: 146, y: 60, w: 11, h: 12, facade: 'rouge' },
    { nom: 'burger', efface: [157, 56, 11, 14], x: 157, y: 60, w: 11, h: 12, facade: 'orange' },
    { nom: 'poissonnerie', efface: [147, 81, 21, 21], x: 147, y: 90, w: 21, h: 14, facade: 'pierre' },
    { nom: 'informatique', efface: [156, 16, 12, 16], x: 156, y: 21, w: 12, h: 13, facade: 'bleu' },
    { nom: 'mairie', efface: [58, 110, 19, 14], x: 58, y: 117, w: 19, h: 9, facade: 'pierre' },
    { nom: 'musee', efface: [52, 78, 8, 24], x: 52, y: 91, w: 8, h: 12, facade: 'pierre' },
    { nom: 'cinema', efface: [120, 16, 16, 16], x: 120, y: 20, w: 16, h: 14, facade: 'rouge' },
    { nom: 'ecole_2', plan: 'ecole', enseigne: 'ecole', efface: [120, 36, 16, 16], x: 120, y: 41, w: 16, h: 13, facade: 'orange' },
    { nom: 'ecole_3', plan: 'ecole', enseigne: 'ecole', efface: [120, 55, 16, 15], x: 120, y: 60, w: 16, h: 12, facade: 'orange' },
    { nom: 'negoce', efface: [23, 58, 11, 18], x: 23, y: 64, w: 11, h: 14, facade: 'rouge' },
    { nom: 'electronique', efface: [1, 17, 11, 13], x: 1, y: 22, w: 11, h: 10, facade: 'rouge' },
    { nom: 'materiaux', efface: [19, 19, 15, 13], x: 20, y: 24, w: 13, h: 10, facade: 'bleu' },
    { nom: 'textile', efface: [0, 179, 13, 13], x: 1, y: 184, w: 11, h: 10, facade: 'rouge' },
    { nom: 'minoterie', efface: [19, 179, 15, 15], x: 20, y: 184, w: 13, h: 12, facade: 'ocre' },
    { nom: 'mayonnaise', efface: [1, 201, 11, 13], x: 1, y: 206, w: 11, h: 10, facade: 'rouge' },
    { nom: 'usine_info', efface: [20, 146, 14, 20], x: 20, y: 152, w: 14, h: 14, facade: 'pierre' },
    { nom: 'menuiserie', efface: [45, 118, 8, 29], x: 46, y: 127, w: 7, h: 22, facade: 'ocre' },
  ].map((l) => ({ niveaux: 2, plan: l.nom, enseigne: l.nom, ...l }));
  const IMMEUBLE = {
    carte: 'ville', dy: 40, transparent: 0.3, voile: 0x0d1018, alpha: 0.62,
    retire: ['maisons_a*', 'maisons_b*', 'maison_bleue', 'bureaux_est', 'bureaux_du_marche', 'verriere_est', 'maison_corps', 'maison_aile_ouest',
      'maison_aile_est', 'tour', 'bureaux_bleus', 'bureaux_bruns', 'bureaux_clairs', 'bureaux_de_la_gare', 'usine', 'hangar', 'entrepot_sud',
      'entrepot_du_quai', 'usine_sud', 'bureaux_du_sud', 'longue_maison'],
    batiments: [
      { nom: 'immeuble_ocre', efface: [146, 36, 22, 16], x: 146, y: 40, w: 22, h: 14, niveaux: 3, plan: 'double', facade: 'ocre', logement: 'logement' },
      { nom: 'residence_verre', efface: [1, 117, 10, 21], x: 1, y: 126, w: 10, h: 14, niveaux: 4, plan: 'simple', facade: 'bleu', logement: 'residence_verre' },
      { nom: 'residence_ocre', efface: [1, 140, 10, 26], x: 1, y: 154, w: 10, h: 14, niveaux: 5, plan: 'simple', facade: 'ocre', logement: 'residence_ocre' },
      { nom: 'tour_de_la_gare', efface: [21, 104, 12, 28], x: 21, y: 120, w: 12, h: 14, niveaux: 8, plan: 'simple', facade: 'pierre', logement: 'tour_de_la_gare', enfants: 0 },
      ...MAISONS,
      ...LIEUX,
    ],
    facades: {
      ocre: { key: 'immeuble_ville', file: 'assets/immeuble_ville.png' },
      bleu: { key: 'immeuble_ville_bleu', file: 'assets/immeuble_ville_bleu.png' },
      rouge: { key: 'immeuble_ville_rouge', file: 'assets/immeuble_ville_rouge.png' },
      orange: { key: 'immeuble_ville_orange', file: 'assets/immeuble_ville_orange.png' },
      pierre: { key: 'immeuble_ville_pierre', file: 'assets/immeuble_ville_pierre.png' },
    },
    facade: { w: 16, h: 50, etages: 32, fenetre: 16, porte: 96 },
    escalier: 69, haut: 70, porteVerticale: 30, mursAlpha: 0.4, toitZ: 0.5,
    meubles: ['lit_adulte', 'lit_enfant', 'chevet', 'cuisine', 'four', 'table', 'chaise', 'canape', 'table_basse', 'plante', 'tapis_2',
      'plan', 'frigo', 'evier', 'comptoir', 'four_boulanger', 'petrin', 'vitrine_pain', 'etagere_pain', 'four_pizza', 'friteuse', 'grill',
      'etal_poisson', 'bac_homards', 'presentoir', 'etagere_info', 'bureau_ordi', 'pupitre', 'drapeau', 'classeur', 'banc', 'vitrine_musee', 'statue',
      'dinosaure', 'chevalet', 'ecran_cinema', 'fauteuils', 'popcorn', 'projecteur', 'tableau_noir', 'pupitre_eleve', 'etagere_livres', 'globe',
      'tableau_cours', 'coffre', 'silo_grain', 'moulin', 'sacs_farine', 'metier_tisser', 'bobines', 'rouleaux_tissu', 'machine_coudre', 'cuve',
      'remplisseuse', 'palette_pots', 'caisse_oeufs', 'betonniere', 'presse_briques', 'palette_briques', 'sacs_ciment', 'chaine_montage',
      'etabli_soudure', 'armoire_composants', 'robot_bras', 'serveur', 'etabli', 'scie', 'planches', 'armoire', 'palette', 'chariot'],
    // Les familles des logements (js/carte/ville/habitants.js) : `lits` lits dans un logement
    // d'immeuble (une maison : deux adultes et ses enfants, un lit chacun) ; les adultes
    // travaillent à `travail` (sans partie : `horaires`, `salaire` ; sinon ceux du moteur,
    // VOISINS.FROMAGER) ; tous dorment de `sommeil[0]` h à `sommeil[1]` h. Dehors, ils marchent
    // à `vitesse` px/s ; ils partent au travail le temps du trajet avant l'embauche (une heure du
    // jeu : `sParHeure` s), plus `marge` h. Au marché, ils restent `achat` s devant un étal ; le
    // dîner cuit `cuisson` s. (Le pied des lits et la place devant le four : le plan du niveau.)
    vie: {
      lits: 3, travail: 'fromagerie', horaires: [8, 17], salaire: 16, sommeil: [22, 6], vitesse: 40, sParHeure: 30, marge: 0.25,
      achat: 4, cuisson: 16, humeur: [70, 40],
    },
  };
  // (le joueur prend une ressource à `reach` px de ses pieds)
  const RAMASSABLES = { key: 'ramassables', file: 'assets/ramassables.png', w: 16, h: 16, reach: 14, frames: { petite_pierre: 0, morceau_bois: 1, herbe: 2 } };
  // La journée des familles de la transition : dehors de `jour[0]` h à `jour[1]` h, au lit de
  // `sommeil[0]` h à `sommeil[1]` h (chacun le sien : la maison en a un par membre) ; rentrés,
  // ils restent `pause` s à la maison (au hasard entre les deux) avant de ressortir. Les enfants
  // vont à l'école comme ceux de la ferme (CarteKit.ECOLE : chacun part le temps qu'il lui faut
  // pour arriver au bus à l'heure). Les parents font leur métier (js/carte/ville/metiers.js) :
  // le bûcheron abat un arbre en `coups` coups de hache de `coup` s chacun, puis rapporte le bois
  // chez lui ; l'agriculteur travaille `parcelles` parcelles de son champ, `travail` s chacune
  // (au hasard entre les deux) ; le second parent va au marché de la ville entre `marche[0]` h et
  // `marche[1]` h (il y reste `enVille` s) ; l'un d'eux cuisine à partir de `cuisine` h, `cuisson` s
  // devant le four ou la cuisinière (une volute de vapeur toutes les `vapeur` s).
  const TRANSITION_VIE = {
    jour: [7, 19], pause: [10, 25], sommeil: [22, 6],
    coups: 3, coup: 0.55, parcelles: 3, travail: [3, 5], marche: [11, 14], enVille: 18, cuisine: 17.5, cuisson: 16, vapeur: 0.45,
    humeur: [70, 40],         // le bonheur : 😊 au-dessus de humeur[0], 🙂 au-dessus de humeur[1], 😟 en dessous
    // le champ d'un agriculteur : la terre labourée (16 bordures selon les coins, comme à la
    // ferme : scripts/carte/terre_bords.py) et les plantes (crops.png, « culture:stade »)
    champ: { terre: 'terre_bords_voisins', terreFile: 'assets/terre_bords.png', crops: 'crops', cropsFile: 'assets/crops.png' },
    // les grands meubles des maisons agrandies (assets/meuble_<nom>.png, ceux de la maison de la
    // ferme : le plan les place, maisonPlan du moteur)
    meubles: ['table', 'chaise', 'canape', 'table_basse', 'plante', 'tapis_1'],
    // le livreur (js/carte/ville/livreur.js) : son triporteur électrique (les cases du
    // triporteur, js/carte/triporteur.js), les caisses de collecte (pleine, vide) ; il part à
    // `depart` h, s'arrête `charge` s à chaque caisse ; arrivé au marché, il y reste jusqu'à
    // `retour` h ; si le joueur arrive après `livre` h, la tournée du matin est déjà faite
    livreur: {
      tri: 'triporteur_electrique', triFile: 'assets/triporteur_electrique.png',
      caisse: 'caisse_collecte', caisseFile: 'assets/caisse_collecte.png',
      depart: 6, charge: 1.2, livre: 9, retour: 11,
    },
  };
  // La clé de la planche d'un personnage : un adulte (perso_N) ou un enfant (enfant_N) ; son
  // fichier : CarteKit.planche.
  const sheetKey = (n, enfant) => (enfant ? 'enfant_' : 'perso_') + n;

  // Les tuiles d'une couche dans un rectangle (px), comme getTilesWithinWorldXY, mais gardées
  // dans `memo` tant que le rectangle couvre les mêmes cases : Phaser fait un tableau neuf à
  // chaque appel, et on le demande à chaque image pour chaque personnage et chaque couche.
  // Les cases sont celles que Phaser calcule (bord gauche et haut arrondis en dessous, droit et
  // bas au-dessus), sur la couche posée en (x, y) à son échelle. Les couches où l'on cherche
  // (bâtiments, feuillage) ne changent plus de tuiles après la création de la carte.
  function tuilesDans(memo, layer, x, y, w, h) {
    const L = layer.layer;
    const tw = L.baseTileWidth * layer.scaleX, th = L.baseTileHeight * layer.scaleY;
    const x0 = Math.floor((x - layer.x) / tw), y0 = Math.floor((y - layer.y) / th);
    const x1 = Math.ceil((x + w - layer.x) / tw), y1 = Math.ceil((y + h - layer.y) / th);
    if (memo.layer !== layer || memo.x0 !== x0 || memo.y0 !== y0 || memo.x1 !== x1 || memo.y1 !== y1) {
      memo.layer = layer; memo.x0 = x0; memo.y0 = y0; memo.x1 = x1; memo.y1 = y1;
      memo.tiles = layer.getTilesWithinWorldXY(x, y, w, h) || [];
    }
    return memo.tiles;
  }

  const parties = [];
  global.CarteVille = {
    C: { T: K.T, CARTES, JOUR_NUIT, PASS, HERO, OBSTACLES, PASSABLES, BATI, BATI_ALPHA, DEVANT, FEUILLAGE_ALPHA, VOL, ECLAIRAGE, OMBRES, CARS, KY, BUS, TRAIN, NAVETTE, FINDS, FAUNE, GROTTE, NATURE, PECHE, VOISINS, BLOCS, IMMEUBLE, RAMASSABLES, TRANSITION_VIE },
    etat, configure, hote, sheetKey, saisie: K.saisie, reduced: K.reduit, v: K.v, tuilesDans,
    // les méthodes de la scène, fichier par fichier (voir js/ville-carte.js)
    parties,
    partie(methodes) { parties.push(methodes); },
  };
})(window);
