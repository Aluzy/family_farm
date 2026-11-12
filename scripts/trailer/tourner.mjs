// Le tournage du trailer : chaque scène pilote le vrai jeu (les gestes du joueur) et filme l'onglet,
// image par image (scripts/trailer/studio.mjs), dans <dossier>/<scène>/0000.jpg…
// Usage : node scripts/trailer/tourner.mjs <dossier> [--partie=<partie exportée du jeu>.json] [--brouillon] [scène…]
//   --partie : la ferme du tournage (⚙️ Options › Exporter) ; sans elle, une ferme d'essai (partie.mjs).
//   --brouillon : en 960 × 540, une image sur trois (pour régler une scène vite).
// Le montage : scripts/trailer/monter.mjs.
import { join } from 'node:path';
import { action, attendre, ouvrirStudio, plateau, scenePrete } from './studio.mjs';
import { partieDe, partieExportee, partieTrailer, sauvegarde } from './partie.mjs';

const args = process.argv.slice(2);
const DOSSIER = args.find((a) => !a.startsWith('--') && a.includes('/')) || 'trailer-images';
const PARTIE = (args.find((a) => a.startsWith('--partie=')) || '').slice(9);
const BROUILLON = args.includes('--brouillon');
const VOULUES = args.filter((a) => !a.startsWith('--') && !a.includes('/'));
const L = BROUILLON ? 960 : 1920, H = BROUILLON ? 540 : 1080, UNE_SUR = BROUILLON ? 3 : 1;
const veut = (nom) => !VOULUES.length || VOULUES.includes(nom);

const CACHE = '#player-card,#hud,#sleep-fab,#tool-bar,#side-menu,#toast-root,#god-bar,#amis-bouton,#en-ligne-bandeau,#objectifs-root,#didacticiel-root,#tuto-root,#modal-root,#window-root,.consent-banner,.stage-hud,.stage-nav,.stage-label,.stage-bubble,.stage-tip,.boussole,.caleche-heler{display:none!important} #farm-stage{top:0!important;bottom:0!important}';

// Dans la page : la trousse du tournage (window.TR).
function trousse() {
  const act = (nom, d = {}) => { const b = document.createElement('button'); b.dataset.action = nom; Object.assign(b.dataset, d); document.body.appendChild(b); b.click(); b.remove(); };
  const sc = () => FarmStage.scene();
  const orig = FarmStage.update;
  const ov = {};
  FarmStage.update = (m) => orig(Object.assign({}, m, ov));
  let heureTenue = null, E = null;
  import('/js/engine/index.js').then((m) => { E = m; });
  setInterval(() => { if (heureTenue !== null && E) FF.state.awakeMs = E.awakeMsAtHour(heureTenue); }, 200);
  window.TR = {
    act, ov,
    E: () => E,
    // le zoom entier Z (les pixels du jeu nets), la vue qui suit le personnage ou libre
    zoom(Z) { const s = sc(); s.zoomK = 1; s.fit(); s.zoomK = Z / s.cameras.main.zoom; s.fit(); },
    libre(x, y) { const s = sc(); s.suitPerso = () => false; if (x !== undefined) s.setCentre(x, y); },
    suivre() { const s = sc(); delete s.suitPerso; s.followSnap = true; },
    heure(h) { heureTenue = h; if (E && h !== null) FF.state.awakeMs = E.awakeMsAtHour(h); FF.render(); },
    voile(o) { Object.assign(ov, o); FF.render(); },
    va(x, y) { const s = sc(); s.fermier.arrive(x, y, null, true); s.followSnap = true; },
    pied(c, r) { return { x: c * 16 + 8, y: r * 16 + 14 }; },
    outil(o) { act('tool-use', { outil: o }); },
    plein() { E.testFillEnergy(FF.state); E.testFillTank(FF.state); },
    // les blocs posés d'une sorte : [{ case, c, r, x, y (le milieu de la case) }]
    blocs(sorte) { const W = sc().grid.cols; return Object.entries(FF.state.blocs || {}).filter(([, v]) => v === sorte).map(([t]) => ({ case: +t, c: +t % W, r: Math.floor(+t / W), x: (+t % W) * 16 + 8, y: Math.floor(+t / W) * 16 + 8 })); },
    parcelles() { const W = sc().grid.cols; return FF.state.potager.parcelles.map((p) => ({ id: p.id, case: p.case, c: p.case % W, r: Math.floor(p.case / W), culture: p.culture, stade: p.stade, arrose: p.arrose, mur: !!p.culture && p.stade >= E.maxStage(p) })); },
  };
}

const st = await ouvrirStudio();
const S0 = PARTIE ? partieExportee(PARTIE) : partieTrailer().s;

async function ouvre(sauve, opts = {}) {
  const p = await st.onglet({ sauvegarde: sauve, largeur: L, hauteur: H, ...opts });
  await p.addInitScript(() => { try { localStorage.setItem('ferme-qualite', 'normale'); } catch (e) { /* rien */ } });
  await p.goto(`${st.BASE}/jeu.html`);
  await scenePrete(p);
  await p.addStyleTag({ content: CACHE });
  await p.evaluate(trousse);
  await attendre(p, () => !!TR.E() && !!FarmStage.scene().ctx.monde.lieux());
  await action(p, 'close-modal');
  return p;
}

const Z3 = 3 * (H / 1080), Z4 = 4 * (H / 1080), Z5 = 5 * (H / 1080);   // 3, 4 ou 5 pixels d'écran par pixel du jeu en 1080p
const film = (pl, p, nom, s, chaque) => { console.log(`  ● ${nom} (${s} s)`); return pl.filmer(p, join(DOSSIER, nom), s, chaque, UNE_SUR); };
const SOLO = ['lieux', 'champ', 'hache', 'pioche', 'peche', 'cuisine', 'repas'];

/* ------------------------------------------------------------------ les scènes en solo */
if (SOLO.some((n) => VOULUES.includes(n)) || !VOULUES.length) {
  const p = await ouvre(sauvegarde(JSON.parse(JSON.stringify(S0))));
  const pl = plateau([p]);
  await p.evaluate((Z) => { TR.zoom(Z); TR.heure(9.5); TR.plein(); }, Z5);
  await pl.figer();

  // (repérage : une image de chaque hameau et de chaque coin de pêche du grand monde)
  if (VOULUES.includes('lieux')) {
    const lieux = await p.evaluate((Z) => { TR.zoom(Z); TR.voile({ brouillard: null }); const sc = FarmStage.scene(), W = sc.grid.cols, L = sc.ctx.monde.lieux(); return [...L.hameaux.map((h) => [h.nom, h.case % W, Math.floor(h.case / W)]), ...L.peche.map((q, i) => [q.eau + i, q.case % W, Math.floor(q.case / W)])]; }, Z3);
    for (const [nom, c, r] of lieux) {
      await p.evaluate(([c, r]) => TR.va(c * 16 + 8, r * 16 + 14), [c, r]);
      await pl.passer(1); await p.waitForTimeout(2500); await pl.passer(1);
      await pl.filmer(p, join(DOSSIER, 'lieux', nom.replace(/\W+/g, '_')), 1 / 30);
    }
    await p.evaluate((Z) => TR.zoom(Z), Z5);
  }

  if (veut('champ')) {
    // le potager : labourer, semer, arroser, récolter
    const plan = await p.evaluate(() => {
      const sc = FarmStage.scene(), W = sc.grid.cols, P = TR.parcelles();
      const nus = P.filter((q) => !q.culture), murs = P.filter((q) => q.mur), soif = P.filter((q) => q.culture && !q.mur && !q.arrose);
      const pres = (L, a, n) => L.slice().sort((x, y) => Math.hypot(x.c - a.c, x.r - a.r) - Math.hypot(y.c - a.c, y.r - a.r)).slice(0, n);
      const a = nus.length ? nus[Math.floor(nus.length / 2)] : P[0];
      const H = TR.E().hoeableTiles(FF.state).map((t) => ({ case: t, c: t % W, r: Math.floor(t / W) }));
      return { n: [P.length, nus.length, murs.length, soif.length], a, nus: pres(nus, a, 4), murs: pres(murs, a, 4), soif: pres(soif, a, 4), houe: pres(H, a, 3) };
    });
    console.log('  champ', JSON.stringify(plan.n), JSON.stringify(plan.a));
    await p.evaluate((a) => TR.va(a.c * 16 - 24, a.r * 16 + 14), plan.a);
    await pl.passer(1.5);
    await p.evaluate((q) => { for (const h of q.houe) TR.act('hoe', { case: String(h.case) }); }, plan);
    await film(pl, p, 'champ_houe', 5);
    await p.evaluate((q) => { TR.plein(); FarmStage.semer(q.nus.map((x) => x.case), 'carotte'); }, plan);
    await film(pl, p, 'champ_semis', 5);
    await p.evaluate((q) => { TR.plein(); for (const x of q.soif) TR.act('water', { id: x.id }); }, plan);
    await film(pl, p, 'champ_eau', 5);
    await p.evaluate((q) => { TR.plein(); for (const x of q.murs) TR.act('harvest', { id: x.id }); }, plan);
    await film(pl, p, 'champ_recolte', 5);
  }

  if (veut('hache')) {
    // un arbre de la ferme, près de l'étang : le personnage s'en approche et l'abat en trois coups
    await p.evaluate(() => {
      const sc = FarmStage.scene(), i = sc.fermier.info(); TR.plein();
      const A = sc.mapTrees().filter((t) => sc.choppable(t) && !t.buisson && t.kind).map((t) => ({ t, x: t.foot.x, y: t.foot.y })).sort((a, b) => Math.hypot(a.x - i.x, a.y - i.y) - Math.hypot(b.x - i.x, b.y - i.y));
      const a = A[0];
      TR.va(a.x - 40, a.y + 4);
      window.__arbre = a.t;
    });
    await pl.passer(1.5);
    await p.evaluate(() => { TR.outil('hache'); });
    await pl.passer(0.3);
    await p.evaluate(() => { const sc = FarmStage.scene(); for (let i = 0; i < 3; i++) sc.chop(window.__arbre); });
    await film(pl, p, 'hache', 7);
    await p.evaluate(() => TR.outil('hache'));
    await pl.passer(0.5);
  }

  if (veut('pioche')) {
    // un gros rocher de la ferme : trois coups de pioche, il se brise
    await p.evaluate(() => {
      const sc = FarmStage.scene(), i = sc.fermier.info(); TR.plein();
      const R = sc.rocks.filter((r) => !r.gone && r.box && r.box.x1 - r.box.x0 > 12).map((r) => ({ r, x: (r.box.x0 + r.box.x1) / 2, y: r.foot })).sort((a, b) => Math.hypot(a.x - i.x, a.y - i.y) - Math.hypot(b.x - i.x, b.y - i.y));
      const a = R[0];
      TR.va(a.x - 36, a.y + 2);
      window.__roc = a.r;
    });
    await pl.passer(1.5);
    await p.evaluate(() => TR.outil('pioche'));
    await pl.passer(0.3);
    await p.evaluate(() => { const sc = FarmStage.scene(); for (let i = 0; i < 3; i++) sc.mine(window.__roc); });
    await film(pl, p, 'pioche', 6);
    await p.evaluate(() => TR.outil('pioche'));
    await pl.passer(0.5);
  }

  if (veut('peche')) {
    // l'étang de la ferme : le lancer, la touche, la prise
    await p.evaluate(() => {
      const sc = FarmStage.scene(); TR.plein();
      CarteKit.PECHE.attente = [1.6, 1.6];
      const f0 = sc.ctx.bridge.fish;
      sc.ctx.bridge.fish = (...a) => { let g = null; for (let i = 0; i < 30 && !(g && g.poisson); i++) g = f0(...a); return g; };
      const E = [...new Set(sc.waters().values())].filter((w) => w.eau === 'etang');
      const w = E.sort((a, b) => b.cells.size - a.cells.size)[0];
      const C = [...w.cells].map((k) => k.split(',').map(Number));
      const y = C.map((c) => c[1]).sort((a, b) => a - b)[Math.floor(C.length / 2)];
      const rang = C.filter((c) => c[1] === y).map((c) => c[0]).sort((a, b) => a - b);
      window.__eau = { w, x: rang[0] + 8 + 32, y: y + 8 };
      TR.va(rang[0] - 40, y + 12);
    });
    await pl.passer(1.5);
    await p.evaluate(() => TR.outil('canne'));
    await pl.passer(0.3);
    await p.evaluate(() => { const sc = FarmStage.scene(), e = window.__eau; sc.goFish(e.w, e.x, e.y); });
    await film(pl, p, 'peche', 8);
    await p.evaluate(() => TR.outil('canne'));
    await pl.passer(0.5);
  }

  if (veut('cuisine')) {
    // la cuisine de la maison : le personnage devant la cuisinière, une recette lancée (le feu, la vapeur)
    const c = await p.evaluate(() => {
      TR.plein(); TR.heure(12);
      const k = TR.blocs('cuisiniere')[0];
      TR.va(k.x - 28, k.y + 26);
      const R = TR.E().DATA.RECETTES || TR.E().DATA.RECIPES;
      return { k, recettes: Object.keys(R).slice(0, 22), inv: Object.keys(FF.state.inventaire).filter((x) => /oeuf|huile|farine|tomate|carotte|courgette|patate|lait|pomme|fraise/.test(x)).map((x) => [x, TR.E().countItem(FF.state, x)]) };
    });
    console.log('  cuisine', JSON.stringify(c));
    await pl.passer(2);
    await p.evaluate((k) => FarmStage.scene().fermier.goTo(k.x, k.y + 18), c.k);
    await film(pl, p, 'cuisine', 6, async (i) => {
      if (i === 45) await p.evaluate(() => { for (const r of ['omelette', 'ratatouille', 'soupe_legumes', 'salade_tomates', 'gratin_patates', 'compote']) { TR.act('start-recipe', { recipe: r, n: '1' }); if (FarmStage.scene().ctx.lastModel.cuisineAllumee) break; } FF.render(); window.__cuit = !!FarmStage.scene().ctx.lastModel.cuisineAllumee; });
    });
    console.log('  cuisinière allumée :', await p.evaluate(() => [window.__cuit, !!FarmStage.scene().ctx.lastModel.cuisineAllumee]));
  }

  if (veut('repas')) {
    // le repas du soir à la terrasse : les invités arrivent, la famille s'attable, le repas est servi
    const t = await p.evaluate(() => {
      const sc = FarmStage.scene(); TR.heure(19.3);
      const T = sc.placesTable();
      if (!T) return null;
      const P = TR.E().DATA.AMITIE.INVITATION.PAROLES || {};
      const H = sc.ctx.monde.lieux().hameaux;
      window.__inv = { id: 'inv-trailer', moment: 'soir', nom: 'le dîner', etat: 'repondue',
        invites: [{ id: 'g1', hameau: H[0].id, hameauNom: H[0].nom, prenom: 'Odile', perso: 3, apparence: null, enfant: false, metier: '', depart: null, admire: null },
          { id: 'g2', hameau: H[1].id, hameauNom: H[1].nom, prenom: 'Basile', perso: 9, apparence: null, enfant: false, metier: '', depart: null, admire: null }],
        paroles: { arrive: P.ARRIVE, table: P.TABLE, merci: P.MERCI, seul: P.SEUL } };
      TR.va(T.x - 60, T.y + 30);
      TR.voile({ invites: window.__inv });
      return { x: T.x, y: T.y, n: T.places.length, terrasse: T.terrasse, P: Object.keys(P) };
    });
    console.log('  table', JSON.stringify(t));
    if (t) {
      await pl.passer(3);
      await film(pl, p, 'repas_arrivee', 8);
      await pl.passer(14);
      await p.evaluate(() => { TR.voile({ invites: { ...window.__inv, etat: 'servie' } }); });
      await pl.passer(1);
      await film(pl, p, 'repas', 6);
    }
  }
  await p.context().close();
}

await st.fermer();
if (st.erreurs.length) console.log(`${st.erreurs.length} erreur(s) dans les pages.`);
