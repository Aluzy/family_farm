// Repérage : des vues fixes de la partie du trailer (node scripts/trailer/reperage.mjs <dossier>).
import { mkdirSync } from 'node:fs';
import { ouvrirStudio, scenePrete } from './studio.mjs';
import { partieExportee, partieTrailer, sauvegarde } from './partie.mjs';
const S = process.argv[2];
const VUES = JSON.parse(process.argv[3]);
mkdirSync(S, { recursive: true });
const s = process.argv[4] ? partieExportee(process.argv[4]) : partieTrailer().s;
const st = await ouvrirStudio();
const p = await st.onglet({ sauvegarde: sauvegarde(s), largeur: 1280, hauteur: 720 });
await p.goto(`${st.BASE}/jeu.html`);
await scenePrete(p);
await p.addStyleTag({ content: '#player-card,#hud,#sleep-fab,#tool-bar,#side-menu,#toast-root,#god-bar,#amis-bouton,#en-ligne-bandeau,#objectifs-root,#didacticiel-root,#tuto-root,.consent-banner,.stage-hud,.stage-nav,.stage-label,.stage-bubble,.boussole,.caleche-heler{display:none!important} #farm-stage{top:0!important;bottom:0!important}' });
await p.waitForTimeout(2500);
const info = await p.evaluate(async () => {
  let TRZ = 0;
  const E = await import('/js/engine/index.js'); const sc = FarmStage.scene(), T = E.farmTerrain(FF.state), W = sc.grid.cols;
  sc.suitPerso = () => false; sc.zoomK = 0.5; sc.fit(); TRZ = sc.cameras.main.zoom;
  const L = sc.ctx.monde.lieux();
  return { F: T.FERME, zones: T.ZONES, eaux: (() => { const w = sc.waters(); return JSON.stringify(w, (k, v) => v instanceof Set ? { n: v.size, a: [...v].slice(0, 2) } : v instanceof Map ? [...v.entries()].slice(0, 6) : v).slice(0, 600); })(), rochers: sc.rocks.filter((r) => !r.gone).length, lieux: L && { h: L.hameaux.map((h) => [h.id, h.nom, h.case % W, Math.floor(h.case / W)]), peche: L.peche.slice(0, 12).map((q) => [q.eau, q.case % W, Math.floor(q.case / W)]) }, perso: sc.fermier.info(), zoom: TRZ, monde: [sc.world.w, sc.world.h] };
});
console.log(JSON.stringify(info));
await p.evaluate(() => { const b = document.createElement('button'); b.dataset.action = 'close-modal'; document.body.appendChild(b); b.click(); b.remove(); }); await p.evaluate((Z) => { const sc = FarmStage.scene(); sc.zoomK = Z; sc.fit(); }, +(process.argv[5] || 1));
for (const [nom, x, y] of VUES) {
  await p.evaluate(([x, y]) => FarmStage.scene().setCentre(x * 16, y * 16), [x, y]);
  await p.waitForTimeout(2500);
  await p.screenshot({ path: `${S}/${nom}.png`, timeout: 120000 });
}
await st.fermer();
