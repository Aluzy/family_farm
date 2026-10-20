/* carte/ville/marche.js — la scène de la ville : le marché, les boutiques et les entreprises.
 *
 * Le marché de la ville (couche « lieux » : les étals), les boutiques (les commerces bâtis en
 * blocs, js/carte/ville/lieux.js : on achète à leur comptoir, VILLE.BOUTIQUES, quand un employé y
 * travaille), les guichets de la mairie (le tableau de bord de l'économie de la ville) et du
 * bureau de négoce (il rachète les matières qui manquent), et les entreprises (les entrepôts « conserverie », « fromagerie », « confiturerie ») :
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
  // les lieux qui ont un guichet (leur comptoir) : leur fenêtre
  const GUICHETS = { mairie: { icone: '🏛️', nom: 'Mairie' }, negoce: { icone: '📈', nom: 'Bureau de négoce' } };

  V.partie({

    // ---------- le marché de la ville, les entreprises ----------

    // La ferme (js/ui/excursion.js) : ce qu'elle peut vendre ici et à quel prix, ses pièces,
    // ses entreprises ; null sans partie.
    vitrine() {
      return hote() && hote().vitrine ? hote().vitrine() : null;
    },

    // Un toucher sur le comptoir d'une boutique ou le guichet d'un lieu (GUICHETS) où l'on est
    // (au rez-de-chaussée) : sa fenêtre, si un employé y travaille ; sinon, ses horaires.
    tapBoutique(w) {
      const im = this.immeubleIci, H = hote();
      if (!im || this.niveauVille || !H || !H.boutique) return false;
      const id = im.b.nom, B = H.boutique(id) || GUICHETS[id];
      if (!B) return false;
      const sur = im.niveaux[0].plan.meubles.some((mb) => COMPTOIRS.includes(mb.nom)
        && w.x >= (im.x + mb.x) * T && w.x <= (im.x + mb.x + mb.w) * T && w.y >= (im.y + mb.y) * T - T && w.y <= (im.y + mb.y + mb.h) * T);
      if (!sur) return false;
      const ouvert = (this.habitants || []).some((n) => n.emploi && n.emploi.lieu === id && n.etat === 'travail' && !n.cache);
      if (ouvert) { this.openLieu(GUICHETS[id] ? id : 'boutique:' + id); return true; }
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
        const cours = B.cours > 100 ? `les prix montent (${B.cours} %)` : B.cours < 100 ? `les prix baissent (${B.cours} %)` : 'les prix habituels';
        const stock = B.stock == null ? '' : B.stock > 0 ? ` En stock aujourd'hui : ${B.stock} ; ${cours}.` : ' Plus rien en stock aujourd\'hui.';
        corps.innerHTML = `<p class="note">Ce que tu achètes va dans l'inventaire. 💰 ${B.pieces} pièces.${stock}</p><div class="rangs">${rangs}</div>`;
        corps.querySelectorAll('[data-acheter]').forEach((b) => { b.onclick = () => {
          const it = b.dataset.acheter, r = H.acheterBoutique(id, it, Number(b.dataset.n) || 1);
          const o = B.objets.find((q) => q.item === it);
          if (r && r.ok && o) this.say(`🛍️ Acheté : ${r.bought} ${o.icone} ${o.nom.toLowerCase()} (−${r.cost} 💰)`);
          this.renderLieu();
        }; });
        return;
      }
      if (this.lieu === 'mairie') { this.renderMairie(titre, corps, H, esc); return; }
      if (this.lieu === 'negoce') { this.renderNegoce(titre, corps, H, esc); return; }
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
        <p class="note">${b ? `Le jour ${b.jour} : ${b.unites} fabriqués, +${b.gain} 💰.` : 'Pas encore de production.'} En stock à la ferme : ${e.dispo} ${esc(e.intrantNom)}.</p>
        ${e.eco ? `<p class="note">Pour la ville, hier : ${e.eco.recette} 💰 de ventes, ${e.eco.depense} 💰 de matières et de salaires, ${e.eco.benefice >= 0 ? `${e.eco.benefice} 💰 de bénéfice, dont ${Math.round((e.eco.benefice * e.part) / 100)} 💰 pour toi (${e.part} %)` : `une perte de ${-e.eco.benefice} 💰`}.</p>` : ''}`;
      corps.querySelectorAll('[data-q]').forEach((btn) => { btn.onclick = () => {
        H.quota(e.id, e.quota + Number(btn.dataset.q));
        this.renderLieu();
      }; });
    },

    // La mairie : le tableau de bord de l'économie de la ville (js/engine/economie.js,
    // economieVue) : la caisse, les habitants, les pénuries, les stocks et les prix, les comptes.
    renderMairie(titre, corps, H, esc) {
      titre.textContent = '🏛️ La mairie';
      const M = H && H.mairie ? H.mairie() : null;
      if (!M) { corps.innerHTML = '<p class="note">Il faut une partie en cours.</p>'; return; }
      const b = M.bilan, signe = (n) => (n > 0 ? '+' : n < 0 ? '−' : '') + Math.abs(n);
      const P = Object.fromEntries(M.produits.map((p) => [p.id, p]));
      const nomP = (id) => (P[id] ? `${P[id].icone} ${P[id].nom.toLowerCase()}` : id);
      const lieu = (id) => { const n = M.lieux[id] || id; return n.charAt(0).toUpperCase() + n.slice(1); };
      const pen = Object.entries(M.penuries).filter(([, q]) => q > 0);
      const sorties = Object.entries(M.sorties).map(([id, n]) => `${lieu(id).toLowerCase()} ${n}`).join(', ');
      const hab = M.habitants;
      const stocks = M.produits.map((p) => {
        const fl = p.prix > p.base ? ' <small class="hausse">▲</small>' : p.prix < p.base ? ' <small class="baisse">▼</small>' : '';
        return `<div class="rang"><span aria-hidden="true">${esc(p.icone)}</span><span class="nom">${esc(p.nom)} <small>${p.stock} en stock · ${p.demande} / jour</small></span><span>${p.prix} 💰${fl}</span></div>`;
      }).join('');
      const comptes = b ? Object.entries(b.comptes).sort((x, y) => y[1].benefice - x[1].benefice)
        .map(([id, c]) => `<div class="rang"><span class="nom">${esc(lieu(id))}</span><span class="${c.benefice < 0 ? 'perte' : ''}">${signe(c.benefice)} 💰</span></div>`).join('') : '';
      corps.innerHTML = `<p class="note">Caisse de la ville : <strong>${M.caisse} 💰</strong>${b ? ` (${signe(b.caisse)} 💰 le jour ${b.jour})` : ''}.${b && b.part ? ` Ta part des entreprises : +${b.part} 💰.` : ''}</p>
        <p class="note">${hab.foyers} foyers en ville · bonheur moyen ${hab.bonheur} · ${hab.argent} 💰 par foyer${sorties ? ` · sorties : ${esc(sorties)}` : ''}.</p>
        ${b ? `<p class="note">Hier : ${b.camions} camion${b.camions > 1 ? 's' : ''} sur la route (${b.transport} unités transportées).</p>` : '<p class="note">Le premier bilan arrive après la première nuit.</p>'}
        <h4>Pénuries</h4>
        <p class="note">${pen.length ? `Il manque ${pen.map(([m, q]) => `${q} ${esc(nomP(m))}`).join(', ')}. Le bureau de négoce les rachète.` : 'Rien ne manque à la ville.'}</p>
        <details><summary>Stocks et prix du jour</summary><div class="rangs">${stocks}</div></details>
        ${comptes ? `<details><summary>Les comptes d'hier</summary><div class="rangs">${comptes}</div></details>` : ''}`;
    },

    // Le bureau de négoce : les matières qui manquent à la ville (ECONOMIE.NEGOCE), ce que la
    // ferme en a, de quoi en vendre.
    renderNegoce(titre, corps, H, esc) {
      titre.textContent = '📈 Le bureau de négoce';
      const N = H && H.negoce ? H.negoce() : null;
      if (!N) { corps.innerHTML = '<p class="note">Il faut une partie en cours pour vendre.</p>'; return; }
      const rangs = N.offres.map((o) => {
        const tete = `<div class="rang"><span aria-hidden="true">${esc(o.icone)}</span><span class="nom"><strong>${esc(o.nom)}</strong> <small>il en manque ${o.quantite}</small></span><span>${o.prix} 💰 / u.</span></div>`;
        const objets = o.objets.length ? o.objets.map((it) => {
          const max = Math.min(it.qte, o.quantite);
          return `<div class="rang"><span aria-hidden="true">${esc(it.icone)}</span><span class="nom">${esc(it.nom)} <small>× ${it.qte}</small></span>
            <button type="button" class="btn" data-vendre="${esc(it.item)}" data-n="1">Vendre 1</button>
            <button type="button" class="btn" data-vendre="${esc(it.item)}" data-n="${max}">${max}</button></div>`;
        }).join('') : '<p class="note">Tu n\'en as pas dans l\'inventaire.</p>';
        return tete + objets;
      }).join('');
      corps.innerHTML = `<p class="note">Le bureau rachète les matières qui manquent à la ville, plus cher que le marché. 💰 ${N.pieces} pièces.</p>
        <div class="rangs">${rangs || '<p class="note">Rien ne manque aujourd\'hui : reviens demain.</p>'}</div>`;
      corps.querySelectorAll('[data-vendre]').forEach((b) => { b.onclick = () => {
        const it = b.dataset.vendre, r = H.vendreNegoce(it, Number(b.dataset.n) || 1);
        const o = N.offres.flatMap((q) => q.objets).find((q) => q.item === it);
        if (r && r.ok && o) this.say(`📈 Vendu au négoce : ${r.sold} ${o.icone} ${o.nom.toLowerCase()} (+${r.gain} 💰)`);
        this.renderLieu();
      }; });
    },
  });
})(window);
