import type { Account as PrismaAccount } from "@prisma/client";
import {
  AccountSchema,
  type Account,
  type AccountTreeNode,
} from "@hesabyar/shared";

export function toAccountDto(row: PrismaAccount): Account {
  return AccountSchema.parse({
    id: row.id,
    code: row.code,
    name: row.name,
    type: row.type,
    nature: row.nature,
    level: row.level,
    parentId: row.parentId,
    isActive: row.isActive,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  });
}

/** ساخت درخت سرفصل از لیست تخت */
export function buildAccountTree(accounts: Account[]): AccountTreeNode[] {
  const byId = new Map<string, AccountTreeNode>();
  for (const account of accounts) {
    byId.set(account.id, { key: account.id, data: account, children: [] });
  }

  const roots: AccountTreeNode[] = [];
  for (const node of byId.values()) {
    const parentId = node.data.parentId;
    if (parentId && byId.has(parentId)) {
      byId.get(parentId)!.children!.push(node);
    } else {
      roots.push(node);
    }
  }

  const sortRecursive = (nodes: AccountTreeNode[]): void => {
    nodes.sort((a, b) => a.data.code.localeCompare(b.data.code, "fa"));
    for (const n of nodes) {
      if (n.children?.length) sortRecursive(n.children);
    }
  };
  sortRecursive(roots);
  return roots;
}
