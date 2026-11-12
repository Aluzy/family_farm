// Le montage du trailer : les plans tournés par scripts/trailer/tourner.mjs, coupés et mis bout à bout
// (30 images par seconde), les cartons (le logo, un mot par plan, l'adresse du jeu : dessinés dans une page
// avec la police et le logo du jeu), la musique du jeu et les sons des gestes notés à la prise de vue.
// Usage : node scripts/trailer/monter.mjs <dossier des images> <sortie.mp4>
// ffmpeg, Playwright et Chromium requis.
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { IPS, RACINE } from './studio.mjs';

const [DOSSIER, SORTIE = 'trailer.mp4'] = process.argv.slice(2);
const L = 1920, H = 1080;

// Le plan de montage : { scene, debut (s dans la prise), duree (s), texte (le mot du plan), carton }.
export const PLANS = JSON.parse(readFileSync(join(RACINE, 'scripts/trailer/montage.json'), 'utf8'));

/* ---------- les cartons : des PNG transparents, dessinés par le navigateur ---------- */
const CARTONS = join(DOSSIER, 'cartons');
mkdirSync(CARTONS, { recursive: true });
const b64 = (f) => readFileSync(join(RACINE, f)).toString('base64');
const page = (corps) => `<!doctype html><meta charset="utf-8"><style>
@font-face{font-family:Jeu;src:url(data:font/woff;base64,${b64('assets/police_dialogue.woff')})}
html,body{margin:0;width:${L}px;height:${H}px;background:transparent;font-family:Jeu,sans-serif;overflow:hidden}
img{image-rendering:pixelated}
.mot{position:absolute;left:72px;bottom:64px;font-size:64px;color:#fff7fb;background:rgba(58,42,85,.82);padding:10px 30px 14px;border-radius:14px;border:4px solid #f1e3f7;letter-spacing:1px}
.centre{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:28px}
.voile{position:absolute;inset:0;background:radial-gradient(ellipse at center,rgba(40,26,64,.55),rgba(40,26,64,.86))}
.halo{position:absolute;inset:0;background:radial-gradient(ellipse 46% 40% at center,rgba(40,26,64,.6),rgba(40,26,64,0))}
.url{font-size:68px;color:#fff7fb}.sous{font-size:44px;color:#e9d5f5}
</style>${corps}`;
const logo = (l) => `<img src="data:image/png;base64,${b64('assets/logo.png')}" width="${l}" height="${l / 2}">`;
const require = createRequire(import.meta.url);
let playwright = null;
for (const nom of ['playwright', '/opt/node-tools/node_modules/playwright']) { try { playwright = require(require.resolve(nom)); break; } catch { /* suivant */ } }
const nav = await playwright.chromium.launch();
const pg = await nav.newPage({ viewport: { width: L, height: H } });
async function carton(nom, corps) {
  await pg.setContent(page(corps));
  await pg.evaluate(() => document.fonts.ready);
  await pg.screenshot({ path: join(CARTONS, `${nom}.png`), omitBackground: true });
  return join(CARTONS, `${nom}.png`);
}
const cartons = [];
for (const [i, p] of PLANS.entries()) {
  if (p.carton === 'titre') cartons[i] = await carton(`c${i}`, `<div class="halo"></div><div class="centre">${logo(900)}</div>`);
  else if (p.carton === 'fin') cartons[i] = await carton(`c${i}`, `<div class="voile"></div><div class="centre">${logo(720)}<div class="sous">${p.texte || ''}</div><div class="url">moonbloom-village.com</div></div>`);
  else if (p.texte) cartons[i] = await carton(`c${i}`, `<div class="mot">${p.texte}</div>`);
}
await nav.close();

/* ---------- l'image : chaque plan coupé dans sa prise, son carton en fondu, puis bout à bout ---------- */
const entrees = [], filtres = [], sorties = [];
let n = 0;
const total = PLANS.reduce((t, p) => t + p.duree, 0);
for (const [i, p] of PLANS.entries()) {
  const d0 = Math.round(p.debut * IPS), nb = Math.round(p.duree * IPS);
  entrees.push('-framerate', String(IPS), '-start_number', String(d0), '-i', join(DOSSIER, p.scene, '%04d.jpg'));
  const v = n++;
  let flux = `[${v}:v]trim=end_frame=${nb},setpts=PTS-STARTPTS,scale=${L}:${H}:flags=neighbor,format=yuv420p`;
  if (i === PLANS.length - 1) flux += `,fade=t=out:st=${(p.duree - 0.5).toFixed(2)}:d=0.5`;
  if (i === 0) flux += ',fade=t=in:st=0:d=0.4';
  if (cartons[i]) {
    entrees.push('-loop', '1', '-framerate', String(IPS), '-t', String(p.duree), '-i', cartons[i]);
    const c = n++;
    const fin = p.carton === 'fin' ? '' : `,fade=t=out:st=${(p.duree - 0.3).toFixed(2)}:d=0.3:alpha=1`;
    filtres.push(`[${c}:v]format=rgba,fade=t=in:st=${p.carton ? 0.3 : 0.1}:d=${p.carton ? 0.6 : 0.25}:alpha=1${fin}[c${i}]`);
    filtres.push(`${flux}[b${i}];[b${i}][c${i}]overlay=shortest=1[p${i}]`);
  } else filtres.push(`${flux}[p${i}]`);
  sorties.push(`[p${i}]`);
}
filtres.push(`${sorties.join('')}concat=n=${PLANS.length}:v=1:a=0[v]`);

/* ---------- le son : la musique du jeu, et chaque son noté à la prise, à sa place dans le film ---------- */
const FICHIERS = Function(`${/const FICHIERS = (\{[\s\S]*?\n  \});/.exec(readFileSync(join(RACINE, 'js/son.js'), 'utf8'))[1].replace(/^/, 'return ')}`)();
const MUSIQUE = join(RACINE, 'assets/son/musique/musique_fete.ogg');
entrees.push('-i', MUSIQUE);
const m = n++;
const pistes = [`[${m}:a]atrim=0:${total},volume=0.55,afade=t=in:st=0:d=0.5,afade=t=out:st=${total - 1.5}:d=1.5[m]`];
const voix = ['[m]'];
const tours = {};
let t0 = 0;
const VOLUME = { hache: 1, arbre_tombe: 0.9, pioche: 1, houe: 0.9, arrosage: 0.8, semis: 0.9, recolte: 0.8, lancer: 0.9, plouf: 0.9, touche: 1, prise: 0.8, cuisine: 0.6, gain: 0.5, pris_bois: 0.5, pris_pierre: 0.5 };
for (const p of PLANS) {
  const f = join(DOSSIER, p.scene, 'sons.json');
  for (const s of existsSync(f) && !p.muet ? JSON.parse(readFileSync(f, 'utf8')) : []) {
    const dans = s.s - p.debut;
    if (dans < 0 || dans > p.duree - 0.05 || !FICHIERS[s.cle] || VOLUME[s.cle] === undefined) continue;
    const variantes = FICHIERS[s.cle], k = (tours[s.cle] = (tours[s.cle] || 0) + 1);
    entrees.push('-ss', String(s.depuis || 0), '-i', join(RACINE, 'assets/son', `${variantes[k % variantes.length]}.ogg`));
    const a = n++;
    pistes.push(`[${a}:a]aformat=channel_layouts=stereo,volume=${(VOLUME[s.cle] * Math.min(1.3, s.gain || 1)).toFixed(2)},adelay=${Math.round((t0 + dans) * 1000)}:all=1[s${a}]`);
    voix.push(`[s${a}]`);
  }
  t0 += p.duree;
}
pistes.push(`${voix.join('')}amix=inputs=${voix.length}:normalize=0:duration=first,alimiter=limit=0.95[a]`);

writeFileSync(join(DOSSIER, 'filtre.txt'), [...filtres, ...pistes].join(';\n'));
execFileSync('ffmpeg', ['-v', 'error', '-y', ...entrees, '-filter_complex_script', join(DOSSIER, 'filtre.txt'), '-map', '[v]', '-map', '[a]',
  '-c:v', 'libx264', '-preset', 'slow', '-crf', '17', '-pix_fmt', 'yuv420p', '-r', String(IPS), '-c:a', 'aac', '-b:a', '192k', '-t', String(total), '-movflags', '+faststart', SORTIE], { stdio: 'inherit' });
console.log(`${SORTIE} : ${total.toFixed(1)} s, ${PLANS.length} plans, ${voix.length - 1} sons.`);
