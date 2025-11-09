#!/usr/bin/env node
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const token = process.env.MIRO_ACCESS_TOKEN!;
const boardId = process.env.MIRO_TEST_BOARD_ID;

if (!boardId) {
  console.error('❌ Error: MIRO_TEST_BOARD_ID must be set in .env file');
  process.exit(1);
}

const COLOR_MAP: Record<string, string> = {
  'blue': '#2d9bf0',
  'red': '#ff6a68',
};

async function testConnector() {
  console.log('=== Testing Connector Creation ===\n');

  // First, get two items from the board
  console.log('Getting items from board...');
  const itemsResponse = await axios.get(
    `https://api.miro.com/v2/boards/${boardId}/items?limit=10`,
    {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    }
  );

  const items = itemsResponse.data.data;
  console.log(`Found ${items.length} items`);

  if (items.length < 2) {
    console.error('Need at least 2 items on the board');
    return;
  }

  const item1 = items[0];
  const item2 = items[1];
  console.log(`Using: ${item1.id} (${item1.type}) and ${item2.id} (${item2.type})\n`);

  // Test 1: Named color
  console.log('Test 1: Named color "blue"');
  const payload1 = {
    startItem: { id: item1.id },
    endItem: { id: item2.id },
    style: {
      strokeColor: 'blue',
      strokeWidth: '2',
      endStrokeCap: 'arrow'
    },
    captions: [
      {
        content: 'test connection 1',
        position: 0.5
      }
    ]
  };

  console.log('Payload:', JSON.stringify(payload1, null, 2));
  try {
    const response = await axios.post(
      `https://api.miro.com/v2/boards/${boardId}/connectors`,
      payload1,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );
    console.log('✓ Success!');
    console.log('Response:', JSON.stringify(response.data, null, 2));
  } catch (error: any) {
    console.error('✗ Failed');
    console.error('Status:', error.response?.status);
    console.error('Error:', JSON.stringify(error.response?.data, null, 2));
  }

  // Test 2: Hex color
  console.log('\n\nTest 2: Hex color "#2d9bf0"');
  const payload2 = {
    startItem: { id: item1.id },
    endItem: { id: item2.id },
    style: {
      strokeColor: COLOR_MAP['blue'],
      strokeWidth: '2',
      endStrokeCap: 'arrow'
    },
    captions: [
      {
        content: 'test connection 2',
        position: 0.5
      }
    ]
  };

  console.log('Payload:', JSON.stringify(payload2, null, 2));
  try {
    const response = await axios.post(
      `https://api.miro.com/v2/boards/${boardId}/connectors`,
      payload2,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );
    console.log('✓ Success!');
    console.log('Response:', JSON.stringify(response.data, null, 2));
  } catch (error: any) {
    console.error('✗ Failed');
    console.error('Status:', error.response?.status);
    console.error('Error:', JSON.stringify(error.response?.data, null, 2));
  }

  // Test 3: Hex color with strokeWidth "2.0"
  console.log('\n\nTest 3: Hex color with strokeWidth "2.0"');
  const payload3 = {
    startItem: { id: item1.id },
    endItem: { id: item2.id },
    style: {
      strokeColor: COLOR_MAP['red'],
      strokeWidth: '2.0',
      endStrokeCap: 'filled_arrow'
    },
    captions: [
      {
        content: 'test connection 3',
        position: 0.5
      }
    ]
  };

  console.log('Payload:', JSON.stringify(payload3, null, 2));
  try {
    const response = await axios.post(
      `https://api.miro.com/v2/boards/${boardId}/connectors`,
      payload3,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );
    console.log('✓ Success!');
    console.log('Response:', JSON.stringify(response.data, null, 2));
  } catch (error: any) {
    console.error('✗ Failed');
    console.error('Status:', error.response?.status);
    console.error('Error:', JSON.stringify(error.response?.data, null, 2));
  }
}

testConnector().catch(console.error);
