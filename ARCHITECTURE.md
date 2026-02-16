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
  stepGuidance: string[]  // NEW: Cached guidance per step
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
  lastUsedAt: Date
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
- `POST /api/keys` - Create API key
- `GET /api/keys` - List API keys
- `DELETE /api/keys/:id` - Revoke API key

### API Key-Based (Bearer token)
- `POST /api/v1/incidents/analyze` - Analyze logs
- `GET /api/v1/incidents` - List incidents
- `GET /api/v1/incidents/:id` - Get incident
- `PATCH /api/v1/incidents/:id/status` - Update status
- `DELETE /api/v1/incidents/:id` - Delete incident

## Security Notes

1. **API Keys**: Stored as SHA-256 hashes, never plain text
2. **Tokens**: Cached with TTL, invalidated on auth errors
3. **Prompts**: Server-side only, never sent to client
4. **User Isolation**: All queries filtered by userId
5. **Rate Limiting**: Not implemented (consider adding)

## Recommendations

### Immediate
- ✅ Token caching (done)
- ✅ Guidance caching (done)

### Future Enhancements
- Add rate limiting (express-rate-limit)
- Add request logging/monitoring
- Implement JWT verification for zero-latency auth
- Add guidance regeneration option (force refresh)
- Add prompt versioning for A/B testing
