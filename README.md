# StockPulse 📈

> **A modern, real-time portfolio tracking platform for stocks, crypto, and investments**

Track your entire investment portfolio with live price updates, beautiful visualizations, and performance analytics—all in one place.

![Portfolio Dashboard](docs/screenshots/dashboard-overview.png)

---

## ✨ Features

### 📊 **Real-Time Portfolio Tracking**
- Live price updates from Finnhub (stocks/ETFs) and CoinGecko (crypto)
- Automatic portfolio value calculations with 60-second caching
- Track unlimited assets across multiple asset classes

### 📈 **Beautiful Visualizations**
- **Portfolio Allocation Chart** - Interactive donut chart showing asset distribution
- **Historical Performance** - 30-day portfolio value tracking with forward-filling
- **Benchmark Comparison** - Compare your returns against the S&P 500
- **Asset Breakdown** - Detailed view of all holdings with live P&L

![Portfolio Allocation](docs/screenshots/allocation-chart.png)
![Portfolio History](docs/screenshots/history-chart.png)

### 🔐 **Secure & Fast**
- JWT-based authentication with bcrypt password hashing
- In-memory caching for instant page loads (< 0.5s on refresh)
- Rate limiting and CORS protection
- PostgreSQL database with optimized indexes

### 💼 **Smart Portfolio Management**
- Add stocks, ETFs, and cryptocurrencies
- Track quantity, cost basis, and current value
- Calculate gains/losses automatically
- Delete assets with confirmation

![Add Asset](docs/screenshots/add-asset.png)
![Holdings View](docs/screenshots/holdings-list.png)

### 📉 **Performance Insights**
- Portfolio vs S&P 500 benchmark comparison
- Daily snapshots stored in database
- Historical trend analysis
- Net change tracking ($ and %)

![Benchmark Comparison](docs/screenshots/benchmark-chart.png)

---

## 🛠️ Tech Stack

### **Backend**
- **Framework:** Flask 3.0.0
- **Database:** PostgreSQL with SQLAlchemy ORM
- **Authentication:** JWT (PyJWT) + bcrypt
- **APIs:** Finnhub (stocks), CoinGecko (crypto - free)
- **Caching:** In-memory SimpleCache (60s TTL)
- **Security:** Flask-CORS, Flask-Limiter

### **Frontend**
- **Framework:** React 19.1.1 with Vite
- **Styling:** Tailwind CSS
- **Charts:** Recharts
- **Routing:** React Router v7
- **Icons:** Lucide React

### **DevOps**
- **Containerization:** Docker + Docker Compose
- **CI/CD:** GitHub Actions (build + deploy)
- **Database:** PostgreSQL 14

---

## 🚀 Quick Start

### **Prerequisites**
- Docker & Docker Compose
- Node.js 16+ (for local frontend development)
- Python 3.11+ (for local backend development)

### **1. Clone the Repository**
```bash
git clone https://github.com/harshpatel5/StockPulse.git
cd StockPulse
```

### **2. Set Up Environment Variables**

Create `backend/.env`:
```env
DATABASE_URL=postgresql://appuser:strongpassword@stockpulse-db:5432/portfoliodb
SECRET_KEY=your-secret-key-here
FINNHUB_KEY=your-finnhub-api-key  # Get free key at finnhub.io
DEBUG=False
```

### **3. Run with Docker**
```bash
docker-compose up --build
```

The app will be available at:
- **Frontend:** http://localhost:5173
- **Backend API:** http://localhost:5001

### **4. Create an Account**
1. Navigate to http://localhost:5173
2. Click "Sign Up" and create an account
3. Log in and start adding assets!

---

## 📁 Project Structure

```
StockPulse/
├── backend/
│   ├── app/
│   │   ├── main.py          # Flask app + all API routes
│   │   ├── models.py        # User, Asset, PortfolioHistory models
│   │   ├── auth.py          # JWT authentication decorator
│   │   ├── config.py        # Environment configuration
│   │   └── scheduler.py     # Price fetching + caching logic
│   ├── Dockerfile
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── components/      # Reusable UI components
│   │   ├── hooks/           # Custom React hooks (useAuth, useAssets)
│   │   ├── pages/           # Landing + Dashboard pages
│   │   ├── services/        # API client (api.js, priceService.js)
│   │   └── contexts/        # AuthContext for global state
│   ├── Dockerfile
│   └── package.json
├── docs/screenshots/        # App screenshots
├── docker-compose.yml       # Multi-container setup
└── README.md
```

---

## 🔌 API Endpoints

### **Authentication**
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/register` | Create new user |
| POST | `/api/login` | Login and get JWT token |
| GET | `/api/me` | Get current user info |

### **Assets**
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/assets` | Get all user assets |
| POST | `/api/assets` | Add new asset |
| DELETE | `/api/assets/<id>` | Delete asset |

### **Portfolio**
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/history` | Get 30-day chart data |
| POST | `/api/history/update` | Save portfolio snapshot |
| POST | `/api/portfolio/insights` | Get portfolio totals + allocation |

### **Prices** (Proxy endpoints - API keys hidden from frontend)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/prices/quote/<symbol>` | Get stock price (Finnhub) |
| POST | `/api/prices/batch` | Batch fetch stock prices |
| GET | `/api/crypto/quote/<symbol>` | Get crypto price (CoinGecko) |
| GET | `/api/prices/search?q=<query>` | Search stocks |
| GET | `/api/crypto/search?q=<query>` | Search crypto |

### **Benchmark**
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/benchmark/comparison` | Portfolio vs S&P 500 |

---

## 🎯 Key Features Explained

### **1. In-Memory Caching**
- Price data cached for 60 seconds to reduce API calls
- On page refresh, cached prices load instantly (< 0.5s)
- Cache key format: `stock:AAPL` or `crypto:BTC`

### **2. Parallel API Fetching**
- Frontend uses `Promise.all` to fetch assets, history, and prices simultaneously
- Reduced load time from 10 seconds → 4 seconds

### **3. Forward-Filling Historical Data**
- Portfolio history chart shows daily snapshots
- Missing days (weekends/holidays) forward-fill last known value
- Users see smooth continuous chart even with sparse data

### **4. Benchmark Comparison**
- Compares portfolio performance against S&P 500 index
- Shows relative outperformance/underperformance
- Data normalized to same starting point for fair comparison

---

## 🧪 Development

### **Backend Development**
```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
export FLASK_APP=app.main  # Windows: set FLASK_APP=app.main
flask run
```

### **Frontend Development**
```bash
cd frontend
npm install
npm run dev
```

### **Run Tests**
```bash
cd backend
pytest test/
```

---

## 🌐 Deployment

### **Recommended: AWS (12-month free tier)**
1. **EC2** for backend (t2.micro)
2. **RDS PostgreSQL** (db.t3.micro)
3. **S3 + CloudFront** for frontend static files

### **Alternative: Fly.io (Free forever)**
- Deploy backend as Docker container
- Use Fly.io Postgres (1GB free)
- Frontend on Vercel/Netlify

---

## 📸 Screenshots

### Dashboard Overview
![Dashboard](docs/screenshots/dashboard-overview.png)

### Portfolio Allocation
![Allocation](docs/screenshots/allocation-chart.png)

### Historical Performance
![History](docs/screenshots/history-chart.png)

### Benchmark Comparison
![Benchmark](docs/screenshots/benchmark-chart.png)

### Add New Asset
![Add Asset](docs/screenshots/add-asset.png)

### Holdings List
![Holdings](docs/screenshots/holdings-list.png)

---

## 🤝 Contributing

Pull requests are welcome! For major changes, please open an issue first to discuss what you would like to change.

---

## 📝 License

This project is licensed under the MIT License.

---

## 🙏 Acknowledgments

- **Finnhub** for stock market data API
- **CoinGecko** for free cryptocurrency price API
- **Recharts** for beautiful chart components
- **Tailwind CSS** for rapid UI development

---

**Built with ❤️ by [harshpatel5](https://github.com/harshpatel5)**