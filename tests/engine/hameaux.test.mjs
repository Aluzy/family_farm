/* ==========================================================================
   Tests du moteur : les hameaux bâtis du grand monde (fiche 7a : js/engine/monde-hameaux.js).
   - les plans : déterministes (la même graine, le même plan ; deux calculs, deux contextes, le Web
     Worker et le calcul direct : les mêmes) ; trois à sept maisons, un style, un métier ;
   - la pose : toutes les maisons sur la terre ferme (ni l'eau, ni une falaise, ni un sommet, ni un
     chemin, ni la ferme) ; pas de chevauchement entre maisons, jardins et autres lieux ; chaque
     porte donne sur une case marchable reliée au chemin du hameau ; chaque pièce close a ses lits,
     qu'on rejoint depuis la porte ; les murs et les clôtures ferment leurs cases, les portes non ;
   - ni la ferme ni le monde hors des hameaux ne changent (les régions faites sans hameaux, comparées
     case par case loin d'eux) ; rien ne pousse dans un hameau ;
   - chaque sorte a son dessin (assets/hameaux.json, ses variantes), chaque meuble repris existe ;
   - la découverte (state.monde.hameaux) et la migration v54 → v55 ; la page de l'encyclopédie.
   Lancer seul : node --test tests/engine/hameaux.test.mjs (ou node tests/run-tests.mjs hameaux).
   ========================================================================== */

import { readFileSync } from 'node:fs';
import {
  BIOMES, caseMarchable, conditionRemplie, contexteSol, DATA, elementsSol, entreeEncyclopedie, genererMonde, migrate,
  MONDE, solDeRegion, solDirect, STATE_VERSION,
} from '../../js/engine/index.js';
import {
  HAMEAUX, hameauxVus, plansDesHameaux, SORTE_HAMEAU, SORTES_HAMEAUX, STYLES_HAMEAUX, voirHameau,
} from '../../js/engine/monde-hameaux.js';
import { reservesDuMonde, SORTES } from '../../js/engine/monde-vegetation.js';
import { SORTES_ROCHES } from '../../js/engine/monde-roches.js';
import { assert, assertEqual, garden, test } from './aide.mjs';

const W = MONDE.LARGEUR, H = MONDE.HAUTEUR, N = MONDE.REGION;
// (GRAINES_HAMEAUX="a,b,c" : d'autres mondes, pour éprouver le tirage)
const GRAINES = process.env.GRAINES_HAMEAUX ? process.env.GRAINES_HAMEAUX.split(',') : ['hameaux-1', 'hameaux-2', 'hameaux-3'];

const mondes = new Map();
function monde(graine) {
  if (!mondes.has(graine)) {
    const T = genererMonde(graine).terrain, sol = solDirect(T);
    elementsSol(sol.ctx);
    mondes.set(graine, { T, sol, ctx: sol.ctx, H: sol.ctx.hameaux });
  }
  return mondes.get(graine);
}
const biomeDe = (m, i) => { const e = m.ctx.elements.eaux[i]; return BIOMES[e !== 255 ? e : m.ctx.lire.biome(i)]; };
const casesMaison = (mz) => { const out = []; for (let y = mz.y0; y < mz.y0 + mz.h; y++) for (let x = mz.x0; x < mz.x0 + mz.l; x++) out.push(y * W + x); return out; };
const regionsDe = (p) => {
  const out = new Set();
  for (let y = Math.floor(p.cadre.y0 / N); y <= Math.floor(p.cadre.y1 / N); y++) for (let x = Math.floor(p.cadre.x0 / N); x <= Math.floor(p.cadre.x1 / N); x++) out.add(x + ',' + y);
  return [...out].map((c) => c.split(',').map(Number));
};

/* ---------- les plans ---------- */

test('les hameaux : des plans déterministes, les mêmes d\'un calcul à l\'autre ; trois à sept maisons, un style, un métier', () => {
  for (const graine of GRAINES) {
    const m = monde(graine);
    const M = genererMonde(graine).terrain.MONDE, ctx2 = contexteSol(M.graine, M.cadre, M.ferme, M.taille);
    elementsSol(ctx2);
    assertEqual(JSON.stringify(ctx2.hameaux.plans), JSON.stringify(m.H.plans), 'le même plan');
    assertEqual(ctx2.hameaux.pieces.map((p) => p.join()).join('|'), m.H.pieces.map((p) => p.join()).join('|'), 'les mêmes pièces');
    assertEqual(m.H.plans.map((p) => p.id), m.ctx.elements.lieux.hameaux.map((h) => h.id), 'un plan par hameau du plan du monde');
    for (const p of m.H.plans) {
      assert(p.maisons.length >= HAMEAUX.MAISONS[0] && p.maisons.length <= HAMEAUX.MAISONS[1], `${graine} ${p.id} : ${p.maisons.length} maisons`);
      assert(STYLES_HAMEAUX.includes(p.style), p.style);
      assert(HAMEAUX.METIERS.ORDRE.includes(p.metier), p.metier);
      assert(p.place.puits !== null && p.place.panneau !== null, `${p.id} : son puits, son panneau`);
      assert(p.travail.length >= 1 && p.travail[0].lieu, `${p.id} : un lieu de travail`);
      assertEqual(new Set(p.maisons.map((mz) => mz.id)).size, p.maisons.length, 'des id distincts');
    }
  }
  // un autre monde, d'autres hameaux
  assert(JSON.stringify(monde(GRAINES[0]).H.plans) !== JSON.stringify(monde(GRAINES[1]).H.plans), 'deux mondes, deux plans');
});

test('les hameaux : le Web Worker donne les mêmes plans et les mêmes régions que le calcul direct', async () => {
  const m = monde(GRAINES[0]), M = m.T.MONDE, p = m.H.plans[0];
  const [rx, ry] = [Math.floor((p.case % W) / N), Math.floor(Math.floor(p.case / W) / N)];
  const recus = [];
  globalThis.self = { postMessage: (msg) => recus.push(msg) };
  try {
    await import('../../js/monde-worker.js?hameaux');
    const attendre = async (f) => { for (let k = 0; k < 600 && !f(); k++) await new Promise((ok) => setTimeout(ok, 10)); };
    self.onmessage({ data: { type: 'init', graine: M.graine, cadre: M.cadre, ferme: M.ferme, taille: M.taille } });
    self.onmessage({ data: { type: 'region', rx, ry } });
    await attendre(() => recus.some((r) => r.type === 'region'));
    const pret = recus.find((r) => r.type === 'pret');
    // (le message passe comme une copie structurée : le même contenu)
    assertEqual(JSON.stringify(structuredClone(pret.hameaux)), JSON.stringify(m.H.plans), 'les plans');
    const r = recus.find((x) => x.type === 'region').region, d = m.sol.region(rx, ry);
    assertEqual([...r.hameau.images].join(), [...d.hameau.images].join(), 'les images');
    assertEqual([...r.hameau.basses].join(), [...d.hameau.basses].join(), 'ce qui se peint');
    assertEqual([...r.marche].join(), [...d.marche].join(), 'la marche');
    assertEqual([...r.couches].join(), [...d.couches].join(), 'le sol');
  } finally {
    delete globalThis.self;
  }
});

/* ---------- la pose ---------- */

test('les hameaux : les maisons sur la terre ferme, hors de l\'eau, des falaises, des chemins et de la ferme ; rien ne se chevauche', () => {
  for (const graine of GRAINES) {
    const m = monde(graine), F = m.T.FERME, autres = [...m.ctx.elements.lieux.grottes, ...m.ctx.elements.lieux.peche];
    const pris = new Map();
    const prend = (i, quoi) => { assert(!pris.has(i), `${graine} : ${quoi} sur ${pris.get(i)} (case ${i % W},${Math.floor(i / W)})`); pris.set(i, quoi); };
    for (const p of m.H.plans) {
      for (const mz of p.maisons) {
        for (const i of casesMaison(mz)) {
          const c = i % W, r = Math.floor(i / W);
          assert(!['mer', 'lac', 'riviere', 'falaise', 'sommet'].includes(biomeDe(m, i)), `${mz.id} : pas sur ${biomeDe(m, i)}`);
          assert(!m.ctx.chemins[i], `${mz.id} : pas sur un chemin`);
          assert(!(c >= F.X && r >= F.Y && c < F.X + F.LARGEUR && r < F.Y + F.HAUTEUR), `${mz.id} : pas sur la ferme`);
          for (const l of autres) assert(Math.max(Math.abs((l.case % W) - c), Math.abs(Math.floor(l.case / W) - r)) > HAMEAUX.LIEUX, `${mz.id} : loin de ${l.id}`);
          prend(i, mz.id);
        }
      }
      for (const j of p.jardins) for (const i of j.cases) { assert(!m.ctx.chemins[i], 'un jardin hors du chemin'); prend(i, p.id + ' jardin'); }
      for (const i of p.place.cases) assert(!pris.has(i) || pris.get(i).startsWith(p.id), 'la place est libre');
    }
  }
});

test('les hameaux : chaque porte donne sur une case marchable reliée au chemin du hameau ; on y entre', () => {
  for (const graine of GRAINES) {
    const m = monde(graine), marche = (t) => caseMarchable(m.T, t, m.sol);
    for (const p of m.H.plans) {
      const c = p.cadre, dans = (t) => { const x = t % W, y = Math.floor(t / W); return x >= c.x0 - 6 && x <= c.x1 + 6 && y >= c.y0 - 6 && y <= c.y1 + 6; };
      // les cases reliées à la case du hameau (sur le chemin), sans sortir de ses abords
      const vus = new Set([p.case]), file = [p.case];
      assert(marche(p.case), `${p.id} : sa case, au milieu de la place, est marchable`);
      for (let k = 0; k < file.length; k++) for (const d of [1, -1, W, -W]) { const t = file[k] + d; if (!vus.has(t) && dans(t) && marche(t)) { vus.add(t); file.push(t); } }
      for (const mz of p.maisons) {
        assert(marche(mz.porte) && marche(mz.devant), `${mz.id} : sa porte et la case devant s'ouvrent`);
        assert(vus.has(mz.devant) && vus.has(mz.porte), `${graine} ${mz.id} : relié au chemin du hameau`);
        // dedans : chaque case de ses pièces (hors meubles qui ferment) et chaque lit se rejoint
        for (const b of mz.lits) assert(vus.has(b.case), `${mz.id} : son lit ${b.case} se rejoint depuis la porte`);
      }
      for (const j of p.jardins) assert(vus.has(j.portillon), `${p.id} : le portillon d'un jardin se rejoint`);
    }
  }
});

test('les hameaux : chaque pièce close a ses lits ; les murs et les clôtures ferment leurs cases, les portes non', () => {
  for (const graine of GRAINES) {
    const m = monde(graine), marche = (t) => caseMarchable(m.T, t, m.sol);
    const murs = new Set(['mur_pierre', 'mur_taille', 'mur_bois', 'fenetre_pierre', 'fenetre_taille', 'fenetre_bois'].map((n) => SORTE_HAMEAU[n]));
    m.H.plans.forEach((p, k) => {
      const pi = m.H.pieces[k], ferme = new Set(), portes = new Set();
      for (let q = 0; q < pi.length; q += 4) {
        const t = Math.floor((pi[q + 2] - 1 + (SORTES_HAMEAUX[pi[q]].pied || 0)) / 16) * W + Math.floor((pi[q + 1] - ((SORTES_HAMEAUX[pi[q]].largeur || 1) - 1) * 8) / 16);
        if (murs.has(pi[q])) ferme.add(t);
        if (SORTES_HAMEAUX[pi[q]].genre === 'porte') portes.add(t);
        if (pi[q] === SORTE_HAMEAU.barriere) assert(!marche(t), 'une barrière ferme');
      }
      for (const t of ferme) assert(!marche(t), `${p.id} : un mur ferme sa case`);
      for (const t of portes) assert(marche(t), `${p.id} : une porte s'ouvre`);
      for (const mz of p.maisons) {
        assert(mz.lits.length >= 1, `${mz.id} : des lits`);
        assert(mz.pieces.some((q) => q.genre === 'salle'), `${mz.id} : sa salle commune`);
        for (const q of mz.pieces) {
          // une pièce close : ses cases, bordées de murs et de portes (rien ne fuit hors de la maison)
          const dedans = new Set(q.cases), cadre = new Set(casesMaison(mz));
          for (const t of q.cases) for (const d of [1, -1, W, -W]) assert(dedans.has(t + d) || ferme.has(t + d) || portes.has(t + d), `${mz.id} : la pièce est close`);
          for (const t of q.cases) assert(cadre.has(t), 'dans la maison');
          assert(mz.lits.some((b) => dedans.has(b.case)), `${graine} ${mz.id} : la pièce « ${q.genre} » a ses lits`);
        }
        assert(mz.foyer === null || mz.pieces.find((q) => q.genre === 'salle').cases.includes(mz.foyer), `${mz.id} : le foyer dans la salle`);
        assert(mz.fenetres.length >= 1, `${mz.id} : des fenêtres`);
      }
    });
  }
});

test('les hameaux : le monde hors des hameaux et la ferme ne changent pas ; rien ne pousse dans un hameau', () => {
  const m = monde(GRAINES[0]), M = m.T.MONDE;
  // le même monde, sans ses hameaux bâtis (les réserves d'avant, rien de bâti)
  const ctx0 = contexteSol(M.graine, M.cadre, M.ferme, M.taille);
  elementsSol(ctx0);
  const vide = plansDesHameaux({ graine: M.graine, W, H, F: M.cadre.FERME, lieux: { hameaux: [] }, chemins: ctx0.chemins, biome: () => 0 });
  ctx0.hameaux = vide;
  ctx0.reserves = reservesDuMonde(ctx0.elements, W, H);
  // loin d'un hameau : à plus de 8 cases de ce qu'il réserve
  const pres = new Uint8Array(W * H);
  for (let i = 0; i < W * H; i++) {
    if (!m.H.emprise[i]) continue;
    const c = i % W, r = Math.floor(i / W);
    for (let dy = -8; dy <= 8; dy++) for (let dx = -8; dx <= 8; dx++) { const x = c + dx, y = r + dy; if (x >= 0 && y >= 0 && x < W && y < H) pres[y * W + x] = 1; }
  }
  let comparees = 0;
  const regions = new Set(m.H.plans.flatMap((p) => regionsDe(p).map((r) => r.join())));
  // (et deux régions de la ferme)
  regions.add('4,3'); regions.add('5,4');
  for (const cle of regions) {
    const [rx, ry] = cle.split(',').map(Number), a = m.sol.region(rx, ry), b = solDeRegion(ctx0, rx, ry);
    for (let y = 0; y < a.h; y++) {
      for (let x = 0; x < a.l; x++) {
        const i = (a.y0 + y) * W + a.x0 + x;
        if (pres[i]) continue;
        const o = (y * a.l + x) * 8;
        for (let k = 0; k < 8; k++) assert(a.couches[o + k] === b.couches[o + k], `le sol de la case ${a.x0 + x},${a.y0 + y} ne change pas`);
        comparees++;
      }
    }
    for (let y = 0; y < a.ch; y++) for (let x = 0; x < a.cl; x++) { const i = (a.cy0 + y) * W + a.cx0 + x; if (!pres[i]) assert(a.marche[y * a.cl + x] === b.marche[y * a.cl + x], 'la marche ne change pas'); }
    const loin = (im) => { const out = []; for (let k = 0; k < im.length; k += 4) { const t = Math.floor((im[k + 2] - 1) / 16) * W + Math.floor(im[k + 1] / 16); if (!pres[t]) out.push(im.slice(k, k + 4).join()); } return out.join('|'); };
    assertEqual(loin(a.vegetation.images), loin(b.vegetation.images), `les arbres loin des hameaux (${cle})`);
    assertEqual(loin(a.roches.images), loin(b.roches.images), `les rochers loin des hameaux (${cle})`);
    // rien ne pousse sur ce qu'un hameau réserve
    // (sauf les falaises et les rochers dans la mer : du plan seul, sur des cases où l'on ne bâtit pas)
    for (const [im, sortes] of [[a.vegetation.images, SORTES], [a.roches.images, SORTES_ROCHES]]) {
      for (let k = 0; k < im.length; k += 4) {
        if (['paroi', 'mer'].includes(sortes[im[k]].genre)) continue;
        assert(!m.H.emprise[Math.floor((im[k + 2] - 1) / 16) * W + Math.floor(im[k + 1] / 16)], `rien dans un hameau (${sortes[im[k]].nom})`);
      }
    }
  }
  assert(comparees > 20000, `des cases comparées (${comparees})`);
  // la ferme : rien de bâti dessus, ses cases sans tuiles du monde
  const F = M.cadre.FERME;
  for (let y = F.Y; y < F.Y + F.HAUTEUR; y += 7) for (let x = F.X; x < F.X + F.LARGEUR; x += 7) assert(!m.H.emprise[y * W + x] && !m.H.bloque[y * W + x], 'rien sur la ferme');
});

/* ---------- les dessins ---------- */

test('les hameaux : chaque sorte a son dessin (ses variantes), chaque meuble et chaque matière repris existent', () => {
  const table = JSON.parse(readFileSync(new URL('../../assets/hameaux.json', import.meta.url), 'utf8'));
  for (const s of SORTES_HAMEAUX) {
    assert(Array.isArray(table[s.nom]), `${s.nom} : son dessin`);
    assertEqual(table[s.nom].length, s.variantes, `${s.nom} : ses variantes`);
    for (const [x, y, w, h] of table[s.nom]) assert(w > 0 && h > 0 && x >= 0 && y >= 0, `${s.nom} : un rectangle`);
  }
  for (const [nom, st] of Object.entries(HAMEAUX.STYLES)) {
    for (const k of ['mur_', 'fenetre_', 'porte_']) assert(SORTE_HAMEAU[k + st.mur] !== undefined, `${nom} : ${k}${st.mur}`);
    assert(SORTE_HAMEAU[st.sol] !== undefined && SORTE_HAMEAU[st.foyer] !== undefined, `${nom} : son sol, son foyer`);
    assert(['tuiles', 'ardoise', 'chaume', 'roseaux'].includes(st.toit), `${nom} : son toit (CarteKit.toit)`);
  }
  for (const n of HAMEAUX.BLOQUE) assert(SORTE_HAMEAU[n] !== undefined, n);
  for (const [m, t] of Object.entries(HAMEAUX.TRAVAIL)) for (const n of t.pieces) assert(SORTE_HAMEAU[n] !== undefined, `${m} : ${n}`);
  // les sortes de la planche ne prennent pas le nom d'une pièce qui se récolte (vegetation.js lit les règles par nom)
  for (const s of SORTES_HAMEAUX) assert(!DATA.RECOLTE.SORTES[s.nom], `${s.nom} : pas une pièce qui se récolte`);
  // les styles se rencontrent : sur ces mondes, au moins trois styles différents
  const styles = new Set(GRAINES.flatMap((g) => monde(g).H.plans.map((p) => p.style)));
  assert(styles.size >= 3, `des styles différents (${[...styles].join(', ')})`);
});

/* ---------- la découverte ---------- */

test('les hameaux : la découverte (la sauvegarde) et sa page de l\'encyclopédie', () => {
  const s = garden();
  assertEqual(hameauxVus(s), {});
  assert(!conditionRemplie(s, 'hameau'), 'pas encore de page');
  const p = monde(GRAINES[0]).H.plans[0];
  assert(voirHameau(s, p), 'la première fois : nouveau');
  assert(!voirHameau(s, p), 'la seconde : déjà vu');
  assertEqual(s.monde.hameaux[p.id], { nom: p.nom, style: p.style, jour: s.day });
  assert(conditionRemplie(s, 'hameau'), 'la page se découvre');
  assert(entreeEncyclopedie('hameaux'), 'la page « Les hameaux »');
  // la sauvegarde la garde
  const m = migrate({ v: STATE_VERSION, t: 0, s: JSON.parse(JSON.stringify(s)) });
  assertEqual(m.monde.hameaux, s.monde.hameaux);
});

test('migration v54 → v55 : aucun hameau vu, rien d\'autre ne change', () => {
  const s = garden();
  const { hameaux, habitants, ...monde54 } = s.monde;
  const v54 = JSON.parse(JSON.stringify({ ...s, monde: { ...monde54, pris: { 'sapin:8,14': { retour: 3 } } }, version: 54 }));
  const m = migrate({ v: 54, t: 0, s: v54 });
  assertEqual(m.version, STATE_VERSION);
  // (puis v55 → v56 : pas encore d'habitants, tests/engine/habitants.test.mjs)
  // (le vu : refait par la migration v57 → v58, la ferme et sa prairie d'une partie d'avant la fiche 8)
  assertEqual({ ...m.monde, vu: undefined }, { ...v54.monde, hameaux: {}, habitants: {}, vu: undefined });
  const { monde: a, version: va, ...ra } = m, { monde: b, version: vb, ...rb } = v54;
  assertEqual(ra, rb, 'le reste ne change pas');
});
