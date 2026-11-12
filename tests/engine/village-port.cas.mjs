/* ==========================================================================
   Tests du chantier « l'île à bâtir » : le port sur l'île (docs/ile.md, fiche I1a). Comme tous les fichiers
   tests/engine/village-*.test.mjs, ils tournent avec VILLAGE.ACTIF forcé à true (tests/engine/aide.mjs).
   Joués en quatre parties, en parallèle (village-port-<k>.test.mjs posent globalThis.PARTIE_TESTS = [k, n]) :
   seuls les tests de rang k modulo n se jouent dans la partie k. Le lot de 50 graines y est réparti.
   Lancer : node tests/run-tests.mjs village-port
   ========================================================================== */

import { test as testNode } from 'node:test';
import {
  BIOME, caseMarchable, champsDuMonde, choisirBut, contenuPort, contexteSol, createNewGame, DATA, elementsDuMonde, elementsSol, etatBoussole,
  farmTerrain, genererMonde, lieuxDeLaCarte, niveauPort, planDuMonde, plansDesHameaux, releve, solDirect,
} from '../../js/engine/index.js';
import { assert, assertEqual, avecVillage } from './aide.mjs';

const PARTIE = globalThis.PARTIE_TESTS;
let rangTest = 0;
const test = (...args) => (PARTIE && rangTest++ % PARTIE[1] !== PARTIE[0] ? undefined : testNode(...args));

const PP = DATA.PORT.PLAN;
const FERMES = new Set(['mer', 'lac', 'falaise', 'sommet'].map((b) => BIOME[b]));

// Le monde de la graine g avec son port (niveau n) : son cadre, ses éléments, le plan bâti des hameaux et du port.
function mondeAvecPort(g, n = 1) {
  const cadre = genererMonde(g, n).terrain.MONDE.cadre, lire = releve(champsDuMonde(g, cadre), cadre);
  const el = elementsDuMonde(g, cadre, lire);
  return { cadre, el, lire, port: el.lieux.port };
}

// Un port plausible : sur la côte, hors de la ferme, son chemin d'une case à sa voisine depuis la sortie de la
// ferme jusqu'à lui, sans mer, lac, falaise, sommet ni montagne ; rien ne le chevauche (les hameaux, les bâtisses,
// les autres lieux ; `bati` : avec le plan bâti des hameaux et du port, plus long à faire : une graine sur cinq).
function verifierPort(g, bati) {
  const { cadre, el, lire, port } = mondeAvecPort(g);
  const W = cadre.LARGEUR, F = cadre.FERME;
  assert(port, `${g} : un port`);
  const b = (i) => (el.eaux[i] !== 255 ? el.eaux[i] : lire.biome(i));
  const x = port.case % W, y = Math.floor(port.case / W);
  assert([BIOME.plage, BIOME.prairie, BIOME.lande, BIOME.foret].includes(b(port.case)), `${g} : sur la terre`);
  assert(port.sens === 1 || port.sens === 3, `${g} : vers le sud ou l'est`);
  assertEqual(b(port.sens === 1 ? port.case + W : port.case + 1), BIOME.mer, `${g} : la mer devant`);
  for (const i of port.quai) assertEqual(b(i), BIOME.mer, `${g} : le quai sur la mer`);
  assertEqual(port.quai.length, 2 * PP.QUAI, `${g} : le quai du niveau 5`);
  const dx = Math.max(F.X - x, 0, x - (F.X + F.LARGEUR - 1)), dy = Math.max(F.Y - y, 0, y - (F.Y + F.HAUTEUR - 1));
  assert(Math.hypot(dx, dy) >= PP.FERME, `${g} : loin de la ferme`);
  // le chemin
  const ch = port.chemin;
  assert(ch.length > 10, `${g} : un chemin`);
  assertEqual(ch[0], cadre.SORTIE, `${g} : le chemin part de la sortie de la ferme`);
  assertEqual(ch[ch.length - 1], port.case, `${g} : le chemin arrive au port`);
  for (let k = 1; k < ch.length; k++) {
    const d = Math.abs(ch[k] - ch[k - 1]);
    assert(d === 1 || d === W, `${g} : le chemin va de case en case`);
    assert(!FERMES.has(b(ch[k])), `${g} : le chemin ne passe ni l'eau ni la falaise (${ch[k]})`);
    assert(b(ch[k]) !== BIOME.montagne, `${g} : le chemin ne passe pas la montagne`);
  }
  // rien ne le chevauche
  const lieux = [...el.lieux.grottes, ...el.lieux.peche, ...el.lieux.recit, ...el.lieux.secrets];
  for (const l of lieux) {
    const lx = l.case % W, ly = Math.floor(l.case / W);
    assert(Math.hypot(lx - x, ly - y) >= PP.LIEUX / 3, `${g} : loin de ${l.id}`);
  }
  for (const h of el.lieux.hameaux) assert(Math.hypot((h.case % W) - x, Math.floor(h.case / W) - y) >= PP.HAMEAU, `${g} : loin du hameau ${h.id}`);
  if (!bati) return port;
  const chemins = new Uint8Array(W * cadre.HAUTEUR);
  for (const c of [...el.chemins, port.chemin]) for (const i of c) chemins[i] = 1;
  const m = { graine: g, W, H: cadre.HAUTEUR, F, lieux: el.lieux, chemins, biome: b, niveauPort: 5 };
  const H = plansDesHameaux(m), k = H.plans.findIndex((p) => p.id === 'port');
  assert(k >= 0, `${g} : le plan du port`);
  const autres = new Set();
  H.plans.forEach((p, j) => { if (j !== k) for (let yy = p.cadre.y0; yy <= p.cadre.y1; yy++) for (let xx = p.cadre.x0; xx <= p.cadre.x1; xx++) autres.add(yy * W + xx); });
  const c = H.plans[k].cadre;
  for (let yy = c.y0; yy <= c.y1; yy++) for (let xx = c.x0; xx <= c.x1; xx++) assert(!autres.has(yy * W + xx), `${g} : le port ne chevauche aucun hameau ni bâtisse`);
  return port;
}

// Le lot de 50 graines, en dix tests de cinq (répartis entre les parties)
for (let lot = 0; lot < 10; lot++) {
  test(`un port plausible pour les graines ${lot * 5 + 1} à ${lot * 5 + 5}`, () => {
    for (let n = 1; n <= 5; n++) verifierPort('port-' + (lot * 5 + n), n === 1);
  });
}

test('le port est le même dans le Worker et en calcul direct, et le même plan de la graine à chaque fois', () => {
  const g = 'port-direct', M = genererMonde(g, 1).terrain.MONDE;
  const ctx = contexteSol(M.graine, M.cadre, M.ferme, M.taille);   // (ce que fait js/monde-worker.js)
  elementsSol(ctx);
  const direct = planDuMonde(g, 1).lieux.port;
  assertEqual(ctx.elements.lieux.port, direct, 'le Worker et fairePlan');
  assertEqual(mondeAvecPort(g).port, direct, 'elementsDuMonde');
  assert(ctx.hameaux.plans.some((p) => p.id === 'port' && p.batisse === 'port'), 'le port est bâti avec les hameaux');
});

test('le port ne déplace rien d\'autre dans le plan', () => {
  const g = 'port-rien', c0 = genererMonde(g).terrain.MONDE.cadre;
  const sans = elementsDuMonde(g, c0), avec = elementsDuMonde(g, { ...c0, PORT: 1 });
  assertEqual(sans.lieux.port, undefined, 'sans le cadre PORT, pas de port');
  const { port, ...lieux } = avec.lieux;
  assert(port, 'un port');
  assertEqual(lieux, sans.lieux, 'les autres lieux ne bougent pas');
  assertEqual(avec.chemins, sans.chemins, 'les chemins non plus (celui du port est à part : la calèche ne le suit pas)');
  assertEqual(avec.rivieres, sans.rivieres, 'ni les rivières');
  assertEqual([...avec.eaux], [...sans.eaux], 'ni les eaux');
});

test('le réglage éteint : le monde d\'avant, sans port', () => {
  avecVillage(() => {
    const s = createNewGame(41);
    assertEqual(niveauPort(s), 0, 'pas de port');
    const T = farmTerrain(s);
    assert(T === genererMonde(s.carte.graine).terrain, 'le terrain du monde d\'avant, le même objet');
    assertEqual(T.MONDE.cadre.PORT, undefined, 'pas de port dans le cadre');
    assertEqual(planDuMonde(s.carte.graine).lieux.port, undefined, 'pas de port dans le plan');
  }, false);
});

test('le réglage allumé : la partie a son port, le même terrain', () => {
  const s = createNewGame(42);
  assertEqual(niveauPort(s), DATA.PORT.NIVEAU_DEPART, 'le niveau de départ');
  const T = farmTerrain(s), T0 = genererMonde(s.carte.graine).terrain;
  assertEqual(T.MONDE.cadre.PORT, 1, 'le cadre porte le port');
  assert(T.LIGNES === T0.LIGNES && T.FERME === T0.FERME, 'la ferme et son terrain : les mêmes');
  assert(T.MONDE.cle !== T0.MONDE.cle, 'deux mondes à part pour les sols gardés');
  s.port = { niveau: 9 };
  assertEqual(niveauPort(s), 5, 'au plus le niveau 5');
});

test('les niveaux : le quai s\'allonge, le niveau 1 n\'a que le quai court, la halle et le panneau', () => {
  const n1 = contenuPort(1), n5 = contenuPort(5);
  assertEqual(n1.quai, 8);
  assertEqual(n5.quai, PP.QUAI);
  assert(n1.ajoute.has('halle') && n1.ajoute.has('panneau') && !n1.ajoute.has('caisses') && !n1.ajoute.has('mat'), 'le niveau 1');
  assert(n5.ajoute.has('caisses') && n5.ajoute.has('tonneaux') && n5.ajoute.has('mat'), 'le niveau 5');
});

test('on marche sur le quai et la cale ; on bute sur le comptoir, les poteaux, les lanternes', () => {
  const g = 'port-marche', T = genererMonde(g, 1).terrain, S = solDirect(T);
  const N = T.MONDE.taille, W = T.LARGEUR;
  const p = (() => { S.region(0, 0); return S.ctx.hameaux.plans.find((q) => q.id === 'port'); })();
  assert(p, 'le plan du port');
  const H = S.ctx.hameaux;
  for (const i of p.quai) S.region(Math.floor((i % W) / N), Math.floor(Math.floor(i / W) / N));
  const libres = p.quai.filter((i) => !H.bloque[i]);
  assertEqual(p.quai.length, 16, 'le quai du niveau 1 : 8 cases sur 2');
  assert(libres.length >= 14, 'le quai, presque tout libre');
  for (const i of libres) assert(caseMarchable(T, i, S), 'on marche sur le quai');
  const bloques = [];
  for (let y = p.cadre.y0; y <= p.cadre.y1; y++) for (let x = p.cadre.x0; x <= p.cadre.x1; x++) if (H.bloque[y * W + x]) bloques.push(y * W + x);
  assert(bloques.length >= 4 + 3 + 1 + 1 + 2, 'les poteaux, le comptoir, la balance, le panneau, les lanternes ferment leur case');
  for (const i of bloques) assert(!caseMarchable(T, i, S), 'on bute dessus');
  assertEqual(p.lanternes.length, 2, 'deux lanternes');
  assert(p.maisons[0].dedans.length === PP.HALLE[0] * PP.HALLE[1], 'la halle : toutes ses cases dedans (son toit s\'efface)');
  // le chemin mène à pied de la sortie de la ferme au pied du quai
  const port = S.ctx.elements.lieux.port;
  for (const i of port.chemin) S.region(Math.floor((i % W) / N), Math.floor(Math.floor(i / W) / N));
  for (const i of port.chemin) assert(caseMarchable(T, i, S), `on marche sur le chemin du port (${i})`);
});

test('le port est connu dès le départ : la carte du monde le montre, la boussole y mène', () => {
  const s = createNewGame(43), T = farmTerrain(s);
  const lieux = planDuMonde(s.carte.graine, niveauPort(s)).lieux;
  const L = lieuxDeLaCarte(s, lieux, T);
  assertEqual(L.port.length, 1, 'le port sur la carte, sans être vu');
  assertEqual(L.port[0].nom, DATA.PORT.NOM);
  assert(L.port[0].chemin.length > 10, 'son chemin aussi');
  assert(choisirBut(s, { sorte: 'port', id: 'port' }, lieux).ok, 'la boussole y mène');
  const W = T.LARGEUR, F = T.FERME;
  const b = etatBoussole(s, F.X + 2, F.Y + 2, lieux, null, T);
  assertEqual(b.sorte, 'port');
  assertEqual(b.x, (lieux.port.case % W) + 0.5);
  avecVillage(() => assertEqual(lieuxDeLaCarte(s, { hameaux: [], peche: [] }, T).port, undefined, 'sans port, rien de plus'), false);
});
