"use client";

import Image from "next/image";
import Link from "next/link";
import { type ChangeEvent, useEffect, useMemo, useState } from "react";

import { createExpense, extractReceipt, parseReceipt } from "../../lib/api";
import { formatPeso } from "../../lib/currency";
import type { ParsedReceiptResponse } from "../../lib/types";
import styles from "./new-expense.module.css";

const CATEGORY_OPTIONS = [
  "Food",
  "Transportation",
  "Utilities",
  "Shopping",
  "Health",
  "Entertainment",
  "Uncategorized",
];

const PAYMENT_OPTIONS = ["Cash", "Debit Card", "Credit Card", "Bank Transfer", "E-Wallet", "Unknown"];

type DraftExpense = {
  merchant: string;
  total: string;
  date: string;
  category: string;
  paymentMethod: string;
  rawText: string;
};

function todayDateString(): string {
  return new Date().toISOString().slice(0, 10);
}

function parseConfidence(value: number): string {
  return `${Math.round(value * 100)}%`;
}

export default function NewExpensePage() {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [draft, setDraft] = useState<DraftExpense>({
    merchant: "",
    total: "",
    date: todayDateString(),
    category: "Uncategorized",
    paymentMethod: "Unknown",
    rawText: "",
  });
  const [parseResult, setParseResult] = useState<ParsedReceiptResponse | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const canSave = useMemo(() => {
    return (
      draft.merchant.trim().length > 0 &&
      draft.total.trim().length > 0 &&
      Number.isFinite(Number.parseFloat(draft.total))
    );
  }, [draft.merchant, draft.total]);

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  function onSelectFile(event: ChangeEvent<HTMLInputElement>) {
    const selected = event.target.files?.[0] ?? null;
    setFile(selected);
    setError(null);
    setSuccess(null);

    if (!selected) {
      setPreviewUrl(null);
      return;
    }

    const objectUrl = URL.createObjectURL(selected);
    setPreviewUrl(objectUrl);
  }

  async function runOcrAndParse() {
    if (!file) {
      setError("Select a receipt image first.");
      return;
    }

    try {
      setIsExtracting(true);
      setError(null);
      setSuccess(null);

      const ocr = await extractReceipt(file);
      const parsed = await parseReceipt(ocr.rawText);
      setParseResult(parsed);

      setDraft((current) => ({
        ...current,
        merchant: parsed.merchant.value ?? current.merchant,
        total: parsed.total.value?.toFixed(2) ?? current.total,
        date: parsed.date.value ?? current.date,
        rawText: ocr.rawText,
      }));
    } catch (ocrError) {
      setError(ocrError instanceof Error ? ocrError.message : "OCR failed.");
    } finally {
      setIsExtracting(false);
    }
  }

  async function saveExpense() {
    if (!canSave) {
      setError("Merchant and total are required before saving.");
      return;
    }

    try {
      setIsSaving(true);
      setError(null);
      setSuccess(null);

      const created = await createExpense({
        userId: "demo-user",
        merchant: draft.merchant.trim(),
        total: Number.parseFloat(draft.total),
        date: draft.date || todayDateString(),
        category: draft.category,
        paymentMethod: draft.paymentMethod,
        rawText: draft.rawText,
        items: parseResult?.items ?? [],
      });

      setSuccess(`Saved expense for ${created.merchant} (${created._id.slice(-6)}).`);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Failed to save expense.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="page-wrap">
      <section className={styles.header}>
        <div>
          <p className={styles.eyebrow}>Receipt Capture</p>
          <h1>Upload and confirm expense details</h1>
          <p>OCR extracts text, parser predicts fields, and you confirm before saving to MongoDB.</p>
        </div>
        <Link href="/" className="button button-muted">
          Back to Dashboard
        </Link>
      </section>

      {error ? <p className={styles.error}>{error}</p> : null}
      {success ? <p className={styles.success}>{success}</p> : null}

      <section className={styles.grid}>
        <article className="card">
          <h3>1. Receipt Upload</h3>
          <p className={styles.help}>PNG/JPG screenshots and photos work best with clear text.</p>
          <input className="text-input" type="file" accept="image/*" onChange={onSelectFile} />
          {previewUrl ? (
            <Image
              src={previewUrl}
              alt="Receipt preview"
              className={styles.preview}
              width={960}
              height={680}
              unoptimized
            />
          ) : null}
          <button className="button button-accent" type="button" disabled={isExtracting} onClick={() => void runOcrAndParse()}>
            {isExtracting ? "Extracting..." : "Run OCR + Parse"}
          </button>
        </article>

        <article className="card">
          <h3>2. Auto-Filled Fields</h3>
          <p className={styles.help}>Review every field before save.</p>
          <div className={styles.formGrid}>
            <label className={styles.field}>
              Merchant
              <input
                className="text-input"
                value={draft.merchant}
                onChange={(event) => setDraft((current) => ({ ...current, merchant: event.target.value }))}
              />
            </label>
            <label className={styles.field}>
              Total
              <input
                className="text-input"
                type="number"
                step="0.01"
                value={draft.total}
                onChange={(event) => setDraft((current) => ({ ...current, total: event.target.value }))}
              />
            </label>
            <label className={styles.field}>
              Date
              <input
                className="text-input"
                type="date"
                value={draft.date}
                onChange={(event) => setDraft((current) => ({ ...current, date: event.target.value }))}
              />
            </label>
            <label className={styles.field}>
              Category
              <select
                className="text-input"
                value={draft.category}
                onChange={(event) => setDraft((current) => ({ ...current, category: event.target.value }))}
              >
                {CATEGORY_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
            <label className={styles.field}>
              Payment Method
              <select
                className="text-input"
                value={draft.paymentMethod}
                onChange={(event) => setDraft((current) => ({ ...current, paymentMethod: event.target.value }))}
              >
                {PAYMENT_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <button className="button" type="button" disabled={isSaving || !canSave} onClick={() => void saveExpense()}>
            {isSaving ? "Saving..." : "Save Expense"}
          </button>
        </article>
      </section>

      <section className="card">
        <h3>3. OCR Raw Text</h3>
        <textarea
          className={styles.rawText}
          value={draft.rawText}
          onChange={(event) => setDraft((current) => ({ ...current, rawText: event.target.value }))}
          placeholder="OCR text will appear here..."
        />
      </section>

      <section className={styles.grid}>
        <article className="card">
          <h3>Field Confidence</h3>
          {!parseResult ? <p className={styles.help}>Run OCR first to view confidence details.</p> : null}
          {parseResult ? (
            <ul className={styles.confidenceList}>
              <li>
                Merchant: {parseConfidence(parseResult.merchant.confidence)} {parseResult.merchant.sourceLine ? `(${parseResult.merchant.sourceLine})` : ""}
              </li>
              <li>
                Total: {parseConfidence(parseResult.total.confidence)} {parseResult.total.sourceLine ? `(${parseResult.total.sourceLine})` : ""}
              </li>
              <li>
                Date: {parseConfidence(parseResult.date.confidence)} {parseResult.date.sourceLine ? `(${parseResult.date.sourceLine})` : ""}
              </li>
              <li>Overall: {parseConfidence(parseResult.confidence)}</li>
            </ul>
          ) : null}
        </article>

        <article className="card">
          <h3>Detected Items (Optional)</h3>
          {!parseResult?.items.length ? <p className={styles.help}>No line items detected.</p> : null}
          {parseResult?.items.length ? (
            <div className={styles.items}>
              {parseResult.items.map((item, index) => (
                <div key={`${item.name}-${index}`} className={styles.itemRow}>
                  <span>{item.name}</span>
                  <span>x{item.qty}</span>
                  <strong>${formatPeso(item.price)}</strong>
                </div>
              ))}
            </div>
          ) : null}
        </article>
      </section>
    </div>
  );
}
