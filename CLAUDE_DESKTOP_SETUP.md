# Claude Desktop Setup Guide for Miro MCP

This guide explains how to enable the Miro MCP server in Claude Desktop or Claude Code, allowing Claude to create and manipulate Miro boards directly.

## Overview

The Miro MCP (Model Context Protocol) server enables Claude to:
- Create and manage Miro boards
- Add sticky notes, shapes, text, and frames
- Create connectors between items
- Build organizational visualizations (team structures, workflows, etc.)

## Prerequisites

1. **Miro Account**: You need a Miro account (free or paid)
2. **Node.js**: Version 16+ installed
3. **Claude Desktop**: Latest version installed
4. **Miro OAuth App**: Created in your Miro account settings

---

## Step 1: Create Miro OAuth Application

1. Go to [Miro Apps Settings](https://miro.com/app/settings/user-profile/apps)
2. Click **"Create new app"**
3. Fill in the details:
   - **App Name**: "Claude MCP" (or any name you prefer)
   - **App Description**: "MCP server for Claude AI integration"
4. Click **"Create app"**
5. Note down your:
   - **Client ID** (looks like: `3458764...`)
   - **Client Secret** (looks like: `AKooW...`)
6. Set **Redirect URI** to: `http://localhost:3003/oauth/callback`
   - Click "Add" to save the redirect URI

---

## Step 2: Install the Miro MCP Server

### Option A: Install from GitHub (Recommended)

```bash
# Clone the repository
git clone https://github.com/YOUR_USERNAME/miro-remote-mcp.git
cd miro-remote-mcp

# Install dependencies
npm install

# Build the server
npm run build
```

### Option B: Install from npm (when published)

```bash
npm install -g miro-remote-mcp
```

---

## Step 3: Configure OAuth Credentials

1. Copy the example environment file:
   ```bash
   cp .env.example .env
   ```

2. Edit `.env` and add your credentials:
   ```bash
   # Miro OAuth2 Credentials
   MIRO_CLIENT_ID=YOUR_CLIENT_ID_HERE
   MIRO_CLIENT_SECRET=YOUR_CLIENT_SECRET_HERE

   # OAuth2 Configuration
   MIRO_REDIRECT_URI=http://localhost:3003/oauth/callback
   PORT=3003
   ```

3. Save the file

---

## Step 4: Obtain OAuth Tokens

Run the OAuth helper to get your access and refresh tokens:

```bash
npm run oauth
```

This will:
1. Start a local server on port 3003
2. Print an authorization URL
3. Open that URL in your browser
4. Ask you to authorize the app in Miro
5. Automatically save your tokens to `tokens.json` and `.env`

**Example output:**
```
=== Miro OAuth2 Token Helper ===

OAuth callback server running on http://localhost:3003

Step 1: Open this URL in your browser:
https://miro.com/oauth/authorize?response_type=code&client_id=...

Step 2: Authorize the app
Step 3: You will be redirected back and tokens will be saved automatically

Waiting for authorization...
```

After authorizing, you'll see:
```
✓ Success! Tokens obtained
Tokens have been saved to tokens.json

Add these to your .env file:
MIRO_ACCESS_TOKEN=eyJtaXJvLm9yaWdpbiI6...
MIRO_REFRESH_TOKEN=eyJtaXJvLm9yaWdpbiI6...
```

---

## Step 5: Configure Claude Desktop

### For Claude Desktop App

1. Open Claude Desktop configuration file:
   - **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
   - **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`
   - **Linux**: `~/.config/Claude/claude_desktop_config.json`

2. Add the Miro MCP server configuration:

```json
{
  "mcpServers": {
    "miro": {
      "command": "node",
      "args": [
        "/ABSOLUTE/PATH/TO/miro-remote-mcp/dist/index.js"
      ],
      "env": {
        "MIRO_CLIENT_ID": "YOUR_CLIENT_ID",
        "MIRO_CLIENT_SECRET": "YOUR_CLIENT_SECRET",
        "MIRO_ACCESS_TOKEN": "YOUR_ACCESS_TOKEN",
        "MIRO_REFRESH_TOKEN": "YOUR_REFRESH_TOKEN"
      }
    }
  }
}
```

**Important Notes:**
- Replace `/ABSOLUTE/PATH/TO/miro-remote-mcp` with the actual path
- Replace `YOUR_CLIENT_ID`, `YOUR_CLIENT_SECRET`, etc. with your actual values
- You can find the tokens in your `.env` file after running `npm run oauth`

### For Claude Code (VSCode Extension)

1. Open VSCode Settings
2. Search for "Claude Code MCP"
3. Add to your `settings.json`:

```json
{
  "claude.mcpServers": {
    "miro": {
      "command": "node",
      "args": [
        "/ABSOLUTE/PATH/TO/miro-remote-mcp/dist/index.js"
      ],
      "env": {
        "MIRO_CLIENT_ID": "YOUR_CLIENT_ID",
        "MIRO_CLIENT_SECRET": "YOUR_CLIENT_SECRET",
        "MIRO_ACCESS_TOKEN": "YOUR_ACCESS_TOKEN",
        "MIRO_REFRESH_TOKEN": "YOUR_REFRESH_TOKEN"
      }
    }
  }
}
```

---

## Step 6: Restart Claude

1. **Claude Desktop**: Completely quit and restart the application
2. **Claude Code**: Reload VSCode window (`Cmd+R` or `Ctrl+R`)

---

## Step 7: Verify Installation

In Claude Desktop or Claude Code, try asking:

> "Create a Miro board called 'Test Board' with a sticky note that says 'Hello from Claude!'"

If everything is set up correctly, Claude will:
1. Create a new Miro board
2. Add a sticky note
3. Return a link to view the board

---

## Available MCP Tools

Once configured, Claude has access to these Miro operations:

### Board Operations
- `list_boards` - List all accessible boards
- `get_board` - Get details of a specific board
- `create_board` - Create a new board

### Item Operations
- `list_items` - List items on a board
- `get_item` - Get details of a specific item
- `update_item` - Update an item's properties
- `delete_item` - Delete an item

### Creation Tools
- `create_sticky_note` - Create sticky notes (various colors)
- `create_shape` - Create shapes (rectangles, circles, etc.)
- `create_text` - Create text items
- `create_frame` - Create frames for grouping

### Connector Tools
- `create_connector` - Connect two items with lines/arrows
- `update_connector` - Update connector styling

---

## Example Use Cases

### 1. Team Structure Visualization

> "Create a Miro board showing our engineering team structure. We have a Platform Squad with 4 developers, a Product Squad with 5 people, and connections showing the Engineering Manager overseeing both."

### 2. Workflow Diagram

> "Create a customer onboarding workflow on Miro with: Signup → Email Verification → Profile Setup → Welcome Tutorial. Use shapes and connectors."

### 3. Brainstorming Session

> "Create a Miro board for our Q4 planning with 3 frames: Goals, Initiatives, and Risks. Add some starter sticky notes in each."

### 4. Agile Board

> "Create a kanban board with columns for: Backlog, In Progress, Review, and Done. Add 3 example tasks as sticky notes."

---

## Troubleshooting

### "MCP server not found" Error

**Solution**: Check that:
1. The path in `claude_desktop_config.json` is absolute (starts with `/`)
2. The path points to `dist/index.js` (not `src/index.ts`)
3. You ran `npm run build` to compile the TypeScript

### "Authentication failed" Error

**Solution**:
1. Verify your tokens are still valid (they expire)
2. Run `npm run oauth` again to get fresh tokens
3. Update the tokens in `claude_desktop_config.json`
4. Restart Claude

### "Port already in use" Error

**Solution**: Change the port in your `.env` file:
```bash
PORT=3004  # or any available port
MIRO_REDIRECT_URI=http://localhost:3004/oauth/callback
```

Don't forget to update the Redirect URI in your Miro app settings too!

### Tokens Expire

The access token expires after a certain period. The server automatically refreshes it using the refresh token. If you get authentication errors:

1. Check `tokens.json` - it should have an `expires_at` timestamp
2. If expired, run `npm run oauth` again
3. Update tokens in Claude Desktop config

---

## Security Best Practices

1. **Never commit tokens**: The `.env` and `tokens.json` files are git-ignored for security
2. **Keep credentials private**: Don't share your Client ID, Client Secret, or tokens
3. **Use separate apps**: Create different Miro OAuth apps for different environments
4. **Revoke access**: If tokens are compromised, revoke the OAuth app in Miro settings

---

## Plugin vs MCP Server

### Current: MCP Server (Remote Tool)
- ✅ Works with both Claude Desktop and Claude Code
- ✅ Full control over functionality
- ✅ Can be updated independently
- ❌ Requires manual installation and configuration
- ❌ Requires OAuth setup

### Future: Claude Plugin
Making this a native Claude plugin would require:
1. Anthropic to add plugin marketplace support
2. Hosting infrastructure for the server
3. Centralized OAuth management
4. Plugin review and approval process

**For now, the MCP server approach is the best option** as it gives you full control and works immediately.

---

## Support

- **Issues**: Report bugs on [GitHub Issues](https://github.com/YOUR_USERNAME/miro-remote-mcp/issues)
- **Documentation**: See [README.md](README.md) for API details
- **MCP Protocol**: Learn more at [Model Context Protocol](https://modelcontextprotocol.io)

---

## License

MIT License - see [LICENSE](LICENSE) file for details
