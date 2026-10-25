/* ==========================================================================
   Tests du moteur : les grottes de la montagne, la pêche dans le monde et les bêtes du grand monde
   (fiche 6b : js/engine/grotte.js, monde-lieux.js, monde-faune.js, outils.js castLine).
   - les grottes : chaque entrée du plan a sa bouche (ses cases fermées, la case devant ouverte) et
     mène à une grotte jouable (l'échelle, le puits, du minerai dans les murs, des pierres) ; les
     niveaux sont déterministes (même entrée, même jour : même grotte) ; la mine de la ferme ne
     change pas (une empreinte de ses niveaux, prise avant la fiche) ; le quartz et l'améthyste se
     piochent ;
   - la pêche : chaque eau du monde a ses poissons ; les coins de pêche ont leurs chances (un poisson
     plus rare), leurs prises du jour, comptées à part de leur eau ; la limite par jour ; un ponton
     s'avance sur l'eau et ouvre ses cases ;
   - les bêtes : posées de façon déterministe (l'ordre des régions n'y change rien), jamais sur la
     ferme ni sur une case interdite à leur espèce, pas trop nombreuses ; chaque espèce a son dessin
     et sa page de l'encyclopédie, qui se découvre quand on en voit une.
   La sauvegarde ne change pas de forme (les prises du jour : state.outils.peche, déjà là ; les bêtes
   vues : state.encyclopedie.evenements) : pas de migration.
   Lancer seul : node --test tests/engine/grottes-peche-faune.test.mjs (ou node tests/run-tests.mjs grottes).
   ========================================================================== */

import { existsSync, readFileSync } from 'node:fs';
import {
  BIOMES, caseMarchable, castLine, conditionRemplie, contexteSol, countItem, DATA, elementsSol, entreeEncyclopedie,
  fishLeft, genererMonde, genererNiveau, idGrotteMonde, mineOre, MONDE, nomSolDeCase, poidsGrotte, reglagesGrotte,
  solDeRegion, solDirect, STATE_VERSION,
} from '../../js/engine/index.js';
import { LIEUX, pontonDe, SORTE_LIEU } from '../../js/engine/monde-lieux.js';
import { casePermise, ESPECES_FAUNE, FAUNE } from '../../js/engine/monde-faune.js';
import { assert, assertEqual, garden, sleepOnce, test } from './aide.mjs';

const W = MONDE.LARGEUR, H = MONDE.HAUTEUR, N = MONDE.REGION;
const GRAINES = ['grottes-1', 'grottes-2'];

// Un monde : son terrain, son sol (calcul direct), ses éléments (les lieux du plan).
const mondes = new Map();
function monde(graine) {
  if (!mondes.has(graine)) {
    const T = genererMonde(graine).terrain, sol = solDirect(T);
    elementsSol(sol.ctx);
    mondes.set(graine, { T, sol, ctx: sol.ctx, lieux: sol.ctx.elements.lieux });
  }
  return mondes.get(graine);
}
const regionDe = (m, i) => m.sol.region(Math.floor((i % W) / N), Math.floor(Math.floor(i / W) / N));
const biomeCase = (m, i) => { const r = regionDe(m, i), c = i % W, y = Math.floor(i / W); return BIOMES[r.biome[(y - r.cy0) * r.cl + c - r.cx0]]; };

// Peut-on aller de l'échelle au puits (au sol, 4-voisins) ?
function relie(c, a, b) {
  const vu = new Uint8Array(c.W * c.H), q = [a.y * c.W + a.x];
  vu[q[0]] = 1;
  for (let k = 0; k < q.length; k++) {
    const i = q[k], x = i % c.W, y = Math.floor(i / c.W);
    if (x === b.x && y === b.y) return true;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const j = (y + dy) * c.W + x + dx;
      if (c.sol(x + dx, y + dy) && !vu[j]) { vu[j] = 1; q.push(j); }
    }
  }
  return false;
}

/* ---------- les grottes ---------- */

test('les grottes : la mine de la ferme ne change pas (ses réglages, ses niveaux d\'avant la fiche 6b)', () => {
  const J = reglagesGrotte('ferme');
  assertEqual([J.id, J.monde, J.filon, J.NIVEAUX, Object.keys(J.POIDS)], ['ferme', '', null, DATA.GROTTE.NIVEAUX, ['fer', 'cuivre', 'or', 'platine']]);
  assertEqual(reglagesGrotte('n-importe-quoi').id, 'ferme', 'une entrée inconnue : la mine');
  // (l'empreinte de trois niveaux, prise avec le tirage de js/grotte.js d'avant la fiche)
  let h = 2166136261;
  const mix = (t) => { for (let i = 0; i < t.length; i++) { h ^= t.charCodeAt(i); h = Math.imul(h, 16777619); } };
  for (const [n, j] of [[1, 1], [4, 7], [8, 30]]) {
    const c = genererNiveau(J, n, j);
    mix(JSON.stringify({ g: [...c.g].join(''), e: c.echelle, p: c.puits, o: c.ores, d: c.decor, s: c.stalag }));
  }
  assertEqual((h >>> 0).toString(16), '8dcae3fb');
});

test('les grottes : chaque entrée du plan a sa bouche dans la montagne, ses cases fermées, la case devant ouverte', () => {
  for (const graine of GRAINES) {
    const m = monde(graine);
    assert(m.lieux.grottes.length >= DATA.PLAN_MONDE.GROTTES.NOMBRE[0], 'des entrées');
    for (const g of m.lieux.grottes) {
      assert(idGrotteMonde(g.id) === g.id, g.id);
      const reg = regionDe(m, g.case), X = g.case % W, Y = Math.floor(g.case / W), im = reg.lieux.images;
      let bouche = false;
      for (let k = 0; k < im.length; k += 4) if (im[k] === SORTE_LIEU.entree_grotte && im[k + 1] === X * 16 + 8 && im[k + 2] === Y * 16 + 14) bouche = true;
      assert(bouche, `la bouche de ${g.id}`);
      assertEqual(biomeCase(m, g.case), 'montagne', g.id);
      for (const [dx, dy] of LIEUX.BLOQUE) assert(!caseMarchable(m.T, g.case + dy * W + dx, m.sol), `${g.id} : la case ${dx},${dy} est fermée`);
      assert(caseMarchable(m.T, g.case + W, m.sol), `${g.id} : on se tient devant`);
    }
  }
});

test('les grottes : chaque grotte du monde est jouable (échelle, puits, minerai et pierres), plus riche que la mine', () => {
  const m = monde(GRAINES[0]);
  const vus = new Set();
  for (const g of m.lieux.grottes) {
    const J = reglagesGrotte(g.id, m.ctx.graine);
    assertEqual([J.id, J.monde, J.NIVEAUX, J.nom], [g.id, m.ctx.graine, DATA.GROTTE.MONDE.NIVEAUX, DATA.GROTTE.MONDE.NOM]);
    assert(Object.keys(DATA.GROTTE.MONDE.FILONS).includes(J.filon), 'un filon');
    for (let n = 1; n <= J.NIVEAUX; n++) {
      const c = genererNiveau(J, n, 3);
      const E = c.echelle;
      assert(!c.sol(E.x, E.y - 1) && c.sol(E.x, E.y) && c.sol(E.x, E.y + 1), `${g.id} ${n} : l'échelle contre un mur`);
      if (n < J.NIVEAUX) assert(c.puits && relie(c, E, c.puits), `${g.id} ${n} : le puits se rejoint`);
      else assertEqual(c.puits, null, 'le dernier niveau n\'a pas de puits');
      for (const o of c.ores) {
        assert(!c.sol(o.x, o.y) && [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => c.sol(o.x + dx, o.y + dy)), 'un minerai dans un mur qui borde le sol');
        vus.add(o.kind);
      }
    }
  }
  for (const k of ['fer', 'cuivre', 'or', 'platine', 'quartz', 'amethyste']) assert(vus.has(k), `on trouve du ${k}`);
  // plus riche : plus de minerai, et l'or plus tôt
  const ferme = reglagesGrotte('ferme'), M = reglagesGrotte('grotte_1', 'x');
  let a = 0, b = 0;
  for (let j = 1; j <= 20; j++) { a += genererNiveau(ferme, 2, j).ores.length; b += genererNiveau(M, 2, j).ores.length; }
  assert(b > a * 1.3, `plus de minerai au niveau 2 (${b} contre ${a})`);
  assertEqual(poidsGrotte(ferme, 1).or, 0);
  assert(poidsGrotte(M, 1).or > 0 && poidsGrotte(M, 2).platine > 0, 'l\'or et le platine dès les premiers niveaux');
});

test('les grottes : déterministes (même entrée, même jour : même grotte ; un autre jour, une autre entrée : une autre)', () => {
  const sig = (c) => [...c.g].join('') + JSON.stringify(c.ores);
  const J = reglagesGrotte('grotte_2', 'abc');
  assertEqual(sig(genererNiveau(J, 2, 5)), sig(genererNiveau(reglagesGrotte('grotte_2', 'abc'), 2, 5)));
  assert(sig(genererNiveau(J, 2, 5)) !== sig(genererNiveau(J, 2, 6)), 'un autre jour');
  assert(sig(genererNiveau(J, 2, 5)) !== sig(genererNiveau(reglagesGrotte('grotte_3', 'abc'), 2, 5)), 'une autre entrée');
  assert(sig(genererNiveau(J, 2, 5)) !== sig(genererNiveau(reglagesGrotte('grotte_2', 'abd'), 2, 5)), 'un autre monde');
  assert(sig(genererNiveau(J, 2, 5)) !== sig(genererNiveau(reglagesGrotte('ferme'), 2, 5)), 'pas la mine');
  assertEqual(reglagesGrotte('grotte_2', 'abc').filon, reglagesGrotte('grotte_2', 'abc').filon);
});

test('les grottes : le quartz et l\'améthyste se piochent (l\'objet lui-même), comme le minerai', () => {
  const s = garden();
  s.outils = { pioche: true, choisi: 'pioche' };
  s.energie = DATA.PERSONNAGE.MAX * 100;
  for (const k of ['quartz', 'amethyste']) {
    const r = mineOre(s, k);
    assert(r.ok, r.error);
    assertEqual(r.item, k);
    assert(countItem(s, k) >= 1, k);
  }
  assertEqual(mineOre(s, 'diamant').error, 'Minerai inconnu.');
});

/* ---------- la pêche ---------- */

test('la pêche : chaque eau du monde (lac, rivière, mer) a ses poissons ; chaque coin du plan, ses chances et un poisson plus rare', () => {
  const C = DATA.CANNE;
  for (const eau of ['lac', 'riviere', 'mer']) {
    assert(C.PRISES[eau] && C.JOUR[eau] > 0, eau);
    const base = C.PRISES[eau], coin = C.COINS.PRISES[eau];
    const total = (t) => Object.values(t).reduce((a, b) => a + b, 0);
    assert(total(coin) > total(base), `${eau} : plus de touches au coin`);
    assert(Object.keys(coin).some((p) => !(p in base)), `${eau} : un poisson rare au coin`);
    assert(C.COINS.JOUR[eau] > C.JOUR[eau], `${eau} : plus de prises par jour au coin`);
    for (const p of Object.keys(coin)) assert(DATA.OBJETS[p] && DATA.OBJETS[p].icone, p);
  }
  for (const graine of GRAINES) for (const p of monde(graine).lieux.peche) assert(C.PRISES[p.eau], `${p.id} : ${p.eau}`);
});

test('la pêche : dans une rivière, au coin, la limite par jour ; le coin se compte à part de son eau ; le lendemain, ça repart', () => {
  const s = garden();
  s.outils = { canne: true, choisi: 'canne' };
  s.energie = DATA.PERSONNAGE.MAX * 1000;
  const C = DATA.CANNE;
  assertEqual(fishLeft(s, 'riviere'), C.JOUR.riviere);
  assertEqual(fishLeft(s, 'riviere', 'peche_3'), C.COINS.JOUR.riviere);
  const prises = new Set();
  for (let i = 0; i < 400 && fishLeft(s, 'riviere', 'peche_3') > 0; i++) {
    const r = castLine(s, 'riviere', 'peche_3');
    assert(r.ok, r.error);
    assertEqual(r.coin, 'peche_3');
    if (r.poisson) prises.add(r.poisson);
  }
  assertEqual(fishLeft(s, 'riviere', 'peche_3'), 0, 'le coin est épuisé');
  assert(castLine(s, 'riviere', 'peche_3').error.includes('Ce coin de pêche'), 'le message du coin');
  assertEqual(fishLeft(s, 'riviere'), C.JOUR.riviere, 'la rivière, elle, donne encore');
  assertEqual(fishLeft(s, 'riviere', 'peche_4'), C.COINS.JOUR.riviere, 'un autre coin aussi');
  assert([...prises].every((p) => p in C.COINS.PRISES.riviere), 'des poissons du coin');
  for (let i = 0; i < 400 && fishLeft(s, 'riviere') > 0; i++) assert(castLine(s, 'riviere').ok);
  assertEqual(fishLeft(s, 'riviere'), 0);
  assert(castLine(s, 'riviere').error.includes('dans les rivières'), 'le message de la rivière');
  assertEqual(fishLeft(s, 'lac'), C.JOUR.lac, 'les lacs se comptent à part');
  // un coin inconnu (ou mal écrit) : l'eau seule
  assertEqual(castLine(s, 'lac', '../x').coin, null);
  sleepOnce(s);
  assertEqual([fishLeft(s, 'riviere'), fishLeft(s, 'riviere', 'peche_3')], [C.JOUR.riviere, C.COINS.JOUR.riviere], 'le lendemain');
  // (la sauvegarde ne change pas de forme : state.outils.peche, { jour, prises })
  assert(Number.isInteger(STATE_VERSION));
});

test('la pêche : un coin de pêche donne mieux (plus de prises, et le poisson rare)', () => {
  const C = DATA.CANNE;
  for (const eau of ['lac', 'riviere', 'mer']) {
    const tire = (coin) => {
      const s = garden();
      s.outils = { canne: true, choisi: 'canne' };
      s.energie = DATA.PERSONNAGE.MAX * 1000;
      let lancers = 0;
      const vus = new Set();
      while (fishLeft(s, eau, coin) > 0 && lancers < 500) { const r = castLine(s, eau, coin); lancers++; if (r.poisson) vus.add(r.poisson); }
      return { prises: coin ? C.COINS.JOUR[eau] - fishLeft(s, eau, coin) : C.JOUR[eau] - fishLeft(s, eau), vus };
    };
    const a = tire(null), b = tire('peche_1');
    assert(b.prises > a.prises, `${eau} : plus de prises au coin (${b.prises} contre ${a.prises})`);
    assert([...b.vus].every((p) => p in C.COINS.PRISES[eau]) && [...a.vus].every((p) => p in C.PRISES[eau]), eau);
  }
});

test('la pêche : un ponton avance sur l\'eau depuis la rive d\'un coin (ses cases s\'ouvrent), sinon des piquets', () => {
  let pontons = 0, piquets = 0;
  for (const graine of GRAINES) {
    const m = monde(graine);
    for (const p of m.lieux.peche) {
      const reg = regionDe(m, p.case), im = reg.lieux.images;
      const bio = (i) => { const v = m.ctx.elements.eaux[i]; return v !== 255 ? v : m.ctx.lire.biome(i); };
      const pt = pontonDe(p, bio, W, H);
      let vu = null;
      for (let k = 0; k < im.length; k += 4) if (im[k] === SORTE_LIEU.ponton || im[k] === SORTE_LIEU.piquets) vu = vu || im[k];
      assert(vu !== null, `${p.id} : son décor`);
      if (pt) {
        pontons++;
        assert(p.eau !== 'riviere', 'pas de ponton sur une rivière');
        assertEqual(pt.cases.length, LIEUX.PONTON);
        for (const i of pt.cases) {
          assertEqual(biomeCase(m, i), p.eau, `${p.id} : sur l'eau`);
          assert(caseMarchable(m.T, i, m.sol), `${p.id} : on marche sur le ponton`);
        }
      } else piquets++;
    }
  }
  assert(pontons > 0 && piquets > 0, `des pontons (${pontons}) et des piquets (${piquets})`);
});

/* ---------- les bêtes ---------- */

const especes = ESPECES_FAUNE.map((cle) => ({ cle, ...FAUNE.ESPECES[cle] }));
// Les bêtes d'une région : [{ e, x, y, i (sa case) }].
function betes(reg) {
  const out = [];
  for (let k = 0; k < reg.faune.length; k += 4) out.push({ e: especes[reg.faune[k]], x: reg.faune[k + 1], y: reg.faune[k + 2], v: reg.faune[k + 3], i: Math.floor(reg.faune[k + 2] / 16) * W + Math.floor(reg.faune[k + 1] / 16) });
  return out;
}

test('les bêtes : posées de façon déterministe (ni l\'ordre des régions, ni un autre calcul n\'y changent rien)', () => {
  const M = genererMonde(GRAINES[1]).terrain.MONDE;
  const a = contexteSol(M.graine, M.cadre, M.ferme, M.taille), b = contexteSol(M.graine, M.cadre, M.ferme, M.taille);
  const liste = [[1, 1], [2, 1], [1, 2], [8, 6], [9, 6], [8, 7], [4, 0], [0, 5]];
  const ra = new Map(), rb = new Map();
  for (const [rx, ry] of liste) ra.set(rx + ',' + ry, [...solDeRegion(a, rx, ry).faune].join(','));
  for (const [rx, ry] of liste.slice().reverse()) rb.set(rx + ',' + ry, [...solDeRegion(b, rx, ry).faune].join(','));
  let n = 0;
  for (const [cle, f] of ra) { assertEqual(rb.get(cle), f, cle); n += f ? f.split(',').length / 4 : 0; }
  assert(n > 20, `des bêtes (${n})`);
});

test('les bêtes : jamais sur la ferme ni sur une case interdite à leur espèce ; pas trop nombreuses ; chaque biome a les siennes', () => {
  const vues = new Map();
  for (const graine of GRAINES) {
    const m = monde(graine), F = m.T.FERME, Fm = FAUNE.FERME;
    for (let ry = 0; ry * N < H; ry++) {
      for (let rx = 0; rx * N < W; rx++) {
        const reg = m.sol.region(rx, ry), liste = betes(reg);
        assert(liste.length <= FAUNE.PAR_REGION, `${rx},${ry} : ${liste.length} bêtes`);
        const marche = (i) => { const c = i % W, r = Math.floor(i / W); return c >= reg.cx0 && r >= reg.cy0 && c < reg.cx0 + reg.cl && r < reg.cy0 + reg.ch && reg.marche[(r - reg.cy0) * reg.cl + c - reg.cx0] === 1; };
        for (const b of liste) {
          const c = b.i % W, r = Math.floor(b.i / W);
          assert(!(c >= F.X - Fm && r >= F.Y - Fm && c < F.X + F.LARGEUR + Fm && r < F.Y + F.HAUTEUR + Fm), `${b.e.cle} sur la ferme`);
          assert(Math.floor(c / N) === rx && Math.floor(r / N) === ry, 'dans sa région');
          assert(casePermise(m.ctx, b.e, b.i, marche, (i) => nomSolDeCase(m.ctx, i)), `${b.e.cle} en ${c},${r} (${biomeCase(m, b.i)})`);
          assert(b.e.biomes.includes(biomeCase(m, b.i)), `${b.e.cle} dans ses biomes`);
          if (b.e.lieu === 'terre') assert(caseMarchable(m.T, b.i, m.sol), `${b.e.cle} : une case où l'on marche`);
          if (b.e.lieu === 'eau') assert(!caseMarchable(m.T, b.i, m.sol) || biomeCase(m, b.i) === 'marais', `${b.e.cle} : sur l'eau`);
          vues.set(b.e.cle, (vues.get(b.e.cle) || 0) + 1);
        }
      }
    }
  }
  for (const e of especes) assert(vues.get(e.cle) > 0, `on voit des ${e.cle}`);
});

test('les bêtes : chaque espèce a son dessin (ses images) et sa page de l\'encyclopédie, découverte quand on en voit une', () => {
  const meta = JSON.parse(readFileSync(new URL('../../assets/faune.json', import.meta.url), 'utf8'));
  for (const e of especes) {
    assert(existsSync(new URL(`../../assets/faune_${e.cle}.png`, import.meta.url)), `assets/faune_${e.cle}.png`);
    const m = meta.especes[e.cle];
    assert(m, `faune.json : ${e.cle}`);
    for (const v of [e.images, ...(e.variantes || [])]) for (const l of Object.values(v)) for (const nom of l) assert(m.frames.includes(nom), `${e.cle} : l'image ${nom}`);
    const page = entreeEncyclopedie('faune_' + e.cle);
    assert(page && page.decouverte.includes('faune:' + e.cle), `la page de ${e.cle}`);
    const s = garden();
    assert(!conditionRemplie(s, 'faune:' + e.cle, {}), 'pas encore vue');
    assert(conditionRemplie(s, 'faune:' + e.cle, { ['faune:' + e.cle]: true }), 'vue');
  }
  assert(entreeEncyclopedie('faune_du_monde'), 'la page de la faune');
  assert(entreeEncyclopedie('grotte_montagne'), 'la page des grottes de la montagne');
});
