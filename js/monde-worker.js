/* monde-worker.js — le Web Worker du sol du grand monde (docs/grand-monde.md, étape 4 : fiche 4b).
 *
 * Il calcule, hors du fil de la page, le sol des régions du monde (js/engine/monde-sol.js :
 * solDeRegion), une à une, dans l'ordre où la page les demande. La page (js/ui/monde-sol.js) lui
 * parle ainsi :
 *   - { type: 'init', graine, cadre, ferme, taille } : le monde de la partie. Il répond d'abord
 *     { type: 'apercu', apercu } (les biomes, en gros : le sol provisoire), puis tire les éléments
 *     du monde (rivières, lacs, chemins : une fois) et répond { type: 'pret', ms, lieux, hameaux, tournee }
 *     (les lieux du plan : hameaux, entrées de grotte, coins de pêche ; monde-gen.js ; le plan des
 *     hameaux bâtis : monde-hameaux.js ; la tournée de la calèche : caleche-tournee.js) ;
 *   - { type: 'region', rx, ry } : il répond { type: 'region', region } (ses tableaux transférés,
 *     pas copiés), ou { type: 'erreur', cle, message } ;
 *   - { type: 'carte' } : l'image de la carte du monde (js/engine/monde-carte.js, fiche 8 : un pixel par
 *     case), une fois les éléments tirés ; il répond { type: 'carte', carte: { l, h, px } } (px transféré).
 * Une seule partie à la fois : un nouvel « init » remplace la précédente (et sa file).
 *
 * Sur le site, scripts/build-site.mjs en fait un seul fichier (js/monde-worker.js, regroupé avec
 * les modules du moteur qu'il demande, un Worker classique) ; depuis le dépôt, la page le charge
 * comme un module (type: 'module').
 */
import { apercuDesBiomes, contexteSol, elementsSol, solDeRegion } from './engine/monde-sol.js';
import { tourneeDuPlan } from './engine/caleche-tournee.js';
import { imageDuMonde } from './engine/monde-carte.js';

let ctx = null;
const file = [];
let enCours = false;
let carteVoulue = false;   // la page a demandé l'image de la carte du monde (avant que les éléments soient tirés)

// L'image de la carte du monde (fiche 8), envoyée à la page.
function envoieCarte(c) {
  carteVoulue = false;
  try {
    const t0 = Date.now(), px = imageDuMonde(c);
    self.postMessage({ type: 'carte', graine: c.graine, carte: { l: c.cadre.LARGEUR, h: c.cadre.HAUTEUR, px, ms: Date.now() - t0 } }, [px.buffer]);
  } catch (e) {
    self.postMessage({ type: 'erreur', graine: c.graine, cle: 'carte', message: String((e && e.message) || e) });
  }
}

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
      self.postMessage({ type: 'region', graine: ctx.graine, region: r }, [r.couches.buffer, r.biome.buffer, r.marche.buffer, r.vegetation.images.buffer, r.vegetation.basses.buffer, r.roches.images.buffer, r.roches.basses.buffer, r.lieux.images.buffer, r.hameau.images.buffer, r.hameau.basses.buffer, r.faune.buffer]);
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
    carteVoulue = false;
    ctx = contexteSol(m.graine, m.cadre, m.ferme, m.taille);
    const a = apercuDesBiomes(ctx);
    self.postMessage({ type: 'apercu', graine: ctx.graine, apercu: a }, [a.biomes.buffer]);
    const c = ctx;
    setTimeout(() => {
      if (c !== ctx) return;
      try {
        elementsSol(c);
        // (la tournée de la calèche : les chemins du plan, ses arrêts, son horaire : fiche 7c)
        const cd = c.cadre, tournee = tourneeDuPlan({ W: cd.LARGEUR, chemins: c.elements.chemins, hameaux: c.elements.lieux.hameaux, sortie: cd.SORTIE, ferme: cd.FERME });
        self.postMessage({ type: 'pret', graine: c.graine, ms: c.mesures.elements, lieux: c.elements.lieux, hameaux: c.hameaux.plans, tournee });
        if (carteVoulue) envoieCarte(c);
      } catch (e) {
        self.postMessage({ type: 'erreur', graine: c.graine, cle: null, message: String((e && e.message) || e) });
      }
      suite();
    }, 0);
  } else if (m.type === 'carte' && ctx) {
    if (ctx.elements) envoieCarte(ctx); else carteVoulue = true;
  } else if (m.type === 'region' && ctx) {
    file.push({ ctx, rx: m.rx, ry: m.ry });
    if (ctx.elements) suite();
  }
};
