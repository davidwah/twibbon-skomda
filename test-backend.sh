#!/bin/bash

# Simple script to test the backend server
# Usage: ./test-backend.sh [admin-token]

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

BASE_URL=${BASE_URL:-"http://localhost:3000"}
ADMIN_TOKEN=${1:-"test-admin-token-12345"}

echo -e "${YELLOW}Testing Twibbon Backend Server${NC}"
echo "Base URL: $BASE_URL"
echo ""

# Test 1: Health Check
echo -e "${YELLOW}1. Testing Health Endpoint...${NC}"
HEALTH=$(curl -s "$BASE_URL/healthz")
if echo "$HEALTH" | grep -q "ok"; then
    echo -e "${GREEN}✓ Health check passed${NC}"
    echo "$HEALTH" | python3 -m json.tool 2>/dev/null || echo "$HEALTH"
else
    echo -e "${RED}✗ Health check failed${NC}"
    echo "$HEALTH"
fi
echo ""

# Test 2: Static Files
echo -e "${YELLOW}2. Testing Static File Serving...${NC}"
STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/")
if [ "$STATUS" = "200" ]; then
    echo -e "${GREEN}✓ Static files are being served${NC}"
else
    echo -e "${RED}✗ Static files not accessible (HTTP $STATUS)${NC}"
fi
echo ""

# Test 3: API - No Auth
echo -e "${YELLOW}3. Testing API without authentication...${NC}"
NO_AUTH=$(curl -s -X POST "$BASE_URL/api/frames")
if echo "$NO_AUTH" | grep -q "Authorization header is required"; then
    echo -e "${GREEN}✓ Authentication is required${NC}"
    echo "$NO_AUTH" | python3 -m json.tool 2>/dev/null || echo "$NO_AUTH"
else
    echo -e "${RED}✗ Authentication check failed${NC}"
    echo "$NO_AUTH"
fi
echo ""

# Test 4: API - Invalid Token
echo -e "${YELLOW}4. Testing API with invalid token...${NC}"
INVALID_TOKEN=$(curl -s -X POST -H "Authorization: Bearer invalid-token" "$BASE_URL/api/frames")
if echo "$INVALID_TOKEN" | grep -q "Invalid token"; then
    echo -e "${GREEN}✓ Invalid token rejected${NC}"
    echo "$INVALID_TOKEN" | python3 -m json.tool 2>/dev/null || echo "$INVALID_TOKEN"
else
    echo -e "${RED}✗ Token validation failed${NC}"
    echo "$INVALID_TOKEN"
fi
echo ""

# Test 5: API - Valid Token
echo -e "${YELLOW}5. Testing API with valid token...${NC}"
VALID_TOKEN=$(curl -s -X POST -H "Authorization: Bearer $ADMIN_TOKEN" "$BASE_URL/api/frames")
if echo "$VALID_TOKEN" | grep -q "No file uploaded"; then
    echo -e "${GREEN}✓ Valid token accepted (expecting 'No file uploaded' error)${NC}"
    echo "$VALID_TOKEN" | python3 -m json.tool 2>/dev/null || echo "$VALID_TOKEN"
else
    echo -e "${YELLOW}⚠ Unexpected response (might be S3 configuration issue)${NC}"
    echo "$VALID_TOKEN" | python3 -m json.tool 2>/dev/null || echo "$VALID_TOKEN"
fi
echo ""

# Test 6: GET Frames
echo -e "${YELLOW}6. Testing GET /api/frames...${NC}"
GET_FRAMES=$(curl -s "$BASE_URL/api/frames")
if [ -n "$GET_FRAMES" ]; then
    echo -e "${GREEN}✓ GET endpoint responding${NC}"
    echo "$GET_FRAMES" | python3 -m json.tool 2>/dev/null || echo "$GET_FRAMES"
else
    echo -e "${RED}✗ No response from GET endpoint${NC}"
fi
echo ""

echo -e "${YELLOW}=== Test Summary ===${NC}"
echo "If all tests passed with ✓ marks, your backend is working correctly!"
echo ""
echo "Note: Some endpoints may return errors if AWS S3 is not configured yet."
echo "This is expected and doesn't indicate a problem with the backend setup."
