/* ==========================================================================
   Tests du chantier « l'île à bâtir » : l'île sans hameau, sans calèche ni boucle de chemins (docs/ile.md, fiche
   I7e). Comme tous les fichiers tests/engine/village-*.test.mjs, ils tournent avec VILLAGE.ACTIF forcé à true.
   Joués en quatre parties, en parallèle (village-monde-<k>.test.mjs posent globalThis.PARTIE_TESTS = [k, n]) ; le
   lot de 50 graines y est réparti.
   - sur 50 graines (celles de tests/engine/ile-monde-temoins.json, relevées sur le plan d'avant I7e) : le plan de
     l'île n'a ni hameau ni boucle ; le chemin du port va de la sortie de la ferme au port, d'une case à sa voisine,
     sans eau ni falaise ; les eaux, les rivières, les lacs, les entrées de grotte, les coins de pêche, les lieux du
     récit, les secrets, le port, son chemin et le tronçon du joueur sont ceux du plan d'avant, à la graine près ;
   - le Web Worker et le calcul direct donnent le même monde (les lieux, les plans bâtis, le tronçon, les régions),
     sans tournée de calèche ;
   - là où se tenait un hameau, la nature de son biome a repris (des plantes, comme autour) ;
   - éteint, le monde d'avant : ses hameaux, ses boucles, sa calèche.
   Lancer : node tests/run-tests.mjs village-monde
   ========================================================================== */

import { test as testNode } from 'node:test';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  BIOME, biomesDeRegion, champsDuMonde, contexteSol, createNewGame, elementsDuMonde, elementsSol, farmTerrain, genererMonde,
  lieuxDeLaCarte, MONDE, planDuMonde, poserCheminsSol, solDirect, solDeRegion, toutVoir, tronconDuPort,
} from '../../js/engine/index.js';
import { tourneeDe, tourneeDuMonde } from '../../js/engine/caleche.js';
import { habitantsDe } from '../../js/engine/habitants.js';
import { assert, assertEqual, avecVillage } from './aide.mjs';

const PARTIE = globalThis.PARTIE_TESTS;
let rangTest = 0;
const test = (...args) => (PARTIE && rangTest++ % PARTIE[1] !== PARTIE[0] ? undefined : testNode(...args));

const ICI = dirname(fileURLToPath(import.meta.url));
const TEMOINS = JSON.parse(readFileSync(join(ICI, 'ile-monde-temoins.json'), 'utf8'));
const GRAINES = Object.keys(TEMOINS).filter((g) => !g.startsWith('//'));
// (l'empreinte des témoins : sha1 d'une chaîne, ou des octets d'un tableau typé ; 16 chiffres)
const empreinte = (x) => createHash('sha1').update(typeof x === 'string' ? x : Buffer.from(x.buffer, x.byteOffset, x.byteLength)).digest('hex').slice(0, 16);
const FERMES = new Set(['mer', 'lac', 'falaise', 'sommet'].map((b) => BIOME[b]));

// Le monde de l'île de la graine g (le port au niveau 1), comme le Worker le fait : son contexte, ses éléments, le
// tronçon du joueur à convertir.
function ile(g) {
  const M = genererMonde(g, 1).terrain.MONDE;
  const ctx = contexteSol(M.graine, M.cadre, M.ferme, M.taille);
  poserCheminsSol(ctx, { troncon: 'a_poser', cases: [] });
  elementsSol(ctx);
  return { M, ctx, el: ctx.elements, troncon: ctx.tronconPose };
}

function verifierGraine(g) {
  const t = TEMOINS[g], { M, ctx, el, troncon } = ile(g), L = el.lieux, W = M.cadre.LARGEUR;
  // ni hameau ni boucle ; les plans bâtis : le port et les bâtisses du récit, rien d'autre
  assertEqual(L.hameaux, [], `${g} : aucun hameau`);
  assertEqual(el.chemins, [], `${g} : aucune boucle de chemins`);
  assert(ctx.hameaux.plans.every((p) => p.batisse), `${g} : aucun plan de hameau bâti`);
  // les lieux d'avant, à la graine près
  const avant = {
    eaux: empreinte(el.eaux), rivieres: empreinte(JSON.stringify(el.rivieres)), lacs: empreinte(JSON.stringify(el.lacs)),
    grottes: empreinte(JSON.stringify(L.grottes)), peche: empreinte(JSON.stringify(L.peche)), recit: empreinte(JSON.stringify(L.recit)),
    secrets: empreinte(JSON.stringify(L.secrets)),
  };
  for (const k of Object.keys(avant)) assertEqual(avant[k], t[k], `${g} : ${k} comme avant`);
  // le port et son chemin, le tronçon du joueur
  const p = L.port;
  assert(p, `${g} : un port`);
  assertEqual({ case: p.case, sens: p.sens, prix: p.prix, chemin: empreinte(JSON.stringify(p.chemin)), n: p.chemin.length }, t.port, `${g} : le port à sa case, son chemin`);
  assertEqual({ troncon: empreinte(JSON.stringify(troncon)), ntroncon: troncon.length }, { troncon: t.troncon, ntroncon: t.ntroncon }, `${g} : le tronçon du joueur`);
  // la ferme et le port reliés : de la sortie au port, d'une case à sa voisine, sans eau profonde, falaise ni sommet
  assertEqual(p.chemin[0], M.cadre.SORTIE, `${g} : le chemin part de la sortie de la ferme`);
  assertEqual(p.chemin[p.chemin.length - 1], p.case, `${g} : il arrive au port`);
  const b = (i) => (el.eaux[i] !== 255 ? el.eaux[i] : ctx.lire.biome(i));
  for (let k = 1; k < p.chemin.length; k++) {
    const a = p.chemin[k - 1], c = p.chemin[k];
    assertEqual(Math.abs((a % W) - (c % W)) + Math.abs(Math.floor(a / W) - Math.floor(c / W)), 1, `${g} : le chemin va d'une case à sa voisine`);
    assert(!FERMES.has(b(c)), `${g} : ni mer, ni lac, ni falaise, ni sommet sur le chemin`);
  }
  // le chemin se peint et se marche (le tronçon posé) ; rien d'autre n'est peint en chemin hors de lui
  assert(troncon.length >= p.chemin.length, `${g} : le tronçon couvre le chemin`);
  return { M, ctx };
}

// Le lot de 50 graines, en dix tests de cinq (répartis entre les parties).
for (let lot = 0; lot < 10; lot++) {
  test(`l'île sans hameau ni boucle, le reste du monde d'avant : graines ${lot * 5 + 1} à ${lot * 5 + 5}`, () => {
    for (const g of GRAINES.slice(lot * 5, lot * 5 + 5)) verifierGraine(g);
  });
}

test('les témoins : 50 graines, chacune son port', () => {
  assertEqual(GRAINES.length, 50, '50 graines');
  assert(GRAINES.every((g) => TEMOINS[g].port && TEMOINS[g].port.n > 10), 'un port et son chemin pour chacune');
});

test('les biomes et le relief : ceux du monde d\'avant (les champs ne lisent pas les hameaux)', () => {
  const g = GRAINES[3], c0 = genererMonde(g).terrain.MONDE.cadre, c1 = { ...c0, PORT: 1 };
  const avant = elementsDuMonde(g, c0), apres = elementsDuMonde(g, c1);
  const ch0 = champsDuMonde(g, c0), ch1 = champsDuMonde(g, c1);
  for (const [rx, ry] of [[0, 0], [3, 2], [5, 4], [8, 6], [9, 7]]) {
    assertEqual([...biomesDeRegion(ch1, apres, c1, rx, ry, MONDE.REGION)].join(), [...biomesDeRegion(ch0, avant, c0, rx, ry, MONDE.REGION)].join(), `la région ${rx},${ry}`);
  }
  assert(avant.lieux.hameaux.length >= 3 && avant.chemins.length >= 3, 'le monde d\'avant a ses hameaux et ses boucles');
});

test('le Web Worker et le calcul direct : le même monde de l\'île, sans tournée de calèche', async () => {
  const g = GRAINES[7], T = genererMonde(g, 1).terrain, M = T.MONDE;
  const direct = ile(g);
  const recus = [];
  globalThis.self = { postMessage: (msg) => recus.push(msg) };
  try {
    await import('../../js/monde-worker.js?ile');
    const attendre = async (f) => { for (let k = 0; k < 1200 && !f(); k++) await new Promise((ok) => setTimeout(ok, 10)); };
    self.onmessage({ data: { type: 'init', graine: M.graine, cadre: M.cadre, ferme: M.ferme, taille: M.taille, chemins: { troncon: 'a_poser', cases: [] } } });
    const p = direct.el.lieux.port, N = M.taille;
    const rx = Math.floor((p.case % M.cadre.LARGEUR) / N), ry = Math.floor(Math.floor(p.case / M.cadre.LARGEUR) / N);
    self.onmessage({ data: { type: 'region', rx, ry } });
    await attendre(() => recus.some((r) => r.type === 'region'));
    const pret = recus.find((r) => r.type === 'pret');
    assert(pret, 'le Worker est prêt');
    assertEqual(pret.tournee, null, 'pas de tournée de calèche');
    assertEqual(JSON.stringify(structuredClone(pret.lieux)), JSON.stringify(direct.el.lieux), 'les lieux');
    assertEqual(JSON.stringify(structuredClone(pret.hameaux)), JSON.stringify(direct.ctx.hameaux.plans), 'les plans bâtis : le port et les bâtisses');
    assertEqual(pret.troncon, direct.troncon, 'le tronçon du joueur');
    const r = recus.find((x) => x.type === 'region').region, d = solDeRegion(direct.ctx, rx, ry);
    for (const k of ['couches', 'marche']) assertEqual([...r[k]].join(), [...d[k]].join(), `la région du port : ${k}`);
    for (const k of ['vegetation', 'roches', 'hameau']) {
      assertEqual([...r[k].images].join(), [...d[k].images].join(), `la région du port : ${k} (images)`);
      assertEqual([...r[k].basses].join(), [...d[k].basses].join(), `la région du port : ${k} (basses)`);
    }
  } finally {
    delete globalThis.self;
  }
});

// Les plantes (images et petites) dont le pied est à moins de r cases de (cx, cy), et entre r et 2r : [dedans, autour],
// rapportés à leur surface.
function densites(sol, cx, cy, r) {
  const N = MONDE.REGION, W = MONDE.LARGEUR, H = MONDE.HAUTEUR;
  let dedans = 0, autour = 0, sd = 0, sa = 0;
  const vus = new Set();
  for (let ry = Math.max(0, Math.floor((cy - 2 * r) / N)); ry <= Math.min(Math.ceil(H / N) - 1, Math.floor((cy + 2 * r) / N)); ry++) {
    for (let rx = Math.max(0, Math.floor((cx - 2 * r) / N)); rx <= Math.min(Math.ceil(W / N) - 1, Math.floor((cx + 2 * r) / N)); rx++) {
      const reg = sol.region(rx, ry);
      for (const liste of [reg.vegetation.images, reg.vegetation.basses]) {
        for (let k = 0; k < liste.length; k += 4) {
          const x = Math.floor(liste[k + 1] / 16), y = Math.floor((liste[k + 2] - 1) / 16), cle = `${liste[k]}:${liste[k + 1]},${liste[k + 2]}`;
          if (vus.has(cle)) continue;
          vus.add(cle);
          const d = Math.hypot(x - cx, y - cy);
          if (d <= r) dedans++; else if (d <= 2 * r) autour++;
        }
      }
    }
  }
  for (let y = cy - 2 * r; y <= cy + 2 * r; y++) for (let x = cx - 2 * r; x <= cx + 2 * r; x++) { const d = Math.hypot(x - cx, y - cy); if (d <= r) sd++; else if (d <= 2 * r) sa++; }
  return [dedans / sd, autour / sa];
}

test('la place d\'un ancien hameau : la nature de son biome a repris, ni trou ni clairière', () => {
  const g = GRAINES[11];
  const avant = solDirect(genererMonde(g).terrain), apres = solDirect(genererMonde(g, 1).terrain);
  elementsSol(avant.ctx); elementsSol(apres.ctx);
  const R = 6;   // (VEGETATION.LIEUX.hameaux : ce qui était réservé autour de la case d'un hameau)
  let repris = 0, vides = 0;
  const notes = [];
  for (const h of avant.ctx.elements.lieux.hameaux) {
    const cx = h.case % MONDE.LARGEUR, cy = Math.floor(h.case / MONDE.LARGEUR);
    const [d0] = densites(avant, cx, cy, R), [d1, a1] = densites(apres, cx, cy, R);
    // (avant : la place réservée et les maisons, presque rien ; après : autant de plantes qu'autour, à peu près)
    notes.push(`${h.nom} : avant ${d0.toFixed(3)}, après ${d1.toFixed(3)}, autour ${a1.toFixed(3)}`);
    if (d1 > d0 && d1 >= a1 * 0.5) repris++;
    if (d1 === 0 && a1 > 0) vides++;
    // (rien du hameau n'est bâti : ni maison, ni terre battue)
    const reg = apres.region(Math.floor(cx / MONDE.REGION), Math.floor(cy / MONDE.REGION));
    assertEqual(reg.hameau.images.length, 0, `${h.nom} : rien de bâti`);
    assert(!apres.ctx.hameaux.terre[h.case], `${h.nom} : pas de terre battue`);
  }
  assert(avant.ctx.elements.lieux.hameaux.length >= 3, 'des hameaux dans le monde d\'avant');
  assertEqual(vides, 0, `aucune place vide (${notes.join(' ; ')})`);
  assert(repris >= avant.ctx.elements.lieux.hameaux.length - 1, `la nature reprend (${notes.join(' ; ')})`);
});

test('une partie de l\'île : ni hameau sur la carte du monde, ni calèche, ni habitant', () => {
  const s = createNewGame(GRAINES[2]);
  toutVoir(s);
  const T = farmTerrain(s), lieux = planDuMonde(s.carte.graine, 1).lieux;
  const L = lieuxDeLaCarte(s, lieux, T);
  assertEqual(L.hameaux, [], 'aucun hameau sur la carte, tout vu');
  assert(L.port && L.port.length === 1 && L.peche.length > 0, 'le port et les coins de pêche, eux, y sont');
  tourneeDuMonde(s.carte.graine);   // (même posée par un monde d'avant de la même graine)
  assertEqual(tourneeDe(s), null, 'pas de calèche');
  assertEqual(habitantsDe(s), {}, 'aucun habitant de hameau');
});

test('éteint : le monde d\'avant, ses hameaux, ses boucles, sa calèche', () => {
  avecVillage(() => {
    const s = createNewGame(GRAINES[4]);
    const plan = planDuMonde(s.carte.graine);
    assert(plan.lieux.hameaux.length >= 3, 'des hameaux');
    assert(plan.chemins.length >= 3, 'des boucles');
    assertEqual(plan.lieux.port, undefined, 'pas de port');
    tourneeDuMonde(s.carte.graine);
    assert(tourneeDe(s) && tourneeDe(s).arrets.some((a) => a.sorte === 'hameau'), 'la calèche fait sa tournée');
  }, false);
});
