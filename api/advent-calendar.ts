import { Handler } from '@netlify/functions';
import postgres from 'postgres';
import { authenticateToken, getUserIdentifiers, isAdmin } from './_shared/auth';

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
    'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Credentials': 'true',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    const sql = getDB();

    // Get current time in EST
    const now = new Date();
    const estOffset = -5; // EST is UTC-5 (note: this doesn't account for DST)
    const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
    const estTime = new Date(utc + (3600000 * estOffset));

    const currentYear = estTime.getFullYear();
    const currentMonth = estTime.getMonth() + 1; // 1-12
    const currentDay = estTime.getDate(); // 1-31

    // GET - Fetch advent calendar status (public)
    if (event.httpMethod === 'GET') {
      // Check if advent calendar is enabled
      const [animationSettings] = await sql`
        SELECT is_enabled, settings
        FROM animations_settings
        WHERE animation_key = 'advent_calendar'
        LIMIT 1
      `;

      if (!animationSettings || !animationSettings.is_enabled) {
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            enabled: false,
            daysUntilChristmas: null,
            calendar: []
          })
        };
      }

      // Calculate days until Christmas
      const christmas = new Date(currentYear, 11, 25); // December 25
      const today = new Date(currentYear, currentMonth - 1, currentDay);
      const daysUntilChristmas = Math.ceil((christmas.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

      // Fetch all advent calendar entries for current year
      const calendarEntries = await sql`
        SELECT
          ac.id,
          ac.day,
          ac.reward_id,
          ac.is_active,
          ac.is_closed,
          r.name as reward_name,
          r.description as reward_description,
          r.image_url as reward_image
        FROM advent_calendar ac
        LEFT JOIN rewards r ON r.id = ac.reward_id
        WHERE ac.year = ${currentYear}
          AND ac.is_active = true
        ORDER BY ac.day ASC
      `;

      // Check user's claims if authenticated
      let userClaims = [];
      const authPayload = await authenticateToken(event);

      if (authPayload) {
        const { userId, supabaseUserId } = getUserIdentifiers(authPayload);

        if (userId) {
          userClaims = await sql`
            SELECT advent_day, claimed_at
            FROM advent_claims
            WHERE user_id = ${userId} AND year = ${currentYear}
          `;
        } else if (supabaseUserId) {
          userClaims = await sql`
            SELECT advent_day, claimed_at
            FROM advent_claims
            WHERE supabase_user_id = ${supabaseUserId} AND year = ${currentYear}
          `;
        }
      }

      const claimedDays = new Set(userClaims.map((c: any) => c.advent_day));

      // Format calendar data
      const calendar = calendarEntries.map((entry: any) => {
        const isCurrentDay = currentMonth === 12 && currentDay === entry.day;
        const isPastDay = currentMonth === 12 && currentDay > entry.day;
        const isFutureDay = currentMonth < 12 || (currentMonth === 12 && currentDay < entry.day);
        const isClaimed = claimedDays.has(entry.day);
        const isClosed = entry.is_closed || false;

        return {
          day: entry.day,
          rewardId: entry.reward_id,
          rewardName: entry.reward_name,
          rewardDescription: entry.reward_description,
          rewardImage: entry.reward_image,
          isCurrentDay,
          isPastDay,
          isFutureDay,
          isClaimed,
          isClosed,
          canClaim: isCurrentDay && !isClaimed && !isClosed && !!authPayload,
        };
      });

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          enabled: true,
          daysUntilChristmas: daysUntilChristmas > 0 ? daysUntilChristmas : 0,
          isDecember: currentMonth === 12,
          currentDay: currentMonth === 12 ? currentDay : null,
          calendar,
          isAuthenticated: !!authPayload,
          isAdmin: authPayload ? isAdmin(authPayload) : false
        })
      };
    }

    // POST - Claim reward (authenticated only)
    if (event.httpMethod === 'POST') {
      const authPayload = await authenticateToken(event);
      if (!authPayload) {
        return {
          statusCode: 401,
          headers,
          body: JSON.stringify({ error: 'Authentication required to claim rewards' })
        };
      }

      let { userId, supabaseUserId } = getUserIdentifiers(authPayload);

      // For Supabase users, also look up their linked user_id from users table
      // This ensures vouchers are created with the correct user_id for unified accounts
      if (!userId && supabaseUserId) {
        const dbUser = await sql`
          SELECT id FROM users WHERE supabase_user_id = ${supabaseUserId} LIMIT 1
        `;
        if (dbUser.length > 0) {
          userId = dbUser[0].id;
          console.log('✅ Found unified user_id for Supabase user:', userId);
        }
      }

      const body = JSON.parse(event.body || '{}');
      const { day } = body;

      if (!day || day < 1 || day > 25) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Invalid day. Must be between 1 and 25.' })
        };
      }

      // Only allow claiming on the correct day in December
      if (currentMonth !== 12 || currentDay !== day) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({
            error: `This reward is only available on December ${day}`
          })
        };
      }

      // Check if user already claimed this day
      const existingClaim = userId
        ? await sql`
            SELECT id FROM advent_claims
            WHERE user_id = ${userId} AND advent_day = ${day} AND year = ${currentYear}
          `
        : await sql`
            SELECT id FROM advent_claims
            WHERE supabase_user_id = ${supabaseUserId} AND advent_day = ${day} AND year = ${currentYear}
          `;

      if (existingClaim.length > 0) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'You have already claimed this reward' })
        };
      }

      // Get the reward for this day
      const [calendarEntry] = await sql`
        SELECT id, reward_id
        FROM advent_calendar
        WHERE day = ${day} AND year = ${currentYear} AND is_active = true
        LIMIT 1
      `;

      if (!calendarEntry || !calendarEntry.reward_id) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ error: 'No reward available for this day' })
        };
      }

      // Get reward details with all fields needed for voucher
      const [reward] = await sql`
        SELECT
          id,
          name,
          description,
          voucher_code,
          discount_amount,
          discount_type,
          min_order_amount,
          points_required
        FROM rewards
        WHERE id = ${calendarEntry.reward_id}
        LIMIT 1
      `;

      if (!reward) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ error: 'Reward not found' })
        };
      }

      // Generate voucher code if reward doesn't have one
      const voucherCode = reward.voucher_code || `XMAS${currentYear}-DAY${day}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

      // Set expiration to 11:59:59 PM EST on the current day
      // EST is UTC-5, so 11:59:59 PM EST = 4:59:59 AM UTC next day
      const expirationDate = new Date(Date.UTC(currentYear, 11, day + 1, 4, 59, 59)); // Next day 4:59:59 AM UTC = 11:59:59 PM EST

      // Create voucher for user with all required fields
      const [voucher] = await sql`
        INSERT INTO user_vouchers (
          user_id,
          supabase_user_id,
          reward_id,
          voucher_code,
          discount_amount,
          discount_type,
          min_order_amount,
          points_used,
          status,
          title,
          description,
          expires_at
        )
        VALUES (
          ${userId || null},
          ${supabaseUserId || null},
          ${reward.id},
          ${voucherCode},
          ${reward.discount_amount || 0},
          ${reward.discount_type || 'fixed'},
          ${reward.min_order_amount || 0},
          0,
          'active',
          ${'🎄 Christmas Present - ' + reward.name},
          ${reward.description},
          ${expirationDate.toISOString()}
        )
        RETURNING id
      `;

      // Record the claim
      await sql`
        INSERT INTO advent_claims (
          user_id,
          supabase_user_id,
          advent_day,
          reward_id,
          voucher_id,
          year
        )
        VALUES (
          ${userId || null},
          ${supabaseUserId || null},
          ${day},
          ${reward.id},
          ${voucher.id},
          ${currentYear}
        )
      `;

      console.log(`✅ Advent reward claimed: Day ${day}, User: ${userId || supabaseUserId}`);

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          message: `You've claimed your reward for December ${day}!`,
          reward: {
            name: reward.name,
            description: reward.description,
            voucherId: voucher.id
          }
        })
      };
    }

    // DELETE - Reset claim (admin only, for testing)
    if (event.httpMethod === 'DELETE') {
      const authPayload = await authenticateToken(event);
      if (!authPayload) {
        return {
          statusCode: 401,
          headers,
          body: JSON.stringify({ error: 'Authentication required' })
        };
      }

      if (!isAdmin(authPayload)) {
        return {
          statusCode: 403,
          headers,
          body: JSON.stringify({ error: 'Admin access required to reset claims' })
        };
      }

      let { userId, supabaseUserId } = getUserIdentifiers(authPayload);

      // For Supabase users, also look up their linked user_id from users table
      if (!userId && supabaseUserId) {
        const dbUser = await sql`
          SELECT id FROM users WHERE supabase_user_id = ${supabaseUserId} LIMIT 1
        `;
        if (dbUser.length > 0) {
          userId = dbUser[0].id;
        }
      }

      const body = JSON.parse(event.body || '{}');
      const { day } = body;

      if (!day || day < 1 || day > 25) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Invalid day. Must be between 1 and 25.' })
        };
      }

      // Find the claim and its voucher
      const claim = userId
        ? await sql`
            SELECT id, voucher_id FROM advent_claims
            WHERE user_id = ${userId} AND advent_day = ${day} AND year = ${currentYear}
          `
        : await sql`
            SELECT id, voucher_id FROM advent_claims
            WHERE supabase_user_id = ${supabaseUserId} AND advent_day = ${day} AND year = ${currentYear}
          `;

      if (claim.length === 0) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ error: 'No claim found for this day' })
        };
      }

      const voucherId = claim[0].voucher_id;

      // Delete the voucher first (foreign key constraint)
      if (voucherId) {
        await sql`DELETE FROM user_vouchers WHERE id = ${voucherId}`;
      }

      // Delete the claim
      await sql`DELETE FROM advent_claims WHERE id = ${claim[0].id}`;

      console.log(`✅ Admin reset: Day ${day} claim removed for user ${userId || supabaseUserId}`);

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          message: `Claim for December ${day} has been reset. You can now claim it again.`
        })
      };
    }

    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };

  } catch (error: any) {
    console.error('❌ Advent calendar error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message || 'Internal server error' })
    };
  }
};
