import { readFileSync } from 'node:fs';

const root = new URL('../', import.meta.url);
const packages = JSON.parse(readFileSync(new URL('config/qpalette-packages.json', root), 'utf8'));
const problems = [];
for (const [name, version] of Object.entries(packages)) {
  try {
    const installed = JSON.parse(readFileSync(new URL(`node_modules/${name}/package.json`, root), 'utf8'));
    if (installed.version !== version) {
      problems.push(`${name}: установлена ${installed.version}, нужна ${version}`);
    }
  } catch {
    problems.push(`${name}@${version}: не установлен или недоступен`);
  }
}
if (problems.length) {
  console.error(
    `QPalette пока не готова к сборке:\n${problems.map((problem) => `  - ${problem}`).join('\n')}\n\n` +
      'Сначала подключите корпоративную сеть и выполните pnpm run setup:qpalette.\n' +
      'После успешной установки повторите pnpm run build:qpalette.\n' +
      'Без корпоративных пакетов доступен деморежим: pnpm start.',
  );
  process.exitCode = 1;
}
