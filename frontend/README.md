
# StockPulse Frontend

> Minimal, responsive portfolio tracker for stocks, crypto, bonds, ETFs, and commodities.

**Live Demo:** [https://stockpulse-frontend-z42b.onrender.com](https://stockpulse-frontend-z42b.onrender.com)

## Features

- Email/password authentication (localStorage persistence)
- Asset management (add, edit, delete)
- Live stock quotes (Alpha Vantage API)
- Portfolio allocation pie chart & per-asset value chart
- Clean dark UI, responsive for desktop & mobile

## Getting Started

```bash
cd frontend
npm install
npm run dev
```

## Environment Variables

Create a `.env` file in `frontend/`:

```
VITE_ALPHA_VANTAGE_KEY=your_alpha_vantage_key
VITE_API_BASE_URL=http://localhost:5000/api
```

> Do **not** commit your `.env` file to version control.

---
For backend/API setup, see the main project README.
