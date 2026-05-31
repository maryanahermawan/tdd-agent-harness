# Proximity Service with Vibe Score Ranking

A location-based search service with semantic ranking powered by AI. Similar to Google Maps/Yelp, but with intelligent preference-based ranking.

## Features

- **Proximity Search**: Find businesses within 1km or 5km radius
- **Semantic Ranking**: Different user preferences yield different rankings
- **User Authentication**: JWT-based authentication for business owners
- **Business Management**: CRUD operations for business owners
- **Interactive Maps**: Leaflet-based maps with markers and info windows
- **Responsive UI**: React + Tailwind CSS interface

## Technology Stack

### Frontend
- React 18 with Vite
- Tailwind CSS (via CDN)
- React Router for navigation
- Leaflet for maps
- Port: 5173

### Backend
- Node.js with Express
- PostgreSQL database
- JWT authentication
- Voyage AI for semantic embeddings
- Port: 3000

### Testing
- Vitest for backend API tests
- Supertest for HTTP assertions
- Puppeteer for frontend E2E tests

## Quick Start

### Prerequisites
- Node.js (v18+)
- PostgreSQL running on localhost:55000
- npm or pnpm

### Installation

```bash
# Run the initialization script
./init.sh
```

This will:
1. Apply database migration
2. Install all dependencies
3. Set up environment variables

### Running the Application

**Terminal 1 - Backend Server:**
```bash
cd server
npm start
```
Backend will run on http://localhost:3000

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```
Frontend will run on http://localhost:5173

**Terminal 3 - Run Tests:**
```bash
cd functional_tests
npm test
```

## Database

**Connection:**
```
postgres://postgres:postgrespw@localhost:55000/postgres
```

**Sample Users (password: test123):**
- john_doe
- jane_smith
- bob_wilson

**Sample Data:**
27 businesses with real Singapore locations including:
- Restaurants (The Wild Rocket, Burnt Ends, Odette, etc.)
- Cafes (Kith Cafe, Common Man Coffee Roasters, etc.)
- Hotels (Marina Bay Sands, Raffles Hotel, etc.)
- Museums and Attractions

## API Endpoints

### Public Endpoints

**Search nearby businesses:**
```
GET /v1/search/nearby?lat=1.2897&lon=103.8501&radius=1&preference=cafe+with+wifi
```

**Get business details:**
```
GET /v1/business/:id
```

### Authentication

**Sign up:**
```
POST /v1/signup
{
  "username": "string",
  "password": "string"
}
```

**Sign in:**
```
POST /v1/signin
{
  "username": "string",
  "password": "string"
}
```

### Protected Endpoints (Require JWT Token)

**Create business:**
```
POST /v1/business
Authorization: Bearer <token>
{
  "name": "string",
  "address": "string",
  "latitude": number,
  "longitude": number,
  "description": "string",
  "semantic_search_blob": "string"
}
```

**Update business:**
```
PUT /v1/business/:id
Authorization: Bearer <token>
```

**Delete business:**
```
DELETE /v1/business/:id
Authorization: Bearer <token>
```

## Testing

### Run All Tests
```bash
cd functional_tests
npm test
```

### Run Backend Tests Only
```bash
npm run test:backend
```

### Run Frontend Tests Only
```bash
npm run test:frontend
```

### Run Priority P1 Tests
```bash
npm run test:p1
```

### Test Summary
See `functional_tests/functional_tests_summary.json` for complete test documentation.

**Test Breakdown:**
- 20 total tests
- 10 backend API tests
- 10 frontend E2E tests
- Priority levels: P1 (core), P2 (important), P3 (nice-to-have)

## Project Structure

```
proximity_service/
├── data/
│   └── migration.sql           # Database schema and seed data
├── server/                     # Backend Express server
│   ├── index.js               # Main server file
│   ├── db.js                  # Database connection
│   ├── routes/
│   │   ├── auth.js            # Authentication routes
│   │   ├── business.js        # Business CRUD routes
│   │   └── search.js          # Search routes
│   ├── package.json
│   └── .env                   # Environment variables
├── frontend/                   # React frontend
│   ├── src/
│   │   ├── App.jsx            # Main app component
│   │   └── main.jsx           # Entry point
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
├── functional_tests/           # All functional tests
│   ├── backend_auth.test.js
│   ├── backend_search.test.js
│   ├── backend_business_crud.test.js
│   ├── frontend_search.test.js
│   ├── frontend_business_management.test.js
│   ├── functional_tests_summary.json
│   └── package.json
├── init.sh                     # Setup script
├── claude-progress.txt         # Development progress
└── README.md                   # This file
```

## Development Workflow (TDD)

This project follows Test-Driven Development:

1. Tests are written first (already done)
2. All tests currently fail with "501 Not Implemented"
3. Implement features to make tests pass one by one
4. Start with P1 tests (core functionality)
5. Then P2 tests (important features)
6. Finally P3 tests (nice-to-have)

**Current Status:**
- Tests: Written and failing (as expected)
- Backend: Skeleton with route stubs
- Frontend: Basic UI structure
- Database: Seeded and ready

**Next Steps:**
Implement features to make P1 tests pass:
1. Authentication (signup/signin)
2. Proximity search
3. Semantic ranking with Voyage AI
4. Basic frontend search flow

## Environment Variables

Create `server/.env` (or copy from `.env.example`):

```env
PORT=3000
DATABASE_URL=postgres://postgres:postgrespw@localhost:55000/postgres
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=7d
VOYAGE_API_KEY_PATH=/tmp/api-key
```

## Health Check

```bash
curl http://localhost:3000/health
```

Expected response:
```json
{
  "status": "healthy",
  "timestamp": "2026-05-31T15:00:00.000Z",
  "database": "connected"
}
```

## License

MIT

## Notes

- This is a TDD project - tests define the requirements
- Voyage AI integration requires API key at /tmp/api-key
- Database uses simplified schema (no PostGIS/pgvector yet)
- Distance calculations use Haversine formula
- For production, migrate to PostGIS + pgvector for performance
