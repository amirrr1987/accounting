<script setup lang="ts">
import { computed, reactive, ref } from "vue";
import Dialog from "primevue/dialog";
import Button from "primevue/button";
import Select from "primevue/select";
import {
  DISPLAY_UNIT_LABELS,
  type DisplayUnit,
} from "@hesabyar/shared";
import { fetchBusinessSettings, updateBusinessSettings } from "@/lib/api";
import { applyMoneyDisplaySettings } from "@/composables/useMoneyDisplay";
import { ux } from "@/locale/ux-copy";

const visible = defineModel<boolean>("visible", { default: false });

const saving = ref(false);

const form = reactive({
  displayUnit: "TOMAN" as DisplayUnit,
  inputUnit: "TOMAN" as DisplayUnit,
  sameAsDisplay: true,
});

const unitOptions = computed(() =>
  (Object.keys(DISPLAY_UNIT_LABELS) as DisplayUnit[]).map((value) => ({
    label: DISPLAY_UNIT_LABELS[value],
    value,
  })),
);

const effectiveInputUnit = computed(() =>
  form.sameAsDisplay ? form.displayUnit : form.inputUnit,
);

async function save(): Promise<void> {
  saving.value = true;
  try {
    const current = await fetchBusinessSettings();
    const updated = await updateBusinessSettings({
      ...current,
      displayUnit: form.displayUnit,
      inputUnit: effectiveInputUnit.value,
      moneyDisplayConfigured: true,
    });
    applyMoneyDisplaySettings(updated);
    visible.value = false;
  } finally {
    saving.value = false;
  }
}

async function skip(): Promise<void> {
  saving.value = true;
  try {
    const current = await fetchBusinessSettings();
    if (!current.moneyDisplayConfigured) {
      const updated = await updateBusinessSettings({
        ...current,
        moneyDisplayConfigured: true,
      });
      applyMoneyDisplaySettings(updated);
    }
    visible.value = false;
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <Dialog
    v-model:visible="visible"
    modal
    :closable="false"
    :header="ux.moneySetup.title"
    class="w-full max-w-md"
  >
    <p class="text-sm text-[var(--hy-muted)] mt-0 mb-4 leading-relaxed">
      {{ ux.moneySetup.intro }}
    </p>
    <p class="text-xs text-[var(--hy-muted)] mb-4 p-3 rounded-lg bg-[var(--hy-primary-soft)]/40">
      {{ ux.moneySetup.storageNote }}
    </p>

    <div class="flex flex-col gap-4">
      <div class="flex flex-col gap-1">
        <label class="text-sm text-[var(--hy-muted)]">
          {{ ux.moneySetup.displayUnit }}
        </label>
        <Select
          v-model="form.displayUnit"
          :options="unitOptions"
          option-label="label"
          option-value="value"
          class="w-full"
        />
      </div>

      <div class="flex flex-col gap-1">
        <label class="text-sm text-[var(--hy-muted)]">
          {{ ux.moneySetup.inputUnit }}
        </label>
        <Select
          v-model="form.sameAsDisplay"
          :options="[
            { label: ux.moneySetup.sameAsDisplay, value: true },
            { label: ux.moneySetup.customInput, value: false },
          ]"
          option-label="label"
          option-value="value"
          class="w-full"
        />
      </div>

      <div v-if="!form.sameAsDisplay" class="flex flex-col gap-1">
        <label class="text-sm text-[var(--hy-muted)]">
          {{ ux.moneySetup.inputUnitCustom }}
        </label>
        <Select
          v-model="form.inputUnit"
          :options="unitOptions"
          option-label="label"
          option-value="value"
          class="w-full"
        />
      </div>
    </div>

    <template #footer>
      <Button
        :label="ux.moneySetup.skip"
        text
        @click="skip"
      />
      <Button
        :label="ux.moneySetup.save"
        icon="pi pi-check"
        :loading="saving"
        @click="save"
      />
    </template>
  </Dialog>
</template>
