import { DATA } from './catalog.js';
import { mulberry32 } from './base.js';
import { fail } from './devices.js';
import { hache } from './ferme-generee.js';
import { farmSeed } from './terrain.js';
import { addItem } from './inventory.js';
import { villageActif } from './village.js';
import { noterObjectif } from './objectifs-compte.js';
import { RECIT } from './recit.js';
import {
  AMITIE, HAMEAU_VILLAGE, amitieAvec, amitieDe, fiche, goutsTires, offrir, palierAmitie, parlerAmitie,
} from './amitie.js';
import { demandeDe, texteDemande } from './demandes.js';
import { souvenirParole } from './invitations.js';
import { CONDITIONS_PROPOS, direSujet } from './propos.js';
import { jourDeBac, trouverVillageois, villageoisDe } from './villageois.js';
import { connaissance } from './villageois-liens.js';
import { evenementsVillageois, foyerDe, liensVillageois, voisinDe } from './liens.js';
import { goutTache, noterIndice, partDesTraits, phraseTrait, sujetsDesTraits, traitsDe } from './traits.js';
import { figurants, souvenirsDe } from './chronique.js';
import { ileEnPhrase } from './noms.js';

/* ---------- l'amitié avec les villageois (le chantier « l'île à bâtir », fiche I6a) ----------

   Ce qui liait le joueur aux habitants des hameaux, rebranché sur les villageois. Rien n'est recopié : l'amitié
   d'un villageois est celle d'amitie.js (les mêmes paliers, RECIT.PALIERS ; les mêmes gains, data/amitie.json), sous
   le « hameau » HAMEAU_VILLAGE (state.amitie.pnj[l'id du villageois]) ; ses demandes sont celles de demandes.js, ses
   invitations celles d'invitations.js, ses propos ceux de propos.js. Ici, ce qui est propre à l'île (VILLAGE.AMITIE,
   data/village.json) :
     - l'arrivée : ACCUEIL points (villageois.js arriverVillageois) ; ses goûts tirés (amitie.js goutsTires) ;
     - parler (parlerVillageois, depuis la bulle de la carte) : la première conversation du jour fait monter l'amitié
       (AMITIE.PAROLE, plus RETROUVAILLES.BONUS après une longue absence) ; sa bulle dit, dans l'ordre : le présent qu'il
       te donne, le souvenir d'un repas partagé, sa demande, un goût qu'il te confie (CONFIE, dès « cordial »), un sujet
       du moment (VILLAGE.PROPOS), sinon ce qu'il fait ;
     - offrir (offrirVillageois) : un cadeau par jour, comme aux habitants ; sa réaction (PHRASES.cadeau) ; un palier
       passé, il te confie un goût ;
     - le présent d'un ami (RETOUR, la nuit : amitieVillageoisNuit) : il le garde pour toi et te le donne en main
       propre (donnerPresent : quand il te salue, ou que tu lui parles) ;
     - ce que l'amitié change, sans cadence d'usine et sans bonus de production : le salut au personnage
       (villageois-liens.js : plus chaleureux, de plus loin pour un ami proche), il dit ses goûts, il accepte une tâche
       qu'il n'aime pas sans perdre d'humeur dès TACHE_SANS_HUMEUR (tacheSansHumeur : les tâches qu'il aime viendront
       avec les traits, I6c), un artisan ami apprendra de nouvelles pièces (I5a : palierVillageois).
   Le réglage éteint, rien ici ne se lit : la partie n'a pas de villageois. */

const A = () => (DATA.VILLAGE && DATA.VILLAGE.AMITIE) || {};
const objet = (v) => !!v && typeof v === 'object' && !Array.isArray(v);
const jourDe = (state) => Math.max(1, Math.floor(Number(state && state.day) || 1));
const graineDe = (state) => farmSeed(state) || 'ile';
const rngDe = (cle) => mulberry32(hache(cle));
const nomObjet = (it) => (DATA.OBJETS[it] ? DATA.OBJETS[it].nom : it);
const minuscule = (t) => (t ? t.charAt(0).toLowerCase() + t.slice(1) : t);
const majuscule = (t) => (t ? t.charAt(0).toUpperCase() + t.slice(1) : t);
const un = (rnd, L) => (Array.isArray(L) && L.length ? L[Math.floor(rnd() * L.length)] : '');
const remplir = (t, mots) => String(t || '').replace(/\{(\w+)\}/g, (x, k) => (mots[k] !== undefined && mots[k] !== null ? String(mots[k]) : x));
const quoiTexte = (x) => `${x.n} × ${minuscule(nomObjet(x.objet))}`;

/* ---------- le palier, la fiche ---------- */

// Le palier d'amitié du joueur avec le villageois `id` (0 : inconnu … 4 : intime). I5a (un artisan ami apprend de
// nouvelles pièces) et les paliers de l'île (paliers.js, amitieVillageois) le lisent.
export function palierVillageois(state, id) {
  return palierAmitie(state, id);
}

// Accepte-t-il une tâche qu'il n'aime pas sans perdre d'humeur ? (dès le palier TACHE_SANS_HUMEUR ; I6c, les traits :
// traits.js goutTache dit quelle tâche il boude, bonheurDesTraits la lit)
export function tacheSansHumeur(state, id) {
  return palierAmitie(state, id) >= (Number(A().TACHE_SANS_HUMEUR) || 3);
}

// L'amitié avec le villageois `id`, pour sa fiche : celle d'amitie.js (amitieAvec : { pts, palier, nom, max,
// prochain, gouts (découverts), cadeauAujourdhui, style }), plus present ({ objet, n } : ce qu'il a pour toi, ou
// null), demande (sa demande ouverte, ou null), sansHumeur (tacheSansHumeur) ; null sans tel villageois.
export function amitieVillageois(state, id) {
  const B = amitieAvec(state, HAMEAU_VILLAGE, id);
  if (!B) return null;
  const p = amitieDe(state).pnj[id] || {};
  return { ...B, present: presentValide(p.present) ? { objet: p.present.objet, n: p.present.n } : null, demande: demandeDe(state, id), sansHumeur: tacheSansHumeur(state, id) };
}

/* ---------- ses goûts ---------- */

// Il te confie un de ses goûts que tu ne connais pas encore (d'abord ce qu'il adore, puis ce qu'il aime, puis ce qu'il
// déteste), noté dans ce que tu sais de lui. → { objet, gout, texte } ou null (tu sais déjà tout).
export function confierGout(state, v, rnd = rngDe(`${graineDe(state)}:confie:${v.id}:${jourDe(state)}`)) {
  const p = fiche(state, v.id), G = objet(v.gouts) ? v.gouts : {};
  for (const s of ['adore', 'aime', 'deteste']) {
    const L = Object.keys(G).filter((it) => G[it] === s && DATA.OBJETS[it] && !p.gouts[it]).sort();
    if (!L.length) continue;
    const it = L[Math.floor(rnd() * L.length)];
    p.gouts[it] = s;
    const nom = nomObjet(it);
    return { objet: it, gout: s, texte: remplir(un(rnd, (A().PHRASES || {}).gout[s]), { objet: minuscule(nom), Objet: majuscule(nom) }) };
  }
  return null;
}

/* ---------- le présent d'un ami ---------- */

const presentValide = (x) => objet(x) && !!DATA.OBJETS[x.objet] && Number.isInteger(x.n) && x.n > 0;

// Le métier des hameaux qui répond à sa tâche (ses présents, ses demandes) : VILLAGE.AMITIE.METIERS.
export function metierDeVillageois(v) {
  const M = A().METIERS || {};
  return M[v && v.tache] || M['*'] || 'jardinier';
}

// Il te donne le présent qu'il gardait pour toi : il entre dans l'inventaire. → { objet, n, texte (ce qu'il dit) },
// ou null (il n'en a pas).
export function donnerPresent(state, id) {
  const v = trouverVillageois(state, id);
  if (!v) return null;
  const p = fiche(state, id), x = p.present;
  if (!presentValide(x)) { delete p.present; return null; }
  addItem(state, x.objet, x.n);
  delete p.present;
  p.presents = (Number(p.presents) || 0) + 1;
  const rnd = rngDe(`${graineDe(state)}:present:${id}:${jourDe(state)}`);
  return { objet: x.objet, n: x.n, texte: remplir(un(rnd, (A().PHRASES || {}).present), { quoi: quoiTexte(x) }) };
}

// La nuit (runNight, après villageoisNuit) : un ami au palier RETOUR.PALIER ou plus prépare parfois un présent
// (RETOUR.CHANCE[palier] %), s'il n'en garde pas déjà un : un objet des présents de son métier (RETOUR.PRESENTS,
// METIERS). → { presents: [{ id, objet, n }] }, ou null (le réglage éteint, sans villageois).
export function amitieVillageoisNuit(state) {
  if (!villageActif(state) || state.mondePartage) return null;
  const V = villageoisDe(state);
  if (!V.length) return null;
  const R = AMITIE.RETOUR, jour = jourDe(state), out = { presents: [] };
  for (const v of V) {
    const rang = palierAmitie(state, v.id);
    if (rang < R.PALIER) continue;
    const p = fiche(state, v.id);
    if (presentValide(p.present)) continue;
    const rnd = rngDe(`${graineDe(state)}:present-villageois:${v.id}:${jour}`);
    if (rnd() * 100 >= (R.CHANCE[String(rang)] || 0)) continue;
    const table = Object.entries(R.PRESENTS[metierDeVillageois(v)] || {}).filter(([it]) => DATA.OBJETS[it]).sort((a, b) => (a[0] < b[0] ? -1 : 1));
    if (!table.length) continue;
    const [it, [de, a]] = table[Math.floor(rnd() * table.length)];
    p.present = { objet: it, n: de + Math.floor(rnd() * (a - de + 1)), jour };
    out.presents.push({ id: v.id, objet: it, n: p.present.n });
  }
  return out;
}

/* ---------- les propos ---------- */

// Les sujets du moment d'un villageois (VILLAGE.PROPOS) : ceux des habitants qu'il garde (GARDES) ou réécrit (les
// mêmes conditions, propos.js), et ceux de l'île.
const SUJETS_ILE = [
  ['village_ami', ({ state, v }) => {
    const L = villageoisDe(state).filter((o) => o.id !== v.id).map((o) => ({ o, c: connaissance(state, v.id, o.id) })).filter((x) => x.c && x.c.degre >= 2);
    L.sort((x, y) => y.c.score - x.c.score || (x.o.id < y.o.id ? -1 : 1));
    return L.length ? { ami: L[0].o.prenom } : null;
  }],
  ['village_voisin', ({ state, v }) => {
    const o = villageoisDe(state).find((x) => x.id !== v.id && (connaissance(state, v.id, x.id) || {}).degre === 1);
    return o ? { voisin: o.prenom } : null;
  }],
  ['village_collegue', ({ state, v }) => {
    const o = v.tache && villageoisDe(state).find((x) => x.id !== v.id && x.tache === v.tache);
    return o ? { collegue: o.prenom } : null;
  }],
  ['village_nouveau', ({ state, v }) => {
    const o = villageoisDe(state).find((x) => x.id !== v.id && jourDe(state) - (Number(x.arrive) || 0) <= 3 && (Number(x.arrive) || 0) > (Number(v.arrive) || 0));
    return o ? { qui: o.prenom } : null;
  }],
  ['village_depuis', ({ state, v }) => {
    const j = jourDe(state) - (Number(v.arrive) || 0);
    return j >= 5 ? { jours: j } : null;
  }],
  ['port_bac', ({ state }) => (jourDeBac(state, jourDe(state) + 1) ? {} : null)],
  // I6b (liens.js) : ses liens et ce qui s'est passé entre villageois (les sujets des habitants, sur les liens de l'île)
  ['voisin', ({ state, v }) => {
    const o = voisinDe(state, v);
    return o ? { voisin: o.prenom } : null;
  }],
  ['lien_ami', ({ state, v }) => {
    const o = liensVillageois(state, v.id).find((l) => l.palier >= 3 && !l.enfant);
    return o ? { ami: o.prenom, il_ami: o.genre === 'm' ? 'il' : 'elle' } : null;
  }],
  ['visite_recue', ({ state, v }) => {
    const e = evenementsVillageois(state, v.id).filter((x) => x.sorte === 'visite' && x.chez === v.id).pop();
    return e ? { qui: e.quiPrenom, e_qui: e.quiGenre === 'm' ? '' : 'e' } : null;
  }],
  ['visite_faite', ({ state, v }) => {
    const e = evenementsVillageois(state, v.id).filter((x) => x.sorte === 'visite' && x.qui === v.id).pop();
    return e ? { chez: e.chezPrenom } : null;
  }],
  ['entraide_recue', ({ state, v }) => {
    const e = evenementsVillageois(state, v.id).filter((x) => x.sorte === 'entraide' && x.chez === v.id).pop();
    return e ? { qui: e.de } : null;
  }],
  ['entraide_donnee', ({ state, v }) => {
    const e = evenementsVillageois(state, v.id).filter((x) => x.sorte === 'entraide' && x.qui === v.id).pop();
    return e ? { aide: e.a } : null;
  }],
  ['foyer', ({ state, v }) => {
    const f = foyerDe(state, v.id), o = f && !v.enfant && f.membres.find((x) => x !== v.id);
    const c = o && trouverVillageois(state, o);
    return c ? { conjoint: c.prenom } : null;
  }],
  ['enfant', ({ state, v }) => {
    const f = foyerDe(state, v.id), e = f && !v.enfant && f.enfant && trouverVillageois(state, f.enfant);
    return e ? { enfant: e.prenom, il_enfant: e.genre === 'm' ? 'Il' : 'Elle' } : null;
  }],
];
// I7g (chronique.js) : un souvenir, une ligne de la chronique où il figure (souvenir_<type> : son arrivée, un lien devenu
// proche, un foyer, un commerce ouvert, le dixième villageois, une fête ou un projet du village où il était), la plus
// récente de ce type, vieille de CHRONIQUE.SOUVENIR.DEPUIS à JUSQUA jours. Les noms : ceux du jour de la ligne.
for (const type of ['villageois', 'proche', 'foyer', 'commerce', 'dixieme', 'fete', 'projet']) {
  SUJETS_ILE.push([`souvenir_${type}`, ({ state, v }) => {
    const l = souvenirsDe(state, v.id).find((x) => x.type === type);
    if (!l) return null;
    const d = l.d || {}, autreId = figurants(l).find((x) => x !== v.id);
    const autre = autreId ? (autreId === d.a ? d.pa : autreId === d.b ? d.pb : null) || (trouverVillageois(state, autreId) || {}).prenom : null;
    if ((type === 'proche' || type === 'foyer') && !autre) return null;
    const mots = { jours: jourDe(state) - l.jour, jour: l.jour, village: d.village || ileEnPhrase(d.ile) || 'l\'île' };
    if (autre) mots.autre = autre;
    if (d.commerce) mots.commerce = d.commerce;
    if (type === 'fete' && d.nom) mots.fete = d.nom;
    if (type === 'projet' && d.nom) mots.projet = d.nom;
    for (const k of ['commerce', 'fete', 'projet']) if (mots[k]) mots[k.charAt(0).toUpperCase() + k.slice(1)] = mots[k].charAt(0).toUpperCase() + mots[k].slice(1);
    return mots;
  }]);
}
const CONDITIONS_ILE = Object.fromEntries(SUJETS_ILE);

// Les sujets vrais pour le villageois `v` : [{ id, mots }] (les mots comptent {e}, l'accord de celui qui parle).
export function sujetsVillageois(state, v) {
  const P = (DATA.VILLAGE && DATA.VILLAGE.PROPOS) || {};
  const ids = [...(P.GARDES || []), ...Object.keys(P).filter((k) => k !== 'GARDES' && Array.isArray(P[k]))];
  const ctx = { state, cle: v.id, v }, out = [];
  for (const id of [...new Set(ids)]) {
    const cond = CONDITIONS_ILE[id] || CONDITIONS_PROPOS[id];
    if (!cond) continue;
    const mots = cond(ctx);
    if (mots) out.push({ id, mots: { e: v.genre === 'm' ? '' : 'e', ...mots } });
  }
  return out;
}

// Un sujet du moment (les phrases : celles de VILLAGE.PROPOS, sinon celles des habitants pour un sujet gardé), tiré
// par `rnd` : { id, texte }, ou null (rien de neuf à dire). Le sujet dit entre dans sa mémoire (propos.js).
export function proposVillageois(state, v, rnd) {
  const P = (DATA.VILLAGE && DATA.VILLAGE.PROPOS) || {}, H = DATA.HABITANTS.PROPOS;
  const phrases = {};
  for (const id of P.GARDES || []) if (Array.isArray(H[id])) phrases[id] = H[id];
  for (const [id, L] of Object.entries(P)) if (id !== 'GARDES' && Array.isArray(L)) phrases[id] = L;
  // (I6c : ses traits pèsent sur les sujets : le gourmand parle de plats, le rêveur de la lune)
  return direSujet(state, v.id, sujetsVillageois(state, v), phrases, rnd, sujetsDesTraits(v));
}

/* ---------- parler, offrir ---------- */

// On parle au villageois (un appui sur lui, la carte) : `r` est sa bulle (villageois-journee.js paroleVillageois :
// { salut, texte, etat… }), que l'amitié complète : r.amitie (amitieAvec, et gain : ce que la conversation a donné),
// r.monte (un palier passé), r.emotion ('joie' : un ami, des retrouvailles, un souvenir, un présent ; ou null),
// r.present ({ objet, n } : il te l'a donné), r.demande (l'id de sa demande, qu'il dit), r.gout (un goût confié),
// r.propos (un sujet du moment), r.retrouvailles ; I6c : r.trait (le trait dont il a parlé), r.revele (le trait qui
// vient de se révéler : la page le dit). `o.n` : le rang de l'appui (le tirage). Endormi : rien ne change.
// → r.
export function parlerVillageois(state, id, r, o = {}) {
  if (!r || r.etat === 'dormir') return r;
  const v = trouverVillageois(state, id);
  if (!v) return r;
  const g = parlerAmitie(state, HAMEAU_VILLAGE, id);
  if (!g) return r;
  const B = amitieAvec(state, HAMEAU_VILLAGE, id);
  r.amitie = { ...B, gain: g.gain };
  r.monte = !!g.monte;
  r.retrouvailles = !!g.retrouvailles;
  const rnd = rngDe(`${graineDe(state)}:amitie-parole:${id}:${jourDe(state)}:${Math.max(0, Math.floor(Number(o.n) || 0))}`);
  const P = A().PHRASES || {};
  let special = null, joie = false;
  // (il te donne le présent qu'il gardait)
  const cadeau = donnerPresent(state, id);
  if (cadeau) { r.present = { objet: cadeau.objet, n: cadeau.n }; special = cadeau.texte; joie = true; }
  // (un repas partagé : il s'en souvient, à la première conversation du jour)
  if (!special && g.premiere) { const s = souvenirParole(state, id); if (s) { special = s; joie = true; } }
  // (sa demande ouverte, il la dit : à la première conversation du jour, puis une fois sur deux)
  const d = demandeDe(state, id);
  if (d) r.demande = d.id;
  if (!special && d && (g.premiere || Math.floor(Number(o.n) || 0) % 2 === 0)) special = texteDemande(d);
  // (dès « cordial », il te confie parfois un de ses goûts)
  const C = A().CONFIE || {};
  if (!special && g.premiere && B.palier >= (Number(C.PALIER) || 2) && rnd() < (Number(C.CHANCE) || 0)) {
    const c = confierGout(state, v, rnd);
    if (c) { special = c.texte; r.gout = { objet: c.objet, gout: c.gout }; r.amitie.gouts = { ...r.amitie.gouts, [c.objet]: c.gout }; }
  }
  // (un sujet du moment : la ferme, l'île, ses amis, le bac, la lune… ; pas au travail, pas s'il attend son outil)
  const attend = (((DATA.VILLAGE.PHRASES || {}).ACTIVITE || {}).attend || []).some((x) => String(r.texte || '').startsWith(String(x).split('{raison}')[0]));
  // (I6c, traits.js : une fois sur PAROLE.CHANCE, il parle de lui, d'un trait (plutôt un qu'on ne connaît pas encore) ;
  // l'entendre DIT fois le révèle ; il n'y a de tirage que s'il a des traits)
  if (!special && traitsDe(v).length && r.etat !== 'repos' && !attend && rnd() < (Number(((DATA.TRAITS || {}).PAROLE || {}).CHANCE) || 0)) {
    const t = phraseTrait(v, rnd);
    if (t) { special = t.texte; r.trait = t.trait; if (noterIndice(state, v, t.trait, 'dit')) r.revele = t.trait; }
  }
  // (au travail, à la tâche qu'il aime ou qu'il boude : il le dit, une fois sur deux ; TRAITS.PAROLE.POSTE)
  if (r.etat === 'travail' && !special) {
    const g = goutTache(v, v.tache), G = ((DATA.TRAITS || {}).PAROLE || {}).POSTE;
    if (g && G && Array.isArray(G[g]) && rnd() < 0.5) special = un(rnd, G[g]);
  }
  // (I6c : le bavard en dit plus souvent, le réservé moins : partDesTraits)
  if (!special && !['travail', 'repos'].includes(r.etat) && !attend && rnd() < (Number(A().PROPOS_PART) || 0) * partDesTraits(v)) {
    const pr = proposVillageois(state, v, rnd);
    if (pr) { special = pr.texte; r.propos = pr.id; }
  }
  if (special) r.texte = special;
  if (g.retrouvailles) { r.texte = [un(rnd, P.retrouvailles), r.texte].filter(Boolean).join(' '); joie = true; }
  r.emotion = cadeau || (g.premiere && (joie || B.palier >= AMITIE.HUMEUR.JOIE)) ? 'joie' : null;
  return r;
}

// Offrir `item` au villageois `id` (la fenêtre « Offrir ») : un cadeau par jour (amitie.js offrir) ; l'objectif du jour
// « cadeau_villageois » ; sa réaction (PHRASES.cadeau) ; un palier passé dès CONFIE.PALIER : il te confie un goût.
// → { ok, gout, points, emotion, pts, palier, nom, monte, prenom, phrase (sa réaction), confie ({ objet, gout, texte })
// } ou un refus.
export function offrirVillageois(state, id, item) {
  const v = trouverVillageois(state, id);
  if (!v) return fail('Personne de ce nom sur l\'île.');
  const r = offrir(state, HAMEAU_VILLAGE, id, item);
  if (!r.ok) return r;
  noterObjectif(state, 'cadeau_villageois');
  const rnd = rngDe(`${graineDe(state)}:cadeau:${id}:${jourDe(state)}:${item}`);
  const phrase = un(rnd, ((A().PHRASES || {}).cadeau || {})[r.gout]);
  const confie = r.monte && r.palier >= (Number((A().CONFIE || {}).PALIER) || 2) ? confierGout(state, v, rnd) : null;
  return { ...r, phrase, confie };
}

/* ---------- la sauvegarde (la migration v89 → v90) ---------- */

// L'amitié des villageois d'une sauvegarde : chacun a ses goûts (tirés de son id s'ils manquent) et sa fiche d'amitié
// (ACCUEIL points s'il n'en avait pas : il était déjà là, la famille l'avait accueilli) ; le présent qu'il garde est
// lisible, sinon il s'en va ; une demande d'un villageois qui n'est plus là est oubliée. `state` est la copie migrée.
export function reparerAmitieVillageois(state) {
  if (!Array.isArray(state.villageois)) return state;
  const ok = (g) => objet(g) && Object.keys(g).length && Object.entries(g).every(([it, s]) => DATA.OBJETS[it] && ['adore', 'aime', 'deteste'].includes(s));
  state.villageois = state.villageois.map((v) => (v && typeof v === 'object' && typeof v.id === 'string' && !ok(v.gouts) ? { ...v, gouts: goutsTires(`migration:${v.id}`) } : v));
  state.amitie = JSON.parse(JSON.stringify(objet(state.amitie) ? state.amitie : {}));
  const a = amitieDe(state), ids = new Set();
  for (const v of state.villageois) {
    if (!v || typeof v.id !== 'string') continue;
    ids.add(v.id);
    const p = objet(a.pnj[v.id]) ? a.pnj[v.id] : null;
    if (!p) { a.pnj[v.id] = { pts: Number(A().ACCUEIL) || 0, gouts: {} }; continue; }
    const pts = Number(p.pts);
    p.pts = Number.isFinite(pts) ? Math.max(0, Math.min(RECIT.RELATION_MAX, Math.round(pts))) : Number(A().ACCUEIL) || 0;
    p.gouts = objet(p.gouts) ? Object.fromEntries(Object.entries(p.gouts).filter(([it, s]) => DATA.OBJETS[it] && ['adore', 'aime', 'neutre', 'deteste'].includes(s))) : {};
    if ('present' in p && !presentValide(p.present)) delete p.present;
  }
  if (objet(state.demandes) && Array.isArray(state.demandes.liste)) {
    state.demandes = { ...state.demandes };
    state.demandes.liste = state.demandes.liste.filter((d) => !d || d.hameau !== HAMEAU_VILLAGE || ids.has(d.membre));
  }
  return state;
}

