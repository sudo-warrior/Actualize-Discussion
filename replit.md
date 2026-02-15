# Incident Commander

## Overview

Incident Commander is an AI-powered incident analysis and resolution tool. Users paste raw server/application logs into a terminal-style interface, and the system analyzes them using pattern matching to identify root causes, severity levels, confidence scores, and recommended fixes. Results are stored as incidents in a PostgreSQL database and can be browsed via a dashboard.

The app follows a monorepo structure with a React frontend, Express backend, and shared schema definitions. It's designed as a hackathon-style project optimized for Replit deployment.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Directory Structure
- `client/` — React frontend (Vite-based SPA)
- `server/` — Express backend API
- `shared/` — Shared TypeScript types and database schema (used by both client and server)
- `migrations/` — Drizzle ORM database migrations
- `script/` — Build scripts
- `attached_assets/` — Reference documents and planning notes

### Frontend Architecture
- **Framework**: React with TypeScript, bundled by Vite
- **Routing**: Wouter (lightweight client-side router) with two pages: Home (`/`) and Dashboard (`/dashboard`)
- **State Management**: TanStack React Query for server state, local React state for UI
- **UI Components**: shadcn/ui component library (new-york style) built on Radix UI primitives
- **Styling**: Tailwind CSS v4 with CSS variables for theming, dark mode by default
- **Fonts**: Space Grotesk (sans) and JetBrains Mono (mono) — terminal/command aesthetic
- **Animations**: Framer Motion for transitions
- **API Communication**: Custom `apiRequest` utility wrapping fetch, integrated with React Query's `queryFn`

### Backend Architecture
- **Framework**: Express 5 on Node.js, written in TypeScript (executed via tsx)
- **API Pattern**: RESTful JSON API under `/api/` prefix
- **Key Endpoints**:
  - `POST /api/incidents/analyze` — Submit logs for analysis, creates an incident record
  - `GET /api/incidents` — List all incidents (ordered by creation date desc)
  - `GET /api/incidents/:id` — Get single incident details
  - `PATCH /api/incidents/:id/status` — Update incident status
- **Log Analysis**: Pattern-based regex matching engine (`server/analyzer.ts`) that identifies common infrastructure issues (OOM, connection pool exhaustion, connection refused, etc.) and returns structured analysis results
- **Validation**: Zod schemas (shared between client and server via `drizzle-zod`)
- **Dev Server**: Vite dev server middleware integrated into Express for HMR during development
- **Production**: Static file serving from built `dist/public` directory

### Data Storage
- **Database**: PostgreSQL (required, connection via `DATABASE_URL` env var)
- **ORM**: Drizzle ORM with `drizzle-kit` for schema management
- **Schema Push**: Use `npm run db:push` to sync schema to database (no migration files needed for development)
- **Schema Definition**: Single `incidents` table in `shared/schema.ts` with fields:
  - `id` (UUID, auto-generated)
  - `title`, `severity` (low/medium/high/critical), `status` (analyzing/resolved/critical)
  - `confidence` (integer 0-100), `rawLogs`, `rootCause`, `fix`
  - `evidence` (text array), `nextSteps` (text array)
  - `createdAt` (timestamp)
- **Storage Layer**: `DatabaseStorage` class in `server/storage.ts` implementing `IStorage` interface using Drizzle queries

### Build System
- **Development**: `npm run dev` starts Express with Vite middleware (tsx for TypeScript execution)
- **Production Build**: `npm run build` runs a custom script that:
  1. Builds the client with Vite (output to `dist/public`)
  2. Bundles the server with esbuild (output to `dist/index.cjs`), selectively bundling key deps for faster cold starts
- **Production Start**: `npm start` runs the built `dist/index.cjs`

## External Dependencies

### Database
- **PostgreSQL** — Primary data store, connected via `DATABASE_URL` environment variable. Required for the app to function. Uses `pg` (node-postgres) connection pool.

### Key NPM Packages
- **drizzle-orm** + **drizzle-kit** — Database ORM and schema management
- **express** v5 — HTTP server framework
- **@tanstack/react-query** — Client-side data fetching and caching
- **zod** + **drizzle-zod** — Schema validation (shared between client and server)
- **framer-motion** — UI animations
- **wouter** — Client-side routing
- **date-fns** — Date formatting
- **nanoid** — ID generation for cache busting

### Replit-Specific
- **@replit/vite-plugin-runtime-error-modal** — Runtime error overlay in development
- **@replit/vite-plugin-cartographer** — Dev tooling (development only)
- **@replit/vite-plugin-dev-banner** — Dev banner (development only)
- Custom `vite-plugin-meta-images` — Updates OpenGraph meta tags with correct Replit deployment URL

### No External AI/LLM APIs Currently
The log analysis is done entirely via local regex pattern matching in `server/analyzer.ts`. No external AI service calls are made, though the architecture notes suggest LLM integration was planned.