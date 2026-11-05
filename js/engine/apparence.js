/* ==========================================================================
   L'apparence tirée au hasard d'un habitant (chantier « couches », étape E7 : docs/personnage-couches.md).
   tirerApparence(rnd, { enfant, genre }, deja) : une apparence { identite, tenue } (les choix de
   DATA.FAMILLE.PROFIL.APPARENCE, les probabilités de DATA.HABITANTS.APPARENCE), tirée avec `rnd` (un tirage
   fixe : la même graine, la même apparence) ; `deja` : les apparences déjà tirées dans le hameau (un Set de
   clés, cleDiversite) : on en retire une autre si la peau, les cheveux, la coupe et le haut sont les mêmes.
   L'apparence ne dit rien de ce que fait l'habitant (son métier, son caractère) : seulement à quoi il ressemble.
   ========================================================================== */

import { DATA } from './catalog.js';

const cles = (o) => Object.keys(o);
const un = (rnd, liste) => liste[Math.floor(rnd() * liste.length)];
const pc = (rnd, p) => rnd() * 100 < p;

// Ce qui distingue deux habitants à l'œil : la peau, les cheveux, la coupe, le haut.
export function cleDiversite(a) {
  return [a.identite.peau, a.identite.cheveux, a.identite.coupe, a.tenue.haut.tissu].join('|');
}

function tirage(rnd, enfant, genre) {
  const A = DATA.FAMILLE.PROFIL.APPARENCE, P = DATA.HABITANTS.APPARENCE, age = enfant ? 'enfant' : 'adulte';
  const rares = P.CHEVEUX_RARES.filter((c) => A.CHEVEUX[c]);
  const communs = cles(A.CHEVEUX).filter((c) => !rares.includes(c));
  const coupes = enfant ? A.COUPE_PROPOSEE.enfant : cles(A.COUPE.adulte);
  const signes = [];
  if (pc(rnd, P.ROUSSEUR)) signes.push('rousseur');
  if (pc(rnd, enfant ? P.JOUES_ENFANT : P.JOUES)) signes.push('joues');
  const accessoires = [];
  if (pc(rnd, P.LUNETTES)) accessoires.push('lunettes');
  if (pc(rnd, P.BOUCLES)) accessoires.push('boucles');
  if (enfant && pc(rnd, P.PANSEMENT_ENFANT)) accessoires.push('pansement');
  return {
    identite: {
      peau: un(rnd, cles(A.PEAU)), yeux: un(rnd, cles(A.YEUX)),
      cheveux: rares.length && pc(rnd, P.RARES) ? un(rnd, rares) : un(rnd, communs),
      coupe: un(rnd, coupes),
      pilosite: !enfant && genre === 'm' && pc(rnd, P.PILOSITE) ? un(rnd, cles(A.PILOSITE)) : null,
      signes,
    },
    tenue: {
      haut: { tissu: un(rnd, cles(A.TISSU)), motif: pc(rnd, P.MOTIF) ? un(rnd, cles(A.MOTIF)) : null },
      bas: { tissu: un(rnd, cles(A.BAS)) },
      couvre_chef: pc(rnd, P.COUVRE_CHEF) ? un(rnd, cles(A.COUVRE_CHEF[age])) : null,
      accessoire: un(rnd, cles(A.ACCESSOIRE)),
      accessoires,
    },
  };
}

export function tirerApparence(rnd, { enfant = false, genre = 'f' } = {}, deja = null) {
  let a = tirage(rnd, enfant, genre);
  for (let k = 1; deja && deja.has(cleDiversite(a)) && k < DATA.HABITANTS.APPARENCE.ESSAIS; k++) a = tirage(rnd, enfant, genre);
  if (deja) deja.add(cleDiversite(a));
  return a;
}
