import { Handler } from '@netlify/functions';
import postgres from 'postgres';
import { authenticateToken, isAdmin } from './_shared/auth';

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
  const headers = {
    'Access-Control-Allow-Origin': event.headers.origin || '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Credentials': 'true',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    // Authenticate admin
    const authPayload = await authenticateToken(event);
    if (!authPayload || !isAdmin(authPayload)) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Unauthorized - Admin access required' })
      };
    }

    const sql = getDB();
    const currentYear = new Date().getFullYear();

    // GET - Fetch all advent calendar entries
    if (event.httpMethod === 'GET') {
      const entries = await sql`
        SELECT
          ac.id,
          ac.day,
          ac.reward_id,
          ac.year,
          ac.is_active,
          ac.is_closed,
          r.name as reward_name,
          r.description as reward_description,
          r.points_required,
          r.image_url as reward_image
        FROM advent_calendar ac
        LEFT JOIN rewards r ON r.id = ac.reward_id
        WHERE ac.year = ${currentYear}
        ORDER BY ac.day ASC
      `;

      // Also fetch all available rewards (for dropdown)
      const rewards = await sql`
        SELECT id, name, description, points_required, image_url
        FROM rewards
        WHERE is_active = true
        ORDER BY name ASC
      `;

      // Get claim statistics
      const claimStats = await sql`
        SELECT
          advent_day,
          COUNT(*) as claim_count
        FROM advent_claims
        WHERE year = ${currentYear}
        GROUP BY advent_day
      `;

      const claimCounts = Object.fromEntries(
        claimStats.map((stat: any) => [stat.advent_day, parseInt(stat.claim_count)])
      );

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          entries: entries.map((e: any) => ({
            ...e,
            claimCount: claimCounts[e.day] || 0
          })),
          rewards,
          year: currentYear
        })
      };
    }

    // POST - Create or update advent calendar entry
    if (event.httpMethod === 'POST') {
      const body = JSON.parse(event.body || '{}');
      const { day, rewardId, isActive, isClosed } = body;

      if (!day || day < 1 || day > 25) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Day must be between 1 and 25' })
        };
      }

      // Upsert entry
      const [entry] = await sql`
        INSERT INTO advent_calendar (day, reward_id, year, is_active, is_closed)
        VALUES (${day}, ${rewardId || null}, ${currentYear}, ${isActive !== false}, ${isClosed || false})
        ON CONFLICT (day, year)
        DO UPDATE SET
          reward_id = ${rewardId || null},
          is_active = ${isActive !== false},
          is_closed = ${isClosed || false},
          updated_at = NOW()
        RETURNING *
      `;

      console.log(`✅ Advent calendar day ${day} ${rewardId ? 'assigned reward' : 'cleared'}`);

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          entry
        })
      };
    }

    // DELETE - Remove reward from a day
    if (event.httpMethod === 'DELETE') {
      const body = JSON.parse(event.body || '{}');
      const { day } = body;

      if (!day) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Day is required' })
        };
      }

      await sql`
        UPDATE advent_calendar
        SET reward_id = NULL, is_active = false, updated_at = NOW()
        WHERE day = ${day} AND year = ${currentYear}
      `;

      console.log(`✅ Advent calendar day ${day} cleared`);

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true })
      };
    }

    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };

  } catch (error: any) {
    console.error('❌ Admin advent calendar error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message || 'Internal server error' })
    };
  }
};
