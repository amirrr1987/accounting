import type { App, Directive, DirectiveBinding } from "vue";
import { nextTick } from "vue";
import { hasNonAsciiDigits, toAsciiDigits } from "@hesabyar/shared";

const SKIP_INPUT_TYPES = new Set([
  "checkbox",
  "radio",
  "file",
  "button",
  "submit",
  "reset",
  "hidden",
  "color",
  "range",
  "image",
]);

type LatinDigitsBinding = boolean | "on" | "off" | undefined;

function resolveEditable(
  el: Element,
): HTMLInputElement | HTMLTextAreaElement | null {
  if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
    return el;
  }
  return el.querySelector(
    "input.p-inputnumber-input, input.p-inputtext, input.p-password-input, input:not([type=hidden]), textarea",
  );
}

function isEnabled(el: HTMLInputElement | HTMLTextAreaElement): boolean {
  if (el.dataset.latinDigits === "off") return false;
  if (el instanceof HTMLInputElement && SKIP_INPUT_TYPES.has(el.type)) {
    return false;
  }
  return true;
}

function applyAsciiDigits(el: HTMLInputElement | HTMLTextAreaElement): void {
  if (!isEnabled(el)) return;
  const current = el.value;
  if (!hasNonAsciiDigits(current)) return;

  const next = toAsciiDigits(current);
  if (next === current) return;

  const start = el.selectionStart;
  const end = el.selectionEnd;
  el.value = next;

  if (start !== null && end !== null && el === document.activeElement) {
    el.setSelectionRange(start, end);
  }

  el.dispatchEvent(new Event("input", { bubbles: true }));
}

function setFlag(
  el: HTMLInputElement | HTMLTextAreaElement,
  binding: DirectiveBinding<LatinDigitsBinding>,
): void {
  const value = binding.value;
  const off = value === false || value === "off";
  el.dataset.latinDigits = off ? "off" : "on";
}

function bindHost(
  el: HTMLElement,
  binding: DirectiveBinding<LatinDigitsBinding>,
  convert = true,
): void {
  const apply = (): void => {
    const input = resolveEditable(el);
    if (!input) return;
    setFlag(input, binding);
    if (convert) applyAsciiDigits(input);
  };
  apply();
  if (convert) void nextTick(apply);
}

function onCaptureInput(event: Event): void {
  const target = event.target;
  if (
    !(target instanceof HTMLInputElement) &&
    !(target instanceof HTMLTextAreaElement)
  ) {
    return;
  }
  applyAsciiDigits(target);
}

/**
 * v-latin-digits — تبدیل زنده ارقام فارسی/عربی به انگلیسی
 * - پیش‌فرض سراسری روی همه input/textarea فعال است
 * - روی کامپوننت: v-latin-digits یا v-latin-digits="false" برای خاموش کردن
 */
export const latinDigitsDirective: Directive<
  HTMLElement,
  LatinDigitsBinding
> = {
  mounted(el, binding) {
    bindHost(el, binding, true);
  },
  updated(el, binding) {
    // فقط فلگ — تبدیل روی capture input است تا با InputNumber(fa-IR) نجنگد
    bindHost(el, binding, false);
  },
  unmounted(el) {
    const input = resolveEditable(el);
    if (!input) return;
    delete input.dataset.latinDigits;
  },
};

let captureInstalled = false;

/** نصب directive + شنود سراسری برای همه فیلدهای متنی/عددی */
export function installLatinDigits(app: App): void {
  app.directive("latin-digits", latinDigitsDirective);

  if (captureInstalled || typeof document === "undefined") return;
  document.addEventListener("input", onCaptureInput, true);
  captureInstalled = true;
}
