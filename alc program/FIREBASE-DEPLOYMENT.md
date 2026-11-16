# Firebase Deployment Guide

This guide will help you deploy the School Management System to Firebase Hosting and set up Firestore for data storage.

## Prerequisites

1. Node.js and npm installed
2. Git installed
3. A Firebase account (create one at [Firebase Console](https://console.firebase.google.com/))

## Setup Instructions

### 1. Install Firebase CLI

```bash
npm install -g firebase-tools
```

### 2. Login to Firebase

```bash
firebase login
```

### 3. Initialize Firebase Project

Run the following command and follow the prompts:

```bash
firebase init
```

When prompted:
- Select **Hosting** and **Firestore**
- Choose **Use an existing project** and select your Firebase project
- Set the public directory to `.` (current directory)
- Configure as a single-page app: **Yes**
- Set up automatic builds: **No**
- Overwrite index.html: **No** (unless you want to replace it)

### 4. Deploy to Firebase

```bash
firebase deploy
```

This will deploy your app to Firebase Hosting and set up Firestore rules.

## Firestore Security Rules

Security rules have been set up in `firestore.rules`. These rules:
- Allow read access to all authenticated users
- Allow create/update operations with data validation
- Prevent deletes from the client

## Data Migration

To migrate your existing data to Firestore:

1. Export your current data from localStorage
2. Use the Firebase Console to import the data into Firestore

## Environment Variables

The Firebase configuration is already set up in `firebase-config.js` and `firebase-init.js`. No additional environment variables are needed.

## Troubleshooting

### Common Issues

1. **Firebase not initialized**: Make sure you've run `firebase init` and selected the correct project
2. **Permission denied**: Check your Firestore security rules and authentication setup
3. **Offline persistence errors**: Clear browser cache or disable offline persistence in development

## Support

For additional help, refer to:
- [Firebase Documentation](https://firebase.google.com/docs/)
- [Firebase Hosting Guide](https://firebase.google.com/docs/hosting/)
- [Firestore Documentation](https://firebase.google.com/docs/firestore/)
