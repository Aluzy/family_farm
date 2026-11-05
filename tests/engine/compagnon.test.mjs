/* ==========================================================================
   Tests : le compagnon aide à la ferme (fiche 19, js/engine/compagnon.js).
   - le moteur : il arrose quelques légumes qui ont soif (PAR_FOIS par sortie, ECART_H heures entre
     deux sorties, PAR_JOUR par jour), avec l'eau du réservoir, sinon sa cruche qu'il remplit au
     puits ; il prépare un repas à la cuisinière quand la famille a faim (le plat dans la boîte ou
     au réfrigérateur) ; il ramasse du bois (puis des pierres) autour de la ferme ; chaque action
     lui donne faim et ne coûte rien au personnage ; rien la nuit, hors des heures, le ventre vide,
     pendant le didacticiel, seul adulte, ni l'option ôtée ; l'option se sauvegarde (sans changer
     le format : une partie qui n'a pas le champ le reçoit) ; une absence le fait travailler aussi ;
   - la carte (js/famille-ferme.js, js/carte/ferme/compagnon.js), chargée sans Phaser comme
     tests/engine/famille-visible.test.mjs : il va à chaque tâche par un chemin, sans traverser de
     mur (la cuisinière est dans la maison), fait son geste, et alors seulement le jeu fait le travail.
   Lancer seul : node --test tests/engine/compagnon.test.mjs (ou node tests/run-tests.mjs compagnon).
   ========================================================================== */

import { readFileSync } from 'node:fs';
import { affamer, assert, assertEqual, atelier, boite, construireFrigo, garden, growZone, partie, reach, setInv, test } from './aide.mjs';
import {
  addItem, aidant, aRamasserCompagnon, arroseesCompagnon, awakeMsAtHour, boiteCount, compagnonEmpeche, countItem, createInitialState, DATA,
  ecouterJournal, eauCompagnon, finAide, faireCompagnon, faitsCompagnon, fridgeCount, jaugeMembre, journeeCompagnon, laisserAider,
  migrate, plant, plantesASoif, ramassables, recipeOutput, removeMember, reparerPartie, seedItem, simulateOffline,
  startNight, tachesCompagnon, demanderCompagnon, demandeCompagnon, recolteesCompagnon, estTacheCompagnon, maxStage, planterArbre, makePlot,
} from '../../js/engine/index.js';

const C = DATA.COMPAGNON;
const heure = (s, h) => { s.awakeMs = awakeMsAtHour(h); return s; };
const sortes = (s, pre) => tachesCompagnon(s).filter((t) => t.startsWith(pre));
const copie = (o) => JSON.parse(JSON.stringify(o));

// Une partie à 9 h, le réservoir plein, `n` carottes semées dans la Zone de culture, rien à ramasser.
function potager(n = 5) {
  const s = heure(growZone(garden(), 10), 9);
  s.cueillette = { jour: s.day, pris: ramassables(s).map((p) => p.id) };
  addItem(s, seedItem('carotte'), n);
  const libres = s.potager.parcelles.filter((p) => !p.culture).slice(0, n);
  assertEqual(libres.length, n, `${n} parcelles libres`);
  for (const p of libres) assert(plant(s, p.id, 'carotte').ok, 'semer');
  return s;
}

/* ---------- arroser ---------- */

test('arroser : quelques légumes par sortie, un écart entre deux sorties, une limite par jour ; sa faim, pas l\'énergie du personnage', () => {
  const s = potager(8);
  const m = aidant(s), energie = s.energie, eau = s.eauMl, faim = jaugeMembre(m);
  assertEqual(sortes(s, 'arroser:').length, 1, 'une plante à la fois');
  const r = journeeCompagnon(s);
  assertEqual(r.map((x) => x.action), Array(C.ARROSER.PAR_FOIS).fill('arroser'), 'une sortie : PAR_FOIS légumes');
  assertEqual(s.potager.parcelles.filter((p) => p.arrose).length, C.ARROSER.PAR_FOIS);
  assertEqual(faitsCompagnon(s).arroser, C.ARROSER.PAR_FOIS);
  // les cases qu'il a arrosées : la carte ne les prend pas pour des gestes du joueur (stage.js, parAuto)
  assertEqual(arroseesCompagnon(s).sort(), s.potager.parcelles.filter((p) => p.arrose).map((p) => p.case).sort());
  assert(s.eauMl < eau, 'l\'eau du réservoir');
  assertEqual(s.energie, energie, 'l\'énergie du personnage ne bouge pas');
  assertEqual(jaugeMembre(m), faim - C.ARROSER.PAR_FOIS * C.ARROSER.FAIM, 'chaque plante lui donne faim');
  // l'écart : rien avant ECART_H heures, puis une nouvelle sortie
  assertEqual(sortes(s, 'arroser:'), [], 'il vient d\'arroser');
  heure(s, 9 + C.ARROSER.ECART_H - 0.5);
  assertEqual(sortes(s, 'arroser:'), [], 'pas encore');
  heure(s, 9 + C.ARROSER.ECART_H);
  assertEqual(journeeCompagnon(s).length, Math.min(C.ARROSER.PAR_FOIS, C.ARROSER.PAR_JOUR - C.ARROSER.PAR_FOIS));
  assertEqual(faitsCompagnon(s).arroser, C.ARROSER.PAR_JOUR, 'la limite du jour');
  heure(s, 17);
  assertEqual(sortes(s, 'arroser:'), [], 'plus aujourd\'hui');
  assertEqual(s.potager.parcelles.filter((p) => p.culture && !p.arrose).length, 8 - C.ARROSER.PAR_JOUR, 'il en laisse au joueur');
  // le lendemain, ça recommence
  s.day += 1;
  heure(s, 9);
  assertEqual([faitsCompagnon(s).arroser, arroseesCompagnon(s)], [0, []]);
  assertEqual(sortes(s, 'arroser:').length, 1);
  // une plante déjà arrosée, mûre ou sans culture n'a pas soif
  const p = plantesASoif(s)[0];
  p.arrose = true;
  assertEqual(faireCompagnon(s, `arroser:${p.case}`).ok, false);
});

test('arroser sans réservoir : sa cruche, qu\'il va remplir au puits ; sans cruche ni puits, rien', () => {
  const s = potager(2);
  s.eauMl = 0;
  assertEqual(sortes(s, 'arroser:').concat(sortes(s, 'puits:')), [], 'ni réservoir, ni cruche');
  addItem(s, 'cruche', 1);
  assertEqual(sortes(s, 'puits:'), [], 'une cruche, mais pas de puits');
  const puits = s.potager.parcelles.find((p) => !p.culture).case;
  s.potager.parcelles = s.potager.parcelles.filter((p) => p.case !== puits);
  s.blocs[puits] = 'puits';
  assertEqual(sortes(s, 'puits:'), [`puits:${puits}`], 'il va d\'abord au puits');
  assertEqual(faireCompagnon(s, `puits:${puits + 1}`).ok, false, 'pas de puits là');
  const ml = s.cruche ? s.cruche.ml : 0;
  assert(faireCompagnon(s, `puits:${puits}`).ok, 'il puise');
  assertEqual(eauCompagnon(s), DATA.CRUCHE.LITRES * 1000, 'sa cruche est pleine');
  assertEqual(s.cruche ? s.cruche.ml : 0, ml, 'la cruche du personnage ne change pas');
  const [t] = sortes(s, 'arroser:');
  assert(t, 'puis il arrose');
  const r = faireCompagnon(s, t);
  assertEqual([r.ok, r.items], [true, { arrose: 1 }]);
  assert(eauCompagnon(s) < DATA.CRUCHE.LITRES * 1000, 'avec l\'eau de sa cruche');
});

/* ---------- cuisiner ---------- */

test('cuisiner : quand la famille a faim, un repas à la cuisinière, le plat dans la boîte (ou au frigo) ; une fois par jour', () => {
  const s = heure(atelier({ stations: ['cuisine'] }), 10);
  s.cueillette = { jour: s.day, pris: ramassables(s).map((p) => p.id) };
  s.eauMl = 10000;
  boite(s, {});
  setInv(s, { carotte: 2, oignon: 2, patate: 2 });
  assertEqual(sortes(s, 'cuisiner'), [], 'la famille n\'a pas faim');
  affamer(s, 50);
  const plat = recipeOutput(C.CUISINER.RECETTES[0]);
  assertEqual(sortes(s, 'cuisiner'), ['cuisiner'], 'elle a faim, il y a de quoi');
  const energie = s.energie;
  const r = faireCompagnon(s, 'cuisiner');
  assertEqual([r.ok, r.recette, r.ou, r.items], [true, C.CUISINER.RECETTES[0], 'boite', { [plat]: 1 }]);
  assertEqual([boiteCount(s, plat), countItem(s, 'carotte'), countItem(s, 'oignon'), countItem(s, 'patate')], [1, 1, 1, 1], 'les ingrédients pris, le plat dans la boîte');
  assertEqual(s.energie, energie);
  assertEqual(sortes(s, 'cuisiner'), [], 'une fois par jour');
  assertEqual(faireCompagnon(s, 'cuisiner').ok, false);
  // rien à cuisiner : rien
  s.day += 1;
  setInv(s, {});
  assertEqual(sortes(s, 'cuisiner'), [], 'pas d\'ingrédients');
  // le réfrigérateur construit : le plat y va
  const f = heure(atelier({ stations: ['cuisine'] }), 10);
  f.pieces = 10000;
  assert(construireFrigo(reach(f, 'frigo')).ok, 'le Réfrigérateur');
  f.eauMl = 10000;
  setInv(f, { oeuf: 3, huile: 1 });
  affamer(f, 50);
  const o = faireCompagnon(f, 'cuisiner');
  assertEqual([o.ok, o.recette, o.ou], [true, 'omelette', 'frigo']);
  assertEqual(fridgeCount(f, recipeOutput('omelette')), 1);
});

/* ---------- ramasser ---------- */

test('ramasser : du bois d\'abord, autour de la ferme, quelques fois par jour', () => {
  const s = heure(partie(3), 9);
  s.day = 2;                                        // (pas les morceaux du premier jour)
  const liste = aRamasserCompagnon(s);
  assert(liste.length > 0, 'du bois ou des pierres à ramasser');
  assertEqual(liste[0].sorte, liste.some((p) => p.sorte === 'morceau_bois') ? 'morceau_bois' : 'petite_pierre', 'le bois d\'abord');
  const bois = countItem(s, liste[0].objet), energie = s.energie, faim = jaugeMembre(aidant(s));
  assertEqual(sortes(s, 'ramasser:'), [`ramasser:${liste[0].id}`]);
  const r = faireCompagnon(s, `ramasser:${liste[0].id}`);
  assertEqual([r.ok, countItem(s, liste[0].objet) - bois, s.energie], [true, 1, energie]);
  assertEqual(jaugeMembre(aidant(s)), faim - C.RAMASSER.FAIM);
  assert(!ramassables(s).some((p) => p.id === liste[0].id), 'il n\'est plus sur la carte');
  assertEqual(faireCompagnon(s, `ramasser:${liste[0].id}`).ok, false, 'déjà pris');
  assertEqual(sortes(s, 'ramasser:'), [], 'l\'écart');
  for (let k = 1; k < C.RAMASSER.PAR_JOUR + 2; k++) { heure(s, 9 + k * C.RAMASSER.ECART_H); journeeCompagnon(s); }
  assertEqual(faitsCompagnon(s).ramasser, Math.min(C.RAMASSER.PAR_JOUR, liste.length), 'la limite du jour');
});

/* ---------- quand il n'aide pas ---------- */

test('il n\'aide pas : l\'option ôtée, la nuit, hors des heures, le ventre vide, pendant le didacticiel, seul adulte', () => {
  const s = potager(3);
  assertEqual(compagnonEmpeche(s), null);
  laisserAider(s, false);
  assertEqual([compagnonEmpeche(s), tachesCompagnon(s), journeeCompagnon(s)], ['non', [], []]);
  assertEqual(faireCompagnon(s, `arroser:${plantesASoif(s)[0].case}`).ok, false);
  laisserAider(s, true);
  heure(s, C.HEURES[0] - 1);
  assertEqual(compagnonEmpeche(s), 'heure', 'trop tôt');
  heure(s, C.HEURES[1]);
  assertEqual(compagnonEmpeche(s), 'heure', 'trop tard');
  // jamais après la fin du travail des adultes (FAMILLE.HORAIRE.FIN_TRAVAIL_ADULTES, 19 h), même si HEURES allait plus loin
  const fin = C.HEURES[1];
  C.HEURES[1] = 23;
  heure(s, DATA.FAMILLE.HORAIRE.FIN_TRAVAIL_ADULTES);
  assertEqual([finAide(), compagnonEmpeche(s)], [DATA.FAMILLE.HORAIRE.FIN_TRAVAIL_ADULTES, 'heure'], 'le soir, il flâne');
  C.HEURES[1] = fin;
  heure(s, 22);
  assert(startNight(s), 'la nuit');
  assertEqual(compagnonEmpeche(s), 'heure', 'la nuit');
  s.nuitEnCours = null;
  heure(s, 9);
  aidant(s).energie = C.FAIM_MIN - 1;
  assertEqual(compagnonEmpeche(s), 'faim');
  aidant(s).energie = DATA.FAMILLE.FAIM.MAX;
  s.didacticiel = { etape: 3, fini: false };
  assertEqual(compagnonEmpeche(s), 'didacticiel', 'le joueur apprend encore la ferme');
  s.didacticiel.fini = true;
  assertEqual(compagnonEmpeche(s), null);
  removeMember(s, 'adulte-2');
  assertEqual([compagnonEmpeche(s), tachesCompagnon(s)], ['seul', []]);
});

test('l\'option se sauvegarde ; une partie qui n\'a pas le champ le reçoit, sans changer de format', () => {
  const s = createInitialState(4);
  assertEqual(s.compagnon.aide, true, 'il aide d\'office');
  laisserAider(s, false);
  const lu = migrate(copie({ v: 1, t: 0, s }));
  assertEqual([lu.compagnon.aide, lu.version], [false, s.version]);
  const ancienne = copie(s);
  delete ancienne.compagnon;
  const m = migrate(copie({ v: 1, t: 0, s: ancienne }));
  assertEqual([m.compagnon.aide, m.compagnon.arroser, m.compagnon.prochain], [true, 0, { arroser: 0, cuisiner: 0, ramasser: 0 }]);
  const abimee = copie(s);
  abimee.compagnon = 'x';
  assertEqual(reparerPartie(abimee).compagnon.aide, true);
});

test('pendant une vraie absence, le moteur le fait travailler (sans dessin) ; le journal le dit', () => {
  const s = potager(2);
  const notes = [];
  const stop = ecouterJournal((type, d) => { if (type === 'compagnon') notes.push(d.action); });
  assertEqual([simulateOffline(s, 5).compagnon, notes], [undefined, []], 'une page rechargée : rien d\'un coup (on le voit faire sur la carte)');
  const report = simulateOffline(s, DATA.COMPAGNON.ABSENCE_S);
  stop();
  assertEqual(report.compagnon.map((x) => x.action), ['arroser', 'arroser']);
  assertEqual(notes, ['arroser', 'arroser']);
  assertEqual(s.potager.parcelles.filter((p) => p.arrose).length, 2);
});

/* ---------- la carte ---------- */

const SCRIPTS = [
  'js/carte/kit.js', 'js/carte/chemins.js', 'js/carte/nature.js', 'js/carte/gestes.js', 'js/carte/lumiere.js', 'js/carte/eau.js', 'js/carte/ressort.js',
  'js/carte/cheval.js', 'js/carte/toit.js', 'js/fermier.js', 'js/famille-ferme.js',
  'js/carte/ferme/config.js', 'js/carte/ferme/chantier.js', 'js/carte/ferme/puits.js', 'js/carte/ferme/compagnon.js',
];
const fenetre = { devicePixelRatio: 1, navigator: {}, matchMedia: () => ({ matches: false }), localStorage: { getItem: () => null, setItem() {} } };
for (const f of SCRIPTS) new Function('window', readFileSync(new URL('../../' + f, import.meta.url), 'utf8'))(fenetre);
const { CarteKit: K, Fermier, FamilleFerme, FermeCarte } = fenetre;
const T = K.T;

function image() {
  const etat = { visible: true, alpha: 1, x: 0, y: 0, depth: 0, frame: null };
  const p = new Proxy(etat, {
    get(t, k) {
      if (k in t) return t[k];
      if (k === 'setVisible') return (v) => { t.visible = !!v; return p; };
      if (k === 'setAlpha') return (a) => { t.alpha = a; return p; };
      if (k === 'setPosition') return (x, y) => { t.x = x; t.y = y; return p; };
      if (k === 'setDepth') return (d) => { t.depth = d; return p; };
      if (k === 'setFrame') return (f) => { t.frame = f; return p; };
      return () => p;
    },
  });
  return p;
}

// La ferme d'essai : une maison (porte au sud) avec la cuisinière dedans ; dehors, un puits, un
// légume et un morceau de bois.
const COLS = 48, ROWS = 32, X0 = 10, Y0 = 6, L = 9, H = 7;
const at = (c, r) => r * COLS + c;
function ferme() {
  const blocs = new Map();
  for (let r = Y0; r < Y0 + H; r++) for (let c = X0; c < X0 + L; c++) if (r === Y0 || r === Y0 + H - 1 || c === X0 || c === X0 + L - 1) blocs.set(at(c, r), 'mur_pierre');
  const PORTE = at(X0 + 4, Y0 + H - 1), CUISINIERE = at(X0 + 2, Y0 + 1);
  blocs.set(PORTE, 'porte');
  blocs.set(CUISINIERE, 'cuisiniere');
  const PUITS = at(X0 + 14, Y0 + 9), LEGUME = at(X0 + 2, Y0 + 12), BOIS = at(X0 + 20, Y0 + 14);
  blocs.set(PUITS, 'puits');
  const fermees = [...blocs].filter(([, s]) => s !== 'porte').map(([k]) => k);
  return { blocs, fermees, PORTE, CUISINIERE, PUITS, LEGUME, BOIS };
}
function scene(F) {
  const s = {
    world: { w: COLS * T, h: ROWS * T }, grid: { cols: COLS },
    add: { sprite: image, image, graphics: image },
    textures: { exists: () => true },
    load: { spritesheet() {}, once() {}, start() {}, isLoading: () => false },
    ctx: { lastModel: { foyer: F.PORTE } },
  };
  for (const p of FermeCarte.parties) Object.assign(s, p);
  s.blocks = new Map();
  for (const [k, sorte] of F.blocs) {
    const x = (k % COLS) * T + T / 2, y = (Math.floor(k / COLS) + 1) * T;
    s.blocks.set(k, { case: k, sorte, x, y, img: { depth: y } });
  }
  const emprise = new Set();
  for (let r = Y0; r < Y0 + H; r++) for (let c = X0; c < X0 + L; c++) emprise.add(at(c, r));
  s.toits = [{ key: 'toit_essai', maison: true, dedans: emprise }];
  s.fermier = Fermier.attach(s, { sheet: 'fermier', frames: [], world: s.world, objects: {}, reduced: () => false, blocks: () => F.fermees });
  return s;
}
const fermee = (F, x, y) => F.fermees.includes(at(Math.floor(x / T), Math.floor((y - 1) / T)));
function traverse(F, a, b) {
  const n = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) * 4));
  for (let k = 1; k <= n; k++) if (fermee(F, a.x + ((b.x - a.x) * k) / n, a.y + ((b.y - a.y) * k) / n)) return true;
  return false;
}

test('la carte : où il se tient pour chaque tâche, tourné vers elle', () => {
  const F = ferme(), s = scene(F);
  const a = s.lieuCompagnon(`arroser:${F.LEGUME}`);
  assertEqual([a.geste, a.face, a.flip, a.x, a.y], ['arroser', 'cote', false, (F.LEGUME % COLS) * T - 2, Math.floor(F.LEGUME / COLS) * T + 14], 'à gauche du légume');
  const p = s.lieuCompagnon(`puits:${F.PUITS}`);
  assertEqual([p.geste, p.face, p.x, p.y], ['puiser', 'haut', (F.PUITS % COLS) * T + T / 2, (Math.floor(F.PUITS / COLS) + 2) * T - 2], 'sous le puits, de dos');
  const c = s.lieuCompagnon('cuisiner');
  assertEqual([c.geste, c.face, c.x, c.y], ['cuisiner', 'haut', (F.CUISINIERE % COLS) * T + T / 2, (Math.floor(F.CUISINIERE / COLS) + 2) * T - 2], 'devant la cuisinière');
  const b = s.lieuCompagnon(`ramasser:morceau_bois:${F.BOIS}`);
  assertEqual([b.geste, b.x], ['ramasser', (F.BOIS % COLS) * T + T / 2], 'sur le bois');
  assertEqual([s.lieuCompagnon(`puits:${F.PUITS + 1}`), s.lieuCompagnon('rien'), s.lieuCompagnon('arroser:x')], [null, null, null]);
});

test('la carte : il va à chacune de ses tâches par un chemin (la cuisinière dans la maison), fait son geste, puis le jeu fait le travail', () => {
  const F = ferme(), s = scene(F);
  const faits = [], gains = [];
  const model = { famille: [{ id: 'adulte-2', perso: 1 }], heure: 10, nuit: false, aide: { id: 'adulte-2', lieux: [] } };
  const fam = FamilleFerme.attach(s, {
    fermier: s.fermier, frames: [], reduced: () => false, file: () => '', maison: () => s.homeInside(),
    lieu: (l) => s.lieuCompagnon(l),
    aide: (lieu, done) => { faits.push({ lieu }); model.aide.lieux = model.aide.lieux.filter((l) => l !== lieu); done({ fait: 1 }); },
    gain: (items) => gains.push(items),
  });
  model.aide.lieux = [`puits:${F.PUITS}`, `arroser:${F.LEGUME}`, 'cuisiner', `ramasser:morceau_bois:${F.BOIS}`];
  fam.sync(model);
  let prec = null;
  const fautes = [];
  const attendus = model.aide.lieux.slice();
  for (let k = 0; k < 20 * 240 && faits.length < attendus.length; k++) {
    fam.update(50);
    const [q] = fam.info();
    if (fermee(F, q.x, q.y)) fautes.push(`dans un mur (${q.x}, ${q.y})`);
    else if (prec && traverse(F, prec, q)) fautes.push(`traverse un mur de (${prec.x}, ${prec.y}) à (${q.x}, ${q.y})`);
    prec = q;
  }
  assertEqual(fautes, []);
  assertEqual(faits.map((f) => f.lieu), attendus, 'chaque tâche, dans l\'ordre');
  assertEqual(gains.length, attendus.length, 'la bulle après chaque tâche');
  assertEqual(Object.keys(FamilleFerme.GESTES).sort(), ['arroser', 'betes', 'cuisiner', 'puiser', 'ramasser']);
});

/* ---------- ce que le joueur lui demande (un appui sur lui, sur la carte) ---------- */

test('demander : ramasser les légumes mûrs, jusqu\'au bout, avant ses initiatives ; tout va à l\'inventaire', () => {
  const s = potager(4);
  const D = C.DEMANDE, m = aidant(s), energie = s.energie, faim = jaugeMembre(m);
  // rien de mûr : il le dit
  assertEqual(demanderCompagnon(s, 'legumes'), { ok: false, error: D.RIEN.legumes });
  assertEqual(demandeCompagnon(s), null);
  // trois carottes mûres
  const mures = s.potager.parcelles.filter((p) => p.culture).slice(0, 3);
  for (const p of mures) { p.stade = maxStage(p); p.arrose = true; }
  const avant = countItem(s, 'carotte');
  assertEqual(demanderCompagnon(s, 'legumes'), { ok: true, quoi: 'legumes', texte: D.OUI.legumes });
  // une seule tâche à la fois, la sienne avant tout (pas d'arrosage ni de ramassage en même temps)
  const t = tachesCompagnon(s);
  assertEqual(t.length, 1);
  assert(/^recolter:\d+$/.test(t[0]) && estTacheCompagnon(t[0]), t[0]);
  const r = journeeCompagnon(s);
  assertEqual(r.slice(0, 3).map((x) => x.action), ['recolter', 'recolter', 'recolter'], 'les trois carottes d\'abord');
  assert(mures.every((p) => !p.culture), 'cueillies');
  assert(countItem(s, 'carotte') > avant, 'dans l\'inventaire');
  assertEqual(recolteesCompagnon(s).sort(), mures.map((p) => p.case).sort(), 'la carte sait que c\'est lui');
  assertEqual(demandeCompagnon(s), null, 'fini : il reprend sa journée');
  assertEqual(s.energie, energie, 'pas l\'énergie du personnage');
  assert(jaugeMembre(m) <= faim - 3 * D.FAIM, 'mais sa faim à lui');
});

test('demander : arroser tout ce qui a soif (sans la limite du jour), sinon il dit pourquoi', () => {
  const s = potager(8);
  assert(demanderCompagnon(s, 'arroser').ok);
  journeeCompagnon(s);
  assertEqual(s.potager.parcelles.filter((p) => p.culture && !p.arrose).length, 0, 'les huit, plus que PAR_JOUR');
  assertEqual(demanderCompagnon(s, 'arroser').error, C.DEMANDE.RIEN.arroser, 'plus rien n\'a soif');
  // des plantes ont soif, mais pas d'eau du tout
  const t = potager(2);
  t.eauMl = 0;
  assertEqual(demanderCompagnon(t, 'arroser').error, C.DEMANDE.SANS_EAU);
});

test('demander : récolter les fruits des arbres du Verger', () => {
  const s = potager(0);
  assertEqual(demanderCompagnon(s, 'recolter').error, C.DEMANDE.RIEN.recolter);
  const libre = s.potager.parcelles.find((p) => !p.culture);
  const arbre = planterArbre(s, 'pommier', libre.case + 3);
  arbre.fruits = true;
  const fruit = DATA.VERGER.ARBRES.pommier.fruit, avant = countItem(s, fruit);
  assert(demanderCompagnon(s, 'recolter').ok);
  assertEqual(tachesCompagnon(s), [`cueillir:${arbre.case}`]);
  const r = faireCompagnon(s, `cueillir:${arbre.case}`);
  assertEqual([r.ok, r.action], [true, 'cueillir']);
  assertEqual(countItem(s, fruit), avant + DATA.VERGER.FRUITS);
  assertEqual(arbre.fruits, false);
  assertEqual(arbre.prochaine, s.day + DATA.VERGER.PERIODE - 1, 'comme cueilli par le joueur dans la journée');
  assertEqual(demandeCompagnon(s) && tachesCompagnon(s).length, 0);
});

test('demander : le soir, la nuit, le ventre vide, il refuse ; l\'option « laisser aider » ôtée, il aide quand même ; la demande s\'oublie le lendemain', () => {
  const s = potager(3);
  for (const p of s.potager.parcelles.filter((q) => q.culture)) p.stade = maxStage(p);
  const D = C.DEMANDE;
  heure(s, DATA.FAMILLE.HORAIRE.FIN_TRAVAIL_ADULTES + 0.5);
  assertEqual(demanderCompagnon(s, 'legumes').error, D.TARD);
  heure(s, 9);
  laisserAider(s, false);
  assert(demanderCompagnon(s, 'legumes').ok, 'c\'est le joueur qui demande');
  assertEqual(tachesCompagnon(s).length, 1);
  s.day += 1;
  assertEqual(demandeCompagnon(s), null, 'oubliée le lendemain');
  assertEqual(tachesCompagnon(s), [], 'l\'option ôtée : plus d\'initiative');
  laisserAider(s, true);
  aidant(s).energie = C.FAIM_MIN - 1;
  assertEqual(demanderCompagnon(s, 'legumes').error, D.FAIM_TEXTE);
  assertEqual(demanderCompagnon(s, 'nager').ok, false);
});

test('demander : ramasser les légumes mûrs des bacs de la Serre aussi', () => {
  const s = potager(0);
  s.serre.construit = true;
  const bac = { ...makePlot(1, DATA.SERRE.LIEU), case: 12345, culture: 'carotte' };
  bac.stade = maxStage(bac);
  s.serre.parcelles.push(bac);
  const avant = countItem(s, 'carotte');
  assert(demanderCompagnon(s, 'legumes').ok, 'un légume mûr dans la Serre');
  assertEqual(tachesCompagnon(s), ['recolter:12345']);
  assertEqual(faireCompagnon(s, 'recolter:12345').ok, true);
  assertEqual(bac.culture, null, 'cueilli');
  assert(countItem(s, 'carotte') > avant, 'dans l\'inventaire');
});
