<script setup lang="ts">
import { nextTick, onMounted, onUnmounted, ref, useTemplateRef } from 'vue';
import { UiButton, UiCodeBlock, UiDialog, UiTabs } from '@filipgutica/ui';
import SiteNavigation from './components/SiteNavigation.vue';
import CaptureFigure from './components/CaptureFigure.vue';
import CapturePreview from './components/CapturePreview.vue';
import { captures, type Capture } from './captures';
import { useScrollReveal } from './composables/useScrollReveal';

const main = useTemplateRef<HTMLElement>('main');
useScrollReveal(main);

const enhanced = ref(false);
const activeCapture = ref('pick');
const captureTabs = captures.map(({ id, label }) => ({ value: id, label }));
const captureOpen = ref(false);
const viewedCapture = ref<Capture>();
let captureTrigger: HTMLElement | undefined;
let firstFrame = 0;
let secondFrame = 0;

const openCapture = (capture: Capture, trigger: HTMLElement) => {
  viewedCapture.value = capture;
  captureTrigger = trigger;
  captureOpen.value = true;
};
const restoreCaptureFocus = (event: Event) => {
  if (!captureTrigger?.isConnected) return;
  event.preventDefault();
  captureTrigger.focus({ preventScroll: true });
};
const currentHashTarget = () => {
  try {
    return document.getElementById(decodeURIComponent(location.hash.slice(1)));
  } catch {
    return null;
  }
};
const alignCurrentHash = async () => {
  await nextTick();
  cancelAnimationFrame(firstFrame);
  cancelAnimationFrame(secondFrame);
  firstFrame = requestAnimationFrame(() => {
    secondFrame = requestAnimationFrame(() =>
      currentHashTarget()?.scrollIntoView({ behavior: 'instant', block: 'start' }),
    );
  });
};
const selectHashCapture = () => {
  const target = currentHashTarget();
  const capture = captures.find(({ id }) => target?.closest(`#frame-${id}`));
  if (!capture || activeCapture.value === capture.id) return false;
  activeCapture.value = capture.id;
  return true;
};
const onHashChange = () => {
  if (selectHashCapture()) void alignCurrentHash();
};
onMounted(() => {
  enhanced.value = true;
  selectHashCapture();
  // Hydration hides inactive captures. Realign a deep link after preview sizing settles.
  if (location.hash) void alignCurrentHash();
  window.addEventListener('hashchange', onHashChange);
  window.addEventListener('popstate', onHashChange);
});
onUnmounted(() => {
  cancelAnimationFrame(firstFrame);
  cancelAnimationFrame(secondFrame);
  window.removeEventListener('hashchange', onHashChange);
  window.removeEventListener('popstate', onHashChange);
});
</script>

<template>
  <a class="skip" href="#main">Skip to content</a>
  <div class="page" :data-enhanced="enhanced">
    <SiteNavigation />
    <header class="page-header">
      <a class="page-brand" href="/devps/" aria-label="devps home">devps</a>
      <nav aria-label="Main navigation">
        <a href="https://github.com/filipgutica/devps/blob/main/README.md">Guide</a>
        <a href="https://github.com/filipgutica/devps">GitHub</a>
        <a href="https://github.com/filipgutica/devps/releases">Releases</a>
      </nav>
    </header>
    <main id="main" ref="main">
      <div>
        <section class="hero" aria-labelledby="title">
          <h1 id="title" class="tagline">What is running, who started it, and how to stop it.</h1>
          <p class="lede">
            devps manages local dev servers on macOS. It shows one row per job, with ports, project,
            origin, and age. Jump back to where a server started, open its URL, or stop the whole
            job.
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
            <code>fzf</code> 0.66 or newer provides the interactive picker. Without a supported
            version, or without a terminal on standard input, devps prints a plain table. New to
            Homebrew? <a href="https://brew.sh/">Install it first</a>.
          </p>
          <dl class="facts">
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
              <dd><a href="https://github.com/filipgutica/devps">filipgutica/devps</a></dd>
            </div>
          </dl>
        </section>
        <section class="stage wide" aria-label="devps in use">
          <p class="stage-label">
            Demo server output from devps 0.1.1, with picker controls updated for browse mode.
          </p>
          <UiTabs v-model="activeCapture" :items="captureTabs" label="Steps">
            <template #panel="{ value }">
              <template v-for="capture in captures" :key="capture.id">
                <CaptureFigure
                  v-if="capture.id === value"
                  :capture="capture"
                  :enhanced="enhanced"
                  @expand="openCapture"
                />
              </template>
            </template>
          </UiTabs>
          <aside class="legend" aria-labelledby="legend-title">
            <h3 id="legend-title">On screen</h3>
            <dl style="--cols: 3">
              <div>
                <dt>PORTS</dt>
                <dd>Every port the job listens on.</dd>
              </div>
              <div>
                <dt>PROJECT</dt>
                <dd>Repository, then <code>[worktree]</code> and subfolder when they differ.</dd>
              </div>
              <div>
                <dt>COMMAND</dt>
                <dd>The runner, such as <code>pnpm dev</code>.</dd>
              </div>
              <div>
                <dt>ORIGIN</dt>
                <dd>
                  The terminal, editor, or agent that started it. <code>⚠ orphaned</code> means that
                  launcher is gone.
                </dd>
              </div>
              <div>
                <dt>AGE</dt>
                <dd>How long the job has been running.</dd>
              </div>
              <div>
                <dt>PID</dt>
                <dd>The job's root process.</dd>
              </div>
            </dl>
          </aside>
        </section>
      </div>
      <section class="split" aria-labelledby="commands-title">
        <header>
          <h2 id="commands-title">Commands</h2>
          <p>A port matches first, then a job's root PID or a listener PID.</p>
        </header>
        <ul class="rows">
          <li class="row">
            <div class="cmd">
              <UiCodeBlock variant="compact" code="devps" language="bash" :copyable="enhanced" :wrap="true" />
            </div>
            <p>Open the interactive picker.</p>
          </li>
          <li class="row">
            <div class="cmd">
              <UiCodeBlock variant="compact" code="devps ls" language="bash" :copyable="enhanced" :wrap="true" />
            </div>
            <p>Print the plain table.</p>
          </li>
          <li class="row">
            <div class="cmd">
              <UiCodeBlock
                variant="compact"
                code="devps jump 5173"
                language="bash"
                :copyable="enhanced"
                :wrap="true"
              />
            </div>
            <p>Focus the terminal, editor, or agent app that started the server.</p>
          </li>
          <li class="row">
            <div class="cmd">
              <UiCodeBlock
                variant="compact"
                code="devps open 5173"
                language="bash"
                :copyable="enhanced"
                :wrap="true"
              />
            </div>
            <p>Open <code>http://localhost:5173</code> in the browser.</p>
          </li>
          <li class="row">
            <div class="cmd">
              <UiCodeBlock
                variant="compact"
                code="devps kill 5173"
                language="bash"
                :copyable="enhanced"
                :wrap="true"
              />
            </div>
            <p>Stop the whole job after you confirm. Add <code>-y</code> to skip the question.</p>
          </li>
          <li class="row">
            <div class="cmd">
              <UiCodeBlock variant="compact" code="devps --all" language="bash" :copyable="enhanced" :wrap="true" />
            </div>
            <p>Include every TCP listener, not only dev runtimes.</p>
          </li>
        </ul>
      </section>
      <section class="split narrow" aria-labelledby="keys-title">
        <header>
          <h2 id="keys-title">Keys in the picker</h2>
          <p>
            The picker starts in browse mode. Press <kbd>/</kbd> to search. While searching,
            <code>q</code> and <code>/</code> are ordinary text.
          </p>
        </header>
        <ul class="rows">
          <li class="row">
            <kbd>/</kbd>
            <p>Edit the search filter.</p>
          </li>
          <li class="row">
            <kbd>q</kbd>
            <p>Quit from browse mode.</p>
          </li>
          <li class="row">
            <kbd>Enter</kbd>
            <p>
              While searching, keep the filter and return to browsing. The active filter appears in
              the header. From browse mode, jump to the selected server's origin.
            </p>
          </li>
          <li class="row">
            <kbd>Esc</kbd>
            <p>While searching, clear the filter and return to browsing. From browse mode, quit.</p>
          </li>
          <li class="row">
            <kbd>Ctrl+O</kbd>
            <p>Open its URL in the browser.</p>
          </li>
          <li class="row">
            <kbd>Ctrl+X</kbd>
            <p>Stop the selected jobs after confirmation.</p>
          </li>
          <li class="row">
            <kbd>Tab</kbd>
            <p>Select several jobs.</p>
          </li>
          <li class="row">
            <kbd>Ctrl+R</kbd>
            <p>Refresh the list.</p>
          </li>
          <li class="row">
            <kbd>Ctrl+↑ / Ctrl+↓</kbd>
            <p>Scroll details. The Ctrl shortcuts and multi-selection work in both modes.</p>
          </li>
          <li class="row">
            <kbd>Ctrl+C</kbd>
            <p>Quit from either mode.</p>
          </li>
        </ul>
      </section>
      <section class="split" aria-labelledby="jump-title">
        <header>
          <h2 id="jump-title">Where jump lands</h2>
          <p>Exact tab or pane selection depends on the origin information available.</p>
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
                <td>The tab or pane, when the matching session information is available.</td>
              </tr>
              <tr>
                <th scope="row">VS Code</th>
                <td>The window for that folder. It cannot select the terminal tab.</td>
              </tr>
              <tr>
                <th scope="row">Codex app, T3 Code Workbench, Claude app</th>
                <td>
                  The app. It copies <code>codex resume &lt;id&gt;</code> or
                  <code>claude --resume &lt;id&gt;</code> when the session is known.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
      <section class="split" aria-labelledby="limits-title">
        <header>
          <h2 id="limits-title">Good to know</h2>
        </header>
        <div class="text-rows">
          <p>
            <strong>Stop is careful.</strong> devps sends <code>SIGTERM</code> to the job root and
            its children, then <code>SIGKILL</code> to survivors after three seconds. It protects
            GUI apps, PID 1, and the terminal or agent that runs devps.
          </p>
          <p>
            <strong>Only a fixed list of environment variables is read.</strong> To find the origin
            of an orphaned job, devps reads hints such as <code>WARP_FOCUS_URL</code> and
            <code>CODEX_THREAD_ID</code>. It does not print, store, or pass on other values.
          </p>
          <p>
            <strong
              >The default filter can hide compiled servers outside your home directory.</strong
            >
            Use <code>--all</code> to include every TCP listener.
          </p>
          <p>
            <strong>macOS only.</strong> devps uses macOS <code>ps</code>, <code>lsof</code>,
            <code>open</code>, <code>osascript</code>, and <code>pbcopy</code>. Some origins support
            app focus only, so it cannot always return to an exact tab or conversation.
          </p>
          <nav class="links" aria-label="Documentation">
            <a href="https://github.com/filipgutica/devps#readme">Full reference</a>
            <a href="https://github.com/filipgutica/devps/blob/main/docs/ARCHITECTURE.md"
              >Architecture</a
            >
          </nav>
        </div>
      </section>
      <section class="split" aria-labelledby="family-title">
        <header>
          <h2 id="family-title">Also from Filip</h2>
          <p>
            The three terminal tools install from
            <a href="https://github.com/filipgutica/homebrew-tap">one Homebrew tap</a>.
          </p>
        </header>
        <ul class="rows narrow">
          <li class="row">
            <a href="https://filipgutica.github.io/annoterm/"><code>annoterm</code></a>
            <p>
              Review Markdown in the terminal and send your comments to a coding agent as precise
              feedback.
            </p>
          </li>
          <li class="row">
            <a href="https://filipgutica.github.io/wtree/"><code>wtree</code></a>
            <p>
              List Git worktrees with age and pull request state, then clean up the finished ones.
            </p>
          </li>
          <li class="row">
            <a href="https://filipgutica.github.io/t3code/"><code>Workbench</code></a>
            <p>Plan across repositories, organize tickets, and start agent threads in worktrees.</p>
          </li>
        </ul>
      </section>
    </main>
    <footer>
      <a href="https://github.com/filipgutica">Built by Filip Gutica</a>
      <nav aria-label="Project links">
        <a href="https://github.com/filipgutica/devps/issues">Report an issue</a>
        <a href="https://github.com/filipgutica/devps/releases">Releases</a>
      </nav>
    </footer>
  </div>
  <UiDialog
    v-model:open="captureOpen"
    :title="`${viewedCapture?.label ?? ''} capture`"
    description="Scroll to read the full capture."
    class="capture-viewer"
    @close-auto-focus="restoreCaptureFocus"
  >
    <CapturePreview
      v-if="viewedCapture"
      :html="viewedCapture.html"
      :label="`${viewedCapture.label} capture at full size`"
      :fit="false"
    />
    <template #footer
      ><UiButton variant="secondary" size="lg" @click="captureOpen = false"
        >Close capture</UiButton
      ></template
    >
  </UiDialog>
</template>
