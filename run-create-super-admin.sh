#!/bin/bash
# Create Super Admin Account for Testing
# This script creates a Super Admin account with the provided credentials

# Text styling
BOLD='\033[1m'
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Get server URL
SERVER_URL="http://localhost:3000"

echo -e "${BOLD}${BLUE}=== Create Super Admin Account for Testing ===${NC}"
echo "This script will create a Super Administrator account for testing the Admin Registration process."
echo -e "${YELLOW}WARNING: Use this for development/testing purposes only.${NC}"
echo ""

# Check if email is provided via command line
if [ -n "$1" ]; then
  EMAIL=$1
else
  # Ask for email
  read -p "Enter admin email: " EMAIL
fi

# Check if password is provided via command line
if [ -n "$2" ]; then
  PASSWORD=$2
else
  # Ask for password securely
  read -s -p "Enter password (min 8 chars with at least one number and special char): " PASSWORD
  echo ""
fi

# Check if first name is provided
if [ -n "$3" ]; then
  FIRST_NAME=$3
else
  # Ask for first name
  read -p "Enter first name: " FIRST_NAME
fi

# Check if last name is provided
if [ -n "$4" ]; then
  LAST_NAME=$4
else
  # Ask for last name
  read -p "Enter last name: " LAST_NAME
fi

# Validate inputs
if [ -z "$EMAIL" ] || [ -z "$PASSWORD" ] || [ -z "$FIRST_NAME" ] || [ -z "$LAST_NAME" ]; then
  echo -e "${RED}Error: All fields are required.${NC}"
  exit 1
fi

# Check password length and complexity
if [ ${#PASSWORD} -lt 8 ]; then
  echo -e "${RED}Error: Password must be at least 8 characters.${NC}"
  exit 1
fi

# Make the API request to create admin
echo -e "\n${BOLD}Creating Super Admin account...${NC}"

# Construct JSON payload
JSON_DATA=$(cat <<EOF
{
  "email": "$EMAIL",
  "password": "$PASSWORD",
  "firstName": "$FIRST_NAME",
  "lastName": "$LAST_NAME"
}
EOF
)

# Make the API request with curl
RESPONSE=$(curl -s -X POST \
  -H "Content-Type: application/json" \
  -d "$JSON_DATA" \
  $SERVER_URL/api/init-super-admin)

# Check if request was successful
if [ $? -ne 0 ]; then
  echo -e "${RED}Error: Failed to connect to the server.${NC}"
  exit 1
fi

# Check if the response contains 'success'
if echo "$RESPONSE" | grep -q '"success":true'; then
  echo -e "${GREEN}Success! Super Admin account created.${NC}"
  echo -e "Email: ${BOLD}$EMAIL${NC}"
  echo -e "Name: $FIRST_NAME $LAST_NAME"
  echo -e "\n${YELLOW}You can now use these credentials to log in as a Super Admin.${NC}"
  echo -e "This account can create invitations for other administrators."
else
  echo -e "${RED}Error: Failed to create Super Admin account.${NC}"
  echo "Response: $RESPONSE"
  exit 1
fi