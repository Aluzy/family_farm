/* carte/ferme/etiquettes.js — la scène de la ferme : ce qui est en DOM par-dessus la carte.
 *
 * Les étiquettes des lieux (nom et pastille « à faire »), les bulles des tas à ramasser, la bulle
 * « +x » au-dessus du personnage, la bulle de la citerne, la bulle du compagnon (son aide) : des
 * éléments DOM du calque des
 * étiquettes (ctx.labelLayer), replacés à chaque image.
 *
 * Méthodes de la scène de la ferme (js/farm-stage.js), posées sur son prototype : `this` est la
 * scène, `this.ctx` ce que la page lui a donné au montage (voir docs/architecture-phaser.md).
 */
(function (global) {
  'use strict';

  const K = global.CarteKit;
  const F = global.FermeCarte;
  const { T, TREE_OBJECT, MIN_TAP, LABEL_GAP, BUBBLE_TIP_X, BUBBLE_TIP_Y, AIDE } = F.C;
  const { pixelRatio } = F;
  const CASE_TIP_MS = 2600;   // fiche 21 : la bulle d'une case de culture reste ce temps après l'appui

  F.partie({

    // Le point (wx, wy) est-il sur la citerne (zone d'appui élargie à 44 px CSS) ?
    onTank(wx, wy) {
      const s = this.tank;
      if (!s) return false;
      const min = (MIN_TAP * pixelRatio()) / this.cameras.main.zoom;
      const w = Math.max(s.width, min), h = Math.max(s.height, min);
      const cx = s.x + s.width / 2, cy = s.y - s.height / 2;
      return Math.abs(wx - cx) <= w / 2 && Math.abs(wy - cy) <= h / 2;
    },

    // Bulle de la citerne (DOM, par-dessus le canvas), replacée à chaque image tant qu'elle est visible.
    showTankTip(on) {
      if (!on) {
        if (this.tankTip) this.tankTip.hidden = true;
        this.tankTipUntil = 0;
        return;
      }
      if (!this.tankTip) {
        const el = document.createElement('div');
        el.className = 'stage-tip';
        el.setAttribute('role', 'status');
        this.ctx.labelLayer.appendChild(el);
        this.tankTip = el;
      }
      this.tankTip.hidden = false;
      this.tipW = 0;
      this.tankTipUntil = 0;
      this.syncTankTip();
    },

    syncTankTip() {
      const el = this.tankTip;
      if (!el || el.hidden) return;
      const text = (this.ctx.lastModel && this.ctx.lastModel.citerneTexte) || '';
      if (!text || !this.tank) { this.showTankTip(false); return; }
      // Sa taille n'est relue (lecture qui force la mise en page) que quand son texte change
      // ou qu'elle réapparaît (showTankTip remet tipW à 0).
      if (el.textContent !== text) { el.textContent = text; this.tipW = 0; }
      if (!this.tipW) { this.tipW = el.offsetWidth; this.tipH = el.offsetHeight; }
      const dpr = pixelRatio();
      const cam = this.cameras.main;
      const k = cam.zoom / dpr;
      const left = this.cx - this.scale.width / cam.zoom / 2;
      const top = this.cy - this.scale.height / cam.zoom / 2;
      const x = (this.tank.x + this.tank.width / 2 - left) * k - this.tipW / 2;
      const y = Math.max(0, (this.tank.y - this.tank.height - top) * k - this.tipH - LABEL_GAP * 2);
      const maxX = this.scale.width / dpr - this.tipW - 4;
      const tr = 'translate(' + Math.round(Math.max(4, Math.min(x, maxX))) + 'px,' + Math.round(y) + 'px)';
      if (tr !== this.tipTr) { this.tipTr = tr; el.style.transform = tr; }
    },

    /* ---------- fiche 21 : la bulle d'une case de culture ---------- */

    // Une parcelle où il n'y a rien à faire (déjà arrosée, qui pousse, une terre sans graine) n'ouvre
    // plus de fenêtre : une petite bulle dit, quelques secondes, où elle en est (« 🥕 Carotte ·
    // arrosée · mûre dans 3 h »). Il n'y en a qu'une : un nouvel appui, sur cette case ou une autre,
    // la reprend (texte, place) et relance sa durée ; elles ne s'empilent pas. (x, y) : le haut de
    // la case, en px de carte. Même dessin que la bulle de la citerne (.stage-tip).
    showCaseTip(text, x, y) {
      if (!this.caseTip) {
        const el = document.createElement('div');
        el.className = 'stage-tip case-tip';
        el.setAttribute('role', 'status');
        this.ctx.labelLayer.appendChild(el);
        this.caseTip = el;
      }
      const el = this.caseTip;
      // (le texte gardé à part : les émojis deviennent des icônes dans le DOM, js/ui/pixel-emoji.js)
      if (this.caseTipText !== text) { this.caseTipText = text; el.textContent = text; this.caseTipW = 0; }
      if (el.hidden) { el.hidden = false; this.caseTipW = 0; }
      this.caseTipAt = { x, y };
      this.caseTipUntil = performance.now() + CASE_TIP_MS;
      this.syncCaseTip();
    },

    // Chaque image : la bulle suit sa case (la vue suit le personnage), puis s'efface à son heure.
    syncCaseTip() {
      const el = this.caseTip;
      if (!el || el.hidden) return;
      if (performance.now() >= this.caseTipUntil) { el.hidden = true; this.caseTipTr = null; return; }
      if (!this.caseTipW) { this.caseTipW = el.offsetWidth; this.caseTipH = el.offsetHeight; }
      const dpr = pixelRatio();
      const cam = this.cameras.main;
      const k = cam.zoom / dpr;
      const left = this.cx - this.scale.width / cam.zoom / 2;
      const top = this.cy - this.scale.height / cam.zoom / 2;
      const x = (this.caseTipAt.x - left) * k - this.caseTipW / 2;
      const y = Math.max(0, (this.caseTipAt.y - top) * k - this.caseTipH - LABEL_GAP);
      const maxX = this.scale.width / dpr - this.caseTipW - 4;
      const tr = 'translate(' + Math.round(Math.max(4, Math.min(x, maxX))) + 'px,' + Math.round(y) + 'px)';
      if (tr !== this.caseTipTr) { this.caseTipTr = tr; el.style.transform = tr; }
    },

    /* ---------- version 1.18 : ce qui attend d'être ramassé ---------- */

    // Point de la carte au-dessus duquel se pose la bulle d'un tas (null : rien de dessiné).
    pileAnchor(p) {
      if (p.lieu === 'parcelle' && Number.isInteger(p.ref)) {
        const cols = this.grid.cols || 1;
        return { x: (p.ref % cols) * T + T / 2, y: Math.floor(p.ref / cols) * T + 2 };
      }
      // (une ruche pleine, un tonnelet prêt, un bac à compost qui a de l'engrais : au-dessus de son toit, de son couvercle)
      if ((p.lieu === 'ruche' || p.lieu === 'tonnelet' || p.lieu === 'compost') && Number.isInteger(p.ref)) {
        const cols = this.grid.cols || 1;
        return { x: (p.ref % cols) * T + T / 2, y: (Math.floor(p.ref / cols) + 1) * T - 20 };
      }
      if (p.lieu === 'arbre') {
        const e = this.trees.get(p.ref);
        const o = this.objects[TREE_OBJECT + (p.ref + 1)];
        if (e) return { x: e.sprite.x, y: e.sprite.y - Math.round(e.sprite.height * 0.55) };
        return o ? { x: o.x + o.width / 2, y: o.y + o.height / 2 } : null;
      }
      // au-dessus du bloc clé de son bâtiment (le nichoir, la mangeoire)
      const k = this.keyBlockOf && this.keyBlockOf(p.lieu);
      return k ? { x: k.x, y: k.y - 24 } : null;
    },

    // Une bulle par tas (DOM, par-dessus le canvas) : « 🥚 6 ». Un appui l'envoie la chercher.
    syncPiles(list) {
      if (!this.piles) this.piles = new Map();
      const seen = new Set();
      for (const p of list) {
        seen.add(p.id);
        let B = this.piles.get(p.id);
        if (!B) {
          const el = document.createElement('button');
          el.type = 'button';
          el.className = 'stage-bubble';
          this.ctx.labelLayer.appendChild(el);
          B = { el, id: p.id, texte: null, w: 0, h: 0, tr: '' };
          // Au clavier (le doigt et la souris passent par la carte : hitAt) ;
          el.addEventListener('click', () => { if (this.fermier && !(this.ctx.lastModel && this.ctx.lastModel.coucher)) this.fermier.fetch(B.id); });
          this.piles.set(p.id, B);
        }
        B.p = p;
        if (B.texte !== p.texte) {
          B.texte = p.texte;
          B.el.textContent = p.texte;
          B.el.setAttribute('aria-label', 'À ramasser : ' + p.texte);
          B.w = 0;
        }
      }
      for (const [id, B] of this.piles) if (!seen.has(id)) { B.el.remove(); this.piles.delete(id); }
    },

    // Repère de l'écran : px CSS par px de carte, coin haut-gauche de la vue.
    // Le même objet tant que la vue ne bouge pas (il sert à plusieurs bulles à chaque image) ;
    // un nouveau dès qu'elle bouge, sans toucher à celui d'avant.
    screenFrame() {
      const cam = this.cameras.main;
      const zoom = cam.zoom, dpr = pixelRatio(), w = this.scale.width, h = this.scale.height;
      const F0 = this.frameMemo;
      if (F0 && F0.zoom === zoom && F0.dpr === dpr && F0.w === w && F0.h === h && F0.cx === this.cx && F0.cy === this.cy) return F0.f;
      const f = { k: zoom / dpr, left: this.cx - w / zoom / 2, top: this.cy - h / zoom / 2 };
      this.frameMemo = { zoom, dpr, w, h, cx: this.cx, cy: this.cy, f };
      return f;
    },

    placePiles() {
      if (!this.piles || !this.piles.size) return;
      const f = this.screenFrame();
      for (const B of this.piles.values()) {
        const a = this.pileAnchor(B.p);
        B.at = a;
        if (!a) { if (!B.el.hidden) B.el.hidden = true; continue; }
        if (B.el.hidden) { B.el.hidden = false; B.w = 0; }
        if (!B.w) { B.w = B.el.offsetWidth; B.h = B.el.offsetHeight; if (!B.w) continue; }
        const tr = 'translate(' + Math.round((a.x - f.left) * f.k - BUBBLE_TIP_X) + 'px,' + Math.round((a.y - f.top) * f.k - B.h + BUBBLE_TIP_Y) + 'px)';
        if (tr !== B.tr) { B.tr = tr; B.el.style.transform = tr; }
      }
    },

    // Bulle sous un point de la carte (zone d'appui élargie à 44 px CSS au besoin).
    pileAt(wx, wy) {
      if (!this.piles) return null;
      const f = this.screenFrame();
      for (const B of this.piles.values()) {
        if (!B.at || !B.w || B.el.hidden) continue;
        const w = Math.max(B.w, MIN_TAP) / f.k, h = Math.max(B.h, MIN_TAP) / f.k;
        const cx = B.at.x + (B.w / 2 - BUBBLE_TIP_X) / f.k, cy = B.at.y - (B.h / 2 - BUBBLE_TIP_Y) / f.k;
        if (Math.abs(wx - cx) <= w / 2 && Math.abs(wy - cy) <= h / 2) return B;
      }
      return null;
    },

    // Bulle « +6 🥕 » au-dessus du personnage (CarteKit.bulleGain, comme sur les autres cartes) :
    // elle reste un instant puis s'estompe ; une prise qui arrive avant qu'elle ait disparu s'y
    // additionne.
    showGain(items) {
      if (global.FermeSon) global.FermeSon.prise(items, { gain: 0.8, ecart: 0.08 });   // le bruit de ce qu'il prend (js/son.js)
      if (!this.gain) this.gain = K.bulleGain(this.ctx.labelLayer, (item) => ((this.ctx.bridge && this.ctx.bridge.icone) ? this.ctx.bridge.icone(item) : item));
      this.gain.montre(items);
      this.placeGain();
    },

    placeGain() {
      const G = this.gain;
      if (!G || !G.visible()) return;
      const at = this.fermier ? this.fermier.pos() : null;
      if (!at) { G.place(null); return; }
      const f = this.screenFrame();
      G.place((at.x - f.left) * f.k, (at.y - K.BULLE.dessus - f.top) * f.k);
    },

    // La bulle « +x » du second adulte (js/famille-ferme.js), au-dessus de lui.
    showGainAide(items) {
      if (!this.gainAide) this.gainAide = K.bulleGain(this.ctx.labelLayer, (item) => ((this.ctx.bridge && this.ctx.bridge.icone) ? this.ctx.bridge.icone(item) : item));
      this.gainAide.montre(items);
      this.placeGainAide();
    },

    placeGainAide() {
      const G = this.gainAide;
      if (!G || !G.visible()) return;
      const at = this.family ? this.family.aidePos() : null;
      if (!at) { G.place(null); return; }
      const f = this.screenFrame();
      G.place((at.x - f.left) * f.k, (at.y - K.BULLE.dessus - f.top) * f.k);
    },

    // Un appui sur le compagnon (le second adulte du foyer, js/famille-ferme.js) : il propose son aide. La page
    // (js/ui/compagnon.js) dit quoi : compagnonDit({ texte, boutons: [{ texte, action, data }], ms }) ; la carte
    // l'affiche dans une bulle au-dessus de lui (les boutons portent leur data-action : la page les reçoit). Tant
    // qu'il pose une question (des boutons, AIDE.attente ms au plus), il vient à côté du personnage et s'y arrête
    // tourné vers lui (famille.rejoindre) ; sa réponse (sans bouton, `ms` ms) le suit pendant qu'il repart.
    compagnonAt(wx, wy) {
      const M = this.ctx.lastModel, at = this.family && M && M.aide && !M.bati ? this.family.aidePos() : null;
      if (!at) return false;
      return Math.abs(wx - at.x) <= AIDE.boite.l && wy <= at.y + AIDE.boite.bas && wy >= at.y - AIDE.boite.h;
    },

    compagnonDit(c) {
      const layer = this.ctx.labelLayer;
      if (!layer || !this.family || !this.family.aidePos()) return false;
      const S = this.aideBulle || (this.aideBulle = { el: null, w: 0, h: 0, fin: 0 });
      if (!c) { this.finAideBulle(); return true; }
      if (!S.el) {
        S.el = document.createElement('div');
        S.el.className = 'habitant-bulle aide-bulle';
        S.el.setAttribute('role', 'dialog');
        layer.appendChild(S.el);
      }
      S.el.innerHTML = '';
      const t = document.createElement('span');
      t.className = 'habitant-bulle-texte';
      t.textContent = c.texte || '';
      S.el.appendChild(t);
      const boutons = c.boutons || [];
      if (boutons.length) {
        const row = document.createElement('span');
        row.className = 'aide-choix';
        for (const b of boutons) {
          const el = document.createElement('button');
          el.type = 'button';
          el.className = 'aide-bouton';
          el.textContent = b.texte;
          el.dataset.action = b.action;
          for (const [k, v] of Object.entries(b.data || {})) el.dataset[k] = v;
          row.appendChild(el);
        }
        S.el.appendChild(row);
      }
      S.w = 0;
      S.fin = global.performance.now() + (boutons.length ? AIDE.attente : c.ms || AIDE.dit);
      // (une question : il reste à côté du personnage ; sa réponse : il repart aussitôt, la bulle le suit)
      S.retient = boutons.length > 0;
      if (!S.retient && this.family.rejoindre) this.family.rejoindre(null);
      // (il parle : sa voix, un petit babil, js/son.js)
      const V = global.FermeSon;
      if (V && V.babil && c.texte) V.babil(c.texte, V.voixDe({ id: this.ctx.lastModel && this.ctx.lastModel.aide ? this.ctx.lastModel.aide.id : 'compagnon' }));
      return true;
    },

    finAideBulle() {
      const S = this.aideBulle;
      if (S && S.el) { S.el.remove(); S.el = null; }
      if (this.family && this.family.rejoindre) this.family.rejoindre(null);
    },

    // À chaque image : la bulle suit le compagnon ; il reste à côté du personnage tant qu'elle est là.
    stepAide() {
      const S = this.aideBulle;
      if (!S || !S.el) return;
      const at = this.family ? this.family.aidePos() : null;
      if (!at || global.performance.now() >= S.fin) { this.finAideBulle(); return; }
      const p = S.retient && this.fermier ? this.fermier.pos() : null;
      if (p) this.family.rejoindre(p);
      const f = this.screenFrame();
      if (!S.w) { S.w = S.el.offsetWidth; S.h = S.el.offsetHeight; }
      const x = (at.x - f.left) * f.k, y = (at.y - AIDE.dessus - f.top) * f.k;
      const maxX = this.scale.width / pixelRatio() - S.w - 4;
      S.el.style.transform = 'translate(' + Math.round(Math.max(4, Math.min(x - S.w / 2, maxX))) + 'px,' + Math.round(Math.max(4, y - S.h)) + 'px)';
    },

    // Le point de la carte (wx, wy) est-il dans la vue ?
    dansLaVue(at) {
      if (!at) return false;
      const f = this.screenFrame(), dpr = pixelRatio();
      const x = (at.x - f.left) * f.k, y = (at.y - f.top) * f.k;
      return x >= 0 && y >= 0 && x <= this.scale.width / dpr && y <= this.scale.height / dpr;
    },

    /* ---------- étiquettes (DOM) ---------- */

    // Une étiquette par lieu affiché : un bouton DOM qui ne reçoit pas les appuis (ils
    // traversent jusqu'à la carte, qui teste elle-même la zone de l'étiquette), mais qui
    // reste accessible au clavier : Entrée y déclenche `stage-open`, comme tout bouton.
    // Le nom ne s'affiche qu'au survol du lieu (souris), pendant qu'on le touche (doigt)
    // ou quand le bouton a le focus (clavier). La pastille « à faire », elle, reste visible.

    // Lieu survolé ou touché (null : aucun).
    setHover(id) {
      this.hoverUntil = 0;
      if (id === this.hoverId) return;
      this.hoverId = id || null;
      for (const L of this.labels.values()) this.applyShown(L);
    },

    applyShown(L) {
      const shown = L.id === this.hoverId || !!L.focus;
      if (shown === L.shown) return;
      L.shown = shown;
      L.el.classList.toggle('show', shown);
      L.w = 0;                                 // la taille change : à remesurer
    },

    // Lieu désigné par un résultat de hitAt() : une parcelle désigne sa zone ('zone' ou 'zone2').
    placeOf(hit) {
      if (!hit) return null;
      if (hit.treeHarvest) return 'verger';
      return hit.plot || hit.hoe ? hit.place : hit.window || null;
    },

    placeAt(wx, wy) { return this.placeOf(this.hitAt(wx, wy)); },

    syncLabel(id, info, win, ax, ay, align) {
      let L = this.labels.get(id);
      if (!info) {
        if (L) { L.el.remove(); this.labels.delete(id); }
        return;
      }
      if (!L) {
        const el = document.createElement('button');
        el.type = 'button';
        el.className = 'stage-label';
        el.dataset.action = 'stage-open';
        el.dataset.window = win;
        el.innerHTML = '<span class="stage-label-name"></span><span class="stage-label-badge" hidden></span>';
        this.ctx.labelLayer.appendChild(el);
        L = { el, id, window: win, name: null, badge: null, w: 0, h: 0, tr: '', off: false, shown: false, focus: false };
        const self = L;
        el.addEventListener('focus', () => { self.focus = true; this.applyShown(self); });
        el.addEventListener('blur', () => { self.focus = false; this.applyShown(self); });
        this.labels.set(id, L);
        if (id === this.hoverId) this.applyShown(L);
      }
      const name = String(info.nom || id), badge = Math.max(0, info.badge | 0);
      if (name !== L.name || badge !== L.badge) {
        L.name = name; L.badge = badge;
        L.el.firstChild.textContent = name;
        const b = L.el.lastChild;
        b.hidden = !badge;
        b.textContent = badge > 9 ? '9+' : String(badge);
        L.el.setAttribute('aria-label', badge ? name + ' : ' + badge + ' à faire' : name);
        L.el.classList.toggle('todo', !!badge);
        L.w = 0;                               // à remesurer
      }
      L.ax = ax; L.ay = ay; L.align = align || 'centre';
    },

    // Replace chaque étiquette au-dessus de son lieu (positions entières en pixels de
    // l'écran : le texte reste net, même avec un zoom non entier).
    placeLabels() {
      if (!this.labels.size) return;
      const dpr = pixelRatio();
      const k = this.cameras.main.zoom / dpr;                    // px CSS par px de carte
      const left = this.cx - this.scale.width / this.cameras.main.zoom / 2;
      const top = this.cy - this.scale.height / this.cameras.main.zoom / 2;
      const snap = (v) => Math.round(v * dpr) / dpr;
      for (const L of this.labels.values()) {
        if (!L.shown && !L.badge) continue;     // ni nom ni pastille : rien à placer
        if (!L.w) { L.w = L.el.offsetWidth; L.h = L.el.offsetHeight; if (!L.w) continue; }
        const x = (L.ax - left) * k - (L.align === 'gauche' ? 0 : L.w / 2);
        const y = Math.max(0, (L.ay - top) * k - L.h - LABEL_GAP);
        const tr = 'translate(' + snap(x) + 'px,' + snap(y) + 'px)';
        if (tr !== L.tr) { L.tr = tr; L.el.style.transform = tr; }
        // Une étiquette dont il ne reste qu'un bout au bord de l'écran est masquée.
        const seen = Math.min(x + L.w, this.scale.width / dpr) - Math.max(x, 0);
        const off = seen < L.w * 0.6;
        if (off !== L.off) { L.off = off; L.el.style.visibility = off ? 'hidden' : ''; }
      }
    },

    // Étiquette sous un point de la carte : sa boîte, élargie à 44 px CSS au besoin.
    labelAt(wx, wy) {
      const k = this.cameras.main.zoom / pixelRatio();
      const top = this.cy - this.scale.height / this.cameras.main.zoom / 2;
      for (const L of this.labels.values()) {
        if (!L.w || L.off || (!L.shown && !L.badge)) continue;   // une étiquette invisible ne se touche pas
        const w = Math.max(L.w, MIN_TAP) / k, h = Math.max(L.h, MIN_TAP) / k;
        const cx = L.align === 'gauche' ? L.ax + L.w / k / 2 : L.ax;
        const cy = Math.max(top + L.h / k / 2, L.ay - (LABEL_GAP + L.h / 2) / k);
        if (Math.abs(wx - cx) <= w / 2 && Math.abs(wy - cy) <= h / 2) return L;
      }
      return null;
    },
  });
})(window);
