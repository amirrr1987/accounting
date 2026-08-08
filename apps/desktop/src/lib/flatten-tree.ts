import type { AccountTreeNode, TrialBalanceTreeNode } from "@hesabyar/shared";

export type FlatTrialBalanceRow = TrialBalanceTreeNode["data"] & {
  depth: number;
};

export type FlatAccountRow = AccountTreeNode["data"] & {
  depth: number;
};

export function flattenTrialBalanceTree(
  nodes: TrialBalanceTreeNode[],
  depth = 0,
): FlatTrialBalanceRow[] {
  const out: FlatTrialBalanceRow[] = [];
  for (const node of nodes) {
    out.push({ ...node.data, depth });
    if (node.children?.length) {
      out.push(...flattenTrialBalanceTree(node.children, depth + 1));
    }
  }
  return out;
}

export function flattenAccountTree(
  nodes: AccountTreeNode[],
  depth = 0,
): FlatAccountRow[] {
  const out: FlatAccountRow[] = [];
  for (const node of nodes) {
    out.push({ ...node.data, depth });
    if (node.children?.length) {
      out.push(...flattenAccountTree(node.children, depth + 1));
    }
  }
  return out;
}
