import { Handler } from '@netlify/functions';
import postgres from 'postgres';

// Database connection
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
  // Set CORS headers
  const headers = {
    'Access-Control-Allow-Origin': event.headers.origin || '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
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

  try {
    const sql = getDB();

    if (event.httpMethod === 'POST') {
      // Calculate prices for choice items based on current selections
      const { choiceItemIds, selectedChoiceItems } = JSON.parse(event.body || '{}');

      if (!Array.isArray(choiceItemIds) || !Array.isArray(selectedChoiceItems)) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({
            message: 'choiceItemIds and selectedChoiceItems must be arrays'
          })
        };
      }

      const prices = {};

      for (const choiceItemId of choiceItemIds) {
        // Check for conditional pricing first
        const conditionalPrice = await sql`
          SELECT price
          FROM choice_item_pricing
          WHERE choice_item_id = ${choiceItemId}
            AND condition_choice_item_id = ANY(${selectedChoiceItems})
          ORDER BY price DESC
          LIMIT 1
        `;

        if (conditionalPrice.length > 0) {
          prices[choiceItemId] = parseFloat(conditionalPrice[0].price);
        } else {
          // Fall back to base price
          const basePrice = await sql`
            SELECT price FROM choice_items WHERE id = ${choiceItemId}
          `;
          prices[choiceItemId] = basePrice.length > 0 ? parseFloat(basePrice[0].price) : 0;
        }
      }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ prices })
      };

    } else if (event.httpMethod === 'GET') {
      // Get all conditional pricing rules
      const pricingRules = await sql`
        SELECT
          cip.*,
          ci1.name as choice_item_name,
          cg1.name as choice_group_name,
          ci2.name as condition_choice_name,
          cg2.name as condition_group_name
        FROM choice_item_pricing cip
        JOIN choice_items ci1 ON cip.choice_item_id = ci1.id
        JOIN choice_groups cg1 ON ci1.choice_group_id = cg1.id
        JOIN choice_items ci2 ON cip.condition_choice_item_id = ci2.id
        JOIN choice_groups cg2 ON ci2.choice_group_id = cg2.id
        ORDER BY cg1.name, ci1.name, cg2.name, ci2.name
      `;

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ pricingRules })
      };

    } else if (event.httpMethod === 'PUT') {
      // Create or update conditional pricing rule
      const { choiceItemId, conditionChoiceItemId, price } = JSON.parse(event.body || '{}');

      if (!choiceItemId || !conditionChoiceItemId || price === undefined) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({
            message: 'choiceItemId, conditionChoiceItemId, and price are required'
          })
        };
      }

      const result = await sql`
        INSERT INTO choice_item_pricing (choice_item_id, condition_choice_item_id, price)
        VALUES (${choiceItemId}, ${conditionChoiceItemId}, ${price})
        ON CONFLICT (choice_item_id, condition_choice_item_id)
        DO UPDATE SET price = ${price}, created_at = NOW()
        RETURNING *
      `;

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(result[0])
      };

    } else if (event.httpMethod === 'DELETE') {
      // Delete conditional pricing rule
      const urlParts = event.path?.split('/') || [];
      const ruleId = urlParts[urlParts.length - 1];

      if (!ruleId || isNaN(parseInt(ruleId))) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ message: 'Invalid pricing rule ID' })
        };
      }

      const result = await sql`
        DELETE FROM choice_item_pricing
        WHERE id = ${parseInt(ruleId)}
        RETURNING *
      `;

      if (result.length === 0) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ message: 'Pricing rule not found' })
        };
      }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ message: 'Pricing rule deleted successfully' })
      };

    } else {
      return {
        statusCode: 405,
        headers,
        body: JSON.stringify({ message: 'Method not allowed' })
      };
    }

  } catch (error: any) {
    console.error('Choice Pricing API error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        message: 'Internal server error',
        error: error.message
      })
    };
  }
};