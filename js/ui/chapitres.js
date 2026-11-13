import { DATA } from '../engine/catalog.js';
import { acknowledgeChapter, chapterCount, chapterProgress } from '../engine/campaign.js';
import { formatNumber } from '../engine/format.js';
import { state } from './store.js';
import { tel } from './consent.js';
import { refresh } from './render.js';
import { registerActions } from './actions.js';
import { helpBtn } from './aide.js';
import { closeModal, openModal } from './modal.js';
import { accord } from './common.js';
import { son } from './son.js';
import { escapeHtml } from '../engine/format.js';
import { PLANS } from '../engine/plans.js';
import { projetsFaits } from '../engine/projets.js';
import { styleDe, styleInfo, styleMaison } from '../engine/styles.js';
import { listeDesChapitres, paliersSuivis } from '../engine/paliers.js';
import { notify } from './toasts.js';
import { villageActif } from '../engine/village.js';
import { subtabsHtml } from './inventaire.js';
import { renderVocations } from './vocations.js';

/* ---------- Lot 9 : chapitres ---------- */

export function objectiveValueText(o) {
  const n = (x) => formatNumber(Math.floor(x));
  switch (o.type) {
    case 'litres': return `${n(o.valeur)} / ${formatNumber(o.cible)} L`;
    case 'wh': return `${n(o.valeur)} / ${formatNumber(o.cible)} Wh`;
    case 'bonheur': return `${n(o.valeur)} / ${formatNumber(o.cible)}`;
    case 'pontes': return `${n(o.valeur)} / ${formatNumber(o.cible)} nuits`;
    // version 1.12 : étapes faites ou pas (maison, achats, houe, Silo, premier semis ou récolte)
    case 'maison': case 'panneau': case 'pompe': case 'reservoir': case 'houe': case 'silo':
      return o.ok ? '✅' : '';
    case 'niveau': return `niv. ${n(o.valeur)} / ${formatNumber(o.cible)}`;
    // fiche 9b : le grand monde
    case 'caleche': case 'ventesPort': return `${n(o.valeur)} / ${formatNumber(o.cible)} 💰`;
    // le chantier « l'île à bâtir » (fiche I7a) : le niveau du port
    case 'portNiveau': return `niv. ${n(o.valeur)} / ${formatNumber(o.cible)}`;
    case 'monde': return `${n(o.valeur)} / ${formatNumber(o.cible)} %`;
    default: return `${n(o.valeur)} / ${formatNumber(o.cible)}`;
  }
}

// FLU-36 : une tâche oui/non (cible 1) n'a que sa case, sans barre de progression.
function objectiveHtml(o) {
  return `
    <li class="objective${o.ok ? ' ok' : ''}">
      <span class="objective-line"><span class="objective-label">${o.ok ? '✅' : '⬜'} ${o.libelle}</span><span class="objective-value">${objectiveValueText(o)}</span></span>
      ${o.cible === 1 ? '' : `<span class="bar" role="progressbar" aria-label="${o.libelle}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(o.ratio * 100)}"><span class="bar-fill${o.ok ? '' : ' warn'}" style="width:${Math.round(o.ratio * 100)}%"></span></span>`}
    </li>`;
}

// Le lot 6 : ce qu'un chapitre offre en plus de l'XP (data/campaign.json recompense, ou ce qui a été donné
// pour de bon, l'annonce) : ses plans et ses objets de décor, avec leur style. → [html d'une puce]
function recompenseItems(r) {
  const style = (id) => { const st = styleInfo(styleDe(id)); return st ? ` <span class="muted" title="style ${st.nom}">${st.icone} ${st.nom}</span>` : ''; };
  const nom = (id) => { const o = DATA.OBJETS[id] || DATA.ATELIER.BLOCS[id]; return o ? `${o.icone || ''} ${escapeHtml(o.nom)}` : escapeHtml(id); };
  return [
    ...(r.plans || []).map((id) => `📜 le plan : ${nom(id)}${style(id)}`),
    ...Object.entries(r.objets || {}).map(([id, n]) => `${n > 1 ? `${n} × ` : ''}${nom(id)}${style(id)}`),
  ];
}
function recompenseHtml(r) {
  const L = recompenseItems(r || {});
  return L.length ? `<ul class="chapitre-recompense">${L.map((x) => `<li>${x}</li>`).join('')}</ul>` : '';
}

// Le jeu libre (la campagne finie) : ce qui reste à faire, à son rythme.
function jeuLibreHtml() {
  const H = state.projets && typeof state.projets === 'object' ? Object.keys(state.projets) : [];
  const projets = H.reduce((n, hid) => n + projetsFaits(state, hid).length, 0);
  const connus = state.plans && state.plans.connus ? Object.keys(state.plans.connus).length : 0;
  const total = Object.values(PLANS.COLLECTIONS).reduce((n, c) => n + c.plans.length, 0);
  const m = styleMaison(state);
  const styles = m.complet ? `un style complet (${styleInfo(m.complet).nom})` : m.varies.length ? `${m.varies.length} ${accord(m.varies.length, 'style')} ${accord(m.varies.length, 'mis', 'mis')} en valeur` : 'mêle les styles qui te plaisent';
  return `<ul class="jeu-libre">
    <li>🪑 Aménage la ferme à ton idée : ${styles}.</li>
    <li>📅 Invite tes amis à un repas, depuis le calendrier.</li>
    <li>🏘️ Aide les hameaux dans leurs projets : ${formatNumber(projets)} ${accord(projets, 'projet')} ${accord(projets, 'achevé')}.</li>
    <li>📜 Complète les collections de plans : ${formatNumber(connus)} / ${formatNumber(total)}.</li>
  </ul>`;
}

/* -- le chantier « l'île à bâtir » (fiche I7a) : les paliers de l'île, sans texte à lire -- */

// La fenêtre « L'île » : le palier en cours (ses objectifs cochés, sa récompense), puis les paliers passés.
function renderIle() {
  const c = state.campagne, L = listeDesChapitres(state), N = chapterCount(state);
  const passes = (c.fini ? L : L.slice(0, Math.max(0, state.palier - 1))).map((d, i) => `<li>✅ ${d.icone} ${escapeHtml(d.titre)} <span class="muted">${i + 1} / ${N}</span></li>`);
  const passesHtml = passes.length ? `<span class="muted ile-passes-titre">Paliers passés</span><ul class="ile-passes">${passes.reverse().join('')}</ul>` : '';
  if (c.fini) {
    return `
    <div class="card chapter-card ile-card done">
      <span class="card-title"><span>🏝️ Tous les paliers franchis</span><span class="chips"><span class="chip">${N} / ${N}</span>${helpBtn('chapitres')}</span></span>
      ${passesHtml}
    </div>`;
  }
  const p = chapterProgress(state);
  const rec = recompenseItems(L[p.chapitre - 1].recompense || {});
  return `
    <div class="card chapter-card ile-card">
      <span class="card-title"><span>${p.icone} ${escapeHtml(p.titre)}</span><span class="chips"><span class="chip" title="Palier de l'île">${p.chapitre} / ${N}</span><span class="chip" title="Récompense du palier">⭐ ${formatNumber(DATA.NIVEAUX.CHAPITRES_XP[p.chapitre - 1] || 0)} XP</span><span class="chip" title="Points de technologie">🔬 ${formatNumber(DATA.ARBRE.POINTS.CHAPITRES[p.chapitre - 1] || 0)}</span>${helpBtn('chapitres')}</span></span>
      <ul class="objectives">${p.objectifs.map(objectiveHtml).join('')}</ul>
      ${rec.length ? `<span class="muted chapitre-recompense-titre">🎁 ${rec.join(' · ')}</span>` : ''}
      ${passesHtml}
    </div>`;
}

// La récompense en texte simple (une notification n'a pas de balises) : ['📜 plan : Pergola', '2 × 🏮 Lanterne'].
function recompenseTextes(r) {
  const nom = (id) => { const o = DATA.OBJETS[id] || DATA.ATELIER.BLOCS[id]; return o ? `${o.icone || ''} ${o.nom}`.trim() : id; };
  return [
    ...(r.plans || []).map((id) => `📜 plan : ${nom(id)}`),
    ...Object.entries(r.objets || {}).map(([id, n]) => `${n > 1 ? `${n} × ` : ''}${nom(id)}`),
  ];
}

// Un palier franchi : une notification (et la récompense, déjà donnée), pas d'écran à lire ; touchée, elle
// ouvre la fenêtre « L'île ».
function annoncerPaliers() {
  const c = state.campagne, L = listeDesChapitres(state);
  while (c.annonces.length) {
    const a = c.annonces[0], d = L[a.chapitre - 1];
    const gains = [`+${formatNumber(DATA.NIVEAUX.CHAPITRES_XP[a.chapitre - 1] || 0)} XP`, `+${formatNumber(DATA.ARBRE.POINTS.CHAPITRES[a.chapitre - 1] || 0)} PT`, ...recompenseTextes(a.recompense || {})];
    const suite = L[a.chapitre] ? ` Palier suivant : ${L[a.chapitre].icone} ${L[a.chapitre].titre}.` : ' L\'île est à toi.';
    notify(`🏝️ Palier ${a.chapitre} franchi : ${d.icone} ${d.titre} ! ${gains.join(' · ')}.${suite}`, { kind: 'succes', son: 'chapitre', cible: { fenetre: 'chapitres' } });
    acknowledgeChapter(state);
  }
  refresh();
}

// Fiche I8a : la fenêtre « L'île » a deux onglets (le chantier allumé) : les paliers de l'île, puis les vocations
// (js/ui/vocations.js : chaque vocation, son score, ses paliers, ce qui la fait monter ; les fêtes et les projets du
// village).
const ILE_ONGLETS = [
  { id: 'paliers', icon: '🏝️', label: 'Les paliers' },
  { id: 'vocations', icon: '🎉', label: 'Vocations' },
];
let ileOnglet = 'paliers';
export function ongletsIle() {
  return subtabsHtml(ILE_ONGLETS, ileOnglet, 'ile-onglet');
}
export function corpsIle() {
  return villageActif(state) && paliersSuivis(state) && ileOnglet === 'vocations' ? renderVocations() : renderChapterBanner();
}
// (une notification qui mène aux vocations : l'onglet s'ouvre)
export function ouvrirOngletIle(id) {
  ileOnglet = ILE_ONGLETS.some((t) => t.id === id) ? id : 'paliers';
}

// Bandeau de chapitre, en haut de la Ferme : titre, objectifs et progression.
export function renderChapterBanner() {
  if (paliersSuivis(state)) return renderIle();
  const c = state.campagne;
  if (c.fini) {
    const der = DATA.CHAPITRES.liste[chapterCount() - 1];
    return `
    <div class="card chapter-card done">
      <span class="card-title"><span>🌈 Jeu libre</span><span class="chips"><span class="chip">${der.icone} ${der.titre}</span>${helpBtn('chapitres')}</span></span>
      <span class="muted">Rien ne presse : la suite est à toi.</span>
      ${jeuLibreHtml()}
    </div>`;
  }
  const p = chapterProgress(state);
  const def = DATA.CHAPITRES.liste[p.chapitre - 1];
  const rec = recompenseItems(def.recompense || {});
  return `
    <div class="card chapter-card">
      <span class="card-title"><span>${p.icone} ${p.titre}</span><span class="chips"><span class="chip">${p.chapitre} / ${chapterCount()}</span><span class="chip" title="Récompense du chapitre">⭐ ${formatNumber(DATA.NIVEAUX.CHAPITRES_XP[p.chapitre - 1] || 0)} XP</span>${helpBtn('chapitres')}</span></span>
      ${def.etape ? `<span class="muted chapitre-etape">${escapeHtml(def.etape)}</span>` : ''}
      <ul class="objectives">${p.objectifs.map(objectiveHtml).join('')}</ul>
      ${rec.length ? `<span class="muted chapitre-recompense-titre">🎁 À la clé : ${rec.join(' · ')}</span>` : ''}
    </div>`;
}

// Écran de fin de chapitre : ce qu'on vient de finir, les nouveautés, la suite.
function openChapterModal() {
  tel('modal', 'chapter');
  const c = state.campagne;
  const a = c && c.annonces[0];
  if (!a) return;
  son('chapitre', { delai: 0.15 });
  const L = DATA.CHAPITRES.liste;
  const done = L[a.chapitre - 1];
  const next = L[a.chapitre] || null;
  const body = next
    ? `<h3>Chapitre ${a.chapitre + 1} : ${next.icone} ${next.titre}</h3>
       ${next.etape ? `<p class="muted chapitre-etape">${escapeHtml(next.etape)}</p>` : ''}
       <p class="muted">${next.intro}</p>
       <ul class="objectives">${next.objectifs.map((o) => `<li class="objective"><span class="objective-label">⬜ ${o.libelle}</span></li>`).join('')}</ul>`
    : `<h3>🌈 Le jeu libre commence</h3>
       <p>Ce n'est pas une fin : la ferme est à toi, à ton rythme. Toutes les ${DATA.ARBRE.POINTS.MODE_LIBRE_NUITS} nuits, 1 point de technologie de plus.</p>
       ${jeuLibreHtml()}`;
  openModal(`
    <h2 id="chapter-title">🎉 Chapitre ${a.chapitre} terminé</h2>
    <p><strong>${done.icone} ${done.titre}</strong></p>
    <p>⭐ +${formatNumber(DATA.NIVEAUX.CHAPITRES_XP[a.chapitre - 1] || 0)} XP · 🔬 +${formatNumber(DATA.ARBRE.POINTS.CHAPITRES[a.chapitre - 1] || 0)} points de technologie, à dépenser dans l'Arbre des technologies.</p>
    ${recompenseHtml(a.recompense)}
    ${body}
    <button type="button" class="btn primary" data-action="ack-chapter" id="chapter-close">Continuer</button>`, {
    labelledBy: 'chapter-title', id: 'chapter-modal', focus: '#chapter-close',
    // Lot 9 : la fermer (bouton ou fond) acquitte la fin du chapitre
    onClose: () => { acknowledgeChapter(state); refresh(); },
  });
}

// Ouvre l'écran de fin d'un chapitre dès qu'aucune autre fenêtre n'est ouverte.
export function watchChapters() {
  if (!state.campagne || !state.campagne.annonces.length) return;
  if (paliersSuivis(state)) { annoncerPaliers(); return; }
  if (document.getElementById('modal-root').childElementCount === 0) openChapterModal();
}

/* ---------- actions de cet écran (voir ui/actions.js) ---------- */

registerActions({
  'ack-chapter': () => {
    closeModal();
  },
  'ile-onglet': (target) => {
    ouvrirOngletIle(target.dataset.tab);
    refresh();
  },
});
