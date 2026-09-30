import { spawnSync } from 'node:child_process';
import { accessSync, constants, statSync } from 'node:fs';
import { delimiter, join } from 'node:path';

export function execute(command: readonly string[], input?: string) {
  const [program, ...args] = command;
  if (!program) throw new Error('empty command');
  return spawnSync(program, args, { encoding: 'utf8', input, maxBuffer: 16 * 1024 * 1024 });
}

export function run(command: readonly string[]): string {
  const result = execute(command);
  if (result.error) throw new Error(`devps: ${command[0]} failed: ${result.error.message}`);
  // ps and lsof return 1 without stderr when nothing matches.
  if (result.status !== 0 && result.stderr.trim()) {
    throw new Error(`devps: ${command[0]} failed: ${result.stderr.trim()}`);
  }
  return result.stdout;
}

export function which(command: string): boolean {
  return (process.env.PATH ?? '').split(delimiter).some(directory => {
    try { accessSync(join(directory, command), constants.X_OK); return true; }
    catch { return false; }
  });
}

export function isDirectory(directory: string): boolean {
  try { return statSync(directory).isDirectory(); }
  catch { return false; }
}

export function git(directory: string, ...args: string[]): string {
  const result = execute(['git', '-C', directory, ...args]);
  return result.status === 0 ? result.stdout.trim() : '';
}

// Shell strings are required only by fzf's preview and reload commands.
export const shellQuote = (value: string): string => `'${value.replaceAll("'", "'\\''")}'`;
