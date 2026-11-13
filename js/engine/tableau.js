import { DATA, prixIle } from './catalog.js';
import { villageActif } from './village.js';
import { humeurVillageois, trouverVillageois, villageoisDe } from './villageois.js';
import { tacheAttente, tacheDef } from './taches.js';
import { toolDef } from './outils.js';
import { validApparence } from './family.js';

/* ---------- le tableau des villageois (le chantier « l'île à bâtir », fiche I3d) ----------

   Ce que chaque villageois a coûté et produit, hier et sur les sept derniers jours, pour décider qui fait quoi. Pur :
   rien n'est écrit dans la partie, tout se lit dans le journal de chaque villageois (villageois.js, nuitDe : ses
   VILLAGE.ARRIVEE.JOURNAL derniers jours, 7 ; chaque entrée : { jour, mange, energie, besoin, lit, bonheur, et
   (I3c) tache, actions, produit, et (I3d) repos, utilise }). La fenêtre est dans js/ui/tableau.js ; le joueur automatique
   s'en sert (bot.js, botVillageois : il réattribue la tâche dont le solde est le plus bas).

   - Le coût d'un jour : ce qu'il a mangé à la boîte commune, au prix de vente de chaque aliment (market.js,
     sellPrice : depuis I4, le prix de l'île, catalog.js prixIle) ; sa part versée (J.part : bourse.js, fiche I4) ;
     et ce que son travail a pris au coffre (J.utilise, taches.js : les ingrédients d'une préparation, la graine
     ressemée, le blé des poules, ce que la tournée du port a vendu), au même prix. Sans cela, la cuisine compterait
     son plat sans ses légumes, et la tournée les pièces d'objets que d'autres ont produits.
   - Le produit d'un jour : chaque objet de sa journée de travail (J.produit), sa quantité, sa valeur au port (le même
     prix ; 0 pour ce qui ne se vend pas : DATA.OBJETS[…].invendable ; les pièces de la tournée du port valent ce
     qu'elles sont : ventes). La tournée vend au prix du port ce que la ferme a déjà : son solde est son repas, et
     ce qu'elle rapporte est le trajet que le joueur n'a pas fait.
   - Le solde : le produit moins le coût. Un jour de repos compte son repas et aucun produit.
   - Le rendement de sa tâche : ce qu'elle a produit (moins ce qu'elle a pris au coffre) par jour de travail (les jours où il avait une tâche et ne se
     reposait pas), en % de la moyenne des tâches faites dans le village sur la période (100 : la moyenne) ; null
     sans jour de travail, ou si aucune tâche n'a rien produit.
   Des entiers partout. Les périodes : « hier » (le jour d'avant celui de la partie), « semaine » (les sept derniers
   jours, glissants : ceux qui finissent hier). Le chantier éteint, rien : villageoisDe est vide. */

// Les périodes du tableau : leur nombre de jours (jusqu'à hier compris).
export const PERIODES = { hier: 1, semaine: 7 };
// Les colonnes qui se trient, et leur sens par défaut (le premier appui).
export const COLONNES = { prenom: 1, tache: 1, cout: -1, produit: -1, solde: -1, humeur: -1 };

const objet = (o) => !!o && typeof o === 'object' && !Array.isArray(o);
const entier = (n) => (Number.isFinite(Number(n)) ? Math.round(Number(n)) : 0);
const jourDe = (state) => Math.max(1, Math.floor(Number(state && state.day) || 1));
const joursDe = (periode) => PERIODES[periode] || PERIODES.semaine;

// La valeur au port d'une unité de `o` (en pièces, un entier) : son prix de vente ; 0 s'il ne se vend pas ; les pièces
// (la tournée du port) valent une pièce.
export function valeurPort(o) {
  if (o === 'pieces') return 1;
  const d = DATA.OBJETS[o];
  return d && !d.invendable ? Math.max(0, entier(prixIle(o))) : 0;
}

// Les entrées du journal de `v` sur la période : celles des `periode` jours qui finissent hier, de la plus ancienne à
// la plus récente.
export function entreesPeriode(state, v, periode = 'semaine') {
  const aujourdhui = jourDe(state), depuis = aujourdhui - joursDe(periode);
  return (Array.isArray(v && v.journal) ? v.journal : [])
    .filter((J) => objet(J) && Number.isInteger(J.jour) && J.jour >= depuis && J.jour < aujourdhui)
    .sort((a, b) => a.jour - b.jour);
}

// Le bilan d'un jour (une entrée du journal) : { jour, tache, actions, sur (ACTIONS de sa tâche), repos, mange,
// repas (son coût en pièces), part, utilise ({ objet: n }), matieres (leur valeur), cout, produit ([{ objet, n,
// valeur }], du plus cher au moins cher), valeur, ventes (les pièces de la tournée du port), solde }.
export function bilanJour(J) {
  const mange = {}, utilise = {}, produit = [];
  let repas = 0, matieres = 0, valeur = 0, ventes = 0;
  for (const [o, n0] of Object.entries(objet(J.mange) ? J.mange : {})) {
    const n = entier(n0);
    if (n <= 0) continue;
    mange[o] = n;
    repas += n * valeurPort(o);
  }
  for (const [o, n0] of Object.entries(objet(J.utilise) ? J.utilise : {})) {
    const n = entier(n0);
    if (n <= 0) continue;
    utilise[o] = n;
    matieres += n * valeurPort(o);
  }
  for (const [o, n0] of Object.entries(objet(J.produit) ? J.produit : {})) {
    const n = entier(n0);
    if (n <= 0) continue;
    const val = n * valeurPort(o);
    produit.push({ objet: o, n, valeur: val });
    valeur += val;
    if (o === 'pieces') ventes += val;
  }
  produit.sort((a, b) => b.valeur - a.valeur || (a.objet < b.objet ? -1 : 1));
  const part = Math.max(0, entier(J.part));
  const tache = tacheDef(J.tache) ? J.tache : null;
  const cout = repas + part + matieres;
  return {
    jour: J.jour, tache, actions: Math.max(0, entier(J.actions)), sur: tache ? tacheDef(tache).ACTIONS : 0, repos: !!J.repos,
    mange, repas, part, utilise, matieres, cout, produit, valeur, ventes, solde: valeur - cout,
  };
}

// Ce qui lui manque aujourd'hui, en quelques mots (une ligne du tableau) : '' rien.
export function manqueCourt(state, v) {
  if (!v) return '';
  if (v.accueil) return 'en route vers sa maison';
  if (v.repos) return v.faim > 0 ? 'en repos : pas assez à manger' : 'en repos : pas de lit';
  const def = tacheDef(v.tache);
  if (!def) return 'sans tâche';
  if (!tacheAttente(state, v)) return '';
  if (def.outil && v.outil !== def.outil) {
    const o = toolDef(def.outil), nom = o && o.NOM ? o.NOM.toLowerCase() : def.outil;
    return `sans outil : ${o && o.ARTICLE === 'un' ? 'un' : 'une'} ${nom}`;
  }
  if (v.tache === 'navette' && !(Array.isArray(v.vendre) && v.vendre.length)) return 'rien à porter au port';
  return `sans poste : ${(def.SANS || '').replace(/\.$/, '').replace(/^./, (c) => c.toLowerCase())}`;
}

// Le rang d'une humeur (pour le tri : de la meilleure à la moins bonne).
const RANG_HUMEUR = { heureux: 3, content: 2, triste: 1, faim: 0 };

// Le bilan d'un villageois sur la période : { id, prenom, genre, perso, apparence, tache (l'actuelle), nom, icone,
// humeur, bonheur, manque, jours ([bilanJour]), cout, repas, part, matieres, valeur, ventes, solde, produit ([{ objet,
// n, valeur }] cumulé), mange et utilise ({ objet: n }), joursTravail (jours où il avait une tâche sans se reposer), joursRepos,
// parTache ({ tache: { jours, valeur } }), rendement (null : calculé par tableauVillage) } ; null inconnu.
export function bilanVillageois(state, id, periode = 'semaine') {
  const v = typeof id === 'string' ? trouverVillageois(state, id) : id;
  if (!v) return null;
  const jours = entreesPeriode(state, v, periode).map(bilanJour);
  const produit = new Map(), mange = {}, utilise = {}, parTache = {};
  let cout = 0, repas = 0, part = 0, matieres = 0, valeur = 0, ventes = 0, joursTravail = 0, joursRepos = 0;
  for (const j of jours) {
    cout += j.cout; repas += j.repas; part += j.part; matieres += j.matieres; valeur += j.valeur; ventes += j.ventes;
    for (const [o, n] of Object.entries(j.mange)) mange[o] = (mange[o] || 0) + n;
    for (const [o, n] of Object.entries(j.utilise)) utilise[o] = (utilise[o] || 0) + n;
    for (const p of j.produit) {
      const q = produit.get(p.objet) || { objet: p.objet, n: 0, valeur: 0 };
      q.n += p.n; q.valeur += p.valeur;
      produit.set(p.objet, q);
    }
    if (j.repos) joursRepos++;
    else if (j.tache) {
      joursTravail++;
      const t = parTache[j.tache] || (parTache[j.tache] = { jours: 0, valeur: 0 });
      t.jours++; t.valeur += j.valeur - j.matieres;
    }
  }
  const def = tacheDef(v.tache);
  return {
    id: v.id, prenom: v.prenom, genre: v.genre, perso: v.perso, apparence: validApparence(v.apparence, false),
    tache: def ? v.tache : null, nom: def ? def.nom : '', icone: def ? def.icone : '',
    humeur: humeurVillageois(v), bonheur: entier(v.bonheur), manque: manqueCourt(state, v),
    jours, cout, repas, part, matieres, valeur, ventes, solde: valeur - cout,
    produit: [...produit.values()].sort((a, b) => b.valeur - a.valeur || (a.objet < b.objet ? -1 : 1)),
    mange, utilise, joursTravail, joursRepos, parTache, rendement: null,
  };
}

// La moyenne des tâches du village sur la période : ce que chaque tâche faite a produit par jour de travail (tous
// villageois confondus), puis la moyenne de ces valeurs, entre les tâches. → { parTache: { tache: valeur par jour },
// moyenne } (entiers ; moyenne 0 sans tâche).
export function moyenneTaches(lignes) {
  const t = {};
  for (const l of lignes) for (const [k, x] of Object.entries(l.parTache)) {
    const a = t[k] || (t[k] = { jours: 0, valeur: 0 });
    a.jours += x.jours; a.valeur += x.valeur;
  }
  const parTache = {};
  for (const [k, a] of Object.entries(t)) if (a.jours > 0) parTache[k] = Math.round(a.valeur / a.jours);
  const l = Object.values(parTache);
  return { parTache, moyenne: l.length ? Math.round(l.reduce((s, x) => s + x, 0) / l.length) : 0 };
}

// Trie les lignes (une copie) par `colonne` (COLONNES), dans le sens `sens` (1 croissant, −1 décroissant ; le sens par
// défaut de la colonne sinon) ; à égalité, par prénom puis par id.
export function trierTableau(lignes, colonne = 'solde', sens = 0) {
  const c = COLONNES[colonne] ? colonne : 'solde';
  const s = sens === 1 || sens === -1 ? sens : COLONNES[c];
  const cle = (l) => (c === 'prenom' ? l.prenom || '' : c === 'tache' ? l.nom || '~' : c === 'cout' ? l.cout
    : c === 'produit' ? l.valeur : c === 'humeur' ? (RANG_HUMEUR[l.humeur] ?? 0) * 1000 + l.bonheur : l.solde);
  const cmp = (a, b) => {
    const x = cle(a), y = cle(b);
    if (typeof x === 'string') return x.localeCompare(y, 'fr');
    return x - y;
  };
  return [...lignes].sort((a, b) => s * cmp(a, b) || (a.prenom || '').localeCompare(b.prenom || '', 'fr') || (a.id < b.id ? -1 : 1));
}

// Le tableau du village sur la période : { periode, jours (sa longueur), du, au (les jours couverts), lignes (un bilan
// par villageois, son rendement compris, triées par `tri` : { colonne, sens }), moyenne (moyenneTaches), total
// ({ cout, repas, part, matieres, valeur, ventes, solde, produit }) } ; null le chantier éteint ou sans villageois.
export function tableauVillage(state, periode = 'semaine', tri = {}) {
  if (!villageActif(state)) return null;
  const V = villageoisDe(state);
  if (!V.length) return null;
  const p = PERIODES[periode] ? periode : 'semaine';
  const lignes = V.map((v) => bilanVillageois(state, v, p));
  const moyenne = moyenneTaches(lignes);
  for (const l of lignes) {
    if (!l.joursTravail || moyenne.moyenne <= 0) continue;
    const par = Object.values(l.parTache).reduce((s, x) => s + x.valeur, 0) / l.joursTravail;
    l.rendement = Math.round((100 * par) / moyenne.moyenne);
  }
  const total = { cout: 0, repas: 0, part: 0, matieres: 0, valeur: 0, ventes: 0, solde: 0, produit: [] };
  const produit = new Map();
  for (const l of lignes) {
    for (const k of ['cout', 'repas', 'part', 'matieres', 'valeur', 'ventes', 'solde']) total[k] += l[k];
    for (const x of l.produit) {
      const q = produit.get(x.objet) || { objet: x.objet, n: 0, valeur: 0 };
      q.n += x.n; q.valeur += x.valeur;
      produit.set(x.objet, q);
    }
  }
  total.produit = [...produit.values()].sort((a, b) => b.valeur - a.valeur || (a.objet < b.objet ? -1 : 1));
  const au = jourDe(state) - 1;
  return {
    periode: p, jours: PERIODES[p], du: Math.max(1, au - PERIODES[p] + 1), au,
    lignes: trierTableau(lignes, tri.colonne, tri.sens), moyenne, total,
  };
}

// Pour le joueur automatique (bot.js, botReattribuer) : parmi les villageois `ids` (tous ceux qui ont une tâche, par
// défaut), celui dont le solde de la semaine est le plus bas ; à égalité, le premier arrivé. complet : il a fait sa
// tâche (l'actuelle) les `jours` derniers jours sans interruption ni repos (une semaine pleine sur elle : son solde
// juge la tâche, pas la faim).
// → { id, tache, solde, complet } ou null.
export function soldeLePlusBas(state, jours = PERIODES.semaine, ids = null) {
  const T = tableauVillage(state, 'semaine');
  if (!T) return null;
  let bas = null;
  for (const v of villageoisDe(state)) {
    if (!tacheDef(v.tache) || (ids && !ids.includes(v.id))) continue;
    const l = T.lignes.find((x) => x.id === v.id);
    if (bas && l.solde >= bas.solde) continue;
    const E = entreesPeriode(state, v, 'semaine');
    bas = { id: v.id, tache: v.tache, solde: l.solde, complet: E.length >= jours && E.slice(-jours).every((J) => J.tache === v.tache && !J.repos) };
  }
  return bas;
}
