/* ==========================================================================
   Tests du moteur : les gestes sur l'île (docs/ile-300.md, étape C). Chaque sorte de récolte passe par les gestes de
   la carte (js/engine/monde-recolte.js recolterMonde) et change l'île même : la hache sur un arbre, la pioche sur une
   roche, la main sur une culture sauvage (elle ne repousse pas, C15), la faux sur le tournesol sauvage (sa fleur,
   C16), un fruitier cueilli (il revient au stade « arbre », C15) ; la faux sur une parcelle de tournesol du potager.
   Lancer seul : node --test tests/engine/ile-gestes.test.mjs (ou node tests/run-tests.mjs ile-gestes).
   ========================================================================== */

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createNewGame, finishSetup, harvestPlot, inventoryCounts, maxStage } from '../../js/engine/index.js';
import { catalogue } from '../../js/engine/ile.js';
import { ileDeLaPartie } from '../../js/engine/ile/jeu.js';
import { etatObjetMonde, recolterMonde, repousseMonde } from '../../js/engine/monde-recolte.js';

const fiches = [];
for (const f of catalogue().fiches) fiches[f.numero] = f;

function partie() {
  const s = createNewGame(5);
  finishSetup(s);
  s.outils = { hache: true, pioche: true, faux: true, canne: true, houe: true };
  s.stamina = 1e9;
  return s;
}
// La première case de l'île qui porte un objet dont la fiche plaît à `f` (et son stade, `stade`, s'il est donné).
function trouver(ile, f, stade) {
  for (let i = 0; i < ile.objet.length; i++) {
    const fi = ile.objet[i] && fiches[ile.objet[i]];
    if (fi && f(fi) && (stade === undefined || ile.etat[i] === stade(fi))) return i;
  }
  return -1;
}
// L'id d'une pièce de la carte posée sur la case i (le pied au milieu de la case).
const idDe = (ile, i, nom) => `${nom}:${(i % ile.n) * 16 + 8},${Math.floor(i / ile.n) * 16 + 13}`;
// Le geste répété jusqu'à ce que la pièce s'en aille (au plus 12 coups).
function jusquauBout(s, id, o = {}) {
  let r;
  for (let k = 0; k < 12; k++) {
    s.stamina = 1e9;
    r = recolterMonde(s, id, o);
    if (!r.ok || r.fini || r.tombe || r.casse || r.pris || r.cueilli || r.coups === undefined) break;
  }
  return r;
}

test("la hache abat un arbre : la case se libère, l'arbre repoussera", () => {
  const s = partie(),
    ile = ileDeLaPartie(s);
  const i = trouver(
    ile,
    (f) => f.genre === 'arbre' && f.dessin.planche === 'vegetation' && f.recolte && f.recolte.geste === 'couper',
  );
  assert.ok(i >= 0);
  const r = jusquauBout(s, idDe(ile, i, fiches[ile.objet[i]].dessin.sorte));
  assert.ok(r.ok, r.error);
  assert.equal(ile.objet[i], 0);
  assert.equal(ile.bloque[i], 0);
  assert.ok(!ile.repousse.some((e) => e.i === i), 'pas de repousse');
});

test('la pioche casse une roche', () => {
  const s = partie(),
    ile = ileDeLaPartie(s);
  const i = trouver(ile, (f) => f.dessin.planche === 'roches' && f.recolte && f.recolte.geste === 'casser');
  assert.ok(i >= 0);
  const id = idDe(ile, i, fiches[ile.objet[i]].dessin.sorte);
  const r = jusquauBout(s, id);
  assert.ok(r.ok, r.error);
  assert.equal(ile.objet[i], 0);
  assert.equal(recolterMonde(s, id, {}).ok, false, 'une roche cassée ne se casse plus');
});

test('une culture sauvage mûre se ramasse à la main et ne repousse pas', () => {
  const s = partie(),
    ile = ileDeLaPartie(s);
  const i = trouver(
    ile,
    (f) => f.dessin.planche === 'crops' && f.id !== 'tournesol_sauvage',
    (f) => f.stades - 1,
  );
  assert.ok(i >= 0);
  const f = fiches[ile.objet[i]],
    avant = ile.repousse.length;
  const r = jusquauBout(s, idDe(ile, i, f.id));
  assert.ok(r.ok, r.error);
  assert.equal(ile.objet[i], 0);
  assert.equal(ile.repousse.length, avant);
});

test('un fruitier en fruits se cueille : il garde sa taille (le stade « arbre »)', () => {
  const s = partie(),
    ile = ileDeLaPartie(s);
  const i = trouver(
    ile,
    (f) => f.dessin.planche === 'verger',
    (f) => f.stades - 1,
  );
  if (i < 0) return; // (aucun fruitier en fruits sur cette île au départ)
  const f = fiches[ile.objet[i]];
  const r = recolterMonde(s, idDe(ile, i, f.id), { variante: f.stades - 1 });
  assert.ok(r.ok, r.error);
  assert.equal(ile.objet[i], f.numero);
  assert.equal(ile.etat[i], f.recolte.stade);
});

test('le roncier et le châtaignier cueillis restent en place ; leurs fruits reviennent', () => {
  for (const nom of ['ronces', 'chataignier']) {
    const s = partie(),
      ile = ileDeLaPartie(s);
    const i = trouver(ile, (f) => f.id === nom);
    assert.ok(i >= 0, nom);
    const id = idDe(ile, i, nom),
      numero = ile.objet[i];
    const r = recolterMonde(s, id, { geste: 'cueillir', variante: 0 });
    assert.ok(r.ok, `${nom} : ${r.error}`);
    assert.equal(ile.objet[i], numero, `${nom} reste là`);
    assert.ok(etatObjetMonde(s, id).cueilli);
    assert.equal(recolterMonde(s, id, { geste: 'cueillir', variante: 0 }).ok, false, 'déjà cueilli');
    s.day = etatObjetMonde(s, id).retour;
    s.monde.ici = null;
    repousseMonde(s);
    assert.equal(etatObjetMonde(s, id), undefined, 'les fruits sont revenus');
    assert.ok(recolterMonde(s, id, { geste: 'cueillir', variante: 0 }).ok);
  }
  // cueilli, le châtaignier s'abat encore à la hache : là, il s'en va
  const s = partie(),
    ile = ileDeLaPartie(s),
    i = trouver(ile, (f) => f.id === 'chataignier'),
    id = idDe(ile, i, 'chataignier');
  recolterMonde(s, id, { geste: 'cueillir', variante: 0 });
  const r = jusquauBout(s, id, { geste: 'couper' });
  assert.ok(r.ok, r.error);
  assert.equal(ile.objet[i], 0);
  assert.equal(etatObjetMonde(s, id), undefined);
});

test('les fleurs rouges et mauves donnent un hibiscus ; les herbes, de la fibre à la faux ; le rhododendron, du bois', () => {
  const cas = {
    fleur_rouge: 'hibiscus',
    fleur_mauve: 'hibiscus',
    fleurs: 'fibre',
    touffe_pre: 'fibre',
    touffe_foret: 'fibre',
    herbe_seche: 'fibre',
    chardon: 'fibre',
    nenuphar: 'fibre',
    rhododendron: 'bois',
  };
  for (const [nom, item] of Object.entries(cas)) {
    const s = partie(),
      ile = ileDeLaPartie(s);
    const i = trouver(ile, (f) => f.id === nom);
    assert.ok(i >= 0, nom);
    const r = jusquauBout(s, idDe(ile, i, nom));
    assert.ok(r.ok, `${nom} : ${r.error}`);
    assert.equal(ile.objet[i], 0, `${nom} s'en va`);
    assert.ok(r.items && r.items[item] >= 1, `${nom} donne ${item}`);
  }
});

test('le tournesol du potager : à la main ses graines, à la faux sa fleur', () => {
  const s = partie();
  const p = { id: 'p1', culture: 'tournesol', stade: 0, lieu: 'potager', arrose: false };
  p.stade = maxStage(p);
  s.potager.parcelles.push(p);
  const main = harvestPlot(s, p, false, true);
  assert.ok(main.ok, main.error);
  assert.ok(!main.items.fleur_tournesol);
  Object.assign(p, { culture: 'tournesol' });
  p.stade = maxStage(p);
  const avant = inventoryCounts(s).fleur_tournesol || 0;
  const faux = harvestPlot(s, p, false, true, { faux: true });
  assert.ok(faux.ok, faux.error);
  assert.ok(faux.items.fleur_tournesol >= 1);
  assert.equal(Object.keys(faux.items).length, 1);
  assert.ok((inventoryCounts(s).fleur_tournesol || 0) > avant);
});

test('les cultures sauvages : prises, elles quittent l’île ; la vigne revient à un stade et reste en place (regle.reste)', async () => {
  const { reglesDeLIle } = await import('../../js/engine/ile/recoltes.js');
  const R = reglesDeLIle();
  assert.equal(R.vigne_sauvage.regle.reste, true);
  assert.ok(!R.carotte_sauvage.regle.reste && !R.patate_sauvage.regle.reste);
});

test('tous les buissons de l’île se coupent à la hache (le roncier aussi : 1 bois ; ses mûres se cueillent encore)', () => {
  const buissons = catalogue()
    .fiches.filter((f) => f.famille === 'buisson')
    .map((f) => f.id);
  assert.deepEqual(buissons.sort(), ['ajonc', 'buisson_pre', 'genet', 'rhododendron', 'ronces']);
  for (const nom of buissons) {
    const s = partie(),
      ile = ileDeLaPartie(s);
    const i = trouver(ile, (f) => f.id === nom);
    assert.ok(i >= 0, `${nom} : sur l'île`);
    s.stamina = 100;
    const avant = inventoryCounts(s).bois || 0;
    const r = jusquauBout(s, idDe(ile, i, nom), { geste: 'couper' });
    assert.ok(r.ok, `${nom} : ${r.error}`);
    assert.equal(ile.objet[i], 0, `${nom} coupé`);
    assert.ok((inventoryCounts(s).bois || 0) > avant, `${nom} : du bois`);
  }
});
