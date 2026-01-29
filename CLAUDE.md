# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Dispatch is a multiplayer code execution platform for collaborative AI coding sessions. It combines Cloudflare's edge infrastructure (Workers, Durable Objects) with Modal's serverless compute for isolated sandbox environments running OpenCode.

## Commands

```bash
# Development
bun install               # Install dependencies (uses Bun workspaces)
bun run dev               # Start all packages in dev mode

# Build and check
bun run build             # Build all packages
bun run typecheck         # Type check all packages

# Linting (Biome, NOT ESLint)
bun run lint              # Check with Biome
bun run lint:fix          # Auto-fix issues

# Package-specific testing
cd packages/web && bun test           # Run web tests
cd packages/web && bun test:watch     # Watch mode
cd packages/control-plane && bun test # Run control-plane tests

# Deployment
cd packages/web && bun run build:cloudflare  # Build for Cloudflare (next build + OpenNext)
modal deploy packages/modal-infra/deploy.py  # Deploy Modal sandboxes
```

## Architecture

### Data Flow
```
Clients (Web/Slack/CLI)
        ↓ WebSocket
Control Plane (Cloudflare Workers + Durable Objects)
        ↓ WebSocket bridge
Modal Sandboxes (OpenCode execution)
```

### Package Structure
- **@dispatch/web**: Next.js 15 frontend with Better Auth (NOT NextAuth)
- **@dispatch/control-plane**: Cloudflare Workers API + Durable Objects for session state
- **@dispatch/shared**: TypeScript types shared across packages
- **@dispatch/slack-bot**: Slack integration worker
- **modal-infra**: Python sandbox infrastructure on Modal

### Key Patterns

**Session Management**: Each session is a Durable Object with SQLite storage. Sessions store messages, events, participants, and artifacts. The DO handles WebSocket hibernation for cost efficiency.

**Sandbox Lifecycle**:
1. Control plane creates session, generates sandbox auth token
2. Modal creates sandbox with GitHub App token for git operations
3. Sandbox connects via WebSocket to receive prompts
4. OpenCode runs in sandbox, streams events back to control plane
5. Control plane broadcasts events to all connected clients

**Authentication Layers**:
- Web clients: Better Auth with GitHub OAuth
- Service-to-service (Slack bot, etc.): HMAC-based internal token verification
- Sandbox-to-control-plane: Per-session auth token stored in DO

**GitHub Integration**: Uses GitHub App (NOT OAuth App) for:
- Installation token for git operations in sandboxes
- OAuth for user authentication
- PR creation on behalf of users

### Configuration Files
- `wrangler.jsonc` format (NOT wrangler.toml) for Cloudflare
- `biome.json` for linting/formatting (NOT ESLint/Prettier)
- Secrets via `wrangler secret put <KEY>` for Workers

### Type Sharing
Import shared types via workspace dependency:
```typescript
import type { SessionState, SandboxEvent } from "@dispatch/shared";
```

### Biome Rules
- Double quotes, semicolons, ES5 trailing commas
- `useImportType: error` - use `import type` for type-only imports
- `noUnusedImports: error` - remove unused imports
