export type ExpenseItem = {
  name: string;
  qty: number;
  price: number;
};

export type Expense = {
  _id: string;
  userId: string;
  total: number;
  merchant: string;
  date: string;
  category: string;
  paymentMethod: string;
  rawText: string;
  imageUrl?: string;
  items: ExpenseItem[];
  createdAt: string;
  updatedAt: string;
};

export type OcrExtractResponse = {
  rawText: string;
  lines: string[];
  confidence: number;
};

export type ParsedField<T> = {
  value: T | null;
  confidence: number;
  sourceLine: string | null;
};

export type ParsedReceiptResponse = {
  merchant: ParsedField<string>;
  total: ParsedField<number>;
  date: ParsedField<string>;
  items: ExpenseItem[];
  confidence: number;
  rawText: string;
};

export type CreateExpensePayload = {
  userId?: string;
  total: number;
  merchant: string;
  date: string;
  category: string;
  paymentMethod: string;
  rawText: string;
  imageUrl?: string;
  items?: ExpenseItem[];
};

export type ExpenseStats = {
  totals: {
    daily: number;
    weekly: number;
    monthly: number;
  };
  trend: Array<{
    date: string;
    total: number;
  }>;
  categoryBreakdown: Array<{
    category: string;
    total: number;
  }>;
};

