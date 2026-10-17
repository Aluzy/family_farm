/* carte/ville/hud.js — la scène de la ville : les messages et les fenêtres (la gare, l'arrêt de
 * bus, les étals et les entreprises).
 *
 * Les messages passent par la page du jeu (FermeHote.say : une notification). Les fenêtres
 * sont celles du jeu (FermeHote.modal, js/ui/modal.js : le cadre bois, le focus posé dedans et
 * gardé par Tab, Échap et le fond qui la ferment, le focus rendu à la fermeture). Un toucher
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

  const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  V.partie({

    // ---------- les messages, les fenêtres ----------

    makeHud() {
      this.dialog = false;
      this.dialogEl = null;
      const textes = {
        ville: 'Touche un trottoir pour y marcher · la gare, l\'arrêt de bus à côté, un étal du marché, un entrepôt',
        montagne: 'Touche l\'alpage pour y marcher · une trouvaille pour la ramasser · la canne en main : le lac · la gare pour rentrer',
        plage: 'Touche le sable pour y marcher · une trouvaille pour la ramasser · la canne en main : la mer, depuis le ponton · la gare pour rentrer',
        grotte: 'Touche le sol pour y marcher · un minerai pour le piocher · l\'échelle pour remonter',
        transition: 'Touche l\'herbe pour y marcher · une maison pour y entrer · l\'abri de bus pour aller à la gare · la hache ou la pioche en main (barre d\'outils) : un arbre, un rocher',
        interieur: 'Touche le plancher pour y marcher · un voisin pour lui parler · la flèche pour sortir',
      };
      if (textes[etat.nom]) this.say('💡 ' + textes[etat.nom]);
    },

    say(texte) {
      const H = hote();
      if (H && H.say) H.say(texte);
    },

    // Une fenêtre du jeu (FermeHote.modal) : `corps` (HTML), son titre (id `titre`), et un bouton
    // « Fermer ». Tant qu'elle est ouverte, les touchers ne vont pas à la carte. Renvoie la boîte
    // de dialogue (null sans la page du jeu).
    openDialog(titre, corps) {
      const H = hote();
      if (!H || !H.modal) return null;
      const dlg = H.modal(`<h2 id="${titre}"></h2>${corps}
        <div class="row ville-fermer"><button type="button" class="btn" data-action="close-modal">Fermer</button></div>`,
      { labelledBy: titre, className: 'modal bois item-modal ville-modal', focus: false });
      this.dialogEl = dlg;
      this.dialog = true;
      return dlg;
    },

    // Le focus sur le premier choix de la fenêtre (sinon son bouton « Fermer »).
    focusDialog() {
      const d = this.dialogEl;
      const b = d && (d.querySelector('.choix button:not([disabled]), .rangs button:not([disabled]), .quota button:not([disabled])') || d.querySelector('button:not([disabled])'));
      if (b) b.focus({ preventScroll: true });
    },

    // Ferme la fenêtre de la carte, si c'est encore elle qui est ouverte.
    closeDialog() {
      const d = this.dialogEl, H = hote();
      if (d && d.isConnected && H && H.closeModal) H.closeModal();
      this.dialogDone();
    },

    // Chaque image : la fenêtre a-t-elle été fermée (Fermer, Échap, le fond, une autre fenêtre
    // du jeu ouverte par-dessus) ? La carte reprend les touchers un instant après (le relâchement
    // du clic qui la ferme ne doit pas faire marcher la promeneuse).
    stepDialog() {
      if (this.dialogEl && !this.dialogEl.isConnected) this.dialogDone();
    },

    dialogDone() {
      if (!this.dialogEl) return;
      this.dialogEl = null;
      this.lieu = null;
      if (this.sys && this.sys.isActive()) this.time.delayedCall(60, () => { if (!this.dialogEl) this.dialog = false; });
      else this.dialog = false;
    },

    // La gare touchée (le dessin du bâtiment « gare ») : la fenêtre des départs.
    tapGare(w) {
      const b = (this.buildings || []).find((q) => q.name === 'gare');
      if (!b || !this.gare || !TRAIN.gares[etat.nom] || w.x < b.x0 || w.x > b.x1 || w.y < b.top || w.y > b.base + 8) return false;
      this.openGare();
      return true;
    },

    // La fenêtre des départs (la gare) ou de l'arrêt de bus : un texte, des choix.
    // `choix` : [{ label, go }].
    openChoix(titre, texte, choix) {
      const dlg = this.openDialog('gare-titre', `<p>${esc(texte)}</p>
        <div class="choix">${choix.map((c, i) => `<button type="button" class="btn primary" data-choix="${i}">${esc(c.label)}</button>`).join('')}</div>`);
      if (!dlg) return;
      dlg.querySelector('#gare-titre').textContent = titre;
      dlg.querySelectorAll('[data-choix]').forEach((b) => { b.onclick = () => choix[Number(b.dataset.choix)].go(); });
      this.focusDialog();
    },

    openGare() {
      const list = TRAIN.gares[etat.nom];
      if (!list) return;
      this.openChoix('🚉 La gare', 'Le train part dans un instant. Où veux-tu aller ?', list.map((d) => ({ label: d.label, go: () => this.startTrip(d) })));
    },

    closeGare() {
      this.closeDialog();
    },
  });
})(window);
