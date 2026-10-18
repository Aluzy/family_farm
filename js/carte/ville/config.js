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
  const CARTES = { ville: 'assets/ville.json', transition: 'assets/transition.json', montagne: 'assets/montagne.json', plage: 'assets/plage.json', grotte: null, interieur: 'assets/maison_interieur.json' };
  // Les cartes où le jour et la nuit passent (CarteKit.voile) : la grotte a sa propre
  // obscurité, l'intérieur des voisins reste éclairé.
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
  // chaque carte, le matin et le soir, une scène : les heures (du jeu) où elle commence et
  // après lesquelles elle ne commence plus, le trajet du bus et son arrêt (couche « bus »), le
  // chemin des enfants, et s'ils montent dans le bus ou en descendent.
  const BUS = {
    key: 'bus', file: 'assets/ville_bus.png', meta: 'assets/ville_bus.json', half: 46, carHalf: 29,
    speed: 70,             // px au sol par seconde (plus vite que les voitures : la ville est grande)
    lead: 1400,            // il part au plus à cette distance de l'arrêt (déjà en route, en fondu)
    kid: { speed: K.VITESSES.enfantsBus, fade: 0.5, cases: 'assets/personnages/cases.json' },
    resume: 1.2,           // s : le temps que les enfants s'éloignent (ou montent) avant de repartir
    scenes: {
      transition: [
        { nom: 'matin', debut: 7.2, fin: 8.4, bus: 'bus_matin', arret: 'arret', enfants: 'enfants_matin', monter: true },
        { nom: 'soir', debut: 16.1, fin: 16.8, bus: 'bus_soir', arret: 'arret', enfants: 'enfants_soir', monter: false },
      ],
      ville: [
        { nom: 'matin', debut: 7.2, fin: 8.6, bus: 'bus_matin', arret: 'arret_matin', enfants: 'enfants_matin', monter: false },
        { nom: 'soir', debut: 15.6, fin: 16.4, bus: 'bus_soir', arret: 'arret_soir', enfants: 'enfants_soir', monter: true },
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
        route: 'bus_matin', arret: 'arret', attente: { x: 600, y: 243 },
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
    cartes: { montagne: ['marmotte', 'bouquetin', 'aigle'], plage: ['mouette', 'crabe', 'dauphin'] },
    especes: {
      marmotte: { size: 16, n: 2, speed: 18, peur: 52, texte: '🐾 Une marmotte : elle siffle pour prévenir les autres.' },
      bouquetin: { size: 32, n: 2, speed: 11, peur: 0, texte: '🐐 Un bouquetin : il grimpe les rochers les plus raides.' },
      aigle: { size: 32, n: 1, texte: '🦅 Un aigle royal tourne très haut dans le ciel.' },
      mouette: { size: 16, n: 3, speed: 16, peur: 44, texte: '🕊️ Une mouette : elle guette les restes du pique-nique.' },
      crabe: { size: 16, n: 2, speed: 20, peur: 40, texte: '🦀 Un crabe : il file de côté.' },
      dauphin: { size: 32, n: 1, texte: '🐬 Un dauphin saute au large !' },
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
  // Les voisins (l'intérieur des maisons de la carte de transition) : la famille de chaque maison,
  // tirée une fois (deux parents, 1 à `enfantsMax` enfants, des personnages de
  // assets/personnages/ autres que ceux de la partie) et gardée sur l'appareil (localStorage
  // `store`). Les meubles (assets/meuble_<dessin>.png) prennent les places nommées de la couche
  // « meubles » de l'intérieur : un lit d'adulte par parent, un lit d'enfant par enfant, une chaise
  // par personne ; le reste (tableaux, plante, coin salon) au hasard. La sortie : `sortie` (px).
  const VOISINS = {
    store: 'ferme-voisins', enfantsMax: 3, persos: 50, speed: K.VITESSES.voisins.adulte, kidSpeed: K.VITESSES.voisins.enfant, wait: [1.5, 5],
    sortie: { x: 232, y: 240, w: 32, h: 24 }, entree: { x: 248, y: 228 }, fond: '#06182a',
    noms: ['Martin', 'Bernard', 'Dubois', 'Moreau', 'Laurent', 'Girard', 'Roux', 'Fournier', 'Mercier', 'Blanc', 'Garnier', 'Chevalier'],
    prenoms: ['Camille', 'Claude', 'Dominique', 'Sacha', 'Alix', 'Morgan', 'Charlie', 'Maxime', 'Andréa', 'Yaël', 'Eden', 'Ange'],
    enfants: ['Lou', 'Noa', 'Maé', 'Louison', 'Swann', 'Élie', 'Gaby', 'Robin', 'Jo', 'Lilou', 'Nino', 'Tom'],
    paroles: {
      adulte: ['Bonjour, voisin ! Les légumes de votre ferme sont les meilleurs du coin.', 'Entrez donc, il reste du café.',
        'Le bus de l\'école passe le matin vers 7 h, à l\'arrêt au bout du chemin.', 'Il paraît que le marché de la ville paie bien les produits de la ferme.',
        'Vous avez vu le train ? Il va jusqu\'à la montagne et à la plage.', 'Quelle belle journée pour couper du bois !'],
      enfant: ['Tu veux jouer avec moi ?', 'J\'ai vu une marmotte à la montagne !', 'Le bus de l\'école est tout jaune !',
        'Ma maîtresse dit que les vaches font du lait. C\'est vrai ?', 'Je vais construire une cabane dans les arbres.', 'Il y a des poissons dans la mare ?'],
    },
    meubles: ['four', 'cuisine', 'plan', 'evier', 'frigo', 'fenetre', 'plante', 'chaise', 'table', 'tapis_1', 'tapis_2', 'tapis_3',
      'lit_adulte', 'lit_enfant', 'chevet', 'canape', 'table_basse', 'tableau_1', 'tableau_2', 'tableau_3'],
    plats: /^(tapis|tableau|fenetre)/,
  };
  // La carte de transition (js/carte/ville/transition.js) : les maisons des voisins bâties avec
  // les blocs de la ferme générée (assets/blocs.png, scripts/carte/blocs.py : `murs` + masque
  // des murs voisins, `sols` + masque du plancher, la porte, la couverture, les meubles par la
  // lettre du plan des maisons, js/engine/transition.js) ; les ressources qu'on y ramasse
  // (assets/ramassables.png, comme à la ferme).
  const BLOCS = {
    key: 'blocs', file: 'assets/blocs.png', w: 16, h: 24, murs: 14, sols: 31, porte: 1, drap: 4,
    meubles: { f: 5, c: 6, p: 3, d: 3, g: 12, a: 2, b: 11, n: 9, m: 13 },
  };
  // (le joueur prend une ressource à `reach` px de ses pieds)
  const RAMASSABLES = { key: 'ramassables', file: 'assets/ramassables.png', w: 16, h: 16, reach: 14, frames: { petite_pierre: 0, morceau_bois: 1, herbe: 2 } };
  // La journée des familles de la transition : dehors de `jour[0]` h à `jour[1]` h ; elles
  // rapportent `panier` ressources à la fois, se penchent `ramasse` s pour en prendre une,
  // soufflent `souffle` s avant la suivante, restent `pause` s à la maison (au hasard entre les deux) avant de ressortir. `store` : ce
  // qui a été ramassé aujourd'hui (localStorage).
  const TRANSITION_VIE = {
    store: 'ferme-transition-ramasses', jour: [7, 19], panier: 3, ramasse: 0.9, souffle: [1.5, 3.5], pause: [10, 25],
    paroles: {
      adulte: { compte: 'Avec ma famille, on a déjà ramassé {n} ressource{s} aujourd\'hui. Ça fera de belles réserves !', rien: 'Je vais chercher du bois et des pierres pour la maison.' },
      enfant: { compte: 'On a trouvé {n} trésor{s} aujourd\'hui ! Des cailloux, du bois…', rien: 'J\'aide mes parents à ramasser du bois !' },
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
    C: { T: K.T, CARTES, JOUR_NUIT, PASS, HERO, OBSTACLES, PASSABLES, BATI, BATI_ALPHA, DEVANT, FEUILLAGE_ALPHA, VOL, ECLAIRAGE, OMBRES, CARS, KY, BUS, TRAIN, NAVETTE, FINDS, FAUNE, GROTTE, NATURE, PECHE, VOISINS, BLOCS, RAMASSABLES, TRANSITION_VIE },
    etat, configure, hote, sheetKey, saisie: K.saisie, reduced: K.reduit, v: K.v, tuilesDans,
    // les méthodes de la scène, fichier par fichier (voir js/ville-carte.js)
    parties,
    partie(methodes) { parties.push(methodes); },
  };
})(window);
