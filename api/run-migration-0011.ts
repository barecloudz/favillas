import { Handler } from '@netlify/functions';
import postgres from 'postgres';
import { authenticateToken, isStaff } from './_shared/auth';

let dbConnection: any = null;

function getDB() {
  if (dbConnection) return dbConnection;

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL environment variable is required');
  }

  dbConnection = postgres(databaseUrl, {
    max: 1,
    idle_timeout: 20,
    connect_timeout: 10,
    prepare: false,
    keep_alive: false,
  });

  return dbConnection;
}

export const handler: Handler = async (event, context) => {
  const origin = event.headers.origin || 'http://localhost:3000';
  const headers = {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Credentials': 'true',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  console.log('🔧 RUN MIGRATION 0011 API CALLED');

  // Authenticate - admin only
  const authPayload = await authenticateToken(event);
  if (!authPayload || !isStaff(authPayload)) {
    console.log('❌ Authorization failed - admin access required');
    return {
      statusCode: 403,
      headers,
      body: JSON.stringify({ error: 'Forbidden - Admin access required' })
    };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const sql = getDB();

    console.log('📦 Running migration 0011 - Prevent Duplicate Points Records');

    // Clean up duplicates for user_id
    console.log('🧹 Step 1: Cleaning up duplicates by user_id...');
    const userIdDuplicates = await sql`
      SELECT user_id, array_agg(id ORDER BY created_at ASC, id ASC) as ids
      FROM user_points
      WHERE user_id IS NOT NULL
      GROUP BY user_id
      HAVING COUNT(*) > 1
    `;

    for (const dup of userIdDuplicates) {
      const idsToDelete = dup.ids.slice(1); // Keep first, delete rest
      if (idsToDelete.length > 0) {
        await sql`DELETE FROM user_points WHERE id = ANY(${idsToDelete})`;
        console.log(`✅ Deleted ${idsToDelete.length} duplicates for user_id ${dup.user_id}`);
      }
    }

    // Clean up duplicates for supabase_user_id
    console.log('🧹 Step 2: Cleaning up duplicates by supabase_user_id...');
    const supabaseDuplicates = await sql`
      SELECT supabase_user_id, array_agg(id ORDER BY created_at ASC, id ASC) as ids
      FROM user_points
      WHERE supabase_user_id IS NOT NULL
      GROUP BY supabase_user_id
      HAVING COUNT(*) > 1
    `;

    for (const dup of supabaseDuplicates) {
      const idsToDelete = dup.ids.slice(1); // Keep first, delete rest
      if (idsToDelete.length > 0) {
        await sql`DELETE FROM user_points WHERE id = ANY(${idsToDelete})`;
        console.log(`✅ Deleted ${idsToDelete.length} duplicates for supabase_user_id ${dup.supabase_user_id}`);
      }
    }

    // Drop and recreate unique indexes
    console.log('🔒 Step 3: Creating unique constraints...');
    await sql`DROP INDEX IF EXISTS idx_user_points_user_id`;
    await sql`DROP INDEX IF EXISTS idx_user_points_supabase_user_id`;

    await sql`
      CREATE UNIQUE INDEX idx_user_points_user_id
      ON user_points(user_id)
      WHERE user_id IS NOT NULL
    `;

    await sql`
      CREATE UNIQUE INDEX idx_user_points_supabase_user_id
      ON user_points(supabase_user_id)
      WHERE supabase_user_id IS NOT NULL
    `;

    console.log('✅ Migration 0011 completed successfully');

    // Check for remaining duplicates
    const duplicateCheck = await sql`
      SELECT user_id, supabase_user_id, COUNT(*) as count
      FROM user_points
      GROUP BY user_id, supabase_user_id
      HAVING COUNT(*) > 1
    `;

    const totalDuplicatesRemoved = userIdDuplicates.reduce((sum, d) => sum + d.ids.length - 1, 0) +
                                   supabaseDuplicates.reduce((sum, d) => sum + d.ids.length - 1, 0);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        message: 'Migration 0011 completed successfully!',
        details: 'All duplicate records cleaned up and unique constraints enforced',
        duplicatesRemoved: totalDuplicatesRemoved,
        remainingDuplicates: duplicateCheck.length,
        duplicates: duplicateCheck
      }, null, 2)
    };

  } catch (error: any) {
    console.error('❌ Migration error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Migration failed',
        details: error.message,
        stack: error.stack
      })
    };
  }
};
