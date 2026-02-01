"""
Base image definition for Modal Sandbox sandboxes.

This image provides a complete development environment with:
- Debian slim base with git, curl, build-essential
- Node.js 22 LTS, pnpm, Bun runtime
- Python 3.12 with uv
- OpenCode CLI pre-installed
- Playwright with headless Chrome for visual verification
- Sandbox entrypoint and bridge code
"""

from pathlib import Path

import modal

# Get the path to the sandbox code
SANDBOX_DIR = Path(__file__).parent.parent / "sandbox"

# Plugin is now bundled with sandbox code at /app/sandbox/inspect-plugin.js

# OpenCode version to install
OPENCODE_VERSION = "latest"

# Cache buster - change this to force Modal image rebuild
# v47: Fix daedalus wrapper to use absolute path
CACHE_BUSTER = "v47-daedalus-absolute-path"

# Base image with all development tools
base_image = (
    modal.Image.debian_slim(python_version="3.12")
    # System packages
    .apt_install(
        "git",
        "curl",
        "build-essential",
        "ca-certificates",
        "gnupg",
        "openssh-client",
        "unzip",  # Required for Bun installation
        # For Playwright
        "libnss3",
        "libnspr4",
        "libatk1.0-0",
        "libatk-bridge2.0-0",
        "libcups2",
        "libdrm2",
        "libxkbcommon0",
        "libxcomposite1",
        "libxdamage1",
        "libxfixes3",
        "libxrandr2",
        "libgbm1",
        "libasound2",
        "libpango-1.0-0",
        "libcairo2",
    )
    # Install Node.js 22 LTS
    .run_commands(
        # Add NodeSource repository for Node.js 22
        "curl -fsSL https://deb.nodesource.com/setup_22.x | bash -",
        "apt-get install -y nodejs",
        # Verify installation
        "node --version",
        "npm --version",
    )
    # Install pnpm and Bun
    .run_commands(
        # Install pnpm globally
        "npm install -g pnpm@latest",
        "pnpm --version",
        # Install Bun
        "curl -fsSL https://bun.sh/install | bash",
        # Add Bun to PATH for subsequent commands
        'echo "export BUN_INSTALL="$HOME/.bun"" >> /etc/profile.d/bun.sh',
        'echo "export PATH="$BUN_INSTALL/bin:$PATH"" >> /etc/profile.d/bun.sh',
    )
    # Install Python tools
    .pip_install(
        "uv",
        "httpx",
        "websockets",
        "playwright",
        "pydantic>=2.0",  # Required for sandbox types
        "PyJWT[crypto]",  # For GitHub App token generation (includes cryptography)
    )
    # Install OpenCode CLI and plugin for custom tools
    .run_commands(
        "npm install -g opencode-ai@latest",
        "opencode --version || echo 'OpenCode installed'",
        # Install @opencode-ai/plugin globally for custom tools
        # This ensures tools can import the plugin without needing to run bun add
        "npm install -g @opencode-ai/plugin@latest zod",
    )
    # Install Playwright browsers (Chromium only to save space)
    .run_commands(
        "playwright install chromium",
        "playwright install-deps chromium",
    )
    # Install code-server for VS Code in browser
    .run_commands(
        "curl -fsSL https://code-server.dev/install.sh | sh",
        "code-server --version",
    )
    # Install VS Code CLI for Remote Tunnels (allows connecting local VS Code)
    # Use the standalone CLI download from update.code.visualstudio.com
    .run_commands(
        "curl -L 'https://update.code.visualstudio.com/latest/cli-linux-x64/stable' -o /tmp/vscode_cli.tar.gz",
        "tar -xzf /tmp/vscode_cli.tar.gz -C /usr/local/bin",
        "rm /tmp/vscode_cli.tar.gz",
        "code tunnel --version || echo 'VS Code CLI installed'",
    )
    # Install Daedalus CLI for web extraction (private repo requires PAT)
    # PATH must include /root/.bun/bin during build: postinstall runs `bun run`, daedalus shebang uses bun
    # Note: Daedalus must run from its extractor directory due to workspace dependencies
    .run_commands(
        "git clone --depth 1 https://x-access-token:${GITHUB_PAT}@github.com/tylertaewook/daedalus.git /opt/daedalus",
        "cd /opt/daedalus/extractor && PATH=/root/.bun/bin:$PATH /root/.bun/bin/bun install",
        # Create a global wrapper script that runs daedalus from its directory with absolute path
        'echo \'#!/bin/bash\' > /usr/local/bin/daedalus',
        'echo \'cd /opt/daedalus/extractor && exec /root/.bun/bin/bun run /opt/daedalus/extractor/src/index.ts "$@"\' >> /usr/local/bin/daedalus',
        "chmod +x /usr/local/bin/daedalus",
        # Test the wrapper
        "PATH=/root/.bun/bin:$PATH daedalus healthcheck || echo 'Daedalus wrapper created'",
        secrets=[modal.Secret.from_name("daedalus-repo")],
    )
    # Create working directories
    .run_commands(
        "mkdir -p /workspace",
        "mkdir -p /app/plugins",
        "mkdir -p /tmp/opencode",
        "echo 'Image rebuilt at: v21-force-rebuild' > /app/image-version.txt",
    )
    # Set environment variables (including cache buster to force rebuild)
    .env(
        {
            "HOME": "/root",
            "NODE_ENV": "development",
            "PNPM_HOME": "/root/.local/share/pnpm",
            "PATH": "/root/.bun/bin:/root/.local/share/pnpm:/usr/local/bin:/usr/bin:/bin",
            "PLAYWRIGHT_BROWSERS_PATH": "/root/.cache/ms-playwright",
            "PYTHONPATH": "/app",
            "SANDBOX_VERSION": CACHE_BUSTER,
            # NODE_PATH for globally installed modules (used by custom tools)
            "NODE_PATH": "/usr/lib/node_modules",
        }
    )
    # Add sandbox code to the image (includes plugin at /app/sandbox/inspect-plugin.js)
    .add_local_dir(
        str(SANDBOX_DIR),
        remote_path="/app/sandbox",
    )
)

# Image variant optimized for Node.js/TypeScript projects
node_image = base_image.run_commands(
    # Pre-cache common Node.js development dependencies
    "npm cache clean --force",
)

# Image variant optimized for Python projects
python_image = base_image.run_commands(
    # Pre-create virtual environment
    "uv venv /workspace/.venv",
)
