#!/bin/bash

# Script to set up localhost.run tunnels for Firebase emulators
# This script creates SSH tunnels to expose your local Firebase emulators to the internet

# Define emulator ports
FIRESTORE_PORT=8080
AUTH_PORT=9099
STORAGE_PORT=9199

# Check if SSH is available
if ! command -v ssh &> /dev/null; then
    echo "Error: SSH is required but not found."
    exit 1
fi

# Function to create a tunnel and extract the hostname
create_tunnel() {
    local port=$1
    local service_name=$2
    
    echo "Creating tunnel for $service_name on port $port..."
    
    # Start the tunnel in the background and capture output
    ssh -R 80:localhost:$port localhost.run > "${service_name}_tunnel.log" 2>&1 &
    
    # Store the process ID
    local tunnel_pid=$!
    echo "$tunnel_pid" > "${service_name}_tunnel.pid"
    
    # Wait for the tunnel to be established
    echo "Waiting for tunnel to be established..."
    sleep 5
    
    # Extract the hostname from the log file
    local hostname=$(grep -oP 'https://\K[^[:space:]]+(?=\.localhost\.run)' "${service_name}_tunnel.log")
    
    if [ -z "$hostname" ]; then
        echo "Could not extract hostname for $service_name tunnel."
        return 1
    fi
    
    echo "Tunnel established for $service_name: https://${hostname}.localhost.run"
    echo "${hostname}.localhost.run" > "${service_name}_hostname.txt"
    
    # If this is the Firestore tunnel, we'll use it as the main host
    if [ "$service_name" = "firestore" ]; then
        echo "${hostname}.localhost.run" > "localhost-run-host.txt"
        echo "Main host set to: ${hostname}.localhost.run"
    fi
    
    return 0
}

# Clean up any previous tunnel logs
rm -f *_tunnel.log *_hostname.txt localhost-run-host.txt 2>/dev/null

# Create tunnels for each service
create_tunnel $FIRESTORE_PORT "firestore" || exit 1
create_tunnel $AUTH_PORT "auth" || exit 1
create_tunnel $STORAGE_PORT "storage" || exit 1

echo ""
echo "======================================="
echo "Firebase Emulator Tunnels Setup Complete"
echo "======================================="
echo ""
echo "Firestore: https://$(cat firestore_hostname.txt):$FIRESTORE_PORT"
echo "Auth: https://$(cat auth_hostname.txt):$AUTH_PORT"
echo "Storage: https://$(cat storage_hostname.txt):$STORAGE_PORT"
echo ""
echo "The host '$(cat localhost-run-host.txt)' will be used for all emulator connections"
echo ""
echo "To use these hostnames in your application:"
echo "1. Update the environment variables for Firebase emulators:"
echo "   FIRESTORE_EMULATOR_HOST=$(cat firestore_hostname.txt):$FIRESTORE_PORT"
echo "   FIREBASE_AUTH_EMULATOR_HOST=$(cat auth_hostname.txt):$AUTH_PORT"
echo "   FIREBASE_STORAGE_EMULATOR_HOST=$(cat storage_hostname.txt):$STORAGE_PORT"
echo ""
echo "2. These values have been saved to the following files:"
echo "   - localhost-run-host.txt: Main hostname for emulator connections"
echo "   - firestore_hostname.txt: Firestore hostname"
echo "   - auth_hostname.txt: Auth hostname"
echo "   - storage_hostname.txt: Storage hostname"
echo ""
echo "To stop the tunnels, run 'pkill -f \"ssh -R\"' or use the saved PID files"
echo ""
echo "NOTE: Keep this terminal window open to keep the tunnels active."