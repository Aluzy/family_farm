// fetes.js — V-4 (docs/phase-4.md) : la fête du hameau (le moteur : js/engine/fetes.js).
// - au matin, les fêtes des jours qui viennent s'annoncent (une fois par jour) ;
// - le personnage est dans le hameau pendant la fête : il y participe (amitié, un plat de fête), une fois ;
// - le calendrier marque les jours de fête (fetesParJour, js/ui/calendrier.js).
// Pas dans un monde en ligne (la ferme seule : les hameaux n'y sont pas).

import { DATA } from '../engine/catalog.js';
import { clockHours, nightActive } from '../engine/clock.js';
import { allerALaFete, fetesAVenir, fetesDuMois } from '../engine/fetes.js';
import { enLigne, state } from './store.js';
import { persistState } from './storage.js';
import { notify } from './toasts.js';
import { lieuDuPerso } from './stage.js';

const quand = (f) => { const j = f.jour - state.day; return j <= 0 ? 'ce soir' : j === 1 ? 'demain soir' : `dans ${j} jours`; };
const VUE_MS = 1000;
let vueA = 0;

// À chaque tour de la boucle : l'annonce du matin, puis la fête où est le personnage.
export function watchFetes() {
  if (enLigne || state.mondePartage || nightActive(state)) return;
  if (!state.fetes || typeof state.fetes !== 'object') state.fetes = {};
  if (state.fetes.annonce !== state.day) {
    state.fetes.annonce = state.day;
    for (const f of fetesAVenir(state)) notify(`${f.icone} ${f.nom.charAt(0).toUpperCase() + f.nom.slice(1)} ${f.aHameau} : ${quand(f)}, de ${f.debut} h à ${f.fin} h, sur la place. Tout le monde y est invité !`, { kind: 'info' });
    persistState();
  }
  const now = Date.now();
  if (now - vueA < VUE_MS) return;
  vueA = now;
  const ici = lieuDuPerso();
  if (!ici || !ici.hameau) return;
  const r = allerALaFete(state, ici.hameau, clockHours(state));
  if (!r.ok) return;
  const plat = r.cadeau && DATA.OBJETS[r.cadeau.item];
  notify(`${r.icone} Tu es à ${r.nom} ${r.deHameau} ! On t'accueille sur la place : +${r.points} d'amitié avec ${r.amis > 1 ? `ses ${r.amis} habitants` : 'son habitant'}${plat ? `, et on te donne ${plat.icone} ${plat.nom.toLowerCase()}` : ''}.`, { kind: 'info', son: 'ramasse' });
  persistState();
}

// Les jours de fête du mois du jour `day` : { [jour]: [fête] } (le calendrier).
export function fetesParJour(day = state.day) {
  const out = {};
  if (enLigne || state.mondePartage) return out;
  for (const f of fetesDuMois(state, day)) (out[f.jour] || (out[f.jour] = [])).push(f);
  return out;
}
