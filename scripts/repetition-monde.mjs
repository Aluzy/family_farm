// La répétition de la bascule, en ligne : un monde fait par le serveur de main (01f8e5c, la version 1.22.0, une ferme
// seule, sa partie au format 86 : une partie de main avec un niveau 2 meublé), deux joueurs y jouent ; puis le serveur de
// la bascule (2.0.0, le réglage allumé, sans ILE_ESSAI) l'ouvre sur la même base : la mise à jour et le passage sur l'île
// (I9f), puis deux joueurs y jouent (le temps passe) ; réveillé à froid, la même partie. La fiche I9h, la répétition.
//   git worktree add ../jeu-avant origin/archive/jeu-avant-ile   (une copie du jeu d'avant, le serveur d'avant)
//   node scripts/repetition-monde.mjs ../jeu-avant [partie.json]
// La partie : une sauvegarde exportée (⚙️ Options) ; sans elle, main_niveau2 de tests/engine/parties-main.json.
// Code de sortie : 0 si tout passe.
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

import { ROOT } from './lib/engine-source.mjs';

const [rMain, fichier] = process.argv.slice(2);
if (!rMain) { console.error('Usage : node scripts/repetition-monde.mjs <copie du jeu d\'avant> [partie.json]'); process.exit(2); }
const rBr = ROOT;
const imp = (r, f) => import(pathToFileURL(join(r, f)).href);
const EM = await imp(rMain, 'js/engine/index.js');
const WM = await imp(rMain, 'worker/src/monde.mjs');
const EB = await imp(rBr, 'js/engine/index.js');
const WB = await imp(rBr, 'worker/src/monde.mjs');
function assert(c, m) { if (!c) throw new Error(m); console.log(`  ✓ ${m}`); }
const db = new DatabaseSync(':memory:');
const sql = { db, exec(q, ...v) { const rows = db.prepare(q).all(...v); return { toArray: () => rows } } };
const A = 'c-proprio', B = 'c-ami';
let n = 0; const id = () => `cmd-${++n}-main`;
const poser = (sorte, t) => ({ id: id(), type: 'bloc.poser', args: { sorte, case: t } });

console.log(`Serveur de main : ${EM.GAME_VERSION} (format ${EM.STATE_VERSION}) ; serveur de la bascule : ${EB.GAME_VERSION} (format ${EB.STATE_VERSION}), VILLAGE.ACTIF = ${EB.DATA.VILLAGE.ACTIF}`);
const sauve = fichier ? JSON.parse(readFileSync(fichier, 'utf8')) : JSON.parse(readFileSync(join(ROOT, 'tests', 'engine', 'parties-main.json'), 'utf8')).main_niveau2;
const s0 = sauve.s;
EM.addItem(s0, EM.DATA.ATELIER.BLOCS.mur_pierre.objet, 40);
// 1. le monde de main
const h = { t: 1_763_000_000_000 };
const rm = new WM.MondeRegistre(sql, () => h.t);
const c = rm.creer({ proprietaire: A, nom: 'Alex', partie: { v: s0.version, t: 0, s: s0 }, titre: 'La ferme d\'Alex' });
assert(c.ok, `main : le monde créé (${c.erreur || 'ok'})`);
rm.ajouterMembre(B, 'Sam', 'batisseur');
assert(rm.accueil(A, { version: EM.GAME_VERSION }).ok && rm.accueil(B, { version: EM.GAME_VERSION }).ok, 'main : A et B entrent (1.22.0)');
const libres = (s, k) => { const out = []; for (let t = 0; t < 644 * 510 && out.length < k; t += 13) if (EM.poseStatus(s, 'mur_pierre', t).ok) out.push(t); return out; };
const L = libres(rm.charger(), 30);
let ok = 0;
for (let i = 0; i < 25; i++) { const r = rm.commande(i % 2 ? B : A, poser('mur_pierre', L[i])); if (r.ok) ok += 1; }
assert(ok === 25, `main : 25 murs posés à deux (${ok})`);
const avant = JSON.parse(JSON.stringify(rm.charger()));
const nAvant = Object.keys(avant.blocs).length;
console.log(`  (main : rév. ${rm.rev}, ${nAvant} blocs, niveau 2 : ${JSON.stringify(avant.niveauxHauts || null).slice(0, 120)})`);

// 2. le serveur de la bascule, sur la même base
h.t += 3600_000;
const rb = new WB.MondeRegistre(sql, () => h.t);
const t0 = performance.now();
const w = rb.charger();
const ms = Math.round(performance.now() - t0);
assert(EB.ilePartagee(w) && EB.horlogeVivante(w), `bascule : le monde est une île, son horloge vivante (mis à jour en ${ms} ms)`);
assert(!(w.essais && w.essais.village), 'bascule : par le réglage, pas un essai');
assert(w.day === avant.day, `bascule : le même jour (${w.day})`);
const ferme = (s) => JSON.stringify(['blocs', 'hauteurs', 'rehausses', 'etage', 'niveauxHauts', 'papiersNiveau2', 'sols'].map((k) => s[k] || null));
assert(ferme(w) === ferme(avant), 'bascule : la ferme intacte (les 25 murs, l\'étage, le niveau 2, son papier peint)');
assert(w.port && w.port.lieu && EB.etatTroncon(w) !== 'a_poser', 'bascule : le port, son lieu, le tronçon posé');
assert(EB.villageoisDe(w).length === 0 && w.retourIle && w.retourIle.monde && w.retourIle.donne, 'bascule : aucun villageois ; la fenêtre du retour, son cadeau donné au coffre');
const ev = rb.journal(A).evts[0];
assert(ev.type === 'monde.migrer' && ev.bilan.ile === true && !ev.bilan.perdus, `bascule : la marque au journal (${JSON.stringify(ev.bilan)})`);
assert(rb.meta('version') === EB.GAME_VERSION && rb.meta('format') === String(EB.STATE_VERSION), 'bascule : le monde prend la version 2.0.0 et le format 109');
assert(rb.avantMigration().partie.blocs && !('port' in rb.avantMigration().partie), 'bascule : la ferme d\'avant gardée (avant_migration)');
// un jeu d'avant (1.22.0, sans format) : refusé
const vieux = rb.accueil(B, { version: '1.22.0' });
assert(!vieux.ok && /recharge la page/.test(vieux.erreur), `bascule : le jeu 1.22.0 refusé (« ${vieux.erreur} »)`);
// 3. à deux
assert(rb.accueil(A, { version: EB.GAME_VERSION, format: EB.STATE_VERSION }).ok && rb.accueil(B, { version: EB.GAME_VERSION, format: EB.STATE_VERSION }).ok, 'bascule : A et B entrent (2.0.0)');
const L2 = []; for (let t = 0; t < 644 * 510 && L2.length < 4; t += 17) if (EB.poseStatus(w, 'mur_pierre', t).ok) L2.push(t);
h.t += 3 * 5000;
let x = rb.commande(B, poser('mur_pierre', L2[0]));
assert(x.ok && Number.isInteger(x.evt.cmd.pas), `bascule : B pose un mur au pas ${x.evt && x.evt.cmd.pas} (${x.erreur || 'ok'})`);
h.t += 2 * 5000;
x = rb.commande(A, poser('mur_pierre', L2[1]));
assert(x.ok, `bascule : A pose un mur (${x.erreur || 'ok'})`);
x = rb.commande(B, { id: id(), type: 'villageois.attribuer', args: {} });
assert(!x.ok, `bascule : la grille d'une île (B ne gère pas le village : « ${x.erreur} »)`);
h.t += 720 * 5000;
rb.avancer();
const apres = rb.charger();
assert(apres.horloge.pas > 200, `bascule : le temps passe (rattrapage plafonné) (pas ${apres.horloge.pas}, jour ${apres.day})`);
const froid = new WB.MondeRegistre(sql, () => h.t);
froid.avancer();
assert(EB.empreintePartie(froid.charger()) === EB.empreintePartie(rb.charger()), 'bascule : réveillé à froid, la même partie');
assert(froid.journal(A).evts.filter((e) => e.type === 'monde.migrer').length === 1, 'bascule : une seule migration');
console.log('Le monde de main passe sur l\'île et se joue à deux.');
