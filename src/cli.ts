#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { byRoot, collect, find, type Job, type ProcessTable } from './processes.js';
import { dim, preview, rows } from './presentation.js';
import { closeInput, jump, openBrowser, prompt, stop } from './actions.js';
import { shellQuote, which } from './system.js';

const HELP = `devps: list local dev servers, show where they came from, jump to them, or stop them.

Usage:
  devps                          interactive picker (fzf)
  devps ls                       plain table
  devps jump <port|pid>          focus the terminal, editor, or agent app that started it
  devps open <port|pid>          open http://localhost:<port> in the browser
  devps kill <port|pid>... [-y]  stop the whole job (runner and children)
  devps --version
  --all                          include every TCP listener, not only dev runtimes`;

function ls(showAll: boolean): void {
  const { jobs, table } = collect(showAll);
  if (!jobs.length) { console.log('No dev servers running.'); return; }
  const { header, lines } = rows(jobs, table);
  console.log(header);
  console.log(lines.join('\n'));
}

function pickerInput(jobs: Job[], table: ProcessTable): string {
  const { header, lines } = rows(jobs, table);
  // Both hidden fields travel with refreshed rows, so stops retain the displayed executable identity.
  return [`0\t\t${header}`, ...jobs.map((job, index) => `${job.root}\t${Buffer.from(table.get(job.root)?.comm ?? '').toString('base64url')}\t${lines[index]}`)].join('\n');
}

async function ui(showAll: boolean): Promise<void> {
  if (!which('fzf') || !process.stdin.isTTY) return ls(showAll);
  const self = `DEVPS_COLOR=1 ${shellQuote(process.execPath)} ${shellQuote(fileURLToPath(import.meta.url))}${showAll ? ' --all' : ''}`;
  while (true) {
    const { jobs, table } = collect(showAll);
    if (!jobs.length) { console.log('No dev servers running.'); return; }
    const input = pickerInput(jobs, table);
    const result = spawnSync('fzf', [
      '--ansi', '--multi', '--layout=reverse', '--height=90%', '--no-sort',
      '--delimiter=\t', '--with-nth=3..', '--header-lines=1',
      '--header=enter jump  ·  ctrl-o browser  ·  ctrl-x stop  ·  tab multi-select  ·  ctrl-r refresh  ·  pgup/pgdn details',
      '--expect=enter,ctrl-o,ctrl-x', '--preview', `${self} _preview {1}`, '--preview-window=down,50%,wrap',
      '--bind', `ctrl-r:reload(${self} _lines)`,
      '--bind', 'pgup:preview-page-up,pgdn:preview-page-down',
    ], { input, encoding: 'utf8', stdio: ['pipe', 'pipe', 'inherit'], env: { ...process.env, DEVPS_COLOR: '1' } });
    if (result.error) throw new Error(`devps: fzf failed: ${result.error.message}`);
    const output = result.stdout.trimEnd().split('\n');
    if (result.status !== 0 || output.length < 2) return;
    const key = output[0];
    // Reloaded rows must resolve against a fresh snapshot, still by root PID only.
    const current = collect(showAll);
    const picked = output.slice(1).flatMap(line => {
      const [root = '', identity = ''] = line.split('\t');
      const job = byRoot(current.jobs, root);
      return job ? [{ job, expectedComm: Buffer.from(identity, 'base64url').toString('utf8') }] : [];
    });
    if (!picked.length) return;
    if (key === 'ctrl-x') {
      for (const selected of picked) await stop(selected);
      await prompt(dim('press enter to go back'));
      continue;
    }
    if (key === 'ctrl-o') { for (const { job } of picked) openBrowser(job); return; }
    if (picked[0]) jump(picked[0].job);
    return;
  }
}

async function main(argv: string[]): Promise<void> {
  const showAll = argv.includes('--all'), yes = argv.includes('-y') || argv.includes('--yes');
  argv = argv.filter(arg => !['--all', '-y', '--yes'].includes(arg));
  const [command = 'ui', ...selectors] = argv;
  if (command === '-V' || command === '--version') {
    const packageInfo: unknown = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
    if (!packageInfo || typeof packageInfo !== 'object' || !('version' in packageInfo) || typeof packageInfo.version !== 'string') throw new Error('devps: missing package version');
    console.log(packageInfo.version); return;
  }
  if (['-h', '--help', 'help'].includes(command)) { console.log(HELP); return; }
  if (command === 'ui') return ui(showAll);
  if (command === 'ls') return ls(showAll);
  if (command === '_lines') {
    const { jobs, table } = collect(showAll);
    console.log(pickerInput(jobs, table)); return;
  }
  if (['_preview', 'jump', 'open', 'kill', 'stop'].includes(command)) {
    if (!selectors.length) throw new Error(`devps ${command}: give a port or pid`);
    const { jobs, table } = collect(showAll);
    for (const selector of selectors) {
      const job = command === '_preview' ? byRoot(jobs, selector) : find(jobs, selector);
      if (!job) { console.error(`devps: no dev server matches ${selector}`); continue; }
      if (command === '_preview') preview(job, table);
      else if (command === 'jump') jump(job);
      else if (command === 'open') openBrowser(job);
      else await stop({ job, expectedComm: table.get(job.root)?.comm, yes });
    }
    return;
  }
  throw new Error(`devps: unknown command '${command}'. Try devps --help`);
}

main(process.argv.slice(2)).catch(error => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}).finally(closeInput);
