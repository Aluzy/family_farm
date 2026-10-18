/* ==========================================================================
   Tests du moteur : la carte de transition tirée pour chaque partie (js/engine/transition.js).
   Lancer seul : node --test tests/engine/transition.test.mjs (ou node tests/run-tests.mjs transition).
   ========================================================================== */

import { readFileSync } from 'node:fs';
import { countItem, createNewGame, DATA, ramasserTransition, ressourcesDuJour, setFarmSeed, TRANSITION, transitionPlan, transitionPris, transitionSeed } from '../../js/engine/index.js';
import { assert, assertEqual, test } from './aide.mjs';

const GRAINES = ['1', '2', '77', 'abc', 'b3', 'x9', '42', 'zz', 'ferme', '123456789'];
const carte = JSON.parse(readFileSync(new URL('../../assets/transition.json', import.meta.url), 'utf8'));
const kit = JSON.parse(carte.properties.find((p) => p.name === 'kit').value);

test('transition : le kit de la carte de Tiled va avec le générateur (l\'ouest, les tampons)', () => {
  assertEqual(kit.ouest, TRANSITION.OUEST);
  assertEqual([carte.width, carte.height], [TRANSITION.LARGEUR, TRANSITION.HAUTEUR]);
  for (const [nom, [w, h]] of Object.entries(TRANSITION.TAMPONS)) assertEqual([kit.tampons[nom].w, kit.tampons[nom].h], [w, h], nom);
  for (let n = TRANSITION.BARRIERE[0]; n <= TRANSITION.BARRIERE[1]; n++) assertEqual(kit.tampons['barriere_' + n].w, n);
  assertEqual(Object.keys(kit.sol.raccords).length, 14, 'les raccords herbe / chemin');
  // le bout de chemin de l'est (fixe) arrive où le chemin tiré finit
  const sol = carte.layers.find((l) => l.name === 'sol');
  for (const y of [TRANSITION.CHEMIN_Y - 1, TRANSITION.CHEMIN_Y]) assert(kit.sol.chemin.includes(sol.data[y * carte.width + TRANSITION.OUEST]), `du chemin à la colonne OUEST, rangée ${y}`);
});

test('transition : la même graine donne la même carte, une autre graine une autre', () => {
  assertEqual(JSON.stringify(transitionPlan('77')), JSON.stringify(transitionPlan('77')));
  const vues = new Set(GRAINES.map((g) => JSON.stringify(transitionPlan(g).maisons)));
  assert(vues.size >= GRAINES.length - 1, 'des maisons différentes d\'une graine à l\'autre');
});

test('transition : le chemin va de la ferme à la route, sans sauter de rangée', () => {
  for (const g of GRAINES) {
    const P = transitionPlan(g), m = P.milieu;
    assertEqual([m[0], m[1], m[2], m[TRANSITION.OUEST]], new Array(4).fill(TRANSITION.CHEMIN_Y), g + ' : droit aux deux bouts');
    for (let x = 1; x < m.length; x++) assert(Math.abs(m[x] - m[x - 1]) <= 1, `${g} : colonne ${x}`);
    for (let x = 0; x <= TRANSITION.OUEST; x++) assert(P.coins[m[x]][x] && P.coins[m[x] - 1][x] && P.coins[m[x] + 1][x], `${g} : du chemin colonne ${x}`);
  }
});

test('transition : trois à cinq maisons réparties à l\'ouest, de part et d\'autre du chemin, la porte face à lui, une allée jusqu\'à lui', () => {
  for (const g of GRAINES) {
    const P = transitionPlan(g);
    assert(P.maisons.length >= TRANSITION.MAISONS[0] && P.maisons.length <= TRANSITION.MAISONS[1], g);
    P.maisons.forEach((m, i) => {
      assertEqual(m.nom, 'maison_' + (i + 1));
      assert(m.x >= 1 && m.x + m.w <= TRANSITION.OUEST - 1 && m.y >= 2 && m.y + m.h <= TRANSITION.HAUTEUR - 2, `${g} ${m.nom} : dans l'ouest`);
      assertEqual(m.plan.length, m.h);
      const nord = m.sens === 'bas';
      assert(nord ? m.y + m.h <= P.milieu[m.porte.x] - 2 : m.y >= P.milieu[m.porte.x] + 2, `${g} ${m.nom} : du bon côté du chemin`);
      assertEqual(m.porte.y, nord ? m.y + m.h - 1 : m.y);
      assertEqual(m.plan[m.porte.y - m.y][m.porte.x - m.x], 'P', `${g} ${m.nom} : la porte dans le mur face au chemin`);
      assertEqual(m.plan[nord ? 0 : m.h - 1], 'M'.repeat(m.w), 'le mur du fond');
      const lits = m.plan.join('').split('').filter((c) => c === 'd' || c === 'p').length;
      assertEqual(m.lits, lits, `${g} ${m.nom} : ses lits comptés`);
      assert(lits >= TRANSITION.LITS[0] && lits <= TRANSITION.LITS[1], `${g} ${m.nom} : un lit par membre de la famille (${lits})`);
      // l'allée : du chemin à chaque rangée, de la porte jusqu'au chemin
      const [y0, y1] = nord ? [m.porte.y + 1, P.milieu[m.porte.x]] : [P.milieu[m.porte.x], m.porte.y];
      for (let y = y0; y <= y1; y++) assert(P.coins[y][m.porte.x] && P.coins[y][m.porte.x + 1], `${g} ${m.nom} : allée rangée ${y}`);
      for (const p of P.maisons.slice(0, i)) {
        assert(p.x + p.w < m.x || m.x + m.w < p.x || p.y + p.h < m.y || m.y + m.h < p.y, `${g} : les maisons ne se touchent pas`);
      }
    });
    // réparties : des deux côtés du chemin, de l'ouest à l'est
    assert(new Set(P.maisons.map((m) => m.sens)).size === 2, `${g} : au nord et au sud du chemin`);
    assert(P.maisons[0].x < TRANSITION.OUEST / 3 && P.maisons[P.maisons.length - 1].x > TRANSITION.OUEST / 2, `${g} : sur toute la largeur`);
  }
});

test('transition : les ressources du jour sont sur l\'herbe libre, et changent d\'un jour à l\'autre', () => {
  const P = transitionPlan('77');
  const r1 = ressourcesDuJour('77', 1), r2 = ressourcesDuJour('77', 2);
  assertEqual(r1.length, TRANSITION.RESSOURCES);
  assertEqual(JSON.stringify(r1), JSON.stringify(ressourcesDuJour('77', 1)));
  assert(JSON.stringify(r1) !== JSON.stringify(r2), 'un autre jour, d\'autres places');
  assertEqual(new Set(r1.map((r) => r.id)).size, r1.length, 'pas deux sur la même case');
  for (const r of r1) {
    assert(TRANSITION.SORTES.includes(r.sorte), r.sorte);
    assert(P.libres[Math.floor(r.y / 16)][Math.floor(r.x / 16)], `${r.id} : sur une case libre`);
    assert(r.x < TRANSITION.OUEST * 16, `${r.id} : à l'ouest`);
  }
});

test('transition : la graine de la partie (ferme générée, sinon celle des voisins)', () => {
  const s = createNewGame(4242);
  assertEqual(transitionSeed(s), '4242');
  setFarmSeed(s, 'pré');
  assertEqual(transitionSeed(s), 'pré');
  assertEqual(transitionSeed({}), '1', 'une partie sans graine : la carte par défaut');
});

test('transition : le joueur ramasse une ressource du jour, une fois, contre l\'énergie du geste', () => {
  const s = createNewGame(4242);
  const [r] = ressourcesDuJour(transitionSeed(s), s.day);
  const item = TRANSITION.OBJETS[r.sorte], avant = countItem(s, item), e = s.energie;
  assertEqual(ramasserTransition(s, r.id), { ok: true, item, n: 1 });
  assertEqual(countItem(s, item), avant + 1);
  assert(s.energie < e, 'de l\'énergie dépensée');
  assertEqual(transitionPris(s), [r.id]);
  assertEqual(ramasserTransition(s, r.id).ok, false, 'pas deux fois');
  assertEqual(ramasserTransition(s, 'herbe:999,999').ok, false, 'pas une ressource du jour');
  s.energie = 0;
  const [, r2] = ressourcesDuJour(transitionSeed(s), s.day);
  assertEqual(ramasserTransition(s, r2.id).ok, false, 'épuisé');
  s.day += 1;
  assertEqual(transitionPris(s), [], 'un autre jour : tout est à reprendre');
  assert(DATA.OBJETS[item]);
});
