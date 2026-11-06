/* ---------- l'écran d'accueil du jeu (avant la partie) ----------
   La grande ferme (assets/accueil_ferme.webp, la capture de la page de présentation) défile
   lentement en fond ; en haut, l'enseigne de bois (le titre, le slogan) ; en bas, deux boutons :
     - Nouvelle partie : l'écran de départ (js/ui/depart.js) ; si une partie est déjà commencée sur
       l'appareil, l'écran demande d'abord de confirmer qu'elle sera remplacée ;
     - Charger une partie : la partie enregistrée sur l'appareil (sa ligne : la famille, le jour, le
       niveau) ; sans partie enregistrée, un fichier de sauvegarde à ouvrir (comme « Importer » des
       options).
   Il s'affiche avant que la partie soit chargée (js/main.js : rien ne tourne derrière), une fois par
   ouverture du jeu : pas quand la page est rouverte par le jeu lui-même (jeu.html?… : une grotte, le
   monde en ligne ; #invitation, #connexion), ni après un rechargement dans le même onglet. */
import { migrate } from '../engine/state.js';
import { familyName, setupPending } from '../engine/depart.js';
import { levelReached } from '../engine/levels.js';
import { SAVE_KEY } from './store.js';
import { safeStorageGet } from './storage.js';

const SLOGAN = 'Construis, jardine, partage !';
const VU = 'ferme-titre-vu';          // (sessionStorage : l'écran déjà passé dans cet onglet)

// L'écran d'accueil doit-il s'afficher à ce démarrage ?
export function ecranTitreVoulu() {
  if (typeof location === 'undefined' || location.search || /invitation=|connexion=/.test(location.hash)) return false;
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

function html(partie, confirmer) {
  const charger = partie
    ? `<button type="button" class="btn titre-btn titre-charger" data-titre="charger"><span>📂 Charger une partie</span><span class="titre-info">${partie.ligne}</span></button>`
    : '<button type="button" class="btn titre-btn titre-charger" data-titre="fichier"><span>📂 Charger une partie</span><span class="titre-info">Depuis un fichier de sauvegarde</span></button>';
  const boutons = confirmer
    ? `<p class="titre-question">Ta partie en cours sera remplacée par la nouvelle. Commencer quand même ?</p>
       <button type="button" class="btn primary titre-btn" data-titre="nouvelle-oui"><span>🌱 Oui, nouvelle partie</span></button>
       <button type="button" class="btn titre-btn" data-titre="retour"><span>Non, revenir</span></button>`
    : `<button type="button" class="btn primary titre-btn" data-titre="nouvelle"><span>🌱 Nouvelle partie</span></button>${charger}`;
  return `<div class="titre-ferme" aria-hidden="true"></div>
    <div class="titre-enseigne"><h1 class="titre-nom">Ferme Familiale</h1><p class="titre-slogan">${SLOGAN}</p></div>
    <div class="titre-boutons" role="group" aria-label="Commencer">${boutons}</div>
    <p class="titre-erreur" role="alert" hidden></p>
    <input type="file" class="titre-fichier" accept=".json,application/json,text/plain" hidden>`;
}

// Affiche l'écran ; → une promesse du choix : { choix: 'charger' } (la partie de l'appareil),
// { choix: 'nouvelle' } (une nouvelle partie, à la place de celle de l'appareil s'il y en a une), ou
// { choix: 'fichier', texte } (le contenu du fichier de sauvegarde choisi, à importer).
export function ecranTitre() {
  const partie = partieEnregistree();
  const el = document.createElement('section');
  el.id = 'ecran-titre';
  el.setAttribute('aria-label', 'Ferme Familiale : accueil');
  document.body.appendChild(el);
  const dessiner = (confirmer) => {
    el.innerHTML = html(partie, confirmer);
    const b = el.querySelector('.titre-btn');
    if (b) b.focus();
  };
  dessiner(false);
  return new Promise((resolve) => {
    const fini = (r) => {
      try { sessionStorage.setItem(VU, '1'); } catch (e) { /* (rien) */ }
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
    });
    el.addEventListener('change', (e) => {
      const f = e.target.files && e.target.files[0];
      if (!f) return;
      f.text().then((texte) => fini({ choix: 'fichier', texte }), () => erreur('Ce fichier ne peut pas être lu.'));
    });
  });
}
