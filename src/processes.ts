import { homedir } from 'node:os';
import { basename } from 'node:path';
import { run } from './system.js';
import { classify } from './origin.js';

export const HOME = homedir();
export const RUNTIMES = /^(node|bun|deno|python[\d.]*|ruby|php|java|go|dotnet|beam\.smp|uvicorn|gunicorn|hugo|caddy|air)$/i;
const SHELLS = new Set(['zsh', 'bash', 'sh', 'fish', 'dash', 'tcsh', 'nu', 'login', 'sshd', 'launchd']);
export const AGENTS = new Set(['claude', 'codex']);
const IGNORED_HOME_DIRS = ['/.vscode', '/.cursor', '/Library', '/.codex/packages'];
// Dev server environments may hold credentials. Never widen this to a dump.
const ENV_KEYS = ['TERM_PROGRAM', 'ITERM_SESSION_ID', 'WARP_FOCUS_URL', 'TMUX', 'TMUX_PANE', 'VSCODE_PID',
  '__CFBundleIdentifier', 'CLAUDE_CODE_SESSION_ID', 'CLAUDE_CODE_ENTRYPOINT', 'CODEX_THREAD_ID',
  'CODEX_INTERNAL_ORIGINATOR_OVERRIDE', 'T3CODE_WORKTREE_PATH'];

export class Proc {
  constructor(readonly pid: number, readonly ppid: number, readonly tty: string, readonly etime: string, readonly comm: string) {}
  get name(): string { return basename(this.comm).replace(/^-+/, ''); }
  get app(): string | undefined {
    return /^(?:\/System)?(?:\/Users\/[^/]+)?\/Applications\/(?:[^/]+\/)*?([^/]+)\.app\//.exec(this.comm)?.[1];
  }
}
export type ProcessTable = Map<number, Proc>;
export interface Job {
  root: number;
  ports: Set<number>;
  listeners: Map<number, number[]>;
  cwd: string;
  args: string;
  env: Record<string, string>;
  chain: Proc[];
  orphan: boolean;
  origin: string;
  jump: { description: string; commands: string[][]; clipboard?: string };
  listenerArgs: Map<number, string>;
}

export function procTable(): ProcessTable {
  const table: ProcessTable = new Map();
  for (const line of run(['ps', '-axo', 'pid=,ppid=,tty=,etime=,comm=']).split('\n')) {
    const parts = /^\s*(\d+)\s+(\d+)\s+(\S+)\s+(\S+)\s+(.+)$/.exec(line);
    if (!parts) continue;
    const [, pid, ppid, tty, etime, comm] = parts;
    if (pid && ppid && tty && etime && comm) table.set(Number(pid), new Proc(Number(pid), Number(ppid), tty, etime, comm));
  }
  return table;
}

export function ancestors(pid: number, table: ProcessTable): Proc[] {
  const result: Proc[] = [];
  const seen = new Set([pid]);
  let current = table.get(pid);
  while (current) {
    const parent = table.get(current.ppid);
    if (!parent || seen.has(parent.pid)) break;
    seen.add(parent.pid);
    result.push(parent);
    current = parent;
  }
  return result;
}

function isBoundary(proc: Proc): boolean {
  return proc.pid <= 1 || SHELLS.has(proc.name) || AGENTS.has(proc.name) || proc.name === 'tmux' || !!proc.app;
}
function jobRoot(pid: number, table: ProcessTable): number {
  let root = pid;
  const seen = new Set([pid]);
  while (true) {
    const current = table.get(root);
    const parent = current && table.get(current.ppid);
    if (!parent || seen.has(parent.pid) || isBoundary(parent)) return root;
    root = parent.pid;
    seen.add(root);
  }
}
function isDev(proc: Proc): boolean {
  return !proc.app && (RUNTIMES.test(proc.name) || (proc.comm.startsWith(HOME) && !IGNORED_HOME_DIRS.some(path => proc.comm.startsWith(HOME + path))));
}

function lsofFields(command: string[]): Map<number, string[]> {
  const result = new Map<number, string[]>();
  let pid: number | undefined;
  for (const line of run(command).split('\n')) {
    if (/^p\d+$/.test(line)) pid = Number(line.slice(1));
    else if (line.startsWith('n') && pid) {
      const values = result.get(pid) ?? [];
      values.push(line.slice(1));
      result.set(pid, values);
    }
  }
  return result;
}
function psValues(command: string[]): Map<number, string> {
  const result = new Map<number, string>();
  for (const line of run(command).split('\n')) {
    const parts = /^\s*(\d+)\s+(.*)$/.exec(line);
    if (parts?.[1]) result.set(Number(parts[1]), (parts[2] ?? '').trim());
  }
  return result;
}

export function collect(showAll = false): { jobs: Job[]; table: ProcessTable } {
  const table = procTable();
  const jobs = new Map<number, Job>();
  for (const [pid, names] of lsofFields(['lsof', '-nP', '-iTCP', '-sTCP:LISTEN', '-Fpn'])) {
    const proc = table.get(pid);
    if (!proc || (!showAll && !isDev(proc))) continue;
    const ports = new Set(names.map(name => Number(name.slice(name.lastIndexOf(':') + 1))));
    const root = jobRoot(pid, table);
    let job = jobs.get(root);
    if (!job) {
      job = { root, ports: new Set(), listeners: new Map(), cwd: '', args: '', env: {}, chain: [], orphan: false,
        origin: '', jump: { description: '', commands: [] }, listenerArgs: new Map() };
      jobs.set(root, job);
    }
    for (const port of ports) job.ports.add(port);
    job.listeners.set(pid, [...ports].sort((a, b) => a - b));
  }
  if (!jobs.size) return { jobs: [], table };
  const roots = [...jobs.keys()];
  const pids = [...roots, ...[...jobs.values()].flatMap(job => [...job.listeners.keys()])].join(',');
  const cwdMap = lsofFields(['lsof', '-a', '-d', 'cwd', '-p', pids, '-Fpn']);
  const argsMap = psValues(['ps', '-ww', '-o', 'pid=,args=', '-p', pids]);
  const envMap = psValues(['ps', '-wwE', '-o', 'pid=,command=', '-p', roots.join(',')]);
  for (const job of jobs.values()) {
    const root = table.get(job.root);
    if (!root) continue;
    const firstListener = Math.min(...job.listeners.keys());
    job.cwd = cwdMap.get(firstListener)?.at(-1) || cwdMap.get(job.root)?.at(-1) || '';
    job.args = argsMap.get(job.root) ?? root.comm;
    for (const key of ENV_KEYS) {
      const match = new RegExp(`(?:^|\\s)${key}=(\\S*)`).exec(envMap.get(job.root) ?? '');
      if (match) job.env[key] = match[1] ?? '';
    }
    job.chain = ancestors(job.root, table);
    job.orphan = root.ppid === 1 && !root.app;
    for (const listener of job.listeners.keys()) job.listenerArgs.set(listener, argsMap.get(listener) ?? '');
    classify(job, table);
  }
  return { jobs: [...jobs.values()].sort((a, b) => Math.min(...a.ports) - Math.min(...b.ports)), table };
}

export function find(jobs: Job[], selector: string): Job | undefined {
  const digits = selector.replace(/^:+/, '');
  if (!/^\d+$/.test(digits)) return undefined;
  const n = Number(digits);
  return jobs.find(job => job.ports.has(n)) ?? jobs.find(job => job.root === n || job.listeners.has(n));
}
export const byRoot = (jobs: Job[], key: string): Job | undefined => /^\d+$/.test(key) ? jobs.find(job => job.root === Number(key)) : undefined;

export function subtree(root: number, table: ProcessTable): number[] {
  const children = new Map<number, number[]>();
  for (const proc of table.values()) {
    const siblings = children.get(proc.ppid) ?? [];
    siblings.push(proc.pid);
    children.set(proc.ppid, siblings);
  }
  const result: number[] = [], stack = [root], seen = new Set<number>();
  while (stack.length) {
    const pid = stack.pop();
    if (pid === undefined || seen.has(pid)) continue;
    seen.add(pid);
    result.push(pid);
    stack.push(...children.get(pid) ?? []);
  }
  return result;
}
