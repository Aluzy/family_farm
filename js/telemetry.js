'use strict';

/* ==========================================================================
   SUIVI DE SESSION — mesure d'usage pour améliorer le jeu, avec consentement.

   Règles :
   - Rien n'est créé (ni stockage, ni requête réseau) tant que le joueur n'a
     pas accepté ; un refus, ou un signal Global Privacy Control / Do Not Track
     du navigateur, désactive tout.
   - Aucune donnée personnelle : un numéro de session aléatoire, un numéro de
     joueur aléatoire (le même d'une visite à l'autre, pour suivre la progression),
     des compteurs (boutons, écrans, défilement, gestes du personnage par jour de
     jeu) et des instantanés de progression.
   - Le contenu de la sauvegarde et l'adresse IP ne sont jamais lus. Le seul
     texte saisi qui part est le commentaire que le joueur choisit lui-même
     d'envoyer (Options › « Aidez-nous à améliorer le jeu ! »).
   - Ce bloc ne touche ni à l'ENGINE ni à la sauvegarde ; l'app l'appelle via
     Telemetry.* et le jeu fonctionne à l'identique s'il est absent.
   Politique publique : cookies.html (à tenir à jour avec ce fichier).
   ========================================================================== */

const Telemetry = (() => {
  const CONSENT_KEY = 'ferme-consent'; // localStorage : le choix du joueur
  const SID_KEY = 'ff_sid';            // sessionStorage : numéro de session
  const T0_KEY = 'ff_t0';              // sessionStorage : début de session
  const DATA_KEY = 'ff_data';          // sessionStorage : compteurs de la visite
  const PLAYER_KEY = 'ff_player';      // localStorage : numéro de joueur, temps de jeu cumulé
  const POLICY_VERSION = '1.3';
  const CONSENT_TTL_MS = 183 * 24 * 3600 * 1000; // environ 6 mois
  const FLUSH_MS = 60000;
  const MAX_EVENTS = 400;
  const MAX_BYTES = 60 * 1024;
  const MAX_KEYS = 200;
  const MAX_ERRORS = 10;
  const MAX_DEAD_EVENTS = 20;
  const MAX_FEEDBACK = 3;          // commentaires par visite
  const MAX_FEEDBACK_CHARS = 1000; // longueur d'un commentaire
  const MAX_IDLE_STEP_MS = 10 * 60 * 1000; // un écart plus long = appareil en veille
  const MAX_DAYS = 40;     // jours de jeu détaillés par visite
  const MAX_DAY_KEYS = 60; // actions, objets… par jour

  const ENDPOINT_PROD = 'https://family-farm.contact-voidr.workers.dev/session';
  const ENDPOINT_LOCAL = 'http://127.0.0.1:8787/session'; // collect-server.mjs (essais)

  let gameVersion = '';
  let active = false;
  let sid = null;
  let t0 = 0;
  let data = null;
  let dirty = false;
  let ended = false; // vrai entre la fermeture de la page et un éventuel retour (cache navigateur)
  let timer = null;
  let listenersOn = false;
  let curTab = null;
  let lastTick = 0;
  let lastVisible = true;
  let lastScrollAt = 0;
  let player = null;  // { id, ms, since } : le joueur, d'une visite à l'autre
  let curDay = null;  // le jour de jeu en cours

  /* ---------- stockage : toujours protégé, jamais bloquant ---------- */

  function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* ignoré */ } }
  function ssGet(k) { try { return sessionStorage.getItem(k); } catch (e) { return null; } }
  function ssSet(k, v) { try { sessionStorage.setItem(k, v); } catch (e) { /* ignoré */ } }
  function ssDel(k) { try { sessionStorage.removeItem(k); } catch (e) { /* ignoré */ } }

  /* ---------- consentement ---------- */

  function browserOptOut() {
    try {
      return navigator.globalPrivacyControl === true
        || navigator.doNotTrack === '1'
        || (typeof window !== 'undefined' && window.doNotTrack === '1');
    } catch (e) { return false; }
  }

  function readConsent() {
    const raw = lsGet(CONSENT_KEY);
    if (!raw) return null;
    try {
      const c = JSON.parse(raw);
      if (!c || (c.choice !== 'granted' && c.choice !== 'denied')) return null;
      if (c.policy !== POLICY_VERSION) return null; // politique modifiée : on redemande
      const at = Date.parse(c.at);
      if (!Number.isFinite(at) || Date.now() - at > CONSENT_TTL_MS) return null;
      return c;
    } catch (e) { return null; }
  }

  // 'granted' | 'denied' | 'unknown' (à demander) | 'optout' (signal du navigateur)
  function status() {
    if (browserOptOut()) return 'optout';
    const c = readConsent();
    return c ? c.choice : 'unknown';
  }

  function setConsent(choice) {
    if (choice !== 'granted' && choice !== 'denied') return status();
    lsSet(CONSENT_KEY, JSON.stringify({ choice, at: new Date().toISOString(), policy: POLICY_VERSION }));
    if (choice === 'granted' && !browserOptOut()) start(); else stop();
    return status();
  }

  /* ---------- utilitaires ---------- */

  function clean(s, n) { return String(s == null ? '' : s).slice(0, n); }
  function cleanKey(s) { return clean(s, 60).replace(/[^A-Za-z0-9_:./-]/g, '_'); }
  function num(v) { return typeof v === 'number' && Number.isFinite(v) ? Math.round(v * 100) / 100 : null; }
  function now() { return Date.now(); }
  function rel() { return now() - t0; }

  function newSid() {
    try {
      if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
      if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
        const b = new Uint8Array(16);
        crypto.getRandomValues(b);
        return Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');
      }
    } catch (e) { /* repli ci-dessous */ }
    let s = '';
    for (let i = 0; i < 32; i++) s += Math.floor(Math.random() * 16).toString(16);
    return s;
  }

  function emptyData() {
    return { clicks: {}, dead: 0, scrolls: 0, tabs: {}, scroll: {}, modals: {}, errors: 0, visibleMs: 0, dropped: 0, feedback: [], events: [], jours: {} };
  }

  /* ---------- le joueur : un numéro aléatoire, gardé d'une visite à l'autre ---------- */

  function loadPlayer() {
    try {
      const p = JSON.parse(lsGet(PLAYER_KEY) || 'null');
      if (p && /^[A-Za-z0-9-]{8,64}$/.test(String(p.id || ''))) {
        return { id: p.id, ms: Number.isFinite(p.ms) && p.ms > 0 ? p.ms : 0, since: clean(p.since, 30) };
      }
    } catch (e) { /* un nouveau numéro */ }
    const fresh = { id: newSid(), ms: 0, since: new Date().toISOString() };
    lsSet(PLAYER_KEY, JSON.stringify(fresh));
    return fresh;
  }

  function savePlayer() { if (active && player) lsSet(PLAYER_KEY, JSON.stringify(player)); }

  // Les compteurs du jour de jeu en cours : { ms, actions, auto, energie, ramasse, fabrique, pose,
  // gagne, depense } (gagne, depense : les pièces, par poste).
  function dayEntry() {
    if (curDay === null) return null;
    const k = String(curDay);
    if (!data.jours[k]) {
      if (Object.keys(data.jours).length >= MAX_DAYS) return null;
      data.jours[k] = { ms: 0, actions: {}, auto: {}, energie: {}, ramasse: {}, fabrique: {}, pose: {}, gagne: {}, depense: {} };
    }
    return data.jours[k];
  }

  function bumpDay(field, key, by) {
    const j = dayEntry();
    if (!j) return;
    const map = j[field], k = cleanKey(key);
    if (!(k in map) && Object.keys(map).length >= MAX_DAY_KEYS) return;
    map[k] = Math.round(((map[k] || 0) + by) * 100) / 100;
    dirty = true;
  }

  function bump(map, key, by) {
    const k = cleanKey(key);
    if (!(k in map) && Object.keys(map).length >= MAX_KEYS) return;
    map[k] = (map[k] || 0) + (by || 1);
  }

  function tabEntry(key) {
    const k = cleanKey(key);
    if (!data.tabs[k]) {
      if (Object.keys(data.tabs).length >= 40) return { ms: 0, views: 0 };
      data.tabs[k] = { ms: 0, views: 0 };
    }
    return data.tabs[k];
  }

  /* ---------- événements ---------- */

  function push(type, fields) {
    if (!active) return;
    if (data.events.length >= MAX_EVENTS) {
      // On garde d'abord les repères de progression : on sacrifie le plus vieux clic.
      const i = data.events.findIndex((e) => e.type === 'click');
      if (i < 0) { data.dropped++; return; }
      data.events.splice(i, 1);
      data.dropped++;
    }
    const ev = { t: rel(), type };
    if (fields) for (const k of Object.keys(fields)) if (fields[k] !== null && fields[k] !== undefined) ev[k] = fields[k];
    data.events.push(ev);
    dirty = true;
  }

  // Temps passé sur l'écran courant, uniquement onglet visible.
  function accrue() {
    const n = now();
    if (lastVisible && lastTick) {
      const dt = n - lastTick;
      if (dt > 0 && dt < MAX_IDLE_STEP_MS) {
        data.visibleMs += dt;
        if (curTab) tabEntry(curTab).ms += dt;
        const j = dayEntry();
        if (j) j.ms += dt;
        if (player) player.ms += dt;
      }
    }
    lastTick = n;
    try { lastVisible = !document.hidden; } catch (e) { lastVisible = true; }
  }

  function click(action, detail) {
    if (!active) return;
    bump(data.clicks, action);
    push('click', { action: clean(action, 40), detail: detail ? clean(detail, 60) : null });
  }

  function deadClick(el) {
    if (!active) return;
    data.dead++;
    dirty = true;
    if (data.dead <= MAX_DEAD_EVENTS) {
      let where = '';
      try { where = clean(el && el.tagName, 12).toLowerCase() + (el && el.className && typeof el.className === 'string' ? '.' + clean(el.className.split(' ')[0], 30) : ''); } catch (e) { /* ignoré */ }
      push('click_dead', { where });
    }
  }

  function tab(name, screen) {
    if (!active) return;
    accrue();
    curTab = cleanKey(name + (screen ? ':' + screen : ''));
    tabEntry(curTab).views++;
    push('tab_view', { tab: curTab });
  }

  function modal(name) {
    if (!active) return;
    bump(data.modals, name);
    push('modal_open', { modal: cleanKey(name) });
  }

  function night(snapshot) {
    if (!active || !snapshot) return;
    accrue();
    push('night', {
      day: num(snapshot.day), chapter: num(snapshot.chapter), autonomy: num(snapshot.autonomy),
      pieces: num(snapshot.pieces), energy: num(snapshot.energy), awake: num(snapshot.awake),
      level: num(snapshot.level), xp: num(snapshot.xp), adults: num(snapshot.adults), children: num(snapshot.children),
      wild: snapshot.wild === undefined ? null : !!snapshot.wild, meal: num(snapshot.meal),
      tuto: snapshot.tuto ? cleanKey(snapshot.tuto) : null, playMs: player ? Math.round(player.ms) : null,
    });
    savePlayer();
  }

  // Le jour de jeu en cours (au chargement, puis à chaque réveil) : le temps réel s'y ajoute.
  function day(n) {
    if (!active || !Number.isFinite(n)) return;
    accrue();
    curDay = Math.max(0, Math.floor(n));
  }

  // Un geste du personnage, noté par le moteur (js/engine/journal.js).
  function game(type, d) {
    if (!active || !d) return;
    if (type === 'action') bumpDay(d.auto ? 'auto' : 'actions', d.action, num(d.n) || 1);
    else if (type === 'energie') bumpDay('energie', d.action, (num(d.mille) || 0) / 1000);
    else if (type === 'ramasse') bumpDay('ramasse', d.item, num(d.n) || 1);
    else if (type === 'fabrique') {
      const items = d.items && Object.keys(d.items).length ? d.items : (d.outil ? { [d.outil]: 1 } : {});
      for (const [item, n] of Object.entries(items)) bumpDay('fabrique', item, num(n) || 1);
    } else if (type === 'pose') bumpDay('pose', d.sorte, 1);
    else if (type === 'pieces' && num(d.montant)) bumpDay(d.montant > 0 ? 'gagne' : 'depense', d.poste || 'autre', Math.abs(num(d.montant)));
    else if (type === 'niveau') {
      accrue();
      push('level', { level: num(d.niveau), day: curDay, playMs: player ? Math.round(player.ms) : null });
      savePlayer();
    }
  }

  // Commentaire libre du joueur, envoyé avec la session. Retourne :
  // 'ok' | 'empty' (rien d'écrit) | 'limit' (maximum atteint) | 'inactive' (suivi non autorisé).
  function feedback(text) {
    if (!active) return 'inactive';
    const t = clean(text, MAX_FEEDBACK_CHARS).trim();
    if (!t) return 'empty';
    if (!Array.isArray(data.feedback)) data.feedback = [];
    if (data.feedback.length >= MAX_FEEDBACK) return 'limit';
    accrue();
    data.feedback.push({ t: rel(), text: t });
    dirty = true;
    flush(false);
    return 'ok';
  }

  function chapter(n, day) { push('chapter', { chapter: num(n), day: num(day) }); }
  function alertSeen(kind) { push('alert', { kind: cleanKey(kind) }); }

  function reportError(message, file, line, col) {
    if (!active || data.errors >= MAX_ERRORS) return;
    data.errors++;
    let f = '';
    try { f = clean(String(file || '').split('/').pop().split('?')[0], 40); } catch (e) { /* ignoré */ }
    push('error', { message: clean(message, 160), file: f, line: num(line), col: num(col) });
  }

  /* ---------- défilement ---------- */

  function onScroll() {
    if (!active) return;
    const n = now();
    if (n - lastScrollAt < 1000) return;
    lastScrollAt = n;
    data.scrolls++;
    dirty = true;
    try {
      const el = document.scrollingElement || document.documentElement;
      const max = el.scrollHeight - el.clientHeight;
      if (max <= 0) return;
      const pct = Math.min(100, Math.floor((el.scrollTop / max) * 4) * 25);
      const key = cleanKey(curTab || 'page');
      if (pct > (data.scroll[key] || 0)) {
        if (!(key in data.scroll) && Object.keys(data.scroll).length >= 40) return;
        data.scroll[key] = pct;
        push('scroll_depth', { tab: key, pct });
      }
    } catch (e) { /* ignoré */ }
  }

  /* ---------- envoi ---------- */

  function endpoint() {
    let host = '';
    try { host = location.hostname; } catch (e) { return null; }
    if (host === 'aluzy.github.io') return ENDPOINT_PROD;
    if (host === '' || host === 'localhost' || host === '127.0.0.1') return ENDPOINT_LOCAL;
    return null; // autre domaine (copie, aperçu) : rien n'est envoyé
  }

  function deviceInfo() {
    let w = 0;
    try { w = window.innerWidth || 0; } catch (e) { /* ignoré */ }
    return { cls: w && w < 768 ? 'mobile' : 'desktop', width: Math.round(w / 100) * 100 };
  }

  function buildPayload(ended) {
    accrue();
    const d = data;
    let events = d.events;
    const make = () => JSON.stringify({
      v: 2, sid, game: gameVersion, policy: POLICY_VERSION,
      player: player ? { id: player.id, playMs: Math.round(player.ms), since: player.since } : null,
      startedAt: new Date(t0).toISOString(), updatedAt: new Date().toISOString(),
      ended: !!ended, durationMs: rel(), visibleMs: Math.round(d.visibleMs),
      device: deviceInfo(),
      counters: { clicks: d.clicks, deadClicks: d.dead, scrolls: d.scrolls, tabs: d.tabs, scrollDepth: d.scroll, modals: d.modals, errors: d.errors, droppedEvents: d.dropped },
      feedback: d.feedback || [],
      jours: d.jours || {},
      events,
    });
    let json = make();
    while (json.length > MAX_BYTES && events.length > 0) {
      // Trop gros : on retire d'abord les plus vieux clics, puis les plus vieux événements.
      let removed = 0;
      events = events.filter((e) => !(removed < 25 && e.type === 'click' && ++removed));
      if (removed === 0) events = events.slice(25);
      d.dropped += removed || 25;
      json = make();
    }
    // (encore trop gros sans événement : les plus vieux jours de jeu partent)
    while (json.length > MAX_BYTES && Object.keys(d.jours || {}).length > 1) {
      delete d.jours[Object.keys(d.jours).sort((a, b) => a - b)[0]];
      json = make();
    }
    d.events = events;
    return json;
  }

  function send(body) {
    const url = endpoint();
    if (!url) return false;
    try {
      if (typeof navigator !== 'undefined' && navigator.sendBeacon
        && navigator.sendBeacon(url, new Blob([body], { type: 'text/plain;charset=UTF-8' }))) return true;
    } catch (e) { /* repli fetch */ }
    try {
      fetch(url, { method: 'POST', body, keepalive: true, mode: 'cors', headers: { 'Content-Type': 'text/plain;charset=UTF-8' } }).catch(() => {});
      return true;
    } catch (e) { return false; }
  }

  function persist() { if (active) { ssSet(DATA_KEY, JSON.stringify(data)); savePlayer(); } }

  function flush(endedNow) {
    if (!active) return;
    const body = buildPayload(endedNow || ended);
    persist();
    if (send(body)) dirty = false;
  }

  function onVisibility() {
    if (!active) return;
    accrue();
    let hidden = false;
    try { hidden = document.hidden; } catch (e) { /* ignoré */ }
    if (!hidden) ended = false; // retour sur la page : la session continue
    else flush(false);
  }

  // À la fermeture, pagehide précède visibilitychange : l'envoi final ne doit pas être écrasé par le suivant.
  function onPageHide() { if (active) { ended = true; flush(true); } }
  function onWindowError(e) { reportError(e && e.message, e && e.filename, e && e.lineno, e && e.colno); }
  function onRejection(e) {
    const r = e && e.reason;
    reportError('unhandledrejection: ' + (r && r.message ? r.message : r), '', 0, 0);
  }

  function addListeners() {
    if (listenersOn) return;
    listenersOn = true;
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('pagehide', onPageHide);
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('error', onWindowError);
    window.addEventListener('unhandledrejection', onRejection);
  }

  function removeListeners() {
    if (!listenersOn) return;
    listenersOn = false;
    document.removeEventListener('visibilitychange', onVisibility);
    window.removeEventListener('pagehide', onPageHide);
    window.removeEventListener('scroll', onScroll);
    window.removeEventListener('error', onWindowError);
    window.removeEventListener('unhandledrejection', onRejection);
  }

  /* ---------- cycle de vie ---------- */

  function start() {
    if (active || browserOptOut() || status() !== 'granted') return;
    sid = ssGet(SID_KEY);
    const resumed = !!sid;
    if (!sid) { sid = newSid(); ssSet(SID_KEY, sid); }
    t0 = Number(ssGet(T0_KEY)) || 0;
    if (!t0) { t0 = now(); ssSet(T0_KEY, String(t0)); }
    data = emptyData();
    if (resumed) {
      try {
        const saved = JSON.parse(ssGet(DATA_KEY) || 'null');
        if (saved && typeof saved === 'object' && Array.isArray(saved.events)) data = Object.assign(emptyData(), saved);
      } catch (e) { /* on repart de zéro */ }
    }
    player = loadPlayer();
    active = true;
    lastTick = now();
    try { lastVisible = !document.hidden; } catch (e) { lastVisible = true; }
    addListeners();
    timer = setInterval(() => { if (dirty) flush(false); }, FLUSH_MS);
    push(resumed ? 'session_resume' : 'session_start', { game: clean(gameVersion, 20) });
    flush(false);
  }

  function stop() {
    active = false;
    if (timer) { clearInterval(timer); timer = null; }
    removeListeners();
    ssDel(SID_KEY); ssDel(T0_KEY); ssDel(DATA_KEY);
    try { localStorage.removeItem(PLAYER_KEY); } catch (e) { /* ignoré */ }
    sid = null; data = null; curTab = null; dirty = false; ended = false; player = null; curDay = null;
  }

  function init(opts) {
    gameVersion = clean(opts && opts.version, 20);
    if (status() === 'granted') start();
    return status();
  }

  return {
    init, status, setConsent, track: push,
    click, deadClick, tab, modal, night, chapter, alert: alertSeen, feedback, day, game,
    sessionId: () => (active ? sid : null),
    playerId: () => (active && player ? player.id : null),
    isActive: () => active,
    policyVersion: POLICY_VERSION,
    // exposés pour les tests hors navigateur
    _flush: flush,
  };
})();
