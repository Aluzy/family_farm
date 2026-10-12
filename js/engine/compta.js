/* ---------- Comptes : le détail récent des pièces gagnées et dépensées ---------- */

// state.compta = [{ jour, libelle, montant, n }], du plus ancien au plus récent (absent dans
// une ancienne sauvegarde : rien de noté). montant > 0 : un gain ; < 0 : une dépense.
// Deux écritures de suite, le même jour et avec le même libellé, n'en font qu'une (n les
// compte : 5 carottes achetées une par une donnent une ligne « × 5 »).
export const COMPTA_MAX = 40;

export function noteCompta(state, montant, libelle, n = 1) {
  if (!montant) return;
  if (!Array.isArray(state.compta)) state.compta = [];
  const last = state.compta[state.compta.length - 1];
  if (last && last.jour === state.day && last.libelle === libelle && Math.sign(last.montant) === Math.sign(montant)) {
    last.montant += montant;
    last.n += n;
    return;
  }
  state.compta.push({ jour: state.day, libelle, montant, n });
  if (state.compta.length > COMPTA_MAX) state.compta.splice(0, state.compta.length - COMPTA_MAX);
}

// Les écritures gardées, et le solde d'avant la première : solde + somme = pièces.
export function comptaRecente(state) {
  const lignes = Array.isArray(state.compta) ? state.compta : [];
  const somme = lignes.reduce((s, l) => s + l.montant, 0);
  return { lignes, avant: state.pieces - somme, total: state.pieces };
}

// Pièces gagnées (vente, commerce, lettre…) : le pendant de spend (devices.js).
export function earn(state, montant, libelle, n = 1) {
  state.pieces += montant;
  noteCompta(state, montant, libelle, n);
}
