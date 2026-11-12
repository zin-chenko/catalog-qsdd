import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { pnpmCommand } from './pnpm-command.mjs';

const root = new URL('../', import.meta.url);
const packages = JSON.parse(readFileSync(new URL('config/qpalette-packages.json', root), 'utf8'));
// Fixed package names/versions only; no shell interpolation or embedded credentials.
const args = [
  'add',
  '--save-exact',
  ...Object.entries(packages).map(([name, version]) => `${name}@${version}`),
];
const pnpm = process.env.npm_execpath;
if (!pnpm || !/pnpm/i.test(pnpm)) {
  throw new Error('Запустите через pnpm run setup:qpalette');
}
const invocation = pnpmCommand(pnpm, args);
const result = spawnSync(invocation.command, invocation.args, { cwd: root, stdio: 'inherit' });
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
