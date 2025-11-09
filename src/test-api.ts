#!/usr/bin/env node
/**
 * Test script to verify Miro API access with current tokens
 */
import dotenv from 'dotenv';
import { OAuth2Manager } from './oauth.js';
import { MiroClient } from './miro-client.js';

dotenv.config();

async function testAPI() {
  console.log('=== Miro API Test ===\n');

  // Initialize OAuth manager
  const oauth = new OAuth2Manager(
    process.env.MIRO_CLIENT_ID!,
    process.env.MIRO_CLIENT_SECRET!,
    process.env.MIRO_REDIRECT_URI || 'http://localhost:3000/oauth/callback'
  );

  // Set tokens from environment
  if (process.env.MIRO_ACCESS_TOKEN && process.env.MIRO_REFRESH_TOKEN) {
    await oauth.setTokens(
      process.env.MIRO_ACCESS_TOKEN,
      process.env.MIRO_REFRESH_TOKEN
    );
    console.log('✓ Tokens loaded from environment\n');
  } else {
    console.error('✗ Missing tokens in environment variables');
    process.exit(1);
  }

  const miroClient = new MiroClient(oauth);

  // Test 1: Verify authentication
  console.log('Test 1: Verify authentication');
  try {
    const isValid = await miroClient.verifyAuth();
    if (isValid) {
      console.log('✓ Success: Authentication valid');
    } else {
      throw new Error('Authentication failed');
    }
  } catch (error: any) {
    console.error('✗ Failed:', error.message);
    console.error('  Trying to refresh token...');
    try {
      await oauth.refreshAccessToken();
      console.log('  ✓ Token refreshed successfully');
      const isValid = await miroClient.verifyAuth();
      if (isValid) {
        console.log('✓ Success: Authentication valid after refresh');
      }
    } catch (refreshError: any) {
      console.error('✗ Token refresh failed:', refreshError.message);
      if (refreshError.response?.data) {
        console.error('  Response:', JSON.stringify(refreshError.response.data, null, 2));
      }
      process.exit(1);
    }
  }
  console.log('');

  // Test 2: List boards
  console.log('Test 2: List accessible boards');
  try {
    const boards = await miroClient.listBoards();
    console.log(`✓ Success: Found ${boards.length} boards`);
    if (boards.length > 0) {
      boards.slice(0, 3).forEach((board, i) => {
        console.log(`  ${i + 1}. ${board.name} (ID: ${board.id})`);
      });
    }
  } catch (error: any) {
    console.error('✗ Failed:', error.message);
  }
  console.log('');

  // Test 3: Create a test board
  console.log('Test 3: Create a test board');
  try {
    const testBoard = await miroClient.createBoard(
      'MCP Test Board - ' + new Date().toISOString(),
      'Testing Miro MCP Server API access'
    );
    console.log(`✓ Success: Created board "${testBoard.name}"`);
    console.log(`  Board ID: ${testBoard.id}`);
    console.log(`  View link: ${testBoard.viewLink}`);

    // Test 4: Create a sticky note on the test board
    console.log('\nTest 4: Create a sticky note');
    try {
      const stickyNote = await miroClient.createStickyNote(
        testBoard.id,
        '<p><strong>Test Note</strong></p><p>Created by MCP Server</p>',
        {
          x: 0,
          y: 0,
          color: 'light_yellow',
        }
      );
      console.log(`✓ Success: Created sticky note (ID: ${stickyNote.id})`);
    } catch (error: any) {
      console.error('✗ Failed:', error.message);
    }

    // Test 5: Create a shape
    console.log('\nTest 5: Create a shape');
    try {
      const shape = await miroClient.createShape(
        testBoard.id,
        '<p><strong>Test Shape</strong></p>',
        'rectangle',
        {
          x: 300,
          y: 0,
          fillColor: 'light_blue',
        }
      );
      console.log(`✓ Success: Created shape (ID: ${shape.id})`);
    } catch (error: any) {
      console.error('✗ Failed:', error.message);
    }

    // Test 6: List items on the board
    console.log('\nTest 6: List items on test board');
    try {
      const items = await miroClient.listItems(testBoard.id);
      console.log(`✓ Success: Found ${items.length} items on the board`);
      items.forEach((item, i) => {
        console.log(`  ${i + 1}. ${item.type} (ID: ${item.id})`);
      });
    } catch (error: any) {
      console.error('✗ Failed:', error.message);
    }
  } catch (error: any) {
    console.error('✗ Failed:', error.message);
  }

  console.log('\n=== Tests Complete ===');
}

testAPI().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
