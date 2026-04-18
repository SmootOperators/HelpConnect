# 🤝 HelpConnect — NGO–Volunteer Coordination Platform

> Production-ready platform connecting NGOs with volunteers in real time.

---

## Architecture Overview

| Layer | Technology |
|---|---|
| Mobile App | React Native (Expo SDK 51) |
| Web App | Next.js 14 (App Router) |
| Backend | Firebase (Auth, Firestore, Cloud Functions v2) |
| Maps | Google Maps / Mapbox |
| Notifications | Firebase Cloud Messaging (FCM) |
| CI/CD | GitHub Actions |
| Hosting | Vercel (web) + Firebase (backend) |

---

## Repository Structure

```
HelpConnect/
├── mobile/          # React Native Expo app
├── web/             # Next.js 14 web + admin dashboard
├── backend/         # Firebase Cloud Functions (Node 20)
├── docs/            # Architecture, schema, API docs
└── .github/         # CI/CD workflows
```

---

## Quick Start

### Prerequisites
- Node.js 20+
- Firebase CLI: `npm i -g firebase-tools`
- Expo CLI: `npm i -g expo-cli`

### Setup
```bash
# Backend
cd backend && npm install
firebase login && firebase use --add

# Web
cd web && npm install && npm run dev

# Mobile
cd mobile && npm install && npx expo start
```

---

## Docs
- [Architecture](docs/ARCHITECTURE.md)
- [Data Schema](docs/SCHEMA.md)
- [API Reference](docs/API.md)
- [Security](docs/SECURITY.md)
- [Deployment](docs/DEPLOYMENT.md)

---

## License
MIT
