/* carte/ville/trouvailles.js — la scène de la ville : les trouvailles de la montagne et de la plage.
 *
 * Des trouvailles à ramasser (couche « trouvailles » : un genre par endroit ; chaque jour, une
 * partie des endroits, et ce qu'on a ramassé ne revient que le lendemain ; une trouvaille
 * ramassée va dans l'inventaire, FermeHote.ramasser : fossiles, pierres, coquillages, corail,
 * perles, qui se vendent ; les herbes de montagne, dans les prés, que les vaches de l'Étable
 * mangent pour le lait d'alpage).
 *
 * Méthodes de la scène des cartes (js/ville-carte.js), posées sur son prototype : `this` est
 * la scène (voir docs/architecture-phaser.md).
 */
(function (global) {
  'use strict';

  const V = global.CarteVille;
  const { FINDS } = V.C;
  const { hote, reduced } = V;
  const etat = V.etat;

  V.partie({

    // ---------- les trouvailles ----------

    makeFinds(objs) {
      this.finds = [];
      this.pick = null;
      const meta = (this.cache.json.get('faune') || {}).trouvailles || {};
      if (!objs.length || !this.textures.exists(FINDS.key)) return;
      if (!this.textures.exists('eclat')) {
        const g = this.make.graphics({ x: 0, y: 0, add: false });
        g.fillStyle(0xffffff, 1).fillRect(2, 0, 1, 5).fillRect(0, 2, 5, 1);
        g.generateTexture('eclat', 5, 5);
        g.destroy();
      }
      const jour = this.heure ? this.heure.jour : Math.floor(Date.now() / 864e5);
      const rec = this.readFinds();
      if (rec.jour !== jour) { rec.jour = jour; rec.pris = []; }
      // le carnet d'avant (les trouvailles n'allaient pas encore dans l'inventaire) : versé une fois
      const H = hote();
      if (H && H.verserTrouvailles && rec.carnet && Object.keys(rec.carnet).length) {
        H.verserTrouvailles(rec.carnet);
        rec.carnet = {};
        try { window.localStorage.setItem(FINDS.store, JSON.stringify(rec)); } catch (e) { /* ignoré */ }
      }
      this.findRec = rec;
      const hash = (str) => {
        let h = 2166136261;
        for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
        return ((h >>> 0) % 10007) / 10007;
      };
      for (const o of objs) {
        const genre = ((o.properties || []).find((q) => q.name === 'genre') || {}).value;
        const id = etat.nom + ':' + o.name;
        if (hash(jour + '/' + id) > FINDS.part || rec.pris.includes(id)) continue;
        const kinds = Object.entries(meta).filter(([, m]) => m.genre === genre);
        if (!kinds.length) continue;
        const [kind, m] = kinds[Math.floor(hash(id + '#' + jour) * kinds.length) % kinds.length];
        const s = this.add.image(Math.round(o.x), Math.round(o.y), FINDS.key, m.frame).setOrigin(0.5, 0.8).setDepth(o.y - 2);
        const e = this.add.image(Math.round(o.x + 4), Math.round(o.y - 11), 'eclat').setDepth(o.y - 1).setAlpha(0);
        this.finds.push({ id, kind, nom: m.nom, x: o.x, y: o.y, s, e, phase: hash(id) * 7 });
      }
    },

    readFinds() {
      let r = null;
      try { r = JSON.parse(window.localStorage.getItem(FINDS.store) || 'null'); } catch (e) { r = null; }
      return r && Array.isArray(r.pris) ? Object.assign({ carnet: {} }, r) : { jour: null, pris: [], carnet: {} };
    },

    tapFind(w) {
      const f = (this.finds || []).find((q) => Math.abs(w.x - q.x) <= 11 && w.y >= q.y - 16 && w.y <= q.y + 6);
      if (!f) return false;
      this.pick = f;
      if (Math.hypot(this.heroPos.x - f.x, this.heroPos.y - f.y) > FINDS.reach) this.goTo(f.x, f.y + 4);
      return true;
    },

    stepFinds(time) {
      const P = this.heroPos;
      for (const f of [...(this.finds || [])]) {
        // un éclat, de temps en temps
        const k = Math.sin(time / 520 + f.phase);
        f.e.setAlpha(reduced() ? 0 : Math.max(0, k) ** 12);
        const d = Math.hypot(P.x - f.x, P.y - f.y);
        // (refusée : la nuit ; on la retente après s'en être éloigné)
        if (f.refus) { if (d > FINDS.reach) f.refus = false; continue; }
        if ((this.pick === f && d <= FINDS.reach && !this.path.length) || d <= 9) this.collect(f);
      }
    },

    collect(f) {
      if (this.pick === f) this.pick = null;
      // dans le jeu : la trouvaille va dans l'inventaire (FermeHote.ramasser ; refusée, elle reste là)
      const H = hote();
      const r = H && H.ramasser ? H.ramasser(f.kind) : null;
      if (r && !r.ok) { f.refus = true; return; }
      this.finds.splice(this.finds.indexOf(f), 1);
      f.e.destroy();
      this.tweens.add({ targets: f.s, y: f.s.y - 12, alpha: 0, duration: reduced() ? 0 : 450, onComplete: () => f.s.destroy() });
      const rec = this.findRec;
      rec.pris.push(f.id);
      if (!r) rec.carnet[f.kind] = (rec.carnet[f.kind] || 0) + 1;      // (la carte seule : le carnet)
      try { window.localStorage.setItem(FINDS.store, JSON.stringify(rec)); } catch (e) { /* ignoré */ }
      if (r) this.popGain({ [r.item]: r.n });
      else this.say(`✨ ${f.nom} ! (dans le carnet : ${rec.carnet[f.kind]})`);
    },
  });
})(window);
