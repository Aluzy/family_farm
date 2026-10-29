/* ==========================================================================
   Tests : la cruche (sa jauge, la remplir au puits) et choisir son lit (fiche 17).
   - le moteur : la jauge de la cruche baisse à chaque arrosage et remonte au puits ; la cruche ne
     se remplit que sur la case d'un puits posé (remplirCruche(state, casePuits)) ;
   - le lit choisi (choisirLit) devient le premier couchage, celui du personnage principal ; le
     membre qui l'avait prend l'ancien lit du personnage ; le choix se sauvegarde (v60 → v61) ;
   - la carte (js/fermier.js, js/carte/ferme/puits.js, chantier.js litAt), chargée dans une fenêtre
     d'essai sans Phaser (comme tests/engine/famille-visible.test.mjs) : le personnage marche
     jusqu'au puits par un vrai chemin (par la porte, sans traverser de mur), puise, et alors
     seulement le jeu remplit la cruche ; un puits enfermé ou trop loin : il ne bouge pas.
   Lancer seul : node --test tests/engine/cruche-lit.test.mjs (ou node tests/run-tests.mjs cruche-lit).
   ========================================================================== */

import { readFileSync } from 'node:fs';
import { assert, assertEqual, garden, partie, setInv, test, tireless } from './aide.mjs';
import {
  addItem, blocAt, seedItem, buildAtelier, caseLibreFoyer, choisirLit, couchages, createInitialState, crucheARemplir, DATA, dormeurDuLit, eauCruche,
  farmTerrain, jaugeCruche, litDuPrincipal, mainCharacter, migrate, nuitSansCouchage, plant, poserBloc, puitsCases,
  remplirCruche, reparerPartie, reprendreBloc, STATE_VERSION, testFarmMap, water,
} from '../../js/engine/index.js';

const copie = (o) => JSON.parse(JSON.stringify(o));

// Une ferme générée, l'Atelier bâti, des blocs en main (comme tests/engine/ferme-generee.test.mjs).
function chantier(graine) {
  const s = garden();
  tireless(s);
  testFarmMap(s, graine);
  setInv(s, { bois: 3, pierre: 3 });
  assert(buildAtelier(s).ok);
  setInv(s, { mur_pierre: 60, porte: 6, paillasse: 6, puits_pierre: 2, meuble_lit_adulte: 2 });
  return s;
}

// Une case d'herbe libre de `w` × `h` cases (coin haut-gauche), loin des bords et des parcelles.
function terrainLibre(s, w, h) {
  const T = farmTerrain(s), W = T.LARGEUR;
  for (let r = 4; r < T.HAUTEUR - h - 4; r++) {
    for (let c = 4; c < W - w - 4; c++) {
      let ok = true;
      for (let dr = 0; dr < h && ok; dr++) for (let dc = 0; dc < w && ok; dc++) ok = T.LIGNES[r + dr][c + dc] === '#' && !s.potager.parcelles.some((p) => p.case === (r + dr) * W + c + dc) && !(T.HERBES && T.HERBES[(r + dr) * W + c + dc]);
      if (ok) return { c, r, W };
    }
  }
  return null;
}

/* ---------- la cruche ---------- */

test('la jauge de la cruche baisse à chaque arrosage et remonte au puits ; elle ne se remplit qu\'au puits', () => {
  const s = chantier('cruche');
  s.eauMl = 0;                                     // (pas de citerne : on arrose à la cruche)
  assertEqual(jaugeCruche(s), null, 'sans cruche : pas de jauge');
  addItem(s, 'cruche', 1);
  addItem(s, seedItem('carotte'), 3);
  assertEqual(jaugeCruche(s), { ml: 0, capacite: DATA.CRUCHE.LITRES * 1000, part: 0, litres: 0, pleine: false, vide: true });
  assertEqual(crucheARemplir(s).ok, false, 'pas de puits posé');
  const z = terrainLibre(s, 4, 4), puits = (z.r + 1) * z.W + z.c + 1;
  assert(poserBloc(s, 'puits', puits).ok, 'le puits');
  assertEqual(puitsCases(s), [puits]);
  assert(crucheARemplir(s).ok, 'à remplir');
  // ailleurs qu'au puits : rien
  for (const ou of [undefined, null, puits + 1, 'x', puits - z.W]) {
    const r = remplirCruche(s, ou);
    assertEqual([r.ok, eauCruche(s)], [false, 0], `pas au puits (${ou})`);
  }
  assert(/au puits/.test(remplirCruche(s).error), 'le message le dit');
  // au puits : pleine
  assertEqual(remplirCruche(s, puits), { ok: true, litres: DATA.CRUCHE.LITRES });
  assertEqual([jaugeCruche(s).part, jaugeCruche(s).pleine, jaugeCruche(s).litres], [1, true, DATA.CRUCHE.LITRES]);
  assertEqual(crucheARemplir(s).error, 'La cruche est déjà pleine.');
  assertEqual(remplirCruche(s, puits).ok, false, 'déjà pleine');
  // chaque arrosage la fait baisser
  const parcelles = s.potager.parcelles.filter((p) => !p.culture).slice(0, 3);
  assert(parcelles.length === 3, 'trois parcelles');
  let avant = jaugeCruche(s).ml;
  for (const p of parcelles) {
    assert(plant(s, p.id, 'carotte').ok, 'planter');
    const r = water(s, p.id);
    assert(r.ok, r.error);
    const j = jaugeCruche(s);
    assertEqual(j.ml, avant - r.litres * 1000, 'l\'eau vient de la cruche');
    assert(j.part < 1 && j.part >= 0, 'la jauge baisse');
    avant = j.ml;
  }
  // de nouveau au puits : elle remonte
  assert(remplirCruche(s, puits).ok);
  assertEqual(jaugeCruche(s).part, 1);
});

/* ---------- le lit ---------- */

test('choisir son lit : il devient le premier couchage ; le membre qui l\'avait prend l\'ancien', () => {
  const s = partie(3);
  const lits = couchages(s), ordre = [mainCharacter(s)].concat(s.famille.membres.filter((m) => m !== mainCharacter(s)));
  assert(lits.length >= 3 && ordre.length >= 3, `assez de lits (${lits.length}) et de membres (${ordre.length})`);
  assertEqual(s.litPrincipal, null, 'pas encore de choix');
  assertEqual(litDuPrincipal(s), lits[0]);
  assertEqual(dormeurDuLit(s, lits[2]), ordre[2]);
  // ce qui n'est pas un couchage
  assertEqual(choisirLit(s, 'abc').ok, false);
  assertEqual(choisirLit(s, 12345678).ok, false, 'une case sans lit');
  assertEqual(s.litPrincipal, null);
  // le troisième lit : à lui ; le membre qui y dormait prend le premier ; les autres ne bougent pas
  const r = choisirLit(s, lits[2]);
  assertEqual([r.ok, r.deja, r.cede], [true, false, ordre[2]]);
  assertEqual(s.litPrincipal, lits[2]);
  const apres = couchages(s);
  assertEqual(apres[0], lits[2], 'son lit');
  assertEqual(apres[2], lits[0], 'l\'ancien lit du personnage, au membre qui avait celui-ci');
  for (let k = 0; k < lits.length; k++) if (k !== 0 && k !== 2) assertEqual(apres[k], lits[k], 'les autres gardent le leur');
  assertEqual([dormeurDuLit(s, lits[2]), dormeurDuLit(s, lits[0])], [ordre[0], ordre[2]]);
  assertEqual(new Set(apres).size, lits.length, 'autant de lits qu\'avant');
  assertEqual(nuitSansCouchage(copie(s)), [], 'chacun a toujours un couchage');
  // le même : rien ne change ; texte (venu de la carte) : compris
  assertEqual(choisirLit(s, String(lits[2])), { ok: true, deja: true, cede: null });
  assertEqual(couchages(s), apres);
  // un lit de plus, libre (personne n'y dormait) : personne ne cède, chacun garde le sien
  const t = partie(3);
  addItem(t, 'paillasse', 1);
  const place = caseLibreFoyer(t);
  assert(Number.isInteger(place) && poserBloc(t, 'paillasse', place).ok, 'une paillasse de plus');
  const tous = couchages(t), libre = tous.find((c) => dormeurDuLit(t, c) === null);
  assert(libre !== undefined, 'un lit libre');
  assertEqual(choisirLit(t, libre).cede, null);
  assertEqual(couchages(t).slice(1, ordre.length), tous.slice(1, ordre.length), 'la famille garde ses lits');
});

test('le lit choisi est repris : le personnage retrouve le premier couchage', () => {
  const s = partie(5);
  const lits = couchages(s);
  assert(choisirLit(s, lits[1]).ok);
  assertEqual(couchages(s)[0], lits[1]);
  assert(reprendreBloc(s, lits[1]).ok, 'la paillasse reprise');
  assertEqual(blocAt(s, lits[1]), null);
  assertEqual(couchages(s)[0], lits[0], 'de nouveau le premier');
  assertEqual(choisirLit(s, lits[1]).ok, false, 'plus un couchage');
});

test('migration v60 → v61 : pas de lit choisi ; le choix se sauvegarde et se relit', () => {
  assertEqual(STATE_VERSION >= 61, true);
  const neuve = createInitialState(4);
  assertEqual(neuve.litPrincipal, null);
  const { litPrincipal, ...v60 } = copie(neuve);
  const m = migrate({ v: 60, t: 0, s: { ...v60, version: 60 } }, 61);
  assertEqual([m.version, m.litPrincipal], [61, null]);
  // une partie qui a choisi son lit : relue telle quelle, le même lit en tête
  const s = partie(3);
  const lits = couchages(s);
  assert(choisirLit(s, lits[1]).ok);
  const relue = migrate({ v: s.version, t: 0, s: copie(s) });
  assertEqual(relue.litPrincipal, lits[1]);
  assertEqual(couchages(relue), couchages(s));
  // abîmée (un lit qui n'existe pas, du texte) : ignorée, le premier couchage revient
  const b = copie(s);
  b.litPrincipal = 'n\'importe quoi';
  assertEqual(couchages(reparerPartie(b))[0], lits[0]);
});

/* ---------- la carte : aller au puits, toucher un lit ---------- */

const SCRIPTS = [
  'js/carte/kit.js', 'js/carte/chemins.js', 'js/carte/nature.js', 'js/carte/gestes.js', 'js/carte/lumiere.js', 'js/carte/eau.js', 'js/carte/ressort.js',
  'js/carte/triporteur.js', 'js/carte/cheval.js', 'js/carte/toit.js', 'js/fermier.js',
  'js/carte/ferme/config.js', 'js/carte/ferme/chantier.js', 'js/carte/ferme/puits.js',
];
const fenetre = { devicePixelRatio: 1, navigator: {}, matchMedia: () => ({ matches: false }), localStorage: { getItem: () => null, setItem() {} } };
for (const f of SCRIPTS) new Function('window', readFileSync(new URL('../../' + f, import.meta.url), 'utf8'))(fenetre);
const { CarteKit: K, Fermier, FermeCarte } = fenetre;
const T = K.T;

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

// La ferme d'essai : une maison (porte au sud, un lit et une paillasse), un puits dehors ; plus
// loin, un puits enfermé de murs, sans porte ; tout au bout, un puits très loin.
const COLS = 160, ROWS = 40, X0 = 10, Y0 = 6, L = 9, H = 7;
const at = (c, r) => r * COLS + c;
function ferme({ ouvert = true, enfermeSeul = false, loinSeul = false } = {}) {
  const blocs = new Map();
  for (let r = Y0; r < Y0 + H; r++) for (let c = X0; c < X0 + L; c++) if (r === Y0 || r === Y0 + H - 1 || c === X0 || c === X0 + L - 1) blocs.set(at(c, r), 'mur_pierre');
  const PORTE = at(X0 + 4, Y0 + H - 1);
  blocs.set(PORTE, ouvert ? 'porte' : 'mur_pierre');
  const LIT = at(X0 + 2, Y0 + 3), PAILLASSE = at(X0 + 6, Y0 + 4);
  const PUITS = at(X0 + 4, Y0 + H + 6), ENFERME = at(40, 26), LOIN = at(150, 30);
  if (!enfermeSeul && !loinSeul) blocs.set(PUITS, 'puits');
  if (enfermeSeul) {
    blocs.set(ENFERME, 'puits');
    for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) if (Math.max(Math.abs(dx), Math.abs(dy)) === 2) blocs.set(ENFERME + dy * COLS + dx, 'mur_pierre');
  }
  if (loinSeul) blocs.set(LOIN, 'puits');
  return { blocs, PORTE, LIT, PAILLASSE, PUITS, ENFERME, LOIN };
}

function scene(F) {
  const puise = [];
  const s = {
    world: { w: COLS * T, h: ROWS * T }, grid: { cols: COLS },
    add: { sprite: image, image, graphics: image },
    textures: { exists: () => true },
    load: { spritesheet() {}, once() {}, start() {}, isLoading: () => false },
    ctx: { lastModel: { foyer: F.PORTE }, bridge: { puiser: (c) => puise.push(c) } },
    puise,
  };
  for (const p of FermeCarte.parties) Object.assign(s, p);
  s.blocks = new Map();
  for (const [k, sorte] of F.blocs) {
    const x = (k % COLS) * T + T / 2, y = (Math.floor(k / COLS) + 1) * T;
    s.blocks.set(k, { case: k, sorte, x, y, img: { depth: y } });
  }
  // le lit (deux cases de haut, on y marche) et la paillasse
  s.blocks.set(F.LIT, { case: F.LIT, sorte: 'meuble_lit_adulte', lit: true, cases: [F.LIT, F.LIT - COLS], x: 0, y: 0, img: { depth: 0 } });
  s.blocks.set(F.PAILLASSE, { case: F.PAILLASSE, sorte: 'paillasse', x: 0, y: 0, img: { depth: 0 } });
  const emprise = new Set();
  for (let r = Y0; r < Y0 + H; r++) for (let c = X0; c < X0 + L; c++) emprise.add(at(c, r));
  s.toits = [{ key: 'toit_essai', maison: true, dedans: emprise, img: image() }];
  const fermees = [...F.blocs].filter(([, x]) => x !== 'porte').map(([k]) => k);
  s.fermier = Fermier.attach(s, { sheet: 'fermier', frames: [], world: s.world, objects: {}, reduced: () => false, blocks: () => fermees, foyer: () => s.homeDoor() });
  s.fermees = new Set(fermees);
  return s;
}
const pieds = (c, r) => ({ x: c * T + T / 2, y: (r + 1) * T - 3 });

// Fait vivre le personnage `sec` secondes (images de 50 ms) ; ses positions, image par image.
function vivre(s, sec) {
  const pas = [];
  for (let t = 0; t < sec * 20; t++) {
    s.fermier.update(50);
    const i = s.fermier.info();
    pas.push({ x: i.x, y: i.y });
  }
  return pas;
}

test('toucher le puits : le personnage y marche par la porte, sans traverser de mur, puis puise', () => {
  const F = ferme(), s = scene(F);
  // il est dans la maison, près du lit
  const dedans = pieds(X0 + 4, Y0 + 2);
  s.fermier.arrive(dedans.x, dedans.y);
  vivre(s, 0.2);
  const r = s.allerAuPuits();
  assertEqual(r, { ok: true, puits: F.PUITS });
  assertEqual(s.puise, [], 'pas encore rempli : il y va d\'abord');
  const pas = vivre(s, 30);
  assertEqual(s.puise, [F.PUITS], 'arrivé, il puise : le jeu remplit la cruche');
  // tout le trajet : jamais dans un mur, et par la porte
  let porte = false;
  for (const p of pas) {
    const k = at(Math.floor(p.x / T), Math.floor((p.y - 1) / T));
    assert(!s.fermees.has(k), `pas dans un mur (${p.x}, ${p.y})`);
    if (k === F.PORTE) porte = true;
  }
  assert(porte, 'par la porte');
  // arrivé à côté du puits : sur une des quatre cases qui le touchent
  const fin = pas[pas.length - 1], k = at(Math.floor(fin.x / T), Math.floor((fin.y - 1) / T));
  assert([F.PUITS - COLS, F.PUITS + COLS, F.PUITS - 1, F.PUITS + 1].includes(k), `à côté du puits (${k})`);
});

test('un puits enfermé, une maison sans porte, un puits trop loin : il ne bouge pas, on sait pourquoi', () => {
  // le puits enfermé de murs
  let F = ferme({ enfermeSeul: true }), s = scene(F);
  let p = pieds(30, 30);
  s.fermier.arrive(p.x, p.y);
  vivre(s, 0.2);
  assertEqual(s.allerAuPuits(), { ok: false, raison: 'ferme' });
  // le personnage dans une maison sans porte
  F = ferme({ ouvert: false });
  s = scene(F);
  p = pieds(X0 + 4, Y0 + 2);
  s.fermier.arrive(p.x, p.y);
  vivre(s, 0.2);
  assertEqual(s.allerAuPuits(), { ok: false, raison: 'ferme' });
  // trop loin
  F = ferme({ loinSeul: true });
  s = scene(F);
  p = pieds(4, 30);
  s.fermier.arrive(p.x, p.y);
  vivre(s, 0.2);
  const avant = s.fermier.info();
  assertEqual(s.allerAuPuits(), { ok: false, raison: 'loin' });
  vivre(s, 2);
  assertEqual([s.fermier.info().x, s.fermier.info().y, s.puise.length], [avant.x, avant.y, 0], 'resté là, rien de rempli');
  // pas de puits du tout
  F = ferme();
  F.blocs.delete(F.PUITS);
  s = scene(F);
  assertEqual(s.allerAuPuits().raison, 'sans');
});

test('toucher un lit : le couchage sous le doigt, seulement quand le toit est levé', () => {
  const F = ferme(), s = scene(F);
  const c = (k) => ({ x: (k % COLS) * T + T / 2, y: Math.floor(k / COLS) * T + T / 2 });
  // le toit posé (le personnage dehors) : on ne voit pas les lits
  s.toits[0].img.setAlpha(1);
  assertEqual(s.litAt(c(F.LIT).x, c(F.LIT).y), null);
  // le toit levé
  s.toits[0].img.setAlpha(0);
  assertEqual(s.litAt(c(F.LIT).x, c(F.LIT).y), F.LIT, 'le pied du lit');
  assertEqual(s.litAt(c(F.LIT - COLS).x, c(F.LIT - COLS).y), F.LIT, 'sa tête : le même lit');
  assertEqual(s.litAt(c(F.PAILLASSE).x, c(F.PAILLASSE).y), F.PAILLASSE, 'la paillasse');
  assertEqual(s.litAt(c(F.PAILLASSE - COLS).x, c(F.PAILLASSE - COLS).y), null, 'au-dessus d\'une paillasse : rien');
  assertEqual(s.litAt(c(at(X0 + 4, Y0 + 2)).x, c(at(X0 + 4, Y0 + 2)).y), null, 'le sol de la maison');
});

test('les blocs qui bloquent (DATA, bloque) ferment leur case sur la carte : ruche, bac à fleurs…', () => {
  const B = FermeCarte.C.BLOCS_CARTE;
  // (un meuble, ou un bloc dessiné comme lui, porte son « bloque » dans le modèle : stage.js, meubleDe)
  const manquent = Object.entries(DATA.ATELIER.BLOCS).filter(([id, b]) => b.bloque && !b.meuble && !b.dessin && !B.bloquent.includes(id)).map(([id]) => id);
  assertEqual(manquent, []);
  assert(B.bloquent.includes('ruche') && B.bloquent.includes('bac_fleurs'));
});
