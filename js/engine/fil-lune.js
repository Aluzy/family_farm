import { DATA } from './catalog.js';
import { fail } from './devices.js';
import { hourOfDay } from './clock.js';
import { moonPhase } from './lune.js';
import { addItem, countItem, takeItem } from './inventory.js';
import { aFait, ageFait, ajouterFragment, foisFait, noterFait, recitDe } from './recit.js';

/* ---------- le fil de la lune (le récit, lot 10 ; docs/recit/aventure.md, « le fil de la lune ») ----------

   Un fil que rien ne signale : Johnny, l'épave, ce que cachait Maurice, la pierre. Les réglages et les
   textes : data/recit.json (RECIT.FIL).
     - Les fragments, au carnet du joueur, sans objectif ni marqueur (FIL.FRAGMENTS) : la note « J. »
       (Achille, la scène note_j), la page de bord (l'épave, la nuit, la lanterne-tempête à la main :
       RECIT.LIEUX.epave), les relevés de Frida (son atelier, la scène frida_releves), et les trois bribes
       de Johnny (chez lui, la nuit, après FIL.JOHNNY.REPAS repas, à trois phases de lune : visiteJohnny).
     - Johnny (visiteJohnny) : on entre dans sa cabane ; il accueille, sans se souvenir ; un plat apporté
       (un par jour) est un repas (« johnny.repas ») ; les nuits de pleine lune, tard, il n'est pas là.
     - La galerie secrète (galerieOuverte) : les fragments au carnet, une nuit de pleine lune, de
       GALERIE.HEURES[0] à [1] h : au niveau GALERIE.NIVEAU de la mine de la ferme, une fissure éclairée
       d'une lumière froide (fissureDuNiveau) ; derrière, une petite chambre fixe, hors de la génération
       des niveaux (niveauGalerie) : une couverture, une tasse, des phases de lune gravées, et la pierre.
     - La pierre (prendrePierre, poserPierre) : prise, elle va dans l'inventaire (PIERRE.OBJET) ; posée sur
       la ferme (« pierre.posee »), tout y pousse plus vite, tout le temps : un stade toutes les
       TEMPS.POUSSE_HEURES × PIERRE.POUSSE heures (js/engine/crops.js heuresPousse) ; la ferme luit faiblement
       les nuits de pleine lune (la carte). */

export const FIL = DATA.RECIT.FIL;

const jourDe = (state) => Math.max(1, Math.floor(Number(state && state.day) || 1));
// L'heure h est-elle dans [de, à[ ? (à < de : la plage passe minuit.)
const dans = (h, [de, a]) => (de <= a ? h >= de && h < a : h >= de || h < a);

// Les fragments du fil sont-ils tous au carnet ?
export function filComplet(state) {
  const c = recitDe(state).carnet;
  return FIL.FRAGMENTS.every((id) => c.includes(id));
}

/* ---------- Johnny ---------- */

// Le premier plat cuisiné de l'inventaire (dans l'ordre des objets), ou null.
function platApporte(state) {
  return Object.keys(DATA.OBJETS).find((id) => DATA.OBJETS[id].plat && !DATA.OBJETS[id].retire && countItem(state, id) >= 1) || null;
}

// Le joueur entre dans la cabane de Johnny. → { absent (les nuits de pleine lune, tard : la cabane est
// vide), texte (ce qu'il dit, ou ce qu'on voit), repas (le plat donné, ou null), fragment (la page du
// carnet gagnée, ou null) }. Le fait « lieu.cabane » est noté (la découverte, comme toucherLieu), et
// « johnny.visite » s'il est là.
export function visiteJohnny(state) {
  const J = FIL.JOHNNY, h = hourOfDay(state), phase = moonPhase(state.day).id;
  noterFait(state, 'lieu.cabane');
  if (phase === 'pleine' && dans(h, J.DEHORS)) return { absent: true, texte: J.VIDE, repas: null, fragment: null };
  noterFait(state, 'johnny.visite');
  const lignes = [];
  // (la pierre posée sur la ferme : il le sait, sans qu'on lui ait rien dit ; une fois)
  if (aFait(state, 'pierre.posee') && !aFait(state, 'johnny.pierre')) { noterFait(state, 'johnny.pierre'); lignes.push(J.PIERRE); }
  // (un plat : un repas par jour ; le reste du jour, il garde ce qu'on lui a apporté)
  let repas = null;
  const plat = platApporte(state);
  if (plat && ageFait(state, 'johnny.repas') !== 0) {
    takeItem(state, plat, 1);
    noterFait(state, 'johnny.repas');
    repas = plat;
    lignes.push(J.REPAS_TEXTES[Math.min(foisFait(state, 'johnny.repas'), J.REPAS_TEXTES.length) - 1]);
  } else if (plat) {
    lignes.push(J.DEJA);
  } else if (!lignes.length) {
    lignes.push(J.ACCUEIL[(jourDe(state) + foisFait(state, 'johnny.visite')) % J.ACCUEIL.length]);
  }
  // (la nuit, après assez de repas, à la bonne phase : une bribe, une fois chacune ; elle va au carnet)
  let fragment = null;
  const bribe = J.BRIBES[phase];
  if (bribe && dans(h, J.NUIT) && foisFait(state, 'johnny.repas') >= J.REPAS && ajouterFragment(state, bribe)) {
    fragment = bribe;
    lignes.push(DATA.RECIT.FRAGMENTS[bribe].texte);
  }
  return { absent: false, texte: lignes.join(' '), repas, fragment };
}

/* ---------- la galerie secrète et la pierre ---------- */

// La galerie s'ouvre-t-elle maintenant ? (les fragments au carnet, la pleine lune, l'heure)
export function galerieOuverte(state) {
  const G = FIL.GALERIE;
  return filComplet(state) && moonPhase(state.day).id === G.LUNE && dans(hourOfDay(state), G.HEURES);
}

// La fissure du niveau `c` (genererNiveau) : un mur de face (du sol dessous et à ses deux pieds, des murs
// de part et d'autre), sans minerai, loin de l'échelle et du puits ; la plus loin de l'échelle (le même
// niveau donne la même fissure). → { x, y } ou null.
export function fissureDuNiveau(c) {
  const mur = (x, y) => !c.sol(x, y);
  const pres = (p, x, y, d) => p && Math.abs(p.x - x) + Math.abs(p.y - y) < d;
  const ores = new Set((c.ores || []).map((o) => `${o.x},${o.y}`));
  let best = null, bd = -1;
  for (let y = 2; y < c.H - 2; y++) {
    for (let x = 2; x < c.W - 2; x++) {
      if (!mur(x, y) || !mur(x - 1, y) || !mur(x + 1, y) || !c.sol(x, y + 1) || !c.sol(x, y + 2) || ores.has(`${x},${y}`)) continue;
      if (pres(c.echelle, x, y, 6) || pres(c.puits, x, y, 4)) continue;
      const d = Math.abs(c.echelle.x - x) + Math.abs(c.echelle.y - y);
      if (d > bd) { bd = d; best = { x, y }; }
    }
  }
  return best;
}

// La petite chambre derrière la fissure, la même toujours (FIL.GALERIE.CHAMBRE : sa taille, la salle) :
// la forme d'un niveau (genererNiveau) — l'échelle est la fissure par où l'on revient —, et ce qu'il y a :
// la couverture, la tasse, les phases de lune gravées (sur le mur du haut), la pierre ; retour : le niveau de la
// mine où ramène la fissure.
export function niveauGalerie() {
  const C = FIL.GALERIE.CHAMBRE, W = C.LARGEUR, H = C.HAUTEUR, [x0, y0, x1, y1] = C.SALLE;
  const g = new Uint8Array(W * H).fill(1);
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) g[y * W + x] = 0;
  const sol = (x, y) => x >= 0 && y >= 0 && x < W && y < H && !g[y * W + x];
  const ex = Math.floor((x0 + x1) / 2);
  // (la fissure du retour : en haut de la salle, au milieu, comme une échelle ; on arrive juste dessous)
  return {
    W, H, g, sol, galerie: true, retour: FIL.GALERIE.NIVEAU,
    echelle: { x: ex, y: y0 }, puits: null, ores: [], decor: [], stalag: [],
    objets: { couverture: { x: x0, y: y1 }, tasse: { x: x0 + 1, y: y1 }, gravures: { x: x1 - 1, y: y0 - 1 }, pierre: { x: x1, y: y1 } },
  };
}

// Le joueur prend la pierre, dans la galerie (une fois). → { ok, item } ou un refus.
export function prendrePierre(state) {
  if (aFait(state, 'pierre.trouvee')) return fail('La pierre n\'est plus là.');
  if (!filComplet(state)) return fail('Rien ici.');
  addItem(state, FIL.PIERRE.OBJET, 1);
  noterFait(state, 'pierre.trouvee');
  return { ok: true, item: FIL.PIERRE.OBJET };
}

// Le joueur pose la pierre sur la ferme (elle quitte l'inventaire ; une fois posée, elle y reste).
export function poserPierre(state) {
  if (countItem(state, FIL.PIERRE.OBJET) < 1) return fail('Tu n\'as pas la pierre.');
  if (aFait(state, 'pierre.posee')) return fail('La pierre est déjà sur la ferme.');
  takeItem(state, FIL.PIERRE.OBJET, 1);
  noterFait(state, 'pierre.posee');
  return { ok: true };
}

export function pierrePosee(state) {
  return aFait(state, 'pierre.posee');
}

// La ferme luit-elle ? (la pierre posée, une nuit de pleine lune : la carte, faiblement)
export function fermeLuit(state) {
  return pierrePosee(state) && moonPhase(state.day).id === 'pleine' && dans(hourOfDay(state), FIL.LUEUR);
}
