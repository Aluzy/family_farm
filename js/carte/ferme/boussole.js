/* carte/ferme/boussole.js — la scène de la ferme : la boussole du grand monde (fiche 8).
 *
 * La page dit à la scène où mène la boussole (modèle.boussole, js/ui/stage.js : { montree, but (le
 * lieu choisi sur la carte du monde : { x, y (px de carte), nom, icone }, ou null), ferme (la ferme : le
 * bout de sa sortie, { x, y, nom, icone }), surFerme (son rectangle, px de carte) }). Ici, à chaque
 * image, d'après la position du personnage :
 *
 *   - une petite boussole dans le coin de l'écran, sous l'horloge (dans le style du HUD : un cadran de
 *     laiton en gros pixels, dessiné dans un canevas de BO.taille px agrandi sans lissage), dont
 *     l'aiguille montre le but, et dessous le nom du but et sa distance en cases ;
 *   - le but : le lieu choisi, sinon la ferme ; sans lieu choisi, elle se cache sur la ferme (elle y
 *     montrerait l'endroit où l'on est), et quand la page la retire (les Options : montree) ;
 *   - un appui sur elle ouvre la carte du monde (ctx.bridge.act('carte-monde-open')).
 *
 * Elle n'est redessinée que quand l'aiguille tourne d'un cran (BO.crans par tour) ou que le texte
 * change : pas d'écriture dans la page à chaque image.
 *
 * Méthodes de la scène de la ferme (js/farm-stage.js), posées sur son prototype.
 */
(function (global) {
  'use strict';

  const F = global.FermeCarte;
  const { T } = F.C;

  // taille : le canevas (px, agrandi deux fois par la page : jeu.css) ; crans : les positions de
  // l'aiguille sur un tour ; couleurs : le laiton, le cadran, l'aiguille (rouge vers le but, grise
  // derrière), le contour (ceux de la police et des cadres du HUD)
  const BO = {
    taille: 30, crans: 48,
    c: { contour: [58, 36, 20], laiton: [201, 154, 59], clair: [242, 210, 122], fonce: [150, 104, 36], cadran: [246, 236, 210], ombre: [222, 204, 168], repere: [138, 104, 64], rouge: [208, 64, 44], rougeS: [138, 32, 24], gris: [154, 164, 180], grisS: [90, 98, 114] },
  };

  F.partie({

    syncBoussole(m) {
      this.boussoleModele = m || null;
    },

    // À chaque image : l'aiguille et le texte, d'après le personnage et le but.
    stepBoussole() {
      const m = this.boussoleModele, p = this.fermier && this.fermier.pos ? this.fermier.pos() : null;
      let but = null;
      if (m && m.montree && p && this.ctx.monde) {
        const R = m.surFerme;
        const surFerme = R && p.x >= R.x0 && p.x < R.x1 && p.y >= R.y0 && p.y < R.y1;
        but = m.but || (surFerme ? null : m.ferme);
      }
      let B = this.boussoleEl;
      if (!but) { if (B) B.el.hidden = true; return; }
      if (!B) B = this.boussoleFaite();
      B.el.hidden = false;
      const angle = Math.atan2(but.y - p.y, but.x - p.x);
      const cran = ((Math.round((angle / (2 * Math.PI)) * BO.crans) % BO.crans) + BO.crans) % BO.crans;
      if (cran !== B.cran) { B.cran = cran; this.boussoleDessine(B, (cran / BO.crans) * 2 * Math.PI); }
      const d = Math.round(Math.hypot(but.x - p.x, but.y - p.y) / T);
      const texte = `${but.icone || ''} ${but.nom} · ${d} case${d > 1 ? 's' : ''}`;
      if (texte !== B.texte) {
        B.texte = texte;
        B.nom.textContent = `${but.icone || ''} ${but.nom}`;
        B.dist.textContent = `${d} case${d > 1 ? 's' : ''}`;
        B.el.setAttribute('aria-label', `Boussole : ${but.nom}, à ${d} case${d > 1 ? 's' : ''}. Ouvrir la carte du monde`);
      }
    },

    // Le bouton de la boussole (dans la zone de la carte, par-dessus : jeu.css .boussole).
    boussoleFaite() {
      const hote = (this.ctx.labelLayer && this.ctx.labelLayer.parentElement) || global.document.body;
      const el = global.document.createElement('button');
      el.type = 'button';
      el.className = 'boussole';
      el.title = 'La boussole : touche-la pour ouvrir la carte du monde';
      const cv = global.document.createElement('canvas');
      cv.width = cv.height = BO.taille;
      cv.className = 'boussole-cadran';
      cv.setAttribute('aria-hidden', 'true');
      const legende = global.document.createElement('span');
      legende.className = 'boussole-legende';
      const nom = global.document.createElement('span');
      nom.className = 'boussole-nom';
      const dist = global.document.createElement('span');
      dist.className = 'boussole-distance num';
      legende.append(nom, dist);
      el.append(cv, legende);
      el.addEventListener('click', (ev) => { ev.stopPropagation(); if (this.ctx.bridge && this.ctx.bridge.act) this.ctx.bridge.act('carte-monde-open', {}); });
      hote.appendChild(el);
      this.boussoleEl = { el, cv, nom, dist, cran: -1, texte: '', img: cv.getContext('2d').createImageData(BO.taille, BO.taille) };
      this.events.once('destroy', () => { el.remove(); this.boussoleEl = null; });
      return this.boussoleEl;
    },

    // Le cadran et l'aiguille vers `angle` (radians : 0 vers l'est, comme l'écran), pixel par pixel :
    // l'anneau de laiton (éclairé en haut à gauche), le cadran crème, les quatre repères et le N, puis
    // l'aiguille (un losange : la moitié rouge vers le but, la grise derrière) et son contour.
    boussoleDessine(B, angle) {
      const N = BO.taille, C = BO.c, d = B.img.data, cx = N / 2 - 0.5, cy = N / 2 - 0.5;
      const R = N / 2 - 0.5, ux = Math.cos(angle), uy = Math.sin(angle);
      const aiguille = (x, y) => {
        const u = (x - cx) * ux + (y - cy) * uy, v = Math.abs(-(x - cx) * uy + (y - cy) * ux);
        if (u >= 0 && u <= R - 5 && v <= 2.6 * (1 - u / (R - 5))) return (-(x - cx) * uy + (y - cy) * ux) < 0 ? C.rouge : C.rougeS;
        if (u < 0 && u >= -(R - 8) && v <= 2.6 * (1 + u / (R - 8))) return (-(x - cx) * uy + (y - cy) * ux) < 0 ? C.gris : C.grisS;
        return null;
      };
      // le N, en gros pixels (3 × 5), en haut du cadran
      const LN = ['#.#', '###', '###', '#.#', '#.#'];
      for (let y = 0; y < N; y++) {
        for (let x = 0; x < N; x++) {
          const o = (y * N + x) * 4, r = Math.hypot(x - cx, y - cy);
          let c = null;
          if (r <= R) c = C.contour;
          if (r <= R - 1) c = (x - cx) + (y - cy) < -4 ? C.clair : (x - cx) + (y - cy) > 8 ? C.fonce : C.laiton;
          if (r <= R - 3.2) c = C.contour;
          if (r <= R - 4) c = (x - cx) + (y - cy) > 6 ? C.ombre : C.cadran;
          // les repères (est, sud, ouest) et le N au nord
          const ax = Math.abs(x - cx), ay = Math.abs(y - cy);
          if (r <= R - 4 && r >= R - 6.5 && (ax < 1 || ay < 1) && !(y < cy && ax < 1)) c = C.repere;
          const lx = x - Math.round(cx - 1), ly = y - 4;
          if (lx >= 0 && lx < 3 && ly >= 0 && ly < 5 && LN[ly][lx] === '#') c = C.rouge;
          const a = r <= R - 4 ? aiguille(x, y) : null;
          if (a) c = a;
          else if (r <= R - 4) {
            // le contour de l'aiguille : un pixel sombre autour
            let bord = false;
            for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (aiguille(x + dx, y + dy)) { bord = true; break; }
            if (bord) c = C.contour;
          }
          if (Math.hypot(x - cx, y - cy) < 1.3) c = C.contour;     // l'axe
          if (!c) { d[o + 3] = 0; continue; }
          d[o] = c[0]; d[o + 1] = c[1]; d[o + 2] = c[2]; d[o + 3] = 255;
        }
      }
      B.cv.getContext('2d').putImageData(B.img, 0, 0);
    },

    // (les essais : ce que montre la boussole)
    boussoleInfo() {
      const B = this.boussoleEl;
      return B && !B.el.hidden ? { texte: B.texte, cran: B.cran, angle: Math.round((B.cran / BO.crans) * 360) } : null;
    },
  });
})(window);
