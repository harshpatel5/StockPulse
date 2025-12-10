# StockPulse Frontend

Minimal, responsive portfolio tracking UI with auth, asset management, and Alpha Vantage powered pricing.

## Getting Started

```bash
cd frontend
npm install
npm run dev
```

## Environment Variables

Create `frontend/.env` with:

```
VITE_ALPHA_VANTAGE_KEY=your_alpha_vantage_key
VITE_API_BASE_URL=http://localhost:5000/api
```

The React app reads these via `import.meta.env.*`. Keep the `.env` file out of version control.

## Features

- Email/password login + registration, persisted via localStorage
- Asset CRUD with support for stocks, crypto, bonds, ETFs, and commodities
- Live stock quotes from Alpha Vantage with fallback to cost basis
- Allocation pie chart plus per-asset value line chart (Recharts)
- Minimal dark UI tuned for desktop and mobile breakpoints
