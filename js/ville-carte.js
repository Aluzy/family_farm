/*
 * La ville (jeu.html?carte=ville), où l'on va depuis la fenêtre de la ville (« Se promener en
 * ville », tout en bas) : ses rues, son parc et ses fontaines, et le personnage qui s'y promène.
 *
 * La carte : assets/ville.json (scripts/ville/carte.py, puis scripts/build-map.mjs) ; ses
 * couches de tuiles (le sol, puis une couche par matière, de bas en haut) et son point
 * « depart ». La fermière : assets/fermiere.png, cases de 16 × 32 nommées dans
 * assets/fermiere.json (scripts/personnage/), la même que sur la carte de la ferme.
 *
 * Les bâtiments sont en 3/4 (scripts/ville/immeubles.py) : la couche d'objets « batiments »
 * donne l'emprise au sol de chacun (on n'y marche pas) et le haut de son dessin (propriété
 * « haut »). Tout ce qui est dessiné au-dessus de l'emprise cache le sol de derrière, où l'on
 * passe : les couches des bâtiments existent en deux exemplaires, l'un sous les personnages,
 * l'autre (« …_devant ») par-dessus ; autour de chaque personnage, l'exemplaire du dessus
 * s'efface si elle est devant le bâtiment (on la voit devant le mur), et devient transparent
 * si elle est derrière (on la voit à travers le toit, comme sous les arbres).
 *
 * Elle marche sur le sol (chaussée, trottoirs, herbe, pavés), pas à travers un bâtiment,
 * une fontaine, une voiture, une palissade ou un banc : un toucher (ou un clic) l'envoie au
 * plus court jusque-là ; les flèches ou ZQSD la dirigent aussi. Sous un arbre, le feuillage
 * s'efface un peu pour la laisser voir. Avec « animations réduites », l'eau reste immobile.
 *
 * La circulation : des voitures (assets/ville_voitures.png et .json, scripts/ville/voitures.py :
 * cinq couleurs, huit directions) arrivent par un bout de rue au bord de la carte, suivent un
 * trajet de la couche « routes » (une polyligne « entrée>sortie », coins arrondis à la volée) et
 * disparaissent là où la rue touche un autre bord. Elles gardent leurs distances, s'arrêtent
 * devant la promeneuse, et n'entrent dans un carrefour (couche « carrefours ») que si aucune
 * voiture qui s'y trouve ne croise leur trajet. Les longueurs se comptent au sol : la carte est
 * vue de 3/4, une distance verticale à l'écran vaut 1 / KY au sol. Les voitures garées sont des
 * tuiles (couche « vehicules ») ; leur emprise au sol (couche « garees ») arrête la promeneuse.
 * Avec « animations réduites », pas de circulation.
 *
 * La même page montre aussi la carte de transition entre la ferme et la ville (?carte=
 * transition) ; ?arrivee= choisit le point d'arrivée. Aux passages (couche « passages »), une
 * flèche bleue paraît quand on s'en approche : un toucher dessus mène à l'autre carte (ou à
 * la ferme, jeu.html).
 *
 * L'heure du jeu (HorlogeSortie, donnée par js/ui/excursion.js). Les jours d'école, le bus
 * de l'école (couche « bus » : ses trajets, ses arrêts, le chemin des enfants) passe le matin et
 * le soir : il roule avec les autres voitures et s'arrête le temps que les enfants de la
 * famille montent ou descendent (BUS.scenes : l'heure de chaque scène, carte par carte).
 *
 * La gare (le bâtiment « gare », couche « gare » : où s'arrête le train, où l'on monte) : un
 * toucher dessus ouvre la fenêtre des départs (TRAIN.gares). On va jusqu'au quai, le train
 * arrive, on monte, il repart et la caméra le suit jusqu'à la carte d'arrivée (?carte=montagne
 * ou plage, &train=nord ou sud : le sens où il roule) ; là, on le voit arriver, et quand il
 * s'arrête on paraît devant la gare. La montagne et la plage sont des terminus : le train y
 * reste à quai ; en ville, il repart.
 *
 * La montagne et la plage (scripts/ville/montagne.py, plage.py) : des trouvailles à ramasser
 * (couche « trouvailles » : un genre par endroit ; chaque jour, une partie des endroits, et ce
 * qu'on a ramassé ne revient que le lendemain — une maquette : rien n'entre encore dans
 * l'inventaire, un carnet les compte), des animaux à regarder (couche « animaux » : une zone
 * par espèce, FAUNE), les entrées des grottes (couche « passages » : la flèche y mène).
 *
 * Le marché de la ville (couche « lieux » : les étals) et les entreprises (les entrepôts
 * « conserverie », « fromagerie », « confiturerie ») : les ventes et les achats passent tout
 * de suite par le moteur du jeu (FermeHote, js/ui/excursion.js).
 *
 * La carte de transition est comme la ferme : ses barrières, son herbe haute qui penche quand on
 * la traverse, ses arbres qu'on coupe la hache en main et ses rochers qu'on casse la pioche en
 * main (le moteur du jeu compte les coups, donne le bois et la pierre, les fait revenir quelques
 * jours plus tard : NATURE). Les deux maisons des voisins s'ouvrent (?carte=interieur&maison=
 * <nom>) : l'intérieur de la maison de la ferme (assets/maison_interieur.json), meublé pour la
 * famille qui y vit, tirée au hasard à la première visite (deux parents, un à trois enfants :
 * VOISINS) ; elle va et vient dans la maison, on lui parle en la touchant.
 *
 * Ces cartes s'affichent dans la page du jeu (jeu.html), à la place de la carte de la ferme :
 * la carte du joueur, la date et l'argent, le menu et la barre d'outils restent là, le temps
 * passe comme à la ferme, et c'est le personnage principal de la partie qui s'y promène.
 * js/ui/excursion.js les ouvre (VilleCarte.start) et passe de l'une à l'autre (FermeHote.go).
 *
 * Les grottes (?carte=grotte&grotte=<entrée>&niveau=<n>) ne sont pas des cartes Tiled : chaque
 * niveau est tiré au hasard (le même toute la journée : la graine est l'entrée, le niveau et le
 * jour) par un automate cellulaire, avec les morceaux de scripts/ville/grotte.py. On descend par
 * le puits, on remonte par l'échelle (des passages, comme au bord des cartes). Le minerai est
 * pris dans les murs qui touchent le sol, de plus en plus rare et précieux en profondeur (fer,
 * cuivre, or, platine : GROTTE.poids) ; on le pioche en le touchant (une maquette : il va dans
 * un carnet, pas encore dans l'inventaire). Il fait noir : on n'y voit qu'autour de soi.
 */
(function () {
  'use strict';

  const T = 16;
  // l'adresse d'un fichier de assets/, suivie sur le site en ligne de « ?v=<empreinte de son
  // contenu> » (js/assets-versions.js, écrit par scripts/build-site.mjs) : un fichier modifié
  // change d'adresse, le téléphone le recharge au lieu de mélanger l'ancien et le nouveau.
  const v = (file) => {
    const t = window.FERME_ASSET_VERSIONS, k = file.replace(/^assets\//, '');
    return t && t[k] ? file + '?v=' + t[k] : file;
  };
  // La carte : ?carte=ville (par défaut) ou ?carte=transition (entre la ferme et la ville,
  // scripts/ville/transition.py) ; ?arrivee=<nom> : le point de la couche « arrivees » où l'on
  // apparaît (sinon « depart »).
  const CARTES = { ville: 'assets/ville.json', transition: 'assets/transition.json', montagne: 'assets/montagne.json', plage: 'assets/plage.json', grotte: null, interieur: 'assets/maison_interieur.json' };
  // (fixés à chaque démarrage : VilleCarte.start(parent, '?carte=…&arrivee=…'))
  let PARAMS = new URLSearchParams('');
  let NOM_CARTE = 'ville';
  let MAP = { key: 'carte_ville', file: CARTES.ville };
  function configure(search) {
    PARAMS = new URLSearchParams(search || '');
    NOM_CARTE = Object.prototype.hasOwnProperty.call(CARTES, PARAMS.get('carte')) ? PARAMS.get('carte') : 'ville';
    MAP = { key: 'carte_' + NOM_CARTE, file: CARTES[NOM_CARTE] };
  }
  // La page du jeu (js/ui/excursion.js) : l'heure, le personnage principal, le marché, les
  // entreprises, les outils, les messages, le passage d'une carte à l'autre.
  const hote = () => window.FermeHote || null;
  // Les passages vers une autre carte (couche « passages » : un rectangle au bord, sa cible, le
  // sens de sa flèche) : la flèche bleue (assets/fleche_passage.png, scripts/ville/fleche.py :
  // droite, gauche, haut, bas) paraît quand la promeneuse est à moins de `near` px, se balance
  // de `bob` px ; un toucher dessus mène à la cible.
  const PASS = { key: 'fleche_passage', file: 'assets/fleche_passage.png', near: 80, bob: 3, sens: ['droite', 'gauche', 'haut', 'bas'] };
  // Le personnage principal de la partie (assets/personnages/perso_NN.png, ses cases nommées
  // dans assets/personnages/cases.json), comme sur la carte de la ferme ; sans partie, la fermière.
  const HERO = { key: 'heros', file: 'assets/fermiere.png', names: 'assets/fermiere.json', w: 16, h: 32, foot: 30, speed: 48, stride: 4 };
  function heroSheet() {
    const n = hote() && hote().perso ? hote().perso() : null;
    return n ? { file: 'assets/personnages/perso_' + String(n).padStart(2, '0') + '.png', names: 'assets/personnages/cases.json' } : { file: HERO.file, names: HERO.names };
  }
  // Les couches qu'on ne traverse pas, et celle qui passe devant la promeneuse (le feuillage).
  // (les bâtiments et les voitures garées : par leur emprise au sol, couches « batiments » et « garees »)
  const OBSTACLES = ['fontaines', 'mobilier', 'falaise', 'mer'];
  // les couches des bâtiments, doublées d'un exemplaire « _devant » au-dessus des personnages
  const BATI = ['murs', 'pierre_de_taille', 'vitrages', 'charpente', 'toits', 'menuiserie'];
  const BATI_ALPHA = 0.45;
  const DEVANT = 'vegetation';
  const FEUILLAGE_ALPHA = 0.45;
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
    kid: { speed: 32, fade: 0.5, cases: 'assets/personnages/cases.json' },
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
      montagne: [{ carte: 'ville', label: '🏙️ Retour en ville', sens: 'sud' }],
      plage: [{ carte: 'ville', label: '🏙️ Retour en ville', sens: 'nord' }],
    },
    terminus: { montagne: true, plage: true },
  };
  // Les trouvailles (assets/trouvailles.png, scripts/ville/faune.py) : `part` des endroits en
  // ont une chaque jour ; on la ramasse à `reach` px. Ce qu'on a ramassé (et le carnet) :
  // localStorage « ferme-trouvailles ».
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
  // la taille d'un niveau (en tuiles), le nombre de niveaux, la part de murs au départ et les
  // passes de l'automate, la chance qu'un mur au bord du sol porte du minerai, les coups de
  // pioche, la lumière autour de la promeneuse (px : nette jusqu'à r0, noire à partir de r1).
  const GROTTE = {
    tiles: 'assets/grotte_tuiles.png', objets: 'assets/grotte_objets.png', meta: 'assets/grotte.json',
    w: 46, h: 34, niveaux: 8, murs: 0.46, passes: 5, minerai: 0.07, coups: 3, coup: 0.5,
    lumiere: { r0: 44, r1: 132, noir: 0.93 }, store: 'ferme-grottes',
    // le poids de chaque minerai au niveau n : le fer partout, les autres de plus en plus bas
    poids: (n) => ({ fer: 1, cuivre: Math.max(0, (n - 1) * 0.35), or: Math.max(0, (n - 2.5) * 0.18), platine: Math.max(0, (n - 4) * 0.1) }),
  };
  // Comme à la ferme (couches « arbres », « rochers », « herbe_haute » de la carte) : les arbres
  // (assets/arbre_clair_sp.png, pin_clair_sp.png : images 0 droit, 1 penché à droite, 2 à gauche,
  // 4 px de marge ; `tronc` : les décalages, en px, des cases de leur pied qu'on ne traverse pas)
  // et les rochers (assets/transition_objets.png, cases de 32 px ; `half`, `h` : où on les touche).
  // Un toucher, l'outil en main : on y va, un coup (`swing` s, il porte à la 3e image du geste),
  // le moteur compte (FermeHote.couper / piocher). Au dernier coup, l'arbre bascule (`fall`),
  // le rocher éclate. L'herbe haute penche dans le sens de la marche puis revient (`swing` de
  // `herbe` : les images de sa rangée), comme à la ferme.
  const NATURE = {
    arbres: {
      arbre: { key: 'arbre_clair_sp', file: 'assets/arbre_clair_sp.png', w: 56, h: 64, tronc: [0], reach: 14 },
      pin: { key: 'pin_clair_sp', file: 'assets/pin_clair_sp.png', w: 72, h: 64, tronc: [-4, 4], reach: 19 },
    },
    rochers: { rocher: { half: 13, h: 24, tronc: [-10, 0, 10], reach: 21 }, caillou: { half: 7, h: 12, tronc: [0], reach: 13 } },
    objets: { key: 'transition_objets', file: 'assets/transition_objets.png', size: 32 },
    ombre: { key: 'ombre_arbre', file: 'assets/ombre_arbre.png', dx: -16, dy: -8 },
    herbe: { key: 'herbe_haute', file: 'assets/herbe_haute.png', w: 22, h: 16, frames: 5, swing: [2, 1, 0, 3, 0, 1, 0], step: 75, reach: { x: 9, up: 6, down: 4 }, shade: 0.12 },
    swing: 0.5, shake: [1, 0, 2, 0, 1, 0], shakeFps: 9, occ: 0.6,
    fall: { ms: 700, angle: 86, rest: 600, fade: 700, leaves: 22, colors: [0x2f6b3a, 0x4e8f43, 0x77ad4f, 0x9cc36a, 0x6b4a2b, 0x8a6337] },
    eclats: [0x5d5a63, 0x8a8790, 0xa9a6ad, 0xc9c5c6, 0xe4e0dc],
  };
  // Les voisins (l'intérieur des maisons de la carte de transition) : la famille de chaque maison,
  // tirée une fois (deux parents, 1 à `enfantsMax` enfants, des personnages de
  // assets/personnages/ autres que ceux de la partie) et gardée sur l'appareil (localStorage
  // `store`). Les meubles (assets/meuble_<dessin>.png) prennent les places nommées de la couche
  // « meubles » de l'intérieur : un lit d'adulte par parent, un lit d'enfant par enfant, une chaise
  // par personne ; le reste (tableaux, plante, coin salon) au hasard. La sortie : `sortie` (px).
  const VOISINS = {
    store: 'ferme-voisins', enfantsMax: 3, persos: 50, speed: 24, kidSpeed: 32, wait: [1.5, 5],
    sortie: { x: 232, y: 240, w: 32, h: 24 }, entree: { x: 248, y: 228 }, fond: '#06182a',
    noms: ['Martin', 'Bernard', 'Dubois', 'Moreau', 'Laurent', 'Girard', 'Roux', 'Fournier', 'Mercier', 'Blanc', 'Garnier', 'Chevalier'],
    prenoms: ['Camille', 'Claude', 'Dominique', 'Sacha', 'Alix', 'Morgan', 'Charlie', 'Maxime', 'Andréa', 'Yaël', 'Eden', 'Ange'],
    enfants: ['Lou', 'Noa', 'Maé', 'Louison', 'Swann', 'Élie', 'Gaby', 'Robin', 'Jo', 'Lilou', 'Nino', 'Tom'],
    paroles: {
      adulte: ['Bonjour, voisin ! Les légumes de votre ferme sont les meilleurs du coin.', 'Entrez donc, il reste du café.',
        'Le bus de l’école passe le matin vers 7 h, à l’arrêt au bout du chemin.', 'Il paraît que le marché de la ville paie bien les produits de la ferme.',
        'Vous avez vu le train ? Il va jusqu’à la montagne et à la plage.', 'Quelle belle journée pour couper du bois !'],
      enfant: ['Tu veux jouer avec moi ?', 'J’ai vu une marmotte à la montagne !', 'Le bus de l’école est tout jaune !',
        'Ma maîtresse dit que les vaches font du lait. C’est vrai ?', 'Je vais construire une cabane dans les arbres.', 'Il y a des poissons dans la mare ?'],
    },
    meubles: ['four', 'cuisine', 'plan', 'evier', 'frigo', 'fenetre', 'plante', 'chaise', 'table', 'tapis_1', 'tapis_2', 'tapis_3',
      'lit_adulte', 'lit_enfant', 'chevet', 'canape', 'table_basse', 'tableau_1', 'tableau_2', 'tableau_3'],
    plats: /^(tapis|tableau|fenetre)/,
  };
  // La planche d'un personnage : un adulte (perso_NN) ou un enfant (enfant_NN), assets/personnages/.
  const sheetKey = (n, enfant) => (enfant ? 'enfant_' : 'perso_') + n;
  const reduced = () => !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

  // La famille qui vit dans la maison `maison` : tirée au hasard la première fois, puis gardée.
  // { nom, membres: [{ prenom, perso, enfant }], deco: { tableaux, plante, salon } }.
  function voisins(maison) {
    let all = {};
    try { all = JSON.parse(window.localStorage.getItem(VOISINS.store) || '{}') || {}; } catch (e) { all = {}; }
    if (all[maison] && Array.isArray(all[maison].membres) && all[maison].membres.length) return all[maison];
    const pick = (a) => a[Math.floor(Math.random() * a.length)];
    // des personnages (d'adulte, d'enfant) que la partie et les autres voisins n'ont pas
    const pris = { adulte: new Set(), enfant: new Set() };
    const H = hote(), h = window.HorlogeSortie ? window.HorlogeSortie.maintenant() : null;
    if (H && H.perso) pris.adulte.add(H.perso());
    for (const e of (h && h.enfants) || []) pris.enfant.add(e.perso);
    const autres = Object.values(all).filter((f) => f && Array.isArray(f.membres));
    for (const f of autres) for (const m of f.membres) pris[m.enfant ? 'enfant' : 'adulte'].add(m.perso);
    const perso = (enfant) => {
      const p = pris[enfant ? 'enfant' : 'adulte'], libres = [];
      for (let n = 1; n <= VOISINS.persos; n++) if (!p.has(n)) libres.push(n);
      const n = libres.length ? pick(libres) : 1 + Math.floor(Math.random() * VOISINS.persos);
      p.add(n);
      return n;
    };
    const dits = new Set();
    const prenom = (liste) => { const l = liste.filter((p) => !dits.has(p)); const p = pick(l.length ? l : liste); dits.add(p); return p; };
    const noms = VOISINS.noms.filter((n) => !autres.some((f) => f.nom === n));
    const n = 1 + Math.floor(Math.random() * VOISINS.enfantsMax);
    const membres = [0, 1].map(() => ({ prenom: prenom(VOISINS.prenoms), perso: perso(false), enfant: false }));
    for (let i = 0; i < n; i++) membres.push({ prenom: prenom(VOISINS.enfants), perso: perso(true), enfant: true });
    const f = {
      nom: pick(noms.length ? noms : VOISINS.noms), membres,
      deco: { tableaux: [1, 2, 3].filter(() => Math.random() < 0.7), plante: Math.random() < 0.6, salon: Math.random() < 0.75 },
    };
    all[maison] = f;
    try { window.localStorage.setItem(VOISINS.store, JSON.stringify(all)); } catch (e) { /* gardée le temps de la visite */ }
    return f;
  }

  // Le dessin posé à la place `place` de la couche « meubles » pour la famille `f` (null : rien).
  function meubleDe(place, f) {
    const enfants = f.membres.filter((m) => m.enfant).length;
    let m;
    if ((m = /^chaise_(\d+)$/.exec(place))) return Number(m[1]) <= Math.min(6, f.membres.length) ? 'chaise' : null;
    if ((m = /^lit_(\d+)$/.exec(place))) {
      const k = Number(m[1]);
      return k <= 2 ? 'lit_adulte' : k >= 4 && k - 3 <= enfants ? 'lit_enfant' : null;
    }
    if ((m = /^tableau_(\d+)$/.exec(place))) return f.deco.tableaux.includes(Number(m[1])) ? place : null;
    if (place === 'plante') return f.deco.plante ? place : null;
    if (place === 'tapis_1' || place === 'table_basse') return f.deco.salon ? place : null;
    return VOISINS.meubles.includes(place) ? place : null;
  }

  // Les planches de tuiles « extrudées » : chaque tuile recopiée avec un bord d'un pixel qui
  // répète son propre bord (marge 1, espacement 2). Quand la caméra tombe entre deux pixels
  // (zoom, écran à densité non entière), le GPU qui lit juste à côté d'une tuile retombe sur
  // sa propre couleur, et non sur la tuile voisine de la planche : plus de fines lignes sombres
  // aux jointures. Les numéros des tuiles ne changent pas.
  function extrude(textures, key, t) {
    const src = textures.get(key).getSourceImage();
    const cols = Math.floor(src.width / t), rows = Math.floor(src.height / t);
    const canvas = document.createElement('canvas');
    canvas.width = cols * (t + 2);
    canvas.height = rows * (t + 2);
    const g = canvas.getContext('2d');
    g.imageSmoothingEnabled = false;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const sx = c * t, sy = r * t, dx = c * (t + 2) + 1, dy = r * (t + 2) + 1;
        g.drawImage(src, sx, sy, t, t, dx, dy, t, t);
        g.drawImage(src, sx, sy, t, 1, dx, dy - 1, t, 1);                 // haut
        g.drawImage(src, sx, sy + t - 1, t, 1, dx, dy + t, t, 1);         // bas
        g.drawImage(src, sx, sy, 1, t, dx - 1, dy, 1, t);                 // gauche
        g.drawImage(src, sx + t - 1, sy, 1, t, dx + t, dy, 1, t);         // droite
        g.drawImage(src, sx, sy, 1, 1, dx - 1, dy - 1, 1, 1);             // les coins
        g.drawImage(src, sx + t - 1, sy, 1, 1, dx + t, dy - 1, 1, 1);
        g.drawImage(src, sx, sy + t - 1, 1, 1, dx - 1, dy + t, 1, 1);
        g.drawImage(src, sx + t - 1, sy + t - 1, 1, 1, dx + t, dy + t, 1, 1);
      }
    }
    const out = key + '_extrude';
    if (textures.exists(out)) textures.remove(out);
    textures.addCanvas(out, canvas);
    return out;
  }

  class VilleScene extends Phaser.Scene {
    constructor() { super('ville'); }

    preload() {
      if (!MAP.file) {
        this.load.image('grotte_tuiles', v(GROTTE.tiles));
        this.load.spritesheet('grotte_objets', v(GROTTE.objets), { frameWidth: 32, frameHeight: 32 });
        this.load.json('grotte', v(GROTTE.meta));
      } else this.load.tilemapTiledJSON(MAP.key, v(MAP.file));
      const sheet = heroSheet();
      this.load.spritesheet(HERO.key, v(sheet.file), { frameWidth: HERO.w, frameHeight: HERO.h });
      this.load.json(HERO.key + '_noms', v(sheet.names));
      this.load.spritesheet(CARS.key, v(CARS.file), { frameWidth: 64, frameHeight: 64 });
      this.load.json(CARS.key + '_meta', v(CARS.meta));
      this.load.spritesheet(PASS.key, v(PASS.file), { frameWidth: 32, frameHeight: 32 });
      this.load.spritesheet(BUS.key, v(BUS.file), { frameWidth: 112, frameHeight: 112 });
      this.load.json(BUS.key + '_meta', v(BUS.meta));
      this.load.json('perso_cases', v(BUS.kid.cases));
      if (TRAIN.gares[NOM_CARTE]) {
        this.load.spritesheet(TRAIN.key, v(TRAIN.file), { frameWidth: TRAIN.w, frameHeight: TRAIN.h });
        this.load.json(TRAIN.key + '_meta', v(TRAIN.meta));
      }
      if (FAUNE.cartes[NOM_CARTE]) {
        this.load.json('faune', v(FAUNE.meta));
        this.load.spritesheet(FINDS.key, v(FINDS.file), { frameWidth: 16, frameHeight: 16 });
        for (const e of FAUNE.cartes[NOM_CARTE]) {
          const z = FAUNE.especes[e].size;
          this.load.spritesheet('faune_' + e, v('assets/faune_' + e + '.png'), { frameWidth: z, frameHeight: z });
        }
      }
      // les enfants de la partie (pour la scène du bus) ; dans une maison, la famille qui y vit
      const h = window.HorlogeSortie ? window.HorlogeSortie.maintenant() : null;
      const planches = ((h && h.enfants) || []).map((e) => sheetKey(e.perso, true));
      this.famille = null;
      if (NOM_CARTE === 'interieur') {
        this.maison = PARAMS.get('maison') || 'maison_rouge';
        this.famille = voisins(this.maison);
        for (const m of this.famille.membres) planches.push(sheetKey(m.perso, m.enfant));
        for (const n of VOISINS.meubles) this.load.image('meuble_' + n, v('assets/meuble_' + n + '.png'));
      }
      for (const k of new Set(planches)) {
        this.load.spritesheet(k, v('assets/personnages/' + k.replace(/_(\d+)$/, (_, n) => '_' + n.padStart(2, '0')) + '.png'), { frameWidth: 16, frameHeight: 32 });
      }
      // les planches des jeux de tuiles : lues dans la carte une fois chargée
      if (MAP.file) this.load.once('filecomplete-tilemapJSON-' + MAP.key, () => {
        const data = this.cache.tilemap.get(MAP.key).data;
        for (const set of data.tilesets) this.load.image(set.name, v('assets/' + set.image));
        // les arbres, les rochers, l'herbe haute (comme à la ferme)
        const has = (n) => data.layers.some((l) => l.type === 'objectgroup' && l.name === n && (l.objects || []).length);
        if (has('arbres')) {
          for (const d of Object.values(NATURE.arbres)) this.load.spritesheet(d.key, v(d.file), { frameWidth: d.w, frameHeight: d.h });
          this.load.image(NATURE.ombre.key, v(NATURE.ombre.file));
        }
        if (has('rochers')) this.load.spritesheet(NATURE.objets.key, v(NATURE.objets.file), { frameWidth: NATURE.objets.size, frameHeight: NATURE.objets.size });
        if (has('herbe_haute')) this.load.spritesheet(NATURE.herbe.key, v(NATURE.herbe.file), { frameWidth: NATURE.herbe.w, frameHeight: NATURE.herbe.h });
        // l'exemplaire du dessus de chaque couche de bâtiment
        for (const name of BATI) {
          const l = data.layers.find((x) => x.name === name);
          if (l && !data.layers.some((x) => x.name === name + '_devant')) data.layers.push({ ...l, name: name + '_devant', data: l.data.slice() });
        }
      });
    }

    create() {
      // insertNull : une case vide reste vide (sans objet Tile) ; la grande ville en compte
      // des centaines de milliers dans ses couches clairsemées
      let map;
      this.layers = {};
      if (MAP.file) {
        map = this.make.tilemap({ key: MAP.key, insertNull: true });
        const sets = map.tilesets.map((s) => map.addTilesetImage(s.name, extrude(this.textures, s.name, s.tileWidth), s.tileWidth, s.tileHeight, 1, 2));
        map.layers.forEach((l, i) => {
          const depth = l.name === DEVANT ? 1e6 : l.name.endsWith('_devant') ? 5e5 + i : -100 + i;
          this.layers[l.name] = map.createLayer(l.name, sets, 0, 0).setDepth(depth);
        });
      } else map = this.buildCave();
      this.map = map;
      this.makeTileAnims();

      // où l'on marche : là où il y a du sol et rien de ce qu'on ne traverse pas (dans une
      // maison : son plancher, voir makeInterior)
      this.walk = [];
      for (let y = 0; y < map.height && this.layers.sol; y++) {
        const row = [];
        for (let x = 0; x < map.width; x++) {
          row.push(!!this.layers.sol.getTileAt(x, y) && !OBSTACLES.some((n) => this.layers[n] && this.layers[n].getTileAt(x, y)));
        }
        this.walk.push(row);
      }
      // les bâtiments et les voitures garées : les tuiles dont le centre est sous leur emprise
      const objects = (name) => (this.cave && this.cave.objects[name]) || ((map.getObjectLayer(name) || {}).objects) || [];
      this.makeBuildings(objects('batiments'));
      for (const r of [...objects('garees'), ...objects('batiments')]) {
        for (let y = Math.floor(r.y / T); y <= Math.floor((r.y + r.height) / T); y++) {
          for (let x = Math.floor(r.x / T); x <= Math.floor((r.x + r.width) / T); x++) {
            const cx = x * T + T / 2, cy = y * T + T / 2;
            if (this.walk[y] && cx >= r.x && cx <= r.x + r.width && cy >= r.y && cy <= r.y + r.height) this.walk[y][x] = false;
          }
        }
      }

      this.makeInterior(map);
      this.makeNature(objects);

      // la fermière : ses images par nom (marche_bas_0…, idle_cote_0…)
      const noms = (this.cache.json.get(HERO.key + '_noms') || {}).frames || [];
      this.frame = (name) => Math.max(0, noms.indexOf(name));
      const arrivee = PARAMS.get('arrivee');
      const d = (arrivee && objects('arrivees').find((o) => o.name === arrivee)) || objects('depart')[0] || (this.famille && VOISINS.entree) || { x: map.widthInPixels / 2, y: map.heightInPixels / 2 };
      this.hero = this.add.sprite(Math.round(d.x), Math.round(d.y), HERO.key, this.frame('idle_bas_0')).setOrigin(0.5, HERO.foot / HERO.h);
      this.shadow = this.add.ellipse(0, 0, 11, 4, 0x1e1a18, 0.35);
      this.heroPos = { x: d.x, y: d.y };
      this.heroAlpha = 1;
      this.locked = false;          // pendant le voyage en train : ni toucher, ni clavier
      this.dialog = false;
      this.face = 'bas';
      this.walked = 0;
      this.path = [];
      this.faded = [];

      // la caméra suit la promeneuse, au pixel près, sans sortir de la carte
      const cam = this.cameras.main;
      cam.setBounds(0, 0, map.widthInPixels, map.heightInPixels);
      cam.startFollow(this.hero, true, 0.12, 0.12);
      cam.setRoundPixels(true);
      this.fitZoom();
      this.scale.on('resize', () => this.fitZoom());

      this.makePassages(objects('passages').concat(this.famille ? [this.interiorExit()] : []));
      // l'heure du jeu (HorlogeSortie : js/ui/excursion.js)
      this.clockEl = document.getElementById('horloge');
      this.clockAt = -1e9;
      this.stepClock(0);
      this.makeHud();
      // un toucher : sur une flèche, changer de carte ; sur la gare, la fenêtre des départs ;
      // sur une trouvaille, la ramasser ; sur un animal ou une grotte, ce qu'on en voit ;
      // ailleurs, y aller
      this.input.on('pointerup', (p) => {
        if (p.getDistance() > 8 || this.locked || this.dialog || this.mining) return;
        const w = cam.getWorldPoint(p.x, p.y);
        this.work = null;
        this.entering = null;
        const a = this.passages.find((q) => q.arrow.visible && Math.abs(w.x - q.arrow.x) <= 18 && Math.abs(w.y - q.arrow.y) <= 18);
        if (a) { this.leave(a); return; }
        if (this.tapFind(w) || this.tapAnimal(w) || this.tapGare(w) || this.tapOre(w) || this.tapLieu(w) || this.tapNature(w) || this.tapVoisin(w)) return;
        if (this.god()) { this.teleport(w.x, w.y); return; }
        if (this.tapMaison(w)) return;
        this.goTo(w.x, w.y);
      });
      // le god mode : glisser déplace la vue (la caméra ne suit plus le personnage)
      this.input.on('pointermove', (p) => {
        if (!p.isDown || !this.god() || this.locked || this.dialog || p.getDistance() < 8) return;
        if (this.followOn !== false) { cam.stopFollow(); this.followOn = false; }
        cam.scrollX -= (p.x - p.prevPosition.x) / cam.zoom;
        cam.scrollY -= (p.y - p.prevPosition.y) / cam.zoom;
      });
      // les trajets du bus de l'école roulent avec les autres (mêmes carrefours), sans voitures tirées dessus
      const busObjs = objects('bus');
      this.makeTraffic(objects('routes').concat(busObjs.filter((o) => o.polyline && /^bus_/.test(o.name)).map((o) => Object.assign({}, o, { bus: true }))), objects('carrefours'));
      this.makeSchool(busObjs);
      this.makeGare(objects('gare'));
      this.makeFinds(objects('trouvailles'));
      this.makeFauna(objects('animaux'));
      this.makeCaveLife();
      this.lieux = objects('lieux');
      this.keys = this.input.keyboard ? this.input.keyboard.addKeys('UP,DOWN,LEFT,RIGHT,Z,Q,S,D,W,A') : null;
      window.Ville = { scene: this };
    }

    // Les flèches des passages : posées dans le rectangle, du côté de la carte (à 12 px du bord).
    makePassages(objs) {
      this.passages = objs.map((o) => {
        const prop = (n) => ((o.properties || []).find((q) => q.name === n) || {}).value;
        const sens = PASS.sens.includes(prop('sens')) ? prop('sens') : 'droite';
        const cx = o.x + o.width / 2, cy = o.y + o.height / 2;
        const x = sens === 'gauche' ? o.x + 16 : sens === 'droite' ? o.x + o.width - 16 : cx;
        const y = sens === 'haut' ? o.y + 16 : sens === 'bas' ? o.y + o.height - 16 : cy;
        const arrow = this.add.image(Math.round(x), Math.round(y), PASS.key, PASS.sens.indexOf(sens)).setDepth(2e6).setVisible(false);
        // `proche` : la distance où la flèche paraît (une porte : tout près)
        return { name: o.name, cible: prop('cible'), sens, rect: o, x, y, arrow, near: Number(prop('proche')) || PASS.near };
      }).filter((q) => q.cible && this.textures.exists(PASS.key));
    }

    // Chaque image : une flèche paraît près de la promeneuse et se balance dans son sens.
    stepPassages(time) {
      const P = this.heroPos;
      for (const q of this.passages) {
        const r = q.rect;
        const d = Math.hypot(Math.max(r.x - P.x, 0, P.x - r.x - r.width), Math.max(r.y - P.y, 0, P.y - r.y - r.height));
        q.arrow.setVisible(d <= q.near || this.god());
        if (!q.arrow.visible) continue;
        const k = reduced() ? 0 : Math.round(Math.sin(time / 220) * PASS.bob);
        const [dx, dy] = { droite: [1, 0], gauche: [-1, 0], haut: [0, -1], bas: [0, 1] }[q.sens];
        q.arrow.setPosition(Math.round(q.x + dx * k), Math.round(q.y + dy * k));
      }
    }

    // L'heure du jeu, relue chaque seconde (null : pas de partie sur cet appareil).
    stepClock(time) {
      if (time - this.clockAt < 1000) return;
      this.clockAt = time;
      this.time = window.HorlogeSortie ? window.HorlogeSortie.maintenant() : null;
      if (this.clockEl) {
        this.clockEl.hidden = !this.time;
        if (this.time) this.clockEl.textContent = '🕐 ' + window.HorlogeSortie.texte(this.time);
      }
    }

    // Le god mode (Options du jeu) : un toucher pose le personnage, les flèches sont toutes là.
    god() {
      const H = hote();
      return !!(H && H.god && H.god());
    }

    // Le personnage posé d'un coup sur la case libre la plus proche de (x, y) ; la caméra le suit de nouveau.
    teleport(x, y) {
      let gx = Math.floor(x / T), gy = Math.floor(y / T), best = this.canWalk(gx, gy) ? { x: gx, y: gy } : null;
      for (let r = 1; r < 12 && !best; r++) {
        for (let dy = -r; dy <= r && !best; dy++) for (let dx = -r; dx <= r; dx++) {
          if (Math.max(Math.abs(dx), Math.abs(dy)) === r && this.canWalk(gx + dx, gy + dy)) { best = { x: gx + dx, y: gy + dy }; break; }
        }
      }
      if (!best) return;
      this.path = [];
      this.work = null;
      this.heroPos.x = best.x === gx && best.y === gy ? x : best.x * T + T / 2;
      this.heroPos.y = best.x === gx && best.y === gy ? y : best.y * T + T - 2;
      this.hero.setPosition(Math.round(this.heroPos.x), Math.round(this.heroPos.y));
      if (this.followOn === false) { this.cameras.main.startFollow(this.hero, true, 0.12, 0.12); this.followOn = true; }
    }

    // Changer de carte : la page cible (une autre carte, ou la ferme).
    leave(q) {
      if (this.leaving) return;
      this.leaving = true;
      this.cameras.main.fadeOut(reduced() ? 0 : 250, 0, 0, 0);
      setTimeout(() => { if (hote()) hote().go(q.cible); else window.location.href = q.cible; }, reduced() ? 0 : 260);
    }

    fitZoom() {
      const { width, height } = this.scale;
      this.cameras.main.setZoom(Math.max(2, Math.min(5, Math.floor(Math.min(width, height) / 170))));
    }

    // Tuiles animées (l'eau des fontaines) : les animations des jeux de tuiles (Tiled), jouées
    // en changeant l'index des tuiles posées, toutes au même rythme que l'horloge.
    makeTileAnims() {
      this.tileAnims = [];
      const groups = new Map();
      for (const set of this.map.tilesets) {
        for (const [id, def] of Object.entries(set.tileData || {})) {
          if (!def.animation || def.animation.length < 2) continue;
          const gid = set.firstgid + Number(id);
          groups.set(gid, { frames: def.animation.map((f) => set.firstgid + f.tileid), ms: def.animation[0].duration, tiles: [] });
        }
      }
      if (!groups.size) return;
      for (const layer of Object.values(this.layers)) {
        layer.forEachTile((t) => { const g = groups.get(t.index); if (g) g.tiles.push(t); });
      }
      this.tileAnims = [...groups.values()].filter((g) => g.tiles.length);
    }

    stepTileAnims(time) {
      if (reduced()) return;
      for (const g of this.tileAnims) {
        const k = Math.floor(time / g.ms) % g.frames.length;
        if (k === g.cur) continue;
        g.cur = k;
        for (const t of g.tiles) t.index = g.frames[k];
      }
    }

    // ---------- les bâtiments ----------

    // Chaque tuile de bâtiment appartient au bâtiment dont le dessin la couvre (de son « haut »
    // à sa base, un peu plus large pour les débords de toit) ; celles de l'exemplaire du dessus
    // qui n'appartiennent à aucun (les marches, posées au sol) en sont retirées.
    makeBuildings(objs) {
      this.buildings = objs.map((o) => {
        const p = (o.properties || []).find((q) => q.name === 'haut');
        return { name: o.name, x0: o.x - 8, x1: o.x + o.width + 8, top: p ? p.value : o.y, base: o.y + o.height };
      });
      this.covered = [];
      // la tuile appartient au bâtiment le plus en avant (le plus bas) qui la recouvre : le
      // toit d'un bâtiment de devant passe sur le pied de celui de derrière
      this.owner = (x, y) => {
        let best = null;
        for (const b of this.buildings) if (x >= b.x0 && x < b.x1 && y >= b.top && y < b.base && (!best || b.base > best.base)) best = b;
        return best;
      };
      for (const name of BATI) {
        const up = this.layers[name + '_devant'], down = this.layers[name];
        if (!up) continue;
        up.forEachTile((t) => {
          if (t.index < 0) return;
          const b = this.owner(t.pixelX + T / 2, t.pixelY + T / 2);
          if (!b) { up.removeTileAt(t.x, t.y); return; }
          t.bat = b;
          t.down = down.getTileAt(t.x, t.y);
        });
      }
    }

    // Autour de chaque personnage (sa boîte, en px) : devant un bâtiment, l'exemplaire du
    // dessus s'efface (on la voit devant le mur) ; derrière, il devient transparent et celui du
    // dessous s'efface (on la voit à travers) — pour la promeneuse seulement, les voitures
    // passent simplement derrière.
    uncover(boxes) {
      for (const t of this.covered) { t.alpha = 1; if (t.down) t.down.alpha = 1; }
      this.covered = [];
      for (const { x, y, w, h, foot, see } of boxes) {
        for (const name of BATI) {
          const up = this.layers[name + '_devant'];
          if (!up) continue;
          for (const t of up.getTilesWithinWorldXY(x, y, w, h) || []) {
            if (!t.bat) continue;
            if (foot >= t.bat.base) t.alpha = 0;
            else if (see) { t.alpha = BATI_ALPHA; if (t.down) t.down.alpha = 0; } else continue;
            this.covered.push(t);
          }
        }
      }
    }

    // ---------- la circulation ----------

    // Les trajets : chaque polyligne de « routes », ses coins arrondis (une courbe de Bézier
    // entre les deux points à CARS.corner du coin), puis des points tous les ~2 px avec leur
    // abscisse au sol ; et, pour chaque carrefour, où le trajet y entre et en sort.
    makeTraffic(routes, crossings) {
      this.cars = [];
      this.carMeta = this.cache.json.get(CARS.key + '_meta') || { couleurs: ['rouge'], directions: { droite: 0 } };
      this.crossings = crossings.map((r) => ({ name: r.name, x0: r.x - 8, y0: r.y - 8, x1: r.x + r.width + 8, y1: r.y + r.height + 8, held: new Set() }));
      this.routes = routes.filter((o) => o.polyline && o.polyline.length > 1).map((o) => {
        const pts = o.polyline.map((p) => ({ x: o.x + p.x, y: o.y + p.y }));
        const out = [pts[0]];
        const line = (a, b) => {
          const n = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / 2));
          for (let i = 1; i <= n; i++) out.push({ x: a.x + (b.x - a.x) * i / n, y: a.y + (b.y - a.y) * i / n });
        };
        let cur = pts[0];
        for (let i = 1; i < pts.length - 1; i++) {
          const a = pts[i - 1], p = pts[i], b = pts[i + 1];
          const la = Math.hypot(a.x - p.x, a.y - p.y), lb = Math.hypot(b.x - p.x, b.y - p.y);
          const r = Math.min(CARS.corner, la / 2, lb / 2);
          const p1 = { x: p.x + (a.x - p.x) / la * r, y: p.y + (a.y - p.y) / la * r };
          const p2 = { x: p.x + (b.x - p.x) / lb * r, y: p.y + (b.y - p.y) / lb * r };
          line(cur, p1);
          for (let k = 1; k <= 16; k++) {
            const t = k / 16, u = 1 - t;
            out.push({ x: u * u * p1.x + 2 * u * t * p.x + t * t * p2.x, y: u * u * p1.y + 2 * u * t * p.y + t * t * p2.y });
          }
          cur = p2;
        }
        line(cur, pts[pts.length - 1]);
        let s = 0;
        out.forEach((p, i) => { if (i) s += Math.hypot(p.x - out[i - 1].x, (p.y - out[i - 1].y) / KY); p.s = s; });
        const spans = this.crossings.map((c) => {
          const inside = out.filter((p) => p.x >= c.x0 && p.x <= c.x1 && p.y >= c.y0 && p.y <= c.y1);
          return inside.length ? { enter: inside[0].s, exit: inside[inside.length - 1].s, pts: inside } : null;
        });
        return { name: o.name, pts: out, length: s, spans, bus: !!o.bus };
      });
      this.carRoutes = this.routes.filter((r) => !r.bus);
      // deux trajets se gênent dans un carrefour s'ils y passent tout près l'un de l'autre
      this.conflict = this.crossings.map((c, k) => this.routes.map((a) => this.routes.map((b) => {
        const sa = a.spans[k], sb = b.spans[k];
        if (!sa || !sb) return false;
        // (un point sur trois : ils sont à ~2 px les uns des autres)
        for (let i = 0; i < sa.pts.length; i += 3) {
          const p = sa.pts[i];
          for (let j = 0; j < sb.pts.length; j += 3) if (Math.hypot(p.x - sb.pts[j].x, (p.y - sb.pts[j].y) / KY) < CARS.cross) return true;
        }
        return false;
      })));
      this.routes.forEach((r, i) => { r.index = i; });
      this.nextSpawn = 600;
      if (reduced() || !this.carRoutes.length || !this.textures.exists(CARS.key)) return;
      // quelques voitures déjà en route, hors des carrefours
      for (let n = 0; n < 10; n++) {
        const r = Phaser.Utils.Array.GetRandom(this.carRoutes);
        const s = 120 + Math.random() * (r.length - 240);
        if (r.spans.some((sp) => sp && s > sp.enter - 40 && s < sp.exit + 10)) continue;
        this.addCar(r, s);
      }
    }

    // Le point du trajet à l'abscisse s, et la direction (au sol) où l'on roule.
    pointAt(r, car) {
      const pts = r.pts;
      while (car.i < pts.length - 2 && pts[car.i + 1].s < car.s) car.i++;
      const a = pts[car.i], b = pts[car.i + 1] || a;
      const t = b.s > a.s ? Math.min(1, Math.max(0, (car.s - a.s) / (b.s - a.s))) : 0;
      const c = pts[Math.min(pts.length - 1, car.i + 3)], p = pts[Math.max(0, car.i - 2)];
      const dx = c.x - p.x, dy = (c.y - p.y) / KY, l = Math.hypot(dx, dy) || 1;
      return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, dx: dx / l, dy: dy / l };
    }

    // Une voiture sur ce trajet, à l'abscisse s (0 : à l'entrée, hors de la carte), si la place
    // est libre.
    addCar(route, s = 0) {
      const m = this.carMeta;
      const car = { route, s, i: 0, v: s ? CARS.speed : CARS.speed * 0.8, color: Math.floor(Math.random() * m.couleurs.length), held: new Set() };
      Object.assign(car, this.pointAt(route, car));
      if (this.cars.some((o) => Math.hypot(o.x - car.x, (o.y - car.y) / KY) < CARS.gap * 1.3)) return null;
      const anchor = m.anchor || { x: 32, y: 40 };
      car.sprite = this.add.sprite(0, 0, CARS.key, 0).setOrigin(anchor.x / (m.frameWidth || 64), anchor.y / (m.frameHeight || 64));
      this.cars.push(car);
      this.placeCar(car);
      return car;
    }

    placeCar(car) {
      const dirs = Object.keys(this.carMeta.directions).length || 8;
      let a = Math.atan2(car.dy, car.dx) * 180 / Math.PI;
      if (a < 0) a += 360;
      const k = Math.round(a / (360 / dirs)) % dirs;
      car.sprite.setFrame(car.bus ? k : car.color * dirs + k).setPosition(Math.round(car.x), Math.round(car.y)).setDepth(car.y);
    }

    stepTraffic(time, dt) {
      if (!this.routes || !this.routes.length || reduced()) return;
      this.nextSpawn -= dt * 1000;
      if (this.nextSpawn <= 0) {
        this.nextSpawn = CARS.spawn[0] + Math.random() * (CARS.spawn[1] - CARS.spawn[0]);
        if (this.carRoutes.length && this.cars.length < CARS.max && this.textures.exists(CARS.key)) this.addCar(Phaser.Utils.Array.GetRandom(this.carRoutes));
      }
      const hero = this.heroPos;
      for (const car of [...this.cars]) {
        const r = car.route;
        // la place devant : la voiture de devant, la promeneuse, un carrefour occupé
        let room = Infinity;
        const ahead = (x, y) => {
          const ex = x - car.x, ey = (y - car.y) / KY;
          return { along: ex * car.dx + ey * car.dy, side: Math.abs(ex * car.dy - ey * car.dx) };
        };
        for (const o of this.cars) {
          // (celles d'en face ou qui croisent en sens contraire : affaire des carrefours)
          if (o === car || o.dx * car.dx + o.dy * car.dy < -0.3) continue;
          const d = ahead(o.x, o.y);
          // (un bus est plus long : on le suit de plus loin)
          const gap = CARS.gap + (car.bus ? BUS.half - BUS.carHalf : 0) + (o.bus ? BUS.half - BUS.carHalf : 0);
          if (d.along > 0 && d.side < CARS.lane) room = Math.min(room, d.along - gap);
        }
        // le bus de l'école s'arrête à son arrêt, le temps que les enfants montent ou descendent
        if (car.stopAt !== undefined && car.stopAt !== null) {
          room = Math.min(room, car.stopAt - car.s);
          car.atStop = car.stopAt - car.s < 3 && car.v < 2;
        }
        const h = ahead(hero.x, hero.y);
        if (h.along > 0 && h.side < CARS.lane) room = Math.min(room, h.along - CARS.hero);
        this.crossings.forEach((c, k) => {
          const sp = r.spans[k];
          if (!sp || car.held.has(k) || car.s > sp.exit) return;
          const before = sp.enter - car.s;
          if (before > CARS.stop + 30) return;
          const blocked = [...c.held].some((o) => o !== car && this.conflict[k][r.index][o.route.index]);
          if (blocked) room = Math.min(room, before - CARS.stop);
          else if (before < CARS.stop + 6) { c.held.add(car); car.held.add(k); }
        });
        // la vitesse : freiner pour s'arrêter à temps, sinon reprendre de la vitesse
        const top = car.bus ? BUS.speed : CARS.speed;
        const target = room <= 0 ? 0 : Math.min(top, Math.sqrt(2 * CARS.decel * room));
        car.v = target < car.v ? target : Math.min(target, car.v + CARS.accel * dt);
        car.s += car.v * dt;
        // sortie d'un carrefour
        for (const k of [...car.held]) {
          if (car.s > r.spans[k].exit) { car.held.delete(k); this.crossings[k].held.delete(car); }
        }
        if (car.s >= r.length) {
          for (const k of car.held) this.crossings[k].held.delete(car);
          car.sprite.destroy();
          this.cars.splice(this.cars.indexOf(car), 1);
          continue;
        }
        Object.assign(car, this.pointAt(r, car));
        this.placeCar(car);
        if (car.alpha !== undefined && car.alpha < 1) { car.alpha = Math.min(1, car.alpha + dt * 2); car.sprite.setAlpha(car.alpha); }
      }
    }

    // ---------- le bus de l'école ----------

    makeSchool(objs) {
      this.kids = [];
      this.school = null;
      this.schoolDone = new Set();
      this.busStops = {};
      this.kidPaths = {};
      for (const o of objs) {
        if (o.point) this.busStops[o.name] = { x: o.x, y: o.y };
        else if (o.polyline && /^enfants_/.test(o.name)) this.kidPaths[o.name] = o.polyline.map((p) => ({ x: o.x + p.x, y: o.y + p.y }));
      }
      const noms = (this.cache.json.get('perso_cases') || {}).frames || [];
      this.kidFrame = (name) => Math.max(0, noms.indexOf(name));
    }

    // Le bus sur son trajet, depuis l'entrée ; il s'arrêtera au point du trajet le plus proche de l'arrêt.
    // L'abscisse (au sol) de l'arrêt sur un trajet du bus.
    stopOn(routeName, stop) {
      const route = this.routes.find((r) => r.name === routeName);
      let best = null;
      for (const p of route ? route.pts : []) { const d = Math.hypot(p.x - stop.x, p.y - stop.y); if (!best || d < best.d) best = { d, s: p.s }; }
      return best ? best.s : null;
    }

    addBus(routeName, stop) {
      const route = this.routes.find((r) => r.name === routeName);
      if (!route || !this.textures.exists(BUS.key)) return null;
      const meta = this.cache.json.get(BUS.key + '_meta') || { anchor: { x: 56, y: 70 }, frameWidth: 112, frameHeight: 112 };
      const stopS = this.stopOn(routeName, stop);
      const s0 = stopS === null ? 0 : Math.max(0, stopS - BUS.lead);
      const car = { route, s: s0, i: 0, v: BUS.speed, color: 0, held: new Set(), bus: true, atStop: false, stopAt: stopS, alpha: s0 > 0 ? 0 : 1 };
      Object.assign(car, this.pointAt(route, car));
      car.sprite = this.add.sprite(0, 0, BUS.key, 0).setOrigin(meta.anchor.x / meta.frameWidth, meta.anchor.y / meta.frameHeight).setAlpha(car.alpha);
      this.cars.push(car);
      this.placeCar(car);
      return car;
    }

    // Un enfant qui marche le long de `pts` (il paraît au premier point, en fondu) ; `bout` : il
    // s'efface au bout du chemin (descendu du bus, il arrive à la porte ou au bord de la carte).
    addKid(perso, pts, k, bout) {
      const key = sheetKey(perso, true);
      if (!this.textures.exists(key) || !pts || pts.length < 2) return null;
      const dx = (k % 2 ? 1 : -1) * 5 * Math.ceil(k / 2);
      const kid = {
        s: this.add.sprite(pts[0].x + dx, pts[0].y, key, this.kidFrame('idle_bas_0')).setOrigin(0.5, 30 / 32).setAlpha(0),
        pts: pts.map((p, i) => ({ x: p.x + (i ? dx : dx), y: p.y })), i: 1, x: pts[0].x + dx, y: pts[0].y, alpha: 0, fade: 1, walked: 0, face: 'bas', arrived: false,
        wait: k * 0.6, bout: !!bout,
      };
      this.kids.push(kid);
      return kid;
    }

    stepKids(dt, time) {
      for (const kid of [...this.kids]) {
        let moving = false;
        if (kid.wait > 0) kid.wait -= dt;
        else if (!kid.arrived) {
          const to = kid.pts[kid.i];
          const dx = to.x - kid.x, dy = to.y - kid.y, l = Math.hypot(dx, dy), st = BUS.kid.speed * dt;
          if (Math.abs(dx) > Math.abs(dy) * 0.8) { kid.face = 'cote'; kid.s.setFlipX(dx < 0); } else { kid.face = dy > 0 ? 'bas' : 'haut'; kid.s.setFlipX(false); }
          if (l <= st) { kid.x = to.x; kid.y = to.y; kid.i++; if (kid.i >= kid.pts.length) kid.arrived = true; } else { kid.x += (dx / l) * st; kid.y += (dy / l) * st; }
          kid.walked += Math.min(l, st);
          moving = true;
        }
        if (kid.arrived && kid.bout && kid.fade >= 0) kid.fade = -1;
        if (kid.fade) {
          kid.alpha = Math.max(0, Math.min(1, kid.alpha + (kid.fade * dt) / BUS.kid.fade));
          if (kid.alpha >= 1 && kid.fade > 0) kid.fade = 0;
          if (kid.alpha <= 0 && kid.fade < 0) { kid.s.destroy(); this.kids.splice(this.kids.indexOf(kid), 1); continue; }
        }
        kid.s.setFrame(this.kidFrame(moving ? `marche_${kid.face}_${Math.floor(kid.walked / 4) % 4}` : `idle_${kid.face}_${Math.floor(time / 600) % 2}`));
        kid.s.setPosition(Math.round(kid.x), Math.round(kid.y)).setDepth(kid.y).setAlpha(kid.alpha);
      }
    }

    // Les jours d'école, aux heures de la scène : le bus arrive ; les enfants montent (ils sont
    // venus à pied jusqu'à l'arrêt) ou descendent (et vont à pied jusqu'au bout de leur chemin,
    // où ils s'effacent) ; puis le bus repart. Une scène par jour, matin et soir.
    stepSchool(time, dt) {
      this.stepKids(dt, time);
      const t = this.time, list = BUS.scenes[NOM_CARTE] || [];
      const sc = this.school;
      if (!sc) {
        if (!t || t.nuit || !window.HorlogeSortie.JOURS_ECOLE.includes(t.semaine) || !t.enfants.length || reduced()) return;
        const def = list.find((d) => t.heure >= d.debut && t.heure < d.fin && !this.schoolDone.has(t.jour + ':' + d.nom));
        if (!def) return;
        const stop = this.busStops[def.arret], pts = this.kidPaths[def.enfants];
        if (!stop || !pts) return;
        this.schoolDone.add(t.jour + ':' + def.nom);
        // ils montent : les enfants viennent à pied jusqu'à l'arrêt ; le premier des deux à
        // partir (eux ou le bus) part tout de suite, l'autre de façon à arriver en même temps
        const stopS = this.stopOn(def.bus, stop);
        const tBus = stopS === null ? 0 : Math.min(stopS, BUS.lead) / BUS.speed;
        let len = 0;
        for (let i = 1; i < pts.length; i++) len += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
        const tKids = def.monter ? len / BUS.kid.speed + 0.6 * t.enfants.length : 0;
        this.school = { def, bus: null, phase: 'attente', kids: [], wait: 0, busIn: Math.max(0, tKids - tBus), kidsIn: Math.max(0, tBus - tKids) };
        return;
      }
      const { def } = sc;
      if (sc.phase === 'attente') {
        sc.busIn -= dt; sc.kidsIn -= dt;
        if (def.monter && !sc.kids.length && sc.kidsIn <= 0) sc.kids = t.enfants.map((e, k) => this.addKid(e.perso, this.kidPaths[def.enfants], k)).filter(Boolean);
        if (!sc.bus && sc.busIn <= 0) { sc.bus = this.addBus(def.bus, this.busStops[def.arret]); if (!sc.bus) { this.school = null; return; } }
        if (sc.bus && (!def.monter || sc.kids.length)) sc.phase = 'arrivee';
        if (sc.phase === 'attente') return;
      }
      const bus = sc.bus;
      if (!this.cars.includes(bus)) { this.school = null; return; }      // il est sorti de la carte
      if (sc.phase === 'arrivee' && bus.atStop) {
        sc.phase = 'arret';
        if (!def.monter) sc.kids = t.enfants.map((e, k) => this.addKid(e.perso, this.kidPaths[def.enfants], k, true)).filter(Boolean);
        sc.wait = BUS.resume;
      }
      if (sc.phase === 'arret') {
        if (def.monter) {
          // tous à l'arrêt : ils montent (s'effacent), puis le bus repart
          if (sc.kids.every((k) => k.arrived || !this.kids.includes(k))) {
            for (const k of sc.kids) if (k.fade >= 0) k.fade = -1;
            sc.wait -= dt;
            if (sc.wait <= 0) { bus.stopAt = null; sc.phase = 'depart'; }
          }
        } else {
          sc.wait -= dt;
          if (sc.wait <= 0) { bus.stopAt = null; sc.phase = 'depart'; }
        }
      }
    }

    // ---------- les messages, la fenêtre de la gare ----------

    makeHud() {
      ensureDom();
      this.msgEl = document.getElementById('message');
      this.gareEl = document.getElementById('gare-fenetre');
      const aide = document.getElementById('aide-texte');
      const textes = {
        ville: 'Touchez un trottoir pour y marcher · la gare, un étal du marché, un entrepôt',
        montagne: 'Touchez l’alpage pour y marcher · une trouvaille pour la ramasser · la gare pour rentrer',
        plage: 'Touchez le sable pour y marcher · une trouvaille pour la ramasser · la gare pour rentrer',
        grotte: 'Touchez le sol pour y marcher · un minerai pour le piocher · l\u2019échelle pour remonter',
        transition: 'Touchez l’herbe pour y marcher · une maison pour y entrer · la hache ou la pioche en main (barre d’outils) : un arbre, un rocher',
        interieur: 'Touchez le plancher pour y marcher · un voisin pour lui parler · la flèche pour sortir',
      };
      if (aide && textes[NOM_CARTE]) aide.textContent = textes[NOM_CARTE];
      const annuler = document.getElementById('gare-annuler');
      if (annuler) annuler.onclick = () => this.closeGare();
      const fermer = document.getElementById('lieu-fermer');
      if (fermer) fermer.onclick = () => this.closeLieu();
      this.onKey = (e) => { if (e.key === 'Escape' && this.dialog) { if (this.lieu) this.closeLieu(); else this.closeGare(); } };
      window.addEventListener('keydown', this.onKey);
      this.events.once('destroy', () => window.removeEventListener('keydown', this.onKey));
      if (hote() && textes[NOM_CARTE]) this.say('💡 ' + textes[NOM_CARTE]);
    }

    say(texte) {
      if (hote() && hote().say) { hote().say(texte); return; }
      if (!this.msgEl) return;
      this.msgEl.textContent = texte;
      this.msgEl.hidden = false;
      clearTimeout(this.sayTimer);
      this.sayTimer = setTimeout(() => { this.msgEl.hidden = true; }, 3600);
    }

    // La gare touchée (le dessin du bâtiment « gare ») : la fenêtre des départs.
    tapGare(w) {
      const b = (this.buildings || []).find((q) => q.name === 'gare');
      if (!b || !this.gare || !TRAIN.gares[NOM_CARTE] || w.x < b.x0 || w.x > b.x1 || w.y < b.top || w.y > b.base + 8) return false;
      this.openGare();
      return true;
    }

    openGare() {
      const el = this.gareEl, list = TRAIN.gares[NOM_CARTE];
      if (!el || !list) return;
      const box = document.getElementById('gare-choix');
      box.textContent = '';
      for (const d of list) {
        const b = document.createElement('button');
        b.type = 'button';
        b.textContent = d.label;
        b.addEventListener('click', () => this.startTrip(d));
        box.appendChild(b);
      }
      const texte = document.getElementById('gare-texte');
      if (texte) texte.textContent = list.length > 1 ? 'Le train part dans un instant. Où voulez-vous aller ?' : 'Le train vous ramène à la gare de la ville.';
      el.hidden = false;
      this.dialog = true;
      const first = box.querySelector('button');
      if (first) first.focus();
    }

    closeGare() {
      if (this.gareEl) this.gareEl.hidden = true;
      // (le relâchement du clic qui ferme la fenêtre ne doit pas faire marcher la promeneuse)
      setTimeout(() => { this.dialog = false; }, 60);
    }

    // ---------- le marché de la ville, les entreprises ----------

    // La ferme (js/ui/excursion.js) : ce qu'elle peut vendre ici et à quel prix, ses pièces,
    // ses entreprises ; null sans partie.
    vitrine() {
      return hote() && hote().vitrine ? hote().vitrine() : null;
    }

    tapLieu(w) {
      const etal = (this.lieux || []).find((o) => o.name === 'marche' && w.x >= o.x && w.x <= o.x + o.width && w.y >= o.y && w.y <= o.y + o.height);
      if (etal) { this.openLieu('marche'); return true; }
      const v = this.vitrine();
      const ids = v ? v.entreprises.map((e) => e.id) : ['conserverie', 'fromagerie', 'confiturerie'];
      const b = (this.buildings || []).find((q) => ids.includes(q.name) && w.x >= q.x0 && w.x <= q.x1 && w.y >= q.top && w.y <= q.base + 8);
      if (b) { this.openLieu(b.name); return true; }
      return false;
    }

    openLieu(quoi) {
      const el = document.getElementById('lieu-fenetre');
      if (!el) return;
      this.lieu = quoi;
      this.renderLieu();
      el.hidden = false;
      this.dialog = true;
      const b = el.querySelector('button:not([disabled])');
      if (b) b.focus();
    }

    closeLieu() {
      const el = document.getElementById('lieu-fenetre');
      if (el) el.hidden = true;
      this.lieu = null;
      setTimeout(() => { this.dialog = false; }, 60);
    }

    renderLieu() {
      const titre = document.getElementById('lieu-titre'), corps = document.getElementById('lieu-corps');
      const v = this.vitrine(), H = hote();
      const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
      if (this.lieu === 'marche') {
        titre.textContent = '🧺 Le marché de la ville';
        if (!v) { corps.innerHTML = '<p class="note">Il faut une partie en cours pour vendre les produits de la ferme.</p>'; return; }
        const rangs = v.vente.map((r) => `<div class="rang"><span aria-hidden="true">${esc(r.icone)}</span><span class="nom">${esc(r.nom)} <small>× ${r.qte}</small></span><span>${r.prix} 💰</span>
            <button type="button" data-vendre="${esc(r.item)}" data-n="1">Vendre 1</button>
            <button type="button" data-vendre="${esc(r.item)}" data-n="${r.qte}">Tout</button></div>`).join('');
        corps.innerHTML = `<p class="note">On achète ici les produits de la ferme plus cher qu'au Marché de la ferme. 💰 ${v.pieces} pièces.</p>
          <div class="rangs">${rangs || '<p class="note">Rien à vendre : pas de produits de la ferme en stock.</p>'}</div>`;
        corps.querySelectorAll('[data-vendre]').forEach((b) => { b.onclick = () => {
          const it = b.dataset.vendre, r = H.vendre(it, Number(b.dataset.n) || 0);
          const def = v.vente.find((q) => q.item === it);
          if (r && r.ok && def) this.say(`🧺 Vendu : ${r.sold} ${def.icone} ${def.nom.toLowerCase()} (+${r.gain} 💰)`);
          this.renderLieu();
        }; });
        return;
      }
      const e = v && v.entreprises.find((q) => q.id === this.lieu);
      const nom = this.lieu.charAt(0).toUpperCase() + this.lieu.slice(1);
      if (!e) { titre.textContent = '🏭 ' + nom; corps.innerHTML = '<p class="note">Il faut une partie en cours pour acheter cette entreprise.</p>'; return; }
      titre.textContent = `${e.icone} ${e.nom}`;
      const fait = `${e.texte} Chaque jour à ${e.heure} h, elle prend ${e.par} ${e.intrantNom} de la ferme par ${e.produit.toLowerCase()} et le vend ${e.prixProduit} 💰.`;
      if (!e.achetee) {
        corps.innerHTML = `<p class="note">${esc(fait)}</p><p class="note">Prix : <strong>${e.prix} 💰</strong> · vos pièces : ${v.pieces} 💰</p>
          <div class="choix"><button type="button" id="lieu-acheter"${v.pieces >= e.prix ? '' : ' disabled'}>${v.pieces >= e.prix ? `Acheter la ${esc(e.nom.toLowerCase())}` : 'Pas assez de pièces'}</button></div>`;
        const b = document.getElementById('lieu-acheter');
        if (b) b.onclick = () => {
          const r = H.acheter(e.id);
          if (r && r.ok) this.say(`${e.icone} La ${e.nom.toLowerCase()} est à vous !`);
          this.renderLieu();
        };
        return;
      }
      const b = e.bilan;
      corps.innerHTML = `<p class="note">${esc(fait)}</p>
        <div class="quota"><button type="button" data-q="-1"${e.quota > 0 ? '' : ' disabled'} aria-label="Un de moins">−</button><span>Quota : <strong>${e.quota}</strong> ${esc(e.produit.toLowerCase())}${e.quota > 1 ? 's' : ''} par jour</span><button type="button" data-q="1"${e.quota < e.quotaMax ? '' : ' disabled'} aria-label="Un de plus">+</button></div>
        <p class="note">${b ? `Le jour ${b.jour} : ${b.unites} fabriqués, +${b.gain} 💰.` : 'Pas encore de production.'} En stock à la ferme : ${e.dispo} ${esc(e.intrantNom)}.</p>`;
      corps.querySelectorAll('[data-q]').forEach((btn) => { btn.onclick = () => {
        H.quota(e.id, e.quota + Number(btn.dataset.q));
        this.renderLieu();
      }; });
    }

    // ---------- le train ----------

    makeGare(objs) {
      const pt = (n) => objs.find((o) => o.name === n);
      const arret = pt('arret'), quai = pt('quai');
      this.train = null;
      this.trip = null;
      this.arrival = null;
      this.trainMeta = this.cache.json.get(TRAIN.key + '_meta') || null;
      this.gare = arret && this.trainMeta && this.textures.exists(TRAIN.key)
        ? { x: arret.x, stopY: arret.y, quai: quai ? { x: quai.x, y: quai.y } : { x: arret.x + 26, y: arret.y } } : null;
      if (!this.gare) return;
      const sens = PARAMS.get('train'), terminus = !!TRAIN.terminus[NOM_CARTE];
      if (sens === 'nord' || sens === 'sud') this.arriveByTrain(sens === 'nord' ? -1 : 1, terminus);
      else if (terminus) this.addTrain(this.gare.stopY, 0);          // à quai : il attend le retour
    }

    // La rame : ses trois voitures, `y` le milieu de celle du milieu ; dir : -1 vers le nord, 1 vers le sud.
    addTrain(y, dir) {
      const m = this.trainMeta;
      if (this.train) for (const s of this.train.parts) s.destroy();
      const parts = m.pieces.map((_, k) => this.add.sprite(this.gare.x, y, TRAIN.key, k).setOrigin(m.anchor.x / m.frameWidth, m.anchor.y / m.frameHeight));
      this.train = { y, v: 0, dir, parts, alpha: 1, mode: 'arret', gone: 0, fadeIn: false, fadeOut: false };
      this.placeTrain();
      return this.train;
    }

    // Il arrive : il paraît à TRAIN.lead px de l'arrêt, en fondu, et freine pour s'arrêter pile.
    trainIn(dir) {
      const t = this.addTrain(this.gare.stopY - dir * TRAIN.lead, dir);
      Object.assign(t, { mode: 'approche', v: TRAIN.speed, alpha: 0, fadeIn: true });
      this.placeTrain();
      return t;
    }

    placeTrain() {
      const t = this.train, m = this.trainMeta, n = t.parts.length;
      t.parts.forEach((s, k) => {
        const y = t.y + (k - (n - 1) / 2) * m.pas;
        s.setPosition(Math.round(this.gare.x), Math.round(y)).setDepth(y).setAlpha(t.alpha);
      });
    }

    stepTrain(dt) {
      const t = this.train;
      if (!t) return;
      if (t.mode === 'approche') {
        const rest = (this.gare.stopY - t.y) * t.dir;
        const target = rest <= 0 ? 0 : Math.min(TRAIN.speed, Math.max(12, Math.sqrt(2 * TRAIN.decel * rest)));
        t.v = target < t.v ? target : Math.min(target, t.v + TRAIN.accel * dt);
        t.y += t.dir * Math.min(t.v * dt, Math.max(0, rest));
        if ((this.gare.stopY - t.y) * t.dir <= 0.5) { t.y = this.gare.stopY; t.v = 0; t.mode = 'arret'; }
      } else if (t.mode === 'depart') {
        t.v = Math.min(TRAIN.speed, t.v + TRAIN.accel * dt);
        t.y += t.dir * t.v * dt;
        t.gone += t.v * dt;
        if (t.fadeOut) {
          t.alpha = Math.max(0, Math.min(t.alpha, (TRAIN.lead - t.gone) / 200));
          if (t.gone >= TRAIN.lead) { for (const s of t.parts) s.destroy(); this.train = null; return; }
        }
      }
      if (t.fadeIn) { t.alpha = Math.min(1, t.alpha + dt * 2.5); if (t.alpha >= 1) t.fadeIn = false; }
      this.placeTrain();
    }

    // Un départ choisi : la promeneuse va au quai, le train arrive (ou attend à quai), elle
    // monte, il part ; la caméra le suit, puis la carte d'arrivée.
    startTrip(dest) {
      this.closeGare();
      if (!this.gare || this.trip) return;
      const dir = dest.sens === 'nord' ? -1 : 1;
      const cible = `ville-carte.html?carte=${dest.carte}&arrivee=gare&train=${dest.sens}`;
      this.locked = true;
      if (reduced()) { this.leave({ cible }); return; }
      this.trip = { cible, dir, phase: 'quai', wait: 0 };
      this.path = [];
      this.goTo(this.gare.quai.x, this.gare.quai.y);
      if (this.train && this.train.mode === 'arret') this.train.dir = dir;       // à quai : il repartira dans l'autre sens
      else this.trainIn(dir);
    }

    stepTrip(dt) {
      const tr = this.trip, t = this.train;
      if (!tr || !t) return;
      const P = this.heroPos, q = this.gare.quai;
      if (tr.phase === 'quai') {
        // (pas de chemin jusqu'au quai : elle y est portée)
        if (!this.path.length && Math.hypot(P.x - q.x, P.y - q.y) > 4) { P.x = q.x; P.y = q.y; }
        if (!this.path.length && t.mode === 'arret') {
          this.face = 'cote';
          this.hero.setFlipX(q.x > this.gare.x);
          tr.phase = 'montee';
          tr.wait = TRAIN.board;
        }
      } else if (tr.phase === 'montee') {
        this.heroAlpha = Math.max(0, this.heroAlpha - dt / 0.4);
        tr.wait -= dt;
        if (tr.wait <= 0) {
          Object.assign(t, { mode: 'depart', v: 0, gone: 0 });
          this.cameras.main.startFollow(t.parts[1], true, 0.1, 0.1);
          tr.phase = 'depart';
          tr.wait = TRAIN.leaveAfter;
        }
      } else if (tr.phase === 'depart') {
        tr.wait -= dt;
        if (tr.wait <= 0) { tr.phase = 'fin'; this.leave({ cible: tr.cible }); }
      }
    }

    // Arrivée en train (?train=nord|sud) : on voit le train arriver ; à l'arrêt, la promeneuse
    // paraît devant la gare. Hors d'un terminus, le train repart.
    arriveByTrain(dir, terminus) {
      if (reduced()) { if (terminus) this.addTrain(this.gare.stopY, 0); return; }
      this.locked = true;
      this.heroAlpha = 0;
      const t = this.trainIn(dir);
      const cam = this.cameras.main;
      cam.startFollow(t.parts[1], true, 0.12, 0.12);
      cam.centerOn(this.gare.x, this.gare.stopY);
      this.arrival = { phase: 'train', wait: 0, terminus };
    }

    stepArrival(dt) {
      const a = this.arrival, t = this.train;
      if (!a) return;
      if (a.phase === 'train') {
        if (!t || t.mode === 'arret') { a.phase = 'descente'; a.wait = TRAIN.alight; }
      } else if (a.phase === 'descente') {
        a.wait -= dt;
        if (a.wait <= 0) { a.phase = 'paraît'; this.cameras.main.startFollow(this.hero, true, 0.08, 0.08); }
      } else if (a.phase === 'paraît') {
        this.heroAlpha = Math.min(1, this.heroAlpha + dt / 0.5);
        if (this.heroAlpha >= 1) {
          this.locked = false;
          this.cameras.main.startFollow(this.hero, true, 0.12, 0.12);
          a.phase = a.terminus ? 'fin' : 'repart';
          a.wait = TRAIN.resume;
        }
      } else if (a.phase === 'repart') {
        a.wait -= dt;
        if (a.wait <= 0) {
          if (t) Object.assign(t, { mode: 'depart', v: 0, gone: 0, fadeOut: true });
          a.phase = 'fin';
        }
      }
      if (a.phase === 'fin') this.arrival = null;
    }

    // ---------- les trouvailles ----------

    makeFinds(objs) {
      this.finds = [];
      this.pick = null;
      const meta = (this.cache.json.get('faune') || {}).trouvailles || {};
      if (!objs.length || !this.textures.exists(FINDS.key)) return;
      if (!this.textures.exists('eclat')) {
        const g = this.make.graphics({ x: 0, y: 0, add: false });
        g.fillStyle(0xffffff, 1).fillRect(2, 0, 1, 5).fillRect(0, 2, 5, 1);
        g.generateTexture('eclat', 5, 5);
        g.destroy();
      }
      const jour = this.time ? this.time.jour : Math.floor(Date.now() / 864e5);
      const rec = this.readFinds();
      if (rec.jour !== jour) { rec.jour = jour; rec.pris = []; }
      this.findRec = rec;
      const hash = (str) => {
        let h = 2166136261;
        for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
        return ((h >>> 0) % 10007) / 10007;
      };
      for (const o of objs) {
        const genre = ((o.properties || []).find((q) => q.name === 'genre') || {}).value;
        const id = NOM_CARTE + ':' + o.name;
        if (hash(jour + '/' + id) > FINDS.part || rec.pris.includes(id)) continue;
        const kinds = Object.entries(meta).filter(([, m]) => m.genre === genre);
        if (!kinds.length) continue;
        const [kind, m] = kinds[Math.floor(hash(id + '#' + jour) * kinds.length) % kinds.length];
        const s = this.add.image(Math.round(o.x), Math.round(o.y), FINDS.key, m.frame).setOrigin(0.5, 0.8).setDepth(o.y - 2);
        const e = this.add.image(Math.round(o.x + 4), Math.round(o.y - 11), 'eclat').setDepth(o.y - 1).setAlpha(0);
        this.finds.push({ id, kind, nom: m.nom, x: o.x, y: o.y, s, e, phase: hash(id) * 7 });
      }
    }

    readFinds() {
      let r = null;
      try { r = JSON.parse(window.localStorage.getItem(FINDS.store) || 'null'); } catch (e) { r = null; }
      return r && Array.isArray(r.pris) ? Object.assign({ carnet: {} }, r) : { jour: null, pris: [], carnet: {} };
    }

    tapFind(w) {
      const f = (this.finds || []).find((q) => Math.abs(w.x - q.x) <= 11 && w.y >= q.y - 16 && w.y <= q.y + 6);
      if (!f) return false;
      this.pick = f;
      if (Math.hypot(this.heroPos.x - f.x, this.heroPos.y - f.y) > FINDS.reach) this.goTo(f.x, f.y + 4);
      return true;
    }

    stepFinds(time) {
      const P = this.heroPos;
      for (const f of [...(this.finds || [])]) {
        // un éclat, de temps en temps
        const k = Math.sin(time / 520 + f.phase);
        f.e.setAlpha(reduced() ? 0 : Math.max(0, k) ** 12);
        const d = Math.hypot(P.x - f.x, P.y - f.y);
        if ((this.pick === f && d <= FINDS.reach && !this.path.length) || d <= 9) this.collect(f);
      }
    }

    collect(f) {
      this.finds.splice(this.finds.indexOf(f), 1);
      if (this.pick === f) this.pick = null;
      f.e.destroy();
      this.tweens.add({ targets: f.s, y: f.s.y - 12, alpha: 0, duration: reduced() ? 0 : 450, onComplete: () => f.s.destroy() });
      const rec = this.findRec;
      rec.pris.push(f.id);
      rec.carnet[f.kind] = (rec.carnet[f.kind] || 0) + 1;
      try { window.localStorage.setItem(FINDS.store, JSON.stringify(rec)); } catch (e) { /* ignoré */ }
      this.say(`✨ ${f.nom} ! (dans le carnet : ${rec.carnet[f.kind]})`);
    }

    // ---------- les grottes ----------

    // Le niveau du jour, tiré au hasard : des murs semés au hasard, lissés par un automate
    // cellulaire (un mur entouré de murs le reste, une case entourée de sol s'ouvre), puis seule
    // la plus grande salle est gardée. L'échelle (on arrive d'en haut) contre un mur, le puits
    // (on descend) le plus loin possible ; le minerai dans les murs qui bordent le sol.
    genCave(graine, niveau) {
      const W = GROTTE.w, H = GROTTE.h;
      let h = 2166136261;
      for (let i = 0; i < graine.length; i++) { h ^= graine.charCodeAt(i); h = Math.imul(h, 16777619); }
      let a = h >>> 0;
      const rnd = () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
      const idx = (x, y) => y * W + x;
      let g, salle;
      for (let essai = 0; essai < 8; essai++) {
        g = new Uint8Array(W * H);                       // 1 : mur, 0 : sol
        for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) g[idx(x, y)] = x < 2 || y < 2 || x >= W - 2 || y >= H - 2 || rnd() < GROTTE.murs ? 1 : 0;
        for (let p = 0; p < GROTTE.passes; p++) {
          const n = new Uint8Array(g);
          for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
            let k = 0;
            for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (dx || dy) k += g[idx(x + dx, y + dy)];
            n[idx(x, y)] = k >= 5 ? 1 : k <= 3 ? 0 : g[idx(x, y)];
          }
          for (let x = 0; x < W; x++) { n[idx(x, 0)] = n[idx(x, 1)] = n[idx(x, H - 1)] = n[idx(x, H - 2)] = 1; }
          for (let y = 0; y < H; y++) { n[idx(0, y)] = n[idx(1, y)] = n[idx(W - 1, y)] = n[idx(W - 2, y)] = 1; }
          g = n;
        }
        // la plus grande salle (4-voisins) ; les autres sont rebouchées
        const zone = new Int32Array(W * H).fill(-1);
        let best = null;
        for (let i = 0; i < W * H; i++) {
          if (g[i] || zone[i] >= 0) continue;
          const q = [i];
          zone[i] = i;
          for (let k = 0; k < q.length; k++) {
            const c = q[k], cx = c % W, cy = (c - cx) / W;
            for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
              const n = idx(cx + dx, cy + dy);
              if (!g[n] && zone[n] < 0) { zone[n] = i; q.push(n); }
            }
          }
          if (!best || q.length > best.length) best = q;
        }
        if (!best) continue;
        const garde = new Set(best);
        for (let i = 0; i < W * H; i++) if (!g[i] && !garde.has(i)) g[i] = 1;
        salle = best;
        if (best.length > W * H * 0.28) break;
      }
      const sol = (x, y) => x >= 0 && y >= 0 && x < W && y < H && !g[idx(x, y)];
      const ouvert = (x, y) => [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]].every(([dx, dy]) => sol(x + dx, y + dy));
      // l'échelle : une case de sol sous un mur, avec du sol devant (on y arrive)
      const pieds = salle.map((c) => [c % W, Math.floor(c / W)]).filter(([x, y]) => !sol(x, y - 1) && sol(x, y + 1) && sol(x - 1, y + 1) && sol(x + 1, y + 1));
      const [ex, ey] = pieds.length ? pieds[Math.floor(rnd() * pieds.length)] : [salle[0] % W, Math.floor(salle[0] / W)];
      // le puits : la case ouverte la plus loin de l'échelle
      const dist = new Int32Array(W * H).fill(-1);
      const q = [idx(ex, ey)];
      dist[q[0]] = 0;
      for (let k = 0; k < q.length; k++) {
        const c = q[k], cx = c % W, cy = (c - cx) / W;
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const n = idx(cx + dx, cy + dy);
          if (sol(cx + dx, cy + dy) && dist[n] < 0) { dist[n] = dist[c] + 1; q.push(n); }
        }
      }
      let px = ex, py = ey + 1, pd = -1;
      for (const c of salle) { const x = c % W, y = Math.floor(c / W); if (ouvert(x, y) && dist[c] > pd) { pd = dist[c]; px = x; py = y; } }
      // le minerai : les murs qui bordent le sol, la sorte tirée selon le niveau
      const poids = GROTTE.poids(niveau), total = Object.values(poids).reduce((s, w) => s + w, 0);
      const ores = [], decor = [], stalag = [];
      for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
        if (g[idx(x, y)]) {
          if (![[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => sol(x + dx, y + dy)) || rnd() > GROTTE.minerai * (1 + niveau * 0.06)) continue;
          let r = rnd() * total, kind = 'fer';
          for (const [k, w] of Object.entries(poids)) { if (r < w) { kind = k; break; } r -= w; }
          ores.push({ x, y, kind });
          continue;
        }
        const pres = Math.abs(x - ex) + Math.abs(y - ey) < 4 || Math.abs(x - px) + Math.abs(y - py) < 3;
        const r = rnd();
        if (pres) continue;
        if (r < 0.025 && ouvert(x, y)) stalag.push({ x, y, v: rnd() < 0.5 ? 0 : 1 });
        else if (r < 0.06) decor.push({ x, y, kind: rnd() < 0.6 ? 'champignon' : 'cristal' });
      }
      return { W, H, g, sol, echelle: { x: ex, y: ey }, puits: niveau < GROTTE.niveaux ? { x: px, y: py } : null, ores, decor, stalag };
    }

    buildCave() {
      const meta = this.cache.json.get('grotte') || { tuiles: {}, objets: [] };
      const id = (PARAMS.get('grotte') || '1').replace(/[^\w-]/g, '').slice(0, 12) || '1';
      const niveau = Math.max(1, Math.min(GROTTE.niveaux, parseInt(PARAMS.get('niveau'), 10) || 1));
      const h = window.HorlogeSortie ? window.HorlogeSortie.maintenant() : null;
      const jour = h ? h.jour : Math.floor(Date.now() / 864e5);
      const c = this.genCave(`${id}:${niveau}:${jour}`, niveau);
      Object.assign(c, { id, niveau, jour, meta });
      this.cave = c;
      const map = this.make.tilemap({ tileWidth: T, tileHeight: T, width: c.W, height: c.H });
      const set = map.addTilesetImage('grotte_tuiles', extrude(this.textures, 'grotte_tuiles', T), T, T, 1, 2);
      ['sol', 'marquage', 'falaise', 'minerais', DEVANT].forEach((n, i) => { this.layers[n] = map.createBlankLayer(n, set).setDepth(n === DEVANT ? 1e6 : -100 + i); });
      const t = (n) => meta.tuiles[n];
      const r = (x, y, k) => { const s = Math.sin(x * 12.9898 + y * 78.233 + k) * 43758.5453; return s - Math.floor(s); };
      for (let y = 0; y < c.H; y++) for (let x = 0; x < c.W; x++) {
        if (c.sol(x, y)) {
          const q = r(x, y, 1);
          this.layers.sol.putTileAt(t('sol_' + (q < 0.7 ? 0 : q < 0.82 ? 1 : q < 0.9 ? 2 : q < 0.94 ? 3 : 4)), x, y);
        } else if (c.sol(x, y + 1)) this.layers.falaise.putTileAt(t('paroi_' + Math.floor(r(x, y, 2) * 4)), x, y);
        else {
          const n = (c.sol(x, y - 1) ? 1 : 0) + (c.sol(x + 1, y) ? 2 : 0) + (c.sol(x - 1, y) ? 8 : 0);
          this.layers.falaise.putTileAt(t('plafond_' + n), x, y);
        }
      }
      // le minerai déjà pioché aujourd'hui ne revient que demain
      const rec = this.readCaves();
      if (rec.jour !== jour) { rec.jour = jour; rec.pris = []; }
      this.caveRec = rec;
      c.ores = c.ores.filter((o) => !rec.pris.includes(`${id}:${niveau}:${o.x},${o.y}`));
      for (const o of c.ores) this.layers.minerais.putTileAt(t(o.kind), o.x, o.y);
      for (const d of c.decor) this.layers.marquage.putTileAt(t(d.kind), d.x, d.y);
      // les objets : l'échelle, le puits, les stalagmites (on ne passe pas à travers)
      const ob = (n) => Math.max(0, meta.objets.indexOf(n));
      const E = c.echelle, P = c.puits;
      this.add.image(E.x * T + 8, E.y * T + 15, 'grotte_objets', ob('echelle')).setOrigin(0.5, 1).setDepth(E.y * T);
      if (P) this.add.image(P.x * T + 8, P.y * T + 12, 'grotte_objets', ob('trou')).setOrigin(0.5, 0.75).setDepth(P.y * T - 8);
      for (const s of c.stalag) {
        this.add.image(s.x * T + 8, s.y * T + 15, 'grotte_objets', ob('stalagmite_' + s.v)).setOrigin(0.5, 1).setDepth(s.y * T + 15);
        this.layers.marquage.putTileAt(t('sol_0'), s.x, s.y);
      }
      const ici = `ville-carte.html?carte=grotte&grotte=${id}`;
      const pass = (nom, x, y, sens, cible) => ({ name: nom, x: x * T, y: y * T, width: T, height: T, properties: [{ name: 'cible', value: cible }, { name: 'sens', value: sens }] });
      c.objects = {
        depart: [{ x: E.x * T + 8, y: (E.y + 1) * T + 12 }],
        arrivees: [{ name: 'haut', x: E.x * T + 8, y: (E.y + 1) * T + 12 }].concat(P ? [{ name: 'bas', x: P.x * T + 8, y: (P.y + 1) * T + 12 }] : []),
        passages: [pass('remonter', E.x, E.y - 1, 'haut', niveau > 1 ? `${ici}&niveau=${niveau - 1}&arrivee=bas` : `ville-carte.html?carte=montagne&arrivee=grotte_${id}`)]
          .concat(P ? [pass('descendre', P.x, P.y, 'bas', `${ici}&niveau=${niveau + 1}&arrivee=haut`)] : []),
      };
      this.cameras.main.setBackgroundColor('#0b090a');
      return map;
    }

    readCaves() {
      let r = null;
      try { r = JSON.parse(window.localStorage.getItem(GROTTE.store) || 'null'); } catch (e) { r = null; }
      return r && Array.isArray(r.pris) ? Object.assign({ carnet: {} }, r) : { jour: null, pris: [], carnet: {} };
    }

    // La lumière autour de la promeneuse (le reste de la grotte dans le noir), le niveau affiché,
    // les stalagmites infranchissables, un éclat de temps en temps sur le minerai.
    makeCaveLife() {
      this.mine = null;
      this.mining = null;
      const c = this.cave;
      if (!c) return;
      for (const s of c.stalag) if (this.walk[s.y]) this.walk[s.y][s.x] = false;
      const L = GROTTE.lumiere, N = 512, K = 4;          // une texture de N px, agrandie K fois
      if (!this.textures.exists('lumiere_grotte')) {
        const cv = document.createElement('canvas');
        cv.width = cv.height = N;
        const g = cv.getContext('2d');
        const grad = g.createRadialGradient(N / 2, N / 2, L.r0 / K, N / 2, N / 2, L.r1 / K);
        grad.addColorStop(0, 'rgba(6,4,6,0)');
        grad.addColorStop(0.55, `rgba(6,4,6,${L.noir * 0.6})`);
        grad.addColorStop(1, `rgba(6,4,6,${L.noir})`);
        g.fillStyle = grad;
        g.fillRect(0, 0, N, N);
        this.textures.addCanvas('lumiere_grotte', cv);
      }
      // (agrandie : elle couvre l'écran même au plus petit zoom)
      this.light = this.add.image(0, 0, 'lumiere_grotte').setScale(K).setDepth(1.9e6);
      this.say(`⛏️ La grotte — niveau ${c.niveau}${c.niveau >= GROTTE.niveaux ? ' (le plus profond)' : ''}`);
    }

    tapOre(w) {
      const c = this.cave;
      if (!c) return false;
      const gx = Math.floor(w.x / T), gy = Math.floor(w.y / T);
      const o = c.ores.find((q) => q.x === gx && q.y === gy);
      if (!o) return false;
      if (hote() && hote().outil && !hote().outil('pioche')) { this.say('⛏️ Il faut une pioche pour prendre ce minerai (à acheter à la ferme).'); return true; }
      // la case de sol voisine la plus proche de la promeneuse
      const P = this.heroPos;
      const pres = [[0, 1], [-1, 0], [1, 0], [0, -1]].map(([dx, dy]) => ({ x: o.x + dx, y: o.y + dy }))
        .filter((q) => this.canWalk(q.x, q.y))
        .map((q) => ({ x: q.x * T + 8, y: q.y * T + 13 }))
        .sort((a, b) => Math.hypot(a.x - P.x, a.y - P.y) - Math.hypot(b.x - P.x, b.y - P.y));
      if (!pres.length) return true;
      this.mine = { ore: o, stand: pres[0] };
      this.path = [];
      if (Math.hypot(pres[0].x - P.x, pres[0].y - P.y) > 3) this.goTo(pres[0].x, pres[0].y);
      return true;
    }

    // Arrivée près du minerai : trois coups de pioche (pioche_cote), des éclats, puis il est pris.
    stepMine(dt) {
      const m = this.mine;
      if (!m) return;
      const P = this.heroPos;
      if (!this.mining) {
        if (this.path.length) return;
        if (Math.hypot(m.stand.x - P.x, m.stand.y - P.y) > 6) { this.mine = null; return; }
        this.mining = { t: 0, coup: 0, frame: 'pioche_cote_0' };
        this.hero.setFlipX(m.ore.x * T + 8 < P.x - 2);
        this.face = 'cote';
      }
      const g = this.mining;
      g.t += dt;
      const k = Math.min(3, Math.floor(g.t / GROTTE.coup * 4));
      g.frame = 'pioche_cote_' + k;
      if (g.t >= GROTTE.coup) {
        g.t = 0;
        g.coup++;
        this.chips(m.ore);
        if (g.coup >= GROTTE.coups) this.takeOre(m.ore);
      }
    }

    chips(o) {
      if (reduced()) return;
      const col = { fer: 0xd2a88a, cuivre: 0xd67e46, or: 0xf0c846, platine: 0xe6eef8 }[o.kind] || 0x9a9088;
      for (let i = 0; i < 4; i++) {
        const r = this.add.rectangle(o.x * T + 8, o.y * T + 10, 2, 2, i % 2 ? col : 0x7a7068).setDepth(2e6);
        this.tweens.add({ targets: r, x: r.x + (Math.random() - 0.5) * 22, y: r.y + 6 + Math.random() * 10, alpha: 0, duration: 380, onComplete: () => r.destroy() });
      }
      this.cameras.main.shake(70, 0.002);
    }

    takeOre(o) {
      const c = this.cave;
      this.mine = null;
      this.mining = null;
      c.ores.splice(c.ores.indexOf(o), 1);
      this.layers.minerais.removeTileAt(o.x, o.y);
      const rec = this.caveRec;
      rec.pris.push(`${c.id}:${c.niveau}:${o.x},${o.y}`);
      rec.carnet[o.kind] = (rec.carnet[o.kind] || 0) + 1;
      try { window.localStorage.setItem(GROTTE.store, JSON.stringify(rec)); } catch (e) { /* ignoré */ }
      const nom = ((c.meta.minerais || {})[o.kind] || {}).nom || o.kind;
      this.say(`⛏️ ${nom} ! (dans le carnet : ${rec.carnet[o.kind]})`);
    }

    // ---------- les animaux ----------

    makeFauna(zones) {
      this.animals = [];
      const meta = (this.cache.json.get('faune') || {}).especes || {};
      const rnd = (a, b) => a + Math.random() * (b - a);
      for (const z of zones) {
        const esp = ((z.properties || []).find((q) => q.name === 'espece') || {}).value || z.name;
        const def = FAUNE.especes[esp], m = meta[esp];
        if (!def || !m || !this.textures.exists('faune_' + esp)) continue;
        const frames = {};
        m.frames.forEach((n, i) => { frames[n] = i; });
        for (let i = 0; i < def.n; i++) {
          const x = rnd(z.x, z.x + z.width), y = rnd(z.y, z.y + z.height);
          const s = this.add.sprite(Math.round(x), Math.round(y), 'faune_' + esp, 0).setOrigin(m.anchor.x / m.frameWidth, m.anchor.y / m.frameHeight);
          const a = { esp, def, nom: m.nom, zone: z, frames, s, x, y, tx: x, ty: y, state: 'repos', wait: rnd(0.5, 4), walked: 0, alt: 0, alpha: 1, t: 0 };
          if (esp === 'aigle') Object.assign(a, { cx: x, cy: y, ang: rnd(0, 6.3), shadow: this.add.ellipse(0, 0, 16, 5, 0x1e1a18, 0.18).setDepth(0) });
          if (esp === 'mouette') a.shadow = this.add.ellipse(0, 0, 8, 3, 0x1e1a18, 0.25).setVisible(false);
          if (esp === 'dauphin') { a.state = 'attente'; a.wait = rnd(2, 6); s.setVisible(false); }
          this.animals.push(a);
        }
      }
    }

    tapAnimal(w) {
      const a = (this.animals || []).find((q) => q.s.visible && q.alpha > 0.5 && Math.abs(w.x - q.s.x) <= (q.def.size > 16 ? 16 : 10)
        && w.y >= q.s.y - (q.def.size > 16 ? 30 : 16) && w.y <= q.s.y + 6);
      if (!a) return false;
      this.say(a.def.texte);
      return true;
    }

    stepFauna(time, dt) {
      if (!this.animals || !this.animals.length) return;
      const P = this.heroPos, still = reduced();
      const rnd = (a, b) => a + Math.random() * (b - a);
      const inZone = (z) => ({ x: rnd(z.x, z.x + z.width), y: rnd(z.y, z.y + z.height) });
      const frame = (a, n) => { if (a.frames[n] !== undefined) a.s.setFrame(a.frames[n]); };
      for (const a of this.animals) {
        const z = a.zone;
        if (a.esp === 'aigle') {
          // il tourne en grands cercles, son centre dérive lentement d'un bout à l'autre de la carte
          if (!still) {
            a.ang += dt * 0.32;
            if (Math.hypot(a.tx - a.cx, a.ty - a.cy) < 8) { const p = inZone(z); a.tx = p.x; a.ty = p.y; }
            const l = Math.hypot(a.tx - a.cx, a.ty - a.cy) || 1;
            a.cx += (a.tx - a.cx) / l * 10 * dt;
            a.cy += (a.ty - a.cy) / l * 10 * dt;
          }
          const x = a.cx + Math.cos(a.ang) * 96, y = a.cy + Math.sin(a.ang) * 54;
          a.s.setPosition(Math.round(x), Math.round(y)).setDepth(2e6).setRotation(a.ang + Math.PI);
          frame(a, Math.floor(time / 900) % 5 === 0 ? 'vol_1' : 'vol_0');
          a.shadow.setPosition(Math.round(x + 34), Math.round(y + 70));
          continue;
        }
        if (a.esp === 'dauphin') {
          // de temps en temps, un saut au large : la gerbe, le saut, la gerbe
          const seq = ['gerbe', 'saut_0', 'saut_1', 'saut_2', 'saut_3', 'gerbe'];
          if (a.state === 'attente') {
            a.wait -= dt;
            if (a.wait <= 0 && !still) { const p = inZone(z); Object.assign(a, { x: p.x, y: p.y, state: 'saut', t: 0, sens: Math.random() < 0.5 ? -1 : 1 }); }
          } else {
            a.t += dt;
            const k = Math.floor(a.t / 0.17);
            if (k >= seq.length) { a.state = 'attente'; a.wait = rnd(4, 11); a.s.setVisible(false); continue; }
            frame(a, seq[k]);
            a.s.setVisible(true).setFlipX(a.sens < 0).setPosition(Math.round(a.x + a.sens * k * 5), Math.round(a.y)).setDepth(a.y);
          }
          continue;
        }
        const dHero = Math.hypot(P.x - a.x, P.y - a.y);
        // dérangé : la marmotte rentre dans son terrier, le crabe file, la mouette s'envole
        if (a.def.peur && dHero < a.def.peur && ['repos', 'marche'].includes(a.state) && !still) {
          if (a.esp === 'marmotte') { a.state = 'cache'; a.wait = rnd(6, 11); }
          else if (a.esp === 'crabe') {
            const l = dHero || 1;
            a.tx = Math.max(z.x, Math.min(z.x + z.width, a.x + (a.x - P.x) / l * 56));
            a.ty = Math.max(z.y, Math.min(z.y + z.height, a.y + (a.y - P.y) / l * 20));
            a.state = 'fuite';
          } else if (a.esp === 'mouette') {
            let p = inZone(z);
            for (let i = 0; i < 6 && Math.hypot(p.x - P.x, p.y - P.y) < 90; i++) p = inZone(z);
            Object.assign(a, { tx: p.x, ty: p.y, state: 'vol', t: 0, x0: a.x, y0: a.y });
          }
        }
        let moving = false;
        if (a.state === 'cache') {
          a.alpha = Math.max(0, a.alpha - dt / 0.3);
          a.wait -= dt;
          if (a.wait <= 0) { const p = inZone(z); Object.assign(a, { x: p.x, y: p.y, state: 'sort' }); }
        } else if (a.state === 'sort') {
          a.alpha = Math.min(1, a.alpha + dt / 0.5);
          if (a.alpha >= 1) { a.state = 'repos'; a.wait = rnd(1, 3); }
        } else if (a.state === 'vol') {
          const l = Math.hypot(a.tx - a.x0, a.ty - a.y0) || 1, dur = Math.max(1.2, l / 70);
          a.t += dt;
          const q = Math.min(1, a.t / dur);
          a.x = a.x0 + (a.tx - a.x0) * q;
          a.y = a.y0 + (a.ty - a.y0) * q;
          a.alt = Math.sin(q * Math.PI) * 26;
          if (q >= 1) { a.state = 'repos'; a.wait = rnd(2, 6); a.alt = 0; }
        } else if (a.state === 'repos') {
          a.wait -= dt;
          if (a.wait <= 0 && !still) {
            const p = inZone(z);
            // la mouette s'envole parfois d'elle-même
            if (a.esp === 'mouette' && Math.random() < 0.3) Object.assign(a, { tx: p.x, ty: p.y, state: 'vol', t: 0, x0: a.x, y0: a.y });
            else Object.assign(a, { tx: p.x, ty: p.y, state: 'marche' });
          }
        } else if (a.state === 'marche' || a.state === 'fuite') {
          const dx = a.tx - a.x, dy = a.ty - a.y, l = Math.hypot(dx, dy), st = a.def.speed * (a.state === 'fuite' ? 3 : 1) * dt;
          if (a.esp !== 'crabe' && Math.abs(dx) > 0.5) a.s.setFlipX(dx < 0);
          if (l <= st) { a.x = a.tx; a.y = a.ty; a.state = 'repos'; a.wait = rnd(1.5, 5); } else { a.x += dx / l * st; a.y += dy / l * st; }
          a.walked += Math.min(l, st);
          moving = true;
        }
        // les images
        if (a.state === 'vol') {
          frame(a, Math.floor(time / 140) % 2 ? 'vol_1' : 'vol_0');
          if (a.tx !== a.x) a.s.setFlipX(a.tx < a.x);
        } else if (moving) {
          const n = a.esp === 'mouette' ? ['debout_0', 'debout_1'] : a.esp === 'bouquetin' ? ['marche_0', 'marche_1', 'marche_2', 'marche_3'] : ['marche_0', 'marche_1'];
          frame(a, n[Math.floor(a.walked / 3) % n.length]);
        } else {
          const n = { marmotte: ['assise_0', 'assise_1'], bouquetin: ['debout_0', 'debout_1'], mouette: ['debout_0', 'debout_1'], crabe: ['marche_0', 'marche_0'] }[a.esp];
          frame(a, n[Math.floor(time / 1300 + a.x) % 2]);
        }
        a.s.setPosition(Math.round(a.x), Math.round(a.y - a.alt)).setDepth(a.state === 'vol' ? 2e6 : a.y).setAlpha(a.alpha).setVisible(a.alpha > 0);
        if (a.shadow) a.shadow.setVisible(a.state === 'vol').setPosition(Math.round(a.x), Math.round(a.y)).setDepth(a.y - 1);
      }
    }

    // ---------- les arbres, les rochers, l'herbe haute (comme à la ferme) ----------

    // Les cases sous le pied d'un arbre ou d'un rocher : on ne les traverse pas tant qu'il est là.
    blockUnder(o, dxs) {
      o.cells = [];
      const ty = Math.floor((o.y - 1) / T);
      for (const dx of dxs) {
        const tx = Math.floor((o.x + dx) / T);
        if (!this.walk[ty] || tx < 0 || tx >= this.walk[ty].length || o.cells.some((c) => c[0] === tx)) continue;
        o.cells.push([tx, ty, this.walk[ty][tx]]);
        this.walk[ty][tx] = false;
      }
    }

    unblock(o) {
      for (const [tx, ty, was] of o.cells || []) if (this.walk[ty]) this.walk[ty][tx] = was;
      o.cells = [];
    }

    makeNature(objects) {
      this.trees = [];
      this.rocks = [];
      this.grass = [];
      this.work = null;
      const H = hote();
      const id = (o) => NOM_CARTE + ':' + Math.round(o.x) + ',' + Math.round(o.y);
      for (const o of objects('arbres')) {
        const d = NATURE.arbres[o.type];
        if (!d || !this.textures.exists(d.key) || (H && H.abattu && H.abattu(id(o)))) continue;
        const t = { id: id(o), kind: 'arbre', def: d, x: o.x, y: o.y, alpha: 1, shake: -1 };
        if (this.textures.exists(NATURE.ombre.key)) t.shadow = this.add.image(Math.round(o.x + NATURE.ombre.dx), Math.round(o.y + NATURE.ombre.dy), NATURE.ombre.key).setOrigin(0).setDepth(-60);
        t.img = this.add.image(Math.round(o.x), Math.round(o.y), d.key, 0).setOrigin(0.5, 1).setDepth(o.y);
        this.blockUnder(t, d.tronc);
        this.trees.push(t);
      }
      for (const o of objects('rochers')) {
        const d = NATURE.rochers[o.type];
        const frame = Number(((o.properties || []).find((q) => q.name === 'image') || {}).value) || 0;
        if (!d || !this.textures.exists(NATURE.objets.key) || (H && H.casse && H.casse(id(o)))) continue;
        const r = { id: id(o), kind: 'rocher', def: d, x: o.x, y: o.y };
        r.img = this.add.image(Math.round(o.x), Math.round(o.y), NATURE.objets.key, frame).setOrigin(0.5, 1).setDepth(o.y);
        this.blockUnder(r, d.tronc);
        this.rocks.push(r);
      }
      const G = NATURE.herbe;
      if (this.textures.exists(G.key)) {
        const rows = Math.floor((this.textures.get(G.key).frameTotal - 1) / G.frames) || 1;
        for (const o of objects('herbe_haute')) {
          const base = (Math.max(0, Number(o.type) | 0) % rows) * G.frames;
          const img = this.add.image(Math.round(o.x), Math.round(o.y), G.key, base).setOrigin(0.5, 1).setDepth(o.y - 1);
          // une nuance propre à chaque touffe (deux voisines ne se confondent pas)
          const n = Math.sin(o.x * 12.9898 + o.y * 78.233) * 43758.5453;
          const c = Math.round(255 * (1 - G.shade * (n - Math.floor(n))));
          img.setTint((c << 16) | (c << 8) | c);
          this.grass.push({ img, x: o.x, y: o.y, base, t: -1, dir: 1, inside: false });
        }
      }
      this.grassPrev = null;
    }

    // Un toucher sur un arbre (la hache en main) ou un rocher (la pioche en main) : on y va, puis
    // un coup. Sans l'outil, le toucher fait marcher, comme ailleurs.
    tapNature(w) {
      if (!this.trees || (!this.trees.length && !this.rocks.length)) return false;
      const H = hote(), outil = H && H.enMain ? H.enMain() : null;
      let list = [];
      if (outil === 'hache') list = this.trees.filter((t) => !t.down && Math.abs(w.x - t.x) <= t.def.w / 2 - 8 && w.y <= t.y + 3 && w.y >= t.y - t.def.h + 4);
      else if (outil === 'pioche') list = this.rocks.filter((r) => !r.down && Math.abs(w.x - r.x) <= r.def.half + 3 && w.y <= r.y + 4 && w.y >= r.y - r.def.h - 3);
      if (!list.length) return false;
      const o = list.sort((a, b) => b.y - a.y)[0];
      const P = this.heroPos, side = P.x < o.x ? -1 : 1;
      const spots = [side, -side].map((k) => ({ x: o.x + k * o.def.reach, y: o.y + 1 }));
      const spot = spots.find((q) => this.canWalk(Math.floor(q.x / T), Math.floor(q.y / T))) || spots[0];
      this.work = { o, outil, spot, started: false };
      this.path = [];
      if (Math.hypot(spot.x - P.x, spot.y - P.y) > 3) this.goTo(spot.x, spot.y);
      return true;
    }

    // Arrivé près de l'arbre ou du rocher : le geste (hache_cote, pioche_cote), le coup porte à la
    // troisième image (le moteur compte), puis le geste finit. Un coup par toucher.
    stepWork(dt) {
      const w = this.work;
      if (!w) return;
      const P = this.heroPos;
      if (!w.started) {
        if (this.path.length) return;
        if (Math.hypot(w.spot.x - P.x, w.spot.y - P.y) > 12 || w.o.down) { this.work = null; return; }
        w.started = true;
        w.t = 0;
        w.hit = false;
        this.hero.setFlipX(w.o.x < P.x);
        this.face = 'cote';
        this.mining = { frame: w.outil + '_cote_0' };
      }
      w.t += dt;
      const k = Math.min(3, Math.floor((w.t / NATURE.swing) * 4));
      this.mining.frame = w.outil + '_cote_' + k;
      if (k >= 2 && !w.hit) {
        w.hit = true;
        if (!this.hitNature(w)) { this.work = null; this.mining = null; return; }
      }
      if (w.t >= NATURE.swing) { this.work = null; this.mining = null; }
    }

    // Le coup : le moteur du jeu (le bois ou la pierre entre dans l'inventaire), puis ce qu'on
    // voit. false : rien (pas de partie, la nuit, plus d'énergie : un message l'a dit).
    hitNature(w) {
      const H = hote(), o = w.o;
      if (!H || !H.couper) { this.say('Il faut une partie en cours pour couper du bois ou casser des pierres.'); return false; }
      if (o.kind === 'arbre') {
        const r = H.couper(o.id);
        if (!r) return false;
        this.popGain(`+${r.bois} 🪵`);
        if (r.tombe) this.fellTree(o); else o.shake = 0;
        this.leaves(o, 5);
      } else {
        const r = H.piocher(o.id);
        if (!r) return false;
        this.popGain(`+${(r.items && r.items.pierre) || 1} 🪨`);
        this.shards(o, r.casse ? 14 : 5);
        if (r.casse) this.breakRock(o);
        else if (!reduced()) this.tweens.add({ targets: o.img, x: o.img.x + (w.o.x < this.heroPos.x ? -1 : 1), duration: 50, yoyo: true });
      }
      return true;
    }

    // L'arbre abattu bascule autour de son pied, du côté opposé au personnage, puis s'efface.
    fellTree(t) {
      t.down = true;
      t.shake = -1;
      t.img.setFrame(0).setAlpha(1);
      this.unblock(t);
      const F = NATURE.fall, dir = t.x >= this.heroPos.x ? 1 : -1;
      const gone = () => { t.img.destroy(); if (t.shadow) t.shadow.destroy(); this.trees.splice(this.trees.indexOf(t), 1); };
      if (reduced()) { this.tweens.add({ targets: [t.img, t.shadow].filter(Boolean), alpha: 0, duration: 300, onComplete: gone }); return; }
      if (t.shadow) this.tweens.add({ targets: t.shadow, alpha: 0, duration: F.ms });
      this.tweens.add({
        targets: t.img, angle: dir * F.angle, duration: F.ms, ease: 'Quad.easeIn',
        onComplete: () => {
          this.cameras.main.shake(90, 0.003);
          this.leaves(t, F.leaves, dir);
          this.tweens.add({ targets: t.img, alpha: 0, delay: F.rest, duration: F.fade, onComplete: gone });
        },
      });
    }

    breakRock(r) {
      r.down = true;
      this.unblock(r);
      this.tweens.add({ targets: r.img, alpha: 0, scaleX: 1.15, scaleY: 0.7, duration: reduced() ? 120 : 260, onComplete: () => { r.img.destroy(); this.rocks.splice(this.rocks.indexOf(r), 1); } });
    }

    // Des feuilles et des copeaux (un coup de hache ; l'arbre tombé : là où sa cime touche le sol).
    leaves(t, n, dir = 0) {
      if (reduced()) return;
      const F = NATURE.fall;
      for (let i = 0; i < n; i++) {
        const x0 = dir ? t.x + dir * (20 + Math.random() * 36) : t.x + (Math.random() - 0.5) * 30;
        const y0 = dir ? t.y - 4 - Math.random() * 10 : t.y - 30 - Math.random() * 26;
        const p = this.add.rectangle(x0, y0, 2, 2, F.colors[i % F.colors.length]).setDepth(t.y + 1);
        this.tweens.add({ targets: p, x: x0 + (Math.random() - 0.5) * 26, y: y0 + 10 + Math.random() * 16, alpha: 0, angle: 180, duration: 600 + Math.random() * 500, onComplete: () => p.destroy() });
      }
    }

    shards(r, n) {
      if (reduced()) return;
      const C = NATURE.eclats, side = r.x < this.heroPos.x ? 1 : -1;
      for (let i = 0; i < n; i++) {
        const s = this.add.rectangle(r.x + (Math.random() - 0.5) * 10, r.y - 8 - Math.random() * 8, i % 3 ? 2 : 3, 2, C[i % C.length]).setDepth(r.y + 1);
        this.tweens.add({ targets: s, x: s.x + side * (4 + Math.random() * 18) + (Math.random() - 0.5) * 12, y: s.y + 8 + Math.random() * 10, alpha: 0, duration: 380 + Math.random() * 300, onComplete: () => s.destroy() });
      }
      this.cameras.main.shake(70, 0.002);
    }

    // « +1 🪵 » au-dessus du personnage, qui monte et s'efface.
    popGain(texte) {
      const P = this.heroPos;
      const t = this.add.text(Math.round(P.x), Math.round(P.y - 34), texte, { fontFamily: 'system-ui, sans-serif', fontSize: '9px', color: '#fffbea', stroke: '#2a2018', strokeThickness: 3 })
        .setOrigin(0.5, 1).setDepth(2e6).setResolution(4);
      this.tweens.add({ targets: t, y: t.y - 14, alpha: 0, delay: 500, duration: 900, onComplete: () => t.destroy() });
    }

    // Chaque image : l'arbre qui vient d'être frappé tremble ; l'arbre devant le personnage
    // s'éclaircit ; l'herbe haute qu'il traverse penche.
    stepNature(dt) {
      if (!this.trees) return;
      const P = this.heroPos, k = Math.min(1, (dt * 1000) / 120);
      for (const t of this.trees) {
        if (t.down) continue;
        if (t.shake >= 0) {
          t.shake += dt;
          const i = Math.floor(t.shake * NATURE.shakeFps);
          if (i >= NATURE.shake.length || reduced()) { t.shake = -1; t.img.setFrame(0); } else t.img.setFrame(NATURE.shake[i]);
        }
        const derriere = P.y < t.y - 1 && Math.abs(P.x - t.x) < t.def.w / 2 - 2 && P.y > t.y - t.def.h + 8;
        const want = derriere ? NATURE.occ : 1;
        if (t.alpha !== want) {
          t.alpha = Math.abs(want - t.alpha) < 0.02 ? want : t.alpha + (want - t.alpha) * k;
          t.img.setAlpha(t.alpha);
        }
      }
      const G = NATURE.herbe, prev = this.grassPrev;
      const dx = prev ? P.x - prev.x : 0;
      const moving = !!(prev && Math.hypot(dx, P.y - prev.y) > 0.05);
      this.grassPrev = { x: P.x, y: P.y };
      for (const g of this.grass) {
        const inside = Math.abs(P.x - g.x) < G.reach.x && P.y > g.y - G.reach.up && P.y < g.y + G.reach.down;
        if (inside && moving && (!g.inside || g.t < 0) && !reduced()) {
          g.t = 0;
          g.dir = Math.abs(dx) > 0.05 ? Math.sign(dx) : (P.x < g.x ? 1 : -1);
        }
        g.inside = inside;
        if (g.t < 0) continue;
        g.t += dt * 1000;
        const i = Math.floor(g.t / G.step);
        if (i >= G.swing.length) { g.t = -1; g.img.setFrame(g.base); continue; }
        let f = G.swing[i];
        if (g.dir < 0) f = f === 1 ? 3 : f === 2 ? 4 : f === 3 ? 1 : f === 4 ? 2 : 0;
        g.img.setFrame(g.base + f);
      }
    }

    // ---------- les maisons des voisins ----------

    // Un toucher sur une maison qui a une porte (un passage de même nom) : on va jusqu'à la
    // porte, et on entre.
    tapMaison(w) {
      const b = (this.buildings || []).find((q) => w.x >= q.x0 && w.x <= q.x1 && w.y >= q.top && w.y <= q.base + 8 && this.passages.some((p) => p.name === q.name));
      if (!b) return false;
      const q = this.passages.find((p) => p.name === b.name), r = q.rect;
      this.entering = { q, x: r.x + r.width / 2, y: r.y + r.height - 3 };
      this.goTo(this.entering.x, this.entering.y);
      return true;
    }

    stepEntering() {
      const e = this.entering;
      if (!e || this.path.length) return;
      this.entering = null;
      if (Math.hypot(e.x - this.heroPos.x, e.y - this.heroPos.y) < 14) this.leave(e.q);
    }

    // L'intérieur (?carte=interieur) : la maison de la ferme (assets/maison_interieur.json), son
    // plancher (la tuile la plus fréquente), les meubles de la famille, la famille.
    makeInterior(map) {
      this.npcs = [];
      const f = this.famille;
      if (!f) return;
      const layer = this.layers.architecture;
      const count = new Map();
      const edge = layer.getTileAt(0, 0, true);
      layer.forEachTile((t) => { if (t.index >= 0 && (!edge || t.index !== edge.index)) count.set(t.index, (count.get(t.index) || 0) + 1); });
      let sol = -1, best = 0;
      for (const [i, n] of count) if (n > best) { best = n; sol = i; }
      this.walk = [];
      for (let y = 0; y < map.height; y++) {
        const row = [];
        for (let x = 0; x < map.width; x++) { const t = layer.getTileAt(x, y); row.push(!!t && t.index === sol); }
        this.walk.push(row);
      }
      // les meubles : posés en bas au centre de leur place ; ceux qui ne sont pas à plat arrêtent
      // le personnage (les cases dont le centre est sous leur bas)
      for (const o of ((map.getObjectLayer('meubles') || {}).objects) || []) {
        const dessin = meubleDe(o.name, f);
        if (!dessin || !this.textures.exists('meuble_' + dessin)) continue;
        const plat = VOISINS.plats.test(dessin);
        this.add.image(Math.round(o.x + o.width / 2), Math.round(o.y + o.height), 'meuble_' + dessin).setOrigin(0.5, 1).setDepth(plat ? -50 : o.y + o.height - 2);
        if (plat) continue;
        for (let ty = Math.floor(o.y / T); ty <= Math.floor((o.y + o.height) / T); ty++) {
          for (let tx = Math.floor(o.x / T); tx <= Math.floor((o.x + o.width) / T); tx++) {
            const cx = tx * T + T / 2, cy = ty * T + T / 2;
            if (this.walk[ty] && cx >= o.x && cx <= o.x + o.width && cy >= o.y + o.height - 14 && cy <= o.y + o.height) this.walk[ty][tx] = false;
          }
        }
      }
      this.cameras.main.setBackgroundColor(VOISINS.fond);
      // la famille, chacun sur une case libre du plancher
      const libres = [];
      this.walk.forEach((row, y) => row.forEach((ok, x) => { if (ok) libres.push({ x, y }); }));
      const noms = (this.cache.json.get('perso_cases') || {}).frames || [];
      this.npcFrame = (name) => Math.max(0, noms.indexOf(name));
      for (const m of f.membres) {
        const key = sheetKey(m.perso, m.enfant);
        if (!this.textures.exists(key) || !libres.length) continue;
        const c = libres.splice(Math.floor(Math.random() * libres.length), 1)[0];
        const x = c.x * T + T / 2, y = c.y * T + T - 2;
        const s = this.add.sprite(x, y, key, this.npcFrame('idle_bas_0')).setOrigin(0.5, 30 / 32);
        const shadow = this.add.ellipse(x, y, m.enfant ? 9 : 11, 4, 0x1e1a18, 0.3);
        this.npcs.push({ m, s, shadow, x, y, path: [], wait: 0.5 + Math.random() * 3, face: 'bas', walked: 0, speed: m.enfant ? VOISINS.kidSpeed : VOISINS.speed, talk: 0 });
      }
      const parents = f.membres.filter((m) => !m.enfant).map((m) => m.prenom), enfants = f.membres.filter((m) => m.enfant).map((m) => m.prenom);
      const liste = (l) => (l.length > 1 ? l.slice(0, -1).join(', ') + ' et ' + l[l.length - 1] : l[0]);
      this.say(`🏠 Chez les ${f.nom} : ${liste(parents)}, et ${enfants.length > 1 ? 'leurs enfants' : 'leur enfant'} ${liste(enfants)}.`);
    }

    // La porte de la maison (en bas de la pièce du milieu) : ramène devant la maison.
    interiorExit() {
      const r = VOISINS.sortie;
      return {
        name: 'sortie', x: r.x, y: r.y, width: r.w, height: r.h,
        properties: [{ name: 'cible', value: 'ville-carte.html?carte=transition&arrivee=' + this.maison }, { name: 'sens', value: 'bas' }, { name: 'proche', value: 40 }],
      };
    }

    // Un toucher sur un membre de la famille : il se tourne vers le personnage et lui parle.
    tapVoisin(w) {
      const n = (this.npcs || []).find((q) => Math.abs(w.x - q.x) <= 8 && w.y <= q.y + 3 && w.y >= q.y - (q.m.enfant ? 24 : 30));
      if (!n) return false;
      const f = this.famille, l = VOISINS.paroles[n.m.enfant ? 'enfant' : 'adulte'];
      n.path = [];
      n.talk = 3;
      n.face = 'cote';
      n.s.setFlipX(this.heroPos.x < n.x);
      this.say(`👋 ${n.m.prenom} ${f.nom} : « ${l[Math.floor(Math.random() * l.length)]} »`);
      return true;
    }

    // La famille va et vient : une case libre au hasard, on y va, on attend un peu.
    stepFamily(time, dt) {
      for (const n of this.npcs || []) {
        let moving = false;
        if (n.talk > 0) n.talk -= dt;
        else if (n.path.length) {
          const to = n.path[0], dx = to.x - n.x, dy = to.y - n.y, l = Math.hypot(dx, dy), st = n.speed * dt;
          if (Math.abs(dx) > Math.abs(dy) * 0.8) { n.face = 'cote'; n.s.setFlipX(dx < 0); } else { n.face = dy > 0 ? 'bas' : 'haut'; n.s.setFlipX(false); }
          if (l <= st) { n.x = to.x; n.y = to.y; n.path.shift(); } else { n.x += (dx / l) * st; n.y += (dy / l) * st; }
          n.walked += Math.min(l, st);
          moving = true;
          if (!n.path.length) n.wait = VOISINS.wait[0] + Math.random() * (VOISINS.wait[1] - VOISINS.wait[0]);
        } else if ((n.wait -= dt) <= 0) {
          const H = this.map.height, W = this.map.width;
          for (let k = 0; k < 20 && !n.path.length; k++) {
            const tx = Math.floor(Math.random() * W), ty = Math.floor(Math.random() * H);
            if (!this.canWalk(tx, ty) || Math.hypot(tx * T - n.x, ty * T - n.y) > 9 * T) continue;
            n.path = this.findPath(n.x, n.y, tx * T + T / 2, ty * T + T - 2) || [];
          }
          if (!n.path.length) n.wait = 1;
        }
        n.s.setFrame(this.npcFrame(moving ? `marche_${n.face}_${Math.floor(n.walked / 4) % 4}` : `idle_${n.face}_${Math.floor(time / 600 + n.m.perso) % 2}`));
        n.s.setPosition(Math.round(n.x), Math.round(n.y)).setDepth(n.y);
        n.shadow.setPosition(Math.round(n.x), Math.round(n.y)).setDepth(n.y - 0.5);
      }
    }

    canWalk(tx, ty) {
      return !!(this.walk[ty] && this.walk[ty][tx]);
    }

    // Le chemin le plus court (en tuiles, 8 directions sans couper un coin) jusqu'à la tuile
    // marchable la plus proche du point visé.
    goTo(x, y) {
      const steps = this.findPath(this.heroPos.x, this.heroPos.y, x, y);
      if (steps) this.path = steps;
    }

    // Le chemin (une liste de points, px) de (fx, fy) jusqu'à (x, y), ou null.
    findPath(fx, fy, x, y) {
      const W = this.map.width, H = this.map.height;
      let gx = Math.floor(x / T), gy = Math.floor(y / T);
      if (!this.canWalk(gx, gy)) {
        let best = null;
        for (let r = 1; r < 8 && !best; r++) {
          for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
            if (Math.max(Math.abs(dx), Math.abs(dy)) !== r || !this.canWalk(gx + dx, gy + dy)) continue;
            const d = Math.hypot(dx, dy);
            if (!best || d < best.d) best = { x: gx + dx, y: gy + dy, d };
          }
        }
        if (!best) return null;
        gx = best.x; gy = best.y; x = gx * T + T / 2; y = gy * T + T - 2;
      }
      const sx = Math.floor(fx / T), sy = Math.floor(fy / T);
      const prev = new Map([[sy * W + sx, -1]]);
      const queue = [sy * W + sx];
      const goal = gy * W + gx;
      for (let head = 0; head < queue.length && !prev.has(goal); head++) {
        const c = queue[head], cx = c % W, cy = (c - cx) / W;
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]) {
          const nx = cx + dx, ny = cy + dy, n = ny * W + nx;
          if (nx < 0 || ny < 0 || nx >= W || ny >= H || prev.has(n) || !this.canWalk(nx, ny)) continue;
          if (dx && dy && (!this.canWalk(cx + dx, cy) || !this.canWalk(cx, cy + dy))) continue;
          prev.set(n, c);
          queue.push(n);
        }
      }
      if (!prev.has(goal)) return null;
      const steps = [];
      for (let c = goal; prev.get(c) !== -1; c = prev.get(c)) steps.push({ x: (c % W) * T + T / 2, y: Math.floor(c / W) * T + T - 2 });
      steps.reverse();
      if (steps.length) steps[steps.length - 1] = { x: Math.round(x), y: Math.round(y) };
      return steps;
    }

    // Le feuillage devant la promeneuse s'efface un peu ; celui qu'elle a quitté revient.
    fadeFoliage(x, y) {
      for (const t of this.faded) t.alpha = 1;
      if (!this.layers[DEVANT]) return;
      this.faded = this.layers[DEVANT].getTilesWithinWorldXY(x - HERO.w / 2, y - HERO.foot, HERO.w, HERO.h - 2) || [];
      for (const t of this.faded) t.alpha = FEUILLAGE_ALPHA;
    }

    update(time, delta) {
      this.stepTileAnims(time);
      const dt = Math.min(delta, 100) / 1000;
      this.stepTraffic(time, dt);
      this.stepPassages(time);
      this.stepClock(time);
      this.stepSchool(time, dt);
      this.stepTrain(dt);
      this.stepTrip(dt);
      this.stepArrival(dt);
      this.stepFinds(time);
      this.stepFauna(time, dt);
      this.stepMine(dt);
      this.stepWork(dt);
      this.stepEntering();
      this.stepFamily(time, dt);
      const P = this.heroPos;
      const x0 = P.x, y0 = P.y;
      let vx = 0, vy = 0;
      const k = this.locked ? null : this.keys;
      if (k) {
        vx = (k.RIGHT.isDown || k.D.isDown ? 1 : 0) - (k.LEFT.isDown || k.Q.isDown || k.A.isDown ? 1 : 0);
        vy = (k.DOWN.isDown || k.S.isDown ? 1 : 0) - (k.UP.isDown || k.Z.isDown || k.W.isDown ? 1 : 0);
      }
      if (vx || vy) {
        this.path = [];
        if (this.work && !this.work.started) this.work = null;
        this.entering = null;
        const l = Math.hypot(vx, vy), st = HERO.speed * dt;
        const nx = P.x + (vx / l) * st, ny = P.y + (vy / l) * st;
        // glisse le long d'un bord : chaque axe séparément
        if (this.canWalk(Math.floor(nx / T), Math.floor(P.y / T))) P.x = nx;
        if (this.canWalk(Math.floor(P.x / T), Math.floor(ny / T))) P.y = ny;
      } else if (this.path.length) {
        const to = this.path[0];
        const dx = to.x - P.x, dy = to.y - P.y, l = Math.hypot(dx, dy), st = HERO.speed * dt;
        if (l <= st) { P.x = to.x; P.y = to.y; this.path.shift(); } else { P.x += (dx / l) * st; P.y += (dy / l) * st; }
        vx = dx; vy = dy;
      }
      const H = this.hero;
      const moved = Math.hypot(P.x - x0, P.y - y0);
      if (this.mining) {
        H.setFrame(this.frame(this.mining.frame));
      } else if (moved > 0) {
        if (Math.abs(vx) > Math.abs(vy) * 0.8) { this.face = 'cote'; H.setFlipX(vx < 0); } else { this.face = vy > 0 ? 'bas' : 'haut'; H.setFlipX(false); }
        this.walked += moved;
        H.setFrame(this.frame(`marche_${this.face}_${Math.floor(this.walked / HERO.stride) % 4}`));
      } else {
        // debout : elle respire (deux images, lentement)
        H.setFrame(this.frame(`idle_${this.face}_${Math.floor(time / 600) % 2}`));
      }
      H.setPosition(Math.round(P.x), Math.round(P.y)).setDepth(P.y).setAlpha(this.heroAlpha);
      this.shadow.setPosition(Math.round(P.x), Math.round(P.y)).setDepth(P.y - 0.5).setAlpha(this.heroAlpha);
      this.fadeFoliage(Math.round(P.x), Math.round(P.y));
      this.stepNature(dt);
      if (this.light) this.light.setPosition(Math.round(P.x), Math.round(P.y - 12));
      // les bâtiments autour des voitures, puis de la promeneuse
      const boxes = (this.cars || []).map((c) => ({ x: c.x - 30, y: c.y - 38, w: 60, h: 56, foot: c.y, see: false }));
      boxes.push({ x: P.x - HERO.w / 2, y: P.y - HERO.foot, w: HERO.w, h: HERO.h, foot: P.y, see: true });
      this.uncover(boxes);
    }
  }

  // Les fenêtres de la gare et des lieux, et la ligne des messages : créées une fois dans la
  // page qui accueille la carte (leur style : css/jeu.css, « .ville-fenetre »).
  function ensureDom() {
    if (document.getElementById('gare-fenetre')) return;
    const box = document.createElement('div');
    box.innerHTML = `
      <div class="ville-message" id="message" role="status" aria-live="polite" hidden></div>
      <div class="ville-fenetre" id="gare-fenetre" role="dialog" aria-modal="true" aria-labelledby="gare-titre" hidden>
        <div class="boite">
          <h2 id="gare-titre">🚉 La gare</h2>
          <p id="gare-texte">Où voulez-vous aller ?</p>
          <div class="choix" id="gare-choix"></div>
          <button type="button" class="annuler" id="gare-annuler">Rester ici</button>
        </div>
      </div>
      <div class="ville-fenetre" id="lieu-fenetre" role="dialog" aria-modal="true" aria-labelledby="lieu-titre" hidden>
        <div class="boite">
          <h2 id="lieu-titre"></h2>
          <div id="lieu-corps"></div>
          <button type="button" class="annuler" id="lieu-fermer">Fermer</button>
        </div>
      </div>`;
    while (box.firstElementChild) document.body.appendChild(box.firstElementChild);
  }

  // Une carte à la fois : start la montre dans `parent` (search : « ?carte=…&arrivee=… »),
  // stop l'enlève (et ferme ses fenêtres).
  let game = null;
  function stop() {
    for (const id of ['gare-fenetre', 'lieu-fenetre', 'message']) { const el = document.getElementById(id); if (el) el.hidden = true; }
    if (game) { game.destroy(true); game = null; }
    window.Ville = null;
  }
  function start(parent, search) {
    stop();
    configure(search);
    game = new Phaser.Game({
      type: Phaser.AUTO,
      parent,
      backgroundColor: '#665951',
      pixelArt: true,
      roundPixels: true,     // la caméra et les sprites calés sur des pixels entiers
      scale: { mode: Phaser.Scale.RESIZE, width: parent.clientWidth, height: parent.clientHeight },
      scene: [VilleScene],
    });
    return game;
  }
  window.VilleCarte = { start, stop, cartes: Object.keys(CARTES), carte: () => (game ? NOM_CARTE : null) };
})();
