import { DATA } from '../engine/catalog.js';
import { escapeHtml } from '../engine/format.js';
import { chroniqueParMois, lignesEpinglees } from '../engine/chronique.js';
import { nomAffiche, nomDe } from '../engine/noms.js';

/* ---------- la chronique et les noms, le HTML (le chantier « l'île à bâtir », fiche I7g) ----------

   Ce que la fenêtre de la chronique montre (js/ui/chronique.js l'ouvre et joue ses boutons), sans rien d'autre que le
   moteur : les tests le lisent dans Node (tests/engine/village-chronique.test.mjs). Tout ce que le joueur écrit (les
   noms, ses notes) est échappé (escapeHtml). */

const CH = () => (DATA.VILLAGE && DATA.VILLAGE.CHRONIQUE) || {};

// Une ligne : son jour, son icône, son texte, la note du joueur ; 📌 l'épingler (ou la détacher), ✏️ y écrire une note.
function ligneHtml(l) {
  const n = escapeHtml(String(l.n));
  const gestes = l.resume ? '' : `<span class="chronique-gestes">
      <button type="button" class="btn small chronique-epingle${l.epingle ? ' active' : ''}" data-action="chronique-epingler" data-n="${n}" aria-pressed="${l.epingle}" title="${l.epingle ? 'Détacher' : 'Épingler'}" aria-label="${l.epingle ? 'Détacher cette ligne' : 'Épingler cette ligne'}">📌</button>
      <button type="button" class="btn small" data-action="chronique-note" data-n="${n}" title="${l.note ? 'Changer ma note' : 'Écrire une note'}" aria-label="${l.note ? 'Changer ma note' : 'Écrire une note sur cette ligne'}">✏️</button></span>`;
  const note = l.note ? `<p class="chronique-note"><span aria-hidden="true">🖋️</span> ${escapeHtml(l.note)}</p>` : '';
  return `<li class="chronique-ligne${l.epingle ? ' epinglee' : ''}${l.resume ? ' resume' : ''}" data-n="${n}">
    <span class="chronique-jour">${l.resume ? '' : `Jour ${escapeHtml(String(l.jour))}`}</span>
    <span class="chronique-texte"><span aria-hidden="true">${escapeHtml(l.icone)}</span> ${escapeHtml(l.texte)}</span>${gestes}${note}</li>`;
}

// Les noms de l'île et du village, chacun avec « ✏️ Renommer ».
export function nomsHtml(state) {
  const ile = nomDe(state, 'ile'), village = nomDe(state, 'village');
  return `<dl class="chronique-noms">
    <dt>🏝️ L'île</dt><dd><strong>${escapeHtml(ile || '—')}</strong> <button type="button" class="btn small" data-action="noms-renommer" data-quoi="ile" title="Renommer l'île" aria-label="Renommer l'île">✏️</button></dd>
    <dt>🏘️ Le village</dt><dd>${village ? `<strong>${escapeHtml(village)}</strong>` : '<span class="muted">pas encore de nom (il en prend un quand le troisième villageois s\'installe)</span>'} <button type="button" class="btn small" data-action="noms-renommer" data-quoi="village" title="${village ? 'Renommer le village' : 'Nommer le village'}" aria-label="${village ? 'Renommer le village' : 'Nommer le village'}">✏️</button></dd>
  </dl>`;
}

// La fenêtre : les noms, les lignes épinglées, puis la chronique par mois de lune (du plus récent au plus ancien).
// « de » devant un nom : « de l'Île Verte-Rive », « d'Aubépine », « de Roche-Fleuri » (échappé).
function deNom(nom) {
  if (/^[ÎI]le\b/.test(nom)) return `de l'${escapeHtml(nom)}`;
  return /^[AEIOUYÂÊÎÔÛÉÈÀaeiouy]/.test(nom) ? `d'${escapeHtml(nom)}` : `de ${escapeHtml(nom)}`;
}

export function chroniqueHtml(state) {
  const mois = chroniqueParMois(state), epingles = lignesEpinglees(state);
  const titre = nomAffiche(state);
  const corps = mois.length
    ? mois.map((m) => `<section class="chronique-mois"><h3>🌙 ${escapeHtml(m.titre)}</h3><ol class="chronique-lignes">${m.lignes.map(ligneHtml).join('')}</ol></section>`).join('')
    : '<p class="hint">Rien encore : ce qui comptera sur l\'île viendra s\'écrire ici.</p>';
  return `
    <h2 id="chronique-titre">📜 La chronique${titre ? ` ${deNom(titre)}` : ''}</h2>
    ${nomsHtml(state)}
    ${epingles.length ? `<section class="chronique-mois chronique-epinglees"><h3>📌 Épinglées</h3><ol class="chronique-lignes">${epingles.map(ligneHtml).join('')}</ol></section>` : ''}
    <div class="chronique-corps">${corps}</div>
    <div class="row"><button type="button" class="btn primary" data-action="close-modal" id="chronique-fermer">Fermer</button></div>`;
}

// Le nom de la maison du villageois `v` (sur sa fiche, js/ui/villageois.js), et « ✏️ » pour la nommer.
export function maisonNomHtml(state, v) {
  if (!v || !Number.isInteger(v.maison)) return '';
  const nom = nomDe(state, 'maison', v.maison);
  return ` · ${nom ? `<strong>${escapeHtml(nom)}</strong>` : '<span class="muted">sans nom</span>'} <button type="button" class="btn small" data-action="noms-renommer" data-quoi="maison" data-id="${v.maison}" data-retour="${escapeHtml(v.id)}" title="Nommer la maison" aria-label="Nommer la maison">✏️</button>`;
}

// Nommer l'île, le village ou une maison (`o.id` : sa boîte aux lettres ; `o.retour` : le villageois dont on revient
// à la fiche) : le champ (le nom proposé, ou celui d'aujourd'hui), « 🎲 Un autre nom », « Nommer ».
export function renommerHtml(state, quoi, valeur, rang = 0, o = {}) {
  const D = DATA.DEPART, sujet = quoi === 'ile' ? 'l\'île' : quoi === 'maison' ? 'la maison' : 'le village';
  const id = o.id !== undefined && o.id !== null ? ` data-id="${escapeHtml(String(o.id))}"` : '', retour = o.retour ? ` data-retour="${escapeHtml(o.retour)}"` : '';
  const intro = o.bapteme
    ? `Trois villageois vivent maintenant sur l'île : c'est un village ! On l'appelle <strong>${escapeHtml(valeur)}</strong>. Tu peux garder ce nom ou lui en donner un autre.`
    : `Le nouveau nom s'affiche partout (la chronique, le panneau du village) ; les lignes déjà écrites gardent le nom de leur jour.`;
  return `
    <h2 id="noms-titre">${quoi === 'ile' ? '🏝️' : quoi === 'maison' ? '🏠' : '🏘️'} Nommer ${sujet}</h2>
    <p class="muted">${intro}</p>
    <label for="noms-champ"><strong>Nom</strong> <span class="muted">(${D.NOM_MIN} à ${D.NOM_MAX} signes)</span></label>
    <input type="text" id="noms-champ" class="member-input" maxlength="${D.NOM_MAX}" autocomplete="off" spellcheck="false" value="${escapeHtml(valeur)}">
    <p class="villageois-manque" id="noms-erreur" role="alert"></p>
    <div class="row">
      <button type="button" class="btn" data-action="noms-autre" data-quoi="${escapeHtml(quoi)}" data-rang="${escapeHtml(String(rang + 1))}"${id}${retour}${o.bapteme ? ' data-bapteme="1"' : ''}>🎲 Un autre nom</button>
      <button type="button" class="btn primary" data-action="noms-ok" data-quoi="${escapeHtml(quoi)}"${id}${retour} id="noms-ok">${o.bapteme ? 'Garder ce nom' : 'Nommer'}</button>
      ${o.bapteme ? '<button type="button" class="btn" data-action="close-modal" id="noms-retour">Plus tard</button>'
    : o.retour ? `<button type="button" class="btn" data-action="villageois-fiche" data-id="${escapeHtml(o.retour)}" id="noms-retour">Retour</button>`
      : '<button type="button" class="btn" data-action="chronique-open" id="noms-retour">Retour</button>'}
    </div>`;
}

// La note du joueur sur une ligne : le champ (NOTE_MAX signes), « Écrire », « Effacer ».
export function noteHtml(state, n) {
  const l = state.chronique && Array.isArray(state.chronique.lignes) ? state.chronique.lignes.find((x) => x && x.n === Number(n)) : null;
  if (!l) return '';
  const vue = chroniqueParMois(state).flatMap((m) => m.lignes).find((x) => x.n === l.n);
  const max = Math.max(1, Number(CH().NOTE_MAX) || 140);
  return `
    <h2 id="note-titre">✏️ Ma note</h2>
    <p><span class="chronique-jour">Jour ${escapeHtml(String(l.jour))}</span> ${vue ? `${escapeHtml(vue.icone)} ${escapeHtml(vue.texte)}` : ''}</p>
    <label for="note-champ"><strong>Ce que j'en garde</strong> <span class="muted">(${max} signes au plus ; la ligne s'épingle)</span></label>
    <textarea id="note-champ" class="member-input chronique-champ" maxlength="${max}" rows="3" spellcheck="true">${escapeHtml(l.note || '')}</textarea>
    <p class="villageois-manque" id="note-erreur" role="alert"></p>
    <div class="row">
      <button type="button" class="btn primary" data-action="chronique-note-ok" data-n="${escapeHtml(String(l.n))}" id="note-ok">Écrire</button>
      ${l.note ? `<button type="button" class="btn" data-action="chronique-note-effacer" data-n="${escapeHtml(String(l.n))}">Effacer</button>` : ''}
      <button type="button" class="btn" data-action="chronique-open" id="note-retour">Retour</button>
    </div>`;
}
