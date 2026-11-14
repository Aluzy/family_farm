#!/usr/bin/env node
// I9b (les changements de l'île, synchronisés par région : docs/fiches/ile/I9b-synchro-monde.md) : ce que coûtent les
// gestes du dehors d'un monde de l'île, mesuré sur le vrai code : le Durable Object (worker/src/monde.mjs, sa base
// SQLite simulée par node:sqlite, ses WebSockets simulées), le moteur du jeu, le sol tiré de la graine.
//
//   1. Les octets diffusés par minute, à 2 et à 4 joueurs qui récoltent dehors (chacun --gestes gestes par minute, et
//      sa position 5 fois par seconde : il marche) : ensemble dans une région, ou dispersés sur l'île ; avec l'intérêt
//      par région (les positions de qui joue loin, une toutes les POS_LOIN_MS), et sans (toutes relayées).
//   2. Le contrôle d'un geste dehors par le serveur : (a) tirer le sol des régions où l'on joue (le contexte, puis
//      chaque région, gardées les REGIONS_SOL dernières) et y chercher la pièce ; (b) lire son identifiant sans le sol
//      (refusPieceMonde) et laisser le moteur refuser un doublon. Et le coût d'un chemin posé dehors (le moteur y lit le
//      sol de la case : dehors.js).
//   3. Une île très exploitée : --parjour pièces prises chaque jour pendant --jours jours (chacune revient en 3 à 20
//      jours) : le poids des écarts (monde.pris), la partie, le plafond ; l'entrée dans la région la plus chargée (le
//      sol de la région, ses pièces, celles qui manquent).
//
// Usage : node scripts/cout-ile.mjs [--minutes 10] [--gestes 6] [--parjour 150] [--jours 10] [--graine 1]
// Code de sortie : 0 si le plafond tient (VILLAGE.EN_LIGNE : la partie, l'île hors de la ferme), 1 sinon.

import { DatabaseSync } from 'node:sqlite';
import { gzipSync } from 'node:zlib';
import {
  addItem, avancerJusqua, BIOMES, caseDansLaFerme, contexteSol, createNewGame, DATA, executerCommande, farmTerrain, GAME_VERSION, mondePris, objetPris,
  objetsDeRegion, pasDe, refusPieceMonde, solDeRegion,
} from '../js/engine/index.js';
import { Monde, MONDE } from '../worker/src/monde.mjs';

const args = process.argv.slice(2);
const opt = (n, d) => { const i = args.indexOf(`--${n}`); return i >= 0 ? args[i + 1] : d; };
const MINUTES = Number(opt('minutes', 10));
const GESTES = Number(opt('gestes', 6));
const PARJOUR = Number(opt('parjour', 150));
const JOURS = Number(opt('jours', 10));
const GRAINE = opt('graine', '1');
DATA.VILLAGE.ACTIF = true;   // (le chantier allumé : la partie est une île, son monde a l'horloge vivante)

const cloner = (v) => JSON.parse(JSON.stringify(v));
const ko = (n) => +(n / 1024).toFixed(1);
const chrono = (f) => { const t0 = performance.now(); const r = f(); return [performance.now() - t0, r]; };

// L'île : une partie neuve du chantier, outillée.
const ile = createNewGame(GRAINE, { nom: 'Mesure' });
ile.outils = { ...(ile.outils || {}), hache: true, pioche: true, faux: true, canne: true };
const T = farmTerrain(ile), W = T.LARGEUR, N = T.MONDE.taille, S = T.MONDE.cadre.SORTIE;
const RX = Math.ceil(W / N), RY = Math.ceil(T.HAUTEUR / N);

// Le sol du monde, tiré de la graine (comme chez chaque joueur : le Worker du sol) : les pièces de chaque région.
const [ctxMs, ctx] = chrono(() => contexteSol(T.MONDE.graine, T.MONDE.cadre, T.MONDE.ferme, T.MONDE.taille));
const regions = new Map();
const regionMs = [];
function region(rx, ry) {
  const k = rx + ',' + ry;
  if (!regions.has(k)) { const [ms, reg] = chrono(() => solDeRegion(ctx, rx, ry)); regionMs.push(ms); regions.set(k, reg); }
  return regions.get(k);
}
const piecesDe = new Map();
function pieces(rx, ry) {
  const k = rx + ',' + ry;
  if (!piecesDe.has(k)) piecesDe.set(k, objetsDeRegion(region(rx, ry)).filter((o) => { const c = Math.floor((o.y - 1) / 16) * W + Math.floor(o.x / 16); return Math.floor(o.x / 16 / N) === rx && Math.floor((o.y - 1) / 16 / N) === ry && !caseDansLaFerme(ile, c); }));
  return piecesDe.get(k);
}
// Les régions de l'île où il y a de quoi récolter (plus de 60 pièces), de la sortie de la ferme vers le large.
const sx = Math.floor((S % W) / N), sy = Math.floor(Math.floor(S / W) / N);
const riches = [];
for (let ry = 0; ry < RY; ry++) for (let rx = 0; rx < RX; rx++) riches.push([rx, ry]);
riches.sort((a, b) => (Math.abs(a[0] - sx) + Math.abs(a[1] - sy)) - (Math.abs(b[0] - sx) + Math.abs(b[1] - sy)));
const zones = riches.filter(([rx, ry]) => pieces(rx, ry).length > 60);

/* ---------- 1. les octets par minute ---------- */

function nouveauMonde(comptes) {
  const db = new DatabaseSync(':memory:');
  const sql = { exec(q, ...v) { const rows = db.prepare(q).all(...v); return { toArray: () => rows }; } };
  const h = { t: 1_700_000_000_000 };
  const sockets = [], recu = new Map();
  const ctxDO = { storage: { sql }, id: { toString: () => 'mesure' }, getWebSockets: (tag) => sockets.filter((w) => !tag || w.c === tag), getTags: (w) => [w.c], waitUntil: () => {} };
  const d = new Monde(ctxDO, {});
  d.registre.maintenant = () => h.t;
  const s = cloner(ile);
  const c = d.registre.creer({ proprietaire: comptes[0], partie: { v: s.version, t: 0, s } });
  if (!c.ok) throw new Error(c.erreur);
  for (const j of comptes.slice(1)) d.registre.ajouterMembre(j, j, 'batisseur');
  const w = d.registre.charger();
  for (const j of comptes) w.energies[j] = 1e12;   // (pour la mesure : personne ne se fatigue)
  d.registre.instantane();
  const ws = (cpt) => { let att = null; return { c: cpt, send: (m) => { const t = JSON.parse(m).t, o = recu.get(t) || { n: 0, octets: 0 }; o.n += 1; o.octets += Buffer.byteLength(m); recu.set(t, o); }, close() {}, serializeAttachment: (a) => { att = a; }, deserializeAttachment: () => att }; };
  for (const j of comptes) { const x = ws(j); sockets.push(x); d.webSocketMessage(x, JSON.stringify({ t: 'hello', version: GAME_VERSION })); }
  recu.clear();   // (on ne compte pas l'arrivée : la partie entière, une fois)
  return { d, h, sockets, recu };
}

let nGeste = 0;
function octetsParMinute(nJoueurs, disposition, interet) {
  const comptes = ['c-1', 'c-2', 'c-3', 'c-4'].slice(0, nJoueurs);
  const { d, h, sockets, recu } = nouveauMonde(comptes);
  const avant = MONDE.POS_LOIN_MS;
  if (!interet) MONDE.POS_LOIN_MS = 0;
  // la zone de chacun : la même région (ensemble), ou des régions loin l'une de l'autre (dispersés)
  const loin = [];
  for (const z of zones) if (loin.every((y) => Math.max(Math.abs(y[0] - z[0]), Math.abs(y[1] - z[1])) >= 3)) loin.push(z);
  const zoneDe = comptes.map((c, j) => (disposition === 'ensemble' ? zones[0] : loin[j % loin.length]));
  // (ensemble, chacun ses pièces : pas deux fois la même, ce qui ferait des refus)
  const reste = comptes.map((c, j) => pieces(...zoneDe[j]).filter((o, i) => disposition !== 'ensemble' || i % nJoueurs === j));
  const debut = h.t, fin = debut + MINUTES * 60000;
  let calcul = 0, gestes = 0;
  const pasPos = 200, pasGeste = 60000 / GESTES;
  for (let t = debut; t < fin; t += pasPos) {
    h.t = t;
    for (const [j, cpt] of comptes.entries()) {
      const w = sockets[j], [rx, ry] = zoneDe[j], k = (t - debut) / pasPos;
      // il marche : un tour lent dans sa région
      const x = (rx * N + N / 2 + Math.round(12 * Math.cos(k / 40 + j))) * 16, y = (ry * N + N / 2 + Math.round(12 * Math.sin(k / 40 + j))) * 16;
      d.webSocketMessage(w, JSON.stringify({ t: 'pos', x, y, h: 0, img: 'marche_bas_1', flip: false }));
      if (Math.floor((t - debut + j * 1700) / pasGeste) !== Math.floor((t - debut + j * 1700 - pasPos) / pasGeste)) {
        const o = reste[j].shift();
        if (!o) continue;
        const cmd = { t: 'cmd', id: `g-${++nGeste}-mesure`, type: 'monde.recolter', args: { piece: o.id, ...(o.regle.geste === 'cueillir' ? { variante: o.variante } : {}) } };
        const t0 = performance.now();
        d.webSocketMessage(w, JSON.stringify(cmd));
        calcul += performance.now() - t0;
        gestes += 1;
      }
    }
  }
  MONDE.POS_LOIN_MS = avant;
  const tout = [...recu.values()].reduce((a, o) => a + o.octets, 0);
  const par = (t) => (recu.get(t) || { octets: 0 }).octets;
  return {
    joueurs: nJoueurs, disposition, interet: interet ? 'oui' : 'non', gestes,
    'Ko/min (tous)': ko(tout / MINUTES), 'Ko/min par joueur': ko(tout / MINUTES / nJoueurs),
    'evt Ko/min': ko(par('evt') / MINUTES), 'pos Ko/min': ko(par('pos') / MINUTES), 'ack Ko/min': ko(par('ack') / MINUTES), 'lot Ko/min': ko(par('lot') / MINUTES),
    'octets par evt': recu.get('evt') ? Math.round(par('evt') / recu.get('evt').n) : 0,
    'ms par geste': +(calcul / Math.max(1, gestes)).toFixed(2), jour: d.registre.charger().day, pas: pasDe(d.registre.charger()),
  };
}

console.log(`L'île : graine ${GRAINE}, ${W} × ${T.HAUTEUR} cases, ${RX * RY} régions de ${N} cases ; ${zones.length} régions de plus de 60 pièces à prendre.`);
console.log(`\n1. Les octets diffusés (${MINUTES} min, ${GESTES} gestes par minute et par joueur, sa position 5 fois par seconde) :`);
const L1 = [];
for (const n of [2, 4]) for (const [disp, interet] of [['ensemble', true], ['dispersés', true], ['dispersés', false]]) L1.push(octetsParMinute(n, disp, interet));
console.table(L1);

/* ---------- 2. le contrôle d'un geste dehors ---------- */

console.log('\n2. Le contrôle d\'un geste dehors par le serveur :');
const [premiere, ...autres] = regionMs;
console.log(`  (a) le sol : le contexte de l'île ${(ctxMs + premiere).toFixed(0)} ms (au réveil du monde : ses champs, puis ses éléments avec la première région), puis une région ${(autres.reduce((a, b) => a + b, 0) / autres.length).toFixed(1)} ms en moyenne (${autres.length} régions, max ${Math.max(...autres).toFixed(1)} ms)`);
// (a) : 4 joueurs qui récoltent pendant une heure, chacun dans sa région, changeant de région toutes les 5 minutes ; le
// serveur garde les REGIONS_SOL dernières ; chaque geste : la pièce cherchée dans sa région
{
  const garde = new Map();
  let tirees = 0, ms = 0, cherche = 0;
  const regionGardee = (rx, ry) => {
    const k = rx + ',' + ry;
    if (garde.has(k)) { const r = garde.get(k); garde.delete(k); garde.set(k, r); return r; }
    tirees += 1;
    const [x, r] = chrono(() => solDeRegion(ctx, rx, ry));
    ms += x;
    garde.set(k, r);
    while (garde.size > MONDE.REGIONS_SOL) garde.delete(garde.keys().next().value);
    return r;
  };
  let g = 0;
  for (let minute = 0; minute < 60; minute++) for (let j = 0; j < 4; j++) {
    const z = zones[(j * 7 + Math.floor(minute / 5) * 3) % zones.length];
    for (let k = 0; k < GESTES; k++) {
      const o = pieces(...z)[(minute * GESTES + k) % pieces(...z).length];
      const [x] = chrono(() => objetsDeRegion(regionGardee(...z)).some((p) => p.id === o.id));
      cherche += x;
      g += 1;
    }
  }
  console.log(`  (a) une heure à 4 joueurs (${g} gestes, chacun change de région toutes les 5 min) : ${tirees} régions tirées (${ms.toFixed(0)} ms), la pièce cherchée ${(cherche / g).toFixed(2)} ms par geste en moyenne (${cherche.toFixed(0)} ms en tout, la région comprise) ; + ${(ctxMs + premiere).toFixed(0)} ms au réveil du monde ; mémoire ≈ ${ko(JSON.stringify([...garde.values()].map((r) => ({ v: Array.from(r.vegetation.images || []), b: Array.from(r.vegetation.basses || []) }))).length)} Ko de pièces pour ${garde.size} régions (le sol entier d'une région pèse plus)`);
  // (b) : l'identifiant lu, sans le sol
  const ids = zones.slice(0, 20).flatMap((z) => pieces(...z).slice(0, 50).map((o) => o.id));
  const [mb] = chrono(() => { for (let k = 0; k < 10; k++) for (const id of ids) refusPieceMonde(ile, id); });
  console.log(`  (b) l'identifiant sans le sol (refusPieceMonde) : ${((mb * 1000) / (ids.length * 10)).toFixed(1)} µs par geste, rien au réveil, rien en mémoire ; le doublon : refusé par le geste (la pièce déjà prise)`);
}
// Un chemin posé dehors : le moteur lit le sol de sa case (dehors.js : sa région), au serveur aussi
{
  const { d, h } = nouveauMonde(['c-1']);
  addItem(d.registre.charger(), DATA.ATELIER.BLOCS.chemin.objet, 50);
  d.registre.instantane();
  // (une case libre de chaque région, d'après son sol : on y marche, ni eau, ni falaise)
  const libre = (rx, ry) => {
    const reg = region(rx, ry);
    for (let y = 20; y < N - 20; y++) for (let x = 20; x < N - 20; x++) {
      const c = (ry * N + y) * W + rx * N + x, kk = (ry * N + y - reg.cy0) * reg.cl + rx * N + x - reg.cx0;
      if (reg.marche[kk] === 1 && !['mer', 'lac', 'riviere', 'falaise', 'sommet'].includes(BIOMES[reg.biome[kk]])) return c;
    }
    return null;
  };
  const essais = [];
  for (const [k, [rx, ry]] of zones.slice(0, 6).entries()) {
    h.t += 1000;
    const c = libre(rx, ry);
    if (c === null) continue;
    const [ms, r] = chrono(() => d.registre.commande('c-1', { id: `chemin-${k}-mesure`, type: 'bloc.poser', args: { sorte: 'chemin', case: c } }));
    essais.push(`${ms.toFixed(0)} ms${r.ok ? '' : ` (refusé : ${r.erreur.slice(0, 40)}…)`}`);
  }
  console.log(`  un chemin posé dehors, au serveur : ${essais.join(', ')} (la première : le contexte du sol ; puis une région nouvelle, ou gardée)`);
}

/* ---------- 3. une île très exploitée ---------- */

console.log(`\n3. Une île très exploitée : ${PARJOUR} pièces prises par jour pendant ${JOURS} jours (par des commandes, au pas de chaque jour) :`);
{
  const s = cloner(ile);
  s.mondePartage = true;
  s.horloge = { pas: 0, sommeil: false, reveils: 0 };
  s.energies = {};
  s.sacs = {};
  const toutes = zones.flatMap((z) => pieces(...z));
  let k = 0, prises = 0, max = 0;
  for (let j = 0; j < JOURS; j++) {
    for (let i = 0; i < PARJOUR && k < toutes.length; k++) {
      const o = toutes[k];
      s.energies['c-1'] = 1e12;
      const r = executerCommande(s, { id: `t-${k}`, type: 'monde.recolter', args: { piece: o.id, ...(o.regle.geste === 'cueillir' ? { variante: o.variante } : {}) } }, { acteur: 'c-1' });
      if (r.ok && objetPris(s, o.id)) { i += 1; prises += 1; }
    }
    max = Math.max(max, mondePris(s).length);
    avancerJusqua(s, pasDe(s) + 144);
  }
  const pris = s.monde.pris, txt = JSON.stringify(pris), partie = JSON.stringify(s);
  const dehors = txt.length + JSON.stringify(s.dehors || {}).length;
  // la région la plus chargée : ses écarts, et son entrée (le sol de la région tiré, ses pièces, celles qui manquent)
  const parRegion = new Map();
  for (const id of Object.keys(pris)) { const m = /:(\d+),(\d+)$/.exec(id); const kk = `${Math.floor(Number(m[1]) / 16 / N)},${Math.floor((Number(m[2]) - 1) / 16 / N)}`; parRegion.set(kk, (parRegion.get(kk) || 0) + 1); }
  const [chargee, nb] = [...parRegion.entries()].sort((a, b) => b[1] - a[1])[0];
  const [rx, ry] = chargee.split(',').map(Number);
  const [msSol] = chrono(() => solDeRegion(ctx, rx, ry));
  const reg = region(rx, ry);
  const [msEcarts, manque] = chrono(() => objetsDeRegion(reg).filter((o) => objetPris(s, o.id)).length);
  const [msTous] = chrono(() => mondePris(s).length);
  const plafondKo = DATA.VILLAGE.EN_LIGNE.PARTIE_KO, dehorsKo = DATA.VILLAGE.EN_LIGNE.DEHORS_KO;
  console.log(`  ${prises} pièces prises ; au plus ${max} manquent en même temps ; au bout de ${JOURS} jours, ${Object.keys(pris).length} écarts (jour ${s.day})`);
  console.log(`  les écarts : ${ko(txt.length)} Ko (gzip ${ko(gzipSync(txt).length)} Ko) ; l'île hors de la ferme ${ko(dehors)} Ko (plafond ${dehorsKo} Ko) ; la partie ${ko(partie.length)} Ko (gzip ${ko(gzipSync(partie).length)} Ko ; plafond ${plafondKo} Ko)`);
  console.log(`  la région la plus chargée (${chargee}) : ${nb} écarts, ${ko(JSON.stringify(Object.fromEntries(Object.entries(pris).filter(([id]) => { const m = /:(\d+),(\d+)$/.exec(id); return `${Math.floor(Number(m[1]) / 16 / N)},${Math.floor((Number(m[2]) - 1) / 16 / N)}` === chargee; }))).length)} Ko ; y entrer : son sol ${msSol.toFixed(1)} ms (dans le Worker du sol), ses ${manque} pièces qui manquent ${msEcarts.toFixed(2)} ms, toutes les pièces prises de l'île ${msTous.toFixed(2)} ms ; rien à recevoir (les écarts sont dans la partie de chacun)`);
  const ok = partie.length <= plafondKo * 1024 && dehors <= dehorsKo * 1024;
  console.log(ok ? '\nLe plafond tient.' : '\nLE PLAFOND NE TIENT PAS.');
  process.exit(ok ? 0 : 1);
}
