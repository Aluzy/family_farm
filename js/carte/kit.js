/* carte/kit.js — ce que toutes les cartes Phaser du jeu partagent (window.CarteKit).
 *
 * La ferme (js/farm-stage.js et js/carte/ferme/), la mine (js/grotte.js), et les
 * personnages (js/fermier.js, js/famille-ferme.js) lisent ici leurs réglages communs au lieu
 * d'en garder chacun une copie qui finissait par diverger :
 *
 *   - T, la tuile (16 px) ; v(fichier), l'adresse versionnée d'un fichier de assets/ ;
 *   - reduit(), le réglage « réduire les animations » (une seule requête, lue à chaque image) ;
 *   - ratio(), la densité de l'écran à laquelle le canvas des cartes est rendu (plafonnée à 3) ;
 *   - qualite(), reglages(), reglerQualite() : la qualité du rendu (fiche 9a : « économie » sur un
 *     téléphone, « normale » sur un ordinateur, ou au choix dans les Options) ;
 *   - extrude(), les planches de tuiles à bord répété (pas de liseré au zoom non entier), faites
 *     une fois par planche ;
 *   - planche(), planchePerso() : la planche d'un personnage (assets/personnages/) ;
 *   - saisie() : le joueur écrit dans un champ de la page, ou une fenêtre est ouverte (le clavier
 *     n'est pas aux cartes) ;
 *   - regard(dx, dy) : de face, de dos ou de profil selon le sens de la marche ; PAS,
 *     imageMarche(), allure() : l'image du pas selon le chemin parcouru, le regard lissé (fiche 20) ;
 *   - cases(noms) : les cases d'une planche par leur nom (une table, pas une recherche par image) ;
 *   - VITESSES : la vitesse de marche de chacun, carte par carte (px/s) ;
 *   - REGION : le découpage du sol en régions (docs/grand-monde.md, étape 2) ;
 *   - cycle(), imageA(), animTuiles(), pasAnimTuiles() : les tuiles animées de Tiled ;
 *   - TEXTE, texte() : les petits textes qui montent au-dessus du personnage (« … »).
 *
 * Le reste du kit est dans les fichiers voisins, chargés juste après celui-ci : chemins.js
 * (le chemin le plus court, la case libre la plus proche), nature.js (l'herbe haute, les arbres
 * devant le personnage, les éclats, la pêche), gestes.js (l'appui, le double appui, la marche au
 * doigt, la secousse de la vue, la bulle « +1 »), lumiere.js (le jour et la nuit) et eau.js (l'eau
 * vivante : lacs, fontaines, mer).
 *
 * Script classique, chargé avant tous les autres scripts des cartes (voir jeu.html) ; il ne
 * demande pas Phaser pour se charger. Voir docs/architecture-phaser.md.
 */
(function (global) {
  'use strict';

  const T = 16;

  // Empreintes des fichiers de assets/ : « nom → empreinte de son contenu », écrites par
  // scripts/build-site.mjs dans js/assets-versions.js (site en ligne seulement). Chaque
  // fichier est demandé avec « ?v=<empreinte> » : modifié, il change d'adresse et le
  // téléphone le recharge au lieu de garder l'ancien en cache. Sans ce fichier (jeu ouvert
  // depuis le dépôt), les adresses restent sans suffixe. `file` : un nom dans assets/, avec
  // ou sans le préfixe « assets/ » (la ferme charge depuis assets/, les autres cartes non).
  function v(file) {
    const t = global.FERME_ASSET_VERSIONS, k = String(file).replace(/^assets\//, '');
    return t && t[k] ? file + '?v=' + t[k] : file;
  }

  // La question est posée à chaque image (tuiles animées, vie d'ambiance, personnages) : la
  // requête est créée une fois, sa réponse suit toute seule le réglage du système.
  const REDUIT = global.matchMedia ? global.matchMedia('(prefers-reduced-motion: reduce)') : null;
  function reduit() {
    return !!(REDUIT && REDUIT.matches);
  }

  // Le canvas des cartes (un seul pour toutes : js/carte/jeu.js) est rendu à la densité de
  // l'écran, plafonnée à 3 : la ferme, au zoom non entier, garde des pixels réguliers ; les
  // autres cartes y prennent un zoom entier en pixels de l'écran.
  // Fiche 9a : en qualité « économie » (un téléphone), la moitié de cette densité (au moins 1) : quatre
  // fois moins de pixels à dessiner, chacun posé sur deux pixels de l'écran en largeur et en hauteur
  // (net, sans flou : le canvas garde « image-rendering: pixelated »).
  function ratio() {
    const d = Math.min(3, Math.max(1, global.devicePixelRatio || 1));
    return reglages().demiDensite ? Math.max(1, d / 2) : d;
  }

  // Fiche 9a : la qualité du rendu des cartes, un réglage de l'appareil (pas de la partie : le moteur
  // ne le voit jamais), gardé dans localStorage (QUALITE.cle) : « auto » (par défaut), « economie » ou
  // « normale ». En « auto », un téléphone ou une tablette (un écran tactile sans souris, ou un
  // navigateur qui se dit mobile) prend « economie », un ordinateur « normale » : sur ordinateur, rien ne
  // change. Ce que l'économie règle (QUALITE.reglages) :
  //   - demiDensite : le canvas à la moitié de la densité de l'écran (ratio) ;
  //   - brouillardPx, brouillardImages : le brouillard du grand monde en points de 4 px de carte au lieu
  //     de 2 (quatre fois moins de points à calculer et à envoyer à la carte graphique), refait deux fois
  //     moins souvent pour sa dérive (js/carte/ferme/brouillard.js) ;
  //   - lumierePx : la carte de lumière de la nuit (le voile et ses lueurs) en points de 2 px de carte
  //     (js/carte/lumiere.js) ;
  //   - merVivante : la mer du grand monde sans son eau vivante (le shader de la houle, de l'écume et du
  //     ressac) : ses tuiles animées seulement, comme avec « animations réduites » ; les lacs, les
  //     rivières et les étangs gardent la leur (js/carte/eau.js) ;
  //   - vegetationPres, vegetationLoin : les images des arbres, des rochers et des hameaux du monde
  //     faites plus près de la vue, et défaites plus tôt (js/carte/ferme/vegetation.js).
  const QUALITE = {
    cle: 'ferme-qualite',
    choix: ['auto', 'economie', 'normale'],
    reglages: {
      normale: { demiDensite: false, brouillardPx: 2, brouillardImages: 4, lumierePx: 1, merVivante: true, vegetationPres: 96, vegetationLoin: 384 },
      economie: { demiDensite: true, brouillardPx: 4, brouillardImages: 8, lumierePx: 2, merVivante: false, vegetationPres: 32, vegetationLoin: 192 },
    },
  };
  let qualiteVue = null;          // la qualité en vigueur (calculée une fois, puis à chaque changement)
  function qualiteChoisie() {
    try {
      const q = global.localStorage.getItem(QUALITE.cle);
      return QUALITE.choix.includes(q) ? q : 'auto';
    } catch (e) {
      return 'auto';
    }
  }
  function appareilMobile() {
    const N = global.navigator || {};
    if (N.userAgentData && typeof N.userAgentData.mobile === 'boolean' && N.userAgentData.mobile) return true;
    const mm = (q) => !!(global.matchMedia && global.matchMedia(q).matches);
    return mm('(pointer: coarse)') && !mm('(any-pointer: fine)');
  }
  function qualite() {
    if (!qualiteVue) {
      const q = qualiteChoisie();
      qualiteVue = q === 'auto' ? (appareilMobile() ? 'economie' : 'normale') : q;
    }
    return qualiteVue;
  }
  function reglages() { return QUALITE.reglages[qualite()]; }
  // Change le réglage (« auto », « economie » ou « normale ») ; le canvas se refait à sa densité
  // (CarteJeu.taille), le reste suit à la prochaine image.
  function reglerQualite(q) {
    if (!QUALITE.choix.includes(q)) return qualite();
    try { global.localStorage.setItem(QUALITE.cle, q); } catch (e) { /* le temps de la visite */ }
    qualiteVue = q === 'auto' ? (appareilMobile() ? 'economie' : 'normale') : q;
    if (global.CarteJeu && global.CarteJeu.taille) global.CarteJeu.taille();
    return qualiteVue;
  }

  // Les planches de tuiles « extrudées » : chaque tuile recopiée avec un bord d'un pixel qui
  // répète son propre bord (marge 1, espacement 2). Quand la caméra tombe entre deux pixels
  // (zoom, écran à densité non entière), le GPU qui lit juste à côté d'une tuile retombe sur
  // sa propre couleur, et non sur la tuile voisine de la planche : plus de fines lignes sombres
  // aux jointures. Les numéros des tuiles ne changent pas. Faite une fois par planche : les
  // textures restent d'une carte à l'autre (un seul jeu Phaser, js/carte/jeu.js), la planche
  // extrudée aussi.
  function extrude(textures, key, t) {
    const out = key + '_extrude';
    if (textures.exists(out)) return out;
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
    textures.addCanvas(out, canvas);
    return out;
  }

  // La planche d'un personnage, dans assets/ : un adulte (personnages/perso_NN.png) ou un
  // enfant (personnages/enfant_NN.png : dessiné plus petit, scripts/personnage/fermier.py).
  const planche = (n, enfant) => 'personnages/' + (enfant ? 'enfant_' : 'perso_') + String(n).padStart(2, '0') + '.png';
  // Le personnage principal de la partie (FermeHote.perso, js/ui/excursion.js) sur une autre
  // carte que la ferme : sa planche et ses cases nommées ; sans partie, la fermière.
  function planchePerso() {
    const H = global.FermeHote;
    const n = H && H.perso ? H.perso() : null;
    return n ? { file: 'assets/' + planche(n), names: 'assets/personnages/cases.json' } : { file: 'assets/fermiere.png', names: 'assets/fermiere.json' };
  }

  // Le joueur écrit dans un champ de la page (un nom, une quantité, un menu), ou une fenêtre du
  // jeu est ouverte (#modal-root) : les flèches et ZQSD sont à lui, le personnage ne bouge pas
  // (la mine).
  function saisie() {
    const el = document.activeElement;
    if (el && (/^(INPUT|SELECT|TEXTAREA)$/.test(el.tagName) || el.isContentEditable)) return true;
    const root = document.getElementById('modal-root');
    return !!(root && root.childElementCount);
  }

  // Où regarde un personnage qui marche de (dx, dy) : de profil (« cote », retourné s'il va
  // à gauche) dès que le pas est un peu plus de côté que vertical, sinon de face ou de dos.
  // (quatre réponses possibles, faites une fois : appelée à chaque image pour chaque marcheur)
  const REGARDS = {
    gauche: Object.freeze({ face: 'cote', flip: true }), droite: Object.freeze({ face: 'cote', flip: false }),
    bas: Object.freeze({ face: 'bas', flip: false }), haut: Object.freeze({ face: 'haut', flip: false }),
  };
  // `avant` (facultatif : le regard qu'il a déjà) : un peu de retenue près de la diagonale (fiche
  // 20) ; de profil, il le reste tant que le pas est plus de côté que 0,6 fois vertical ; de face ou
  // de dos, il ne se met de profil qu'au-delà de la diagonale. Sur une diagonale, il ne bat plus
  // d'une vue à l'autre.
  function regard(dx, dy, avant) {
    const seuil = !avant ? 0.8 : avant.face === 'cote' ? 0.6 : 1.05;
    if (Math.abs(dx) > Math.abs(dy) * seuil) return dx < 0 ? REGARDS.gauche : REGARDS.droite;
    return dy > 0 ? REGARDS.bas : REGARDS.haut;
  }

  // La marche (fiche 20). Les cases marche_<vue>_0..3 des planches de personnages
  // (scripts/personnage/chibi.py) : contact, passage, contact de l'autre pied, passage. De profil,
  // le pied posé recule de PAS px d'une image à l'autre (un enfant a de plus petits pas). On passe à
  // l'image suivante tous les FOULEE[qui] px parcourus : de quoi faire CADENCE images par seconde à
  // la vitesse de marche de chacun (VITESSES), un pas et demi par seconde, une allure posée (à une image
  // tous les PAS px, le pied ne glissait pas mais la marche était frénétique) ; plus vite il va,
  // plus vite les images défilent. imageMarche(parcouru, qui) : l'image après `parcouru` px depuis
  // le départ, `qui` le marcheur ('fermier', 'grotte', 'adulte' par défaut ou 'enfant') ; elle
  // commence par un passage (l'image 1, la plus proche de la pose debout), pas par les jambes écartées.
  const PAS = { adulte: 3, enfant: 2 };
  const CADENCE = 6;
  function imageMarche(parcouru, qui) {
    return (Math.floor(parcouru / FOULEE[qui || 'adulte']) + 1) & 3;
  }
  // allure() : le regard d'un marcheur, d'après le sens de ses pas lissé sur quelques px (LISSE) :
  // un chemin en escalier (une diagonale faite de pas droits et de pas en biais) ne le fait pas
  // tourner à chaque case ; un vrai virage (plus de 60°), un demi-tour, il les suit tout de suite.
  //   .pas(dx, dy, d, actuel) → { face, flip } : (dx, dy) le sens du pas, d les px parcourus,
  //   actuel le regard qu'il a (s'il a été tourné d'ailleurs, le lissage repart de zéro).
  const LISSE = 10;
  function allure() {
    let vx = 0, vy = 0, r = null;
    return {
      pas(dx, dy, d, actuel) {
        const l = Math.hypot(dx, dy);
        if (actuel && r && (actuel.face !== r.face || actuel.flip !== r.flip)) r = null;
        if (l < 1e-6) return r || actuel || REGARDS.bas;
        const ux = dx / l, uy = dy / l;
        if (!r || ux * vx + uy * vy < 0.5) { vx = ux; vy = uy; }
        else { const w = Math.min(1, (d || 0) / LISSE); vx += (ux - vx) * w; vy += (uy - vy) * w; }
        r = regard(vx, vy, r || actuel);
        return r;
      },
    };
  }

  // Les cases d'une planche par leur nom (la liste `frames` de son JSON) : une table faite une
  // fois, au lieu de chercher le nom dans la liste à chaque image ; un nom inconnu donne 0.
  // `cases(noms).de('marche', 'bas', 2)` vaut `cases(noms)('marche_bas_2')`, sans refaire le
  // nom à chaque image.
  function cases(noms) {
    const table = new Map();
    (noms || []).forEach((n, i) => { if (!table.has(n)) table.set(n, i); });
    const f = (name) => { const i = table.get(name); return i === undefined ? 0 : i; };
    const deja = {};
    f.de = (sorte, face, n) => {
      const parFace = deja[sorte] || (deja[sorte] = {});
      const liste = parFace[face] || (parFace[face] = []);
      let i = liste[n];
      if (i === undefined) i = liste[n] = f(sorte + '_' + face + '_' + n);
      return i;
    };
    return f;
  }

  // La vitesse de marche de chacun (px de carte par seconde) : chaque carte a sa mesure (la
  // grotte est vue de plus près que la ferme), mais toutes sont ici.
  const VITESSES = {
    fermier: 58,                                   // le personnage, à la ferme (js/fermier.js)
    famille: { adulte: 26, enfant: 32 },           // les autres membres, à la ferme (js/famille-ferme.js)
    grotte: 48,                                    // le personnage, dans la mine (js/grotte.js)
  };
  // px parcourus par image de marche (imageMarche) : CADENCE images par seconde à ces vitesses
  const FOULEE = {
    fermier: VITESSES.fermier / CADENCE, grotte: VITESSES.grotte / CADENCE,
    adulte: VITESSES.famille.adulte / CADENCE, enfant: VITESSES.famille.enfant / CADENCE,
  };

  // Le sol d'une carte n'est pas une seule image de sa taille (le grand monde serait bien trop
  // grand) : il est découpé en régions de `tuiles` × `tuiles` tuiles, chacune son canevas, créé
  // quand la région approche de la vue (à moins de `pres` px) et retiré quand elle s'en éloigne
  // (au-delà de `loin` px). Chaque canevas déborde de `bord` tuile sur ses voisines : au zoom non
  // entier, deux images bord à bord laisseraient voir un filet entre elles.
  // `tuiles` est la taille des régions du moteur (MONDE.REGION, js/engine/monde.js : la seule
  // source), que la page donne au montage de la ferme (FarmStage.mount, `regionTuiles`) : le
  // moteur et la scène parlent des mêmes régions (state.monde.vues). Rien tant qu'elle n'est pas
  // montée.
  const REGION = { tuiles: 0, bord: 1, pres: 256, loin: 768 };

  // Les régions d'une carte (au format de Tiled) qui ont quelque chose à relever au chargement
  // (arbres, rochers, barrières, eau, lieux de la vie d'ambiance) : celles que la carte nomme
  // (`regionsPleines` : [« rx,ry »…], écrit par le moteur, js/engine/monde.js : pour l'instant, la
  // ferme ; l'étape 4 y ajoutera les biomes), sinon toutes (la carte de Tiled, petite). Chacune :
  // { cle, c0, r0, c1, r1 } (ses colonnes c0 à c1 - 1, ses rangées r0 à r1 - 1, bornées à la carte).
  function regionsPleines(raw) {
    const W = raw.width, H = raw.height, N = REGION.tuiles || Math.max(W, H), out = [];
    const cles = Array.isArray(raw.regionsPleines) ? raw.regionsPleines : null;
    const une = (rx, ry) => {
      const c0 = rx * N, r0 = ry * N, c1 = Math.min(W, c0 + N), r1 = Math.min(H, r0 + N);
      if (c0 >= 0 && r0 >= 0 && c0 < c1 && r0 < r1) out.push({ cle: rx + ',' + ry, c0, r0, c1, r1 });
    };
    if (cles) for (const k of cles) { const [rx, ry] = String(k).split(',').map(Number); if (Number.isInteger(rx) && Number.isInteger(ry)) une(rx, ry); }
    else for (let ry = 0; ry * N < H; ry++) for (let rx = 0; rx * N < W; rx++) une(rx, ry);
    return out;
  }

  // Les cases de ces régions, lues région par région, puis rangées dans l'ordre des cases de la
  // carte (rangée × largeur + colonne) : un relevé qui les parcourt trouve ce qu'il cherche dans
  // le même ordre qu'en parcourant toute la carte (les mêmes numéros d'arbres, de rochers,
  // d'étendues d'eau), sans passer par les régions qui n'ont que du sol. Une fois par carte.
  const casesDe = new WeakMap();
  function casesPleines(raw) {
    let out = casesDe.get(raw);
    if (out) return out;
    const W = raw.width, liste = [];
    for (const r of regionsPleines(raw)) for (let y = r.r0; y < r.r1; y++) for (let x = r.c0; x < r.c1; x++) liste.push(y * W + x);
    out = Int32Array.from(liste).sort();
    casesDe.set(raw, out);
    return out;
  }

  // La longueur (px) d'une suite de points [{ x, y }], depuis `de` s'il est donné.
  function longueur(pts, de) {
    let d = 0, a = de || (pts && pts[0]);
    for (const p of pts || []) { d += Math.hypot(p.x - a.x, p.y - a.y); a = p; }
    return d;
  }

  // Les tuiles animées de Tiled : une animation [{ tileid, duration (ms) }…] → ses tuiles
  // (`ids`), la fin de chaque image (`ends`, ms depuis le début du cycle) et sa durée totale.
  function cycle(anim) {
    let t = 0;
    return { ids: anim.map((f) => f.tileid), ends: anim.map((f) => (t += Math.max(1, f.duration))), total: t, cur: -1 };
  }
  // L'image d'un cycle à l'instant `time` (ms) : toutes les tuiles d'un même numéro changent
  // ensemble, au rythme de l'horloge, comme dans Tiled.
  function imageA(c, time) {
    const t = time % c.total;
    let k = 0;
    while (k < c.ends.length - 1 && t >= c.ends[k]) k++;
    return k;
  }
  // Une carte Phaser (Tilemap) : ses tuiles animées, regroupées par numéro de tuile
  // (`layers` : ses calques). Elles s'animent en changeant l'index des tuiles posées.
  function animTuiles(map, layers) {
    const groups = new Map();
    for (const set of map.tilesets) {
      for (const [id, def] of Object.entries(set.tileData || {})) {
        if (!def.animation || def.animation.length < 2) continue;
        const c = cycle(def.animation);
        groups.set(set.firstgid + Number(id), Object.assign(c, { frames: c.ids.map((n) => set.firstgid + n), tiles: [] }));
      }
    }
    if (!groups.size) return [];
    for (const layer of Object.values(layers)) {
      layer.forEachTile((t) => { const g = groups.get(t.index); if (g) g.tiles.push(t); });
    }
    return [...groups.values()].filter((g) => g.tiles.length);
  }
  // Chaque image : les tuiles dont l'image a changé ; rien avec « réduire les animations ».
  function pasAnimTuiles(list, time) {
    if (reduit()) return;
    for (const g of list) {
      const k = imageA(g, time);
      if (k === g.cur) continue;
      g.cur = k;
      for (const t of g.tiles) t.index = g.frames[k];
    }
  }

  // Les petits textes au-dessus du personnage (« ! » à la touche, « … ») : une
  // police, des couleurs, un contour. `taille` en px de carte ; rendus à 4 fois leur taille
  // pour rester nets au zoom.
  const TEXTE = { fontFamily: "'Ferme Dialogue', sans-serif", color: '#fffbea', stroke: '#2a2018', strokeThickness: 3, resolution: 4 };
  function texte(scene, x, y, s, taille) {
    return scene.add.text(Math.round(x), Math.round(y), s, { fontFamily: TEXTE.fontFamily, fontSize: (taille || 9) + 'px', color: TEXTE.color, stroke: TEXTE.stroke, strokeThickness: TEXTE.strokeThickness })
      .setOrigin(0.5, 1).setResolution(TEXTE.resolution);
  }

  global.CarteKit = Object.assign(global.CarteKit || {}, {
    T, v, reduit, ratio, QUALITE, qualite, qualiteChoisie, reglages, reglerQualite, extrude, planche, planchePerso, saisie, regard, PAS, CADENCE, FOULEE, imageMarche, allure, cases, VITESSES, REGION, regionsPleines, casesPleines, longueur,
    cycle, imageA, animTuiles, pasAnimTuiles, TEXTE, texte,
  });
})(window);
