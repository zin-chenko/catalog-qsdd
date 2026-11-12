import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import { prepareJenkins, bundleName } from './prepare-jenkins.mjs';

const source = fileURLToPath(new URL('../', import.meta.url));

test('stages a standalone pbcui context without altering the source or lockfile', () => {
  const target = mkdtempSync(join(tmpdir(), 'catalog-jenkins-'));
  const originalPackage = readFileSync(join(source, 'package.json'), 'utf8');
  const originalLock = readFileSync(join(source, 'pnpm-lock.yaml'), 'utf8');
  const bundle = prepareJenkins(source, target);
  const manifest = JSON.parse(readFileSync(join(bundle, 'package.json'), 'utf8'));
  assert.equal(manifest.scripts.prod, 'pnpm run build:qpalette --output-path=dist/qcatalogqsddui');
  assert.deepEqual(manifest.dependencies, JSON.parse(originalPackage).dependencies);
  assert.equal(readFileSync(join(bundle, 'pnpm-lock.yaml'), 'utf8'), originalLock);
  assert.equal(readFileSync(join(source, 'package.json'), 'utf8'), originalPackage);
  assert.equal(readFileSync(join(source, 'pnpm-lock.yaml'), 'utf8'), originalLock);
  assert.equal(
    readFileSync(join(bundle, '.npmrc'), 'utf8').trim(),
    'registry=http://repolib-main.diasoft.ru:8081/repository/npm-public-and-diasoft/',
  );
  assert.deepEqual(
    readdirSync(target).filter((name) => /^Q.*UI$/.test(name)),
    [bundleName],
  );
  for (const name of ['.git', 'node_modules', 'dist', '.env', 'tests']) {
    assert.equal(existsSync(join(bundle, name)), false, name);
  }
  for (const name of ['src/qpalette/main.ts', 'scripts/check-qpalette.mjs', 'public/favicon.svg']) {
    assert.ok(existsSync(join(bundle, name)), name);
  }
  const config = JSON.parse(readFileSync(join(target, 'rootapp/assets/data/config.json'), 'utf8'));
  const menu = JSON.parse(readFileSync(join(target, 'rootapp/assets/data/menu.ru.json'), 'utf8'));
  assert.equal(config.serviceName, bundleName);
  assert.equal(menu[0].component, bundleName.toLowerCase());
  assert.equal(menu[0].service, bundleName.toLowerCase());
  assert.ok(existsSync(join(target, 'docker/Dockerfile-pbcui.txt')));
  assert.throws(() => prepareJenkins(source, target), /уже существует/);
});
