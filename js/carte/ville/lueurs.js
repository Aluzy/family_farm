/* carte/ville/lueurs.js — la scène de la ville : les lumières de la grotte (Phaser 4).
 *
 * Dans la grotte, la carte est dans le noir (une lumière d'ambiance presque noire) et seules
 * des lumières l'éclairent, pixel par pixel (this.lights, setLighting) :
 *   - la lanterne de la promeneuse, chaude, qui la suit (plus loin avec la Lampe de mineur) ;
 *   - le jour qui tombe du trou au-dessus de l'échelle, froid et faible ;
 *   - les champignons bioluminescents, cyan, qui pulsent lentement (chacun à son rythme) et
 *     lâchent de temps en temps une spore qui monte et s'éteint ;
 *   - les améthystes, violettes, faibles de loin, plus vives quand on s'en approche, avec une
 *     étincelle de temps en temps.
 * Chaque champignon et chaque améthyste a aussi un petit halo (Point Light : il n'éclaire rien,
 * il se voit). Phaser ne garde que les lumières les plus proches du centre de la vue (render.
 * maxLights, js/carte/jeu.js). Sans WebGL (rendu Canvas), pas de lumières : la grotte garde
 * son ancienne obscurité (une image noire percée autour de la promeneuse, js/ville-carte.js).
 * Avec « réduire les animations » : les lumières restent, sans pulsation, spores ni étincelles.
 *
 * Méthodes de la scène des cartes (js/ville-carte.js), posées sur son prototype : `this` est
 * la scène (voir docs/architecture-phaser.md).
 */
(function (global) {
  'use strict';

  const V = global.CarteVille;
  const { T, GROTTE } = V.C;
  const { reduced } = V;

  const clamp01 = (v) => Math.max(0, Math.min(1, v));

  V.partie({

    // ---------- les lumières de la grotte ----------

    // Les lumières du niveau (après buildCave). f : la portée de la lanterne (Lampe de mineur,
    // 1 sans elle). false : pas d'éclairage possible (Canvas), rien n'est changé.
    makeCaveLights(f) {
      const c = this.cave, L = GROTTE.lueurs, Ph = global.Phaser;
      if (!c || !this.lights || !Ph || this.sys.renderer.type !== Ph.WEBGL) return false;
      this.lights.enable().setAmbientColor(L.ambiance);
      // ce qui est éclairé : le sol, les murs, le minerai, les objets de la grotte, la promeneuse
      // et son ombre (les flèches des passages et les éclats restent vifs)
      for (const l of Object.values(this.layers)) if (l && l.setLighting) l.setLighting(true);
      for (const o of c.images || []) o.setLighting(true);
      this.hero.setLighting(true);
      this.shadow.setLighting(true);
      const la = L.lanterne;
      this.lanterne = this.lights.addLight(this.heroPos.x, this.heroPos.y - la.haut, GROTTE.lumiere.r1 * f * la.rayon, la.couleur, la.intensite);
      const E = c.echelle, ec = L.echelle;
      this.lights.addLight(E.x * T + 8, E.y * T + 10, ec.rayon, ec.couleur, ec.intensite);
      this.lueurs = c.decor.map((d) => {
        const s = L[d.kind];
        const x = d.x * T + 8, y = d.y * T + 11;
        return {
          kind: d.kind, s, x, y,
          light: this.lights.addLight(x, y, s.rayon, s.couleur, s.intensite[1]),
          halo: this.add.pointlight(x, y, s.couleur, s.halo.rayon, s.halo.intensite, s.halo.attenuation).setDepth(L.haloDepth),
          phase: Math.random() * Math.PI * 2,
          periode: s.periode ? s.periode[0] + Math.random() * (s.periode[1] - s.periode[0]) : 0,
          eclat: s.eclat ? s.eclat[0] + Math.random() * (s.eclat[1] - s.eclat[0]) : 0,
        };
      });
      this.spores = 0;
      if (!this.textures.exists('eclat')) {
        const g = this.make.graphics({ x: 0, y: 0, add: false });
        g.fillStyle(0xffffff, 1).fillRect(2, 0, 1, 5).fillRect(0, 2, 5, 1);
        g.generateTexture('eclat', 5, 5);
        g.destroy();
      }
      return true;
    },

    // À chaque image : la lanterne suit la promeneuse ; les champignons pulsent, les améthystes
    // s'avivent près d'elle ; les spores et les étincelles, dans la vue seulement.
    stepCaveLights(time, dt) {
      if (!this.lueurs) return;
      const P = this.heroPos, L = GROTTE.lueurs;
      this.lanterne.setPosition(P.x, P.y - L.lanterne.haut);
      const calme = reduced(), t = time / 1000;
      const vue = this.cameras.main.worldView;
      const voit = (q) => q.x > vue.x - T && q.x < vue.right + T && q.y > vue.y - T && q.y < vue.bottom + T;
      const champignons = [];
      for (const q of this.lueurs) {
        const [bas, haut] = q.s.intensite;
        let k;
        if (q.kind === 'champignon') {
          k = calme ? 0.5 : 0.5 + 0.5 * Math.sin(q.phase + (t * Math.PI * 2) / q.periode);
          if (!calme && voit(q)) champignons.push(q);
        } else {
          k = clamp01(1 - Math.hypot(q.x - P.x, q.y - P.y) / q.s.portee);
          if (!calme && voit(q) && (q.eclat -= dt) <= 0) {
            q.eclat = q.s.eclat[0] + Math.random() * (q.s.eclat[1] - q.s.eclat[0]);
            this.etincelle(q);
          }
        }
        q.light.setIntensity(bas + (haut - bas) * k);
      }
      // les spores : `spores` par seconde, sur un champignon de la vue
      if (champignons.length && (this.spores += dt * L.champignon.spores) >= 1) {
        this.spores -= 1;
        this.spore(champignons[Math.floor(Math.random() * champignons.length)]);
      }
    },

    // Une spore monte d'un champignon en dérivant un peu, puis s'éteint.
    spore(q) {
      const S = GROTTE.lueurs.champignon;
      const r = this.add.rectangle(Math.round(q.x + (Math.random() - 0.5) * 8), q.y - 3, 1, 1, S.spore)
        .setBlendMode(global.Phaser.BlendModes.ADD).setDepth(q.y + 2);
      this.tweens.add({
        targets: r, y: r.y - 10 - Math.random() * 8, x: r.x + (Math.random() - 0.5) * 8, alpha: { from: 0.95, to: 0 },
        duration: 2000 + Math.random() * 1200, ease: 'Sine.easeOut', onComplete: () => r.destroy(),
      });
    },

    // Une étincelle sur une améthyste : une petite croix qui grandit puis s'efface.
    etincelle(q) {
      const e = this.add.image(Math.round(q.x - 4 + Math.random() * 8), Math.round(q.y - 6 - Math.random() * 4), 'eclat')
        .setTint(GROTTE.lueurs.cristal.etincelle).setBlendMode(global.Phaser.BlendModes.ADD).setDepth(q.y + 2).setScale(0.4).setAlpha(0);
      this.tweens.add({ targets: e, scale: 1, alpha: 1, duration: 220, yoyo: true, ease: 'Sine.easeOut', onComplete: () => e.destroy() });
    },
  });
})(window);
