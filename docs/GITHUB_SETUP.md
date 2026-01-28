# GitHub Setup Guide

This guide walks you through setting up both a **GitHub OAuth App** (for user authentication) and a **GitHub App** (for repository access) required by Modal Sandbox.

## Overview

Modal Sandbox requires two separate GitHub integrations:

| Integration | Purpose | Used By |
|-------------|---------|---------|
| **OAuth App** | Authenticates users via GitHub login | `packages/web` (Better Auth) |
| **GitHub App** | Accesses repositories on behalf of the app | `packages/control-plane`, `packages/modal-infra` |

> **Why two apps?** OAuth Apps authenticate *users* and act on their behalf. GitHub Apps authenticate as *themselves* with specific permissions, enabling server-side operations without user tokens.

---

## Part 1: GitHub OAuth App Setup

The OAuth App enables "Sign in with GitHub" functionality for users.

### Step 1: Navigate to OAuth Apps Settings

1. Go to [GitHub Developer Settings](https://github.com/settings/developers)
2. Click **OAuth Apps** in the left sidebar
3. Click **New OAuth App**

> Direct link: https://github.com/settings/applications/new

### Step 2: Configure the OAuth App

Fill in the application details:

| Field | Development Value | Production Value |
|-------|-------------------|------------------|
| **Application name** | `Modal Sandbox (Dev)` | `Modal Sandbox` |
| **Homepage URL** | `http://localhost:3000` | `https://your-domain.com` |
| **Authorization callback URL** | `http://localhost:3000/api/auth/callback/github` | `https://your-domain.com/api/auth/callback/github` |

Leave **Application description** and **Application logo** optional (but recommended for production).

### Step 3: Register and Note Credentials

1. Click **Register application**
2. Copy the **Client ID** (visible immediately)
3. Click **Generate a new client secret**
4. Copy the **Client Secret** (shown only once!)

> **Warning:** The client secret is displayed only once. Store it securely before navigating away.

### Step 4: Configure Environment Variables

Add the credentials to `packages/web/.env.local`:

```bash
# GitHub OAuth App (User Authentication)
GITHUB_CLIENT_ID=your_oauth_client_id_here
GITHUB_CLIENT_SECRET=your_oauth_client_secret_here
```

### Required OAuth Scopes

Better Auth requests these scopes automatically during the OAuth flow:

| Scope | Purpose |
|-------|---------|
| `read:user` | Read user profile information |
| `user:email` | Access user email addresses |
| `repo` | Full repository access (for sandbox operations) |

---

## Part 2: GitHub App Setup

The GitHub App enables server-side repository operations without requiring user tokens.

### Step 1: Navigate to GitHub Apps Settings

1. Go to [GitHub Developer Settings](https://github.com/settings/developers)
2. Click **GitHub Apps** in the left sidebar
3. Click **New GitHub App**

> Direct link: https://github.com/settings/apps/new

### Step 2: Configure Basic Information

| Field | Value |
|-------|-------|
| **GitHub App name** | `Modal Sandbox Bot` (must be globally unique) |
| **Homepage URL** | `https://your-domain.com` |
| **Webhook** | Uncheck "Active" (not needed for this use case) |

### Step 3: Set Repository Permissions

Under **Repository permissions**, configure:

| Permission | Access Level | Purpose |
|------------|--------------|---------|
| **Contents** | Read and write | Clone repos, read/write files |
| **Pull requests** | Read and write | Create and manage PRs from sandboxes |

Leave all other permissions at "No access".

### Step 4: Configure Additional Settings

| Setting | Value |
|---------|-------|
| **Where can this GitHub App be installed?** | "Only on this account" (recommended) or "Any account" |
| **Webhook** | Disabled (uncheck "Active") |

### Step 5: Create the App

1. Click **Create GitHub App**
2. Note the **App ID** displayed at the top of the page

### Step 6: Generate Private Key

1. Scroll down to **Private keys** section
2. Click **Generate a private key**
3. A `.pem` file downloads automatically
4. Store this file securely

### Step 7: Convert Private Key to PKCS#8 Format

The downloaded key is in PKCS#1 format. Modal Sandbox requires PKCS#8 format.

```bash
# Convert PKCS#1 to PKCS#8
openssl pkcs8 -topk8 -inform PEM -outform PEM -nocrypt \
  -in your-app-name.YYYY-MM-DD.private-key.pem \
  -out github-app-private-key.pem
```

Verify the conversion:
```bash
# PKCS#1 starts with:
# -----BEGIN RSA PRIVATE KEY-----

# PKCS#8 starts with:
# -----BEGIN PRIVATE KEY-----

head -1 github-app-private-key.pem
# Should output: -----BEGIN PRIVATE KEY-----
```

### Step 8: Install the App

1. From your GitHub App settings page, click **Install App** in the left sidebar
2. Select the account/organization where you want to install
3. Choose repository access:
   - **All repositories** - App can access all repos
   - **Only select repositories** - Choose specific repos
4. Click **Install**
5. Note the **Installation ID** from the URL: `https://github.com/settings/installations/INSTALLATION_ID`

### Step 9: Configure Environment Variables

Add the credentials to both `packages/control-plane/.dev.vars` and `packages/modal-infra/.env`:

```bash
# GitHub App (Repository Access)
GITHUB_APP_ID=123456
GITHUB_APP_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----
MIIEvgIBADANBgkqhkiG9w0BAQEFAASC...
...your full private key here...
-----END PRIVATE KEY-----"
GITHUB_APP_INSTALLATION_ID=12345678
```

> **Note:** For the private key, include the entire contents including the BEGIN/END markers. In `.dev.vars`, wrap multi-line values in quotes.

---

## Environment Variable Summary

### packages/web/.env.local
```bash
# OAuth App credentials (user authentication)
GITHUB_CLIENT_ID=Iv1.xxxxxxxxxxxx
GITHUB_CLIENT_SECRET=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

### packages/control-plane/.dev.vars
```bash
# GitHub App credentials (repository access)
GITHUB_APP_ID=123456
GITHUB_APP_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----
...
-----END PRIVATE KEY-----"
GITHUB_APP_INSTALLATION_ID=12345678
```

### packages/modal-infra/.env
```bash
# GitHub App credentials (repository access)
GITHUB_APP_ID=123456
GITHUB_APP_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----
...
-----END PRIVATE KEY-----"
GITHUB_APP_INSTALLATION_ID=12345678
```

---

## Troubleshooting

### OAuth App Issues

#### "The redirect_uri is not valid"
- Ensure the callback URL exactly matches what's registered in GitHub
- Check for trailing slashes - `http://localhost:3000/` vs `http://localhost:3000`
- Verify you're using the correct environment (dev vs prod)

#### "Bad credentials" during login
- Regenerate the client secret in GitHub and update `.env.local`
- Ensure no extra whitespace in environment variables

#### User can't access certain repos
- OAuth App access depends on user permissions
- For org repos, the user must have access and the org must approve the OAuth App

### GitHub App Issues

#### "Private key is invalid"
- Ensure the key is in PKCS#8 format (starts with `-----BEGIN PRIVATE KEY-----`)
- Run the openssl conversion command if it starts with `-----BEGIN RSA PRIVATE KEY-----`
- Check for truncated keys - the entire key must be included

#### "Installation not found"
- Verify the Installation ID is correct (check URL after installing)
- Ensure the app is installed on the target repository/organization
- Check that the app hasn't been uninstalled or suspended

#### "Resource not accessible by integration"
- The GitHub App lacks required permissions
- Go to App settings > Permissions and add the missing permission
- Reinstall the app after changing permissions

#### "Bad credentials" for GitHub App
- Verify the App ID is correct (not the Client ID)
- Check that the private key matches the app
- Ensure the private key hasn't been revoked

### General Issues

#### Environment variables not loading
- Restart the development server after changing `.env.local`
- For Cloudflare Workers, use `wrangler secret put` for production
- Verify file names: `.env.local` (not `.env`)

#### "Rate limit exceeded"
- GitHub Apps have higher rate limits than OAuth Apps
- Check if you're accidentally using OAuth tokens for API calls that should use App tokens

---

## Security Best Practices

1. **Never commit secrets** - Add `.env.local`, `.dev.vars`, and `.env` to `.gitignore`
2. **Rotate secrets regularly** - Regenerate client secrets and private keys periodically
3. **Use minimal permissions** - Only request scopes/permissions actually needed
4. **Separate dev/prod apps** - Create separate OAuth Apps and GitHub Apps for each environment
5. **Monitor app access** - Review GitHub App installations and OAuth authorizations regularly

---

## Quick Reference

| Credential | Where to Find | Where to Use |
|------------|---------------|--------------|
| OAuth Client ID | OAuth App settings page | `packages/web/.env.local` |
| OAuth Client Secret | Generate in OAuth App settings | `packages/web/.env.local` |
| GitHub App ID | Top of GitHub App settings page | `control-plane/.dev.vars`, `modal-infra/.env` |
| GitHub App Private Key | Generate and download from App settings | `control-plane/.dev.vars`, `modal-infra/.env` |
| Installation ID | URL after installing app | `control-plane/.dev.vars`, `modal-infra/.env` |
