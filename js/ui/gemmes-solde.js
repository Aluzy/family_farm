/* ---------- le solde de gemmes sur la carte du joueur ----------
   Un relais sans dépendance : la carte du joueur (js/ui/stage-windows.js) demande ici le bouton du solde ;
   js/ui/gemmes.js le fournit à son chargement. (Importer gemmes.js depuis la carte du joueur ferait une boucle
   d'imports : gemmes.js → compte.js → … → stage-windows.js.) */
let fournisseur = () => '';
export const gemmesHtml = () => fournisseur();
export function fournirGemmes(f) { fournisseur = f; }
