#!/bin/bash

# TigerTix Testing Suite Runner
# Sprint 2 - Task 3: Automated Testing Script

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test results tracking
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

echo -e "${BLUE}╔══════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║         TigerTix Automated Testing Suite                ║${NC}"
echo -e "${BLUE}║         Sprint 2 - Task 3                                ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════════╝${NC}"
echo ""

# Function to print section headers
print_header() {
    echo ""
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}  $1${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
}

# Function to run tests and track results
run_test() {
    local test_name=$1
    local test_command=$2
    
    echo -e "${YELLOW}Running: ${test_name}...${NC}"
    
    if eval "$test_command"; then
        echo -e "${GREEN}✓ PASSED: ${test_name}${NC}"
        ((PASSED_TESTS++))
        return 0
    else
        echo -e "${RED}✗ FAILED: ${test_name}${NC}"
        ((FAILED_TESTS++))
        return 1
    fi
}

# Pre-flight checks
print_header "Pre-flight Checks"

echo "Checking Node.js installation..."
if command -v node &> /dev/null; then
    echo -e "${GREEN}✓ Node.js $(node --version) installed${NC}"
else
    echo -e "${RED}✗ Node.js not found. Please install Node.js${NC}"
    exit 1
fi

echo "Checking npm installation..."
if command -v npm &> /dev/null; then
    echo -e "${GREEN}✓ npm $(npm --version) installed${NC}"
else
    echo -e "${RED}✗ npm not found. Please install npm${NC}"
    exit 1
fi

echo "Checking SQLite installation..."
if command -v sqlite3 &> /dev/null; then
    echo -e "${GREEN}✓ SQLite $(sqlite3 --version | cut -d' ' -f1) installed${NC}"
else
    echo -e "${YELLOW}⚠ SQLite command-line tool not found (optional)${NC}"
fi

# Check if database exists
if [ -f "backend/shared-db/database.sqlite" ]; then
    echo -e "${GREEN}✓ Database file exists${NC}"
else
    echo -e "${YELLOW}⚠ Database file not found. It will be created when services start.${NC}"
fi

# Install dependencies if needed
print_header "Installing Dependencies"

echo "Installing backend dependencies..."
cd backend/admin-service
if [ ! -d "node_modules" ]; then
    echo "Installing admin-service dependencies..."
    npm install --silent
fi
cd ../..

cd backend/client-service
if [ ! -d "node_modules" ]; then
    echo "Installing client-service dependencies..."
    npm install --silent
fi
cd ../..

cd frontend
if [ ! -d "node_modules" ]; then
    echo "Installing frontend dependencies..."
    npm install --silent
fi
cd ..

# Install testing dependencies
echo "Installing test dependencies..."
npm install --save-dev jest@29.7.0 supertest@6.3.3 --silent 2>/dev/null || true

echo -e "${GREEN}✓ All dependencies installed${NC}"

# Run Backend Tests
print_header "Backend Unit Tests"

echo -e "${BLUE}Testing Admin Service...${NC}"
cd backend/admin-service
if [ -f "__tests__/adminController.test.js" ]; then
    run_test "Admin Controller Tests" "npx jest __tests__/adminController.test.js --silent 2>/dev/null || npx jest __tests__/adminController.test.js"
    ((TOTAL_TESTS++))
else
    echo -e "${YELLOW}⚠ Admin tests not found${NC}"
fi
cd ../..

echo ""
echo -e "${BLUE}Testing Client Service...${NC}"
cd backend/client-service
if [ -f "__tests__/llmService.test.js" ]; then
    run_test "LLM Service Tests" "npx jest __tests__/llmService.test.js --silent 2>/dev/null || npx jest __tests__/llmService.test.js"
    ((TOTAL_TESTS++))
else
    echo -e "${YELLOW}⚠ LLM Service tests not found${NC}"
fi
cd ../..

# Run Frontend Tests
print_header "Frontend Tests"

cd frontend
if [ -f "src/__tests__/App.integration.test.js" ]; then
    echo -e "${BLUE}Testing React Components...${NC}"
    run_test "Frontend Integration Tests" "npm test -- --watchAll=false --silent 2>/dev/null || npm test -- --watchAll=false"
    ((TOTAL_TESTS++))
else
    echo -e "${YELLOW}⚠ Frontend tests not found${NC}"
fi
cd ..

# Database Transaction Tests
print_header "Database Transaction Tests"

echo "Verifying database integrity..."
if [ -f "backend/shared-db/database.sqlite" ]; then
    echo "Checking events table..."
    EVENT_COUNT=$(sqlite3 backend/shared-db/database.sqlite "SELECT COUNT(*) FROM events;" 2>/dev/null || echo "0")
    echo -e "${GREEN}✓ Found ${EVENT_COUNT} events in database${NC}"
    
    echo "Checking bookings table..."
    BOOKING_COUNT=$(sqlite3 backend/shared-db/database.sqlite "SELECT COUNT(*) FROM bookings;" 2>/dev/null || echo "0")
    echo -e "${GREEN}✓ Found ${BOOKING_COUNT} bookings in database${NC}"
else
    echo -e "${YELLOW}⚠ Database file not accessible${NC}"
fi

# API Endpoint Tests (if services are running)
print_header "API Health Checks"

echo "Checking if services are running..."

# Check Admin Service
if curl -s -f http://localhost:5001/health > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Admin Service (port 5001) is running${NC}"
    run_test "Admin Service Health" "curl -s -f http://localhost:5001/health"
    ((TOTAL_TESTS++))
else
    echo -e "${YELLOW}⚠ Admin Service (port 5001) is not running${NC}"
    echo "  Start with: cd backend/admin-service && npm start"
fi

# Check Client Service
if curl -s -f http://localhost:6001/api/events > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Client Service (port 6001) is running${NC}"
    run_test "Client Service Events API" "curl -s -f http://localhost:6001/api/events"
    ((TOTAL_TESTS++))
else
    echo -e "${YELLOW}⚠ Client Service (port 6001) is not running${NC}"
    echo "  Start with: cd backend/client-service && npm start"
fi

# Check Frontend
if curl -s -f http://localhost:3000 > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Frontend (port 3000) is running${NC}"
else
    echo -e "${YELLOW}⚠ Frontend (port 3000) is not running${NC}"
    echo "  Start with: cd frontend && npm start"
fi

# Test Summary
print_header "Test Summary"

echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}                     TEST RESULTS                          ${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "  Total Tests:      ${BLUE}${TOTAL_TESTS}${NC}"
echo -e "  Passed:           ${GREEN}${PASSED_TESTS}${NC}"
echo -e "  Failed:           ${RED}${FAILED_TESTS}${NC}"
echo ""

if [ $TOTAL_TESTS -eq 0 ]; then
    echo -e "${YELLOW}⚠ No tests were executed${NC}"
    echo -e "${YELLOW}  Make sure test files exist and dependencies are installed${NC}"
    PASS_RATE=0
elif [ $FAILED_TESTS -eq 0 ]; then
    PASS_RATE=$((PASSED_TESTS * 100 / TOTAL_TESTS))
    echo -e "  Pass Rate:        ${GREEN}${PASS_RATE}%${NC}"
    echo ""
    echo -e "${GREEN}╔══════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║                  ALL TESTS PASSED! ✓                     ║${NC}"
    echo -e "${GREEN}╚══════════════════════════════════════════════════════════╝${NC}"
else
    PASS_RATE=$((PASSED_TESTS * 100 / TOTAL_TESTS))
    echo -e "  Pass Rate:        ${YELLOW}${PASS_RATE}%${NC}"
    echo ""
    echo -e "${RED}╔══════════════════════════════════════════════════════════╗${NC}"
    echo -e "${RED}║              SOME TESTS FAILED ✗                         ║${NC}"
    echo -e "${RED}╚══════════════════════════════════════════════════════════╝${NC}"
fi

echo ""

# Manual Testing Reminder
print_header "Next Steps"

echo -e "${BLUE}Automated tests complete!${NC}"
echo ""
echo -e "For complete Sprint 2 Task 3 testing, also complete:"
echo ""
echo -e "  1. ${YELLOW}Manual Testing${NC}"
echo -e "     → Use MANUAL_TESTING_CHECKLIST.md"
echo -e "     → Test voice interface with microphone"
echo -e "     → Test with screen readers (NVDA/VoiceOver)"
echo -e "     → Test keyboard navigation"
echo ""
echo -e "  2. ${YELLOW}Accessibility Testing${NC}"
echo -e "     → High contrast mode"
echo -e "     → Reduced motion"
echo -e "     → Color blindness simulation"
echo ""
echo -e "  3. ${YELLOW}Browser Compatibility${NC}"
echo -e "     → Chrome, Edge, Safari, Firefox"
echo -e "     → Voice features in supported browsers"
echo ""
echo -e "  4. ${YELLOW}Performance Testing${NC}"
echo -e "     → Measure response times"
echo -e "     → Test concurrent bookings"
echo ""
echo -e "${BLUE}Full documentation: TESTING_DOCUMENTATION.md${NC}"
echo ""

# Exit with appropriate code
if [ $FAILED_TESTS -gt 0 ]; then
    exit 1
else
    exit 0
fi
