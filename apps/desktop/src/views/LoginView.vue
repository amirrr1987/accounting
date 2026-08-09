<script setup lang="ts">
import { computed, reactive, ref } from "vue";
import { useRouter } from "vue-router";
import InputText from "primevue/inputtext";
import Password from "primevue/password";
import Button from "primevue/button";
import Toast from "primevue/toast";
import { useToast } from "primevue/usetoast";
import { LoginSchema } from "@hesabyar/shared";
import { login } from "@/lib/api";
import { buildLoginClientMeta } from "@/lib/login-client";
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

const canSubmit = computed(() => {
  if (loading.value) return false;
  const parsed = LoginSchema.safeParse({
    username: form.username,
    password: form.password,
  });
  return parsed.success;
});

function fieldError(
  issues: { path: (string | number)[]; message: string }[],
  field: "username" | "password",
): string {
  return issues.find((i) => i.path[0] === field)?.message ?? "";
}

function validate(): boolean {
  const parsed = LoginSchema.safeParse({
    username: form.username,
    password: form.password,
  });
  if (parsed.success) {
    errors.username = "";
    errors.password = "";
    form.username = parsed.data.username;
    return true;
  }
  errors.username = fieldError(parsed.error.issues, "username") || ux.auth.requiredUsername;
  errors.password = fieldError(parsed.error.issues, "password") || ux.auth.requiredPassword;
  return false;
}

function validateField(field: "username" | "password"): void {
  const schema = LoginSchema.shape[field];
  const parsed = schema.safeParse(form[field]);
  errors[field] = parsed.success
    ? ""
    : (parsed.error.issues[0]?.message ?? "");
}

async function submit(): Promise<void> {
  formError.value = "";
  if (!validate()) return;
  loading.value = true;
  try {
    const body = LoginSchema.parse({
      username: form.username,
      password: form.password,
      client: buildLoginClientMeta(),
    });
    const res = await login(body);
    setSession(res.accessToken, res.user, res.sessionId);
    const detail = res.isNewDevice
      ? ux.auth.successNewDevice(res.user.username)
      : ux.auth.successDetail(res.user.username);
    toast.add({
      severity: res.isNewDevice ? "warn" : "success",
      summary: ux.auth.successTitle,
      detail,
      life: 3000,
    });
    await router.replace("/");
  } catch (err: unknown) {
    const status =
      err &&
      typeof err === "object" &&
      "response" in err &&
      err.response &&
      typeof err.response === "object" &&
      "status" in err.response
        ? Number(err.response.status)
        : 0;
    formError.value =
      status === 429 ? ux.auth.lockoutDetail : ux.auth.errorDetail;
    toast.add({
      severity: "error",
      summary: ux.auth.errorTitle,
      detail: formError.value,
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
            v-latin-digits
            id="login-username"
            v-model="form.username"
            autocomplete="username"
            class="w-full min-h-11"
            maxlength="64"
            :invalid="Boolean(errors.username)"
            :aria-invalid="Boolean(errors.username)"
            :aria-describedby="errors.username ? 'username-err' : 'username-hint'"
            @blur="validateField('username')"
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
            v-latin-digits
            input-id="login-password"
            v-model="form.password"
            :feedback="false"
            toggle-mask
            input-class="w-full min-h-11"
            class="w-full"
            autocomplete="current-password"
            :input-props="{ maxlength: 128 }"
            :invalid="Boolean(errors.password)"
            @blur="validateField('password')"
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
