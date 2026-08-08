<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import TreeTable from "primevue/treetable";
import Column from "primevue/column";
import InputText from "primevue/inputtext";
import Button from "primevue/button";
import Tag from "primevue/tag";
import Toast from "primevue/toast";
import ConfirmDialog from "primevue/confirmdialog";
import { useToast } from "primevue/usetoast";
import { useConfirm } from "primevue/useconfirm";
import type {
  Account,
  AccountTreeNode,
  CreateAccountInput,
} from "@hesabyar/shared";
import {
  createAccount,
  deleteAccount,
  fetchAccountTree,
  fetchAccounts,
  updateAccount,
} from "@/lib/api";
import {
  ACCOUNT_LEVEL_LABELS,
  ACCOUNT_NATURE_LABELS,
  ACCOUNT_TYPE_LABELS,
  ACCOUNT_TYPE_SEVERITY,
} from "@/lib/account-labels";
import AccountFormDrawer from "@/components/AccountFormDrawer.vue";
import PageHeader from "@/components/PageHeader.vue";
import MobileListCard from "@/components/MobileListCard.vue";
import { flattenAccountTree } from "@/lib/flatten-tree";
import { usePageCopy } from "@/composables/usePageCopy";

const toast = useToast();
const confirm = useConfirm();
const { copy: pageCopy, isMobile } = usePageCopy("accounts");

const flatRows = computed(() => flattenAccountTree(nodes.value));

const nodes = ref<AccountTreeNode[]>([]);
const flatAccounts = ref<Account[]>([]);
const search = ref("");
const loading = ref(false);
const drawerVisible = ref(false);
const editing = ref<Account | null>(null);
let searchTimer: ReturnType<typeof setTimeout> | undefined;

async function load(): Promise<void> {
  loading.value = true;
  try {
    const [tree, list] = await Promise.all([
      fetchAccountTree(search.value || undefined),
      fetchAccounts(),
    ]);
    nodes.value = tree;
    flatAccounts.value = list;
  } catch {
    toast.add({
      severity: "error",
      summary: "خطا",
      detail: "بارگذاری سرفصل حساب‌ها ناموفق بود",
      life: 4000,
    });
  } finally {
    loading.value = false;
  }
}

watch(search, () => {
  if (searchTimer) clearTimeout(searchTimer);
  searchTimer = setTimeout(() => {
    void load();
  }, 300);
});

onMounted(() => {
  void load();
});

function openCreate(): void {
  editing.value = null;
  drawerVisible.value = true;
}

function openEdit(account: Account): void {
  editing.value = account;
  drawerVisible.value = true;
}

async function onSave(payload: CreateAccountInput): Promise<void> {
  try {
    if (editing.value) {
      await updateAccount(editing.value.id, payload);
      toast.add({
        severity: "success",
        summary: "ذخیره شد",
        detail: "حساب ویرایش شد",
        life: 2500,
      });
    } else {
      await createAccount(payload);
      toast.add({
        severity: "success",
        summary: "ایجاد شد",
        detail: "حساب جدید افزوده شد",
        life: 2500,
      });
    }
    drawerVisible.value = false;
    await load();
  } catch (error: unknown) {
    const detail =
      (error as { response?: { data?: { message?: string } } })?.response?.data
        ?.message ?? "عملیات ناموفق بود";
    toast.add({
      severity: "error",
      summary: "خطا",
      detail,
      life: 4000,
    });
  }
}

function confirmRemove(account: Account): void {
  confirm.require({
    message: `آیا از حذف «${account.name}» مطمئن هستید؟`,
    header: "تأیید حذف",
    icon: "pi pi-exclamation-triangle",
    acceptLabel: "حذف",
    rejectLabel: "انصراف",
    acceptClass: "p-button-danger",
    accept: () => {
      void (async () => {
        try {
          await deleteAccount(account.id);
          toast.add({
            severity: "success",
            summary: "حذف شد",
            detail: "حساب حذف شد",
            life: 2500,
          });
          await load();
        } catch (error: unknown) {
          const detail =
            (error as { response?: { data?: { message?: string } } })?.response
              ?.data?.message ?? "حذف ناموفق بود";
          toast.add({
            severity: "error",
            summary: "خطا",
            detail,
            life: 4000,
          });
        }
      })();
    },
  });
}
</script>

<template>
  <div :class="isMobile ? 'hy-page-mobile space-y-4 p-4' : 'p-6 space-y-4'" dir="rtl">
    <Toast />
    <ConfirmDialog />

    <PageHeader
      :title="pageCopy.title"
      :subtitle="pageCopy.subtitle"
      :hint="pageCopy.hint"
    >
      <template #actions>
        <Button label="حساب جدید" icon="pi pi-plus" class="min-h-11" @click="openCreate" />
      </template>
    </PageHeader>

    <div class="flex gap-2 items-center max-w-md">
      <span class="p-input-icon-right w-full relative">
        <i class="pi pi-search absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <InputText
          v-model="search"
          placeholder="جستجو در کد یا نام…"
          class="w-full pl-10"
        />
      </span>
    </div>

    <div
      v-if="!loading && nodes.length === 0"
      class="flex flex-col items-center justify-center gap-4 py-16 text-slate-500"
    >
      <i class="pi pi-sitemap text-5xl text-slate-300" />
      <p>هیچ حسابی یافت نشد</p>
      <Button label="افزودن اولین حساب" icon="pi pi-plus" @click="openCreate" />
    </div>

    <ul
      v-else-if="isMobile"
      class="list-none m-0 p-0 space-y-3"
    >
      <li
        v-for="row in flatRows"
        :key="row.id"
        :style="{ paddingRight: `${row.depth * 0.75}rem` }"
        class="hy-surface overflow-hidden"
      >
        <MobileListCard
          :title="`${row.code} — ${row.name}`"
          :subtitle="`${ACCOUNT_TYPE_LABELS[row.type]} · ${ACCOUNT_NATURE_LABELS[row.nature]}`"
          :meta="ACCOUNT_LEVEL_LABELS[row.level]"
          meta-severity="secondary"
        />
        <div class="flex gap-1 px-4 pb-3">
          <Button
            icon="pi pi-pencil"
            text
            rounded
            severity="info"
            @click="openEdit(row)"
          />
          <Button
            icon="pi pi-trash"
            text
            rounded
            severity="danger"
            @click="confirmRemove(row)"
          />
        </div>
      </li>
    </ul>

    <TreeTable
      v-else
      :value="nodes"
      :loading="loading"
      paginator
      :rows="20"
      class="text-sm"
    >
      <Column field="code" header="کد" expander style="width: 10rem">
        <template #body="{ node }">
          <span class="font-mono">{{ node.data.code }}</span>
        </template>
      </Column>
      <Column field="name" header="نام حساب">
        <template #body="{ node }">
          {{ node.data.name }}
        </template>
      </Column>
      <Column header="نوع" style="width: 9rem">
        <template #body="{ node }">
          <Tag
            :value="ACCOUNT_TYPE_LABELS[node.data.type]"
            :severity="ACCOUNT_TYPE_SEVERITY[node.data.type]"
          />
        </template>
      </Column>
      <Column header="ماهیت" style="width: 7rem">
        <template #body="{ node }">
          {{ ACCOUNT_NATURE_LABELS[node.data.nature] }}
        </template>
      </Column>
      <Column header="سطح" style="width: 6rem">
        <template #body="{ node }">
          {{ ACCOUNT_LEVEL_LABELS[node.data.level] }}
        </template>
      </Column>
      <Column header="عملیات" style="width: 9rem">
        <template #body="{ node }">
          <div class="flex gap-1">
            <Button
              icon="pi pi-pencil"
              text
              rounded
              severity="info"
              @click="openEdit(node.data)"
            />
            <Button
              icon="pi pi-trash"
              text
              rounded
              severity="danger"
              @click="confirmRemove(node.data)"
            />
          </div>
        </template>
      </Column>
    </TreeTable>

    <AccountFormDrawer
      v-model:visible="drawerVisible"
      :account="editing"
      :parent-options="flatAccounts"
      @save="onSave"
    />
  </div>
</template>
