import { Client } from '@notionhq/client';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const notion = new Client({
  auth: process.env.NOTION_API_KEY,
});

const DATABASE_ID = process.env.NOTION_DATABASE_ID!;

// Test data
const TEST_ITEMS = [
  {
    titre: 'Le Petit Prince',
    auteur: 'Antoine de Saint-Exupéry',
    type: 'Livre',
    etat: 'Très bon',
    tags: ['Roman', 'Classique'],
    annee: 1943,
  },
  {
    titre: 'Abbey Road',
    auteur: 'The Beatles',
    type: 'Vinyle',
    etat: 'Bon',
    tags: ['Rock', 'Classique'],
    annee: 1969,
  },
  {
    titre: 'Kind of Blue',
    auteur: 'Miles Davis',
    type: 'CD',
    etat: 'Neuf',
    tags: ['Jazz'],
    annee: 1959,
  },
];

let createdItemIds: string[] = [];

async function createTestItem(item: typeof TEST_ITEMS[0]): Promise<string> {
  const response = await notion.pages.create({
    parent: { database_id: DATABASE_ID },
    properties: {
      Titre: { title: [{ text: { content: item.titre } }] },
      Auteur_Artiste: { rich_text: [{ text: { content: item.auteur } }] },
      Type: { select: { name: item.type } },
      Etat: { select: { name: item.etat } },
      Status_Dispo: { select: { name: 'Disponible' } },
      Status_Vente: { select: { name: 'A donner' } },
      Tags: { multi_select: item.tags.map(t => ({ name: t })) },
      Annee: { number: item.annee },
      Date_Ajout: { date: { start: new Date().toISOString().split('T')[0] } },
    },
  });
  return response.id;
}

async function deleteTestItem(pageId: string): Promise<void> {
  await notion.pages.update({
    page_id: pageId,
    archived: true,
  });
}

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// =============================================================================
// Test Functions
// =============================================================================

async function testGetAllItems(): Promise<boolean> {
  console.log('\n📋 Test: getAllItems()');
  try {
    // Import the function dynamically
    const { getAllItems } = await import('../lib/notion');
    const items = await getAllItems();
    console.log(`   ✅ Retrieved ${items.length} items`);
    if (items.length > 0) {
      console.log(`   First item: "${items[0].titre}" by ${items[0].auteur_artiste}`);
    }
    return true;
  } catch (error: any) {
    console.log(`   ❌ Failed: ${error.message}`);
    return false;
  }
}

async function testGetItemById(itemId: string): Promise<boolean> {
  console.log('\n📋 Test: getItemById()');
  try {
    const { getItemById } = await import('../lib/notion');
    const item = await getItemById(itemId);
    console.log(`   ✅ Retrieved item: "${item.titre}"`);
    console.log(`   Type: ${item.type}, Status: ${item.status_dispo}`);
    return true;
  } catch (error: any) {
    console.log(`   ❌ Failed: ${error.message}`);
    return false;
  }
}

async function testReserveItem(itemId: string): Promise<boolean> {
  console.log('\n📋 Test: reserveItem()');
  try {
    const { reserveItem, getItemById } = await import('../lib/notion');

    // Reserve the item
    const result = await reserveItem(itemId, 'TestUser');
    console.log(`   ✅ Reserved by: ${result.item.reserve_par}`);
    console.log(`   Status: ${result.item.status_dispo}`);

    // Verify
    const item = await getItemById(itemId);
    if (item.status_dispo !== 'Réservé' || item.reserve_par !== 'TestUser') {
      console.log(`   ❌ Verification failed`);
      return false;
    }
    return true;
  } catch (error: any) {
    console.log(`   ❌ Failed: ${error.message}`);
    return false;
  }
}

async function testConflictDetection(itemId: string): Promise<boolean> {
  console.log('\n📋 Test: Conflict detection (reserve already reserved item)');
  try {
    const { reserveItem } = await import('../lib/notion');

    // Try to reserve an already reserved item
    await reserveItem(itemId, 'AnotherUser');
    console.log(`   ❌ Should have thrown ConflictError`);
    return false;
  } catch (error: any) {
    if (error.name === 'ConflictError') {
      console.log(`   ✅ ConflictError thrown correctly: ${error.message}`);
      return true;
    }
    console.log(`   ❌ Wrong error type: ${error.name}`);
    return false;
  }
}

async function testAddOption(itemId: string): Promise<boolean> {
  console.log('\n📋 Test: addOption()');
  try {
    const { addOption } = await import('../lib/notion');

    // Add options
    const result1 = await addOption(itemId, 'Marie');
    console.log(`   ✅ Marie added at position ${result1.position}`);

    await sleep(400); // Rate limiting

    const result2 = await addOption(itemId, 'Jean');
    console.log(`   ✅ Jean added at position ${result2.position}`);

    if (result2.item.options_par.length !== 2) {
      console.log(`   ❌ Expected 2 options, got ${result2.item.options_par.length}`);
      return false;
    }

    return true;
  } catch (error: any) {
    console.log(`   ❌ Failed: ${error.message}`);
    return false;
  }
}

async function testDuplicateOption(itemId: string): Promise<boolean> {
  console.log('\n📋 Test: Duplicate option prevention');
  try {
    const { addOption } = await import('../lib/notion');

    // Try to add duplicate option
    await addOption(itemId, 'Marie');
    console.log(`   ❌ Should have thrown ConflictError`);
    return false;
  } catch (error: any) {
    if (error.name === 'ConflictError') {
      console.log(`   ✅ ConflictError thrown correctly`);
      return true;
    }
    console.log(`   ❌ Wrong error type: ${error.name}`);
    return false;
  }
}

async function testCancelReservation(itemId: string): Promise<boolean> {
  console.log('\n📋 Test: cancelReservation() with option promotion');
  try {
    const { cancelReservation, getItemById } = await import('../lib/notion');

    const result = await cancelReservation(itemId);
    console.log(`   ✅ Reservation cancelled`);
    console.log(`   Promoted user: ${result.promotedUser}`);

    // Verify Marie was promoted
    const item = await getItemById(itemId);
    if (item.reserve_par !== 'Marie') {
      console.log(`   ❌ Expected Marie to be promoted, got: ${item.reserve_par}`);
      return false;
    }
    console.log(`   ✅ Marie correctly promoted to reservation`);

    // Verify Jean is still in queue
    if (!item.options_par.includes('Jean')) {
      console.log(`   ❌ Jean should still be in options queue`);
      return false;
    }
    console.log(`   ✅ Jean still in options queue`);

    return true;
  } catch (error: any) {
    console.log(`   ❌ Failed: ${error.message}`);
    return false;
  }
}

async function testRemoveOption(itemId: string): Promise<boolean> {
  console.log('\n📋 Test: removeOption()');
  try {
    const { removeOption, getItemById } = await import('../lib/notion');

    const result = await removeOption(itemId, 'Jean');
    console.log(`   ✅ Jean removed from options`);

    const item = await getItemById(itemId);
    if (item.options_par.includes('Jean')) {
      console.log(`   ❌ Jean should have been removed`);
      return false;
    }

    return true;
  } catch (error: any) {
    console.log(`   ❌ Failed: ${error.message}`);
    return false;
  }
}

async function testCancelToAvailable(itemId: string): Promise<boolean> {
  console.log('\n📋 Test: cancelReservation() → Available (no options)');
  try {
    const { cancelReservation, getItemById } = await import('../lib/notion');

    const result = await cancelReservation(itemId);
    console.log(`   ✅ Reservation cancelled`);
    console.log(`   Promoted user: ${result.promotedUser ?? 'none'}`);

    const item = await getItemById(itemId);
    if (item.status_dispo !== 'Disponible') {
      console.log(`   ❌ Expected Disponible, got: ${item.status_dispo}`);
      return false;
    }
    console.log(`   ✅ Item is now Disponible`);

    return true;
  } catch (error: any) {
    console.log(`   ❌ Failed: ${error.message}`);
    return false;
  }
}

async function testGetItemsByUser(): Promise<boolean> {
  console.log('\n📋 Test: getItemsByUser()');
  try {
    const { getItemsByUser } = await import('../lib/notion');

    const items = await getItemsByUser('TestUser');
    console.log(`   ✅ Found ${items.length} items reserved by TestUser`);

    return true;
  } catch (error: any) {
    console.log(`   ❌ Failed: ${error.message}`);
    return false;
  }
}

async function testFilters(): Promise<boolean> {
  console.log('\n📋 Test: Filters (by type)');
  try {
    const { getAllItems } = await import('../lib/notion');

    const livres = await getAllItems({ type: 'Livre' });
    console.log(`   ✅ Found ${livres.length} Livre(s)`);

    await sleep(400);

    const cds = await getAllItems({ type: 'CD' });
    console.log(`   ✅ Found ${cds.length} CD(s)`);

    return true;
  } catch (error: any) {
    console.log(`   ❌ Failed: ${error.message}`);
    return false;
  }
}

async function testQueueUtilities(): Promise<boolean> {
  console.log('\n📋 Test: Queue utilities');
  try {
    const {
      parseOptionsQueue,
      serializeOptionsQueue,
      addToQueue,
      removeFromQueue,
      promoteFirstInQueue
    } = await import('../lib/notion');

    // Test parse
    const parsed = parseOptionsQueue('Marie,Jean,Pierre');
    if (parsed.length !== 3) {
      console.log(`   ❌ Parse failed`);
      return false;
    }
    console.log(`   ✅ parseOptionsQueue: ${JSON.stringify(parsed)}`);

    // Test serialize
    const serialized = serializeOptionsQueue(['A', 'B', 'C']);
    if (serialized !== 'A,B,C') {
      console.log(`   ❌ Serialize failed`);
      return false;
    }
    console.log(`   ✅ serializeOptionsQueue: "${serialized}"`);

    // Test add
    const added = addToQueue(['A', 'B'], 'C');
    if (added.length !== 3 || added[2] !== 'C') {
      console.log(`   ❌ Add failed`);
      return false;
    }
    console.log(`   ✅ addToQueue: ${JSON.stringify(added)}`);

    // Test remove
    const removed = removeFromQueue(['A', 'B', 'C'], 'B');
    if (removed.length !== 2 || removed.includes('B')) {
      console.log(`   ❌ Remove failed`);
      return false;
    }
    console.log(`   ✅ removeFromQueue: ${JSON.stringify(removed)}`);

    // Test promote
    const { promoted, remaining } = promoteFirstInQueue(['A', 'B', 'C']);
    if (promoted !== 'A' || remaining.length !== 2) {
      console.log(`   ❌ Promote failed`);
      return false;
    }
    console.log(`   ✅ promoteFirstInQueue: promoted="${promoted}", remaining=${JSON.stringify(remaining)}`);

    return true;
  } catch (error: any) {
    console.log(`   ❌ Failed: ${error.message}`);
    return false;
  }
}

// =============================================================================
// Main Test Runner
// =============================================================================

async function runTests() {
  console.log('🧪 Starting Integration Tests\n');
  console.log('═'.repeat(60));

  let passed = 0;
  let failed = 0;

  try {
    // Setup: Create test items
    console.log('\n📦 Setup: Creating test items...');
    for (const item of TEST_ITEMS) {
      const id = await createTestItem(item);
      createdItemIds.push(id);
      console.log(`   Created: "${item.titre}" (${id.slice(0, 8)}...)`);
      await sleep(400); // Rate limiting
    }

    const testItemId = createdItemIds[0];

    // Run tests
    const tests = [
      () => testQueueUtilities(),
      () => testGetAllItems(),
      () => testGetItemById(testItemId),
      () => testReserveItem(testItemId),
      () => testConflictDetection(testItemId),
      () => testAddOption(testItemId),
      () => testDuplicateOption(testItemId),
      () => testCancelReservation(testItemId),
      () => testRemoveOption(testItemId),
      () => testCancelToAvailable(testItemId),
      () => testGetItemsByUser(),
      () => testFilters(),
    ];

    for (const test of tests) {
      await sleep(400); // Rate limiting between tests
      const result = await test();
      if (result) passed++;
      else failed++;
    }

  } finally {
    // Cleanup
    console.log('\n🧹 Cleanup: Deleting test items...');
    for (const id of createdItemIds) {
      try {
        await deleteTestItem(id);
        console.log(`   Deleted: ${id.slice(0, 8)}...`);
        await sleep(400);
      } catch (e) {
        console.log(`   Failed to delete: ${id.slice(0, 8)}...`);
      }
    }
  }

  // Summary
  console.log('\n' + '═'.repeat(60));
  console.log(`\n📊 Results: ${passed} passed, ${failed} failed`);

  if (failed === 0) {
    console.log('\n✅ All tests passed! Ready for PR.\n');
  } else {
    console.log('\n❌ Some tests failed. Please fix before PR.\n');
    process.exit(1);
  }
}

runTests().catch(console.error);
