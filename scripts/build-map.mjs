// Fabrique les cartes que le jeu charge à partir des cartes de travail Tiled :
//
//   assets/carte_printemps_elargie.tmj → assets/carte_printemps.json   (la carte de la ferme)
//   assets/serre_interieur.tmj         → assets/serre_interieur.json   (l'intérieur de la Serre)
//
//   node scripts/build-map.mjs
//
// Tiled enregistre une carte avec des jeux de tuiles externes (.tsx), que le jeu ne sait
// pas lire : le script les remplace par leur description complète (image, taille, colonnes)
// et y recopie les animations de tuiles, qui sont dans le .tsx et pas dans la carte. Les
// .tsx sont lus dans assets/, à côté des cartes. Il refuse d'écrire si une carte ne peut pas
// être affichée : carte infinie, couche compressée, tuile hors de toute planche, lieu manquant.

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { basename, dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
// La planche principale : sans elle, la carte ne s'affiche pas. Les autres jeux de tuiles
// sont facultatifs : si leur image manque dans assets/, leurs tuiles ne sont pas dessinées.
const MAIN = 'farm_spring_summer';
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

// Taille d'une image PNG : lue dans son en-tête (largeur et hauteur, octets 16 à 23).
function pngSize(file) {
  const png = readFileSync(file);
  return { width: png.readUInt32BE(16), height: png.readUInt32BE(20) };
}

// Lit un jeu de tuiles Tiled (.tsx, XML) : taille, image, et animations de tuiles
// (`<tile id><animation><frame tileid duration>`). L'image est cherchée dans assets/ sous
// son seul nom de fichier : le chemin écrit par Tiled est celui du poste de l'auteur.
const tsxCache = new Map();
function readTileset(name, errors) {
  if (tsxCache.has(name)) return tsxCache.get(name);
  let set = null;
  const file = join(ROOT, 'assets', name + '.tsx');
  if (!existsSync(file)) {
    errors.push(`jeu de tuiles assets/${name}.tsx introuvable : l'y copier depuis le dossier de la carte`);
  } else {
    const xml = readFileSync(file, 'utf8');
    const head = (xml.match(/<tileset\b[^>]*>/) || [''])[0];
    const image = (xml.match(/<image\b[^>]*>/) || [''])[0];
    const attr = (tag, key) => { const m = tag.match(new RegExp(`\\b${key}="([^"]*)"`)); return m ? m[1] : null; };
    const tiles = [];
    for (const m of xml.matchAll(/<tile id="(\d+)"[^>]*>([\s\S]*?)<\/tile>/g)) {
      const animation = [...m[2].matchAll(/<frame tileid="(\d+)" duration="(\d+)"\s*\/>/g)].map((f) => ({ tileid: Number(f[1]), duration: Number(f[2]) }));
      if (animation.length > 1) tiles.push({ id: Number(m[1]), animation });
    }
    set = {
      name: attr(head, 'name') || name,
      image: basename(String(attr(image, 'source') || '').replace(/\\/g, '/')),
      imagewidth: Number(attr(image, 'width')), imageheight: Number(attr(image, 'height')),
      tilewidth: Number(attr(head, 'tilewidth')), tileheight: Number(attr(head, 'tileheight')),
      tilecount: Number(attr(head, 'tilecount')), columns: Number(attr(head, 'columns')),
      margin: Number(attr(head, 'margin') || 0), spacing: Number(attr(head, 'spacing') || 0),
      tiles,
    };
    const png = join(ROOT, 'assets', set.image);
    set.present = !!set.image && existsSync(png);
    if (set.present) {
      const size = pngSize(png);
      if (size.width !== set.imagewidth || size.height !== set.imageheight) {
        errors.push(`assets/${set.image} fait ${size.width}×${size.height} px, le jeu de tuiles ${name}.tsx attend ${set.imagewidth}×${set.imageheight}`);
      }
    }
    if (!(set.tilecount > 0 && set.columns > 0)) { errors.push(`assets/${name}.tsx : nombre de tuiles ou de colonnes illisible`); set = null; }
  }
  tsxCache.set(name, set);
  return set;
}

let failed = false;
for (const def of MAPS) {
  const errors = [];
  const notes = [];
  const map = JSON.parse(readFileSync(join(ROOT, def.source), 'utf8'));

  if (map.infinite) errors.push('carte infinie : décocher « Infinie » dans les propriétés de la carte');
  if (map.orientation !== 'orthogonal') errors.push(`orientation « ${map.orientation} » : seule « orthogonal » est affichée`);

  // Jeux de tuiles de la carte, du premier numéro de tuile au dernier.
  const sets = [];
  for (const t of map.tilesets || []) {
    const name = basename(String(t.source || t.name || '').replace(/\\/g, '/'), '.tsx');
    const set = readTileset(name, errors);
    if (set) sets.push({ key: name, firstgid: t.firstgid, used: 0, set });
  }
  if (!sets.some((s) => s.key === MAIN)) errors.push(`la carte n'utilise pas la planche ${MAIN}`);
  else if (!sets.find((s) => s.key === MAIN).set.present) errors.push(`assets/${sets.find((s) => s.key === MAIN).set.image} introuvable`);
  const owner = (gid) => sets.find((s) => gid >= s.firstgid && gid < s.firstgid + s.set.tilecount);

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
        const s = owner(gid);
        if (!s) { errors.push(`couche « ${layer.name} » : tuile ${gid} hors de toute planche`); break; }
        s.used++;
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

  // Un jeu de tuiles dont aucune tuile n'est posée n'est pas recopié. Les numéros de tuile
  // (firstgid) des autres ne changent pas.
  let animated = 0;
  map.tilesets = [];
  for (const s of sets) {
    if (!s.used) { notes.push(`jeu de tuiles ${s.key} : aucune tuile posée, laissé de côté`); continue; }
    if (!s.set.present) notes.push(`⚠ assets/${s.set.image} manque : les ${s.used} tuiles de ${s.key} ne seront pas dessinées`);
    const t = s.set;
    animated += t.tiles.length;
    map.tilesets.push({
      firstgid: s.firstgid, name: t.name, image: t.image, imagewidth: t.imagewidth, imageheight: t.imageheight,
      tilewidth: t.tilewidth, tileheight: t.tileheight, tilecount: t.tilecount, columns: t.columns, margin: t.margin, spacing: t.spacing,
      ...(t.tiles.length ? { tiles: t.tiles } : {}),
    });
  }
  writeFileSync(join(ROOT, def.target), JSON.stringify(map) + '\n');
  const layers = map.layers.filter((l) => l.type === 'tilelayer').length;
  console.log(`${def.target} : ${map.width}×${map.height} tuiles, ${layers} couche${layers > 1 ? 's' : ''}, ${tiles} tuiles posées, ${def.zoneLayers ? `${zones} zones de culture` : `${names.size} rectangles`}, ${animated} tuile${animated > 1 ? 's' : ''} animée${animated > 1 ? 's' : ''} dans les planches.`);
  for (const n of notes) console.log('  ' + n);
}
if (failed) process.exit(1);
