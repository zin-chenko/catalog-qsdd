import { extname } from 'node:path';

export function pnpmCommand(pnpm, args) {
  const extension = extname(pnpm).toLowerCase();
  if (['.js', '.cjs', '.mjs'].includes(extension)) {
    return { command: process.execPath, args: [pnpm, ...args] };
  }
  if (extension === '.cmd' || extension === '.bat') {
    throw new Error('npm_execpath должен указывать на pnpm.exe или JS-файл pnpm, а не shell-обёртку.');
  }
  // Standalone pnpm is a native executable, including pnpm.exe on Windows.
  return { command: pnpm, args };
}
