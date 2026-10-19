/* carte/ville/marche.js — la scène de la ville : le marché, les boutiques et les entreprises.
 *
 * Le marché de la ville (couche « lieux » : les étals), les boutiques (les commerces bâtis en
 * blocs, js/carte/ville/lieux.js : on achète à leur comptoir, VILLE.BOUTIQUES, quand un employé y
 * travaille) et les entreprises (les entrepôts « conserverie », « fromagerie », « confiturerie ») :
 * les ventes et les achats passent tout de suite par le moteur du jeu (FermeHote,
 * js/ui/excursion.js).
 *
 * Méthodes de la scène des cartes (js/ville-carte.js), posées sur son prototype : `this` est
 * la scène (voir docs/architecture-phaser.md).
 */
(function (global) {
  'use strict';

  const V = global.CarteVille;
  const { hote } = V;
  const { T } = V.C;
  // les meubles où l'on achète, dans une boutique (son comptoir, sa vitrine, son étal…)
  const COMPTOIRS = ['comptoir', 'vitrine_pain', 'etal_poisson', 'presentoir'];

  V.partie({

    // ---------- le marché de la ville, les entreprises ----------

    // La ferme (js/ui/excursion.js) : ce qu'elle peut vendre ici et à quel prix, ses pièces,
    // ses entreprises ; null sans partie.
    vitrine() {
      return hote() && hote().vitrine ? hote().vitrine() : null;
    },

    // Un toucher sur le comptoir d'une boutique où l'on est (au rez-de-chaussée) : sa fenêtre,
    // si un employé y travaille ; sinon, ses horaires.
    tapBoutique(w) {
      const im = this.immeubleIci, H = hote();
      if (!im || this.niveauVille || !H || !H.boutique) return false;
      const id = im.b.nom, B = H.boutique(id);
      if (!B) return false;
      const sur = im.niveaux[0].plan.meubles.some((mb) => COMPTOIRS.includes(mb.nom)
        && w.x >= (im.x + mb.x) * T && w.x <= (im.x + mb.x + mb.w) * T && w.y >= (im.y + mb.y) * T - T && w.y <= (im.y + mb.y + mb.h) * T);
      if (!sur) return false;
      const ouvert = (this.habitants || []).some((n) => n.emploi && n.emploi.lieu === id && n.etat === 'travail' && !n.cache);
      if (ouvert) { this.openLieu('boutique:' + id); return true; }
      const h = (x) => { const m = Math.round(x * 60); return `${Math.floor(m / 60)} h${m % 60 ? String(m % 60).padStart(2, '0') : ''}`; };
      const e = ((this.ecoImm && this.ecoImm.emplois) || []).find((q) => q.LIEU === id);
      this.say(`🔒 ${B.icone} ${B.nom} : personne au comptoir.${e ? ` Ouvert ${e.HORAIRES.map(([a, b]) => `de ${h(a)} à ${h(b)}`).join(' et ')}.` : ''}`);
      return true;
    },

    tapLieu(w) {
      if (this.tapBoutique(w)) return true;
      const etal = (this.lieux || []).find((o) => o.name === 'marche' && w.x >= o.x && w.x <= o.x + o.width && w.y >= o.y && w.y <= o.y + o.height);
      if (etal) { this.openLieu('marche'); return true; }
      const v = this.vitrine();
      const ids = v ? v.entreprises.map((e) => e.id) : ['conserverie', 'fromagerie', 'confiturerie'];
      const b = (this.buildings || []).find((q) => ids.includes(q.name) && w.x >= q.x0 && w.x <= q.x1 && w.y >= q.top && w.y <= q.base + 8);
      if (b) { this.openLieu(b.name); return true; }
      return false;
    },

    // La fenêtre d'un étal ou d'une entreprise (une fenêtre du jeu : hud.js, openDialog).
    openLieu(quoi) {
      if (!this.openDialog('lieu-titre', '<div class="lieu-corps"></div>')) return;
      this.lieu = quoi;
      this.renderLieu();
      this.focusDialog();
    },

    // Le contenu de la fenêtre, refait après chaque vente ou achat ; le bouton qui avait le
    // focus le retrouve (même rôle : vendre tel produit, le quota…), sinon le premier choix.
    renderLieu() {
      const dlg = this.dialogEl;
      if (!dlg || !this.lieu) return;
      const titre = dlg.querySelector('#lieu-titre'), corps = dlg.querySelector('.lieu-corps');
      const a = document.activeElement;
      const avant = a && corps.contains(a) && a.tagName === 'BUTTON'
        ? ['vendre', 'acheter', 'n', 'q'].filter((k) => a.dataset[k] !== undefined).map((k) => `[data-${k}="${CSS.escape(a.dataset[k])}"]`).join('') || (a.id ? '#' + CSS.escape(a.id) : '')
        : null;
      this.renderLieuCorps(titre, corps);
      if (avant === null) return;
      const b = avant && corps.querySelector(avant + ':not([disabled])');
      if (b) b.focus({ preventScroll: true }); else this.focusDialog();
    },

    renderLieuCorps(titre, corps) {
      const v = this.vitrine(), H = hote();
      const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
      if (this.lieu === 'marche') {
        titre.textContent = '🧺 Le marché de la ville';
        if (!v) { corps.innerHTML = '<p class="note">Il faut une partie en cours pour vendre les produits de la ferme.</p>'; return; }
        const rangs = v.vente.map((r) => `<div class="rang"><span aria-hidden="true">${esc(r.icone)}</span><span class="nom">${esc(r.nom)} <small>× ${r.qte}</small></span><span>${r.prix} 💰</span>
            <button type="button" class="btn" data-vendre="${esc(r.item)}" data-n="1">Vendre 1</button>
            <button type="button" class="btn" data-vendre="${esc(r.item)}" data-n="${r.qte}">Tout</button></div>`).join('');
        corps.innerHTML = `<p class="note">On achète ici les produits de la ferme plus cher qu'au Marché de la ferme. 💰 ${v.pieces} pièces.</p>
          <div class="rangs">${rangs || '<p class="note">Rien à vendre : pas de produits de la ferme en stock.</p>'}</div>`;
        corps.querySelectorAll('[data-vendre]').forEach((b) => { b.onclick = () => {
          const it = b.dataset.vendre, r = H.vendre(it, Number(b.dataset.n) || 0);
          const def = v.vente.find((q) => q.item === it);
          if (r && r.ok && def) this.say(`🧺 Vendu : ${r.sold} ${def.icone} ${def.nom.toLowerCase()} (+${r.gain} 💰)`);
          this.renderLieu();
        }; });
        return;
      }
      if (this.lieu.startsWith('boutique:')) {
        // une boutique : ses produits, leur prix, de quoi en acheter un ou cinq
        const id = this.lieu.slice(9), B = H && H.boutique ? H.boutique(id) : null;
        titre.textContent = B ? `${B.icone} ${B.nom}` : '🛍️ Boutique';
        if (!B) { corps.innerHTML = '<p class="note">Il faut une partie en cours pour acheter.</p>'; return; }
        const rangs = B.objets.map((o) => `<div class="rang"><span aria-hidden="true">${esc(o.icone)}</span><span class="nom">${esc(o.nom)}${o.energie ? ` <small>⚡ ${o.energie}</small>` : ''}</span><span>${o.prix} 💰</span>
            <button type="button" class="btn" data-acheter="${esc(o.item)}" data-n="1"${B.pieces >= o.prix ? '' : ' disabled'}>Acheter 1</button>
            <button type="button" class="btn" data-acheter="${esc(o.item)}" data-n="5"${B.pieces >= o.prix * 5 ? '' : ' disabled'}>5</button></div>`).join('');
        corps.innerHTML = `<p class="note">Ce que tu achètes va dans l'inventaire. 💰 ${B.pieces} pièces.</p><div class="rangs">${rangs}</div>`;
        corps.querySelectorAll('[data-acheter]').forEach((b) => { b.onclick = () => {
          const it = b.dataset.acheter, r = H.acheterBoutique(id, it, Number(b.dataset.n) || 1);
          const o = B.objets.find((q) => q.item === it);
          if (r && r.ok && o) this.say(`🛍️ Acheté : ${r.bought} ${o.icone} ${o.nom.toLowerCase()} (−${r.cost} 💰)`);
          this.renderLieu();
        }; });
        return;
      }
      const e = v && v.entreprises.find((q) => q.id === this.lieu);
      const nom = this.lieu.charAt(0).toUpperCase() + this.lieu.slice(1);
      if (!e) { titre.textContent = '🏭 ' + nom; corps.innerHTML = '<p class="note">Il faut une partie en cours pour acheter cette entreprise.</p>'; return; }
      titre.textContent = `${e.icone} ${e.nom}`;
      const fait = `${e.texte} Chaque jour à ${e.heure} h, elle prend ${e.par} ${e.intrantNom} de la ferme par ${e.produit.toLowerCase()} et le vend ${e.prixProduit} 💰.`;
      if (!e.achetee) {
        corps.innerHTML = `<p class="note">${esc(fait)}</p><p class="note">Prix : <strong>${e.prix} 💰</strong> · tes pièces : ${v.pieces} 💰</p>
          <div class="choix"><button type="button" class="btn primary" id="lieu-acheter"${v.pieces >= e.prix ? '' : ' disabled'}>${v.pieces >= e.prix ? `Acheter la ${esc(e.nom.toLowerCase())}` : 'Pas assez de pièces'}</button></div>`;
        const b = corps.querySelector('#lieu-acheter');
        if (b) b.onclick = () => {
          const r = H.acheter(e.id);
          if (r && r.ok) this.say(`${e.icone} La ${e.nom.toLowerCase()} est à toi !`);
          this.renderLieu();
        };
        return;
      }
      const b = e.bilan;
      corps.innerHTML = `<p class="note">${esc(fait)}</p>
        <div class="quota"><button type="button" class="btn" data-q="-1"${e.quota > 0 ? '' : ' disabled'} aria-label="Un de moins">−</button><span>Quota : <strong>${e.quota}</strong> ${esc(e.produit.toLowerCase())}${e.quota > 1 ? 's' : ''} par jour</span><button type="button" class="btn" data-q="1"${e.quota < e.quotaMax ? '' : ' disabled'} aria-label="Un de plus">+</button></div>
        <p class="note">${b ? `Le jour ${b.jour} : ${b.unites} fabriqués, +${b.gain} 💰.` : 'Pas encore de production.'} En stock à la ferme : ${e.dispo} ${esc(e.intrantNom)}.</p>`;
      corps.querySelectorAll('[data-q]').forEach((btn) => { btn.onclick = () => {
        H.quota(e.id, e.quota + Number(btn.dataset.q));
        this.renderLieu();
      }; });
    },
  });
})(window);
