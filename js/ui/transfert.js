/* ---------- la partie d'avant : retrouvée à l'ancienne adresse du jeu ----------
   Le jeu était publié à https://aluzy.github.io/family_farm/ ; il l'est à https://moonbloom-village.com. Le navigateur
   range ce qu'un site enregistre (localStorage) par adresse : la partie jouée à l'ancienne adresse y est toujours, mais
   le jeu ne peut pas la lire d'ici, et l'ancienne adresse du jeu renvoie tout de suite vers la nouvelle (GitHub Pages).

   La page pont (pont-ancienne-adresse/index.html, publiée par le dépôt aluzy.github.io à https://aluzy.github.io/, la
   même adresse que l'ancien jeu pour le navigateur) lit ce que l'ancien jeu avait enregistré et revient ici avec, dans
   la fin de l'adresse (#transfert=…, jamais envoyée à un serveur). lireTransfert() la lit, au démarrage
   (js/main.js), et l'efface de l'adresse :
     #transfert=z<base64url>   les données compressées (deflate-raw), j<base64url> : sans compression ;
     les données : { v: 1, cles: { 'ferme-save': '…', 'ferme-son': '…', … } }, ou { v: 1, vide: true } (rien trouvé).
   La partie retrouvée remplace celle d'ici si elle n'est pas commencée ; sinon, l'écran d'accueil demande laquelle
   garder (js/ui/ecran-titre.js) ; l'autre reste sur l'appareil (AVANT_TRANSFERT). Les réglages (le son, la qualité…)
   ne sont repris que s'ils manquent ici. */

import { SAVE_KEY } from './store.js';
import { safeStorageGet, safeStorageSet } from './storage.js';

export const PONT = 'https://aluzy.github.io/';
export const AVANT_TRANSFERT = 'ferme-save-avant-transfert';
// Ce que la page pont peut apporter (les autres clés sont ignorées : un compte, le consentement, le mode test…).
const CLES = ['ferme-save', 'ferme-save-avant-demenagement', 'ferme-position', 'ferme-son', 'ferme-qualite', 'ferme-carte-glissee',
  'ferme-construire-favoris', 'ferme-construire-outils', 'ferme-construire-recents', 'ferme-planches'];
const MAX = 4 * 1024 * 1024;   // (4 Mo de texte au plus)

// Le lien vers la page pont, avec l'adresse où revenir (celle du jeu, sans sa fin).
export function lienPont() {
  return `${PONT}?retour=${encodeURIComponent(location.origin + location.pathname)}`;
}

// Le bouton « Retrouver ma partie d'avant » : sur le site publié (et en local, pour les essais).
export function pontPossible(host = typeof location !== 'undefined' ? location.hostname : '') {
  return ['moonbloom-village.com', 'www.moonbloom-village.com', 'localhost', '127.0.0.1'].includes(host);
}

function octets(b64url) {
  const b64 = b64url.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((b64url.length + 3) % 4);
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function decoder(code) {
  const sorte = code[0], b = octets(code.slice(1));
  if (sorte === 'j') return new TextDecoder().decode(b);
  if (sorte !== 'z' || typeof DecompressionStream === 'undefined') throw new Error('format inconnu');
  const flux = new Blob([b]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
  return new Response(flux).text();
}

// → null (pas de transfert dans l'adresse), { vide: true } (rien à l'ancienne adresse), { erreur: true }, ou
// { cles } (les clés retrouvées, dont 'ferme-save'). L'adresse est nettoyée dans tous les cas.
export async function lireTransfert() {
  if (typeof location === 'undefined' || !location.hash.startsWith('#transfert=')) return null;
  const code = location.hash.slice('#transfert='.length);
  try { history.replaceState(null, '', location.pathname + location.search); } catch (e) { /* (rien) */ }
  try {
    const texte = await decoder(code);
    if (texte.length > MAX) throw new Error('trop grand');
    const d = JSON.parse(texte);
    if (!d || d.v !== 1) throw new Error('version');
    if (d.vide || !d.cles || typeof d.cles['ferme-save'] !== 'string') return { vide: true };
    // (la partie doit être une partie : un objet avec son état)
    const p = JSON.parse(d.cles['ferme-save']);
    if (!p || typeof p !== 'object' || !p.s) throw new Error('pas une partie');
    const cles = {};
    for (const k of CLES) if (typeof d.cles[k] === 'string') cles[k] = d.cles[k];
    return { cles };
  } catch (e) {
    return { erreur: true };
  }
}

// La partie retrouvée prend la place de celle d'ici (gardée sur l'appareil, AVANT_TRANSFERT) ; les réglages
// manquants ici sont repris.
export function adopterTransfert(t) {
  const ici = safeStorageGet(SAVE_KEY);
  if (ici && ici !== t.cles['ferme-save']) safeStorageSet(AVANT_TRANSFERT, ici);
  safeStorageSet(SAVE_KEY, t.cles['ferme-save']);
  for (const [k, v] of Object.entries(t.cles)) if (k !== SAVE_KEY && safeStorageGet(k) === null) safeStorageSet(k, v);
}

// On garde la partie d'ici : la partie retrouvée reste quand même sur l'appareil (AVANT_TRANSFERT).
export function garderIci(t) {
  safeStorageSet(AVANT_TRANSFERT, t.cles['ferme-save']);
}
