import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { PrismaClient } from "@prisma/client";
import * as bcrypt from "bcrypt";
import {
  DEFAULT_ADMIN_PASSWORD,
  DEFAULT_ADMIN_USERNAME,
  DEFAULT_UNITS,
  DEFAULT_EXPENSE_CATEGORIES,
  IRANIAN_COA_SEED,
} from "@hesabyar/shared";

function loadEnvFile(): void {
  if (process.env.DATABASE_URL) return;
  const candidates = [
    resolve(process.cwd(), ".env"),
    resolve(__dirname, "..", ".env"),
  ];
  for (const envPath of candidates) {
    if (!existsSync(envPath)) continue;
    process.loadEnvFile(envPath);
    return;
  }
}

loadEnvFile();

const prisma = new PrismaClient();

async function seedAdmin(): Promise<void> {
  const existing = await prisma.user.findUnique({
    where: { username: DEFAULT_ADMIN_USERNAME },
  });
  if (existing) {
    console.log(`Admin user already exists (${DEFAULT_ADMIN_USERNAME})`);
    return;
  }
  const passwordHash = await bcrypt.hash(DEFAULT_ADMIN_PASSWORD, 10);
  await prisma.user.create({
    data: {
      username: DEFAULT_ADMIN_USERNAME,
      passwordHash,
      role: "ADMIN",
      isActive: true,
    },
  });
  console.log(
    `Seeded default admin user: ${DEFAULT_ADMIN_USERNAME} / ${DEFAULT_ADMIN_PASSWORD}`,
  );
}

async function seedAccounts(): Promise<void> {
  const existing = await prisma.account.findMany({
    select: { code: true, id: true },
  });
  const codeToId = new Map(existing.map((a) => [a.code, a.id]));

  if (existing.length === 0) {
    console.log("Seeding full Iranian chart of accounts…");
  } else {
    console.log(
      `Found ${existing.length} accounts — inserting any missing seed codes…`,
    );
  }

  const order: Array<"GROUP" | "TOTAL" | "SUBTOTAL" | "DETAIL"> = [
    "GROUP",
    "TOTAL",
    "SUBTOTAL",
    "DETAIL",
  ];

  let createdCount = 0;

  for (const level of order) {
    const batch = IRANIAN_COA_SEED.filter((a) => a.level === level);
    for (const seed of batch) {
      if (codeToId.has(seed.code)) continue;

      const parentId = seed.parentCode
        ? (codeToId.get(seed.parentCode) ?? null)
        : null;

      if (seed.parentCode && !parentId) {
        throw new Error(`Parent not found for ${seed.code}: ${seed.parentCode}`);
      }

      const created = await prisma.account.create({
        data: {
          code: seed.code,
          name: seed.name,
          type: seed.type,
          nature: seed.nature,
          level: seed.level,
          parentId,
          isActive: true,
        },
      });
      codeToId.set(seed.code, created.id);
      createdCount += 1;
    }
  }

  console.log(
    createdCount === 0
      ? `Seed complete — ${codeToId.size} accounts present`
      : `Seeded ${createdCount} missing accounts (${codeToId.size} total)`,
  );
}

async function seedUnits(): Promise<void> {
  const existing = await prisma.unitOfMeasure.findMany({
    select: { id: true, code: true },
  });
  const codeToId = new Map(existing.map((u) => [u.code, u.id]));
  let created = 0;

  for (const unit of DEFAULT_UNITS) {
    if (codeToId.has(unit.code)) continue;
    const baseUnitId =
      unit.baseUnitId !== null
        ? (codeToId.get(unit.baseUnitId) ?? null)
        : null;

    const row = await prisma.unitOfMeasure.create({
      data: {
        code: unit.code,
        nameFa: unit.nameFa,
        baseUnitId,
        conversionFactor: unit.conversionFactor,
        isActive: true,
      },
    });
    codeToId.set(unit.code, row.id);
    created += 1;
  }

  // second pass for units that depend on base codes seeded in first pass
  for (const unit of DEFAULT_UNITS) {
    if (codeToId.has(unit.code) && existing.some((e) => e.code === unit.code)) {
      continue;
    }
    const row = await prisma.unitOfMeasure.findUnique({
      where: { code: unit.code },
    });
    if (!row) continue;
    if (unit.baseUnitId && typeof unit.baseUnitId === "string") {
      const baseUnitId = codeToId.get(unit.baseUnitId) ?? null;
      if (baseUnitId && row.baseUnitId !== baseUnitId) {
        await prisma.unitOfMeasure.update({
          where: { id: row.id },
          data: { baseUnitId },
        });
      }
    }
  }

  console.log(
    created === 0
      ? `Units complete — ${codeToId.size} units present`
      : `Seeded ${created} units (${codeToId.size} total)`,
  );
}

async function seedFiscalYear(): Promise<void> {
  const existing = await prisma.fiscalYear.findFirst();
  if (existing) {
    console.log(`Fiscal year already exists (${existing.title})`);
    return;
  }
  const year = "1403";
  await prisma.fiscalYear.create({
    data: {
      title: year,
      startJalali: `${year}/01/01`,
      endJalali: `${year}/12/29`,
      isActive: true,
    },
  });
  console.log(`Seeded fiscal year ${year}`);
}

async function seedExpenseCategories(): Promise<void> {
  const existing = await prisma.expenseCategory.findMany({
    select: { code: true },
  });
  const codes = new Set(existing.map((c) => c.code));
  let created = 0;

  for (const cat of DEFAULT_EXPENSE_CATEGORIES) {
    if (codes.has(cat.code)) continue;
    await prisma.expenseCategory.create({
      data: {
        code: cat.code,
        nameFa: cat.nameFa,
        coaAccountCode: cat.coaAccountCode,
        isSystem: true,
        isActive: true,
      },
    });
    created += 1;
  }

  console.log(
    created === 0
      ? `Expense categories complete — ${codes.size + created} present`
      : `Seeded ${created} expense categories`,
  );
}

async function seedDefaultOwner(): Promise<void> {
  const existing = await prisma.owner.findFirst();
  if (existing) {
    console.log(`Default owner already exists (${existing.name})`);
    return;
  }
  await prisma.owner.create({
    data: {
      name: "مالک",
      isActive: true,
    },
  });
  console.log("Seeded default owner: مالک");
}

async function main(): Promise<void> {
  await seedAccounts();
  await seedUnits();
  await seedExpenseCategories();
  await seedDefaultOwner();
  await seedAdmin();
  await seedFiscalYear();
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
