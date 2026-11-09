import { DATA } from './catalog.js';
import { addItem } from './inventory.js';
import { caseDepart, ramassables } from './atelier.js';
import { caseBatissable, poserBloc } from './blocs.js';
import { farmTerrain } from './terrain.js';
import { montrerLieu } from './monde-vu.js';

/* ---------- l'abri de départ d'une nouvelle partie (la refonte du didacticiel, lot 1) ----------
   Une nouvelle partie sur la ferme générée commence avec un abri déjà bâti, près de l'endroit où le
   personnage apparaît : des murs en bois autour de DIDACTICIEL.ABRI.LARGEUR × PROFONDEUR cases (6 × 3 ;
   8 × 5 avec ses murs), un plancher dedans, une porte dans le mur du bas (sa PORTE-ième case du dedans), et
   une paillasse par membre de la famille, sur la rangée du haut. La rangée du bas reste libre : le four
   (2 cases) et la cuisinière (1) s'y posent sans agrandir, la case derrière la porte restant le passage.

   L'emplacement : de l'herbe libre (sans herbe haute, ni arbre, ni rocher, ni terre labourée) où rien
   n'est à ramasser le premier jour, hors de la Zone de culture, à au moins deux cases de la case de départ,
   avec une case libre devant la porte, rien à ramasser sous son toit (qui déborde de TOIT rangées au-dessus) ;
   le plus près possible (en spirale). Les blocs sont posés comme le
   joueur les poserait (poserBloc : leurs objets d'abord dans l'inventaire) : les murs, la porte, le
   plancher, puis les paillasses (elles demandent une pièce close). Le brouillard du départ se lève autour de
   lui. Voir docs/didacticiel.md. */

const A = () => DATA.DIDACTICIEL.ABRI;
const TOIT = 4;   // les rangées au-dessus de l'abri que son toit recouvre (à l'écran)

// Le plan de l'abri dont le coin haut-gauche (murs compris) est en (c, r) : { murs, porte, sols, paillasses }.
export function planAbriDepart(W, c, r, n) {
  const { LARGEUR: L, PROFONDEUR: P, PORTE } = A();
  const murs = [], sols = [];
  for (let dc = 0; dc < L + 2; dc++) { murs.push(r * W + c + dc); murs.push((r + P + 1) * W + c + dc); }
  for (let dr = 1; dr <= P; dr++) { murs.push((r + dr) * W + c); murs.push((r + dr) * W + c + L + 1); }
  for (let dr = 1; dr <= P; dr++) for (let dc = 1; dc <= L; dc++) sols.push((r + dr) * W + c + dc);
  const porte = (r + P + 1) * W + c + 1 + PORTE;
  const paillasses = Array.from({ length: Math.min(n, L) }, (_, k) => (r + 1) * W + c + 1 + k);
  return { murs: murs.filter((t) => t !== porte), porte, sols, paillasses };
}

// L'emplacement de l'abri (le coin haut-gauche, murs compris) : { c, r }, ou null sans place.
export function placeAbriDepart(state) {
  const T = farmTerrain(state), W = T.LARGEUR;
  if (!T.ZONES || !T.ZONES[1]) return null;
  const { LARGEUR: L, PROFONDEUR: P } = A();
  const d0 = caseDepart(T), c0 = d0 % W, r0 = Math.floor(d0 / W);
  const Z = T.ZONES[1], zoneH = Math.ceil(DATA.POTAGER.CASES / Z.COLONNES);
  const dansZone = (t) => { const r1 = Math.floor(t / W), c1 = t % W; return r1 >= Z.Y - 1 && r1 <= Z.Y + zoneH && c1 >= Z.X - 1 && c1 <= Z.X + Z.COLONNES; };
  const aRamasser = new Set(ramassables(state).map((p) => p.case));
  const libre = (t) => caseBatissable(state, t) && !aRamasser.has(t) && !dansZone(t) && t !== d0;
  for (let d = 2; d <= 20; d++) {
    for (let dr = -d; dr <= d; dr++) {
      for (let dc = -d; dc <= d; dc++) {
        if (Math.max(Math.abs(dr), Math.abs(dc)) !== d) continue;
        const c = c0 + dc, r = r0 + dr;
        if (c < 2 || r < TOIT + 1 || c + L + 3 >= W || r + P + 4 >= T.HAUTEUR) continue;
        const p = planAbriDepart(W, c, r, 0);
        const cases = p.murs.concat(p.sols, [p.porte, p.porte + W]);
        // (et pas collé à la case de départ : le personnage apparaît dehors, à côté)
        if (cases.some((t) => Math.max(Math.abs((t % W) - c0), Math.abs(Math.floor(t / W) - r0)) < 2)) continue;
        // (le toit déborde au-dessus du bâtiment : rien à ramasser dessous, on ne le verrait pas)
        const sousLeToit = [];
        for (let dr = 1; dr <= TOIT; dr++) for (let dc = 0; dc < L + 2; dc++) sousLeToit.push((r - dr) * W + c + dc);
        if (cases.every(libre) && !sousLeToit.some((t) => aRamasser.has(t))) return { c, r };
      }
    }
  }
  return null;
}

// Bâtit l'abri de départ (une fois : state.abriDepart garde son plan). → { ok, plan } ou { ok: false }.
export function batirAbriDepart(state) {
  if (state.abriDepart) return { ok: true, plan: state.abriDepart };
  const T = farmTerrain(state), W = T.LARGEUR, n = Math.max(1, (state.famille && state.famille.membres.length) || 1);
  const o = placeAbriDepart(state);
  if (!o) return { ok: false };
  const plan = planAbriDepart(W, o.c, o.r, n);
  const poser = (sorte, t) => {
    addItem(state, DATA.ATELIER.BLOCS[sorte].objet, 1);
    const r = poserBloc(state, sorte, t);
    if (!r.ok) throw new Error(`abri de départ : ${sorte} en ${t} : ${r.error}`);
  };
  for (const t of plan.murs) poser(A().MATIERE, t);
  poser('porte', plan.porte);
  for (const t of plan.sols) poser(A().SOL, t);
  for (const t of plan.paillasses) poser('paillasse', t);
  state.abriDepart = { c: o.c, r: o.r, ...plan };
  // (hors du brouillard du départ, fiche 14b : on le voit en arrivant)
  montrerLieu(state, plan.porte - 2 * W, 6);
  return { ok: true, plan: state.abriDepart };
}
