#!/bin/bash

# Proximity Service - Initialization Script
# This script sets up the development environment and starts all services

set -e

echo "============================================"
echo "Proximity Service - Initialization"
echo "============================================"
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Check if PostgreSQL is running
echo -e "${YELLOW}Checking PostgreSQL connection...${NC}"
if pg_isready -h localhost -p 55000 -U postgres > /dev/null 2>&1; then
  echo -e "${GREEN}PostgreSQL is running${NC}"
else
  echo "PostgreSQL is not running on localhost:55000"
  echo "Please start PostgreSQL before running this script"
  exit 1
fi

# Apply database migration
echo ""
echo -e "${YELLOW}Applying database migration...${NC}"
psql postgres://postgres:postgrespw@localhost:55000/postgres -f data/migration.sql
echo -e "${GREEN}Database migration complete${NC}"

# Install backend dependencies
echo ""
echo -e "${YELLOW}Installing backend dependencies...${NC}"
cd server
if [ ! -d "node_modules" ]; then
  npm install
else
  echo "Backend dependencies already installed"
fi
cd ..

# Install frontend dependencies
echo ""
echo -e "${YELLOW}Installing frontend dependencies...${NC}"
cd frontend
if [ ! -d "node_modules" ]; then
  npm install
else
  echo "Frontend dependencies already installed"
fi
cd ..

# Install functional test dependencies
echo ""
echo -e "${YELLOW}Installing functional test dependencies...${NC}"
cd functional_tests
if [ ! -d "node_modules" ]; then
  npm install
else
  echo "Test dependencies already installed"
fi
cd ..

# Create .env file for backend if it doesn't exist
if [ ! -f "server/.env" ]; then
  echo ""
  echo -e "${YELLOW}Creating .env file for backend...${NC}"
  cp server/.env.example server/.env
  echo -e "${GREEN}.env file created${NC}"
fi

echo ""
echo "============================================"
echo -e "${GREEN}Setup Complete!${NC}"
echo "============================================"
echo ""
echo "To start the services:"
echo ""
echo "  1. Start Backend Server:"
echo "     cd server && npm start"
echo "     Backend will run on: http://localhost:3000"
echo ""
echo "  2. Start Frontend (in a new terminal):"
echo "     cd frontend && npm run dev"
echo "     Frontend will run on: http://localhost:5173"
echo ""
echo "  3. Run Functional Tests (in a new terminal):"
echo "     cd functional_tests && npm test"
echo ""
echo "Health Check:"
echo "  curl http://localhost:3000/health"
echo ""
echo "Database Connection:"
echo "  postgres://postgres:postgrespw@localhost:55000/postgres"
echo ""
echo "Sample Users (password: test123):"
echo "  - john_doe"
echo "  - jane_smith"
echo "  - bob_wilson"
echo ""
echo "============================================"
