// Test de bout en bout du jeu à deux (E-2), dans un vrai navigateur : deux onglets, deux comptes, un monde.
// Le jeu est servi par un petit serveur statique ; le Worker est le vrai (worker/src/index.js), avec ses
// Durable Objects (Comptes, Monde) sur des bases node:sqlite, derrière les routes du navigateur (HTTP et
// WebSocket vers http://127.0.0.1:8787, l'adresse locale du jeu en ligne : js/ui/compte.js).
// Ce qu'il vérifie :
//   1. le joueur A met sa ferme en ligne (⚙️ Options › Jeu en ligne) et y entre ;
//   2. E-3 : A crée un lien d'invitation (👥 › Inviter un ami) ; B l'ouvre et entre dans le monde :
//      les deux y sont, bandeau « à jour » ; ils ouvrent le mode Construire ;
//   3. un mur posé chez l'un est vu chez l'autre en moins d'une seconde, dans les deux sens ;
//   3b. l'avatar de l'autre joueur est dessiné là où il regarde (E-4) ;
//   4. la partie confirmée de chacun est celle du monde (la même empreinte) ;
//   4b. E-5 : B récolte une carotte mûre : elle va au coffre commun, A voit la parcelle vide ;
//   4b'. E-6 : B nourrit les poules : A les voit nourries ;
//   4a. E-8 : le monde partagé est la ferme : la copie n'a plus le grand monde ; B envoie son personnage
//       hors de la ferme : il s'arrête au bord, le jeu le dit, et sa vue reste sur la ferme ;
//   4b''. E-7 : B mange une carotte sur le pouce : elle quitte le coffre commun, chez A aussi ;
//   4b'''. E-9 : B donne un coup de hache à un arbre de la ferme : le bois arrive au coffre commun chez A ;
//   4b''''. E-10 : B éteint (ou allume) un appareil de la ferme : chez A aussi ;
//   4c. E-5 : A se couche, la nuit attend B ; B se couche : la nuit passe chez les deux (le jour suivant),
//       et les parties confirmées sont encore celle du monde ;
//   5. la partie solo de A, sur l'appareil, n'est jamais touchée en ligne ;
//   6. une action pas encore en ligne (vendre au Marché) est refusée (un message, rien ne change) ;
//   6b. E-11 : A fait de B un visiteur (👥) : B le voit au bandeau, son mur est refusé tout de suite ; A lit le
//       journal du monde (qui a fait quoi) ;
//   7. E-3 : A retire B : la connexion de B est coupée, B revient à sa ferme solo.
// Lancer : node tests/deux-joueurs.mjs (Playwright et Chromium requis ; sinon, le test est sauté).

import { createServer } from 'node:http';
import { createRequire } from 'node:module';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { dirname, extname, join, normalize, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';
import { addItem, DATA, empreintePartie, testFarmMap, testFermeConstruite } from '../js/engine/index.js';
import { garden, plantRipe, reglagesDuJeu } from './engine/aide.mjs';
import W from '../worker/src/index.js';
import { Comptes } from '../worker/src/comptes.mjs';
import { Monde } from '../worker/src/monde.mjs';

const RACINE = join(dirname(fileURLToPath(import.meta.url)), '..');
const saute = (r) => { console.log(`Test à deux sauté : ${r}`); process.exit(0); };
const require = createRequire(import.meta.url);
let playwright = null;
for (const nom of ['playwright', '/opt/node-tools/node_modules/playwright']) { try { playwright = require(require.resolve(nom)); break; } catch { /* suivant */ } }
if (!playwright) saute('Playwright introuvable.');

// --- le jeu, servi tel quel ---
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.woff2': 'font/woff2', '.ttf': 'font/ttf', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.tmj': 'application/json', '.tsj': 'application/json' };
const serveur = createServer((req, res) => {
  const chemin = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  let f = normalize(join(RACINE, chemin));
  if (f !== RACINE && !f.startsWith(RACINE + sep)) { res.writeHead(403).end(); return; }
  if (existsSync(f) && statSync(f).isDirectory()) f = join(f, 'index.html');
  if (!existsSync(f)) { res.writeHead(404).end(); return; }
  res.writeHead(200, { 'content-type': TYPES[extname(f).toLowerCase()] || 'application/octet-stream', 'cache-control': 'no-store' });
  res.end(readFileSync(f));
});
await new Promise((ok) => serveur.listen(0, '127.0.0.1', ok));
const BASE = `http://127.0.0.1:${serveur.address().port}`;

// --- le Worker et ses Durable Objects ---
const baseSql = () => { const db = new DatabaseSync(':memory:'); return { exec(q, ...v) { const r = db.prepare(q).all(...v); return { toArray: () => r }; } }; };
const comptes = new Comptes({ storage: { sql: baseSql() } }, {});
const mondes = new Map(), sockets = new Map();
const env = {
  JEU_URL: '',   // (posée plus bas : l'adresse du serveur du jeu, où mène le lien d'invitation)
  COMPTES: { idFromName: (x) => x, get: () => ({ fetch: (r) => comptes.fetch(r) }) },
  // (les WebSockets du monde : celles que le navigateur ouvre, routées plus bas ; comme celles d'un
  // Durable Object : getWebSockets(étiquette), getTags)
  MONDES: { idFromName: (x) => x, get: (x) => {
    if (!mondes.has(x)) {
      const ctx = { storage: { sql: baseSql() }, getWebSockets: (tag) => [...(sockets.get(x) || [])].filter((w) => !tag || w.compte === tag), getTags: (w) => [w.compte] };
      mondes.set(x, new Monde(ctx, {}));
    }
    return { fetch: (r) => mondes.get(x).fetch(r) };
  } },
};
const compte = async (email) => { const l = await comptes.registre.demanderLien(email); const c = await comptes.registre.connecter(l.jeton); return { session: c.session, email, id: c.compte.id }; };
env.JEU_URL = `${BASE}/jeu.html`;
const A = await compte('alex@exemple.fr'), B = await compte('sam@exemple.fr');

// la partie solo de chacun : la ferme d'essai (F0-6)
const s0 = garden();
reglagesDuJeu();   // (le monde joue avec les réglages du jeu, comme le navigateur : B-1)
testFarmMap(s0, '42');
testFermeConstruite(s0);
addItem(s0, DATA.ATELIER.BLOCS.mur_pierre.objet, 20);
plantRipe(s0, 'potager-1', 'carotte');   // (E-5 : une carotte à récolter en ligne)
s0.poulailler.poules = 2;   // (E-6 : deux poules à nourrir, du blé)
addItem(s0, 'ble', 6);
s0.outils = { hache: true, pioche: true, faux: true, canne: true };   // (E-9 : les outils de la ferme)
const SAUVEGARDE = JSON.stringify({ v: s0.version, t: Date.now(), s: s0 });

let navigateur;
try { navigateur = await playwright.chromium.launch(); } catch (e) { serveur.close(); saute(`Chromium ne démarre pas (${String(e.message).split('\n')[0]}).`); }
const erreurs = [];
async function onglet(qui) {
  const ctx = await navigateur.newContext({ viewport: { width: 412, height: 860 } });
  await ctx.addInitScript(([v, c]) => { if (!sessionStorage.getItem('x')) { localStorage.setItem('ferme-save', v); localStorage.setItem('ferme-compte', JSON.stringify(c)); sessionStorage.setItem('x', 1); } }, [SAUVEGARDE, { session: qui.session, email: qui.email }]);
  await ctx.route('http://127.0.0.1:8787/**', async (route) => {
    const rq = route.request();
    const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type, Authorization', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS' };
    if (rq.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: cors });
    const r = await W.fetch(new Request(rq.url(), { method: rq.method(), headers: { ...rq.headers(), origin: 'https://aluzy.github.io' }, body: rq.postData() || undefined }), env);
    return route.fulfill({ status: r.status, contentType: 'application/json', headers: cors, body: await r.text() });
  });
  await ctx.routeWebSocket(/127\.0\.0\.1:8787\/mondes\/.*\/ws/, async (ws) => {
    const u = new URL(ws.url()), id = u.pathname.split('/')[2];
    const moi = await comptes.registre.moi(u.searchParams.get('session'));
    if (!sockets.has(id)) sockets.set(id, new Set());
    const S = sockets.get(id);
    // (comme une WebSocket de Durable Object : ce qu'elle garde d'elle, E-5 : couchée ou non)
    let attache = null;
    const entree = { compte: moi.id, send: (m) => ws.send(m), close: (code, raison) => { try { ws.close({ code, reason: raison }); } catch (e) { /* (déjà fermée) */ } }, serializeAttachment: (a) => { attache = a; }, deserializeAttachment: () => attache };
    S.add(entree);
    const d = mondes.get(id);
    ws.onMessage((m) => d.webSocketMessage(entree, m));
    ws.onClose(() => { S.delete(entree); d.webSocketClose(entree, 1000); });
  });
  const p = await ctx.newPage();
  p.on('pageerror', (e) => erreurs.push(`${qui.email} : ${e.message}`));
  return p;
}
const action = (p, nom, data = {}) => p.evaluate(([nom, data]) => { const x = document.createElement('button'); x.dataset.action = nom; Object.assign(x.dataset, data); document.body.appendChild(x); x.click(); x.remove(); }, [nom, data]);
// (une navigation pendant la vérification, le lien d'invitation par exemple : on réessaie)
const attendre = async (p, f, arg, ms = 20000) => { const t0 = Date.now(); for (;;) { let ok = false; try { ok = await p.evaluate(f, arg); } catch (e) { ok = false; } if (ok) return Date.now() - t0; if (Date.now() - t0 > ms) return null; await p.waitForTimeout(25); } };
const echecs = [];
const verifie = (ok, texte) => { console.log(`${ok ? '✓' : '✗'} ${texte}`); if (!ok) echecs.push(texte); };

try {
  const pa = await onglet(A);
  await pa.goto(`${BASE}/jeu.html`);
  await attendre(pa, () => window.FarmStage && FarmStage.ready && FarmStage.ready());
  await action(pa, 'open-options');
  await attendre(pa, () => !!document.querySelector('[data-action="monde-creer"]'));
  await action(pa, 'monde-creer');
  await attendre(pa, () => /Entrer/.test((document.getElementById('compte-zone') || {}).innerText || ''));
  const idMonde = [...mondes.keys()][0];
  verifie(!!idMonde && /Entrer/.test(await pa.evaluate(() => document.getElementById('compte-zone').innerText)), '1. A a mis sa ferme en ligne, elle est dans ses mondes');
  await pa.goto(`${BASE}/jeu.html?monde=${idMonde}`);
  const pret = () => /à jour/.test((document.getElementById('en-ligne-bandeau') || {}).innerText || '') && !!(window.FarmStage && FarmStage.ready && FarmStage.ready());
  await attendre(pa, pret);
  // E-3 : le lien d'invitation, créé dans 👥
  await action(pa, 'monde-membres');
  await attendre(pa, () => !!document.querySelector('[data-action="monde-inviter"]'));
  await action(pa, 'monde-inviter');
  await attendre(pa, () => !!document.getElementById('invitation-lien'));
  const lienInvitation = await pa.evaluate(() => document.getElementById('invitation-lien').value);
  await action(pa, 'close-modal');
  const pb = await onglet(B);
  await pb.goto(`${BASE}/jeu.html`);
  await attendre(pb, () => window.FarmStage && FarmStage.ready && FarmStage.ready());
  await pb.goto(lienInvitation);   // (le lien, dans l'onglet de B, son jeu déjà ouvert)
  await attendre(pb, () => /[?&]monde=/.test(location.search), null, 20000);
  verifie(/#invitation=/.test(lienInvitation) && (await attendre(pa, pret)) !== null && (await attendre(pb, pret)) !== null && /2/.test(await pa.evaluate(() => document.getElementById('en-ligne-bandeau').innerText)), '2. B a suivi le lien d\'invitation de A : les deux sont dans le monde, à jour');
  for (const p of [pa, pb]) { await action(p, 'build-toggle'); await attendre(p, () => document.body.classList.contains('construction'), null, 5000); }
  const soloA = await pa.evaluate(() => localStorage.getItem('ferme-save'));
  const caseLibre = (p) => p.evaluate(() => { const sc = FarmStage.scene(), T0 = sc.ctx.bridge.trace, W = sc.grid.cols, v = sc.cameras.main.worldView; const cx = Math.floor((v.x + v.width / 2) / 16), cy = Math.floor((v.y + v.height / 2) / 16); for (let d = 0; d < 14; d++) for (let dy = -d; dy <= d; dy++) for (let dx = -d; dx <= d; dx++) { const t = (cy + dy) * W + cx + dx; if (T0.posable(t) === 'ok') return t; } return null; });
  const voit = (t) => !!(FarmStage.scene().blocks && FarmStage.scene().blocks.has(t));
  for (const [de, vers, nom] of [[pa, pb, 'A → B'], [pb, pa, 'B → A']]) {
    await action(de, 'build-pick', { sorte: 'mur_pierre' });   // (un mur en main)
    const t = await caseLibre(de);
    await action(de, 'bloc', { case: String(t) });
    const ms = await attendre(vers, voit, t, 5000);
    verifie(ms !== null && ms < 1000, `3. un mur posé (${nom}) est vu en ${ms} ms`);
  }
  // 3b. E-4 : B déplace sa vue, A voit l'avatar de B arriver au centre de cette vue
  await pb.evaluate(() => { const c = FarmStage.scene().cameras.main; c.setScroll(c.scrollX + 64, c.scrollY + 32); });
  await pb.waitForTimeout(100);
  const centreB = await pb.evaluate(() => { const m = FarmStage.scene().cameras.main.midPoint; return { x: m.x, y: m.y }; });
  const msAvatar = await attendre(pa, (c) => { const e = (FarmStage.scene().presences || new Map()).get(c.id); return !!e && Math.hypot(e.img.x - c.x, e.img.y - c.y) < 24; }, { id: B.id, ...centreB }, 3000);
  verifie(msAvatar !== null && msAvatar < 1500, `3b. A voit l'avatar de B au centre de sa vue en ${msAvatar} ms`);
  await attendre(pa, () => !/en attente/.test(document.getElementById('en-ligne-bandeau').innerText), null, 5000);
  const reg = mondes.get(idMonde).registre;
  const confirmee = (p) => p.evaluate(async () => { const E = await import('/js/engine/index.js'); const L = await import('/js/ui/en-ligne.js'); return E.empreintePartie(L._lien().synchro.confirmee); });
  const em = empreintePartie(reg.charger());
  verifie((await confirmee(pa)) === em && (await confirmee(pb)) === em && reg.rev === 2, `4. les deux parties confirmées sont celle du monde (révision ${reg.rev})`);
  // 4b. E-5 : le potager, hors de Construire
  for (const p of [pa, pb]) { await action(p, 'build-toggle'); await attendre(p, () => !document.body.classList.contains('construction'), null, 5000); }
  // 4a. E-8 : la frontière
  const F = await pb.evaluate(async () => { const E = await import('/js/engine/index.js'); return { ...E.farmTerrain(FF.state).FERME, cols: FarmStage.scene().grid.cols, W: E.farmTerrain(FF.state).LARGEUR }; });
  await pb.evaluate((f) => FarmStage.scene().goHere((f.X - 30) * 16, (f.Y + f.HAUTEUR / 2) * 16), F);
  await pb.waitForTimeout(2500);
  const bord = await pb.evaluate((f) => { const sc = FarmStage.scene(), i = sc.fermier.info(), v = sc.cameras.main.worldView; return { c: Math.floor(i.x / 16), dit: /reste du monde/.test(document.body.innerText), vueX: v.x }; }, F);
  verifie(F.cols === F.W && reg.charger().mondePartage === true && JSON.stringify(reg.charger().monde.habitants) === '{}' && bord.c >= F.X && bord.dit && bord.vueX >= (F.X - 6) * 16 - 1, `4a. le monde est la ferme : B, envoyé dehors, s'arrête au bord (colonne ${bord.c}, la ferme commence à ${F.X}), le jeu le dit, la vue reste sur la ferme`);
  const carottes = (p) => p.evaluate(async () => { const E = await import('/js/engine/index.js'); return E.countItem(FF.state, 'carotte'); });
  const avantCarottes = await carottes(pa);
  await action(pb, 'harvest', { id: 'potager-1' });
  const msRecolte = await attendre(pa, async () => { const E = await import('/js/engine/index.js'); return !E.findPlot(FF.state, 'potager-1').culture; }, null, 5000);
  verifie(msRecolte !== null && (await carottes(pa)) > avantCarottes, `4b. B a récolté une carotte : A voit la parcelle vide et la récolte au coffre commun en ${msRecolte} ms`);
  // 4b'. E-6 : les bêtes
  await action(pb, 'feed-all');
  const msPoules = await attendre(pa, () => FF.state.poulailler.nourries === 2, null, 5000);
  verifie(msPoules !== null, `4b'. B a nourri les poules : A les voit nourries en ${msPoules} ms`);
  // 4b''. E-7 : la cuisine (manger sur le pouce)
  const avantRepas = await carottes(pa);
  await action(pb, 'eat', { item: 'carotte' });
  const msRepas = await attendre(pa, async (n) => { const E = await import('/js/engine/index.js'); return E.countItem(FF.state, 'carotte') === n - 1; }, avantRepas, 5000);
  verifie(msRepas !== null, `4b''. B a mangé une carotte : elle quitte le coffre commun chez A en ${msRepas} ms`);
  // 4b'''. E-9 : la hache
  const bois = (p) => p.evaluate(async () => { const E = await import('/js/engine/index.js'); return E.countItem(FF.state, 'bois'); });
  const bois0 = await bois(pa);
  const coup = await pb.evaluate(async () => {
    const E = await import('/js/engine/index.js'), O = await import('/js/ui/outils.js');
    const T = E.farmTerrain(FF.state), F = T.FERME;
    const id = Object.keys(T.ARBRES).find((k) => { const [c, r] = k.split(',').map(Number); return c >= F.X && r >= F.Y && c < F.X + F.LARGEUR && r < F.Y + F.HAUTEUR; });
    const r = O.chopFromStage(id, { carte: 'ferme', coup: [{ x: 0, y: 0 }] }, false);
    return { id, ok: !!r, morceaux: r && r.morceaux, sol: (FF.state.morceaux || []).length };
  });
  const msBois = await attendre(pa, async (n) => { const E = await import('/js/engine/index.js'); return E.countItem(FF.state, 'bois') > n; }, bois0, 5000);
  verifie(coup.ok && !coup.morceaux && coup.sol === 0 && msBois !== null, `4b'''. B a coupé l'arbre ${coup.id} : rien au sol, le bois au coffre commun chez A en ${msBois} ms`);
  // 4b''''. E-10 : un appareil
  const etatApp = (p, id) => p.evaluate(async (i) => { const E = await import('/js/engine/index.js'); const d = E.allDevices(FF.state).find((x) => x.id === i); return d ? !!d.allume : null; }, id);
  const app = await pa.evaluate(async () => { const E = await import('/js/engine/index.js'); return E.allDevices(FF.state)[0].id; });
  const avantApp = await etatApp(pa, app);
  await action(pb, 'toggle', { id: app });
  const msApp = await attendre(pa, async (o) => { const E = await import('/js/engine/index.js'); const d = E.allDevices(FF.state).find((x) => x.id === o.id); return !!d && !!d.allume !== o.avant; }, { id: app, avant: avantApp }, 5000);
  verifie(avantApp !== null && msApp !== null, `4b''''. B a basculé l'appareil ${app} : chez A aussi en ${msApp} ms`);
  // 4c. E-5 : la nuit partagée
  const jour = await pa.evaluate(() => FF.state.day);
  await action(pa, 'monde-coucher');
  await attendre(pb, () => /1\/2/.test(document.getElementById('en-ligne-bandeau').innerText), null, 5000);
  await pa.waitForTimeout(300);
  const attend = (await pa.evaluate(() => FF.state.day)) === jour && /1\/2/.test(await pb.evaluate(() => document.getElementById('en-ligne-bandeau').innerText));
  await action(pb, 'monde-coucher');
  const msNuit = await attendre(pa, (j) => FF.state.day === j + 1, jour, 5000);
  const jourB = await pb.evaluate(() => FF.state.day);
  const em2 = empreintePartie(reg.charger());
  verifie(attend && msNuit !== null && jourB === jour + 1 && (await confirmee(pa)) === em2 && (await confirmee(pb)) === em2, `4c. A couché, la nuit attend B (1/2) ; B couché : le jour ${jour + 1} chez les deux en ${msNuit} ms, les parties confirmées sont celle du monde`);
  await pa.evaluate(() => window.dispatchEvent(new Event('pagehide')));
  verifie((await pa.evaluate(() => localStorage.getItem('ferme-save'))) === soloA, '5. la partie solo de A n\'est pas touchée en ligne');
  const avant = reg.rev;
  await action(pa, 'sell-item', { item: 'carotte' });
  await pa.waitForTimeout(300);
  verifie(reg.rev === avant && /viendra bientôt/.test(await pa.evaluate(() => document.body.innerText)), '6. un geste pas encore en ligne est refusé');
  // 6b. E-11 : les rôles et le journal
  await action(pa, 'monde-membres');
  await attendre(pa, () => !!document.querySelector('[data-action="monde-role"][data-role="visiteur"]'));
  await action(pa, 'monde-role', { compte: B.id, role: 'visiteur' });
  const msRole = await attendre(pb, () => /👀/.test(document.getElementById('en-ligne-bandeau').innerText), null, 5000);
  const revRole = reg.rev;
  await action(pb, 'build-toggle');
  await action(pb, 'build-pick', { sorte: 'mur_pierre' });
  const t6 = await caseLibre(pb);
  await action(pb, 'bloc', { case: String(t6) });
  await pb.waitForTimeout(400);
  const refuseB = reg.rev === revRole && /Visiteur/.test(await pb.evaluate(() => document.body.innerText));
  await action(pa, 'close-modal');
  await action(pa, 'monde-journal');
  await attendre(pa, () => !!document.getElementById('journal-titre'), null, 5000);
  const journal = await pa.evaluate(() => document.querySelector('.journal-monde').innerText);
  verifie(msRole !== null && refuseB && /sam/i.test(journal) && /a posé un bloc/.test(journal) && /tout le monde a dormi/.test(journal), `6b. B devenu visiteur (en ${msRole} ms) : son mur refusé ; le journal de A dit qui a fait quoi`);
  await action(pa, 'close-modal');
  // 7. E-3 : A retire B
  await action(pa, 'monde-membres');
  await attendre(pa, () => !!document.querySelector('[data-action="monde-retirer"]'));
  await action(pa, 'monde-retirer', { compte: B.id });
  await action(pa, 'monde-retirer-oui', { compte: B.id });
  const revenu = await attendre(pb, () => location.pathname.endsWith('jeu.html') && !/monde=/.test(location.search) && !document.getElementById('en-ligne-bandeau'), null, 15000);
  verifie(revenu !== null && !mondes.get(idMonde).registre.membre(B.id), '7. A a retiré B : sa connexion coupée, B est revenu à sa ferme solo');
} finally {
  await navigateur.close();
  serveur.close();
}
for (const e of erreurs) console.log(`✗ erreur dans la page : ${e}`);
if (echecs.length || erreurs.length) { console.log(`Test à deux : ${echecs.length + erreurs.length} échec(s).`); process.exit(1); }
console.log('Test à deux : tout est bon.');
