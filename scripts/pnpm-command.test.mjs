import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { test } from 'node:test';
import { pnpmCommand } from './pnpm-command.mjs';

test('standalone executable runs directly without being interpreted as JavaScript', () => {
  const invocation = pnpmCommand(process.execPath, ['--version']);
  const result = spawnSync(invocation.command, invocation.args, { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout.trim(), process.version);
});

test('JS entry runs with Node and preserves spaces and literal arguments', () => {
  const directory = mkdtempSync(join(tmpdir(), 'pnpm launcher '));
  try {
    const entry = join(directory, 'pnpm.mjs');
    writeFileSync(entry, 'console.log(JSON.stringify(process.argv.slice(2)));');
    const args = ['add', '@diasoft/qpalette-auth@8.1.3', 'literal space & $value'];
    const invocation = pnpmCommand(entry, args);
    const result = spawnSync(invocation.command, invocation.args, { encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr);
    assert.deepEqual(JSON.parse(result.stdout), args);
  } finally {
    // This directory was created exclusively by this test under the OS temp directory.
    rmSync(directory, { recursive: true, force: true });
  }
});

test('shell wrappers fail explicitly instead of enabling shell interpolation', () => {
  assert.throws(() => pnpmCommand('pnpm.cmd', ['add']), /npm_execpath/);
});
