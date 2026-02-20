# Architecture Overview

## Authentication Strategy

### Token Caching (Implemented)
- **Before**: Every request called Supabase API (~1-2s latency)
- **After**: Tokens cached in-memory for 5 minutes
- **Result**: Subsequent requests are instant (no Supabase call)
- **Location**: `server/auth.ts`

### Future Optimization (Optional)
For even better performance, you could:
- Use JWT verification with Supabase's public key (no network call)
- Requires: `jsonwebtoken` package + Supabase JWT secret

## Guidance System

### How It Works
1. User clicks "Get Guidance" on a remediation step
2. System checks if guidance already exists in DB (`stepGuidance` array)
3. If cached: Returns immediately
4. If not cached: Generates via Gemini API, saves to DB, returns result

### Storage
- **Field**: `incidents.stepGuidance` (text array)
- **Index**: Matches step index in `nextSteps` array
- **Persistence**: Survives page refresh, shared across sessions

### Prompt Visibility
- **Server-side only**: Prompts are in `server/analyzer.ts`
- **Client receives**: Only the generated guidance text
- **Security**: Prompt engineering details are never exposed to client

### Response Format
```json
{
  "guidance": "Step-by-step instructions...",
  "cached": true  // or false if freshly generated
}
```

## Performance Improvements

### Before
- Auth: 1-2s per request (Supabase API call)
- Guidance: Generated every time (~3-5s)
- Total: 4-7s for guidance request

### After
- Auth: ~10ms (cached token)
- Guidance: ~10ms (cached) or ~3-5s (first time)
- Total: ~20ms for cached guidance, ~3-5s first time

## Database Schema

### Incidents Table
```typescript
{
  id: string
  userId: string
  title: string
  severity: "low" | "medium" | "high" | "critical"
  status: "analyzing" | "resolved" | "critical"
  confidence: number
  rawLogs: string
  rootCause: string
  fix: string
  evidence: string[]
  nextSteps: string[]
  completedSteps: number[]
  stepGuidance: string[]  // Cached guidance per step
  createdAt: Date
}
```

### API Keys Table
```typescript
{
  id: string
  userId: string
  name: string
  keyHash: string
  keyPrefix: string
  revoked: boolean
  requestCount: number
  lastResetDate: Date
  lastUsedAt: Date
  createdAt: Date
}
```

### Templates Table
```typescript
{
  id: string
  userId: string
  name: string
  description: string
  category: string
  sampleLogs: string
  createdAt: Date
}
```

### Tags Table
```typescript
{
  id: string
  name: string
  color: string (hex)
  createdAt: Date
}
```

### Incident Tags (Junction)
```typescript
{
  incidentId: string
  tagId: string
}
```

### Favorites Table
```typescript
{
  userId: string
  incidentId: string
  createdAt: Date
}
```

## API Endpoints

### Session-Based (Cookie/JWT)
- `POST /api/incidents/analyze` - Analyze logs
- `GET /api/incidents` - List user's incidents
- `GET /api/incidents/:id` - Get incident details
- `PATCH /api/incidents/:id/status` - Update status
- `PATCH /api/incidents/:id/steps/:stepIndex` - Toggle step completion
- `POST /api/incidents/:id/steps/:stepIndex/guidance` - Get/generate guidance
- `DELETE /api/incidents/:id` - Delete incident
- `GET /api/incidents/stats/summary` - Get incident statistics
- `GET /api/incidents/count/unresolved` - Get unresolved count

### Bulk Operations
- `POST /api/incidents/bulk/status` - Bulk update status
- `POST /api/incidents/bulk/delete` - Bulk delete incidents
- `POST /api/incidents/bulk/tag` - Bulk add tags

### PDF Export
- `GET /api/incidents/:id/export/pdf` - Export single incident PDF
- `POST /api/incidents/export/bulk` - Export multiple incidents as merged PDF

### API Key Management
- `POST /api/keys` - Create API key
- `GET /api/keys` - List API keys
- `DELETE /api/keys/:id` - Revoke API key

### Templates
- `POST /api/templates` - Create template
- `GET /api/templates` - List user's templates
- `DELETE /api/templates/:id` - Delete template

### Tags
- `POST /api/tags` - Create tag
- `GET /api/tags` - List all tags
- `POST /api/incidents/:id/tags` - Add tag to incident
- `DELETE /api/incidents/:id/tags/:tagId` - Remove tag from incident
- `GET /api/incidents/:id/tags` - Get tags for incident

### Favorites
- `POST /api/favorites` - Add to favorites
- `DELETE /api/favorites/:incidentId` - Remove from favorites
- `GET /api/favorites` - Get favorite incident IDs

### User Profile
- `PATCH /api/user/profile` - Update user profile (username, firstName, lastName, phone, dob)

### Chat/Conversations
- `POST /api/chat/conversations` - Create conversation
- `GET /api/chat/conversations` - List conversations (by incident or user)
- `GET /api/chat/conversations/:id/messages` - Get messages
- `POST /api/chat/conversations/:id/messages` - Add message

### API Key-Based (Bearer token)
- `POST /api/v1/incidents/analyze` - Analyze logs
- `GET /api/v1/incidents` - List incidents
- `GET /api/v1/incidents/:id` - Get incident
- `PATCH /api/v1/incidents/:id/status` - Update status
- `DELETE /api/v1/incidents/:id` - Delete incident

## Rate Limiting

### API Key Rate Limiting (Implemented)
- **Limit**: 100 requests per day per API key
- **Reset**: Automatic reset every 24 hours
- **Headers**: X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset

### Session-Based Rate Limiting (Not Implemented)
- Not currently implemented for user sessions
- Consider adding express-rate-limit

## Security Notes

1. **API Keys**: Stored as SHA-256 hashes, never plain text
2. **Tokens**: Cached with TTL, invalidated on auth errors
3. **Prompts**: Server-side only, never sent to client
4. **User Isolation**: All queries filtered by userId
5. **API Key Rate Limiting**: 100 requests/day per key (implemented)

## Recommendations

### Implemented
- ✅ Token caching (5 min TTL)
- ✅ Guidance caching (per-step)
- ✅ API key rate limiting (100/day)
- ✅ User isolation on all endpoints
- ✅ Server-side prompt security

### Future Enhancements
- Add session-based rate limiting (express-rate-limit)
- Add request logging/monitoring
- Implement JWT verification for zero-latency auth
- Add guidance regeneration option (force refresh)
- Add prompt versioning for A/B testing
