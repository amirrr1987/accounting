<script setup lang="ts">
import { onMounted, reactive, ref } from "vue";
import TabView from "primevue/tabview";
import TabPanel from "primevue/tabpanel";
import Button from "primevue/button";
import DataTable from "primevue/datatable";
import Column from "primevue/column";
import Dialog from "primevue/dialog";
import InputText from "primevue/inputtext";
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
  USER_ROLE_LABELS,
  type AuditLog,
  type AuditAction,
  type UserRecord,
  type UserRole,
} from "@hesabyar/shared";
import {
  createUser,
  exportBackup,
  fetchAuditLogs,
  fetchUsers,
  restoreBackup,
  updateUser,
} from "@/lib/api";
import { downloadBackupJson, readBackupFile } from "@/lib/backup-download";
import PageHeader from "@/components/PageHeader.vue";
import { ux } from "@/locale/ux-copy";

const toast = useToast();
const confirm = useConfirm();
const loading = ref(false);

const users = ref<UserRecord[]>([]);
const auditLogs = ref<AuditLog[]>([]);
const userDialog = ref(false);
const savingUser = ref(false);
const restoreInput = ref<HTMLInputElement | null>(null);

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

async function loadUsers(): Promise<void> {
  users.value = await fetchUsers();
}

async function loadAudit(): Promise<void> {
  auditLogs.value = await fetchAuditLogs(100);
}

onMounted(async () => {
  loading.value = true;
  try {
    await Promise.all([loadUsers(), loadAudit()]);
  } catch {
    toast.add({ severity: "error", summary: ux.settings.loadError, life: 4000 });
  } finally {
    loading.value = false;
  }
});

function openUserDialog(): void {
  userForm.username = "";
  userForm.password = "";
  userForm.role = "ACCOUNTANT";
  userDialog.value = true;
}

async function saveUser(): Promise<void> {
  if (!userForm.username.trim() || userForm.password.length < 4) return;
  savingUser.value = true;
  try {
    await createUser({
      username: userForm.username.trim(),
      password: userForm.password,
      role: userForm.role,
    });
    userDialog.value = false;
    toast.add({ severity: "success", summary: ux.settings.userCreated, life: 3000 });
    await loadUsers();
  } catch {
    toast.add({ severity: "error", summary: ux.settings.userError, life: 4000 });
  } finally {
    savingUser.value = false;
  }
}

async function toggleUserActive(row: UserRecord): Promise<void> {
  try {
    await updateUser(row.id, { isActive: !row.isActive });
    await loadUsers();
  } catch {
    toast.add({ severity: "error", summary: ux.settings.userError, life: 4000 });
  }
}

async function onExportBackup(): Promise<void> {
  loading.value = true;
  try {
    const snapshot = await exportBackup();
    downloadBackupJson(snapshot);
    toast.add({ severity: "success", summary: ux.settings.backupExported, life: 3000 });
    await loadAudit();
  } catch {
    toast.add({ severity: "error", summary: ux.settings.backupError, life: 4000 });
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
        } catch {
          toast.add({
            severity: "error",
            summary: ux.settings.backupError,
            life: 4000,
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
  <div class="hy-page" dir="rtl">
    <Toast />
    <ConfirmDialog />

    <PageHeader :title="ux.settings.title" :subtitle="ux.settings.subtitle" />

    <TabView>
      <TabPanel header="پشتیبان" value="0">
        <div class="hy-surface p-4 space-y-4 max-w-xl">
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

      <TabPanel header="کاربران" value="1">
        <div class="mb-3">
          <Button
            :label="ux.settings.addUser"
            icon="pi pi-user-plus"
            class="min-h-11"
            @click="openUserDialog"
          />
        </div>
        <DataTable :value="users" :loading="loading" size="small">
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

      <TabPanel header="رویدادنگاری" value="2">
        <DataTable :value="auditLogs" :loading="loading" size="small" paginator :rows="15">
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
    </TabView>

    <Dialog
      v-model:visible="userDialog"
      modal
      :header="ux.settings.addUser"
      class="w-full max-w-md"
    >
      <div class="flex flex-col gap-3 pt-2">
        <label class="text-sm text-[var(--hy-muted)]">نام کاربری</label>
        <InputText v-model="userForm.username" class="min-h-11" />
        <label class="text-sm text-[var(--hy-muted)]">رمز عبور</label>
        <Password v-model="userForm.password" :feedback="false" toggle-mask class="w-full" />
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
