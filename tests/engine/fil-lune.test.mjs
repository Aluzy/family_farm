/* ==========================================================================
   Tests du moteur : le fil de la lune (le récit, lot 10 ; js/engine/fil-lune.js, docs/recit/aventure.md).
   - les fragments : la note « É. » (Achille, proche), le journal de bord des premiers arrivants (leur barque, la
     nuit, la lanterne-tempête à la main), les relevés de Frida (son atelier, la deuxième fois), les pages du
     carnet du ciel de Maurice (son observatoire, la nuit, après deux nuits à regarder le ciel, une par phase) ;
   - l'observatoire : le jour, on le découvre ; la nuit, la longue-vue (une nuit comptée par jour) ;
   - la galerie : les fragments au carnet, une nuit de pleine lune, de 22 h à 4 h ; la fissure d'un niveau ;
     la petite chambre ; la pierre, une fois ; posée, tout pousse plus vite ; Frida doute, le carnet du ciel sait.
   Lancer seul : node tests/run-tests.mjs fil-lune.
   ========================================================================== */

import {
  awakeMsAtHour, BIOME, composeFamily, createNewGame, DATA, finishSetup, genererNiveau, planDuMonde, reglagesGrotte,
} from '../../js/engine/index.js';
import { addItem, countItem } from '../../js/engine/inventory.js';
import { equiper } from '../../js/engine/equipement.js';
import { heuresPousse } from '../../js/engine/crops.js';
import {
  aFait, ajouterFragment, ajouterRelation, foisFait, jouerScene, noterFait, recitDe, scenesPossibles, toucherLieu,
} from '../../js/engine/recit.js';
import {
  FIL, fermeLuit, filComplet, fissureDuNiveau, galerieOuverte, geodeLuit, niveauGalerie, poserPierre, prendrePierre, visiteObservatoire,
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

test('la note « É. » : Achille la donne à la calèche, une fois proche', () => {
  const s = partie();
  assertEqual(scenesPossibles(s, { lieu: 'caleche_ferme' }).includes('note_etoile'), false, 'pas encore proche');
  ajouterRelation(s, 'achille', DATA.RECIT.PALIERS[3]);
  assert(scenesPossibles(s, { lieu: 'caleche_ferme' }).includes('note_etoile'));
  assert(jouerScene(s, 'note_etoile', { lieu: 'caleche_ferme' }).ok);
  assert(recitDe(s).carnet.includes('note_etoile'));
});

test('le journal de bord : à la barque des premiers arrivants, la nuit, la lanterne-tempête à la main ; une fois', () => {
  const s = partie();
  a(s, 10, 23);
  assertEqual(toucherLieu(s, 'epave').fragment, null, 'sans lanterne');
  addItem(s, 'lanterne_tempete', 1);
  assert(equiper(s, s.famille.principal, 'lanterne_tempete').ok, 'elle se porte à la main');
  a(s, 10, 14);
  assertEqual(toucherLieu(s, 'epave').fragment, null, 'pas le jour');
  a(s, 10, 23);
  const r = toucherLieu(s, 'epave');
  assertEqual(r.fragment, 'journal_bord');
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

test('l\'observatoire : le jour, on le découvre ; la nuit, la longue-vue ; une page du ciel après deux nuits, une par phase', () => {
  const s = partie(), O = FIL.OBSERVATOIRE;
  a(s, PHASE.croissante, 14);
  const r0 = visiteObservatoire(s);
  assertEqual([r0.texte, r0.fragment], [O.JOUR, null], 'le jour');
  assert(aFait(s, 'lieu.cabane'), 'découvert');
  a(s, PHASE.croissante, 21);
  const r1 = visiteObservatoire(s);
  assert(O.ACCUEIL.includes(r1.texte) && r1.fragment === null, 'la première nuit');
  visiteObservatoire(s);
  assertEqual(foisFait(s, 'observatoire.nuit'), 1, 'une nuit par jour');
  // la deuxième nuit, à la lune croissante : la page vient
  a(s, PHASE.croissante + 1, 21);
  const r2 = visiteObservatoire(s);
  assertEqual(r2.fragment, 'ciel_croissante');
  assert(r2.texte.includes(DATA.RECIT.FRAGMENTS.ciel_croissante.texte));
  assertEqual(visiteObservatoire(s).fragment, null, 'une fois');
  a(s, PHASE.pleine, 14);
  assertEqual(visiteObservatoire(s).fragment, null, 'pas le jour');
  a(s, PHASE.pleine, 23);
  assertEqual(visiteObservatoire(s).fragment, 'ciel_pleine');
  a(s, PHASE.nouvelle, 2);
  assertEqual(visiteObservatoire(s).fragment, 'ciel_noire');
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

test('la pierre : prise une fois ; posée sur la ferme, tout pousse plus vite ; Frida doute, le carnet du ciel sait', () => {
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
  // Frida, dans son atelier ; une page cachée du carnet du ciel, à l'observatoire
  assert(scenesPossibles(s, { lieu: 'atelier' }).includes('frida_pierre'));
  a(s, PHASE.croissante, 14);
  assert(visiteObservatoire(s).texte.startsWith(FIL.OBSERVATOIRE.PIERRE));
  assertEqual(visiteObservatoire(s).texte.startsWith(FIL.OBSERVATOIRE.PIERRE), false, 'une fois');
});

test('l\'amas d\'améthyste (docs/gisements.md, lot 3) : dans la montagne la plus proche de la ferme ; la pierre, une nuit de pleine lune, les fragments au carnet', () => {
  // dans le plan : une case de montagne, loin de la ferme, la même pour la même graine
  for (const g of ['238913', 'empreinte-1', '7']) {
    const p = planDuMonde(g), geode = p.lieux.recit.find((l) => l.sorte === 'geode');
    assert(geode, `${g} : un amas d'améthyste`);
    assertEqual(p.biome[geode.case], BIOME.montagne, `${g} : en montagne`);
    assertEqual(planDuMonde(g).lieux.recit.find((l) => l.sorte === 'geode').case, geode.case, 'toujours le même');
  }
  const s = partie();
  a(s, PHASE.croissante, 14);
  assert(/améthyste/.test(toucherLieu(s, 'geode').texte), 'le jour : un grand amas');
  a(s, PHASE.pleine, 23);
  assert(geodeLuit(s), 'les nuits de pleine lune, il luit plus fort');
  assert(/lumière froide/.test(toucherLieu(s, 'geode').texte), 'sans les fragments : rien ne s\'ouvre');
  assertEqual(countItem(s, FIL.PIERRE.OBJET), 0);
  for (const f of FIL.FRAGMENTS) ajouterFragment(s, f);
  a(s, PHASE.pleine, 21);
  assertEqual(countItem(s, FIL.PIERRE.OBJET), 0, 'trop tôt');
  toucherLieu(s, 'geode');
  assertEqual(countItem(s, FIL.PIERRE.OBJET), 0, 'trop tôt : pas de pierre');
  a(s, PHASE.pleine, 23);
  assert(/pierre/.test(toucherLieu(s, 'geode').texte));
  assertEqual([countItem(s, FIL.PIERRE.OBJET), aFait(s, 'pierre.trouvee'), geodeLuit(s)], [1, true, false], 'la pierre, une fois ; l\'amas ne luit plus fort');
  toucherLieu(s, 'geode');
  assertEqual(countItem(s, FIL.PIERRE.OBJET), 1, 'une seule');
  assert(poserPierre(s).ok, 'elle se pose sur la ferme comme avant');
});
