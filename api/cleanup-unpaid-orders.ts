import type { Handler } from '@netlify/functions';
import { db } from '../server/db';
import { orders } from '../shared/schema';
import { and, eq, lt, sql } from 'drizzle-orm';

/**
 * Scheduled function to clean up unpaid payment-link orders
 * Runs automatically every hour via Netlify scheduled functions
 *
 * Deletes orders that:
 * - Have payment_status = 'pending_payment_link' (awaiting payment)
 * - Were created more than 24 hours ago
 * - Customer never completed payment
 *
 * This prevents the database from filling up with abandoned orders
 */
export const handler: Handler = async (event, context) => {
  console.log('🧹 Running unpaid orders cleanup...');

  try {
    // Calculate 24 hours ago
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    // Delete unpaid payment-link orders older than 24 hours
    const result = await db
      .delete(orders)
      .where(
        and(
          eq(orders.paymentStatus, 'pending_payment_link'),
          lt(orders.createdAt, twentyFourHoursAgo)
        )
      )
      .returning({ id: orders.id });

    const deletedCount = result.length;

    if (deletedCount > 0) {
      console.log(`✅ Cleaned up ${deletedCount} unpaid orders older than 24 hours`);
      console.log('Deleted order IDs:', result.map(r => r.id));
    } else {
      console.log('✅ No unpaid orders to clean up');
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        success: true,
        deletedCount,
        message: `Cleaned up ${deletedCount} unpaid orders`
      })
    };

  } catch (error: any) {
    console.error('❌ Error cleaning up unpaid orders:', error);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        success: false,
        error: 'Failed to clean up unpaid orders',
        details: error.message
      })
    };
  }
};
