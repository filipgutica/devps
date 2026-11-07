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
      { label: 'First run', href: '#first-run-title' },
      { label: 'Commands', href: '#commands-title' },
      { label: 'Picker keys', href: '#keys-title' },
      { label: 'Table columns', href: '#columns-title' },
      { label: 'Jump targets', href: '#jump-title' },
      { label: 'Jobs and origins', href: '#jobs-title' },
      { label: 'Server detection', href: '#detection-title' },
      { label: 'Stopping safely', href: '#stopping-title' },
      { label: 'Limits', href: '#limits-title' },
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
    description: 'Print the jobs as a plain table.',
  },
  {
    command: 'devps jump 5173',
    description: 'Focus the terminal, editor, or app that started the job.',
  },
  {
    command: 'devps open 5173',
  },
  {
    command: 'devps kill 5173',
  },
  {
    command: 'devps --version',
    description: 'Print the installed version. Alias: -V.',
  },
  {
    command: 'devps --help',
    description: 'Print usage. Aliases: -h and help.',
  },
];
const keys = [
  {
    command: '/',
    description: 'Browse: start searching.',
  },
  {
    command: 'q',
    description: 'Browse: quit.',
  },
  {
    command: 'Enter',
    description:
      'Browse: jump to one job, even with several selected. Search: keep the filter and return to browsing.',
  },
  {
    command: 'Esc',
    description: 'Browse: quit. Search: clear the filter and return to browsing.',
  },
  {
    command: 'Ctrl+O',
    description: 'Open all selected jobs\' ports in the browser.',
  },
  {
    command: 'Ctrl+X',
    description: 'Stop selected jobs, confirming each separately. Then press Enter to return to the list.',
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
      <section class="intro fg-site-hero" aria-labelledby="title">
        <h1 id="title">Find the dev server you left running.</h1>
        <div class="fg-site-hero__lede">
          <p class="lede">
            devps is a macOS command-line tool that lists local dev servers and what started them.
            Find one by port or project, return to its terminal, editor, or agent app, open it in the browser, or stop it.
          </p>
        </div>
        <div class="fg-site-hero__aside">
          <div id="install" class="install-command">
            <p class="fg-site-meta">
              Install with Homebrew. If you need Homebrew first,
              <a href="https://brew.sh/">install it here</a>.
            </p>
            <UiCodeBlock
              code="brew install filipgutica/tap/devps"
              language="bash"
              variant="compact"
              :copyable="enhanced"
              :wrap="true"
            />
          </div>
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
        </div>
      </section>

      <section class="capture" aria-labelledby="first-run-title">
        <header>
          <h2 id="first-run-title">First run</h2>
          <p>
            Replace <code>5173</code> with a port from your list.
            Each row is a <em>job</em>: a launched command and its servers.
          </p>
        </header>
        <ol>
          <li>
            Run <code>devps ls</code>. Find your server by port, project, or command.
            If it is missing, see <a href="#detection-title">Which servers appear</a>.
          </li>
          <li>
            With <code>fzf</code> 0.66 or newer installed, run <code>devps</code> in a terminal
            for the picker. Otherwise, it prints the table.
            Press <kbd>q</kbd> to leave the picker.
          </li>
          <li>
            Run <code>devps jump 5173</code> to return to the server's origin.
          </li>
          <li>
            Run <code>devps open 5173</code> to open localhost URLs for all the job's ports in your browser.
          </li>
          <li>
            Run <code>devps kill 5173</code> to stop the job and its child processes.
            Enter <code>y</code> to confirm, or press Enter to skip.
          </li>
        </ol>
        <p class="fg-site-meta">These captures use demo projects and sample processes.</p>
        <UiCapture :items="captures" label="Steps">
          <template #caption="{ item }">
            <p v-if="item.id === 'pick'">
              The preview shows the job's origin, jump target, working directory, and launcher processes.
            </p>
            <p v-else-if="item.id === 'orphan'">
              This server outlived its launcher. devps recovered its Codex thread ID and includes a resume command in the jump target.
            </p>
            <p v-else-if="item.id === 'list'">
              The table and picker show the same jobs.
            </p>
            <p v-else-if="item.id === 'stop'">
              The stop prompt shows the job's ports and project.
            </p>
          </template>
        </UiCapture>
      </section>

      <section aria-labelledby="commands-title">
        <header>
          <h2 id="commands-title">Commands and flags</h2>
          <p>
            <code>jump</code>, <code>open</code>, and <code>kill</code> accept space-separated ports
            or process IDs (PIDs). Ports can start with a colon:
            <code>devps kill :5173 :6006</code>.
          </p>
          <p>
            A port match takes priority over a PID match. A PID must identify a job root or
            a listening process; other child PIDs do not match.
          </p>
        </header>
        <UiCommandList :items="commands" copyable description-header="What it does">
          <template #description="{ item }">
            <template v-if="item.command === 'devps open 5173'"
              >Open <code>http://localhost:&lt;port&gt;</code> for every port in the matched job.</template
            >
            <template v-else-if="item.command === 'devps kill 5173'"
              >Stop the whole job after confirmation. <code>stop</code> is an alias for
              <code>kill</code>.</template
            >
            <template v-else>{{ item.description }}</template>
          </template>
        </UiCommandList>
        <dl class="fg-site-definitions">
          <dt><code>--all</code></dt>
          <dd>
            Include every TCP listener, bypassing the dev server filter. Works with every
            command, including <code>devps jump --all 5173</code>.
          </dd>
          <dt><code>-y</code>, <code>--yes</code></dt>
          <dd>Skip stop confirmations. Example: <code>devps kill 5173 -y</code>.</dd>
        </dl>
        <p class="fg-site-meta">
          Before stopping, devps reports the process count and names up to eight processes.
          <a href="#stopping-title">Stop safeguards</a> also apply when confirmation is skipped.
        </p>
      </section>

      <section aria-labelledby="keys-title">
        <header>
          <h2 id="keys-title">Picker keys</h2>
          <p>
            The picker starts in browse mode. In search mode, <kbd>q</kbd> and <kbd>/</kbd>
            enter text. When you return to browsing, the header shows the active filter.
          </p>
          <p>The Ctrl shortcuts and multi-selection work in both modes.</p>
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
              >Scroll the preview.</template
            >
            <template v-else>{{ item.description }}</template>
          </template>
        </UiCommandList>
      </section>

      <section aria-labelledby="columns-title">
        <header>
          <h2 id="columns-title">Table columns</h2>
        </header>
        <UiCard title="On screen" title-tag="h3">
          <dl class="fg-site-legend">
            <div>
              <dt>PORTS</dt>
              <dd>The job's listening TCP ports.</dd>
            </div>
            <div>
              <dt>PROJECT</dt>
              <dd>
                Repository, <code>[worktree]</code> when its name differs, and subfolder.
                Outside a repository, the working directory.
              </dd>
            </div>
            <div>
              <dt>COMMAND</dt>
              <dd>The job root's command, shortened for display.</dd>
            </div>
            <div>
              <dt>ORIGIN</dt>
              <dd>The agent and host, when known. <code>⚠ orphaned</code> marks an orphaned job.</dd>
            </div>
            <div>
              <dt>AGE</dt>
              <dd>Time since the job root started.</dd>
            </div>
            <div>
              <dt>PID</dt>
              <dd>The job root's process ID.</dd>
            </div>
          </dl>
        </UiCard>
      </section>

      <section aria-labelledby="jump-title">
        <header>
          <h2 id="jump-title">Jump targets</h2>
          <p>
            Focusing an exact tab or pane requires session information. The preview shows the target.
          </p>
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
                <th scope="row">Warp, iTerm2, Terminal</th>
                <td>The matching tab, when known; otherwise the app.</td>
              </tr>
              <tr>
                <th scope="row">tmux</th>
                <td>The pane, when its ID and a tmux ancestor are known.</td>
              </tr>
              <tr>
                <th scope="row">VS Code</th>
                <td>The folder's window. No terminal tab selection.</td>
              </tr>
              <tr>
                <th scope="row">Codex app or Codex thread</th>
                <td>The Codex app, including jobs started inside T3 Code Workbench.</td>
              </tr>
              <tr>
                <th scope="row">T3 Code Workbench, Claude app, other apps</th>
                <td>The host app, unless the Codex target above applies.</td>
              </tr>
              <tr>
                <th scope="row">No known target</th>
                <td>Nothing to focus.</td>
              </tr>
            </tbody>
          </table>
        </div>
        <dl class="fg-site-definitions">
          <dt>Codex resume command</dt>
          <dd>
            For Codex app or Codex thread jobs with a known session ID, jumping also copies
            <code>codex resume &lt;id&gt;</code> to the clipboard. This includes orphaned jobs
            but excludes a live Codex CLI in a terminal.
          </dd>
          <dt>Claude Code resume command</dt>
          <dd>
            For an orphaned job with a known Claude Code session, jumping also copies
            <code>claude --resume &lt;id&gt;</code>.
          </dd>
        </dl>
      </section>

      <section aria-labelledby="jobs-title">
        <header>
          <h2 id="jobs-title">How jobs and origins are found</h2>
          <p>
            Each run snapshots TCP listeners and processes, keeping no state between runs.
          </p>
        </header>
        <dl class="fg-site-definitions">
          <dt>One row per launched command</dt>
          <dd>
            devps follows each listener's parents up to the process just below a shell,
            agent, app, tmux, or launchd. This process is the job root.
            Listeners with the same root share a row. For example, if <code>pnpm dev</code>
            starts two Vite servers, one row shows both ports.
          </dd>
          <dt>The origin</dt>
          <dd>
            Above the root, devps looks for the nearest Claude Code or Codex process and the
            nearest host app. These form labels such as <code>Claude Code · Warp</code>.
          </dd>
          <dt>Orphaned jobs</dt>
          <dd>
            A job is orphaned if its root's parent is PID 1 and the root is not an installed app.
            Its terminal or agent has usually ended. Inherited session and app hints can still identify the origin.
          </dd>
          <dt>Environment hints</dt>
          <dd>
            devps reads each job root's full environment with <code>ps -wwE</code>, keeping
            only a fixed allowlist of keys, including terminal and agent session IDs
            and app identifiers. The preview prints these keys and values.
          </dd>
        </dl>
      </section>

      <section aria-labelledby="detection-title">
        <header>
          <h2 id="detection-title">Which servers appear</h2>
          <p>
            By default, a TCP listener must meet both conditions.
            <a href="#commands-title"><code>--all</code></a> lists every listener instead.
          </p>
        </header>
        <ol>
          <li>
            Its executable is outside an installed <code>.app</code> bundle in
            <code>/Applications</code>, <code>/System/Applications</code>, or
            <code>~/Applications</code>, including their subfolders.
          </li>
          <li>
            Its executable name matches a recognized runtime, such as <code>node</code>,
            <code>bun</code>, <code>python3</code>, or <code>go</code>; or its executable is
            under your home directory. The home-directory rule excludes
            <code>~/.vscode</code>, <code>~/.cursor</code>, <code>~/Library</code>, and
            <code>~/.codex/packages</code>.
          </li>
        </ol>
        <p class="fg-site-meta">
          A compiled server outside your home directory can be hidden, such as a
          <code>go run</code> binary in a temporary folder.
        </p>
      </section>

      <section aria-labelledby="stopping-title">
        <header>
          <h2 id="stopping-title">How stopping protects other processes</h2>
        </header>
        <dl class="fg-site-definitions">
          <dt>Check the root again</dt>
          <dd>
            Before stopping, devps rereads the process table and refuses if the root PID is gone
            or belongs to a different executable. Refresh and try again.
          </dd>
          <dt>Exclude protected processes</dt>
          <dd>
            From the root and its descendants, devps excludes PID 1, itself, the processes
            that launched it, and programs inside installed <code>.app</code> bundles in the
            Applications folders listed above. These exclusions also apply with <code>--all</code>.
          </dd>
          <dt>Terminate, then force survivors to stop</dt>
          <dd>
            devps sends <code>SIGTERM</code> to the remaining processes, waits up to three
            seconds for exit, then sends <code>SIGKILL</code> to survivors.
          </dd>
        </dl>
      </section>

      <section aria-labelledby="limits-title">
        <header>
          <h2 id="limits-title">Limits</h2>
          <p>
            devps uses the macOS tools <code>ps</code>, <code>lsof</code>, <code>open</code>,
            <code>osascript</code>, and <code>pbcopy</code>.
          </p>
        </header>
        <p>
          Origin hints can survive a launcher, but the original tab or conversation may be gone.
          A resume command does not mean devps can reopen that conversation in the app.
        </p>
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
