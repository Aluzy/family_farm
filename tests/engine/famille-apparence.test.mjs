/* ==========================================================================
   Tests de l'apparence à lui d'un membre (chantier « couches », étape E6 : docs/personnage-couches.md) :
   member.apparence = { identite, tenue }, validée (validApparence), posée et retirée par setMemberProfile,
   gardée par la sauvegarde ; sans elle, le personnage du catalogue (memberPerso) reste.
   Lancer seul : node --test tests/engine/famille-apparence.test.mjs
   ========================================================================== */

import { readFileSync } from 'node:fs';
import { assert, assertEqual, test } from './aide.mjs';
import {
  composeFamily, createInitialState, createNewGame, DATA, findMember, memberApparence, memberPerso, migrate, setMemberProfile, validApparence,
} from '../../js/engine/index.js';

const CAT = JSON.parse(readFileSync(new URL('../../assets/personnages/catalogue.json', import.meta.url), 'utf8'));
const RETOUCHES = ['perso_01', 'perso_02', 'perso_03'];
const app = (nom) => ({ identite: CAT.personnages[nom].identite, tenue: CAT.personnages[nom].tenue });

test('apparence : les choix proposés sont ceux du catalogue', () => {
  const A = DATA.FAMILLE.PROFIL.APPARENCE, P = CAT.palettes;
  const memes = (a, b, quoi) => assertEqual([...Object.keys(a)].sort(), [...Object.keys(b)].sort(), quoi);
  memes(A.PEAU, P.peau, 'peaux'); memes(A.YEUX, P.yeux, 'yeux'); memes(A.CHEVEUX, P.cheveux, 'cheveux');
  memes(A.TISSU, P.tissus, 'tissus'); memes(A.BAS, P.bas, 'bas'); memes(A.ACCESSOIRE, P.accessoires, 'accessoires');
  for (const c of A.COUPE_PROPOSEE.enfant) assert(A.COUPE.enfant[c], c);
  // (chaque personnage du catalogue tiré de ses données est une apparence valide, telle quelle)
  for (const [nom, p] of Object.entries(CAT.personnages)) {
    if (RETOUCHES.includes(nom)) continue;
    assertEqual(validApparence(app(nom), p.age === 'enfant'), app(nom), nom);
  }
});

test('apparence : posée, refusée, retirée, gardée par la sauvegarde', () => {
  const s = createInitialState(3);
  const adulte = s.famille.membres.find((m) => !m.enfant), enfant = s.famille.membres.find((m) => m.enfant);
  const perso = memberPerso(adulte);
  assertEqual(memberApparence(adulte), null, 'sans apparence au départ');
  // une apparence d'adulte (celle de perso_12) pour l'adulte
  assert(setMemberProfile(s, adulte.id, { apparence: app('perso_12') }).ok);
  assertEqual(memberApparence(findMember(s, adulte.id)), app('perso_12'));
  assertEqual(memberPerso(findMember(s, adulte.id)), perso, 'son personnage du catalogue reste (le repli)');
  // refusées : une barbe pour un enfant, une coupe d'adulte pour un enfant, un nom inconnu, un champ en trop ignoré
  assertEqual(setMemberProfile(s, enfant.id, { apparence: app('perso_12') }).error, 'Apparence inconnue.');
  const a = app('enfant_05');
  assert(setMemberProfile(s, enfant.id, { apparence: { ...a, identite: { ...a.identite, peau: 'bleue' } } }).error);
  assert(setMemberProfile(s, enfant.id, { apparence: { ...a, identite: { ...a.identite, triche: 1 } } }).ok);
  assertEqual(findMember(s, enfant.id).apparence.identite.triche, undefined, 'une copie propre');
  // la sauvegarde (JSON) et la migration la gardent
  const relu = migrate(JSON.parse(JSON.stringify(s)));
  assertEqual(memberApparence(findMember(relu, adulte.id)), app('perso_12'));
  // un autre champ du profil ne la touche pas ; null la retire
  assert(setMemberProfile(s, adulte.id, { prenom: 'Lou' }).ok);
  assert(memberApparence(findMember(s, adulte.id)));
  assert(setMemberProfile(s, adulte.id, { apparence: null }).ok);
  assertEqual(findMember(s, adulte.id).apparence, undefined);
  // une apparence abîmée (une ancienne version, une main) : ignorée, le personnage du catalogue reprend
  findMember(s, adulte.id).apparence = { identite: { peau: 'claire' } };
  assertEqual(memberApparence(findMember(s, adulte.id)), null);
});

test('apparence : choisie à l\'accueil d\'une nouvelle partie (composeFamily)', () => {
  const s = createNewGame(4);
  const choix = { perso: 3, prenom: 'Léa', nom: 'Martin', apparence: app('perso_12'), compagnon: { perso: 7, prenom: 'Hugo' }, enfants: [{ prenom: 'Zoé', perso: 2, apparence: app('enfant_05') }] };
  // refusées, et rien ne change : une apparence d'adulte pour un enfant, une apparence abîmée
  assertEqual(composeFamily(s, { ...choix, enfants: [{ prenom: 'Zoé', apparence: app('perso_12') }] }).error, 'Apparence inconnue.');
  assertEqual(composeFamily(s, { ...choix, compagnon: { perso: 7, prenom: 'Hugo', apparence: { identite: {} } } }).error, 'Apparence inconnue.');
  assertEqual(s.famille.membres.length, 4, 'rien n\'a changé après un refus');
  assert(composeFamily(s, choix).ok);
  const [lea, hugo, zoe] = s.famille.membres;
  assertEqual([memberApparence(lea), memberApparence(hugo), memberApparence(zoe)], [app('perso_12'), null, app('enfant_05')]);
  assertEqual([memberPerso(lea), memberPerso(zoe)], [3, 2], 'son personnage du catalogue reste (le repli)');
});
