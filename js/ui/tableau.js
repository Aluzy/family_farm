import { DATA } from '../engine/catalog.js';
import { escapeHtml, formatDay, formatNumber, formatSigned } from '../engine/format.js';
import { villageActif } from '../engine/village.js';
import { nombreVillageois } from '../engine/villageois.js';
import { COLONNES, tableauVillage } from '../engine/tableau.js';
import { tacheDef } from '../engine/taches.js';
import { persoHtml } from './famille.js';
import { plancheAvecChargement } from './apparence.js';
import { openModal } from './modal.js';
import { registerActions } from './actions.js';
import { state } from './store.js';
import { tel } from './consent.js';

/* ---------- le tableau des villageois, côté page (le chantier « l'île à bâtir », fiche I3d) ----------

   Le calcul est dans js/engine/tableau.js ; ici, la fenêtre :
     - le bouton 📊 sur la carte du joueur, à côté des pièces, quand il y a un villageois (tableauCarteHtml) ;
     - une ligne par villageois (portrait, prénom, tâche, coût, produit, solde, humeur), triable par colonne (un appui
       sur l'en-tête : le sens par défaut de la colonne, un second appui l'inverse) ; deux périodes (hier, 7 jours) ;
       le total du village ; sous une ligne, ce qui lui manque aujourd'hui (« sans outil », « en repos : pas assez à
       manger ») ; sur un téléphone, la tâche et l'humeur se replient dans la cellule du prénom (css/jeu.css) ;
     - un appui sur une ligne : le détail, jour par jour, de ses sept derniers jours.
   Des repères, pas des reproches (B-1) : un solde négatif s'écrit comme un autre, sans couleur d'alarme. Le tri et la
   période choisis restent le temps de la page. Le chantier éteint, rien ne se montre. */

const vue = { periode: 'semaine', colonne: 'solde', sens: 0 };

const HUMEUR = { heureux: ['😊', 'heureux', 'heureuse'], content: ['🙂', 'content', 'contente'], triste: ['😔', 'un peu triste', 'un peu triste'], faim: ['🍽️', 'a eu faim', 'a eu faim'] };
const humeurDe = (l) => HUMEUR[l.humeur] || HUMEUR.content;
const humeurTexte = (l) => humeurDe(l)[l.genre === 'm' ? 1 : 2];
const icone = (o) => (o === 'pieces' ? '💰' : DATA.OBJETS[o] ? DATA.OBJETS[o].icone : '');
const nom = (o) => (o === 'pieces' ? 'pièces' : DATA.OBJETS[o] ? DATA.OBJETS[o].nom.toLowerCase() : o);
const pieces = (n) => `${formatNumber(n)} 🪙`;
const portrait = (l) => `<span class="tableau-portrait" aria-hidden="true">${persoHtml(l.perso, false, '', '', l.apparence ? plancheAvecChargement(l.apparence, false) : null)}</span>`;
// (une liste d'objets courte : « 12 🌾 5 🍓 » ; `max` au plus, puis « … »)
const objetsCourt = (l, max = 4) => l.slice(0, max).map((x) => `${formatNumber(x.n)} ${icone(x.objet)}`).join(' ') + (l.length > max ? ' …' : '');
const objetsLong = (m) => Object.entries(m).map(([o, n]) => `${formatNumber(n)} ${icone(o)} ${escapeHtml(nom(o))}`).join(', ');

// Le bouton de la carte du joueur (à côté des pièces) : '' sans villageois, ou le chantier éteint.
export function tableauCarteHtml() {
  if (!state || !villageActif(state) || !nombreVillageois(state)) return '';
  const t = 'Le tableau des villageois : ce que chacun coûte et produit';
  return `<button type="button" class="player-tableau" data-action="tableau-ouvrir" title="${t}" aria-label="${t}"><span aria-hidden="true">📊</span></button>`;
}

// Les colonnes : [clé, texte, classes, texte court (un téléphone)].
const ENTETES = [
  ['prenom', 'Villageois', 't-qui', 'Qui'], ['tache', 'Tâche', 't-tache t-second'], ['cout', 'Coût', 't-num'],
  ['produit', 'Produit', 't-num', 'Prod.'], ['solde', 'Solde', 't-num'], ['humeur', 'Humeur', 't-humeur t-second'],
];

// Le sens où la colonne est triée (1 croissant, −1 décroissant).
const sensDe = (c) => (vue.sens === 1 || vue.sens === -1 ? vue.sens : COLONNES[c]);

function enteteHtml() {
  return ENTETES.map(([c, texte, cls, court]) => {
    const trie = vue.colonne === c, s = sensDe(c);
    const aria = trie ? ` aria-sort="${s === 1 ? 'ascending' : 'descending'}"` : '';
    const t = court ? `<span class="t-long">${texte}</span><span class="t-court" aria-hidden="true">${court}</span>` : texte;
    return `<th scope="col" class="${cls}"${aria}><button type="button" class="tableau-tri" data-action="tableau-tri" data-colonne="${c}" id="tableau-tri-${c}" aria-label="Trier par ${texte.toLowerCase()}">${t}${trie ? `<span aria-hidden="true">${s === 1 ? '▲' : '▼'}</span>` : ''}</button></th>`;
  }).join('');
}

function ligneHtml(l) {
  const H = humeurDe(l), def = tacheDef(l.tache);
  const tache = def ? `${def.icone} ${escapeHtml(def.nom)}` : '<span class="muted">sans tâche</span>';
  const prod = l.produit.length ? `<span class="tableau-objets">${objetsCourt(l.produit)}</span>` : '';
  const id = escapeHtml(l.id);
  return `<tr class="tableau-ligne">
      <th scope="row" class="t-qui"><button type="button" class="tableau-qui" data-action="tableau-detail" data-id="${id}" title="Ses sept derniers jours, jour par jour">
        ${portrait(l)}<span class="tableau-nom">${escapeHtml(l.prenom)}<span class="t-mini" aria-hidden="true">${def ? def.icone : '—'} ${H[0]}</span></span></button></th>
      <td class="t-tache t-second">${tache}${prod}</td>
      <td class="t-num">${formatNumber(l.cout)}</td>
      <td class="t-num">${formatNumber(l.valeur)}</td>
      <td class="t-num t-solde">${formatSigned(l.solde)}</td>
      <td class="t-humeur t-second"><span title="${escapeHtml(humeurTexte(l))}">${H[0]}</span></td>
    </tr>${l.manque ? `<tr class="tableau-manque"><td colspan="6">${escapeHtml(l.prenom)} : ${escapeHtml(l.manque)}</td></tr>` : ''}`;
}

function tableauHtml(T) {
  const P = T.periode === 'hier' ? `Hier (jour ${T.au}, ${formatDay(T.au)})` : `Les sept derniers jours (du jour ${T.du} au jour ${T.au})`;
  const t = T.total;
  const periode = (p, texte) => `<button type="button" class="tableau-periode${T.periode === p ? ' actif' : ''}" data-action="tableau-periode" data-periode="${p}" aria-pressed="${T.periode === p}" id="tableau-periode-${p}">${texte}</button>`;
  return `
    <h2 id="tableau-title">📊 Le tableau des villageois</h2>
    <div class="tableau-periodes" role="group" aria-label="Période">${periode('hier', 'Hier')}${periode('semaine', '7 jours')}</div>
    <p class="muted tableau-dates">${P}, en pièces au prix du port.</p>
    <div class="tableau-cadre">
      <table class="tableau-village">
        <thead><tr>${enteteHtml()}</tr></thead>
        <tbody>${T.lignes.map(ligneHtml).join('')}</tbody>
        <tfoot><tr>
          <th scope="row" class="t-qui">🏝️ Le village</th>
          <td class="t-tache t-second">${t.produit.length ? `<span class="tableau-objets">${objetsCourt(t.produit, 6)}</span>` : ''}</td>
          <td class="t-num">${formatNumber(t.cout)}</td>
          <td class="t-num">${formatNumber(t.valeur)}</td>
          <td class="t-num t-solde">${formatSigned(t.solde)}</td>
          <td class="t-humeur t-second"></td>
        </tr></tfoot>
      </table>
    </div>
    <p class="muted tableau-aide">Le coût : ce qu'il a mangé à la boîte et ce que son travail a pris au coffre (les légumes d'un plat, la graine
      ressemée) ; le produit : ce que son travail a rapporté. Le solde est un repère pour choisir qui fait quoi${t.ventes ? ` ; la tournée du port a vendu pour ${pieces(t.ventes)} ce que la ferme avait déjà` : ''}. Un appui sur un prénom : ses sept jours.</p>
    <button type="button" class="btn primary" data-action="close-modal" id="tableau-close">Fermer</button>`;
}

// Le tableau (la période et le tri choisis). `focus` : ce qui prend le focus (l'en-tête qu'on vient d'appuyer).
export function ouvrirTableau(focus = '#tableau-close') {
  const T = tableauVillage(state, vue.periode, { colonne: vue.colonne, sens: vue.sens });
  if (!T) return;
  tel('modal', 'tableau');
  openModal(tableauHtml(T), { labelledBy: 'tableau-title', className: 'modal bois tableau-modal', focus, preventScroll: true });
}

/* ---------- le détail d'un villageois : ses sept jours ---------- */

function jourHtml(j) {
  const def = tacheDef(j.tache);
  const quoi = j.repos ? '😴 au repos : son repas, aucun produit'
    : def ? `${def.icone} ${escapeHtml(def.nom)} · ${j.actions} / ${j.sur} action${j.sur > 1 ? 's' : ''}` : '<span class="muted">sans tâche</span>';
  const mange = Object.keys(j.mange).length ? `${objetsLong(j.mange)} · ${pieces(j.repas)}` : 'rien';
  const pris = Object.keys(j.utilise).length ? `<li>🧺 Pris au coffre : ${objetsLong(j.utilise)} · ${pieces(j.matieres)}</li>` : '';
  const part = j.part ? `<li>👛 Sa part : ${pieces(j.part)}</li>` : '';
  const prod = j.produit.length ? `${j.produit.map((x) => `${formatNumber(x.n)} ${icone(x.objet)} ${escapeHtml(nom(x.objet))}`).join(', ')} · ${pieces(j.valeur)}` : 'rien';
  return `<li class="tableau-jour">
      <div class="tableau-jour-tete"><strong>Jour ${j.jour}</strong> <span class="muted">${formatDay(j.jour)}</span> <span class="tableau-jour-solde">solde ${formatSigned(j.solde)}</span></div>
      <div>${quoi}</div>
      <ul><li>🍽️ Mangé : ${mange}</li>${pris}${part}<li>📦 Produit : ${prod}</li></ul>
    </li>`;
}

export function ouvrirDetail(id) {
  const T = tableauVillage(state, 'semaine');
  const l = T && T.lignes.find((x) => x.id === id);
  if (!l) return;
  const def = tacheDef(l.tache), il = l.genre === 'm' ? 'il' : 'elle';
  const rend = l.rendement === null ? '<span class="muted">pas encore de jour de travail sur la semaine</span>'
    : `${l.rendement} % de la moyenne des tâches du village <span class="muted">(${pieces(T.moyenne.moyenne)} par jour de travail)</span>`;
  const jours = l.jours.length ? [...l.jours].reverse().map(jourHtml).join('')
    : `<li class="muted">Pas encore de journée finie : ${il} est là depuis aujourd'hui.</li>`;
  const manque = l.jours.length < 7 && l.jours.length ? `<p class="muted">${l.jours.length} jour${l.jours.length > 1 ? 's' : ''} : ${il} est sur l'île depuis le jour ${l.jours[0].jour}.</p>` : '';
  tel('modal', 'tableau-detail');
  openModal(`
    <h2 id="tableau-detail-title">${portrait(l)} ${escapeHtml(l.prenom)} : ses sept jours</h2>
    <p class="muted">${def ? `${def.icone} ${escapeHtml(def.nom)}` : 'Sans tâche'} · ${humeurDe(l)[0]} ${escapeHtml(humeurTexte(l))}${l.manque ? ` · ${escapeHtml(l.manque)}` : ''}</p>
    <dl class="tableau-resume">
      <dt>Coût</dt><dd>${pieces(l.cout)} <span class="muted">(repas ${formatNumber(l.repas)}${l.matieres ? `, pris au coffre ${formatNumber(l.matieres)}` : ''}${l.part ? `, sa part ${formatNumber(l.part)}` : ''})</span></dd>
      <dt>Produit</dt><dd>${pieces(l.valeur)}${l.produit.length ? ` <span class="muted">(${objetsCourt(l.produit, 8)})</span>` : ''}</dd>
      <dt>Solde</dt><dd>${formatSigned(l.solde)} 🪙</dd>
      <dt>Rendement</dt><dd>${rend}</dd>
    </dl>
    ${manque}
    <ol class="tableau-jours">${jours}</ol>
    <div class="row"><button type="button" class="btn" data-action="villageois-fiche" data-id="${escapeHtml(l.id)}">📋 Sa fiche</button>
    <button type="button" class="btn primary" data-action="tableau-ouvrir" id="tableau-detail-retour">Le tableau</button></div>`,
  { labelledBy: 'tableau-detail-title', className: 'modal bois tableau-modal', focus: '#tableau-detail-retour', preventScroll: true });
}

registerActions({
  'tableau-ouvrir': () => ouvrirTableau(),
  'tableau-periode': (target) => {
    vue.periode = target.dataset.periode === 'hier' ? 'hier' : 'semaine';
    ouvrirTableau(`#tableau-periode-${vue.periode}`);
  },
  'tableau-tri': (target) => {
    const c = target.dataset.colonne;
    if (!COLONNES[c]) return;
    vue.sens = vue.colonne === c ? -sensDe(c) : 0;
    vue.colonne = c;
    ouvrirTableau(`#tableau-tri-${c}`);
  },
  'tableau-detail': (target) => ouvrirDetail(target.dataset.id),
});
