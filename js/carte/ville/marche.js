/* carte/ville/marche.js — la ville et les cartes qu'on rejoint par elle : le marché de la ville et les entreprises.
 *
 * Le marché de la ville (couche « lieux » : les étals) et les entreprises (les entrepôts
 * « conserverie », « fromagerie », « confiturerie ») : les ventes et les achats passent tout
 * de suite par le moteur du jeu (FermeHote, js/ui/excursion.js).
 *
 * Méthodes de la scène des cartes (js/ville-carte.js), posées sur son prototype : `this` est
 * la scène (voir docs/architecture-phaser.md).
 */
(function (global) {
  'use strict';

  const V = global.CarteVille;
  const { hote } = V;

  V.partie({

    // ---------- le marché de la ville, les entreprises ----------

    // La ferme (js/ui/excursion.js) : ce qu'elle peut vendre ici et à quel prix, ses pièces,
    // ses entreprises ; null sans partie.
    vitrine() {
      return hote() && hote().vitrine ? hote().vitrine() : null;
    },

    tapLieu(w) {
      const etal = (this.lieux || []).find((o) => o.name === 'marche' && w.x >= o.x && w.x <= o.x + o.width && w.y >= o.y && w.y <= o.y + o.height);
      if (etal) { this.openLieu('marche'); return true; }
      const v = this.vitrine();
      const ids = v ? v.entreprises.map((e) => e.id) : ['conserverie', 'fromagerie', 'confiturerie'];
      const b = (this.buildings || []).find((q) => ids.includes(q.name) && w.x >= q.x0 && w.x <= q.x1 && w.y >= q.top && w.y <= q.base + 8);
      if (b) { this.openLieu(b.name); return true; }
      return false;
    },

    openLieu(quoi) {
      const el = document.getElementById('lieu-fenetre');
      if (!el) return;
      this.lieu = quoi;
      this.renderLieu();
      el.hidden = false;
      this.dialog = true;
      const b = el.querySelector('button:not([disabled])');
      if (b) b.focus();
    },

    closeLieu() {
      const el = document.getElementById('lieu-fenetre');
      if (el) el.hidden = true;
      this.lieu = null;
      this.time.delayedCall(60, () => { this.dialog = false; });
    },

    renderLieu() {
      const titre = document.getElementById('lieu-titre'), corps = document.getElementById('lieu-corps');
      const v = this.vitrine(), H = hote();
      const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
      if (this.lieu === 'marche') {
        titre.textContent = '🧺 Le marché de la ville';
        if (!v) { corps.innerHTML = '<p class="note">Il faut une partie en cours pour vendre les produits de la ferme.</p>'; return; }
        const rangs = v.vente.map((r) => `<div class="rang"><span aria-hidden="true">${esc(r.icone)}</span><span class="nom">${esc(r.nom)} <small>× ${r.qte}</small></span><span>${r.prix} 💰</span>
            <button type="button" data-vendre="${esc(r.item)}" data-n="1">Vendre 1</button>
            <button type="button" data-vendre="${esc(r.item)}" data-n="${r.qte}">Tout</button></div>`).join('');
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
      const e = v && v.entreprises.find((q) => q.id === this.lieu);
      const nom = this.lieu.charAt(0).toUpperCase() + this.lieu.slice(1);
      if (!e) { titre.textContent = '🏭 ' + nom; corps.innerHTML = '<p class="note">Il faut une partie en cours pour acheter cette entreprise.</p>'; return; }
      titre.textContent = `${e.icone} ${e.nom}`;
      const fait = `${e.texte} Chaque jour à ${e.heure} h, elle prend ${e.par} ${e.intrantNom} de la ferme par ${e.produit.toLowerCase()} et le vend ${e.prixProduit} 💰.`;
      if (!e.achetee) {
        corps.innerHTML = `<p class="note">${esc(fait)}</p><p class="note">Prix : <strong>${e.prix} 💰</strong> · tes pièces : ${v.pieces} 💰</p>
          <div class="choix"><button type="button" id="lieu-acheter"${v.pieces >= e.prix ? '' : ' disabled'}>${v.pieces >= e.prix ? `Acheter la ${esc(e.nom.toLowerCase())}` : 'Pas assez de pièces'}</button></div>`;
        const b = document.getElementById('lieu-acheter');
        if (b) b.onclick = () => {
          const r = H.acheter(e.id);
          if (r && r.ok) this.say(`${e.icone} La ${e.nom.toLowerCase()} est à toi !`);
          this.renderLieu();
        };
        return;
      }
      const b = e.bilan;
      corps.innerHTML = `<p class="note">${esc(fait)}</p>
        <div class="quota"><button type="button" data-q="-1"${e.quota > 0 ? '' : ' disabled'} aria-label="Un de moins">−</button><span>Quota : <strong>${e.quota}</strong> ${esc(e.produit.toLowerCase())}${e.quota > 1 ? 's' : ''} par jour</span><button type="button" data-q="1"${e.quota < e.quotaMax ? '' : ' disabled'} aria-label="Un de plus">+</button></div>
        <p class="note">${b ? `Le jour ${b.jour} : ${b.unites} fabriqués, +${b.gain} 💰.` : 'Pas encore de production.'} En stock à la ferme : ${e.dispo} ${esc(e.intrantNom)}.</p>`;
      corps.querySelectorAll('[data-q]').forEach((btn) => { btn.onclick = () => {
        H.quota(e.id, e.quota + Number(btn.dataset.q));
        this.renderLieu();
      }; });
    },
  });
})(window);
