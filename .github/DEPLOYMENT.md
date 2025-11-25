# GitHub Actions Deployment Guide

This project uses GitHub Actions to automatically deploy to dev and production environments, following the vault-server deployment pattern.

## Workflow Overview

### Three Workflow Files

1. **`deploy.yml`** (Reusable) - Contains the actual deployment logic
2. **`deploy-dev.yml`** - Triggers deployment to dev environment
3. **`deploy-production.yml`** - Triggers deployment to production environment

### Deployment Flow

```
Push to main → Build & Test → Deploy to Dev
Tag with v* → Build & Test → Deploy to Production
```

## Trigger Methods

### Automatic Deployment to Dev
- Push to `main` branch automatically deploys to dev environment
- Example: `git push origin main`

### Automatic Deployment to Production
- Push a version tag (e.g., `v1.0.0`) automatically deploys to production
- Example:
  ```bash
  git tag v1.0.0
  git push origin v1.0.0
  ```

### Manual Deployment
1. Go to **Actions** → Select workflow (Deploy to Development or Deploy to Production)
2. Click **Run workflow**
3. Optionally specify a version (commit SHA or tag)

## Required GitHub Configuration

### Repository Variables

Configure in **Settings → Secrets and variables → Actions → Variables**:

- `DEV_BASE_URI` - Base URI for dev environment (e.g., `http://dev.notes.duquesnay.fr`)
- `PROD_BASE_URI` - Base URI for production environment (e.g., `http://notes.duquesnay.fr`)

### Repository Secrets

Configure in **Settings → Secrets and variables → Actions → Secrets**:

#### Development Secrets
- `DEV_SSH_PRIVATE_KEY` - SSH private key for dev server
- `DEV_SERVER_HOST` - Dev server hostname (e.g., `dev.notes.duquesnay.fr`)
- `DEV_MIRO_CLIENT_ID_B64` - Base64-encoded Miro client ID for dev
- `DEV_MIRO_CLIENT_SECRET_B64` - Base64-encoded Miro client secret for dev

#### Production Secrets
- `PROD_SSH_PRIVATE_KEY` - SSH private key for production server
- `PROD_SERVER_HOST` - Production server hostname (e.g., `notes.duquesnay.fr`)
- `PROD_MIRO_CLIENT_ID_B64` - Base64-encoded Miro client ID for production
- `PROD_MIRO_CLIENT_SECRET_B64` - Base64-encoded Miro client secret for production

## Setting Up SSH Access

### 1. Generate SSH Key Pair

```bash
# For dev
ssh-keygen -t ed25519 -C "github-actions-dev" -f ~/.ssh/miro-mcp-dev
# For production
ssh-keygen -t ed25519 -C "github-actions-prod" -f ~/.ssh/miro-mcp-prod
```

### 2. Add Public Key to Servers

```bash
# Copy public key
cat ~/.ssh/miro-mcp-dev.pub

# SSH to server
ssh root@dev.notes.duquesnay.fr

# Add to authorized_keys
mkdir -p ~/.ssh
echo "PASTE_PUBLIC_KEY_HERE" >> ~/.ssh/authorized_keys
chmod 700 ~/.ssh
chmod 600 ~/.ssh/authorized_keys
```

Repeat for production server.

### 3. Add Private Key to GitHub Secrets

```bash
# Copy entire private key content
cat ~/.ssh/miro-mcp-dev

# Go to GitHub: Settings → Secrets → New repository secret
# Name: DEV_SSH_PRIVATE_KEY
# Value: Paste entire private key (including BEGIN/END lines)
```

### 4. Test SSH Connection

```bash
ssh -i ~/.ssh/miro-mcp-dev root@dev.notes.duquesnay.fr "echo 'Connection successful'"
```

## Setting Up Miro Credentials

### 1. Encode Credentials

```bash
# Encode your Miro credentials to base64
echo -n "your_client_id" | base64
echo -n "your_client_secret" | base64
```

### 2. Add to GitHub Secrets

Add the base64-encoded values as:
- `DEV_MIRO_CLIENT_ID_B64`
- `DEV_MIRO_CLIENT_SECRET_B64`
- `PROD_MIRO_CLIENT_ID_B64`
- `PROD_MIRO_CLIENT_SECRET_B64`

## Deployment Process

### What Happens During Deployment

1. **Checkout** - Pulls code from specified version/branch/tag
2. **Version** - Determines version to deploy
3. **Build** - Installs dependencies, compiles TypeScript
4. **Test** - Runs test suite
5. **Package** - Creates tarball with built code
6. **SSH Setup** - Configures SSH connection
7. **Deploy** - Uploads and deploys to server
8. **Verify** - Checks container is running
9. **Logs** - Uploads deployment logs as artifacts

### Server Deployment Steps

On the server, the deployment:
1. Cleans old deployment (preserves `/data` directory)
2. Extracts new package
3. Generates `.env` file with secrets
4. Creates Docker ingress network if needed
5. Stops old containers
6. Builds new Docker image
7. Starts new containers
8. Verifies containers are running

## Monitoring Deployments

### View Workflow Runs
- Go to **Actions** tab in GitHub
- Click on a workflow run to see logs

### Download Deployment Logs
- In workflow run, scroll to **Artifacts**
- Download `deployment-logs-dev` or `deployment-logs-production`
- Retention: 14 days (dev), 30 days (prod)

### Check Container Status on Server

```bash
# Dev
ssh root@dev.notes.duquesnay.fr "cd /opt/miro-mcp && docker compose ps"

# Production
ssh root@notes.duquesnay.fr "cd /opt/miro-mcp && docker compose ps"
```

### View Container Logs

```bash
# Dev
ssh root@dev.notes.duquesnay.fr "cd /opt/miro-mcp && docker compose logs -f"

# Production
ssh root@notes.duquesnay.fr "cd /opt/miro-mcp && docker compose logs -f"
```

## Troubleshooting

### SSH Connection Fails

**Symptoms:**
```
ssh: connect to host dev.notes.duquesnay.fr port 22: Connection refused
```

**Solutions:**
1. Verify SSH key is correctly added to GitHub secrets (entire key, including BEGIN/END)
2. Ensure public key is in server's `~/.ssh/authorized_keys`
3. Check server is accessible: `ping dev.notes.duquesnay.fr`
4. Verify you're not behind a firewall blocking SSH

### Build Fails

**Symptoms:**
```
npm ERR! code ELIFECYCLE
```

**Solutions:**
1. Check TypeScript compilation errors in workflow logs
2. Ensure all dependencies are in `package.json`
3. Run `npm run build` locally to reproduce
4. Check Node.js version matches (workflow uses Node 20)

### Tests Fail

**Symptoms:**
```
FAIL tests/...
```

**Solutions:**
1. Review test failures in workflow logs
2. Run tests locally: `npm test`
3. Fix failing tests before deploying
4. Consider skipping tests for urgent hotfixes (not recommended)

### Container Not Running

**Symptoms:**
```
Error: miro-mcp container not running!
```

**Solutions:**
1. SSH to server and check Docker logs:
   ```bash
   ssh root@dev.notes.duquesnay.fr
   cd /opt/miro-mcp
   docker compose logs
   ```
2. Check `.env` file was generated correctly
3. Verify Docker network exists: `docker network ls | grep ingress`
4. Check disk space: `df -h`
5. Verify environment variables are correct

### Environment Variable Issues

**Symptoms:**
```
Error: MIRO_CLIENT_ID_B64 is not defined
```

**Solutions:**
1. Verify all required secrets are set in GitHub
2. Check secret names match exactly (case-sensitive)
3. Re-encode credentials: `echo -n "value" | base64`
4. Verify base64 encoding doesn't have line breaks

## Rollback Procedure

### Option 1: Re-run Previous Deployment

1. Go to **Actions** → Find last successful deployment
2. Click **Re-run jobs** → **Re-run all jobs**

### Option 2: Deploy Specific Version

1. Go to **Actions** → **Deploy to Development** (or Production)
2. Click **Run workflow**
3. Enter previous version/tag/commit SHA
4. Click **Run workflow**

### Option 3: Manual Rollback

```bash
# SSH to server
ssh root@dev.notes.duquesnay.fr
cd /opt/miro-mcp

# Check recent deployments
ls -la

# If you have a backup, restore it
# Or redeploy from a specific commit using GitHub Actions
```

## Security Best Practices

- ✅ Use separate SSH keys for dev and production
- ✅ Use separate Miro credentials for dev and production
- ✅ Never commit secrets to repository
- ✅ Rotate SSH keys periodically (every 90 days)
- ✅ Use GitHub environment protection rules for production
- ✅ Review deployment logs regularly
- ✅ Monitor failed deployments and investigate immediately

## GitHub Environment Protection (Optional)

For additional production safety:

1. Go to **Settings → Environments**
2. Create `production` environment
3. Add protection rules:
   - ✅ Required reviewers (1-6 people)
   - ✅ Wait timer (e.g., 5 minutes)
   - ✅ Deployment branches: Only tags matching `v*`

This ensures production deployments require approval.

## Quick Reference

### Deploy to Dev
```bash
git push origin main
```

### Deploy to Production
```bash
git tag v1.0.0
git push origin v1.0.0
```

### Manual Deploy
Go to Actions → Select workflow → Run workflow

### Check Deployment
```bash
ssh root@dev.notes.duquesnay.fr "docker ps | grep miro-mcp"
```

### View Logs
```bash
ssh root@dev.notes.duquesnay.fr "cd /opt/miro-mcp && docker compose logs -f"
```
