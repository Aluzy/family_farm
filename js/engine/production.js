/* ==========================================================================
   Ce que la ferme productive garde de ses jours (le chantier « l'île à bâtir », docs/ile.md, fiche I8b ; les
   réglages : data/village.json PRODUCTION, VOCATIONS.production).

   state.production (né au premier besoin, le chantier allumé ; productionDe) = {
     ventes ({ jour: pièces } : la valeur de ce qui a été vendu au port ce jour-là, au prix de vente : la valeur
       exportée ; noterExport, appelé par bac.js noterVenteBac, que toute vente au port appelle),
     energie ({ jour: Wh } : l'énergie que la ferme a produite ce jour-là, notée la nuit : productionNuit),
     contrats ({ tire, proposes, acceptes, honores, primes, avis } : les contrats d'export, js/engine/contrats.js) }.
   Les jours gardés : les LUNE.JOURS_MOIS derniers (un mois de lune) ; ce qui est plus vieux s'efface.
   Le chantier éteint (villageActif), rien ici ne se lit ni ne s'écrit.
   ========================================================================== */

import { DATA } from './catalog.js';
import { villageActif } from './village.js';
import { sellPrice } from './market.js';

const objet = (v) => !!v && typeof v === 'object' && !Array.isArray(v);
const jourDe = (state) => Math.max(1, Math.floor(Number(state && state.day) || 1));
// Les jours d'un mois de lune (la fenêtre des causes du score : la valeur exportée, l'énergie produite).
export const joursDuMois = () => Math.max(1, Math.floor(Number(DATA.LUNE && DATA.LUNE.JOURS_MOIS) || 14));

// Le quai de chargement posé sur la ferme (sa case, celle de gauche), ou null.
export function quaiDeChargement(state) {
  if (!villageActif(state)) return null;
  for (const [k, sorte] of Object.entries((state && state.blocs) || {})) if (sorte === 'quai_chargement') return Number(k);
  return null;
}

// Les contrats d'une partie neuve (ou réparés).
export function nouveauxContrats(passe = 0) {
  return { tire: passe, proposes: [], acceptes: [], honores: 0, primes: 0, avis: [] };
}

// Ce que la ferme productive garde (créé s'il manque), ou null le chantier éteint.
export function productionDe(state) {
  if (!villageActif(state)) return null;
  if (!objet(state.production) || !objet(state.production.ventes) || !objet(state.production.energie) || !objet(state.production.contrats)) {
    state.production = reparerProduction(state.production, state.port && Number.isInteger(state.port.passe) ? state.port.passe : 0);
  }
  return state.production;
}

// Les jours plus vieux qu'un mois de lune s'effacent.
function elaguer(o, jour) {
  const depuis = jour - joursDuMois() + 1;
  for (const k of Object.keys(o)) if (Number(k) < depuis) delete o[k];
}

// Une vente au port (bac.js noterVenteBac) : sa valeur, au prix de vente, est exportée.
export function noterExport(state, item, n) {
  const P = productionDe(state);
  if (!P || !(n > 0) || !DATA.OBJETS[item]) return;
  const j = jourDe(state);
  P.ventes[j] = (P.ventes[j] || 0) + Math.floor(n) * Math.max(0, Math.round(sellPrice(item, state)));
  elaguer(P.ventes, j);
}

// La somme d'un relevé sur le mois de lune qui finit aujourd'hui.
function duMois(o, jour) {
  const depuis = jour - joursDuMois() + 1;
  return Object.entries(o || {}).reduce((t, [k, v]) => (Number(k) >= depuis && Number(k) <= jour ? t + (Number(v) || 0) : t), 0);
}

// La valeur exportée sur le mois de lune (pièces, un entier).
export function exporteDuMois(state) {
  const P = villageActif(state) && objet(state.production) ? state.production : null;
  return P ? Math.round(duMois(P.ventes, jourDe(state))) : 0;
}

// L'énergie produite sur le mois de lune (Wh, un entier) : les jours notés, et aujourd'hui jusqu'ici.
export function energieDuMois(state) {
  const P = villageActif(state) && objet(state.production) ? state.production : null;
  if (!P) return 0;
  const j = jourDe(state), auj = P.energie[j] === undefined ? Math.floor((Number(state.jour && state.jour.produite) || 0) / 1000) : 0;
  return Math.round(duMois(P.energie, j) + auj);
}

// La nuit (runNight, avant que la journée ne soit remise à zéro) : l'énergie produite aujourd'hui est notée.
// → { energie (Wh), exporte (pièces, aujourd'hui) } ou null éteint.
export function productionNuit(state) {
  const P = productionDe(state);
  if (!P) return null;
  const j = jourDe(state);
  P.energie[j] = Math.floor((Number(state.jour && state.jour.produite) || 0) / 1000);
  elaguer(P.energie, j);
  elaguer(P.ventes, j);
  return { energie: P.energie[j], exporte: P.ventes[j] || 0 };
}

// Un contrat d'une sauvegarde : lisible, ou null.
function reparerContrat(c, accepte) {
  if (!objet(c) || typeof c.objet !== 'string' || !DATA.OBJETS[c.objet] || !Number.isInteger(c.quantite) || c.quantite <= 0) return null;
  const out = {
    id: typeof c.id === 'string' ? c.id : `k${Number.isInteger(c.jour) ? c.jour : 0}-${c.objet}`, objet: c.objet, quantite: c.quantite,
    prime: Number.isInteger(c.prime) ? Math.max(0, c.prime) : 0, jour: Number.isInteger(c.jour) ? c.jour : 0, fin: Number.isInteger(c.fin) ? c.fin : 0,
  };
  if (accepte) out.livre = Number.isInteger(c.livre) ? Math.max(0, Math.min(c.quantite, c.livre)) : 0;
  return out;
}

// Ce que garde la ferme productive d'une sauvegarde (la migration v92 → v93, et productionDe) : ce qui se lit est gardé.
export function reparerProduction(p, passe = 0) {
  const o = objet(p) ? p : {};
  const releve = (x) => {
    const out = {};
    if (objet(x)) for (const [k, v] of Object.entries(x)) if (Number.isInteger(Number(k)) && Number.isFinite(v) && v >= 0) out[k] = Math.round(v);
    return out;
  };
  const c = objet(o.contrats) ? o.contrats : {};
  const contrats = {
    ...nouveauxContrats(Number.isInteger(c.tire) && c.tire >= 0 ? c.tire : passe),
    proposes: (Array.isArray(c.proposes) ? c.proposes : []).map((x) => reparerContrat(x, false)).filter(Boolean),
    acceptes: (Array.isArray(c.acceptes) ? c.acceptes : []).map((x) => reparerContrat(x, true)).filter(Boolean),
    honores: Number.isInteger(c.honores) && c.honores >= 0 ? c.honores : 0,
    primes: Number.isInteger(c.primes) && c.primes >= 0 ? c.primes : 0,
  };
  return { ventes: releve(o.ventes), energie: releve(o.energie), contrats };
}
