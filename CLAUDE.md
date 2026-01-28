# Dispatch - AI Assistant Guide

## Project Overview

Dispatch is a multiplayer code execution platform that enables collaborative AI coding sessions with real-time multi-client synchronization. It combines Cloudflare's edge infrastructure with Modal's serverless compute for isolated sandbox environments.

## Tech Stack

- **Runtime**: Bun 1.3+, Node.js 20+
- **Monorepo**: Turborepo with Bun workspaces
- **Language**: TypeScript (packages), Python 3.12+ (modal-infra)
- **Frontend**: Next.js 15, React 19, Tailwind CSS
- **Backend**: Cloudflare Workers, Durable Objects, KV
- **Compute**: Modal sandboxes with OpenCode
- **Auth**: Better Auth (NOT NextAuth)
- **Deployment**: OpenNext for Cloudflare

## Package Structure

| Package | Path | Description |
|---------|------|-------------|
| `@dispatch/web` | `packages/web` | Next.js 15 web client with Better Auth |
| `@dispatch/control-plane` | `packages/control-plane` | Cloudflare Workers API + Durable Objects |
| `@dispatch/slack-bot` | `packages/slack-bot` | Slack integration worker |
| `@dispatch/shared` | `packages/shared` | Shared TypeScript types |
| `modal-infra` | `packages/modal-infra` | Python Modal sandbox infrastructure |

## Key Patterns

### Monorepo Structure
- Bun workspaces (NOT npm/yarn workspaces)
- Turborepo for task orchestration
- Shared types via `@dispatch/shared` workspace dependency

### Linting & Formatting
- **Biome** for linting and formatting (NOT ESLint/Prettier)
- Run `bun run lint` or `bun run lint:fix`
- Config in `biome.json` at root

### Cloudflare Configuration
- **wrangler.jsonc** format (NOT wrangler.toml)
- Each deployable package has its own `wrangler.jsonc`
- Secrets set via `wrangler secret put <KEY>`

### Authentication
- **Better Auth** in web package (NOT NextAuth)
- GitHub App OAuth (NOT OAuth App)
- Token encryption with AES-256-GCM in control-plane

### Deployment
- **OpenNext** for Next.js on Cloudflare Workers
- Build: `next build && npx @opennextjs/cloudflare build`
- Modal deployment via `modal deploy deploy.py`

## Commands

```bash
# Install dependencies
bun install

# Development
bun run dev          # Start all packages in dev mode

# Build
bun run build        # Build all packages

# Type checking
bun run typecheck    # Type check all packages

# Linting
bun run lint         # Check with Biome
bun run lint:fix     # Auto-fix issues
bun run format       # Format with Biome

# Testing
bun run test         # Run tests (in packages that have them)
```

## Environment Variables

### Web (`packages/web/.env.local`)
```
GITHUB_CLIENT_ID          # GitHub App client ID
GITHUB_CLIENT_SECRET      # GitHub App client secret
NEXTAUTH_URL              # App URL (e.g., http://localhost:3000)
NEXTAUTH_SECRET           # Random secret (openssl rand -base64 32)
CONTROL_PLANE_URL         # Control plane URL
NEXT_PUBLIC_WS_URL        # WebSocket URL for control plane
INTERNAL_CALLBACK_SECRET  # Shared secret with control plane
ALLOWED_EMAIL_DOMAINS     # Optional: comma-separated domains
ALLOWED_USERS             # Optional: comma-separated usernames
```

### Control Plane (via wrangler secrets)
```
GITHUB_CLIENT_ID          # GitHub App client ID
GITHUB_CLIENT_SECRET      # GitHub App client secret
TOKEN_ENCRYPTION_KEY      # AES-256 key for token encryption
ENCRYPTION_KEY            # General encryption key
MODAL_API_SECRET          # Shared secret with Modal
GITHUB_APP_ID             # GitHub App ID
GITHUB_APP_PRIVATE_KEY    # GitHub App private key (PKCS#8)
GITHUB_APP_INSTALLATION_ID # GitHub App installation ID
```

### Slack Bot (via wrangler secrets)
```
SLACK_BOT_TOKEN           # Slack bot token (xoxb-...)
SLACK_SIGNING_SECRET      # Slack app signing secret
INTERNAL_CALLBACK_SECRET  # Shared secret with control plane
```

### Modal Infra (via Modal secrets)
```
ANTHROPIC_API_KEY         # Anthropic API key (llm-api-keys secret)
GITHUB_APP_ID             # GitHub App ID (github-app secret)
GITHUB_APP_PRIVATE_KEY    # GitHub App private key (github-app secret)
GITHUB_APP_INSTALLATION_ID # Installation ID (github-app secret)
MODAL_API_SECRET          # Shared secret (internal-api secret)
ALLOWED_CONTROL_PLANE_HOSTS # Allowed hosts for SSRF protection
```

## Important Files

### Root
- `package.json` - Workspace root, scripts, dev dependencies
- `turbo.json` - Turborepo task configuration
- `biome.json` - Linting and formatting rules

### Web Package
- `packages/web/src/app/` - Next.js App Router pages
- `packages/web/src/lib/auth.ts` - Better Auth configuration
- `packages/web/wrangler.jsonc` - Cloudflare deployment config
- `packages/web/open-next.config.ts` - OpenNext configuration

### Control Plane
- `packages/control-plane/src/index.ts` - Worker entry point
- `packages/control-plane/src/session/` - Durable Object implementation
- `packages/control-plane/src/router.ts` - API routes
- `packages/control-plane/wrangler.jsonc` - Worker config with DO bindings

### Modal Infra
- `packages/modal-infra/deploy.py` - Modal deployment entry
- `packages/modal-infra/src/web_api.py` - HTTP API endpoints
- `packages/modal-infra/src/sandbox/manager.py` - Sandbox lifecycle
- `packages/modal-infra/src/sandbox/bridge.py` - WebSocket bridge

## Architecture Notes

1. **Control Plane** handles session state via Durable Objects with SQLite
2. **WebSocket connections** use hibernation for cost efficiency
3. **Modal sandboxes** run OpenCode with filesystem snapshots for fast startup
4. **GitHub tokens** are encrypted at rest, never sent to sandboxes
5. **Single-tenant design** - all users share the same GitHub App installation
