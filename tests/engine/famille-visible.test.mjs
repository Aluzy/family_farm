/* ==========================================================================
   Tests : la famille reste visible et ne traverse pas les murs (fiche 16) ; sa soirée dehors,
   ses repas quand elle a faim, son coucher et son lever (fiche 16b).
   Les scripts de la carte (js/carte/kit.js, chemins.js, …, js/fermier.js, js/famille-ferme.js,
   js/carte/ferme/chantier.js, habitants.js) sont chargés dans une fenêtre d'essai, sans Phaser :
   la scène est une maquette (ses images ne dessinent rien, elles gardent seulement leur état).
   - les chemins du personnage (fermier.path, que la famille et les habitants prennent aussi)
     passent par les portes et ne touchent jamais une case fermée, même d'un coin ; un but enfermé
     n'a pas de chemin, et on sait qu'il est hors d'atteinte (info.impossible) ;
   - devant la porte du foyer : dehors, devant la porte d'entrée, même quand le foyer est une
     chambre qu'on rejoint par la salle (et non plus dans le mur, sous la porte de la chambre) ;
   - ce que chacun doit faire à chaque heure (FamilleFerme.voulu, FAMILLE.HORAIRE) : dehors jusqu'au
     coucher, les enfants au lit de 20 h à 8 h, le compagnon de 22 h au lever du personnage ;
   - une journée de 6 h à 23 h simulée, et le matin d'après : chaque membre est toujours visible
     (dehors, dans la maison ou au lit), ne pose jamais le pied dans un mur et n'en traverse aucun ;
     à 19 h tous dehors, personne à table ; qui a faim va à la boîte, s'y sert et repart ; les
     enfants jouent (à deux et seuls), mangent à 20 h puis se couchent ; l'adulte ne travaille plus
     aux bêtes après 19 h ;
   - un habitant d'un hameau dont le but est enfermé reste où il est (ni saut, ni traversée).
   Lancer seul : node --test tests/engine/famille-visible.test.mjs (ou node tests/run-tests.mjs famille-visible).
   ========================================================================== */

import { readFileSync } from 'node:fs';
import { DATA } from '../../js/engine/index.js';
import { assert, assertEqual, test } from './aide.mjs';

const SCRIPTS = [
  'js/carte/kit.js', 'js/carte/chemins.js', 'js/carte/nature.js', 'js/carte/gestes.js', 'js/carte/lumiere.js', 'js/carte/eau.js',
  'js/carte/triporteur.js', 'js/carte/cheval.js', 'js/carte/toit.js', 'js/fermier.js', 'js/famille-ferme.js',
  'js/carte/ferme/config.js', 'js/carte/ferme/chantier.js', 'js/carte/ferme/habitants.js',
];
const fenetre = { devicePixelRatio: 1, navigator: {}, matchMedia: () => ({ matches: false }), localStorage: { getItem: () => null, setItem() {} } };
for (const f of SCRIPTS) new Function('window', readFileSync(new URL('../../' + f, import.meta.url), 'utf8'))(fenetre);
const { CarteKit: K, Fermier, FamilleFerme, FermeCarte } = fenetre;
const T = K.T;

/* ---------- une maquette de scène ---------- */

// Une image : chaque set… garde ce qu'on lui donne, le reste ne fait rien.
function image() {
  const etat = { visible: true, alpha: 1, x: 0, y: 0, depth: 0 };
  const p = new Proxy(etat, {
    get(t, k) {
      if (k in t) return t[k];
      if (k === 'setVisible') return (v) => { t.visible = !!v; return p; };
      if (k === 'setAlpha') return (a) => { t.alpha = a; return p; };
      if (k === 'setPosition') return (x, y) => { t.x = x; t.y = y; return p; };
      if (k === 'setDepth') return (d) => { t.depth = d; return p; };
      return () => p;
    },
  });
  return p;
}

// La ferme d'essai (COLS × ROWS cases) : une maison de deux pièces, la salle (porte d'entrée au
// sud ; la boîte, une table et trois chaises) et la chambre à droite, qu'on ne rejoint que par la
// porte de la cloison (quatre lits) ; plus loin, une case enfermée de murs, sans porte.
const COLS = 48, ROWS = 32, X0 = 10, Y0 = 6, L = 13, H = 9;
const at = (c, r) => r * COLS + c;
function ferme() {
  const blocs = new Map();
  for (let r = Y0; r < Y0 + H; r++) for (let c = X0; c < X0 + L; c++) if (r === Y0 || r === Y0 + H - 1 || c === X0 || c === X0 + L - 1 || c === X0 + 6) blocs.set(at(c, r), 'mur_pierre');
  const PORTE = at(X0 + 3, Y0 + H - 1), CHAMBRE = at(X0 + 6, Y0 + 6);
  blocs.set(PORTE, 'porte');
  blocs.set(CHAMBRE, 'porte');
  blocs.set(at(X0 + 1, Y0 + 1), 'boite_nourriture');
  for (let k = 0; k < 3; k++) blocs.set(at(X0 + 2 + k, Y0 + 4), 'meuble_table');
  for (const [c, r] of [[X0 + 1, Y0 + 4], [X0 + 3, Y0 + 3], [X0 + 3, Y0 + 5]]) blocs.set(at(c, r), 'meuble_chaise');
  const ENFERME = at(36, 22);
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (dx || dy) blocs.set(ENFERME + dy * COLS + dx, 'mur_pierre');
  const ferment = (s) => s !== 'porte';                     // (les lits ne ferment pas : ils ne sont pas dans les blocs)
  const fermees = [...blocs].filter(([, s]) => ferment(s)).map(([k]) => k);
  const lits = [[X0 + 7, Y0 + 2], [X0 + 9, Y0 + 2], [X0 + 11, Y0 + 2], [X0 + 11, Y0 + 5]];
  return { blocs, fermees, PORTE, CHAMBRE, ENFERME, lits };
}

function scene(F) {
  const s = {
    world: { w: COLS * T, h: ROWS * T }, grid: { cols: COLS },
    add: { sprite: image, image, graphics: image },
    textures: { exists: () => true },
    load: { spritesheet() {}, once() {}, start() {}, isLoading: () => false },
    // le foyer : la porte de la pièce où l'on dort (le moteur, js/ui/stage.js foyerPorte) : ici la chambre
    ctx: { lastModel: { foyer: F.CHAMBRE } },
  };
  // les méthodes de la scène de la ferme (chantier.js, habitants.js)
  for (const p of FermeCarte.parties) Object.assign(s, p);
  // ce que chantier.js tient : les blocs posés et le toit de la maison (son emprise, murs compris)
  s.blocks = new Map();
  for (const [k, sorte] of F.blocs) {
    const x = (k % COLS) * T + T / 2, y = (Math.floor(k / COLS) + 1) * T;
    s.blocks.set(k, { case: k, sorte, x, y, img: { depth: y }, ...(/^meuble_/.test(sorte) ? { cases: [k] } : {}) });
  }
  const emprise = new Set();
  for (let r = Y0; r < Y0 + H; r++) for (let c = X0; c < X0 + L; c++) emprise.add(at(c, r));
  s.toits = [{ key: 'toit_essai', maison: true, dedans: emprise }];
  s.fermier = Fermier.attach(s, { sheet: 'fermier', frames: [], world: s.world, objects: {}, reduced: () => false, blocks: () => F.fermees });
  return s;
}

// Une case fermée sous le point (x, y) (les pieds) ?
const fermee = (F, x, y) => F.fermees.includes(at(Math.floor(x / T), Math.floor((y - 1) / T)));
// Le segment de a à b passe-t-il par une case fermée (un point tous les 0,25 px) ?
function traverse(F, a, b, dans = fermee) {
  const n = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) * 4));
  for (let k = 1; k <= n; k++) if (dans(F, a.x + ((b.x - a.x) * k) / n, a.y + ((b.y - a.y) * k) / n)) return true;
  return false;
}
// La même, pour une position arrondie au pixel (famille.info) : fermée à ½ px près de tous côtés
// (au ras d'une porte, x = 223,6 s'arrondit à 224, dans la case du mur voisin).
const fermeeArrondi = (F, x, y) => [[-0.5, -0.5], [0.5, -0.5], [-0.5, 0.5], [0.5, 0.5]].every(([a, b]) => fermee(F, x + a, y + b));
const pieds = (c, r) => ({ x: c * T + T / 2, y: (r + 1) * T - 3 });

/* ---------- les chemins ---------- */

test('les chemins passent par les portes, et jamais au travers d\'une case fermée (même d\'un coin)', () => {
  const F = ferme(), s = scene(F), P = s.fermier;
  // du nord de la maison à la chambre : le tour, la porte d'entrée, la salle, la porte de la chambre
  const a = pieds(X0 + 9, Y0 - 2), b = pieds(X0 + 9, Y0 + 5);
  const p = P.path(a.x, a.y, b.x, b.y);
  assert(p && p.length > 2, 'un chemin');
  let prec = a;
  const vues = new Set();
  for (const q of p) {
    assert(!traverse(F, prec, q), `le pas de (${prec.x}, ${prec.y}) à (${q.x}, ${q.y}) ne traverse pas de mur`);
    const n = Math.ceil(Math.hypot(q.x - prec.x, q.y - prec.y));
    for (let k = 0; k <= n; k++) vues.add(at(Math.floor((prec.x + ((q.x - prec.x) * k) / n) / T), Math.floor((prec.y + ((q.y - prec.y) * k) / n - 1) / T)));
    prec = q;
  }
  assert(vues.has(F.PORTE) && vues.has(F.CHAMBRE), 'par la porte d\'entrée puis par celle de la chambre');
  // et entre toutes sortes de points libres, dedans et dehors
  const libres = [];
  for (let r = Y0 - 3; r < Y0 + H + 3; r += 2) for (let c = X0 - 3; c < X0 + L + 3; c += 2) if (P.standable(pieds(c, r).x, pieds(c, r).y)) libres.push(pieds(c, r));
  let n = 0;
  for (let i = 0; i < libres.length; i += 3) {
    for (let j = 1; j < libres.length; j += 7) {
      const q0 = libres[i], q1 = libres[j], ch = P.path(q0.x, q0.y, q1.x, q1.y);
      if (!ch) continue;
      n++;
      let pr = q0;
      for (const q of ch) { assert(!traverse(F, pr, q), `de (${q0.x}, ${q0.y}) à (${q1.x}, ${q1.y}) : pas de mur traversé`); pr = q; }
    }
  }
  assert(n > 100, `assez de trajets essayés (${n})`);
});

test('la ligne droite ne coupe pas le coin d\'un mur, ni ne le frôle de l\'épaule', () => {
  const F = ferme(), s = scene(F), P = s.fermier;
  // le coin en haut à gauche de la maison : la case (X0, Y0), de x = 160 à 176, de y = 97 à 112 (pieds)
  const x0 = X0 * T, y0 = Y0 * T + 1;
  // une diagonale qui coupe le coin sur moins d'un pixel (un point tous les 4 px ne le voyait pas)
  assert(!P.ligneLibre(x0 - 10, y0 + 10.8, x0 + 10, y0 - 9.2), 'en coupant le coin : refusée');
  // la même, à 7 px du coin : libre
  assert(P.ligneLibre(x0 - 10, y0, x0 + 10, y0 - 20), 'à 7 px du coin : libre');
  assert(!P.ligneLibre(x0 - 30, y0 - 2, x0 + 40, y0 - 2), 'le long du mur, à 2 px : refusée (l\'épaule)');
  assert(P.ligneLibre(x0 - 30, y0 - 6, x0 + 40, y0 - 6), 'le long du mur, à 6 px : libre');
});

test('un but enfermé n\'a pas de chemin, et il est sûrement hors d\'atteinte ; le personnage n\'y saute pas', () => {
  const F = ferme(), s = scene(F), P = s.fermier;
  const a = pieds(30, 26), b = pieds(F.ENFERME % COLS, Math.floor(F.ENFERME / COLS)), info = {};
  assertEqual(P.path(a.x, a.y, b.x, b.y, info), null);
  assertEqual(info.impossible, true, 'hors d\'atteinte');
  // un but loin mais qu'on rejoint : un chemin, et rien d'impossible
  const c = pieds(X0 + 9, Y0 + 5), i2 = {};
  assert(P.path(a.x, a.y, c.x, c.y, i2), 'la chambre se rejoint');
  assertEqual(i2.impossible, false);
  // une case fermée : impossible aussi
  const m = pieds(X0, Y0 + 3), i3 = {};
  assertEqual(P.path(a.x, a.y, m.x, m.y, i3), null);
  assertEqual(i3.impossible, true);
});

/* ---------- la porte et l'intérieur de la maison ---------- */

test('devant la porte du foyer : dehors, devant la porte d\'entrée, même quand le foyer est la chambre', () => {
  const F = ferme(), s = scene(F);
  const d = s.homeDoor();
  // (avant : sous la porte de la chambre, dans le mur de la salle)
  assert(!fermee(F, d.x, d.y), 'pas dans un mur');
  assertEqual([Math.floor(d.x / T), Math.floor((d.y - 1) / T)], [X0 + 3, Y0 + H], 'sous la porte d\'entrée');
  assert(!s.homeInside().dedans(d.x, d.y), 'dehors');
  // le foyer est la porte d'entrée : devant elle, comme avant
  s.ctx.lastModel = { foyer: F.PORTE };
  const e = s.homeDoor();
  assertEqual([e.x, e.y], [(X0 + 3) * T + T / 2, (Y0 + H) * T + 6]);
});

test('l\'intérieur de la maison : ses places sont libres, ses chaises tournées vers la table', () => {
  const F = ferme(), s = scene(F), M = s.homeInside();
  assert(M.places.length > 20, 'des places');
  for (const q of M.places) {
    assert(!fermee(F, q.x, q.y) && M.dedans(q.x, q.y), 'une place libre, dans la maison');
    // (ni contre une porte, ni sur un lit… ici : ni sur un bloc)
    assert(!F.blocs.has(at(Math.floor(q.x / T), Math.floor((q.y - 1) / T))), 'pas sur un bloc');
  }
  assertEqual(M.chaises.length, 3);
  const vues = M.chaises.map((c) => c.face).sort();
  assertEqual(vues, ['bas', 'cote', 'haut'], 'à gauche de la table : de profil ; au-dessus : de face ; au-dessous : de dos');
  for (const c of M.chaises) assert(!fermee(F, c.pied.x, c.pied.y) && M.dedans(c.pied.x, c.pied.y), 'on s\'y assoit depuis une case libre de la maison');
  // sans toit de maison : pas d'intérieur
  s.toits = [];
  assertEqual(s.homeInside(), null);
});

/* ---------- la journée ---------- */

test('à chaque heure, où chacun doit être (FamilleFerme.voulu, FAMILLE.HORAIRE)', () => {
  const H = DATA.FAMILLE.HORAIRE, v = (h, nuit, lit, enfant) => FamilleFerme.voulu(h, nuit, lit, enfant, H);
  assertEqual([H.COUCHER_ENFANTS, H.LEVER_ENFANTS, H.FIN_TRAVAIL_ADULTES, H.COUCHER_ADULTES], [20, 8, 19, 22], 'les heures du joueur (data/general.json)');
  // le compagnon : levé avec le personnage (la nuit finie), dehors jusqu'à 22 h
  assertEqual(v(6, false, true, false), 'dehors', '6 h : le compagnon se lève avec le personnage');
  assertEqual(v(18.75, false, true, false), 'dehors', '18 h 45 : plus de rentrée générale');
  assertEqual(v(19, false, true, false), 'dehors', '19 h : plus de repas à table');
  assertEqual(v(21.9, false, true, false), 'dehors');
  assertEqual(v(22, false, true, false), 'lit', '22 h : le compagnon va au lit (même avant la nuit)');
  assertEqual(v(23, true, true, false), 'lit');
  assertEqual(v(23, true, false, false), 'dedans', 'sans lit pour lui : dans la maison');
  // les enfants : au lit de 20 h à 8 h
  assertEqual(v(6, false, true, true), 'lit', '6 h : les enfants dorment encore');
  assertEqual(v(7.99, false, true, true), 'lit');
  assertEqual(v(8, false, true, true), 'dehors', '8 h : ils se lèvent');
  assertEqual(v(19.99, false, true, true), 'dehors', 'le soir, ils jouent dehors');
  assertEqual(v(20, false, true, true), 'lit', '20 h : au lit');
  assertEqual(v(20, false, false, true), 'dedans', 'sans lit : dans la maison');
  assertEqual(v(3, true, true, true), 'lit');
  assert(FamilleFerme.couche(12, true, false, H) && !FamilleFerme.couche(12, false, true, H), 'la nuit, tous couchés ; à midi, personne');
});

test('une journée de 6 h à 23 h et le matin d\'après : visibles, par la porte, jamais au travers d\'un mur ; les enfants jouent ; l\'adulte flâne après 19 h ; les enfants mangent à 20 h puis se couchent ; le compagnon à 22 h', () => {
  const F = ferme(), s = scene(F);
  const lits = F.lits.map(([c, r]) => ({ x: c * T + T / 2, y: (r - 1) * T + 27, depth: (r + 1) * T - T / 2, drap: { key: 'drap', x: c * T + T / 2, y: (r + 1) * T } }));
  // où se servir : devant la boîte à nourriture (comme js/farm-stage.js) ; le Poulailler, dehors
  const B = s.blocks.get(at(X0 + 1, Y0 + 1)), spot = { x: B.x, y: B.y + 8 }, poulailler = pieds(X0 + 3, Y0 + H + 4);
  s.fermier.lieu = (l) => (l === 'poulailler' ? poulailler : null);
  const travail = [];
  const fam = FamilleFerme.attach(s, {
    fermier: s.fermier, frames: [], reduced: () => false, file: () => '',
    maison: () => s.homeInside(), lit: (k) => lits[k + 1] || null, boite: () => spot,
    // (le second adulte a fini au Poulailler : l'heure du travail fait)
    aide: (lieu, done) => { travail.push(model.heure); done(null); },
  });
  s.family = fam;
  const model = { famille: [{ id: 'adulte-2', perso: 1 }, { id: 'enfant-1', perso: 1, enfant: true }, { id: 'enfant-2', perso: 2, enfant: true }], heure: 6, nuit: false, aide: null, horaire: DATA.FAMILLE.HORAIRE };
  const prec = new Map(), fautes = [], jeux = new Set(), bonds = new Set();
  // qui va se servir : arrivé à la boîte, puis reparti (l'heure où il en repart)
  const faims = new Map();
  const quart = (h, nuit) => {
    model.heure = h % 24; model.nuit = nuit;
    fam.sync(model);
    // un quart d'heure de jeu : 7,5 s (30 s par heure), par pas de 50 ms
    for (let k = 0; k < 150; k++) {
      fam.update(50);
      for (const q of fam.info()) {
        if (!q.visible) fautes.push(`${h} h : ${q.id} invisible`);
        const d = prec.get(q.id);
        if (!q.lit) {
          if (fermeeArrondi(F, q.x, q.y)) fautes.push(`${h} h : ${q.id} dans un mur (${q.x}, ${q.y})`);
          else if (d && !d.lit && traverse(F, d, q, fermeeArrondi)) fautes.push(`${h} h : ${q.id} traverse un mur de (${d.x}, ${d.y}) à (${q.x}, ${q.y})`);
        }
        if (q.jeu) { jeux.add(q.jeu); if (q.haut > 0) bonds.add(q.id); }
        const f = faims.get(q.id);
        if (f && Math.hypot(q.x - spot.x, q.y - spot.y) < 8) f.arrive = true;
        if (f && f.arrive && q.tache !== 'boite' && f.fini === undefined) f.fini = h;
        prec.set(q.id, q);
      }
    }
    return fam.info();
  };
  const etat = {};
  for (let h = 6; h <= 23; h += 0.25) {
    // l'après-midi, le second adulte a à faire au Poulailler
    if (h === 16) model.aide = { id: 'adulte-2', lieux: ['poulailler'] };
    // à 19 h, l'adulte a faim ; à 20 h, les enfants prennent leur dernier repas (le moteur les a
    // fait manger : js/ui/loop.js les envoie se servir)
    if (h === 19) { assert(fam.allerManger('adulte-2'), 'il va se servir'); faims.set('adulte-2', {}); }
    if (h === 20) for (const id of ['enfant-1', 'enfant-2']) { assert(fam.allerManger(id), `${id} va manger`); faims.set(id, {}); }
    etat[h] = quart(h, h >= 22);
  }
  // la nuit, puis le matin d'après (la nuit finie à 6 h : le compagnon se lève avec le personnage)
  model.aide = null;
  for (let h = 23.25; h < 30; h += 0.25) quart(h, true);
  for (let h = 30; h <= 33; h += 0.25) etat[h] = quart(h, false);
  assertEqual(fautes.slice(0, 5), [], 'toujours visibles, jamais dans un mur (même en jouant)');
  const ou = (h) => etat[h].map((q) => q.ou).join(' ');
  assertEqual(ou(12), 'dehors dehors dehors', 'midi : dehors');
  assertEqual(ou(18.75), 'dehors dehors dehors', '18 h 45 : dehors, plus de rentrée');
  // les jeux des enfants : à deux (la ronde, la poursuite) et seuls (sauter, tourner), en bondissant
  assert(jeux.has('sauter') || jeux.has('tourner'), `seuls, ils sautent ou tournent (${[...jeux]})`);
  assert(jeux.has('ronde') || jeux.has('fuit'), `à deux, ils font la ronde ou se poursuivent (${[...jeux]})`);
  assertEqual([...bonds].sort(), ['enfant-1', 'enfant-2'], 'de petits bonds');
  // le travail aux bêtes : l'après-midi, oui ; après 19 h, non
  assert(travail.some((h) => h >= 16 && h < 19), `il travaille l'après-midi (${travail})`);
  assertEqual(travail.filter((h) => h >= 19), [], 'après 19 h, il ne travaille plus');
  assert(etat[19.5][0].ou === 'dehors' && !etat[19.5][0].tache, '19 h 30 : il flâne dehors');
  const fa = faims.get('adulte-2');
  assert(fa.arrive && fa.fini >= 19 && fa.fini < 20, `à 19 h, il est allé à la boîte, s'y est servi et en est reparti (${JSON.stringify(fa)})`);
  // 20 h : les enfants vont à la boîte, s'y servent, puis vont au lit
  for (const id of ['enfant-1', 'enfant-2']) {
    const f = faims.get(id);
    assert(f.arrive && f.fini >= 20 && f.fini < 20.75, `${id} : à la boîte à 20 h, puis reparti (${JSON.stringify(f)})`);
  }
  assertEqual(ou(20.75), 'dehors lit lit', '20 h 45 : les enfants ont mangé et se sont couchés');
  assertEqual(ou(21.75), 'dehors lit lit');
  assertEqual(ou(22.75), 'lit lit lit', '22 h : le compagnon aussi');
  assertEqual(ou(30.75), 'dehors lit lit', 'le matin : le compagnon sort avec le personnage, les enfants dorment');
  assertEqual(ou(33), 'dehors dehors dehors', '8 h : les enfants sortent');
  // sans endroit où se servir, il n'y va pas
  const sans = FamilleFerme.attach(s, { fermier: s.fermier, frames: [], reduced: () => false, file: () => '', maison: () => s.homeInside(), lit: () => null, boite: () => null });
  sans.sync(model);
  assertEqual(sans.allerManger('adulte-2'), false, 'rien où se servir : il n\'y va pas');
});

/* ---------- les habitants des hameaux ---------- */

test('un habitant dont le but est enfermé reste où il est (ni saut, ni traversée) ; trop loin pour la recherche, il saute', () => {
  const F = ferme(), s = scene(F), vue = { x: 0, y: 0, right: COLS * T, bottom: ROWS * T };
  const a = pieds(30, 26), b = pieds(F.ENFERME % COLS, Math.floor(F.ENFERME / COLS));
  const m = { x: a.x, y: a.y, chemin: [], demande: { x: b.x, y: b.y, puis: () => { m.arrive = true; }, vite: 1 }, attente: 0 };
  s.habTrajet(m, vue);
  assert(!m.saut && !m.chemin.length && !m.arrive, 'il reste où il est');
  assert(m.attente > 0, 'et attend avant de faire autre chose');
  // (une recherche trop courte : on ne sait pas, il s'efface et reparaît là-bas, comme avant)
  const loin = { x: a.x, y: a.y, chemin: [], demande: { x: b.x, y: b.y, puis: null, vite: 1 }, attente: 0 };
  s.fermier = Object.assign({}, s.fermier, { path: (x0, y0, x1, y1, info) => { if (info) info.impossible = false; return null; } });
  s.habTrajet(loin, vue);
  assert(loin.saut, 'il saute');
  // (déjà sur la case du but : il y va tout droit, sans s'effacer)
  const ici = { x: a.x, y: a.y, chemin: [], demande: { x: a.x + 3, y: a.y, puis: null, vite: 1 }, attente: 0 };
  s.fermier = Object.assign({}, s.fermier, { path: () => [] });
  s.habTrajet(ici, vue);
  assert(!ici.saut && ici.chemin.length === 1, 'tout droit');
});
