/* monde-worker.js — le Web Worker du sol du grand monde (docs/grand-monde.md, étape 4 : fiche 4b).
 *
 * Il calcule, hors du fil de la page, le sol des régions du monde (js/engine/monde-sol.js :
 * solDeRegion), une à une, dans l'ordre où la page les demande. La page (js/ui/monde-sol.js) lui
 * parle ainsi :
 *   - { type: 'init', graine, cadre, ferme, taille } : le monde de la partie. Il répond d'abord
 *     { type: 'apercu', apercu } (les biomes, en gros : le sol provisoire), puis tire les éléments
 *     du monde (rivières, lacs, chemins : une fois) et répond { type: 'pret', ms } ;
 *   - { type: 'region', rx, ry } : il répond { type: 'region', region } (ses tableaux transférés,
 *     pas copiés), ou { type: 'erreur', cle, message }.
 * Une seule partie à la fois : un nouvel « init » remplace la précédente (et sa file).
 *
 * Sur le site, scripts/build-site.mjs en fait un seul fichier (js/monde-worker.js, regroupé avec
 * les modules du moteur qu'il demande, un Worker classique) ; depuis le dépôt, la page le charge
 * comme un module (type: 'module').
 */
import { apercuDesBiomes, contexteSol, elementsSol, solDeRegion } from './engine/monde-sol.js';

let ctx = null;
const file = [];
let enCours = false;

function suite() {
  if (enCours || !file.length || !ctx) return;
  enCours = true;
  // (une région à la fois, puis la main rendue : un nouvel « init » ou une demande passe entre deux)
  setTimeout(() => {
    enCours = false;
    const q = file.shift();
    if (!q || q.ctx !== ctx) { suite(); return; }
    try {
      const r = solDeRegion(ctx, q.rx, q.ry);
      self.postMessage({ type: 'region', graine: ctx.graine, region: r }, [r.couches.buffer, r.biome.buffer, r.marche.buffer]);
    } catch (e) {
      self.postMessage({ type: 'erreur', graine: ctx.graine, cle: q.rx + ',' + q.ry, message: String((e && e.message) || e) });
    }
    suite();
  }, 0);
}

self.onmessage = (ev) => {
  const m = ev.data || {};
  if (m.type === 'init') {
    file.length = 0;
    ctx = contexteSol(m.graine, m.cadre, m.ferme, m.taille);
    const a = apercuDesBiomes(ctx);
    self.postMessage({ type: 'apercu', graine: ctx.graine, apercu: a }, [a.biomes.buffer]);
    const c = ctx;
    setTimeout(() => {
      if (c !== ctx) return;
      try {
        elementsSol(c);
        self.postMessage({ type: 'pret', graine: c.graine, ms: c.mesures.elements });
      } catch (e) {
        self.postMessage({ type: 'erreur', graine: c.graine, cle: null, message: String((e && e.message) || e) });
      }
      suite();
    }, 0);
  } else if (m.type === 'region' && ctx) {
    file.push({ ctx, rx: m.rx, ry: m.ry });
    if (ctx.elements) suite();
  }
};
