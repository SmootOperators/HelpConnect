# HelpConnect — API / Cloud Functions Reference

All callable functions require a valid Firebase ID token in the request context.

---

## Functions

### `createUser`
- **Trigger:** Auth `onCreate` (automatic)
- **Purpose:** Initialize user doc in Firestore after registration
```json
// Auto-triggered — no request body
// Creates: users/{uid} with default role "volunteer"
```

### `updateUserRole`
- **Trigger:** HTTPS Callable
- **Auth:** Admin only
```json
// Request
{ "targetUid": "abc123", "role": "ngo" }
// Response
{ "success": true, "uid": "abc123", "role": "ngo" }
```

### `createNeed`
- **Trigger:** HTTPS Callable
- **Auth:** NGO (verified) only
```json
// Request
{
  "title": "Emergency Food Packs",
  "description": "Need 50 food packs distributed",
  "category": "food",
  "urgency": 4,
  "requiredSkills": ["driving", "logistics"],
  "location": { "lat": 40.7128, "lng": -74.0060, "address": "NYC" },
  "volunteersNeeded": 5,
  "expiresAt": "2026-04-20T00:00:00Z"
}
// Response
{ "success": true, "needId": "xYz789" }
```

### `assignVolunteer`
- **Trigger:** HTTPS Callable
- **Auth:** NGO or Admin
```json
// Request
{ "needId": "xYz789", "volunteerId": "vol123" }
// Response
{ "success": true, "taskId": "task456", "matchScore": 0.87 }
```

### `matchVolunteers`
- **Trigger:** HTTPS Callable / Firestore `onCreate` on needs
- **Auth:** NGO or Admin
```json
// Request
{ "needId": "xYz789", "limit": 10 }
// Response
{
  "matches": [
    { "volunteerId": "vol1", "score": 0.95, "distance": 1.2 },
    { "volunteerId": "vol2", "score": 0.82, "distance": 3.4 }
  ]
}
```

### `updateTaskStatus`
- **Trigger:** HTTPS Callable
- **Auth:** Volunteer (own tasks), NGO (their tasks), Admin
```json
// Request
{ "taskId": "task456", "status": "completed", "notes": "Delivered 50 packs" }
// Response
{ "success": true }
```

### `sendNotification`
- **Trigger:** Firestore `onWrite` on tasks
- **Auth:** Internal (no auth required — triggered by Firestore)
```json
// Automatic — no request body
// Sends FCM to affected volunteer/NGO on status change
```

### `verifyNGO`
- **Trigger:** HTTPS Callable
- **Auth:** Admin only
```json
// Request
{ "ngoUid": "ngo123" }
// Response
{ "success": true, "verifiedAt": "2026-04-18T14:00:00Z" }
```

### `getStats`
- **Trigger:** HTTPS Callable
- **Auth:** Admin only
```json
// Response
{
  "totalUsers": 1240,
  "totalNeeds": 340,
  "openNeeds": 28,
  "completedTasks": 890,
  "activeVolunteers": 142
}
```
