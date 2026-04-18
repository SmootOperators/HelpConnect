# HelpConnect — Deployment Guide

## Web → Vercel
```bash
cd web
vercel --prod
# Set env vars in Vercel dashboard:
# NEXT_PUBLIC_FIREBASE_API_KEY
# NEXT_PUBLIC_FIREBASE_PROJECT_ID
# NEXT_PUBLIC_MAPBOX_TOKEN
```

## Backend → Firebase
```bash
cd backend
firebase deploy --only functions,firestore:rules,firestore:indexes
```

## Mobile → Expo EAS
```bash
cd mobile
eas build --platform all --profile production
eas submit --platform all
```

## Monitoring
- Firebase Crashlytics: enabled in mobile via `@react-native-firebase/crashlytics`
- Firebase Performance: enabled via SDK
- Vercel Analytics: enabled via `@vercel/analytics`
- Uptime: Firebase Alerting on function error rate > 1%

## Backup Strategy
- Firestore daily exports to GCS bucket via Cloud Scheduler
- 30-day retention on GCS
- Point-in-time recovery enabled on Firebase project

## CI/CD
- On push to `main`: lint → test → deploy (see `.github/workflows/`)
- Environment secrets stored in GitHub Secrets
