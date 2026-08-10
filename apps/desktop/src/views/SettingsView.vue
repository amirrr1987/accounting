<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from "vue";
import TabView from "primevue/tabview";
import TabPanel from "primevue/tabpanel";
import Button from "primevue/button";
import DataTable from "primevue/datatable";
import Column from "primevue/column";
import Dialog from "primevue/dialog";
import InputText from "primevue/inputtext";
import Textarea from "primevue/textarea";
import Password from "primevue/password";
import Select from "primevue/select";
import Tag from "primevue/tag";
import Toast from "primevue/toast";
import ConfirmDialog from "primevue/confirmdialog";
import { useConfirm } from "primevue/useconfirm";
import { useToast } from "primevue/usetoast";
import {
  AUDIT_ACTION_LABELS,
  BackupSnapshotSchema,
  BUSINESS_TYPE_LABELS,
  CreateUserSchema,
  DISPLAY_UNIT_LABELS,
  LOGIN_CLIENT_TYPE_LABELS,
  LOGIN_FAIL_REASON_LABELS,
  LOGIN_RISK_FLAG_LABELS,
  USER_ROLE_LABELS,
  canWrite,
  type AuditLog,
  type AuditAction,
  type BusinessSettings,
  type BusinessType,
  type DisplayUnit,
  type LoginEvent,
  type UserRecord,
  type UserRole,
} from "@hesabyar/shared";
import {
  createUser,
  exportBackup,
  fetchAuditLogs,
  fetchBusinessSettings,
  fetchLoginEvents,
  fetchUsers,
  restoreBackup,
  updateBusinessSettings,
  updateUser,
} from "@/lib/api";
import { apiErrorMessage } from "@/lib/api-error";
import { downloadBackupJson, readBackupFile } from "@/lib/backup-download";
import PageHeader from "@/components/PageHeader.vue";
import MobileListCard from "@/components/MobileListCard.vue";
import { applyMoneyDisplaySettings } from "@/composables/useMoneyDisplay";
import { usePageCopy } from "@/composables/usePageCopy";
import { useAuth } from "@/composables/useAuth";
import { ux } from "@/locale/ux-copy";

const toast = useToast();
const confirm = useConfirm();
const { copy: pageCopy, isMobile } = usePageCopy("settings");
const { user } = useAuth();
const loading = ref(false);

const isAdmin = computed(() => user.value?.role === "ADMIN");
const canEditBusiness = computed(() =>
  user.value ? canWrite(user.value.role) : false,
);

const users = ref<UserRecord[]>([]);
const auditLogs = ref<AuditLog[]>([]);
const loginEvents = ref<LoginEvent[]>([]);
const userDialog = ref(false);
const userFormErrors = reactive({ username: "", password: "" });
const savingUser = ref(false);
const savingBusiness = ref(false);
const savingMoney = ref(false);
const restoreInput = ref<HTMLInputElement | null>(null);

const businessForm = reactive({
  businessName: "",
  businessType: "SHOP" as BusinessType,
  businessTypeCustom: "",
  legalName: "",
  nationalId: "",
  economicCode: "",
  phone: "",
  mobile: "",
  address: "",
  city: "",
  postalCode: "",
  description: "",
});

const moneyForm = reactive({
  displayUnit: "RIAL" as DisplayUnit,
  inputUnit: "RIAL" as DisplayUnit,
  sameAsDisplay: true,
});

const businessTypeOptions = (
  Object.keys(BUSINESS_TYPE_LABELS) as BusinessType[]
).map((value) => ({
  label: BUSINESS_TYPE_LABELS[value],
  value,
}));

const displayUnitOptions = (
  Object.keys(DISPLAY_UNIT_LABELS) as DisplayUnit[]
).map((value) => ({
  label: DISPLAY_UNIT_LABELS[value],
  value,
}));

const inputModeOptions = [
  { label: ux.settings.moneySameAsDisplay, value: true },
  { label: ux.settings.moneyCustomInput, value: false },
];

const effectiveMoneyInputUnit = computed(() =>
  moneyForm.sameAsDisplay ? moneyForm.displayUnit : moneyForm.inputUnit,
);

const userForm = reactive({
  username: "",
  password: "",
  role: "ACCOUNTANT" as UserRole,
});

const roleOptions = (Object.keys(USER_ROLE_LABELS) as UserRole[]).map(
  (value) => ({
    label: USER_ROLE_LABELS[value],
    value,
  }),
);

function fillBusinessForm(data: BusinessSettings): void {
  businessForm.businessName = data.businessName;
  businessForm.businessType = data.businessType;
  businessForm.businessTypeCustom = data.businessTypeCustom ?? "";
  businessForm.legalName = data.legalName ?? "";
  businessForm.nationalId = data.nationalId ?? "";
  businessForm.economicCode = data.economicCode ?? "";
  businessForm.phone = data.phone ?? "";
  businessForm.mobile = data.mobile ?? "";
  businessForm.address = data.address ?? "";
  businessForm.city = data.city ?? "";
  businessForm.postalCode = data.postalCode ?? "";
  businessForm.description = data.description ?? "";
  fillMoneyForm(data);
}

function fillMoneyForm(data: BusinessSettings): void {
  moneyForm.displayUnit = data.displayUnit;
  moneyForm.inputUnit = data.inputUnit;
  moneyForm.sameAsDisplay = data.inputUnit === data.displayUnit;
}

async function loadBusiness(): Promise<void> {
  const data = await fetchBusinessSettings();
  fillBusinessForm(data);
}

async function loadUsers(): Promise<void> {
  users.value = await fetchUsers();
}

async function loadAudit(): Promise<void> {
  auditLogs.value = await fetchAuditLogs(100);
}

async function loadLoginEvents(): Promise<void> {
  loginEvents.value = await fetchLoginEvents({ limit: 100 });
}

function loginEventMeta(ev: LoginEvent): string {
  const parts = [
    ev.success
      ? "موفق"
      : (ev.failReason
          ? LOGIN_FAIL_REASON_LABELS[ev.failReason]
          : "ناموفق"),
    ev.ip ?? null,
    LOGIN_CLIENT_TYPE_LABELS[ev.clientType],
    ev.appVersion ? `v${ev.appVersion}` : null,
    ev.isNewDevice ? "دستگاه جدید" : null,
    ev.riskFlags.length
      ? ev.riskFlags.map((f) => LOGIN_RISK_FLAG_LABELS[f]).join("، ")
      : null,
  ].filter(Boolean);
  return parts.join(" · ");
}

onMounted(async () => {
  loading.value = true;
  try {
    await loadBusiness();
    if (isAdmin.value) {
      await Promise.all([loadUsers(), loadAudit(), loadLoginEvents()]);
    }
  } catch {
    toast.add({ severity: "error", summary: ux.settings.loadError, life: 4000 });
  } finally {
    loading.value = false;
  }
});

async function saveBusiness(): Promise<void> {
  if (!canEditBusiness.value || !businessForm.businessName.trim()) return;
  savingBusiness.value = true;
  try {
    const current = await fetchBusinessSettings();
    const updated = await updateBusinessSettings({
      businessName: businessForm.businessName.trim(),
      businessType: businessForm.businessType,
      businessTypeCustom:
        businessForm.businessType === "OTHER"
          ? businessForm.businessTypeCustom.trim() || null
          : null,
      legalName: businessForm.legalName.trim() || null,
      nationalId: businessForm.nationalId.trim() || null,
      economicCode: businessForm.economicCode.trim() || null,
      phone: businessForm.phone.trim() || null,
      mobile: businessForm.mobile.trim() || null,
      address: businessForm.address.trim() || null,
      city: businessForm.city.trim() || null,
      postalCode: businessForm.postalCode.trim() || null,
      description: businessForm.description.trim() || null,
      displayUnit: current.displayUnit,
      inputUnit: current.inputUnit,
      moneyDisplayConfigured: current.moneyDisplayConfigured,
    });
    fillBusinessForm(updated);
    toast.add({
      severity: "success",
      summary: ux.settings.businessSaved,
      life: 3000,
    });
  } catch (err: unknown) {
    toast.add({
      severity: "error",
      summary: ux.settings.businessError,
      detail: apiErrorMessage(err, ux.settings.businessError),
      life: 6000,
    });
  } finally {
    savingBusiness.value = false;
  }
}

async function saveMoney(): Promise<void> {
  if (!canEditBusiness.value) return;
  savingMoney.value = true;
  try {
    const current = await fetchBusinessSettings();
    const updated = await updateBusinessSettings({
      ...current,
      displayUnit: moneyForm.displayUnit,
      inputUnit: effectiveMoneyInputUnit.value,
      moneyDisplayConfigured: true,
    });
    fillMoneyForm(updated);
    applyMoneyDisplaySettings(updated);
    toast.add({
      severity: "success",
      summary: ux.settings.moneySaved,
      life: 3000,
    });
  } catch (err: unknown) {
    toast.add({
      severity: "error",
      summary: ux.settings.moneyError,
      detail: apiErrorMessage(err, ux.settings.moneyError),
      life: 6000,
    });
  } finally {
    savingMoney.value = false;
  }
}

watch(
  () => moneyForm.displayUnit,
  () => {
    if (moneyForm.sameAsDisplay) {
      moneyForm.inputUnit = moneyForm.displayUnit;
    }
  },
);

function openUserDialog(): void {
  userForm.username = "";
  userForm.password = "";
  userForm.role = "ACCOUNTANT";
  userDialog.value = true;
}

async function saveUser(): Promise<void> {
  const parsed = CreateUserSchema.safeParse({
    username: userForm.username,
    password: userForm.password,
    role: userForm.role,
  });
  if (!parsed.success) {
    userFormErrors.username =
      parsed.error.issues.find((i) => i.path[0] === "username")?.message ?? "";
    userFormErrors.password =
      parsed.error.issues.find((i) => i.path[0] === "password")?.message ?? "";
    return;
  }
  userFormErrors.username = "";
  userFormErrors.password = "";
  savingUser.value = true;
  try {
    await createUser(parsed.data);
    userDialog.value = false;
    userForm.username = "";
    userForm.password = "";
    userForm.role = "ACCOUNTANT";
    toast.add({ severity: "success", summary: ux.settings.userCreated, life: 3000 });
    await loadUsers();
  } catch (err: unknown) {
    toast.add({
      severity: "error",
      summary: ux.settings.userError,
      detail: apiErrorMessage(err, ux.settings.userError),
      life: 6000,
    });
  } finally {
    savingUser.value = false;
  }
}

async function toggleUserActive(row: UserRecord): Promise<void> {
  const nextActive = !row.isActive;
  confirm.require({
    message: nextActive
      ? `آیا «${row.username}» فعال شود؟`
      : `آیا «${row.username}» غیرفعال شود؟`,
    header: "تأیید تغییر وضعیت کاربر",
    icon: "pi pi-exclamation-triangle",
    acceptLabel: "تأیید",
    rejectLabel: "انصراف",
    acceptClass: nextActive ? "p-button-success" : "p-button-danger",
    accept: () => {
      void (async () => {
        try {
          await updateUser(row.id, { isActive: nextActive });
          await loadUsers();
        } catch (err: unknown) {
          toast.add({
            severity: "error",
            summary: ux.settings.userError,
            detail: apiErrorMessage(err, ux.settings.userError),
            life: 6000,
          });
        }
      })();
    },
  });
}

async function onExportBackup(): Promise<void> {
  loading.value = true;
  try {
    const snapshot = await exportBackup();
    downloadBackupJson(snapshot);
    toast.add({ severity: "success", summary: ux.settings.backupExported, life: 3000 });
    await loadAudit();
  } catch (err: unknown) {
    toast.add({
      severity: "error",
      summary: ux.settings.backupError,
      detail: apiErrorMessage(err, ux.settings.backupError),
      life: 6000,
    });
  } finally {
    loading.value = false;
  }
}

function onRestoreFile(event: Event): void {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;
  confirm.require({
    message: ux.settings.restoreConfirm,
    header: ux.settings.restoreTitle,
    icon: "pi pi-exclamation-triangle",
    acceptLabel: ux.settings.restoreAccept,
    rejectLabel: ux.common.cancel,
    acceptClass: "p-button-danger",
    accept: () => {
      void (async () => {
        loading.value = true;
        try {
          const raw = await readBackupFile(file);
          await restoreBackup(BackupSnapshotSchema.parse(raw));
          toast.add({
            severity: "success",
            summary: ux.settings.backupRestored,
            life: 4000,
          });
          await loadAudit();
        } catch (err: unknown) {
          toast.add({
            severity: "error",
            summary: ux.settings.backupError,
            detail: apiErrorMessage(err, ux.settings.backupError),
            life: 6000,
          });
        } finally {
          loading.value = false;
          input.value = "";
        }
      })();
    },
    reject: () => {
      input.value = "";
    },
  });
}
</script>

<template>
  <div :class="isMobile ? 'hy-page-mobile space-y-4' : 'hy-page'" dir="rtl">
    <Toast />
    <ConfirmDialog />

    <PageHeader
      :title="pageCopy.title"
      :subtitle="pageCopy.subtitle"
      :hint="pageCopy.hint"
    />

    <TabView>
      <TabPanel :header="ux.settings.businessTab" value="business">
        <div class="hy-surface p-4 grid grid-cols-1 md:grid-cols-2 gap-4 max-w-3xl">
          <div class="flex flex-col gap-1 md:col-span-2">
            <label class="text-sm text-[var(--hy-muted)]">{{ ux.settings.businessName }}</label>
            <InputText
              v-model="businessForm.businessName"
              class="min-h-11"
              :disabled="!canEditBusiness"
            />
          </div>
          <div class="flex flex-col gap-1">
            <label class="text-sm text-[var(--hy-muted)]">{{ ux.settings.businessType }}</label>
            <Select
              v-model="businessForm.businessType"
              :options="businessTypeOptions"
              option-label="label"
              option-value="value"
              class="w-full"
              :disabled="!canEditBusiness"
            />
          </div>
          <div
            v-if="businessForm.businessType === 'OTHER'"
            class="flex flex-col gap-1"
          >
            <label class="text-sm text-[var(--hy-muted)]">{{ ux.settings.businessTypeCustom }}</label>
            <InputText
              v-model="businessForm.businessTypeCustom"
              class="min-h-11"
              :disabled="!canEditBusiness"
            />
          </div>
          <div class="flex flex-col gap-1 md:col-span-2">
            <label class="text-sm text-[var(--hy-muted)]">{{ ux.settings.legalName }}</label>
            <InputText
              v-model="businessForm.legalName"
              class="min-h-11"
              :disabled="!canEditBusiness"
            />
          </div>
          <div class="flex flex-col gap-1">
            <label class="text-sm text-[var(--hy-muted)]">{{ ux.settings.nationalId }}</label>
            <InputText
              v-latin-digits
              v-model="businessForm.nationalId"
              dir="ltr"
              class="min-h-11"
              :disabled="!canEditBusiness"
            />
          </div>
          <div class="flex flex-col gap-1">
            <label class="text-sm text-[var(--hy-muted)]">{{ ux.settings.economicCode }}</label>
            <InputText
              v-latin-digits
              v-model="businessForm.economicCode"
              dir="ltr"
              class="min-h-11"
              :disabled="!canEditBusiness"
            />
          </div>
          <div class="flex flex-col gap-1">
            <label class="text-sm text-[var(--hy-muted)]">{{ ux.settings.phone }}</label>
            <InputText
              v-latin-digits
              v-model="businessForm.phone"
              dir="ltr"
              class="min-h-11"
              :disabled="!canEditBusiness"
            />
          </div>
          <div class="flex flex-col gap-1">
            <label class="text-sm text-[var(--hy-muted)]">{{ ux.settings.mobile }}</label>
            <InputText
              v-latin-digits
              v-model="businessForm.mobile"
              dir="ltr"
              class="min-h-11"
              :disabled="!canEditBusiness"
            />
          </div>
          <div class="flex flex-col gap-1">
            <label class="text-sm text-[var(--hy-muted)]">{{ ux.settings.city }}</label>
            <InputText
              v-model="businessForm.city"
              class="min-h-11"
              :disabled="!canEditBusiness"
            />
          </div>
          <div class="flex flex-col gap-1">
            <label class="text-sm text-[var(--hy-muted)]">{{ ux.settings.postalCode }}</label>
            <InputText
              v-latin-digits
              v-model="businessForm.postalCode"
              dir="ltr"
              class="min-h-11"
              :disabled="!canEditBusiness"
            />
          </div>
          <div class="flex flex-col gap-1 md:col-span-2">
            <label class="text-sm text-[var(--hy-muted)]">{{ ux.settings.address }}</label>
            <Textarea
              v-model="businessForm.address"
              rows="2"
              class="w-full"
              :disabled="!canEditBusiness"
            />
          </div>
          <div class="flex flex-col gap-1 md:col-span-2">
            <label class="text-sm text-[var(--hy-muted)]">{{ ux.settings.description }}</label>
            <Textarea
              v-model="businessForm.description"
              rows="2"
              class="w-full"
              :disabled="!canEditBusiness"
            />
          </div>
          <Button
            v-if="canEditBusiness"
            :label="ux.common.save"
            icon="pi pi-check"
            class="min-h-11 md:col-span-2"
            :loading="savingBusiness"
            @click="saveBusiness"
          />
        </div>
      </TabPanel>

      <TabPanel :header="ux.settings.moneyTab" value="money">
        <div class="hy-surface p-4 flex flex-col gap-4 max-w-xl">
          <p class="text-sm text-[var(--hy-muted)] m-0 leading-relaxed">
            {{ ux.settings.moneyStorageNote }}
          </p>
          <div class="flex flex-col gap-1">
            <label class="text-sm text-[var(--hy-muted)]">
              {{ ux.settings.moneyFunctionalCurrency }}
            </label>
            <InputText
              :model-value="ux.settings.moneyFunctionalCurrencyValue"
              class="min-h-11"
              disabled
            />
          </div>
          <div class="flex flex-col gap-1">
            <label class="text-sm text-[var(--hy-muted)]">
              {{ ux.settings.moneyDisplayUnit }}
            </label>
            <Select
              v-model="moneyForm.displayUnit"
              :options="displayUnitOptions"
              option-label="label"
              option-value="value"
              class="w-full"
              :disabled="!canEditBusiness"
            />
          </div>
          <div class="flex flex-col gap-1">
            <label class="text-sm text-[var(--hy-muted)]">
              {{ ux.settings.moneyInputUnit }}
            </label>
            <Select
              v-model="moneyForm.sameAsDisplay"
              :options="inputModeOptions"
              option-label="label"
              option-value="value"
              class="w-full"
              :disabled="!canEditBusiness"
            />
          </div>
          <div v-if="!moneyForm.sameAsDisplay" class="flex flex-col gap-1">
            <label class="text-sm text-[var(--hy-muted)]">
              {{ ux.moneySetup.inputUnitCustom }}
            </label>
            <Select
              v-model="moneyForm.inputUnit"
              :options="displayUnitOptions"
              option-label="label"
              option-value="value"
              class="w-full"
              :disabled="!canEditBusiness"
            />
          </div>
          <Button
            v-if="canEditBusiness"
            :label="ux.common.save"
            icon="pi pi-check"
            class="min-h-11 self-start"
            :loading="savingMoney"
            @click="saveMoney"
          />
        </div>
      </TabPanel>

      <TabPanel v-if="isAdmin" header="پشتیبان" value="backup">
        <div class="hy-surface p-4 space-y-4 max-w-xl">
          <p class="text-sm text-[var(--hy-muted)] m-0">
            {{ ux.settings.adminSubtitle }}
          </p>
          <p class="text-sm text-[var(--hy-muted)] m-0">
            {{ ux.settings.backupHint }}
          </p>
          <div class="flex flex-wrap gap-2">
            <Button
              :label="ux.settings.exportBackup"
              icon="pi pi-download"
              class="min-h-11"
              :loading="loading"
              @click="onExportBackup"
            />
            <Button
              :label="ux.settings.restoreBackup"
              icon="pi pi-upload"
              severity="danger"
              outlined
              class="min-h-11"
              @click="restoreInput?.click()"
            />
            <input
              ref="restoreInput"
              type="file"
              accept="application/json,.json"
              class="sr-only"
              @change="onRestoreFile"
            />
          </div>
        </div>
      </TabPanel>

      <TabPanel v-if="isAdmin" header="کاربران" value="users">
        <div class="mb-3">
          <Button
            :label="ux.settings.addUser"
            icon="pi pi-user-plus"
            class="min-h-11"
            @click="openUserDialog"
          />
        </div>
        <ul
          v-if="isMobile"
          class="list-none m-0 p-0 space-y-2"
        >
          <li v-for="user in users" :key="user.id" class="hy-surface overflow-hidden">
            <MobileListCard
              :title="user.username"
              :subtitle="USER_ROLE_LABELS[user.role as UserRole]"
              :meta="user.isActive ? ux.common.active : ux.common.inactive"
              :meta-severity="user.isActive ? 'success' : 'secondary'"
            />
            <div class="px-4 pb-3">
              <Button
                :label="user.isActive ? 'غیرفعال' : 'فعال'"
                text
                size="small"
                class="min-h-10"
                @click="toggleUserActive(user)"
              />
            </div>
          </li>
        </ul>
        <DataTable v-else :value="users" :loading="loading" size="small">
          <Column field="username" header="نام کاربری" />
          <Column header="نقش">
            <template #body="{ data }">
              {{ USER_ROLE_LABELS[data.role as UserRole] }}
            </template>
          </Column>
          <Column header="وضعیت">
            <template #body="{ data }">
              <Tag
                :value="data.isActive ? ux.common.active : ux.common.inactive"
                :severity="data.isActive ? 'success' : 'secondary'"
              />
            </template>
          </Column>
          <Column header="عملیات">
            <template #body="{ data }">
              <Button
                :label="data.isActive ? 'غیرفعال' : 'فعال'"
                text
                size="small"
                @click="toggleUserActive(data)"
              />
            </template>
          </Column>
        </DataTable>
      </TabPanel>

      <TabPanel v-if="isAdmin" header="رویدادنگاری" value="audit">
        <ul
          v-if="isMobile"
          class="list-none m-0 p-0 space-y-2"
        >
          <li v-for="(log, i) in auditLogs" :key="`${log.createdAt}-${i}`">
            <MobileListCard
              :title="`${log.username} · ${AUDIT_ACTION_LABELS[log.action as AuditAction] ?? log.action}`"
              :subtitle="`${new Date(log.createdAt).toLocaleString('fa-IR')} · ${log.entity}`"
              :meta="log.detail || '—'"
              meta-severity="secondary"
            />
          </li>
        </ul>
        <DataTable v-else :value="auditLogs" :loading="loading" size="small" paginator :rows="15">
          <Column header="زمان">
            <template #body="{ data }">
              {{ new Date(data.createdAt).toLocaleString("fa-IR") }}
            </template>
          </Column>
          <Column field="username" header="کاربر" />
          <Column header="عمل">
            <template #body="{ data }">
              {{ AUDIT_ACTION_LABELS[data.action as AuditAction] ?? data.action }}
            </template>
          </Column>
          <Column field="entity" header="بخش" />
          <Column field="detail" header="جزئیات" />
        </DataTable>
      </TabPanel>

      <TabPanel v-if="isAdmin" header="لاگ ورود" value="login-events">
        <ul v-if="isMobile" class="list-none m-0 p-0 space-y-2">
          <li v-for="ev in loginEvents" :key="ev.id">
            <MobileListCard
              :title="`${ev.username} · ${ev.success ? 'موفق' : 'ناموفق'}`"
              :subtitle="new Date(ev.createdAt).toLocaleString('fa-IR')"
              :meta="loginEventMeta(ev)"
              :meta-severity="ev.success ? 'success' : 'danger'"
            />
          </li>
        </ul>
        <DataTable
          v-else
          :value="loginEvents"
          :loading="loading"
          size="small"
          paginator
          :rows="15"
        >
          <Column header="زمان">
            <template #body="{ data }">
              {{ new Date(data.createdAt).toLocaleString("fa-IR") }}
            </template>
          </Column>
          <Column field="username" header="کاربر" />
          <Column header="نتیجه">
            <template #body="{ data }">
              <Tag
                :value="data.success ? 'موفق' : 'ناموفق'"
                :severity="data.success ? 'success' : 'danger'"
              />
            </template>
          </Column>
          <Column header="IP">
            <template #body="{ data }">
              {{ data.ip || "—" }}
            </template>
          </Column>
          <Column header="کلاینت">
            <template #body="{ data }">
              {{ LOGIN_CLIENT_TYPE_LABELS[data.clientType as keyof typeof LOGIN_CLIENT_TYPE_LABELS] }}
              <span v-if="data.appVersion" class="text-[var(--hy-muted)]">
                · v{{ data.appVersion }}
              </span>
            </template>
          </Column>
          <Column header="دستگاه">
            <template #body="{ data }">
              {{ data.platform || "—" }}
              <span v-if="data.isNewDevice" class="text-amber-700"> · جدید</span>
            </template>
          </Column>
          <Column header="جزئیات">
            <template #body="{ data }">
              {{ loginEventMeta(data) }}
            </template>
          </Column>
        </DataTable>
      </TabPanel>
    </TabView>

    <Dialog
      v-model:visible="userDialog"
      modal
      :header="ux.settings.addUser"
      class="w-full max-w-md"
    >
      <div class="flex flex-col gap-3 pt-2">
        <label class="text-sm text-[var(--hy-muted)]">نام کاربری</label>
        <InputText
          v-latin-digits
          v-model="userForm.username"
          class="min-h-11"
          maxlength="64"
          :invalid="Boolean(userFormErrors.username)"
        />
        <p v-if="userFormErrors.username" class="hy-field-error m-0" role="alert">
          {{ userFormErrors.username }}
        </p>
        <label class="text-sm text-[var(--hy-muted)]">رمز عبور</label>
        <Password
          v-latin-digits
          v-model="userForm.password"
          :feedback="false"
          toggle-mask
          class="w-full"
          :input-props="{ maxlength: 128 }"
          :invalid="Boolean(userFormErrors.password)"
        />
        <p v-if="userFormErrors.password" class="hy-field-error m-0" role="alert">
          {{ userFormErrors.password }}
        </p>
        <label class="text-sm text-[var(--hy-muted)]">نقش</label>
        <Select
          v-model="userForm.role"
          :options="roleOptions"
          option-label="label"
          option-value="value"
          class="w-full"
        />
      </div>
      <template #footer>
        <Button :label="ux.common.cancel" text @click="userDialog = false" />
        <Button
          :label="ux.common.save"
          :loading="savingUser"
          @click="saveUser"
        />
      </template>
    </Dialog>
  </div>
</template>
