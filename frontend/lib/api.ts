import type {
  CreateExpensePayload,
  Expense,
  ExpenseStats,
  OcrExtractResponse,
  ParsedReceiptResponse,
} from "./types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api";

async function parseResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let message = `Request failed (${response.status})`;
    try {
      const errorBody = (await response.json()) as { message?: string };
      if (errorBody.message) {
        message = errorBody.message;
      }
    } catch {
    }
    throw new Error(message);
  }

  return (await response.json()) as T;
}

export async function extractReceipt(file: File): Promise<OcrExtractResponse> {
  const formData = new FormData();
  formData.append("receipt", file);

  const response = await fetch(`${API_BASE}/ocr/extract`, {
    method: "POST",
    body: formData,
  });

  return parseResponse<OcrExtractResponse>(response);
}

export async function parseReceipt(rawText: string): Promise<ParsedReceiptResponse> {
  const response = await fetch(`${API_BASE}/ocr/parse`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ rawText }),
  });

  return parseResponse<ParsedReceiptResponse>(response);
}

export async function createExpense(payload: CreateExpensePayload): Promise<Expense> {
  const response = await fetch(`${API_BASE}/expenses`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  return parseResponse<Expense>(response);
}

type ExpenseFilters = {
  userId?: string;
  search?: string;
  category?: string;
  from?: string;
  to?: string;
  limit?: number;
};

export async function fetchExpenses(filters: ExpenseFilters = {}): Promise<Expense[]> {
  const query = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== "") {
      query.set(key, String(value));
    }
  });

  const response = await fetch(`${API_BASE}/expenses?${query.toString()}`, {
    cache: "no-store",
  });

  return parseResponse<Expense[]>(response);
}

export async function fetchExpenseStats(days = 30, userId = "demo-user"): Promise<ExpenseStats> {
  const query = new URLSearchParams({
    days: String(days),
    userId,
  });
  const response = await fetch(`${API_BASE}/expenses/stats?${query.toString()}`, {
    cache: "no-store",
  });

  return parseResponse<ExpenseStats>(response);
}

