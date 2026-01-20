import { Client } from '@notionhq/client';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const notion = new Client({
  auth: process.env.NOTION_API_KEY,
});

const DATABASE_ID = process.env.NOTION_DATABASE_ID!;

async function testConnection() {
  console.log('🔍 Testing Notion connection...\n');

  try {
    // Test 1: Retrieve database info
    console.log('1. Retrieving database info...');
    const database = await notion.databases.retrieve({
      database_id: DATABASE_ID,
    });
    console.log(`   ✅ Database found: "${(database as any).title?.[0]?.plain_text || 'Untitled'}"`);

    // Test 2: List properties
    console.log('\n2. Database properties:');
    const properties = (database as any).properties;
    for (const [name, prop] of Object.entries(properties)) {
      console.log(`   - ${name}: ${(prop as any).type}`);
    }

    // Test 3: Query items
    console.log('\n3. Querying items...');
    const response = await notion.databases.query({
      database_id: DATABASE_ID,
      page_size: 10,
    });
    console.log(`   ✅ Found ${response.results.length} items`);

    if (response.results.length > 0) {
      console.log('\n4. Sample items:');
      for (const page of response.results.slice(0, 3)) {
        const props = (page as any).properties;
        const titre = props.Titre?.title?.[0]?.plain_text || 'Sans titre';
        const type = props.Type?.select?.name || 'N/A';
        const status = props.Status_Dispo?.status?.name || 'N/A';
        console.log(`   - "${titre}" (${type}) - ${status}`);
      }
    }

    console.log('\n✅ Connection test successful!');
    return true;
  } catch (error: any) {
    console.error('\n❌ Connection test failed:');
    console.error(`   ${error.message}`);
    if (error.code === 'unauthorized') {
      console.error('   → Check your NOTION_API_KEY');
    } else if (error.code === 'object_not_found') {
      console.error('   → Check your NOTION_DATABASE_ID');
      console.error('   → Make sure the integration has access to the database');
    }
    return false;
  }
}

testConnection();
