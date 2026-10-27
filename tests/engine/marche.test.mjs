/* ==========================================================================
   Tests : la marche des personnages (fiche 20).
   - l'image du pas suit les px parcourus (CarteKit.imageMarche) : une image tous les PAS px (3 pour
     un adulte, 2 pour un enfant), en commençant par un passage (l'image 1) ;
   - sur les planches (assets/personnages/), de profil, le pied posé recule d'autant d'une image à
     l'autre : le corps avance de PAS px, le pied reste sur place (pas de glissade) ; au passage, on
     voit les deux jambes, droites, côte à côte : la jambe d'appui au sol, l'autre juste devant, son
     pied décollé d'un pixel (marche et panier) ; le corps monte d'un pixel au passage ;
   - le regard : un peu de retenue près de la diagonale (CarteKit.regard avec le regard d'avant), et
     lissé le long d'un chemin en escalier (CarteKit.allure) : il ne bat plus d'une vue à l'autre.
   Lancer seul : node --test tests/engine/marche.test.mjs (ou node tests/run-tests.mjs marche).
   ========================================================================== */

import { readFileSync } from 'node:fs';
import { inflateSync } from 'node:zlib';
import { assert, assertEqual, test } from './aide.mjs';

const fenetre = { devicePixelRatio: 1, navigator: {}, matchMedia: () => ({ matches: false }), localStorage: { getItem: () => null, setItem() {} } };
new Function('window', readFileSync(new URL('../../js/carte/kit.js', import.meta.url), 'utf8'))(fenetre);
const K = fenetre.CarteKit;

// Une planche PNG (RGBA 8 bits, sans entrelacement, comme les écrit PIL) → { w, h, px(x, y) }.
function lirePng(chemin) {
  const b = readFileSync(new URL('../../' + chemin, import.meta.url));
  let i = 8, w = 0, h = 0, type = 0;
  const idat = [];
  while (i < b.length) {
    const n = b.readUInt32BE(i), nom = b.toString('ascii', i + 4, i + 8), d = b.subarray(i + 8, i + 8 + n);
    if (nom === 'IHDR') { w = d.readUInt32BE(0); h = d.readUInt32BE(4); type = d[9]; assertEqual([d[8], d[12]], [8, 0], chemin); }
    if (nom === 'IDAT') idat.push(d);
    i += 12 + n;
  }
  const bpp = type === 6 ? 4 : type === 2 ? 3 : 0;
  assert(bpp, `${chemin} : une planche RGBA ou RGB`);
  const brut = inflateSync(Buffer.concat(idat)), ligne = w * bpp, out = Buffer.alloc(h * ligne);
  for (let y = 0; y < h; y++) {
    const f = brut[y * (ligne + 1)], src = brut.subarray(y * (ligne + 1) + 1, (y + 1) * (ligne + 1));
    for (let x = 0; x < ligne; x++) {
      const a = x >= bpp ? out[y * ligne + x - bpp] : 0, up = y ? out[(y - 1) * ligne + x] : 0, c = x >= bpp && y ? out[(y - 1) * ligne + x - bpp] : 0;
      const p = a + up - c, pa = Math.abs(p - a), pb = Math.abs(p - up), pc = Math.abs(p - c);
      const pred = [0, a, up, (a + up) >> 1, pa <= pb && pa <= pc ? a : pb <= pc ? up : c][f];
      out[y * ligne + x] = (src[x] + pred) & 255;
    }
  }
  return { w, h, px: (x, y) => { const k = y * ligne + x * bpp; return [out[k], out[k + 1], out[k + 2], bpp === 4 ? out[k + 3] : 255]; } };
}

const CASES = JSON.parse(readFileSync(new URL('../../assets/personnages/cases.json', import.meta.url), 'utf8'));
const CONTOUR = '43,29,20';
// Les pieds au sol d'une case : les suites de pixels (hors contour) de la rangée du bas des
// chaussures (30), leur talon (x le plus à gauche) ; `pieds` : de même sur la rangée du dessus (29),
// où l'on voit aussi un pied décollé d'un pixel ; et le haut de la tête (la première rangée peinte).
function pose(planche, nom) {
  const k = CASES.frames.indexOf(nom), x0 = (k % 8) * 16, y0 = Math.floor(k / 8) * 32;
  const plein = (x, y) => { const p = planche.px(x0 + x, y0 + y); return p[3] > 0 && p.slice(0, 3).join() !== CONTOUR; };
  const suites = (y) => { const t = []; for (let x = 0; x < 16; x++) if (plein(x, y) && !(x > 0 && plein(x - 1, y))) t.push(x); return t; };
  const talons = suites(30), pieds = suites(29);
  let tete = 0;
  while (tete < 32 && ![...Array(16).keys()].some((x) => planche.px(x0 + x, y0 + tete)[3] > 0)) tete++;
  return { talons, pieds, tete };
}

test("l'image du pas : une tous les PAS px, en commençant par un passage", () => {
  assertEqual([K.PAS.adulte, K.PAS.enfant], [3, 2]);
  const adulte = [0, 1, 2, 3, 4.5, 6, 8.9, 9, 11.9, 12].map((d) => K.imageMarche(d));
  assertEqual(adulte, [1, 1, 1, 2, 2, 3, 3, 0, 0, 1]);
  const enfant = [0, 1.9, 2, 4, 6, 8].map((d) => K.imageMarche(d, true));
  assertEqual(enfant, [1, 1, 2, 3, 0, 1]);
});

test('les planches : de profil, le pied posé ne glisse pas ; au passage, les deux jambes côte à côte', () => {
  const noms = [];
  for (let i = 1; i <= 50; i++) noms.push(['perso_' + String(i).padStart(2, '0'), K.PAS.adulte], ['enfant_' + String(i).padStart(2, '0'), K.PAS.enfant]);
  for (const [nom, pas] of noms) {
    const planche = lirePng(`assets/personnages/${nom}.png`);
    const [p0, p1, p2, p3] = [0, 1, 2, 3].map((k) => pose(planche, `marche_cote_${k}`));
    // (contact : deux pieds au sol ; passage : un seul, l'autre décollé d'un pixel, juste devant)
    assertEqual([p0.talons.length, p1.talons.length, p2.talons.length, p3.talons.length], [2, 1, 2, 1], `${nom} : les pieds au sol`);
    for (const genre of ['marche', 'panier']) {
      for (const k of [1, 3]) {
        const q = pose(planche, `${genre}_cote_${k}`);
        assertEqual(q.talons.length, 1, `${nom}, ${genre}_cote_${k} : un pied au sol`);
        assert(q.pieds.length === 2 && q.pieds[0] === q.talons[0] && q.pieds[1] - q.pieds[0] >= 3 && q.pieds[1] - q.pieds[0] <= 4,
          `${nom}, ${genre}_cote_${k} : les deux pieds côte à côte, l'autre décollé d'un pixel (${q.pieds}, ${q.talons})`);
      }
    }
    // le pied proche : devant au contact 0, sous le corps au passage 1, derrière au contact 2,
    // reculant de `pas` px à chaque image (autant que le corps avance sur la carte)
    assertEqual([p0.talons[1] - p1.talons[0], p1.talons[0] - p2.talons[0]], [pas, pas], `${nom} : le pied proche recule de ${pas} px par image`);
    // l'autre : posé au contact 2, sous le corps au passage 3, derrière au contact 0
    assertEqual([p2.talons[1] - p3.talons[0], p3.talons[0] - p0.talons[0]], [pas, pas], `${nom} : le pied lointain recule de ${pas} px par image`);
    // le corps monte d'un pixel au passage, dans les trois vues
    for (const vue of ['bas', 'haut', 'cote']) {
      const t = [0, 1, 2, 3].map((k) => pose(planche, `marche_${vue}_${k}`).tete);
      assertEqual([t[0] - t[1], t[2] - t[3], t[0] - t[2]], [1, 1, 0], `${nom} : le rebond, ${vue}`);
    }
  }
});

// Le bas des bras de face : la plus basse rangée peinte (hors contour) des colonnes de la case à
// gauche du corps (0 à 4) et à sa droite (11 à 15), au-dessus des pieds.
function bras(planche, nom) {
  const k = CASES.frames.indexOf(nom), x0 = (k % 8) * 16, y0 = Math.floor(k / 8) * 32;
  const plein = (x, y) => { const p = planche.px(x0 + x, y0 + y); return p[3] > 0 && p.slice(0, 3).join() !== CONTOUR; };
  const bas = (cols) => { let b = -1; for (let y = 14; y < 28; y++) for (const x of cols) if (plein(x, y)) b = y; return b; };
  // de profil : le plus à droite (devant) des bras, sous les épaules et au-dessus des jambes
  let devant = -1;
  for (let y = 19; y < 25; y++) for (let x = 0; x < 16; x++) if (plein(x, y) && x > devant) devant = x;
  return { gauche: bas([0, 1, 2, 3, 4]), droite: bas([11, 12, 13, 14, 15]), devant };
}

test('les bras se balancent : de face et de dos, en opposition ; de profil, devant puis derrière', () => {
  for (let i = 1; i <= 50; i++) {
    for (const nom of ['perso_' + String(i).padStart(2, '0'), 'enfant_' + String(i).padStart(2, '0')]) {
      const planche = lirePng(`assets/personnages/${nom}.png`);
      for (const vue of ['bas', 'haut']) {
        const [b0, b1, b2] = [0, 1, 2].map((k) => bras(planche, `marche_${vue}_${k}`));
        // d'un contact à l'autre, chaque main monte ou descend d'au moins 2 px, l'une à l'opposé de l'autre
        const dg = b2.gauche - b0.gauche, dd = b2.droite - b0.droite;
        assert(Math.abs(dg) >= 2 && Math.abs(dd) >= 2 && Math.sign(dg) === -Math.sign(dd), `${nom}, ${vue} : les bras en opposition (${dg}, ${dd})`);
        // au passage, entre les deux
        assert(b1.gauche > Math.min(b0.gauche, b2.gauche) && b1.gauche < Math.max(b0.gauche, b2.gauche), `${nom}, ${vue} : au passage, le bras gauche le long du corps (${b0.gauche}, ${b1.gauche}, ${b2.gauche})`);
      }
      const [c0, c1, c2] = [0, 1, 2].map((k) => bras(planche, `marche_cote_${k}`));
      assert(c0.devant > c1.devant && c2.devant > c1.devant, `${nom} : de profil, une main devant au contact (${c0.devant}, ${c1.devant}, ${c2.devant})`);
    }
  }
});

test('le regard : de la retenue près de la diagonale', () => {
  const r = (dx, dy, avant) => { const g = K.regard(dx, dy, avant); return g.face + (g.flip ? '<' : ''); };
  assertEqual([r(1, 1), r(-1, 1), r(1, 1, { face: 'bas' }), r(1, -1, { face: 'haut' }), r(1, 1, { face: 'cote' })], ['cote', 'cote<', 'bas', 'haut', 'cote']);
  // (bien au-delà de la diagonale, il tourne quand même)
  assertEqual([r(1, 0.5, { face: 'bas' }), r(0.5, 1, { face: 'cote' }), r(-1, 0, { face: 'cote', flip: false })], ['cote', 'bas', 'cote<']);
});

test('le regard lissé : un chemin en escalier ne le fait pas tourner à chaque case', () => {
  // un chemin de 8 directions vers le bas-droite, en pente de 2 pour 1 : un pas en biais, un pas
  // vers le bas, …, chacun de 16 px, parcouru à 1 px par image
  const segments = [];
  for (let i = 0; i < 10; i++) segments.push([1, 1], [0, 1]);
  const vues = (regarder) => {
    const suite = [];
    for (const [dx, dy] of segments) for (let k = 0; k < 16; k++) suite.push(regarder(dx, dy));
    let tours = 0;
    for (let k = 1; k < suite.length; k++) if (suite[k] !== suite[k - 1]) tours++;
    return tours;
  };
  const sans = vues((dx, dy) => { const g = K.regard(dx, dy); return g.face + g.flip; });
  const a = K.allure();
  let actuel = null;
  const avec = vues((dx, dy) => { actuel = a.pas(dx, dy, 1, actuel); return actuel.face + actuel.flip; });
  assert(sans >= 19, `sans lissage, il tourne à chaque case (${sans})`);
  assert(avec <= 1, `lissé, il garde une vue (${avec} changements)`);
  // un vrai virage (un angle droit), un demi-tour : tout de suite
  const b = K.allure();
  let g = b.pas(1, 0, 1, null);
  for (let k = 0; k < 20; k++) g = b.pas(1, 0, 1, g);
  assertEqual(b.pas(0, 1, 1, g).face, 'bas');
  assertEqual(b.pas(0, -1, 1, b.pas(0, 1, 1, g)).face, 'haut');
});
