/* ==========================================================================
   Tests du moteur : le socle de l'île de 300 × 300 (js/engine/ile.js, sections 1 à 3 ; docs/ile-300.md,
   étape 2). Les constantes (la taille, les six biomes, les sols) ; le hasard (le même tirage pour la même
   graine, un tirage par étape, le bruit continu et borné, assez rapide pour les 90 000 cases) ; le catalogue
   des espèces (chaque culture, fleur, fruitier et plante sauvage du jeu a sa fiche et sa place, le même
   catalogue sort des mêmes données, chaque fiche a son dessin, les numéros d'une sauvegarde se retrouvent).
   Lancer seul : node --test tests/engine/ile-socle.test.mjs (ou node tests/run-tests.mjs ile-socle).
   ========================================================================== */

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { DATA } from '../../js/engine/catalog.js';
import {
  BIOME,
  BIOMES,
  bruit2D,
  catalogue,
  construireCatalogue,
  entre,
  fbm,
  hacher,
  ILE,
  prng,
  renumerotation,
  SOL,
  SOL_BIOME,
  SOL_EAU,
  SOLS,
  tableDesNumeros,
  verifierCatalogue,
} from '../../js/engine/ile.js';

const RACINE = new URL('../../', import.meta.url);
const lireJSON = (chemin) => JSON.parse(readFileSync(new URL(chemin, RACINE), 'utf8'));

// La largeur et la hauteur d'une image PNG (l'en-tête IHDR).
function taillePNG(chemin) {
  const octets = readFileSync(new URL(chemin, RACINE));
  return { l: octets.readUInt32BE(16), h: octets.readUInt32BE(20) };
}

/* ---------- 1. les constantes ---------- */

test("l'île : 300 × 300 cases, une bande de mer, un point d'apparition au centre", () => {
  assert.equal(ILE.TAILLE, 300);
  assert.equal(ILE.CASES, 90000);
  assert.ok(ILE.BORD_MER > 0 && ILE.BORD_MER < ILE.TAILLE / 4);
  assert.deepEqual([ILE.APPARITION.x, ILE.APPARITION.y], [ILE.TAILLE / 2, ILE.TAILLE / 2]);
  assert.equal(ILE.TAILLE % ILE.REGION === 0 || ILE.REGION > 0, true);
});

test("les biomes : les six de l'île, sans le marais, la falaise, la montagne, le sommet ni la rivière", () => {
  assert.deepEqual([...BIOMES], ['mer', 'plage', 'prairie', 'foret', 'lande', 'lac']);
  for (const retire of ['marais', 'falaise', 'montagne', 'sommet', 'riviere'])
    assert.equal(retire in BIOME, false, retire);
  BIOMES.forEach((nom, i) => assert.equal(BIOME[nom], i));
});

test("les sols : chacun d'un seul biome, chaque biome a les siens, l'eau marquée", () => {
  assert.equal(new Set(SOLS.map((s) => s.nom)).size, SOLS.length, 'un nom de sol en double');
  SOLS.forEach((s, i) => {
    assert.equal(SOL[s.nom], i);
    assert.equal(SOL_BIOME[i], BIOME[s.biome]);
    assert.equal(SOL_EAU[i], s.eau ? 1 : 0);
  });
  for (const biome of BIOMES)
    assert.ok(
      SOLS.some((s) => s.biome === biome),
      `${biome} n'a pas de sol`,
    );
  for (const biome of ['mer', 'lac']) {
    assert.ok(
      SOLS.filter((s) => s.biome === biome).every((s) => s.eau),
      `${biome} : un sol qui n'est pas de l'eau`,
    );
  }
  for (const biome of ['plage', 'prairie', 'foret', 'lande']) {
    assert.ok(
      SOLS.filter((s) => s.biome === biome).every((s) => !s.eau),
      `${biome} : un sol d'eau`,
    );
  }
});

/* ---------- 2. le hasard ---------- */

test('hacher : le même texte, le même nombre de 32 bits ; deux textes, deux nombres', () => {
  assert.equal(hacher('ile-1'), hacher('ile-1'));
  assert.notEqual(hacher('ile-1'), hacher('ile-2'));
  assert.equal(hacher(42), hacher('42'));
  for (const t of ['', 'a', 'une graine assez longue']) {
    const h = hacher(t);
    assert.ok(Number.isInteger(h) && h >= 0 && h < 2 ** 32);
  }
});

test('prng : la même graine et la même étape refont le même tirage ; une autre étape en fait un autre', () => {
  const tirer = (alea) => Array.from({ length: 50 }, () => alea());
  const a = tirer(prng('ile-1', 'forme'));
  assert.deepEqual(tirer(prng('ile-1', 'forme')), a);
  assert.notDeepEqual(tirer(prng('ile-1', 'eaux')), a);
  assert.notDeepEqual(tirer(prng('ile-2', 'forme')), a);
  for (const x of a) assert.ok(x >= 0 && x < 1);
});

test('entre : un entier dans les bornes, chacune atteinte', () => {
  const alea = prng('ile-1', 'entre');
  const vus = new Set();
  for (let i = 0; i < 2000; i++) {
    const n = entre(alea, 3, 7);
    assert.ok(Number.isInteger(n) && n >= 3 && n <= 7);
    vus.add(n);
  }
  assert.equal(vus.size, 5);
});

test("bruit2D : borné, le même au même point, continu, différent d'une graine à l'autre", () => {
  const g = hacher('ile-1/relief');
  let ecarts = 0;
  for (let i = 0; i < 2000; i++) {
    const x = (i * 7.31) % 97;
    const y = (i * 3.17) % 89;
    const v = bruit2D(x, y, g);
    assert.ok(v >= 0 && v < 1, `${v} hors de [0, 1)`);
    assert.equal(bruit2D(x, y, g), v);
    assert.ok(Math.abs(bruit2D(x + 0.01, y, g) - v) < 0.05, 'une cassure entre deux points voisins');
    if (Math.abs(bruit2D(x, y, g + 1) - v) > 0.01) ecarts++;
  }
  assert.ok(ecarts > 1500, 'deux graines donnent presque le même bruit');
});

test('fbm : borné, centré, varié, et assez rapide pour les 90 000 cases', () => {
  const g = hacher('ile-1/relief');
  const N = ILE.TAILLE;
  const debut = performance.now();
  let somme = 0;
  let min = 1;
  let max = 0;
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      const v = fbm(x / 40, y / 40, g, 4);
      somme += v;
      if (v < min) min = v;
      if (v > max) max = v;
    }
  }
  const duree = performance.now() - debut;
  const moyenne = somme / (N * N);
  assert.ok(min >= 0 && max < 1);
  assert.ok(moyenne > 0.4 && moyenne < 0.6, `moyenne ${moyenne}`);
  assert.ok(max - min > 0.4, `trop plat : ${min} à ${max}`);
  // seuil large (les machines de l'intégration continue sont lentes) ; sur un ordinateur, quelques millisecondes
  assert.ok(duree < 150, `${duree.toFixed(1)} ms pour 90 000 cases à 4 octaves`);
});

/* ---------- 3. le catalogue ---------- */

test('le catalogue : aucune erreur (chaque espèce du jeu a sa fiche, sa place, son minimum, sa récolte)', () => {
  assert.deepEqual(verifierCatalogue(catalogue()), []);
});

test('le catalogue : toutes les cultures, les fleurs, les fruitiers et les plantes sauvages', () => {
  const cat = catalogue();
  const portees = (liste) => new Set(cat.fiches.flatMap((f) => f[liste]));
  assert.deepEqual([...portees('cultures')].sort(), Object.keys(DATA.CULTURES).sort());
  assert.deepEqual([...portees('fleurs')].sort(), Object.keys(DATA.BACS.FLEURS).sort());
  for (const arbre of Object.keys(DATA.VERGER.ARBRES)) {
    assert.equal(cat.parId.get(`${arbre}_sauvage`)?.famille, 'fruitier', arbre);
  }
  for (const sorte of DATA.VEGETATION.SORTES) assert.ok(cat.parId.has(sorte.nom), sorte.nom);
});

test('le catalogue : les numéros vont de 1 à n, sans trou, et les tables suivent les fiches', () => {
  const { fiches, parId, tables } = catalogue();
  fiches.forEach((f, i) => {
    assert.equal(f.numero, i + 1);
    assert.equal(parId.get(f.id), f);
    assert.equal(DATA.ILE.ESPECES.FAMILLES[tables.famille[f.numero]], f.famille);
    assert.equal(tables.bloque[f.numero], f.bloque ? 1 : 0);
    assert.equal(tables.stades[f.numero], f.stades);
  });
  assert.equal(tables.genre.length, fiches.length + 1);
  assert.ok(fiches.length < 65535, 'les numéros tiennent dans un Uint16');
});

test('le catalogue : le même, des mêmes données ; les données ne sont pas modifiées', () => {
  const avant = JSON.stringify(DATA.ILE);
  const a = construireCatalogue(DATA);
  const b = construireCatalogue(structuredClone(DATA));
  assert.deepEqual(tableDesNumeros(a), tableDesNumeros(b));
  assert.deepEqual(
    a.fiches.map((f) => f.ou),
    b.fiches.map((f) => f.ou),
  );
  assert.equal(JSON.stringify(DATA.ILE), avant);
});

test('le catalogue : les places voulues (C7, C12 ; docs/ile-300.md, « Les biomes et les espèces »)', () => {
  const cat = catalogue();
  const biomesDe = (id) => new Set(cat.parId.get(id).ou.map((p) => p.biome));
  const conditionsDe = (id) => new Set(cat.parId.get(id).ou.map((p) => p.condition));
  // le cacao, la vanille et le café : la forêt, sur la mousse, loin du départ
  for (const id of ['cacao_sauvage', 'vanille_sauvage', 'cafe_sauvage']) {
    const f = cat.parId.get(id);
    assert.deepEqual(
      f.ou.map((p) => `${p.biome}/${p.sol}`),
      ['foret/mousse'],
      id,
    );
    assert.ok(f.loinDuDepart >= 60, id);
  }
  // les plantes du marais au bord de l'eau, celles de la montagne dans la lande
  for (const id of ['saule', 'jonc']) assert.ok(conditionsDe(id).has('berge'), id);
  assert.ok(biomesDe('nenuphar').has('lac'));
  assert.ok(conditionsDe('riz_sauvage').has('berge'));
  for (const id of ['sapin_nain', 'rhododendron', 'touffe_mont']) assert.ok(biomesDe(id).has('lande'), id);
  assert.ok(biomesDe('salicorne_sauvage').has('plage'));
  // une culture sauvage garde le dessin et les stades de la culture (C12)
  for (const [cle, culture] of Object.entries(DATA.CULTURES)) {
    if (DATA.ILE.ESPECES.CULTURES_DEJA_SAUVAGES[cle]) continue; // elle garde sa plante sauvage
    const f = cat.parId.get(`${cle}_sauvage`);
    assert.equal(f.dessin.planche, 'crops', cle);
    assert.deepEqual([f.dessin.r, f.dessin.c], [culture.sprite.r, culture.sprite.c], cle);
    assert.equal(f.stades, culture.stades, cle);
  }
});

test('le catalogue : chaque fiche a son dessin dans les planches', () => {
  const vegetation = lireJSON('assets/vegetation.json');
  const roches = lireJSON('assets/roches.json');
  const verger = taillePNG('assets/verger.png');
  // verger.png : des images de 80 × 80 ; un emplacement libre, un jeune arbre, puis quatre par espèce
  const imagesDuVerger = Math.floor(verger.l / 80) * Math.floor(verger.h / 80);
  for (const f of catalogue().fiches) {
    const d = f.dessin;
    if (d.planche === 'vegetation') {
      assert.equal(vegetation[d.sorte]?.length > 0, true, `${f.id} : pas d'image dans assets/vegetation.json`);
    } else if (d.planche === 'roches') {
      assert.equal(roches[d.sorte]?.length > 0, true, `${f.id} : pas d'image dans assets/roches.json`);
    } else if (d.planche === 'crops') {
      assert.ok(Number.isInteger(d.r) && d.c.length > 0, `${f.id} : pas d'image dans crops.png`);
    } else if (d.planche === 'verger') {
      assert.ok(2 + 4 * (d.dessin + 1) <= imagesDuVerger, `${f.id} : l'image ${d.dessin} n'est pas dans verger.png`);
    } else {
      assert.fail(`${f.id} : la planche « ${d.planche} » n'existe pas`);
    }
  }
});

test("le catalogue : une culture ajoutée au jeu prend sa place sur l'île sans rien écrire dans data/ile.json", () => {
  const data = structuredClone(DATA);
  data.CULTURES.radis = { ...structuredClone(DATA.CULTURES.carotte), nom: 'Radis' };
  data.OBJETS.radis = { ...structuredClone(DATA.OBJETS.carotte), nom: 'Radis' };
  const cat = construireCatalogue(data);
  const radis = cat.parId.get('radis_sauvage');
  assert.ok(radis, 'pas de radis sauvage');
  assert.ok(radis.ou.length > 0 && radis.min > 0);
  assert.deepEqual(verifierCatalogue(cat, data), []);
});

test('le catalogue : une faute de frappe dans data/ile.json est relevée', () => {
  const data = structuredClone(DATA);
  data.ILE.ESPECES.EXCEPTIONS.cacoa_sauvage = { min: 2 };
  data.ILE.ESPECES.PLACEMENTS.partout.prairie.herbe.coquelicots = 0.01;
  data.ILE.ESPECES.PLACEMENTS.partout.prairie.herbe.coquelicot = 0;
  data.ILE.ESPECES.PLACEMENTS.partout.marais = { vase: { saule: 0.01 } };
  const erreurs = verifierCatalogue(construireCatalogue(data), data).join('\n');
  assert.match(erreurs, /cacoa_sauvage/);
  assert.match(erreurs, /coquelicots/);
  assert.match(erreurs, /coquelicot : densité 0/);
  assert.match(erreurs, /saule : le biome « marais » n'existe pas/);
});

test('le catalogue : deux espèces du même nom sont refusées', () => {
  const data = structuredClone(DATA);
  data.VEGETATION.SORTES.push({ ...data.VEGETATION.SORTES[0], nom: 'carotte_sauvage' });
  assert.throws(() => construireCatalogue(data), /carotte_sauvage/);
});

test("les numéros d'une sauvegarde : retrouvés par leur nom, même après un ajout ou un retrait d'espèce", () => {
  const cat = catalogue();
  const table = tableDesNumeros(cat);
  assert.equal(table[0], '');
  // la même table : chaque numéro reste le sien
  const meme = renumerotation(table, cat);
  for (let i = 1; i < table.length; i++) assert.equal(meme[i], i);
  // une sauvegarde faite avec un autre ordre et une espèce disparue depuis
  const ancienne = ['', 'pommier_sauvage', 'espece_disparue', 'feuillu', 'cacao_sauvage'];
  const n = renumerotation(ancienne, cat);
  assert.equal(n[1], cat.parId.get('pommier_sauvage').numero);
  assert.equal(n[2], 0);
  assert.equal(n[3], cat.parId.get('feuillu').numero);
  assert.equal(n[4], cat.parId.get('cacao_sauvage').numero);
});
