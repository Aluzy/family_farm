import { DATA } from './catalog.js';
import { mulberry32 } from './base.js';
import { fail } from './devices.js';
import { hache } from './ferme-generee.js';
import { farmSeed, farmTerrain } from './terrain.js';
import { villageActif } from './village.js';
import { hourOfDay, nightActive } from './clock.js';
import { maisonsMarquees, litsDeLaFamille } from './blocs.js';
import { jourDeBac } from './bac.js';
import { amitieDe, ajouterAmitie, goutsTires } from './amitie.js';
import { cleDiversite, tirerApparence } from './apparence.js';
import { evenementsDe, noterEvenement } from './voisins.js';
import { trouverVillageois, villageoisDe } from './villageois.js';
import { journeeDuVillage, lieuxDuVillage } from './villageois-journee.js';
import { gainAccords } from './traits.js';

/* ---------- les liens entre villageois (le chantier « l'île à bâtir », fiche I6b) ----------

   Entre deux villageois, une affinité entière de 0 à 100 (VILLAGE.LIENS), gardée dans la partie, qui monte chaque nuit
   de ce qu'ils ont vécu ensemble dans la journée (liensNuit, appelé par runNight après les tâches et avant la nuit des
   villageois) et ne baisse jamais (B-1 : pas de brouille) : ILE (ils vivent sur la même île), VOISIN (leurs maisons
   proches), POSTE (la même tâche, à des postes voisins ; le même commerce, I5a), TABLE (la même table au même repas),
   SORTIE (une visite, un rendez-vous, une promenade, un banc à deux), FETE (le même repas du joueur), FOYER (le même
   toit), ENTRAIDE (un repas apporté) ; et (fiche I6c, traits.js) les paires de traits qui s'accordent (TRAITS.ACCORDS).
   Au-delà de LENT, un gain compte pour moitié.

   Les paliers (NOMS_LIENS) : inconnu, connaissance, camarade, ami, proche (LIENS.PALIERS). La vie sociale d'I3b+
   (villageois-liens.js : connaissance, la journée, la scène, les répliques) lit le « degré » : 0 inconnu, 1
   connaissance ou camarade, 2 ami, 3 proche (degreDuPalier) ; seul son calcul du score a changé (scorePaire).

   Une paire qui n'a pas encore passé de nuit ensemble (un nouveau venu, une partie d'avant I6b) n'a pas de valeur
   gardée : elle vaut l'estimation d'I3b+ (estimation : les jours passés ensemble, les maisons voisines, la table,
   la même tâche, une affinité tirée de la graine et des deux ids), la même que la partie montrait jusque-là ; la nuit
   suivante la garde et la fait monter. Un nouveau venu part donc de l'affinité tirée seule.

   Ce que les liens changent :
     - le bonheur (bonheurDesLiens, villageois.js nuitDe) : un ami au village, un proche, un repas apporté ;
     - le travail à deux (taches.js actionsDuJour) : deux amis au même poste gagnent une action par jour à eux deux ;
     - les habitudes (villageois-journee.js) : des amis s'assoient côte à côte (un banc à deux, à table à côté d'un
       ami), se rendent visite le soir (visitesDuSoir), flânent ensemble (la promenade d'I3b+) ;
     - l'entraide (planifierEntraide, liensFinDeNuit) : un villageois en repos reçoit le lendemain midi la visite d'un
       ami qui lui apporte un repas (entraidesDuJour : la journée le montre) ;
     - les foyers (formerFoyer) : deux proches s'installent ensemble dans une maison à deux lits que le joueur leur a
       bâtie, s'il le leur propose ; un foyer dont la maison a un lit d'enfant peut accueillir un enfant venu par le
       bac (accueillirEnfant, puis arriverEnfant) ; personne ne se sépare.
   Ce qui se passe (une visite du soir, un repas apporté) rejoint les événements entre voisins (voisins.js,
   noterEvenement, hameau « village ») : les villageois en parlent (villageois-amitie.js, les sujets de PROPOS).

   state.liens = {
     ordre: [ids] (l'ordre de la demi-matrice : celui des villageois, à leur première nuit),
     aff: '…' (la demi-matrice : pour i < j, deux chiffres en base 36 au rang j (j − 1) / 2 + i de la paire),
     foyers: [{ id ('fy-1'…), membres: [a, b], maison (la boîte aux lettres), jour, enfant (son id, ou null),
       attend (true : il viendra par le prochain bac) }],
     entraide: [{ jour, de, a }] (un repas que `de` apportera à `a` ce jour-là) }.
   Il ne naît qu'avec les villageois (le réglage allumé). Les tests : tests/engine/village-liens.test.mjs. */

const LI = () => (DATA.VILLAGE && DATA.VILLAGE.LIENS) || {};
const CO = () => (DATA.VILLAGE && DATA.VILLAGE.SOCIAL && DATA.VILLAGE.SOCIAL.CONNAISSANCE) || {};
export const NOMS_LIENS = ['inconnu', 'connaissance', 'camarade', 'ami', 'proche'];
const DEGRE_DU_PALIER = [0, 1, 1, 2, 3];

const objet = (v) => !!v && typeof v === 'object' && !Array.isArray(v);
const graineDe = (state) => farmSeed(state) || 'ile';
const jourDe = (state) => Math.max(1, Math.floor(Number(state && state.day) || 1));
const rngDe = (cle) => mulberry32(hache(cle));
const paire = (a, b) => (a < b ? `${a}|${b}` : `${b}|${a}`);
const rang = (i, j) => (i < j ? (j * (j - 1)) / 2 + i : (i * (i - 1)) / 2 + j);
const borne = (n) => Math.max(0, Math.min(100, Math.round(Number(n) || 0)));
const enc = (n) => borne(n).toString(36).padStart(2, '0');

/* ---------- la partie ---------- */

// Les liens de la partie (créés au besoin, réparés s'ils sont abîmés).
export function liensEtat(state) {
  if (!objet(state.liens)) state.liens = { ordre: [], aff: '', foyers: [], entraide: [] };
  const L = state.liens;
  if (!Array.isArray(L.ordre)) L.ordre = [];
  if (typeof L.aff !== 'string') L.aff = '';
  if (!Array.isArray(L.foyers)) L.foyers = [];
  if (!Array.isArray(L.entraide)) L.entraide = [];
  return L;
}

// Ce qui change quand les liens changent (la journée et la connaissance sont gardées tant qu'elle est la même).
export function liensSignature(state) {
  const L = state && objet(state.liens) ? state.liens : null;
  if (!L) return '';
  const f = (L.foyers || []).map((x) => `${(x.membres || []).join('+')}@${x.maison}${x.enfant ? `+${x.enfant}` : ''}`).join(',');
  const e = (L.entraide || []).map((x) => `${x.jour}:${x.de}>${x.a}`).join(',');
  return `${(L.ordre || []).length}|${L.aff || ''}|${f}|${e}`;
}

// L'affinité gardée de `a` et `b`, ou null (la paire n'a pas encore passé de nuit ensemble).
export function affiniteGardee(state, a, b) {
  const L = objet(state.liens) ? state.liens : null;
  if (!L || !Array.isArray(L.ordre) || typeof L.aff !== 'string') return null;
  const i = L.ordre.indexOf(a), j = L.ordre.indexOf(b);
  if (i < 0 || j < 0 || i === j) return null;
  const k = rang(i, j) * 2;
  if (k + 2 > L.aff.length) return null;
  const n = parseInt(L.aff.slice(k, k + 2), 36);
  return Number.isFinite(n) ? Math.min(100, n) : null;
}

// (pour les tests et les essais : poser l'affinité de `a` et `b` ; le jeu, lui, ne la fait que monter)
export function poserAffinite(state, a, b, n) {
  const L = liensEtat(state);
  completerOrdre(state, L);
  const i = L.ordre.indexOf(a), j = L.ordre.indexOf(b);
  if (i < 0 || j < 0 || i === j) return false;
  const tab = tableau(state, L);
  tab[rang(i, j)] = borne(n);
  L.aff = tab.map(enc).join('');
  return true;
}

// L'ordre de la demi-matrice : chaque villageois y prend sa place (à la fin) la première fois qu'on le voit.
function completerOrdre(state, L) {
  for (const v of villageoisDe(state)) if (!L.ordre.includes(v.id)) L.ordre.push(v.id);
}

// La demi-matrice en tableau, complétée (une paire sans valeur : son estimation).
function tableau(state, L) {
  const n = L.ordre.length, tot = (n * (n - 1)) / 2, out = new Array(tot);
  const V = new Map(villageoisDe(state).map((v) => [v.id, v]));
  let Lx = null, W = 0;
  for (let j = 1; j < n; j++) {
    for (let i = 0; i < j; i++) {
      const k = rang(i, j);
      const s = k * 2 + 2 <= L.aff.length ? parseInt(L.aff.slice(k * 2, k * 2 + 2), 36) : NaN;
      if (Number.isFinite(s)) { out[k] = Math.min(100, s); continue; }
      const va = V.get(L.ordre[i]), vb = V.get(L.ordre[j]);
      if (!va || !vb) { out[k] = 0; continue; }
      if (!Lx) { Lx = lieuxDuVillage(state); W = farmTerrain(state).LARGEUR; }
      out[k] = estimation(state, va, vb, Lx, W);
    }
  }
  return out;
}

/* ---------- le score d'une paire (villageois-liens.js scoreDe) ---------- */

// L'affinité tirée de la paire (de 0 à 1), de la graine et des deux ids : la même dans les deux sens.
function tiree(state, a, b) {
  return hache(`${graineDe(state)}:affinite:${paire(a, b)}`) / 4294967296;
}

// La table où mange le villageois `v` (celle de sa maison, sinon la table commune), ou null.
function tableDe(L, v) {
  const m = v.maison !== null && v.maison !== undefined ? L.maisons.get(v.maison) : null;
  const tb = (m && m.table) || L.commune;
  return tb ? tb.table : null;
}

// L'estimation d'I3b+ (une paire sans valeur gardée) : les jours passés ensemble sur l'île (depuis l'arrivée du
// second) × (PAR_JOUR, VOISIN si leurs maisons sont proches, TABLE à la même table, COLLEGUE à la même tâche), plus
// l'affinité tirée (0 à AFFINITE).
function estimation(state, va, vb, L, W) {
  const c = CO(), jours = Math.max(0, jourDe(state) - Math.max(Number(va.arrive) || 0, Number(vb.arrive) || 0));
  let parJour = Number(c.PAR_JOUR) || 0;
  if (Number.isInteger(va.maison) && Number.isInteger(vb.maison) && W) {
    const d = Math.max(Math.abs((va.maison % W) - (vb.maison % W)), Math.abs(Math.floor(va.maison / W) - Math.floor(vb.maison / W)));
    if (d <= (Number(c.VOISINE) || 0)) parJour += Number(c.VOISIN) || 0;
  }
  const ta = L ? tableDe(L, va) : null;
  if (ta !== null && ta === tableDe(L, vb)) parJour += Number(c.TABLE) || 0;
  if (va.tache && va.tache === vb.tache) parJour += Number(c.COLLEGUE) || 0;
  // (la famille d'un enfant : ses parents et lui sont proches dès son arrivée)
  const parentDe = (e, p) => { const f = e.enfant ? foyerDe(state, e.id) : null; return !!(f && f.membres.includes(p.id)); };
  const parents = parentDe(va, vb) || parentDe(vb, va);
  const s = borne(jours * parJour + tiree(state, va.id, vb.id) * (Number(LI().AFFINITE ?? c.AFFINITE) || 0));
  return parents ? Math.max(s, Number((LI().ENFANT || {}).PARENTS) || 85) : s;
}

// Le score de la paire (0 à 100) et les jours passés ensemble : l'affinité gardée, sinon l'estimation.
export function scorePaire(state, va, vb, L, W) {
  const jours = Math.max(0, jourDe(state) - Math.max(Number(va.arrive) || 0, Number(vb.arrive) || 0));
  const g = affiniteGardee(state, va.id, vb.id);
  return { score: g !== null ? g : estimation(state, va, vb, L, W), jours, garde: g !== null };
}

// Le palier d'un score (0 inconnu à 4 proche), son degré pour la vie sociale (0 à 3).
export function palierLien(score) {
  const P = LI().PALIERS || {};
  const s = Number(score) || 0;
  return s >= (P.proche ?? 75) ? 4 : s >= (P.ami ?? 45) ? 3 : s >= (P.camarade ?? 25) ? 2 : s >= (P.connaissance ?? 10) ? 1 : 0;
}
export const degreDuPalier = (p) => DEGRE_DU_PALIER[Math.max(0, Math.min(4, p | 0))];

// Ce qu'il reste jusqu'au palier suivant : { palier, nom, score, prochain (le score du suivant, ou null) }.
export function lienDe(score) {
  const P = LI().PALIERS || {}, p = palierLien(score);
  const prochain = p < 4 ? Number(P[NOMS_LIENS[p + 1]]) : null;
  return { palier: p, nom: NOMS_LIENS[p], score: borne(score), prochain: Number.isFinite(prochain) ? prochain : null };
}

/* ---------- la nuit ---------- */

// Les gains de la journée `jour` (state.day), pour chaque paire, et ce qui s'est passé. Appelé par runNight après
// les tâches (leur journée de travail est finie) et avant la nuit des villageois (leur repos de demain n'est pas
// encore tiré : la journée lue est bien celle qu'ils ont vécue). → { gains (les paires qui ont monté), paliers
// ([{ a, b, palier }] passés), evenements } ; null le réglage éteint ou sans villageois.
export function liensNuit(state) {
  if (!villageActif(state)) return null;
  const V = villageoisDe(state);
  if (!V.length) return null;
  const L = liensEtat(state), jour = jourDe(state), G = LI().GAINS || {};
  completerOrdre(state, L);
  const tab = tableau(state, L);
  const J = journeeDuVillage(state, jour), Lx = lieuxDuVillage(state), W = farmTerrain(state).LARGEUR;
  // ce que chacun a vécu aujourd'hui : ses tables (au repas de midi, du soir), ses sorties à plusieurs, sa tâche
  const faits = new Map();
  const A = amitieDe(state).pnj || {};
  for (const v of V) {
    const segs = J.get(v.id) || [];
    const tables = new Set(), sorties = new Set();
    for (const s of segs) {
      if (s.etat === 'repas' && s.lieu && Number.isInteger(s.lieu.table)) tables.add(`${s.de < 15 ? 'midi' : 'soir'}:${s.lieu.table}`);
      if (s.but && Array.isArray(s.but.avec) && s.but.avec.length && s.but.sorte !== 'travail') sorties.add(s.but.cle);
      // (le repas apporté : la même table, en quelque sorte)
      if (s.but && s.but.apporte) tables.add(`apporte:${s.but.cle}`);
    }
    const T = v.travail;
    const p = A[v.id], souv = p && Array.isArray(p.souvenirs) ? p.souvenirs[p.souvenirs.length - 1] : null;
    faits.set(v.id, { tables, sorties, tache: T && T.jour === jour && T.actions > 0 ? T.tache : null, fete: !!(souv && souv.jour === jour) });
  }
  const aides = new Set(L.entraide.filter((e) => e.jour === jour).map((e) => paire(e.de, e.a)));
  const foyerDe = new Map();
  for (const f of L.foyers) for (const id of [...f.membres, f.enfant].filter(Boolean)) foyerDe.set(id, f.id);
  const lent = Number(LI().LENT) || 100, out = { gains: 0, paliers: [], evenements: [] };
  const n = L.ordre.length;
  const vus = new Map(V.map((v) => [v.id, v]));
  for (let j = 1; j < n; j++) {
    const vb = vus.get(L.ordre[j]);
    if (!vb) continue;
    for (let i = 0; i < j; i++) {
      const va = vus.get(L.ordre[i]);
      if (!va) continue;
      const fa = faits.get(va.id), fb = faits.get(vb.id);
      let g = Number(G.ILE) || 0;
      if (Number.isInteger(va.maison) && Number.isInteger(vb.maison) && va.maison !== vb.maison) {
        const d = Math.max(Math.abs((va.maison % W) - (vb.maison % W)), Math.abs(Math.floor(va.maison / W) - Math.floor(vb.maison / W)));
        if (d <= (Number(G.VOISINE) || 0)) g += Number(G.VOISIN) || 0;
      }
      if (fa.tache && fa.tache === fb.tache) g += Number(G.POSTE) || 0;
      if ([...fa.tables].some((t) => fb.tables.has(t))) g += Number(G.TABLE) || 0;
      if ([...fa.sorties].some((t) => fb.sorties.has(t))) g += Number(G.SORTIE) || 0;
      if (fa.fete && fb.fete) g += Number(G.FETE) || 0;
      if (foyerDe.has(va.id) && foyerDe.get(va.id) === foyerDe.get(vb.id)) g += Number(G.FOYER) || 0;
      if (aides.has(paire(va.id, vb.id))) g += Number(G.ENTRAIDE) || 0;
      // (fiche I6c, traits.js : des traits qui s'accordent, TRAITS.ACCORDS ; aucun ne fait baisser l'affinité)
      g += gainAccords(va, vb);
      if (!(g > 0)) continue;
      const k = rang(i, j), avant = tab[k];
      const apres = borne(avant + (avant >= lent ? Math.ceil(g / 2) : g));
      if (apres <= avant) continue;
      tab[k] = apres;
      out.gains++;
      const p0 = palierLien(avant), p1 = palierLien(apres);
      if (p1 > p0) out.paliers.push({ a: va.id, b: vb.id, palier: p1 });
    }
  }
  L.aff = tab.map(enc).join('');
  // (les paliers qu'on annonce au joueur : une notification, la page la dit)
  const annonce = new Set(Array.isArray(LI().AVIS) ? LI().AVIS : [3, 4]);
  for (const p of out.paliers) {
    if (!annonce.has(p.palier)) continue;
    const v = vus.get(p.a);
    if (v) avis(v, `lien_${NOMS_LIENS[p.palier]}:${p.b}`);
  }
  // ce qui s'est passé : les visites du soir, les repas apportés (les événements entre voisins, voisins.js)
  for (const v of V) {
    for (const s of J.get(v.id) || []) {
      if (!s.but || s.but.role !== 'visiteur' || !s.but.avec || !s.but.avec[0]) continue;
      const o = vus.get(s.but.avec[0]);
      if (!o) continue;
      if (s.but.soir) out.evenements.push(noterEvenement(state, { jour, sorte: 'visite', hameau: 'village', soir: true, qui: v.id, quiPrenom: v.prenom, quiGenre: v.genre, chez: o.id, chezPrenom: o.prenom }));
      if (s.but.apporte) {
        out.evenements.push(noterEvenement(state, { jour, sorte: 'entraide', hameau: 'village', qui: v.id, de: v.prenom, chez: o.id, a: o.prenom, n: 1 }));
        avis(o, `entraide:${v.id}`);
      }
    }
  }
  return out;
}

// Après la nuit des villageois (leur repos de demain est tiré) : les repas apportés de demain (planifierEntraide), et
// l'enfant d'un foyer qui n'est pas venu par le bac du jour (la journée finie avant l'heure) est là d'un coup.
// → { entraide: [{ de, a }], enfant (son id, ou null) } ; null le réglage éteint ou sans villageois.
export function liensFinDeNuit(state) {
  if (!villageActif(state) || !villageoisDe(state).length) return null;
  const L = liensEtat(state), jour = jourDe(state);
  L.entraide = L.entraide.filter((e) => e && e.jour > jour);
  const entraide = planifierEntraide(state, jour + 1);
  let enfant = null;
  if (arriveeEnfantRefus(state, { heure: false }) === null) {
    const r = arriverEnfant(state, { direct: true });
    if (r.ok) enfant = r.villageois.id;
  }
  return { entraide, enfant };
}

// L'entraide (reprise de voisins.js : un foyer qui a eu faim reçoit à manger d'un ami) : chaque villageois en repos
// demain (mal nourri ou sans lit) reçoit, au repas de midi, la visite de son meilleur ami (le degré « ami » ou plus),
// qui n'est ni en repos, ni un enfant, ni sous le même toit, et n'apporte qu'un repas. → [{ de, a }].
export function planifierEntraide(state, jour) {
  const L = liensEtat(state), V = villageoisDe(state), out = [];
  const occupes = new Set(L.entraide.filter((e) => e.jour === jour).flatMap((e) => [e.de, e.a]));
  for (const v of [...V].sort((a, b) => (a.id < b.id ? -1 : 1))) {
    if (!v.repos || occupes.has(v.id) || !Number.isInteger(v.maison)) continue;
    const amis = V.filter((o) => o !== v && !o.repos && !o.enfant && !o.accueil && Number.isInteger(o.maison) && o.maison !== v.maison && !occupes.has(o.id))
      .map((o) => ({ o, s: scoreAvec(state, v, o) })).filter((x) => palierLien(x.s) >= 3)
      .sort((x, y) => y.s - x.s || (x.o.id < y.o.id ? -1 : 1));
    if (!amis.length) continue;
    const de = amis[0].o;
    L.entraide.push({ jour, de: de.id, a: v.id });
    occupes.add(de.id); occupes.add(v.id);
    out.push({ de: de.id, a: v.id });
  }
  return out;
}

// Les repas apportés le jour `jour` : [{ de, a }] (la journée les montre, villageois-journee.js).
export function entraidesDuJour(state, jour = jourDe(state)) {
  const L = objet(state.liens) ? state.liens : null;
  return L && Array.isArray(L.entraide) ? L.entraide.filter((e) => e && e.jour === jour && typeof e.de === 'string' && typeof e.a === 'string') : [];
}

// Le score de `v` et `o` (deux villageois), gardé ou estimé.
function scoreAvec(state, v, o) {
  const g = affiniteGardee(state, v.id, o.id);
  if (g !== null) return g;
  return estimation(state, v, o, lieuxDuVillage(state), farmTerrain(state).LARGEUR);
}

function avis(v, quoi) {
  if (!Array.isArray(v.avis)) v.avis = [];
  if (!v.avis.includes(quoi)) v.avis.push(quoi);
}

/* ---------- ce que les liens changent ---------- */

// Ce que ses liens ajoutent à sa cible de bonheur (villageois.js nuitDe) : BONHEUR.AMI s'il a un ami au village,
// BONHEUR.PROCHE un proche (le plus grand des deux), ENTRAIDE.BONHEUR s'il a reçu un repas aujourd'hui.
export function bonheurDesLiens(state, v) {
  if (!villageActif(state) || !v) return 0;
  const B = LI().BONHEUR || {};
  let meilleur = 0;
  for (const o of villageoisDe(state)) if (o !== v) meilleur = Math.max(meilleur, palierLien(scoreAvec(state, v, o)));
  let b = meilleur >= 4 ? Number(B.PROCHE) || 0 : meilleur >= 3 ? Number(B.AMI) || 0 : 0;
  if (entraidesDuJour(state).some((e) => e.a === v.id && villageoisDe(state).some((o) => o.id === e.de && !o.repos))) b += Number((LI().ENTRAIDE || {}).BONHEUR) || 0;
  return b;
}

// Les liens du villageois `id`, du plus fort au plus faible : [{ id, prenom, genre, perso, apparence, enfant,
// score, palier, nom, prochain, foyer (sous le même toit) }] ; ceux qu'il ne connaît pas encore compris.
export function liensVillageois(state, id) {
  const v = trouverVillageois(state, id);
  if (!v) return [];
  const f = foyerDe(state, id);
  return villageoisDe(state).filter((o) => o !== v).map((o) => {
    const s = scoreAvec(state, v, o), l = lienDe(s);
    return { id: o.id, prenom: o.prenom, genre: o.genre, perso: o.perso, apparence: o.apparence, enfant: !!o.enfant, ...l, foyer: !!(f && [...f.membres, f.enfant].includes(o.id)) };
  }).sort((a, b) => b.score - a.score || (a.id < b.id ? -1 : 1));
}

// Qui est lié à qui (la vue d'ensemble du village) : { foyers: [{ id, membres: [prénoms], enfant, maison }], paires:
// [{ a, b, score, palier, nom }] (camarade ou plus, du plus fort au plus faible) }.
export function quiEstLie(state) {
  const V = villageoisDe(state), out = { foyers: [], paires: [] };
  for (const f of foyersDe(state)) {
    const m = f.membres.map((x) => trouverVillageois(state, x)).filter(Boolean);
    const e = f.enfant ? trouverVillageois(state, f.enfant) : null;
    out.foyers.push({ id: f.id, membres: m.map((x) => ({ id: x.id, prenom: x.prenom })), enfant: e ? { id: e.id, prenom: e.prenom } : null, attend: !!f.attend });
  }
  for (let i = 0; i < V.length; i++) for (let j = i + 1; j < V.length; j++) {
    const s = scoreAvec(state, V[i], V[j]), p = palierLien(s);
    if (p >= 2) out.paires.push({ a: { id: V[i].id, prenom: V[i].prenom }, b: { id: V[j].id, prenom: V[j].prenom }, score: s, palier: p, nom: NOMS_LIENS[p] });
  }
  out.paires.sort((x, y) => y.score - x.score || (x.a.id < y.a.id ? -1 : 1));
  return out;
}

/* ---------- les foyers ---------- */

export function foyersDe(state) {
  const L = objet(state.liens) ? state.liens : null;
  return L && Array.isArray(L.foyers) ? L.foyers.filter((f) => f && Array.isArray(f.membres)) : [];
}

// Le foyer du villageois `id` (un membre ou l'enfant), ou null.
export function foyerDe(state, id) {
  return foyersDe(state).find((f) => f.membres.includes(id) || f.enfant === id) || null;
}

// Un lit d'enfant (la case d'un couchage : un meuble « lit_enfant ») ?
function litEnfant(state, c) {
  const s = DATA.ATELIER.BLOCS[(state.blocs || {})[c]];
  return !!(s && s.meuble === 'lit_enfant');
}

// Les maisons où `a` et `b` pourraient s'installer ensemble : [{ boite, lits: [deux lits d'adulte], enfant (un lit
// d'enfant libre, ou null), chez (l'id de celui des deux qui y habite déjà, ou null) }]. Une maison de villageois avec
// deux lits d'adulte que la famille ne prend pas, où n'habite personne d'autre qu'eux.
export function maisonsPourFoyer(state, a, b) {
  const V = villageoisDe(state), famille = litsDeLaFamille(state), out = [];
  for (const m of maisonsMarquees(state)) {
    const qui = V.filter((v) => v.maison === m.boite);
    if (qui.some((v) => v.id !== a && v.id !== b)) continue;
    const lits = m.piece.paillasses.filter((c) => !famille.has(c));
    const adultes = lits.filter((c) => !litEnfant(state, c)), enfants = lits.filter((c) => litEnfant(state, c));
    if (adultes.length < 2) continue;
    out.push({ boite: m.boite, lits: adultes.slice(0, 2), enfant: enfants[0] ?? null, chez: qui.length ? qui[0].id : null });
  }
  return out;
}

// Pourquoi `a` et `b` ne peuvent pas (encore) former un foyer, ou null. `o.maison` : false pour ne pas regarder la
// maison (ce qu'il manque : la fiche).
export function foyerRefus(state, a, b, o = {}) {
  if (!villageActif(state)) return 'Le chantier de l\'île n\'est pas allumé.';
  const va = trouverVillageois(state, a), vb = trouverVillageois(state, b);
  if (!va || !vb || va === vb) return 'Villageois inconnu.';
  if (va.enfant || vb.enfant) return 'Un enfant ne fonde pas de foyer.';
  if (foyerDe(state, a) || foyerDe(state, b)) return 'L\'un des deux a déjà un foyer.';
  const P = Number((LI().FOYER || {}).PALIER) || 4;
  if (palierLien(scoreAvec(state, va, vb)) < P) return `Il faut qu'ils soient ${NOMS_LIENS[P]}s.`;
  if (o.maison !== false && !maisonsPourFoyer(state, a, b).length) return 'Il leur faut une maison à deux lits : une pièce close avec deux lits d\'adulte libres et une boîte aux lettres contre sa porte, où personne d\'autre n\'habite.';
  return null;
}

// Le joueur propose à `a` et `b` (deux proches) de vivre ensemble dans la maison `boite` (sinon la première qui
// convient) : ils s'y installent (chacun son lit), leurs autres maisons se libèrent. → { ok, foyer } ou un refus.
export function formerFoyer(state, a, b, boite = null) {
  const r = foyerRefus(state, a, b);
  if (r) return fail(r);
  const M = maisonsPourFoyer(state, a, b);
  const m = boite === null || boite === undefined ? M[0] : M.find((x) => x.boite === Number(boite));
  if (!m) return fail('Cette maison ne convient pas : il faut deux lits d\'adulte libres et personne d\'autre.');
  const L = liensEtat(state), va = trouverVillageois(state, a), vb = trouverVillageois(state, b);
  va.maison = m.boite; va.lit = m.lits[0];
  vb.maison = m.boite; vb.lit = m.lits[1];
  va.sansMaison = vb.sansMaison = null;
  const n = L.foyers.reduce((x, f) => Math.max(x, Number(String(f.id).replace('fy-', '')) || 0), 0) + 1;
  const f = { id: `fy-${n}`, membres: [a, b].sort(), maison: m.boite, jour: jourDe(state), enfant: null, attend: false };
  L.foyers.push(f);
  avis(va, `foyer:${b}`);
  return { ok: true, foyer: f };
}

// Un lit d'enfant libre dans la maison du foyer `f`, ou null.
function litEnfantLibre(state, f) {
  const m = maisonsMarquees(state).find((x) => x.boite === f.maison);
  if (!m) return null;
  const famille = litsDeLaFamille(state), pris = new Set(villageoisDe(state).map((v) => v.lit));
  return m.piece.paillasses.find((c) => !famille.has(c) && !pris.has(c) && litEnfant(state, c)) ?? null;
}

// Pourquoi le foyer `fid` ne peut pas accueillir d'enfant, ou null.
export function enfantRefus(state, fid) {
  const f = foyersDe(state).find((x) => x.id === fid);
  if (!f) return 'Foyer inconnu.';
  if (f.enfant) return 'Ce foyer a déjà un enfant.';
  if (!f.membres.every((id) => { const v = trouverVillageois(state, id); return v && v.maison === f.maison; })) return 'Ils doivent d\'abord vivre ensemble dans leur maison.';
  if (litEnfantLibre(state, f) === null) return 'Il faut un lit d\'enfant libre dans leur maison (l\'Atelier en fabrique).';
  return null;
}

// Le joueur propose au foyer `fid` d'accueillir un enfant : il viendra par le prochain bac (attend). → { ok } ou un refus.
export function accueillirEnfant(state, fid) {
  const r = enfantRefus(state, fid);
  if (r) return fail(r);
  const f = foyersDe(state).find((x) => x.id === fid);
  f.attend = true;
  return { ok: true, foyer: f };
}

// Le foyer dont l'enfant viendrait par ce bac, ou la raison qu'il ne vienne pas (un texte) : `o.heure` false pour ne
// pas regarder l'heure du bac (la nuit) ; un seul nouveau venu par passage.
export function arriveeEnfantRefus(state, o = {}) {
  if (!villageActif(state)) return 'Le chantier de l\'île n\'est pas allumé.';
  const jour = jourDe(state);
  if (!jourDeBac(state, jour)) return 'Le bac ne passe pas aujourd\'hui.';
  if (villageoisDe(state).some((v) => v.arrive === jour)) return 'Un seul nouveau venu par passage du bac.';
  if (o.heure !== false) {
    if (nightActive(state)) return 'La nuit, le bac ne débarque personne.';
    const h = hourOfDay(state), [debut, fin] = DATA.PORT.BAC.HEURES;
    if (h < debut || h >= fin) return 'Le bac n\'est pas à quai.';
  }
  const f = foyersDe(state).find((x) => x.attend && !x.enfant && enfantRefus(state, x.id) === null);
  return f ? null : 'Aucun foyer n\'attend d\'enfant.';
}

// L'enfant du premier foyer qui l'attend débarque (le bac) : un villageois enfant (v.enfant, v.foyer), chez ses
// parents, dans le lit d'enfant ; il marche du port à sa maison (`o.direct` : il y est d'un coup). → { ok, villageois }.
export function arriverEnfant(state, o = {}) {
  const r = arriveeEnfantRefus(state, { heure: !o.direct && o.heure !== false });
  if (r) return fail(r);
  const f = foyersDe(state).find((x) => x.attend && !x.enfant && enfantRefus(state, x.id) === null);
  const lit = litEnfantLibre(state, f);
  if (!Array.isArray(state.villageois)) state.villageois = [];
  const rangV = state.villageois.length + 1, g = graineDe(state);
  const rnd = rngDe(`${g}:villageois:${rangV}:enfant`);
  const V = villageoisDe(state), F = (state.famille && state.famille.membres) || [];
  const genre = rnd() < 0.5 ? 'f' : 'm';
  const H = DATA.HABITANTS, un = (l) => l[Math.floor(rnd() * l.length)];
  const pris = new Set([...V, ...F].map((m) => String(m.prenom || '').toLowerCase()));
  const prenoms = (H.PRENOMS[genre] || []).filter((p) => !pris.has(p.toLowerCase()));
  const prenom = prenoms.length ? un(prenoms) : `${un(H.PRENOMS[genre])} ${rangV}`;
  const persosPris = new Set(V.filter((v) => v.enfant).map((v) => v.perso));
  const persos = ((H.PERSOS.enfant || {})[genre] || []).filter((p) => !persosPris.has(p));
  const perso = persos.length ? un(persos) : un(H.PERSOS.enfant[genre]);
  const deja = new Set(V.filter((v) => objet(v.apparence)).map((v) => cleDiversite(v.apparence)));
  const apparence = tirerApparence(rngDe(`${g}:villageois:apparence:${rangV}:enfant`), { enfant: true, genre }, deja);
  const v = {
    id: `vg-${rangV}`, prenom, genre, perso, apparence, gouts: goutsTires(`${g}:villageois:${rangV}`), maison: f.maison, lit,
    bourse: 0, bonheur: DATA.BONHEUR.DEPART, faim: 0, arrive: jourDe(state), repos: false, enfant: true, foyer: f.id,
    accueil: o.direct ? null : 'en_route', sansMaison: null, avis: o.direct ? ['arrive'] : [], journal: [],
    tache: null, outil: null, vendre: [], semis: {}, travail: null,
  };
  state.villageois.push(v);
  f.enfant = v.id;
  f.attend = false;
  if (!amitieDe(state).pnj[v.id]) ajouterAmitie(state, v.id, Number((DATA.VILLAGE.AMITIE || {}).ACCUEIL) || 0);
  for (const id of f.membres) { const p = trouverVillageois(state, id); if (p) avis(p, `enfant:${v.id}`); }
  return { ok: true, villageois: v };
}

/* ---------- ce qu'on en dit (les propos) ---------- */

// Le plus proche voisin de `v` (sa boîte aux lettres la plus près, hors de son toit), s'il le connaît : l'autre, ou null.
export function voisinDe(state, v) {
  if (!Number.isInteger(v.maison)) return null;
  const W = farmTerrain(state).LARGEUR, G = LI().GAINS || {};
  let best = null, bd = Infinity;
  for (const o of villageoisDe(state)) {
    if (o === v || !Number.isInteger(o.maison) || o.maison === v.maison) continue;
    const d = Math.max(Math.abs((o.maison % W) - (v.maison % W)), Math.abs(Math.floor(o.maison / W) - Math.floor(v.maison / W)));
    if (d <= (Number(G.VOISINE) || 14) && (d < bd || (d === bd && o.id < best.id)) && palierLien(scoreAvec(state, v, o)) >= 1) { best = o; bd = d; }
  }
  return best;
}

// Les événements récents du village qui touchent `id` (voisins.js : RECENT jours).
export function evenementsVillageois(state, id) {
  return evenementsDe(state, id).filter((e) => e.hameau === 'village');
}

/* ---------- la sauvegarde ---------- */

// Les liens d'une sauvegarde (la migration v91 → v92 ; reparerPartie) : ce qui est lisible est gardé ; l'ordre ne
// garde que des ids de villageois, la demi-matrice ses chiffres (une paire illisible ou de trop s'en va : son
// estimation la remplace) ; un foyer garde deux membres qui sont là, son enfant s'il est là ; une entraide, deux ids.
export function reparerLiens(state) {
  if (!Array.isArray(state.villageois)) return state;
  const ids = new Set(state.villageois.filter((v) => v && typeof v.id === 'string').map((v) => v.id));
  const o = objet(state.liens) ? state.liens : {};
  const ordre = [];
  for (const id of Array.isArray(o.ordre) ? o.ordre : []) if (typeof id === 'string' && !ordre.includes(id)) ordre.push(id);
  // (un id inconnu garde sa place : les rangs des autres ne bougent pas ; il ne compte simplement pour personne)
  const n = ordre.length, tot = (n * (n - 1)) / 2;
  let aff = typeof o.aff === 'string' ? o.aff.toLowerCase() : '';
  const k = Math.min(tot, Math.floor(aff.length / 2));
  let bon = 0;
  while (bon < k && /^[0-9a-z]{2}$/.test(aff.slice(bon * 2, bon * 2 + 2)) && parseInt(aff.slice(bon * 2, bon * 2 + 2), 36) <= 100) bon++;
  aff = aff.slice(0, bon * 2);
  const foyers = [], dans = new Set();
  for (const f of Array.isArray(o.foyers) ? o.foyers : []) {
    if (!objet(f) || !Array.isArray(f.membres)) continue;
    const m = [...new Set(f.membres.filter((x) => typeof x === 'string' && ids.has(x) && !dans.has(x)))];
    if (m.length !== 2) continue;
    m.forEach((x) => dans.add(x));
    const enfant = typeof f.enfant === 'string' && ids.has(f.enfant) && !dans.has(f.enfant) ? f.enfant : null;
    if (enfant) dans.add(enfant);
    foyers.push({ id: typeof f.id === 'string' ? f.id : `fy-${foyers.length + 1}`, membres: m.sort(), maison: Number.isInteger(f.maison) ? f.maison : null, jour: Number.isInteger(f.jour) ? f.jour : 1, enfant, attend: !enfant && !!f.attend });
  }
  const entraide = (Array.isArray(o.entraide) ? o.entraide : []).filter((e) => objet(e) && Number.isInteger(e.jour) && ids.has(e.de) && ids.has(e.a)).map((e) => ({ jour: e.jour, de: e.de, a: e.a }));
  state.liens = { ordre, aff, foyers, entraide };
  // (un enfant garde son foyer s'il est là, sinon il n'en a plus : il vit avec les siens tout de même)
  state.villageois = state.villageois.map((v) => (v && v.enfant && !foyers.some((f) => f.enfant === v.id) ? { ...v, foyer: null } : v));
  return state;
}
