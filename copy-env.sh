#!/bin/bash

# Copy environment files from main dispatch repo to workspace
# Source: ~/Github/dispatch
# Destination: Current workspace

SOURCE_ROOT="$HOME/Github/dispatch"
DEST_ROOT="$(dirname "$0")"

echo "Copying environment files from $SOURCE_ROOT to $DEST_ROOT"

# Web package
cp "$SOURCE_ROOT/packages/web/.env.local" "$DEST_ROOT/packages/web/.env.local" 2>/dev/null && echo "✓ packages/web/.env.local"
cp "$SOURCE_ROOT/packages/web/.env.production" "$DEST_ROOT/packages/web/.env.production" 2>/dev/null && echo "✓ packages/web/.env.production"

# Control plane
cp "$SOURCE_ROOT/packages/control-plane/.dev.vars" "$DEST_ROOT/packages/control-plane/.dev.vars" 2>/dev/null && echo "✓ packages/control-plane/.dev.vars"

# Slack bot
cp "$SOURCE_ROOT/packages/slack-bot/.dev.vars" "$DEST_ROOT/packages/slack-bot/.dev.vars" 2>/dev/null && echo "✓ packages/slack-bot/.dev.vars"

# Modal infra
cp "$SOURCE_ROOT/packages/modal-infra/.env" "$DEST_ROOT/packages/modal-infra/.env" 2>/dev/null && echo "✓ packages/modal-infra/.env"

echo "Done!"
