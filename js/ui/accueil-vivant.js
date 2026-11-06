/* ---------- la grande ferme vivante de l'écran d'accueil (js/ui/ecran-titre.js) ----------
   La capture de la grande ferme, préparée par scripts/accueil/vivant.py : son fond, sans ce qui bouge
   (assets/accueil/fond.webp), et ce qui bouge, redessiné à chaque image dans un canvas, en pixels nets
   (un pixel du jeu : S pixels de l'écran, S entier) :
     - la voilure du Moulin, celle du jeu (FermeCarte.voilure, js/carte/ferme/moulin.js), qui tourne ;
     - les têtes des tournesols (assets/accueil/tetes.png), qui se balancent au vent, en vagues ;
     - le chat de la famille (assets/chat.png, les images du jeu) : il marche le long de la clôture, s'assoit,
       fait sa toilette, se couche, repart ;
     - des papillons autour des fleurs, l'ombre des nuages qui glisse sur la ferme, de temps en temps un vol
       d'oiseaux.
   La vue glisse lentement de gauche à droite et revient. Sans animation (prefers-reduced-motion) : une image
   fixe. animerFerme(canvas) → arrêter(). */
import { VIVANT } from './accueil-vivant.generated.js';

const RAPPORT = 2.4;              // la hauteur de l'écran montre 1000 / RAPPORT px de la capture (environ)
const CENTRE = { x: 1730, y: 490 };   // le milieu de la vue : le Moulin, ses tournesols, le chat
const BALADE = { ampleur: 110, periode: 60 };   // la vue glisse de ± ampleur px en `periode` s

// Le chat : une boucle de gestes, le long de la clôture (y : le haut de sa case de 16 px), de gauche à droite
// puis retour. marche : jusqu'à x, à `vitesse` px/s ; les autres : `duree` s. Ses images : assets/chat.png.
const CHAT_IMAGES = { idle: 0, marche0: 1, marche1: 2, assis: 3, leche: 4, couche: 5, boule0: 6, boule1: 7 };
const CHAT_VITESSE = 14;
const CHAT_GESTES = [
  { quoi: 'marche', x: 1846 }, { quoi: 'idle', duree: 1.2 }, { quoi: 'assis', duree: 2.5 }, { quoi: 'toilette', duree: 3.5 },
  { quoi: 'assis', duree: 1.5 }, { quoi: 'marche', x: 1784 }, { quoi: 'idle', duree: 1 }, { quoi: 'couche', duree: 3 },
  { quoi: 'dort', duree: 5 }, { quoi: 'couche', duree: 1 }, { quoi: 'idle', duree: 0.8 },
];

const charger = (src) => new Promise((ok, non) => { const i = new Image(); i.onload = () => ok(i); i.onerror = non; i.src = src; });
const versionne = (f) => { const v = window.FERME_ASSET_VERSIONS && window.FERME_ASSET_VERSIONS[f]; return `assets/${f}${v ? `?v=${v}` : ''}`; };
const reduit = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

// Le chat au temps t (s) : { x, y, image, gauche }.
function chatA(t) {
  const y = VIVANT.chat.y;
  // la durée de chaque geste (la marche : la distance depuis la position d'avant)
  let x = VIVANT.chat.x, total = 0;
  const etapes = CHAT_GESTES.map((g) => {
    const d = g.quoi === 'marche' ? Math.abs(g.x - x) / CHAT_VITESSE : g.duree;
    const e = { ...g, de: x, debut: total, duree: d };
    if (g.quoi === 'marche') x = g.x;
    total += d;
    return e;
  });
  // (la boucle revient au départ : la dernière marche ramène à VIVANT.chat.x)
  const u = t % total;
  const e = etapes.find((k) => u < k.debut + k.duree) || etapes[etapes.length - 1];
  const dt = u - e.debut;
  if (e.quoi === 'marche') {
    const sens = Math.sign(e.x - e.de) || 1;
    return { x: Math.round(e.de + sens * Math.min(Math.abs(e.x - e.de), dt * CHAT_VITESSE)), y, image: Math.floor(dt / 0.16) % 2 ? 'marche1' : 'marche0', gauche: sens < 0 };
  }
  const avant = etapes[(etapes.indexOf(e) + etapes.length - 1) % etapes.length];
  const gauche = !!(avant && avant.quoi === 'marche' && avant.x < avant.de);
  const ici = etapes.slice(0, etapes.indexOf(e)).reduce((p, k) => (k.quoi === 'marche' ? k.x : p), VIVANT.chat.x);
  const image = e.quoi === 'toilette' ? (Math.floor(dt / 0.45) % 2 ? 'leche' : 'assis')
    : e.quoi === 'dort' ? (Math.floor(dt / 1.2) % 2 ? 'boule1' : 'boule0') : e.quoi;
  return { x: ici, y, image, gauche };
}

// Les papillons : autour des tournesols, chacun sa boucle (centre, rayons, vitesse, couleur).
const PAPILLONS = [
  { cx: 1500, cy: 470, rx: 26, ry: 14, v: 0.31, c: '#fff6d8' },
  { cx: 1626, cy: 462, rx: 30, ry: 12, v: 0.27, c: '#f6c94a' },
  { cx: 1820, cy: 505, rx: 34, ry: 10, v: 0.22, c: '#ffffff' },
];
// Les nuages : leur ombre, de grandes taches douces qui glissent vers la droite.
const NUAGES = [
  { y: 380, r: 150, v: 9, d: 0 }, { y: 600, r: 190, v: 7, d: 900 }, { y: 470, r: 120, v: 11, d: 1700 },
];

export function animerFerme(canvas) {
  const g = canvas.getContext('2d');
  let fini = false, raf = 0;
  const debut = performance.now();
  const voilure = window.FermeCarte && window.FermeCarte.voilure;
  const planche = voilure ? voilure.planche() : null;
  Promise.all([charger(versionne('accueil/fond.webp')), charger(versionne('accueil/tetes.png')), charger(versionne('chat.png'))])
    .then(([fond, tetes, chat]) => {
      if (fini) return;
      canvas.classList.add('pret');
      const image = (now) => {
        if (fini) return;
        dessiner(g, canvas, { fond, tetes, chat, planche, voilure }, reduit() ? 0 : (now - debut) / 1000);
        if (!reduit()) raf = requestAnimationFrame(image);
      };
      raf = requestAnimationFrame(image);
      window.addEventListener('resize', () => { if (reduit() && !fini) requestAnimationFrame(image); });
    })
    .catch(() => { /* sans les images : le fond vert de l'écran */ });
  return () => { fini = true; cancelAnimationFrame(raf); };
}

function dessiner(g, canvas, im, t) {
  const dpr = window.devicePixelRatio || 1;
  const L = Math.round(canvas.clientWidth * dpr), H = Math.round(canvas.clientHeight * dpr);
  if (canvas.width !== L || canvas.height !== H) { canvas.width = L; canvas.height = H; }
  const S = Math.max(1, Math.round((H * RAPPORT) / 1000));          // px de l'écran par px du jeu
  const [W0, H0] = VIVANT.taille;
  // le coin haut-gauche de la vue, en px du jeu (fractionnaire : la vue glisse d'un pixel de l'écran à la fois)
  const vx = Math.min(W0 - L / S, Math.max(0, CENTRE.x + BALADE.ampleur * Math.sin((t * 2 * Math.PI) / BALADE.periode) - L / S / 2));
  const vy = Math.min(H0 - H / S, Math.max(0, CENTRE.y - H / S / 2));
  const ox = Math.floor(vx), oy = Math.floor(vy);
  const dx = -Math.round((vx - ox) * S), dy = -Math.round((vy - oy) * S);
  const ecran = (x, y) => [dx + (x - ox) * S, dy + (y - oy) * S];
  g.imageSmoothingEnabled = false;
  g.drawImage(im.fond, ox, oy, Math.ceil(L / S) + 2, Math.ceil(H / S) + 2, dx, dy, (Math.ceil(L / S) + 2) * S, (Math.ceil(H / S) + 2) * S);

  // les têtes des tournesols : d'un pixel, à gauche ou à droite, en vagues (le vent passe d'ouest en est)
  for (const h of VIVANT.tetes) {
    const vent = Math.sin(t * 1.7 - h.x * 0.045) + 0.35 * Math.sin(t * 0.6 + h.y * 0.1);
    const d = vent > 0.55 ? 1 : vent < -0.75 ? -1 : 0;
    const [X, Y] = ecran(h.x + d, h.y);
    g.drawImage(im.tetes, h.sx, 0, h.l, h.h, X, Y, h.l * S, h.h * S);
  }

  // la voilure du Moulin, qui tourne (le sens inverse des aiguilles d'une montre, comme dans le jeu)
  if (im.planche && im.voilure) {
    const n = im.voilure.taille, f = Math.floor(t * im.voilure.vitesse * 4 * im.voilure.images) % im.voilure.images;
    const [X, Y] = ecran(VIVANT.moulin[0] - (n - 1) / 2, VIVANT.moulin[1] - (n - 1) / 2);
    g.drawImage(im.planche, f * n, 0, n, n, X, Y, n * S, n * S);
  }

  // le chat
  const c = chatA(t), k = CHAT_IMAGES[c.image];
  const [cx, cy] = ecran(c.x, c.y);
  if (c.gauche) {
    g.save(); g.translate(cx + 16 * S, cy); g.scale(-1, 1);
    g.drawImage(im.chat, k * 16, 0, 16, 16, 0, 0, 16 * S, 16 * S);
    g.restore();
  } else g.drawImage(im.chat, k * 16, 0, 16, 16, cx, cy, 16 * S, 16 * S);

  // les papillons : deux ailes de 1 px qui battent, une boucle en huit
  for (const p of PAPILLONS) {
    const a = t * p.v * 2 * Math.PI;
    const x = Math.round(p.cx + p.rx * Math.sin(a)), y = Math.round(p.cy + p.ry * Math.sin(2 * a) - 2 * Math.abs(Math.sin(t * 5 + p.cx)));
    const ouvert = Math.floor(t * 9 + p.cx) % 2 === 0;
    const [X, Y] = ecran(x, y);
    g.fillStyle = p.c;
    if (ouvert) { g.fillRect(X - S, Y, S, S); g.fillRect(X + S, Y, S, S); } else { g.fillRect(X, Y - S, S, S); }
    g.fillStyle = '#3a2414';
    g.fillRect(X, Y, S, S);
  }

  // un vol d'oiseaux, toutes les 25 s : un V de petites silhouettes qui battent des ailes
  const vol = t % 25;
  if (vol < 9) {
    for (let i = 0; i < 5; i++) {
      const x = Math.round(vx - 20 + vol * ((L / S + 60) / 9) - Math.abs(i - 2) * 7), y = Math.round(vy + H / S * 0.3 + Math.abs(i - 2) * 5 + Math.sin(t * 2 + i) * 1.5);
      const [X, Y] = ecran(x, y), haut = Math.floor(t * 6 + i) % 2;
      g.fillStyle = '#2b2118';
      g.fillRect(X, Y, S, S);
      g.fillRect(X - S, Y - (haut ? S : 0), S, S);
      g.fillRect(X + S, Y - (haut ? S : 0), S, S);
    }
  }

  // l'ombre des nuages
  for (const n of NUAGES) {
    const x = ((n.d + t * n.v) % (W0 + 2 * n.r)) - n.r;
    const [X, Y] = ecran(x, n.y);
    const r = n.r * S;
    const grad = g.createRadialGradient(X, Y, 0, X, Y, r);
    grad.addColorStop(0, 'rgba(20, 30, 40, 0.16)');
    grad.addColorStop(1, 'rgba(20, 30, 40, 0)');
    g.fillStyle = grad;
    g.beginPath(); g.ellipse(X, Y, r, r * 0.55, 0, 0, 2 * Math.PI); g.fill();
  }
}
