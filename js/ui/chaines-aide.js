/* ---------- les chaînes de production : le mode d'emploi et le diagnostic ----------
   - ouvrirModeEmploi() : la fiche « Assembler une chaîne » : la rangée des blocs dans l'ordre (leurs dessins de
     la carte), les règles, puis chaque recette (la suite de ses outils → son produit ; à débloquer : grisée, un
     cadenas). Ouverte par le bouton de l'onglet Machines de l'Atelier (js/ui/atelier.js), la fiche de À propos
     (js/ui/aide.js) et la fenêtre du diagnostic ;
   - ouvrirDiagnosticChaine(tile) : « Chaîne de production » : la rangée telle qu'elle est posée (la place d'un bloc
     qui manque : un « ? » rouge ; la case du bout), puis chaque règle, tenue (✓) ou non (✗), et ce qu'elle tirera
     de courant (js/engine/chaines.js diagnosticChaine). La carte l'ouvre quand on touche une chaîne qui n'est pas
     prête, ou une machine posée seule (js/farm-stage.js, le pont chaineAide : js/ui/stage.js). */

import { DATA } from '../engine/catalog.js';
import { diagnosticChaine } from '../engine/chaines.js';
import { recipeUnlocked } from '../engine/kitchen.js';
import { state } from './store.js';
import { openModal } from './modal.js';
import { registerActions } from './actions.js';
import { iconeBloc } from './icone-bloc.js';
import { formatNumber } from '../engine/format.js';

const nomBloc = (s) => DATA.ATELIER.BLOCS[s].nom;
const NOMS_ROLE = { entonnoir: 'Entonnoir', reservoir: 'Réservoir', outil: 'Outil', convoyeur: 'Convoyeur' };

// Une case de la rangée : le dessin du bloc et son nom ; `manque` : un « ? » rouge ; `vide` : la case du bout.
function caseRangee({ sorte, nom, manque, bout, libre }) {
  if (manque) return `<div class="chaine-case manque"><span class="chaine-vide" aria-hidden="true">?</span><small>${NOMS_ROLE[manque]}</small></div>`;
  if (bout) return `<div class="chaine-case bout${libre === false ? ' manque' : ''}"><span class="chaine-vide" aria-hidden="true">${libre === false ? '✗' : '⬇'}</span><small>Case libre</small></div>`;
  return `<div class="chaine-case"><span class="chaine-dessin" aria-hidden="true">${iconeBloc(sorte)}</span><small>${nom || nomBloc(sorte)}</small></div>`;
}
const rangeeHtml = (cases, label) => `<div class="chaine-rangee" role="img" aria-label="${label}">${cases.map(caseRangee).join('')}</div>`;

// Chaque recette des chaînes : ses outils → son produit ; à débloquer : grisée, avec un cadenas.
function recettesHtml() {
  return Object.entries(DATA.CHAINES.RECETTES).map(([id, suite]) => {
    const R = DATA.RECETTES[id], ok = recipeUnlocked(state, id);
    const ing = R.ingredients.map((g) => `${formatNumber(g.qte)} ${(g.ou || [g.item]).map((it) => DATA.OBJETS[it].nom.toLowerCase()).join(' ou ')}`).join(' + ');
    const outils = suite.map((s) => `<span class="chaine-mini" title="${nomBloc(s)}">${iconeBloc(s)}</span>`).join('');
    return `<li class="chaine-recette${ok ? '' : ' verrou'}" aria-label="${R.nom} : ${suite.map((s) => nomBloc(s).toLowerCase()).join(' puis ')}, avec ${ing}${ok ? '' : ' (à débloquer)'}">
      <span class="chaine-outils" aria-hidden="true">${outils}</span><span class="chaine-fleche" aria-hidden="true">→</span>
      <span class="chaine-produit" aria-hidden="true">${R.icone}</span>
      <span class="chaine-recette-txt" aria-hidden="true"><span>${R.nom}</span><small>${ing}</small></span>
      ${ok ? '' : '<span class="chaine-cadenas" aria-hidden="true">🔒</span>'}</li>`;
  }).join('');
}

export function modeEmploiHtml() {
  const C = DATA.CHAINES;
  const exemple = [{ sorte: 'entonnoir' }, { sorte: 'reservoir' }, { sorte: 'mixeur' }, { sorte: 'pressoir' }, { sorte: 'convoyeur' }, { bout: true }];
  return `
    <div class="help-head"><span class="help-emoji" aria-hidden="true">${C.ICONE}</span><h2 id="chaine-aide-titre">Assembler une chaîne</h2></div>
    <p>Pose les blocs <strong>côte à côte, sur une même rangée, de gauche à droite</strong> :</p>
    ${rangeeHtml(exemple, 'Exemple : entonnoir, réservoir, mixeur, presse, convoyeur, puis une case libre')}
    <ol class="chaine-regles">
      <li><strong>Entonnoir</strong> : on y jette les ingrédients.</li>
      <li><strong>Réservoir</strong> (facultatif) : il garde jusqu'à ${formatNumber(C.RESERVOIR)} ingrédients ; sans lui, la chaîne en prend de quoi faire une seule fois la recette.</li>
      <li><strong>Outils</strong> : leur suite, dans l'ordre, fait le produit (les recettes, plus bas).</li>
      <li><strong>Convoyeur</strong> : au moins un, juste après le dernier outil.</li>
      <li><strong>Case libre</strong> au bout : les produits y tombent, en tas (${formatNumber(C.TAS)} au plus : ramasse-les en marchant dessus).</li>
    </ol>
    <p class="chaine-astuce">⚡ Les outils tirent du courant (le panneau, les batteries) pendant qu'ils tournent. Touche la chaîne : ton personnage jette dans l'entonnoir ce qu'il a. Elle se pose dehors, dans la maison ou dans une pièce à elle (pas dans la Serre, le Poulailler, l'Étable, le Silo ni le Moulin).</p>
    <h3>Les recettes</h3>
    <ul class="chaine-recettes">${recettesHtml()}</ul>
    <button type="button" class="btn primary" data-action="close-modal" id="chaine-aide-fermer">Fermer</button>`;
}

export function ouvrirModeEmploi() {
  // (le focus sur la fenêtre elle-même : elle s'ouvre en haut, sur la rangée, et non sur « Fermer » tout en bas)
  openModal(modeEmploiHtml(), { labelledBy: 'chaine-aide-titre', preventScroll: true });
}

export function diagnosticHtml(tile) {
  const d = diagnosticChaine(state, tile);
  if (!d) return null;
  const cases = d.rangee.map((c) => (c.manque ? { manque: c.manque } : { sorte: c.sorte }));
  if (d.bout) cases.push({ bout: true, libre: d.bout.libre });
  const etapes = d.etapes.map((e) => `<li class="${e.ok ? 'ok' : 'ko'}"><span aria-hidden="true">${e.ok ? '✓' : '✗'}</span> ${e.texte}</li>`).join('');
  const courant = d.whParS ? `<li class="info"><span aria-hidden="true">⚡</span> ${formatNumber(d.whParS)} Wh/s pendant qu'elle tourne</li>` : '';
  return `
    <div class="help-head"><span class="help-emoji" aria-hidden="true">${DATA.CHAINES.ICONE}</span><h2 id="chaine-diag-titre">${DATA.CHAINES.NOM}</h2></div>
    <p>${d.ok ? 'Ta chaîne est prête : touche-la pour y verser tes ingrédients.' : 'Ta chaîne, telle qu\'elle est posée :'}</p>
    ${rangeeHtml(cases, `La chaîne posée : ${cases.map((c) => (c.manque ? `il manque : ${NOMS_ROLE[c.manque].toLowerCase()}` : c.bout ? 'la case du bout' : nomBloc(c.sorte).toLowerCase())).join(', ')}`)}
    <ul class="chaine-diag">${etapes}${courant}</ul>
    <div class="chaine-boutons">
      <button type="button" class="btn" data-action="chaine-mode-emploi">📖 Mode d'emploi</button>
      <button type="button" class="btn primary" data-action="close-modal" id="chaine-diag-fermer">Fermer</button>
    </div>`;
}

// La fenêtre du diagnostic de la chaîne dont `tile` est un bloc (false : pas un bloc de chaîne).
export function ouvrirDiagnosticChaine(tile) {
  const html = diagnosticHtml(Number(tile));
  if (!html) return false;
  openModal(html, { labelledBy: 'chaine-diag-titre', focus: '#chaine-diag-fermer' });
  return true;
}

registerActions({
  'chaine-mode-emploi': () => ouvrirModeEmploi(),
});
