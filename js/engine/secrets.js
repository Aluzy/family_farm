/* ---------- D-2 : les secrets du monde (docs/phase-4.md ; data/secrets.json, SECRETS) ----------
   Le plan du monde pose des lieux remarquables, tirés de sa graine selon les biomes (monde-gen.js, lieux.secrets :
   { id, sorte, case }) : la ruine, le cairn, l'arbre ancien, le belvédère, la pierre levée. On les voit sur la carte
   (monde-lieux.js) ; les toucher (ouvrirSecret, js/ui/stage.js) :
     - la première fois, il s'ouvre : un petit trésor (TRESORS de sa sorte), ou une page du carnet du voyageur
       (PAGES, dans l'ordre, PART_PAGE des fois tant qu'il en reste) ; le belvédère montre le pays tout autour
       (VUE cases, monde-vu.js montrerLieu) ;
     - ensuite, une phrase (il a déjà donné son secret).
   La page de l'encyclopédie de sa sorte se découvre (« secret:<sorte> »), celle d'une page du carnet aussi
   (« secret:<page> »). Ce qu'il donne se tire de la graine de la ferme et du secret (pas de hasard caché).

   state.secrets = { ouverts: { [id]: jour }, pages: [page…] }. Rien dans un monde partagé (la ferme seule). */

import { DATA } from './catalog.js';
import { mulberry32 } from './base.js';
import { hache } from './ferme-generee.js';
import { farmSeed } from './terrain.js';
import { addItem } from './inventory.js';
import { earn } from './compta.js';
import { noterEncyclopedie } from './encyclopedie.js';
import { montrerLieu } from './monde-vu.js';

const S = () => DATA.SECRETS;
const objet = (v) => !!v && typeof v === 'object' && !Array.isArray(v);

export function secretsDe(state) {
  if (!objet(state.secrets)) state.secrets = {};
  const s = state.secrets;
  if (!objet(s.ouverts)) s.ouverts = {};
  if (!Array.isArray(s.pages)) s.pages = [];
  return s;
}

// Le nom et l'icône d'une sorte de secret : { icone, nom } (« une vieille ruine »).
export function nomSecret(sorte) {
  const [icone, nom] = S().NOMS[sorte] || ['✨', 'un lieu étrange'];
  return { icone, nom };
}

// Le secret `id` est-il ouvert ?
export function secretOuvert(state, id) {
  return !!(objet(state.secrets) && objet(state.secrets.ouverts) && state.secrets.ouverts[id]);
}

// Combien de secrets ouverts, et de pages trouvées.
export function bilanSecrets(state) {
  const s = objet(state.secrets) ? state.secrets : {};
  return { ouverts: Object.keys(objet(s.ouverts) ? s.ouverts : {}).length, pages: Array.isArray(s.pages) ? s.pages.length : 0, pagesTotal: S().PAGES.length };
}

const rngDe = (state, id) => mulberry32(hache(`${farmSeed(state)}:secret:${id}`));
const un = (rnd, liste) => (liste && liste.length ? liste[Math.floor(rnd() * liste.length)] : '');

// Toucher le secret `l` ({ id, sorte, case }). → { ok, deja?, texte, icone, nom, tresor?: { item, n } | { pieces },
// page?: id, vue?: cellules découvertes } ; null : pas de secret ici (ou un monde partagé).
export function ouvrirSecret(state, l) {
  if (state.mondePartage || !l || typeof l.id !== 'string' || !S().NOMS[l.sorte]) return null;
  const s = secretsDe(state), T = S().TEXTES[l.sorte] || {}, { icone, nom } = nomSecret(l.sorte);
  const rnd = rngDe(state, l.id);
  if (s.ouverts[l.id]) return { ok: true, deja: true, icone, nom, texte: un(mulberry32(hache(`${l.id}:${state.day}`)), T.deja) };
  s.ouverts[l.id] = state.day;
  noterEncyclopedie(state, `secret:${l.sorte}`);
  const out = { ok: true, icone, nom, texte: un(rnd, T.trouve) };
  if (l.sorte === 'belvedere') {
    out.vue = Number.isInteger(l.case) ? montrerLieu(state, l.case, S().VUE) : 0;
    return out;
  }
  // une page du carnet, tant qu'il en reste (dans l'ordre), PART_PAGE des fois ; sinon un trésor
  const reste = S().PAGES.filter((p) => !s.pages.includes(p));
  if (reste.length && rnd() < S().PART_PAGE) {
    out.page = reste[0];
    s.pages.push(out.page);
    noterEncyclopedie(state, `secret:${out.page}`);
    return out;
  }
  const [item, a, b] = un(rnd, S().TRESORS[l.sorte]) || ['pieces', 50, 50];
  const n = a + Math.floor(rnd() * (b - a + 1));
  if (item === 'pieces') { earn(state, n, `Trésor : ${nom}`); out.tresor = { pieces: n }; }
  else if (DATA.OBJETS[item]) { addItem(state, item, n); out.tresor = { item, n }; }
  return out;
}
