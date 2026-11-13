import { DATA } from '../engine/catalog.js';
import { escapeHtml, formatDay, formatNumber } from '../engine/format.js';
import { asleep } from '../engine/night.js';
import { setupPending } from '../engine/depart.js';
import { countItem } from '../engine/inventory.js';
import { villageActif } from '../engine/village.js';
import { villageoisDe, trouverVillageois } from '../engine/villageois.js';
import { listeVocations, texteDeblocage, quiDebloque } from '../engine/vocations.js';
import '../engine/vocation-village.js';
import {
  annulerFete, feteRefus, fetesAVenirVillage, fetesDuMoisVillage, fetesParMois, fetesTenues, fixerFete, platsDisponibles,
  platsPourLaFete, villageVocation,
} from '../engine/fetes-village.js';
import {
  abandonnerProjet, apporterAuProjetVillage, envoyerAuChantier, lancerProjet, projetEnCours, projetsVillage,
} from '../engine/projets-village.js';
import { registerActions, SOMMEIL_MESSAGE } from './actions.js';
import { state } from './store.js';
import { persistState } from './storage.js';
import { refresh } from './render.js';
import { notify } from './toasts.js';
import { itemsText } from './common.js';

/* ---------- les vocations de l'île, côté page (le chantier « l'île à bâtir », fiche I8a) ----------

   - l'onglet « Vocations » de la fenêtre « L'île » (js/ui/stage-windows.js, js/ui/chapitres.js) : chaque vocation
     enregistrée (js/engine/vocations.js listeVocations) : son score, son palier, ce qui la fait monter (ses causes), ce
     que le palier suivant donne, ses paliers ; et ce qui lui est propre (SECTIONS : pour le village, ses fêtes et ses
     projets) ;
   - les fêtes du village (js/engine/fetes-village.js) : celles qui viennent, en fixer une (un jour, les plats), en
     annuler une ; le calendrier les marque (js/ui/calendrier.js) et la fenêtre « Créer un évènement » en fixe une
     (js/ui/invitations.js) ;
   - les projets du village (js/engine/projets-village.js) : le projet en cours (les matériaux, les journées, le
     chantier à poser, qui y travaille), les autres (à lancer, fermés, finis) ;
   - au matin (watchVocations, js/ui/loop.js) : la fête d'hier, le chantier, les paliers passés, les fêtes qui viennent.
   Le chantier éteint, rien ici ne se montre. */

const objetHtml = (it, n) => { const o = DATA.OBJETS[it] || { nom: it, icone: '' }; return `${n !== undefined ? `${formatNumber(n)} ` : ''}<span aria-hidden="true">${o.icone || ''}</span> ${escapeHtml(o.nom.toLowerCase())}`; };
const leJour = (jour) => (jour === state.day ? 'aujourd\'hui' : jour === state.day + 1 ? 'demain' : formatDay(jour).toLowerCase().replace(/^(\S+)/, 'le $1'));
const barre = (n, max, label) => `<span class="bar" role="progressbar" aria-label="${escapeHtml(label)}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(Math.min(1, n / Math.max(1, max)) * 100)}"><span class="bar-fill" style="width:${Math.round(Math.min(1, n / Math.max(1, max)) * 100)}%"></span></span>`;
const liste = (noms) => (noms.length < 2 ? noms.join('') : `${noms.slice(0, -1).join(', ')} et ${noms[noms.length - 1]}`);

/* -- une vocation -- */

function vocationHtml(v) {
  const N = v.paliers.length, s = v.suivant, base = v.palier > 0 ? v.paliers[v.palier - 1].score : 0;
  const prochain = s
    ? `<div class="vocation-suivant"><strong>Palier suivant : ${s.icone} ${escapeHtml(s.nom)}</strong> <span class="muted">à ${formatNumber(s.score)} points${s.manque ? ` (encore ${formatNumber(s.manque)})` : ' : atteint, il se passe cette nuit'}</span>
        ${barre(v.score - base, s.score - base, `Vers le palier ${s.rang}`)}
        <ul class="vocation-debloque">${s.debloque.map((k) => `<li>${escapeHtml(texteDeblocage(k))}</li>`).join('')}</ul></div>`
    : '<p class="muted">Tous les paliers sont atteints.</p>';
  const causes = v.causes.map((c) => `<li><span aria-hidden="true">${c.icone || ''}</span> ${escapeHtml(c.nom)} <span class="num vocation-pts">${formatNumber(c.valeur)}${c.max ? `<span class="muted"> / ${formatNumber(c.max)}</span>` : ''}</span>${c.detail !== undefined ? ` <span class="muted">(${escapeHtml(detailCause(v.id, c))})</span>` : ''}</li>`).join('');
  const paliers = v.paliers.map((p) => `<li class="${p.atteint ? 'ok' : 'muted'}">${p.atteint ? '✅' : '⬜'} ${p.icone} ${escapeHtml(p.nom)} <span class="num">${formatNumber(p.score)}</span><span class="vocation-palier-dit"> : ${p.debloque.map((k) => escapeHtml(texteDeblocage(k))).join(' · ')}</span></li>`).join('');
  return `
    <div class="card vocation-card" id="vocation-${escapeHtml(v.id)}">
      <span class="card-title"><span>${v.icone} ${escapeHtml(v.nom)}</span><span class="chips"><span class="chip" title="Palier">${v.palier} / ${N}</span><span class="chip" title="Score">⭐ ${formatNumber(v.score)}</span></span></span>
      ${v.texte ? `<span class="muted">${escapeHtml(v.texte)}</span>` : ''}
      ${prochain}
      <strong class="vocation-sous-titre">Ce qui la fait monter</strong>
      <ul class="vocation-causes">${causes}</ul>
      <details class="vocation-paliers"><summary>Les paliers</summary><ul>${paliers}</ul></details>
    </div>
    ${SECTIONS[v.id] ? SECTIONS[v.id]() : ''}`;
}

// Ce qui fait une cause, en mots (la vocation « village »).
function detailCause(id, c) {
  if (id !== 'village') return String(c.detail);
  const n = Number(c.detail) || 0, s = n > 1 ? 's' : '';
  switch (c.id) {
    case 'bonheur': return `bonheur moyen ${n}`;
    case 'ami': return `${n} paire${s} d'amis`;
    case 'proche': return `${n} paire${s} de proches`;
    case 'fete': return `${n} fête${s} tenue${s}`;
    case 'projet': return `${n} projet${s} fini${s}`;
    case 'repas': return `${n} repas partagé${s}`;
    case 'decor': return n ? `${n} objet${s} autour de la place` : 'pose bancs, lanternes et fleurs autour du puits';
    default: return String(n);
  }
}

/* -- le village : ses fêtes -- */

function fetesHtml() {
  const venir = fetesDuMoisVillage(state, state.day).concat(fetesDuMoisVillage(state, state.day + DATA.LUNE.JOURS_MOIS)).filter((f) => f.jour >= state.day);
  const vues = new Set();
  const lignes = venir.filter((f) => (vues.has(f.jour) ? false : vues.add(f.jour))).map((f) => {
    const plats = Object.keys(f.plats).length ? ` <span class="muted">· ${itemsText(f.plats, 'resume')}</span>` : '';
    const annuler = f.fixee && f.jour > state.day ? ` <button type="button" class="btn small" data-action="vocation-fete-annuler" data-jour="${f.jour}">Annuler</button>` : '';
    return `<li><span aria-hidden="true">${f.icone}</span> <strong>${escapeHtml(f.nom)}</strong> : ${escapeHtml(leJour(f.jour))}, de ${heure(f.debut)} à ${heure(f.fin)}${plats}${annuler}</li>`;
  }).join('');
  const n = platsPourLaFete(state), dispo = Object.values(platsDisponibles(state)).reduce((a, b) => a + b, 0);
  const jours = [];
  for (let d = state.day + 1; d <= state.day + DATA.LUNE.JOURS_MOIS && jours.length < 14; d++) if (!feteRefus(state, d)) jours.push(d);
  const choix = jours.map((d) => `<option value="${d}">${escapeHtml(formatDay(d))}${d === state.day + 1 ? ' (demain)' : ''}</option>`).join('');
  const refus = jours.length ? '' : feteRefus(state, state.day + 1) || '';
  return `
    <div class="card vocation-fetes">
      <span class="card-title"><span>🎉 Les fêtes du village</span><span class="chips"><span class="chip" title="Fêtes tenues">${formatNumber(fetesTenues(state))} tenue${fetesTenues(state) > 1 ? 's' : ''}</span></span></span>
      <span class="muted">Une fête par mois de lune${fetesParMois(state) > 1 ? ` (${fetesParMois(state)} maintenant)` : ''} : tout le village vient sur la place, s'attable, cause et danse sous les lampions ; chacun s'y rapproche des autres. La veillée de pleine lune vient d'elle-même.</span>
      ${lignes ? `<ul class="vocation-fetes-liste">${lignes}</ul>` : '<p class="muted">Aucune fête prévue.</p>'}
      ${jours.length ? `<form class="vocation-fixer" data-vocation-fete>
        <label>Le jour <select name="fete-jour">${choix}</select></label>
        <span class="muted">Les plats : ${n} (un par ${Number(((DATA.VOCATIONS.village || {}).FETES.PLATS || {}).PAR) || 2} villageois), pris dans l'inventaire${dispo < n ? ` : tu n'en as que ${dispo}, cuisine d'abord` : ` (tu en as ${dispo})`}.</span>
        <button type="button" class="btn primary" data-action="vocation-fete-fixer"${dispo < n ? ' disabled' : ''}>🎉 Fixer la fête</button>
      </form>` : `<p class="muted">${escapeHtml(refus || 'Toutes les fêtes du mois sont fixées.')}</p>`}
    </div>`;
}
const heure = (h) => { const m = Math.round((h % 1) * 60); return `${Math.floor(h)} h${m ? ` ${String(m).padStart(2, '0')}` : ''}`; };

/* -- le village : ses projets -- */

function projetsHtml() {
  const e = projetEnCours(state), L = projetsVillage(state);
  let encours = '';
  if (e) {
    const mat = Object.entries(e.besoin).map(([it, n]) => `<li class="${(e.recu[it] || 0) >= n ? 'ok' : ''}">${(e.recu[it] || 0) >= n ? '✅' : '⬜'} ${objetHtml(it)} <span class="num">${formatNumber(e.recu[it] || 0)} / ${formatNumber(n)}</span>${(e.recu[it] || 0) < n ? ` <span class="muted">(tu en as ${formatNumber(countItem(state, it))})</span>` : ''}</li>`).join('');
    const lieu = e.bloc ? (e.pose !== null ? '✅ Le chantier est posé.' : `⬜ Le chantier est dans ton inventaire : pose-le dehors avec 🔨 Construire (onglet Jardin), près de la place.`) : (e.lieu ? '✅ Ils bâtiront sur la place.' : '⬜ Il faut une place : un puits, ou une table de jardin dehors.');
    const adultes = villageoisDe(state).filter((v) => !v.enfant);
    const equipe = adultes.map((v) => {
      const la = v.chantier === e.sorte;
      return `<li>${la ? '🔨' : '·'} <strong>${escapeHtml(v.prenom)}</strong> <span class="muted">${la ? 'au chantier' : v.tache && DATA.TACHES.LISTE[v.tache] ? `${DATA.TACHES.LISTE[v.tache].icone} ${escapeHtml(DATA.TACHES.LISTE[v.tache].nom)}` : 'sans tâche'}${v.repos ? ' · au repos' : ''}</span>
        <button type="button" class="btn small" data-action="vocation-projet-envoyer" data-id="${escapeHtml(v.id)}" data-oui="${la ? '' : '1'}">${la ? 'Rappeler' : 'Envoyer'}</button></li>`;
    }).join('');
    encours = `
      <div class="vocation-projet-encours">
        <strong>${e.icone} ${escapeHtml(e.nom)}</strong> <span class="muted">${escapeHtml(e.texte)}</span>
        <ul class="vocation-materiaux">${mat}</ul>
        ${e.pret ? '' : '<button type="button" class="btn" data-action="vocation-projet-apporter">🧺 Apporter ce que j\'ai</button>'}
        <p>${lieu}</p>
        <div><strong>Les journées</strong> <span class="num">${e.faites} / ${e.journees}</span> ${barre(e.faites, e.journees, 'Journées de chantier')}
          <span class="muted">Chaque villageois envoyé au chantier y travaille une journée à la place de sa tâche, quand tout est là${e.bloc ? ' et le chantier posé' : ''}.</span></div>
        <ul class="vocation-equipe">${equipe}</ul>
        ${e.pose === null ? '<button type="button" class="btn small" data-action="vocation-projet-abandonner">Abandonner le projet</button>' : ''}
      </div>`;
  }
  const autres = L.filter((p) => !p.enCours).map((p) => {
    const etat = p.fait ? '<span class="muted">✅ fini</span>'
      : !p.ouvert ? (() => { const q = quiDebloque(p.palier); return `<span class="muted">🔒 ${q ? `au palier ${q.rang} (${formatNumber(q.score)} points)` : 'fermé'}</span>`; })()
      : e ? '' : `<button type="button" class="btn small" data-action="vocation-projet-lancer" data-sorte="${escapeHtml(p.sorte)}">Lancer</button>`;
    const besoin = Object.entries(p.besoin).map(([it, n]) => objetHtml(it, n)).join(', ');
    const donne = p.bloc ? '' : ` → ${itemsText(p.donne, 'resume')}`;
    return `<li class="${p.fait ? 'ok' : ''}"><span aria-hidden="true">${p.icone}</span> <strong>${escapeHtml(p.nom)}</strong> ${etat}<br><span class="muted">${besoin} · ${p.journees} journée${p.journees > 1 ? 's' : ''} de villageois${donne}</span></li>`;
  }).join('');
  return `
    <div class="card vocation-projets">
      <span class="card-title"><span>🏗️ Les projets du village</span></span>
      <span class="muted">Un projet à la fois : tu apportes les matériaux, les villageois que tu y envoies le bâtissent ensemble.</span>
      ${encours}
      <ul class="vocation-projets-liste">${autres}</ul>
    </div>`;
}

const SECTIONS = { village: () => fetesHtml() + projetsHtml() };

// L'onglet « Vocations » de la fenêtre « L'île ».
export function renderVocations() {
  if (!villageActif(state)) return '';
  const L = listeVocations(state);
  return `<p class="muted vocation-intro">L'île prend une vocation de ce que tu y bâtis : on peut les suivre toutes à la fois.</p>${L.map(vocationHtml).join('')}`;
}

/* -- au matin -- */

// À chaque image (js/ui/loop.js) : une fois par jour, au réveil, ce que la nuit a fait (la fête, le chantier, les
// paliers) et les fêtes qui viennent.
export function watchVocations() {
  if (!state || !villageActif(state) || setupPending(state) || asleep(state)) return;
  if (!villageoisDe(state).length) return;
  const V = villageVocation(state);
  if (V.annonce === state.day) return;
  V.annonce = state.day;
  const N = state.nuit || {};
  const f = N.feteVillage;
  if (f) notify(`${f.icone} ${escapeHtml(f.nom)} : ${f.venus > 1 ? `${f.venus} villageois sont venus` : 'un villageois est venu'} sur la place. Les liens se sont resserrés, et tout le monde s'est couché le cœur léger.`, { kind: 'succes', cible: { fenetre: 'chapitres' } });
  const c = N.chantierVillage;
  if (c && c.fini) notify(`${c.icone} ${escapeHtml(c.nom)} : c'est fini ! Le village l'a bâti ensemble${Object.keys(c.donne || {}).length ? ` ; dans ton inventaire : ${itemsText(c.donne, 'gain')}` : ''}.`, { kind: 'succes', cible: { fenetre: 'chapitres' } });
  else if (c && c.equipe.length) notify(`🔨 Le chantier (${escapeHtml(c.nom.toLowerCase())}) avance : ${c.faites} / ${c.journees} journées.`, { kind: 'info' });
  for (const p of N.vocations || []) {
    const v = (DATA.VOCATIONS || {})[p.id] || {};
    notify(`${v.icone || '⭐'} ${escapeHtml(v.nom || p.id)} : palier ${p.palier}, ${p.icone} ${escapeHtml(p.nom)} ! Débloqué : ${p.debloque.map((k) => escapeHtml(texteDeblocage(k))).join(' · ')}.`, { kind: 'succes', son: 'chapitre', cible: { fenetre: 'chapitres' } });
  }
  for (const x of fetesAVenirVillage(state)) notify(`${x.icone} ${escapeHtml(x.nom)} : ${leJour(x.jour)}, de ${heure(x.debut)} à ${heure(x.fin)}, sur la place. Tout le village y sera !`, { kind: 'info' });
  persistState();
}

/* -- les actions -- */

function apres(r, texte) {
  if (!r.ok) { notify(escapeHtml(r.error), { kind: 'alerte' }); return false; }
  if (texte) notify(texte, { kind: 'info' });
  persistState();
  refresh();
  return true;
}

// (la fenêtre « Créer un évènement » : fixer la fête du village au jour choisi ; js/ui/invitations.js)
export function fixerFeteDuJour(jour) {
  if (asleep(state)) { notify(SOMMEIL_MESSAGE); return false; }
  const r = fixerFete(state, jour);
  return apres(r, r.ok ? `🎉 La fête du village est fixée ${leJour(r.fete.jour)} : ${itemsText(r.fete.plats, 'resume')} attendent sur la table. Tout le village sera prévenu.` : '');
}

registerActions({
  'vocation-fete-fixer': (target) => {
    const f = target.closest('[data-vocation-fete]') || document.querySelector('[data-vocation-fete]');
    const jour = Number(f && f.querySelector('[name="fete-jour"]') ? f.querySelector('[name="fete-jour"]').value : NaN);
    fixerFeteDuJour(jour);
  },
  'vocation-fete-annuler': (target) => {
    if (asleep(state)) { notify(SOMMEIL_MESSAGE); return; }
    const r = annulerFete(state, Number(target.dataset.jour));
    apres(r, r.ok ? `La fête est annulée : ${itemsText(r.plats, 'resume')} reviennent dans ton inventaire.` : '');
  },
  'vocation-projet-lancer': (target) => {
    if (asleep(state)) { notify(SOMMEIL_MESSAGE); return; }
    const r = lancerProjet(state, target.dataset.sorte);
    apres(r, r.ok ? `${r.projet.icone} ${escapeHtml(r.projet.nom)} : c'est parti !${r.chantier ? ' Son chantier est dans ton inventaire : pose-le dehors (🔨 Construire, onglet Jardin).' : ''} Apporte les matériaux et envoie des villageois au chantier.` : '');
  },
  'vocation-projet-apporter': () => {
    if (asleep(state)) { notify(SOMMEIL_MESSAGE); return; }
    const r = apporterAuProjetVillage(state);
    apres(r, r.ok ? `🧺 Tu as apporté ${itemsText(r.donne, 'resume')}.${r.pret ? ' Tout est là : il ne manque plus que des bras.' : ''}` : '');
  },
  'vocation-projet-envoyer': (target) => {
    const v = trouverVillageois(state, target.dataset.id);
    const oui = !!target.dataset.oui;
    const r = envoyerAuChantier(state, target.dataset.id, oui);
    apres(r, r.ok && v ? (oui ? `🔨 ${escapeHtml(v.prenom)} ira au chantier, à la place de sa tâche.` : `${escapeHtml(v.prenom)} reprend sa tâche.`) : '');
  },
  'vocation-projet-abandonner': () => {
    const r = abandonnerProjet(state);
    apres(r, r.ok ? `Le projet est abandonné ; ce que tu avais apporté revient dans ton inventaire${Object.keys(r.rendu).length ? ` : ${itemsText(r.rendu, 'resume')}` : ''}.` : '');
  },
});

