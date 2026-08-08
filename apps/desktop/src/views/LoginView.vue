<script setup lang="ts">
import { computed, reactive, ref } from "vue";
import { useRouter } from "vue-router";
import InputText from "primevue/inputtext";
import Password from "primevue/password";
import Button from "primevue/button";
import Toast from "primevue/toast";
import { useToast } from "primevue/usetoast";
import { login } from "@/lib/api";
import { useAuth } from "@/composables/useAuth";
import { ux } from "@/locale/ux-copy";

const router = useRouter();
const toast = useToast();
const { setSession } = useAuth();

const form = reactive({
  username: "",
  password: "",
});
const errors = reactive({
  username: "",
  password: "",
});
const loading = ref(false);
const formError = ref("");

const canSubmit = computed(
  () => Boolean(form.username.trim()) && Boolean(form.password) && !loading.value,
);

function validate(): boolean {
  errors.username = form.username.trim() ? "" : ux.auth.requiredUsername;
  errors.password = form.password ? "" : ux.auth.requiredPassword;
  return !errors.username && !errors.password;
}

async function submit(): Promise<void> {
  formError.value = "";
  if (!validate()) return;
  loading.value = true;
  try {
    const res = await login({
      username: form.username.trim(),
      password: form.password,
    });
    setSession(res.accessToken, res.user);
    toast.add({
      severity: "success",
      summary: ux.auth.successTitle,
      detail: ux.auth.successDetail(res.user.username),
      life: 2500,
    });
    await router.replace("/");
  } catch {
    formError.value = ux.auth.errorDetail;
    toast.add({
      severity: "error",
      summary: ux.auth.errorTitle,
      detail: ux.auth.errorDetail,
      life: 4500,
    });
  } finally {
    loading.value = false;
  }
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
          <p
            class="text-xs font-medium tracking-wide text-[var(--hy-muted)] m-0 uppercase"
          >
            {{ ux.brand.name }}
          </p>
          <h1 class="text-2xl sm:text-3xl font-bold text-[var(--hy-text)] m-0">
            {{ ux.auth.title }}
          </h1>
          <p class="text-sm text-[var(--hy-muted)] m-0 leading-relaxed">
            {{ ux.auth.subtitle }}
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
          <label for="login-username" class="text-sm font-medium text-[var(--hy-text)]">
            {{ ux.auth.username }}
            <span class="text-[var(--hy-danger)]" aria-hidden="true">*</span>
          </label>
          <InputText
            id="login-username"
            v-model="form.username"
            autocomplete="username"
            class="w-full min-h-11"
            :invalid="Boolean(errors.username)"
            :aria-invalid="Boolean(errors.username)"
            :aria-describedby="errors.username ? 'username-err' : 'username-hint'"
            @blur="errors.username = form.username.trim() ? '' : ux.auth.requiredUsername"
          />
          <p id="username-hint" class="text-xs text-[var(--hy-muted)] m-0">
            {{ ux.auth.usernameHint }}
          </p>
          <p
            v-if="errors.username"
            id="username-err"
            class="hy-field-error m-0"
            role="alert"
          >
            {{ errors.username }}
          </p>
        </div>

        <div class="flex flex-col gap-1.5">
          <label for="login-password" class="text-sm font-medium text-[var(--hy-text)]">
            {{ ux.auth.password }}
            <span class="text-[var(--hy-danger)]" aria-hidden="true">*</span>
          </label>
          <Password
            input-id="login-password"
            v-model="form.password"
            :feedback="false"
            toggle-mask
            input-class="w-full min-h-11"
            class="w-full"
            autocomplete="current-password"
            :invalid="Boolean(errors.password)"
            @blur="errors.password = form.password ? '' : ux.auth.requiredPassword"
          />
          <p
            v-if="errors.password"
            class="hy-field-error m-0"
            role="alert"
          >
            {{ errors.password }}
          </p>
        </div>

        <Button
          type="submit"
          :label="loading ? ux.auth.submitting : ux.auth.submit"
          icon="pi pi-sign-in"
          class="w-full min-h-11"
          :loading="loading"
          :disabled="!canSubmit"
        />

        <p class="text-xs text-center text-[var(--hy-muted)] m-0 leading-relaxed">
          {{ ux.auth.demoHint }}
        </p>
      </form>
    </main>
  </div>
</template>
