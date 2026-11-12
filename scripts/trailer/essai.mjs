import { ouvrirStudio, scenePrete } from './studio.mjs';
import { testFarmMap, testFermeConstruite, toutVoir } from '../../js/engine/index.js';
import { garden, reglagesDuJeu } from '../../tests/engine/aide.mjs';
const S = process.argv[2];
const s0 = garden(); reglagesDuJeu(); testFarmMap(s0, process.argv[3] || '42'); testFermeConstruite(s0); toutVoir(s0);
const st = await ouvrirStudio();
const p = await st.onglet({ sauvegarde: JSON.stringify({ v: s0.version, t: Date.now(), s: s0 }) });
await p.goto(`${st.BASE}/jeu.html`);
await scenePrete(p);
await p.waitForTimeout(3000);
const info = await p.evaluate(async () => {
  const E = await import('/js/engine/index.js'); const T = E.farmTerrain(FF.state); const sc = FarmStage.scene();
  const cam = sc.cameras.main; cam.setBounds(-99999, -99999, 999999, 999999); cam.setZoom(1.2); cam.centerOn((T.FERME.X + T.FERME.LARGEUR / 2) * 16, (T.FERME.Y + T.FERME.HAUTEUR / 2) * 16);
  return { F: T.FERME, monde: sc.world, cles: Object.keys(T), suit: String(sc.suitPerso) };
});
console.log(JSON.stringify(info).slice(0, 1500));
await p.waitForTimeout(8000);
await p.screenshot({ path: S + "/vue.png", timeout: 120000 });
await st.fermer();
