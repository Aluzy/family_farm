/* ==========================================================================
   Tests des atlas de la carte (piste 4 du chantier « allègement » : scripts/carte/atlas.py,
   js/carte/atlas.generated.js, js/carte/atlas.js).
   - les atlas sont à jour : chaque image source a l'empreinte notée à leur assemblage ;
   - chaque meuble et chaque bête du grand monde y est, les atlas tiennent dans 2 048 × 2 048 ;
   - K.atlas découpe une clé comme Phaser découpe la même image seule (cadre __BASE, cases numérotées).
   Lancer seul : node tests/run-tests.mjs atlas.
   ========================================================================== */

import { createHash } from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';
import { assert, assertEqual, test } from './aide.mjs';

const ASSETS = new URL('../../assets/', import.meta.url);
const fenetre = { addEventListener() {}, matchMedia: () => ({ matches: false }), devicePixelRatio: 1, localStorage: null, navigator: {} };
for (const f of ['kit.js', 'atlas.generated.js', 'atlas.js']) new Function('window', readFileSync(new URL(`../../js/carte/${f}`, import.meta.url), 'utf8'))(fenetre);
const A = fenetre.CarteAtlas, K = fenetre.CarteKit;

// La largeur et la hauteur d'un PNG (son en-tête IHDR).
function taillePng(nom) {
  const b = readFileSync(new URL(nom, ASSETS));
  return [b.readUInt32BE(16), b.readUInt32BE(20)];
}

test('atlas : à jour avec leurs images (sinon : python3 scripts/carte/atlas.py)', () => {
  const vieilles = Object.entries(A.sources).filter(([f, e]) => createHash('sha1').update(readFileSync(new URL(f, ASSETS))).digest('hex').slice(0, 12) !== e);
  assertEqual(vieilles.map(([f]) => f), [], 'images refaites depuis l\'assemblage des atlas');
  assertEqual(Object.keys(A.sources).sort(), Object.keys(A.cases).sort());
});

test('atlas : chaque meuble, chaque bête du grand monde et les bacs y sont ; au plus 2 048 px de côté', () => {
  const attendus = readdirSync(ASSETS).filter((f) => /^(meuble_|faune_).*\.png$/.test(f)).concat('bacs.png');
  assertEqual(attendus.filter((f) => !A.cases[f]), []);
  for (const [cle, a] of Object.entries(A.atlas)) {
    assertEqual(taillePng(a.fichier), [a.w, a.h], cle);
    assert(a.w <= 2048 && a.h <= 2048, `${cle} : ${a.w} × ${a.h}`);
    // (des côtés en puissances de deux : les coordonnées des cases y sont exactes pour la carte graphique)
    assert(!(a.w & (a.w - 1)) && !(a.h & (a.h - 1)), `${cle} : ${a.w} × ${a.h}`);
  }
  for (const [f, [cle, x, y, w, h]] of Object.entries(A.cases)) {
    assertEqual(taillePng(f), [w, h], f);
    const a = A.atlas[cle];
    // (sa bordure de 1 px comprise)
    assert(x >= 1 && y >= 1 && x + w + 1 <= a.w && y + h + 1 <= a.h, f);
  }
});

test('atlas : les cases ne se chevauchent pas (bordures comprises)', () => {
  const parAtlas = {};
  for (const [f, [cle, x, y, w, h]] of Object.entries(A.cases)) (parAtlas[cle] = parAtlas[cle] || []).push([f, x - 1, y - 1, x + w + 1, y + h + 1]);
  for (const L of Object.values(parAtlas)) {
    for (let i = 0; i < L.length; i++) for (let j = i + 1; j < L.length; j++) {
      const [a, b] = [L[i], L[j]];
      assert(a[3] <= b[1] || b[3] <= a[1] || a[4] <= b[2] || b[4] <= a[2], `${a[0]} et ${b[0]}`);
    }
  }
});

// Un gestionnaire de textures réduit à ce que K.atlas lit et écrit.
function faux() {
  const list = {}, emis = [];
  const texture = (key, w, h) => ({
    key, source: [], frames: {}, firstFrame: '__BASE', frameTotal: 0,
    add(n, s, x, y, fw, fh) { if (n in this.frames) return null; this.frames[n] = { n, x, y, w: fw, h: fh }; if (this.firstFrame === '__BASE') this.firstFrame = n; this.frameTotal++; return this.frames[n]; },
  });
  return {
    list, emis,
    exists: (k) => k in list,
    get: (k) => list[k],
    create(k, src, w, h) { if (k in list) return null; return (list[k] = texture(k, w, h)); },
    emit: (e, k) => emis.push(e),
    ajouterAtlas(k) { list[k] = texture(k); list[k].source.push({ image: 'atlas' }); },
  };
}

// Une scène réduite : ses textures et son chargeur (les événements notés, déclenchés à la main).
function scene(textures) {
  const ecoute = {}, charges = [];
  return {
    textures, missing: new Set(),
    load: {
      on: (e, f) => { (ecoute[e] = ecoute[e] || []).push(f); },
      off: (e, f) => { ecoute[e] = (ecoute[e] || []).filter((g) => g !== f); },
      image: (k, u) => charges.push(['image', k, u]),
      spritesheet: (k, u, c) => charges.push(['spritesheet', k, u, c]),
    },
    charges, emettre: (e, ...a) => (ecoute[e] || []).slice().forEach((f) => f(...a)),
  };
}

test('K.atlas : une planche d\'un atlas découpée comme par Phaser (cadre __BASE sur sa case, cases 0, 1, 2…)', () => {
  const TX = faux(), S = scene(TX), [cle, x, y, w, h] = A.cases['ramassables.png'];
  assert(K.atlas.feuille(S, 'ramassables', 'ramassables.png', { frameWidth: 16, frameHeight: 16 }));
  assert(K.atlas.feuille(S, 'poule', 'poule.png', { frameWidth: 16, frameHeight: 16 }));
  // (un seul chargement par atlas)
  assertEqual(S.charges.map((c) => c.slice(0, 2)), [['image', 'atlas_ferme']]);
  assert(!TX.exists('ramassables'), 'pas avant que l\'atlas arrive');
  TX.ajouterAtlas(cle);
  S.emettre('filecomplete-image-' + cle);
  const t = TX.get('ramassables');
  assertEqual(t.frames.__BASE, { n: '__BASE', x, y, w, h });
  assertEqual(t.frameTotal, 1 + (w / 16) * (h / 16));
  assertEqual(t.firstFrame, 0);
  assertEqual(t.frames[3], { n: 3, x: x + 48, y, w: 16, h: 16 });
  assert(TX.exists('poule'));
  // (marge, espacement, début et fin : comme Phaser.Textures.Parsers.SpriteSheet)
  const T2 = faux(), S2 = scene(T2);
  T2.ajouterAtlas(cle);
  K.atlas.feuille(S2, 'r2', 'ramassables.png', { frameWidth: 14, frameHeight: 14, margin: 1, spacing: 2, startFrame: 2, endFrame: 4 });
  const r2 = T2.get('r2');
  assertEqual(Object.keys(r2.frames), ['0', '1', '2', '__BASE']);
  assertEqual(r2.frames[0], { n: 0, x: x + 1 + 2 * 16, y: y + 1, w: 14, h: 14 });
});

test('K.atlas : une image seule hors des atlas est chargée comme avant ; un atlas manquant donne ses clés aux dessins de secours', () => {
  const TX = faux(), S = scene(TX), v = (f) => 'assets/' + f + '?v=1';
  assert(!K.atlas.image(S, 'crops', 'crops.png', v));
  assertEqual(S.charges, [['image', 'crops', 'assets/crops.png?v=1']]);
  K.atlas.image(S, 'meuble_table', 'meuble_table.png', v);
  K.atlas.image(S, 'meuble_chaise', 'meuble_chaise.png', v);
  S.emettre('loaderror', { key: 'atlas_meubles' });
  assertEqual([...S.missing].sort(), ['meuble_chaise', 'meuble_table']);
});

test('K.atlas.decoupe : l\'image source et la case d\'une clé', () => {
  const TX = faux(), S = scene(TX), [cle, x, y, w, h] = A.cases['meuble_table.png'];
  TX.ajouterAtlas(cle);
  K.atlas.image(S, 'meuble_table', 'meuble_table.png');
  const t = TX.get('meuble_table');
  t.has = (n) => n in t.frames;
  t.get = (n) => { const f = t.frames[n || t.firstFrame]; return { source: t.source[0], cutX: f.x, cutY: f.y, cutWidth: f.w, cutHeight: f.h }; };
  assertEqual(K.atlas.decoupe(TX, 'meuble_table'), { img: 'atlas', x, y, w, h });
  assertEqual(K.atlas.decoupe(TX, 'rien'), null);
});
