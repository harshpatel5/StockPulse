# StockPulse

A cloud-native portfolio tracking platform for managing stocks, crypto, and investments. Track your stock and cryptocurrency holdings in real-time with live price updates and portfolio performance analytics.

## Project Status

**Status:** Complete

### Features Implemented
- User authentication with JWT tokens
- PostgreSQL database with SQLAlchemy ORM
- RESTful API endpoints for portfolio management
- Live stock price tracking (Finnhub API)
- Cryptocurrency price updates
- Portfolio performance history and snapshots
- Background job scheduling for data updates
- React frontend with Tailwind CSS
- Interactive charts and visualizations (Recharts)
- Docker containerization
- Rate limiting and CORS security
- Role-based access control

## Tech Stack

**Backend:** 
- Flask 3.0.0
- PostgreSQL with SQLAlchemy ORM
- JWT authentication with PyJWT
- Password hashing with bcrypt
- APScheduler for background jobs
- Rate limiting with Flask-Limiter

**Frontend:** 
- React 19.1.1
- Vite build tool
- Tailwind CSS for styling
- Recharts for data visualization
- React Router for navigation

**DevOps:** 
- Docker & Docker Compose
- PostgreSQL database
- RESTful API architecture

## Core Features

### Backend (`/backend`)
- **Authentication:** Secure JWT-based user authentication with password hashing
- **Models:** User, Asset, and PortfolioHistory tracking
- **Scheduler:** Automated background jobs for live price updates
- **Rate Limiting:** Protection against abuse with configurable limits
- **API Endpoints:** Full CRUD operations for assets and portfolio management

### Frontend (`/frontend`)
- **Dashboard:** Real-time portfolio overview with total value and performance metrics
- **Asset Management:** Add, update, and remove stocks/crypto from portfolio
- **Visualizations:** Interactive charts showing portfolio breakdown and historical performance
- **Live Updates:** Real-time price tracking and portfolio value changes
- **Responsive Design:** Mobile-friendly interface with Tailwind CSS

## Getting Started

### Prerequisites
- Python 3.8+
- Node.js 16+
- PostgreSQL 12+
- Docker (optional)

### Backend Setup
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt

# Configure environment variables
# Create .env file with database URL and API keys
export FLASK_APP=app.main
export FLASK_ENV=development
flask run
```

### Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

### Docker Setup
```bash
docker-compose up --build
```

## Project Structure
```
StockPulse/
├── backend/
│   ├── app/
│   │   ├── main.py          # Flask app factory and routes
│   │   ├── models.py        # SQLAlchemy models
│   │   ├── auth.py          # JWT authentication
│   │   ├── config.py        # Configuration
│   │   └── scheduler.py     # Background jobs
│   ├── test/                # Unit tests
│   ├── Dockerfile
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── pages/           # React page components
│   │   ├── components/      # Reusable components
│   │   ├── services/        # API communication
│   │   ├── contexts/        # React contexts
│   │   └── hooks/           # Custom hooks
│   ├── Dockerfile
│   └── package.json
└── docker-compose.yml
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Create new user account
- `POST /api/auth/login` - User login

### Assets
- `GET /api/assets` - Get all user assets
- `POST /api/assets` - Add new asset
- `PUT /api/assets/<id>` - Update asset
- `DELETE /api/assets/<id>` - Remove asset

### Portfolio
- `GET /api/portfolio/value` - Get total portfolio value
- `GET /api/portfolio/history` - Get historical snapshots

## Development

### Running Tests
```bash
cd backend
pytest test/
```

### Code Quality
```bash
cd frontend
npm run lint
npm run lint:fix
```