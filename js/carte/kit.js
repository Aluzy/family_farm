/* carte/kit.js — ce que toutes les cartes Phaser du jeu partagent (window.CarteKit).
 *
 * La ferme (js/farm-stage.js et js/carte/ferme/), la ville et les cartes qu'on rejoint par
 * elle (js/ville-carte.js et js/carte/ville/), l'infra-monde (js/infra-monde.js), et les
 * personnages (js/fermier.js, js/famille-ferme.js) lisent ici leurs réglages communs au lieu
 * d'en garder chacun une copie qui finissait par diverger :
 *
 *   - T, la tuile (16 px) ; v(fichier), l'adresse versionnée d'un fichier de assets/ ;
 *   - reduit(), le réglage « réduire les animations » (une seule requête, lue à chaque image) ;
 *   - ratio(), la densité de l'écran à laquelle le canvas des cartes est rendu (plafonnée à 3) ;
 *   - extrude(), les planches de tuiles à bord répété (pas de liseré au zoom non entier), faites
 *     une fois par planche ;
 *   - planche(), planchePerso() : la planche d'un personnage (assets/personnages/) ;
 *   - saisie() : le joueur écrit dans un champ de la page, ou une fenêtre est ouverte (le clavier
 *     n'est pas aux cartes) ;
 *   - regard(dx, dy) : de face, de dos ou de profil selon le sens de la marche ;
 *   - cases(noms) : les cases d'une planche par leur nom (une table, pas une recherche par image) ;
 *   - VITESSES : la vitesse de marche de chacun, carte par carte (px/s) ;
 *   - cycle(), imageA(), animTuiles(), pasAnimTuiles() : les tuiles animées de Tiled ;
 *   - FLECHE, balance() : la flèche bleue des passages vers une autre carte ;
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
  function ratio() { return Math.min(3, Math.max(1, global.devicePixelRatio || 1)); }

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
  // jeu est ouverte (#modal-root : la gare, un étal…) : les flèches et ZQSD sont à lui, le
  // personnage ne bouge pas (la ville, l'infra-monde).
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
  function regard(dx, dy) {
    if (Math.abs(dx) > Math.abs(dy) * 0.8) return dx < 0 ? REGARDS.gauche : REGARDS.droite;
    return dy > 0 ? REGARDS.bas : REGARDS.haut;
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
  // ville est vue de plus près que la ferme), mais toutes sont ici.
  const VITESSES = {
    fermier: 58,                                   // le personnage, à la ferme (js/fermier.js)
    famille: { adulte: 26, enfant: 32 },           // les autres membres, à la ferme (js/famille-ferme.js)
    ville: 48,                                     // le personnage, en ville et sur les cartes du train
    enfantsBus: 32,                                // les enfants qui vont au bus de l'école
    voisins: { adulte: 24, enfant: 32 },           // les voisins, chez eux
    infra: 46,                                     // le personnage, dans l'infra-monde
    habitant: 44,                                  // l'habitant de l'infra-monde (il flâne à 60 %)
  };

  // L'école : la même pour tous les enfants (ceux de la ferme, des voisins de la transition, de
  // l'immeuble de la ville), de `debut` h à `fin` h, les jours d'école (HorlogeSortie.JOURS_ECOLE).
  // Chaque enfant part de chez lui le temps qu'il lui faut pour y être à l'heure : sa distance
  // à parcourir divisée par sa vitesse (une heure du jeu : `sParHeure` s), et `marge` h d'avance.
  // Ceux de la ferme et de la transition prennent le bus de l'école : il roule `bus` h de l'arrêt
  // de la transition à celui de la ville (hors des cartes) ; les enfants y montent en `monter` s.
  // `longueurs` : le chemin des enfants sur la carte de la ville (de l'arrêt du bus à la porte de
  // l'école) et sur celle de la transition (du bord de la ferme à l'arrêt), en px, tels que
  // les cartes de Tiled les tracent ; une carte qui a le sien sous les yeux le mesure.
  const ECOLE = { debut: 8.75, fin: 16.75, sParHeure: 30, marge: 0.05, bus: 0.5, monter: 2, longueurs: { ville: 115, transition: 997 } };

  // Combien d'heures du jeu pour faire `px` px à `vitesse` px/s (et `s` s de plus).
  const heuresDeMarche = (px, vitesse, s = 0) => (px / vitesse + s) / ECOLE.sParHeure;

  // L'horaire du bus de l'école, compté à rebours depuis le début de l'école (et à partir de sa
  // fin, le soir) : l'heure où il est à l'arrêt de la ville (villeMatin : les enfants en
  // descendent et marchent jusqu'à l'école ; villeSoir : ils y sont montés), à l'arrêt de la
  // transition (transitionMatin : ils y montent ; transitionSoir : ils en descendent), et celles
  // où les enfants de la ferme passent le bord de la ferme (sortieFerme, le matin ; retourFerme,
  // le soir). `L` : les longueurs mesurées (ECOLE.longueurs sinon).
  function horaireEcole(L) {
    const E = ECOLE, v = VITESSES.enfantsBus;
    const lv = (L && L.ville) || E.longueurs.ville, lt = (L && L.transition) || E.longueurs.transition;
    const villeMatin = E.debut - heuresDeMarche(lv, v) - E.marge;
    const transitionMatin = villeMatin - E.bus;
    const sortieFerme = transitionMatin - heuresDeMarche(lt, v, E.monter);
    const villeSoir = E.fin + heuresDeMarche(lv, v, E.monter);
    const transitionSoir = villeSoir + E.bus;
    const retourFerme = transitionSoir + heuresDeMarche(lt, v);
    return { villeMatin, transitionMatin, sortieFerme, villeSoir, transitionSoir, retourFerme };
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

  // La flèche bleue des passages (assets/fleche_passage.png, scripts/ville/fleche.py : images
  // droite, gauche, haut, bas, de 32 px) : elle paraît quand le personnage est à moins de
  // `near` px du passage et se balance de `bob` px, un aller-retour en 2π × `periode` ms.
  const FLECHE = { key: 'fleche_passage', file: 'fleche_passage.png', size: 32, near: 80, bob: 3, periode: 220, sens: ['droite', 'gauche', 'haut', 'bas'] };
  const balance = (time) => (reduit() ? 0 : Math.round(Math.sin(time / FLECHE.periode) * FLECHE.bob));

  // Les petits textes au-dessus du personnage (« ! » à la touche, « … ») : une
  // police, des couleurs, un contour. `taille` en px de carte ; rendus à 4 fois leur taille
  // pour rester nets au zoom.
  const TEXTE = { fontFamily: "'Ferme Dialogue', sans-serif", color: '#fffbea', stroke: '#2a2018', strokeThickness: 3, resolution: 4 };
  function texte(scene, x, y, s, taille) {
    return scene.add.text(Math.round(x), Math.round(y), s, { fontFamily: TEXTE.fontFamily, fontSize: (taille || 9) + 'px', color: TEXTE.color, stroke: TEXTE.stroke, strokeThickness: TEXTE.strokeThickness })
      .setOrigin(0.5, 1).setResolution(TEXTE.resolution);
  }

  global.CarteKit = Object.assign(global.CarteKit || {}, {
    T, v, reduit, ratio, extrude, planche, planchePerso, saisie, regard, cases, VITESSES, ECOLE, heuresDeMarche, horaireEcole, longueur,
    cycle, imageA, animTuiles, pasAnimTuiles, FLECHE, balance, TEXTE, texte,
  });
})(window);
