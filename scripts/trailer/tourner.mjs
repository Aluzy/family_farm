// Le tournage du trailer : chaque scène pilote le vrai jeu (les gestes du joueur) et filme l'onglet,
// image par image (scripts/trailer/studio.mjs), dans <dossier>/<scène>/0000.jpg…
// Usage : node scripts/trailer/tourner.mjs <dossier> [--partie=<partie exportée du jeu>.json] [--brouillon] [scène…]
//   --partie : la ferme du tournage (⚙️ Options › Exporter) ; sans elle, une ferme d'essai (partie.mjs).
//   --brouillon : en 960 × 540, une image sur trois (pour régler une scène vite).
// Le montage : scripts/trailer/monter.mjs.
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { action, attendre, ouvrirStudio, plateau, scenePrete } from './studio.mjs';
import { miseEnScene, partieDe, partieExportee, partieTrailer, sauvegarde } from './partie.mjs';

const args = process.argv.slice(2);
const DOSSIER = args.find((a) => !a.startsWith('--') && a.includes('/')) || 'trailer-images';
const PARTIE = (args.find((a) => a.startsWith('--partie=')) || '').slice(9);
const BROUILLON = args.includes('--brouillon');
const VOULUES = args.filter((a) => !a.startsWith('--') && !a.includes('/'));
const L = BROUILLON ? 960 : 1920, H = BROUILLON ? 540 : 1080, UNE_SUR = BROUILLON ? 3 : 1;
const veut = (nom) => !VOULUES.length || VOULUES.includes(nom);

const CACHE = '#player-card,#hud,#sleep-fab,#tool-bar,#side-menu,#toast-root,#god-bar,#amis-bouton,#en-ligne-bandeau,#objectifs-root,#didacticiel-root,#tuto-root,#modal-root,#window-root,.consent-banner,.stage-hud,.stage-nav,.stage-label,.stage-bubble,.stage-tip,.stage-robot,.boussole,.caleche-heler{display:none!important} #farm-stage{top:0!important;bottom:0!important}';

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
  // les sons que le jeu joue (js/son.js), notés avec leur instant : le montage les replace sur le film
  const sons = [];
  if (window.FermeSon) for (const nom of ['joue', 'prise']) {
    const f0 = FermeSon[nom];
    FermeSon[nom] = (cle, o = {}) => { sons.push({ cle: nom === 'prise' ? 'prise' : cle, t: Date.now(), depuis: (o && o.depuis) || 0, gain: (o && o.gain) || 1 }); return f0(cle, o); };
  }
  window.TR = {
    sons,
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

// Une page du jeu prête pour le tournage (après chaque chargement) : l'interface cachée, la trousse.
async function prepare(p, enLigne = false) {
  await scenePrete(p);
  await p.addStyleTag({ content: CACHE });
  await p.evaluate(trousse);
  await attendre(p, (l) => !!TR.E() && (l || !!FarmStage.scene().ctx.monde.lieux()), enLigne);
  await action(p, 'close-modal');
}
async function ouvre(sauve, opts = {}) {
  const p = await st.onglet({ sauvegarde: sauve, largeur: L, hauteur: H, ...opts });
  await p.addInitScript(() => { try { localStorage.setItem('ferme-qualite', 'normale'); } catch (e) { /* rien */ } });
  await p.goto(`${st.BASE}/jeu.html`);
  await prepare(p);
  return p;
}

const Z3 = 3 * (H / 1080), Z4 = 4 * (H / 1080), Z5 = 5 * (H / 1080);   // 3, 4 ou 5 pixels d'écran par pixel du jeu en 1080p
const pose = async (pl, p, s = 1.5) => { await pl.passer(0.4); await p.waitForTimeout(2500); await pl.passer(s); };
async function film(pl, p, nom, s, chaque) {
  console.log(`  ● ${nom} (${s} s)`);
  const t0 = await p.evaluate(() => Date.now());
  const n = await pl.filmer(p, join(DOSSIER, nom), s, chaque, UNE_SUR);
  const sons = await p.evaluate((t0) => TR.sons.filter((x) => x.t >= t0).map((x) => ({ cle: x.cle, s: (x.t - t0) / 1000, depuis: x.depuis, gain: x.gain })), t0);
  writeFileSync(join(DOSSIER, nom, 'sons.json'), JSON.stringify(sons));
  return n;
}
const SOLO = ['lieux', 'champ', 'hache', 'pioche', 'peche', 'cuisine', 'repas', 'titre', 'fin', 'balade'];
const BALADE = ['Brumeval', 'Le Gué', 'Pré-Fleuri', 'Les Mouettes'];   // les hameaux de la promenade

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

  if (VOULUES.includes('champ')) {
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
    await pose(pl, p);
    await p.evaluate(() => { TR.outil('hache'); });
    await pl.passer(0.3);
    await p.evaluate(() => { const sc = FarmStage.scene(); for (let i = 0; i < 3; i++) sc.chop(window.__arbre); });
    await film(pl, p, 'hache', 6);
    await p.evaluate(() => TR.outil('hache'));
    await pl.passer(0.5);
  }

  if (veut('pioche')) {
    // un gros rocher de la ferme : trois coups de pioche, il se brise
    await p.evaluate(() => {
      const sc = FarmStage.scene(), i = sc.fermier.info(); TR.plein();
      // (le plus gros rocher des environs)
      const R = sc.rocks.filter((r) => !r.gone && r.box && r.box.x1 - r.box.x0 > 12).map((r) => ({ r, x: (r.box.x0 + r.box.x1) / 2, y: r.foot, aire: (r.box.x1 - r.box.x0) * (r.box.y1 - r.box.y0) }))
        .filter((a) => Math.hypot(a.x - i.x, a.y - i.y) < 900).sort((a, b) => b.aire - a.aire);
      const a = R[0];
      TR.va(a.x - 36, a.y + 2);
      window.__roc = a.r;
    });
    await pose(pl, p);
    await p.evaluate(() => TR.outil('pioche'));
    await pl.passer(0.3);
    await p.evaluate(() => { const sc = FarmStage.scene(); for (let i = 0; i < 3; i++) sc.mine(window.__roc); });
    await film(pl, p, 'pioche', 8);
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
    await pose(pl, p);
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
    await pose(pl, p, 2);
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
      // le personnage s'assoit à la dernière place ; la vue reste sur la table
      const SIEGES = new Set(['chaise_jardin', 'banc_jardin', 'meuble_chaise', 'banc_rondins', 'chaise_peinte', 'banc_pierre']);
      const pl = T.places[T.places.length - 1];
      const siege = [...sc.blocks.values()].filter((e) => SIEGES.has(e.sorte)).map((e) => ({ e, d: Math.hypot((e.case % sc.grid.cols) * 16 + 8 - pl.x, Math.floor(e.case / sc.grid.cols) * 16 + 12 - pl.y) })).sort((a, b) => a.d - b.d)[0];
      TR.va(pl.pied ? pl.pied.x : T.x, pl.pied ? pl.pied.y : T.y + 30);
      TR.libre(T.x, T.y - 44);
      if (siege && siege.d < 20) sc.asseoirSur(siege.e);
      TR.voile({ invites: window.__inv });
      return { x: T.x, y: T.y, n: T.places.length, terrasse: T.terrasse, P: Object.keys(P) };
    });
    console.log('  table', JSON.stringify(t));
    if (t) {
      await pl.passer(3);
      await film(pl, p, 'repas_arrivee', 9);
      await pl.passer(13);
      await p.evaluate(() => { TR.voile({ invites: { ...window.__inv, etat: 'servie' } }); });
      await pl.passer(1);
      await film(pl, p, 'repas', 6);
      await p.evaluate(() => { TR.voile({ invites: null }); TR.suivre(); FarmStage.scene().fermier.lever && FarmStage.scene().fermier.lever(); });
      await pl.passer(1);
    }
  }

  // un panoramique lent sur la ferme : `de` et `vers` en cases, l'heure, le zoom
  const pano = async (nom, h, de, vers, s) => {
    await p.evaluate(([h, de, Z]) => { TR.heure(h); TR.zoom(Z); TR.va(de[0] * 16, (de[1] + 14) * 16); TR.libre(de[0] * 16, de[1] * 16); }, [h, de, Z3]);
    await pose(pl, p, 2);
    await film(pl, p, nom, s, async (i, n) => { const k = i / (n - 1); await p.evaluate(([x, y]) => FarmStage.scene().setCentre(Math.round(x), Math.round(y)), [(de[0] + (vers[0] - de[0]) * k) * 16, (de[1] + (vers[1] - de[1]) * k) * 16]); });
    await p.evaluate((Z) => { TR.suivre(); TR.zoom(Z); }, Z5);
  };
  if (veut('titre')) {
    const k = await p.evaluate(() => TR.blocs('cuisiniere')[0]);
    await pano('titre', 8.5, [k.c - 6, k.r + 12], [k.c + 6, k.r + 10], 4);
  }
  if (veut('fin')) {
    const k = await p.evaluate(() => TR.blocs('cuisiniere')[0]);
    await pano('fin', 20.6, [k.c + 4, k.r + 10], [k.c - 2, k.r + 11], 4);
  }

  if (veut('balade')) {
    // le grand monde : le personnage arrive dans des hameaux aux décors différents (le brouillard levé)
    await p.evaluate((Z) => { TR.heure(11); TR.zoom(Z); TR.voile({ brouillard: null }); }, Z4);
    const lieux = await p.evaluate(() => { const sc = FarmStage.scene(), W = sc.grid.cols, L = sc.ctx.monde.lieux(); return L.hameaux.map((h) => [h.nom, (h.case % W) * 16 + 8, Math.floor(h.case / W) * 16 + 14]); });
    for (const nom of BALADE) {
      const l = lieux.find((x) => x[0] === nom);
      if (!l) { console.log(`  (pas de hameau « ${nom} »)`); continue; }
      await p.evaluate(([, x, y]) => TR.va(x - 88, y + 34), l);
      await pl.passer(0.5); await p.waitForTimeout(3000); await pl.passer(1.5);
      await p.evaluate(([, x, y]) => FarmStage.scene().fermier.goTo(x + 60, y + 30), l);
      await film(pl, p, 'balade_' + nom.replace(/\W+/g, '_'), 3);
    }
  }
  await p.context().close();
}

/* ------------------------------------------------------------------ les scènes en ligne (trois joueurs) */
if (['ensemble', 'rencontre'].some((n) => VOULUES.includes(n)) || !VOULUES.length) {
  const { s: SM, rangs } = miseEnScene(S0);
  const A = await st.compte('camille@exemple.fr'), B = await st.compte('sam@exemple.fr'), C = await st.compte('noa@exemple.fr');
  // A met sa ferme en ligne (⚙️ Options › Jeu en ligne), y entre, invite B et C (👥 › Inviter un ami)
  const pa = await st.onglet({ sauvegarde: sauvegarde(SM), qui: A, largeur: L, hauteur: H, nom: 'A' });
  await pa.addInitScript(() => { try { localStorage.setItem('ferme-qualite', 'normale'); } catch (e) { /* rien */ } });
  await pa.goto(`${st.BASE}/jeu.html`);
  await scenePrete(pa);
  await action(pa, 'open-options');
  await attendre(pa, () => !!document.querySelector('[data-action="monde-creer"]'));
  await action(pa, 'monde-creer');
  await attendre(pa, () => /Entrer/.test((document.getElementById('compte-zone') || {}).innerText || ''));
  const idMonde = [...st.mondes.keys()][0];
  const enLigne = () => /à jour/.test((document.getElementById('en-ligne-bandeau') || {}).innerText || '') && !!(window.FarmStage && FarmStage.ready && FarmStage.ready());
  await pa.goto(`${st.BASE}/jeu.html?monde=${idMonde}`);
  await attendre(pa, enLigne);
  const autres = [];
  for (const [qui, prenom, perso] of [[B, 'Sam', 7], [C, 'Noa', 14]]) {
    await action(pa, 'monde-membres');
    await attendre(pa, () => !!document.querySelector('[data-action="monde-inviter"]'));
    await action(pa, 'monde-inviter');
    await attendre(pa, () => !!document.getElementById('invitation-lien'));
    const lien = await pa.evaluate(() => document.getElementById('invitation-lien').value);
    await action(pa, 'close-modal');
    const p = await st.onglet({ sauvegarde: sauvegarde(partieDe(SM, prenom, perso)), qui, largeur: 640, hauteur: 360, nom: prenom });
    await p.goto(`${st.BASE}/jeu.html`);
    await scenePrete(p);
    await p.goto(lien);
    await attendre(p, () => /[?&]monde=/.test(location.search));
    await attendre(p, enLigne);
    autres.push(p);
  }
  const [pb, pc] = autres;
  for (const p of [pa, pb, pc]) await prepare(p, true);
  console.log('  en ligne :', await pa.evaluate(() => document.getElementById('en-ligne-bandeau').innerText.replace(/\s+/g, ' ')));
  const pl = plateau([pa, pb, pc]);
  await pa.evaluate((Z) => TR.zoom(Z), Z5);
  await pl.figer();
  const W = await pa.evaluate(() => FarmStage.scene().grid.cols);
  const xy = (t, dx = 0, dy = 0) => [(t % W) * 16 + 8 + dx, Math.floor(t / W) * 16 + 14 + dy];

  if (veut('ensemble') && rangs) {
    // le potager à trois : A laboure puis sème, Sam arrose, Noa récolte
    await pa.evaluate(([x, y]) => TR.va(x, y), xy(rangs.houe[0], -20, 0));
    await pb.evaluate(([x, y]) => TR.va(x, y), xy(rangs.eau[rangs.eau.length - 1], 20, 0));
    await pc.evaluate(([x, y]) => TR.va(x, y), xy(rangs.recolte[0], -20, 0));
    await pose(pl, pa, 2.5);
    const ids = await pa.evaluate((R) => { const P = TR.parcelles(), de = (L) => L.map((t) => (P.find((q) => q.case === t) || {}).id); return { eau: de(R.eau), recolte: de(R.recolte) }; }, rangs);
    await film(pl, pa, 'ensemble', 13, async (i) => {
      if (i === 15) await pa.evaluate((R) => { for (const t of R.houe) TR.act('hoe', { case: String(t) }); }, rangs);
      if (i === 30) await pb.evaluate((L) => { for (const id of L.slice().reverse()) TR.act('water', { id }); }, ids.eau);
      if (i === 45) await pc.evaluate((L) => { for (const id of L) TR.act('harvest', { id }); }, ids.recolte);
      if (i === 200) await pa.evaluate((R) => FarmStage.semer(R.semis, 'carotte'), rangs);
    });
    console.log('  après :', JSON.stringify(await pa.evaluate((R) => { const P = TR.parcelles(); return Object.fromEntries(Object.entries(R).map(([k, L]) => [k, L.map((t) => { const q = P.find((x) => x.case === t); return q ? (q.culture || '_') + (q.arrose ? '~' : '') : '.'; }).join(' ')])); }, rangs)));
  }

  if (veut('rencontre')) {
    // les trois joueurs se retrouvent sur le chemin, devant la maison
    const k = await pa.evaluate(() => TR.blocs('cuisiniere')[0]);
    const m = { x: k.c * 16 + 8, y: (k.r + 6) * 16 + 14 };
    await pa.evaluate((m) => TR.va(m.x - 110, m.y), m);
    await pb.evaluate((m) => TR.va(m.x + 120, m.y - 4), m);
    await pc.evaluate((m) => TR.va(m.x + 150, m.y + 12), m);
    await pose(pl, pa, 2.5);
    await film(pl, pa, 'rencontre', 6, async (i) => {
      if (i === 5) { await pa.evaluate((m) => FarmStage.scene().fermier.goTo(m.x - 12, m.y), m); await pb.evaluate((m) => FarmStage.scene().fermier.goTo(m.x + 14, m.y - 2), m); await pc.evaluate((m) => FarmStage.scene().fermier.goTo(m.x + 30, m.y + 12), m); }
    });
  }
  for (const p of [pa, pb, pc]) await p.context().close();
}

await st.fermer();
if (st.erreurs.length) console.log(`${st.erreurs.length} erreur(s) dans les pages.`);
