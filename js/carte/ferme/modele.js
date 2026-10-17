/* carte/ferme/modele.js — la scène de la ferme : la synchronisation avec le modèle de vue.
 *
 * sync(modèle) : crée, met à jour ou détruit ce qui a changé (bâtiments, parcelles, arbres du
 * Verger, panneaux solaires, puits, citerne, personnage du joueur) ; idempotent.
 *
 * Méthodes de la scène de la ferme (js/farm-stage.js), posées sur son prototype : `this` est la
 * scène, `this.ctx` ce que la page lui a donné au montage (voir docs/architecture-phaser.md).
 */
(function (global) {
  'use strict';

  const K = global.CarteKit;
  const F = global.FermeCarte;
  const { T, SFX, TREE_OBJECT, ORCHARD_FRAMES, ORCHARD_ADULT, TREE_BODY, DEFAULT_OBJECTS, BUILDINGS, ROOF_PANELS, WELL, PUMP_SHAKE_MS, TANK, RUINES, FERMIER_FRAME, ZONE_LABEL_UP } = F.C;
  const { clamp, reducedMotion, v } = F;

  F.partie({

    /* ---------- synchronisation avec le jeu ---------- */

    sync(model, force) {
      if (!this.ready) return;
      // Le personnage compare ce modèle au précédent : une case qu'il n'a pas encore
      // travaillée garde son ancien dessin (voir js/fermier.js).
      this.rawModel = model;
      if (this.family) this.family.sync(model);
      if (this.fermier) model = this.fermier.filter(model);
      const rebuild = !!force;                     // premier affichage ou affichage forcé

      // Lumière de l'heure (CarteKit.voile) : en fondu, sauf au premier affichage.
      this.lumiere.set(model.heure, force);

      // Bâtiments : présents seulement si le jeu les a débloqués.
      // modèle.batiments[id] = { visible, nom, badge } (ou un simple booléen).
      const shown = model.batiments || {};
      const info = (id) => {
        const v = shown[id];
        const o = v && typeof v === 'object' ? v : { visible: !!v };
        return (id === 'maison' || o.visible) ? o : null;   // version 1.12 : la Zone de culture aussi, une fois la ferme ouverte
      };
      for (const def of BUILDINGS) {
        const want = info(def.id);
        const e = this.buildings.get(def.id);
        if (e && (!want || rebuild || !!want.ruine !== !!e.ruine)) { e.sprite.destroy(); this.buildings.delete(def.id); this.sunDirty = true; }
        if (want && !this.buildings.has(def.id)) {
          const sprite = this.makeBuilding(def, !!want.ruine);
          this.buildings.set(def.id, { def, ruine: !!want.ruine, sprite });
          this.sunDirty = true;
        }
        // Le Moulin ne tourne que quand il moud (modèle.batiments.moulin.enMarche).
        const b = want ? this.buildings.get(def.id) : null;
        if (b && def.anim && b.sprite.anims) {
          const key = b.sprite.texture.key;
          const run = !!want.enMarche && !reducedMotion() && this.anims.exists(key);
          if (run && !b.sprite.anims.isPlaying) b.sprite.play(key);
          else if (!run && b.sprite.anims.isPlaying) { b.sprite.stop(); b.sprite.setFrame(0); }
        }
        // Étiquette : centrée au-dessus de l'image.
        const s = want ? this.buildings.get(def.id).sprite : null;
        this.syncLabel(def.id, want, def.window, s ? s.x + s.width / 2 : 0, s ? s.y - s.height + (def.labelDown || 0) : 0);
      }
      this.syncPerso(model.perso | 0);
      this.syncRoofPanels(model.panneaux | 0);
      this.syncWell(!!model.pompe, !!model.pompeEnMarche);
      this.syncTank(model.citerne == null ? -1 : model.citerne | 0);
      this.syncGatherables(model.ramassables);

      // Parcelles des deux zones : on crée, met à jour, détruit. Tuiles jointives depuis le
      // coin de chaque rectangle (zone_culture_1, zone_culture_2).
      this.grid.cols = Math.max(1, model.cols | 0);
      const seen = new Set();
      for (const z of this.zones(model)) {
        z.plots.forEach((p, i) => {
          const at = z.pos(z.slot(p, i));
          if (!at) return;                         // plus de parcelles que d'emplacements
          seen.add(p.id);
          const x = at.x + T / 2, y = at.y + T / 2;
          let e = this.plots.get(p.id);
          if (!e) {
            e = { soil: this.add.image(x, y, 'ph_dry').setDepth(2), crop: null, key: '', tween: null };
            this.plots.set(p.id, e);
          }
          e.soil.setPosition(x, y).setTexture(p.arrosee ? this.tex('soil_wet', 'ph_wet') : this.tex('soil_dry', 'ph_dry'));
          this.syncCrop(e, p, x, y);
        });
        // Étiquette de la zone : calée à gauche sur les parcelles, au-dessus de la barrière.
        // version 1.15 : sur l'ancienne Zone de culture, près de la maison
        const o = z.place && this.objects.zone_culture;
        if (o) this.syncLabel(z.id, info(z.id), z.id, Math.round(o.x / T) * T, Math.round(o.y / T) * T - ZONE_LABEL_UP, 'gauche');
      }
      for (const [id, e] of this.plots) {
        if (!seen.has(id)) { this.destroyPlot(e); this.plots.delete(id); }
      }
      this.syncZoneGround(model);
      this.syncHoeGrid(model.labourables);
      this.syncRocks(model.rochers);
      this.syncFelled(model.abattus);
      this.syncSprinklers(model.asperseurs);
      this.syncRobot(model.robot);
      this.syncTrees(model.arbres || [], rebuild);
      this.syncPiles(model.ramasser || []);
      this.syncRooms(model, force);
      // L'ambiance reçoit l'heure et les images des arbres (jamais le modèle) : elle
      // ne les anime pas, elle y fait partir feuilles et écureuils. Elle reçoit aussi l'image
      // de l'Étable et du Poulailler (s'ils sont affichés, avec leur vraie image) et le nombre
      // de bêtes : elle ouvre les portes le matin et fait sortir les bêtes.
      if (this.ambient) {
        const leafy = [];
        for (const e of this.trees.values()) if (e.key.indexOf('ph_') !== 0 && e.a.dessin >= ORCHARD_ADULT) leafy.push(e.sprite);
        const real = (id) => { const e = this.buildings.get(id); return e && e.sprite.texture.key.indexOf('ph_') !== 0 ? e.sprite : null; };
        const folds = { etable: real('etable'), poulailler: real('poulailler') };
        this.ambient.setContext({ hour: model.heure, trees: leafy, folds, herd: model.animaux || {} });
      }
      this.placeLabels();
    },

    // Version 1.17 : le personnage du joueur, un des 50 du catalogue (assets/personnages). Sa
    // planche est chargée la première fois qu'il est choisi ; d'ici là, la fermière.
    syncPerso(n) {
      if (!this.fermier || !n || n === this.persoN) return;
      this.persoN = n;
      const key = 'perso_' + n;
      const apply = () => { if (this.persoN === n && this.has(key)) this.fermier.setSheet(key); };
      if (this.textures.exists(key)) { apply(); return; }
      this.load.spritesheet(key, v(K.planche(n)), FERMIER_FRAME);
      this.load.once('complete', apply);
      this.load.start();
    },

    // Arbres du Verger (version 1.13) : chaque case du Verger (arbre ou emplacement libre)
    // se pose sur le rectangle arbre_verger_<case + 1>, pied au bas du rectangle, avec le
    // dessin de son stade. Au-delà des rectangles de la carte, rien n'est dessiné.
    // modèle.arbres[] = { case, id, libre, fruits, dessin } (dessin : ORCHARD_FRAMES).
    syncTrees(arbres, rebuild) {
      const seen = new Set();
      const own = this.has('verger');
      for (const a of arbres) {
        const o = this.objects[TREE_OBJECT + (a.case + 1)];
        if (!o) continue;
        seen.add(a.case);
        const key = own ? 'verger' : a.libre ? null : this.tex('tree_' + SFX, 'ph_arbre');
        let e = this.trees.get(a.case);
        if (e && (rebuild || e.key !== key)) { e.sprite.destroy(); this.trees.delete(a.case); e = null; this.sunDirty = true; }
        if (!key) continue;
        if (!e) {
          const sprite = this.add.image(0, 0, key, key.indexOf('ph_') !== 0 ? 0 : undefined);
          sprite.setOrigin(0.5, 1);
          e = { sprite, key, a };
          this.trees.set(a.case, e);
          this.sunDirty = true;
        }
        e.a = a;
        if (own && e.sprite.frame.name !== a.dessin) { e.sprite.setFrame(a.dessin); this.sunDirty = true; }
        const x = Math.round(o.x + o.width / 2), y = Math.round(o.y + o.height);
        e.sprite.setPosition(x, y).setDepth(y);
      }
      for (const [c, e] of this.trees) {
        if (!seen.has(c)) { e.sprite.destroy(); this.trees.delete(c); this.sunDirty = true; }
      }
    },

    // Zone touchable d'une case du Verger : la taille du dessin (les petits dessins
    // n'occupent que le bas de leur image de 80×80).
    orchardBox(e) {
      const d = e.a ? e.a.dessin : ORCHARD_FRAMES.arbre;
      if (d === ORCHARD_FRAMES.libre) return { w: 28, h: 12 };
      if (d === ORCHARD_FRAMES.jeune) return { w: 18, h: 24 };
      if (d === ORCHARD_FRAMES.arbuste) return { w: 32, h: 34 };
      return { w: e.sprite.displayWidth * TREE_BODY, h: e.sprite.displayHeight };
    },

    // Panneaux solaires sur le versant droit du toit : seulement sur la vraie image de la
    // maison réparée (ni ruine, ni dessin de secours), juste devant elle.
    syncRoofPanels(n) {
      const e = this.buildings.get('maison');
      const house = e && !e.ruine && e.sprite.texture.key.indexOf('house_') === 0 ? e.sprite : null;
      if (!house || n <= 0 || !this.has(ROOF_PANELS.key)) {
        if (this.roofPanels) { this.roofPanels.destroy(); this.roofPanels = null; }
        return;
      }
      if (!this.roofPanels) this.roofPanels = this.add.image(0, 0, ROOF_PANELS.key, 0).setOrigin(0);
      this.roofPanels.setFrame(Math.min(n, ROOF_PANELS.max) - 1)
        .setPosition(house.x + ROOF_PANELS.x, house.y - house.height + ROOF_PANELS.y)
        .setDepth(house.depth + 0.5);
    },

    // Le puits est toujours là ; la pompe s'y ajoute une fois achetée. Comme un bâtiment :
    // bas-centre de l'image sur le bas-centre du rectangle, profondeur = y du pied.
    // En marche, la pompe vibre : un pixel à droite, puis à sa place, et ainsi de suite.
    syncWell(pompe, enMarche) {
      if (!this.has(WELL.key)) return;
      const F = WELL.frames;
      if (!this.well) { this.well = this.placeProp(WELL); this.sunDirty = true; }
      const image = pompe ? F.tuyau : F.puits;
      if (this.well.frame.name !== image) { this.well.setFrame(image); this.sunDirty = true; }
      if (pompe && !this.pump) {
        this.pump = this.add.image(this.well.x, this.well.y, WELL.key, F.pompe).setOrigin(0, 1).setDepth(this.well.depth + 0.1);
      } else if (!pompe && this.pump) {
        this.pump.destroy();
        this.pump = null;
      }
      const shake = !!this.pump && enMarche && !reducedMotion();
      if (shake && !this.pumpShake) {
        this.pumpShake = this.time.addEvent({
          delay: PUMP_SHAKE_MS, loop: true,
          callback: () => { if (this.pump) this.pump.x = this.pump.x === this.well.x ? this.well.x + 1 : this.well.x; },
        });
      } else if (!shake && this.pumpShake) {
        this.pumpShake.remove();
        this.pumpShake = null;
        if (this.pump) this.pump.x = this.well.x;
      }
    },

    // La citerne, une fois le réservoir acheté : l'eau monte dans son tube de niveau.
    syncTank(niveau) {
      if (niveau < 0 || !this.has(TANK.key)) {
        if (this.tank) { this.tank.destroy(); this.tank = null; }
        return;
      }
      if (!this.tank) { this.tank = this.placeProp(TANK); this.sunDirty = true; }
      this.tank.setFrame(Math.min(niveau, TANK.max));
    },

    // Image d'une planche posée comme un bâtiment sur le rectangle `def.object`.
    placeProp(def) {
      const o = this.objects[def.object] || DEFAULT_OBJECTS[def.object];
      const w = def.frame.frameWidth;
      const h = def.frame.frameHeight;
      const x = clamp(Math.round(o.x + o.width / 2 - w / 2), 0, this.world.w - w);
      const y = clamp(Math.round(o.y + o.height), h, this.world.h);
      return this.add.image(x, y, def.key, 0).setOrigin(0, 1).setDepth(y);
    },

    // Pose le bas-centre de l'image sur le bas-centre du rectangle de la carte, sans sortir
    // de la carte. Profondeur = y du pied : ce qui est plus bas passe devant.
    makeBuilding(def, ruine) {
      const o = this.objects[def.object] || DEFAULT_OBJECTS[def.object];
      const wanted = def.suffixed ? def.tex + '_' + SFX : def.tex;
      const r = ruine && RUINES[def.id] && this.has(RUINES[def.id].key) ? RUINES[def.id] : null;
      const key = r ? r.key : this.tex(wanted, 'ph_' + def.id);
      const real = key.indexOf('ph_') !== 0;
      let s;
      if (r) {
        s = this.add.image(0, 0, key, r.frame != null ? r.frame : undefined);   // délabré : immobile
      } else if (def.anim && real) {
        s = this.add.sprite(0, 0, key, 0);         // l'animation : selon modèle.batiments (sync)
      } else {
        s = this.add.image(0, 0, key, real && def.frame != null ? def.frame : undefined);
      }
      s.setOrigin(0, 1);
      if (def.flip) s.setFlipX(true);
      const x = clamp(Math.round(o.x + o.width / 2 - s.width / 2), 0, this.world.w - s.width);
      const y = clamp(Math.round(o.y + o.height), s.height, this.world.h);
      s.setPosition(Math.round(x), Math.round(y)).setDepth(Math.round(y));
      return s;
    },

    syncCrop(e, p, x, y) {
      const key = p.culture ? p.culture + ':' + p.phase : '';
      if (key !== e.key) {
        if (e.crop) { if (e.tween) e.tween.stop(); e.crop.destroy(); e.crop = null; e.tween = null; }
        e.key = key;
        if (p.culture) {
          const framed = this.has('crops') && this.ctx.crops[p.culture];
          if (framed) {
            e.crop = this.add.image(x, y + T / 2, 'crops', key).setOrigin(0.5, 1);
          } else {
            // Sans image : l'emoji de la culture, grossit avec les phases.
            e.crop = this.add.text(x, y + 6, p.icone, { fontSize: '12px' }).setOrigin(0.5, 1).setScale(0.45 + 0.18 * Math.max(0, p.phase));
          }
          e.crop.setDepth(y + 1);
          // Petite apparition : la case « change » sous les yeux du joueur.
          e.crop.setAlpha(0);
          this.tweens.add({ targets: e.crop, alpha: 1, duration: 250 });
        }
      }
      if (e.crop) e.crop.setPosition(x, e.crop.type === 'Text' ? y + 6 : y + T / 2);
      // Mûre : la plante se balance doucement pour attirer l'appui.
      if (e.crop && p.mature && !e.tween && !reducedMotion()) {
        e.tween = this.tweens.add({ targets: e.crop, angle: { from: -4, to: 4 }, duration: 600, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
      }
      if (e.crop && !p.mature && e.tween) { e.tween.stop(); e.tween = null; e.crop.setAngle(0); }
    },

    destroyPlot(e) {
      if (e.tween) e.tween.stop();
      if (e.crop) e.crop.destroy();
      e.soil.destroy();
    },
  });
})(window);
