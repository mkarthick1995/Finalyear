#!/bin/bash

# RenalCare AI - Complete Setup Script
# Installs dependencies and initializes the entire project

echo "=================================="
echo "RenalCare AI - Complete Setup"
echo "=================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check Python
echo "Checking Python installation..."
if ! command -v python3 &> /dev/null; then
    echo -e "${RED}❌ Python 3 not found. Please install Python 3.8+${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Python $(python3 --version) found${NC}"
echo ""

# Navigate to backend
cd backend || exit 1

# Install Python dependencies
echo "Installing Python dependencies..."
pip install -r requirements.txt > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Dependencies installed${NC}"
else
    echo -e "${RED}❌ Failed to install dependencies${NC}"
    exit 1
fi
echo ""

# Initialize database
echo "Initializing database..."
python init_db.py > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Database initialized${NC}"
else
    echo -e "${RED}❌ Failed to initialize database${NC}"
    exit 1
fi
echo ""

# Create uploads directory
mkdir -p uploads
mkdir -p models
echo -e "${GREEN}✓ Created upload directories${NC}"
echo ""

echo "=================================="
echo -e "${GREEN}✓ Setup Complete!${NC}"
echo "=================================="
echo ""
echo "📝 Next Steps:"
echo "  1. Backend: python -m uvicorn main:app --port 8001"
echo "  2. Frontend: npm run dev (in root directory)"
echo "  3. API Docs: http://localhost:8001/docs"
echo ""
echo "🤖 Optional - Train the scan model:"
echo "  1. python prepare_dataset.py"
echo "  2. python train_vision_model.py"
echo ""
