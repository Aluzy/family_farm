// Fabrique les cartes que le jeu charge à partir des cartes de travail Tiled :
//
//   assets/carte_printemps_elargie.tmj → assets/carte_printemps.json   (la carte de la ferme)
//   assets/serre_interieur.tmj         → assets/serre_interieur.json   (l'intérieur de la Serre)
//
//   node scripts/build-map.mjs
//
// Tiled enregistre une carte avec un jeu de tuiles externe (.tsx), que le jeu ne sait pas
// lire : le script le remplace par sa description complète (image, taille, colonnes). Il
// refuse d'écrire si une carte ne peut pas être affichée : carte infinie, couche compressée,
// tuile hors de la planche, lieu manquant.

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const TILESET = { name: 'farm_spring_summer', image: 'farm_spring_summer.png' };
const MAPS = [
  {
    source: 'assets/carte_printemps_elargie.tmj',
    target: 'assets/carte_printemps.json',
    // Rectangles nommés dont js/farm-stage.js a besoin (voir BUILDINGS et bakeGround()).
    places: ['maison', 'grange', 'moulin', 'serre', 'verger'],
    oneOf: ['zone_culture_1', 'zone_culture'],       // l'un des deux : la zone de culture
  },
  {
    source: 'assets/serre_interieur.tmj',
    target: 'assets/serre_interieur.json',
    // Couches d'objets dont le rectangle reçoit les parcelles (voir ROOMS et bakeRooms()).
    zoneLayers: /^serre_zone_\d+$/,
  },
];

// Taille de la planche : lue dans l'en-tête du PNG (largeur et hauteur, octets 16 à 23).
const png = readFileSync(join(ROOT, 'assets', TILESET.image));
const imagewidth = png.readUInt32BE(16), imageheight = png.readUInt32BE(20);

let failed = false;
for (const def of MAPS) {
  const errors = [];
  const map = JSON.parse(readFileSync(join(ROOT, def.source), 'utf8'));
  const tw = map.tilewidth, th = map.tileheight;
  const columns = Math.floor(imagewidth / tw);
  const tilecount = columns * Math.floor(imageheight / th);

  if (map.infinite) errors.push('carte infinie : décocher « Infinie » dans les propriétés de la carte');
  if (map.orientation !== 'orthogonal') errors.push(`orientation « ${map.orientation} » : seule « orthogonal » est affichée`);
  if ((map.tilesets || []).length !== 1) errors.push(`${(map.tilesets || []).length} jeux de tuiles : la carte doit n'en utiliser qu'un (${TILESET.image})`);

  const firstgid = map.tilesets && map.tilesets[0] ? map.tilesets[0].firstgid : 1;
  const names = new Set();
  let tiles = 0, zones = 0;
  for (const layer of map.layers || []) {
    if (layer.type === 'tilelayer') {
      if (!Array.isArray(layer.data)) { errors.push(`couche « ${layer.name} » : format CSV attendu (pas de compression)`); continue; }
      if (layer.data.length !== map.width * map.height) errors.push(`couche « ${layer.name} » : ${layer.data.length} cases au lieu de ${map.width * map.height}`);
      for (const cell of layer.data) {
        const gid = cell & 0x0fffffff;
        if (!gid) continue;
        tiles++;
        if (gid < firstgid || gid >= firstgid + tilecount) { errors.push(`couche « ${layer.name} » : tuile ${gid} hors de la planche (${tilecount} tuiles)`); break; }
      }
    } else if (layer.type === 'objectgroup') {
      for (const o of layer.objects || []) if (o.name) names.add(o.name);
      if (def.zoneLayers && def.zoneLayers.test(layer.name || '')) {
        if ((layer.objects || []).some((o) => o.width && o.height)) zones++;
        else errors.push(`couche d'objets « ${layer.name} » : il y manque le rectangle de la zone de culture`);
      }
    }
  }
  for (const p of def.places || []) if (!names.has(p)) errors.push(`rectangle « ${p} » absent de la couche d'objets`);
  if (def.oneOf && !def.oneOf.some((z) => names.has(z))) errors.push(`rectangle « ${def.oneOf[0]} » absent de la couche d'objets`);
  if (def.zoneLayers && !zones) errors.push('aucune couche d\'objets « serre_zone_1 », « serre_zone_2 »… : pas d\'emplacement pour les parcelles');

  if (errors.length) {
    console.error(`${def.source} : carte refusée`);
    for (const e of errors) console.error('  - ' + e);
    failed = true;
    continue;
  }

  map.tilesets = [{ firstgid, name: TILESET.name, image: TILESET.image, imagewidth, imageheight, tilewidth: tw, tileheight: th, tilecount, columns, margin: 0, spacing: 0 }];
  writeFileSync(join(ROOT, def.target), JSON.stringify(map) + '\n');
  const layers = map.layers.filter((l) => l.type === 'tilelayer').length;
  console.log(`${def.target} : ${map.width}×${map.height} tuiles, ${layers} couche${layers > 1 ? 's' : ''}, ${tiles} tuiles posées, ${def.zoneLayers ? `${zones} zones de culture` : `${names.size} rectangles`}.`);
}
if (failed) process.exit(1);
