import { DATA } from '../engine/catalog.js';
import { EPS } from '../engine/base.js';
import { countItem } from '../engine/inventory.js';
import { fridgeCount } from '../engine/fridge.js';
import { sellableCount } from '../engine/market.js';
import { seedItem, seedStock } from '../engine/crops.js';
import { isUnlocked, plantableCropsFor } from '../engine/campaign.js';
import {
  acheterCaleche, annulerCommande, CALECHE, calecheIci, calecheMaintenant, commanderCaleche, contenuMalle, deposerMalle, devisCaleche,
  etalCaleche, heler, helable, heureTexte, horaireCaleche, majCaleche, mallePleine, ouEstCaleche, poserTournee, prendreLivraison,
  prochainPassage, reprendreMalle, reprendreTout, retenir, tourneeDe, vendablesCaleche, vendreCaleche,
} from '../engine/caleche.js';
import { fail, marcheFerme, marcheOuvert } from '../engine/devices.js';
import { unlockLevel } from '../engine/levels.js';
import { calecheAPortee, etapeDidacticiel, rencontreCaleche } from '../engine/didacticiel.js';
import { objectifsActifs } from '../engine/objectifs.js';
import { noterObjectif } from '../engine/objectifs-compte.js';
import { farmSeed, farmTerrain } from '../engine/terrain.js';
import { solDuMonde } from './monde-sol.js';
import { openStageWindow, stageWindow } from './stage-windows.js';
import { persistState } from './storage.js';
import { escapeHtml, formatCoins, formatQty } from '../engine/format.js';
import { comptoirTab, comptoirTabChoisi, state } from './store.js';
import { applyResult } from './game-actions.js';
import { pxText } from './pixel-art.js';
import { tel } from './consent.js';
import { morph, refresh } from './render.js';
import { notify } from './toasts.js';
import { registerActions } from './actions.js';
import { closeModal, openModal } from './modal.js';
import { recitPage, recitPour } from '../engine/recit-aiguillage.js';
import { palierAmitieNom, remiseAmitie } from '../engine/amitie.js';
import { habitantsDe } from '../engine/habitants.js';
import { meubleRefus } from '../engine/meubles.js';
import { itemsText } from './common.js';
import { proposerScene } from './scene.js';
import { renvoiAuPort } from './port.js';
import { villageActif } from '../engine/village.js';

// Ce que la calèche lit du récit (le cocher, ses promesses, les ateliers et les meubles des hameaux), par l'aiguillage
// (fiche I7d) : une partie d'avant passe au récit tel quel ; l'île à bâtir n'en a rien (recitPage rend null : ni
// promesse, ni atelier, ni réplique ; la calèche n'y commerce plus, I1b, et sort avec I7e).
const RIEN_ICI = () => fail('Pas de récit sur l\'île.');
const parLeRecit = (nom, sinon) => (...a) => { const R = recitPage(state); return R ? R[nom](...a) : sinon(); };
const aFait = (s, id) => recitPour(s).aFait(s, id);
const nomCocher = (s, majuscule = true) => recitPour(s).nomCocher(s, majuscule);
const parler = parLeRecit('parler', () => null);
const promesses = parLeRecit('promesses', () => []);
const livrerPromesse = parLeRecit('livrerPromesse', RIEN_ICI);
const ateliersConnus = parLeRecit('ateliersConnus', () => []);
const commandesDe = parLeRecit('commandesDe', () => []);
const lotsPossibles = parLeRecit('lotsPossibles', () => 0);
const prixCommande = parLeRecit('prixCommande', () => 0);
const delaiCommande = parLeRecit('delaiCommande', () => 0);
const meublesDuHameau = parLeRecit('meublesDuHameau', () => []);
const prixMeubleHameau = parLeRecit('prixMeubleHameau', () => 0);
const retirerToutes = parLeRecit('retirerToutes', () => ({ ok: true, items: {} }));
const commander = parLeRecit('commander', RIEN_ICI);
const acheterMeubleHameau = parLeRecit('acheterMeubleHameau', RIEN_ICI);
const personnages = () => { const R = recitPage(state); return (R && R.RECIT.PERSONNAGES) || {}; };

/* ---------- la calèche (fiche 7c : le Marché qui fait le tour du monde) ----------

   La fenêtre du Marché, renommée et adaptée : la calèche (js/engine/caleche.js) achète ce que la
   ferme produit et ce qu'on trouve dans le monde (Vendre, au prix de vente et au cours du Marché),
   et ne vend que les semences et ce que son coffre porte des hameaux (Acheter). On commerce quand
   elle est arrêtée à côté du personnage : à la ferme vers CALECHE.FERME h, dans un hameau, ou hélée
   sur un chemin (le bouton Héler, quand elle passe tout près). Hors de sa présence, la fenêtre dit
   où elle est et quand elle passe à la ferme ; les cases restent visibles (ses prix), pâlies. Le récit :
   l'onglet Commandes (les promesses de Maurice, les ateliers des hameaux, les meubles), ce que porte le cocher.
   Les outils et les animaux se fabriquent à l'Atelier (js/ui/atelier.js) ; les meubles se commandent (Commandes).

   La malle (js/engine/caleche.js, « la malle » ; la scène : js/carte/ferme/malle.js), au bout du chemin : quand la
   calèche n'est pas là (le Marché ouvert), Vendre dépose dans la malle ce qu'on vend (elle l'emporte à son passage à
   la ferme et paie au prix de vente ; « Tout reprendre » avant), Acheter le commande (payé tout de suite, livré dans
   la malle à son passage ; « Annuler » avant) ; ce qui a été livré attend dans la malle (« Tout prendre »). Un appui
   sur la malle ouvre cette fenêtre ; à son passage, un message dit ce qu'elle a vendu et livré. */

const COMPTOIR_TABS = [
  { id: 'vendre', label: 'Vendre', icon: '💰' },
  { id: 'acheter', label: 'Acheter', icon: '🛒' },
  // le récit (lots 6 et 7) : ce que porte le cocher — les promesses de Maurice, les commandes aux ateliers
  // des hameaux, les meubles ; l'onglet n'est là que s'il y a quelque chose
  { id: 'commandes', label: 'Commandes', icon: '📜', ok: () => promesses(state).length > 0 || ateliersConnus(state).length > 0 },
];
const tabsOuverts = () => COMPTOIR_TABS.filter((t) => !t.ok || t.ok());

// Dessin d'un meuble (assets/meuble_<id>.png), avec l'empreinte du fichier sur le site en ligne
// (le mode Construire en a besoin : js/ui/chantier.js).
export function meubleSrc(id) {
  const file = `meuble_${id}.png`;
  const versions = window.FERME_ASSET_VERSIONS;
  return `assets/${file}${versions && versions[file] ? `?v=${versions[file]}` : ''}`;
}

// L'image de la malle (fermée), pour le bandeau.
function malleIco() {
  const file = 'malle.png', versions = window.FERME_ASSET_VERSIONS;
  return `<span class="malle-ico" aria-hidden="true" style="background-image:url('assets/${file}${versions && versions[file] ? `?v=${versions[file]}` : ''}')"></span>`;
}

// La ferme a-t-elle sa malle (le grand monde : farmTerrain().MALLE) ?
function aUneMalle() {
  const Tf = farmTerrain(state);
  return !!(Tf && Tf.MALLE);
}

// Quand la calèche passe vider la malle, en mots : « aujourd'hui vers 10 h », « demain vers 10 h ».
function quandMalle() {
  return `${prochainPassage(state).includes('aujourd') ? 'aujourd\'hui' : 'demain'} vers ${heureTexte(CALECHE.FERME)}`;
}

// La case du personnage sur la carte (-1 : pas de carte).
function ouPerso() {
  const S = window.FarmStage;
  return S && S.persoCase ? S.persoCase() : -1;
}

// Seules les unités entières se vendent (un demi-blé reste en stock).
function sellableStock(item) {
  return Math.floor(sellableCount(state, item) + EPS);
}

// FLU-13 : l'onglet à l'ouverture : Acheter si une parcelle est vide et qu'aucune graine n'est en
// stock ; sinon le dernier onglet choisi par le joueur.
export function comptoirTabAOuvrir() {
  const vide = state.potager.parcelles.some((p) => !p.culture);
  const graines = plantableCropsFor(state, DATA.POTAGER.LIEU).some((c) => seedStock(state, c) >= 1);
  if (vide && !graines) return 'acheter';
  return comptoirTabChoisi === 'vendre' || comptoirTabChoisi === 'acheter' ? comptoirTabChoisi : 'vendre';
}

function currentTab() {
  return tabsOuverts().find((t) => t.id === comptoirTab) || COMPTOIR_TABS[0];
}

// Explication de chaque onglet, derrière le bouton « ? » (FLU-25).
function helpText(tab) {
  const C = CALECHE;
  const tour = `${horaireCaleche()} Elle fait chaque jour le tour du monde par les chemins, s'arrête une demi-heure sur la place de chaque hameau et dort dans l'un d'eux. Sur un chemin, quand elle passe tout près, hèle-la : elle s'arrête un moment. Tant que tu commerces avec elle, elle t'attend (${C.RETENUE_MAX} heures au plus par jour).`;
  if (tab === 'commandes') return `${nomCocher(state)} porte aux hameaux ce que tu lui confies, et en rapporte ce qu'ils ont fait pour toi : les promesses de Maurice ; les commandes aux ateliers des hameaux où tu es allé (prêtes le lendemain, il te les rend à son passage) ; les meubles de l'ébéniste et les tapis des Genêts, payés à la commande. L'argent va aux familles du hameau.`;
  const malle = aUneMalle();
  if (tab === 'vendre') return `${tour} Elle t'achète tout ce qui se vend, même rangé au frigo (l'inventaire part en premier), à prix fixe. Chaque unité vendue baisse de ${DATA.MARCHE.PAS} points le cours d'achat de l'objet, sans passer sous son plancher.${malle ? ` Quand elle n'est pas là, ce que tu vends va dans la malle, au bout du chemin de la ferme : elle l'emporte à son passage (vers ${heureTexte(C.FERME)}) et te paie au même prix. Tu peux le reprendre avant.` : ''}`;
  if (malle) return `${tour} Elle vend les semences (leur prix monte un peu à chaque achat : produire les tiennes reste plus rentable) et ce qu'elle a acheté aux hameaux en chemin, en quantité limitée, à ${C.VENTE} % de leur prix de vente. Quand elle n'est pas là, commande : tu paies tout de suite, elle livre dans la malle, au bout du chemin, à son passage (vers ${heureTexte(C.FERME)}). Tu peux annuler avant (tu es remboursé). Les outils et les animaux se fabriquent à l'Atelier ; les meubles se commandent au cocher (Commandes).`;
  return `${tour} Elle vend les semences (leur prix monte un peu à chaque achat : produire les tiennes reste plus rentable) et ce qu'elle a acheté aux hameaux en chemin (le bois, le poisson, la pierre, le lait, la laine, les baies…), en quantité limitée, à ${C.VENTE} % de leur prix de vente. Les outils et les animaux se fabriquent à l'Atelier ; les meubles se commandent au cocher (Commandes).`;
}

// Le récit (docs/recit/dialogues.md) : à chaque fenêtre ouverte près d'elle, le cocher dit une réplique
// (parler : notée, au repos ensuite) ; le bandeau la montre le jour même. { jour, texte } ou null.
let parole = null;
function ecouterCocher() {
  rendreCommandes();
  const r = parler(state, 'achille', { lieu: 'caleche' });
  parole = r ? { jour: state.day, texte: r.texte } : null;
  if (r) persistState();
}

// Le récit : la calèche garée devant la ferme, le joueur à côté, est le lieu de la scène de la clé
// (achille_cle, data/recit.json ; js/ui/scene.js). Appelée à chaque image (loop.js) et quand on la
// touche. → true si une scène s'est ouverte.
// (à portée de commerce, CALECHE.PORTEE, même avant que le cocher commerce : niveau du Marché)
export function sceneCaleche() {
  const e = calecheMaintenant(state), tour = tourneeDe(state), ou = ouPerso();
  if (!e || !tour || e.etat !== 'arret' || !e.arret || e.arret.sorte !== 'ferme' || !Number.isInteger(ou)) return false;
  const W = tour.W;
  if (Math.hypot((ou % W) + 0.5 - e.x, Math.floor(ou / W) + 0.5 - e.y) > CALECHE.PORTEE + EPS) return false;
  return proposerScene({ lieu: 'caleche_ferme' });
}

// La calèche : là (et on peut commercer), à portée de voix, ou loin. { ici, helable, texte }.
function presence() {
  const ou = ouPerso();
  const ici = calecheIci(state, ou);
  if (ici.ok) {
    const e = ici.e;
    const ou2 = e.etat === 'halte' ? 'arrêtée sur le chemin, pour toi' : e.arret && e.arret.sorte === 'ferme' ? 'arrêtée devant la ferme' : 'arrêtée sur la place';
    const dit = parole && parole.jour === state.day ? ` ${nomCocher(state)} : « ${escapeHtml(parole.texte)} »` : '';
    return { ici: true, texte: `La calèche est là, ${ou2}. ${nomCocher(state)} t'attend tant que tu commerces.${dit}` };
  }
  const h = helable(state, ou);
  if (h.ok && ici.e && ici.e.etat === 'route') return { ici: false, helable: true, texte: 'La calèche passe tout près : hèle-la pour qu\'elle s\'arrête !' };
  const e = ici.e || calecheMaintenant(state);
  const quand = prochainPassage(state);
  // (la malle : elle n'est pas là, on dépose et on commande ; le Marché ouvert, une tournée)
  const malle = aUneMalle() && !!tourneeDe(state) && marcheOuvert(state);
  return { ici: false, malle, helable: false, texte: `${ici.raison && !e ? ici.raison : `La calèche n'est pas là. ${ouEstCaleche(state, e)}`} ${quand}` };
}

// En-tête : les onglets en icônes seules, et le « ? » de l'onglet ouvert.
export function marketTabsHtml() {
  const cur = currentTab().id;
  return `<div class="inv-tabs" role="group" aria-label="La calèche">${tabsOuverts()
    .map((t) => `<button type="button" class="inv-tab${t.id === cur ? ' active' : ''}" data-action="comptoir-tab" data-tab="${t.id}" aria-pressed="${t.id === cur}" title="${t.label}" aria-label="${t.label}"><span aria-hidden="true">${t.icon}</span></button>`)
    .join('')}<button type="button" class="btn help-btn shop-help" data-action="market-help" aria-label="Aide : ${currentTab().label}" title="Comment ça marche">?</button></div>`;
}

// Une case : `act` = attributs de l'appui (data-mode, data-item), `prix` en haut à gauche, `coin`
// en bas à droite (texte en police pixel, ou HTML).
export function shopSlot(icone, nom, act, prix, coin, off, label) {
  const price = prix === null ? '' : `<span class="shop-slot-price">${pxText(String(Math.round(prix)), 'light')}<span class="shop-coin" aria-hidden="true">💰</span></span>`;
  return `<button type="button" class="inv-slot shop-slot${off ? ' off' : ''}" data-action="shop-item" ${act} title="${nom}" aria-label="${label}">` +
    `${price}<span class="inv-slot-icon" aria-hidden="true">${icone}</span>` +
    `<span class="inv-slot-qty">${coin}</span></button>`;
}

// Une case de l'onglet Vendre : la calèche là, on lui vend ; la malle (elle n'est pas là), on y dépose.
function sellSlot(item, ici, malle = false) {
  const it = DATA.OBJETS[item];
  const n = sellableStock(item);
  return shopSlot(it.icone, it.nom, `data-mode="${malle ? 'deposer' : 'vendre'}" data-item="${item}"`, it.prix, pxText(String(n), 'light'), n < 1 || !(ici || malle),
    `${it.nom} : ${formatCoins(it.prix)} pièces l'unité, ${formatQty(sellableCount(state, item))} à ${malle ? 'déposer dans la malle' : 'vendre'}`);
}

// Une case de la malle : ce qui y est (à vendre, commandé, livré) ; `act` : l'action d'un appui.
function malleSlot(item, n, prix, act, label) {
  const it = DATA.OBJETS[item];
  return shopSlot(it.icone, it.nom, `data-item="${item}"`, prix, pxText(String(n), 'light'), false, `${it.nom} : ${n}, ${label}`)
    .replace('data-action="shop-item"', `data-action="${act}"`);
}

// Le haut de l'onglet : ce qui a été livré (à prendre) ; puis, selon l'onglet, ce qui attend d'être vendu, ou ce qui
// est commandé. Rien si la malle n'a rien de tout ça.
function malleHtml(tab) {
  if (!aUneMalle()) return '';
  const m = contenuMalle(state);
  let html = '';
  const livre = Object.entries(m.livre);
  if (livre.length) {
    html += `<h3 class="section-title malle-titre">Livré pour toi, dans la malle <button type="button" class="btn primary small" data-action="malle-prendre">Tout prendre</button></h3>
      <div class="inv-slots">${livre.map(([k, n]) => malleSlot(k, n, null, 'malle-prendre', 'livré : touche pour le prendre')).join('')}</div>`;
  }
  if (tab === 'vendre') {
    const vente = Object.entries(m.vente);
    if (vente.length) {
      html += `<h3 class="section-title malle-titre">Dans la malle · ${formatCoins(m.valeur)} 💰 <button type="button" class="btn small" data-action="malle-reprendre">Tout reprendre</button></h3>
        <div class="inv-slots">${vente.map(([k, n]) => malleSlot(k, n, DATA.OBJETS[k].prix, 'malle-reprendre', 'dans la malle : touche pour le reprendre')).join('')}</div>`;
    }
  } else if (tab === 'acheter') {
    const cmd = Object.entries(m.commande);
    if (cmd.length) {
      html += `<h3 class="section-title malle-titre">Commandé · payé ${formatCoins(m.cout)} 💰 <button type="button" class="btn small" data-action="malle-annuler">Annuler</button></h3>
        <div class="inv-slots">${cmd.map(([k, n]) => malleSlot(k, n, null, 'malle-annuler', `commandé, livré dans la malle ${quandMalle()} : touche pour annuler`)).join('')}</div>`;
    }
  }
  return html;
}

// Ce que vend la calèche : une semence (la quantité en stock, si on en a) ou un produit des hameaux
// (combien elle en porte).
function buySlot(o, ici, malle = false) {
  const it = DATA.OBJETS[o.item];
  const ok = devisCaleche(state, o.item, 1).quantite >= 1 && (ici || malle);
  const n = Math.floor(countItem(state, o.item) + EPS);
  const coin = o.sorte === 'coffre' ? pxText(String(o.stock), 'light') : n > 0 ? pxText(String(n), 'light') : '';
  return shopSlot(it.icone, it.nom, `data-mode="${malle ? 'commander' : 'acheter'}" data-item="${o.item}"`, o.prix, coin, !ok,
    `${it.nom} : ${formatCoins(o.prix)} pièces${o.sorte === 'coffre' ? `, ${o.stock} dans son coffre` : `, ${formatQty(n)} en stock`}`);
}

export function slotsHtml(slots, empty) {
  const html = slots.join('');
  return html ? `<div class="inv-slots">${html}</div>` : `<p class="hint">${empty}</p>`;
}

// Une semence en vente : sa culture débloquée (le tournesol plus tard) ; un jeune arbre, une fois le
// Verger débloqué.
function seedForSale(item) {
  if (DATA.OBJETS[item].arbre) return isUnlocked(state, 'verger');
  return !Object.keys(DATA.CULTURES).some((c) => seedItem(c) === item && !isUnlocked(state, c));
}

// Le bandeau du haut : la calèche là, à portée de voix, ou loin (où, et quand elle passe à la ferme).
function bandeauHtml(p, tab) {
  const bouton = p.helable ? '<button type="button" class="btn primary small" data-action="caleche-heler">🔔 Héler la calèche</button>' : '';
  if (p.malle && (tab === 'vendre' || tab === 'acheter') && !p.helable) {
    // (garée à la ferme, mais pas à côté du personnage : qu'il s'approche pour commercer avec elle)
    const e = calecheMaintenant(state), garee = !!(e && e.etat === 'arret' && e.arret && e.arret.sorte === 'ferme');
    const debut = garee ? 'La calèche est garée devant l\'entrée : approche-toi pour commercer avec elle. Sinon,' : 'La calèche n\'est pas là :';
    const texte = tab === 'vendre'
      ? `${debut} ce que tu vends va dans la malle, au bout du chemin. Elle l'emporte ${quandMalle()} et te paie au prix de vente.`
      : `${debut} commande, tu paies tout de suite. Elle livre dans la malle, au bout du chemin, ${quandMalle()}.`;
    return `<div class="caleche-bandeau malle" role="status">${malleIco()}<span class="caleche-texte">${texte}</span></div>`;
  }
  return `<div class="caleche-bandeau${p.ici ? ' ici' : ''}" role="status"><span aria-hidden="true" class="caleche-ico">${CALECHE.ICONE}</span><span class="caleche-texte">${p.texte}</span>${bouton}</div>`;
}

// Le récit (lot 6) : les promesses de Maurice que son carnet a fait connaître, en haut de l'onglet Vendre.
// Chacune dit ce qu'il faut, ce qui est déjà confié, et propose de confier au cocher ce que le joueur a de
// ce qui manque (la calèche là). Une promesse tenue reste, cochée.
function promessesHtml(p) {
  const liste = promesses(state);
  if (!liste.length) return '';
  const ligne = (e) => {
    const besoins = Object.entries(e.besoin).map(([item, n]) => {
      const it = DATA.OBJETS[item];
      return `<span class="promesse-besoin${e.donne[item] >= n ? ' ok' : ''}"><span aria-hidden="true">${it.icone}</span> ${it.nom} ${e.donne[item]}/${n}</span>`;
    }).join('');
    const peut = !e.tenue && p.ici && Object.keys(e.manque).some((item) => Math.floor(countItem(state, item)) > 0);
    const bouton = e.tenue ? '<span class="promesse-tenue">✓ Tenue</span>'
      : `<button type="button" class="btn small" data-action="promesse-confier" data-id="${e.id}"${peut ? '' : ' disabled'}>Confier ${aFait(state, 'achille.cle') ? `à ${nomCocher(state)}` : 'au cocher'}</button>`;
    return `<li class="promesse${e.tenue ? ' tenue' : ''}"><div class="promesse-titre">${escapeHtml(e.titre)}</div><div class="promesse-besoins">${besoins}</div>${bouton}</li>`;
  };
  return `<h3 class="section-title">📜 Les promesses de Maurice</h3><ul class="promesses">${liste.map(ligne).join('')}</ul>`;
}

// Le récit, lot 7 : les ateliers des hameaux où le joueur est allé (js/engine/ile.js, data/ile.json) ; on
// commande au cocher, la calèche là. Une commande : ce qu'il faut, ce qu'on reprend, les lots (×1, ×5, tout).
const icoObjet = (item) => (DATA.OBJETS[item] || { icone: '' }).icone;
const objetsTexte = (m) => Object.entries(m).map(([item, n]) => `${formatQty(n)} <span aria-hidden="true">${icoObjet(item)}</span>`).join(' + ');
function recetteHtml(p, a, rid, r) {
  const max = p.ici ? lotsPossibles(state, a.hameau, a.id, rid) : 0;
  const bouton = (n, label) => `<button type="button" class="btn small" data-action="ile-commander" data-hameau="${a.hameau}" data-atelier="${a.id}" data-recette="${rid}" data-lots="${n}"${n >= 1 && n <= max ? '' : ' disabled'}>${label}</button>`;
  const lots = [bouton(1, '×1')];
  if (max >= 5) lots.push(bouton(5, '×5'));
  if (max > 1 && max !== 5) lots.push(bouton(max, `Tout (×${max})`));
  const cout = prixCommande(state, a.id, rid);
  const prix = cout > 0 ? ` + ${formatCoins(cout)} 💰` : '';
  return `<li class="ile-recette"><span>${escapeHtml(r.nom)} : ${objetsTexte(r.entrees)}${prix} → ${objetsTexte(r.sortie)}</span><span class="row">${lots.join('')}</span></li>`;
}
function atelierHtml(p, a) {
  const hameau = (habitantsDe(state)[a.hameau] || {}).nom || '';
  // (l'amitié avec qui tient l'atelier : une remise sur ses prix, un délai plus court, js/engine/amitie.js)
  const remise = remiseAmitie(state, a.qui), gagne = a.jours - delaiCommande(state, a.id);
  const ami = remise || gagne > 0 ? ` <span class="ile-ami">💛 ${escapeHtml(palierAmitieNom(state, a.qui))} : ${[remise ? `−${remise} %` : '', gagne > 0 ? `${gagne === 1 ? 'un jour' : `${gagne} jours`} plus tôt` : ''].filter(Boolean).join(', ')}</span>` : '';
  const qui = a.qui && personnages()[a.qui] ? `, chez ${escapeHtml(personnages()[a.qui].nom)}${ami}` : '';
  const titre = `<h4 class="ile-atelier-titre"><span aria-hidden="true">${a.icone || ''}</span> ${escapeHtml(a.nom)} <span class="muted">— ${escapeHtml(hameau)}${qui}</span></h4>`;
  if (a.sorte === 'meubles') {
    const li = meublesDuHameau(state, a.hameau).map((id) => {
      const m = DATA.MEUBLES[id], cout = prixMeubleHameau(state, a.hameau, id), refus = meubleRefus(state, id) || ((Number(state.pieces) || 0) < cout ? 'Pas assez de pièces.' : null);
      const off = !p.ici || refus;
      return `<li class="ile-meuble"><span>${escapeHtml(m.nom)} <span class="muted num">${formatCoins(cout)} 💰</span></span><button type="button" class="btn small" data-action="ile-meuble" data-hameau="${a.hameau}" data-meuble="${id}"${off ? ` disabled title="${escapeHtml(refus || 'La calèche n\'est pas là.')}"` : ''}>Commander</button></li>`;
    }).join('');
    return `${titre}<ul class="ile-liste">${li}</ul>`;
  }
  const enCours = commandesDe(state, a.hameau).filter((c) => c.atelier === a.id).map((c) => {
    const sortie = {};
    for (const [item, q] of Object.entries(a.recettes[c.recette].sortie)) sortie[item] = q * c.lots;
    return `${objetsTexte(sortie)} (${c.pret <= state.day ? 'prêt : à son prochain arrêt près de toi' : c.pret === state.day + 1 ? 'prêt demain' : `prêt le jour ${c.pret}`})`;
  });
  return `${titre}<ul class="ile-liste">${Object.entries(a.recettes).map(([rid, r]) => recetteHtml(p, a, rid, r)).join('')}</ul>${enCours.length ? `<p class="muted">En cours : ${enCours.join(', ')}.</p>` : ''}`;
}
function ateliersHtml(p) {
  const A = ateliersConnus(state);
  if (!A.length) return '';
  return `<h3 class="section-title">🔨 Les ateliers des hameaux</h3>${A.map((a) => atelierHtml(p, a)).join('')}`;
}

// Le cocher rend les commandes prêtes (à chaque fenêtre ouverte près de lui). → vrai s'il a rendu quelque chose.
function rendreCommandes() {
  const r = retirerToutes(state);
  if (!Object.keys(r.items).length) return false;
  persistState();
  notify(`${CALECHE.ICONE} ${nomCocher(state)} te rend ta commande : ${Object.entries(r.items).map(([item, n]) => `${formatQty(n)} ${icoObjet(item)} ${(DATA.OBJETS[item] || { nom: item }).nom.toLowerCase()}`).join(', ')}.`, { kind: 'info' });
  return true;
}

// `fenetre` : dans la fenêtre flottante de la carte, les onglets sont dans son en-tête.
export function renderComptoir(fenetre = false) {
  const tab = currentTab(), p = presence();
  let body;
  if (tab.id === 'commandes') {
    body = promessesHtml(p) + ateliersHtml(p) || '<p class="hint">Rien à lui confier pour l\'instant.</p>';
  } else if (tab.id === 'vendre') {
    const titre = p.malle && malleHtml('vendre') ? '<h3 class="section-title">Vendre</h3>' : '';
    body = malleHtml('vendre') + titre + slotsHtml(vendablesCaleche(state).map((k) => sellSlot(k, p.ici, p.malle)), 'Tu n\'as rien à vendre pour l\'instant.');
  } else {
    const etal = etalCaleche(state, seedForSale);
    const graines = etal.filter((o) => o.sorte === 'semence'), coffre = etal.filter((o) => o.sorte === 'coffre');
    body = `${malleHtml('acheter')}<h3 class="section-title">🌱 Semences et engrais</h3>${slotsHtml(graines.map((o) => buySlot(o, p.ici, p.malle)), 'Aucune semence en vente.')}
      <h3 class="section-title">🧺 Des hameaux</h3>${slotsHtml(coffre.map((o) => buySlot(o, p.ici, p.malle)), 'Son coffre est vide : elle achète en chemin ce que les hameaux ont en trop.')}`;
  }
  const html = `${bandeauHtml(p, tab.id)}${body}`;
  return fenetre ? html : `<h2>${CALECHE.ICONE} La calèche</h2>${marketTabsHtml()}${html}`;
}

/* -- Fiche d'un article (fenêtre de dialogue, cadre bois) : ses infos et les boutons de lot,
   chacun avec son total. Elle suit le jeu à chaque rendu (renderShopModal). -- */

let shopOpen = null; // { mode, id } — mode : vendre, acheter

export function lotBtn(attrs, q, label, total, ok) {
  return `<button type="button" class="btn lot-btn" ${attrs} data-q="${q}"${ok ? '' : ' disabled'}><span>${label}</span><small class="num">${total}</small></button>`;
}

function shopBodyHtml(o) {
  const it = DATA.OBJETS[o.id], p = presence();
  const absent = p.ici ? '' : `<li>${p.texte}</li>`;
  if (o.mode === 'deposer') {
    // (la malle : la calèche l'emporte à son passage, au prix de vente)
    const stock = sellableStock(o.id), frigo = fridgeCount(state, o.id), deja = contenuMalle(state).vente[o.id] || 0;
    const attrs = `data-action="deposer-item" data-item="${o.id}"`;
    const lots = [lotBtn(attrs, 1, '×1', `+${formatCoins(it.prix)} 💰`, stock >= 1)];
    if (stock >= 5) lots.push(lotBtn(attrs, 5, '×5', `+${formatCoins(5 * it.prix)} 💰`, true));
    if (stock > 1 && stock !== 5) lots.push(lotBtn(attrs, stock, `Tout (${stock})`, `+${formatCoins(stock * it.prix)} 💰`, true));
    return `
      <div class="item-head"><span class="item-icon" aria-hidden="true">${it.icone}</span><span class="item-title"><strong id="item-title">${it.nom}</strong><span class="num">${formatCoins(it.prix)} 💰 l'unité</span></span></div>
      <ul class="item-lines"><li>À vendre : ${formatQty(sellableCount(state, o.id))}${frigo > 0 ? ` (dont ${formatQty(frigo)} au frigo ❄️)` : ''}</li><li>Déposé dans la malle, la calèche l'emporte ${quandMalle()} et te paie.</li>${deja ? `<li>Déjà dans la malle : ${formatQty(deja)}</li>` : ''}</ul>
      <p class="lot-titre"><strong>Déposer dans la malle</strong></p>
      <div class="row item-actions lot-btns">${lots.join('')}</div>`;
  }
  if (o.mode === 'commander') {
    // (la malle : payé tout de suite, livré à son passage)
    const o2 = etalCaleche(state, seedForSale).find((x) => x.item === o.id);
    const deja = contenuMalle(state).commande[o.id] || 0;
    const attrs = `data-action="commander-item" data-item="${o.id}"`;
    const lots = [1, 5, 10].map((q) => {
      const d = devisCaleche(state, o.id, q);
      return lotBtn(attrs, q, `×${q}`, `−${formatCoins(d.cout)} 💰`, d.quantite >= q);
    });
    const ligne = !o2 ? 'Elle n\'en a plus.' : o2.sorte === 'coffre' ? `Dans son coffre : ${o2.stock}, acheté aux hameaux.` : 'Le prix monte un peu à chaque achat.';
    return `
      <div class="item-head"><span class="item-icon" aria-hidden="true">${it.icone}</span><span class="item-title"><strong id="item-title">${it.nom}</strong><span class="num">${o2 ? `${formatCoins(o2.prix)} 💰 l'unité` : ''}</span></span></div>
      <ul class="item-lines"><li>En stock : ${formatQty(countItem(state, o.id))}</li><li>${ligne}</li><li>Tu paies tout de suite ; la calèche livre dans la malle ${quandMalle()}.</li>${deja ? `<li>Déjà commandé : ${formatQty(deja)}</li>` : ''}</ul>
      <p class="lot-titre"><strong>Commander</strong></p>
      <div class="row item-actions lot-btns">${lots.join('')}</div>
      ${deja ? `<div class="row"><button type="button" class="btn small" data-action="malle-annuler" data-item="${o.id}">Annuler cette commande (+${formatCoins(((state.caleche.malle.commande || {})[o.id] || {}).cout || 0)} 💰)</button></div>` : ''}`;
  }
  if (o.mode === 'vendre') {
    const stock = sellableStock(o.id);
    const frigo = fridgeCount(state, o.id);
    const attrs = `data-action="sell-item" data-item="${o.id}"`;
    const lots = [lotBtn(attrs, 1, '×1', `+${formatCoins(it.prix)} 💰`, stock >= 1 && p.ici)];
    if (stock >= 5) lots.push(lotBtn(attrs, 5, '×5', `+${formatCoins(5 * it.prix)} 💰`, p.ici));
    if (stock > 1 && stock !== 5) lots.push(lotBtn(attrs, stock, `Tout (${stock})`, `+${formatCoins(stock * it.prix)} 💰`, p.ici));
    return `
      <div class="item-head"><span class="item-icon" aria-hidden="true">${it.icone}</span><span class="item-title"><strong id="item-title">${it.nom}</strong><span class="num">${formatCoins(it.prix)} 💰 l'unité</span></span></div>
      <ul class="item-lines"><li>À vendre : ${formatQty(sellableCount(state, o.id))}${frigo > 0 ? ` (dont ${formatQty(frigo)} au frigo ❄️)` : ''}</li>${absent}</ul>
      <div class="row item-actions lot-btns">${lots.join('')}</div>`;
  }
  // acheter : une semence (le prix monte à chaque unité, chaque lot dit son vrai total) ou un produit
  // des hameaux (à prix fixe, autant qu'elle en porte)
  const o2 = etalCaleche(state, seedForSale).find((x) => x.item === o.id);
  const attrs = `data-action="buy-item" data-item="${o.id}"`;
  const lots = [1, 5, 10].map((q) => {
    const d = devisCaleche(state, o.id, q);
    return lotBtn(attrs, q, `×${q}`, `−${formatCoins(d.cout)} 💰`, d.quantite >= q && p.ici);
  });
  const ligne = !o2 ? 'Elle n\'en a plus.' : o2.sorte === 'coffre' ? `Dans son coffre : ${o2.stock}, acheté aux hameaux.` : 'Le prix monte un peu à chaque achat.';
  return `
    <div class="item-head"><span class="item-icon" aria-hidden="true">${it.icone}</span><span class="item-title"><strong id="item-title">${it.nom}</strong><span class="num">${o2 ? `${formatCoins(o2.prix)} 💰 l'unité` : ''}</span></span></div>
    <ul class="item-lines"><li>En stock : ${formatQty(countItem(state, o.id))}</li><li>${ligne}</li>${absent}</ul>
    <div class="row item-actions lot-btns">${lots.join('')}</div>`;
}

function openShopModal(mode, id) {
  shopOpen = { mode, id };
  tel('modal', 'shop');
  openModal(`
    <div class="item-body"></div>
    <div class="row"><button type="button" class="btn" data-action="close-modal">Fermer</button></div>`, { labelledBy: 'item-title', className: 'modal bois item-modal shop-modal' });
  renderShopModal();
}

// Appelé à chaque rendu : la fiche suit le jeu ; un article qu'on n'a plus à vendre la ferme.
export function renderShopModal() {
  const body = document.querySelector('#modal-root .shop-modal .item-body');
  if (!body || !shopOpen) return;
  if ((shopOpen.mode === 'vendre' || shopOpen.mode === 'deposer') && sellableStock(shopOpen.id) < 1) {
    shopOpen = null;
    closeModal();
    return;
  }
  morph(body, shopBodyHtml(shopOpen));
}

function openHelpModal() {
  const tab = currentTab();
  tel('modal', 'market-help');
  openModal(`
    <h2 id="market-help-title"><span aria-hidden="true">${tab.icon}</span> ${tab.label}</h2>
    <p>${helpText(tab.id)}</p>
    <div class="row"><button type="button" class="btn" data-action="close-modal">Fermer</button></div>`, { labelledBy: 'market-help-title', className: 'modal bois item-modal' });
}

// La fenêtre ouverte, près d'elle : le cocher attend (js/ui/stage-windows.js l'appelle à chaque rendu
// de la fenêtre, et la page à chaque échange).
export function retenirCaleche() {
  if (tourneeDe(state)) retenir(state, ouPerso());
}

// Héler la calèche (le bouton de la fenêtre, celui de la carte, ou un appui sur elle). → vrai si elle
// s'arrête (ou l'est déjà).
export function helerCaleche() {
  const r = heler(state, ouPerso());
  if (!r.ok) { notify(r.error); return false; }
  if (!r.deja) notify(`${CALECHE.ICONE} « Ho ! » ${nomCocher(state)} arrête la calèche pour toi.`);
  refresh();
  return true;
}

/* ---------- la calèche sur la carte (le pont de la scène : js/carte/ferme/caleche.js) ---------- */

const T = 16;           // px par tuile de la carte
let annonce = null;     // le jour où son arrivée à la ferme a été annoncée
let majA = 0;           // (les arrêts aux hameaux : au plus deux fois par seconde)

// Chaque image (js/ui/loop.js) : la tournée posée dans le moteur dès que le Web Worker l'a tirée ; les
// arrêts passés (la réserve des hameaux achetée) ; son arrivée à la ferme annoncée (un tintement en
// toast) ; la fenêtre ouverte près d'elle, le cocher attend.
export function watchCaleche() {
  if (!tourneeDe(state)) {
    const T0 = farmTerrain(state), sol = T0 && T0.MONDE ? solDuMonde(T0) : null, t = sol && sol.tournee ? sol.tournee() : null;
    if (!t) return;
    poserTournee(farmSeed(state), t);
  }
  const now = Date.now();
  if (now - majA < 500) return;
  majA = now;
  const faits = majCaleche(state);
  if (faits.length) persistState();
  // (son arrivée à la ferme : ce qu'elle a vendu de la malle, ce qu'elle y a livré)
  for (const f of faits) if (f.malle) annoncerPassage(f.malle);
  const e = calecheMaintenant(state);
  if (e && e.etat === 'arret' && e.arret.sorte === 'ferme') {
    if (annonce !== state.day) {
      annonce = state.day;
      // (le chantier « l'île à bâtir » allumé, fiche I1b : elle ne commerce plus, elle passe sans s'annoncer)
      if (!villageActif(state)) notify(`🔔 Ding, ding ! La calèche est arrivée à la ferme, devant l'entrée${marcheOuvert(state) ? ' : vends-lui tes récoltes, achète-lui des graines' : ''}. Elle repart vers ${heureTexte(CALECHE.FERME + CALECHE.ARRET_FERME)}.`, { kind: 'info' });
    }
  } else if (e && annonce === null) annonce = e.t > 0 && e.etat !== 'gite' ? state.day : null;   // (déjà passée en arrivant)
  if (stageWindow === 'comptoir') retenirCaleche();
}

// Le message de son passage à la malle : « La calèche est passée : vendu …, +X 💰. Livré dans la malle : … ».
function annoncerPassage(m) {
  const vendu = Object.keys(m.vendu || {}).length ? `elle a vendu ${itemsText(m.vendu)} (+${formatCoins(m.gain)} 💰)` : '';
  const livre = Object.keys(m.livre || {}).length ? `ta commande t'attend dans la malle : ${itemsText(m.livre)}` : '';
  notify(`${CALECHE.ICONE} La calèche est passée à la malle : ${[vendu, livre].filter(Boolean).join(' ; ')}.`, { kind: 'succes', duree: 9000 });
}

// La malle pour la scène (js/carte/ferme/malle.js) : { x, y (px : le bord gauche et le bas de ses cases), cases,
// pleine }, ou null (pas de malle : pas de grand monde).
export function malleDepuisCarte() {
  if (villageActif(state)) return null;   // (l'île, fiche I7e : pas de calèche, pas de malle)
  const Tf = farmTerrain(state), M = Tf && Tf.MALLE;
  return M ? { x: M.x, y: M.y, cases: M.cases, pleine: mallePleine(state) } : null;
}

// Un appui sur la malle (le personnage arrivé devant) : la fenêtre de la calèche (Vendre : on y dépose).
export function malleToucheeDepuisCarte() {
  if (villageActif(state)) { renvoiAuPort('La malle de la calèche'); return; }   // (fiche I1b : le port)
  if (!marcheOuvert(state)) { notify(`${CALECHE.ICONE} ${marcheFerme(state)}`, { kind: 'info' }); return; }
  openStageWindow('comptoir');
}

// Pour la scène, à chaque image : où est la calèche (px de carte), ou null (pas de tournée).
// { x, y (le milieu de l'attelage, au sol), vue, gauche, etat, roule (px parcourus : les roues), ferme
// (garée à la ferme), helable (on peut la héler d'où est le personnage), ici (on peut commercer),
// proche (px : la distance à laquelle l'icône du bord de l'écran se montre), heler (px) }.
export function calecheDepuisCarte() {
  const e = calecheMaintenant(state);
  if (!e) return null;
  const ou = ouPerso();
  return {
    x: e.x * T, y: e.y * T, vue: e.vue, gauche: e.gauche, etat: e.etat, roule: e.dist * T,
    ferme: e.etat === 'arret' && e.arret.sorte === 'ferme',
    helable: e.etat === 'route' && helable(state, ou).ok, ici: calecheIci(state, ou).ok,
    proche: CALECHE.PROCHE * T, heler: CALECHE.HELER * T,
  };
}

// Un appui sur la calèche : là, sa fenêtre ; en chemin et tout près, on la hèle (et sa fenêtre
// s'ouvre) ; sinon, où elle va.
export function calecheToucheeDepuisCarte() {
  if (villageActif(state)) { renvoiAuPort(`${CALECHE.ICONE} La calèche`); return; }   // (fiche I1b : le port)
  if (sceneCaleche()) return;
  const ou = ouPerso();
  if (!marcheOuvert(state)) {
    // (le didacticiel, fiche 9b : avant le niveau du Marché, on la rencontre : hélée en chemin, ou
    // arrêtée à côté, son cocher te salue)
    // (et les objectifs du jour : la rencontrer, js/engine/objectifs.js)
    if (etapeDidacticiel(state) === 'caleche' || objectifsActifs(state)) {
      const h = helable(state, ou);
      if (h.ok && h.e.etat === 'route') heler(state, ou);
      const vue = etapeDidacticiel(state) === 'caleche' ? rencontreCaleche(state, ou) : calecheAPortee(state, ou);
      if (vue) {
        noterObjectif(state, 'caleche');
        persistState();
        notify(`${CALECHE.ICONE} « Ho. » ${nomCocher(state)} te salue d'un signe : il passe ici chaque jour vers ${heureTexte(CALECHE.FERME)}, et commercera avec toi dès le niveau ${unlockLevel('marche')}. « ${DATA.PLAN_MONDE.HAMEAUX.GUE}, c'est le hameau d'à côté. Va voir. »`, { kind: 'info' });
        refresh();
        return;
      }
    }
    notify(`${CALECHE.ICONE} ${marcheFerme(state)}`, { kind: 'info' });
    return;
  }
  if (calecheIci(state, ou).ok) { ecouterCocher(); openStageWindow('comptoir'); return; }
  const h = helable(state, ou);
  if (h.ok && h.e.etat === 'route') { if (helerCaleche()) { ecouterCocher(); openStageWindow('comptoir'); } return; }
  const e = calecheMaintenant(state);
  notify(`${CALECHE.ICONE} ${h.ok ? '' : 'Approche-toi : '}${ouEstCaleche(state, e)} ${prochainPassage(state)}`, { kind: 'info' });
}

/* ---------- actions de cet écran (voir ui/actions.js) ---------- */

registerActions({
  'shop-item': (target) => {
    openShopModal(target.dataset.mode, target.dataset.item);
  },
  'market-help': () => {
    openHelpModal();
  },
  'caleche-heler': () => {
    helerCaleche();
  },
  'buy-item': (target) => {
    const item = target.dataset.item;
    const result = applyResult(acheterCaleche(state, item, Math.max(1, Number(target.dataset.q) || 1), ouPerso()));
    if (result.ok) {
      // fiche 10 : les achats répétés d'un même objet se cumulent (quantité et prix)
      notify(null, { cumul: { cle: `caleche-achat:${item}`, quantites: { n: result.bought, prix: result.cost }, texte: (t) => `Acheté à la calèche : ${formatQty(t.n)} ${DATA.OBJETS[item].icone} (−${formatCoins(t.prix)} 💰)` } });
      refresh();
    }
  },
  'sell-item': (target) => {
    const item = target.dataset.item;
    const result = applyResult(vendreCaleche(state, item, Math.max(1, Number(target.dataset.q) || 1), ouPerso()));
    // fiche 10 : les ventes répétées d'un même objet se cumulent (« +30 💰 » puis « +60 💰 »)
    if (result.ok) notify(null, { cumul: { cle: `caleche-vente:${item}`, quantites: { n: result.sold, gain: result.gain }, texte: (t) => `Vendu à la calèche : ${formatQty(t.n)} ${DATA.OBJETS[item].icone} (+${formatCoins(t.gain)} 💰)` } });
  },
  // la malle : y déposer, reprendre, commander, annuler, prendre la livraison
  'deposer-item': (target) => {
    const item = target.dataset.item;
    const r = applyResult(deposerMalle(state, item, Math.max(1, Number(target.dataset.q) || 1)));
    if (r.ok) {
      notify(null, { cumul: { cle: `malle-depot:${item}`, quantites: { n: r.n, gain: r.n * DATA.OBJETS[item].prix }, texte: (t) => `Dans la malle : ${formatQty(t.n)} ${DATA.OBJETS[item].icone} (+${formatCoins(t.gain)} 💰 ${quandMalle()})` } });
      refresh();
    }
  },
  'malle-reprendre': (target) => {
    const item = target.dataset.item;
    const n = item ? (reprendreMalle(state, item).n || 0) : reprendreTout(state);
    if (!n) return;
    persistState();
    notify(`Repris de la malle : ${formatQty(n)} ${item ? DATA.OBJETS[item].icone : 'objets'}.`, { kind: 'info' });
    refresh();
  },
  'commander-item': (target) => {
    const item = target.dataset.item;
    const r = applyResult(commanderCaleche(state, item, Math.max(1, Number(target.dataset.q) || 1)));
    if (r.ok) {
      notify(null, { cumul: { cle: `malle-commande:${item}`, quantites: { n: r.bought, prix: r.cost }, texte: (t) => `Commandé : ${formatQty(t.n)} ${DATA.OBJETS[item].icone} (−${formatCoins(t.prix)} 💰), livré dans la malle ${quandMalle()}` } });
      refresh();
    }
  },
  'malle-annuler': (target) => {
    const rendu = annulerCommande(state, target.dataset.item || null);
    if (!rendu) return;
    persistState();
    notify(`Commande annulée : +${formatCoins(rendu)} 💰 rendus.`, { kind: 'info' });
    refresh();
  },
  'malle-prendre': (target) => {
    const n = prendreLivraison(state, target.dataset.item || null);
    if (!n) return;
    persistState();
    notify(`Pris dans la malle : ${formatQty(n)} ${target.dataset.item ? DATA.OBJETS[target.dataset.item].icone : 'objets'}.`, { kind: 'succes' });
    refresh();
  },
  // le récit (lot 7) : commander à un atelier de hameau, acheter un meuble, par le cocher (la calèche là)
  'ile-commander': (target) => {
    if (!calecheIci(state, ouPerso()).ok) { notify(`${CALECHE.ICONE} La calèche n'est pas là.`); return; }
    const { hameau, atelier, recette } = target.dataset;
    const r = commander(state, hameau, atelier, recette, Number(target.dataset.lots) || 1);
    if (!r.ok) { notify(r.error); return; }
    persistState();
    const A = DATA.ILE.ATELIERS[atelier];
    notify(`${CALECHE.ICONE} ${nomCocher(state)} prend ta commande : ${A.recettes[recette].nom.toLowerCase()} (×${r.lots}). « Je te rapporte ça ${r.pret === state.day + 1 ? 'demain' : `le jour ${r.pret}`}. »`, { kind: 'info' });
    refresh();
  },
  'ile-meuble': (target) => {
    if (!calecheIci(state, ouPerso()).ok) { notify(`${CALECHE.ICONE} La calèche n'est pas là.`); return; }
    const { hameau, meuble } = target.dataset;
    const r = acheterMeubleHameau(state, hameau, meuble);
    if (!r.ok) { notify(r.error); return; }
    persistState();
    notify(`${CALECHE.ICONE} ${DATA.MEUBLES[meuble].nom} : ${nomCocher(state)} le sort de la calèche, il est dans ton inventaire (à poser dans la maison).`, { kind: 'info' });
    refresh();
  },
  // le récit (lot 6) : confier au cocher ce qu'on a pour une promesse de Maurice (la calèche là)
  'promesse-confier': (target) => {
    if (!calecheIci(state, ouPerso()).ok) { notify(`${CALECHE.ICONE} La calèche n'est pas là.`); return; }
    const r = livrerPromesse(state, target.dataset.id);
    if (!r.ok) { notify(r.error); return; }
    persistState();
    notify(`${CALECHE.ICONE} ${nomCocher(state)} charge ${itemsText(r.donnes)}. ${r.tenue ? '« C\'est tout. Il aurait été content. »' : '« Je porte ça. Il en manque encore. »'}`, { kind: 'info' });
    refresh();
  },
});

