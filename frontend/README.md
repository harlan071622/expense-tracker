# Frontend (Next.js)

UI for OCR Expense Tracker.

## Setup

```bash
cp .env.example .env.local
npm install
npm run dev
```

Open `http://localhost:3000`.

## Environment

- `NEXT_PUBLIC_API_URL` (default: `http://localhost:4000/api`)

## Pages

- `/` dashboard totals + filters + chart + expense list
- `/new` upload receipt -> OCR -> review -> save
