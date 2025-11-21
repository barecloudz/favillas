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

  const authPayload = await authenticateToken(event);
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

    // Calculate date ranges securely
    const now = new Date();
    let filterStartDate: string | null = null;
    let filterEndDate: string | null = null;
    let useExactDate: string | null = null;

    switch (period) {
      case 'today':
        // Use current calendar date (12:01 AM to 11:59 PM)
        useExactDate = now.toISOString().split('T')[0];
        break;
      case 'week':
        filterStartDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        break;
      case 'month':
        filterStartDate = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate()).toISOString().split('T')[0];
        break;
      case 'year':
        filterStartDate = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate()).toISOString().split('T')[0];
        break;
      case 'custom':
        // Validate date format before using
        if (startDate && endDate) {
          const startDateObj = new Date(startDate);
          const endDateObj = new Date(endDate);
          if (!isNaN(startDateObj.getTime()) && !isNaN(endDateObj.getTime())) {
            filterStartDate = startDate;
            filterEndDate = endDate;
          }
        }
        break;
      default:
        // All time - no filter
        break;
    }

    console.log('📊 Admin Analytics: Generating report for period:', period, {
      useExactDate,
      filterStartDate,
      filterEndDate
    });

    // Revenue Summary with parameterized date filtering
    const revenueQuery = useExactDate
      ? await sql`
          SELECT
            COUNT(*) as total_orders,
            COALESCE(SUM(CAST(total AS DECIMAL(10,2))), 0) as total_revenue,
            COALESCE(SUM(CAST(tax AS DECIMAL(10,2))), 0) as total_tax,
            COALESCE(SUM(CAST(delivery_fee AS DECIMAL(10,2))), 0) as total_delivery_fees,
            COALESCE(SUM(CAST(tip AS DECIMAL(10,2))), 0) as total_tips,
            COALESCE(AVG(CAST(total AS DECIMAL(10,2))), 0) as average_order_value
          FROM orders
          WHERE status != 'cancelled'
          AND DATE(created_at) = ${useExactDate}
        `
      : filterStartDate && filterEndDate
      ? await sql`
          SELECT
            COUNT(*) as total_orders,
            COALESCE(SUM(CAST(total AS DECIMAL(10,2))), 0) as total_revenue,
            COALESCE(SUM(CAST(tax AS DECIMAL(10,2))), 0) as total_tax,
            COALESCE(SUM(CAST(delivery_fee AS DECIMAL(10,2))), 0) as total_delivery_fees,
            COALESCE(SUM(CAST(tip AS DECIMAL(10,2))), 0) as total_tips,
            COALESCE(AVG(CAST(total AS DECIMAL(10,2))), 0) as average_order_value
          FROM orders
          WHERE status != 'cancelled'
          AND DATE(created_at) BETWEEN ${filterStartDate} AND ${filterEndDate}
        `
      : filterStartDate
      ? await sql`
          SELECT
            COUNT(*) as total_orders,
            COALESCE(SUM(CAST(total AS DECIMAL(10,2))), 0) as total_revenue,
            COALESCE(SUM(CAST(tax AS DECIMAL(10,2))), 0) as total_tax,
            COALESCE(SUM(CAST(delivery_fee AS DECIMAL(10,2))), 0) as total_delivery_fees,
            COALESCE(SUM(CAST(tip AS DECIMAL(10,2))), 0) as total_tips,
            COALESCE(AVG(CAST(total AS DECIMAL(10,2))), 0) as average_order_value
          FROM orders
          WHERE status != 'cancelled'
          AND DATE(created_at) >= ${filterStartDate}
        `
      : await sql`
          SELECT
            COUNT(*) as total_orders,
            COALESCE(SUM(CAST(total AS DECIMAL(10,2))), 0) as total_revenue,
            COALESCE(SUM(CAST(tax AS DECIMAL(10,2))), 0) as total_tax,
            COALESCE(SUM(CAST(delivery_fee AS DECIMAL(10,2))), 0) as total_delivery_fees,
            COALESCE(SUM(CAST(tip AS DECIMAL(10,2))), 0) as total_tips,
            COALESCE(AVG(CAST(total AS DECIMAL(10,2))), 0) as average_order_value
          FROM orders
          WHERE status != 'cancelled'
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

    // Order Status Breakdown with parameterized filtering
    const orderStatusQuery = useExactDate
      ? await sql`
          SELECT status, COUNT(*) as count, COALESCE(SUM(CAST(total AS DECIMAL(10,2))), 0) as revenue
          FROM orders
          WHERE DATE(created_at) = ${useExactDate}
          GROUP BY status
          ORDER BY count DESC
        `
      : filterStartDate && filterEndDate
      ? await sql`
          SELECT status, COUNT(*) as count, COALESCE(SUM(CAST(total AS DECIMAL(10,2))), 0) as revenue
          FROM orders
          WHERE DATE(created_at) BETWEEN ${filterStartDate} AND ${filterEndDate}
          GROUP BY status
          ORDER BY count DESC
        `
      : filterStartDate
      ? await sql`
          SELECT status, COUNT(*) as count, COALESCE(SUM(CAST(total AS DECIMAL(10,2))), 0) as revenue
          FROM orders
          WHERE DATE(created_at) >= ${filterStartDate}
          GROUP BY status
          ORDER BY count DESC
        `
      : await sql`
          SELECT status, COUNT(*) as count, COALESCE(SUM(CAST(total AS DECIMAL(10,2))), 0) as revenue
          FROM orders
          GROUP BY status
          ORDER BY count DESC
        `;

    // Popular Items with parameterized filtering
    const popularItemsQuery = useExactDate
      ? await sql`
          SELECT mi.name, mi.category, COUNT(oi.id) as times_ordered,
                 SUM(oi.quantity) as total_quantity,
                 COALESCE(SUM(CAST(oi.price AS DECIMAL(10,2)) * oi.quantity), 0) as total_revenue
          FROM order_items oi
          JOIN orders o ON oi.order_id = o.id
          LEFT JOIN menu_items mi ON oi.menu_item_id = mi.id
          WHERE o.status != 'cancelled' AND DATE(o.created_at) = ${useExactDate}
          GROUP BY mi.id, mi.name, mi.category
          ORDER BY total_quantity DESC
          LIMIT 10
        `
      : filterStartDate && filterEndDate
      ? await sql`
          SELECT mi.name, mi.category, COUNT(oi.id) as times_ordered,
                 SUM(oi.quantity) as total_quantity,
                 COALESCE(SUM(CAST(oi.price AS DECIMAL(10,2)) * oi.quantity), 0) as total_revenue
          FROM order_items oi
          JOIN orders o ON oi.order_id = o.id
          LEFT JOIN menu_items mi ON oi.menu_item_id = mi.id
          WHERE o.status != 'cancelled' AND DATE(o.created_at) BETWEEN ${filterStartDate} AND ${filterEndDate}
          GROUP BY mi.id, mi.name, mi.category
          ORDER BY total_quantity DESC
          LIMIT 10
        `
      : filterStartDate
      ? await sql`
          SELECT mi.name, mi.category, COUNT(oi.id) as times_ordered,
                 SUM(oi.quantity) as total_quantity,
                 COALESCE(SUM(CAST(oi.price AS DECIMAL(10,2)) * oi.quantity), 0) as total_revenue
          FROM order_items oi
          JOIN orders o ON oi.order_id = o.id
          LEFT JOIN menu_items mi ON oi.menu_item_id = mi.id
          WHERE o.status != 'cancelled' AND DATE(o.created_at) >= ${filterStartDate}
          GROUP BY mi.id, mi.name, mi.category
          ORDER BY total_quantity DESC
          LIMIT 10
        `
      : await sql`
          SELECT mi.name, mi.category, COUNT(oi.id) as times_ordered,
                 SUM(oi.quantity) as total_quantity,
                 COALESCE(SUM(CAST(oi.price AS DECIMAL(10,2)) * oi.quantity), 0) as total_revenue
          FROM order_items oi
          JOIN orders o ON oi.order_id = o.id
          LEFT JOIN menu_items mi ON oi.menu_item_id = mi.id
          WHERE o.status != 'cancelled'
          GROUP BY mi.id, mi.name, mi.category
          ORDER BY total_quantity DESC
          LIMIT 10
        `;

    // Customer Analytics with parameterized filtering
    const customerAnalyticsQuery = useExactDate
      ? await sql`
          SELECT COUNT(DISTINCT COALESCE(user_id, supabase_user_id)) as unique_customers,
                 COUNT(CASE WHEN user_id IS NOT NULL THEN 1 END) as legacy_customers,
                 COUNT(CASE WHEN supabase_user_id IS NOT NULL THEN 1 END) as google_customers
          FROM orders
          WHERE status != 'cancelled' AND DATE(created_at) = ${useExactDate}
        `
      : filterStartDate && filterEndDate
      ? await sql`
          SELECT COUNT(DISTINCT COALESCE(user_id, supabase_user_id)) as unique_customers,
                 COUNT(CASE WHEN user_id IS NOT NULL THEN 1 END) as legacy_customers,
                 COUNT(CASE WHEN supabase_user_id IS NOT NULL THEN 1 END) as google_customers
          FROM orders
          WHERE status != 'cancelled' AND DATE(created_at) BETWEEN ${filterStartDate} AND ${filterEndDate}
        `
      : filterStartDate
      ? await sql`
          SELECT COUNT(DISTINCT COALESCE(user_id, supabase_user_id)) as unique_customers,
                 COUNT(CASE WHEN user_id IS NOT NULL THEN 1 END) as legacy_customers,
                 COUNT(CASE WHEN supabase_user_id IS NOT NULL THEN 1 END) as google_customers
          FROM orders
          WHERE status != 'cancelled' AND DATE(created_at) >= ${filterStartDate}
        `
      : await sql`
          SELECT COUNT(DISTINCT COALESCE(user_id, supabase_user_id)) as unique_customers,
                 COUNT(CASE WHEN user_id IS NOT NULL THEN 1 END) as legacy_customers,
                 COUNT(CASE WHEN supabase_user_id IS NOT NULL THEN 1 END) as google_customers
          FROM orders
          WHERE status != 'cancelled'
        `;

    // Payment Method Breakdown with parameterized filtering
    const paymentMethodQuery = useExactDate
      ? await sql`
          SELECT payment_status, COUNT(*) as count, COALESCE(SUM(CAST(total AS DECIMAL(10,2))), 0) as revenue
          FROM orders
          WHERE status != 'cancelled' AND DATE(created_at) = ${useExactDate}
          GROUP BY payment_status
          ORDER BY count DESC
        `
      : filterStartDate && filterEndDate
      ? await sql`
          SELECT payment_status, COUNT(*) as count, COALESCE(SUM(CAST(total AS DECIMAL(10,2))), 0) as revenue
          FROM orders
          WHERE status != 'cancelled' AND DATE(created_at) BETWEEN ${filterStartDate} AND ${filterEndDate}
          GROUP BY payment_status
          ORDER BY count DESC
        `
      : filterStartDate
      ? await sql`
          SELECT payment_status, COUNT(*) as count, COALESCE(SUM(CAST(total AS DECIMAL(10,2))), 0) as revenue
          FROM orders
          WHERE status != 'cancelled' AND DATE(created_at) >= ${filterStartDate}
          GROUP BY payment_status
          ORDER BY count DESC
        `
      : await sql`
          SELECT payment_status, COUNT(*) as count, COALESCE(SUM(CAST(total AS DECIMAL(10,2))), 0) as revenue
          FROM orders
          WHERE status != 'cancelled'
          GROUP BY payment_status
          ORDER BY count DESC
        `;

    // Order Type Breakdown with parameterized filtering
    const orderTypeQuery = useExactDate
      ? await sql`
          SELECT order_type, COUNT(*) as count,
                 COALESCE(SUM(CAST(total AS DECIMAL(10,2))), 0) as revenue,
                 COALESCE(AVG(CAST(total AS DECIMAL(10,2))), 0) as avg_order_value
          FROM orders
          WHERE status != 'cancelled' AND DATE(created_at) = ${useExactDate}
          GROUP BY order_type
          ORDER BY count DESC
        `
      : filterStartDate && filterEndDate
      ? await sql`
          SELECT order_type, COUNT(*) as count,
                 COALESCE(SUM(CAST(total AS DECIMAL(10,2))), 0) as revenue,
                 COALESCE(AVG(CAST(total AS DECIMAL(10,2))), 0) as avg_order_value
          FROM orders
          WHERE status != 'cancelled' AND DATE(created_at) BETWEEN ${filterStartDate} AND ${filterEndDate}
          GROUP BY order_type
          ORDER BY count DESC
        `
      : filterStartDate
      ? await sql`
          SELECT order_type, COUNT(*) as count,
                 COALESCE(SUM(CAST(total AS DECIMAL(10,2))), 0) as revenue,
                 COALESCE(AVG(CAST(total AS DECIMAL(10,2))), 0) as avg_order_value
          FROM orders
          WHERE status != 'cancelled' AND DATE(created_at) >= ${filterStartDate}
          GROUP BY order_type
          ORDER BY count DESC
        `
      : await sql`
          SELECT order_type, COUNT(*) as count,
                 COALESCE(SUM(CAST(total AS DECIMAL(10,2))), 0) as revenue,
                 COALESCE(AVG(CAST(total AS DECIMAL(10,2))), 0) as avg_order_value
          FROM orders
          WHERE status != 'cancelled'
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
        start: filterStartDate || startDate,
        end: filterEndDate || endDate,
        exactDate: useExactDate
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