# devps

Find local dev servers, see what started them, and jump back to their terminal or app.

[![Release](https://img.shields.io/github/v/release/filipgutica/devps?color=2563eb)](https://github.com/filipgutica/devps/releases)
[![CI](https://github.com/filipgutica/devps/actions/workflows/ci.yml/badge.svg)](https://github.com/filipgutica/devps/actions/workflows/ci.yml)
[![Python](https://img.shields.io/badge/Python-000000?logo=python)](devps)
[![macOS](https://img.shields.io/badge/platform-macOS-555555)](docs/ARCHITECTURE.md#platform)
[![MIT licensed](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

**[Website](https://filipgutica.github.io/devps/)** · **[Quick start](#quick-start)** · **[Commands](#commands)** · **[Architecture](docs/ARCHITECTURE.md)**

devps is `ps` for dev servers. It groups a runner and its child servers into one row, with ports, project, origin, and age.
Use it to find a forgotten server, open its localhost URL, or stop the whole job.

```text
PORTS         PROJECT                          COMMAND         ORIGIN                                 AGE
:4174 :8080   shop [feature-cart] apps/web     pnpm dev        VS Code terminal ttys023               45m
:5173         docs                             vite            Claude Code 3f9a1c2e · Warp            2h
:6006 :9229   shop apps/storybook              storybook dev   ⚠ orphaned, was Codex thread 01a07b5e  23d
```

## Quick start

Install with Homebrew on macOS:

```sh
brew install filipgutica/tap/devps
```

List servers or open the interactive picker:

```sh
devps ls
devps
```

The Homebrew formula installs Python and `fzf`. Without `fzf`, or without a terminal on standard input, devps prints the table instead.

## Commands

```sh
devps                          # interactive picker (fzf)
devps ls                       # plain table
devps jump <port|pid>          # focus the terminal, editor, or agent app that started it
devps open <port|pid>          # open http://localhost:<port>
devps kill <port|pid>... [-y]  # stop the whole job; -y skips confirmation
devps --all                    # include every TCP listener, not only dev runtimes
```

For example, `devps jump 5173` returns to the origin of the server on port 5173.
`devps kill 5173` shows the job's processes and asks before stopping them.
Commands match a port first, then a job root PID or listener PID.

### Picker controls

| Key | Action |
| --- | --- |
| `Enter` | Jump to the selected server's origin |
| `Ctrl+O` | Open its URL in the browser |
| `Ctrl+X` | Stop selected jobs after confirmation |
| `Tab` | Select multiple jobs |
| `Ctrl+R` | Refresh the list |

## How it works

**One row per job.** A `pnpm dev` that starts two Vite servers appears as one row with both ports.
The job root is the topmost process below the shell, agent, or app that launched it.

**Origin.** devps walks the process ancestry to find the terminal, editor, or agent.
For an orphaned job, it uses inherited origin hints from a fixed allowlist, such as `WARP_FOCUS_URL`, `ITERM_SESSION_ID`, `CLAUDE_CODE_SESSION_ID`, and `CODEX_THREAD_ID`.
It does not print, store, or pass on other environment values.

**Jump targets.** Exact tab or pane selection depends on the available origin information.

| Origin | Jump target |
| --- | --- |
| Warp, iTerm2, Terminal, tmux | Tab or pane, when the matching session information is available |
| VS Code | Window for that folder; terminal tab selection is unavailable |
| Codex app, T3 Code Workbench, Claude app | App; copies `codex resume <id>` or `claude --resume <id>` when the session is known |

**Stop.** devps sends `SIGTERM` to the job root and its children.
After three seconds, it sends `SIGKILL` to survivors.
It protects GUI apps, PID 1, and the terminal or agent that runs devps.
Before stopping a job, it refreshes the process table and rejects a root PID that now belongs to a different executable.

See [the architecture guide](docs/ARCHITECTURE.md) for process grouping, origin detection, and jump behavior.

## Current limits

- devps supports macOS only. It uses macOS `ps`, `lsof`, `open`, `osascript`, and `pbcopy`.
- The default filter can hide compiled servers outside your home directory. Use `--all` to include every TCP listener.
- Some origins support app focus only. devps cannot always return to an exact terminal tab or agent conversation.

## Development and releases

Run the smoke test from a checkout:

```sh
test/smoke.sh   # starts a throwaway server, lists it, stops it
```

Releases use Release Please with Conventional Commit PR titles: `fix:` creates a patch release; `feat:` creates a minor release.

## License

devps is available under the [MIT License](LICENSE).
