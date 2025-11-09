#!/usr/bin/env node
/**
 * Create a Spotify-style "Team of Teams" organizational structure on Miro
 *
 * Structure:
 * - Tribes (large frames) - collections of squads working on related areas
 * - Squads (rectangles) - small cross-functional teams (5-9 people)
 * - People (sticky notes) - individual team members
 * - Chapters (connectors) - people with similar skills across squads
 */
import dotenv from 'dotenv';
import { OAuth2Manager } from './oauth.js';
import { MiroClient } from './miro-client.js';

dotenv.config();

async function createSpotifyTeamStructure() {
  console.log('=== Creating Spotify Team of Teams Structure ===\n');

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

  const miro = new MiroClient(oauth);

  // Create board
  console.log('Creating board...');
  const board = await miro.createBoard(
    'Spotify Team of Teams Model - Demo',
    'Example of Tribes, Squads, Chapters structure'
  );
  console.log(`✓ Board created: ${board.viewLink}\n`);

  // Layout parameters
  const tribeWidth = 2000;
  const tribeHeight = 1400;
  const squadWidth = 400;
  const squadHeight = 600;
  const personWidth = 150;
  const personHeight = 100;

  // Tribe 1: Product & Engineering
  console.log('Creating Tribe 1: Product & Engineering...');
  const tribe1 = await miro.createFrame(
    board.id,
    'Product & Engineering Tribe',
    {
      x: -1200,
      y: 0,
      width: tribeWidth,
      height: tribeHeight,
      fillColor: 'light_blue'
    }
  );

  // Squad 1.1: Search Team
  const squad1_1 = await miro.createShape(
    board.id,
    '<p><strong>Search Squad</strong></p><p>Mission: Make everything findable</p>',
    'rectangle',
    {
      x: -1600,
      y: -300,
      width: squadWidth,
      height: squadHeight,
      fillColor: 'blue',
      borderColor: 'dark_blue'
    }
  );

  // People in Search Squad
  const searchPO = await miro.createStickyNote(
    board.id,
    '<p><strong>Product Owner</strong></p><p>Alice Chen</p>',
    { x: -1750, y: -450, color: 'yellow' }
  );

  const searchSM = await miro.createStickyNote(
    board.id,
    '<p><strong>Scrum Master</strong></p><p>Bob Wilson</p>',
    { x: -1750, y: -320, color: 'pink' }
  );

  const searchDev1 = await miro.createStickyNote(
    board.id,
    '<p><strong>Backend Dev</strong></p><p>Carlos Silva</p>',
    { x: -1750, y: -190, color: 'light_green' }
  );

  const searchDev2 = await miro.createStickyNote(
    board.id,
    '<p><strong>Frontend Dev</strong></p><p>Diana Park</p>',
    { x: -1550, y: -190, color: 'light_green' }
  );

  const searchQA = await miro.createStickyNote(
    board.id,
    '<p><strong>QA Engineer</strong></p><p>Eric Kumar</p>',
    { x: -1450, y: -320, color: 'orange' }
  );

  // Squad 1.2: Recommendations Team
  const squad1_2 = await miro.createShape(
    board.id,
    '<p><strong>Recommendations Squad</strong></p><p>Mission: Personalize user experience</p>',
    'rectangle',
    {
      x: -800,
      y: -300,
      width: squadWidth,
      height: squadHeight,
      fillColor: 'blue',
      borderColor: 'dark_blue'
    }
  );

  // People in Recommendations Squad
  const recoPO = await miro.createStickyNote(
    board.id,
    '<p><strong>Product Owner</strong></p><p>Fatima Ahmed</p>',
    { x: -950, y: -450, color: 'yellow' }
  );

  const recoSM = await miro.createStickyNote(
    board.id,
    '<p><strong>Scrum Master</strong></p><p>George Lee</p>',
    { x: -950, y: -320, color: 'pink' }
  );

  const recoDev1 = await miro.createStickyNote(
    board.id,
    '<p><strong>Backend Dev</strong></p><p>Hannah Zhang</p>',
    { x: -950, y: -190, color: 'light_green' }
  );

  const recoML = await miro.createStickyNote(
    board.id,
    '<p><strong>ML Engineer</strong></p><p>Ivan Petrov</p>',
    { x: -750, y: -190, color: 'violet' }
  );

  const recoQA = await miro.createStickyNote(
    board.id,
    '<p><strong>QA Engineer</strong></p><p>Julia Santos</p>',
    { x: -650, y: -320, color: 'orange' }
  );

  // Squad 1.3: Analytics Team
  const squad1_3 = await miro.createShape(
    board.id,
    '<p><strong>Analytics Squad</strong></p><p>Mission: Insights that drive decisions</p>',
    'rectangle',
    {
      x: -1200,
      y: 400,
      width: squadWidth,
      height: squadHeight,
      fillColor: 'blue',
      borderColor: 'dark_blue'
    }
  );

  // People in Analytics Squad
  const analyticsPO = await miro.createStickyNote(
    board.id,
    '<p><strong>Product Owner</strong></p><p>Kevin O\'Brien</p>',
    { x: -1350, y: 250, color: 'yellow' }
  );

  const analyticsData1 = await miro.createStickyNote(
    board.id,
    '<p><strong>Data Engineer</strong></p><p>Laura Garcia</p>',
    { x: -1350, y: 380, color: 'cyan' }
  );

  const analyticsData2 = await miro.createStickyNote(
    board.id,
    '<p><strong>Data Scientist</strong></p><p>Marco Rossi</p>',
    { x: -1150, y: 380, color: 'violet' }
  );

  const analyticsDev = await miro.createStickyNote(
    board.id,
    '<p><strong>Frontend Dev</strong></p><p>Nina Kowalski</p>',
    { x: -1050, y: 510, color: 'light_green' }
  );

  console.log('✓ Tribe 1 complete\n');

  // Tribe 2: Platform & Infrastructure
  console.log('Creating Tribe 2: Platform & Infrastructure...');
  const tribe2 = await miro.createFrame(
    board.id,
    'Platform & Infrastructure Tribe',
    {
      x: 1200,
      y: 0,
      width: tribeWidth,
      height: tribeHeight,
      fillColor: 'light_green'
    }
  );

  // Squad 2.1: Platform Team
  const squad2_1 = await miro.createShape(
    board.id,
    '<p><strong>Platform Squad</strong></p><p>Mission: Rock-solid infrastructure</p>',
    'rectangle',
    {
      x: 800,
      y: -300,
      width: squadWidth,
      height: squadHeight,
      fillColor: 'green',
      borderColor: 'dark_green'
    }
  );

  // People in Platform Squad
  const platformPO = await miro.createStickyNote(
    board.id,
    '<p><strong>Product Owner</strong></p><p>Omar Hassan</p>',
    { x: 650, y: -450, color: 'yellow' }
  );

  const platformDev1 = await miro.createStickyNote(
    board.id,
    '<p><strong>Backend Dev</strong></p><p>Paula Novak</p>',
    { x: 650, y: -320, color: 'light_green' }
  );

  const platformDev2 = await miro.createStickyNote(
    board.id,
    '<p><strong>Backend Dev</strong></p><p>Quinn Taylor</p>',
    { x: 850, y: -320, color: 'light_green' }
  );

  const platformDevOps = await miro.createStickyNote(
    board.id,
    '<p><strong>DevOps Engineer</strong></p><p>Rachel Cohen</p>',
    { x: 750, y: -190, color: 'cyan' }
  );

  // Squad 2.2: Security Team
  const squad2_2 = await miro.createShape(
    board.id,
    '<p><strong>Security Squad</strong></p><p>Mission: Keep everything secure</p>',
    'rectangle',
    {
      x: 1600,
      y: -300,
      width: squadWidth,
      height: squadHeight,
      fillColor: 'green',
      borderColor: 'dark_green'
    }
  );

  // People in Security Squad
  const securityLead = await miro.createStickyNote(
    board.id,
    '<p><strong>Security Lead</strong></p><p>Sam Johnson</p>',
    { x: 1450, y: -450, color: 'red' }
  );

  const securityEng1 = await miro.createStickyNote(
    board.id,
    '<p><strong>Security Engineer</strong></p><p>Tanya Volkov</p>',
    { x: 1450, y: -320, color: 'orange' }
  );

  const securityEng2 = await miro.createStickyNote(
    board.id,
    '<p><strong>Security Engineer</strong></p><p>Umar Patel</p>',
    { x: 1650, y: -320, color: 'orange' }
  );

  console.log('✓ Tribe 2 complete\n');

  // Create Chapter Connectors (people with similar roles across squads)
  console.log('Creating Chapter connections...');

  // Product Owner Chapter
  await miro.createConnector(board.id, searchPO.id, recoPO.id, {
    strokeColor: 'yellow',
    strokeWidth: '3',
    endStrokeCap: 'none',
    caption: 'PO Chapter'
  });

  await miro.createConnector(board.id, recoPO.id, analyticsPO.id, {
    strokeColor: 'yellow',
    strokeWidth: '3',
    endStrokeCap: 'none'
  });

  await miro.createConnector(board.id, analyticsPO.id, platformPO.id, {
    strokeColor: 'yellow',
    strokeWidth: '3',
    endStrokeCap: 'none'
  });

  // Backend Development Chapter
  await miro.createConnector(board.id, searchDev1.id, recoDev1.id, {
    strokeColor: 'green',
    strokeWidth: '3',
    endStrokeCap: 'none',
    caption: 'Backend Chapter'
  });

  await miro.createConnector(board.id, recoDev1.id, platformDev1.id, {
    strokeColor: 'green',
    strokeWidth: '3',
    endStrokeCap: 'none'
  });

  await miro.createConnector(board.id, platformDev1.id, platformDev2.id, {
    strokeColor: 'green',
    strokeWidth: '3',
    endStrokeCap: 'none'
  });

  // QA Chapter
  await miro.createConnector(board.id, searchQA.id, recoQA.id, {
    strokeColor: 'orange',
    strokeWidth: '3',
    endStrokeCap: 'none',
    caption: 'QA Chapter'
  });

  console.log('✓ Chapter connections created\n');

  // Add legend
  console.log('Creating legend...');
  const legendFrame = await miro.createFrame(
    board.id,
    'Legend',
    {
      x: 0,
      y: -1200,
      width: 800,
      height: 400,
      fillColor: 'white'
    }
  );

  await miro.createText(
    board.id,
    '<p><strong>Spotify Model Components:</strong></p>' +
    '<p>🔷 <strong>Tribes</strong> - Large frames grouping related squads</p>' +
    '<p>🔹 <strong>Squads</strong> - Cross-functional teams (5-9 people)</p>' +
    '<p>📝 <strong>People</strong> - Team members with roles</p>' +
    '<p>➡️ <strong>Chapters</strong> - Dotted lines connecting same roles</p>',
    { x: 0, y: -1200, width: 700 }
  );

  console.log('✓ Legend created\n');

  console.log('=== Complete! ===');
  console.log(`\n✓ Created 2 Tribes`);
  console.log(`✓ Created 5 Squads`);
  console.log(`✓ Created 22 team members`);
  console.log(`✓ Created Chapter connections`);
  console.log(`\n🎨 View your board: ${board.viewLink}`);
  console.log(`\nKey aspects of Spotify model:`);
  console.log(`  • Tribes = loosely coupled, tightly aligned groups`);
  console.log(`  • Squads = autonomous, cross-functional teams`);
  console.log(`  • Chapters = knowledge sharing across squads`);
  console.log(`  • No traditional hierarchy - everyone reports to their squad`);
}

createSpotifyTeamStructure().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
