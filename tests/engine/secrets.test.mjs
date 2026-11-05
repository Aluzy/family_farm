/* ==========================================================================
   Tests du moteur : D-2, les secrets du monde (js/engine/secrets.js, monde-gen.js, docs/phase-4.md).
   - le plan : N secrets par sorte au plus, chacun sur un biome de sa sorte, loin de la ferme, des hameaux,
     des autres lieux et des autres secrets ; le même tirage ; posés et fermés à la marche dans leur région ;
   - les ouvrir : un trésor ou une page du carnet (dans l'ordre), une seule fois ; le belvédère montre le pays ;
     les pages de l'encyclopédie se découvrent ; rien dans un monde partagé.
   Lancer seul : node --test tests/engine/secrets.test.mjs (ou node tests/run-tests.mjs secrets).
   ========================================================================== */

import { bilanSecrets, countItem, createInitialState, DATA, GENERATEUR_VERSION, migrate, elementsSol, genererMonde, majEncyclopedie, ouvrirSecret, partVue, secretOuvert, solDirect } from '../../js/engine/index.js';
import { BIOME } from '../../js/engine/monde-gen.js';
import { lieuxDeRegion, SORTE_LIEU } from '../../js/engine/monde-lieux.js';
import { assert, assertEqual, garden, test } from './aide.mjs';

const mondes = {};
function monde(graine) {
  if (!mondes[graine]) { const sol = solDirect(genererMonde(graine).terrain); elementsSol(sol.ctx); mondes[graine] = sol.ctx; }
  return mondes[graine];
}

test('D-2 : le plan : des secrets sur leur biome, loin de tout, le même tirage', () => {
  const PS = DATA.PLAN_MONDE.SECRETS;
  for (const g of ['1', '2']) {
    const ctx = monde(g), W = ctx.cadre.LARGEUR, L = ctx.elements.lieux, S = L.secrets;
    assert(S.length >= 10, `${S.length} secrets (graine ${g})`);
    const d = (a, b) => Math.hypot((a % W) - (b % W), Math.floor(a / W) - Math.floor(b / W));
    for (const [sorte, R] of Object.entries(PS.SORTES)) assert(S.filter((x) => x.sorte === sorte).length <= R.N, sorte);
    for (const x of S) {
      const b = ctx.lire.biome(x.case);
      assert(PS.SORTES[x.sorte].BIOMES.map((n) => BIOME[n]).includes(b), `${x.id} sur son biome`);
      for (const h of L.hameaux) assert(d(x.case, h.case) >= PS.HAMEAU, `${x.id} loin des hameaux`);
      for (const l of [...L.grottes, ...L.peche, ...L.recit]) assert(d(x.case, l.case) >= PS.LIEU, `${x.id} loin de ${l.id}`);
      for (const y of S) if (y !== x) assert(d(x.case, y.case) >= PS.ECART, `${x.id} loin de ${y.id}`);
    }
    assertEqual(new Set(S.map((x) => x.id)).size, S.length, 'des id uniques');
  }
  const a = monde('1').elements.lieux.secrets, sol = solDirect(genererMonde('1').terrain);
  elementsSol(sol.ctx);
  assertEqual(sol.ctx.elements.lieux.secrets, a, 'le même tirage');
});

test('D-2 : posés dans leur région, leurs cases fermées à la marche', () => {
  const ctx = monde('1'), W = ctx.cadre.LARGEUR;
  const x = ctx.elements.lieux.secrets.find((s) => s.sorte === 'cairn') || ctx.elements.lieux.secrets[0];
  const X = x.case % W, Y = Math.floor(x.case / W);
  const g = { cx0: X - 10, cy0: Y - 10, cl: 20, ch: 20, marche: new Uint8Array(400).fill(1), biomeDe: (i) => ctx.lire.biome(i) };
  const r = lieuxDeRegion(ctx, g);
  const imgs = [];
  for (let k = 0; k < r.images.length; k += 4) imgs.push([...r.images.slice(k, k + 4)]);
  assert(imgs.some((im) => im[0] === SORTE_LIEU[x.sorte] && im[1] === X * 16 + 8), 'son dessin');
  assertEqual(g.marche[10 * 20 + 10], 0, 'sa case fermée');
});

function partie() {
  const s = garden();
  s.carte.graine = '1';
  return s;
}

test('D-2 : l\'ouvrir : un trésor ou une page (dans l\'ordre), une seule fois ; l\'encyclopédie', () => {
  const s = partie();
  majEncyclopedie(s);
  const S = monde('1').elements.lieux.secrets.filter((x) => x.sorte !== 'belvedere');
  let pages = 0, tresors = 0;
  for (const l of S) {
    const pieces = s.pieces, compte = (it) => countItem(s, it);
    const tresors0 = Object.fromEntries((DATA.SECRETS.TRESORS[l.sorte] || []).map(([it]) => [it, it === 'pieces' ? 0 : compte(it)]));
    const r = ouvrirSecret(s, l);
    assert(r && r.ok && !r.deja && r.texte, `${l.id} s'ouvre`);
    assert(secretOuvert(s, l.id));
    if (r.page) { pages += 1; assertEqual(r.page, DATA.SECRETS.PAGES[pages - 1], 'les pages dans l\'ordre'); }
    else {
      tresors += 1;
      const t = r.tresor;
      assert(t && (t.pieces ? s.pieces === pieces + t.pieces : compte(t.item) === tresors0[t.item] + t.n), `${l.id} : un trésor`);
    }
    const again = ouvrirSecret(s, l);
    assert(again.deja && again.texte, 'une seule fois');
  }
  assert(pages >= 2 && tresors >= 2, `${pages} pages, ${tresors} trésors`);
  assertEqual(bilanSecrets(s).ouverts, S.length);
  const nouvelles = majEncyclopedie(s);
  assert(nouvelles.includes('s_ruine') || nouvelles.includes('s_cairn'), 'la page de la sorte');
  assert(nouvelles.includes('carnet_voyageur_1'), 'la page du carnet');
});

test('D-2 : le belvédère montre le pays ; rien dans un monde partagé', () => {
  const s = partie();
  const b = monde('1').elements.lieux.secrets.find((x) => x.sorte === 'belvedere');
  const avant = partVue(s);
  const r = ouvrirSecret(s, b);
  assert(r.vue > 0 && partVue(s) > avant, `${r.vue} cellules découvertes`);
  const p = partie();
  p.mondePartage = true;
  assertEqual(ouvrirSecret(p, b), null);
  assertEqual(p.secrets, undefined);
});

test('D-2 : une partie du générateur 1 passe au 2 (la migration 71 → 72), rien d\'autre ne change', () => {
  const neuve = createInitialState(7);
  const v71 = { ...JSON.parse(JSON.stringify(neuve)), version: 71, carte: { ...neuve.carte, generateur: 1 } };
  const m = migrate(v71);
  assertEqual(m.carte, { graine: neuve.carte.graine, generateur: 2 });
  assertEqual(GENERATEUR_VERSION, 2);
  const { carte: a, version: va, ...ra } = m, { carte: b, version: vb, ...rb } = JSON.parse(JSON.stringify(neuve));
  assertEqual(ra, rb, 'le reste de la partie est intact');
});
