<script setup lang="ts">
import { computed, reactive, ref } from "vue";
import { useRouter } from "vue-router";
import Password from "primevue/password";
import Button from "primevue/button";
import Toast from "primevue/toast";
import { useToast } from "primevue/usetoast";
import { ChangePasswordSchema } from "@hesabyar/shared";
import { changePassword } from "@/lib/api";
import { useAuth } from "@/composables/useAuth";
import { ux } from "@/locale/ux-copy";

const router = useRouter();
const toast = useToast();
const { setSession, user, clearSession } = useAuth();

const form = reactive({
  currentPassword: "",
  newPassword: "",
  confirmPassword: "",
});
const errors = reactive({
  currentPassword: "",
  newPassword: "",
  confirmPassword: "",
});
const loading = ref(false);
const formError = ref("");

const canSubmit = computed(() => {
  if (loading.value) return false;
  return ChangePasswordSchema.safeParse(form).success;
});

function fieldError(
  issues: { path: (string | number)[]; message: string }[],
  field: keyof typeof errors,
): string {
  return issues.find((i) => i.path[0] === field)?.message ?? "";
}

function validate(): boolean {
  const parsed = ChangePasswordSchema.safeParse(form);
  if (parsed.success) {
    errors.currentPassword = "";
    errors.newPassword = "";
    errors.confirmPassword = "";
    return true;
  }
  errors.currentPassword = fieldError(parsed.error.issues, "currentPassword");
  errors.newPassword = fieldError(parsed.error.issues, "newPassword");
  errors.confirmPassword = fieldError(parsed.error.issues, "confirmPassword");
  return false;
}

async function submit(): Promise<void> {
  formError.value = "";
  if (!validate()) return;
  loading.value = true;
  try {
    const body = ChangePasswordSchema.parse(form);
    const res = await changePassword(body);
    setSession(res.accessToken, res.user, res.sessionId);
    toast.add({
      severity: "success",
      summary: ux.changePassword.successTitle,
      detail: ux.changePassword.successDetail,
      life: 3000,
    });
    await router.replace("/");
  } catch (err: unknown) {
    const message =
      err &&
      typeof err === "object" &&
      "response" in err &&
      err.response &&
      typeof err.response === "object" &&
      "data" in err.response &&
      err.response.data &&
      typeof err.response.data === "object" &&
      "message" in err.response.data
        ? String(err.response.data.message)
        : ux.changePassword.errorDetail;
    formError.value = message;
    toast.add({
      severity: "error",
      summary: ux.changePassword.errorTitle,
      detail: message,
      life: 4500,
    });
  } finally {
    loading.value = false;
  }
}

async function cancelToLogin(): Promise<void> {
  try {
    const { logout } = await import("@/lib/api");
    await logout();
  } catch {
    /* ignore */
  }
  clearSession();
  await router.replace("/login");
}
</script>

<template>
  <div
    class="min-h-[100dvh] flex items-center justify-center p-4 sm:p-8"
    dir="rtl"
  >
    <Toast />
    <main class="w-full max-w-md">
      <form
        class="hy-surface p-6 sm:p-8 space-y-5 shadow-sm"
        novalidate
        @submit.prevent="submit"
      >
        <header class="text-center space-y-2">
          <p class="text-xs font-medium text-[var(--hy-muted)] m-0">
            {{ ux.brand.name }}
          </p>
          <h1 class="text-2xl font-bold text-[var(--hy-text)] m-0">
            {{ ux.changePassword.title }}
          </h1>
          <p class="text-sm text-[var(--hy-muted)] m-0 leading-relaxed">
            {{ ux.changePassword.subtitle(user?.username ?? "admin") }}
          </p>
        </header>

        <div
          v-if="formError"
          class="rounded-lg px-3 py-2 text-sm"
          style="background: var(--hy-danger-soft); color: var(--hy-danger)"
          role="alert"
        >
          {{ formError }}
        </div>

        <div class="flex flex-col gap-1.5">
          <label class="text-sm font-medium">{{ ux.changePassword.current }}</label>
          <Password
            v-latin-digits
            v-model="form.currentPassword"
            :feedback="false"
            toggle-mask
            class="w-full"
            input-class="w-full min-h-11"
            :invalid="Boolean(errors.currentPassword)"
          />
          <p v-if="errors.currentPassword" class="hy-field-error m-0" role="alert">
            {{ errors.currentPassword }}
          </p>
        </div>

        <div class="flex flex-col gap-1.5">
          <label class="text-sm font-medium">{{ ux.changePassword.next }}</label>
          <Password
            v-latin-digits
            v-model="form.newPassword"
            :feedback="false"
            toggle-mask
            class="w-full"
            input-class="w-full min-h-11"
            :invalid="Boolean(errors.newPassword)"
          />
          <p v-if="errors.newPassword" class="hy-field-error m-0" role="alert">
            {{ errors.newPassword }}
          </p>
        </div>

        <div class="flex flex-col gap-1.5">
          <label class="text-sm font-medium">{{ ux.changePassword.confirm }}</label>
          <Password
            v-latin-digits
            v-model="form.confirmPassword"
            :feedback="false"
            toggle-mask
            class="w-full"
            input-class="w-full min-h-11"
            :invalid="Boolean(errors.confirmPassword)"
          />
          <p v-if="errors.confirmPassword" class="hy-field-error m-0" role="alert">
            {{ errors.confirmPassword }}
          </p>
        </div>

        <Button
          type="submit"
          :label="loading ? ux.changePassword.submitting : ux.changePassword.submit"
          icon="pi pi-key"
          class="w-full min-h-11"
          :loading="loading"
          :disabled="!canSubmit"
        />
        <Button
          type="button"
          :label="ux.changePassword.backToLogin"
          text
          class="w-full"
          @click="cancelToLogin"
        />
      </form>
    </main>
  </div>
</template>
