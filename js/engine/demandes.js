/* ---------- V-2 : les petites demandes des habitants (docs/phase-4.md ; data/amitie.json, DEMANDES) ----------
   Chaque nuit (demandesNuit, dans runNight ; pas dans un monde partagé : les hameaux sont au solo), un
   habitant adulte d'un hameau déjà visité peut faire une demande (CHANCE), tant qu'il y en a moins de MAX
   ouvertes. Elle porte sur ce dont son métier a besoin (BESOINS : un objet, une quantité, un motif). Il la dit
   quand on lui parle (paroleHabitant) ; elle s'oublie après DUREE jours, sans rien coûter (un jeu sans
   pression). La rendre (rendreDemande, depuis la fenêtre « Offrir ») donne AMITIE points d'amitié et un présent
   de son métier (RETOUR.PRESENTS), en plus du merci.

   state.demandes = { seq, liste: [{ id, hameau, membre, prenom, metier, objet, n, motif, jour, fin }], faites,
     annonces: [ids] (les nouvelles de la nuit, à dire au matin : l'interface les vide) }.
   Le tirage suit la graine de la ferme et le jour : la même partie, les mêmes demandes. */

import { DATA } from './catalog.js';
import { mulberry32 } from './base.js';
import { hache } from './ferme-generee.js';
import { farmSeed } from './terrain.js';
import { fail } from './devices.js';
import { addItem, countItem, takeItem } from './inventory.js';
import { habitantsDe } from './habitants.js';
import { ajouterAmitie, amitieDe, cleDe, palierAmitie, trouverPnj } from './amitie.js';

const D = () => DATA.DEMANDES;
const objet = (v) => !!v && typeof v === 'object' && !Array.isArray(v);
const remplir = (t, mots) => String(t).replace(/\{(\w+)\}/g, (x, k) => (mots[k] !== undefined && mots[k] !== null ? String(mots[k]) : x));
const nomObjet = (it) => (DATA.OBJETS[it] ? DATA.OBJETS[it].nom : it);

// Les demandes de la partie (réparées : une ancienne partie n'en a pas).
export function demandesDe(state) {
  if (!objet(state.demandes)) state.demandes = {};
  const d = state.demandes;
  if (!Array.isArray(d.liste)) d.liste = [];
  if (!Array.isArray(d.annonces)) d.annonces = [];
  if (!Number.isInteger(d.seq)) d.seq = 0;
  if (!Number.isInteger(d.faites)) d.faites = 0;
  return d;
}

// Les demandes ouvertes (encore à temps), des plus anciennes aux plus récentes.
export function demandesOuvertes(state) {
  return demandesDe(state).liste.filter((x) => x.fin >= state.day);
}

// La demande ouverte de l'habitant `membreId`, ou null.
export function demandeDe(state, membreId) {
  return demandesOuvertes(state).find((x) => x.membre === membreId) || null;
}

// Ce qu'il dit de sa demande (à la conversation) : une phrase, la même tant qu'elle dure.
export function texteDemande(d) {
  const L = D().PHRASES.demande;
  return remplir(L[d.motifPhrase % L.length], { n: d.n, objet: nomObjet(d.objet), motif: d.motif });
}

// L'annonce du matin d'une demande (avec le nom de son hameau).
export function annonceDemande(state, d) {
  const h = habitantsDe(state)[d.hameau];
  return remplir(D().PHRASES.annonce, { prenom: d.prenom, hameau: (h && h.nom) || 'un hameau', n: d.n, objet: nomObjet(d.objet) });
}

// La nuit : les demandes passées s'oublient ; peut-être une nouvelle. Renvoie la nouvelle, ou null.
export function demandesNuit(state) {
  if (state.mondePartage) return null;
  const d = demandesDe(state), jour = state.day;
  d.liste = d.liste.filter((x) => x.fin >= jour);
  if (jour < D().DEPUIS || d.liste.length >= D().MAX) return null;
  const rnd = mulberry32(hache(`${farmSeed(state)}:demandes:${jour}`));
  if (rnd() >= D().CHANCE) return null;
  // (les habitants adultes des hameaux déjà visités, sans demande ouverte, dans un ordre fixe)
  const visites = amitieDe(state).visites, deja = new Set(d.liste.map((x) => x.membre));
  const qui = [];
  for (const [hid, h] of Object.entries(habitantsDe(state)).sort((a, b) => (a[0] < b[0] ? -1 : 1))) {
    if (!visites[hid]) continue;
    for (const f of h.foyers || []) for (const m of f.membres || []) if (!m.enfant && !deja.has(m.id)) qui.push({ hid, h, m });
  }
  if (!qui.length) return null;
  const { hid, h, m } = qui[Math.floor(rnd() * qui.length)];
  const metier = m.metier && D().BESOINS[m.metier] ? m.metier : 'jardinier';
  const besoins = D().BESOINS[metier];
  const [obj, min, max, motif] = besoins[Math.floor(rnd() * besoins.length)];
  d.seq += 1;
  const dem = { id: `dem-${d.seq}`, hameau: hid, membre: m.id, prenom: m.prenom, metier, objet: obj, n: min + Math.floor(rnd() * (max - min + 1)), motif, motifPhrase: Math.floor(rnd() * 1000), jour, fin: jour + D().DUREE - 1 };
  d.liste.push(dem);
  d.annonces.push(dem.id);
  return dem;
}

// Le joueur rend la demande `id` : les objets partent, l'amitié monte, un présent de son métier vient.
// { ok, prenom, objet, n, points, monte (le palier changé), cadeau: { item, n }, merci }.
export function rendreDemande(state, id) {
  const d = demandesDe(state);
  const dem = demandesOuvertes(state).find((x) => x.id === id);
  if (!dem) return fail('Cette demande n\'est plus d\'actualité.');
  if (countItem(state, dem.objet) < dem.n) return fail(`Il te faut ${dem.n} × ${nomObjet(dem.objet)} (tu en as ${Math.floor(countItem(state, dem.objet))}).`);
  const t = trouverPnj(state, dem.hameau, dem.membre);
  takeItem(state, dem.objet, dem.n);
  const cle = t ? cleDe(t.m) : dem.membre;
  const avant = palierAmitie(state, cle);
  ajouterAmitie(state, cle, D().AMITIE);
  // (son présent : un objet de son métier, la quantité tirée de la graine de la demande)
  const P = (DATA.AMITIE.RETOUR.PRESENTS || {})[dem.metier] || {};
  const choix = Object.keys(P).sort();
  const rnd = mulberry32(hache(`${farmSeed(state)}:${dem.id}:merci`));
  let cadeau = null;
  if (choix.length) {
    const item = choix[Math.floor(rnd() * choix.length)], [a, b] = P[item];
    cadeau = { item, n: a + Math.floor(rnd() * (b - a + 1)) };
    addItem(state, item, cadeau.n);
  }
  d.liste = d.liste.filter((x) => x.id !== id);
  d.faites += 1;
  const merciL = D().PHRASES.merci;
  const merci = remplir(merciL[Math.floor(rnd() * merciL.length)], { cadeau: cadeau ? `${cadeau.n} × ${nomObjet(cadeau.item)}` : 'un grand merci' });
  return { ok: true, prenom: dem.prenom, objet: dem.objet, n: dem.n, points: D().AMITIE, monte: palierAmitie(state, cle) > avant, cadeau, merci };
}
