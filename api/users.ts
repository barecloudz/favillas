import { Handler } from '@netlify/functions';
import postgres from 'postgres';
import { authenticateToken, isStaff } from './_shared/auth';

export const handler: Handler = async (event, context) => {
  const origin = event.headers.origin || 'http://localhost:3000';
  const headers = {
    'Access-Control-Allow-Origin': origin,
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

  console.log('🚀 USERS API CALLED');
  console.log('📋 Request Method:', event.httpMethod);
  console.log('🔐 Users API auth check starting...');
  console.log('📋 Headers received:', {
    hasAuth: !!event.headers.authorization,
    hasCookies: !!event.headers.cookie,
    authPreview: event.headers.authorization ? event.headers.authorization.substring(0, 30) + '...' : 'none',
    origin: event.headers.origin
  });

  // Authenticate using Supabase token
  const authPayload = await authenticateToken(event);
  console.log('🔐 Auth payload result:', authPayload ? 'SUCCESS' : 'FAILED');

  if (!authPayload) {
    console.log('❌ Authentication failed - no valid token');
    return {
      statusCode: 401,
      headers,
      body: JSON.stringify({ error: 'Unauthorized' })
    };
  }

  console.log('✅ Authentication successful:', authPayload);

  if (!isStaff(authPayload)) {
    console.log('❌ Authorization failed - insufficient role:', authPayload.role);
    return {
      statusCode: 403,
      headers,
      body: JSON.stringify({ error: 'Forbidden - Admin access required' })
    };
  }

  console.log('✅ Authorization successful - user has admin access');

  try {

    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      throw new Error('DATABASE_URL not configured');
    }

    const sql = postgres(databaseUrl, {
      max: 1,
      idle_timeout: 20,
      connect_timeout: 10,
      prepare: false,
      keep_alive: false,
    });

    // GET - List all users (both legacy users and Supabase users)
    if (event.httpMethod === 'GET') {
      console.log('📊 Fetching all users...');

      // Get legacy users with current point balance and hourly rate
      const legacyUsers = await sql`
        SELECT
          u.id, u.username, u.email, u.first_name, u.last_name, u.phone,
          u.role, u.is_admin, u.is_active, u.created_at, u.rewards,
          u.hourly_rate, u.department,
          NULL as supabase_user_id, 'legacy' as user_type,
          COALESCE(up.points, 0) as current_points
        FROM users u
        LEFT JOIN user_points up ON u.id = up.user_id
        WHERE u.supabase_user_id IS NULL
        ORDER BY u.created_at DESC
      `;

      // Get Supabase users with current point balance and hourly rate
      const supabaseUsers = await sql`
        SELECT
          u.id, u.username, u.email, u.first_name, u.last_name, u.phone,
          u.role, u.is_admin, u.is_active, u.created_at, u.rewards,
          u.hourly_rate, u.department,
          u.supabase_user_id, 'supabase' as user_type,
          COALESCE(up.points, 0) as current_points
        FROM users u
        LEFT JOIN user_points up ON u.id = up.user_id
        WHERE u.supabase_user_id IS NOT NULL
        ORDER BY u.created_at DESC
      `;

      console.log(`✅ Found ${legacyUsers.length} legacy users and ${supabaseUsers.length} Supabase users`);

      const allUsers = [...supabaseUsers, ...legacyUsers];

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(allUsers.map(user => ({
          id: user.id,
          username: user.username,
          email: user.email,
          firstName: user.first_name,
          lastName: user.last_name,
          phone: user.phone,
          role: user.role,
          isAdmin: user.is_admin,
          isActive: user.is_active,
          createdAt: user.created_at,
          rewards: user.rewards || 0,
          currentPoints: parseInt(user.current_points) || 0,
          hourlyRate: parseFloat(user.hourly_rate) || null,
          department: user.department,
          supabaseUserId: user.supabase_user_id,
          userType: user.user_type
        })))
      };
    }

    // POST - Create new employee or admin user
    if (event.httpMethod === 'POST') {
      console.log('➕ Creating new user...');
      const requestData = JSON.parse(event.body || '{}');
      const { email, firstName, lastName, phone, role, isAdmin, hourlyRate, department, password } = requestData;

      console.log('📋 User data:', { email, firstName, lastName, phone, role, isAdmin, hasPassword: !!password });

      if (!email || !firstName || !lastName) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({
            error: 'Email, firstName, and lastName are required'
          })
        };
      }

      // Check if user already exists
      const existingUser = await sql`
        SELECT id FROM users WHERE email = ${email}
      `;

      if (existingUser.length > 0) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({
            error: 'User with this email already exists'
          })
        };
      }

      // Determine role and admin status
      const userRole = role || (isAdmin ? 'admin' : 'employee');
      const userIsAdmin = isAdmin || role === 'admin' || role === 'super_admin';

      console.log('👤 Creating user with role:', userRole, 'isAdmin:', userIsAdmin);

      // Hash password if provided (for admin users who need password login)
      let hashedPassword = null;
      if (password && (userIsAdmin || userRole === 'admin' || userRole === 'super_admin')) {
        const { scrypt, randomBytes } = await import('crypto');
        const { promisify } = await import('util');
        const scryptAsync = promisify(scrypt);

        const salt = randomBytes(16).toString('hex');
        const hashedBuf = (await scryptAsync(password, salt, 64)) as Buffer;
        hashedPassword = `${hashedBuf.toString('hex')}.${salt}`;
        console.log('🔐 Password hashed for admin user');
      }

      // Create new user record
      const newUser = await sql`
        INSERT INTO users (
          username, email, first_name, last_name, phone, password,
          role, is_admin, is_active, rewards, hourly_rate, department,
          created_at, updated_at
        ) VALUES (
          ${email}, ${email}, ${firstName}, ${lastName}, ${phone || null}, ${hashedPassword},
          ${userRole}, ${userIsAdmin}, true, 0, ${hourlyRate || null}, ${department || null},
          NOW(), NOW()
        ) RETURNING id, username, email, first_name, last_name, phone, role, is_admin, hourly_rate, department, created_at
      `;

      console.log('✅ User created successfully:', newUser[0]);

      return {
        statusCode: 201,
        headers,
        body: JSON.stringify({
          message: `${userRole} user created successfully${hashedPassword ? ' with password' : ''}`,
          user: {
            id: newUser[0].id,
            username: newUser[0].username,
            email: newUser[0].email,
            firstName: newUser[0].first_name,
            lastName: newUser[0].last_name,
            phone: newUser[0].phone,
            role: newUser[0].role,
            isAdmin: newUser[0].is_admin,
            isActive: true,
            createdAt: newUser[0].created_at,
            userType: hashedPassword ? 'password' : 'pending_supabase'
          }
        })
      };
    }

    // PUT - Update user
    if (event.httpMethod === 'PUT') {
      console.log('✏️ Updating user...');
      console.log('📋 Event path:', event.path);

      // Extract user ID from URL path
      let userId = null;
      const pathParts = event.path.split('/');
      const usersIndex = pathParts.findIndex(part => part === 'users');
      if (usersIndex !== -1 && pathParts[usersIndex + 1]) {
        userId = parseInt(pathParts[usersIndex + 1]);
      }

      console.log('📋 Update request for user ID:', userId);

      if (!userId || isNaN(userId)) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({
            error: 'Valid user ID is required'
          })
        };
      }

      const requestData = JSON.parse(event.body || '{}');
      const { email, firstName, lastName, phone, role, isAdmin, hourlyRate, department, isActive } = requestData;

      console.log('📋 Update data:', { email, firstName, lastName, phone, role, isAdmin, hourlyRate, department, isActive });

      // Check if user exists
      const existingUser = await sql`
        SELECT id, role FROM users WHERE id = ${userId}
      `;

      if (existingUser.length === 0) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({
            error: 'User not found'
          })
        };
      }

      // If email is being changed, check if new email is already in use
      if (email) {
        const emailExists = await sql`
          SELECT id FROM users WHERE email = ${email} AND id != ${userId}
        `;

        if (emailExists.length > 0) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({
              error: 'Email address already in use by another user'
            })
          };
        }
      }

      // Build update object with only provided fields
      const updateData: any = { updated_at: new Date() };

      if (email !== undefined) {
        updateData.email = email;
        updateData.username = email; // Keep username in sync with email
      }
      if (firstName !== undefined) updateData.first_name = firstName;
      if (lastName !== undefined) updateData.last_name = lastName;
      if (phone !== undefined) updateData.phone = phone || null;
      if (role !== undefined) updateData.role = role;
      if (isAdmin !== undefined) updateData.is_admin = isAdmin;
      if (hourlyRate !== undefined) updateData.hourly_rate = hourlyRate || null;
      if (department !== undefined) updateData.department = department || null;
      if (isActive !== undefined) updateData.is_active = isActive;

      // Check if there's anything to update besides updated_at
      if (Object.keys(updateData).length === 1) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({
            error: 'No fields to update'
          })
        };
      }

      // Execute update using parameterized query
      const updatedUser = await sql`
        UPDATE users
        SET ${sql(updateData)}
        WHERE id = ${userId}
        RETURNING id, username, email, first_name, last_name, phone, role, is_admin, is_active, hourly_rate, department, created_at, updated_at
      `;

      console.log('✅ User updated successfully:', updatedUser[0]);

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          message: 'User updated successfully',
          user: {
            id: updatedUser[0].id,
            username: updatedUser[0].username,
            email: updatedUser[0].email,
            firstName: updatedUser[0].first_name,
            lastName: updatedUser[0].last_name,
            phone: updatedUser[0].phone,
            role: updatedUser[0].role,
            isAdmin: updatedUser[0].is_admin,
            isActive: updatedUser[0].is_active,
            hourlyRate: parseFloat(updatedUser[0].hourly_rate) || null,
            department: updatedUser[0].department,
            createdAt: updatedUser[0].created_at,
            updatedAt: updatedUser[0].updated_at
          }
        })
      };
    }

    // DELETE - Delete user
    if (event.httpMethod === 'DELETE') {
      console.log('🗑️ Deleting user...');
      console.log('📋 Event path:', event.path);
      console.log('📋 Event rawUrl:', event.rawUrl);

      // Extract user ID from URL path (e.g., /api/users/123 or /.netlify/functions/users/123)
      let userId = null;
      const pathParts = event.path.split('/');
      const usersIndex = pathParts.findIndex(part => part === 'users');
      if (usersIndex !== -1 && pathParts[usersIndex + 1]) {
        userId = parseInt(pathParts[usersIndex + 1]);
      }

      // Fallback: try to get from request body if not in URL
      if (!userId) {
        try {
          const requestData = JSON.parse(event.body || '{}');
          userId = requestData.userId;
        } catch (e) {
          // Ignore JSON parse errors
        }
      }

      console.log('📋 Delete request for user ID:', userId);

      if (!userId || isNaN(userId)) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({
            error: 'Valid user ID is required'
          })
        };
      }

      // Check if user exists and get their info
      const userToDelete = await sql`
        SELECT id, username, email, role FROM users WHERE id = ${userId}
      `;

      if (userToDelete.length === 0) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({
            error: 'User not found'
          })
        };
      }

      // Prevent deleting super_admin users
      if (userToDelete[0].role === 'super_admin') {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({
            error: 'Cannot delete super admin user'
          })
        };
      }

      // Delete related records first to avoid foreign key constraints
      console.log('🗑️ Deleting related records for user:', userId);

      // Delete employee schedules
      const deletedSchedules = await sql`DELETE FROM employee_schedules WHERE employee_id = ${userId} RETURNING id`;
      console.log(`✅ Deleted ${deletedSchedules.length} employee schedules`);

      // Delete user points (reset points to zero and remove records)
      try {
        const deletedPoints = await sql`DELETE FROM user_points WHERE user_id = ${userId} RETURNING id`;
        console.log(`✅ Deleted ${deletedPoints.length} user points records`);
      } catch (error) {
        console.log('ℹ️ No user_points table or records to delete');
      }

      // Delete points transactions (complete points history)
      try {
        const deletedTransactions = await sql`DELETE FROM points_transactions WHERE user_id = ${userId} RETURNING id`;
        console.log(`✅ Deleted ${deletedTransactions.length} points transaction records`);
      } catch (error) {
        console.log('ℹ️ No points_transactions table or records to delete');
      }

      // Delete any other related records that might exist
      try {
        // Delete user redemptions if they exist
        const deletedRedemptions = await sql`DELETE FROM user_redemptions WHERE user_id = ${userId} RETURNING id`;
        console.log(`✅ Deleted ${deletedRedemptions.length} user redemptions`);
      } catch (error) {
        console.log('ℹ️ No user_redemptions table or records to delete');
      }

      try {
        // Delete user vouchers if they exist
        const deletedVouchers = await sql`DELETE FROM user_vouchers WHERE user_id = ${userId} RETURNING id`;
        console.log(`✅ Deleted ${deletedVouchers.length} user vouchers`);
      } catch (error) {
        console.log('ℹ️ No user_vouchers table or records to delete');
      }

      try {
        // Get all order IDs for this user first
        const userOrders = await sql`SELECT id FROM orders WHERE user_id = ${userId}`;
        const orderIds = userOrders.map(order => order.id);

        console.log(`🗑️ Found ${orderIds.length} orders to delete for user ${userId}`);

        if (orderIds.length > 0) {
          // Delete order-related records first to avoid foreign key constraints

          // Delete order items
          const deletedOrderItems = await sql`DELETE FROM order_items WHERE order_id = ANY(${orderIds}) RETURNING id`;
          console.log(`✅ Deleted ${deletedOrderItems.length} order items`);

          // Delete tip distributions
          try {
            const deletedTips = await sql`DELETE FROM tip_distributions WHERE order_id = ANY(${orderIds}) RETURNING id`;
            console.log(`✅ Deleted ${deletedTips.length} tip distributions`);
          } catch (error) {
            console.log('ℹ️ No tip_distributions table or records to delete');
          }

          // Delete voucher usages
          try {
            const deletedVoucherUsages = await sql`DELETE FROM voucher_usages WHERE applied_to_order_id = ANY(${orderIds}) RETURNING id`;
            console.log(`✅ Deleted ${deletedVoucherUsages.length} voucher usages`);
          } catch (error) {
            console.log('ℹ️ No voucher_usages table or records to delete');
          }

          // Delete user points redemptions
          try {
            const deletedRedemptions = await sql`DELETE FROM user_points_redemptions WHERE order_id = ANY(${orderIds}) RETURNING id`;
            console.log(`✅ Deleted ${deletedRedemptions.length} user points redemptions`);
          } catch (error) {
            console.log('ℹ️ No user_points_redemptions table or records to delete');
          }

          // Points transactions were already deleted above, so orders should be clear now

          // Finally delete the orders
          const deletedOrders = await sql`DELETE FROM orders WHERE user_id = ${userId} RETURNING id`;
          console.log(`✅ Deleted ${deletedOrders.length} user orders`);
        }
      } catch (error) {
        console.log('❌ Could not delete orders and related records:', error.message);
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({
            error: 'Cannot delete user with existing orders',
            details: `Failed to delete order-related records: ${error.message}`
          })
        };
      }

      // Finally delete the user
      await sql`DELETE FROM users WHERE id = ${userId}`;
      console.log('✅ User deleted successfully:', userToDelete[0]);

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          message: 'User deleted successfully',
          deletedUser: {
            id: userToDelete[0].id,
            username: userToDelete[0].username,
            email: userToDelete[0].email,
            role: userToDelete[0].role
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
    console.error('❌ User management error:', error.message);
    console.error('Error stack:', error.stack);
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