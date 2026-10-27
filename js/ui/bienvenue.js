import { DATA } from '../engine/catalog.js';
import { farmTerrain } from '../engine/terrain.js';
import { bienvenueDe, bienvenueDonne, bienvenueDue, bienvenueEnRoute, bienvenuePose, bienvenuePrepare, deHameau } from '../engine/bienvenue.js';
import { setupPending } from '../engine/depart.js';
import { solDuMonde } from './monde-sol.js';
import { state } from './store.js';
import { persistState } from './storage.js';
import { refresh } from './render.js';
import { notify } from './toasts.js';

/* ---------- la visite de bienvenue, côté page (fiche 18) ----------

   Le moteur (js/engine/bienvenue.js) tient la visite ; la scène de la carte (js/carte/ferme/visite.js)
   fait venir le visiteur à la porte, l'y fait attendre, parler et repartir. Ici :
     - watchBienvenue (à chaque image, js/ui/loop.js) : le visiteur est tiré dès que les plans des
       hameaux sont là (le hameau le plus proche de la ferme), et se met en route à l'heure dite ;
     - le pont de la carte (visiteDepuisCarte) : le plat donné de sa main, posé devant la porte (le
       personnage n'est pas venu), ou trouvé devant la porte au retour ; une notification chaque fois. */

// À chaque image : rien tant que la famille n'est pas installée ; puis le visiteur tiré (une fois) et,
// le jour venu, en route.
export function watchBienvenue() {
  if (!state || setupPending(state)) return;
  const b = bienvenueDe(state);
  if (!b || b.etat === 'faite') return;
  if (!b.qui) {
    const sol = solDuMonde(farmTerrain(state)), plans = sol && sol.hameaux ? sol.hameaux() : null;
    // (les plans du monde ne sont pas encore là : on attend, sauf le jour même, où un voisin vient)
    if (!plans && !bienvenueDue(state)) return;
    bienvenuePrepare(state, plans);
    persistState();
  }
  if (bienvenueDue(state)) {
    bienvenueEnRoute(state);
    persistState();
    refresh();
  }
}

// « Benoît, de Brume-Haute » (ou « Benoît, votre voisin »).
function quiTexte(q) {
  if (!q) return 'Un voisin';
  return `${q.prenom}, ${q.hameau ? deHameau(q.hameau) : DATA.BIENVENUE.VOISIN[q.genre === 'm' ? 'm' : 'f']}`;
}

const platTexte = (id) => { const d = DATA.OBJETS[id] || { nom: id, icone: '' }; return `${d.icone} ${d.nom}`; };

// Le pont de la carte : `geste` « donne » (il donne le plat de sa main), « pose » (personne n'est
// venu : le plat attend devant la porte), « retour » (le personnage trouve le plat devant la porte).
// → le résultat du moteur.
export function visiteDepuisCarte(geste) {
  let r;
  if (geste === 'pose') {
    r = bienvenuePose(state);
    if (r.ok) notify(`🚪 ${quiTexte(r.qui)}, est venu${r.qui && r.qui.genre === 'f' ? 'e' : ''} te souhaiter la bienvenue, mais personne n'a ouvert : un plat t'attend devant la porte.`, { kind: 'info' });
  } else {
    r = bienvenueDonne(state);
    if (r.ok && r.remis === 'main') notify(`🎁 Bienvenue ! ${quiTexte(r.qui)}, t'a apporté ${platTexte(r.plat)} : +1 dans l'inventaire.`, { kind: 'info', cible: { fenetre: 'inventaire' } });
    else if (r.ok) notify(`🎁 Devant la porte, un plat t'attendait, laissé par ${quiTexte(r.qui)} : ${platTexte(r.plat)}, +1 dans l'inventaire.`, { kind: 'info', cible: { fenetre: 'inventaire' } });
  }
  if (r.ok) {
    persistState();
    // (appelé pendant l'image de la carte : la vue se refait juste après)
    setTimeout(refresh, 0);
  }
  return r;
}
