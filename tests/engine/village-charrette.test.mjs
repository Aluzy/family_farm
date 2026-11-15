/* ==========================================================================
   Tests du chantier « l'île à bâtir » : la charrette du village (fiche I2b ; js/engine/charrette.js, taches.js
   avancerCharrette, dehors.js les rails ; docs/ile.md, D17). Comme tous les fichiers tests/engine/village-*.test.mjs, il
   tourne avec VILLAGE.ACTIF forcé à true.
   - la charrette naît avec la tournée du port ; éteint, rien ;
   - les paliers : les prix, l'ordre, le refus sans pièces ; les deux branches libres ; le cheval demande l'Écurie, le
     wagonnet la voie complète ; « Charrette du village : … » aux Comptes ;
   - les voyages du jour pour trois longueurs de chemin (le tableau de la fiche) ; un voyage entier ; le chemin coupé ;
   - la vente : en volumes, les contrats d'abord, le plus cher au volume ensuite, à l'heure d'arrivée ; le port fermé ;
   - le relais des charretiers (D17) : voyage par voyage, le suivant qui travaille ; un jour de repos ne l'arrête pas ;
   - le cheval : par le bac, sa place à l'Écurie, sa ration la nuit, le tableau ;
   - les rails : l'image d'après les voisins, les refus, la voie complète, le wagonnet sur les rails ;
   - la sauvegarde v108 → v109 ; les commandes et les rôles ; le joueur automatique ; la journée et la scène.
   Lancer seul : node tests/run-tests.mjs village-charrette
   ========================================================================== */

import {
  acheterPalier, addItem, arriverVillageois, attribuer, avancerCharrette, awakeMsAtHour, bilanJour, botVillageois,
  buildAtelier, capaciteCharrette, charretiersDuJour, charretteDu, comptoirDuPort, countItem, DATA, dureeDuVoyage, etatCharrette,
  etatEcurie, executerCommande, farmSeed, farmTerrain, horaireDesVoyages, imageRails, journeeDuVillage, marquerAVendre, migrate,
  modeCharrette, ouEstLaCharrette, palierRoulant, portDuMonde, poserBloc, poserRails, railsPoses, railsSur, refusDuRole,
  refusPalier, reprendreBloc, roleDemande, runNight, STATE_VERSION, tachesNuit, testMaisonVillageois, trajetCharrette,
  voieDe, voyagesDuJour, accepterContrat, avancerContrats, retirerCheminDehors, retirerRails, cheminsDehors, horlogeDe, assurerTroncon,
} from '../../js/engine/index.js';
import { assert, assertEqual, avecVillage, boite, partie, setInv, test } from './aide.mjs';

const CH = DATA.CHARRETTE;
const copie = (o) => JSON.parse(JSON.stringify(o));

// La partie de test : le port, `n` villageois logés, l'Atelier, de jour (6 h) ; `navette` : le premier à la tournée,
// des carottes marquées « à vendre ».
function ile(n = 1, seed = 1, navette = true) {
  const s = partie(seed);
  portDuMonde(farmSeed(s));
  assurerTroncon(s);
  boite(s, { pain: 200 });
  setInv(s, { bois: 3, pierre: 3 });
  assert(buildAtelier(s).ok, 'l\'Atelier');
  for (let k = 0; k < n; k++) assert(testMaisonVillageois(s).ok, 'la maison');
  const V = [];
  for (let k = 0; k < n; k++) V.push(arriverVillageois(s, { direct: true }).villageois);
  s.progression.niveau = Math.max(s.progression.niveau, 30);
  s.awakeMs = awakeMsAtHour(6);
  if (navette) {
    addItem(s, 'carotte', 400);
    assert(attribuer(s, V[0].id, 'navette').ok);
    marquerAVendre(s, V[0].id, ['carotte']);
  }
  return { s, V };
}

// Une journée de 6 h à 21 h, par quarts d'heure (les ventes à l'heure d'arrivée).
function journee(s, de = 6, a = 21) {
  for (let h = de; h <= a; h += 0.25) { s.awakeMs = awakeMsAtHour(h); avancerCharrette(s); }
}

// L'Écurie : une enceinte de murs, une porte sur le dehors, le râtelier (comme ferme-generee.cas.mjs).
function ecurie(s) {
  const T = farmTerrain(s), W = T.LARGEUR;
  setInv(s, { mur_pierre: 30, porte: 2, ratelier: 1, carotte: countItem(s, 'carotte') });
  for (let r = T.FERME.Y + 4; r < T.FERME.Y + T.FERME.HAUTEUR - 8; r++) {
    for (let c = T.FERME.X + 4; c < T.FERME.X + T.FERME.LARGEUR - 8; c++) {
      let ok = true;
      for (let dr = 0; dr < 5 && ok; dr++) for (let dc = 0; dc < 6 && ok; dc++) { const t = (r + dr) * W + c + dc; ok = T.LIGNES[r + dr][c + dc] === '#' && !(s.blocs || {})[t] && !(s.sols || {})[t] && !(T.HERBES && T.HERBES[t]) && !s.potager.parcelles.some((p) => p.case === t); }
      if (!ok) continue;
      const t = (x, y) => (r + y) * W + c + x;
      for (let x = 0; x <= 4; x++) for (let y = 0; y <= 3; y++) if (x === 0 || y === 0 || x === 4 || y === 3) poserBloc(s, 'mur_pierre', t(x, y));
      poserBloc(s, 'porte', t(2, 3));
      poserBloc(s, 'ratelier', t(1, 1));
      if (etatEcurie(s).ok) return true;
    }
  }
  return false;
}

/* ---------- la naissance, éteint ---------- */

test('la charrette naît avec le premier villageois mis à la tournée du port, aux paliers 1 ; éteint, rien', () => {
  const { s, V: [v] } = ile(1, 1, false);
  assertEqual(charretteDu(s), null, 'pas de tournée, pas de charrette');
  attribuer(s, v.id, 'bois');
  assertEqual(charretteDu(s), null);
  attribuer(s, v.id, 'navette');
  assertEqual([s.charrette.capacite, s.charrette.vitesse, s.charrette.cheval, s.charrette.wagonnet], [1, 1, null, false]);
  assertEqual(capaciteCharrette(s), CH.CAPACITES[0]);
  assertEqual(modeCharrette(s), 'bras');
  avecVillage(() => {
    assertEqual(charretteDu(s), null, 'éteint : rien ne se lit');
    assertEqual(acheterPalier(s, 'capacite').ok, false);
    assertEqual(voyagesDuJour(s).voyages, []);
  }, false);
});

/* ---------- les paliers ---------- */

test('les paliers : leur prix, dans l\'ordre, refusés sans pièces ; les deux branches libres ; aux Comptes', () => {
  const { s } = ile();
  s.pieces = 0;
  assertEqual(refusPalier(s, 'capacite'), 'Pas assez de pièces.');
  assertEqual(acheterPalier(s, 'vitesse').ok, false);
  assertEqual(refusPalier(s, 'autre'), 'Branche inconnue.');
  // la capacité monte jusqu'au palier 5 sans aucun palier de vitesse (les branches sont libres)
  s.pieces = 100000;
  for (let p = 2; p <= 5; p++) {
    const avant = s.pieces, r = acheterPalier(s, 'capacite');
    assert(r.ok, `C${p} : ${r.error}`);
    assertEqual([r.palier, avant - s.pieces, capaciteCharrette(s)], [p, CH.PRIX_CAPACITE[p - 1], CH.CAPACITES[p - 1]]);
  }
  assertEqual(s.charrette.vitesse, 1, 'la vitesse n\'a pas bougé : 320 volumes tirés à bras');
  assert(/tout ce qu'elle peut/.test(refusPalier(s, 'capacite')), 'au plus haut');
  // la vitesse : le palier 2 sans rien demander
  assert(acheterPalier(s, 'vitesse').ok, 'V2');
  assertEqual(s.pieces, 100000 - CH.PRIX_CAPACITE.reduce((a, b) => a + b, 0) - CH.PRIX_VITESSE[1]);
  assert(s.compta.some((l) => /^Charrette du village : /.test(l.libelle) && l.montant === -CH.PRIX_VITESSE[1]), 'aux Comptes');
  // une capacité de 160 sans cheval n'est pas refusée (la décision du joueur : les branches sont libres)
  const b = ile(1, 2);
  b.s.pieces = 100000;
  for (let p = 2; p <= 4; p++) assert(acheterPalier(b.s, 'capacite').ok);
  assertEqual(capaciteCharrette(b.s), 160);
  // la commande, de même
  const r = executerCommande(b.s, { id: 'c1', type: 'charrette.palier', args: { branche: 'vitesse' } });
  assert(r.ok && b.s.charrette.vitesse === 2, 'charrette.palier');
  assertEqual(executerCommande(b.s, { id: 'c2', type: 'charrette.palier', args: { branche: 'Capacité!' } }).ok, false, 'une branche mal écrite');
});

test('le cheval de trait (V3) : l\'Écurie et sa place d\'abord ; il vient par le bac ; sa ration la nuit, au tableau', () => {
  const { s, V: [v] } = ile();
  s.pieces = 100000;
  assert(acheterPalier(s, 'vitesse').ok, 'V2');
  assert(/Écurie/.test(refusPalier(s, 'vitesse')), `sans Écurie : ${refusPalier(s, 'vitesse')}`);
  assert(ecurie(s), 'l\'Écurie');
  assertEqual(refusPalier(s, 'vitesse'), null);
  const r = acheterPalier(s, 'vitesse');
  assert(r.ok && Number.isInteger(r.cheval), 'V3, le cheval commandé au bac');
  assertEqual(r.prix, CH.PRIX_VITESSE[2]);
  // tant que le bac ne l'a pas amené : le pas d'avant
  s.port.passe = r.cheval - 1;
  assertEqual([palierRoulant(s), modeCharrette(s)], [CH.CHEVAL.SANS_CHEVAL, 'bras']);
  s.port.passe = r.cheval;
  assertEqual([palierRoulant(s), modeCharrette(s)], [3, 'cheval']);
  // V4 : au trot ; le wagonnet demande la voie
  assert(acheterPalier(s, 'vitesse').ok, 'V4');
  assertEqual(palierRoulant(s), 4);
  assert(/voie complète/.test(refusPalier(s, 'vitesse')), refusPalier(s, 'vitesse'));
  // la nuit : sa ration (2 pailles), notée au premier charretier, au tableau
  setInv(s, { paille: 5, carotte: 200 });
  s.awakeMs = awakeMsAtHour(20);
  runNight(s);
  assertEqual(countItem(s, 'paille'), 5 - CH.CHEVAL.RATION, 'la ration prise au coffre');
  assert(s.charrette.cheval.nourri, 'nourri');
  const J = v.journal[v.journal.length - 1];
  assertEqual([J.cheval, bilanJour(J).cheval], [CH.CHEVAL.RATION, CH.CHEVAL.RATION]);
  assert(J.utilise.paille >= CH.CHEVAL.RATION, 'dans ce qu\'il a pris au coffre (son coût)');
  // sans paille : il ne mange pas (sans pénalité : il roule quand même)
  setInv(s, { paille: 0, carotte: 200 });
  runNight(s);
  assertEqual([s.charrette.cheval.nourri, palierRoulant(s)], [false, 4]);
});

/* ---------- les voyages ---------- */

test('les voyages du jour pour trois longueurs de chemin : ceux du tableau de la fiche', () => {
  const T = { 300: [2, 3, 4, 5, 7], 430: [1, 2, 3, 4, 5], 520: [1, 1, 2, 3, 4] };
  for (const [L, n] of Object.entries(T)) {
    const vu = CH.VITESSES.map((v) => horaireDesVoyages(Number(L) / (CH.MARCHE * v)).length);
    assertEqual(vu, n, `aller de ${L} cases`);
  }
  // un voyage entier : il revient avant la fin de la journée ; au quai, on charge plus vite
  const l = horaireDesVoyages(430 / CH.MARCHE);
  assert(l[l.length - 1].retour <= CH.JOUR[1] + 1e-9 && l[0].depart === CH.JOUR[0], 'de 7 h à 17 h');
  assert(Math.abs(dureeDuVoyage(1) - dureeDuVoyage(1, true) - (CH.CHARGE - CH.QUAI)) < 1e-9, 'le quai');
  assertEqual(horaireDesVoyages(20).length, 0, 'un aller trop long : aucun voyage');
});

test('la route : par le chemin du port, au pas de la vitesse ; le chemin coupé la ralentit', () => {
  const { s } = ile();
  const r = trajetCharrette(s);
  assert(r && r.cases.length > 50 && r.longueur > 150, `une route (${r && r.longueur} cases)`);
  assertEqual(r.cases[r.cases.length - 1], comptoirDuPort(s).devant, 'jusqu\'au comptoir');
  assert(Math.abs(r.aller - r.heures[r.heures.length - 1]) < 1e-9);
  const avant = r.aller;
  // un trou de huit cases dans le chemin, au milieu du tronçon
  const ch = [...cheminsDehors(s)].sort((a, b) => a - b), W = farmTerrain(s).LARGEUR;
  const milieu = r.cases[Math.floor(r.cases.length * 0.6)];
  for (const t of ch) if (Math.abs((t % W) - (milieu % W)) <= 4 && Math.abs(Math.floor(t / W) - Math.floor(milieu / W)) <= 4) retirerCheminDehors(s, t);
  const r2 = trajetCharrette(s);
  assert(r2.aller > avant && r2.horsChemin > 0, `plus lente (${avant.toFixed(2)} → ${r2.aller.toFixed(2)} h, ${r2.horsChemin} cases hors du chemin)`);
  // plus vite : moins d'heures à l'aller
  s.pieces = 10000;
  acheterPalier(s, 'vitesse');
  assert(trajetCharrette(s).aller < r2.aller - 1e-6, 'V2 va plus vite');
});

test('la vente : à l\'heure d\'arrivée, en volumes, le plus cher au volume d\'abord ; le port fermé, rien', () => {
  const { s, V: [v] } = ile();
  setInv(s, { carotte: 100, bois: 100, pain: 0 });
  marquerAVendre(s, v.id, ['bois', 'carotte']);
  const j = voyagesDuJour(s), p0 = s.pieces;
  assert(j.voyages.length >= 1, 'au moins un voyage');
  const v0 = j.voyages[0];
  s.awakeMs = awakeMsAtHour(v0.arrivee - 0.05);
  avancerCharrette(s);
  assertEqual(s.pieces, p0, 'pas avant son arrivée');
  s.awakeMs = awakeMsAtHour(v0.arrivee + 0.01);
  avancerCharrette(s);
  // (la carotte vaut plus au volume que le bois, qui fait deux volumes)
  const cher = (o) => DATA.PRIX_ILE && Number.isInteger(DATA.PRIX_ILE[o]) ? DATA.PRIX_ILE[o] : DATA.OBJETS[o].prix;
  const premier = cher('carotte') / 1 >= cher('bois') / 2 ? 'carotte' : 'bois';
  assert(s.pieces > p0, 'vendu');
  assertEqual(s.charrette.volumes, CH.CAPACITES[0], 'la capacité en volumes');
  assertEqual(Object.keys(s.charrette.vendu), [premier], 'le plus cher au volume d\'abord');
  assertEqual(s.charrette.faits, 1);
  assertEqual(v.travail.actions, 1, 'une action pour le charretier');
  // le port fermé à son arrivée : rien ne se vend (la vente se fait au port ouvert)
  const H = DATA.PORT.HEURES;
  DATA.PORT.HEURES = [20, 21];
  try {
    const p1 = s.pieces;
    journee(s, v0.arrivee, 19);
    assertEqual(s.pieces, p1, 'le comptoir fermé');
  } finally { DATA.PORT.HEURES = H; }
});

test('les contrats d\'export d\'abord (I8b), en volumes', () => {
  const { s, V: [v] } = ile();
  const PER = DATA.PORT.BAC.PERIODE;
  s.port.niveau = 2;
  s.campagne.compteurs.pains = 1;
  s.day = PER; s.awakeMs = awakeMsAtHour(10);
  avancerContrats(s);
  s.production.contrats.proposes = [{ id: 'k', objet: 'pain', quantite: 15, prime: 40, jour: PER, fin: PER + 2 * PER }];
  assert(accepterContrat(s, 'k', comptoirDuPort(s).devant).ok);
  setInv(s, { pain: 50, carotte: 50 });
  s.awakeMs = awakeMsAtHour(6);
  const v0 = voyagesDuJour(s).voyages[0];
  s.awakeMs = awakeMsAtHour(v0.arrivee + 0.01);
  avancerCharrette(s);
  assertEqual(s.charrette.vendu.pain, 15, 'le contrat d\'abord');
  assertEqual(s.charrette.vendu.carotte, CH.CAPACITES[0] - 15, 'puis ce qui est marqué « à vendre »');
  assertEqual(s.production.contrats.honores, 1);
});

test('le relais des charretiers (D17) : une seule charrette, voyage par voyage ; un jour de repos ne l\'arrête pas', () => {
  const { s, V: [a, b] } = ile(2, 3);
  s.pieces = 10000;
  for (let k = 0; k < 3; k++) acheterPalier(s, 'vitesse');   // (V2 : plusieurs voyages ; V3 refusé sans Écurie)
  assert(attribuer(s, b.id, 'navette').ok);
  const j = voyagesDuJour(s);
  assert(j.voyages.length >= 2, `plusieurs voyages (${j.voyages.length})`);
  assertEqual(j.voyages.map((x) => x.charretier), j.voyages.map((x, k) => [a.id, b.id].sort()[k % 2]), 'chacun son tour');
  // le relais ne rend pas plus rapide : autant de voyages qu'avec un seul
  const seul = ile(1, 3);
  seul.s.pieces = 10000;
  acheterPalier(seul.s, 'vitesse');
  assertEqual(voyagesDuJour(seul.s).voyages.length, j.voyages.length, 'autant de voyages à un ou à deux');
  // un jour de repos : la charrette passe à l'autre, elle ne reste pas au coffre
  a.repos = true;
  assertEqual(charretiersDuJour(s).map((x) => x.id), [b.id]);
  const j2 = voyagesDuJour(s);
  assertEqual([j2.voyages.length, j2.voyages.every((x) => x.charretier === b.id)], [j.voyages.length, true]);
  journee(s);
  assertEqual([b.travail.actions, s.charrette.faits], [j2.voyages.length, j2.voyages.length], 'il a tout mené');
  // les deux au repos : pas de voyage
  b.repos = true;
  assertEqual(voyagesDuJour(s).voyages, []);
});

test('la journée du charretier : ses voyages sur la charrette (il mange au port) ; où est la charrette à l\'heure', () => {
  const { s, V: [v] } = ile();
  const j = voyagesDuJour(s), segs = journeeDuVillage(s).get(v.id);
  for (const x of j.voyages) {
    const seg = segs.find((g) => g.de <= x.depart + 1e-9 && g.a >= x.retour - 1e-9);
    assert(seg && seg.etat === 'travail' && seg.lieu.genre === 'charrette', `le voyage de ${x.depart} h`);
  }
  assert(!segs.some((g) => g.etat === 'repas' && g.de < j.voyages[0].retour && g.a > j.voyages[0].depart), 'pas de repas à la maison pendant un voyage');
  const x = j.voyages[0];
  assertEqual(ouEstLaCharrette(s, 3).phase, 'rangee');
  assertEqual(ouEstLaCharrette(s, x.depart + 0.01).phase, 'charge');
  const aller = ouEstLaCharrette(s, (x.charge + x.arrivee) / 2);
  assertEqual([aller.phase, aller.charge, aller.charretier], ['aller', true, v.id]);
  assertEqual(ouEstLaCharrette(s, x.arrivee + 0.01).phase, 'vente');
  const retour = ouEstLaCharrette(s, (x.vente + x.retour) / 2);
  assertEqual([retour.phase, retour.charge], ['retour', false]);
});

/* ---------- les rails, la voie, le wagonnet ---------- */

test('les rails : l\'image d\'après les voisins, sur un chemin le passage planchéié ; se posent et se reprennent ; ne gênent rien', () => {
  const { s } = ile();
  const T = farmTerrain(s), W = T.LARGEUR, F = T.FERME;
  // sur la ferme : un L (trois au nord-sud, puis trois vers l'est)
  let t0 = null;
  for (let r = F.Y + 5; r < F.Y + F.HAUTEUR - 10 && t0 === null; r++) for (let c = F.X + 5; c < F.X + F.LARGEUR - 10 && t0 === null; c++) {
    const l = [0, W, 2 * W, 2 * W + 1, 2 * W + 2, 2 * W + 3].map((d) => r * W + c + d);
    if (l.every((t) => T.LIGNES[Math.floor(t / W)][t % W] === '#' && !(s.blocs || {})[t] && !(s.sols || {})[t] && !s.potager.parcelles.some((p) => p.case === t) && !(T.HERBES && T.HERBES[t]))) t0 = r * W + c;
  }
  assert(t0 !== null, 'une place');
  addItem(s, 'rails', 8);
  for (const d of [0, W, 2 * W, 2 * W + 1, 2 * W + 2, 2 * W + 3]) assert(poserBloc(s, 'rails', t0 + d).ok, `rails en ${d}`);
  assertEqual(countItem(s, 'rails'), 2);
  assertEqual([imageRails(s, t0), imageRails(s, t0 + W), imageRails(s, t0 + 2 * W), imageRails(s, t0 + 2 * W + 1)], ['ns', 'ns', 'ne', 'eo']);
  assertEqual(poserBloc(s, 'rails', t0).ok, false, 'déjà des rails');
  assertEqual((s.blocs || {})[t0], undefined, 'pas un bloc : une couche à part');
  // sur un chemin du dehors : le passage planchéié, la case reste un chemin
  const ch = [...cheminsDehors(s)].find((t) => cheminsDehors(s).has(t - W) && cheminsDehors(s).has(t + W) && !cheminsDehors(s).has(t - 1));
  addItem(s, 'rails', 1);
  const r = poserBloc(s, 'rails', ch);
  assert(r.ok, `sur le chemin : ${r.error}`);
  poserRails(s, ch - W);
  assertEqual(imageRails(s, ch), 'ns_chemin');
  assert(cheminsDehors(s).has(ch), 'toujours un chemin');
  // repris : les rails d'abord, le chemin reste
  assertEqual(reprendreBloc(s, ch).sorte, 'rails');
  assert(!railsSur(s, ch) && cheminsDehors(s).has(ch));
  // refusés dans les abords du port
  const c = comptoirDuPort(s).devant;
  addItem(s, 'rails', 1);
  assert(/abords du port/.test(poserBloc(s, 'rails', c).error || ''), 'les abords du port');
  // les rails : une recette de l'Atelier (8 cases), en vente à la forge à la commande (6 pièces la case)
  assertEqual(DATA.ATELIER.RECETTES.rails.sortie.rails, 8);
  assertEqual(DATA.ARTISANS.COMMERCES.forge.RECETTES.rails.commande, true);
  assertEqual(DATA.OBJETS.rails.prix, 6);
});

test('la voie complète, du quai au port : le wagonnet (V5) y roule, plus vite ; coupée, la charrette reprend le chemin', () => {
  const { s } = ile();
  s.pieces = 100000;
  assert(ecurie(s), 'l\'Écurie');
  for (let k = 0; k < 3; k++) assert(acheterPalier(s, 'vitesse').ok);
  s.port.passe = s.charrette.cheval.arrive;
  const v0 = voieDe(s);
  assert(!v0.complete && v0.manque > 50 && Number.isInteger(v0.ici), `il manque ${v0.manque} cases`);
  assert(/il manque \d+ cases de rails/.test(refusPalier(s, 'vitesse')), refusPalier(s, 'vitesse'));
  const aller4 = trajetCharrette(s).aller;
  for (const t of v0.trace) poserRails(s, t);
  const v1 = voieDe(s);
  assert(v1.complete && v1.longueur >= v0.manque, `la voie complète (${v1.longueur} cases)`);
  const r = acheterPalier(s, 'vitesse');
  assert(r.ok && s.charrette.wagonnet, 'V5, le wagonnet');
  assertEqual(modeCharrette(s), 'wagonnet');
  const t5 = trajetCharrette(s);
  assert(t5.rails > 50 && t5.aller < aller4, `sur les rails (${t5.rails} cases), plus vite (${aller4.toFixed(2)} → ${t5.aller.toFixed(2)} h)`);
  // un rail repris : la voie est coupée, la charrette reprend le chemin, au trot
  const coupe = v0.trace[Math.floor(v0.trace.length / 2)];
  retirerRails(s, coupe);
  assertEqual([voieDe(s).complete, modeCharrette(s), palierRoulant(s)], [false, 'cheval', 4]);
});

/* ---------- la sauvegarde ---------- */

test('la sauvegarde v108 → v109 : la tournée reçoit la charrette au palier de ce qu\'elle portait ; sans tournée, rien', () => {
  assert(STATE_VERSION >= 109);
  const avant = (f) => {
    const { s } = ile(1, 1, false);
    s.villageois[0].tache = 'navette';
    delete s.charrette;
    if (f) f(s);
    return migrate({ v: 108, t: 0, s: { ...copie(s), version: 108 } });
  };
  const rien = avant();
  assertEqual([rien.version, rien.charrette.capacite, rien.charrette.vitesse], [STATE_VERSION, 1, 1], 'rien : C1 V1');
  const brouette = avant((s) => addItem(s, 'brouette', 1));
  assertEqual([brouette.charrette.capacite, brouette.charrette.vitesse], [2, 2], 'une brouette : C2 V2');
  const sansPlace = avant((s) => { addItem(s, 'charrette', 1); s.cheval = { monte: false, nourri: true, attache: null }; });
  assertEqual([sansPlace.charrette.capacite, sansPlace.charrette.vitesse, sansPlace.charrette.cheval], [3, 2, null], 'la charrette et le cheval, sans Écurie : C3 V2');
  const avecPlace = avant((s) => { assert(ecurie(s)); addItem(s, 'charrette', 1); s.cheval = { monte: false, nourri: true, attache: null }; });
  assertEqual([avecPlace.charrette.capacite, avecPlace.charrette.vitesse, avecPlace.charrette.cheval && avecPlace.charrette.cheval.arrive], [3, 3, 0], 'avec l\'Écurie : C3 V3, son cheval offert');
  // sans tournée : rien
  const { s } = ile(1, 1, false);
  assertEqual('charrette' in migrate({ v: 108, t: 0, s: { ...copie(s), version: 108 } }), false);
  // une partie solo : le format seul
  const solo = copie(partie(1));
  assertEqual('charrette' in migrate({ v: 108, t: 0, s: { ...solo, version: 108 } }), false);
  // une charrette et des rails déjà là sont relus
  const { s: s2 } = ile();
  poserRails(s2, 1000); poserRails(s2, 1001);
  s2.charrette.capacite = 99;
  const m = migrate({ v: 108, t: 0, s: { ...copie(s2), version: 108 } });
  assertEqual([m.charrette.capacite, railsPoses(m).size], [CH.CAPACITES.length, 2]);
});

/* ---------- en ligne : les rôles ---------- */

test('en ligne : un palier au propriétaire, les rails au bâtisseur, la tournée à qui attribue les tâches ; personne n\'attelle', () => {
  const { s, V: [v] } = ile();
  s.mondePartage = true;
  horlogeDe(s);
  assertEqual(roleDemande(s, { type: 'charrette.palier', args: { branche: 'capacite' } }), 'proprietaire');
  assert(/améliore la charrette/.test(refusDuRole('batisseur', s, { type: 'charrette.palier', args: { branche: 'capacite' } })));
  assertEqual(roleDemande(s, { type: 'bloc.poser', args: { sorte: 'rails', case: 5 } }), 'batisseur');
  assertEqual(roleDemande(s, { type: 'villageois.attribuer', args: { id: v.id, tache: 'navette' } }), 'proprietaire');
  assertEqual(roleDemande(s, { type: 'villageois.attribuer', args: { id: v.id, tache: 'navette' } }, { taches: true }), 'batisseur');
  // la charrette du joueur (I2) garde sa règle : un joueur à la fois ; celle du village n'a pas de commande pour l'atteler
  assert(!Object.keys(DATA).includes('charrette.atteler'));
  // la vente d'un voyage se joue dans le pas du monde (avancerTaches) : la même chez chacun
  const a = copie(s), b = copie(s);
  for (const x of [a, b]) journee(x);
  assertEqual([a.pieces, a.charrette.faits], [b.pieces, b.charrette.faits]);
});

/* ---------- le joueur automatique ---------- */

test('le joueur automatique achète un palier quand sa caisse vaut deux fois le prix et que le village a plus à vendre', () => {
  const { s } = ile();
  s.pieces = CH.PRIX_CAPACITE[1] * 2 - 1;
  botVillageois(s);
  assertEqual([s.charrette.capacite, s.charrette.vitesse], [1, 1], 'pas assez de pièces');
  s.pieces = 2 * Math.max(CH.PRIX_CAPACITE[1], CH.PRIX_VITESSE[1]);
  botVillageois(s);
  assertEqual([s.charrette.capacite, s.charrette.vitesse], [2, 1], 'le moins cher d\'abord : C2');
  setInv(s, { carotte: 2 });
  s.pieces = 100000;
  botVillageois(s);
  assertEqual([s.charrette.capacite, s.charrette.vitesse], [2, 1], 'rien à vendre de plus : il n\'achète pas');
});
