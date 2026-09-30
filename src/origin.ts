import { AGENTS, type Job, type ProcessTable } from './processes.js';
import { git, isDirectory } from './system.js';

export const APP_NAMES: Record<string, string> = { iTerm: 'iTerm2', 'Visual Studio Code': 'VS Code', ChatGPT: 'Codex app', stable: 'Warp' };
const BUNDLE_NAMES: Record<string, string> = {
  'dev.warp.Warp-Stable': 'Warp', 'com.googlecode.iterm2': 'iTerm2', 'com.apple.Terminal': 'Terminal',
  'com.microsoft.VSCode': 'VS Code', 'com.openai.codex': 'Codex app',
  'com.anthropic.claudefordesktop': 'Claude app', 'com.filipgutica.t3code.workbench': 'T3 Code Workbench',
};
const osa = (script: string): string[] => ['osascript', '-e', script];

export function classify(job: Job, table: ProcessTable): void {
  const { env, chain } = job;
  const appProc = chain.find(proc => proc.app);
  const agent = chain.find(proc => AGENTS.has(proc.name));
  const rootTty = table.get(job.root)?.tty;
  const tty = chain.find(proc => proc.tty !== '??')?.tty ?? (rootTty !== '??' ? rootTty : undefined);
  const tmux = chain.some(proc => proc.name === 'tmux');
  let host = appProc?.app ? APP_NAMES[appProc.app] ?? appProc.app : undefined;
  if (!host && job.orphan) host = BUNDLE_NAMES[env.__CFBundleIdentifier ?? ''];
  let agentLabel: string | undefined, sessionHint: string | undefined;
  if (agent?.name === 'claude') {
    agentLabel = 'Claude Code'; sessionHint = env.CLAUDE_CODE_SESSION_ID;
  } else if (agent?.name === 'codex') {
    agentLabel = env.CODEX_INTERNAL_ORIGINATOR_OVERRIDE?.includes('vscode') ? 'Codex (VS Code ext)' : agent.tty !== '??' ? 'Codex CLI' : 'Codex app';
    sessionHint = env.CODEX_THREAD_ID;
  } else if (job.orphan && env.CODEX_THREAD_ID) {
    agentLabel = 'Codex thread'; sessionHint = env.CODEX_THREAD_ID;
  } else if (job.orphan && env.CLAUDE_CODE_SESSION_ID) {
    agentLabel = 'Claude Code session'; sessionHint = env.CLAUDE_CODE_SESSION_ID;
  }
  const parts: string[] = [];
  if (agentLabel) parts.push(agentLabel + (sessionHint ? ` ${sessionHint.slice(0, 8)}` : ''));
  if (host && host !== agentLabel) parts.push(agentLabel || !tty ? host : ['Terminal', 'iTerm2', 'Warp'].includes(host) ? `${host} ${tty}` : `${host} terminal ${tty}`);
  if (tmux) parts.push('tmux');
  if (!parts.length) parts.push(tty ? `terminal ${tty}` : 'unknown');
  job.origin = parts.join(' · ');
  if (job.orphan) job.origin = parts[0] === 'unknown' && parts.length === 1 ? 'orphaned, origin gone' : `orphaned, was ${job.origin}`;

  let clipboard: string | undefined;
  if (sessionHint && (job.orphan || agentLabel === 'Codex app' || agentLabel === 'Codex thread')) {
    clipboard = agentLabel?.includes('Codex') ? `codex resume ${sessionHint}` : `claude --resume ${sessionHint}`;
  }
  const top = isDirectory(job.cwd) ? git(job.cwd, 'rev-parse', '--show-toplevel') : '';
  // Codex's app-server can inherit a terminal's env pointing at an unrelated tab.
  if (agentLabel === 'Codex app' || agentLabel === 'Codex thread') {
    job.jump = { description: `focus Codex app${job.orphan ? ' (thread may be gone)' : ''}`, commands: [['open', '-b', 'com.openai.codex']], clipboard };
  } else if (job.orphan && !host) {
    job.jump = { description: 'origin is gone, nothing to focus', commands: [], clipboard };
  } else if (env.TMUX_PANE && tmux) {
    job.jump = { description: `tmux pane ${env.TMUX_PANE}`, commands: [['tmux', 'switch-client', '-t', env.TMUX_PANE]], clipboard };
  } else if (host === 'Warp' && env.WARP_FOCUS_URL) {
    job.jump = { description: 'Warp tab (exact)', commands: [['open', env.WARP_FOCUS_URL]], clipboard };
  } else if (host === 'iTerm2' && env.ITERM_SESSION_ID) {
    const uid = env.ITERM_SESSION_ID.split(':').at(-1) ?? '';
    job.jump = { description: 'iTerm2 tab (exact)', commands: [osa(
      'tell application "iTerm"\nrepeat with w in windows\nrepeat with t in tabs of w\n' +
      'repeat with s in sessions of t\nif unique id of s is "' + uid + '" then\nselect w\ntell t to select\n' +
      'tell s to select\nreturn\nend if\nend repeat\nend repeat\nend repeat\nend tell'), ['open', '-b', 'com.googlecode.iterm2']], clipboard };
  } else if (host === 'Terminal' && tty) {
    job.jump = { description: 'Terminal tab (exact)', commands: [osa(
      'tell application "Terminal"\nactivate\nrepeat with w in windows\nrepeat with t in tabs of w\n' +
      'if tty of t is "/dev/' + tty + '" then\nset selected of t to true\nset index of w to 1\nreturn\n' +
      'end if\nend repeat\nend repeat\nend tell'), ['open', '-b', 'com.apple.Terminal']], clipboard };
  } else if (host === 'VS Code') {
    job.jump = { description: 'VS Code window for this folder (not the terminal tab)', commands: [['open', '-b', 'com.microsoft.VSCode', top || job.cwd]], clipboard };
  } else if (appProc?.app) {
    job.jump = { description: `focus ${host}`, commands: [['open', '-a', appProc.app]], clipboard };
  } else if (env.__CFBundleIdentifier) {
    job.jump = { description: `focus ${host || env.__CFBundleIdentifier}`, commands: [['open', '-b', env.__CFBundleIdentifier]], clipboard };
  } else job.jump = { description: 'no known target', commands: [], clipboard };
}
