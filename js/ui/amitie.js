import { DATA } from '../engine/catalog.js';
import { escapeHtml, formatQty } from '../engine/format.js';
import { asleep } from '../engine/night.js';
import { countItem } from '../engine/inventory.js';
import {
  AMITIE, amitieAvec, amitieDe, cadeauxPossibles, HAMEAU_VILLAGE, offrir, palierAmitie, parlerAmitie, presentsPorte, ramasserPresents,
  trouverPnj, visiterHameau,
} from '../engine/amitie.js';
import { offrirVillageois } from '../engine/villageois-amitie.js';
import { souvenirParole } from '../engine/invitations.js';
import { merciProjet } from '../engine/projets.js';
import { demandeHtml } from './demandes.js';
import { registerActions, SOMMEIL_MESSAGE } from './actions.js';
import { closeModal, openModal } from './modal.js';
import { itemsText } from './common.js';
import { enLigne, state } from './store.js';
import { executer } from './commandes.js';
import { persistState } from './storage.js';
import { refresh } from './render.js';
import { notify } from './toasts.js';

/* ---------- l'amitié avec les habitants, côté page (js/engine/amitie.js) ----------

   - la conversation (paroleDepuisCarte, js/ui/habitants.js) : la première du jour fait monter l'amitié (plus
     encore aux retrouvailles, après une longue absence : jamais de perte) ;
     la bulle de l'habitant montre son palier, sa jauge et un bouton « 🎁 Offrir » ;
   - la fenêtre « Offrir » : sa jauge, ses goûts déjà découverts, ce qu'on a à lui offrir (un cadeau par
     jour) ; la carte montre sa réaction (FarmStage.emotion : la joie, le dégoût) ;
   - le passage dans un hameau (visiteDuHameau, appelé par js/ui/stage.js) ;
   - les présents des amis devant la porte : annoncés au matin (watchPresents), pris par le personnage qui
     passe devant la porte (presentsDepuisCarte).
   Fiche I6a : la même fenêtre « Offrir » sert aux villageois (data-hameau = HAMEAU_VILLAGE : offrirVillageois) ;
   la carte montre sa réaction et ce qu'il dit (FarmStage.villageoisDit), puis le goût qu'il te confie. */

// « ce que Basile », « ce qu'Odile »
const queDe = (prenom) => (/^[aeiouyhàâéèêëîïôûAEIOUYHÀÂÉÈÊËÎÏÔÛ]/.test(prenom) ? `ce qu'${escapeHtml(prenom)}` : `ce que ${escapeHtml(prenom)}`);

const GOUT = {
  adore: { icone: '❤️', mot: 'adore' },
  aime: { icone: '👍', mot: 'aime' },
  neutre: { icone: '🙂', mot: 'neutre' },
  deteste: { icone: '👎', mot: 'déteste' },
};

// La conversation avec l'habitant (le pont de la carte) : ce que la bulle montre de l'amitié, et sa réaction
// ({ amitie, emotion, retrouvailles, souvenir (sa phrase d'un repas partagé) }), ou null.
export function amitieParole(hameau, id, activite) {
  if (activite === 'dort') return null;
  const t = trouverPnj(state, hameau, id);
  if (!t) return null;
  const g = parlerAmitie(state, hameau, id);
  const A = amitieAvec(state, hameau, id);
  if (!g || !A) return null;
  if (g.monte) notify(`💛 ${escapeHtml(A.prenom)} et toi : ${A.nom} (amitié ${A.pts}/${A.max})`, { kind: 'info' });
  // (sa réaction à ta venue, la première fois du jour : la joie des retrouvailles, ou d'un ami)
  // (un repas partagé : il en parle, à la première conversation du jour, js/engine/invitations.js)
  const souvenir = g.premiere ? souvenirParole(state, A.cle) : null;
  // (un projet du hameau fini depuis peu : il remercie, js/engine/projets.js)
  const merci = g.premiere && !souvenir ? merciProjet(state, hameau, A.pts) : null;
  const emotion = g.premiere && (g.retrouvailles || souvenir || merci || palierAmitie(state, A.cle) >= AMITIE.HUMEUR.JOIE) ? 'joie' : null;
  return { amitie: { ...A, gain: g.gain }, emotion, retrouvailles: !!g.retrouvailles, souvenir, merci };
}

// Le personnage arrive dans le hameau `id` : le premier passage du jour (+VISITE pour ses habitants).
export function visiteDuHameau(id) {
  if (visiterHameau(state, id)) persistState();
}

// Le personnage passe devant la porte : il prend les présents. → { objet: n } (pour la bulle « +x »), ou null.
export function presentsDepuisCarte() {
  const pris = ramasserPresents(state);
  if (!pris.length) return null;
  const items = {};
  for (const x of pris) items[x.objet] = (items[x.objet] || 0) + x.n;
  const de = [...new Set(pris.map((x) => x.de))];
  notify(`🎁 ${escapeHtml(de.join(', '))} ${de.length > 1 ? 'ont' : 'a'} laissé devant ta porte : ${itemsText(items, 'gain')}`, { son: 'ramasse' });
  persistState();
  setTimeout(refresh, 0);   // (appelé pendant l'image de la carte : la vue se refait juste après)
  return items;
}

// Pour le modèle de la carte : les présents devant la porte.
export function presentsPourLaCarte() {
  return presentsPorte(state).map((x) => ({ de: x.de, objet: x.objet, n: x.n }));
}

// Au matin : un présent attend devant la porte (une annonce par jour).
export function watchPresents() {
  const L = presentsPorte(state), a = amitieDe(state);
  if (!L.length || a.annonce === state.day) return;
  a.annonce = state.day;
  const de = [...new Set(L.map((x) => x.de))];
  notify(`🎁 ${escapeHtml(de.join(', '))} ${de.length > 1 ? 'ont' : 'a'} laissé un présent devant ta porte. Passe le prendre !`, { kind: 'info' });
}

/* -- la fenêtre « Offrir » -- */

function jaugeHtml(A) {
  const suite = A.prochain !== null ? `encore ${A.prochain - A.pts} pour « ${DATA.AMITIE.ECHELLE.NOMS[A.palier + 1]} »` : 'le plus haut palier';
  return `<p class="ami-ligne"><span class="ami-palier">💛 ${escapeHtml(A.nom)}</span> <span class="ami-jauge grande" role="img" aria-label="Amitié : ${A.pts} sur ${A.max}"><span style="width:${Math.round((A.pts * 100) / A.max)}%"></span></span> <span class="muted num">${A.pts}/${A.max} · ${suite}</span></p>`;
}

function goutsHtml(A) {
  const par = { adore: [], aime: [], deteste: [] };
  for (const [it, g] of Object.entries(A.gouts)) if (par[g] && DATA.OBJETS[it]) par[g].push(`${DATA.OBJETS[it].icone} ${escapeHtml(DATA.OBJETS[it].nom)}`);
  const lignes = Object.entries(par).filter(([, l]) => l.length).map(([g, l]) => `<li>${GOUT[g].icone} ${GOUT[g].mot === 'adore' ? 'Adore' : GOUT[g].mot === 'aime' ? 'Aime' : 'Déteste'} : ${l.join(', ')}</li>`);
  return lignes.length ? `<ul class="ami-gouts">${lignes.join('')}</ul>` : '<p class="muted">Tu ne connais pas encore ses goûts : ils se découvrent en offrant.</p>';
}

function openOffrir(hameau, id) {
  const A = amitieAvec(state, hameau, id);
  if (!A) return;
  const L = cadeauxPossibles(state);
  const boutons = L.map((it) => {
    const o = DATA.OBJETS[it], g = A.gouts[it];
    const marque = g ? ` <span class="ami-marque" title="${GOUT[g].mot}">${GOUT[g].icone}</span>` : '';
    return `<button type="button" class="btn ami-cadeau" data-action="ami-offrir" data-hameau="${escapeHtml(hameau)}" data-id="${escapeHtml(id)}" data-item="${it}"${A.cadeauAujourdhui ? ' disabled' : ''}><span aria-hidden="true">${o.icone}</span> ${escapeHtml(o.nom)}${marque} <span class="muted num">×${formatQty(countItem(state, it))}</span></button>`;
  }).join('');
  openModal(`
    <h2 id="ami-titre">🎁 Offrir à ${escapeHtml(A.prenom)}</h2>
    ${jaugeHtml(A)}
    ${demandeHtml(id)}
    ${goutsHtml(A)}
    ${A.style ? `<p class="ami-style"><span aria-hidden="true">${A.style.icone}</span> Son style : <strong>${escapeHtml(A.style.nom)}</strong>. Invite-le à un repas près d'un coin ${escapeHtml(A.style.adj)} : il l'admirera.</p>` : '<p class="muted ami-style">Son style d\'aménagement préféré se découvre en partageant un repas, ou en devenant cordiaux.</p>'}
    <p class="muted">${A.cadeauAujourdhui ? `Tu lui as déjà offert un cadeau aujourd'hui : reviens demain.` : `Un cadeau par jour : ${queDe(A.prenom)} adore compte beaucoup (+${AMITIE.CADEAU.adore}), ce qui lui déplaît fait reculer l'amitié (−${Math.abs(AMITIE.CADEAU.deteste)}).`}</p>
    <div class="ami-cadeaux">${boutons || '<p class="muted">Rien à offrir : un aliment, un plat, un produit de la ferme.</p>'}</div>
    <button type="button" class="btn" data-action="close-modal">Fermer</button>`, { labelledBy: 'ami-titre', className: 'modal bois ami-modal' });
}

registerActions({
  'ami-offrir-open': (target) => {
    if (asleep(state)) { notify(SOMMEIL_MESSAGE); return; }
    openOffrir(target.dataset.hameau, target.dataset.id);
  },
  'ami-offrir': (target) => {
    if (asleep(state)) { notify(SOMMEIL_MESSAGE); return; }
    const { hameau, id, item } = target.dataset;
    const village = hameau === HAMEAU_VILLAGE;
    // (I9d : en ligne, sur une île, une commande : jouée chez soi, puis par le monde, avec son amitié à soi)
    const r = village ? (enLigne ? executer('villageois.offrir', { id, objet: item }) : offrirVillageois(state, id, item)) : offrir(state, hameau, id, item);
    closeModal();
    if (!r.ok) { notify(r.error, { son: 'erreur' }); return; }
    persistState();
    refresh();
    const o = DATA.OBJETS[item], n = escapeHtml(r.prenom);
    const quoi = `${o.icone} ${escapeHtml(o.nom)}`;
    const texte = r.gout === 'adore' ? `❤️ ${n} adore ça : ${quoi} ! (+${r.points})`
      : r.gout === 'aime' ? `😊 ${n} aime bien : ${quoi}. (+${r.points})`
        : r.gout === 'deteste' ? `🤢 ${n} n'aime pas du tout : ${quoi}… (−${Math.abs(r.points)})`
          : `🙂 ${n} te remercie pour : ${quoi}. (+${r.points})`;
    notify(texte + (r.monte ? ` · 💛 ${r.nom}` : ''), { kind: 'info' });
    if (r.emotion && window.FarmStage && window.FarmStage.emotion) window.FarmStage.emotion(id, r.emotion);
    // (un villageois : sa réaction dans sa bulle ; un palier passé, il te confie un goût)
    if (village && window.FarmStage && window.FarmStage.villageoisDit) {
      if (r.phrase) window.FarmStage.villageoisDit(id, r.phrase, 2600);
      if (r.confie) setTimeout(() => window.FarmStage.villageoisDit(id, r.confie.texte, 3800), 2800);
    }
    if (village && r.confie) {
      const c = DATA.OBJETS[r.confie.objet];
      notify(`💬 ${n} te confie un goût : ${r.confie.gout === 'adore' ? '❤️ adore' : r.confie.gout === 'aime' ? '👍 aime' : '👎 déteste'} ${c.icone} ${escapeHtml(c.nom)}.`, { kind: 'info' });
    }
  },
});
