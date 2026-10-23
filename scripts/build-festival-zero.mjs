// Copyright 2026 Robert McConnell
// SPDX-License-Identifier: Apache-2.0
// Copy the EXACT tested model into the Pages-only directory.
// Never maintain an independent browser simulator with divergent semantics.
import {copyFileSync,readFileSync,mkdirSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {dirname,resolve} from 'node:path';
import {createHash} from 'node:crypto';
const root=fileURLToPath(new URL('../', import.meta.url));
const src=resolve(root,'experiments/festival-zero/model.mjs');
const dst=resolve(root,'site/zero/model.mjs');
mkdirSync(dirname(dst),{recursive:true});
copyFileSync(src,dst);
const digest=createHash('sha256').update(readFileSync(dst)).digest('hex');
console.log(JSON.stringify({generated:'site/zero/model.mjs',source:'experiments/festival-zero/model.mjs',sha256:digest}));
