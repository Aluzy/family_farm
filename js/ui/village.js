/* ==========================================================================
   L'essai du chantier « l'île à bâtir » (docs/ile.md, fiche I0a).
   jeu.html?village=1 allume le chantier (js/engine/village.js, villageActif) pour
   une nouvelle partie faite dans cette page ; une partie d'avant déjà enregistrée,
   ouverte ainsi, passe sur l'île et devient une partie d'essai (fiche I7f :
   js/ui/storage.js, js/engine/migration-ile.js). Tant que la partie est une partie
   d'essai, un bandeau discret le dit, en bas à gauche.
   ========================================================================== */

import { allumerEssaiVillage, essaiVillage } from '../engine/village.js';

// L'adresse demande-t-elle l'essai ?
export function essaiDemande() {
  if (typeof location === 'undefined') return false;
  try { return new URLSearchParams(location.search).get('village') === '1'; } catch (e) { return false; }
}

// Une partie neuve faite dans cette page : partie d'essai si l'adresse le demande.
export function partieNeuve(s) {
  return essaiDemande() ? allumerEssaiVillage(s) : s;
}

// Le bandeau de l'essai (à chaque rafraîchissement : il ne se refait que s'il change).
export function bandeauVillage(s) {
  if (typeof document === 'undefined' || !document.body) return;
  const voulu = essaiVillage(s);
  let el = document.getElementById('village-bandeau');
  if (!voulu) { if (el) el.remove(); return; }
  if (el) return;
  el = document.createElement('div');
  el.id = 'village-bandeau';
  el.className = 'village-bandeau';
  el.setAttribute('role', 'status');
  el.title = 'Le chantier « l\'île à bâtir » est allumé pour cette partie d\'essai (docs/ile.md).';
  el.textContent = '🏝️ Essai : l\'île à bâtir';
  document.body.appendChild(el);
}
