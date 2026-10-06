<script setup lang="ts">
import { UiButton } from '@filipgutica/ui';
import type { Capture } from '../captures';
import CapturePreview from './CapturePreview.vue';

const { capture, enhanced } = defineProps<{ capture: Capture; enhanced: boolean }>();
const emit = defineEmits<{
  (event: 'expand', capture: Capture, trigger: HTMLElement): void;
}>();
const expand = (event: MouseEvent) => {
  if (event.currentTarget instanceof HTMLElement) emit('expand', capture, event.currentTarget);
};
</script>

<template>
  <figure :id="`frame-${capture.id}`" class="frame" :data-tab="capture.label">
    <CapturePreview
      :html="capture.html"
      :label="`Terminal capture: ${capture.label}`"
      :fit="enhanced"
    />
    <figcaption class="frame-cap">
      <code>{{ capture.command }}</code>
      <p v-if="capture.id === 'pick'">
        One row per job. The preview shows the origin, the jump target, the working directory, and
        the chain of processes that launched it.
      </p>
      <p v-else-if="capture.id === 'orphan'">
        A server whose launcher is gone is marked <code>⚠ orphaned</code>. devps still knows which
        agent thread started it, and jumping copies the resume command.
      </p>
      <p v-else-if="capture.id === 'list'">
        The same rows as a plain table. devps prints this when a supported <code>fzf</code> is
        unavailable or standard input is not a terminal.
      </p>
      <p v-else-if="capture.id === 'stop'">
        Shows the processes it will stop, then asks. <code>-y</code> skips the question.
      </p>
      <UiButton
        v-if="enhanced"
        variant="secondary"
        size="lg"
        class="capture-expand"
        :aria-label="`Expand ${capture.label} capture`"
        aria-haspopup="dialog"
        @click="expand"
        >Expand capture</UiButton
      >
    </figcaption>
  </figure>
</template>
