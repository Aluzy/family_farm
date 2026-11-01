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
  const { T, SFX, TREE_OBJECT, ORCHARD_ADULT, TREE_BODY, DEFAULT_OBJECTS, WELL, PUMP_SHAKE_MS, TANK, FERMIER_FRAME, ZONE_LABEL_UP, BLOCS_CARTE, SOLEIL } = F.C;
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
      // le brouillard du grand monde et la boussole (brouillard.js, boussole.js : fiche 8)
      if (this.syncBrouillard) this.syncBrouillard(model.brouillard);
      if (this.syncBoussole) this.syncBoussole(model.boussole);

      // Lieux : modèle.batiments[id] = { visible, nom, badge } (ou un simple booléen).
      const shown = model.batiments || {};
      const info = (id) => {
        const v = shown[id];
        const o = v && typeof v === 'object' ? v : { visible: !!v };
        return o.visible ? o : null;
      };
      this.syncPerso(model.perso | 0);
      this.syncFloors(model.sols);
      this.syncPaths(model.chemins);
      this.syncBeasts(model.enclos, model.heure);
      this.fireOn = !!model.fourAllume;
      this.meuleOn = !!model.meuleTourne;
      this.syncBlocks(model.blocs, model.bati, model.pieces, model.serreMurs);   // (avant le puits et la citerne : posés sur leurs blocs)
      this.syncSilo(model.blocs);         // (les blocs de silo : leurs caisses, ou le silo qu'ils forment, silo.js)
      this.syncAbeilles(model);   // (les abeilles des ruches, et les fleurs où elles butinent)
      this.syncBotteleuses(model.botteleuses, model.botteVibre, model.fibres);   // (après les blocs : leurs images)
      this.syncDistributeurs(model.distributeurs, model.grainEnMain);
      this.syncChaines(model.chaines);                                           // (après les blocs : leurs images, chaines.js)
      this.syncTableaux(model.tableaux);                                         // (après les blocs : sur leurs murs)
      this.syncEtage(model.etage, model.niveau, model.vueNiveau);                // (après les blocs : ceux sous l'étage se cachent)
      this.syncToits(model.toits);
      this.syncVoilure(model.moulinTour);
      this.syncWell(!!model.pompe, !!model.pompeEnMarche);
      this.syncTank(model.citerne == null ? -1 : model.citerne | 0);
      this.syncGatherables(model.ramassables);
      this.syncPieces(model.morceaux);
      this.syncSurbrillance(model.surbrillance);   // (le didacticiel : après les ramassables et les blocs)
      this.syncPlantation(model.plantation);       // (planter un arbre : les cases possibles)
      this.syncPousses(model.pousses);   // (les arbres plantés d'une graine : une jeune pousse,
      this.syncForet(model.foret);       //  puis un arbre, foret.js)

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
            // la terre de la parcelle : à plat sur le sol (au-dessus du plancher de la Serre), sous
            // les ombres du soleil (soleil.js) qui s'y portent comme sur l'herbe
            const terre = (BLOCS_CARTE.solDepth + SOLEIL.depth) / 2;
            e = { soil: this.add.image(x, y, 'ph_dry').setDepth(terre), crop: null, key: '', tween: null };
            this.plots.set(p.id, e);
          }
          // (dans la Serre, la terre est celle de son bac, dessinée au sol avec ses planches,
          // drawZoneDirt : rien par-dessus, sauf la tache humide d'une parcelle arrosée)
          if (z.id === 'serre' && this.has('soil_wet_serre')) e.soil.setPosition(x, y).setTexture('soil_wet_serre').setVisible(!!p.arrosee);
          else e.soil.setPosition(x, y).setTexture(p.arrosee ? this.tex('soil_wet', 'ph_wet') : this.tex('soil_dry', 'ph_dry')).setVisible(true);
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
      if (this.ctx.monde) this.syncMonde(model.monde);   // (ce qui est pris dans le grand monde : recolte-monde.js)
      this.syncCutGrass(model.fauchees);
      this.syncSprinklers(model.asperseurs);
      this.syncRobot(model.robot);
      this.syncTrees(model.arbres || [], rebuild);
      this.syncPiles(model.ramasser || []);
      // L'ambiance reçoit l'heure et les images des arbres (jamais le modèle) : elle
      // ne les anime pas, elle y fait partir feuilles et écureuils. Elle reçoit aussi l'image
      // de l'Étable et du Poulailler (s'ils sont affichés, avec leur vraie image) et le nombre
      // de bêtes : elle ouvre les portes le matin et fait sortir les bêtes.
      if (this.ambient) {
        const leafy = [];
        for (const e of this.trees.values()) if (e.key.indexOf('ph_') !== 0 && e.a.stade >= ORCHARD_ADULT) leafy.push(e.sprite);
        // (les cases bâties : les bâtiments en blocs, sous leur toit, et tous les blocs posés ; ni
        // oiseau, ni luciole, ni papillon n'y vont, ambient-life.js)
        const bati = (model.blocs || []).map((b) => b.case);
        for (const t of model.toits || []) for (const c of t.cases) bati.push(c);
        this.ambient.setContext({ hour: model.heure, trees: leafy, herd: model.animaux || {}, compagnons: model.compagnons || [], bati, cols: this.grid.cols });
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
    // dessin de son stade. Au-delà des rectangles de la carte, rien n'est dessiné. La ferme
    // générée (a.sol) : l'arbre planté dans le sol, sur sa case de la carte (treeRect).
    // modèle.arbres[] = { case, id, libre, fruits, dessin, stade } (dessin : l'image de verger.png).
    syncTrees(arbres, rebuild) {
      const seen = new Set();
      const own = this.has('verger');
      for (const a of arbres) {
        const o = a.sol ? this.treeRect(a.case) : this.objects[TREE_OBJECT + (a.case + 1)];
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
      // la ferme générée : un arbre planté ferme sa case au passage (blockCells)
      const sol = arbres.filter((a) => a.sol).map((a) => a.case).join();
      if (sol !== (this.treesSol || '')) { this.treesSol = sol; if (this.fermier && this.fermier.regrid) this.fermier.regrid(); }
    },

    // Le rectangle d'un arbre planté dans le sol (la ferme générée) : la taille de ceux du Verger,
    // le pied au bas de sa case, centré sur elle.
    treeRect(c) {
      const cols = this.grid.cols, x = (c % cols) * T + T / 2, y = (Math.floor(c / cols) + 1) * T;
      return { x: x - 32, y: y - 78, width: 64, height: 78 };
    },

    // Zone touchable d'une case du Verger : la taille du dessin (les petits dessins
    // n'occupent que le bas de leur image de 80×80).
    orchardBox(e) {
      const st = e.a ? e.a.stade : 2;
      if (st < 0) return { w: 28, h: 12 };
      if (st === 0) return { w: 18, h: 24 };
      if (st === 1) return { w: 30, h: 40 };
      return { w: e.sprite.displayWidth * TREE_BODY, h: 64 };
    },

    // Le puits est toujours là ; la pompe s'y ajoute une fois achetée. Comme un bâtiment :
    // bas-centre de l'image sur le bas-centre du rectangle, profondeur = y du pied.
    // En marche, la pompe vibre : un pixel à droite, puis à sa place, et ainsi de suite.
    syncWell(pompe, enMarche) {
      if (!this.has(WELL.key)) return;
      const F = WELL.frames;
      // la ferme générée : le puits est un bloc posé (étape 5b-2), sinon il n'y en a pas
      const rect = this.ctx.carte ? this.blockRect('puits') : null;
      const at = rect ? rect.x + ',' + rect.y : '';
      if (this.ctx.carte && this.well && this.wellAt !== at) {
        this.well.destroy(); this.well = null;
        if (this.pump) { this.pump.destroy(); this.pump = null; }
        if (this.pumpShake) { this.pumpShake.remove(); this.pumpShake = null; }
        this.sunDirty = true;
      }
      if (this.ctx.carte && !rect) return;
      if (!this.well) { this.well = this.placeProp(WELL, rect); this.wellAt = at; this.sunDirty = true; }
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
      // la ferme générée : la citerne est un bloc posé (étape 5b-2)
      const rect = this.ctx.carte ? this.blockRect('citerne') : null;
      const at = rect ? rect.x + ',' + rect.y : '';
      if (niveau < 0 || !this.has(TANK.key) || (this.ctx.carte && !rect) || (this.tank && this.tankAt !== at)) {
        if (this.tank) { this.tank.destroy(); this.tank = null; this.sunDirty = true; }
        if (niveau < 0 || !this.has(TANK.key) || (this.ctx.carte && !rect)) return;
      }
      if (!this.tank) { this.tank = this.placeProp(TANK, rect); this.tankAt = at; this.sunDirty = true; }
      const f = Math.min(niveau, TANK.max);
      // (un niveau de capacité de plus : la cuve grandit, son ombre aussi)
      if (Math.floor(Number(this.tank.frame.name) / 5) !== Math.floor(f / 5)) this.sunDirty = true;
      this.tank.setFrame(f);
    },

    // Image d'une planche posée comme un bâtiment sur le rectangle `def.object` (ou `rect`).
    placeProp(def, rect) {
      const o = rect || this.objects[def.object] || DEFAULT_OBJECTS[def.object];
      const w = def.frame.frameWidth;
      const h = def.frame.frameHeight;
      const x = clamp(Math.round(o.x + o.width / 2 - w / 2), 0, this.world.w - w);
      const y = clamp(Math.round(o.y + o.height), h, this.world.h);
      return this.add.image(x, y, def.key, 0).setOrigin(0, 1).setDepth(y);
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
