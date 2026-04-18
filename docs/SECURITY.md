# HelpConnect — Security & Privacy

## Firestore Security Rules Strategy

- All reads/writes require `request.auth != null`
- Role is read from `users/{uid}.role` — never from client-supplied data
- NGOs must have `ngoVerified == true` to create needs
- Volunteers can only read/write their own task documents
- Admins (role == 'admin') have full read access, scoped write access

## Data Minimization
- Location stored as geohash only (not precise address) for volunteers
- PII never stored in audit logs — only UIDs
- FCM tokens rotated on each app launch

## Abuse Prevention
- Cloud Functions enforce rate limiting via Firestore counters
- App Check enforces attestation on mobile (DeviceCheck / Play Integrity)
- Twilio OTP required for phone verification before NGO role assignment

## Compliance
- GDPR: User data deletion endpoint (`deleteAccount` function purges all collections)
- Data retention: Completed tasks archived after 90 days via scheduled function
- All Firestore data encrypted at rest (Google-managed keys)
