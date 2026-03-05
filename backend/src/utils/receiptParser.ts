const TOTAL_KEYWORDS = [
  { token: "grand total", weight: 6 },
  { token: "total due", weight: 6 },
  { token: "amount due", weight: 6 },
  { token: "amount", weight: 3 },
  { token: "total", weight: 4 },
  { token: "balance", weight: 2 },
];

const NON_TOTAL_HINTS = ["subtotal", "sub total", "tax", "change", "cash", "discount", "tip"];

const MERCHANT_BLOCKLIST = [
  "receipt",
  "invoice",
  "order",
  "table",
  "cashier",
  "phone",
  "tel",
  "thank",
  "subtotal",
  "total",
  "date",
  "time",
];

export type ParsedField<T> = {
  value: T | null;
  confidence: number;
  sourceLine: string | null;
};

export type ParsedItem = {
  name: string;
  qty: number;
  price: number;
};

export type ParsedExpenseDraft = {
  merchant: ParsedField<string>;
  total: ParsedField<number>;
  date: ParsedField<string>;
  items: ParsedItem[];
  confidence: number;
};

type AmountCandidate = {
  line: string;
  index: number;
  value: number;
  score: number;
};

function cleanLines(rawText: string): string[] {
  return rawText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

function normalizeAmount(value: string): number | null {
  const normalized = value.replace(/[^0-9.]/g, "");
  if (!normalized || normalized === ".") {
    return null;
  }
  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function extractLineAmounts(line: string): number[] {
  const amounts: number[] = [];
  const decimalRegex =
    /(?:USD|US\$|\$|PHP|EUR)?\s*(-?\d{1,3}(?:,\d{3})*(?:\.\d{2})|-?\d+\.\d{2})/gi;

  for (const match of line.matchAll(decimalRegex)) {
    const value = normalizeAmount(match[1] ?? "");
    if (value !== null) {
      amounts.push(value);
    }
  }

  return amounts;
}

function scoreLineForTotal(line: string): number {
  const lowered = line.toLowerCase();

  if (NON_TOTAL_HINTS.some((hint) => lowered.includes(hint))) {
    return -2;
  }

  return TOTAL_KEYWORDS.reduce((score, keyword) => {
    return lowered.includes(keyword.token) ? score + keyword.weight : score;
  }, 0);
}

function detectTotal(lines: string[]): ParsedField<number> {
  const candidates: AmountCandidate[] = [];

  lines.forEach((line, index) => {
    const amounts = extractLineAmounts(line);
    if (amounts.length === 0) {
      return;
    }

    const lineScore = scoreLineForTotal(line);
    for (const amount of amounts) {
      candidates.push({
        line,
        index,
        value: amount,
        score: lineScore,
      });
    }
  });

  if (candidates.length === 0) {
    return { value: null, confidence: 0.1, sourceLine: null };
  }

  const keywordCandidates = candidates.filter((candidate) => candidate.score > 0);

  if (keywordCandidates.length > 0) {
    keywordCandidates.sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }
      if (b.value !== a.value) {
        return b.value - a.value;
      }
      return b.index - a.index;
    });
    const best = keywordCandidates[0];
    if (!best) {
      return { value: null, confidence: 0.1, sourceLine: null };
    }
    return {
      value: best.value,
      confidence: Math.min(0.98, 0.72 + best.score * 0.05),
      sourceLine: best.line,
    };
  }

  const fallback = [...candidates].sort((a, b) => b.value - a.value)[0];
  if (!fallback) {
    return { value: null, confidence: 0.1, sourceLine: null };
  }
  return {
    value: fallback.value,
    confidence: 0.58,
    sourceLine: fallback.line,
  };
}

function parseDateCandidate(raw: string): string | null {
  const compact = raw.trim().replace(/\./g, "/").replace(/-/g, "/");
  const isoMatch = raw.match(/\b(\d{4})[-/](\d{1,2})[-/](\d{1,2})\b/);
  if (isoMatch) {
    const [, yearToken, monthToken, dayToken] = isoMatch;
    if (!yearToken || !monthToken || !dayToken) {
      return null;
    }
    const year = Number.parseInt(yearToken, 10);
    const month = Number.parseInt(monthToken, 10);
    const day = Number.parseInt(dayToken, 10);
    const candidate = new Date(year, month - 1, day);
    if (
      candidate.getFullYear() === year &&
      candidate.getMonth() === month - 1 &&
      candidate.getDate() === day
    ) {
      return candidate.toISOString().slice(0, 10);
    }
  }

  const usOrIntlMatch = compact.match(/\b(\d{1,2})\/(\d{1,2})\/(\d{2,4})\b/);
  if (!usOrIntlMatch) {
    return null;
  }

  const [, firstToken, secondToken, yearToken] = usOrIntlMatch;
  if (!firstToken || !secondToken || !yearToken) {
    return null;
  }

  let first = Number.parseInt(firstToken, 10);
  let second = Number.parseInt(secondToken, 10);
  let year = Number.parseInt(yearToken, 10);

  if (year < 100) {
    year += year > 70 ? 1900 : 2000;
  }

  // Default to MM/DD/YYYY for US users unless first token cannot be a month.
  let month = first;
  let day = second;
  if (first > 12 && second <= 12) {
    month = second;
    day = first;
  }

  const candidate = new Date(year, month - 1, day);
  if (
    candidate.getFullYear() === year &&
    candidate.getMonth() === month - 1 &&
    candidate.getDate() === day
  ) {
    return candidate.toISOString().slice(0, 10);
  }

  return null;
}

function detectDate(lines: string[]): ParsedField<string> {
  const dateRegex = /\b(\d{4}[-/]\d{1,2}[-/]\d{1,2}|\d{1,2}[./-]\d{1,2}[./-]\d{2,4})\b/;

  for (const line of lines) {
    const match = line.match(dateRegex);
    if (!match) {
      continue;
    }
    const parsed = parseDateCandidate(match[0]);
    if (parsed) {
      return {
        value: parsed,
        confidence: 0.85,
        sourceLine: line,
      };
    }
  }

  return {
    value: null,
    confidence: 0.2,
    sourceLine: null,
  };
}

function looksLikeMerchant(line: string): boolean {
  const lowered = line.toLowerCase();
  if (MERCHANT_BLOCKLIST.some((hint) => lowered.includes(hint))) {
    return false;
  }

  const letterCount = (line.match(/[A-Za-z]/g) ?? []).length;
  const digitCount = (line.match(/[0-9]/g) ?? []).length;
  if (letterCount < 3) {
    return false;
  }
  if (digitCount > letterCount) {
    return false;
  }
  if (extractLineAmounts(line).length > 0) {
    return false;
  }

  return true;
}

function detectMerchant(lines: string[]): ParsedField<string> {
  const upperBound = Math.min(lines.length, 8);
  for (let i = 0; i < upperBound; i += 1) {
    const line = lines[i];
    if (!line) {
      continue;
    }
    if (!looksLikeMerchant(line)) {
      continue;
    }

    return {
      value: line.replace(/\s{2,}/g, " ").trim(),
      confidence: i === 0 ? 0.92 : 0.75,
      sourceLine: line,
    };
  }

  return {
    value: null,
    confidence: 0.15,
    sourceLine: null,
  };
}

function detectItems(lines: string[]): ParsedItem[] {
  const items: ParsedItem[] = [];
  const lineItemRegex = /^(.+?)\s+(\d{1,4}(?:[.,]\d{2})?)$/;
  const withQtyRegex = /^(.+?)\s+(\d+)\s*[xX@]\s*(\d{1,4}(?:[.,]\d{2})?)\s+(\d{1,4}(?:[.,]\d{2})?)$/;

  for (const line of lines) {
    const lowered = line.toLowerCase();
    if (TOTAL_KEYWORDS.some((keyword) => lowered.includes(keyword.token))) {
      continue;
    }
    if (NON_TOTAL_HINTS.some((hint) => lowered.includes(hint))) {
      continue;
    }

    const qtyMatch = line.match(withQtyRegex);
    if (qtyMatch) {
      const [, nameToken, qtyToken, _unitPriceToken, totalToken] = qtyMatch;
      if (!nameToken || !qtyToken || !totalToken) {
        continue;
      }
      const name = nameToken.trim();
      const qty = Number.parseInt(qtyToken, 10);
      const total = normalizeAmount(totalToken);
      if (name.length > 2 && total !== null) {
        items.push({ name, qty, price: total });
      }
      continue;
    }

    const match = line.match(lineItemRegex);
    if (!match) {
      continue;
    }
    const [, nameToken, priceToken] = match;
    if (!nameToken || !priceToken) {
      continue;
    }
    const name = nameToken.trim();
    const price = normalizeAmount(priceToken);
    if (name.length <= 2 || price === null) {
      continue;
    }
    if ((name.match(/[A-Za-z]/g) ?? []).length < 2) {
      continue;
    }

    items.push({ name, qty: 1, price });
  }

  return items.slice(0, 20);
}

export function parseReceipt(rawText: string): ParsedExpenseDraft {
  const lines = cleanLines(rawText);
  const total = detectTotal(lines);
  const date = detectDate(lines);
  const merchant = detectMerchant(lines);
  const items = detectItems(lines);

  const confidence = Number(
    ((merchant.confidence + total.confidence + date.confidence) / 3).toFixed(2),
  );

  return {
    merchant,
    total,
    date,
    items,
    confidence,
  };
}
