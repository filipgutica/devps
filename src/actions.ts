import { createInterface, type Interface } from 'node:readline';
import { setTimeout } from 'node:timers/promises';
import { ancestors, procTable, subtree, type Job } from './processes.js';
import { bold, cyan, dim, green, portsLabel, projectLabel, yellow } from './presentation.js';
import { execute, which } from './system.js';

let input: { reader: Interface; lines: AsyncIterator<string> } | undefined;

// Keep buffered lines for sequential confirmations, and pause reads while fzf owns the terminal.
export async function prompt(message: string): Promise<string | undefined> {
  process.stdout.write(message);
  if (!input) {
    const reader = createInterface({ input: process.stdin, terminal: false });
    input = { reader, lines: reader[Symbol.asyncIterator]() };
  }
  input.reader.resume();
  const line = await input.lines.next();
  input.reader.pause();
  return line.done ? undefined : line.value;
}

export function closeInput(): void {
  input?.reader.close();
}

function alive(pid: number): boolean {
  try { process.kill(pid, 0); return true; }
  catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ESRCH') return false;
    if (error instanceof Error && 'code' in error && error.code === 'EPERM') return true;
    throw error;
  }
}
function signal(pid: number, value: NodeJS.Signals): void {
  try { process.kill(pid, value); }
  catch (error) {
    if (error instanceof Error && 'code' in error && (error.code === 'ESRCH' || error.code === 'EPERM')) return;
    throw error;
  }
}

export async function stop({ job, expectedComm, yes = false }: { job: Job; expectedComm: string | undefined; yes?: boolean }): Promise<boolean> {
  const table = procTable();
  if (!expectedComm || !table.has(job.root) || table.get(job.root)?.comm !== expectedComm) {
    console.log(yellow(`Job ${job.root} is gone or its PID was reused. Refresh and try again.`));
    return false;
  }
  const protectedPids = new Set([process.pid, ...ancestors(process.pid, table).map(proc => proc.pid)]);
  const pids = subtree(job.root, table).filter(pid => pid > 1 && !protectedPids.has(pid) && !table.get(pid)?.app);
  if (!pids.length) {
    console.log(yellow(`Nothing safe to stop for job ${job.root} (GUI app or own ancestry).`));
    return false;
  }
  console.log(`Stop ${bold(portsLabel(job))} ${cyan(projectLabel(job.cwd))}`);
  console.log(dim(`  ${pids.length} processes: ` + pids.slice(0, 8).map(pid => `${pid} ${table.get(pid)?.name}`).join(', ') + (pids.length > 8 ? ' …' : '')));
  if (!yes) {
    const answer = await prompt('  Proceed? [y/N] ');
    if (answer === undefined) return false;
    if (answer.trim().toLowerCase() !== 'y') { console.log('  Skipped.'); return false; }
  }
  for (const pid of pids) signal(pid, 'SIGTERM');
  const deadline = Date.now() + 3000;
  while (Date.now() < deadline && pids.some(alive)) await setTimeout(100);
  const survivors = pids.filter(alive);
  for (const pid of survivors) signal(pid, 'SIGKILL');
  console.log(green('  Stopped.') + (survivors.length ? dim(` (${survivors.length} needed SIGKILL)`) : ''));
  return true;
}

export function jump(job: Job): void {
  const { description, commands, clipboard } = job.jump;
  for (const command of commands) {
    const result = execute(command);
    if (result.error || result.status !== 0) throw new Error(`devps: could not jump to ${description}: ${result.error?.message || result.stderr.trim() || `${command[0]} exited ${result.status}`}`);
  }
  if (clipboard && which('pbcopy')) execute(['pbcopy'], clipboard);
  console.log(`→ ${description}${clipboard ? `\n  copied: ${bold(clipboard)}` : ''}`);
}

export function openBrowser(job: Job): void {
  for (const port of [...job.ports].sort((a, b) => a - b)) {
    const result = execute(['open', `http://localhost:${port}`]);
    if (result.error) throw new Error(`devps: open failed: ${result.error.message}`);
    // Like the original CLI, open reports its own error without aborting the remaining ports.
    if (result.stderr) process.stderr.write(result.stderr);
    if (result.stdout) process.stdout.write(result.stdout);
  }
}
