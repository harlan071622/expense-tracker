import cors from "cors";
import express, { type NextFunction, type Request, type Response } from "express";
import { ZodError } from "zod";

import { env } from "./config/env";
import { connectMongo } from "./db/connect";
import { expenseRoutes } from "./routes/expenseRoutes";
import { ocrRoutes } from "./routes/ocrRoutes";

const app = express();

const allowedOrigins = env.frontendOrigin.split(",").map((origin) => origin.trim());
const isDevMode = env.nodeEnv !== "production";

function isPrivateIpv4(hostname: string): boolean {
  const parts = hostname.split(".").map((part) => Number.parseInt(part, 10));
  if (parts.length !== 4 || parts.some((part) => Number.isNaN(part))) {
    return false;
  }

  const [a, b] = parts;
  if (a === undefined || b === undefined) {
    return false;
  }
  if (a === 10) {
    return true;
  }
  if (a === 172 && b >= 16 && b <= 31) {
    return true;
  }
  return a === 192 && b === 168;
}

function isLocalDevOrigin(origin: string): boolean {
  try {
    const parsed = new URL(origin);
    const hostname = parsed.hostname.toLowerCase();
    return hostname === "localhost" || hostname === "127.0.0.1" || isPrivateIpv4(hostname);
  } catch {
    return false;
  }
}

app.use(
  cors({
    origin: (origin, callback) => {
      if (isDevMode) {
        callback(null, true);
        return;
      }

      const allowByConfig = !!origin && allowedOrigins.includes(origin);
      const allowLocalDev = !!origin && isLocalDevOrigin(origin);

      if (!origin || allowByConfig || allowLocalDev) {
        callback(null, true);
        return;
      }
      callback(new Error("Origin is not allowed by CORS"));
    },
  }),
);
app.use(express.json({ limit: "2mb" }));

app.get("/", (_req, res) => {
  res.json({
    service: "OCR Expense Tracker API",
    message: "Use /api for endpoints",
    docs: "/api",
  });
});

app.get("/api", (_req, res) => {
  res.json({
    service: "OCR Expense Tracker API",
    routes: {
      health: "GET /api/health",
      ocrExtract: "POST /api/ocr/extract (multipart field: receipt)",
      ocrParse: "POST /api/ocr/parse",
      createExpense: "POST /api/expenses",
      listExpenses: "GET /api/expenses",
      expenseStats: "GET /api/expenses/stats",
    },
  });
});

app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
  });
});

app.use("/api/ocr", ocrRoutes);
app.use("/api/expenses", expenseRoutes);

app.use((_req, res) => {
  res.status(404).json({
    message: "Route not found",
  });
});

app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (error instanceof ZodError) {
    res.status(400).json({
      message: "Validation error",
      issues: error.issues,
    });
    return;
  }

  if (error instanceof Error) {
    res.status(500).json({
      message: error.message,
    });
    return;
  }

  res.status(500).json({
    message: "Unexpected server error",
  });
});

async function bootstrap() {
  await connectMongo();
  app.listen(env.port, () => {
    // eslint-disable-next-line no-console
    console.log(`Backend API running at http://localhost:${env.port}`);
  });
}

bootstrap().catch((error: unknown) => {
  // eslint-disable-next-line no-console
  console.error("Failed to start server:", error);
  process.exit(1);
});
