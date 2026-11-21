/* ==========================================================================
   Tests du moteur : les lacs, les biomes, les plages et le point d'apparition de l'île de 300 × 300
   (js/engine/ile.js ; docs/ile-300.md, étape 4). Sur plusieurs graines : chaque case a un biome et un sol
   de ce biome ; les lacs (leur nombre, leur eau plate, loin de la mer et du départ, séparés) ; la lande,
   la forêt et la prairie dans leurs parts ; chaque sol présent (les espèces en ont besoin) ; les plages
   basses, au rivage ; la prairie plate du départ, d'où l'on va partout à pied, jusqu'à la mer ; le temps.
   Lancer seul : node --test tests/engine/ile-biomes.test.mjs (ou node tests/run-tests.mjs ile-biomes).
   ========================================================================== */

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { DATA } from '../../js/engine/catalog.js';
import { BIOME, genererChantier, ILE, SOL, SOL_BIOME, SOLS } from '../../js/engine/ile.js';

const GRAINES = ['ile-1', 'ile-2', 'lune', 'soleil', 'a', 'b', 'c', 'd', 'e', '42'];
const N = ILE.TAILLE;
const R = DATA.ILE;
const ILES = new Map(GRAINES.map((g) => [g, genererChantier(g)]));

// Les quatre voisines d'une case (sans sortir de la carte).
function voisines(i) {
  const x = i % N;
  return [x > 0 ? i - 1 : -1, x < N - 1 ? i + 1 : -1, i - N, i + N].filter((j) => j >= 0 && j < N * N);
}

// Les groupes de cases d'un masque reliées par leurs côtés.
function groupes(masque) {
  const vues = new Uint8Array(N * N);
  const tous = [];
  for (let d = 0; d < N * N; d++) {
    if (!masque[d] || vues[d]) continue;
    const groupe = [d];
    vues[d] = 1;
    for (let k = 0; k < groupe.length; k++) {
      for (const j of voisines(groupe[k])) {
        if (masque[j] && !vues[j]) {
          vues[j] = 1;
          groupe.push(j);
        }
      }
    }
    tous.push(groupe);
  }
  return tous;
}

const distance = (i, x, y) => Math.hypot((i % N) - x, Math.floor(i / N) - y);

test('chaque case a un biome et un sol de ce biome ; la mer est la mer, la terre est la terre', () => {
  for (const [g, ch] of ILES) {
    for (let i = 0; i < N * N; i++) {
      assert.equal(SOL_BIOME[ch.sol[i]], ch.biome[i], `${g} : case ${i}`);
      assert.equal(ch.biome[i] === BIOME.mer, ch.terre[i] === 0, `${g} : case ${i}`);
      assert.equal(ch.biome[i] === BIOME.lac, ch.lac[i] === 1, `${g} : case ${i}`);
    }
  }
});

test('les lacs : leur nombre, une eau plate, loin de la mer et du départ, sans se toucher', () => {
  const { x: ax, y: ay } = ILE.APPARITION;
  for (const [g, ch] of ILES) {
    const lacs = groupes(ch.lac);
    assert.equal(lacs.length, ch.lacs.length, `${g} : deux lacs se touchent`);
    assert.ok(lacs.length >= R.LACS.NOMBRE[0] && lacs.length <= R.LACS.NOMBRE[1], `${g} : ${lacs.length} lacs`);
    for (const lac of lacs) {
      assert.ok(
        lac.length >= R.LACS.AIRE[0] / 2 && lac.length <= R.LACS.AIRE[1],
        `${g} : un lac de ${lac.length} cases`,
      );
      const niveau = ch.hauteur[lac[0]];
      for (const i of lac) {
        assert.equal(ch.hauteur[i], niveau, `${g} : l'eau d'un lac n'est pas plate`);
        assert.ok(ch.cote[i] >= R.LACS.COTE_MIN, `${g} : un lac trop près de la mer`);
        assert.ok(distance(i, ax, ay) >= R.LACS.LOIN_DEPART, `${g} : un lac trop près du départ`);
        // la rive n'est jamais plus basse que l'eau
        for (const j of voisines(i)) if (!ch.lac[j]) assert.ok(ch.hauteur[j] >= niveau, `${g} : une rive sous l'eau`);
      }
    }
  }
});

test("les lacs : l'eau basse au bord ; l'humidité monte sur leurs rives", () => {
  for (const [g, ch] of ILES) {
    const avant = genererChantier(g, 'humidite').humidite;
    const monte = R.LACS.BERGE.humidite * 0.5 ** (1 / R.LACS.BERGE.portee);
    for (let i = 0; i < N * N; i++) {
      if (ch.lac[i]) {
        const touche = voisines(i).some((j) => !ch.lac[j]);
        if (touche) assert.equal(ch.sol[i], SOL.eau_basse, `${g} : un bord de lac en eau profonde`);
      } else if (ch.terre[i] && voisines(i).some((j) => ch.lac[j])) {
        const attendu = Math.min(1, avant[i] + monte) - 1e-6;
        assert.ok(ch.humidite[i] >= attendu, `${g} : une rive pas plus humide (${avant[i]} → ${ch.humidite[i]})`);
      }
    }
  }
});

test('la lande, la forêt et la prairie : chacune une bonne part de la terre', () => {
  for (const [g, ch] of ILES) {
    const compte = new Map();
    let terre = 0;
    for (let i = 0; i < N * N; i++) {
      if (!ch.terre[i] || ch.lac[i]) continue;
      terre++;
      compte.set(ch.biome[i], (compte.get(ch.biome[i]) ?? 0) + 1);
    }
    const part = (b) => (compte.get(BIOME[b]) ?? 0) / terre;
    assert.ok(Math.abs(part('lande') - R.REPARTITION.lande) < 0.06, `${g} : lande ${part('lande').toFixed(2)}`);
    assert.ok(Math.abs(part('foret') - R.REPARTITION.foret) < 0.06, `${g} : forêt ${part('foret').toFixed(2)}`);
    assert.ok(part('prairie') > 0.25, `${g} : prairie ${part('prairie').toFixed(2)}`);
    assert.ok(part('plage') > 0.01, `${g} : plage ${part('plage').toFixed(2)}`);
  }
});

test('chaque sol est sur chaque île (les espèces en ont besoin : data/ile.json ESPECES)', () => {
  for (const [g, ch] of ILES) {
    const compte = new Uint32Array(SOLS.length);
    for (let i = 0; i < N * N; i++) compte[ch.sol[i]]++;
    SOLS.forEach((s, k) => {
      const voulu = s.nom === 'eau' ? 1 : 30;
      assert.ok(compte[k] >= voulu, `${g} : ${compte[k]} cases de ${s.nom}`);
    });
  }
});

test('les plages : basses, au rivage ; du sable et des galets', () => {
  for (const [g, ch] of ILES) {
    for (let i = 0; i < N * N; i++) {
      if (ch.biome[i] !== BIOME.plage) continue;
      assert.ok(ch.hauteur[i] <= R.PLAGES.HAUTEUR_MAX + 1e-6, `${g} : une plage en hauteur`);
      assert.ok(ch.cote[i] <= R.PLAGES.LARGEUR[1], `${g} : une plage loin de la mer`);
    }
  }
});

test("le point d'apparition : une prairie plate, sans eau autour, au milieu d'une prairie", () => {
  const A = R.APPARITION;
  for (const [g, ch] of ILES) {
    assert.deepEqual(ch.apparition, { x: A.x, y: A.y, rayon: A.rayon });
    let min = Infinity;
    let max = -Infinity;
    for (let i = 0; i < N * N; i++) {
      const d = distance(i, A.x, A.y);
      if (d <= A.rayon) {
        assert.equal(ch.sol[i], SOL.herbe, `${g} : le départ n'est pas de l'herbe`);
        min = Math.min(min, ch.hauteur[i]);
        max = Math.max(max, ch.hauteur[i]);
      }
      if (d <= A.prairie * 0.6) assert.equal(ch.biome[i], BIOME.prairie, `${g} : ni prairie ni plage près du départ`);
      if (d <= R.LACS.LOIN_DEPART) assert.equal(ch.lac[i], 0, `${g} : un lac près du départ`);
    }
    assert.ok(max - min < 0.01, `${g} : le départ n'est pas plat (${(max - min).toFixed(3)})`);
  }
});

test("depuis le départ, on va à pied sur toute la terre, jusqu'à la mer (pour bâtir le port)", () => {
  const { x, y } = ILE.APPARITION;
  for (const [g, ch] of ILES) {
    const aPied = ch.terre.map((v, i) => (v && !ch.lac[i] ? 1 : 0));
    const tout = groupes(aPied);
    assert.equal(tout.length, 1, `${g} : ${tout.length} morceaux de terre séparés par les lacs`);
    assert.ok(tout[0].includes(y * N + x));
    assert.ok(
      tout[0].some((i) => voisines(i).some((j) => !ch.terre[j])),
      `${g} : la mer est hors d'atteinte`,
    );
  }
});

test("le temps : une île jusqu'au point d'apparition en moins de 400 ms", () => {
  genererChantier('chauffe');
  const debut = performance.now();
  genererChantier('chrono');
  const duree = performance.now() - debut;
  // seuil large (les machines de l'intégration continue sont lentes) ; sur un ordinateur, 60 à 110 ms
  assert.ok(duree < 400, `${duree.toFixed(0)} ms`);
});
