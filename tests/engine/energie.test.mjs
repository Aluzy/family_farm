/* ==========================================================================
   Tests du moteur : Lot 1 : heure, parc électrique, eau, Dormir.
   Lancer seul : node --test tests/engine/energie.test.mjs (ou node tests/run-tests.mjs energie).
   ========================================================================== */

import {
  awakeMsAtHour, canSleep, clockHours, createInitialState, createNewGame, DATA, deviceStatus,
  drawEnergy, efficiency, energyStats, formatCoins, formatHour, formatLitres, formatLitresRate,
  formatSigned, formatWh, formatWhRate, hourOfDay, isBroken, maintainCost, maintainDevice,
  NIGHT_STEPS, repairCost, repairDevice, sleep, storeEnergy, sunlitMs, tankCapacity, testBatir,
  testFillBatteries, testFillTank, testSetBuildingLevel5, testSetLevel, testSetWear,
  testSleepNights, tick, toggleDevice, unlockLevel, upgradeDevice, upgradeTank,
} from '../../js/engine/index.js';
import {
  assert, assertEqual, farm, kwh, ml, near, test,
} from './aide.mjs';

/* ---------- Lot 1 : heure, parc électrique, eau, Dormir ---------- */

test('DATA : grilles par niveau, coûts et départ (version 1.6 : un panneau, une batterie)', () => {
  assertEqual(DATA.RESEAU.panneau.whParS, [40, 90, 160, 260, 400]);
  assertEqual(DATA.RESEAU.batterie.wh, [6000, 15000, 30000, 60000, 100000]);
  assertEqual(DATA.RESEAU.pompe.litresParS, [1, 2, 4, 6, 10]);
  assertEqual(DATA.RESEAU.reservoir.litres, [40, 80, 160, 300, 500]);
  assertEqual(Object.fromEntries(Object.entries(DATA.RESEAU).map(([k, v]) => [k, v.prixNiveaux])), {
    panneau: [0, 150, 400, 900, 2000], batterie: [0, 180, 450, 1000, 2200],
    pompe: [0, 100, 250, 600, 1300], reservoir: [0, 120, 300, 700, 1500],
  });
  assertEqual(DATA.SOLEIL, { DEBUT: 7, FIN: 19 });
  assertEqual(DATA.PURCHASE, undefined, 'plus d\'achat d\'appareil supplémentaire');
  const s = createInitialState(1);
  assertEqual(s.panneaux.length, 1);
  assertEqual(s.batteries.length, 1);
  assertEqual(s.panneaux[0].niveau, 1);
  assertEqual(s.batteries[0].niveau, 1);
  assertEqual(s.pompe.niveau, 1);
  assertEqual(s.reservoir, { niveau: 1 });
  assertEqual('compteurs' in s, false);
  assertEqual(tankCapacity(s), ml(40));
  assertEqual(s.eauMl, ml(0));
});

test('production : un panneau de niveau 1 produit 0,04 kWh/s au soleil', () => {
  const s = farm();
  tick(s, 10);
  assertEqual(s.batteries[0].chargeMwh, kwh(0.4), `charge ${s.batteries[0].chargeMwh}`);
  assertEqual(s.jour.produite, kwh(0.4));
});

test('soleil : le panneau ne produit qu\'entre 7 h et 19 h, au prorata d\'un pas à cheval', () => {
  const H = DATA.TEMPS.SECONDES_PAR_HEURE * 1000;
  const s = farm({ sun: false }); // 6 h
  tick(s, 10);
  assertEqual([s.batteries[0].chargeMwh, s.panneaux[0].prod], [0, 0], 'avant 7 h : rien');
  const t = farm({ sun: false });
  t.awakeMs = H - 5000; // 6 h 43 : 5 s avant 7 h
  tick(t, 10);
  assertEqual(t.batteries[0].chargeMwh, kwh(0.2), '5 s de soleil sur 10');
  assertEqual(t.panneaux[0].prod, kwh(0.02), 'puissance moyenne du pas');
  const u = farm({ sun: false });
  u.awakeMs = awakeMsAtHour(19) - 2000;
  tick(u, 10);
  assertEqual(u.batteries[0].chargeMwh, kwh(0.08), '2 s de soleil avant 19 h');
  tick(u, 10);
  assertEqual(u.batteries[0].chargeMwh, kwh(0.08), 'le soir : plus rien');
  // une journée entière de l'horloge : 12 heures de soleil, et de même le lendemain
  assertEqual([sunlitMs(0, H), sunlitMs(H, 1000), sunlitMs(0, 24 * H), sunlitMs(24 * H, 24 * H), sunlitMs(13 * H, 11 * H)], [0, 1000, 12 * H, 12 * H, 0]);
  assertEqual(sunlitMs(12 * H, 2 * H), H, 'de 18 h à 20 h : une heure de soleil');
  assertEqual(deviceStatus(s, s.panneaux[0]).code, 'marche', 'la nuit, il est en marche mais ne produit rien');
});

test('production réduite par l\'usure (rendement = 100 − ⌊usure ÷ 2⌋ %)', () => {
  const s = farm();
  s.panneaux[0].usure = 50; // rendement 75 %
  tick(s, 10);
  assertEqual(s.batteries[0].chargeMwh, kwh(0.04 * 0.75 * 10), `charge ${s.batteries[0].chargeMwh}`);
  const t = farm();
  t.panneaux[0].usure = 99; // presque en panne : rendement 51 %
  assertEqual(efficiency(t.panneaux[0]), 51);
  t.panneaux[0].usure = 81;
  assertEqual(efficiency(t.panneaux[0]), 60, 'arrondi vers le bas : 81 ÷ 2 = 40');
});

test('un panneau éteint ne produit rien', () => {
  const s = farm();
  toggleDevice(s, 'panneau-1');
  tick(s, 10);
  assertEqual(s.batteries[0].chargeMwh, 0);
});

test('capacité utile d\'une batterie = capacité × rendement', () => {
  const s = farm();
  s.batteries[0].usure = 99; // rendement 51 %
  s.panneaux[0].niveau = 5; // 400 Wh/s
  tick(s, 100); // 40 000 Wh produits, capacité utile 6 000 × 51 % = 3 060 Wh
  assertEqual(s.batteries[0].chargeMwh, kwh(3.06), `charge ${s.batteries[0].chargeMwh}`);
});

test('batterie : elle se remplit jusqu\'à sa capacité, rend ce qu\'elle a, coupée elle garde sa charge', () => {
  const s = farm();
  const [b] = s.batteries;
  assertEqual(storeEnergy(s, kwh(7)), kwh(1), 'au-delà de 6 000 Wh : rendu à l\'appelant (perdu)');
  assertEqual(b.chargeMwh, kwh(6));
  assertEqual(drawEnergy(s, kwh(3)), kwh(3));
  assertEqual(b.chargeMwh, kwh(3));
  toggleDevice(s, b.id);
  assertEqual(drawEnergy(s, kwh(10)), 0, 'coupée : elle ne rend rien');
  assertEqual(storeEnergy(s, kwh(1)), kwh(1), 'ni ne reçoit');
  assertEqual(b.chargeMwh, kwh(3), 'elle garde sa charge');
});

test('une batterie ne se décharge jamais d\'elle-même', () => {
  const s = farm();
  toggleDevice(s, 'panneau-1');
  s.batteries[0].chargeMwh = kwh(3);
  for (let i = 0; i < 500; i++) tick(s, 0.2);
  assertEqual(s.batteries[0].chargeMwh, kwh(3));
});

test('énergie perdue quand tout est plein, et le rapport la signale', () => {
  const s = farm();
  testFillBatteries(s);
  tick(s, 10);
  assertEqual(s.jour.perdue, kwh(0.4), `perdue ${s.jour.perdue}`);
  assertEqual(s.flux.perdue, kwh(0.04));
  s.awakeMs = 30000;
  const report = sleep(s);
  assertEqual(report.energiePerdue, kwh(0.4), `rapport ${report.energiePerdue}`);
  assertEqual(s.jour.perdue, 0);
});

test('énergie perdue quand toutes les batteries sont coupées', () => {
  const s = farm();
  toggleDevice(s, 'batterie-1');
  tick(s, 10);
  assertEqual(s.jour.perdue, kwh(0.4));
  assertEqual(s.batteries[0].chargeMwh, 0);
});

test('pompe : 1 L/s pour 0,01 kWh/L, alimentée par la batterie', () => {
  const s = farm({ pump: true });
  toggleDevice(s, 'panneau-1');
  s.batteries[0].chargeMwh = kwh(1);
  tick(s, 10);
  assertEqual(s.eauMl, ml(10), `eau ${s.eauMl}`);
  assertEqual(s.batteries[0].chargeMwh, kwh(0.9), `charge ${s.batteries[0].chargeMwh}`);
  assertEqual(s.pompe.debit, ml(1));
  assertEqual(s.pompe.conso, kwh(0.01));
});

test('pompe au prorata quand l\'énergie manque', () => {
  const s = farm({ pump: true });
  toggleDevice(s, 'panneau-1');
  s.batteries[0].chargeMwh = kwh(0.001); // il faudrait 0,002 kWh pour 0,2 L
  tick(s, 0.2);
  assertEqual(s.eauMl, ml(0.1), `eau ${s.eauMl}`);
  assertEqual(s.batteries[0].chargeMwh, kwh(0));
  tick(s, 0.2);
  assertEqual(s.eauMl, ml(0.1), 'plus d\'énergie : plus d\'eau');
  assertEqual(deviceStatus(s, s.pompe).code, 'attente');
});

test('pompe à l\'arrêt si le réservoir est plein : rien consommé, aucune usure', () => {
  const s = farm({ pump: true });
  toggleDevice(s, 'panneau-1');
  testFillTank(s);
  s.batteries[0].chargeMwh = kwh(1);
  for (let i = 0; i < 50; i++) tick(s, 0.2);
  assertEqual(s.batteries[0].chargeMwh, kwh(1));
  assertEqual(s.pompe.usure, 0);
  assertEqual(s.eauMl, ml(40));
  assertEqual(deviceStatus(s, s.pompe).code, 'plein');
});

test('FLU-34 : panneau et pompe posés sans citerne, la pompe n\'affiche pas « Réservoir plein »', () => {
  const s = createNewGame(1, { nom: 'Martin' });
  testSetLevel(s, unlockLevel('energie'));
  assert(testBatir(s, 'foyer').ok);
  assert(testBatir(s, 'panneau').ok);
  assert(testBatir(s, 'pompe').ok);
  assertEqual(deviceStatus(s, s.pompe), { code: 'sansreservoir', label: 'Pas encore de réservoir', badge: '' });
  assert(testBatir(s, 'citerne').ok);
  assert(deviceStatus(s, s.pompe).code !== 'sansreservoir', 'citerne posée : statut habituel');
});

test('le réservoir ne dépasse jamais sa capacité', () => {
  const s = farm({ pump: true });
  s.eauMl = ml(39.95);
  testFillBatteries(s);
  tick(s, 10);
  assertEqual(s.eauMl, ml(40));
});

test('le réservoir a ses propres niveaux : 120 / 300 / 700 / 1 500 💰', () => {
  const s = farm();
  s.pieces = 10000;
  assert(upgradeDevice(s, 'pompe').ok);
  assertEqual(tankCapacity(s), ml(40), 'la pompe ne l\'agrandit plus');
  const costs = [];
  for (const cap of [80, 160, 300, 500]) {
    costs.push(upgradeTank(s).cost);
    assertEqual(tankCapacity(s), ml(cap));
  }
  assertEqual(costs, [120, 300, 700, 1500]);
  assertEqual(upgradeTank(s).ok, false, 'niveau 5 : maximum');
  const t = farm();
  t.pieces = 119;
  assertEqual([upgradeTank(t).ok, t.reservoir.niveau, t.pieces], [false, 1, 119]);
  assertEqual(DATA.RESEAU.pompe.litresParS[s.pompe.niveau - 1], 2);
});

test('usure : +1 point toutes les 2 heures de fonctionnement (60 s)', () => {
  const s = farm();
  for (let i = 0; i < 150; i++) tick(s, 0.2); // 30 s : une heure
  assertEqual([s.panneaux[0].usure, s.panneaux[0].usureMs], [0, 30000], 'une heure de marche : pas encore de point');
  for (let i = 0; i < 150; i++) tick(s, 0.2); // 60 s
  assertEqual([s.panneaux[0].usure, s.panneaux[0].usureMs], [1, 0]);
  assertEqual(s.batteries[0].usure, 1, 'la batterie qui charge s\'use aussi');
});

test('aucune usure sur un appareil éteint, en panne ou sans énergie', () => {
  const s = farm({ pump: true });
  toggleDevice(s, 'panneau-1');
  toggleDevice(s, 'batterie-1');
  for (let i = 0; i < 150; i++) tick(s, 0.2);
  assertEqual(s.panneaux[0].usure, 0, 'panneau éteint');
  assertEqual(s.batteries[0].usure, 0, 'batterie éteinte');
  assertEqual(s.pompe.usure, 0, 'pompe sans énergie');
  const t = farm();
  toggleDevice(t, 'panneau-1');
  for (let i = 0; i < 150; i++) tick(t, 0.2);
  assertEqual(t.batteries[0].usure, 0, 'batterie sans flux');
});

test('panne à 100 % : l\'appareil s\'arrête et s\'éteint', () => {
  const s = farm();
  s.panneaux[0].usure = 99;
  s.panneaux[0].usureMs = 40000;
  tick(s, 30);
  const p = s.panneaux[0];
  assertEqual(p.usure, 100);
  assertEqual(p.allume, false);
  assertEqual(isBroken(p), true);
  assertEqual(deviceStatus(s, p).code, 'panne');
  const charge = s.batteries[0].chargeMwh;
  tick(s, 10);
  assertEqual(s.batteries[0].chargeMwh, charge, 'un panneau en panne ne produit plus');
  assertEqual(toggleDevice(s, 'panneau-1').ok, false, 'on ne rallume pas une panne');
});

test('seuil « à entretenir » à 70 % d\'usure', () => {
  const s = farm();
  s.panneaux[0].usure = 69;
  assertEqual(deviceStatus(s, s.panneaux[0]).badge, '');
  s.panneaux[0].usure = 70;
  assertEqual(deviceStatus(s, s.panneaux[0]).badge, 'À entretenir');
  assertEqual(energyStats(s).panneauxAEntretenir, 1);
});

test('améliorer : coûts propres à chaque appareil, refus sans pièces et au niveau 5', () => {
  const s = farm();
  s.pieces = 10;
  assertEqual(upgradeDevice(s, 'panneau-1').ok, false);
  assertEqual(s.panneaux[0].niveau, 1);
  s.pieces = 3460;
  const costs = [];
  for (let i = 0; i < 4; i++) costs.push(upgradeDevice(s, 'panneau-1').cost);
  assertEqual(costs, [150, 400, 900, 2000]);
  assertEqual(s.panneaux[0].niveau, 5);
  assertEqual(s.pieces, 10);
  assertEqual(upgradeDevice(s, 'panneau-1').ok, false);
  assertEqual(upgradeDevice(s, 'inconnu').ok, false);
  s.pieces = 100000;
  const cost = (id) => { const c = []; for (let i = 0; i < 4; i++) c.push(upgradeDevice(s, id).cost); return c; };
  assertEqual(cost('batterie-1'), [180, 450, 1000, 2200]);
  assertEqual(cost('pompe'), [100, 250, 600, 1300]);
  tick(s, 10);
  assertEqual(s.panneaux[0].prod, kwh(0.4), 'niveau 5 : 400 Wh/s');
});

test('entretien 20 % et réparation 50 % du prix d\'achat', () => {
  const s = farm();
  s.pieces = 1000;
  const p = s.panneaux[0];
  p.prix = 72; // un appareil payé 72 (le panneau de départ est offert)
  assertEqual(maintainCost(p), 15, '20 % de 72 = 14,4, arrondi à 15');
  assertEqual(repairCost(p), 36);
  // entretien : remet l'usure à 0
  p.usure = 80;
  const before = s.pieces;
  const r = maintainDevice(s, p.id);
  assertEqual(r.ok, true);
  assertEqual(p.usure, 0);
  assertEqual(before - s.pieces, 15);
  // entretien inutile sans usure, refusé sur une panne
  assertEqual(maintainDevice(s, p.id).ok, false);
  testSetWear(s, p.id, 100);
  assertEqual(maintainDevice(s, p.id).ok, false);
  // réparation : uniquement en panne, l'appareil reste éteint
  const before2 = s.pieces;
  assertEqual(repairDevice(s, p.id).ok, true);
  assert(near(before2 - s.pieces, 36));
  assertEqual(p.usure, 0);
  assertEqual(p.allume, false);
  assertEqual(repairDevice(s, p.id).ok, false);
});

test('entretien et réparation refusés sans pièces', () => {
  const s = farm();
  const b = s.batteries[0];
  b.prix = 96; // une batterie payée 96
  b.usure = 50;
  s.pieces = 5;
  assertEqual(maintainDevice(s, b.id).ok, false);
  assertEqual(b.usure, 50);
  testSetWear(s, b.id, 100);
  assertEqual(repairDevice(s, b.id).ok, false);
  assertEqual(isBroken(b), true);
  assertEqual(s.pieces, 5);
});

test('les appareils de départ sont gratuits à entretenir', () => {
  const s = farm();
  s.panneaux[0].usure = 60;
  assertEqual(maintainCost(s.panneaux[0]), 0);
  s.pieces = 0;
  assertEqual(maintainDevice(s, 'panneau-1').ok, true);
});

test('interrupteur : allume et éteint, id inconnu refusé', () => {
  const s = farm();
  assertEqual(s.panneaux[0].allume, true);
  toggleDevice(s, 'panneau-1');
  assertEqual(s.panneaux[0].allume, false);
  toggleDevice(s, 'panneau-1');
  assertEqual(s.panneaux[0].allume, true);
  assertEqual(toggleDevice(s, 'nope').ok, false);
});

test('heure : suit le temps d\'éveil, 6 h au réveil, +1 h toutes les 30 s', () => {
  const s = farm({ sun: false });
  assertEqual(DATA.TEMPS.SECONDES_PAR_HEURE, 30);
  const H = 30000;
  assertEqual(hourOfDay(s), 6);
  s.awakeMs = H - 100;
  assertEqual(hourOfDay(s), 6);
  s.awakeMs = H;
  assertEqual(hourOfDay(s), 7);
  s.awakeMs = H * 3;
  assertEqual(hourOfDay(s), 9);
  s.awakeMs = H * 16; // 22 h : la fin de la journée
  assertEqual(hourOfDay(s), 22);
  s.awakeMs = H * 17;
  assertEqual(hourOfDay(s), 23);
  s.awakeMs = H * 18; // si rien ne lance la nuit, l'horloge repart de 0 et continue
  assertEqual(hourOfDay(s), 0);
  s.awakeMs = H * 24; // un tour complet
  assertEqual(hourOfDay(s), 6);
  s.awakeMs = H * 100; // (6 + 100) modulo 24
  assertEqual(hourOfDay(s), 10);
  assertEqual(formatHour(7), '7 h');
});

test('clockHours : la même heure, avec ses minutes, toujours dans [0, 24)', () => {
  const s = farm();
  const H = DATA.TEMPS.SECONDES_PAR_HEURE * 1000;
  const at = (ms) => { s.awakeMs = ms; return clockHours(s); };
  assertEqual(at(0), 6);
  assertEqual(at(H / 2), 6.5, '6 h 30 après une demi-heure de jeu (9 s)');
  assertEqual(at(H), 7);
  assertEqual(at(H * 17 + H / 2), 23.5);
  assertEqual(at(H * 18), 0, 'minuit');
  assertEqual(at(H * 18 + H / 4), 0.25);
  assertEqual(at(H * 24), 6, 'un tour complet ramène à 6 h');
  for (const ms of [0, 1, 199, H - 1, H, 61234, H * 16 - 1, H * 16, H * 18 - 1, H * 18, H * 24 - 1, H * 24, 987654321]) {
    const h = at(ms);
    assert(h >= 0 && h < 24, `dans [0, 24) : ${h}`);
    assertEqual(Math.floor(h), hourOfDay(s), `même heure entière que hourOfDay à ${ms} ms`);
  }
  // un état abîmé ne fait pas planter l'horloge
  assertEqual(clockHours({ awakeMs: undefined }), 6);
  assertEqual(clockHours({ awakeMs: -50 }), 6);
});

test('horloge : l\'heure affichée ne change ni l\'usure ni le sommeil', () => {
  // L'usure garde sa propre « heure de marche » de 30 s : 1 point toutes les 2 heures = 60 s.
  assertEqual([DATA.TEMPS.SECONDES_HEURE_MARCHE, DATA.USURE.HEURES_PAR_POINT, DATA.TEMPS.EVEIL_MIN_S, DATA.TEMPS.HEURE_REVEIL], [30, 2, 30, 6]);
  const s = farm();
  for (let i = 0; i < 299; i++) tick(s, 0.2);
  assertEqual(s.panneaux[0].usure, 0, '59,8 s de marche : pas encore un point');
  tick(s, 0.2);
  assertEqual(s.panneaux[0].usure, 1, '60 s de marche : 1 point, comme avant');
  // On peut dormir après 30 s d'éveil, quelle que soit l'heure (30 s = 7 h à 30 s par heure).
  const t = farm();
  t.awakeMs = 29000;
  assertEqual([hourOfDay(t), canSleep(t)], [6, false]);
  t.awakeMs = 30000;
  assertEqual([hourOfDay(t), canSleep(t)], [7, true]);
  t.awakeMs = 30000 * 20;
  assertEqual([hourOfDay(t), canSleep(t)], [2, true], 'veiller tard ne bloque rien');
  const day = t.day;
  assert(sleep(t) !== null);
  assertEqual([t.day, t.awakeMs, hourOfDay(t), clockHours(t)], [day + 1, 0, 6, 6], 'au réveil il est 6 h');
});

test('heure : 150 ticks de 0,2 s font bien une heure de jeu (flottants)', () => {
  const s = farm({ sun: false });
  for (let i = 0; i < 149; i++) tick(s, 0.2);
  assertEqual(hourOfDay(s), 6);
  assertEqual(canSleep(s), false, '29,8 s d\'éveil : trop tôt pour dormir');
  tick(s, 0.2);
  assertEqual([s.awakeMs, hourOfDay(s)], [30000, 7]);
  assertEqual(canSleep(s), true);
});

test('sleep refusé avant 30 s, puis accepté ; jour +1, éveil à 0, heure à 6 h', () => {
  const s = farm();
  s.awakeMs = 29000;
  assertEqual(canSleep(s), false);
  assertEqual(sleep(s), null);
  assertEqual(s.day, 1);
  assertEqual(s.awakeMs, 29000);
  s.awakeMs = 30000;
  assertEqual(canSleep(s), true);
  const report = sleep(s);
  assert(report !== null);
  assertEqual(s.day, 2);
  assertEqual(s.awakeMs, 0);
  assertEqual(hourOfDay(s), 6);
});

test('sleep conserve l\'énergie stockée et l\'eau (la nuit ne produit rien)', () => {
  const s = farm();
  s.batteries[0].chargeMwh = kwh(2.5);
  s.eauMl = ml(12);
  s.awakeMs = 30000;
  const before = JSON.stringify([s.panneaux, s.batteries, s.pompe]);
  const report = sleep(s);
  assertEqual(JSON.stringify([s.panneaux, s.batteries, s.pompe]), before);
  assertEqual(s.batteries[0].chargeMwh, kwh(2.5));
  assertEqual(report.energie, kwh(2.5));
  assertEqual(report.eau, ml(12));
});

test('rapport de réveil : nuit, énergie, eau, appareils à entretenir ou en panne', () => {
  const s = farm();
  s.panneaux[0].usure = 75;
  testSetWear(s, 'pompe', 100);
  s.eauMl = ml(8);
  testFillBatteries(s);
  s.awakeMs = 30000;
  const r = sleep(s);
  assertEqual(r.nuit, 2);
  assertEqual(r.energie, kwh(6));
  assertEqual(r.capacite, kwh(6));
  assertEqual(r.eau, ml(8));
  assertEqual(r.capaciteEau, ml(40));
  assertEqual(r.aEntretenir.map((d) => d.id), ['panneau-1']);
  assertEqual(r.enPanne.map((d) => d.id), ['pompe']);
  assertEqual(s.report, r);
});

test('ordre des étapes nocturnes : dans l\'ordre, avant le changement de jour', () => {
  const saved = NIGHT_STEPS.splice(0);
  try {
    const seen = [];
    NIGHT_STEPS.push((st) => seen.push(['a', st.day, st.awakeMs]));
    NIGHT_STEPS.push((st) => seen.push(['b', st.day, st.awakeMs]));
    NIGHT_STEPS.push((st) => seen.push(['c', st.day, st.awakeMs]));
    const s = farm({ sun: false });
    sleep(s); // refusé : aucune étape
    assertEqual(seen, []);
    s.awakeMs = 30000;
    sleep(s);
    assertEqual(seen, [['a', 1, 30000], ['b', 1, 30000], ['c', 1, 30000]]);
    assertEqual(s.day, 2);
  } finally {
    NIGHT_STEPS.splice(0, NIGHT_STEPS.length, ...saved);
  }
});

test('mode test : appareils au niveau 5, remplissages, usure, nuits', () => {
  const s = farm();
  for (const id of ['panneau', 'batterie', 'pompe', 'reservoir']) assert(testSetBuildingLevel5(s, id).ok, id);
  assertEqual([s.panneaux[0].niveau, s.batteries[0].niveau, s.pompe.niveau, s.reservoir.niveau], [5, 5, 5, 5]);
  assertEqual(s.pieces, 350);
  testFillBatteries(s);
  assertEqual(energyStats(s).charge, kwh(100));
  testFillTank(s);
  assertEqual(s.eauMl, ml(500));
  testSetWear(s, 'pompe', 100);
  assertEqual(isBroken(s.pompe), true);
  testSleepNights(s, 5);
  assertEqual(s.day, 6);
  assertEqual(s.awakeMs, 0);
});

test('sérialisation JSON aller-retour avec le parc et après plusieurs ticks', () => {
  const s = createInitialState(9);
  s.pieces = 5000;
  upgradeDevice(s, 'panneau-1');
  upgradeTank(s);
  s.awakeMs = awakeMsAtHour(7) - 10000; // le soleil se lève pendant ces ticks
  for (let i = 0; i < 100; i++) tick(s, 0.2);
  const copy = JSON.parse(JSON.stringify(s));
  assertEqual(copy, s);
  tick(copy, 0.2);
  tick(s, 0.2);
  assertEqual(copy, s);
});

test('formatage : pièces et puissances', () => {
  assertEqual(formatCoins(50), '50');
  assertEqual(formatCoins(87), '87');
  assertEqual(formatCoins(1234), '1 234');
  assertEqual(formatCoins(14.4), '14', 'une ancienne valeur décimale s\'affiche sans virgule');
  assertEqual(formatSigned(5), '+5');
  assertEqual(formatSigned(-20), '−20');
  assertEqual(formatSigned(0), '0');
  assertEqual(formatWh(2345678), '2 345 Wh', 'mWh → Wh, vers le bas');
  assertEqual(formatWhRate(30000), '30 Wh/s');
  assertEqual(formatWhRate(-20000, true), '−20 Wh/s');
  assertEqual(formatLitres(38999), '38 L');
  assertEqual(formatLitresRate(2000), '2 L/s');
});
