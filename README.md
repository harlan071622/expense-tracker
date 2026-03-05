# OCR Expense Tracker (Receipt -> Auto Expense)

Full MVP scaffold with:
- `frontend`: Next.js + TypeScript UI
- `backend`: Express + TypeScript API + MongoDB + OCR parsing

## Features Included

- Upload receipt/screenshot image
- OCR extraction (`POST /api/ocr/extract`)
- Parsed draft fields (`POST /api/ocr/parse`)
- User review/edit before save
- Save expense to MongoDB (`POST /api/expenses`)
- Dashboard with:
  - Daily/weekly/monthly totals
  - Search and filters
  - 14-day trend bars
  - Category breakdown

## Run Locally

## 1) Backend

```bash
cd backend
cp .env.example .env
```

Set `MONGODB_URI` in `.env`, then:

```bash
npm install
npm run dev
```

API runs at `http://localhost:4000`.

## 2) Frontend

```bash
cd frontend
cp .env.example .env.local
npm install
npm run dev
```

Frontend runs at `http://localhost:3000`.

## API Endpoints

- `GET /api/health`
- `POST /api/ocr/extract` (multipart form-data, file field: `receipt`)
- `POST /api/ocr/parse` (`{ "rawText": "..." }`)
- `POST /api/expenses`
- `GET /api/expenses`
- `GET /api/expenses/stats`

## Notes

- OCR is probabilistic; review UI is required in workflow.
- Current auth is mocked with `userId: "demo-user"` for MVP.
- Currency display is USD in frontend formatting.

