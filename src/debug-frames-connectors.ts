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
  'light_gray': '#e6e6e6',
  'blue': '#2d9bf0',
};

async function testFrame() {
  console.log('=== Testing Frame Creation ===\n');

  // Test 1: Original payload (will fail)
  console.log('Test 1: Original payload (named color)');
  const payload1 = {
    data: {
      title: 'Test Frame 1',
      type: 'frame'
    },
    style: {
      fillColor: 'light_gray'
    },
    position: {
      x: 0,
      y: 0,
      origin: 'center'
    },
    geometry: {
      width: 1000,
      height: 800
    }
  };

  console.log('Payload:', JSON.stringify(payload1, null, 2));
  try {
    const response = await axios.post(
      `https://api.miro.com/v2/boards/${boardId}/frames`,
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

  // Test 2: Without type field
  console.log('\n\nTest 2: Without type field (named color)');
  const payload2 = {
    data: {
      title: 'Test Frame 2'
    },
    style: {
      fillColor: 'light_gray'
    },
    position: {
      x: 300,
      y: 0,
      origin: 'center'
    },
    geometry: {
      width: 1000,
      height: 800
    }
  };

  console.log('Payload:', JSON.stringify(payload2, null, 2));
  try {
    const response = await axios.post(
      `https://api.miro.com/v2/boards/${boardId}/frames`,
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

  // Test 3: With hex color
  console.log('\n\nTest 3: With hex color (no type field)');
  const payload3 = {
    data: {
      title: 'Test Frame 3'
    },
    style: {
      fillColor: COLOR_MAP['light_gray']  // #e6e6e6
    },
    position: {
      x: 600,
      y: 0,
      origin: 'center'
    },
    geometry: {
      width: 1000,
      height: 800
    }
  };

  console.log('Payload:', JSON.stringify(payload3, null, 2));
  try {
    const response = await axios.post(
      `https://api.miro.com/v2/boards/${boardId}/frames`,
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
    return response.data.id; // Return ID for connector test
  } catch (error: any) {
    console.error('✗ Failed');
    console.error('Status:', error.response?.status);
    console.error('Error:', JSON.stringify(error.response?.data, null, 2));
  }
}

async function testConnector(itemId1: string, itemId2: string) {
  console.log('\n\n=== Testing Connector Creation ===\n');

  // Test 1: Original payload (named color)
  console.log('Test 1: Original payload (named color, strokeWidth: "2")');
  const payload1 = {
    startItem: { id: itemId1 },
    endItem: { id: itemId2 },
    style: {
      strokeColor: 'blue',
      strokeWidth: '2',
      endStrokeCap: 'arrow'
    },
    captions: [
      {
        content: 'test connection',
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

  // Test 2: With hex color and strokeWidth: "2.0"
  console.log('\n\nTest 2: Hex color, strokeWidth: "2.0"');
  const payload2 = {
    startItem: { id: itemId1 },
    endItem: { id: itemId2 },
    style: {
      strokeColor: COLOR_MAP['blue'],  // #2d9bf0
      strokeWidth: '2.0',
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
}

async function main() {
  // First create a frame to get an item ID
  const frameId = await testFrame();

  if (frameId) {
    // Get existing items to use for connector test
    console.log('\n\nGetting existing items for connector test...');
    try {
      const response = await axios.get(
        `https://api.miro.com/v2/boards/${boardId}/items?limit=2`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      const items = response.data.data;
      if (items.length >= 2) {
        console.log(`Found items: ${items[0].id} and ${items[1].id}`);
        await testConnector(items[0].id, items[1].id);
      } else {
        console.log('Not enough items on board for connector test');
      }
    } catch (error: any) {
      console.error('Failed to get items:', error.message);
    }
  }
}

main().catch(console.error);
