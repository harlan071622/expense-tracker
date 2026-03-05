import Tesseract from "tesseract.js";

type OcrResult = {
  rawText: string;
  lines: string[];
  confidence: number;
};

export async function runReceiptOcr(image: Buffer): Promise<OcrResult> {
  const worker = await Tesseract.createWorker("eng");
  try {
    const {
      data: { text, confidence },
    } = await worker.recognize(image);

    const lines = text
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    return {
      rawText: text,
      lines,
      confidence,
    };
  } finally {
    await worker.terminate();
  }
}

