# Incident Commander

## Overview

Incident Commander is an AI-powered incident analysis and resolution tool. Users paste raw server/application logs into a terminal-style interface, and the system analyzes them using Gemini AI to identify root causes, severity levels, confidence scores, and recommended fixes. Results are stored as incidents in a PostgreSQL database and can be browsed via a dashboard. Authentication is handled via Replit Auth (Google, GitHub, email/magic link).

The app follows a monorepo structure with a React frontend, Express backend, and shared schema definitions. It's designed as a hackathon-style project optimized for Replit deployment.

## User Preferences

Preferred communication style: Simple, everyday language.
- Prefers magic link / passwordless login to minimize things users need to remember
- "Dark Future" terminal aesthetic with Space Grotesk + JetBrains Mono fonts

## System Architecture

### Directory Structure
- `client/` — React frontend (Vite-based SPA)
- `server/` — Express backend API
- `server/replit_integrations/` — Integration modules (auth, chat, image, batch)
- `shared/` — Shared TypeScript types and database schema (used by both client and server)
- `shared/models/` — Sub-schemas (auth.ts, chat.ts)
- `script/` — Build scripts

### Frontend Architecture
- **Framework**: React with TypeScript, bundled by Vite
- **Routing**: Wouter with three views: Landing (unauthenticated), Home (`/`), Dashboard (`/dashboard`)
- **Authentication**: Replit Auth via `useAuth()` hook. Landing page shown when logged out.
- **State Management**: TanStack React Query for server state, local React state for UI
- **UI Components**: shadcn/ui component library (new-york style) built on Radix UI primitives
- **Styling**: Tailwind CSS v4 with CSS variables for theming, dark mode by default
- **Fonts**: Space Grotesk (sans) and JetBrains Mono (mono) — terminal/command aesthetic
- **Animations**: Framer Motion for transitions
- **API Communication**: Custom `apiRequest` utility wrapping fetch, integrated with React Query's `queryFn`

### Backend Architecture
- **Framework**: Express 5 on Node.js, written in TypeScript (executed via tsx)
- **Authentication**: Replit Auth (OpenID Connect) via `server/replit_integrations/auth/`
- **AI Analysis**: Gemini 2.5 Flash via Replit AI Integrations (no personal API key needed, billed to Replit credits)
- **API Pattern**: RESTful JSON API under `/api/` prefix
- **Key Endpoints** (all protected by `isAuthenticated` middleware except auth routes):
  - `POST /api/incidents/analyze` — Submit logs for AI analysis, creates an incident record
  - `GET /api/incidents` — List user's incidents (filtered by userId)
  - `GET /api/incidents/:id` — Get single incident details
  - `PATCH /api/incidents/:id/status` — Update incident status
  - `GET /api/incidents/stats/summary` — Dashboard metrics (real data from DB)
  - `GET /api/login` — Begin Replit Auth login flow
  - `GET /api/logout` — Logout
  - `GET /api/auth/user` — Get current authenticated user
- **Log Analysis**: Gemini AI with strict prompt engineering (only analyzes logs, rejects non-log input). Falls back to regex pattern matching if AI is unavailable.
- **Validation**: Zod schemas (shared between client and server via `drizzle-zod`)

### Data Storage
- **Database**: PostgreSQL (required, connection via `DATABASE_URL` env var)
- **ORM**: Drizzle ORM with `drizzle-kit` for schema management
- **DB Module**: `server/db.ts` exports shared `db` instance used by all storage modules
- **Schema Push**: Use `npm run db:push` to sync schema to database
- **Tables**:
  - `incidents` — id (UUID), userId, title, severity, status, confidence, rawLogs, rootCause, fix, evidence[], nextSteps[], createdAt
  - `users` — Replit Auth user records (id, email, firstName, lastName, profileImageUrl)
  - `sessions` — Express session storage for auth
  - `conversations` / `messages` — Chat integration tables (from Gemini blueprint)
- **Storage Layer**: `DatabaseStorage` class in `server/storage.ts` implementing `IStorage` interface

### Build System
- **Development**: `npm run dev` starts Express with Vite middleware (tsx for TypeScript execution)
- **Production Build**: `npm run build` runs a custom script
- **Production Start**: `npm start` runs the built `dist/index.cjs`

## Integrations

### Replit Auth
- OpenID Connect authentication via Replit
- Supports Google, GitHub, X, Apple, email/password login
- Session stored in PostgreSQL
- Files: `server/replit_integrations/auth/`

### Gemini AI (Replit AI Integrations)
- Uses `AI_INTEGRATIONS_GEMINI_BASE_URL` and `AI_INTEGRATIONS_GEMINI_API_KEY` env vars (auto-configured)
- Model: gemini-2.5-flash for log analysis
- No personal API key needed — charges billed to Replit credits
- Files: `server/replit_integrations/chat/`, `server/replit_integrations/image/`

## External Dependencies

### Key NPM Packages
- **@google/genai** — Gemini AI client
- **drizzle-orm** + **drizzle-kit** — Database ORM and schema management
- **express** v5 — HTTP server framework
- **@tanstack/react-query** — Client-side data fetching and caching
- **zod** + **drizzle-zod** — Schema validation
- **framer-motion** — UI animations
- **wouter** — Client-side routing
- **date-fns** — Date formatting
- **passport** + **openid-client** — Authentication
- **express-session** + **connect-pg-simple** — Session management
- **recharts** — Dashboard charts
