#!/usr/bin/env node
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const token = process.env.MIRO_ACCESS_TOKEN!;
const boardId = process.env.MIRO_TEST_BOARD_ID;

if (!boardId) {
  console.error('❌ Error: MIRO_TEST_BOARD_ID must be set in .env file');
  console.error('   Add a test board ID to your .env file for debug scripts');
  process.exit(1);
}

async function testStickyNote() {
  console.log('Testing sticky note creation...\n');

  const payload = {
    data: {
      content: 'Test Note',
      shape: 'square'
    },
    style: {
      fillColor: 'light_yellow'
    },
    position: {
      x: 0,
      y: 0
    }
  };

  console.log('Payload:', JSON.stringify(payload, null, 2));

  try {
    const response = await axios.post(
      `https://api.miro.com/v2/boards/${boardId}/sticky_notes`,
      payload,
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

async function testShape() {
  console.log('\n\nTesting shape creation...\n');

  const payload = {
    data: {
      content: '<p>Test Shape</p>',
      shape: 'rectangle'
    },
    style: {
      fillColor: '#e6f7ff'  // Light blue in hex
    },
    position: {
      x: 300,
      y: 0
    },
    geometry: {
      width: 300,
      height: 150
    }
  };

  console.log('Payload:', JSON.stringify(payload, null, 2));

  try {
    const response = await axios.post(
      `https://api.miro.com/v2/boards/${boardId}/shapes`,
      payload,
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

testStickyNote().then(() => testShape());
