<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { UiCard, UiCodeBlock } from '@filipgutica/ui';
import { UiCapture, UiCommandList, UiSiteHeader, UiSiteNav } from '@filipgutica/ui/site';
import { captures } from './captures';

const enhanced = ref(false);
onMounted(() => {
  enhanced.value = true;
});
const navigation = [
  {
    items: [
      { label: 'Install', href: '#install' },
      { label: 'Commands', href: '#commands-title' },
      { label: 'Keys in the picker', href: '#keys-title' },
      { label: 'Where jump lands', href: '#jump-title' },
      { label: 'Good to know', href: '#limits-title' },
    ],
  },
];
const commands = [
  {
    command: 'devps',
    description: 'Open the interactive picker.',
  },
  {
    command: 'devps ls',
    description: 'Print a plain table.',
  },
  {
    command: 'devps jump 5173',
    description: 'Return to the origin of the server on port 5173.',
  },
  {
    command: 'devps open 5173',
  },
  {
    command: 'devps kill 5173',
  },
  {
    command: 'devps --all',
    description: 'Show every TCP listener, not only dev servers.',
  },
];
const keys = [
  {
    command: '/',
    description: 'Start a search.',
  },
  {
    command: 'q',
    description: 'Quit from browse mode.',
  },
  {
    command: 'Enter',
    description:
      "In browse mode, jump to the selected job's origin. While searching, keep the filter and return to browsing. The header shows the active filter.",
  },
  {
    command: 'Esc',
    description: 'In browse mode, quit. While searching, clear the filter and return to browsing.',
  },
  {
    command: 'Ctrl+O',
    description: 'Open every port of the selected jobs in your browser.',
  },
  {
    command: 'Ctrl+X',
    description: 'Stop the selected jobs after you confirm.',
  },
  {
    command: 'Tab',
    description: 'Select more than one job.',
  },
  {
    command: 'Ctrl+R',
    description: 'Refresh the list.',
  },
  {
    command: 'Ctrl+↑ / Ctrl+↓',
  },
  {
    command: 'Ctrl+C',
    description: 'Quit from either mode.',
  },
];
</script>

<template>
  <a class="fg-site-skip" href="#main">Skip to content</a>
  <div class="fg-site-docs" :data-enhanced="enhanced">
    <UiSiteHeader
      project="devps"
      :links="[
        {
          label: 'GitHub',
          href: 'https://github.com/filipgutica/devps',
        },
        {
          label: 'Releases',
          href: 'https://github.com/filipgutica/devps/releases',
        },
      ]"
    />
    <UiSiteNav label="On this page" :groups="navigation" />
    <main id="main">
      <section class="intro" aria-labelledby="title">
        <h1 id="title">Find and manage local dev servers.</h1>
        <p class="lede">
          devps is <code>ps</code> for dev servers on macOS. It lists the dev servers you have
          running, with their ports, project, and age, and their <em>origin</em>: the terminal,
          editor, or agent that started them. Use it to find a server you forgot, jump back to its
          origin, open it in the browser, or stop it.
        </p>
        <p class="lede">
          devps groups a command such as <code>pnpm dev</code> and the servers it starts into one
          <em>job</em>. If <code>pnpm dev</code> starts two Vite servers, devps shows one row with
          both ports.
        </p>
        <div id="install" class="install-command">
          <p class="hint">Install with Homebrew</p>
          <UiCodeBlock
            code="brew install filipgutica/tap/devps"
            language="bash"
            variant="compact"
            :copyable="enhanced"
            :wrap="true"
          />
        </div>
        <p class="hint">
          Then run <code>devps</code> to open the interactive picker, or <code>devps ls</code> to
          print a plain table. The picker needs <code>fzf</code> 0.66 or newer and a terminal.
          Without them, <code>devps</code> prints the table instead.
          <a href="https://brew.sh/">Install Homebrew</a> if you don't have it.
        </p>
        <dl class="fg-site-facts">
          <div>
            <dt>Runs on</dt>
            <dd>macOS only</dd>
          </div>
          <div>
            <dt>Written in</dt>
            <dd>TypeScript</dd>
          </div>
          <div>
            <dt>License</dt>
            <dd>MIT</dd>
          </div>
          <div>
            <dt>Source</dt>
            <dd>
              <a href="https://github.com/filipgutica/devps">filipgutica/devps</a>
            </dd>
          </div>
        </dl>
      </section>

      <section class="capture" aria-label="devps in use">
        <p class="hint">These captures use demo projects and sample processes.</p>
        <UiCapture :items="captures" label="Steps">
          <template #caption="{ item }">
            <p v-if="item.id === 'pick'">
              The preview under the list shows the selected job's origin, where a jump would land,
              its working directory, and the chain of processes that launched it.
            </p>
            <p v-else-if="item.id === 'orphan'">
              A job is <em>orphaned</em> when its origin has exited.
              devps marks it <code>⚠ orphaned</code>. Here devps still knows which Codex thread
              started the server, so a jump focuses the Codex app and copies the thread's resume
              command.
            </p>
            <p v-else-if="item.id === 'list'">
              <code>devps ls</code> prints the same rows as a plain table.
            </p>
            <p v-else-if="item.id === 'stop'">
              devps lists the processes it will stop and asks before it stops them.
            </p>
          </template>
        </UiCapture>
        <UiCard title="On screen" title-tag="h3">
          <dl class="fg-site-legend">
            <div>
              <dt>PORTS</dt>
              <dd>The ports the job listens on.</dd>
            </div>
            <div>
              <dt>PROJECT</dt>
              <dd>
                The repository, plus the <code>[worktree]</code> and subfolder when they differ.
              </dd>
            </div>
            <div>
              <dt>COMMAND</dt>
              <dd>The command that started the job, such as <code>pnpm dev</code>.</dd>
            </div>
            <div>
              <dt>ORIGIN</dt>
              <dd>
                Where the job came from, or <code>⚠ orphaned</code>.
              </dd>
            </div>
            <div>
              <dt>AGE</dt>
              <dd>How long the job has run.</dd>
            </div>
            <div>
              <dt>PID</dt>
              <dd>
                The job's root process: the top process below its origin.
              </dd>
            </div>
          </dl>
        </UiCard>
      </section>
      <section aria-labelledby="commands-title">
        <header>
          <h2 id="commands-title">Commands</h2>
          <p>
            <code>jump</code>, <code>open</code>, and <code>kill</code> take a port or a process ID.
            devps looks for a job on that port first, then for a job whose root process or
            listening process has that ID.
          </p>
        </header>
        <UiCommandList :items="commands" copyable description-header="What it does">
          <template #description="{ item }">
            <template v-if="item.command === 'devps open 5173'"
              >Open <code>http://localhost:5173</code> in your browser. If the job listens on more
              ports, devps opens each one.</template
            >
            <template v-else-if="item.command === 'devps kill 5173'"
              >Stop the whole job after you confirm. <code>-y</code> skips the
              confirmation.</template
            >
            <template v-else>{{ item.description }}</template>
          </template>
        </UiCommandList>
      </section>
      <section aria-labelledby="keys-title">
        <header>
          <h2 id="keys-title">Keys in the picker</h2>
          <p>
            The picker starts in browse mode. Press <kbd>/</kbd> to search. While you search,
            <kbd>q</kbd> and <kbd>/</kbd> type text instead of running their commands.
          </p>
        </header>
        <UiCommandList
          :items="keys"
          :copyable="false"
          command-header="Key"
          description-header="What it does"
        >
          <template #command="{ item }">
            <template v-if="item.command === 'Ctrl+↑ / Ctrl+↓'"
              ><kbd>Ctrl+↑</kbd> / <kbd>Ctrl+↓</kbd></template
            >
            <kbd v-else>{{ item.command }}</kbd>
          </template>
          <template #description="{ item }">
            <template v-if="item.command === 'Ctrl+↑ / Ctrl+↓'"
              >Scroll the preview. The <kbd>Ctrl</kbd> shortcuts and multi-selection work in both
              modes.</template
            >
            <template v-else>{{ item.description }}</template>
          </template>
        </UiCommandList>
      </section>
      <section aria-labelledby="jump-title">
        <header>
          <h2 id="jump-title">Where jump lands</h2>
          <p>Where a jump lands depends on what devps can learn about the origin.</p>
        </header>
        <div class="scroll">
          <table class="data">
            <thead>
              <tr>
                <th scope="col">Origin</th>
                <th scope="col">Jump target</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <th scope="row">Warp, iTerm2, Terminal, tmux</th>
                <td>The tab or pane, when its session information is available.</td>
              </tr>
              <tr>
                <th scope="row">VS Code</th>
                <td>The window for that folder. devps cannot select a VS Code terminal tab.</td>
              </tr>
              <tr>
                <th scope="row">Codex app, T3 Code Workbench, Claude app</th>
                <td>
                  The app. For a known Codex session, devps also copies
                  <code>codex resume &lt;id&gt;</code> to the clipboard. For an orphaned job with a
                  known Claude Code session, it copies <code>claude --resume &lt;id&gt;</code>.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section aria-labelledby="limits-title">
        <h2 id="limits-title">Good to know</h2>
        <dl class="fg-site-definitions">
          <dt>Stopping</dt>
          <dd>
            devps sends <code>SIGTERM</code> to the job's root process and its children. After three
            seconds it sends <code>SIGKILL</code> to any that are still running. It never stops GUI
            apps, PID 1, or the terminal or agent that runs devps.
          </dd>
          <dt>Environment hints</dt>
          <dd>
            devps finds an origin by tracing the processes that started the job, plus a fixed list
            of inherited environment hints. It never prints, stores, or passes on other environment
            values.
          </dd>
          <dt>Hidden servers</dt>
          <dd>
            The default filter can hide compiled servers outside your home directory.
            <code>--all</code> shows every TCP listener.
          </dd>
          <dt>System tools</dt>
          <dd>
            devps uses the macOS tools <code>ps</code>, <code>lsof</code>, <code>open</code>,
            <code>osascript</code>, and <code>pbcopy</code>.
          </dd>
        </dl>
        <nav class="links" aria-label="Documentation">
          <a href="https://github.com/filipgutica/devps#readme">Full reference</a>
          <a href="https://github.com/filipgutica/devps/blob/main/docs/ARCHITECTURE.md"
            >Architecture</a
          >
        </nav>
      </section>
    </main>
    <footer class="fg-site-footer">
      <a href="https://github.com/filipgutica">Built by Filip Gutica</a>
      <nav aria-label="Project links">
        <a href="https://github.com/filipgutica/homebrew-tap">Homebrew tap</a>
        <a href="https://github.com/filipgutica/devps/issues">Report an issue</a>
        <a href="https://github.com/filipgutica/devps/releases">Releases</a>
      </nav>
    </footer>
  </div>
</template>
