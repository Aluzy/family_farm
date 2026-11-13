import { escapeHtml } from '../engine/format.js';
import { validApparence } from '../engine/family.js';
import { trouverVillageois } from '../engine/villageois.js';
import {
  accueillirEnfant, enfantRefus, foyerDe, foyerRefus, formerFoyer, liensVillageois, maisonsPourFoyer, quiEstLie, NOMS_LIENS,
} from '../engine/liens.js';
import { persoHtml } from './famille.js';
import { plancheAvecChargement } from './apparence.js';
import { openModal } from './modal.js';
import { registerActions } from './actions.js';
import { state } from './store.js';
import { persistState } from './storage.js';
import { refresh } from './render.js';
import { notify } from './toasts.js';
import { ouvrirFicheVillageois } from './villageois.js';

/* ---------- les liens entre villageois, côté page (le chantier « l'île à bâtir », fiche I6b) ----------

   Le moteur : js/engine/liens.js (l'affinité de chaque paire, ses paliers, les foyers). Ici :
     - sur la fiche d'un villageois (liensFicheHtml, appelé par villageois.js) : ses liens, du plus fort au plus
       faible (un portrait, le palier, sa jauge jusqu'au suivant) ; son foyer (avec qui il vit, leur enfant) ; « 🏡 Leur
       proposer un foyer » pour un proche (la liste des maisons à deux lits qui conviennent : ouvrirFoyer) ; « 👶
       Accueillir un enfant » pour un foyer dont la maison a un lit d'enfant ;
     - la vue d'ensemble (ouvrirLiensDuVillage, le bouton « 🤝 Les liens » de la liste des villageois) : les foyers,
       puis qui est lié à qui (proches, amis, camarades), une liste ;
     - les avis de la nuit (direAvisLien, appelé par villageois.js direAvis) : deux villageois devenus amis ou proches,
       un foyer, un enfant arrivé, un repas apporté. */

const portrait = (v) => persoHtml(v.perso, !!v.enfant, '', '', v.apparence ? plancheAvecChargement(validApparence(v.apparence, !!v.enfant), !!v.enfant) : null);
const ICONES = { connaissance: '👋', camarade: '🙂', ami: '😊', proche: '💞' };
const accord = (v, f, m) => (v && v.genre === 'm' ? m : f);

// La jauge d'un lien : le palier, la barre (le score sur 100), ce qu'il reste jusqu'au suivant.
function jaugeLien(l) {
  const suite = l.prochain !== null ? `encore ${l.prochain - l.score} pour « ${NOMS_LIENS[l.palier + 1]} »` : 'le plus fort des liens';
  return `<span class="lien-palier">${ICONES[l.nom] || '·'} ${escapeHtml(l.nom)}</span> <span class="ami-jauge lien-jauge" role="img" aria-label="Lien : ${l.score} sur 100, ${escapeHtml(suite)}"><span style="width:${l.score}%"></span></span>`;
}

// Ce que la fiche du villageois `id` dit de ses liens (des lignes de la liste <dl> de la fiche).
export function liensFicheHtml(id) {
  const v = trouverVillageois(state, id);
  if (!v) return '';
  const L = liensVillageois(state, id), f = foyerDe(state, id), e = escapeHtml(id);
  const connus = L.filter((l) => l.palier >= 1);
  const ligne = (l) => {
    const refus = l.palier >= 4 && !f && !v.enfant && !l.enfant ? foyerRefus(state, id, l.id, { maison: false }) : 'non';
    const foyer = refus === null ? ` <button type="button" class="btn small" data-action="liens-foyer" data-a="${e}" data-b="${escapeHtml(l.id)}">🏡 Leur proposer un foyer</button>` : '';
    return `<li class="lien-ligne"><button type="button" class="lien-qui" data-action="villageois-fiche" data-id="${escapeHtml(l.id)}"><span class="villageois-portrait lien-portrait">${portrait(l)}</span> <strong>${escapeHtml(l.prenom)}</strong></button>
      <span class="lien-etat">${jaugeLien(l)}${l.foyer ? ' <span class="muted">· sous le même toit</span>' : ''}</span>${foyer}</li>`;
  };
  const liste = connus.length ? `<ul class="liens-liste">${connus.slice(0, 8).map(ligne).join('')}</ul>${connus.length > 8 ? `<span class="muted">et ${connus.length - 8} autre${connus.length > 9 ? 's' : ''}.</span>` : ''}`
    : `<span class="muted">${accord(v, 'Elle', 'Il')} ne connaît encore personne : les jours, le travail, les repas les lieront.</span>`;
  let foyer = '';
  if (f) {
    const autres = f.membres.filter((x) => x !== id).map((x) => trouverVillageois(state, x)).filter(Boolean);
    const enfant = f.enfant ? trouverVillageois(state, f.enfant) : null;
    const parents = v.enfant ? f.membres.map((x) => trouverVillageois(state, x)).filter(Boolean) : [];
    const qui = v.enfant ? `l'enfant de ${parents.map((p) => escapeHtml(p.prenom)).join(' et ')}` : `${accord(v, 'elle', 'il')} vit avec ${autres.map((p) => escapeHtml(p.prenom)).join(', ')}`;
    const refus = v.enfant || enfant || f.attend ? 'non' : enfantRefus(state, f.id);
    const gestes = enfant && !v.enfant ? ` · 👶 ${escapeHtml(enfant.prenom)}, leur enfant`
      : f.attend ? ' · 👶 un enfant viendra par le prochain bac'
      : refus === null ? ` <button type="button" class="btn small" data-action="liens-enfant" data-foyer="${escapeHtml(f.id)}" data-id="${e}">👶 Accueillir un enfant</button>`
      : !v.enfant && /lit d'enfant/.test(refus || '') ? ` <span class="muted">· avec un lit d'enfant chez eux, ils pourraient accueillir un enfant</span>` : '';
    foyer = `<dt>🏡 Foyer</dt><dd>${qui}${gestes}</dd>`;
  }
  return `${foyer}<dt>🤝 Liens</dt><dd>${liste}</dd>`;
}

// Le joueur propose à `a` et `b` de vivre ensemble : les maisons à deux lits qui conviennent.
export function ouvrirFoyer(a, b) {
  const va = trouverVillageois(state, a), vb = trouverVillageois(state, b);
  if (!va || !vb) return;
  const M = maisonsPourFoyer(state, a, b);
  const nom = (m) => (m.chez ? `La maison de ${escapeHtml(trouverVillageois(state, m.chez).prenom)}` : 'Une maison libre') + ` · 2 lits${m.enfant !== null ? ' et un lit d\'enfant' : ''}`;
  const lignes = M.map((m) => `<li><button type="button" class="villageois-ligne" data-action="liens-foyer-ok" data-a="${escapeHtml(a)}" data-b="${escapeHtml(b)}" data-maison="${m.boite}">🏡 <span><strong>${nom(m)}</strong></span></button></li>`).join('');
  openModal(`
    <h2 id="liens-foyer-title">🏡 Un foyer pour ${escapeHtml(va.prenom)} et ${escapeHtml(vb.prenom)}</h2>
    <p class="muted">Ils sont proches : ils aimeraient vivre sous le même toit. Choisis leur maison ; ils s'y installeront, chacun son lit, et y mangeront ensemble.</p>
    ${M.length ? `<ul class="villageois-liste">${lignes}</ul>` : `<p>Il leur faut une maison à deux lits : une pièce close avec deux lits d'adulte libres et une boîte aux lettres contre sa porte, où personne d'autre n'habite. Bâtis-la, ou ajoute un lit dans la maison de l'un d'eux.</p>`}
    <div class="row"><button type="button" class="btn primary" data-action="villageois-fiche" data-id="${escapeHtml(a)}" id="liens-foyer-close">Retour</button></div>`,
  { labelledBy: 'liens-foyer-title', className: 'modal bois villageois-modal', focus: '#liens-foyer-close', preventScroll: true });
}

// La vue d'ensemble : les foyers, puis qui est lié à qui (des proches aux camarades).
export function ouvrirLiensDuVillage() {
  const Q = quiEstLie(state);
  const mini = (id) => { const v = trouverVillageois(state, id); return v ? `<span class="villageois-portrait lien-portrait">${portrait(v)}</span>` : ''; };
  const foyers = Q.foyers.map((f) => `<li class="lien-ligne">${f.membres.map((m) => mini(m.id)).join('')}${f.enfant ? mini(f.enfant.id) : ''}
      <span><strong>${f.membres.map((m) => escapeHtml(m.prenom)).join(' et ')}</strong>${f.enfant ? ` <span class="muted">et ${escapeHtml(f.enfant.prenom)}</span>` : f.attend ? ' <span class="muted">· un enfant viendra par le bac</span>' : ''}</span></li>`).join('');
  const groupe = (nom) => {
    const l = Q.paires.filter((p) => p.nom === nom);
    if (!l.length) return '';
    return `<h3>${ICONES[nom]} ${nom === 'ami' ? 'Amis' : nom === 'proche' ? 'Proches' : 'Camarades'}</h3><ul class="liens-liste">${l.map((p) => `<li class="lien-ligne">${mini(p.a.id)}${mini(p.b.id)}
      <span><strong>${escapeHtml(p.a.prenom)}</strong> et <strong>${escapeHtml(p.b.prenom)}</strong></span> <span class="ami-jauge lien-jauge" role="img" aria-label="Lien : ${p.score} sur 100"><span style="width:${p.score}%"></span></span></li>`).join('')}</ul>`;
  };
  const rien = !Q.foyers.length && !Q.paires.length;
  openModal(`
    <h2 id="liens-village-title">🤝 Les liens du village</h2>
    <p class="muted">Les villageois se lient en vivant ensemble : voisins, au même poste, à la même table, en se rendant visite. Les liens ne se défont pas.</p>
    ${foyers ? `<h3>🏡 Les foyers</h3><ul class="liens-liste">${foyers}</ul>` : ''}
    ${groupe('proche')}${groupe('ami')}${groupe('camarade')}
    ${rien ? '<p>Personne n\'est encore lié : laisse-leur quelques jours.</p>' : ''}
    <div class="row"><button type="button" class="btn primary" data-action="villageois-liste" id="liens-village-close">Retour</button></div>`,
  { labelledBy: 'liens-village-title', className: 'modal bois villageois-modal', focus: '#liens-village-close', preventScroll: true });
}

// Un avis de la nuit (`quoi` : « lien_ami:vg-2 », « lien_proche:… », « foyer:… », « enfant:… », « entraide:… ») pour le
// villageois `v` : la notification. → true s'il était pour cette page.
export function direAvisLien(v, quoi) {
  const [sorte, autre] = String(quoi).split(':');
  const o = autre ? trouverVillageois(state, autre) : null;
  if (!o) return false;
  if (sorte === 'lien_ami') notify(`😊 ${escapeHtml(v.prenom)} et ${escapeHtml(o.prenom)} sont devenus amis.`, { kind: 'info' });
  else if (sorte === 'lien_proche') notify(`💞 ${escapeHtml(v.prenom)} et ${escapeHtml(o.prenom)} sont maintenant proches : ils ne se quittent plus.`, { kind: 'info' });
  else if (sorte === 'foyer') notify(`🏡 ${escapeHtml(v.prenom)} et ${escapeHtml(o.prenom)} s'installent ensemble.`, { kind: 'info' });
  else if (sorte === 'enfant') notify(`👶 ${escapeHtml(o.prenom)} est arrivé${accord(o, 'e', '')} par le bac : ${accord(o, 'elle', 'il')} vit chez ${escapeHtml(v.prenom)}.`, { kind: 'info' });
  else if (sorte === 'entraide') notify(`🍲 ${escapeHtml(o.prenom)} a apporté un repas à ${escapeHtml(v.prenom)}, qui se reposait.`, { kind: 'info' });
  else return false;
  return true;
}

registerActions({
  'liens-village': () => ouvrirLiensDuVillage(),
  'liens-foyer': (target) => ouvrirFoyer(target.dataset.a, target.dataset.b),
  'liens-foyer-ok': (target) => {
    const { a, b } = target.dataset, r = formerFoyer(state, a, b, Number(target.dataset.maison));
    if (!r.ok) { notify(r.error, { kind: 'alerte' }); return; }
    const va = trouverVillageois(state, a), vb = trouverVillageois(state, b);
    notify(`🏡 ${escapeHtml(va.prenom)} et ${escapeHtml(vb.prenom)} s'installent ensemble.`, { kind: 'info' });
    if (Array.isArray(va.avis)) va.avis = va.avis.filter((x) => !x.startsWith('foyer:'));
    persistState();
    refresh();
    ouvrirFicheVillageois(a);
  },
  'liens-enfant': (target) => {
    const r = accueillirEnfant(state, target.dataset.foyer);
    if (!r.ok) { notify(r.error, { kind: 'alerte' }); return; }
    notify('👶 C\'est entendu : un enfant viendra par le prochain bac.', { kind: 'info' });
    persistState();
    refresh();
    ouvrirFicheVillageois(target.dataset.id);
  },
});
