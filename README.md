# Miro MCP Server

Model Context Protocol (MCP) server for Miro API with OAuth2 authentication. Enables Claude AI to programmatically create and manipulate Miro boards.

## Features

- **Full OAuth2 Support**: Authorization code flow with automatic token refresh
- **14 MCP Tools** covering all essential Miro operations:
  - Board operations (list, get, create)
  - Item operations (list, get, update, delete)
  - Item creation (sticky notes, shapes, text, frames)
  - Connectors (create, update)
- **Rate Limiting**: Built-in handling of Miro's API rate limits
- **Error Handling**: Comprehensive error reporting and recovery

## Installation

```bash
npm install
npm run build
```

## Configuration

### 1. Set up environment variables

Copy `.env.example` to `.env` and configure:

```bash
cp .env.example .env
```

Edit `.env`:
```
MIRO_CLIENT_ID=your_client_id
MIRO_CLIENT_SECRET=your_client_secret
MIRO_REDIRECT_URI=http://localhost:3000/oauth/callback
```

### 2. Get OAuth2 tokens

The provided tokens have expired. You need to obtain new tokens:

#### Option A: Manual OAuth2 Flow

1. Visit the authorization URL:
```
https://miro.com/oauth/authorize?response_type=code&client_id=YOUR_CLIENT_ID&redirect_uri=http://localhost:3000/oauth/callback
```

2. Authorize the app and copy the `code` from the redirect URL

3. Exchange the code for tokens:
```bash
curl -X POST "https://api.miro.com/v1/oauth/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=authorization_code" \
  -d "code=YOUR_CODE_HERE" \
  -d "client_id=YOUR_CLIENT_ID" \
  -d "client_secret=YOUR_CLIENT_SECRET" \
  -d "redirect_uri=http://localhost:3000/oauth/callback"
```

4. Copy the `access_token` and `refresh_token` to your `.env` file

#### Option B: Use Existing OAuth Helper (TODO)

A simple OAuth callback server will be added to automate this process.

## Usage

### Test API Access

```bash
npm test
```

This will:
- Verify authentication
- List your boards
- Create a test board
- Create items on the test board

### Start MCP Server

```bash
npm run dev    # Development mode with auto-reload
npm start      # Production mode
```

### Configure in Claude Desktop

Add to your Claude Desktop config (`~/Library/Application Support/Claude/claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "miro": {
      "command": "node",
      "args": ["/path/to/miro-mcp/dist/index.js"],
      "env": {
        "MIRO_CLIENT_ID": "YOUR_CLIENT_ID",
        "MIRO_CLIENT_SECRET": "YOUR_CLIENT_SECRET",
        "MIRO_ACCESS_TOKEN": "your_access_token",
        "MIRO_REFRESH_TOKEN": "your_refresh_token"
      }
    }
  }
}
```

## Available Tools

### Board Operations

- `list_boards` - List all accessible boards
- `get_board` - Get board details
- `create_board` - Create a new board

### Item Operations

- `list_items` - List items with optional type filtering
- `get_item` - Get item details
- `update_item` - Update item properties
- `delete_item` - Delete an item

### Item Creation

- `create_sticky_note` - Create sticky notes with custom styling
- `create_shape` - Create shapes (rectangle, circle, etc.)
- `create_text` - Create text items
- `create_frame` - Create frames for grouping

### Connectors

- `create_connector` - Create lines/arrows between items
- `update_connector` - Update connector styling

## Example Usage with Claude

```
Create a Miro board showing 3 agile squads (Alpha, Beta, Gamma).
Each squad has 1 Product Owner, 1 Scrum Master, and 5 developers.
Use frames for each squad, sticky notes for team members, and connectors
to show reporting lines.

Color coding:
- Product Owners: yellow sticky notes
- Scrum Masters: green sticky notes
- Developers: blue sticky notes
```

## Development

### Project Structure

```
miro-mcp/
├── src/
│   ├── index.ts         # MCP server entry point
│   ├── oauth.ts         # OAuth2 manager
│   ├── miro-client.ts   # Miro API client wrapper
│   ├── tools.ts         # MCP tool definitions
│   ├── test-api.ts      # API testing script
│   └── test-mcp.ts      # MCP protocol tests
├── dist/                # Compiled JavaScript
├── package.json
├── tsconfig.json
└── .env                 # Configuration (not in git)
```

### Running Tests

```bash
npm run build          # Build TypeScript
npm test              # Test API access
npm run test:integration  # Test MCP protocol
```

## Troubleshooting

### Token Expired Error

If you see authentication errors:
1. The access token expires after 1 hour
2. The server will automatically refresh using the refresh token
3. If refresh token also expires, you need to re-authenticate

### Rate Limiting

Miro allows 100 requests/minute per user. The client tracks rate limits and will report errors if exceeded.

### Connection Issues

Make sure:
- Environment variables are set correctly
- Tokens are valid and not expired
- Network allows access to api.miro.com

## API Documentation

- [Miro REST API Reference](https://developers.miro.com/docs/rest-api-reference)
- [Miro OAuth Guide](https://developers.miro.com/docs/getting-started-with-oauth)
- [MCP Specification](https://modelcontextprotocol.io/)

## License

MIT
