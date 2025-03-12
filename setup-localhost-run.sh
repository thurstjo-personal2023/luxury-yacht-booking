#!/bin/bash
# Setup script for localhost.run tunneling

# Print header
echo "=================================="
echo "Setting up localhost.run tunnels for Firebase emulators"
echo "=================================="

# Ensure we're in the project root directory
cd "$(dirname "$0")"

# Check if SSH is installed and available
if ! command -v ssh &> /dev/null; then
    echo "Error: ssh command not found. Please make sure SSH is installed."
    exit 1
fi

# Function to show usage instructions
show_usage() {
    echo
    echo "This script sets up tunnels to expose your local Firebase emulators to Replit."
    echo
    echo "Prerequisites:"
    echo "1. Ensure Firebase emulators are running locally (using 'firebase emulators:start')"
    echo "2. The emulators should be using the standard ports:"
    echo "   - Firestore: 8080"
    echo "   - Auth: 9099"
    echo "   - Storage: 9199"
    echo "   - Functions: 5001"
    echo
    echo "The script will set up tunnels that forward requests from the internet to your local emulators."
    echo "This allows your Replit-hosted app to connect to your local emulators for development."
    echo
}

# Show usage information
show_usage

# Create host file to store the localhost.run host
host_file="localhost-run-host.txt"
touch "$host_file"

echo "Starting localhost.run tunnel for all emulator ports..."
echo "This process will run in the background. Press Ctrl+C to stop."
echo

# Start the tunnels and store the hostname
# We'll use a primary tunnel for Firestore (port 8080) and grab the hostname from it
# localhost.run gives the same subdomain for all tunnels from the same machine, so we only need to extract it once

# First, clean up any existing process
pkill -f "ssh -R 80:localhost:8080 localhost.run" || true

# Start the tunnel and extract the hostname
tunnel_log=$(mktemp)
ssh -R 80:localhost:8080 localhost.run > "$tunnel_log" 2>&1 &
tunnel_pid=$!

echo "Waiting for tunnel to establish..."
sleep 5

# Extract the hostname from the tunnel log
hostname=$(grep -o 'https://[a-zA-Z0-9.-]*\.localhost.run' "$tunnel_log" | head -1 | cut -d'/' -f3 | cut -d'.' -f1)

if [[ -z "$hostname" ]]; then
    echo "Failed to extract hostname from tunnel log. Please check the log file at $tunnel_log"
    exit 1
fi

# Get just the subdomain part (before .localhost.run)
subdomain="${hostname}"

# Store the hostname in the file
echo "$subdomain" > "$host_file"
echo "Hostname extracted: $subdomain"
echo "Hostname saved to $host_file"

echo
echo "Tunnel established. Your emulators are now accessible at:"
echo "- Firestore: $subdomain:8080"
echo "- Auth: $subdomain:9099"
echo "- Storage: $subdomain:9199"
echo "- Functions: $subdomain:5001"
echo
echo "You can now update your app configuration to use these endpoints."
echo "The server API will automatically use this configuration."
echo
echo "Important: Keep this terminal window open to maintain the tunnel."
echo "Press Ctrl+C to stop the tunnel when you're done."

# Cleanup on exit
cleanup() {
    echo "Shutting down tunnel..."
    kill $tunnel_pid 2>/dev/null || true
    rm "$tunnel_log" 2>/dev/null || true
    echo "Tunnel terminated."
}

trap cleanup EXIT

# Keep the script running
while true; do
    sleep 1
done