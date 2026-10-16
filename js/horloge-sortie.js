/*
 * L'heure du jeu hors de la ferme (ville-carte.html : la ville, la carte de transition). Le jeu
 * ne tourne que sur la page de la ferme ; en partant (flèche du bout du chemin, « Se promener
 * en ville »), elle note le moment du départ (localStorage « ferme-sortie », js/ui/sortie.js) et
 * sauvegarde la partie. Ici, l'heure se déduit de la sauvegarde (« ferme-save » : le jour, le
 * temps d'éveil) et du temps passé depuis le départ, à la même vitesse que sur la ferme
 * (18 s par heure) ; à 22 h, c'est la nuit (elle commencera au retour à la ferme, où le
 * temps passé dehors est rejoué).
 *
 *   HorlogeSortie.maintenant()   → { jour, semaine (0 : lundi), heure (6 → 22), nuit, enfants } ou null
 *   HorlogeSortie.texte(m)       → « Lun. 8 h 30 »
 */
(function (global) {
  'use strict';

  const TEMPS = { debut: 6, nuit: 22, msParHeure: 18000 };
  const JOURS = ['Lun.', 'Mar.', 'Mer.', 'Jeu.', 'Ven.', 'Sam.', 'Dim.'];
  // le personnage d'un enfant sans choix (data/general.json, FAMILY.PROFIL.PERSO_DEFAUT_ENFANT)
  const PERSO_ENFANT = { f: 2, m: 1 };

  function lire(cle) {
    try { return JSON.parse(global.localStorage.getItem(cle) || 'null'); } catch (e) { return null; }
  }

  function maintenant(now) {
    const save = lire('ferme-save');
    const s = save && save.s;
    if (!s || typeof s.awakeMs !== 'number') return null;
    const sortie = lire('ferme-sortie');
    const t = now || Date.now();
    // le temps passé dehors depuis la sauvegarde du départ (sinon : l'heure de la sauvegarde)
    const dehors = sortie && Number.isFinite(sortie.depuis) && Math.abs(sortie.depuis - (save.t || 0)) < 10000 ? Math.max(0, t - sortie.depuis) : 0;
    const jour = Math.max(1, Math.floor(Number(s.day) || 1));
    const enfants = ((s.famille && s.famille.membres) || []).filter((m) => m && m.enfant)
      .map((m) => ({ id: m.id, perso: Number.isInteger(m.perso) && m.perso >= 1 ? m.perso : (PERSO_ENFANT[m.genre] || 2) }));
    const base = { jour, semaine: (jour - 1) % 7, enfants };
    if (s.nuitEnCours && Number.isFinite(s.nuitEnCours.ms)) return Object.assign(base, { heure: TEMPS.nuit, nuit: true });
    const heure = TEMPS.debut + (s.awakeMs + dehors) / TEMPS.msParHeure;
    return Object.assign(base, { heure: Math.min(TEMPS.nuit, heure), nuit: heure >= TEMPS.nuit });
  }

  function texte(m) {
    if (!m) return '';
    const h = Math.floor(m.heure), min = Math.floor((m.heure - h) * 4) * 15;
    return `${JOURS[m.semaine]} ${h} h ${String(min).padStart(2, '0')}${m.nuit ? ' · nuit' : ''}`;
  }

  global.HorlogeSortie = { maintenant, texte, JOURS_ECOLE: [0, 1, 3, 4] };
})(window);
