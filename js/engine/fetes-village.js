import { DATA } from './catalog.js';
import { fail } from './devices.js';
import { villageActif } from './village.js';
import { countItem, inventoryCounts, takeItem, addItem } from './inventory.js';
import { moonPhase } from './lune.js';
import { villageoisDe } from './villageois.js';
import { debloque, vocationsEtat } from './vocations.js';
import { centreDeLaPlace } from './projets-village.js';

/* ---------- les fêtes du village (le chantier « l'île à bâtir », fiche I8a) ----------

   Trois sortes (VOCATIONS.village.FETES, data/village.json) :
     - la fête du village (« mois ») : le joueur la fixe au calendrier (fixerFete), un jour à venir, PAR_MOIS par mois
       de lune (une de plus avec le déblocage « fete:seconde ») ; il fournit les plats (un plat de l'inventaire par
       PLATS.PAR villageois, PLATS.MIN au moins), mis de côté pour elle ; annulée, ils lui reviennent ;
     - la veillée de pleine lune (« pleine_lune ») : d'elle-même, le premier jour de pleine lune de chaque mois, dès
       VEILLEE_MIN villageois, sans plats, le soir (VEILLEE) ; une fête du joueur ce jour-là la remplace ;
     - la fête de l'ouverture d'un commerce (« ouverture ») : les commerces d'I5a la fixeront (fixerFeteOuverture), le
       lendemain de l'ouverture ; sans plats (le commerce régale).
   Ce jour-là, de DEBUT à FIN h, tous les villageois viennent sur la place (la journée : villageois-journee.js,
   planDeFete) : attablés aux tables du dehors, assis sur les bancs, debout en petits groupes, ils causent ; le soir, les
   lampions s'allument (la scène : js/carte/ferme/fete.js). La nuit (fetesVillageNuit, après la nuit des villageois),
   la fête est tenue : chacun de ceux qui y étaient (presentsALaFete) a vu monter son affinité avec chacun des autres
   (liens.js : VILLAGE.LIENS.GAINS.FETE, aLaFete) et son bonheur viser plus haut (bonheurDeLaFete : BONHEUR, et un point
   par sorte de plat, VARIETE au plus) ; elle compte pour la convivialité (vocation-village.js).

   La partie garde (state.vocations.village) : fetes ([{ jour, sorte, plats: { objet: n }, commerce?, tenue (true :
   elle a eu lieu), venus (le nombre de villageois venus) }] : celles qui sont fixées, et celles qui ont eu lieu les
   GARDE derniers jours), tenues (combien de fêtes ont eu lieu en tout ; ne baisse jamais), annonce (le jour de la
   dernière annonce du matin, js/ui/fetes-village.js). Les tests : tests/engine/village-vocations.test.mjs. */

const FE = () => ((DATA.VOCATIONS || {}).village || {}).FETES || {};
const MOIS = () => DATA.LUNE.JOURS_MOIS;
const GARDE = 60;
const objet = (v) => !!v && typeof v === 'object' && !Array.isArray(v);
const jourDe = (state) => Math.max(1, Math.floor(Number(state && state.day) || 1));
const moisDe = (jour) => Math.floor((Math.max(1, jour) - 1) / MOIS());
export const SORTES_FETES = ['mois', 'pleine_lune', 'ouverture'];

// Les données du village dans la partie (state.vocations.village), créées au besoin.
export function villageVocation(state) {
  const V = vocationsEtat(state);
  if (!objet(V.village)) V.village = {};
  const v = V.village;
  if (!Array.isArray(v.fetes)) v.fetes = [];
  if (!Number.isInteger(v.tenues) || v.tenues < 0) v.tenues = 0;
  return v;
}
const lire = (state) => (state && objet(state.vocations) && objet(state.vocations.village) ? state.vocations.village : null);

// Le nom et l'icône d'une fête de la sorte `sorte`.
export function nomFeteVillage(sorte) {
  const [icone, nom] = (FE().NOMS || {})[sorte] || ['🎉', 'La fête du village'];
  return { icone, nom };
}

// Les heures d'une fête de la sorte `sorte` : [debut, fin].
export function heuresFete(sorte) {
  const F = FE();
  if (sorte === 'pleine_lune' && Array.isArray(F.VEILLEE)) return [Number(F.VEILLEE[0]), Number(F.VEILLEE[1])];
  return [Number(F.DEBUT) || 17, Number(F.FIN) || 21];
}

// Les villageois adultes (ni enfant) : ceux qui comptent pour les plats.
const adultes = (state) => villageoisDe(state).filter((v) => !v.enfant);

// Le jour de la veillée de pleine lune du mois de `jour` (le premier jour de pleine lune du mois), ou null.
export function jourVeillee(jour) {
  const premier = moisDe(jour) * MOIS() + 1;
  for (let d = premier; d < premier + MOIS(); d++) if (moonPhase(d).id === 'pleine') return d;
  return null;
}

// Une fête de la partie (une entrée de `fetes`), complétée : { jour, sorte, nom, icone, debut, fin, plats, tenue,
// commerce, fixee (le joueur l'a fixée) }.
function complete(f) {
  const { icone, nom } = nomFeteVillage(f.sorte), [debut, fin] = heuresFete(f.sorte);
  return { jour: f.jour, sorte: f.sorte, nom: f.nom || nom, icone, debut, fin, plats: { ...(f.plats || {}) }, tenue: !!f.tenue, venus: Number(f.venus) || 0, commerce: f.commerce || null, fixee: f.sorte === 'mois' };
}

// Les fêtes du jour `jour` : [fête complétée] ; la première est celle que la journée montre. La veillée de pleine lune
// n'y est que si aucune autre fête n'est ce jour-là et que le village compte VEILLEE_MIN villageois. [] éteint.
export function fetesDuJourVillage(state, jour = jourDe(state)) {
  if (!villageActif(state)) return [];
  const v = lire(state), out = [];
  for (const f of (v && v.fetes) || []) if (objet(f) && f.jour === jour) out.push(complete(f));
  if (!out.length && jourVeillee(jour) === jour && adultes(state).length >= (Number(FE().VEILLEE_MIN) || 2) && centreDeLaPlace(state) !== null) out.push(complete({ jour, sorte: 'pleine_lune' }));
  return out;
}

// La fête du jour `jour` (celle que la journée montre), ou null.
export function feteDuJourVillage(state, jour = jourDe(state)) {
  return fetesDuJourVillage(state, jour)[0] || null;
}

// La fête en cours à l'heure `heure` (aujourd'hui), ou null.
export function feteEnCoursVillage(state, heure) {
  const f = feteDuJourVillage(state);
  return f && heure >= f.debut && heure < f.fin ? f : null;
}

// Les fêtes du mois de lune qui contient `jour`, veillée comprise : [fête complétée], par jour (le calendrier).
export function fetesDuMoisVillage(state, jour = jourDe(state)) {
  if (!villageActif(state)) return [];
  const premier = moisDe(jour) * MOIS() + 1, out = [];
  for (let d = premier; d < premier + MOIS(); d++) out.push(...fetesDuJourVillage(state, d));
  return out;
}

// Les fêtes des `n` prochains jours (aujourd'hui compris) : [fête complétée], dans l'ordre (l'annonce du matin).
export function fetesAVenirVillage(state, n = Number(FE().ANNONCE) || 3) {
  const out = [];
  for (let d = jourDe(state); d < jourDe(state) + n; d++) out.push(...fetesDuJourVillage(state, d));
  return out;
}

// Combien de fêtes le joueur peut fixer par mois de lune (PAR_MOIS, une de plus avec « fete:seconde »).
export function fetesParMois(state) {
  return Math.max(1, Number(FE().PAR_MOIS) || 1) + (debloque(state, 'fete:seconde') ? 1 : 0);
}

// Combien de plats demande une fête du village : un par PLATS.PAR villageois (adultes), PLATS.MIN au moins.
export function platsPourLaFete(state) {
  const P = FE().PLATS || {};
  return Math.max(Number(P.MIN) || 1, Math.ceil(adultes(state).length / Math.max(1, Number(P.PAR) || 2)));
}

// Les plats de l'inventaire (ce qui se cuisine : DATA.OBJETS[…].plat) : { objet: n }.
export function platsDisponibles(state) {
  const out = {};
  for (const [it, n] of Object.entries(inventoryCounts(state))) if (DATA.OBJETS[it] && DATA.OBJETS[it].plat && n > 0) out[it] = n;
  return out;
}

// Le choix des plats, à défaut de celui du joueur : `n` plats de l'inventaire, variés (une sorte après l'autre, la plus
// fournie d'abord). → { objet: n }, ou null s'il n'y en a pas assez.
export function choisirPlats(state, n) {
  const dispo = platsDisponibles(state), sortes = Object.keys(dispo).sort((a, b) => dispo[b] - dispo[a] || (a < b ? -1 : 1));
  const out = {};
  let reste = n;
  while (reste > 0 && sortes.some((s) => (out[s] || 0) < dispo[s])) {
    for (const s of sortes) { if (reste <= 0) break; if ((out[s] || 0) < dispo[s]) { out[s] = (out[s] || 0) + 1; reste--; } }
  }
  return reste > 0 ? null : out;
}

// Pourquoi le joueur ne peut pas fixer une fête du village le jour `jour`, ou null.
export function feteRefus(state, jour) {
  if (!villageActif(state)) return 'Le chantier de l\'île n\'est pas allumé.';
  if (state.mondePartage) return 'Les fêtes se fixent sur l\'île du propriétaire.';
  const d = Math.floor(Number(jour));
  if (!Number.isInteger(d) || d <= jourDe(state)) return 'Choisis un jour à venir (pas aujourd\'hui : il faut le temps de prévenir tout le monde).';
  if (d > jourDe(state) + (Number(FE().JOURS_MAX) || 40)) return `Pas si loin : dans ${Number(FE().JOURS_MAX) || 40} jours au plus.`;
  if (!adultes(state).length) return 'Il faut au moins un villageois pour faire la fête.';
  if (centreDeLaPlace(state) === null) return 'Il faut une place où se retrouver : un puits, ou une table de jardin dehors.';
  const v = lire(state);
  if (((v && v.fetes) || []).some((f) => f.jour === d)) return 'Il y a déjà une fête ce jour-là.';
  const n = ((v && v.fetes) || []).filter((f) => f.sorte === 'mois' && moisDe(f.jour) === moisDe(d)).length;
  if (n >= fetesParMois(state)) return fetesParMois(state) > 1 ? `Déjà ${n} fêtes ce mois de lune.` : 'Une fête par mois de lune (le village en voudra une seconde quand il sera plus convivial).';
  return null;
}

// Le joueur fixe la fête du village au jour `jour`, avec `plats` ({ objet: n } ; null : choisis dans l'inventaire,
// variés) : ils sont mis de côté pour elle. → { ok, fete } ou un refus.
export function fixerFete(state, jour, plats = null) {
  const r = feteRefus(state, jour);
  if (r) return fail(r);
  const n = platsPourLaFete(state);
  const choix = plats && objet(plats) ? Object.fromEntries(Object.entries(plats).filter(([it, q]) => DATA.OBJETS[it] && DATA.OBJETS[it].plat && Number(q) > 0).map(([it, q]) => [it, Math.floor(Number(q))])) : choisirPlats(state, n);
  if (!choix) return fail(`Il faut ${n} plats cuisinés pour la fête (un par ${Number((FE().PLATS || {}).PAR) || 2} villageois) : tu n'en as que ${Object.values(platsDisponibles(state)).reduce((a, b) => a + b, 0)}.`);
  const total = Object.values(choix).reduce((a, b) => a + b, 0);
  if (total < n) return fail(`Il faut ${n} plats pour la fête.`);
  if (Object.entries(choix).some(([it, q]) => countItem(state, it) < q)) return fail('Il te manque un de ces plats.');
  for (const [it, q] of Object.entries(choix)) takeItem(state, it, q);
  const v = villageVocation(state), f = { jour: Math.floor(Number(jour)), sorte: 'mois', plats: choix, tenue: false };
  v.fetes.push(f);
  v.fetes.sort((a, b) => a.jour - b.jour);
  return { ok: true, fete: complete(f) };
}

// Le joueur annule la fête du village du jour `jour` (à venir) : ses plats lui reviennent. → { ok, plats } ou un refus.
export function annulerFete(state, jour) {
  const v = lire(state), d = Math.floor(Number(jour));
  const i = v ? v.fetes.findIndex((f) => f.jour === d && f.sorte === 'mois' && !f.tenue) : -1;
  if (i < 0) return fail('Pas de fête à annuler ce jour-là.');
  if (d <= jourDe(state)) return fail('Trop tard : le village l\'attend aujourd\'hui !');
  const [f] = v.fetes.splice(i, 1);
  for (const [it, q] of Object.entries(f.plats || {})) addItem(state, it, q);
  return { ok: true, plats: { ...(f.plats || {}) } };
}

// La fête de l'ouverture du commerce `commerce` (son id, son nom ; les commerces d'I5a l'appellent à l'ouverture) :
// fixée au premier jour libre à partir de demain, sans plats. → { ok, fete } ou un refus.
export function fixerFeteOuverture(state, commerce, nom = '') {
  if (!villageActif(state)) return fail('Le chantier de l\'île n\'est pas allumé.');
  const v = villageVocation(state);
  let d = jourDe(state) + 1;
  while (v.fetes.some((f) => f.jour === d)) d++;
  const f = { jour: d, sorte: 'ouverture', plats: {}, tenue: false, commerce: String(commerce || ''), ...(nom ? { nom: `La fête de l'ouverture : ${nom}` } : {}) };
  v.fetes.push(f);
  v.fetes.sort((a, b) => a.jour - b.jour);
  return { ok: true, fete: complete(f) };
}

// Ceux qui sont à la fête du jour `jour` : les ids des villageois là ce jour-là (arrivés, chez eux : pas celui qui
// marche encore du port), enfants compris. [] sans fête.
export function presentsALaFete(state, jour = jourDe(state)) {
  if (!feteDuJourVillage(state, jour)) return [];
  return villageoisDe(state).filter((v) => v.accueil !== 'en_route' && (Number(v.arrive) || 0) <= jour).map((v) => v.id);
}

// Le villageois `id` était-il à la fête du jour `jour` ? (liens.js : la même fête, l'affinité monte)
export function aLaFete(state, id, jour = jourDe(state)) {
  return presentsALaFete(state, jour).includes(id);
}

// Ce que la fête du jour ajoute à la cible de bonheur du villageois `v` (villageois.js nuitDe) : BONHEUR, et un point
// par sorte de plat servi (VARIETE au plus), s'il y était ; 0 sinon.
export function bonheurDeLaFete(state, v) {
  if (!v || !villageActif(state)) return 0;
  const f = feteDuJourVillage(state);
  if (!f || !aLaFete(state, v.id)) return 0;
  return (Number(FE().BONHEUR) || 0) + Math.min(Number(FE().VARIETE) || 0, Object.keys(f.plats || {}).length);
}

// La nuit (runNight, après la nuit des villageois) : la fête du jour est tenue (notée, comptée) ; les fêtes passées
// depuis GARDE jours s'oublient (le compte reste). → { sorte, nom, icone, venus, plats } ou null.
export function fetesVillageNuit(state) {
  if (!villageActif(state)) return null;
  const jour = jourDe(state), f = feteDuJourVillage(state, jour);
  let out = null;
  if (f) {
    const venus = presentsALaFete(state, jour).length;
    if (venus) {
      const v = villageVocation(state);
      let e = v.fetes.find((x) => x.jour === jour && x.sorte === f.sorte);
      if (!e) { e = { jour, sorte: f.sorte, plats: {}, tenue: false }; v.fetes.push(e); v.fetes.sort((a, b) => a.jour - b.jour); }
      if (!e.tenue) {
        e.tenue = true;
        e.venus = venus;
        v.tenues += 1;
        out = { sorte: f.sorte, nom: f.nom, icone: f.icone, venus, plats: { ...(e.plats || {}) } };
      }
    }
  }
  const v = lire(state);
  if (v && Array.isArray(v.fetes)) v.fetes = v.fetes.filter((x) => !(x.tenue || x.jour < jour) || jour - x.jour <= GARDE);
  return out;
}

// Combien de fêtes ont eu lieu en tout.
export function fetesTenues(state) {
  const v = lire(state);
  return v && Number.isInteger(v.tenues) ? v.tenues : 0;
}

// Ce qui change quand les fêtes changent (la journée du village est gardée tant qu'elle est la même).
export function signatureFetes(state, jour = jourDe(state)) {
  const f = feteDuJourVillage(state, jour);
  return f ? `${f.sorte}@${f.jour}` : '';
}

// Pour la scène (le soir, les lampions) : la fête du jour { nom, icone, debut, fin, lumieres (LUMIERES) }, ou null.
export function fetePourLaCarte(state) {
  const f = feteDuJourVillage(state);
  return f ? { nom: f.nom, icone: f.icone, sorte: f.sorte, debut: f.debut, fin: f.fin, lumieres: { ...(FE().LUMIERES || {}) } } : null;
}

// Les fêtes d'une sauvegarde (la migration v92 → v93) : ce qui est lisible.
export function reparerFetes(v) {
  const o = objet(v) ? v : {};
  const fetes = (Array.isArray(o.fetes) ? o.fetes : []).filter((f) => objet(f) && Number.isInteger(f.jour) && f.jour >= 1 && SORTES_FETES.includes(f.sorte)).map((f) => {
    const plats = {};
    for (const [it, q] of Object.entries(objet(f.plats) ? f.plats : {})) if (DATA.OBJETS[it] && Number.isInteger(q) && q > 0) plats[it] = q;
    return { jour: f.jour, sorte: f.sorte, plats, tenue: !!f.tenue, ...(Number.isInteger(f.venus) ? { venus: f.venus } : {}), ...(typeof f.commerce === 'string' ? { commerce: f.commerce } : {}), ...(typeof f.nom === 'string' ? { nom: f.nom } : {}) };
  });
  // (deux fêtes un même jour : la première)
  const vus = new Set();
  return { fetes: fetes.filter((f) => (vus.has(f.jour) ? false : vus.add(f.jour))).sort((a, b) => a.jour - b.jour), tenues: Number.isInteger(o.tenues) && o.tenues >= 0 ? o.tenues : 0, ...(Number.isInteger(o.annonce) ? { annonce: o.annonce } : {}) };
}
