/* ==========================================================================
   Tests du moteur : B-2, la pousse calculable depuis l'heure (js/engine/crops.js : stadeA, finDuCycle,
   stadeGagne ; growDue s'en sert). Prérequis du monde partagé : un monde vide ne tourne pas, au retour on
   calcule. Le stade d'une plante ne dépend que de ce qu'elle garde (son stade, son heure d'arrosage) et
   de l'heure : la lune est celle du jour où son cycle s'achève, le stade de plus de la lune croissante un
   tirage fixé par la ferme, la parcelle et l'heure.
   Lancer seul : node --test tests/engine/pousse-horodatage.test.mjs (ou node tests/run-tests.mjs pousse-horodatage).
   ========================================================================== */

import {
  absoluteHours, addItem, advanceNight, allPlots, DATA, finDuCycle, hourOfDay, maxStage, moonPhase, nightActive,
  plant, stadeA, startNight, tick, waterPlot,
} from '../../js/engine/index.js';
import { assert, assertEqual, avecLune, garden, plotContent, test, tireless } from './aide.mjs';

const H_MS = DATA.TEMPS.SECONDES_PAR_HEURE * 1000;

// Avance l'horloge de la partie jusqu'à l'heure absolue `but`, par pas d'au plus `pasH` heures (Infinity :
// d'un coup, une journée ou une nuit à la fois). La journée avance par tick, la nuit par advanceNight ; à
// 22 h, la nuit commence (comme la page le fait).
function avancerJusqua(s, but, pasH) {
  for (let garde = 0; garde < 10000; garde++) {
    const now = absoluteHours(s);
    if (now >= but - 1e-9) return;
    if (!nightActive(s) && hourOfDay(s) >= DATA.TEMPS.HEURE_NUIT - 1e-9) { assert(startNight(s), 'la nuit commence'); continue; }
    const finPhase = nightActive(s)
      ? now + (DATA.TEMPS.HEURE_REVEIL + 24 - DATA.TEMPS.HEURE_NUIT) - s.nuitEnCours.ms / H_MS
      : now + (DATA.TEMPS.HEURE_NUIT - hourOfDay(s));
    const h = Math.min(pasH, but - now, finPhase - now);
    if (nightActive(s)) advanceNight(s, Math.round(h * H_MS));
    else tick(s, h * DATA.TEMPS.SECONDES_PAR_HEURE);
  }
  throw new Error('horloge bloquée');
}

// Une ferme : toutes les parcelles plantées de carottes, l'eau et l'énergie sans fin ; le jour `jour` (la
// lune qui change en chemin).
function ferme(jour) {
  const s = garden();
  tireless(s);
  s.day = jour;
  s.eauMl = 1e12;
  addItem(s, 'graine_carotte', 100);
  for (const p of allPlots(s)) assert(plant(s, p.id, 'carotte').ok, p.id);
  return s;
}

// Le programme : chaque jour, chaque parcelle pas mûre ni déjà arrosée est arrosée, à une heure qui
// lui est propre (de 7 h à 20 h).
function programme(s, jours) {
  const ev = [], d0 = s.day;
  allPlots(s).forEach((p, k) => {
    for (let j = 0; j < jours; j++) ev.push({ h: (d0 - 1 + j) * 24 + 7 + ((k * 5 + j * 3) % 13) + (k % 4) * 0.25, id: p.id });
  });
  return ev.sort((a, b) => a.h - b.h || (a.id < b.id ? -1 : 1));
}

function jouer(s, ev, pasH, finH) {
  for (const e of ev) {
    avancerJusqua(s, e.h, pasH);
    const p = allPlots(s).find((x) => x.id === e.id);
    if (p.culture && !p.arrose && p.stade < maxStage(p)) assert(waterPlot(s, p).ok, `arroser ${p.id}`);
  }
  avancerJusqua(s, finH, pasH);
  return allPlots(s).map(plotContent);
}

// Un jour où la lune passe à la nouvelle lune ou à la lune croissante le lendemain.
function jourAvantChangement() {
  for (let d = 1; d < 400; d++) {
    const a = moonPhase(d).id, b = moonPhase(d + 1).id;
    if (a !== b && (b === 'croissante' || b === 'nouvelle')) return d;
  }
  throw new Error('pas de changement de lune');
}

test('B-2 : la même partie, que l\'horloge avance d\'un coup ou heure par heure (6 jours, la vraie lune)', () => avecLune(() => {
  const d = jourAvantChangement() - 1;
  const a = ferme(d), b = ferme(d), c = ferme(d);
  const ev = programme(a, 6), fin = (d - 1 + 7) * 24 + 8;
  const d1 = jouer(a, ev, Infinity, fin), d2 = jouer(b, ev, 1, fin), d3 = jouer(c, ev, 0.37, fin);
  assertEqual(d2, d1, 'heure par heure = d\'un coup');
  assertEqual(d3, d1, 'par pas de 0,37 h = d\'un coup');
  assert(d1.some((p) => p.stade >= 2), 'des plantes ont poussé');
}));

test('B-2 : stadeA dit à l\'avance le stade qu\'une plante arrosée aura à la fin de son cycle, sans rien changer', () => avecLune(() => {
  const s = ferme(jourAvantChangement());
  s.awakeMs = (9 - DATA.TEMPS.HEURE_REVEIL) * H_MS;
  const p = allPlots(s)[0];
  assert(waterPlot(s, p).ok);
  const avant = JSON.stringify(p), fin = finDuCycle(s, p);
  assertEqual(fin, absoluteHours(s) + DATA.TEMPS.POUSSE_HEURES);
  assertEqual(stadeA(s, p, fin - 0.5), { stade: 0, arrose: true, mure: false }, 'avant la fin : elle attend');
  const prevu = stadeA(s, p, fin + 30);
  assertEqual(JSON.stringify(p), avant, 'pure : la plante n\'a pas changé');
  avancerJusqua(s, fin + 30, Infinity);
  assertEqual({ stade: p.stade, arrose: p.arrose }, { stade: prevu.stade, arrose: prevu.arrose }, 'ce qui était prévu');
  assertEqual(stadeA(s, p, fin + 1000), stadeA(s, p, fin + 30), 'un cycle à la fois : elle attend d\'être arrosée');
}));
