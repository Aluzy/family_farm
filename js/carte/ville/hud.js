/* carte/ville/hud.js — la scène de la ville : les messages et la fenêtre de la gare.
 *
 * La ligne des messages (FermeHote.say dans la page du jeu) et les fenêtres de la gare et des
 * lieux (créées une fois dans la page : leur style, css/jeu.css, « .ville-fenetre »). Un toucher
 * sur la gare ouvre la fenêtre des départs (TRAIN.gares).
 *
 * Méthodes de la scène des cartes (js/ville-carte.js), posées sur son prototype : `this` est
 * la scène (voir docs/architecture-phaser.md).
 */
(function (global) {
  'use strict';

  const V = global.CarteVille;
  const { TRAIN } = V.C;
  const { hote } = V;
  const etat = V.etat;

  // Les fenêtres de la gare et des lieux, et la ligne des messages : créées une fois dans la
  // page qui accueille la carte (leur style : css/jeu.css, « .ville-fenetre »).
  function ensureDom() {
    if (document.getElementById('gare-fenetre')) return;
    const box = document.createElement('div');
    box.innerHTML = `
      <div class="ville-message" id="message" role="status" aria-live="polite" hidden></div>
      <div class="ville-fenetre" id="gare-fenetre" role="dialog" aria-modal="true" aria-labelledby="gare-titre" hidden>
        <div class="boite">
          <h2 id="gare-titre">🚉 La gare</h2>
          <p id="gare-texte">Où veux-tu aller ?</p>
          <div class="choix" id="gare-choix"></div>
          <button type="button" class="annuler" id="gare-annuler">Rester ici</button>
        </div>
      </div>
      <div class="ville-fenetre" id="lieu-fenetre" role="dialog" aria-modal="true" aria-labelledby="lieu-titre" hidden>
        <div class="boite">
          <h2 id="lieu-titre"></h2>
          <div id="lieu-corps"></div>
          <button type="button" class="annuler" id="lieu-fermer">Fermer</button>
        </div>
      </div>`;
    while (box.firstElementChild) document.body.appendChild(box.firstElementChild);
  }

  V.partie({

    // ---------- les messages, la fenêtre de la gare ----------

    makeHud() {
      ensureDom();
      this.msgEl = document.getElementById('message');
      this.gareEl = document.getElementById('gare-fenetre');
      const textes = {
        ville: 'Touche un trottoir pour y marcher · la gare, l\'arrêt de bus à côté, un étal du marché, un entrepôt',
        montagne: 'Touche l\'alpage pour y marcher · une trouvaille pour la ramasser · la canne en main : le lac · la gare pour rentrer',
        plage: 'Touche le sable pour y marcher · une trouvaille pour la ramasser · la canne en main : la mer, depuis le ponton · la gare pour rentrer',
        grotte: 'Touche le sol pour y marcher · un minerai pour le piocher · l\'échelle pour remonter',
        transition: 'Touche l\'herbe pour y marcher · une maison pour y entrer · l\'abri de bus pour aller à la gare · la hache ou la pioche en main (barre d\'outils) : un arbre, un rocher',
        interieur: 'Touche le plancher pour y marcher · un voisin pour lui parler · la flèche pour sortir',
      };
      const annuler = document.getElementById('gare-annuler');
      if (annuler) annuler.onclick = () => this.closeGare();
      const fermer = document.getElementById('lieu-fermer');
      if (fermer) fermer.onclick = () => this.closeLieu();
      this.onKey = (e) => { if (e.key === 'Escape' && this.dialog) { if (this.lieu) this.closeLieu(); else this.closeGare(); } };
      window.addEventListener('keydown', this.onKey);
      this.events.once('destroy', () => window.removeEventListener('keydown', this.onKey));
      if (hote() && textes[etat.nom]) this.say('💡 ' + textes[etat.nom]);
    },

    say(texte) {
      if (hote() && hote().say) { hote().say(texte); return; }
      if (!this.msgEl) return;
      this.msgEl.textContent = texte;
      this.msgEl.hidden = false;
      if (this.sayTimer) this.sayTimer.remove();
      this.sayTimer = this.time.delayedCall(3600, () => { this.msgEl.hidden = true; });
    },

    // La gare touchée (le dessin du bâtiment « gare ») : la fenêtre des départs.
    tapGare(w) {
      const b = (this.buildings || []).find((q) => q.name === 'gare');
      if (!b || !this.gare || !TRAIN.gares[etat.nom] || w.x < b.x0 || w.x > b.x1 || w.y < b.top || w.y > b.base + 8) return false;
      this.openGare();
      return true;
    },

    openGare() {
      const el = this.gareEl, list = TRAIN.gares[etat.nom];
      if (!el || !list) return;
      const box = document.getElementById('gare-choix');
      box.textContent = '';
      for (const d of list) {
        const b = document.createElement('button');
        b.type = 'button';
        b.textContent = d.label;
        b.addEventListener('click', () => this.startTrip(d));
        box.appendChild(b);
      }
      const texte = document.getElementById('gare-texte');
      if (texte) texte.textContent = 'Le train part dans un instant. Où veux-tu aller ?';
      const titre = document.getElementById('gare-titre');
      if (titre) titre.textContent = '🚉 La gare';
      el.hidden = false;
      this.dialog = true;
      const first = box.querySelector('button');
      if (first) first.focus();
    },

    closeGare() {
      if (this.gareEl) this.gareEl.hidden = true;
      // (le relâchement du clic qui ferme la fenêtre ne doit pas faire marcher la promeneuse)
      this.time.delayedCall(60, () => { this.dialog = false; });
    },
  });
})(window);
