import { Router } from "express";
import multer from "multer";
import { z } from "zod";

import { runReceiptOcr } from "../services/ocrService";
import { parseReceipt } from "../utils/receiptParser";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
      return;
    }
    cb(new Error("Only image uploads are supported."));
  },
});

const parseSchema = z.object({
  rawText: z.string().min(1, "rawText is required"),
});

export const ocrRoutes = Router();

ocrRoutes.post("/extract", upload.single("receipt"), async (req, res, next) => {
  try {
    if (!req.file?.buffer) {
      res.status(400).json({ message: "Upload a receipt image in field 'receipt'." });
      return;
    }

    const result = await runReceiptOcr(req.file.buffer);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

ocrRoutes.post("/parse", (req, res, next) => {
  try {
    const parsedPayload = parseSchema.parse(req.body);
    const draft = parseReceipt(parsedPayload.rawText);

    res.json({
      ...draft,
      rawText: parsedPayload.rawText,
    });
  } catch (error) {
    next(error);
  }
});

