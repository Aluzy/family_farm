/* ==========================================================================
   Tests du moteur : construire à l'étage comme au sol (déplacer un meuble ou un bloc seul de l'étage,
   js/engine/etage.js deplacerEtage, deplacerEtageStatus ; la commande etage.deplacer et son inverse ;
   chaque geste de l'étage a ses inverses, pour Annuler).
   Lancer seul : node --test tests/engine/etage-outils.test.mjs (ou node tests/run-tests.mjs etage-outils).
   ========================================================================== */

import {
  addItem, DATA, defaire, deplacerEtage, deplacerEtageStatus, empreintePartie, etageBlocs, etageCouvertes, etageEmprise,
  executerCommande, poseEtageStatus, poserEtage, reprendreEtage, sensEtage, takeItem, testFarmMap, testFermeConstruite, varianteEtage,
} from '../../js/engine/index.js';
import { assert, assertEqual, garden, test } from './aide.mjs';

const B = DATA.ATELIER.BLOCS, W = 644;

// La ferme d'essai : l'étage de la première maison vidé ; deux places libres pour un lit (1 × 2).
function etage() {
  const s = garden();
  testFarmMap(s, '42');
  testFermeConstruite(s);
  for (const t of Object.keys(etageBlocs(s)).map(Number)) assert(reprendreEtage(s, t).ok);
  // (une place où un lit tient de face et de profil : les murs du bas rehaussés sont les murs de l'étage)
  addItem(s, B.meuble_lit_adulte.objet, 1);
  const places = [...etageEmprise(s)].sort((a, b) => a - b).filter((c) => [0, 1].every((sens) => poseEtageStatus(s, 'meuble_lit_adulte', c, sens).ok) && poseEtageStatus(s, 'meuble_lit_adulte', c + 1, 0).ok);
  takeItem(s, B.meuble_lit_adulte.objet, 1);
  assert(places.length > 4, 'des places libres à l\'étage');
  return { s, places };
}

test('étage : déplacer un lit (dans son sens et sa couleur), refus et aperçu sans rien changer', () => {
  const { s, places } = etage();
  addItem(s, B.meuble_lit_adulte.objet, 1);
  const a = places[0], b = places.find((c) => Math.abs(c - a) > 3 && Math.abs(Math.floor(c / W) - Math.floor(a / W)) > 1);
  assert(poserEtage(s, 'meuble_lit_adulte', a, 2, 'rouge').ok);
  // l'aperçu : sur une copie
  const e0 = empreintePartie(s);
  const st = deplacerEtageStatus(s, a - W, b);
  assertEqual([st.ok, st.cases.length, empreintePartie(s)], [true, 2, e0], 'tiendrait là, rien n\'a changé');
  // déplacé, pris par sa case du haut : sa case d'ancrage suit, son sens et sa couleur aussi
  const r = deplacerEtage(s, a - W, b);
  assertEqual([r.ok, r.de, r.vers, etageBlocs(s)[b], sensEtage(s, b), varianteEtage(s, b), etageBlocs(s)[a]], [true, a, b, 'meuble_lit_adulte', 2, 'rouge', undefined]);
  assertEqual(etageCouvertes(s).get(b - W), b);
  // hors de l'étage : refusé, il reste où il était
  const hors = deplacerEtage(s, b, 0);
  assertEqual([hors.ok, etageBlocs(s)[b], varianteEtage(s, b)], [false, 'meuble_lit_adulte', 'rouge']);
});

test('étage : la commande etage.deplacer et son inverse ; chaque geste de l\'étage se défait (Annuler)', () => {
  const { s, places } = etage();
  addItem(s, B.meuble_chaise.objet, 1);
  const jouer = (type, args) => executerCommande(s, { id: type, type, args });
  const e0 = empreintePartie(s), a = places[0], b = places[3];
  const gestes = [];
  const fait = (r) => { assert(r.ok, r.error); gestes.push(r.inverses); return r; };
  fait(jouer('etage.poser', { sorte: 'meuble_chaise', case: a, sens: 1, variante: 'noyer' }));
  fait(jouer('etage.tourner', { case: a }));
  fait(jouer('etage.peindre', { case: a, variante: 'bleu' }));
  const d = fait(jouer('etage.deplacer', { de: a, vers: b }));
  assertEqual(d.inverses[0], { type: 'etage.deplacer', args: { de: b, vers: a, attendu: 'meuble_chaise' } });
  assertEqual([etageBlocs(s)[b], varianteEtage(s, b)], ['meuble_chaise', 'bleu']);
  assertEqual(jouer('etage.deplacer', { de: b, vers: b }).ok, false, 'déjà là');
  // Annuler, geste par geste, du dernier au premier : la partie d'avant
  for (const inv of gestes.reverse()) assertEqual(defaire(s, inv), inv.length);
  assertEqual(empreintePartie(s), e0);
});
