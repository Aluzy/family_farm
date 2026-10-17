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
// Usage : node scripts/build-encyclopedie.mjs          (réécrit encyclopedie.html)
//         node scripts/build-encyclopedie.mjs --check  (vérifie que la page est à jour, sans écrire)

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { DATA } from '../js/engine/catalog.js';
import { formatNumber } from '../js/engine/format.js';

const here = join(dirname(fileURLToPath(import.meta.url)), '..');
const jsonPath = join(here, 'encyclopedie_ferme_familiale.json');
const htmlPath = join(here, 'encyclopedie.html');

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
  nb_technologies: Object.keys(DATA.techtree.noeuds).length,
  nb_branches: DATA.techtree.branches.length,
  nb_paliers: Object.keys(DATA.techtree.PALIERS).length,
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

// Tous les termes, pour le libellé des liens ; un lien vers un terme inconnu est une erreur.
const termes = new Map();
for (const c of data.categories) {
  for (const e of c.entrees) {
    if (termes.has(e.id)) throw new Error(`Identifiant en double : ${e.id}`);
    termes.set(e.id, e.terme);
  }
}

function entree(e) {
  const description = remplir(e.description, e.id);
  const liens = (e.liens || []).map((id) => {
    if (!termes.has(id)) throw new Error(`« ${e.id} » renvoie vers un terme inconnu : ${id}`);
    return `<a class="chip" href="#${id}">${esc(termes.get(id))}</a>`;
  });
  return `        <article class="entry" id="${e.id}" data-search="${esc(`${e.terme} ${description}`.toLowerCase())}">
          <h3>${esc(e.terme)}</h3>
          <p>${esc(description)}</p>
          ${liens.length ? `<div class="links">${liens.join('')}</div>` : ''}
        </article>`;
}

function section(c) {
  return `    <section class="category" id="cat-${c.id}">
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
if (process.argv.includes('--check')) {
  if (out !== page) {
    console.error('encyclopedie.html n\'est pas à jour : lancer « node scripts/build-encyclopedie.mjs ».');
    process.exit(1);
  }
  console.log(`encyclopedie.html est à jour (${total} termes, ${data.categories.length} catégories).`);
} else {
  writeFileSync(htmlPath, out);
  console.log(`encyclopedie.html ${out === page ? 'inchangé' : 'réécrit'} : ${total} termes, ${data.categories.length} catégories.`);
}
