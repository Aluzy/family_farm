/* carte/ferme/presence.js — la scène de la ferme : les autres joueurs d'un monde en ligne (E-4).
 *
 * Dans un monde en ligne (js/ui/en-ligne.js), chaque joueur envoie l'état de son personnage (ses pieds, sa
 * hauteur à l'étage, le nom de son image, son sens) ≈ 5 fois par seconde quand il bouge, et son allure (son
 * personnage du catalogue, son apparence) de temps en temps ; le monde le relaie aux autres sans l'écrire.
 * Ici, chaque autre joueur est dessiné avec son personnage à lui, son prénom au-dessus :
 *   - un peu en retard (RETARD_MS), en allant d'un état reçu au suivant à la vitesse où il est allé : il
 *     marche, il ne glisse pas vers sa dernière position en ralentissant ;
 *   - quand il avance, ses pas (les images marche_<sens>_0..3, au rythme de la distance, CarteKit.imageMarche)
 *     et son regard (CarteKit.allure : de face, de dos, de profil, retourné) ;
 *   - arrêté, il respire (idle) ; au travail, l'image de son geste (la houe, la hache…) ;
 *   - son visage cligne des yeux (js/carte/visages.js) ;
 *   - trop loin d'un état au suivant (il a sauté), il y est tout de suite.
 * Il s'efface s'il n'a plus rien envoyé depuis PRESENCE.OUBLI_MS (ou quand il part : le monde le dit). Rien de
 * tout cela ne touche la partie.
 *
 * Méthodes de la scène de la ferme (js/farm-stage.js), posées sur son prototype : `this` est la
 * scène, `this.ctx` ce que la page lui a donné au montage (voir docs/architecture-phaser.md).
 */
(function (global) {
  'use strict';

  const F = global.FermeCarte;
  const K = global.CarteKit;
  const T = K.T;
  const PRESENCE = { RETARD_MS: 260, OUBLI_MS: 60000, SAUT: 6 * T, PROFONDEUR_NOM: 1e5 - 3, RESPIRE_MS: 600 };
  const MARCHE = /^marche_(bas|haut|cote)_\d$/, DEBOUT = /^(idle|marche)_(bas|haut|cote)_\d$/;

  // L'état à l'instant `t` : entre les deux états reçus qui l'entourent (ou le dernier, s'il est plus vieux).
  function etatA(ech, t) {
    if (!ech.length) return null;
    if (t <= ech[0].t) return ech[0];
    for (let i = ech.length - 1; i > 0; i--) {
      const a = ech[i - 1], b = ech[i];
      if (t >= a.t && t <= b.t) {
        // (un saut : pas de glissade de l'un à l'autre)
        if (Math.hypot(b.x - a.x, b.y - a.y) > PRESENCE.SAUT) return b;
        const k = b.t > a.t ? (t - a.t) / (b.t - a.t) : 1;
        return { x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k, h: a.h + (b.h - a.h) * k, img: b.img, flip: b.flip, bouge: b.x !== a.x || b.y !== a.y };
      }
    }
    return ech[ech.length - 1];
  }

  F.partie({

    // À chaque image : les autres joueurs, créés, déplacés, effacés.
    syncPresence(delta) {
      const A = global.FermeEnLigne && global.FermeEnLigne.autres;
      const P = this.presences || (this.presences = new Map());
      const maintenant = Date.now();
      for (const [id, p] of P) {
        const a = A && A.get(id);
        if (!a || maintenant - a.t > PRESENCE.OUBLI_MS) { p.img.destroy(); p.nom.destroy(); P.delete(id); }
      }
      const C = this.casesPerso ? this.casesPerso() : null;
      if (!A || !A.size || !C || !this.textures.exists('fermier')) return;
      for (const [id, a] of A) {
        if (maintenant - a.t > PRESENCE.OUBLI_MS || !a.ech || !a.ech.length) continue;
        const e = etatA(a.ech, maintenant - PRESENCE.RETARD_MS);
        let p = P.get(id);
        if (!p) {
          const img = this.add.image(e.x, e.y, 'fermier', 0).setOrigin(0.5, 1);
          img.toujours = true;   // (pas masqué hors de la vue : decor.js, cullScene)
          const nom = this.add.text(e.x, e.y - 34, '', {
            fontFamily: 'Ferme Dialogue, sans-serif', fontSize: '6px', color: '#3a2a55', backgroundColor: 'rgba(241,227,247,0.9)', padding: { x: 2, y: 1 },
          }).setOrigin(0.5, 1).setDepth(PRESENCE.PROFONDEUR_NOM).setResolution(8);
          p = { img, nom, x: e.x, y: e.y, face: 'bas', flip: false, parcouru: 0, allure: K.allure(), cle: null };
          P.set(id, p);
        }
        // son personnage : sa planche, chargée la première fois (habitants.js) ; d'ici là, la fermière
        const look = a.look || { perso: 1, apparence: null };
        const cle = this.clePerso({ perso: look.perso, enfant: false, apparence: look.apparence });
        if (cle !== p.cle) { this.chargePerso(cle, { perso: look.perso, enfant: false, apparence: look.apparence }); if (this.textures.exists(cle)) p.cle = cle; }
        const sheet = p.cle && this.textures.exists(p.cle) ? p.cle : 'fermier';
        // le pas : la distance faite depuis l'image précédente, le regard qui la suit
        const dx = e.x - p.x, dy = e.y - p.y, d = Math.hypot(dx, dy);
        if (d > PRESENCE.SAUT) p.parcouru = 0;
        else if (d > 0.01) { p.parcouru += d; ({ face: p.face, flip: p.flip } = p.allure.pas(dx, dy, d, { face: p.face, flip: p.flip })); }
        p.x = e.x; p.y = e.y;
        const avance = d > 0.01 && d <= PRESENCE.SAUT && (e.bouge || MARCHE.test(e.img));
        let nom;
        if (avance && !K.reduit()) nom = `marche_${p.face}_${K.imageMarche(p.parcouru, 'fermier')}`;
        else if (!e.img || DEBOUT.test(e.img)) {
          // arrêté : le sens qu'il a chez lui, et il respire
          const m = /^(?:idle|marche)_(bas|haut|cote)_/.exec(e.img || '');
          if (m) { p.face = m[1]; p.flip = !!e.flip; }
          nom = `idle_${p.face}_${Math.floor(maintenant / PRESENCE.RESPIRE_MS) % 2}`;
          p.parcouru = 0;
        } else { nom = e.img; p.flip = !!e.flip; }
        const y = Math.round(e.y - (e.h || 0));
        if (p.img.texture.key !== sheet) p.img.setTexture(sheet, C(nom));
        else p.img.setFrame(C(nom));
        p.img.setPosition(Math.round(e.x), y).setFlipX(p.flip).setDepth(e.h > 0.5 && this.etageDepth ? this.etageDepth(e.y) : e.y);
        if (global.CarteVisages) global.CarteVisages.suivre(this, p.img);
        p.nom.setPosition(Math.round(e.x), y - 34);
        const texte = String(a.nom || 'Voisin');
        if (p.nom.text !== texte) p.nom.setText(texte);
      }
    },
  });
})(window);
