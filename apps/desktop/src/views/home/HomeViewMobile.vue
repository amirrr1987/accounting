<script setup lang="ts">
import type { DashboardSummary } from "@hesabyar/shared";
import { useRouter } from "vue-router";
import Button from "primevue/button";
import Tag from "primevue/tag";
import DataTable from "primevue/datatable";
import Column from "primevue/column";
import { formatMoneyFa } from "@/lib/money";
import { QUICK_ACTIONS } from "@/lib/nav-config";
import { ux } from "@/locale/ux-copy";
import ContextHelp from "@/components/ContextHelp.vue";
import EmptyState from "@/components/EmptyState.vue";

defineProps<{
  summary: DashboardSummary | null;
  businessTitle: string | null;
  loading: boolean;
  loadFailed: boolean;
  healthLabel: string;
  healthSeverity: "success" | "info" | "danger";
  version?: string | null;
}>();

const emit = defineEmits<{ retry: [] }>();

const router = useRouter();
</script>

<template>
  <div class="hy-page-mobile space-y-4" dir="rtl">
    <header class="space-y-1">
      <div class="flex items-start justify-between gap-2">
        <div class="min-w-0">
          <h1 class="text-xl font-bold m-0 text-[var(--hy-text)]">
            {{ businessTitle ?? ux.dashboard.titleSimple }}
          </h1>
          <p class="text-sm text-[var(--hy-muted)] m-0 mt-1">
            {{ ux.dashboard.subtitleSimple }}
          </p>
        </div>
        <Tag :value="healthLabel" :severity="healthSeverity" rounded />
      </div>
    </header>

    <EmptyState
      v-if="loadFailed && !summary"
      :title="ux.dashboard.loadErrorTitle"
      :description="ux.dashboard.loadErrorDetail"
      icon="pi pi-wifi"
      :action-label="ux.common.retry"
      @action="emit('retry')"
    />

    <template v-else>
      <section
        v-if="summary?.management"
        class="hy-money-hero rounded-2xl p-5 text-center"
        aria-labelledby="money-hero"
      >
        <h2 id="money-hero" class="text-sm font-medium m-0 opacity-90">
          {{ ux.dashboard.totalMoneySimple }}
        </h2>
        <p class="text-3xl font-bold m-0 mt-2 tracking-tight">
          {{ loading ? "…" : formatMoneyFa(summary.management.grandTotal) }}
        </p>
        <ContextHelp
          class="mt-3 justify-center"
          :text="ux.dashboard.totalMoneyHint"
        />
        <div class="grid grid-cols-2 gap-3 mt-5 text-sm">
          <div class="rounded-xl bg-white/10 p-3">
            <p class="m-0 opacity-80 text-xs">{{ ux.dashboard.cash }}</p>
            <p class="m-0 font-semibold mt-1">
              {{ formatMoneyFa(summary.management.totalCash) }}
            </p>
          </div>
          <div class="rounded-xl bg-white/10 p-3">
            <p class="m-0 opacity-80 text-xs">{{ ux.dashboard.bank }}</p>
            <p class="m-0 font-semibold mt-1">
              {{ formatMoneyFa(summary.management.totalBank) }}
            </p>
          </div>
        </div>
      </section>

      <section aria-labelledby="quick-actions">
        <h2
          id="quick-actions"
          class="text-base font-bold m-0 mb-3 text-[var(--hy-text)]"
        >
          {{ ux.dashboard.whatNext }}
        </h2>
        <div class="grid grid-cols-2 gap-2">
          <button
            v-for="action in QUICK_ACTIONS.slice(0, 4)"
            :key="action.id"
            type="button"
            class="hy-surface p-4 text-right min-h-[5.5rem] flex flex-col justify-between active:scale-[0.98] transition-transform"
            @click="router.push(action.path)"
          >
            <i
              :class="[action.icon, 'text-xl text-[var(--hy-primary)]']"
              aria-hidden="true"
            />
            <span>
              <span class="block font-semibold text-sm">{{
                action.label
              }}</span>
              <span class="block text-[0.65rem] text-[var(--hy-muted)] mt-1">{{
                action.hint
              }}</span>
            </span>
          </button>
        </div>
      </section>

      <section
        v-if="summary?.management"
        class="hy-surface p-4"
        aria-labelledby="alerts-mobile"
      >
        <h2
          id="alerts-mobile"
          class="text-sm font-bold m-0 mb-2 text-[var(--hy-text)]"
        >
          نیاز به توجه
        </h2>
        <div class="flex flex-wrap gap-2">
          <Tag
            v-if="summary.management.checksDueThisWeek > 0"
            :value="`${ux.dashboard.checksDue}: ${summary.management.checksDueThisWeek}`"
            severity="warn"
          />
          <Tag
            v-if="summary.management.checksOverdue > 0"
            :value="`${ux.dashboard.checksOverdue}: ${summary.management.checksOverdue}`"
            severity="danger"
          />
          <Tag
            v-if="summary.management.lowStockCount > 0"
            :value="`${ux.dashboard.lowStock}: ${summary.management.lowStockCount}`"
            severity="warn"
          />
          <Tag
            v-if="!summary.isBalanced"
            :value="ux.dashboard.balanceBad"
            severity="danger"
          />
          <p
            v-if="
              summary.isBalanced &&
              summary.management.checksDueThisWeek === 0 &&
              summary.management.checksOverdue === 0 &&
              summary.management.lowStockCount === 0
            "
            class="text-sm text-[var(--hy-muted)] m-0"
          >
            همه‌چیز مرتب است ✓
          </p>
        </div>
      </section>

      <section class="hy-surface p-4" aria-labelledby="recent-invoices-m">
        <div class="flex items-center justify-between mb-2">
          <h2 id="recent-invoices-m" class="text-sm font-bold m-0">
            {{ ux.dashboard.recentInvoices }}
          </h2>
          <Button
            :label="ux.dashboard.seeAll"
            text
            size="small"
            @click="router.push('/invoices')"
          />
        </div>
        <EmptyState
          v-if="!loading && (summary?.recentInvoices.length ?? 0) === 0"
          :title="ux.dashboard.emptyInvoicesTitle"
          :description="ux.dashboard.emptyInvoicesBody"
          icon="pi pi-file"
          :action-label="ux.dashboard.emptyInvoicesCta"
          @action="router.push('/invoices/new')"
        />
        <ul
          v-else
          class="list-none m-0 p-0 divide-y divide-[var(--hy-border)]"
        >
          <li
            v-for="inv in summary?.recentInvoices ?? []"
            :key="inv.id"
            class="py-3 flex justify-between gap-2 items-start"
          >
            <div class="min-w-0">
              <p class="m-0 font-medium text-sm truncate">{{ inv.partyName }}</p>
              <p class="m-0 text-xs text-[var(--hy-muted)] mt-0.5">
                {{ inv.number }} ·
                {{ inv.kind === "SALE" ? "فروش" : "خرید" }}
              </p>
            </div>
            <span class="font-semibold text-sm shrink-0">{{
              formatMoneyFa(inv.total)
            }}</span>
          </li>
        </ul>
      </section>

      <Button
        :label="ux.nav.reportsSimple"
        icon="pi pi-chart-line"
        outlined
        class="w-full min-h-12"
        @click="router.push('/reports')"
      />
    </template>
  </div>
</template>
