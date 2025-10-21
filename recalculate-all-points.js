import postgres from 'postgres';
import 'dotenv/config';

const sql = postgres(process.env.DATABASE_URL);

async function recalculateAllPoints() {
  try {
    console.log('🔄 Recalculating points for ALL users from transactions...\n');

    // Get all users who have points transactions
    const usersWithTransactions = await sql`
      SELECT DISTINCT
        COALESCE(user_id, 0) as user_id,
        supabase_user_id
      FROM points_transactions
      WHERE user_id IS NOT NULL OR supabase_user_id IS NOT NULL
    `;

    console.log(`Found ${usersWithTransactions.length} users with transactions\n`);

    for (const user of usersWithTransactions) {
      if (user.user_id && user.user_id !== 0) {
        // Process legacy user
        console.log(`Processing legacy user ID: ${user.user_id}`);

        // Get all transactions for this user
        const transactions = await sql`
          SELECT * FROM points_transactions
          WHERE user_id = ${user.user_id}
          ORDER BY created_at ASC
        `;

        let totalEarned = 0;
        let totalRedeemed = 0;
        let lastEarnedAt = null;

        transactions.forEach(tx => {
          if (tx.type === 'earned') {
            totalEarned += parseInt(tx.points);
            lastEarnedAt = tx.created_at;
          } else if (tx.type === 'redeemed') {
            totalRedeemed += Math.abs(parseInt(tx.points));
          }
        });

        const currentPoints = totalEarned - totalRedeemed;

        console.log(`  Transactions: ${transactions.length}`);
        console.log(`  Total Earned: ${totalEarned}`);
        console.log(`  Total Redeemed: ${totalRedeemed}`);
        console.log(`  Current Points: ${currentPoints}`);
        console.log(`  Last Earned: ${lastEarnedAt}`);

        // Update user_points table
        await sql`
          INSERT INTO user_points (user_id, points, total_earned, total_redeemed, last_earned_at, created_at, updated_at)
          VALUES (${user.user_id}, ${currentPoints}, ${totalEarned}, ${totalRedeemed}, ${lastEarnedAt}, NOW(), NOW())
          ON CONFLICT (user_id) DO UPDATE SET
            points = ${currentPoints},
            total_earned = ${totalEarned},
            total_redeemed = ${totalRedeemed},
            last_earned_at = ${lastEarnedAt},
            updated_at = NOW()
        `;

        // Also update legacy rewards column
        await sql`
          UPDATE users
          SET rewards = ${currentPoints}, updated_at = NOW()
          WHERE id = ${user.user_id}
        `;

        console.log(`  ✅ Updated user_points and users.rewards\n`);

      } else if (user.supabase_user_id) {
        // Process Supabase user
        console.log(`Processing Supabase user ID: ${user.supabase_user_id}`);

        const transactions = await sql`
          SELECT * FROM points_transactions
          WHERE supabase_user_id = ${user.supabase_user_id}
          ORDER BY created_at ASC
        `;

        let totalEarned = 0;
        let totalRedeemed = 0;
        let lastEarnedAt = null;

        transactions.forEach(tx => {
          if (tx.type === 'earned') {
            totalEarned += parseInt(tx.points);
            lastEarnedAt = tx.created_at;
          } else if (tx.type === 'redeemed') {
            totalRedeemed += Math.abs(parseInt(tx.points));
          }
        });

        const currentPoints = totalEarned - totalRedeemed;

        console.log(`  Transactions: ${transactions.length}`);
        console.log(`  Total Earned: ${totalEarned}`);
        console.log(`  Total Redeemed: ${totalRedeemed}`);
        console.log(`  Current Points: ${currentPoints}`);
        console.log(`  Last Earned: ${lastEarnedAt}`);

        // Update user_points table
        await sql`
          INSERT INTO user_points (user_id, supabase_user_id, points, total_earned, total_redeemed, last_earned_at, created_at, updated_at)
          VALUES (NULL, ${user.supabase_user_id}, ${currentPoints}, ${totalEarned}, ${totalRedeemed}, ${lastEarnedAt}, NOW(), NOW())
          ON CONFLICT (supabase_user_id) DO UPDATE SET
            points = ${currentPoints},
            total_earned = ${totalEarned},
            total_redeemed = ${totalRedeemed},
            last_earned_at = ${lastEarnedAt},
            updated_at = NOW()
        `;

        console.log(`  ✅ Updated user_points\n`);
      }
    }

    // Show final results
    console.log('='.repeat(60));
    console.log('FINAL USER POINTS:\n');

    const allUserPoints = await sql`
      SELECT up.*, u.email, u.first_name, u.last_name
      FROM user_points up
      LEFT JOIN users u ON (up.user_id = u.id OR up.supabase_user_id = u.supabase_user_id)
      WHERE up.points > 0 OR up.total_earned > 0
      ORDER BY up.total_earned DESC
    `;

    for (const user of allUserPoints) {
      console.log(`${user.email || 'Unknown'}:`);
      console.log(`  Points: ${user.points}`);
      console.log(`  Total Earned: ${user.total_earned}`);
      console.log(`  Total Redeemed: ${user.total_redeemed}`);
      console.log(`  Last Earned: ${user.last_earned_at}`);
      console.log('');
    }

    await sql.end();
    console.log('✅ Done!');
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    await sql.end();
    process.exit(1);
  }
}

recalculateAllPoints();
