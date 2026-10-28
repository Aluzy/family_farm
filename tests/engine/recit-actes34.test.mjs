/* ==========================================================================
   Tests du moteur : les actes III et IV du récit (docs/recit/aventure.md, lot 9).
   - l'enveloppe de Maurice : l'ouvrir la garde ; la porter à Odile (la toucher, l'enveloppe en poche) la
     donne : les toits abîmés sont réparés les nuits suivantes, et plus aucun ne s'abîme ;
   - l'usure des toits : à partir de l'acte III, toutes les USURE.NUITS nuits, au plus USURE.MAX par
     hameau ; réparer coûte USURE.REPARER et rend de la confiance au hameau ;
   - la seconde veillée : ses lignes selon ce que le joueur a fait ;
   - la voie et la fin (finAventure), puis la fête à Brumeval selon la fin, figée ensuite ; la cloche ;
   - les lettres : leurs conditions (chapitre, fait, apres) ; Adèle selon la fin ; Théo s'il part ;
   - l'arc de Théo : rencontrer, confier, parler à son père : apprenti d'Achille, l'atelier, ou il part ;
   - la tournée d'Achille : le cheval boite, passer aux Genêts et à Bois-Joli, puis la relève ;
   - la migration 63 → 64 : une partie qui avait les pièces du notaire a ouvert l'enveloppe ; une partie
     qui avait la lettre sans l'avoir ouverte reçoit l'enveloppe.
   Lancer seul : node tests/run-tests.mjs recit-actes34.
   ========================================================================== */

import {
  awakeMsAtHour, composeFamily, createNewGame, DATA, deliverMail, elementsSol, finishSetup, genererMonde, mailReceived,
  migrate, solDirect, STATE_VERSION,
} from '../../js/engine/index.js';
import { addItem, countItem } from '../../js/engine/inventory.js';
import { habitantsDe, peuplerHameau } from '../../js/engine/habitants.js';
import {
  acteEnCours, aFait, ajouterRelation, confiance, empreinteFerme, finAventure, jouerScene, noterFait, noterVisite,
  ouvrirEnveloppe, recitNuit, scenesPossibles,
} from '../../js/engine/recit.js';
import { reparerToit, toitsUses, USURE, usureNuit } from '../../js/engine/usure.js';
import { assert, assertEqual, test } from './aide.mjs';

const R = DATA.RECIT;
const PLEINE = (() => { let j = 1; for (const p of DATA.LUNE.PHASES) { if (p.id === 'pleine') return j; j += p.jours; } return 1; })();

// Une partie à l'acte `acte` (III : chapitre 5 et 25 nuits ; IV : chapitre 7 et 45 nuits), un soir de
// pleine lune, ses hameaux garantis découverts et peuplés (le monde tiré une fois, recopié ensuite).
let modele = null;
function partie(acte = 3, h = 20) {
  if (!modele) {
    const s = createNewGame(3);
    assert(composeFamily(s, { perso: 3, prenom: 'Léa', nom: 'Martin', compagnon: { perso: 4, prenom: 'Hugo' } }).ok && finishSetup(s).ok);
    const sol = solDirect(genererMonde(s.carte.graine).terrain);
    elementsSol(sol.ctx);
    const plans = sol.ctx.hameaux.plans.filter((p) => !p.batisse);
    s.monde.hameaux = {};
    for (const g of ['gue', 'bois_joli', 'genets', 'brumeval']) {
      const p = plans.find((x) => x.garanti === g);
      peuplerHameau(s, p);
      s.monde.hameaux[p.id] = { nom: p.nom, style: p.style, jour: 2 };
    }
    modele = JSON.stringify(s);
  }
  const s = JSON.parse(modele);
  s.campagne.chapitre = acte >= 4 ? 7 : acte === 3 ? 5 : 3;
  const nuits = acte >= 4 ? 45 : acte === 3 ? 25 : 10;
  let jour = PLEINE;
  while (jour - 1 < nuits) jour += DATA.LUNE.JOURS_MOIS;
  s.day = jour;
  s.awakeMs = awakeMsAtHour(h);
  s.nuitEnCours = null;
  noterFait(s, ['arrivee', 'achille.cle', 'odile.rencontre', 'veillee.1', 'odile.tutoie']);
  return s;
}
const idDe = (s, g) => Object.keys(habitantsDe(s)).find((id) => habitantsDe(s)[id].garanti === g);
const ici = (s, g, o = {}) => ({ lieu: g, hameau: idDe(s, g), ...o });
const qui = (r) => r.lignes.map((l) => l.qui);

test('la partie de test est aux actes voulus', () => {
  assertEqual([acteEnCours(partie(3)), acteEnCours(partie(4))], [3, 4]);
});

/* ---------- l'enveloppe ---------- */

test('l\'enveloppe : l\'ouvrir la garde, ses pièces une fois', () => {
  const s = partie();
  assertEqual(ouvrirEnveloppe(s).ok, false, 'sans enveloppe');
  addItem(s, R.ENVELOPPE.OBJET, 1);
  const p = s.pieces;
  assertEqual(ouvrirEnveloppe(s).pieces, R.ENVELOPPE.PIECES);
  assertEqual([s.pieces - p, countItem(s, R.ENVELOPPE.OBJET), aFait(s, 'enveloppe.ouverte')], [R.ENVELOPPE.PIECES, 0, true]);
});

test('l\'enveloppe : la porter à Odile (la toucher) la donne ; ses toits sont réparés les nuits suivantes', () => {
  const s = partie();
  const gue = ici(s, 'gue');
  assertEqual(scenesPossibles(s, { ...gue, touche: 'odile' }).includes('enveloppe_odile'), false, 'sans l\'enveloppe');
  addItem(s, R.ENVELOPPE.OBJET, 1);
  assertEqual(scenesPossibles(s, gue).includes('enveloppe_odile'), false, 'il faut toucher Odile');
  assertEqual(scenesPossibles(s, { ...gue, touche: 'odile' })[0], 'enveloppe_odile');
  // deux toits abîmés avant
  const bois = idDe(s, 'bois_joli');
  habitantsDe(s)[bois].usees = habitantsDe(s)[bois].foyers.slice(0, 2).map((f) => f.maison);
  const c = confiance(s, bois);
  const r = jouerScene(s, 'enveloppe_odile', { ...gue, touche: 'odile' });
  assert(r.ok, r.error);
  assertEqual(r.lignes.map((l) => l.texte).filter((t) => /vous a fait/.test(t)).length, 0, 'Odile tutoie');
  assertEqual([countItem(s, R.ENVELOPPE.OBJET), aFait(s, 'enveloppe.donnee'), confiance(s, bois) - c], [0, true, R.ENVELOPPE.CONFIANCE]);
  assertEqual(usureNuit(s).repare.hameau, bois);
  assertEqual(toitsUses(s, bois).length, 1);
  usureNuit(s);
  assertEqual(toitsUses(s, bois).length, 0);
  assertEqual(confiance(s, bois) - c, R.ENVELOPPE.CONFIANCE + 2 * USURE.ENVELOPPE_CONFIANCE);
  // plus aucun toit ne s'abîme
  for (let k = 0; k < 4 * USURE.NUITS; k++) { s.day += 1; assertEqual(usureNuit(s).use, null); }
});

/* ---------- l'usure des toits ---------- */

test('l\'usure : à partir de l\'acte III, un toit toutes les USURE.NUITS nuits, au plus USURE.MAX par hameau', () => {
  const t = partie(2);
  for (let k = 0; k < 3 * USURE.NUITS; k++) { t.day += 1; assertEqual(usureNuit(t).use, null, 'pas à l\'acte II'); }
  const s = partie(3);
  let uses = 0;
  for (let k = 0; k < 40 * USURE.NUITS; k++) {
    s.day += 1;
    const r = usureNuit(s);
    if (r.use) { uses++; assertEqual(s.day % USURE.NUITS, 0, 'une nuit sur USURE.NUITS'); }
  }
  const n = Object.keys(habitantsDe(s)).length;
  assertEqual(uses, n * USURE.MAX, 'tous les hameaux au plus haut, puis plus rien');
  for (const id of Object.keys(habitantsDe(s))) assertEqual(toitsUses(s, id).length, USURE.MAX);
  assert(aFait(s, 'toits.uses'));
  // une sauvegarde abîmée : une maison inconnue, un doublon
  const id = idDe(s, 'genets');
  habitantsDe(s)[id].usees.push('inconnue', habitantsDe(s)[id].usees[0]);
  assertEqual(toitsUses(s, id).length, USURE.MAX);
});

test('l\'usure : réparer coûte USURE.REPARER et rend de la confiance au hameau ; compté pour la fin', () => {
  const s = partie();
  const id = idDe(s, 'genets'), maison = habitantsDe(s)[id].foyers[1].maison;
  habitantsDe(s)[id].usees = [maison];
  s.inventaire = {};
  assertEqual(reparerToit(s, id, maison).ok, false, 'sans planches ni pierres');
  for (const [item, n] of Object.entries(USURE.REPARER)) addItem(s, item, n);
  const c = confiance(s, id), e = finAventure(s).entretien;
  assertEqual(reparerToit(s, id, habitantsDe(s)[id].foyers[2].maison).ok, false, 'un toit sain');
  const r = reparerToit(s, id, maison);
  assert(r.ok, r.error);
  assertEqual([toitsUses(s, id), confiance(s, id) - c, finAventure(s).entretien - e], [[], USURE.CONFIANCE, R.FINS.POIDS.toit]);
  for (const item of Object.keys(USURE.REPARER)) assertEqual(countItem(s, item), 0);
});

/* ---------- la seconde veillée ---------- */

test('la seconde veillée : au Gué, l\'acte III ouvert ; ses lignes selon ce que le joueur a fait', () => {
  const t = partie(2);
  assertEqual(scenesPossibles(t, ici(t, 'gue')).includes('veillee_2'), false, 'pas à l\'acte II');
  const s = partie(3);
  noterFait(s, ['promesse.toit_garance', 'enveloppe.donnee']);
  const r = jouerScene(s, 'veillee_2', ici(s, 'gue'));
  assert(r.ok, r.error);
  assertEqual(qui(r), ['odile', 'fernand', 'garance', 'odile', 'achille']);
  assert(r.lignes[2].texte.includes('toit'), 'Garance : son toit');
  assert(r.lignes[3].texte.includes('toits sont refaits'), 'Odile : les toits de l\'enveloppe');
  assert(aFait(s, 'veillee.2'));
  const u = partie(3);
  noterFait(u, ['enveloppe.ouverte', 'promesse.scie_bois_joli']);
  const r2 = jouerScene(u, 'veillee_2', ici(u, 'gue'));
  assertEqual(qui(r2), ['odile', 'fernand', 'basile', 'odile', 'achille']);
  assert(r2.lignes[3].texte.includes('gardée'));
});

/* ---------- la voie, la fin, la fête ---------- */

test('la fin : petite ou grande ferme, et ce que le joueur a rendu', () => {
  const s = partie(4);
  const f = finAventure(s);
  assertEqual([f.voie, f.fin], ['petite', 'voisin_tranquille']);
  // l'entretien : trois promesses et l'enveloppe donnée
  noterFait(s, ['promesse.toit_garance', 'promesse.scie_bois_joli', 'promesse.pompe_mouettes', 'enveloppe.donnee']);
  assertEqual(finAventure(s).entretien, 3 * R.FINS.POIDS.promesse + R.FINS.POIDS.enveloppe);
  assertEqual(finAventure(s).fin, 'nouveau_maurice');
  // une grande ferme : des machines (l'empreinte haute)
  s.blocs = s.blocs || {};
  let k = 900000;
  while (empreinteFerme(s).niveau !== 'haute') s.blocs[k++] = 'station_robot';
  assertEqual([finAventure(s).voie, finAventure(s).fin], ['grande', 'riche'], 'sans arbres plantés');
  s.foret = s.foret || {};
  s.foret.arbres = Array.from({ length: R.FINS.NATURE }, (_, i) => ({ id: `f${i}` }));
  while (empreinteFerme(s).niveau !== 'haute') s.blocs[k++] = 'station_robot';
  assertEqual(finAventure(s).fin, 'autrement');
  // figée à la fête
  noterFait(s, 'fin.riche');
  assertEqual(finAventure(s).fin, 'riche');
});

test('la fête : annoncée à la calèche (acte IV), à Brumeval une nuit de pleine lune, selon la fin ; la cloche', () => {
  const t = partie(3);
  assertEqual(scenesPossibles(t, { lieu: 'caleche_ferme' }).includes('fete_annonce'), false, 'pas avant l\'acte IV');
  const s = partie(4);
  assertEqual(scenesPossibles(s, ici(s, 'brumeval')).some((id) => id.startsWith('fete_')), false, 'pas avant l\'annonce');
  assert(jouerScene(s, 'fete_annonce', { lieu: 'caleche_ferme' }).ok);
  noterFait(s, ['promesse.toit_garance', 'promesse.scie_bois_joli', 'enveloppe.donnee']);
  assertEqual(scenesPossibles(s, ici(s, 'gue')).some((id) => id.startsWith('fete_')), false, 'pas au Gué');
  const possibles = scenesPossibles(s, ici(s, 'brumeval'));
  assertEqual(possibles.filter((id) => id.startsWith('fete_')), ['fete_nouveau_maurice'], 'une seule fête, celle de la fin');
  const r = jouerScene(s, 'fete_nouveau_maurice', ici(s, 'brumeval'));
  assertEqual(qui(r), ['odile', 'odile', 'odile', 'achille']);
  assert(r.lignes[3].texte.startsWith('Léa.'), '{prenom}');
  assertEqual([countItem(s, 'cloche_maurice'), aFait(s, 'fete'), aFait(s, 'fin.nouveau_maurice')], [1, true, true]);
  assertEqual(scenesPossibles(s, ici(s, 'brumeval')).some((id) => id.startsWith('fete_')), false, 'une seule fois');
  // la lettre d'Adèle de cette fin
  deliverMail(s);
  assert(mailReceived(s, 'adele_fete_maurice') && !mailReceived(s, 'adele_fete_riche'));
});

/* ---------- les lettres ---------- */

test('les lettres : le chapitre, un fait, des jours après ; Adèle et Théo', () => {
  const s = partie(3);
  deliverMail(s);
  assert(mailReceived(s, 'adele_recolte') && mailReceived(s, 'adele_veillee'), 'la récolte (chapitre 2), la veillée');
  assert(!mailReceived(s, 'adele_robot'), 'pas de robot');
  noterFait(s, 'machine.station_robot');
  deliverMail(s);
  assert(mailReceived(s, 'adele_robot'));
  noterFait(s, 'theo.part');
  deliverMail(s);
  assert(!mailReceived(s, 'theo_cadolon'), 'pas tout de suite');
  s.day += 5;
  deliverMail(s);
  assert(mailReceived(s, 'theo_cadolon'), 'cinq jours après');
});

test('la nuit note les machines posées (la lettre du robot)', () => {
  const s = partie(3);
  s.blocs = s.blocs || {};
  s.blocs[900001] = 'station_robot';
  recitNuit(s);
  assert(aFait(s, 'machine.station_robot'));
});

/* ---------- Théo ---------- */

test('Théo : le rencontrer, qu\'il se confie (acte III), puis parler à Basile : il part, l\'atelier, ou apprenti', () => {
  const base = partie(3);
  const bois = ici(base, 'bois_joli');
  assertEqual(scenesPossibles(base, bois).includes('theo_rencontre'), false, 'il faut le toucher');
  assertEqual(scenesPossibles(base, { ...bois, touche: 'theo' })[0], 'theo_rencontre');
  assert(jouerScene(base, 'theo_rencontre', { ...bois, touche: 'theo' }).ok);
  assertEqual(scenesPossibles(base, { ...bois, touche: 'theo' })[0], 'theo_confie');
  assert(jouerScene(base, 'theo_confie', { ...bois, touche: 'theo' }).ok);
  const choix = (prep) => {
    const s = JSON.parse(JSON.stringify(base));
    prep(s);
    const id = scenesPossibles(s, { ...bois, touche: 'basile' })[0];
    assert(jouerScene(s, id, { ...bois, touche: 'basile' }).ok);
    return { id, s };
  };
  const part = choix(() => {});
  assertEqual(part.id, 'basile_theo_part');
  // il quitte Bois-Joli la nuit d'après
  recitNuit(part.s);
  assert(aFait(part.s, 'theo.parti'));
  assert(!habitantsDe(part.s)[bois.hameau].foyers.some((f) => f.membres.some((m) => m.recit === 'theo')), 'Théo est parti');
  assertEqual(choix((s) => { s.blocs = { ...(s.blocs || {}), 900002: 'convoyeur' }; }).id, 'basile_theo_atelier');
  assertEqual(choix((s) => { s.blocs = { ...(s.blocs || {}), 900002: 'convoyeur' }; noterFait(s, 'achille.tournee'); }).id, 'basile_theo_apprenti');
});

/* ---------- la tournée d'Achille ---------- */

test('la tournée d\'Achille : le cheval boite ; passer aux Genêts et à Bois-Joli ; puis la relève', () => {
  const s = partie(3);
  assertEqual(scenesPossibles(s, { lieu: 'caleche_ferme' }).includes('achille_cheval'), false, 'Achille pas assez proche');
  ajouterRelation(s, 'achille', 30);
  assertEqual(scenesPossibles(s, { lieu: 'caleche_ferme' })[0], 'achille_cheval');
  // une visite avant la demande ne compte pas pour la tournée
  noterVisite(s, 'genets');
  assert(aFait(s, 'visite.genets') && !aFait(s, 'tournee.genets'));
  assert(jouerScene(s, 'achille_cheval', { lieu: 'caleche_ferme' }).ok);
  noterVisite(s, 'genets');
  assertEqual(scenesPossibles(s, { lieu: 'caleche_ferme' }).includes('achille_merci'), false, 'un seul hameau');
  noterVisite(s, 'brumeval');
  assert(!aFait(s, 'tournee.brumeval'), 'Brumeval n\'est pas sur la tournée');
  noterVisite(s, 'bois_joli');
  assertEqual(scenesPossibles(s, { lieu: 'caleche_ferme' })[0], 'achille_merci');
  assert(jouerScene(s, 'achille_merci', { lieu: 'caleche_ferme' }).ok);
  // la relève, à l'acte IV : personne (peu de hameaux), ou Théo apprenti
  s.campagne.chapitre = 7;
  s.day += 30;
  const t = JSON.parse(JSON.stringify(s));
  assertEqual(scenesPossibles(s, { lieu: 'caleche_ferme' }).filter((id) => id.startsWith('achille_releve')), ['achille_releve_personne']);
  noterFait(t, 'theo.apprenti');
  assertEqual(scenesPossibles(t, { lieu: 'caleche_ferme' }).filter((id) => id.startsWith('achille_releve'))[0], 'achille_releve_theo');
});

/* ---------- la migration 63 → 64 ---------- */

test('migration 63 → 64 : les pièces du notaire reçues, l\'enveloppe est ouverte ; la lettre non lue, l\'enveloppe arrive', () => {
  const s = partie(3);
  const avant = (verse) => {
    const v = JSON.parse(JSON.stringify(s));
    v.version = 63;
    v.courrier = [{ id: 'notaire_legs', nuit: 3, lu: verse, ...(verse ? { verse: true } : {}) }];
    delete v.recit;
    return migrate({ v: 63, t: 0, s: v });
  };
  const lue = avant(true);
  assertEqual([lue.version, aFait(lue, 'enveloppe.ouverte'), countItem(lue, R.ENVELOPPE.OBJET)], [STATE_VERSION, true, 0]);
  const pasLue = avant(false);
  assertEqual([aFait(pasLue, 'enveloppe.ouverte'), countItem(pasLue, R.ENVELOPPE.OBJET), pasLue.courrier[0].verse], [false, 1, true]);
  // les lettres d'Adèle dont le moment est passé : déjà lues (chapitre 5, la veillée faite)
  const ids = (m) => m.courrier.map((x) => [x.id, x.lu]);
  assertEqual(ids(lue), [['notaire_legs', true], ['adele_recolte', true]], 'pas de veillée notée (recit ôté)');
  // sans la lettre : rien
  const v = JSON.parse(JSON.stringify(s));
  v.version = 63; v.courrier = [];
  const sans = migrate({ v: 63, t: 0, s: v });
  assertEqual([aFait(sans, 'enveloppe.ouverte'), countItem(sans, R.ENVELOPPE.OBJET)], [false, 0]);
  assertEqual(ids(sans), [['adele_recolte', true], ['adele_veillee', true]], 'la veillée faite');
});
