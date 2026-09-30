# devps architecture

devps is written in TypeScript and compiled to JavaScript for Node 22 or newer. It uses the Node standard library and has no runtime npm dependencies. Each run takes a fresh snapshot of the machine with `lsof` and `ps`, groups listening processes into jobs, labels where each job came from, and then lists, focuses, or stops those jobs. devps keeps no state between runs.

The source separates process discovery and grouping (`src/processes.ts`), origin and jump plans (`src/origin.ts`), table and preview output (`src/presentation.ts`), actions and stop safeguards (`src/actions.ts`), subprocess support (`src/system.ts`), and command routing with the picker (`src/cli.ts`).

```
lsof (listening TCP ports) ─┐
ps   (process table)        ├─> filter dev runtimes ─> group into jobs ─> classify origin ─> ls / picker / jump / open / stop
ps -E (allowlisted env keys)┘
```

## Snapshot

devps reads the system with five commands. It runs each as one batched call, not one call per process.

| Command | What devps takes from it |
| --- | --- |
| `ps -axo pid=,ppid=,tty=,etime=,comm=` | The full process table: parent links, terminal, age, and executable path |
| `lsof -nP -iTCP -sTCP:LISTEN -Fpn` | Each process that listens on a TCP port, and its ports. IPv4 and IPv6 rows for one port merge into one. |
| `lsof -a -d cwd -p <pids> -Fpn` | The working directory of each job root and listener |
| `ps -ww -o pid=,args= -p <pids>` | The command arguments of each job root and listener |
| `ps -wwE -o pid=,command= -p <roots>` | The environment of each job root, filtered to the allowlist in [Origin](#origin) |

A failed `ps` or `lsof` call stops devps with the tool's error. Exit code 1 with no error output means "nothing matched" and is not a failure.

## Dev server filter

devps lists a listening process only when both conditions are true:

1. **It is not a GUI app.** Its executable path is not inside an `.app` bundle under `/Applications`, `/System/Applications`, or `~/Applications`, including subfolders such as `Utilities/`. This excludes Chrome, VS Code helpers, Raycast, Control Center, and Electron apps.
2. **It is a dev runtime or a binary under your home folder.** The executable name matches `RUNTIMES` (for example `node`, `bun`, `deno`, `python3`, `ruby`, `java`, `go`, `uvicorn`), case-insensitively. Otherwise, its path starts with `$HOME`, except for editor and agent internals in `~/.vscode`, `~/.cursor`, `~/Library`, and `~/.codex/packages`.

The bundle check uses installed app folders only. Homebrew Python runs from `.../Python.framework/.../Python.app`, and an Electron dev build runs from a project folder. Both count as dev processes.

`devps --all` skips the filter and lists every listener.

Known gaps:

- A compiled server outside `$HOME` is hidden, for example a `go run` binary in the temp folder or a Homebrew `postgres`. Use `--all` to see it.
- Container ports are expected to be hidden, because the forwarding process (the Docker Desktop app, or Colima's `limactl`) fails both conditions. This is not tested.

## Jobs

A **job** is one launched command and all its children. `pnpm dev` that starts two vite servers is one job with two ports.

devps finds each listener's **job root**. It walks up the parent chain and stops below the first **boundary** process:

- a shell (`zsh`, `bash`, `sh`, `fish`, and similar)
- an agent (`claude`, `codex`)
- `tmux`, `launchd`, or PID 1
- a GUI app

For example, `zsh → node pnpm → node vite → node vite` has its root at `node pnpm`. Listeners with the same root form one job.

A job is **orphaned** when its root's parent is PID 1. This happens when the terminal or agent that started it has ended. devps shows the age of the root, so long-lived orphans stand out.

## Origin

devps labels each job with an **agent** layer and a **host** layer, for example `Claude Code d54c9770 · Warp`.

For a live job, devps reads the parent chain above the root:

- **Agent:** the nearest `claude` or `codex` process. A `codex` process with a terminal is the Codex CLI. Without a terminal, it is the Codex app. With `CODEX_INTERNAL_ORIGINATOR_OVERRIDE` set to a VS Code value, it is the Codex VS Code extension.
- **Host:** the nearest GUI app in the chain, such as Warp, iTerm2, Terminal, VS Code, or T3 Code Workbench.

For an orphan, the chain is gone. devps then reads the environment that the root inherited:

- `CODEX_THREAD_ID` or `CLAUDE_CODE_SESSION_ID` names the agent session.
- `__CFBundleIdentifier` names the host app.

Only these keys are read:

`TERM_PROGRAM`, `ITERM_SESSION_ID`, `WARP_FOCUS_URL`, `TMUX`, `TMUX_PANE`, `VSCODE_PID`, `__CFBundleIdentifier`, `CLAUDE_CODE_SESSION_ID`, `CLAUDE_CODE_ENTRYPOINT`, `CODEX_THREAD_ID`, `CODEX_INTERNAL_ORIGINATOR_OVERRIDE`, `T3CODE_WORKTREE_PATH`

Dev server environments often hold tokens. devps never prints, stores, or passes on any other environment value. Keep `ENV_KEYS` as an explicit allowlist.

## Jump

`devps jump` runs the first target that matches, in this order:

| Condition | Action | Precision |
| --- | --- | --- |
| Agent is the Codex app or an orphaned Codex thread | `open -b com.openai.codex` | App only |
| Orphan with no known host | Nothing to focus | None |
| Parent chain has `tmux` and `TMUX_PANE` is set | `tmux switch-client -t <pane>` | Exact pane |
| Host is Warp and `WARP_FOCUS_URL` is set | `open warp://session/<id>` | Exact tab |
| Host is iTerm2 and `ITERM_SESSION_ID` is set | AppleScript selects the session by its unique ID, then `open -b com.googlecode.iterm2` raises the app | Exact tab |
| Host is Terminal and the job has a terminal | AppleScript selects the tab by its terminal device, then `open -b com.apple.Terminal` raises the app | Exact tab |
| Host is VS Code | `open -b com.microsoft.VSCode <git root>` | Window for that folder, not the terminal tab |
| Any other host app | `open -a <app>` | App only |
| Only `__CFBundleIdentifier` is known | `open -b <bundle id>` | App only |

The environment is inherited, so a server that Claude Code started inside Warp carries Warp's `WARP_FOCUS_URL` for the tab where Claude Code runs. That tab is the right target.

The Codex app check comes first because the Codex app-server can inherit the environment of the terminal that launched it. Its jobs can carry a Warp `WARP_FOCUS_URL` that points to an unrelated tab.

When a jump can only focus an app, devps also copies a resume command when it knows the session: `codex resume <id>` or `claude --resume <id>`. A failed jump command stops devps with the command's error.

Codex, Claude, and T3 Code register URL schemes (`codex://`, `claude://`, `t3code-workbench://`). devps does not use them, because their path formats are not documented.

## Stop

`devps kill`, and `ctrl-x` in the picker, stop a whole job:

1. Read the process table again. The picker can be open for minutes, so children or PIDs can change. If the root is gone, or its PID now belongs to a different executable, stop with a message.
2. Collect the root and all its descendants.
3. Remove protected processes: PID 1, any GUI app, and devps itself with all its ancestors. The ancestors include the terminal or agent that runs devps.
4. Show the list and ask for confirmation, unless `-y` is given.
5. Send `SIGTERM` to every process in the list.
6. Wait up to 3 seconds, then send `SIGKILL` to every process that is still alive.

## Commands and selection

`devps ls`, `jump`, `open`, and `kill` take a port or a PID. devps matches a port first, then a job root PID or listener PID.

The picker is `fzf`. Each row carries its job root PID and encoded executable identity in two hidden fields. The preview (`devps _preview <root>`) and the picker actions look up jobs by that root PID only, so a port number that equals another job's PID cannot select the wrong job. `ctrl-r` reloads the rows with `devps _lines`. Actions refresh the jobs after selection to resolve newly reloaded rows. Every stop compares the displayed row's executable identity against a fresh process table before signaling it, including rows introduced by a reload.

Without `fzf`, or without a terminal on standard input, `devps` prints the `ls` table.

## Platform

devps runs on macOS only. It depends on the macOS forms of `ps -E` and `lsof`, and on `open`, `osascript`, and `pbcopy`.

On GitHub-hosted macOS runners, `lsof` shows no sockets unless it runs as root. CI runs `test/smoke.sh` with `sudo`.
