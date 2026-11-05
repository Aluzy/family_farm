/* carte/ferme/amis.js — la scène de la ferme : les émotions des habitants, les présents des amis.
 *
 * L'amitié vit dans le moteur (js/engine/amitie.js). Ici, ce qu'on en voit :
 *   - la couleur d'une émotion : rouge la colère, violet la peur, vert le dégoût, bleu la tristesse, jaune
 *     la joie. Une réaction (un cadeau, un arbre abattu sous ses yeux, un cheval qui passe en trombe) colore
 *     toute sa peau quelques instants (planchePeau : sa planche refaite, ses teintes de peau remplacées), avec
 *     un petit emoji au-dessus de sa tête (pour qui distingue mal les couleurs). Hors de ces émotions fortes,
 *     il garde ses couleurs : pas de teinte durable ;
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

  // couleur : le voile d'une réaction (une planche sans table de peau) ; peau : la peau d'une réaction (e le clair, f la teinte, j l'ombre, k les joues)
  const EMOTIONS = {
    joie: { couleur: 0xffd23c, emoji: '😊', nom: 'joie', peau: { e: [255, 232, 110], f: [250, 206, 56], j: [190, 140, 20], k: [255, 160, 60] } },
    colere: { couleur: 0xff4a3a, emoji: '😠', nom: 'colère', peau: { e: [250, 120, 104], f: [226, 66, 54], j: [150, 28, 26], k: [255, 40, 40] } },
    peur: { couleur: 0xa45cff, emoji: '😨', nom: 'peur', peau: { e: [206, 168, 250], f: [166, 116, 226], j: [98, 58, 160], k: [214, 120, 230] } },
    surprise: { couleur: 0xffb05a, emoji: '😮', nom: 'surprise', peau: { e: [255, 214, 160], f: [250, 176, 96], j: [196, 120, 48], k: [255, 150, 110] } },
    degout: { couleur: 0x5fd35a, emoji: '🤢', nom: 'dégoût', peau: { e: [170, 232, 130], f: [112, 196, 84], j: [52, 128, 46], k: [150, 210, 80] } },
    tristesse: { couleur: 0x4a8dff, emoji: '😢', nom: 'tristesse', peau: { e: [150, 196, 252], f: [92, 148, 232], j: [44, 86, 170], k: [120, 150, 240] } },
  };
  // La couleur de peau d'une émotion à la place `t` d'une teinte de peau (assets/personnages/peau.json :
  // -1 le clair, 0 la teinte, 1 l'ombre, « k » les joues).
  const mele = (a, b, t) => [0, 1, 2].map((i) => Math.max(0, Math.min(255, Math.round(a[i] + (b[i] - a[i]) * t))));
  const peauEmotion = (t, P) => (t === 'k' ? P.k : t < 0 ? mele(P.f, P.e, -t) : mele(P.f, P.j, t));
  // Les teintes de peau de `table` (peau.json) remplacées par celles de `emotion`, sur le canvas de `g`.
  function recolorePeau(g, w, h, table, emotion) {
    const img = g.getImageData(0, 0, w, h), d = img.data, P = EMOTIONS[emotion].peau;
    const vers = new Map();
    for (const [hex, t] of Object.entries(table)) vers.set(parseInt(hex, 16), peauEmotion(t, P));
    for (let i = 0; i < d.length; i += 4) {
      if (!d[i + 3]) continue;
      const c = vers.get((d[i] << 16) | (d[i + 1] << 8) | d[i + 2]);
      if (c) { d[i] = c[0]; d[i + 1] = c[1]; d[i + 2] = c[2]; }
    }
    g.putImageData(img, 0, 0);
  }

  // ce que dit un habitant surpris par un coup de hache ou de pioche près de lui
  const REACTIONS = { hache: 'Oh ! Tu en replanteras un ?', pioche: 'Oh ! Ça résonne jusqu\'ici !' };
  const EMO = {
    duree: 1800,       // ms : une réaction
    vague: 0.65,       // l'opacité du voile de couleur au plus fort de la réaction (0 : rien, 1 : la couleur pure)
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
      // (un invité d'un repas, à la ferme : invites.js)
      return this.inviteParId ? this.inviteParId(id) : null;
    },

    // Une réaction : `emotion` (joie, colere, peur, degout, tristesse) colore un instant l'habitant `m`.
    // `force` : passer outre le repos (un cadeau : la réaction se voit toujours).
    emouvoir(m, emotion, force) {
      if (!m || !EMOTIONS[emotion]) return false;
      const now = performance.now();
      if (!force && m.emoVu && m.emoVu[emotion] && now - m.emoVu[emotion] < EMO.repos) return false;
      (m.emoVu = m.emoVu || {})[emotion] = now;
      m.emo = { emotion, t0: now, fort: !!force };   // (fort : un cadeau, son visage rit, js/carte/visages.js)
      this.emojiHabitant(m, EMOTIONS[emotion].emoji);
      return true;
    },
    emotionHabitant(id, emotion) {
      return this.emouvoir(this.habitantParId(id), emotion, true);
    },

    // Un coup de hache ou de pioche en (x, y) : ceux qui le voient sont surpris, gentiment (le récit cosy : ni colère
    // ni peur) ; un adulte le dit, la première fois (REACTIONS : « Oh ! Tu en replanteras un ? »).
    habitantsVoient(x, y, geste = 'hache') {
      for (const e of (this.hameauxVus || new Map()).values()) {
        if (!e.gens) continue;
        for (const m of e.gens.membres.values()) {
          if (!m.s || !m.s.visible || m.couche || Math.hypot(m.x - x, m.y - y) > EMO.voient) continue;
          if (this.emouvoir(m, 'surprise') && !m.def.enfant && this.habitantDit) this.habitantDit(m, REACTIONS[geste] || REACTIONS.hache);
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

    // La planche `key` (perso_NN, enfant_NN) dont la peau a la couleur de `emotion` : faite une fois (ses
    // teintes de peau : assets/personnages/peau.json, scripts/personnage/peau_emotions.py), gardée sous la
    // clé « key~emotion ». → la clé, ou null (pas de table pour elle, ou sa planche pas encore là).
    planchePeau(key, emotion) {
      const cle = key + '~' + emotion;
      if (this.textures.exists(cle)) return cle;
      const table = this.tablePeau(key);
      if (!table || !this.textures.exists(key) || !EMOTIONS[emotion]) return null;
      const src = this.textures.get(key).getSourceImage();
      if (!src || !src.width) return null;
      const cv = document.createElement('canvas');
      cv.width = src.width; cv.height = src.height;
      const g = cv.getContext('2d');
      g.drawImage(src, 0, 0);
      recolorePeau(g, cv.width, cv.height, table, emotion);
      this.textures.addSpriteSheet(cle, cv, { frameWidth: 16, frameHeight: 32 });
      return cle;
    },

    // La table des teintes de peau de la planche `key` (assets/personnages/peau.json, dont les noms ont deux
    // chiffres : perso_07 ; les planches des habitants n'en ont qu'un, perso_7 : CarteVisages.nom), ou null.
    tablePeau(key) {
      const tables = this.cache.json.get('perso_peau');
      if (!tables) return null;
      const V = global.CarteVisages;
      return tables[key] || (V && tables[V.nom(key)]) || null;
    },

    // Les tuiles du visage (js/carte/visages.js) du personnage de la planche `key`, recolorées comme sa planche
    // pour `emotion` (planchePeau) : { key, base } pour CarteVisages.suivre, ou null (sans table, l'atlas pas là).
    visagePeau(key, emotion) {
      const V = global.CarteVisages, J = this.cache.json.get('visages'), nom = V && V.nom(key);
      const rang = J && nom ? J.personnages.indexOf(nom) : -1;
      if (rang < 0 || !EMOTIONS[emotion] || !this.textures.exists('visages')) return null;
      const cle = 'visages:' + nom + '~' + emotion;
      if (this.textures.exists(cle)) return { key: cle, base: 0 };
      const table = this.tablePeau(key), src = this.textures.get('visages').getSourceImage();
      if (!table || !src || !src.width) return null;
      const w = J.tuile.w, h = J.tuile.h, cv = document.createElement('canvas');
      cv.width = src.width; cv.height = h;
      const g = cv.getContext('2d');
      g.drawImage(src, 0, rang * h, src.width, h, 0, 0, src.width, h);
      recolorePeau(g, cv.width, cv.height, table, emotion);
      this.textures.addSpriteSheet(cle, cv, { frameWidth: w, frameHeight: h });
      return { key: cle, base: 0 };
    },

    // À chaque image (stepHabitants, après son image) : la couleur de l'habitant `m` — une réaction colore
    // toute sa peau (planchePeau), le temps de la réaction ; ensuite, ses couleurs ; l'emoji suit sa tête. `f` : le cadre de
    // l'écran (screenFrame).
    teinteHabitant(m, now, f) {
      const s = m.s;
      if (!s) return;
      const M = this.ctx.lastModel;
      // (un cheval qui passe tout près : la surprise)
      const joueur = this.fermier && this.fermier.pos ? this.fermier.pos() : null;
      if (joueur && M && M.cheval && !m.couche && Math.hypot(joueur.x - m.x, joueur.y - m.y) < EMO.cheval) this.emouvoir(m, 'surprise');
      let couleur = null, k = 0, planche = m.key;
      const R = m.emo;
      if (R && now - R.t0 < EMO.duree) {
        // la peau prend la couleur de l'émotion (sans table pour sa planche : le voile, plus fort)
        planche = this.planchePeau(m.key, R.emotion) || m.key;
        if (planche === m.key) { couleur = EMOTIONS[R.emotion].couleur; k = reducedMotion() ? EMO.calme : EMO.vague * Math.sin((Math.PI * (now - R.t0)) / EMO.duree); }
      } else if (R) { m.emo = null; this.emojiOff(m); }
      if (s.texture.key !== planche && this.textures.exists(planche)) s.setTexture(planche, s.frame.name);
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
        if (v.texture.key !== m.key || v.frame.name !== s.frame.name) v.setTexture(m.key, s.frame.name);
        v.setPosition(s.x, s.y).setFlipX(s.flipX).setDepth(s.depth + 0.01).setVisible(true).setAlpha(Math.min(1, k) * s.alpha).setTint(couleur);
      }
      // son visage (js/carte/visages.js) : l'expression de la réaction, recolorée comme sa peau
      if (global.CarteVisages) {
        const enCours = R && now - R.t0 < EMO.duree;
        global.CarteVisages.suivre(this, s, enCours ? { reaction: R.emotion, fort: R.fort, atlas: planche !== m.key ? this.visagePeau(m.key, R.emotion) : null } : null);
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
