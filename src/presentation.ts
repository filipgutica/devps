import { basename, dirname, relative } from 'node:path';
import { HOME, RUNTIMES, type Job, type ProcessTable } from './processes.js';
import { APP_NAMES } from './origin.js';
import { git, isDirectory } from './system.js';

const colorEnabled = process.stdout.isTTY || process.env.DEVPS_COLOR === '1';
const color = (code: string, value: string): string => colorEnabled ? `\x1b[${code}m${value}\x1b[0m` : value;
export const bold = (value: string): string => color('1', value);
export const dim = (value: string): string => color('2', value);
export const green = (value: string): string => color('32', value);
export const yellow = (value: string): string => color('33', value);
export const cyan = (value: string): string => color('36', value);
export const tilde = (path: string): string => path.startsWith(HOME) ? '~' + path.slice(HOME.length) : path;
const truncate = (value: string, length: number): string => [...value].slice(0, length).join('');

export function projectLabel(cwd: string): string {
  const top = isDirectory(cwd) ? git(cwd, 'rev-parse', '--show-toplevel') : '';
  if (!top) return tilde(cwd);
  const common = git(cwd, 'rev-parse', '--path-format=absolute', '--git-common-dir');
  const repo = common.endsWith('/.git') ? basename(dirname(common)) : basename(top);
  const worktree = basename(top), sub = relative(top, cwd);
  return repo + (worktree !== repo ? ` [${worktree}]` : '') + (sub ? ` ${sub}` : '');
}
export function shortCmd(args: string): string {
  let tokens = args.trim().split(/\s+/).map(token => (token.includes('/') && !token.startsWith('-') ? basename(token) : token).replace(/\.[cm]?js$/, ''));
  if (tokens.length > 1 && RUNTIMES.test(tokens[0] ?? '')) {
    tokens = tokens.slice(1);
    while (tokens.length > 1 && tokens[0]?.startsWith('-')) tokens = tokens.slice(1);
  }
  return tokens.join(' ');
}
export function age(etime: string): string {
  const [days, rest] = etime.includes('-') ? etime.split('-') : ['', etime];
  const parts = (rest ?? '').split(':').map(Number);
  const [hours, minutes] = parts.length === 3 ? parts : [0, parts[0]];
  return days ? `${Number(days)}d` : hours ? `${hours}h` : `${minutes ?? 0}m`;
}
export function rows(jobs: Job[], table: ProcessTable): { header: string; lines: string[] } {
  const header = ['PORTS', 'PROJECT', 'COMMAND', 'ORIGIN', 'AGE', 'PID'];
  const body = jobs.map(job => [portsLabel(job), truncate(projectLabel(job.cwd), 55), truncate(shortCmd(job.args), 32), truncate(job.origin, 60), age(table.get(job.root)?.etime ?? '0:00'), String(job.root)]);
  const widths = header.map((_, index) => Math.max(...[header, ...body].map(row => [...row[index] ?? ''].length)));
  const format = (row: string[], isHeader = false, orphan = false): string => {
    const cells = row.map((cell, index) => cell + ' '.repeat(Math.max(0, (widths[index] ?? 0) - [...cell].length)));
    if (isHeader) return dim(cells.join('  '));
    cells[0] = bold(green(cells[0] ?? ''));
    cells[1] = cyan(cells[1] ?? '');
    if (orphan) cells[3] = yellow('⚠ ' + cells[3]);
    cells[4] = dim(cells[4] ?? '');
    cells[5] = dim(cells[5] ?? '');
    return cells.join('  ');
  };
  return { header: format(header, true), lines: body.map((row, index) => format(row, false, jobs[index]?.orphan)) };
}
export const portsLabel = (job: Job): string => [...job.ports].sort((a, b) => a - b).map(port => `:${port}`).join(' ');

export function preview(job: Job, table: ProcessTable): void {
  console.log(`${bold(portsLabel(job))}  ${cyan(projectLabel(job.cwd))}  ${dim(age(table.get(job.root)?.etime ?? '0:00') + ' old')}`);
  console.log(`${dim('origin')}  ${job.orphan ? yellow(job.origin) : job.origin}`);
  console.log(`${dim('jump  ')}  ${job.jump.description}${job.jump.clipboard ? `  (+ copies \`${job.jump.clipboard}\`)` : ''}`);
  console.log(`${dim('cwd   ')}  ${tilde(job.cwd)}`);
  console.log(`${dim('cmd   ')}  ${truncate(job.args, 300)}`);
  console.log(`\n${dim('launched by (nearest first)')}`);
  for (const proc of job.chain.slice(0, 6)) {
    const label = proc.app ? APP_NAMES[proc.app] ?? proc.app : proc.name;
    console.log(`  ${String(proc.pid).padStart(6)} ${label}${proc.tty !== '??' ? dim(`  ${proc.tty}`) : ''}`);
  }
  console.log(`\n${dim('listeners')}`);
  for (const [pid, ports] of job.listeners) console.log(`  ${String(pid).padStart(6)} ${ports.map(port => `:${port}`).join(' ')}  ${truncate(shortCmd(job.listenerArgs.get(pid) ?? ''), 80)}`);
  if (Object.keys(job.env).length) {
    console.log(`\n${dim('origin env (allowlisted keys only)')}`);
    for (const [key, value] of Object.entries(job.env)) console.log(`  ${key}=${value}`);
  }
}
