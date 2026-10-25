import { escapeHtml } from '../engine/format.js';
import { farmTerrain } from '../engine/terrain.js';
import { blocsPoses } from '../engine/blocs.js';
import { calecheMaintenant } from '../engine/caleche.js';
import { HAMEAUX } from '../engine/monde-hameaux.js';
import {
  butBoussole, caseVue, choisirBut, directionVers, lieuxDeLaCarte, partVue, vuDe,
} from '../engine/monde-vu.js';
import { setupPending } from '../engine/depart.js';
import { etapeDidacticiel } from '../engine/didacticiel.js';
import { state } from './store.js';
import { solDuMonde } from './monde-sol.js';
import { persistState } from './storage.js';
import { refresh } from './render.js';
import { notify } from './toasts.js';
import { registerActions } from './actions.js';
import { closeModal, openModal } from './modal.js';

/* ---------- la carte du monde (fiche 8) ----------

   Une fenêtre (le menu : « 🧭 Carte du monde » ; la touche M ; un appui sur la boussole) qui montre le
   grand monde vu, à petite échelle :
     - l'image du monde (js/engine/monde-carte.js : un pixel par case, les biomes, le relief, les eaux,
       les falaises, les chemins, les hameaux), faite dans le Web Worker du sol (js/ui/monde-sol.js :
       carte()) à la première ouverture, puis gardée ; la ferme par-dessus, d'après la partie (ses arbres,
       ses rochers, son eau et ses chemins, ce qui y est bâti, ses parcelles) ;
     - le brouillard par-dessus tout ce qui n'a pas été vu (js/engine/monde-vu.js : le vu de la partie),
       opaque sur toute cellule pas vue, ses bords adoucis sur le vu : rien de ce qui n'a pas été vu ne
       se devine ;
     - les lieux découverts (lieuxDeLaCarte : ceux dont la case est vue ; un hameau n'a son nom qu'une
       fois visité), avec leurs icônes et leurs noms ; la ferme ; le personnage et sa direction ; la
       calèche si elle est dans une partie vue ;
     - on la fait glisser (doigt, souris), on zoome (deux doigts, molette, les boutons + et −) ; ⌖ la
       recentre sur le personnage ; un appui sur un lieu le choisit : son nom, sa distance, et il devient,
       d'un bouton, le but de la boussole (state.monde.but : js/carte/ferme/boussole.js).
   Elle reste juste tant qu'elle est ouverte : le personnage et la calèche quatre fois par seconde, le
   brouillard et les lieux dès que le vu change (carteMondeVu, appelée par js/ui/stage.js). */

export const LIEUX_ICONES = { ferme: '🏡', hameau: '🏘️', grotte: '🕳️', peche: '🎣', caleche: '🐴' };
const ZOOM = { min: 0.5, max: 10, depart: 3, pas: 1.4 };
const BRUME = { tons: [[201, 208, 216], [226, 230, 234]], fond: '#c9d0d8', deborde: 2, flou: 1 };

let C = null;             // la carte ouverte : voir ouvrir()
let base = null;          // l'image du monde et de la ferme : { graine, cv } (refaite à chaque ouverture)

// (un point du monde, en cases → px de l'écran de la carte)
const versEcran = (x, y) => ({ x: (x - C.cx) * C.z + C.w / 2, y: (y - C.cy) * C.z + C.h / 2 });

// Le vu a changé (le personnage a marché) : la carte ouverte refait son brouillard et ses lieux.
export function carteMondeVu() {
  if (C) C.vuCle = null;
}

// Ouvre la carte du monde (rien sans grand monde, ou pendant la mise en place de la partie).
export function openCarteMonde() {
  const T = farmTerrain(state), sol = T.MONDE ? solDuMonde(T) : null;
  if (!T.FERME || !sol || setupPending(state)) { notify('La carte du monde n\'est pas encore là.', { kind: 'info' }); return; }
  openModal(`
    <button class="btn modal-close" type="button" data-action="close-modal">Fermer</button>
    <h2 id="carte-monde-titre"><span aria-hidden="true">🗺️</span> La carte du monde</h2>
    <div class="carte-monde-cadre">
      <canvas class="carte-monde-canevas" role="img" aria-label="La carte du monde : ce que tu en as vu"></canvas>
      <div class="carte-monde-reperes"></div>
      <div class="carte-monde-zoom">
        <button class="btn" type="button" data-action="carte-monde-zoom" data-sens="1" aria-label="Zoomer">+</button>
        <button class="btn" type="button" data-action="carte-monde-zoom" data-sens="-1" aria-label="Dézoomer">−</button>
        <button class="btn" type="button" data-action="carte-monde-centre" aria-label="Revenir au personnage" title="Revenir au personnage">⌖</button>
      </div>
      <p class="carte-monde-attente">La carte se dessine…</p>
    </div>
    <div class="carte-monde-info" aria-live="polite"></div>
    <p class="muted carte-monde-aide"></p>`, { className: 'modal bois carte-monde', labelledBy: 'carte-monde-titre', onClose: fermer, focus: '.carte-monde-zoom .btn' });
  ouvrir(T, sol);
}

function ouvrir(T, sol) {
  const dlg = document.querySelector('.carte-monde');
  const cadre = dlg.querySelector('.carte-monde-cadre'), cv = dlg.querySelector('.carte-monde-canevas');
  const p = window.FarmStage && FarmStage.perso ? FarmStage.perso() : null;
  const F = T.FERME;
  C = {
    T, sol, dlg, cadre, cv, g: cv.getContext('2d'), reperes: dlg.querySelector('.carte-monde-reperes'),
    w: 0, h: 0, z: ZOOM.depart,
    cx: p ? p.x / 16 : F.X + F.LARGEUR / 2, cy: p ? p.y / 16 : F.Y + F.HAUTEUR / 2,
    brume: null, vuCle: null, lieux: null, choix: null, pointeurs: new Map(), pince: null, glisse: null, elements: new Map(),
    sale: true, minuteur: 0, raf: 0, perso: p,
  };
  taille();
  centrerSurLeHameauMontre();
  C.ro = typeof ResizeObserver === 'function' ? new ResizeObserver(() => { taille(); C.sale = true; }) : null;
  if (C.ro) C.ro.observe(cadre);
  // l'image du monde : gardée par le sol du monde (js/ui/monde-sol.js), sinon demandée (le Worker la fait ;
  // elle arrive dans quelques dixièmes de seconde) ; la ferme y est repeinte à chaque ouverture (ce qui y a
  // été bâti depuis)
  if (base && base.graine !== T.MONDE.graine) base = null;
  const img = sol.carte((c) => { if (C && C.sol === sol) { faireBase(c); C.sale = true; } });
  if (img) faireBase(img);
  // le doigt, la souris, la molette
  cv.addEventListener('pointerdown', appui);
  cv.addEventListener('pointermove', bouge);
  cv.addEventListener('pointerup', leve);
  cv.addEventListener('pointercancel', leve);
  cv.addEventListener('wheel', molette, { passive: false });
  C.minuteur = setInterval(() => { if (C) C.sale = true; }, 250);   // (le personnage, la calèche)
  // (une autre fenêtre a pris sa place : la carte s'arrête)
  const boucle = () => { if (!C) return; if (!C.dlg.isConnected) { fermer(); return; } if (C.sale) dessine(); C.raf = requestAnimationFrame(boucle); };
  C.raf = requestAnimationFrame(boucle);
}

// (le didacticiel, fiche 9b : à l'étape du hameau, la carte s'ouvre sur lui et sur le personnage, les deux
// dans le cadre : le hameau que le cocher a montré, state.didacticiel.montre)
function centrerSurLeHameauMontre() {
  const d = state.didacticiel;
  if (etapeDidacticiel(state) !== 'hameau_choisir' || !d || typeof d.montre !== 'string') return;
  const h = ((C.sol.lieux() || {}).hameaux || []).find((x) => x.id === d.montre);
  if (!h) return;
  const W = C.T.LARGEUR, hx = (h.case % W) + 0.5, hy = Math.floor(h.case / W) + 0.5;
  const dx = Math.abs(hx - C.cx) + 8, dy = Math.abs(hy - C.cy) + 8;
  C.z = Math.max(ZOOM.min, Math.min(ZOOM.depart, (C.w * 0.8) / dx, (C.h * 0.8) / dy));
  C.cx = (hx + C.cx) / 2;
  C.cy = (hy + C.cy) / 2;
}

function fermer() {
  if (!C) return;
  cancelAnimationFrame(C.raf);
  clearInterval(C.minuteur);
  if (C.ro) C.ro.disconnect();
  C = null;
}

function taille() {
  const r = C.cadre.getBoundingClientRect(), k = window.devicePixelRatio || 1;
  C.w = Math.max(1, Math.round(r.width)); C.h = Math.max(1, Math.round(r.height));
  C.cv.width = Math.round(C.w * k); C.cv.height = Math.round(C.h * k);
  C.k = k;
}

// L'image du monde (le Worker) et la ferme de la partie par-dessus.
function faireBase(img) {
  const T = farmTerrain(state), cv = document.createElement('canvas');
  cv.width = img.l; cv.height = img.h;
  const g = cv.getContext('2d'), data = new ImageData(new Uint8ClampedArray(img.px), img.l, img.h);
  peintFerme(T, data.data, img.l);
  g.putImageData(data, 0, 0);
  base = { graine: T.MONDE.graine, cv };
}

// La ferme, case par case : son herbe (en deux tons, comme les prés), son eau et ses chemins (les coins
// de ses cases : T.MONDE.ferme.sommets), ses arbres et ses rochers (T.ARBRES, T.ROCHERS), ce que le joueur
// y a bâti (les blocs), ses parcelles.
function peintFerme(T, px, W) {
  const F = T.FERME, fv = F.LARGEUR + 1, S = T.MONDE.ferme.sommets;
  const met = (i, c) => { const o = i * 4; px[o] = c[0]; px[o + 1] = c[1]; px[o + 2] = c[2]; px[o + 3] = 255; };
  const herbe = [[136, 174, 70], [124, 164, 62]], eau = [74, 158, 214], chemin = [201, 164, 106], arbre = [[52, 96, 40], [40, 80, 32]], roche = [140, 132, 122];
  for (let y = 0; y < F.HAUTEUR; y++) {
    for (let x = 0; x < F.LARGEUR; x++) {
      const k = (dx, dy) => S[(y + dy) * fv + x + dx];
      const n = [k(0, 0), k(1, 0), k(0, 1), k(1, 1)], ne = n.filter((v) => v === 2).length, nc = n.filter((v) => v === 1).length;
      met((F.Y + y) * W + F.X + x, ne >= 2 ? eau : nc >= 2 ? chemin : herbe[(x * 7 + y * 13) % 5 ? 0 : 1]);
    }
  }
  for (const cases of Object.values(T.ARBRES || {})) for (const i of cases) met(i, arbre[(i * 31) % 3 ? 0 : 1]);
  for (const cases of Object.values(T.ROCHERS || {})) for (const i of cases) met(i, roche);
  for (const p of state.potager.parcelles || []) if (Number.isInteger(p.case)) met(p.case, [139, 90, 43]);
  for (const c of Object.keys(blocsPoses(state))) met(Number(c), [110, 72, 40]);
}

// Un bruit lent (une grille de 64 × 64 valeurs fixes, lue en douceur) : les nappes du brouillard.
const NB = 64;
const GRILLE = Float32Array.from({ length: NB * NB }, (_, i) => {
  let h = Math.imul(i ^ 0x9e3779b9, 2246822519);
  h = Math.imul(h ^ (h >>> 13), 3266489917);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
});
function bruit(x, y) {
  const xi = Math.floor(x), yi = Math.floor(y), fx = x - xi, fy = y - yi, ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy);
  const x0 = xi & (NB - 1), y0 = yi & (NB - 1), x1 = (x0 + 1) & (NB - 1), y1 = (y0 + 1) & (NB - 1);
  const a = GRILLE[y0 * NB + x0], b = GRILLE[y0 * NB + x1], c = GRILLE[y1 * NB + x0], d = GRILLE[y1 * NB + x1];
  return a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy;
}

// Le brouillard de la carte (une case sur deux : il est adouci à l'affichage) : opaque sur les cellules pas
// vues, étendu de BRUME.deborde points sur le vu puis flouté de BRUME.flou (rien ne se devine au bord).
function faireBrume(v) {
  const T = C.T, W2 = Math.ceil(T.LARGEUR / 2), H2 = Math.ceil(T.HAUTEUR / 2), n = W2 * H2;
  const a = new Float32Array(n), b = new Float32Array(n);
  for (let j = 0; j < H2; j++) {
    const cy = Math.floor((j * 2) / v.C);
    for (let i = 0; i < W2; i++) {
      const cx = Math.floor((i * 2) / v.C), k = cy * v.L + cx;
      a[j * W2 + i] = (v.bits[k >> 3] >> (k & 7)) & 1 ? 0 : 1;
    }
  }
  const passe = (src, dst, r, rangees, plusFort) => {
    const [lon, lar, pi, pj] = rangees ? [W2, H2, 1, W2] : [H2, W2, W2, 1];
    for (let j = 0; j < lar; j++) {
      for (let i = 0; i < lon; i++) {
        let s = 0;
        for (let d = -r; d <= r; d++) { const x = src[j * pj + Math.min(lon - 1, Math.max(0, i + d)) * pi]; if (plusFort) { if (x > s) s = x; } else s += x; }
        dst[j * pj + i * pi] = plusFort ? s : s / (2 * r + 1);
      }
    }
  };
  passe(a, b, BRUME.deborde, true, true); passe(b, a, BRUME.deborde, false, true);
  passe(a, b, BRUME.flou, true, false); passe(b, a, BRUME.flou, false, false);
  const cv = C.brume || document.createElement('canvas');
  cv.width = W2; cv.height = H2;
  const g = cv.getContext('2d'), img = g.createImageData(W2, H2), d = img.data;
  const [t0, t1] = BRUME.tons;
  for (let k = 0; k < n; k++) {
    const f = a[k], o = k * 4, i = k % W2, j = (k / W2) | 0;
    // (des nappes : deux tons, mêlés par deux bruits lents)
    const m = bruit(i / 11, j / 11) * 0.65 + bruit(i / 4 + 31, j / 4 + 17) * 0.35;
    d[o] = t0[0] + (t1[0] - t0[0]) * m; d[o + 1] = t0[1] + (t1[1] - t0[1]) * m; d[o + 2] = t0[2] + (t1[2] - t0[2]) * m;
    d[o + 3] = f >= 0.999 ? 255 : Math.round(f * f * (3 - 2 * f) * 255);
  }
  g.putImageData(img, 0, 0);
  C.brume = cv;
}

// La carte : l'image, le brouillard, puis les repères (le DOM).
function dessine() {
  C.sale = false;
  const v = vuDe(state, C.T);
  if (!v) return;
  const L = C.sol.lieux();
  if (C.vuCle !== v.vu || C.avecLieux !== !!L) {
    C.vuCle = v.vu;
    C.avecLieux = !!L;   // (les lieux du plan arrivent avec les éléments du Worker)
    faireBrume(v);
    C.lieux = lieuxDeLaCarte(state, L, C.T);
    C.dlg.querySelector('.carte-monde-aide').textContent = `Vu : ${Math.round(partVue(state, C.T) * 100)} % du monde. Glisse pour déplacer la carte, pince ou fais tourner la molette pour zoomer ; touche un lieu pour le choisir.`;
    C.infoCle = null;
  }
  const g = C.g, T = C.T;
  borne();
  g.setTransform(C.k, 0, 0, C.k, 0, 0);
  g.fillStyle = BRUME.fond;
  g.fillRect(0, 0, C.w, C.h);
  const o = versEcran(0, 0);
  const attente = C.dlg.querySelector('.carte-monde-attente');
  if (attente) attente.hidden = !!base;
  if (base) {
    g.imageSmoothingEnabled = C.z < 1;
    g.drawImage(base.cv, o.x, o.y, T.LARGEUR * C.z, T.HAUTEUR * C.z);
  }
  g.imageSmoothingEnabled = true;
  if (C.brume) g.drawImage(C.brume, o.x, o.y, C.brume.width * 2 * C.z, C.brume.height * 2 * C.z);
  reperes();
  info();
}

// La vue reste sur le monde.
function borne() {
  const T = C.T, zmin = Math.max(ZOOM.min, Math.min(C.w / T.LARGEUR, C.h / T.HAUTEUR) * 0.9);
  C.z = Math.max(zmin, Math.min(ZOOM.max, C.z));
  const mx = C.w / 2 / C.z, my = C.h / 2 / C.z;
  C.cx = T.LARGEUR <= 2 * mx ? T.LARGEUR / 2 : Math.max(mx, Math.min(T.LARGEUR - mx, C.cx));
  C.cy = T.HAUTEUR <= 2 * my ? T.HAUTEUR / 2 : Math.max(my, Math.min(T.HAUTEUR - my, C.cy));
}

// Les repères : la ferme, les lieux vus, la calèche (dans le vu), le personnage. Des boutons posés sur le
// canevas (leur nom à côté : les hameaux visités, le lieu choisi, le but de la boussole).
function reperes() {
  const T = C.T, W = T.LARGEUR, F = T.FERME, b = butBoussole(state);
  const liste = [{ sorte: 'ferme', id: 'ferme', nom: 'La ferme', x: F.X + F.LARGEUR / 2, y: F.Y + F.HAUTEUR / 2, nomme: C.z >= 2 }];
  const ajoute = (sorte, l, nomme) => liste.push({ sorte, id: l.id, nom: l.nom, x: (l.case % W) + 0.5, y: Math.floor(l.case / W) + 0.5, nomme });
  for (const l of C.lieux.grottes) ajoute('grotte', l, false);
  for (const l of C.lieux.peche) ajoute('peche', l, false);
  for (const l of C.lieux.hameaux) ajoute('hameau', l, l.connu);
  const e = calecheMaintenant(state);
  if (e && caseVue(state, Math.floor(e.y) * W + Math.floor(e.x), T)) liste.push({ sorte: 'caleche', id: 'caleche', nom: 'La calèche', x: e.x, y: e.y, nomme: false });
  const p = window.FarmStage && FarmStage.perso ? FarmStage.perso() : null;
  if (p) C.perso = p;
  // (chaque repère garde son élément d'une image à l'autre : seuls sa place et ce qui change sont touchés,
  // un appui en cours n'est jamais perdu)
  const vus = new Set();
  const repere = (cle, tag, faire) => {
    let el = C.elements.get(cle);
    if (!el) { el = document.createElement(tag); C.elements.set(cle, el); C.reperes.appendChild(el); faire(el); }
    vus.add(cle);
    return el;
  };
  const place = (el, s) => { const t = `translate(${Math.round(s.x)}px,${Math.round(s.y)}px)`; if (el.style.transform !== t) el.style.transform = t; };
  for (const r of liste) {
    const s = versEcran(r.x, r.y);
    if (s.x < -40 || s.y < -40 || s.x > C.w + 40 || s.y > C.h + 40) continue;
    const choisi = C.choix && C.choix.sorte === r.sorte && C.choix.id === r.id;
    const but = (b && b.sorte === r.sorte && b.id === r.id) || (!b && r.sorte === 'ferme');
    const nom = r.nomme || choisi || (but && r.sorte !== 'ferme') || C.z >= 6;
    const el = repere(r.sorte + ':' + r.id, 'button', (x) => {
      x.type = 'button';
      if (r.sorte !== 'caleche') { x.dataset.action = 'carte-monde-lieu'; x.dataset.sorte = r.sorte; x.dataset.id = r.id; } else x.tabIndex = -1;
    });
    const contenu = `${r.sorte}|${choisi}|${but}|${nom}|${r.nom}`;
    if (el.dataset.contenu !== contenu) {
      el.dataset.contenu = contenu;
      el.className = `carte-monde-repere ${r.sorte}${choisi ? ' choisi' : ''}${but ? ' but' : ''}`;
      el.setAttribute('aria-label', `${r.nom}${but ? ' (la boussole y mène)' : ''}`);
      el.innerHTML = `<span class="carte-monde-icone" aria-hidden="true">${LIEUX_ICONES[r.sorte]}</span>${nom ? `<span class="carte-monde-nom">${escapeHtml(r.nom)}</span>` : ''}`;
    }
    place(el, s);
  }
  if (C.perso) {
    const s = versEcran(C.perso.x / 16, C.perso.y / 16), f = C.perso;
    const angle = f.face === 'haut' ? -90 : f.face === 'bas' ? 90 : f.flip ? 180 : 0;
    const el = repere('perso', 'span', (x) => { x.className = 'carte-monde-perso'; x.setAttribute('role', 'img'); x.setAttribute('aria-label', 'Toi'); x.innerHTML = '<span class="carte-monde-fleche"></span>'; });
    place(el, s);
    const t = `rotate(${angle}deg)`, fl = el.firstChild;
    if (fl.style.transform !== t) fl.style.transform = t;
  }
  for (const [cle, el] of C.elements) if (!vus.has(cle)) { el.remove(); C.elements.delete(cle); }
}

// Le bandeau du bas : le lieu choisi (son nom, sa distance, le bouton de la boussole), sinon le but de la
// boussole.
function info() {
  const b = butBoussole(state), c = C.choix, p = C.perso, T = C.T, W = T.LARGEUR;
  const cle = JSON.stringify([b, c, p ? [Math.round(p.x / 64), Math.round(p.y / 64)] : null, C.vuCle && C.vuCle.length, state.monde && state.monde.boussole]);
  if (cle === C.infoCle) return;
  C.infoCle = cle;
  const el = C.dlg.querySelector('.carte-monde-info');
  const loin = (x, y) => (p ? ` · à ${directionVers(p.x / 16, p.y / 16, x, y).distance} cases` : '');
  let html = '';
  if (c) {
    const r = trouve(c);
    if (!r) { C.choix = null; C.infoCle = null; return; }
    const quoi = c.sorte === 'ferme' ? 'Ta ferme' : c.sorte === 'hameau' ? (r.connu ? `Un hameau ${HAMEAUX.STYLES[(state.monde.hameaux[r.id] || {}).style] ? HAMEAUX.STYLES[state.monde.hameaux[r.id].style].nom : ''}` : 'Un hameau que tu n\'as pas encore visité') : c.sorte === 'grotte' ? 'L\'entrée d\'une grotte de la montagne' : 'Un coin de pêche : plus de touches, un poisson rare';
    const estBut = c.sorte === 'ferme' ? !b : !!(b && b.sorte === c.sorte && b.id === c.id);
    const x = c.sorte === 'ferme' ? T.FERME.X + T.FERME.LARGEUR / 2 : (r.case % W) + 0.5, y = c.sorte === 'ferme' ? T.FERME.Y + T.FERME.HAUTEUR / 2 : Math.floor(r.case / W) + 0.5;
    html = `<span class="carte-monde-info-nom"><span aria-hidden="true">${LIEUX_ICONES[c.sorte]}</span> <strong>${escapeHtml(r.nom)}</strong></span><span class="muted">${escapeHtml(quoi)}${loin(x, y)}</span>`
      + (estBut ? '<span class="carte-monde-info-but">🧭 La boussole y mène</span>'
        : c.sorte === 'ferme' ? '<button class="btn" type="button" data-action="carte-monde-ferme">🧭 Revenir à la ferme</button>'
          : '<button class="btn primary" type="button" data-action="carte-monde-but">🧭 Y mener la boussole</button>');
  } else {
    const r = b ? trouve(b) : null;
    html = r ? `<span>🧭 La boussole mène à <strong>${escapeHtml(r.nom)}</strong>.</span><button class="btn" type="button" data-action="carte-monde-ferme">Revenir à la ferme</button>`
      : '<span>🧭 La boussole montre la ferme. Touche un lieu pour qu\'elle y mène.</span>';
  }
  if (state.monde && state.monde.boussole === false) html += '<span class="muted">(la boussole est cachée : Options)</span>';
  el.innerHTML = html;
}

// Un lieu de la carte ({ sorte, id }) parmi ceux qu'elle montre, ou null.
function trouve(q) {
  if (q.sorte === 'ferme') return { id: 'ferme', nom: 'La ferme' };
  const L = C.lieux || lieuxDeLaCarte(state, C.sol.lieux(), C.T);
  return (q.sorte === 'hameau' ? L.hameaux : q.sorte === 'grotte' ? L.grottes : L.peche).find((l) => l.id === q.id) || null;
}

/* ---------- le doigt, la souris ---------- */

function appui(e) {
  C.cv.setPointerCapture(e.pointerId);
  C.pointeurs.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (C.pointeurs.size === 2) {
    const [a, b] = [...C.pointeurs.values()];
    C.pince = { d: Math.hypot(a.x - b.x, a.y - b.y), z: C.z };
    C.glisse = null;
  } else C.glisse = { x: e.clientX, y: e.clientY, cx: C.cx, cy: C.cy, bouge: false };
}

function bouge(e) {
  if (!C.pointeurs.has(e.pointerId)) return;
  C.pointeurs.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (C.pince && C.pointeurs.size >= 2) {
    const [a, b] = [...C.pointeurs.values()], r = C.cv.getBoundingClientRect();
    zoomEn(C.pince.z * Math.hypot(a.x - b.x, a.y - b.y) / Math.max(1, C.pince.d), (a.x + b.x) / 2 - r.left, (a.y + b.y) / 2 - r.top);
    return;
  }
  const G = C.glisse;
  if (!G) return;
  if (Math.hypot(e.clientX - G.x, e.clientY - G.y) > 4) G.bouge = true;
  C.cx = G.cx - (e.clientX - G.x) / C.z;
  C.cy = G.cy - (e.clientY - G.y) / C.z;
  C.sale = true;
}

function leve(e) {
  const G = C.glisse;
  C.pointeurs.delete(e.pointerId);
  if (C.pointeurs.size < 2) C.pince = null;
  if (C.pointeurs.size === 0) C.glisse = null;
  // un appui sur la carte, hors des repères : le choix s'efface
  if (G && !G.bouge && e.type === 'pointerup') { C.choix = null; C.sale = true; }
}

function molette(e) {
  e.preventDefault();
  const r = C.cv.getBoundingClientRect();
  zoomEn(C.z * Math.pow(ZOOM.pas, -Math.sign(e.deltaY || 0)), e.clientX - r.left, e.clientY - r.top);
}

// Zoome à `z`, le point (sx, sy) de l'écran de la carte restant où il est.
function zoomEn(z, sx = C.w / 2, sy = C.h / 2) {
  const x = C.cx + (sx - C.w / 2) / C.z, y = C.cy + (sy - C.h / 2) / C.z;
  C.z = Math.max(ZOOM.min, Math.min(ZOOM.max, z));
  borne();
  C.cx = x - (sx - C.w / 2) / C.z;
  C.cy = y - (sy - C.h / 2) / C.z;
  C.sale = true;
}

// La touche M ouvre et ferme la carte du monde (pas dans un champ de saisie, ni avec une autre touche).
document.addEventListener('keydown', (e) => {
  if (e.key !== 'm' && e.key !== 'M') return;
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  const t = e.target;
  if (t && (t.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(t.tagName))) return;
  if (C && C.dlg.isConnected) { e.preventDefault(); closeModal(); return; }
  if (document.getElementById('modal-root').childElementCount > 0 || !state || setupPending(state)) return;
  if (!document.getElementById('farm-stage') || document.getElementById('farm-stage').hidden) return;
  e.preventDefault();
  openCarteMonde();
  refresh();   // (le didacticiel, fiche 9b : son étape « carte » passe)
});

/* ---------- actions de cet écran (voir ui/actions.js) ---------- */

registerActions({
  'carte-monde-open': () => {
    if (C && C.dlg.isConnected) return;
    fermer();
    openCarteMonde();
    refresh();   // (le didacticiel, fiche 9b : son étape « carte » passe)
  },
  'carte-monde-zoom': (target) => {
    if (C) zoomEn(C.z * (Number(target.dataset.sens) > 0 ? ZOOM.pas : 1 / ZOOM.pas));
  },
  'carte-monde-centre': () => {
    if (!C) return;
    const p = window.FarmStage && FarmStage.perso ? FarmStage.perso() : C.perso;
    if (p) { C.cx = p.x / 16; C.cy = p.y / 16; C.sale = true; }
  },
  'carte-monde-lieu': (target) => {
    if (!C) return;
    C.choix = { sorte: target.dataset.sorte, id: target.dataset.id };
    C.sale = true;
    refresh();   // (le didacticiel montre alors « Y mener la boussole »)
  },
  'carte-monde-but': () => {
    if (!C || !C.choix) return;
    const r = choisirBut(state, C.choix, C.sol.lieux());
    if (!r.ok) { notify(r.error, { kind: 'info' }); return; }
    const l = trouve(C.choix);
    notify(`🧭 La boussole mène à ${l ? l.nom : 'ce lieu'}.`, { kind: 'info' });
    persistState();
    C.infoCle = null; C.sale = true;
    refresh();
  },
  'carte-monde-ferme': () => {
    choisirBut(state, null);
    persistState();
    if (C) { C.infoCle = null; C.sale = true; }
    refresh();
  },
});

// (pour les essais et les mesures : la carte ouverte)
export function carteMondeEtat() {
  return C ? { z: C.z, cx: C.cx, cy: C.cy, base: !!base, lieux: C.lieux, choix: C.choix } : null;
}
