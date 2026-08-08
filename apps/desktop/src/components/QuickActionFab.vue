<script setup lang="ts">
import { ref } from "vue";
import { useRouter } from "vue-router";
import Dialog from "primevue/dialog";
import Button from "primevue/button";
import { QUICK_ACTIONS } from "@/lib/nav-config";
import { ux } from "@/locale/ux-copy";

const router = useRouter();
const open = ref(false);

function navigate(path: string): void {
  open.value = false;
  void router.push(path);
}

defineExpose({ openSheet: () => { open.value = true; } });
</script>

<template>
  <button
    type="button"
    class="hy-fab fixed z-50 bottom-[calc(4.25rem+env(safe-area-inset-bottom))] left-4 flex items-center justify-center rounded-full shadow-lg min-h-14 min-w-14 bg-[var(--hy-accent)] text-white border-0 cursor-pointer transition-transform active:scale-95"
    :aria-label="ux.nav.newAction"
    @click="open = true"
  >
    <i class="pi pi-plus text-xl" aria-hidden="true" />
  </button>

  <Dialog
    v-model:visible="open"
    modal
    position="bottom"
    :header="ux.quickActions.title"
    class="w-full max-w-lg mx-auto hy-sheet"
    :draggable="false"
  >
    <div class="grid grid-cols-1 gap-2 pt-1 pb-2">
      <button
        v-for="action in QUICK_ACTIONS"
        :key="action.id"
        type="button"
        class="hy-surface flex items-center gap-3 p-4 text-right min-h-[4.5rem] transition-colors hover:border-[var(--hy-primary)]"
        @click="navigate(action.path)"
      >
        <span
          class="flex items-center justify-center shrink-0 w-11 h-11 rounded-xl"
          :class="{
            'bg-[var(--hy-primary-soft)] text-[var(--hy-primary)]':
              action.tone === 'primary',
            'bg-[var(--hy-accent-soft)] text-[var(--hy-accent)]':
              action.tone === 'accent',
            'bg-[var(--hy-bg)] text-[var(--hy-muted)]':
              action.tone === 'neutral',
          }"
        >
          <i :class="action.icon" aria-hidden="true" />
        </span>
        <span class="flex flex-col gap-0.5 min-w-0">
          <span class="font-semibold text-[var(--hy-text)]">{{
            action.label
          }}</span>
          <span class="text-xs text-[var(--hy-muted)] leading-relaxed">{{
            action.hint
          }}</span>
        </span>
        <i
          class="pi pi-chevron-left mr-auto text-[var(--hy-muted)] text-sm"
          aria-hidden="true"
        />
      </button>
    </div>
    <template #footer>
      <Button
        :label="ux.common.cancel"
        text
        class="min-h-11 w-full"
        @click="open = false"
      />
    </template>
  </Dialog>
</template>
