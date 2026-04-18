# HelpConnect — Architecture Document

## Executive Summary

HelpConnect is a real-time NGO–Volunteer coordination platform designed for global scalability. It enables NGOs to post urgent needs, and matches them with nearby qualified volunteers using a weighted scoring algorithm. The backend leverages Firebase's serverless infrastructure for zero-ops scaling. Mobile (React Native/Expo) and web (Next.js) clients share a unified Firestore data layer with offline persistence. Role-based access control (RBAC) is enforced at both the Firestore rules level and Cloud Functions middleware, ensuring data isolation between volunteers, NGOs, and platform admins.

---

## Firestore vs PostgreSQL

| Dimension | Firestore | PostgreSQL |
|---|---|---|
| Schema | Flexible, document-based | Strict, relational |
| Real-time | Native listeners | Requires polling/WebSockets |
| Offline | Built-in SDK support | Custom implementation |
| Scaling | Auto-scales globally | Manual sharding/replicas |
| Queries | Limited (no JOINs) | Full SQL, complex queries |
| Cost | Per read/write | Per instance/hour |
| Best For | Real-time, mobile-first | Analytics, reporting |
| **Decision** | ✅ Primary store | Optional read replica |

## Firebase vs Custom Backend

| Dimension | Firebase | Custom (Node/Express) |
|---|---|---|
| Auth | Built-in OAuth/OTP | Custom JWT impl |
| Hosting | Managed | DevOps required |
| Scalability | Auto | Manual |
| Cold Starts | Yes (Functions) | Persistent server |
| Cost at Scale | Higher | Lower |
| Dev Speed | Fast | Slower |
| **Decision** | ✅ Primary | Future migration path |

---

## System Flow

```
User (Mobile/Web)
      │
      ▼
Firebase Auth ──► ID Token
      │
      ▼
Cloud Functions (HTTPS Callable)
      │
      ├──► Firestore (reads/writes)
      ├──► FCM (push notifications)
      └──► External APIs (Twilio, Vision)
```
