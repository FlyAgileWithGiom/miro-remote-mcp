# Miro MCP Server - Complete Setup Guide

## Overview

This guide will help you set up the Miro MCP Server from scratch and get it working with Claude Desktop.

## Prerequisites

- Node.js 18+ installed
- A Miro account
- Claude Desktop app installed

## Step 1: Install Dependencies

```bash
npm install
npm run build
```

## Step 2: Get OAuth2 Tokens

The tokens provided in the initial setup have expired. You need to obtain new tokens.

### Automated Method (Recommended)

Run the OAuth helper script:

```bash
npm run oauth
```

This will:
1. Start a local server on port 3000
2. Print an authorization URL
3. Open the URL in your browser and authorize the app
4. Automatically save the tokens to `tokens.json`
5. Display the tokens to copy to your `.env` file

### Manual Method

If the automated method doesn't work:

1. **Get Authorization Code**

   Visit this URL in your browser:
   ```
   https://miro.com/oauth/authorize?response_type=code&client_id=YOUR_CLIENT_ID&redirect_uri=http://localhost:3000/oauth/callback
   ```

2. **Authorize the App**

   - Click "Allow" to authorize
   - You'll be redirected to `http://localhost:3000/oauth/callback?code=...`
   - Copy the `code` parameter from the URL

3. **Exchange Code for Tokens**

   ```bash
   curl -X POST "https://api.miro.com/v1/oauth/token" \
     -H "Content-Type: application/x-www-form-urlencoded" \
     -d "grant_type=authorization_code" \
     -d "code=YOUR_CODE_HERE" \
     -d "client_id=YOUR_CLIENT_ID" \
     -d "client_secret=YOUR_CLIENT_SECRET" \
     -d "redirect_uri=http://localhost:3000/oauth/callback"
   ```

4. **Save Tokens**

   Copy the `access_token` and `refresh_token` from the response to your `.env` file

## Step 3: Configure Environment

Edit `.env` file:

```env
MIRO_CLIENT_ID=YOUR_CLIENT_ID
MIRO_CLIENT_SECRET=YOUR_CLIENT_SECRET
MIRO_ACCESS_TOKEN=your_access_token_here
MIRO_REFRESH_TOKEN=your_refresh_token_here
MIRO_REDIRECT_URI=http://localhost:3000/oauth/callback
```

## Step 4: Test the Connection

```bash
npm test
```

This should:
- ✓ Verify authentication
- ✓ List your boards
- ✓ Create a test board
- ✓ Create test items

If authentication fails, the server will automatically try to refresh the token.

## Step 5: Test MCP Protocol

```bash
npm run test:integration
```

This verifies the MCP server implements the protocol correctly.

## Step 6: Configure Claude Desktop

### macOS

Edit `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "miro": {
      "command": "node",
      "args": ["/Users/YOUR_USERNAME/path/to/miro-mcp/dist/index.js"],
      "env": {
        "MIRO_CLIENT_ID": "YOUR_CLIENT_ID",
        "MIRO_CLIENT_SECRET": "YOUR_CLIENT_SECRET",
        "MIRO_ACCESS_TOKEN": "your_access_token_here",
        "MIRO_REFRESH_TOKEN": "your_refresh_token_here"
      }
    }
  }
}
```

### Windows

Edit `%APPDATA%\Claude\claude_desktop_config.json`

### Linux

Edit `~/.config/Claude/claude_desktop_config.json`

**Important**: Replace `/Users/YOUR_USERNAME/path/to/miro-mcp/` with the actual absolute path to your miro-mcp directory.

## Step 7: Restart Claude Desktop

1. Completely quit Claude Desktop
2. Start it again
3. The Miro MCP server should now be available

## Step 8: Test in Claude

Try this prompt in Claude Desktop:

```
List my Miro boards
```

Or create something:

```
Create a Miro board called "Team Organization" and add:
- A frame titled "Engineering Team"
- 3 sticky notes inside representing team members
- Connect them with arrows
```

## Troubleshooting

### Token Expired

**Symptom**: Error 401 "Unauthorized"

**Solution**: The access token expires every hour, but the server automatically refreshes it using the refresh token. If both tokens are expired, run `npm run oauth` again.

### Port Already in Use

**Symptom**: OAuth helper fails with "Port 3000 is already in use"

**Solution**:
1. Stop any service using port 3000
2. Or edit `.env` and change `MIRO_REDIRECT_URI` to use a different port

### Server Not Found in Claude

**Symptom**: Claude doesn't show Miro tools

**Solution**:
1. Check the path in `claude_desktop_config.json` is absolute and correct
2. Make sure you ran `npm run build`
3. Check Claude Desktop logs for errors
4. Restart Claude Desktop completely

### Rate Limiting

**Symptom**: Error 429 "Too Many Requests"

**Solution**: Miro allows 100 requests/minute. Wait a minute and try again.

### Authentication Fails in Tests

**Symptom**: Test shows "tokenNotProvided" or 401 errors

**Solution**:
1. Make sure tokens are in `.env` file
2. Run `npm run oauth` to get fresh tokens
3. Check that `.env` file is in the project root

## Next Steps

Once everything is working:

1. **Explore the API**: Try different tools (see README.md for full list)
2. **Build Visualizations**: Create agile squad diagrams
3. **Automate Workflows**: Use Claude to generate board structures

## Getting Help

- Check [Miro API Docs](https://developers.miro.com/docs/rest-api-reference)
- Check [MCP Specification](https://modelcontextprotocol.io/)
- Review server logs in terminal when running manually

## Security Notes

- Never commit `.env` file or `tokens.json` to git
- Tokens give full access to your Miro account
- Refresh tokens don't expire but can be revoked in Miro settings
- Keep `MIRO_CLIENT_SECRET` secure
