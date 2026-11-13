import { DATA } from './catalog.js';
import { mulberry32 } from './base.js';
import { hache } from './ferme-generee.js';
import { farmSeed } from './terrain.js';
import { villageActif } from './village.js';
import { trouverVillageois, villageoisDe } from './villageois.js';
import { positionVillageois } from './villageois-journee.js';
import { tacheSansHumeur } from './villageois-amitie.js';

/* ---------- les traits de personnalité des villageois (le chantier « l'île à bâtir », fiche I6c) ----------

   Chaque villageois a deux ou trois traits (TRAITS, data/village.json), tirés de la graine de la partie et de son
   rang d'arrivée (tirerTraits : jamais deux opposés, jamais la même liste que celle d'un autre villageois), gardés
   avec lui (v.traits). Un trait ne fait rien qui ne soit un de ses réglages : ce module les lit et les combine pour
   les autres (aucun code n'est propre à un trait) :
     - l'horaire (horaireDesTraits : les décalages s'ajoutent ; FLANER, CHEZ_LUI, TRAVAIL), les buts de ses sorties
       (butsDesTraits) et la visite du soir (soirDesTraits) : villageois-journee.js ;
     - la parole : la part des sujets du moment (partDesTraits), le poids des sujets (sujetsDesTraits, propos.js
       direSujet), ses phrases (phraseTrait, villageois-amitie.js parlerVillageois), ses répliques quand il croise un
       autre villageois (repliqueTrait, villageois-liens.js echangeVillageois), sa bulle courte (brefDesTraits) ;
     - la scène : la durée d'un salut, la cadence d'une causerie (causeDesTraits : villageois-liens.js
       liensPourLaCarte, js/carte/ferme/villageois-social.js) ;
     - les postes : la tâche qu'il aime, celle qu'il boude (goutTache) ; sa cible de bonheur monte à la première,
       baisse un peu à la seconde (bonheurDesTraits, villageois.js nuitDe) ; le rendement ne change pas ;
     - les affinités : des paires accordées font monter l'affinité plus vite (accordsTraits, liens.js liensNuit).
   La découverte : les traits ne s'affichent pas d'emblée. Un trait se note (v.traitsConnus) quand on a vu le
   villageois faire ce qui le montre (son SIGNE, VU jours différents : observerTraits, appelé par la page avec ceux
   que la carte montre) ou qu'on l'a entendu en parler DIT fois (ses phrases, ses répliques : noterIndice) ; les
   indices sont gardés (v.indices : { trait: [n, dernier jour] }).
   Les tests : tests/engine/village-traits.test.mjs. */

const T = () => DATA.TRAITS || {};
const LISTE = () => T().LISTE || {};
const objet = (v) => !!v && typeof v === 'object' && !Array.isArray(v);
const graineDe = (state) => farmSeed(state) || 'ile';
const jourDe = (state) => Math.max(1, Math.floor(Number(state && state.day) || 1));
const rngDe = (cle) => mulberry32(hache(cle));
const minuscule = (t) => (t ? t.charAt(0).toLowerCase() + t.slice(1) : t);

// Le réglage du trait `id`, ou null.
export function traitDef(id) {
  const L = LISTE();
  return typeof id === 'string' && Object.prototype.hasOwnProperty.call(L, id) && objet(L[id]) ? L[id] : null;
}

// Les traits du villageois `v` (ceux que le jeu connaît) : une liste d'ids.
export function traitsDe(v) {
  return v && Array.isArray(v.traits) ? v.traits.filter((t) => traitDef(t)) : [];
}

// Ses traits que le joueur a découverts.
export function traitsConnus(v) {
  const t = new Set(traitsDe(v));
  return v && Array.isArray(v.traitsConnus) ? v.traitsConnus.filter((x, k, l) => t.has(x) && l.indexOf(x) === k) : [];
}

// `a` et `b` sont-ils opposés (l'un dit `oppose` de l'autre) ?
export function opposes(a, b) {
  const A = traitDef(a), B = traitDef(b);
  return !!((A && A.oppose === b) || (B && B.oppose === a));
}

// Une liste de traits est-elle juste : des traits connus du jeu, sans double ni opposés, NOMBRE[0] à NOMBRE[1] ?
export function traitsValides(l) {
  const [mn, mx] = Array.isArray(T().NOMBRE) ? T().NOMBRE : [2, 3];
  if (!Array.isArray(l) || l.length < mn || l.length > mx || new Set(l).size !== l.length || !l.every((t) => traitDef(t))) return false;
  for (let i = 0; i < l.length; i++) for (let j = i + 1; j < l.length; j++) if (opposes(l[i], l[j])) return false;
  return true;
}

const cleListe = (l) => [...l].sort().join('+');

/* ---------- le tirage ---------- */

// Les traits d'un villageois (son rang d'arrivée `rang`, la clé `cle` du tirage : la graine de la partie et le rang),
// tirés sans opposés ; `pris` : les listes des autres villageois (des listes d'ids), qu'il ne reprend pas. → [ids].
export function tirerTraits(cle, pris = []) {
  const ids = Object.keys(LISTE()).filter((t) => traitDef(t));
  const [mn, mx] = Array.isArray(T().NOMBRE) ? T().NOMBRE : [2, 3];
  const deja = new Set(pris.filter(Array.isArray).map(cleListe));
  const rnd = rngDe(`${cle}:traits`);
  let dernier = [];
  for (let essai = 0; essai < 60; essai++) {
    const n = Math.min(ids.length, rnd() < (Number(T().TROIS) || 0) ? mx : mn);
    const out = [];
    let reste = [...ids];
    while (out.length < n && reste.length) {
      const t = reste[Math.floor(rnd() * reste.length)];
      out.push(t);
      reste = reste.filter((x) => x !== t && !opposes(x, t));
    }
    dernier = out;
    if (out.length >= mn && !deja.has(cleListe(out))) return out;
  }
  return dernier;
}

// Les traits du nouveau venu de rang `rang` dans la partie `state` (ceux des autres villageois exclus).
export function traitsTires(state, rang, autres = villageoisDe(state)) {
  return tirerTraits(`${graineDe(state)}:villageois:${rang}`, autres.map((o) => traitsDe(o)));
}

/* ---------- ce que les traits changent ---------- */

const CLES_HORAIRE = ['LEVER', 'SORTIE', 'MIDI', 'REPRISE', 'SOUPER', 'VEILLEE', 'COUCHER'];

// L'horaire de ses traits : { LEVER … COUCHER (les décalages, en heures, additionnés), FLANER: [matin, après-midi],
// CHEZ_LUI (la chance de rester chez lui à un créneau libre, la plus grande), DEBUT, FIN (sa plage de travail), PAUSE }.
// Tout à 0 sans trait.
export function horaireDesTraits(v) {
  const out = { FLANER: [0, 0], CHEZ_LUI: 0, DEBUT: 0, FIN: 0, PAUSE: 0 };
  for (const k of CLES_HORAIRE) out[k] = 0;
  for (const t of traitsDe(v)) {
    const d = traitDef(t), H = objet(d.HORAIRE) ? d.HORAIRE : {};
    for (const k of CLES_HORAIRE) out[k] += Number(H[k]) || 0;
    if (Array.isArray(d.FLANER)) { out.FLANER[0] += Number(d.FLANER[0]) || 0; out.FLANER[1] += Number(d.FLANER[1]) || 0; }
    out.CHEZ_LUI = Math.max(out.CHEZ_LUI, Number(d.CHEZ_LUI) || 0);
    const W = objet(d.TRAVAIL) ? d.TRAVAIL : {};
    out.DEBUT += Number(W.DEBUT) || 0; out.FIN += Number(W.FIN) || 0; out.PAUSE += Number(W.PAUSE) || 0;
  }
  return out;
}

// Le produit des facteurs `champ` de ses traits (1 sans eux).
function produit(v, lire) {
  let f = 1;
  for (const t of traitsDe(v)) { const x = Number(lire(traitDef(t))); if (Number.isFinite(x) && x >= 0) f *= x; }
  return f;
}

// Les facteurs de ses traits sur le poids des buts de ses sorties : { but: facteur } (rien : 1).
export function butsDesTraits(v) {
  const out = {};
  for (const t of traitsDe(v)) {
    const B = traitDef(t).BUTS;
    if (objet(B)) for (const [k, x] of Object.entries(B)) if (Number.isFinite(Number(x))) out[k] = (k in out ? out[k] : 1) * Math.max(0, Number(x));
  }
  return out;
}

// Le facteur de ses traits sur la chance de la visite du soir.
export const soirDesTraits = (v) => produit(v, (d) => (d.SOIR === undefined ? 1 : d.SOIR));
// Le facteur sur la chance de dire un sujet du moment.
export const partDesTraits = (v) => produit(v, (d) => (objet(d.PAROLE) && d.PAROLE.PART !== undefined ? d.PAROLE.PART : 1));
// Le facteur sur la durée d'un salut, la cadence d'une causerie (la scène).
export const causeDesTraits = (v) => produit(v, (d) => (objet(d.SCENE) && d.SCENE.CAUSE !== undefined ? d.SCENE.CAUSE : 1));
// Sa bulle est-elle courte (elle ne dit pas son humeur) ?
export const brefDesTraits = (v) => traitsDe(v).some((t) => objet(traitDef(t).PAROLE) && traitDef(t).PAROLE.BREF === true);

// Le poids de ses traits sur les sujets du moment : (id du sujet) → facteur (1 : rien). « lune_* » : tous ceux qui
// commencent par « lune_ ». null sans aucun poids.
export function sujetsDesTraits(v) {
  const regles = [];
  for (const t of traitsDe(v)) { const P = traitDef(t).PROPOS; if (objet(P)) for (const [k, x] of Object.entries(P)) if (Number.isFinite(Number(x))) regles.push([k, Math.max(0, Number(x))]); }
  if (!regles.length) return null;
  return (id) => {
    let f = 1;
    for (const [k, x] of regles) if (k.endsWith('*') ? id.startsWith(k.slice(0, -1)) : id === k) f *= x;
    return f;
  };
}

// Les tâches du trait `t` : { tâche: 'aime' | 'boude' } (son réglage POSTE).
const posteDe = (t) => (traitDef(t) && objet(traitDef(t).POSTE) ? traitDef(t).POSTE : {});

// La tâche `tache` est-elle à son goût ? 'aime', 'boude' ou null (une tâche qu'un trait aime et qu'un autre boude ne
// compte pas). `o.connus` : seulement ses traits découverts (ce que le joueur sait).
export function goutTache(v, tache, o = {}) {
  if (!tache) return null;
  const l = o.connus ? traitsConnus(v) : traitsDe(v);
  const aime = l.some((t) => posteDe(t)[tache] === 'aime'), boude = l.some((t) => posteDe(t)[tache] === 'boude');
  return aime && !boude ? 'aime' : boude && !aime ? 'boude' : null;
}

// Les tâches à son goût et boudées (tous ses traits, ou ceux connus) : { aime: [tâches], boude: [tâches] }.
export function tachesDesTraits(v, o = {}) {
  const l = o.connus ? traitsConnus(v) : traitsDe(v);
  const ids = [...new Set(l.flatMap((t) => Object.keys(posteDe(t))))];
  return { aime: ids.filter((x) => goutTache(v, x, o) === 'aime'), boude: ids.filter((x) => goutTache(v, x, o) === 'boude') };
}

// Ce que ses traits ajoutent à sa cible de bonheur (villageois.js nuitDe) : POSTES.AIME s'il a travaillé aujourd'hui à
// la tâche qu'il aime ; −POSTES.BOUDE à celle qu'il boude (rien pour un ami proche du joueur : tacheSansHumeur). Sans
// travail aujourd'hui, rien.
export function bonheurDesTraits(state, v) {
  if (!villageActif(state) || !v) return 0;
  const W = v.travail, jour = jourDe(state);
  const tache = W && W.jour === jour && Number(W.actions) > 0 ? W.tache || v.tache : null;
  const g = goutTache(v, tache), P = T().POSTES || {};
  if (g === 'aime') return Number(P.AIME) || 0;
  if (g === 'boude' && !tacheSansHumeur(state, v.id)) return -(Number(P.BOUDE) || 0);
  return 0;
}

// Les paires de traits accordées de `va` et `vb` (TRAITS.ACCORDS) : leur nombre, ACCORD.MAX au plus.
export function accordsTraits(va, vb) {
  const A = traitsDe(va), B = traitsDe(vb), L = Array.isArray(T().ACCORDS) ? T().ACCORDS : [];
  if (!A.length || !B.length) return 0;
  let n = 0;
  for (const [x, y] of L) if ((A.includes(x) && B.includes(y)) || (A.includes(y) && B.includes(x))) n++;
  return Math.min(n, Math.max(0, Number((T().ACCORD || {}).MAX) || 0));
}

// Le gain d'affinité de plus de la paire (liens.js liensNuit) : ACCORD.GAIN par paire accordée.
export function gainAccords(va, vb) {
  return accordsTraits(va, vb) * (Number((T().ACCORD || {}).GAIN) || 0);
}

/* ---------- la parole ---------- */

// Les mots d'une phrase de trait : {e} (son accord), {plat} (un plat qu'il adore ou aime, sinon un plat de la cuisine).
function remplirTrait(texte, v, rnd) {
  const G = objet(v.gouts) ? v.gouts : {};
  const plats = Object.keys(G).filter((it) => ['adore', 'aime'].includes(G[it]) && DATA.OBJETS[it] && DATA.OBJETS[it].plat).sort();
  const recettes = (((DATA.TACHES || {}).LISTE || {}).cuisine || {}).RECETTES || [];
  const l = plats.length ? plats : recettes.filter((it) => DATA.OBJETS[it]);
  return String(texte || '').replace(/\{(\w+)\}/g, (x, k) => {
    if (k === 'e') return v.genre === 'm' ? '' : 'e';
    if (k === 'plat') return l.length ? minuscule(DATA.OBJETS[l[Math.floor(rnd() * l.length)]].nom) : 'un bon plat';
    return x;
  });
}

// Une de ses phrases de trait, plutôt d'un trait que le joueur ne connaît pas encore : { trait, texte }, ou null.
export function phraseTrait(v, rnd) {
  const tous = traitsDe(v).filter((t) => Array.isArray(traitDef(t).PHRASES) && traitDef(t).PHRASES.length);
  if (!tous.length) return null;
  const connus = new Set(traitsConnus(v)), neufs = tous.filter((t) => !connus.has(t));
  const l = neufs.length ? neufs : tous;
  const t = l[Math.floor(rnd() * l.length)], P = traitDef(t).PHRASES;
  return { trait: t, texte: remplirTrait(P[Math.floor(rnd() * P.length)], v, rnd) };
}

// Une de ses répliques de trait quand il croise `autre` (une fois sur PAROLE.REPLIQUE) : { trait, paire: [ce qu'il
// dit, ce que l'autre répond], emoji }, ou null. Le tirage : `cle` (la paire, le jour, le rang de l'échange).
export function repliqueTrait(state, v, cle) {
  const l = traitsDe(v).filter((t) => Array.isArray(traitDef(t).REPLIQUES) && traitDef(t).REPLIQUES.length);
  if (!l.length) return null;
  const rnd = rngDe(`${graineDe(state)}:trait-replique:${cle}`);
  if (rnd() >= (Number((T().PAROLE || {}).REPLIQUE) || 0)) return null;
  const t = l[Math.floor(rnd() * l.length)], R = traitDef(t).REPLIQUES, p = R[Math.floor(rnd() * R.length)];
  return Array.isArray(p) && p.length ? { trait: t, paire: p, emoji: (objet(traitDef(t).SCENE) && traitDef(t).SCENE.EMOJI) || '' } : null;
}

/* ---------- la découverte ---------- */

// Un indice du trait `trait` du villageois `v` : `sorte` 'vu' (une fois par jour au plus, VU jours) ou 'dit' (DIT
// fois). → true si le trait vient de se révéler (noté dans sa fiche ; l'avis « trait:<id> » pour la page).
export function noterIndice(state, v, trait, sorte = 'vu') {
  if (!v || !traitsDe(v).includes(trait)) return false;
  if (traitsConnus(v).includes(trait)) return false;
  const D = T().DECOUVERTE || {}, jour = jourDe(state);
  if (!objet(v.indices)) v.indices = {};
  const cle = sorte === 'dit' ? `${trait}:dit` : trait;
  const i = Array.isArray(v.indices[cle]) ? v.indices[cle] : [0, 0];
  if (sorte !== 'dit' && i[1] === jour) return false;
  const n = (Number(i[0]) || 0) + 1;
  v.indices[cle] = [n, jour];
  const seuil = Math.max(1, Number(sorte === 'dit' ? D.DIT : D.VU) || 1);
  if (n < seuil) return false;
  return revelerTrait(v, trait);
}

// Le trait `trait` de `v` se note dans sa fiche. → true s'il ne l'était pas.
export function revelerTrait(v, trait) {
  if (!v || !traitsDe(v).includes(trait) || traitsConnus(v).includes(trait)) return false;
  v.traitsConnus = [...traitsConnus(v), trait];
  if (objet(v.indices)) { delete v.indices[trait]; delete v.indices[`${trait}:dit`]; }
  if (!Array.isArray(v.avis)) v.avis = [];
  if (!v.avis.includes(`trait:${trait}`)) v.avis.push(`trait:${trait}`);
  return true;
}

// Fait-il, à l'heure `heure`, ce que montre le trait `trait` (son SIGNE) ? `seg` : le segment de sa journée.
export function signeVu(trait, seg, heure) {
  const S = traitDef(trait) && traitDef(trait).SIGNE;
  if (!objet(S) || !seg) return false;
  if (Array.isArray(S.etats) && !S.etats.includes(seg.etat)) return false;
  if (Array.isArray(S.buts) && !(seg.but && S.buts.includes(seg.but.sorte))) return false;
  if (Array.isArray(S.heures) && !S.heures.some(([de, a]) => heure >= de && heure < a)) return false;
  return true;
}

// Ce que la carte montre (la page l'appelle avec les villageois dans la vue, `ids`, à l'heure `heure`) : chacun qui
// fait ce que montre un de ses traits pas encore connus compte un indice (un par jour). → [{ id, trait }] : ceux qui
// viennent de se révéler.
export function observerTraits(state, ids, heure) {
  if (!villageActif(state) || !Array.isArray(ids)) return [];
  const out = [];
  for (const id of ids) {
    const v = trouverVillageois(state, id);
    if (!v || v.accueil) continue;
    const connus = new Set(traitsConnus(v)), l = traitsDe(v).filter((t) => !connus.has(t) && traitDef(t).SIGNE);
    if (!l.length) continue;
    const seg = positionVillageois(state, id, heure);
    for (const t of l) if (signeVu(t, seg, heure) && noterIndice(state, v, t, 'vu')) out.push({ id, trait: t });
  }
  return out;
}

/* ---------- la fiche ---------- */

// Le nom du trait au genre du villageois.
export function nomTrait(trait, v) {
  const d = traitDef(trait);
  if (!d) return trait;
  const n = Array.isArray(d.nom) ? d.nom[v && v.genre === 'm' ? 1 : 0] : d.nom;
  return String(n || trait);
}

// Ses traits pour la fiche : [{ id (null : à découvrir), nom, icone, dit }], les connus d'abord, puis un « ? » par trait
// à découvrir ; aime / boude : les tâches à son goût que le joueur sait.
export function traitsPourFiche(v) {
  if (!v) return { traits: [], aime: [], boude: [] };
  const connus = traitsConnus(v), n = traitsDe(v).length;
  const traits = connus.map((t) => ({ id: t, nom: nomTrait(t, v), icone: traitDef(t).icone || '', dit: remplirTrait(traitDef(t).dit || '', v, () => 0) }));
  for (let k = connus.length; k < n; k++) traits.push({ id: null, nom: '?', icone: '', dit: '' });
  return { traits, ...tachesDesTraits(v, { connus: true }) };
}

/* ---------- la sauvegarde (la migration v92 → v93) ---------- */

// Les traits des villageois d'une sauvegarde : chacun en a de justes (tirés de la graine et de son rang s'ils manquent
// ou sont abîmés : un villageois arrivé avant la fiche I6c reçoit les siens) ; ceux qui sont connus en font partie ;
// les indices sont lisibles. `state` est la copie migrée.
export function reparerTraits(state) {
  if (!Array.isArray(state.villageois)) return state;
  const g = graineDe(state), faits = [];
  state.villageois = state.villageois.map((v, k) => {
    // (un enfant n'a pas de traits : il joue)
    if (!objet(v) || typeof v.id !== 'string' || v.enfant) return v;
    const out = { ...v };
    const pris = faits.slice();
    if (!traitsValides(out.traits) || pris.some((l) => cleListe(l) === cleListe(out.traits))) {
      const m = /^vg-(\d+)$/.exec(v.id), rang = m ? Number(m[1]) : k + 1;
      out.traits = tirerTraits(`${g}:villageois:${rang}`, pris);
    } else out.traits = [...out.traits];
    faits.push(out.traits);
    out.traitsConnus = Array.isArray(v.traitsConnus) ? v.traitsConnus.filter((t, i, l) => out.traits.includes(t) && l.indexOf(t) === i) : [];
    const I = {};
    if (objet(v.indices)) {
      for (const [c, x] of Object.entries(v.indices)) {
        const t = c.replace(/:dit$/, '');
        if (!out.traits.includes(t) || out.traitsConnus.includes(t) || !Array.isArray(x)) continue;
        const n = Math.max(0, Math.floor(Number(x[0]) || 0)), j = Math.max(0, Math.floor(Number(x[1]) || 0));
        if (n > 0) I[c] = [n, j];
      }
    }
    out.indices = I;
    return out;
  });
  return state;
}
