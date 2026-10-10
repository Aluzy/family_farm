// Rapport quotidien Ferme Familiale : calcul pur (aucun accès réseau ni R2),
// pour pouvoir le tester avec `node worker/test-report.mjs`.
//
// Entrée : les fichiers JSON de session écrits par le Worker (voir
// js/telemetry.js). Sortie : un objet « rapport », puis son rendu
// en texte et en HTML pour l'e-mail.

const TZ = 'Europe/Paris';
const DAY_MS = 24 * 3600 * 1000;
const SHORT_SESSION_MS = 30 * 1000;
const TOP_N = 10;
const MAX_COMMENTS_SHOWN = 30;

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
  'start-recipe': 'Cuisiner (préparer une recette)',
  'sell-item': 'Vendre',
  'buy-item': 'Acheter un produit ou une graine',
  'buy-animal': 'Acheter un animal',
  'plant-tree': 'Planter un arbre',
  'commerce-choose': 'Choisir un commerce',
  'commerce-upgrade': 'Agrandir le commerce',
  'commerce-quota-dec': 'Régler le commerce',
  'commerce-quota-inc': 'Régler le commerce',
  'commerce-quota-max': 'Régler le commerce',
  'harvest-tree': 'Cueillir un arbre',
  'ville-go': 'Partir en sortie ou en voyage',
  'ville-market': 'Aller au marché de la ville',
  'ville-buy': 'Acheter au marché de la ville',
  'buy-pasture': 'Acheter une place à l\'Étable',
  'mill-start': 'Moudre du blé au Moulin',
  'mill-cancel': 'Moudre du blé au Moulin',
  'member-save': 'Personnaliser un membre de la famille',
  'member-add': 'Ajouter un membre à la famille',
  'repair-house': 'Réparer la maison',
  'buy-starter': 'Acheter un appareil de départ',
  'main-character': 'Choisir le personnage principal',
  'setup-start': 'Commencer la partie (famille configurée)',
  'member-remove': 'Retirer un membre de la famille',
  'pet-add': 'Adopter un animal de compagnie',
  'pet-save': 'Personnaliser un animal de compagnie',
  'pet-remove': 'Retirer un animal de compagnie',
  'buy-orchard-slot': 'Acheter un emplacement de verger',
  'buy-tech': 'Acquérir une technologie',
  'sleep': 'Dormir',
  'build-serre': 'Construire un bâtiment',
  'build-poulailler': 'Construire un bâtiment',
  'build-fridge': 'Construire un bâtiment',
  'build-verger': 'Construire un bâtiment',
  'build-silo': 'Construire un bâtiment',
  'build-paturage': 'Construire un bâtiment',
  'build-station': 'Construire un bâtiment',
  'upgrade': 'Améliorer ou agrandir',
  'upgrade-silo': 'Améliorer ou agrandir',
  'upgrade-serre': 'Améliorer ou agrandir',
  'upgrade-poulailler': 'Améliorer ou agrandir',
  'buy-hoe': 'Acheter la houe',
  'hoe': 'Labourer ou reboucher à la houe',
  'hoe-toggle': 'Prendre ou ranger la houe',
  'upgrade-tank': 'Améliorer ou agrandir',
  'upgrade-fridge': 'Améliorer ou agrandir',
  'maintain': 'Entretenir un appareil',
  'repair': 'Réparer un appareil',
  'eat': 'Manger un en-cas',
  'fridge-in': 'Utiliser le réfrigérateur',
  'fridge-in-all': 'Utiliser le réfrigérateur',
  'fridge-out': 'Utiliser le réfrigérateur',
  'toggle': 'Allumer ou éteindre un appareil',
  'routine-toggle': 'Activer ou couper la routine familiale',
  'bolt': 'Laisser monter en graine',
  'semis-set': 'Régler les semis automatiques',
};

// Clics d'interface : navigation, fenêtres, réglages de quantité. Comptés à
// part, jamais dans le classement des actions.
export const INTERFACE_ACTIONS = new Set([
  'close-modal', 'close-screen', 'switch-tab', 'open-screen', 'open-options', 'open-about', 'open-levels',
  'open-feedback', 'send-feedback', 'help', 'tuto-next', 'plant-open', 'semis-open', 'sell-inc',
  'sell-dec', 'sell-max', 'cancel-queued', 'ack-chapter', 'tree-slot', 'tree-slot-cancel', 'commerce-pick', 'commerce-cancel',
  'ask-new-game', 'cancel-new-game', 'copy-export',
  'do-export', 'do-import', 'tuto-skip', 'do-new-game',
  'stage-open', 'stage-close', 'maison-tab', // carte de la ferme : fenêtres et onglets de la maison
  // versions 1.1 et 1.1.1 : déplacements sur la carte, raccourcis des notifications,
  // réglages de quantité (Moulin, achats), fiche d'un membre de la famille
  'stage-goto', 'stage-pan', 'aller', 'comptoir-tab', 'inv-tab',
  'mill-dec', 'mill-inc', 'mill-max', 'buy-dec', 'buy-inc', 'buy-max',
  'animal-dec', 'animal-inc', 'animal-max',
  'member-edit', 'member-genre', 'member-teint', 'member-style', 'wake-more',
  'pet-edit', 'pet-espece', // version 1.2 : fiche d'un animal de compagnie
  'mail-open', // version 1.3 : ouvrir une lettre du courrier
  'stage-exit', // intérieur de la Serre : en sortir
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

/* ---------- rapport ---------- */

// sessions : tableau d'objets JSON de session. now : fin de la période.
// meta : { unreadable, truncated } pour signaler une lecture incomplète.
export function buildReport(sessions, now, meta = {}) {
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

  return {
    start: new Date(start),
    end: new Date(end),
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
  L.push(`## Top ${TOP_N} des actions des joueurs`);
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
