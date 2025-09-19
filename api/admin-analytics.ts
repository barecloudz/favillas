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
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Credentials': 'true',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  const authPayload = authenticateToken(event);
  if (!authPayload) {
    return {
      statusCode: 401,
      headers,
      body: JSON.stringify({ error: 'Unauthorized' })
    };
  }

  // Only staff can access analytics
  if (!isStaff(authPayload)) {
    return {
      statusCode: 403,
      headers,
      body: JSON.stringify({ error: 'Access denied - admin access required' })
    };
  }

  try {
    const sql = getDB();

    // Get query parameters for date filtering
    const urlParams = new URLSearchParams(event.queryStringParameters || {});
    const period = urlParams.get('period') || 'all'; // all, today, week, month, year
    const startDate = urlParams.get('start');
    const endDate = urlParams.get('end');

    // Build date filter based on period
    let dateFilter = '';
    const now = new Date();

    switch (period) {
      case 'today':
        const today = now.toISOString().split('T')[0];
        dateFilter = `AND DATE(created_at) = '${today}'`;
        break;
      case 'week':
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        dateFilter = `AND DATE(created_at) >= '${weekAgo}'`;
        break;
      case 'month':
        const monthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate()).toISOString().split('T')[0];
        dateFilter = `AND DATE(created_at) >= '${monthAgo}'`;
        break;
      case 'year':
        const yearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate()).toISOString().split('T')[0];
        dateFilter = `AND DATE(created_at) >= '${yearAgo}'`;
        break;
      case 'custom':
        if (startDate && endDate) {
          dateFilter = `AND DATE(created_at) BETWEEN '${startDate}' AND '${endDate}'`;
        }
        break;
      default:
        dateFilter = ''; // All time
    }

    console.log('📊 Admin Analytics: Generating report for period:', period, 'Filter:', dateFilter);

    // Revenue Summary
    const revenueQuery = await sql`
      SELECT
        COUNT(*) as total_orders,
        COALESCE(SUM(CAST(total AS DECIMAL(10,2))), 0) as total_revenue,
        COALESCE(SUM(CAST(tax AS DECIMAL(10,2))), 0) as total_tax,
        COALESCE(SUM(CAST(delivery_fee AS DECIMAL(10,2))), 0) as total_delivery_fees,
        COALESCE(SUM(CAST(tip AS DECIMAL(10,2))), 0) as total_tips,
        COALESCE(AVG(CAST(total AS DECIMAL(10,2))), 0) as average_order_value
      FROM orders
      WHERE status != 'cancelled'
      ${sql.unsafe(dateFilter)}
    `;

    // Daily Revenue Trend (last 30 days)
    const dailyRevenueQuery = await sql`
      SELECT
        DATE(created_at) as date,
        COUNT(*) as orders,
        COALESCE(SUM(CAST(total AS DECIMAL(10,2))), 0) as revenue
      FROM orders
      WHERE status != 'cancelled'
      AND DATE(created_at) >= CURRENT_DATE - INTERVAL '30 days'
      GROUP BY DATE(created_at)
      ORDER BY date DESC
      LIMIT 30
    `;

    // Order Status Breakdown
    const orderStatusQuery = await sql`
      SELECT
        status,
        COUNT(*) as count,
        COALESCE(SUM(CAST(total AS DECIMAL(10,2))), 0) as revenue
      FROM orders
      WHERE 1=1 ${sql.unsafe(dateFilter)}
      GROUP BY status
      ORDER BY count DESC
    `;

    // Popular Items
    const popularItemsQuery = await sql`
      SELECT
        mi.name,
        mi.category,
        COUNT(oi.id) as times_ordered,
        SUM(oi.quantity) as total_quantity,
        COALESCE(SUM(CAST(oi.price AS DECIMAL(10,2)) * oi.quantity), 0) as total_revenue
      FROM order_items oi
      JOIN orders o ON oi.order_id = o.id
      LEFT JOIN menu_items mi ON oi.menu_item_id = mi.id
      WHERE o.status != 'cancelled'
      ${sql.unsafe(dateFilter.replace('created_at', 'o.created_at'))}
      GROUP BY mi.id, mi.name, mi.category
      ORDER BY total_quantity DESC
      LIMIT 10
    `;

    // Customer Analytics
    const customerAnalyticsQuery = await sql`
      SELECT
        COUNT(DISTINCT COALESCE(user_id, supabase_user_id)) as unique_customers,
        COUNT(CASE WHEN user_id IS NOT NULL THEN 1 END) as legacy_customers,
        COUNT(CASE WHEN supabase_user_id IS NOT NULL THEN 1 END) as google_customers
      FROM orders
      WHERE status != 'cancelled'
      ${sql.unsafe(dateFilter)}
    `;

    // Payment Method Breakdown (if available)
    const paymentMethodQuery = await sql`
      SELECT
        payment_status,
        COUNT(*) as count,
        COALESCE(SUM(CAST(total AS DECIMAL(10,2))), 0) as revenue
      FROM orders
      WHERE status != 'cancelled'
      ${sql.unsafe(dateFilter)}
      GROUP BY payment_status
      ORDER BY count DESC
    `;

    // Order Type Breakdown
    const orderTypeQuery = await sql`
      SELECT
        order_type,
        COUNT(*) as count,
        COALESCE(SUM(CAST(total AS DECIMAL(10,2))), 0) as revenue,
        COALESCE(AVG(CAST(total AS DECIMAL(10,2))), 0) as avg_order_value
      FROM orders
      WHERE status != 'cancelled'
      ${sql.unsafe(dateFilter)}
      GROUP BY order_type
      ORDER BY count DESC
    `;

    // Monthly comparison for growth
    const monthlyComparisonQuery = await sql`
      SELECT
        DATE_TRUNC('month', created_at) as month,
        COUNT(*) as orders,
        COALESCE(SUM(CAST(total AS DECIMAL(10,2))), 0) as revenue
      FROM orders
      WHERE status != 'cancelled'
      AND created_at >= CURRENT_DATE - INTERVAL '12 months'
      GROUP BY DATE_TRUNC('month', created_at)
      ORDER BY month DESC
      LIMIT 12
    `;

    const analytics = {
      period: period,
      dateRange: {
        start: startDate,
        end: endDate,
        filter: dateFilter
      },
      summary: {
        totalOrders: parseInt(revenueQuery[0].total_orders),
        totalRevenue: parseFloat(revenueQuery[0].total_revenue),
        totalTax: parseFloat(revenueQuery[0].total_tax),
        totalDeliveryFees: parseFloat(revenueQuery[0].total_delivery_fees),
        totalTips: parseFloat(revenueQuery[0].total_tips),
        averageOrderValue: parseFloat(revenueQuery[0].average_order_value),
        grossRevenue: parseFloat(revenueQuery[0].total_revenue) + parseFloat(revenueQuery[0].total_tax) + parseFloat(revenueQuery[0].total_delivery_fees)
      },
      dailyRevenue: dailyRevenueQuery.map(row => ({
        date: row.date,
        orders: parseInt(row.orders),
        revenue: parseFloat(row.revenue)
      })),
      orderStatus: orderStatusQuery.map(row => ({
        status: row.status,
        count: parseInt(row.count),
        revenue: parseFloat(row.revenue)
      })),
      popularItems: popularItemsQuery.map(row => ({
        name: row.name || 'Unknown Item',
        category: row.category,
        timesOrdered: parseInt(row.times_ordered),
        totalQuantity: parseInt(row.total_quantity),
        totalRevenue: parseFloat(row.total_revenue)
      })),
      customers: {
        unique: parseInt(customerAnalyticsQuery[0].unique_customers),
        legacy: parseInt(customerAnalyticsQuery[0].legacy_customers),
        google: parseInt(customerAnalyticsQuery[0].google_customers)
      },
      paymentMethods: paymentMethodQuery.map(row => ({
        method: row.payment_status,
        count: parseInt(row.count),
        revenue: parseFloat(row.revenue)
      })),
      orderTypes: orderTypeQuery.map(row => ({
        type: row.order_type,
        count: parseInt(row.count),
        revenue: parseFloat(row.revenue),
        averageOrderValue: parseFloat(row.avg_order_value)
      })),
      monthlyTrend: monthlyComparisonQuery.map(row => ({
        month: row.month,
        orders: parseInt(row.orders),
        revenue: parseFloat(row.revenue)
      })),
      generatedAt: new Date().toISOString()
    };

    console.log('✅ Admin Analytics: Report generated successfully');

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(analytics)
    };

  } catch (error: any) {
    console.error('❌ Admin analytics API error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Internal server error',
        details: error.message
      })
    };
  }
};