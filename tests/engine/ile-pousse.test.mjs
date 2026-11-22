/* ==========================================================================
   Tests du moteur : ce qui pousse sur l'île de 300 × 300 (js/engine/ile/pousse.js : roches, vegetation,
   quotasEspeces ; docs/ile-300.md, étape 5). Sur plusieurs graines : chaque espèce a au moins son minimum
   de pieds (C4) ; chaque pied est sur un sol de son espèce, à son stade ; les blocs ont leur empreinte
   et leur écart ; la prairie du départ est dégagée, sauf ce qu'on y ramasse ; les espèces rares restent
   loin du départ ; des cultures et des fruitiers mûrs, et quelques jeunes ; une forêt d'arbres ; le temps.
   Lancer seul : node --test tests/engine/ile-pousse.test.mjs (ou node tests/run-tests.mjs ile-pousse).
   ========================================================================== */

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { DATA } from '../../js/engine/catalog.js';
import { BIOME, catalogue, compterEspeces, genererChantier, ILE, SOL, SOL_EAU } from '../../js/engine/ile.js';

const GRAINES = ['ile-1', 'ile-2', 'lune', 'soleil', 'a', 'c', 'e', '42'];
const N = ILE.TAILLE;
const CAT = catalogue();
const ILES = new Map(GRAINES.map((g) => [g, genererChantier(g)]));
const A = ILE.APPARITION;
const fiche = (numero) => CAT.fiches[numero - 1];
const auDepart = (i) => Math.hypot((i % N) - A.x, Math.floor(i / N) - A.y);

// Les cases autour de i (sans elle), à au plus r cases en carré, et leur distance en carré.
function autour(i, r) {
  const x = i % N;
  const y = (i - x) / N;
  const cases = [];
  for (let dy = -r; dy <= r; dy++) {
    for (let dx = -r; dx <= r; dx++)
      if (dx || dy) cases.push([(y + dy) * N + x + dx, Math.max(Math.abs(dx), Math.abs(dy))]);
  }
  return cases;
}

test('chaque espèce a au moins son minimum de pieds sur chaque île (C4)', () => {
  for (const [g, ch] of ILES) {
    const compte = compterEspeces(ch.objet, CAT);
    const sous = CAT.fiches.filter((f) => compte[f.numero] < f.min).map((f) => `${f.id} ${compte[f.numero]}/${f.min}`);
    assert.deepEqual(sous, [], `${g} : sous leur minimum`);
  }
});

test("toutes les cultures, les fleurs et les fruitiers du jeu poussent à l'état sauvage", () => {
  for (const [g, ch] of ILES) {
    const compte = compterEspeces(ch.objet, CAT);
    const presentes = CAT.fiches.filter((f) => compte[f.numero] > 0);
    const portees = (liste) => new Set(presentes.flatMap((f) => f[liste]));
    for (const cle of Object.keys(DATA.CULTURES)) assert.ok(portees('cultures').has(cle), `${g} : pas de ${cle}`);
    for (const cle of Object.keys(DATA.BACS.FLEURS)) assert.ok(portees('fleurs').has(cle), `${g} : pas de ${cle}`);
    for (const cle of Object.keys(DATA.VERGER.ARBRES)) assert.ok(compte[CAT.parId.get(`${cle}_sauvage`).numero] > 0);
  }
});

test("chaque pied est sur un sol de son espèce, à un stade qu'elle a", () => {
  const solsDe = new Map(CAT.fiches.map((f) => [f.numero, new Set(f.ou.map((p) => SOL[p.sol]))]));
  const depart = new Set(['pierres', 'bois_flotte'].map((id) => CAT.parId.get(id).numero));
  for (const [g, ch] of ILES) {
    for (let i = 0; i < N * N; i++) {
      const o = ch.objet[i];
      if (!o) continue;
      assert.ok(o <= CAT.fiches.length, `${g} : numéro ${o}`);
      assert.ok(ch.etat[i] < fiche(o).stades, `${g} : ${fiche(o).id} au stade ${ch.etat[i]}`);
      if (depart.has(o) && auDepart(i) <= 8) continue; // le ramassage du départ, posé sur l'herbe
      assert.ok(solsDe.get(o).has(ch.sol[i]), `${g} : ${fiche(o).id} sur un sol qui n'est pas le sien`);
      if (SOL_EAU[ch.sol[i]]) assert.equal(ch.biome[i], BIOME.lac, `${g} : ${fiche(o).id} en mer`);
    }
  }
});

test('les blocs : leur empreinte sur la terre ferme, libre, et leur écart sans autre bloc', () => {
  for (const [g, ch] of ILES) {
    const pris = new Uint8Array(N * N);
    const blocs = [];
    for (let i = 0; i < N * N; i++) {
      const o = ch.objet[i];
      if (!o || !fiche(o).bloque) continue;
      blocs.push(i);
      const x = i % N;
      const y = (i - x) / N;
      for (const [dx, dy] of fiche(o).empreinte) {
        const j = (y + dy) * N + x + dx;
        assert.ok(ch.terre[j] && !ch.lac[j], `${g} : ${fiche(o).id} déborde sur l'eau`);
        assert.ok(j === i || ch.objet[j] === 0, `${g} : ${fiche(o).id} recouvre un autre pied`);
        assert.equal(pris[j], 0, `${g} : deux blocs sur une même case`);
        pris[j] = 1;
      }
    }
    // deux blocs ne sont jamais à moins de l'écart du plus petit des deux (en cases, en carré)
    const parCase = new Map(blocs.map((i) => [i, fiche(ch.objet[i])]));
    for (const i of blocs) {
      for (const [j, d] of autour(i, 3)) {
        if (!parCase.has(j)) continue;
        const ecart = Math.min(parCase.get(i).ecart, parCase.get(j).ecart);
        assert.ok(d > ecart, `${g} : deux blocs trop proches`);
      }
    }
  }
});

test("le départ : dégagé, sauf les pierres et le bois qu'on y ramasse en arrivant", () => {
  const D = DATA.ILE.POUSSE.DEPART;
  for (const [g, ch] of ILES) {
    const ramasse = { pierres: 0, bois_flotte: 0 };
    for (let i = 0; i < N * N; i++) {
      const o = ch.objet[i];
      if (!o || auDepart(i) > D.distance[1] + 1) continue;
      const id = fiche(o).id;
      if (id in ramasse && auDepart(i) >= D.distance[0] - 1) ramasse[id]++;
      else assert.ok(auDepart(i) > A.rayon + 1, `${g} : ${id} sur la prairie du départ`);
    }
    assert.ok(
      ramasse.pierres >= D.pierres && ramasse.bois_flotte >= D.bois_flotte,
      `${g} : ${JSON.stringify(ramasse)}`,
    );
    assert.equal(ch.objet[A.y * N + A.x], 0);
  }
});

test('les espèces rares restent loin du départ (loinDuDepart)', () => {
  for (const [g, ch] of ILES) {
    for (let i = 0; i < N * N; i++) {
      const o = ch.objet[i];
      if (o) assert.ok(auDepart(i) >= fiche(o).loinDuDepart, `${g} : ${fiche(o).id} trop près du départ`);
    }
  }
});

test('les cultures et les fruitiers sauvages : surtout mûrs, quelques jeunes', () => {
  let murs = 0;
  let jeunes = 0;
  for (const ch of ILES.values()) {
    for (let i = 0; i < N * N; i++) {
      const o = ch.objet[i];
      if (!o || fiche(o).stades < 2) continue;
      if (ch.etat[i] === fiche(o).stades - 1) murs++;
      else jeunes++;
    }
  }
  const part = jeunes / (murs + jeunes);
  assert.ok(Math.abs(part - DATA.ILE.POUSSE.JEUNES) < 0.08, `${(part * 100).toFixed(0)} % de jeunes`);
});

test("une forêt d'arbres, une prairie fleurie, une lande de bruyère", () => {
  for (const [g, ch] of ILES) {
    const par = { foret: [0, 0], prairie: [0, 0], lande: [0, 0] };
    for (let i = 0; i < N * N; i++) {
      const b = Object.keys(par).find((k) => ch.biome[i] === BIOME[k]);
      if (!b) continue;
      par[b][1]++;
      const o = ch.objet[i];
      const famille = o ? fiche(o).famille : '';
      if ((b === 'foret' && famille === 'arbre') || (b === 'prairie' && famille === 'fleur')) par[b][0]++;
      if (b === 'lande' && o && fiche(o).id === 'bruyere') par[b][0]++;
    }
    const part = (b) => par[b][0] / par[b][1];
    assert.ok(part('foret') > 0.05 && part('foret') < 0.4, `${g} : ${part('foret').toFixed(2)} d'arbres en forêt`);
    assert.ok(part('prairie') > 0.02, `${g} : ${part('prairie').toFixed(2)} de fleurs en prairie`);
    assert.ok(part('lande') > 0.05, `${g} : ${part('lande').toFixed(2)} de bruyère en lande`);
  }
});

test('la même graine fait pousser la même île', () => {
  const ch = genererChantier('ile-1');
  assert.deepEqual(ch.objet, ILES.get('ile-1').objet);
  assert.deepEqual(ch.etat, ILES.get('ile-1').etat);
  assert.equal(ch.pousse, undefined, 'le terrain de la pousse ne reste pas dans le chantier');
});

test('le temps : une île entière, ce qui pousse compris, en moins de 500 ms', () => {
  genererChantier('chauffe');
  const debut = performance.now();
  genererChantier('chrono');
  const duree = performance.now() - debut;
  // seuil large (les machines de l'intégration continue sont lentes) ; sur un ordinateur, environ 120 ms
  assert.ok(duree < 500, `${duree.toFixed(0)} ms`);
});
