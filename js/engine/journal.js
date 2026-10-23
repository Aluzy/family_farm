/* ---------- le journal de la partie : ce que fait le personnage ----------
   Le moteur y note ses gestes au fil du jeu : l'énergie dépensée (energie : { action, mille }),
   chaque action et son XP (action : { action, n, auto }), les niveaux gagnés (niveau :
   { niveau }), les ressources ramassées sur la carte (ramasse : { item, n }), ce qui est
   fabriqué à l'Atelier (fabrique : { recette, items, outil }), les blocs posés (pose :
   { sorte }) et les pièces gagnées ou dépensées (pieces : { montant, poste }, compta.js).
   L'interface l'écoute pour le suivi de session, avec le consentement du joueur
   (js/ui/consent.js) ; sans écouteur, rien ne se passe. Rien n'entre dans la sauvegarde. */

const ecouteurs = new Set();

// Écoute le journal : fn(type, donnees). Renvoie de quoi arrêter d'écouter.
export function ecouterJournal(fn) {
  ecouteurs.add(fn);
  return () => ecouteurs.delete(fn);
}

// Note un geste ; un écouteur qui échoue ne gêne jamais le jeu.
export function noter(type, donnees) {
  if (!ecouteurs.size) return;
  for (const fn of ecouteurs) {
    try { fn(type, donnees); } catch (e) { /* ignoré */ }
  }
}
