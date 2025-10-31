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
  const headers = {
    'Access-Control-Allow-Origin': event.headers.origin || '*',
    'Access-Control-Allow-Methods': 'POST, PATCH, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Credentials': 'true',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  // Authenticate user
  const authPayload = await authenticateToken(event);

  if (!authPayload) {
    return {
      statusCode: 401,
      headers,
      body: JSON.stringify({ error: 'Unauthorized' })
    };
  }

  // Check if user is staff
  if (!isStaff(authPayload)) {
    return {
      statusCode: 403,
      headers,
      body: JSON.stringify({ error: 'Forbidden - Admin access required' })
    };
  }

  try {
    const sql = getDB();

    if (event.httpMethod === 'POST' || event.httpMethod === 'PATCH') {
      const body = JSON.parse(event.body || '{}');
      const { choiceItemId, choiceItemIds, isTemporarilyUnavailable, reason } = body;

      // Handle bulk update
      if (choiceItemIds && Array.isArray(choiceItemIds)) {
        console.log(`📦 Bulk Size Availability: ${isTemporarilyUnavailable ? 'Disabling' : 'Enabling'} ${choiceItemIds.length} sizes`);

        const results = await sql`
          UPDATE choice_items
          SET
            is_temporarily_unavailable = ${isTemporarilyUnavailable || false},
            unavailability_reason = ${reason || null},
            unavailable_since = ${isTemporarilyUnavailable ? sql`NOW()` : null}
          WHERE id = ANY(${choiceItemIds})
          RETURNING *
        `;

        console.log(`✅ Updated ${results.length} choice items`);

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            success: true,
            count: results.length,
            choiceItems: results.map((r: any) => ({
              id: r.id,
              name: r.name,
              choiceGroupId: r.choice_group_id,
              isTemporarilyUnavailable: r.is_temporarily_unavailable,
              unavailabilityReason: r.unavailability_reason,
              unavailableSince: r.unavailable_since
            }))
          })
        };
      }

      // Handle single update
      if (!choiceItemId) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'choiceItemId or choiceItemIds is required' })
        };
      }

      console.log(`📦 Size Availability: ${isTemporarilyUnavailable ? 'Disabling' : 'Enabling'} choice item ${choiceItemId}`);

      const result = await sql`
        UPDATE choice_items
        SET
          is_temporarily_unavailable = ${isTemporarilyUnavailable || false},
          unavailability_reason = ${reason || null},
          unavailable_since = ${isTemporarilyUnavailable ? sql`NOW()` : null}
        WHERE id = ${choiceItemId}
        RETURNING *
      `;

      if (result.length === 0) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ error: 'Choice item not found' })
        };
      }

      console.log(`✅ Choice item ${result[0].name} availability updated`);

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          choiceItem: {
            id: result[0].id,
            name: result[0].name,
            choiceGroupId: result[0].choice_group_id,
            isTemporarilyUnavailable: result[0].is_temporarily_unavailable,
            unavailabilityReason: result[0].unavailability_reason,
            unavailableSince: result[0].unavailable_since
          }
        })
      };
    }

    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };

  } catch (error: any) {
    console.error('❌ Choice item availability error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message || 'Internal server error' })
    };
  }
};
