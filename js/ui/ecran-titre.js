/* ---------- l'écran d'accueil du jeu (avant la partie) ----------
   La grande ferme (la capture de la page de présentation, assets/accueil_ferme.webp), vivante
   (js/ui/accueil-vivant.js : le moulin tourne, les tournesols se balancent, le chat se promène…) ; en haut, l'enseigne de bois (le titre, le slogan) ; en bas, deux boutons :
     - Nouvelle partie : l'écran de départ (js/ui/depart.js) ; si une partie est déjà commencée sur
       l'appareil, l'écran demande d'abord de confirmer qu'elle sera remplacée ;
     - Charger une partie : la partie enregistrée sur l'appareil (sa ligne : la famille, le jour, le
       niveau) ; sans partie enregistrée, un fichier de sauvegarde à ouvrir (comme « Importer » des
       options).
   Il s'affiche avant que la partie soit chargée (js/main.js : rien ne tourne derrière), une fois par
   ouverture du jeu : pas quand la page est rouverte par le jeu lui-même (jeu.html?… : le
   monde en ligne ; #invitation, #connexion, #ami), ni après un rechargement dans le même onglet.
   La partie d'avant (js/ui/transfert.js) : « 🔎 Retrouver ma partie d'avant » mène à l'ancienne adresse du jeu, qui
   revient ici avec elle ; l'écran le dit, ou demande laquelle garder quand une partie est déjà commencée ici. */
import { migrate } from '../engine/state.js';
import { familyName, setupPending } from '../engine/depart.js';
import { levelReached } from '../engine/levels.js';
import { SAVE_KEY } from './store.js';
import { safeStorageGet } from './storage.js';
import { animerFerme } from './accueil-vivant.js';
import { adopterTransfert, garderIci, lienPont, pontPossible } from './transfert.js';

const SLOGAN = 'Construis, jardine, partage !';
const VU = 'ferme-titre-vu';          // (sessionStorage : l'écran déjà passé dans cet onglet)

// L'écran d'accueil doit-il s'afficher à ce démarrage ?
// (une ancienne adresse de la mine, jeu.html?carte=grotte&…, compte comme jeu.html : la mine n'est plus,
// docs/gisements.md, lot 4 ; js/ui/hote.js oublierAdresseMine)
export function ecranTitreVoulu() {
  if (typeof location === 'undefined' || /invitation=|connexion=|ami=/.test(location.hash)) return false;
  const p = new URLSearchParams(location.search);
  if (location.search && !p.get('carte') && !p.get('arrivee')) return false;
  try { return !sessionStorage.getItem(VU); } catch (e) { return true; }
}

// La partie enregistrée sur l'appareil : null, ou { commencee, ligne } (sa ligne d'information).
export function partieEnregistree(raw = safeStorageGet(SAVE_KEY)) {
  if (!raw) return null;
  try {
    const s = migrate(JSON.parse(raw));
    if (setupPending(s)) return { commencee: false, ligne: 'Une partie à peine commencée' };
    const nom = familyName(s);
    return { commencee: true, ligne: `${nom ? `Famille ${nom} · ` : ''}Jour ${s.day} · niveau ${levelReached(s)}` };
  } catch (e) {
    return { commencee: true, ligne: 'Une partie enregistrée' };
  }
}

// (le message de la partie d'avant : retrouvée, rien trouvé…)
const message = (texte) => (texte ? `<p class="titre-message" role="status">${texte}</p>` : '');
// La partie d'avant est retrouvée, une partie est déjà commencée ici : laquelle garder ?
function htmlChoix(avant, ici) {
  return `<div class="titre-enseigne"><h1 class="titre-nom"><img src="assets/logo.png" alt="Moon Bloom Village" width="90" height="45"></h1><p class="titre-slogan">${SLOGAN}</p></div>
    <div class="titre-boutons" role="group" aria-label="Ta partie d'avant">
      <p class="titre-question">Ta partie d'avant est retrouvée ! Laquelle veux-tu garder ? (l'autre reste enregistrée sur l'appareil)</p>
      <button type="button" class="btn primary titre-btn" data-titre="garder-avant"><span>📦 Ma partie d'avant</span><span class="titre-info">${avant.ligne}</span></button>
      <button type="button" class="btn titre-btn" data-titre="garder-ici"><span>🏡 Celle d'ici</span><span class="titre-info">${ici.ligne}</span></button>
    </div>`;
}

function html(partie, confirmer, info = '') {
  const charger = partie
    ? `<button type="button" class="btn titre-btn titre-charger" data-titre="charger"><span>📂 Charger une partie</span><span class="titre-info">${partie.ligne}</span></button>`
    : '<button type="button" class="btn titre-btn titre-charger" data-titre="fichier"><span>📂 Charger une partie</span><span class="titre-info">Depuis un fichier de sauvegarde</span></button>';
  const boutons = confirmer
    ? `<p class="titre-question">Ta partie en cours sera remplacée par la nouvelle. Commencer quand même ?</p>
       <button type="button" class="btn primary titre-btn" data-titre="nouvelle-oui"><span>🌱 Oui, nouvelle partie</span></button>
       <button type="button" class="btn titre-btn" data-titre="retour"><span>Non, revenir</span></button>`
    : `${message(info)}<button type="button" class="btn primary titre-btn" data-titre="nouvelle"><span>🌱 Nouvelle partie</span></button>${charger}${pontPossible() ? '<button type="button" class="btn titre-btn titre-pont" data-titre="pont"><span>🔎 Retrouver ma partie d\'avant</span><span class="titre-info">jouée à l\'ancienne adresse du jeu</span></button>' : ''}`;
  return `<div class="titre-enseigne"><h1 class="titre-nom"><img src="assets/logo.png" alt="Moon Bloom Village" width="90" height="45"></h1><p class="titre-slogan">${SLOGAN}</p></div>
    <div class="titre-boutons" role="group" aria-label="Commencer">${boutons}</div>
    <p class="titre-erreur" role="alert" hidden></p>
    <input type="file" class="titre-fichier" accept=".json,application/json,text/plain" hidden>`;
}

// Affiche l'écran ; → une promesse du choix : { choix: 'charger' } (la partie de l'appareil),
// { choix: 'nouvelle' } (une nouvelle partie, à la place de celle de l'appareil s'il y en a une), ou
// { choix: 'fichier', texte } (le contenu du fichier de sauvegarde choisi, à importer).
// `transfert` (js/ui/transfert.js lireTransfert) : la partie d'avant, revenue de l'ancienne adresse, ou rien.
export function ecranTitre(transfert = null) {
  let partie = partieEnregistree();
  let info = '';
  let choix = null;   // (la partie d'avant et celle d'ici, à départager)
  if (transfert && transfert.cles) {
    const avant = partieEnregistree(transfert.cles['ferme-save']);
    if (partie && partie.commencee && safeStorageGet(SAVE_KEY) !== transfert.cles['ferme-save']) choix = { avant, ici: partie };
    else { adopterTransfert(transfert); partie = partieEnregistree(); info = `✅ Ta partie d'avant est retrouvée ! Touche « Charger une partie ».`; }
  } else if (transfert && transfert.vide) info = 'Aucune partie trouvée à l\'ancienne adresse dans ce navigateur. Tu jouais peut-être sur un autre appareil ou un autre navigateur : ouvre le jeu là-bas et touche ce bouton.';
  else if (transfert && transfert.erreur) info = 'Ta partie d\'avant n\'a pas pu être lue. Réessaie, ou écris-nous depuis les options du jeu.';
  const el = document.createElement('section');
  el.id = 'ecran-titre';
  el.setAttribute('aria-label', 'Moon Bloom Village : accueil');
  document.body.appendChild(el);
  // la grande ferme vivante (js/ui/accueil-vivant.js), sous l'enseigne et les boutons
  const ferme = document.createElement('canvas');
  ferme.className = 'titre-ferme';
  ferme.setAttribute('aria-hidden', 'true');
  el.appendChild(ferme);
  const arreter = animerFerme(ferme);
  const contenu = document.createElement('div');
  el.appendChild(contenu);
  const dessiner = (confirmer) => {
    contenu.innerHTML = choix ? htmlChoix(choix.avant, choix.ici) : html(partie, confirmer, info);
    const b = el.querySelector('.titre-btn');
    if (b) b.focus();
  };
  dessiner(false);
  return new Promise((resolve) => {
    const fini = (r) => {
      try { sessionStorage.setItem(VU, '1'); } catch (e) { /* (rien) */ }
      arreter();
      el.remove();
      resolve(r);
    };
    const erreur = (texte) => { const p = el.querySelector('.titre-erreur'); p.textContent = texte; p.hidden = false; };
    el.addEventListener('click', (e) => {
      const b = e.target.closest('[data-titre]');
      if (!b) return;
      const quoi = b.dataset.titre;
      if (quoi === 'nouvelle') { if (partie && partie.commencee) dessiner(true); else fini({ choix: 'nouvelle' }); }
      else if (quoi === 'nouvelle-oui') fini({ choix: 'nouvelle' });
      else if (quoi === 'retour') dessiner(false);
      else if (quoi === 'charger') fini({ choix: 'charger' });
      else if (quoi === 'fichier') el.querySelector('.titre-fichier').click();
      else if (quoi === 'pont') location.href = lienPont();
      else if (quoi === 'garder-avant' || quoi === 'garder-ici') {
        if (quoi === 'garder-avant') { adopterTransfert(transfert); info = '✅ Ta partie d\'avant est reprise. Touche « Charger une partie ».'; }
        else { garderIci(transfert); info = 'Tu gardes ta partie d\'ici ; celle d\'avant reste enregistrée sur l\'appareil.'; }
        choix = null;
        partie = partieEnregistree();
        dessiner(false);
      }
    });
    el.addEventListener('change', (e) => {
      const f = e.target.files && e.target.files[0];
      if (!f) return;
      f.text().then((texte) => fini({ choix: 'fichier', texte }), () => erreur('Ce fichier ne peut pas être lu.'));
    });
  });
}
