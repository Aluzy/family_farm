// Rapport quotidien Ferme Familiale : calcul pur (aucun accès réseau ni R2),
// pour pouvoir le tester avec `node tests/test-report.mjs`.
//
// Entrée : les fichiers JSON de session écrits par le Worker (voir js/telemetry.js)
// et les fiches des joueurs (mergePlayer : la progression d'un joueur, d'une visite à
// l'autre). Sortie : un objet « rapport », puis son rendu en Markdown (une issue GitHub).
//
// Depuis la version 2 des sessions, chaque session porte, par jour de jeu (jours) : le
// temps réel passé, les gestes du personnage par type (actions ; auto : ceux des
// automatisations), l'énergie dépensée par type de geste, les ressources ramassées, les
// objets fabriqués et les blocs posés ; et, à chaque nuit, le niveau, l'XP, la famille, le
// repas et l'étape du didacticiel ; à chaque niveau gagné, le temps de jeu cumulé.

const TZ = 'Europe/Paris';
const DAY_MS = 24 * 3600 * 1000;
const SHORT_SESSION_MS = 30 * 1000;
const TOP_N = 10;
const MAX_COMMENTS_SHOWN = 30;
const MAX_PLAYERS_SHOWN = 15;  // tableau de progression
const MAX_CURVES = 8;          // courbes du graphique
const CURVE_STEPS = 12;
const PID_RE = /^[A-Za-z0-9-]{8,64}$/;
const MAX_PLAYER_SESSIONS = 300;
const MAX_PLAYER_POINTS = 600;

// Les gestes du personnage (PERSONNAGE.COUTS et NIVEAUX.XP du jeu) : leur libellé. Un geste
// absent d'ici apparaît sous son nom brut.
export const GESTES = {
  couper: 'Couper (hache)', piocher: 'Piocher', ramasser: 'Ramasser', faucher: 'Faucher',
  fabriquer: 'Fabriquer à l\'Atelier', labourer: 'Labourer', planter: 'Planter', arroser: 'Arroser',
  recolter: 'Récolter', cueillir: 'Cueillir', pecher: 'Pêcher', tondre: 'Tondre', cuisiner: 'Cuisiner',
  cuireFour: 'Cuire au four', moudre: 'Moudre', presser: 'Presser', vendre: 'Vendre',
  oeuf: 'Ramasser les œufs', lait: 'Traire',
};

// Actions de jeu regroupées par libellé. Les clés sont les valeurs de
// data-action, c'est-à-dire les noms du registre des actions de js/app.js.
// Une action absente de ces tableaux apparaît dans le classement sous son nom
// brut : rien n'est perdu en silence. `node scripts/check-actions.mjs` compare
// ces tableaux au registre : une action ajoutée au jeu sans être classée ici,
// ou classée ici après avoir disparu du jeu, fait échouer la vérification.
export const GAME_ACTIONS = {
  'plant': 'Planter',
  'water': 'Arroser',
  'water-all': 'Arroser',
  'harvest': 'Récolter',
  'harvest-all': 'Récolter',
  'feed-hen': 'Nourrir les poules',
  'feed-all': 'Nourrir les poules',
  'shear': 'Tondre les moutons',
  'cow-herbs': 'Nourrir les vaches aux herbes de montagne',
  'start-recipe': 'Cuisiner (préparer une recette)',
  'sell-item': 'Vendre',
  'buy-item': 'Acheter à la calèche (une semence, un produit des hameaux)',
  'caleche-heler': 'Héler la calèche',
  'promesse-confier': 'Confier au cocher de quoi tenir une promesse de Maurice (le récit)',
  'carte-monde-but': 'Choisir le but de la boussole (carte du monde)',
  'carte-monde-ferme': 'Ramener la boussole à la ferme',
  'plant-all': 'Planter partout',
  'hoe-many': 'Labourer en glissant',
  'ile-commander': 'Commander à un atelier de hameau (la scierie, le tissage, la couture : le récit)',
  'ile-meuble': 'Acheter un meuble dans un hameau (l\'ébéniste, les tapis)',
  'toit-reparer': 'Réparer le toit abîmé d\'une maison de hameau (le récit)',
  'enveloppe-ouvrir': 'Ouvrir l\'enveloppe de Maurice et garder ses pièces (le récit)',
  'pierre-poser': 'Poser la pierre de lune sur la ferme (le récit)',
  'harvest-tree': 'Cueillir un arbre',
  'buy-pasture': 'Acheter une place à l\'Étable',
  'mill-start': 'Moudre du blé au Moulin',
  'mill-cancel': 'Moudre du blé au Moulin',
  'member-save': 'Personnaliser un membre de la famille',
  'member-add': 'Ajouter un membre à la famille',
  'main-character': 'Choisir le personnage principal',
  'setup-start': 'Commencer la partie (famille configurée)',
  'member-remove': 'Retirer un membre de la famille',
  'pet-add': 'Adopter un animal de compagnie',
  'pet-save': 'Personnaliser un animal de compagnie',
  'pet-remove': 'Retirer un animal de compagnie',
  'buy-tech': 'Acquérir une technologie',
  'sleep': 'Dormir',
  'build-fridge': 'Construire un bâtiment',
  'build-station': 'Construire un bâtiment',
  'upgrade': 'Améliorer ou agrandir',
  'upgrade-serre': 'Améliorer ou agrandir',
  'upgrade-poulailler': 'Améliorer ou agrandir',
  'hoe': 'Labourer ou reboucher à la houe',
  'hoe-toggle': 'Prendre ou ranger la houe',
  'hoe-take': 'Prendre la houe (objectif du chapitre)',
  'atelier-fabriquer': 'Fabriquer à l\'Atelier (ferme générée)',
  'bloc': 'Poser ou reprendre un bloc (ferme générée)',
  'bloc-many': 'Poser une ligne de blocs en glissant',
  'bloc-fabriquer': 'Fabriquer et poser les blocs qui manquent à un tracé',
  'arbre-oui': 'Planter un arbre (graine ou jeune arbre, depuis l\'Inventaire)',
  'build-toggle': 'Construire : ouvrir ou ranger (ferme générée)',
  'build-pick': 'Construire : choisir un bloc (ferme générée)',
  'build-tab': 'Construire : ouvrir un onglet (une catégorie de blocs)',
  'build-groupe': 'Construire : la case des murs, des portes ou des sols (ouvrir leur bulle)',
  'meuble-place': 'Construire : glisser l\'aperçu d\'un meuble (ferme générée)',
  'meuble-ok': 'Construire : poser le meuble là où est son aperçu (ferme générée)',
  'meuble-annule': 'Construire : sortir de la pose d\'un meuble (ferme générée)',
  'build-level-menu': 'Construire : ouvrir la liste des niveaux (ferme générée)',
  'build-piece': 'Construire : allumer ou éteindre l\'outil pièce (ferme générée)',
  'build-gomme': 'Construire : allumer ou éteindre la gomme (ferme générée)',
  'build-annuler': 'Construire : annuler la dernière opération (ferme générée)',
  'build-level': 'Construire : choisir le niveau (ferme générée)',
  'etage-toggle': 'Monter ou descendre l\'escalier (ferme générée, essai)',
  'tool-use': 'Prendre ou ranger un outil (barre d\'outils)',
  'cheval-toggle': 'Monter à cheval ou en descendre (barre d\'outils)',
  'axe-toggle': 'Ranger la hache',
  'pick-toggle': 'Ranger la pioche',
  'rod-toggle': 'Ranger la canne à pêche',
  'scythe-toggle': 'Ranger la faux',
  'upgrade-tank': 'Améliorer ou agrandir',
  'robot-autonomie': 'Améliorer ou agrandir',
  'upgrade-fridge': 'Améliorer ou agrandir',
  'maintain': 'Entretenir un appareil',
  'repair': 'Réparer un appareil',
  'eat': 'Manger un en-cas',
  'fridge-in': 'Utiliser le réfrigérateur',
  'boite-deposer': 'Remplir la boîte à nourriture',
  'boite-reprendre': 'Remplir la boîte à nourriture',
  'fridge-in-all': 'Utiliser le réfrigérateur',
  'fridge-out': 'Utiliser le réfrigérateur',
  'toggle': 'Allumer ou éteindre un appareil',
  'semis-set': 'Régler les semis automatiques',
  // fiche 11 : l'équipement de la famille, le sac à provisions
  'fiche-case': 'Équiper la famille',
  'fiche-equiper': 'Équiper la famille',
  'fiche-tente': 'Porter ou ranger la tente (le bivouac, le récit)',
  'sac-poser': 'Remplir le sac à provisions',
  'sac-retirer': 'Remplir le sac à provisions',
  'sac-remplir': 'Remplir le sac à provisions',
  'sac-reprendre': 'Remplir le sac à provisions',
  'sac-manger': 'Manger un en-cas',
  // fiche 17 : la cruche remplie au puits, choisir son lit
  'cruche-remplir': 'Aller remplir la cruche au puits (barre d\'outils)',
  'lit-oui': 'Choisir son lit',
};

// Clics d'interface : navigation, fenêtres, réglages de quantité. Comptés à
// part, jamais dans le classement des actions.
export const INTERFACE_ACTIONS = new Set([
  'close-modal', 'close-screen', 'switch-tab', 'open-screen', 'open-options', 'open-about', 'open-levels', 'levels-all', 'open-compta',
  'open-feedback', 'send-feedback', 'help', 'tuto-next', 'plant-open', 'semis-open',
  'cancel-queued', 'ack-chapter',
  'scene-suite', 'scene-fermer', 'carnet-open', // le récit : la réplique suivante d'une scène, la fermer ; ouvrir le carnet
  'ask-new-game', 'cancel-new-game', 'copy-export',
  'accueil-suite', 'accueil-oui', 'accueil-non', 'accueil-perso', 'accueil-espece', 'didacticiel-suivant', 'didacticiel-passer', 'didacticiel-passer-etape', 'didacticiel-deplier',
  'do-export', 'do-import', 'tuto-skip', 'do-new-game',
  'stage-open', 'stage-close', 'maison-tab', 'four-tab', 'atelier-tab', 'atelier-groupe', 'atelier-choisir', 'silo-agrandir', // carte de la ferme : fenêtres et onglets de la maison
  // versions 1.1 et 1.1.1 : déplacements sur la carte, raccourcis des notifications,
  // réglages de quantité (Moulin, achats), fiche d'un membre de la famille
  'stage-goto', 'stage-pan', 'stage-pan-down', 'market-locked', 'plant-all-open', 'aller', 'comptoir-tab', 'inv-tab',
  'member-edit', 'member-perso', 'fiche-onglet', 'fiche-sac', // fiche 11 : l'onglet d'un membre, ouvrir le sac
  'family-edit', 'family-help', 'pets-edit', 'menu-toggle', 'book-open', 'book-next', 'book-prev', 'book-goto', // essai : le Livre de recette en livre
  'encyclo-open', 'encyclo-page',
  'carte-monde-open', 'carte-monde-zoom', 'carte-monde-centre', 'carte-monde-lieu', // fiche 8 : la carte du monde (l'ouvrir, la régler, choisir un lieu)
  'arbre-planter', 'arbre-annuler', 'arbre-case', // planter un arbre depuis l'Inventaire : choisir la case // l'Encyclopédie, un livre qui se remplit au fil de la partie
  'inv-item', // Inventaire : fiche d'un objet
  'shop-item', 'market-help', // la calèche : fiche d'un article, aide de l'onglet // Famille : mode modification, aide de la ration quotidienne
  'pet-edit', 'pet-espece', // version 1.2 : fiche d'un animal de compagnie
  'mail-open', // version 1.3 : ouvrir une lettre du courrier
  'toolbar-toggle', // la barre d'outils de la carte : la ranger, la sortir
  'lit-choisir', // fiche 17 : un lit touché sur la carte, la question « Tu veux choisir ce lit ? »
]);

// Signaux utiles à la décision, affichés à part.
const SIGNALS = [
  ['tuto-skip', 'Tutoriel ignoré'],
  ['do-new-game', 'Parties recommencées à zéro'],
  ['do-export', 'Sauvegardes exportées'],
  ['do-import', 'Sauvegardes importées'],
  ['help', 'Boutons d\'aide ouverts'],
];

/* ---------- utilitaires ---------- */

const numOr0 = (v) => (typeof v === 'number' && Number.isFinite(v) && v > 0 ? v : 0);

function median(values) {
  if (!values.length) return 0;
  const a = [...values].sort((x, y) => x - y);
  const mid = Math.floor(a.length / 2);
  return a.length % 2 ? a[mid] : (a[mid - 1] + a[mid]) / 2;
}

const num = (v) => (typeof v === 'number' && Number.isFinite(v) ? v : null);
const round1 = (v) => Math.round(v * 10) / 10;
const fmtNum = (v) => new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 1 }).format(round1(v));
// Les postes de pièces (compta.js du jeu, posteCompta) : leur libellé.
export const POSTES = {
  achat: 'Achats au Marché', vente: 'Ventes au Marché', ventes: 'Ventes du commerce', vente_en_ville: 'Ventes en ville',
  technologie: 'Technologies', reparation: 'Réparations', reparation_de_la_maison: 'Réparation de la maison',
  entretien: 'Entretien des appareils', meuble: 'Meubles', commerce: 'Commerce', lettre: 'Lettres',
  sortie: 'Sorties', bus_pour_le_marche_de_la_ville: 'Bus pour la ville', bureau_de_negoce: 'Bureau de négoce',
  robot: 'Robot', emplacement_du_verger: 'Emplacements du Verger',
};
const RETENTION_JOURS = 14;     // cohortes affichées (un jour de première visite par ligne)
const ABANDON_JOURS = 3;        // sans visite depuis tant de jours : le joueur a arrêté
const ABANDON_FENETRE = 60;     // joueurs arrivés depuis tant de jours au plus
const PIECES_JOURS = 20;        // jours de jeu du tableau des pièces

// La date (AAAA-MM-JJ) à Paris d'un instant, ou null.
export function parisDate(t) {
  const d = new Date(t);
  if (!Number.isFinite(d.getTime())) return null;
  return new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
}

// Jours entre deux dates AAAA-MM-JJ (b - a).
function dateDiff(a, b) {
  return Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / DAY_MS);
}

// Une clé venue du navigateur (action, objet) : lettres, chiffres, _ : - . seulement.
const cleanKey = (k) => String(k).replace(/[^A-Za-z0-9_:.-]/g, '_').slice(0, 60);

function addInto(target, map, mult = 1) {
  if (!map || typeof map !== 'object') return;
  for (const [k, raw] of Object.entries(map)) {
    const n = numOr0(raw);
    if (n) target[cleanKey(k)] = (target[cleanKey(k)] || 0) + n * mult;
  }
}

const sumValues = (map) => Object.values(map).reduce((a, b) => a + b, 0);
const shortId = (id) => String(id).replace(/[^A-Za-z0-9]/g, '').slice(0, 6);

export function fmtDuration(ms) {
  const s = Math.round(numOr0(ms) / 1000);
  if (s < 60) return `${s} s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} min ${String(s % 60).padStart(2, '0')} s`;
  const h = Math.floor(m / 60);
  return `${h} h ${String(m % 60).padStart(2, '0')} min`;
}

function fmtDateTime(date) {
  return new Intl.DateTimeFormat('fr-FR', {
    timeZone: TZ, day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
  }).format(date).replace(',', '');
}

function fmtLongDate(date) {
  return new Intl.DateTimeFormat('fr-FR', {
    timeZone: TZ, weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  }).format(date);
}

// Heure (0 à 23) à Paris : sert à ne publier le rapport qu'à 13 h, été comme hiver.
export function parisHour(date) {
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone: TZ, hour: '2-digit', hourCycle: 'h23' }).formatToParts(date);
  return Number(parts.find((p) => p.type === 'hour').value);
}

/* ---------- chapitres ---------- */

// Découpe la visite en tranches par chapitre. Le jeu note le chapitre à chaque
// nuit (événement « night », après la nuit) : la tranche qui précède une nuit
// appartient donc au chapitre annoncé par la nuit précédente. Seule la durée
// « onglet visible » est connue en total ; on la répartit au prorata du temps
// écoulé dans chaque tranche (approximation, précise si la visite est continue).
// Retourne null quand aucune nuit n'a été jouée : chapitre inconnu.
export function chapterSegments(session) {
  const dur = numOr0(session.durationMs);
  const vis = Math.min(numOr0(session.visibleMs), dur || numOr0(session.visibleMs));
  const events = Array.isArray(session.events) ? session.events : [];
  const nights = events
    .filter((e) => e && e.type === 'night' && Number.isFinite(e.chapter) && Number.isFinite(e.t))
    .sort((a, b) => a.t - b.t);
  if (!nights.length || dur <= 0 || vis <= 0) return null;

  let current = nights[0].chapter;
  // Si la toute première nuit fait passer de chapitre, la visite a commencé au chapitre précédent.
  const jump = events.find((e) => e && e.type === 'chapter' && e.chapter === nights[0].chapter
    && Number.isFinite(e.t) && e.t >= nights[0].t && e.t - nights[0].t <= 2000);
  if (jump && current > 1) current -= 1;

  const scale = vis / dur;
  const byChapter = new Map();
  const add = (chapter, wallMs) => {
    if (wallMs > 0) byChapter.set(chapter, (byChapter.get(chapter) || 0) + wallMs * scale);
  };
  let prevT = 0;
  for (const n of nights) {
    const t = Math.min(Math.max(n.t, prevT), dur);
    add(current, t - prevT);
    prevT = t;
    current = n.chapter;
  }
  add(current, dur - prevT);
  return byChapter;
}

// Chapitre en cours à l'instant t (ms depuis le début de la visite), ou null.
function chapterAt(session, t) {
  const events = Array.isArray(session.events) ? session.events : [];
  let chapter = null;
  for (const e of events) {
    if (e && e.type === 'night' && Number.isFinite(e.chapter) && Number.isFinite(e.t) && e.t <= t) chapter = e.chapter;
  }
  return chapter;
}

/* ---------- la fiche d'un joueur ---------- */

// Fusionne la session `s` (version 2) dans la fiche `prev` de son joueur (null : nouvelle
// fiche). Les points de progression sont indexés (n<jour> : une nuit, l<niveau> : un niveau
// atteint) : renvoyer la même session ne change rien. Retourne null sans joueur valide.
export function mergePlayer(prev, s, receivedAt) {
  const p = s && s.player;
  if (!p || !PID_RE.test(String(p.id || ''))) return null;
  const at = String(receivedAt || '');
  const fiche = prev && prev.id === p.id && typeof prev === 'object'
    ? { ...prev, points: { ...(prev.points || {}) }, sessions: { ...(prev.sessions || {}) } }
    : { id: p.id, since: String(p.since || '').slice(0, 30), first: at, points: {}, sessions: {} };
  fiche.last = at;
  fiche.game = String(s.game || '').slice(0, 20);
  // les jours (à Paris) où il a joué : la rétention
  const dates = new Set(Array.isArray(fiche.dates) ? fiche.dates : []);
  for (const t of [s.startedAt, at]) { const d = parisDate(t); if (d) dates.add(d); }
  fiche.dates = [...dates].sort().slice(-400);
  fiche.playMs = Math.max(numOr0(fiche.playMs), numOr0(p.playMs));
  if (PID_RE.test(String(s.sid || ''))) fiche.sessions[s.sid] = { startedAt: String(s.startedAt || '').slice(0, 30), visibleMs: numOr0(s.visibleMs) };
  const sids = Object.keys(fiche.sessions);
  if (sids.length > MAX_PLAYER_SESSIONS) {
    sids.sort((a, b) => String(fiche.sessions[a].startedAt).localeCompare(String(fiche.sessions[b].startedAt)));
    for (const k of sids.slice(0, sids.length - MAX_PLAYER_SESSIONS)) delete fiche.sessions[k];
  }
  for (const e of Array.isArray(s.events) ? s.events : []) {
    if (!e || typeof e !== 'object') continue;
    if (e.type === 'night' && num(e.day) !== null) {
      fiche.points[`n${Math.floor(e.day)}`] = {
        day: Math.floor(e.day), level: num(e.level), xp: num(e.xp), chapter: num(e.chapter), playMs: num(e.playMs),
        adults: num(e.adults), children: num(e.children), meal: num(e.meal),
        wild: typeof e.wild === 'boolean' ? e.wild : null, tuto: e.tuto ? cleanKey(e.tuto) : null, pieces: num(e.pieces),
      };
    } else if (e.type === 'level' && num(e.level) !== null) {
      const k = `l${Math.floor(e.level)}`, old = fiche.points[k];
      const pt = { level: Math.floor(e.level), day: num(e.day), playMs: num(e.playMs) };
      if (!old || (pt.playMs !== null && (old.playMs === null || pt.playMs < old.playMs))) fiche.points[k] = pt;
    }
  }
  const keys = Object.keys(fiche.points);
  if (keys.length > MAX_PLAYER_POINTS) {
    const nuits = keys.filter((k) => k[0] === 'n').sort((a, b) => fiche.points[a].day - fiche.points[b].day);
    for (const k of nuits.slice(0, keys.length - MAX_PLAYER_POINTS)) delete fiche.points[k];
  }
  return fiche;
}

// Le résumé d'une fiche, gardé dans les métadonnées de son fichier R2 : le rapport lit ainsi
// la rétention et les abandons de tous les joueurs sans relire chaque fiche (des chaînes,
// 2 Ko au plus). first, last : premier et dernier jour joué (AAAA-MM-JJ) ; d1 : revenu le
// lendemain ; d7 : revenu 7 jours après ou plus ; jours : jours distincts joués.
export function playerMeta(f) {
  const dates = Array.isArray(f.dates) && f.dates.length ? f.dates : [parisDate(f.first) || ''];
  const first = dates[0], last = dates[dates.length - 1];
  const p = playerSummary(f);
  return {
    first, last, jours: String(dates.length),
    d1: dates.includes(first && parisDate(Date.parse(`${first}T12:00:00Z`) + DAY_MS)) ? '1' : '0',
    d7: dates.some((d) => first && dateDiff(first, d) >= 7) ? '1' : '0',
    niveau: String(p.niveau), chapitre: p.chapitre === null ? '' : String(p.chapitre),
    jeu: p.jour === null ? '' : String(p.jour), tuto: p.tuto || '', playMs: String(Math.round(p.playMs)),
    sessions: String(p.sessions),
  };
}

// Ce qu'une fiche dit du joueur : sa dernière nuit, son niveau, ses jours de jeu.
function playerSummary(f) {
  const pts = Object.values(f.points || {});
  const nuits = pts.filter((x) => x && Number.isFinite(x.day) && 'xp' in x).sort((a, b) => a.day - b.day);
  const derniere = nuits[nuits.length - 1] || null;
  const niveau = Math.max(1, ...pts.map((x) => numOr0(x && x.level)));
  return {
    id: f.id, since: f.since || f.first, playMs: numOr0(f.playMs), sessions: Object.keys(f.sessions || {}).length,
    niveau, jour: derniere ? derniere.day : null, chapitre: derniere ? derniere.chapter : null,
    membres: derniere && derniere.adults !== null ? numOr0(derniere.adults) + numOr0(derniere.children) : null,
    tuto: derniere ? derniere.tuto : null,
  };
}

// La courbe d'un joueur : [{ ms, level }] (temps de jeu cumulé → niveau), du début à la fin.
function playerCurve(f) {
  const pts = Object.values(f.points || {}).filter((x) => x && Number.isFinite(x.playMs) && Number.isFinite(x.level));
  pts.sort((a, b) => a.playMs - b.playMs);
  const out = [{ ms: 0, level: 1 }];
  for (const x of pts) if (x.level >= out[out.length - 1].level) out.push({ ms: x.playMs, level: x.level });
  return out;
}

function levelAt(curve, ms) {
  let lv = 1;
  for (const p of curve) if (p.ms <= ms) lv = Math.max(lv, p.level);
  return lv;
}

/* ---------- les jours de jeu ---------- */

// Les jours de jeu des sessions, réunis par joueur (ou par session, avant la version 2) :
// [{ ms, actions, auto, energie, ramasse, fabrique, pose, gagne, depense }].
function gameDays(sessions) {
  const days = new Map();
  for (const s of sessions) {
    if (!s.jours || typeof s.jours !== 'object') continue;
    const who = s.player && PID_RE.test(String(s.player.id || '')) ? s.player.id : s.sid;
    for (const [d, j] of Object.entries(s.jours)) {
      if (!j || typeof j !== 'object' || !/^\d+$/.test(d)) continue;
      const k = `${who}:${d}`;
      const t = days.get(k) || { ms: 0, actions: {}, auto: {}, energie: {}, ramasse: {}, fabrique: {}, pose: {}, gagne: {}, depense: {} };
      t.ms += numOr0(j.ms);
      for (const f of ['actions', 'auto', 'energie', 'ramasse', 'fabrique', 'pose', 'gagne', 'depense']) addInto(t[f], j[f]);
      days.set(k, t);
    }
  }
  return [...days.values()].filter((d) => d.ms > 0 || sumValues(d.actions) > 0);
}

// Par clé : total et moyenne par jour de jeu, triés du plus fréquent au plus rare.
function perDay(days, field) {
  const total = {};
  for (const d of days) addInto(total, d[field]);
  return Object.entries(total)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([key, n]) => ({ key, total: n, parJour: days.length ? n / days.length : 0 }));
}

/* ---------- rapport ---------- */

// sessions : tableau d'objets JSON de session. now : fin de la période.
// meta : { unreadable, truncated } pour signaler une lecture incomplète.
// annuaire : les métadonnées (playerMeta) de toutes les fiches, pour la rétention et les abandons.
export function buildReport(sessions, now, meta = {}, players = [], annuaire = []) {
  const end = now.getTime();
  const start = end - DAY_MS;
  const valid = sessions.filter((s) => s && typeof s === 'object');

  const inWindow = valid.filter((s) => {
    const t = Date.parse(s.startedAt);
    return Number.isFinite(t) && t >= start && t < end;
  });

  const active = inWindow.map((s) => numOr0(s.visibleMs));
  const total = active.reduce((a, b) => a + b, 0);

  const chapters = new Map(); // chapitre -> { ms, sessions }
  let unknownChapter = 0;
  for (const s of inWindow) {
    const seg = chapterSegments(s);
    if (!seg) { unknownChapter++; continue; }
    for (const [chapter, ms] of seg) {
      const c = chapters.get(chapter) || { ms: 0, sessions: 0 };
      c.ms += ms;
      c.sessions += 1;
      chapters.set(chapter, c);
    }
  }
  const chapterRows = [...chapters.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([chapter, c]) => ({ chapter, sessions: c.sessions, totalMs: c.ms, avgMs: c.ms / c.sessions }));

  const grouped = new Map();
  const signalCounts = new Map();
  let interfaceClicks = 0;
  for (const s of inWindow) {
    const clicks = (s.counters && s.counters.clicks) || {};
    for (const [action, raw] of Object.entries(clicks)) {
      const n = numOr0(raw);
      if (!n) continue;
      if (INTERFACE_ACTIONS.has(action)) {
        interfaceClicks += n;
        signalCounts.set(action, (signalCounts.get(action) || 0) + n);
        continue;
      }
      const label = GAME_ACTIONS[action] || `${action} (non répertorié)`;
      grouped.set(label, (grouped.get(label) || 0) + n);
    }
  }
  const topActions = [...grouped.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'fr'))
    .slice(0, TOP_N)
    .map(([label, count]) => ({ label, count }));
  const signals = SIGNALS
    .map(([action, label]) => ({ label, count: signalCounts.get(action) || 0 }))
    .filter((x) => x.count > 0);

  // Commentaires : datés à l'instant où ils ont été écrits (début de visite + t).
  const comments = [];
  for (const s of valid) {
    const startedAt = Date.parse(s.startedAt);
    if (!Number.isFinite(startedAt) || !Array.isArray(s.feedback)) continue;
    for (const f of s.feedback) {
      if (!f || typeof f.text !== 'string' || !f.text.trim()) continue;
      const at = startedAt + numOr0(f.t);
      if (at < start || at >= end) continue;
      comments.push({
        at,
        text: f.text.trim(),
        chapter: chapterAt(s, numOr0(f.t)),
        device: s.device && s.device.cls ? String(s.device.cls) : '',
        game: s.game ? String(s.game) : '',
      });
    }
  }
  comments.sort((a, b) => a.at - b.at);

  /* -- version 2 : les joueurs, les jours de jeu, les gestes du personnage -- */
  const pids = new Set(inWindow.map((s) => s.player && s.player.id).filter((id) => PID_RE.test(String(id || ''))));
  const fiches = players.filter((f) => f && PID_RE.test(String(f.id || '')));
  const resumes = fiches.map(playerSummary).sort((a, b) => b.playMs - a.playMs);
  const nouveaux = fiches.filter((f) => { const t = Date.parse(f.first); return Number.isFinite(t) && t >= start && t < end; }).length;
  const familles = new Map();
  for (const p of resumes) if (p.membres) familles.set(p.membres, (familles.get(p.membres) || 0) + 1);

  const days = gameDays(inWindow);
  const actions = perDay(days, 'actions');
  const energie = Object.fromEntries(perDay(days, 'energie').map((x) => [x.key, x.total]));
  const gestes = actions.map((a) => ({
    action: a.key, label: GESTES[a.key] || a.key, count: a.total, parJour: a.parJour,
    energie: energie[a.key] || 0, parGeste: a.total ? (energie[a.key] || 0) / a.total : 0,
  }));
  for (const [k, e] of Object.entries(energie)) if (!gestes.some((g) => g.action === k)) gestes.push({ action: k, label: GESTES[k] || k, count: 0, parJour: 0, energie: e, parGeste: 0 });
  const dayMs = days.map((d) => d.ms);
  const jours = {
    count: days.length,
    avgMs: days.length ? dayMs.reduce((a, b) => a + b, 0) / days.length : 0,
    medianMs: median(dayMs),
    actions: days.length ? days.reduce((t, d) => t + sumValues(d.actions), 0) / days.length : 0,
    energie: days.length ? days.reduce((t, d) => t + sumValues(d.energie), 0) / days.length : 0,
    ramasse: perDay(days, 'ramasse'),
    fabrique: perDay(days, 'fabrique'),
    pose: perDay(days, 'pose'),
    auto: perDay(days, 'auto'),
  };

  // Les niveaux : le temps de jeu et le jour où chaque joueur l'a atteint (toutes ses parties).
  const parNiveau = new Map();
  for (const f of fiches) {
    const lv = Object.values(f.points || {}).filter((x) => x && !('xp' in x) && Number.isFinite(x.level));
    const byLevel = new Map(lv.map((x) => [x.level, x]));
    for (const x of lv) {
      const row = parNiveau.get(x.level) || { ms: [], jours: [], depuis: [] };
      if (Number.isFinite(x.playMs)) row.ms.push(x.playMs);
      if (Number.isFinite(x.day)) row.jours.push(x.day);
      const prev = byLevel.get(x.level - 1);
      const prevMs = x.level === 2 ? 0 : prev && Number.isFinite(prev.playMs) ? prev.playMs : null;
      if (prevMs !== null && Number.isFinite(x.playMs)) row.depuis.push(Math.max(0, x.playMs - prevMs));
      parNiveau.set(x.level, row);
    }
  }
  const niveaux = [...parNiveau.entries()].sort((a, b) => a[0] - b[0]).map(([level, r]) => ({
    level, joueurs: Math.max(r.ms.length, r.jours.length), medianMs: median(r.ms), medianJour: median(r.jours), medianDepuisMs: median(r.depuis), depuisN: r.depuis.length,
  }));

  // Courbes : les joueurs qui ont joué le plus longtemps (temps de jeu → niveau).
  const courbes = fiches.slice().sort((a, b) => numOr0(b.playMs) - numOr0(a.playMs)).slice(0, MAX_CURVES).map((f) => ({ id: shortId(f.id), curve: playerCurve(f) }));

  // Le repas du soir (part couverte) et le didacticiel, d'après les nuits de la période.
  const repas = [];
  const tutos = new Map();
  for (const s of inWindow) {
    let lastTuto;
    for (const e of Array.isArray(s.events) ? s.events : []) {
      if (!e || e.type !== 'night') continue;
      if (num(e.meal) !== null) repas.push(Math.max(0, Math.min(100, e.meal)));
      if ('tuto' in e) lastTuto = e.tuto ? cleanKey(e.tuto) : 'fini';
    }
    if (lastTuto) tutos.set(lastTuto, (tutos.get(lastTuto) || 0) + 1);
  }

  // Les erreurs techniques, regroupées par message.
  const erreurs = new Map();
  let erreursTotal = 0;
  for (const s of inWindow) {
    erreursTotal += numOr0(s.counters && s.counters.errors);
    for (const e of Array.isArray(s.events) ? s.events : []) {
      if (e && e.type === 'error') {
        const k = `${String(e.message || '').slice(0, 120)} (${String(e.file || '?').slice(0, 40)}:${numOr0(e.line)})`;
        erreurs.set(k, (erreurs.get(k) || 0) + 1);
      }
    }
  }

  /* -- la rétention : les joueurs qui reviennent, par jour de première visite -- */
  const today = parisDate(end - 1);
  const annu = annuaire.filter((m) => m && /^\d{4}-\d{2}-\d{2}$/.test(String(m.first || '')) && /^\d{4}-\d{2}-\d{2}$/.test(String(m.last || '')));
  const cohortes = new Map();
  for (const m of annu) {
    const age = dateDiff(m.first, today);
    if (age < 0 || age >= RETENTION_JOURS + 7) continue;
    const c = cohortes.get(m.first) || { date: m.first, age, n: 0, d1: 0, d7: 0, revenus: 0 };
    c.n += 1;
    if (m.d1 === '1') c.d1 += 1;
    if (m.d7 === '1') c.d7 += 1;
    if (Number(m.jours) > 1) c.revenus += 1;
    cohortes.set(m.first, c);
  }
  const taux = (rows, key, minAge) => {
    const ok = rows.filter((c) => c.age >= minAge);
    const n = ok.reduce((t, c) => t + c.n, 0);
    return { n, pct: n ? (100 * ok.reduce((t, c) => t + c[key], 0)) / n : 0 };
  };
  const cRows = [...cohortes.values()].sort((a, b) => b.date.localeCompare(a.date));
  const retention = {
    cohortes: cRows.filter((c) => c.age < RETENTION_JOURS),
    j1: taux(cRows, 'd1', 1), j7: taux(cRows, 'd7', 7), revenus: taux(cRows, 'revenus', 1),
  };

  /* -- l'abandon : les joueurs arrivés récemment qui ne sont plus revenus -- */
  const partis = annu.filter((m) => dateDiff(m.first, today) <= ABANDON_FENETRE && dateDiff(m.last, today) >= ABANDON_JOURS);
  const recents = annu.filter((m) => dateDiff(m.first, today) <= ABANDON_FENETRE && dateDiff(m.first, today) >= ABANDON_JOURS);
  const compte = (rows, f) => {
    const map = new Map();
    for (const m of rows) { const k = f(m); if (k !== null) map.set(k, (map.get(k) || 0) + 1); }
    return [...map.entries()];
  };
  const abandon = {
    partis: partis.length, recents: recents.length,
    uneVisite: partis.filter((m) => Number(m.jours) <= 1).length,
    medianMs: median(partis.map((m) => numOr0(Number(m.playMs)))),
    medianJeu: median(partis.map((m) => numOr0(Number(m.jeu)))),
    niveaux: compte(partis, (m) => Number(m.niveau) || 1).sort((a, b) => a[0] - b[0]),
    tutos: compte(partis, (m) => (m.tuto ? cleanKey(m.tuto) : null)).sort((a, b) => b[1] - a[1]),
    chapitres: compte(partis, (m) => (m.chapitre ? Number(m.chapitre) : null)).sort((a, b) => a[0] - b[0]),
  };

  /* -- l'économie : les pièces gagnées et dépensées par jour de jeu, et le solde du soir -- */
  const gagne = perDay(days, 'gagne'), depense = perDay(days, 'depense');
  const totalG = gagne.reduce((t, x) => t + x.total, 0), totalD = depense.reduce((t, x) => t + x.total, 0);
  const soirs = new Map();
  for (const f of fiches) {
    for (const pt of Object.values(f.points || {})) {
      if (pt && 'xp' in pt && Number.isFinite(pt.day) && Number.isFinite(pt.pieces) && pt.day >= 1 && pt.day <= PIECES_JOURS) {
        const l = soirs.get(pt.day) || [];
        l.push(pt.pieces);
        soirs.set(pt.day, l);
      }
    }
  }
  const economie = {
    gagne, depense,
    gagneJour: days.length ? totalG / days.length : 0,
    depenseJour: days.length ? totalD / days.length : 0,
    soirs: [...soirs.entries()].sort((a, b) => a[0] - b[0]).map(([day, l]) => ({ day, joueurs: l.length, median: median(l), min: Math.min(...l), max: Math.max(...l) })),
  };

  return {
    start: new Date(start),
    end: new Date(end),
    retention,
    abandon,
    economie,
    joueurs: { actifs: pids.size, fiches: resumes.slice(0, MAX_PLAYERS_SHOWN), fichesTotal: resumes.length, nouveaux, familles: [...familles.entries()].sort((a, b) => a[0] - b[0]) },
    gestes,
    jours,
    niveaux,
    courbes,
    repas: { nuits: repas.length, moyenne: repas.length ? repas.reduce((a, b) => a + b, 0) / repas.length : 0, faim: repas.filter((m) => m < 100).length },
    tutos: [...tutos.entries()].sort((a, b) => b[1] - a[1]),
    erreurs: { total: erreursTotal, top: [...erreurs.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5) },
    sessions: inWindow.length,
    avgActiveMs: inWindow.length ? total / inWindow.length : 0,
    medianActiveMs: median(active),
    shortSessions: active.filter((ms) => ms < SHORT_SESSION_MS).length,
    chapters: chapterRows,
    unknownChapter,
    topActions,
    interfaceClicks,
    signals,
    comments,
    unreadable: meta.unreadable || 0,
    truncated: meta.truncated || 0,
  };
}

/* ---------- rendu Markdown (corps d'une issue GitHub) ---------- */

// Les compteurs, la version du jeu et le type d'appareil viennent du navigateur
// du joueur, donc d'une source non fiable : tout texte inséré hors bloc de code
// est neutralisé (mise en forme, liens, @mentions, références #123).
function mdSafe(s) {
  return String(s)
    .replace(/[\\`*_{}[\]()<>#+!|~&]/g, (c) => `\\${c}`)
    .replace(/@/g, '@​')
    .replace(/\s+/g, ' ')
    .trim();
}

// Bloc de code dont la clôture est plus longue que toute suite de ` du texte :
// un commentaire ne peut ni en sortir ni déclencher de mention ou de lien.
function codeBlock(text) {
  const runs = text.match(/`+/g) || [];
  const fence = '`'.repeat(Math.max(3, ...runs.map((r) => r.length + 1)));
  return `${fence}text\n${text}\n${fence}`;
}

function commentMeta(c) {
  return [fmtDateTime(new Date(c.at)), c.chapter ? `chapitre ${c.chapter}` : null, c.device || null, c.game ? `v${c.game}` : null]
    .filter(Boolean).map(mdSafe).join(' · ');
}

function dataNotes(r) {
  const notes = [];
  if (r.unreadable) notes.push(`${r.unreadable} fichier(s) de session illisible(s) : ils sont ignorés dans ce rapport.`);
  if (r.truncated) notes.push(`${r.truncated} fichier(s) de session non lus (limite de lecture par rapport) : les chiffres sont partiels.`);
  return notes;
}

export function reportSubject(r) {
  return `Rapport du ${new Intl.DateTimeFormat('fr-FR', { timeZone: TZ, day: '2-digit', month: '2-digit', year: 'numeric' }).format(r.end)} : ${r.sessions} session${r.sessions > 1 ? 's' : ''}`;
}

// Un tableau « clé | total | par jour de jeu » (ressources, objets, blocs).
function perDayTable(L, rows, titre) {
  if (!rows.length) { L.push('Aucun.'); L.push(''); return; }
  L.push(`| ${titre} | Total | Par jour de jeu |`);
  L.push('| --- | ---: | ---: |');
  for (const x of rows.slice(0, 20)) L.push(`| ${mdSafe(x.key)} | ${fmtNum(x.total)} | ${fmtNum(x.parJour)} |`);
  if (rows.length > 20) L.push(`| … et ${rows.length - 20} autres | | |`);
  L.push('');
}

const pct = (v) => `${fmtNum(v)} %`;
const posteLabel = (k) => POSTES[k] || k;

// La rétention, l'abandon et l'économie.
function renderRetention(L, r) {
  const R = r.retention, A = r.abandon, E = r.economie;
  L.push('## Rétention');
  L.push('');
  if (R.cohortes.length || R.j1.n) {
    L.push(`- **Revenus le lendemain (J+1)** : ${pct(R.j1.pct)} des ${R.j1.n} joueur(s) arrivés depuis au moins un jour`);
    L.push(`- **Revenus après une semaine (J+7 ou plus)** : ${R.j7.n ? `${pct(R.j7.pct)} des ${R.j7.n} joueur(s) arrivés depuis au moins 7 jours` : 'pas encore de joueur arrivé il y a 7 jours ou plus'}`);
    L.push(`- **Revenus au moins une fois** : ${pct(R.revenus.pct)}`);
    L.push('');
    L.push('| Première visite | Nouveaux joueurs | Revenus à J+1 | Revenus à J+7 ou plus |');
    L.push('| --- | ---: | ---: | ---: |');
    for (const c of R.cohortes) {
      const j7 = c.age >= 7 ? `${c.d7} (${pct((100 * c.d7) / c.n)})` : '—';
      const j1 = c.age >= 1 ? `${c.d1} (${pct((100 * c.d1) / c.n)})` : '—';
      L.push(`| ${c.date} | ${c.n} | ${j1} | ${j7} |`);
    }
    L.push('');
    L.push(`<sub>Par jour de première visite (heure de Paris), sur les ${RETENTION_JOURS} derniers jours ; « — » : trop tôt pour le savoir.</sub>`);
  } else {
    L.push('Aucun joueur suivi (le numéro de joueur arrive avec la version 2 du suivi).');
  }
  L.push('');
  L.push('## Abandon');
  L.push('');
  if (A.partis) {
    L.push(`- **Joueurs partis** (arrivés depuis ${ABANDON_FENETRE} jours au plus, sans visite depuis ${ABANDON_JOURS} jours ou plus) : ${A.partis}${A.recents ? ` sur ${A.recents} (${pct((100 * A.partis) / A.recents)})` : ''}, dont ${A.uneVisite} après un seul jour de visite`);
    L.push(`- **Avant de partir** : ${fmtDuration(A.medianMs)} de jeu et ${fmtNum(A.medianJeu)} jour(s) de jeu (médianes)`);
    L.push(`- **Niveau atteint** : ${A.niveaux.map(([n, c]) => `niveau ${n} : ${c}`).join(' · ')}`);
    if (A.chapitres.length) L.push(`- **Chapitre** : ${A.chapitres.map(([n, c]) => `chapitre ${n} : ${c}`).join(' · ')}`);
    if (A.tutos.length) L.push(`- **Partis pendant le didacticiel**, à l'étape : ${A.tutos.map(([t, c]) => `${mdSafe(t)} : ${c}`).join(' · ')}`);
  } else {
    L.push('Aucun abandon repéré.');
  }
  L.push('');
  L.push('## Économie');
  L.push('');
  if (E.gagne.length || E.depense.length) {
    L.push(`- **Par jour de jeu** : ${fmtNum(E.gagneJour)} pièces gagnées, ${fmtNum(E.depenseJour)} dépensées (solde ${E.gagneJour - E.depenseJour >= 0 ? '+' : ''}${fmtNum(E.gagneJour - E.depenseJour)})`);
    L.push('');
    L.push('| Poste | Gagné | Dépensé | Par jour de jeu |');
    L.push('| --- | ---: | ---: | ---: |');
    const postes = new Map();
    for (const x of E.gagne) postes.set(x.key, { g: x.total, d: 0, j: x.parJour });
    for (const x of E.depense) { const p = postes.get(x.key) || { g: 0, d: 0, j: 0 }; p.d += x.total; p.j -= x.parJour; postes.set(x.key, p); }
    for (const [k, p] of [...postes.entries()].sort((a, b) => (b[1].g + b[1].d) - (a[1].g + a[1].d))) {
      L.push(`| ${mdSafe(posteLabel(k))} | ${p.g ? fmtNum(p.g) : '—'} | ${p.d ? fmtNum(p.d) : '—'} | ${p.j >= 0 ? '+' : ''}${fmtNum(p.j)} |`);
    }
  } else {
    L.push('Aucune pièce gagnée ni dépensée enregistrée.');
  }
  L.push('');
  if (E.soirs.length) {
    L.push('| Jour de jeu | Joueurs | Pièces le soir (médiane) | Min | Max |');
    L.push('| ---: | ---: | ---: | ---: | ---: |');
    for (const x of E.soirs) L.push(`| ${x.day} | ${x.joueurs} | ${fmtNum(x.median)} | ${fmtNum(x.min)} | ${fmtNum(x.max)} |`);
    L.push('');
    L.push(`<sub>Les ${PIECES_JOURS} premiers jours de jeu des joueurs actifs pendant la période.</sub>`);
    L.push('');
  }
}

// Les sections de la version 2 : joueurs, jours de jeu, gestes, ressources, niveaux, progression.
function renderGame(L, r) {
  const J = r.joueurs, D = r.jours;
  L.push('## Joueurs');
  L.push('');
  L.push(`- **Joueurs actifs** (sessions de la période) : ${J.actifs}, dont **${J.nouveaux}** nouveau(x)`);
  if (J.familles.length) L.push(`- **Taille de la famille** : ${J.familles.map(([n, c]) => `${n} membre${n > 1 ? 's' : ''} : ${c} joueur${c > 1 ? 's' : ''}`).join(' · ')}`);
  if (r.repas.nuits) L.push(`- **Repas du soir** : ${fmtNum(r.repas.moyenne)} % couvert en moyenne ; ${r.repas.faim} nuit(s) sur ${r.repas.nuits} où la famille n'a pas mangé à sa faim`);
  if (r.tutos.length) L.push(`- **Didacticiel** (étape à la dernière nuit) : ${r.tutos.map(([t, n]) => `${mdSafe(t)} : ${n}`).join(' · ')}`);
  L.push('');
  L.push('## Jours de jeu');
  L.push('');
  if (D.count) {
    L.push(`- **Jours de jeu observés** : ${D.count}`);
    L.push(`- **Temps réel par jour de jeu** : ${fmtDuration(D.avgMs)} en moyenne (médiane ${fmtDuration(D.medianMs)})`);
    L.push(`- **Gestes du personnage par jour de jeu** : ${fmtNum(D.actions)} en moyenne, pour ${fmtNum(D.energie)} d'énergie`);
    L.push('');
    L.push('<sub>Un jour commencé avant ou fini après la période, ou joué sur deux appareils, n\'est vu qu\'en partie.</sub>');
  } else {
    L.push('Aucun jour de jeu détaillé (versions du jeu antérieures au suivi par jour).');
  }
  L.push('');
  L.push('## Gestes du personnage');
  L.push('');
  if (r.gestes.length) {
    L.push('| Geste | Nombre | Par jour de jeu | Énergie dépensée | Énergie par geste |');
    L.push('| --- | ---: | ---: | ---: | ---: |');
    for (const g of r.gestes) L.push(`| ${mdSafe(g.label)} | ${fmtNum(g.count)} | ${fmtNum(g.parJour)} | ${fmtNum(g.energie)} | ${g.count ? fmtNum(g.parGeste) : '—'} |`);
  } else {
    L.push('Aucun geste enregistré.');
  }
  L.push('');
  if (D.auto.length) {
    L.push(`<sub>Automatisations (sans énergie) : ${D.auto.map((x) => `${mdSafe(GESTES[x.key] || x.key)} ${fmtNum(x.total)}`).join(' · ')}.</sub>`);
    L.push('');
  }
  L.push('## Ressources ramassées');
  L.push('');
  perDayTable(L, D.ramasse, 'Ressource');
  L.push('## Objets fabriqués à l\'Atelier');
  L.push('');
  perDayTable(L, D.fabrique, 'Objet');
  L.push('## Blocs posés');
  L.push('');
  perDayTable(L, D.pose, 'Bloc');
  L.push('## Niveaux');
  L.push('');
  if (r.niveaux.length) {
    L.push('| Niveau | Joueurs | Atteint après (temps de jeu, médiane) | Au jour de jeu (médiane) | Depuis le niveau précédent (médiane) |');
    L.push('| ---: | ---: | ---: | ---: | ---: |');
    for (const n of r.niveaux) L.push(`| ${n.level} | ${n.joueurs} | ${fmtDuration(n.medianMs)} | ${n.medianJour ? fmtNum(n.medianJour) : '—'} | ${n.depuisN ? fmtDuration(n.medianDepuisMs) : '—'} |`);
    L.push('');
    L.push('<sub>Toutes les parties des joueurs actifs pendant la période, depuis le début du suivi par joueur.</sub>');
  } else {
    L.push('Aucun niveau gagné enregistré.');
  }
  L.push('');
  renderRetention(L, r);
  L.push('## Progression par joueur');
  L.push('');
  if (J.fiches.length) {
    L.push('| Joueur | Depuis | Sessions | Temps de jeu | Jour de jeu | Niveau | Chapitre | Famille |');
    L.push('| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: |');
    for (const p of J.fiches) {
      const depuis = Date.parse(p.since);
      L.push(`| ${shortId(p.id)} | ${Number.isFinite(depuis) ? fmtDateTime(new Date(depuis)) : '—'} | ${p.sessions} | ${fmtDuration(p.playMs)} | ${p.jour ?? '—'} | ${p.niveau} | ${p.chapitre ?? '—'} | ${p.membres ?? '—'} |`);
    }
    if (J.fichesTotal > J.fiches.length) L.push(`| … et ${J.fichesTotal - J.fiches.length} autres | | | | | | | |`);
    L.push('');
    const C = r.courbes.filter((c) => c.curve.length > 1);
    if (C.length) {
      const maxMs = Math.max(...C.map((c) => c.curve[c.curve.length - 1].ms), 60000);
      const pas = Array.from({ length: CURVE_STEPS + 1 }, (_, i) => (maxMs * i) / CURVE_STEPS);
      const maxLv = Math.max(2, ...C.map((c) => c.curve[c.curve.length - 1].level));
      L.push('```mermaid');
      L.push('xychart-beta');
      L.push('  title "Niveau selon le temps de jeu"');
      L.push(`  x-axis "Heures de jeu" [${pas.map((ms) => (ms / 3600000).toFixed(1)).join(', ')}]`);
      L.push(`  y-axis "Niveau" 1 --> ${maxLv}`);
      for (const c of C) L.push(`  line [${pas.map((ms) => levelAt(c.curve, ms)).join(', ')}]`);
      L.push('```');
      L.push('');
      L.push(`<sub>Une ligne par joueur, dans l'ordre : ${C.map((c) => c.id).join(', ')}. Au-delà de son temps de jeu, la ligne d'un joueur reste à son dernier niveau.</sub>`);
      L.push('');
    }
  } else {
    L.push('Aucun joueur suivi pendant la période.');
    L.push('');
  }
}

export function renderMarkdown(r) {
  const L = [];
  L.push(`# 🌾 Ferme Familiale — rapport du ${fmtLongDate(r.end)}`);
  L.push('');
  L.push(`Période : ${fmtDateTime(r.start)} → ${fmtDateTime(r.end)} (heure de Paris)`);
  L.push('');
  L.push('## Sessions');
  L.push('');
  L.push(`- **Sessions ouvertes** : ${r.sessions}`);
  if (r.sessions) {
    L.push(`- **Temps actif moyen par session** : ${fmtDuration(r.avgActiveMs)} (médiane ${fmtDuration(r.medianActiveMs)})`);
    L.push(`- **Sessions très courtes** (moins de 30 s) : ${r.shortSessions}`);
  }
  L.push('');
  renderGame(L, r);
  L.push('## Temps passé par chapitre');
  L.push('');
  if (r.chapters.length) {
    L.push('| Chapitre | Sessions | Total | Moyenne par session |');
    L.push('| --- | ---: | ---: | ---: |');
    for (const c of r.chapters) L.push(`| ${c.chapter} | ${c.sessions} | ${fmtDuration(c.totalMs)} | ${fmtDuration(c.avgMs)} |`);
  } else {
    L.push('Aucune donnée (aucune nuit jouée pendant la période).');
  }
  L.push('');
  const chapterNote = [];
  if (r.unknownChapter) chapterNote.push(`${r.unknownChapter} session(s) sans nuit jouée : chapitre inconnu, non comptée(s) ci-dessus.`);
  chapterNote.push('Temps actif (onglet visible), réparti au prorata du temps écoulé dans chaque chapitre.');
  L.push(`<sub>${chapterNote.join(' ')}</sub>`);
  L.push('');
  L.push(`## Top ${TOP_N} des boutons utilisés`);
  L.push('');
  if (r.topActions.length) {
    L.push('| # | Action | Nombre |');
    L.push('| ---: | --- | ---: |');
    r.topActions.forEach((a, i) => L.push(`| ${i + 1} | ${mdSafe(a.label)} | ${a.count} |`));
  } else {
    L.push('Aucune action enregistrée.');
  }
  L.push('');
  L.push(`<sub>${r.interfaceClicks} clics d'interface (navigation, fenêtres, réglages) exclus du classement.</sub>`);
  if (r.signals.length) {
    L.push('');
    L.push('## Autres signaux');
    L.push('');
    for (const s of r.signals) L.push(`- ${s.label} : ${s.count}`);
  }
  L.push('');
  if (r.erreurs && r.erreurs.total) {
    L.push('## Erreurs techniques');
    L.push('');
    L.push(`${r.erreurs.total} erreur(s) au total.`);
    L.push('');
    for (const [msg, n] of r.erreurs.top) L.push(`- ${n} × ${mdSafe(msg)}`);
    L.push('');
  }
  L.push(`## Commentaires des joueurs (${r.comments.length})`);
  L.push('');
  if (r.comments.length) {
    for (const c of r.comments.slice(0, MAX_COMMENTS_SHOWN)) {
      L.push(`**${commentMeta(c)}**`);
      L.push('');
      L.push(codeBlock(c.text));
      L.push('');
    }
    if (r.comments.length > MAX_COMMENTS_SHOWN) L.push(`… et ${r.comments.length - MAX_COMMENTS_SHOWN} autres commentaires.`);
  } else {
    L.push('Aucun commentaire.');
  }
  const notes = dataNotes(r);
  if (notes.length) {
    L.push('');
    L.push('## À savoir');
    L.push('');
    for (const n of notes) L.push(`- ${n}`);
  }
  return L.join('\n').replace(/\n{3,}/g, '\n\n') + '\n';
}
