import { describe, expect, it, beforeEach } from "vitest";
import {
  isOnboardingDone,
  markOnboardingDone,
  resetOnboarding,
} from "./useOnboarding";

describe("useOnboarding", () => {
  beforeEach(() => {
    resetOnboarding();
  });

  it("tracks first-run onboarding", () => {
    expect(isOnboardingDone()).toBe(false);
    markOnboardingDone();
    expect(isOnboardingDone()).toBe(true);
  });
});
