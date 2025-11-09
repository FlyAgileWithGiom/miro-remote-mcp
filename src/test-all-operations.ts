#!/usr/bin/env node
/**
 * Comprehensive test of all Miro MCP operations
 */
import dotenv from 'dotenv';
import { OAuth2Manager } from './oauth.js';
import { MiroClient } from './miro-client.js';

dotenv.config();

async function testAllOperations() {
  console.log('=== Comprehensive Miro MCP Test ===\n');

  const oauth = new OAuth2Manager(
    process.env.MIRO_CLIENT_ID!,
    process.env.MIRO_CLIENT_SECRET!,
    process.env.MIRO_REDIRECT_URI || 'http://localhost:3003/oauth/callback'
  );

  if (process.env.MIRO_ACCESS_TOKEN && process.env.MIRO_REFRESH_TOKEN) {
    await oauth.setTokens(
      process.env.MIRO_ACCESS_TOKEN,
      process.env.MIRO_REFRESH_TOKEN
    );
  }

  const miroClient = new MiroClient(oauth);

  // Create a test board
  console.log('Step 1: Creating test board');
  const testBoard = await miroClient.createBoard(
    'Complete MCP Test - ' + new Date().toISOString(),
    'Testing all MCP operations'
  );
  console.log(`✓ Created board: ${testBoard.id}\n`);

  let stickyNoteId: string;
  let shapeId: string;
  let textId: string;
  let frameId: string;

  // Test: Create sticky note
  console.log('Step 2: Creating sticky note');
  const stickyNote = await miroClient.createStickyNote(
    testBoard.id,
    '<p><strong>Product Owner</strong></p><p>Alice Smith</p>',
    { x: -300, y: 0, color: 'yellow' }
  );
  stickyNoteId = stickyNote.id;
  console.log(`✓ Created sticky note: ${stickyNoteId}\n`);

  // Test: Create shape
  console.log('Step 3: Creating shape');
  const shape = await miroClient.createShape(
    testBoard.id,
    '<p><strong>Squad Alpha</strong></p>',
    'rectangle',
    { x: 0, y: 0, fillColor: 'light_blue', width: 400, height: 200 }
  );
  shapeId = shape.id;
  console.log(`✓ Created shape: ${shapeId}\n`);

  // Test: Create text
  console.log('Step 4: Creating text item');
  try {
    const text = await miroClient.createText(
      testBoard.id,
      '<p><strong>Team Structure</strong></p>',
      { x: 0, y: -300, width: 300 }
    );
    textId = text.id;
    console.log(`✓ Created text: ${textId}\n`);
  } catch (error: any) {
    console.error(`✗ Failed to create text: ${error.message}\n`);
  }

  // Test: Create frame
  console.log('Step 5: Creating frame');
  try {
    const frame = await miroClient.createFrame(
      testBoard.id,
      'Engineering Team',
      { x: 0, y: 0, width: 1200, height: 800, fillColor: 'light_gray' }
    );
    frameId = frame.id;
    console.log(`✓ Created frame: ${frameId}\n`);
  } catch (error: any) {
    console.error(`✗ Failed to create frame: ${error.message}\n`);
  }

  // Test: Get item
  console.log('Step 6: Getting item details');
  try {
    const item = await miroClient.getItem(testBoard.id, stickyNoteId);
    console.log(`✓ Retrieved item: ${item.type} at position (${item.position?.x}, ${item.position?.y})\n`);
  } catch (error: any) {
    console.error(`✗ Failed to get item: ${error.message}\n`);
  }

  // Test: Update item (move it)
  console.log('Step 7: Updating item position (moving sticky note)');
  try {
    const updatedItem = await miroClient.updateItem(
      testBoard.id,
      stickyNoteId,
      {
        position: { x: -300, y: 200 }
      }
    );
    console.log(`✓ Moved sticky note to (${updatedItem.position?.x}, ${updatedItem.position?.y})\n`);
  } catch (error: any) {
    console.error(`✗ Failed to update item: ${error.message}\n`);
  }

  // Test: Update item content
  console.log('Step 8: Updating item content');
  try {
    const updatedContent = await miroClient.updateItem(
      testBoard.id,
      stickyNoteId,
      {
        data: {
          content: '<p><strong>Scrum Master</strong></p><p>Bob Johnson</p>'
        }
      }
    );
    console.log(`✓ Updated sticky note content\n`);
  } catch (error: any) {
    console.error(`✗ Failed to update content: ${error.message}\n`);
  }

  // Test: Create connector
  console.log('Step 9: Creating connector between items');
  try {
    const connector = await miroClient.createConnector(
      testBoard.id,
      stickyNoteId,
      shapeId,
      {
        strokeColor: 'blue',
        strokeWidth: '2.0',
        endStrokeCap: 'arrow',
        caption: 'member of'
      }
    );
    console.log(`✓ Created connector: ${connector.id}\n`);

    // Test: Update connector
    console.log('Step 10: Updating connector style');
    const updatedConnector = await miroClient.updateConnector(
      testBoard.id,
      connector.id,
      {
        strokeColor: 'red',
        strokeWidth: '3.0'
      }
    );
    console.log(`✓ Updated connector style\n`);
  } catch (error: any) {
    console.error(`✗ Failed connector operations: ${error.message}\n`);
  }

  // Test: List all items
  console.log('Step 11: Listing all items on board');
  try {
    const allItems = await miroClient.listItems(testBoard.id);
    console.log(`✓ Found ${allItems.length} items on board:`);
    allItems.forEach((item, i) => {
      console.log(`  ${i + 1}. ${item.type} (ID: ${item.id})`);
    });
    console.log('');
  } catch (error: any) {
    console.error(`✗ Failed to list items: ${error.message}\n`);
  }

  // Test: List items by type
  console.log('Step 12: Listing sticky notes only');
  try {
    const stickyNotes = await miroClient.listItems(testBoard.id, 'sticky_note');
    console.log(`✓ Found ${stickyNotes.length} sticky notes\n`);
  } catch (error: any) {
    console.error(`✗ Failed to filter items: ${error.message}\n`);
  }

  // Test: Delete item
  console.log('Step 13: Deleting an item');
  try {
    // Create a temporary item to delete
    const tempShape = await miroClient.createShape(
      testBoard.id,
      '<p>Temporary</p>',
      'circle',
      { x: 500, y: 500, fillColor: 'red' }
    );
    console.log(`  Created temporary item: ${tempShape.id}`);

    await miroClient.deleteItem(testBoard.id, tempShape.id);
    console.log(`✓ Deleted item successfully\n`);

    // Verify it's deleted
    const itemsAfter = await miroClient.listItems(testBoard.id);
    const stillExists = itemsAfter.find(item => item.id === tempShape.id);
    if (stillExists) {
      console.error(`✗ Item still exists after deletion!\n`);
    } else {
      console.log(`✓ Verified item was deleted\n`);
    }
  } catch (error: any) {
    console.error(`✗ Failed to delete item: ${error.message}\n`);
  }

  console.log('=== Test Summary ===');
  console.log(`✓ Board created: ${testBoard.viewLink}`);
  console.log(`✓ All operations tested`);
  console.log(`\nOpen the board in Miro to see the results!`);
}

testAllOperations().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
