# Dispatch

A collaborative AI coding assistant platform with real-time multi-client synchronization.

## Architecture

```
                    ┌─────────────────────────────────────────┐
                    │              Clients                     │
                    │  ┌─────────┐  ┌─────────┐  ┌─────────┐  │
                    │  │   Web   │  │  Slack  │  │   CLI   │  │
                    │  └────┬────┘  └────┬────┘  └────┬────┘  │
                    └───────┼────────────┼────────────┼───────┘
                            │            │            │
                            ▼            ▼            ▼
┌───────────────────────────────────────────────────────────────┐
│                    Control Plane                               │
│              (Cloudflare Workers + Durable Objects)            │
│  • Session management with SQLite persistence                  │
│  • Real-time WebSocket streaming with hibernation              │
│  • GitHub App integration for repository access                │
└───────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌───────────────────────────────────────────────────────────────┐
│                    Compute (Modal)                             │
│  • Isolated sandbox environments per session                   │
│  • Pre-built images with Node.js, Python, Playwright           │
│  • Filesystem snapshots for fast startup                       │
└───────────────────────────────────────────────────────────────┘
```

**Control Plane**: Cloudflare Workers + Durable Objects for session state, WebSocket connections, and GitHub integration.

**Frontend**: Next.js 15 deployed via OpenNext for Cloudflare.

**Compute**: Modal sandboxes running OpenCode for AI-powered code execution.

**Slack Bot**: Cloudflare Worker for Slack integration.

## Packages

| Package | Description |
|---------|-------------|
| [`@dispatch/control-plane`](./packages/control-plane) | Cloudflare Workers API + Durable Objects |
| [`@dispatch/web`](./packages/web) | Next.js web client |
| [`@dispatch/slack-bot`](./packages/slack-bot) | Slack bot worker |
| [`@dispatch/shared`](./packages/shared) | Shared TypeScript types |
| [`packages/modal-infra`](./packages/modal-infra) | Python Modal sandbox infrastructure |

## Quick Start

### Prerequisites

- Node.js 20+
- Bun 1.3+
- Python 3.12+ (for modal-infra)

### Install

```bash
bun install
```

### Build

```bash
bun run build
```

### Typecheck

```bash
bun run typecheck
```

### Lint

```bash
bun run lint
```

## Deployment Requirements

Full deployment requires:

- **Cloudflare account** - Workers, Durable Objects, D1
- **Modal account** - Sandbox compute
- **GitHub App** - Repository access and OAuth
- **Slack App** - Slack integration (optional)

See package-specific READMEs for detailed setup instructions.

## License

Private
