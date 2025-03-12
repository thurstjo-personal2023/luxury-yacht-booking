# Using localhost.run for Firebase Emulator Connection

This guide explains how to use the localhost.run tunneling service to connect your locally running Firebase emulators to your Replit-hosted app.

## Overview

When developing with Firebase, it's common to run Firebase emulators locally for testing. However, when your application is hosted on Replit, you need a way for the Replit server to communicate with your local emulators. This is where localhost.run comes in.

localhost.run is a service that creates SSH tunnels to expose your local services to the internet. Unlike ngrok, it doesn't require installation or authentication for basic usage.

## Prerequisites

1. SSH client installed on your local machine (included by default on macOS and Linux, available via Git Bash or WSL on Windows)
2. Firebase emulators running locally (`firebase emulators:start`)
3. Your app running on Replit

## Setup Steps

1. **Start the Firebase emulators locally**

   ```bash
   firebase emulators:start
   ```

   Make sure the emulators are using the standard ports:
   - Firestore: 8080
   - Auth: 9099
   - Storage: 9199
   - Functions: 5001

2. **Run the localhost.run setup script**

   In a new terminal window, run:

   ```bash
   ./setup-localhost-run.sh
   ```

   This script will:
   - Create SSH tunnels for your emulators using localhost.run
   - Extract the assigned subdomain
   - Save it to `localhost-run-host.txt` for the server to read
   - Display connection information

3. **Keep the terminal window open**

   The tunnels will remain active as long as the script is running. Closing the terminal window will terminate the tunnels.

## How It Works

1. The script creates an SSH tunnel that forwards requests from a public subdomain (assigned by localhost.run) to your local emulators.
2. The subdomain is saved to a text file that the Replit server reads.
3. The server provides this information to the client-side code via the `/api/emulator-config` endpoint.
4. The client-side Firebase initialization code uses this configuration to connect to your local emulators.

## Troubleshooting

1. **Connection Failures**

   If the app can't connect to the emulators:
   - Make sure the emulators are running locally
   - Check if the tunnel is still active
   - Verify the localhost.run subdomain is correct

2. **Tunnel Not Starting**

   If the tunnel fails to start:
   - Check if port 22 (SSH) is open for outbound connections
   - Try restarting the script

3. **Checking Tunnel Status**

   To verify the tunnel is working, open a browser and go to:
   ```
   http://<subdomain>.localhost.run
   ```
   Where `<subdomain>` is the value from `localhost-run-host.txt`.

## Comparison with ngrok

localhost.run advantages over ngrok:
- No installation required (uses built-in SSH)
- No authentication required for basic usage
- No time limits on sessions
- Consistent subdomains from the same machine

ngrok advantages:
- More features in the paid version
- Web interface for monitoring traffic
- Custom subdomain selection (in paid version)