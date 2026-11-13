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
import { echangeVillageois, liensPourLaCarte } from '../engine/villageois-liens.js';
import {
  attribuer, donnerOutil, marquerAVendre, outilsDesTaches, quiFaitQuoi, reprendreOutil, tacheDef, tacheManque, tachesDuPoste, tachesPour,
  travailPourLaCarte,
} from '../engine/taches.js';
import { hasTool, toolDef } from '../engine/outils.js';
import { inventoryCounts } from '../engine/inventory.js';
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
     - sa fiche : prénom, maison, humeur, depuis quand il est là ;
     - I3c (les tâches, js/engine/taches.js) : sur sa fiche, sa tâche (ce qu'il a fait aujourd'hui, ce qui lui manque),
       le bouton « Tâche » (la liste : celles qu'il peut faire, ce qui manque), son outil (« Donner », « Reprendre »),
       et pour la navette ce qu'il porte au port (« à vendre ») ; la liste des villageois dit qui fait quoi ; un appui
       long sur un poste de la carte (un arbre, un rocher, l'étang, le poulailler) : « confier à… » (ouvrirConfier) ; le modèle
       de la carte porte sa journée de travail (travail : la scène, js/carte/ferme/villageois-travail.js).
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
  const J = journeesPourLaCarte(state) || {}, Tr = travailPourLaCarte(state) || {};
  for (const v of L || []) { v.journee = J[v.id] || null; v.travail = Tr[v.id] || null; }
  return L;
}

// Fiche I3b : l'heure du jeu pour la scène des villageois : { h (0 à 24, décimales comprises), t (performance.now()
// du relevé), s (secondes réelles par heure de jeu : la scène avance l'heure entre deux modèles), nuit, chemins
// (les cases des chemins posés de la ferme : ils les préfèrent), vitesse et chemin (VILLAGE.HORAIRE), liens (I3b+ :
// qui se connaît, villageois-liens.js liensPourLaCarte) et social (VILLAGE.SOCIAL.CROISE, les réglages de la scène :
// js/carte/ferme/villageois-social.js) } ; null le chantier éteint ou sans villageois.
export function villageoisHorloge() {
  if (!state || !villageActif(state) || !nombreVillageois(state)) return null;
  return {
    h: clockHours(state), t: typeof performance !== 'undefined' ? performance.now() : 0, s: DATA.TEMPS.SECONDES_PAR_HEURE,
    nuit: nightActive(state), chemins: lieuxDuVillage(state).chemins,
    vitesse: Number(DATA.VILLAGE.HORAIRE.VITESSE) || 1, chemin: Number(DATA.VILLAGE.HORAIRE.CHEMIN) || 1,
    liens: liensPourLaCarte(state), social: { ...((DATA.VILLAGE.SOCIAL || {}).CROISE || {}), CAUSE: (DATA.TACHES || {}).CAUSE || 26 },
  };
}

// Le pont de la carte : `geste` « accueilli » (il a frappé et dit sa ligne : il est chez lui, la notification),
// « fiche » (le bouton de sa bulle), « parle » (un appui sur lui, fiche I3b : sa bulle, paroleVillageois ; `o` :
// { activite (ce que la scène le voit faire), n (le rang de l'appui), but (I3b+ : le but de sa sortie) }) ; « echange »
// (I3b+ : deux villageois se croisent, causent ; `o` : { avec (l'autre, ou 'joueur'), n, sorte } : echangeVillageois).
export function villageoisDepuisCarte(geste, id, o = {}) {
  if (geste === 'fiche') { ouvrirFicheVillageois(id); return { ok: true }; }
  // (I3c : un appui long sur un poste de travail, `o.case` : « confier à… »)
  if (geste === 'poste') return ouvrirConfier(o.case);
  if (geste === 'parle') return paroleVillageois(state, id, { ...o, heure: clockHours(state) });
  if (geste === 'echange') return echangeVillageois(state, id, o.avec, { n: o.n, sorte: o.sorte, heure: clockHours(state) });
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

/* ---------- I3c : les tâches ---------- */

const icone = (o) => (DATA.OBJETS[o] ? DATA.OBJETS[o].icone : o === 'pieces' ? '💰' : '');
const produitTexte = (p) => Object.entries(p || {}).filter(([, n]) => n > 0).map(([o, n]) => `${n} ${icone(o)}`).join(' ');
const ETATS_TACHE = { travail: '🔨 au travail', attend: '⏳ attend', repos: '😴 au repos', libre: '— sans tâche' };
const ilElle = (v) => (v.genre === 'm' ? 'il' : 'elle');

// Ce que dit la fiche de sa tâche : la tâche, où il en est aujourd'hui, ce qui lui manque, son outil.
function tacheHtml(id) {
  const q = quiFaitQuoi(state).find((x) => x.id === id);
  if (!q) return '';
  const v = trouverVillageois(state, id), il = ilElle(v), e = escapeHtml(id);
  const def = tacheDef(q.tache);
  const etat = !def ? `<span class="muted">Pas de tâche : ${il} vit sa journée sur l'île.</span>`
    : q.etat === 'repos' ? `${def.icone} ${escapeHtml(def.nom)} · <span class="muted">${il} se repose aujourd'hui.</span>`
    : q.etat === 'attend' ? `${def.icone} ${escapeHtml(def.nom)} · <span class="villageois-manque">⏳ ${escapeHtml(q.raison)}</span>`
    : `${def.icone} ${escapeHtml(def.nom)} · ${q.actions} / ${q.sur} aujourd'hui${produitTexte(q.produit) ? ` : ${produitTexte(q.produit)}` : ''}`;
  const T = (o) => toolDef(o), mon = (o) => (T(o).ARTICLE === 'un' ? 'mon' : 'ma');
  const outil = v.outil ? `${T(v.outil).ICONE} ${escapeHtml(T(v.outil).NOM)} <button type="button" class="btn small" data-action="villageois-reprendre" data-id="${e}">Reprendre</button>`
    : '<span class="muted">aucun</span>';
  const donner = outilsDesTaches().filter((o) => o !== v.outil && hasTool(state, o))
    .map((o) => `<button type="button" class="btn small" data-action="villageois-donner" data-id="${e}" data-outil="${o}">${T(o).ICONE} Donner ${mon(o)} ${escapeHtml(T(o).NOM.toLowerCase())}</button>`).join(' ');
  const liste = (v.vendre || []).filter((o) => DATA.OBJETS[o]);
  const vendre = q.tache === 'navette' ? `<dt>⚓ À vendre</dt><dd>${liste.length ? liste.map((o) => `${icone(o)} ${escapeHtml(DATA.OBJETS[o].nom)}`).join(', ') : '<span class="muted">rien</span>'} <button type="button" class="btn small" data-action="villageois-vendre" data-id="${e}">Choisir</button></dd>` : '';
  return `<dt>🧺 Tâche</dt><dd>${etat} <button type="button" class="btn small" data-action="villageois-taches" data-id="${e}" id="villageois-tache">Tâche</button></dd>
      <dt>🧰 Outil</dt><dd>${outil}${donner ? ` <span class="villageois-outils">${donner}</span>` : ''}</dd>${vendre}`;
}

// La liste des tâches pour le villageois `id` : celles qu'il peut faire, ce qui manque aux autres.
export function ouvrirTachesVillageois(id) {
  const v = trouverVillageois(state, id);
  if (!v) return;
  const L = tachesPour(state, id), e = escapeHtml(id), il = ilElle(v);
  const ligne = (t) => `<li><button type="button" class="villageois-ligne villageois-tache${t.choisie ? ' choisie' : ''}" data-action="villageois-attribuer" data-id="${e}" data-tache="${t.id}" aria-pressed="${t.choisie}">
      <span class="villageois-tache-icone" aria-hidden="true">${t.icone}</span>
      <span><strong>${escapeHtml(t.nom)}</strong>${t.choisie ? ' ✓' : ''} <span class="muted">${t.actions} par jour${t.prise.length ? ` · avec ${escapeHtml(t.prise.join(', '))}` : ''}</span>
      ${t.manque ? `<span class="villageois-manque">⏳ ${escapeHtml(t.manque)}</span>` : ''}</span></button></li>`;
  const prets = L.filter((t) => !t.manque), autres = L.filter((t) => t.manque);
  openModal(`
    <h2 id="villageois-taches-title">🧺 Une tâche pour ${escapeHtml(v.prenom)}</h2>
    <p class="muted">Chaque jour, ${il} va à son poste le matin et l'après-midi, avec une pause et les repas avec les autres ; ce qu'${il} produit va au coffre de la ferme.</p>
    ${prets.length ? `<h3>Ce qu'${il} peut faire</h3><ul class="villageois-liste">${prets.map(ligne).join('')}</ul>` : ''}
    ${autres.length ? `<h3>Ce qui manque</h3><ul class="villageois-liste">${autres.map(ligne).join('')}</ul>` : ''}
    <div class="row"><button type="button" class="btn" data-action="villageois-attribuer" data-id="${e}" data-tache="">Pas de tâche</button>
    <button type="button" class="btn primary" data-action="villageois-fiche" data-id="${e}" id="villageois-taches-close">Retour</button></div>`, { labelledBy: 'villageois-taches-title', className: 'modal bois villageois-modal', focus: '#villageois-taches-close', preventScroll: true });
}

// La navette : ce qu'il porte au port (ce que l'inventaire a qui se vend).
function ouvrirAVendre(id) {
  const v = trouverVillageois(state, id);
  if (!v) return;
  const marque = new Set(v.vendre || []);
  const objets = Object.keys(inventoryCounts(state)).filter((o) => DATA.OBJETS[o] && DATA.OBJETS[o].prix > 0 && !DATA.OBJETS[o].village)
    .concat([...marque]).filter((o, k, l) => DATA.OBJETS[o] && l.indexOf(o) === k);
  const cases = objets.map((o) => `<label class="villageois-vendre"><input type="checkbox" name="vendre" value="${o}"${marque.has(o) ? ' checked' : ''}> ${icone(o)} ${escapeHtml(DATA.OBJETS[o].nom)}</label>`).join('');
  openModal(`
    <h2 id="villageois-vendre-title">⚓ Ce que ${escapeHtml(v.prenom)} porte au port</h2>
    <p class="muted">Coche ce qui est « à vendre » : à chaque aller-retour, ${ilElle(v)} en porte ${tacheDef('navette').PORTEE} au comptoir ; l'argent est pour toi.</p>
    <form class="villageois-vendre-liste" id="villageois-vendre-form">${cases || '<p class="muted">L\'inventaire n\'a rien qui se vende.</p>'}</form>
    <button type="button" class="btn primary" data-action="villageois-vendre-ok" data-id="${escapeHtml(id)}" id="villageois-vendre-ok">C'est noté</button>`, { labelledBy: 'villageois-vendre-title', className: 'modal bois villageois-modal', focus: '#villageois-vendre-ok', preventScroll: true });
}

// Un appui long sur la case `t` de la carte : les tâches qui s'y font, « confier à… » un villageois. → { ok } (rien à
// confier ici : { ok: false }, l'appui reste un appui).
export function ouvrirConfier(t) {
  const ids = tachesDuPoste(state, t), V = villageoisDe(state);
  if (!ids.length || !V.length) return { ok: false };
  const Q = new Map(quiFaitQuoi(state).map((q) => [q.id, q]));
  const blocs = ids.map((tid) => {
    const def = tacheDef(tid);
    const lignes = V.map((v) => {
      const q = Q.get(v.id), manque = tacheManque(state, v, tid);
      return `<li><button type="button" class="villageois-ligne" data-action="villageois-attribuer" data-id="${escapeHtml(v.id)}" data-tache="${tid}" aria-pressed="${v.tache === tid}">
        <span><strong>${escapeHtml(v.prenom)}</strong>${v.tache === tid ? ' ✓' : ''} <span class="muted">${q && q.tache ? `${q.icone} ${escapeHtml(q.nom)}` : ETATS_TACHE.libre}</span>
        ${manque ? `<span class="villageois-manque">⏳ ${escapeHtml(manque)}</span>` : ''}</span></button></li>`;
    }).join('');
    return `<h3>${def.icone} ${escapeHtml(def.nom)}</h3><ul class="villageois-liste">${lignes}</ul>`;
  }).join('');
  openModal(`
    <h2 id="villageois-confier-title">🧺 Confier à…</h2>
    <p class="muted">Le villageois choisi y travaillera chaque jour, le matin et l'après-midi.</p>
    ${blocs}
    <button type="button" class="btn primary" data-action="close-modal" id="villageois-confier-close">Fermer</button>`, { labelledBy: 'villageois-confier-title', className: 'modal bois villageois-modal', focus: '#villageois-confier-close', preventScroll: true });
  return { ok: true };
}

// Après un geste sur la fiche : la notification, la partie enregistrée, la fiche de nouveau.
function apres(r, id, texte) {
  if (!r.ok) { notify(r.error, { kind: 'alerte' }); return false; }
  if (texte) notify(texte, { kind: 'info' });
  persistState();
  refresh();
  ouvrirFicheVillageois(id);
  return true;
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
      ${tacheHtml(id)}
    </dl>
    ${repos}
    <button type="button" class="btn primary" data-action="close-modal" id="villageois-close">Fermer</button>`, { labelledBy: 'villageois-title', className: 'modal bois villageois-modal', focus: '#villageois-close', preventScroll: true });
}

// La liste des villageois (un appui sur le compte de la carte du joueur).
export function ouvrirListeVillageois() {
  const V = villageoisDe(state).map((v) => ficheVillageois(state, v.id)).filter(Boolean);
  // (I3c : qui fait quoi, sur chaque ligne)
  const Q = new Map(quiFaitQuoi(state).map((q) => [q.id, q]));
  const fait = (q) => (!q || !q.tache ? `<span class="villageois-qui muted">${ETATS_TACHE.libre}</span>`
    : `<span class="villageois-qui">${q.icone} ${escapeHtml(q.nom)} · ${q.etat === 'travail' ? `${q.actions} / ${q.sur}${produitTexte(q.produit) ? ` : ${produitTexte(q.produit)}` : ''}` : escapeHtml(ETATS_TACHE[q.etat])}</span>`);
  const lignes = V.map((f) => `<li><button type="button" class="villageois-ligne" data-action="villageois-fiche" data-id="${escapeHtml(f.id)}">
      <span class="villageois-portrait">${portrait(f)}</span>
      <span><strong>${escapeHtml(f.prenom)}</strong> <span class="muted">${escapeHtml(f.chezLui ? (f.genre === 'm' ? 'chez lui' : 'chez elle') : 'à l\'abri, attend une maison')} · ${HUMEUR_ICONE[f.humeur] || ''} ${escapeHtml(f.humeurTexte)}</span>
      ${fait(Q.get(f.id))}</span></button></li>`).join('');
  openModal(`
    <h2 id="villageois-liste-title">🏝️ Les villageois : qui fait quoi</h2>
    <p class="muted">${V.length} villageois sur l'île. Un nouveau venu débarque un jour de bac s'il trouve une maison libre : une pièce close avec un lit libre et une boîte aux lettres contre sa porte.</p>
    <ul class="villageois-liste">${lignes}</ul>
    <button type="button" class="btn primary" data-action="close-modal" id="villageois-liste-close">Fermer</button>`, { labelledBy: 'villageois-liste-title', className: 'modal bois villageois-modal', focus: '#villageois-liste-close', preventScroll: true });
}

registerActions({
  'villageois-liste': () => ouvrirListeVillageois(),
  'villageois-fiche': (target) => ouvrirFicheVillageois(target.dataset.id),
  // I3c : les tâches et les outils
  'villageois-taches': (target) => ouvrirTachesVillageois(target.dataset.id),
  'villageois-attribuer': (target) => {
    const id = target.dataset.id, t = target.dataset.tache || null, v = trouverVillageois(state, id);
    if (!v) return;
    const r = attribuer(state, id, t), def = tacheDef(t);
    const texte = !r.ok ? '' : def ? `${def.icone} ${v.prenom} : ${def.nom.toLowerCase()}${r.manque ? ` (${r.manque})` : ', dès son prochain créneau de travail.'}` : `${v.prenom} n'a plus de tâche.`;
    if (apres(r, id, texte) && t === 'navette' && !(v.vendre || []).length) ouvrirAVendre(id);
  },
  'villageois-donner': (target) => {
    const id = target.dataset.id, o = target.dataset.outil, v = trouverVillageois(state, id), d = toolDef(o);
    if (!v || !d) return;
    apres(donnerOutil(state, id, o), id, `${d.ICONE} ${v.prenom} a ${d.ARTICLE === 'un' ? 'ton' : 'ta'} ${d.NOM.toLowerCase()} : ${ilElle(v)} ${d.ARTICLE === 'un' ? 'le' : 'la'} garde.`);
  },
  'villageois-reprendre': (target) => {
    const id = target.dataset.id, v = trouverVillageois(state, id), d = v && v.outil ? toolDef(v.outil) : null;
    if (!d) return;
    apres(reprendreOutil(state, id), id, `${d.ICONE} Tu as repris ${d.ARTICLE === 'un' ? 'le' : 'la'} ${d.NOM.toLowerCase()} de ${v.prenom}.`);
  },
  'villageois-vendre': (target) => ouvrirAVendre(target.dataset.id),
  'villageois-vendre-ok': (target) => {
    const id = target.dataset.id, f = document.getElementById('villageois-vendre-form');
    const objets = f ? [...f.querySelectorAll('input[name="vendre"]:checked')].map((i) => i.value) : [];
    apres(marquerAVendre(state, id, objets), id, '');
  },
});
