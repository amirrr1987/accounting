import { computed, ref } from "vue";
import {
  DISPLAY_UNIT_LABELS,
  DISPLAY_UNIT_SHORT_LABELS,
  formatMoneyRial,
  formatMoneyWithUnit,
  parseDisplayInputToRial,
  type BusinessSettings,
  type DisplayUnit,
} from "@hesabyar/shared";

const displayUnit = ref<DisplayUnit>("RIAL");
const inputUnit = ref<DisplayUnit>("RIAL");
const moneyDisplayConfigured = ref(false);
const loaded = ref(false);

export function applyMoneyDisplaySettings(settings: BusinessSettings): void {
  displayUnit.value = settings.displayUnit;
  inputUnit.value = settings.inputUnit;
  moneyDisplayConfigured.value = settings.moneyDisplayConfigured;
  loaded.value = true;
}

export function useMoneyDisplay() {
  const displayLabel = computed(() => DISPLAY_UNIT_LABELS[displayUnit.value]);
  const inputLabel = computed(() => DISPLAY_UNIT_LABELS[inputUnit.value]);
  const displayShortLabel = computed(
    () => DISPLAY_UNIT_SHORT_LABELS[displayUnit.value],
  );

  function formatMoney(value: string | number | bigint): string {
    return formatMoneyRial(value, displayUnit.value);
  }

  function formatMoneyFull(value: string | number | bigint): string {
    return formatMoneyWithUnit(value, displayUnit.value);
  }

  function parseMoneyInput(raw: string): string {
    return parseDisplayInputToRial(raw, inputUnit.value);
  }

  return {
    displayUnit,
    inputUnit,
    moneyDisplayConfigured,
    loaded,
    displayLabel,
    inputLabel,
    displayShortLabel,
    formatMoney,
    formatMoneyFull,
    parseMoneyInput,
    applyMoneyDisplaySettings,
  };
}

/** برای ماژول‌های غیر-Vue (مثل export/print) */
export function getDisplayUnit(): DisplayUnit {
  return displayUnit.value;
}

export function getInputUnit(): DisplayUnit {
  return inputUnit.value;
}

export function formatMoneyForDisplay(value: string | number | bigint): string {
  return formatMoneyRial(value, displayUnit.value);
}

export function parseMoneyInputForDisplay(raw: string): string {
  return parseDisplayInputToRial(raw, inputUnit.value);
}
