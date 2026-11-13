/* ==========================================================================
   Tests du chantier « l'île à bâtir » : le chemin du port, modifiable, et le portage (docs/ile.md, fiche I2).
   Comme tous les fichiers tests/engine/village-*.test.mjs, ils tournent avec VILLAGE.ACTIF forcé à true
   (tests/engine/aide.mjs).
   - le tronçon devient des blocs : une partie neuve le convertit (dans Node : assurerTroncon ; dans le Web
     Worker du sol : le même calcul, tronconDuPort), le sol ne peint plus que les chemins possédés ;
   - poser et retirer hors de la ferme (le chemin, une lanterne, un pont), les refus (un mur, l'eau, une falaise,
     la rivière sans pont, l'emprise du port) ;
   - la vitesse sur chemin ; les capacités de portage (à la main, la brouette, la charrette) ;
   - la forme compacte de la sauvegarde, la migration v87 → v88 ; éteint, rien ne change.
   Lancer seul : node tests/run-tests.mjs village-chemin
   ========================================================================== */

import {
  addItem, awakeMsAtHour, BIOME, bonusChemin, capacitePortage, chargeDe, chargerPortage, cheminDehorsSur, cheminsDehors,
  cheminsPourLeSol, choisirVehicule, comptoirDuPort, contexteSol, countItem, createNewGame, DATA, dechargerAuPort,
  dechargerPortage, decoderSegments, elementsSol, empriseDe, encoderSegments, etatTroncon, farmSeed, farmTerrain, horsFerme,
  majCheminsSol, migrate, poseStatus, poserBloc, poserCheminsSol, portDuMonde, reprendreBloc, solDirect, STATE_VERSION,
  surChemin, tronconDuPort, vendreAuPort, vitesseSurCase, volumeCharge, volumeDe, assurerTroncon, casesPonts,
} from '../../js/engine/index.js';
import { assert, assertEqual, avecVillage, reach, setInv, test } from './aide.mjs';

const copie = (o) => JSON.parse(JSON.stringify(o));

// Une partie neuve du chantier, son tronçon converti (comme le ferait le Web Worker), son sol direct.
const parties = new Map();
function ile(graine = 'chemin') {
  const s = createNewGame(graine);
  assertEqual(etatTroncon(s), 'a_poser', 'une partie neuve : le tronçon à convertir');
  assert(assurerTroncon(s), 'converti');
  const T = farmTerrain(s), sol = solDirect(T);
  elementsSol(sol.ctx);
  return { s, T, ctx: sol.ctx, W: T.LARGEUR };
}
function ileGardee(graine = 'chemin') {
  if (!parties.has(graine)) parties.set(graine, copie(ile(graine).s));
  const s = copie(parties.get(graine)), T = farmTerrain(s), sol = solDirect(T);
  elementsSol(sol.ctx);
  return { s, T, ctx: sol.ctx, W: T.LARGEUR };
}

// Une case hors de la ferme, près de la sortie, qui accepte un chemin (l'herbe libre, loin du tronçon).
function caseLibre(s, T) {
  const W = T.LARGEUR, S = T.MONDE.cadre.SORTIE;
  for (let r = -12; r <= 12; r++) {
    for (let c = 2; c <= 14; c++) {
      const t = S + r * W + c;
      if (!cheminDehorsSur(s, t) && ![t - 1, t + 1, t - W, t + W].some((j) => cheminDehorsSur(s, j)) && poseStatus(s, 'chemin', t).ok) return t;
    }
  }
  return null;
}

// La première case du monde (de la plus proche de la ferme aux plus loin) dont le biome vaut `b`.
function caseDeBiome(ctx, T, b, loin = 200) {
  const W = T.LARGEUR, F = T.FERME, cx = F.X + F.LARGEUR / 2, cy = F.Y + F.HAUTEUR / 2;
  let best = null, bd = Infinity;
  for (let y = Math.max(0, Math.floor(cy - loin)); y < Math.min(T.HAUTEUR, cy + loin); y++) {
    for (let x = Math.max(0, Math.floor(cx - loin)); x < Math.min(W, cx + loin); x++) {
      const i = y * W + x, e = ctx.elements.eaux[i], bb = e !== 255 ? e : ctx.lire.biome(i);
      if (bb !== b || !horsFerme(T, i)) continue;
      const d = Math.hypot(x - cx, y - cy);
      if (d < bd) { bd = d; best = i; }
    }
  }
  return best;
}

test('le tronçon devient des blocs de chemin du joueur : hors de la ferme, ses cases et un pinceau autour', () => {
  const { s, T, ctx, W } = ile();
  const set = cheminsDehors(s), trace = ctx.elements.lieux.port.chemin;
  assertEqual(etatTroncon(s), 'pose', 'converti');
  assert(set.size >= trace.length, `au moins une case par case du tracé (${set.size} pour ${trace.length})`);
  assert([...set].every((t) => horsFerme(T, t)), 'rien sur la ferme');
  const surTerre = trace.filter((i) => horsFerme(T, i) && ctx.lire.biome(i) !== BIOME.mer);
  assert(surTerre.every((i) => set.has(i)), 'chaque case du tracé, hors de la ferme, est possédée');
  // (le même calcul que le Web Worker : un contexte qui reçoit le tronçon à convertir le convertit pareil)
  const c2 = contexteSol(T.MONDE.graine, T.MONDE.cadre, T.MONDE.ferme, T.MONDE.taille);
  poserCheminsSol(c2, { troncon: 'a_poser', cases: [] });
  elementsSol(c2);
  assertEqual(c2.tronconPose, tronconDuPort(ctx), 'le Worker convertit le même tronçon');
  assertEqual(copie(c2.tronconPose), [...set].sort((a, b) => a - b), 'celui de la partie');
  // (le sol peint les chemins possédés : une case retirée n'est plus un chemin, une case posée en devient un)
  // (une case du tracé que seuls les chemins possédés peignent : pas sous un autre chemin du plan)
  const loin = trace.find((i, k) => k > trace.length / 2 && set.has(i) && !c2.cheminsBase[i]);
  assertEqual(c2.chemins[loin] > 0, true, 'une case du tracé : un chemin');
  const sans = [...set].filter((t) => t !== loin);
  const cles = majCheminsSol(c2, sans);
  assert(cles.length >= 1, 'des régions à refaire');
  assertEqual(c2.chemins[loin], 0, 'retirée : plus de chemin là');
  assert(c2.cheminsNature[loin] > 0, 'la nature garde le chemin du plan : rien n\'y pousse');
  majCheminsSol(c2, [...set]);
  assert(c2.chemins[loin] > 0, 'reposée : de nouveau un chemin');
  const e = cheminsPourLeSol(s);
  assertEqual([e.troncon, e.cases.length], ['pose', set.size], 'ce que le sol reçoit de la partie');
});

test('poser et retirer hors de la ferme : le chemin (dans ses segments), une lanterne, un banc ; pas de mur', () => {
  const { s, T, W } = ileGardee();
  setInv(s, { chemin: 3, lanterne: 1, banc_jardin: 1, mur_pierre: 2 });
  const t = caseLibre(s, T);
  assert(t !== null, 'une case libre près de la sortie');
  const avant = cheminsDehors(s).size;
  const r = poserBloc(s, 'chemin', t);
  assert(r.ok, r.error);
  assert(cheminDehorsSur(s, t), 'posée : dans les chemins possédés');
  assert(!s.sols || !s.sols[t], 'pas dans state.sols');
  assertEqual(cheminsDehors(s).size, avant + 1);
  assertEqual(countItem(s, 'chemin'), 2, 'le bloc a quitté l\'inventaire');
  assertEqual(poseStatus(s, 'chemin', t).ok, false, 'déjà un chemin');
  const q = reprendreBloc(s, t);
  assert(q.ok && q.sorte === 'chemin', q.error);
  assert(!cheminDehorsSur(s, t), 'retirée');
  assertEqual(countItem(s, 'chemin'), 3, 'revenu dans l\'inventaire');
  // (retirer dix cases du tronçon et les reposer ailleurs)
  const dix = [...cheminsDehors(s)].filter((c) => empriseDe(T, c) === null).slice(40, 50);
  for (const c of dix) assert(reprendreBloc(s, c).ok, `reprise ${c}`);
  assertEqual(countItem(s, 'chemin'), 13, 'dix de plus en main');
  let poses = 0;
  for (let k = 0; k < 40 && poses < 10; k++) { const c = t + (k % 8) + Math.floor(k / 8) * W; if (poseStatus(s, 'chemin', c).ok && poserBloc(s, 'chemin', c).ok) poses++; }
  assertEqual(poses, 10, 'reposées ailleurs');
  // (une lanterne, un banc : dans state.blocs, comme sur la ferme)
  const l = t + 3 * W;
  if (poseStatus(s, 'lanterne', l).ok) { assert(poserBloc(s, 'lanterne', l).ok); assertEqual(s.blocs[l], 'lanterne'); assert(reprendreBloc(s, l).ok); }
  const m = poseStatus(s, 'mur_pierre', t + W);
  assertEqual(m.ok, false, 'un mur : pas hors de la ferme');
  assert(/pas hors de la ferme/.test(m.raison), m.raison);
});

test('les refus hors de la ferme : l\'eau profonde, la falaise, la rivière sans pont, les abords du port ; le pont passe la rivière', () => {
  const { s, T, ctx } = ileGardee();
  setInv(s, { chemin: 5, pont_planches: 2 });
  const mer = caseDeBiome(ctx, T, BIOME.mer, 400);
  assert(mer !== null, 'une case de mer');
  assert(/eau profonde/.test(poseStatus(s, 'chemin', mer).raison), 'la mer : refusée');
  const falaise = caseDeBiome(ctx, T, BIOME.falaise, 400);
  if (falaise !== null) assert(/falaise/.test(poseStatus(s, 'chemin', falaise).raison), 'la falaise : refusée');
  const riv = caseDeBiome(ctx, T, BIOME.riviere, 400);
  assert(riv !== null, 'une case de rivière');
  if (empriseDe(T, riv) === null && !cheminDehorsSur(s, riv)) {
    assert(/rivière/.test(poseStatus(s, 'chemin', riv).raison), 'un chemin sur la rivière : refusé');
    const p = poserBloc(s, 'pont_planches', riv);
    assert(p.ok, p.error);
    assertEqual(casesPonts(s), [riv], 'le pont : une case ouverte à la marche');
    assert(/rivière/.test(poseStatus(s, 'pont_planches', mer).raison) || /eau profonde/.test(poseStatus(s, 'pont_planches', mer).raison), 'pas de pont sur la mer');
  }
  const t = caseLibre(s, T);
  assert(/rivière/.test(poseStatus(s, 'pont_planches', t).raison), 'un pont : sur une rivière seulement');
  // (le port : sa case, sa halle, ses abords)
  const lieu = portDuMonde(farmSeed(s));
  const r = poseStatus(s, 'chemin', lieu.case);
  assertEqual(r.ok, false, 'sur le port : refusé');
  assert(/port/.test(r.raison), r.raison);
  assertEqual(poseStatus(s, 'chemin', comptoirDuPort(s).devant).ok, false, 'sous la halle : refusé');
});

test('la vitesse sur chemin : le bonus sur un chemin possédé, un chemin posé, celui de la ferme ; rien ailleurs ni éteint', () => {
  const { s, T } = ileGardee();
  const B = 1 + DATA.VILLAGE.CHEMIN.VITESSE / 100;
  assertEqual(bonusChemin(s), B);
  const c = [...cheminsDehors(s)][20];
  assert(surChemin(s, c), 'un chemin possédé');
  assertEqual(vitesseSurCase(s, c), B);
  const t = caseLibre(s, T);
  assertEqual(vitesseSurCase(s, t), 1, 'l\'herbe : rien');
  const S = T.SOMMETS, W = T.LARGEUR, V = W + 1, F = T.FERME;
  let ferme = null;
  for (let r = F.Y; r < F.Y + F.HAUTEUR && ferme === null; r++) for (let x = F.X; x < F.X + F.LARGEUR; x++) { const k = r * V + x; if (S[k] === 1 && S[k + 1] === 1 && S[k + V] === 1 && S[k + V + 1] === 1) { ferme = r * W + x; break; } }
  assert(ferme !== null && surChemin(s, ferme), 'le chemin de la ferme');
  avecVillage(() => { assertEqual(bonusChemin(s), 1); assertEqual(surChemin(s, c), false); }, false);
});

test('le portage : MAINS à la main, la brouette, la charrette attelée ; ce qui ne tient pas reste à la ferme ; sous la halle tout se vend', () => {
  const P = DATA.VILLAGE.PORTAGE;
  const { s } = ileGardee();
  reach(s, 'marche');
  portDuMonde(farmSeed(s));
  s.awakeMs = awakeMsAtHour(9);
  assertEqual(volumeDe('carotte'), 1, 'un par défaut');
  assertEqual(volumeDe('pierre'), P.VOLUMES.pierre, 'les lourds');
  setInv(s, { carotte: 100, pierre: 10 });
  assertEqual(capacitePortage(s), P.MAINS, 'à la main');
  const a = chargerPortage(s, 'carotte', 100, null, { sansPresence: true });
  assert(a.ok, a.error);
  assertEqual([a.n, a.reste], [P.MAINS, 100 - P.MAINS], 'ce qui tient, le reste à la ferme');
  assertEqual(countItem(s, 'carotte'), 100 - P.MAINS, 'rien de perdu : à la ferme');
  assertEqual(chargerPortage(s, 'pierre', 1, null, { sansPresence: true }).ok, false, 'plus de place');
  // (la brouette : il faut l'avoir)
  assertEqual(choisirVehicule(s, 'brouette', null, { sansPresence: true }).ok, false, 'sans brouette');
  addItem(s, 'brouette', 1);
  assert(choisirVehicule(s, 'brouette', null, { sansPresence: true }).ok);
  assertEqual(capacitePortage(s), P.BROUETTE);
  chargerPortage(s, 'pierre', 10, null, { sansPresence: true });
  const pierres = Math.min(10, Math.floor((P.BROUETTE - P.MAINS) / P.VOLUMES.pierre));
  assertEqual(volumeCharge(s), P.MAINS + pierres * P.VOLUMES.pierre, 'la pierre compte son volume');
  assertEqual(countItem(s, 'pierre'), 10 - pierres, 'les pierres qui ne tiennent pas restent à la ferme');
  // (la charrette : une charrette et un cheval)
  addItem(s, 'charrette', 1);
  assert(/cheval/.test(choisirVehicule(s, 'charrette', null, { sansPresence: true }).error), 'sans cheval : refusée');
  s.cheval = { monte: true, nourri: true, attache: null };
  assert(choisirVehicule(s, 'charrette', null, { sansPresence: true }).ok);
  assertEqual(capacitePortage(s), P.CHARRETTE);
  const g = chargerPortage(s, 'carotte', 200, null, { sansPresence: true });
  assert(g.ok, g.error);
  assertEqual(countItem(s, 'carotte'), 0, 'une grosse récolte : toute chargée en un voyage');
  // (loin du port, on ne vend pas ; sous la halle, tout se vend d'un coup)
  const ou = comptoirDuPort(s).devant;
  assertEqual(dechargerAuPort(s, ou + 30).ok, false, 'loin du comptoir');
  assertEqual(chargerPortage(s, 'carotte', 1, ou).ok, false, 'au port, on ne charge pas');
  const avant = s.pieces, c = chargeDe(s);
  const v = dechargerAuPort(s, ou);
  assert(v.ok, v.error);
  assertEqual(v.vendus, c, 'tout ce qui était chargé');
  assertEqual(s.pieces, avant + v.gain);
  assertEqual(volumeCharge(s), 0, 'vide');
  assertEqual(vendreAuPort(s, 'pierre', 1, ou).ok, false, 'ce qui n\'est pas chargé ne se vend pas');
  // (on reprend sur la ferme)
  setInv(s, { laine: 3 });
  chargerPortage(s, 'laine', 3, null, { sansPresence: true });
  assert(dechargerPortage(s, null, Infinity, null, { sansPresence: true }).ok);
  assertEqual([countItem(s, 'laine'), volumeCharge(s)], [3, 0], 'reprise à la ferme');
});

test('la sauvegarde : la forme compacte (des segments), 600 cases mesurées ; v87 → v88 ; une partie d\'avant garde son tronçon généré', () => {
  assert(STATE_VERSION >= 88, 'le format 88 au moins');
  // (la forme compacte : un segment par suite de cases)
  const cases = [5, 6, 7, 20, 21, 1000, 1001, 1002, 1003];
  const seg = encoderSegments(cases);
  assertEqual(seg, [5, 3, 12, 2, 978, 4]);
  assertEqual([...decoderSegments(seg)], cases, 'aller et retour');
  assertEqual([...decoderSegments([3, 2, -1, 4, 9])], [3, 4], 'abîmée : ce qui se lit');
  const { s } = ileGardee();
  const n = cheminsDehors(s).size, segs = s.dehors.chemins.length / 2;
  assert(segs < n / 2, `bien moins de segments (${segs}) que de cases (${n})`);
  // (600 cases posées : la taille de la sauvegarde mesurée)
  const plein = new Set(cheminsDehors(s));
  for (let k = 0; plein.size < n + 600; k++) plein.add(1000 + k * 3);
  const avec = copie(s);
  avec.dehors.chemins = encoderSegments(plein);
  const octets = JSON.stringify(avec.dehors).length;
  assert(octets < 8000, `${plein.size} cases : ${octets} octets`);
  // (relue telle quelle)
  const relue = migrate(copie(s));
  assertEqual(relue.dehors, s.dehors, 'relue telle quelle');
  // (v87 → v88 : une partie d'avant n'a ni dehors ni portage ; un dehors abîmé est réparé)
  const ancienne = { ...copie(createNewGame(3)), version: 87 };
  delete ancienne.dehors;
  const m = migrate(ancienne);
  assertEqual(m.version, STATE_VERSION);
  assert(!('dehors' in m) && !('portage' in m), 'rien ne s\'ajoute');
  assertEqual(etatTroncon(m), 'genere', 'son tronçon reste généré');
  assertEqual(cheminsPourLeSol(m), null, 'le sol d\'avant');
  const abimee = migrate({ ...copie(s), version: 87, dehors: { troncon: 'n\'importe', chemins: [4, 2, 'x'] }, portage: { vehicule: 'avion', charge: { carotte: [{ qty: 2, nightsLeft: 3, origin: 'produit' }], rien: 5 } } });
  assertEqual(abimee.dehors, { troncon: 'genere', chemins: [4, 2] }, 'le dehors réparé');
  assertEqual(abimee.portage, { vehicule: 'mains', charge: { carotte: [{ qty: 2, nightsLeft: 3, origin: 'produit' }] } }, 'le portage réparé');
  // (une partie d'avant pose un chemin dehors : il s'ajoute, le tronçon généré reste peint)
  const v = ileGardee().s;
  delete v.dehors;
  setInv(v, { chemin: 1 });
  const T = farmTerrain(v), t = caseLibre(v, T);
  const pv = poserBloc(v, 'chemin', t);
  assert(pv.ok, pv.error);
  assertEqual(cheminsPourLeSol(v), { troncon: 'genere', cases: [t] });
});

test('éteint : rien ne se pose hors de la ferme, comme avant ; pas de dehors dans une partie neuve', () => {
  avecVillage(() => {
    const s = createNewGame('chemin-eteint');
    assert(!('dehors' in s) && !('portage' in s), 'une partie neuve : ni dehors ni portage');
    const T = farmTerrain(s);
    setInv(s, { chemin: 2 });
    const t = T.MONDE.cadre.SORTIE + 4;
    const r = poseStatus(s, 'chemin', t);
    assertEqual(r.ok, false);
    assert(/On ne bâtit que sur l'herbe/.test(r.raison), r.raison);
    assertEqual(cheminsPourLeSol(s), null);
    assertEqual(capacitePortage(s), DATA.VILLAGE.PORTAGE.MAINS);
  }, false);
});
