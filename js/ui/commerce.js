import { DATA } from '../engine/catalog.js';
import { escapeHtml, formatCoins, formatDay } from '../engine/format.js';
import { villageActif } from '../engine/village.js';
import { setupPending } from '../engine/depart.js';
import { asleep } from '../engine/night.js';
import { countItem } from '../engine/inventory.js';
import { trouverVillageois } from '../engine/villageois.js';
import {
  commerceDuVillageois, commercesOuverts, commercesPourLaFiche, defCommerce, etatCommerce, nomCommerce, prendreAvisCommerces, recettesDe,
} from '../engine/artisans.js';
import { nomRefus, proposerNom, renommer } from '../engine/noms.js';
import { commerceEnPhrase } from '../engine/noms.js';
import { couleursEnseigne } from '../engine/vocation-village.js';
import { state } from './store.js';
import { persistState } from './storage.js';
import { refresh } from './render.js';
import { notify } from './toasts.js';
import { applyResult } from './game-actions.js';
import { executer } from './commandes.js';
import { registerActions } from './actions.js';
import { openStageWindow } from './stage-windows.js';
import { closeModal } from './modal.js';

/* ---------- les commerces d'artisans, côté page (le chantier « l'île à bâtir », fiche I5a) ----------
   Le moteur : js/engine/artisans.js. Ici :
     - la fenêtre du commerce (un appui sur son établi, son comptoir ou son enseigne : BLOCS_CARTE.fenetres ; la fiche
       de l'artisan, « Le commerce ») : son nom (le nommer), ce qu'il fait aujourd'hui, ce qu'il a en vente (l'acheter),
       lui commander une pièce (payée d'avance, ou à façon : tu apportes la matière), ses commandes en attente, sa bourse,
       sa semaine ; un onglet par commerce ouvert ;
     - sur la fiche du villageois (js/ui/villageois.js) : son envie d'un commerce, ce qui manque (les trois conditions),
       le bouton qui décide l'ouverture ; l'artisan, son commerce ;
     - watchCommerces (à chaque image, js/ui/loop.js) : une vente au comptoir, une commande livrée (une notification) ;
       au réveil, une envie née, une pièce apprise. */

const OBJ = (o) => DATA.OBJETS[o];
const nomObjet = (o) => (OBJ(o) ? `${OBJ(o).icone} ${escapeHtml(OBJ(o).nom.toLowerCase())}` : escapeHtml(o));
// (dans une notification : du texte, toasts.js l'écrit tel quel)
const nomTexte = (o) => (OBJ(o) ? `${OBJ(o).icone} ${OBJ(o).nom.toLowerCase()}` : o);
const liste = (o) => Object.entries(o || {}).filter(([, n]) => n > 0).map(([x, n]) => `${n} ${OBJ(x) ? OBJ(x).icone : x}`).join(' ');
const ilElle = (v) => (v && v.genre === 'm' ? 'il' : 'elle');
let ongletCommerce = null;
let rangNom = 0;

/* -- la fenêtre du commerce -- */

// Peut-on ouvrir la fenêtre ? (un commerce ouvert)
export function commerceFenetreOk() {
  return villageActif(state) && commercesOuverts(state).length > 0;
}

function commerceVu() {
  const L = commercesOuverts(state);
  return L.find((c) => c.id === ongletCommerce) || L[0] || null;
}

export function renderCommerceOnglets() {
  const L = commercesOuverts(state);
  if (L.length < 2) return '';
  const vu = commerceVu();
  return `<div class="subtabs" role="tablist">${L.map((c) => `<button type="button" class="subtab${c === vu ? ' active' : ''}" role="tab" aria-selected="${c === vu}" data-action="commerce-onglet" data-commerce="${escapeHtml(c.id)}">${defCommerce(c.sorte).icone} ${escapeHtml(nomCommerce(state, c))}</button>`).join('')}</div>`;
}

export function renderCommerce() {
  const c = commerceVu();
  if (!c) return '<p class="muted">Aucun commerce n\'est ouvert.</p>';
  const E = etatCommerce(state, c.id), v = E.artisan, il = ilElle(v), e = escapeHtml(c.id);
  const J = E.aujourdhui, A = (DATA.ARTISANS || {});
  const anc = Math.max(1, Number(A.ANCIENNETE) || 20), jours = Math.max(0, Number(c.jours) || 0);
  const prochain = E.lots.du < (Number(A.LOTS_MAX) || E.lots.du) ? ` · un lot de plus dans ${anc - (jours % anc)} jour${anc - (jours % anc) > 1 ? 's' : ''} de travail` : ' · le plus de lots qu\'un artisan fasse';
  const local = E.local && E.local.complet ? '' : `<p class="villageois-manque">⏳ ${escapeHtml(E.def.SANS)}</p>`;
  const fait = liste(J.fait), achete = liste(J.achete);
  const ventes = J.ventes.joueur + J.ventes.villageois + J.ventes.bac;
  const aujourdhui = `<ul class="commerce-jour">
      <li>🔨 ${E.lots.faits} / ${E.lots.du} lot${E.lots.du > 1 ? 's' : ''}${fait ? ` : ${fait}` : ''}</li>
      <li>🧺 Acheté au coffre de la ferme : ${achete ? `${achete} <span class="muted">(+${formatCoins(J.paye)} 💰 pour toi)</span>` : '<span class="muted">rien encore</span>'}</li>
      <li>🏪 Vendu : ${ventes ? `${formatCoins(ventes)} 💰 <span class="muted">(toi ${formatCoins(J.ventes.joueur)}, les villageois ${formatCoins(J.ventes.villageois)}, le bac ${formatCoins(J.ventes.bac)})</span>` : '<span class="muted">rien encore</span>'}${J.facon ? ` · façon ${formatCoins(J.facon)} 💰` : ''}</li>
    </ul>`;
  const bouton = (action, attrs, texte, ok, titre = '') => `<button type="button" class="btn small" data-action="${action}" data-commerce="${e}" ${attrs}${ok ? '' : ' disabled'}${titre ? ` title="${escapeHtml(titre)}"` : ''}>${texte}</button>`;
  const vente = E.enVente.length
    ? `<ul class="boite-liste">${E.enVente.map((x) => `<li class="boite-ligne"><span class="item-icon" aria-hidden="true">${OBJ(x.objet).icone}</span>
        <span class="boite-nom">${escapeHtml(OBJ(x.objet).nom)} <span class="muted">(${formatCoins(x.prix)} 💰)</span></span><span class="num">${x.n}</span>
        <span class="row">${bouton('commerce-acheter', `data-item="${x.objet}" data-n="1"`, 'Acheter', state.pieces >= x.prix)}</span></li>`).join('')}</ul>`
    : '<p class="muted">Rien en vente pour l\'instant : il garnit son comptoir au fil de ses lots.</p>';
  const recettes = `<ul class="boite-liste commerce-recettes">${E.recettes.map((r) => {
    const entrees = Object.entries(r.entrees).map(([o, n]) => `${n} ${OBJ(o) ? OBJ(o).icone : o}`).join(' + ');
    const peut = Object.entries(r.entrees).every(([o, n]) => countItem(state, o) >= n);
    // (I5c : sur commande seulement, ses nuits de cave ; un meuble que la maison a déjà en assez)
    const notes = [r.commande ? 'sur commande' : '', r.cave ? `${r.cave} nuits en cave` : ''].filter(Boolean).join(', ');
    const refus = r.refus ? `<br><span class="muted">🏠 ${escapeHtml(r.refus)}</span>` : '';
    return `<li class="boite-ligne${r.connue ? '' : ' muted'}"><span class="item-icon" aria-hidden="true">${OBJ(r.sortie).icone}</span>
      <span class="boite-nom">${r.qte > 1 ? `${r.qte} × ` : ''}${escapeHtml(OBJ(r.sortie).nom)} <span class="muted">(${entrees}${notes ? ` · ${notes}` : ''})</span>${r.connue ? refus : `<br><span class="muted">📖 Il l'apprendra quand votre amitié sera « ${escapeHtml(r.palierNom)} ».</span>`}</span>
      <span class="row">${r.connue ? bouton('commerce-commander', `data-recette="${r.id}"`, `Commander · ${formatCoins(r.prix)} 💰`, !r.refus && state.pieces >= r.prix, r.refus || '')
        + bouton('commerce-commander', `data-recette="${r.id}" data-facon="1"`, `À façon · ${formatCoins(r.facon)} 💰`, !r.refus && peut && state.pieces >= r.facon, peut ? r.refus || '' : `Tu apportes la matière : ${entrees}`) : ''}</span></li>`;
  }).join('')}</ul>`;
  // (I5c : la cave du fromager, ce qui s'y affine et quand il en sortira)
  const cave = E.caveMax ? `<p>🕯️ En cave (${E.cave.reduce((t, x) => t + x.n, 0)} / ${E.caveMax}) : ${E.cave.length ? E.cave.map((x) => `${x.n > 1 ? `${x.n} × ` : ''}${nomObjet(x.objet)} <span class="muted">(${x.reste ? `prête dans ${x.reste} nuit${x.reste > 1 ? 's' : ''}` : 'prête cette nuit'}${x.pour === 'joueur' ? ', pour toi' : ''})</span>`).join(', ') : '<span class="muted">vide : il y met une tomme quand il a des faisselles</span>'}.</p>` : '';
  const commandes = E.commandes.length
    ? `<p>⏳ En attente : ${E.commandes.map((k) => `${nomObjet(E.recettes.find((r) => r.id === k.recette).sortie)} <span class="muted">(${k.facon ? 'à façon' : 'payée'}, ${formatDay(k.jour)})</span>`).join(', ')} : ${il} les fait avant le reste, et tu les retrouves dans ton inventaire.</p>`
    : '';
  const B = E.bilan;
  const semaine = B.lots ? `<p class="muted">Ces 7 jours : ${B.lots} lots (${liste(B.fait)}) · payé à la ferme ${formatCoins(B.paye)} 💰 · vendu ${formatCoins(B.total)} 💰.</p>` : '';
  const nom = E.nom;
  return `
    <div class="cards">
      <div class="card">
        <span class="card-title"><span>${E.def.icone} ${escapeHtml(nom)}</span></span>
        <span class="muted">${v ? `${escapeHtml(v.prenom)} y est ${v.genre === 'm' ? 'artisan' : 'artisane'} depuis ${formatDay(c.depuis)} (${jours} jour${jours > 1 ? 's' : ''} de travail${prochain}). Un commerce reste artisanal : quelques lots par jour, ${escapeHtml(E.def.ou || 'à l\'établi')}, sans machine.` : ''}</span>
        ${local}
        <div class="row commerce-nom"><label for="commerce-nom-champ" class="sr-only">Le nom du commerce</label>
          <input type="text" id="commerce-nom-champ" class="member-input" maxlength="${DATA.DEPART.NOM_MAX}" autocomplete="off" spellcheck="false" value="${escapeHtml(nom)}">
          <button type="button" class="btn small" data-action="commerce-nom-autre" data-commerce="${e}">🎲</button>
          <button type="button" class="btn small" data-action="commerce-nommer" data-commerce="${e}">✏️ Nommer</button></div>
        ${lettresHtml(c)}
        <h3>Aujourd'hui</h3>${aujourdhui}
        ${v ? `<span class="muted">👛 Sa bourse : <span class="num">${formatCoins(Math.max(0, Math.round(v.bourse || 0)))}</span> 💰 : ${il} y prend de quoi acheter ses matières${(v.bourse || 0) <= 0 ? ' ; vide, il ne travaille plus qu\'à façon' : ''}.</span>` : ''}
        ${semaine}
      </div>
      <div class="card">
        <span class="card-title"><span>🏪 En vente au comptoir</span></span>
        <span class="muted">Au prix de vente de l'île : tes pièces vont dans sa bourse. Les villageois y passent après le travail ; ce qui dépasse part avec le bac.</span>
        ${vente}
      </div>
      <div class="card">
        <span class="card-title"><span>📋 Lui commander une pièce</span></span>
        <span class="muted">Payée d'avance, ${il} achète la matière au coffre ; à façon, tu l'apportes et tu ne paies que son travail (${Number(A.FACON) || 25} %). ${A.COMMANDES || 3} commandes en attente au plus.</span>
        ${commandes}
        ${cave}
        ${recettes}
      </div>
    </div>`;
}

// Les lettres de son enseigne (I8a : les couleurs que le village convivial débloque, couleursEnseigne) ; rien tant
// qu'aucune ne l'est.
function lettresHtml(c) {
  const L = couleursEnseigne(state);
  if (!L.length) return '';
  const e = escapeHtml(c.id), choix = (id, nom, couleur) => `<button type="button" class="btn small${(c.lettres || null) === id ? ' primary' : ''}" data-action="commerce-lettres" data-commerce="${e}"${id ? ` data-lettres="${escapeHtml(id)}"` : ''}>${couleur ? `<span style="color:${escapeHtml(couleur)}">●</span> ` : ''}${escapeHtml(nom)}</button>`;
  return `<div class="row commerce-lettres"><span class="muted">🎨 Les lettres de l'enseigne :</span> ${choix(null, 'd\'origine', null)} ${L.map((x) => choix(x.id, x.nom, x.texte)).join(' ')}</div>`;
}

/* -- la fiche du villageois -- */

// Sa fiche : son envie d'un commerce (ce qui manque, « Ouvrir »), ou le commerce qu'il tient.
export function commerceFicheHtml(id) {
  const v = trouverVillageois(state, id);
  if (!v || v.enfant || !villageActif(state)) return '';
  const e = escapeHtml(id), il = ilElle(v);
  return commercesPourLaFiche(state, id).map((x) => {
    if (x.commerce) {
      return `<dt>${x.icone} Commerce</dt><dd>${il === 'il' ? 'Il' : 'Elle'} tient ${escapeHtml(commerceEnPhrase(nomCommerce(state, x.commerce), x.sorte))}. <button type="button" class="btn small" data-action="stage-open" data-window="commerce" data-commerce="${escapeHtml(x.commerce.id)}">Le commerce</button></dd>`;
    }
    const C = x.conditions, puce = (k) => `<li>${C[k].ok ? '✅' : '⏳'} ${escapeHtml(C[k].texte)}</li>`;
    return `<dt>💭 Envie</dt><dd class="commerce-envie"><strong>${il === 'il' ? 'Il' : 'Elle'} aimerait ouvrir ${escapeHtml((defCommerce(x.sorte) || {}).un || x.nom.toLowerCase())}.</strong>
        <ul class="commerce-conditions">${['envie', 'amitie', 'local', 'plafond'].filter((k) => C[k]).map(puce).join('')}</ul>
        <button type="button" class="btn small primary" data-action="commerce-ouvrir" data-id="${e}" data-sorte="${escapeHtml(x.sorte)}"${C.ok ? '' : ' disabled'} id="commerce-ouvrir">${x.icone} Ouvrir ${escapeHtml(x.nom.toLowerCase())}</button>
        <span class="muted">Rien ne presse : son envie ne s'éteint pas. Ouverte, ${il} y deviendra ${il === 'il' ? 'artisan' : 'artisane'}, à la place de sa tâche.</span></dd>`;
  }).join('');
}

/* -- au fil du jeu -- */

let annonce = null;

// À chaque image (js/ui/loop.js) : les ventes au comptoir, les commandes livrées ; au réveil, une envie née, une pièce
// apprise. → vrai s'il y a eu quelque chose.
export function watchCommerces() {
  if (!state || !villageActif(state) || setupPending(state)) return false;
  let n = 0;
  for (const a of prendreAvisCommerces(state)) {
    const c = commercesOuverts(state).find((x) => x.id === a.commerce), nom = c ? nomCommerce(state, c) : 'Le commerce';
    if (a.sorte === 'vente') {
      const v = trouverVillageois(state, a.id);
      const pour = { outil: ' (pour son outil)', repas: ' (pour son repas)', maison: ' (pour sa maison)' }[a.pour] || ' (pour son outil)';
      if (v) notify(`🏪 ${v.prenom} a acheté ${nomTexte(a.objet)} à ${commerceEnPhrase(nom, c && c.sorte)}${a.envie === 'besoin' ? pour : a.envie === 'adore' ? ' ❤️' : ''} : ${formatCoins(a.prix)} 💰 pour l'artisan.`, { kind: 'info' });
    } else if (a.sorte === 'commande') notify(`📦 Ta commande est prête : ${a.n > 1 ? `${a.n} × ` : ''}${nomTexte(a.objet)}${a.facon ? ' (à façon)' : ''}${a.cave ? ', sortie de cave' : ''}, dans ton inventaire${/^meuble_/.test(a.objet) ? ' (à poser dans la maison)' : ''}.`, { kind: 'succes' });
    n++;
  }
  if (!asleep(state) && annonce !== state.day && state.nuit) {
    annonce = state.day;
    const N = state.nuit.artisans;
    for (const x of (N && N.envies) || []) {
      const v = trouverVillageois(state, x.id), d = defCommerce(x.sorte);
      if (v && d) notify(`💭 ${v.prenom} rêve d'ouvrir ${d.un || d.nom.toLowerCase()} : va lui parler, et regarde sa fiche.`, { kind: 'info' });
      n++;
    }
    for (const x of (N && N.appris) || []) {
      const c = commercesOuverts(state).find((y) => y.id === x.commerce), v = c && trouverVillageois(state, c.qui);
      if (v) notify(`📖 Votre amitié grandit : ${v.prenom} sait faire ${x.recettes.map((r) => { const R = recettesDe(c.sorte).find((y) => y.id === r); return nomTexte(R ? R.sortie : r); }).join(', ')}.`, { kind: 'info' });
      n++;
    }
  }
  if (n) persistState();
  return n > 0;
}

registerActions({
  'commerce-onglet': (target) => { ongletCommerce = target.dataset.commerce; rangNom = 0; refresh(); },
  'commerce-ouvrir': (target) => {
    const id = target.dataset.id, sorte = target.dataset.sorte, v = trouverVillageois(state, id);
    const r = applyResult(executer('commerce.ouvrir', { id, sorte }));
    if (!r.ok || !v) return;
    persistState();
    ongletCommerce = r.commerce.id;
    notify(`${defCommerce(sorte).icone} ${v.prenom} ouvre ${commerceEnPhrase(r.nom, sorte)} !${r.fete ? ` La fête de l'ouverture : ${formatDay(r.fete.jour)}, sur la place.` : ''}`, { kind: 'succes', son: 'chapitre' });
    refresh();
    closeModal();
    openStageWindow('commerce');
  },
  'commerce-acheter': (target) => {
    const r = applyResult(executer('commerce.acheter', { commerce: target.dataset.commerce, objet: target.dataset.item, quantite: Number(target.dataset.n) || 1 }));
    if (r.ok) { notify(`🏪 Acheté : ${r.n > 1 ? `${r.n} × ` : ''}${nomTexte(r.objet)} (${formatCoins(r.prix)} 💰).`, { kind: 'info' }); persistState(); refresh(); }
  },
  'commerce-commander': (target) => {
    const r = applyResult(executer('commerce.commander', { commerce: target.dataset.commerce, recette: target.dataset.recette, facon: target.dataset.facon === '1' }));
    if (r.ok) { notify(`📋 Commande passée${r.commande.facon ? ' (à façon)' : ''} : au prochain lot, avant le reste.`, { kind: 'info' }); persistState(); refresh(); }
  },
  'commerce-lettres': (target) => {
    const r = applyResult(executer('commerce.lettres', { commerce: target.dataset.commerce, lettres: target.dataset.lettres || null }));
    if (r.ok) { persistState(); refresh(); }
  },
  'commerce-nom-autre': (target) => {
    const c = commercesOuverts(state).find((x) => x.id === target.dataset.commerce), champ = document.getElementById('commerce-nom-champ');
    if (!c || !champ) return;
    rangNom += 1;
    champ.value = proposerNom(state, 'commerce', c.id, rangNom, { sorte: c.sorte });
  },
  'commerce-nommer': (target) => {
    const c = commercesOuverts(state).find((x) => x.id === target.dataset.commerce), champ = document.getElementById('commerce-nom-champ');
    if (!c || !champ) return;
    const refus = nomRefus(champ.value);
    if (refus) { notify(refus, { kind: 'alerte' }); return; }
    const r = renommer(state, 'commerce', champ.value, c.id);
    if (!r.ok) { notify(r.error, { kind: 'alerte' }); return; }
    persistState();
    notify(`✏️ Le commerce s'appelle ${r.nom} : son enseigne le dit.`, { kind: 'info' });
    refresh();
  },
});

// (pour la fiche : l'artisan a-t-il un commerce ? js/ui/villageois.js)
export { commerceDuVillageois };
