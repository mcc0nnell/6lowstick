// Copyright 2026 Robert McConnell
// SPDX-License-Identifier: Apache-2.0
// Local durable replay journal for synthetic lab alerts. Not a production transaction log.
import {openSync, readFileSync, writeSync, fsyncSync, closeSync, mkdirSync} from 'node:fs';
import {dirname} from 'node:path';
const ID = /^[A-Za-z0-9_-]{1,32}$/;
export class ReplayJournal {
  constructor(path) {
    this.path = path;
    this.seen = new Set();
    let content = '';
    try { content = readFileSync(path, 'utf8'); }
    catch (err) { if (err.code !== 'ENOENT') throw err; }
    for (const line of content.split('\n')) {
      if (!line) continue;
      if (!ID.test(line)) throw new Error('invalid replay journal');
      this.seen.add(line);
    }
  }
  accept(id) {
    if (!ID.test(id)) throw new Error('invalid alert ID');
    if (this.seen.has(id)) return false;
    mkdirSync(dirname(this.path), {recursive: true, mode: 0o700});
    const fd = openSync(this.path, 'a', 0o600);
    try { writeSync(fd, `${id}\n`); fsyncSync(fd); }
    finally { closeSync(fd); }
    this.seen.add(id);
    return true;
  }
}
