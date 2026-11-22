/* ==========================================================================
   Tests du moteur : s'orienter (fiche 8 : js/engine/monde-vu.js, js/engine/monde-carte.js).
   - le vu : marcher découvre ce qui est autour (les cellules de 8 × 8 cases qui touchent le cercle
     de vue) ; la forêt et la nuit voient moins loin, la montagne plus loin ; déterministe ;
   - rien de vu d'office, la ferme comprise (fiche 14b : le cercle de vue autour de la case de départ),
     mais ses régions restent vues pour le moteur ; les anciennes parties gardent leur ferme vue ; les
     régions vues déduites ;
   - la sauvegarde compacte (864 caractères, quel que soit le voyage) et la migration v57 → v58
     (les régions déjà vues deviennent vues en entier) ;
   - la carte n'expose rien de non vu (les lieux pas encore vus en sont absents ; un hameau n'a son
     nom qu'une fois visité) ; l'image du monde, la même par morceaux ou d'un coup ;
   - la boussole : direction, distance, cachée sur la ferme sans but, le but choisi (s'il est vu),
     atteint ;
   - la ferme et le reste du jeu inchangés.
   Lancer seul : node --test tests/engine/monde-vu.test.mjs (ou node tests/run-tests.mjs monde-vu).
   ========================================================================== */

import { readFileSync } from 'node:fs';
import {
  caseDepart, createInitialState, createNewGame, DATA, elementsSol, farmTerrain, migrate, regionDeCase, regionsFerme,
  regionVue, solDirect, STATE_VERSION,
} from '../../js/engine/index.js';
import {
  boussoleMontree, butBoussole, caseVue, cellulesAutour, cellulesFerme, choisirBut, deBase64, DECOUVERTE, directionVers, etatBoussole, grilleVu,
  lieuxDeLaCarte, montrerBoussole, montrerLieu, partVue, rayonVue, toutCacher, toutVoir, versBase64, voirAutour, vuDe, vuDesRegions, vuInitial,
} from '../../js/engine/monde-vu.js';
import { imageDuMonde } from '../../js/engine/monde-carte.js';
import { assert, assertEqual, sleepOnce, test } from './aide.mjs';

const copie = (x) => JSON.parse(JSON.stringify(x));
const partie = (seed = 3) => createInitialState(seed);
// la case (c, r) du terrain de la partie
const caseEn = (s, c, r) => r * farmTerrain(s).LARGEUR + c;
// une case à `d` cases à l'est de la ferme, à mi-hauteur
const aLEst = (s, d) => { const F = farmTerrain(s).FERME; return caseEn(s, F.X + F.LARGEUR + d, F.Y + (F.HAUTEUR >> 1)); };
const nbVues = (s) => Math.round(partVue(s) * grilleVu(farmTerrain(s)).L * grilleVu(farmTerrain(s)).H);

/* ---------- le vu ---------- */

test('le vu : marcher découvre ce qui est autour (le cercle de vue), une fois', () => {
  const s = partie(), T = farmTerrain(s), W = T.LARGEUR;
  const avant = nbVues(s);
  // une marche vers l'est, case par case, de la ferme à 120 cases au-delà
  let nouvelles = 0;
  for (let d = 0; d < 120; d++) nouvelles += voirAutour(s, aLEst(s, d), { biome: 'prairie' });
  assert(nouvelles > 0 && nbVues(s) === avant + nouvelles, 'des cellules nouvelles, comptées');
  const fin = aLEst(s, 119), R = rayonVue('prairie');
  // ce qui est à moins du rayon est vu, ce qui est bien au-delà (le rayon et une cellule) ne l'est pas
  assert(caseVue(s, fin) && caseVue(s, fin - R * W) && caseVue(s, fin + R + 1 - 1), 'à portée : vu');
  assert(!caseVue(s, fin - (R + DECOUVERTE.CELLULE + 1) * W) && !caseVue(s, fin + R + DECOUVERTE.CELLULE + 1), 'au-delà : pas vu');
  // repasser au même endroit ne change rien
  const vu = s.monde.vu;
  assertEqual(voirAutour(s, fin, { biome: 'prairie' }), 0);
  assertEqual(s.monde.vu, vu);
});

test('le vu : la forêt, le marais et la nuit voient moins loin, la montagne plus loin ; déterministe', () => {
  const R = (b, n) => rayonVue(b, n);
  assert(R('foret') < R('prairie') && R('marais') < R('prairie') && R('prairie') < R('lande') && R('lande') < R('montagne') && R('montagne') < R('sommet'), 'les rayons des biomes');
  for (const b of ['prairie', 'foret', 'montagne', null]) assert(R(b, true) < R(b, false) && R(b, true) >= DECOUVERTE.RAYON_MIN, `la nuit (${b})`);
  assertEqual(R('inconnu'), DECOUVERTE.RAYON);
  const vus = (biome, nuit) => { const s = partie(); return voirAutour(s, aLEst(s, 80), { biome, nuit }); };
  assert(vus('foret', false) < vus('prairie', false), 'la forêt voit moins que les prés');
  assert(vus('prairie', true) < vus('prairie', false), 'la nuit voit moins que le jour');
  assert(vus('sommet', false) > vus('prairie', false), 'les sommets voient plus loin');
  // la même marche donne le même vu
  const marche = () => { const s = partie(); for (let d = 0; d < 200; d += 3) voirAutour(s, aLEst(s, d) + (d % 7) * farmTerrain(s).LARGEUR, { biome: d % 2 ? 'foret' : 'lande', nuit: d > 100 }); return s.monde.vu; };
  assertEqual(marche(), marche());
});

test('le vu : les régions des cellules vues deviennent vues (ce que lit le moteur)', () => {
  const s = partie(), t = aLEst(s, 150), cle = regionDeCase(t, farmTerrain(s).LARGEUR);
  assert(!regionVue(s, t) && !s.monde.vues.includes(cle), 'pas vue au départ');
  voirAutour(s, t, { biome: 'prairie' });
  assert(regionVue(s, t) && s.monde.vues.includes(cle), 'sa région devient vue');
  // chaque cellule vue est dans une région vue, une fois chacune
  const { C, L, H, bits } = vuDe(s);
  for (let i = 0; i < L * H; i++) if ((bits[i >> 3] >> (i & 7)) & 1) assert(regionVue(s, caseEn(s, (i % L) * C, Math.floor(i / L) * C)), `cellule ${i}`);
  assertEqual(new Set(s.monde.vues).size, s.monde.vues.length);
});

/* ---------- la sauvegarde ---------- */

test('la sauvegarde : un bit par cellule, en base64, la même taille quel que soit le voyage', () => {
  const s = partie(), { L, H } = grilleVu(farmTerrain(s)), n = Math.ceil((L * H) / 8);
  assertEqual(s.monde.vu.length, Math.ceil(n / 3) * 4);
  assert(s.monde.vu.length <= 900, 'moins de 900 caractères');
  // l'aller-retour base64
  const o = Uint8Array.from({ length: 50 }, (_, i) => (i * 37 + 11) & 255);
  for (const k of [48, 49, 50]) assertEqual([...deBase64(versBase64(o.slice(0, k)), k)], [...o.slice(0, k)]);
  // après un long voyage (tout le monde vu), la même taille
  toutVoir(s);
  assertEqual([s.monde.vu.length, Math.round(partVue(s) * 100)], [Math.ceil(n / 3) * 4, 100]);
  // tout cacher : la ferme aussi ; rien que le cercle autour du personnage (sa case, s'il en a une)
  toutCacher(s);
  assertEqual(nbVues(s), 0);
  s.monde.ici = caseDepart(farmTerrain(s));
  toutCacher(s);
  assertEqual(s.monde.vu, vuInitial(farmTerrain(s), s.monde.ici));
  assertEqual([s.monde.but, s.monde.boussole], [null, true]);
});

test('migration v57 → v58 : les régions déjà vues deviennent vues en entier (celles de la ferme si l\'on est allé au-delà), la ferme d\'office', () => {
  const s = partie(5), T = farmTerrain(s), W = T.LARGEUR, F = T.FERME;
  const vieille = copie({ ...s, version: 57 });
  delete vieille.monde.vu; delete vieille.monde.but; delete vieille.monde.boussole;
  vieille.monde.vues = [...vieille.monde.vues, '7,3', '0,0'];
  const m = migrate({ v: 57, t: 0, s: vieille });
  assertEqual([m.version, m.monde.but, m.monde.boussole], [STATE_VERSION, null, true]);
  // chaque case des régions vues, vue ; la ferme aussi ; ailleurs, non
  for (const [rx, ry] of [[7, 3], [0, 0], [3, 3], [6, 4]]) for (const [dx, dy] of [[0, 0], [63, 63], [20, 41]]) assert(caseVue(m, caseEn(m, rx * 64 + dx, ry * 64 + dy)), `${rx},${ry} +${dx},${dy}`);
  assert(caseVue(m, caseEn(m, F.X + 3, F.Y + 3)), 'la ferme');
  for (const [c, r] of [[600, 480], [70, 300], [520, 30]]) assert(!caseVue(m, r * W + c), `(${c}, ${r}) pas vue`);
  assertEqual(m.monde.vu, vuDesRegions(T, vieille.monde.vues));
  // une partie qui n'a vu que les régions de sa ferme (vues d'office, pas parcourues) : sa ferme et sa
  // prairie (elle les avait vues : pas de nouveau brouillard dessus, fiche 14b), rien d'autre
  const casaniere = copie(vieille);
  casaniere.monde.vues = casaniere.monde.vues.filter((k) => k !== '7,3' && k !== '0,0');
  const mc = migrate({ v: 57, t: 0, s: casaniere });
  assertEqual(nbVues(mc), cellulesFerme(T).length);
  assert(cellulesFerme(T).every((i) => (vuDe(mc).bits[i >> 3] >> (i & 7)) & 1), 'sa ferme et sa prairie, vues');
  // le reste de la partie ne bouge pas
  assertEqual([m.monde.vues, m.monde.pris, m.monde.hameaux, m.pieces, m.inventaire], [vieille.monde.vues, vieille.monde.pris, vieille.monde.hameaux, s.pieces, s.inventaire]);
});

// Fiche 14b : le brouillard que la scène reçoit (modèle.brouillard : la chaîne du vu, lue comme la scène la lit,
// js/carte/ferme/brouillard.js : un bit par cellule, la cellule cx, cy au bit cy × L + cx ; plus rien de vu
// d'office). Une nouvelle partie : la ferme sous le brouillard, sauf autour du personnage ; elle se découvre en
// marchant. Une ancienne partie (chaque témoin migré ; une partie de la fiche 8 à 14, dont le vu portait
// la ferme et sa prairie) : sa ferme reste découverte, et le reste en marchant ; un vu perdu (pas une
// chaîne) se refait depuis les régions, ferme comprise (reparerPartie).
const fermeVue = (s) => {
  const T = farmTerrain(s), F = T.FERME, M = DECOUVERTE.MARGE_FERME, v = vuDe(s), o = deBase64(v.vu, Math.ceil((v.L * v.H) / 8));
  let vues = 0, n = 0;
  for (let r = F.Y - M; r < F.Y + F.HAUTEUR + M; r += 3) {
    for (let c = F.X - M; c < F.X + F.LARGEUR + M; c += 3) {
      const i = Math.floor(r / v.C) * v.L + Math.floor(c / v.C);
      n++;
      vues += (o[i >> 3] >> (i & 7)) & 1;
    }
  }
  return vues / n;
};
/* ---------- la carte du monde ---------- */

const MONDE_ESSAI = (() => {
  let m = null;
  return () => {
    if (m) return m;
    const s = partie(7), T = farmTerrain(s), ctx = solDirect(T).ctx;
    elementsSol(ctx);
    m = { s, T, ctx, lieux: ctx.elements.lieux };
    return m;
  };
})();

test('la carte n\'expose rien de non vu : les lieux pas encore vus en sont absents', () => {
  const { s: s0, lieux } = MONDE_ESSAI();
  const s = copie(s0);
  assert(lieux.peche.length >= 3, 'des lieux dans le plan');
  const vide = lieuxDeLaCarte(s, lieux);
  assertEqual(vide.peche.length, lieux.peche.filter((l) => caseVue(s, l.case)).length);
  for (const l of vide.peche) assert(caseVue(s, l.case), `${l.id} est vu`);
  // un coin de pêche vu : sur la carte, avec son nom ; ceux pas vus restent absents
  const p = lieux.peche.find((q) => !caseVue(s, q.case));
  voirAutour(s, p.case, { biome: 'prairie' });
  assert(/^Un coin de pêche/.test(lieuxDeLaCarte(s, lieux).peche.find((q) => q.id === p.id).nom), 'son nom');
  for (const q of lieux.peche) if (!caseVue(s, q.case)) assert(!lieuxDeLaCarte(s, lieux).peche.some((x) => x.id === q.id), `${q.id} absent`);
  // le port, lui, est connu dès le départ
  assertEqual(lieuxDeLaCarte(s, lieux).port.map((x) => x.id), [lieux.port.id]);
  // tout vu : tous les lieux
  toutVoir(s);
  assertEqual(lieuxDeLaCarte(s, lieux).peche.length, lieux.peche.length);
});

test('l\'image du monde : la même d\'un coup ou par morceaux de rangées, sans la partie', () => {
  const { ctx } = MONDE_ESSAI(), W = ctx.cadre.LARGEUR, H = ctx.cadre.HAUTEUR;
  const tout = imageDuMonde(ctx);
  const morceaux = new Uint8ClampedArray(W * H * 4);
  for (let y = 0; y < H; y += 48) imageDuMonde(ctx, y, Math.min(H, y + 48), morceaux);
  assert(tout.length === W * H * 4 && tout.every((v, i) => v === morceaux[i]), 'mêmes pixels');
  assert(tout.every((v, i) => i % 4 !== 3 || v === 255), 'opaque');
  // la mer au sud-est, plus sombre que les prés, et les chemins
  const px = (c, r) => [...tout.slice((r * W + c) * 4, (r * W + c) * 4 + 3)];
  const mer = px(W - 3, H - 3);
  assert(mer[2] > mer[0] && mer[2] > mer[1], 'la mer est bleue');
});

/* ---------- la boussole ---------- */

test('la boussole : direction et distance ; cachée sur la ferme sans but ; la ferme ailleurs', () => {
  const d = directionVers(10, 10, 13, 14);
  assertEqual([d.distance, Math.round((d.angle * 180) / Math.PI)], [5, 53]);
  assertEqual(Math.round((directionVers(0, 0, -4, 0).angle * 180) / Math.PI), 180);
  const s = partie(), T = farmTerrain(s), F = T.FERME, W = T.LARGEUR;
  const sortie = (F.Y + 40) * W + F.X + F.LARGEUR;
  assertEqual(etatBoussole(s, F.X + 10, F.Y + 10, null, sortie), null);
  // à 60 cases à l'est : la ferme, à l'ouest
  const e = etatBoussole(s, F.X + F.LARGEUR + 60.5, F.Y + 40.5, null, sortie);
  assertEqual([e.sorte, e.nom, e.distance, Math.round((e.angle * 180) / Math.PI), e.arrive], ['ferme', 'La ferme', 60, 180, false]);
  // les Options la cachent
  montrerBoussole(s, false);
  assert(!boussoleMontree(s) && etatBoussole(s, F.X + F.LARGEUR + 60, F.Y + 40, null, sortie) === null, 'cachée');
  montrerBoussole(s, true);
  assert(boussoleMontree(s), 'montrée');
});

test('la boussole : le lieu choisi sur la carte (s\'il est vu), jusqu\'à l\'atteindre', () => {
  const { s: s0, T, lieux } = MONDE_ESSAI();
  const s = copie(s0), W = T.LARGEUR, F = T.FERME, sortie = (F.Y + 40) * W + F.X + F.LARGEUR;
  const h = lieux.peche.find((q) => !caseVue(s, q.case));
  // pas vu : il ne se choisit pas
  assertEqual(choisirBut(s, { sorte: 'peche', id: h.id }, lieux).ok, false);
  assertEqual(butBoussole(s), null);
  voirAutour(s, h.case, { biome: 'prairie' });
  assert(choisirBut(s, { sorte: 'peche', id: h.id }, lieux).ok, 'vu : il se choisit');
  assertEqual(butBoussole(s), { sorte: 'peche', id: h.id });
  // sur la ferme, la boussole montre le coin de pêche, à sa distance
  const hx = (h.case % W) + 0.5, hy = Math.floor(h.case / W) + 0.5, px = F.X + 20.5, py = F.Y + 20.5;
  const e = etatBoussole(s, px, py, lieux, sortie);
  assertEqual([e.sorte, e.id, e.distance, e.arrive], ['peche', h.id, Math.round(Math.hypot(hx - px, hy - py)), false]);
  assert(/^Un coin de pêche/.test(e.nom), e.nom);
  assert(Math.abs(e.angle - Math.atan2(hy - py, hx - px)) < 1e-9, 'sa direction');
  // tout près : atteint
  assert(etatBoussole(s, hx + DECOUVERTE.ARRIVEE - 1, hy, lieux, sortie).arrive, 'atteint');
  // un but qui n'est plus vu (le mode test a tout caché) : la ferme
  toutCacher(s);
  assertEqual(etatBoussole(s, F.X + F.LARGEUR + 60, F.Y + 40, lieux, sortie).sorte, 'ferme');
  assert(choisirBut(s, null).ok && butBoussole(s) === null, 'retour à la ferme');
  assertEqual(choisirBut(s, { sorte: 'tour', id: 'x' }).ok, false);
});

/* ---------- le reste du jeu ---------- */

test('la ferme et le reste du jeu inchangés : voir loin ne change pas la ferme ni la nuit sur elle', () => {
  const a = partie(9), b = copie(a);
  // la ferme se découvre en marchant (fiche 14b), sans rien y changer d'autre
  const F = farmTerrain(a).FERME;
  assert(voirAutour(a, caseEn(a, F.X + 30, F.Y + 30), { biome: 'prairie' }) > 0, 'la ferme se découvre');
  voirAutour(b, caseEn(b, F.X + 30, F.Y + 30), { biome: 'prairie' });
  // b voit loin à l'est ; trois nuits chacune : la ferme, l'inventaire, l'argent, la famille, les mêmes
  for (let d = 0; d < 160; d += 2) voirAutour(b, aLEst(b, d), { biome: 'prairie' });
  for (let n = 0; n < 3; n++) { sleepOnce(a); sleepOnce(b); }
  const ferme = (s) => ({ potager: s.potager, inventaire: s.inventaire, pieces: s.pieces, famille: s.famille, day: s.day, outils: s.outils, version: s.version });
  assertEqual(ferme(a), ferme(b));
  assertEqual(DATA.DECOUVERTE.CELLULE, 8);
});
