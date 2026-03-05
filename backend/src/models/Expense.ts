import { model, Schema, type InferSchemaType } from "mongoose";

const expenseItemSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    qty: { type: Number, required: true, default: 1 },
    price: { type: Number, required: true, min: 0 },
  },
  { _id: false },
);

const expenseSchema = new Schema(
  {
    userId: { type: String, required: true, index: true },
    total: { type: Number, required: true, min: 0 },
    merchant: { type: String, required: true, trim: true, index: true },
    date: { type: Date, required: true, index: true },
    category: {
      type: String,
      required: true,
      default: "Uncategorized",
      trim: true,
      index: true,
    },
    paymentMethod: { type: String, required: true, default: "Unknown", trim: true },
    rawText: { type: String, required: true, default: "" },
    imageUrl: { type: String, default: "" },
    items: { type: [expenseItemSchema], default: [] },
  },
  { timestamps: true },
);

expenseSchema.index({ merchant: "text", rawText: "text" });

export type ExpenseDocument = InferSchemaType<typeof expenseSchema>;
export const Expense = model("Expense", expenseSchema);

