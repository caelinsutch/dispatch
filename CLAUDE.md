# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Dispatch is a multiplayer code execution platform for collaborative AI coding sessions. It combines Cloudflare's edge infrastructure (Workers, Durable Objects) with Modal's serverless compute for isolated sandbox environments running OpenCode.

## Commands

```bash
# Development (uses Turborepo for parallel execution)
bun install               # Install dependencies (uses Bun workspaces)
bun run dev               # Start all packages in dev mode (turbo dev)

# Build and check (uses Turborepo)
bun run build             # Build all packages (turbo build)
bun run typecheck         # Type check all packages (turbo typecheck)

# Linting (Biome, NOT ESLint)
bun run lint              # Check with Biome
bun run lint:fix          # Auto-fix issues

# Package-specific testing
cd packages/web && bun test           # Run web tests
cd packages/web && bun test:watch     # Watch mode
cd packages/control-plane && bun test # Run control-plane tests

# Deployment (full steps below)
bun run build                                 # Build all packages first
cd packages/control-plane && bunx wrangler deploy  # Deploy control-plane (first!)
cd packages/web && npx @opennextjs/cloudflare build && bunx wrangler deploy  # Deploy web
cd packages/slack-bot && bunx wrangler deploy      # Deploy slack-bot
cd packages/modal-infra && uv run modal deploy deploy.py  # Deploy Modal (use uv!)
```

## Deployment Guide

### Prerequisites
- Bun installed
- `uv` (Python package manager) installed for Modal
- Cloudflare account configured with `wrangler`
- Modal account configured with `modal` CLI

### Deployment Order (important!)
1. **Control Plane first** - Web and Slack Bot depend on it
2. **Web**
3. **Slack Bot**
4. **Modal Infrastructure**

### Step-by-Step

```bash
# 1. Install and build
bun install
bun run build
bun run typecheck  # optional but recommended

# 2. Deploy Control Plane
cd packages/control-plane
bunx wrangler deploy

# 3. Deploy Web (requires OpenNext build)
cd packages/web
npx @opennextjs/cloudflare build
bunx wrangler deploy

# 4. Deploy Slack Bot
cd packages/slack-bot
bunx wrangler deploy

# 5. Deploy Modal (must use uv, not pip)
cd packages/modal-infra
uv run modal deploy deploy.py
```

### Secrets Management

Secrets persist across deployments - only set once per environment.

**Cloudflare Workers** (set via `wrangler secret put <KEY>`):
- Web: `BETTER_AUTH_SECRET`, `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`
- Control Plane: `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`, `TOKEN_ENCRYPTION_KEY`, `ENCRYPTION_KEY`, `MODAL_API_SECRET`, `GITHUB_APP_ID`, `GITHUB_APP_PRIVATE_KEY`, `GITHUB_APP_INSTALLATION_ID`
- Slack Bot: `SLACK_BOT_TOKEN`, `SLACK_SIGNING_SECRET`, `INTERNAL_CALLBACK_SECRET`

**Modal** (set via `modal secret create <name>`):
- `llm-api-keys`: `ANTHROPIC_API_KEY`
- `github-app`: `GITHUB_APP_ID`, `GITHUB_APP_PRIVATE_KEY`, `GITHUB_APP_INSTALLATION_ID`
- `internal-api`: `MODAL_API_SECRET`, `ALLOWED_CONTROL_PLANE_HOSTS`

### Environment Variables

Non-secret vars are set in `wrangler.jsonc` under `vars`:
- `packages/web/wrangler.jsonc`: `CONTROL_PLANE_URL`, `NEXT_PUBLIC_WS_URL`
- `packages/slack-bot/wrangler.jsonc`: `WEB_APP_URL`, `DEFAULT_MODEL`

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
