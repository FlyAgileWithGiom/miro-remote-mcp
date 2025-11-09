#!/usr/bin/env node
/**
 * OAuth2 helper script to simplify getting tokens
 */
import http from 'http';
import { URL } from 'url';
import dotenv from 'dotenv';
import { OAuth2Manager } from './oauth.js';

dotenv.config();

const CLIENT_ID = process.env.MIRO_CLIENT_ID;
const CLIENT_SECRET = process.env.MIRO_CLIENT_SECRET;
const REDIRECT_URI = process.env.MIRO_REDIRECT_URI || 'http://localhost:3003/oauth/callback';
const PORT = 3003;

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error('\n❌ Error: Missing required environment variables');
  console.error('   MIRO_CLIENT_ID and MIRO_CLIENT_SECRET must be set in your .env file');
  console.error('   See .env.example for template\n');
  process.exit(1);
}

console.log('=== Miro OAuth2 Token Helper ===\n');

const oauth = new OAuth2Manager(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);

// Create a simple HTTP server to handle the OAuth callback
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url!, `http://localhost:${PORT}`);

  if (url.pathname === '/oauth/callback') {
    const code = url.searchParams.get('code');
    const error = url.searchParams.get('error');

    if (error) {
      res.writeHead(400, { 'Content-Type': 'text/html' });
      res.end(`
        <html>
          <body>
            <h1>Authorization Failed</h1>
            <p>Error: ${error}</p>
            <p>Description: ${url.searchParams.get('error_description')}</p>
          </body>
        </html>
      `);
      return;
    }

    if (!code) {
      res.writeHead(400, { 'Content-Type': 'text/html' });
      res.end(`
        <html>
          <body>
            <h1>Missing Authorization Code</h1>
            <p>No code parameter received</p>
          </body>
        </html>
      `);
      return;
    }

    try {
      console.log('\n✓ Authorization code received');
      console.log('  Exchanging code for tokens...');

      const tokens = await oauth.exchangeCodeForToken(code);

      console.log('\n✓ Success! Tokens obtained:');
      console.log('  Access Token:', tokens.access_token.substring(0, 20) + '...');
      console.log('  Refresh Token:', tokens.refresh_token.substring(0, 20) + '...');
      console.log('  Expires in:', tokens.expires_in, 'seconds');
      console.log('\nTokens have been saved to tokens.json');
      console.log('\nAdd these to your .env file:');
      console.log(`MIRO_ACCESS_TOKEN=${tokens.access_token}`);
      console.log(`MIRO_REFRESH_TOKEN=${tokens.refresh_token}`);

      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(`
        <html>
          <body>
            <h1>✓ Authorization Successful!</h1>
            <p>Tokens have been saved to <code>tokens.json</code></p>
            <p>You can close this window and return to the terminal.</p>
            <h2>Next Steps:</h2>
            <ol>
              <li>Copy the tokens from tokens.json to your .env file</li>
              <li>Test the connection with: <code>npm test</code></li>
              <li>Start using the MCP server!</li>
            </ol>
          </body>
        </html>
      `);

      // Close server after successful auth
      setTimeout(() => {
        console.log('\nServer shutting down...');
        server.close();
      }, 1000);
    } catch (error: any) {
      console.error('\n✗ Failed to exchange code for tokens:', error.message);

      res.writeHead(500, { 'Content-Type': 'text/html' });
      res.end(`
        <html>
          <body>
            <h1>Token Exchange Failed</h1>
            <p>${error.message}</p>
          </body>
        </html>
      `);
    }
  } else {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not Found');
  }
});

server.listen(PORT, () => {
  console.log(`OAuth callback server running on http://localhost:${PORT}`);
  console.log('\nStep 1: Open this URL in your browser:\n');

  const authUrl = oauth.getAuthorizationUrl();
  console.log(authUrl);

  console.log('\nStep 2: Authorize the app');
  console.log('Step 3: You will be redirected back and tokens will be saved automatically\n');
  console.log('Waiting for authorization...');
});

// Handle server errors
server.on('error', (error: any) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`\n✗ Error: Port ${PORT} is already in use`);
    console.error('  Please stop any other service using this port and try again');
  } else {
    console.error('\n✗ Server error:', error);
  }
  process.exit(1);
});
