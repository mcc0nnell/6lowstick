// Copyright 2026 Robert McConnell
// SPDX-License-Identifier: Apache-2.0
// Runs the C11 unit test with no Celix dependency; used by the normal CI suite.
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';

test('6lowReactor normalized telemetry admission and advisory work natively in C', () => {
    const root=fileURLToPath(new URL('../',import.meta.url));
    const scratch=mkdtempSync(join(tmpdir(),'6lowreactor-core-'));
    try {
        const output=join(scratch,'core-test');
        const c=spawnSync(process.env.CC||'cc',[
            '-std=c11','-O2','-Wall','-Wextra','-Werror',
            '-I'+join(root,'reactor/include'),
            join(root,'reactor/src/core.c'),join(root,'reactor/test/core_test.c'),
            '-o',output
        ],{encoding:'utf8'});
        assert.equal(c.status,0,c.stderr||c.error?.message);
        const result=spawnSync(output,[],{encoding:'utf8'});
        assert.equal(result.status,0,result.stderr||result.error?.message);
        assert.match(result.stdout,/observer core PASS/);
    } finally {
        rmSync(scratch,{recursive:true,force:true});
    }
});
