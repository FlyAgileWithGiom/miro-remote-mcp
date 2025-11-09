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
};

async function testConnector() {
  console.log('=== Testing Simple Connector (No Caption) ===\n');

  // Get two items
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
  const item1 = items[0];
  const item2 = items[1];
  console.log(`Using: ${item1.id} and ${item2.id}\n`);

  // Test 1: Minimal payload with named color
  console.log('Test 1: Minimal - named color');
  try {
    const response = await axios.post(
      `https://api.miro.com/v2/boards/${boardId}/connectors`,
      {
        startItem: { id: item1.id },
        endItem: { id: item2.id },
        style: {
          strokeColor: 'blue',
          strokeWidth: '2',
          endStrokeCap: 'arrow'
        }
      },
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
    console.error('Error:', JSON.stringify(error.response?.data, null, 2));
  }

  // Test 2: Hex color
  console.log('\n\nTest 2: Hex color');
  try {
    const response = await axios.post(
      `https://api.miro.com/v2/boards/${boardId}/connectors`,
      {
        startItem: { id: item1.id },
        endItem: { id: item2.id },
        style: {
          strokeColor: COLOR_MAP['blue'],
          strokeWidth: '2',
          endStrokeCap: 'arrow'
        }
      },
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
    console.error('Error:', JSON.stringify(error.response?.data, null, 2));
  }

  // Test 3: With caption using string percentage
  console.log('\n\nTest 3: With caption - position as "50%"');
  try {
    const response = await axios.post(
      `https://api.miro.com/v2/boards/${boardId}/connectors`,
      {
        startItem: { id: item1.id },
        endItem: { id: item2.id },
        style: {
          strokeColor: COLOR_MAP['blue'],
          strokeWidth: '2',
          endStrokeCap: 'arrow'
        },
        captions: [
          {
            content: 'test caption',
            position: '50%'
          }
        ]
      },
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
    console.error('Error:', JSON.stringify(error.response?.data, null, 2));
  }
}

testConnector().catch(console.error);
