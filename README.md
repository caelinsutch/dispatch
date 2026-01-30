# Dispatch

A multiplayer code execution platform for collaborative AI coding sessions. Combines Cloudflare's edge infrastructure (Workers, Durable Objects) with Modal's serverless compute for isolated sandbox environments running OpenCode.

## Architecture

```
Clients (Web/Slack/CLI)
        ↓ WebSocket
Control Plane (Cloudflare Workers + Durable Objects)
        ↓ WebSocket bridge
Modal Sandboxes (OpenCode execution)
```

### Components

- **Control Plane**: Cloudflare Workers + Durable Objects for session state, WebSocket connections, and GitHub integration
- **Frontend**: Next.js 15 with Better Auth, deployed via OpenNext for Cloudflare
- **Compute**: Modal sandboxes running OpenCode for AI-powered code execution
- **Slack Bot**: Cloudflare Worker for Slack integration

### Data Flow

1. Control plane creates session and generates sandbox auth token
2. Modal creates sandbox with GitHub App token for git operations
3. Sandbox connects via WebSocket to receive prompts
4. OpenCode runs in sandbox, streams events back to control plane
5. Control plane broadcasts events to all connected clients

## Packages

| Package | Description |
|---------|-------------|
| [`@dispatch/control-plane`](./packages/control-plane) | Cloudflare Workers API + Durable Objects |
| [`@dispatch/web`](./packages/web) | Next.js 15 web client with Better Auth |
| [`@dispatch/slack-bot`](./packages/slack-bot) | Slack bot worker |
| [`@dispatch/shared`](./packages/shared) | Shared TypeScript types |
| [`modal-infra`](./packages/modal-infra) | Python Modal sandbox infrastructure |

## Quick Start

### Prerequisites

- Node.js 20+
- Bun 1.3+
- Python 3.12+ with `uv` (for modal-infra)
- Cloudflare account with `wrangler` CLI configured
- Modal account with `modal` CLI configured

### Development

```bash
bun install          # Install dependencies
bun run dev          # Start all packages in dev mode (uses Turborepo)
```

### Build & Check

Uses [Turborepo](https://turbo.build/) for parallel builds and caching.

```bash
bun run build        # Build all packages (turbo build)
bun run typecheck    # Type check all packages (turbo typecheck)
bun run lint         # Check with Biome
bun run lint:fix     # Auto-fix linting issues
```

### Testing

```bash
cd packages/web && bun test           # Run web tests
cd packages/web && bun test:watch     # Watch mode
cd packages/control-plane && bun test # Run control-plane tests
```

## Deployment

### Deployment Order

Deploy in this order (dependencies matter):

1. **Control Plane** (first - Web and Slack Bot depend on it)
2. **Web**
3. **Slack Bot**
4. **Modal Infrastructure**

### Deploy Commands

```bash
# 1. Build all packages first
bun run build

# 2. Deploy Control Plane
cd packages/control-plane && bunx wrangler deploy

# 3. Deploy Web (requires OpenNext build)
cd packages/web && npx @opennextjs/cloudflare build && bunx wrangler deploy

# 4. Deploy Slack Bot
cd packages/slack-bot && bunx wrangler deploy

# 5. Deploy Modal (must use uv, not pip)
cd packages/modal-infra && uv run modal deploy deploy.py
```

### Secrets

Secrets persist across deployments - only set once per environment.

**Cloudflare Workers** (via `wrangler secret put <KEY>`):

| Package | Secrets |
|---------|---------|
| Web | `BETTER_AUTH_SECRET`, `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET` |
| Control Plane | `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`, `TOKEN_ENCRYPTION_KEY`, `ENCRYPTION_KEY`, `MODAL_API_SECRET`, `GITHUB_APP_ID`, `GITHUB_APP_PRIVATE_KEY`, `GITHUB_APP_INSTALLATION_ID` |
| Slack Bot | `SLACK_BOT_TOKEN`, `SLACK_SIGNING_SECRET`, `INTERNAL_CALLBACK_SECRET` |

**Modal** (via `modal secret create <name>`):

| Secret Group | Keys |
|--------------|------|
| `llm-api-keys` | `ANTHROPIC_API_KEY` |
| `github-app` | `GITHUB_APP_ID`, `GITHUB_APP_PRIVATE_KEY`, `GITHUB_APP_INSTALLATION_ID` |
| `internal-api` | `MODAL_API_SECRET`, `ALLOWED_CONTROL_PLANE_HOSTS` |

### Environment Variables

Non-secret vars are configured in `wrangler.jsonc` under `vars`:

- `packages/web/wrangler.jsonc`: `CONTROL_PLANE_URL`, `NEXT_PUBLIC_WS_URL`
- `packages/slack-bot/wrangler.jsonc`: `WEB_APP_URL`, `DEFAULT_MODEL`

## Configuration

- **Cloudflare**: `wrangler.jsonc` format (not wrangler.toml)
- **Linting**: Biome (`biome.json`) - not ESLint/Prettier
- **Formatting**: Double quotes, semicolons, ES5 trailing commas

## License

Private
