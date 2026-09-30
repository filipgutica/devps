#!/usr/bin/env node
import { appendFileSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { basename } from 'node:path';
import { spawnSync } from 'node:child_process';

const command = basename(process.argv[1]);
const args = process.argv.slice(2);
const fixture = JSON.parse(process.env.DEVPS_FIXTURE);
if (command === 'ps') {
  if (args.includes('-axo')) {
    const countPath = process.env.DEVPS_CALLS;
    const calls = existsSync(countPath) ? Number(readFileSync(countPath, 'utf8')) : 0;
    writeFileSync(countPath, String(calls + 1));
    const table = calls >= 3 && fixture.reused ? fixture.reused : calls && fixture.refresh ? fixture.refresh : fixture.table;
    console.log(table.replaceAll('$SELF', String(process.ppid)));
  } else if (args.includes('-wwE')) process.stdout.write(fixture.env ?? '');
  else process.stdout.write(fixture.args ?? '');
} else if (command === 'lsof') {
  process.stdout.write(args.includes('cwd') ? fixture.cwd ?? '' : fixture.listeners ?? '');
} else if (command === 'git') {
  if (fixture.git) console.log(args.includes('--git-common-dir') ? '/repo/.git' : '/repo');
  else process.exitCode = 1;
} else if (command === 'fzf') {
  if (fixture.stopRoots || fixture.pickKey === 'ctrl-x') {
    const countPath = process.env.DEVPS_FZF_CALLS;
    const calls = existsSync(countPath) ? Number(readFileSync(countPath, 'utf8')) : 0;
    writeFileSync(countPath, String(calls + 1));
    appendFileSync(process.env.DEVPS_ACTIONS, JSON.stringify({ command, call: calls + 1 }) + '\n');
    if (calls) process.exit(130);
    if (fixture.stopRoots) {
      const rows = readFileSync(0, 'utf8').split('\n');
      console.log('ctrl-x\n' + fixture.stopRoots.map(root => rows.find(row => row.startsWith(root + '\t'))).join('\n'));
      process.exit(0);
    }
  }
  const bind = args[args.indexOf('--bind') + 1];
  const reload = bind.slice('ctrl-r:reload('.length, -1);
  const result = spawnSync('/bin/sh', ['-c', reload], { encoding: 'utf8' });
  if (result.status) { process.stderr.write(result.stderr); process.exit(result.status); }
  const row = result.stdout.split('\n').find(line => line.startsWith(fixture.pickRoot + '\t'));
  if (!row) throw new Error('reloaded row missing');
  const preview = args[args.indexOf('--preview') + 1].replace('{1}', String(fixture.pickRoot));
  const detail = spawnSync('/bin/sh', ['-c', preview], { encoding: 'utf8' });
  appendFileSync(process.env.DEVPS_ACTIONS, JSON.stringify({ command, row, preview: detail.stdout }) + '\n');
  console.log((fixture.pickKey ?? 'ctrl-o') + '\n' + row);
} else {
  const input = command === 'pbcopy' ? readFileSync(0, 'utf8') : '';
  appendFileSync(process.env.DEVPS_ACTIONS, JSON.stringify({ command, args, input }) + '\n');
}
