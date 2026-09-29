# devps

`ps` for dev servers. See which local dev servers are running, where each one came from, jump to it, or stop it.

```
PORTS         PROJECT                          COMMAND         ORIGIN                                 AGE
:4174 :8080   shop [feature-cart] apps/web     pnpm dev        VS Code terminal ttys023               45m
:5173         docs                             vite            Claude Code 3f9a1c2e · Warp            2h
:6006 :9229   shop apps/storybook              storybook dev   ⚠ orphaned, was Codex thread 01a07b5e  23d
```

macOS only.

## Install

```sh
brew install filipgutica/tap/devps
```

## Use

```sh
devps                          # interactive picker (fzf)
devps ls                       # plain table
devps jump <port|pid>          # focus the terminal, editor, or agent app that started it
devps open <port|pid>          # open http://localhost:<port>
devps kill <port|pid>... [-y]  # stop the whole job
devps --all                    # include every TCP listener, not only dev runtimes
```

Picker keys: `enter` jump, `ctrl-o` open in browser, `ctrl-x` stop (asks first), `tab` multi-select, `ctrl-r` refresh.

## How it works

**One row per job.** A `pnpm dev` that starts two vite servers is one row with both ports. The job root is the topmost process below the shell, agent, or app that launched it.

**Origin.** devps walks the process ancestry to find the terminal, editor, or agent. When the parent is gone (an orphan), it reads a fixed allowlist of environment keys that the process inherited, such as `WARP_FOCUS_URL`, `ITERM_SESSION_ID`, `CLAUDE_CODE_SESSION_ID`, and `CODEX_THREAD_ID`. It never reads or prints any other environment values, because dev server environments often hold tokens.

**Jump targets.**

| Origin | Jump |
| --- | --- |
| Warp, iTerm2, Terminal, tmux | exact tab or pane |
| VS Code | the window for that folder, not the terminal tab |
| Codex app, T3 Code, Claude app | focuses the app and copies `codex resume <id>` or `claude --resume <id>` |

**Stop.** Sends SIGTERM to the job root and all its children, waits up to 3 seconds, then sends SIGKILL to any survivors. It never signals GUI apps, PID 1, or the terminal or agent that runs devps. It re-reads the process table before stopping, so a PID reused while the picker was open is not signalled.

## Development

```sh
test/smoke.sh   # starts a throwaway server, lists it, stops it
```

Releases use release-please with Conventional Commit PR titles: `fix:` bumps patch, `feat:` bumps minor.
