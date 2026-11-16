# PowerShell script to deploy to Firebase

# Install Firebase CLI if not already installed
if (!(Get-Command firebase -ErrorAction SilentlyContinue)) {
    Write-Host "Installing Firebase CLI..."
    npm install -g firebase-tools
}

# Login to Firebase (will open browser for authentication)
firebase login

# Initialize Firebase project (if not already initialized)
if (!(Test-Path "firebase.json")) {
    firebase init
}

# Build your project (if needed)
# npm run build

# Deploy to Firebase
firebase deploy --only hosting

Write-Host "Deployment complete!" -ForegroundColor Green
