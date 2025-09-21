import { Handler } from '@netlify/functions';
import postgres from 'postgres';
import { scrypt, randomBytes } from 'crypto';
import { promisify } from 'util';

const scryptAsync = promisify(scrypt);

// Simple admin authentication check (no JWT required)
async function isAdminUser(username: string): Promise<boolean> {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) return false;

  const sql = postgres(databaseUrl, {
    max: 1,
    idle_timeout: 20,
    connect_timeout: 10,
    prepare: false,
    keep_alive: false,
  });

  try {
    const users = await sql`
      SELECT is_admin FROM users
      WHERE username = ${username} AND is_active = true
      LIMIT 1
    `;
    await sql.end();
    return users.length > 0 && users[0].is_admin;
  } catch (error) {
    await sql.end();
    return false;
  }
}

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

export const handler: Handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
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
    const requestData = JSON.parse(event.body || '{}');
    const { adminUsername } = requestData;

    // Check admin authentication
    if (!adminUsername || !(await isAdminUser(adminUsername))) {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({
          message: 'Admin access required'
        })
      };
    }

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

    // GET - List all users
    if (event.httpMethod === 'GET') {
      const users = await sql`
        SELECT
          id, username, email, first_name, last_name, phone,
          role, is_admin, is_active, created_at, rewards
        FROM users
        ORDER BY created_at DESC
      `;
      await sql.end();

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          users: users.map(user => ({
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
            rewards: user.rewards
          }))
        })
      };
    }

    // POST - Create new admin user
    if (event.httpMethod === 'POST') {
      const { username, email, firstName, lastName, password, phone } = requestData;

      if (!username || !email || !firstName || !lastName || !password) {
        await sql.end();
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({
            message: 'Username, email, firstName, lastName, and password are required'
          })
        };
      }

      // Check if user already exists
      const existingUser = await sql`
        SELECT id FROM users WHERE username = ${username} OR email = ${email}
      `;

      if (existingUser.length > 0) {
        await sql.end();
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({
            message: 'User with this username or email already exists'
          })
        };
      }

      // Hash password
      const salt = randomBytes(16).toString('hex');
      const hashedPassword = (await scryptAsync(password, salt, 64)) as Buffer;
      const passwordHash = `${hashedPassword.toString('hex')}.${salt}`;

      // Create new admin user
      const newUser = await sql`
        INSERT INTO users (
          username, email, first_name, last_name, phone, password,
          role, is_admin, is_active, rewards, created_at, updated_at
        ) VALUES (
          ${username}, ${email}, ${firstName}, ${lastName}, ${phone || null}, ${passwordHash},
          'admin', true, true, 0, NOW(), NOW()
        ) RETURNING id, username, email, first_name, last_name, phone, role, is_admin, created_at
      `;

      await sql.end();

      return {
        statusCode: 201,
        headers,
        body: JSON.stringify({
          message: 'Admin user created successfully',
          user: {
            id: newUser[0].id,
            username: newUser[0].username,
            email: newUser[0].email,
            firstName: newUser[0].first_name,
            lastName: newUser[0].last_name,
            phone: newUser[0].phone,
            role: newUser[0].role,
            isAdmin: newUser[0].is_admin,
            createdAt: newUser[0].created_at
          }
        })
      };
    }

    // DELETE - Delete user
    if (event.httpMethod === 'DELETE') {
      const { userId } = requestData;

      if (!userId) {
        await sql.end();
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({
            message: 'User ID is required'
          })
        };
      }

      // Prevent deleting superadmin (ID 5)
      if (userId === 5) {
        await sql.end();
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({
            message: 'Cannot delete superadmin user'
          })
        };
      }

      // Check if user exists
      const userToDelete = await sql`
        SELECT id, username, email FROM users WHERE id = ${userId}
      `;

      if (userToDelete.length === 0) {
        await sql.end();
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({
            message: 'User not found'
          })
        };
      }

      // Delete user
      await sql`DELETE FROM users WHERE id = ${userId}`;
      await sql.end();

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          message: 'User deleted successfully',
          deletedUser: {
            id: userToDelete[0].id,
            username: userToDelete[0].username,
            email: userToDelete[0].email
          }
        })
      };
    }

    await sql.end();
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ message: 'Method not allowed' })
    };

  } catch (error: any) {
    console.error('User management error:', error.message);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        message: 'Internal server error'
      })
    };
  }
};