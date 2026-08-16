import type { CategoryType, AccountType } from "../../db/schema";

export type { CategoryType, AccountType };

export interface CategoryMapRuleRow {
  id: number;
  keyword: string;
  priority: number;
  isActive: boolean;
  categoryId: number;
  categoryName: string;
  categoryType: CategoryType;
}

export interface CategoryRow {
  id: number;
  name: string;
  type: CategoryType;
  isActive: boolean;
}

export interface AccountRow {
  id: number;
  name: string;
  institution: string;
  accountType: AccountType;
  openingBalanceCents: number;
  openingBalanceDate: string;
  currency: string;
  isArchived: boolean;
  sortOrder: number;
}

export interface TransactionRow {
  id: number;
  accountId: number;
  accountName: string;
  date: string;
  payee: string;
  bankTransactionType: string | null;
  description: string | null;
  reference: string | null;
  status: string;
  amountCents: number;
  currency: string;
  categoryId: number | null;
  categoryName: string | null;
  categoryType: CategoryType | null;
  categorySource: "auto_matched" | "manual" | "unmatched";
  notes: string | null;
}
