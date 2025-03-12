#!/bin/bash
# Setup Local Ngrok Tunnels for Firebase Emulators
# Run this script on your local machine, not in Replit

# Check if ngrok is installed
if ! command -v ngrok &> /dev/null; then
    echo "❌ ngrok is not installed. Please install it first:"
    echo "npm install -g ngrok"
    exit 1
fi

# Check if Firebase emulators are running by testing port 8080 (Firestore)
if ! nc -z localhost 8080 &>/dev/null; then
    echo "❌ Firebase emulators don't appear to be running."
    echo "Please start them with 'firebase emulators:start' before running this script."
    exit 1
fi

# Function to start ngrok tunnel
start_tunnel() {
    local port=$1
    local service=$2
    
    echo "🚀 Starting ngrok tunnel for $service on port $port..."
    ngrok http $port --log=stdout > ngrok-$service.log &
    
    # Wait for tunnel to establish
    sleep 3
    
    # Get the public URL
    local tunnel_url=$(curl -s http://localhost:4040/api/tunnels | grep -o "https://[^\"]*\.ngrok-free\.app")
    
    if [ -z "$tunnel_url" ]; then
        echo "❌ Failed to start tunnel for $service on port $port"
        return 1
    fi
    
    echo "✅ $service tunnel established: $tunnel_url"
    echo "$tunnel_url" > ngrok-$service-url.txt
    
    # Extract hostname without protocol
    local hostname=$(echo $tunnel_url | sed 's|https://||')
    echo "$hostname" > ngrok-$service-hostname.txt
    
    return 0
}

echo "🔥 Setting up ngrok tunnels for Firebase Emulators..."
echo "Make sure your Firebase emulators are running!"

# Start tunnels for each emulator
start_tunnel 8080 "firestore"
start_tunnel 9099 "auth"
start_tunnel 9199 "storage"

echo ""
echo "📝 Tunnel URLs for Replit Configuration:"
echo "----------------------------------------"
echo "Firestore: $(cat ngrok-firestore-hostname.txt)"
echo "Auth: $(cat ngrok-auth-hostname.txt)"
echo "Storage: $(cat ngrok-storage-hostname.txt)"
echo ""
echo "Update these URLs in the server/firebase-admin.ts file in Replit"
echo "Then restart the Replit server"

echo ""
echo "🔍 Monitoring tunnels..."
echo "Check individual logs at ngrok-firestore.log, ngrok-auth.log, ngrok-storage.log"
echo "Press Ctrl+C to stop all tunnels"

# Keep script running to maintain tunnels
wait