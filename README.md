# Incident Commander

## Overview

Incident Commander is an AI-powered incident analysis and resolution tool. Users paste raw server/application logs into a terminal-style interface, and the system analyzes them using Gemini AI to identify root causes, severity levels, confidence scores, and recommended fixes. Results are stored as incidents in a PostgreSQL database and can be browsed via a dashboard. Authentication is handled via Supabase (Magic Link), and reports can be exported as enhanced PDFs (with Watermarking, OCR, and AI Guidance) using Foxit PDF Services.

The app follows a modern full-stack structure with a React frontend, Express backend, and shared schema definitions. It is optimized for local development and standard Cloud deployments (PostgreSQL + Supabase).

## User Preferences

Preferred communication style: Simple, everyday language.
- Prefers magic link / passwordless login to minimize things users need to remember
- "Dark Future" terminal aesthetic with Space Grotesk + JetBrains Mono fonts

## System Architecture

### Directory Structure
- `client/` — React frontend (Vite-based SPA)
- `server/` — Express backend API
- `server/auth.ts` — Supabase authentication middleware
- `server/foxit-pdf.ts` — Foxit Fusion API integration for PDF export
- `server/supabase.ts` — Server-side Supabase client
- `server/replit_integrations/` — AI modules (chat, batch)
- `shared/` — Shared TypeScript types and database schema
- `shared/models/` — Sub-schemas (auth.ts, chat.ts)

### Frontend Architecture
- **Framework**: React with TypeScript, bundled by Vite
- **Routing**: Wouter with views: Landing, Home, Dashboard, History, Profile, Incident Detail (`/incidents/:id`), Incident Chat (`/incidents/:id/chat`), API Docs
- **Authentication**: Supabase Auth (Magic Link) via `useAuth()` hook. Session-less JWT flow.
- **State Management**: TanStack React Query for server state, local React state for UI
- **UI Components**: shadcn/ui component library (new-york style) built on Radix UI primitives
- **Styling**: Tailwind CSS v4 with CSS variables for theming, dark mode by default
- **Fonts**: Space Grotesk (sans) and JetBrains Mono (mono) — terminal/command aesthetic
- **Animations**: Framer Motion for transitions
- **API Communication**: Custom `apiRequest` utility wrapping fetch, integrated with React Query's `queryFn`

### Backend Architecture
- **Framework**: Express 5 on Node.js
- **Authentication**: Supabase Auth (JWT validation) via `server/auth.ts`
- **AI Analysis**: Gemini 2.5 Flash for log analysis and remediation guidance
- **PDF Export**: Foxit Fusion API for generating watermarked, searchable (OCR) reports with conversation history.
- **API Pattern**: RESTful JSON API under `/api/` (authenticated) and `/api/v1/` (API key auth)
- **Key Endpoints** (session-protected via `isAuthenticated` middleware):
  - `POST /api/incidents/analyze` — Submit logs for AI analysis, creates an incident record
  - `GET /api/incidents` — List user's incidents (filtered by userId)
  - `GET /api/incidents/:id` — Get single incident details
  - `PATCH /api/incidents/:id/status` — Update incident status
  - `GET /api/incidents/stats/summary` — Dashboard metrics (real data from DB)
  - `POST /api/keys` — Create a new API key (returns raw key once)
  - `GET /api/keys` — List user's API keys (prefix only, no raw keys)
  - `DELETE /api/keys/:id` — Revoke an API key
  - `POST /api/incidents/:id/export/pdf` — Export incident as enhanced PDF
  - `POST /api/incidents/export/bulk` — Export multiple incidents in a single merged PDF
  - `GET /api/auth/user` — Get current Supabase user
  - `POST /api/login` — Begin Supabase Magic Link flow
- **Developer API v1 Endpoints** (API key auth via `apiKeyAuth` middleware, `Authorization: Bearer` or `X-API-Key`):
  - `POST /api/v1/incidents/analyze` — Submit logs for analysis
  - `GET /api/v1/incidents` — List incidents
  - `GET /api/v1/incidents/:id` — Get incident details
  - `PATCH /api/v1/incidents/:id/status` — Update incident status
  - `DELETE /api/v1/incidents/:id` — Delete an incident
- **API Key Security**: Keys are hashed (SHA-256) before storage; only the prefix (`ic_xxxxxxxx`) is stored in plaintext. Raw key shown once on creation. Keys can be revoked. `lastUsedAt` tracked per key.
- **Log Analysis**: Gemini AI with strict prompt engineering (only analyzes logs, rejects non-log input). Falls back to regex pattern matching if AI is unavailable.
- **Validation**: Zod schemas (shared between client and server via `drizzle-zod`)

### Data Storage
- **Database**: PostgreSQL (required, connection via `DATABASE_URL` env var)
- **ORM**: Drizzle ORM with `drizzle-kit` for schema management
- **DB Module**: `server/db.ts` exports shared `db` instance used by all storage modules
- **Schema Push**: Use `npm run db:push` to sync schema to database
- **Tables**:
  - `incidents` — id, userId, title, severity, status, rootCause, fix, evidence[], nextSteps[], completedSteps[], stepGuidance[], createdAt
  - `api_keys` — id, userId, name, keyHash, keyPrefix, requestCount, lastResetDate, lastUsedAt
  - `templates` — Pre-defined log templates for analysis
  - `tags` / `incident_tags` — Organizing incidents
  - `favorites` — User-starred incidents
  - `conversations` / `messages` — Follow-up discussions linked to incidents/steps
- **Storage Layer**: `DatabaseStorage` class in `server/storage.ts` using Drizzle ORM

### Build System
- **Development**: `npm run dev` starts Express with Vite middleware (tsx for TypeScript execution)
- **Production Build**: `npm run build` runs a custom script
- **Production Start**: `npm start` runs the built `dist/index.cjs`

## Integrations

### Supabase Auth
- Passwordless authentication via Magic Link.
- JWT-based authentication for all API routes.
- Handles user sign-up, sign-in, and profile management.
- Files: `server/auth.ts`, `server/supabase.ts`, `client/src/lib/supabase.ts`

### Foxit PDF Services
- **Document Generation**: Converts incident data (HTML) to PDF.
- **Watermarking**: Adds "CONFIDENTIAL" watermark to reports.
- **OCR**: Makes exported PDFs searchable and accessible.
- **Content Enrichment**: Includes AI remediation guidance and user-AI follow-up conversations.
- Files: `server/foxit-pdf.ts`

### Gemini AI
- **Model**: `gemini-2.5-flash`
- **Used for**: Log analysis, RCA, fix suggestions, and interactive remediation assistance.
- **Files**: `server/analyzer.ts`, `server/replit_integrations/chat/`

## Environment Variables

Copy `.env.example` to `.env` and configure:

### Authentication (Supabase)
- `SUPABASE_URL`: Your Supabase project URL
- `SUPABASE_ANON_KEY`: Your Supabase anonymous key
- `VITE_SUPABASE_URL`: (Client-side) Same as SUPABASE_URL
- `VITE_SUPABASE_ANON_KEY`: (Client-side) Same as SUPABASE_ANON_KEY

### PDF Export (Foxit)
- `FOXIT_API_KEY`: Your Foxit Fusion API key
- `FOXIT_API_SECRET`: Your Foxit Fusion API secret

### AI Analysis (Gemini)
- `GEMINI_API_KEY`: Your Google Gemini API key

### Database
- `DATABASE_URL`: PostgreSQL connection string (Neon or similar)

## Key NPM Packages
- **@supabase/supabase-js** — Supabase client for auth and data
- **axios** — HTTP client for Foxit API communication
- **drizzle-orm** + **drizzle-kit** — Database ORM and migrations
- **express** v5 — Backend API framework
- **@google/genai** — Gemini AI integration
- **@tanstack/react-query** — Frontend state and data fetching
- **framer-motion** — UI animations and transitions
- **lucide-react** — Icon system
- **wouter** — Client-side routing
- **zod** — Schema validation and type safety
