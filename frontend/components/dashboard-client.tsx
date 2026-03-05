"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { fetchExpenses, fetchExpenseStats } from "../lib/api";
import { formatPeso } from "../lib/currency";
import type { Expense, ExpenseStats } from "../lib/types";
import styles from "./dashboard-client.module.css";

const DEFAULT_CATEGORIES = [
  "Food",
  "Transportation",
  "Utilities",
  "Shopping",
  "Health",
  "Entertainment",
  "Uncategorized",
];

function formatDate(value: string): string {
  const date = new Date(value);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function DashboardClient() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [stats, setStats] = useState<ExpenseStats | null>(null);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isFiltering, setIsFiltering] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const categories = useMemo(() => {
    const fromExpenses = expenses.map((expense) => expense.category);
    return ["All", ...new Set([...DEFAULT_CATEGORIES, ...fromExpenses])];
  }, [expenses]);

  async function loadDashboard() {
    try {
      setIsLoading(true);
      setError(null);
      const [fetchedStats, fetchedExpenses] = await Promise.all([
        fetchExpenseStats(30),
        fetchExpenses({ limit: 100 }),
      ]);
      setStats(fetchedStats);
      setExpenses(fetchedExpenses);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load dashboard.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadDashboard();
  }, []);

  async function applyFilters() {
    try {
      setIsFiltering(true);
      setError(null);
      const filtered = await fetchExpenses({
        search,
        category,
        from: fromDate,
        to: toDate,
        limit: 100,
      });
      setExpenses(filtered);
    } catch (filterError) {
      setError(filterError instanceof Error ? filterError.message : "Failed to apply filters.");
    } finally {
      setIsFiltering(false);
    }
  }

  async function resetFilters() {
    setSearch("");
    setCategory("All");
    setFromDate("");
    setToDate("");
    await loadDashboard();
  }

  const maxTrend = Math.max(...(stats?.trend.map((point) => point.total) ?? [1]), 1);
  const trendPoints = stats?.trend.slice(-14) ?? [];
  const topCategories = stats?.categoryBreakdown.slice(0, 6) ?? [];
  const maxCategoryTotal = Math.max(...topCategories.map((item) => item.total), 1);

  return (
    <div className="page-wrap">
      <section className={styles.hero}>
        <div>
          <p className={styles.eyebrow}>OCR Expense Tracker</p>
          <h1>Track spending from receipts in minutes.</h1>
          <p>
            Upload a receipt, auto-extract totals, verify fields, and keep a searchable spending history.
          </p>
        </div>
        <Link href="/new" className="button button-accent">
          New Receipt
        </Link>
      </section>

      {error ? <p className={styles.error}>{error}</p> : null}

      <section className={styles.totalsGrid}>
        <article className="card">
          <h3>Daily Spend</h3>
          <p className={styles.money}>{formatPeso(stats?.totals.daily ?? 0)}</p>
        </article>
        <article className="card">
          <h3>Weekly Spend</h3>
          <p className={styles.money}>{formatPeso(stats?.totals.weekly ?? 0)}</p>
        </article>
        <article className="card">
          <h3>Monthly Spend</h3>
          <p className={styles.money}>{formatPeso(stats?.totals.monthly ?? 0)}</p>
        </article>
      </section>

      <section className={styles.analyticsGrid}>
        <article className="card">
          <div className={styles.cardHeader}>
            <h3>14-Day Trend</h3>
            <span>Last {trendPoints.length} days</span>
          </div>
          <div className={styles.chart}>
            {trendPoints.map((point) => {
              const height = Math.max((point.total / maxTrend) * 100, 4);
              return (
                <div key={point.date} className={styles.barColumn} title={`${point.date}: ${formatPeso(point.total)}`}>
                  <div className={styles.bar} style={{ height: `${height}%` }} />
                  <span>{point.date.slice(5)}</span>
                </div>
              );
            })}
          </div>
        </article>

        <article className="card">
          <div className={styles.cardHeader}>
            <h3>Category Share</h3>
            <span>Last 30 days</span>
          </div>
          <div className={styles.categoryList}>
            {topCategories.length === 0 ? <p className={styles.empty}>No category data yet.</p> : null}
            {topCategories.map((entry) => {
              const width = Math.max((entry.total / maxCategoryTotal) * 100, 6);
              return (
                <div key={entry.category} className={styles.categoryItem}>
                  <div className={styles.categoryMeta}>
                    <span>{entry.category}</span>
                    <span>{formatPeso(entry.total)}</span>
                  </div>
                  <div className={styles.categoryTrack}>
                    <div className={styles.categoryFill} style={{ width: `${width}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </article>
      </section>

      <section className="card">
        <div className={styles.cardHeader}>
          <h3>Filters</h3>
          <span>Search by merchant, category, and date range</span>
        </div>
        <div className={styles.filters}>
          <input
            className="text-input"
            placeholder="Search merchant or OCR text"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <select className="text-input" value={category} onChange={(event) => setCategory(event.target.value)}>
            {categories.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
          <input className="text-input" type="date" value={fromDate} onChange={(event) => setFromDate(event.target.value)} />
          <input className="text-input" type="date" value={toDate} onChange={(event) => setToDate(event.target.value)} />
          <button className="button" type="button" disabled={isFiltering} onClick={applyFilters}>
            {isFiltering ? "Filtering..." : "Apply"}
          </button>
          <button className="button button-muted" type="button" onClick={() => void resetFilters()}>
            Reset
          </button>
        </div>
      </section>

      <section className="card">
        <div className={styles.cardHeader}>
          <h3>Expenses</h3>
          <span>{expenses.length} records</span>
        </div>
        {isLoading ? <p className={styles.empty}>Loading expenses...</p> : null}
        {!isLoading && expenses.length === 0 ? <p className={styles.empty}>No expenses found.</p> : null}
        {!isLoading && expenses.length > 0 ? (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Merchant</th>
                  <th>Category</th>
                  <th>Method</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                {expenses.map((expense) => (
                  <tr key={expense._id}>
                    <td>{formatDate(expense.date)}</td>
                    <td>{expense.merchant}</td>
                    <td>{expense.category}</td>
                    <td>{expense.paymentMethod}</td>
                    <td>{formatPeso(expense.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </section>
    </div>
  );
}
