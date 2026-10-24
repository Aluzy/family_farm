/* ==========================================================================
   Tests du moteur : le plan du grand monde (js/engine/monde-gen.js, fiche 4a) : déterministe,
   la ferme dans sa prairie, le monde fermé (la mer au sud et à l'est, les sommets au nord et à
   l'ouest, aucun passage hors du monde), les rivières de la montagne à la mer, les chemins qui
   font le tour de la ferme et relient les hameaux, les lieux dans leurs biomes, une région faite
   seule comme dans le plan, la durée.
   Lancer seul : node --test tests/engine/monde-plan.test.mjs (ou node tests/run-tests.mjs monde-plan).
   ========================================================================== */

import {
  biomesDeRegion, champsDuMonde, DATA, elementsDuMonde, fairePlan, genererMonde, MONDE, planDuMonde,
} from '../../js/engine/index.js';
import { assert, assertEqual, test } from './aide.mjs';

const P = DATA.PLAN_MONDE;
// (trois graines : chaque plan prend quelques dixièmes de seconde, la ferme autant)
const GRAINES = ['plan-1', 'plan-2', 'plan-3'];
const plans = new Map();
const plan = (g) => {
  if (!plans.has(g)) plans.set(g, planDuMonde(g));
  return plans.get(g);
};
const cadre = (p) => ({ LARGEUR: p.LARGEUR, HAUTEUR: p.HAUTEUR, FERME: p.FERME, SORTIE: p.SORTIE });

// les aides de lecture d'un plan
function lecteur(p) {
  const W = p.LARGEUR, H = p.HAUTEUR, N = W * H, F = p.FERME;
  const B = Object.fromEntries(p.BIOMES.map((b, i) => [b, i]));
  const col = (i) => i % W, rang = (i) => Math.floor(i / W);
  const voisins = (i) => [col(i) > 0 ? i - 1 : -1, col(i) < W - 1 ? i + 1 : -1, i >= W ? i - W : -1, i < N - W ? i + W : -1].filter((j) => j >= 0);
  const auBord = (i) => col(i) === 0 || rang(i) === 0 || col(i) === W - 1 || rang(i) === H - 1;
  const distFerme = (i) => {
    const dx = Math.max(F.X - col(i), 0, col(i) - (F.X + F.LARGEUR - 1)), dy = Math.max(F.Y - rang(i), 0, rang(i) - (F.Y + F.HAUTEUR - 1));
    return Math.hypot(dx, dy);
  };
  // les cases atteintes depuis `depart` en passant par les cases où ok(i)
  const atteintes = (depart, ok) => {
    const vu = new Uint8Array(N), file = [depart];
    vu[depart] = 1;
    for (let q = 0; q < file.length; q++) for (const j of voisins(file[q])) if (!vu[j] && ok(j)) { vu[j] = 1; file.push(j); }
    return { vu, file };
  };
  return { W, H, N, F, B, col, rang, voisins, auBord, distFerme, atteintes, nom: (i) => p.BIOMES[p.biome[i]] };
}

test('le plan du monde : déterministe (même graine, même plan ; graines différentes, plans différents)', () => {
  const p = plan('plan-1');
  const q = fairePlan('plan-1', cadre(p));
  for (const k of ['biome', 'relief', 'humidite']) assert(q[k].every((v, i) => v === p[k][i]), k);
  assertEqual([q.rivieres, q.finRivieres, q.lacs, q.chemins, q.lieux], [p.rivieres, p.finRivieres, p.lacs, p.chemins, p.lieux]);
  const r = plan('plan-2');
  let ecarts = 0;
  for (let i = 0; i < p.biome.length; i++) if (p.biome[i] !== r.biome[i]) ecarts++;
  assert(ecarts > p.biome.length / 10, `deux graines, deux plans (${ecarts} cases différentes)`);
  assertEqual([p.LARGEUR, p.HAUTEUR, p.BIOMES], [MONDE.LARGEUR, MONDE.HAUTEUR, DATA.BIOMES]);
});

test('le plan du monde : à la première demande seulement, sans rien changer au terrain ni à la carte', () => {
  const m = genererMonde('plan-1');
  assert(typeof Object.getOwnPropertyDescriptor(m, 'plan').get === 'function', 'un accesseur');
  assert(m.plan === planDuMonde('plan-1'), 'fait une fois');
  // la prairie autour de la ferme n'est encore « rien » (la fiche 4b posera les biomes)
  const T = m.terrain, F = T.FERME;
  assert(T.LIGNES.every((l, r) => (r < F.Y || r >= F.Y + F.HAUTEUR ? /^\.+$/.test(l) : /^\.+$/.test(l.slice(0, F.X)) && /^\.+$/.test(l.slice(F.X + F.LARGEUR)))), 'la prairie : rien');
});

test('le plan du monde : la ferme et sa marge dans la prairie, la sortie de la ferme au bord est', () => {
  for (const g of GRAINES) {
    const p = plan(g), L = lecteur(p);
    let hors = 0;
    for (let i = 0; i < L.N; i++) if (L.distFerme(i) <= P.FERME.MARGE && p.biome[i] !== L.B.prairie) hors++;
    assertEqual(hors, 0, `${g} : la ferme et sa marge en prairie`);
    assertEqual(L.col(p.SORTIE), p.FERME.X + p.FERME.LARGEUR, `${g} : la sortie juste à l'est de la ferme`);
  }
});

test('le plan du monde : fermé (la mer au sud et à l\'est, les sommets au nord et à l\'ouest, aucun passage)', () => {
  for (const g of GRAINES) {
    const p = plan(g), L = lecteur(p), { W, H, B } = L;
    const ferme = new Set([B.mer, B.sommet, B.falaise]);
    const bords = { nord: [], sud: [], ouest: [], est: [] };
    for (let x = 0; x < W; x++) { bords.nord.push(x); bords.sud.push((H - 1) * W + x); }
    for (let y = 0; y < H; y++) { bords.ouest.push(y * W); bords.est.push(y * W + W - 1); }
    for (const [nom, cs] of Object.entries(bords)) {
      // tout le bord est fermé ; la mer ou les sommets presque partout (des falaises, et l'autre
      // dans les coins nord-est et sud-ouest où la montagne et la mer se rencontrent)
      assertEqual(cs.filter((i) => !ferme.has(p.biome[i])).map(L.nom), [], `${g} : le bord ${nom} fermé`);
      const attendu = nom === 'nord' || nom === 'ouest' ? B.sommet : B.mer;
      assert(cs.filter((i) => p.biome[i] === attendu).length >= 0.8 * cs.length, `${g} : le bord ${nom} : ${p.BIOMES[attendu]}`);
    }
    // depuis la ferme, sans passer par la mer, un lac, un sommet ni une falaise : jamais le bord
    const { file } = L.atteintes(p.FERME.Y * W + p.FERME.X, (j) => !ferme.has(p.biome[j]) && p.biome[j] !== B.lac);
    assertEqual(file.filter(L.auBord).length, 0, `${g} : aucun passage hors du monde`);
    // et des biomes variés
    const n = new Array(p.BIOMES.length).fill(0);
    for (const b of p.biome) n[b]++;
    for (const b of ['mer', 'plage', 'prairie', 'foret', 'marais', 'lande', 'montagne', 'sommet']) assert(n[B[b]] > L.N / 200, `${g} : du ${b}`);
  }
});

test('le plan du monde : les rivières descendent de la montagne à la mer (ou à un lac), en cases voisines', () => {
  for (const g of GRAINES) {
    const p = plan(g), L = lecteur(p), { B } = L;
    assert(p.rivieres.length >= P.RIVIERES.NOMBRE[0] - 1 && p.rivieres.length <= P.RIVIERES.NOMBRE[1], `${g} : ${p.rivieres.length} rivières`);
    assert(p.finRivieres.includes('mer'), `${g} : une rivière au moins va à la mer`);
    const filDe = new Int16Array(L.N);
    p.rivieres.forEach((fl, k) => fl.forEach((i) => { filDe[i] = k + 1; }));
    p.rivieres.forEach((fl, k) => {
      const nom = `${g}, rivière ${k}`;
      assertEqual(new Set(fl).size, fl.length, `${nom} : sans boucle`);
      for (let j = 1; j < fl.length; j++) assert(L.voisins(fl[j - 1]).includes(fl[j]), `${nom} : cases ${j - 1} et ${j} voisines`);
      assert(p.relief[fl[0]] >= P.SEUILS.MONTAGNE * 255 - 1, `${nom} : sa source en montagne`);
      assert(fl.every((i) => L.distFerme(i) > P.FERME.MARGE), `${nom} : loin de la ferme`);
      assert(fl.every((i) => p.biome[i] === B.riviere || p.biome[i] === B.lac), `${nom} : de l'eau`);
      const fin = p.finRivieres[k], der = fl[fl.length - 1];
      assert(L.voisins(der).some((j) => (fin === 'mer' && p.biome[j] === B.mer) || (fin === 'lac' && p.biome[j] === B.lac)
        || (fin === 'riviere' && filDe[j] && filDe[j] !== k + 1)), `${nom} : se jette (${fin})`);
    });
    // largeur 1 à 3 : chaque case de rivière touche le fil d'une rivière à une case près
    const pres = (i) => { for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (filDe[i + dy * L.W + dx]) return true; return false; };
    for (let i = 0; i < L.N; i++) if (p.biome[i] === B.riviere) assert(pres(i), `${g} : une rivière de plus de 3 cases de large en ${L.col(i)},${L.rang(i)}`);
    assert(p.lacs.length > 0 && p.lacs.every((cs) => cs.every((i) => p.biome[i] === B.lac)), `${g} : des lacs`);
  }
});

test('le plan du monde : les chemins font le tour de la ferme et relient chaque hameau à sa sortie', () => {
  for (const g of GRAINES) {
    const p = plan(g), L = lecteur(p), { B } = L;
    const surChemin = new Uint8Array(L.N);
    p.chemins.forEach((ch, k) => {
      for (let j = 1; j < ch.length; j++) assert(L.voisins(ch[j - 1]).includes(ch[j]), `${g}, chemin ${k} : cases voisines`);
      for (const i of ch) {
        surChemin[i] = 1;
        assert(![B.mer, B.lac, B.sommet, B.falaise].includes(p.biome[i]) && L.distFerme(i) > 0, `${g}, chemin ${k} : sur ${L.nom(i)}`);
      }
    });
    const H = p.lieux.hameaux;
    assert(H.length >= P.HAMEAUX.NOMBRE[0] && H.length <= P.HAMEAUX.NOMBRE[1], `${g} : ${H.length} hameaux`);
    assert(surChemin[p.SORTIE], `${g} : la sortie de la ferme sur un chemin`);
    const { vu } = L.atteintes(p.SORTIE, (j) => surChemin[j]);
    for (const h of H) assert(vu[h.case], `${g} : ${h.id} relié à la ferme`);
    // le tour : depuis la ferme, sans passer un chemin, on n'atteint pas le bord du monde
    const { file } = L.atteintes(p.FERME.Y * L.W + p.FERME.X, (j) => !surChemin[j]);
    assertEqual(file.filter(L.auBord).length, 0, `${g} : les chemins font le tour de la ferme`);
  }
});

test('le plan du monde : les hameaux, les grottes et les coins de pêche dans des biomes qui leur conviennent', () => {
  for (const g of GRAINES) {
    const p = plan(g), L = lecteur(p), { B } = L;
    const H = p.lieux.hameaux, terre = [B.prairie, B.lande, B.plage, B.foret];
    for (const h of H) {
      assert(terre.includes(p.biome[h.case]), `${g} : ${h.id} sur ${L.nom(h.case)}`);
      assert(typeof h.nom === 'string' && h.nom, `${g} : ${h.id} a un nom`);
      for (const k of H) if (k !== h) assert(Math.hypot(L.col(h.case) - L.col(k.case), L.rang(h.case) - L.rang(k.case)) >= P.HAMEAUX.ECART * 0.7, `${g} : ${h.id} loin de ${k.id}`);
    }
    assertEqual(new Set(H.map((h) => h.nom)).size, H.length, `${g} : des noms différents`);
    const G = p.lieux.grottes;
    assert(G.length >= P.GROTTES.NOMBRE[0] && G.length <= P.GROTTES.NOMBRE[1], `${g} : ${G.length} grottes`);
    for (const c of G) {
      assertEqual(L.nom(c.case), 'montagne', `${g} : ${c.id}`);
      let pied = false;
      for (let dy = -P.GROTTES.PIED; dy <= P.GROTTES.PIED; dy++) for (let dx = -P.GROTTES.PIED; dx <= P.GROTTES.PIED; dx++) if ([B.prairie, B.lande, B.foret].includes(p.biome[c.case + dy * L.W + dx])) pied = true;
      assert(pied, `${g} : ${c.id} au pied de la montagne`);
    }
    const eau = { lac: B.lac, riviere: B.riviere, mer: B.mer };
    for (const c of p.lieux.peche) {
      assert(terre.includes(p.biome[c.case]), `${g} : ${c.id} sur la rive (${L.nom(c.case)})`);
      assert(L.voisins(c.case).some((j) => p.biome[j] === eau[c.eau]), `${g} : ${c.id} au bord de ${c.eau}`);
    }
    for (const e of Object.keys(eau)) assert(p.lieux.peche.some((c) => c.eau === e), `${g} : un coin de pêche en ${e}`);
    const ids = [...H, ...G, ...p.lieux.peche].map((x) => x.id);
    assertEqual(new Set(ids).size, ids.length, `${g} : des identifiants uniques`);
  }
});

test('le plan du monde : une région faite seule (champs et éléments) est celle du plan', () => {
  const p = plan('plan-3'), c = cadre(p), champs = champsDuMonde('plan-3', c), el = elementsDuMonde('plan-3', c);
  const N = MONDE.REGION;
  for (const [rx, ry] of [[0, 0], [3, 2], [6, 5], [9, 7]]) {
    const r = biomesDeRegion(champs, el, c, rx, ry, N), l = Math.min(N, p.LARGEUR - rx * N);
    let ecarts = 0;
    r.forEach((b, k) => { if (b !== p.biome[(ry * N + Math.floor(k / l)) * p.LARGEUR + rx * N + (k % l)]) ecarts++; });
    assertEqual([r.length > 0, ecarts], [true, 0], `région ${rx},${ry}`);
  }
});

test('le plan du monde : sa durée (la ferme déjà faite)', () => {
  const c = cadre(plan('plan-1'));
  fairePlan('plan-4', c);   // (une première fois : le code est compilé)
  const debut = performance.now();
  fairePlan('plan-5', c);
  const duree = performance.now() - debut;
  // visé : moins de 300 ms dans Node ; la borne laisse de la marge aux machines lentes et aux
  // tests qui tournent en même temps
  assert(duree < 2000, `le plan en ${duree.toFixed(0)} ms`);
});
