/* carte/ferme/amis.js — la scène de la ferme : les émotions des habitants, les présents des amis.
 *
 * L'amitié vit dans le moteur (js/engine/amitie.js). Ici, ce qu'on en voit :
 *   - le corps d'un habitant se colore de son émotion : rouge la colère, violet la peur, vert le dégoût,
 *     bleu la tristesse, jaune la joie. Une réaction (un cadeau, un arbre abattu sous ses yeux, un
 *     cheval qui passe en trombe) est une vague de couleur de quelques instants, avec un petit emoji
 *     au-dessus de sa tête (pour qui distingue mal les couleurs) ; son humeur du moment (le modèle :
 *     habitants.humeurs) une teinte légère et durable ;
 *   - les présents qu'un ami proche a laissés la nuit devant la porte de la ferme (modèle.presents) : un
 *     paquet près de la porte, que le personnage prend en passant (bridge.presents).
 *
 * Méthodes de la scène de la ferme (js/farm-stage.js), posées sur son prototype : `this` est la
 * scène, `this.ctx` ce que la page lui a donné au montage (voir docs/architecture-phaser.md).
 */
(function (global) {
  'use strict';

  const F = global.FermeCarte;
  const { reducedMotion } = F;
  const { T } = F.C;

  const EMOTIONS = {
    joie: { couleur: 0xffd23c, emoji: '😊', nom: 'joie' },
    colere: { couleur: 0xff4a3a, emoji: '😠', nom: 'colère' },
    peur: { couleur: 0xa45cff, emoji: '😨', nom: 'peur' },
    degout: { couleur: 0x5fd35a, emoji: '🤢', nom: 'dégoût' },
    tristesse: { couleur: 0x4a8dff, emoji: '😢', nom: 'tristesse' },
  };
  const EMO = {
    duree: 1800,       // ms : une réaction
    vague: 0.65,       // l'opacité du voile de couleur au plus fort de la réaction (0 : rien, 1 : la couleur pure)
    humeur: 0.22,      // celle du voile d'humeur
    calme: 0.45,       // mouvements réduits : la réaction, sans vague
    voient: 6 * T,     // px : à cette distance, un habitant voit le coup de hache ou de pioche
    cheval: 1.6 * T,   // px : un cheval qui passe plus près lui fait peur
    repos: 12000,      // ms : une même émotion ne revient pas plus souvent chez lui
  };

  F.partie({

    // L'habitant `id` (de n'importe quel hameau dessiné), ou null.
    habitantParId(id) {
      for (const e of (this.hameauxVus || new Map()).values()) {
        const G = e.gens;
        if (G && G.membres.has(id)) return G.membres.get(id);
      }
      return null;
    },

    // Une réaction : `emotion` (joie, colere, peur, degout, tristesse) colore un instant l'habitant `m`.
    // `force` : passer outre le repos (un cadeau : la réaction se voit toujours).
    emouvoir(m, emotion, force) {
      if (!m || !EMOTIONS[emotion]) return false;
      const now = performance.now();
      if (!force && m.emoVu && m.emoVu[emotion] && now - m.emoVu[emotion] < EMO.repos) return false;
      (m.emoVu = m.emoVu || {})[emotion] = now;
      m.emo = { emotion, t0: now };
      this.emojiHabitant(m, EMOTIONS[emotion].emoji);
      return true;
    },
    emotionHabitant(id, emotion) {
      return this.emouvoir(this.habitantParId(id), emotion, true);
    },

    // Un coup de hache ou de pioche en (x, y) : les adultes qui le voient se fâchent (on abîme leur coin),
    // les enfants ont peur.
    habitantsVoient(x, y) {
      for (const e of (this.hameauxVus || new Map()).values()) {
        if (!e.gens) continue;
        for (const m of e.gens.membres.values()) {
          if (!m.s || !m.s.visible || m.couche || Math.hypot(m.x - x, m.y - y) > EMO.voient) continue;
          this.emouvoir(m, m.def.enfant ? 'peur' : 'colere');
        }
      }
    },

    // Le petit emoji au-dessus de sa tête, le temps de la réaction (le calque des étiquettes).
    emojiHabitant(m, emoji) {
      if (!this.ctx.labelLayer) return;
      if (!m.emoji) {
        const el = document.createElement('div');
        el.className = 'habitant-emo';
        el.setAttribute('aria-hidden', 'true');
        this.ctx.labelLayer.appendChild(el);
        m.emoji = { el, w: 0, h: 0 };
      }
      m.emoji.el.textContent = emoji;
      m.emoji.w = 0;
    },
    emojiOff(m) {
      if (m.emoji) { m.emoji.el.remove(); m.emoji = null; }
    },
    // (l'habitant s'en va : son voile aussi)
    voileOff(m) {
      if (m.voile) { m.voile.destroy(); m.voile = null; }
    },

    // À chaque image (stepHabitants, après son image) : la couleur de l'habitant `m` — sa réaction, sinon
    // son humeur ; l'emoji suit sa tête. `f` : le cadre de l'écran (screenFrame).
    teinteHabitant(m, now, f) {
      const s = m.s;
      if (!s) return;
      const M = this.ctx.lastModel, H = M && M.habitants && M.habitants.humeurs;
      // (un cheval qui passe tout près : la peur)
      const joueur = this.fermier && this.fermier.pos ? this.fermier.pos() : null;
      if (joueur && M && M.cheval && !m.couche && Math.hypot(joueur.x - m.x, joueur.y - m.y) < EMO.cheval) this.emouvoir(m, 'peur');
      let couleur = null, k = 0;
      const R = m.emo;
      if (R && now - R.t0 < EMO.duree) {
        couleur = EMOTIONS[R.emotion].couleur;
        k = reducedMotion() ? EMO.calme : EMO.vague * Math.sin((Math.PI * (now - R.t0)) / EMO.duree);
      } else {
        if (R) { m.emo = null; this.emojiOff(m); }
        const h = H && !m.couche ? H[m.id] : null;
        if (h && EMOTIONS[h]) { couleur = EMOTIONS[h].couleur; k = EMO.humeur; }
      }
      // le voile : une copie de son image, peinte de la couleur (la silhouette entière, quelle que soit sa
      // peau ou ses habits), posée juste au-dessus de lui
      if (!couleur || k < 0.02 || !s.visible) {
        if (m.voile) m.voile.setVisible(false);
      } else {
        if (!m.voile) {
          const P = global.Phaser;
          m.voile = this.add.sprite(0, 0, s.texture.key, s.frame.name).setOrigin(0.5, 1).setTintMode(P.TintModes.FILL);
          m.voile.personnage = true;
        }
        const v = m.voile;
        if (v.texture.key !== s.texture.key || v.frame.name !== s.frame.name) v.setTexture(s.texture.key, s.frame.name);
        v.setPosition(s.x, s.y).setFlipX(s.flipX).setDepth(s.depth + 0.01).setVisible(true).setAlpha(Math.min(1, k) * s.alpha).setTint(couleur);
      }
      if (m.emoji && f) {
        const b = m.emoji;
        if (!s.visible) { b.el.style.visibility = 'hidden'; return; }
        b.el.style.visibility = '';
        if (!b.w) { b.w = b.el.offsetWidth; b.h = b.el.offsetHeight; }
        const leve = reducedMotion() || !R ? 0 : Math.min(1, (now - R.t0) / 300) * 3;
        b.el.style.transform = `translate(${Math.round((m.x - f.left) * f.k - b.w / 2)}px,${Math.round((m.y - 34 - leve - f.top) * f.k - b.h)}px)`;
      }
    },

    // Les présents des amis devant la porte (modèle.presents : [{ de, objet, n, icone }]) : un paquet près
    // de la porte ; le personnage qui passe tout près les prend (bridge.presents).
    stepPresents() {
      const L = (this.ctx.lastModel && this.ctx.lastModel.presents) || [];
      const porte = L.length && !this.presentsPris && this.homeDoor ? this.homeDoor() : null;
      if (!L.length) this.presentsPris = false;
      let P = this.presentsPaquet;
      if (!porte || !this.ctx.labelLayer) { if (P) { P.el.remove(); this.presentsPaquet = null; } return; }
      if (!P) {
        const el = document.createElement('div');
        el.className = 'visite-plat presents-porte';
        el.setAttribute('role', 'img');
        const qui = [...new Set(L.map((x) => x.de))].join(', ');
        el.setAttribute('aria-label', `Un présent t'attend devant la porte, ${/^[aeiouyhàâéèêëîïôûAEIOUYHÀÂÉÈÊËÎÏÔÛ]/.test(qui) ? `d'${qui}` : `de ${qui}`}`);
        el.textContent = '🎁';
        this.ctx.labelLayer.appendChild(el);
        P = this.presentsPaquet = { el, w: 0, h: 0 };
      }
      const f = this.screenFrame ? this.screenFrame() : null;
      if (f) {
        if (!P.w) { P.w = P.el.offsetWidth; P.h = P.el.offsetHeight; }
        P.el.style.transform = `translate(${Math.round((porte.x - 12 - f.left) * f.k - P.w / 2)}px,${Math.round((porte.y - f.top) * f.k - P.h)}px)`;
      }
      const joueur = this.fermier && this.fermier.pos ? this.fermier.pos() : null;
      if (joueur && Math.hypot(joueur.x - porte.x, joueur.y - porte.y) <= 64) {
        const B = this.ctx.bridge;
        const got = B && B.presents ? B.presents() : null;
        if (got && this.showGain) this.showGain(got);
        P.el.remove();
        this.presentsPaquet = null;
        this.presentsPris = true;
      }
    },
  });
})(window);
