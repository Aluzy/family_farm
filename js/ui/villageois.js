import { DATA } from '../engine/catalog.js';
import { escapeHtml } from '../engine/format.js';
import { farmTerrain } from '../engine/terrain.js';
import { setupPending } from '../engine/depart.js';
import { clockHours, hourOfDay, nightActive } from '../engine/clock.js';
import { villageActif } from '../engine/village.js';
import {
  accueillirVillageois, ARRIVEE, arriveeDue, arriverVillageois, ficheVillageois, nombreVillageois, prendreAvis, trouverVillageois,
  verifierMaisons, villageoisDe, villageoisPourLaCarte,
} from '../engine/villageois.js';
import { journeesPourLaCarte, lieuxDuVillage, paroleVillageois } from '../engine/villageois-journee.js';
import { solDuMonde } from './monde-sol.js';
import { persoHtml } from './famille.js';
import { plancheAvecChargement } from './apparence.js';
import { openModal } from './modal.js';
import { registerActions } from './actions.js';
import { buildMode, state } from './store.js';
import { persistState } from './storage.js';
import { refresh } from './render.js';
import { notify } from './toasts.js';

/* ---------- les villageois, côté page (le chantier « l'île à bâtir », fiche I3a) ----------

   Le moteur (js/engine/villageois.js) tient les villageois ; la scène de la carte (js/carte/ferme/villageois.js)
   fait marcher le nouveau venu du port à sa maison, frapper, dire sa ligne, puis dormir dans son lit. Ici :
     - watchVillageois (à chaque image, js/ui/loop.js, au plus une fois par seconde) : un jour de bac, à l'heure,
       le nouveau venu se met en route ; les maisons sont vérifiées (pas pendant qu'on construit : un mur repris
       puis reposé ne le met pas dehors) ; ce que le moteur a à dire devient une notification ;
     - le modèle de la carte (villageoisModele : le port, s'il est dans le plan du monde, sinon le bout du chemin) ;
     - le pont de la carte (villageoisDepuisCarte) : il a frappé (« accueilli »), un appui sur lui (« parle » : sa
       bulle, fiche I3b ; son bouton ouvre sa fiche : l'action villageois-fiche) ;
     - fiche I3b : sa journée (js/engine/villageois-journee.js : où il est à chaque heure) et l'horloge, pour que la
       scène le fasse vivre (villageoisModele, villageoisHorloge) ;
     - la carte du joueur compte les villageois (villageoisCarteHtml) ; un appui ouvre leur liste ;
     - sa fiche : prénom, maison, humeur, depuis quand il est là.
   Le chantier éteint (villageActif), rien ici ne se montre. */

const WATCH_MS = 1000;
let derniereVeille = -Infinity;

const accord = (v, f, m) => (v && v.genre === 'm' ? m : f);

// Ce que le moteur a à dire au joueur : une notification chacun (la fiche : la carte du joueur, ou un appui sur lui).
function direAvis() {
  for (const { id, quoi } of prendreAvis(state)) {
    const v = trouverVillageois(state, id);
    if (!v) continue;
    if (quoi === 'arrive') notify(`🏝️ ${v.prenom} est arrivé${accord(v, 'e', '')} par le bac et s'installe dans sa maison.`, { kind: 'info' });
    else if (quoi === 'sans_maison') notify(`🏚️ ${v.prenom} n'a plus de maison (sa boîte aux lettres, son lit ou sa pièce ont disparu) : ${accord(v, 'elle', 'il')} dort à l'abri et attend une maison libre.`, { kind: 'alerte' });
    else if (quoi === 'installe') notify(`🏠 ${v.prenom} a trouvé une maison libre et s'y installe.`, { kind: 'info' });
  }
}

// À chaque image (au plus une fois par seconde) : le nouveau venu en route, les maisons, les avis.
export function watchVillageois() {
  if (!state || !villageActif(state) || setupPending(state)) return;
  const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
  if (now - derniereVeille < WATCH_MS) return;
  derniereVeille = now;
  let change = false;
  if (!buildMode) {
    const r = verifierMaisons(state);
    change = r.perdues.length > 0 || r.installes.length > 0;
  }
  if (arriveeDue(state) && arriverVillageois(state).ok) change = true;
  // (en route depuis le matin, sans que la carte l'ait vu arriver — elle était fermée, le personnage ailleurs — : à
  // la fin de l'heure d'arrivée, il est chez lui)
  if (hourOfDay(state) >= ARRIVEE.FIN) for (const v of villageoisDe(state)) if (v.accueil === 'en_route' && accueillirVillageois(state, v.id)) change = true;
  const avis = villageoisDe(state).some((v) => Array.isArray(v.avis) && v.avis.length);
  if (avis) direAvis();
  if (change || avis) {
    persistState();
    refresh();
  }
}

// Les lieux du plan du monde (le port de la fiche I1a, s'il y est), ou null tant qu'ils ne sont pas tirés.
function lieuxDuMonde() {
  try {
    const sol = solDuMonde(farmTerrain(state));
    return sol && sol.lieux ? sol.lieux() : null;
  } catch (e) {
    return null;
  }
}

// Le modèle de la carte (js/ui/stage.js) : null le chantier éteint ou sans villageois.
// Fiche I3b : chacun porte sa journée (journee : les segments de 0 à 24 h, js/engine/villageois-journee.js).
export function villageoisModele() {
  if (!state || !villageActif(state) || !nombreVillageois(state)) return null;
  const L = villageoisPourLaCarte(state, lieuxDuMonde());
  const J = journeesPourLaCarte(state) || {};
  for (const v of L || []) v.journee = J[v.id] || null;
  return L;
}

// Fiche I3b : l'heure du jeu pour la scène des villageois : { h (0 à 24, décimales comprises), t (performance.now()
// du relevé), s (secondes réelles par heure de jeu : la scène avance l'heure entre deux modèles), nuit, chemins
// (les cases des chemins posés de la ferme : ils les préfèrent), vitesse et chemin (VILLAGE.HORAIRE) } ; null le
// chantier éteint ou sans villageois.
export function villageoisHorloge() {
  if (!state || !villageActif(state) || !nombreVillageois(state)) return null;
  return {
    h: clockHours(state), t: typeof performance !== 'undefined' ? performance.now() : 0, s: DATA.TEMPS.SECONDES_PAR_HEURE,
    nuit: nightActive(state), chemins: lieuxDuVillage(state).chemins,
    vitesse: Number(DATA.VILLAGE.HORAIRE.VITESSE) || 1, chemin: Number(DATA.VILLAGE.HORAIRE.CHEMIN) || 1,
  };
}

// Le pont de la carte : `geste` « accueilli » (il a frappé et dit sa ligne : il est chez lui, la notification),
// « fiche » (le bouton de sa bulle), « parle » (un appui sur lui, fiche I3b : sa bulle, paroleVillageois ; `o` :
// { activite (ce que la scène le voit faire), n (le rang de l'appui) }).
export function villageoisDepuisCarte(geste, id, o = {}) {
  if (geste === 'fiche') { ouvrirFicheVillageois(id); return { ok: true }; }
  if (geste === 'parle') return paroleVillageois(state, id, { ...o, heure: clockHours(state) });
  if (geste !== 'accueilli') return { ok: false };
  const v = accueillirVillageois(state, id);
  if (!v) return { ok: false };
  direAvis();
  persistState();
  // (appelé pendant l'image de la carte : la vue se refait juste après)
  setTimeout(refresh, 0);
  return { ok: true };
}

/* ---------- la carte du joueur, la liste, la fiche ---------- */

// Le compte des villageois sur la carte du joueur (sous l'argent) : '' sans eux.
export function villageoisCarteHtml() {
  if (!state || !villageActif(state)) return '';
  const n = nombreVillageois(state);
  if (!n) return '';
  const t = `${n} villageois sur l'île. Voir les villageois`;
  return `<button type="button" class="player-villageois" data-action="villageois-liste" title="${t}" aria-label="${t}"><span aria-hidden="true">🏝️</span> <span class="num">${n}</span></button>`;
}

const portrait = (f) => persoHtml(f.perso, false, '', '', f.apparence ? plancheAvecChargement(f.apparence, false) : null);
const HUMEUR_ICONE = { heureux: '😊', content: '🙂', triste: '😔', faim: '🍽️' };

function bonheurHtml(f) {
  const b = Math.round(f.bonheur), H = DATA.HABITANTS;
  return `<span class="bar" role="progressbar" aria-label="Bonheur" aria-valuemin="0" aria-valuemax="${DATA.BONHEUR.MAX}" aria-valuenow="${b}"><span class="bar-fill${b >= H.HEUREUX ? '' : b >= H.TRISTE ? ' warn' : ' bad'}" style="width:${Math.round((b / DATA.BONHEUR.MAX) * 100)}%"></span></span> <span class="num">${b}</span>`;
}

function depuisTexte(f) {
  return f.jours === 0 ? `arrivé${f.genre === 'm' ? '' : 'e'} aujourd'hui (jour ${f.depuis})` : `là depuis ${f.jours} jour${f.jours > 1 ? 's' : ''} (arrivé${f.genre === 'm' ? '' : 'e'} le jour ${f.depuis})`;
}

// La fiche du villageois `id`.
export function ouvrirFicheVillageois(id) {
  const f = ficheVillageois(state, id);
  if (!f) return;
  const repos = f.repos ? `<p class="muted">😴 Aujourd'hui, ${f.genre === 'm' ? 'il' : 'elle'} se repose (mal nourri${f.genre === 'm' ? '' : 'e'} ou sans lit la nuit dernière).</p>` : '';
  openModal(`
    <h2 id="villageois-title"><span class="villageois-portrait">${portrait(f)}</span> ${escapeHtml(f.prenom)}</h2>
    <p class="muted">Villageois${f.genre === 'm' ? '' : 'e'} de l'île, ${escapeHtml(depuisTexte(f))}.</p>
    <dl class="villageois-fiche">
      <dt>🏠 Maison</dt><dd>${escapeHtml(f.maison)}</dd>
      <dt>${HUMEUR_ICONE[f.humeur] || '🙂'} Humeur</dt><dd>${escapeHtml(f.humeurTexte)} · bonheur ${bonheurHtml(f)}</dd>
    </dl>
    ${repos}
    <button type="button" class="btn primary" data-action="close-modal" id="villageois-close">Fermer</button>`, { labelledBy: 'villageois-title', className: 'modal bois villageois-modal', focus: '#villageois-close', preventScroll: true });
}

// La liste des villageois (un appui sur le compte de la carte du joueur).
export function ouvrirListeVillageois() {
  const V = villageoisDe(state).map((v) => ficheVillageois(state, v.id)).filter(Boolean);
  const lignes = V.map((f) => `<li><button type="button" class="villageois-ligne" data-action="villageois-fiche" data-id="${escapeHtml(f.id)}">
      <span class="villageois-portrait">${portrait(f)}</span>
      <span><strong>${escapeHtml(f.prenom)}</strong> <span class="muted">${escapeHtml(f.chezLui ? (f.genre === 'm' ? 'chez lui' : 'chez elle') : 'à l\'abri, attend une maison')} · ${HUMEUR_ICONE[f.humeur] || ''} ${escapeHtml(f.humeurTexte)}</span></span></button></li>`).join('');
  openModal(`
    <h2 id="villageois-liste-title">🏝️ Les villageois</h2>
    <p class="muted">${V.length} villageois sur l'île. Un nouveau venu débarque un jour de bac s'il trouve une maison libre : une pièce close avec un lit libre et une boîte aux lettres contre sa porte.</p>
    <ul class="villageois-liste">${lignes}</ul>
    <button type="button" class="btn primary" data-action="close-modal" id="villageois-liste-close">Fermer</button>`, { labelledBy: 'villageois-liste-title', className: 'modal bois villageois-modal', focus: '#villageois-liste-close', preventScroll: true });
}

registerActions({
  'villageois-liste': () => ouvrirListeVillageois(),
  'villageois-fiche': (target) => ouvrirFicheVillageois(target.dataset.id),
});
