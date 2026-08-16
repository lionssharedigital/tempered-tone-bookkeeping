export type MappingField =
  | "date"
  | "payee"
  | "amount"
  | "description"
  | "reference"
  | "bankTransactionType"
  | "status";

export type ColumnMapping = Partial<Record<MappingField, string>>;

const HEADER_HINTS: Record<MappingField, string[]> = {
  date: ["date"],
  payee: ["payee", "name", "merchant"],
  amount: ["amount", "amount ($)"],
  description: ["description", "memo", "notes"],
  reference: ["reference", "ref", "check number"],
  bankTransactionType: ["transaction type", "type"],
  status: ["status"],
};

/** Suggests a header -> field mapping by fuzzy-matching column names. */
export function suggestColumnMapping(headers: string[]): ColumnMapping {
  const mapping: ColumnMapping = {};
  const normalizedHeaders = headers.map((h) => ({ raw: h, norm: h.trim().toLowerCase() }));

  for (const field of Object.keys(HEADER_HINTS) as MappingField[]) {
    const hints = HEADER_HINTS[field];
    const match = normalizedHeaders.find((h) => hints.includes(h.norm));
    if (match) mapping[field] = match.raw;
  }
  return mapping;
}

export const REQUIRED_MAPPING_FIELDS: MappingField[] = ["date", "payee", "amount"];
