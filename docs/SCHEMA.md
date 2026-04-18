# HelpConnect — Data Schema

## Firestore Collections

### `users/{userId}`
```json
{
  "uid": "string",
  "email": "string",
  "displayName": "string",
  "photoURL": "string | null",
  "role": "volunteer | ngo | admin",
  "phone": "string | null",
  "fcmTokens": ["string"],
  "location": { "lat": 0.0, "lng": 0.0, "geohash": "string" },
  "skills": ["string"],
  "availability": "available | busy | inactive",
  "activeTaskCount": 0,
  "ngoVerified": false,
  "ngoProfile": {
    "orgName": "string",
    "registrationNumber": "string",
    "verifiedAt": "Timestamp | null"
  },
  "createdAt": "Timestamp",
  "updatedAt": "Timestamp"
}
```

### `needs/{needId}`
```json
{
  "id": "string",
  "ngoId": "string",
  "title": "string",
  "description": "string",
  "category": "medical | food | shelter | education | logistics | other",
  "urgency": 1,
  "requiredSkills": ["string"],
  "location": { "lat": 0.0, "lng": 0.0, "geohash": "string", "address": "string" },
  "volunteersNeeded": 3,
  "volunteersAssigned": 0,
  "status": "open | in_progress | completed | cancelled",
  "expiresAt": "Timestamp",
  "createdAt": "Timestamp",
  "updatedAt": "Timestamp"
}
```

### `tasks/{taskId}`
```json
{
  "id": "string",
  "needId": "string",
  "volunteerId": "string",
  "ngoId": "string",
  "status": "pending | accepted | in_progress | completed | cancelled",
  "matchScore": 0.0,
  "notes": "string",
  "completedAt": "Timestamp | null",
  "createdAt": "Timestamp",
  "updatedAt": "Timestamp"
}
```

### `audit_logs/{logId}`
```json
{
  "action": "string",
  "actorId": "string",
  "targetCollection": "string",
  "targetId": "string",
  "before": "object | null",
  "after": "object | null",
  "timestamp": "Timestamp",
  "ip": "string | null"
}
```

---

## PostgreSQL Equivalent Schema

```sql
-- Users
CREATE TABLE users (
  uid VARCHAR(128) PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  display_name VARCHAR(255),
  role VARCHAR(20) CHECK (role IN ('volunteer','ngo','admin')) NOT NULL,
  phone VARCHAR(20),
  lat DECIMAL(10,7),
  lng DECIMAL(10,7),
  geohash VARCHAR(12),
  availability VARCHAR(20) DEFAULT 'available',
  active_task_count INT DEFAULT 0,
  ngo_verified BOOLEAN DEFAULT FALSE,
  org_name VARCHAR(255),
  reg_number VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Needs
CREATE TABLE needs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ngo_id VARCHAR(128) REFERENCES users(uid),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(50) NOT NULL,
  urgency SMALLINT CHECK (urgency BETWEEN 1 AND 5),
  required_skills TEXT[],
  lat DECIMAL(10,7),
  lng DECIMAL(10,7),
  address TEXT,
  volunteers_needed INT DEFAULT 1,
  volunteers_assigned INT DEFAULT 0,
  status VARCHAR(20) DEFAULT 'open',
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tasks
CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  need_id UUID REFERENCES needs(id),
  volunteer_id VARCHAR(128) REFERENCES users(uid),
  ngo_id VARCHAR(128) REFERENCES users(uid),
  status VARCHAR(20) DEFAULT 'pending',
  match_score DECIMAL(5,4),
  notes TEXT,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_needs_status ON needs(status);
CREATE INDEX idx_needs_geohash ON needs(geohash);
CREATE INDEX idx_tasks_volunteer ON tasks(volunteer_id);
CREATE INDEX idx_tasks_need ON tasks(need_id);
CREATE INDEX idx_users_role ON users(role);
```
