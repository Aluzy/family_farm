import { DATA } from './catalog.js';
import { mulberry32 } from './base.js';
import { fail } from './devices.js';
import { hourOfDay } from './clock.js';
import { hache } from './ferme-generee.js';
import { validApparence } from './family.js';
import { countItem, takeItem } from './inventory.js';
import { habitantsDe, metierHabitant } from './habitants.js';
import { rassasierFamille, repasJour } from './repas.js';
import { RECIT } from './recit.js';
import { ajouterAmitie, amitieDe, cleDe, fiche, goutPour, palierAmitie, styleHabitant, trouverPnj } from './amitie.js';
import { admireLeCoin, phraseAdmire, STYLES, tableDuRepas } from './styles.js';

/* ---------- les invitations à un repas (data/amitie.json, AMITIE.INVITATION) ----------

   Depuis le calendrier, le joueur invite à un repas des personnes à qui il a déjà parlé (les habitants des
   hameaux, dont les personnages écrits) : un jour à venir, un moment (le déjeuner, le dîner). Achille, le
   cocher, porte le message pendant sa tournée ; la nuit, chacun répond (selon son palier d'amitié), et les
   réponses sont annoncées au matin (la page : js/ui/invitations.js).

   Le jour dit, de VIENNENT heures avant l'heure du repas à ATTENTE heures après, ceux qui ont dit oui viennent
   à la ferme (la carte : js/carte/ferme/invites.js) et s'assoient à la table (une table de jardin et ses
   chaises : la terrasse ; sinon la table de la maison). Le joueur qui vient à table sert le repas
   (servirRepas) : des plats de l'inventaire, selon les goûts de chacun ; l'amitié monte, la famille est plus
   heureuse cette nuit, et chaque invité en garde le souvenir, dont il parle ensuite (souvenirParole). Un repas
   manqué (personne à table) ne fait rien perdre.

   state.invitations = { seq, liste: [{ id, jour, moment, envoye (le jour où Achille a pris le message),
     etat: 'envoyee' | 'repondue' | 'servie' | 'manquee', invites: [{ hameau, id, cle, prenom, reponse:
     'oui' | 'non' | null }], annonce (les réponses dites au matin), servi: { plats, terrasse } }] }
   Une invitation passée (servie ou manquée) quitte la liste la nuit ; son souvenir reste dans l'amitié
   (state.amitie.pnj[clé].souvenirs = [{ jour, plat, terrasse }]). */

export const INVITATION = DATA.AMITIE.INVITATION;
const objet = (v) => !!v && typeof v === 'object' && !Array.isArray(v);
const jourDe = (state) => Math.max(1, Math.floor(Number(state.day) || 1));

// Les invitations de la partie (réparées : une ancienne partie n'en a pas).
export function invitationsDe(state) {
  if (!objet(state.invitations)) state.invitations = {};
  const I = state.invitations;
  if (!Array.isArray(I.liste)) I.liste = [];
  if (!Number.isInteger(I.seq)) I.seq = 0;
  return I;
}

// Les personnes qu'on peut inviter : celles à qui l'on a déjà parlé (ou que le récit a fait connaître). →
// [{ hameau, hameauNom, id, cle, prenom, enfant, metier, palier, nomPalier }], par palier puis par prénom.
export function relationsInvitables(state) {
  const a = amitieDe(state), out = [];
  for (const [hid, h] of Object.entries(habitantsDe(state))) {
    for (const f of (h && h.foyers) || []) for (const m of f.membres || []) {
      const cle = cleDe(m), p = a.pnj[cle];
      const connu = (p && (Number.isFinite(p.parle) || Number.isFinite(p.vu))) || (RECIT.PERSONNAGES[cle] && palierAmitie(state, cle) > 0);
      if (!connu) continue;
      const palier = palierAmitie(state, cle);
      out.push({ hameau: hid, hameauNom: h.nom, id: m.id, cle, prenom: m.prenom, enfant: !!m.enfant, metier: metierHabitant(h, m), palier, nomPalier: RECIT.PALIER_NOMS[palier] });
    }
  }
  return out.sort((x, y) => y.palier - x.palier || (x.prenom < y.prenom ? -1 : x.prenom > y.prenom ? 1 : 0));
}

// L'invitation `id`, ou null.
export function invitation(state, id) {
  return invitationsDe(state).liste.find((x) => x.id === id) || null;
}

// Les invitations à venir (et celle d'aujourd'hui), par date.
export function invitationsAVenir(state) {
  const j = jourDe(state);
  return invitationsDe(state).liste.filter((x) => x.jour >= j && (x.etat === 'envoyee' || x.etat === 'repondue' || x.etat === 'servie')).sort((x, y) => x.jour - y.jour || INVITATION.MOMENTS[x.moment].heure - INVITATION.MOMENTS[y.moment].heure);
}

// Inviter : `jour` (de DELAI[0] à DELAI[1] jours plus tard), `moment` (MOMENTS), `qui` : [{ hameau, id }].
// Achille prend le message aujourd'hui. → { ok, invitation } ou un refus.
export function inviter(state, jour, moment, qui) {
  const j = jourDe(state), I = INVITATION;
  const d = Math.floor(Number(jour));
  if (!Number.isFinite(d) || d < j + I.DELAI[0] || d > j + I.DELAI[1]) return fail(`Choisis un jour entre demain et dans ${I.DELAI[1]} jours : Achille doit avoir le temps de porter le message.`);
  if (!I.MOMENTS[moment]) return fail('Choisis le déjeuner ou le dîner.');
  if (!Array.isArray(qui) || !qui.length) return fail('Choisis au moins une personne à inviter.');
  if (qui.length > I.INVITES_MAX) return fail(`${I.INVITES_MAX} invités au plus autour de la table.`);
  const L = invitationsDe(state);
  if (L.liste.some((x) => x.jour === d && x.moment === moment && x.etat !== 'manquee')) return fail(`Il y a déjà une invitation pour ${I.MOMENTS[moment].nom} ce jour-là.`);
  const connus = new Map(relationsInvitables(state).map((r) => [`${r.hameau}|${r.id}`, r]));
  const invites = [];
  for (const q of qui) {
    const r = q && connus.get(`${q.hameau}|${q.id}`);
    if (!r) return fail('On n\'invite que les personnes à qui l\'on a déjà parlé.');
    if (invites.some((x) => x.cle === r.cle)) continue;
    invites.push({ hameau: r.hameau, id: r.id, cle: r.cle, prenom: r.prenom, reponse: null });
  }
  L.seq += 1;
  const inv = { id: `inv${L.seq}`, jour: d, moment, envoye: j, etat: 'envoyee', invites, annonce: false, servi: null };
  L.liste.push(inv);
  return { ok: true, invitation: inv };
}

// Annuler une invitation qui n'a pas encore eu lieu.
export function annulerInvitation(state, id) {
  const L = invitationsDe(state), k = L.liste.findIndex((x) => x.id === id);
  if (k < 0) return fail('Cette invitation n\'existe plus.');
  if (L.liste[k].etat === 'servie') return fail('Le repas a déjà eu lieu.');
  L.liste.splice(k, 1);
  return { ok: true };
}

// La réponse de la personne `cle` à l'invitation : un tirage fixe (de l'invitation et de la personne)
// contre ACCEPTE[son palier].
function repond(state, inv, cle) {
  const rnd = mulberry32(hache(`invitation:${inv.id}:${inv.jour}:${cle}`));
  const chance = INVITATION.ACCEPTE[palierAmitie(state, cle)] ?? 100;
  return rnd() * 100 < chance ? 'oui' : 'non';
}

// La nuit (runNight, avant que le jour change) : Achille a porté les messages du jour (chacun répond) ;
// les invitations d'aujourd'hui qui n'ont pas eu lieu sont manquées (rien n'est perdu) ; les passées quittent
// la liste. → { reponses: [id], manquees: [id] }.
export function invitationsNuit(state) {
  const L = invitationsDe(state), j = jourDe(state), out = { reponses: [], manquees: [] };
  for (const inv of L.liste) {
    if (inv.etat === 'envoyee') {
      for (const q of inv.invites) q.reponse = trouverPnj(state, q.hameau, q.id) ? repond(state, inv, q.cle) : 'non';
      inv.etat = 'repondue';
      inv.annonce = false;
      out.reponses.push(inv.id);
    }
    if (inv.jour <= j && inv.etat === 'repondue') { inv.etat = 'manquee'; out.manquees.push(inv.id); }
  }
  L.liste = L.liste.filter((x) => x.jour > j);
  return out;
}

// Les réponses pas encore annoncées (au matin) : [{ id, jour, moment, oui: [prénom], non: [prénom] }] ; elles
// sont marquées annoncées.
export function reponsesAAnnoncer(state) {
  const out = [];
  for (const inv of invitationsDe(state).liste) {
    if (inv.etat !== 'repondue' || inv.annonce) continue;
    inv.annonce = true;
    out.push({ id: inv.id, jour: inv.jour, moment: inv.moment, oui: inv.invites.filter((q) => q.reponse === 'oui').map((q) => q.prenom), non: inv.invites.filter((q) => q.reponse === 'non').map((q) => q.prenom) });
  }
  return out;
}

// L'invitation du moment : aujourd'hui, de VIENNENT heures avant l'heure du repas à ATTENTE heures après,
// au moins un invité qui a dit oui ; ou null.
export function invitationDuMoment(state) {
  const j = jourDe(state), h = hourOfDay(state), I = INVITATION;
  for (const inv of invitationsDe(state).liste) {
    if (inv.jour !== j || (inv.etat !== 'repondue' && inv.etat !== 'servie')) continue;
    const H = I.MOMENTS[inv.moment].heure;
    if (h < H - I.VIENNENT || h >= H + I.ATTENTE) continue;
    if (!inv.invites.some((q) => q.reponse === 'oui')) continue;
    return inv;
  }
  return null;
}

// Pour la carte : l'invitation du moment, ses invités (leur personnage, d'où ils viennent), ou null.
export function invitesModele(state) {
  const inv = invitationDuMoment(state);
  if (!inv) return null;
  const H = habitantsDe(state), P = INVITATION.PAROLES;
  const invites = [];
  for (const q of inv.invites) {
    if (q.reponse !== 'oui') continue;
    const t = trouverPnj(state, q.hameau, q.id);
    if (!t) continue;
    const h = H[q.hameau];
    // (le coin de la table est de son style : il l'admire en arrivant, js/engine/styles.js)
    const style = styleHabitant(state, t);
    const admire = admireLeCoin(state, style) ? phraseAdmire(style, invites.length) : null;
    invites.push({ id: q.id, hameau: q.hameau, hameauNom: h.nom, prenom: t.m.prenom, perso: t.m.perso, apparence: validApparence(t.m.apparence, !!t.m.enfant), enfant: !!t.m.enfant, metier: metierHabitant(h, t.m), depart: Number.isInteger(h.case) ? h.case : null, admire });
  }
  if (!invites.length) return null;
  return { id: inv.id, moment: inv.moment, nom: INVITATION.MOMENTS[inv.moment].nom, etat: inv.etat, invites, paroles: { arrive: P.ARRIVE, table: P.TABLE, merci: P.MERCI, seul: P.SEUL } };
}

// Ce qui se sert : les plats de l'inventaire (et les fruits, les produits qui se mangent tels quels).
export function platsServables(state) {
  return Object.keys(state.inventaire || {}).filter((it) => {
    const d = DATA.OBJETS[it];
    return d && countItem(state, it) >= 1 && (d.plat || (d.mangeable && (d.categorie === 'fruit' || d.categorie === 'conserve')));
  }).sort((a, b) => (DATA.OBJETS[b].plat ? 1 : 0) - (DATA.OBJETS[a].plat ? 1 : 0) || (DATA.OBJETS[a].nom < DATA.OBJETS[b].nom ? -1 : 1));
}

// Servir le repas de l'invitation `id` : `plats` (REPAS.PLATS_MAX au plus, un de chaque, pris dans
// l'inventaire), `terrasse` (la table est une table de jardin). → { ok, invites: [{ id, prenom, points,
// emotion ('joie' | 'degout' | null), gouts: { plat: goût } }], plats, terrasse } ou un refus.
export function servirRepas(state, id, plats = [], terrasse = false) {
  const inv = invitation(state, id), R = INVITATION.REPAS;
  if (!inv || invitationDuMoment(state) !== inv) return fail('Ce repas n\'est pas maintenant.');
  if (inv.etat === 'servie') return fail('Le repas est déjà servi.');
  const choisis = [...new Set((plats || []).filter((it) => DATA.OBJETS[it]))];
  if (choisis.length > R.PLATS_MAX) return fail(`${R.PLATS_MAX} plats au plus.`);
  if (choisis.some((it) => countItem(state, it) < 1)) return fail('Il te manque un de ces plats.');
  for (const it of choisis) takeItem(state, it, 1);
  // la famille mange avec eux : les plats comptent dans ses repas du jour ; elle vise plus haut cette nuit
  const RJ = repasJour(state);
  if (!objet(RJ.mange)) RJ.mange = {};
  for (const it of choisis) RJ.mange[it] = (RJ.mange[it] || 0) + 1;
  RJ.fete = (RJ.fete || 0) + R.BONHEUR;
  // (un repas partagé : l'objectif « repas » des chapitres, le jalon de maîtrise)
  if (state.campagne && state.campagne.compteurs) state.campagne.compteurs.repasInvites = (state.campagne.compteurs.repasInvites || 0) + 1;
  // (à table avec eux, la famille mange à sa faim)
  if (choisis.length) rassasierFamille(state);
  // (le plat dont on se souvient : le meilleur pour lui, le premier servi à égalité)
  const rang = { adore: 3, aime: 2, neutre: 1, deteste: 0 };
  const out = [];
  for (const q of inv.invites) {
    if (q.reponse !== 'oui') continue;
    const t = trouverPnj(state, q.hameau, q.id);
    if (!t) continue;
    const gouts = {};
    let pts = choisis.length ? R.BASE : Math.ceil(R.BASE / 2), meilleur = null;
    for (const it of choisis) {
      const g = goutPour(t.m, it);
      gouts[it] = g;
      pts += R.GOUT[g] || 0;
      if (!meilleur || rang[g] > rang[gouts[meilleur]]) meilleur = it;
    }
    if (terrasse) pts += R.TERRASSE;
    // (le coin de la table est de son style : il l'admire ; son style est connu désormais)
    const style = styleHabitant(state, t), admire = admireLeCoin(state, style);
    if (admire) pts += STYLES.BONUS_REPAS;
    pts = Math.max(1, pts);
    ajouterAmitie(state, t.cle, pts);
    const p = fiche(state, t.cle);
    p.vu = jourDe(state);
    p.styleVu = true;
    for (const [it, g] of Object.entries(gouts)) p.gouts[it] = g;
    if (!Array.isArray(p.souvenirs)) p.souvenirs = [];
    p.souvenirs.push({ jour: jourDe(state), plat: meilleur, terrasse: !!terrasse });
    p.souvenirs = p.souvenirs.slice(-INVITATION.SOUVENIR.MAX);
    const vals = Object.values(gouts);
    const emotion = vals.includes('adore') || vals.includes('aime') || (!vals.includes('deteste') && pts > 0) ? 'joie' : 'degout';
    out.push({ id: q.id, prenom: t.m.prenom, points: pts, emotion: admire ? 'joie' : emotion, gouts, style, admire });
  }
  inv.etat = 'servie';
  inv.servi = { plats: choisis, terrasse: !!terrasse };
  return { ok: true, invites: out, plats: choisis, terrasse: !!terrasse };
}

// Ce que la personne `cle` dit d'un repas partagé, à la première conversation du jour : son dernier souvenir
// (les RECENT jours qui suivent ; puis une fois jusqu'à ANCIEN jours). → la phrase, ou null.
export function souvenirParole(state, cle) {
  const p = amitieDe(state).pnj[cle], S = INVITATION.SOUVENIR, P = INVITATION.PAROLES;
  if (!p || !Array.isArray(p.souvenirs) || !p.souvenirs.length) return null;
  const s = p.souvenirs[p.souvenirs.length - 1], age = jourDe(state) - s.jour;
  if (age < 1 || age > S.ANCIEN) return null;
  if (age > S.RECENT) {
    if (s.ancien) return null;
    s.ancien = true;
    return P.SOUVENIR_ANCIEN;
  }
  const d = s.plat && DATA.OBJETS[s.plat];
  if (!d) return P.SOUVENIR_SIMPLE;
  return (s.terrasse ? P.SOUVENIR_TERRASSE : P.SOUVENIR_MAISON).replace('{plat}', d.nom);
}
