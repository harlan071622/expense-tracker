import { Router } from "express";
import { z } from "zod";

import { Expense } from "../models/Expense";

const itemSchema = z.object({
  name: z.string().min(1),
  qty: z.coerce.number().min(1).default(1),
  price: z.coerce.number().min(0),
});

const createExpenseSchema = z.object({
  userId: z.string().min(1).default("demo-user"),
  total: z.coerce.number().min(0),
  merchant: z.string().min(1),
  date: z.string().min(4),
  category: z.string().min(1).default("Uncategorized"),
  paymentMethod: z.string().min(1).default("Unknown"),
  rawText: z.string().default(""),
  imageUrl: z.string().optional().default(""),
  items: z.array(itemSchema).optional().default([]),
});

const listQuerySchema = z.object({
  userId: z.string().optional().default("demo-user"),
  search: z.string().optional(),
  category: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  limit: z.coerce.number().min(1).max(200).default(50),
});

const statsQuerySchema = z.object({
  userId: z.string().optional().default("demo-user"),
  days: z.coerce.number().min(7).max(180).default(30),
});

function toDayStart(value: Date): Date {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
}

function formatDateLabel(date: Date): string {
  return date.toISOString().slice(0, 10);
}

async function sumForDateRange(userId: string, start: Date, end: Date): Promise<number> {
  const [result] = await Expense.aggregate([
    {
      $match: {
        userId,
        date: {
          $gte: start,
          $lt: end,
        },
      },
    },
    {
      $group: {
        _id: null,
        sum: { $sum: "$total" },
      },
    },
  ]);

  return Number((result?.sum ?? 0).toFixed(2));
}

export const expenseRoutes = Router();

expenseRoutes.post("/", async (req, res, next) => {
  try {
    const payload = createExpenseSchema.parse(req.body);
    const parsedDate = new Date(payload.date);
    if (Number.isNaN(parsedDate.getTime())) {
      res.status(400).json({ message: "Invalid expense date." });
      return;
    }

    const expense = await Expense.create({
      ...payload,
      date: parsedDate,
    });

    res.status(201).json(expense);
  } catch (error) {
    next(error);
  }
});

expenseRoutes.get("/", async (req, res, next) => {
  try {
    const query = listQuerySchema.parse(req.query);
    const mongoQuery: Record<string, unknown> = {
      userId: query.userId,
    };

    if (query.category && query.category !== "All") {
      mongoQuery.category = query.category;
    }

    if (query.search) {
      const escaped = query.search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      mongoQuery.$or = [
        { merchant: { $regex: escaped, $options: "i" } },
        { rawText: { $regex: escaped, $options: "i" } },
      ];
    }

    if (query.from || query.to) {
      const dateQuery: Record<string, Date> = {};
      if (query.from) {
        dateQuery.$gte = new Date(query.from);
      }
      if (query.to) {
        const inclusiveEnd = new Date(query.to);
        inclusiveEnd.setDate(inclusiveEnd.getDate() + 1);
        dateQuery.$lt = inclusiveEnd;
      }
      mongoQuery.date = dateQuery;
    }

    const expenses = await Expense.find(mongoQuery).sort({ date: -1, createdAt: -1 }).limit(query.limit);
    res.json(expenses);
  } catch (error) {
    next(error);
  }
});

expenseRoutes.get("/stats", async (req, res, next) => {
  try {
    const query = statsQuerySchema.parse(req.query);

    const now = new Date();
    const startOfToday = toDayStart(now);
    const startOfTomorrow = new Date(startOfToday);
    startOfTomorrow.setDate(startOfTomorrow.getDate() + 1);

    const startOfWeek = toDayStart(now);
    const dayOfWeek = startOfWeek.getDay();
    startOfWeek.setDate(startOfWeek.getDate() - dayOfWeek);

    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [daily, weekly, monthly] = await Promise.all([
      sumForDateRange(query.userId, startOfToday, startOfTomorrow),
      sumForDateRange(query.userId, startOfWeek, startOfTomorrow),
      sumForDateRange(query.userId, startOfMonth, startOfTomorrow),
    ]);

    const chartStart = toDayStart(now);
    chartStart.setDate(chartStart.getDate() - (query.days - 1));

    const chartAggregation = await Expense.aggregate([
      {
        $match: {
          userId: query.userId,
          date: { $gte: chartStart, $lt: startOfTomorrow },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: {
              format: "%Y-%m-%d",
              date: "$date",
            },
          },
          total: { $sum: "$total" },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const chartMap = new Map<string, number>(
      chartAggregation.map((item) => [item._id as string, Number(item.total.toFixed(2))]),
    );

    const trend: Array<{ date: string; total: number }> = [];
    for (let i = 0; i < query.days; i += 1) {
      const pointDate = new Date(chartStart);
      pointDate.setDate(pointDate.getDate() + i);
      const label = formatDateLabel(pointDate);
      trend.push({
        date: label,
        total: chartMap.get(label) ?? 0,
      });
    }

    const categoryBreakdown = await Expense.aggregate([
      {
        $match: {
          userId: query.userId,
          date: { $gte: chartStart, $lt: startOfTomorrow },
        },
      },
      {
        $group: {
          _id: "$category",
          total: { $sum: "$total" },
        },
      },
      { $sort: { total: -1 } },
      { $limit: 8 },
    ]);

    res.json({
      totals: { daily, weekly, monthly },
      trend,
      categoryBreakdown: categoryBreakdown.map((entry) => ({
        category: entry._id || "Uncategorized",
        total: Number(entry.total.toFixed(2)),
      })),
    });
  } catch (error) {
    next(error);
  }
});

