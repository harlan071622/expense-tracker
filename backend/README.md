# Backend (Express + MongoDB + OCR)

API for OCR Expense Tracker.

## Setup

```bash
cp .env.example .env
npm install
npm run dev
```

## Environment

- `PORT` default `4000`
- `MONGODB_URI` required
- `FRONTEND_ORIGIN` default `http://localhost:3000`

## Endpoints

- `GET /api/health`
- `POST /api/ocr/extract` multipart image (`receipt`)
- `POST /api/ocr/parse` body `{ "rawText": "..." }`
- `POST /api/expenses`
- `GET /api/expenses`
- `GET /api/expenses/stats`

