#!/usr/bin/env node
// Régénère encyclopedie.html à partir de encyclopedie_ferme_familiale.json.
//
// Le JSON fait foi pour le contenu (catégories, termes, descriptions, liens) ;
// la page garde sa mise en forme, son en-tête, son pied et sa recherche. Seuls
// le menu des catégories et les sections de <main> sont réécrits.
//
// Les descriptions peuvent citer les données du jeu (data/*.json) : {{DATA.chemin}} y
// devient la valeur (un nombre est écrit à la française : « 1 500 »), et quelques
// comptes ont un nom court (VALEURS : {{nb_technologies}}, {{nb_branches}}…). Ainsi,
// l'encyclopédie suit les données sans être réécrite. Une valeur introuvable est une erreur.
//
// Le jeu a aussi son encyclopédie, qui se remplit au fil de la partie (js/ui/encyclopedie.js) :
// ce script en écrit les entrées, descriptions remplies, dans js/encyclopedie.generated.js.
// Chaque entrée dit quand elle se découvre (« decouverte » : des conditions, voir
// js/engine/decouverte.js) ; une condition inconnue est une erreur.
//
// Fiche 14 : les pages des bêtes montrent leur dessin d'aujourd'hui, pris dans les planches du jeu
// (« visuels » : une case de la planche, lue ici dans assets/ ; voir VISUELS plus bas) : les bêtes de
// la ferme et le cheval (scripts/carte/betes.py, scripts/personnage/cheval.py), la faune du grand monde
// (scripts/carte/faune.py, assets/faune.json : les cases par leur nom) ; la page de la pêche, les icônes
// de ses poissons (« icones », celles du jeu). Une planche ou une case introuvable est une erreur.
//
// Usage : node scripts/build-encyclopedie.mjs          (réécrit encyclopedie.html et js/encyclopedie.generated.js)
//         node scripts/build-encyclopedie.mjs --check  (vérifie qu'ils sont à jour, sans écrire)

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { DATA } from '../js/engine/catalog.js';
import { formatNumber } from '../js/engine/format.js';
import { erreurCondition } from '../js/engine/decouverte.js';

const here = join(dirname(fileURLToPath(import.meta.url)), '..');
const jsonPath = join(here, 'encyclopedie_ferme_familiale.json');
const assets = join(here, 'assets');
const htmlPath = join(here, 'encyclopedie.html');
const jeuPath = join(here, 'js', 'encyclopedie.generated.js');

const data = JSON.parse(readFileSync(jsonPath, 'utf8'));
const page = readFileSync(htmlPath, 'utf8');

const esc = (s) => String(s)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#x27;');

// Les comptes qu'une description peut citer par leur nom : {{nb_technologies}}.
const VALEURS = {
  nb_technologies: Object.keys(DATA.ARBRE.noeuds).length,
  nb_branches: DATA.ARBRE.branches.length,
  nb_paliers: Object.keys(DATA.ARBRE.PALIERS).length,
  nb_chapitres: DATA.CHAPITRES.liste.length,
};

// Remplace {{nom}} (VALEURS) et {{DATA.chemin.vers.valeur}} dans le texte de l'entrée `id`.
function remplir(texte, id) {
  return String(texte).replace(/\{\{([\w.]+)\}\}/g, (m, cle) => {
    let v;
    if (cle.startsWith('DATA.')) v = cle.split('.').slice(1).reduce((o, k) => (o == null ? undefined : o[k]), DATA);
    else v = VALEURS[cle];
    if (typeof v === 'number') return Number.isInteger(v) ? formatNumber(v) : String(v).replace('.', ',');
    if (typeof v === 'string') return v;
    throw new Error(`« ${id} » cite une valeur introuvable : ${m}`);
  });
}

// La taille d'une planche PNG (sa largeur et sa hauteur, lues dans son en-tête IHDR).
function taillePng(fichier) {
  const b = readFileSync(join(assets, fichier));
  if (b.toString('latin1', 12, 16) !== 'IHDR') throw new Error(`assets/${fichier} : pas une image PNG`);
  return { l: b.readUInt32BE(16), hh: b.readUInt32BE(20) };
}

// Les dessins des bêtes (fiche 14). Les bêtes de la ferme et le cheval : leur planche, la taille d'une case
// (celle de js/carte/ferme/config.js, HERD_SHEETS, et de js/carte/cheval.js) et la case montrée (à
// l'arrêt, de profil). La faune : la planche de l'espèce (assets/faune.json), la première image de son
// repos (ou de son vol, de son saut), celle de chaque variante (la cane) et, pour le canard, debout sur
// ses pattes. → { id de l'entrée : [{ image, w, h, x, l, hh }] } (x : le bord gauche de la case, en px ;
// l, hh : la taille de la planche).
const BETES_FERME = {
  poule: { image: 'poule.png', w: 16, h: 16, cases: [0] },
  mouton: { image: 'mouton.png', w: 32, h: 24, cases: [0] },
  vache: { image: 'vache.png', w: 32, h: 24, cases: [0] },
  cheval: { image: 'cheval.png', w: 48, h: 40, cases: [0] },
};
function visuels() {
  const out = {};
  const casesDe = (image, w, h, cases) => {
    const { l, hh } = taillePng(image);
    return cases.map((k) => {
      if ((k + 1) * w > l || h > hh) throw new Error(`assets/${image} : pas de case ${k} de ${w} × ${h}`);
      return { image, w, h, x: k * w, l, hh };
    });
  };
  for (const [id, b] of Object.entries(BETES_FERME)) out[id] = casesDe(b.image, b.w, b.h, b.cases);
  const meta = JSON.parse(readFileSync(join(assets, 'faune.json'), 'utf8')).especes;
  for (const [esp, e] of Object.entries(DATA.FAUNE.ESPECES)) {
    const m = meta[esp];
    if (!m) throw new Error(`assets/faune.json : pas d'espèce ${esp}`);
    const premiere = (im) => (im.repos || im.vol || [])[0] || (im.saut || [])[1];
    const noms = [premiere(e.images), ...(e.variantes || []).map((v) => v.repos && v.repos[0]), e.images.terre_repos && e.images.terre_repos[0]];
    const cases = [...new Set(noms.filter(Boolean))].map((n) => {
      const k = m.frames.indexOf(n);
      if (k < 0) throw new Error(`assets/faune.json : pas de case « ${n} » pour ${esp}`);
      return k;
    });
    out[`faune_${esp}`] = casesDe(m.image, m.frameWidth, m.frameHeight, cases);
  }
  return out;
}
const VISUELS = visuels();
// Les icônes des poissons (la page de la pêche) : celles de chaque poisson que la canne peut prendre
// (DATA.CANNE : ses prises, et celles des coins de pêche), dans l'ordre où ils y paraissent.
const poissons = () => {
  const noms = [];
  for (const table of [DATA.CANNE.PRISES, DATA.CANNE.COINS.PRISES]) for (const eau of Object.values(table)) for (const n of Object.keys(eau)) if (DATA.OBJETS[n] && !noms.includes(n)) noms.push(n);
  return noms.map((n) => DATA.OBJETS[n].icone);
};
const ICONES = { peche: poissons };

// Tous les termes, pour le libellé des liens ; un lien vers un terme inconnu est une erreur.
const termes = new Map();
for (const c of data.categories) {
  for (const e of c.entrees) {
    if (termes.has(e.id)) throw new Error(`Identifiant en double : ${e.id}`);
    termes.set(e.id, e.terme);
  }
}

// Quand l'entrée se découvre dans le jeu : au moins une condition, toutes connues.
for (const c of data.categories) {
  for (const e of c.entrees) {
    if (!Array.isArray(e.decouverte) || !e.decouverte.length) throw new Error(`« ${e.id} » ne dit pas quand elle se découvre (decouverte)`);
    for (const cond of e.decouverte) {
      const err = erreurCondition(cond);
      if (err) throw new Error(`« ${e.id} » : ${err}`);
    }
  }
}

// Les entrées pour le jeu : descriptions remplies, liens vérifiés.
const jeu = {
  categories: data.categories.map((c) => ({
    id: c.id,
    icone: c.icone,
    nom: c.nom,
    entrees: c.entrees.map((e) => ({
      id: e.id, terme: e.terme, description: remplir(e.description, e.id), liens: e.liens || [], decouverte: e.decouverte,
      ...(VISUELS[e.id] ? { visuels: VISUELS[e.id] } : {}),
      ...(ICONES[e.id] ? { icones: ICONES[e.id]() } : {}),
    })),
  })),
};
const jeuSource = `// FICHIER GÉNÉRÉ par scripts/build-encyclopedie.mjs à partir de encyclopedie_ferme_familiale.json.
// Ne pas le modifier : changer le fichier JSON, puis lancer
//   node scripts/build-encyclopedie.mjs
export const ENCYCLOPEDIE = ${JSON.stringify(jeu, null, 1)};
`;

function entree(e) {
  const description = remplir(e.description, e.id);
  const liens = (e.liens || []).map((id) => {
    if (!termes.has(id)) throw new Error(`« ${e.id} » renvoie vers un terme inconnu : ${id}`);
    return `<a class="chip" href="#${id}">${esc(termes.get(id))}</a>`;
  });
  // (le dessin de la bête, en gros pixels : trois fois sa taille, comme dans le jeu)
  const k = 3;
  const dessins = (VISUELS[e.id] || []).map((v) => `<span class="bete" role="img" aria-label="${esc(e.terme)}" style="width:${v.w * k}px;height:${v.h * k}px;background:url(assets/${v.image}) ${-v.x * k}px 0/${v.l * k}px ${v.hh * k}px no-repeat"></span>`).join('')
    + (ICONES[e.id] ? ICONES[e.id]().map((i) => `<span class="poisson">${i}</span>`).join('') : '');
  return `        <article class="entry" id="${e.id}" data-search="${esc(`${e.terme} ${description}`.toLowerCase())}">
          ${dessins ? `<div class="betes">${dessins}</div>\n          ` : ''}<h3>${esc(e.terme)}</h3>
          <p>${esc(description)}</p>
          ${liens.length ? `<div class="links">${liens.join('')}</div>` : ''}
        </article>`;
}

function section(c) {
  return `    <section class="categorie" id="cat-${c.id}">
      <div class="cat-head">
        <div class="cat-icon">${c.icone}</div>
        <div>
          <div class="kicker">Catégorie</div>
          <h2>${esc(c.nom)}</h2>
        </div>
      </div>
      <div class="entry-grid">
${c.entrees.map(entree).join('\n')}</div>
    </section>`;
}

const menu = data.categories
  .map((c) => `<a class="catlink" href="#cat-${c.id}">${c.icone} ${esc(c.nom)} <span>${c.entrees.length}</span></a>`)
  .join('');

function remplacer(texte, debut, fin, contenu) {
  const a = texte.indexOf(debut);
  const b = texte.indexOf(fin, a + debut.length);
  if (a < 0 || b < 0) throw new Error(`Repère introuvable dans encyclopedie.html : ${debut}`);
  return texte.slice(0, a + debut.length) + contenu + texte.slice(b);
}

let out = remplacer(page, '<nav class="cat-nav">', '</nav>', `\n        ${menu}\n      `);
out = remplacer(out, '<main class="wrap">', '    <p class="no-results"', `\n    \n${data.categories.map(section).join('\n')}\n`);

const total = data.categories.reduce((t, c) => t + c.entrees.length, 0);
let jeuActuel = null;
try {
  jeuActuel = readFileSync(jeuPath, 'utf8');
} catch (err) {
  // pas encore généré
}
if (process.argv.includes('--check')) {
  if (out !== page || jeuActuel !== jeuSource) {
    console.error(`${out !== page ? 'encyclopedie.html' : 'js/encyclopedie.generated.js'} n'est pas à jour : lancer « node scripts/build-encyclopedie.mjs ».`);
    process.exit(1);
  }
  console.log(`encyclopedie.html et js/encyclopedie.generated.js sont à jour (${total} termes, ${data.categories.length} catégories).`);
} else {
  writeFileSync(htmlPath, out);
  if (jeuActuel !== jeuSource) writeFileSync(jeuPath, jeuSource);
  console.log(`encyclopedie.html ${out === page ? 'inchangé' : 'réécrit'}, js/encyclopedie.generated.js ${jeuActuel === jeuSource ? 'inchangé' : 'réécrit'} : ${total} termes, ${data.categories.length} catégories.`);
}
