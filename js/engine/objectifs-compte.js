/* ---------- les objectifs du jour : ce qu'on compte (la refonte du didacticiel, lot 2) ----------
   Les gestes du jeu notent ici ce qui fait avancer les objectifs du jour (js/engine/objectifs.js) : chaque
   action qui rapporte de l'XP (levels.js gainActionXp : labourer, planter, arroser, faucher, couper, piocher,
   récolter, cueillir, vendre…) et quelques événements (un arbre abattu, un rocher cassé, une prise dans le
   grand monde, la carte du monde ouverte, la calèche rencontrée, un habitant à qui l'on parle).
   state.objectifs.faits = { [quoi]: n } : depuis le début des objectifs en cours. Sans objectifs (une partie
   d'avant), rien. Ce module n'importe rien : tout le moteur peut l'appeler. */

export function noterObjectif(state, quoi, n = 1) {
  const o = state && state.objectifs;
  if (!o || o.fini || !(n > 0)) return;
  if (!o.faits || typeof o.faits !== 'object') o.faits = {};
  o.faits[quoi] = (o.faits[quoi] || 0) + n;
  // (vendre à la calèche, c'est aussi la rencontrer)
  if (quoi === 'vendre') o.faits.caleche = (o.faits.caleche || 0) + 1;
}
