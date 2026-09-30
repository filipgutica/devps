import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { closeSync, mkdtempSync, openSync, readFileSync, rmSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { delimiter, resolve } from 'node:path';
import { test } from 'node:test';

const fixtureCommand = resolve('test/fixtures/command.mjs');
const entry = resolve(process.env.DEVPS ?? 'dist/cli.js');
const base = {
  table: '1 0 ?? 01:00 /sbin/launchd\n100 1 ?? 01:00 /Applications/Warp.app/Contents/MacOS/stable\n101 100 ttys001 01:00 /bin/zsh\n200 101 ttys001 01:00 /opt/homebrew/bin/node\n201 200 ttys001 01:00 /opt/homebrew/bin/node\n202 200 ttys001 01:00 /opt/homebrew/bin/node',
  listeners: 'p201\nn*:5173\nn[::1]:5173\np202\nn*:8080',
  cwd: 'p201\nn/repo\np202\nn/repo',
  args: '200 /opt/homebrew/bin/node /repo/pnpm.cjs dev\n201 node /repo/vite.js\n202 node /repo/server.mjs',
  env: '200 node WARP_FOCUS_URL=warp://session/exact API_TOKEN=never-show-this',
};

function cli(args, fixture = base, input = '', tty = false) {
  const directory = mkdtempSync(resolve(tmpdir(), 'devps-contract-'));
  const terminalInput = tty ? openSync('/dev/null', 'r') : undefined;
  try {
    for (const command of ['ps', 'lsof', 'git', 'open', 'osascript', 'pbcopy', 'tmux', 'fzf']) {
      symlinkSync(fixtureCommand, resolve(directory, command));
    }
    const result = spawnSync(tty ? '/usr/bin/script' : entry, tty ? ['-q', '/dev/null', entry, ...args] : args, {
      encoding: 'utf8', timeout: 10000, ...(tty ? { stdio: [terminalInput, 'pipe', 'pipe'] } : { input }),
      env: { ...process.env, DEVPS_COLOR: fixture.color ?? '0', PATH: directory + delimiter + process.env.PATH,
        DEVPS_FIXTURE: JSON.stringify(fixture), DEVPS_CALLS: resolve(directory, 'calls'), DEVPS_ACTIONS: resolve(directory, 'actions') },
    });
    assert.ifError(result.error);
    let actions = [];
    try { actions = readFileSync(resolve(directory, 'actions'), 'utf8').trim().split('\n').map(JSON.parse); }
    catch (error) { if (error.code !== 'ENOENT') throw error; }
    return { ...result, actions };
  } finally {
    if (terminalInput !== undefined) closeSync(terminalInput);
    rmSync(directory, { recursive: true, force: true });
  }
}

test('list groups child listeners under their runner and deduplicates IPv4/IPv6 ports', () => {
  const result = cli(['ls']);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout.trim().split('\n').length, 2);
  assert.match(result.stdout, /:5173 :8080\s+\/repo\s+pnpm dev\s+Warp ttys001\s+1m\s+200/);
  assert.doesNotMatch(result.stdout, /never-show-this/);
});

test('preview resolves only the root PID and displays allowlisted origin hints', () => {
  const fixture = { ...base, listeners: base.listeners + '\np202\nn*:200' };
  const result = cli(['_preview', '200'], fixture);
  assert.match(result.stdout, /:200 :5173 :8080/);
  assert.match(result.stdout, /201 :5173\s+vite/);
  assert.match(result.stdout, /WARP_FOCUS_URL=warp:\/\/session\/exact/);
  assert.doesNotMatch(result.stdout, /API_TOKEN|never-show-this/);
  assert.match(cli(['_preview', '201'], fixture).stderr, /no dev server matches 201/);
});

test('default filter excludes installed GUI helpers and editor internals; --all includes them', () => {
  const fixture = { table: `1 0 ?? 01:00 /sbin/launchd\n301 1 ?? 01:00 /Applications/Visual Studio Code.app/Contents/Frameworks/Code Helper.app/Contents/MacOS/Code Helper\n302 1 ?? 01:00 ${process.env.HOME}/.vscode/server\n303 1 ?? 01:00 ${process.env.HOME}/code/my-server`, listeners: 'p301\nn*:6001\np302\nn*:6002\np303\nn*:6003' };
  assert.doesNotMatch(cli(['ls'], fixture).stdout, /:6001|:6002/);
  assert.match(cli(['ls'], fixture).stdout, /:6003/);
  assert.match(cli(['ls', '--all'], fixture).stdout, /:6001/);
});

test('jump selects the exact Warp tab and gives ports priority over PIDs', () => {
  const fixture = { ...base, table: base.table + '\n5173 101 ttys001 01:00 /opt/homebrew/bin/node', listeners: base.listeners + '\np5173\nn*:6000' };
  const result = cli(['jump', ':5173'], fixture);
  assert.deepEqual(result.actions, [{ command: 'open', args: ['warp://session/exact'], input: '' }]);
});

test('orphaned Codex thread focuses Codex despite inherited Warp hints and copies resume command', () => {
  const fixture = { ...base, table: '1 0 ?? 01:00 /sbin/launchd\n200 1 ?? 01:00 /opt/homebrew/bin/node\n201 200 ?? 01:00 /opt/homebrew/bin/node', listeners: 'p201\nn*:5173', env: '200 node CODEX_THREAD_ID=thread-exact __CFBundleIdentifier=dev.warp.Warp-Stable WARP_FOCUS_URL=warp://session/wrong' };
  const result = cli(['jump', '5173'], fixture);
  assert.deepEqual(result.actions, [{ command: 'open', args: ['-b', 'com.openai.codex'], input: '' }, { command: 'pbcopy', args: [], input: 'codex resume thread-exact' }]);
  assert.match(cli(['_preview', '200'], fixture).stdout, /orphaned, was Codex thread thread-e · Warp/);
});

test('stop rejects an executable changed since collection and protects GUI roots and its own ancestry', () => {
  // These synthetic PIDs cannot name a macOS process, even if a protection regresses.
  const root = 2147483646, child = 2147483645;
  const safeTable = `1 0 ?? 01:00 /sbin/launchd\n101 1 ttys001 01:00 /bin/zsh\n${root} 101 ttys001 01:00 /opt/homebrew/bin/node\n${child} ${root} ttys001 01:00 /opt/homebrew/bin/node`;
  const reused = cli(['kill', '5173', '-y'], { table: safeTable, listeners: `p${child}\nn*:5173`, refresh: safeTable.replace(`${root} 101 ttys001 01:00 /opt/homebrew/bin/node`, `${root} 101 ttys001 01:00 /other`) });
  assert.match(reused.stdout, /PID was reused/);
  for (const comm of ['/Applications/App.app/Contents/MacOS/App', '/bin/zsh']) {
    const parent = comm === '/bin/zsh' ? root : 1;
    const fixture = { table: `1 0 ?? 01:00 /sbin/launchd\n${root} 1 ?? 01:00 ${comm}\n$SELF ${parent} ?? 01:00 node`, listeners: `p${root}\nn*:5173` };
    assert.match(cli(['kill', '5173', '-y', '--all'], fixture).stdout, /Nothing safe to stop/);
  }
});

test('stop confirmation defaults to keeping the job alive', () => {
  assert.match(cli(['kill', '5173'], base, '\n').stdout, /Skipped\./);
});

test('command errors are explicit and selectors are required', () => {
  assert.equal(cli(['jump']).status, 1);
  assert.match(cli(['jump']).stderr, /give a port or pid/);
  assert.equal(cli(['nonsense']).status, 1);
  assert.match(cli(['nonsense']).stderr, /unknown command/);
});

test('plain rows align by Unicode characters and explicit color retains the existing ANSI palette', () => {
  const fixture = { ...base, table: base.table + '\n300 101 ttys001 01:00 /opt/homebrew/bin/node', listeners: base.listeners + '\np300\nn*:6000', cwd: base.cwd + '\np300\nn/repo/🧪' };
  const lines = cli(['_lines'], fixture).stdout.trimEnd().split('\n').map(line => [...line.split('\t').slice(2).join('\t')]);
  const header = lines[0].join('');
  const commandColumn = header.indexOf('COMMAND');
  for (const line of lines.slice(1)) assert.equal(line.slice(commandColumn).join('').startsWith('pnpm dev') || line.slice(commandColumn).join('').startsWith('node'), true);
  const color = cli(['ls'], { ...base, color: '1' }).stdout;
  assert.match(color, /\x1b\[1m\x1b\[32m:5173 :8080/);
  assert.match(color, /\x1b\[36m\/repo/);
  assert.doesNotMatch(cli(['ls']).stdout, /\x1b\[/);
});

test('picker preview and action resolve a new job after ctrl-r reload', () => {
  const fixture = { ...base, refresh: base.table + '\n300 101 ttys001 01:00 /opt/homebrew/bin/node\n301 300 ttys001 01:00 /opt/homebrew/bin/node', listeners: base.listeners + '\np301\nn*:6000', pickRoot: 300 };
  const result = cli([], fixture, '', true);
  assert.equal(result.status, 0, result.stdout + result.stderr);
  const picker = result.actions.find(action => action.command === 'fzf');
  assert.match(picker.preview, /:6000/);
  assert.match(picker.row, /^300\t/);
  assert.deepEqual(result.actions.filter(action => action.command === 'open'), [{ command: 'open', args: ['http://localhost:6000'], input: '' }]);
});

async function interactiveCli(fixture, interact) {
  const directory = mkdtempSync(resolve(tmpdir(), 'devps-picker-input-'));
  for (const command of ['ps', 'lsof', 'git', 'fzf']) symlinkSync(fixtureCommand, resolve(directory, command));
  // cat gives script a regular pipe: macOS script rejects Node's socket-backed stdin pipe.
  const child = spawn('/bin/sh', ['-c', 'cat | /usr/bin/script -q /dev/null "$1"', 'devps-input-test', entry], {
    env: { ...process.env, DEVPS_COLOR: '0', PATH: directory + delimiter + process.env.PATH,
      DEVPS_FIXTURE: JSON.stringify(fixture), DEVPS_CALLS: resolve(directory, 'calls'),
      DEVPS_FZF_CALLS: resolve(directory, 'fzf-calls'), DEVPS_ACTIONS: resolve(directory, 'actions') },
  });
  let output = '';
  const updates = new Set();
  child.stdout.on('data', data => { output += data; for (const update of updates) update(); });
  child.stderr.on('data', data => { output += data; for (const update of updates) update(); });
  const finished = new Promise(resolve => child.on('close', code => resolve(code)));
  const waitFor = (pattern, count = 1) => new Promise((resolve, reject) => {
    const timer = setTimeout(() => { updates.delete(check); reject(new Error(`Timed out waiting for ${pattern}: ${output}`)); }, 5000);
    const check = () => {
      if ((output.match(pattern) ?? []).length >= count) { clearTimeout(timer); updates.delete(check); resolve(); }
    };
    updates.add(check);
    check();
  });
  try {
    await interact({ child, waitFor, output: () => output, directory });
    child.stdin.end();
    const exitTimeout = setTimeout(() => child.kill(), 5000);
    const status = await finished;
    clearTimeout(exitTimeout);
    return { status, stdout: output, pickerCalls: readFileSync(resolve(directory, 'fzf-calls'), 'utf8') };
  } finally {
    child.stdin.destroy();
    child.kill();
    rmSync(directory, { recursive: true, force: true });
  }
}

test('picker accepts sequential stop confirmations and waits for enter before returning', async () => {
  const first = 2147483646, second = 2147483645;
  const fixture = { table: `1 0 ?? 01:00 /sbin/launchd\n101 1 ttys001 01:00 /bin/zsh\n${first} 101 ttys001 01:00 node\n${second} 101 ttys001 01:00 node`, listeners: `p${first}\nn*:5173\np${second}\nn*:6000`, stopRoots: [first, second] };
  const result = await interactiveCli(fixture, async ({ child, waitFor, output, directory }) => {
    await waitFor(/Proceed\? \[y\/N\]/g);
    child.stdin.write('\n');
    await waitFor(/Proceed\? \[y\/N\]/g, 2);
    assert.match(output(), /Skipped\./);
    child.stdin.write('y\n');
    await waitFor(/press enter to go back/g);
    assert.match(output(), /Stopped\./);
    assert.equal(readFileSync(resolve(directory, 'fzf-calls'), 'utf8'), '1');
    child.stdin.write('\n');
  });
  assert.equal(result.status, 0, result.stdout);
  assert.equal(result.pickerCalls, '2');
  assert.doesNotMatch(result.stdout, /EAGAIN/);
});

test('picker stop rejects a new root whose executable changed after ctrl-r displayed it', async () => {
  const root = 2147483646;
  const displayed = base.table + `\n${root} 101 ttys001 01:00 /opt/homebrew/bin/bun`;
  const fixture = { ...base, refresh: displayed, reused: displayed.replace('/opt/homebrew/bin/bun', '/opt/homebrew/bin/node'), listeners: base.listeners + `\np${root}\nn*:6000`, pickRoot: root, pickKey: 'ctrl-x' };
  const result = await interactiveCli(fixture, async ({ child, waitFor, output }) => {
    await waitFor(/PID was reused|Proceed\?/g);
    assert.match(output(), /PID was reused/);
    assert.doesNotMatch(output(), /Proceed\?|Stopped\./);
    await waitFor(/press enter to go back/g);
    child.stdin.write('\n');
  });
  assert.equal(result.status, 0, result.stdout);
  assert.equal(result.pickerCalls, '2');
});
