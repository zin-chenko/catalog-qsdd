import { cpSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const bundleName = 'QSDDUI';
const projectRoot = fileURLToPath(new URL('../', import.meta.url));
const bundleFiles = [
  'package.json',
  'pnpm-lock.yaml',
  'pnpm-workspace.yaml',
  'angular.json',
  'tsconfig.json',
  'tsconfig.app.json',
  'tsconfig.qpalette.json',
  'webpack.config.js',
  'src',
  'public',
  'scripts',
  'config',
];

export function prepareJenkins(source, destination) {
  const target = resolve(destination);
  const bundle = join(target, bundleName);
  if (existsSync(bundle)) {
    throw new Error(`${bundle} уже существует. Используйте чистый каталог сборки.`);
  }
  for (const entry of [...bundleFiles, 'rootapp', 'docker/Dockerfile-pbcui.txt', '.gitignore']) {
    if (!existsSync(join(source, entry))) throw new Error(`Отсутствует файл сборки: ${entry}`);
  }
  mkdirSync(bundle, { recursive: true });
  for (const entry of bundleFiles) {
    cpSync(join(source, entry), join(bundle, entry), { recursive: true });
  }
  const manifestPath = join(bundle, 'package.json');
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  // The shared pbcui Docker template calls prod; never publish the standalone demo here.
  manifest.scripts.prod = 'pnpm run build:qpalette --output-path=dist/qsddui';
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
  // CI uses the corporate registry for all packages, like qedmsui.
  writeFileSync(
    join(bundle, '.npmrc'),
    'registry=http://repolib-main.diasoft.ru:8081/repository/npm-public-and-diasoft/\n',
  );
  cpSync(join(source, 'rootapp'), join(target, 'rootapp'), { recursive: true });
  mkdirSync(join(target, 'docker'), { recursive: true });
  cpSync(join(source, 'docker/Dockerfile-pbcui.txt'), join(target, 'docker/Dockerfile-pbcui.txt'));
  cpSync(join(source, '.gitignore'), join(target, '.gitignore'));
  // Allowlist the image context, excluding the original checkout and local credentials/caches.
  writeFileSync(
    join(target, '.dockerignore'),
    [
      '*',
      `!${bundleName}/`,
      `!${bundleName}/**`,
      '!rootapp/',
      '!rootapp/**',
      '!docker/',
      '!docker/Dockerfile-pbcui.txt',
      '**/*.test.mjs',
      '**/.env*',
      '**/node_modules',
      '**/.git',
      '',
    ].join('\n'),
  );
  return bundle;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const output = resolve(process.argv[2] ?? join(projectRoot, 'tmp/jenkins'));
  console.log(`Подготовлен бандл: ${prepareJenkins(projectRoot, output)}`);
}
