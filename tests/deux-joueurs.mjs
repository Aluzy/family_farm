// Test de bout en bout du jeu à deux (E-2), dans un vrai navigateur : deux onglets, deux comptes, un monde.
// Le jeu est servi par un petit serveur statique ; le Worker est le vrai (worker/src/index.js), avec ses
// Durable Objects (Comptes, Monde) sur des bases node:sqlite, derrière les routes du navigateur (HTTP et
// WebSocket vers http://127.0.0.1:8787, l'adresse locale du jeu en ligne : js/ui/compte.js).
// Ce qu'il vérifie :
//   1. le joueur A met sa ferme en ligne (⚙️ Options › Jeu en ligne) et y entre ;
//   2. E-3 : A crée un lien d'invitation (👥 › Inviter un ami) ; B l'ouvre et entre dans le monde :
//      les deux y sont, bandeau « à jour » ; ils ouvrent le mode Construire ;
//   2b. les amis : B entre le code ami de A (💌 › Ajouter un ami), A accepte : amis ; A voit Sam (son personnage,
//       son niveau, « Avec toi ») ; A l'invite (✉️) : l'invitation arrive dans la boîte de B ; B voit « Rejoindre
//       sa ferme » sur la fiche de A (il est membre de son monde) ; jamais d'adresse e-mail ;
//   3. un mur posé chez l'un est vu chez l'autre en moins d'une seconde, dans les deux sens ;
//   3b. chacun joue son personnage à lui (celui de sa partie solo) ; l'autre le voit là où il est, son prénom
//       au-dessus (E-4) ;
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
//   6c. E-12 : A sauvegarde (💾), mange une carotte, puis restaure : la carotte revient chez les deux, et B
//       est prévenu ;
//   7. E-3 : A retire B : la connexion de B est coupée, B revient à sa ferme solo ;
//   8. I9a : l'île partagée. A met en ligne une île du chantier (une partie d'essai : villageActif), y invite B ;
//      les deux sortent de la ferme (pas de borne, la vue les suit) et se voient dehors ; le bandeau dit que rien
//      d'autre n'est encore synchronisé ; le brouillard de B se lève chez lui seul (la partie confirmée reste
//      celle du monde) ; un mur posé dehors est refusé avant d'être envoyé. (I9b : le bandeau est retiré ; le mur
//      est refusé par le moteur, dans la partie locale.)
//      PORT=1 (long) : A marche jusqu'au port, B le suit ; au port, chacun voit l'autre.
//      (CAPTURES=<dossier> : les captures de l'hôte et de l'invité dehors, et au port avec PORT=1.)
//   9. I9a2 : l'horloge commune. A met en ligne une île à 21 h, y invite B : l'heure avance chez les deux et reste la
//      même (celle du monde) ; B lance une omelette : elle est prête chez les deux à son heure (deux pas plus tard) ; la
//      nuit tombe seule à 22 h ; A se couche, B non : la nuit garde son pas ; B se couche : elle file, le matin vient
//      chez les deux en moins d'une minute ; les parties confirmées sont celle du monde, au même pas.
//      (CAPTURES=<dossier> : le soir, la nuit où tous dorment, le matin, chez l'hôte et chez l'invité.)
//  10. I9b : les changements de l'île (dans l'île de 8, les deux dehors) : A abat un arbre du monde à la hache, B le voit
//      tomber en moins d'une seconde, le bois au coffre commun ; A et B coupent le même buisson au même instant : un
//      seul coup gagne, le bois une fois ; B pose un chemin dehors, A le voit ; plus de bandeau « rien d'autre n'est
//      encore synchronisé » ; le brouillard reste à chacun. (CAPTURES : l'arbre qui tombe chez B, le chemin, les deux
//      dehors.)
//  11. I9c : le port et la caisse en ligne (une île de 29, le jour 3, à 7 h 30) : sur la ferme, A attelle la charrette
//      et y charge ses carottes, B ne peut pas l'atteler et prend la brouette pour son bois ; les deux au port, devant le
//      comptoir ; le bac accoste à 9 h, vu par les deux au même pas ; A vend ses carottes, B son bois : la caisse commune
//      monte de la somme juste chez l'autre, qui le lit (« … a tout vendu au port : 12 🥕 carotte ») ; le journal dit qui a vendu quoi.
//      (CAPTURES : le refus de la charrette, les deux au port, le bac à quai, la caisse chez B, le journal.)
//  12. I9d : les villageois en ligne (une île à trois villageois au travail, B ami jardinier) : A et B voient chaque
//      villageois au même poste, au travail puis à table à midi ; le bois coupé arrive au coffre commun dans la matinée ;
//      A parle à un villageois : son amitié monte, celle de B reste la sienne ; le tableau du village est le même chez les
//      deux. (CAPTURES : au travail, à table, la bulle, la liste des villageois, chez l'hôte et chez l'invité.)
// Lancer : node tests/deux-joueurs.mjs (Playwright et Chromium requis ; sinon, le test est sauté).

import { createServer } from 'node:http';
import { createRequire } from 'node:module';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { dirname, extname, join, normalize, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';
import { arriverVillageois, attribuer, donnerOutil, testMaisonVillageois, villageoisDe } from '../js/engine/index.js';
import { addItem, avancerJusqua, caseDansLaFerme, caseMarchable, caseVue, cheminDehorsSur, comptoirDuPort, etatBac, contexteSol, countItem, elementsSol, createNewGame, DATA, empreintePartie, farmTerrain, pasDe, testBatir, testFarmMap, testFermeConstruite, testSetLevel } from '../js/engine/index.js';
import { avecVillage, garden, plantRipe, reglagesDuJeu } from './engine/aide.mjs';
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
// (un bucket R2 en mémoire : put, get, list, delete)
const r2m = new Map();
const r2 = {
  async put(k, v, o = {}) { r2m.set(k, { v, o }); },
  async get(k) { const x = r2m.get(k); return x ? { text: async () => x.v } : null; },
  async delete(k) { r2m.delete(k); },
  async list({ prefix }) { return { objects: [...r2m.keys()].filter((k) => k.startsWith(prefix)).map((k) => ({ key: k, size: r2m.get(k).v.length, customMetadata: r2m.get(k).o.customMetadata })), truncated: false }; },
};
const env = {
  JEU_URL: '',   // (posée plus bas : l'adresse du serveur du jeu, où mène le lien d'invitation)
  COMPTES: { idFromName: (x) => x, get: () => ({ fetch: (r) => comptes.fetch(r) }) },
  // (les WebSockets du monde : celles que le navigateur ouvre, routées plus bas ; comme celles d'un
  // Durable Object : getWebSockets(étiquette), getTags)
  MONDES: { idFromName: (x) => x, get: (x) => {
    if (!mondes.has(x)) {
      const ctx = { storage: { sql: baseSql() }, id: { toString: () => x }, getWebSockets: (tag) => [...(sockets.get(x) || [])].filter((w) => !tag || w.compte === tag), getTags: (w) => [w.compte], waitUntil: (p) => p };
      mondes.set(x, new Monde(ctx, { SESSIONS: r2 }));   // (E-12 : les sauvegardes, dans un bucket en mémoire)
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
// (la partie solo de B : son personnage à lui, Sam, le personnage 7 du catalogue ; c'est lui qu'il joue en ligne)
const sB = JSON.parse(JSON.stringify(s0));
const mB = sB.famille.membres.find((m) => m.id === sB.famille.principal) || sB.famille.membres[0];
Object.assign(mB, { prenom: 'Sam', perso: 7, apparence: null });
const SAUVEGARDE_B = JSON.stringify({ v: sB.version, t: Date.now(), s: sB });

let navigateur;
try { navigateur = await playwright.chromium.launch(); } catch (e) { serveur.close(); saute(`Chromium ne démarre pas (${String(e.message).split('\n')[0]}).`); }
const erreurs = [];
async function onglet(qui) {
  const ctx = await navigateur.newContext({ viewport: { width: 412, height: 860 } });
  await ctx.addInitScript(([v, c]) => { if (!sessionStorage.getItem('x')) { localStorage.setItem('ferme-save', v); localStorage.setItem('ferme-compte', JSON.stringify(c)); sessionStorage.setItem('x', 1); } sessionStorage.setItem('ferme-titre-vu', '1'); }, [qui === B ? SAUVEGARDE_B : SAUVEGARDE, { session: qui.session, email: qui.email }]);
  await ctx.route('http://127.0.0.1:8787/**', async (route) => {
    const rq = route.request();
    const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Prenom', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS' };
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
// (I9a, les captures : sans les messages, la bulle d'aide du début ni le bandeau du consentement : la carte et le bandeau du monde)
const pourCapture = (p) => p.evaluate(() => { if (document.getElementById('capture-style')) return; const st = document.createElement('style'); st.id = 'capture-style'; st.textContent = '#tuto-root, #consent-banner, .toast { display: none !important; }'; document.head.appendChild(st); });
const action = (p, nom, data = {}) => p.evaluate(([nom, data]) => { const x = document.createElement('button'); x.dataset.action = nom; Object.assign(x.dataset, data); document.body.appendChild(x); x.click(); x.remove(); }, [nom, data]);
// (une navigation pendant la vérification, le lien d'invitation par exemple : on réessaie)
const attendre = async (p, f, arg, ms = 20000) => { const t0 = Date.now(); for (;;) { let ok = false; try { ok = await p.evaluate(f, arg); } catch (e) { ok = false; } if (ok) return Date.now() - t0; if (Date.now() - t0 > ms) return null; await p.waitForTimeout(25); } };
const echecs = [];
// (I9a2 : la partie confirmée d'un joueur et celle du monde, au même pas : le monde avance jusqu'à l'heure, la confirmée
// du joueur jusqu'au pas du monde — ou le monde, s'il est derrière, jusqu'au sien)
const memePas = async (p, reg) => {
  reg.avancer();
  const srv = reg.charger(), pas = pasDe(srv);
  const c = await p.evaluate(async (n) => { const E = await import('/js/engine/index.js'); const L = await import('/js/ui/en-ligne.js'); const S = L._lien().synchro; if (S.vivante && n >= E.pasDe(S.confirmee)) S.avancerConfirmee(n); return { pas: E.pasDe(S.confirmee), em: E.empreintePartie(S.confirmee) }; }, pas);
  if (c.pas === pas) return c.em === empreintePartie(srv);
  const copie = JSON.parse(JSON.stringify(srv));
  avancerJusqua(copie, c.pas);
  return c.em === empreintePartie(copie);
};
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
  // 2b. les amis
  const voletOuvert = async (p) => { await action(p, 'amis-fermer'); await action(p, 'amis-ouvrir'); return attendre(p, () => !!document.querySelector('.amis-pied .btn'), null, 5000); };
  await voletOuvert(pa);
  await action(pa, 'amis-ajouter');
  await attendre(pa, () => !!document.querySelector('.amis-code'), null, 5000);
  const codeA = await pa.evaluate(() => document.querySelector('.amis-code').textContent);
  await voletOuvert(pb);
  await action(pb, 'amis-ajouter');
  await attendre(pb, () => !!document.getElementById('amis-code'), null, 5000);
  await pb.fill('#amis-code', codeA.slice(5).toLowerCase());
  await action(pb, 'amis-envoyer');
  await attendre(pb, () => /En attente/.test(document.getElementById('amis-volet').innerText), null, 5000);
  await voletOuvert(pa);
  const demande = await attendre(pa, () => /veut être ton ami/.test(document.getElementById('amis-volet').innerText), null, 5000);
  await action(pa, 'amis-repondre', { compte: B.id, oui: '1' });
  const amisA = await attendre(pa, (id) => !!document.querySelector(`.amis-qui[data-compte="${id}"]`) && /Avec toi/.test(document.getElementById('amis-volet').innerText), B.id, 5000);
  const ligneSam = await pa.evaluate((id) => { const q = document.querySelector(`.amis-qui[data-compte="${id}"]`); return { texte: q.innerText, image: q.querySelector('.amis-av').style.backgroundImage, marche: q.querySelector('.amis-av').classList.contains('marche') }; }, B.id);
  await action(pa, 'amis-fiche', { compte: B.id });
  await attendre(pa, () => !!document.querySelector('.amis-fiche'), null, 3000);
  await action(pa, 'amis-inviter', { compte: B.id });
  const invite = await attendre(pa, () => /a reçu ton invitation/.test(document.body.innerText), null, 5000);
  await voletOuvert(pb);
  const recue = await attendre(pb, () => /t'invite dans/.test(document.getElementById('amis-volet').innerText), null, 5000);
  await action(pb, 'amis-fiche', { compte: A.id });
  const rejoindreA = await attendre(pb, () => !!document.querySelector('.amis-fiche [data-action="amis-rejoindre"]'), null, 3000);
  const sansEmail = !/@exemple/.test(await pa.evaluate(() => document.getElementById('amis-volet').innerText + document.body.innerText)) && !/@exemple/.test(await pb.evaluate(() => document.getElementById('amis-volet').innerText));
  verifie(demande !== null && amisA !== null && /Sam/.test(ligneSam.texte) && /\d/.test(ligneSam.texte) && /perso_07/.test(ligneSam.image) && ligneSam.marche && invite !== null && recue !== null && rejoindreA !== null && sansEmail,
    `2b. B a demandé A en ami par son code, A a accepté ; A voit Sam (perso 7, en ligne, avec lui), l'invite : B le reçoit et peut rejoindre la ferme de A ; aucune adresse e-mail (${JSON.stringify(ligneSam.texte)})`);
  if (process.env.CAPTURES) {
    const sansMessages = (p) => p.evaluate(() => document.querySelectorAll('.toast').forEach((e) => e.remove()));
    for (const p of [pa, pb]) await sansMessages(p);
    await pa.screenshot({ path: process.env.CAPTURES + '/a-fiche.png' });
    await action(pa, 'amis-fiche-fermer'); await pa.waitForTimeout(300); await sansMessages(pa);
    await pa.screenshot({ path: process.env.CAPTURES + '/a-volet.png' });
    await action(pb, 'amis-fiche-fermer'); await pb.waitForTimeout(300); await sansMessages(pb);
    await pb.screenshot({ path: process.env.CAPTURES + '/b-volet.png' });
  }
  for (const p of [pa, pb]) await action(p, 'amis-fermer');
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
  // 3b. E-4 : chacun joue son personnage (B, Sam, le 7) ; A voit celui de B là où il est, avec son prénom
  const persoB = await pb.evaluate(() => FarmStage.scene().fermier.vu() && FarmStage.scene().persoCle);
  const pieds = await pb.evaluate(() => { const v = FarmStage.scene().fermier.vu(); return v && { x: v.x, y: v.y - v.h }; });
  const msAvatar = pieds && await attendre(pa, (c) => { const e = (FarmStage.scene().presences || new Map()).get(c.id); return !!e && Math.hypot(e.img.x - c.x, e.img.y - c.y) < 4 && e.img.texture.key === 'perso_7' && e.nom.text === 'Sam'; }, { id: B.id, ...pieds }, 5000);
  verifie(persoB === 'perso_7' && msAvatar !== null && msAvatar < 3000, `3b. B joue son personnage (${persoB}) ; A le voit là où il est, avec son prénom, en ${msAvatar} ms`);
  await attendre(pa, () => !/en attente/.test(document.getElementById('en-ligne-bandeau').innerText), null, 5000);
  const reg = mondes.get(idMonde).registre;
  const confirmee = (p) => p.evaluate(async () => { const E = await import('/js/engine/index.js'); const L = await import('/js/ui/en-ligne.js'); return E.empreintePartie(L._lien().synchro.confirmee); });
  const em = empreintePartie(reg.charger());
  verifie((await confirmee(pa)) === em && (await confirmee(pb)) === em && reg.rev === 2, `4. les deux parties confirmées sont celle du monde (révision ${reg.rev})`);
  // 4b. E-5 : le potager, hors de Construire
  for (const p of [pa, pb]) { await action(p, 'build-toggle'); await attendre(p, () => !document.body.classList.contains('construction'), null, 5000); }
  // 3c. E-4 : B fait quelques pas : chez A, son avatar marche (les images de marche, de profil), sans à-coups
  await pb.evaluate(() => { const f = FarmStage.scene().fermier, v = f.vu(); f.goTo(v.x - 6 * 16, v.y + 3 * 16); });
  const imagesB = await pa.evaluate((id) => new Promise((ok) => {
    const vues = [], t0 = performance.now();
    const pas = () => { const e = FarmStage.scene().presences.get(id), j = FarmStage.scene().cache.json.get('perso_cases').frames; if (e) vues.push({ n: j[+e.img.frame.name], x: e.img.x }); if (performance.now() - t0 < 2400) requestAnimationFrame(pas); else ok(vues); };
    pas();
  }), B.id);
  const noms = new Set(imagesB.map((v) => v.n)), sauts = imagesB.slice(1).filter((v, i) => Math.abs(v.x - imagesB[i].x) > 12).length;
  const parSens = {};
  for (const n of noms) { const m = /^marche_(bas|haut|cote)_\d$/.exec(n || ''); if (m) parSens[m[1]] = (parSens[m[1]] || 0) + 1; }
  verifie(Math.max(0, ...Object.values(parSens)) >= 3 && sauts === 0, `3c. B fait quelques pas : chez A, son avatar marche (${JSON.stringify(parSens)} images de marche par sens, ${sauts} à-coup)`);
  // 4a. E-8 : la frontière
  const F = await pb.evaluate(async () => { const E = await import('/js/engine/index.js'); return { ...E.farmTerrain(FF.state).FERME, cols: FarmStage.scene().grid.cols, W: E.farmTerrain(FF.state).LARGEUR }; });
  await pb.evaluate((f) => FarmStage.scene().goHere((f.X - 30) * 16, (f.Y + f.HAUTEUR / 2) * 16), F);
  const bord = await pb.evaluate((f) => { const sc = FarmStage.scene(), i = sc.fermier.info(), v = sc.cameras.main.worldView; return { c: Math.floor(i.x / 16), dit: /reste du monde/.test(document.body.innerText), vueX: v.x }; }, F);
  verifie(F.cols === F.W && reg.charger().mondePartage === true && JSON.stringify(reg.charger().monde.habitants) === '{}' && bord.c >= F.X && bord.dit && bord.vueX >= (F.X - 6) * 16 - 1, `4a. le monde est la ferme : B, envoyé dehors, s'arrête au bord (colonne ${bord.c}, la ferme commence à ${F.X}), le jeu le dit, la vue reste sur la ferme`);
  const carottes = (p) => p.evaluate(async () => { const E = await import('/js/engine/index.js'); return E.countItem(FF.state, 'carotte'); });
  const avantCarottes = await carottes(pa);
  await action(pb, 'harvest', { id: 'potager-1' });
  const msRecolte = await attendre(pa, async () => { const E = await import('/js/engine/index.js'); return !E.findPlot(FF.state, 'potager-1').culture; }, null, 5000);
  await pa.waitForTimeout(400);
  const fermierA = await pa.evaluate(() => FarmStage.scene().fermier.info());
  verifie(fermierA.jobs === 0 && !fermierA.retenues.length, `4b-. le personnage de A ne refait pas la récolte de B (${fermierA.jobs} tâche, ${fermierA.retenues.length} case retenue)`);
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
  // 6c. E-12 : les sauvegardes
  await action(pa, 'monde-sauvegardes');
  await attendre(pa, () => !!document.getElementById('sauvegardes-titre'), null, 5000);
  const nSv = await pa.evaluate(() => document.querySelectorAll('[data-action="monde-restaurer"]').length);
  await action(pa, 'monde-sauvegarder');
  await attendre(pa, (n) => document.querySelectorAll('[data-action="monde-restaurer"]').length === n + 1, nSv, 5000);
  await action(pa, 'close-modal');
  const c0 = await carottes(pa);
  await action(pa, 'eat', { item: 'carotte' });
  await attendre(pb, async (n) => { const E = await import('/js/engine/index.js'); return E.countItem(FF.state, 'carotte') === n - 1; }, c0, 5000);
  await action(pa, 'monde-sauvegardes');
  await attendre(pa, () => !!document.querySelector('[data-action="monde-restaurer"]'), null, 5000);
  const cle = await pa.evaluate(() => document.querySelector('[data-action="monde-restaurer"]').dataset.cle);
  await action(pa, 'monde-restaurer', { cle });
  await action(pa, 'monde-restaurer-oui', { cle });
  const msRest = await attendre(pb, async (n) => { const E = await import('/js/engine/index.js'); return E.countItem(FF.state, 'carotte') === n && /restauré une sauvegarde/.test(document.body.innerText); }, c0, 5000);
  verifie(msRest !== null && (await carottes(pa)) === c0 && (await confirmee(pa)) === empreintePartie(reg.charger()) && (await confirmee(pb)) === empreintePartie(reg.charger()), `6c. A a restauré sa sauvegarde : la carotte mangée revient chez les deux (B prévenu en ${msRest} ms), les parties confirmées sont celle du monde`);
  // 7. E-3 : A retire B
  await action(pa, 'monde-membres');
  await attendre(pa, () => !!document.querySelector('[data-action="monde-retirer"]'));
  await action(pa, 'monde-retirer', { compte: B.id });
  await action(pa, 'monde-retirer-oui', { compte: B.id });
  const revenu = await attendre(pb, () => location.pathname.endsWith('jeu.html') && !/monde=/.test(location.search) && !document.getElementById('en-ligne-bandeau'), null, 15000);
  verifie(revenu !== null && !mondes.get(idMonde).registre.membre(B.id), '7. A a retiré B : sa connexion coupée, B est revenu à sa ferme solo');
  // 8. I9a : l'île partagée
  const ile = avecVillage(() => createNewGame('29', { nom: 'Île' }));
  ile.essais = { ...(ile.essais || {}), village: true };
  addItem(ile, DATA.ATELIER.BLOCS.mur_pierre.objet, 10);
  addItem(ile, DATA.ATELIER.BLOCS.chemin.objet, 10);   // (I9b : des chemins à poser dehors)
  ile.outils = { ...(ile.outils || {}), hache: true, pioche: true, faux: true, canne: true };   // (I9b : la hache, dehors)
  const Ti = farmTerrain(ile), Fi = Ti.FERME, Wi = Ti.LARGEUR, sortie = Ti.MONDE.cadre.SORTIE;
  const appel = async (qui, chemin, corps) => (await W.fetch(new Request(`http://127.0.0.1:8787${chemin}`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${qui.session}`, origin: 'https://aluzy.github.io' }, body: JSON.stringify(corps) }), env)).json();
  const cree = await appel(A, '/mondes', { partie: { v: ile.version, t: Date.now(), s: ile }, titre: 'L\'île' });
  const inv = cree.ok ? await appel(A, `/mondes/${cree.monde}/invitations`, { role: 'batisseur' }) : {};
  const entre = inv.ok ? await appel(B, '/rejoindre', { code: inv.code }) : {};
  const idIle = cree.monde, regIle = idIle && mondes.get(idIle).registre;
  // (dehors, à l'est de la sortie, au-delà de ce que la partie du monde a vu : deux cases où l'on marche, une pour chacun)
  const buts = [];
  for (let t = sortie + 12; regIle && buts.length < 2 && t < sortie + 120; t += 3) if (!caseVue(regIle.charger(), t) && caseMarchable(Ti, t) && caseMarchable(Ti, t + Wi)) buts.push(t);
  // (chacun repart près de la sortie de la ferme, dedans : là où sa partie l'a vu en dernier, js/ui/position.js)
  const pres = (dx) => ({ graine: '29', x: ((sortie % Wi) - 6 + dx) * 16 + 8, y: (Math.floor(sortie / Wi) + 1) * 16 + 15 });
  for (const [p, dx] of [[pa, 0], [pb, -2]]) await p.evaluate((v) => localStorage.setItem('ferme-position', JSON.stringify(v)), pres(dx));
  for (const p of [pa, pb]) await p.goto(`${BASE}/jeu.html?monde=${idIle}`);
  const dedans = await attendre(pa, pret, null, 30000) !== null && await attendre(pb, pret, null, 30000) !== null;
  const ileVue = (p) => p.evaluate(async () => { const E = await import('/js/engine/index.js'); return E.ilePartagee(FF.state); });
  verifie(cree.ok && entre.ok && dedans && buts.length === 2 && (await ileVue(pa)) && (await ileVue(pb)) && !caseDansLaFerme(ile, buts[0]),
    `8a. A a mis une île du chantier en ligne, B y est entré : les deux sont dans l'île partagée (${idIle})`);
  // B, puis A, marchent dehors (la région doit être faite : on redemande tant qu'il n'y est pas)
  const caseDe = (p) => p.evaluate(() => { const i = FarmStage.scene().fermier.info(); return Math.floor((i.y - 1) / 16) * FarmStage.scene().grid.cols + Math.floor(i.x / 16); });
  const allerA = async (p, t) => {
    const t0 = Date.now();
    while (Date.now() - t0 < 40000) {
      const c = await caseDe(p);
      if (Math.abs((c % Wi) - (t % Wi)) <= 1 && Math.abs(Math.floor(c / Wi) - Math.floor(t / Wi)) <= 1) return c;
      await p.evaluate((o) => { const f = FarmStage.scene().fermier; if (!f.info().jobs) FarmStage.scene().goHere((o.t % o.W) * 16 + 8, Math.floor(o.t / o.W) * 16 + 8); }, { t, W: Wi });
      await p.waitForTimeout(700);
    }
    return caseDe(p);
  };
  const cb = await allerA(pb, buts[0]);
  const vueB = await pb.evaluate(() => { const v = FarmStage.scene().cameras.main.worldView; return { x: v.x, y: v.y, l: v.width, h: v.height }; });
  const dehorsB = !caseDansLaFerme(ile, cb);
  const vueSuit = vueB.x + vueB.l > (Fi.X + Fi.LARGEUR + 6) * 16 && (cb % Wi) * 16 >= vueB.x && (cb % Wi) * 16 <= vueB.x + vueB.l;
  // (I9b : le bandeau « rien d'autre n'est encore synchronisé » d'I9a est retiré)
  const bandeauB = await attendre(pb, () => /à jour/.test(document.getElementById('en-ligne-bandeau').innerText) && !/rien d'autre/.test(document.getElementById('en-ligne-bandeau').innerText), null, 5000);
  const brouillardB = await pb.evaluate(async (o) => { const E = await import('/js/engine/index.js'); const L = await import('/js/ui/en-ligne.js'); return { ici: E.caseVue(FF.state, o.c), garde: (localStorage.getItem('ferme-brouillard-' + o.id) || '').length, confirmee: E.caseVue(L._lien().synchro.confirmee, o.c) }; }, { c: cb, id: idIle });
  brouillardB.em = await memePas(pb, regIle);
  verifie(dehorsB && vueSuit && bandeauB !== null && brouillardB.ici && brouillardB.garde > 0 && !brouillardB.confirmee && brouillardB.em,
    `8b. B est sorti de la ferme (case ${cb % Wi},${Math.floor(cb / Wi)} ; la ferme finit à la colonne ${Fi.X + Fi.LARGEUR - 1}) : la vue le suit, le bandeau ne dit plus « rien d'autre n'est synchronisé » (I9b), son brouillard se lève chez lui seul (${JSON.stringify({ vueSuit, bandeau: bandeauB !== null, ...brouillardB })})`);
  const ca = await allerA(pa, buts[1]);
  const piedsDe = (p) => p.evaluate(() => { const v = FarmStage.scene().fermier.vu(); return v && { x: v.x, y: v.y - v.h }; });
  const voitLAutre = (p, id, pieds) => attendre(p, (c) => { const e = (FarmStage.scene().presences || new Map()).get(c.id); return !!e && Math.hypot(e.img.x - c.x, e.img.y - c.y) < 6; }, { id, ...pieds }, 6000);
  const aVoitB = await voitLAutre(pa, B.id, await piedsDe(pb)), bVoitA = await voitLAutre(pb, A.id, await piedsDe(pa));
  verifie(!caseDansLaFerme(ile, ca) && aVoitB !== null && bVoitA !== null, `8c. A est sorti aussi (case ${ca % Wi},${Math.floor(ca / Wi)}) : dehors, chacun voit l'autre là où il est (A voit B en ${aVoitB} ms, B voit A en ${bVoitA} ms)`);
  if (process.env.CAPTURES) {
    for (const p of [pa, pb]) { await pourCapture(p); await p.waitForTimeout(800); }
    await pb.screenshot({ path: process.env.CAPTURES + '/i9a-invite-dehors.png' });
    await pa.screenshot({ path: process.env.CAPTURES + '/i9a-hote-dehors.png' });
  }
  // un mur posé dehors : refusé avant d'être envoyé (I9b : par le moteur, dans la partie locale : dehors, pas de mur)
  const revIle = regIle.rev;
  const refusDehors = await pb.evaluate(async (t) => { const C = await import('/js/ui/commandes.js'); const L = await import('/js/ui/en-ligne.js'); const r = C.executer('bloc.poser', { sorte: 'mur_pierre', case: t }); return { ok: r.ok, erreur: r.error || '', attente: L._lien().synchro.enAttente.length }; }, cb + 2 * Wi);
  await pb.waitForTimeout(300);
  verifie(!refusDehors.ok && /pas hors de la ferme/.test(refusDehors.erreur) && refusDehors.attente === 0 && regIle.rev === revIle, `8d. un mur posé dehors est refusé tout de suite (${refusDehors.erreur}) ; le monde n'a rien reçu`);
  // 10. I9b : les changements de l'île. A et B sont dehors, l'un près de l'autre.
  {
    // (une pièce du monde que les deux cartes dessinent, à prendre avec la hache, la plus proche de A : `coups` coups)
    const pieceVue = (p, coups, sauf = []) => p.evaluate((o) => {
      const sc = FarmStage.scene(), f = sc.fermier.info();
      let best = null, bd = Infinity;
      for (const x of (sc.mondeObjets || new Map()).values()) {
        if (!x.img || !x.img.visible || x.regle.geste !== 'couper' || (x.regle.coups || 1) !== o.coups || o.sauf.includes(x.id)) continue;
        const d = Math.hypot(x.fx - f.x, x.fy - f.y);
        if (d < bd) { bd = d; best = x.id; }
      }
      return best;
    }, { coups, sauf });
    const vuePar = (p, id) => p.evaluate((i) => !!(FarmStage.scene().mondeObjets || new Map()).get(i), id);
    // (le geste par le pont de la carte, comme un appui de la hache : js/ui/outils.js mondeFromStage)
    const couper = (p, id) => p.evaluate(async (i) => { const O = await import('/js/ui/outils.js'); const r = O.mondeFromStage(i, { geste: 'couper', depuis: -1 }); return r ? { ok: true, tombe: !!r.tombe, items: r.items || null } : { ok: false }; }, id);
    const boisDe = (p) => p.evaluate(async () => { const E = await import('/js/engine/index.js'); return E.countItem(FF.state, 'bois'); });
    // 10a. A abat un arbre : B le voit tomber
    let arbre = null;
    for (const c of [3, 2, 4]) { const id = await pieceVue(pa, c); if (id && await vuePar(pb, id)) { arbre = id; break; } }
    const nCoups = arbre ? Number((await pa.evaluate((i) => FarmStage.scene().mondeObjets.get(i).regle.coups, arbre)) || 1) : 0;
    const boisB0 = await boisDe(pb);
    let dernier = null, t0 = 0;
    for (let k = 0; arbre && k < nCoups; k++) {
      if (k === nCoups - 1) t0 = Date.now();
      dernier = await couper(pa, arbre);
      if (!dernier.ok) break;
      await pa.waitForTimeout(250);
    }
    const msChute = arbre ? await attendre(pb, (i) => { const sc = FarmStage.scene(), o = sc.mondeObjets.get(i); return !!sc.mondeEtat && sc.mondeEtat.pris.has(i) && !!o && (!!o.anim || !o.img.visible); }, arbre, 3000) : null;
    const msVu = msChute === null ? null : Date.now() - t0;
    if (process.env.CAPTURES && arbre) {
      await pb.waitForTimeout(250);
      for (const p of [pa, pb]) await pourCapture(p);
      await pb.screenshot({ path: process.env.CAPTURES + '/i9b-invite-arbre-tombe.png' });
    }
    const boisB = await attendre(pb, (n) => import('/js/engine/index.js').then((E) => E.countItem(FF.state, 'bois') > n), boisB0, 3000);
    verifie(!!arbre && dernier && dernier.ok && dernier.tombe && msChute !== null && msVu < 1000 && boisB !== null && (await memePas(pa, regIle)) && (await memePas(pb, regIle)),
      `10a. A a abattu l'arbre ${arbre} (${nCoups} coups de hache) : B le voit tomber ${msVu} ms après le dernier coup ; le bois au coffre commun chez B ; les parties confirmées sont celle du monde`);
    // 10b. les deux sur le même buisson, au même instant : un seul gagne
    let buisson = null;
    for (const sauf of [[arbre]]) { const id = await pieceVue(pb, 1, sauf); if (id && await vuePar(pa, id)) buisson = id; }
    const boisMonde0 = countItem(regIle.charger(), 'bois'), revB0 = regIle.rev;
    const [ra, rb] = buisson ? await Promise.all([couper(pa, buisson), couper(pb, buisson)]) : [{}, {}];
    await pa.waitForTimeout(800);
    const gagnants = [...regIle.tous('SELECT cmd FROM journal WHERE rev > ?', revB0)].map((e) => JSON.parse(e.cmd)).filter((c) => c.type === 'monde.recolter' && c.args.piece === buisson).length;
    const revs = async () => [regIle.rev, ...(await Promise.all([pa, pb].map((p) => p.evaluate(async () => (await import('/js/ui/en-ligne.js'))._lien().synchro.rev))))];
    const revs0 = await revs(), memeA = await memePas(pa, regIle), memeB = await memePas(pb, regIle);
    const unSeul = gagnants === 1 && countItem(regIle.charger(), 'bois') > boisMonde0 && memeA && memeB;
    const attenteVide = await pb.evaluate(async () => { const L = await import('/js/ui/en-ligne.js'); return L._lien().synchro.enAttente.length === 0; }) && await pa.evaluate(async () => { const L = await import('/js/ui/en-ligne.js'); return L._lien().synchro.enAttente.length === 0; });
    const boisAB = [await boisDe(pa), await boisDe(pb), countItem(regIle.charger(), 'bois')];
    // (I9d : « au même instant » se joue à quelques millisecondes : si l'événement de l'un arrive chez l'autre avant que son coup
    // parte, sa partie locale le refuse déjà — le buisson est pris — ; c'est le même conflit, tranché plus tôt)
    verifie(!!buisson && (ra.ok || rb.ok) && unSeul && attenteVide && boisAB[0] === boisAB[2] && boisAB[1] === boisAB[2],
      `10b. A et B coupent le même buisson (${buisson}) au même instant : le monde n'en garde qu'un (${gagnants} au journal), l'autre coup est annulé ; le bois une seule fois, le même chez les deux (${boisAB.join(' / ')}) ${JSON.stringify({ a: ra.ok, b: rb.ok, unSeul, attenteVide, memeA, memeB, revs: revs0 })}`);
    // 10c. un chemin posé dehors par B, vu chez A
    const posee = await pb.evaluate(async () => {
      const E = await import('/js/engine/index.js'), C = await import('/js/ui/commandes.js');
      const sc = FarmStage.scene(), f = sc.fermier.info(), W = E.farmTerrain(FF.state).LARGEUR;
      const c0 = Math.floor((f.y - 1) / 16) * W + Math.floor(f.x / 16);
      for (let d = 2; d < 8; d++) for (const c of [c0 + d * W, c0 - d * W, c0 + d, c0 - d]) {
        if (E.caseDansLaFerme(FF.state, c) || !E.poseStatus(FF.state, 'chemin', c).ok) continue;
        const r = C.executer('bloc.poser', { sorte: 'chemin', case: c });
        return { case: c, ok: r.ok, erreur: r.error || '' };
      }
      return { case: null, ok: false, erreur: 'pas de case' };
    });
    const msChemin = posee.ok ? await attendre(pa, (c) => import('/js/engine/index.js').then((E) => E.cheminDehorsSur(FF.state, c)), posee.case, 3000) : null;
    const monde = posee.ok && cheminDehorsSur(regIle.charger(), posee.case);
    if (process.env.CAPTURES && posee.ok) {
      await pa.waitForTimeout(600);
      for (const p of [pa, pb]) await pourCapture(p);
      await pa.screenshot({ path: process.env.CAPTURES + '/i9b-hote-chemin.png' });
      await pb.screenshot({ path: process.env.CAPTURES + '/i9b-invite-chemin.png' });
    }
    verifie(posee.ok && msChemin !== null && monde && (await memePas(pa, regIle)), `10c. B a posé un chemin dehors (case ${posee.case}) : A le voit en ${msChemin} ms ; le monde l'a dans ses chemins (${posee.erreur})`);
    // 10d. le bandeau d'I9a est retiré ; chacun garde son brouillard
    const bandeaux = [await pa.evaluate(() => document.getElementById('en-ligne-bandeau').innerText), await pb.evaluate(() => document.getElementById('en-ligne-bandeau').innerText)];
    const vuDe = (p) => p.evaluate(async () => { const L = await import('/js/ui/en-ligne.js'); return { locale: FF.state.monde.vu, confirmee: L._lien().synchro.confirmee.monde.vu }; });
    const [vuA, vuB] = [await vuDe(pa), await vuDe(pb)], vuMonde = regIle.charger().monde.vu;
    verifie(bandeaux.every((t) => !/rien d'autre/.test(t) && /à jour/.test(t)), `10d. dehors, plus de bandeau « rien d'autre n'est encore synchronisé » (A : « ${bandeaux[0].replace(/\s+/g, ' ')} »)`);
    verifie(vuA.confirmee === vuMonde && vuB.confirmee === vuMonde && vuA.locale !== vuMonde && vuB.locale !== vuMonde && vuA.locale !== vuB.locale,
      '10e. le brouillard reste à chacun : la partie confirmée de chacun a le vu du monde, sa partie locale le sien, différent de celui de l\'autre');
    if (process.env.CAPTURES) {
      for (const p of [pa, pb]) await pourCapture(p);
      await pa.screenshot({ path: process.env.CAPTURES + '/i9b-hote-dehors.png' });
      await pb.screenshot({ path: process.env.CAPTURES + '/i9b-invite-dehors.png' });
    }
  }
  // 11. I9c : le port et la caisse en ligne (une île de 29, le jour 3 : un jour de bac ; à 7 h 30, il accoste à 9 h)
  {
    const ile3 = avecVillage(() => createNewGame('29', { nom: 'Île' }));
    ile3.essais = { ...(ile3.essais || {}), village: true };
    testSetLevel(ile3, 5);   // (le commerce du port s'ouvre au niveau 3)
    ile3.day = 3;
    ile3.awakeMs = Math.round((7.5 - DATA.TEMPS.HEURE_REVEIL) * DATA.TEMPS.SECONDES_PAR_HEURE * 1000);
    addItem(ile3, 'carotte', 12);
    addItem(ile3, 'bois', 10);
    addItem(ile3, 'brouette', 1);
    addItem(ile3, 'charrette', 1);
    ile3.cheval = { monte: false, nourri: true, attache: null };
    const cree3 = await appel(A, '/mondes', { partie: { v: ile3.version, t: Date.now(), s: ile3 }, titre: 'L\'île du port' });
    const inv3 = cree3.ok ? await appel(A, `/mondes/${cree3.monde}/invitations`, { role: 'batisseur' }) : {};
    const entre3 = inv3.ok ? await appel(B, '/rejoindre', { code: inv3.code }) : {};
    const reg3 = cree3.ok && mondes.get(cree3.monde).registre;
    const comptoir = reg3 && comptoirDuPort(reg3.charger());
    // (un geste joué par la page, à la case du personnage, comme un bouton de la fenêtre du port)
    const jouerIci = (p, type, args = {}) => p.evaluate(async ([type, args]) => { const C = await import('/js/ui/commandes.js'); const r = C.executer(type, { ...args, case: Math.max(0, FarmStage.persoCase()) }); return { ok: !!r.ok, erreur: r.error || '', n: r.n, gain: r.gain }; }, [type, args]);
    const attendreMonde = async (f, ms = 8000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (f()) return Date.now() - t0; await pa.waitForTimeout(25); } return null; };
    const sansAide = (p) => p.evaluate(() => { if (document.getElementById('capture-style2')) return; const st = document.createElement('style'); st.id = 'capture-style2'; st.textContent = '#tuto-root, #consent-banner { display: none !important; }'; document.head.appendChild(st); });
    // 11a. sur la ferme : A attelle la charrette et y charge les carottes ; B ne peut pas l'atteler, il prend la brouette, y charge le bois
    for (const [p, dx] of [[pa, 0], [pb, -2]]) await p.evaluate((v) => localStorage.setItem('ferme-position', JSON.stringify(v)), pres(dx));
    for (const p of [pa, pb]) await p.goto(`${BASE}/jeu.html?monde=${cree3.monde}`);
    const dedans3 = await attendre(pa, pret, null, 30000) !== null && await attendre(pb, pret, null, 30000) !== null;
    const attelle = await jouerIci(pa, 'portage.vehicule', { vehicule: 'charrette' });
    const chargeA = await jouerIci(pa, 'portage.charger', { objet: 'carotte', quantite: 12 });
    await attendreMonde(() => { const c = reg3.charger().charges[A.id]; return !!c && !!c.charge.carotte; });
    await attendre(pb, (id) => { const c = FF.state.charges && FF.state.charges[id]; return !!c && !!c.charge && !!c.charge.carotte; }, A.id, 5000);
    const refusB = await jouerIci(pb, 'portage.vehicule', { vehicule: 'charrette' });
    const brouette = await jouerIci(pb, 'portage.vehicule', { vehicule: 'brouette' });
    const chargeB = await jouerIci(pb, 'portage.charger', { objet: 'bois', quantite: 10 });
    await attendreMonde(() => { const c = reg3.charger().charges[B.id]; return !!c && !!c.charge.bois; });
    const w3 = reg3.charger();
    const vueA = await pa.evaluate(async () => { const S = FarmStage.scene(); const P = await import('/js/engine/index.js'); return { vehicule: P.vehiculePortage(FF.state), volume: P.volumeCharge(FF.state) }; });
    verifie(cree3.ok && entre3.ok && dedans3 && !!comptoir && attelle.ok && chargeA.ok && chargeA.n === 12 && !refusB.ok && /attelée par un autre joueur/.test(refusB.erreur) && brouette.ok && chargeB.ok
      && w3.charges[A.id].vehicule === 'charrette' && w3.charges[B.id].vehicule === 'brouette' && vueA.vehicule === 'charrette' && countItem(w3, 'carotte') === 0,
      `11a. la charrette : A l'attelle et y charge 12 carottes ; B ne peut pas (« ${refusB.erreur} ») ; il prend la brouette et y charge le bois ; chacun sa charge, le coffre commun vidé`);
    if (process.env.CAPTURES) {
      await sansAide(pb); await pb.waitForTimeout(300);
      await pb.screenshot({ path: process.env.CAPTURES + '/i9c-invite-charrette-refusee.png' });
    }
    // 11b. les deux au port, devant le comptoir (chacun repart là où sa page l'a vu en dernier : on l'y pose)
    const auPort = (k) => ({ graine: '29', x: ((comptoir.devant % Wi) + k) * 16 + 8, y: (Math.floor(comptoir.devant / Wi) + 1) * 16 + 15 });
    for (const [p, k] of [[pa, 0], [pb, 1]]) await p.evaluate((v) => localStorage.setItem('ferme-position', JSON.stringify(v)), auPort(k));
    for (const p of [pa, pb]) await p.goto(`${BASE}/jeu.html?monde=${cree3.monde}`);
    const auPort3 = await attendre(pa, pret, null, 30000) !== null && await attendre(pb, pret, null, 30000) !== null;
    const ouvert = (p) => p.evaluate(async () => { const P = await import('/js/engine/index.js'); return { ok: P.portOuvert(FF.state, FarmStage.persoCase()).ok, aQuai: !!(P.etatBac(FF.state) || {}).aQuai, pas: P.pasDe(FF.state) }; });
    const [oa, ob] = [await ouvert(pa), await ouvert(pb)];
    const aVoit3 = await voitLAutre(pa, B.id, await piedsDe(pb)), bVoit3 = await voitLAutre(pb, A.id, await piedsDe(pa));
    verifie(auPort3 && oa.ok && ob.ok && aVoit3 !== null && bVoit3 !== null, `11b. les deux joueurs au port, au comptoir (ouvert chez chacun), chacun voit l'autre ; le bac ${oa.aQuai ? 'est déjà à quai' : 'n\'est pas encore là'} (pas ${oa.pas})`);
    if (process.env.CAPTURES) {
      for (const p of [pa, pb]) { await pourCapture(p); await p.waitForTimeout(600); }
      await pa.screenshot({ path: process.env.CAPTURES + '/i9c-hote-port.png' });
      await pb.screenshot({ path: process.env.CAPTURES + '/i9c-invite-port.png' });
    }
    // 11c. le bac accoste à 9 h : chacun le voit arriver au même pas, à quai chez les deux
    const accoste = {};
    for (const t0 = Date.now(); Date.now() - t0 < 90000 && !(accoste.A && accoste.B);) {
      for (const [q, p] of [['A', pa], ['B', pb]]) { if (accoste[q]) continue; const o = await ouvert(p); if (o.aQuai) accoste[q] = o; }
      await pa.waitForTimeout(100);
    }
    const quaiMonde = reg3.avancer() && !!etatBac(reg3.charger()).aQuai;
    verifie(!!accoste.A && !!accoste.B && (oa.aQuai || accoste.A.pas === accoste.B.pas) && quaiMonde, `11c. le bac à quai, vu par les deux ${oa.aQuai ? '' : `au même pas (A : ${accoste.A && accoste.A.pas}, B : ${accoste.B && accoste.B.pas})`} et par le monde`);
    if (process.env.CAPTURES) {
      for (const p of [pa, pb]) { await pourCapture(p); await p.waitForTimeout(8000 / 2); }
      await pa.screenshot({ path: process.env.CAPTURES + '/i9c-hote-bac.png' });
      await pb.screenshot({ path: process.env.CAPTURES + '/i9c-invite-bac.png' });
    }
    // 11d. A vend ses carottes, B son bois : la caisse commune monte de la somme juste, chez l'autre aussi ; le journal dit qui a vendu quoi
    for (const p of [pa, pb]) await p.evaluate(() => { const st = document.getElementById('capture-style'); if (st) st.remove(); });
    await sansAide(pb);
    await pb.evaluate(async () => { const W = await import('/js/ui/stage-windows.js'); W.openStageWindow('comptoir'); });
    const p0 = reg3.charger().pieces;
    const venteA = await jouerIci(pa, 'port.decharger');
    const msCaisseB = await attendre(pb, (v) => FF.state.pieces === v && /a tout vendu au port : 12/.test(document.body.innerText), p0 + (venteA.gain || 0), 5000);
    if (process.env.CAPTURES) { await pb.waitForTimeout(400); await pb.screenshot({ path: process.env.CAPTURES + '/i9c-invite-caisse.png' }); }
    const venteB = await jouerIci(pb, 'port.decharger');
    const msCaisseA = await attendre(pa, (v) => FF.state.pieces === v, p0 + (venteA.gain || 0) + (venteB.gain || 0), 5000);
    await attendreMonde(() => reg3.charger().pieces === p0 + (venteA.gain || 0) + (venteB.gain || 0));
    const caisses = [reg3.charger().pieces, await pa.evaluate(() => FF.state.pieces), await pb.evaluate(() => FF.state.pieces)];
    await action(pa, 'monde-journal');
    const journal3 = await attendre(pa, () => /a tout vendu au port : 10/.test(document.body.innerText) && /a tout vendu au port : 12/.test(document.body.innerText), null, 5000);
    // (qui : le journal du monde, par compte — les noms montrés sont ceux des personnages)
    const qui3 = reg3.journal(A.id).evts.filter((e) => e.type === 'port.decharger').map((e) => [e.acteur === A.id ? 'A' : e.acteur === B.id ? 'B' : '?', Object.keys(e.bilan.vendus).join()]);
    const texteJournal = await pa.evaluate(() => (document.querySelector('.journal-monde') || {}).innerText || '');
    verifie(venteA.ok && venteB.ok && venteA.gain > 0 && venteB.gain > 0 && msCaisseB !== null && msCaisseA !== null && caisses.every((x) => x === p0 + venteA.gain + venteB.gain) && journal3 !== null && JSON.stringify(qui3) === JSON.stringify([['B', 'bois'], ['A', 'carotte']]) && /carotte/.test(texteJournal) && /bois/.test(texteJournal) && (await memePas(pa, reg3)) && (await memePas(pb, reg3)),
      `11d. A vend ses carottes (+${venteA.gain}), B son bois (+${venteB.gain}) : la caisse commune monte de la somme juste (${p0} → ${caisses[0]}) chez l'autre en ${msCaisseB} ms et ${msCaisseA} ms ; le journal dit qui a vendu quoi`);
    if (process.env.CAPTURES) {
      await sansAide(pa); await pa.waitForTimeout(300);
      await pa.screenshot({ path: process.env.CAPTURES + '/i9c-journal.png' });
    }
    await action(pa, 'close-modal');
  }
  // 8e. (PORT=1, long : ≈ 2 min) A marche jusqu'au port par son chemin, B le suit ; au port, chacun voit l'autre
  if (process.env.PORT) {
    const M = Ti.MONDE, ctxSol = contexteSol(M.graine, M.cadre, M.ferme, M.taille), port = elementsSol(ctxSol).lieux.port;
    const dist = (a, b) => Math.hypot((a % Wi) - (b % Wi), Math.floor(a / Wi) - Math.floor(b / Wi));
    const chemin = dist(port.chemin[0], sortie) < dist(port.chemin[port.chemin.length - 1], sortie) ? port.chemin : [...port.chemin].reverse();
    const t0 = Date.now();
    const aller = (p, t) => p.evaluate((o) => FarmStage.scene().goHere((o.t % o.W) * 16 + 8, Math.floor(o.t / o.W) * 16 + 8), { t, W: Wi });
    for (let k = 12; k < chemin.length + 12; k += 12) {
      const but = chemin[Math.min(k, chemin.length - 1)];
      const tk = Date.now();
      while (Date.now() - tk < 20000 && dist(await caseDe(pa), but) > 2) {
        await aller(pa, but);
        await pb.waitForTimeout(400);
        await aller(pb, await caseDe(pa));   // (B suit A)
        await pb.waitForTimeout(400);
      }
    }
    const tk = Date.now();
    while (Date.now() - tk < 20000 && dist(await caseDe(pb), await caseDe(pa)) > 3) { await aller(pb, await caseDe(pa)); await pb.waitForTimeout(500); }
    const [fa, fb] = [await caseDe(pa), await caseDe(pb)];
    const aVoit = await voitLAutre(pa, B.id, await piedsDe(pb)), bVoit = await voitLAutre(pb, A.id, await piedsDe(pa));
    verifie(dist(fa, port.case) < 25 && dist(fb, fa) <= 4 && aVoit !== null && bVoit !== null,
      `8e. A a marché jusqu'au port (à ${dist(fa, port.case).toFixed(0)} cases de son quai), B l'a suivi (à ${dist(fb, fa).toFixed(0)} cases) en ${((Date.now() - t0) / 1000).toFixed(0)} s : chacun voit l'autre`);
    if (process.env.CAPTURES) {
      for (const p of [pa, pb]) { await pourCapture(p); await p.waitForTimeout(800); }
      await pb.screenshot({ path: process.env.CAPTURES + '/i9a-invite-port.png' });
      await pa.screenshot({ path: process.env.CAPTURES + '/i9a-hote-port.png' });
    }
  }
  // 9. I9a2 : l'horloge commune d'une île
  {
    const ile2 = avecVillage(() => createNewGame('31', { nom: 'Île' }));
    ile2.essais = { ...(ile2.essais || {}), village: true };
    testSetLevel(ile2, 5);
    for (const st of ['foyer', 'cuisine']) testBatir(ile2, st);
    for (const ing of DATA.RECETTES.omelette.ingredients) addItem(ile2, ing.item, ing.qte * 10);
    ile2.awakeMs = (21 - DATA.TEMPS.HEURE_REVEIL) * DATA.TEMPS.SECONDES_PAR_HEURE * 1000;   // (21 h)
    const cree2 = await appel(A, '/mondes', { partie: { v: ile2.version, t: Date.now(), s: ile2 }, titre: 'L\'île du soir' });
    const inv2 = cree2.ok ? await appel(A, `/mondes/${cree2.monde}/invitations`, { role: 'batisseur' }) : {};
    const entre2 = inv2.ok ? await appel(B, '/rejoindre', { code: inv2.code }) : {};
    const id2 = cree2.monde, reg2 = id2 && mondes.get(id2).registre;
    for (const p of [pa, pb]) await p.goto(`${BASE}/jeu.html?monde=${id2}`);
    const dedans2 = (await attendre(pa, pret, null, 30000)) !== null && (await attendre(pb, pret, null, 30000)) !== null;
    const heure = (p) => p.evaluate(async () => { const E = await import('/js/engine/index.js'); return { pas: E.pasDe(FF.state), h: E.clockHours(FF.state), jour: FF.state.day, nuit: E.nightActive(FF.state) }; });
    const h0 = [await heure(pa), await heure(pb)];
    await pa.waitForTimeout(6000);
    const h1 = [await heure(pa), await heure(pb)];
    reg2.avancer();
    const pasMonde = pasDe(reg2.charger());
    verifie(cree2.ok && entre2.ok && dedans2 && h1[0].pas > h0[0].pas && h1[1].pas > h0[1].pas && Math.abs(h1[0].pas - h1[1].pas) <= 1 && Math.abs(h1[0].pas - pasMonde) <= 1,
      `9a. l'île du soir en ligne (${id2}) : l'heure avance chez les deux et reste celle du monde (A ${h0[0].h.toFixed(2)} → ${h1[0].h.toFixed(2)} h, B ${h0[1].h.toFixed(2)} → ${h1[1].h.toFixed(2)} h ; pas ${h1[0].pas} / ${h1[1].pas}, le monde ${pasMonde})`);
    if (process.env.CAPTURES) {
      for (const p of [pa, pb]) { await pourCapture(p); await p.waitForTimeout(500); }
      await pa.screenshot({ path: process.env.CAPTURES + '/i9a2-hote-soir.png' });
      await pb.screenshot({ path: process.env.CAPTURES + '/i9a2-invite-soir.png' });
    }
    // 9b. une omelette lancée par B : prête chez les deux à son heure (le pas où la cuisine se libère, noté par chacun)
    const guetter = (p) => p.evaluate(async () => { const E = await import('/js/engine/index.js'); window.__prete = null; const voir = () => { const st = FF.state.stations.cuisine; if (st && !st.tache) { window.__prete = { pas: E.pasDe(FF.state), h: E.clockHours(FF.state) }; return; } requestAnimationFrame(voir); }; requestAnimationFrame(voir); });
    const lance = await pb.evaluate(async () => { const E = await import('/js/engine/index.js'); const C = await import('/js/ui/commandes.js'); const r = C.executer('cuisine.lancer', { recette: 'omelette' }); return { ok: r.ok, erreur: r.error || '', pas: E.pasDe(FF.state), h: E.clockHours(FF.state) }; });
    await attendre(pa, () => !!(FF.state.stations.cuisine && FF.state.stations.cuisine.tache), null, 5000);
    for (const p of [pa, pb]) await guetter(p);
    const prA = await attendre(pa, () => !!window.__prete, null, 20000), prB = await attendre(pb, () => !!window.__prete, null, 20000);
    const [pretA, pretB] = [await pa.evaluate(() => window.__prete), await pb.evaluate(() => window.__prete)];
    const om = [...reg2.tous('SELECT cmd FROM journal')].map((e) => JSON.parse(e.cmd)).find((c) => c.type === 'cuisine.lancer');
    const attendu = om ? om.pas + Math.ceil((DATA.RECETTES.omelette.temps * 1000) / DATA.VILLAGE.EN_LIGNE.PAS_MS) : null;
    verifie(lance.ok && prA !== null && prB !== null && pretA.pas === attendu && pretB.pas === attendu && pretA.h === pretB.h,
      `9b. B a lancé une omelette à ${lance.h.toFixed(2)} h (le monde l'a jouée au pas ${om && om.pas}) : prête chez A et chez B au pas ${attendu}, à ${pretA && pretA.h.toFixed(2)} h (${JSON.stringify({ lance, pretA, pretB })})`);
    if (process.env.CAPTURES) {
      // (le mot « prêt ! » de chacun : les messages, cette fois, montrés)
      for (const p of [pa, pb]) await p.evaluate(() => { const st = document.getElementById('capture-style'); if (st) st.remove(); const t = document.getElementById('tuto-root'); if (t) t.style.display = 'none'; });
      await pa.screenshot({ path: process.env.CAPTURES + '/i9a2-hote-plat.png' });
      await pb.screenshot({ path: process.env.CAPTURES + '/i9a2-invite-plat.png' });
    }
    // 9c. la nuit tombe seule à 22 h, chez les deux
    const nuitA = await attendre(pa, async () => { const E = await import('/js/engine/index.js'); return E.nightActive(FF.state); }, null, 45000);
    const nuitB = await attendre(pb, async () => { const E = await import('/js/engine/index.js'); return E.nightActive(FF.state); }, null, 10000);
    verifie(nuitA !== null && nuitB !== null, '9c. la nuit tombe seule à 22 h, chez les deux');
    // 9d. A se couche, B non : la nuit garde son pas
    const jour2 = (await heure(pa)).jour;
    await action(pa, 'monde-coucher');
    await attendre(pb, () => /1\/2/.test(document.getElementById('en-ligne-bandeau').innerText), null, 5000);
    const n0 = await heure(pa);
    await pa.waitForTimeout(5200);
    const n1 = await heure(pa);
    const unSeul = !reg2.charger().horloge.sommeil && n1.pas - n0.pas <= 2 && n1.jour === n0.jour;
    verifie(unSeul && /1\/2/.test(await pb.evaluate(() => document.getElementById('en-ligne-bandeau').innerText)), `9d. A couché, B debout (1/2) : la nuit garde son pas (${n1.pas - n0.pas} pas en 5 s)`);
    // 9e. B se couche : la nuit file, le matin vient chez les deux
    const t0 = Date.now();
    await action(pb, 'monde-coucher');
    await attendre(pa, () => /Couché 2\/2/.test(document.getElementById('en-ligne-bandeau').innerText), null, 5000);
    if (process.env.CAPTURES) {
      await pa.waitForTimeout(2500);
      for (const p of [pa, pb]) await pourCapture(p);
      await pa.screenshot({ path: process.env.CAPTURES + '/i9a2-hote-nuit.png' });
      await pb.screenshot({ path: process.env.CAPTURES + '/i9a2-invite-nuit.png' });
    }
    const matinA = await attendre(pa, (j) => FF.state.day === j + 1 && !FF.state.nuitEnCours, jour2, 70000);
    const matinB = await attendre(pb, (j) => FF.state.day === j + 1 && !FF.state.nuitEnCours, jour2, 10000);
    const duree = (Date.now() - t0) / 1000;
    await pa.waitForTimeout(1500);
    reg2.avancer();
    const leve = !/Couché/.test(await pa.evaluate(() => document.getElementById('en-ligne-bandeau').innerText)) && !reg2.charger().horloge.sommeil;
    const memes = (await memePas(pa, reg2)) && (await memePas(pb, reg2));
    verifie(matinA !== null && matinB !== null && duree < 60 && leve && memes, `9e. B couché aussi : la nuit file, le jour ${jour2 + 1} se lève chez les deux en ${duree.toFixed(0)} s (8 h de nuit) ; chacun est levé ; les parties confirmées sont celle du monde, au même pas`);
    if (process.env.CAPTURES) {
      for (const p of [pa, pb]) { await pourCapture(p); await p.waitForTimeout(500); }
      await pa.screenshot({ path: process.env.CAPTURES + '/i9a2-hote-matin.png' });
      await pb.screenshot({ path: process.env.CAPTURES + '/i9a2-invite-matin.png' });
    }
  }
  // 12. I9d : les villageois en ligne
  {
    const ile3 = avecVillage(() => createNewGame('31', { nom: 'Île' }));
    ile3.essais = { ...(ile3.essais || {}), village: true };
    testSetLevel(ile3, 5);
    testBatir(ile3, 'foyer');
    for (let k = 0; k < 3; k++) { testMaisonVillageois(ile3); arriverVillageois(ile3, { direct: true }); }
    addItem(ile3, 'pain', 80);
    addItem(ile3, 'pomme', 10);
    ile3.outils = { ...(ile3.outils || {}), hache: true, pioche: true, faux: true };
    villageoisDe(ile3).forEach((v, i) => { const [t, o] = [['bois', 'hache'], ['pierre', 'pioche'], ['fauchage', 'faux']][i]; donnerOutil(ile3, v.id, o); attribuer(ile3, v.id, t); });
    ile3.awakeMs = (10.4 - DATA.TEMPS.HEURE_REVEIL) * DATA.TEMPS.SECONDES_PAR_HEURE * 1000;   // (10 h 24 : au travail)
    const cree3 = await appel(A, '/mondes', { partie: { v: ile3.version, t: Date.now(), s: ile3 }, titre: 'Le village' });
    const inv3 = cree3.ok ? await appel(A, `/mondes/${cree3.monde}/invitations`, { role: 'jardinier' }) : {};
    const entre3 = inv3.ok ? await appel(B, '/rejoindre', { code: inv3.code }) : {};
    const id3 = cree3.monde, reg3 = id3 && mondes.get(id3).registre;
    for (const p of [pa, pb]) await p.goto(`${BASE}/jeu.html?monde=${id3}`);
    const dedans3 = (await attendre(pa, pret, null, 30000)) !== null && (await attendre(pb, pret, null, 30000)) !== null;
    const nVg = villageoisDe(ile3).length;
    await attendre(pa, (n) => (FarmStage.scene().villageoisVus || new Map()).size >= n, nVg, 10000);
    await attendre(pb, (n) => (FarmStage.scene().villageoisVus || new Map()).size >= n, nVg, 10000);
    // ce que chacun voit : où le moteur met chaque villageois à l'heure affichée (son état, son lieu), où la scène le dessine
    const vus = (p) => p.evaluate(async () => {
      const E = await import('/js/engine/index.js'), S = await import('/js/ui/stage.js');
      const sc = FarmStage.scene(), h = S.heureDuJour(), out = {};
      for (const [id, m] of sc.villageoisVus || new Map()) {
        const q = E.positionVillageois(FF.state, id, h);
        out[id] = { etat: q && q.etat, lieu: q && q.lieu ? q.lieu.case ?? null : null, x: Math.round(m.x), y: Math.round(m.y) };
      }
      return { h, pas: E.pasDe(FF.state), v: out };
    });
    // (les deux au même instant : on relève quand les deux pages sont au même pas, loin d'un bord de pas)
    const ensemble = async () => {
      for (let k = 0; k < 40; k++) {
        const [x, y] = await Promise.all([vus(pa), vus(pb)]);
        if (x.pas === y.pas && Math.abs(x.h - y.h) < 0.05) return [x, y];
        await pa.waitForTimeout(300);
      }
      return Promise.all([vus(pa), vus(pb)]);
    };
    // (les captures : la fenêtre du moment fermée, la vue posée sur le premier villageois — la caméra ne suit plus le personnage)
    // (les captures : la fenêtre du moment fermée ; chacun est allé près du premier villageois, la vue le suit)
    const versVillageois = (p) => p.evaluate(() => { const sc = FarmStage.scene(), m = (sc.villageoisVus || new Map()).get('vg-1'); if (m) sc.goHere(Math.round(m.x) + 24, Math.round(m.y) + 40); });
    const capture = async (p, nom) => {
      await action(p, 'close-modal');
      await pourCapture(p);
      await p.screenshot({ path: `${process.env.CAPTURES}/${nom}.png` });
    };
    const captures = async (k) => {
      await Promise.all([versVillageois(pa), versVillageois(pb)]);
      await pa.waitForTimeout(6000);
      await Promise.all([capture(pa, `i9d-hote-${k}`), capture(pb, `i9d-invite-${k}`)]);   // (au même instant)
    };
    const compare = ([x, y]) => {
      const ids = Object.keys(x.v);
      const memes = ids.every((id) => y.v[id] && y.v[id].etat === x.v[id].etat && y.v[id].lieu === x.v[id].lieu);
      const ecart = Math.max(0, ...ids.map((id) => (y.v[id] ? Math.hypot(y.v[id].x - x.v[id].x, y.v[id].y - x.v[id].y) : 1e9)));
      return { memes, ecart: Math.round(ecart), etats: ids.map((id) => x.v[id].etat), n: ids.length };
    };
    // (le temps que chacun ait marché jusqu'à son poste : les deux cartes ne l'ont pas fait partir au même instant)
    let travail = null;
    for (let k = 0; k < 15; k++) { await pa.waitForTimeout(1000); travail = compare(await ensemble()); if (travail.memes && travail.ecart <= 32) break; }
    verifie(cree3.ok && entre3.ok && dedans3 && travail.n === nVg && travail.memes && travail.etats.filter((e) => e === 'travail').length >= 2 && travail.ecart <= 32,
      `12a. le village en ligne (${id3}) : A et B voient les ${travail.n} villageois aux mêmes postes, au travail (${travail.etats.join(', ')} ; au plus ${travail.ecart} px d'écart entre les deux cartes)`);
    if (process.env.CAPTURES) {
      await captures('travail');
    }
    // 12b. le bois coupé arrive au coffre commun dans la matinée, chez les deux
    const bois3 = countItem(ile3, 'bois');
    const boisA = await attendre(pa, (n) => import('/js/engine/index.js').then((E) => E.countItem(FF.state, 'bois') > n), bois3, 30000);
    const boisB = await attendre(pb, (n) => import('/js/engine/index.js').then((E) => E.countItem(FF.state, 'bois') > n), bois3, 5000);
    const hBois = await pa.evaluate(async () => (await import('/js/engine/index.js')).clockHours(FF.state));
    verifie(boisA !== null && boisB !== null && hBois < 12 && (await memePas(pa, reg3)) && (await memePas(pb, reg3)), `12b. le bois coupé arrive au coffre commun dans la matinée, chez les deux (à ${hBois.toFixed(2)} h) ; les parties confirmées sont celle du monde`);
    // 12c. à table, à midi
    await attendre(pa, async () => (await import('/js/engine/index.js')).clockHours(FF.state) >= 12.15, null, 70000);
    let table = null;
    for (let k = 0; k < 15; k++) { await pa.waitForTimeout(1000); table = compare(await ensemble()); if (table.memes && table.ecart <= 32) break; }
    verifie(table.memes && table.etats.filter((e) => e === 'repas').length >= 2 && table.ecart <= 32, `12c. à midi, A et B les voient à table, aux mêmes places (${table.etats.join(', ')} ; au plus ${table.ecart} px d'écart)`);
    if (process.env.CAPTURES) {
      await captures('table');
    }
    // 12d. A parle à un villageois : son amitié monte ; celle de B reste la sienne
    const amitieDe = (p, id) => p.evaluate(async (i) => (await import('/js/engine/index.js')).amitieVillageois(FF.state, i).pts, id);
    const vg = 'vg-1', avantA = await amitieDe(pa, vg), avantB = await amitieDe(pb, vg), rev3 = reg3.rev;
    const parle = await pa.evaluate(async (i) => { const V = await import('/js/ui/villageois.js'); const r = V.villageoisDepuisCarte('parle', i, { n: 0, activite: 'repas' }); return r ? { ok: true, gain: r.amitie ? r.amitie.gain : null, texte: r.texte } : { ok: false }; }, vg);
    await attendre(pb, (r) => import('/js/ui/en-ligne.js').then((L) => L._lien().synchro.rev >= r), rev3 + 1, 5000);
    const [apresA, apresB] = [await amitieDe(pa, vg), await amitieDe(pb, vg)];
    const w3 = reg3.charger();
    verifie(parle.ok && parle.gain > 0 && apresA === avantA + parle.gain && apresB === avantB && w3.amities[A.id].pnj[vg].pts === apresA && !(w3.amities[B.id] && w3.amities[B.id].pnj[vg] && w3.amities[B.id].pnj[vg].pts !== avantB) && (await memePas(pb, reg3)),
      `12d. A parle à ${vg} (« ${parle.texte} ») : son amitié passe de ${avantA} à ${apresA} ; celle de B reste ${apresB} ; le monde garde chacune`);
    if (process.env.CAPTURES) {
      await pa.waitForTimeout(300);
      await pa.screenshot({ path: process.env.CAPTURES + '/i9d-hote-parle.png' });
    }
    // 12e. le tableau du village est le même chez les deux
    const tableau = (p) => p.evaluate(async () => { const L = await import('/js/ui/en-ligne.js'); const E = await import('/js/engine/index.js'); const S = L._lien().synchro; return { t: JSON.stringify(E.tableauVillage(FF.state)), pas: E.pasDe(FF.state), c: JSON.stringify(E.tableauVillage(S.confirmee)) }; });
    let tA = null, tB = null;
    for (let k = 0; k < 20; k++) { [tA, tB] = await Promise.all([tableau(pa), tableau(pb)]); if (tA.pas === tB.pas) break; await pa.waitForTimeout(250); }
    verifie(tA.pas === tB.pas && tA.t === tB.t && tA.c === tB.c && tA.t.length > 50, `12e. le tableau du village est le même chez A et chez B (${tA.t.length} caractères, pas ${tA.pas})`);
    if (process.env.CAPTURES) {
      for (const p of [pa, pb]) { await action(p, 'villageois-liste'); await p.waitForTimeout(400); }
      await pa.screenshot({ path: process.env.CAPTURES + '/i9d-hote-liste.png' });
      await pb.screenshot({ path: process.env.CAPTURES + '/i9d-invite-liste.png' });
      for (const p of [pa, pb]) await action(p, 'close-modal');
    }
  }
} finally {
  await navigateur.close();
  serveur.close();
}
for (const e of erreurs) console.log(`✗ erreur dans la page : ${e}`);
if (echecs.length || erreurs.length) { console.log(`Test à deux : ${echecs.length + erreurs.length} échec(s).`); process.exit(1); }
console.log('Test à deux : tout est bon.');
