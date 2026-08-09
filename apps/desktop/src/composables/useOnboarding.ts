import { ref } from "vue";

const STORAGE_KEY = "hesabyar-onboarding-done";

let memoryDone = false;

export function isOnboardingDone(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return memoryDone;
  }
}

export function markOnboardingDone(): void {
  memoryDone = true;
  try {
    localStorage.setItem(STORAGE_KEY, "1");
  } catch {
    /* ignore */
  }
}

export function resetOnboarding(): void {
  memoryDone = false;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

export function useOnboarding() {
  const pending = ref(!isOnboardingDone());

  function complete(): void {
    markOnboardingDone();
    pending.value = false;
  }

  function skip(): void {
    complete();
  }

  return { pending, complete, skip };
}
