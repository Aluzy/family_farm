/* ==========================================================================
   Tests du moteur : le fil de la lune (le récit, lot 10 ; js/engine/fil-lune.js, docs/recit/aventure.md).
   - les fragments : la note « J. » (Achille, proche), la page de bord (l'épave, la nuit, la lanterne-tempête
     à la main), les relevés de Frida (son atelier, la deuxième fois), les bribes de Johnny (la nuit, après
     trois repas, une par phase) ;
   - Johnny : il accueille ; un plat par jour est un repas ; tard les nuits de pleine lune, il n'est pas là ;
   - la galerie : les fragments au carnet, une nuit de pleine lune, de 22 h à 4 h ; la fissure d'un niveau ;
     la petite chambre ; la pierre, une fois ; posée, tout pousse plus vite ; Frida doute, Johnny sait.
   Lancer seul : node tests/run-tests.mjs fil-lune.
   ========================================================================== */

import {
  awakeMsAtHour, composeFamily, createNewGame, DATA, finishSetup, genererNiveau, reglagesGrotte,
} from '../../js/engine/index.js';
import { addItem, countItem } from '../../js/engine/inventory.js';
import { equiper } from '../../js/engine/equipement.js';
import { heuresPousse } from '../../js/engine/crops.js';
import {
  aFait, ajouterFragment, ajouterRelation, foisFait, jouerScene, noterFait, recitDe, scenesPossibles, toucherLieu,
} from '../../js/engine/recit.js';
import {
  FIL, fermeLuit, filComplet, fissureDuNiveau, galerieOuverte, niveauGalerie, poserPierre, prendrePierre, visiteJohnny,
} from '../../js/engine/fil-lune.js';
import { assert, assertEqual, test } from './aide.mjs';

// Le premier jour de chaque phase de lune.
const PHASE = (() => { const o = {}; let j = 1; for (const p of DATA.LUNE.PHASES) { o[p.id] = j; j += p.jours; } return o; })();

function partie() {
  const s = createNewGame(3);
  assert(composeFamily(s, { perso: 3, prenom: 'Léa', nom: 'Martin', compagnon: { perso: 4, prenom: 'Hugo' } }).ok && finishSetup(s).ok);
  s.campagne.chapitre = 5;
  noterFait(s, ['arrivee', 'achille.cle', 'odile.rencontre', 'veillee.1', 'odile.tutoie', 'maurice.fortune', 'frida.rencontre']);
  return s;
}
// L'heure h du jour j : le jour (6 h à 22 h) ou la nuit (22 h à 6 h).
function a(s, jour, h) {
  s.day = jour;
  if (h >= DATA.TEMPS.HEURE_REVEIL && h < DATA.TEMPS.HEURE_NUIT) { s.awakeMs = awakeMsAtHour(h); s.nuitEnCours = null; }
  else s.nuitEnCours = { ms: ((h - DATA.TEMPS.HEURE_NUIT + 24) % 24) * DATA.TEMPS.SECONDES_PAR_HEURE * 1000, minuit: h < DATA.TEMPS.HEURE_NUIT, dort: false };
  return s;
}
const plat = Object.keys(DATA.OBJETS).find((id) => DATA.OBJETS[id].plat && !DATA.OBJETS[id].retire);

test('la note « J. » : Achille la donne à la calèche, une fois proche', () => {
  const s = partie();
  assertEqual(scenesPossibles(s, { lieu: 'caleche_ferme' }).includes('note_j'), false, 'pas encore proche');
  ajouterRelation(s, 'achille', DATA.RECIT.PALIERS[3]);
  assert(scenesPossibles(s, { lieu: 'caleche_ferme' }).includes('note_j'));
  assert(jouerScene(s, 'note_j', { lieu: 'caleche_ferme' }).ok);
  assert(recitDe(s).carnet.includes('note_j'));
});

test('la page de bord : à l\'épave, la nuit, la lanterne-tempête à la main ; une fois', () => {
  const s = partie();
  a(s, 10, 23);
  assertEqual(toucherLieu(s, 'epave').fragment, null, 'sans lanterne');
  addItem(s, 'lanterne_tempete', 1);
  assert(equiper(s, s.famille.principal, 'lanterne_tempete').ok, 'elle se porte à la main');
  a(s, 10, 14);
  assertEqual(toucherLieu(s, 'epave').fragment, null, 'pas le jour');
  a(s, 10, 23);
  const r = toucherLieu(s, 'epave');
  assertEqual(r.fragment, 'page_bord');
  assert(/lanterne/.test(r.texte), r.texte);
  assertEqual(toucherLieu(s, 'epave').fragment, null, 'une fois');
  assert(DATA.ATELIER.RECETTES.lanterne_tempete, 'elle se fabrique à l\'Atelier');
});

test('les relevés de Frida : dans son atelier, la deuxième fois, Frida rencontrée', () => {
  const s = partie();
  assertEqual(scenesPossibles(s, { lieu: 'atelier' }).includes('frida_releves'), false, 'la première fois, elle n\'y est pas');
  toucherLieu(s, 'atelier');
  assertEqual(scenesPossibles(s, { lieu: 'atelier' })[0], 'frida_releves');
  assert(jouerScene(s, 'frida_releves', { lieu: 'atelier' }).ok);
  assert(recitDe(s).carnet.includes('releves_frida'));
});

test('Johnny : il accueille ; un repas par jour ; ses bribes la nuit après trois repas, une par phase', () => {
  const s = partie();
  a(s, PHASE.croissante, 14);
  const r0 = visiteJohnny(s);
  assertEqual([r0.absent, r0.repas, r0.fragment], [false, null, null]);
  assert(FIL.JOHNNY.ACCUEIL.includes(r0.texte), 'son accueil');
  addItem(s, plat, 4);
  for (let k = 0; k < 2; k++) {
    a(s, PHASE.croissante + k, 21);
    const r = visiteJohnny(s);
    assertEqual([r.repas, r.fragment], [plat, null], `repas ${k + 1}`);
    assertEqual(visiteJohnny(s).repas, null, 'un seul par jour');
  }
  assertEqual(foisFait(s, 'johnny.repas'), 2);
  // le troisième repas, la nuit, à la lune croissante : la bribe vient
  a(s, PHASE.croissante + 2, 21);
  const r3 = visiteJohnny(s);
  assertEqual([r3.repas, r3.fragment], [plat, 'johnny_croissante']);
  assert(r3.texte.includes(DATA.RECIT.FRAGMENTS.johnny_croissante.texte));
  assertEqual(countItem(s, plat), 1);
  // le jour, pas de bribe ; à la pleine lune, tard, il est dehors
  a(s, PHASE.pleine, 14);
  assertEqual(visiteJohnny(s).fragment, null, 'pas le jour');
  a(s, PHASE.pleine, 23);
  assert(visiteJohnny(s).absent, 'dehors');
  a(s, PHASE.pleine, 21);
  assertEqual(visiteJohnny(s).fragment, 'johnny_pleine');
  a(s, PHASE.nouvelle, 2);
  assertEqual(visiteJohnny(s).fragment, 'johnny_noire');
  assert(aFait(s, 'lieu.cabane'));
});

test('la galerie : les fragments, une nuit de pleine lune, de 22 h à 4 h', () => {
  const s = partie();
  a(s, PHASE.pleine, 23);
  assertEqual(galerieOuverte(s), false, 'sans les fragments');
  for (const f of FIL.FRAGMENTS) ajouterFragment(s, f);
  assert(filComplet(s));
  assert(galerieOuverte(s));
  a(s, PHASE.pleine, 21);
  assertEqual(galerieOuverte(s), false, 'trop tôt');
  a(s, PHASE.pleine, 3);
  assert(galerieOuverte(s), 'après minuit');
  a(s, PHASE.pleine + DATA.LUNE.PHASES.find((p) => p.id === 'pleine').jours, 23);
  assertEqual(galerieOuverte(s), false, 'pas un autre soir');
});

test('la fissure : un mur de face, du sol dessous, loin de l\'échelle ; la même pour le même niveau', () => {
  const J = reglagesGrotte('ferme');
  for (const jour of [1, 7, 40]) {
    const c = genererNiveau(J, FIL.GALERIE.NIVEAU, jour), f = fissureDuNiveau(c);
    assert(f, `jour ${jour} : une fissure`);
    assert(!c.sol(f.x, f.y) && c.sol(f.x, f.y + 1) && c.sol(f.x, f.y + 2), `jour ${jour} : sur une paroi`);
    assert(Math.abs(f.x - c.echelle.x) + Math.abs(f.y - c.echelle.y) >= 6, 'loin de l\'échelle');
    assertEqual(fissureDuNiveau(genererNiveau(J, FIL.GALERIE.NIVEAU, jour)), f);
  }
  // la petite chambre : on arrive sous la fissure ; ses objets dans la salle, les gravures sur la paroi
  const g = niveauGalerie();
  assert(g.galerie && g.sol(g.echelle.x, g.echelle.y) && g.sol(g.echelle.x, g.echelle.y + 1) && !g.sol(g.echelle.x, g.echelle.y - 1));
  const O = g.objets;
  assert(g.sol(O.couverture.x, O.couverture.y) && g.sol(O.tasse.x, O.tasse.y) && g.sol(O.pierre.x, O.pierre.y) && !g.sol(O.gravures.x, O.gravures.y));
  assertEqual(g.retour, FIL.GALERIE.NIVEAU);
});

test('la pierre : prise une fois ; posée sur la ferme, tout pousse plus vite ; Frida doute, Johnny sait', () => {
  const s = partie();
  assertEqual(prendrePierre(s).ok, false, 'sans les fragments');
  for (const f of FIL.FRAGMENTS) ajouterFragment(s, f);
  assert(prendrePierre(s).ok);
  assertEqual([countItem(s, FIL.PIERRE.OBJET), prendrePierre(s).ok], [1, false]);
  assertEqual(heuresPousse(s), DATA.TEMPS.POUSSE_HEURES);
  assert(poserPierre(s).ok);
  assertEqual([countItem(s, FIL.PIERRE.OBJET), heuresPousse(s), poserPierre(s).ok], [0, DATA.TEMPS.POUSSE_HEURES * FIL.PIERRE.POUSSE, false]);
  // la ferme luit, la nuit de pleine lune
  a(s, PHASE.pleine, 23);
  assert(fermeLuit(s));
  a(s, PHASE.pleine, 14);
  assertEqual(fermeLuit(s), false, 'pas le jour');
  // Frida, dans son atelier ; Johnny, à la visite suivante
  assert(scenesPossibles(s, { lieu: 'atelier' }).includes('frida_pierre'));
  a(s, PHASE.croissante, 14);
  assert(visiteJohnny(s).texte.startsWith(FIL.JOHNNY.PIERRE));
  assertEqual(visiteJohnny(s).texte.startsWith(FIL.JOHNNY.PIERRE), false, 'une fois');
});
