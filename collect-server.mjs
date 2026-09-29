#!/usr/bin/env node
// Serveur de collecte local pour Ferme Familiale.
// Reçoit le JSON d'une session de jeu (POST /session) et l'écrit dans
// ./sessions/<date>_<sid>.json. Un fichier par session : si le jeu renvoie la
// même session (envoi périodique puis envoi final), le fichier est remplacé
// par la version la plus récente.
//
// Sans dépendance. Usage : node collect-server.mjs [port]   (défaut : 8787)

import http from 'node:http';
import { mkdirSync, writeFileSync, readdirSync, renameSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const PORT = Number(process.argv[2]) || 8787;
const HOST = '127.0.0.1'; // uniquement cette machine
const MAX_BYTES = 512 * 1024;
const DIR = join(dirname(fileURLToPath(import.meta.url)), 'sessions');
const SID_RE = /^[A-Za-z0-9-]{8,64}$/;

mkdirSync(DIR, { recursive: true });

// Nom de fichier stable par session : la date de début est figée à la première réception.
const knownFiles = new Map();
for (const f of readdirSync(DIR)) {
  const m = f.match(/^(\d{4}-\d{2}-\d{2}T\d{6}Z)_([A-Za-z0-9-]+)\.json$/);
  if (m) knownFiles.set(m[2], f);
}

function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  // Chrome (Private Network Access) : page publique -> localhost
  res.setHeader('Access-Control-Allow-Private-Network', 'true');
}

function reply(res, code, body) {
  res.writeHead(code, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(body));
}

const server = http.createServer((req, res) => {
  cors(res);
  if (req.method === 'OPTIONS') { res.writeHead(204); return res.end(); }
  if (req.method !== 'POST' || req.url !== '/session') return reply(res, 404, { error: 'not found' });

  const chunks = [];
  let size = 0;
  req.on('data', (c) => {
    size += c.length;
    if (size > MAX_BYTES) { reply(res, 413, { error: 'trop volumineux' }); req.destroy(); return; }
    chunks.push(c);
  });
  req.on('end', () => {
    if (size > MAX_BYTES) return;
    let data;
    try { data = JSON.parse(Buffer.concat(chunks).toString('utf8')); }
    catch { return reply(res, 400, { error: 'JSON invalide' }); }
    if (!data || typeof data !== 'object' || !SID_RE.test(String(data.sid || ''))) {
      return reply(res, 400, { error: 'sid manquant ou invalide' });
    }
    if (!Array.isArray(data.events)) return reply(res, 400, { error: 'events manquant' });

    let name = knownFiles.get(data.sid);
    if (!name) {
      const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+Z$/, 'Z');
      const day = `${stamp.slice(0, 4)}-${stamp.slice(4, 6)}-${stamp.slice(6, 8)}`;
      name = `${day}T${stamp.slice(9, 15)}Z_${data.sid}.json`;
      knownFiles.set(data.sid, name);
    }
    data.receivedAt = new Date().toISOString();
    try {
      mkdirSync(DIR, { recursive: true }); // le dossier a pu être supprimé entre-temps
      const tmp = join(DIR, `.${name}.tmp`);
      writeFileSync(tmp, JSON.stringify(data, null, 2));
      renameSync(tmp, join(DIR, name)); // écriture atomique
    } catch (err) {
      return reply(res, 500, { error: 'écriture impossible' });
    }
    reply(res, 200, { ok: true, file: name, events: data.events.length });
  });
});

server.listen(PORT, HOST, () => {
  console.log(`Collecte Ferme Familiale : http://${HOST}:${PORT}/session -> ${DIR}`);
});
