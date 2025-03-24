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

# Get server URL from user (required for Replit)
echo -e "${YELLOW}Since you're running this in Replit, we need the URL of your application.${NC}"
echo -e "Look for the URL in the webview tab (something like https://your-repl-name.your-username.repl.co)"

# Let user input URL
read -p "Enter your application URL: " SERVER_URL

# Validate URL
if [ -z "$SERVER_URL" ]; then
  echo -e "${RED}Error: URL is required${NC}"
  exit 1
fi

echo -e "Using server URL: ${GREEN}$SERVER_URL${NC}"

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

# First test if the server is reachable
echo -e "Testing connection to $SERVER_URL..."
CONNECTION_TEST=$(curl -s -o /dev/null -w "%{http_code}" $SERVER_URL)

if [ "$CONNECTION_TEST" != "200" ]; then
  echo -e "${RED}Error: Could not connect to $SERVER_URL (HTTP status: $CONNECTION_TEST)${NC}"
  echo -e "${YELLOW}Make sure the URL is correct and the server is running.${NC}"
  exit 1
fi

echo -e "${GREEN}Connection successful!${NC}"

# Make the API request with curl with verbose output
echo -e "Sending request to create Super Admin..."
RESPONSE=$(curl -s -X POST \
  -H "Content-Type: application/json" \
  -d "$JSON_DATA" \
  $SERVER_URL/api/init-super-admin)

# Save curl exit code
CURL_EXIT_CODE=$?

# Check if request was successful
if [ $CURL_EXIT_CODE -ne 0 ]; then
  echo -e "${RED}Error: Failed to connect to the server. (curl exit code: $CURL_EXIT_CODE)${NC}"
  echo -e "${YELLOW}Debugging information:${NC}"
  echo -e "- Target URL: $SERVER_URL/api/init-super-admin"
  echo -e "- Command: curl -v -X POST -H \"Content-Type: application/json\" [data omitted] $SERVER_URL/api/init-super-admin"
  
  # Try with verbose mode to see more details
  echo -e "\n${YELLOW}Running with verbose output for more information:${NC}"
  curl -v -X POST \
    -H "Content-Type: application/json" \
    -d "$JSON_DATA" \
    $SERVER_URL/api/init-super-admin
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
  echo -e "${YELLOW}Response from server:${NC}"
  echo "$RESPONSE" | sed 's/^/  /'
  
  # Try to detect if it's a JSON error response and extract the error message
  if echo "$RESPONSE" | grep -q '"error"'; then
    ERROR_MSG=$(echo "$RESPONSE" | grep -o '"message":"[^"]*"' | cut -d'"' -f4)
    if [ -n "$ERROR_MSG" ]; then
      echo -e "${RED}Error message: $ERROR_MSG${NC}"
    fi
  fi
  
  exit 1
fi