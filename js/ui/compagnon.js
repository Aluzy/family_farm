import { DATA } from '../engine/catalog.js';
import { DEMANDES_COMPAGNON, demanderCompagnon } from '../engine/compagnon.js';
import { aidant } from '../engine/ramassage.js';
import { asleep } from '../engine/night.js';
import { state } from './store.js';
import { persistState } from './storage.js';
import { refresh } from './render.js';
import { registerActions } from './actions.js';

/* ---------- demander de l'aide au compagnon (un appui sur lui, sur la carte) ----------
   Un appui sur le compagnon (le second adulte du foyer) : il vient à côté du personnage et demande
   « Est-ce que tu veux de l'aide ? » (Oui / Non). Oui : « Dis-moi ce que je peux faire pour toi ? », et le
   choix : ramasser les légumes mûrs (la Serre comprise), arroser, récolter les fruits des arbres, cuisiner
   (DATA.COMPAGNON.DEMANDE). Il
   répond (il s'y met, ou pourquoi il ne peut pas : js/engine/compagnon.js demanderCompagnon), puis il le
   fait sur la carte, jusqu'au bout. Les bulles sont celles de la carte (FarmStage.compagnonDit,
   js/carte/ferme/etiquettes.js) ; leurs boutons portent les actions de ce module. */

const D = () => DATA.COMPAGNON.DEMANDE;

function dit(texte, boutons, ms) {
  const S = window.FarmStage;
  return !!(S && S.compagnonDit && S.compagnonDit({ texte, boutons, ms }));
}

// La carte : le joueur a touché le compagnon.
export function compagnonTouche() {
  if (!aidant(state) || asleep(state)) return;
  dit(D().QUESTION, [
    { texte: 'Oui', action: 'compagnon-aide', data: { reponse: 'oui' } },
    { texte: 'Non', action: 'compagnon-aide', data: { reponse: 'non' } },
  ]);
}

registerActions({
  // Oui : ce qu'il peut faire ; non : il reprend sa journée.
  'compagnon-aide': (target) => {
    if (target.dataset.reponse !== 'oui') { dit(D().NON, [], 2500); return; }
    dit(D().QUOI, DEMANDES_COMPAGNON.map((quoi) => ({ texte: D().CHOIX[quoi], action: 'compagnon-demande', data: { quoi } })));
  },
  // Le choix : il s'y met (sa réponse), ou il dit pourquoi il ne peut pas.
  'compagnon-demande': (target) => {
    const r = demanderCompagnon(state, String(target.dataset.quoi || ''));
    dit(r.ok ? r.texte : r.error, [], 3500);
    if (!r.ok) return;
    persistState();
    refresh();
  },
});
