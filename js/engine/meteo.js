/* ---------- G-1 : le temps qu'il fait (docs/phase-4.md ; data/meteo.json) ----------
   Chaque jour a son temps, tiré de la graine de la ferme et du jour (la même partie, le même ciel ; rien
   n'est gardé, sauf la pluie déjà tombée sur les cultures) : clair, une averse (de `debut` à `fin` h), ou la
   brume du matin (jusqu'à BRUME_FIN h). La carte le montre (la pluie, la brume : js/carte/ferme/meteo.js), le
   son l'entend (js/son.js), les habitants en parlent (propos.js).

   La pluie arrose : pendant l'averse, les cultures de la ferme qui ne le sont pas encore le sont (pas la Serre,
   qui est couverte), sans eau ni énergie (pluieSurLaFerme, à chaque pas de l'horloge : energy.js).
   state.meteo = { jour, arrosees, cases } : ce que la pluie du jour a arrosé (combien, et les cases : la carte
   n'en fait pas un geste du personnage, js/ui/stage.js autoDone). */

import { DATA } from './catalog.js';
import { mulberry32 } from './base.js';
import { hache } from './ferme-generee.js';
import { farmSeed } from './terrain.js';
import { monthName } from './lune.js';
import { absoluteHours, hourOfDay } from './clock.js';
import { isMature } from './crops.js';

const M = () => DATA.METEO;

// Le temps du jour `day` : { sorte: 'clair' | 'pluie' | 'brume', debut?, fin? (h), nom }.
export function meteoDuJour(state, day = state.day) {
  const d = Math.max(1, Math.floor(Number(day) || 1));
  const nom = (sorte) => M().NOMS[sorte] || sorte;
  if (d < M().DEPUIS) return { sorte: 'clair', nom: nom('clair') };
  const rnd = mulberry32(hache(`${farmSeed(state)}:meteo:${d}`));
  const x = rnd();
  const pluie = M().PAR_MOIS[monthName(d)] ?? M().CHANCES.pluie;
  if (x < pluie) {
    const [h0, h1] = M().PLUIE_HEURES, [d0, d1] = M().PLUIE_DUREE;
    const debut = h0 + Math.floor(rnd() * (h1 - h0 + 1));
    const fin = Math.min(22, debut + d0 + Math.floor(rnd() * (d1 - d0 + 1)));
    return { sorte: 'pluie', debut, fin, nom: nom('pluie') };
  }
  if (x < pluie + M().CHANCES.brume) return { sorte: 'brume', fin: M().BRUME_FIN, nom: nom('brume') };
  return { sorte: 'clair', nom: nom('clair') };
}

// Pleut-il à l'heure `heure` (0 à 24, fractions comprises) du jour ?
export function pleut(state, heure = hourOfDay(state)) {
  const m = meteoDuJour(state);
  return m.sorte === 'pluie' && heure >= m.debut && heure < m.fin;
}

// La brume à l'heure `heure` : 0 (aucune) à 1 (épaisse au lever), qui se lève jusqu'à BRUME_FIN.
export function brume(state, heure = hourOfDay(state)) {
  const m = meteoDuJour(state);
  if (m.sorte !== 'brume' || heure >= m.fin) return 0;
  const lever = DATA.TEMPS.HEURE_REVEIL;
  return heure <= lever ? 1 : Math.max(0, 1 - (heure - lever) / (m.fin - lever));
}

// Pendant l'averse : les cultures de la ferme (pas la Serre) qui ne sont pas arrosées le sont (aussi celles
// semées sous la pluie), sans eau ni énergie. Renvoie combien à ce pas ; state.meteo = { jour, arrosees, cases }
// compte celles du jour (l'annonce : js/ui/meteo.js) et garde leurs cases (la pluie les a arrosées, pas le
// personnage : js/ui/stage.js autoDone).
export function pluieSurLaFerme(state) {
  if (!pleut(state)) return 0;
  let n = 0, h = null;
  const cases = [];
  for (const p of (state.potager && state.potager.parcelles) || []) {
    if (!p.culture || p.arrose || isMature(p)) continue;
    if (h === null) h = absoluteHours(state);
    p.arrose = true;
    p.arroseH = h;
    n += 1;
    if (Number.isInteger(p.case)) cases.push(p.case);
  }
  if (n) {
    if (!state.meteo || typeof state.meteo !== 'object' || state.meteo.jour !== state.day) state.meteo = { jour: state.day, arrosees: 0 };
    state.meteo.arrosees += n;
    state.meteo.cases = (Array.isArray(state.meteo.cases) ? state.meteo.cases : []).concat(cases);
  }
  return n;
}

// Les cases que la pluie du jour a arrosées.
export function arroseesParLaPluie(state) {
  const m = state.meteo;
  return m && typeof m === 'object' && m.jour === state.day && Array.isArray(m.cases) ? m.cases : [];
}
