/* carte/ferme/presence.js — la scène de la ferme : les autres joueurs d'un monde en ligne (E-4).
 *
 * Dans un monde en ligne (js/ui/en-ligne.js), chaque joueur envoie le centre de sa vue ; le monde le relaie
 * aux autres sans l'écrire. Ici, chaque autre joueur est dessiné là où il regarde : le personnage, de
 * face, et son prénom au-dessus, devant le décor. Il glisse vers sa dernière position (PRESENCE.LISSAGE_MS :
 * les positions arrivent ≈ 5 fois par seconde), et s'efface s'il n'a plus rien envoyé depuis
 * PRESENCE.OUBLI_MS (ou quand il part : le monde le dit). Rien de tout cela ne touche la partie.
 *
 * Méthodes de la scène de la ferme (js/farm-stage.js), posées sur son prototype : `this` est la
 * scène, `this.ctx` ce que la page lui a donné au montage (voir docs/architecture-phaser.md).
 */
(function (global) {
  'use strict';

  const F = global.FermeCarte;
  const PRESENCE = { LISSAGE_MS: 140, OUBLI_MS: 60000, PROFONDEUR: 1e5 - 3, TEINTE: 0xfff1c8 };

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
      if (!A || !A.size || !this.textures.exists('fermier')) return;
      const k = 1 - Math.exp(-(Number(delta) || 16) / PRESENCE.LISSAGE_MS);
      for (const [id, a] of A) {
        if (maintenant - a.t > PRESENCE.OUBLI_MS) continue;
        let p = P.get(id);
        if (!p) {
          const img = this.add.image(a.x, a.y, 'fermier', 0).setOrigin(0.5, 1).setDepth(PRESENCE.PROFONDEUR).setTint(PRESENCE.TEINTE);
          img.toujours = true;   // (pas masqué hors de la vue : decor.js, cullScene)
          const nom = this.add.text(a.x, a.y - 34, String(a.nom || 'Ami'), {
            fontFamily: 'Ferme Dialogue, sans-serif', fontSize: '6px', color: '#4a2a10', backgroundColor: 'rgba(255,241,210,0.9)', padding: { x: 2, y: 1 },
          }).setOrigin(0.5, 1).setDepth(PRESENCE.PROFONDEUR + 1).setResolution(8);
          p = { img, nom, x: a.x, y: a.y };
          P.set(id, p);
        }
        p.x += (a.x - p.x) * k;
        p.y += (a.y - p.y) * k;
        p.img.setPosition(Math.round(p.x), Math.round(p.y));
        p.nom.setPosition(Math.round(p.x), Math.round(p.y) - 34);
        if (p.nom.text !== String(a.nom || 'Ami')) p.nom.setText(String(a.nom || 'Ami'));
      }
    },
  });
})(window);
