/* ==========================================================================
   Tests du moteur : la finition du grand monde (fiche 9b).
   - le didacticiel : ses étapes du grand monde (la carte, la sortie de la ferme, une prise dans le
     monde, la calèche, le hameau choisi pour la boussole, puis atteint), chacune validée par
     l'action réelle, chacune passable ; une partie d'avant (v58) sur l'ancienne bulle de fin les
     reprend, une partie plus tôt ou finie ne bouge pas ;
   - la campagne : chaque objectif du grand monde se joue avec les actions du moteur (vendre à la
     calèche, découvrir des hameaux, voir le monde, entrer dans une grotte de la montagne, pêcher en
     mer, acheter aux hameaux, voir des bêtes), et le joueur automatique fait les siens ;
   - la migration v58 → v59 ;
   - la chasse aux restes : aucun texte du jeu (données, encyclopédie, chaînes de l'interface, pages)
     ne parle de ce qui a disparu au grand ménage (la ville, le Marché, le train…), sauf les
     exceptions écrites ici ; aucune page de l'encyclopédie ne se découvre par un objet retiré.
   Lancer seul : node --test tests/engine/finition.test.mjs (ou node tests/run-tests.mjs finition).
   ========================================================================== */

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  absoluteHours, addItem, castLine, CATEGORIES, chapterProgress, choisirBut, createInitialState, DATA, elementsSol, ETAPES,
  ETAPES_MONDE, etapeDidacticiel, farmSeed, farmTerrain, genererMonde, hameauxVus, majDidacticiel, migrate,
  noterEncyclopedie, objectifDidacticiel, objectiveValue, objetsDeRegion, passerDidacticiel, passerEtapeDidacticiel,
  peuplerHameau, recolterMonde, rencontreCaleche, solDirect, STATE_VERSION, suivantDidacticiel, testGoToChapter,
  testSetLevel, voirAutour, voirHameau,
} from '../../js/engine/index.js';
import {
  acheterCaleche, CALECHE, etatCaleche, majCaleche, tourneeDuMonde, vendreCaleche,
} from '../../js/engine/caleche.js';
import { botMonde } from '../../js/engine/bot.js';
import { assert, assertEqual, mondeFait, partie, test, tireless } from './aide.mjs';

const RACINE = join(fileURLToPath(new URL('.', import.meta.url)), '..', '..');
const copie = (x) => JSON.parse(JSON.stringify(x));
// L'heure `h` du jour en cours (l'éveil commence à HEURE_REVEIL).
const aLHeure = (s, h) => { s.awakeMs = Math.round((h - DATA.TEMPS.HEURE_REVEIL) * DATA.TEMPS.SECONDES_PAR_HEURE * 1000); return s; };

// Le monde de la partie, comme le Worker le donne à la page : la tournée de la calèche (posée dans le
// moteur), les plans des hameaux, les lieux.
function mondeDe(s) {
  const T = farmTerrain(s), sol = solDirect(T), el = elementsSol(sol.ctx);
  return { T, sol, tour: tourneeDuMonde(farmSeed(s)), plans: sol.ctx.hameaux.plans, lieux: el.lieux, W: T.LARGEUR, sortie: T.MONDE.cadre.SORTIE };
}
// Une pièce du monde qui se prend (`gestes`), la plus proche de la sortie de la ferme.
function pieceProche(m, gestes) {
  const N = 64, sx = (m.sortie % m.W) / N, sy = Math.floor(m.sortie / m.W) / N;
  const regions = [];
  for (let ry = 0; ry * N < m.T.HAUTEUR; ry++) for (let rx = 0; rx * N < m.W; rx++) regions.push([rx, ry]);
  regions.sort((a, b) => Math.hypot(a[0] + 0.5 - sx, a[1] + 0.5 - sy) - Math.hypot(b[0] + 0.5 - sx, b[1] + 0.5 - sy));
  for (const [rx, ry] of regions.slice(0, 6)) {
    for (const o of objetsDeRegion(m.sol.region(rx, ry))) {
      const r = DATA.RECOLTE.SORTES[o.nom];
      if (r && gestes.includes(r.geste)) return o;
    }
  }
  throw new Error('aucune pièce à prendre près de la ferme');
}
// Une partie au début des étapes du grand monde du didacticiel, au niveau `niveau`.
function auMonde(niveau = 1) {
  const s = tireless(partie(1));
  testSetLevel(s, niveau);
  s.didacticiel = { etape: ETAPES.indexOf('carte'), fini: false, graines: true };
  return s;
}

/* ---------- le didacticiel : les étapes du grand monde ---------- */

test('didacticiel : après l\'arrosage, la carte, la sortie, une prise, la calèche, le hameau choisi, puis atteint', () => {
  assertEqual(ETAPES.slice(ETAPES.indexOf('arroser')), ['arroser', ...ETAPES_MONDE, 'fin']);
  const s = auMonde(1), m = mondeDe(s);
  // la carte du monde : l'interface valide l'étape quand elle s'ouvre (une étape « à lire »)
  assertEqual([etapeDidacticiel(s), objectifDidacticiel(s)], ['carte', null]);
  assert(suivantDidacticiel(s, 'carte').ok);
  // la sortie : le personnage hors de la ferme
  assertEqual(etapeDidacticiel(s), 'sortie');
  const F = m.T.FERME;
  s.monde.ici = (F.Y + 10) * m.W + F.X + 10;
  assertEqual([majDidacticiel(s), objectifDidacticiel(s).compteurs], [false, [{ objet: 'sortie', n: 0, besoin: 1 }]], 'sur la ferme : pas encore');
  s.monde.ici = m.sortie;
  assert(majDidacticiel(s));
  // une prise dans le monde (la hache sur un arbre, ou la main)
  assertEqual(etapeDidacticiel(s), 'recolte_monde');
  s.outils = { ...(s.outils || {}), hache: true, pioche: true, faux: true };
  const o = pieceProche(m, ['couper', 'casser', 'ramasser', 'cueillir']);
  const r = recolterMonde(s, o.id, { variante: o.variante });
  assert(r.ok, r.error);
  majDidacticiel(s);
  // la calèche : avant le niveau du Marché, on la rencontre (arrêtée devant la ferme à FERME h)
  assertEqual(etapeDidacticiel(s), 'caleche');
  assertEqual(objectifDidacticiel(s).compteurs, [{ objet: 'cocher', n: 0, besoin: 1 }]);
  aLHeure(s, CALECHE.FERME - 2);
  assertEqual(rencontreCaleche(s, m.sortie), false, 'avant son passage : elle n\'est pas là');
  aLHeure(s, CALECHE.FERME + 0.2);
  const e = etatCaleche(m.tour, absoluteHours(s), []);
  assertEqual([e.etat, e.arret.sorte], ['arret', 'ferme']);
  const devant = Math.floor(e.y) * m.W + Math.floor(e.x);
  assertEqual(rencontreCaleche(s, devant + 40), false, 'trop loin d\'elle');
  assert(rencontreCaleche(s, devant), 'rencontrée devant la ferme');
  majDidacticiel(s);
  // le hameau : choisi sur la carte du monde (il faut qu'il soit vu : le cocher l'a montré)
  assertEqual(etapeDidacticiel(s), 'hameau_choisir');
  const h = m.lieux.hameaux[0];
  assertEqual(choisirBut(s, { sorte: 'hameau', id: h.id }, m.lieux).ok, false, 'pas encore vu');
  voirAutour(s, h.case);
  assert(choisirBut(s, { sorte: 'hameau', id: h.id }, m.lieux).ok);
  majDidacticiel(s);
  // puis atteint (la carte le dit au moteur en y entrant)
  assertEqual([etapeDidacticiel(s), s.didacticiel.but], ['hameau_aller', h.id]);
  assertEqual(majDidacticiel(s), false);
  voirHameau(s, m.plans.find((p) => p.id === h.id));
  majDidacticiel(s);
  assertEqual(etapeDidacticiel(s), 'fin');
  assert(suivantDidacticiel(s).ok);
  assertEqual(etapeDidacticiel(s), null, 'fini');
});

test('didacticiel : au niveau du Marché, l\'étape de la calèche demande une vente ; chaque étape du monde se passe', () => {
  const s = auMonde(DATA.NIVEAUX.SEUILS.length), m = mondeDe(s);
  s.didacticiel.etape = ETAPES.indexOf('caleche');
  s.didacticiel.ventes = s.campagne.compteurs.calecheVentes;
  assertEqual(objectifDidacticiel(s).compteurs, [{ objet: 'vente', n: 0, besoin: 1 }]);
  aLHeure(s, CALECHE.FERME + 0.2);
  const e = etatCaleche(m.tour, absoluteHours(s), []), devant = Math.floor(e.y) * m.W + Math.floor(e.x);
  assertEqual(rencontreCaleche(s, devant) && majDidacticiel(s), false, 'la rencontrer ne suffit plus');
  addItem(s, 'carotte', 3);
  assert(vendreCaleche(s, 'carotte', 3, devant).ok, 'une vente à la calèche');
  majDidacticiel(s);
  assertEqual(etapeDidacticiel(s), 'hameau_choisir');
  // chacune se passe, une à une ; pas celles de la ferme
  for (const etape of ['hameau_choisir', 'hameau_aller']) {
    assertEqual(etapeDidacticiel(s), etape);
    assert(passerEtapeDidacticiel(s).ok);
  }
  assertEqual(etapeDidacticiel(s), 'fin');
  assertEqual(passerEtapeDidacticiel(s).ok, false, 'la fin se lit');
  const t = auMonde(1);
  t.didacticiel.etape = ETAPES.indexOf('labour');
  assertEqual(passerEtapeDidacticiel(t).ok, false, 'une étape de la ferme ne se passe pas');
  assert(passerDidacticiel(t).ok, 'le didacticiel entier, oui');
});

/* ---------- la migration v58 → v59 ---------- */

test('migration v58 → v59 : les compteurs du monde à zéro ; le didacticiel continue sans se perdre', () => {
  const vieille = (didacticiel) => {
    const s = createInitialState(3);
    for (const k of ['calecheVentes', 'achatsHameaux', 'pecheMer']) delete s.campagne.compteurs[k];
    return { v: 58, t: 0, s: { ...copie(s), version: 58, didacticiel } };
  };
  const finAvant = 25;   // (l'indice de « fin » au format 58)
  const a = migrate(vieille({ etape: finAvant, fini: false }));
  assertEqual(a.version, STATE_VERSION);
  assertEqual([a.campagne.compteurs.calecheVentes, a.campagne.compteurs.achatsHameaux, a.campagne.compteurs.pecheMer], [0, 0, 0]);
  assertEqual(ETAPES[a.didacticiel.etape], 'carte', 'sur l\'ancienne bulle de fin : la suite, le grand monde');
  const b = migrate(vieille({ etape: ETAPES.indexOf('semis'), fini: false }));
  assertEqual(ETAPES[b.didacticiel.etape], 'semis', 'plus tôt : la même étape');
  const c = migrate(vieille({ etape: finAvant, fini: true }));
  assertEqual([c.didacticiel.fini, etapeDidacticiel(c)], [true, null], 'fini : rien ne change');
  const d = migrate({ v: 58, t: 0, s: { ...copie(createInitialState(3)), version: 58 } });
  assertEqual(migrate({ v: STATE_VERSION, t: 0, s: copie(d) }), d, 'une seconde migration ne change rien');
});

/* ---------- la campagne : les objectifs du grand monde, joués ---------- */

test('campagne : chaque objectif du grand monde se joue avec les actions du moteur', () => {
  const s = tireless(partie(1)), m = mondeDe(s);
  testSetLevel(s, 5);
  const val = (type) => objectiveValue(s, { type });
  // vendre à la calèche (elle est arrêtée devant la ferme)
  aLHeure(s, CALECHE.FERME + 0.2);
  const e = etatCaleche(m.tour, absoluteHours(s), []), devant = Math.floor(e.y) * m.W + Math.floor(e.x);
  assertEqual(val('caleche'), 0);
  addItem(s, 'carotte', 40);
  assert(vendreCaleche(s, 'carotte', 40, devant).ok);
  assert(val('caleche') > 0, 'des pièces gagnées à la calèche');
  // découvrir des hameaux, voir le monde : marcher le long du chemin de la calèche
  const vu0 = val('monde');
  for (let k = 0; k < m.tour.x.length; k += 4) voirAutour(s, Math.floor(m.tour.y[k]) * m.W + Math.floor(m.tour.x[k]));
  for (const p of m.plans) { voirHameau(s, p); peuplerHameau(s, p); }
  assertEqual(val('hameaux'), m.plans.length);
  assert(val('hameaux') >= 5, `${val('hameaux')} hameaux (il en faut 5 au chapitre 7)`);
  assert(val('monde') >= 15 && val('monde') > vu0, `le tour du monde par les chemins : ${val('monde')} % vu`);
  // une grotte de la montagne (la page le note en y entrant : excursion.js)
  assertEqual(val('grotteMonde'), 0);
  noterEncyclopedie(s, 'carte:grotte_monde');
  assertEqual(val('grotteMonde'), 1);
  // pêcher dans la mer, la canne en main
  s.outils = { ...(s.outils || {}), canne: true };
  for (let k = 0; k < 40 && val('pecheMer') < 1; k++) castLine(s, 'mer');
  assertEqual(val('pecheMer'), 1, 'un poisson de mer');
  // acheter aux hameaux : la calèche achète leur réserve en route, puis la revend à la ferme
  for (const id of Object.keys(s.monde.habitants)) s.monde.habitants[id].reserve = { bois: 30, pierre: 30 };
  aLHeure(s, 23);
  majCaleche(s);
  s.day += 1;
  aLHeure(s, CALECHE.FERME + 0.2);
  majCaleche(s);
  const coffre = Object.keys(s.caleche.coffre);
  assert(coffre.length > 0, 'son coffre porte ce des hameaux');
  s.pieces = 5000;
  assert(acheterCaleche(s, coffre[0], 5, devant).ok);
  assertEqual(val('achatsHameaux'), 5);
  // voir des bêtes (la carte le note la première fois qu'on en voit une : faune-monde.js)
  for (const b of Object.keys(DATA.FAUNE.ESPECES).slice(0, 6)) noterEncyclopedie(s, 'faune:' + b);
  assertEqual(val('faune'), 6);
  // tous les chapitres : leurs objectifs du monde sont remplis
  for (let ch = 2; ch <= 7; ch++) {
    const p = chapterProgress(s, ch).objectifs.filter((o) => ['caleche', 'hameaux', 'monde', 'grotteMonde', 'pecheMer', 'achatsHameaux', 'faune'].includes(o.type));
    assert(p.length > 0 && p.every((o) => o.ok), `chapitre ${ch} : ${JSON.stringify(p.map((o) => [o.type, o.valeur, o.cible]))}`);
  }
});

test('campagne : le joueur automatique fait ses objectifs du monde (hameaux, monde vu, grotte, mer)', () => {
  const s = tireless(partie(1));
  for (const ch of [3, 4, 5, 7]) {
    testGoToChapter(s, ch);
    const avant = s.campagne.chapitre;
    for (let jour = 0; jour < 12; jour++) botMonde(s);
    const reste = chapterProgress(s, avant).objectifs.filter((o) => ['hameaux', 'monde', 'grotteMonde', 'pecheMer'].includes(o.type) && !o.ok);
    assertEqual(reste.map((o) => o.type), [], `chapitre ${ch}`);
  }
  // (la vente à la calèche du chapitre 2 et les chapitres atteints : tests/engine/bot.test.mjs)
  const t = tireless(partie(2));
  testGoToChapter(t, 3);
  mondeFait(t);
  assertEqual(botMonde(t), false, 'rien à faire dans le monde : il n\'y va pas');
});

/* ---------- la chasse aux restes ---------- */

// Ce qui a disparu au grand ménage (docs/grand-monde.md, étape 1) et l'ancien Marché : ces mots ne
// doivent plus paraître dans ce que lit le joueur.
const RESTES = /(^|[^\p{L}])(marchés?|villes?|trains?|gares?|navettes?|bus|écoles?|écoliers?|livreurs?|entreprises?|infra-monde|tronc creux|boutiques?|immeubles?|citadins?)(?![\p{L}])/iu;
// Les exceptions, écrites : [fichier, morceau du texte].
const EXCEPTIONS = [
  // « en train de » : un moulin en train de moudre ; la calèche « se gare » (« marche », sans accent,
  // n'est jamais pris : marcher, en marche)
  [null, /en train d/i],
  [null, /se gare/i],
  // un objet retiré (« retire » : il ne s'obtient plus, une ancienne partie peut l'avoir encore)
  ['data/items.json', /^Morceau d'arbre de l'infra-monde$/],
];
const exception = (fichier, texte) => EXCEPTIONS.some(([f, re]) => (!f || f === fichier) && re.test(texte));
const reste = (texte) => {
  const t = String(texte);
  const m = RESTES.exec(t);
  return m ? m[2] : null;
};

// Les chaînes d'un fichier JavaScript (hors commentaires) ; celles d'une page HTML (son texte, hors
// styles, scripts et commentaires). Les identifiants (sans espace ni majuscule) n'en sont pas.
function textesDe(fichier) {
  let src = readFileSync(join(RACINE, fichier), 'utf8');
  if (fichier.endsWith('.html')) {
    src = src.replace(/<style[\s\S]*?<\/style>|<script[\s\S]*?<\/script>|<!--[\s\S]*?-->/g, ' ');
    return src.replace(/<[^>]*>/g, '\n').split('\n').map((l) => l.trim()).filter(Boolean);
  }
  src = src.replace(/\/\*[\s\S]*?\*\//g, ' ');
  const out = [];
  for (const ligne of src.split('\n')) {
    const l = ligne.replace(/^\s*\/\/.*$/, '').replace(/\s\/\/\s.*$/, '');
    for (const s of l.match(/'(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*"|`(?:[^`\\]|\\.)*`/g) || []) {
      const t = s.slice(1, -1);
      if (/^[\w./:#-]*$/.test(t)) continue;
      out.push(t);
    }
  }
  return out;
}
// Les textes d'un fichier de données : toutes les valeurs, sauf les commentaires (clés « // »).
function valeursDe(v, out = []) {
  if (typeof v === 'string') out.push(v);
  else if (Array.isArray(v)) for (const x of v) valeursDe(x, out);
  else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) if (!k.startsWith('//')) valeursDe(x, out);
  return out;
}
function fichiersJs(dossier, out = []) {
  for (const f of readdirSync(join(RACINE, dossier))) {
    const p = join(dossier, f);
    if (statSync(join(RACINE, p)).isDirectory()) fichiersJs(p, out);
    else if (f.endsWith('.js') && !f.includes('.generated.')) out.push(p);
  }
  return out;
}

test('restes : aucun texte du jeu ne parle de la ville, du Marché, du train… (sauf les exceptions écrites)', () => {
  const trouves = [];
  const voir = (fichier, textes) => {
    for (const t of textes) {
      const mot = reste(t);
      if (mot && !exception(fichier, t)) trouves.push(`${fichier} : « ${mot} » dans « ${t.slice(0, 120)} »`);
    }
  };
  for (const f of readdirSync(join(RACINE, 'data')).filter((x) => x.endsWith('.json'))) {
    voir('data/' + f, valeursDe(JSON.parse(readFileSync(join(RACINE, 'data', f), 'utf8'))));
  }
  voir('encyclopedie_ferme_familiale.json', valeursDe(JSON.parse(readFileSync(join(RACINE, 'encyclopedie_ferme_familiale.json'), 'utf8'))));
  for (const f of fichiersJs('js')) voir(f, textesDe(f));
  for (const f of ['jeu.html', 'index.html', 'encyclopedie.html', 'cookies.html']) voir(f, textesDe(f));
  assertEqual(trouves, []);
  // le test voit bien ce qu'il cherche
  assertEqual([reste('Vends au Marché'), reste('en ville'), reste('la marche du cheval'), reste('tu marches')], ['Marché', 'ville', null, null]);
});

test('restes : aucune page de l\'encyclopédie ne se découvre seulement par un objet retiré ; aucune ne parle d\'un objet retiré', () => {
  const retires = Object.entries(DATA.OBJETS).filter(([, d]) => d.retire).map(([id]) => id);
  const noms = retires.map((id) => DATA.OBJETS[id].nom.toLowerCase());
  for (const c of CATEGORIES) {
    for (const e of c.entrees) {
      const vivantes = e.decouverte.filter((cond) => !(cond.startsWith('objet:') && retires.includes(cond.slice(6))));
      assert(vivantes.length > 0, `${e.id} : seulement des objets retirés`);
      // (la page des viandes est un historique voulu : la ferme n'en produit plus depuis la version 1.1)
      if (e.id === 'viandes') continue;
      for (const n of noms) assert(!e.description.toLowerCase().includes(n), `${e.id} : « ${n} »`);
    }
  }
});
