<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { UiBadge, UiCard, UiCodeBlock } from '@filipgutica/ui';
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
    description: 'Interactive picker.',
  },
  {
    command: 'devps ls',
    description: 'Plain table.',
  },
  {
    command: 'devps jump 5173',
    description: 'Focus the originating terminal, editor, or agent app.',
  },
  {
    command: 'devps open 5173',
  },
  {
    command: 'devps kill 5173',
  },
  {
    command: 'devps --all',
    description: 'Include all TCP listeners, beyond dev runtimes.',
  },
];
const keys = [
  {
    command: '/',
    description: 'Edit the filter.',
  },
  {
    command: 'q',
    description: 'Quit from browse mode.',
  },
  {
    command: 'Enter',
    description:
      'Search: keep the filter in the header and return to browsing. Browse: jump to origin.',
  },
  {
    command: 'Esc',
    description: 'Search: clear the filter and return to browsing. Browse: quit.',
  },
  {
    command: 'Ctrl+O',
    description: 'Open its URL.',
  },
  {
    command: 'Ctrl+X',
    description: 'Stop selected jobs after confirmation.',
  },
  {
    command: 'Tab',
    description: 'Select multiple jobs.',
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
  <div class="page" :data-enhanced="enhanced">
    <UiSiteHeader
      class="page-header"
      project="devps"
      :links="[
        {
          label: 'Guide',
          href: 'https://github.com/filipgutica/devps/blob/main/README.md',
        },
        { label: 'GitHub', href: 'https://github.com/filipgutica/devps' },
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
          One row per job: ports, project, origin, and age. Jump to its origin, open its URL, or
          stop it.
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
          Picker: <code>fzf</code> 0.66+ and terminal input; otherwise, a plain table.
          <a href="https://brew.sh/">Install Homebrew</a> if needed.
        </p>
        <dl class="fg-site-facts">
          <div>
            <dt>Runs on</dt>
            <dd><UiBadge>macOS only</UiBadge></dd>
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
        <p class="hint">devps 0.1.1 demo output; controls updated for browse mode.</p>
        <UiCapture :items="captures" label="Steps">
          <template #caption="{ item }">
            <p v-if="item.id === 'pick'">
              One row per job. The preview shows the origin, the jump target, the working directory,
              and the chain of processes that launched it.
            </p>
            <p v-else-if="item.id === 'orphan'">
              A server whose launcher is gone is marked <code>⚠ orphaned</code>. devps still knows
              which agent thread started it, and jumping copies the resume command.
            </p>
            <p v-else-if="item.id === 'list'">
              The same rows as a plain table. devps prints this when a supported
              <code>fzf</code> is unavailable or standard input is not a terminal.
            </p>
            <p v-else-if="item.id === 'stop'">
              Shows the processes it will stop, then asks. <code>-y</code> skips the question.
            </p>
          </template>
        </UiCapture>
        <UiCard class="legend" title="On screen" title-tag="h3">
          <dl>
            <div>
              <dt>PORTS</dt>
              <dd>Listening ports.</dd>
            </div>
            <div>
              <dt>PROJECT</dt>
              <dd>Repository; <code>[worktree]</code> and subfolder when different.</dd>
            </div>
            <div>
              <dt>COMMAND</dt>
              <dd>Runner, e.g. <code>pnpm dev</code>.</dd>
            </div>
            <div>
              <dt>ORIGIN</dt>
              <dd>Terminal, editor, or agent. <code>⚠ orphaned</code>: launcher gone.</dd>
            </div>
            <div>
              <dt>AGE</dt>
              <dd>Time running.</dd>
            </div>
            <div>
              <dt>PID</dt>
              <dd>Job root process.</dd>
            </div>
          </dl>
        </UiCard>
      </section>
      <section aria-labelledby="commands-title">
        <header>
          <h2 id="commands-title">Commands</h2>
          <p>Matches port first, then root or listener PID.</p>
        </header>
        <UiCommandList :items="commands" copyable description-header="What it does">
          <template #description="{ item }">
            <template v-if="item.command === 'devps open 5173'"
              >Open <code>http://localhost:5173</code>.</template
            >
            <template v-else-if="item.command === 'devps kill 5173'"
              >Stop the whole job after confirmation; <code>-y</code> skips it.</template
            >
            <template v-else>{{ item.description }}</template>
          </template>
        </UiCommandList>
      </section>
      <section aria-labelledby="keys-title">
        <header>
          <h2 id="keys-title">Keys in the picker</h2>
          <p>Starts in browse mode. While searching, <kbd>q</kbd> and <kbd>/</kbd> are text.</p>
        </header>
        <UiCommandList
          :items="keys"
          :copyable="false"
          command-header="Key"
          description-header="What it does"
        >
          <template #command="{ item }">
            <template v-for="(key, index) in item.command.split(' / ')" :key="key">
              <template v-if="index > 0"> / </template><kbd>{{ key }}</kbd>
            </template>
          </template>
          <template #description="{ item }">
            <template v-if="item.command === 'Ctrl+↑ / Ctrl+↓'"
              >Scroll details. <kbd>Ctrl</kbd> shortcuts and multi-selection work in both
              modes.</template
            >
            <template v-else>{{ item.description }}</template>
          </template>
        </UiCommandList>
      </section>
      <section aria-labelledby="jump-title">
        <header>
          <h2 id="jump-title">Where jump lands</h2>
          <p>Exact targets depend on available origin information.</p>
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
                <td>Tab or pane when session information matches.</td>
              </tr>
              <tr>
                <th scope="row">VS Code</th>
                <td>Folder's window; cannot select a terminal tab.</td>
              </tr>
              <tr>
                <th scope="row">Codex app, T3 Code Workbench, Claude app</th>
                <td>
                  App; copies <code>codex resume &lt;id&gt;</code> or
                  <code>claude --resume &lt;id&gt;</code> for known sessions.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section aria-labelledby="limits-title">
        <h2 id="limits-title">Good to know</h2>
        <dl class="fg-site-definitions notes">
          <dt>Stopping</dt>
          <dd>
            <code>SIGTERM</code> to the root and children; <code>SIGKILL</code> to survivors after
            three seconds. GUI apps, PID 1, and devps's terminal or agent are protected.
          </dd>
          <dt>Orphan origins</dt>
          <dd>
            Only allowlisted hints such as <code>WARP_FOCUS_URL</code> and
            <code>CODEX_THREAD_ID</code> are read. Other environment values are never printed,
            stored, or passed on.
          </dd>
          <dt>Compiled servers outside your home directory may be hidden.</dt>
          <dd><code>--all</code> includes every TCP listener.</dd>
          <dt>macOS only</dt>
          <dd>
            Uses <code>ps</code>, <code>lsof</code>, <code>open</code>, <code>osascript</code>, and
            <code>pbcopy</code>. Some origins allow only app focus, not an exact tab or
            conversation.
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
    <footer>
      <a href="https://github.com/filipgutica">Built by Filip Gutica</a>
      <nav aria-label="Project links">
        <a href="https://github.com/filipgutica/homebrew-tap">Homebrew tap</a>
        <a href="https://github.com/filipgutica/devps/issues">Report an issue</a>
        <a href="https://github.com/filipgutica/devps/releases">Releases</a>
      </nav>
    </footer>
  </div>
</template>
