import { DATA } from '../engine/catalog.js';
import { escapeHtml } from '../engine/format.js';
import { asleep } from '../engine/night.js';
import { setupPending } from '../engine/depart.js';
import { collection, deNom, PLANS, plansAAnnoncer, trouverPlanBiome } from '../engine/plans.js';
import { styleDe, styleInfo } from '../engine/styles.js';
import { state } from './store.js';
import { persistState } from './storage.js';
import { refresh } from './render.js';
import { notify } from './toasts.js';

/* ---------- les plans des meubles de collection, côté page (js/engine/plans.js ; le lot 4) ----------

   - en explorant (planDuBiome, appelé par js/ui/stage.js à chaque case) : le premier passage dans un biome
     d'un pays, hors de la ferme, fait trouver un plan, annoncé sur-le-champ ;
   - au matin (watchPlans, js/ui/loop.js) : les plans offerts la nuit par un ami ;
   - l'Atelier (carnetPlansHtml) : le carnet des collections, leurs meubles trouvés ou à trouver. */

// Le personnage est sur une case du biome `biome` (`dehors` : hors de la ferme). → true s'il a trouvé un plan.
export function planDuBiome(biome, dehors) {
  const r = trouverPlanBiome(state, biome, dehors);
  if (!r) return false;
  const c = PLANS.COLLECTIONS[r.collection];
  notify(`📜 ${escapeHtml(r.phrase)} Il se fabrique désormais à l'Atelier.`, { kind: 'info', cible: { fenetre: 'atelier' } });
  if (c) persistState();
  setTimeout(refresh, 0);
  return true;
}

// À chaque image : les plans offerts par un ami (annoncés au réveil, une fois).
export function watchPlans() {
  if (!state || setupPending(state) || asleep(state)) return;
  const L = plansAAnnoncer(state);
  if (!L.length) return;
  for (const p of L) {
    const nom = DATA.ATELIER.BLOCS[p.id].nom;
    notify(p.de ? `📜 ${escapeHtml(p.de)} t'a laissé un cadeau d'ami : le plan ${escapeHtml(deNom(nom))}. Il se fabrique désormais à l'Atelier.` : `📜 Le plan ${escapeHtml(deNom(nom))} se fabrique désormais à l'Atelier.`, { kind: 'info', cible: { fenetre: 'atelier' } });
  }
  persistState();
}

// Le carnet des plans (sous l'Atelier) : chaque pays, ses meubles trouvés (leur style) ou à trouver.
export function carnetPlansHtml() {
  const lignes = Object.entries(PLANS.COLLECTIONS).map(([cid, c]) => {
    const L = collection(state, cid);
    const n = L.filter((x) => x.connu).length;
    const meubles = L.map((x) => {
      const st = styleInfo(styleDe(x.id)), o = DATA.OBJETS[x.id];
      return x.connu
        ? `<li class="plan connu"><span aria-hidden="true">${o ? o.icone : '📜'}</span> ${escapeHtml(x.nom)}${st ? ` <span class="muted" title="style ${st.nom}">${st.icone}</span>` : ''}${x.de ? ` <span class="muted">· offert par ${escapeHtml(x.de)}</span>` : ''}</li>`
        : '<li class="plan inconnu"><span aria-hidden="true">❔</span> <span class="muted">à trouver</span></li>';
    }).join('');
    return `<div class="plans-pays"><strong><span aria-hidden="true">${c.icone}</span> ${escapeHtml(c.nom[0].toUpperCase() + c.nom.slice(1))}</strong> <span class="muted num">${n}/${L.length}</span><ul class="plans-liste">${meubles}</ul></div>`;
  }).join('');
  return `
    <div class="card carnet-plans">
      <span class="card-title"><span>📜 Carnet de plans</span></span>
      <span class="muted">Chaque pays a sa collection de meubles de jardin. Explore-le (hors de la ferme) pour trouver un premier plan ; un ami « ${escapeHtml(DATA.RECIT.PALIER_NOMS[PLANS.AMI])} » d'un hameau de ce pays t'offrira le suivant.</span>
      ${lignes}
    </div>`;
}
