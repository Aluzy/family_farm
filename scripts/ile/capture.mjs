#!/usr/bin/env node
// Une capture de la scène d'une partie neuve sur l'île (docs/ile-300.md, étape 7b) : la page servie en local, dans
// Chromium (Playwright), à l'écran d'un téléphone ; les erreurs de la page affichées.
// Usage : node scripts/ile/capture.mjs [--graine 1] [--sortie apercus-ile/scene.png] [--attente 8000] [--ecran 412x860] [--clic <sélecteur>] [--touche m] [--foret] [--mesure 8] [--marche] [--processeur 4] [--profil] [--heure 20] [--labour --mures] [--port [--sens S]]
import { createServer } from 'node:http';
import { existsSync, mkdirSync, readFileSync, statSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, extname, join, normalize, sep } from 'node:path';
import { ROOT } from '../lib/engine-source.mjs';
import * as E from '../../js/engine/index.js';

const args = process.argv.slice(2);
const opt = (n, d) => {
  const i = args.indexOf(`--${n}`);
  return i >= 0 ? args[i + 1] : d;
};
// (--site : le site construit, _site/ de scripts/build-site.mjs, celui qui est publié)
const RACINE = args.includes('--site') ? join(ROOT, '_site') : ROOT;
const SORTIE = opt('sortie', 'apercus-ile/scene.png'),
  ATTENTE = Number(opt('attente', 8000));
const s = E.createNewGame(Number(opt('graine', 1)), { nom: 'Essai' });
if (E.finishSetup) E.finishSetup(s);
// (--objectifs : la partie commencée comme par l'écran de départ, js/engine/objectifs.js commencerObjectifs)
if (args.includes('--objectifs')) (await import('../../js/engine/objectifs.js')).commencerObjectifs(s);
// (--tente : la tente posée deux cases à droite du point d'apparition)
// (--outils : la hache, la pioche et la faux, et de l'énergie, pour essayer les gestes avec --action)
if (args.includes('--outils')) {
  s.outils = { ...(s.outils || {}), hache: true, pioche: true, faux: true };
  s.stamina = 1000;
}
// (--fonde : le village fondé (la place, le port, un villageois : tests/engine/aide.mjs fonderVillage), le personnage
// devant le comptoir, à 10 h, de quoi vendre)
if (args.includes('--fonde')) {
  const { fonderVillage, reach } = await import('../../tests/engine/aide.mjs');
  reach(s, 'marche');
  fonderVillage(s);
  const { portIle } = await import('../../js/engine/ile/port-ile.js');
  s.monde.ici = portIle(s).devant;
  s.awakeMs = E.awakeMsAtHour(10);
  for (const [k, n] of Object.entries({ carotte: 12, aubergine: 5, oeuf: 6, bois: 20 })) E.addItem(s, k, n);
}
// (--port : le port posé sur la rive la plus proche (son ponton, sa halle : js/engine/ile/port-ile.js), le personnage
// à côté de sa halle ; sa disposition dans le journal)
if (args.includes('--port')) {
  const { ileDeLaPartie } = await import('../../js/engine/ile/jeu.js');
  const ile = ileDeLaPartie(s),
    n = ile.n,
    ici = s.monde.ici,
    VI = E.DATA.ILE.VILLAGE;
  const d = (i) => Math.abs((i % n) - (ici % n)) + Math.abs(Math.floor(i / n) - Math.floor(ici / n));
  const { refusPoseIle } = await import('../../js/engine/ile/village.js');
  const sens = opt('sens', null);
  const rives = [];
  for (let i = n; i < n * n - n; i++) if (d(i) < 120) rives.push(i);
  rives.sort((a, b) => d(a) - d(b));
  let posee = null;
  for (const i of rives) {
    if (refusPoseIle(s, VI.PORT, [i]) !== null) continue;
    E.addItem(s, VI.PORT, 1);
    const r = E.poserBloc(s, VI.PORT, i);
    if (r.ok && (!sens || s.portIle.sens === sens)) {
      posee = i;
      break;
    }
    if (r.ok) {
      E.reprendreBloc(s, i);
    }
  }
  console.log('port', posee, JSON.stringify(s.portIle));
  if (posee !== null) {
    const { portIle } = await import('../../js/engine/ile/port-ile.js');
    s.monde.ici = portIle(s).devant + Number(opt('decale', 2)) * n; // (sous le devant du comptoir : --decale cases)
  }
}
// (--chemin : un chemin de 6 cases, trois au-dessus du personnage, ses cases dans le journal)
if (args.includes('--chemin')) {
  const W = E.farmTerrain(s).LARGEUR;
  for (let dx = -2; dx < 4; dx++) {
    E.addItem(s, 'chemin', 1);
    const r = E.poserBloc(s, 'chemin', s.monde.ici - 3 * W + dx);
    console.log('chemin', s.monde.ici - 3 * W + dx, r.ok ? 'posé' : r.error || r.raison);
  }
}
if (args.includes('--tente')) console.log('tente', JSON.stringify(E.poserBloc(s, 'tente', s.monde.ici + 3)));
// (--village : le panneau du village posé trois cases à gauche du point d'apparition)
if (args.includes('--village')) {
  E.addItem(s, 'panneau_village', 1);
  console.log('place', JSON.stringify(E.poserBloc(s, 'panneau_village', s.monde.ici - 3)));
}
// (--projets, --lits : une pièce close au-dessus du point d'apparition, ses murs en pierre, une porte ; dedans, les meubles clés
// des projets du village : le tableau en liège et le tableau noir accrochés au mur du haut, le piano droit ; docs/economie.md)
if (args.includes('--projets') || args.includes('--lits')) {
  const W = E.farmTerrain(s).LARGEUR,
    c0 = (s.monde.ici % W) - 4,
    r0 = Math.floor(s.monde.ici / W) - 7;
  const poser = (sorte, t, dessus = false) => {
    E.addItem(s, (E.DATA.ATELIER.BLOCS[sorte] || {}).objet || sorte, 1);
    const r = E.poserBloc(s, sorte, t);
    if (!r.ok) console.log('projets', sorte, r.error || r.raison, dessus);
  };
  for (let x = c0; x < c0 + 9; x++) {
    poser('mur_pierre', r0 * W + x);
    poser(x === c0 + 4 ? 'porte' : 'mur_pierre', (r0 + 5) * W + x);
  }
  for (let y = r0 + 1; y < r0 + 5; y++) {
    poser('mur_pierre', y * W + c0);
    poser('mur_pierre', y * W + c0 + 8);
  }
  if (args.includes('--lits')) {
    // (--lits : la même pièce, deux paillasses dedans ; LITS : leurs cases, pour --action)
    poser('paillasse', (r0 + 3) * W + c0 + 2);
    poser('paillasse', (r0 + 3) * W + c0 + 6);
    console.log('lits', (r0 + 3) * W + c0 + 2, (r0 + 3) * W + c0 + 6);
  } else {
    poser('tableau_liege', r0 * W + c0 + 2, true);
    poser('tableau_ardoise', r0 * W + c0 + 5, true);
    poser('piano_droit', (r0 + 2) * W + c0 + 3);
  }
}
// (--labour : un carré de 3 × 3 cases labourées, deux cases au-dessus du point d'apparition)
if (args.includes('--labour')) {
  s.potager.houe = true;
  const W = E.farmTerrain(s).LARGEUR;
  for (let dy = -4; dy <= -2; dy++)
    for (let dx = -1; dx <= 1; dx++) {
      s.stamina = 100;
      const r = E.hoe(s, s.monde.ici + dy * W + dx);
      if (!r.ok) console.log('labour', r.error);
    }
}
// (--semences n : n graines de carotte dans l'inventaire)
if (opt('semences', null)) E.addItem(s, E.DATA.CULTURES.carotte.graine || 'graine_carotte', Number(opt('semences')));
// (--mures : avec --labour, des carottes mûres sur les neuf terres)
if (args.includes('--mures')) {
  for (const q of s.potager.parcelles) {
    E.addItem(s, E.DATA.CULTURES.carotte.graine || 'graine_carotte', 1);
    s.stamina = 100;
    const r = E.plant(s, q.id, 'carotte');
    if (!r.ok) console.log('mûres', r.error);
    q.stade = E.maxStage(q);
  }
  console.log('mûres', s.potager.parcelles.map((q) => q.id + '@' + q.case).join(' '));
}
// (--champs : avec --labour --mures, une maison de villageois, un villageois aux champs, de l'eau ; l'heure de travail)
if (args.includes('--champs')) {
  const { boite } = await import('../../tests/engine/aide.mjs');
  boite(s, { pain: 60 });
  console.log('maison', JSON.stringify(E.testMaisonVillageois(s)));
  const r = E.arriverVillageois(s, { direct: true });
  console.log('villageois', r.ok, r.error || (r.villageois && r.villageois.id));
  if (r.ok) console.log('tâche', JSON.stringify(E.attribuer(s, r.villageois.id, 'champs')));
  s.eauMl = 400000;
}
// (--graines : des graines plantées à droite du point d'apparition (graine, puis pousse) et d'autres tombées au sol)
if (args.includes('--graines')) {
  const J = await import('../../js/engine/ile/jeu.js');
  const { sorteAPlanter } = await import('../../js/engine/plantation.js');
  const { lacher } = await import('../../js/engine/outils.js');
  const ile = J.ileDeLaPartie(s),
    ici = s.monde.ici,
    W = ile.n;
  const plantees = [
    ['gland', 2, 0],
    ['graine_ile_lavande', 3, 0],
    ['spores_champignon', 4, 1],
    ['graine_herbe', 5, 1],
    ['pomme_de_pin', 6, 1],
  ];
  for (const [g, dx, stade] of plantees) {
    E.addItem(s, g, 1);
    const r = E.poserBloc(s, sorteAPlanter(g), ici + dx - W);
    if (r.ok) ile.semis.get(ici + dx - W).stade = stade;
    else console.log('graine', g, r.error);
  }
  const x0 = (ici % W) * 16,
    y0 = Math.floor(ici / W) * 16 + 30;
  [
    'graine_ile_bouleau',
    'graine_ile_pecher_sauvage',
    'graine_buisson',
    'graine_herbe',
    'spores_champignon',
    'graine_ile_lupin',
  ].forEach((g, k) => lacher(s, g, 1, 0, { carte: 'ferme', coup: [{ x: x0 + 20 + k * 14, y: y0 }] }));
  J.garderIle(s);
}
s.awakeMs = 3 * 3600 * 1000 * (E.DATA.TEMPS.SECONDES_PAR_HEURE / 3600);
// (--heure h : l'horloge à h heures, 20 pour essayer le lit le soir)
if (opt('heure', null)) s.awakeMs = E.awakeMsAtHour(Number(opt('heure')));
const SAUVEGARDE = JSON.stringify({ v: s.version, t: Date.now(), s });
// (--foret : le personnage repart du cœur de la forêt la plus dense, le carré de 16 × 16 qui a le plus d'objets)
let POSITION = null;
// (--position x,y : une place gardée, en cases, une case dans l'eau par exemple)
if (opt('position', null)) {
  const [px, py] = opt('position').split(',').map(Number);
  POSITION = JSON.stringify({ graine: E.farmSeed(s), x: px * 16 + 8, y: py * 16 + 14 });
}
if (args.includes('--foret')) {
  const { ileDeLaPartie } = await import('../../js/engine/ile/jeu.js');
  const ile = ileDeLaPartie(s),
    n = ile.n;
  let mieux = -1,
    ou = 0;
  for (let y = 8; y < n - 24; y += 8)
    for (let x = 8; x < n - 24; x += 8) {
      let c = 0;
      for (let j = 0; j < 16; j++) for (let i = 0; i < 16; i++) if (ile.objet[(y + j) * n + x + i]) c++;
      if (c > mieux) {
        mieux = c;
        ou = (y + 8) * n + x + 8;
      }
    }
  POSITION = JSON.stringify({ graine: E.farmSeed(s), x: (ou % n) * 16 + 8, y: Math.floor(ou / n) * 16 + 14 });
  console.log('forêt', ou % n, Math.floor(ou / n), mieux, 'objets sur 256 cases');
}

if (!process.env.PLAYWRIGHT_BROWSERS_PATH && existsSync('/opt/pw-browsers'))
  process.env.PLAYWRIGHT_BROWSERS_PATH = '/opt/pw-browsers';
const req = createRequire(import.meta.url);
let playwright = null;
for (const p of ['playwright', '/opt/node-tools/node_modules/playwright']) {
  try {
    playwright = req(p);
    break;
  } catch (e) {
    /* suivant */
  }
}
if (!playwright) {
  console.log('Playwright introuvable');
  process.exit(0);
}
const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
  '.mp3': 'audio/mpeg',
  '.ogg': 'audio/ogg',
};
const serveur = createServer((rq, res) => {
  let f = normalize(join(RACINE, decodeURIComponent(new URL(rq.url, 'http://x').pathname)));
  if (f !== RACINE && !f.startsWith(RACINE + sep)) {
    res.writeHead(403).end();
    return;
  }
  if (existsSync(f) && statSync(f).isDirectory()) f = join(f, 'index.html');
  if (!existsSync(f)) {
    res.writeHead(404).end();
    return;
  }
  res.writeHead(200, { 'content-type': TYPES[extname(f).toLowerCase()] || 'application/octet-stream' });
  res.end(readFileSync(f));
});
await new Promise((ok) => serveur.listen(0, '127.0.0.1', ok));
const BASE = `http://127.0.0.1:${serveur.address().port}`;
const nav = await playwright.chromium.launch();
const [VL, VH] = String(opt('ecran', '412x860')).split('x').map(Number);
const ctx = await nav.newContext({ viewport: { width: VL, height: VH }, isMobile: VL < 800, hasTouch: VL < 800 });
// (--vierge : un navigateur neuf, sans partie : l'écran d'accueil, comme un nouveau joueur)
if (!args.includes('--vierge'))
  await ctx.addInitScript(
    ([v, pos]) => {
      localStorage.setItem('ferme-save', v);
      if (pos) localStorage.setItem('ferme-position', pos);
      else localStorage.removeItem('ferme-position');
      sessionStorage.setItem('ferme-titre-vu', '1');
    },
    [SAUVEGARDE, POSITION],
  );
const page = await ctx.newPage();
await page.route(
  (u) => !u.href.startsWith(BASE),
  (r) => r.abort(),
);
const erreurs = [];
page.on('pageerror', (e) => erreurs.push(e.stack || e.message));
page.on('console', (m) => {
  if (m.type() === 'error' || m.type() === 'warning') erreurs.push('[console] ' + m.text());
});
// (--processeur 4 : le processeur ralenti 4 fois, un téléphone de milieu de gamme)
if (Number(opt('processeur', 1)) > 1) {
  const cdp = await ctx.newCDPSession(page);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: Number(opt('processeur', 1)) });
}
await page.goto(`${BASE}/${opt('page', 'jeu.html?fps=1')}`, { waitUntil: 'load' });
await page.waitForTimeout(ATTENTE);
// (--clic <sélecteur> : un bouton touché avant la capture, la carte du monde par exemple)
if (opt('clic', null)) {
  await page.click(opt('clic')).catch((e) => erreurs.push('clic : ' + e.message));
  await page.waitForTimeout(2500);
}
if (opt('touche', null)) {
  await page.keyboard.press(opt('touche'));
  await page.waitForTimeout(2500);
}
// (--mesure 8 : le temps des images pendant 8 s ; --marche : le personnage marche, une flèche après l'autre)
if (opt('mesure', null)) {
  await page.evaluate(() => window.mesureImages && window.mesureImages());
  const cdpm = await ctx.newCDPSession(page);
  await cdpm.send('Performance.enable');
  const metriques = async () =>
    Object.fromEntries((await cdpm.send('Performance.getMetrics')).metrics.map((x) => [x.name, x.value]));
  const m0 = await metriques();
  if (args.includes('--profil')) {
    await cdpm.send('Profiler.enable');
    await cdpm.send('Profiler.setSamplingInterval', { interval: 200 });
    await cdpm.send('Profiler.start');
  }
  const fin = Date.now() + Number(opt('mesure', 8)) * 1000,
    // (--vers ArrowRight : toujours la même flèche, pour aller vers l'eau par exemple)
    fleches = opt('vers', null) ? [opt('vers')] : ['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp'];
  let pasN = 0;
  while (Date.now() < fin) {
    if (args.includes('--marche')) {
      const f = fleches[pasN++ % fleches.length];
      await page.keyboard.down(f);
      await page.waitForTimeout(1500);
      await page.keyboard.up(f);
    } else await page.waitForTimeout(500);
  }
  const m = await page.evaluate(() => window.mesureImages && window.mesureImages());
  console.log(
    'scène',
    JSON.stringify(
      await page.evaluate(() => {
        const g = window.CarteJeu && window.CarteJeu.game(),
          sc = g && g.scene.getScenes(true)[0];
        if (!sc) return null;
        let vis = 0,
          tous = 0;
        const tex = {};
        const voir = (o) => {
          tous++;
          if (o.visible && o.willRender && o.willRender(sc.cameras.main)) {
            vis++;
            const k = o.texture ? o.texture.key : o.type;
            tex[k] = (tex[k] || 0) + 1;
          }
          if (o.list) o.list.forEach(voir);
        };
        sc.children.list.forEach(voir);
        return {
          objets: tous,
          dessines: vis,
          zoom: Number(sc.cameras.main.zoom.toFixed(2)),
          parTexture: Object.entries(tex)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 12),
        };
      }),
    ),
  );
  if (args.includes('--profil')) {
    // (--profil : les fonctions qui prennent le plus de temps, en propre ; le profil entier dans apercus-ile/profil.cpuprofile)
    const { profile } = await cdpm.send('Profiler.stop');
    const { writeFileSync } = await import('node:fs');
    mkdirSync('apercus-ile', { recursive: true });
    writeFileSync('apercus-ile/profil.cpuprofile', JSON.stringify(profile));
    const parNoeud = new Map(profile.nodes.map((nd) => [nd.id, nd])),
      compte = {};
    const dt = (profile.endTime - profile.startTime) / 1000 / Math.max(1, profile.samples.length);
    for (const id of profile.samples) {
      const nd = parNoeud.get(id),
        f = nd.callFrame,
        k =
          (f.functionName || '(anonyme)') +
          ' ' +
          (f.url || '').split('/').slice(-2).join('/') +
          ':' +
          (f.lineNumber + 1);
      compte[k] = (compte[k] || 0) + dt;
    }
    for (const [k, v] of Object.entries(compte)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 25))
      console.log('  ' + v.toFixed(0).padStart(6) + ' ms  ' + k);
  }
  const m1 = await metriques(),
    duree = (k) => Number(((m1[k] - m0[k]) * 1000).toFixed(0));
  console.log(
    'processeur (ms) : script',
    duree('ScriptDuration'),
    'tâches',
    duree('TaskDuration'),
    'mise en page',
    duree('LayoutDuration'),
    'sur',
    (m1.Timestamp - m0.Timestamp).toFixed(1),
    's',
  );
  console.log(
    'mesure',
    JSON.stringify(
      m && {
        fps: Number(m.fps.toFixed(1)),
        pire: Number(m.pire.toFixed(1)),
        p95: Number(m.p95.toFixed(1)),
        images: m.images,
      },
    ),
  );
}
// (--eval <code> : une expression évaluée dans la page, sa valeur affichée ; `sc` : la scène de la ferme)
if (opt('eval', null))
  console.log(
    'eval',
    await page.evaluate((c) => {
      const g = window.CarteJeu && window.CarteJeu.game(),
        sc = g && g.scene.getScenes(true)[0];
      try {
        return JSON.stringify(new Function('sc', 'return (' + c + ')')(sc));
      } catch (e) {
        return String(e);
      }
    }, opt('eval')),
  );
// (--action <code> : un geste joué dans la page, profilé ; `sc` : la scène de la ferme, `ici` : la case du personnage ;
// le temps des images pendant 3 s après lui, et les fonctions qui ont pris le plus de temps)
if (opt('action', null)) {
  const cdpa = await ctx.newCDPSession(page);
  await cdpa.send('Profiler.enable');
  await cdpa.send('Profiler.setSamplingInterval', { interval: 200 });
  await page.evaluate(() => window.mesureImages && window.mesureImages());
  await cdpa.send('Profiler.start');
  const resultat = await page.evaluate((c) => {
    const g = window.CarteJeu.game(),
      sc = g.scene.getScenes(true)[0],
      ici = window.FarmStage.persoCase();
    try {
      return JSON.stringify(new Function('sc', 'ici', 'return (' + c + ')')(sc, ici));
    } catch (e) {
      return String(e);
    }
  }, opt('action'));
  console.log('action', resultat);
  // (--glisse : l'action rend des points de l'écran [[x, y]…] ; le doigt s'y pose, glisse de l'un à l'autre, se lève)
  if (args.includes('--glisse')) {
    const pts = JSON.parse(resultat || '[]');
    if (Array.isArray(pts) && pts.length && args.includes('--doigt')) {
      // (--doigt : au doigt, des événements tactiles, comme sur un téléphone)
      const cdpt = await ctx.newCDPSession(page);
      const touche = (type, x, y) =>
        cdpt.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y }] });
      await touche('touchStart', pts[0][0], pts[0][1]);
      let [px, py] = pts[0];
      for (const [x, y] of pts.slice(1)) {
        for (let k = 1; k <= 8; k++) {
          await touche('touchMove', px + ((x - px) * k) / 8, py + ((y - py) * k) / 8);
          await page.waitForTimeout(16);
        }
        [px, py] = [x, y];
      }
      await page.waitForTimeout(100);
      await touche('touchEnd', 0, 0);
    } else if (Array.isArray(pts) && pts.length) {
      await page.mouse.move(pts[0][0], pts[0][1]);
      await page.mouse.down();
      for (const [x, y] of pts.slice(1)) await page.mouse.move(x, y, { steps: 8 });
      await page.waitForTimeout(100);
      await page.mouse.up();
    }
  }
  if (opt('rafale')) {
    // --rafale n,ms : n images, une toutes les ms après l'action (<sortie>-1.png, -2.png…), pour voir un effet
    const [n, ms] = opt('rafale').split(',').map(Number);
    for (let k = 1; k <= n; k++) {
      await page.waitForTimeout(ms);
      await page.screenshot({ path: SORTIE.replace(/\.png$/, `-${k}.png`) });
    }
  } else await page.waitForTimeout(Number(opt('duree', 3000)));
  // (window.__journal : ce que l'action a noté, à lire après coup)
  console.log('journal', await page.evaluate(() => JSON.stringify(window.__journal || null)));
  const { profile } = await cdpa.send('Profiler.stop');
  const m = await page.evaluate(() => window.mesureImages && window.mesureImages());
  console.log(
    'après l’action',
    JSON.stringify(m && { fps: Number(m.fps.toFixed(1)), pire: Number(m.pire.toFixed(1)), images: m.images }),
  );
  const N = new Map(profile.nodes.map((nd) => [nd.id, nd])),
    par = new Map();
  for (const nd of profile.nodes) for (const c of nd.children || []) par.set(c, nd.id);
  const dt = (profile.endTime - profile.startTime) / 1000 / profile.samples.length,
    incl = {};
  for (const id of profile.samples) {
    const vu = new Set();
    for (let q = id; q !== undefined; q = par.get(q)) {
      const f = N.get(q).callFrame,
        k =
          (f.functionName || '(anonyme)') +
          ' ' +
          (f.url || '').split('/').slice(-2).join('/') +
          ':' +
          (f.lineNumber + 1);
      if (!vu.has(k)) {
        incl[k] = (incl[k] || 0) + dt;
        vu.add(k);
      }
    }
  }
  for (const [k, v] of Object.entries(incl)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 40))
    if (!/\(root\)|\(program\)|\(idle\)/.test(k)) console.log('  ' + v.toFixed(0).padStart(6) + ' ms  ' + k);
}
mkdirSync(dirname(SORTIE), { recursive: true });
await page.screenshot({ path: SORTIE });
console.log(
  JSON.stringify(
    await page.evaluate(() => ({
      perso: window.FarmStage && window.FarmStage.persoCase(),
      vue: window.FarmStage && window.FarmStage.view(),
    })),
  ),
);
console.log(SORTIE);
for (const e of erreurs.slice(0, 12)) console.log(e.slice(0, 600));
await nav.close();
serveur.close();
