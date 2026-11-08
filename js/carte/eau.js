/* carte/eau.js — l'eau vivante des cartes (CarteKit.eauVive, CarteKit.EAU).
 *
 * Des méthodes de scène (posées sur le prototype de la scène de la ferme, js/carte/ferme/eau.js,
 * et demain de celles du grand monde) ; chaque scène dit ce qui la
 * concerne :
 *   eauEtendues()   ses étendues d'eau : [{ x, y, tex (une texture canevas : l'eau et ses rives,
 *                   telles que dessinées), sprite (son image, cachée sous le shader), mer, cells
 *                   (les numéros de ses cases : celles qui portent une tuile d'eau animée ; au grand
 *                   monde, cols : la largeur de la carte en cases ; sinon, celle de this.grid) }],
 *                   toujours le même tableau tant qu'elles ne changent pas (null : aucune) ;
 *   eauMarge(a, eau) facultatif : la terre autour d'une étendue du grand monde (eau-monde.js) ;
 *   eauHeure()      l'heure du jeu (null : plein jour) ;
 *   eauMarcheurs()  qui marche (les ronds au bord de l'eau) : [{ id, x, y }] ;
 *   eauRepeint(a)   l'étendue reprend son dessin d'origine (l'eau vivante s'en va) ;
 *   eauPoissons()   les images des poissons qui sautent (facultatif).
 *
 * Les étendues d'eau sont peintes par un shader (EAU_FRAG : vagues, eau plus sombre au large,
 * reflets de lumière au fond, ciel de l'heure, ligne d'écume qui avance et recule le long de la
 * rive ; la mer, EAU_MER : la houle qui roule vers la plage, le ressac qui monte sur le sable et
 * redescend, son écume). L'eau ondule : le shader la décale selon deux vaguelettes sans raccord
 * (des sinus de périodes entières, dans les canaux rouge et vert d'une texture faite une fois,
 * eau_vague) qu'il fait glisser lui-même, en sens contraires, d'après le temps ; la terre des rives
 * (les pixels ni bleus ni blancs) est lue en premier et rendue telle quelle (uRive), et l'eau
 * déborde un peu sous elle : seuls l'eau et son liseré blanc bougent, jamais l'herbe (eauRive).
 * La lumière y joue selon l'heure :
 *   - le jour, des scintillements (de petites croix claires, ajoutées à l'eau) paraissent et
 *     s'éteignent çà et là sur l'eau, loin des rives, plus nombreux et dorés quand le soleil est
 *     bas (le shader les tire d'un hachage par cellule de 3 px et par tranche de temps) ;
 *   - la nuit, dans le voile de l'heure (avec les autres lumières de la scène : stepEauLumiere) :
 *     le reflet de la lune, une colonne de traits qui tremblent au milieu de l'eau, et celui des
 *     lumières posées au bord sur l'eau juste en dessous.
 * Les lacs, les rivières et les étangs sont plus bas que l'herbe (E.berge, eauBerge) : sous la rive
 * du haut, une paroi de terre (son rebord d'herbe, des racines, des cailloux), la tranche de la paroi
 * sur les côtés ; et l'ombre de la berge tombe dans l'eau, du côté opposé au soleil (vers le haut de
 * la carte, penchée selon l'heure, comme les ombres portées : CarteKit.soleil), rien la nuit.
 * Ce qui se tient au bord se reflète dans l'eau (stepReflets) : arbres, bâtiments, toits,
 * personnages, bêtes, chacun retourné sous son pied, teinté, à `EAU.miroir.alpha` ; dessinés
 * avec les ronds dans une texture par étendue (uRefl), que le shader lit avec le même décalage que
 * l'eau (le reflet ondule exactement avec elle) et seulement sur l'eau (la rive passe devant).
 * Cette texture n'est redessinée que quand ce qu'elle montre a changé (une empreinte des objets
 * proches : un étang bordé d'arbres ne coûte rien tant que personne ne passe).
 * Des ronds s'élargissent sur l'eau (rond) : à la pêche, quand un poisson saute (de temps en
 * temps, sautPoisson), quand quelqu'un longe la rive, et de petits ronds au hasard (des insectes).
 * Une étendue d'eau vivante n'est qu'un objet de scène : son shader (fiche 24 : tout ce qui est
 * statique se calcule une fois, tout ce qui bouge se déduit du temps dans le shader, aucune
 * texture n'est redessinée par image sans qu'une chose ait changé).
 * Seulement en WebGL (le shader), et pas si le joueur a demandé moins d'animations.
 */
(function (global) {
  'use strict';

  const K = global.CarteKit;
  const T = K.T;
  const reducedMotion = K.reduit;

  // L'eau vivante : elle ondule de `ondule` px au plus, ses vaguelettes glissent à `vitesse` px/s
  // (la première en (x, y), la seconde en (-y, 0,7 x) : en sens contraires) ; les scintillements du
  // jour (`scintille`, dans le shader : par cellule de `cellule` px d'eau, une chance `parCase` par
  // case (16 px) d'être allumée à un instant donné, plus quand le soleil est bas ; chacun vit `vie` s ;
  // `alpha` l'éclat ; `clair` à midi, `dore` le soir, à `doreMax` d'entre eux à l'horizon) ; les reflets
  // de la nuit (`reflets` : des traits tous les `pas` px qui tremblent de `ecart` px à `tremble` rad/s ;
  // la lune, et les lumières posées au bord, jusqu'à `portee` cases d'eau en dessous, à `lumiere` de
  // leur éclat)
  const EAU = {
    ondule: 1.5, vitesse: [6, 3.5],
    scintille: { cellule: 5, parCase: 0.1, vie: 0.7, alpha: 0.9, clair: [1, 1, 1], dore: [1, 0.82, 0.48], doreMax: 1 },
    reflets: { pas: 3, ecart: 1.5, tremble: 2.2, portee: 3, lumiere: 0.6, lune: { long: 12, teinte: 0xcfe0ff, alpha: 0.6 } },
    // les reflets de ce qui se tient au bord (`miroir` : pied à `portee` px au plus au-dessus
    // de l'eau, haut de `haut` px au plus ; retourné, écrasé à `ecrase`, teinté, à `alpha`) ;
    // les ronds (`ronds` : `images` cercles en `vie` s, à `alpha` ; `hasard` petits ronds par s
    // pour 100 cases d'eau ; un poisson saute toutes les `saut` s en moyenne, dans une eau d'au
    // moins `poissons` cases, de `sautHaut` px en `sautMs` ms ; quelqu'un qui marche à `rive` px
    // de l'eau y fait un rond toutes les `pas` s)
    // le shader de l'eau (`shader`, eau.js EAU_FRAG) : les traits ondulés du large (là où deux
    // bruits qui glissent à `glisse` px/s diffèrent de moins de `trait`, et où un troisième
    // dépasse `endroits`), plus clairs de `clair` ; le ciel de l'heure (CarteKit.lumiere,
    // teinté de `bleu`) à `ciel` ; l'écume de la rive (`ecume`) : à `pres` px de la terre,
    // jusqu'à `pres + va`, et retour, à `vitesse` rad/s, à `alpha` ; une « terre » de `ilot` px
    // au plus dans l'eau (roseaux, cailloux) compte pour de l'eau ; la distance à la terre est
    // lissée sur `lisse` px (les angles de l'écume s'arrondissent)
    // la berge (`berge`, eauRive) : l'eau est plus basse que l'herbe ; sous la rive du haut, une
    // paroi de terre haute de `haut` px (au hasard, l'un ou l'autre), son rebord d'herbe assombri à
    // `rebord`, la terre de `terre` (plus sombre de `fonce` par px vers l'eau), des racines et des
    // cailloux (une chance sur `racine`, `caillou`) ; sur les côtés, la tranche de la paroi (`cote` :
    // claire à gauche, sombre à droite). Une terre de `ilot` px au plus (roseaux, cailloux) n'en a
    // pas. Son ombre dans l'eau suit le soleil (CarteKit.soleil : vers le haut de la carte, penchée
    // selon l'heure), haute de `ombre.haut` px de berge, à `ombre.alpha` en plein jour.
    berge: { haut: [3, 4], rebord: 0.72, terre: [124, 86, 54], fonce: 0.1, racine: 9, caillou: 13, clair: [158, 118, 76], sombre: [88, 58, 36], cote: [[104, 70, 44], [78, 52, 32]], ombre: { haut: 4, alpha: 0.8 } },
    shader: { trait: 0.032, glisse: 3, clair: 1, endroits: 0.4, bleu: [0.75, 0.88, 1], ciel: 0.1, ecume: { pres: 1.4, va: 1.8, vitesse: 0.9, alpha: 0.75 }, ilot: 64, lisse: 2 },
    // la mer (`mer`, EAU_MER) : sa houle porte à `portee` px de la plage ; ses crêtes (`houle`)
    // tous les `ecart` px, qui roulent vers la plage à `vitesse` crêtes par s, larges de
    // `largeur` (une part de l'écart), plus claires de `clair` ; le ressac (`ressac`) monte sur
    // le sable de `base` à `base + va` px, à `vitesse` rad/s, en une nappe `nappe` à `alpha`
    mer: { portee: 60, houle: { ecart: 9, vitesse: 0.18, largeur: 0.12, clair: 0.7 }, ressac: { base: 1.5, va: 6, vitesse: 0.7, alpha: 0.55, nappe: [0.55, 0.8, 0.9] } },
    // (`liste` ms : les images qui peuvent s'y refléter, celles près de l'étendue à `marge` px près, relevées
    // de nouveau ; entre deux relevés, seules elles sont regardées : stepReflets)
    miroir: { portee: 40, haut: 160, ecrase: 0.9, teinte: 0x86a8c8, alpha: 0.42, liste: 500, marge: 64 },
    ronds: { images: 6, vie: 1.1, alpha: 0.85, hasard: 0.35, saut: 14, poissons: 30, sautHaut: 10, sautMs: 520, rive: 6, pas: 0.45 },
  };
  const E = EAU;
  const P = 64;   // la vaguelette : un carreau de P × P px sans raccord

  // Deux vaguelettes (a, b) : rouge et vert, chacun une somme de sinus aux périodes entières
  // (le carreau se répète sans raccord), l'une à côté de l'autre dans une seule texture
  // (eau_vague, 2 P × P px : a à gauche, b à droite) que le shader fait glisser lui-même (vague()).
  function vaguelettes(textures) {
    if (textures.exists('eau_vague')) return;
    const ondes = [
      [[[1, 2, 0.4], [3, -1, 1.7], [-2, 3, 4.1]], [[2, 1, 2.2], [-1, 3, 0.9], [3, 2, 5.3]]],
      [[[2, -1, 3.1], [1, 3, 0.2], [-3, 2, 2.6]], [[1, -2, 1.1], [3, 1, 4.4], [-2, -3, 0.7]]],
    ];
    const cvv = document.createElement('canvas');
    cvv.width = 2 * P; cvv.height = P;
    const gv = cvv.getContext('2d'), imv = gv.createImageData(2 * P, P);
    ondes.forEach((canaux, i) => {
      for (let y = 0; y < P; y++) {
        for (let x = 0; x < P; x++) {
          const v = canaux.map((ws) => ws.reduce((s, [a, b, ph]) => s + Math.sin((2 * Math.PI * (a * x + b * y)) / P + ph), 0) / ws.length);
          const o = (y * 2 * P + i * P + x) * 4;
          imv.data[o] = Math.round(128 + 127 * v[0]);
          imv.data[o + 1] = Math.round(128 + 127 * v[1]);
          imv.data[o + 2] = 128;
          imv.data[o + 3] = 255;
        }
      }
    });
    gv.putImageData(imv, 0, 0);
    textures.addCanvas('eau_vague', cvv);
    // (une petite croix : l'image de réserve des reflets, stepReflets prend)
    const cv = document.createElement('canvas');
    cv.width = cv.height = 5;
    const g = cv.getContext('2d');
    g.fillStyle = 'rgba(255,255,255,0.55)';
    g.fillRect(2, 0, 1, 5); g.fillRect(0, 2, 5, 1);
    g.fillStyle = '#fff';
    g.fillRect(2, 1, 1, 3); g.fillRect(1, 2, 3, 1);
    textures.addCanvas('eau_scintille', cv);
    // les ronds : des ellipses d'un pixel, de plus en plus grandes (E.ronds.images images de
    // RW × RH px, l'une à côté de l'autre)
    const N = E.ronds.images, rv = document.createElement('canvas');
    rv.width = RW * N; rv.height = RH;
    const gr = rv.getContext('2d');
    gr.fillStyle = '#fff';
    for (let i = 0; i < N; i++) {
      const rx = 2 + (i * (RW / 2 - 3)) / (N - 1), ry = rx / 2, cx = i * RW + RW / 2, cy = RH / 2;
      const vus = new Set();
      for (let k = 0; k < 96; k++) {
        const t = (2 * Math.PI * k) / 96, x = Math.round(cx + rx * Math.cos(t) - 0.5), y = Math.round(cy + ry * Math.sin(t) - 0.5);
        if (!vus.has(x + ',' + y)) { vus.add(x + ',' + y); gr.fillRect(x, y, 1, 1); }
      }
    }
    const tx = textures.addCanvas('eau_ronds', rv);
    for (let i = 0; i < N; i++) tx.add(i, 0, i * RW, 0, RW, RH);
  }
  const RW = 24, RH = 12;
  const AUCUNE = [];
  let scenes = 0;
  // (un numéro par clé de texture ou d'image, pour l'empreinte des reflets : stepReflets)
  const cles = new Map();
  const cleId = (k) => { let n = cles.get(k); if (n === undefined) { n = cles.size + 1; cles.set(k, n); } return n; };

  // Ce que les deux shaders ont en commun (COMMUN, en tête de chacun) :
  //   - les lecteurs : uBase (l'eau seule, la terre transparente, eauRive), uChamp (la distance à
  //     la terre, rouge ; la terre ou la distance de la terre à l'eau, vert), uVague (les deux
  //     vaguelettes, eau_vague), uBruit (eau_bruit), uRefl (les reflets et les ronds de l'étendue,
  //     stepReflets : prémultipliés) ;
  //   - vague(p, t) : le décalage de l'eau en pixels entiers, les deux vaguelettes glissant en sens
  //     contraires (uVit : la vitesse de chacune, px/s), composées comme avant à parts égales ;
  //   - reflets(c, uv) : la couleur de l'eau sous le reflet (la texture est prémultipliée) ;
  //   - hache(q) : un hasard de 0 à 1 par cellule ;
  //   - scintille(c, pw, d, t) : les scintillements du jour, loin de la rive (d ≥ 3 px) : uScint
  //     (la densité par cellule, l'éclat, la cellule en px, la vie en s), uDore (la part des dorés),
  //     uScintClair et uScintDore (leurs couleurs). Une cellule brille ou non selon un hasard tiré
  //     de sa place et de sa tranche de temps (décalée d'une cellule à l'autre : elles ne
  //     clignotent pas ensemble), en une croix de 5 px (le cœur plein, le bout des branches pâle) qui naît
  //     et s'éteint en sinus, ajoutée à la couleur.
  const COMMUN = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
#define HP highp
#else
#define HP mediump
#endif
precision mediump float;
uniform sampler2D uBase;
uniform sampler2D uChamp;
uniform sampler2D uVague;
uniform sampler2D uBruit;
uniform sampler2D uRefl;
uniform vec2 uTaille;
uniform HP float uTemps;
uniform float uOndule;
uniform vec4 uVit;
uniform vec3 uCiel;
uniform float uCielK;
uniform HP vec2 uOrigine;
varying vec2 outTexCoord;
float bruit(HP vec2 p) { return texture2D(uBruit, fract(p / 128.0)).r; }
float bruit2(HP vec2 p) { return texture2D(uBruit, fract(p / 128.0)).g; }
vec2 vague(HP vec2 p, HP float t) {
  vec2 ua = fract((p + t * uVit.xy) / 64.0);
  vec2 ub = fract((p + t * uVit.zw) / 64.0);
  vec2 a = texture2D(uVague, vec2(ua.x * 0.5, ua.y)).rg - 0.5;
  vec2 b = texture2D(uVague, vec2(0.5 + ub.x * 0.5, ub.y)).rg - 0.5;
  return floor((a + b) * uOndule + 0.5);
}
vec3 reflets(vec3 c, vec2 uv) {
  vec4 r = texture2D(uRefl, uv);
  return c * (1.0 - r.a) + r.rgb;
}
float hache(HP vec2 q) {
  HP vec3 p3 = fract(vec3(q.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}
uniform vec4 uScint;
uniform float uDore;
uniform vec3 uScintClair;
uniform vec3 uScintDore;
vec3 scintille(vec3 c, HP vec2 pw, float d, HP float t) {
  if (uScint.y <= 0.0 || d < 3.0) return c;
  HP vec2 cell = floor(pw / uScint.z);
  float ph = hache(cell + 0.37);
  float age = fract(t / uScint.w + ph);
  HP float tranche = floor(t / uScint.w + ph);
  float on = step(1.0 - uScint.x, hache(cell * 1.013 + tranche * 7.31 + 11.0));
  HP vec2 l = pw - cell * uScint.z - floor(uScint.z * 0.5) - 0.5;   // (depuis le cœur de la cellule)
  float croix = step(abs(l.x) * abs(l.y), 0.0) * step(abs(l.x) + abs(l.y), 2.0);
  float eclat = mix(1.0, 0.55, step(1.5, abs(l.x) + abs(l.y)));
  vec3 col = mix(uScintClair, uScintDore, step(1.0 - uDore, hache(cell + 5.1)));
  return c + col * on * croix * eclat * sin(3.14159 * age) * uScint.y;
}
`;

  // Le shader de l'eau (js/carte/ferme/eau.js syncEau ; E.shader) : il peint l'eau de
  // l'étendue à partir de son image (uBase : l'eau seule, la terre transparente, eauRive), pixel
  // par pixel (les pixels de la carte, pas ceux de l'écran). Les reflets et l'écume s'inspirent
  // du shader « 2D Pixel Art Water » de niwho (godotshaders.com, CC0) : deux bruits qui glissent
  // en sens contraires, et un dégradé depuis la rive.
  //   - la terre de la rive (uRive : l'herbe, la berge, eauRive) est rendue telle quelle, en
  //     premier : elle ne bouge pas, et rien ne se peint dessus ;
  //   - l'eau ondule (vague() : la déformation, décalée de pixels entiers) ;
  //   - de légers traits ondulés, clairs, au large : là où deux bruits (uBruit, rouge et vert,
  //     étirés en largeur) qui glissent en sens contraires se croisent, et seulement par
  //     endroits (un troisième, lent) ;
  //   - plus sombre au large (uChamp : la distance à la terre, 0 à 15 px, euclidienne) ;
  //   - de fins reflets de lumière au fond, là où l'eau est peu profonde ;
  //   - le ciel s'y reflète (uCiel, la lumière de l'heure, à uCielK) ;
  //   - le long de la rive, une ligne d'écume qui avance et recule (6), à tant de px de la terre
  //     (arrondie dans les angles : la distance est euclidienne), coupée par endroits ;
  //   - l'ombre de la berge (uOmbre), du côté d'où vient le soleil ;
  //   - les reflets de ce qui se tient au bord (uRefl), décalés comme l'eau ;
  //   - le jour, les scintillements (scintille, COMMUN).
  const EAU_FRAG = `
#pragma phaserTemplate(shaderName)
${COMMUN}
uniform sampler2D uRive;
uniform vec4 uVagues;
uniform vec4 uEcume;
uniform vec4 uOmbre;
uniform float uDehors;
float reflet(HP vec2 p, HP float t) {
  HP vec2 q = p * 0.16;
  float v = sin(q.x + 1.7 * sin(q.y * 0.8 + t * 0.7)) + sin(q.y * 1.2 + 1.5 * sin(q.x * 0.9 - t * 0.6));
  return step(abs(v), 0.07);
}
void main() {
  vec2 px = floor(outTexCoord * uTaille) + 0.5;
  vec2 uv = px / uTaille;
  vec4 rive = texture2D(uRive, uv);
  if (rive.a > 0.5) { gl_FragColor = rive; return; }
  HP float t = uTemps;
  HP vec2 pw = px + uOrigine;
  vec2 off = vague(pw, t);
  // (bornée à l'image : une texture de 256 px de côté, un bloc du grand monde, se répéterait)
  vec2 uvd = clamp(px + off, vec2(0.5), uTaille - 0.5) / uTaille;
  vec4 base = texture2D(uBase, uvd);
  if (base.a < 0.5) { gl_FragColor = vec4(0.0); return; }
  float d = texture2D(uChamp, uv).r * 15.0;
  vec3 c = base.rgb;
  float large = smoothstep(3.0, 7.0, d);
  // les traits ondulés : là où les deux bruits se croisent (étirés en largeur : des traits
  // couchés), par endroits seulement
  HP vec2 e = vec2(pw.x * 0.5, pw.y);
  float n1 = bruit(e + vec2(t * uVagues.y, t * 1.3));
  float n2 = bruit2(e - vec2(t * uVagues.y * 0.8, t * -0.9) + 41.0);
  float trait = step(abs(n1 - n2), uVagues.x) * step(uVagues.w, bruit(pw * 0.35 + vec2(17.0 - t * 0.6, 5.0)));
  c = mix(c, c * 1.06 + 0.05, trait * large * uVagues.z);
  c *= mix(1.0, 0.88, smoothstep(4.0, 15.0, d));
  c += vec3(0.05, 0.06, 0.05) * reflet(pw, t) * (1.0 - smoothstep(2.0, 7.0, d));
  c = mix(c, uCiel, uCielK);
  // l'écume : elle avance et recule, coupée par endroits
  float va = 0.5 + 0.5 * sin(t * uEcume.z + mod(pw.x + pw.y, 1396.0) * 0.045);
  float bord = uEcume.x + uEcume.y * va;
  float ecume = step(abs(d - bord), 0.5) * step(1.0, d) * step(0.38, bruit2(pw * 0.6 + vec2(t * 2.0, 0.0)));
  c = mix(c, vec3(0.93, 0.97, 1.0), ecume * uEcume.w);
  // l'ombre de la berge (uOmbre : cisaillement et écrasement du soleil, force, hauteur de la
  // berge) : un pixel d'eau est à l'ombre si la terre (uChamp, vert) est là d'où vient la lumière,
  // sous lui (le soleil est au sud) et de côté selon l'heure ; plus pâle loin du bord
  float ombre = 0.0;
  for (int i = 1; i <= 6; i++) {
    float v = float(i);
    if (v > uOmbre.w || ombre > 0.0) break;
    // (les rangées de l'image vont de bas en haut dans le shader : « sous lui », c'est -y)
    vec2 q = floor(px + vec2(-uOmbre.x * v, -uOmbre.y * v)) + 0.5;
    // (hors de l'image : la terre autour de l'étang, uDehors ; au grand monde, le bloc voisin)
    bool hors = q.y < 0.0 || q.y > uTaille.y || q.x < 0.0 || q.x > uTaille.x;
    if (hors ? uDehors > 0.5 : texture2D(uChamp, q / uTaille).g > 0.5) ombre = 1.0 - 0.45 * (v - 1.0) / max(1.0, uOmbre.w);
  }
  c = mix(c, c * vec3(0.46, 0.55, 0.64), ombre * uOmbre.z);
  // les reflets de ce qui se tient au bord, et les ronds : ils ondulent avec l'eau
  c = reflets(c, uvd);
  // les scintillements du jour, loin de la rive
  c = scintille(c, pw, d, t);
  gl_FragColor = vec4(c, 1.0);
}`;

  // Le shader de la mer (E.mer) : autrement qu'un lac, la mer bat la plage.
  //   - la houle : des crêtes parallèles à la plage (à la même distance d'elle : uChamp, rouge,
  //     jusqu'à uPortee px, où elles s'effacent : au large, la distance ne change plus), qui
  //     roulent vers elle, coupées par endroits ;
  //   - plus sombre au large ;
  //   - près de la plage, chaque crête déferle : une lame d'écume blanche, un creux sombre devant,
  //     de l'écume derrière (fiche 5c) ; puis les vagues se brisent au bord : une écume qui avance
  //     et recule avec le ressac ;
  //   - le ressac : l'eau monte sur le sable (uChamp, vert : la distance de la terre à l'eau),
  //     plus ou moins loin le long de la plage, en une nappe claire bordée d'écume, puis
  //     redescend ; le sable reste mouillé (plus sombre) derrière elle. La terre de l'étendue
  //     (uTerre : les pixels de terre de ses tuiles, eauRive) est peinte ici, sous la nappe ;
  //     ailleurs, la nappe se pose sur le sol de la carte ;
  //   - l'eau ondule et le ciel s'y reflète, comme au lac ; les scintillements du jour ; les ronds
  //     (uRefl) ondulent avec elle.
  // (Les couleurs sortent prémultipliées par leur opacité.)
  const EAU_MER = `
#pragma phaserTemplate(shaderName)
${COMMUN}
uniform sampler2D uTerre;
uniform float uPortee;
uniform vec4 uHoule;
uniform vec4 uRessac;
uniform vec3 uNappe;
void main() {
  vec2 px = floor(outTexCoord * uTaille) + 0.5;
  vec2 uv = px / uTaille;
  vec4 ch = texture2D(uChamp, uv);
  float d = ch.r * uPortee;
  float dl = ch.g * 15.0;
  HP float t = uTemps;
  HP vec2 pw = px + uOrigine;
  vec2 off = vague(pw, t);
  // (bornée à l'image : une texture de 256 px de côté, un bloc du grand monde, se répéterait)
  vec2 uvd = clamp(px + off, vec2(0.5), uTaille - 0.5) / uTaille;
  // (au large, à uPortee px de la terre et plus : ni houle, ni ressac, ni terre ; l'eau qui ondule,
  // plus sombre, le ciel et les ronds : le gros de la mer, vite fait)
  if (d > uPortee - 0.5) {
    vec4 bl = texture2D(uBase, uvd);
    gl_FragColor = vec4(reflets(scintille(mix(bl.rgb * 0.82, uCiel, uCielK), pw, d, t), uvd), 1.0);
    return;
  }
  float ph = t * uRessac.z + mod(pw.x, 1795.0) * 0.035 + 2.5 * bruit(vec2(pw.x * 0.35, 7.0));
  float monte = uRessac.x + uRessac.y * (0.5 + 0.5 * sin(ph));
  vec4 terre = texture2D(uTerre, uv);
  vec4 base = texture2D(uBase, uvd);
  if (base.a < 0.5 || terre.a > 0.5) {
    if (dl > 0.0 && dl < monte) {
      float bord = step(monte - 1.2, dl) * step(0.3, bruit2(pw * 0.7 + vec2(t, 0.0)));
      vec3 c = terre.a > 0.5 ? mix(terre.rgb, uNappe, uRessac.w) : uNappe;
      c = mix(c, vec3(0.95, 0.98, 1.0), bord);
      float a = terre.a > 0.5 ? 1.0 : max(uRessac.w, bord);
      gl_FragColor = vec4(c * a, a);
      return;
    }
    float mouille = 1.0 - smoothstep(monte, uRessac.x + uRessac.y + 1.5, dl);
    if (terre.a > 0.5) { gl_FragColor = vec4(terre.rgb * (1.0 - 0.12 * mouille), 1.0); return; }
    float a = 0.12 * mouille * step(0.0, dl);
    gl_FragColor = vec4(0.0, 0.0, 0.0, a);
    return;
  }
  vec3 c = base.rgb;
  c *= mix(1.0, 0.82, smoothstep(6.0, uPortee, d));
  float f = fract(d / uHoule.x + t * uHoule.y + 0.35 * bruit(pw * 0.25));
  float crete = step(f, uHoule.z) * step(0.4, bruit(pw * vec2(0.08, 0.3) + vec2(t * 0.4, 0.0))) * smoothstep(3.0, 8.0, d)
    * (1.0 - smoothstep(uPortee - 14.0, uPortee - 2.0, d));
  c = mix(c, c * 1.1 + 0.08, crete * uHoule.w);
  // les vagues déferlent : près de la plage, la crête se dresse en une lame d'écume blanche, un
  // creux sombre devant elle, de l'écume qui traîne derrière (coupées par endroits)
  float pres = (1.0 - smoothstep(7.0, 16.0, d)) * step(1.5, d);
  float lame = pres * step(0.3, bruit(pw * vec2(0.1, 0.35) + vec2(t * 0.3, 0.0)));
  c = mix(c, c * 0.8, step(0.86, f) * lame * 0.85);
  c = mix(c, vec3(0.95, 0.98, 1.0), step(f, 0.14) * lame * 0.95);
  c = mix(c, vec3(0.84, 0.93, 0.98), step(0.14, f) * step(f, 0.34) * lame * 0.7 * step(0.42, bruit2(pw * 0.8 + vec2(0.0, t))));
  float brise = step(d, 1.0 + 3.0 * (0.5 + 0.5 * sin(ph + 2.2))) * step(0.3, bruit2(pw * 0.5 + vec2(-t * 1.5, t)));
  c = mix(c, vec3(0.94, 0.97, 1.0), brise * 0.8);
  c = mix(c, uCiel, uCielK);
  // les scintillements du jour ; les ronds (la pêche, les poissons), qui ondulent avec l'eau
  c = scintille(c, pw, d, t);
  c = reflets(c, uvd);
  gl_FragColor = vec4(c, 1.0);
}`;

  // Le bruit du shader (uBruit) : un carreau de 128 × 128 px sans raccord, un bruit de valeurs
  // lissé (une grille de 16 × 16 nombres au hasard, interpolés), dans le rouge et le vert.
  function bruitEau(textures) {
    if (textures.exists('eau_bruit')) return;
    const N = 128, G = 16, cv = document.createElement('canvas');
    cv.width = cv.height = N;
    const g = cv.getContext('2d'), im = g.createImageData(N, N);
    const grilles = [0, 1].map(() => Array.from({ length: G * G }, () => Math.random()));
    const lisse = (x) => x * x * (3 - 2 * x);
    for (let y = 0; y < N; y++) {
      for (let x = 0; x < N; x++) {
        const gx = (x / N) * G, gy = (y / N) * G, x0 = Math.floor(gx), y0 = Math.floor(gy), fx = lisse(gx - x0), fy = lisse(gy - y0);
        const o = (y * N + x) * 4;
        grilles.forEach((gr, c) => {
          const v = (i, j) => gr[((j + G) % G) * G + ((i + G) % G)];
          const a = v(x0, y0) + (v(x0 + 1, y0) - v(x0, y0)) * fx, b = v(x0, y0 + 1) + (v(x0 + 1, y0 + 1) - v(x0, y0 + 1)) * fx;
          im.data[o + c] = Math.round(255 * (a + (b - a) * fy));
        });
        im.data[o + 3] = 255;
      }
    }
    g.putImageData(im, 0, 0);
    textures.addCanvas('eau_bruit', cv);
  }

  // La distance euclidienne de chaque pixel au plus proche des pixels `src` (src[p] = 1 : 0),
  // en px : deux passes (Felzenszwalb et Huttenlocher) ; les lignes à même distance
  // s'arrondissent dans les angles.
  function distance(src, w, h) {
    const INF = 1e9, n = Math.max(w, h), f = new Float64Array(n), dd = new Float64Array(n), vv = new Int32Array(n), zz = new Float64Array(n + 1);
    const passe = (m) => {
      let k = 0;
      vv[0] = 0; zz[0] = -INF; zz[1] = INF;
      for (let q = 1; q < m; q++) {
        let s2 = ((f[q] + q * q) - (f[vv[k]] + vv[k] * vv[k])) / (2 * q - 2 * vv[k]);
        while (s2 <= zz[k]) { k--; s2 = ((f[q] + q * q) - (f[vv[k]] + vv[k] * vv[k])) / (2 * q - 2 * vv[k]); }
        k++; vv[k] = q; zz[k] = s2; zz[k + 1] = INF;
      }
      k = 0;
      for (let q = 0; q < m; q++) { while (zz[k + 1] < q) k++; dd[q] = (q - vv[k]) * (q - vv[k]) + f[vv[k]]; }
    };
    const D2 = new Float64Array(w * h);
    for (let p = 0; p < w * h; p++) D2[p] = src[p] ? 0 : 1e7;   // (fini : une ligne sans source)
    for (let x = 0; x < w; x++) { for (let y = 0; y < h; y++) f[y] = D2[y * w + x]; passe(h); for (let y = 0; y < h; y++) D2[y * w + x] = dd[y]; }
    for (let y = 0; y < h; y++) { for (let x = 0; x < w; x++) f[x] = D2[y * w + x]; passe(w); for (let x = 0; x < w; x++) D2[y * w + x] = dd[x]; }
    for (let p = 0; p < w * h; p++) D2[p] = Math.sqrt(D2[p]);
    return D2;
  }

  // La distance de chaque pixel d'eau à la terre (eau : 1 un pixel d'eau, w × h), en px, jusqu'à
  // 15 (la mer : E.mer.portee), lissée ; la mer, aussi celle de chaque pixel de terre à l'eau (DL).
  function champEau(eau, w, h, mer) {
    // (que de l'eau, le large : partout la distance la plus grande, rien à calculer)
    const cap0 = mer ? E.mer.portee : 15;
    if (eau.every((e) => e)) return { D: new Float64Array(w * h).fill(cap0), DL: mer ? new Float64Array(w * h) : null, cap: cap0 };
    // (les petits îlots de « terre » dans l'eau, roseaux, cailloux : de l'eau pour le champ,
    // ni écume ni rive autour d'eux)
    const ilot = new Uint8Array(w * h), vu = new Uint8Array(w * h);
    for (let p0 = 0; p0 < w * h; p0++) {
      if (eau[p0] || vu[p0]) continue;
      const comp = [p0];
      vu[p0] = 1;
      for (let i = 0; i < comp.length && comp.length <= E.shader.ilot; i++) {
        const p = comp[i], x = p % w, y = (p / w) | 0;
        for (const q of [x > 0 ? p - 1 : -1, x < w - 1 ? p + 1 : -1, y > 0 ? p - w : -1, y < h - 1 ? p + w : -1]) {
          if (q >= 0 && !eau[q] && !vu[q]) { vu[q] = 1; comp.push(q); }
        }
      }
      if (comp.length <= E.shader.ilot) for (const p of comp) ilot[p] = 1;
    }
    // (la mer : sa houle porte plus loin, E.mer.portee px)
    const cap = mer ? E.mer.portee : 15;
    const terre = new Uint8Array(w * h);
    for (let p = 0; p < w * h; p++) terre[p] = !eau[p] && !ilot[p] ? 1 : 0;
    let D = distance(terre, w, h);
    for (let p = 0; p < w * h; p++) D[p] = Math.min(cap, D[p]);
    // (lissée : un flou de E.shader.lisse px, deux fois, en largeur puis en hauteur ; les
    // angles rentrants de la rive s'arrondissent aussi ; la terre reste à 0)
    const L = E.shader.lisse;
    for (let n = 0; n < 2; n++) {
      for (const [pas, long, larg] of [[1, w, h], [w, h, w]]) {
        const out = new Float64Array(w * h);
        for (let j = 0; j < larg; j++) {
          const base = pas === 1 ? j * w : j;
          for (let i = 0; i < long; i++) {
            let t = 0, c = 0;
            for (let k = Math.max(0, i - L); k <= Math.min(long - 1, i + L); k++) { t += D[base + k * pas]; c++; }
            out[base + i * pas] = t / c;
          }
        }
        D = out;
      }
    }
    for (let p = 0; p < w * h; p++) if (!eau[p] && !ilot[p]) D[p] = 0;
    // (la mer : sur la terre, la distance à l'eau, dans le vert : le ressac y monte)
    return { D, DL: mer ? distance(eau, w, h) : null, cap };
  }

  // Fiche 9a : deux fuites de la carte graphique de Phaser 4, à chaque eau vivante faite puis défaite
  // (la vue qui va et vient le long de la mer : 4 à 5 textures et autant de tampons de plus par
  // aller-retour, jamais rendus).
  //   - Une DynamicTexture naît avec une première texture (celle de sa source), aussitôt remplacée par
  //     celle de son contexte de dessin : la première n'est plus à personne. dynamique() la fait comme
  //     addDynamicTexture et efface celle qui reste orpheline.
  //   - Un Shader (add.shader) a son propre nœud de rendu, dont le tampon de sommets n'est pas rendu à
  //     sa destruction : shaderDefait() le rend.
  function dynamique(scene, cle, w, h) {
    const R = scene.sys.renderer, faire = R && R.createTextureFromSource, crees = [];
    if (faire) R.createTextureFromSource = function (...args) { const t = faire.apply(this, args); crees.push(t); return t; };
    let tex;
    try {
      tex = scene.textures.addDynamicTexture(cle, w, h);
    } finally {
      if (faire) R.createTextureFromSource = faire;
    }
    const garde = tex && tex.source[0] ? tex.source[0].glTexture : null;
    for (const t of crees) if (t && t !== garde && t.destroy) t.destroy();
    return tex;
  }
  function shaderDefait(sh) {
    const tampon = sh && sh.renderNode && sh.renderNode.vertexBufferLayout ? sh.renderNode.vertexBufferLayout.buffer : null;
    sh.destroy();
    if (tampon && tampon.webGLBuffer && tampon.destroy) tampon.destroy();
  }

  K.EAU = EAU;
  K.eauVive = {

    // L'eau vivante, posée (ou ôtée) sur les étendues animées du moment. Quand la liste des
    // étendues change (le grand monde : des blocs d'eau qui paraissent et s'en vont avec la vue),
    // seules celles qui changent sont faites ou défaites ; une étendue du monde par image au plus
    // (la faire coûte quelques ms : sa rive, sa distance à la terre), les autres attendent, avec
    // leurs tuiles animées.
    syncEau() {
      const Ph = global.Phaser;
      const on = this.sys.renderer.type === (Ph && Ph.WEBGL) && !reducedMotion();
      const areas = (on && this.eauEtendues()) || AUCUNE;
      if (this.eauAreas === areas && this.eauOn === on && !this.eauReste) return;
      if (this.eauOn !== on) this.eauOff();
      this.eauOn = on;
      this.eauAreas = areas;
      this.eauReste = false;
      if (!areas.length) { if (this.eauVive) this.eauOff(); return; }
      vaguelettes(this.textures);
      bruitEau(this.textures);
      // (les textures de chaque scène ont leur nom : celles de la ferme restent pendant qu'on
      // visite une autre carte ; elles s'en vont avec leur scène)
      if (!this.eauId) this.eauId = 's' + (++scenes);
      if (!this.eauFin) { this.eauFin = true; this.events.once('shutdown', () => this.eauOff(true)); }
      const garde = new Set(areas), avant = this.eauVive || [], vive = [], defaites = [];
      for (const v of avant) {
        if (garde.has(v.a)) { vive.push(v); continue; }
        this.eauDefait(v);
        defaites.push(v.a);
      }
      this.eauVive = vive;
      // (l'étendue reprend sa peinture d'origine, sans l'eau qui déborde)
      for (const a of defaites) if (a.sprite && a.sprite.active) this.eauRepeint(a);
      const faites = new Set(vive.map((v) => v.a));
      let monde = 0;
      for (const a of areas) {
        if (faites.has(a)) continue;
        if (a.monde && monde++ >= 1) { this.eauReste = true; continue; }
        vive.push(this.eauFait(a));
      }
      this.eauVive = vive;
    },

    // L'eau vivante d'une étendue : le shader, ses textures, ses reflets. Un seul objet de scène :
    // le shader lit l'image de l'étendue (uBase), le champ, les vaguelettes et le bruit (communs à
    // toutes), la rive (uRive) et la texture des reflets (uRefl, stepReflets).
    eauFait(a) {
      const id = this.eauId, i = (this.eauN = (this.eauN || 0) + 1);
      const w = a.tex.width, h = a.tex.height;
      const champ = this.textures.createCanvas(`eau_champ_${id}_${i}`, w, h);
      const rive = this.textures.createCanvas(`eau_rive_${id}_${i}`, w, h);
      // les reflets et les ronds : une texture par étendue, redessinée quand ils changent
      // (stepReflets), lue par le shader avec le même décalage que l'eau, sur l'eau seulement
      const refl = dynamique(this, `eau_refl_${id}_${i}`, w, h);
      refl.clear().render();
      const uni = { temps: 0, ciel: [1, 1, 1], cielK: 0, ombre: [0, 0, 0, 0], scint: [0, 0, E.scintille.cellule, E.scintille.vie], dore: 0 };
      const S = E.shader, M = E.mer, Sc = E.scintille;
      const vit = [E.vitesse[0], E.vitesse[1], -E.vitesse[1], E.vitesse[0] * 0.7];
      // (l'origine de l'étendue : ses bruits et ses vaguelettes pris en px de la carte, pour qu'ils
      // se suivent d'un bloc d'eau du monde au suivant ; à la ferme, ceux de son image, comme toujours)
      const origine = a.monde ? [a.x, a.y] : [0, 0];
      const commun = (set) => {
        set('uTaille', [w, h]); set('uTemps', uni.temps); set('uOndule', E.ondule); set('uVit', vit);
        set('uCiel', uni.ciel); set('uCielK', uni.cielK); set('uOrigine', origine);
        set('uScint', uni.scint); set('uDore', uni.dore); set('uScintClair', Sc.clair); set('uScintDore', Sc.dore);
      };
      // (la mer, EAU_MER : la houle, le ressac ; la terre de ses tuiles, peinte par le shader)
      const shader = a.mer ? this.add.shader({
        name: 'eauMer', fragmentSource: EAU_MER, initialUniforms: { uBase: 0, uChamp: 1, uVague: 2, uBruit: 3, uRefl: 4, uTerre: 5 },
        setupUniforms: (set) => {
          commun(set);
          set('uPortee', M.portee);
          set('uHoule', [M.houle.ecart, M.houle.vitesse, M.houle.largeur, M.houle.clair]);
          set('uRessac', [M.ressac.base, M.ressac.va, M.ressac.vitesse, M.ressac.alpha]);
          set('uNappe', M.ressac.nappe);
        },
      }, a.x, a.y, w, h, [a.tex.key, champ.key, 'eau_vague', 'eau_bruit', refl.key, rive.key]) : this.add.shader({
        name: 'eauVive', fragmentSource: EAU_FRAG, initialUniforms: { uBase: 0, uChamp: 1, uVague: 2, uBruit: 3, uRefl: 4, uRive: 5 },
        setupUniforms: (set) => {
          commun(set);
          set('uVagues', [S.trait, S.glisse, S.clair, S.endroits]);
          set('uEcume', [S.ecume.pres, S.ecume.va, S.ecume.vitesse, S.ecume.alpha]);
          set('uOmbre', uni.ombre); set('uDehors', a.monde ? 0 : 1);
        },
      }, a.x, a.y, w, h, [a.tex.key, champ.key, 'eau_vague', 'eau_bruit', refl.key, rive.key]);
      shader.setOrigin(0).setDepth(a.sprite.depth);
      // (l'image de l'étendue, sous le shader : transparente ; au grand monde, cachée, elle ne se
      // dessine même plus)
      if (a.monde) a.sprite.setVisible(false); else a.sprite.setAlpha(0);
      a.vive = true;
      // les cases d'eau de l'étendue (les ronds, les reflets de la nuit)
      const eau = [];
      if (a.monde) for (const c of a.ordre) eau.push({ x: (c % a.cols) * T, y: Math.floor(c / a.cols) * T });
      else for (const k of this.waters().keys()) { const [x, y] = k.split(',').map(Number); if (x >= a.x && y >= a.y && x < a.x + w && y < a.y + h) eau.push({ x, y }); }
      const v = { a, champ, shader, uni, eau, rive, refl, reflVide: true, empreinte: 0, i, id, profond: null, eauPx: null, ronds: [] };
      this.eauRive(v);
      return v;
    },

    // Une case d'eau ou de rive (x, y : son coin, en px) de l'étendue a ? Ses cases (a.cells, les
    // numéros des cases qui portent une tuile d'eau animée). Pas waters() (la vie d'ambiance) : il
    // juge chaque case sur sa tuile entière, et une tuile d'angle rentrant (surtout de l'herbe, un
    // coin d'eau) y est de la terre : son coin d'eau restait figé sur l'image de la rive, un carré
    // plus clair, et l'écume suivait le bord carré de la case, en escalier.
    eauCase(a, x, y) {
      const cols = a.monde ? a.cols : this.grid.cols;
      return a.cells.has(Math.floor(y / T) * cols + Math.floor(x / T));
    },

    // L'eau vivante d'une étendue défaite (ses images, ses textures) ; l'étendue reprend son image.
    eauDefait(v) {
      if (v.a.sprite && v.a.sprite.active) { if (v.a.monde) v.a.sprite.setVisible(!this.tilesStill); else v.a.sprite.setAlpha(1); }
      v.a.vive = false;
      shaderDefait(v.shader);
      for (const k of ['rive', 'refl', 'champ']) this.textures.remove(`eau_${k}_${v.id}_${v.i}`);
    },

    // Après chaque peinture d'une étendue (à la ferme : sol.js paintAnimArea) : ses pixels de terre (ni bleus
    // ni blancs : l'herbe, la terre des rives) vont sur l'image de la rive, qui ne bouge pas ; sous
    // eux, l'eau déborde de `ENTRE` px (la couleur de l'eau voisine) : en ondulant, le liseré
    // blanc de la rive et l'eau glissent sous la terre, jamais la terre sur l'eau. `profond` : les
    // pixels d'eau à `LOIN` px au moins de la terre (où naissent les scintillements).
    eauRive(v) {
      const ENTRE = 2, LOIN = 3;
      const w = v.a.tex.width, h = v.a.tex.height, ctx = v.a.tex.getContext();
      const im = ctx.getImageData(0, 0, w, h), d = im.data;
      // (de l'eau : dans une case d'eau ou de rive (waters), un pixel franchement bleu ou blanc
      // bleuté, le liseré ; ailleurs, et l'herbe sombre, les fleurs, les cailloux gris : la terre)
      const cases = new Uint8Array(Math.ceil(w / T) * Math.ceil(h / T)), cw = Math.ceil(w / T);
      for (let cy = 0; cy * T < h; cy++) for (let cx = 0; cx < cw; cx++) cases[cy * cw + cx] = this.eauCase(v.a, v.a.x + cx * T, v.a.y + cy * T) ? 1 : 0;
      const eau = new Uint8Array(w * h);
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const p = y * w + x, o = p * 4, r = d[o], g = d[o + 1], b = d[o + 2];
          if (!d[o + 3] || !cases[Math.floor(y / T) * cw + Math.floor(x / T)]) continue;
          const bleu = b >= r + 40 && b >= g, blanc = Math.min(r, g, b) >= 190 && b >= r && b >= g - 8;
          eau[p] = bleu || blanc ? 1 : 0;
        }
      }
      // la berge (E.berge ; pas la mer, qui a sa plage) : peinte sur l'eau, elle devient de la terre
      const berge = v.a.mer ? null : this.eauBerge(eau, d, w, h, v.a);
      // la rive : les pixels de terre (et la berge)
      const rc = v.rive.getContext(), ri = rc.createImageData(w, h);
      for (let p = 0; p < w * h; p++) if (!eau[p] && d[p * 4 + 3]) for (let c = 0; c < 4; c++) ri.data[p * 4 + c] = d[p * 4 + c];
      if (berge) for (const [p, col] of berge) { for (let c = 0; c < 3; c++) ri.data[p * 4 + c] = col[c]; ri.data[p * 4 + 3] = 255; }
      rc.putImageData(ri, 0, 0);
      v.rive.refresh();
      // (les reflets ne se voient que sur l'eau : le shader rend la rive en premier)
      v.eauPx = eau;
      // l'eau déborde sous la terre, ENTRE px (de proche en proche)
      let bord = eau.slice();
      for (let n = 0; n < ENTRE; n++) {
        const suite = bord.slice();
        for (let y = 0; y < h; y++) {
          for (let x = 0; x < w; x++) {
            const p = y * w + x;
            if (bord[p] || !d[p * 4 + 3]) continue;
            const q = x > 0 && bord[p - 1] ? p - 1 : x < w - 1 && bord[p + 1] ? p + 1 : y > 0 && bord[p - w] ? p - w : y < h - 1 && bord[p + w] ? p + w : -1;
            if (q < 0) continue;
            for (let c = 0; c < 3; c++) d[p * 4 + c] = d[q * 4 + c];
            suite[p] = 1;
          }
        }
        bord = suite;
      }
      // (le reste de la terre : transparent sous la rive ; en ondulant, il ne déborde pas d'un
      // pixel sur l'herbe d'à côté, hors de l'étendue)
      for (let p = 0; p < w * h; p++) if (!bord[p]) d[p * 4 + 3] = 0;
      ctx.putImageData(im, 0, 0);
      v.a.tex.refresh();
      // (l'eau loin de la terre : ni la rive, ni son liseré)
      // (tout le carré de 2 LOIN + 1 px autour en eau : d'abord chaque rangée, puis chaque colonne)
      const profond = new Uint8Array(w * h), rang = new Uint8Array(w * h);
      for (let y = 0; y < h; y++) {
        for (let x = LOIN; x < w - LOIN; x++) {
          let ok = 1;
          for (let dx = -LOIN; dx <= LOIN; dx++) if (!eau[y * w + x + dx]) { ok = 0; break; }
          rang[y * w + x] = ok;
        }
      }
      for (let y = LOIN; y < h - LOIN; y++) {
        for (let x = LOIN; x < w - LOIN; x++) {
          let ok = 1;
          for (let dy = -LOIN; dy <= LOIN; dy++) if (!rang[(y + dy) * w + x]) { ok = 0; break; }
          profond[y * w + x] = ok;
        }
      }
      v.profond = profond;
      // le champ : la distance de chaque pixel d'eau à la terre (en px, jusqu'à 15 ; la mer, plus
      // loin), dans le rouge (le shader : uChamp)
      if (v.champ) {
        // (au grand monde, un bloc d'eau voit la terre de ses voisins, jusqu'à E.mer.portee px :
        // sa distance à la terre continue celle d'à côté, sans couture d'un bloc à l'autre)
        const ext = v.a.monde && this.eauMarge ? this.eauMarge(v.a, eau) : null;
        let { D, DL, cap } = ext ? champEau(ext.eau, ext.w, ext.h, v.a.mer) : champEau(eau, w, h, v.a.mer);
        if (ext) {
          const D2 = new Float64Array(w * h), DL2 = DL ? new Float64Array(w * h) : null;
          for (let y = 0; y < h; y++) {
            for (let x = 0; x < w; x++) {
              const q = (y + ext.m) * ext.w + x + ext.m;
              D2[y * w + x] = D[q];
              if (DL2) DL2[y * w + x] = DL[q];
            }
          }
          D = D2; DL = DL2;
        }
        const cc = v.champ.getContext(), ci = cc.createImageData(w, h);
        for (let p = 0; p < w * h; p++) {
          ci.data[p * 4] = Math.round((D[p] * 255) / cap);
          if (DL) ci.data[p * 4 + 1] = Math.round((Math.min(15, DL[p]) * 255) / 15);
          // (un lac, une rivière : la terre dans le vert, pour l'ombre de la berge)
          else if (!eau[p]) ci.data[p * 4 + 1] = 255;
          ci.data[p * 4 + 3] = 255;
        }
        cc.putImageData(ci, 0, 0);
        v.champ.refresh();
      }
    },

    // La berge d'une étendue (E.berge) : l'eau est plus basse que l'herbe. Sous chaque rive du
    // haut (un pixel d'eau sous un pixel de terre), une paroi de terre qui descend dans l'eau, son
    // rebord d'herbe assombri en haut, des racines et des cailloux par endroits ; sur les côtés, la
    // tranche de la paroi, un pixel. Les pixels peints deviennent de la terre (`eau` mis à 0) :
    // l'écume, les reflets et l'ombre partent de son pied. Une petite terre dans l'eau (roseaux,
    // cailloux : E.shader.ilot px au plus) n'a pas de berge. Rend [[pixel, [r, g, b]]].
    eauBerge(eau, d, w, h, a) {
      const B = E.berge, n = w * h;
      // (la grande terre : les composantes de terre de plus de E.shader.ilot px)
      const grande = new Uint8Array(n), vu = new Uint8Array(n);
      for (let p0 = 0; p0 < n; p0++) {
        if (eau[p0] || vu[p0] || !d[p0 * 4 + 3]) continue;
        const comp = [p0];
        vu[p0] = 1;
        for (let i = 0; i < comp.length; i++) {
          const p = comp[i], x = p % w, y = (p / w) | 0;
          for (const q of [x > 0 ? p - 1 : -1, x < w - 1 ? p + 1 : -1, y > 0 ? p - w : -1, y < h - 1 ? p + w : -1]) {
            if (q >= 0 && !eau[q] && !vu[q] && d[q * 4 + 3]) { vu[q] = 1; comp.push(q); }
          }
        }
        if (comp.length > E.shader.ilot) for (const p of comp) grande[p] = 1;
      }
      // (l'eau à l'œil : un pixel bleu ou blanc bleuté, même dans une case de terre : les tuiles de
      // la rive du haut ont une bande d'eau dans leur case, qui ne bouge pas)
      const vis = new Uint8Array(n);
      for (let p = 0; p < n; p++) {
        const o = p * 4, r = d[o], g = d[o + 1], b = d[o + 2];
        vis[p] = d[o + 3] && ((b >= r + 40 && b >= g) || (Math.min(r, g, b) >= 190 && b >= r && b >= g - 8)) ? 1 : 0;
      }
      // (un hasard fixe, d'après la place du pixel sur la carte)
      const ax = a.x | 0, ay = a.y | 0;
      const hasard = (x, y, k) => { let t = Math.imul((x + ax) * 374761393 + (y + ay) * 668265263 + k * 2246822519, 1274126177); t ^= t >>> 13; return (Math.imul(t, 1103515245) >>> 0) / 4294967296; };
      const out = new Map();
      const sombre = (c, f) => [Math.round(c[0] * f), Math.round(c[1] * f), Math.round(c[2] * f)];
      // sous la rive du haut : la paroi
      for (let y = 1; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const p = y * w + x;
          if (!vis[p] || vis[p - w] || !grande[p - w]) continue;
          const haut = B.haut[hasard(x, 0, 1) < 0.5 ? 0 : 1];
          for (let k = 0; k < haut && y + k < h; k++) {
            const q = p + k * w;
            if (!vis[q] || out.has(q)) break;
            let col;
            if (k === 0) col = sombre([d[(p - w) * 4], d[(p - w) * 4 + 1], d[(p - w) * 4 + 2]], B.rebord);
            else {
              const r = hasard(x, y + k, 2);
              col = r < 1 / B.racine ? B.clair : r < 1 / B.racine + 1 / B.caillou ? B.sombre : sombre(B.terre, 1 - B.fonce * (k - 1));
            }
            out.set(q, col);
          }
        }
      }
      // sur les côtés : la tranche de la paroi (claire à gauche, où le soleil du matin la prend ;
      // sombre à droite)
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const p = y * w + x;
          if (!vis[p] || out.has(p)) continue;
          if (x > 0 && !vis[p - 1] && grande[p - 1]) out.set(p, B.cote[0]);
          else if (x < w - 1 && !vis[p + 1] && grande[p + 1]) out.set(p, B.cote[1]);
        }
      }
      for (const p of out.keys()) eau[p] = 0;
      return out;
    },

    // L'eau vivante ôtée (fin : la scène s'en va, rien à repeindre).
    eauOff(fin) {
      const avant = this.eauVive || [];
      for (const v of avant) this.eauDefait(v);
      this.eauVive = null;
      this.eauAreas = null;
      for (const o of this.refletPool || []) o.destroy();
      this.refletPool = null;
      // (l'étendue reprend sa peinture d'origine, sans l'eau qui déborde)
      if (!fin) for (const v of avant) if (v.a.sprite && v.a.sprite.active) this.eauRepeint(v.a);
    },

    // À chaque image : les uniformes du shader (le temps : les vaguelettes glissent, les
    // scintillements naissent et s'éteignent ; le ciel et le soleil de l'heure), les ronds, les
    // reflets s'ils ont changé.
    stepEau(time, dt) {
      this.syncEau();
      if (!this.eauVive) return;
      const s = time / 1000, cam = this.cameras.main.worldView;
      const heure = this.eauHeure(), sol = K.soleil(heure);
      const ciel = K.lumiere(heure == null ? 12 : heure).map((c, k) => (c / 255) * E.shader.bleu[k]);
      for (const v of this.eauVive) {
        const a = v.a;
        const vu = !(a.x > cam.right || a.y > cam.bottom || a.x + a.tex.width < cam.x || a.y + a.tex.height < cam.y);
        if (!vu) continue;
        // (le shader : le temps, le ciel de l'heure)
        v.uni.temps = s;
        v.uni.ciel = ciel;
        // (l'ombre de la berge : le soleil de l'heure, rien la nuit)
        v.uni.ombre = sol ? [sol.sh, sol.k, (E.berge.ombre.alpha * sol.alpha) / K.SOLEIL.alpha, E.berge.ombre.haut] : [0, 0, 0, 0];
        v.uni.cielK = E.shader.ciel;
        // (les scintillements : la part des cellules allumées, plus quand le soleil est bas ; leur
        // éclat, celui du soleil, rien la nuit ; la part des dorés, le soir)
        const Sc = E.scintille, parCellule = (Sc.cellule * Sc.cellule) / (T * T);
        v.uni.scint[0] = sol ? Sc.parCase * (0.4 + 0.6 * sol.k) * parCellule : 0;
        v.uni.scint[1] = sol ? (Sc.alpha * sol.alpha) / K.SOLEIL.alpha : 0;
        v.uni.dore = sol ? Math.max(0, (sol.k - 0.6) / 0.4) * Sc.doreMax : 0;
        this.stepRonds(v, dt);
        this.stepReflets(v);
      }
      this.stepRives(dt);
    },

    // Un rond qui s'élargit sur l'eau, en (x, y) (px de carte) ; faux si l'eau vivante n'est pas
    // là (peche.js ripple dessine alors le sien).
    rond(x, y, gros) {
      const v = this.eauVive && this.eauVive.find((e) => x >= e.a.x && y >= e.a.y && x < e.a.x + e.a.tex.width && y < e.a.y + e.a.tex.height && e.eauPx && e.eauPx[Math.floor(y - e.a.y) * e.a.tex.width + Math.floor(x - e.a.x)]);
      if (!v) return !!this.eauVive;
      v.ronds.push({ x: Math.round(x), y: Math.round(y), t: 0, vie: E.ronds.vie * (gros ? 1.3 : 1), a: gros ? 1 : 0.7 });
      return true;
    },

    // Les ronds d'une étendue : ils vieillissent ; de petits ronds naissent au hasard (des
    // insectes), et de temps en temps un poisson saute.
    stepRonds(v, dt) {
      const R = E.ronds;
      for (let j = v.ronds.length - 1; j >= 0; j--) if ((v.ronds[j].t += dt) >= v.ronds[j].vie) v.ronds.splice(j, 1);
      if (!v.profond) return;
      const n = v.eau.length / 100;
      // (des insectes sur un lac, pas sur la mer)
      if (!v.a.mer && Math.random() < R.hasard * n * dt) {
        const q = this.eauLoin(v);
        if (q) v.ronds.push({ x: q.x, y: q.y, t: 0, vie: R.vie * 0.7, a: 0.45, petit: true });
      }
      if (v.eau.length >= R.poissons && !v.saut && Math.random() < dt / R.saut) this.sautPoisson(v);
    },

    // Un point de l'eau loin des rives (v.profond), au hasard ; null si on n'en trouve pas.
    eauLoin(v) {
      const w = v.a.tex.width;
      for (let essai = 0; essai < 10; essai++) {
        const c = v.eau[(Math.random() * v.eau.length) | 0];
        const px = Math.floor(c.x - v.a.x + Math.random() * T), py = Math.floor(c.y - v.a.y + Math.random() * T);
        if (v.profond[py * w + px]) return { x: v.a.x + px, y: v.a.y + py };
      }
      return null;
    },

    // Un poisson saute hors de l'eau et y retombe un peu plus loin : un rond où il part, un
    // autre où il replonge (son image : eauPoissons).
    sautPoisson(v) {
      const R = E.ronds, cles = this.eauPoissons ? this.eauPoissons() : null;
      const p0 = this.eauLoin(v);
      if (!p0 || !cles || !cles.length) return;
      const dir = Math.random() < 0.5 ? -1 : 1, p1 = { x: p0.x + dir * (8 + Math.random() * 10), y: p0.y + (Math.random() * 6 - 3) };
      const w = v.a.tex.width;
      if (!v.profond[Math.floor(p1.y - v.a.y) * w + Math.floor(p1.x - v.a.x)]) return;
      const key = cles[(Math.random() * cles.length) | 0];
      v.saut = true;
      this.rond(p0.x, p0.y, true);
      const img = this.add.image(p0.x, p0.y, key).setOrigin(0.5, 1).setDepth(p0.y + 0.5).setFlipX(dir < 0);
      const t0 = { k: 0 };
      this.tweens.add({
        targets: t0, k: 1, duration: R.sautMs, ease: 'Sine.easeInOut',
        onUpdate: () => {
          const k = t0.k;
          img.setPosition(p0.x + (p1.x - p0.x) * k, p0.y + (p1.y - p0.y) * k - Math.sin(k * Math.PI) * R.sautHaut);
          img.setAngle(dir * (k - 0.5) * 70);
        },
        onComplete: () => { img.destroy(); this.rond(p1.x, p1.y, true); v.saut = false; },
      });
    },

    // Ceux qui longent l'eau (le personnage, la famille) : un rond à leurs pieds, de temps en
    // temps, quand ils marchent au bord.
    stepRives(dt) {
      const R = E.ronds, qui = this.eauMarcheurs();
      if (!this.eauPas) this.eauPas = new Map();
      for (const q of qui) {
        const avant = this.eauPas.get(q.id) || { x: q.x, y: q.y, t: 0 };
        avant.t -= dt;
        const bouge = Math.hypot(q.x - avant.x, q.y - avant.y) > 0.3;
        avant.x = q.x; avant.y = q.y;
        this.eauPas.set(q.id, avant);
        if (!bouge || avant.t > 0) continue;
        // (l'eau la plus proche de ses pieds, à `rive` px au plus)
        let best = null;
        for (let dy = -2; dy <= R.rive && !best; dy++) {
          for (const dx of [0, -2, 2, -4, 4, -R.rive, R.rive]) {
            const x = Math.round(q.x + dx), y = Math.round(q.y + dy);
            const v = this.eauVive.find((e) => x >= e.a.x && y >= e.a.y && x < e.a.x + e.a.tex.width && y < e.a.y + e.a.tex.height);
            if (v && v.eauPx && v.eauPx[(y - v.a.y) * v.a.tex.width + x - v.a.x]) { best = { x, y }; break; }
          }
        }
        if (!best) continue;
        avant.t = R.pas;
        this.rond(best.x, best.y + 1);
      }
    },

    // Les morceaux d'arbres de la carte (decor.js, arbre_occ_*) portent aussi leur ombre sur
    // l'herbe, à demi transparente : leur reflet n'en garde que les pixels opaques (une copie,
    // faite une fois). Les autres images se reflètent telles quelles.
    eauOpaque(key) {
      if (!key.startsWith('arbre_occ_')) return key;
      const k = 'eau_op_' + key;
      if (this.textures.exists(k)) return k;
      const src = this.textures.get(key).getSourceImage(), w = src.width, h = src.height;
      const c = this.textures.createCanvas(k, w, h), g = c.getContext();
      g.drawImage(src, 0, 0);
      const im = g.getImageData(0, 0, w, h);
      for (let i = 3; i < im.data.length; i += 4) if (im.data[i] < 250) im.data[i] = 0;
      g.putImageData(im, 0, 0);
      c.refresh();
      return k;
    },

    // Les reflets et les ronds d'une étendue : ce qui se tient au bord (une image debout dont le
    // pied est au-dessus de l'étendue, à E.miroir.portee px au plus, ou dedans), retourné sous son
    // pied ; les ronds. Dessinés dans la texture uRefl du shader, qui la lit sur l'eau seulement et
    // la décale comme l'eau. Redessinés seulement quand ils ont changé : une empreinte (la place,
    // l'image, le sens, l'opacité, l'échelle de chaque image reflétée ; les ronds, qui changent à
    // chaque image tant qu'ils vivent) comparée à celle de l'image d'avant.
    stepReflets(v) {
      const a = v.a, w = a.tex.width, h = a.tex.height, R = E.miroir;
      if (!this.refletPool) this.refletPool = [];
      const pool = this.refletPool;
      // (la mer, agitée par la houle, ne renvoie pas d'image nette : ni reflets, seulement les ronds)
      const mer = a.mer;
      // (les images près de l'étendue, relevées toutes les R.liste ms parmi toutes celles de la scène : les
      // passer toutes en revue à chaque image coûtait cher sur une grosse partie, plusieurs milliers)
      const now = performance.now();
      if (!mer && (!v.pres || now - v.presT >= R.liste)) {
        const m = R.marge, pres = [];
        for (const o of this.children.list) {
          if (o.type !== 'Image' && o.type !== 'Sprite') continue;
          const L = o.displayWidth, H = o.displayHeight, gauche = o.x - o.originX * L, pied = o.y + (1 - o.originY) * H;
          if (pied < a.y - R.portee - m || pied > a.y + h + m || gauche > a.x + w + m || gauche + L < a.x - m) continue;
          pres.push(o);
        }
        v.pres = pres;
        v.presT = now;
      }
      // ce qui se reflète en ce moment, et son empreinte
      const vus = this.eauVus || (this.eauVus = []);
      vus.length = 0;
      let emp = 7;
      const mele = (x) => { emp = (Math.imul(emp ^ (x | 0), 0x9e3779b1) + 0x7f4a7c15) | 0; };
      for (const o of mer ? AUCUNE : v.pres) {
        if (!o.active) continue;
        if (!o.visible || o.alpha < 0.3 || (o.type !== 'Image' && o.type !== 'Sprite') || o.depth < 1 || o.blendMode !== 0) continue;
        const key = o.texture && o.texture.key;
        if (!key || key.startsWith('eau_') || key === '__DEFAULT' || key === '__MISSING') continue;
        const H = o.displayHeight, L = o.displayWidth;
        const pied = o.y + (1 - o.originY) * H, gauche = o.x - o.originX * L;
        if (pied < a.y - R.portee || pied > a.y + h || gauche > a.x + w || gauche + L < a.x || H > R.haut) continue;
        vus.push(o);
        mele(cleId(key)); mele(cleId(String(o.frame.name)));
        mele(o.x * 16); mele(pied * 16); mele(o.scaleX * 1024); mele(o.scaleY * 1024);
        mele(o.angle * 64); mele(o.alpha * 255); mele((o.flipX ? 1 : 0) + (o.flipY ? 2 : 0)); mele(o.originX * 1024);
      }
      mele(v.ronds.length);
      for (const d of v.ronds) { mele(d.x); mele(d.y); mele(d.t * 1000); }
      if (!vus.length && !v.ronds.length) {
        // (rien à montrer : la texture vidée une fois)
        if (!v.reflVide) { v.refl.clear().render(); v.reflVide = true; v.empreinte = 0; }
        return;
      }
      if (emp === v.empreinte && !v.reflVide) return;
      v.empreinte = emp;
      v.reflVide = false;
      let n = 0;
      const prend = () => pool[n] || (pool[n] = this.make.image({ x: 0, y: 0, key: 'eau_scintille' }, false));
      v.refl.clear();
      for (const o of vus) {
        const H = o.displayHeight, pied = o.y + (1 - o.originY) * H;
        const r = prend();
        n++;
        r.setTexture(this.eauOpaque(o.texture.key), o.frame.name).setOrigin(o.originX, 0).setFlip(o.flipX, !o.flipY)
          .setScale(o.scaleX, o.scaleY * R.ecrase).setAngle(-o.angle).setAlpha(R.alpha * o.alpha).setTint(R.teinte)
          .setPosition(o.x - a.x, pied - a.y);
        v.refl.draw(r);
      }
      // les ronds
      const N = E.ronds.images;
      for (const d of v.ronds) {
        const r = prend();
        n++;
        const k = d.t / d.vie, f = Math.min(N - 1, Math.floor(k * (d.petit ? N / 2 : N)));
        r.setTexture('eau_ronds', f).setOrigin(0.5).setFlip(false, false).setScale(1).setAngle(0).setTint(0xffffff)
          .setAlpha(E.ronds.alpha * d.a * (1 - k)).setPosition(d.x - a.x, d.y - a.y);
        v.refl.draw(r);
      }
      v.refl.render();
    },

    // La nuit, les reflets dans le voile de l'heure : ajoutés à `out` (les lumières des
    // lanternes et des maisons, qu'ils reflètent ; chantier.js stepLanterns) ; `nuit` : V.nuit.
    stepEauLumiere(out, nuit, time) {
      if (!this.eauVive || nuit < 0.15) return;
      const R = E.reflets, k = Math.min(1, (nuit - 0.15) / 0.35), s = time / 1000;
      const W = this.waters();
      const tremble = (x, y, i) => Math.round(Math.sin(s * R.tremble + y * 0.7 + i) * R.ecart);
      const reflets = out.slice();
      for (const v of this.eauVive) {
        // (pas au grand monde : un bloc d'eau n'est qu'un morceau d'une étendue, la lune s'y
        // refléterait au milieu de chacun)
        if (!v.eau.length || v.a.monde) continue;
        // la lune : une colonne de traits au milieu de l'étendue, du haut de l'eau vers le bas
        const xs = v.eau.map((c) => c.x), ys = v.eau.map((c) => c.y);
        const cx = Math.round((Math.min(...xs) + Math.max(...xs) + T) / 2), y0 = Math.min(...ys), y1 = Math.max(...ys) + T;
        for (let y = y0 + 3, i = 0; y < y1 - 2; y += R.pas, i++) {
          const x = cx + tremble(cx, y, i);
          if (!W.has(Math.floor(x / T) * T + ',' + Math.floor(y / T) * T) || !v.profond[(y - v.a.y) * v.a.tex.width + x - v.a.x]) continue;
          // (des traits brisés, qui s'allument et s'éteignent, plus pâles vers les bords de l'eau)
          const v1 = Math.abs(Math.sin(s * 1.1 + i * 2.3)) * Math.abs(Math.sin(s * 0.7 + i * 0.9));
          if (v1 < 0.15) continue;
          const bord = Math.sin((Math.PI * (y - y0)) / (y1 - y0));
          const l = R.lune.long * (0.35 + 0.65 * v1) * (0.5 + 0.5 * bord);
          out.push({ key: 'lueur', x, y, tint: R.lune.teinte, alpha: R.lune.alpha * k * (0.4 + 0.6 * v1) * bord, scaleX: l / 64, scaleY: 1.6 / 64 });
        }
      }
      // les lumières posées au bord : leur reflet sur l'eau, juste en dessous d'elles
      for (const L of reflets) {
        if (L.alpha < 0.05) continue;
        const cx = Math.round(L.x), top = Math.floor(L.y / T) * T;
        for (let d = 1, i = 0; d <= R.portee; d++) {
          const y = top + d * T;
          if (!W.has(Math.floor(cx / T) * T + ',' + y)) continue;
          for (let yy = y + 2; yy < y + T; yy += R.pas, i++) {
            out.push({ key: 'lueur', x: cx + tremble(cx, yy, i), y: yy, tint: L.tint, alpha: Math.min(1, L.alpha) * R.lumiere * k / d, scaleX: (R.lune.long * 0.7) / 64, scaleY: 1.6 / 64 });
          }
        }
      }
    },
  };
})(window);
