/* ==========================================================================
   Tests du moteur : la forme de l'île de 300 × 300 (js/engine/ile.js, formeIle, relief, humidite ;
   docs/ile-300.md, étape 3). Sur plusieurs graines : la même île pour la même graine ; la bande de mer
   tout autour (C2) ; la terre d'un seul tenant, qui porte le point d'apparition ; la mer d'un seul tenant,
   ouverte sur le bord ; une île qui occupe sa place sans la remplir ; la distance au rivage ; le relief
   doux, sans falaise, mer comprise (C7) ; l'humidité ; le temps de génération.
   Lancer seul : node --test tests/engine/ile-forme.test.mjs (ou node tests/run-tests.mjs ile-forme).
   ========================================================================== */

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { DATA } from '../../js/engine/catalog.js';
import { ETAPES, genererChantier, ILE } from '../../js/engine/ile.js';

const GRAINES = ['ile-1', 'ile-2', 'lune', 'soleil', 'a', 'b', 'c', '42'];
const N = ILE.TAILLE;
const R = DATA.ILE;

// Une île par graine, générée une fois pour tous les tests du fichier.
const ILES = new Map(GRAINES.map((g) => [g, genererChantier(g)]));

// Les cases d'un masque (valeur 1) reliées à la case `depart` par leurs côtés.
function reliees(masque, depart) {
  const vues = new Uint8Array(N * N);
  const pile = [depart];
  vues[depart] = 1;
  let compte = 0;
  while (pile.length) {
    const i = pile.pop();
    compte++;
    const x = i % N;
    for (const j of [x > 0 ? i - 1 : -1, x < N - 1 ? i + 1 : -1, i - N, i + N]) {
      if (j >= 0 && j < N * N && masque[j] && !vues[j]) {
        vues[j] = 1;
        pile.push(j);
      }
    }
  }
  return compte;
}

const somme = (tableau) => tableau.reduce((s, v) => s + v, 0);

test('la même graine refait la même île ; deux graines, deux îles', () => {
  const a = genererChantier('ile-1');
  const b = ILES.get('ile-1');
  assert.deepEqual(a.terre, b.terre);
  assert.deepEqual(a.hauteur, b.hauteur);
  assert.deepEqual(a.humidite, b.humidite);
  assert.notDeepEqual(ILES.get('ile-1').terre, ILES.get('ile-2').terre);
});

test("genererChantier : chaque étape s'arrête où on le demande ; une étape inconnue est refusée", () => {
  assert.deepEqual([...ETAPES.slice(0, 3)], ['forme', 'relief', 'humidite']);
  const forme = genererChantier('ile-1', 'forme');
  assert.ok(forme.terre && forme.cote);
  assert.equal(forme.hauteur, undefined);
  assert.deepEqual(forme.terre, ILES.get('ile-1').terre, 'les étapes suivantes ne changent pas la forme');
  assert.throws(() => genererChantier('ile-1', 'volcan'), /volcan/);
});

test('la bande de mer : tout autour, sur BORD_MER + MARGE cases, toujours de la mer (C2)', () => {
  const bord = R.BORD_MER + R.FORME.MARGE;
  for (const [g, ch] of ILES) {
    for (let y = 0; y < N; y++) {
      for (let x = 0; x < N; x++) {
        if (x < bord || y < bord || x >= N - bord || y >= N - bord)
          assert.equal(ch.terre[y * N + x], 0, `${g} : (${x}, ${y})`);
      }
    }
  }
});

test("la terre : d'un seul tenant, et elle porte le point d'apparition", () => {
  const { x, y } = ILE.APPARITION;
  for (const [g, ch] of ILES) {
    assert.equal(ch.terre[y * N + x], 1, `${g} : le point d'apparition est dans l'eau`);
    assert.equal(reliees(ch.terre, y * N + x), somme(ch.terre), `${g} : de la terre détachée`);
  }
});

test("la mer : d'un seul tenant, ouverte sur le bord (pas de mer enclavée)", () => {
  for (const [g, ch] of ILES) {
    const mer = ch.terre.map((v) => 1 - v);
    assert.equal(reliees(mer, 0), somme(mer), `${g} : une mer enclavée`);
  }
});

test("l'île occupe sa place sans la remplir, et les îles varient", () => {
  const parts = [];
  for (const [g, ch] of ILES) {
    const part = somme(ch.terre) / (N * N);
    parts.push(part);
    assert.ok(part > 0.3 && part < 0.7, `${g} : ${(part * 100).toFixed(0)} % de terre`);
    // l'étendue : la terre va au moins jusqu'à la moitié de la largeur et de la hauteur
    let x0 = N;
    let x1 = 0;
    let y0 = N;
    let y1 = 0;
    for (let i = 0; i < N * N; i++) {
      if (!ch.terre[i]) continue;
      const x = i % N;
      const y = (i - x) / N;
      x0 = Math.min(x0, x);
      x1 = Math.max(x1, x);
      y0 = Math.min(y0, y);
      y1 = Math.max(y1, y);
    }
    assert.ok(x1 - x0 > N / 2 && y1 - y0 > N / 2, `${g} : l'île est trop petite`);
  }
  assert.ok(Math.max(...parts) - Math.min(...parts) > 0.05, 'toutes les îles ont la même taille');
});

test("la distance au rivage : positive sur la terre, négative en mer, 1 de part et d'autre de la côte", () => {
  for (const [g, ch] of ILES) {
    for (let y = 1; y < N - 1; y++) {
      for (let x = 1; x < N - 1; x++) {
        const i = y * N + x;
        assert.equal(ch.cote[i] > 0, ch.terre[i] === 1, `${g} : (${x}, ${y})`);
        const auBord = ch.terre[i - 1] !== ch.terre[i] || ch.terre[i + 1] !== ch.terre[i];
        if (auBord) assert.equal(Math.abs(ch.cote[i]), 1, `${g} : (${x}, ${y}) au rivage`);
      }
    }
  }
});

test('le relief : de 0 à 1, nul en mer, doux partout, sans falaise au rivage (C7)', () => {
  for (const [g, ch] of ILES) {
    let max = 0;
    let ecart = 0;
    for (let y = 0; y < N - 1; y++) {
      for (let x = 0; x < N - 1; x++) {
        const i = y * N + x;
        const h = ch.hauteur[i];
        assert.ok(h >= 0 && h <= 1, `${g} : ${h}`);
        if (!ch.terre[i]) assert.equal(h, 0);
        max = Math.max(max, h);
        ecart = Math.max(ecart, Math.abs(h - ch.hauteur[i + 1]), Math.abs(h - ch.hauteur[i + N]));
      }
    }
    assert.ok(max > 0.9, `${g} : le plus haut à ${max}`);
    assert.ok(ecart <= R.RELIEF.PENTE_MAX, `${g} : un écart de ${ecart.toFixed(3)} entre deux voisines`);
  }
});

test('le relief : des plaines et des hauteurs (pas une île plate, pas un seul mont)', () => {
  for (const [g, ch] of ILES) {
    const terre = [];
    for (let i = 0; i < N * N; i++) if (ch.terre[i]) terre.push(ch.hauteur[i]);
    const bas = terre.filter((h) => h < 0.25).length / terre.length;
    const haut = terre.filter((h) => h > 0.6).length / terre.length;
    assert.ok(bas > 0.1, `${g} : ${(bas * 100).toFixed(0)} % de bas`);
    assert.ok(haut > 0.05, `${g} : ${(haut * 100).toFixed(0)} % de hauts`);
  }
});

test("l'humidité : de 0 à 1, la mer à 1, des terres sèches et des terres humides", () => {
  for (const [g, ch] of ILES) {
    let sec = 0;
    let humide = 0;
    for (let i = 0; i < N * N; i++) {
      const u = ch.humidite[i];
      assert.ok(u >= 0 && u <= 1, `${g} : ${u}`);
      if (!ch.terre[i]) assert.equal(u, 1);
      else if (u < 0.4) sec++;
      else if (u > 0.6) humide++;
    }
    assert.ok(sec > 0 && humide > 0, `${g} : ${sec} cases sèches, ${humide} humides`);
  }
});

test("le temps : la forme, le relief et l'humidité d'une île en moins de 250 ms", () => {
  genererChantier('chauffe');
  const debut = performance.now();
  genererChantier('chrono');
  const duree = performance.now() - debut;
  // seuil large (les machines de l'intégration continue sont lentes) ; sur un ordinateur, une cinquantaine de ms
  assert.ok(duree < 250, `${duree.toFixed(0)} ms`);
});
